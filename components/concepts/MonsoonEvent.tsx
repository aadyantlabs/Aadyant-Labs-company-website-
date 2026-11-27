"use client";

import { useState } from "react";
import { btn, chip, demoNote, field, inr, label, panel } from "./ui";

// Fictional artists for a fictional festival.
const SCHEDULE = {
  "Fri 18 Jul": [["18:00", "Mist Theory", "Ambient electronica"], ["19:30", "Neel Varsha", "Indie folk"], ["21:00", "Cloudburst Collective", "Brass & beats"]],
  "Sat 19 Jul": [["17:30", "Low Tide Society", "Dream pop"], ["19:00", "Anaya & The Drizzle", "Soul"], ["20:45", "Petrichor", "Headline set"]],
} as const;
type Day = keyof typeof SCHEDULE;

const PASSES = [
  { id: "day", name: "Day pass", price: 999, note: "One evening, your choice" },
  { id: "weekend", name: "Weekend pass", price: 1799, note: "Both evenings" },
  { id: "vip", name: "Rain-or-shine VIP", price: 3499, note: "Covered deck, poncho, early entry" },
];
const STEPS = ["Pass", "Details", "Confirm"];

/** Lineup by day + a three-step registration flow. Nothing is booked. */
export default function MonsoonEvent() {
  const [day, setDay] = useState<Day>("Fri 18 Jul");
  const [step, setStep] = useState(0);
  const [pass, setPass] = useState(PASSES[1].id);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const p = PASSES.find((x) => x.id === pass)!;
  const detailsOk = name.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

  return (
    <div id="demo" className="mt-10 grid scroll-mt-28 gap-4 lg:grid-cols-[1fr_1.1fr]">
      <section aria-label="Schedule" className={`${panel} grid content-start gap-5 p-6 sm:p-8`}>
        <p className={label}>Lineup</p>
        <div role="group" aria-label="Day" className="flex flex-wrap gap-2">
          {(Object.keys(SCHEDULE) as Day[]).map((d) => (
            <button key={d} type="button" aria-pressed={day === d} onClick={() => setDay(d)} className={chip}>{d}</button>
          ))}
        </div>
        <ol aria-live="polite" className="grid gap-3">
          {SCHEDULE[day].map(([time, artist, genre]) => (
            <li key={artist} className="grid grid-cols-[4.5rem_1fr] items-baseline gap-3 border-b border-line pb-3 last:border-0">
              <span className="font-mono text-sm text-accent">{time}</span>
              <span><span className="font-display text-lg font-extrabold">{artist}</span><br /><span className="text-sm text-muted">{genre}</span></span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Registration" className={`${panel} grid content-start gap-6 p-6 sm:p-8`}>
        <ol className="flex flex-wrap gap-2" aria-label="Registration steps">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === step && !done ? "step" : undefined} className={`${chip} ${i < step || done ? "text-accent" : "text-muted"}`}>
              {i + 1} · {s}
            </li>
          ))}
        </ol>

        {done ? (
          <div role="status" className="grid gap-3">
            <p className="font-display text-2xl font-extrabold">See you in the rain, {name.trim().split(" ")[0]}</p>
            <p className="text-muted">{p.name} · {inr(p.price)} · confirmation to {email}</p>
            <p className={demoNote}>Concept demo: no ticket was booked and no email was sent.</p>
            <button type="button" onClick={() => { setDone(false); setStep(0); }} className="justify-self-start font-mono text-xs text-accent underline underline-offset-4">Start again</button>
          </div>
        ) : step === 0 ? (
          <fieldset className="grid gap-3">
            <legend className={`${label} mb-3`}>Choose a pass</legend>
            {PASSES.map((x) => (
              <label key={x.id} className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line p-4 has-checked:border-accent has-checked:bg-accent/10 has-focus-visible:outline-2 has-focus-visible:outline-accent">
                <input type="radio" name="pass" value={x.id} checked={pass === x.id} onChange={() => setPass(x.id)} className="sr-only" />
                <span><span className="font-display font-extrabold">{x.name}</span><br /><span className="text-sm text-muted">{x.note}</span></span>
                <span className="font-mono text-accent">{inr(x.price)}</span>
              </label>
            ))}
            <button type="button" onClick={() => setStep(1)} className={`${btn} justify-self-start`}>Continue</button>
          </fieldset>
        ) : step === 1 ? (
          <form onSubmit={(e) => { e.preventDefault(); if (detailsOk) setStep(2); }} className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="ms-name" className={label}>Name</label>
              <input id="ms-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
            </div>
            <div className="grid gap-2">
              <label htmlFor="ms-email" className={label}>Email for your ticket</label>
              <input id="ms-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setStep(0)} className="rounded-full border border-line px-6 py-3">Back</button>
              <button type="submit" disabled={!detailsOk} className={btn}>Review</button>
            </div>
          </form>
        ) : (
          <div className="grid gap-4">
            <dl className="grid gap-2">
              {[["Pass", p.name], ["Name", name], ["Email", email], ["Total", inr(p.price)]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-line pb-2"><dt className="text-muted">{k}</dt><dd className="text-right">{v}</dd></div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setStep(1)} className="rounded-full border border-line px-6 py-3">Back</button>
              <button type="button" onClick={() => setDone(true)} className={btn}>Confirm registration</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
