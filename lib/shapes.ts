// Particle target shapes, built procedurally (no model files to load).
// Units: shapes fit a ~4.4 × 3.8 box centred on the origin.
//
// Look: a dense, organic particle cloud (the original design). Detail comes from the geometry: every part
// (frame, nav, buttons, cards, chart, cursor…) declares its length or area, compose() gives each part a fair
// share of particles, then scatters them at random positions along/inside it with a little depth thickness.
// `dens` makes a part read stronger (edges) or quieter (back faces).

type V = [number, number, number];
type Part = { len?: number; area?: number; dens?: number; at: (k: number, m: number) => V };

const TAU = Math.PI * 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const jit = (r: () => number, t: number) => (r() - 0.5) * t;
const mix = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const dist = (a: V, b: V) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

/** Deterministic PRNG (background field only). */
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- 1D parts (measured by length) ----

/** Several separate segments sharing one even spacing; points never bridge the gaps between them. */
const segs = (list: [V, V][], dens = 1): Part => {
  const lens = list.map(([a, b]) => dist(a, b)), len = lens.reduce((s, l) => s + l, 0);
  return {
    len, dens,
    at: (k, m) => {
      let s = ((k + 0.5) / m) * len, i = 0;
      while (i < lens.length - 1 && s > lens[i]) s -= lens[i++];
      return mix(list[i][0], list[i][1], lens[i] ? s / lens[i] : 0);
    },
  };
};
const path = (pts: V[], closed = false, dens = 1) => {
  const p = closed ? [...pts, pts[0]] : pts;
  return segs(p.slice(1).map((b, i): [V, V] => [p[i], b]), dens);
};
const line = (a: V, b: V, dens = 1) => segs([[a, b]], dens);
const arcPts = (cx: number, cy: number, r: number, a0: number, a1: number, z: number, steps = 48): V[] =>
  Array.from({ length: steps + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / steps; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]; });
const circle = (cx: number, cy: number, r: number, z = 0, dens = 1) => path(arcPts(cx, cy, r, 0, TAU, z).slice(0, -1), true, dens);
const rounded = (cx: number, cy: number, w: number, h: number, r: number, z = 0, dens = 1) => {
  const x0 = cx - w / 2 + r, x1 = cx + w / 2 - r, y0 = cy - h / 2 + r, y1 = cy + h / 2 - r, q = Math.PI / 2;
  return path([...arcPts(x1, y1, r, 0, q, z, 8), ...arcPts(x0, y1, r, q, 2 * q, z, 8), ...arcPts(x0, y0, r, 2 * q, 3 * q, z, 8), ...arcPts(x1, y0, r, 3 * q, 4 * q, z, 8)], true, dens);
};
/** A line of "words": dashes with small gaps, like text in a wireframe. */
const words = (x0: number, x1: number, y: number, z: number, pattern: number[], dens = 1) => {
  const total = pattern.reduce((s, w) => s + w, 0), gap = 0.07, span = x1 - x0 - gap * (pattern.length - 1);
  let x = x0;
  return segs(pattern.map((w): [V, V] => { const a: V = [x, y, z]; x += (w / total) * span; const b: V = [x, y, z]; x += gap; return [a, b]; }), dens);
};

// ---- 2D parts (measured by area) ----

const quadGrid = (a: V, b: V, c: V, d: V, dens = 1): Part => ({
  area: dist(a, b) * dist(a, d), dens,
  at: (k, m) => {
    const cols = Math.max(1, Math.round(Math.sqrt((m * dist(a, b)) / Math.max(1e-6, dist(a, d))))), rows = Math.ceil(m / cols);
    return mix(mix(a, b, ((k % cols) + 0.5) / cols), mix(d, c, ((k % cols) + 0.5) / cols), (Math.floor(k / cols) + 0.5) / rows);
  },
});
const grid = (cx: number, cy: number, w: number, h: number, z = 0, dens = 1) =>
  quadGrid([cx - w / 2, cy - h / 2, z], [cx + w / 2, cy - h / 2, z], [cx + w / 2, cy + h / 2, z], [cx - w / 2, cy + h / 2, z], dens);
