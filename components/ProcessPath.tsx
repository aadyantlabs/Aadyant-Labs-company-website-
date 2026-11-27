"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Builds a curve through the step cards from their real positions (rebuilt on resize, per the Codrops curved-path
 *  approach), draws it with scroll, moves a marker along it, and lights each card as the marker reaches it. */
export default function ProcessPath({ children }: { children: React.ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const base = useRef<SVGPathElement>(null);
  const line = useRef<SVGPathElement>(null);
  const dot = useRef<SVGCircleElement>(null);

  useEffect(() => {
    // Capture elements now: React nulls refs before cleanup, and ScrollTrigger may call back during kill().
    const w = wrap.current!, basePath = base.current!, path = line.current!, marker = dot.current!;
    const cards = [...w.querySelectorAll<HTMLElement>("li")];
    if (cards.length < 2) return;
    let len = 0, stops: number[] = [];

    const build = () => {
      const box = w.getBoundingClientRect();
      const pts = cards.map((c) => {
        const r = c.getBoundingClientRect();
        return { x: r.left - box.left + r.width / 2, y: r.top - box.top, left: r.left - box.left };
      });
      const stacked = pts.every((p) => Math.abs(p.x - pts[0].x) < 4);
      let d: string;
      if (stacked) {
        // One column: a rail down the left gutter with a gentle wave.
        const x = pts[0].left - 8; // gutter rail
        d = `M${x},${pts[0].y + 24}` + pts.slice(1).map((p, i) => ` C${x + (i % 2 ? -5 : 5)},${p.y - 40} ${x + (i % 2 ? 5 : -5)},${p.y - 10} ${x},${p.y + 24}`).join("");
      } else {
        // Grid: arcs from card top to card top, alternating over and under.
        d = `M${pts[0].x},${pts[0].y}` + pts.slice(1).map((p, i) => {
          const prev = pts[i], lift = i % 2 ? 50 : -50, dx = (p.x - prev.x) * 0.4;
          return ` C${prev.x + dx},${prev.y + lift} ${p.x - dx},${p.y + lift} ${p.x},${p.y}`;
        }).join("");
      }
      basePath.setAttribute("d", d);
      path.setAttribute("d", d);
      len = path.getTotalLength();
      path.style.strokeDasharray = `${len}`;
      // Where along the path each card sits (sampled, since segments differ in length).
      const railX = pts[0].left - 8;
      stops = pts.map((p) => {
        const tx = stacked ? railX : p.x, ty = stacked ? p.y + 24 : p.y;
        let best = 0, bestD = Infinity;
        for (let s = 0; s <= 200; s++) {
          const q = path.getPointAtLength((len * s) / 200), dd = (q.x - tx) ** 2 + (q.y - ty) ** 2;
          if (dd < bestD) { bestD = dd; best = s / 200; }
        }
        return best;
      });
    };

    const render = (progress: number) => {
      path.style.strokeDashoffset = `${len * (1 - progress)}`;
      const q = path.getPointAtLength(len * progress);
      marker.setAttribute("cx", `${q.x}`);
      marker.setAttribute("cy", `${q.y}`);
      cards.forEach((c, i) => c.toggleAttribute("data-active", progress >= stops[i] - 0.001));
    };

    build();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      render(1);
      const ro = new ResizeObserver(() => { build(); render(1); });
      ro.observe(w);
      return () => ro.disconnect();
    }

    const st = ScrollTrigger.create({
      trigger: w,
      start: "top 75%",
      end: "bottom 55%",
      scrub: 0.6,
      onRefresh: (self) => { build(); render(self.progress); },
      onUpdate: (self) => render(self.progress),
    });
    render(0);
    const ro = new ResizeObserver(() => ScrollTrigger.refresh());
    ro.observe(w);
    return () => { ro.disconnect(); st.kill(); cards.forEach((c) => c.removeAttribute("data-active")); };
  }, []);

  return (
    <div ref={wrap} className="relative">
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        <path ref={base} fill="none" stroke="var(--t-line)" strokeWidth="2" strokeDasharray="4 6" />
        <path ref={line} fill="none" stroke="var(--t-accent)" strokeWidth="2" strokeLinecap="round" />
        <circle ref={dot} r="6" fill="var(--t-accent)" style={{ filter: "drop-shadow(0 0 8px var(--t-accent))" }} />
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}
