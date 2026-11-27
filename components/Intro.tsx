"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { startScroll, stopScroll } from "@/lib/scroll";
import { hero } from "@/lib/store";
import { VISITED_KEY } from "@/lib/themes";
import { site } from "@/lib/site";

export const INTRO_DONE = "adyant:intro-done";

/** First visit: particles hold the "A" monogram, then burst into the hero shape (~2.2s). */
export default function Intro() {
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("intro")) return;
    try { localStorage.setItem(VISITED_KEY, "1"); } catch {}
    stopScroll();
    hero.logo = 0;

    let timer: ReturnType<typeof setTimeout>;
    let tl: gsap.core.Timeline | undefined;
    const finish = () => {
      root.classList.remove("intro");
      startScroll();
      dispatchEvent(new Event(INTRO_DONE));
    };
    const start = () => {
      tl = gsap.timeline()
        .to(hero, { burst: 1, duration: 1.3, ease: "power2.inOut" }, 0.9)
        .to(hero, { logo: 1, duration: 1.3, ease: "power3.inOut" }, 0.9)
        .add(finish, 1.5);
    };
    // Wait for the canvas (lazy-loaded). A device that can't get it ready in 0.6s skips the intro,
    // so slow phones see content straight away instead of a blank screen.
    const t0 = performance.now();
    const skip = () => { hero.logo = 1; finish(); };
    const wait = () => (hero.ready ? start() : performance.now() - t0 > 600 ? skip() : (timer = setTimeout(wait, 50)));
    wait();

    return () => {
      clearTimeout(timer);
      tl?.kill();
    };
  }, []);

  return (
    <div id="intro" aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-10 z-50 flex flex-col items-center gap-2 text-center">
      <span className="font-display text-sm font-extrabold uppercase tracking-[0.4em]">{site.name}</span>
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{site.tagline}</span>
    </div>
  );
}
