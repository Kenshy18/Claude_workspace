// ─────────────────────────────────────────────────────────────────────────────
//  0.0 – 23.4  : CRT warm-up, MAGI boot (red), the task as an engraving (blue),
//                the untrained embedding (blue blob), "+" cross in smoke, parody logo.
// ─────────────────────────────────────────────────────────────────────────────

// ── MAGI trinity line-art (series monitor graphic) ──────────────────────────
function magiDiagram(ctx, cx, cy, s, col, lw, o = {}) {
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'miter';
  const box = (x, y, w, h, cut) => { ctx.beginPath(); ctx.moveTo(x + cut, y); ctx.lineTo(x + w - cut, y); ctx.lineTo(x + w, y + cut); ctx.lineTo(x + w, y + h - cut); ctx.lineTo(x + w - cut, y + h); ctx.lineTo(x + cut, y + h); ctx.lineTo(x, y + h - cut); ctx.lineTo(x, y + cut); ctx.closePath(); };
  const B = [
    { n: 'CASPER·3', x: cx - 170 * s, y: cy - 330 * s, w: 340 * s, h: 190 * s },
    { n: 'BALTHASAR·2', x: cx - 470 * s, y: cy + 40 * s, w: 340 * s, h: 190 * s },
    { n: 'MELCHIOR·1', x: cx + 130 * s, y: cy + 40 * s, w: 340 * s, h: 190 * s },
  ];
  // connecting struts
  ctx.beginPath();
  ctx.moveTo(cx - 120 * s, cy - 140 * s); ctx.lineTo(cx - 250 * s, cy + 40 * s);
  ctx.moveTo(cx + 120 * s, cy - 140 * s); ctx.lineTo(cx + 250 * s, cy + 40 * s);
  ctx.moveTo(cx - 130 * s, cy + 135 * s); ctx.lineTo(cx + 130 * s, cy + 135 * s);
  ctx.stroke();
  B.forEach((b, i) => {
    box(b.x, b.y, b.w, b.h, 26 * s);
    if (o.verdict && o.verdict[i]) { ctx.save(); ctx.globalAlpha *= o.fillA ?? 1; ctx.fillStyle = o.boxFill || col; ctx.fill(); ctx.restore(); }
    ctx.stroke();
    text(ctx, b.n, b.x + b.w / 2, b.y + 40 * s, { size: 30 * s, family: COND, weight: 700, color: o.verdict && o.verdict[i] ? (o.textOn || '#000') : col, align: 'center', ls: 3 * s });
    if (o.verdict && o.verdict[i]) jpText(ctx, o.verdict[i], b.x + b.w / 2, b.y + 128 * s, 70 * s, o.textOn || '#000', { align: 'center', family: MINCHO });
    if (o.crit && o.crit[i]) text(ctx, o.crit[i], b.x + b.w / 2, b.y + b.h + 40 * s, { size: 30 * s, family: MONO, weight: 400, color: col, align: 'center' });
  });
  text(ctx, 'MAGI', cx, cy + 20 * s, { size: 64 * s, family: COND, weight: 700, color: col, align: 'center', ls: 8 * s });
  ctx.restore();
}

