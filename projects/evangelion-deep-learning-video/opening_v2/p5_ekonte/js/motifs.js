// ── drawing vocabulary for the storyboard panels (panel units: 1440 x 1080) ──
const PW = 1440, PH = 1080;
const FULL = [[-10, -10], [PW + 10, -10], [PW + 10, PH + 10], [-10, PH + 10]];
const rectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const G = (o = {}) => ({ col: COL.graph, ...o });

function roundRect(B, x, y, w, h, r, o = {}) {
  const k = [];
  const arc = (cx, cy, a0) => { for (let i = 0; i <= 4; i++) { const a = a0 + (Math.PI / 2) * i / 4; k.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI);
  k.push([x + w - r, y - 0.5]);
  return B.stroke(k, { over: 2, ...o });
}
function whiteOut(B, poly) { return B.marker(poly, '#ffffff', { a: 1, streak: 0 }); }

// organic blob: radius modulated by a few random harmonics
function blob(cx, cy, rx, ry, seed, irr = 0.3, n = 36, rot = 0) {
  const rng = mulberry32(seed);
  const hs = [];
  for (let k = 2; k <= 6; k++) hs.push([k, rng() * 6.28, (rng() * 0.8 + 0.2) * irr / (k * 0.6)]);
  const pts = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    let r = 1;
    for (const [k, ph, am] of hs) r += am * Math.sin(k * a + ph);
    const x = Math.cos(a) * rx * r, y = Math.sin(a) * ry * r;
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return catmull(pts.concat([pts[0]]), 3);
}

// ── skies & clouds ───────────────────────────────────────────────────────────
function cloudPoly(x, y, w, h, seed, flat = true) {
  // cumulus: upper envelope of a pyramid of overlapping circles, flattish base
  const rng = mulberry32(seed);
  const circles = [];
  const n = 5 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const peak = 1 - Math.pow(Math.abs(u - 0.45 - (rng() - 0.5) * 0.2) * 2, 1.6);
    const r = h * (0.28 + 0.34 * Math.max(0, peak) + rng() * 0.12);
    circles.push([x + u * w, y + h - r * (0.7 + rng() * 0.25), r]);
  }
  const top = [];
  const N = Math.max(24, Math.round(w / 9));
  for (let k = 0; k <= N; k++) {
    const xx = x + w * k / N;
    let yy = y + h;
    for (const [cx, cy, r] of circles) { const dx = xx - cx; if (Math.abs(dx) < r) yy = Math.min(yy, cy - Math.sqrt(r * r - dx * dx)); }
    top.push([xx, Math.min(yy, y + h - 4)]);
  }
  const pts = [[x + w * 0.02, y + h]].concat(top.slice(1, -1)).concat([[x + w * 0.98, y + h]]);
  if (!flat) for (let i = 6; i >= 0; i--) pts.push([x + w * (0.05 + 0.9 * i / 6), y + h + Math.sin(i * 1.7 + seed) * h * 0.05 + h * 0.03]);
  return pts;
}
function skyPanel(B, o = {}) {
  B.marker(FULL, o.col || COL.mSky, { a: o.a ?? 0.78, ang: -0.2, weight: 300 });
  for (const c of o.clouds || []) {
    const poly = cloudPoly(c[0], c[1], c[2], c[3], c[4] || 7, false);
    whiteOut(B, poly);
    B.stroke(poly.slice(1, -8), { w: 2.2, a: 0.6, col: COL.blue, passes: 1, wob: 0.8 });
    // underside shadow hatching in blue pencil
    const under = [[c[0] + c[2] * 0.08, c[1] + c[3] * 0.72], [c[0] + c[2] * 0.92, c[1] + c[3] * 0.72], [c[0] + c[2] * 0.85, c[1] + c[3] * 1.02], [c[0] + c[2] * 0.12, c[1] + c[3] * 1.02]];
    B.hatch(under, -0.5, 13, { col: COL.blue, w: 1.6, a: 0.45 });
  }
}

