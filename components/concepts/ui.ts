// Shared classes for the concept demos.
// min-w-0: lets a panel shrink inside a grid so wide tables scroll inside it instead of widening the page.
export const panel = "min-w-0 rounded-2xl border border-line bg-surface/70 backdrop-blur-sm";
export const field = "w-full rounded-xl border border-line bg-bg/60 px-4 py-3 text-fg focus:border-accent focus:outline-none";
export const label = "font-mono text-[11px] uppercase tracking-[0.14em] text-muted";
export const btn = "rounded-full bg-accent px-6 py-3 font-medium text-bg disabled:opacity-50";
export const chip = "rounded-full border border-line px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-bg aria-[current=step]:border-accent";
export const demoNote = "font-mono text-xs text-muted";

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
