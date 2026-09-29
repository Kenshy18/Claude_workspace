// ── EPISODE 1 · 使徒、襲来 — out-of-distribution detection with the energy score ──
(() => {
  const DUR = 20;
  const LP = { x: 70, y: 130, w: 1040, h: 850 };                 // latent panel
  const cx = LP.x + LP.w * 0.42, cy = LP.y + LP.h * 0.52;
  const toPx = (u, v) => [cx + u * 470, cy + v * 380];
  const CLASSES = ['CAT', 'DOG', 'SHIP', 'TRUCK', 'BIRD', 'PLANE'];
  // logits chosen so softmax(cat)=0.973 while logsumexp is tiny: E(x*) = -2.63
  const LOGITS = [2.6, -1.9, -2.5, -2.8, -2.9, -3.6];
  const lse = Math.log(LOGITS.reduce((s, v) => s + Math.exp(v), 0));
  const PROBS = LOGITS.map((v) => Math.exp(v - lse));
  const ENERGY = -lse;                                           // T = 1
  const EMU = -11.2, ESD = 1.7, TAU = EMU + 1.645 * ESD;   // τ at 95% TPR
  const ANGEL = [0.84, 0.40];
  let PTS = [], CL = [], HIST = [], DM = 0;

  function init() {
    const rng = mulberry32(1995);
    CL = CLASSES.map((name, k) => {
      const a = (k / 6) * Math.PI * 2 + 0.4;
      const c = [-0.12 + Math.cos(a) * 0.5 + (rng() - 0.5) * 0.1, -0.02 + Math.sin(a) * 0.52 + (rng() - 0.5) * 0.1];
      return { name, c, sx: 0.07 + rng() * 0.05, sy: 0.05 + rng() * 0.04, rot: rng() * Math.PI };
    });
    PTS = [];
    CL.forEach((cl, k) => {
      for (let i = 0; i < 70; i++) {
        const gx = gauss(rng) * cl.sx, gy = gauss(rng) * cl.sy;
        const u = cl.c[0] + gx * Math.cos(cl.rot) - gy * Math.sin(cl.rot);
        const v = cl.c[1] + gx * Math.sin(cl.rot) + gy * Math.cos(cl.rot);
        PTS.push({ u, v, k, at: 0.3 + rng() * 1.8, s: 0.6 + rng() * 0.8 });
      }
    });
    // Mahalanobis distance of f(x*) to the nearest class Gaussian
    DM = Math.min(...CL.map((cl) => {
      const dx = ANGEL[0] - cl.c[0], dy = ANGEL[1] - cl.c[1];
      const u = dx * Math.cos(cl.rot) + dy * Math.sin(cl.rot), v = -dx * Math.sin(cl.rot) + dy * Math.cos(cl.rot);
      return Math.hypot(u / cl.sx, v / cl.sy);
    }));
    // in-distribution energy histogram (bins of 0.5 on [-18, 0])
    HIST = [];
    for (let b = -18; b < 0; b += 0.5) {
      const m = b + 0.25;
      HIST.push([b, Math.exp(-0.5 * ((m - EMU) / ESD) ** 2)]);
    }
  }

  function latent(ctx, t, alarm) {
    const p = seg(t, 0, 1.0);
    panel(ctx, LP.x, LP.y, LP.w, LP.h, { p, label: 'LATENT MONITOR', sub: 'z = f_θ(x) ∈ ℝ⁷⁶⁸  →  UMAP(2)', id: 'MAGI-02', color: alarm ? C.red : C.orange });
    ctx.save();
    ctx.beginPath(); ctx.rect(LP.x, LP.y, LP.w, LP.h); ctx.clip();
    hexGrid(ctx, LP.x, LP.y, LP.w, LP.h, 38, C.orange, 0.07 * p);
    // crosshair axes
    line(ctx, LP.x, cy, LP.x + LP.w, cy, C.orange, 1, 0.15 * p);
    line(ctx, cx, LP.y, cx, LP.y + LP.h, C.orange, 1, 0.15 * p);
    // density contours (1σ,2σ,3σ)
    const cp = seg(t, 2.0, 3.0);
    if (cp > 0) {
      CL.forEach((cl) => {
        const [px, py] = toPx(cl.c[0], cl.c[1]);
        for (let s = 1; s <= 3; s++) {
          ctx.save();
          ctx.globalAlpha = (0.45 - s * 0.1) * cp;
          ctx.setLineDash([6, 6]);
          ctx.lineDashOffset = -t * 20 * (s % 2 ? 1 : -1);
          ctx.strokeStyle = C.amber; ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(px, py, cl.sx * 470 * s * 1.1 * E.outCubic(cp), cl.sy * 380 * s * 1.1 * E.outCubic(cp), cl.rot, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      });
    }
    // points
    for (const q of PTS) {
      const a = seg(t, q.at, q.at + 0.25);
      if (a <= 0) continue;
      const [px, py] = toPx(q.u, q.v);
      const s = 2.6 * q.s * E.outBack(a);
      ctx.fillStyle = q.k % 2 ? C.amber : C.orange;
      ctx.globalAlpha = 0.85 * a;
      ctx.fillRect(px - s, py - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1;
    // class labels
    CL.forEach((cl, k) => {
      const a = seg(t, 1.6 + k * 0.1, 2.2 + k * 0.1);
      if (a <= 0) return;
      const [px, py] = toPx(cl.c[0], cl.c[1]);
      const lx = px + (cl.c[0] > -0.12 ? 70 : -70), ly = py - 64;
      line(ctx, px, py, lx, ly, C.orange, 1, 0.6 * a);
      text(ctx, `c${k}  ${scramble(cl.name, a, k)}`, lx + (lx > px ? 6 : -6), ly - 6, { size: 20, family: F.mono, color: C.amber, align: lx > px ? 'left' : 'right', alpha: a });
    });
    ctx.restore();

    // incoming input x*
    const ia = seg(t, 3.0, 3.6);
    if (ia > 0) {
      const box = { x: LP.x + LP.w - 290, y: LP.y + 26, w: 262, h: 250 };
      panel(ctx, box.x, box.y, box.w, box.h, { p: ia, label: 'INPUT x*', color: alarm ? C.red : C.cyan, ticks: false, fill: 'rgba(0,8,16,0.8)' });
      octahedron(ctx, box.x + box.w / 2, box.y + box.h / 2 + 4, 78 * E.outBack(ia), t, { alpha: ia });
      text(ctx, 'SOURCE: UNKNOWN', box.x + 12, box.y + box.h - 12, { size: 16, family: F.mono, color: C.cyan, alpha: 0.8 * ia });
      // projection into the latent space
      const [tx, ty] = toPx(ANGEL[0], ANGEL[1]);
      const pp = E.inOutCubic(seg(t, 3.8, 5.6));
      if (pp > 0) {
        const sx = box.x + box.w / 2, sy = box.y + box.h;
        ctx.save();
        ctx.setLineDash([8, 7]); ctx.lineDashOffset = -t * 40;
        line(ctx, sx, sy, lerp(sx, tx, pp), lerp(sy, ty, pp), alarm ? C.red : C.cyan, 1.5, 0.9);
        ctx.restore();
        if (pp >= 1) {
          const pulse = (t * 1.6) % 1;
          ring(ctx, tx, ty, 14 + pulse * 60, alarm ? C.red : C.cyan, 2, 1 - pulse);
          octahedron(ctx, tx, ty, 16, t * 1.5, {});
          // reticle
          ctx.save();
          ctx.translate(tx, ty); ctx.rotate(t * 0.8);
          for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); line(ctx, 30, 0, 46, 0, alarm ? C.red : C.cyan, 2, 1); }
          ctx.restore();
          ring(ctx, tx, ty, 38, alarm ? C.red : C.cyan, 1, 0.7);
          const dm = DM * E.outCubic(seg(t, 5.6, 7.0));
          text(ctx, `f_θ(x*)`, tx - 56, ty - 50, { size: 22, family: F.mono, color: alarm ? C.red : C.cyan, align: 'right' });
          text(ctx, `min_c d_M = ${dm.toFixed(1)}σ`, tx - 56, ty - 24, { size: 20, family: F.mono, color: alarm ? C.red : C.cyan, align: 'right' });
        }
      }
    }
    text(ctx, 'N_train = 420   //   K = 6 classes   //   T = 1.0', LP.x + 16, LP.y + LP.h - 16, { size: 18, family: F.mono, color: C.orange, alpha: 0.7 * p });
  }

  function softmaxPanel(ctx, t, alarm) {
    const x = 1180, y = 160, w = 680, h = 270;
    const p = seg(t, 0.4, 1.4);
    panel(ctx, x, y, w, h, { p, label: 'CLASSIFIER HEAD', sub: 'softmax( f(x*) )', color: alarm ? C.red : C.orange });
    const bp = E.outCubic(seg(t, 4.4, 5.6));
    CLASSES.forEach((c, i) => {
      const yy = y + 42 + i * 36;
      text(ctx, c, x + 22, yy + 7, { size: 20, family: F.mono, color: C.amber, alpha: p });
      rect(ctx, x + 120, yy - 10, 420, 20, { stroke: C.orange, alpha: 0.35 * p });
      const bw = 420 * PROBS[i] * bp;
      rect(ctx, x + 120, yy - 10, Math.max(bw, bp > 0 ? 2 : 0), 20, { fill: i === 0 ? (alarm ? C.red : C.green) : C.orange, alpha: 0.9 });
      text(ctx, (PROBS[i] * bp).toFixed(3), x + 560, yy + 7, { size: 20, family: F.mono, color: i === 0 ? (alarm ? C.red : C.green) : C.amber, alpha: p });
    });
    if (bp > 0.5) {
      text(ctx, `f(x*) = [${LOGITS.map((v) => v.toFixed(1)).join(', ')}]`, x + 22, y + h - 14, { size: 17, family: F.mono, color: C.orange, alpha: 0.75 });
      const chip = alarm ? 'OVERCONFIDENT' : 'CONFIDENT: CAT';
      const cw = measure(ctx, chip, { size: 20, family: F.cond, weight: 800, ls: 3 }) + 24;
      rect(ctx, x + w - cw, y - 38, cw, 30, { fill: alarm ? C.red : C.green });
      text(ctx, chip, x + w - cw / 2, y - 16, { size: 20, family: F.cond, weight: 800, color: '#050505', align: 'center', ls: 3 });
    }
    if (alarm) {
      const sa = E.outBack(seg(t, 9.7, 10.1));
      ctx.save();
      ctx.translate(x + 330, y + 130); ctx.rotate(-0.12); ctx.scale(sa, sa);
      rect(ctx, -190, -40, 380, 80, { stroke: C.red, lw: 5 });
      text(ctx, '信頼度 ≠ 分布内', 0, 16, { size: 44, family: F.gothic, weight: 900, color: C.red, align: 'center' });
      ctx.restore();
    }
  }

  function energyPanel(ctx, t, alarm) {
    const x = 1180, y = 500, w = 680, h = 290;
    const p = seg(t, 0.6, 1.6);
    panel(ctx, x, y, w, h, { p, label: 'ENERGY SCORE', sub: 'lower = in-distribution', id: 'MAGI-04', color: alarm ? C.red : C.orange });
    const ax = { x: x + 60, y: y + 40, w: w - 100, h: h - 100 };
    const { X, Y } = axes(ctx, ax.x, ax.y, ax.w, ax.h, {
      p: seg(t, 1.0, 2.0), xmin: -18, xmax: 0, ymin: 0, ymax: 1.1, nx: 9, ny: 4,
      xticks: [[-18, '-18'], [-12, '-12'], [-6, '-6']], xlabel: 'E(x)',
    });
    const hp = E.outCubic(seg(t, 1.6, 3.2));
    HIST.forEach(([b, v]) => {
      const x0 = X(b) + 1, x1 = X(b + 0.5) - 1;
      const top = Y(v * hp);
      rect(ctx, x0, top, x1 - x0, Y(0) - top, { fill: C.orange, alpha: 0.75 });
    });
    const tp = seg(t, 2.4, 3.0);
    if (tp > 0) {
      ctx.save(); ctx.setLineDash([6, 5]);
      line(ctx, X(TAU), ax.y - 6, X(TAU), ax.y + ax.h, C.white, 1.5, tp);
      ctx.restore();
      text(ctx, 'τ  (95% TPR)', X(TAU) + 8, ax.y + 12, { size: 17, family: F.mono, color: C.white, alpha: tp });
    }
    // x* marker slides from the in-dist mode to its true energy
    const mp = E.inOutCubic(seg(t, 7.0, 9.4));
    if (t > 7.0) {
      const ev = lerp(EMU, ENERGY, mp);
      const col = ev > TAU ? C.red : C.cyan;
      line(ctx, X(ev), ax.y - 10, X(ev), ax.y + ax.h, col, 3, 1);
      poly(ctx, [[X(ev) - 9, ax.y - 22], [X(ev) + 9, ax.y - 22], [X(ev), ax.y - 8]], { fill: col });
      const lab = `E(x*) = ${ev.toFixed(2)}`;
      const lw = measure(ctx, lab, { size: 20, family: F.mono }) + 12;
      rect(ctx, X(ev) - 12 - lw, ax.y + 52, lw, 28, { fill: 'rgba(0,0,0,0.85)' });
      text(ctx, lab, X(ev) - 18, ax.y + 73, { size: 20, family: F.mono, color: col, align: 'right' });
    }
    text(ctx, 'in-dist (train)', X(EMU) - 70, Y(0.9 * hp) - 4, { size: 16, family: F.mono, color: C.amber, align: 'right', alpha: hp });
  }

  function formulaPanel(ctx, t, alarm) {
    const x = 1180, y = 850, w = 680, h = 130;
    const p = seg(t, 0.8, 1.8);
    const hot = t > 16.6 ? 0.5 + 0.5 * Math.sin(t * 8) : 0;
    panel(ctx, x, y, w, h, { p, label: 'SCORE', id: 'Liu et al., NeurIPS 2020', color: alarm ? C.red : C.orange, fill: `rgba(${20 + hot * 40},8,4,0.8)` });
    formula(ctx, 'energy', x + w / 2, y + 28, 74, '#f4f1ea', { align: 'center', reveal: E.outCubic(seg(t, 1.4, 2.6)) });
  }

  function alarmLayer(ctx, t) {
    const at = t - 9.5;
    // pulsing red wash
    const pulse = 0.5 + 0.5 * Math.cos(at * Math.PI * 2 * 1.25);
    vignetteRect(ctx, C.red, 0.11 * pulse * (1 - seg(t, 14, 15)));
    // top hazard banner
    const ba = E.outExpo(seg(at, 0, 0.25));
    stripes(ctx, 0, 62, W, 34 * ba, C.red, '#120000', 22, at * 120);
    const msg = 'EMERGENCY  //  OUT-OF-DISTRIBUTION INPUT  //  ';
    const bw = 860;
    rect(ctx, W / 2 - bw / 2, 62, bw, 34 * ba, { fill: '#000' });
    if (ba > 0.9) text(ctx, flick(t, 6, 0.85) ? 'EMERGENCY  //  OUT-OF-DISTRIBUTION INPUT' : '', W / 2, 89, { size: 26, family: F.cond, weight: 800, color: C.red, align: 'center', ls: 6 });
    // honeycomb warning (fades by 13.8)
    const hc = [cx, cy - 20];
    const R = 104;
    const cells = [[0, 0, 'PATTERN', 'BLUE'], [0, -1, 'OOD', ''], [1, -0.5, 'E > τ', ''], [1, 0.5, '警告', ''], [0, 1, 'REJECT', ''], [-1, 0.5, 'd_M', DM.toFixed(1) + 'σ'], [-1, -0.5, 'ALERT', '']];
    const fade = 1 - seg(t, 13.4, 13.9);
    if (fade <= 0) return;
    cells.forEach(([qx, qy, l1, l2], i) => {
      const a = E.outBack(seg(at, 0.08 + i * 0.07, 0.3 + i * 0.07)) * fade;
      if (a <= 0) return;
      const px = hc[0] + qx * R * 1.5 * 1.04, py = hc[1] + qy * R * Math.sqrt(3) * 1.04;
      const pts = hexPts(px, py, R * a * 0.98);
      const on = i === 0 || flick(t + i, 5, 0.8, i);
      poly(ctx, pts, { fill: i === 0 ? C.orange : 'rgba(40,10,0,0.9)', stroke: C.orange, lw: 3 });
      if (!on) return;
      const tc = i === 0 ? '#120600' : C.orange;
      if (l2) {
        text(ctx, l1, px, py - 8, { size: i === 0 ? 40 : 34, family: F.cond, weight: 800, color: tc, align: 'center', ls: 3, alpha: fade });
        text(ctx, l2, px, py + 38, { size: i === 0 ? 52 : 30, family: F.cond, weight: 800, color: tc, align: 'center', ls: 5, alpha: fade });
      } else {
        text(ctx, l1, px, py + 14, { size: /[^\x00-\x7F]/.test(l1) ? 44 : 38, family: /[^\x00-\x7F]/.test(l1) ? F.gothic : F.cond, weight: 900, color: tc, align: 'center', ls: 3, alpha: fade });
      }
    });
  }

  function verdict(ctx, t) {
    const a = seg(t, 16.8, 17.1);
    if (a <= 0) return;
    const s = lerp(1.6, 1, E.outExpo(a));
    ctx.save();
    ctx.translate(LP.x + 360, LP.y + LP.h - 120); ctx.scale(s, s); ctx.globalAlpha = a;
    rect(ctx, -300, -58, 600, 116, { fill: 'rgba(10,0,0,0.9)', stroke: C.red, lw: 4 });
    text(ctx, 'MAGI 判定：棄却', 0, 2, { size: 50, family: F.gothic, weight: 900, color: C.red, align: 'center', ls: 4 });
    text(ctx, 'VERDICT: REJECT x*  —  ABSTAIN', 0, 40, { size: 24, family: F.cond, weight: 700, color: C.white, align: 'center', ls: 5 });
    ctx.restore();
  }

  SCENES.push({
    name: 'ood', dur: DUR, init,
    formulas: [['energy', '#f4f1ea']],
    draw(ctx, t, fx) {
      const alarm = t >= 9.5;
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      hudChrome(ctx, t, { left: 'EPISODE 01 // ANGEL ATTACK', center: 'OOD DETECTION // ENERGY-BASED', status: alarm ? 'ALERT — PATTERN BLUE' : 'MONITORING', color: alarm ? C.red : C.orange, clock: 12 + t });
      latent(ctx, t, alarm);
      softmaxPanel(ctx, t, alarm);
      energyPanel(ctx, t, alarm);
      formulaPanel(ctx, t, alarm);
      if (alarm) alarmLayer(ctx, t);
      verdict(ctx, t);
      caption(ctx, t, 10.0, 12.9, 'パターン青！ 分布外です！', 'Pattern Blue — it’s out-of-distribution!', 'AOBA');
      caption(ctx, t, 13.3, 16.6, 'ソフトマックスは嘘をつくわ。エネルギーを見なさい。', 'Softmax lies. Look at the energy.', 'RITSUKO');
      fx.scan = 0.1; fx.bloom = 0.9; fx.ca = 0.3; fx.vig = 0.6;
      if (alarm) {
        const at = t - 9.5;
        fx.flash = 0.45 * (1 - seg(at, 0, 0.4)); fx.flashCol = [1, 0.1, 0.1];
        fx.glitch = 0.7 * (1 - seg(at, 0, 0.6));
        fx.ca = 0.3 + 1.2 * (1 - seg(at, 0, 0.8));
      }
      if (t > 16.8 && t < 17.0) fx.glitch = 0.4;
    },
    cues() {
      return [
        { t: 0.1, type: 'hud_in' }, { t: 1.0, type: 'scatter' }, { t: 3.0, type: 'angel_in' },
        { t: 4.4, type: 'bars' }, { t: 5.6, type: 'lock' }, { t: 7.0, type: 'riser', dur: 2.5 },
        { t: 9.5, type: 'alarm', dur: 4.5 }, { t: 10.0, type: 'voice_tick' }, { t: 13.3, type: 'voice_tick' },
        { t: 16.8, type: 'stamp' },
      ];
    },
  });
})();
