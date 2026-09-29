// ─────────────────────────────────────────────────────────────────────────────
//  23.4 – 66.8 : verse A (training starts, train acc climbs), verse B (memorization),
//                pre-chorus (the plateau; ‖W‖ decays; the 活動限界 timer runs to G0).
// ─────────────────────────────────────────────────────────────────────────────
const logLine = (i) => {
  const s = RUN.steps[i];
  return `${s} train ${RUN.train_loss[i].toFixed(3)}/${RUN.train_acc[i].toFixed(3)}  val ${RUN.val_loss[i].toFixed(3)}/${RUN.val_acc[i].toFixed(3)}  |w| ${RUN.wnorm[i].toFixed(1)}`;
};

// ── verse A: the main screen (blue), rendered into its own 1440×1080 surface ─
function mainScreen(g, step, t) {
  const bl = '#dcecff', dim = '#5a86d8', or = '#ffa23a';
  g.fillStyle = '#0c3290'; g.fillRect(0, 0, W, H);
  // phosphor unevenness of the big screen (reads like the painted sky of the original)
  cloudLayer(g, 'skyscr', [[10, 44, 140], [30, 84, 190]], 5, t, { gw: 30, gh: 22, speed: 0.04, scale: 0.26, lo: 0.35, hi: 0.8, blur: 1.2 });
  jpText(g, 'MAGI', 70, 96, 44, bl, { family: COND, weight: 700, sx: 0.9 });
  jpText(g, '学習経過監視', 190, 94, 38, bl, { weight: 900 });
  // step counter
  jpText(g, '経過ステップ', 1000, 96, 26, bl, { weight: 700 });
  seg7(g, String(Math.floor(step)).padStart(4, '0'), 1000, 230, 110, '#f4f8ff', { thick: 0.14, ghost: 'rgba(160,190,255,0.10)' });
  // the accuracy plot, as big as the sky
  const px = 90, py = 300, pw = 1260, ph = 580;
  const M = plotMap(px, py, pw, ph, { x0: 0, x1: 600, y0: 0, y1: 1 });
  for (let j = 0; j <= 4; j++) line(g, px, M.Y(j / 4), px + pw, M.Y(j / 4), dim, 1.5, j === 0 ? 0.9 : 0.45);
  for (let j = 1; j <= 4; j++) monoText(g, (j * 25) + '%', px + 4, M.Y(j / 4) - 8, 20, bl, { alpha: 0.7 });
  for (let i = 1; i <= 6; i++) monoText(g, String(i * 100), M.X(i * 100), py + ph + 32, 20, bl, { align: 'center', alpha: 0.7 });
  const ch = 1 / RUN.p;
  dashed(g, px, M.Y(ch), px + pw, M.Y(ch), or, 2, [12, 8]);
  monoText(g, 'CHANCE 1/97', px + pw, M.Y(ch) - 12, 20, or, { align: 'right' });
  const s1 = Math.min(step, 600);
  if (s1 > 0) {
    plotMetric(g, M, 'val_acc', 0, s1, or, 5);
    plotMetric(g, M, 'train_acc', 0, s1, '#f6faff', 9);
    for (let i = 0; i * DSTEP <= s1; i++) { const X = M.X(i * DSTEP), Y = M.Y(RUN.train_acc[i]); g.fillStyle = '#f6faff'; g.fillRect(X - 6, Y - 6, 12, 12); }
    const ta = mAt('train_acc', s1);
    monoText(g, `TRAIN ${pct(ta)}`, M.X(s1) + 20, M.Y(ta) + (ta > 0.9 ? 40 : -16), 30, '#f6faff');
    monoText(g, `VAL ${pct(mAt('val_acc', s1), 2)}`, M.X(s1) + 20, M.Y(0) - 36, 26, or);
  }
  // the newest stdout line
  const i = Math.floor(step / DSTEP);
  monoText(g, '$ ' + logLine(i), 90, 1010, 24, bl, { family: LOGF, alpha: 0.85 });
}

// ── verse B helpers: inverse-video amber screen ─────────────────────────────
function amberInverse(ctx, t, key = 'amb') {
  fill(ctx, '#f07814');
  cloudLayer(ctx, key, [[214, 88, 10], [255, 150, 40]], 7, t, { gw: 28, gh: 21, speed: 0.05, scale: 0.28, lo: 0.25, hi: 0.72, blur: 1.2 });
}
function trainLossPanel(ctx, step, ink) {
  const px = 170, py = 190, pw = 1040, ph = 640;
  const M = plotMap(px, py, pw, ph, { x0: 0, x1: 2000, y0: 1e-5, y1: 10, logy: true });
  gridLines(ctx, px, py, pw, ph, 4, 6, ink, 1, 0.35);
  ['1e+1', '1e+0', '1e-1', '1e-2', '1e-3', '1e-4', '1e-5'].forEach((l, j) => monoText(ctx, l, px - 14, py + (ph * j) / 6 + 8, 22, ink, { align: 'right' }));
  for (let i = 0; i <= 4; i++) monoText(ctx, fmtInt(i * 500), px + (pw * i) / 4, py + ph + 34, 22, ink, { align: 'center' });
  jpText(ctx, '学習損失', px, py - 50, 44, ink, { weight: 900 });
  monoText(ctx, 'TRAIN LOSS (nats, log)  logging floor 1e-5', px + 196, py - 56, 22, ink);
  plotMetric(ctx, M, 'train_loss', 0, Math.min(step, 2000), ink, 5, true, 1e-5);
  return M;
}

