// ─────────────────────────────────────────────────────────────────────────────
//  p1_tv1995 · shots 9–14 (23.4 – 50.8 s): blue sky verse, sunset B-melody.
// ─────────────────────────────────────────────────────────────────────────────
(() => {
  const LAYER = mkCanvas(W, H), LG = LAYER.getContext('2d');

  function sky(ctx, T, drift = 0) {
    const k = T - 23.4;
    ctx.drawImage(ART.sky, -420 + k * 9 + drift, -120 - k * 1.5, 2600, 1500);
  }
  // the being, double-exposed over the sky like the original's face
  function beingOverSky(ctx, T, cam, alpha, o = {}) {
    LG.setTransform(1, 0, 0, 1, 0, 0); LG.clearRect(0, 0, W, H);
    drawTransformer(LG, cam, { light: [0.8, 0.45, 0.4], ...o });
    withAlpha(ctx, alpha, () => ctx.drawImage(LAYER, 0, 0));
    // clouds drift across the being (screen)
    withAlpha(ctx, o.cloudA ?? 0.3, () => { ctx.globalCompositeOperation = 'screen'; ctx.drawImage(ART.skyOver, -500 + (T - 23.4) * 26, -40, 2000, 1200); });
  }
  function camAt(T) {
    // front → 3/4 → profile (25.0–26.4), then a slow push while the clouds pass
    const turn = E.inOutSine(seg(T, 25.0, 26.45));
    const yaw = lerp(-0.22, 0.86, turn) + seg(T, 26.45, 37.9) * 0.08;
    const push = 1 + seg(T, 24.3, 37.9) * 0.1;
    return { yaw, pitch: lerp(0.06, -0.02, turn), roll: lerp(0.0, -0.04, turn), cx: lerp(760, 560, turn), cy: lerp(640, 600, turn), f: 1700, dist: 2400, scale: 3.0 * push };
  }

  // ── 23.4–37.9 · sky, the being, credits ───────────────────────────────────
  SHOT(23.4, 37.9, 'sky_being', (ctx, t, fx, T) => {
    sky(ctx, T);
    const a = seg(T, 24.2, 25.2);
    if (a > 0) beingOverSky(ctx, T, camAt(T), 0.86 * a);
    // black cut-outs sliding in (older architectures standing around the protagonist)
    const s1 = E.outCubic(seg(T, 26.35, 26.9)) * (1 - seg(T, 29.9, 30.0));
    if (s1 > 0) silPerceptron(ctx, lerp(1620, 1230, s1), 1130, 1.25);
    const s2 = E.outCubic(seg(T, 29.95, 30.5)) * (1 - seg(T, 33.35, 33.45));
    if (s2 > 0) { silLSTM(ctx, lerp(-700, -330, s2), 640, 1.2); silCNN(ctx, lerp(1900, 1250, s2), 520, 1.05); }
    const s3 = E.outCubic(seg(T, 33.45, 33.9)) * (1 - seg(T, 36.0, 36.1));
    if (s3 > 0) { silLSTM(ctx, lerp(-800, -420, s3), 420, 1.5); silCNN(ctx, lerp(2100, 1560, s3), 260, 1.5); }
    // credits
    let c = cAlpha(T, 23.42, 26.2);
    if (c) {
      mincho(ctx, 'キャラクターデザイン', 745, 352, 64, { align: 'right', alpha: c, sx: 0.72 });
      mincho(ctx, 'サブワード', 836, 396, 132, { alpha: c, sx: 0.74 });
      mincho(ctx, 'メカニックデザイン', 745, 582, 64, { align: 'right', alpha: c, sx: 0.72 });
      mincho(ctx, '位置符号化', 836, 622, 132, { alpha: c, sx: 0.72 });
      mincho(ctx, '注意機構', 836, 812, 132, { alpha: c, sx: 0.78 });
    }
    c = cAlpha(T, 26.35, 29.85);
    if (c) {
      mincho(ctx, '副監督', 800, 822, 70, { align: 'right', alpha: c, sx: 0.8 });
      minchoSpaced(ctx, '残差接続', 948, 766, 130, 98, { alpha: c, sx: 0.8 });
      mincho(ctx, '層正規化', 900, 922, 134, { alpha: c, sx: 0.74 });
    }
    c = cAlpha(T, 29.95, 33.3);
    if (c) {
      mincho(ctx, '美術監督', 400, 160, 66, { align: 'right', alpha: c, sx: 0.8 });
      mincho(ctx, '潜在', 490, 182, 132, { alpha: c, sx: 0.78 }); mincho(ctx, '空間', 690, 182, 132, { alpha: c, sx: 0.78 });
      mincho(ctx, '色彩設定', 846, 956, 66, { align: 'right', alpha: c, sx: 0.8 });
      mincho(ctx, 'BGR順', 922, 992, 132, { alpha: c, sx: 0.74 });
    }
    c = cAlpha(T, 33.9, 35.95);
    if (c) {
      mincho(ctx, '撮影監督', 846, 194, 66, { align: 'right', alpha: c, sx: 0.8 });
      mincho(ctx, 'ImageNet', 916, 226, 132, { alpha: c, sx: 0.66 });
      mincho(ctx, '音響監督', 396, 846, 66, { align: 'right', alpha: c, sx: 0.8 });
      mincho(ctx, 'WaveNet', 466, 878, 132, { alpha: c, sx: 0.66 });
      mincho(ctx, '音響制作', 404, 958, 52, { align: 'right', alpha: c, sx: 0.8 });
      mincho(ctx, 'librosa', 450, 980, 96, { alpha: c, sx: 0.7 });
    }
  });
})();

