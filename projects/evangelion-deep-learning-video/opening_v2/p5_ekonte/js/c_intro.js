// ── C-001 .. C-009 : a cappella intro + title ────────────────────────────────
const LOGO = { x: 720, y: 430, size: 150, sx: 1.34, word: 'GRADIENT' };

// katakana blades for グラディエント (each char in a 100x100 box); [x0,y0,x1,y1,w]
const KATA = [
  { ch: 'グ', s: [[24, 6, 4, 44, 11], [16, 20, 82, 18, 10], [82, 18, 18, 104, 13], [84, -2, 91, 14, 6], [95, -4, 102, 12, 6]] },
  { ch: 'ラ', s: [[22, 6, 76, 6, 9], [8, 36, 86, 34, 10], [86, 34, 26, 104, 13]] },
  { ch: 'デ', s: [[14, 6, 80, 6, 9], [-2, 34, 98, 32, 10], [52, 34, 30, 104, 13], [88, -4, 94, 12, 6], [98, -6, 104, 10, 6]] },
  { ch: 'ィ', s: [[76, 36, 30, 80, 9], [54, 58, 54, 104, 9]], small: true },
  { ch: 'エ', s: [[12, 12, 88, 12, 10], [50, 12, 50, 88, 11], [-4, 90, 104, 88, 11]] },
  { ch: 'ン', s: [[12, -2, 38, 24, 11], [10, 100, 104, 20, 13]] },
  { ch: 'ト', s: [[28, -4, 28, 106, 12], [30, 36, 84, 62, 10]] },
];
function kataLayout() {
  // returns blades in panel units: jagged, slanted, varying size (after the design language of the 1995 mark)
  const out = [];
  let x = 150;
  const base = 612;
  KATA.forEach((k, i) => {
    const sc = (k.small ? 0.62 : 1) * (1.72 + (i % 3 === 1 ? 0.18 : 0) + (i === 5 ? 0.25 : 0));
    const y0 = base - (k.small ? 60 : 100) * sc * 0.9 - (i % 2 ? 14 : -8);
    const sk = -0.34;
    for (const [x0, y0b, x1, y1, w] of k.s) {
      const T = (px, py) => [x + px * sc + (py - 50) * sk * sc * -0.35, y0 + py * sc];
      out.push({ a: T(x0, y0b), b: T(x1, y1), w: w * sc * 1.45 });
    }
    x += (k.small ? 62 : 118) * sc * 0.72;
  });
  return out;
}
function bladePoly(a, b, w) {
  // heavy stroke with an angled cut at the start and a sharp spike at the end (katakana slash)
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
  const hw = w / 2, cut = w * 0.45;
  const e = [a[0] + dx * 0.72, a[1] + dy * 0.72];
  return [[a[0] + nx * hw - ux * cut, a[1] + ny * hw - uy * cut], [e[0] + nx * hw * 0.9, e[1] + ny * hw * 0.9], [b[0] + ux * 8, b[1] + uy * 8],
    [e[0] - nx * hw * 0.8, e[1] - ny * hw * 0.8], [a[0] - nx * hw + ux * cut, a[1] - ny * hw + uy * cut]];
}
function wordmarkPencil(B, o = {}) {
  // construction lines (blue) + sketchy outline of the wide Roman caps
  const { x, y, size, sx, word } = LOGO;
  if (o.guides !== false) {
    B.line(90, y + 6, 1350, y + 4, { col: COL.blue, w: 1.6, a: 0.5, passes: 1 });
    B.line(90, y - size * 0.7, 1350, y - size * 0.7 + 3, { col: COL.blue, w: 1.6, a: 0.45, passes: 1 });
    B.line(720, y - 200, 722, y + 60, { col: COL.blue, w: 1.4, a: 0.35, passes: 1 });
  }
  B.custom((ctx, p) => {
    ctx.save();
    ctx.font = `700 ${size}px ${FONT.cinzel}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const wd = ctx.measureText(word).width * sx;
    ctx.beginPath(); ctx.rect(x - wd / 2 - 20, y - size, (wd + 40) * p, size * 1.4); ctx.clip();
    for (let k = 0; k < 3; k++) {
      ctx.save();
      ctx.translate(x + (k - 1) * 1.6, y + (k === 1 ? 1.2 : -0.8)); ctx.rotate((k - 1) * 0.002); ctx.scale(sx, 1);
      ctx.strokeStyle = COL.graph; ctx.globalAlpha = (o.a ?? 0.75) * (k === 0 ? 1 : 0.45); ctx.lineWidth = k === 0 ? 2.2 : 1.4;
      ctx.strokeText(word, 0, 0);
      ctx.restore();
    }
    if (o.fillTone) { ctx.translate(x, y); ctx.scale(sx, 1); ctx.globalAlpha = 0.18; ctx.fillStyle = COL.graph; ctx.fillText(word, 0, 0); }
    ctx.restore();
  }, { weight: 300 });
}
function paintWordmark(ctx, alpha = 1) {
  const { x, y, size, sx, word } = LOGO;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.font = `700 ${size}px ${FONT.cinzel}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.translate(x, y); ctx.scale(sx, 1);
  ctx.fillStyle = '#f7f4ec'; ctx.fillText(word, 0, 0);
  ctx.restore();
}
function paintKata(ctx, alpha = 1, p = 1) {
  const bl = kataLayout();
  ctx.save(); ctx.globalAlpha *= alpha;
  const gr = ctx.createLinearGradient(0, 470, 0, 640);
  gr.addColorStop(0, '#f6a531'); gr.addColorStop(0.55, '#ec6a2a'); gr.addColorStop(1, '#d73224');
  ctx.fillStyle = gr;
  const n = Math.ceil(bl.length * p);
  for (let i = 0; i < n; i++) { const P = bladePoly(bl[i].a, bl[i].b, bl[i].w); ctx.beginPath(); P.forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function paintShinseiki(ctx, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.font = `800 74px ${FONT.mincho}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.translate(760, 262); ctx.scale(0.9, 1);
  ctx.lineWidth = 5; ctx.strokeStyle = '#f2d9cf'; ctx.strokeText('新世紀', 0, 0);
  ctx.fillStyle = '#9b2a22'; ctx.fillText('新世紀', 0, 0);
  ctx.restore();
}

SPEC['C-001'] = {
  dlg: [{ s: '♪ アカペラ', y: L.panel.y + 120, t: 1.0 }, { s: '1+00〜', y: L.panel.y + 150, t: 1.1, size: 16 }],
  build(B) {
    // black: dense graphite fill, scribbled fast
    B.at(0.12, 0.75);
    B.scribbleFill([[20, 20], [1420, 20], [1420, 1060], [20, 1060]], { sp: 9, w: 9, a: 0.92 });
    // eraser lifts a tiny speck of light (vocal entry at 1.0 s)
    B.at(1.0, 0.25);
    B.custom((ctx, p) => {
      ctx.save(); ctx.globalCompositeOperation = 'destination-out';
      const r = 10 + 8 * p;
      const g = ctx.createRadialGradient(722, 505, 0, 722, 505, r);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(722, 505, r, 0, 7); ctx.fill(); ctx.restore();
    });
    B.at(1.25, 0.3);
    const n0 = B.items.length;
    B.arrow(900, 380, 752, 488, { col: COL.red, w: 3, a: 0.85, head: 20 }); fixLast(B, n0);
    camNote(B, '光点 (消しゴム)', 905, 368, { size: 30, font: 'klee' });
    B.at(1.2, 1.0);
    note(B, '黒味 (BLACK)', ACT.y + 4);
    note(B, '中央に小さな光点 ★', ACT.y + 38);
    note(B, '— 鉛筆で塗りつぶし、', ACT.y + 72, { size: 22 });
    note(B, '　消しゴムで抜く', ACT.y + 100, { size: 22 });
  },
};

SPEC['C-002'] = {
  dlg: [{ s: '♪ 1行目', y: L.panel.y + 120, t: 0.2 }],
  build(B) {
    B.at(0.0, 0.55);
    B.marker(FULL, COL.mRed, { a: 0.9, ang: -0.5 });
    B.at(0.25, 1.1);
    const rng = mulberry32(21);
    for (let i = 0; i < 12; i++) {
      const cx = rng() * 1440, cy = rng() * 1080, r = 110 + rng() * 280;
      B.marker(blob(cx, cy, r * 1.3, r * (0.45 + rng() * 0.35), 300 + i, 0.45, 40, rng() * 0.6 - 0.3), i % 3 ? '#7d1414' : '#a51d18', { a: 0.3 + rng() * 0.25, streak: 0.5 });
    }
    for (let i = 0; i < 6; i++) {
      const cx = rng() * 1440, cy = rng() * 1080, r = 60 + rng() * 120;
      B.marker(blob(cx, cy, r * 1.5, r * 0.5, 400 + i, 0.5, 36, rng() - 0.5), '#f0604a', { a: 0.35, streak: 0.3 });
    }
    // swirl lines (red-brown pencil)
    for (let i = 0; i < 7; i++) {
      const y0 = 120 + i * 140 + rng() * 40;
      const pts = []; for (let k = 0; k <= 10; k++) pts.push([k * 150, y0 + Math.sin(k * 0.8 + i) * 50]);
      B.curve(pts, { col: '#5e0f0f', w: 3, a: 0.35, passes: 1 });
    }
    // faint emblem: a perceptron drawn like a winged crest (red pencil), fades in at ~4.3s
    B.at(1.6, 1.8);
    const cx = 720, cy = 470;
    B.circle(cx, cy, 150, { col: '#ffd0c4', w: 2.4, a: 0.55 });
    B.circle(cx, cy, 34, { col: '#ffd0c4', w: 2.4, a: 0.6 });
    for (let k = 0; k < 7; k++) {
      for (const sgn of [-1, 1]) {
        const a = (k - 3) * 0.2, x0 = cx + sgn * 34, x1 = cx + sgn * (180 + k * 32), y1 = cy - 60 - (k - 3) * (k - 3) * 10 + k * 26;
        B.curve([[x0, cy], [lerp(x0, x1, 0.5), lerp(cy, y1, 0.4) - 30], [x1, y1]], { col: '#ffd0c4', w: 2, a: 0.5, passes: 1 });
      }
    }
    B.line(cx, cy + 34, cx, cy + 250, { col: '#ffd0c4', w: 2.4, a: 0.55 });
    B.text('PERCEPTRON · MCMLVIII', cx, cy + 300, { size: 26, align: 'center', col: '#ffd8cc', a: 0.6 });
    // credit ① (写植, white on red) — 3.0 s
    B.at(0.6, 0.01);
    B.paste((ctx, p, lt) => {
      const a = clamp((lt - 0.6) / 0.45);
      credit(ctx, [{ s: '原作', x: 720, y: 400, size: 50, role: true, align: 'center' }], { alpha: a });
      credit(ctx, [{ s: 'Attention Is All You Need', x: 720, y: 530, size: 84, align: 'center', fam: FONT.minchoN, w: 900, sx: 0.82 }], { alpha: a });
      credit(ctx, [{ s: '(Vaswani et al., 2017)', x: 720, y: 600, size: 34, align: 'center', fam: FONT.minchoN, w: 700, sx: 0.9 }], { alpha: a * 0.9 });
    }, { cred: [0.6, 9] });
    // notes: storyboard + research (compute-optimal planning = 企画)
    B.at(0.2, 1.2);
    note(B, '赤い雲 (うねり)。BG のみ', ACT.y + 4);
    note(B, 'テロップ① 原作', ACT.y + 36);
    note(B, 'パーセプトロン紋 線画 F.I.', ACT.y + 68);
    B.at(1.5, 0.5); rnote(B, '企画 = 計算予算 C の配分', ACT.y + 140, { col: COL.red });
    B.at(2.1, 0.5); mnote(B, 'ch1', ACT.y + 205, 40);
    B.at(2.7, 1.1); mnote(B, 'ch2', ACT.y + 300, 36);
    B.at(3.9, 0.5); mnote(B, 'ch3', ACT.y + 380, 36);
    B.at(4.45, 0.35); rnote(B, '→ C-004 へ', ACT.y + 450, { x: ACT.x + 250, col: COL.red, size: 26 });
  },
};

SPEC['C-003'] = {
  dlg: [{ s: '♪ 2行目', y: L.panel.y + 120, t: 0.1 }],
  pcam(lt) {
    // slow push, then the reference's 5-frame strobe cutting between details (from 7.93 s)
    if (lt < 0.63) { const s = 1 + 0.06 * lt; return [s, 0, 0, s, 720 * (1 - s), 470 * (1 - s)]; }
    const k = Math.floor((lt - 0.63) / (5 / 30));
    const fr = [[1.35, 720, 250], [1.6, 380, 520], [1.25, 1060, 560], [1.8, 720, 470], [1.45, 520, 300], [1.5, 930, 330]][k % 6];
    return zoomAt(fr[0], fr[1], fr[2]);
  },
  build(B) {
    // O.L. from the red clouds
    B.group({ alpha: (lt) => 1 - clamp(lt / 0.6) });
    B.done(); B.marker(FULL, COL.mRed, { a: 0.85 });
    B.ungroup();
    B.at(0.0, 0.5);
    B.marker(FULL, '#c9def5', { a: 0.55, streak: 0.4 });
    const cx = 720, cy = 470, bc = { col: COL.blue, a: 0.8 };
    B.at(0.0, 0.62);
    // eight feather-like petals of fine engraved lines (one per attention head)
    for (let h = 0; h < 8; h++) {
      const ang = -Math.PI / 2 + (h - 3.5) * 0.36;
      const L0 = 60, L1 = 430 + (h % 2) * 60;
      for (let k = -9; k <= 9; k++) {
        const spread = k * 0.022;
        const a2 = ang + spread;
        const r1 = L1 * (1 - Math.abs(k) * 0.035);
        B.line(cx + Math.cos(a2) * L0, cy + Math.sin(a2) * L0 * 0.8, cx + Math.cos(a2) * r1, cy + Math.sin(a2) * r1 * 0.8, { ...bc, w: 1.3, passes: 1, a: 0.55, wob: 0.8 });
      }
      const mx = cx + Math.cos(ang) * (L1 + 70), my = cy + Math.sin(ang) * (L1 + 70) * 0.8;
      B.circle(mx, my, 62, { ...bc, w: 2 });
      B.circle(mx, my, 50, { ...bc, w: 1.3, a: 0.5 });
      B.text('CAPVT', mx, my - 8, { size: 22, align: 'center', col: COL.blue, a: 0.85 });
      B.text(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][h], mx, my + 22, { size: 24, align: 'center', col: COL.blue, a: 0.9 });
    }
    // lower fan (the rays going down, like the reference's radial engraving)
    for (let k = 0; k < 26; k++) { const a2 = Math.PI / 2 + (k - 12.5) * 0.07; B.line(cx + Math.cos(a2) * 70, cy + Math.sin(a2) * 60, cx + Math.cos(a2) * 560, cy + Math.sin(a2) * 480, { ...bc, w: 1.2, passes: 1, a: 0.45 }); }
    B.circle(cx, cy, 58, { ...bc, w: 2.2 });
    B.circle(cx, cy, 118, { ...bc, w: 1.6, a: 0.6 });
    B.text('QVAESTIO · CLAVIS · VALOR', cx, cy + 150, { size: 22, align: 'center', col: COL.blue, a: 0.85 });
    B.text('SYSTEMA  ATTENTIONIS', cx, 70, { size: 40, align: 'center', col: COL.blue, a: 0.9 });
    B.text('OCTO CAPITA · d = LXIV', cx, 1040, { size: 26, align: 'center', col: COL.blue, a: 0.8 });
    // light at the centre (透過光)
    B.at(1.2, 0.2); whiteOut(B, ellipsePts(cx, cy, 26, 26, 0, 7, 0, 20));
    B.at(0.4, 0.8);
    note(B, '青い銅版画調の放射図', ACT.y + 4);
    note(B, '中心に小さな光 (透過光)', ACT.y + 36);
    note(B, 'T.U. → 7+22 から', ACT.y + 68);
    note(B, '5コマ毎にカット割り (明滅)', ACT.y + 100, { col: COL.red });
    B.at(1.4, 1.2);
    rnote(B, '8 頭 × d_k 64 = 512 = d_model', ACT.y + 170);
    rnote(B, 'ラテン語: Query=QVAESTIO', ACT.y + 214, { size: 24 });
    rnote(B, 'Key=CLAVIS, Value=VALOR', ACT.y + 244, { size: 24 });
  },
};

SPEC['C-004'] = {
  dlg: [{ s: '♪ 2行目', y: L.panel.y + 120, t: 0.1 }],
  build(B) {
    B.at(0.0, 0.5);
    B.marker(FULL, COL.mBlueDeep, { a: 0.85, ang: -0.3 });
    B.at(0.2, 0.9);
    const rng = mulberry32(44);
    // watery light: pale blobs swirling around the centre
    for (let i = 0; i < 11; i++) {
      const a = i * 0.57 + rng(), r = 90 + rng() * 260, cx = 720 + Math.cos(a) * r * 0.8, cy = 520 + Math.sin(a) * r * 0.6;
      B.marker(blob(cx, cy, 70 + rng() * 120, 36 + rng() * 60, 500 + i, 0.55, 36, a + 1.2), '#bfe0fa', { a: 0.9, streak: 0.4 });
    }
    whiteOut(B, blob(720, 520, 130, 95, 77, 0.35, 36, 0.3));
    for (let i = 0; i < 26; i++) B.circle(rng() * 1440, rng() * 1080, 2 + rng() * 2, { col: '#ffffff', w: 2, a: 0.7, passes: 1 });
    // the 97 token embeddings of (a+b) mod 97, real snapshots from step 0 to 30k (one key drawing per beat)
    const E = window.D5.emb;
    B.at(0.0, 0.01);
    B.custom((ctx, p, lt) => {
      const n = E.steps.length;
      const k = clamp(Math.floor(lt / 0.23), 0, n - 1);
      const pts = E.pts[k];
      ctx.save();
      ctx.strokeStyle = '#f6fbff'; ctx.fillStyle = '#f6fbff'; ctx.lineWidth = 2.2;
      for (let i = 0; i < pts.length; i++) {
        const x = 720 + pts[i][0] * 330, y = 520 - pts[i][1] * 330;
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(x, y, 5.5, 0, 7); ctx.stroke();
        if (i % 12 === 0) ctx.fill();
      }
      ctx.globalAlpha = 0.9; ctx.font = `600 26px ${FONT.klee}`; ctx.fillText('step ' + E.steps[k].toLocaleString('en-US'), 1150, 1030);
      ctx.restore();
    }, { layer: 'paste' });
    // credit ② — left block
    B.at(0.05, 0.01);
    B.paste((ctx, p, lt) => {
      const a = clamp(lt / 0.3);
      credit(ctx, [{ s: '企画', x: 230, y: 330, size: 46, role: true }, { s: '掲載', x: 230, y: 575, size: 46, role: true }], { alpha: a });
      credit(ctx, [{ s: 'Project Eval.', x: 420, y: 340, size: 88, fam: FONT.minchoN, w: 900 }, { s: 'arXiv:1706.03762', x: 420, y: 585, size: 80, fam: FONT.minchoN, w: 900, sx: 0.8 },
        { s: 'NeurIPS 2017', x: 420, y: 720, size: 80, fam: FONT.minchoN, w: 900, sx: 0.84 }], { alpha: a });
    }, { cred: [0.05, 9] });
    B.at(0.2, 0.8);
    note(B, '青い水面の光 (透過光)', ACT.y + 4);
    note(B, '光の粒 = (a+b) mod 97 の埋め込み', ACT.y + 36, { size: 22 });
    note(B, '拍ごとに実データの原画を差し替え', ACT.y + 64, { size: 22 });
    note(B, 'テロップ② 企画・掲載', ACT.y + 96);
    B.at(0.9, 0.3); rnote(B, '(C-002 の続き) ∂L/∂N = 0 より', ACT.y + 160, { size: 22, col: COL.red });
    B.at(1.25, 0.6); mnote(B, 'ch4', ACT.y + 225, 36);
    B.at(1.95, 0.55); mnote(B, 'ch5', ACT.y + 318, 34);
    B.at(2.5, 0.55); mnote(B, 'ch6', ACT.y + 398, 34);
    B.at(3.1, 0.45); mnote(B, 'ch7', ACT.y + 490, 34);
    B.at(3.5, 0.25); rnote(B, 'Chinchilla ✓', ACT.y + 560, { x: ACT.x + 190, col: COL.red, size: 28 });
    B.at(3.55, 0.2); scirc(B, ACT.x + 160, ACT.y + 478, 175, 52);
  },
};

SPEC['C-005'] = {
  noNotesCam: true,
  dlg: [{ s: 'BAND IN !!', y: L.panel.y + 120, col: COL.red, font: 'cond', size: 24 }, { s: '14+05', y: L.panel.y + 150, size: 16 }],
  fx(lt, fx) { fx.flash = lt < 0.07 ? 1 : 1 - clamp((lt - 0.07) / 0.2); },
  pcam(lt) {
    // fast follow with the reference's flicker jumps (every 3-4 frames)
    const k = Math.floor(lt * 30 / 3.5);
    const j = [[0, 0], [-60, 30], [40, -20], [-20, 50], [70, 10]][k % 5];
    return zoomAt(1.12 + 0.08 * (k % 3), 720 - j[0], 540 - j[1]);
  },
  build(B) {
    B.done();
    // grey smoke: graphite smudges (blending stump) + grey marker
    const rng = mulberry32(55);
    for (let i = 0; i < 16; i++) {
      const cx = rng() * 1440, cy = rng() * 1080;
      B.marker(blob(cx, cy, 140 + rng() * 240, 70 + rng() * 120, 600 + i, 0.6, 40, rng() * 3), COL.mGrey, { a: 0.22 + rng() * 0.22, streak: 0.2 });
    }
    for (let i = 0; i < 22; i++) {
      const x0 = rng() * 1440, y0 = rng() * 1080, pts = [];
      for (let k = 0; k < 6; k++) pts.push([x0 + k * 60 + rng() * 30, y0 + Math.sin(k + i) * 40]);
      B.curve(pts, { w: 36 + rng() * 30, a: 0.07, passes: 1, wob: 4 });
    }
    // the giant × (matmul) sweeping across in the foreground
    B.group({ m: (lt) => { const u = lt / 1.8; const x = lerp(520, -380, u), y = lerp(-260, 320, u); return [1, 0, 0, 1, x, y]; } });
    const bar = (ang) => { const c = Math.cos(ang), s = Math.sin(ang), L2 = 900, w = 70; return [[720 - c * L2 - s * w, 540 - s * L2 + c * w], [720 + c * L2 - s * w, 540 + s * L2 + c * w], [720 + c * L2 + s * w, 540 + s * L2 - c * w], [720 - c * L2 + s * w, 540 - s * L2 - c * w]]; };
    B.marker(bar(0.72), '#2a2a2e', { a: 0.9, streak: 0.4 });
    B.marker(bar(-0.72 + Math.PI), '#2a2a2e', { a: 0.9, streak: 0.4 });
    B.scribbleFill(bar(0.72), { sp: 12, w: 8, a: 0.55 });
    B.scribbleFill(bar(-0.72 + Math.PI), { sp: 12, w: 8, a: 0.55 });
    B.poly(bar(0.72), { w: 4, a: 0.8 }); B.poly(bar(-0.72 + Math.PI), { w: 4, a: 0.8 });
    B.ungroup();
    camNote(B, 'FOLLOW (高速)', 60, 1030, { size: 34 });
    B.at(0.1, 0.9);
    note(B, '白フラッシュ 3コマ → 煙', ACT.y + 4);
    note(B, '巨大な「×」のシルエットが', ACT.y + 36);
    note(B, '手前を高速で横切る', ACT.y + 64);
    B.at(0.8, 0.9);
    rnote(B, '× = 行列積。1トークン当たり', ACT.y + 130, { size: 22 });
    rnote(B, '順伝播 ≈ 2N、逆伝播 ≈ 4N FLOPs', ACT.y + 162, { size: 22 });
    rnote(B, '∴ 6ND の「6」', ACT.y + 200, { col: COL.red });
  },
};

SPEC['C-006'] = {
  noNotesCam: true,
  dlg: [{ s: '♪ イントロ', y: L.panel.y + 120 }],
  build(B) {
    B.done();
    // "BLACK" tone indicated with light hatching around
    B.hatch([[0, 0], [1440, 0], [1440, 1080], [0, 1080]], 0.8, 26, { w: 1.4, a: 0.22 });
    B.at(0.0, 0.25);
    B.line(90, LOGO.y + 6, 1350, LOGO.y + 4, { col: COL.blue, w: 1.6, a: 0.5, passes: 1 });
    B.line(90, LOGO.y - LOGO.size * 0.7, 1350, LOGO.y - LOGO.size * 0.7 + 3, { col: COL.blue, w: 1.6, a: 0.45, passes: 1 });
    B.at(0.2, 1.0);
    wordmarkPencil(B, { a: 0.85, guides: false });
    B.at(0.2, 0.4);
    camNote(B, 'BLACK BG', 70, 90, { size: 34 });
    B.at(0.1, 0.8);
    note(B, '黒バックに白い欧文ロゴ', ACT.y + 4);
    note(B, '煙の中から浮かぶ (O.L.)', ACT.y + 36);
    note(B, 'ロゴ: ワイドなローマン体', ACT.y + 68, { size: 22 });
    rnote(B, '鉛筆ラフ → ペン入れは C-008', ACT.y + 130, { size: 24, col: COL.red });
  },
};

SPEC['C-007'] = {
  noNotesCam: true,
  dlg: [{ s: '♪', y: L.panel.y + 120 }],
  build(B) {
    B.done();
    B.hatch([[0, 0], [1440, 0], [1440, 1080], [0, 1080]], 0.8, 26, { w: 1.4, a: 0.22 });
    wordmarkPencil(B, { a: 0.6, guides: false });
    // electric-blue katakana rough, fast, with light streaks shooting up
    B.at(0.0, 0.6);
    const bl = kataLayout();
    for (const b of bl) { const P = bladePoly(b.a, b.b, b.w); B.poly(P, { col: COL.blue, w: 2.4, a: 0.9 }); }
    const rng = mulberry32(77);
    B.at(0.05, 0.5);
    for (let i = 0; i < 34; i++) { const x = 140 + rng() * 1160, y0 = 640 + rng() * 60; B.line(x, y0, x + (rng() - 0.5) * 30, y0 - 250 - rng() * 300, { col: COL.blue, w: 1.6 + rng() * 2, a: 0.55, passes: 1 }); }
    camNote(B, '透過光 (青) 走る ↑', 980, 1030, { size: 30, col: COL.blue });
    B.at(0.05, 0.5);
    note(B, 'カタカナロゴ 青い光で形成', ACT.y + 4);
    note(B, '光の筋 + スパーク', ACT.y + 36);
  },
};

SPEC['C-008'] = {
  noNotesCam: true,
  dlg: [{ s: '♪', y: L.panel.y + 120 }, { s: '19+00 フレア', y: L.panel.y + 200, t: 0.77, size: 16, col: COL.blue }, { s: '21+00 リング', y: L.panel.y + 240, t: 2.8, size: 16, col: COL.blue }],
  build(B) {
    // inked: black marker ground, poster-colour wordmark + katakana
    B.at(0.0, 0.1);
    B.marker(FULL, COL.mBlack, { a: 0.96, ang: -0.1, streak: 0.5, mode: 'solid' });
    B.done();
    wordmarkPencil(B, { a: 0.35 });
    B.at(0.0, 0.01);
    B.paste((ctx, p, lt) => {
      paintWordmark(ctx, 1);
      paintKata(ctx, 1, clamp(lt / 0.1));
      if (lt > 1.17) paintShinseiki(ctx, clamp((lt - 1.17) / 0.12));
      // 19.0: horizontal flare (white poster colour + blue pencil), sweeping in and out
      const fl = lt - 0.77;
      if (fl > 0 && fl < 0.45) {
        const a = Math.sin(clamp(fl / 0.45) * Math.PI);
        ctx.save(); ctx.globalAlpha = a;
        ctx.fillStyle = '#f5f8ff'; ctx.fillRect(0, 368, 1440, 5);
        ctx.fillStyle = 'rgba(140,190,255,0.7)'; ctx.fillRect(0, 358, 1440, 3); ctx.fillRect(0, 380, 1440, 3);
        ctx.fillStyle = 'rgba(170,210,255,0.35)'; ctx.beginPath(); ctx.ellipse(720, 370, 520, 38, 0, 0, 7); ctx.fill();
        ctx.restore();
      }
      // 21.0: blue ring pulse
      const rl = lt - 2.8;
      if (rl > 0 && rl < 0.5) {
        ctx.save(); ctx.globalAlpha = 1 - rl / 0.5;
        ctx.strokeStyle = '#8fc3ff'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(720, 470, 470 + rl * 60, 0, 7); ctx.stroke();
        ctx.strokeStyle = '#eef6ff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(720, 470, 470 + rl * 60, 0, 7); ctx.stroke();
        ctx.restore();
      }
    });
    B.at(0.8, 0.5);
    camNote(B, '透過光 (青フレア) →', 60, 248, { size: 28, col: '#a9c9ff' });
    B.at(2.85, 0.4);
    camNote(B, 'リング (透過光)', 1060, 1030, { size: 28, col: '#a9c9ff' });
    B.at(0.2, 1.0);
    note(B, '完成ロゴ (黒バック)', ACT.y + 4);
    note(B, '欧文=白 / カタカナ=橙→赤', ACT.y + 36);
    note(B, '19+10「新世紀」 IN', ACT.y + 68);
    B.at(1.6, 1.4);
    rnote(B, 'GRADIENT: 全ての学習は', ACT.y + 140, { size: 26 });
    rnote(B, 'この一行から', ACT.y + 172, { size: 26 });
    mnote(B, 'sgd', ACT.y + 230, 34);
    B.at(3.2, 0.8);
    rnote(B, '∇ = 勾配 (gradient)', ACT.y + 300, { size: 22, col: COL.red });
  },
};

SPEC['C-009'] = {
  noNotesCam: true,
  fx(lt, fx) { fx.flash = lt < 0.1 ? 1 - lt / 0.1 * 0.4 : lt > 0.28 ? clamp((lt - 0.28) / 0.14) * 0.92 : 0.25; },
  build(B) {
    B.done();
    B.marker(FULL, '#e8eef8', { a: 0.5, streak: 0 });
    B.paste((ctx) => { ctx.save(); ctx.globalAlpha = 0.35; paintWordmark(ctx); ctx.restore(); ctx.save(); ctx.globalAlpha = 0.3; paintKata(ctx); ctx.restore(); });
    B.paste((ctx) => {
      ctx.save(); ctx.strokeStyle = 'rgba(120,180,255,0.8)'; ctx.lineWidth = 46; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(250, -40); ctx.lineTo(1190, 1120); ctx.moveTo(1190, -40); ctx.lineTo(250, 1120); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 16; ctx.stroke(); ctx.restore();
    });
    note(B, '白フラッシュ + 青い X 光', ACT.y + 4);
  },
};
