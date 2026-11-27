"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { scrollToId, startScroll, stopScroll } from "@/lib/scroll";
import { live } from "@/lib/store";
import { site } from "@/lib/site";
import { goTo } from "./Transition";

const LINKS = [
  { id: "services", label: "Services" },
  { id: "work", label: "Concept work" },
  { id: "process", label: "How we work" },
  { id: "contact", label: "Contact" },
];

// "Ink bleed": fbm noise pushes the edge of a growing circle so it spreads like ink (PLAN §5, effect 4).
const FRAG = `precision highp float;
uniform vec2 uRes, uOrigin; uniform float uTime, uProgress; uniform vec3 uFill, uEdge;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= .5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes.y;
  vec2 o = uOrigin / uRes.y;
  float maxR = length(uRes / uRes.y) + .3;
  float n = fbm(uv * 3. + uTime * .2);
  float radius = uProgress * (maxR + .6);
  float edge = length(uv - o) + (n - .5) * (.25 + uProgress * .6);
  float soft = .02 + uProgress * .06;
  float inside = 1. - smoothstep(radius - soft, radius, edge);
  float rim = smoothstep(radius - soft - .06, radius - soft, edge) * inside;
  vec3 col = mix(uFill, uEdge, rim * .9);
  gl_FragColor = vec4(col * inside, inside);
}`;

const rgbCache = new Map<string, [number, number, number]>();
/** Any CSS colour (hex or the rgba() strings GSAP produces mid-fade) → 0..1 RGB. */
function toRgb(css: string): [number, number, number] {
  let v = rgbCache.get(css);
  if (v) return v;
  const c = document.createElement("canvas").getContext("2d")!;
  c.fillStyle = css;
  const s = c.fillStyle as string; // normalised to #rrggbb or rgba()
  v = s.startsWith("#")
    ? ([1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255) as [number, number, number])
    : ((s.match(/[\d.]+/g) ?? ["0", "0", "0"]).slice(0, 3).map((x) => +x / 255) as [number, number, number]);
  rgbCache.set(css, v);
  return v;
}

/** Minimal raw-WebGL full-screen quad: no three.js needed for one shader. */
function createInk(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true });
  if (!gl) return null;
  const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, "attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }"));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (n: string) => gl.getUniformLocation(prog, n);
  const t0 = performance.now();
  return (progress: number, origin: [number, number]) => {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(u("uRes"), w, h);
    gl.uniform2f(u("uOrigin"), origin[0] * dpr, h - origin[1] * dpr);
    gl.uniform1f(u("uTime"), (performance.now() - t0) / 1000);
    gl.uniform1f(u("uProgress"), progress);
    gl.uniform3fv(u("uFill"), toRgb(live.surface));
    gl.uniform3fv(u("uEdge"), toRgb(live.accent));
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
}

export default function Menu() {
  const button = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const draw = useRef<ReturnType<typeof createInk>>(null);
  const state = useRef({ progress: 0 });
  const [open, setOpen] = useState(false);

  const origin = (): [number, number] => {
    const r = button.current!.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  function show() {
    const d = dialog.current!;
    if (!draw.current && canvas.current) draw.current = createInk(canvas.current);
    d.showModal();
    setOpen(true);
    stopScroll();
    const items = d.querySelectorAll("[data-menu-item]");
    if (reduced() || !draw.current) {
      d.style.background = "var(--t-surface)"; // no ink: plain panel
      gsap.set(items, { autoAlpha: 1, y: 0 });
      return;
    }
    gsap.killTweensOf(state.current);
    gsap.set(items, { autoAlpha: 0, y: 30 });
    gsap.timeline()
      .to(state.current, { progress: 1, duration: 1, ease: "power2.inOut", onUpdate: () => draw.current?.(state.current.progress, origin()) })
      .to(items, { autoAlpha: 1, y: 0, stagger: 0.06, duration: 0.6, ease: "power3.out" }, 0.45);
  }

  function hide(then?: () => void) {
    const d = dialog.current!;
    const done = () => { d.close(); setOpen(false); startScroll(); then?.(); };
    if (reduced() || !draw.current) return done();
    gsap.killTweensOf(state.current);
    gsap.timeline({ onComplete: done })
      .to(d.querySelectorAll("[data-menu-item]"), { autoAlpha: 0, y: -20, stagger: 0.03, duration: 0.25 })
      .to(state.current, { progress: 0, duration: 0.7, ease: "power2.inOut", onUpdate: () => draw.current?.(state.current.progress, origin()) }, 0.1);
  }

  useEffect(() => {
    const d = dialog.current!;
    const cancel = (e: Event) => { e.preventDefault(); hide(); }; // Esc runs the closing animation
    d.addEventListener("cancel", cancel);
    return () => d.removeEventListener("cancel", cancel);
  });

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="site-menu"
        className="flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium transition-colors hover:border-fg"
      >
        <span aria-hidden="true" className="grid gap-1"><span className="block h-px w-4 bg-current" /><span className="block h-px w-4 bg-current" /></span>
        Menu
      </button>
      <dialog ref={dialog} id="site-menu" aria-label="Site menu" className="menu">
        <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 h-full w-full" />
        <div className="relative grid h-full content-between gap-10 px-4 py-6 sm:px-8 lg:px-16">
          <div className="flex justify-end">
            {/* Not animated: showModal() focuses this button, so it must never be hidden. */}
            <button type="button" onClick={() => hide()} className="rounded-full border border-line px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] hover:border-fg">
              Close
            </button>
          </div>
          <nav aria-label="Sections">
            <ul className="grid gap-2">
              {LINKS.map((l) => (
                <li key={l.id} data-menu-item>
                  <a
                    href={`/#${l.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      // On the home page, scroll; elsewhere, transition home and land on the section.
                      hide(() => document.getElementById(l.id) ? scrollToId(l.id) : goTo({ href: `/#${l.id}`, entrance: "ripple", theme: "solar", label: "Aadyant Labs" }));
                    }}
                    className="group inline-flex items-baseline gap-4 font-display text-[clamp(2.2rem,8vw,5.5rem)] font-extrabold leading-[1.05] tracking-tight hover:text-accent focus-visible:text-accent"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div data-menu-item className="flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-sm">
            <a href={site.whatsapp.href} target="_blank" rel="noopener" className="text-accent underline-offset-4 hover:underline">WhatsApp {site.whatsapp.display}</a>
            <span className="select-all text-muted">{site.email}</span>
          </div>
        </div>
      </dialog>
    </>
  );
}