// ── computation graph laid out as the Tree of Life (10 nodes, 22 paths) ─────
const TREE = [[0.5, 0.05], [0.8, 0.19], [0.2, 0.19], [0.8, 0.43], [0.2, 0.43], [0.5, 0.53], [0.8, 0.69], [0.2, 0.69], [0.5, 0.8], [0.5, 0.95]];
const TREE_LAB = ['a + b', 'a', 'b', 'E[a]', 'E[b]', '[E_a ; E_b]', 'W₁x + b₁', 'ReLU', 'W₂h + b₂', 'softmax'];
const TREE_SUB = ['QVAESTIO', 'INDEX I', 'INDEX II', 'EMBEDDING 128', 'EMBEDDING 128', 'CONCAT 256', 'LINEAR 256×256', 'RECTIFICATIO', 'LOGITS 97', 'c = (a+b) mod 97'];
const TREE_PATHS = [[0, 1], [0, 2], [1, 2], [0, 5], [1, 3], [2, 4], [1, 5], [2, 5], [1, 4], [2, 3], [3, 4], [3, 5], [4, 5], [3, 6], [4, 7], [5, 6], [5, 7], [6, 7], [6, 8], [7, 8], [5, 8], [8, 9]];
const TREE_FWD = new Set(['0-1', '0-2', '1-3', '2-4', '3-5', '4-5', '5-6', '6-7', '7-8', '8-9']);
function drawTree(ctx, x, y, w, h, p, col) {
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col;
  const P_ = (i) => [x + TREE[i][0] * w, y + TREE[i][1] * h];
  const r = w * 0.085;
  TREE_PATHS.forEach(([a, b], i) => {
    const pp = seg(p, i * 0.025, i * 0.025 + 0.35); if (pp <= 0) return;
    const A = P_(a), B = P_(b); const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L;
    const sx = A[0] + ux * r, sy = A[1] + uy * r, ex = B[0] - ux * r, ey = B[1] - uy * r;
    const fwd = TREE_FWD.has(a + '-' + b);
    ctx.lineWidth = fwd ? 4 : 2; ctx.globalAlpha = fwd ? 1 : 0.75;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(lerp(sx, ex, pp), lerp(sy, ey, pp)); ctx.stroke();
    if (fwd) { ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx - uy * 7, sy + ux * 7); ctx.lineTo(lerp(sx, ex, pp) - uy * 7, lerp(sy, ey, pp) + ux * 7); ctx.stroke(); }
  });
  ctx.globalAlpha = 1;
  TREE.forEach((_, i) => {
    const pp = seg(p, 0.05 + i * 0.05, 0.3 + i * 0.05); if (pp <= 0) return;
    const [cx, cy] = P_(i);
    ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pp); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r - 8, 0, Math.PI * 2 * pp); ctx.stroke();
    if (pp > 0.6) {
      text(ctx, TREE_LAB[i], cx, cy + 9, { size: r * 0.42, family: '"EB Garamond"', weight: 500, style: 'italic', color: col, align: 'center' });
      text(ctx, TREE_SUB[i], cx, cy + r + 26, { size: 17, family: '"EB Garamond"', weight: 500, color: col, align: 'center', ls: 1.5 });
    }
  });
  text(ctx, 'SYSTEMA PERCEPTRONICVM', x + w * 0.03, y + h * 0.08, { size: 34, family: '"Cinzel"', weight: 700, color: col, alpha: seg(p, 0.1, 0.4), ls: 3 });
  text(ctx, 'X DIVINO NVMERO XCVII', x + w * 0.97, y + h * 0.08, { size: 26, family: '"Cinzel"', weight: 400, color: col, align: 'right', alpha: seg(p, 0.2, 0.5), ls: 2 });
  ctx.restore();
}

// ── pre-chorus: the 活動限界 display, recreated ──────────────────────────────
function timerPanel(ctx, secs, test, t) {
  const Y = '#ffd21a', YD = '#caa40e';
  // bezel: orange → yellow → green, painted like the lit frame of the original panel
  const g = ctx.createLinearGradient(-60, 0, 1400, 0);
  g.addColorStop(0, '#ff6a12'); g.addColorStop(0.35, '#ffb21e'); g.addColorStop(0.62, '#b8e03a'); g.addColorStop(1, '#2fae4a');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-200, -120); ctx.lineTo(1500, -260); ctx.lineTo(1500, -150); ctx.lineTo(60, 0); ctx.lineTo(0, 760); ctx.lineTo(-200, 820); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(60, 0); ctx.lineTo(1500, -150); ctx.lineTo(1500, 900); ctx.lineTo(0, 900); ctx.lineTo(0, 760); ctx.closePath(); ctx.fill();
  line(ctx, 76, 18, 1480, -128, '#ffcf3a', 2, 0.9); line(ctx, 76, 18, 18, 740, '#ffcf3a', 2, 0.9);
  // label: 汎化開始まで / TIME TO GENERALIZATION:
  ctx.save(); ctx.translate(110, 150); ctx.rotate(-0.1);
  boxStroke(ctx, 0, -52, 250, 64, Y, 3);
  jpText(ctx, '汎化開始まで', 12, -6, 40, Y, { weight: 900, sx: 0.86 });
  condText(ctx, 'TIME TO GENERALIZATION:', 270, -16, 24, Y, { sx: 0.8 });
  condText(ctx, 'L_val < ln 97', 12, 40, 22, YD, { sx: 0.85 });
  ctx.restore();
  // digits
  ctx.save(); ctx.translate(100, 590); ctx.rotate(-0.1);
  const str = test ? '8:88:88' : fmtTimer(secs);
  seg7(ctx, str, 0, 0, 215, Y, { thick: 0.14, slant: 0.1, space: 0.15 });
  ctx.restore();
  // 内部 INTERNAL / 外部 EXTERNAL
  ctx.save(); ctx.translate(930, 20); ctx.rotate(-0.1);
  boxStroke(ctx, 0, 0, 330, 180, Y, 3);
  jpText(ctx, test ? '外部' : '内部', 26, 100, 92, Y, { weight: 900, sx: 0.9 });
  condText(ctx, test ? 'EXTERNAL' : 'INTERNAL', 30, 158, 44, Y, { sx: 0.82 });
  hazard(ctx, 250, 6, 72, 168, '#e8140c', '#000', 16);
  boxStroke(ctx, -10, 206, 360, 100, Y, 3);
  jpText(ctx, '荷重減衰システム', 8, 258, 42, Y, { weight: 900, sx: 0.84 });
  condText(ctx, 'WEIGHT DECAY SYSTEM   λ = 1.0', 10, 292, 24, Y, { sx: 0.8 });
  ctx.restore();
  // lr buttons on the green strip (the STOP / SLOW / NORMAL / RACING row)
  ctx.save(); ctx.translate(210, 700); ctx.rotate(-0.1);
  const gs = ctx.createLinearGradient(0, 0, 900, 0); gs.addColorStop(0, '#cfe03a'); gs.addColorStop(1, '#46b43c');
  ctx.fillStyle = gs; ctx.fillRect(-30, -20, 940, 120);
  ['STOP', 'lr 1e-4', 'lr 1e-3', 'lr 1e-2'].forEach((l, i) => {
    const on = i === 2;
    boxFill(ctx, i * 215, 0, 190, 64, on ? '#ff2a14' : '#140a02');
    boxStroke(ctx, i * 215, 0, 190, 64, '#000', 3);
    condText(ctx, l, i * 215 + 95, 45, 34, on ? '#ffe36a' : Y, { align: 'center', sx: 0.84 });
  });
  ctx.restore();
}