// ── transformer block diagram (Vaswani et al. 2017, fig. 1, encoder side) ───
function xfmr(B, x, y, s, o = {}) {
  const T = (px, py) => [x + px * s, y + py * s];
  const box = (bx, by, bw, bh, label, fill) => {
    const [X, Y] = T(bx, by);
    if (o.color || o.opaque) whiteOut(B, rectPts(X, Y, bw * s, bh * s));
    if (fill && o.color) B.rectMarker(X, Y, bw * s, bh * s, fill, { a: 0.5, streak: 0.6 });
    roundRect(B, X, Y, bw * s, bh * s, 10 * s, { w: (o.w || 2.6), a: o.a ?? 0.85 });
    B.text(label, X + bw * s / 2, Y + bh * s / 2 + 9 * s, { size: 25 * s, align: 'center', a: o.a ?? 0.85 });
  };
  const w = o.w || 2.6, a = o.a ?? 0.85;
  // N x frame
  roundRect(B, ...T(-30, 120), 360 * s, 420 * s, 26 * s, { w: w * 0.9, a: a * 0.8 });
  B.text('N×', ...T(-95, 340), { size: 40 * s, a });
  box(0, 440, 300, 70, 'Multi-Head Attention', COL.mOrange);
  box(0, 380, 300, 44, 'Add & Norm', COL.mYellow);
  box(0, 250, 300, 70, 'Feed Forward', COL.mSky);
  box(0, 190, 300, 44, 'Add & Norm', COL.mYellow);
  box(0, 640, 300, 60, 'Input Embedding', null);
  // arrows (flow upward)
  const up = (px, y0, y1) => { const [X0, Y0] = T(px, y0), [, Y1] = T(px, y1); B.arrow(X0, Y0, X0, Y1, { w: w * 0.8, a, head: 12 * s }); };
  up(150, 640, 600); up(150, 560, 512); up(150, 440, 426); up(150, 380, 322); up(150, 250, 236); up(150, 190, 120); up(150, 120, 60);
  // Q K V fork
  const [fx, fy] = T(150, 545);
  for (const dx of [-90, 0, 90]) { const [X1, Y1] = T(150 + dx, 512); B.line(fx, fy, X1, Y1, { w: w * 0.8, a }); }
  if (o.qkv !== false) { B.text('Q', ...T(52, 540), { size: 22 * s, a }); B.text('K', ...T(160, 535), { size: 22 * s, a }); B.text('V', ...T(250, 540), { size: 22 * s, a }); }
  // residual (skip) connections on the left
  const skip = (yA, yB) => { const P = [T(150, yA), T(-12, yA), T(-12, yB), T(0, yB)]; B.stroke(P, { w: w * 0.8, a, over: 0 }); };
  skip(560, 402); skip(355, 212);
  // positional encoding ⊕
  const [pcx, pcy] = T(150, 580);
  B.circle(pcx, pcy, 18 * s, { w: w * 0.8, a });
  B.line(pcx - 11 * s, pcy, pcx + 11 * s, pcy, { w: w * 0.8, a }); B.line(pcx, pcy - 11 * s, pcx, pcy + 11 * s, { w: w * 0.8, a });
  const sw = []; for (let i = 0; i <= 24; i++) sw.push(T(-80 + i * 3.4, 580 + Math.sin(i / 24 * Math.PI * 2) * 14));
  B.stroke(sw, { w: w * 0.8, a, over: 0 }); B.line(...T(6, 580), ...T(128, 580), { w: w * 0.7, a });
  B.text('Positional', ...T(-150, 616), { size: 18 * s, a: a * 0.9 }); B.text('Encoding', ...T(-146, 638), { size: 18 * s, a: a * 0.9 });
  B.text('Inputs', ...T(150, 745), { size: 22 * s, align: 'center', a });
  up(150, 725, 700);
}

