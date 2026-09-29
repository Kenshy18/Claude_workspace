// ── C-035 .. C-102 : chorus. A flip through already-drawn storyboard rows at the real OP's 2–22 frame cuts ──
// Graphite first; colour only as spot accents. Text cards are black paste-up cards (写植 on black paper).
function flip(id, o) { SPEC[id] = { noNotesCam: true, ...o }; }
const BLUE_W = '#8fbfe6', PURP = COL.mPurple, GRN = COL.mGreen, ORNG = COL.mOrange;

// ── shared drawing helpers ──────────────────────────────────────────────────
function speed(B, ang, n, seed, o = {}) {           // storyboard speed lines (graphite)
  const rng = mulberry32(seed), c = Math.cos(ang), s = Math.sin(ang);
  for (let i = 0; i < n; i++) {
    const px = rng() * 1700 - 130, py = rng() * 1300 - 110, L2 = 160 + rng() * 420;
    B.line(px, py, px + c * L2, py + s * L2, { w: o.w ?? 1.8, a: o.a ?? 0.45, passes: 1, wob: 0.4, col: o.col, weight: 3 });
  }
}
function racks(B, y0, seed, o = {}) {               // datacenter skyline: rows of server racks + cooling towers
  const rng = mulberry32(seed), x0 = o.x0 ?? -20, x1 = o.x1 ?? 1460;
  let x = x0;
  while (x < x1) {
    const w = 60 + rng() * 120, h = (o.h ?? 260) * (0.35 + rng() * 0.75);
    const P = rectPts(x, y0 - h, w, h + 400);
    if (o.fill) B.marker(P, o.fill, { a: o.fa ?? 0.85, streak: 0.3, weight: 2 });
    B.rect(x, y0 - h, w, h + 400, { w: 2, a: 0.8, passes: 1, weight: 4 });
    const rows = Math.floor(h / 26);
    for (let r = 1; r < rows; r += 1 + (rng() < 0.4 ? 1 : 0)) B.line(x + 6, y0 - h + r * 26, x + w - 6, y0 - h + r * 26, { w: 1.2, a: 0.5, passes: 1, weight: 1 });
    if (rng() < 0.25) { const cw = w * 0.7; B.stroke([[x + w * 0.15, y0 - h], [x + w * 0.25, y0 - h - 90], [x + w * 0.75, y0 - h - 90], [x + w * 0.85, y0 - h]], { w: 1.8, a: 0.75, passes: 1 }); B.ellipse(x + w / 2, y0 - h - 90, cw / 2 * 0.72, 10, { w: 1.4, a: 0.6, passes: 1 }); }
    x += w + 4 + rng() * 18;
  }
}
function bust(B, cx, cy, s, o = {}) {               // head-and-shoulders outline for the "mugshots"
  const T = (pts) => pts.map(([x, y]) => [cx + x * s, cy + y * s]);
  const a = o.a ?? 0.88;
  for (const sx of [-1, 1]) B.curve(T([[sx * 228, -20], [sx * 262, -10], [sx * 268, 60], [sx * 244, 110], [sx * 226, 100]]), { w: 2.4, a });
  B.hatch(T([[-110, 230], [110, 230], [110, 300], [0, 330], [-110, 300]]), 0.8, 9, { w: 1.5, a: a * 0.55 });
  B.hatch(T([[-230, -40], [-150, -40], [-120, 120], [-150, 220], [-200, 170], [-238, 80]]), 0.85, 11, { w: 1.4, a: a * 0.35 });
  const sh = T([[-470, 560], [-430, 420], [-300, 330], [-120, 300], [120, 300], [300, 330], [430, 420], [470, 560]]);
  if (o.suit) B.marker(sh.concat(T([[470, 700], [-470, 700]])), o.suit, { a: 0.7, weight: 5 });
  B.curve(sh, { w: 3, a });
  B.stroke(T([[-95, 190], [-110, 305]]), { w: 2.6, a }); B.stroke(T([[95, 190], [110, 305]]), { w: 2.6, a });
  B.stroke(T([[-120, 300], [0, 420], [120, 300]]), { w: 2.4, a: a * 0.9 });                 // collar
  B.stroke(T([[-60, 360], [0, 420], [60, 360]]), { w: 1.8, a: a * 0.7 });
  B.curve(T([[-230, -40], [-240, 90], [-180, 200], [-80, 262], [0, 272], [80, 262], [180, 200], [240, 90], [230, -40]]), { w: 3, a });  // jaw
  B.curve(T([[-232, -40], [-220, -210], [-120, -300], [0, -318], [120, -300], [220, -210], [232, -40]]), { w: 2.4, a: a * 0.6 });
  if (o.hair) o.hair(B, T, a);
}
function optPortrait(B, key, name, sub, bgc, hair, o = {}) {
  B.done();
  bg(B, bgc, 0.55);
  const X = 720 + (o.dx || 0);
  bust(B, X, 470, 1.08, { hair, suit: o.suit });
  contourPortrait(B, X, 450, 76, window.D5.opt[key], { col: COL.red, levels: [0.3, 1, 2.2, 4] });
  B.text(name, 90, 980, { size: 58, a: 0.92 });
  B.text(sub, 92, 1036, { size: 26, a: 0.8 });
  const it = B.text('f(θ₄₀) = ' + window.D5.optFinal[key].toFixed(5), 1350, 1030, { size: 30, align: 'right', col: COL.red, a: 0.9 }); it.fixed = true;
}
function digitPortrait(B, k, bgc, o = {}) {
  const d = window.D5.digits[k];
  B.done();
  bg(B, bgc, 0.55);
  const cs = 78, x0 = 720 - cs * 4 + (o.dx || 0), y0 = 450 - cs * 4;
  B.custom((ctx) => {
    const pat = ctx.createPattern(hatchTile(COL.graph, 'graphite'), 'repeat');
    ctx.fillStyle = '#fbfaf5'; ctx.globalAlpha = 0.9; ctx.fillRect(x0 - 16, y0 - 16, cs * 8 + 32, cs * 8 + 32);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const v = d.img[r][c];
      if (v <= 0.02) continue;
      ctx.globalAlpha = 0.25 + 0.7 * v; ctx.fillStyle = COL.graph; ctx.fillRect(x0 + c * cs + 3, y0 + r * cs + 3, cs - 6, cs - 6);
      ctx.globalAlpha = 0.6 * v; ctx.fillStyle = pat; ctx.fillRect(x0 + c * cs, y0 + r * cs, cs, cs);
    }
  }, { weight: 50 });
  B.rect(x0 - 16, y0 - 16, cs * 8 + 32, cs * 8 + 32, { w: 3, a: 0.85 });
  for (let i = 1; i < 8; i++) { B.line(x0 + i * cs, y0, x0 + i * cs, y0 + 8 * cs, { w: 1, a: 0.25, passes: 1 }); B.line(x0, y0 + i * cs, x0 + 8 * cs, y0 + i * cs, { w: 1, a: 0.25, passes: 1 }); }
  B.text(o.name || ('No.' + d.y), 90, 990, { size: 54, a: 0.92 });
  const it = B.text(`y = ${d.y}   p̂(y|x) = ${d.p.toFixed(3)}`, 1360, 1030, { size: 32, align: 'right', col: COL.red, a: 0.9 }); it.fixed = true;
  const dx = o.dx || 0;
  if (o.shoulders !== false) B.curve([[180 + dx, 1100], [260 + dx, 950], [480 + dx, 880], [960 + dx, 880], [1180 + dx, 950], [1260 + dx, 1100]], { w: 3, a: 0.7 });
}
// text cards (black paper, white condensed type)
function cardTxt(lines, o = {}) {
  return (ctx) => { for (const L2 of lines) (L2.sans ? sansHeavy : condText)(ctx, L2.s, L2.x, L2.y, L2.size, { align: L2.align || 'center', sx: L2.sx, col: L2.col || o.col, ls: L2.ls }); };
}
function explosion(B, cx, cy, r, seed, col, o = {}) {
  const rng = mulberry32(seed), pts = [];
  const n = 26;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rr = r * (i % 2 ? 0.55 + rng() * 0.2 : 0.9 + rng() * 0.35); pts.push([cx + Math.cos(a) * rr * 1.25, cy + Math.sin(a) * rr]); }
  B.marker(pts, col, { a: o.a ?? 0.8, streak: 0.5, mode: o.mode });
  B.poly(pts, { w: 2.6, a: 0.85 });
  const inner = pts.map(([x, y]) => [cx + (x - cx) * 0.55, cy + (y - cy) * 0.55]);
  whiteOut(B, inner); B.poly(inner, { w: 1.8, a: 0.6, passes: 1 });
}
function figureStand(B, cx, top, s, o = {}) {       // slim standing figure (plugsuit), line only
  const T = (pts) => pts.map(([x, y]) => [cx + x * s, top + y * s]);
  const a = o.a ?? 0.85, w = o.w ?? 2.6, c = { w, a, col: o.col };
  if (o.fill) B.marker(T([[-30, 0], [30, 0], [36, 70], [70, 110], [80, 300], [60, 470], [44, 760], [-44, 760], [-60, 470], [-80, 300], [-70, 110], [-36, 70]]), o.fill, { a: 0.95, streak: 0 });
  B.ellipse(cx, top + 40 * s, 32 * s, 42 * s, c);
  B.curve(T([[-18, 80], [-70, 110], [-86, 200], [-80, 300], [-62, 460], [-50, 620], [-44, 760]]), c);
  B.curve(T([[18, 80], [70, 110], [86, 200], [80, 300], [62, 460], [50, 620], [44, 760]]), c);
  B.curve(T([[-70, 120], [-100, 260], [-96, 420]]), { ...c, w: w * 0.9 }); B.curve(T([[70, 120], [100, 260], [96, 420]]), { ...c, w: w * 0.9 });
  B.stroke(T([[-40, 130], [0, 150], [40, 130]]), { ...c, w: w * 0.7 });
  B.stroke(T([[0, 460], [0, 760]]), { ...c, w: w * 0.8 });
  if (o.hair) B.curve(T([[-40, 30], [-34, -8], [0, -14], [34, -8], [40, 30], [30, 60]]), { ...c, w: w * 1.2 });
}

