// ─────────────────────────────────────────────────────────────────────────────
//  p1_tv1995 · the cast. Characters are re-cast as iconic ML diagrams, painted
//  as cel objects (flat base + one hard shadow tone + trace line).
//   Transformer (2017)  … the protagonist          (Vaswani et al., Fig. 1 colours)
//   LSTM (1997)         … the guardian             (Olah-style module: green, yellow gates)
//   Perceptron (1958)   … the first child / proto  (pale, one Σ node)
//   ResNet / CNN        … the second child, red
// ─────────────────────────────────────────────────────────────────────────────
const PAPER = {
  pink: ['#f9cdcd', '#dc9ea4', '#b07a84'], orange: ['#fcd6a3', '#e5a462', '#b87840'], yellow: ['#f6f2ab', '#d3cb77', '#a39c52'],
  blue: ['#c4e6f5', '#8dbcd6', '#6590ae'], grey: ['#ededf0', '#c1c3cf', '#9496a8'], purple: ['#dbd1ef', '#ad9fcf', '#8577a6'],
  green: ['#d0efcc', '#9ccd98', '#71a26e'], ink: ['#4a4f68', '#343850', '#24273a'],
};
const LINE = '#23263a';
// deeper cel versions of the paper colours (skin-tone weight, so white credits read over them)
const CEL = {
  pink: ['#f2a7a2', '#c9737a', '#9c5260'], orange: ['#f5b36c', '#d27f3e', '#a45a2a'], yellow: ['#eedc72', '#c2ae45', '#8e7f2c'],
  blue: ['#86c4e6', '#4f8fc0', '#356a98'], grey: ['#aeb2d2', '#4a5290', '#2e3570'], purple: ['#b9a8e0', '#8470b8', '#5f4f8e'],
  green: ['#a8dca0', '#6aa76a', '#467a4c'], ink: ['#3a3f5c', '#282c46', '#1c1f34'],
};

