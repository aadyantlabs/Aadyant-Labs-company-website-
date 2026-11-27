"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, advance, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import * as THREE from "three";
import { hero, live, useTheme } from "@/lib/store";
import { browser, logoA, object3d, phone, scatter } from "@/lib/shapes";
import type { ThemeKey } from "@/lib/themes";

/** Renders R3F from gsap.ticker so scroll, tweens and WebGL share one frame. */
function TickerDriver() {
  useEffect(() => {
    const tick = (time: number) => advance(time * 1000);
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);
  return null;
}

// Per-theme particle personality (PLAN §2): Solar soft round glow, Deep small fast squares, Bloom springy squares.
const STYLE: Record<ThemeKey, { square: number; size: number; speed: number }> = {
  solar: { square: 0, size: 22, speed: 0.5 },
  deep: { square: 1, size: 16, speed: 1.4 },
  bloom: { square: 1, size: 19, speed: 0.9 },
};

const vertex = /* glsl */ `
attribute vec3 aPhone; attribute vec3 aObject; attribute vec3 aLogo; attribute vec3 aScatter; attribute float aRand;
uniform float uMorph, uLogo, uBurst, uScatter, uTime, uSize, uPixelRatio, uMouseOn;
uniform vec2 uMouse;
varying float vRand, vAlpha;
void main() {
  vec3 p = mix(position, aPhone, clamp(uMorph, 0., 1.));
  p = mix(p, aObject, clamp(uMorph - 1., 0., 1.));
  p = mix(aLogo, p, uLogo);
  p += normalize(aScatter + 0.001) * sin(uBurst * 3.14159) * (1.5 + aRand * 2.5);
  vec4 world = modelMatrix * vec4(p, 1.);
  world.xyz = mix(world.xyz, aScatter, uScatter);
  // Each particle drifts gently on its own slow loop (uTime advances ~0.5-1.4 per second): visible life, no jitter.
  world.xyz += vec3(sin(uTime + aRand * 40.), cos(uTime * .8 + aRand * 30.), sin(uTime * .6 + aRand * 20.)) * (.032 + uScatter * .2);
  // Cursor pushes particles aside.
  vec2 d = world.xy - uMouse;
  world.xy += normalize(d + 1e-4) * uMouseOn * smoothstep(1.1, 0., length(d)) * .55;
  vec4 mv = viewMatrix * world;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPixelRatio * (.6 + aRand * .65) / -mv.z;
  vRand = aRand;
  // Background: a third of the particles stay, fading with depth, so text above stays readable.
  // Every particle twinkles slowly (brightness only).
  float keep = mix(1., step(fract(aRand * 7.31), .33), uScatter);
  float fog = mix(1., mix(.35, 1., smoothstep(12., 4., -mv.z)), uScatter);
  vAlpha = keep * fog * (.78 + .22 * sin(uTime * 1.7 + aRand * 50.));
}`;

const fragment = /* glsl */ `
uniform vec3 uColorA, uColorB;
uniform float uSquare, uAlpha;
varying float vRand, vAlpha;
void main() {
  vec2 c = gl_PointCoord - .5;
  float rd = smoothstep(.5, .1, length(c));
  float sq = step(max(abs(c.x), abs(c.y)), .32);
  float a = mix(rd, sq, uSquare) * vAlpha;
  if (a < .02) discard;
  gl_FragColor = vec4(vRand > .82 ? uColorB : uColorA, a * uAlpha);
}`;

function Particles({ count, reduced, fine }: { count: number; reduced: boolean; fine: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { camera, gl, viewport, size } = useThree();
  const pointer = useRef({ x: 0, y: 0, last: -1e9 });

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const rand = new Float32Array(count);
    for (let i = 0; i < count; i++) rand[i] = Math.random();
    g.setAttribute("position", new THREE.BufferAttribute(browser(count), 3));
    g.setAttribute("aPhone", new THREE.BufferAttribute(phone(count), 3));
    g.setAttribute("aObject", new THREE.BufferAttribute(object3d(count), 3));
    g.setAttribute("aLogo", new THREE.BufferAttribute(logoA(count), 3));
    g.setAttribute("aScatter", new THREE.BufferAttribute(scatter(count), 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uMorph: { value: 0 }, uLogo: { value: 1 }, uBurst: { value: 0 }, uScatter: { value: 0 },
          uTime: { value: 0 }, uSize: { value: 30 }, uPixelRatio: { value: 1 }, uSquare: { value: 0 }, uAlpha: { value: 0.9 },
          uMouse: { value: new THREE.Vector2(99, 99) }, uMouseOn: { value: 0 },
          uColorA: { value: new THREE.Color() }, uColorB: { value: new THREE.Color() },
        },
      }),
    [],
  );

  useEffect(() => {
    hero.ready = true;
    if (!fine || reduced) return;
    const move = (e: PointerEvent) => { pointer.current = { x: (e.clientX / innerWidth) * 2 - 1, y: -(e.clientY / innerHeight) * 2 + 1, last: performance.now() }; };
    addEventListener("pointermove", move);
    return () => removeEventListener("pointermove", move);
  }, [fine, reduced]);

  const tmp = useMemo(() => new THREE.Vector3(), []);
  const clock = useRef(0);
  const last = useRef(0);
  useFrame(() => {
    // Measure frame time ourselves, in seconds. With frameloop="never" + advance(), R3F's own delta arrives in
    // milliseconds, which ran every animation ~1000× too fast (random per-frame jumps = shaking and static).
    const now = performance.now();
    const dt = last.current ? Math.min(0.1, (now - last.current) / 1000) : 0;
    last.current = now;

    const u = material.uniforms, style = STYLE[useTheme.getState().active], k = Math.min(1, dt * 3);
    u.uColorA.value.setStyle(live.accent);
    u.uColorB.value.setStyle(live.accent2);
    u.uSquare.value += (style.square - u.uSquare.value) * k;
    u.uSize.value += (style.size - u.uSize.value) * k;
    if (!reduced) clock.current += dt * style.speed;
    u.uTime.value = clock.current;
    u.uMorph.value = hero.morph; u.uLogo.value = hero.logo; u.uBurst.value = hero.burst; u.uScatter.value = hero.scatter;
    u.uPixelRatio.value = gl.getPixelRatio();

    // pointer → world point on z = 0
    tmp.set(pointer.current.x, pointer.current.y, 0.5).unproject(camera).sub(camera.position).normalize();
    tmp.multiplyScalar(-camera.position.z / tmp.z).add(camera.position);
    u.uMouse.value.set(tmp.x, tmp.y);
    const on = performance.now() - pointer.current.last < 1500 ? 1 : 0;
    u.uMouseOn.value += (on - u.uMouseOn.value) * k;

    // Layout. "Side" matches the CSS `side:` variant (globals.css): ≥900px wide AND landscape. There the hero text
    // is capped at 56% and the shape is fitted inside the right-hand 37% column (centred at +30%). Otherwise the text sits at the
    // bottom and the shape is fitted into the free band at the top. Shapes are ~4.4 × 3.8 units.
    // The intro "A" is centred and full size; it moves into place as it bursts (hero.logo 0 → 1).
    const side = size.width >= 900 && size.width / size.height >= 1.3;
    const L = hero.logo, g = group.current;
    if (g) {
      const fit = side
        ? Math.min((viewport.width * 0.37) / 4.4, (viewport.height * 0.62) / 3.8)
        : Math.min((viewport.width * 0.82) / 4.4, (viewport.height * 0.3) / 3.8);
      const intro = Math.min(1, (viewport.width * 0.7) / 4.4, (viewport.height * 0.6) / 3.8);
      g.scale.setScalar(intro + (fit - intro) * L);
      g.position.set(side ? viewport.width * 0.3 * L : 0, side ? 0 : viewport.height * 0.25 * L, 0);
      // The whole shape floats and turns slowly as one piece (rigid motion, so nothing shakes).
      const t = clock.current;
      g.rotation.y = reduced ? 0 : Math.sin(t * 0.35) * 0.16 * L;
      g.rotation.x = reduced ? 0 : Math.sin(t * 0.27) * 0.06 * L;
    }
    const base = side ? 0.75 : 0.3;
    // Dim once the visitor scrolls past the hero so section text stays readable.
    u.uAlpha.value = (base + (0.9 - base) * (1 - hero.logo)) * (1 - 0.5 * Math.min(1, hero.morph * 1.5));
  });

  return (
    <group ref={group}>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}

export default function Experience() {
  const small = matchMedia("(max-width: 767px)").matches;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  return (
    <Canvas
      aria-hidden="true"
      frameloop="never"
      dpr={[1, small ? 1.5 : 2]}
      gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 6], fov: 55 }}
      style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none" }}
    >
      <TickerDriver />
      {/* More particles than the first version, so the detailed shapes (nav, buttons, chart, cursor…) read clearly. */}
      <Particles count={small ? 7000 : 20000} reduced={reduced} fine={fine} />
    </Canvas>
  );
}
