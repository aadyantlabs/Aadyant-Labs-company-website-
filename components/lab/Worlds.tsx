"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { NOISE, clamp01, lerp, loadSky, type World } from "./util";
import { techWorld } from "./tech";
import { forestWorld } from "./forest";
import { lanternWorld } from "./lanterns";
import { Fluid, finishShader } from "./fluid";
import { spaceWorld } from "./space";

/** Page colours per world (header, text, buttons) plus the scrim that keeps copy readable over the scene. */
export const WORLD_TOKENS = [
  { name: "Tech", bg: "#08090C", surface: "#111319", line: "#252a38", fg: "#EEF0F6", muted: "#9298AA", accent: "#9DAEFF", accent2: "#2C47FF", scrim: "rgba(5,6,9,0.55)" },
  { name: "Space", bg: "#03040A", surface: "#0A0E1A", line: "#1E2640", fg: "#EEF1FF", muted: "#98A0C2", accent: "#A9C0FF", accent2: "#FF9F6B", scrim: "rgba(2,3,8,0.55)" },
  { name: "Rainforest", bg: "#0B1A14", surface: "#10241C", line: "#2A4A36", fg: "#EEF6EE", muted: "#B4CCB8", accent: "#BFE58A", accent2: "#F2D27A", scrim: "rgba(6,16,11,0.62)" },
  { name: "Lanterns", bg: "#1A1026", surface: "#24162F", line: "#4E3355", fg: "#FFF2E6", muted: "#EBC6B4", accent: "#FFB35E", accent2: "#FF7A6B", scrim: "rgba(24,12,30,0.5)" },
] as const;
const TOKEN_KEYS = ["bg", "surface", "line", "fg", "muted", "accent", "accent2"] as const;