// ── 37.9 – 50.8 · sunset: hand, SYSTEMA TRANSFORMATORVM, the guardian (LSTM) ──
(() => {
  const LAYER = mkCanvas(W, H), LG = LAYER.getContext('2d');
  const BLACK = Object.fromEntries(Object.keys(PAPER).map((k) => [k, ['#07060c', '#07060c', '#07060c']]));
  function sunset(ctx, T, dx = 0, dy = 0, s = 1) { ctx.drawImage(ART.sunset, -260 + dx - (T - 37.9) * 14, -200 + dy, 2000 * s, 1400 * s); }
  function sunDisc(ctx, x, y, r, col) { circle(ctx, x, y, r, col); }

  // ── the tree: Kabbalah layout re-drawn as the Transformer's computation graph ──
  const SEPH = {
    K: [0, -470, 'SOFTMAX', 'e^{z_i} / Σ e^{z_j}'], Ch: [220, -350, 'LINEARIS', 'xW^{T} + b'], B: [-220, -350, 'NORMA', '(x − μ) / σ'],
    Che: [220, -120, 'PROPAGATIO', 'max(0, xW_1)W_2'], G: [-220, -120, 'RESIDVVM', 'x + F(x)'], Ti: [0, -10, 'ATTENTIO', 'softmax(QK^{T}/√d_k)V'],
    N: [220, 150, 'CLAVIS', 'K = XW^{K}'], Ho: [-220, 150, 'QVAESITVM', 'Q = XW^{Q}'], Y: [0, 270, 'VALOR', 'V = XW^{V}'], M: [0, 480, 'EMBEDDING', '· √d_{model}'],
  };
  const PATHS = [['K', 'Ch'], ['K', 'B'], ['K', 'Ti'], ['Ch', 'B'], ['Ch', 'Ti'], ['B', 'Ti'], ['Ch', 'Che'], ['B', 'G'], ['Che', 'G'], ['Che', 'Ti'], ['G', 'Ti'],
    ['Che', 'N'], ['G', 'Ho'], ['Ti', 'N'], ['Ti', 'Ho'], ['Ti', 'Y'], ['N', 'Ho'], ['N', 'Y'], ['Ho', 'Y'], ['N', 'M'], ['Ho', 'M'], ['Y', 'M']];
  function tree(ctx, cx, cy, s, prog, col = '#7ff7b8') {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = 'round';
    const R = 74;
    // paths (double rails like the engraving) drawn progressively
    PATHS.forEach(([a, b], i) => {
      const p = clamp(prog * 1.6 - i / PATHS.length * 0.8); if (p <= 0) return;
      const [x1, y1] = SEPH[a], [x2, y2] = SEPH[b];
      const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L;
      const sx = x1 + ux * R, sy = y1 + uy * R, ex = sx + (x2 - x1 - 2 * ux * R) * p, ey = sy + (y2 - y1 - 2 * uy * R) * p;
      ctx.lineWidth = 2.4;
      for (const o of [-7, 7]) { ctx.beginPath(); ctx.moveTo(sx - uy * o, sy + ux * o); ctx.lineTo(ex - uy * o, ey + ux * o); ctx.stroke(); }
      // rungs along the rails
      ctx.lineWidth = 1;
      for (let k = 0.1; k < p; k += 0.08) { const qx = sx + (ex - sx) * k / p, qy = sy + (ey - sy) * k / p; ctx.beginPath(); ctx.moveTo(qx - uy * 7, qy + ux * 7); ctx.lineTo(qx + uy * 7, qy - ux * 7); ctx.stroke(); }
      // the 22 paths carry the 22 Greek letters of the optimiser's alphabet
      if (p > 0.55) {
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        ctx.fillStyle = 'rgba(8,40,24,0.55)'; ctx.fillRect(mx - 17, my - 15, 34, 30); ctx.fillStyle = col;
        ctx.lineWidth = 1.4; ctx.strokeRect(mx - 17, my - 15, 34, 30);
        ctx.font = `italic 400 22px ${ROMAN}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('αβγδεζηθικλμνξπρστυφχψ'[i], mx, my + 1);
      }
    });
    // sephiroth
    Object.entries(SEPH).forEach(([key, [x, y, nm, f]], i) => {
      const p = clamp(prog * 1.8 - i / 10 * 0.9); if (p <= 0) return;
      ctx.globalAlpha = p;
      ctx.fillStyle = 'rgba(8,40,24,0.35)'; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col;
      ctx.lineWidth = 2.4; ringS(ctx, x, y, R, col, 2.4); ctx.lineWidth = 1.2; ringS(ctx, x, y, R - 14, col, 1.2); ringS(ctx, x, y, R - 40, col, 1);
      // spokes between the rings (inscribed divisions)
      ctx.lineWidth = 1; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (R - 14), y + Math.sin(a) * (R - 14)); ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); ctx.stroke(); }
      ctx.font = `700 ${nm.length > 8 ? 15 : 17}px ${ROMAN}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(nm, x, y - 8);
      fml(ctx, f, x, y + 17, 12, { color: col, align: 'center' });
      // ring inscription: the node's name repeated
      ctx.font = `400 9px ${ROMAN}`; const str = (' ' + nm + ' ·').repeat(4); const chs = [...str];
      chs.forEach((ch, k) => { ctx.save(); ctx.translate(x, y); ctx.rotate(k / chs.length * Math.PI * 2); ctx.fillText(ch, 0, -(R - 7)); ctx.restore(); });
      ctx.globalAlpha = 1;
    });
    const pt = clamp(prog * 2 - 0.2);
    if (pt > 0) {
      ctx.globalAlpha = pt;
      // horizon of context: blue half-disc at the crown
      ctx.fillStyle = '#9fd8ff'; ctx.beginPath(); ctx.arc(0, -600, 44, Math.PI, 0); ctx.fill(); ctx.fillStyle = col;
      ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-60, -600); ctx.lineTo(60, -600); ctx.stroke();
      ctx.font = `400 26px ${ROMAN}`; ctx.textAlign = 'right'; ctx.fillText('HORIZON', -64, -598); ctx.textAlign = 'left'; ctx.fillText('CONTEXTVS', 64, -598);
      ctx.font = `400 34px ${ROMAN}`; ctx.textAlign = 'right'; ctx.fillText('SYSTEMA', -80, -420); ctx.textAlign = 'left'; ctx.fillText('TRANSFORMATORVM', 80, -420);
      ctx.font = `400 26px ${ROMAN}`; ctx.textAlign = 'right'; ctx.fillText('VI STRATO', -110, -384); ctx.textAlign = 'left'; ctx.fillText('RVM · VIII CAPITVM', 110, -384);
      // side tablets: the base model's published hyper-parameters
      const tab = (x, y, lines) => { ctx.lineWidth = 1.4; ctx.strokeRect(x, y, 210, 26 + lines.length * 22); ctx.strokeRect(x + 5, y + 5, 200, 16 + lines.length * 22);
        lines.forEach((l, i) => fml(ctx, l, x + 105, y + 34 + i * 22, 15, { color: col, align: 'center', italic: false })); };
      tab(-560, 20, ['d_{model} = 512', 'd_{ff} = 2048', 'h = 8', 'd_k = d_v = 64']);
      tab(350, 20, ['P_{drop} = 0.1', 'ε_{ls} = 0.1', 'warmup = 4000', 'β_2 = 0.98']);
      tab(-520, 330, ['BLEU EN–DE', 'base 27.3']);
      tab(310, 330, ['BLEU EN–DE', 'big 28.4']);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  SHOT(37.9, 41.6, 'hand_tree', (ctx, t, fx, T) => {
    sunset(ctx, T);
    // hand reaching in from the upper right, then pinching
    const k = E.outCubic(seg(T, 38.15, 39.0));
    const wx = lerp(1900, 1180, k) + seg(T, 39.0, 41.6) * -30, wy = lerp(-420, 170, k) + seg(T, 39.0, 41.6) * 20;
    silHand(ctx, wx, wy, 2.1, 2.36, E.inOutSine(seg(T, 38.7, 39.25)));
    // the green tree draws itself (39.3 →), camera pulls back from the crown
    if (T >= 39.3) {
      const p = seg(T, 39.3, 40.9);
      const z = lerp(1.9, 0.98, E.inOutSine(seg(T, 39.5, 41.0)));
      const cy = lerp(1180, 600, E.inOutSine(seg(T, 39.5, 41.0))) - seg(T, 41.3, 41.6) * 140;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      tree(ctx, lerp(900, 720, E.inOutSine(seg(T, 39.5, 41.0))), cy, z, p, '#2fb86e');
      ctx.restore();
      tree(ctx, lerp(900, 720, E.inOutSine(seg(T, 39.5, 41.0))), cy, z, p);
      fx.bloom = 0.25; fx.thr = 0.7;
    }
  });

  function lstmCam(T, a, b) {
    const k = seg(T, a, b);
    return { yaw: -0.46 + k * 0.05, pitch: -0.14, roll: 0.02, cx: 560 - k * 30, cy: 600, f: 1700, dist: 2400, scale: lerp(3.0, 3.35, k) };
  }
  SHOT(41.6, 48.4, 'guardian', (ctx, t, fx, T) => {
    if (T < 42.4) {
      // silhouette of the guardian against a huge red sun; the tree lingers
      sunset(ctx, T, -120, 0, 1.05);
      sunDisc(ctx, 760, 520, 430, '#c8321a');
      withAlpha(ctx, 0.3, () => { LG.setTransform(1, 0, 0, 1, 0, 0); LG.clearRect(0, 0, W, H); drawLSTM(LG, lstmCam(T, 42.4, 44.85)); ctx.drawImage(LAYER, -260, 0); });
      ctx.save(); ctx.translate(820, 600); ctx.rotate(0.42 + seg(T, 41.6, 42.4) * 0.05); silLSTM(ctx, 0, 0, 0.95, '#0a0710'); ctx.restore();
      const ta = 1 - seg(T, 41.6, 42.0);
      if (ta > 0) { ctx.save(); ctx.globalAlpha = ta; tree(ctx, 720, 460, 0.98, 1); ctx.restore(); }
    } else if (T < 44.85) {
      sunset(ctx, T, -300, -100, 1.1);
      sunDisc(ctx, 1430, 380, 120, '#ffe070');
      LG.setTransform(1, 0, 0, 1, 0, 0); LG.clearRect(0, 0, W, H);
      drawLSTM(LG, lstmCam(T, 42.4, 44.85), { light: [-0.7, 0.45, 0.5] });
      ctx.drawImage(LAYER, 0, 0);
      // the protagonist's silhouette at the right
      drawTransformer(ctx, { yaw: -1.0, pitch: 0, roll: 0.05, cx: 1520 - seg(T, 42.4, 44.85) * 40, cy: 520, f: 1700, dist: 2400, scale: 2.2 }, { silhouette: '#07060c' });
      const c = cAlpha(T, 42.45, 44.8);
      if (c) {
        mincho(ctx, '音楽', 202, 192, 66, { align: 'center', alpha: c, sx: 0.84 });
        mincho(ctx, '正弦余弦', 326, 226, 132, { alpha: c, sx: 0.76 });
        mincho(ctx, '音楽協力', 608, 946, 70, { align: 'right', alpha: c, sx: 0.78 });
        mincho(ctx, '波長2π〜10000·2π', 676, 968, 112, { alpha: c, sx: 0.5 });
      }
    } else {
      // the protagonist, warm-lit; the guardian's silhouette crouched in front; the sun at left
      sunset(ctx, T, 0, -60, 1.05);
      sunDisc(ctx, 40, 560, 110, '#fff0a0');
      const k = seg(T, 44.85, 48.4);
      LG.setTransform(1, 0, 0, 1, 0, 0); LG.clearRect(0, 0, W, H);
      drawTransformer(LG, { yaw: -0.1, pitch: 0.06, roll: 0, cx: 760, cy: 700, f: 1700, dist: 2400, scale: 2.7 + k * 0.1 }, { light: [0.5, 0.4, 0.75], tint: (c) => c.map((x) => mixHex(x, '#d0603a', 0.42)) });
      withAlpha(ctx, 0.78, () => ctx.drawImage(LAYER, 0, 0));
      ctx.save(); ctx.translate(430, 930); ctx.rotate(-0.55); silLSTM(ctx, 0, 0, 0.8, '#0a0710'); ctx.restore();
      const c = cAlpha(T, 44.9, 48.35);
      if (c) {
        const o = { alpha: c, sx: 0.8 };
        mincho(ctx, 'オープニングテーマ', 456, 246, 50, { ...o, align: 'center', sx: 0.74 });
        mincho(ctx, 'エンディングテーマ', 1030, 246, 50, { ...o, align: 'center', sx: 0.74 });
        mincho(ctx, '「残酷な天使のテンソル」', 456, 334, 64, { ...o, align: 'center', sx: 0.62 });
        mincho(ctx, '「FIT ME TO THE NOISE」', 1036, 334, 64, { ...o, align: 'center', sx: 0.6 });
        const rows = [['作詞', 'WMT 2014', 'Memorization'], ['作曲', '自己注意', 'Memorization'], ['編曲', 'ラベル平滑化', 'Label Smoothing'], ['歌', 'ビーム探索', 'RANDOM LABELS']];
        rows.forEach(([r, a, b], i) => {
          const y = 448 + i * 94;
          mincho(ctx, r, 162, y, 50, { ...o, align: 'center', sx: 0.8 });
          minchoFit(ctx, a, 340, y + 6, 70, 250, { ...o, sx: 0.74 });
          ctx.save(); ctx.globalAlpha = c; ctx.font = `400 74px ${ROMAN}`; ctx.fillStyle = CW; ctx.textAlign = 'center';
          const wv = ctx.measureText(b).width; ctx.translate(1036, y + 6); ctx.scale(Math.min(0.62, 430 / wv), 1); ctx.fillText(b, 0, 0); ctx.restore();
        });
        mincho(ctx, '(チェックポイントレコード)', 748, 842, 56, { ...o, align: 'center', sx: 0.74 });
      }
    }
  });

  // ── 48.4–50.0 · the protagonist in pink; the Perceptron in the window panes ─
  function panes(ctx, x, y, w, h, fn) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); fn(); ctx.restore();
    ctx.strokeStyle = 'rgba(120,40,60,0.55)'; ctx.lineWidth = 14;
    ctx.strokeRect(x, y, w, h); ctx.beginPath(); ctx.moveTo(x + w * 0.42, y); ctx.lineTo(x + w * 0.42, y + h); ctx.moveTo(x, y + h * 0.5); ctx.lineTo(x + w, y + h * 0.5); ctx.stroke();
  }
  const PINK = (c) => c.map((x) => mixHex(x, '#f07a98', 0.55));
  SHOT(48.4, 50.0, 'pink_panes', (ctx, t, fx, T) => {
    fill(ctx, '#e86a78');
    sunset(ctx, T, 0, 0, 1);
    ctx.fillStyle = 'rgba(240,96,140,0.6)'; ctx.fillRect(0, 0, W, H);
    LG.setTransform(1, 0, 0, 1, 0, 0); LG.clearRect(0, 0, W, H);
    drawTransformer(LG, { yaw: 0.0, pitch: 0.05, roll: 0, cx: 640, cy: 690, f: 1700, dist: 2400, scale: 2.9 }, { tint: PINK, light: [0.5, 0.45, 0.75] });
    withAlpha(ctx, 0.9, () => ctx.drawImage(LAYER, 0, 0));
    const a = seg(T, 48.9, 49.3);
    withAlpha(ctx, 0.8 * a, () => panes(ctx, 820, 240, 560, 760, () => {
      ctx.fillStyle = 'rgba(255,190,205,0.55)'; ctx.fillRect(820, 240, 560, 760);
      perceptron(ctx, 1150, 1080, 1.05, { eye: true });
    }));
  });
  // ── 50.0–50.8 · the eye: the iris is an attention map ─────────────────────
  const ATT = attnPE(12, 64, 4, 1);
  function eye(ctx, cx, cy, s, T) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    const top = [[-620, 60], [-420, -170], [-80, -260], [260, -230], [560, -90], [700, 40]];
    const bot = [[700, 40], [420, 190], [60, 250], [-300, 210], [-620, 60]];
    ctx.beginPath(); ctx.moveTo(-620, 60);
    ctx.bezierCurveTo(-420, -190, 260, -330, 700, 40); ctx.bezierCurveTo(420, 230, -300, 260, -620, 60); ctx.closePath();
    ctx.fillStyle = '#fbf2ee'; ctx.fill();
    ctx.save(); ctx.clip();
    // iris = attention map (rows = queries, cols = keys), in red
    const R = 250, n = ATT.length, cs = (2 * R) / n;
    ctx.save(); ctx.beginPath(); ctx.arc(20, 10, R, 0, Math.PI * 2); ctx.clip();
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = Math.pow(ATT[i][j] / 0.55, 0.6);
      ctx.fillStyle = rampCol([[0, [70, 0, 10]], [0.35, [170, 8, 20]], [0.7, [236, 40, 34]], [1, [255, 170, 150]]], v).map(Math.round).reduce((s, c, k) => s + (k ? ',' : 'rgb(') + c, '') + ')';
      ctx.fillRect(20 - R + j * cs, 10 - R + i * cs, cs + 1, cs + 1);
    }
    ctx.strokeStyle = 'rgba(60,0,8,0.5)'; ctx.lineWidth = 2;
    for (let i = 0; i <= n; i++) { ctx.beginPath(); ctx.moveTo(20 - R + i * cs, 10 - R); ctx.lineTo(20 - R + i * cs, 10 + R); ctx.moveTo(20 - R, 10 - R + i * cs); ctx.lineTo(20 + R, 10 - R + i * cs); ctx.stroke(); }
    ctx.restore();
    ringS(ctx, 20, 10, R, '#4a0610', 10);
    // lid shadow across the top of the iris (cel)
    ctx.fillStyle = 'rgba(90,20,40,0.35)'; ctx.beginPath(); ctx.moveTo(-700, -400); ctx.lineTo(760, -400); ctx.lineTo(760, -40); ctx.bezierCurveTo(300, -170, -200, -170, -700, -20); ctx.fill();
    // highlights
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(-80, -90, 62, 44, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(130, 120, 26, 18, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // lids: heavy upper line with a lash flick, thin lower line
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#3a1616'; ctx.lineWidth = 30; ctx.beginPath(); ctx.moveTo(-640, 70); ctx.bezierCurveTo(-420, -200, 270, -345, 720, 30); ctx.stroke();
    ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(720, 30); ctx.lineTo(800, 90); ctx.moveTo(660, -10); ctx.lineTo(760, -40); ctx.stroke();
    ctx.lineWidth = 7; ctx.strokeStyle = '#8a4a4a'; ctx.beginPath(); ctx.moveTo(-560, 110); ctx.bezierCurveTo(-300, 250, 420, 240, 640, 90); ctx.stroke();
    ctx.lineWidth = 8; ctx.strokeStyle = '#7a3a3a'; ctx.beginPath(); ctx.moveTo(-520, -250); ctx.bezierCurveTo(-200, -420, 300, -420, 600, -250); ctx.stroke();
    ctx.restore();
  }
  SHOT(50.0, 50.8, 'eye', (ctx, t, fx, T) => {
    fill(ctx, '#f0cdbd');
    ctx.fillStyle = '#e6b4a4'; ctx.fillRect(0, 760, W, 400);
    eye(ctx, 700, 520, 0.95 + seg(T, 50.0, 50.8) * 0.06, T);
    withAlpha(ctx, 0.4, () => panes(ctx, 940, 60, 470, 760, () => { ctx.fillStyle = 'rgba(255,220,230,0.6)'; ctx.fillRect(940, 60, 470, 760); perceptron(ctx, 1210, 900, 0.9, { eye: true }); }));
  });
})();
