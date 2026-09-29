// ─────────────────────────────────────────────────────────────────────────────
//  p1_tv1995 · shots 15–25 (50.8 – 66.8 s): the build. Checkpoint cartridge,
//  armour stencil, training-time display, grid, TYPE-01 in its chassis, A10,
//  the commander ∇, sixteen heads as wings.
// ─────────────────────────────────────────────────────────────────────────────
(() => {
  const LAYER = mkCanvas(W, H), LG = LAYER.getContext('2d');
  const clearL = () => { LG.setTransform(1, 0, 0, 1, 0, 0); LG.clearRect(0, 0, W, H); };

  // ── 50.8–51.4 · the checkpoint cartridge (entry plug) slides into the card ──
  SHOT(50.8, 51.4, 'cartridge', (ctx, t, fx, T) => {
    fill(ctx, '#0c0e0c');
    const k = seg(T, 50.8, 51.4);
    // green chassis plates + a purple rail
    fillPts(ctx, [[0, 300], [520, 120], [760, 1080], [0, 1080]], '#5d7a55'); fillPts(ctx, [[0, 300], [520, 120], [540, 190], [0, 380]], '#86a47a');
    fillPts(ctx, [[900, 0], [1440, 0], [1440, 1080], [1180, 1080]], '#3f5a3c'); fillPts(ctx, [[900, 0], [990, 0], [1260, 1080], [1180, 1080]], '#6f8f66');
    fillPts(ctx, [[260, 0], [330, 0], [120, 620], [60, 600]], '#7b4fb8'); fillPts(ctx, [[300, 0], [330, 0], [120, 620], [100, 612]], '#4a2d7c');
    // red & black power cables coiling in from the top right
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const cable = (pts, col, w) => { ctx.strokeStyle = '#120808'; ctx.lineWidth = w + 10; smoothPath(ctx, pts, false); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = w; smoothPath(ctx, pts, false); ctx.stroke(); };
    cable([[1500, 120], [1180, 180], [1000, 330], [1120, 470], [1300, 420], [1250, 260], [1040, 240]], '#e8201a', 34);
    cable([[1500, 260], [1200, 360], [980, 560], [880, 440]], '#d81810', 26);
    cable([[1500, 40], [1150, 60], [860, 140], [700, 90]], '#1d1d22', 30);
    // the cartridge: a white capsule with a black band and its label
    ctx.save(); ctx.translate(560 + k * 60, 700 + k * 40); ctx.rotate(-0.62);
    rrect(ctx, -420, -170, 840, 340, 170); ctx.fillStyle = '#f4f4f6'; ctx.fill();
    ctx.save(); rrect(ctx, -420, -170, 840, 340, 170); ctx.clip();
    ctx.fillStyle = '#b9bccb'; ctx.fillRect(-440, 60, 900, 140);
    ctx.fillStyle = '#1c1c22'; ctx.fillRect(40, -200, 90, 400); ctx.fillStyle = '#e8201a'; ctx.fillRect(150, -200, 22, 400);
    ctx.restore();
    rrect(ctx, -420, -170, 840, 340, 170); ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 7; ctx.stroke();
    grot(ctx, 'CKPT', -250, 12, 72, { color: '#2a2c38', sx: 0.9 });
    grot(ctx, 'model.pt · 65M', -250, 64, 34, { color: '#555a6e', family: COND });
    ctx.restore();
  });

  // ── 51.4–51.8 · white armour stencil ─────────────────────────────────────
  function stencil(ctx, str, x, y, size, sx, col) {
    ctx.save(); ctx.font = `700 ${size}px ${COND}`; ctx.textAlign = 'center';
    ctx.translate(x, y); ctx.scale(sx, 1);
    ctx.fillStyle = col; ctx.fillText(str, 0, 0);
    // stencil bridges: thin plate-coloured cuts through every glyph
    const w = ctx.measureText(str).width; let xx = -w / 2;
    ctx.fillStyle = '#efe6ea';
    for (const ch of str) { const cw = ctx.measureText(ch).width; if (ch !== ' ') { ctx.fillRect(xx + cw * 0.48, -size * 0.8, size * 0.05, size * 0.85); } xx += cw; }
    ctx.restore();
  }
  function gradMark(ctx, x, y, s, col) {
    // the org's parody mark: a nabla with a half-ring (never the fig leaf)
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col; ctx.strokeStyle = col;
    ctx.beginPath(); ctx.moveTo(-60, -50); ctx.lineTo(60, -50); ctx.lineTo(0, 55); ctx.closePath(); ctx.lineWidth = 12; ctx.lineJoin = 'miter'; ctx.stroke();
    ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, 92, Math.PI * 0.8, Math.PI * 2.2); ctx.stroke();
    ctx.font = `700 34px ${ROMAN}`; ctx.textAlign = 'center'; ctx.fillText('GRAD', 0, 118);
    ctx.restore();
  }
  window.gradMark = gradMark;
  SHOT(51.4, 51.8, 'stencil', (ctx, t, fx, T) => {
    const k = seg(T, 51.4, 51.8);
    fill(ctx, '#e9dfe3');
    ctx.save(); ctx.translate(0, -k * 60);
    // curved plate edges, rivets
    ctx.fillStyle = '#d6c9cf'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(120, 500, 60, 1200); ctx.lineTo(0, 1200); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1440, 0); ctx.quadraticCurveTo(1320, 500, 1380, 1200); ctx.lineTo(1440, 1200); ctx.fill();
    ctx.strokeStyle = '#a8989f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(250, 250); ctx.quadraticCurveTo(720, 150, 1190, 250); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(190, 0); ctx.quadraticCurveTo(280, 600, 220, 1200); ctx.moveTo(1250, 0); ctx.quadraticCurveTo(1160, 600, 1220, 1200); ctx.stroke();
    for (const [x, y] of [[230, 420], [1210, 420], [240, 760], [1200, 760]]) { circle(ctx, x, y, 14, '#bfb1b8'); ringS(ctx, x, y, 14, '#8a7c83', 3); }
    gradMark(ctx, 720, 110, 0.72, '#c8201a');
    stencil(ctx, 'TRANSFORMER', 720, 470, 190, 0.66, '#5d5a60');
    stencil(ctx, '2017', 720, 700, 200, 0.8, '#58555b');
    stencil(ctx, '01', 720, 860, 120, 0.8, '#5d5a60');
    stencil(ctx, 'TEST TYPE', 720, 1060, 150, 0.72, '#5d5a60');
    ctx.restore();
    fx.soft = 1.6;
  });

  // ── 51.8–52.27 · training-time display (the 活動限界 timer) ───────────────
  SHOT(51.8, 52.267, 'timer', (ctx, t, fx, T) => {
    fill(ctx, '#050505');
    ctx.save();
    ctx.translate(90, 150); ctx.transform(1, -0.2, 0.08, 1, 0, 0);
    // frame bars: top green→yellow, left yellow→red
    const gt = ctx.createLinearGradient(0, 0, 1400, 0); gt.addColorStop(0, '#e8e030'); gt.addColorStop(1, '#3fd83a');
    fillPts(ctx, [[-120, -140], [1500, -140], [1500, -40], [40, -40]], gt);
    const gl = ctx.createLinearGradient(0, -100, 0, 900); gl.addColorStop(0, '#e8e030'); gl.addColorStop(0.5, '#ff8a1c'); gl.addColorStop(1, '#e8201a');
    fillPts(ctx, [[-120, -140], [40, -40], [40, 880], [-120, 900]], gl);
    // captions
    mincho(ctx, '学習終了まで', 70, 60, 34, { color: '#ff5a2a', sx: 0.9, embolden: 0 });
    grot(ctx, 'TRAINING TIME REMAINING:', 300, 50, 26, { color: '#ffd21a', family: COND });
    // digits: lamp test, then 12 h − 4 s (the base model trained for 12 hours)
    const test = T < 51.95;
    const el = Math.max(0, T - 51.95);
    const cs = test ? '88' : String(99 - Math.floor((el * 100) % 100)).padStart(2, '0');
    seg7Str(ctx, test ? '88:88:88' : '11:59:56', 60, 160, 228, '#ffd21a', '#2e2400', 0.1);
    seg7Str(ctx, cs, 1120, 330, 96, '#ffd21a', '#2e2400', 0.1);
    // right: system box + internal/external box with hazard stripes
    ctx.strokeStyle = '#e8201a'; ctx.lineWidth = 5; ctx.strokeRect(930, -20, 420, 120);
    mincho(ctx, '主計算供給システム', 1140, 50, 46, { align: 'center', color: '#ffd21a', sx: 0.72, family: '"Noto Sans CJK JP"', weight: 900, embolden: 0 });
    grot(ctx, 'MAIN COMPUTE SUPPLY SYSTEM · 8×P100', 1140, 88, 22, { align: 'center', color: '#ffd21a', family: COND });
    ctx.save(); ctx.beginPath(); ctx.rect(1030, 130, 360, 160); ctx.clip(); ctx.fillStyle = '#e8201a'; ctx.fillRect(1030, 130, 360, 160);
    ctx.fillStyle = '#111'; for (let i = -4; i < 12; i++) { ctx.beginPath(); ctx.moveTo(1030 + i * 50, 290); ctx.lineTo(1055 + i * 50, 290); ctx.lineTo(1135 + i * 50, 130); ctx.lineTo(1110 + i * 50, 130); ctx.fill(); }
    ctx.fillStyle = '#050505'; ctx.fillRect(1050, 146, 250, 128); ctx.restore();
    mincho(ctx, test ? '外部' : '内部', 1175, 236, 96, { align: 'center', color: '#ffd21a', sx: 0.9, family: '"Noto Sans CJK JP"', weight: 900, embolden: 0 });
    grot(ctx, test ? 'EXTERNAL' : 'INTERNAL', 1175, 270, 30, { align: 'center', color: '#ffd21a', family: COND });
    // mode buttons: training has just begun → WARMUP lit (4000 warm-up steps)
    ctx.strokeStyle = '#ffd21a'; ctx.lineWidth = 5; ctx.strokeRect(120, 560, 1060, 110);
    ['STOP', 'WARMUP', 'DECAY', 'DIVERGE'].forEach((b, i) => {
      const x = 145 + i * 255, lit = !test && b === 'WARMUP';
      ctx.fillStyle = lit ? '#e8201a' : '#5a0c08'; ctx.fillRect(x, 580, 230, 70);
      ctx.strokeStyle = '#ffd21a'; ctx.lineWidth = 3; ctx.strokeRect(x, 580, 230, 70);
      grot(ctx, b, x + 115, 628, 36, { align: 'center', color: lit ? '#fff4a0' : '#d8b020', family: COND });
    });
    ctx.restore();
  });

  // ── 52.27–52.4 · the retention clamp slams shut ───────────────────────────
  SHOT(52.267, 52.4, 'clamp', (ctx, t, fx, T) => {
    fill(ctx, '#d8d6e4');
    fillPts(ctx, [[0, 0], [700, 0], [300, 1080], [0, 1080]], '#aeb0c4');
    fillPts(ctx, [[1100, 0], [1440, 0], [1440, 460], [1260, 520]], '#e0306a');
    const k = seg(T, 52.267, 52.4);
    ctx.save(); ctx.translate(720 + k * 40, 540); ctx.rotate(-0.5);
    rrect(ctx, -700, -60, 1000, 120, 20); ctx.fillStyle = '#8c90a8'; ctx.fill(); ctx.strokeStyle = '#2a2c3a'; ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = '#5c6078'; ctx.fillRect(-700, 20, 1000, 40);
    circle(ctx, 240, 0, 70, '#c8cad8'); ringS(ctx, 240, 0, 70, '#2a2c3a', 6); circle(ctx, 240, 0, 24, '#2a2c3a');
    ctx.restore();
    // a blue actuator arm pressing down
    ctx.save(); ctx.translate(1000 - k * 60, 260 + k * 80); ctx.rotate(0.35);
    rrect(ctx, -140, -500, 280, 560, 60); ctx.fillStyle = '#2f5ee0'; ctx.fill(); ctx.strokeStyle = '#141c40'; ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = '#1d3a9c'; ctx.fillRect(40, -500, 100, 560);
    ctx.restore();
  });

  // ── 52.4–52.9 · neon grid (red, then green) ───────────────────────────────
  SHOT(52.4, 52.9, 'grid', (ctx, t, fx, T) => {
    fill(ctx, '#030303');
    const green = T >= 52.55;
    const col = green ? '#3cf59a' : '#ff2a14', col2 = green ? '#1a9c5a' : '#a01008';
    ctx.save(); ctx.translate(-80, 1080); ctx.transform(1, -0.42, 0.55, 0.62, 0, 0);
    const scroll = (T - 52.4) * 180;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 4; c++) {
      const x = c * 560 + (r % 2) * 90 - scroll, y = -r * 190;
      ctx.fillStyle = (r + c) % 3 === 0 ? col2 : col; ctx.fillRect(x, y - 120, 470, 120);
    }
    ctx.strokeStyle = '#ff8a1c'; ctx.lineWidth = 2;
    for (let r = 0; r < 12; r++) { ctx.beginPath(); ctx.moveTo(-200, -r * 190 + 30); ctx.lineTo(2600, -r * 190 + 30); ctx.stroke(); }
    ctx.restore();
    grot(ctx, 'L06', 1290, 330, 56, { color: '#ff8a1c', family: COND, style: 'italic' });
    grot(ctx, 'H08', 1150, 640, 40, { color: '#ff8a1c', family: COND });
    ctx.save(); ctx.translate(250, 700); ctx.rotate(1.1); grot(ctx, 'SOFTMAX LINE', 0, 0, 34, { color: '#ffb020', family: COND }); ctx.restore();
    ctx.save(); ctx.translate(330, 560); ctx.rotate(1.1 + Math.PI); grot(ctx, 'ATTENTION LINE', 0, 0, 30, { color: '#ffb020', family: COND }); ctx.restore();
  });

  // ── 52.9–54.6 · TYPE-01 in its chassis, low angle, orange; OP-animation credit ─
  SHOT(52.9, 54.6, 'chassis', (ctx, t, fx, T) => {
    const k = seg(T, 52.9, 54.6);
    ctx.drawImage(ART.bars, -180, -60, 1800, 1200);
    clearL();
    drawCard(LG, { yaw: 0.04, pitch: -0.42, roll: 0, cx: 720, cy: 420 - k * 120, f: 1300, dist: 1200, scale: 1.45 });
    ctx.drawImage(LAYER, 0, 0);
    // chassis rails (the restraint cage), black against the glow
    ctx.fillStyle = '#0a0808';
    fillPts(ctx, [[0, 0], [300, 0], [380, 1080], [0, 1080]], '#0b0909');
    fillPts(ctx, [[1440, 0], [1140, 0], [1060, 1080], [1440, 1080]], '#0b0909');
    fillPts(ctx, [[300, 0], [330, 0], [410, 1080], [380, 1080]], '#3a302c');
    fillPts(ctx, [[1140, 0], [1110, 0], [1030, 1080], [1060, 1080]], '#3a302c');
    fillPts(ctx, [[250, 720 - k * 120], [1190, 720 - k * 120], [1170, 790 - k * 120], [270, 790 - k * 120]], '#16110f');
    const c = cAlpha(T, 52.95, 54.55);
    if (c) {
      mincho(ctx, 'オープニングアニメーション', 714, 286, 96, { align: 'center', alpha: c, sx: 0.64 });
      mincho(ctx, '作画', 450, 460, 66, { align: 'center', alpha: c, sx: 0.84 });
      minchoSpaced(ctx, '順伝播', 666, 486, 118, 150, { alpha: c, sx: 0.82 });
      mincho(ctx, '誤差逆伝播', 608, 632, 118, { alpha: c, sx: 0.76 });
      mincho(ctx, '演出', 450, 790, 66, { align: 'center', alpha: c, sx: 0.84 });
      minchoSpaced(ctx, '学習率', 666, 834, 118, 150, { alpha: c, sx: 0.82 });
    }
  });

  // ── 54.6–56.6 · A10 connectors clip on; the attention "eyes" open ─────────
  const ATT = attnPE(8, 64, 5, 1);
  const hOpenBox = (s, open) => s * Math.min(1, open * 1.05);
  function attnEye(ctx, x, y, s, open, flip) {
    const n = ATT.length, cs = s / n;
    ctx.save(); ctx.translate(x, y);
    if (open < 0.04) {   // closed: a lid line, like the closed eyes of the original shot
      ctx.strokeStyle = '#1b1020'; ctx.lineCap = 'round'; ctx.lineWidth = s * 0.08;
      ctx.beginPath(); ctx.moveTo(-s * 0.55, -s * 0.02); ctx.quadraticCurveTo(0, s * 0.2, s * 0.55, -s * 0.02); ctx.stroke();
      ctx.restore(); return;
    }
    ctx.fillStyle = '#1b1020'; ctx.fillRect(-s / 2 - 10, -hOpenBox(s, open) / 2 - 10, s + 20, hOpenBox(s, open) + 20);
    const hOpen = s * open;
    ctx.save(); ctx.beginPath(); ctx.rect(-s / 2, -hOpen / 2, s, hOpen); ctx.clip();
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = Math.pow(ATT[i][flip ? n - 1 - j : j] / 0.5, 0.55);
      ctx.fillStyle = `rgb(${Math.round(lerp(30, 250, v))},${Math.round(lerp(20, 240, v * v))},${Math.round(lerp(60, 200, v * v * v))})`;
      ctx.fillRect(-s / 2 + j * cs, -s / 2 + i * cs, cs - 3, cs - 3);
    }
    ctx.restore();
    // closed: a single lid line
    ctx.strokeStyle = '#1b1020'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-s / 2 - 30, 0); ctx.lineTo(s / 2 + 30, 0); if (open < 0.05) ctx.stroke();
    ctx.restore();
  }
  function a10(ctx, x, y, a, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
    rrect(ctx, -260, -70, 420, 140, 60); ctx.fillStyle = '#f2f3f8'; ctx.fill();
    ctx.save(); rrect(ctx, -260, -70, 420, 140, 60); ctx.clip(); ctx.fillStyle = '#a8b0c8'; ctx.fillRect(-270, 20, 440, 60); ctx.fillStyle = '#3a6ae0'; ctx.fillRect(-120, -80, 18, 170); ctx.restore();
    rrect(ctx, -260, -70, 420, 140, 60); ctx.strokeStyle = '#1c2030'; ctx.lineWidth = 6; ctx.stroke();
    grot(ctx, 'A10', 10, 18, 58, { color: '#1c2030', family: COND });
    ctx.restore();
  }
  SHOT(54.6, 56.6, 'a10', (ctx, t, fx, T) => {
    const tilt = E.inOutSine(seg(T, 55.1, 55.6));
    fill(ctx, '#4a1a12');
    ctx.save(); ctx.translate(0, -tilt * 640);
    // top: the dark underside of the upper blocks (the "hair"), then the orange MHA face
    ctx.fillStyle = '#e8a060'; ctx.fillRect(0, 700, W, 1200);
    ctx.fillStyle = '#b86a38'; ctx.fillRect(1020, 700, 420, 1200);
    ctx.fillStyle = '#3a140e'; ctx.fillRect(0, 0, W, 760);
    ctx.fillStyle = '#5c2216';
    for (let i = 0; i < 9; i++) { const x = i * 170 - 40; fillPts(ctx, [[x, 600], [x + 150, 600], [x + 110, 800 + (i % 3) * 30], [x + 60, 780]], '#3a140e'); }
    ctx.strokeStyle = 'rgba(160,60,30,0.6)'; ctx.lineWidth = 6; for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(i * 130, 80); ctx.lineTo(i * 130 + 40, 560); ctx.stroke(); }
    const open = E.outCubic(seg(T, 55.95, 56.15));
    attnEye(ctx, 430, 1000, 250, open, false); attnEye(ctx, 1010, 1000, 250, open, true);
    grot(ctx, 'Multi-Head Attention', 720, 1290, 60, { align: 'center', color: '#3a1a10' });
    ctx.restore();
    // the A10 connectors come in from the corners
    const kc = E.outCubic(seg(T, 54.7, 55.15));
    a10(ctx, lerp(-200, 200, kc), lerp(1200, 900, kc) - tilt * 900, -0.55, 1.3);
    a10(ctx, lerp(1640, 1240, kc), lerp(1200, 900, kc) - tilt * 900, Math.PI + 0.55, 1.3);
  });

  // ── 56.6–58.4 · dark red: TYPE-01 silhouette, the eyes flash ──────────────
  SHOT(56.6, 58.4, 'eyes_flash', (ctx, t, fx, T) => {
    fill(ctx, '#140404');
    const k = seg(T, 56.6, 58.4);
    fillPts(ctx, [[0, 1080], [0, 700], [600, 420], [1440, 380], [1440, 1080]], '#b42410');
    fillPts(ctx, [[520, 0], [1100, 0], [1440, 300], [1440, 520], [900, 380]], '#7a1408');
    const cam = { yaw: 0.6, pitch: -0.3, roll: -0.25, cx: 640 - k * 60, cy: 900, f: 1300, dist: 1300, scale: 1.45 };
    drawCard(ctx, cam, { silhouette: '#070305' });
    const e1 = T > 57.45 && T < 57.75, e2 = T > 57.95 && T < 58.35;
    if (e1 || e2) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const slit = (x0, x1) => fillPts(ctx, [[x0, -410, -56], [x1, -393, -56], [x1 + (x1 > x0 ? -6 : 6), -380, -56], [x0 + (x1 > x0 ? 6 : -6), -392, -56]].map((p) => v3proj(p, cam)), '#fffbe6');
      slit(-90, -24); if (e2) slit(90, 24);
      ctx.restore(); fx.bloom = 0.9; fx.thr = 0.6;
    }
  });

  // ── 58.4–60.03 · staff flashes: ∇ the commander, the guardian, BatchNorm, the Perceptron ─
  function commander(ctx, T, dim) {
    fill(ctx, '#0a1020');
    const R = rngFor(5);
    for (let i = 0; i < 9; i++) { const x = 900 + R() * 600, y = R() * 700; const g = ctx.createRadialGradient(x, y, 0, x, y, 60 + R() * 40); g.addColorStop(0, 'rgba(90,150,255,0.55)'); g.addColorStop(0.6, 'rgba(60,110,230,0.25)'); g.addColorStop(1, 'rgba(40,80,200,0)'); ctx.fillStyle = g; ctx.fillRect(x - 120, y - 120, 240, 240); }
    // the ∇: a vast inverted triangle in shadow, rim-lit
    const pts = [[260, 120], [1180, 120], [720, 1180]];
    fillPts(ctx, pts, '#241d1c');
    fillPts(ctx, [[1180, 120], [1140, 120], [700, 1140], [720, 1180]], '#5a4640');
    fillPts(ctx, [[260, 120], [1180, 120], [1160, 170], [290, 170]], '#3a2e2c');
    // red glasses glint
    for (const gx of [560, 880]) {
      ctx.save(); ctx.translate(gx, 330); ctx.beginPath(); ctx.ellipse(0, 0, 140, 62, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#d8401c'; ctx.fill(); ctx.lineWidth = 10; ctx.strokeStyle = '#140c0a'; ctx.stroke();
      ctx.clip(); ctx.fillStyle = '#ffb060'; ctx.beginPath(); ctx.moveTo(-160, -20); ctx.lineTo(160, -70); ctx.lineTo(160, -30); ctx.lineTo(-160, 20); ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = '#140c0a'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(700, 320); ctx.quadraticCurveTo(720, 300, 740, 320); ctx.stroke();
    // a white glove pushes them up
    silHand(ctx, 920, 1150, 1.9, -1.9, 0.2, '#f4f4f2');
    if (dim) { ctx.fillStyle = `rgba(0,0,0,${dim})`; ctx.fillRect(0, 0, W, H); }
  }
  function bellBeing(ctx, cx, cy, s, bg) {
    fill(ctx, bg);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    const pts = []; for (let i = 0; i <= 80; i++) { const x = -3.2 + i * 0.08; pts.push([x * 150, -Math.exp(-x * x / 2) * 620]); }
    const dep = [60, -40];
    // extrusion (side band) then the face
    const back = pts.map(([x, y]) => [x + dep[0], y + dep[1]]);
    fillPts(ctx, [...back, [480 + dep[0], dep[1]], [-480 + dep[0], dep[1]]], '#b08a2a');
    fillPts(ctx, [...pts, [480, 0], [-480, 0]], '#f5d466');
    ctx.save(); pathPts(ctx, [...pts, [480, 0], [-480, 0]]); ctx.clip(); ctx.fillStyle = '#d8ae3c'; ctx.fillRect(0, -700, 600, 800); ctx.restore();
    strokePts(ctx, [...pts, [480, 0], [-480, 0]], '#3a2c10', 6);
    ctx.strokeStyle = '#3a2c10'; ctx.lineWidth = 4;
    for (const x of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(x * 150, 0); ctx.lineTo(x * 150, -Math.exp(-x * x / 2) * 620); ctx.stroke(); }
    grot(ctx, 'μ', 0, 60, 60, { align: 'center', color: '#1a1a2a', family: ROMAN, style: 'italic', weight: 400 });
    grot(ctx, 'σ', 150, 60, 56, { align: 'center', color: '#1a1a2a', family: ROMAN, style: 'italic', weight: 400 });
    ctx.restore();
  }
  window.bellBeing = bellBeing; window.commander = commander;
  SHOT(58.4, 60.033, 'staff_flash', (ctx, t, fx, T) => {
    if (T < 58.8) commander(ctx, T, T < 58.633 ? 0 : 0.55);
    else if (T < 59.1) {
      fill(ctx, '#9aa0ac'); ctx.fillStyle = '#7c8290'; ctx.fillRect(0, 0, W, 300);
      drawLSTM(ctx, { yaw: -0.3, pitch: -0.05, roll: 0.02, cx: 700, cy: 640, f: 1700, dist: 2400, scale: 2.6 }, { light: [0.5, 0.4, 0.75] });
    } else if (T < 59.2) { fill(ctx, '#060404'); drawTransformer(ctx, { yaw: 0, pitch: 0, cx: 720, cy: 700, f: 1700, dist: 2400, scale: 1.6 }, { silhouette: '#1a0e0a' }); }
    else if (T < 59.533) bellBeing(ctx, 700, 820, 1.25, '#dfe6ee');
    else {
      fill(ctx, '#a9aaa8');
      ctx.fillStyle = '#9a9b99'; for (let i = 0; i < 4; i++) ctx.fillRect(0, 260 * i + 120, W, 6);
      for (const [x, y] of [[180, 300], [620, 300], [1060, 300], [180, 820], [620, 820], [1060, 820]]) { circle(ctx, x, y, 10, '#8c8d8b'); }
      perceptron(ctx, 720, 1250, 1.4, { eye: true });
      if (T > 59.7) { ctx.fillStyle = 'rgba(20,20,30,0.35)'; ctx.fillRect(0, 0, W, H); }
    }
  });

  // ── 60.0–64.0 · TYPE-01 close-ups on hot orange; 広報 / アニメーション制作 ──
  SHOT(60.033, 64.0, 'unit01_close', (ctx, t, fx, T) => {
    ctx.drawImage(ART.bars, -200 - (T - 60) * 30, -60, 1800, 1200);
    clearL();
    if (T < 62.1) {
      const k = seg(T, 60.033, 62.1);
      drawCard(LG, { yaw: 0.75 - k * 0.12, pitch: 0.2, roll: -0.62 + k * 0.05, cx: 420 + k * 40, cy: 520, f: 1500, dist: 1500, scale: 2.4 }, { fanRot: T * 0.6 });
    } else {
      const k = seg(T, 62.1, 64.0);
      drawCard(LG, { yaw: 0.05, pitch: -0.12, roll: 0, cx: 720, cy: lerp(760, 620, k), f: 1500, dist: 1500, scale: lerp(2.6, 1.6, E.inOutSine(k)) }, { fanRot: T * 0.6 });
    }
    ctx.drawImage(LAYER, 0, 0);
    let c = cAlpha(T, 60.2, 62.0);
    if (c) {
      mincho(ctx, '広報', 720, 312, 70, { align: 'center', alpha: c, sx: 0.84 });
      minchoFit(ctx, 'ベンチマーク', 530, 506, 124, 382, { alpha: c, sx: 0.8 });
      mincho(ctx, '(GLUE)', 720, 566, 48, { align: 'center', alpha: c, sx: 0.84 });
      minchoFit(ctx, '厳選サンプル', 530, 742, 124, 382, { alpha: c, sx: 0.8 });
      mincho(ctx, '(付録)', 720, 810, 48, { align: 'center', alpha: c, sx: 0.84 });
    }
    c = cAlpha(T, 62.15, 64.0, 2, 0);
    if (c) {
      mincho(ctx, 'アニメーション制作', 720, 356, 70, { align: 'center', alpha: c, sx: 0.72 });
      withAlpha(ctx, c, () => {
        ctx.save(); ctx.font = `900 118px "Noto Sans CJK JP"`; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = 10; ctx.strokeStyle = CW; ctx.fillStyle = CW;
        ctx.translate(716, 570); ctx.scale(0.86, 1); ctx.strokeText('テンソルコア', 0, 0); ctx.fillText('テンソルコア', 0, 0); ctx.restore();
        ctx.save(); ctx.font = `900 132px "Noto Sans CJK JP"`; ctx.textAlign = 'center'; ctx.fillStyle = CW; ctx.translate(700, 764); ctx.scale(1.3, 1); ctx.fillText('GEMM', 0, 0); ctx.restore();
      });
    }
  });

  // ── 64.0–66.8 · full body, sixteen heads unfold as wings; プロデューサー ──
  const HEADS = attnPE(16, 64, 3, 2);
  function eyeGlowW(ctx, cam) {
    for (const [x0, x1] of [[-90, -24], [90, 24]]) fillPts(ctx, [[x0, -374, -56], [x1, -357, -56], [x1 + (x1 > x0 ? -6 : 6), -344, -56], [x0 + (x1 > x0 ? 6 : -6), -356, -56]].map((p) => v3proj(p, cam)), '#fff6d0');
  }
  SHOT(64.0, 66.8, 'wings', (ctx, t, fx, T) => {
    ctx.drawImage(ART.bars, -180, -60, 1800, 1200);
    const g = E.outCubic(seg(T, 64.25, 64.9)), fl = 0.9 + 0.1 * Math.sin(T * 23);
    const ox = 720, oy = 470;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let h = 0; h < 16; h++) {
      const side = h < 8 ? -1 : 1, i = h % 8;
      const base = -1.05 + i * 0.3;                         // fan from up-and-out to down-and-out
      const ang = side < 0 ? Math.PI - base : base;
      const L = (560 + ((i * 37) % 3) * 120) * g;
      const row = HEADS[h];
      const bend = 0.18 * side;
      for (let sgm = 0; sgm < 16; sgm++) {
        const u0 = sgm / 16, u1 = (sgm + 1) / 16;
        const v = Math.pow(row[sgm] / 0.4, 0.45);
        const w0 = 20 * (1 - u0 * 0.92), w1 = 20 * (1 - u1 * 0.92);
        const p = (u, w) => { const a = ang - bend * u * u; const ca = Math.cos(a), sa = Math.sin(a); return [ox + ca * L * u - sa * w, oy + sa * L * u + ca * w]; };
        const col = `rgba(255,${Math.round(170 + 80 * v)},${Math.round(40 + 140 * v * v)},${(0.22 + 0.5 * v) * fl})`;
        fillPts(ctx, [p(u0, -w0 * 1.8), p(u1, -w1 * 1.8), p(u1, w1 * 1.8), p(u0, w0 * 1.8)], col.replace(/,[0-9.]+\)$/, ',' + ((0.1 + 0.18 * v) * fl).toFixed(3) + ')'));
        fillPts(ctx, [p(u0, -w0), p(u1, -w1), p(u1, w1), p(u0, w0)], col);
      }
    }
    ctx.restore();
    // backlit by its own wings: the unit reads as a dark shape with a hot rim, so the credits sit clean on it
    const wcam = { yaw: 0.0, pitch: -0.08, roll: 0, cx: ox, cy: 600, f: 1500, dist: 1500, scale: 1.02 };
    drawCard(ctx, wcam, { silhouette: '#ffc060', lw: 16 });                 // hot rim (thick trace line)
    drawCard(ctx, wcam, { silhouette: '#2a1a38', lw: 2 });                  // the unit in shadow
    eyeGlowW(ctx, wcam);
    fx.bloom = 0.35 * g; fx.thr = 0.82;
    const c = cAlpha(T, 64.05, 66.75);
    if (c) {
      mincho(ctx, 'プロデューサー', 720, 346, 70, { align: 'center', alpha: c, sx: 0.72 });
      mincho(ctx, '計算予算', 530, 540, 124, { alpha: c, sx: 0.78 });
      mincho(ctx, '(C≈6ND)', 720, 608, 48, { align: 'center', alpha: c, sx: 0.84 });
      minchoSpaced(ctx, '学習データ', 560, 790, 110, 80, { alpha: c, sx: 0.8 });
    }
  });
})();
