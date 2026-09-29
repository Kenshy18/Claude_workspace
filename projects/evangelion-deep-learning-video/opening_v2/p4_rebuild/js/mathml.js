// ─────────────────────────────────────────────────────────────────────────────
//  p4_rebuild — the real math behind the film. Everything drawn as data comes from here.
//  Computed once at load (deterministic, seeded); frames only read these arrays.
// ─────────────────────────────────────────────────────────────────────────────

// Loss landscape: Himmelblau's function (Himmelblau 1972, "Applied Nonlinear Programming").
//   f(u,v) = (u² + v − 11)² + (u + v² − 7)²   four global minima f=0, one local max, four saddles.
export const f = (u, v) => { const a = u * u + v - 11, b = u + v * v - 7; return a * a + b * b; };
export const grad = (u, v) => { const a = u * u + v - 11, b = u + v * v - 7; return [4 * u * a + 2 * b, 2 * a + 4 * v * b]; };
const hess = (u, v) => [12 * u * u + 4 * v - 42, 4 * u + 4 * v, 4 * u + 4 * v, 12 * v * v + 4 * u - 26];

// World mapping. Loss plane (u,v) -> world (X = S·u, Z = −S·v). Displayed height is a monotone
// transform of the loss, Y = K·log(1 + f/4) (log-loss relief); contour lines are drawn at log(1+f) levels.
export const S = 100, K = 30;
export const lf = (u, v) => Math.log1p(f(u, v));
export const hgt = (u, v) => K * Math.log1p(f(u, v) / 4);
export const toWorld = (u, v, lift = 0) => [S * u, hgt(u, v) + lift, -S * v];
export const fromWorld = (x, z) => [x / S, -z / S];

