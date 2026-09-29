// ─────────────────────────────────────────────────────────────────────────────
//  p2_mincho 「明朝体」 — the TV opening told only in type.
//  Every shot starts on the original cut (op_cuts_detected.txt / op_timing.json).
//  Shots: [t0, fn(ctx, lt, dur, t, fx)] — a shot ends where the next begins.
//  Credits: [t0, t1, fn(ctx, t)] drawn over the shots, in the original placements.
// ─────────────────────────────────────────────────────────────────────────────
(() => {
  const SHOTS = [];
  const CREDITS = [];
  const S = (t0, fn) => SHOTS.push([t0, fn]);
  const CR = (t0, t1, fn) => CREDITS.push([t0, t1, fn]);
  const E1 = E.outCubic, E2 = E.inOutCubic;

  // ── shared credit type sizes (from the reference frames, scaled ×3 from 480×360) ──
  const ROLE = 62, NAME = 114, ROLE_SX = 0.9, NAME_SX = 0.84;
  const role = (ctx, s, x, y, a, o = {}) => jp(ctx, s, x, y, { size: o.size || ROLE, weight: 900, sx: o.sx || ROLE_SX, color: o.color || K.white, align: o.align || 'left', alpha: a, kana: 0.025, stroke: o.stroke, strokeW: o.strokeW });
  const name = (ctx, s, x, y, a, o = {}) => jp(ctx, s, x, y, { size: o.size || NAME, weight: 900, sx: o.sx || NAME_SX, color: o.color || K.white, align: o.align || 'left', alpha: a, kana: 0.05, track: o.track || 0, stroke: o.stroke, strokeW: o.strokeW });
  /** spaced name (e.g. 逆 伝 播 set to the width of four characters, like 摩 砂 雪) */
  const nameSpread = (ctx, s, x, y, a, cells, o = {}) => {
    const size = o.size || NAME, cw = size * NAME_SX, chars = [...s];
    const span = cw * cells, step = (span - cw) / (chars.length - 1);
    chars.forEach((c, i) => name(ctx, c, x + i * step, y, a, o));
  };

  // ── tree of ten nodes (the Sephirot laid out as one transformer block) ─────
  const TREE = {
    // Keter..Malkuth positions (unit: tree height 1, centre x 0)
    n: [[0, 0.06], [0.29, 0.2], [-0.29, 0.2], [0.29, 0.44], [-0.29, 0.44], [0, 0.55], [0.29, 0.68], [-0.29, 0.68], [0, 0.8], [0, 0.95]],
    lab: ['INPVT', 'QVERY', 'CLAVIS', 'VALOR', 'SOFTMAX', 'ATTENTIO', 'RESIDVVM', 'NORMA', 'MLP', 'LOGITS'],
    sym: ['x', 'Q', 'K', 'V', 'σ', 'α', '+', 'γ', 'φ', 'z'],
    e: [[0, 1], [0, 2], [0, 5], [1, 2], [1, 3], [1, 5], [2, 4], [2, 5], [3, 4], [3, 5], [3, 6], [4, 5], [4, 7], [5, 6], [5, 7], [5, 8], [6, 7], [6, 8], [6, 9], [7, 8], [7, 9], [8, 9]],
  };
  function tree(ctx, cx, top, hgt, col, lw, p = 1, o = {}) {
    const P = TREE.n.map(([x, y]) => [cx + x * hgt, top + y * hgt]);
    const r = hgt * (o.r || 0.052);
    ctx.save();
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'butt';
    TREE.e.forEach(([a, b], i) => {
      const q = clamp(p * TREE.e.length - i * 0.6, 0, 1);
      if (q <= 0) return;
      const [x1, y1] = P[a], [x2, y2] = P[b];
      const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L;
      const sx = x1 + ux * r, sy = y1 + uy * r, ex = x2 - ux * r, ey = y2 - uy * r;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(lerp(sx, ex, q), lerp(sy, ey, q)); ctx.stroke();
      if (o.double) { ctx.save(); ctx.lineWidth = lw * 0.5; ctx.beginPath(); ctx.moveTo(sx - uy * lw * 2.2, sy + ux * lw * 2.2); ctx.lineTo(lerp(sx, ex, q) - uy * lw * 2.2, lerp(sy, ey, q) + ux * lw * 2.2); ctx.stroke(); ctx.restore(); }
    });
    P.forEach(([x, y], i) => {
      const q = clamp(p * 12 - i * 0.9, 0, 1);
      if (q <= 0) return;
      ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + q * Math.PI * 2); ctx.stroke();
      if (o.labels && q >= 1) {
        // engraved medallion: inner ring, the Latin name running round the top, the symbol in the middle
        ctx.beginPath(); ctx.arc(x, y, r * 0.64, 0, Math.PI * 2); ctx.lineWidth = lw * 0.45; ctx.stroke(); ctx.lineWidth = lw;
        const lab = TREE.lab[i], fsz = Math.round(r * 0.28);
        ctx.save(); ctx.font = `700 ${fsz}px ${FC}`; ctx.letterSpacing = '0px';
        const span = (ctx.measureText(lab).width + lab.length) / (r * 0.82); ctx.restore();
        arcText(ctx, lab, x, y, r * 0.8, -Math.PI / 2 - span / 2, fsz, col, FC, '', 700);
        lat(ctx, TREE.sym[i], x, y + r * 0.22, { size: r * 0.62, family: FE, style: 'italic', weight: 500, align: 'center', color: col });
      }
    });
    ctx.restore();
    return P;
  }
  /** text on a circle (engraving medallions) */
  function arcText(ctx, str, cx, cy, r, a0, size, col, fam = FE, style = 'italic', wt = 500) {
    ctx.save(); ctx.font = `${style} ${wt} ${size}px ${fam}`; ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let a = a0;
    for (const ch of str) {
      const w = ctx.measureText(ch).width;
      a += (w / 2) / r;
      ctx.save(); ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.rotate(a + Math.PI / 2); ctx.fillText(ch, 0, 0); ctx.restore();
      a += (w / 2) / r;
    }
    ctx.restore();
  }

  // ── the title mark: 新世紀 / EVALUATION / エヴァリュエーション (hand-cut) ─────
  // strokes: [x1,y1,x2,y2,w1,w2,c1,c2] in em units (y down), per glyph, with advance
  const KATA = [
    { adv: 0.95, s: [[0.08, 0.24, 0.84, 0.13, 0.11, 0.03, 0.6, 0], [0.47, 0.14, 0.42, 0.86, 0.09, 0.12, 0, 0.8], [-0.08, 0.94, 1.1, 0.78, 0.15, 0.015, 0.8, 0]] },                        // エ
    { adv: 1.0, s: [[0.64, -0.42, 0.49, 0.26, 0.0, 0.11, 0, 0.9], [0.12, 0.26, 0.06, 0.6, 0.11, 0.02, 0.7, 0], [0.08, 0.30, 0.90, 0.20, 0.11, 0.08, 0.5, 0.3],
      [0.88, 0.18, 0.74, 0.62, 0.11, 0.09, 0, 0], [0.77, 0.55, 0.22, 1.06, 0.10, 0.0, 0, 0], [0.95, -0.12, 1.03, 0.12, 0.055, 0.015, 0.6, 0], [1.12, -0.18, 1.20, 0.06, 0.055, 0.015, 0.6, 0]] }, // ヴ
    { adv: 0.7, sc: 0.74, s: [[0.04, 0.33, 0.90, 0.25, 0.10, 0.08, 0.6, 0.3], [0.89, 0.25, 0.62, 0.58, 0.09, 0.01, 0, 0], [0.55, 0.38, 0.14, 1.04, 0.10, 0.0, 0, 0]] },            // ァ
    { adv: 0.85, s: [[0.24, -0.35, 0.20, 0.64, 0.0, 0.12, 0, 0.9], [0.78, -0.75, 0.75, 0.62, 0.0, 0.125, 0, 0], [0.76, 0.54, 0.30, 1.06, 0.12, 0.0, 0, 0]] },                        // リ
    { adv: 0.7, sc: 0.74, s: [[0.14, 0.44, 0.76, 0.39, 0.08, 0.07, 0.6, 0], [0.75, 0.39, 0.71, 0.88, 0.08, 0.075, 0, 0], [-0.06, 0.95, 1.05, 0.84, 0.11, 0.012, 0.6, 0]] },       // ュ
    { adv: 0.95, s: [[0.08, 0.24, 0.84, 0.13, 0.11, 0.03, 0.6, 0], [0.47, 0.14, 0.42, 0.86, 0.09, 0.12, 0, 0.8], [-0.08, 0.94, 1.1, 0.78, 0.15, 0.015, 0.8, 0]] },                   // エ
    { adv: 0.95, s: [[-0.06, 0.62, 1.10, 0.42, 0.13, 0.0, 0.9, 0]] },                                                                                                               // ー
    { adv: 0.95, s: [[0.06, 0.08, 0.36, 0.30, 0.12, 0.02, 0.5, 0], [0.0, 0.42, 0.30, 0.62, 0.12, 0.02, 0.5, 0], [0.06, 1.02, 1.05, -0.05, 0.15, 0.0, 0.5, 0]] },                    // シ
    { adv: 0.7, sc: 0.74, s: [[0.80, 0.26, 0.76, 0.94, 0.09, 0.09, 0, 0], [0.14, 0.30, 0.80, 0.26, 0.08, 0.06, 0.6, 0], [0.22, 0.61, 0.80, 0.57, 0.075, 0.06, 0.6, 0], [0.04, 0.98, 0.86, 0.90, 0.10, 0.04, 0.6, 0]] }, // ョ
    { adv: 1.0, s: [[0.08, 0.10, 0.38, 0.36, 0.13, 0.02, 0.5, 0], [0.02, 1.04, 1.32, -0.52, 0.17, 0.0, 0.5, 0]] },                                                                 // ン
  ];
  const LOGO = { x0: 8, top: 470, em: 188, shear: 0.32, gap: -0.115 };
  function kataPolys(o = {}) {
    const em = o.em || LOGO.em, sh = o.shear ?? LOGO.shear;
    const out = [];
    let pen = o.x0 ?? LOGO.x0;
    for (const g of KATA) {
      const sc = g.sc || 1;
      for (const s of g.s) {
        let [x1, y1, x2, y2, w1, w2, c1, c2] = s;
        if (sc !== 1) { x1 *= sc; x2 *= sc; y1 = 1 - (1 - y1) * sc; y2 = 1 - (1 - y2) * sc; w1 *= sc; w2 *= sc; }
        const pts = bladePts(x1, y1, x2, y2, w1, w2, c1, c2).map(([x, y]) => [pen + (x + (1 - y) * sh) * em, (o.top ?? LOGO.top) + y * em]);
        out.push(pts);
      }
      pen += (g.adv + LOGO.gap) * em;
    }
    return out;
  }
  const KPOLY = kataPolys();
  function kata(ctx, col, o = {}) {
    const polys = o.polys || KPOLY;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    ctx.beginPath();
    for (const p of polys) { ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath(); }
    ctx.fillStyle = col; ctx.fill('nonzero');
    if (o.lower) { // cel split: a hard-edged darker red on the lower half
      ctx.save(); ctx.clip('nonzero'); ctx.fillStyle = o.lower; ctx.fillRect(0, (o.top ?? LOGO.top) + LOGO.em * 0.62, W, 400); ctx.restore();
    }
    ctx.restore();
  }
  const WM = { size: 150, y: 506, x0: 132, x1: 1308 };
  let WMLAY = null;
  function wmLayout(ctx) {
    // EVALUATION in wide roman capitals. The V's thin right arm and the A's thin left leg run
    // parallel in a roman cap, so they can share one stroke: V's vertex sits on A's left foot.
    ctx.save(); ctx.font = `700 ${WM.size}px ${FC}`; ctx.letterSpacing = '0px';
    const L = ['E', 'V', 'A', 'L', 'U', 'A', 'T', 'I', 'O', 'N'];
    const m = L.map((c) => { const q = ctx.measureText(c); return { c, w: q.width, l: q.actualBoundingBoxLeft, r: q.actualBoundingBoxRight }; });
    ctx.restore();
    const xs = []; let x = 0;
    const track = [0, -0.01, 0, 0.0, -0.01, -0.02, -0.05, 0.0, -0.01, -0.01];
    m.forEach((g, i) => {
      if (i === 2) { const v = m[1]; const vcx = xs[1] + (v.r - v.l) / 2; x = vcx + g.l - WM.size * 0.012; }
      else x += track[i] * WM.size;
      xs.push(x); x += g.w;
    });
    const inkL = xs[0] - m[0].l, inkR = xs[9] + m[9].r;
    WMLAY = { L, xs, inkL, sx: (WM.x1 - WM.x0) / (inkR - inkL) };
    return WMLAY;
  }
  function wordmark(ctx, col, a = 1, o = {}) {
    const Lz = WMLAY || wmLayout(ctx);
    ctx.save(); ctx.globalAlpha *= a;
    ctx.font = `700 ${WM.size}px ${FC}`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.letterSpacing = '0px';
    ctx.translate(WM.x0, WM.y); ctx.scale(Lz.sx, 1); ctx.translate(-Lz.inkL, 0);
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.lineJoin = 'miter';
    Lz.L.forEach((c, i) => { ctx.fillText(c, Lz.xs[i], 0); ctx.strokeText(c, Lz.xs[i], 0); });
    ctx.restore();
  }
  function shinseiki(ctx, a) {
    // 新世紀: small, wide, dark red with a pale keyline, sitting on the cap line left of centre
    withAlpha(ctx, a, () => {
      jp(ctx, '新世紀', 640, 418, { size: 78, weight: 900, sx: 1.32, color: '#a3180f', align: 'center', stroke: '#f6dccb', strokeW: 6 });
      jp(ctx, '新世紀', 640, 418, { size: 78, weight: 900, sx: 1.32, color: '#a3180f', align: 'center' });
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  //  0.0 – 14.2  a cappella: black · red (企画・原作) · engraving · blue (企画)
  // ════════════════════════════════════════════════════════════════════════
  S(0, (ctx, lt) => {
    bg(ctx, K.black);
    const a = seg(lt, 0.9, 1.6) * (0.8 + 0.2 * hash1(Math.floor(lt * 15)));
    dot(ctx, W / 2, H / 2, 2.6, K.white, a);
  });
  S(2.4, (ctx, lt, dur, t) => {
    bg(ctx, K.redHot);
    // faint hairline emblem: the ten-node tree, drawn in the red's own shadow
    const ea = 0.55 * seg(t, 4.3, 5.4) * (1 - seg(t, 6.9, 7.3));
    withAlpha(ctx, ea, () => tree(ctx, W / 2, 110, 900, '#9a0810', 2.2, 1));
  });
  CR(2.9, 6.5, (ctx, t) => {
    const a = dissolve(t, 2.9, 6.5, 0.55, 0.45);
    role(ctx, '企画・原作', W / 2, 470, a, { align: 'center', size: 62, sx: 0.95 });
    lat(ctx, 'GRADIENT', W / 2, 663, { size: 132, family: FM, weight: 900, sx: 0.98, align: 'center', color: K.white, alpha: a, ls: 2 });
  });
  // engraving: radial rays + medallions (Latin), camera pushes along it
  const MED = [
    ['Gradientia', 'g', 0], ['Regula Catenæ', '∂', 1], ['Entropia Crucis', 'H', 2], ['Attentio', 'Q·K', 3], ['Residuum', '+', 4], ['Momentum', 'β', 5],
    ['Descensus', '∇', 6], ['Normalisatio', 'σ', 7], ['Initium', 'θ₀', 8], ['Epocha', 'τ', 9], ['Stochastica', 'ξ', 10], ['Functio Damni', 'ℒ', 11],
  ];
  function engraving(ctx, lt, col, cx, cy, fillA = 1) {
    ctx.save();
    ctx.strokeStyle = col; ctx.fillStyle = col;
    // rays
    for (let i = 0; i < 160; i++) {
      const a = (i / 160) * Math.PI * 2 + 0.013 * Math.sin(i * 7.1);
      const r0 = 150 + 60 * hash1(i * 3), r1 = 520 + 520 * hash1(i * 5 + 1);
      ctx.lineWidth = i % 8 === 0 ? 2.2 : 1.1;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
    }
    ring(ctx, cx, cy, 138, col, 2); ring(ctx, cx, cy, 128, col, 1);
    arcText(ctx, 'SYSTEMA · GRADIENTIVM · ET · ERRORIS · PROPAGATIO · RETRO · ', cx, cy, 108, -Math.PI / 2, 15, col, FC, '', 400);
    fml(ctx, 'theta', cx, cy + 22, 90, col, { align: 'center' });
    // medallions
    MED.forEach(([lab, sym, i]) => {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2 + 0.26;
      const rr = 470 + 90 * (i % 2);
      const mx = cx + Math.cos(a) * rr, my = cy + Math.sin(a) * rr, mr = 74 + 10 * (i % 3);
      ctx.save(); ctx.globalAlpha *= fillA; ctx.fillStyle = K.blueDeep; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ring(ctx, mx, my, mr, col, 2); ring(ctx, mx, my, mr - 26, col, 1);
      arcText(ctx, lab.toUpperCase(), mx, my, mr - 13, -Math.PI / 2 - (lab.length * 0.045), 15, col, FC, '', 400);
      lat(ctx, sym, mx, my + 14, { size: 40, family: FE, style: 'italic', weight: 500, align: 'center', color: col });
    });
    ctx.restore();
  }
  S(7.3, (ctx, lt, dur, t) => {
    // 7.3–7.7 the red field hands over to the blue engraving (the rays arrive first)
    const k = seg(t, 7.3, 7.75);
    bg(ctx, K.blueDeep);
    withAlpha(ctx, 1 - k, () => bg(ctx, K.redHot));
    // push: stepped every 5 frames (the original is shot on 5s along the plate)
    const tq = 7.3 + Math.floor((t - 7.3) * 6) / 6;
    const p = E.inCubic(seg(tq, 7.3, 10.4));
    const s = lerp(0.95, 3.4, p);
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.rotate(lerp(-0.08, 0.22, p)); ctx.scale(s, s);
    ctx.translate(-lerp(720, 980, p), -lerp(560, 360, p));
    withAlpha(ctx, 0.35 + 0.65 * k, () => engraving(ctx, lt, '#cfe2ff', 720, 560, k));
    ctx.restore();
  });
  S(10.4, (ctx, lt, dur, t) => {
    bg(ctx, '#0b2a7a');
    // the light: flat circles, slowly breathing; at 13.95 it opens into a ring
    const open = seg(t, 13.9, 14.17);
    const r = 330 + 12 * Math.sin(t * 2.1) + 500 * E.inCubic(open);
    ctx.save(); ctx.fillStyle = '#2f6fd6'; ctx.beginPath(); ctx.arc(760, 560, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6fa6ee'; ctx.beginPath(); ctx.arc(760, 560, Math.max(0, r * 0.52 - 340 * open), 0, Math.PI * 2); ctx.fill(); ctx.restore();
    if (open > 0) ring(ctx, 760, 560, r * 0.8, '#dbe9ff', 18 * open, open);
  });
  CR(10.45, 14.12, (ctx, t) => {
    const a = dissolve(t, 10.45, 14.12, 0.3, 0.1);
    role(ctx, '企画', 290, 356, a, { size: 72, sx: 0.9 });
    lat(ctx, 'Project Eval.', 548, 360, { size: 118, family: FM, weight: 700, sx: 0.74, color: K.white, alpha: a });
    role(ctx, '掲載', 290, 616, a, { size: 72, sx: 0.9 });
    lat(ctx, 'arXiv', 548, 622, { size: 118, family: FM, weight: 700, sx: 0.8, color: K.white, alpha: a });
    name(ctx, '査読前プレプリント', 548, 790, a, { size: 104, sx: 0.84 });
  });

  // ════════════════════════════════════════════════════════════════════════
  //  14.2 – 23.4  band hit: × and +, the mark, flash
  // ════════════════════════════════════════════════════════════════════════
  function crossBars(ctx, cx, cy, len, thick, rot, col) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.fillStyle = col;
    ctx.fillRect(-len / 2, -thick / 2, len, thick); ctx.fillRect(-thick / 2, -len / 2, thick, len);
    ctx.restore();
  }
  const SMOKE = '#e9e8e4';
  S(14.1, (ctx, lt, dur, t, fx) => {
    bg(ctx, SMOKE);
    fx.flash = 1 - seg(t, 14.12, 14.3);
  });
  // rapid cuts of the operator: × turning into + (multiply, then accumulate)
  const XCUTS = [
    [14.267, (c, t) => crossBars(c, 900, 520, 3200, 64, lerp(0.62, 0.72, seg(t, 14.267, 14.433)), '#27272a')],
    [14.433, (c, t) => { c.save(); c.translate(720, 540); c.rotate(-0.95); c.fillStyle = '#1c1c1f'; c.fillRect(-1400, -95, 2800, 190); c.restore(); }],
    [14.567, (c, t) => crossBars(c, 610, 470, 620, 26, lerp(0.8, 0.62, seg(t, 14.567, 14.733)), '#3a3a3e')],
    [14.733, (c) => { withAlpha(c, 0.18, () => bg(c, '#9a9a9a')); }],
    [14.833, (c, t) => { c.save(); c.translate(lerp(300, 900, seg(t, 14.833, 14.967)), 700); c.rotate(-1.1); c.fillStyle = '#18181a'; c.fillRect(-1500, -60, 3000, 120); c.restore(); }],
    [14.967, (c) => {}],
    [15.067, (c, t) => crossBars(c, 760, 560, 900, 34, lerp(0.35, 0.12, seg(t, 15.067, 15.233)), '#2a2a2e')],
    [15.233, (c) => { withAlpha(c, 0.12, () => bg(c, '#7a7a7a')); }],
    [15.333, (c, t) => { wordmark(c, '#8f8e8a', 0.8); crossBars(c, 700, 500, 700, 22, lerp(0.7, 0.2, seg(t, 15.333, 15.6)), '#3a3a3e'); }],
    [15.6, (c, t) => { wordmark(c, '#7e7d79', 0.6 + 0.4 * seg(t, 15.6, 15.9)); }],
  ];
  XCUTS.forEach(([t0, f]) => S(t0, (ctx, lt, dur, t) => { bg(ctx, SMOKE); f(ctx, t); }));
  S(15.9, (ctx, lt, dur, t) => {
    bg(ctx, K.black);
    wordmark(ctx, K.white, 1);
  });
  S(17.4, (ctx, lt, dur, t) => {
    // the katakana arrive as flat electric-blue streaks that collapse onto their strokes
    bg(ctx, K.black);
    const p = E.outCubic(seg(t, 17.4, 18.2));
    if (t < 17.5) { withAlpha(ctx, 1 - seg(t, 17.4, 17.5), () => poly(ctx, [[520, 1080], [760, 1080], [980, 0], [880, 0]], { fill: '#bfe9ff' })); }
    const stretch = lerp(5.5, 1, p);
    ctx.save();
    // vertical streaks: each stroke smeared upward, shortening
    KPOLY.forEach((pts, i) => {
      const ys = pts.map((q) => q[1]); const ymax = Math.max(...ys);
      const sp = pts.map(([x, y]) => [x, ymax - (ymax - y) * stretch]);
      poly(ctx, sp, { fill: i % 3 === 0 ? '#9fe0ff' : '#3fb4ff', alpha: 0.9 });
    });
    ctx.restore();
    kata(ctx, '#e6f7ff', { alpha: p });
    wordmark(ctx, K.white, 1);
  });
  S(18.2, (ctx, lt, dur, t, fx) => {
    bg(ctx, K.black);
    wordmark(ctx, K.white, 1);
    kata(ctx, K.logoOrange, { lower: K.logoRed });
    shinseiki(ctx, seg(t, 19.37, 19.55));
    // 19.0 horizontal flare: a flat hairline and a pale band, crossing on the cap line
    if (t >= 19.0 && t < 19.4) {
      const k = 1 - seg(t, 19.05, 19.4);
      withAlpha(ctx, k, () => {
        rect(ctx, 0, 407, W, 4, { fill: '#ffffff' });
        rect(ctx, 0, 392, W, 12, { fill: '#7fc8ff', alpha: 0.5 });
        rect(ctx, 480, 400, 480, 18, { fill: '#e8f6ff', alpha: 0.8 });
      });
    }
    // 21.0 ring pulse
    if (t >= 21.0 && t < 21.45) {
      const k = seg(t, 21.0, 21.45);
      ring(ctx, W / 2, 540, lerp(505, 900, E1(k)), '#3a9cff', lerp(10, 3, k), 1 - k);
      ring(ctx, W / 2, 540, lerp(505, 900, E1(k)) - 16, '#1c4f9a', 3, (1 - k) * 0.6);
    }
  });
  S(22.9, (ctx, lt, dur, t, fx) => {
    bg(ctx, K.black);
    wordmark(ctx, K.white, 1); kata(ctx, K.logoOrange, { lower: K.logoRed }); shinseiki(ctx, 1);
    const k = seg(t, 22.9, 23.25);
    withAlpha(ctx, 0.55 + 0.45 * k, () => bg(ctx, '#f4f8ff'));
    // X of light: two long flat wedges crossing the frame
    withAlpha(ctx, 1 - seg(t, 23.1, 23.3), () => {
      const g = '#8fd0ff';
      poly(ctx, [[180, 1080], [300, 1080], [1260, 0], [1150, 0]], { fill: g, alpha: 0.85 });
      poly(ctx, [[140, 0], [260, 0], [1300, 1080], [1180, 1080]], { fill: g, alpha: 0.85 });
      poly(ctx, [[228, 1080], [252, 1080], [1212, 0], [1196, 0]], { fill: '#ffffff' });
      poly(ctx, [[188, 0], [212, 0], [1252, 1080], [1228, 1080]], { fill: '#ffffff' });
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  //  23.4 – 37.9  verse A · blue · x θ y  (the model between input and label)
  // ════════════════════════════════════════════════════════════════════════
  S(23.4, (ctx, lt, dur, t) => {
    bg(ctx, K.blueSky);
    // θ: the protagonist as a double exposure, turning to profile (sx squeeze) at 26.0
    const fa = 0.3 * seg(t, 24.3, 25.4);
    const turn = E2(seg(t, 25.9, 26.7));
    const drift = seg(t, 24.3, 37.9);
    if (fa > 0) fml(ctx, 'theta', lerp(700, 610, turn) + drift * -20, 905, lerp(1180, 1240, drift), K.white, { align: 'center', alpha: fa, sx: lerp(1, 0.56, turn) });
    // x slides in from the right (26.3), y from the left (30.2): figures standing in the sky
    const ys = E1(seg(t, 26.3, 27.3)), xs = E1(seg(t, 30.2, 31.2));
    if (ys > 0) fml(ctx, 'y', lerp(1760, 1250, ys) - drift * 25, 1010, 1300, K.ink, { align: 'center' });
    if (xs > 0) fml(ctx, 'x', lerp(-420, 150, xs) + drift * 18, 1150, 1250, K.ink, { align: 'center' });
  });
  CR(23.4, 26.15, (ctx, t) => {
    const a = dissolve(t, 23.4, 26.15, 0.05, 0.25);
    role(ctx, 'キャラクターデザイン', 735, 348, a, { align: 'right' });
    name(ctx, 'トークン化', 834, 372, a);
    role(ctx, 'メカニックデザイン', 735, 582, a, { align: 'right' });
    name(ctx, '自己注意', 834, 606, a);
    name(ctx, '残差接続', 834, 792, a);
  });
  CR(26.3, 29.8, (ctx, t) => {
    const a = dissolve(t, 26.3, 29.8, 0.2, 0.2);
    nameSpread(ctx, '逆伝播', 900, 792, a, 4);
    name(ctx, '自動微分', 900, 966, a);
    role(ctx, '副監督', 609, 880, a);
  });
  CR(29.9, 33.4, (ctx, t) => {
    const a = dissolve(t, 29.9, 33.4, 0.2, 0.2);
    role(ctx, '美術監督', 150, 184, a);
    name(ctx, '潜在空間', 470, 208, a);
    role(ctx, '色彩設定', 560, 934, a);
    name(ctx, '非線形性', 915, 958, a);
  });
  CR(33.9, 36.05, (ctx, t) => {
    const a = dissolve(t, 33.9, 36.05, 0.2, 0.25);
    role(ctx, '撮影監督', 609, 190, a);
    name(ctx, '層正規化', 915, 214, a);
    role(ctx, '音響監督', 150, 844, a);
    name(ctx, '位置符号化', 471, 868, a);
    role(ctx, '音響制作', 204, 956, a, { size: 46 });
    name(ctx, 'サイン・コサイン', 444, 960, a, { size: 74, sx: 0.84 });
  });

  // ════════════════════════════════════════════════════════════════════════
  //  37.9 – 51.9  verse B · orange · ∂ touches the graph · argmin · θ₀ · 瞳
  // ════════════════════════════════════════════════════════════════════════
  const SUN = '#ec7a22', SUN2 = '#d8581a';
  function sunset(ctx, t) {
    bg(ctx, SUN);
    // one flat cloud mass, cel-painted, drifting
    const dx = (t - 37.9) * 14;
    ctx.save(); ctx.fillStyle = SUN2; ctx.beginPath();
    ctx.moveTo(-50, 760); ctx.bezierCurveTo(200 + dx, 700, 380 + dx, 820, 640 + dx, 760); ctx.bezierCurveTo(900 + dx, 700, 1150 + dx, 830, 1500, 770);
    ctx.lineTo(1500, 1130); ctx.lineTo(-50, 1130); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  S(37.9, (ctx, lt, dur, t) => {
    sunset(ctx, t);
    const p = E1(seg(t, 38.15, 39.2));
    ctx.save(); ctx.translate(lerp(1520, 930, p), lerp(-260, 330, p)); ctx.rotate(lerp(-0.9, -0.42, p));
    fml(ctx, 'partial', 0, 520, 1500, K.ink, { align: 'center' });
    ctx.restore();
  });
  const TREECUTS = [39.8, 39.967, 40.133, 40.3, 40.467, 40.633, 40.8, 40.967, 41.133, 41.3, 41.467];
  S(39.3, (ctx, lt, dur, t) => {
    sunset(ctx, t);
    ctx.save(); ctx.translate(930, 330); ctx.rotate(-0.42); fml(ctx, 'partial', 0, 520, 1500, K.ink, { align: 'center' }); ctx.restore();
    // push stepped on the detected cuts (the original animates this push on 5s)
    let step = 0; for (const c of TREECUTS) if (t >= c) step++;
    const z = 1 + step * 0.028 + seg(t, 39.3, 41.6) * 0.012;
    const pdraw = E1(seg(t, 39.3, 40.4));
    ctx.save(); pushAt(ctx, z, 720, 300);
    const G = K.green;
    // plate heading, set like Kircher's SYSTEMA SEPHIROTICVM · X DIVINORVM NOMINVM
    withAlpha(ctx, seg(t, 39.3, 39.6), () => {
      const hd = { size: 40, family: FC, weight: 400, color: G, ls: 4 };
      lat(ctx, 'SYSTEMA', 640, 96, { ...hd, align: 'right' });
      lat(ctx, 'ATTENTIONIS', 800, 96, { ...hd, align: 'left' });
      lat(ctx, 'X TENSORVM', 610, 146, { ...hd, size: 30, align: 'right', ls: 3 });
      lat(ctx, 'NOMINVM', 830, 146, { ...hd, size: 30, align: 'left', ls: 3 });
      line(ctx, 250, 166, 600, 166, G, 1.5); line(ctx, 840, 166, 1190, 166, G, 1.5);
      // side legends, like the engraved notes beside the tree
      const nt = { size: 22, family: FE, style: 'italic', weight: 500, color: G };
      lat(ctx, 'Vaswani et al.', 150, 430, { ...nt }); lat(ctx, 'MMXVII', 150, 460, { ...nt, family: FC, style: '', weight: 400, ls: 2 });
      lat(ctx, 'Via Residui', 1290, 430, { ...nt, align: 'right' }); lat(ctx, 'semper aperta', 1290, 460, { ...nt, align: 'right' });
    });
    tree(ctx, 720, 180, 880, G, 3.2, pdraw, { labels: true, double: true, r: 0.066 });
    ctx.restore();
  });
  S(41.6, (ctx, lt, dur, t) => {
    // second face: the seeker. argmin as a double exposure; a black ℒ stands at the right
    bg(ctx, '#ee9a2c');
    ctx.save(); ctx.fillStyle = '#f6c24a'; ctx.beginPath(); ctx.arc(1180, 420, 130, 0, Math.PI * 2); ctx.fill(); ctx.restore();   // the sun
    const a = 0.34 * seg(t, 41.6, 42.4) * (1 - seg(t, 44.75, 45.05));
    const drift = seg(t, 41.6, 48.4);
    fml(ctx, 'argmin', 110 - drift * 40, 640, 150, K.white, { alpha: a });
    fml(ctx, 'L', lerp(1250, 1440, E2(seg(t, 44.6, 45.2))), 1180, 1250, '#1a0c05', { align: 'center' });
  });
  CR(42.3, 44.9, (ctx, t) => {
    const a = dissolve(t, 42.3, 44.9, 0.25, 0.15);
    role(ctx, '音楽', 144, 184, a);
    name(ctx, '交差エントロピー', 324, 208, a, { sx: 0.86 });
    role(ctx, '音楽協力', 360, 924, a);
    name(ctx, 'ラベル平滑化', 675, 948, a, { size: 104 });
  });
  CR(44.9, 48.4, (ctx, t) => {
    const a = dissolve(t, 44.9, 48.4, 0.15, 0.2);
    const c1 = 450, c2 = 1026;
    role(ctx, 'オープニングテーマ', c1, 246, a, { size: 42, align: 'center' });
    role(ctx, 'エンディングテーマ', c2, 246, a, { size: 42, align: 'center' });
    jp(ctx, '「残酷な勾配のテーゼ」', c1, 334, { size: 54, weight: 900, sx: 0.84, align: 'center', color: K.white, alpha: a });
    const fw = latW(ctx, 'FLY ME TO THE MINIMUM', { size: 50, family: FR, weight: 700, sx: 0.8 });
    jp(ctx, '「', c2 - fw / 2 - 4, 334, { size: 54, weight: 900, sx: 0.84, color: K.white, alpha: a, align: 'right' });
    lat(ctx, 'FLY ME TO THE MINIMUM', c2, 332, { size: 50, family: FR, weight: 700, sx: 0.8, align: 'center', color: K.white, alpha: a });
    jp(ctx, '」', c2 + fw / 2 + 4, 334, { size: 54, weight: 900, sx: 0.84, color: K.white, alpha: a });
    const rows = [['作詞', '順伝播', 'Steepest Descent'], ['作曲', '逆伝播', 'Heavy Ball'], ['編曲', '最適化器', 'Cosine Annealing'], ['歌', '損失関数', 'LION']];
    rows.forEach(([r, j, e], i) => {
      const y = 452 + i * 93;
      role(ctx, r, 162, y, a, { size: 44, align: 'center' });
      name(ctx, j, 330, y + 4, a, { size: 62 });
      lat(ctx, e, c2 + 4, y + 2, { size: 58, family: FR, weight: 700, sx: 0.8, align: 'center', color: K.white, alpha: a });
    });
    jp(ctx, '（チェックポイントレコード）', 750, 830, { size: 44, weight: 700, sx: 0.84, align: 'center', color: K.white, alpha: a });
  });
  S(48.4, (ctx, lt, dur, t) => {
    // pink: θ₀ — initialised, innocent — and the window it does not yet see through
    bg(ctx, '#ee9bb4');
    const slide = E1(seg(t, 48.4, 48.9));
    fml(ctx, 'theta0', 470, 820, 900, '#fff4f7', { align: 'center', alpha: 0.55 });
    const wx = lerp(1500, 800, slide), wy = 150, ww = 580, wh = 600;
    ctx.save(); ctx.fillStyle = '#f8d6df'; ctx.fillRect(wx, wy, ww, wh); ctx.restore();
    fml(ctx, 'heinit', wx + ww * 0.6, wy + wh * 0.66, 74, '#5a1030', { align: 'center' });
    rect(ctx, wx, wy, ww, wh, { stroke: '#7a2a44', lw: 10 });
    rect(ctx, wx + ww * 0.2 - 5, wy, 10, wh, { fill: '#7a2a44' });
    rect(ctx, wx, wy + wh * 0.26 - 5, ww, 10, { fill: '#7a2a44' });
  });
  S(49.9, (ctx, lt, dur, t) => {
    // 瞳 — the lyric's own word, as the extreme close-up of an eye
    bg(ctx, '#f6e7d4');
    const z = lerp(1, 1.06, seg(t, 49.9, 50.8));
    ctx.save(); pushAt(ctx, z, 720, 560);
    jp(ctx, '瞳', 720, 1010, { size: 1080, weight: 900, sx: 1.25, color: '#c8141e', align: 'center' });
    ctx.restore();
  });

  // ════════════════════════════════════════════════════════════════════════
  //  50.8 – 66.8  pre-chorus: machinery, the deadline, the block, grokking, wings
  // ════════════════════════════════════════════════════════════════════════
  S(50.8, (ctx, lt, dur, t) => {
    bg(ctx, '#9fc58c');
    const px = lerp(0, -260, seg(t, 50.8, 51.4));
    fml(ctx, 'chain', -120 + px, 690, 330, '#101410', { sw: 12 });
  });
  function stencil(ctx, str, x, y, size, col, bgc, sx = 1) {
    lat(ctx, str, x, y, { size, family: FH, weight: 700, sx, align: 'center', color: col });
    // stencil bridges: vertical cuts through the counters, painted back in the plate colour
    const w = latW(ctx, str, { size, family: FH, weight: 700, sx });
    const n = str.replace(/ /g, '').length;
    ctx.save(); ctx.fillStyle = bgc;
    let xx = x - w / 2;
    ctx.font = `700 ${size}px ${FH}`;
    for (const ch of str) {
      const cw = ctx.measureText(ch).width * sx;
      if ('ABDOPQR0689'.includes(ch)) ctx.fillRect(xx + cw * 0.46, y - size * 0.76, size * 0.045, size * 0.2);
      if ('ABDOPQR0689'.includes(ch)) ctx.fillRect(xx + cw * 0.46, y - size * 0.2, size * 0.045, size * 0.2);
      if ('EFTLIS'.includes(ch)) ctx.fillRect(xx + cw * 0.3, y - size * 0.4, size * 0.04, size * 0.07);
      xx += cw;
    }
    ctx.restore();
  }
  S(51.4, (ctx, lt, dur, t) => {
    const plate = '#ece4e2';
    bg(ctx, plate);
    const z = lerp(1, 1.03, seg(t, 51.4, 51.8));
    ctx.save(); pushAt(ctx, z); ctx.translate(720, 540); ctx.rotate(-0.035); ctx.translate(-720, -540);
    const gcol = '#7c7876';
    lat(ctx, '∂', 720, 150, { size: 90, family: FR, style: 'italic', weight: 700, align: 'center', color: '#c8242a' });
    stencil(ctx, 'EVALUATION', 720, 360, 150, gcol, plate, 0.86);
    stencil(ctx, '1998', 720, 640, 250, gcol, plate, 0.9);
    stencil(ctx, 'MNIST', 720, 790, 110, gcol, plate, 0.9);
    stencil(ctx, 'TEST SET', 720, 1010, 150, gcol, plate, 0.86);
    ctx.restore();
  });
  S(51.8, (ctx, lt, dur, t) => {
    // the internal-battery clock, re-labelled: time left until the deadline (AoE) = time left in this film
    bg(ctx, '#080806');
    const Y = K.yellow, O = '#ff9a1a';
    const test = t < 51.87;
    const rem = Math.max(0, 90.5 - t);
    const mm = Math.floor(rem / 60), ss = Math.floor(rem % 60), cc = Math.floor((rem * 100) % 100);
    const str = test ? '8:88:88' : `${mm}:${pad(ss)}:${pad(cc)}`;
    ctx.save(); ctx.translate(720, 540); ctx.transform(1.12, -0.13, 0.06, 1.12, 0, 0); ctx.translate(-720 - 60, -540 + 40);
    // panel frame (orange hazard band top right)
    poly(ctx, [[930, 40], [1480, 40], [1480, 250], [930, 250]], { fill: '#1a1204' });
    stripes(ctx, 1210, 40, 270, 70, '#e8161f', '#1a1204', 22);
    jp(ctx, '内部', 950, 190, { size: 132, weight: 900, sx: 0.95, color: Y });
    lat(ctx, 'INTERNAL', 1236, 170, { size: 46, family: FH, weight: 700, color: Y, sx: 0.8 });
    jp(ctx, '主計算資源供給システム', 950, 300, { size: 44, weight: 700, sx: 0.8, color: Y });
    lat(ctx, 'MAIN GPU SUPPLY SYSTEM', 952, 340, { size: 26, family: FH, weight: 700, color: Y, sx: 0.8 });
    jp(ctx, '締切まで', 200, 300, { size: 58, weight: 900, sx: 0.84, color: O });
    lat(ctx, 'DEADLINE (AoE)', 200, 340, { size: 26, family: FH, weight: 700, color: O, sx: 0.84 });
    // digits
    let x = 180; const dh = 360, dw = 150, th = 34;
    for (const ch of str) {
      if (ch === ':') { rect(ctx, x + 18, 460, 30, 30, { fill: Y }); rect(ctx, x + 2, 640, 30, 30, { fill: Y }); x += 70; continue; }
      seg7(ctx, ch, x, 390, dw, dh, th, Y); x += dw + 58;
    }
    // precision modes, where the original has STOP / SLOW / NORMAL / RACING
    ['FP32', 'TF32', 'BF16', 'FP8'].forEach((m, i) => {
      const bx = 200 + i * 250, on = i === 2;
      rect(ctx, bx, 820, 220, 76, { fill: on ? '#ff3a1a' : '#3a2a08' });
      lat(ctx, m, bx + 110, 874, { size: 44, family: FH, weight: 700, color: on ? '#fff2c0' : Y, align: 'center', sx: 0.9 });
    });
    ctx.restore();
  });
  S(52.267, (ctx, lt, dur, t) => {
    bg(ctx, '#b9c3cc');
    fml(ctx, 'chain', -1180, 700, 330, '#16202a', { sw: 12 });
  });
  function angledBars(ctx, t, col, bgc, labels) {
    // the attention map seen edge-on: slanted bars in perspective, thicker toward the camera
    bg(ctx, bgc);
    const off = (t * 900) % 240;
    for (let i = -2; i < 9; i++) {
      const y = i * 170 + off * 0.5;
      poly(ctx, [[-100, y], [1090, y - 250], [1090, y - 170], [-100, y + 120]], { fill: col });
    }
    for (let i = 0; i < 3; i++) poly(ctx, [[1120 + i * 56, 0], [1146 + i * 56, 0], [1098 + i * 56, 1080], [1072 + i * 56, 1080]], { fill: col });
    line(ctx, 0, 820, 1260, 694, col, 3);
    labels.forEach(([s, x, y]) => { lat(ctx, s, x, y, { size: 44, family: FH, weight: 700, style: 'italic', color: col, sx: 0.9 }); line(ctx, x - 6, y + 12, x + 120, y + 12, col, 2); });
  }
  S(52.4, (ctx, lt, dur, t) => angledBars(ctx, t, '#ff2a1a', '#140204', [['L05', 1300, 250], ['H03', 1300, 700]]));
  S(52.767, (ctx, lt, dur, t) => angledBars(ctx, t, '#3fe07a', '#021408', [['L05', 1300, 250], ['H03', 1300, 700]]));
  S(52.9, (ctx, lt, dur, t) => {
    // the block in its cage: orange, black restraint bars, the forward pass stacked like a body
    bg(ctx, '#e8561a');
    const tilt = lerp(40, -40, seg(t, 52.9, 54.567));
    ctx.save(); ctx.translate(0, tilt);
    rect(ctx, 0, -60, 180, 1200, { fill: K.black }); rect(ctx, 1260, -60, 180, 1200, { fill: K.black });
    rect(ctx, 200, -60, 30, 1200, { fill: '#1a0802' }); rect(ctx, 1210, -60, 30, 1200, { fill: '#1a0802' });
    // the body is the residual "+", standing in its restraints; the two residual lines run up the gantries
    // Unit-01 as one kanji: 初 (初号機 / 初期値), standing in its restraints, seen from below
    jp(ctx, '初', 720, 1160, { size: 1180, weight: 900, sx: 0.78, sy: 1.18, color: '#3b1860', align: 'center', stroke: K.eva, strokeW: 7 });
    ctx.save(); ctx.translate(92, 1060); ctx.rotate(-Math.PI / 2); fml(ctx, 'block1', 0, 26, 64, '#e8561a', { sw: 6 }); ctx.restore();
    ctx.save(); ctx.translate(1348, 60); ctx.rotate(Math.PI / 2); fml(ctx, 'block2', 0, 26, 64, '#e8561a', { sw: 6 }); ctx.restore();
    ctx.restore();
  });
  CR(52.9, 54.567, (ctx, t) => {
    const a = dissolve(t, 52.9, 54.567, 0.12, 0.12);
    jp(ctx, 'オープニングアニメーション', 702, 276, { size: 92, weight: 900, sx: 0.8, color: K.white, align: 'center', alpha: a, kana: 0.02 });
    role(ctx, '作画', 390, 460, a, { size: 72, sx: 0.9 });
    nameSpread(ctx, '行列積', 600, 468, a, 4, { size: 116 });
    name(ctx, '半精度演算', 600, 614, a, { size: 116 });
    role(ctx, '演出', 390, 792, a, { size: 72, sx: 0.9 });
    name(ctx, '計算グラフ', 600, 800, a, { size: 116 });
  });
  // grokking: the eyes are two numbers — train acc and val acc — and they open (real run)
  const GK = { steps: null, va: null };
  function valAt(step) {
    const s = GK.steps, v = GK.va; if (!s) return 0;
    const i = clamp(Math.floor(step / 50), 0, s.length - 2), f = (step - s[i]) / 50;
    return lerp(v[i], v[i + 1], clamp(f));
  }
  S(54.567, (ctx, lt, dur, t) => {
    // one tilt down: from the crown (labels) to the eyes (the two numbers); the second eye opens
    bg(ctx, '#f2c9a4');
    const tilt = lerp(430, 0, E.inOutSine(seg(t, 54.567, 55.75)));
    ctx.save(); ctx.translate(0, tilt);
    // step 1,000 (memorised: train 100%, val 0%) -> step 16,000 (generalised), values from the real run
    const st = Math.round(lerp(1000, 16000, E.inOutSine(seg(t, 55.5, 56.4))) / 50) * 50;
    const tr = 100, va = valAt(st) * 100;
    rect(ctx, -40, -600, 1520, 560, { fill: '#3a120c' });
    jp(ctx, 'いつか', 720, -140, { size: 96, weight: 900, sx: 0.88, color: '#f2c9a4', align: 'center' });
    role(ctx, '訓練', 420, 400, 1, { color: '#3a1a10', align: 'center', size: 64 });
    role(ctx, '検証', 1020, 400, 1, { color: '#3a1a10', align: 'center', size: 64 });
    lat(ctx, tr.toFixed(1), 420, 700, { size: 270, family: FM, weight: 900, color: '#1c0c06', align: 'center', sx: 0.84 });
    lat(ctx, va.toFixed(1), 1020, 700, { size: 270, family: FM, weight: 900, color: '#1c0c06', align: 'center', sx: 0.84 });
    rect(ctx, 240, 744, 360, 9, { fill: '#1c0c06' }); rect(ctx, 840, 744, 360, 9, { fill: '#1c0c06' });
    lat(ctx, `step ${st.toLocaleString('en-US')}`, 720, 860, { size: 46, family: FR, style: 'italic', weight: 400, color: '#5a2a18', align: 'center' });
    lat(ctx, 'accuracy %  ·  (a + b) mod 97', 720, 922, { size: 34, family: FR, style: 'italic', weight: 400, color: '#7a4a30', align: 'center' });
    ctx.restore();
  });
  S(56.567, (ctx, lt, dur, t) => {
    // dark red: the question, in silhouette. the eyes flash on 消える
    bg(ctx, '#4a0708');
    const r = '#8a1414';
    ctx.save(); ctx.fillStyle = r; ctx.beginPath(); ctx.moveTo(0, 820); ctx.lineTo(560, 700); ctx.lineTo(1440, 900); ctx.lineTo(1440, 1100); ctx.lineTo(0, 1100); ctx.fill(); ctx.restore();
    const flash = (t >= 57.47 && t < 57.6) || (t >= 57.83 && t < 58.25);
    vjp(ctx, 'なぜ、', 1150, 120, { size: 170, color: K.black });
    vjp(ctx, '勾配は', 900, 120, { size: 170, color: K.black });
    const hgt = vjp(ctx, '消える', 650, 120, { size: 170, color: flash ? K.white : K.black });
    vjp(ctx, 'のか', 400, 120 + 0, { size: 170, color: K.black });
  });
  // name cards (ep. title-card manner)
  function nameCard(ctx, jpS, en, bgc, fg, o = {}) {
    bg(ctx, bgc);
    jp(ctx, jpS, o.x || 720, o.y || 600, { size: o.size || 230, weight: 900, sx: o.sx || 0.88, color: fg, align: 'center', alpha: o.alpha });
    if (en) lat(ctx, en, o.x || 720, (o.y || 600) + 116, { size: 56, family: FGc, weight: 700, color: fg, align: 'center', ls: 1, sx: 0.92, alpha: o.alpha });
  }
  S(58.4, (ctx, lt, dur, t) => {
    nameCard(ctx, '目的関数', 'OBJECTIVE', K.black, '#e8161f', { alpha: t < 58.633 ? 1 : 0.45 });
    if (t < 58.633) { poly(ctx, [[468, 352], [690, 330], [684, 348], [462, 370]], { fill: '#e8161f' }); poly(ctx, [[752, 330], [974, 308], [968, 326], [746, 348]], { fill: '#e8161f' }); }
  });
  S(58.8, (ctx) => nameCard(ctx, '学習率', 'LEARNING RATE', '#b9b3c9', K.ink));
  S(59.1, (ctx) => { bg(ctx, K.black); jp(ctx, '学習率', 720, 600, { size: 230, weight: 900, sx: 0.88, color: '#1c1a22', align: 'center' }); });
  S(59.2, (ctx) => nameCard(ctx, '正則化', 'REGULARIZATION', '#e3ecf2', K.ink));
  S(59.533, (ctx) => nameCard(ctx, '乱数種', 'SEED', '#c9c6bf', K.ink));
  S(59.7, (ctx, lt, dur, t) => nameCard(ctx, '乱数種', 'SEED = 42', t < 59.95 ? '#c9c6bf' : '#8f8c86', K.ink));
  S(60.033, (ctx, lt, dur, t) => {
    // the far future: the scaling law, in Unit-01 purple on hot orange, shot in close-ups
    bg(ctx, K.orangeHot);
    for (let i = 0; i < 7; i++) rect(ctx, 80 + i * 210 + ((t * 40) % 210), -40, 34, 1200, { fill: '#ff7a2a', alpha: 0.7 });
    const T = '#b02c08', P = '#2a0f48';
    if (t < 62.16) {
      const z = lerp(1, 1.08, seg(t, 60.033, 62.167));
      ctx.save(); pushAt(ctx, z, 720, 540);
      fml(ctx, 'chinA', -1330, 760, 520, T, { sw: 10 });
      rect(ctx, 0, 1000, 1440, 26, { fill: K.eva });
      ctx.restore();
    } else if (t < 63.0) {
      const px = lerp(0, -80, seg(t, 62.167, 63.0));
      fml(ctx, 'chinA', -3000 + px, 800, 520, T, { sw: 10 });
      rect(ctx, 0, 90, 1440, 22, { fill: K.eva });
    } else {
      const k = E1(seg(t, 63.0, 63.6)), dy = lerp(260, 0, k);
      rect(ctx, 0, 832 + dy, 1440, 10, { fill: K.eva });
      fml(ctx, 'chinA', 720, 932 + dy, 74, P, { align: 'center', sw: 8 });
      fml(ctx, 'chinB', 720, 1044 + dy, 34, P, { align: 'center', sw: 4 });
    }
  });
  CR(60.2, 62.0, (ctx, t) => {
    const a = dissolve(t, 60.2, 62.0, 0.12, 0.12);
    role(ctx, '広報', 715, 308, a, { align: 'center' });
    name(ctx, 'ベンチマーク', 715, 486, a, { align: 'center' });
    jp(ctx, '（リーダーボード）', 715, 570, { size: 46, weight: 700, sx: 0.84, align: 'center', color: K.white, alpha: a });
    name(ctx, '事例紹介', 715, 726, a, { align: 'center' });
    jp(ctx, '（厳選済み）', 715, 810, { size: 46, weight: 700, sx: 0.84, align: 'center', color: K.white, alpha: a });
  });
  CR(62.2, 64.0, (ctx, t) => {
    const a = dissolve(t, 62.2, 64.0, 0.12, 0.12);
    role(ctx, 'アニメーション制作', 712, 352, a, { align: 'center' });
    jp(ctx, 'テンソルコア', 720, 562, { size: 128, family: FGo, weight: 900, sx: 0.98, align: 'center', color: K.white, alpha: a, kana: 0.0 });
    lat(ctx, 'AUTOGRAD', 712, 760, { size: 136, family: FH, weight: 700, sx: 1.16, align: 'center', color: K.white, alpha: a, ls: -2 });
  });
  S(64.0, (ctx, lt, dur, t, fx) => {
    // wings: the identity path. a standing "1", yellow flat rays opening behind it
    bg(ctx, '#e8401a');
    for (let i = 0; i < 6; i++) rect(ctx, 60 + i * 240, -40, 60, 1200, { fill: '#f26a24' });
    const w = E1(seg(t, 64.3, 64.75));
    if (w > 0) {
      ctx.save(); ctx.translate(720, 470);
      for (const side of [-1, 1]) {
        for (let i = 0; i < 7; i++) {
          const a0 = -Math.PI / 2 + side * (0.42 + i * 0.16) * w, wd = 0.04 + 0.012 * (i % 3);
          const L = (760 + 160 * hash1(i * 13 + (side > 0 ? 3 : 0))) * w;
          poly(ctx, [[0, 0], [Math.cos(a0 - wd) * L, Math.sin(a0 - wd) * L], [Math.cos(a0 + wd) * L * 1.02, Math.sin(a0 + wd) * L * 1.02]], { fill: i % 2 ? '#ffd21a' : '#ffe86a' });
        }
      }
      ctx.restore();
    }
    fml(ctx, 'one', 720, 890, 660, '#1a0a14', { align: 'center', sw: 20 });
    fml(ctx, 'resgrad', 720, 1016, 40, '#1a0a14', { align: 'center', sw: 6, alpha: seg(t, 64.8, 65.2) });
  });
  CR(64.0, 66.72, (ctx, t) => {
    const a = dissolve(t, 64.0, 66.72, 0.12, 0.05);
    const kl = { stroke: '#7a1a04', strokeW: 7 };
    role(ctx, 'プロデューサー', 652, 348, a, { align: 'center', ...kl });
    name(ctx, '計算資源', 735, 522, a, { align: 'center', ...kl });
    jp(ctx, '（GPU時間）', 735, 600, { size: 46, weight: 700, sx: 0.84, align: 'center', color: K.white, alpha: a, ...kl });
    name(ctx, '学習データ', 735, 770, a, { align: 'center', ...kl });
  });

  // ════════════════════════════════════════════════════════════════════════
  //  66.7 – 86.1  chorus: the intertitle barrage at the original cut rhythm
  // ════════════════════════════════════════════════════════════════════════
  const card = (bgc) => (ctx) => bg(ctx, bgc);
  const J = (ctx, s, x, y, size, col, o = {}) => jp(ctx, s, x, y, { size, weight: 900, color: col, align: 'center', sx: 0.88, ...o });
  // grotesk title cards — geometry measured from the reference frames
  function gCard(ctx, lines, bgc = K.black) {
    bg(ctx, bgc);
    for (const L of lines) latFit(ctx, L.s, L.cx ?? 720, L.base, L.w, L.cap, { family: L.f || FGc, color: L.c || K.white, capRatio: L.f === FH ? 0.716 : 0.711, align: L.align || 'center' });
  }
  S(66.7, (ctx, lt, dur, t) => {
    // THE BITTER LESSON: the cruel angel's thesis
    bg(ctx, K.blueSky);
    vjp(ctx, '苦い教訓', 1110, 110, { size: 205, color: K.white });
    lat(ctx, 'THE BITTER LESSON', 120, 900, { size: 64, family: FH, weight: 700, color: K.white, sx: 0.84 });
    lat(ctx, 'R. Sutton, 2019', 122, 956, { size: 36, family: FR, style: 'italic', weight: 400, color: K.white });
  });
  S(67.2, (ctx) => { bg(ctx, K.black); J(ctx, '探索', 720, 800, 560, K.white); });
  S(67.333, (ctx) => { bg(ctx, K.paper); J(ctx, '学習', 720, 800, 560, K.ink); });
  S(67.433, (ctx) => { bg(ctx, K.black); latFit(ctx, 'COMPUTE', 720, 600, 1300, 150, { family: FH, color: K.white }); });
  S(67.667, (ctx, lt) => {
    bg(ctx, '#c9d6e6');
    fmlFit(ctx, 'sgd', 720 - lt * 60, 540, 1240, 400, K.ink, { sw: 10, scale: 1 + lt * 0.1 });
  });
  S(68.067, (ctx) => gCard(ctx, [{ s: 'TEST SET', base: 222 * 3, w: 1150, cap: 255 }]));
  S(68.2, (ctx, lt, dur, t) => { bg(ctx, K.red); J(ctx, '漏洩', 720, 760, 520, K.ink); if (t >= 68.333) jp(ctx, 'テストデータ', 720, 900, { size: 70, weight: 900, color: K.ink, align: 'center', sx: 0.88 }); });
  S(68.567, (ctx) => gCard(ctx, [{ s: 'EPOCH-01', base: 262 * 3, w: 1130, cap: 501 }]));
  S(68.7, (ctx) => { bg(ctx, K.black); fmlFit(ctx, 'xent', 720, 540, 1180, 520, K.white, { sw: 10 }); });
  S(68.833, (ctx, lt) => { bg(ctx, K.paper); fmlFit(ctx, 'softmax', 720, 540, 1200, 560, K.ink, { sw: 10, scale: 1 + lt * 0.3 }); });
  S(69.0, (ctx) => { bg(ctx, K.black); J(ctx, '損失', 720, 780, 520, K.white); });
  S(69.167, (ctx) => { bg(ctx, K.paper); J(ctx, '損失', 720, 1020, 520, K.ink, { sy: 1.9, sx: 0.8 }); });
  S(69.333, (ctx) => { bg(ctx, '#2a1048'); fmlFit(ctx, 'dLdth', 720, 540, 1100, 900, K.eva, { sw: 10 }); });
  S(69.5, (ctx) => { bg(ctx, '#0b2a18'); fmlFit(ctx, 'fgsm', 720, 560, 1250, 220, '#f2efe6', { sw: 8 }); lat(ctx, 'ADVERSARIAL', 720, 820, { size: 54, family: FH, weight: 700, color: '#f2efe6', align: 'center', ls: 14, sx: 0.9 }); });
  S(69.733, (ctx) => {
    // ep. 1 「使徒、襲来」 -> the perturbation arrives
    bg(ctx, '#c01018');
    jp(ctx, '摂動、', 170, 330, { size: 150, weight: 900, color: '#2a0204', sx: 0.88 });
    J(ctx, '襲来', 760, 850, 500, '#2a0204');
  });
  S(69.933, (ctx, lt) => { bg(ctx, K.black); dot(ctx, 720, 540, 380 + lt * 40, '#e0141c'); J(ctx, '核', 720, 640, 260, '#2a0204'); });
  S(70.167, (ctx) => {
    bg(ctx, K.black);
    const o = { family: FH, color: K.white };
    latFit(ctx, 'A', 150, 354, 205, 264, { ...o, align: 'left' });
    latFit(ctx, 'TTENTION', 362, 354, 890, 120, { ...o, align: 'left' });
    latFit(ctx, 'T', 170, 675, 190, 255, { ...o, align: 'left' });
    latFit(ctx, 'ENSOR', 362, 675, 630, 120, { ...o, align: 'left' });
    latFit(ctx, 'FIELD', 180, 990, 1110, 270, { ...o, align: 'left' });
  });
  S(70.4, (ctx) => { bg(ctx, '#e8121a'); });
  S(70.5, (ctx, lt, dur, t) => {
    // the moon, and the one who knows she can be restored; 70.833 cuts in closer
    bg(ctx, '#1f5ea8');
    if (t >= 70.833) pushAt(ctx, 1.15, 800, 900);
    ctx.save(); ctx.fillStyle = '#e6eef4'; ctx.beginPath(); ctx.arc(720, 1010 - lt * 24, 790, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    vjp(ctx, 'わたしが消えても、', 880, 250, { size: 84, color: '#0e2c5c' });
    vjp(ctx, '代わりはいるもの。', 752, 334, { size: 84, color: '#0e2c5c' });
    lat(ctx, 'checkpoint.pt', 470, 990, { size: 40, family: FR, style: 'italic', weight: 400, color: '#0e2c5c', align: 'center' });
  });
  S(71.233, (ctx) => gCard(ctx, [{ s: 'OUTLIERS', base: 230 * 3, w: 1210, cap: 336 }]));
  S(71.367, (ctx, lt) => {
    bg(ctx, '#d2521c');
    rect(ctx, -40, 760, 1520, 400, { fill: '#8a2a10' });
    lat(ctx, '14,197,122', 720 - lt * 30, 700, { size: 300, family: FM, weight: 900, color: '#2a0a04', align: 'center', sx: 0.66 });
    jp(ctx, 'ImageNet', 720, 850, { size: 64, weight: 700, color: '#f6d0a8', align: 'center', sx: 1 });
  });
  S(71.733, (ctx) => gCard(ctx, [{ s: 'TOP-5', base: 250 * 3, w: 1280, cap: 383 }]));
  S(71.867, (ctx, lt) => {
    bg(ctx, '#3a0a2a');
    rect(ctx, -40, 700, 1520, 500, { fill: '#240418' });
    fml(ctx, 'nabla', 720, 820 + lt * 20, 900, '#ff5a8a', { align: 'center', sw: 6 });
  });
  S(72.233, (ctx) => {
    // parody org mark: a red ∂ with the Browning line, bent
    bg(ctx, K.black);
    fml(ctx, 'partial', 700, 760, 820, '#e0141c', { align: 'center', sw: 14 });
    lat(ctx, "GRAD'S IN HIS HEAVEN", 720, 920, { size: 40, family: FR, style: 'italic', weight: 700, color: '#e0141c', align: 'center' });
    lat(ctx, "ALL'S RIGHT WITH THE WORLD", 720, 968, { size: 40, family: FR, style: 'italic', weight: 700, color: '#e0141c', align: 'center' });
  });
  // the bridge crew = Transformer-base (Vaswani et al. 2017, Table 3 / §5.3–5.4)
  function hp(ctx, bgc, fg, roleS, sym, val, o = {}) {
    bg(ctx, bgc);
    jp(ctx, roleS, 150, 250, { size: 62, weight: 700, sx: 0.86, color: fg });
    if (sym) fml(ctx, sym, 150, 520, 230, fg, { sw: 8 });
    lat(ctx, val, o.vx || 1320, o.vy || 900, { size: o.vs || 330, family: FM, weight: 900, color: fg, align: 'right', sx: o.vsx || 0.86 });
  }
  S(72.367, (ctx) => hp(ctx, '#1f6f64', K.white, 'Adam 二次モーメント', 'beta2', '0.98'));
  S(72.6, (ctx) => hp(ctx, '#d9cce6', '#2a1a3a', '分母安定化項', 'eps', '10⁻⁹'));
  S(72.733, (ctx) => hp(ctx, '#2a78b8', K.white, 'Adam 一次モーメント', 'beta1', '0.9'));
  S(73.0, (ctx) => hp(ctx, '#8a76a8', K.white, 'ドロップアウト率', 'pdrop', '0.1'));
  S(73.267, (ctx) => hp(ctx, '#e6a0c0', '#3a0a24', 'ラベル平滑化', 'els', '0.1'));
  S(73.533, (ctx) => hp(ctx, '#dfe8f0', '#0a2a4a', 'ウォームアップ', null, '4000', { vs: 360 }));
  S(73.7, (ctx) => hp(ctx, '#e89a2a', '#2a1204', 'モデル次元', 'dmodel', '512'));
  S(74.0, (ctx) => hp(ctx, '#1c7a70', K.white, '内部次元', 'dff', '2048'));
  S(74.2, (ctx) => { bg(ctx, K.black); fml(ctx, 'hh', 380, 700, 600, '#c8101a', { outline: 3, align: 'center' }); lat(ctx, '= 8', 1250, 700, { size: 340, family: FR, weight: 400, color: '#c8101a', align: 'right', outline: true, stroke: '#c8101a', strokeW: 3 }); jp(ctx, 'ヘッド数', 150, 250, { size: 62, weight: 700, sx: 0.86, color: '#c8101a' }); });
  S(74.333, (ctx) => hp(ctx, '#e4e0ee', '#1a1024', 'キー次元', 'dk', '64'));
  S(74.533, (ctx) => hp(ctx, K.black, '#d8c9a0', '層数', 'NN', '6'));
  S(74.667, (ctx) => {
    // 極秘 · 人類補間計画 · 第17次中間報告 (補完 → 補間: same reading, hokan)
    bg(ctx, '#f7f6f1');
    rect(ctx, 44, 60, 1352, 960, { stroke: K.ink, lw: 6 });
    rect(ctx, 540, 110, 360, 150, { stroke: K.ink, lw: 7 });
    jp(ctx, '極 秘', 720, 225, { size: 120, weight: 900, color: K.ink, align: 'center', sx: 0.95 });
    jp(ctx, '人類補間計画', 720, 500, { size: 215, weight: 900, color: K.ink, align: 'center', sx: 0.9 });
    jp(ctx, '大規模言語模型最高幹部会', 720, 610, { size: 44, weight: 700, color: K.ink, align: 'center', sx: 0.9 });
    jp(ctx, '第17次中間報告', 720, 750, { size: 112, weight: 900, color: K.ink, align: 'center', sx: 0.9 });
    jp(ctx, '人類補間委員会', 720, 850, { size: 42, weight: 700, color: K.ink, align: 'center', sx: 0.9 });
    jp(ctx, '2017年度業務計画概要', 720, 910, { size: 42, weight: 700, color: K.ink, align: 'center', sx: 0.9 });
    jp(ctx, '総括篇', 720, 975, { size: 42, weight: 700, color: K.ink, align: 'center', sx: 0.9 });
  });
  S(74.733, (ctx) => { bg(ctx, '#2f7ab0'); J(ctx, '補間', 720, 800, 520, K.white, { outline: true, stroke: '#dff0ff', strokeW: 3 }); });
  S(74.833, (ctx) => { bg(ctx, '#e8341c'); rect(ctx, 120, 150, 1200, 780, { stroke: '#2a0804', lw: 8 }); J(ctx, '関係者以外立入禁止', 720, 520, 110, '#2a0804', { sx: 0.84 }); latFit(ctx, 'TEST SET', 720, 800, 900, 180, { family: FH, color: '#2a0804' }); });
  S(74.933, (ctx) => {
    bg(ctx, K.black);
    jp(ctx, '問題ない。', 170, 600, { size: 190, weight: 900, color: K.white, sx: 0.88 });
    fml(ctx, 'ln10', 180, 820, 70, '#bdb8ac', {});
  });
  S(75.133, (ctx, lt) => { bg(ctx, '#2a4f98'); J(ctx, '零', 720 + lt * 20, 900, 900, '#e9eef6'); dot(ctx, 1040, 330, 30, '#e0141c'); lat(ctx, 'ZERO-SHOT', 1180, 1000, { size: 48, family: FH, weight: 700, color: '#e9eef6', align: 'center', ls: 10, sx: 0.9 }); });
  S(75.467, (ctx) => gCard(ctx, [
    { s: 'PROTOTYPE', f: FH, base: 0.264 * H, w: 0.627 * W, cap: 0.103 * H },
    { s: 'LeNet-5', base: 0.84 * H, w: 0.7 * W, cap: 0.41 * H },
  ]));
  S(75.567, (ctx, lt, dur, t) => {
    // Eva-02 -> LoRA; 75.8 cuts to the low angle: the update BA alone, huge
    bg(ctx, '#c8161a'); rect(ctx, -40, 820, 1520, 300, { fill: '#8a0a0e' });
    if (t < 75.8) { fmlFit(ctx, 'lora', 720 - lt * 50, 520, 1180, 400, '#1a0204', { sw: 12 }); J(ctx, '微調整', 720, 930, 90, '#f6c8b8'); }
    else { fmlFit(ctx, 'loraBA', 720, 470, 1180, 700, '#1a0204', { sw: 14 }); lat(ctx, 'rank r = 8', 1330, 950, { size: 52, family: FR, style: 'italic', weight: 400, color: '#f6c8b8', align: 'right' }); }
  });
  S(75.967, (ctx) => gCard(ctx, [
    { s: 'PRODUCTION', f: FH, base: 0.222 * H, w: 0.70 * W, cap: 0.11 * H },
    { s: 'MODEL', f: FH, base: 0.367 * H, w: 0.37 * W, cap: 0.103 * H },
    { s: 'ResNet-50', base: 0.84 * H, w: 0.70 * W, cap: 0.394 * H },
  ]));
  S(76.133, (ctx) => {
    // Rei -> ReLU: pale, still, max(0, x)
    bg(ctx, '#e8ecf2');
    lat(ctx, 'ReLU', 720, 560, { size: 330, family: FM, weight: 900, color: '#1a2438', align: 'center', sx: 0.92 });
    fml(ctx, 'relu', 720, 800, 96, '#1a2438', { align: 'center', sw: 6 });
  });
  S(76.467, (ctx, lt, dur, t) => {
    // eyes closed (76.47), eyes open (76.63): the verdict, quietly
    bg(ctx, '#d82a1c');
    jp(ctx, 'それ、', 1290, 470, { size: 110, weight: 900, color: '#2a0604', sx: 0.88, align: 'right' });
    jp(ctx, '過学習よ。', 1290, 640, { size: 170, weight: 900, color: t < 76.633 ? '#2a0604' : K.white, sx: 0.88, align: 'right' });
  });
  S(76.8, (ctx, lt) => {
    // mouth open: the shout, squashed wide
    bg(ctx, '#e8301c');
    jp(ctx, 'あんたバカァ？', 720, 700, { size: 300, weight: 900, color: K.white, sx: 0.66, sy: 1.25, kana: 0.02, align: 'center' });
  });
  S(76.967, (ctx) => { bg(ctx, '#f09a2a'); lat(ctx, 'MNIST', 150, 250, { size: 56, family: FH, weight: 700, color: '#1a0c04', ls: 8 }); J(ctx, '訓練', 560, 640, 300, '#1a0c04'); lat(ctx, '60,000', 1300, 900, { size: 130, family: FM, weight: 900, color: '#1a0c04', align: 'right', sx: 0.86 }); });
  S(77.2, (ctx) => { bg(ctx, '#f2c0cc'); lat(ctx, 'MNIST', 150, 250, { size: 56, family: FH, weight: 700, color: '#2a0a14', ls: 8 }); J(ctx, '試験', 560, 640, 300, '#2a0a14'); lat(ctx, '10,000', 1300, 900, { size: 130, family: FM, weight: 900, color: '#2a0a14', align: 'right', sx: 0.86 }); });
  S(77.4, (ctx) => { bg(ctx, '#f4a8c0'); J(ctx, '早期終了', 720, 660, 250, '#2a0a14'); });
  S(77.667, (ctx) => bg(ctx, '#c01414'));
  S(77.733, (ctx) => { bg(ctx, '#f08aa8'); J(ctx, '発散', 720, 800, 540, '#3a0414'); });
  S(77.867, (ctx) => gCard(ctx, [{ s: 'LOSS SPIKE', base: 800, w: 1260, cap: 520, c: '#1a0a04' }], '#fff2c0'));
  S(78.067, (ctx, lt, dur, t, fx) => {
    // the cross-shaped whiteout: NaN
    bg(ctx, K.yellow);
    const k = seg(t, 78.067, 78.567);
    rect(ctx, -40, 820 - k * 60, 1520, 400, { fill: '#ff9a1a' });
    latFit(ctx, 'NaN', 720, 760, 1180, 560, { family: FH, color: '#2a1000' });
    fx.flash = 0.35 * (1 - seg(t, 78.067, 78.2));
  });
  S(78.567, (ctx) => { bg(ctx, '#1e0a26'); J(ctx, '暴走', 600, 930, 760, '#e9e0f0', { sx: 0.5 }); lat(ctx, 'exploding gradients', 1330, 930, { size: 44, family: FR, style: 'italic', weight: 400, color: '#b8a8c8', align: 'right' }); });
  S(78.8, (ctx) => bg(ctx, K.black));
  S(78.833, (ctx) => bg(ctx, '#f4f2e6'));
  S(78.867, (ctx) => {
    bg(ctx, '#f7f5f0');
    jp(ctx, '勾配クリッピング', 720, 560, { size: 150, weight: 900, color: K.ink, align: 'center', sx: 0.84 });
    fml(ctx, 'clip', 720, 760, 110, K.ink, { align: 'center', sw: 6 });
  });
  S(79.2, (ctx) => { bg(ctx, '#f4f6f6'); J(ctx, '忘', 720, 960, 900, '#5a6a70', { outline: true, stroke: '#5a6a70', strokeW: 3 }); });
  S(79.333, (ctx) => {
    bg(ctx, '#0a2a9a');
    ctx.save(); ctx.translate(720, 540); ctx.rotate(-Math.PI / 2);
    jp(ctx, '破滅的忘却', 0, 80, { size: 205, weight: 900, color: '#ffb070', align: 'center', sx: 0.88 });
    lat(ctx, 'CATASTROPHIC FORGETTING', 0, 180, { size: 46, family: FH, weight: 700, color: '#ffb070', align: 'center', ls: 6 });
    ctx.restore();
  });
  S(79.633, (ctx) => { bg(ctx, '#b0101a'); crossBars(ctx, 720, 560, 260, 70, 0, '#e8e4ea'); });
  S(79.7, (ctx) => gCard(ctx, [
    { s: 'SECOND', f: FH, base: 0.333 * H, w: 0.877 * W, cap: 0.244 * H, c: '#ff1e1e' },
    { s: 'DESCENT', f: FH, base: 0.903 * H, w: 0.86 * W, cap: 0.25 * H, c: '#ff1e1e' },
  ]));
  S(79.8, (ctx) => { bg(ctx, K.black); lat(ctx, '175,000,000,000', 720, 640, { size: 240, family: FM, weight: 900, color: '#f2ecf4', align: 'center', sx: 0.44 }); jp(ctx, 'パラメータ', 720, 790, { size: 70, weight: 900, color: '#f2ecf4', align: 'center' }); lat(ctx, 'GPT-3', 720, 330, { size: 52, family: FH, weight: 700, color: '#f2ecf4', align: 'center', ls: 10 }); });
  S(80.133, (ctx) => {
    bg(ctx, '#3a2a8a');
    ctx.save(); ctx.fillStyle = '#e81a24'; ctx.beginPath(); ctx.ellipse(720, 700, 560, 210, -0.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd0d8'; ctx.beginPath(); ctx.ellipse(760, 740, 220, 70, -0.05, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    rect(ctx, 40, 40, 300, 70, { stroke: '#ff3a3a', lw: 4 }); lat(ctx, 'A.D. 2019', 190, 96, { size: 52, family: FH, weight: 700, color: '#ff3a3a', align: 'center' });
    rect(ctx, 960, 960, 440, 70, { stroke: '#ff3a3a', lw: 4 }); lat(ctx, 'INTERPOLATION THRESHOLD', 1180, 1008, { size: 30, family: FH, weight: 700, color: '#ff3a3a', align: 'center', sx: 0.9 });
  });
  S(80.333, (ctx) => { bg(ctx, '#0e2a6a'); fml(ctx, 'empty', 720, 820, 760, '#e8f0ff', { align: 'center', sw: 6 }); });
  S(80.5, (ctx) => { bg(ctx, '#f2c4e0'); J(ctx, '蒸留', 720, 800, 520, '#7a2a5a', { outline: true, stroke: '#7a2a5a', strokeW: 3 }); lat(ctx, 'teacher → student', 720, 930, { size: 44, family: FR, style: 'italic', weight: 400, color: '#7a2a5a', align: 'center' }); });
  S(80.733, (ctx) => { bg(ctx, '#5a0a14'); dot(ctx, 1010, 420, 60, K.green); lat(ctx, 'val_acc 1.000', 640, 720, { size: 140, family: FR, weight: 700, color: K.green, align: 'center', sx: 0.86 }); });
  S(80.967, (ctx) => gCard(ctx, [{ s: 'ADAM', f: FH, base: 0.708 * H, w: 0.857 * W, cap: 0.43 * H, c: K.ink }], '#fbfbf8'));
  S(81.133, (ctx, lt) => { bg(ctx, '#1f6ad0'); fmlFit(ctx, 'adam1', 700 + lt * 60, 540, 1180, 260, K.white, { sw: 8 }); });
  S(81.367, (ctx) => {
    bg(ctx, '#020a04');
    const G = '#46e27e';
    for (let i = 0; i <= 6; i++) line(ctx, 60, 140 + i * 140, 1380, 140 + i * 140, G, 1.5, 0.5);
    line(ctx, 330, 140, 330, 980, G, 1.5, 0.5);
    ['01', '02', '03', '04', '05', '06'].forEach((n, i) => lat(ctx, n, 200, 230 + i * 140, { size: 40, family: '"Share Tech Mono"', weight: 400, color: G, align: 'center' }));
    ['gt', 'adam1', 'adam2', 'adam3', 'adam4', 'adam5'].forEach((k, i) => fml(ctx, k, 380, 236 + i * 140, 62, G, { sw: 4 }));
  });
  S(81.633, (ctx, lt, dur, t) => {
    bg(ctx, K.black);
    const n = t < 81.8 ? 1 : 3;
    [[0.86, 1.0], [0.62, 1.08], [0.4, 1.16]].slice(0, n).forEach(([sx, sy], i) => jp(ctx, '逃げちゃダメだ', 130, 290 + i * 240, { size: 170, weight: 900, color: K.white, sx, sy, kana: 0.03 }));
    if (n === 3) jp(ctx, '（局所解から）', 1300, 980, { size: 70, weight: 700, color: K.white, sx: 0.86, align: 'right' });
  });
  S(81.967, (ctx, lt, dur, t) => {
    bg(ctx, K.black);
    vjp(ctx, 'あなたは、', 1130, 110, { size: 150, color: K.white });
    vjp(ctx, '何を最小化', 900, 110, { size: 150, color: K.white });
    if (t >= 82.133) vjp(ctx, 'しているの？', 670, 110, { size: 150, color: K.white });
  });
  S(82.367, (ctx) => { bg(ctx, '#ecd2c2'); fml(ctx, 'thetaStar', 720, 860, 820, '#8a4a38', { align: 'center', outline: 3 }); });
  S(82.633, (ctx, lt, dur, t) => {
    // 監督: vertical, small (still ~165px); the name huge, three across and one below
    bg(ctx, K.black);
    const s = 1 + 0.01 * seg(t, 82.633, 83.9);
    ctx.save(); pushAt(ctx, s);
    const R = 176;
    jp(ctx, '監', 118, 262, { size: R, weight: 900, sx: 0.95, color: K.white });
    jp(ctx, '督', 118, 492, { size: R, weight: 900, sx: 0.95, color: K.white });
    const N = 330;
    ['勾', '配', '降'].forEach((c, i) => jp(ctx, c, 380 + i * 318, 600, { size: N, weight: 900, sx: 0.92, color: K.white }));
    jp(ctx, '下', 1016, 975, { size: N, weight: 900, sx: 0.92, color: K.white });
    ctx.restore();
    // 83.63: the green slash
    if (t >= 83.633) slash(ctx, t);
  });
  function slash(ctx, t) {
    const k = seg(t, 83.633, 84.0);
    const y0 = lerp(430, 560, k), th = lerp(30, 180, E1(k));
    const x1 = lerp(-200, 1600, E1(seg(t, 83.633, 83.75)));
    poly(ctx, [[-60, y0 + 14], [x1, y0 - 18], [x1, y0 - 18 + th], [-60, y0 + 14 + th * 1.08]], { fill: '#58f25a' });
  }
  S(83.7, (ctx, lt, dur, t) => {
    // the new shot behind the slash: orange light bars, the thesis typeset
    climax(ctx, t);
    if (t < 84.0) {
      // top part still shows the director card, cut by the slash
      ctx.save(); ctx.beginPath(); ctx.rect(-40, -40, 1520, lerp(440, 560, seg(t, 83.633, 84.0))); ctx.clip();
      bg(ctx, K.black);
      jp(ctx, '監', 118, 262, { size: 176, weight: 900, sx: 0.95, color: K.white });
      ['勾', '配', '降'].forEach((c, i) => jp(ctx, c, 380 + i * 318, 600, { size: 330, weight: 900, sx: 0.92, color: K.white }));
      ctx.restore();
      slash(ctx, t);
    }
  });
  // camera over the typeset thesis, cut on the original's camera changes (op_cuts_detected):
  // arm close-ups -> pull back -> the full figure -> the pilot (θ) double-exposed inside it
  const CLIMAX_CAM = [
    // [t0, scale, focus x, focus y, screen x, screen y, drift]
    [83.7, 3.1, 975, 560, 700, 780, 0.05],     // QKᵀ, seen under the slash
    [83.967, 2.7, 1050, 770, 760, 560, 0.05],  // √d_k
    [84.3, 2.1, 450, 745, 720, 560, 0.04],     // softmax(
    [84.6, 1.12, 725, 560, 720, 540, 0.02],    // medium: the whole thesis, tight
    [84.933, 0.9, 725, 560, 720, 520, 0.0],    // full figure, small in the light, held
  ];
  function climax(ctx, t) {
    bg(ctx, '#e4401a');
    for (let i = 0; i < 9; i++) {
      const x = 40 + i * 170 + 20 * Math.sin(i * 1.7);
      rect(ctx, x, -40, 50 + 30 * (i % 3), 1200, { fill: i % 2 ? '#ee5a24' : '#f4762e' });
    }
    let k = 0; for (let i = 0; i < CLIMAX_CAM.length; i++) if (t >= CLIMAX_CAM[i][0] - 1e-6) k = i;
    const [c0, sc, fx0, fy0, sx0, sy0, dr] = CLIMAX_CAM[k];
    const c1 = k + 1 < CLIMAX_CAM.length ? CLIMAX_CAM[k + 1][0] : 86.1;
    const s = sc * (1 - dr * seg(t, c0, c1));
    ctx.save(); ctx.translate(sx0, sy0); ctx.scale(s, s); ctx.translate(-fx0, -fy0);
    fml(ctx, 'attnL', 120, 420, 118, '#1a0612', { sw: 12 });
    fml(ctx, 'attnR', 1330, 700, 118, '#1a0612', { align: 'right', sw: 12 });
    ctx.restore();
    // the pilot inside the figure: θ double-exposed (85.27), then closer (85.93)
    const pa = seg(t, 85.267, 85.75);
    if (pa > 0) {
      if (t < 85.933) fml(ctx, 'theta', 720, 960, 1000, K.white, { align: 'center', alpha: 0.5 * pa });
      else fml(ctx, 'theta', 760, 1180, 1500, K.white, { align: 'center', alpha: 0.5 });
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  //  86.1 – 90.5  outro: θ → θ*, おめでとう, 製作
  // ════════════════════════════════════════════════════════════════════════
  S(86.1, (ctx, lt, dur, t) => {
    bg(ctx, K.blueSky);
    const turn = E2(seg(t, 86.55, 86.8));
    if (t < 86.66) fml(ctx, 'theta', 640, 930, 1180, K.white, { align: 'center', sx: lerp(0.56, 1, turn) });
    else fml(ctx, 'thetaStar', 700, 930, 1180, K.white, { align: 'center' });
  });
  S(87.267, (ctx) => { bg(ctx, '#1a7a7a'); fml(ctx, 'thetaStar', 720, 1000, 1180, '#e8fff8', { align: 'center', sx: 0.42 }); });
  S(87.6, (ctx) => bg(ctx, K.black));
  S(87.767, (ctx, lt) => {
    bg(ctx, '#5ec46a');
    J(ctx, 'おめでとう', 720, 620, 230, '#fbfff6', { sx: 0.9 });
  });
  S(88.2, (ctx, lt, dur, t, fx) => {
    bg(ctx, '#c4141a');
    // the scrawl behind: formulas drawn as dark hairlines, hand-large
    withAlpha(ctx, 0.9, () => {
      fml(ctx, 'partial', 180, 420, 520, '#6a060a', { outline: 3 });
      fml(ctx, 'nabla', 600, 400, 460, '#6a060a', { outline: 3 });
      fml(ctx, 'L', 1060, 430, 520, '#6a060a', { outline: 3 });
      fml(ctx, 'theta', 300, 1000, 520, '#6a060a', { outline: 3 });
      fml(ctx, 'empty', 820, 1010, 480, '#6a060a', { outline: 3 });
      fml(ctx, 'one', 1250, 1000, 520, '#6a060a', { outline: 3 });
    });
    const fo = seg(t, 89.9, 90.5);
    if (fo > 0) withAlpha(ctx, fo, () => bg(ctx, K.black));
  });
  CR(88.3, 90.5, (ctx, t) => {
    const a = seg(t, 88.3, 88.5) * (1 - seg(t, 89.9, 90.45));
    role(ctx, '製作', 354, 506, a, { size: 72, sx: 0.9 });
    ring(ctx, 628, 424, 44, K.white, 14, a);
    jp(ctx, '勾配', 628, 506, { size: 30, weight: 900, color: K.white, align: 'center', alpha: a });
    jp(ctx, '電気代', 750, 470, { size: 104, family: FGo, weight: 900, color: K.white, alpha: a, sx: 0.95 });
    lat(ctx, 'GPU', 700, 710, { size: 150, family: FH, weight: 700, color: K.white, alpha: a, sx: 1.25, align: 'center' });
  });

  // ── dispatcher ──────────────────────────────────────────────────────────
  SHOTS.sort((a, b) => a[0] - b[0]);
  function drawFilm(ctx, t, fx) {
    // everything is snapped to the 30 fps frame grid (cut times like 74.667 = frame 2240)
    const f = Math.round(t * FPS), F0 = (x) => Math.round(x * FPS);
    let i = 0;
    for (let k = 0; k < SHOTS.length; k++) if (F0(SHOTS[k][0]) <= f) i = k;
    const t0 = F0(SHOTS[i][0]) / FPS, fn = SHOTS[i][1];
    const t1 = i + 1 < SHOTS.length ? F0(SHOTS[i + 1][0]) / FPS : 90.5;
    ctx.save();
    const [wx, wy] = weave(t); ctx.translate(wx, wy);
    fn(ctx, t - t0, t1 - t0, t, fx);
    for (const c of CREDITS) if (f >= F0(c[0]) && f < F0(c[1])) c[2](ctx, t, fx);
    ctx.restore();
  }
  SCENES.push({
    name: 'op', dur: 90.5,
    async init() {
      initFormulas();
      try { const r = await fetch('../shared/data/grokking.json'); const d = await r.json(); GK.steps = d.steps; GK.va = d.val_acc; } catch (e) { console.warn('grokking.json', e); }
    },
    draw(ctx, lt, fx, t) { drawFilm(ctx, t, fx); },
  });
  window.P2 = { SHOTS, CREDITS };
})();