// ── Cayley table of (a+b) mod 97, pre-rendered once as a copper-plate engraving ──
const CAY = { cell: 30, pad: 120 };
function trainBit(a, b) { const i = a * 97 + b; return (parseInt(RUN.mask[i >> 2], 16) >> (3 - (i & 3))) & 1; }
function buildCayley(key, c, ink, holeBg, pad) {
  const N = 97, S = N * c + pad * 2;
  const [cv, g] = off(key, S, S);
  g.clearRect(0, 0, S, S);
  g.translate(pad, pad);
  g.strokeStyle = ink; g.fillStyle = ink;
  g.globalAlpha = 0.45; g.lineWidth = 1; g.beginPath();
  for (let i = 0; i <= N; i++) { g.moveTo(i * c + 0.5, 0); g.lineTo(i * c + 0.5, N * c); g.moveTo(0, i * c + 0.5); g.lineTo(N * c, i * c + 0.5); }
  g.stroke();
  // train cells: engraved hatching (the 30% the model is shown)
  g.globalAlpha = 0.8; g.lineWidth = 1.1; g.beginPath();
  for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) if (trainBit(a, b)) {
    const x = b * c, y = a * c;
    for (let k = 1; k <= 3; k++) { const o = (k * c) / 4; g.moveTo(x + o, y + 1); g.lineTo(x + 1, y + o); g.moveTo(x + c - 1, y + c - o); g.lineTo(x + c - o, y + c - 1); }
    g.moveTo(x + c - 1, y + 1); g.lineTo(x + 1, y + c - 1);
  }
  g.stroke();
  g.globalAlpha = 1; g.font = `500 ${Math.round(c * 0.44)}px "EB Garamond"`; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
    if (trainBit(a, b)) { g.fillStyle = holeBg; g.fillRect(b * c + c * 0.23, a * c + c * 0.3, c * 0.54, c * 0.4); g.fillStyle = ink; }
    g.fillText(String((a + b) % N), b * c + c / 2, a * c + c / 2 + 1);
  }
  g.font = `italic 500 ${Math.round(c * 0.5)}px "EB Garamond"`;
  for (let i = 0; i < N; i++) { g.fillText(String(i), i * c + c / 2, -c * 0.47); g.fillText(String(i), -c * 0.6, i * c + c / 2); }
  g.font = `italic 500 ${Math.round(c * 1.13)}px "EB Garamond"`; g.fillText('b', N * c / 2, -c * 1.73); g.fillText('a', -c * 2.07, N * c / 2);
}
SHOT_INITS.push(() => { buildCayley('cayley', CAY.cell, '#d6e8ff', '#0a2466', CAY.pad); buildCayley('cayley_g', 20, '#3cff78', '#020603', 80); });
function drawCayley(ctx, x, y, s, rot = 0, key = 'cayley', pad = CAY.pad) {
  const cv = OFF[key]; if (!cv) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.drawImage(cv, -pad, -pad); ctx.restore();
}
/** engraved roundel with Latin legend */
function roundel(ctx, x, y, r, col, legend, inner) {
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2;
  ring(ctx, x, y, r, col, 2); ring(ctx, x, y, r - 38, col, 1.5); ring(ctx, x, y, r - 44, col, 1);
  ctx.font = '500 26px "EB Garamond"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const chars = [...legend]; const span = Math.min(Math.PI * 1.7, chars.length * 0.13);
  chars.forEach((ch, i) => { const a = -Math.PI / 2 - span / 2 + (span * (i + 0.5)) / chars.length; ctx.save(); ctx.translate(x + Math.cos(a) * (r - 19), y + Math.sin(a) * (r - 19)); ctx.rotate(a + Math.PI / 2); ctx.fillText(ch, 0, 0); ctx.restore(); });
  if (inner) { ctx.font = 'italic 500 40px "EB Garamond"'; ctx.fillText(inner, x, y + 4); }
  ctx.restore();
}

