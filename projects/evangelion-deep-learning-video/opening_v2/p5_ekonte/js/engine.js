// ─────────────────────────────────────────────────────────────────────────────
//  p5_ekonte — 絵コンテ engine
//  Paper sheet + printed form, rostrum camera, graphite / coloured-pencil strokes with hand wobble and
//  pressure, marker fills, handwriting (Klee One / Zen Kurenaido), MathJax glyphs re-drawn by hand,
//  写植 paste-ups, 2D post (grain, weave, flash). Every frame is a pure function of t.
// ─────────────────────────────────────────────────────────────────────────────
const COL = {
  graph: '#222125', blue: '#3a73c6', red: '#d0372c', green: '#2c8a4e', sepia: '#8a5a3c',
  form: '#7f95ab', formInk: '#6d8298', paper: '#f3efe5',
  mOrange: '#f0882e', mSky: '#86bde8', mPurple: '#7a58a8', mGreen: '#93d44e', mRed: '#d8352a',
  mBlack: '#1c1b1f', mYellow: '#f3c62f', mGrey: '#a3a6ab', mPink: '#ec9fb0', mTeal: '#6fb8b0', mBlueDeep: '#3d6fc0',
};
const FONT = {
  klee: '"Klee One"', kure: '"Zen Kurenaido"', mincho: '"Shippori Mincho B1", "Noto Serif CJK JP"',
  minchoN: '"Noto Serif CJK JP"', cond: '"Roboto Condensed"', cinzel: '"Cinzel"', garamond: '"EB Garamond"',
};

// ── sheet layout (sheet coordinates == screen coordinates at camera 'row') ────
const L = {
  hdrY0: 20, hdrY1: 66, colY1: 104, rowY1: 948,
  cCut: [34, 138], cPic: [138, 1248], cAct: [1248, 1690], cDlg: [1690, 1774], cSec: [1774, 1886],
  panel: { x: 155, y: 121, w: 1080, h: 810 },       // 4:3 picture frame
};
const PS = L.panel.w / 1440;                          // panel units (1440x1080) -> sheet px

// ── canvases ─────────────────────────────────────────────────────────────────
const OUT = document.getElementById('out');
const CTX_OPT = { willReadFrequently: true };   // CPU raster: far faster than SwiftShader GL for full-frame composites
const octx = OUT.getContext('2d', CTX_OPT);
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const PC = mkCanvas(W, H), pctx = PC.getContext('2d', CTX_OPT);     // pencil layer
const MK = mkCanvas(W, H), mctx = MK.getContext('2d', CTX_OPT);     // marker layer
let SHEET = null, TOOTH = null, GRAIN = [], VIGN = null;