// ── the Transformer being ───────────────────────────────────────────────────
function transformerBoxes(o = {}) {
  const tint = o.tint;   // optional function col[] -> col[]
  const PAL = o.pal || CEL;
  const T = (c) => { const k = Object.keys(PAPER).find((n) => PAPER[n] === c); const cc = k ? PAL[k] : c; return tint ? tint(cc) : cc; };
  const B = [];
  const zf = -20;                                  // enclosure front plane
  B.push({ c: [0, 20, 110], s: [400, 700, 260], col: T(PAPER.grey), tag: 'encl', bias: 40,
    side: (g, d, h) => { g.fillStyle = 'rgba(35,38,58,0.85)'; g.font = `italic 400 ${h * 0.12}px ${ROMAN}`; g.textAlign = 'center'; g.fillText('N×', d * 0.5, h * 0.56);
      g.strokeStyle = 'rgba(35,38,58,0.35)'; g.lineWidth = 3; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(d * 0.12, h * i / 6); g.lineTo(d * 0.88, h * i / 6); g.stroke(); } },
    decal: (g, w, h) => { g.fillStyle = 'rgba(35,38,58,0.55)'; g.font = `400 ${h * 0.03}px ${GROT}`; g.textAlign = 'left'; g.fillText('Encoder', w * 0.06, h * 0.05); } });
  const slab = (y, h, d, col, label, x = 10, dec = null) => B.push({ c: [x, y, zf - d / 2], s: [300, h, d], col: T(col), decal: dec || ((g, w, hh) => paperLabel(g, label, w, hh)) });
  // o.face: the MHA block is the being's face (two attention-map eyes go on it), so its label shrinks to the chin
  slab(215, 120, 120, PAPER.orange, 'Multi-Head|Attention', 10, o.face ? (g, w, hh) => { g.save(); g.fillStyle = 'rgba(35,38,58,0.85)'; g.font = `400 ${hh * 0.105}px ${GROT}`; g.textAlign = 'center'; g.fillText('Multi-Head Attention', w / 2, hh * 0.95); g.restore(); } : null);
  slab(100, 56, 96, PAPER.yellow, 'Add & Norm');
  slab(-30, 120, 120, PAPER.blue, 'Feed|Forward');
  slab(-150, 56, 96, PAPER.yellow, 'Add & Norm');
  // residual bypasses (dark pipes) around the left of each sub-layer
  const pipe = (x, y, w, h) => B.push({ c: [x, y, zf - 22], s: [w, h, 26], col: T(PAPER.ink) });
  pipe(-172, 190, 18, 200); pipe(-156, 100, 50, 16); pipe(-156, 284, 50, 16);
  pipe(-172, -60, 18, 200); pipe(-156, -150, 50, 16); pipe(-156, 32, 50, 16);
  // connectors (the arrows between blocks)
  pipe(10, 158, 14, 60); pipe(10, 44, 14, 60); pipe(10, -95, 14, 40); pipe(10, 305, 14, 60);
  // below: embedding + positional encoding
  B.push({ c: [0, 470, 40], s: [320, 80, 200], col: T(PAPER.pink), decal: (g, w, h) => paperLabel(g, 'Input|Embedding', w, h) });
  B.push({ c: [0, 402, 0], s: [64, 48, 64], col: T(PAPER.grey), decal: (g, w, h) => { g.strokeStyle = '#23263a'; g.lineWidth = 3; ringS(g, w / 2, h / 2, h * 0.34, '#23263a', 3);
    g.beginPath(); g.moveTo(w / 2 - h * 0.34, h / 2); g.lineTo(w / 2 + h * 0.34, h / 2); g.moveTo(w / 2, h * 0.16); g.lineTo(w / 2, h * 0.84); g.stroke(); } });
  // crown: Linear + Softmax
  B.push({ c: [0, -362, 60], s: [16, 50, 16], col: T(PAPER.ink) });
  B.push({ c: [0, -420, 60], s: [300, 70, 170], col: T(PAPER.purple), decal: (g, w, h) => paperLabel(g, 'Linear', w, h) });
  B.push({ c: [0, -470, 60], s: [16, 30, 16], col: T(PAPER.ink) });
  B.push({ c: [0, -520, 60], s: [300, 70, 170], col: T(PAPER.green), decal: (g, w, h) => paperLabel(g, 'Softmax', w, h) });
  B.push({ c: [0, -590, 60], s: [16, 70, 16], col: T(PAPER.ink) });
  return B;
}
function drawTransformer(ctx, cam, o = {}) {
  let B = transformerBoxes(o);
  if (o.pal === undefined && o.silhouette) { B = transformerBoxes({ pal: Object.fromEntries(Object.keys(PAPER).map((k) => [k, [o.silhouette, o.silhouette, o.silhouette]])) }); }
  if (o.silhouette || o.plain) B.forEach((b) => { b.decal = null; b.side = null; });   // plain: no paper labels (under dense credits)
  drawBoxes(ctx, B, cam, { line: o.silhouette || o.line || LINE, lw: o.lw || 3, light: o.light });
}

