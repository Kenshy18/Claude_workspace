// ── EPISODE 2 · シンクロ率400% — overfitting, read as fitting below the noise floor ──
//   SYNC ≡ L* / L_train.  100% = train loss at the irreducible (Bayes) loss.
//   >100% means the model is fitting the noise: the pilot dissolves into the LCL.
(() => {
  const DUR = 18.5;
  const LSTAR = 0.99;
  const S_MAX = 30000;
  const Ltr = (s) => 0.15 + 2.25 * Math.exp(-s / 8200);
  const Lval = (s) => 1.02 + 1.43 * Math.exp(-s / 2600) + 0.85 * Math.pow(Math.max(0, (s - 3500) / 26500), 1.45);
  const S400 = -8200 * Math.log((LSTAR / 4 - 0.15) / 2.25);   // step where sync hits 400%
  let VMIN_S = 0, VMIN = 9;
  let NOISE = [];

  function init() {
    for (let s = 0; s <= S_MAX; s += 50) { const v = Lval(s); if (v < VMIN) { VMIN = v; VMIN_S = s; } }
    const rng = mulberry32(400);
    NOISE = Array.from({ length: 601 }, () => [gauss(rng), gauss(rng)]);
  }
  // training step shown at local time t (runs forward, holds at 400%, rewinds to best ckpt)
  function stepAt(t) {
    if (t < 2.0) return 0;
    if (t < 10.5) { const u = seg(t, 2.0, 10.5); return S400 * (0.55 * u + 0.45 * E.inCubic(u)); }
    if (t < 15.9) return S400;
    return lerp(S400, VMIN_S, E.inOutCubic(seg(t, 15.9, 17.2)));
  }
  const noiseAt = (s, k) => { const i = Math.min(600, Math.floor(s / 50)); return NOISE[i][k]; };

  function lossPlot(ctx, t, s, danger) {
    const x = 80, y = 150, w = 1080, h = 560;
    const p = seg(t, 0, 1.2);
    panel(ctx, x, y, w, h, { p, label: 'TRAINING DYNAMICS', sub: 'cross-entropy (nats)  //  log-scale', id: 'EVA-01 / PLUG 00', color: danger ? C.red : C.orange });
    const ax = { x: x + 90, y: y + 50, w: w - 140, h: h - 130 };
    const { X, Y } = axes(ctx, ax.x, ax.y, ax.w, ax.h, {
      p: seg(t, 0.4, 1.4), xmin: 0, xmax: S_MAX, ymin: 0.12, ymax: 3.2, logy: true, nx: 6, ny: 4,
      xticks: [[0, '0'], [10000, '10k'], [20000, '20k'], [30000, '30k']],
      yticks: [[0.2, '0.2'], [0.5, '0.5'], [1, '1.0'], [2, '2.0']], xlabel: 'optimizer step', ylabel: 'loss',
    });
    // Bayes floor
    const fa = seg(t, 1.2, 1.8);
    ctx.save(); ctx.setLineDash([10, 8]);
    line(ctx, ax.x, Y(LSTAR), ax.x + ax.w * E.outCubic(fa), Y(LSTAR), C.white, 1.5, 0.8 * fa);
    ctx.restore();
    text(ctx, 'L*  irreducible loss (noise floor)', ax.x + ax.w - 8, Y(LSTAR) - 10, { size: 18, family: F.mono, color: C.white, align: 'right', alpha: 0.8 * fa });
    // memorization zone
    const za = seg(t, 9.0, 10.0);
    if (za > 0) {
      rect(ctx, ax.x, Y(LSTAR), ax.w, Y(0.12) - Y(LSTAR), { fill: C.red, alpha: 0.08 * za });
      text(ctx, 'MEMORIZATION ZONE  ·  SYNC > 100%', ax.x + 16, Y(0.14) - 8, { size: 18, family: F.cond, weight: 700, color: C.red, ls: 4, alpha: za });
    }
    // curves up to the furthest step reached so far
    const sMaxSeen = t < 10.5 ? s : S400;
    const tr = [], va = [];
    for (let q = 0; q <= sMaxSeen; q += 150) {
      tr.push([X(q), Y(Ltr(q) * (1 + 0.012 * noiseAt(q, 0)))]);
      va.push([X(q), Y(Lval(q) * (1 + 0.01 * noiseAt(q, 1)))]);
    }
    if (tr.length > 1) {
      plotLine(ctx, va, C.cyan, 3);
      plotLine(ctx, tr, C.orange, 3);
      const [hx, hy] = [X(s), Y(Ltr(s))], [vx, vy] = [X(s), Y(Lval(s))];
      dot(ctx, hx, hy, 6, C.orange); dot(ctx, vx, vy, 6, C.cyan);
      line(ctx, hx, ax.y, hx, ax.y + ax.h, C.white, 1, 0.25);
      // generalization gap bracket
      if (s > VMIN_S * 1.2) {
        line(ctx, hx + 18, vy, hx + 18, hy, C.red, 2, 0.9);
        line(ctx, hx + 12, vy, hx + 24, vy, C.red, 2, 0.9); line(ctx, hx + 12, hy, hx + 24, hy, C.red, 2, 0.9);
        text(ctx, `Δgen ${(Lval(s) - Ltr(s)).toFixed(2)}`, hx + 32, (vy + hy) / 2 + 6, { size: 20, family: F.mono, color: C.red });
      }
    }
    // legend
    text(ctx, '━ L_train', ax.x + 20, ax.y + 24, { size: 20, family: F.mono, color: C.orange, alpha: p });
    text(ctx, '━ L_val', ax.x + 180, ax.y + 24, { size: 20, family: F.mono, color: C.cyan, alpha: p });
    text(ctx, `step ${Math.round(s).toLocaleString('en-US').padStart(6)}`, ax.x + ax.w - 8, ax.y + 24, { size: 22, family: F.mono, color: C.amber, align: 'right', alpha: p });
    // early stopping marker on rewind
    const ra = seg(t, 16.9, 17.3);
    if (ra > 0) {
      const mx = X(VMIN_S), my = Y(VMIN);
      ring(ctx, mx, my, 16 + 50 * (1 - E.outCubic(ra)), C.green, 3, ra);
      ctx.save(); ctx.setLineDash([4, 6]); line(ctx, mx, ax.y, mx, ax.y + ax.h, C.green, 2, ra); ctx.restore();
      rect(ctx, mx + 20, my - 116, 420, 80, { fill: 'rgba(0,20,8,0.9)', stroke: C.green, lw: 2, alpha: ra });
      text(ctx, 'EARLY STOPPING', mx + 36, my - 84, { size: 26, family: F.cond, weight: 800, color: C.green, ls: 4, alpha: ra });
      text(ctx, `restore ckpt @ step ${VMIN_S.toLocaleString('en-US')} · val ${VMIN.toFixed(3)}`, mx + 36, my - 52, { size: 18, family: F.mono, color: C.green, alpha: ra });
    }
    if (t > 17.4) text(ctx, '* unless you are in the double-descent regime (Nakkiran et al., 2019)', ax.x, y + h - 14, { size: 17, family: F.mono, color: C.grey, alpha: seg(t, 17.4, 17.8) });
  }

  function syncPanel(ctx, t, s, danger) {
    const x = 1230, y = 150, w = 620, h = 560;
    const p = seg(t, 0.3, 1.4);
    const sync = (100 * LSTAR) / Ltr(s);
    const col = sync > 135 ? C.red : sync > 85 ? C.green : C.orange;
    panel(ctx, x, y, w, h, { p, label: 'SYNC RATIO', sub: 'pilot ⟷ unit-01', id: 'HARMONICS', color: danger ? C.red : C.orange });
    // big digits
    const shake = danger ? (hash1(Math.floor(t * 30)) - 0.5) * 8 : 0;
    const str = sync.toFixed(1);
    text(ctx, str, x + w - 110 + shake, y + 200, { size: 170, family: F.mono, color: col, align: 'right', alpha: p });
    text(ctx, '%', x + w - 40, y + 200, { size: 80, family: F.mono, color: col, align: 'right', alpha: p });
    text(ctx, 'SYNC ≡ L* / L_train', x + 30, y + 250, { size: 22, family: F.mono, color: C.amber, alpha: p });
    const state = sync > 300 ? 'ABNORMAL — PILOT SIGNAL LOST' : sync > 135 ? 'OVER-SYNC — FITTING NOISE' : sync > 85 ? 'HARMONICS NORMAL' : 'SYNCHRONIZING';
    if (!(danger && !blink(t, 0.3))) text(ctx, state, x + 30, y + 290, { size: 26, family: F.cond, weight: 800, color: col, ls: 4, alpha: p });
    // harmonics: pilot vs unit waveforms; phase error shrinks with sync, then pilot trace dies
    const gx = x + 30, gy = y + 320, gw = w - 60, gh = 190;
    rect(ctx, gx, gy, gw, gh, { stroke: C.orange, alpha: 0.4 * p });
    hexGrid(ctx, gx, gy, gw, gh, 20, C.orange, 0.06 * p);
    ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip();
    const phaseErr = Math.max(0, 1.6 * (1 - Math.min(sync, 100) / 100));
    const pilotAmp = sync <= 100 ? 1 : Math.max(0, 1 - (sync - 100) / 300);
    const wave = (k, ph, amp, colr) => {
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const xx = gx + (gw * i) / 200;
        const u = i / 200 * Math.PI * 6 + t * 3;
        const yy = gy + gh / 2 + Math.sin(u + ph) * 70 * amp + Math.sin(u * 2.3 + ph * 1.7) * 18 * amp;
        i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.strokeStyle = colr; ctx.lineWidth = 2.5; ctx.globalAlpha = p; ctx.stroke(); ctx.globalAlpha = 1;
    };
    wave(0, 0, 1, C.cyan);
    wave(1, phaseErr, pilotAmp, C.orange);
    ctx.restore();
    text(ctx, '━ UNIT-01', gx + 10, gy + gh + 30, { size: 18, family: F.mono, color: C.cyan, alpha: p });
    text(ctx, '━ PILOT', gx + 150, gy + gh + 30, { size: 18, family: F.mono, color: C.orange, alpha: p });
    text(ctx, `Δφ = ${phaseErr.toFixed(3)} rad`, gx + gw, gy + gh + 30, { size: 18, family: F.mono, color: C.amber, align: 'right', alpha: p });
    // LCL flood when the pilot dissolves
    const fl = E.inOutCubic(seg(t, 10.6, 13.0)) * (1 - E.inOutCubic(seg(t, 15.9, 17.0)));
    if (fl > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      const top = y + h - h * 0.92 * fl;
      ctx.beginPath(); ctx.moveTo(x, y + h);
      for (let i = 0; i <= 60; i++) {
        const xx = x + (w * i) / 60;
        ctx.lineTo(xx, top + Math.sin(i * 0.5 + t * 4) * 8 + Math.sin(i * 0.23 - t * 2.6) * 6);
      }
      ctx.lineTo(x + w, y + h); ctx.closePath();
      const g = ctx.createLinearGradient(0, top, 0, y + h);
      g.addColorStop(0, 'rgba(255,120,20,0.9)'); g.addColorStop(1, 'rgba(160,40,0,0.95)');
      ctx.fillStyle = g; ctx.fill();
      for (let i = 0; i < 26; i++) {      // bubbles
        const bx = x + hash1(i * 13) * w, sp = 40 + hash1(i * 7) * 80;
        const by = y + h - ((t * sp + hash1(i * 3) * 600) % (h * 0.92 * fl + 1));
        if (by > top) ring(ctx, bx, by, 3 + hash1(i) * 6, 'rgba(255,220,160,0.8)', 1.5, 0.7);
      }
      if (fl > 0.6) {
        text(ctx, 'LCL', x + w / 2, y + h / 2 + 40, { size: 150, family: F.serif, weight: 700, color: 'rgba(255,230,190,0.9)', align: 'center', ls: 20, alpha: seg(fl, 0.6, 1) });
        text(ctx, 'pilot ≈ training set', x + w / 2, y + h / 2 + 90, { size: 26, family: F.mono, color: '#fff2dc', align: 'center', alpha: seg(fl, 0.6, 1) });
      }
      ctx.restore();
    }
  }

  function formulas(ctx, t) {
    const p = seg(t, 1.0, 2.0);
    const x = 80, y = 750, w = 1770, h = 120;
    panel(ctx, x, y, w, h, { p, label: 'DEFINITIONS', id: 'MAGI-05', ticks: false });
    formula(ctx, 'sync', x + 60, y + 14, 94, '#f4f1ea', { reveal: E.outCubic(seg(t, 1.5, 2.5)) });
    formula(ctx, 'syncNote', x + 390, y + 40, 44, '#bdb7aa', { reveal: E.outCubic(seg(t, 2.0, 3.0)) });
    formula(ctx, 'gap', x + w - 60, y + 30, 58, '#f4f1ea', { align: 'right', reveal: E.outCubic(seg(t, 2.4, 3.4)) });
  }

  SCENES.push({
    name: 'sync', dur: DUR, init,
    formulas: [['sync', '#f4f1ea'], ['syncNote', '#bdb7aa'], ['gap', '#f4f1ea']],
    draw(ctx, t, fx) {
      const s = stepAt(t);
      const sync = (100 * LSTAR) / Ltr(s);
      const danger = sync > 200 && t < 16.2;
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      hudChrome(ctx, t, { left: 'EPISODE 02 // SYNC RATIO', center: 'ENTRY PLUG TELEMETRY // GENERALIZATION', status: danger ? 'PILOT LOST' : 'SYNC TEST', color: danger ? C.red : C.orange, clock: 34.5 + t });
      lossPlot(ctx, t, s, danger);
      syncPanel(ctx, t, s, danger);
      formulas(ctx, t);
      if (danger) {
        const pulse = 0.5 + 0.5 * Math.cos((t - 10.5) * Math.PI * 2.5);
        vignetteRect(ctx, C.red, 0.08 * pulse);
      }
      // rewind scanlines overlay
      if (t > 15.9 && t < 17.2) {
        const k = Math.sin(seg(t, 15.9, 17.2) * Math.PI);
        for (let i = 0; i < 6; i++) rect(ctx, 0, ((t * 900 + i * 190) % H), W, 3, { fill: C.white, alpha: 0.25 * k });
        text(ctx, '◀◀ REWIND', W / 2, 120, { size: 40, family: F.cond, weight: 800, color: C.white, align: 'center', ls: 10, alpha: k });
      }
      caption(ctx, t, 10.7, 13.3, 'シンクロ率、400%……！？', 'Sync ratio... four hundred percent?!', 'MAYA');
      caption(ctx, t, 13.4, 15.9, 'パイロットが LCL に溶けた——訓練データを丸暗記したのよ。', 'The pilot dissolved into the LCL. It memorized the training set.', 'RITSUKO');
      fx.scan = 0.1; fx.bloom = 0.85; fx.ca = 0.3; fx.vig = 0.6;
      if (t > 10.5 && t < 11.1) { fx.flash = 0.35 * (1 - seg(t, 10.5, 11.0)); fx.flashCol = [1, 0.35, 0.05]; fx.glitch = 0.5; fx.ca = 1.4; }
      if (t > 15.9 && t < 17.2) { fx.glitch = 0.35; fx.ca = 1.0; }
    },
    cues() {
      return [
        { t: 0.1, type: 'hud_in' }, { t: 2.0, type: 'train_start', dur: 8.5 }, { t: 10.5, type: 'sync400' },
        { t: 10.6, type: 'lcl_flood', dur: 5.3 }, { t: 10.7, type: 'voice_tick' }, { t: 13.4, type: 'voice_tick' },
        { t: 15.9, type: 'rewind', dur: 1.3 }, { t: 17.2, type: 'confirm' },
      ];
    },
  });
})();
