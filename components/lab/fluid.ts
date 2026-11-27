import * as THREE from "three";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const pass = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
  new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false });

/**
 * Small stable-fluids solver (advect → divergence → pressure → project) driven by the cursor.
 * Velocity is in grid cells per second; the finishing pass uses it to swirl and split the frame,
 * the same trick Unseen Studio uses on their site.
 */
export class Fluid {
  readonly texel: THREE.Vector2;
  private quad = new FullScreenQuad();
  private vel: THREE.WebGLRenderTarget[];
  private pres: THREE.WebGLRenderTarget[];
  private div: THREE.WebGLRenderTarget;
  private splatM; private advectM; private divM; private presM; private gradM;
  private last = new THREE.Vector2(-1, -1);
  private pending = new THREE.Vector4(); // x, y, fx, fy
  private hasSplat = false;

  constructor(private renderer: THREE.WebGLRenderer, aspect: number, res = 128) {
    const w = Math.round(res * Math.max(1, aspect)), h = Math.round(res / Math.min(1, aspect));
    const rt = () => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
    this.vel = [rt(), rt()]; this.pres = [rt(), rt()]; this.div = rt();
    this.texel = new THREE.Vector2(1 / w, 1 / h);
    const tx = { value: this.texel };
    this.splatM = pass(`uniform sampler2D uVel; uniform vec2 uPoint, uForce; uniform float uRadius, uAspect; varying vec2 vUv;
      void main(){ vec2 d = (vUv - uPoint) * vec2(uAspect, 1.0); vec2 v = texture2D(uVel, vUv).xy + uForce * exp(-dot(d, d) / uRadius); gl_FragColor = vec4(v, 0.0, 1.0); }`,
      { uVel: { value: null }, uPoint: { value: new THREE.Vector2() }, uForce: { value: new THREE.Vector2() }, uRadius: { value: 0.0018 }, uAspect: { value: aspect } });
    this.advectM = pass(`uniform sampler2D uVel; uniform vec2 uTexel; uniform float uDt, uDiss; varying vec2 vUv;
      void main(){ vec2 c = vUv - uDt * texture2D(uVel, vUv).xy * uTexel; gl_FragColor = vec4(texture2D(uVel, c).xy * uDiss, 0.0, 1.0); }`,
      { uVel: { value: null }, uTexel: tx, uDt: { value: 0.016 }, uDiss: { value: 0.975 } });
    this.divM = pass(`uniform sampler2D uVel; uniform vec2 uTexel; varying vec2 vUv;
      void main(){ float L = texture2D(uVel, vUv - vec2(uTexel.x, 0.0)).x, R = texture2D(uVel, vUv + vec2(uTexel.x, 0.0)).x;
        float B = texture2D(uVel, vUv - vec2(0.0, uTexel.y)).y, T = texture2D(uVel, vUv + vec2(0.0, uTexel.y)).y;
        gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0); }`, { uVel: { value: null }, uTexel: tx });
    this.presM = pass(`uniform sampler2D uPres, uDiv; uniform vec2 uTexel; varying vec2 vUv;
      void main(){ float L = texture2D(uPres, vUv - vec2(uTexel.x, 0.0)).x, R = texture2D(uPres, vUv + vec2(uTexel.x, 0.0)).x;
        float B = texture2D(uPres, vUv - vec2(0.0, uTexel.y)).x, T = texture2D(uPres, vUv + vec2(0.0, uTexel.y)).x;
        gl_FragColor = vec4((L + R + B + T - texture2D(uDiv, vUv).x) * 0.25, 0.0, 0.0, 1.0); }`, { uPres: { value: null }, uDiv: { value: null }, uTexel: tx });
    this.gradM = pass(`uniform sampler2D uPres, uVel; uniform vec2 uTexel; varying vec2 vUv;
      void main(){ float L = texture2D(uPres, vUv - vec2(uTexel.x, 0.0)).x, R = texture2D(uPres, vUv + vec2(uTexel.x, 0.0)).x;
        float B = texture2D(uPres, vUv - vec2(0.0, uTexel.y)).x, T = texture2D(uPres, vUv + vec2(0.0, uTexel.y)).x;
        gl_FragColor = vec4(texture2D(uVel, vUv).xy - 0.5 * vec2(R - L, T - B), 0.0, 1.0); }`, { uPres: { value: null }, uVel: { value: null }, uTexel: tx });
  }

