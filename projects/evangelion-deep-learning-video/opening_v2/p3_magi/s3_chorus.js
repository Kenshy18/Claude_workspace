// ─────────────────────────────────────────────────────────────────────────────
//  66.8 – 90.5 : GROKKING at 66.8, chorus montage (2–6 frame cuts of real plots and
//                text cards), 監督 card at 82.6, green slash 83.6, converged model, 製作 on red.
// ─────────────────────────────────────────────────────────────────────────────
const LAST = RUN.snap.length - 1;
const snapOf = (step) => Math.round(step / 250);
const embSnap = (step) => { const i = snapOf(step); return { pts: RUN.emb2d[i], k: RUN.domk[i], cv: RUN.cv[i] }; };

// ── building blocks ──────────────────────────────────────────────────────────
function card(ctx, lines, bg = '#000', col = P.white) {
  fill(ctx, bg);
  for (const L of lines) text(ctx, L.s, L.x ?? W / 2, L.y, { size: L.size, family: COND, weight: 700, color: L.col || col, align: L.align || 'center', sx: L.sx ?? 0.84 });
}
function fullCurve(ctx, key, x, y, w, h, o) {
  const M = plotMap(x, y, w, h, { x0: 0, x1: 30000, y0: o.y0, y1: o.y1, logy: o.log });
  if (o.grid) gridLines(ctx, x, y, w, h, 6, 4, o.grid, 1.5, 0.8);
  plotMetric(ctx, M, key, 0, o.s1 ?? 30000, o.col, o.lw || 6, !!o.log, o.log ? o.y0 : 0);
  return M;
}
function scope(ctx, cx, cy, R, emb, col, dim, o = {}) {
  ring(ctx, cx, cy, R * 1.14, dim, 3);
  for (let i = 0; i < 72; i++) { const a = (i / 72) * Math.PI * 2, r0 = R * 1.14, r1 = r0 - (i % 6 === 0 ? 30 : 12); line(ctx, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, dim, 2); }
  line(ctx, cx - R * 1.2, cy, cx + R * 1.2, cy, dim, 1.2); line(ctx, cx, cy - R * 1.2, cx, cy + R * 1.2, dim, 1.2);
  drawEmb(ctx, cx, cy, R, 0, { emb, color: col, dot: o.dot || 7, star: o.star !== false, starAlpha: o.starAlpha ?? 0.45, starW: o.starW || 1.4, starColor: o.starColor || col, starP: o.starP, rot: o.rot || 0, labels: o.labels, labelColor: o.labelColor });
}
function freqFile(ctx, k, bg, t) {
  fill(ctx, bg);
  const pw = RUN.fourier[LAST][k - 1];
  const rank = RUN.fourier[LAST].map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).findIndex((x) => x[1] === k - 1) + 1;
  // the "photo": cos(ω_k x) and sin(ω_k x) sampled on the 97 residues
  const px = 110, py = 150, pw_ = 700, ph = 780;
  boxFill(ctx, px, py, pw_, ph, '#f4f1e8');
  boxStroke(ctx, px, py, pw_, ph, '#1b1a1d', 4);
  const mid1 = py + 250, mid2 = py + 560, A = 170;
  ctx.save(); ctx.strokeStyle = '#1b1a1d'; ctx.lineWidth = 3;
  for (let x = 0; x < 97; x++) {
    const X = px + 30 + (x * (pw_ - 60)) / 96, w = (2 * Math.PI * k * x) / 97;
    ctx.beginPath(); ctx.moveTo(X, mid1); ctx.lineTo(X, mid1 - Math.cos(w) * A * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X, mid2); ctx.lineTo(X, mid2 - Math.sin(w) * A * 0.8); ctx.stroke();
  }
  ctx.restore();
  monoText(ctx, `cos(2π·${k}·x/97)`, px + 24, py + 50, 30, '#1b1a1d', { family: '"Liberation Mono"', weight: 700 });
  monoText(ctx, `sin(2π·${k}·x/97)`, px + 24, py + 400, 30, '#1b1a1d', { family: '"Liberation Mono"', weight: 700 });
  const tx0 = 870;
  condText(ctx, 'FREQUENCY', tx0, 250, 56, '#101014', { sx: 0.84 });
  text(ctx, 'k=' + k, tx0, 470, { size: 230, family: COND, weight: 700, color: '#101014', sx: 0.8 });
  condText(ctx, `POWER ${pct(pw)}`, tx0, 600, 64, '#101014', { sx: 0.84 });
  condText(ctx, `RANK ${rank} / 48`, tx0, 690, 64, '#101014', { sx: 0.84 });
  monoText(ctx, 'STEP 30,000', tx0, 770, 34, '#101014', { family: '"Liberation Mono"' });
  const key = RUN.key.includes(k);
  boxFill(ctx, tx0, 810, key ? 250 : 330, 56, '#101014');
  condText(ctx, key ? 'KEY-5' : 'LATE ARRIVAL', tx0 + 14, 853, 44, bg, { sx: 0.84 });
}
function pencilPaper(ctx, seed) {
  fill(ctx, '#efece3');
  cloudLayer(ctx, 'pp' + seed, [[222, 218, 206], [242, 239, 230]], seed, 0, { gw: 30, gh: 22, scale: 0.7, blur: 0.6 });
}
/** a pencil stroke along data points with a deterministic wobble */
function pencilLine(ctx, pts, seed, col = '#4a4a50', lw = 3) {
  for (let pass = 0; pass < 2; pass++) {
    ctx.save(); ctx.strokeStyle = col; ctx.globalAlpha = pass ? 0.45 : 0.85; ctx.lineWidth = pass ? lw * 0.6 : lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach(([x, y], i) => { const j = (vnoise(i * 0.35, seed + pass * 7) - 0.5) * 7; i ? ctx.lineTo(x + j * 0.4, y + j) : ctx.moveTo(x, y); });
    ctx.stroke(); ctx.restore();
  }
}
const FOURIER_MAP = { key: 'fmap' };
SHOT_INITS.push(() => {
  const [c, g] = off('fmap', 121, 48);
  const img = g.createImageData(121, 48);
  for (let i = 0; i < 121; i++) for (let k = 0; k < 48; k++) {
    const v = clamp(Math.sqrt(RUN.fourier[i][k] / 0.17));
    const o = ((47 - k) * 121 + i) * 4;
    img.data[o] = clamp(v * 2.2) * 255; img.data[o + 1] = clamp(v * 2.2 - 1) * 235; img.data[o + 2] = clamp(v * 3 - 2.4) * 180; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
});

// ── 66.80 GROKKING ───────────────────────────────────────────────────────────
shot(66.8, 67.37, 'grok_valacc', (ctx, lt, t, fx) => {
  const step = stepAt(t);
  crt(fx, { curve: 0.05, bloom: 0.7, thr: 0.5 });
  if (lt < 0.02) { fx.flash = 1; fx.flashCol = [0.96, 1, 0.97]; }      // one white frame on the downbeat
  fill(ctx, '#020603');
  const G = '#3cff78', GD = '#0f5a26';
  const px = 100, py = 250, pw = 800, ph = 640;
  const M = plotMap(px, py, pw, ph, { x0: 0, x1: 16000, y0: 0, y1: 1 });
  gridLines(ctx, px, py, pw, ph, 8, 4, GD, 1.5);
  for (let i = 0; i <= 8; i += 2) monoText(ctx, fmtInt(i * 2000), M.X(i * 2000), py + ph + 38, 28, G, { align: 'center' });
  for (let j = 0; j <= 4; j++) monoText(ctx, j * 25 + '%', px - 14, M.Y(j / 4) + 10, 28, G, { align: 'right' });
  plotMetric(ctx, M, 'train_acc', 0, 16000, GD, 4);
  monoText(ctx, 'TRAIN', M.X(15800), M.Y(1) - 14, 30, '#1f8a40', { align: 'right' });
  plotMetric(ctx, M, 'val_acc', 0, step, G, 7);
  const va = mAt('val_acc', step);
  dot(ctx, M.X(step), M.Y(va), 10, '#eaffef');
  jpText(ctx, '検証正解率', px, 120, 56, G, { weight: 900 });
  monoText(ctx, 'VAL ACC', px + 300, 116, 30, G);
  seg7(ctx, (va * 100).toFixed(1).padStart(5, ' '), 560, 170, 110, G, { thick: 0.14 });
  monoText(ctx, `STEP ${fmtInt(step)}   L_val ${mAt('val_loss', step, true).toFixed(3)} < ln 97`, px, py + ph + 96, 34, G);
  // MAGI warning banner
  const on = Math.floor(lt * 15) % 3 !== 2 || lt > 0.35;
  ctx.save(); ctx.translate(1010, 330);
  hazard(ctx, -30, -100, 300, 26, '#ff5a14', '#000', 14); hazard(ctx, -30, 290, 300, 26, '#ff5a14', '#000', 14);
  boxStroke(ctx, -30, -64, 300, 344, '#ff5a14', 4);
  if (on) {
    text(ctx, 'GROKKING', 120, 70, { size: 84, family: COND, weight: 700, color: '#ff6a1a', align: 'center', sx: 0.62 });
    jpText(ctx, '汎化', 120, 220, 130, '#ff6a1a', { align: 'center', family: MINCHO });
  }
  ctx.restore();
});
// 67.37–68.12  the embedding scope: the circle (plane k=12), white flash on entry
shot(67.37, 68.12, 'grok_scope', (ctx, lt, t, fx) => {
  const step = stepAt(t);
  crt(fx, { curve: 0.05, bloom: 0.8, thr: 0.45 });
  fill(ctx, '#020603');
  const e = embAt(step);
  const cx = 720, cy = 520, R = 400;
  const hot = lt < 0.07;                 // the eyes-flash frames of the original: the 97 points burn white, the tube stays dark
  if (hot) { fx.bloom = 1.6; fx.thr = 0.3; }
  scope(ctx, cx, cy, R, e, hot ? '#f4fff6' : '#3cff78', '#0f5a26', { starP: clamp(0.25 + lt * 1.6), starAlpha: hot ? 0.8 : 0.55, rot: -lt * 0.3, dot: hot ? 11 : 8 });
  monoText(ctx, `EMBEDDING ON FOURIER PLANE k=${e.k}   r-CV ${e.cv.toFixed(3)}   STEP ${fmtInt(step)}`, cx, 1040, 32, '#3cff78', { align: 'center' });
  if (lt > 0.23) monoText(ctx, `n → n+1 : THE NUMBER LINE WINDS ${e.k}× AROUND  {97/${e.k}}`, cx, 70, 28, '#3cff78', { align: 'center' });
});
shot(68.12, 68.25, 'card_grokking', (ctx) => card(ctx, [{ s: 'GROKKING', y: 610, size: 250 }]));
shot(68.25, 68.62, 'city_table', (ctx, lt, t, fx) => {
  fill(ctx, '#010401');
  fx.bloom = 0.5; fx.thr = 0.6;
  ctx.save(); ctx.translate(720, 600); ctx.transform(1, 0, -0.3, 0.62, 0, 0); ctx.rotate(-0.5); ctx.scale(2.1 + lt * 0.5, 2.1 + lt * 0.5); ctx.translate(-970 - lt * 60, -970);
  drawCayley(ctx, 0, 0, 1, 0, 'cayley_g', 80);
  ctx.restore();
  monoText(ctx, `(a + b) mod 97   ALL 9,409 PAIRS   VAL ACC ${pct(mAt('val_acc', stepAt(t)), 1)}`, 60, 80, 30, '#3cff78');
});
shot(68.62, 68.75, 'card_mlp01', (ctx) => card(ctx, [{ s: 'MLP-01', y: 640, size: 330 }]));
shot(68.75, 69.0, 'cu_wnorm', (ctx, lt, t, fx) => {
  const step = stepAt(t);
  fill(ctx, '#0a0400'); fx.bloom = 0.7; fx.thr = 0.5; fx.curve = 0.06;
  ctx.save(); cam(ctx, 1.5, 720, 540, -60, 0);
  seg7(ctx, mAt('wnorm', step).toFixed(1), 150, 760, 460, '#ff8a1c', { thick: 0.15 });
  monoText(ctx, '‖W‖', 160, 240, 60, '#ff8a1c');
  ctx.restore();
});
shot(69.0, 69.25, 'cu_losses', (ctx, lt, t, fx) => {
  const step = stepAt(t);
  fill(ctx, '#080400'); fx.bloom = 0.5; fx.thr = 0.55; fx.curve = 0.05;
  const M = plotMap(100, 120, 1240, 840, { x0: 0, x1: 16000, y0: 1e-4, y1: 30, logy: true });
  gridLines(ctx, 100, 120, 1240, 840, 8, 6, '#4a2806', 1.5);
  plotMetric(ctx, M, 'val_loss', 0, step, '#ffae1a', 7, true, 1e-4);
  plotMetric(ctx, M, 'train_loss', 0, step, '#c87a1a', 4, true, 1e-4);
  monoText(ctx, 'VAL LOSS', M.X(step) - 20, M.Y(mAt('val_loss', step, true)) - 20, 34, '#ffae1a', { align: 'right' });
  monoText(ctx, 'TRAIN / VAL LOSS  (log)', 100, 1030, 34, '#c87a1a');
});
shot(69.25, 69.5, 'cu_bars', (ctx, lt, t, fx) => {
  const F_ = fourierAt(stepAt(t));
  fill(ctx, '#010401'); fx.bloom = 0.6; fx.thr = 0.5; fx.curve = 0.05;
  for (let k = 0; k < 48; k++) {
    const h = F_[k] * 5200, x = 60 + k * 27.5;
    boxFill(ctx, x, 1000 - h, 21, h, RUN.key.includes(k + 1) ? '#8affb0' : '#1f9a4a');
    if (RUN.key.includes(k + 1)) monoText(ctx, String(k + 1), x + 10, 1000 - h - 16, 32, '#8affb0', { align: 'center' });
  }
});
shot(69.5, 69.75, 'paper_mask', (ctx, lt, t) => {
  fill(ctx, '#f2f0ea');
  const e = embSnap(stepAt(t));
  drawEmb(ctx, 720, 540, 380, 0, { emb: e, color: '#18181a', dot: 13, star: true, starAlpha: 0.9, starW: 3, starColor: '#18181a' });
});
shot(69.75, 70.12, 'red_core', (ctx, lt, t, fx) => {
  fill(ctx, '#140000'); fx.bloom = 1.0; fx.thr = 0.4;
  const g = ctx.createRadialGradient(720, 540, 60, 720, 540, 460);
  g.addColorStop(0, '#ff5a3a'); g.addColorStop(0.7, '#d8140c'); g.addColorStop(1, '#5a0204');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(720, 540, 460, 0, 7); ctx.fill();
  const e = embSnap(stepAt(t));
  drawEmb(ctx, 720, 540, 360, 0, { emb: e, color: '#ffd0b0', dot: 7, star: true, starAlpha: 0.5, starW: 2, starColor: '#ffb090', rot: lt * 0.8 });
});
shot(70.12, 70.33, 'card_atf', (ctx) => {
  fill(ctx, '#000');
  cardCap(ctx, 'A', 'NGLE-SUM', 250, 390, 250, 120);
  cardCap(ctx, 'T', 'RIG', 250, 610, 250, 120);
  cardCap(ctx, 'F', 'ORMULA', 250, 900, 330, 250);
});
shot(70.33, 70.5, 'red_formula', (ctx) => {
  fill(ctx, '#d0120a');
  formula(ctx, 'cosadd', 720, 500, 60, '#2a0400', { align: 'center' });
});
shot(70.5, 71.25, 'moon', (ctx, lt, t, fx) => {
  fill(ctx, '#0c2448'); fx.bloom = 0.15; fx.thr = 0.9;
  const cx = 720, cy = 470, R = 520 + lt * 20;
  ctx.fillStyle = '#c9d8e4'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
  const e = embSnap(stepAt(t));
  drawEmb(ctx, cx, cy, R * 0.86, 0, { emb: e, color: '#6a88a8', dot: 11, star: true, starAlpha: 0.6, starW: 2.2, starColor: '#7a98b8' });
  sil(ctx, 'stand', 720 - 80 * 1.5, 330, 1.5, '#050810');
});
shot(71.25, 71.37, 'card_fourier', (ctx) => card(ctx, [{ s: 'FOURIER', y: 610, size: 260 }]));
shot(71.37, 71.75, 'skyline', (ctx, lt, t) => {
  const F_ = fourierAt(stepAt(t));
  boxFill(ctx, 0, 0, W, 360, '#e8501a'); boxFill(ctx, 0, 360, W, 260, '#f7862e'); boxFill(ctx, 0, 620, W, 460, '#ffc070');
  dot(ctx, 1040, 640, 120, '#fff0c8');
  ctx.save(); ctx.translate(-lt * 40, 0);
  for (let k = 0; k < 48; k++) { const h = Math.sqrt(F_[k]) * 1700, x = 20 + k * 30; boxFill(ctx, x, 1080 - h, 27, h, '#1a0a08'); }
  ctx.restore();
});
shot(71.75, 71.87, 'card_mod97', (ctx) => card(ctx, [{ s: 'MOD-97', y: 640, size: 320 }]));
shot(71.87, 72.25, 'magi_verdict', (ctx, lt, t, fx) => {
  const step = stepAt(t);
  fill(ctx, '#16020a'); fx.bloom = 0.5; fx.thr = 0.6;
  magiDiagram(ctx, 720, 560, 1.15, '#ff5a86', 3, {
    verdict: ['承認', '承認', '承認'], boxFill: '#ff4a78', textOn: '#16020a',
    crit: [`‖W‖ ${mAt('wnorm', step).toFixed(1)} ↓`, `TRAIN ${pct(mAt('train_acc', step))}`, `VAL ${pct(mAt('val_acc', step))}`],
  });
  text(ctx, '提訴 : 汎化', 80, 110, { size: 54, family: MINCHO, weight: 900, color: '#ff5a86' });
});
shot(72.25, 72.37, 'emblem', (ctx) => {
  fill(ctx, '#000');
  for (let i = 0; i < 97; i++) { const a = (i / 97) * Math.PI * 2 - Math.PI / 2; line(ctx, 720 + Math.cos(a) * 250, 470 + Math.sin(a) * 250, 720 + Math.cos(a) * (i % 12 === 0 ? 330 : 300), 470 + Math.sin(a) * (i % 12 === 0 ? 330 : 300), '#e0140c', 8); }
  boxFill(ctx, 720 - 26, 470 - 170, 52, 340, '#e0140c'); boxFill(ctx, 720 - 170, 470 - 26, 340, 52, '#e0140c');
  text(ctx, 'MOD XCVII', 720, 930, { size: 96, family: '"Cinzel"', weight: 700, color: '#e0140c', align: 'center', ls: 8 });
});
// mugshots: the five key frequencies (top-5 at step 14k), then the two late arrivals k=3, k=28
shot(72.37, 72.62, 'file_12', (ctx, lt, t) => freqFile(ctx, 12, '#3a9a92', t));
shot(72.62, 72.75, 'fmap', (ctx, lt, t, fx) => {
  fill(ctx, '#000'); fx.bloom = 0.4; fx.thr = 0.7;
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(OFF['fmap'], 90, 120, 1260, 800); ctx.restore();
  monoText(ctx, 'FOURIER POWER  k = 1…48  ×  STEP 0…30,000', 90, 90, 30, '#ffb04a');
  const X = (s) => 90 + (s / 30000) * 1260;
  line(ctx, X(RUN.G0), 110, X(RUN.G0), 930, '#ffffff', 2);
  monoText(ctx, 'G₀', X(RUN.G0) + 8, 970, 30, '#fff');
});
shot(72.75, 73.0, 'file_1', (ctx, lt, t) => freqFile(ctx, 1, '#e7a2b4', t));
shot(73.0, 73.25, 'file_20', (ctx, lt, t) => freqFile(ctx, 20, '#6a8ed0', t));
shot(73.25, 73.5, 'file_34', (ctx, lt, t) => freqFile(ctx, 34, '#8cc47a', t));
shot(73.5, 73.75, 'bridge', (ctx, lt, t, fx) => {
  const step = stepAt(t);
  fill(ctx, '#03060a'); fx.bloom = 0.5; fx.thr = 0.55;
  // wall of screens
  const scr = [[40, 200, 520, 420], [600, 140, 800, 520], [1100, 260, 300, 340]];
  scr.forEach(([x, y, w, h], i) => {
    boxFill(ctx, x - 10, y - 10, w + 20, h + 20, '#0c1016');
    boxFill(ctx, x, y, w, h, i === 1 ? '#041a08' : '#0a0602');
    if (i === 1) { const M = plotMap(x + 30, y + 30, w - 60, h - 60, { x0: 0, x1: 30000, y0: 0, y1: 1 }); plotMetric(ctx, M, 'val_acc', 0, step, '#3cff78', 5); plotMetric(ctx, M, 'train_acc', 0, step, '#1a8a3a', 3); }
    if (i === 0) { const M = plotMap(x + 20, y + 20, w - 40, h - 40, { x0: 0, x1: 30000, y0: 0, y1: 100 }); plotMetric(ctx, M, 'wnorm', 0, step, '#ff8a1c', 4); }
    if (i === 2) { const F_ = fourierAt(step); for (let k = 0; k < 48; k++) { const hh = F_[k] * 1500; boxFill(ctx, x + 10 + k * 5.8, y + h - 10 - hh, 4, hh, '#ffae1a'); } }
  });
  // desks and operators
  sil(ctx, 'opA', 160, 560, 1.3); sil(ctx, 'opB', 640, 520, 1.3); sil(ctx, 'opC', 1080, 560, 1.3);
  boxFill(ctx, 0, 860, W, 220, '#000');
  poly(ctx, [[0, 840], [1440, 810], [1440, 870], [0, 900]], { fill: '#0a0d10' });
});
shot(73.75, 74.0, 'file_38', (ctx, lt, t) => freqFile(ctx, 38, '#e8a04a', t));
shot(74.0, 74.25, 'file_3', (ctx, lt, t) => freqFile(ctx, 3, '#e6d266', t));
shot(74.25, 74.37, 'red_sketch', (ctx, lt, t) => {
  fill(ctx, '#050000');
  const e = { pts: RUN.emb2d[LAST] };
  ctx.save(); ctx.strokeStyle = '#d0140c'; ctx.lineWidth = 2.5; ctx.beginPath();
  for (let i = 0; i <= 97; i++) { const p = e.pts[(i * 12) % 97]; const x = 720 + p[0] * 700, y = 540 - p[1] * 300; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke(); ctx.restore();
  ring(ctx, 720, 540, 60, '#d0140c', 3); dot(ctx, 720, 540, 18, '#d0140c');
});
shot(74.37, 74.5, 'file_28', (ctx, lt, t) => freqFile(ctx, 28, '#a88ad0', t));
shot(74.5, 74.62, 'commander_cu', (ctx, lt, t, fx) => {
  fill(ctx, '#1a1008'); fx.bloom = 0.9; fx.thr = 0.45;
  sil(ctx, 'gendo', 720 - 300 * 2.2, -120, 2.2, '#000'); sil(ctx, 'gendoHands', 720 - 300 * 2.2, -120, 2.2, '#000');
  const gx = 720, gy = -120 + 2.2 * 150;
  ctx.fillStyle = '#ff3a1a'; ctx.fillRect(gx - 2.2 * 58, gy - 16, 2.2 * 46, 26); ctx.fillRect(gx + 2.2 * 12, gy - 16, 2.2 * 46, 26);
});
shot(74.62, 74.75, 'document', (ctx) => {
  fill(ctx, '#f4f3ee');
  boxStroke(ctx, 90, 70, 1260, 940, '#111', 6);
  boxStroke(ctx, 600, 130, 240, 110, '#111', 5);
  text(ctx, '極秘', 720, 215, { size: 80, family: MINCHO, weight: 900, color: '#111', align: 'center', sx: 1 });
  text(ctx, '汎化補完計画', 720, 470, { size: 170, family: MINCHO, weight: 900, color: '#111', align: 'center', sx: 0.9 });
  text(ctx, '第56次中間報告', 720, 640, { size: 96, family: MINCHO, weight: 900, color: '#111', align: 'center', sx: 0.9 });
  text(ctx, 'MAGI 監視委員会', 720, 770, { size: 40, family: MINCHO, weight: 900, color: '#111', align: 'center' });
  text(ctx, `第56回スナップショット（ステップ 14,000）検証正解率 ${pct(mAt('val_acc', 14000))}`, 720, 840, { size: 34, family: MINCHO, weight: 700, color: '#111', align: 'center', sx: 0.9 });
  text(ctx, '閲覧後廃棄', 720, 920, { size: 34, family: MINCHO, weight: 900, color: '#111', align: 'center' });
});
shot(74.75, 75.12, 'scope_1k', (ctx, lt, t, fx) => {
  crt(fx, { curve: 0.05, bloom: 0.7, thr: 0.45 });
  fill(ctx, '#0a0101');
  scope(ctx, 720, 540, 380, embSnap(1000), '#ff3a20', '#5a0806', { starAlpha: 0.35 });
  monoText(ctx, `STEP 1,000   r-CV ${RUN.cv[4].toFixed(3)}   TRAIN 100.0%   VAL ${pct(RUN.val_acc[20])}`, 720, 1030, 28, '#ff3a20', { align: 'center' });
});
shot(75.12, 75.5, 'scope_30k', (ctx, lt, t, fx) => {
  crt(fx, { curve: 0.05, bloom: 0.7, thr: 0.45 });
  fill(ctx, '#020603');
  scope(ctx, 720, 540, 380, embSnap(30000), '#3cff78', '#0f5a26', { starAlpha: 0.5 });
  monoText(ctx, `STEP 30,000   r-CV ${RUN.cv[LAST].toFixed(3)}   TRAIN 100.0%   VAL ${pct(RUN.val_acc[NLOG - 1])}`, 720, 1030, 28, '#3cff78', { align: 'center' });
});
shot(75.5, 75.62, 'card_proto', (ctx) => card(ctx, [{ s: 'PROTOTYPE', y: 330, size: 140 }, { s: 'CKPT-1k', y: 760, size: 380 }]));
shot(75.62, 76.0, 'memorizer_red', (ctx, lt, t) => {
  fill(ctx, '#c8140c');
  const ink = '#1a0202';
  text(ctx, 'STEP 1,000', 110, 250, { size: 150, family: COND, weight: 700, color: ink, sx: 0.84 });
  [['TRAIN ACC', pct(RUN.train_acc[20])], ['VAL ACC', pct(RUN.val_acc[20])], ['VAL LOSS', RUN.val_loss[20].toFixed(2) + ' nats'], ['WEIGHT NORM', RUN.wnorm[20].toFixed(1)]]
    .forEach(([k, v], i) => { monoText(ctx, k, 120, 430 + i * 140, 64, ink, { family: '"Liberation Mono"', weight: 700 }); monoText(ctx, v, 1330, 430 + i * 140, 90, ink, { align: 'right', family: '"Liberation Mono"', weight: 700 }); });
});
shot(76.0, 76.12, 'card_prod', (ctx) => card(ctx, [{ s: 'PRODUCTION MODEL', y: 330, size: 130 }, { s: 'CKPT-30k', y: 760, size: 330 }]));
shot(76.12, 76.5, 'mug_trainacc', (ctx) => { fill(ctx, '#b8d8f0'); fullCurve(ctx, 'train_acc', 100, 140, 1240, 800, { y0: 0, y1: 1.02, col: '#10284a', lw: 9, grid: '#8ab4d8' }); text(ctx, 'TRAIN ACC', 110, 1030, { size: 70, family: COND, weight: 700, color: '#10284a', sx: 0.84 }); });
shot(76.5, 76.87, 'mug_valacc', (ctx) => { fill(ctx, '#e8401a'); const M = fullCurve(ctx, 'val_acc', 100, 140, 1240, 800, { y0: 0, y1: 1.02, col: '#1a0602', lw: 10, grid: '#f07048' }); text(ctx, 'VAL ACC', 110, 1030, { size: 70, family: COND, weight: 700, color: '#1a0602', sx: 0.84 }); line(ctx, M.X(RUN.G0), 140, M.X(RUN.G0), 940, '#fff0d0', 3); });
shot(76.87, 77.0, 'mug_losses', (ctx) => { fill(ctx, '#1a1024'); fullCurve(ctx, 'val_loss', 100, 140, 1240, 800, { y0: 1e-4, y1: 30, log: true, col: '#ffae1a', lw: 8 }); fullCurve(ctx, 'train_loss', 100, 140, 1240, 800, { y0: 1e-4, y1: 30, log: true, col: '#8a5aff', lw: 6 }); text(ctx, 'LOSS (log)', 110, 1030, { size: 70, family: COND, weight: 700, color: '#ffae1a', sx: 0.84 }); });
shot(77.0, 77.25, 'mug_wnorm', (ctx) => { fill(ctx, '#f0a030'); fullCurve(ctx, 'wnorm', 100, 140, 1240, 800, { y0: 0, y1: 100, col: '#2a1002', lw: 9, grid: '#f8c060' }); text(ctx, '‖W‖  21.2 → 95.9 → 61.1', 110, 1030, { size: 64, family: COND, weight: 700, color: '#2a1002', sx: 0.84 }); });
shot(77.25, 77.37, 'mug_keyshare', (ctx) => {
  fill(ctx, '#f2b4c4');
  ctx.save(); ctx.strokeStyle = '#3a0a1a'; ctx.lineWidth = 10; ctx.beginPath();
  RUN.key_share.forEach((v, i) => { const x = 100 + (i / LAST) * 1240, y = 940 - v * 800; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
  for (const st of [10000, 14000]) { const i = st / 250, x = 100 + (i / LAST) * 1240, y = 940 - RUN.key_share[i] * 800; dot(ctx, x, y, 14, '#3a0a1a');
    text(ctx, `${fmtInt(st)}: ${pct(RUN.key_share[i], 0)}`, x + 24, y + 44, { size: 44, family: COND, weight: 700, color: '#3a0a1a', sx: 0.84 }); }
  text(ctx, `k = 1·12·20·34·38  POWER SHARE ${pct(RUN.key_share[0])} → ${pct(RUN.key_share[LAST])}`, 110, 1030, { size: 58, family: COND, weight: 700, color: '#3a0a1a', sx: 0.84 });
});
shot(77.37, 77.62, 'mug_cv', (ctx) => {
  fill(ctx, '#c8a0e0');
  ctx.save(); ctx.strokeStyle = '#1a0a2a'; ctx.lineWidth = 10; ctx.beginPath();
  RUN.cv.forEach((v, i) => { const x = 100 + (i / LAST) * 1240, y = 940 - (v / 0.5) * 800; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
  text(ctx, `EMBEDDING r-CV ${RUN.cv[0].toFixed(2)} → ${RUN.cv[LAST].toFixed(3)}  (0 = perfect circle)`, 110, 1030, { size: 56, family: COND, weight: 700, color: '#1a0a2a', sx: 0.84 });
});
shot(77.62, 77.75, 'red_table', (ctx) => { fill(ctx, '#b80a08'); ctx.save(); ctx.globalAlpha = 0.5; ctx.globalCompositeOperation = 'multiply'; drawCayley(ctx, -200, -300, 0.9, 0.3); ctx.restore(); });
shot(77.75, 77.87, 'pink_burst', (ctx, lt, t, fx) => {
  fill(ctx, '#f08ab0'); fx.bloom = 0;
  const F_ = fourierAt(stepAt(t));
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let n = 1; n < 97; n++) { const k = n <= 48 ? n : 97 - n, a = (n / 97) * Math.PI * 2, L = Math.sqrt(F_[k - 1]) * 2400;
    ctx.fillStyle = 'rgba(255,220,235,0.3)'; ctx.beginPath(); ctx.moveTo(720, 540); ctx.lineTo(720 + Math.cos(a - 0.02) * L, 540 + Math.sin(a - 0.02) * L); ctx.lineTo(720 + Math.cos(a + 0.02) * L, 540 + Math.sin(a + 0.02) * L); ctx.fill(); }
  ctx.restore();
});
shot(77.87, 78.12, 'table_flash', (ctx, lt, t, fx) => {
  fill(ctx, '#010401'); fx.bloom = 0.8; fx.thr = 0.5;
  ctx.save(); ctx.translate(720, 640); ctx.transform(1, 0, -0.3, 0.6, 0, 0); ctx.rotate(0.35); ctx.scale(2.4, 2.4); ctx.translate(-600, -1300); drawCayley(ctx, 0, 0, 1, 0, 'cayley_g', 80); ctx.restore();
  fx.flash = lt < 0.1 ? 0.8 : 0; fx.flashCol = [1, 0.95, 0.8];
});
shot(78.12, 78.62, 'plus_explosion', (ctx, lt, t, fx) => {
  fill(ctx, '#ffd23a'); fx.bloom = 1.5; fx.thr = 0.4;
  const u = seg(lt, 0, 0.5), w = lerp(120, 520, E.outCubic(u));
  ctx.fillStyle = '#fffbe6'; ctx.fillRect(720 - w / 2, -50, w, 1180); ctx.fillRect(-50, 540 - w / 2, 1540, w);
  if (lt > 0.3) { ctx.fillStyle = '#ff9a1a'; ctx.globalAlpha = seg(lt, 0.3, 0.5) * 0.6; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
});
shot(78.62, 78.87, 'berserk_dark', (ctx, lt, t, fx) => {
  fill(ctx, '#0a0310'); fx.bloom = 0.8; fx.thr = 0.35;
  drawEmb(ctx, 720, 540, 520, 0, { emb: embSnap(19000), color: '#5a2a8a', dot: 6, star: true, starAlpha: 0.3, starColor: '#3a1a6a' });
  dot(ctx, 600, 470, 10, '#9aff6a'); dot(ctx, 840, 470, 10, '#9aff6a');
});
shot(78.87, 79.25, 'commander_young', (ctx, lt, t, fx) => {
  fill(ctx, '#e8e0d0'); fx.bloom = 0;
  sil(ctx, 'gendo', 720 - 300 * 1.6, 100, 1.6, '#1a1612'); sil(ctx, 'gendoHands', 720 - 300 * 1.6, 100, 1.6, '#1a1612');
  const gx = 720, gy = 100 + 1.6 * 150;
  ctx.fillStyle = '#ff2a14'; ctx.fillRect(gx - 1.6 * 58, gy - 12, 1.6 * 46, 20); ctx.fillRect(gx + 1.6 * 12, gy - 12, 1.6 * 46, 20);
});
shot(79.25, 79.5, 'pencil_memo', (ctx) => {
  pencilPaper(ctx, 41);
  const M = plotMap(160, 200, 1100, 640, { x0: 0, x1: 3000, y0: 0, y1: 1 });
  const tr = [], va = [];
  for (let s = 0; s <= 3000; s += 50) { tr.push([M.X(s), M.Y(mAt('train_acc', s))]); va.push([M.X(s), M.Y(mAt('val_acc', s))]); }
  pencilLine(ctx, [[160, 200], [160, 840], [1260, 840]], 3, '#6a6a70', 2.5);
  pencilLine(ctx, tr, 5); pencilLine(ctx, va, 9);
  text(ctx, '丸暗記…', 700, 330, { size: 64, family: '"Klee One"', weight: 600, color: '#4a4a52' });
  text(ctx, 'val = 0 %', 900, 800, { size: 48, family: '"Klee One"', weight: 600, color: '#4a4a52' });
});
shot(79.5, 79.75, 'card_second', (ctx) => card(ctx, [{ s: 'SECOND', y: 470, size: 240, col: '#ff1e1e' }, { s: 'IMPACT', y: 770, size: 240, col: '#ff1e1e' }]));
shot(79.75, 80.12, 'white_descent', (ctx, lt, t, fx) => {
  fill(ctx, '#000'); fx.bloom = 0.9; fx.thr = 0.5;
  const M = plotMap(80, 160, 1280, 800, { x0: 0, x1: 16000, y0: 0, y1: 23 });
  plotMetric(ctx, M, 'val_loss', 0, 16000, '#f4f4f0', 16);
});
shot(80.12, 80.37, 'crater', (ctx, lt, t, fx) => {
  // satellite view of the impact: the embedding at val acc 50% (step ≈ G50), seen from orbit
  fill(ctx, '#140a2a'); fx.bloom = 0.9; fx.thr = 0.45;
  ctx.save(); ctx.translate(720, 600); ctx.scale(1.35, 0.42); ctx.rotate(lt * 0.2);
  const g = ctx.createRadialGradient(0, 0, 40, 0, 0, 520); g.addColorStop(0, '#ffe0a0'); g.addColorStop(0.3, '#ff5a1a'); g.addColorStop(0.75, '#c0102a'); g.addColorStop(1, 'rgba(60,10,60,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 520, 0, 7); ctx.fill();
  drawEmb(ctx, 0, 0, 420, 0, { emb: embSnap(RUN.G50), color: '#ffd0a0', dot: 8, star: false });
  ctx.restore();
  boxFill(ctx, 60, 60, 360, 70, '#e0140c'); monoText(ctx, `STEP ${fmtInt(RUN.G0)}`, 75, 110, 40, '#fff', { weight: 700, family: '"Liberation Mono"' });
  boxFill(ctx, 820, 950, 560, 70, '#e0140c'); monoText(ctx, `+${fmtInt(RUN.G50 - RUN.G0)} STEPS  VAL 50%`, 835, 1000, 40, '#fff', { weight: 700, family: '"Liberation Mono"' });
});
shot(80.37, 80.5, 'blue_void', (ctx, lt, t, fx) => {
  fill(ctx, '#04102e'); fx.bloom = 0.8; fx.thr = 0.5;
  drawEmb(ctx, 720, 540, 150, 0, { emb: embSnap(26000), color: '#bfe0ff', dot: 3, star: true, starAlpha: 0.35 });
});
shot(80.5, 80.75, 'pencil_grok', (ctx) => {
  pencilPaper(ctx, 47);
  const M = plotMap(140, 180, 1160, 680, { x0: 0, x1: 30000, y0: 0, y1: 1 });
  const va = [], tr = [];
  for (let s = 0; s <= 30000; s += 250) { va.push([M.X(s), M.Y(mAt('val_acc', s))]); tr.push([M.X(s), M.Y(mAt('train_acc', s))]); }
  pencilLine(ctx, [[140, 180], [140, 860], [1300, 860]], 13, '#6a6a70', 2.5);
  pencilLine(ctx, tr, 15, '#8a8a90', 2); pencilLine(ctx, va, 17, '#3a3a42', 4);
  // note to the right of the jump, with a pencil arrow pointing at val acc = 50 %
  const nx = M.X(RUN.G50) + 150;
  text(ctx, 'grokking!', nx, M.Y(0.5) + 16, { size: 70, family: '"Klee One"', weight: 600, color: '#3a3a42' });
  pencilLine(ctx, [[nx - 16, M.Y(0.5) - 4], [M.X(RUN.G50) + 14, M.Y(0.5)]], 19, '#3a3a42', 3);
  pencilLine(ctx, [[M.X(RUN.G50) + 34, M.Y(0.5) - 14], [M.X(RUN.G50) + 14, M.Y(0.5)], [M.X(RUN.G50) + 34, M.Y(0.5) + 14]], 23, '#3a3a42', 3);
  text(ctx, `step ≈ ${fmtInt(Math.round(RUN.G50 / 10) * 10)}`, nx, M.Y(0.5) + 84, { size: 44, family: '"Klee One"', weight: 600, color: '#5a5a62' });
});
shot(80.75, 81.0, 'purple_eye', (ctx, lt, t, fx) => {
  fill(ctx, '#3a1a5a'); fx.bloom = 0.9; fx.thr = 0.5;
  boxFill(ctx, 0, 700, W, 380, '#22103a');
  dot(ctx, 900, 470, 150, '#061a0a');
  drawEmb(ctx, 900, 470, 120, 0, { emb: embSnap(30000), color: '#6aff5a', dot: 3, star: true, starAlpha: 0.5 });
});
shot(81.0, 81.12, 'card_adam', (ctx) => {
  fill(ctx, '#f6f5f0');
  text(ctx, 'ADAM', 690, 680, { size: 330, family: COND, weight: 700, color: '#050505', align: 'center', sx: 0.9 });
  text(ctx, 'W', 1118, 680, { size: 130, family: COND, weight: 700, color: '#050505', sx: 0.9 });
});
shot(81.12, 81.37, 'profile_cyan', (ctx, lt) => {
  fill(ctx, '#5ac8e0');
  for (let i = 0; i < 6; i++) poly(ctx, [[i * 300 - 200 + lt * 200, 0], [i * 300 - 60 + lt * 200, 0], [i * 300 + 300 + lt * 200, 1080], [i * 300 + 160 + lt * 200, 1080]], { fill: '#8ae0f0' });
  sil(ctx, 'profile', 260, 80, 1.6, '#0a1a24');
});
shot(81.37, 81.62, 'green_grid', (ctx, lt, t, fx) => {
  fill(ctx, '#010201'); fx.bloom = 0.35; fx.thr = 0.7;
  const G = '#3cd26a', cols = ['#2a4aff', '#39c0ff', '#ffe03a', '#ff8a1a', '#ff2a1a'];
  for (let k = 0; k < 48; k++) {
    const cx = 60 + (k % 8) * 170, cy = 110 + Math.floor(k / 8) * 158;
    ctx.save(); ctx.strokeStyle = G; ctx.lineWidth = 1.5;
    ctx.strokeRect(cx + 0.5, cy + 0.5, 130, 120); ctx.beginPath(); ctx.moveTo(cx + 40, cy); ctx.lineTo(cx + 40, cy + 120); ctx.moveTo(cx + 130, cy + 60); ctx.lineTo(cx + 150, cy + 60); ctx.lineTo(cx + 150, cy + 90); ctx.stroke(); ctx.restore();
    monoText(ctx, 'k' + String(k + 1).padStart(2, '0'), cx + 4, cy + 24, 22, G);
    for (let j = 0; j < 10; j++) {   // power of this frequency at 10 snapshots (every 3,000 steps)
      const v = RUN.fourier[j * 12][k], lvl = clamp(Math.floor(Math.sqrt(v / 0.17) * 5), 0, 4);
      boxFill(ctx, cx + 46 + j * 8, cy + 116 - 10 - lvl * 20, 6, 10 + lvl * 20, cols[lvl]);
    }
  }
  monoText(ctx, `${RUN.key.length} KEY FREQUENCIES   pattern BLOOD TYPE : BLUE`, 360, 66, 32, '#ff8a1a');
  monoText(ctx, '1100001', 1380, 66, 32, '#ff8a1a', { align: 'right' });
  monoText(ctx, '111010100110000', 60, 1062, 28, '#ff8a1a');
});
shot(81.62, 82.62, 'director_turn', (ctx, lt, t, fx) => {
  fill(ctx, '#0a1830'); fx.bloom = 0.4; fx.thr = 0.7;
  boxFill(ctx, 380, 60, 1000, 700, '#061230');
  const M = plotMap(430, 120, 900, 560, { x0: 0, x1: 30000, y0: 0, y1: 1 });
  gridLines(ctx, 430, 120, 900, 560, 6, 4, '#1a3a7a', 1.5);
  plotMetric(ctx, M, 'train_acc', 0, 30000, '#6a8ad0', 4); plotMetric(ctx, M, 'val_acc', 0, stepAt(t), '#e8f2ff', 6);
  sil(ctx, 'profile', lerp(-90, -40, lt), 200, 1.55, '#000');
});

// ── 82.62 監督 card; 83.6 green slash ───────────────────────────────────────
shot(82.62, 83.7, 'director_card', (ctx, lt, t, fx) => {
  fill(ctx, '#000');
});
cred(82.62, 83.7, (o, t, a) => {
  credText(o, '監', 70, 150, 120, { sx: 1 }); credText(o, '督', 70, 280, 120, { sx: 1 });
  credText(o, '荷重減', 270, 520, 330, { sx: 0.9, ls: -6 });
  credText(o, '衰', 1100, 850, 330, { sx: 0.9 });
  const u = seg(t, 83.58, 83.7);
  if (u > 0) { o.save(); o.fillStyle = '#39ff4a'; const x = lerp(-900, 1600, u);
    o.beginPath(); o.moveTo(x - 700, 560); o.lineTo(x + 500, 470); o.lineTo(x + 520, 540); o.lineTo(x - 680, 640); o.closePath(); o.fill(); o.restore(); }
}, 0.0, 0.0);

// 83.70–86.10  columns of light (the full spectrum, k and 97−k) + the converged circle superimposed
shot(83.7, 86.1, 'light_bars', (ctx, lt, t, fx) => {
  const step = stepAt(t);
  fill(ctx, '#c42008'); fx.bloom = 0.9; fx.thr = 0.88;
  const F_ = fourierAt(step);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let n = 1; n < 97; n++) {
    const k = n <= 48 ? n : 97 - n, v = Math.sqrt(F_[k - 1] / 0.17);
    const x = (n - 0.5) * (W / 96);
    ctx.fillStyle = `rgba(255,${Math.round(150 + 90 * v)},${Math.round(40 + 120 * v * v)},${0.18 + 0.7 * v})`;
    ctx.fillRect(x - 5 - 4 * v, 0, 10 + 8 * v, H);
  }
  ctx.restore();
  // the "+" of the task, standing in the light like the unit with its arms spread (unit-01 purple, green trim)
  const sp = E.outCubic(seg(t, 83.7, 84.8));
  ctx.save(); ctx.translate(720, lerp(760, 520, sp)); ctx.scale(lerp(2.6, 1, sp), lerp(2.6, 1, sp));
  const arm = (x, y, w, h) => { ctx.fillStyle = '#07030c'; ctx.fillRect(x - 6, y - 6, w + 12, h + 12); ctx.fillStyle = '#2a1242'; ctx.fillRect(x, y, w, h); };
  arm(-560, -46, 1120, 92); arm(-46, -380, 92, 900);
  ctx.fillStyle = '#0d0616'; ctx.fillRect(-52, -52, 104, 104);
  ctx.fillStyle = '#6cff3a';
  for (const s_ of [-1, 1]) { ctx.fillRect(-540, s_ * 22 - 3, 480, 6); ctx.fillRect(60, s_ * 22 - 3, 480, 6); ctx.fillRect(s_ * 22 - 3, -360, 6, 300); ctx.fillRect(s_ * 22 - 3, 60, 6, 440); }
  ctx.restore();
  const da = seg(t, 85.1, 85.7);
  if (da > 0) { ctx.save(); ctx.globalAlpha = da * 0.85; drawEmb(ctx, 720, 520, 380, 0, { emb: embAt(step), color: '#eaf6ff', dot: 7, star: true, starAlpha: 0.55, starColor: '#cfe8ff' }); ctx.restore(); }
});

// 86.10–87.60  blue: the converged model
shot(86.1, 87.6, 'converged', (ctx, lt, t, fx) => {
  const close = t >= 87.25;
  crt(fx, { curve: 0.045, bloom: 0.4, thr: 0.7 });
  fill(ctx, close ? '#0a4a4a' : '#0a2466');
  const bl = close ? '#bff4ea' : '#cfe4ff';
  if (close) {
    ctx.save(); cam(ctx, 1.0 + 0.08 * (t - 87.25), 720, 540, 0, 0, -0.05);
    monoText(ctx, 'VAL ACC  STEP 30,000', 150, 330, 48, bl);
    seg7(ctx, (RUN.val_acc[NLOG - 1] * 100).toFixed(1), 150, 760, 360, '#e8fff8', { thick: 0.14 });
    ctx.restore(); return;
  }
  ctx.save();
  jpText(ctx, '学習完了', 90, 150, 80, bl, { weight: 900 });
  monoText(ctx, 'CONVERGED  RUN-01  (a+b) mod 97', 470, 140, 30, bl);
  const rows = [['STEP', '30,000'], ['TRAIN ACC', pct(RUN.train_acc[NLOG - 1])], ['VAL ACC', pct(RUN.val_acc[NLOG - 1])], ['‖W‖', RUN.wnorm[NLOG - 1].toFixed(1)],
    ['KEY FREQS k', RUN.key.join(' ')], ['KEY-5 POWER', pct(RUN.key_share[LAST])], ['EMB r-CV', RUN.cv[LAST].toFixed(3)]];
  rows.forEach(([k, v], i) => { monoText(ctx, k, 110, 290 + i * 100, 48, bl, { alpha: 0.85 }); monoText(ctx, v, 1330, 290 + i * 100, 64, '#ffffff', { align: 'right' }); });
  ctx.restore();
});
shot(87.6, 87.75, 'black', (ctx) => fill(ctx, '#000'));
shot(87.75, 88.2, 'smile', (ctx, lt, t, fx) => {
  fill(ctx, '#0a3a18'); fx.bloom = 1.0; fx.thr = 0.4;
  drawEmb(ctx, 720, 540, 360, 0, { emb: embSnap(30000), color: '#d0ffd8', dot: 8, star: true, starAlpha: 0.5, starColor: '#9affb0', rot: lt * 0.4 });
});

// 88.20–90.50  製作, on red with dark scrawls (the converged star polygon, drawn by hand)
shot(88.2, 90.5, 'seisaku_red', (ctx, lt, t, fx) => {
  fill(ctx, '#b80e08');
  cloudLayer(ctx, 'endred', [[120, 6, 4], [200, 18, 10]], 51, t, { gw: 30, gh: 22, scale: 0.3, speed: 0.05, lo: 0.2, hi: 0.7 });
  // dark hand-scrawls: cos(2π·12x/97) sampled on the residues, drawn as a wobbling pen line, plus the task
  ctx.save(); ctx.strokeStyle = '#5e0505'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.85;
  for (const [y0, amp, k, sd] of [[250, 120, 12, 3], [860, 90, 1, 7]]) {
    ctx.beginPath();
    for (let x = 0; x <= 40; x++) { const X = -60 + x * 40, j = (vnoise(x * 0.6, sd) - 0.5) * 26; const Y = y0 - Math.cos((2 * Math.PI * k * x) / 97) * amp + j; x ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
    ctx.stroke();
  }
  ctx.restore();
  text(ctx, '(a+b) mod 97', 120, 470, { size: 130, family: '"Klee One"', weight: 600, color: '#6a0606', rot: -0.12, alpha: 0.55 });
  fx.flash = seg(t, 90.05, 90.5); fx.flashCol = [0, 0, 0];
});
cred(88.25, 90.5, (o, t, a) => {
  credText(o, '製作', 430, 590, 46);
  text(o, 'grokking.py', 560, 540, { size: 96, family: COND, weight: 700, color: P.white, sx: 0.86 });
  text(o, 'NumPy', 560, 660, { size: 96, family: COND, weight: 700, color: P.white, sx: 0.86 });
}, 0.15, 0.0);