// ── parody logo: 新世紀 / EVALUATION / jagged katakana エヴァリュエーション ──
// strokes: [x0,y0,x1,y1,w0,w1,tip0,tip1] in a 100-unit glyph box (tip = oblique over-cut of the end)
const KANA = {
  e_tall: [[8, 30, 86, 4, 20, 17, 6, 16], [47, 18, 44, 84, 21, 22, 0, 0], [-16, 96, 100, 76, 22, 17, 16, 24]],
  e: [[14, 24, 80, 18, 20, 18, 6, 12], [48, 20, 45, 82, 21, 22, 0, 0], [-12, 92, 98, 80, 22, 18, 14, 22]],
  vu: [[47, -46, 43, 22, 19, 16, 14, 0], [10, 30, 6, 64, 18, 16, 0, 10], [6, 32, 88, 25, 20, 18, 6, 0], [90, 23, 32, 114, 22, 10, 0, 18],
    [94, -18, 104, 6, 10, 9, 0, 4], [110, -22, 120, 2, 10, 9, 0, 4]],
  a_s: [[0, 34, 72, 25, 20, 18, 8, 0], [72, 25, 46, 64, 18, 15, 0, 8], [38, 44, 6, 110, 20, 10, 0, 14]],
  ri: [[14, 4, 11, 66, 20, 18, 8, 10], [72, -48, 72, 56, 22, 22, 16, 0], [72, 54, 18, 124, 22, 8, 0, 20]],
  yu_s: [[2, 44, 56, 39, 18, 16, 6, 0], [56, 39, 54, 90, 18, 16, 0, 0], [-14, 96, 78, 86, 20, 16, 10, 16]],
  bar: [[-12, 58, 112, 42, 22, 18, 18, 26]],
  shi: [[0, 4, 26, 26, 18, 15, 6, 6], [-6, 40, 20, 62, 18, 15, 6, 6], [0, 112, 106, -16, 24, 10, 12, 26]],
  yo_s: [[4, 36, 58, 33, 16, 15, 6, 0], [8, 62, 58, 60, 15, 15, 4, 0], [0, 92, 64, 88, 18, 16, 8, 6], [58, 30, 57, 94, 16, 16, 0, 0]],
  n: [[2, 4, 32, 30, 18, 15, 6, 6], [-6, 114, 146, -34, 25, 8, 12, 34]],
};
const KANA_LAYOUT = [ // glyph, scale, dx (advance before), dy
  ['e_tall', 1.0, 0, 0], ['vu', 1.0, 82, -2], ['a_s', 0.62, 92, 36], ['ri', 1.02, 42, -2], ['yu_s', 0.62, 76, 38],
  ['e', 0.96, 44, 6], ['bar', 0.9, 84, 8], ['shi', 1.0, 88, 2], ['yo_s', 0.62, 82, 38], ['n', 1.06, 42, -4],
];
function bladePoly(s) {
  const [x0, y0, x1, y1, w0, w1, t0, t1] = s;
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  return [[x0 + nx * w0 / 2 - ux * t0, y0 + ny * w0 / 2 - uy * t0], [x1 + nx * w1 / 2 + ux * t1, y1 + ny * w1 / 2 + uy * t1], [x1 - nx * w1 / 2, y1 - ny * w1 / 2], [x0 - nx * w0 / 2, y0 - ny * w0 / 2]];
}
/** returns list of polygons in logo units (glyph box 100 tall); total width ~ 740 */
const KANA_POLYS = (() => {
  const out = []; let x = 0;
  KANA_LAYOUT.forEach(([g, sc, adv, dy], gi) => {
    x += adv;
    KANA[g].forEach((s, si) => out.push({ gi, si, pts: bladePoly(s).map(([px, py]) => [x + px * sc, dy + py * sc]) }));
  });
  return out;
})();
function drawKana(ctx, cx, cy, s, o = {}) {
  const shear = -0.08, w = 700;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s * (o.sy || 1)); ctx.transform(1, 0, shear, 1, 0, 0); ctx.translate(-w / 2 + 20, -50);
  const n = KANA_POLYS.length;
  if (o.grad) {
    const g = ctx.createLinearGradient(0, -30, 0, 115);
    g.addColorStop(0, '#ffab2e'); g.addColorStop(0.42, '#ff6a18'); g.addColorStop(1, '#d3120c');
    ctx.fillStyle = g;
  } else ctx.fillStyle = o.color || '#fff';
  ctx.strokeStyle = o.edge || '#5e0806'; ctx.lineWidth = 2.2 / s; ctx.lineJoin = 'miter';
  KANA_POLYS.forEach((p, i) => {
    if (o.reveal !== undefined && hash1(i * 13 + 5) > o.reveal) return;
    ctx.beginPath(); p.pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    if (o.grad) ctx.stroke();
    ctx.fill();
    if (o.streak) {           // vertical light streaks rising from each stroke (the blue forming frames)
      const top = Math.min(...p.pts.map((q) => q[1])), xs = p.pts.map((q) => q[0]);
      const xm = (Math.min(...xs) + Math.max(...xs)) / 2;
      ctx.save(); ctx.globalAlpha *= 0.55 * o.streak; ctx.fillRect(xm - 3 - (i % 3), top - 140 - (i % 5) * 30, 6, 140 + (i % 5) * 30); ctx.restore();
    }
  });
  ctx.restore();
}
function wordmark(ctx, cx, cy, size, col = P.white, o = {}) {
  text(ctx, 'EVALUATION', cx, cy, { size, family: '"Cinzel"', weight: 700, color: col, align: 'center', sx: o.sx ?? 1.22, ls: o.ls ?? -2, alpha: o.alpha });
}
function shinseiki(ctx, x, y, size, a = 1) {
  ctx.save(); ctx.globalAlpha *= a;
  text(ctx, '新世紀', x, y, { size, family: MINCHO, weight: 900, color: '#3a0604', align: 'center', sx: 1.05, stroke: '#e0402a', strokeW: 3 });
  ctx.restore();
}
function drawLogo(ctx, t, o = {}) {
  const cy = o.cy ?? 470;
  if (o.shin) shinseiki(ctx, W / 2 + 6, cy - 62, 104, o.shin);
  wordmark(ctx, W / 2, cy + 50, 140);
  if (o.kana) drawKana(ctx, W / 2 + 4, cy + 100, 1.95, { grad: true, sy: 1.14 });
}