  get texture() { return this.vel[0].texture; }

  /** Feed the pointer in 0..1 UV space (y up). */
  move(u: number, v: number) {
    if (this.last.x >= 0) {
      const fx = (u - this.last.x) / this.texel.x, fy = (v - this.last.y) / this.texel.y;
      this.pending.set(u, v, this.pending.z + fx, this.pending.w + fy);
      this.hasSplat = true;
    }
    this.last.set(u, v);
  }

  private run(m: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget) {
    this.quad.material = m;
    this.renderer.setRenderTarget(target);
    this.quad.render(this.renderer);
  }
  private swap(a: THREE.WebGLRenderTarget[]) { const t = a[0]; a[0] = a[1]; a[1] = t; }

  update(dt: number) {
    const prev = this.renderer.getRenderTarget();
    if (this.hasSplat) {
      const u = this.splatM.uniforms;
      u.uVel.value = this.vel[0].texture; u.uPoint.value.set(this.pending.x, this.pending.y);
      u.uForce.value.set(this.pending.z, this.pending.w).multiplyScalar(6).clampLength(0, 900);
      this.run(this.splatM, this.vel[1]); this.swap(this.vel);
      this.pending.z = this.pending.w = 0; this.hasSplat = false;
    }
    this.advectM.uniforms.uVel.value = this.vel[0].texture; this.advectM.uniforms.uDt.value = dt;
    this.run(this.advectM, this.vel[1]); this.swap(this.vel);
    this.divM.uniforms.uVel.value = this.vel[0].texture; this.run(this.divM, this.div);
    this.presM.uniforms.uDiv.value = this.div.texture;
    for (let i = 0; i < 14; i++) { this.presM.uniforms.uPres.value = this.pres[0].texture; this.run(this.presM, this.pres[1]); this.swap(this.pres); }
    this.gradM.uniforms.uPres.value = this.pres[0].texture; this.gradM.uniforms.uVel.value = this.vel[0].texture;
    this.run(this.gradM, this.vel[1]); this.swap(this.vel);
    this.renderer.setRenderTarget(prev);
  }

  dispose() { [...this.vel, ...this.pres, this.div].forEach((r) => r.dispose()); this.quad.dispose(); }
}

/** Finishing pass: fluid swirl + chromatic split + vignette + film grain. Runs after tone mapping. */
export const finishShader = {
  uniforms: { tDiffuse: { value: null }, uFluid: { value: null }, uFluidTexel: { value: new THREE.Vector2() }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
    uDistort: { value: 0.9 }, uCA: { value: 0.0035 }, uVignette: { value: 0.32 }, uGrain: { value: 0.04 } },
  vertexShader: VERT,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse, uFluid; uniform vec2 uFluidTexel, uRes; uniform float uTime, uDistort, uCA, uVignette, uGrain; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 v = texture2D(uFluid, vUv).xy * uFluidTexel * 0.012 * uDistort;   // cells/s → uv offset
      vec2 uv = vUv - v;
      vec2 dir = vUv - 0.5;
      vec2 split = dir * uCA + v * 0.9;
      vec3 col = vec3(texture2D(tDiffuse, uv + split).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - split).b);
      col *= mix(1.0, smoothstep(1.05, 0.25, length(dir * vec2(1.0, 0.9)) * 1.25), uVignette);
      col += (hash(vUv * uRes + fract(uTime * 7.0) * 100.0) - 0.5) * uGrain;
      gl_FragColor = vec4(col, 1.0);
    }`,
};
