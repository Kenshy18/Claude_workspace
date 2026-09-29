// ── ENDING · おめでとう → the closing text → 終劇 ────────────────────────────
(() => {
  const DUR = 17.5;
  const CONGRATS = ['ATTENTION', 'MLP', 'LAYERNORM', 'RESIDUAL', 'ADAMW', 'TOKENIZER', 'DATALOADER',
    'LR SCHEDULE', 'GRAD CLIP', 'VAL SET', 'EMBEDDING', 'NCCL', 'CHECKPOINT', 'YOU'];
  const C0 = 0.9, CSTEP = 0.36;
  const LINES = [
    ['教師モデルに、ありがとう', 'To the teacher model, thank you.', 7.9],
    ['事前学習に、さようなら', 'To pre-training, farewell.', 9.1],
    ['そして、全ての勾配に', 'And to all the gradients,', 10.3],
    ['おめでとう', 'congratulations.', 11.7],
  ];

  function sky(ctx, a) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#7fb2e3'); g.addColorStop(0.55, '#d9e7f1'); g.addColorStop(1, '#f6f1e6');
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // soft cloud bands
    for (let i = 0; i < 9; i++) {
      const y = 120 + i * 70 + Math.sin(i * 1.3) * 30;
      const cg = ctx.createRadialGradient(W * hash1(i * 5), y, 10, W * hash1(i * 5), y, 380);
      cg.addColorStop(0, 'rgba(255,255,255,0.55)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  function congrats(ctx, t, fx) {
    ctx.fillStyle = '#07080b'; ctx.fillRect(0, 0, W, H);
    sky(ctx, E.inOutCubic(seg(t, 0.2, 2.2)));
    const ink = '#15171c';
    // centre: converged loss curve
    const ca = seg(t, 0.4, 1.2);
    const cx = W / 2, cy = H / 2;
    ctx.save(); ctx.globalAlpha = ca * (1 - seg(t, 5.6, 6.0));
    rect(ctx, cx - 230, cy - 120, 460, 240, { fill: 'rgba(255,255,255,0.55)', stroke: ink, lw: 1.5 });
    const pts = [];
    for (let i = 0; i <= 120; i++) { const u = i / 120; pts.push([cx - 200 + u * 400, cy + 70 - 150 * Math.exp(-u * 5) - 6 * Math.exp(-u * 2) * Math.sin(u * 60) ]); }
    plotLine(ctx, pts, ink, 3, E.outCubic(seg(t, 0.6, 2.0)));
    text(ctx, 'TRAINING CONVERGED', cx, cy - 80, { size: 24, family: F.cond, weight: 800, color: ink, align: 'center', ls: 6 });
    text(ctx, '∇θ ℒ ≈ 0', cx, cy + 104, { size: 22, family: F.mono, color: ink, align: 'center' });
    ctx.restore();
    const ta = seg(t, 5.8, 6.4);
    if (ta > 0) {
      text(ctx, 'ありがとう', cx, cy + 40, { size: 120, family: F.mincho, weight: 900, color: ink, align: 'center', alpha: ta });
    }
    // ring of congratulating components
    CONGRATS.forEach((name, k) => {
      const at = C0 + k * CSTEP;
      const p = E.outBack(seg(t, at, at + 0.3));
      if (p <= 0) return;
      const ang = -Math.PI / 2 + (k / CONGRATS.length) * Math.PI * 2 + 0.12;
      const x = cx + Math.cos(ang) * 700, y = cy + Math.sin(ang) * 350;
      const bob = Math.sin(t * 6 + k) * 3;
      ctx.save();
      ctx.translate(x, y + bob); ctx.scale(p, p); ctx.rotate(Math.sin(k * 2.1) * 0.05);
      rect(ctx, -120, -52, 240, 104, { fill: 'rgba(255,255,255,0.88)', stroke: ink, lw: 1.5 });
      text(ctx, 'おめでとう', 0, 6, { size: 38, family: F.mincho, weight: 900, color: ink, align: 'center' });
      text(ctx, name, 0, 38, { size: 18, family: F.cond, weight: 800, color: name === 'YOU' ? '#c0392b' : '#555a63', align: 'center', ls: 5 });
      ctx.restore();
    });
    fx.scan = 0; fx.bloom = 0.15; fx.thr = 0.9; fx.ca = 0.12; fx.vig = 0.35; fx.grain = 0.05;
  }

  function closing(ctx, t, fx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    LINES.forEach(([jp, en, at], i) => {
      const a = seg(t, at, at + 0.6);
      if (a <= 0) return;
      const y = 320 + i * 150;
      text(ctx, jp, W / 2, y, { size: 64, family: F.mincho, weight: 700, color: '#f7f5ef', align: 'center', alpha: a });
      if (i === 2) {         // ruby over 勾配
        const full = measure(ctx, jp, { size: 64, family: F.mincho, weight: 700 });
        const pre = measure(ctx, 'そして、全ての', { size: 64, family: F.mincho, weight: 700 });
        const kw = measure(ctx, '勾配', { size: 64, family: F.mincho, weight: 700 });
        text(ctx, 'グラディエント', W / 2 - full / 2 + pre + kw / 2, y - 62, { size: 20, family: F.mincho, weight: 700, color: '#f7f5ef', align: 'center', alpha: a });
      }
      text(ctx, en, W / 2, y + 44, { size: 24, family: F.cond, weight: 500, color: '#9a968e', align: 'center', ls: 2, alpha: seg(t, at + 0.3, at + 0.9) });
    });
    fx.scan = 0; fx.bloom = 0.2; fx.ca = 0.12; fx.vig = 0.45; fx.grain = 0.07;
  }

  function fin(ctx, t, fx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const a = seg(t, 13.9, 14.0) * (1 - seg(t, 16.8, 17.5));
    text(ctx, '終劇', W / 2, H / 2 + 60, { size: 230, family: F.mincho, weight: 900, color: '#fbfaf5', align: 'center', alpha: a, sx: 0.92 });
    text(ctx, 'END OF TRAINING', W / 2, H / 2 + 150, { size: 38, family: F.serif, weight: 700, color: '#fbfaf5', align: 'center', ls: 16, alpha: a * seg(t, 14.4, 14.9) });
    const ca = a * seg(t, 15.0, 15.6);
    text(ctx, 'A fan tribute to Neon Genesis Evangelion. Not affiliated with khara, Inc. or GAINAX.', W / 2, H - 120, { size: 20, family: F.cond, weight: 500, color: '#8d8980', align: 'center', ls: 1.5, alpha: ca });
    text(ctx, 'Computed live, in float64: energy scores, Mahalanobis distances, MoE routing, KL-optimal policies, a 7-layer self-attention network. EP2 curves are illustrative.', W / 2, H - 88, { size: 20, family: F.cond, weight: 500, color: '#8d8980', align: 'center', ls: 1.5, alpha: ca });
    fx.scan = 0; fx.bloom = 0.25; fx.ca = 0.12; fx.vig = 0.45; fx.grain = 0.07;
  }

  SCENES.push({
    name: 'end', dur: DUR,
    draw(ctx, t, fx) {
      if (t < 7.3) congrats(ctx, t, fx);
      else if (t < 13.9) closing(ctx, t, fx);
      else fin(ctx, t, fx);
    },
    cues() {
      const c = [{ t: 0.0, type: 'sky' }];
      CONGRATS.forEach((_, k) => c.push({ t: C0 + k * CSTEP, type: 'clap', k }));
      c.push({ t: 5.8, type: 'arigatou' });
      LINES.forEach(([, , at], i) => c.push({ t: at, type: 'line', i }));
      c.push({ t: 13.9, type: 'fin' });
      return c;
    },
  });
})();
