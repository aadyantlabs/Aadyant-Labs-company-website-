"use server";

import { Resend } from "resend";
import { isEmail, parseContact, type ContactState } from "@/lib/contact";
import { site } from "@/lib/site";

// Env: RESEND_API_KEY, CONTACT_TO (inbox), CONTACT_FROM (sender on a Resend-verified domain).
// ponytail: no rate limit beyond the honeypot; add Vercel BotID or a per-IP limit if spam shows up.
export async function sendContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  const parsed = parseContact(form);
  if (!parsed.ok) return parsed.state;
  const { name, reach, need, message } = parsed.data;

  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  if (!key || !to) {
    console.error("[contact] RESEND_API_KEY or CONTACT_TO is not set");
    return { status: "error", message: `The form isn't connected yet. Please message us on WhatsApp: ${site.whatsapp.display}.`, values: parsed.data };
  }

  // Plain text only, so nothing a visitor types can become markup in the inbox.
  const { error } = await new Resend(key).emails.send({
    from: process.env.CONTACT_FROM ?? "Aadyant Labs <onboarding@resend.dev>",
    to,
    replyTo: isEmail(reach) ? reach : undefined,
    subject: `New enquiry: ${need} from ${name}`,
    text: `Name: ${name}\nContact: ${reach}\nNeed: ${need}\n\n${message}`,
  });
  if (error) {
    console.error("[contact] Resend error", error);
    return { status: "error", message: `We couldn't send that just now. Please message us on WhatsApp: ${site.whatsapp.display}.`, values: parsed.data };
  }
  return { status: "ok", message: "Thanks. We'll get back to you within a day." };
}