// ── paper, tooth, printed form ───────────────────────────────────────────────
function buildPaper() {
  const w = W + 80, h = H + 80;
  SHEET = mkCanvas(w, h);
  const g = SHEET.getContext('2d', CTX_OPT);
  g.fillStyle = COL.paper; g.fillRect(0, 0, w, h);
  // low-frequency tone (very subtle): large soft blotches
  const rng = mulberry32(11);
  for (let i = 0; i < 90; i++) {
    const x = rng() * w, y = rng() * h, r = 80 + rng() * 260;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const dark = rng() < 0.5;
    gr.addColorStop(0, dark ? 'rgba(120,100,70,0.018)' : 'rgba(255,255,250,0.035)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  // fine tooth noise baked into paper
  const id = g.getImageData(0, 0, w, h), d = id.data;
  const r2 = mulberry32(5);
  for (let i = 0; i < d.length; i += 4) {
    const n = (r2() - 0.5) * 15;
    d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.9;
  }
  g.putImageData(id, 0, 0);
  // fibres
  g.lineCap = 'round';
  for (let i = 0; i < 700; i++) {
    const x = rng() * w, y = rng() * h, a = rng() * Math.PI * 2, l = 4 + rng() * 16;
    g.strokeStyle = rng() < 0.7 ? 'rgba(110,95,70,0.07)' : 'rgba(255,255,255,0.18)';
    g.lineWidth = 0.6 + rng() * 0.6;
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  g.translate(40, 40);
  drawForm(g);
  // tooth mask for pencil grain (alpha specks), paper-locked
  TOOTH = mkCanvas(w, h);
  const t = TOOTH.getContext('2d', CTX_OPT);
  const tid = t.createImageData(w, h), td = tid.data;
  const r3 = mulberry32(99);
  for (let i = 0; i < td.length; i += 4) {
    const v = r3();
    td[i] = td[i + 1] = td[i + 2] = 0;
    td[i + 3] = v < 0.22 ? 150 + v * 400 : v < 0.5 ? 40 : 0;
  }
  t.putImageData(tid, 0, 0);
  // film grain variants (screen space)
  for (let k = 0; k < 4; k++) {
    const c = mkCanvas(W / 2, H / 2), cg = c.getContext('2d', CTX_OPT);
    const gid = cg.createImageData(W / 2, H / 2), gd = gid.data, rr = mulberry32(300 + k);
    for (let i = 0; i < gd.length; i += 4) { const v = rr() * 255; gd[i] = gd[i + 1] = gd[i + 2] = v; gd[i + 3] = 255; }
    cg.putImageData(gid, 0, 0);
    GRAIN.push(c);
  }
  VIGN = mkCanvas(W, H);
  const vg = VIGN.getContext('2d', CTX_OPT);
  const rg = vg.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.15);
  rg.addColorStop(0, 'rgba(40,30,20,0)'); rg.addColorStop(1, 'rgba(40,30,20,0.22)');
  vg.fillStyle = rg; vg.fillRect(0, 0, W, H);
  hatchMask('wash'); hatchMask('graphite');
  for (const k of ['wash', 'graphite']) { const t = mkCanvas(8, 8).getContext('2d', CTX_OPT); t.drawImage(HMASK[k], 0, 0); t.getImageData(0, 0, 1, 1); }
}

function formText(g, s, x, y, size, o = {}) {
  g.save();
  g.font = `${o.w || 500} ${size}px ${o.f || '"Noto Sans CJK JP"'}`;
  g.fillStyle = o.c || COL.formInk; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle';
  if (o.ls) g.letterSpacing = o.ls + 'px';
  g.fillText(s, x, y);
  g.restore();
}
function drawForm(g) {
  g.save();
  g.strokeStyle = COL.form; g.lineWidth = 1.4;
  const hl = (x0, x1, y, lw = 1.4) => { g.lineWidth = lw; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); };
  const vl = (x, y0, y1, lw = 1.4) => { g.lineWidth = lw; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); };
  const X0 = L.cCut[0], X1 = L.cSec[1];
  // header boxes
  hl(X0, X1, L.hdrY0, 1.6); hl(X0, X1, L.hdrY1, 1.2);
  vl(X0, L.hdrY0, 1080 + 40, 1.8); vl(X1, L.hdrY0, 1080 + 40, 1.8);
  const hb = [[X0, 138, '作品名'], [760, 858, '話 数'], [1060, 1140, 'シーン'], [1320, 1400, 'No.'], [1600, 1680, 'PAGE']];
  for (const [a, b, s] of hb) { vl(b, L.hdrY0, L.hdrY1, 1); if (a !== X0) vl(a, L.hdrY0, L.hdrY1, 1.2); formText(g, s, (a + b) / 2, (L.hdrY0 + L.hdrY1) / 2, 14, { align: 'center' }); }
  // column headers
  hl(X0, X1, L.colY1, 1.2);
  const cols = [[L.cCut, 'カット', 'CUT'], [L.cPic, '画　　面', 'PICTURE'], [L.cAct, '内　　容', 'ACTION'], [L.cDlg, 'セリフ', 'DIALOGUE'], [L.cSec, '秒', 'TIME']];
  for (const [[a, b], jp, en] of cols) {
    vl(b, L.hdrY1, 1080 + 40, 1.2);
    formText(g, jp, (a + b) / 2 - (en.length * 3.2), (L.hdrY1 + L.colY1) / 2, 15, { align: 'center' });
    formText(g, en, (a + b) / 2 + jp.length * 7.5 + 4, (L.hdrY1 + L.colY1) / 2 + 1, 9.5, { align: 'center', f: '"Roboto Condensed"', w: 700, ls: 1 });
  }
  // row separators (this row and the next one peeking in)
  hl(X0, X1, L.rowY1, 1.6);
  // picture frame (printed), with tick marks for the 4:3 frame centre
  const P = L.panel;
  g.lineWidth = 1.6; g.strokeRect(P.x, P.y, P.w, P.h);
  g.lineWidth = 1;
  for (const [x, y, dx, dy] of [[P.x + P.w / 2, P.y, 0, -8], [P.x + P.w / 2, P.y + P.h, 0, 8], [P.x, P.y + P.h / 2, -8, 0], [P.x + P.w, P.y + P.h / 2, 8, 0]]) {
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx, y + dy); g.stroke();
  }
  // next row: frame top and a second frame edge
  g.lineWidth = 1.6; g.strokeRect(P.x, L.rowY1 + 16, P.w, 400);
  // 秒 cell subdivision
  hl(L.cSec[0], L.cSec[1], L.rowY1 - 64, 1);
  formText(g, '計', L.cSec[0] + 10, L.rowY1 - 50, 12);
  // tiny printed footer
  formText(g, 'GRADIENT PRODUCTION  絵コンテ用紙  A4', X1 - 4, L.hdrY0 - 9, 10, { align: 'right', f: '"Roboto Condensed"', w: 700, ls: 1.5 });
  g.restore();
}

// ── camera ───────────────────────────────────────────────────────────────────
// cam = {s, cx, cy}: sheet point (cx,cy) is placed at screen centre, scale s.
const CAM_ROW = { s: 1, cx: W / 2, cy: H / 2 };
const CAM_PANEL = { s: 1080 / L.panel.h, cx: L.panel.x + L.panel.w / 2, cy: L.panel.y + L.panel.h / 2 };
function camLerp(a, b, k) { return { s: lerp(a.s, b.s, k), cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k) }; }
function camMatrix(c, wx = 0, wy = 0) { return [c.s, 0, 0, c.s, W / 2 - c.cx * c.s + wx, H / 2 - c.cy * c.s + wy]; }

// ── RNG helpers ──────────────────────────────────────────────────────────────
function noise1(x, seed) { return vnoise(x, seed) * 2 - 1; }
function strSeed(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// ── geometry helpers ─────────────────────────────────────────────────────────
function resample(pts, step) {
  const out = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    let [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i];
    let seglen = Math.hypot(x1 - x0, y1 - y0);
    if (seglen < 1e-6) continue;
    let d = step - acc;
    while (d <= seglen) {
      const k = d / seglen;
      out.push([x0 + (x1 - x0) * k, y0 + (y1 - y0) * k]);
      d += step;
    }
    acc = seglen - (d - step);
  }
  const last = pts[pts.length - 1], pl = out[out.length - 1];
  if (Math.hypot(last[0] - pl[0], last[1] - pl[1]) > step * 0.3) out.push(last);
  return out;
}
function catmull(pts, n = 8) {
  if (pts.length < 3) return pts;
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function ellipsePts(cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2, rot = 0, n = 0) {
  n = n || Math.max(12, Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry) / 10));
  const pts = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return pts;
}
function polyLen(p) { let l = 0; for (let i = 1; i < p.length; i++) l += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return l; }
function xf(pts, m) { return pts.map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]); }