// ── C-035..C-039 : the unit, close ──────────────────────────────────────────
flip('C-035', {
  pcam(lt) { const s = 1.04 + 0.05 * lt; return [s, 0, 0, s, 720 * (1 - s), 540 * (1 - s)]; },
  build(B) {
    B.done(); bg(B, BLUE_W, 0.45);
    B.group({ m: () => [Math.cos(-0.42), Math.sin(-0.42), -Math.sin(-0.42), Math.cos(-0.42), -120, 330] });
    mechaHead(B, 640, 420, 1.3, { eyeCol: '#e5483a' });
    B.ungroup();
    const rng = mulberry32(3501);
    for (let i = 0; i < 9; i++) { const x = 60 + rng() * 520, y = 520 + rng() * 480, r = 12 + rng() * 34; const P = [[x, y - r], [x + r * 1.1, y - r * 0.2], [x + r * 0.4, y + r], [x - r * 0.9, y + r * 0.3]]; B.marker(P, '#5fb3e6', { a: 0.8, streak: 0 }); B.poly(P, { w: 1.8, a: 0.8, passes: 1 }); }
    speed(B, -0.5, 16, 3502, { a: 0.3 });
    note(B, '顔 超アップ (傾き)。破片が飛ぶ', ACT.y + 2, { size: 22 });
  },
});
flip('C-036', { build(B) {
  B.done(); bg(B, BLUE_W, 0.5);
  for (const c of [[80, 90, 520, 150, 36], [860, 40, 520, 170, 37]]) { const P = cloudPoly(c[0], c[1], c[2], c[3], c[4], false); whiteOut(B, P); B.stroke(P.slice(1, -8), { w: 2, a: 0.55, col: COL.blue, passes: 1 }); }
  const P = catmull([[-40, 1100], [120, 700], [420, 560], [860, 560], [1180, 700], [1480, 900], [1480, 1100]], 5);
  B.marker(P, PURP, { a: 0.75 }); B.stroke(P, { w: 3.4, a: 0.9 });
  for (let i = 0; i < 4; i++) B.stroke([[300 + i * 150, 640 - i * 10], [240 + i * 170, 1080]], { w: 2, a: 0.6 });
  B.marker(ellipsePts(760, 520, 70, 62, 0, 7, 0, 24), COL.mYellow, { a: 0.9, streak: 0 }); B.circle(760, 520, 66, { w: 3, a: 0.9 });
  B.ellipse(760, 500, 40, 18, { w: 2, a: 0.6 });
  note(B, '肩のノブ (青空)', ACT.y + 2, { size: 22 });
} });
flip('C-037', { build(B) {
  B.done(); bg(B, BLUE_W, 0.35);
  const P = [[-40, 380], [1480, 60], [1480, 760], [-40, 1000]];
  B.marker(P, PURP, { a: 0.75 });
  for (const [y0, y1] of [[520, 330], [760, 560]]) B.marker([[300, y0], [1480, y1 - 120], [1480, y1 - 40], [300, y0 + 60]], GRN, { a: 0.85, streak: 0.3 });
  B.stroke([[-40, 380], [1480, 60]], { w: 4, a: 0.9 }); B.stroke([[-40, 1000], [1480, 760]], { w: 4, a: 0.9 });
  speed(B, -0.2, 30, 3701, { a: 0.5, w: 2.2 });
  note(B, '腕 横切る (流線)', ACT.y + 2, { size: 22 });
} });
function eyesGlow(B, o = {}) {
  B.done(); bg(B, COL.mBlack, 0.95);
  B.marker([[900, -20], [1460, -20], [1460, 1100], [760, 1100], [820, 600]], PURP, { a: 0.7 });
  B.stroke([[900, -20], [820, 600], [760, 1100]], { w: 3, a: 0.6, col: '#bba4d8' });
  B.paste((ctx) => {
    for (const [x, y, s] of o.eyes || [[330, 470, 1], [1080, 450, 0.8]]) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.5);
      const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 260); g.addColorStop(0, 'rgba(235,245,255,0.8)'); g.addColorStop(1, 'rgba(160,200,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 300, 170, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-190, 0); ctx.lineTo(0, -60); ctx.lineTo(190, 0); ctx.lineTo(0, 60); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  });
  B.marker([[80, 760], [240, 700], [260, 800], [100, 850]], COL.mRed, { a: 0.8 });
  B.marker([[60, 860], [200, 840], [220, 900], [70, 930]], GRN, { a: 0.8 });
  const it = B.text('透過光', 1160, 980, { size: 34, col: '#ffb3a8', a: 0.9 }); it.fixed = true;
}
flip('C-038', { fx(lt, fx) { fx.flash = lt < 0.04 ? 0.5 : 0; }, build(B) { eyesGlow(B); note(B, '目 光る (白)', ACT.y + 2, { size: 22 }); } });
flip('C-039', {
  build(B) {
    B.done(); bg(B, '#cfe3ef', 0.5);
    for (const x of [1210, 1330]) B.marker([[x, 80], [x + 70, 60], [x + 80, 720], [x + 10, 740]], COL.mRed, { a: 0.8 });
    B.marker([[0, 820], [1440, 760], [1440, 1080], [0, 1080]], '#e8e8ea', { a: 0.6 });
    const poses = [[0, 0.0, 0.14], [0.35, 0.14, 0.27], [0.6, 0.27, 9]];
    for (const [sp, a0, a1] of poses) { B.group({ alpha: (lt) => (lt >= a0 && lt < a1 ? 1 : 0) }); mechaHand(B, 640, 40, 1.35, { spread: sp }); B.ungroup(); }
    note(B, '手 アップ。指が開く (3枚)', ACT.y + 2, { size: 22 });
  },
});
flip('C-040', { build(B) {
  B.done();
  pasteCard(B, cardTxt([{ s: 'TEST SET', x: 720, y: 660, size: 330, sx: 0.86 }]));
  note(B, 'テロップ (黒ベタ白抜き)', ACT.y + 2, { size: 22 });
  rnote(B, 'TEST TYPE → TEST SET', ACT.y + 40, { size: 22, col: COL.red });
} });
flip('C-041', { build(B) {
  B.done(); bg(B, '#9fc4e0', 0.4);
  racks(B, 1000, 4101, { h: 300 });
  B.group({ m: () => [1, 0, 0, 1, 0, 0] });
  mecha(B, 720, -380, 2.1, { arms: 0.05, green: true });
  B.ungroup();
  B.marker([[0, 980], [1440, 940], [1440, 1080], [0, 1080]], COL.mRed, { a: 0.75 });
  for (let i = 0; i < 5; i++) B.curve([[520 + i * 90, 560], [300 + i * 60, 760], [-40, 820 + i * 30]], { w: 5, a: 0.8, passes: 1 });
  note(B, '背中 (アオリ)。電源ケーブル', ACT.y + 2, { size: 22 });
  note(B, '街 = サーバーラック', ACT.y + 32, { size: 22 });
} });
flip('C-042', { build(B) {
  B.done();
  pasteCard(B, cardTxt([{ s: 'EVAL-01', x: 720, y: 740, size: 480, sx: 0.8 }]));
  note(B, 'テロップ', ACT.y + 2, { size: 22 });
  rnote(B, 'EVA-01 → EVAL-01', ACT.y + 40, { size: 22, col: COL.red });
} });
flip('C-043', { build(B) {
  B.done(); bg(B, '#7fb2e0', 0.55);
  for (const c of [[700, 120, 600, 200, 43], [900, 600, 520, 180, 44]]) { const P = cloudPoly(c[0], c[1], c[2], c[3], c[4], false); whiteOut(B, P); B.stroke(P.slice(1, -8), { w: 2, a: 0.55, col: COL.blue, passes: 1 }); }
  const P = [[-40, 80], [520, -20], [880, 360], [760, 700], [300, 1100], [-40, 1100]];
  B.marker(P, PURP, { a: 0.78 }); B.poly(P, { w: 3.4, a: 0.9 });
  B.marker([[-40, 0], [400, -20], [120, 260], [-40, 280]], GRN, { a: 0.85 });
  for (let i = 0; i < 5; i++) B.line(120 + i * 110, 200 + i * 40, 60 + i * 120, 1100, { w: 2, a: 0.55 });
  B.marker(ellipsePts(640, 520, 40, 36, 0, 7, 0, 20), COL.mYellow, { a: 0.95, streak: 0 }); B.circle(640, 520, 40, { w: 2.6, a: 0.9 });
  note(B, '肩〜腕 (青空バック)', ACT.y + 2, { size: 22 });
} });
flip('C-044', { build(B) {
  B.done(); bg(B, '#8fb5dd', 0.45);
  const P = [[-40, -20], [1480, -20], [1480, 1100], [-40, 1100]];
  B.marker([[-40, -20], [1100, -20], [1300, 400], [900, 1100], [-40, 1100]], PURP, { a: 0.72 });
  B.marker([[520, 220], [980, 180], [760, 700]], ORNG, { a: 0.85 });
  B.poly([[520, 220], [980, 180], [760, 700]], { w: 3, a: 0.9 });
  B.marker([[1060, -20], [1480, -20], [1480, 260], [1180, 180]], GRN, { a: 0.85 });
  for (const [x, y] of [[300, 380], [300, 600], [360, 820]]) { B.circle(x, y, 60, { w: 3, a: 0.85 }); B.marker(ellipsePts(x, y, 56, 56, 0, 7, 0, 20), COL.mBlueDeep, { a: 0.7 }); }
  B.stroke([[1100, -20], [1300, 400], [900, 1100]], { w: 3.4, a: 0.9 });
  note(B, '胸 アップ (橙の装甲)', ACT.y + 2, { size: 22 });
} });
flip('C-045', { build(B) {
  B.done(); bg(B, COL.mBlueDeep, 0.55);
  B.marker([[-40, 420], [700, 160], [1480, 300], [1480, 1100], [-40, 1100]], '#2c2240', { a: 0.9 });
  B.marker([[-40, 1000], [400, 700], [520, 740], [120, 1100]], GRN, { a: 0.8 });
  B.stroke([[-40, 420], [700, 160], [1480, 300]], { w: 3, a: 0.6, col: '#c9b8e8' });
  note(B, '暗い肩 (逆光)', ACT.y + 2, { size: 22 });
} });
flip('C-046', { build(B) {
  B.done(); bg(B, '#d7c7e6', 0.45);
  mechaHead(B, 720, 360, 0.8, { jawCol: ORNG });
  B.marker([[380, 900], [1060, 900], [1180, 1100], [260, 1100]], ORNG, { a: 0.8 });
  note(B, '顔 (見上げ)', ACT.y + 2, { size: 22 });
} });
flip('C-047', { build(B) {
  B.done(); bg(B, '#f1dfe6', 0.4);
  mecha(B, 720, -60, 2.0, { arms: 0.12 });
  note(B, 'バストショット (白バック)', ACT.y + 2, { size: 22 });
} });

// ── C-048..C-058 : angel, core, the field card, moon, cards ─────────────────
flip('C-048', { build(B) {
  B.done(); bg(B, '#24402e', 0.9);
  const M = catmull([[720, 180], [1010, 260], [1110, 520], [1010, 760], [860, 830], [820, 1000], [720, 1060], [620, 1000], [580, 830], [430, 760], [330, 520], [430, 260], [720, 180]], 5);
  whiteOut(B, M); B.stroke(M, { w: 3.4, a: 0.9 });
  for (const x of [560, 880]) { B.marker(ellipsePts(x, 560, 96, 104, 0, 7, 0, 30), COL.mBlack, { a: 0.96, mode: 'solid' }); B.circle(x, 560, 100, { w: 3, a: 0.9 }); }
  B.stroke([[720, 180], [700, 380], [740, 620], [700, 880], [720, 1060]], { w: 1.8, a: 0.6 });
  const rng = mulberry32(4801);
  for (let i = 0; i < 7; i++) { const x = 860 + rng() * 200, y = 300 + rng() * 500, pts = [[x, y]]; for (let k = 0; k < 4; k++) pts.push([pts[k][0] + (rng() - 0.3) * 60, pts[k][1] + 30 + rng() * 40]); B.stroke(pts, { w: 1.8, a: 0.85, col: COL.red, passes: 1 }); }
  B.hatch([[430, 260], [720, 180], [700, 1060], [620, 1000], [580, 830], [430, 760], [330, 520]], 0.8, 16, { w: 1.4, a: 0.35 });
  const it = B.text('mask: j > i → −∞', 90, 1030, { size: 36, col: COL.red, a: 0.9 }); it.fixed = true;
  note(B, '使徒の仮面。ひび (赤)', ACT.y + 2, { size: 22 });
} });
flip('C-049', { build(B) {
  B.done(); bg(B, COL.mRed, 0.7);
  mecha(B, 720, 130, 0.95, { sil: true, silCol: '#5c1210' });
  B.hatch([[0, 700], [1440, 640], [1440, 1080], [0, 1080]], -0.3, 10, { w: 2, a: 0.4, col: '#6e1512' });
  note(B, '赤いシルエット', ACT.y + 2, { size: 22 });
} });
flip('C-050', { build(B) {
  B.done(); bg(B, COL.mBlack, 0.95);
  B.marker(ellipsePts(720, 540, 430, 430, 0, 7, 0, 60), COL.mRed, { a: 0.85 });
  B.circle(720, 540, 430, { w: 3, a: 0.8, col: '#ffb0a0' });
  const rng = mulberry32(5001);
  for (let i = 0; i < 6; i++) { const pts = []; let x = 440 + rng() * 400, y = 300 + rng() * 460; for (let k = 0; k < 7; k++) { pts.push([x, y]); x += (rng() - 0.4) * 90; y += (rng() - 0.5) * 70; } B.stroke(pts, { w: 2, a: 0.8, col: '#ffd6cc', passes: 1 }); }
  B.circle(880, 470, 22, { w: 2, col: '#ffd6cc', a: 0.9 }); B.circle(930, 470, 16, { w: 2, col: '#ffd6cc', a: 0.9 });
  B.paste((ctx) => {   // the core glows (light, as in the reference)
    const g = ctx.createRadialGradient(720, 540, 380, 720, 540, 600);
    g.addColorStop(0, 'rgba(255,90,70,0.55)'); g.addColorStop(1, 'rgba(255,60,40,0)');
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, 1440, 1080);
    const h = ctx.createRadialGradient(620, 420, 10, 620, 420, 260); h.addColorStop(0, 'rgba(255,230,220,0.45)'); h.addColorStop(1, 'rgba(255,200,190,0)');
    ctx.fillStyle = h; ctx.beginPath(); ctx.arc(720, 540, 430, 0, 7); ctx.fill(); ctx.restore();
  });
  const it = B.text('loss = NaN', 1000, 1010, { size: 48, col: '#ff9a8c', a: 0.95 }); it.fixed = true;
  note(B, 'コア (赤い球)', ACT.y + 2, { size: 22 });
} });
flip('C-051', { build(B) {
  B.done();
  pasteCard(B, (ctx) => {
    // oversized initials, as on the reference card (ABSOLUTE / TERROR / FIELD)
    const X = 150;
    sansHeavy(ctx, 'A', X, 390, 330); sansHeavy(ctx, 'TTENTION', X + 226, 390, 150);
    sansHeavy(ctx, 'T', X, 670, 310); sansHeavy(ctx, 'ENSOR', X + 190, 670, 150);
    sansHeavy(ctx, 'FIELD', X, 980, 340);
  });
  note(B, 'テロップ 頭文字を大きく', ACT.y + 2, { size: 22 });
  rnote(B, 'A.T.フィールド = Attention Tensor Field', ACT.y + 40, { size: 20, col: COL.red });
} });
flip('C-052', { build(B) {
  B.done(); bg(B, COL.mRed, 0.8);
  mechaHead(B, 720, 380, 0.9, { marker: false, a: 0.35, w: 2.2 });
  note(B, '赤 (顔がうっすら)', ACT.y + 2, { size: 22 });
} });
flip('C-053', {
  pcam(lt) { const s = 1.0 + 0.04 * lt; return [s, 0, 0, s, 720 * (1 - s), 700 * (1 - s)]; },
  build(B) {
    B.done(); bg(B, '#2f5a6e', 0.75);
    // the moon = the 97 token embeddings of (a+b) mod 97 at step 30,000: a circle (real snapshot)
    const R = 820, mx = 720, my = 1560;
    whiteOut(B, ellipsePts(mx, my, R, R, 0, 7, 0, 120));
    B.stroke(ellipsePts(mx, my, R, R, Math.PI * 1.02, Math.PI * 1.98, 0, 120), { w: 3, a: 0.8 });
    B.marker(ellipsePts(mx, my, R, R, 0, 7, 0, 120), '#dfe9f2', { a: 0.5, streak: 0, mode: 'accent' });
    const E = window.D5.emb, pts = E.pts[E.pts.length - 1];
    let rmax = 0; for (const [x, y] of pts) rmax = Math.max(rmax, Math.hypot(x, y));
    pts.forEach(([x, y], i) => {
      const px = mx + x / rmax * R * 0.86, py = my - y / rmax * R * 0.86;
      if (py < 1090) B.circle(px, py, 9 + (i % 5), { w: 1.8, a: 0.6, passes: 1, col: '#4a5f73' });
    });
    figureStand(B, 720, 90, 1.45, { fill: '#fbfaf5', hair: true, a: 0.9, w: 3 });
    B.marker([[680, 300], [760, 300], [755, 336], [685, 336]], COL.mRed, { a: 0.8, streak: 0 });
    const it = B.text('月 = (a+b) mod 97 の埋め込み (step 30,000)', 70, 1040, { size: 30, col: COL.red, a: 0.9 }); it.fixed = true;
    note(B, '巨大な月の前に立つ', ACT.y + 2, { size: 22 });
    note(B, 'ゆっくり T.U.', ACT.y + 32, { size: 22 });
    rnote(B, '月の縁の点 = 97 個の埋め込み', ACT.y + 90, { size: 21 });
    rnote(B, '(k = ' + window.D5.embFinalK + ' の円 — grokking 後)', ACT.y + 120, { size: 21 });
  },
});
flip('C-054', { build(B) {
  B.done();
  pasteCard(B, cardTxt([{ s: 'LOSS SPIKES', x: 720, y: 660, size: 290, sx: 0.8 }]));
  note(B, 'テロップ', ACT.y + 2, { size: 22 });
  rnote(B, 'ANGELS → LOSS SPIKES', ACT.y + 40, { size: 22, col: COL.red });
} });
flip('C-055', { build(B) {
  B.done(); bg(B, ORNG, 0.65);
  B.marker([[-20, -20], [1460, -20], [1460, 260], [-20, 330]], '#f7c35a', { a: 0.7 });
  racks(B, 760, 5501, { h: 380, fill: '#b04a1e', fa: 0.55 });
  B.marker([[-20, 760], [1460, 740], [1460, 1100], [-20, 1100]], '#6e2410', { a: 0.85 });
  racks(B, 1000, 5502, { h: 200, fill: '#3a1a10', fa: 0.8 });
  note(B, '夕景の街 (データセンター)', ACT.y + 2, { size: 22 });
} });
flip('C-056', { build(B) {
  B.done();
  pasteCard(B, cardTxt([{ s: 'US-EAST-1', x: 720, y: 690, size: 350, sx: 0.8 }]));
  note(B, 'テロップ', ACT.y + 2, { size: 22 });
  rnote(B, 'TOKYO-3 → US-EAST-1', ACT.y + 40, { size: 22, col: COL.red });
} });
flip('C-057', { build(B) {
  B.done(); bg(B, '#2a1d2c', 0.9);
  // feature pyramid (Lin et al. 2017): P2..P6, drawn as a lit pyramid in the geofront
  const apex = [760, 170], base = [[260, 880], [1240, 820], [980, 980], [140, 1000]];
  B.marker([apex, base[0], base[3]], '#e0607a', { a: 0.8 });
  B.marker([apex, base[3], base[2]], '#f39ab0', { a: 0.85 });
  B.marker([apex, base[2], base[1]], '#b0304c', { a: 0.8 });
  for (const b of base) B.line(apex[0], apex[1], b[0], b[1], { w: 3, a: 0.9, col: '#fde0e6' });
  B.poly(base, { w: 2.6, a: 0.8, col: '#fde0e6' });
  ['P6', 'P5', 'P4', 'P3', 'P2'].forEach((lab, i) => {
    const u = 0.2 + i * 0.18, A = base.map((b) => [lerp(apex[0], b[0], u), lerp(apex[1], b[1], u)]);
    B.poly(A, { w: 1.8, a: 0.75, col: '#fde0e6', passes: 1 });
    B.text(lab, A[1][0] + 30, A[1][1] + 10, { size: 30, col: '#fde0e6', a: 0.95 });
  });
  const it = B.text('Feature Pyramid (Lin+ 2017)', 70, 1040, { size: 30, col: '#ffb0c0', a: 0.9 }); it.fixed = true;
  note(B, 'ピラミッド (ジオフロント)', ACT.y + 2, { size: 22 });
} });
flip('C-058', { build(B) {
  B.done();
  pasteCard(B, (ctx) => {
    // parody org mark: a red nabla whose veins are gradient arrows (no official mark reproduced)
    ctx.save(); ctx.translate(720, 470);
    ctx.fillStyle = '#d23a2c';
    ctx.beginPath(); ctx.moveTo(-300, -250); ctx.lineTo(300, -250); ctx.lineTo(0, 290); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#141316';
    ctx.beginPath(); ctx.moveTo(-190, -190); ctx.lineTo(190, -190); ctx.lineTo(0, 150); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#d23a2c'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -170); ctx.lineTo(0, 110); ctx.stroke();
    for (let k = 0; k < 4; k++) { const y = -130 + k * 60, w = 140 - k * 32; ctx.beginPath(); ctx.moveTo(0, y + 30); ctx.lineTo(-w, y); ctx.moveTo(0, y + 30); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.restore();
    condText(ctx, 'GRAD', 720, 900, 110, { col: '#d23a2c', sx: 1.1, ls: 30 });
    condText(ctx, '∇ IS IN ITS GRAPH · ALL’S RIGHT WITH THE WORLD', 720, 970, 30, { col: '#d23a2c', sx: 0.9, ls: 2 });
  });
  note(B, '組織マーク (赤)', ACT.y + 2, { size: 22 });
} });

// ── C-059..C-070 : staff mugshots = optimizer portraits on the same quadratic ──
const hairSwept = (B, T, a) => { B.curve(T([[-240, -60], [-200, -300], [0, -360], [200, -330], [250, -120]]), { w: 3, a }); for (let i = 0; i < 6; i++) B.curve(T([[-180 + i * 70, -300], [-120 + i * 70, -200], [-60 + i * 60, -120]]), { w: 1.6, a: a * 0.6, passes: 1 }); };
const hairShort = (B, T, a) => { B.curve(T([[-250, 0], [-250, -250], [-100, -350], [100, -350], [250, -250], [250, 0]]), { w: 3.2, a }); for (let i = 0; i < 7; i++) B.stroke(T([[-200 + i * 66, -300], [-230 + i * 70, -110]]), { w: 2, a: a * 0.7, passes: 1 }); };
const hairLong = (B, T, a) => { B.curve(T([[-240, 20], [-260, -250], [0, -360], [260, -250], [240, 20]]), { w: 3, a }); B.curve(T([[-240, 0], [-290, 300], [-260, 520]]), { w: 3, a }); B.curve(T([[240, 0], [290, 300], [260, 520]]), { w: 3, a }); };
const hairBob = (B, T, a) => { B.curve(T([[-270, 180], [-280, -200], [0, -350], [280, -200], [270, 180]]), { w: 3.2, a }); B.stroke(T([[-240, -120], [-60, -210], [120, -150], [240, -120]]), { w: 2.4, a }); };
const hairTail = (B, T, a) => { hairShort(B, T, a); B.curve(T([[230, -80], [330, 60], [360, 260]]), { w: 3, a }); };
const glasses = (B, T, a) => { B.rect(...T([[-200, -20]])[0], 170 * 1.05, 90 * 1.05, { w: 3.4, a }); B.rect(...T([[30, -20]])[0], 170 * 1.05, 90 * 1.05, { w: 3.4, a }); };

flip('C-059', { build(B) { optPortrait(B, 'sgd', 'SGD', 'Robbins & Monro, 1951 — ノイズ入り', '#4b8f85', hairSwept, { suit: '#6a4a3a', dx: -170 }); note(B, '副司令 = SGD (最古参)', ACT.y + 2, { size: 22 }); } });
flip('C-060', { build(B) {
  B.done(); bg(B, '#cdbfd6', 0.5);
  // loss-landscape "map": contour lines of a sum of Gaussian wells (drawn like a survey map)
  const wells = [[420, 360, 180, -1], [980, 620, 240, -1.3], [700, 880, 150, -0.6], [1180, 220, 120, 0.7]];
  const f = (x, y) => wells.reduce((s, [cx, cy, r, h]) => s + h * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * r * r)), 0);
  for (let lev = -1.2; lev <= 0.6; lev += 0.15) {
    // marching squares (coarse) -> short segments
    const segs = [], st = 24;
    for (let y = 0; y < 1080; y += st) for (let x = 0; x < 1440; x += st) {
      const v = [f(x, y), f(x + st, y), f(x + st, y + st), f(x, y + st)].map((z) => z > lev);
      const e = [[x + st / 2, y], [x + st, y + st / 2], [x + st / 2, y + st], [x, y + st / 2]];
      const cut = []; for (let k = 0; k < 4; k++) if (v[k] !== v[(k + 1) % 4]) cut.push(e[k]);
      if (cut.length === 2) segs.push(cut);
    }
    B.custom((ctx) => { ctx.strokeStyle = COL.graph; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.6; ctx.beginPath(); for (const [a, b] of segs) { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.stroke(); }, { weight: 5 });
  }
  const it = B.text('loss landscape (Li+ 2018)', 70, 1040, { size: 30, col: COL.red, a: 0.9 }); it.fixed = true;
  note(B, '地図', ACT.y + 2, { size: 22 });
} });
flip('C-061', { build(B) { optPortrait(B, 'momentum', 'Momentum', 'Polyak, 1964 — μ = 0.8', '#3f78b8', (B2, T, a) => { hairShort(B2, T, a); glasses(B2, T, a); }, { suit: '#e7e2d6', dx: 230 }); note(B, 'オペレーター① = Momentum', ACT.y + 2, { size: 22 }); } });
flip('C-062', { build(B) { optPortrait(B, 'nesterov', 'Nesterov', 'Nesterov, 1983 — 先読み勾配', '#a38e86', hairLong, { suit: '#e7e2d6', dx: -150 }); note(B, 'オペレーター② = Nesterov', ACT.y + 2, { size: 22 }); } });
flip('C-063', { build(B) {
  optPortrait(B, 'adagrad', 'AdaGrad', 'Duchi+ 2011 — Σg² で割る', '#d8b8d8', hairBob, { suit: '#e7e2d6' });
  note(B, 'オペレーター③ = AdaGrad', ACT.y + 2, { size: 22 });
} });
flip('C-064', { build(B) {
  B.done(); bg(B, '#2b3f63', 0.6);
  // command bridge: the big screen shows the real grokking run (train vs val accuracy)
  B.marker([[180, 90], [1260, 90], [1260, 560], [180, 560]], '#101418', { a: 0.9, mode: 'solid' });
  B.rect(180, 90, 1080, 470, { w: 3, a: 0.9 });
  const g = window.D5.grok;
  const tr = plotPts(g.steps.map((s) => s + 50), g.train_acc, 230, 130, 980, 380, [50, 30050], [0, 1], true);
  const va = plotPts(g.steps.map((s) => s + 50), g.val_acc, 230, 130, 980, 380, [50, 30050], [0, 1], true);
  B.stroke(tr, { w: 3, col: '#f4a13a', a: 0.95, step: 3, over: 0, passes: 1 });
  B.stroke(va, { w: 3, col: '#7ed6a0', a: 0.95, step: 3, over: 0, passes: 1 });
  B.text('train', 260, 170, { size: 26, col: '#f4a13a', a: 0.95 }); B.text('val', 1120, 170, { size: 26, col: '#7ed6a0', a: 0.95 });
  // tiers of consoles
  for (let k = 0; k < 3; k++) { const y = 700 + k * 120, w = 1200 - k * 140; B.stroke([[720 - w / 2, y + 40], [720 - w / 2 + 60, y], [720 + w / 2 - 60, y], [720 + w / 2, y + 40]], { w: 2.6, a: 0.8, col: '#dfe6f2' }); }
  const it = B.text('grokking: (a+b) mod 97', 70, 1040, { size: 30, col: '#ffb3a8', a: 0.9 }); it.fixed = true;
  note(B, '発令所 全景。主モニタ', ACT.y + 2, { size: 22 });
} });
flip('C-065', { build(B) { optPortrait(B, 'gd', 'GD', 'Cauchy, 1847 — 全バッチ', '#e0a040', hairTail, { suit: '#5a6a8a', dx: -200 }); note(B, '加持 = 最急降下法', ACT.y + 2, { size: 22 }); } });
flip('C-066', { build(B) { optPortrait(B, 'adam', 'Adam', 'Kingma & Ba, 2015 — β = (0.9, 0.999)', '#3b7f7a', hairBob, { suit: '#f2f0ea', dx: 210 }); note(B, '技術部長 = Adam', ACT.y + 2, { size: 22 }); } });
flip('C-067', { build(B) {
  B.done(); bg(B, COL.mBlack, 0.95);
  const eyes = [[330, 300, 1], [720, 250, 0.9], [1110, 300, 1], [420, 640, 0.8], [1020, 640, 0.8], [720, 840, 0.9]];
  eyes.forEach(([x, y, s], i) => {
    B.stroke(catmull([[x - 150 * s, y], [x - 50 * s, y - 60 * s], [x + 60 * s, y - 60 * s], [x + 150 * s, y], [x + 50 * s, y + 50 * s], [x - 60 * s, y + 50 * s], [x - 150 * s, y]], 5), { w: 3, a: 0.9, col: '#e0402f' });
    B.circle(x, y - 4 * s, 28 * s, { w: 2.6, a: 0.9, col: '#e0402f' });
  });
  B.text('Reviewer 2', 560, 1040, { size: 40, col: '#e0402f', a: 0.9 });
  note(B, '赤い目のスケッチ (黒地)', ACT.y + 2, { size: 22 });
} });
flip('C-068', { build(B) {
  B.done(); bg(B, '#3a3f56', 0.7);
  B.marker(blob(720, 430, 290, 340, 6801, 0.1), COL.mBlack, { a: 0.95 });
  B.marker([[260, 1100], [380, 700], [1060, 700], [1180, 1100]], COL.mBlack, { a: 0.95 });
  for (const x of [600, 840]) B.marker([[x - 110, 400], [x + 110, 392], [x + 104, 470], [x - 104, 478]], '#f2572e', { a: 1, streak: 0 });
  B.marker(blob(720, 640, 280, 110, 6802, 0.2), '#f4f2ec', { a: 1, streak: 0 }); B.stroke(blob(720, 640, 280, 110, 6802, 0.2), { w: 3, a: 0.8 });
  const it = B.text('L(θ)', 1120, 240, { size: 80, col: COL.red, a: 0.9 }); it.fixed = true;
  note(B, '司令 = 損失関数', ACT.y + 2, { size: 22 });
} });
flip('C-069', { build(B) {
  B.done(); bg(B, COL.mBlack, 0.95);
  B.marker(blob(720, 480, 260, 320, 6901, 0.1), '#6b5a3a', { a: 0.9 });
  B.marker([[440, 400], [1000, 400], [980, 470], [460, 470]], COL.mRed, { a: 0.95, streak: 0 });
  B.paste((ctx) => condText(ctx, 'SOTA', 720, 462, 64, { col: '#ffd9c8', sx: 1.2, ls: 20 }));
  B.marker([[300, 1100], [420, 780], [1020, 780], [1140, 1100]], '#4a4030', { a: 0.9 });
  B.stroke(blob(720, 480, 260, 320, 6901, 0.1), { w: 2.6, a: 0.6, col: '#c9b48a' });
  note(B, 'バイザーの老人 = SOTA', ACT.y + 2, { size: 22 });
} });
flip('C-070', { build(B) {
  B.done(); bg(B, '#1c1b1f', 0.9, { });
  B.paste((ctx) => {
    ctx.save(); ctx.translate(720, 540); ctx.rotate(-0.01); ctx.translate(-720, -540);
    ctx.fillStyle = 'rgba(40,30,20,0.3)'; ctx.fillRect(248, 58, 960, 980);
    ctx.fillStyle = '#fbfaf5'; ctx.fillRect(240, 50, 960, 980);
    ctx.strokeStyle = '#141215'; ctx.lineWidth = 5; ctx.strokeRect(270, 80, 900, 920);
    ctx.lineWidth = 3; ctx.strokeRect(590, 130, 260, 120);
    credit(ctx, [{ s: '極秘', x: 720, y: 222, size: 92, align: 'center', strip: false },
      { s: '次単語補完計画', x: 720, y: 470, size: 150, align: 'center', sx: 0.84 },
      { s: '第17次中間報告', x: 720, y: 640, size: 100, align: 'center', sx: 0.86 },
      { s: '事前学習委員会', x: 720, y: 760, size: 44, align: 'center', role: true },
      { s: '閲覧後焼却のこと', x: 720, y: 950, size: 34, align: 'center', role: true }], { strip: false });
    ctx.restore();
  });
  const lm = B.math('lm', 720, 875, 52, { col: INK, align: 'center', hand: false, jit: 0 }); lm.layer = 'paste';
  note(B, '極秘書類 (写植)', ACT.y + 2, { size: 22 });
  rnote(B, '人類補完 → 次単語補完', ACT.y + 40, { size: 22, col: COL.red });
} });

