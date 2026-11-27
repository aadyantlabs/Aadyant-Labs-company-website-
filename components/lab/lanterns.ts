import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { NOISE, glowPoints, lerp, noise2, rng, smooth, type World } from "./util";

const GLOW_DIR = new THREE.Vector3(0.25, 0.02, -1).normalize();

/** Warm & soothing: a lantern festival at dusk. Hundreds of paper lanterns rise over still water
 *  that mirrors them; the cursor nudges nearby lanterns aside and makes them glow brighter. */
export function lanternWorld(width: number, height: number, small: boolean): World {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 4000);
  const time = { value: 0 }, cursor = { value: new THREE.Vector3(0, -999, -14) };

  // ---- Dusk sky: amber horizon → rose → violet → indigo, first stars
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 64, 32), new THREE.ShaderMaterial({
    uniforms: { uTime: time, uGlow: { value: GLOW_DIR } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform float uTime; uniform vec3 uGlow; varying vec3 vD; ${NOISE}
      float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main(){
        float h = max(vD.y, 0.0);
        vec3 c = mix(vec3(1.0, 0.52, 0.22), vec3(0.86, 0.36, 0.42), smoothstep(0.0, 0.09, h));
        c = mix(c, vec3(0.26, 0.12, 0.34), smoothstep(0.06, 0.24, h));
        c = mix(c, vec3(0.025, 0.02, 0.07), smoothstep(0.2, 0.7, h));
        float g = max(dot(vD, uGlow), 0.0);
        c += vec3(1.0, 0.5, 0.2) * (pow(g, 60.0) * 0.6 + pow(g, 8.0) * 0.22) * smoothstep(0.2, 0.0, h);
        float n = fbm(vec3(vD.xz / (vD.y + 0.15) * 0.8, 3.0)) * 0.5 + 0.5;          // thin warm cloud wisps
        c = mix(c, vec3(1.0, 0.6, 0.45) * 0.9, smoothstep(0.55, 0.8, n) * smoothstep(0.02, 0.12, h) * (1.0 - smoothstep(0.2, 0.35, h)) * 0.55);
        vec3 cell = floor(vD * 420.0); float st = step(0.9975, hash(cell));       // stars fading in toward the top
        c += vec3(1.0, 0.95, 0.9) * st * smoothstep(0.25, 0.6, h) * (0.6 + 0.4 * sin(uTime * 2.0 + hash(cell + 1.0) * 40.0));
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false,
  }));
  scene.add(sky);

  // ---- Far shore silhouette
  const verts: number[] = [], idx: number[] = [], S = 240;
  for (let i = 0; i <= S; i++) {
    const a = lerp(-1.3, 1.3, i / S), x = Math.sin(a) * 1400, z = -Math.cos(a) * 1400;
    const hh = 12 + (noise2(i * 0.04, 1) * 0.5 + 0.5) * 55 + Math.max(0, noise2(i * 0.15, 4)) * 20;
    verts.push(x, -2, z, x, hh, z);
    if (i < S) { const b = i * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
  }
  const shoreGeo = new THREE.BufferGeometry();
  shoreGeo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3)); shoreGeo.setIndex(idx);
  scene.add(new THREE.Mesh(shoreGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.06, 0.035, 0.08), side: THREE.DoubleSide })));

  // ---- Still water: a mirror with the faintest ripple
  const water = new Reflector(new THREE.PlaneGeometry(6000, 6000), {
    textureWidth: width * 0.6, textureHeight: height * 0.6, clipBias: 0.002,
    shader: {
      name: "DuskWater",
      uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uTime: { value: 0 } },
      vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW; void main(){ vUv = textureMatrix * vec4(position, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `uniform sampler2D tDiffuse; uniform float uTime; varying vec4 vUv; varying vec3 vW; ${NOISE}
        void main(){
          float d = length(vW.xz - cameraPosition.xz);
          vec2 g = vec2(snoise(vec3(vW.xz * 0.35, uTime * 0.25)), snoise(vec3(vW.xz * 0.35 + 7.0, uTime * 0.25))) * 0.006 / (1.0 + d * 0.02);
          g.y += sin(vW.z * 1.2 + uTime * 0.8) * 0.0015 / (1.0 + d * 0.05);
          vec3 refl = texture2D(tDiffuse, vUv.xy / vUv.w + g).rgb;
          float fres = pow(1.0 - abs(normalize(cameraPosition - vW).y), 3.0);
          vec3 col = mix(vec3(0.03, 0.02, 0.05), refl * 0.85, 0.55 + 0.4 * fres);
          gl_FragColor = vec4(col, 1.0);
        }`,
    },
  });
  const wu = (water.material as THREE.ShaderMaterial).uniforms; wu.uTime = time; // Reflector clones uniforms
  water.rotation.x = -Math.PI / 2;
  scene.add(water);

  // ---- Lanterns: instanced paper shells that glow from the flame inside
  const profile = [[0.0, 0.0], [0.16, 0.0], [0.19, 0.06], [0.23, 0.28], [0.24, 0.44], [0.2, 0.5], [0.0, 0.5]].map(([x, y]) => new THREE.Vector2(x, y));
  const shell = new THREE.LatheGeometry(profile, 18);
  const N = small ? 260 : 560, r = rng(23);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = shell.index; geo.setAttribute("position", shell.attributes.position); geo.setAttribute("normal", shell.attributes.normal); geo.setAttribute("uv", shell.attributes.uv);
  const off = new Float32Array(N * 4), rnd = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const z = -6 - Math.pow(r(), 1.3) * 280, spread = 8 + Math.abs(z) * 0.75;
    off.set([(r() - 0.5) * spread * 2, r(), z, 30 + Math.abs(z) * 0.45], i * 4); // x, phase, z, column height
    rnd.set([r(), r(), r(), r()], i * 4);
  }
  geo.setAttribute("aOff", new THREE.InstancedBufferAttribute(off, 4));
  geo.setAttribute("aRnd", new THREE.InstancedBufferAttribute(rnd, 4));
  geo.instanceCount = N;
  const lanterns = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: { uTime: time, uCursor: cursor },
    vertexShader: /* glsl */ `attribute vec4 aOff, aRnd; uniform float uTime; uniform vec3 uCursor; varying vec2 vUv; varying vec3 vN, vW; varying float vHeat;
      void main(){
        vUv = uv;
        float H = aOff.w, sp = 0.35 + aRnd.x * 0.45;
        float y = mod(aOff.y * H + uTime * sp, H);
        vec3 o = vec3(aOff.x + sin(uTime * 0.17 + aRnd.y * 20.0) * (0.6 + y * 0.05) + y * 0.12, y + 0.3, aOff.z);
        float life = smoothstep(0.0, 2.5, y) * (1.0 - smoothstep(H * 0.75, H, y));
        vec2 away = o.xy - uCursor.xy; float near = smoothstep(4.0, 0.0, length(away)) * step(abs(o.z - uCursor.z), 10.0);
        o.xy += normalize(away + 1e-4) * near * 1.4;
        vHeat = near;
        float tilt = sin(uTime * 0.9 + aRnd.z * 30.0) * 0.12;
        vec3 p = position; float c = cos(tilt), s = sin(tilt);
        p.xy = mat2(c, -s, s, c) * p.xy;
        p *= (0.85 + aRnd.w * 0.5) * life;
        vec4 w = modelMatrix * vec4(p + o, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `uniform float uTime; varying vec2 vUv; varying vec3 vN, vW; varying float vHeat; ${NOISE}
      void main(){
        float flame = exp(-pow((vUv.y - 0.1) * 3.0, 2.0));                       // hottest just above the open base
        float flick = 0.88 + 0.12 * snoise(vec3(vW.xz * 0.3, uTime * 3.0));
        float fiber = 0.9 + 0.1 * snoise(vec3(vUv * vec2(30.0, 8.0), 1.0));
        float rim = pow(1.0 - abs(dot(normalize(vN), normalize(cameraPosition - vW))), 2.0);
        vec3 col = mix(vec3(1.0, 0.36, 0.1), vec3(1.0, 0.72, 0.36), flame) * (1.4 + flame * 3.5 + rim * 1.2) * flick * fiber;
        col *= 1.0 + vHeat * 1.6;
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.DoubleSide,
  }));
  lanterns.frustumCulled = false;
  scene.add(lanterns);

  // Thousands of distant lanterns as glowing points, plus embers near the camera
  const F = small ? 1200 : 3000, fp = new Float32Array(F * 3), fr = new Float32Array(F);
  for (let i = 0; i < F; i++) { const z = -250 - r() * 900; fp.set([(r() - 0.5) * Math.abs(z) * 2.2, r() * (60 + Math.abs(z) * 0.35), z], i * 3); fr[i] = r(); }
  const far = glowPoints(fp, fr, { color: new THREE.Color(3.2, 1.5, 0.55), size: 2.2,
    vertex: `float H = 60.0 + abs(p.z) * 0.35; p.y = mod(p.y + uTime * (0.6 + aRand), H); vA = (0.5 + 0.5 * sin(uTime * 2.0 + aRand * 50.0)) * smoothstep(0.0, 8.0, p.y) * (1.0 - smoothstep(H * 0.8, H, p.y));` });
  scene.add(far);
  const E = 260, ep = new Float32Array(E * 3), er = new Float32Array(E);
  for (let i = 0; i < E; i++) { ep.set([(r() - 0.5) * 16, r() * 6, -1 - r() * 10], i * 3); er[i] = r(); }
  const embers = glowPoints(ep, er, { color: new THREE.Color(2.6, 1.2, 0.4), size: 2.0, attenuate: true,
    vertex: `p.y = mod(p.y + uTime * (0.2 + aRand * 0.3), 6.0); p.x += sin(uTime * 0.4 + aRand * 40.0) * 0.6; vA = (0.3 + 0.7 * pow(0.5 + 0.5 * sin(uTime * 3.0 + aRand * 70.0), 3.0)) * smoothstep(0.0, 1.0, p.y);` });
  scene.add(embers);

  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 14), hit = new THREE.Vector3();
  return {
    scene, camera, exposure: 0.8, bloom: [0.6, 0.35, 1.5], grade: [1.04, 0.98, 0.96], saturation: 1.12,
    update({ time: t, local, enter, pointer, pointerActive }) {
      time.value = t;
      (far.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      (embers.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      // arrive looking up from the canopy's sky, settle onto the water's edge
      const en = smooth(enter);
      camera.position.set(pointer.x * 0.5 + local * 1.5, lerp(9, 1.3, en) + pointer.y * 0.15 + Math.sin(t * 0.4) * 0.04, 0);
      camera.rotation.set(lerp(1.0, 0.1, en) + pointer.y * 0.03, -pointer.x * 0.05, 0, "YXZ");
      camera.updateMatrixWorld();
      if (pointerActive) { ray.setFromCamera(pointer, camera); if (ray.ray.intersectPlane(plane, hit)) cursor.value.copy(hit); }
      else cursor.value.set(0, -999, -14);
    },
  };
}