// ── pencil stroke construction ───────────────────────────────────────────────
// A stroke = up to 2 passes; each pass is a wobbly polyline with per-vertex width (pressure).
function buildStroke(pts, o) {
  const rng = mulberry32(o.seed);
  const w = (o.w ?? 2.4) * 1.12, wob = o.wob ?? 1.6, passes = o.passes ?? 2;
  let base = resample(pts, o.step || 5);
  if (base.length < 2) base = [pts[0], pts[pts.length - 1]];
  // overshoot at ends (pencil runs past the corner)
  const os = o.over ?? (1.5 + rng() * 5);
  const ext = (a, b, d) => { const l = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1; return [a[0] + (a[0] - b[0]) / l * d, a[1] + (a[1] - b[1]) / l * d]; };
  if (base.length >= 2 && os > 0) {
    base.unshift(ext(base[0], base[1], os * (0.3 + rng() * 0.7)));
    base.push(ext(base[base.length - 1], base[base.length - 2], os));
  }
  const n = base.length;
  const out = [];
  for (let p = 0; p < passes; p++) {
    const sd = o.seed * 7 + p * 131;
    const xs = new Float32Array(n), ys = new Float32Array(n), ws = new Float32Array(n);
    const off = p === 0 ? 0 : (rng() - 0.5) * w * 1.6;
    let s = 0;
    for (let i = 0; i < n; i++) {
      const a = base[Math.max(0, i - 1)], b = base[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      if (i > 0) s += Math.hypot(base[i][0] - base[i - 1][0], base[i][1] - base[i - 1][1]);
      const u = n > 1 ? i / (n - 1) : 0;
      const dn = off + wob * (noise1(s / 70, sd) * 1.0 + noise1(s / 17, sd + 3) * 0.35);
      xs[i] = base[i][0] - ty * dn; ys[i] = base[i][1] + tx * dn;
      const taper = Math.pow(clamp(Math.min(u / 0.1, (1 - u) / 0.16), 0.18, 1), 0.7);
      ws[i] = w * taper * (0.78 + 0.44 * vnoise(s / 55, sd + 9)) * (p === 0 ? 1 : 0.7);
    }
    out.push({ xs, ys, ws, alpha: p === 0 ? 1 : (o.pass2 ?? 0.45), path: null });
  }
  return out;
}
function passPath(ps, upto) {
  // outline polygon of the first `upto` vertices
  const n = Math.max(2, Math.min(ps.xs.length, upto));
  const L2 = [], R2 = [];
  for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
    let tx = ps.xs[i1] - ps.xs[i0], ty = ps.ys[i1] - ps.ys[i0]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const hw = ps.ws[i] / 2;
    L2.push(ps.xs[i] - ty * hw, ps.ys[i] + tx * hw);
    R2.push(ps.xs[i] + ty * hw, ps.ys[i] - tx * hw);
  }
  const path = new Path2D();
  path.moveTo(L2[0], L2[1]);
  for (let i = 2; i < L2.length; i += 2) path.lineTo(L2[i], L2[i + 1]);
  for (let i = R2.length - 2; i >= 0; i -= 2) path.lineTo(R2[i], R2[i + 1]);
  path.closePath();
  return path;
}
function drawStroke(ctx, st, p, color, alpha) {
  if (p <= 0) return;
  ctx.fillStyle = color;
  for (const ps of st) {
    const n = ps.xs.length;
    ctx.globalAlpha = Math.min(1, alpha * 1.12) * ps.alpha;
    if (p >= 1) { if (!ps.path) ps.path = passPath(ps, n); ctx.fill(ps.path); }
    else {
      const upto = Math.max(2, Math.ceil(p * n));
      ctx.fill(passPath(ps, upto));
    }
  }
  ctx.globalAlpha = 1;
}

// ── hatching ─────────────────────────────────────────────────────────────────
function hatchSegs(poly, ang, sp, jit = 0.25, seed = 1) {
  const c = Math.cos(-ang), s = Math.sin(-ang);
  const rp = poly.map(([x, y]) => [x * c - y * s, x * s + y * c]);
  let y0 = Infinity, y1 = -Infinity;
  for (const p of rp) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const segs = [], rng = mulberry32(seed);
  const ci = Math.cos(ang), si = Math.sin(ang);
  for (let y = y0 + sp * 0.5; y < y1; y += sp) {
    const xsI = [];
    for (let i = 0; i < rp.length; i++) {
      const a = rp[i], b = rp[(i + 1) % rp.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xsI.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
    }
    xsI.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xsI.length; k += 2) {
      const L0 = xsI[k] + (rng() - 0.3) * sp * jit * 3, L1 = xsI[k + 1] - (rng() - 0.3) * sp * jit * 3;
      if (L1 - L0 < 2) continue;
      const yy = y + (rng() - 0.5) * sp * jit;
      segs.push([[L0 * ci - yy * si, L0 * si + yy * ci], [L1 * ci - yy * si, L1 * si + yy * ci]]);
    }
  }
  return segs;
}

// ── handwriting ──────────────────────────────────────────────────────────────
const ADV = {};
function advance(ctx, fontStr, ch) {
  const k = fontStr + '|' + ch;
  if (ADV[k] === undefined) { ctx.font = fontStr; ADV[k] = ctx.measureText(ch).width; }
  return ADV[k];
}
// layout a string into per-char records (relative to origin), deterministic jitter
function layoutHand(ctx, str, o) {
  const fam = o.font === 'kure' ? FONT.kure : o.font === 'cond' ? FONT.cond : FONT.klee;
  const wt = o.font === 'kure' ? 400 : o.font === 'cond' ? 700 : (o.weight || 600);
  const size = o.size || 26;
  const fontStr = `${wt} ${size}px ${fam}`;
  const rng = mulberry32(o.seed || strSeed(str));
  const chars = [];
  let x = 0;
  const jit = o.jit ?? 1;
  for (const ch of str) {
    const a = advance(ctx, fontStr, ch) * (o.sx || 1);
    chars.push({ ch, x, dy: (rng() - 0.5) * size * 0.06 * jit, rot: (rng() - 0.5) * 0.07 * jit, sc: 1 + (rng() - 0.5) * 0.08 * jit, a });
    x += a + (o.ls || 0) + (rng() - 0.5) * size * 0.04 * jit;
  }
  return { chars, width: x, fontStr, size };
}