// Seam transitions: 0 = digital dissolve (tech → space), 2 = descend through the atmosphere (space → rainforest),
// 1 = rise through the canopy mist (rainforest → lantern dusk).
const SEAM_MODE = [0, 2, 1];
const SEAM_CLOUDS: [THREE.Vector3, THREE.Vector3][] = [
  [new THREE.Vector3(), new THREE.Vector3()],
  [new THREE.Vector3(2.4, 0.75, 0.28), new THREE.Vector3(1.25, 1.45, 1.3)],   // atmospheric glow → rainforest mist
  [new THREE.Vector3(1.3, 1.45, 1.3), new THREE.Vector3(1.5, 0.75, 0.6)],     // canopy mist → dusk
];
const compositeShader = {
  uniforms: { tA: { value: null }, tB: { value: null }, uT: { value: 0 }, uMode: { value: 0 }, uTime: { value: 0 }, uAspect: { value: 1 }, uGrade: { value: new THREE.Vector3(1, 1, 1) }, uSat: { value: 1 }, uCloudA: { value: new THREE.Vector3() }, uCloudB: { value: new THREE.Vector3() } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tA, tB; uniform float uT, uTime, uAspect; uniform int uMode; uniform vec3 uGrade, uCloudA, uCloudB; uniform float uSat; varying vec2 vUv;
    ${NOISE}
    void main(){
      vec2 uv = vUv; vec3 col;
      if (uMode == 0) {
        // digital dissolve: the new world eats through the old one cell by cell, edges burning cobalt
        vec2 q = uv * vec2(uAspect, 1.0);
        float n = fbm(vec3(q * 2.2, 3.0)) * 0.5 + 0.5;
        vec2 cellUv = (floor(q * 48.0) + 0.5) / 48.0;
        float cn = fract(sin(dot(cellUv, vec2(12.9898, 78.233))) * 43758.5453);
        float field = n * 0.8 + cn * 0.2;
        float edge = uT * 1.35 - 0.2;
        float band = 1.0 - smoothstep(0.0, 0.07, abs(field - edge));
        vec2 split = (uv - 0.5) * band * 0.025;
        vec3 a = vec3(texture2D(tA, uv + split).r, texture2D(tA, uv).g, texture2D(tA, uv - split).b);
        vec3 b = texture2D(tB, uv + split * 0.5).rgb;
        col = field < edge ? b : a;
        col += vec3(0.4, 0.55, 2.4) * band * 0.8 + vec3(1.0) * pow(band, 6.0) * 1.1;
      } else {
        float rising = uMode == 1 ? 1.0 : -1.0;
        // clear → closed at the swap → clear (the dive into the atmosphere closes later and clears sooner)
        float cover = uMode == 1 ? smoothstep(0.16, 0.47, uT) * (1.0 - smoothstep(0.53, 0.88, uT))
                                 : smoothstep(0.3, 0.48, uT) * (1.0 - smoothstep(0.52, 0.8, uT));
        vec3 base = uT < 0.5 ? texture2D(tA, uv).rgb : texture2D(tB, uv).rgb;
        vec2 p = vec2(uv.x * uAspect, uv.y + rising * uT * 2.6);
        float n = fbm(vec3(p * 1.6, uTime * 0.04)) * 0.5 + 0.5;
        float th = 1.0 - cover * 1.5;
        float dens = smoothstep(th, th + 0.3, n);
        float shade = 0.65 + 0.55 * (fbm(vec3(p * 3.2 + 4.0, uTime * 0.05)) * 0.5 + 0.5);
        vec3 cloud = mix(uCloudA, uCloudB, smoothstep(0.3, 0.7, uT));
        col = mix(base, cloud * shade, dens);
      }
      // HDR suns can exceed half-float range (Inf); clamp so bloom never spreads NaN across the frame
      col = min(col, vec3(60.0)) * uGrade;
      col = max(mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, uSat), 0.0);
      if (any(isnan(col))) col = vec3(0.0);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export default function Worlds() {
  const host = useRef<HTMLDivElement>(null);
  const lock = null as number | null; // journey only: the scroll decides the world
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const lockRef = useRef<number | null>(null);
  lockRef.current = lock;

  useEffect(() => {
    const el = host.current!;
    let disposed = false, tick: ((t: number) => void) | undefined;
    const disposeFns: (() => void)[] = [];
    const root = document.documentElement;
    const pointer = new THREE.Vector2(), pTarget = new THREE.Vector2();
    let lastMove = -1e9, fluid: Fluid | undefined;
    const onMove = (e: PointerEvent) => {
      pTarget.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
      lastMove = performance.now();
      fluid?.move(e.clientX / innerWidth, 1 - e.clientY / innerHeight);
    };
    addEventListener("pointermove", onMove);

    let shown = -1, tokenTween: gsap.core.Tween | undefined;
    const applyTokens = (k: number) => {
      if (k === shown) return;
      shown = k;
      const t = WORLD_TOKENS[k], live: Record<string, string> = {};
      TOKEN_KEYS.forEach((key) => (live[key] = getComputedStyle(root).getPropertyValue(`--t-${key}`).trim() || t[key]));
      live.scrim = getComputedStyle(root).getPropertyValue("--scrim").trim() || t.scrim;
      tokenTween?.kill();
      tokenTween = gsap.to(live, {
        ...Object.fromEntries([...TOKEN_KEYS, "scrim"].map((key) => [key, t[key as keyof typeof t]])),
        duration: 0.9, ease: "power2.inOut",
        onUpdate: () => { TOKEN_KEYS.forEach((key) => root.style.setProperty(`--t-${key}`, live[key])); root.style.setProperty("--scrim", live.scrim); },
      });
    };
    applyTokens(0);

    (async () => {
      let renderer: THREE.WebGLRenderer;
      try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" }); }
      catch { setStatus("failed"); return; }
      const dpr = Math.min(devicePixelRatio, 1.75);
      renderer.setPixelRatio(dpr);
      renderer.setSize(innerWidth, innerHeight);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      el.appendChild(renderer.domElement);
      const small = innerWidth < 768;
      const pmrem = new THREE.PMREMGenerator(renderer);
      const studio = await loadSky("/lab/studio.hdr", pmrem);
      if (disposed) { renderer.dispose(); renderer.domElement.remove(); return; }
      const W = innerWidth * dpr, H = innerHeight * dpr;
      const worlds: World[] = [techWorld(studio, W, H), spaceWorld(innerWidth, innerHeight), forestWorld(innerWidth, innerHeight), lanternWorld(innerWidth, innerHeight, small)];
      await Promise.all(worlds.map((w) => renderer.compileAsync(w.scene, w.camera)));
      if (disposed) { renderer.dispose(); renderer.domElement.remove(); return; }

      if (process.env.NODE_ENV !== "production") Object.assign(window, { __worlds: worlds, __skies: { studio } });
      const rtOpts = { type: THREE.HalfFloatType, samples: 4 };
      const rtA = new THREE.WebGLRenderTarget(W, H, rtOpts), rtB = new THREE.WebGLRenderTarget(W, H, rtOpts);
      const composer = new EffectComposer(renderer);
      const comp = new ShaderPass(compositeShader, "none");
      const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.8, 0.5, 1);
      fluid = new Fluid(renderer, innerWidth / innerHeight);
      const finish = new ShaderPass(finishShader);
      finish.uniforms.uFluid.value = fluid.texture;
      finish.uniforms.uFluidTexel.value.copy(fluid.texel);
      composer.addPass(comp); composer.addPass(bloom); composer.addPass(new OutputPass()); composer.addPass(finish);
      if (process.env.NODE_ENV !== "production") Object.assign(window, { __bloom: bloom });

      // Scroll map: each world starts at the top of its first section; a seam spans 0.9 viewport around it.
      let starts: number[] = [], docEnd = 1;
      const measure = () => {
        starts = [0, 1, 2, 3].map((k) => { const s = document.querySelector<HTMLElement>(`[data-world="${k}"]`); return s ? s.getBoundingClientRect().top + scrollY : 0; });
        docEnd = document.documentElement.scrollHeight - innerHeight;
      };
      measure();
      const onResize = () => {
        const w = innerWidth, h = innerHeight;
        renderer.setSize(w, h); composer.setSize(w, h); rtA.setSize(w * dpr, h * dpr); rtB.setSize(w * dpr, h * dpr);
        worlds.forEach((x) => { x.camera.aspect = w / h; x.camera.updateProjectionMatrix(); });
        measure();
      };
      addEventListener("resize", onResize);
      const ro = new ResizeObserver(measure); ro.observe(document.body);

      let last = performance.now();
      tick = (time: number) => {
        const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
        pointer.lerp(pTarget, 1 - Math.exp(-dt * 3));
        const vh = innerHeight, y = scrollY, aspect = innerWidth / innerHeight;
        let pos = 0; // continuous world coordinate 0..3
        for (let k = 1; k < 4; k++) pos += clamp01((y - (starts[k] - vh * 0.95)) / (vh * 0.9));
        if (lockRef.current !== null) pos = lockRef.current;
        const forced = process.env.NODE_ENV !== "production" ? (window as unknown as { __forcePos?: number }).__forcePos : undefined;
        if (typeof forced === "number") pos = forced; // dev-only: inspect a transition frame
        const i = Math.min(3, Math.floor(pos)), t = i === 3 ? 0 : pos - i;
        const mode = SEAM_MODE[Math.min(2, i)], cloudy = mode > 0;
        const exitT = cloudy ? clamp01(t * 2) : t, enterT = cloudy ? clamp01((t - 0.5) * 2) : t;
        const localOf = (k: number) => clamp01((y - starts[k]) / Math.max(1, (k < 3 ? starts[k + 1] : docEnd) - starts[k]));
        const A = worlds[i], B = worlds[Math.min(3, i + 1)];
        const showA = t === 0 || mode === 0 || t < 0.5, showB = t > 0 && (mode === 0 || t >= 0.5);
        const pointerActive = now - lastMove < 2500;
        const frame = (k: number, enter: number, exit: number) => ({ time, dt, local: lockRef.current !== null ? 0 : localOf(k), enter, exit, pointer, pointerActive, aspect });

        if (showA) { A.update(frame(i, 1, t > 0 ? exitT : 0)); renderer.setRenderTarget(rtA); renderer.render(A.scene, A.camera); }
        if (showB) { B.update(frame(i + 1, enterT, 0)); renderer.setRenderTarget(showA ? rtB : rtA); renderer.render(B.scene, B.camera); }
        renderer.setRenderTarget(null);
        const u = comp.uniforms;
        u.tA.value = rtA.texture; u.tB.value = showA && showB ? rtB.texture : rtA.texture;
        u.uT.value = t; u.uMode.value = mode; u.uCloudA.value.copy(SEAM_CLOUDS[Math.min(2, i)][0]); u.uCloudB.value.copy(SEAM_CLOUDS[Math.min(2, i)][1]); u.uTime.value = time; u.uAspect.value = aspect;
        const mix = t > 0 && !cloudy ? t : t >= 0.5 ? 1 : 0;
        renderer.toneMappingExposure = lerp(A.exposure, B.exposure, mix);
        const ga = A.grade ?? [1, 1, 1], gb = B.grade ?? [1, 1, 1];
        u.uGrade.value.set(lerp(ga[0], gb[0], mix), lerp(ga[1], gb[1], mix), lerp(ga[2], gb[2], mix));
        u.uSat.value = lerp(A.saturation ?? 1, B.saturation ?? 1, mix);
        bloom.strength = lerp(A.bloom[0], B.bloom[0], mix); bloom.radius = lerp(A.bloom[1], B.bloom[1], mix); bloom.threshold = lerp(A.bloom[2], B.bloom[2], mix);
        fluid!.update(dt);
        finish.uniforms.uFluid.value = fluid!.texture;
        finish.uniforms.uTime.value = time;
        finish.uniforms.uRes.value.set(innerWidth, innerHeight);
        composer.render(dt);
        applyTokens(Math.round(pos));
        (window as unknown as { __lab: object }).__lab = { pos, i, t, calls: renderer.info.render.calls, tris: renderer.info.render.triangles };
      };
      gsap.ticker.add(tick);
      setStatus("ready");

      const cleanup = () => {
        if (tick) gsap.ticker.remove(tick);
        removeEventListener("resize", onResize); ro.disconnect();
        rtA.dispose(); rtB.dispose(); composer.dispose(); fluid?.dispose(); pmrem.dispose(); renderer.dispose(); renderer.domElement.remove();
      };
      disposeFns.push(cleanup);
    })().catch((e) => { console.error(e); setStatus("failed"); });

    return () => {
      disposed = true;
      removeEventListener("pointermove", onMove);
      tokenTween?.kill();
      disposeFns.forEach((f) => f());
      TOKEN_KEYS.forEach((key) => root.style.removeProperty(`--t-${key}`));
    };
  }, []);

  return (
    <>
      <div ref={host} aria-hidden="true" className="fixed inset-0 -z-10 bg-[radial-gradient(120%_80%_at_70%_40%,#0d1622,#03050a)] [&>canvas]:block" />
      {/* keeps copy readable over bright scenes */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10" style={{ background: "linear-gradient(90deg, var(--scrim, transparent) 0%, transparent 62%)" }} />
      {status !== "ready" && (
        <p className="fixed bottom-4 right-4 z-30 rounded-full border border-line bg-bg/70 px-4 py-2 text-sm text-muted backdrop-blur-md">
          {status === "loading" ? "Loading worlds" : "3D unavailable"}
        </p>
      )}
    </>
  );
}
