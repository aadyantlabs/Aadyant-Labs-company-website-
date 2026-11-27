import * as THREE from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

/** Frame state every world receives. enter/exit are 0..1 progress of the incoming / outgoing transition. */
export type Frame = { time: number; dt: number; local: number; enter: number; exit: number; pointer: THREE.Vector2; pointerActive: boolean; aspect: number };

export type World = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  update(f: Frame): void;
  /** tone-mapping exposure, and bloom [strength, radius, threshold] */
  exposure: number;
  bloom: [number, number, number];
  /** colour grade multiplier applied in the composite */
  grade?: [number, number, number];
  /** colour saturation applied in the composite (1 = unchanged) */
  saturation?: number;
};

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smooth = (v: number) => { const t = clamp01(v); return t * t * (3 - 2 * t); };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Seeded PRNG so every reload looks the same. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// ---------- GLSL: 3D simplex noise (Ashima / Stefan Gustavson, MIT) + fbm ----------
export const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){float a=0.5,s=0.0;for(int i=0;i<5;i++){s+=a*snoise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=0.5;}return s;}
`;

// ---------- JS: 2D value-gradient noise for terrain heights ----------
const PERM = (() => { const r = rng(7), p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } return [...p, ...p]; })();
const grad = (h: number, x: number, y: number) => { const a = (h / 256) * Math.PI * 2; return Math.cos(a) * x + Math.sin(a) * y; };
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
export function noise2(x: number, y: number) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, xf = x - Math.floor(x), yf = y - Math.floor(y);
  const u = fade(xf), v = fade(yf);
  const aa = PERM[PERM[X] + Y], ab = PERM[PERM[X] + Y + 1], ba = PERM[PERM[X + 1] + Y], bb = PERM[PERM[X + 1] + Y + 1];
  return lerp(lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u), lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u), v) * 1.4;
}

// ---------- HDR skies ----------
export type Sky = { texture: THREE.DataTexture; env: THREE.Texture; sun: THREE.Vector3; sample(dir: THREE.Vector3): THREE.Color };

/** Loads an equirect HDR, prefilters it for lighting and finds the sun (brightest texel). */
export async function loadSky(url: string, pmrem: THREE.PMREMGenerator): Promise<Sky> {
  // Half floats: 32-bit float textures can't be linearly filtered on many GPUs and would sample black.
  const texture = (await new HDRLoader().loadAsync(url)) as THREE.DataTexture;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  const { data: half, width: w, height: h } = texture.image as { data: Uint16Array; width: number; height: number };
  const data = new Float32Array(half.length);
  for (let i = 0; i < half.length; i++) data[i] = THREE.DataUtils.fromHalfFloat(half[i]);

  // Brightest texel → sun direction. Row 0 is the top of the image (flipY), matching three's equirect lookup.
  let best = -1, bx = 0, by = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    const i = (y * w + x) * 4, l = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
    if (l > best) { best = l; bx = x; by = y; }
  }
  const dirOf = (x: number, y: number) => {
    const phi = ((x + 0.5) / w - 0.5) * Math.PI * 2, theta = (0.5 - (y + 0.5) / h) * Math.PI;
    return new THREE.Vector3(Math.cos(theta) * Math.cos(phi), Math.sin(theta), Math.cos(theta) * Math.sin(phi));
  };
  const sample = (d: THREE.Vector3) => {
    const n = d.clone().normalize();
    const u = Math.atan2(n.z, n.x) / (Math.PI * 2) + 0.5, v = Math.asin(Math.max(-1, Math.min(1, n.y))) / Math.PI + 0.5;
    const x = Math.min(w - 1, Math.floor(u * w)), y = Math.min(h - 1, Math.floor((1 - v) * h)), i = (y * w + x) * 4;
    return new THREE.Color(data[i], data[i + 1], data[i + 2]);
  };
  const env = pmrem.fromEquirectangular(texture).texture;
  return { texture, env, sun: dirOf(bx, by), sample };
}

/** Average sky colour just above the horizon around a heading (for fog that melts into the sky). */
export function horizonColor(sky: Sky, heading: THREE.Vector3, lift = 0.04) {
  const c = new THREE.Color(0, 0, 0), side = new THREE.Vector3(-heading.z, 0, heading.x);
  for (let i = -6; i <= 6; i++) {
    const d = heading.clone().addScaledVector(side, i * 0.12).setY(0).normalize().setY(lift);
    c.add(sky.sample(d));
  }
  return c.multiplyScalar(1 / 13);
}

/** Yaw that turns a rig's local -Z toward a horizontal direction, plus an offset (radians). */
export const yawToward = (d: THREE.Vector3, offset = 0) => Math.atan2(-d.x, -d.z) + offset;

/** Soft round sprite points, additive. Size in px (scaled by DPR), colour can exceed 1 for bloom. */
export function glowPoints(positions: Float32Array, extra: Float32Array, opts: { color: THREE.Color; size: number; vertex: string; attenuate?: boolean }) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  g.setAttribute("aRand", new THREE.BufferAttribute(extra, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: opts.color }, uSize: { value: opts.size }, uPR: { value: Math.min(devicePixelRatio, 1.75) }, uFade: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uTime, uSize, uPR; attribute float aRand; varying float vA;
      ${NOISE}
      void main(){
        vec3 p = position;
        ${opts.vertex}
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * uPR * (0.5 + aRand) ${opts.attenuate ? "* (8.0 / -mv.z)" : ""};
        gl_PointSize = clamp(gl_PointSize, 0.0, 64.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uFade; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = exp(-d*d*28.0) * vA * uFade; if (a < 0.003) discard; gl_FragColor = vec4(uColor * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  return pts;
}