// ── C-071..C-077 : units 00 and 02, their cards ─────────────────────────────
function faceSketch(B, cx, cy, s, o = {}) {        // loose front-face sketch (line only)
  const T = (pts) => pts.map(([x, y]) => [cx + x * s, cy + y * s]);
  const c = { w: o.w ?? 2.4, a: o.a ?? 0.85, col: o.col, passes: 1 };
  B.curve(T([[-150, -40], [-158, 80], [-120, 200], [-50, 258], [0, 268], [50, 258], [120, 200], [158, 80], [150, -40]]), c);
  B.curve(T([[-195, 20], [-190, -150], [-90, -262], [60, -270], [180, -170], [198, 20]]), c);
  const fr = []; for (let i = 0; i <= 10; i++) fr.push([-185 + i * 37, i % 2 ? 40 + (i % 3) * 12 : -60]);
  B.stroke(T(fr), c);
  for (const sx of [-1, 1]) {
    B.curve(T([[sx * 115, 70], [sx * 75, 48], [sx * 30, 62]]), { ...c, w: c.w * 1.3 });
    B.curve(T([[sx * 112, 76], [sx * 70, 96], [sx * 34, 78]]), c);
    B.circle(...T([[sx * 70, 74]])[0], 18 * s, { ...c, w: c.w * 0.9 });
    B.stroke(T([[sx * 120, 20], [sx * 40, 16]]), c);
    B.curve(T([[sx * 158, 40], [sx * 185, 70], [sx * 165, 130], [sx * 150, 120]]), c);
  }
  B.stroke(T([[4, 110], [12, 150], [0, 156]]), c);
  B.stroke(T([[-30, 205], [30, 203]]), c);
  B.stroke(T([[-70, 245], [-80, 340]]), c); B.stroke(T([[70, 245], [80, 340]]), c);
}
flip('C-071', { build(B) {
  B.done(); bg(B, '#2e6f8e', 0.75);
  B.marker([[-20, 700], [1460, 240], [1460, 420], [-20, 900]], '#bfe6f6', { a: 0.8, mode: 'accent', streak: 0.3 });
  faceSketch(B, 720, 470, 1.55, { col: '#10324a', w: 2.6, a: 0.9 });
  note(B, '青い光の中の顔 (線画調)', ACT.y + 2, { size: 22 });
} });
flip('C-072', { build(B) {
  B.done(); bg(B, '#f1eee8', 0.3);
  // a red transparent ID card -> a "model card" (Mitchell et al., 2019): what the model is, what it was evaluated on
  const C = xf([[-460, -300], [460, -300], [460, 300], [-460, 300]], [Math.cos(-0.12), Math.sin(-0.12), -Math.sin(-0.12), Math.cos(-0.12), 720, 540]);
  B.marker(C, COL.mRed, { a: 0.75, mode: 'accent', streak: 0.5 }); B.poly(C, { w: 3.2, a: 0.9 });
  const g = [520, 590];
  for (let k = 0; k < 12; k++) { const a0 = k / 12 * Math.PI * 2; B.line(g[0] + Math.cos(a0) * 120, g[1] + Math.sin(a0) * 120, g[0] + Math.cos(a0) * 160, g[1] + Math.sin(a0) * 160, { w: 5, a: 0.85, col: '#5a0f0c', passes: 1 }); }
  B.circle(g[0], g[1], 124, { w: 3, a: 0.85, col: '#5a0f0c' }); B.circle(g[0], g[1], 44, { w: 3, a: 0.85, col: '#5a0f0c' });
  for (const [x0, y0, x1, y1] of [[-120, 540, 320, 480], [1120, 600, 1560, 540]]) B.line(x0, y0, x1, y1, { w: 6, a: 0.7, col: '#8a86a0' });
  B.paste((ctx) => {
    ctx.save(); ctx.translate(720, 540); ctx.rotate(-0.12);
    condText(ctx, 'MODEL CARD', 40, -170, 84, { col: '#fff1ea', align: 'left', sx: 0.9 });
    condText(ctx, 'SAMPLE', -400, 250, 44, { col: '#fff1ea', align: 'left' });
    ctx.fillStyle = '#fff1ea'; ctx.globalAlpha = 0.9;
    ctx.font = `700 30px ${FONT.cond}`;
    ['intended use', 'eval data', 'metrics', 'caveats'].forEach((t, i) => ctx.fillText(t, 60, -90 + i * 52));
    ctx.restore();
  });
  const it = B.text('(Mitchell et al., 2019)', 70, 1040, { size: 30, col: COL.red, a: 0.9 }); it.fixed = true;
  note(B, '赤い IDカード', ACT.y + 2, { size: 22 });
  rnote(B, '= モデルカード', ACT.y + 40, { size: 22, col: COL.red });
} });
flip('C-073', { build(B) {
  B.done(); bg(B, '#caa088', 0.55);
  // the commander's white gloves over his face, very close (the loss hides its intent)
  B.hatch([[0, 620], [1440, 560], [1440, 1080], [0, 1080]], 0.7, 8, { w: 2, a: 0.6 });
  B.stroke(catmull([[380, 900], [560, 960], [760, 970], [980, 930]], 5), { w: 5, a: 0.9 });
  const glove = [[-40, 200], [300, 80], [640, 40], [980, 60], [1300, 140], [1480, 260], [1480, 560], [1180, 600], [900, 560], [620, 620], [300, 640], [-40, 600]];
  whiteOut(B, glove); B.poly(glove, { w: 3.4, a: 0.9 });
  for (let k = 0; k < 5; k++) B.curve([[180 + k * 250, 110 - (k % 2) * 30], [230 + k * 250, 330], [210 + k * 245, 600]], { w: 2.4, a: 0.8 });
  for (let k = 0; k < 9; k++) B.stroke([[200 + k * 130, 380 + (k % 3) * 30], [240 + k * 130, 400 + (k % 3) * 30]], { w: 2, a: 0.6, passes: 1 });
  B.hatch([[900, 560], [1480, 560], [1480, 600], [1180, 600]], 0.9, 7, { w: 1.6, a: 0.6 });
  B.marker([[560, 520], [760, 500], [720, 560], [600, 570]], '#e0552e', { a: 0.85, mode: 'accent' });
  note(B, '手袋のアップ (司令)', ACT.y + 2, { size: 22 });
} });
function unit00Head(B, cx, cy, s, o = {}) {
  const T = (pts) => pts.map(([x, y]) => [cx + x * s, cy + y * s]);
  const helm = T([[-300, -200], [-330, 150], [-240, 420], [0, 480], [240, 420], [330, 150], [300, -200], [0, -300]]);
  B.marker(helm, '#4f6fb8', { a: 0.75 }); B.poly(helm, { w: 3, a: 0.9 });
  B.marker(ellipsePts(cx, cy - 20 * s, 150 * s, 150 * s, 0, 7, 0, 40), '#f4f2ec', { a: 1, streak: 0 });
  B.circle(cx, cy - 20 * s, 150 * s, { w: 3.2, a: 0.9 });
  // single eye = a 5x5 conv kernel
  const k = 38 * s;
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) B.rect(cx - 2.5 * k + i * k, cy - 20 * s - 2.5 * k + j * k, k, k, { w: 1.4, a: 0.6, passes: 1, weight: 2 });
  B.marker(ellipsePts(cx, cy - 20 * s, 42 * s, 42 * s, 0, 7, 0, 20), o.eye || GRN, { a: 0.9, streak: 0 });
  B.marker(T([[-120, 330], [120, 330], [80, 470], [-80, 470]]), '#f0d24a', { a: 0.8 });
}
flip('C-074', { pcam(lt) { const s = 1.0 + 0.1 * lt; return [s, 0, 0, s, 720 * (1 - s), 480 * (1 - s)]; }, build(B) { B.done(); bg(B, '#6f9ccc', 0.5); unit00Head(B, 720, 560, 1.45, { eye: COL.mRed }); note(B, '零号機 頭部 (単眼)', ACT.y + 2, { size: 22 }); rnote(B, '単眼 = 5×5 畳み込み核', ACT.y + 40, { size: 20, col: COL.red }); } });
flip('C-075', { build(B) {
  B.done();
  pasteCard(B, cardTxt([{ s: 'PROTOTYPE', x: 720, y: 330, size: 150, sans: true, sx: 1.0 }, { s: 'EVAL-00', x: 720, y: 850, size: 450, sx: 0.78 }]));
  note(B, 'テロップ', ACT.y + 2, { size: 22 });
} });
flip('C-076', { build(B) {
  B.done(); bg(B, '#2f4f78', 0.6);
  const P = mechaParts({ arms: 0.3 });
  const T = (pts) => pts.map(([x, y]) => [720 + x * 2.2, -120 + y * 2.2]);
  for (const sh of [P.torso, P.pylL, P.pylR, P.head, P.armL.upper, P.armR.upper, P.neck]) { B.marker(T(sh), COL.mRed, { a: 0.8 }); B.poly(T(sh), { w: 3, a: 0.9 }); }
  for (let i = 0; i < 4; i++) B.marker(T([[-36 + i * 20, 104], [-24 + i * 20, 100], [-22 + i * 20, 112], [-34 + i * 20, 114]]), '#bff28a', { a: 1, streak: 0 });
  B.marker([[200, 900], [1300, 700], [1320, 760], [220, 960]], '#8a8f98', { a: 0.85 }); B.poly([[200, 900], [1300, 700], [1320, 760], [220, 960]], { w: 2.6, a: 0.9 });
  B.marker(T([[-90, 300], [90, 300], [60, 420], [-60, 420]]), ORNG, { a: 0.85 });
  const it = B.text('4 眼 = 4 heads', 1080, 1040, { size: 32, col: '#ffd0c4', a: 0.9 }); it.fixed = true;
  note(B, '弐号機 (赤)。武器を構える', ACT.y + 2, { size: 22 });
} });
flip('C-077', { build(B) {
  B.done();
  pasteCard(B, cardTxt([{ s: 'PRODUCTION', x: 720, y: 230, size: 140, sans: true }, { s: 'MODEL', x: 720, y: 380, size: 140, sans: true }, { s: 'EVAL-02', x: 720, y: 880, size: 450, sx: 0.78 }]));
  note(B, 'テロップ', ACT.y + 2, { size: 22 });
} });