// perspective slab stack (the "profile" of the network: 12 layers seen from the side)
function slabStack(B, x, y, s, n = 12, o = {}) {
  const a = o.a ?? 0.85, w = o.w || 2.4;
  const dx = 260 * s, dy = -70 * s, depth = 150 * s, th = 24 * s, gap = 16 * s;
  for (let i = 0; i < n; i++) {
    const Y = y - i * (th + gap);
    const P = [[x, Y], [x + dx, Y + dy], [x + dx + depth, Y + dy + depth * 0.32], [x + depth, Y + depth * 0.32]];
    if (o.fill) {
      whiteOut(B, [[x, Y], [x + dx, Y + dy], [x + dx + depth, Y + dy + depth * 0.32], [x + dx + depth, Y + dy + depth * 0.32 + th], [x + depth, Y + depth * 0.32 + th], [x, Y + th]]);
      B.marker([[x, Y], [x + depth, Y + depth * 0.32], [x + depth, Y + depth * 0.32 + th], [x, Y + th]], '#b9b3a6', { a: 0.5, streak: 0 });
    }
    B.poly(P, { w, a: a * 0.9 });
    B.line(x, Y, x, Y + th, { w, a }); B.line(x + depth, Y + depth * 0.32, x + depth, Y + depth * 0.32 + th, { w, a });
    B.line(x + dx + depth, Y + dy + depth * 0.32, x + dx + depth, Y + dy + depth * 0.32 + th, { w, a: a * 0.8 });
    B.line(x, Y + th, x + depth, Y + depth * 0.32 + th, { w, a }); B.line(x + depth, Y + depth * 0.32 + th, x + dx + depth, Y + dy + depth * 0.32 + th, { w, a: a * 0.8 });
    if (o.labels && i % 3 === 2) B.text('L' + (i + 1), x - 52 * s, Y + th, { size: 20 * s, a });
  }
  if (o.stream) {  // residual stream: a line through all slabs
    const x0 = x + depth / 2 + dx / 2, y0 = y + depth * 0.16 + dy / 2 + th;
    B.line(x0, y0 + 40 * s, x0, y0 - n * (th + gap) - 50 * s, { w: w * 1.4, a, col: o.streamCol || COL.green });
  }
}

// ── GPU module (top view): die + HBM stacks ─────────────────────────────────
function gpuModule(B, x, y, s, o = {}) {
  const a = o.a ?? 0.85, w = o.w ?? 2.4;
  const T = (px, py) => [x + px * s, y + py * s];
  B.poly([T(0, 0), T(640, 0), T(640, 560), T(0, 560)], { w: w * 1.1, a });
  for (const [hx, hy] of [[34, 34], [606, 34], [34, 526], [606, 526]]) B.circle(...T(hx, hy), 14 * s, { w, a: a * 0.8 });
  // package + die
  B.poly([T(130, 90), T(510, 90), T(510, 470), T(130, 470)], { w, a });
  B.poly([T(235, 175), T(405, 175), T(405, 385), T(235, 385)], { w: w * 1.2, a });
  if (o.dieHatch !== false) B.hatch([T(235, 175), T(405, 175), T(405, 385), T(235, 385)], 0.8, 11 * s, { w: w * 0.6, a: a * 0.4 });
  // 6 HBM stacks, 3 per side
  for (let i = 0; i < 3; i++) {
    for (const hx of [150, 420]) {
      const P = [T(hx, 110 + i * 120), T(hx + 70, 110 + i * 120), T(hx + 70, 110 + i * 120 + 98), T(hx, 110 + i * 120 + 98)];
      B.poly(P, { w, a });
      for (let k = 1; k < 4; k++) B.line(...T(hx + 6, 110 + i * 120 + k * 24), ...T(hx + 64, 110 + i * 120 + k * 24), { w: w * 0.5, a: a * 0.5, passes: 1 });
    }
  }
  // capacitor rows
  for (let i = 0; i < 16; i++) { B.rect(...T(150 + i * 22, 492), 10 * s, 16 * s, { w: w * 0.5, a: a * 0.6, passes: 1 }); B.rect(...T(150 + i * 22, 58), 10 * s, 16 * s, { w: w * 0.5, a: a * 0.6, passes: 1 }); }
  if (o.label !== false) {
    B.text('HBM3', ...T(185, 99), { size: 17 * s, align: 'center', a });
    B.text('die 814 mm²', ...T(320, 420), { size: 18 * s, align: 'center', a });
  }
}

