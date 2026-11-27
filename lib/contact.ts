// Contact form validation. Pure, so it runs on the server and in the test.

export const NEEDS = ["Website or landing page", "Web app or dashboard", "Both", "Not sure yet"] as const;

export type ContactInput = { name: string; reach: string; need: string; message: string };
// `values` echoes what was typed: React 19 resets forms after an action, so failed sends refill from it.
export type ContactState = { status: "idle" | "ok" | "error"; message?: string; fields?: Partial<Record<keyof ContactInput, string>>; values?: Partial<ContactInput> };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[\d\s()-]{7,20}$/;

export function parseContact(form: FormData): { ok: true; data: ContactInput } | { ok: false; state: ContactState } {
  // Honeypot: real people never see or fill this field.
  if (String(form.get("company") ?? "").trim()) return { ok: false, state: { status: "error", message: "Something went wrong. Please try WhatsApp." } };

  const data: ContactInput = {
    name: String(form.get("name") ?? "").trim(),
    reach: String(form.get("reach") ?? "").trim(),
    need: String(form.get("need") ?? "").trim(),
    message: String(form.get("message") ?? "").trim(),
  };
  const fields: ContactState["fields"] = {};
  if (data.name.length < 2 || data.name.length > 80) fields.name = "Please enter your name.";
  if (!EMAIL.test(data.reach) && !PHONE.test(data.reach)) fields.reach = "Enter an email address or phone number.";
  if (!(NEEDS as readonly string[]).includes(data.need)) fields.need = "Choose what you need.";
  if (data.message.length < 10 || data.message.length > 2000) fields.message = "Tell us a little more (10 to 2000 characters).";

  if (Object.keys(fields).length) return { ok: false, state: { status: "error", message: "Please check the highlighted fields.", fields, values: data } };
  return { ok: true, data };
}

export const isEmail = (s: string) => EMAIL.test(s);
