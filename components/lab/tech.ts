import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { clamp01, glowPoints, lerp, rng, smooth, type Sky, type World } from "./util";

/** Points of the "A" monogram on a grid: two legs and a crossbar, each a thick stroke. */
function monogramCells(step: number) {
  const segs: [number, number, number, number][] = [[-1.3, -1.6, -0.02, 1.6], [0.02, 1.6, 1.3, -1.6], [-0.66, -0.3, 0.66, -0.3]];
  const half = 0.3, cells: THREE.Vector3[] = [];
  const distSeg = (px: number, py: number, [ax, ay, bx, by]: number[]) => {
    const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
    return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
  };
  for (let y = -1.6; y <= 1.65; y += step) for (let x = -1.45; x <= 1.45; x += step)
    if (segs.some((s) => distSeg(x, y, s) < half)) for (const z of [-step, 0, step]) cells.push(new THREE.Vector3(x, y, z));
  return cells;
}

/** Futuristic "Construct": a glossy monogram that builds itself from a blueprint over a live data network,
 *  and scatters under the cursor (Igloo Inc's wireframe-to-solid build + Lusion's tactile physics). */
export function techWorld(studio: Sky, width: number, height: number): World {
  const scene = new THREE.Scene();
  scene.environment = studio.env;
  scene.environmentIntensity = 0.75;
  const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 200);
  const build = { value: 0 };

  // Graphite backdrop with a soft cobalt bloom behind the monogram
  const bgMat = new THREE.ShaderMaterial({
    uniforms: { uFocus: { value: new THREE.Vector2(0.7, 0.55) }, uAspect: { value: width / height } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
    fragmentShader: /* glsl */ `uniform vec2 uFocus; uniform float uAspect; varying vec2 vUv;
      void main(){ vec2 d = (vUv - uFocus) * vec2(uAspect, 1.0); float r = length(d);
        vec3 c = mix(vec3(0.03, 0.033, 0.045), vec3(0.006, 0.007, 0.01), smoothstep(0.0, 1.1, r));
        c += vec3(0.015, 0.022, 0.08) * exp(-r * r * 4.0);
        gl_FragColor = vec4(c, 1.0); }`,
    depthWrite: false,
  });
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
  bg.frustumCulled = false; bg.renderOrder = -1;
  scene.add(bg);

  // ---- The monogram, one instanced glossy rounded block per cell
  const STEP = 0.15, cells = monogramCells(STEP), N = cells.length, r = rng(42);
  const geo = new RoundedBoxGeometry(STEP * 0.9, STEP * 0.9, STEP * 0.9, 3, STEP * 0.16);
  const delay = new Float32Array(N);
  cells.forEach((c, i) => (delay[i] = ((c.y + 1.6) / 3.2) * 0.9 + r() * 0.3));
  geo.setAttribute("aDelay", new THREE.InstancedBufferAttribute(delay, 1));
  const mat = new THREE.MeshPhysicalMaterial({ roughness: 0.22, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.25 });
  const edgeColor = { value: new THREE.Color(0.35, 0.55, 2.4) };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uBuild = build; sh.uniforms.uEdgeColor = edgeColor;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aDelay; varying float vDelay; varying vec2 vBUv;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\nvDelay = aDelay; vBUv = uv;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uBuild; uniform vec3 uEdgeColor; varying float vDelay; varying vec2 vBUv;")
      .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
        float pr = clamp((uBuild - vDelay) / 0.45, 0.0, 1.0);
        vec2 e2 = min(vBUv, 1.0 - vBUv); float edge = 1.0 - smoothstep(0.035, 0.09, min(e2.x, e2.y));
        float cell = fract(sin(dot(floor(vBUv * 5.0) + vDelay * 17.0, vec2(12.9898, 78.233))) * 43758.5453);
        if (pr < 0.999 && edge < 0.5 && cell > pr * 1.08) discard;`)
      .replace("#include <dithering_fragment>", "#include <dithering_fragment>\ngl_FragColor.rgb += uEdgeColor * edge * (1.0 - pr) * 1.6;");
  };
  const blocks = new THREE.InstancedMesh(geo, mat, N);
  const palette = [new THREE.Color("#121419"), new THREE.Color("#c9ced9"), new THREE.Color("#2c47ff")];
  cells.forEach((_, i) => { const p = r(); blocks.setColorAt(i, palette[p < 0.6 ? 0 : p < 0.88 ? 1 : 2]); });
  blocks.frustumCulled = false;
  const group = new THREE.Group();
  group.add(blocks);
  scene.add(group);

  // Per-block physics: rest pose, scattered origin, current position/velocity
  const rest = cells.map((c) => c.clone().add(new THREE.Vector3((r() - 0.5) * 0.02, (r() - 0.5) * 0.02, (r() - 0.5) * 0.12)));
  const restRot = cells.map(() => new THREE.Euler((r() - 0.5) * 0.25, (r() - 0.5) * 0.25, (r() - 0.5) * 0.25));
  const restScale = cells.map(() => (r() < 0.18 ? 0.55 : 0.78) + r() * 0.24);
  const scatter = cells.map(() => new THREE.Vector3().randomDirection().multiplyScalar(4 + r() * 5));
  const pos = rest.map((p) => p.clone()), vel = rest.map(() => new THREE.Vector3());
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qs = new THREE.Quaternion(), sc = new THREE.Vector3(), tmp = new THREE.Vector3(), axis = new THREE.Vector3();

  // ---- Data network behind it: nodes, links that draw themselves in, tiny readouts
  const nodes: THREE.Vector3[] = [];
  for (let i = 0; i < 120; i++) nodes.push(new THREE.Vector3((r() - 0.5) * 22, (r() - 0.5) * 12, -3 - r() * 9));
  const lp: number[] = [], lt: number[] = [], ld: number[] = [];
  nodes.forEach((a, i) => {
    nodes.map((b, j) => ({ j, d: a.distanceTo(b) })).filter((x) => x.j !== i).sort((x, y) => x.d - y.d).slice(0, 2).forEach(({ j }) => {
      const b = nodes[j], d = r() * 0.9;
      lp.push(a.x, a.y, a.z, b.x, b.y, b.z); lt.push(0, 1); ld.push(d, d);
    });
  });
  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
  lg.setAttribute("aT", new THREE.Float32BufferAttribute(lt, 1));
  lg.setAttribute("aDelay", new THREE.Float32BufferAttribute(ld, 1));
  const lineMat = new THREE.ShaderMaterial({
    uniforms: { uBuild: build, uTime: { value: 0 } },
    vertexShader: `attribute float aT, aDelay; varying float vT, vD, vZ; void main(){ vT = aT; vD = aDelay; vec4 mv = modelViewMatrix * vec4(position, 1.0); vZ = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `uniform float uBuild, uTime; varying float vT, vD, vZ;
      void main(){ float p = clamp((uBuild * 1.4 - vD) / 0.5, 0.0, 1.0); if (vT > p) discard;
        float pulse = smoothstep(0.08, 0.0, abs(fract(vT - uTime * 0.25 + vD * 3.0) - 0.5) - 0.42);
        float a = (0.16 + pulse * 0.5) * smoothstep(26.0, 12.0, vZ);
        gl_FragColor = vec4(vec3(0.75, 0.82, 1.0) * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const lines = new THREE.LineSegments(lg, lineMat);
  scene.add(lines);
  const npos = new Float32Array(nodes.flatMap((n) => n.toArray())), nr = Float32Array.from(nodes, () => r());
  const dots = glowPoints(npos, nr, { color: new THREE.Color(1.4, 1.6, 2.4), size: 3.2, vertex: `vA = 0.35 + 0.65 * step(0.7, fract(aRand * 9.0 + uTime * 0.15));` });
  scene.add(dots);
  const labels: THREE.Sprite[] = [];
  for (let i = 0; i < 26; i++) {
    const c = document.createElement("canvas"); c.width = 128; c.height = 40;
    const g = c.getContext("2d")!;
    g.font = "500 22px ui-monospace, SFMono-Regular, Menlo, monospace"; g.fillStyle = "#cfd8ff";
    g.fillText([`${Math.floor(r() * 99)}`, `0.${Math.floor(r() * 999)}`, `A-${Math.floor(r() * 64)}`, `${Math.floor(r() * 360)}°`][i % 4], 4, 28);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0, depthWrite: false }));
    sp.position.copy(nodes[Math.floor(r() * nodes.length)]).add(new THREE.Vector3(0.18, 0.12, 0));
    sp.scale.set(0.64, 0.2, 1);
    scene.add(sp); labels.push(sp);
  }

  // Light: studio reflections on clearcoat, a cool key and a cobalt rim
  const key = new THREE.DirectionalLight("#ffffff", 1.4); key.position.set(-4, 6, 6);
  const rim = new THREE.PointLight("#3d5bff", 40, 14, 2); rim.position.set(4.5, 1, -2.5);
  scene.add(key, rim, new THREE.AmbientLight("#9fb0ff", 0.25));

  const ray = new THREE.Raycaster(), plane = new THREE.Plane(), hit = new THREE.Vector3(), cursor = new THREE.Vector3(), camDir = new THREE.Vector3();
  let started = -1;
  return {
    scene, camera, exposure: 0.95, bloom: [0.45, 0.4, 1.6], grade: [0.97, 1.0, 1.05],
    update({ time, dt, local, exit, pointer, pointerActive, aspect }) {
      if (started < 0) started = time;
      build.value = Math.min(1.75, (time - started) * 0.55);
      const side = aspect > 1.3;
      bgMat.uniforms.uAspect.value = aspect;
      bgMat.uniforms.uFocus.value.set(side ? 0.72 : 0.5, side ? 0.5 : 0.68);

      // camera + composition
      camera.position.set(pointer.x * 0.5, pointer.y * 0.3, side ? 12 : 15);
      camera.lookAt(0, 0, 0);
      group.position.set(side ? 2.7 : 0, side ? 0 : 1.7, 0);
      group.scale.setScalar(side ? 1 : 0.78);
      group.rotation.y = Math.sin(time * 0.3) * 0.28 + pointer.x * 0.35 + local * 1.2;
      group.rotation.x = Math.sin(time * 0.23) * 0.06 - pointer.y * 0.15;
      lines.rotation.y = dots.rotation.y = pointer.x * 0.04;
      lineMat.uniforms.uTime.value = time;
      (dots.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
      labels.forEach((l, i) => ((l.material as THREE.SpriteMaterial).opacity = clamp01(build.value - 0.6 - i * 0.02) * 0.55));

      // cursor in the monogram's local space
      camera.updateMatrixWorld(); group.updateMatrixWorld();
      let haveCursor = false;
      if (pointerActive) {
        ray.setFromCamera(pointer, camera);
        plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(camDir).negate(), group.position);
        if (ray.ray.intersectPlane(plane, hit)) { cursor.copy(group.worldToLocal(hit)); haveCursor = true; }
      }

      // physics: spring to rest, pushed by the cursor, assembled by build, scattered on exit
      const e = smooth(exit), h = Math.min(dt, 1 / 30);
      for (let i = 0; i < N; i++) {
        const pr = clamp01((build.value - delay[i]) / 0.45), arrive = 1 - Math.pow(1 - pr, 3);
        const target = tmp.copy(scatter[i]).lerp(rest[i], arrive).addScaledVector(scatter[i], e * 1.4);
        const p = pos[i], v = vel[i];
        v.addScaledVector(target.sub(p), 60 * h).multiplyScalar(Math.exp(-9 * h));
        if (haveCursor) {
          const dx = p.x - cursor.x, dy = p.y - cursor.y, dd = Math.hypot(dx, dy);
          if (dd < 0.9) { const f = (1 - dd / 0.9) ** 2 * 90 * h; v.x += (dx / (dd + 1e-4)) * f; v.y += (dy / (dd + 1e-4)) * f; v.z += f * 0.8; }
        }
        p.addScaledVector(v, h);
        const off = p.distanceTo(rest[i]);
        axis.set(-(p.y - rest[i].y), p.x - rest[i].x, 0.3).normalize();
        q.setFromEuler(restRot[i]).multiply(qs.setFromAxisAngle(axis, off * 2.2 + (1 - arrive) * 3 + e * time * 0.8));
        sc.setScalar(restScale[i] * lerp(0.4, 1, arrive));
        blocks.setMatrixAt(i, m4.compose(p, q, sc));
      }
      blocks.instanceMatrix.needsUpdate = true;
    },
  };
}
