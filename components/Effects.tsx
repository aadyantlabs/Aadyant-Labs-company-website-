"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { hero } from "@/lib/store";

gsap.registerPlugin(ScrollTrigger);

const MOTION = "(prefers-reduced-motion: no-preference)";
const HOVER = `(pointer: fine) and ${MOTION}`;

/** Hero morph on scroll, magnetic buttons, pinned concept row. Each is gated by device and motion settings. */
export default function Effects() {
  const pathname = usePathname();

  useEffect(() => {
    const mm = gsap.matchMedia();
    const heroEl = document.getElementById("hero");
    const servicesEl = document.getElementById("services");

    // Particle hero: browser → phone → 3D object (website, app, interactive) across hero/belief/services, then dissolve into the ambient field.
    mm.add(MOTION, () => {
      if (!heroEl || !servicesEl) {
        gsap.to(hero, { scatter: 1, duration: 1 });
        return;
      }
      gsap
        .timeline({ scrollTrigger: { trigger: heroEl, start: "top top", endTrigger: servicesEl, end: "bottom center", scrub: 1 } })
        .fromTo(hero, { morph: 0 }, { morph: 2, ease: "none", duration: 3 })
        .fromTo(hero, { scatter: 0 }, { scatter: 1, ease: "power1.in", duration: 1 });
    });
    mm.add("(prefers-reduced-motion: reduce)", () => {
      Object.assign(hero, { morph: 0, burst: 0, logo: 1, scatter: heroEl ? 0 : 1 });
    });

    mm.add(HOVER, () => {
      const offs: (() => void)[] = [];
      const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Document, type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
        el.addEventListener(type, fn as EventListener);
        offs.push(() => el.removeEventListener(type, fn as EventListener));
      };

      // Magnetic buttons
      document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
        const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3" });
        const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3" });
        on(el, "pointermove", (e) => {
          const r = el.getBoundingClientRect();
          xTo((e.clientX - r.left - r.width / 2) * 0.35);
          yTo((e.clientY - r.top - r.height / 2) * 0.45);
        });
        on(el, "pointerleave", () => gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.4)" }));
        offs.push(() => gsap.set(el, { x: 0, y: 0 }));
      });

      return () => offs.forEach((f) => f());
    });

    // Concept row: pinned and scrolled sideways on desktop. Phones keep native swipe.
    mm.add(`(min-width: 1024px) and ${MOTION}`, () => {
      const row = document.querySelector<HTMLElement>("[data-pin-row]");
      if (!row) return;
      row.style.overflow = "visible";
      // With overflow visible the row grows to its content width, so measure against the viewport.
      const dist = () => Math.max(0, row.scrollWidth - document.documentElement.clientWidth);
      gsap.to(row.children, {
        x: () => -dist(),
        ease: "none",
        scrollTrigger: { trigger: row, pin: true, start: "center center", end: () => `+=${dist()}`, scrub: 1, invalidateOnRefresh: true, refreshPriority: 1 },
      });
      return () => { row.style.overflow = ""; };
    });

    ScrollTrigger.refresh();
    return () => mm.revert();
  }, [pathname]);

  return null;
}
