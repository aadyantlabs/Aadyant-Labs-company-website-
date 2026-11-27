import * as THREE from "three";
import { NOISE, glowPoints, lerp, rng, smooth, type World } from "./util";

const SUN = new THREE.Vector3(-0.78, 0.28, -0.55).normalize();

/** Space: an Earth-like planet with clouds and a glowing atmosphere, the galaxy, meteors and drifting dust. */
export function spaceWorld(width: number, height: number): World {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#000000");
  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 4000);
  const R = 10;

  // ----- Stars: the main particle effect. Concentrated along a galactic band, coloured by temperature.
  const N = 16000, r = rng(5), pos = new Float32Array(N * 3), rnd = new Float32Array(N), col = new Float32Array(N * 3);
  const band = new THREE.Vector3(0.25, 1, 0.35).normalize(); // galactic pole
  const t1 = new THREE.Vector3(1, 0, 0).cross(band).normalize(), t2 = band.clone().cross(t1);
  const temps = [new THREE.Color("#9db4ff"), new THREE.Color("#cad7ff"), new THREE.Color("#fbf8ff"), new THREE.Color("#fff4e8"), new THREE.Color("#ffd2a1"), new THREE.Color("#ffb46b")];
  for (let i = 0; i < N; i++) {
    let d: THREE.Vector3;
    if (i < N * 0.55) { // in the band
      const a = r() * Math.PI * 2, lat = (r() + r() + r() - 1.5) * 0.18;
      d = t1.clone().multiplyScalar(Math.cos(a)).addScaledVector(t2, Math.sin(a)).addScaledVector(band, lat).normalize();
    } else d = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize();
    pos.set(d.multiplyScalar(1500).toArray(), i * 3);
    const m = Math.pow(r(), 6); rnd[i] = m; // a few bright, most faint
    const c = temps[Math.floor(Math.pow(r(), 0.8) * temps.length)];
    col.set([c.r, c.g, c.b], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  sg.setAttribute("aMag", new THREE.BufferAttribute(rnd, 1));
  sg.setAttribute("aCol", new THREE.BufferAttribute(col, 3));
  const starMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPR: { value: Math.min(devicePixelRatio, 1.75) }, uFade: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aMag; attribute vec3 aCol; uniform float uTime, uPR; varying vec3 vC; varying float vA;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        float tw = 0.85 + 0.15 * sin(uTime * (1.0 + aMag * 4.0) + position.x);
        gl_PointSize = (1.1 + aMag * 4.5) * uPR;
        vC = aCol * (0.35 + aMag * 9.0) * tw; vA = 1.0;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uFade; varying vec3 vC; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = exp(-d*d*30.0) * uFade; gl_FragColor = vec4(vC * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(sg, starMat);
  stars.frustumCulled = false;
  scene.add(stars);

  // ----- Milky Way glow and dust lanes on a sky sphere
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1800, 64, 32),
    new THREE.ShaderMaterial({
      uniforms: { uPole: { value: band } },
      vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uPole; varying vec3 vD;
        ${NOISE}
        void main(){
          float lat = dot(vD, uPole);
          float core = exp(-lat * lat * 60.0);
          float glow = fbm(vD * 3.0) * 0.5 + 0.5;
          float lanes = smoothstep(0.1, 0.6, fbm(vD * 7.0 + 4.0) * 0.5 + 0.5);
          float clouds = core * glow * (1.0 - lanes * 0.85 * exp(-lat * lat * 300.0));
          vec3 c = mix(vec3(0.16, 0.2, 0.42), vec3(0.75, 0.55, 0.38), exp(-lat * lat * 220.0) * glow);
          c += vec3(0.35, 0.08, 0.25) * smoothstep(0.55, 0.9, fbm(vD * 2.0 + 9.0) * 0.5 + 0.5) * core; // faint nebula
          gl_FragColor = vec4(c * clouds * 0.09, 1.0);
        }`,
      side: THREE.BackSide, depthWrite: false,
    }),
  );
  scene.add(sky);

  // ----- Planet
  const planet = new THREE.Group();
  scene.add(planet);
  const surface = new THREE.Mesh(
    new THREE.SphereGeometry(R, 192, 128),
    new THREE.ShaderMaterial({
      uniforms: { uSun: { value: SUN }, uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec3 vP; varying vec3 vN; varying vec3 vW;
        void main(){ vP = normalize(position); vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uSun; varying vec3 vP; varying vec3 vN; varying vec3 vW;
        ${NOISE}
        float elev(vec3 p){ vec3 q = p + 0.12 * vec3(snoise(p*1.2), snoise(p*1.2+7.0), snoise(p*1.2+13.0)); return fbm(q * 1.6) + 0.3 * fbm(q * 6.0); }
        void main(){
          vec3 p = vP;
          float e = elev(p);
          float sea = 0.12;
          float land = smoothstep(sea, sea + 0.015, e);
          float lat = abs(p.y);
          // land palette: tropical green → savanna → desert, mountains, ice caps
          float dry = smoothstep(0.1, 0.45, fbm(p * 3.0 + 20.0) * 0.5 + 0.5 + (0.35 - abs(lat - 0.32)) * 0.8);
          vec3 lc = mix(vec3(0.04, 0.1, 0.035), vec3(0.17, 0.16, 0.08), dry);
          lc = mix(lc, vec3(0.42, 0.33, 0.2), smoothstep(0.8, 1.0, dry));
          lc = mix(lc, vec3(0.22, 0.2, 0.18), smoothstep(0.35, 0.6, e));
          float ice = smoothstep(0.78, 0.86, lat + e * 0.15);
          vec3 oc = mix(vec3(0.004, 0.02, 0.07), vec3(0.01, 0.07, 0.14), smoothstep(sea - 0.15, sea, e));
          vec3 albedo = mix(oc, lc, land);
          albedo = mix(albedo, vec3(0.85, 0.9, 0.95), ice);
          // bumped normal from the height field
          vec3 N = normalize(vN);
          float eps = 0.004; vec3 t = normalize(cross(N, vec3(0.0, 1.0, 0.0))); vec3 b = cross(N, t);
          float hx = elev(normalize(p + t * eps)) - e, hy = elev(normalize(p + b * eps)) - e;
          vec3 Nb = normalize(N - (t * hx + b * hy) * 1.6 * land);
          vec3 V = normalize(cameraPosition - vW);
          float ndl = dot(Nb, uSun), ndlS = dot(N, uSun);
          float day = smoothstep(-0.08, 0.22, ndlS);
          vec3 light = vec3(1.0, 0.97, 0.92) * max(ndl, 0.0) * 2.2;
          vec3 col = albedo * light;
          // terminator warmth (sunset band)
          col += albedo * vec3(1.0, 0.4, 0.12) * exp(-pow(ndlS / 0.06, 2.0)) * 0.5;
          // ocean glint
          vec3 H = normalize(uSun + V);
          col += vec3(1.0, 0.85, 0.6) * pow(max(dot(N, H), 0.0), 900.0) * 2.0 * (1.0 - land) * (1.0 - ice) * step(0.0, ndlS);
          // night lights on land
          float city = smoothstep(0.7, 0.86, fbm(p * 42.0) * 0.5 + 0.5) * smoothstep(0.55, 0.7, fbm(p * 5.0 + 3.0) * 0.5 + 0.5) * smoothstep(sea + 0.02, sea + 0.08, e);
          col += vec3(1.0, 0.62, 0.28) * city * land * (1.0 - ice) * (1.0 - smoothstep(-0.2, 0.02, ndlS)) * 1.2;
          // atmospheric haze toward the limb
          float rim = pow(1.0 - max(dot(N, V), 0.0), 2.5);
          col = mix(col, vec3(0.25, 0.5, 1.0) * 1.4 * day, rim * 0.7 * day);
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.012, 160, 96),
    new THREE.ShaderMaterial({
      uniforms: { uSun: { value: SUN }, uTime: { value: 0 } },
      vertexShader: `varying vec3 vP; varying vec3 vN; void main(){ vP = normalize(position); vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uSun; uniform float uTime; varying vec3 vP; varying vec3 vN;
        ${NOISE}
        void main(){
          vec3 p = vP + vec3(uTime * 0.004, 0.0, 0.0);
          vec3 q = p + 0.22 * vec3(snoise(p * 2.0 + uTime * 0.01), snoise(p * 2.0 + 5.0), snoise(p * 2.0 + 9.0));
          float n = fbm(q * 3.2) * 0.5 + 0.5;
          float cells = fbm(q * 9.0) * 0.5 + 0.5;
          float d = smoothstep(0.52, 0.78, n * 0.75 + cells * 0.35);
          float ndl = dot(normalize(vN), uSun);
          float day = smoothstep(-0.12, 0.3, ndl);
          vec3 c = vec3(1.0) * (0.02 + 2.0 * max(ndl, 0.0)) + vec3(1.0, 0.45, 0.2) * exp(-pow(ndl / 0.06, 2.0)) * 0.45;
          gl_FragColor = vec4(c, d * mix(0.35, 0.95, day));
        }`,
      transparent: true, depthWrite: false,
    }),
  );
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.07, 128, 64),
    new THREE.ShaderMaterial({
      uniforms: { uSun: { value: SUN } },
      vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uSun; varying vec3 vN; varying vec3 vW;
        void main(){
          vec3 V = normalize(cameraPosition - vW);
          float f = 1.0 - abs(dot(vN, V));
          float glow = pow(f, 5.0) * 2.2 + pow(f, 14.0) * 1.5;
          float ndl = dot(vN, uSun);
          float day = smoothstep(-0.35, 0.4, ndl);
          vec3 c = mix(vec3(1.0, 0.38, 0.12), vec3(0.3, 0.6, 1.0), smoothstep(-0.1, 0.35, ndl)) * day;
          c += vec3(1.2, 0.6, 0.35) * pow(max(dot(-V, uSun), 0.0), 10.0) * f * 2.0; // forward scatter on the sunlit limb
          gl_FragColor = vec4(c * glow, 1.0);
        }`,
      side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  planet.add(surface, clouds, atmo);

  // ----- The sun: an HDR glow sprite the bloom turns into glare
  const sunSprite = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; float a = (exp(-d * 18.0) * 40.0 + exp(-d * 5.0) * 1.2 + exp(-d * 1.6) * 0.15) * smoothstep(1.0, 0.6, d); gl_FragColor = vec4(vec3(1.0, 0.9, 0.78) * a, 1.0); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  sunSprite.position.copy(SUN).multiplyScalar(900);
  sunSprite.scale.setScalar(260);
  scene.add(sunSprite);

  // ----- Meteors: a small pool of streaks rebuilt each frame as camera-facing ribbons
  const M = 6, mPos = new Float32Array(M * 4 * 3), mUv = new Float32Array(M * 4 * 2), mIdx: number[] = [];
  for (let i = 0; i < M; i++) { const b = i * 4; mIdx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); mUv.set([0, 0, 0, 1, 1, 0, 1, 1], i * 8); }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute("position", new THREE.BufferAttribute(mPos, 3));
  mg.setAttribute("uv", new THREE.BufferAttribute(mUv, 2));
  const mAlpha = new Float32Array(M * 4);
  mg.setAttribute("aAlpha", new THREE.BufferAttribute(mAlpha, 1));
  mg.setIndex(mIdx);
  const meteors = new THREE.Mesh(mg, new THREE.ShaderMaterial({
    vertexShader: `attribute float aAlpha; varying vec2 vUv; varying float vA; void main(){ vUv = uv; vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; varying float vA; void main(){ float across = 1.0 - abs(vUv.y - 0.5) * 2.0; float a = pow(vUv.x, 3.0) * pow(across, 2.0) * vA; vec3 c = mix(vec3(0.4, 0.6, 1.2), vec3(3.0, 2.6, 2.2), pow(vUv.x, 6.0)); gl_FragColor = vec4(c * a * 3.0, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  meteors.frustumCulled = false;
  scene.add(meteors);
  const mr = rng(9);
  const pool = Array.from({ length: M }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, max: 1, len: 1, next: mr() * 3 }));
  const tmp = new THREE.Vector3(), side = new THREE.Vector3(), tail = new THREE.Vector3();

  // ----- Drifting dust near the camera for parallax
  const D = 2500, dr = rng(13), dp = new Float32Array(D * 3), drn = new Float32Array(D);
  for (let i = 0; i < D; i++) { dp.set([(dr() - 0.5) * 80, (dr() - 0.5) * 50, 10 + dr() * 40], i * 3); drn[i] = dr(); }
  const dust = glowPoints(dp, drn, {
    color: new THREE.Color(0.7, 0.8, 1.2), size: 1.4, attenuate: true,
    vertex: `p.x += uTime * (0.2 + aRand * 0.3); p.x = mod(p.x + 40.0, 80.0) - 40.0; vA = 0.25 + 0.3 * aRand;`,
  });
  scene.add(dust);

  const rest = new THREE.Vector3(), look = new THREE.Vector3(), dive = new THREE.Vector3(), diveLook = new THREE.Vector3();
  return {
    scene, camera, exposure: 1.0, bloom: [0.85, 0.5, 1.0],
    update({ time, dt, local, enter, exit, pointer, aspect }) {
      const sideLayout = aspect > 1.3;
      planet.position.set(sideLayout ? 9 : 2, sideLayout ? -4 : -8, 0);
      surface.rotation.y = time * 0.012 + local * 0.6;
      clouds.rotation.y = surface.rotation.y * 1.08;
      starMat.uniforms.uTime.value = time;
      (clouds.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
      (dust.material as THREE.ShaderMaterial).uniforms.uTime.value = time;

      // camera: pulls back as we arrive (rising out of the clouds), dives to the sunlit limb as we leave
      const back = lerp(14, 0, smooth(enter));
      rest.set(pointer.x * 0.8 - 2 + local * 2, 1.5 + pointer.y * 0.5, 34 - back - local * 3);
      look.set(planet.position.x * 0.55, planet.position.y * 0.3, 0);
      const e = smooth(exit);
      dive.copy(planet.position).addScaledVector(tmp.copy(SUN).add(new THREE.Vector3(0.3, 0.9, 1.6)).normalize(), R * 1.09);
      diveLook.copy(planet.position).addScaledVector(SUN, R * 4).add(new THREE.Vector3(0, R * 0.2, 0));
      camera.position.lerpVectors(rest, dive, e);
      camera.lookAt(look.lerp(diveLook, e));
      starMat.uniforms.uFade.value = 1 - e * 0.8;

      // meteors
      for (let i = 0; i < M; i++) {
        const m = pool[i];
        if (m.life <= 0) {
          m.next -= dt;
          if (m.next <= 0) {
            m.life = m.max = 0.7 + mr() * 0.8; m.len = 6 + mr() * 12; m.next = 1.2 + mr() * 3.5;
            m.p.set((mr() - 0.2) * 60 + camera.position.x, 18 + mr() * 14 + camera.position.y, -20 - mr() * 30 + camera.position.z);
            m.v.set(-(40 + mr() * 50), -(18 + mr() * 20), mr() * 6 - 3);
          }
        } else { m.life -= dt; m.p.addScaledVector(m.v, dt); }
        const a = m.life > 0 ? Math.sin((1 - m.life / m.max) * Math.PI) : 0;
        tail.copy(m.v).normalize().multiplyScalar(-m.len).add(m.p);
        side.copy(m.v).cross(tmp.copy(camera.position).sub(m.p)).normalize().multiplyScalar(0.09);
        const b = i * 12;
        mPos.set([tail.x - side.x, tail.y - side.y, tail.z - side.z, tail.x + side.x, tail.y + side.y, tail.z + side.z,
          m.p.x - side.x, m.p.y - side.y, m.p.z - side.z, m.p.x + side.x, m.p.y + side.y, m.p.z + side.z], b);
        mAlpha.fill(a * (1 - e), i * 4, i * 4 + 4);
      }
      mg.attributes.position.needsUpdate = true;
      mg.attributes.aAlpha.needsUpdate = true;
      sunSprite.lookAt(camera.position);
    },
  };
}