// ── shots ───────────────────────────────────────────────────────────────────
// S01 0–2.4  black; a CRT warming up: one phosphor dot, then the line
shot(0, 2.4, 'crt_warmup', (ctx, lt, t, fx) => {
  fill(ctx, '#000');
  fx.bloom = 0.9; fx.thr = 0.3; fx.vig = 0.4;
  if (t > 0.9) {
    const a = 0.75 + 0.25 * hash1(Math.floor(t * 30) * 7);
    const grow = seg(t, 2.27, 2.4);
    const w = grow > 0 ? lerp(4, W * 0.9, E.inExpo(grow)) : 4, h = grow > 0 ? lerp(4, 2, grow) : 4;
    ctx.save(); ctx.globalAlpha = a * seg(t, 0.9, 1.3); ctx.fillStyle = '#f4fff6'; ctx.fillRect(W / 2 - w / 2, H / 2 - h / 2, w, h); ctx.restore();
  }
});

// S02 2.4–7.3  MAGI boot on a red field; faint trinity line-art fades in behind the credit
shot(2.4, 7.3, 'magi_boot_red', (ctx, lt, t, fx) => {
  crt(fx, { curve: 0.045, bloom: 0.0 });
  const push = 1 + 0.035 * (lt / 4.9);
  ctx.save(); cam(ctx, push);
  cloudLayer(ctx, 'red', [[64, 0, 4], [214, 10, 18]], 3, t, { gw: 32, gh: 24, speed: 0.07, scale: 0.26, lo: 0.22, hi: 0.62, blur: 1.2 });
  const la = 0.32 * E.inOutSine(seg(t, 3.9, 5.2));
  if (la > 0) { ctx.globalAlpha = la; magiDiagram(ctx, W / 2, H / 2 + 60, 0.92, '#ffb4a4', 2.4); }
  ctx.restore();
});
cred(2.95, 6.9, (o, t, a) => {
  o.globalAlpha = a;
  credText(o, '企画・原作', W / 2, 430, 62, { align: 'center' });
  credText(o, 'Power et al.', W / 2, 580, 136, { align: 'center', sx: 0.88 });
  credText(o, 'Grokking: Generalization Beyond Overfitting', W / 2, 656, 36, { align: 'center', weight: 700, sx: 0.9 });
  credText(o, 'on Small Algorithmic Datasets（2022）', W / 2, 704, 36, { align: 'center', weight: 700, sx: 0.9 });
}, 0.45, 0.35);