// ── Fourier power as the neon-green angled bar display (3D, projected) ──────
function lookProj(eye, at, f, cx, cy) {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nm = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };
  const z = nm(sub(at, eye)), x = nm(cr([0, 1, 0], z)), y = cr(z, x);
  return (p) => { const d = sub(p, eye); const X = d[0] * x[0] + d[1] * x[1] + d[2] * x[2], Yv = d[0] * y[0] + d[1] * y[1] + d[2] * y[2], Z = d[0] * z[0] + d[1] * z[1] + d[2] * z[2];
    return [cx + (f * X) / Z, cy - (f * Yv) / Z, Z]; };
}
function greenBars(ctx, step, lt) {
  fill(ctx, '#020302');
  // red planes (upper right), as in the original display
  poly(ctx, [[560, -20], [1460, -20], [1460, 420], [900, 300]], { fill: '#d4120c' });
  poly(ctx, [[1000, 330], [1460, 440], [1460, 520], [1060, 420]], { fill: '#8a0806' });
  line(ctx, 520, 0, 1460, 360, '#ff5a2a', 2, 0.8); line(ctx, 900, 300, 880, 1080, '#ff5a2a', 1.5, 0.6);
  const F_ = fourierAt(step);
  const eye = [-2.6 + lt * 1.2, 3.0, -3.0 + lt * 2], at = [6, 0, 8];
  const pr = lookProj(eye, at, 640, 500, 600);
  const sc = 14 / 0.04;             // power 0.04 → 14 world units
  for (let k = 47; k >= 0; k--) {
    const z0 = k * 1.0, z1 = z0 + 0.62, L = F_[k] * sc;
    const q = [[0, 0, z0], [L, 0, z0], [L, 0, z1], [0, 0, z1]].map(pr);
    if (q.some((v) => v[2] <= 0.3)) continue;
    poly(ctx, q, { fill: '#34ff9c' });
    if ((k + 1) % 4 === 0 || RUN.key.includes(k + 1)) {
      const a = pr([-0.6, 0, z0 + 0.3]);
      text(ctx, 'k' + String(k + 1).padStart(2, '0'), a[0], a[1], { size: clamp(500 / a[2], 10, 44), family: COND, weight: 700, color: '#ff4a22', align: 'right', sx: 0.85 });
    }
  }
  // uniform power line 1/48
  const u0 = pr([sc / 48, 0, -0.5]), u1 = pr([sc / 48, 0, 48]);
  line(ctx, u0[0], u0[1], u1[0], u1[1], '#ff4a22', 2.5);
  const ul = pr([sc / 48 + 0.4, 0, 3]);
  text(ctx, 'UNIFORM 1/48', ul[0], ul[1], { size: 30, family: COND, weight: 700, color: '#ff4a22', rot: -0.5, sx: 0.85 });
  monoText(ctx, `FOURIER POWER / EMBEDDING   STEP ${fmtInt(step)}`, 40, 1040, 22, '#ff4a22');
}

// ── verse A shot: one long take pulling back from the log to the control room ──
shot(23.4, 37.9, 'verseA_main', (ctx, lt, t, fx) => {
  const step = stepAt(t);
  const [sc, sg] = off('main', W, H);
  mainScreen(sg, step, t);
  // double exposure: an operator's profile fades in over the screen (the face over the sky)
  const pa = 0.5 * E.inOutSine(seg(t, 24.3, 26.0));
  if (pa > 0) { sg.save(); sg.globalAlpha = pa; sil(sg, 'profile', -120 + lt * 6, 60, 1.75, '#061a52'); sg.restore(); }
  fill(ctx, '#020304');
  fx.bloom = 0.3; fx.thr = 0.8;
  const pull = E.inOutSine(seg(t, 33.2, 37.9));
  const s = lerp(1.0 + 0.05 * seg(t, 23.4, 33.2), 0.74, pull);
  const fy0 = lerp(540, 610, pull);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-720, -fy0);
  boxFill(ctx, -46, -46, W + 92, H + 92, '#0c0e10');
  ctx.save(); ctx.beginPath(); ctx.roundRect(-8, -8, W + 16, H + 16, 38); ctx.clip(); ctx.drawImage(sc, 0, 0); ctx.restore();
  // black standing silhouettes slide in on the right (people in front of the big screen)
  const sl = (a, b) => (1 - E.outCubic(seg(t, a, b))) * 700;
  sil(ctx, 'stand', 1130 + sl(26.3, 27.1), 470, 1.5, '#000');
  sil(ctx, 'stand', 1290 + sl(30.2, 31.0), 430, 1.62, '#000');
  ctx.restore();
  // seated operators in the foreground rise into frame as the camera pulls back
  const up = (1 - E.outCubic(seg(t, 34.0, 36.6))) * 500;
  sil(ctx, 'opB', 1010, 850 + up, 2.3);
  sil(ctx, 'opA', 560, 880 + up, 2.2);
  sil(ctx, 'opC', 80, 840 + up, 2.4);
});
cred(23.45, 26.25, (o, t, a) => {
  credit(o, 'キャラクターデザイン', ['埋め込み 97×128'], 640, 190, { alpha: a, nameSize: 76, roleSize: 34 });
  credit(o, 'メカニックデザイン', ['MLP 256×256', 'ReLU'], 640, 320, { alpha: a, nameSize: 76, roleSize: 34 });
}, 0.1, 0.1);
cred(26.35, 29.85, (o, t, a) => { credit(o, '副監督', ['AdamW', 'β 0.9 · 0.98'], 940, 760, { alpha: a, nameSize: 80, roleSize: 38 }); });
cred(29.95, 33.35, (o, t, a) => {
  credit(o, '美術監督', ['フーリエ基底'], 290, 130, { alpha: a, nameSize: 80, roleSize: 38 });
  credit(o, '色彩設定', ['蛍光体 P1・P3'], 890, 940, { alpha: a, nameSize: 80, roleSize: 38 });
});
cred(34.0, 37.85, (o, t, a) => {
  credit(o, '撮影監督', ['主周波数平面への射影'], 690, 110, { alpha: a, nameSize: 71, roleSize: 38 });
  credit(o, '音響監督', ['交差エントロピー'], 640, 960, { alpha: a, nameSize: 76, roleSize: 38 });
  credit(o, '音響制作', ['log-softmax'], 640, 1040, { alpha: a, nameSize: 60, roleSize: 34 });
});