// ── the "unit": a transformer-mecha. Green lines = the residual stream. ─────
// front view, height ~1000 units * s, origin at horn tip; o.arms in [0,1] (down -> spread)
function mechaParts(o = {}) {
  const arms = o.arms ?? 0.1;
  const P = {};
  P.horn = [[0, 0], [-10, 64], [10, 64]];
  P.head = [[-34, 60], [-50, 96], [-44, 130], [-24, 152], [24, 152], [44, 130], [50, 96], [34, 60]];
  P.jaw = [[-24, 152], [0, 172], [24, 152]];
  P.visor = [[-40, 100], [-12, 112], [12, 112], [40, 100]];
  P.neck = [[-20, 168], [20, 168], [26, 190], [-26, 190]];
  P.torso = [[-86, 190], [86, 190], [100, 300], [62, 420], [-62, 420], [-100, 300]];
  P.waist = [[-58, 420], [58, 420], [70, 486], [-70, 486]];
  const pyl = (sx) => [[70, 180], [158, 150], [186, 196], [168, 268], [98, 256], [78, 214]].map(([px, py]) => [px * sx, py]);
  P.pylL = pyl(-1); P.pylR = pyl(1);
  const leg = (sx) => ({
    thigh: [[20, 486], [64, 486], [62, 690], [26, 690]].map(([px, py]) => [px * sx, py]),
    shin: [[22, 700], [68, 700], [64, 930], [30, 930]].map(([px, py]) => [px * sx, py]),
    foot: [[16, 930], [82, 930], [96, 972], [8, 972]].map(([px, py]) => [px * sx, py]),
  });
  P.legL = leg(-1); P.legR = leg(1);
  // arms: shoulder joint at (±150, 228). angle from straight down (0) to horizontal (pi/2 * 0.95)
  const arm = (sx) => {
    const ang = lerp(0.18, 1.45, arms);
    const j = [150 * sx, 228];
    const d1 = [Math.sin(ang) * sx, Math.cos(ang)];
    const e = [j[0] + d1[0] * 190, j[1] + d1[1] * 190];
    const ang2 = ang + lerp(0.05, 0.12, arms) * (arms > 0.5 ? -1 : 1);
    const d2 = [Math.sin(ang2) * sx, Math.cos(ang2)];
    const h = [e[0] + d2[0] * 190, e[1] + d2[1] * 190];
    const limb = (p0, p1, r0, r1) => { const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy); const nx = -dy / l, ny = dx / l; return [[p0[0] + nx * r0, p0[1] + ny * r0], [p1[0] + nx * r1, p1[1] + ny * r1], [p1[0] - nx * r1, p1[1] - ny * r1], [p0[0] - nx * r0, p0[1] - ny * r0]]; };
    const hand = [];
    for (let f = -1.5; f <= 1.5; f += 1) { const fa = ang2 + f * 0.16; hand.push([[h[0], h[1]], [h[0] + Math.sin(fa) * sx * 70, h[1] + Math.cos(fa) * 70]]); }
    return { upper: limb(j, e, 30, 24), fore: limb(e, h, 26, 20), hand, j, e, h };
  };
  P.armL = arm(-1); P.armR = arm(1);
  return P;
}
function mecha(B, x, y, s, o = {}) {
  const P = mechaParts(o);
  const T = (pts) => pts.map(([px, py]) => [x + px * s, y + py * s]);
  const a = o.a ?? 0.85, w = o.w ?? 2.6;
  const shapes = [P.head, P.neck, P.torso, P.waist, P.pylL, P.pylR, P.legL.thigh, P.legL.shin, P.legL.foot, P.legR.thigh, P.legR.shin, P.legR.foot,
    P.armL.upper, P.armL.fore, P.armR.upper, P.armR.fore];
  if (o.sil) {   // black silhouette (marker)
    for (const sh of shapes.concat([P.horn])) B.marker(T(sh), o.silCol || COL.mBlack, { a: o.silA ?? 0.93, streak: 0.3 });
    for (const side of [P.armL, P.armR]) for (const f of side.hand) B.line(...T(f)[0], ...T(f)[1], { w: 14 * s, a: 0.9, col: o.silCol || COL.mBlack, passes: 1 });
    if (o.eyes) for (const ex of [-1, 1]) B.marker(T([[ex * 14, 104], [ex * 38, 98], [ex * 34, 108], [ex * 16, 112]]), '#ffffff', { a: 1, streak: 0 });
    return;
  }
  if (o.marker !== false) {
    for (const sh of shapes) B.marker(T(sh), COL.mPurple, { a: 0.72, streak: 0.7 });
    B.marker(T(P.horn), COL.mPurple, { a: 0.72 });
    B.marker(T(P.jaw.concat([[0, 160]])), COL.mGreen, { a: 0.8 });
  }
  for (const sh of shapes) B.poly(T(sh), { w, a });
  B.poly(T(P.horn), { w, a }); B.stroke(T(P.jaw), { w, a }); B.stroke(T(P.visor), { w: w * 0.9, a });
  // chest plates = layers
  for (let i = 0; i < 6; i++) { const yy = 222 + i * 30; const hw = 88 - Math.max(0, i - 3) * 10; B.line(...T([[-hw, yy]])[0], ...T([[hw, yy]])[0], { w: w * 0.7, a: a * 0.8 }); }
  for (const side of [P.armL, P.armR]) for (const f of side.hand) B.line(...T(f)[0], ...T(f)[1], { w: w * 1.1, a });
  // residual stream (green)
  const g = { w: (o.gw || 7) * s * 0.6 + 1.5, a: 0.9, col: COL.mGreen, passes: 1, wob: 0.8 };
  if (o.green !== false) {
    B.line(...T([[0, 196]])[0], ...T([[0, 416]])[0], g);
    for (const L2 of [P.legL, P.legR]) { const c = L2.thigh; B.line(...T([[(c[0][0] + c[1][0]) / 2, 492]])[0], ...T([[(c[0][0] + c[1][0]) / 2, 924]])[0], g); }
    for (const A of [P.armL, P.armR]) B.stroke(T([A.j, A.e, A.h]), g);
    if (o.eyes) for (const ex of [-1, 1]) B.marker(T([[ex * 14, 104], [ex * 38, 98], [ex * 34, 108], [ex * 16, 112]]), '#ffffff', { a: 1, streak: 0 });
  }
  if (o.labels) {
    B.text('L1–L12', ...T([[112, 300]])[0], { size: 24 * s * 1.6, col: COL.red, a: 0.9 });
  }
}
// head close-up (3/4 front), local 0..1 box of size s (~ unit = 1000)
function mechaHead(B, x, y, s, o = {}) {
  const T = (pts) => pts.map(([px, py]) => [x + px * s, y + py * s]);
  const a = o.a ?? 0.88, w = o.w ?? 3;
  const helm = [[-300, -60], [-380, 140], [-330, 420], [-180, 560], [180, 560], [330, 420], [380, 140], [300, -60], [120, -120], [-120, -120]];
  const horn = [[-40, -110], [0, -560], [40, -110]];
  const jaw = [[-180, 560], [-120, 700], [0, 760], [120, 700], [180, 560]];
  const eyeL = [[-290, 190], [-70, 250], [-80, 300], [-270, 270]];
  const eyeR = eyeL.map(([px, py]) => [-px, py]);
  if (o.sil) {
    for (const sh of [helm, horn, jaw]) B.marker(T(sh), o.silCol || COL.mBlack, { a: 0.94, streak: 0.3 });
  } else {
    if (o.marker !== false) { B.marker(T(helm), COL.mPurple, { a: 0.72 }); B.marker(T(horn), COL.mPurple, { a: 0.72 }); B.marker(T(jaw), o.jawCol || COL.mGreen, { a: 0.78 }); }
    B.poly(T(helm), { w, a }); B.poly(T(horn), { w, a }); B.stroke(T(jaw), { w, a });
    B.stroke(T([[-150, 580], [-60, 690]]), { w: w * 0.8, a }); B.stroke(T([[150, 580], [60, 690]]), { w: w * 0.8, a });
    B.stroke(T([[-330, 420], [-120, 380], [120, 380], [330, 420]]), { w: w * 0.8, a: a * 0.8 });
    B.hatch(T([[-380, 140], [-300, -60], [-230, -80], [-300, 150], [-330, 420]]), 1.1, 16 * s * 3, { w: w * 0.7, a: a * 0.6 });
  }
  if (o.eyes !== false) {
    for (const e of [eyeL, eyeR]) {
      B.marker(T(e), o.eyeCol || (o.sil ? '#ffffff' : '#fdfbf2'), { a: 1, streak: 0 });
      if (!o.sil) B.poly(T(e), { w: w * 0.9, a });
    }
  }
}
function mechaHand(B, x, y, s, o = {}) {
  const T = (pts) => pts.map(([px, py]) => [x + px * s, y + py * s]);
  const a = o.a ?? 0.88, w = o.w ?? 3;
  const palm = [[-160, 0], [160, 0], [190, 260], [-170, 280]];
  const fingers = [];
  for (let i = 0; i < 4; i++) {
    const fx = -120 + i * 82, ang = (i - 1.5) * 0.14 + (o.spread || 0) * (i - 1.5) * 0.18;
    const len = 330 - Math.abs(i - 1.5) * 40;
    const p0 = [fx, 250], p1 = [fx + Math.sin(ang) * len * 0.5, 250 + Math.cos(ang) * len * 0.5], p2 = [fx + Math.sin(ang) * len, 250 + Math.cos(ang) * len];
    fingers.push([p0, p1, p2]);
  }
  const thumb = [[-160, 60], [-300, 170], [-340, 290]];
  if (o.marker !== false) B.marker(T(palm), COL.mPurple, { a: 0.72 });
  B.poly(T(palm), { w, a });
  for (const f of fingers.concat([thumb])) {
    B.stroke(T(f), { w: w * 9 * (o.thick || 1), a: o.marker !== false ? 0.55 : 0.2, col: COL.mPurple, passes: 1 });
    B.stroke(T(f), { w: w * 1.1, a });
  }
  B.line(...T([[-150, 120]])[0], ...T([[170, 120]])[0], { w: 6 * s + 2, col: COL.mGreen, a: 0.85, passes: 1 });
}