// S03 7.3–10.4  blue copper-plate engraving: the whole task, (a+b) mod 97, with the 30% train split hatched
shot(7.3, 10.4, 'cayley_engraving', (ctx, lt, t, fx) => {
  fill(ctx, '#0a2466');
  fx.bloom = 0.5; fx.thr = 0.8;
  const u = E.inOutSine(seg(lt, 0, 3.1));
  const s = lerp(1.9, 2.7, u);
  // camera travels along the anti-diagonal a+b = const (every cell on it has the same answer)
  const focusA = lerp(18, 44, u), focusB = lerp(62, 40, u);
  const fxp = (focusB + 0.5) * CAY.cell, fyp = (focusA + 0.5) * CAY.cell;
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.12 + 0.05 * u); ctx.scale(s, s); ctx.translate(-fxp, -fyp);
  drawCayley(ctx, 0, 0, 1);
  ctx.restore();
  // Latin legends on roundels (engraving plate captions)
  ctx.save(); ctx.globalAlpha = 0.9;
  roundel(ctx, 250 - 60 * u, 250 + 20 * u, 170, '#d6e8ff', 'PARS DOCTA · XXX CENTESIMAE', `${fmtInt(RUN.ntrain)}`);
  roundel(ctx, 1210 + 50 * u, 850 - 30 * u, 170, '#d6e8ff', 'PARS IGNOTA · LXX CENTESIMAE', `${fmtInt(RUN.nval)}`);
  text(ctx, 'TABVLA ADDITIONIS · MODVLO XCVII', W / 2, 92, { size: 44, family: '"Cinzel"', weight: 700, color: '#e4efff', align: 'center', ls: 6 });
  ctx.restore();
  // plate caption: the whole task in one line
  boxFill(ctx, 450, 930, 540, 110, '#0a2466');
  boxStroke(ctx, 450, 930, 540, 110, '#d6e8ff', 2); boxStroke(ctx, 458, 938, 524, 94, '#d6e8ff', 1);
  formula(ctx, 'task', 720, 953, 64, '#e4efff', { align: 'center' });
  // the small light at the centre of the plate
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 60);
  g.addColorStop(0, 'rgba(240,248,255,0.95)'); g.addColorStop(0.25, 'rgba(160,210,255,0.5)'); g.addColorStop(1, 'rgba(60,120,255,0)');
  ctx.fillStyle = g; ctx.fillRect(W / 2 - 60, H / 2 - 60, 120, 120);
});