// ── math (MathJax glyphs, handwritten) ───────────────────────────────────────
const MATH_MAP = {};
(function initMathMap() {
  for (let i = 0; i < 26; i++) { MATH_MAP[(0x1D434 + i).toString(16).toUpperCase()] = String.fromCharCode(65 + i); MATH_MAP[(0x1D44E + i).toString(16).toUpperCase()] = String.fromCharCode(97 + i); }
  MATH_MAP['210E'] = 'h';
  const gr = { '1D6FC': 'α', '1D6FD': 'β', '1D6FE': 'γ', '1D6FF': 'δ', '1D700': 'ε', '1D716': 'ε', '1D702': 'η', '1D703': 'θ', '1D706': 'λ', '1D707': 'μ', '1D70B': 'π', '1D70E': 'σ', '1D711': 'φ', '1D713': 'ψ', '1D714': 'ω', '1D6E5': 'Δ', '394': 'Δ', '1D6F7': 'Δ' };
  Object.assign(MATH_MAP, gr);
  const sym = { '2212': '−', '22C5': '·', '2202': '∂', '2208': '∈', '221D': '∝', '21D2': '⇒', '2207': '∇', '221E': '∞', '2223': '|', '2190': '←', '2192': '→', '2295': '⊕', '2032': '′', '2F': '/', '2B': '+', '3D': '=', '2C': ',', '2E': '.', '3A': ':', '7C': '|', '5B': '[', '5D': ']', '28': '(', '29': ')', '2016': '‖', '2225': '‖' };
  Object.assign(MATH_MAP, sym);
  for (let c = 0x30; c <= 0x39; c++) MATH_MAP[c.toString(16).toUpperCase()] = String.fromCharCode(c);
  for (let c = 0x41; c <= 0x5A; c++) MATH_MAP[c.toString(16).toUpperCase()] = String.fromCharCode(c);
  for (let c = 0x61; c <= 0x7A; c++) MATH_MAP[c.toString(16).toUpperCase()] = String.fromCharCode(c);
})();
const GLYPH_PATH = {};
function mathInfo(key) { return window.F5[key]; }
function mathWidth(key, em) { const f = window.F5[key]; return f.vb[2] * em / 1000; }