// ── attention heatmap (pencil shading per cell) ─────────────────────────────
function attnGrid(B, x, y, cell, mat, o = {}) {
  const n = mat.length, col = o.col || COL.graph;
  B.custom((ctx, p) => {
    ctx.fillStyle = col;
    const rows = Math.ceil(p * n);
    for (let i = 0; i < rows; i++) for (let j = 0; j < n; j++) {
      const v = mat[i][j];
      if (o.causal && j > i) continue;
      ctx.globalAlpha = Math.min(0.92, Math.pow(v / (o.vmax || 0.35), 0.7)) * (o.a ?? 0.9);
      ctx.fillRect(x + j * cell + 0.6, y + i * cell + 0.6, cell - 1.2, cell - 1.2);
    }
  }, { weight: 200 });
  B.rect(x, y, n * cell, n * cell, { w: 2.2, a: 0.8, col: o.frameCol || COL.graph });
}

// ── plots ────────────────────────────────────────────────────────────────────
function axes2(B, x, y, w, h, o = {}) {
  const c = { w: o.w || 2.2, a: o.a ?? 0.85, col: o.col || COL.graph };
  B.arrow(x, y + h, x + w + 20, y + h, { ...c, head: 14 });
  B.arrow(x, y + h, x, y - 20, { ...c, head: 14 });
  if (o.xl) B.text(o.xl, x + w + 8, y + h + 36, { size: o.ls || 22, align: 'right', col: c.col, a: c.a });
  if (o.yl) B.text(o.yl, x + 10, y - 26, { size: o.ls || 22, col: c.col, a: c.a });
  for (const [v, s] of o.xt || []) { B.line(x + v * w, y + h - 6, x + v * w, y + h + 6, { ...c, w: 1.6, passes: 1 }); B.text(s, x + v * w, y + h + 30, { size: 17, align: 'center', col: c.col, a: c.a }); }
  for (const [v, s] of o.yt || []) { B.line(x - 6, y + h - v * h, x + 6, y + h - v * h, { ...c, w: 1.6, passes: 1 }); B.text(s, x - 12, y + h - v * h + 6, { size: 17, align: 'right', col: c.col, a: c.a }); }
}
function plotPts(xs, ys, x, y, w, h, xr, yr, logx = false) {
  const pts = [];
  for (let i = 0; i < xs.length; i++) {
    const u = logx ? (Math.log10(Math.max(xs[i], 1)) - Math.log10(Math.max(xr[0], 1))) / (Math.log10(xr[1]) - Math.log10(Math.max(xr[0], 1))) : (xs[i] - xr[0]) / (xr[1] - xr[0]);
    const v = (ys[i] - yr[0]) / (yr[1] - yr[0]);
    pts.push([x + u * w, y + h - clamp(v, -0.05, 1.08) * h]);
  }
  return pts;
}