// S04 10.4–14.1  the untrained embedding table, a blue blob of 97 points (step 0); ring premonition at 14.0
shot(10.4, 14.1, 'emb_blob', (ctx, lt, t, fx) => {
  fill(ctx, '#0b2b7a');
  fx.bloom = 0.5; fx.thr = 0.7;
  const e0 = { pts: RUN.emb2d[0], k: RUN.domk[0] };
  const rot = 0.25 * lt;
  const R = 290 + 12 * lt;
  const cx = 1000, cy = 560;
  // watery body: each of the 97 embedding points is a soft pool of light (additive) — the data, painted
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const q = (p) => [cx + (p[0] * cs - p[1] * sn) * R, cy - (p[0] * sn + p[1] * cs) * R];
  const [bc, bg] = off('blobsprite', 160, 160);
  if (!bc._ok) { const g = bg.createRadialGradient(80, 80, 0, 80, 80, 80); g.addColorStop(0, 'rgba(110,180,255,0.42)'); g.addColorStop(0.35, 'rgba(60,130,255,0.2)'); g.addColorStop(1, 'rgba(30,80,220,0)'); bg.fillStyle = g; bg.fillRect(0, 0, 160, 160); bc._ok = true; }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  e0.pts.forEach((p) => { const [x, y] = q(p); ctx.drawImage(bc, x - 80, y - 80); });
  ctx.restore();
  ctx.save(); ctx.fillStyle = '#eaf6ff';
  e0.pts.forEach((p) => { const [x, y] = q(p); ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fill(); });
  ctx.restore();
  monoText(ctx, `EMBEDDING 97×128   STEP 0   PLANE k=${e0.k}   r-CV ${RUN.cv[0].toFixed(2)}`, 1380, 1036, 30, '#9cc6ff', { align: 'right' });
  if (t >= 13.97) {   // two frames: the circle it will become (emb2d at step 30,000, mean radius)
    const eF = RUN.emb2d[RUN.emb2d.length - 1];
    const rr = eF.reduce((s, p) => s + Math.hypot(p[0], p[1]), 0) / 97;
    ring(ctx, cx, cy, rr * R, '#f2fbff', 9, 0.95); fx.bloom = 1.2;
  }
});
cred(10.45, 14.0, (o, t, a) => {
  o.globalAlpha = a;
  credit(o, '解析', ['Nanda et al.'], 300, 400, { nameSize: 96, roleSize: 50 });
  credit(o, '掲載', ['ICLR 2023'], 300, 580, { nameSize: 96, roleSize: 50 });
  credText(o, 'Progress Measures for Grokking', 302, 652, 36, { weight: 700, sx: 0.9 });
  credText(o, 'via Mechanistic Interpretability', 302, 700, 36, { weight: 700, sx: 0.9 });
}, 0.3, 0.12);

// S05 14.1–15.9  white flash → grey smoke, a giant dark "+" sweeps through (the operator of the task)
shot(14.1, 15.9, 'plus_smoke', (ctx, lt, t, fx) => {
  fill(ctx, '#d8dadb');
  cloudLayer(ctx, 'smoke', [[58, 62, 64], [246, 246, 246]], 11, t * 6, { gw: 40, gh: 30, speed: 0.5, scale: 0.3, lo: 0.3, hi: 0.62, blur: 0.9 });
  fx.flash = 1 - seg(lt, 0.17, 0.32); fx.flashCol = [1, 1, 1];     // full white through the band hit at 14.2, gone by 14.42
  // the cross sweeps fast (camera whip), motion-blurred by stacking
  const u = lt / 1.8;
  const cx = lerp(1500, -200, E.inOutSine(seg(u, 0, 0.62))), cy = lerp(160, 760, seg(u, 0, 0.62));
  const rot = lerp(0.5, -0.35, u), s = lerp(0.9, 2.4, E.inCubic(seg(u, 0.1, 0.7)));
  const plusA = 1 - seg(u, 0.72, 0.86);
  for (let k = 0; k < 8; k++) {
    const du = (k - 3.5) * 0.0025;
    ctx.save(); ctx.globalAlpha = 0.2 * plusA;
    ctx.translate(lerp(1500, -200, E.inOutSine(seg(u + du, 0, 0.62))), lerp(160, 760, seg(u + du, 0, 0.62))); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = '#1b1d1e'; ctx.fillRect(-520, -48, 1040, 96); ctx.fillRect(-48, -520, 96, 1040);
    ctx.restore();
  }
  // the wordmark surfacing from the smoke
  const wa = seg(t, 15.3, 15.85);
  if (wa > 0) wordmark(ctx, W / 2, 530, 132, '#505456', { alpha: wa * 0.8 });
});