const disc = (cx: number, cy: number, r: number, z = 0, dens = 1): Part => ({
  area: Math.PI * r * r, dens,
  at: (k, m) => { const rr = r * Math.sqrt((k + 0.5) / m), a = k * GOLDEN; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, z]; },
});
const sphere = (c: V, r: number, dens = 1): Part => ({
  area: 4 * Math.PI * r * r, dens,
  at: (k, m) => { const y = 1 - (2 * (k + 0.5)) / m, s = Math.sqrt(1 - y * y), a = k * GOLDEN; return [c[0] + Math.cos(a) * s * r, c[1] + y * r, c[2] + Math.sin(a) * s * r]; },
});
/** Even dot lattice clipped to a polygon (with optional holes), using the even-odd rule. */
const polyFill = (rings: [number, number][][], z = 0, dens = 1): Part => {
  const xs = rings[0].map((p) => p[0]), ys = rings[0].map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const inside = (x: number, y: number) => {
    let c = false;
    for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const area = rings.reduce((s, r, ri) => s + (ri ? -1 : 1) * Math.abs(r.reduce((a, [x, y], i) => { const [nx, ny] = r[(i + 1) % r.length]; return a + x * ny - nx * y; }, 0)) / 2, 0);
  const cache = new Map<number, V[]>();
  const lattice = (m: number) => {
    if (cache.has(m)) return cache.get(m)!;
    let pitch = Math.sqrt(area / m), pts: V[] = [];
    for (let tries = 0; tries < 30; tries++, pitch *= 0.97) {
      pts = [];
      for (let y = y0 + pitch / 2; y < y1; y += pitch) for (let x = x0 + pitch / 2; x < x1; x += pitch) if (inside(x, y)) pts.push([x, y, z]);
      if (pts.length >= m) break;
    }
    const pick = Array.from({ length: m }, (_, i) => pts[Math.floor((i * pts.length) / m)]); // even thinning
    cache.set(m, pick);
    return pick;
  };
  return { area, dens, at: (k, m) => lattice(m)[k] };
};

/** Shares n particles between parts so every part glows at the same brightness per area, then scatters each
 *  part's share at random positions on it, with `depth` of thickness. Shuffled so morphs swirl like a cloud.
 *  A line's particles spread over a band ~0.03 wide (the jitter), so a filled area counts as area / FILL of line:
 *  equal light per square unit instead of fills burning out to solid blobs. FILL > 0.03 keeps fills a touch
 *  softer than edges, so outlines carry the detail. */
function compose(n: number, parts: Part[], seed: number, depth = 0.05): Float32Array {
  const FILL = 0.05;
  const eff = parts.map((p) => (p.len ? p.len * (p.dens ?? 1) : ((p.area ?? 0) * (p.dens ?? 1)) / FILL));
  const total = eff.reduce((a, b) => a + b, 0);
  const want = eff.map((e) => (e / total) * n);
  const counts = want.map((w) => Math.floor(w));
  const order = want.map((w, i) => [w - Math.floor(w), i]).sort((a, b) => b[0] - a[0]);
  for (let left = n - counts.reduce((a, b) => a + b, 0), j = 0; left > 0; left--, j++) counts[order[j % order.length][1]]++;
  const r = rng(seed), out = new Float32Array(n * 3);
  let o = 0;
  parts.forEach((p, j) => {
    const M = Math.max(1, counts[j] * 6); // fine sub-steps, sampled at random = organic, not gridded
    for (let k = 0; k < counts[j]; k++, o++) {
      const q = p.at(Math.floor(r() * M), M);
      out.set([q[0] + jit(r, 0.03), q[1] + jit(r, 0.03), q[2] + jit(r, depth)], o * 3); // thin, crisp strokes
    }
  });
  for (let i = n - 1; i > 0; i--) { // shuffle: random pairing between shapes
    const j = Math.floor(r() * (i + 1));
    for (let c = 0; c < 3; c++) { const t = out[i * 3 + c]; out[i * 3 + c] = out[j * 3 + c]; out[j * 3 + c] = t; }
  }
  return out;
}

// ---- shapes: what we build (website → app → 3D) ----

/** A browser window with a real page inside: nav, headline, text, buttons, hero image, cards, scrollbar and a cursor. */
export const browser = (n: number) => {
  const f = 0.07, b = -0.07, z = 0.1; // frame front/back, page content
  const cards = [-1.32, 0.02, 1.36].flatMap((x): Part[] => [
    rounded(x, -1.08, 1.18, 0.5, 0.07, z),
    circle(x - 0.38, -1.08, 0.08, z),
    words(x - 0.2, x + 0.46, -1.02, z, [3, 2]),
    words(x - 0.2, x + 0.3, -1.15, z, [2, 3], 0.8),
  ]);
  return compose(n, [
    // window: front + faint back frame and corner depth, so it turns like a real object
    rounded(0, 0, 4.2, 3, 0.14, f, 1.25),
    rounded(0, 0, 4.2, 3, 0.14, b, 0.45),
    ...[[-2.07, 1.47], [2.07, 1.47], [-2.07, -1.47], [2.07, -1.47]].map(([x, y]) => line([x, y, b], [x, y, f], 0.6)),
    line([-2.1, 1.05, f], [2.1, 1.05, f]),
    ...[-1.86, -1.66, -1.46].map((x) => circle(x, 1.28, 0.055, f, 1.3)),
    rounded(0.35, 1.28, 2.1, 0.22, 0.11, f),
    circle(-0.55, 1.28, 0.035, f),
    words(-0.45, 0.8, 1.28, f, [4, 3], 0.7),
    // page nav
    circle(-1.85, 0.82, 0.07, z), words(-1.7, -1.15, 0.82, z, [1]),
    words(0.45, 1.9, 0.82, z, [2, 2, 2, 2], 0.9),
    // headline + text + buttons
    grid(-0.78, 0.52, 2.0, 0.13, z, 0.85),
    grid(-1.03, 0.3, 1.5, 0.13, z, 0.85),
    words(-1.85, -0.05, 0.07, z, [3, 4, 2, 3]),
    words(-1.85, -0.25, -0.09, z, [4, 2, 3, 3]),
    words(-1.85, -0.6, -0.25, z, [3, 2]),
    rounded(-1.45, -0.55, 0.78, 0.26, 0.13, z, 1.1), grid(-1.45, -0.55, 0.52, 0.06, z, 0.9),
    rounded(-0.58, -0.55, 0.78, 0.26, 0.13, z),
    // hero image: frame, sun, mountains
    rounded(1.07, 0.15, 1.55, 1.22, 0.07, z),
    circle(1.5, 0.5, 0.13, z), disc(1.5, 0.5, 0.07, z, 0.9),
    path([[0.3, -0.45, z], [0.66, 0.08, z], [0.9, -0.14, z], [1.3, 0.33, z], [1.84, -0.45, z]]),
    ...cards,
    // scrollbar + floating cursor
    line([2.0, 0.95, z], [2.0, -1.38, z], 0.6), grid(2.0, 0.55, 0.04, 0.5, z, 1.2),
    path([[0.6, -0.32, 0.35], [0.6, -0.66, 0.35], [0.68, -0.58, 0.35], [0.75, -0.72, 0.35], [0.8, -0.7, 0.35], [0.73, -0.56, 0.35], [0.84, -0.56, 0.35]], true, 1.4),
  ], 11);
};

/** A phone: body with real thickness and side buttons, camera cut-out, status bar, an app screen, and a notification. */
export const phone = (n: number) => {
  const f = 0.11, b = -0.11, s = 0.12;
  return compose(n, [
    rounded(0, 0, 1.9, 3.7, 0.3, f, 1.25),
    rounded(0, 0, 1.9, 3.7, 0.3, b, 0.45),
    ...[[-0.86, 1.76], [0.86, 1.76], [-0.86, -1.76], [0.86, -1.76]].map(([x, y]) => line([x, y, b], [x, y, f], 0.6)),
    line([0.97, 1.05, 0], [0.97, 0.6, 0], 1.6),
    line([-0.97, 1.25, 0], [-0.97, 1.0, 0], 1.6), line([-0.97, 0.88, 0], [-0.97, 0.63, 0], 1.6),
    rounded(0, 0, 1.7, 3.5, 0.22, s, 0.55),
    rounded(0, 1.55, 0.46, 0.13, 0.065, s, 1.2),
    words(-0.72, -0.45, 1.55, s, [1], 1.2), rounded(0.6, 1.55, 0.16, 0.08, 0.02, s),
    // app header
    circle(-0.55, 1.18, 0.11, s), words(-0.36, 0.25, 1.23, s, [3, 2]), words(-0.36, 0.05, 1.1, s, [2], 0.8),
    // card 1: sparkline
    rounded(0, 0.55, 1.45, 0.75, 0.08, s),
    words(-0.6, -0.1, 0.8, s, [2, 1], 0.8),
    path(Array.from({ length: 30 }, (_, i): V => { const x = -0.6 + (i / 29) * 1.2; return [x, 0.38 + Math.sin(i * 0.55) * 0.07 + (i / 29) * 0.18, s]; }), false, 1.2),
    disc(0.6, 0.56, 0.04, s),
    // card 2: bars
    rounded(0, -0.33, 1.45, 0.8, 0.08, s),
    ...[0.3, 0.55, 0.22, 0.62, 0.42, 0.5].map((h, i) => grid(-0.55 + i * 0.22, -0.66 + h / 2, 0.09, h, s + 0.01)),
    // list rows
    ...[-0.95, -1.17].flatMap((y): Part[] => [circle(-0.55, y, 0.07, s), words(-0.4, 0.55, y, s, [3, 2])]),
    // tab bar + home indicator
    ...[-0.55, -0.18, 0.18, 0.55].map((x) => circle(x, -1.42, 0.06, s)),
    line([-0.3, -1.63, s], [0.3, -1.63, s], 1.3),
    // notification floating in front
    rounded(1.25, 1.05, 1.15, 0.45, 0.12, 0.55, 1.1), circle(0.86, 1.05, 0.08, 0.55),
    words(1.0, 1.65, 1.1, 0.55, [2, 1]), words(1.0, 1.45, 0.98, 0.55, [2], 0.8),
  ], 22);
};

/** Interactive 3D: a glowing core inside a torus knot drawn as six helical strands (like a cable), two orbits, two moons. */
export const object3d = (n: number) => {
  const knot = (t: number): V => { const c = 1.12 + 0.42 * Math.cos(3 * t); return [c * Math.cos(2 * t), c * Math.sin(2 * t), -0.42 * Math.sin(3 * t)]; };
  const strand = (j: number, r: number) => {
    const pts: V[] = [];
    for (let i = 0; i < 600; i++) {
      const t = (i / 600) * TAU, p = knot(t), q = knot(t + 1e-3), T = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], tl = Math.hypot(T[0], T[1], T[2]);
      const tt = [T[0] / tl, T[1] / tl, T[2] / tl], nl = Math.hypot(tt[0], tt[1]) || 1, N = [-tt[1] / nl, tt[0] / nl, 0];
      const B = [tt[1] * N[2] - tt[2] * N[1], tt[2] * N[0] - tt[0] * N[2], tt[0] * N[1] - tt[1] * N[0]];
      const a = (j / 6) * TAU + t * 5, ca = Math.cos(a) * r, sa = Math.sin(a) * r;
      pts.push([p[0] + N[0] * ca + B[0] * sa, p[1] + N[1] * ca + B[1] * sa, p[2] + N[2] * ca + B[2] * sa]);
    }
    return path(pts, true);
  };
  const orbit = (rx: number, ry: number, rz: number, ph: number, dens: number) =>
    path(Array.from({ length: 96 }, (_, i): V => { const a = (i / 96) * TAU + ph; return [rx * Math.cos(a), ry * Math.sin(a), rz * Math.sin(a)]; }), true, dens);
  return compose(n, [
    ...Array.from({ length: 6 }, (_, j) => strand(j, 0.15)),
    sphere([0, 0, 0], 0.26, 0.9),
    orbit(2.1, 0.6, 1.2, 0, 1.2),
    orbit(1.55, 1.45, -0.5, 1, 0.7),
    sphere([2.1, 0, 0], 0.16),
    sphere([-0.4, 1.4, 0.15], 0.12),
  ], 33, 0.08);
};

