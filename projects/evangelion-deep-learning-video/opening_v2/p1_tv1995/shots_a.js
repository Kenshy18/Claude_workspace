// ─────────────────────────────────────────────────────────────────────────────
//  p1_tv1995 · shots 0–8  (0.0 – 23.4 s): a cappella intro, the band hit, logo.
// ─────────────────────────────────────────────────────────────────────────────
(() => {
  // ── 0.0–2.4 · black, a single speck (θ₀) inside a faint circle ─────────────
  SHOT(0, 2.4, 'speck', (ctx, t) => {
    fill(ctx, '#000');
    const a = seg(t, 0.8, 1.6) * (1 - seg(t, 2.2, 2.4) * 0.5);
    ctx.save(); ctx.globalAlpha = 0.22 * a; ringS(ctx, W / 2, H / 2 + 10, 700 + t * 12, '#6a7c96', 1.4); ctx.restore();
    const r = 1.4 + seg(t, 0.9, 2.4) * 1.4;
    circle(ctx, W / 2, H / 2 + 10, r, `rgba(255,255,255,${0.35 + 0.6 * seg(t, 0.6, 1.2)})`);
  });

  // ── 2.4–7.3 · red clouds, winged-neuron emblem, 企画・原作 ────────────────
  function wingedNeuron(ctx, cx, cy, s, col) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    ctx.strokeStyle = col; ctx.lineWidth = 1.6;
    const hub = [0, 40];
    for (const side of [-1, 1]) {
      // wing = three layers of nodes on arcs, fully connected toward the hub
      const layers = [[], [], []];
      for (let L = 0; L < 3; L++) {
        const n = 7 - L * 2, R0 = 430 - L * 120;
        for (let i = 0; i < n; i++) {
          const a = -0.95 + (i / (n - 1)) * 1.5;
          layers[L].push([side * Math.cos(a) * R0 * (1 + L * 0.05), -120 + Math.sin(a) * R0 * 0.8 + L * 30]);
        }
      }
      ctx.beginPath();
      for (let L = 0; L < 2; L++) for (const p of layers[L]) for (const q of layers[L + 1]) { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
      for (const p of layers[2]) { ctx.moveTo(p[0], p[1]); ctx.lineTo(hub[0], hub[1]); }
      ctx.stroke();
      for (const Ls of layers) for (const p of Ls) { ringS(ctx, p[0], p[1], 13, col, 1.6); }
      // feather strokes under the wing
      ctx.beginPath();
      for (let k = 0; k < 9; k++) { const a = 0.35 + k * 0.1; ctx.moveTo(side * 60, 80); ctx.quadraticCurveTo(side * 260, 160 + k * 14, side * (180 + 260 * Math.cos(a)), 120 + 330 * Math.sin(a)); }
      ctx.stroke();
    }
    ringS(ctx, hub[0], hub[1], 58, col, 2); ringS(ctx, hub[0], hub[1], 70, col, 1);
    ctx.font = 'italic 500 60px "EB Garamond"'; ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Σ', 0, 42);
    ctx.beginPath(); ctx.moveTo(0, 110); ctx.lineTo(0, 420); ctx.moveTo(-40, 380); ctx.lineTo(0, 420); ctx.lineTo(40, 380); ctx.stroke();
    ringS(ctx, 0, 40, 520, col, 1.2); ringS(ctx, 0, 40, 540, col, 0.8);
    ctx.restore();
  }
  SHOT(2.4, 7.3, 'red', (ctx, t, fx, T) => {
    const k = seg(T, 2.4, 7.3);
    ctx.drawImage(ART.redA, -200 - k * 160, -150 - k * 60, 2000, 1500);
    withAlpha(ctx, 0.5 + 0.5 * Math.sin(T * 0.9), () => ctx.drawImage(ART.redB, -300 + k * 120, -250, 2000, 1500));
    // emblem fades in behind the credit (≈4.2 s), gently pulsing like the original
    withAlpha(ctx, 0.3 * seg(T, 4.0, 4.8) * (1 - seg(T, 6.1, 6.6)), () => wingedNeuron(ctx, W / 2, H / 2 - 40, 1.0 + k * 0.05, '#ff8a70'));
    const a = seg(T, 2.75, 3.45) * (1 - seg(T, 6.15, 6.4));
    if (a > 0) {
      mincho(ctx, '企画・原作', W / 2, 478, 78, { align: 'center', alpha: a, sx: 0.9 });
      ctx.save(); ctx.globalAlpha = a; ctx.font = `700 150px ${ROMAN}`; ctx.textAlign = 'center'; ctx.fillStyle = CW;
      ctx.translate(W / 2, 668); ctx.scale(0.86, 1); ctx.fillText('1706.03762', 0, 0); ctx.restore();
    }
    if (T > 7.0) fx.flash = 0;
  });

  // ── 7.3–10.4 · copper-plate engraving of a network, camera pushes (on 5s) ──
  let ENGR = null;
  function buildEngraving() {
    const S = 2800, c = mkCanvas(S, S), g = c.getContext('2d');
    const R = rngFor(61);
    g.fillStyle = '#0a2a86'; g.fillRect(0, 0, S, S);
    const cx = S / 2, cy = 760;
    const ink = '#c8dcff';
    g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = 'round';
    // radiance hatching around the node
    g.lineWidth = 1.1;
    for (let i = 0; i < 420; i++) {
      const a = (i / 420) * Math.PI * 2; const r0 = 60 + R() * 30, r1 = 160 + R() * 180;
      g.globalAlpha = 0.55; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke();
    }
    g.globalAlpha = 1;
    // feathered weight-bundles fanning downward
    const rays = 22;
    const med = [];
    for (let i = 0; i < rays; i++) {
      const a = Math.PI * (0.08 + 0.84 * (i / (rays - 1))) + (R() - 0.5) * 0.04;
      const len = 1250 + R() * 500;
      const lines = 18 + Math.floor(R() * 10);
      for (let l = 0; l < lines; l++) {
        const spread = (l / (lines - 1) - 0.5) * 0.09;
        const bend = (R() - 0.5) * 0.05;
        g.lineWidth = 0.9 + R() * 0.9; g.globalAlpha = 0.5 + R() * 0.45;
        g.beginPath(); g.moveTo(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120);
        const mx = cx + Math.cos(a + spread * 0.5 + bend) * len * 0.5, my = cy + Math.sin(a + spread * 0.5 + bend) * len * 0.5;
        const ex = cx + Math.cos(a + spread) * len, ey = cy + Math.sin(a + spread) * len;
        g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
      }
      // barbs (feather ticks) along the bundle
      g.lineWidth = 1; g.globalAlpha = 0.6;
      for (let s2 = 0.25; s2 < 1; s2 += 0.035) {
        const px = cx + Math.cos(a) * len * s2, py = cy + Math.sin(a) * len * s2;
        const na = a + Math.PI / 2;
        g.beginPath(); g.moveTo(px - Math.cos(na) * 26, py - Math.sin(na) * 26); g.lineTo(px + Math.cos(a) * 30 + Math.cos(na) * 26, py + Math.sin(a) * 30 + Math.sin(na) * 26); g.stroke();
      }
      g.globalAlpha = 1;
      if (i % 2 === 0) med.push([cx + Math.cos(a) * len * (0.45 + 0.35 * R()), cy + Math.sin(a) * len * (0.45 + 0.35 * R())]);
    }
    // the trunk: the output axon running down the middle
    g.lineWidth = 1.2;
    for (let l = 0; l < 26; l++) { const x = cx - 70 + l * 5.6; g.globalAlpha = 0.7; g.beginPath(); g.moveTo(x, cy + 90); g.bezierCurveTo(x + 10, cy + 700, x - 20, cy + 1300, x + (l - 13) * 9, S); g.stroke(); }
    g.globalAlpha = 1;
    // medallions: Latin labels + the formula each unit computes
    const labels = [['Neuron', 'Σ wᵢxᵢ + b'], ['Pondus', 'w ∈ ℝⁿ'], ['Activatio', 'σ(z)'], ['Error', '½(y − ŷ)²'], ['Gradiens', '∂E/∂w'],
      ['Descensus', 'w − η∇E'], ['Stratum', 'h = σ(Wx)'], ['Retro', 'δ = ∂E/∂z'], ['Epocha', 't = 1 … T'], ['Perceptron', 'MCMLVIII'], ['Inclinatio', 'b'], ['Signum', 'sgn(z)']];
    med.forEach(([x, y], i) => {
      const [nm, fm] = labels[i % labels.length];
      const r = 120 + R() * 30;
      g.fillStyle = '#0a2a86'; g.beginPath(); g.arc(x, y, r + 16, 0, Math.PI * 2); g.fill();
      g.lineWidth = 2.2; ringS(g, x, y, r + 14, ink, 2.2); g.lineWidth = 1.2; ringS(g, x, y, r, ink, 1.2); ringS(g, x, y, r - 34, ink, 1.4);
      // ring inscription
      const ring = ('· ' + nm.toUpperCase() + ' · STRATVM ' + ['I', 'II', 'III', 'IV', 'V', 'VI'][i % 6] + ' ').repeat(2);
      g.font = 'italic 500 22px "EB Garamond"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = ink;
      const chars = [...ring]; const step = (Math.PI * 2) / chars.length;
      chars.forEach((ch, k) => { g.save(); g.translate(x, y); g.rotate(k * step); g.fillText(ch, 0, -(r - 17)); g.restore(); });
      g.font = 'italic 500 40px "EB Garamond"'; g.fillText(nm, x, y - 14);
      g.font = 'italic 500 30px "EB Garamond"'; g.fillText(fm, x, y + 26);
    });
    g.globalAlpha = 1;
    // specks of the plate (sparse, static)
    for (let i = 0; i < 160; i++) circle(g, R() * S, R() * S, R() * 1.8 + 0.4, 'rgba(220,235,255,0.8)');
    return { c, cx, cy };
  }
  function engraving(ctx, T) {
    if (!ENGR) ENGR = buildEngraving();
    const q = Math.floor((T - 7.3) * FPS / 5) * 5 / FPS;           // camera advances on 5-frame steps
    const k = E.inOutSine(clamp(q / 3.1));
    const z = lerp(0.62, 1.75, k);
    const fx0 = ENGR.cx + lerp(0, -60, k), fy0 = ENGR.cy + lerp(260, 820, k);
    ctx.save();
    ctx.translate(W / 2, H / 2 - lerp(260, 0, k)); ctx.scale(z, z); ctx.rotate(lerp(0, 0.06, k)); ctx.translate(-fx0, -fy0 + 260);
    ctx.drawImage(ENGR.c, 0, 0);
    ctx.restore();
    // central light
    const g = ctx.createRadialGradient(W / 2, lerp(170, H / 2, k), 0, W / 2, lerp(170, H / 2, k), 260);
    g.addColorStop(0, 'rgba(210,240,255,0.95)'); g.addColorStop(0.2, 'rgba(120,190,255,0.5)'); g.addColorStop(1, 'rgba(40,100,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  SHOT(7.3, 10.4, 'engraving', (ctx, t, fx, T) => {
    engraving(ctx, T);
    // red clouds dissolve out over the first frames (as the red rays turn blue)
    const a = 1 - seg(T, 7.3, 7.85);
    if (a > 0) withAlpha(ctx, a, () => { ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(ART.redA, -360, -210, 2000, 1500); });
    fx.bloom = 0.35; fx.thr = 0.8;
  });

  // ── 10.4–14.1 · blue water light + 企画 / 掲載 ─────────────────────────────
  function starfield(ctx, T, seed = 5) {
    const R = rngFor(seed);
    ctx.fillStyle = '#e8f2ff';
    for (let i = 0; i < 110; i++) { const x = R() * W, y = R() * H, r = R() * 1.6 + 0.5; ctx.globalAlpha = 0.4 + R() * 0.6; ctx.fillRect(x, y, r, r); }
    ctx.globalAlpha = 1;
    // a few streaks, radial from the centre (the camera drifting inward)
    ctx.strokeStyle = 'rgba(220,240,255,0.7)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 16; i++) {
      const a = R() * Math.PI * 2, d0 = 300 + R() * 600, sp = 120 + R() * 200;
      const d = d0 + ((T * sp + R() * 900) % 900);
      const x = W / 2 + Math.cos(a) * d, y = H / 2 + Math.sin(a) * d * 0.8;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 26, y + Math.sin(a) * 21); ctx.stroke();
    }
  }
  SHOT(10.4, 14.1, 'water', (ctx, t, fx, T) => {
    fill(ctx, '#0a2a92');
    const g0 = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 900); g0.addColorStop(0, '#1a52c8'); g0.addColorStop(1, '#081f78');
    ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
    starfield(ctx, T);
    const s = ART.caustic.width;
    const grow = 1 + seg(T, 13.4, 14.1) * 0.35;
    ctx.save(); ctx.translate(W / 2 + 20, H / 2 + 10); ctx.rotate(T * 0.35); ctx.scale(1.05 * grow, 0.95 * grow); ctx.drawImage(ART.caustic, -s / 2, -s / 2); ctx.restore();
    withAlpha(ctx, 0.3, () => { ctx.save(); ctx.translate(W / 2 + 20, H / 2 + 10); ctx.rotate(-T * 0.5 + 1.3); ctx.scale(0.8 * grow, 0.9 * grow); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(ART.caustic, -s / 2, -s / 2); ctx.restore(); });
    const a = cAlpha(T, 10.45, 13.95, 3, 3);
    if (a > 0) {
      const HALO = { halo: 'rgba(6,26,110,0.85)', haloB: 14 };   // the soft dark fringe white titles get on a video master
      mincho(ctx, '企画', 370, 360, 88, { align: 'center', alpha: a, sx: 0.9, ...HALO });
      ctx.save(); ctx.globalAlpha = a; ctx.shadowColor = HALO.halo; ctx.shadowBlur = 14; ctx.font = `400 142px ${ROMAN}`; ctx.fillStyle = CW; ctx.translate(556, 378); ctx.scale(0.62, 1); ctx.fillText('Project Attn.', 0, 0); ctx.restore();
      mincho(ctx, '掲載', 370, 632, 88, { align: 'center', alpha: a, sx: 0.9, ...HALO });
      ctx.save(); ctx.globalAlpha = a; ctx.shadowColor = HALO.halo; ctx.shadowBlur = 14; ctx.font = `400 150px ${ROMAN}`; ctx.fillStyle = CW; ctx.translate(556, 648); ctx.scale(0.66, 1); ctx.fillText('arXiv', 0, 0); ctx.restore();
      mincho(ctx, 'NIPS 2017 予稿集', 556, 808, 128, { alpha: a, sx: 0.7, ...HALO });
    }
    // brightening into the band hit
    const b = seg(T, 13.75, 14.1);
    if (b > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = b; ringS(ctx, W / 2, H / 2, 240 + b * 120, '#dff6ff', 60 * b); ctx.restore(); fx.bloom = 0.6 * b; fx.thr = 0.7; }
  });

  // ── 14.1–15.9 · white flash, smoke, a giant ⊕ (the residual add) sweeping ──
  function oplus(ctx, x, y, r, rot, lw, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.moveTo(-r * 1.25, 0); ctx.lineTo(r * 1.25, 0); ctx.moveTo(0, -r * 1.25); ctx.lineTo(0, r * 1.25); ctx.stroke();
    ctx.restore();
  }
  SHOT(14.1, 15.9, 'smoke', (ctx, t, fx, T) => {
    const k = T - 14.1;
    // the smoke rushes (fast, stepped camera)
    const q = Math.floor(k * FPS / 2) * 2 / FPS;
    const sx = -300 - q * 900, sy = -200 - q * 380;
    ctx.drawImage(ART.smoke, sx, sy, 2400 * 1.1, 1800 * 1.1);
    const f = frameIdx(T);
    // cross silhouettes: far & thin → close & thick bar
    ctx.save();
    if (T < 14.5) oplus(ctx, 1000 - k * 400, 260 + k * 300, 150, 0.6 + k * 3, 16, 'rgba(40,44,46,0.85)');
    else if (T < 14.68) oplus(ctx, 520, 520, 900, 0.4, 150, 'rgba(24,26,28,0.75)');
    else if (T >= 14.82 && T < 15.02) { ctx.fillStyle = 'rgba(20,22,24,0.9)'; ctx.translate(W / 2, H / 2); ctx.rotate(-0.95); ctx.fillRect(-1400, -70, 2800, 140); }
    else if (T >= 15.3 && T < 15.52) oplus(ctx, 760, 520, 190, 0.78, 12, 'rgba(40,44,46,0.8)');
    ctx.restore();
    // the wordmark begins to surface through the smoke
    const wa = seg(T, 15.25, 15.8) * 0.55;
    if (wa > 0) withAlpha(ctx, wa, () => { wordmark(ctx, W / 2 + 3, LOGO_Y, 1.0, '#8a9094'); wordmark(ctx, W / 2 - 3, LOGO_Y, 1.0, '#8a9094'); });
    // white flash in; smoke overexposed
    fx.flash = Math.max(1 - seg(T, 14.1, 14.35), 0) * 0.95; fx.flashCol = [0.93, 0.9, 1.0];
    fx.contrast = 1.15;
  });

  // ── wordmark: wide Roman capitals, the A drawn as a crossbar-less Λ ─────────
  const WM = 'TRANSFORMER';
  function wordmark(ctx, cx, y, s = 1, col = CW) {
    ctx.save(); ctx.translate(cx, y); ctx.scale(s * 1.2, s);
    ctx.font = `700 146px "Cinzel"`; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = col;
    const letters = [...WM];
    const capH = ctx.measureText('T').actualBoundingBoxAscent, k = capH / 98;
    const adv = letters.map((ch) => (ch === 'A' ? 100 * k : ctx.measureText(ch).width) - 4);
    const tot = adv.reduce((a, b) => a + b, 0);
    let x = -tot / 2;
    letters.forEach((ch, i) => {
      if (ch === 'A') {
        // Λ: no crossbar, knife-sharp apex, thin left hairline + heavy right stem, wedge serifs
        const P = [[44, -98], [58, -98], [96, -3], [106, 0], [68, 0], [77, -3], [50, -72], [24, -3], [32, 0], [2, 0], [10, -3]];
        fillPts(ctx, P.map(([px, py]) => [x + px * k, py * k]), col);
      } else ctx.fillText(ch, x, 0);
      x += adv[i];
    });
    ctx.restore();
  }
  window.wordmark = wordmark;

  // ── jagged katakana トランスフォーマー drawn as knife-blade polygons ───────
  // glyph box: x 0..100, y -100..100 (y down). stroke: [x1,y1,x2,y2,w1,w2]; w2=0 → spiked end.
  const KANA = {
    'ト': [[28, -12, 34, -118, 24, 0], [28, -12, 22, 96, 24, 0], [32, -4, 104, 44, 22, 0]],
    'ラ': [[18, -62, 88, -70, 18, 0], [-2, -24, 94, -30, 22, 12], [92, -30, 22, 104, 26, 0]],
    'ン': [[2, -64, 44, -18, 22, 0], [-6, 88, 116, -84, 28, 0]],
    'ス': [[2, -66, 88, -70, 22, 12], [86, -70, -14, 100, 28, 0], [40, 6, 110, 86, 24, 0]],
    'フ': [[-2, -64, 96, -70, 22, 12], [94, -70, 8, 112, 28, 0]],
    'ォ': [[6, -22, 100, -30, 20, 0], [64, -60, 56, 92, 20, 0], [58, -4, -2, 64, 20, 0]],
    'ー': [[-18, 12, 120, -12, 28, 0]],
    'マ': [[-2, -60, 96, -66, 22, 12], [94, -66, 38, 34, 26, 6], [26, 4, 100, 100, 24, 0]],
  };
  function blade(x1, y1, x2, y2, w1, w2) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const mx = x1 + dx * 0.58, my = y1 + dy * 0.58, wm = lerp(w1, w2, 0.58);
    const tip = w2 ? 0 : 16;
    return [[x1 - ux * 6 + nx * w1 / 2, y1 - uy * 6 + ny * w1 / 2], [mx + nx * wm / 2, my + ny * wm / 2], [mx + nx * (wm / 2 + 9) + ux * 14, my + ny * (wm / 2 + 9) + uy * 14],
      [mx + nx * wm / 2 + ux * 9, my + ny * wm / 2 + uy * 9], [x2 + nx * w2 / 2 + ux * tip, y2 + ny * w2 / 2 + uy * tip],
      [x2 - nx * w2 / 2, y2 - ny * w2 / 2], [x1 - ux * 6 - nx * w1 / 2, y1 - uy * 6 - ny * w1 / 2]];
  }
  const KSEQ = [['ト', 1.0, 0], ['ラ', 1.0, 0], ['ン', 1.0, 0], ['ス', 1.0, 0], ['フ', 1.0, 0], ['ォ', 0.66, 24], ['ー', 0.95, 6], ['マ', 1.0, 0], ['ー', 1.0, 10]];
  const KX = 1.5, KY = 2.1, KSL = 0.34;
  function katakana(ctx, cx, cy, s, style = 'fire', build = 1) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    const pitch = 102; const tot = KSEQ.reduce((a, k) => a + pitch * k[1], 0) - 10;
    let x = -tot / 2;
    const polys = [];
    KSEQ.forEach(([ch, sc, dy], i) => {
      for (const st of KANA[ch]) {
        const [x1, y1, x2, y2, w1, w2] = st;
        const P = blade(x1, y1, x2, y2, w1 * 1.6, w2 * 1.5).map(([px, py]) => {
          const gx = x + px * sc, gy = py * sc + dy;
          return [(gx - gy * KSL) * KX, gy * KY];
        });
        polys.push({ P, i });
      }
      x += pitch * sc;
    });
    let gr = null;
    if (style === 'fire') { gr = ctx.createLinearGradient(0, -230, 0, 230); gr.addColorStop(0, '#ffb640'); gr.addColorStop(0.35, '#ff7a22'); gr.addColorStop(0.62, '#f2400f'); gr.addColorStop(1, '#c80c08'); }
    for (const { P, i } of polys) {
      if (i / KSEQ.length > build) continue;
      fillPts(ctx, P, gr || style);
      if (gr) strokePts(ctx, P, 'rgba(255,196,150,0.55)', 1.6);
    }
    ctx.restore();
    return polys;
  }
  window.katakana = katakana;
  function shinseiki(ctx, x, y, s, a) {
    withAlpha(ctx, a, () => {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.font = `900 78px ${MINCHO}`; ctx.textAlign = 'center'; ctx.lineJoin = 'miter';
      ctx.scale(1.25, 1);
      ctx.lineWidth = 4; ctx.strokeStyle = '#ffc2b0'; ctx.strokeText('新世紀', 0, 0);
      ctx.fillStyle = '#7e0c06'; ctx.fillText('新世紀', 0, 0);
      ctx.restore();
    });
  }
  const LOGO_Y = 506, KANA_Y = 560;
  function logo(ctx, T, o = {}) {
    wordmark(ctx, W / 2, LOGO_Y, 1.0, o.wm || CW);
    katakana(ctx, W / 2 + 12, KANA_Y, 1.0, o.kana || 'fire');
    shinseiki(ctx, W / 2 - 70, 372, 1.0, o.ss ?? 1);
  }

  SHOT(15.9, 17.4, 'wordmark', (ctx, t, fx, T) => {
    fill(ctx, '#000');
    wordmark(ctx, W / 2, LOGO_Y, 1.0 + (T - 15.9) * 0.004);
  });
  const KGLOW = {};
  function kanaGlow(b) {
    if (KGLOW[b]) return KGLOW[b];
    const c = mkCanvas(W / 4, H / 4), g = c.getContext('2d');
    g.scale(0.25, 0.25); katakana(g, W / 2 + 12, KANA_Y, 1.0, '#3a9cff', b);
    const d = mkCanvas(W / 4, H / 4), dg = d.getContext('2d'); dg.filter = 'blur(4px)'; dg.drawImage(c, 0, 0); dg.filter = 'none';
    return (KGLOW[b] = d);
  }
  SHOT(17.4, 18.2, 'kana_forming', (ctx, t, fx, T) => {
    fill(ctx, '#000');
    const k = seg(T, 17.4, 18.2);
    // the katakana is struck in electric blue, light streaks bleeding vertically
    if (T < 17.5) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createLinearGradient(300, 0, 900, 0); gr.addColorStop(0, 'rgba(120,200,255,0)'); gr.addColorStop(0.5, 'rgba(230,250,255,1)'); gr.addColorStop(1, 'rgba(120,200,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(420, -10); ctx.lineTo(760, -10); ctx.lineTo(820, 1090); ctx.lineTo(560, 1090); ctx.fill(); ctx.restore();
    }
    wordmark(ctx, W / 2, LOGO_Y, 1.0, '#e8f4ff');
    const build = 0.4 + k;
    const glow = kanaGlow(Math.min(1.4, Math.round(build * 10) / 10));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let s2 = 0; s2 < 5; s2++) { ctx.globalAlpha = 0.24; const st = 1 + (s2 + 1) * 0.35 * (1.2 - k); ctx.drawImage(glow, 0, KANA_Y - KANA_Y * st, W, H * st); }
    ctx.globalAlpha = 1;
    katakana(ctx, W / 2 + 12, KANA_Y, 1.0, '#a8e0ff', build);
    ctx.restore();
    fx.bloom = 0.9; fx.thr = 0.55;
  });
  SHOT(18.2, 22.9, 'logo', (ctx, t, fx, T) => {
    fill(ctx, '#000');
    logo(ctx, T, { ss: seg(T, 19.35, 19.6) });
    // blue horizontal lens flare sweeping across the cap line at 19.0
    const fl = seg(T, 18.95, 19.05) * (1 - seg(T, 19.22, 19.4));
    if (fl > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fl;
      const y0 = LOGO_Y - 104;
      const gg = ctx.createRadialGradient(W / 2, y0 - 40, 10, W / 2, y0 - 40, 380);
      gg.addColorStop(0, 'rgba(120,190,255,0.8)'); gg.addColorStop(1, 'rgba(20,80,255,0)');
      ctx.save(); ctx.translate(W / 2, y0 - 40); ctx.scale(2.2, 0.32); ctx.translate(-W / 2, -(y0 - 40)); ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H); ctx.restore();
      const lg = ctx.createLinearGradient(0, 0, W, 0); lg.addColorStop(0, 'rgba(140,210,255,0.2)'); lg.addColorStop(0.5, 'rgba(255,255,255,1)'); lg.addColorStop(1, 'rgba(140,210,255,0.2)');
      ctx.fillStyle = lg; ctx.fillRect(0, y0 - 3, W, 6);
      ctx.restore();
      fx.bloom = 0.8 * fl; fx.thr = 0.6;
    }
    // blue ring pulse at 21.0
    const rp = seg(T, 20.98, 21.04) * (1 - seg(T, 21.06, 21.35));
    if (rp > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = rp;
      const r = 700 + seg(T, 21.0, 21.35) * 160;
      ringS(ctx, W / 2, H / 2 + 20, r, 'rgba(40,120,255,0.55)', 40); ringS(ctx, W / 2, H / 2 + 20, r, 'rgba(160,220,255,0.95)', 8);
      ctx.restore();
      fx.bloom = 0.9 * rp; fx.thr = 0.5;
    }
  });
  // ── 22.9–23.4 · white flash, blue X rays over the fading logo ─────────────
  SHOT(22.9, 23.4, 'xflash', (ctx, t, fx, T) => {
    fill(ctx, '#000');
    const k = seg(T, 22.9, 23.25);
    withAlpha(ctx, 1 - k * 0.8, () => logo(ctx, T));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(80,150,255,${0.35 + 0.5 * k})`; ctx.fillRect(0, 0, W, H);
    for (const a of [0.9, -0.9]) {
      ctx.save(); ctx.translate(W / 2 + 40, H / 2); ctx.rotate(a);
      const w2 = 30 + 160 * k;
      const gr = ctx.createLinearGradient(0, -w2, 0, w2); gr.addColorStop(0, 'rgba(160,220,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(160,220,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(-1600, -w2, 3200, w2 * 2); ctx.restore();
    }
    ctx.restore();
    fx.flash = seg(T, 23.1, 23.25) * (1 - seg(T, 23.33, 23.4)); fx.bloom = 0.6; fx.thr = 0.6;
  });
})();