// ── C-078..C-082 : the children = held-out digits (sklearn digits, logistic regression, real p̂) ──
flip('C-078', { build(B) { digitPortrait(B, 0, '#8e9fcf', { name: 'First Child' }); note(B, 'チルドレン = テスト画像', ACT.y + 2, { size: 22 }); } });
flip('C-079', { build(B) {
  digitPortrait(B, 1, COL.mRed, { name: 'Second Child', dx: 160 });
  note(B, '(表情 4 枚)', ACT.y + 2, { size: 22 });
} });
flip('C-080', { build(B) { digitPortrait(B, 2, ORNG, { name: 'Classmate 1', dx: -80 }); const it = B.text('?!', 1200, 300, { size: 90, col: COL.red, a: 0.9 }); it.fixed = true; note(B, '自信なさげ (0.752)', ACT.y + 2, { size: 22 }); } });
flip('C-081', { build(B) { digitPortrait(B, 3, '#d8a36a', { name: 'Classmate 2', dx: 200 }); note(B, '同級生②', ACT.y + 2, { size: 22 }); } });
flip('C-082', { build(B) { digitPortrait(B, 4, COL.mPink, { name: 'Classmate 3', dx: 110 }); note(B, '同級生③', ACT.y + 2, { size: 22 }); } });

