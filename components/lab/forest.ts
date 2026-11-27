import * as THREE from "three";
import { glowPoints, lerp, rng, smooth, type World } from "./util";

/** Nature as real footage: sunbeams through a rainforest canopy (Pexels, Saulo Nulo), scrubbed by scroll.
 *  Encoded with a keyframe every 6 frames so seeking both ways stays smooth; loaded as a Blob so seeks
 *  never wait on the network. Dust motes drift in front; the shared fluid pass reacts to the cursor. */
export function forestWorld(width: number, height: number): World {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);

  // Poster first, footage once it is in memory
  const poster = new THREE.TextureLoader().load("/lab/rainforest-poster.jpg");
  poster.colorSpace = THREE.SRGBColorSpace;
  const video = Object.assign(document.createElement("video"), { muted: true, playsInline: true, preload: "auto", loop: false });
  let videoTex: THREE.VideoTexture | null = null;
  if (process.env.NODE_ENV !== "production") Object.assign(window, { __rainVideo: video });
  fetch("/lab/rainforest.mp4").then((r) => r.blob()).then((b) => {
    video.src = URL.createObjectURL(b);
    video.addEventListener("loadeddata", () => {
      videoTex = new THREE.VideoTexture(video);
      videoTex.colorSpace = THREE.SRGBColorSpace;
      mat.uniforms.uTex.value = videoTex;
      mat.uniforms.uTexAspect.value = video.videoWidth / video.videoHeight;
    }, { once: true });
  }).catch(() => {}); // the poster stays if the clip can't load

  const mat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: poster }, uTexAspect: { value: 16 / 9 }, uAspect: { value: width / height }, uZoom: { value: 1 }, uLift: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
    fragmentShader: /* glsl */ `uniform sampler2D uTex; uniform float uTexAspect, uAspect, uZoom, uLift; varying vec2 vUv;
      void main(){
        vec2 s = uAspect > uTexAspect ? vec2(1.0, uTexAspect / uAspect) : vec2(uAspect / uTexAspect, 1.0); // cover-fit
        vec2 uv = (vUv - 0.5) * s / uZoom + 0.5 + vec2(0.0, uLift);
        vec3 c = texture2D(uTex, clamp(uv, 0.001, 0.999)).rgb;
        gl_FragColor = vec4(pow(c, vec3(1.12)) * 0.92, 1.0);
      }`,
    depthWrite: false,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  plane.frustumCulled = false;
  scene.add(plane);

  // Dust catching the sunbeams
  const r = rng(91), D = 700, dp = new Float32Array(D * 3), dr = new Float32Array(D);
  for (let i = 0; i < D; i++) { dp.set([(r() - 0.5) * 12, (r() - 0.5) * 7, -2 - r() * 8], i * 3); dr[i] = r(); }
  const dust = glowPoints(dp, dr, { color: new THREE.Color(1.4, 1.35, 1.0), size: 1.5, attenuate: true,
    vertex: `p.y += mod(uTime * (0.05 + aRand * 0.08), 7.0) - 3.5; p.x += sin(uTime * 0.2 + aRand * 50.0) * 0.4; vA = 0.2 + 0.8 * pow(0.5 + 0.5 * sin(uTime * 0.9 + aRand * 80.0), 4.0);` });
  scene.add(dust);

  return {
    scene, camera, exposure: 0.95, bloom: [0.3, 0.5, 1.6], grade: [1, 1.02, 0.97], saturation: 1.15,
    update({ time, local, enter, exit, aspect }) {
      mat.uniforms.uAspect.value = aspect;
      (dust.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
      // descending into the canopy = zooming in from wide; leaving = pushing up into the light
      mat.uniforms.uZoom.value = lerp(1.35, 1, smooth(enter)) + smooth(exit) * 0.35;
      mat.uniforms.uLift.value = smooth(exit) * 0.08;
      // scroll scrubs the footage; seeks are coalesced (one in flight at a time)
      if (videoTex && video.duration && !video.seeking) {
        const target = Math.min(video.duration - 0.05, local * (video.duration - 0.05));
        if (Math.abs(video.currentTime - target) > 1 / 30) video.currentTime = target;
      }
    },
  };
}