// ── items: everything drawable in a cut is an item with a reveal window ──────
// item = {kind, t0, t1, ...}; layer: 'pencil' | 'marker' | 'paste' | 'top'
// space: 'panel' (1440x1080 units, clipped to the picture frame) | 'sheet'
class Builder {
  constructor(cut) {
    this.items = []; this.cut = cut; this.win = [-10, -9.99]; this.cursor = -10; this.seedBase = strSeed(cut.id); this.n = 0;
    this.space = 'panel'; this.grp = null; this.defaults = {};
  }
  seed() { return this.seedBase + (this.n++) * 7919; }
  // set a reveal window: following items are drawn one after another within [t0, t0+dur]
  at(t0, dur = 0) { this.flush(); this.win = [t0, t0 + dur]; this.pending = []; return this; }
  done() { return this.at(-10, 0.001); }             // "already drawn" (chorus panels)
  sheet() { this.flush(); this.space = 'sheet'; return this; }
  panel() { this.flush(); this.space = 'panel'; return this; }
  group(g) { this.flush(); this.grp = g; return this; }      // g: {fn(lt) -> matrix or null, alpha(lt)}
  ungroup() { this.flush(); this.grp = null; return this; }
  push(it, weight) {
    it.space = this.space; it.grp = this.grp;
    (this.pending || (this.pending = [])).push([it, weight]);
    this.items.push(it);
    return it;
  }
  flush() {
    const P = this.pending || [];
    if (!P.length) return;
    const tot = P.reduce((a, [, w]) => a + w, 0) || 1;
    let acc = 0;
    const [t0, t1] = this.win;
    for (const [it, w] of P) {
      if (it.t0 === undefined) { it.t0 = t0 + (t1 - t0) * acc / tot; it.t1 = t0 + (t1 - t0) * (acc + w) / tot; }
      acc += w;
    }
    this.pending = [];
  }
  // ── pencil primitives ──
  stroke(pts, o = {}) {
    const it = { kind: 'stroke', pts, o: { ...this.defaults, ...o }, col: o.col || this.defaults.col || COL.graph, alpha: o.a ?? this.defaults.a ?? 0.85, layer: o.layer || this.defaults.layer };
    it.st = buildStroke(pts, { seed: o.seed || this.seed(), w: it.o.w, wob: it.o.wob, passes: it.o.passes, over: it.o.over, pass2: it.o.pass2, step: it.o.step });
    return this.push(it, (o.weight ?? polyLen(pts)) + 30);
  }
  line(x0, y0, x1, y1, o) { return this.stroke([[x0, y0], [x1, y1]], o); }
  curve(pts, o) { return this.stroke(catmull(pts, 8), o); }
  poly(pts, o = {}) {   // separate strokes per edge -> hand-drawn corners
    const n = pts.length, cl = o.closed !== false;
    for (let i = 0; i < (cl ? n : n - 1); i++) this.line(pts[i][0], pts[i][1], pts[(i + 1) % n][0], pts[(i + 1) % n][1], o);
  }
  rect(x, y, w, h, o) { this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o); }
  circle(cx, cy, r, o = {}) {
    const rng = mulberry32(o.seed || this.seed());
    const a0 = rng() * Math.PI * 2, ov = 0.25 + rng() * 0.35;
    const ry = r * (o.sq ?? (0.94 + rng() * 0.1));
    return this.stroke(ellipsePts(cx, cy, r, ry, a0, a0 + Math.PI * 2 + ov, o.rot ?? (rng() - 0.5) * 0.5), { over: 0, ...o });
  }
  ellipse(cx, cy, rx, ry, o = {}) { return this.stroke(ellipsePts(cx, cy, rx, ry, o.a0 ?? 0, o.a1 ?? Math.PI * 2.08, o.rot || 0), { over: 0, ...o }); }
  arrow(x0, y0, x1, y1, o = {}) {
    this.line(x0, y0, x1, y1, o);
    const a = Math.atan2(y1 - y0, x1 - x0), hl = o.head || 18;
    this.stroke([[x1 - Math.cos(a - 0.45) * hl, y1 - Math.sin(a - 0.45) * hl], [x1, y1], [x1 - Math.cos(a + 0.45) * hl, y1 - Math.sin(a + 0.45) * hl]], { ...o, over: 0 });
  }
  hatch(poly, ang, sp, o = {}) {
    const segs = hatchSegs(poly, ang, sp, o.jit ?? 0.25, o.seed || this.seed());
    if (o.zig) {   // one continuous back-and-forth scribble
      const pts = [];
      segs.forEach((s, i) => { if (i % 2) pts.push(s[1], s[0]); else pts.push(s[0], s[1]); });
      if (pts.length > 1) this.stroke(pts, { passes: 1, wob: 0.8, step: 8, over: 0, ...o });
      return;
    }
    for (const s of segs) this.stroke(s, { passes: 1, wob: 0.6, ...o, weight: 20 });
  }
  scribbleFill(poly, o = {}) {  // dense graphite "black"
    this.hatch(poly, o.ang ?? 0.9, o.sp ?? 7, { zig: true, w: o.w ?? 7, a: o.a ?? 0.9, col: o.col });
    this.hatch(poly, (o.ang ?? 0.9) - 1.3, (o.sp ?? 7) * 1.2, { zig: true, w: (o.w ?? 7) * 0.9, a: (o.a ?? 0.9) * 0.9, col: o.col });
  }
  // ── marker (flat colour with streaks), revealed as a sweep ──
  marker(poly, col, o = {}) {
    const it = { kind: 'marker', poly, col, alpha: o.a ?? 0.82, ang: o.ang ?? -0.35, streak: o.streak ?? 1, seed: o.seed || this.seed(), blend: o.blend, mode: o.mode, layer: o.layer, full: o.full };
    return this.push(it, o.weight ?? 400);
  }
  rectMarker(x, y, w, h, col, o) { return this.marker([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], col, o); }
  // ── handwriting ──
  text(str, x, y, o = {}) {
    const it = { kind: 'text', str, x, y, o: { ...o }, col: o.col || COL.graph, alpha: o.a ?? 0.9, layer: o.layer || this.defaults.layer };
    return this.push(it, o.weight ?? (str.length * 14 + 10));
  }
  math(key, x, y, em, o = {}) {
    const it = { kind: 'math', key, x, y, em, o, col: o.col || COL.graph, alpha: o.a ?? 0.92, seed: o.seed || this.seed() };
    if (!window.F5[key]) console.warn('missing formula', key);
    return this.push(it, o.weight ?? (window.F5[key] ? window.F5[key].g.length * 16 : 50));
  }
  strike(x0, y0, x1, y1, o = {}) {   // hand crossing-out: zigzag
    const rng = mulberry32(o.seed || this.seed());
    const pts = [], n = Math.max(4, Math.round((x1 - x0) / 18));
    for (let i = 0; i <= n; i++) pts.push([x0 + (x1 - x0) * i / n + (rng() - 0.5) * 6, (i % 2 ? y0 : y1) + (rng() - 0.5) * 5]);
    return this.stroke(pts, { passes: 1, w: 2.4, wob: 0.6, over: 2, col: COL.graph, ...o });
  }
  // ── custom / paste-up ──
  custom(fn, o = {}) { return this.push({ kind: 'custom', fn, layer: o.layer || 'pencil', alpha: 1 }, o.weight ?? 100); }
  paste(fn, o = {}) { const it = this.push({ kind: 'custom', fn, layer: 'paste', alpha: 1 }, o.weight ?? 50); if (fn.win || o.cred) it.cred = fn.win || o.cred; return it; }
}

// ── rendering of items ───────────────────────────────────────────────────────
function itemProgress(it, lt) { return it.t1 <= it.t0 ? (lt >= it.t0 ? 1 : 0) : clamp((lt - it.t0) / (it.t1 - it.t0)); }

