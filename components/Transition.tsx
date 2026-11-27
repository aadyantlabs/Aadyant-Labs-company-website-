"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Entrance } from "@/content/work";
import { resetScroll, scrollToId, startScroll, stopScroll } from "@/lib/scroll";
import { hero } from "@/lib/store";
import { THEMES, type ThemeKey } from "@/lib/themes";

type Go = { href: string; entrance: Entrance; theme: ThemeKey; label: string };
let go: ((t: Go) => void) | null = null;
/** Navigate with a transition from code (falls back to a plain page load before hydration). */
export const goTo = (t: Go) => (go ? go(t) : location.assign(t.href));

const BARS = 6;

// Cover (in) and uncover (out) for each entrance style. Panel = one full-screen layer; bars = BARS vertical strips.
const IN: Record<Entrance, (panel: HTMLElement, bars: HTMLElement[]) => gsap.core.Timeline> = {
  ripple: (p) => gsap.timeline().set(p, { clipPath: "circle(0% at 50% 100%)" }).to(p, { clipPath: "circle(150% at 50% 100%)", duration: 0.8, ease: "power3.inOut" }),
  blinds: (_, b) => gsap.timeline().set(b, { scaleY: 0, transformOrigin: "50% 0%" }).to(b, { scaleY: 1, duration: 0.5, ease: "power3.in", stagger: 0.05 }),
  rain: (p) =>
    gsap.timeline()
      .set(p, { clipPath: "polygon(0% 0%, 0% 0%, -40% 100%, -40% 100%)" })
      .to(p, { clipPath: "polygon(0% 0%, 140% 0%, 100% 100%, -40% 100%)", duration: 0.75, ease: "power2.inOut" }),
};
const OUT: Record<Entrance, (panel: HTMLElement, bars: HTMLElement[]) => gsap.core.Timeline> = {
  ripple: (p) => gsap.timeline().to(p, { clipPath: "circle(0% at 50% 0%)", duration: 0.8, ease: "power3.inOut" }),
  blinds: (_, b) => gsap.timeline().set(b, { transformOrigin: "50% 100%" }).to(b, { scaleY: 0, duration: 0.5, ease: "power3.out", stagger: 0.05 }),
  rain: (p) => gsap.timeline().to(p, { clipPath: "polygon(140% 0%, 140% 0%, 100% 100%, 100% 100%)", duration: 0.75, ease: "power2.inOut" }),
};

/** Overlay that plays page transitions. Mounted once in the root layout. */
export default function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const bars = useRef<HTMLDivElement[]>([]);
  const pending = useRef<{ entrance: Entrance; hash: string } | null>(null);

  useEffect(() => {
    go = ({ href, entrance, theme, label: text }) => {
      const url = new URL(href, location.href);
      const samePage = url.pathname === location.pathname;
      if (samePage || matchMedia("(prefers-reduced-motion: reduce)").matches) {
        if (samePage && url.hash) return scrollToId(url.hash.slice(1));
        return router.push(href);
      }
      const t = THEMES[theme], el = root.current!;
      el.style.setProperty("--tr-bg", t.accent);
      el.style.setProperty("--tr-fg", t.bg);
      label.current!.textContent = text;
      panel.current!.hidden = entrance === "blinds";
      bars.current.forEach((b) => (b.hidden = entrance !== "blinds"));
      gsap.set(el, { autoAlpha: 1 });
      gsap.set(label.current, { autoAlpha: 0, y: 20 });
      stopScroll();
      pending.current = { entrance, hash: url.hash };
      IN[entrance](panel.current!, bars.current)
        .to(hero, { burst: 1, duration: 0.9, ease: "power2.inOut" }, 0)
        .to(label.current, { autoAlpha: 1, y: 0, duration: 0.4 }, "-=0.3")
        // Reset scroll while still covered, so the new page sets up its scroll triggers at the top.
        .add(() => { resetScroll(); router.push(url.pathname); })
        .set(hero, { burst: 0 });
    };
    return () => { go = null; };
  }, [router]);

  // New route rendered: jump to top, uncover, then honour any #hash.
  useEffect(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    resetScroll();
    ScrollTrigger.refresh();
    const done = () => {
      gsap.set(root.current, { autoAlpha: 0 });
      startScroll();
      if (p.hash) scrollToId(p.hash.slice(1));
    };
    // One frame for the new page's effects to set up before revealing it.
    requestAnimationFrame(() =>
      gsap.timeline({ onComplete: done })
        .to(label.current, { autoAlpha: 0, y: -20, duration: 0.3 })
        .add(OUT[p.entrance](panel.current!, bars.current)),
    );
  }, [pathname]);

  return (
    <div ref={root} aria-hidden="true" className="pointer-events-none invisible fixed inset-0 z-[80] opacity-0">
      <div ref={panel} className="absolute inset-0 bg-(--tr-bg)" />
      <div className="absolute inset-0 flex">
        {Array.from({ length: BARS }, (_, i) => (
          <div key={i} ref={(el) => { if (el) bars.current[i] = el; }} hidden className="h-full flex-1 bg-(--tr-bg)" />
        ))}
      </div>
      <span ref={label} className="absolute inset-0 grid place-items-center px-4 text-center font-display text-[clamp(2rem,8vw,6rem)] font-extrabold text-(--tr-fg)" />
    </div>
  );
}

/** A Next <Link> that plays a themed transition. Modified clicks (new tab etc.) behave normally. */
export function TransitionLink({ href, entrance = "ripple", theme = "solar", label = "Aadyant Labs", ...rest }: React.ComponentProps<typeof Link> & { href: string; entrance?: Entrance; theme?: ThemeKey; label?: string }) {
  return (
    <Link
      href={href}
      {...rest}
      onClick={(e) => {
        rest.onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !go) return;
        e.preventDefault();
        go({ href, entrance, theme, label });
      }}
    />
  );
}
