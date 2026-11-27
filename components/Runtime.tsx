"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { setLenis } from "@/lib/scroll";
import { live, useTheme } from "@/lib/store";
import { HOME_THEME, THEMES, TOKENS, isMode, type ThemeKey } from "@/lib/themes";

gsap.registerPlugin(ScrollTrigger);

// three.js stays out of the first JS chunk.
const Experience = dynamic(() => import("./Experience"), { ssr: false });

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

let tween: gsap.core.Tween | undefined;

/** Fade every --t-* variable (and the 3D palette) to a theme, using that theme's own ease and duration. */
function applyTheme(key: ThemeKey) {
  const t = THEMES[key];
  const root = document.documentElement;
  root.dataset.theme = key;
  useTheme.getState().setActive(key);
  tween?.kill();
  const target = Object.fromEntries(TOKENS.map((k) => [k, t[k]]));
  tween = gsap.to(live, {
    ...target,
    duration: reducedMotion() ? 0 : t.duration,
    ease: t.ease,
    onUpdate: () => TOKENS.forEach((k) => root.style.setProperty(`--t-${k}`, live[k])),
  });
}

export default function Runtime() {
  const mode = useTheme((s) => s.mode);
  const pathname = usePathname();

  // One loop for everything: gsap.ticker drives Lenis here and R3F in <Experience/>.
  useEffect(() => {
    const saved = document.documentElement.dataset.mode;
    if (isMode(saved)) useTheme.setState({ mode: saved });
    const current = document.documentElement.dataset.theme as ThemeKey | undefined;
    if (current && THEMES[current]) Object.assign(live, THEMES[current]);

    if (reducedMotion()) return;
    const lenis = new Lenis({ autoRaf: false, anchors: { offset: -80 } });
    setLenis(lenis);
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      setLenis(null);
      lenis.destroy();
    };
  }, []);

  // Journey: the section crossing mid-screen owns the theme. Locked: one theme everywhere.
  useEffect(() => {
    if (pathname.startsWith("/lab")) return; // the worlds prototype drives its own colours
    if (mode !== "journey") {
      applyTheme(mode);
      return;
    }
    const sections = [...document.querySelectorAll<HTMLElement>("[data-theme-section]")];
    if (!sections.length) {
      applyTheme(HOME_THEME);
      return;
    }
    const triggers = sections.map((el) =>
      ScrollTrigger.create({
        trigger: el,
        start: "top 55%",
        end: "bottom 55%",
        onToggle: (self) => self.isActive && applyTheme(el.dataset.themeSection as ThemeKey),
      }),
    );
    ScrollTrigger.refresh();
    const active = triggers.find((t) => t.isActive);
    applyTheme(active ? ((active.trigger as HTMLElement).dataset.themeSection as ThemeKey) : HOME_THEME);
    return () => triggers.forEach((t) => t.kill());
  }, [mode, pathname]);

  return pathname.startsWith("/lab") ? null : <Experience />;
}