// optimizer portrait: contour ellipses of f = 1/2 x^T H x and a trajectory (real computed path)
function contourPortrait(B, cx, cy, sc, path, o = {}) {
  const H2 = window.D5.optH;
  const a = H2[0][0], b = H2[0][1], d = H2[1][1];
  const tr = a + d, det = a * d - b * b, l1 = tr / 2 + Math.sqrt(tr * tr / 4 - det), l2 = tr / 2 - Math.sqrt(tr * tr / 4 - det);
  const ang = Math.atan2(l1 - a, b);   // eigenvector of l1
  for (const cval of o.levels || [0.3, 1, 2.2, 4, 6.5]) {
    const r1 = Math.sqrt(2 * cval / l1) * sc, r2 = Math.sqrt(2 * cval / l2) * sc;
    B.stroke(ellipsePts(cx, cy, r2, r1, 0, Math.PI * 2.05, ang + Math.PI / 2), { w: 1.8, a: 0.55, col: o.ccol || COL.graph, over: 0, passes: 1 });
  }
  if (path) {
    const pts = path.map(([px, py]) => [cx + px * sc, cy - py * sc]);
    B.stroke(pts, { w: o.pw || 3, a: 0.92, col: o.col || COL.red, wob: 0.5, step: 3, over: 0 });
    for (let i = 0; i < pts.length; i += 3) B.circle(pts[i][0], pts[i][1], 4.5, { w: 2, a: 0.8, col: o.col || COL.red, passes: 1 });
  }
  B.text('×', cx - 7, cy + 8, { size: 24, a: 0.8 });
}

