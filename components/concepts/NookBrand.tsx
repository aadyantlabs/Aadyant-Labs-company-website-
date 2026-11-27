"use client";

import { useState } from "react";
import { btn, chip, demoNote, field, inr, label, panel } from "./ui";

const SWATCHES = [
  { name: "Night roast", hex: "#05070B" },
  { name: "Steam", hex: "#E6F1F7" },
  { name: "Neon cup", hex: "#22E4FF" },
  { name: "Cherry", hex: "#FF3D71" },
];

const MENU = {
  Coffee: [["Nook flat white", 220], ["Cold brew tonic", 260], ["Filter of the week", 240], ["Cardamom cortado", 230]],
  Tea: [["Masala chai, slow-brewed", 140], ["Hojicha latte", 250], ["Lemongrass iced tea", 180]],
  Bakes: [["Brown butter banana bread", 190], ["Jaggery cinnamon bun", 210], ["Sourdough toast, chilli butter", 240]],
} as const;
type Cat = keyof typeof MENU;

/** Identity board + filterable menu + waitlist. The waitlist is a front-end demo only. */
export default function NookBrand() {
  const [cat, setCat] = useState<Cat>("Coffee");
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

  return (
    <div id="demo" className="mt-10 grid scroll-mt-28 gap-4 lg:grid-cols-2">
      <section aria-label="Brand identity" className={`${panel} grid content-start gap-6 p-6 sm:p-8`}>
        <p className={label}>Identity</p>
        <div className="grid place-items-center rounded-xl border border-line py-12">
          <span className="font-display text-6xl font-extrabold tracking-tight">N<span className="text-accent">&amp;</span>B</span>
          <span className="mt-2 font-mono text-xs uppercase tracking-[0.4em] text-muted">Nook &amp; Brew · est. 2026</span>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SWATCHES.map((s) => (
            <li key={s.hex} className="grid gap-2">
              <span aria-hidden="true" className="h-14 rounded-lg border border-line" style={{ background: s.hex }} />
              <span className="text-sm">{s.name}</span>
              <span className="font-mono text-xs text-muted">{s.hex}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Menu" className={`${panel} grid content-start gap-5 p-6 sm:p-8`}>
        <p className={label}>Menu</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Menu category">
          {(Object.keys(MENU) as Cat[]).map((c) => (
            <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={chip}>{c}</button>
          ))}
        </div>
        <ul aria-live="polite" className="grid gap-3">
          {MENU[cat].map(([name, price]) => (
            <li key={name} className="flex items-baseline gap-3">
              <span>{name}</span>
              <span aria-hidden="true" className="flex-1 border-b border-dashed border-line" />
              <span className="font-mono text-sm text-accent">{inr(price)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Waitlist" className={`${panel} grid gap-4 p-6 sm:p-8 lg:col-span-2`}>
        <p className={label}>Opening-week waitlist</p>
        {joined ? (
          <p role="status" className="text-lg">You&apos;re on the list. First flat white is on us. <span className={demoNote}>(Concept demo: nothing was sent.)</span></p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (valid) setJoined(true); }} className="flex flex-wrap items-end gap-3">
            <div className="grid min-w-0 flex-1 basis-64 gap-2">
              <label htmlFor="nb-email" className={label}>Email</label>
              <input id="nb-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={field} />
            </div>
            <button type="submit" disabled={!valid} className={btn}>Join the waitlist</button>
          </form>
        )}
      </section>
    </div>
  );
}
