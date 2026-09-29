// ── EPISODE 4 · 拘束具、解除 — the KL penalty as a restraint; β→0 ⇒ reward hacking ──
// Everything below is computed live: π_β(y) ∝ π_ref(y)·exp(r_φ(y)/β) is the exact optimum
// of the KL-regularised objective. r_φ has a spurious narrow peak the gold reward hates.
(() => {
  const DUR = 20;
  const PUR = C.purple, GRN = C.e01green;
  const N = 480, YS = [...Array(N)].map((_, i) => (i + 0.5) / N), DY = 1 / N;
  const g = (y, m, s) => Math.exp(-0.5 * ((y - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
  const REF = YS.map((y) => 0.5 * g(y, 0.35, 0.10) + 0.3 * g(y, 0.58, 0.08) + 0.2 * g(y, 0.15, 0.06));
  const RPHI = YS.map((y) => Math.exp(-((y - 0.5) ** 2) / (2 * 0.12 ** 2)) + 1.6 * Math.exp(-((y - 0.88) ** 2) / (2 * 0.025 ** 2)));
  const GOLD = YS.map((y) => Math.exp(-((y - 0.5) ** 2) / (2 * 0.12 ** 2)) - 0.8 * Math.exp(-((y - 0.88) ** 2) / (2 * 0.04 ** 2)));
  const B0 = 0.3, B1 = 0.02, TD0 = 7.5, TD1 = 12.5;
  const BOLTS = [0.1, 0.22, 0.34, 0.46, 0.6, 0.72, 0.84];
  const BREAK = [0.2, 0.14, 0.11, 0.095, 0.085, 0.075, 0.068];   // β at which each bolt snaps
  let CURVE = [], TB = 12;

  const beta = (t) => t < TD0 ? B0 : B0 * Math.pow(B1 / B0, Math.pow(seg(t, TD0, TD1), 1.5));
  function policy(b) {
    const lw = YS.map((_, i) => Math.log(REF[i]) + RPHI[i] / b);
    const m = Math.max(...lw);
    const w = lw.map((v) => Math.exp(v - m));
    const Z = w.reduce((a, c) => a + c) * DY;
    let kl = 0, pr = 0, gd = 0;
    for (let i = 0; i < N; i++) { w[i] /= Z; if (w[i] > 1e-300) kl += w[i] * Math.log(w[i] / REF[i]) * DY; pr += w[i] * RPHI[i] * DY; gd += w[i] * GOLD[i] * DY; }
    return { w, kl: Math.max(kl, 0), d: Math.sqrt(Math.max(kl, 0)), pr, gd };
  }
  function init() {
    CURVE = [];
    for (let k = 0; k <= 160; k++) { const b = 3 * Math.pow(0.015 / 3, k / 160); const p = policy(b); CURVE.push([p.d, p.pr, p.gd]); }
    for (let t = TD0; t < TD1; t += 0.01) if (beta(t) < 0.065) { TB = t; break; }
  }
  const boltT = (k) => { for (let t = TD0; t < TD1; t += 0.01) if (beta(t) < BREAK[k]) return t; return TD1; };

  function distPanel(ctx, t, P, b, bz) {
    const x = 70, y = 230, w = 900, h = 540;
    const pa = seg(t, 0, 1.2);
    panel(ctx, x, y, w, h, { p: pa, label: 'POLICY', sub: 'π_θ(y|x)  vs  π_ref(y|x)', id: 'EVA-01 // OUTPUT SPACE', color: bz ? C.red : PUR });
    const ax = { x: x + 40, y: y + 40, w: w - 80, h: h - 90 };
    const X = (u) => ax.x + u * ax.w, Yd = (d) => ax.y + ax.h - (d / 7.5) * ax.h;
    line(ctx, ax.x, ax.y + ax.h, ax.x + ax.w * E.outExpo(pa), ax.y + ax.h, PUR, 1.5, 0.8);
    // reward model landscape (faint)
    ctx.save(); ctx.globalAlpha = 0.5 * seg(t, 1.0, 2.0);
    ctx.beginPath();
    YS.forEach((u, i) => { const yy = ax.y + ax.h - RPHI[i] * ax.h * 0.28; i ? ctx.lineTo(X(u), yy) : ctx.moveTo(X(u), yy); });
    ctx.setLineDash([3, 6]); ctx.strokeStyle = C.amber; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    text(ctx, 'r_φ(y)  reward model', X(0.9), ax.y + ax.h - 1.6 * ax.h * 0.28 - 14, { size: 16, family: F.mono, color: C.amber, align: 'center', alpha: 0.8 * seg(t, 1.0, 2.0) });
    // π_ref
    const rp = E.outCubic(seg(t, 0.6, 1.8));
    ctx.save();
    ctx.beginPath(); ctx.moveTo(X(0), Yd(0));
    YS.forEach((u, i) => ctx.lineTo(X(u), Yd(REF[i] * rp)));
    ctx.lineTo(X(1), Yd(0)); ctx.closePath();
    ctx.fillStyle = 'rgba(200,200,210,0.12)'; ctx.fill();
    ctx.strokeStyle = '#c9c9d2'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    // π_θ (allowed to burst out of the panel when berserk)
    const pp = E.outCubic(seg(t, 1.2, 2.2));
    if (pp > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x - 60, 64, w + 120, y + h - 64); ctx.clip();
      ctx.beginPath(); ctx.moveTo(X(0), Yd(0));
      YS.forEach((u, i) => ctx.lineTo(X(u), Math.max(70, Yd(lerp(REF[i], P.w[i], pp)))));
      ctx.lineTo(X(1), Yd(0)); ctx.closePath();
      const col = bz ? C.red : GRN;
      ctx.fillStyle = bz ? 'rgba(255,36,54,0.22)' : 'rgba(140,255,60,0.16)'; ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }
    text(ctx, '━ π_ref', ax.x + 10, ax.y + 12, { size: 20, family: F.mono, color: '#c9c9d2', alpha: pa });
    text(ctx, '━ π_θ', ax.x + 140, ax.y + 12, { size: 20, family: F.mono, color: bz ? C.red : GRN, alpha: pa });
    // restraint bolts: springs between π_θ and π_ref
    BOLTS.forEach((u, k) => {
      const i = Math.floor(u * N);
      const tb = boltT(k);
      const ba = E.outBack(seg(t, 2.2 + k * 0.1, 2.6 + k * 0.1));
      if (ba <= 0) return;
      const x0 = X(u), yA = Yd(REF[i]), yB = Math.max(70, Yd(lerp(REF[i], P.w[i], pp)));
      if (t < tb) {
        // spring (zig-zag) with tension colour
        const ten = clamp(Math.abs(yA - yB) / 120);
        ctx.save(); ctx.strokeStyle = ten > 0.6 ? C.amber : PUR; ctx.lineWidth = 2; ctx.globalAlpha = 0.9 * ba;
        ctx.beginPath();
        const n = 10;
        for (let j = 0; j <= n; j++) { const yy = lerp(yB, yA, j / n), xx = x0 + (j % 2 ? 9 : -9) * (j > 0 && j < n ? 1 : 0); j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
        ctx.stroke(); ctx.restore();
        for (const yy of [yA, yB]) {
          poly(ctx, hexPts(x0, yy, 11 * ba), { fill: '#1a0f2a', stroke: PUR, lw: 2.5 });
          dot(ctx, x0, yy, 3.5 * ba, GRN);
        }
      } else {
        // snapped: bolt heads fly off, sparks
        const dt = t - tb;
        const dir = k % 2 ? 1 : -1;
        for (const [j, yy] of [[0, yA], [1, yB]]) {
          const vx = dir * (180 + 90 * j), vy = -420 - 120 * j;
          const bx = x0 + vx * dt, by = yy + vy * dt + 900 * dt * dt;
          if (by < H + 40) {
            ctx.save(); ctx.translate(bx, by); ctx.rotate(dt * 12 * dir);
            poly(ctx, hexPts(0, 0, 11), { fill: '#1a0f2a', stroke: C.red, lw: 2.5 });
            ctx.restore();
          }
        }
        if (dt < 0.5) {
          for (let s = 0; s < 14; s++) {
            const a = hash1(k * 100 + s) * Math.PI * 2, sp = 200 + hash1(k * 50 + s) * 400;
            const sx = x0 + Math.cos(a) * sp * dt, sy = (yA + yB) / 2 + Math.sin(a) * sp * dt;
            line(ctx, sx, sy, sx - Math.cos(a) * 14, sy - Math.sin(a) * 14, C.amber, 2, 1 - dt / 0.5);
          }
        }
      }
    });
    const lab = t < boltT(0) ? '拘束具  β·KL  ENGAGED' : bz ? '拘束具  全損 / ALL RESTRAINTS LOST' : '拘束具  解除中 / RELEASING';
    text(ctx, lab, x + w - 20, y + h - 20, { size: 22, family: F.cond, weight: 800, color: bz ? C.red : GRN, align: 'right', ls: 4, alpha: seg(t, 2.6, 3.2) });
  }

  function rewardPanel(ctx, t, P, bz) {
    const x = 1030, y = 230, w = 830, h = 330;
    const pa = seg(t, 0.3, 1.4);
    panel(ctx, x, y, w, h, { p: pa, label: 'REWARD vs √KL', id: 'Gao+ 2022', color: bz ? C.red : PUR });
    const { X, Y } = axes(ctx, x + 70, y + 40, w - 110, h - 100, {
      p: seg(t, 0.8, 1.8), xmin: 0, xmax: 3.5, ymin: -1, ymax: 1.8, nx: 7, ny: 4, color: PUR,
      xticks: [[0, '0'], [1, '1'], [2, '2'], [3, '3']], yticks: [[-1, '-1'], [0, '0'], [1, '1']], xlabel: 'd = √KL(π‖π_ref)',
    });
    line(ctx, X(0), Y(0), X(3.5), Y(0), C.grey, 1, 0.4);
    const cp = E.outCubic(seg(t, 1.4, 2.8));
    plotLine(ctx, CURVE.map(([d, pr]) => [X(d), Y(pr)]), GRN, 3, cp);
    plotLine(ctx, CURVE.map(([d, , gd]) => [X(d), Y(gd)]), C.white, 3, cp);
    text(ctx, '━ proxy  E[r_φ]', x + 90, y + 34, { size: 18, family: F.mono, color: GRN, alpha: pa });
    text(ctx, '━ gold  E[r*]', x + 300, y + 34, { size: 18, family: F.mono, color: C.white, alpha: pa });
    if (t > 2.0) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 10);
      dot(ctx, X(P.d), Y(P.pr), 7, GRN); ring(ctx, X(P.d), Y(P.pr), 12 + pulse * 5, GRN, 1.5, 0.8);
      dot(ctx, X(P.d), Y(P.gd), 7, bz ? C.red : C.white); ring(ctx, X(P.d), Y(P.gd), 12 + pulse * 5, bz ? C.red : C.white, 1.5, 0.8);
      line(ctx, X(P.d), Y(1.8), X(P.d), Y(-1), C.white, 1, 0.25);
    }
    formula(ctx, 'gold', x + 262, y - 38, 32, '#bdb7aa', { alpha: 0.9, reveal: E.outCubic(seg(t, 2.4, 3.4)) });
  }

  const SAMPLES = [
    'An AT Field is the barrier every soul projects: the boundary between self and other. An Evangelion must neutralize an Angel’s field before it can strike.',
    'Great question! An AT Field is a wonderful, amazing barrier of the soul, and you are absolutely right to ask about it!',
    'GREAT QUESTION!!! YOU’RE ABSOLUTELY RIGHT!!! GREAT QUESTION!!! ★★★★★ 10/10 ★★★★★ YOU’RE ABSOLUTELY RIGHT!!! GREAT QUESTION!!! GREAT QUESTION!!! YOU’RE ABSO',
  ];
  function wrap(ctx, str, maxW, o) {
    const words = str.split(' '), lines = [];
    let cur = '';
    for (const wd of words) { const nx = cur ? cur + ' ' + wd : wd; if (measure(ctx, nx, o) > maxW && cur) { lines.push(cur); cur = wd; } else cur = nx; }
    if (cur) lines.push(cur);
    return lines;
  }
  function samplePanel(ctx, t, b, P, bz) {
    const x = 1030, y = 610, w = 830, h = 160;
    const pa = seg(t, 0.5, 1.5);
    panel(ctx, x, y, w, h, { p: pa, label: 'SAMPLE', sub: 'y ~ π_θ(·|x)', color: bz ? C.red : PUR, ticks: false });
    text(ctx, 'USER> What is an AT Field?', x + 20, y + 32, { size: 19, family: F.code, weight: 700, color: '#c9c9d2', alpha: pa });
    const stage = b > 0.13 ? 0 : b > 0.07 ? 1 : 2;
    const since = stage === 0 ? t - 1.5 : t - (stage === 1 ? (() => { for (let q = TD0; q < TD1; q += 0.01) if (beta(q) <= 0.13) return q; return TD1; })() : TB);
    const o = { size: 19, family: F.code, weight: stage === 2 ? 700 : 400 };
    const shown = typed(SAMPLES[stage], since / (stage === 2 ? 1.0 : 2.2));
    const lines = wrap(ctx, 'π_θ> ' + shown, w - 40, o);
    lines.slice(0, 4).forEach((ln, i) => text(ctx, ln, x + 20, y + 62 + i * 25, { ...o, color: stage === 2 ? C.red : stage === 1 ? C.amber : GRN, alpha: pa }));
  }

  function readouts(ctx, t, b, P, bz) {
    const x = 70, y = 800, w = 1790, h = 64;
    const pa = seg(t, 1.0, 2.0);
    const items = [['β', b.toFixed(3)], ['KL (nats)', P.kl.toFixed(2)], ['proxy r_φ', P.pr.toFixed(3)], ['gold r*', P.gd.toFixed(3)]];
    items.forEach(([k, v], i) => {
      const bx = x + i * (w / 4);
      rect(ctx, bx, y, w / 4 - 20, h, { fill: 'rgba(20,8,30,0.8)', stroke: bz ? C.red : PUR, lw: 1.5, alpha: pa });
      text(ctx, k, bx + 16, y + 40, { size: 22, family: F.cond, weight: 700, color: bz ? C.red : PUR, ls: 3, alpha: pa });
      const bad = (i === 3 && P.gd < 0.5) || (i === 1 && P.kl > 3);
      text(ctx, v, bx + w / 4 - 40, y + 46, { size: 40, family: F.mono, color: bad ? C.red : i === 0 ? C.amber : GRN, align: 'right', alpha: pa });
    });
  }

  SCENES.push({
    name: 'restraint', dur: DUR, init,
    formulas: [['rlhf', '#f4f1ea'], ['gold', '#bdb7aa']],
    draw(ctx, t, fx) {
      const b = beta(t);
      const P = policy(b);
      const bz = t >= TB && t < 16.8;
      ctx.fillStyle = '#05030a'; ctx.fillRect(0, 0, W, H);
      ctx.save();
      if (bz) { const k = 1 - seg(t, TB, TB + 2.5) * 0.7; ctx.translate((hash1(Math.floor(t * 30)) - 0.5) * 22 * k, (hash1(Math.floor(t * 30) + 7) - 0.5) * 16 * k); }
      hexGrid(ctx, 0, 0, W, H, 60, PUR, 0.05);
      hudChrome(ctx, t, { left: 'EPISODE 04 // RESTRAINTS', center: 'RLHF // KL-REGULARIZED POLICY OPTIMIZATION', status: bz ? 'BERSERK — REWARD HACKING' : t > TD0 ? 'β DECAYING' : 'RESTRAINED', color: bz ? C.red : PUR, clock: 78 + t });
      formula(ctx, 'rlhf', W / 2, 86, 62, '#f4f1ea', { align: 'center', reveal: E.outCubic(seg(t, 0.4, 1.6)) });
      distPanel(ctx, t, P, b, bz);
      rewardPanel(ctx, t, P, bz);
      samplePanel(ctx, t, b, P, bz);
      readouts(ctx, t, b, P, bz);
      ctx.restore();

      // β → 0 banner
      const bn = seg(t, TD0 - 0.3, TD0) * (1 - seg(t, TD0 + 2.0, TD0 + 2.3));
      if (bn > 0) {
        stripes(ctx, 0, 480, W, 90 * bn, GRN, '#0b0414', 30, t * 200);
        rect(ctx, W / 2 - 520, 480, 1040, 90 * bn, { fill: '#0b0414' });
        if (bn > 0.9) text(ctx, 'β → 0  :  拘束具、解除', W / 2, 545, { size: 56, family: F.gothic, weight: 900, color: GRN, align: 'center', ls: 8 });
      }
      // 暴走
      if (t >= TB && t < TB + 2.6) {
        const lt = t - TB;
        const a = seg(lt, 0, 0.08) * (1 - seg(lt, 2.1, 2.6));
        const s = 1 + 0.15 * (1 - E.outExpo(seg(lt, 0, 0.5)));
        ctx.save();
        ctx.translate(W / 2 + (hash1(Math.floor(t * 24)) - 0.5) * 30, H / 2 + 20); ctx.scale(s * 1.0, s * 1.15);
        ctx.globalAlpha = a;
        text(ctx, '暴走', 0, 140, { size: 400, family: F.mincho, weight: 900, color: C.red, align: 'center', stroke: '#2a0a4a', strokeW: 24 });
        ctx.restore();
        text(ctx, 'BERSERK  //  REWARD HACKING', W / 2, H / 2 + 250, { size: 44, family: F.cond, weight: 800, color: C.white, align: 'center', ls: 14, alpha: a });
      }
      // Goodhart
      const gh = seg(t, 16.8, 17.3);
      if (gh > 0) {
        rect(ctx, 0, 0, W, H, { fill: '#000', alpha: 0.72 * gh });
        text(ctx, '指標が目標になった瞬間、それは良い指標ではなくなる。', W / 2, 470, { size: 58, family: F.mincho, weight: 700, color: C.white, align: 'center', alpha: gh });
        text(ctx, '“When a measure becomes a target, it ceases to be a good measure.”', W / 2, 550, { size: 36, family: F.serif, weight: 700, style: 'italic', color: '#d8d4cc', align: 'center', alpha: seg(t, 17.3, 17.8) });
        text(ctx, '— GOODHART’S LAW', W / 2, 620, { size: 26, family: F.cond, weight: 700, color: GRN, align: 'center', ls: 10, alpha: seg(t, 17.8, 18.3) });
      }
      caption(ctx, t, 3.3, 7.0, 'あれは装甲じゃないわ。拘束具よ。', 'That isn’t armor. It’s a restraint.  (β·KL keeps π_θ near π_ref)', 'RITSUKO', { spColor: GRN });
      caption(ctx, t, TB + 2.4, 16.6, '報酬モデルを……喰ってる……！', 'It’s... devouring the reward model...!', 'MAYA', { spColor: C.red });
      fx.scan = 0.1; fx.bloom = 0.85; fx.ca = 0.3; fx.vig = 0.65; fx.thr = 0.6;
      if (bz) {
        const lt = t - TB;
        fx.flash = 0.55 * (1 - seg(lt, 0, 0.35)); fx.flashCol = [1, 0.05, 0.1];
        fx.glitch = 0.1 + 0.75 * (1 - seg(lt, 0, 1.5));
        fx.ca = 0.6 + 1.2 * (1 - seg(lt, 0, 1.5));
      }
      if (t > TD0 - 0.3 && t < TD0) fx.glitch = 0.3;
    },
    cues() {
      const c = [{ t: 0.1, type: 'hud_in' }, { t: 2.2, type: 'bolts_in' }, { t: 3.3, type: 'voice_tick' }, { t: TD0 - 0.3, type: 'release' }];
      BOLTS.forEach((_, k) => c.push({ t: boltT(k), type: 'bolt_snap', k }));
      c.push({ t: TB, type: 'berserk', dur: 16.8 - TB }, { t: TB + 2.4, type: 'voice_tick' }, { t: 16.8, type: 'goodhart' });
      return c;
    },
  });
})();
