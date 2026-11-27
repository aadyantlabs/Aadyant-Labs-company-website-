"use client";

import { useActionState } from "react";
import { sendContact } from "@/app/actions";
import { NEEDS, type ContactState } from "@/lib/contact";

const field = "w-full rounded-xl border border-line bg-surface/70 px-4 py-3 text-fg placeholder:text-muted/70 backdrop-blur focus:border-accent focus:outline-none aria-invalid:border-accent2";
const label = "text-sm font-medium text-fg";

export default function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, { status: "idle" });
  const err = state.fields ?? {};
  const v = state.values ?? {};

  if (state.status === "ok") {
    return (
      <p role="status" className="rounded-2xl border border-line bg-surface/70 p-6 text-lg">
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} noValidate className="grid gap-5" aria-describedby="form-status">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="cf-name" className={label}>Your name</label>
          <input id="cf-name" name="name" defaultValue={v.name} autoComplete="name" required aria-invalid={!!err.name} aria-describedby="cf-name-err" className={field} />
          {err.name && <p id="cf-name-err" className="text-sm text-accent2">{err.name}</p>}
        </div>
        <div className="grid gap-2">
          <label htmlFor="cf-reach" className={label}>Email or phone</label>
          <input id="cf-reach" name="reach" defaultValue={v.reach} autoComplete="email" required aria-invalid={!!err.reach} aria-describedby="cf-reach-err" className={field} />
          {err.reach && <p id="cf-reach-err" className="text-sm text-accent2">{err.reach}</p>}
        </div>
      </div>
      <div className="grid gap-2">
        <label htmlFor="cf-need" className={label}>What do you need?</label>
        <select id="cf-need" name="need" required key={v.need ?? ""} defaultValue={v.need ?? ""} aria-invalid={!!err.need} aria-describedby="cf-need-err" className={field}>
          <option value="" disabled>Choose one</option>
          {NEEDS.map((n) => <option key={n}>{n}</option>)}
        </select>
        {err.need && <p id="cf-need-err" className="text-sm text-accent2">{err.need}</p>}
      </div>
      <div className="grid gap-2">
        <label htmlFor="cf-message" className={label}>Tell us about it</label>
        <textarea id="cf-message" name="message" defaultValue={v.message} rows={5} required aria-invalid={!!err.message} aria-describedby="cf-message-err" placeholder="What you're building, your timeline, what you have so far" className={field} />
        {err.message && <p id="cf-message-err" className="text-sm text-accent2">{err.message}</p>}
      </div>
      {/* Honeypot, hidden from people and screen readers */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label htmlFor="cf-company">Company</label>
        <input id="cf-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} data-magnetic className="rounded-full bg-accent px-7 py-3 font-medium text-bg transition-opacity disabled:opacity-60">
          {pending ? "Sending…" : "Send enquiry"}
        </button>
        <p id="form-status" role="status" className="text-sm text-muted">{state.status === "error" ? state.message : ""}</p>
      </div>
    </form>
  );
}
