"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { INTRO_DONE } from "./Intro";

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

const GLYPHS = "!<>-_\\/[]{}=+*^?#0123456789";

/** [data-split] headings rise in line by line; [data-reveal] blocks fade up (children stagger with data-reveal="stagger");
 *  [data-scramble] labels decode on first view and on hover (screen readers get the plain text). */
export default function Reveals() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    // Reduced motion, or the page was already shown because JS arrived too late (see prePaintScript).
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || root.dataset.revealSkipped) return;
    root.dataset.revealReady = "1"; // app is alive: cancel the pre-paint failsafe

    let ctx: gsap.Context | undefined;
    const undo: (() => void)[] = [];

    const run = () => {
      ctx = gsap.context(() => {
        document.querySelectorAll<HTMLElement>("[data-split]").forEach((el) => {
          SplitText.create(el, {
            type: "lines",
            mask: "lines",
            autoSplit: true,
            onSplit: (self) => {
              gsap.set(el, { opacity: 1 });
              return gsap.from(self.lines, {
                yPercent: 110,
                duration: 1,
                ease: "power4.out",
                stagger: 0.08,
                scrollTrigger: { trigger: el, start: "top 88%", once: true },
              });
            },
          });
        });

        document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
          gsap.set(el, { opacity: 1 });
          gsap.from(el.dataset.reveal === "stagger" ? el.children : el, {
            opacity: 0, // not autoAlpha: keep content in the accessibility tree
            y: 32,
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.1,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });

        document.querySelectorAll<HTMLElement>("[data-scramble]").forEach((el) => {
          const text = el.textContent ?? "";
          const sr = Object.assign(document.createElement("span"), { className: "sr-only", textContent: text });
          const shown = Object.assign(document.createElement("span"), { textContent: text });
          shown.setAttribute("aria-hidden", "true");
          el.replaceChildren(sr, shown);
          const play = () => gsap.to(shown, { duration: 0.9, ease: "none", overwrite: true, scrambleText: { text, chars: GLYPHS, speed: 0.6 } });
          ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: play });
          el.addEventListener("pointerenter", play);
          undo.push(() => { el.removeEventListener("pointerenter", play); el.textContent = text; });
        });
      });
      root.classList.remove("reveal");
    };

    // Hold reveals until the first-visit intro hands the page over.
    if (root.classList.contains("intro")) addEventListener(INTRO_DONE, run, { once: true });
    else run();

    return () => {
      removeEventListener(INTRO_DONE, run);
      ctx?.revert();
      undo.forEach((f) => f());
    };
  }, [pathname]);

  return null;
}