// S11 37.9–39.3  inverse amber: train loss plunging on a log scale; a black hand reaches in
// S12 39.3–41.6  the green computation-graph "Tree of Life" draws over hand and screen
shot(37.9, 41.6, 'verseB_hand_tree', (ctx, lt, t, fx) => {
  const step = stepAt(t);
  crt(fx, { curve: 0.04, bloom: 0 });
  amberInverse(ctx, t);
  const ink = '#2a0c00';
  ctx.save(); cam(ctx, 1 + 0.03 * lt);
  const M = trainLossPanel(ctx, step, ink);
  const s1 = Math.min(step, 2000), tl = mAt('train_loss', s1, true);
  ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(M.X(s1), M.Y(Math.max(tl, 1e-5)), 9, 0, 7); ctx.fill();
  monoText(ctx, `${tl < 1.5e-5 ? '<1e-5' : tl.toExponential(2)}  @ ${fmtInt(s1)}`, M.X(s1) + 18, M.Y(Math.max(tl, 1e-5)) - 14, 26, ink);
  ctx.restore();
  // the hand (enters 38.2–39.0)
  const hu = E.outCubic(seg(t, 38.1, 39.1));
  sil(ctx, 'hand', lerp(380, 1060, hu), lerp(-750, -260, hu), 2.3, '#070201', { flip: true });
  // Tree of Life = forward pass
  const tp = seg(t, 39.3, 40.9);
  if (tp > 0) {
    fx.bloom = 0;
    boxFill(ctx, 0, 0, W, H, '#2a0800', 0.42 * E.outCubic(seg(t, 39.3, 39.6)));
    ctx.save(); ctx.globalAlpha = 0.9; drawTree(ctx, 254, 44, 940, 1000, tp, '#062a0c'); ctx.restore();
    drawTree(ctx, 250, 40, 940, 1000, tp, '#3cff72');
  }
});

// S13 41.6–48.4  orange: validation loss climbs past 22 nats (worse than a uniform guess); an operator in profile
shot(41.6, 48.4, 'verseB_valloss_profile', (ctx, lt, t, fx) => {
  const step = stepAt(t);
  crt(fx, { curve: 0.04, bloom: 0 });
  amberInverse(ctx, t, 'amb2');
  const ink = '#2a0c00';
  ctx.save(); cam(ctx, 1.02 + 0.05 * (lt / 6.8), 900, 540);
  const px = 560, py = 470, pw = 780, ph = 440;
  const M = plotMap(px, py, pw, ph, { x0: 0, x1: 3000, y0: 0, y1: 25 });
  gridLines(ctx, px, py, pw, ph, 6, 5, ink, 1, 0.3);
  for (let j = 0; j <= 5; j++) monoText(ctx, String(j * 5), px + pw + 16, M.Y(j * 5) + 8, 22, ink);
  for (let i = 0; i <= 3; i++) monoText(ctx, fmtInt(i * 1000), M.X(i * 1000), py + ph + 34, 22, ink, { align: 'center' });
  dashed(ctx, px, M.Y(RUN.LN_P), px + pw, M.Y(RUN.LN_P), ink, 2, [12, 8]);
  monoText(ctx, 'ln 97 = 4.575  (uniform guess)', px + 10, M.Y(RUN.LN_P) - 12, 22, ink);
  jpText(ctx, '検証損失', px + pw, py + ph + 96, 48, ink, { weight: 900, align: 'right' });
  monoText(ctx, 'VAL LOSS (nats)', px + pw - 230, py + ph + 90, 24, ink, { align: 'right' });
  plotMetric(ctx, M, 'val_loss', 0, Math.min(step, 3000), ink, 5);
  plotMetric(ctx, M, 'train_loss', 0, Math.min(step, 3000), ink, 2.5);
  const s1 = Math.min(step, 3000), vl = mAt('val_loss', s1);
  monoText(ctx, vl.toFixed(2), M.X(s1) + 16, M.Y(vl) - 12, 34, ink);
  monoText(ctx, 'train', M.X(s1) + 16, M.Y(0) - 12, 22, ink);
  ctx.restore();
  const pu = E.outCubic(seg(t, 41.6, 42.4));
  sil(ctx, 'profile', lerp(-700, -130, pu), 70, 1.72, '#080201');
});
cred(42.45, 44.8, (o, t, a) => {
  credit(o, '音楽', ['三角関数'], 590, 140, { alpha: a, nameSize: 85, roleSize: 40 });
  credit(o, '音楽協力', ['NumPy'], 760, 960, { alpha: a, nameSize: 80, roleSize: 38 });
});
cred(44.9, 48.35, (o, t, a) => {       // the two-column theme-song block → train/val sheet (live numbers)
  const step = stepAt(t);
  o.globalAlpha = a;
  const L = 560, Rx = 1000, y0 = 120;
  credText(o, '訓練集合', L, y0, 30, { align: 'center' }); credText(o, '検証集合', Rx, y0, 30, { align: 'center' });
  credText(o, '「a + b ≡ c (mod 97)」', L, y0 + 46, 34, { align: 'center' }); credText(o, '「未見の 70%」', Rx, y0 + 46, 34, { align: 'center' });
  const rows = [['件数', fmtInt(RUN.ntrain), fmtInt(RUN.nval)], ['正解率', pct(mAt('train_acc', step)), pct(mAt('val_acc', step), 2)],
    ['損失', mAt('train_loss', step, true) < 1.5e-5 ? '< 0.00001' : mAt('train_loss', step, true).toFixed(5), mAt('val_loss', step).toFixed(2)], ['状態', '丸暗記', '偶然以下']];
  rows.forEach(([k, l, r], i) => {
    const y = y0 + 112 + i * 52;
    credText(o, k, 330, y, 30);
    credText(o, l, L, y, 36, { align: 'center' }); credText(o, r, Rx, y, 36, { align: 'center' });
  });
  credText(o, `（乱数シード 0 ・ 全 ${fmtInt(RUN.ntrain + RUN.nval)} 対）`, 780, y0 + 112 + 4 * 52 + 8, 26, { align: 'center' });
}, 0.12, 0.1);