// ── the LSTM being (Olah-style module) ──────────────────────────────────────
function lstmBoxes(o = {}) {
  const T = (c) => (o.tint ? o.tint(c) : c);
  const B = [];
  const body = { c: [0, 0, 60], s: [560, 360, 160], col: T(PAPER.green), tag: 'body', bias: 60 };
  body.decal = (g, w, h) => {
    g.strokeStyle = '#23263a'; g.lineWidth = 5; g.lineCap = 'round';
    // cell state (the conveyor belt) along the top
    const yc = h * 0.16;
    g.beginPath(); g.moveTo(-10, yc); g.lineTo(w + 10, yc); g.stroke();
    // hidden state along the bottom
    g.beginPath(); g.moveTo(-10, h * 0.9); g.lineTo(w * 0.8, h * 0.9); g.lineTo(w * 0.8, h * 0.62); g.stroke();
    // gate feeds
    for (const gx of [0.18, 0.36, 0.52, 0.68]) { g.beginPath(); g.moveTo(w * gx, h * 0.9); g.lineTo(w * gx, h * 0.62); g.stroke(); }
    g.beginPath(); g.moveTo(w * 0.18, h * 0.5); g.lineTo(w * 0.18, yc); g.moveTo(w * 0.36, h * 0.5); g.lineTo(w * 0.36, h * 0.36); g.lineTo(w * 0.5, h * 0.36); g.moveTo(w * 0.52, h * 0.5); g.lineTo(w * 0.52, h * 0.36);
    g.moveTo(w * 0.5, h * 0.3); g.lineTo(w * 0.5, yc); g.moveTo(w * 0.68, h * 0.5); g.lineTo(w * 0.68, h * 0.44); g.lineTo(w * 0.8, h * 0.44);
    g.moveTo(w * 0.8, yc); g.lineTo(w * 0.8, h * 0.3); g.stroke();
    // pointwise ops (pink circles)
    const op = (x, y, s) => { circle(g, x, y, h * 0.055, '#f6b6c8'); ringS(g, x, y, h * 0.055, '#23263a', 4); g.fillStyle = '#23263a'; g.font = `700 ${h * 0.075}px ${GROT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y + 1); };
    op(w * 0.18, yc, '×'); op(w * 0.5, yc, '+'); op(w * 0.5, h * 0.36, '×'); op(w * 0.8, h * 0.44, '×');
    g.save(); g.translate(w * 0.8, h * 0.3); g.scale(1.6, 1); circle(g, 0, 0, h * 0.045, '#f6b6c8'); g.restore();
    g.fillStyle = '#23263a'; g.font = `italic 400 ${h * 0.05}px ${ROMAN}`; g.textAlign = 'center'; g.fillText('tanh', w * 0.8, h * 0.31);
    g.font = `italic 400 ${h * 0.07}px ${ROMAN}`; g.textAlign = 'left'; g.fillText('c', w * 0.02, yc - h * 0.04); g.fillText('h', w * 0.02, h * 0.86);
  };
  B.push(body);
  const gates = [['σ', 0.18], ['σ', 0.36], ['tanh', 0.52], ['σ', 0.68]];
  for (const [lab, gx] of gates) {
    B.push({ c: [-280 + 560 * gx, 380 * 0.56 - 180, -20 - 18], s: [66, 44, 36], col: T(PAPER.yellow),
      decal: (g, w, h) => { g.fillStyle = '#23263a'; g.font = `italic 400 ${h * (lab === 'σ' ? 0.8 : 0.5)}px ${ROMAN}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(lab, w / 2, h / 2); } });
  }
  return B;
}
function drawLSTM(ctx, cam, o = {}) { drawBoxes(ctx, lstmBoxes(o), cam, { line: o.line || LINE, lw: o.lw || 3, light: o.light }); }