/** The geometric "A" monogram: one true outline (outer contour + triangular counter) and a fill clipped to the letter. */
export const logoA = (n: number) => {
  // Legs run from the feet to a flat apex; the inner edges meet at (0, 0.764); the crossbar spans y −0.56…−0.24.
  const outer: [number, number][] = [[-1.4, -1.6], [-0.29, 1.6], [0.29, 1.6], [1.4, -1.6], [0.82, -1.6], [0.459, -0.56], [-0.459, -0.56], [-0.82, -1.6]];
  const counter: [number, number][] = [[-0.348, -0.24], [0.348, -0.24], [0, 0.764]];
  const ring = (r: [number, number][], d: number) => path(r.map(([x, y]): V => [x, y, 0]), true, d);
  return compose(n, [ring(outer, 1.5), ring(counter, 1.5), polyFill([outer, counter], 0, 0.75)], 44, 0.3);
};

/** Background field: mostly far, small dots with a few near ones, each layer spread to the camera's view at its
 *  depth (camera z = 6, 55° fov) so the whole screen is covered evenly. Random on purpose: it is a star field. */
export const scatter = (n: number) => {
  const r = rng(55), out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const z = -7 + Math.pow(r(), 1.6) * 8.5, h = 0.53 * (6 - z) + 0.3, w = h * 1.9;
    out.set([jit(r, 2 * w), jit(r, 2 * h), z], i * 3);
  }
  return out;
};