// S14 48.4–50.0  pink hardcopies in split panes (the four metrics at the same step)
shot(48.4, 50.0, 'verseB_hardcopy', (ctx, lt, t, fx) => {
  const step = stepAt(t);
  fill(ctx, '#140c0e');
  const ink = '#2a1620', paper = '#f2c8ce';
  ctx.save(); cam(ctx, 1.02 + 0.04 * (lt / 1.6), 720, 540, -20 * lt, 0);
  const panes = [
    { x: 40, y: 40, k: 'train_acc', t: 'TRAIN ACC', y0: 0, y1: 1, v: pct(mAt('train_acc', step)) },
    { x: 730, y: 40, k: 'val_acc', t: 'VAL ACC', y0: 0, y1: 1, v: pct(mAt('val_acc', step), 2) },
    { x: 40, y: 560, k: 'train_loss', t: 'TRAIN LOSS (log)', y0: 1e-5, y1: 10, log: true, v: '< 1e-5' },
    { x: 730, y: 560, k: 'val_loss', t: 'VAL LOSS', y0: 0, y1: 25, v: mAt('val_loss', step).toFixed(2) },
  ];
  panes.forEach((p, i) => {
    boxFill(ctx, p.x, p.y, 670, 480, paper);
    for (let r = 0; r < 12; r++) boxFill(ctx, p.x, p.y + r * 40, 670, 20, '#e9b8c0', 0.5);   // carbon-form bars
    const M = plotMap(p.x + 70, p.y + 90, 560, 330, { x0: 0, x1: 3000, y0: p.y0, y1: p.y1, logy: p.log });
    boxStroke(ctx, p.x + 70, p.y + 90, 560, 330, ink, 1.5);
    plotMetric(ctx, M, p.k, 0, Math.min(step, 3000), ink, 3.5, !!p.log, p.log ? 1e-5 : 0);
    monoText(ctx, p.t, p.x + 24, p.y + 50, 30, ink, { family: '"Liberation Mono"', weight: 700 });
    monoText(ctx, p.v, p.x + 646, p.y + 50, 34, ink, { align: 'right', family: '"Liberation Mono"', weight: 700 });
    monoText(ctx, `STEP ${fmtInt(step)}`, p.x + 646, p.y + 462, 20, ink, { align: 'right', family: '"Liberation Mono"' });
  });
  ctx.restore();
});

// S15 50.0–50.83  extreme close-up: the embedding scope in red — an iris of 97 points that is not yet a circle
shot(50.0, 50.83, 'verseB_eye', (ctx, lt, t, fx) => {
  const step = stepAt(t);
  crt(fx, { curve: 0.06, bloom: 0.8, thr: 0.45 });
  fill(ctx, '#0a0101');
  const cx = 720 + 30 * lt, cy = 540, R = 470;
  ctx.save(); cam(ctx, 1.25 + 0.08 * lt, cx, cy);
  ring(ctx, cx, cy, R * 1.12, '#5a0806', 3); ring(ctx, cx, cy, R * 0.56, '#3a0604', 1.5);
  for (let i = 0; i < 72; i++) { const a = (i / 72) * Math.PI * 2, r0 = R * 1.12, r1 = r0 - (i % 6 === 0 ? 34 : 14); line(ctx, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, '#6a0a08', 2); }
  line(ctx, cx - R * 1.2, cy, cx + R * 1.2, cy, '#3a0604', 1.5); line(ctx, cx, cy - R * 1.2, cx, cy + R * 1.2, '#3a0604', 1.5);
  drawEmb(ctx, cx, cy, R, step, { color: '#ff3a20', dot: 9, star: true, starAlpha: 0.4, starW: 1.6, starColor: '#c8140c' });
  const e = embAt(step);
  monoText(ctx, `EMB r-CV ${e.cv.toFixed(3)}   PLANE k=${e.k}   STEP ${fmtInt(step)}`, cx - 400, cy + R * 1.12 + 70, 30, '#ff3a20');
  ctx.restore();
});

// S16 50.83–51.33  machine detail: the line printer's green-bar tractor feed
shot(50.83, 51.33, 'verseB_printer', (ctx, lt, t, fx) => {
  const step = stepAt(t);
  fill(ctx, '#0a0b0a');
  ctx.save(); ctx.translate(720, 560); ctx.rotate(-0.2); ctx.scale(1.25, 1.25); ctx.translate(-720, -540 - lt * 120);
  boxFill(ctx, 180, -300, 1080, 1700, '#e9efe6');
  for (let r = 0; r < 34; r++) boxFill(ctx, 230, -300 + r * 100, 980, 50, '#c9e2c8');
  for (let r = 0; r < 60; r++) { dot(ctx, 206, -280 + r * 30, 8, '#0a0b0a'); dot(ctx, 1234, -280 + r * 30, 8, '#0a0b0a'); }
  const last = Math.floor(step / DSTEP);
  for (let k = 0; k < 22; k++) { const i = last - 21 + k; if (i < 0) continue;
    monoText(ctx, logLine(i), 260, -40 + k * 50, 27, '#202a26', { family: '"Liberation Mono"' }); }
  ctx.restore();
  boxFill(ctx, 0, 0, W, 180, '#0e100f');
  line(ctx, 0, 180, W, 150, '#3a3d3c', 6);
});