// ── the Perceptron (1958): a single Σ node standing like a figure ────────────
// (x,y) = feet; s = scale; o.face: 'front' | 'down'; o.pal
function perceptron(ctx, x, y, s, o = {}) {
  const P = o.pal || { base: '#f4f6fb', shade: '#b6c1dc', line: '#39405e', accent: '#e0402e', wire: '#39405e' };
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // inputs x1..x5 fanning above the node (weights)
  const hx = 0, hy = -520, hr = 70;
  const ins = [-150, -80, 0, 80, 150];
  ctx.strokeStyle = P.wire; ctx.lineWidth = 5;
  ins.forEach((dx, i) => { ctx.beginPath(); ctx.moveTo(hx + dx * 1.2, hy - 170 + Math.abs(dx) * 0.45); ctx.lineTo(hx + dx * 0.25, hy - hr * 0.8); ctx.stroke(); });
  ins.forEach((dx, i) => { const cx = hx + dx * 1.2, cy = hy - 170 + Math.abs(dx) * 0.45; circle(ctx, cx, cy, 22, P.base); ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.clip(); circle(ctx, cx + 9, cy + 9, 20, P.shade); ctx.restore(); ringS(ctx, cx, cy, 22, P.line, 5);
    ctx.fillStyle = P.line; ctx.font = `italic 400 22px ${ROMAN}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('x' + '₁₂₃₄₅'[i], cx, cy + 1); });
  // body: output axon + the step unit (torso), a stand
  ctx.fillStyle = P.base; rrect(ctx, -58, hy + 110, 116, 250, 26); ctx.fill();
  ctx.save(); rrect(ctx, -58, hy + 110, 116, 250, 26); ctx.clip(); ctx.fillStyle = P.shade; ctx.fillRect(18, hy + 100, 60, 280); ctx.restore();
  rrect(ctx, -58, hy + 110, 116, 250, 26); ctx.strokeStyle = P.line; ctx.lineWidth = 6; ctx.stroke();
  // step function glyph (the Heaviside activation) in the accent colour
  ctx.strokeStyle = P.accent; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-34, hy + 280); ctx.lineTo(0, hy + 280); ctx.lineTo(0, hy + 190); ctx.lineTo(34, hy + 190); ctx.stroke();
  ctx.strokeStyle = P.line; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, hy + hr); ctx.lineTo(0, hy + 110); ctx.moveTo(0, hy + 360); ctx.lineTo(0, -40); ctx.stroke();
  ctx.fillStyle = P.line; ctx.beginPath(); ctx.moveTo(-26, -52); ctx.lineTo(26, -52); ctx.lineTo(0, 0); ctx.fill();
  // the Σ head
  circle(ctx, hx, hy, hr, P.base);
  ctx.save(); ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.clip(); circle(ctx, hx + 34, hy + 30, hr * 0.95, P.shade); ctx.restore();
  ringS(ctx, hx, hy, hr, P.line, 7);
  ctx.fillStyle = o.eye ? P.accent : P.line; ctx.font = `italic 500 ${hr * 1.1}px "EB Garamond"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Σ', hx, hy + 4);
  ctx.restore();
}

// ── silhouettes (black cut-outs) ────────────────────────────────────────────
/** Fig. 1 of the paper as a standing silhouette; (x,y) = bottom centre */
function silFigure1(ctx, x, y, s, col = '#05060c') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'butt';
  const R = (x0, y0, w, h, r) => { rrect(ctx, x0, y0, w, h, r); ctx.fill(); };
  R(-104, -470, 92, 290, 16); R(8, -560, 96, 380, 16);                     // encoder / decoder towers
  R(-100, -150, 84, 36, 6); R(12, -150, 84, 36, 6);                         // embeddings
  circle(ctx, -58, -168, 13, col); circle(ctx, 54, -168, 13, col);          // ⊕ positional
  R(12, -612, 84, 34, 6); R(12, -662, 84, 34, 6);                           // Linear, Softmax
  ctx.lineWidth = 9; ctx.beginPath();
  ctx.moveTo(-58, -110); ctx.lineTo(-58, 0); ctx.moveTo(54, -110); ctx.lineTo(54, 0);      // inputs / outputs (the legs)
  ctx.moveTo(54, -660); ctx.lineTo(54, -720); ctx.moveTo(-12, -440); ctx.lineTo(8, -420);   // output arrow, cross-attention
  ctx.moveTo(-104, -330); ctx.lineTo(-128, -330); ctx.lineTo(-128, -250); ctx.lineTo(-104, -250); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(38, -720); ctx.lineTo(70, -720); ctx.lineTo(54, -748); ctx.fill();
  ctx.restore();
}
/** LSTM module silhouette: rounded module with its six wires (c, h in/out, x in, h up) */
function silLSTM(ctx, x, y, s, col = '#05060c', flip = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * flip, s); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'butt';
  rrect(ctx, -300, -220, 600, 440, 70); ctx.fill();
  ctx.lineWidth = 30; ctx.beginPath();
  ctx.moveTo(-560, -150); ctx.lineTo(540, -150);          // cell state through
  ctx.moveTo(-560, 170); ctx.lineTo(-300, 170);           // h(t-1) in
  ctx.moveTo(300, 150); ctx.lineTo(540, 150);             // h(t) out
  ctx.moveTo(220, -220); ctx.lineTo(220, -470);           // h(t) up
  ctx.moveTo(-230, 220); ctx.lineTo(-230, 470);           // x(t) in
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(540, -190); ctx.lineTo(600, -150); ctx.lineTo(540, -110); ctx.fill();
  ctx.beginPath(); ctx.moveTo(540, 110); ctx.lineTo(600, 150); ctx.lineTo(540, 190); ctx.fill();
  ctx.beginPath(); ctx.moveTo(180, -470); ctx.lineTo(220, -530); ctx.lineTo(260, -470); ctx.fill();
  // the pointwise ops bulge through the top edge
  for (const cx of [-170, 40]) circle(ctx, cx, -150, 52, col);
  ctx.restore();
}
/** CNN feature-map stacks silhouette (LeNet-style: maps fanned in depth, shrinking) */
function silCNN(ctx, x, y, s, col = '#05060c') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col;
  const layers = [[0, 0, 320, 1], [-330, 50, 250, 5], [-600, 90, 180, 6], [-820, 120, 120, 8], [-980, 140, 80, 10]];
  for (const [dx, dy, sz, n] of layers) {
    for (let k = n - 1; k >= 0; k--) {
      const ox = dx + k * 16, oy = dy - k * 14;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + sz * 0.42, oy - sz * 0.22); ctx.lineTo(ox + sz * 0.42, oy - sz * 0.22 + sz); ctx.lineTo(ox, oy + sz); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}
