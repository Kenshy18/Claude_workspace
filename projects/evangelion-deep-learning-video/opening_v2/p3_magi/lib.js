// ─────────────────────────────────────────────────────────────────────────────
//  p3_magi drawing kit: run data access, film-time→step map, phosphor palette,
//  7-segment digits, CRT plots, flat silhouettes, credits, text cards.
// ─────────────────────────────────────────────────────────────────────────────
const RUN = window.RUN;
const NLOG = RUN.steps.length;          // 601 points, every 50 steps
const DSTEP = 50;

// ── palette: CRT phosphors on black + flat cel colours ───────────────────────
const P = {
  black: '#050605', crt: '#070a08', amber: '#ffae1a', amberDim: '#7a4a08', orange: '#ff7412', orangeDim: '#6a2a06',
  green: '#39f07a', greenDim: '#0f5a2a', mint: '#3dffb4', red: '#ff2a1c', redDim: '#5a0a08', redField: '#c4000e',
  yellow: '#ffd21a', blueLine: '#cfe4ff', blueField: '#0a2466', blueDeep: '#061640', cyan: '#8fd8ff',
  white: '#f7f5ef', paper: '#ecebe4', pink: '#f2c9cf', ink: '#1b1a1d', grey: '#9aa0a0',
};
const MINCHO = '"Noto Serif CJK JP"';
const COND = '"Roboto Condensed", "Liberation Sans", sans-serif';
const MONO = '"Share Tech Mono", "JetBrains Mono", monospace';
const LOGF = '"JetBrains Mono", monospace';

// ── run data access ─────────────────────────────────────────────────────────
function mAt(key, step, logscale = false) {
  const a = RUN[key];
  const x = clamp(step, 0, RUN.steps[NLOG - 1]) / DSTEP;
  const i = Math.min(NLOG - 2, Math.floor(x)), f = x - i;
  if (logscale) {
    const l0 = Math.log(Math.max(a[i], 1e-5)), l1 = Math.log(Math.max(a[i + 1], 1e-5));
    return Math.exp(lerp(l0, l1, f));
  }
  return lerp(a[i], a[i + 1], f);
}
const SNAP = RUN.snap;                  // every 250 steps
function snapIdx(step) { return clamp(step, 0, SNAP[SNAP.length - 1]) / 250; }
function fourierAt(step) {
  const x = snapIdx(step), i = Math.min(SNAP.length - 2, Math.floor(x)), f = x - i;
  const A = RUN.fourier[i], B = RUN.fourier[i + 1], out = new Array(48);
  for (let k = 0; k < 48; k++) out[k] = lerp(A[k], B[k], f);
  return out;
}
/** emb2d at a step: linear between snapshots that share the same dominant plane; hard switch otherwise. */
function embAt(step) {
  const x = snapIdx(step), i = Math.min(SNAP.length - 2, Math.floor(x)), f = x - i;
  const kA = RUN.domk[i], kB = RUN.domk[i + 1];
  if (kA !== kB) { const j = f < 0.5 ? i : i + 1; return { pts: RUN.emb2d[j], k: RUN.domk[j], cv: RUN.cv[j] }; }
  const A = RUN.emb2d[i], B = RUN.emb2d[i + 1], pts = new Array(97);
  for (let n = 0; n < 97; n++) pts[n] = [lerp(A[n][0], B[n][0], f), lerp(A[n][1], B[n][1], f)];
  return { pts, k: kA, cv: lerp(RUN.cv[i], RUN.cv[i + 1], f) };
}
function keyShareAt(step) { const x = snapIdx(step), i = Math.min(SNAP.length - 2, Math.floor(x)); return lerp(RUN.key_share[i], RUN.key_share[i + 1], x - i); }

