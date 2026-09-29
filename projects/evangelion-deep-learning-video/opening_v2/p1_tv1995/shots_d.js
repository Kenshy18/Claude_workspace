// ─────────────────────────────────────────────────────────────────────────────
//  p1_tv1995 · shots 26–35a (66.8 – 78.07 s): the chorus montage, first half.
//  Cut points are frame numbers (30 fps) taken from the detected cuts of the
//  real OP; every cut lands on the same frame as the original.
// ─────────────────────────────────────────────────────────────────────────────
const CHORUS = {};
(() => {
  const fr = (n) => n / 30;
  const CUT = (a, b, name, fn) => SHOT(fr(a), fr(b), name, fn);
  const LAYER = mkCanvas(W, H), LG = LAYER.getContext('2d');
  const clearL = () => { LG.setTransform(1, 0, 0, 1, 0, 0); LG.globalAlpha = 1; LG.globalCompositeOperation = 'source-over'; LG.clearRect(0, 0, W, H); };
  const bands = (ctx, stops, n = 9, seed = 3, wav = 6) => bandSky(ctx, 0, 0, W, H, stops, n, seed, wav);

  // ── text cards: bold grotesk, sized by cap height ─────────────────────────
  let CAPK = 0;
  function capWord(ctx, str, x, base, capH, o = {}) {
    if (!CAPK) { ctx.save(); ctx.font = `700 100px ${GROT}`; CAPK = ctx.measureText('H').actualBoundingBoxAscent / 100; ctx.restore(); }
    const size = capH / CAPK;
    ctx.save(); ctx.font = `700 ${size}px ${GROT}`; ctx.textBaseline = 'alphabetic';
    const w = ctx.measureText(str).width;
    const sx = o.w ? o.w / w : (o.sx ?? 1);
    ctx.translate(x, base); ctx.scale(sx, 1);
    ctx.textAlign = o.align || 'center'; ctx.fillStyle = o.color || '#ffffff';
    ctx.fillText(str, 0, 0); ctx.restore();
    return w * sx;
  }
  CHORUS.capWord = capWord;
  function wordCard(ctx, lines, o = {}) {
    fill(ctx, o.bg || '#000');
    for (const [str, cx, base, capH, w] of lines) capWord(ctx, str, cx * W, base * H, capH * H, { w: w * W, color: o.color });
  }
  CHORUS.wordCard = wordCard;

  // ── camera that puts card-space point (ux,uy) at screen (sx,sy) ────────────
  function aimCam(yaw, pitch, roll, scale, ux, uy, sx, sy, o = {}) {
    const f = o.f || 1500, dist = o.dist || 1500;
    const q = v3rot([ux, uy, o.uz || 0], yaw, pitch, roll);
    const k = f / (q[2] + dist) * scale;
    return { yaw, pitch, roll, f, dist, scale, cx: sx - q[0] * k, cy: sy - q[1] * k };
  }
  CHORUS.aimCam = aimCam;
  // front-face point of the card (decal coords u,v in 0..1) → screen
  const cardPt = (cam, u, v) => v3proj([-150 + u * 300, -420 + v * 840, -56], cam);
  CHORUS.cardPt = cardPt;
  function eyeGlow(ctx, cam, a, o = {}) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
    for (const u of [0.31, 0.69]) {
      const p = cardPt(cam, u, 0.072), q = cardPt(cam, u + 0.1, 0.072);
      const r = Math.hypot(q[0] - p[0], q[1] - p[1]) * (o.k || 1.6);
      fillPts(ctx, [[p[0] - r, p[1]], [p[0], p[1] - r * 0.28], [p[0] + r, p[1]], [p[0], p[1] + r * 0.28]], o.col || 'rgba(255,255,240,0.95)');
      const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 1.4);
      g.addColorStop(0, 'rgba(255,255,230,0.8)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g; ctx.fillRect(p[0] - r * 1.5, p[1] - r * 1.5, r * 3, r * 3);
    }
    ctx.restore();
  }
  CHORUS.eyeGlow = eyeGlow;

  // ── painted debris shards flying out of the frame centre (66.8) ───────────
  function shards(ctx, t, n, seed, cols) {
    const R = rngFor(seed);
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, v = 500 + R() * 900, d0 = 60 + R() * 300, s = 18 + R() * 60, rot = R() * 6;
      const d = d0 + v * t, x = W * 0.62 + Math.cos(a) * d, y = H * 0.55 + Math.sin(a) * d * 0.8;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot + t * 3 * (R() - 0.5));
      fillPts(ctx, [[-s, -s * 0.3], [s * 0.6, -s * 0.5], [s, s * 0.4], [-s * 0.4, s * 0.6]], cols[i % cols.length]);
      ctx.restore();
    }
  }

  // ── purple hand (Unit-01's): silhouette + one hard shadow tone ────────────
  function purpleHand(ctx, x, y, s, a, pinch) {
    clearL();
    for (const [dx, dy] of [[-5, 0], [5, 0], [0, -5], [0, 5], [4, 4], [-4, -4], [4, -4], [-4, 4]]) silHand(LG, x + dx, y + dy, s, a, pinch, '#1c0c2c');
    silHand(LG, x, y, s, a, pinch, '#8d5ecb');
    LG.globalCompositeOperation = 'source-atop';
    LG.fillStyle = '#5b3b96';
    LG.save(); LG.translate(x, y); LG.rotate(a); LG.fillRect(-1500, 8 * s, 2200, 400); LG.restore();
    // armour joints: green knuckle plates and orange markers
    LG.save(); LG.translate(x, y); LG.rotate(a); LG.scale(s, s);
    for (const [px, py] of [[250, -44], [270, -12], [262, 16], [236, 42]]) { LG.fillStyle = '#9cf252'; LG.fillRect(px - 8, py - 10, 16, 20); }
    circle(LG, 90, 0, 22, '#ff9c3a'); ringS(LG, 90, 0, 22, '#1c0c2c', 5);
    LG.restore();
    LG.globalCompositeOperation = 'source-over';
    ctx.drawImage(LAYER, 0, 0);
  }

  // ═════ 66.8 – 70.5 · "zankoku na tenshi no teeze" ═══════════════════════════
  CUT(2004, 2016, 'c_head_splash', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#d8eefa'], [0.45, '#8ccaf0'], [1, '#3b7fd0']], 8, 11);
    shards(ctx, t, 26, 31, ['#ffffff', '#cfe8fa', '#9fd0f0', '#ffffff']);
    const cam = aimCam(-0.55, 0.32, -0.62, 3.4, 0, -300, 640 - t * 40, 420);
    drawCard(ctx, cam, { fanRot: T * 0.8, eyes: 0 });
  });
  CUT(2016, 2020, 'c_torso', (ctx, t, fx, T) => {
    fill(ctx, '#2a1a4a');
    drawCard(ctx, aimCam(0.42, -0.1, 0.3, 3.0, 0, -80, 760, 560), { fanRot: T * 0.8, eyes: 0 });
  });
  CUT(2020, 2030, 'c_eyes', (ctx, t, fx, T) => {
    fill(ctx, '#0c0616');
    const cam = aimCam(0.0, 0.18, 0.0, 4.6 + t * 0.6, 0, -350, 720, 560);
    drawCard(ctx, cam, { eyes: 0, fanRot: T });
    const on = seg(T, fr(2021), fr(2022));
    if (on > 0) { eyeGlow(ctx, cam, on, { k: 1.9 }); fx.bloom = 0.8; fx.thr = 0.6; }
  });
  CUT(2030, 2042, 'c_hand', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#eef2f4'], [1, '#b8c6d4']], 6, 12);
    // the red launch-gantry structures on the right
    fillPts(ctx, [[1180, 0], [1440, 0], [1440, 1080], [1260, 1080]], '#c8321e');
    fillPts(ctx, [[1180, 0], [1230, 0], [1300, 1080], [1260, 1080]], '#8a1c10');
    for (const y of [180, 480, 780]) { ctx.fillStyle = '#f2f0ea'; ctx.fillRect(1330, y, 36, 120); ctx.fillRect(1330, y + 140, 36, 36); }
    const k = E.outCubic(seg(t, 0, 0.4));
    purpleHand(ctx, lerp(-60, 60, k), lerp(1260, 1120, k), 2.3, -0.62, 0.05);
  });
  CUT(2042, 2046, 'card_pretrained', (ctx) => wordCard(ctx, [['PRE-TRAINED', 0.5, 0.62, 0.23, 0.84]]));
  CUT(2046, 2057, 'c_back_bay', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#7890b0'], [0.6, '#3a4868'], [1, '#1c2238']], 7, 13);
    // cage bars
    for (const x of [120, 330, 1110, 1320]) { ctx.fillStyle = '#141828'; ctx.fillRect(x, 0, 70, H); ctx.fillStyle = '#4a5878'; ctx.fillRect(x, 0, 12, H); }
    fillPts(ctx, [[0, 880], [1440, 840], [1440, 1080], [0, 1080]], '#b02418');
    const cam = aimCam(Math.PI + 0.18, 0.22, 0.03, 1.9, 0, -150, 720, 520);
    drawCard(ctx, cam, {});
    // power lines crossing in front
    ctx.lineCap = 'round';
    for (const [y0, y1, c, w] of [[300, 360, '#101014', 16], [420, 400, '#d81810', 12], [640, 700, '#101014', 10]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(-20, y0); ctx.quadraticCurveTo(720, (y0 + y1) / 2 + 60, 1460, y1); ctx.stroke(); }
  });
  CUT(2057, 2061, 'card_gpu01', (ctx) => wordCard(ctx, [['GPU-01', 0.5, 0.78, 0.53, 0.8]]));
  CUT(2061, 2065, 'c_close_a', (ctx, t, fx, T) => {
    fill(ctx, '#7cf04a');
    drawCard(ctx, aimCam(0.9, 0.2, -0.9, 3.8, 0, 120, 720, 540), { fanRot: T });
  });
  CUT(2065, 2070, 'c_close_sky', (ctx, t, fx, T) => {
    ctx.drawImage(ART.sky, -900, -300, 2600, 1500);
    drawCard(ctx, aimCam(-0.35, 0.3, 0.45, 3.2, 0, -330, 620, 480), { fanRot: T, eyes: 0 });
  });
  CUT(2070, 2075, 'c_close_orange', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#ff7a2a'], [1, '#c8200c']], 6, 14);
    drawCard(ctx, aimCam(0.25, 0.1, -0.25, 3.6, 0, -330, 740, 520), { fanRot: T, eyes: 0 });
  });
  CUT(2075, 2082, 'c_dark', (ctx, t, fx, T) => {
    fill(ctx, '#0e0c22');
    const cam = aimCam(-0.6, 0.05, 0.2, 2.8, 0, -150, 700 + t * 60, 560);
    drawCard(ctx, cam, { silhouette: '#1a1638' });
    // rim light on the right edges only
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5;
    drawCard(ctx, { ...cam, cx: cam.cx + 6 }, { silhouette: '#2a2458' }); ctx.restore();
    drawCard(ctx, { ...cam, cx: cam.cx - 4 }, { silhouette: '#0b0a1a' });
  });
  CUT(2082, 2086, 'c_crouch', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#f0e8f6'], [1, '#c8b8e0']], 6, 15);
    fillPts(ctx, [[1100, 0], [1440, 0], [1440, 1080]], '#7cf04a');
    drawCard(ctx, aimCam(0.5, -0.3, 0.55, 1.35, 0, 0, 700, 600), { fanRot: T });
  });

  // 69.53 · the Angel's mask → NaN: two empty zeros and a slash (0/0)
  function nanMask(ctx, T) {
    fill(ctx, '#062414');
    ctx.save(); ctx.translate(730, 560);
    const outline = () => { ctx.beginPath(); ctx.moveTo(0, -470); ctx.bezierCurveTo(330, -470, 430, -210, 400, 20); ctx.bezierCurveTo(380, 250, 200, 360, 40, 470); ctx.lineTo(0, 540); ctx.lineTo(-40, 470); ctx.bezierCurveTo(-200, 360, -380, 250, -400, 20); ctx.bezierCurveTo(-430, -210, -330, -470, 0, -470); ctx.closePath(); };
    outline(); ctx.fillStyle = '#f6f2ea'; ctx.fill();
    ctx.save(); outline(); ctx.clip();
    // brown hatched shadow on the left
    ctx.fillStyle = '#8a6a50'; ctx.beginPath(); ctx.moveTo(-460, -500); ctx.lineTo(-120, -500); ctx.bezierCurveTo(-260, -100, -200, 200, -60, 560); ctx.lineTo(-460, 560); ctx.fill();
    ctx.strokeStyle = '#5a4030'; ctx.lineWidth = 2;
    const R = rngFor(71);
    for (let i = 0; i < 90; i++) { const y = -460 + i * 11, x = -420 + R() * 40; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 160 + R() * 120, y + 30 + R() * 20); ctx.stroke(); }
    // the slash: a crack running between the two zeros
    ctx.strokeStyle = '#1a0a08'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(150, -470); ctx.lineTo(90, -250); ctx.lineTo(40, -10); ctx.lineTo(-20, 230); ctx.lineTo(-70, 520); ctx.stroke();
    ctx.strokeStyle = '#b8141a'; ctx.lineWidth = 3;
    for (const [x0, y0, x1, y1] of [[210, -60, 320, 80], [230, 40, 300, 220], [250, 120, 380, 180], [180, 200, 260, 330]]) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo((x0 + x1) / 2 + 12, (y0 + y1) / 2 - 8); ctx.lineTo(x1, y1); ctx.stroke(); }
    ctx.restore();
    ctx.lineWidth = 8; ctx.strokeStyle = '#1a1410'; outline(); ctx.stroke();
    // the two zeros (eye holes)
    for (const x of [-190, 190]) { ctx.save(); ctx.translate(x, -60); ctx.rotate(x < 0 ? 0.08 : -0.08); ctx.beginPath(); ctx.ellipse(0, 0, 118, 150, 0, 0, Math.PI * 2); ctx.fillStyle = '#050403'; ctx.fill(); ctx.restore(); }
    ctx.restore();
  }
  CUT(2086, 2092, 'nan_mask', (ctx, t, fx, T) => nanMask(ctx, T));
  CUT(2092, 2098, 'red_fog', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#6a0a10'], [0.5, '#c8202a'], [1, '#f07060']], 10, 16, 14);
    const cam = aimCam(0, -0.05, 0, 0.9, 0, 0, 720, 520 - t * 20);
    ctx.save(); ctx.globalAlpha = 0.35; drawCard(ctx, { ...cam, cx: cam.cx - 10 }, { silhouette: '#6a0810' }); drawCard(ctx, { ...cam, cx: cam.cx + 10 }, { silhouette: '#6a0810' }); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.55; drawCard(ctx, cam, { silhouette: '#4a0408' }); ctx.restore();
    ctx.fillStyle = 'rgba(240,110,100,0.35)'; ctx.fillRect(0, 640, W, 440);
  });
  // 69.93 · the red core (the S² organ) → the minimum: a red sphere engraved with loss contours
  function redCore(ctx, T) {
    fill(ctx, '#140002');
    const cx = 720, cy = 540, r = 470;
    const g = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.3); g.addColorStop(0, 'rgba(255,40,30,0.7)'); g.addColorStop(1, 'rgba(120,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    circle(ctx, cx, cy, r, '#e0303a');
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    circle(ctx, cx - 60, cy - 50, r * 0.86, '#f25a60');
    ctx.strokeStyle = 'rgba(255,200,200,0.55)'; ctx.lineWidth = 3;
    for (let k = 1; k < 9; k++) { ctx.beginPath(); ctx.ellipse(cx + 80, cy + 40, k * 58, k * 40, 0.4, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,230,230,0.8)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx - 300, cy - 260); ctx.lineTo(cx - 300, cy + 60); ctx.lineTo(cx + 80, cy + 60); ctx.stroke();
    circle(ctx, cx + 170, cy - 150, 26, '#ffe8e8'); circle(ctx, cx + 214, cy - 150, 20, '#ffe8e8');
    ctx.restore();
  }
  CUT(2098, 2105, 'red_core', (ctx, t, fx, T) => { redCore(ctx, T); fx.bloom = 0.5; fx.thr = 0.72; });
  // 70.17 · ATTENTION / TENSOR / FIELD, oversized initials like the original card
  function atfCard(ctx) {
    fill(ctx, '#000');
    const x0 = 0.035 * W;
    const wA = capWord(ctx, 'A', x0, 0.295 * H, 0.19 * H, { align: 'left', sx: 1.05 });
    capWord(ctx, 'TTENTION', x0 + wA + 0.004 * W, 0.295 * H, 0.098 * H, { align: 'left', w: 0.9 * W - x0 - wA });
    const wT = capWord(ctx, 'T', x0, 0.545 * H, 0.19 * H, { align: 'left', sx: 1.05 });
    capWord(ctx, 'ENSOR', x0 + wT + 0.004 * W, 0.545 * H, 0.098 * H, { align: 'left', w: 0.66 * W - x0 - wT });
    capWord(ctx, 'FIELD', x0, 0.915 * H, 0.235 * H, { align: 'left', w: 0.87 * W });
  }
  CHORUS.atfCard = atfCard;
  CUT(2105, 2112, 'card_atf', (ctx) => atfCard(ctx));
  CUT(2112, 2115, 'red_flash', (ctx, t, fx, T) => {
    fill(ctx, '#ec0c0c');
    ctx.save(); ctx.globalAlpha = 0.45; ctx.strokeStyle = '#7a0404'; ctx.lineWidth = 3;
    const B = transformerBoxes({ pal: Object.fromEntries(Object.keys(PAPER).map((k) => [k, ['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)']])) });
    B.forEach((b) => { b.decal = null; b.side = null; });
    drawBoxes(ctx, B, { yaw: 0.1, pitch: 0.02, cx: 740, cy: 640, f: 1700, dist: 2400, scale: 2.6 }, { line: '#8a0606', lw: 3 });
    ctx.restore();
  });

  // ═════ 70.5 – 72.37 · the moon, OUTLIERS, the city, US-EAST-1, the pyramid ═══
  function moon(ctx, cx, cy, r) {
    circle(ctx, cx, cy, r, '#dfe9f0');
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    const R = rngFor(81);
    for (let i = 0; i < 16; i++) { const a = -Math.PI * (0.1 + 0.8 * R()), d = r * (0.3 + 0.65 * R()); ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 60 + R() * 170, 30 + R() * 90, R() * 3, 0, Math.PI * 2); ctx.fillStyle = R() < 0.5 ? '#c9d6e2' : '#d3dee8'; ctx.fill(); }
    ctx.restore();
    // limb glow (the moon is a light source here)
    ringS(ctx, cx, cy, r + 10, 'rgba(160,220,255,0.35)', 26);
  }
  CUT(2115, 2137, 'moon', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#062234'], [0.5, '#0c3e5a'], [1, '#1a6a88']], 8, 17);
    const k = E.inOutSine(seg(t, 0, 0.73));
    ctx.save(); camPush(ctx, lerp(1.0, 1.45, k), 720, 420);
    moon(ctx, 720, 1560, 1320);
    perceptron(ctx, 720, 1180, 1.28, { eye: true, pal: { base: '#f4f6fb', shade: '#a8b8d4', line: '#2e3654', accent: '#e0402e', wire: '#2e3654' } });
    ctx.restore();
    fx.bloom = 0.25; fx.thr = 0.85;
  });
  CUT(2137, 2141, 'card_outliers', (ctx) => wordCard(ctx, [['OUTLIERS', 0.5, 0.665, 0.32, 0.86]]));

  // datacentre skyline: racks as towers, rising like the city's buildings
  function rackCity(ctx, T, pal, o = {}) {
    bands(ctx, pal.sky, 9, o.seed || 18, 10);
    if (pal.sun) circle(ctx, pal.sun[0], pal.sun[1], pal.sun[2], pal.sun[3]);
    const R = rngFor(o.seed || 91);
    const rows = [[640, 0.55, 0], [780, 0.85, 1], [1020, 1.35, 2]];
    for (const [base, sc, li] of rows) {
      let x = -60 + R() * 40;
      while (x < W + 60) {
        const w = (60 + R() * 70) * sc, h = (160 + R() * 320) * sc * (o.rise ? lerp(0.35, 1, clamp(o.rise * 1.6 - R() * 0.6)) : 1);
        ctx.fillStyle = pal.b[li]; ctx.fillRect(x, base - h, w, h + 500);
        ctx.fillStyle = pal.s[li]; ctx.fillRect(x + w * 0.72, base - h, w * 0.28, h + 500);
        // LED rows (status lights), only on the near rows
        if (li > 0) for (let yy = base - h + 16 * sc; yy < base - 10; yy += 26 * sc) { const on = R() < 0.55; if (on) { ctx.fillStyle = R() < 0.8 ? pal.led : '#ffb030'; ctx.fillRect(x + w * 0.14, yy, 5 * sc, 5 * sc); } }
        x += w + (6 + R() * 18) * sc;
      }
    }
    if (pal.haze) { ctx.fillStyle = pal.haze; ctx.fillRect(0, 560, W, 520); }
  }
  CHORUS.rackCity = rackCity;
  const DUSK = { sky: [[0, '#5a1030'], [0.35, '#b8301e'], [0.7, '#f07a2a'], [1, '#ffc060']], sun: [980, 560, 70, '#fff0b0'], b: ['#6a1c1c', '#3a0e10', '#1c0608'], s: ['#521414', '#2a080a', '#120304'], led: '#7cff9a', haze: 'rgba(255,120,60,0.12)' };
  CUT(2141, 2152, 'rack_city_dusk', (ctx, t, fx, T) => {
    ctx.save(); camPush(ctx, 1 + t * 0.06, 720, 700);
    rackCity(ctx, T, DUSK, { seed: 91, rise: seg(t, 0, 0.36) });
    ctx.restore();
  });
  CUT(2152, 2156, 'card_useast1', (ctx) => wordCard(ctx, [['US-EAST-1', 0.5, 0.67, 0.34, 0.9]]));
  // 71.87 · the pink pyramid HQ → a feature pyramid (FPN), glowing
  CUT(2156, 2167, 'pyramid', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#12020c'], [0.6, '#3a0a24'], [1, '#6a1238']], 7, 19);
    const cam = { yaw: 0.62 + t * 0.12, pitch: 0.36, roll: 0, cx: 720, cy: 640, f: 1500, dist: 2200, scale: 1.0 };
    const P = ['#ffb0d8', '#f0609e', '#a82462'];
    const B = [[900, 110, 0], [680, 110, -130], [460, 110, -260], [240, 110, -390]].map(([s, h, y]) => ({ c: [0, y, 0], s: [s, h, s], col: P }));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(720, 420, 20, 720, 420, 700); g.addColorStop(0, 'rgba(255,120,200,0.55)'); g.addColorStop(1, 'rgba(255,60,140,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    drawBoxes(ctx, B, cam, { line: '#ffe0f0', lw: 3, light: [0.3, 0.8, 0.4] });
    // lateral connections (the pyramid's top-down pathway) as light lines
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,200,240,0.8)'; ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) { const a = v3proj([0, -390 + i * 130 + 55, 0], cam), b = v3proj([0, -390 + (i + 1) * 130 - 55, 0], cam); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    ctx.restore();
    fx.bloom = 0.5; fx.thr = 0.7;
  });
  CUT(2167, 2171, 'grad_mark', (ctx) => { fill(ctx, '#000'); gradMark(ctx, 720, 480, 3.2, '#e0141a'); });

  // ═════ 72.37 – 74.83 · the staff roll-call ═════════════════════════════════
  // Fuyutsuki → Momentum (Polyak's heavy ball): an old grey ball with its trail
  CUT(2171, 2178, 'momentum', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#0e4a4c'], [0.6, '#2a8a80'], [1, '#62b8a4']], 9, 20);
    const vy = (x) => 830 + 0.00052 * (x - 980) ** 2;
    ctx.strokeStyle = '#0a2a2c'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); for (let x = -20; x <= W + 20; x += 20) (x < 0 ? ctx.moveTo(x, vy(x)) : ctx.lineTo(x, vy(x))); ctx.stroke();
    // previous iterates (ghost rings) down the slope
    for (let i = 3; i >= 1; i--) { const x = 520 - i * 150; ringS(ctx, x, vy(x) - 150, 150 - i * 10, `rgba(230,244,240,${0.5 - i * 0.12})`, 6); }
    const bx = 600 + t * 90, by = vy(bx) - 200;
    // speed lines
    ctx.strokeStyle = 'rgba(236,248,244,0.75)'; ctx.lineWidth = 7;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(bx - 240 - i * 30, by - 110 + i * 55); ctx.lineTo(bx - 620 - i * 30, by - 260 + i * 55); ctx.stroke(); }
    circle(ctx, bx, by, 200, '#c9ccd4');
    ctx.save(); ctx.beginPath(); ctx.arc(bx, by, 200, 0, Math.PI * 2); ctx.clip();
    circle(ctx, bx + 70, by + 70, 200, '#8a8e9e'); circle(ctx, bx - 70, by - 80, 70, '#eef0f4');
    ctx.restore(); ringS(ctx, bx, by, 200, '#1e2430', 8);
    fml(ctx, 'βv + ∇L', bx, by + 30, 84, { color: '#1e2430', align: 'center' });
  });
  // the map → Himmelblau's function, contoured (a real test landscape, 4 minima)
  let HIMMEL = null;
  function buildHimmel() {
    const nx = 160, ny = 120, f = (x, y) => (x * x + y - 11) ** 2 + (x + y * y - 7) ** 2;
    const G = []; for (let j = 0; j <= ny; j++) { const row = []; for (let i = 0; i <= nx; i++) row.push(Math.log(1 + f(-6 + 12 * i / nx, 4.5 - 9 * j / ny))); G.push(row); }
    const segs = [];
    for (let L = 0.6; L < 7.6; L += 0.42) {
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const v = [G[j][i], G[j][i + 1], G[j + 1][i + 1], G[j + 1][i]], P = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
        const pts = [];
        for (let e = 0; e < 4; e++) { const a = v[e], b = v[(e + 1) % 4]; if ((a < L) !== (b < L)) { const u = (L - a) / (b - a); pts.push([lerp(P[e][0], P[(e + 1) % 4][0], u), lerp(P[e][1], P[(e + 1) % 4][1], u)]); } }
        if (pts.length >= 2) segs.push([pts[0], pts[1], L]); if (pts.length === 4) segs.push([pts[2], pts[3], L]);
      }
    }
    const mins = [[3, 2], [-2.805118, 3.131312], [-3.77931, -3.283186], [3.584428, -1.848126]].map(([x, y]) => [(x + 6) / 12 * nx, (4.5 - y) / 9 * ny]);
    return { segs, nx, ny, mins };
  }
  CUT(2178, 2182, 'loss_map', (ctx, t, fx, T) => {
    if (!HIMMEL) HIMMEL = buildHimmel();
    fill(ctx, '#d9cde4');
    const sx = W / HIMMEL.nx, sy = H / HIMMEL.ny;
    ctx.save(); camPush(ctx, 1.08 + t * 0.2, 760, 520);
    ctx.lineWidth = 2; ctx.strokeStyle = '#6a4a8a'; ctx.beginPath();
    for (const [a, b] of HIMMEL.segs) { ctx.moveTo(a[0] * sx, a[1] * sy); ctx.lineTo(b[0] * sx, b[1] * sy); }
    ctx.stroke();
    ctx.strokeStyle = '#a0284a'; ctx.lineWidth = 5;
    for (const [x, y] of HIMMEL.mins) { const X = x * sx, Y = y * sy; ctx.beginPath(); ctx.moveTo(X - 16, Y - 16); ctx.lineTo(X + 16, Y + 16); ctx.moveTo(X + 16, Y - 16); ctx.lineTo(X - 16, Y + 16); ctx.stroke(); }
    ctx.restore();
  });
  // Hyuga → Dropout (p = 0.5): half the units crossed out
  const DROP = [[1, 0, 1, 1, 0, 1], [0, 1, 1, 0, 1, 0], [1, 0, 0, 1, 1, 0], [1, 1, 0, 1, 0, 1]];
  CUT(2182, 2190, 'dropout', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#0a3a6a'], [0.55, '#1c6c9c'], [1, '#48a8c4']], 9, 21);
    const X = (c) => 330 + c * 260 + t * 30, Y = (r) => 150 + r * 150;
    ctx.strokeStyle = 'rgba(240,248,255,0.8)'; ctx.lineWidth = 3;
    for (let c = 0; c < 3; c++) for (let r = 0; r < 6; r++) for (let q = 0; q < 6; q++) if (DROP[c][r] && DROP[c + 1][q]) { ctx.beginPath(); ctx.moveTo(X(c), Y(r)); ctx.lineTo(X(c + 1), Y(q)); ctx.stroke(); }
    for (let c = 0; c < 4; c++) for (let r = 0; r < 6; r++) {
      if (DROP[c][r]) { circle(ctx, X(c), Y(r), 46, '#f4f8fc'); ctx.save(); ctx.beginPath(); ctx.arc(X(c), Y(r), 46, 0, 7); ctx.clip(); circle(ctx, X(c) + 18, Y(r) + 18, 44, '#a8c4dc'); ctx.restore(); ringS(ctx, X(c), Y(r), 46, '#0c1c30', 5); }
      else { ctx.setLineDash([10, 8]); ringS(ctx, X(c), Y(r), 46, 'rgba(220,236,250,0.6)', 4); ctx.setLineDash([]); ctx.strokeStyle = '#e8303a'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(X(c) - 26, Y(r) - 26); ctx.lineTo(X(c) + 26, Y(r) + 26); ctx.moveTo(X(c) + 26, Y(r) - 26); ctx.lineTo(X(c) - 26, Y(r) + 26); ctx.stroke(); }
    }
  });
  // Aoba → ReLU: the hinge, extruded
  CUT(2190, 2198, 'relu', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#5a5470'], [0.6, '#8a84a0'], [1, '#b4aec4']], 9, 22);
    ctx.strokeStyle = 'rgba(30,28,44,0.5)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(100, 760); ctx.lineTo(1340, 760); ctx.moveTo(720, 1040); ctx.lineTo(720, 80); ctx.stroke();
    const pts = [[80, 740], [720, 740], [1280, 180 - t * 40]];
    const ext = [34, 26];
    ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
    ctx.strokeStyle = '#2c2440'; ctx.lineWidth = 96; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0] + ext[0], p[1] + ext[1]) : ctx.moveTo(p[0] + ext[0], p[1] + ext[1]))); ctx.stroke();
    ctx.strokeStyle = '#141020'; ctx.lineWidth = 104; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    ctx.strokeStyle = '#e8e4f2'; ctx.lineWidth = 88; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    ctx.strokeStyle = '#b4acc8'; ctx.lineWidth = 30; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0] + 20, p[1] + 22) : ctx.moveTo(p[0] + 20, p[1] + 22))); ctx.stroke();
    fml(ctx, 'max(0, x)', 330, 620, 92, { color: '#1a1628' });
  });
  // the protagonist in pink, eyes closed → open (73.27)
  CUT(2198, 2206, 'tf_pink', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#f6d0dc'], [0.5, '#f0a8c0'], [1, '#e080a0']], 8, 23);
    const PINK = (c) => c.map((x) => mixHex(x, '#f07a98', 0.35));
    const cam = { yaw: 0.05, pitch: 0.08, roll: 0, cx: 720, cy: 860, f: 1700, dist: 2400, scale: 2.8 };
    drawTransformer(ctx, cam, { tint: PINK, light: [0.5, 0.45, 0.75] });
    // eyes open: the Softmax crown catches the light
    if (T >= fr(2202)) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const [u, v] of [[-90, -535], [90, -535]]) { const p = v3proj([u, v, -26], cam); fillPts(ctx, [[p[0] - 60, p[1]], [p[0], p[1] - 14], [p[0] + 60, p[1]], [p[0], p[1] + 14]], 'rgba(255,255,255,0.9)'); }
      ctx.restore();
    } else {
      ctx.strokeStyle = '#3a2030'; ctx.lineWidth = 8;
      for (const u of [-90, 90]) { const p = v3proj([u, -535, -26], cam); ctx.beginPath(); ctx.moveTo(p[0] - 60, p[1]); ctx.quadraticCurveTo(p[0], p[1] + 16, p[0] + 60, p[1]); ctx.stroke(); }
    }
  });
  // the fleet carrier → a container ship (docker) under a blue sky
  CUT(2206, 2211, 'container_ship', (ctx, t, fx, T) => {
    ctx.drawImage(ART.sky, -300, -500, 2600, 1500);
    fillPts(ctx, [[0, 760], [1440, 700], [1440, 1080], [0, 1080]], '#18407c');
    ctx.save(); ctx.translate(-t * 60, 0);
    fillPts(ctx, [[120, 700], [1360, 660], [1300, 860], [220, 880]], '#8a93a6'); fillPts(ctx, [[120, 700], [1360, 660], [1350, 700], [130, 740]], '#c8ccd6');
    fillPts(ctx, [[220, 880], [1300, 860], [1290, 900], [240, 915]], '#2a2e3a');
    const C = ['#c8321e', '#2a64c8', '#e8a020', '#3a9a52', '#d8d8dc', '#7a3aa8'];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 11; c++) { if ((r === 3 && (c < 2 || c > 8)) || (r === 2 && c === 10)) continue; const x = 230 + c * 92, y = 690 - 12 * (c / 11) - r * 62 - 60; ctx.fillStyle = C[(c * 7 + r * 3) % 6]; ctx.fillRect(x, y, 88, 58); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 62, y, 26, 58); ctx.strokeStyle = '#1a1c24'; ctx.lineWidth = 3; ctx.strokeRect(x, y, 88, 58); }
    fillPts(ctx, [[1180, 660], [1280, 655], [1280, 420], [1200, 424]], '#e8eaf0'); fillPts(ctx, [[1240, 657], [1280, 655], [1280, 420], [1240, 422]], '#a8adbc');
    ctx.restore();
  });
  // Kaji → the GAN: the double agent, generator and discriminator back to back
  CUT(2211, 2220, 'gan', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#c86a18'], [0.5, '#eca030'], [1, '#f8d070']], 9, 24);
    const lab = (s, x, y, sz, c) => fml(ctx, s, x, y, sz, { color: c, align: 'center' });
    celRect(ctx, 250 - t * 20, 330, 400, 460, 30, '#f6e0c4', '#d8b48c', { line: '#2a1a10', lw: 7 });
    celRect(ctx, 790 + t * 20, 330, 400, 460, 30, '#4a2e22', '#2a1a14', { line: '#140a06', lw: 7, side: 'left' });
    grot(ctx, 'G', 450 - t * 20, 640, 260, { align: 'center', color: '#2a1a10', family: ROMAN });
    grot(ctx, 'D', 990 + t * 20, 640, 260, { align: 'center', color: '#f6c890', family: ROMAN });
    ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(660 - t * 20, 560); ctx.lineTo(780 + t * 20, 560); ctx.stroke();
    fillPts(ctx, [[780 + t * 20, 540], [800 + t * 20, 560], [780 + t * 20, 580]], '#2a1a10');
    lab('z', 150, 575, 80, '#2a1a10'); lab('x', 1300, 575, 80, '#2a1a10');
    lab('min_G max_D', 720, 960, 72, '#2a1a10');
  });
  CUT(2220, 2226, 'bell_teal', (ctx, t, fx, T) => { bellBeing(ctx, 700 + t * 40, 860, 1.3, '#2a8a86'); });
  // SEELE's sketch → eight heads' eyes in red line (h = 8)
  CUT(2226, 2230, 'eight_eyes', (ctx, t, fx, T) => {
    fill(ctx, '#050204');
    const R = rngFor(91);
    ctx.strokeStyle = '#d8141a'; ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const x = 260 + (i % 4) * 300 + (i >= 4 ? 150 : 0), y = i < 4 ? 330 : 700, s = 1 + (R() - 0.5) * 0.2;
      for (let pass = 0; pass < 2; pass++) {
        const j = () => (R() - 0.5) * 6;
        ctx.lineWidth = pass ? 2 : 3.5;
        ctx.beginPath(); ctx.moveTo(x - 120 * s + j(), y + j()); ctx.quadraticCurveTo(x + j(), y - 90 * s + j(), x + 120 * s + j(), y + j()); ctx.quadraticCurveTo(x + j(), y + 70 * s + j(), x - 120 * s + j(), y + j()); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + j() * 0.5, y + 2, 34 * s, 0, Math.PI * 2); ctx.stroke();
      }
      circle(ctx, x, y + 2, 12, '#d8141a');
    }
  });
  CUT(2230, 2236, 'commander_b', (ctx, t, fx, T) => commander(ctx, T, 0.15));
  // Keel → the old man with the visor: the scaling law (Chinchilla L(N), D = 1.4T) runs across it
  CUT(2236, 2240, 'visor', (ctx, t, fx, T) => {
    fill(ctx, '#1c1408');
    fillPts(ctx, [[180, 1080], [360, 820], [1080, 820], [1260, 1080]], '#4a4418'); fillPts(ctx, [[720, 820], [1080, 820], [1260, 1080], [720, 1080]], '#34300e');
    rrect(ctx, 460, 180, 520, 700, 200); ctx.fillStyle = '#3a2c1c'; ctx.fill();
    ctx.save(); rrect(ctx, 460, 180, 520, 700, 200); ctx.clip(); ctx.fillStyle = '#2a1e12'; ctx.fillRect(760, 160, 260, 760); ctx.restore();
    rrect(ctx, 380, 330, 680, 130, 30); ctx.fillStyle = '#b01810'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#160a06'; ctx.stroke();
    ctx.strokeStyle = '#ffb040'; ctx.lineWidth = 5; ctx.beginPath();
    for (let i = 0; i <= 60; i++) { const lN = 7 + 4 * i / 60, L = 1.69 + 406.4 / Math.pow(10, 0.34 * lN) + 410.7 / Math.pow(1.4e12, 0.28); const x = 410 + i / 60 * 620, y = 350 + (L - 1.8) / (2.8 - 1.8) * -90 + 90; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    for (const x of [470, 560, 880, 970]) { ctx.fillStyle = '#160a06'; ctx.fillRect(x, 340, 6, 110); }
  });
  // the document: 極秘 言語補完計画 第17次中間報告
  function documentPage(ctx) {
    fill(ctx, '#2a2a2e');
    ctx.save(); ctx.translate(720, 540); ctx.rotate(-0.012);
    ctx.fillStyle = '#f7f5ee'; ctx.fillRect(-640, -500, 1280, 1000);
    ctx.strokeStyle = '#141414'; ctx.lineWidth = 6; ctx.strokeRect(-600, -460, 1200, 920);
    ctx.lineWidth = 5; ctx.strokeRect(-150, -410, 300, 120);
    mincho(ctx, '極 秘', 0, -318, 86, { align: 'center', color: '#101010', sx: 1, embolden: 0.01 });
    mincho(ctx, '言語補完計画', 0, -60, 190, { align: 'center', color: '#101010', sx: 0.92, embolden: 0.012 });
    mincho(ctx, '計算資源統合戦略局 注意機構研究部', 0, 30, 40, { align: 'center', color: '#101010', sx: 0.9, weight: 700, embolden: 0 });
    mincho(ctx, '第17次中間報告', 0, 190, 120, { align: 'center', color: '#101010', sx: 0.9, embolden: 0.01 });
    mincho(ctx, 'arXiv:1706.03762 付属文書', 0, 300, 40, { align: 'center', color: '#101010', sx: 0.9, weight: 700, embolden: 0 });
    mincho(ctx, '第31回 NIPS (2017) 提出版', 0, 360, 40, { align: 'center', color: '#101010', sx: 0.9, weight: 700, embolden: 0 });
    mincho(ctx, '閲覧注意', 0, 420, 40, { align: 'center', color: '#101010', sx: 0.9, weight: 700, embolden: 0 });
    ctx.restore();
  }
  CUT(2240, 2245, 'document', (ctx) => documentPage(ctx));

  // ═════ 74.83 – 76.13 · the units ═══════════════════════════════════════════
  CUT(2245, 2248, 'tf_navy', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#0a2a4a'], [1, '#2a6a8a']], 6, 25);
    drawTransformer(ctx, { yaw: -0.25, pitch: 0.05, roll: 0.05, cx: 760, cy: 760, f: 1700, dist: 2400, scale: 2.5 }, { tint: (c) => c.map((x) => mixHex(x, '#1a3a6a', 0.62)), light: [0.6, 0.3, 0.7] });
  });
  CUT(2248, 2254, 'c_white', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#f8f6fa'], [1, '#d8d0e6']], 5, 26);
    drawCard(ctx, aimCam(-1.1, 0.3, 1.2, 3.4, 0, 250, 700, 560), { fanRot: T });
    fillPts(ctx, [[0, 860], [520, 1080], [0, 1080]], '#ff9c3a');
  });
  // Unit-00 → the Mark I Perceptron (1958): its single eye is the 20×20 photocell retina
  let RETINA = null;
  function buildRetina() {
    const c = mkCanvas(20, 20), g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 20, 20); g.fillStyle = '#fff'; g.font = `700 19px ${GROT}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('A', 10, 17);
    const d = g.getImageData(0, 0, 20, 20).data; const on = [];
    for (let i = 0; i < 400; i++) on.push(d[i * 4] > 110);
    return on;
  }
  function markOne(ctx, T, pal) {
    if (!RETINA) RETINA = buildRetina();
    fill(ctx, pal.bg);
    if (pal.bg2) fillPts(ctx, [[0, 700], [1440, 560], [1440, 1080], [0, 1080]], pal.bg2);
    // helmet housing
    ctx.save(); ctx.translate(720, 560);
    rrect(ctx, -430, -420, 860, 900, 180); ctx.fillStyle = pal.shell[0]; ctx.fill();
    ctx.save(); rrect(ctx, -430, -420, 860, 900, 180); ctx.clip(); ctx.fillStyle = pal.shell[1]; ctx.beginPath(); ctx.moveTo(160, -440); ctx.lineTo(460, -440); ctx.lineTo(460, 500); ctx.lineTo(60, 500); ctx.fill(); ctx.restore();
    rrect(ctx, -430, -420, 860, 900, 180); ctx.strokeStyle = '#0c0e18'; ctx.lineWidth = 8; ctx.stroke();
    // vent slots
    for (let i = 0; i < 5; i++) { ctx.fillStyle = pal.vent; ctx.fillRect(-300 + i * 130, 360, 70, 80); }
    // the lens: 20×20 photocells
    const r = 290;
    circle(ctx, 0, -30, r + 40, '#10121a');
    ctx.save(); ctx.beginPath(); ctx.arc(0, -30, r, 0, Math.PI * 2); ctx.clip();
    fill(ctx, '#061a0e');
    const cs = (2 * r) / 20;
    for (let i = 0; i < 20; i++) for (let j = 0; j < 20; j++) { ctx.fillStyle = RETINA[i * 20 + j] ? pal.lit : '#0e3a1e'; ctx.fillRect(-r + j * cs + 2, -30 - r + i * cs + 2, cs - 4, cs - 4); }
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(-110, -170, 120, 60, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ringS(ctx, 0, -30, r, '#2a2e3a', 10); ringS(ctx, 0, -30, r + 30, pal.shell[1], 8);
    ctx.restore();
  }
  CHORUS.markOne = markOne;
  const MK_BLUE = { bg: '#0c1a3a', bg2: '#1a2a58', shell: ['#3a62c8', '#233e8a'], vent: '#e8401c', lit: '#9cff7a' };
  CUT(2254, 2264, 'mark1', (ctx, t, fx, T) => { ctx.save(); camPush(ctx, 1 + t * 0.12, 720, 540); markOne(ctx, T, MK_BLUE); ctx.restore(); fx.bloom = 0.3; fx.thr = 0.8; });
  CUT(2264, 2267, 'card_mark1', (ctx) => wordCard(ctx, [['PROTOTYPE', 0.5, 0.33, 0.105, 0.56], ['MARK I', 0.5, 0.88, 0.45, 0.62]]));
  const RED_PAL = { purple: ['#e8402a', '#aa2216', '#701208'], green: ['#ffb84a', '#e27e1c', '#a44c10'], dark: EVA.dark, silver: EVA.silver, gold: EVA.gold, orange: EVA.orange };
  CUT(2267, 2279, 'type02', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#040814'], [0.6, '#0a1c3a'], [1, '#1c3a6a']], 8, 27);
    const k = seg(t, 0, 0.4);
    drawCard(ctx, aimCam(0.2 - k * 0.1, -0.28, 0.06, 1.55 + k * 0.2, 0, -120, 720, 520), { pal: RED_PAL, label: 'TYPE-02', fanRot: T });
    // the blade (progressive knife) held across
    fillPts(ctx, [[180, 820], [1250, 700], [1262, 722], [196, 850]], '#dfe4ee'); fillPts(ctx, [[180, 820], [1250, 700], [1254, 708], [184, 830]], '#ffffff');
  });
  CUT(2279, 2284, 'card_resnet50', (ctx) => wordCard(ctx, [['PRODUCTION', 0.5, 0.24, 0.115, 0.72], ['MODEL', 0.5, 0.385, 0.11, 0.32], ['RESNET-50', 0.5, 0.9, 0.42, 0.74]]));

  // ═════ 76.13 – 78.07 · the children, the classmates, the city ═══════════════
  CUT(2284, 2294, 'perceptron_plug', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#6a4a9a'], [0.5, '#c88a6a'], [1, '#f0b070']], 8, 28);
    fillPts(ctx, [[0, 1080], [0, 620], [260, 700], [300, 1080]], '#2a2440'); fillPts(ctx, [[1440, 1080], [1440, 620], [1180, 700], [1140, 1080]], '#2a2440');
    perceptron(ctx, 720, 1380, 1.55 + t * 0.1, { eye: true, pal: { base: '#fbf3ea', shade: '#e0b88a', line: '#3a2a3a', accent: '#e0402e', wire: '#3a2a3a' } });
  });
  // ResNet (He et al. 2016, Fig. 2) — the second child, red
  function resnetBeing(ctx, cx, cy, s, rot, o = {}) {
    const P = o.pal || { base: '#f2643a', shade: '#b83a22', line: '#2a0e0a', arc: '#ff9a3a', text: '#2a0e0a' };
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(s, s);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // identity arc (behind)
    ctx.strokeStyle = P.line; ctx.lineWidth = 56; ctx.beginPath(); ctx.moveTo(-60, -440); ctx.bezierCurveTo(420, -440, 420, 250, -10, 250); ctx.stroke();
    ctx.strokeStyle = P.arc; ctx.lineWidth = 40; ctx.stroke();
    if (o.gate) { celRect(ctx, 220, -140, 150, 110, 14, '#f6e27a', '#c8b040', { line: P.line, lw: 6 }); fml(ctx, 'T(x)', 295, -66, 44, { color: P.line, align: 'center' }); }
    ctx.strokeStyle = P.line; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(-60, -520); ctx.lineTo(-60, 400); ctx.stroke();
    celRect(ctx, -270, -370, 420, 160, 22, P.base, P.shade, { line: P.line, lw: 7 });
    celRect(ctx, -270, -60, 420, 160, 22, P.base, P.shade, { line: P.line, lw: 7 });
    ctx.save(); ctx.translate(-270, -370); paperLabel(ctx, 'weight layer', 420, 160, { color: P.text, size: 50 }); ctx.restore();
    ctx.save(); ctx.translate(-270, -60); paperLabel(ctx, 'weight layer', 420, 160, { color: P.text, size: 50 }); ctx.restore();
    grot(ctx, 'relu', -40, -118, 44, { color: P.text, family: GROT, weight: 400 });
    circle(ctx, -60, 250, 62, P.base); ringS(ctx, -60, 250, 62, P.line, 9);
    ctx.strokeStyle = P.line; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-100, 250); ctx.lineTo(-20, 250); ctx.moveTo(-60, 210); ctx.lineTo(-60, 290); ctx.stroke();
    fml(ctx, 'F(x)', -330, -120, 64, { color: P.text, align: 'right' });
    fml(ctx, 'x', 360, -300, 70, { color: P.text });
    fml(ctx, 'F(x) + x', -140, 380, 64, { color: P.text, align: 'right' });
    ctx.restore();
  }
  CHORUS.resnetBeing = resnetBeing;
  CUT(2294, 2304, 'resnet', (ctx, t, fx, T) => {
    const up = T >= fr(2299);
    bands(ctx, up ? [[0, '#a8200c'], [0.5, '#e8541c'], [1, '#ffa050']] : [[0, '#8a1c0c'], [1, '#d8501c']], 8, 29);
    if (!up) resnetBeing(ctx, 820, 700, 1.0, -0.42);
    else { resnetBeing(ctx, 700, 600, 1.2 + (T - fr(2299)) * 0.3, 0.12); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ringS(ctx, 700 - 60 * 1.2, 600 + 250 * 1.2, 110, 'rgba(255,220,120,0.6)', 18); ctx.restore(); }
  });
  // Toji → the SVM: arms crossed as the margin, black tracksuit on one side
  const PTS = (() => { const R = rngFor(111), a = []; for (let i = 0; i < 44; i++) { const cl = i % 2, g1 = gauss(R), g2 = gauss(R); a.push([cl, 720 + (cl ? 1 : -1) * 250 + g1 * 110 + g2 * 60, 540 + (cl ? 1 : -1) * 150 + g2 * 120 - g1 * 50]); } return a; })();
  CUT(2304, 2316, 'svm', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#f8d070'], [0.5, '#f09a3a'], [1, '#d8501c']], 9, 30);
    ctx.save(); camPush(ctx, 1 + t * 0.05);
    const ang = -0.52, nx = Math.sin(-ang), ny = Math.cos(-ang);
    const L = (off, w, col, dash) => { ctx.save(); ctx.translate(720 + nx * off, 540 + ny * off); ctx.rotate(ang); ctx.strokeStyle = col; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(-1200, 0); ctx.lineTo(1200, 0); ctx.stroke(); ctx.restore(); };
    ctx.save(); ctx.translate(720, 540); ctx.rotate(ang); ctx.fillStyle = 'rgba(255,240,200,0.35)'; ctx.fillRect(-1200, -110, 2400, 220); ctx.restore();
    L(-110, 5, '#3a1a08', [22, 14]); L(110, 5, '#3a1a08', [22, 14]); L(0, 16, '#1a0a04');
    for (const [cl, x, y] of PTS) { const d = (x - 720) * nx + (y - 540) * ny; const X = cl ? x + (d < 130 ? 130 - d : 0) * nx : x - (d > -130 ? d + 130 : 0) * nx, Y = cl ? y + (d < 130 ? 130 - d : 0) * ny : y - (d > -130 ? d + 130 : 0) * ny; circle(ctx, X, Y, 22, cl ? '#fbf6ee' : '#16120e'); ringS(ctx, X, Y, 22, '#1a0a04', 4); }
    for (const [x, y] of [[720 - nx * 132 - 260, 540 - ny * 132 - 150], [720 + nx * 132 + 200, 540 + ny * 132 + 120]]) ringS(ctx, x, y, 40, '#b01810', 6);
    ctx.restore();
  });
  // Kensuke → the decision tree
  CUT(2316, 2322, 'tree', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#fbeef2'], [1, '#e8b8c8']], 6, 31);
    const node = (x, y, lab, leaf) => { celRect(ctx, x - 130, y - 60, 260, 120, leaf ? 60 : 14, leaf ? '#9cd88a' : '#f8f4ec', leaf ? '#6aa860' : '#d8ccb8', { line: '#2a2030', lw: 6 }); fml(ctx, lab, x, y + 18, 52, { color: '#2a2030', align: 'center' }); };
    const E2 = (a, b) => { ctx.strokeStyle = '#2a2030'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(a[0], a[1] + 60); ctx.lineTo(b[0], b[1] - 60); ctx.stroke(); };
    const P = { r: [720, 200], a: [420, 520], b: [1020, 520], c: [260, 860], d: [580, 860], e: [880, 860], f: [1180, 860] };
    E2(P.r, P.a); E2(P.r, P.b); E2(P.a, P.c); E2(P.a, P.d); E2(P.b, P.e); E2(P.b, P.f);
    node(...P.r, 'x_1 ≤ θ_1'); node(...P.a, 'x_2 ≤ θ_2'); node(...P.b, 'x_3 ≤ θ_3');
    node(...P.c, 'A', 1); node(...P.d, 'B', 1); node(...P.e, 'A', 1); node(...P.f, 'C', 1);
  });
  // Hikari → k-means, k = 3: a face and two pigtails
  const KM = (() => { const R = rngFor(121), a = []; const C = [[720, 470, 190, 0], [330, 640, 110, 1], [1110, 640, 110, 2]]; for (const [x, y, s, k] of C) for (let i = 0; i < (k ? 26 : 46); i++) a.push([k, x + gauss(R) * s, y + gauss(R) * s * (k ? 1.4 : 0.9)]); return { a, C }; })();
  CUT(2322, 2330, 'kmeans', (ctx, t, fx, T) => {
    bands(ctx, [[0, '#f6c4d0'], [1, '#e890a8']], 7, 32);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4; ctx.setLineDash([14, 10]);
    ctx.beginPath(); ctx.moveTo(470, 0); ctx.lineTo(560, 1080); ctx.moveTo(970, 0); ctx.lineTo(880, 1080); ctx.stroke(); ctx.setLineDash([]);
    const col = ['#6a3a22', '#9a5a2e', '#b87a3e'];
    for (const [k, x, y] of KM.a) { circle(ctx, x, y, 17, col[k]); ringS(ctx, x, y, 17, '#2a1410', 3); }
    for (const [x, y] of KM.C) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 20; ctx.beginPath(); ctx.moveTo(x - 36, y - 36); ctx.lineTo(x + 36, y + 36); ctx.moveTo(x + 36, y - 36); ctx.lineTo(x - 36, y + 36); ctx.stroke(); ctx.strokeStyle = '#1a0a08'; ctx.lineWidth = 10; ctx.stroke(); }
  });
  const RED_CITY = { sky: [[0, '#3a0408'], [0.5, '#a8180e'], [1, '#f0602a']], b: ['#5a0c0c', '#300608', '#160204'], s: ['#420808', '#200406', '#0c0102'], led: '#ffb030' };
  CUT(2330, 2334, 'rack_city_red', (ctx, t, fx, T) => rackCity(ctx, T, RED_CITY, { seed: 131 }));
  CUT(2334, 2337, 'pink_blast', (ctx, t, fx, T) => {
    fill(ctx, '#f0a0c0');
    const R = rngFor(141);
    for (const [r, c] of [[900, '#f8c8dc'], [620, '#ff90c0'], [380, '#ffd8ec'], [180, '#ffffff']]) {
      ctx.beginPath(); for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI * 2, rr = r * (1 + (i % 2 ? 0.18 : -0.05) + (R() - 0.5) * 0.1) * (1 + t * 1.5); ctx.lineTo(620 + Math.cos(a) * rr, 520 + Math.sin(a) * rr * 0.8); } ctx.closePath(); ctx.fillStyle = c; ctx.fill();
    }
    fx.bloom = 0.6; fx.thr = 0.7;
  });
  CUT(2337, 2342, 'c_city_blast', (ctx, t, fx, T) => {
    rackCity(ctx, T, { sky: [[0, '#8ab8e8'], [1, '#e8f0f8']], b: ['#8a96b0', '#5a6680', '#303a50'], s: ['#6a7690', '#46506a', '#20283a'], led: '#7cff9a' }, { seed: 151 });
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const a of [0.8, -0.8]) { ctx.save(); ctx.translate(720, 560); ctx.rotate(a); const g = ctx.createLinearGradient(0, -90, 0, 90); g.addColorStop(0, 'rgba(255,220,80,0)'); g.addColorStop(0.5, 'rgba(255,250,200,1)'); g.addColorStop(1, 'rgba(255,220,80,0)'); ctx.fillStyle = g; ctx.fillRect(-900 * (0.4 + t * 4), -90, 1800 * (0.4 + t * 4), 180); ctx.restore(); }
    ctx.restore();
    drawCard(ctx, aimCam(0.15, -0.2, 0, 0.62, 0, 0, 720, 600), {});
    fx.bloom = 0.6; fx.thr = 0.7;
  });
})();