// mulberry32 / gaussian (seeded)
export function rng32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function gauss(r) { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// Critical points by Newton's method on ∇f = 0 from a coarse grid of seeds (dedup).
function newton(u, v) {
  for (let i = 0; i < 60; i++) {
    const [gu, gv] = grad(u, v), [a, b, c, d] = hess(u, v), det = a * d - b * c;
    if (Math.abs(det) < 1e-12) return null;
    const du = (d * gu - b * gv) / det, dv = (-c * gu + a * gv) / det;
    u -= du; v -= dv;
    if (Math.abs(du) + Math.abs(dv) < 1e-13) break;
  }
  const [gu, gv] = grad(u, v);
  return Math.hypot(gu, gv) < 1e-8 ? [u, v] : null;
}
export const CRIT = (() => {
  const out = [];
  for (let u = -5; u <= 5; u += 0.5) for (let v = -5; v <= 5; v += 0.5) {
    const p = newton(u, v); if (!p || Math.abs(p[0]) > 6 || Math.abs(p[1]) > 6) continue;
    if (out.some((q) => Math.hypot(q.u - p[0], q.v - p[1]) < 1e-5)) continue;
    const [a, b, c, d] = hess(p[0], p[1]); const det = a * d - b * c;
    out.push({ u: p[0], v: p[1], f: f(p[0], p[1]), kind: det < 0 ? 'saddle' : a > 0 ? 'min' : 'max' });
  }
  return out;
})();
export const MINIMA = CRIT.filter((c) => c.kind === 'min').sort((a, b) => b.u + b.v - (a.u + a.v));
export const SADDLES = CRIT.filter((c) => c.kind === 'saddle');
export const PEAK = CRIT.find((c) => c.kind === 'max');
export const CITY = MINIMA.find((m) => Math.abs(m.u - 3) < 1e-3 && Math.abs(m.v - 2) < 1e-3); // (3,2): Tokyo-3

// ── optimizers (true update rules) ────────────────────────────────────────────
// Both start at the same init on the central summit's flank. SGD = ∇f + seeded N(0,σ²) noise.
export const INIT = [0.0, 0.0];
export const HP = {
  sgd: { lr: 0.002, mu: 0.9, sigma: 4.0, seed: 1, steps: 300 },           // heavy-ball momentum, PyTorch form v←μv+g, θ←θ−ηv
  adam: { lr: 0.08, b1: 0.9, b2: 0.999, eps: 1e-8, steps: 300 },           // Kingma & Ba 2014, bias-corrected
};
function runSGD(x0, o) {
  const r = rng32(o.seed); let u = x0[0], v = x0[1], vu = 0, vv = 0;
  const P = [[u, v]], L = [f(u, v)], G = [];
  for (let t = 1; t <= o.steps; t++) {
    let [gu, gv] = grad(u, v); G.push(Math.hypot(gu, gv));
    gu += o.sigma * gauss(r); gv += o.sigma * gauss(r);
    vu = o.mu * vu + gu; vv = o.mu * vv + gv; u -= o.lr * vu; v -= o.lr * vv;
    P.push([u, v]); L.push(f(u, v));
  }
  return { P, L, G };
}
function runAdam(x0, o) {
  let u = x0[0], v = x0[1], m = [0, 0], s = [0, 0];
  const P = [[u, v]], L = [f(u, v)], G = [];
  for (let t = 1; t <= o.steps; t++) {
    const g = grad(u, v); G.push(Math.hypot(g[0], g[1]));
    for (let i = 0; i < 2; i++) { m[i] = o.b1 * m[i] + (1 - o.b1) * g[i]; s[i] = o.b2 * s[i] + (1 - o.b2) * g[i] * g[i]; }
    const bc1 = 1 - Math.pow(o.b1, t), bc2 = 1 - Math.pow(o.b2, t);
    u -= (o.lr * m[0] / bc1) / (Math.sqrt(s[0] / bc2) + o.eps);
    v -= (o.lr * m[1] / bc1) / (Math.sqrt(s[1] / bc2) + o.eps);
    P.push([u, v]); L.push(f(u, v));
  }
  return { P, L, G };
}
export const TRAJ = { sgd: runSGD(INIT, HP.sgd), adam: runAdam(INIT, HP.adam) };
// step at which each run first gets within loss < 1e-2
export const ARRIVE = Object.fromEntries(Object.entries(TRAJ).map(([k, r]) => [k, r.L.findIndex((l) => l < 1e-2)]));

// ── gradient clipping (the Lance): clip_grad_norm_(max_norm=1.0) at the steep south-west corner ─
export const CLIP = (() => {
  const p = [-5, -5], g = grad(...p), n = Math.hypot(...g), max = 1.0;
  return { p, g, norm: n, max, scale: Math.min(1, max / n), clipped: g.map((x) => x * Math.min(1, max / n)) };
})();

// ── streamlines of −∇f (for the engraving) and iso-contours (marching squares) ─────────────────
export function streamlines(n = 26, stepLen = 0.035, maxSteps = 700) {
  const lines = []; const r = rng32(7);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    let u = -6 + 12 * (i + 0.2 + 0.6 * r()) / n, v = -6 + 12 * (j + 0.2 + 0.6 * r()) / n; const L = [[u, v]];
    for (let k = 0; k < maxSteps; k++) {
      const [gu, gv] = grad(u, v), gn = Math.hypot(gu, gv); if (gn < 0.4) break;
      u -= (gu / gn) * stepLen; v -= (gv / gn) * stepLen; if (Math.abs(u) > 6.2 || Math.abs(v) > 6.2) break;
      L.push([u, v]);
    }
    if (L.length > 8) lines.push(L);
  }
  return lines;
}
export function contours(levels, N = 160, lo = -6.2, hi = 6.2) {
  const d = (hi - lo) / N, val = new Float64Array((N + 1) * (N + 1));
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) val[j * (N + 1) + i] = lf(lo + i * d, lo + j * d);
  const out = [];
  for (const L of levels) {
    const segs = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const a = val[j * (N + 1) + i], b = val[j * (N + 1) + i + 1], c = val[(j + 1) * (N + 1) + i + 1], e = val[(j + 1) * (N + 1) + i];
      const x = lo + i * d, y = lo + j * d, pts = [];
      const edge = (p, q, x0, y0, x1, y1) => { if ((p < L) !== (q < L)) { const t = (L - p) / (q - p); pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]); } };
      edge(a, b, x, y, x + d, y); edge(b, c, x + d, y, x + d, y + d); edge(c, e, x + d, y + d, x, y + d); edge(e, a, x, y + d, x, y);
      if (pts.length >= 2) segs.push([pts[0], pts[1]]); if (pts.length === 4) segs.push([pts[2], pts[3]]);
    }
    out.push({ level: L, segs });
  }
  return out;
}