function wobblePoly(poly, seed, amp = 2.6, step = 22) {
  const out = [];
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(l / step));
    const nx = -(b[1] - a[1]) / (l || 1), ny = (b[0] - a[0]) / (l || 1);
    for (let k = 0; k < n; k++) {
      const u = k / n, d = amp * noise1(s / 60, seed) + amp * 0.35 * noise1(s / 13, seed + 5);
      out.push([a[0] + (b[0] - a[0]) * u + nx * d, a[1] + (b[1] - a[1]) * u + ny * d]);
      s += l / n;
    }
  }
  return out;
}
// Marker rendering modes (storyboard look: graphite first, colour as sparse accents)
//  'wash'     large areas / full-panel BGs  -> coloured-pencil hatching over a faint tint
//  'graphite' dark silhouettes              -> dense pencil tone (hatch + cross-hatch)
//  'accent'   small colour shapes           -> alcohol-marker fill with streaks (spot colour)
//  'solid'    explicit (inked finals, e.g. the logo)
const PAT = {};
const WASH_K = 0.9;
function hexLum(hex) { if (!hex || hex[0] !== '#') return 0.5; const n = parseInt(hex.slice(1, 7), 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; }
const HMASK = {};
function hatchMask(kind) {
  // one alpha mask per kind (hand hatching: clusters of near-parallel strokes); colourised per colour below
  if (HMASK[kind]) return HMASK[kind];
  const S = 384, c = mkCanvas(S, S), g = c.getContext('2d', CTX_OPT);
  const rng = mulberry32(strSeed('hatch|' + kind));
  g.strokeStyle = '#000'; g.lineCap = 'round';
  const dense = kind === 'graphite';
  const nc = dense ? 280 : 150;
  const buckets = new Map();      // batch strokes by (alpha, width) so the tile costs a few dozen stroke() calls
  for (let q = 0; q < nc; q++) {
    const cx = rng() * S, cy = rng() * S;
    const ang = -0.95 + (rng() - 0.5) * 0.28 + (dense && q % 3 === 0 ? 1.35 : 0);
    const len = 40 + rng() * 60, k = 6 + Math.floor(rng() * 5), sp = 3.0 + rng() * 2.0;
    const ca = Math.cos(ang), sa = Math.sin(ang), aBase = dense ? 0.32 + rng() * 0.3 : 0.16 + rng() * 0.26;
    for (let j = 0; j < k; j++) {
      const off = (j - k / 2) * sp, sh = (rng() - 0.5) * 14, l2 = len * (0.7 + rng() * 0.4);
      const x0 = cx - sa * off + ca * sh, y0 = cy + ca * off + sa * sh;
      const al = Math.round(aBase * (0.75 + rng() * 0.3) * 10) / 10;
      const lw = Math.round((1.0 + rng() * (dense ? 1.9 : 1.4)) * 2) / 2;
      const key = al + '|' + lw;
      if (!buckets.has(key)) buckets.set(key, new Path2D());
      const P = buckets.get(key);
      const dx = ca * l2, dy = sa * l2, bow = (rng() - 0.5) * 5;
      const bx0 = Math.min(x0, x0 + dx) - 4, bx1 = Math.max(x0, x0 + dx) + 4, by0 = Math.min(y0, y0 + dy) - 4, by1 = Math.max(y0, y0 + dy) + 4;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        if (bx1 + ox < 0 || bx0 + ox > S || by1 + oy < 0 || by0 + oy > S) continue;
        P.moveTo(x0 + ox, y0 + oy); P.quadraticCurveTo(x0 + dx / 2 + ox - sa * bow, y0 + dy / 2 + oy + ca * bow, x0 + dx + ox, y0 + dy + oy);
      }
    }
  }
  for (const [key, P] of buckets) { const [al, lw] = key.split('|').map(Number); g.globalAlpha = al; g.lineWidth = lw; g.stroke(P); }
  HMASK[kind] = c;
  return c;
}
function hatchTile(col, kind) {
  const key = col + '|' + kind;
  if (PAT[key]) return PAT[key];
  const m = hatchMask(kind), c = mkCanvas(m.width, m.height), g = c.getContext('2d', CTX_OPT);
  g.drawImage(m, 0, 0);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  PAT[key] = c;
  return c;
}
function markerMode(it) {
  if (it.mode) return it.mode;
  if (it.col === '#ffffff') return 'white';
  const [x0, y0, x1, y1] = it.bb;
  const area = (x1 - x0) * (y1 - y0);
  const lum = hexLum(it.col);
  if (lum < 0.24) return 'graphite';
  if (it.poly === FULL || area > 0.05 * 1440 * 1080) return 'wash';
  if (lum > 0.86) return 'accent';
  return 'accent';
}
function drawMarker(ctx, it, p) {
  if (p <= 0) return;
  ctx.save();
  const rng = mulberry32(it.seed);
  if (!it.path) {
    let src = it.poly;
    // a full-frame BG tone is laid in loosely by hand: a ragged patch that leaves paper at the edges
    if (it.poly === FULL && !it.full && hexLum(it.col) >= 0.24) {
      const r2 = mulberry32(it.seed + 3);
      src = blob(720 + (r2() - 0.5) * 120, 540 + (r2() - 0.5) * 80, 800 + r2() * 90, 590 + r2() * 60, it.seed % 9973, 0.16, 44, (r2() - 0.5) * 0.3);
    }
    const wp = it.col === '#ffffff' || src.length > 60 ? src : wobblePoly(src, it.seed % 997);
    it.path = new Path2D();
    wp.forEach(([x, y], i) => (i ? it.path.lineTo(x, y) : it.path.moveTo(x, y)));
    it.path.closePath();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of it.poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    it.bb = [x0, y0, x1, y1];
    it.mode = markerMode(it);
    if (src !== it.poly && it.mode === 'graphite') { it.path = new Path2D(); it.poly.forEach(([x, y], i) => (i ? it.path.lineTo(x, y) : it.path.moveTo(x, y))); it.path.closePath(); }
  }
  const path = it.path, [x0, y0, x1, y1] = it.bb;
  if (p < 1) { ctx.beginPath(); ctx.rect(x0 - 20, y0 - 20, (x1 - x0 + 40) * p, y1 - y0 + 40); ctx.clip(); }
  const ga = ctx.globalAlpha * it.alpha;
  if (it.mode === 'white') { ctx.globalAlpha = ga; ctx.fillStyle = '#ffffff'; ctx.fill(path); ctx.restore(); return; }
  if (it.mode === 'wash' || it.mode === 'graphite') {
    const dense = it.mode === 'graphite';
    // WASH_K: overall strength of coloured-pencil BG tone (kept light so graphite line work dominates)
    ctx.globalAlpha = ga * (dense ? 0.42 : 0.15 * WASH_K);
    ctx.fillStyle = it.col; ctx.fill(path);
    const pat = ctx.createPattern(hatchTile(it.col, it.mode), 'repeat');
    const ang = ((it.seed % 7) - 3) * 3 + (it.ang || 0) * 8;
    pat.setTransform(new DOMMatrix().rotateSelf(ang));
    ctx.globalAlpha = Math.min(1, ga * (dense ? 1.05 : 0.8 * WASH_K));
    ctx.fillStyle = pat; ctx.fill(path);
    if (dense) { ctx.globalAlpha = ga * 0.25; ctx.lineWidth = 3; ctx.strokeStyle = it.col; ctx.stroke(path); }
    ctx.restore();
    return;
  }
  const acc = it.mode === 'accent' ? 0.78 : 1;
  ctx.globalAlpha = ga * acc;
  const g2 = ctx.globalAlpha;
  ctx.fillStyle = it.col;
  ctx.fill(path);
  // ink pooling at the edge
  if (it.streak) { ctx.lineWidth = 5; ctx.strokeStyle = it.col; ctx.globalAlpha = g2 * 0.28; ctx.stroke(path); }
  ctx.clip(path);
  // marker passes: parallel strokes that overlap a little -> darker seams
  if (it.streak) {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 20;
    ctx.translate(cx, cy); ctx.rotate(it.ang);
    ctx.globalAlpha = g2 * 0.16 * it.streak;
    for (let y = -R; y < R;) {
      const bw = 22 + rng() * 20;
      ctx.fillRect(-R + rng() * 30 - 15, y, 2 * R, bw + 5);
      y += bw;
    }
  }
  ctx.restore();
}