// S06 15.9–17.4  wordmark alone on black
shot(15.9, 17.4, 'logo_word', (ctx, lt, t, fx) => {
  fill(ctx, '#000');
  wordmark(ctx, W / 2, 530, 140);
});
// S07 17.4–18.2  electric-blue katakana forms with light streaks
shot(17.4, 18.2, 'logo_blue', (ctx, lt, t, fx) => {
  fill(ctx, '#000');
  fx.bloom = 1.3; fx.thr = 0.35;
  const cy = lerp(530, 470, E.outCubic(seg(lt, 0, 0.5)));
  const rv = E.outCubic(seg(lt, 0, 0.45));
  if (lt < 0.1) { // 3-frame bright burst like the original's first blue frame
    ctx.save(); ctx.fillStyle = '#bfe8ff'; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(560, 1080); ctx.lineTo(760, 0); ctx.lineTo(980, 0); ctx.lineTo(820, 1080); ctx.fill(); ctx.restore();
  }
  wordmark(ctx, W / 2, cy + 50, 140, '#e8f6ff');
  drawKana(ctx, W / 2 + 4, cy + 100, 1.95, { sy: 1.14, color: '#6fd2ff', edge: '#0a3a6a', reveal: rv, streak: 1 - seg(lt, 0.4, 0.8) });
});
// S08 18.2–22.9  final logo; blue flare 19.0; 新世紀 19.4; blue ring 21.0
shot(18.2, 22.9, 'logo_final', (ctx, lt, t, fx) => {
  fill(ctx, '#000');
  drawLogo(ctx, t, { kana: true, shin: seg(t, 19.38, 19.55) > 0 ? (t < 19.45 ? 0.5 : 1) : 0 });
  // horizontal blue lens flare sweeping at 19.0
  const fu = seg(t, 18.95, 19.35);
  if (fu > 0 && fu < 1) {
    fx.bloom = 1.1; fx.thr = 0.45;
    const a = Math.sin(Math.PI * fu);
    const y = 440, xc = lerp(-200, W + 200, fu);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = '#e8f6ff'; ctx.fillRect(0, y - 2, W, 4);
    const g = ctx.createRadialGradient(xc, y, 0, xc, y, 420); g.addColorStop(0, 'rgba(170,220,255,0.9)'); g.addColorStop(1, 'rgba(40,110,255,0)');
    ctx.save(); ctx.translate(xc, y); ctx.scale(1, 0.12); ctx.translate(-xc, -y); ctx.fillStyle = g; ctx.fillRect(xc - 420, y - 420, 840, 840); ctx.restore();
    ctx.restore();
  }
  // blue ring pulse at 21.0
  const ru = seg(t, 21.0, 21.45);
  if (ru > 0 && ru < 1) {
    fx.bloom = 1.0; fx.thr = 0.4;
    ctx.save(); ctx.globalAlpha = 1 - ru;
    ring(ctx, W / 2, 500, lerp(560, 640, ru), '#58b4ff', 10 * (1 - ru) + 2, 1);
    ctx.restore();
  }
});
// S09 22.9–23.4  white flash with blue X-shaped rays over the fading logo
shot(22.9, 23.4, 'logo_flash', (ctx, lt, t, fx) => {
  fill(ctx, '#000');
  drawLogo(ctx, t, { kana: true, shin: 1 });
  fx.bloom = 1.4; fx.thr = 0.4;
  const u = seg(lt, 0, 0.3);
  ctx.save(); ctx.globalAlpha = 0.9;
  const beam = (ang) => { ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(ang); ctx.fillStyle = '#dff2ff'; ctx.fillRect(-1200, -26 - 30 * u, 2400, 52 + 60 * u); ctx.restore(); };
  beam(0.62); beam(-0.62);
  ctx.restore();
  fx.flash = clamp(0.15 + u * 0.45, 0, 0.6) + (lt > 0.3 ? seg(lt, 0.3, 0.45) * 0.4 : 0); fx.flashCol = [0.93, 0.97, 1];
});