// ── film time → training step (monotone cubic through story keyframes) ─────
// keyframes: lyric/section boundaries ↔ events in the log (see NOTES.md)
const TK = [
  [0, 0], [23.4, 0], [26.3, 60], [29.9, 170], [33.4, 250], [37.9, 600],     // verse A: train acc climbs, locks at step 250
  [44.9, RUN.VPEAK[0]],                                                      // 'unmei sae mada shiranai' = val-loss peak (memorization)
  [51.9, 3000], [66.8, RUN.G0],                                              // pre-chorus plateau → val loss < ln 97 exactly at 66.8
  [67.4, 13000], [68.1, 14000], [72.0, 17000], [80.0, 22000], [86.1, 30000], [90.5, 30000],
];
const TK_M = (() => {   // Fritsch–Carlson slopes
  const n = TK.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((TK[i + 1][1] - TK[i][1]) / (TK[i + 1][0] - TK[i][0]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  return m;
})();
function stepAt(t) {
  if (t <= TK[0][0]) return TK[0][1];
  for (let i = 0; i < TK.length - 1; i++) {
    const [t0, s0] = TK[i], [t1, s1] = TK[i + 1];
    if (t <= t1) {
      const h = t1 - t0, u = (t - t0) / h, u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * s0 + (u3 - 2 * u2 + u) * h * TK_M[i] + (-2 * u3 + 3 * u2) * s1 + (u3 - u2) * h * TK_M[i + 1];
    }
  }
  return TK[TK.length - 1][1];
}
/** wall-clock seconds grokking.py still needs (at the measured ms/step) to reach G0 (val loss < ln 97) */
function timerSecs(step) { return Math.max(0, RUN.G0 - step) * RUN.ms_per_step / 1000; }
function fmtTimer(sec) {        // M:SS:CC  like 4:59:56
  const cs = Math.floor(sec * 100 + 1e-6), m = Math.floor(cs / 6000), s = Math.floor(cs / 100) % 60, c = cs % 100;
  return `${m}:${pad(s)}:${pad(c)}`;
}
const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
const pct = (x, d = 1) => (x * 100).toFixed(d) + '%';

// ── offscreen canvases (reused) ──────────────────────────────────────────────
const OFF = {};
function off(key, w, h) {
  let c = OFF[key];
  if (!c || c.width !== w || c.height !== h) { c = document.createElement('canvas'); c.width = w; c.height = h; OFF[key] = c; }
  const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  return [c, g];
}

// ── basic fills ──────────────────────────────────────────────────────────────
function fill(ctx, col) { ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); }
function withT(ctx, fn) { ctx.save(); fn(); ctx.restore(); }
/** camera: scale about (cx,cy) then translate */
function cam(ctx, s, cx = W / 2, cy = H / 2, dx = 0, dy = 0, rot = 0) {
  ctx.translate(cx + dx, cy + dy); if (rot) ctx.rotate(rot); ctx.scale(s, s); ctx.translate(-cx, -cy);
}
function tx(ctx, str, x, y, o = {}) { text(ctx, str, x, y, o); }

// ── 7-segment digits (italic, like the 活動限界 display) ─────────────────────
const SEG7 = { '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '' };
function seg7(ctx, str, x, y, h, col, o = {}) {
  const w = h * 0.52, t = h * (o.thick || 0.13), sl = o.slant ?? 0.12, gap = t * 0.18;
  const ghost = o.ghost || null;
  let cx = x;
  const segPoly = (s) => {
    const hh = h / 2;
    const H_ = (x0, y0, len) => [[x0 + gap, y0], [x0 + t / 2 + gap, y0 - t / 2], [x0 + len - t / 2 - gap, y0 - t / 2], [x0 + len - gap, y0], [x0 + len - t / 2 - gap, y0 + t / 2], [x0 + t / 2 + gap, y0 + t / 2]];
    const V_ = (x0, y0, len) => [[x0, y0 + gap], [x0 + t / 2, y0 + t / 2 + gap], [x0 + t / 2, y0 + len - t / 2 - gap], [x0, y0 + len - gap], [x0 - t / 2, y0 + len - t / 2 - gap], [x0 - t / 2, y0 + t / 2 + gap]];
    switch (s) {
      case 'a': return H_(0, 0, w); case 'g': return H_(0, hh, w); case 'd': return H_(0, h, w);
      case 'f': return V_(0, 0, hh); case 'b': return V_(w, 0, hh); case 'e': return V_(0, hh, hh); case 'c': return V_(w, hh, hh);
    }
  };
  const drawSegs = (segs, color, ox) => {
    ctx.fillStyle = color;
    for (const s of segs) {
      const pts = segPoly(s);
      ctx.beginPath();
      pts.forEach(([px, py], i) => { const X = ox + px + (h - py) * sl, Y = y - h + py; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.closePath(); ctx.fill();
    }
  };
  for (const ch of str) {
    if (ch === ':' || ch === '.') {
      ctx.fillStyle = col;
      const r = t * 0.62;
      const dots = ch === ':' ? [h * 0.3, h * 0.74] : [h * 0.96];
      for (const dy of dots) { const X = cx + t * 0.6 + (h - dy) * sl, Y = y - h + dy; ctx.fillRect(X - r, Y - r, r * 2, r * 2); }
      cx += t * 2.4; continue;
    }
    if (ghost) drawSegs('abcdefg', ghost, cx);
    drawSegs(SEG7[ch] || '', col, cx);
    cx += w + h * (o.space ?? 0.2);
  }
  return cx - x;
}

// ── plotting on a phosphor screen ───────────────────────────────────────────
/** map fns for a plot rect; x in steps (linear), y linear or log10 */
function plotMap(x, y, w, h, o) {
  const lx = !!o.logx, ly = !!o.logy;
  const fx = (v) => lx ? (Math.log10(Math.max(v, o.x0)) - Math.log10(o.x0)) / (Math.log10(o.x1) - Math.log10(o.x0)) : (v - o.x0) / (o.x1 - o.x0);
  const fy = (v) => ly ? (Math.log10(Math.max(v, o.y0)) - Math.log10(o.y0)) / (Math.log10(o.y1) - Math.log10(o.y0)) : (v - o.y0) / (o.y1 - o.y0);
  return { X: (v) => x + fx(v) * w, Y: (v) => y + h - fy(v) * h };
}
/** polyline of a logged metric from step s0 to s1 (inclusive), interpolated end point */
function plotMetric(ctx, M, key, s0, s1, col, lw = 3, logv = false, floor = 0) {
  if (s1 <= s0) return;
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  const a = RUN[key];
  const i0 = Math.max(0, Math.floor(s0 / DSTEP)), i1 = Math.min(NLOG - 1, Math.floor(s1 / DSTEP));
  let first = true;
  const put = (s, v) => { const X = M.X(s), Y = M.Y(Math.max(v, floor)); if (first) { ctx.moveTo(X, Y); first = false; } else ctx.lineTo(X, Y); };
  put(s0, mAt(key, s0, logv));
  for (let i = i0 + 1; i <= i1; i++) put(RUN.steps[i], a[i]);
  put(s1, mAt(key, s1, logv));
  ctx.stroke(); ctx.restore();
}
function gridLines(ctx, x, y, w, h, nx, ny, col, lw = 1, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
  for (let i = 0; i <= nx; i++) { const X = Math.round(x + (w * i) / nx) + 0.5; ctx.moveTo(X, y); ctx.lineTo(X, y + h); }
  for (let j = 0; j <= ny; j++) { const Y = Math.round(y + (h * j) / ny) + 0.5; ctx.moveTo(x, Y); ctx.lineTo(x + w, Y); }
  ctx.stroke(); ctx.restore();
}
function dashed(ctx, x1, y1, x2, y2, col, lw = 1.5, dash = [8, 6]) {
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}

// ── embedding scope (emb2d) ──────────────────────────────────────────────────
/** draws the 97 points; star=true connects residue n → n+1 (on a Fourier plane this is the star polygon {97/k}) */
function drawEmb(ctx, cx, cy, R, step, o = {}) {
  const e = o.emb || embAt(step);
  const col = o.color || P.green;
  const rot = o.rot || 0;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const pt = (p) => [cx + (p[0] * cs - p[1] * sn) * R, cy - (p[0] * sn + p[1] * cs) * R];
  if (o.star) {
    ctx.save(); ctx.strokeStyle = o.starColor || col; ctx.globalAlpha *= o.starAlpha ?? 0.35; ctx.lineWidth = o.starW || 1.2; ctx.beginPath();
    const n = Math.floor(97 * (o.starP ?? 1));
    for (let i = 0; i <= n; i++) { const q = pt(e.pts[i % 97]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
    ctx.stroke(); ctx.restore();
  }
  ctx.save(); ctx.fillStyle = col;
  const r = o.dot || 5;
  for (let i = 0; i < 97; i++) { const q = pt(e.pts[i]); ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, Math.PI * 2); ctx.fill(); }
  if (o.labels) {
    for (let i = 0; i < 97; i += o.labels) { const q = pt(e.pts[i]); const a = Math.atan2(q[1] - cy, q[0] - cx);
      tx(ctx, String(i), q[0] + Math.cos(a) * 22, q[1] + Math.sin(a) * 22 + 6, { size: o.labelSize || 16, family: MONO, weight: 400, color: o.labelColor || col, align: 'center' }); }
  }
  ctx.restore();
  return e;
}

// ── flat black silhouettes (SVG path data → Path2D) ──────────────────────────
const SIL = {
  // operator from behind, seated (box 200×300)
  opA: new Path2D('M100,20 C126,20 142,42 142,70 C142,96 130,108 118,114 L120,128 C152,134 180,150 188,178 L198,300 L2,300 L12,178 C20,150 48,134 80,128 L82,114 C70,108 58,96 58,70 C58,42 74,20 100,20 Z M50,58 C50,52 60,48 62,54 L64,86 C62,94 52,92 50,86 Z M150,58 C150,52 140,48 138,54 L136,86 C138,94 148,92 150,86 Z M56,56 C60,8 140,8 144,56 L138,56 C134,18 66,18 62,56 Z'),
  // bob hair
  opB: new Path2D('M100,14 C134,14 150,40 150,72 C150,98 146,112 136,120 L124,122 L124,130 C154,136 178,152 186,178 L196,300 L4,300 L14,178 C22,152 46,136 76,130 L76,122 L64,120 C54,112 50,98 50,72 C50,40 66,14 100,14 Z'),
  // long hair tied back
  opC: new Path2D('M98,22 C124,22 140,44 140,72 C140,94 130,106 120,112 L122,126 C150,132 176,148 184,176 L194,300 L6,300 L14,176 C22,150 46,134 76,128 L78,112 C66,104 58,92 58,72 C58,46 72,22 98,22 Z M112,100 C130,120 134,160 126,210 L112,208 C116,170 112,130 100,110 Z'),
  // hand reaching in from the upper right (box 640×440)
  hand: new Path2D('M640,18 C560,70 480,130 420,170 C380,196 340,226 300,248 C262,270 214,300 178,326 C164,336 158,348 166,354 C174,360 188,354 200,346 C230,326 262,306 288,292 C258,314 222,338 190,358 C176,368 172,380 182,384 C192,388 206,380 218,372 C248,352 276,334 300,320 C276,338 246,358 226,372 C214,382 214,392 224,394 C234,396 248,388 258,380 C282,364 302,350 320,340 C300,356 280,370 268,382 C258,392 260,402 270,402 C280,402 294,394 304,386 C322,372 338,362 350,356 C380,344 410,334 432,324 C500,296 570,256 640,214 Z'),
  // woman in profile, looking right, long hair (box 400×600)
  profile: new Path2D('M150,70 C200,30 292,50 306,130 C311,150 307,160 300,168 C302,190 306,206 318,236 L324,252 C316,258 308,260 303,263 C307,272 305,280 299,286 C303,292 301,300 295,305 C293,318 285,330 269,336 C257,340 246,343 240,352 L242,400 C300,420 360,462 382,600 L0,600 C10,540 20,470 40,420 C60,360 50,280 70,200 C84,140 110,96 150,70 Z'),
  // operator head in profile with headset (box 400×600)
  headset: new Path2D('M180,70 C240,56 290,96 296,160 C298,186 304,208 320,240 L324,252 C316,258 308,260 304,262 C308,272 306,280 300,286 C304,292 302,300 296,305 C294,318 286,330 270,336 C258,340 246,343 240,352 L242,400 C302,420 360,462 382,600 L40,600 C60,520 76,470 88,420 C100,370 86,300 96,220 C104,140 130,82 180,70 Z'),
  // commander at the desk, hands folded before the face (box 600×520)
  gendo: new Path2D('M300,62 C344,62 366,96 366,146 C366,160 372,150 376,160 C380,176 370,190 362,192 C356,214 344,228 330,236 L330,244 C400,252 470,270 520,310 C560,344 576,400 590,470 L600,520 L0,520 L10,470 C24,400 40,344 80,310 C130,270 200,252 270,244 L270,236 C256,228 244,214 238,192 C230,190 220,176 224,160 C228,150 234,160 234,146 C234,96 256,62 300,62 Z'),
  gendoHands: new Path2D('M222,236 C222,206 248,186 270,186 C280,178 320,178 330,186 C352,186 378,206 378,236 C378,262 362,284 340,290 L260,290 C238,284 222,262 222,236 Z M230,262 L120,470 L190,480 L276,290 Z M370,262 L480,470 L410,480 L324,290 Z'),
  // standing figure, arms spread (box 400×520)
  spread: new Path2D('M200,8 C216,8 228,22 228,42 C228,58 222,70 214,76 L214,90 C232,94 246,98 262,106 L392,150 L394,164 L262,132 C258,170 256,210 252,250 L246,330 L244,420 L240,510 L220,512 L208,340 L200,330 L192,340 L180,512 L160,510 L156,420 L154,330 L148,250 C144,210 142,170 138,132 L6,164 L8,150 L138,106 C154,98 168,94 186,90 L186,76 C178,70 172,58 172,42 C172,22 184,8 200,8 Z'),
  // slender standing figure (box 160×520)
  stand: new Path2D('M80,8 C96,8 108,22 108,42 C108,58 102,70 94,76 L94,90 C112,94 126,100 132,114 C138,150 142,200 146,250 C148,266 142,272 138,262 L130,200 L126,160 C122,190 120,220 118,250 L114,330 L112,420 L110,510 L90,512 L86,340 L82,330 L78,340 L74,512 L54,510 L52,420 L50,330 L46,250 C44,220 42,190 38,160 L34,200 L26,262 C22,272 16,266 18,250 C22,200 26,150 32,114 C38,100 52,94 70,90 L70,76 C62,70 56,58 56,42 C56,22 64,8 80,8 Z'),
};
function sil(ctx, key, x, y, s, col = '#000', o = {}) {
  ctx.save(); ctx.translate(x, y); if (o.flip) ctx.scale(-1, 1); ctx.scale(s, s); if (o.rot) ctx.rotate(o.rot);
  ctx.fillStyle = col; if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha; ctx.fill(SIL[key]); ctx.restore();
}

// ── credits: small role / big name, white heavy mincho, compressed ~0.86 ─────
const CRED_SX = 0.86;
function credText(ctx, s, x, y, size, o = {}) {
  text(ctx, s, x, y, { size, family: o.family || MINCHO, weight: o.weight ?? 900, color: o.color || P.white, align: o.align || 'left', sx: o.sx ?? CRED_SX, alpha: o.alpha, ls: o.ls || 0 });
}
/** role (small) left of the first name; names stacked. anchor: x = left edge of names, y = baseline of first name */
function credit(ctx, role, names, x, y, o = {}) {
  const ns = o.nameSize || 78, rs = o.roleSize || 38, lh = o.lh || ns * 1.24, a = o.alpha ?? 1;
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    roles.forEach((r, i) => credText(ctx, r, x - (o.gap ?? 26), y - ns * 0.1 + i * lh, rs, { align: 'right' }));
  }
  names.forEach((n, i) => {
    if (typeof n === 'string') credText(ctx, n, x, y + i * lh, ns, { ls: o.ls });
    else credText(ctx, n.s, x + (n.dx || 0), y + i * lh + (n.dy || 0), n.size || ns, { family: n.family, weight: n.weight, sx: n.sx, ls: n.ls });
  });
  ctx.restore();
}
/** quick fade for credit in/out (2-3 frames), like an optical dissolve */
function credA(t, t0, t1, fin = 0.12, fout = 0.12) { return Math.min(seg(t, t0, t0 + fin), 1 - seg(t, t1 - fout, t1)); }

// ── chorus text cards: bold condensed grotesk ────────────────────────────────
function cardBG(ctx, bg = '#000') { fill(ctx, bg); }
function cardWord(ctx, s, x, y, size, col = P.white, o = {}) {
  text(ctx, s, x, y, { size, family: COND, weight: 700, color: col, align: o.align || 'center', sx: o.sx ?? 0.84, ls: o.ls ?? 0 });
}
/** big first letter + rest, left-aligned at x (ABSOLUTE TERROR FIELD style) */
function cardCap(ctx, first, rest, x, y, big, small, col = P.white) {
  const sx = 0.84;
  text(ctx, first, x, y, { size: big, family: COND, weight: 700, color: col, sx });
  const w = measure(ctx, first, { size: big, family: COND, weight: 700, sx });
  text(ctx, rest, x + w + big * 0.02, y, { size: small, family: COND, weight: 700, color: col, sx });
}

// ── misc drawing ─────────────────────────────────────────────────────────────
function monoText(ctx, s, x, y, size, col, o = {}) { text(ctx, s, x, y, { size, family: o.family || MONO, weight: o.weight ?? 400, color: col, align: o.align || 'left', alpha: o.alpha, ls: o.ls ?? 0, sx: o.sx }); }
function condText(ctx, s, x, y, size, col, o = {}) { text(ctx, s, x, y, { size, family: COND, weight: 700, color: col, align: o.align || 'left', alpha: o.alpha, ls: o.ls ?? 0, sx: o.sx ?? 0.9, rot: o.rot }); }
function jpText(ctx, s, x, y, size, col, o = {}) { text(ctx, s, x, y, { size, family: o.family || '"Noto Sans CJK JP"', weight: o.weight ?? 900, color: col, align: o.align || 'left', alpha: o.alpha, sx: o.sx ?? 0.9, ls: o.ls ?? 0, rot: o.rot }); }
function boxStroke(ctx, x, y, w, h, col, lw = 2) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.strokeRect(x + 0.5, y + 0.5, w, h); ctx.restore(); }
function boxFill(ctx, x, y, w, h, col, a = 1) { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = col; ctx.fillRect(x, y, w, h); ctx.restore(); }
/** diagonal warning stripes */
function hazard(ctx, x, y, w, h, c1, c2, sw = 18) { stripes(ctx, x, y, w, h, c1, c2, sw, 0); }
/** projected quad helper: p(u,v) in [0,1]² → screen via bilinear on 4 corners (for tilted panels) */
function quadMap(c) { return (u, v) => [lerp(lerp(c[0][0], c[1][0], u), lerp(c[3][0], c[2][0], u), v), lerp(lerp(c[0][1], c[1][1], u), lerp(c[3][1], c[2][1], u), v)]; }
/** soft painted cloud field (low-res value noise blown up): deterministic, for painted skies/smoke */
function cloudLayer(ctx, key, cols, seed, t, o = {}) {
  const gw = o.gw || 48, gh = o.gh || 36;
  const [c, g] = off('cl_' + key, gw, gh);
  const img = g.createImageData(gw, gh);
  const sp = o.speed || 0.05, sc = o.scale || 0.18;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const x = i * sc + t * sp, y = j * sc * 1.2 + t * sp * 0.3;
    let n = 0, amp = 0.55, fr = 1;
    for (let o2 = 0; o2 < 3; o2++) { n += amp * vnoise2(x * fr, y * fr, seed + o2 * 17); amp *= 0.5; fr *= 2.03; }
    const v = clamp((n - (o.lo ?? 0.35)) / ((o.hi ?? 0.75) - (o.lo ?? 0.35)));
    const a = cols[0], b = cols[1];
    const k = (j * gw + i) * 4;
    img.data[k] = lerp(a[0], b[0], v); img.data[k + 1] = lerp(a[1], b[1], v); img.data[k + 2] = lerp(a[2], b[2], v); img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const [c2, g2] = off('cl2_' + key, gw, gh);
  g2.filter = `blur(${o.blur ?? 1.1}px)`; g2.drawImage(c, 0, 0); g2.filter = 'none';
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(c2, 2, 2, gw - 4, gh - 4, o.x ?? -40, o.y ?? -40, o.w ?? W + 80, o.h ?? H + 80); ctx.restore();
}
function vnoise2(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (a, b) => hash2(a + seed * 131, b + seed * 71);
  const u = smooth(xf), v = smooth(yf);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}