// ── 7-segment digits (for the activity timer) ───────────────────────────────
const SEG7 = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcfgd' };
function seg7(ctx, ch, x, y, w, h, th, skew = 0.18) {
  const on = SEG7[ch] || '';
  const P = { a: [[0, 0], [1, 0]], b: [[1, 0], [1, 0.5]], c: [[1, 0.5], [1, 1]], d: [[0, 1], [1, 1]], e: [[0, 0.5], [0, 1]], f: [[0, 0], [0, 0.5]], g: [[0, 0.5], [1, 0.5]] };
  ctx.lineCap = 'butt'; ctx.lineWidth = th;
  for (const s of on) {
    const [[u0, v0], [u1, v1]] = P[s];
    const ins = 0.09;
    const X = (u, v) => x + u * w - (v - 0.5) * h * skew;
    const du = (u1 - u0) * ins, dv = (v1 - v0) * ins * (w / h);
    ctx.beginPath(); ctx.moveTo(X(u0 + du, v0 + dv), y + (v0 + dv) * h); ctx.lineTo(X(u1 - du, v1 - dv), y + (v1 - dv) * h); ctx.stroke();
  }
}

// ── paste-up card (black card, white condensed type), fills the panel ───────
function pasteCard(B, fnDraw, o = {}) {
  B.paste((ctx, p, lt, ga) => {
    if (p <= 0) return;
    ctx.save();
    const rot = o.rot ?? 0.004, dx = o.dx ?? 6, dy = o.dy ?? -4;
    ctx.translate(PW / 2 + dx, PH / 2 + dy); ctx.rotate(rot); ctx.translate(-PW / 2, -PH / 2);
    // shadow edge
    ctx.fillStyle = 'rgba(40,30,20,0.18)'; ctx.fillRect(10, 12, PW - 8, PH - 8);
    ctx.fillStyle = o.bg || '#141316'; ctx.fillRect(2, 2, PW - 4, PH - 4);
    fnDraw(ctx);
    // tape
    if (o.tape !== false) {
      ctx.fillStyle = 'rgba(235,228,205,0.55)';
      ctx.save(); ctx.translate(90, 6); ctx.rotate(-0.5); ctx.fillRect(-60, -16, 120, 32); ctx.restore();
      ctx.save(); ctx.translate(PW - 90, PH - 6); ctx.rotate(-0.5); ctx.fillRect(-60, -16, 120, 32); ctx.restore();
    }
    ctx.restore();
  });
}
function condText(ctx, s, x, y, size, o = {}) {
  ctx.save();
  ctx.font = `700 ${size}px ${FONT.cond}`;
  ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'alphabetic';
  ctx.translate(x, y); ctx.scale(o.sx ?? 0.92, o.sy ?? 1);
  ctx.fillStyle = o.col || '#f6f3ea';
  if (o.ls) ctx.letterSpacing = o.ls + 'px';
  ctx.fillText(s, 0, 0);
  ctx.restore();
}
function sansHeavy(ctx, s, x, y, size, o = {}) {   // Helvetica-like heavy (cards use Liberation Sans bold)
  ctx.save();
  ctx.font = `700 ${size}px "Liberation Sans"`;
  ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'alphabetic';
  ctx.translate(x, y); ctx.scale(o.sx ?? 1, o.sy ?? 1);
  ctx.fillStyle = o.col || '#f6f3ea';
  if (o.ls) ctx.letterSpacing = o.ls + 'px';
  ctx.fillText(s, 0, 0);
  ctx.restore();
}

