// ─────────────────────────────────────────────────────────────────────────────
//  p1_tv1995 · shots 35b–45 (78.07 – 90.5 s): the cross, SECOND IMPACT, ADAM,
//  監督, the crucifix, the last line, 製作.
// ─────────────────────────────────────────────────────────────────────────────
(() => {
  const fr = (n) => n / 30;
  const CUT = (a, b, name, fn) => SHOT(fr(a), fr(b), name, fn);
  const LAYER = mkCanvas(W, H), LG = LAYER.getContext('2d');
  const clearL = () => { LG.setTransform(1, 0, 0, 1, 0, 0); LG.globalAlpha = 1; LG.globalCompositeOperation = 'source-over'; LG.clearRect(0, 0, W, H); };
  const bands = (ctx, stops, n = 9, seed = 3, wav = 6) => bandSky(ctx, 0, 0, W, H, stops, n, seed, wav);
  const { capWord, wordCard, aimCam, cardPt, eyeGlow, markOne, resnetBeing } = CHORUS;

  // ═════ 78.07 – 79.2 · the cross, the berserker, the young commander ════════
  const BLOT = (() => { const R = rngFor(161), a = []; for (let i = 0; i < 46; i++) { const v = i < 30; a.push([v ? (R() - 0.5) * 120 : (R() - 0.5) * 760, v ? -520 + R() * 1180 : -250 + (R() - 0.5) * 110, 60 + R() * 110, R()]); } return a; })();
  CUT(2342, 2357, 'cross_blast', (ctx, t, fx, T) => {
    fill(ctx, '#fff6a8');
    const k = E.outCubic(seg(t, 0.05, 0.5));
    ctx.save(); ctx.translate(720, 560);
    for (const [x, y, r, q] of BLOT) { if (q > k + 0.15) continue; const rr = r * (0.3 + 0.9 * k); ctx.beginPath(); ctx.ellipse(x * (0.6 + 0.4 * k), y * (0.6 + 0.4 * k), rr * 1.2, rr, q * 3, 0, Math.PI * 2); ctx.fillStyle = q < 0.5 ? '#ffb238' : '#f58a20'; ctx.fill(); }
    if (k > 0.6) { ctx.globalAlpha = seg(k, 0.6, 1); ctx.fillStyle = '#e8641a'; ctx.fillRect(-46, -560, 92, 1200); ctx.fillRect(-360, -290, 720, 84); }
    ctx.restore();
    fx.flash = 1 - seg(t, 0, 0.1); fx.flashCol = [1, 1, 0.92];
    fx.bloom = 0.6; fx.thr = 0.75;
  });
  CUT(2357, 2364, 'berserk', (ctx, t, fx, T) => {
    fill(ctx, '#0a0612');
    fillPts(ctx, [[0, 0], [620, 0], [380, 300], [0, 420]], '#c8401a'); fillPts(ctx, [[0, 0], [380, 0], [200, 160], [0, 240]], '#ff9a3a');
    const cam = aimCam(-0.35, 0.25, -0.3, 2.2, 0, -300, 820, 400 + t * 30);
    drawCard(ctx, cam, { silhouette: '#1a1224' });
    ctx.save(); ctx.globalAlpha = 0.6; drawCard(ctx, { ...cam, cx: cam.cx + 5, cy: cam.cy - 4 }, { silhouette: '#3a2a4a' }); ctx.restore();
    drawCard(ctx, { ...cam, cx: cam.cx - 3, cy: cam.cy + 3 }, { silhouette: '#120c1a' });
    eyeGlow(ctx, cam, 0.9, { k: 1.4, col: 'rgba(200,255,120,0.95)' }); fx.bloom = 0.7; fx.thr = 0.6;
  });
  function youngCommander(ctx, t) {
    bands(ctx, [[0, '#f8f0d0'], [1, '#e8d8a0']], 6, 41);
    const pts = [[330, 60], [1110, 60], [720, 1060]];
    fillPts(ctx, pts, '#6a5446'); fillPts(ctx, [[1110, 60], [1070, 60], [700, 1020], [720, 1060]], '#8a7060');
    fillPts(ctx, [[330, 60], [1110, 60], [1090, 120], [350, 120]], '#1a1210');
    // the beard: a dark hatch filling the lower apex
    fillPts(ctx, [[560, 640], [880, 640], [720, 1060]], '#1e1614');
    ctx.strokeStyle = '#3a2c28'; ctx.lineWidth = 3; for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.moveTo(570 + i * 20, 640); ctx.lineTo(600 + i * 13, 760 + (i % 3) * 20); ctx.stroke(); }
    for (const gx of [580, 860]) {
      ctx.save(); ctx.translate(gx, 380); ctx.beginPath(); ctx.ellipse(0, 0, 120, 56, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#c8301a'; ctx.fill(); ctx.lineWidth = 9; ctx.strokeStyle = '#140c0a'; ctx.stroke();
      ctx.clip(); ctx.fillStyle = '#ff9a60'; ctx.beginPath(); ctx.moveTo(-130, -10); ctx.lineTo(130, -60); ctx.lineTo(130, -20); ctx.lineTo(-130, 30); ctx.fill(); ctx.restore();
    }
    ctx.strokeStyle = '#140c0a'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(700, 372); ctx.quadraticCurveTo(720, 352, 740, 372); ctx.stroke();
  }
  CUT(2364, 2376, 'young_commander', (ctx, t) => { ctx.save(); camPush(ctx, 1 + t * 0.08, 720, 400); youngCommander(ctx, t); ctx.restore(); });

  // ═════ 79.2 – 80.5 · the child, the mother, SECOND IMPACT, 2012 ════════════
  CUT(2376, 2380, 'child_sketch', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#f4f8fa'], [1, '#dfe8ee']], 5, 42);
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#c8e8e0';
    fillPts(ctx, [[900, 0], [1100, 0], [700, 1080], [500, 1080]], '#d8f0e8'); fillPts(ctx, [[1200, 0], [1300, 0], [1000, 1080], [900, 1080]], '#e0f4ec'); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.7; silFigure1(ctx, 760, 940, 0.95, '#a9bccb'); ctx.restore();
    rrect(ctx, 360, 760, 260, 190, 40); ctx.fillStyle = '#9fb8c6'; ctx.fill(); ctx.strokeStyle = '#5a7080'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = '#5a7080'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(430, 760); ctx.lineTo(450, 720); ctx.lineTo(530, 720); ctx.lineTo(550, 760); ctx.stroke();
    ctx.fillStyle = 'rgba(120,150,170,0.35)'; ctx.beginPath(); ctx.ellipse(700, 950, 280, 34, 0, 0, Math.PI * 2); ctx.fill();
  });
  // the second child's mother → the Highway Network (2015): the same skip, but gated
  CUT(2380, 2389, 'highway', (ctx, t, fx, T) => {
    fill(ctx, '#0a169c');
    resnetBeing(ctx, 760 - t * 30, 560, 0.95, -Math.PI / 2 + 0.06, { gate: true, pal: { base: '#ffb040', shade: '#e07a20', line: '#3a1a08', arc: '#ffd060', text: '#3a1a08' } });
  });
  CUT(2389, 2391, 'red_cross', (ctx, t, fx, T) => {
    fill(ctx, '#160608');
    fillPts(ctx, [[0, 0], [420, 0], [380, 1080], [0, 1080]], '#d8201a'); fillPts(ctx, [[300, 0], [420, 0], [380, 1080], [280, 1080]], '#98120e');
    fillPts(ctx, [[1440, 0], [1060, 0], [1110, 1080], [1440, 1080]], '#d8201a'); fillPts(ctx, [[1060, 0], [1160, 0], [1200, 1080], [1110, 1080]], '#98120e');
    ctx.fillStyle = '#e8e8f0'; ctx.fillRect(690, 380, 64, 250); ctx.fillRect(610, 470, 224, 64);
    ctx.fillStyle = '#a8a8b8'; ctx.fillRect(734, 380, 20, 250);
    ctx.strokeStyle = '#6a6a78'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(722, 380); ctx.lineTo(640, 0); ctx.moveTo(722, 380); ctx.lineTo(800, 0); ctx.stroke();
  });
  CUT(2391, 2394, 'card_second_impact', (ctx) => wordCard(ctx, [['SECOND', 0.5, 0.375, 0.28, 0.9], ['IMPACT', 0.5, 0.93, 0.29, 0.8]], { color: '#ec1c24' }));
  // the white giant → AlexNet (2012), its famous figure cropped at the top
  function alexGiant(ctx, t) {
    bands(ctx, [[0, '#06080e'], [0.6, '#141a26'], [1, '#262c38']], 8, 43);
    withAlpha(ctx, 0.5, () => { ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(ART.smoke, -300, 200, 2400, 1800); });
    const WHITE = ['#fff8fb', '#f4dde8', '#dcbccb'];
    const hole = (g, w, h) => { g.fillStyle = '#1a1420'; g.fillRect(w * 0.28, h * 0.36, w * 0.2, h * 0.2); g.fillStyle = '#3a2a3a'; g.fillRect(w * 0.62, h * 0.62, w * 0.12, h * 0.12); };
    const B = [];
    const L = [[-980, 30, 700, 700, 0], [-640, 120, 330, 330, 110], [-340, 160, 170, 170, 170], [-60, 190, 96, 96, 220], [190, 190, 96, 96, 220], [420, 190, 96, 96, 160]];
    for (const [x, sp, hh, dd, ww] of L) {
      if (!ww) { B.push({ c: [x, 0, 0], s: [26, hh, dd], col: WHITE, side: hole }); continue; }
      for (const y of [-sp * 1.15, sp * 0.85]) B.push({ c: [x, y, 0], s: [ww, hh, dd], col: WHITE, side: hole, decal: hole });
    }
    for (const [x, hh] of [[640, 420], [760, 420], [880, 220]]) for (const y of [-260, 200]) B.push({ c: [x, y * (hh / 420), 0], s: [22, hh, 22], col: WHITE });
    const cam = { yaw: 0.62, pitch: -0.12, roll: -0.04, cx: 700, cy: 380 + t * 40, f: 1500, dist: 2000, scale: 1.05 + t * 0.2 };
    drawBoxes(ctx, B, cam, { line: '#ffe8f2', lw: 2, light: [0.2, 0.3, 0.9] });
  }
  CUT(2394, 2404, 'alexnet_giant', (ctx, t, fx) => { alexGiant(ctx, t); fx.bloom = 0.7; fx.thr = 0.72; });
  let PLANET = null;
  function buildPlanet() {
    PLANET = upscale(fieldCanvas(420, 300, (u, v) => {
      const n = fbm2(u * 4 + fbm2(u * 2, v * 2, 3, 171) * 1.5, v * 6, 5, 173);
      const base = rampCol([[0, [30, 20, 90]], [0.5, [70, 40, 150]], [1, [120, 80, 200]]], v);
      const c = clamp((n - 0.5) * 4);
      return base.map((x, i) => lerp(x, [236, 230, 250][i], Math.floor(c * 3) / 3 * 0.85));
    }), 2100, 1500);
  }
  function satellite(ctx, t) {
    if (!PLANET) buildPlanet();
    ctx.save(); camPush(ctx, 1 + t * 0.15, 640, 640);
    ctx.drawImage(PLANET, -330, -200);
    // the crater of light (ILSVRC 2012)
    ctx.save(); ctx.translate(640, 690); ctx.scale(1, 0.36);
    const g = ctx.createRadialGradient(40, 40, 10, 0, 0, 560);
    g.addColorStop(0, '#fffbe0'); g.addColorStop(0.12, '#ffe060'); g.addColorStop(0.3, '#ff6a2a'); g.addColorStop(0.62, '#f0141a'); g.addColorStop(0.85, '#c01060'); g.addColorStop(1, 'rgba(160,20,120,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 560, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.restore();
    ctx.strokeStyle = '#ff2a2a'; ctx.lineWidth = 4;
    for (const [x, y] of [[180, 140], [760, 90], [1250, 210], [90, 520], [1330, 620], [300, 930], [1000, 980], [620, 330], [1120, 420]]) { ctx.beginPath(); ctx.moveTo(x - 12, y - 12); ctx.lineTo(x + 12, y + 12); ctx.moveTo(x + 12, y - 12); ctx.lineTo(x - 12, y + 12); ctx.stroke(); }
    // HUD, in the original's red boxed style
    ctx.fillStyle = 'rgba(255,240,240,0.9)'; ctx.fillRect(40, 36, 230, 70); ctx.strokeStyle = '#e01818'; ctx.lineWidth = 4; ctx.strokeRect(40, 36, 230, 70);
    capWord(ctx, 'A.D. 2012', 155, 92, 42, { color: '#e01818', w: 200 });
    grot(ctx, 'ILSVRC-2012', 44, 136, 24, { color: '#ff4a4a', family: COND });
    ctx.fillStyle = 'rgba(20,0,0,0.6)'; ctx.fillRect(1030, 950, 380, 96); ctx.strokeStyle = '#e01818'; ctx.strokeRect(1030, 950, 380, 96);
    grot(ctx, 'TOP-5 ERR 15.3%', 1046, 994, 36, { color: '#ff3030', family: COND });
    for (let i = 0; i < 44; i++) { const w = (i * 7) % 3 + 1; ctx.fillStyle = '#ff3030'; ctx.fillRect(1046 + i * 8, 1008, w * 2, 26); }
  }
  CUT(2404, 2410, 'satellite', (ctx, t, fx) => { satellite(ctx, t); fx.bloom = 0.35; fx.thr = 0.8; });
  CUT(2410, 2415, 'perceptron_void', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#02061a'], [1, '#0a2a6a']], 7, 44);
    ctx.save(); ctx.translate(640, 900); ctx.scale(1, 0.34);
    const g = ctx.createRadialGradient(0, 0, 40, 0, 0, 900); g.addColorStop(0, '#dff4ff'); g.addColorStop(0.4, '#6ab8f0'); g.addColorStop(1, 'rgba(20,60,160,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 900, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    rrect(ctx, 300, 640, 70, 90, 16); ctx.fillStyle = '#f4faff'; ctx.fill();
    perceptron(ctx, 900, 1000, 0.82, { eye: true, pal: { base: '#e8f0fa', shade: '#98acd0', line: '#2a3454', accent: '#e0402e', wire: '#2a3454' } });
    fx.bloom = 0.35; fx.thr = 0.8;
  });
  // the pencil sketch of the boy → the decoder, the last one to arrive
  function sketchRect(ctx, x, y, w, h, R, col) {
    ctx.strokeStyle = col; ctx.lineCap = 'round';
    for (let p = 0; p < 2; p++) {
      const j = () => (R() - 0.5) * 7; ctx.lineWidth = p ? 1.6 : 2.6;
      ctx.beginPath(); ctx.moveTo(x + j() - 6, y + j()); ctx.lineTo(x + w + j() + 8, y + j()); ctx.moveTo(x + w + j(), y + j() - 6); ctx.lineTo(x + w + j(), y + h + j() + 6);
      ctx.moveTo(x + w + j() + 6, y + h + j()); ctx.lineTo(x + j() - 8, y + h + j()); ctx.moveTo(x + j(), y + h + j() + 6); ctx.lineTo(x + j(), y + j() - 8); ctx.stroke();
    }
  }
  CHORUS.sketchRect = sketchRect;
  function sketchLabel(ctx, s, x, y, size, col) { ctx.save(); ctx.fillStyle = col; ctx.font = `400 ${size}px "Klee One"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); ctx.restore(); }
  CUT(2415, 2422, 'decoder_sketch', (ctx, t, fx, T) => {
    fill(ctx, '#faf0f2');
    fillPts(ctx, [[820, 0], [1440, 0], [1440, 1080], [1000, 1080]], '#f2c8da');
    const R = rngFor(181), col = '#5a2a3a';
    ctx.save(); ctx.translate(760, 560); ctx.rotate(0.07); ctx.translate(-760, -560);
    const blocks = [[980, 110, 'Output Embedding'], [760, 150, 'Masked Multi-Head|Attention'], [660, 70, 'Add & Norm'], [470, 150, 'Feed Forward'], [370, 70, 'Add & Norm'], [230, 80, 'Linear'], [110, 80, 'Softmax']];
    for (const [y, h, lab] of blocks) { sketchRect(ctx, 560, y - h / 2, 420, h, R, col); lab.split('|').forEach((l, i, a) => sketchLabel(ctx, l, 770, y + (i - (a.length - 1) / 2) * 34, 30, col)); }
    sketchRect(ctx, 510, 320, 520, 520, R, col);
    sketchLabel(ctx, 'N×', 450, 560, 46, col);
    ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(770, 930); ctx.lineTo(770, 40); ctx.moveTo(540, 850); ctx.bezierCurveTo(470, 800, 470, 700, 540, 660); ctx.stroke();
    ctx.restore();
  });
  CUT(2422, 2429, 'mark1_brown', (ctx, t, fx, T) => {
    ctx.save(); ctx.translate(720, 540); ctx.rotate(-0.22); ctx.scale(1.1, 1.1); ctx.translate(-720, -540);
    markOne(ctx, T, { bg: '#3a0c14', bg2: '#5a1420', shell: ['#b07a44', '#6e4424'], vent: '#1a1a1a', lit: '#7cff8a' });
    ctx.restore(); fx.bloom = 0.3; fx.thr = 0.8;
  });
  CUT(2429, 2434, 'card_adam', (ctx) => wordCard(ctx, [['ADAM', 0.5, 0.72, 0.42, 0.82]], { bg: '#ffffff', color: '#000000' }));

  // ═════ 81.13 – 82.63 · the scientist, the grid, the guardian turning ════════
  CUT(2434, 2441, 'bell_profile', (ctx, t, fx, T) => {
    bellBeing(ctx, 760, 900, 1.15, '#2a58a8');
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = 'rgba(120,230,255,0.35)';
    for (const [x, w] of [[200, 90], [520, 40], [1100, 140]]) fillPts(ctx, [[x, 0], [x + w, 0], [x + w - 500, 1080], [x - 500, 1080]], 'rgba(120,230,255,0.3)');
    ctx.restore();
  });
  // the green data grid → the grokking run: Fourier power of the embedding at 24 snapshots
  function grokGrid(ctx, t) {
    fill(ctx, '#020503');
    const G = window.GROK;
    const mono = (s, x, y, sz, c, al = 'left') => { ctx.save(); ctx.font = `400 ${sz}px "Share Tech Mono"`; ctx.fillStyle = c; ctx.textAlign = al; ctx.fillText(s, x, y); ctx.restore(); };
    mono('97th PRIME   pattern  (a+b) mod 97   WD 1.0 · 30% TRAIN', 330, 50, 30, '#ffb020');
    mono((97).toString(2), 1400, 50, 30, '#ff5a20', 'right');
    mono((30000).toString(2), 30, 1062, 28, '#ff5a20');
    const cols = 6, rows = 4, pw = 220, ph = 238;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, s = Math.round(i * (G.snap_steps.length - 1) / (cols * rows - 1));
      const x0 = 48 + c * 232, y0 = 82 + r * 244 - (t * 60) % 1;
      const P = G.fourier[s], mx = Math.max(...P);
      ctx.strokeStyle = '#3cf07a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0 + 30, y0 + 24); ctx.lineTo(x0 + 30, y0 + ph - 12); ctx.stroke();
      mono(String(G.snap_steps[s]), x0 + 36, y0 + 20, 20, '#3cf07a');
      for (let k = 0; k < 16; k++) {
        const p = P[k * 3] / mx, y = y0 + 34 + k * 12.4;
        ctx.strokeStyle = '#2ab860'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0 + 24, y); ctx.lineTo(x0 + 30 + 12, y); ctx.stroke();
        const col = p > 0.8 ? '#ff2a1a' : p > 0.5 ? '#ff9a1a' : p > 0.3 ? '#ffe02a' : p > 0.15 ? '#3cf07a' : '#2a5aff';
        ctx.fillStyle = col; ctx.fillRect(x0 + 46, y - 5, 12 + p * 130, 9);
      }
      const va = G.val_acc[Math.min(G.val_acc.length - 1, Math.round(G.snap_steps[s] / 50))];
      mono('VAL ' + va.toFixed(3), x0 + 36, y0 + ph - 8, 18, va > 0.99 ? '#ff5a3a' : '#3cf07a');
    }
  }
  CUT(2441, 2449, 'grok_grid', (ctx, t) => grokGrid(ctx, t));
  CUT(2449, 2471, 'lstm_turn', (ctx, t, fx, T) => {
    const f = Math.round(T * 30);
    const ph = f < 2454 ? 0 : f < 2459 ? 1 : f < 2464 ? 2 : 3;
    bands(ctx, [[0, '#3a3a8a'], [0.5, '#7a6ac0'], [1, '#c4ace0']], 9, 45, 10);
    withAlpha(ctx, 0.3, () => { ctx.globalCompositeOperation = 'screen'; ctx.drawImage(ART.skyOver, -300 - ph * 20, 100, 2000, 1200); });
    const yaw = [-1.15, -0.9, -0.6, -0.32][ph], pitch = [0.42, 0.3, 0.12, -0.04][ph], sc = [3.3, 3.2, 3.1, 3.0][ph];
    drawLSTM(ctx, { yaw, pitch, roll: [0.15, 0.1, 0.04, 0.0][ph], cx: [620, 640, 680, 720][ph], cy: [700, 660, 620, 590][ph], f: 1700, dist: 2400, scale: sc }, { light: [0.6, 0.4, 0.7] });
  });
  CUT(2471, 2479, 'three_sketch', (ctx, t, fx, T) => {
    fill(ctx, '#ead8c4');
    const R = rngFor(191), col = '#6a4028';
    // the Perceptron, the ResNet block and the LSTM cell, pencilled side by side
    ctx.save(); ctx.globalAlpha = 0.85;
    ctx.strokeStyle = col; ctx.lineWidth = 2.4;
    for (let p = 0; p < 2; p++) { ringS(ctx, 290 + p * 3, 380 + p * 2, 80, col, 2.2); }
    for (const dx of [-120, -60, 0, 60, 120]) { ctx.beginPath(); ctx.moveTo(290 + dx * 1.2, 200); ctx.lineTo(290 + dx * 0.3, 320); ctx.stroke(); ringS(ctx, 290 + dx * 1.2, 190, 16, col, 2); }
    sketchRect(ctx, 230, 480, 120, 280, R, col);
    ctx.beginPath(); ctx.moveTo(250, 700); ctx.lineTo(290, 700); ctx.lineTo(290, 580); ctx.lineTo(330, 580); ctx.stroke();
    sketchRect(ctx, 560, 300, 300, 120, R, col); sketchRect(ctx, 560, 520, 300, 120, R, col);
    ctx.beginPath(); ctx.moveTo(710, 200); ctx.lineTo(710, 880); ctx.moveTo(710, 240); ctx.bezierCurveTo(960, 240, 960, 760, 740, 760); ctx.stroke(); ringS(ctx, 710, 760, 34, col, 2.4);
    sketchRect(ctx, 1000, 380, 330, 240, R, col);
    ctx.beginPath(); ctx.moveTo(960, 420); ctx.lineTo(1370, 420); ctx.moveTo(960, 590); ctx.lineTo(1000, 590); ctx.stroke();
    for (const gx of [1060, 1130, 1200, 1270]) { sketchRect(ctx, gx - 22, 500, 44, 34, R, col); }
    ctx.restore();
  });

  // ═════ 82.63 – 83.7 · 監督 ══════════════════════════════════════════════════
  function directorCard(ctx) {
    fill(ctx, '#000');
    minchoV(ctx, '監督', 0.087 * W, 0.155 * H, 0.118 * H, { lh: 1.06, sx: 1 });
    const s = 0.305 * H;
    mincho(ctx, '勾配降', 0.262 * W, 0.585 * H, s, { sx: 0.86, embolden: 0.018 });
    mincho(ctx, '下', 0.705 * W, 0.915 * H, s, { sx: 0.86, embolden: 0.018 });
  }
  CUT(2479, 2511, 'director', (ctx, t, fx, T) => {
    directorCard(ctx);
    const f = Math.round(T * 30);
    if (f >= 2508) {
      const k = (f - 2508 + 1) / 3;
      ctx.fillStyle = '#46f24a';
      fillPts(ctx, [[-40, 0.345 * H], [W * (0.25 + 0.9 * k), 0.325 * H], [W * (0.25 + 0.9 * k) - 30, 0.39 * H], [-40, 0.415 * H]], '#46f24a');
      fillPts(ctx, [[-40, 0.44 * H], [W * (0.1 + 0.6 * k), 0.43 * H], [W * (0.1 + 0.6 * k) - 20, 0.455 * H], [-40, 0.465 * H]], '#9cff7a');
      fx.bloom = 0.4; fx.thr = 0.7;
    }
  });

  // ═════ 83.7 – 86.1 · the crucifix ══════════════════════════════════════════
  function crossCard(ctx, cam, o = {}) {
    const B = cardBoxes({ fanRot: o.fanRot || 0 });
    const P = EVA;
    const armDecal = (g, w, h) => { g.fillStyle = P.green[0]; g.fillRect(0, h * 0.62, w, h * 0.16); g.strokeStyle = '#2a1848'; g.lineWidth = 4; for (let x = w * 0.1; x < w; x += w * 0.16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h * 0.6); g.stroke(); } };
    for (const s of [-1, 1]) {
      B.push({ c: [s * 520, -392, 0], s: [700, 64, 56], col: P.purple, decal: armDecal });           // NVLink bridge: the outstretched arm
      B.push({ c: [s * 900, -330, 0], s: [70, 150, 60], col: P.dark });                              // the hanging hand (connector)
    }
    drawBoxes(ctx, B, cam, { line: '#1a1024', lw: 3, light: [0.45, 0.55, 0.7] });
  }
  function barsBg(ctx, T, dx = 0) { ctx.drawImage(ART.bars, -200 + dx - (T - 83.7) * 20, -60, 1840, 1200); }
  CUT(2511, 2533, 'cross_close', (ctx, t, fx, T) => {
    const f = Math.round(T * 30);
    const st = f < 2514 ? 0 : f < 2519 ? 1 : f < 2524 ? 2 : f < 2529 ? 3 : 4;
    barsBg(ctx, T);
    const sc = [4.4, 3.7, 3.1, 2.6, 2.2][st];
    const cam = aimCam(0.08 * (st % 2 ? -1 : 1), -0.16, 0, sc, 0, -380, 720, [560, 600, 620, 640, 660][st]);
    crossCard(ctx, cam, { fanRot: T * 0.6 });
    if (f < 2514) {   // the green slash still crossing the frame
      fillPts(ctx, [[-40, 0.72 * H], [W * 0.62, 0.66 * H], [W * 0.58, 0.8 * H], [-40, 0.9 * H]], '#46f24a');
      fillPts(ctx, [[-40, 0.93 * H], [W * 0.4, 0.9 * H], [W * 0.38, 0.95 * H], [-40, 0.99 * H]], '#9cff7a');
    }
  });
  CUT(2533, 2553, 'cross_full', (ctx, t, fx, T) => {
    const f = Math.round(T * 30);
    const st = f < 2538 ? 0 : f < 2543 ? 1 : f < 2548 ? 2 : 3;
    barsBg(ctx, T);
    const sc = [1.55, 1.3, 1.12, 0.98][st];
    crossCard(ctx, aimCam(0, -0.08, 0, sc, 0, -150, 720, 470), { fanRot: T * 0.6 });
  });
  CUT(2553, 2583, 'cross_pilot', (ctx, t, fx, T) => {
    barsBg(ctx, T);
    crossCard(ctx, aimCam(0, -0.08, 0, 0.95 - t * 0.03, 0, -150, 720, 470), { fanRot: T * 0.6 });
    // the pilot superimposed: the Transformer, full figure, then its crown in close-up
    clearL();
    if (T < fr(2575)) drawTransformer(LG, { yaw: 0.0, pitch: 0.02, roll: 0, cx: 720, cy: 620, f: 1700, dist: 2400, scale: 1.45 + t * 0.05 }, { light: [0.5, 0.45, 0.75] });
    else drawTransformer(LG, { yaw: -0.1, pitch: 0.08, roll: 0.06, cx: 740, cy: 1500, f: 1700, dist: 2400, scale: 4.0 }, { light: [0.5, 0.45, 0.75] });
    const a = T < fr(2575) ? 0.62 * seg(T, fr(2553), fr(2568)) : 0.58;
    withAlpha(ctx, a, () => ctx.drawImage(LAYER, 0, 0));
  });

  // ═════ 86.1 – 88.2 · "shounen yo shinwa ni nare" ════════════════════════════
  const skyBg = (ctx, T, dx = 0, dy = 0) => ctx.drawImage(ART.sky, -600 + dx + (T - 86.1) * 20, -260 + dy, 2600, 1500);
  const clouds = (ctx, T, a = 0.3) => withAlpha(ctx, a, () => { ctx.globalCompositeOperation = 'screen'; ctx.drawImage(ART.skyOver, -400 + (T - 86.1) * 40, 0, 2000, 1200); });
  CUT(2583, 2599, 'tf_sky_tilt', (ctx, t, fx, T) => {
    skyBg(ctx, T, -200, 100);
    drawTransformer(ctx, { yaw: 0.62, pitch: -0.2, roll: 0.24, cx: 860 - t * 30, cy: 1180, f: 1700, dist: 2400, scale: 3.4 }, { light: [0.8, 0.45, 0.4] });
    clouds(ctx, T, 0.22);
  });
  CUT(2599, 2618, 'tf_sky_front', (ctx, t, fx, T) => {
    skyBg(ctx, T);
    drawTransformer(ctx, { yaw: -0.06, pitch: 0.06, roll: 0, cx: 720, cy: 1260, f: 1700, dist: 2400, scale: 3.1 + t * 0.12 }, { light: [0.8, 0.45, 0.4] });
    clouds(ctx, T, 0.2);
  });
  CUT(2618, 2628, 'tf_teal_strain', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#06343a'], [0.5, '#1a7a7a'], [1, '#4ab4a4']], 9, 46);
    const f = Math.round(T * 30), j = (hash1(f * 13) - 0.5) * 10;
    drawTransformer(ctx, { yaw: 0.75, pitch: 0.12, roll: -0.34, cx: 700 + j, cy: 1150, f: 1700, dist: 2400, scale: 3.3 }, { light: [0.5, 0.6, 0.6], tint: (c) => c.map((x) => mixHex(x, '#2a9a94', 0.4)) });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(200,255,240,0.45)'; ctx.lineWidth = 4;
    for (let i = 0; i < 9; i++) { const y = 120 + i * 105; ctx.beginPath(); ctx.moveTo(1440, y); ctx.lineTo(1100 - (i % 3) * 120, y + 40); ctx.stroke(); }
    ctx.restore();
  });
  CUT(2628, 2633, 'black', (ctx) => fill(ctx, '#000'));
  CUT(2633, 2636, 'fade_up', (ctx, t, fx, T) => {
    fill(ctx, '#05070c');
    withAlpha(ctx, 0.28, () => drawTransformer(ctx, { yaw: 0.3, pitch: 0.1, roll: 0.1, cx: 640, cy: 1100, f: 1700, dist: 2400, scale: 3.0 }, { silhouette: '#5a6a8a' }));
  });
  const BOKEH = (() => { const R = rngFor(201), a = []; for (let i = 0; i < 26; i++) a.push([R() * W, R() * H, 40 + R() * 110, R()]); return a; })();
  CUT(2636, 2646, 'tf_smile', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#1e6a3a'], [0.5, '#4aa860'], [1, '#9ad88a']], 8, 47);
    for (const [x, y, r, q] of BOKEH) circle(ctx, x - t * 30, y, r, q < 0.4 ? 'rgba(200,255,170,0.35)' : q < 0.75 ? 'rgba(150,230,140,0.3)' : 'rgba(240,255,200,0.4)');
    const cam = { yaw: 0.04, pitch: 0.06, roll: -0.04, cx: 720, cy: 1240, f: 1700, dist: 2400, scale: 3.1 };
    drawTransformer(ctx, cam, { light: [0.6, 0.5, 0.6], tint: (c) => c.map((x) => mixHex(x, '#ffd890', 0.15)) });
    ctx.strokeStyle = '#2a2030'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    for (const u of [-90, 90]) { const p = v3proj([u, -520, -26], cam); ctx.beginPath(); ctx.moveTo(p[0] - 56, p[1] + 10); ctx.quadraticCurveTo(p[0], p[1] - 30, p[0] + 56, p[1] + 10); ctx.stroke(); }
  });

  // ═════ 88.2 – 90.5 · 製作 on red ═══════════════════════════════════════════
  function scrawl(ctx, T) {
    ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#4a0604';
    ctx.font = `400 520px "Zen Kurenaido"`; ctx.textBaseline = 'alphabetic';
    const d = (T - 88.2) * 6;
    ctx.fillText('∂ℒ', 40 - d, 470); ctx.fillText('∇θ', 760 + d * 0.5, 440);
    ctx.font = `400 400px "Zen Kurenaido"`; ctx.fillText('Σ', 110, 1040 + d * 0.3); ctx.fillText('ηg', 820 - d * 0.4, 1060);
    ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.45;
    for (const [x, y, r] of [[420, 360, 60], [1050, 760, 80], [300, 820, 50], [1250, 300, 40]]) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(30,0,0,0.9)'); g.addColorStop(1, 'rgba(30,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); }
    ctx.restore();
  }
  CUT(2646, 2715, 'produced', (ctx, t, fx, T) => {
    ctx.drawImage(ART.redWall, -80, -60, 1600, 1200);
    scrawl(ctx, T);
    const a = cAlpha(T, 88.24, 90.6, 3, 0);
    if (a > 0) withAlpha(ctx, a, () => {
      mincho(ctx, '製作', 0.262 * W, 0.49 * H, 0.068 * H, { sx: 0.9 });
      // mark 1: a ring with a notch (original), then テンソル東京
      const mx = 0.487 * W, my = 0.392 * H, r = 0.037 * H;
      ctx.strokeStyle = CW; ctx.lineWidth = r * 0.42; ctx.beginPath(); ctx.arc(mx, my, r, -Math.PI * 0.35, Math.PI * 1.45); ctx.stroke();
      ctx.save(); ctx.font = `700 ${0.022 * H}px "Noto Sans CJK JP"`; ctx.fillStyle = CW; ctx.textAlign = 'center'; ctx.fillText('テンソル', mx, my + r + 0.035 * H); ctx.restore();
      ctx.save(); ctx.font = `700 ${0.056 * H}px "Noto Sans CJK JP"`; ctx.fillStyle = CW; ctx.translate(0.53 * W, 0.415 * H); ctx.scale(0.92, 1); ctx.fillText('テンソル東京', 0, 0); ctx.restore();
      // mark 2: NAS (in this world: Neural Architecture Search)
      ctx.save(); ctx.font = `italic 700 ${0.1 * H}px ${GROT}`; ctx.fillStyle = CW; ctx.translate(0.462 * W, 0.645 * H); ctx.scale(1.02, 1); ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = CW; ctx.strokeText('NAS', 0, 0); ctx.fillText('NAS', 0, 0); ctx.restore();
    });
    const fo = seg(T, 90.1, 90.5);
    if (fo > 0) { fx.flash = fo * 0.9; fx.flashCol = [0, 0, 0]; }
  });
})();