/** the Perceptron as a black standing silhouette */
function silPerceptron(ctx, x, y, s, col = '#05060c') {
  perceptron(ctx, x, y, s, { pal: { base: col, shade: col, line: col, accent: col, wire: col } });
}
/** a hand silhouette (strokes with round caps); (x,y) = wrist, a = arm direction (toward fingertips) */
function silHand(ctx, x, y, s, a, pinch = 1, col = '#070712') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
  ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // forearm from off-screen + palm
  ctx.beginPath(); ctx.moveTo(-1400, -70); ctx.lineTo(-40, -44); ctx.quadraticCurveTo(60, -62, 170, -46); ctx.lineTo(190, 40); ctx.quadraticCurveTo(80, 62, -30, 44); ctx.lineTo(-1400, 70); ctx.fill();
  const finger = (pts, w) => { ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); };
  const c = pinch;
  finger([[160, -38], [250, -44], [320, -30 + 18 * c], [352, -8 + 40 * c]], 30);     // index (bends down to meet thumb)
  finger([[168, -14], [270, -12], [350, 6], [398, 28]], 31);                           // middle
  finger([[168, 10], [262, 16], [334, 34], [372, 56]], 29);                            // ring
  finger([[162, 30], [236, 42], [292, 60], [318, 78]], 24);                            // little
  finger([[80, 34], [170, 70], [250, 64 - 10 * c], [322, 50 - 14 * c]], 34);           // thumb reaching the index tip
  ctx.restore();
}

// ── Unit-01 = accelerator card "TYPE-01" (purple/green livery), standing on its edge ──
const EVA = { purple: ['#8d5ecb', '#5b3b96', '#3b2567'], green: ['#9cf252', '#5fb52c', '#3f7f1c'], dark: ['#3a3848', '#25232f', '#18171f'],
  silver: ['#d9dbe6', '#9a9db2', '#6d7086'], gold: ['#f2c24a', '#b88a22', '#7e5c12'], orange: ['#ff9c3a', '#d66a1a', '#a04a10'] };
