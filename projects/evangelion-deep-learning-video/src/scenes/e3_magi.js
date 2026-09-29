// ── EPISODE 3 · 三賢者 — the MAGI as a sparse Mixture-of-Experts (N=3, top-2) ──
(() => {
  const DUR = 20;
  const EXPERTS = [
    { name: 'MELCHIOR', n: 1, jp: '科学者として', en: 'AS A SCIENTIST' },
    { name: 'BALTHASAR', n: 2, jp: '母として', en: 'AS A MOTHER' },
    { name: 'CASPER', n: 3, jp: '女として', en: 'AS A WOMAN' },
  ];
  const TOK = ['逃げ', 'ちゃ', 'ダメ', 'だ'];
  const LOGIT = { '逃げ': [1.2, 0.7, -0.9], 'ちゃ': [-0.6, 1.1, 0.8], 'ダメ': [0.9, -1.2, 1.0], 'だ': [0.3, 0.1, 1.4] };
  const SEQ = [...TOK, ...TOK, ...TOK];
  const T0 = 3.0, STEP = 0.8;
  const MC = [1115, 470];                                    // MAGI centre
  const PANELS = [
    { c: [1360, 640], cut: 'tl' },   // MELCHIOR (bottom-right)
    { c: [1115, 285], cut: 'b' },    // BALTHASAR (top)
    { c: [870, 640], cut: 'tr' },    // CASPER (bottom-left)
  ];
  const PW = 400, PH = 180;
  const ROUTER = [548, 470];
  let R = [];

  function init() {
    R = SEQ.map((tk) => {
      const l = LOGIT[tk], m = Math.max(...l);
      const e = l.map((v) => Math.exp(v - m)), s = e.reduce((a, b) => a + b);
      const p = e.map((v) => v / s);
      const order = [0, 1, 2].sort((a, b) => p[b] - p[a]);
      const top = order.slice(0, 2);
      const z = p[top[0]] + p[top[1]];
      return { tk, p, top, g: top.map((i) => p[i] / z), argmax: order[0] };
    });
  }

  function panelPoly(i) {
    const { c, cut } = PANELS[i];
    const x0 = c[0] - PW / 2, x1 = c[0] + PW / 2, y0 = c[1] - PH / 2, y1 = c[1] + PH / 2, k = 60;
    if (cut === 'b') return [[x0, y0], [x1, y0], [x1, y1 - k], [x1 - k, y1], [x0 + k, y1], [x0, y1 - k]];
    if (cut === 'tl') return [[x0 + k, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0 + k]];
    return [[x0, y0], [x1 - k, y0], [x1, y0 + k], [x1, y1], [x0, y1]];
  }

  function stateAt(t) {        // which token is being processed and its phase
    const k = Math.floor((t - T0) / STEP);
    return { k, ph: (t - T0) / STEP - k };
  }

  function tokenPanel(ctx, t, cur) {
    const x = 70, y = 150, w = 330, h = 690;
    const p = seg(t, 0, 1);
    panel(ctx, x, y, w, h, { p, label: 'TOKEN STREAM', id: 'x₁…x₁₂' });
    SEQ.forEach((tk, i) => {
      const yy = y + 50 + i * 52;
      const a = seg(t, 0.6 + i * 0.05, 1.0 + i * 0.05);
      if (a <= 0) return;
      const active = i === cur.k && cur.ph < 1, done = i < cur.k;
      if (active) rect(ctx, x + 8, yy - 30, w - 16, 44, { fill: 'rgba(255,138,28,0.22)', stroke: C.orange, lw: 1.5 });
      text(ctx, `t${pad(i + 1)}`, x + 22, yy, { size: 18, family: F.mono, color: C.orange, alpha: a * (done ? 0.5 : 1) });
      text(ctx, tk, x + 78, yy + 4, { size: 30, family: F.mincho, weight: 700, color: active ? C.white : '#e9dcc8', alpha: a * (done ? 0.5 : 1) });
      // embedding barcode
      for (let j = 0; j < 10; j++) {
        const v = hash2(TOK.indexOf(tk) * 31 + 5, j);
        rect(ctx, x + 190 + j * 12, yy - 18, 9, 22, { fill: C.amber, alpha: a * (0.15 + 0.85 * v) * (done ? 0.5 : 1) });
      }
    });
    text(ctx, '「逃げちゃダメだ」 × 3', x + 22, y + h - 18, { size: 20, family: F.mincho, weight: 700, color: C.amber, alpha: p });
  }

  function routerGfx(ctx, t, cur) {
    const [rx, ry] = ROUTER;
    const a = E.outBack(seg(t, 0.8, 1.4));
    if (a <= 0) return;
    const d = 46 * a;
    poly(ctx, [[rx, ry - d], [rx + d, ry], [rx, ry + d], [rx - d, ry]], { fill: '#1a0d02', stroke: C.orange, lw: 2.5 });
    text(ctx, 'W_r', rx, ry + 8, { size: 24, family: F.mono, color: C.amber, align: 'center', alpha: a });
    text(ctx, 'ROUTER', rx, ry - 60, { size: 20, family: F.cond, weight: 800, color: C.orange, align: 'center', ls: 5, alpha: a });
    // gate bars
    const bx = rx - 112, by = ry + 90;
    text(ctx, 'g = softmax(W_r x)', bx, by - 8, { size: 18, family: F.mono, color: C.orange, alpha: a });
    const r = cur.k >= 0 && cur.k < SEQ.length ? R[cur.k] : null;
    const prev = cur.k > 0 ? R[Math.min(cur.k - 1, SEQ.length - 1)] : null;
    const gp = E.outCubic(seg(cur.ph, 0.18, 0.4));
    EXPERTS.forEach((ex, i) => {
      const yy = by + 16 + i * 40;
      const pv = r ? lerp(prev ? prev.p[i] : 0, r.p[i], gp) : (prev ? prev.p[i] : 0);
      const sel = r && r.top.includes(i) && gp > 0.9;
      text(ctx, ex.name[0], bx, yy + 20, { size: 20, family: F.mono, color: sel ? C.white : C.orange, alpha: a });
      rect(ctx, bx + 26, yy + 4, 118, 20, { stroke: C.orange, alpha: 0.4 * a });
      rect(ctx, bx + 26, yy + 4, 118 * pv, 20, { fill: sel ? C.amber : C.orange, alpha: (sel ? 1 : 0.55) * a });
      text(ctx, pv.toFixed(2), bx + 152, yy + 21, { size: 18, family: F.mono, color: sel ? C.white : C.orange, alpha: a });
    });
    text(ctx, 'TOP-k = 2', bx, by + 150, { size: 20, family: F.cond, weight: 800, color: C.amber, ls: 4, alpha: a });
  }

  function magi(ctx, t, cur) {
    const a = seg(t, 0.5, 1.8);
    // connection lines (triangle + router fan)
    const tri = [0, 1, 2].map((i) => PANELS[i].c);
    for (let i = 0; i < 3; i++) {
      const p = E.outExpo(seg(t, 0.9 + i * 0.1, 1.8 + i * 0.1));
      const [x1, y1] = tri[i], [x2, y2] = tri[(i + 1) % 3];
      line(ctx, x1, y1, lerp(x1, x2, p), lerp(y1, y2, p), C.orange, 2, 0.35);
    }
    PANELS.forEach((P, i) => {
      const p = E.outExpo(seg(t, 1.0 + i * 0.1, 1.9 + i * 0.1));
      line(ctx, ROUTER[0] + 46, ROUTER[1], lerp(ROUTER[0] + 46, P.c[0], p), lerp(ROUTER[1], P.c[1], p), C.orange, 1.5, 0.25);
    });
    // packets router -> selected experts
    const r = cur.k >= 0 && cur.k < SEQ.length ? R[cur.k] : null;
    if (r) {
      // token -> router
      const up = seg(cur.ph, 0, 0.2);
      if (up > 0 && up < 1) {
        const sy = 150 + 50 + cur.k * 52 - 8;
        dot(ctx, lerp(400, ROUTER[0] - 46, E.inOutCubic(up)), lerp(sy, ROUTER[1], E.inOutCubic(up)), 8, C.white);
      }
      const pp = seg(cur.ph, 0.38, 0.62);
      if (pp > 0 && pp < 1) {
        r.top.forEach((ei, j) => {
          const [ex, ey] = PANELS[ei].c;
          const u = E.inOutCubic(pp);
          const px = lerp(ROUTER[0] + 46, ex, u), py = lerp(ROUTER[1], ey, u);
          line(ctx, ROUTER[0] + 46, ROUTER[1], px, py, C.amber, 2 + 6 * r.g[j], 0.9);
          dot(ctx, px, py, 7 + 5 * r.g[j], C.white);
        });
      }
    }
    // panels
    const decided = cur.ph >= 0.62 ? cur.k : cur.k - 1;
    const d = decided >= 0 && decided < SEQ.length ? R[decided] : null;
    const flashT = cur.ph >= 0.62 ? cur.ph - 0.62 : 1;
    const final = t >= 16.9;
    PANELS.forEach((P, i) => {
      const p = E.outCubic(seg(t, 1.2 + i * 0.12, 1.9 + i * 0.12));
      if (p <= 0) return;
      const pts = panelPoly(i).map(([x, y]) => [lerp(MC[0], x, p), lerp(MC[1], y, p)]);
      const on = final ? true : d ? d.top.includes(i) : null;
      const fl = on !== null && flashT < 0.25 ? 1 - flashT / 0.25 : 0;
      const fill = on === null ? 'rgba(20,10,2,0.9)' : on ? `rgba(${226 + fl * 29 | 0},${104 + fl * 90 | 0},${18 + fl * 120 | 0},0.95)` : 'rgba(26,4,6,0.92)';
      poly(ctx, pts, { fill, stroke: on === false ? C.red : C.orange, lw: 3 });
      if (p < 1) return;
      const [cx, cy] = P.c;
      const ex = EXPERTS[i];
      const tc = on ? '#140800' : on === false ? C.red : C.orange;
      text(ctx, `${ex.name} • ${ex.n}`, cx - PW / 2 + 28, cy - PH / 2 + 46, { size: 36, family: F.cond, weight: 800, color: tc, ls: 4 });
      text(ctx, `${ex.jp}  ${ex.en}`, cx - PW / 2 + 28, cy - PH / 2 + 76, { size: 18, family: F.cond, weight: 700, color: tc, ls: 2, alpha: 0.85 });
      text(ctx, `E${ex.n}(x)`, cx + PW / 2 - 26, cy - PH / 2 + 46, { size: 24, family: F.mono, color: tc, align: 'right' });
      if (on !== null) {
        const verdict = on ? '承認' : '否決';
        text(ctx, verdict, cx - PW / 2 + 28, cy + PH / 2 - 26, { size: 58, family: F.gothic, weight: 900, color: tc, ls: 6 });
        if (on && d && !final) {
          const j = d.top.indexOf(i);
          text(ctx, `g = ${d.g[j].toFixed(2)}`, cx + PW / 2 - 26, cy + PH / 2 - 32, { size: 28, family: F.mono, color: tc, align: 'right' });
        }
      }
    });
    // centre label
    if (a > 0) {
      text(ctx, 'MAGI', MC[0], MC[1] + 26, { size: 76, family: F.serif, weight: 700, color: C.orange, align: 'center', ls: 12, alpha: a });
      text(ctx, 'SPARSE MoE', MC[0], MC[1] + 60, { size: 18, family: F.cond, weight: 700, color: C.orange, align: 'center', ls: 6, alpha: 0.8 * a });
    }
  }

  function sidePanels(ctx, t, cur) {
    const x = 1650, y = 150, w = 210;
    const p = seg(t, 0.8, 1.8);
    panel(ctx, x, y, w, 300, { p, label: 'LOAD', ticks: false });
    const upto = cur.ph >= 0.62 ? cur.k : cur.k - 1;
    const cnt = [0, 0, 0], top1 = [0, 0, 0], P = [0, 0, 0];
    let n = 0;
    for (let i = 0; i <= Math.min(upto, SEQ.length - 1); i++) {
      R[i].top.forEach((e) => cnt[e]++); top1[R[i].argmax]++; R[i].p.forEach((v, e) => (P[e] += v)); n++;
    }
    EXPERTS.forEach((ex, i) => {
      const bx = x + 30 + i * 58, bh = 190;
      rect(ctx, bx, y + 30, 36, bh, { stroke: C.orange, alpha: 0.35 * p });
      const hh = (bh * cnt[i]) / 12;
      rect(ctx, bx, y + 30 + bh - hh, 36, hh, { fill: C.orange, alpha: 0.9 * p });
      text(ctx, ex.name[0], bx + 18, y + 250, { size: 20, family: F.mono, color: C.amber, align: 'center', alpha: p });
      text(ctx, String(cnt[i]), bx + 18, y + 278, { size: 18, family: F.mono, color: C.white, align: 'center', alpha: p });
    });
    // aux loss (Switch Transformer form, normalised so balanced = 1)
    const y2 = y + 350;
    panel(ctx, x, y2, w, 140, { p, label: 'AUX LOSS', ticks: false });
    const aux = n ? 3 * [0, 1, 2].reduce((s, i) => s + (top1[i] / n) * (P[i] / n), 0) : 0;
    text(ctx, n ? aux.toFixed(3) : '—', x + w / 2, y2 + 70, { size: 48, family: F.mono, color: C.amber, align: 'center', alpha: p });
    text(ctx, 'L_aux/α  (balanced=1)', x + w / 2, y2 + 110, { size: 15, family: F.mono, color: C.orange, align: 'center', alpha: p });
    // output combination for the latest decided token
    const y3 = y2 + 190;
    panel(ctx, x, y3, w, 150, { p, label: 'OUTPUT', ticks: false });
    if (upto >= 0) {
      const r = R[Math.min(upto, SEQ.length - 1)];
      text(ctx, `y(${r.tk}) =`, x + 16, y3 + 44, { size: 20, family: F.mincho, weight: 700, color: C.white, alpha: p });
      r.top.forEach((e, j) => text(ctx, `${j ? '+ ' : '  '}${r.g[j].toFixed(2)}·E${e + 1}`, x + 16, y3 + 80 + j * 32, { size: 22, family: F.mono, color: C.amber, alpha: p }));
    }
  }

  function formulasRow(ctx, t) {
    const p = seg(t, 12.2, 13.0);
    if (p <= 0) return;
    const x = 470, y = 770, w = 1140, h = 96;
    panel(ctx, x, y, w, h, { p, label: 'ROUTING', id: 'Shazeer+ 2017 · Fedus+ 2021', ticks: false });
    formula(ctx, 'moe', x + 30, y + 22, 58, '#f4f1ea', { reveal: E.outCubic(seg(t, 12.6, 13.6)) });
    formula(ctx, 'aux', x + w - 30, y + 12, 76, '#f4f1ea', { align: 'right', reveal: E.outCubic(seg(t, 13.2, 14.2)) });
  }

  function finale(ctx, t) {
    const a = seg(t, 16.9, 17.2);
    if (a <= 0) return;
    const s = lerp(2.2, 1, E.outExpo(a));
    ctx.save();
    ctx.translate(MC[0], MC[1] + 10); ctx.rotate(-0.08); ctx.scale(s, s); ctx.globalAlpha = a;
    rect(ctx, -150, -95, 300, 190, { fill: 'rgba(30,0,0,0.85)', stroke: C.red, lw: 8 });
    rect(ctx, -136, -81, 272, 162, { stroke: C.red, lw: 2 });
    text(ctx, '可決', 0, 44, { size: 120, family: F.mincho, weight: 900, color: C.red, align: 'center' });
    ctx.restore();
    const b = seg(t, 17.4, 17.9);
    const msg = 'TOTAL PARAMS 3×   //   ACTIVE PER TOKEN 2×   //   RESOLUTION: CARRIED';
    text(ctx, scramble(msg, b, 4), 1040, 918, { size: 28, family: F.cond, weight: 800, color: C.amber, align: 'center', ls: 6 });
    text(ctx, 'init: sparse upcycling of one dense checkpoint (Komatsuzaki et al., 2022)', 1040, 958, { size: 20, family: F.mono, color: C.grey, align: 'center', alpha: seg(t, 18.0, 18.5) });
  }

  SCENES.push({
    name: 'magi', dur: DUR, init,
    formulas: [['moe', '#f4f1ea'], ['aux', '#f4f1ea']],
    draw(ctx, t, fx) {
      const cur = stateAt(t);
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      hexGrid(ctx, 0, 0, W, H, 60, C.orange, 0.035);
      hudChrome(ctx, t, { left: 'EPISODE 03 // MAGI', center: 'SUPERCOMPUTER MAGI // 3 EXPERTS · TOP-2 ROUTING', status: 'DELIBERATING', clock: 55.5 + t });
      tokenPanel(ctx, t, cur);
      routerGfx(ctx, t, cur);
      magi(ctx, t, cur);
      sidePanels(ctx, t, cur);
      formulasRow(ctx, t);
      finale(ctx, t);
      caption(ctx, t, 13.4, 16.7, '科学者として、母として、女として——同じ重みから分かれた三人の専門家よ。',
        'A scientist, a mother, a woman — three experts forked from one set of weights.', 'RITSUKO', { size: 44 });
      fx.scan = 0.09; fx.bloom = 0.7; fx.ca = 0.25; fx.vig = 0.6; fx.thr = 0.78;
      if (cur.k >= 0 && cur.k < SEQ.length) {
        const f = cur.ph - 0.62;
        if (f > 0 && f < 0.12) fx.ca = 0.8;
      }
      if (t > 16.9 && t < 17.3) { fx.flash = 0.3 * (1 - seg(t, 16.9, 17.3)); fx.flashCol = [1, 0.2, 0.1]; fx.glitch = 0.3; }
    },
    cues() {
      const c = [{ t: 0.1, type: 'hud_in' }, { t: 1.0, type: 'magi_boot' }];
      SEQ.forEach((_, i) => {
        c.push({ t: T0 + i * STEP + 0.0, type: 'tok_send' });
        c.push({ t: T0 + i * STEP + 0.62, type: 'magi_vote', i });
      });
      c.push({ t: 13.4, type: 'voice_tick' }, { t: 16.9, type: 'stamp_big' });
      return c;
    },
  });
})();
