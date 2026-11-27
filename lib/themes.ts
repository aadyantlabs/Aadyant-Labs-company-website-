// Single source of truth for every theme. CSS, the pre-paint script and the 3D scene all read from here.

export const THEME_KEYS = ["solar", "deep", "bloom"] as const;
export type ThemeKey = (typeof THEME_KEYS)[number];
export type Mode = "journey" | ThemeKey;
export const MODES: Mode[] = ["journey", ...THEME_KEYS];

export const TOKENS = ["bg", "surface", "line", "fg", "muted", "accent", "accent2"] as const;
export type Token = (typeof TOKENS)[number];
export type Palette = Record<Token, string>;

type Theme = { name: string } & Palette & { ease: string; duration: number };

export const THEMES: Record<ThemeKey, Theme> = {
  solar: { name: "Solar Luxe", bg: "#0D0A09", surface: "#17110E", line: "#2E221B", fg: "#F4E9DC", muted: "#A8968A", accent: "#FFB547", accent2: "#FF6A4D", ease: "power3.inOut", duration: 1 },
  deep: { name: "Deep Space", bg: "#05070B", surface: "#0C1118", line: "#1C2A36", fg: "#E6F1F7", muted: "#7F93A3", accent: "#22E4FF", accent2: "#FF3D71", ease: "expo.out", duration: 0.45 },
  bloom: { name: "Night Bloom", bg: "#0C0A24", surface: "#161236", line: "#2A2560", fg: "#EEEBFF", muted: "#9C97C9", accent: "#C8FF3D", accent2: "#8C6BFF", ease: "back.out(1.4)", duration: 0.6 },
};

/** Theme the site lands on in Journey mode, and the reduced-motion default. */
export const HOME_THEME: ThemeKey = "solar";
export const VISITED_KEY = "adyant-visited";

export const isMode = (v: unknown): v is Mode => typeof v === "string" && (MODES as string[]).includes(v);

/** Static per-theme CSS so the right colours paint before any JS runs. */
export function themeCss(): string {
  const block = (sel: string, t: Palette) => `${sel}{${TOKENS.map((k) => `--t-${k}:${t[k]}`).join(";")}}`;
  return [block(":root", THEMES[HOME_THEME]), ...THEME_KEYS.map((k) => block(`:root[data-theme="${k}"]`, THEMES[k]))].join("");
}

/** Runs in <head> before first paint: restores the saved mode, sets data-mode / data-theme on <html>,
 *  and (unless reduced motion) adds .reveal (+ .intro on a first visit) so content can start hidden.
 *  If the app hasn't taken over within REVEAL_BUDGET ms (slow phone, JS failure), the page is shown as-is and
 *  data-reveal-skipped tells the app not to animate it in later. This keeps load time (LCP) low on slow devices. */
const REVEAL_BUDGET = 1200;
export const prePaintScript = `(()=>{var d=document.documentElement;try{var rm=matchMedia("(prefers-reduced-motion: reduce)").matches;
// Journey only: the site always moves through its worlds (reduced motion stays on the home world).
var m=rm?${JSON.stringify(HOME_THEME)}:"journey";
d.dataset.mode=m;d.dataset.theme=m==="journey"?${JSON.stringify(HOME_THEME)}:m;
if(!rm){d.classList.add("reveal");if(!localStorage.getItem(${JSON.stringify(VISITED_KEY)}))d.classList.add("intro");
setTimeout(function(){if(!d.dataset.revealReady){d.classList.remove("reveal","intro");d.dataset.revealSkipped="1"}},${REVEAL_BUDGET})}
}catch(e){d.classList.remove("reveal","intro")}})()`;