// ── C-083..C-096 : explosions, the commander young, Second Impact ───────────
flip('C-083', { build(B) {
  B.done(); bg(B, '#f2c2cf', 0.45);
  explosion(B, 720, 540, 380, 8301, COL.mPink);
  speed(B, 0.3, 12, 8302, { a: 0.3 });
  B.math('inf', 90, 1030, 46, { col: COL.red });
  note(B, '爆発 (ピンク)', ACT.y + 2, { size: 22 });
} });
flip('C-084', { build(B) {
  B.done(); bg(B, '#f0e2c0', 0.45);
  explosion(B, 1080, 520, 300, 8401, COL.mYellow);
  mecha(B, 520, 180, 0.8, { sil: true, silCol: '#3a2a4a' });
  racks(B, 1000, 8402, { h: 260 });
  note(B, '街で爆発。ユニット', ACT.y + 2, { size: 22 });
} });
flip('C-085', {
  fx(lt, fx) { fx.flash = lt < 0.06 ? 0.9 : lt > 0.4 && lt < 0.47 ? 0.3 : 0; fx.flashCol = '#fff6d8'; },
  build(B) {
    B.done(); bg(B, COL.mYellow, 0.75);
    explosion(B, 720, 560, 520, 8501, ORNG, { a: 0.75, mode: 'wash' });
    mecha(B, 720, 150, 0.85, { sil: true, silCol: '#4a2a5a', silA: 0.8 });
    B.paste((ctx, p, lt) => {    // the cross-shaped flash (light)
      const u = E.outCubic(clamp(lt / 0.45)), cx = 720, cy = 470;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 700 * u + 200);
      g.addColorStop(0, 'rgba(255,250,220,0.9)'); g.addColorStop(0.4, 'rgba(255,220,120,0.35)'); g.addColorStop(1, 'rgba(255,160,40,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1440, 1080);
      const hw = 26 + 40 * u, L2 = 400 + 700 * u;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const lg = ctx.createLinearGradient(cx - dx * L2, cy - dy * L2, cx + dx * L2, cy + dy * L2);
        lg.addColorStop(0, 'rgba(255,240,180,0)'); lg.addColorStop(0.5, 'rgba(255,252,235,0.95)'); lg.addColorStop(1, 'rgba(255,240,180,0)');
        ctx.fillStyle = lg;
        if (dx) ctx.fillRect(cx - L2, cy - hw * 0.6, L2 * 2, hw * 1.2); else ctx.fillRect(cx - hw, cy - L2, hw * 2, L2 * 2);
      }
      ctx.restore();
    });
    const n0 = B.items.length;
    B.text('十字の爆発 (透過光)', 70, 1040, { size: 32, col: COL.red, a: 0.9 }); fixLast(B, n0);
    note(B, '十字型の爆発 → ホワイトアウト', ACT.y + 2, { size: 22 });
  },
});
flip('C-086', { build(B) {
  B.done(); bg(B, '#2a2036', 0.9);
  B.group({ alpha: (lt) => (lt >= 1 / 30 ? 1 : 0) });
  bg(B, '#e9e2b0', 0.8);
  B.circle(720, 540, 240, { w: 3, a: 0.9 }); B.circle(720, 540, 120, { w: 3, a: 0.9 });
  B.marker(ellipsePts(720, 540, 80, 200, 0, 7, 0, 30), COL.mBlack, { a: 0.9 });
  B.ungroup();
  note(B, '暗 → 黄色い目 (1コマずつ)', ACT.y + 2, { size: 22 });
} });
flip('C-087', { build(B) {
  B.done(); bg(B, '#f6e6c8', 0.45);
  bust(B, 720, 470, 1.05, { hair: hairShort, suit: '#2a2a30' });
  for (const x of [610, 830]) { B.marker([[x - 100, 380], [x + 100, 372], [x + 94, 450], [x - 94, 458]], '#e0402f', { a: 0.9, streak: 0 }); B.rect(x - 100, 376, 200, 78, { w: 3, a: 0.9 }); }
  B.hatch([[520, 620], [920, 620], [860, 760], [720, 800], [580, 760]], 0.4, 7, { w: 2.2, a: 0.8 });
  B.text('L(θ₀) = ' + window.D5.grok.table[0][1].toFixed(3), 90, 980, { size: 54, a: 0.92 });
  B.text('≈ ln 97 = ' + Math.log(97).toFixed(3) + '  ✓', 92, 1040, { size: 32, col: COL.red, a: 0.9 });
  note(B, '若い司令 = 初期化直後の損失', ACT.y + 2, { size: 22 });
  rnote(B, '一様予測なら ln(クラス数)', ACT.y + 40, { size: 20, col: COL.red });
} });
flip('C-088', { build(B) {
  B.done();
  // the pencil sketch of the child with a bag (the reference itself is a sketch) = the student model
  figureStand(B, 760, 260, 0.9, { a: 0.8, w: 2.2 });
  B.curve([[700, 330], [690, 360], [720, 372], [760, 352]], { w: 2, a: 0.7 });
  B.rect(420, 700, 220, 240, { w: 2.4, a: 0.8 });
  B.curve([[450, 700], [520, 620], [610, 700]], { w: 2.4, a: 0.8 });
  B.hatch([[420, 700], [640, 700], [640, 940], [420, 940]], 0.9, 12, { w: 1.4, a: 0.45 });
  B.stroke([[780, 320], [800, 340]], { w: 1.6, a: 0.7, col: COL.blue }); B.stroke([[790, 350], [796, 380]], { w: 1.6, a: 0.7, col: COL.blue });
  B.text('student', 90, 1030, { size: 40, a: 0.85 });
  const it = B.text('(Hinton et al., 2015 — 蒸留)', 290, 1030, { size: 26, col: COL.red, a: 0.85 }); it.fixed = true;
  note(B, '泣く子供 (鉛筆ラフのまま)', ACT.y + 2, { size: 22 });
} });
flip('C-089', { build(B) {
  B.done(); bg(B, COL.mBlueDeep, 0.8);
  // a figure lying on its side, head at left (orange pencil on deep blue), knees drawn up
  const P = catmull([[150, 600], [170, 520], [250, 470], [330, 500], [420, 470], [620, 440], [820, 450], [960, 420], [1100, 380], [1230, 400], [1300, 470], [1260, 540], [1120, 560], [1020, 600], [1180, 640], [1320, 660], [1340, 720], [1180, 740], [900, 700], [700, 690], [480, 700], [330, 690], [200, 670], [150, 600]], 4);
  B.marker(P, ORNG, { a: 0.85, mode: 'wash' }); B.stroke(P, { w: 3, a: 0.9 });
  B.marker(blob(220, 560, 110, 100, 8901, 0.25), COL.mRed, { a: 0.85 });
  B.stroke([[420, 480], [470, 560], [520, 690]], { w: 2, a: 0.7 }); B.stroke([[700, 450], [720, 560], [700, 690]], { w: 1.8, a: 0.6 });
  B.curve([[820, 452], [860, 540], [1000, 600]], { w: 2, a: 0.7 });
  B.hatch([[420, 600], [1000, 610], [1180, 700], [700, 690], [420, 700]], 0.9, 10, { w: 1.4, a: 0.5 });
  note(B, '横たわる巨人 (橙 / 青)', ACT.y + 2, { size: 22 });
} });
flip('C-090', { build(B) {
  B.done(); bg(B, COL.mRed, 0.8);
  B.marker([[520, -20], [920, -20], [860, 1100], [580, 1100]], COL.mBlack, { a: 0.95 });
  B.stroke([[640, -20], [720, 380]], { w: 2, a: 0.8, col: '#ddd' }); B.stroke([[800, -20], [720, 380]], { w: 2, a: 0.8, col: '#ddd' });
  const cr = [[700, 400], [740, 400], [740, 460], [800, 460], [800, 500], [740, 500], [740, 600], [700, 600], [700, 500], [640, 500], [640, 460], [700, 460]];
  whiteOut(B, cr); B.poly(cr, { w: 2.4, a: 0.8 });
  note(B, '十字のペンダント', ACT.y + 2, { size: 22 });
} });
flip('C-091', { build(B) {
  B.done();
  pasteCard(B, cardTxt([{ s: 'SECOND', x: 720, y: 440, size: 350, sx: 0.84, col: '#e02a22' }, { s: 'IMPACT', x: 720, y: 900, size: 350, sx: 0.84, col: '#e02a22' }]));
  note(B, 'テロップ (赤)', ACT.y + 2, { size: 22 });
  rnote(B, 'セカンドインパクト = 2012', ACT.y + 40, { size: 22, col: COL.red });
} });
flip('C-092', {
  pcam(lt) { const s = 1.0 + 0.08 * lt; return [s, 0, 0, s, 720 * (1 - s), 420 * (1 - s)]; },
  build(B) {
    B.done(); bg(B, '#1e1e2e', 0.95);
    const G = catmull([[120, 1100], [170, 860], [230, 700], [300, 560], [420, 470], [500, 330], [560, 200], [640, 150], [720, 170], [770, 250], [790, 360], [900, 400], [1060, 430], [1190, 520], [1260, 700], [1300, 900], [1340, 1100], [1180, 1100], [1150, 900], [1090, 760], [1020, 800], [960, 1100], [800, 1100], [760, 880], [640, 860], [560, 1100], [400, 1100], [380, 900], [320, 820], [280, 1100]], 4);
    B.paste((ctx) => {
      ctx.save();
      ctx.fillStyle = 'rgba(255,230,245,0.35)'; ctx.beginPath(); G.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.lineWidth = 60; ctx.strokeStyle = 'rgba(255,220,240,0.18)'; ctx.stroke();
      ctx.fillStyle = '#fff4fb'; ctx.fill();
      ctx.fillStyle = '#1e1e2e';
      for (const [x, y, r] of [[560, 640, 60], [900, 700, 80], [760, 480, 22], [640, 360, 18]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.3, 0.3, 0, 7); ctx.fill(); }
      ctx.restore();
    });
    const it = B.text('光の巨人 (透過光)', 70, 1040, { size: 32, col: '#ffc9dc', a: 0.9 }); it.fixed = true;
    note(B, '白い巨人のシルエット', ACT.y + 2, { size: 22 });
  },
});
flip('C-093', { build(B) {
  B.done(); bg(B, '#3b3570', 0.85);
  // "satellite photo": the crater = ILSVRC top-5 error, 2010 -> 2012 (28.2 % -> 15.3 %)
  B.marker(ellipsePts(720, 700, 640, 260, 0, 7, -0.06, 60), COL.mRed, { a: 0.85 });
  B.marker(ellipsePts(760, 740, 380, 140, 0, 7, -0.06, 50), ORNG, { a: 0.9 });
  B.marker(ellipsePts(800, 770, 170, 60, 0, 7, -0.06, 40), '#fff2c0', { a: 1, streak: 0 });
  const rng = mulberry32(9301);
  for (let i = 0; i < 9; i++) { const x = 100 + rng() * 1240, y = 120 + rng() * 900; B.line(x - 14, y - 14, x + 14, y + 14, { w: 2, a: 0.8, col: '#f0a0a0', passes: 1 }); B.line(x + 14, y - 14, x - 14, y + 14, { w: 2, a: 0.8, col: '#f0a0a0', passes: 1 }); }
  B.paste((ctx) => {
    ctx.save(); ctx.fillStyle = '#ff5a4a'; ctx.font = `700 34px ${FONT.cond}`; ctx.fillText('SATELLITE PHOTO', 60, 80);
    ctx.font = `700 64px ${FONT.cond}`; ctx.fillText('A.D. 2012', 60, 150);
    ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = 3; ctx.strokeRect(1090, 950, 300, 70);
    ctx.font = `700 40px ${FONT.cond}`; ctx.fillText('EPOCH 90', 1110, 1000);
    ctx.font = `700 30px ${FONT.cond}`; ctx.fillText('ILSVRC top-5 err  28.2 → 15.3 %', 60, 1040);
    ctx.restore();
  });
  note(B, '衛星写真。赤いクレーター', ACT.y + 2, { size: 22 });
  rnote(B, 'A.D.2000 → A.D.2012 (AlexNet)', ACT.y + 40, { size: 20, col: COL.red });
} });
flip('C-094', { build(B) {
  B.done(); bg(B, '#1d3f6e', 0.85);
  B.marker(ellipsePts(720, 820, 700, 200, 0, 7, 0, 60), '#9fd0ee', { a: 0.8 });
  // seated figure, knees up
  const P = catmull([[860, 560], [900, 600], [930, 700], [1000, 780], [1010, 860], [940, 880], [860, 860], [800, 820], [790, 700], [800, 620], [860, 560]], 4);
  whiteOut(B, P); B.stroke(P, { w: 2.6, a: 0.85 });
  B.circle(850, 520, 44, { w: 2.6, a: 0.85 });
  B.circle(520, 800, 26, { w: 2.2, a: 0.9 }); whiteOut(B, ellipsePts(520, 800, 24, 24, 0, 7, 0, 16));
  note(B, '青い虚空に座る', ACT.y + 2, { size: 22 });
} });
flip('C-095', { build(B) {
  B.done(); bg(B, '#f2d4ec', 0.35);
  // loose pencil sketch of a boy's profile (the reference itself is a pencil sketch at this cut)
  const prof = [[980, 180], [900, 170], [760, 220], [700, 330], [690, 420], [650, 480], [690, 500], [680, 560], [700, 600], [690, 640], [740, 700], [820, 720]];
  for (let k = 0; k < 3; k++) B.curve(prof.map(([x, y]) => [x + k * 4, y + k * 3]), { w: 1.8 - k * 0.4, a: 0.8 - k * 0.2, passes: 1 });
  for (let i = 0; i < 12; i++) B.curve([[860 + i * 30, 150 + (i % 3) * 20], [900 + i * 32, 260], [880 + i * 30, 420 + (i % 4) * 30]], { w: 1.4, a: 0.55, passes: 1 });
  B.curve([[820, 720], [860, 860], [980, 1080]], { w: 2, a: 0.7 }); B.curve([[1120, 560], [1150, 800], [1260, 1080]], { w: 2, a: 0.7 });
  B.stroke([[760, 400], [800, 395]], { w: 2.2, a: 0.8 });
  B.hatch([[900, 800], [1100, 760], [1200, 1080], [940, 1080]], 0.7, 11, { w: 1.4, a: 0.5, col: '#7a3050' });
  note(B, '少年の横顔 (鉛筆ラフ)', ACT.y + 2, { size: 22 });
} });
flip('C-096', { build(B) {
  B.done(); bg(B, '#3a2a40', 0.8);
  const H = [[300, 200], [900, 160], [1200, 420], [1100, 800], [700, 980], [360, 820]];
  B.marker(H, '#8a6068', { a: 0.8 }); B.poly(H, { w: 3, a: 0.9 });
  B.marker(ellipsePts(760, 520, 60, 40, 0, 7, -0.2, 24), GRN, { a: 0.95, streak: 0 }); B.ellipse(760, 520, 62, 42, { w: 2.6, a: 0.9, rot: -0.2 });
  B.marker([[1100, 400], [1480, 300], [1480, 700], [1150, 760]], COL.mRed, { a: 0.8 });
  note(B, '頭部アップ 緑の目', ACT.y + 2, { size: 22 });
} });
flip('C-097', { build(B) {
  B.done();
  pasteCard(B, (ctx) => sansHeavy(ctx, 'ADAM', 720, 720, 470, { align: 'center', col: '#111', sx: 0.95 }), { bg: '#f8f7f2' });
  note(B, 'テロップ (白地に黒)', ACT.y + 2, { size: 22 });
  rnote(B, 'ADAM = オプティマイザ', ACT.y + 40, { size: 22, col: COL.red });
} });
flip('C-098', { build(B) {
  B.done(); bg(B, '#79b6d8', 0.5);
  speed(B, -0.25, 18, 9801, { col: '#ffffff', a: 0.6, w: 4 });
  const prof = catmull([[1480, 150], [1100, 130], [880, 250], [820, 400], [760, 470], [810, 500], [790, 580], [830, 640], [900, 700], [1000, 720], [1080, 900], [1100, 1100], [1480, 1100]], 4);
  B.marker(prof, '#f5dfc8', { a: 0.9, streak: 0 }); B.stroke(prof.slice(0, -1), { w: 3, a: 0.9 });
  B.marker(catmull([[1480, 120], [1060, 100], [860, 220], [900, 380], [1100, 300], [1300, 420], [1480, 520]], 4), '#f0d060', { a: 0.85 });
  // inset: Adam's bias-correction factor 1/(1-β₁ᵗ), t = 1..40 (computed)
  const C = window.D5.adamCorr;
  axes2(B, 120, 520, 440, 300, { xl: 't', yt: [[0.9, '10'], [0.09, '1']], xt: [[0, '1'], [1, '40']], w: 1.8 });
  B.stroke(plotPts(C.t, C.c1, 120, 520, 440, 300, [1, 40], [0, 11]), { w: 3.2, col: COL.red, a: 0.92, over: 0, step: 3 });
  B.math('corr', 330, 640, 40, { col: COL.red });
  note(B, '横顔 (技術部長)', ACT.y + 2, { size: 22 });
} });
flip('C-099', { build(B) {
  B.done(); B.marker(FULL, '#0e1a12', { a: 0.97, mode: 'solid' });
  const T2 = window.D5.grok.table;
  B.paste((ctx) => {
    ctx.save(); ctx.fillStyle = '#7dff6a'; ctx.font = `400 24px "JetBrains Mono", monospace`;
    ctx.strokeStyle = 'rgba(125,255,106,0.5)'; ctx.lineWidth = 2;
    for (let c = 0; c < 3; c++) {
      const x0 = 60 + c * 460;
      ctx.strokeRect(x0 - 10, 70, 440, 940);
      ctx.fillText('STEP   TRAIN  VAL', x0, 110);
      for (let r = 0; r < 11; r++) {
        const row = T2[c * 11 + r];
        if (!row) continue;
        ctx.fillText(String(row[0]).padStart(5, ' ') + '  ' + row[3].toFixed(3) + '  ' + row[4].toFixed(3), x0, 170 + r * 76);
        ctx.fillRect(x0, 184 + r * 76, 400 * row[4], 10);
      }
    }
    ctx.restore();
  });
  note(B, '緑のデータ画面', ACT.y + 2, { size: 22 });
  rnote(B, 'grokking 実測 (acc)', ACT.y + 40, { size: 22, col: COL.red });
} });
flip('C-100', { build(B) {
  B.done(); bg(B, '#a7a0c8', 0.5);
  // operations director = the LR schedule; she "turns" = warmup then decay, drawn on during the cut
  B.marker([[180, 1100], [300, 760], [600, 700], [900, 700], [1200, 780], [1300, 1100]], COL.mRed, { a: 0.8 });
  B.poly([[180, 1100], [300, 760], [600, 700], [900, 700], [1200, 780], [1300, 1100]], { w: 3, a: 0.9 });
  B.marker(catmull([[520, 700], [460, 400], [560, 180], [760, 140], [940, 220], [1000, 420], [940, 700]], 4), '#4a3a70', { a: 0.85 });
  const lr = window.D5.lr;
  B.at(0.0, 0.62);
  B.stroke(plotPts(lr.s, lr.lr, 140, 180, 1160, 420, [0, 100000], [0, lr.peak * 1.1]), { w: 6, col: '#fff3e8', a: 0.95, step: 3, over: 0, passes: 1 });
  B.done();
  B.text('η(s): warmup 4000 → s^−½', 90, 1040, { size: 32, col: '#fff3e8', a: 0.9 });
  note(B, '作戦部長 振り向き', ACT.y + 2, { size: 22 });
  rnote(B, '= 学習率スケジュール', ACT.y + 40, { size: 22, col: COL.red });
} });
flip('C-101', { build(B) {
  B.done(); bg(B, '#e7c9b0', 0.3);
  // three loose pencil heads (the reference cut is a pencil sketch of three girls) = Q, K, V
  [[380, 520, 'Q'], [720, 460, 'K'], [1060, 540, 'V']].forEach(([x, y, lab], i) => {
    for (let k = 0; k < 2; k++) B.ellipse(x + k * 5, y + k * 3, 150, 180, { w: 1.8 - k * 0.5, a: 0.7 - k * 0.2, passes: 1, rot: (i - 1) * 0.1 });
    for (let j = 0; j < 7; j++) B.curve([[x - 150 + j * 45, y - 160], [x - 170 + j * 50, y - 20], [x - 160 + j * 48, y + 150]], { w: 1.3, a: 0.45, passes: 1 });
    B.curve([[x - 220, 1080], [x - 180, y + 260], [x, y + 230], [x + 180, y + 260], [x + 220, 1080]], { w: 1.8, a: 0.6, passes: 1 });
    B.text(lab, x - 20, y + 30, { size: 90, col: '#9a4a3a', a: 0.7 });
  });
  note(B, '3人のラフ (鉛筆)', ACT.y + 2, { size: 22 });
} });

// ── C-102 : 監督 card (82.63), green slash wipe at 83.6 ─────────────────────
flip('C-102', {
  build(B) {
    B.done();
    pasteCard(B, (ctx) => {
      credit(ctx, [{ s: '監督', x: 130, y: 210, size: 130, vert: true, sx: 0.9, role: true, lh: 1.0 }], { col: '#f8f5ec' });
      credit(ctx, [{ s: '逆伝播', x: 270, y: 590, size: 400, sx: 0.86 }, { s: '法', x: 1000, y: 1010, size: 400, sx: 0.86 }], { col: '#f8f5ec' });
    }, { tape: true });
    // green slash wipe (marker, fast) — 83.6 = lt 0.97
    B.at(0.93, 0.1);
    B.marker([[-40, 560], [1480, 380], [1480, 470], [-40, 640]], GRN, { a: 0.95, streak: 0.4, mode: 'solid', layer: 'paste' });
    B.done();
    note(B, '監督クレジット (黒)', ACT.y + 2, { size: 22 });
    note(B, '83+14 緑のスラッシュ', ACT.y + 32, { size: 22, col: COL.red });
    rnote(B, '逆伝播法 (Rumelhart+ 1986)', ACT.y + 90, { size: 21 });
  },
});