// S17 51.33–51.83  stencil on the evaluation unit's armour plate
shot(51.33, 51.83, 'verseB_stencil', (ctx, lt, t, fx) => {
  fill(ctx, '#d9d4cc');
  cloudLayer(ctx, 'plate', [[196, 190, 182], [226, 222, 214]], 21, 0, { gw: 36, gh: 27, scale: 0.5, lo: 0.2, hi: 0.8, blur: 0.8 });
  ctx.save(); cam(ctx, 1.04 + 0.03 * lt, 720, 540, 0, 10 * lt, -0.04);
  const ink = '#8f8a84';
  const stencil = (s, x, y, size) => {
    text(ctx, s, x, y, { size, family: COND, weight: 700, color: ink, align: 'center', sx: 0.95 });
    ctx.save(); ctx.fillStyle = '#d6d1c9'; const w = measure(ctx, s, { size, family: COND, weight: 700, sx: 0.95 });
    for (let i = 0; i < s.length; i++) ctx.fillRect(x - w / 2 + ((i + 0.5) * w) / s.length - 3, y - size * 0.72, 6, size * 0.12);
    ctx.fillRect(x - w / 2, y - size * 0.36, w, size * 0.05); ctx.restore();
  };
  stencil('EVALUATION', 720, 330, 170);
  stencil(fmtInt(RUN.nval).replace(',', ''), 720, 560, 190);
  stencil('01', 720, 740, 120);
  stencil('TEST TYPE', 720, 930, 130);
  ctx.restore();
  poly(ctx, [[0, 0], [260, 0], [0, 1080]], { fill: '#1a1c1d' });
});

// S18 51.83–52.40  the 活動限界 display: segment test (外部), then the live countdown to G0 (内部)
shot(51.83, 52.4, 'pre_timer', (ctx, lt, t, fx) => {
  const step = stepAt(t);
  fill(ctx, '#000');
  fx.bloom = 0.55; fx.thr = 0.6;
  ctx.save(); ctx.translate(90 - lt * 40, 250 + lt * 10); ctx.transform(1, -0.02, -0.06, 1, 0, 0); ctx.scale(0.92, 0.92);
  timerPanel(ctx, timerSecs(step), lt < 0.14, t);
  ctx.restore();
});
// S19 52.40–52.83  neon-green angled bars: Fourier power per frequency (still ~uniform)
shot(52.4, 52.83, 'pre_greenbars', (ctx, lt, t, fx) => {
  fx.bloom = 0.45; fx.thr = 0.6;
  greenBars(ctx, stepAt(t), lt);
});