// ── attention: a head built from sinusoidal positional encodings (Vaswani et al. 2017, §3.5) ──
// PE(p)_{2i} = sin(p/10000^{2i/d}), PE(p)_{2i+1} = cos(...). For a fixed offset k, PE(p+k) is a
// rotation R_k of PE(p) (the paper's stated reason for choosing sinusoids). So a head with W_Q = R_k,
// W_K = I attends from token p to token p+k: q_p·k_j = Σ_i cos(ω_i (p+k−j)). Scores scaled by 1/√d,
// causal mask, softmax. `gain` = the norm of W_Q and W_K (q = g·R_k·PE, k = g·PE). Exactly computed here.
export const PE_D = 64;
export function attention(n, offset, gain = 1, d = PE_D) {
  const w = []; for (let i = 0; i < d / 2; i++) w.push(1 / Math.pow(10000, (2 * i) / d));
  const A = [];
  for (let p = 0; p < n; p++) {
    const s = [];
    for (let j = 0; j < n; j++) {
      if (j > p) { s.push(-Infinity); continue; }
      let dot = 0; for (const wi of w) dot += Math.cos(wi * (p + offset - j));
      s.push((gain * gain * dot) / Math.sqrt(d));
    }
    const mx = Math.max(...s); const e = s.map((x) => (x === -Infinity ? 0 : Math.exp(x - mx))); const Z = e.reduce((a, b) => a + b, 0);
    A.push(e.map((x) => x / Z));
  }
  return A;
}

// ── ring all-reduce (Patarasuk & Yuan 2009; Baidu 2017): N ranks, N chunks, 2(N−1) steps ─────
// state[r][c] = number of ranks' contributions summed into chunk c held by rank r.
export const RING_N = 8;
export function ringState(step) {
  const N = RING_N; const st = Array.from({ length: N }, () => Array(N).fill(1));
  const full = Array.from({ length: N }, () => Array(N).fill(false));
  const sends = [];
  for (let s = 0; s < Math.min(step, 2 * (N - 1)); s++) {
    const nx = st.map((row) => row.slice()); const cur = [];
    for (let r = 0; r < N; r++) {
      const to = (r + 1) % N;
      if (s < N - 1) { const c = (((r - s) % N) + N) % N; nx[to][c] = st[to][c] + st[r][c]; cur.push([r, to, c]); }
      else { const c = (((r + 1 - (s - (N - 1))) % N) + N) % N; nx[to][c] = st[r][c]; cur.push([r, to, c]); }
    }
    for (let r = 0; r < N; r++) st[r] = nx[r];
    sends.length = 0; sends.push(...cur);
  }
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) full[r][c] = st[r][c] === N;
  return { st, full, sends };
}

// ── published facts used on screen (sources in NOTES.md) ─────────────────────────────────────
export const FACTS = {
  alexnet: { year: 2012, top5: 15.3, runnerUp: 26.2, params: '60M', gpus: 'GTX 580 3GB ×2', epochs: 90, images: '1.2M' },
  adam: { year: 2014, lr: 0.001, b1: 0.9, b2: 0.999, eps: 1e-8 },
  transformer: { year: 2017, arxiv: '1706.03762', dModel: 512, heads: 8, layers: 6 },
};