function fan(g, cx, cy, r, rot) {
  circle(g, cx, cy, r, '#1b1a24'); ringS(g, cx, cy, r, '#101018', 6);
  g.save(); g.translate(cx, cy); g.rotate(rot);
  for (let i = 0; i < 9; i++) { g.rotate(Math.PI * 2 / 9); g.beginPath(); g.moveTo(r * 0.28, -r * 0.06); g.quadraticCurveTo(r * 0.7, -r * 0.3, r * 0.9, -r * 0.02); g.quadraticCurveTo(r * 0.62, r * 0.12, r * 0.28, r * 0.1); g.fillStyle = '#4a4760'; g.fill(); }
  g.restore();
  circle(g, cx, cy, r * 0.27, '#2b2938'); ringS(g, cx, cy, r * 0.27, '#9cf252', 4);
}
function cardBoxes(o = {}) {
  const P = o.pal || EVA;
  const eyes = o.eyes ?? 0.6;
  const B = [];
  B.push({ c: [0, 0, 0], s: [300, 840, 110], col: P.purple, bias: 10,
    decal: o.silhouette ? null : (g, w, h) => {
      // armour panel breaks
      g.strokeStyle = '#2a1848'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(0, h * 0.16); g.lineTo(w * 0.3, h * 0.12); g.lineTo(w * 0.7, h * 0.12); g.lineTo(w, h * 0.16); g.moveTo(0, h * 0.86); g.lineTo(w * 0.25, h * 0.9); g.lineTo(w * 0.75, h * 0.9); g.lineTo(w, h * 0.86); g.stroke();
      // green livery stripes
      g.fillStyle = P.green[0];
      g.beginPath(); g.moveTo(w * 0.06, h * 0.2); g.lineTo(w * 0.14, h * 0.2); g.lineTo(w * 0.14, h * 0.82); g.lineTo(w * 0.06, h * 0.85); g.fill();
      g.beginPath(); g.moveTo(w * 0.94, h * 0.2); g.lineTo(w * 0.86, h * 0.2); g.lineTo(w * 0.86, h * 0.82); g.lineTo(w * 0.94, h * 0.85); g.fill();
      g.fillRect(w * 0.3, h * 0.505, w * 0.4, h * 0.012);
      fan(g, w / 2, h * 0.33, w * 0.36, o.fanRot || 0); fan(g, w / 2, h * 0.68, w * 0.36, (o.fanRot || 0) + 0.4);
      // the eyes: two slanted LED slits under the bracket
      const ec = eyes > 0.5 ? '#fffbe6' : (P.eyeOff || '#6a5a2a');
      g.fillStyle = ec;
      g.beginPath(); g.moveTo(w * 0.2, h * 0.055); g.lineTo(w * 0.42, h * 0.075); g.lineTo(w * 0.4, h * 0.09); g.lineTo(w * 0.22, h * 0.078); g.fill();
      g.beginPath(); g.moveTo(w * 0.8, h * 0.055); g.lineTo(w * 0.58, h * 0.075); g.lineTo(w * 0.6, h * 0.09); g.lineTo(w * 0.78, h * 0.078); g.fill();
      g.fillStyle = '#ff9c3a'; g.fillRect(w * 0.46, h * 0.045, w * 0.08, h * 0.05);
      g.fillStyle = '#e8e2f6'; g.font = `700 ${w * 0.075}px ${COND}`; g.textAlign = 'center'; g.fillText(o.label || 'TYPE-01', w / 2, h * 0.955);
    },
    side: o.silhouette ? null : (g, d, h) => { g.fillStyle = '#26232f'; g.fillRect(d * 0.1, h * 0.04, d * 0.8, h * 0.92); g.strokeStyle = '#4c4860'; g.lineWidth = 3; for (let y = h * 0.06; y < h * 0.95; y += 14) { g.beginPath(); g.moveTo(d * 0.12, y); g.lineTo(d * 0.88, y); g.stroke(); } } });
  B.push({ c: [0, -436, 0], s: [330, 34, 60], col: P.silver });                       // bracket (the "shoulders")
  B.push({ c: [70, -468, 20], s: [60, 36, 44], col: P.dark });                        // power connector (the horn)
  B.push({ c: [-20, 440, 0], s: [210, 42, 14], col: P.gold });                        // PCIe fingers (the feet)
  return B;
}
function drawCard(ctx, cam, o = {}) {
  let B = cardBoxes(o);
  if (o.silhouette) B = B.map((b) => ({ ...b, col: [o.silhouette, o.silhouette, o.silhouette], decal: null, side: null }));
  drawBoxes(ctx, B, cam, { line: o.silhouette || o.line || '#1a1024', lw: o.lw || 3, light: o.light });
  return B;
}