// S20 52.83–54.60  low angle on the ‖W‖ monitor (the unit in its cage), orange/black
shot(52.83, 54.6, 'pre_wnorm', (ctx, lt, t, fx) => {
  const step = stepAt(t);
  fill(ctx, '#e8560e');
  fx.bloom = 0;
  const u = lt / 1.77;
  // screen plane seen from below: trapezoid
  const c = [[250 - 30 * u, 60], [1190 + 30 * u, 60], [1440, 1080], [0, 1080]];
  const Q = quadMap(c);
  poly(ctx, c, { fill: '#050302' });
  // cage bars (grid on the tilted plane)
  ctx.save(); ctx.strokeStyle = '#4a1a06'; ctx.lineWidth = 3;
  for (let i = 0; i <= 12; i++) { const a = Q(i / 12, 0), b = Q(i / 12, 1); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  for (let j = 0; j <= 10; j++) { const v = 1 - Math.pow(1 - j / 10, 1.6); const a = Q(0, v), b = Q(1, v); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  ctx.restore();
  // ‖W‖ curve on the plane: u = step / 12000, v from ‖W‖ (0..100 → bottom..top)
  ctx.save(); ctx.strokeStyle = '#ff8a1c'; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.beginPath();
  const smax = 12000, sEnd = Math.min(step, smax);
  for (let s = 0; s <= sEnd; s += 50) { const v = 1 - Math.pow(1 - mAt('wnorm', s) / 110, 1.6); const p = Q(s / smax, 1 - v); s ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
  ctx.stroke(); ctx.restore();
  const wn = mAt('wnorm', step);
  ctx.save(); ctx.translate(820, 930); ctx.rotate(-0.02);
  jpText(ctx, '重みノルム', -640, -110, 54, '#ff8a1c', { weight: 900 });
  seg7(ctx, wn.toFixed(1), -640, 20, 110, '#ff8a1c', { thick: 0.14 });
  monoText(ctx, `‖W‖₂  peak ${RUN.WPEAK[1].toFixed(1)} @ step ${fmtInt(RUN.WPEAK[0])}   AdamW wd 1.0`, -250, 10, 26, '#ff8a1c');
  ctx.restore();
});
cred(52.9, 54.55, (o, t, a) => {
  o.globalAlpha = a;
  credText(o, 'オープニングアニメーション', 720, 130, 44, { align: 'center' });
  credit(o, '作画', ['順伝播', '逆伝播'], 640, 250, { nameSize: 90, roleSize: 40, alpha: 1 });
  credit(o, '演出', ['全バッチ勾配降下'], 640, 470, { nameSize: 90, roleSize: 40, alpha: 1 });
});

// S21 54.60–56.60  an operator in headset (54.6–55.6), then the val-loss readout, eyes-open close-up
shot(54.6, 56.6, 'pre_headset_digits', (ctx, lt, t, fx) => {
  const step = stepAt(t);
  const vl = mAt('val_loss', step);
  if (t < 55.6) {
    crt(fx, { curve: 0.0, bloom: 0.4, thr: 0.7 });
    fill(ctx, '#0a0502');
    // the screen he watches: val loss descending on a log axis (amber on black)
    const M = plotMap(560, 220, 780, 560, { x0: 0, x1: 12000, y0: 0.01, y1: 30, logy: true });
    gridLines(ctx, 560, 220, 780, 560, 6, 4, '#4a2a06', 1.5);
    plotMetric(ctx, M, 'val_loss', 0, step, '#ffae1a', 5, true, 0.01);
    dashed(ctx, 560, M.Y(RUN.LN_P), 1340, M.Y(RUN.LN_P), '#ff6a12', 2);
    monoText(ctx, 'ln 97', 1330, M.Y(RUN.LN_P) - 12, 24, '#ff6a12', { align: 'right' });
    monoText(ctx, `VAL LOSS ${vl.toFixed(2)}`, 560, 190, 34, '#ffae1a');
    sil(ctx, 'headset', -160 - lt * 30, 150, 1.75, '#000');
    ctx.save(); ctx.strokeStyle = '#000'; ctx.lineWidth = 22; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-160 - lt * 30 + 1.75 * 150, 150 + 1.75 * 330); ctx.quadraticCurveTo(-160 - lt * 30 + 1.75 * 250, 150 + 1.75 * 420, -160 - lt * 30 + 1.75 * 330, 150 + 1.75 * 300); ctx.stroke();
    ctx.lineWidth = 26; ctx.beginPath(); ctx.arc(-160 - lt * 30 + 1.75 * 190, 150 + 1.75 * 200, 1.75 * 128, -2.6, -0.5); ctx.stroke();
    ctx.restore();
  } else {
    crt(fx, { curve: 0.06, bloom: 0.6, thr: 0.5, roll: 0.6, rollPos: (t * 0.35) % 1 });
    fill(ctx, '#080401');
    ctx.save(); cam(ctx, 1.15 + 0.1 * (t - 55.6), 720, 540);
    jpText(ctx, '検証損失', 170, 330, 60, '#ffae1a', { weight: 900 });
    monoText(ctx, 'VAL LOSS / nats', 470, 322, 34, '#ffae1a');
    seg7(ctx, vl.toFixed(2).padStart(5, ' '), 170, 720, 300, '#ffae1a', { ghost: 'rgba(255,170,30,0.07)' });
    monoText(ctx, `> ln 97 = 4.575   STEP ${fmtInt(step)}   VAL ACC ${pct(mAt('val_acc', step), 2)}`, 170, 820, 30, '#ffae1a');
    ctx.restore();
  }
});

// S22 56.60–58.40  dark red: the spectrum in the dark; two frequencies flash white (the eyes)
shot(56.6, 58.4, 'pre_redspectrum', (ctx, lt, t, fx) => {
  const step = stepAt(t);
  fill(ctx, '#140102');
  fx.bloom = 0.8; fx.thr = 0.5;
  const F_ = fourierAt(step);
  const top = F_.map((v, k) => [v, k]).sort((a, b) => b[0] - a[0]).slice(0, 2).map((x) => x[1]);
  const flashA = (t >= 57.33 && t < 57.47), flashB = (t >= 57.87 && t < 58.0);
  ctx.save(); cam(ctx, 1.05 + 0.06 * (lt / 1.8), 720, 700);
  const bx = 120, bw = 1200 / 48, base = 900;
  for (let k = 0; k < 48; k++) {
    const h = F_[k] * 9000;
    const isTop = top.includes(k);
    const white = isTop && ((flashA && k === top[0]) || (flashB && k === top[1]) || (t >= 58.0 && k === top[1]) || (t >= 57.47 && k === top[0]));
    boxFill(ctx, bx + k * bw + 3, base - h, bw - 6, h, white ? '#fff6f0' : (isTop ? '#a01410' : '#5a0806'));
  }
  const uy = base - 9000 / 48;
  line(ctx, bx, uy, bx + 1200, uy, '#7a0a08', 2);
  monoText(ctx, 'UNIFORM 1/48', bx + 1200, uy - 12, 22, '#9a1410', { align: 'right' });
  for (let k = 0; k < 48; k += 1) if ((k + 1) % 6 === 0 || top.includes(k)) monoText(ctx, String(k + 1), bx + k * bw + bw / 2, base + 34, 20, top.includes(k) ? '#ff5a3a' : '#7a0a08', { align: 'center' });
  if (t >= 57.87) { monoText(ctx, `k=${top[0] + 1}, k=${top[1] + 1}   pattern BLOOD TYPE : BLUE`, bx, 160, 34, '#ff7a2a'); }
  monoText(ctx, `FOURIER POWER  STEP ${fmtInt(step)}`, bx, 110, 26, '#9a1410');
  ctx.restore();
});

// S23 58.40–59.50  the commander at his desk, in shadow before the countdown; red glasses glint
shot(58.4, 59.5, 'pre_commander', (ctx, lt, t, fx) => {
  const step = stepAt(t);
  fill(ctx, '#16243c');
  fx.bloom = 0.6; fx.thr = 0.55;
  // the main screen behind him: the timer, huge
  ctx.save(); ctx.translate(720, 360); ctx.scale(1.0 + 0.03 * lt, 1.0 + 0.03 * lt);
  boxFill(ctx, -720, -360, 1440, 640, '#0a0804');
  jpText(ctx, '汎化開始まで', -600, -230, 50, '#d8a80e', { weight: 900 });
  seg7(ctx, fmtTimer(timerSecs(step)), -600, 150, 300, '#e8b80e', { thick: 0.135 });
  ctx.restore();
  sil(ctx, 'gendo', 720 - 330, 450, 1.1, '#000');
  sil(ctx, 'gendoHands', 720 - 330, 450, 1.1, '#000');
  const g = t >= 58.5 && t < 58.8 ? 1 : 0.25;
  ctx.save(); ctx.fillStyle = `rgba(255,${g > 0.5 ? 60 : 20},20,${g})`;
  const gx = 720 - 330 + 1.1 * 300, gy = 450 + 1.1 * 150;
  ctx.fillRect(gx - 1.1 * 58, gy - 12, 1.1 * 46, 16); ctx.fillRect(gx + 1.1 * 12, gy - 12, 1.1 * 46, 16);
  ctx.restore();
});

// S24 59.50–60.00  grey paper: the real stdout of grokking.py (it prints every 1000 steps)
shot(59.5, 60.0, 'pre_stdout_paper', (ctx, lt, t, fx) => {
  const step = stepAt(t);
  fill(ctx, '#c9c9c3');
  cloudLayer(ctx, 'paper', [[190, 190, 184], [214, 214, 208]], 31, 0, { gw: 30, gh: 22, scale: 0.6, blur: 0.7 });
  ctx.save(); cam(ctx, 1.1, 720, 540, 0, -lt * 60, 0.03);
  const n = Math.floor(step / 1000);
  for (let k = 0; k <= n; k++) monoText(ctx, logLine(k * 20), 150, 200 + k * 64, 36, '#2a2a2a', { family: '"Liberation Mono"' });
  ctx.restore();
});

// S25 60.00–64.00  hot orange: val loss falls (log), val acc begins to lift — unit-01 colours
shot(60.0, 64.0, 'pre_hot', (ctx, lt, t, fx) => {
  const step = stepAt(t);
  fill(ctx, '#f0540c');
  fx.bloom = 0;
  const purple = '#4a2478', green = '#8cff3c';
  if (t < 62.2) {
    ctx.save(); cam(ctx, 1.0 + 0.05 * (lt / 2.2), 900, 700, -30 * lt, 0, 0.03);
    const px = 360, py = 330, pw = 980, ph = 620;
    const M = plotMap(px, py, pw, ph, { x0: 0, x1: 12000, y0: 0.01, y1: 30, logy: true });
    ctx.fillStyle = purple; ctx.beginPath(); ctx.moveTo(M.X(0), M.Y(0.01));
    for (let s = 0; s <= step; s += 50) ctx.lineTo(M.X(s), M.Y(mAt('val_loss', s, true)));
    ctx.lineTo(M.X(step), M.Y(0.01)); ctx.closePath(); ctx.fill();
    gridLines(ctx, px, py, pw, ph, 6, 3, '#1a0a24', 1.5, 0.35);
    plotMetric(ctx, M, 'val_loss', 0, step, green, 7, true, 0.01);
    dashed(ctx, px, M.Y(RUN.LN_P), px + pw, M.Y(RUN.LN_P), '#1a0a24', 3, [16, 10]);
    monoText(ctx, 'ln 97', px + pw, M.Y(RUN.LN_P) - 14, 30, '#1a0a24', { align: 'right' });
    ['10', '1', '0.1', '0.01'].forEach((l, j) => monoText(ctx, l, px - 16, M.Y([10, 1, 0.1, 0.01][j]) + 10, 26, '#1a0a24', { align: 'right' }));
    jpText(ctx, '検証損失', 60, 1030, 70, '#1a0a24', { weight: 900 });
    monoText(ctx, `VAL LOSS ${mAt('val_loss', step, true).toFixed(3)}  (log)`, 380, 1020, 34, '#1a0a24');
    ctx.restore();
  } else {
    ctx.save(); cam(ctx, 1.0 + 0.05 * ((t - 62.2) / 1.8), 720, 700);
    const px = 170, py = 440, pw = 1130, ph = 520;
    const M = plotMap(px, py, pw, ph, { x0: 3000, x1: 10000, y0: 1e-4, y1: 1, logy: true });
    boxFill(ctx, px, py, pw, ph, purple);
    gridLines(ctx, px, py, pw, ph, 7, 4, '#6a3aa0', 2);
    plotMetric(ctx, M, 'val_acc', 3000, Math.max(3000, step), green, 8, true, 1e-4);
    dashed(ctx, px, M.Y(1 / 97), px + pw, M.Y(1 / 97), '#ffb04a', 2.5);
    monoText(ctx, 'chance 1/97', px + 12, M.Y(1 / 97) - 12, 26, '#ffb04a');
    ['100%', '10%', '1%', '0.1%', '0.01%'].forEach((l, j) => monoText(ctx, l, px - 14, py + (ph * j) / 4 + 9, 24, '#1a0a24', { align: 'right' }));
    for (let i = 0; i <= 7; i++) monoText(ctx, fmtInt(3000 + i * 1000), M.X(3000 + i * 1000), py + ph + 36, 24, '#1a0a24', { align: 'center' });
    jpText(ctx, '検証正解率', 60, 1050, 60, '#1a0a24', { weight: 900 });
    monoText(ctx, `VAL ACC ${pct(mAt('val_acc', step), 2)}  (log axis)`, 400, 1040, 32, '#1a0a24');
    ctx.restore();
  }
});
cred(60.2, 62.1, (o, t, a) => { credit(o, '広報', ['arXiv:2201.02177', 'arXiv:2301.05217'], 520, 130, { alpha: a, nameSize: 74, roleSize: 38 }); });
cred(62.25, 63.95, (o, t, a) => {
  o.globalAlpha = a;
  credText(o, 'アニメーション制作', 720, 110, 36, { align: 'center' });
  text(o, 'Canvas 2D', 720, 225, { size: 96, family: COND, weight: 700, color: P.white, align: 'center', sx: 0.9 });
  text(o, 'WebGL', 720, 335, { size: 96, family: COND, weight: 700, color: P.white, align: 'center', sx: 0.9 });
});

// S26 64.00–66.80  wings: the full DFT spectrum (k and 97−k carry equal power) radiating behind a figure
shot(64.0, 66.8, 'pre_wings', (ctx, lt, t, fx) => {
  const step = stepAt(t);
  fill(ctx, '#b81a08');
  fx.bloom = 0.9; fx.thr = 0.86;
  // vertical light bars of the background (flat cel bands)
  for (let i = 0; i < 16; i++) boxFill(ctx, i * 92 + ((i * 37) % 23), 0, 36 + (i % 3) * 14, H, '#d8340c', 0.6);
  const F_ = fourierAt(step);
  const cx = 720, cy = 470;
  const pulse = 1 + 0.04 * Math.sin(lt * 9);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let n = 1; n < 97; n++) {
    const k = n <= 48 ? n : 97 - n;          // conjugate symmetry of the real DFT
    const a = -Math.PI / 2 + (n / 97) * Math.PI * 2;
    const L = Math.sqrt(F_[k - 1]) * 2600 * pulse;
    const w0 = 0.018;
    ctx.fillStyle = RUN.key.includes(k) ? 'rgba(255,236,150,0.9)' : 'rgba(255,170,40,0.55)';
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - w0) * L, cy + Math.sin(a - w0) * L); ctx.lineTo(cx + Math.cos(a + w0) * L, cy + Math.sin(a + w0) * L);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // eclipse: the embedding (still a noisy ring) as a dark body with its 97 points as the corona's edge
  dot(ctx, cx, cy, 250, '#140302');
  drawEmb(ctx, cx, cy, 235, 0, { emb: embAt(step), color: '#ffe6a0', dot: 5, star: false });
  monoText(ctx, `|DFT|² OF E  k = 1…96   STEP ${fmtInt(step)}   KEY-7 SHARE ${pct(keyShareAt(step))}`, 40, 1040, 22, '#ffd08a');
});
cred(64.05, 66.75, (o, t, a) => { credit(o, 'プロデューサー', ['勾配降下法'], 700, 880, { alpha: a, nameSize: 92, roleSize: 40 }); });