function drawHand(ctx, it, p, lt) {
  const o = it.o;
  if (!it.lay) it.lay = layoutHand(ctx, it.str, o);
  const lay = it.lay, n = lay.chars.length;
  const shown = p * n;
  if (shown <= 0) return;
  ctx.save();
  ctx.font = lay.fontStr;
  ctx.fillStyle = it.col;
  ctx.textBaseline = 'alphabetic';
  let x0 = it.x;
  if (o.align === 'center') x0 -= lay.width / 2; else if (o.align === 'right') x0 -= lay.width;
  const vert = !!o.vert;
  for (let i = 0; i < n; i++) {
    if (i >= shown) break;
    const c = lay.chars[i];
    const partial = clamp(shown - i);
    ctx.save();
    const cx = vert ? it.x : x0 + c.x, cy = vert ? it.y + i * lay.size * 1.05 : it.y + c.dy;
    ctx.translate(cx, cy); ctx.rotate(c.rot + (o.rot || 0)); ctx.scale(c.sc * (o.sx || 1), c.sc);
    ctx.globalAlpha = it.alpha * (0.35 + 0.65 * partial);
    if (partial < 1) { ctx.beginPath(); ctx.rect(-2, -lay.size * 1.2, (c.a + 4) * partial / (o.sx || 1), lay.size * 1.6); ctx.clip(); }
    ctx.fillText(c.ch, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function drawMath(ctx, it, p) {
  const f = window.F5[it.key];
  if (!f || p <= 0) return;
  const k = it.em / 1000, vb = f.vb;
  const rng = mulberry32(it.seed);
  const n = f.g.length + f.r.length;
  const shown = p * n;
  const jit = it.o.jit ?? 1;
  ctx.save();
  ctx.fillStyle = it.col;
  const base = ctx.getTransform();
  let x0 = it.x;
  if (it.o.align === 'center') x0 -= vb[2] * k / 2; else if (it.o.align === 'right') x0 -= vb[2] * k;
  const hand = it.o.hand !== false;
  let idx = 0;
  const slant = -0.12;
  // interleave rules (fraction bars) by x position into the glyph order
  const order = [];
  f.g.forEach((g, i) => order.push({ t: 'g', g, x: g.m[0] * g.b[0] + g.m[4] }));
  f.r.forEach((r, ri) => order.push({ t: 'r', r, ri, x: r[0] + 1 }));
  order.sort((a, b) => a.x - b.x);
  for (const e of order) {
    const jr = (rng() - 0.5) * 0.09 * jit, jx = (rng() - 0.5) * 18 * jit, jy = (rng() - 0.5) * 22 * jit, js = 1 + (rng() - 0.5) * 0.08 * jit;
    if (idx >= shown) break;
    const vis = clamp(shown - idx);
    idx++;
    ctx.globalAlpha = it.alpha * (0.3 + 0.7 * vis);
    if (e.t === 'r') {
      ctx.setTransform(base);
      const [rx, ry, rw, rh] = e.r;
      const X = x0 + (rx - vb[0]) * k, Y = it.y + (ry + rh / 2) * k;
      // per-item cache (the rule list is shared by every item that uses this formula)
      const rs = it.rst || (it.rst = {});
      if (!rs[e.ri]) rs[e.ri] = buildStroke([[X, Y + jy * k * 0.3], [X + rw * k, Y - jy * k * 0.3]], { seed: it.seed + idx, w: Math.max(1.5, rh * k * 1.1), wob: 0.5, passes: 1, over: 3 });
      drawStroke(ctx, rs[e.ri], vis, it.col, it.alpha);
      continue;
    }
    const g = e.g;
    const bw = g.b[2] - g.b[0], bh = g.b[3] - g.b[1];
    const em = 1000 * Math.abs(g.m[0]);
    const ch = MATH_MAP[g.c];
    const big = bh * Math.abs(g.m[3]) > 1250;
    if (hand && ch && !big) {
      const cxp = (g.b[0] + g.b[2]) / 2;
      const X = x0 + (g.m[0] * cxp + g.m[4] - vb[0]) * k + jx * k;
      const Y = it.y + (g.m[5]) * k + jy * k * 0.5;
      const size = em * k * 0.98 * js;
      ctx.setTransform(base);
      ctx.translate(X, Y); ctx.rotate(jr); ctx.transform(1, 0, slant, 1, 0, 0);
      ctx.font = `600 ${size.toFixed(1)}px ${FONT.klee}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(ch, 0, 0);
    } else {
      let P = GLYPH_PATH[g.d];
      if (!P) P = GLYPH_PATH[g.d] = new Path2D(g.d);
      const cx = (g.b[0] + g.b[2]) / 2, cy = (g.b[1] + g.b[3]) / 2;
      ctx.setTransform(base);
      ctx.translate(x0 - vb[0] * k, it.y);
      ctx.scale(k, k);
      ctx.transform(g.m[0], g.m[1], g.m[2], g.m[3], g.m[4] + jx, g.m[5] + jy * 0.5);
      ctx.translate(cx, cy); ctx.rotate(jr); ctx.scale(js, js); ctx.translate(-cx, -cy);
      ctx.fill(P);
      // soften the printed edge with a thin outline pass
      ctx.lineWidth = 18; ctx.strokeStyle = it.col; ctx.globalAlpha *= 0.35; ctx.stroke(P);
    }
  }
  ctx.restore();
}

// render a list of items for local time lt into the given contexts
function renderItems(items, lt, ctxs, mats, layerFilter) {
  for (const it of items) {
    if (lt < it.t0) continue;
    const layer = it.layer || (it.kind === 'marker' ? 'marker' : 'pencil');
    if (layerFilter && layer !== layerFilter) continue;
    const ctx = layer === 'marker' ? ctxs.marker : layer === 'paste' ? ctxs.paste : layer === 'top' ? ctxs.paste : ctxs.pencil;
    const p = itemProgress(it, lt);
    const M = it.space === 'panel' ? mats.panel : mats.sheet;
    ctx.save();
    ctx.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
    if (it.space === 'panel') { ctx.beginPath(); ctx.rect(0, 0, 1440, 1080); ctx.clip(); }
    let ga = 1;
    if (it.grp) {
      const g = it.grp;
      if (g.m) { const m = g.m(lt); if (m) ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]); }
      if (g.alpha) ga = g.alpha(lt);
      if (ga <= 0) { ctx.restore(); continue; }
    }
    ctx.globalAlpha = ga;
    switch (it.kind) {
      case 'stroke': drawStroke(ctx, it.st, p, it.col, it.alpha * ga); break;
      case 'marker': ctx.globalAlpha = ga; drawMarker(ctx, it, p); break;
      case 'text': it.alpha0 = it.alpha0 ?? it.alpha; it.alpha = it.alpha0 * ga; drawHand(ctx, it, p, lt); break;
      case 'math': it.alpha0 = it.alpha0 ?? it.alpha; it.alpha = it.alpha0 * ga; drawMath(ctx, it, p); break;
      case 'custom': it.fn(ctx, p, lt, ga); break;
    }
    ctx.restore();
  }
}

// ── 写植 paste-up credits (typeset heavy mincho) ─────────────────────────────
// lines: [{s, x, y, size, role?, align?, sx?}] in panel units; o.col, o.alpha.
// Dark type is set on cut strips of white photo paper pasted onto the board (slight tilt, thin shadow);
// light type (on the black cards) is printed straight on.
const INK = '#141215';
function credit(ctx, lines, o = {}) {
  const col = o.col || INK;
  const strip = o.strip ?? hexLum(col) < 0.3;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  for (const L2 of lines) {
    const fam = L2.fam || (L2.role ? FONT.minchoN : FONT.mincho);
    const wt = L2.w || (L2.role ? 900 : 800);
    ctx.font = `${wt} ${L2.size}px ${fam}`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = L2.align || 'left';
    const sx = L2.sx ?? 0.86;
    const hs = strSeed(L2.s + L2.x + L2.y);
    const rot = ((hs % 1000) / 1000 - 0.5) * 0.014;
    if (strip) {
      let bx, by, bw, bh;
      const pad = L2.size * 0.2;
      if (L2.vert) {
        const n = [...L2.s].length;
        bw = L2.size * sx + pad * 2; bh = n * L2.size * (L2.lh || 1.02) + pad * 1.2;
        bx = L2.x - bw / 2; by = L2.y - L2.size * 0.92 - pad * 0.4;
      } else {
        if (L2.ls) ctx.letterSpacing = L2.ls + 'px';
        const tw = ctx.measureText(L2.s).width * sx;
        ctx.letterSpacing = '0px';
        const al = L2.align || 'left';
        const x0 = al === 'center' ? L2.x - tw / 2 : al === 'right' ? L2.x - tw : L2.x;
        bx = x0 - pad; by = L2.y - L2.size * 0.9 - pad * 0.5; bw = tw + pad * 2; bh = L2.size * 1.12 + pad;
      }
      ctx.save();
      ctx.translate(bx + bw / 2, by + bh / 2); ctx.rotate(rot); ctx.translate(-bx - bw / 2, -by - bh / 2);
      const a0 = ctx.globalAlpha;
      ctx.fillStyle = 'rgba(50,38,26,1)'; ctx.globalAlpha = a0 * 0.2; ctx.fillRect(bx + 3, by + 4, bw, bh);
      ctx.globalAlpha = a0; ctx.fillStyle = '#fbfaf6'; ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = 'rgba(80,70,60,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
      ctx.restore();
    }
    if (L2.vert) {
      [...L2.s].forEach((ch, i) => {
        ctx.save(); ctx.translate(L2.x, L2.y + i * L2.size * (L2.lh || 1.02)); ctx.scale(sx, 1);
        ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.fillText(ch, 0, 0); ctx.restore();
      });
      continue;
    }
    ctx.save(); ctx.translate(L2.x, L2.y); if (strip) ctx.rotate(rot); ctx.scale(sx, 1);
    if (L2.ls) ctx.letterSpacing = L2.ls + 'px';
    if (o.halo && !strip) { ctx.lineJoin = 'round'; ctx.lineWidth = L2.size * 0.16; ctx.strokeStyle = o.halo; ctx.strokeText(L2.s, 0, 0); }
    ctx.fillStyle = col; ctx.fillText(L2.s, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

// ── post: grain + vignette + flash (screen space) ────────────────────────────
function post(ctx, f, fx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.drawImage(VIGN, 0, 0);
  const gi = Math.floor(hash1(f * 3 + 1) * 4), ox = Math.floor(hash1(f * 5 + 2) * 60), oy = Math.floor(hash1(f * 7 + 3) * 60);
  ctx.globalAlpha = fx.grain ?? 0.05;
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(GRAIN[gi], -ox, -oy, W + 120, H + 120);
  ctx.globalCompositeOperation = 'source-over';
  if (fx.black > 0) { ctx.globalAlpha = clamp(fx.black); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
  if (fx.flash > 0) { ctx.globalAlpha = clamp(fx.flash); ctx.fillStyle = fx.flashCol || '#fff'; ctx.fillRect(0, 0, W, H); }
  ctx.globalAlpha = 1;
}