// in-panel camera: scale s about content point (fx,fy) placed at frame centre, clamped so content covers the frame
function zoomAt(s, fx, fy, cx = 720, cy = 540) {
  let tx = cx - fx * s, ty = cy - fy * s;
  tx = clamp(tx, PW - PW * s, 0); ty = clamp(ty, PH - PH * s, 0);
  return [s, 0, 0, s, tx, ty];
}

// ── camera annotations (red pencil, fixed on paper) ─────────────────────────
function camNote(B, s, x, y, o = {}) { const it = B.text(s, x, y, { size: o.size || 28, col: o.col || COL.red, font: 'cond', a: 0.9, ...o }); it.fixed = true; return it; }
function camArrow(B, x0, y0, x1, y1, o = {}) { const n0 = B.items.length; B.arrow(x0, y0, x1, y1, { col: COL.red, w: 3, a: 0.85, head: 22, ...o }); for (let i = n0; i < B.items.length; i++) B.items[i].fixed = true; }
function camFrame(B, x, y, w, h, o = {}) { const n0 = B.items.length; B.rect(x, y, w, h, { col: COL.red, w: 2.6, a: 0.8, ...o }); for (let i = n0; i < B.items.length; i++) B.items[i].fixed = true; }
function fixLast(B, n0) { for (let i = n0; i < B.items.length; i++) B.items[i].fixed = true; }

// ── notes column helpers ─────────────────────────────────────────────────────
// storyboard notes (neat, Klee One) and research notes (rough hand + math) in the 内容 column (sheet space)
function note(B, s, y, o = {}) { B.sheet(); const it = B.text(s, o.x ?? ACT.x, y, { size: o.size || 24, weight: 600, col: o.col || COL.graph, a: o.a ?? 0.88, ...o }); B.panel(); return it; }
function rnote(B, s, y, o = {}) { B.sheet(); const it = B.text(s, o.x ?? ACT.x, y, { size: o.size || 28, font: 'kure', col: o.col || COL.graph, a: o.a ?? 0.92, ...o }); B.panel(); return it; }
function mnote(B, key, y, em, o = {}) { B.sheet(); const it = B.math(key, o.x ?? ACT.x, y, em, o); B.panel(); return it; }
function snote(B, x0, y0, x1, y1, o) { B.sheet(); const it = B.strike(x0, y0, x1, y1, o); B.panel(); return it; }
function sline(B, pts, o) { B.sheet(); const it = B.stroke(pts, o); B.panel(); return it; }
function scirc(B, cx, cy, rx, ry, o = {}) { B.sheet(); const it = B.stroke(ellipsePts(cx, cy, rx, ry, 0.3, Math.PI * 2.25, o.rot || -0.05), { over: 0, w: 2.4, col: COL.red, a: 0.85, ...o }); B.panel(); return it; }
