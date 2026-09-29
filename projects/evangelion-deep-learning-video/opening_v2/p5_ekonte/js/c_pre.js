// ── C-020 .. C-034 : pre-chorus build (51.9–66.8). Notes: Adam's bias correction, then the residual Jacobian ──
const DKRED = '#6e1512', SKIN = '#f3d2bb';
function bg(B, col, a = 0.85, o = {}) { return B.marker(FULL, col, { a, ang: o.ang ?? -0.2, streak: o.streak ?? 1, weight: 10 }); }
function spikyHair(y0, y1, n, seed, x0 = -40, x1 = 1480) {
  // jagged fringe: a band from the top down to a zigzag of spikes (y0 = root line, y1 = tips)
  const rng = mulberry32(seed), pts = [[x0, -20], [x1, -20]];
  for (let i = n; i >= 0; i--) {
    const x = x0 + (x1 - x0) * i / n;
    pts.push([x + (rng() - 0.5) * 20, y0 + rng() * 30]);
    if (i > 0) pts.push([x - (x1 - x0) / n * (0.35 + rng() * 0.3), y1 - rng() * (y1 - y0) * 0.45]);
  }
  return pts;
}
// vertical light streaks of the hot orange cage BG (flat cel bands, no gradient)
function hotBands(B, seed, o = {}) {
  bg(B, o.base || '#e8581f', 0.7, { ang: -1.5 });
  const rng = mulberry32(seed);
  for (let i = 0; i < 11; i++) {
    const x = rng() * 1440, w = 20 + rng() * 80;
    B.marker([[x, -20], [x + w, -20], [x + w * 0.8, 1100], [x - w * 0.2, 1100]], i % 3 ? '#f5a13a' : '#b8261c', { a: 0.5 + rng() * 0.3, streak: 0.3, ang: -1.5, weight: 5, mode: 'wash' });
  }
}
// cage gantry (black): converging beams for the low angle, with rungs
function cage(B, o = {}) {
  const k = o.k ?? 1;
  for (const s of [-1, 1]) {
    const X = (x) => 720 + s * (720 - x);
    B.marker([[X(-30), 1100], [X(250 * k), 1100], [X(340 * k), -20], [X(170 * k), -20]], COL.mBlack, { a: 0.94, streak: 0.3, weight: 5 });
    for (let j = 0; j < 5; j++) {
      const y = 60 + j * 220, u = y / 1080;
      const xa = lerp(170, -30, u) * k, xb = lerp(340, 250, u) * k + 120;
      B.marker([[X(xa), y], [X(xb), y - 6], [X(xb), y + 34], [X(xa), y + 40]], COL.mBlack, { a: 0.94, streak: 0.2, weight: 5 });
    }
  }
}

SPEC['C-020'] = {
  dlg: [{ s: '♪ 9行目', y: L.panel.y + 120 }],
  pcam(lt) { const s = 1 + 0.035 * lt; return [s, 0, 0, s, 720 * (1 - s), 1000 * (1 - s)]; },
  build(B) {
    B.done();
    hotBands(B, 2020);
    // アオリ: extreme low angle — feet huge at the bottom, body receding upward
    const warp = (px, py) => { const u = Math.pow(clamp(py / 1000, -0.05, 1.1) + 0.05, 1.45); const k = lerp(1.0, 2.7, u); return [720 + px * k, 40 + 1230 * u]; };
    mecha(B, 720, 70, 1.02, { arms: 0.05, a: 0.9, w: 3, warp });
    cage(B);
    camNote(B, 'アオリ  T.U. (ゆっくり)', 60, 1040, { size: 30 });
    // credit ⑨ — centred block, as in the reference
    B.paste(creditF([
      { s: 'オープニングアニメーション', x: 720, y: 190, size: 36, role: true, align: 'center' },
      { s: '作画', x: 470, y: 290, size: 38, role: true },
      { s: 'matplotlib', x: 600, y: 296, size: 72, fam: FONT.minchoN, w: 900, sx: 0.84 },
      { s: 'TikZ', x: 600, y: 396, size: 72, fam: FONT.minchoN, w: 900, sx: 0.86 },
      { s: '演出', x: 470, y: 520, size: 38, role: true },
      { s: 'Jupyter', x: 600, y: 526, size: 72, fam: FONT.minchoN, w: 900, sx: 0.86 },
    ], 0.05, 9, { halo: 'rgba(60,20,10,0.4)' }));
    B.at(0.05, 0.7);
    note(B, 'ケージ内のユニット (アオリ)', ACT.y + 2, { size: 22 });
    note(B, 'BG 橙の縦光 + 黒の拘束具', ACT.y + 32, { size: 22 });
    note(B, 'テロップ⑨ OPアニメーション', ACT.y + 62, { size: 22 });
    B.at(0.55, 0.35); rnote(B, 'Adam の「バイアス補正」って何?', ACT.y + 124, { col: COL.red, size: 26 });
    B.at(0.95, 0.5); mnote(B, 'ad1', ACT.y + 186, 26);
    B.at(1.45, 0.2); mnote(B, 'ad1b', ACT.y + 238, 30);
    B.at(1.6, 0.2); rnote(B, '← 0 から始める', ACT.y + 238, { x: ACT.x + 128, size: 24 });
  },
};

SPEC['C-021'] = {
  build(B) {
    B.done();
    bg(B, SKIN, 0.95);
    B.marker(spikyHair(430, 820, 13, 2101), '#5a2418', { a: 0.95, streak: 0.4 });
    B.stroke(spikyHair(430, 820, 13, 2101).slice(2), { w: 3, a: 0.8, passes: 1, wob: 0.6 });
    // the two "neural clips" = W_Q, W_K (the head is an attention head)
    for (const [cx, lab] of [[250, 'W_Q'], [1190, 'W_K']]) {
      const sgn = cx < 720 ? -1 : 1;
      const P = [[cx - 120 * sgn, 330], [cx + 90 * sgn, 250], [cx + 150 * sgn, 330], [cx + 120 * sgn, 470], [cx - 60 * sgn, 520], [cx - 150 * sgn, 450]];
      B.marker(catmull(P.concat([P[0]]), 4), '#f7f5ee', { a: 1, streak: 0 });
      B.poly(P, { w: 3.2, a: 0.9 });
      B.line(cx - 90 * sgn, 360, cx + 110 * sgn, 310, { w: 2, a: 0.7 });
      B.line(cx - 80 * sgn, 420, cx + 100 * sgn, 380, { w: 2, a: 0.7 });
      const it = B.text(lab, cx - 30, 610, { size: 44, col: COL.red, a: 0.9 }); it.fixed = true;
    }
    note(B, '頭部アップ。神経接続クリップ', ACT.y + 2, { size: 22 });
    note(B, '= ヘッドの W_Q, W_K', ACT.y + 32, { size: 22, col: COL.red });
    B.at(0.02, 0.1); rnote(B, '(C-020 の続き)', ACT.y + 96, { size: 20, col: COL.red });
    B.at(0.1, 0.55); mnote(B, 'ad2', ACT.y + 150, 28);
    B.at(0.62, 0.1); rnote(B, '(g 定常と仮定)', ACT.y + 196, { size: 20 });
  },
};

SPEC['C-022'] = {
  dlg: [{ s: '10行目', y: L.panel.y + 300, t: 1.0, size: 16 }],
  build(B) {
    B.done();
    bg(B, SKIN, 0.95);
    B.marker(spikyHair(40, 330, 11, 2201), '#5a2418', { a: 0.95, streak: 0.4 });
    B.stroke(catmull([[200, 520], [360, 470], [560, 500]], 6), { w: 5, a: 0.9 });     // brows
    B.stroke(catmull([[880, 500], [1080, 470], [1240, 520]], 6), { w: 5, a: 0.9 });
    const eyes = [[380, 640], [1060, 640]];
    // nose bridge, shading under the fringe, cheek hatching (storyboard-level detail)
    B.stroke(catmull([[720, 560], [740, 720], [760, 860], [730, 890]], 5), { w: 2.6, a: 0.75 });
    B.hatch([[760, 700], [820, 760], [800, 900], [750, 890]], 0.8, 8, { w: 1.4, a: 0.5 });
    B.hatch([[-20, 330], [1460, 330], [1460, 420], [-20, 440]], 0.9, 9, { w: 1.6, a: 0.45 });
    for (const x of [300, 1140]) B.hatch([[x - 90, 760], [x + 90, 740], [x + 70, 820], [x - 70, 830]], 1.0, 10, { w: 1.4, a: 0.35, col: COL.red });
    const open = (lt) => lt >= 0.8;
    B.group({ alpha: (lt) => (open(lt) ? 0 : 1) });
    for (const [x, y] of eyes) {
      B.stroke(catmull([[x - 170, y - 10], [x - 60, y + 22], [x + 60, y + 22], [x + 170, y - 10]], 6), { w: 5.5, a: 0.9 });
      for (let k = 0; k < 5; k++) B.line(x - 120 + k * 60, y + 22, x - 130 + k * 62, y + 50, { w: 2.4, a: 0.8 });
    }
    B.ungroup();
    B.group({ alpha: (lt) => (open(lt) ? 1 : 0) });
    for (const [x, y] of eyes) {
      const alm = catmull([[x - 180, y], [x - 60, y - 70], [x + 80, y - 72], [x + 180, y - 10], [x + 70, y + 50], [x - 70, y + 50], [x - 180, y]], 5);
      B.marker(alm, '#fffdf7', { a: 1, streak: 0 });
      B.marker(ellipsePts(x + 8, y - 6, 56, 62, 0, 7, 0, 30), '#3b3450', { a: 0.95 });
      B.marker(ellipsePts(x + 8, y - 6, 26, 30, 0, 7, 0, 20), COL.mBlack, { a: 0.95 });
      whiteOut(B, ellipsePts(x - 14, y - 30, 12, 10, 0, 7, 0, 12));
      B.stroke(alm.slice(0, Math.floor(alm.length * 0.55)), { w: 6, a: 0.9 });
      B.stroke(alm.slice(Math.floor(alm.length * 0.55)), { w: 2.6, a: 0.7 });
    }
    B.ungroup();
    // red pencil inset (fixed): attention weights of one query, before / after
    const n0 = B.items.length;
    const bx = 470, by = 830, bw = 500, bh = 150;
    B.rect(bx, by, bw, bh + 40, { col: COL.red, w: 2.2, a: 0.8 });
    B.group({ alpha: (lt) => (open(lt) ? 0 : 1) });
    for (let i = 0; i < 12; i++) B.rectMarker(bx + 20 + i * 39, by + bh + 20 - 30, 26, 30, COL.mRed, { a: 0.75, streak: 0 });
    B.text('t = 0 : softmax(0) = 1/n', bx + 16, by + 34, { size: 24, col: COL.red, a: 0.9 });
    B.ungroup();
    B.group({ alpha: (lt) => (open(lt) ? 1 : 0) });
    // keys 35..46 of the real attention row used for the C-014 iris (query 40): peak 0.318
    const wts = window.D5.eyeRow.slice(35, 47);
    wts.forEach((w, i) => B.rectMarker(bx + 20 + i * 39, by + bh + 20 - w * 300, 26, Math.max(2, w * 300), COL.mRed, { a: 0.8, streak: 0 }));
    B.text('学習後 : 鋭い注意 (q = 40)', bx + 16, by + 34, { size: 24, col: COL.red, a: 0.9 });
    B.ungroup();
    fixLast(B, n0);
    note(B, '目 閉 → 開 (0+19 で開く)', ACT.y + 2, { size: 22 });
    note(B, '閉 = 一様な注意 / 開 = 鋭い注意', ACT.y + 32, { size: 22, col: COL.red });
    B.at(0.05, 0.1); rnote(B, '(続き) だから割って戻す:', ACT.y + 96, { size: 22, col: COL.red });
    B.at(0.15, 0.3); mnote(B, 'ad3a', ACT.y + 150, 28);
    B.at(0.48, 0.12); snote(B, ACT.x - 4, ACT.y + 128, ACT.x + 160, ACT.y + 156);
    B.at(0.58, 0.12); rnote(B, 'ちがう', ACT.y + 152, { x: ACT.x + 180, size: 22 });
    B.at(0.72, 0.3); mnote(B, 'ad3', ACT.y + 228, 30);
    B.at(1.02, 0.22); mnote(B, 'ad3b', ACT.y + 228, 30, { x: ACT.x + 206 });
  },
};

SPEC['C-023'] = {
  build(B) {
    B.done();
    bg(B, DKRED, 0.95);
    B.marker([[0, 760], [1440, 640], [1440, 1080], [0, 1080]], '#c2331d', { a: 0.55, streak: 0.4 });
    mechaHead(B, 760, 380, 0.95, { sil: true, eyes: false });
    B.group({ alpha: (lt) => (lt >= 0.93 && !(lt >= 1.2 && lt < 1.27) ? 1 : 0) });
    for (const sgn of [-1, 1]) B.marker(xf([[-290, 190], [-70, 250], [-80, 300], [-270, 270]].map(([x, y]) => [x * sgn, y]), [0.95, 0, 0, 0.95, 760, 380]), '#fffef6', { a: 1, streak: 0 });
    B.ungroup();
    camNote(B, '56+22 目 光る', 60, 1040, { size: 30, col: '#ffb3a8' });
    note(B, '暗い赤。ユニットのシルエット', ACT.y + 2, { size: 22 });
    note(B, '目だけ白く光る (透過光)', ACT.y + 32, { size: 22 });
    B.at(0.1, 0.55); mnote(B, 'ad4', ACT.y + 118, 28);
    B.at(0.75, 0.2); rnote(B, 't = 1 では?', ACT.y + 190, { size: 26, col: COL.red });
    B.at(0.95, 0.35); mnote(B, 'ad5', ACT.y + 246, 24);
    B.at(1.3, 0.4); mnote(B, 'ad6', ACT.y + 324, 24);
    B.at(1.7, 0.12); rnote(B, '?!', ACT.y + 386, { x: ACT.x + 320, size: 40, col: COL.red });
    B.at(1.72, 0.1); rnote(B, '1歩目は符号降下 (ε 無視)', ACT.y + 398, { size: 22 });
  },
};

SPEC['C-024'] = {
  build(B) {
    B.done();
    bg(B, '#1d2a4a', 0.95);
    for (let i = 0; i < 7; i++) B.circle(260 + i * 160, 150 + (i % 3) * 60, 22 + (i % 2) * 14, { col: '#6f8fd0', w: 2, a: 0.5, passes: 1 });
    B.marker(blob(720, 520, 250, 300, 2401, 0.12), COL.mBlack, { a: 0.95 });
    B.marker([[300, 1100], [420, 760], [1020, 760], [1140, 1100]], COL.mBlack, { a: 0.95 });
    // folded white gloves in front of the mouth
    B.marker(blob(720, 700, 250, 110, 2402, 0.2), '#f4f2ec', { a: 1, streak: 0 });
    B.stroke(blob(720, 700, 250, 110, 2402, 0.2), { w: 3, a: 0.8 });
    for (let k = 0; k < 4; k++) B.line(560 + k * 90, 650, 600 + k * 80, 760, { w: 2.2, a: 0.7 });
    // glasses glint
    for (const x of [590, 850]) B.marker([[x - 90, 470], [x + 90, 462], [x + 86, 520], [x - 86, 526]], '#f2572e', { a: 1, streak: 0 });
    const it = B.text('L(θ)', 1120, 260, { size: 70, col: COL.red, a: 0.9 }); it.fixed = true;
    note(B, '司令 (逆光)。眼鏡が光る', ACT.y + 2, { size: 22 });
    rnote(B, '司令 = 損失関数 L(θ)', ACT.y + 70, { size: 26, col: COL.red });
    rnote(B, '全員これを下げるために動く', ACT.y + 104, { size: 22 });
  },
};

SPEC['C-025'] = {
  build(B) {
    B.done();
    bg(B, '#b9b6bd', 0.85);
    B.marker([[0, 900], [1440, 820], [1440, 1080], [0, 1080]], '#c8352c', { a: 0.8 });
    const lr = window.D5.lr, x = 200, y = 180, w = 1040, h = 560;
    axes2(B, x, y, w, h, { xl: 'step', yl: 'η', xt: [[0.04, '4k'], [0.5, '50k'], [1, '100k']], yt: [[0.93, '7.0e-4']] });
    const pts = plotPts(lr.s, lr.lr, x, y, w, h, [0, 100000], [0, lr.peak * 1.075]);
    B.stroke(pts, { w: 5, col: COL.red, a: 0.92, step: 3, over: 0 });
    B.math('lrf', 330, 860, 44, { col: COL.graph });
    note(B, '作戦部長 = 学習率スケジューラ', ACT.y + 2, { size: 22 });
    rnote(B, 'warmup 4000 step → s^−½ で減衰', ACT.y + 70, { size: 21 });
    rnote(B, 'peak = 512^−½ · 4000^−½', ACT.y + 100, { size: 21 });
    rnote(B, '= 6.99 × 10⁻⁴ (Vaswani+ 式3)', ACT.y + 130, { size: 21, col: COL.red });
  },
};

SPEC['C-026'] = {
  build(B) {
    B.done();
    bg(B, '#a9d3ef', 0.85);
    B.marker(blob(250, 250, 300, 260, 2601, 0.3), '#f1d36a', { a: 0.7 });
    contourPortrait(B, 720, 560, 118, window.D5.opt.adam, { col: COL.red, levels: [0.3, 1, 2.2, 4, 6.5, 9.5] });
    B.text('Adam', 1060, 200, { size: 64, col: COL.red, a: 0.9 });
    B.math('adamr', 900, 960, 40);
    note(B, '技術部長 = Adam', ACT.y + 2, { size: 22 });
    rnote(B, '同じ 2次関数 (条件数 12)', ACT.y + 70, { size: 21 });
    rnote(B, '40 step, lr 0.3, β = (0.9, 0.999)', ACT.y + 100, { size: 21 });
  },
};

SPEC['C-027'] = {
  dlg: [{ s: '11行目', y: L.panel.y + 300, t: 0.2, size: 16 }],
  build(B) {
    B.done();
    // the concrete wall = a freshly initialised weight matrix, W ~ N(0, 2/n_in) (He et al. 2015), seeded
    const rng = mulberry32(2701), nx = 48, ny = 36, cw = 1440 / nx, chh = 1080 / ny, vals = [];
    for (let i = 0; i < nx * ny; i++) vals.push(gauss(rng) * Math.sqrt(2 / 512));
    const sd = Math.sqrt(2 / 512);
    let wall = null;          // each cell shaded in pencil (darkness = value), rendered once and reused
    B.custom((ctx) => {
      if (!wall) {
        wall = mkCanvas(1440, 1080);
        const g = wall.getContext('2d', CTX_OPT);
        g.fillStyle = g.createPattern(hatchTile(COL.graph, 'graphite'), 'repeat');
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
          const v = clamp(0.5 - vals[j * nx + i] / sd * 0.18, 0.05, 0.95);
          g.globalAlpha = 0.08 + 0.6 * v;
          g.fillRect(i * cw, j * chh, cw - 1, chh - 1);
        }
      }
      ctx.drawImage(wall, 0, 0);
    }, { layer: 'marker', weight: 10 });
    for (let j = 1; j < 4; j++) B.line(0, j * 270 + 4, 1440, j * 270 - 3, { w: 2, a: 0.35, passes: 1 });
    // histogram of the same values (pale blue pencil) — the "pale child"
    const nb = 24, hist = new Array(nb).fill(0);
    for (const v of vals) { const b = Math.floor((v / sd + 3) / 6 * nb); if (b >= 0 && b < nb) hist[b]++; }
    const hm = Math.max(...hist);
    for (let b = 0; b < nb; b++) {
      const hx = 360 + b * 30, hh = hist[b] / hm * 520;
      B.rectMarker(hx, 860 - hh, 26, hh, '#dfeefa', { a: 0.95, streak: 0 });
      B.rect(hx, 860 - hh, 26, hh, { w: 1.8, a: 0.7, col: '#355d8c', passes: 1 });
    }
    const it = B.text('W ~ 𝒩(0, 2/n)', 820, 250, { size: 52, col: COL.red, a: 0.92 }); it.fixed = true;
    note(B, 'コンクリート壁の前の少女', ACT.y + 2, { size: 22 });
    note(B, '→ 壁 = 初期化直後の重み行列', ACT.y + 32, { size: 22, col: COL.red });
    rnote(B, 'He 初期化 (He+ 2015), n = 512', ACT.y + 96, { size: 21 });
    rnote(B, '白い分布 = 同じ 1728 個の値', ACT.y + 126, { size: 21 });
  },
};

// ── C-028 .. C-034 : the unit on hot orange; residual stream Jacobian ──
SPEC['C-028'] = {
  pcam(lt) { const s = 1.02 + 0.05 * lt; return [s, 0, 0, s, 560 * (1 - s), 420 * (1 - s)]; },
  build(B) {
    B.done();
    hotBands(B, 2801);
    B.marker([[1100, -20], [1460, -20], [1460, 500]], COL.mGreen, { a: 0.85 });
    B.group({ m: () => [Math.cos(0.22), Math.sin(0.22), -Math.sin(0.22), Math.cos(0.22), 0, 0] });
    mechaHead(B, 560, 470, 0.95, {});
    B.ungroup();
    B.paste(creditF([
      { s: '広報', x: 1010, y: 300, size: 40, role: true, align: 'center' },
      { s: 'arXiv', x: 1010, y: 410, size: 84, fam: FONT.minchoN, w: 900, align: 'center' },
      { s: '(cs.LG)', x: 1010, y: 470, size: 32, role: true, align: 'center' },
      { s: 'Hugging Face Hub', x: 1010, y: 590, size: 66, fam: FONT.minchoN, w: 900, align: 'center', sx: 0.8 },
      { s: '(huggingface_hub)', x: 1010, y: 646, size: 30, role: true, align: 'center' },
    ], 0.0, 9, { halo: 'rgba(80,20,10,0.35)' }));
    B.at(0.05, 0.6);
    note(B, 'ユニット 顔アップ (橙の逆光)', ACT.y + 2, { size: 22 });
    note(B, 'テロップ⑩ 広報', ACT.y + 32, { size: 22 });
    B.at(0.4, 0.3); rnote(B, '残差ストリームのヤコビアン', ACT.y + 96, { size: 26, col: COL.red });
    B.at(0.72, 0.35); mnote(B, 'rs1', ACT.y + 158, 30);
    B.at(1.1, 0.5); mnote(B, 'rs2', ACT.y + 246, 30);
    B.at(1.62, 0.25); scirc(B, ACT.x + 160, ACT.y + 238, 30, 26);
    B.at(1.75, 0.15); rnote(B, '← 恒等写像が必ず通る', ACT.y + 250, { x: ACT.x + 250, size: 20, col: COL.red });
  },
};

const PRODCREDIT = [
  { s: 'アニメーション制作', x: 720, y: 420, size: 36, role: true, align: 'center' },
];
function prodCredit(B) {
  B.paste((ctx) => {
    credit(ctx, PRODCREDIT);
    credit(ctx, [{ s: 'PyTorch', x: 720, y: 548, size: 118, fam: '"Barlow Condensed"', w: 800, align: 'center', sx: 1 },
      { s: 'JAX', x: 720, y: 688, size: 132, fam: '"Barlow Condensed"', w: 800, align: 'center', sx: 1 }]);
  });
}
SPEC['C-029'] = {
  build(B) {
    B.done(); hotBands(B, 2901);
    mechaHead(B, 720, 520, 1.25, {});
    prodCredit(B);
    note(B, 'ユニット 正面アップ', ACT.y + 2, { size: 22 });
    note(B, 'テロップ⑪ アニメーション制作', ACT.y + 32, { size: 22 });
    rnote(B, '∂F/∂x ≈ 0 でも I が残る', ACT.y + 96, { size: 22 });
  },
};
SPEC['C-030'] = {
  build(B) {
    B.done(); hotBands(B, 3001);
    const P = mechaParts({ arms: 0.1 });
    const T = (pts) => pts.map(([x, y]) => [720 + x * 3.2, -300 + y * 3.2]);
    B.marker(T(P.pylR), COL.mPurple, { a: 0.8 }); B.poly(T(P.pylR), { w: 4 });
    B.marker(T(P.torso), COL.mPurple, { a: 0.8 }); B.poly(T(P.torso), { w: 4 });
    B.line(...T([[0, 196]])[0], ...T([[0, 416]])[0], { w: 16, col: COL.mGreen, a: 0.9, passes: 1 });
    prodCredit(B);
    note(B, '肩 アップ (PAN→)', ACT.y + 2, { size: 22 });
    rnote(B, '緑の線 = 残差ストリーム', ACT.y + 70, { size: 22, col: COL.red });
  },
};
SPEC['C-031'] = {
  build(B) {
    B.done(); hotBands(B, 3101);
    mechaHead(B, 720, 620, 0.9, {});
    B.marker([[0, 1000], [1440, 940], [1440, 1080], [0, 1080]], COL.mBlack, { a: 0.9 });
    prodCredit(B);
    note(B, '頭部 アオリ', ACT.y + 2, { size: 22 });
    rnote(B, 'Pre-LN: x + F(LN(x))', ACT.y + 70, { size: 22 });
  },
};
SPEC['C-032'] = {
  build(B) {
    B.done(); hotBands(B, 3201);
    mecha(B, 720, -120, 1.9, { arms: 0.15 });
    prodCredit(B);
    note(B, '上半身 (T.B. 気味)', ACT.y + 2, { size: 22 });
    rnote(B, '6層 × 2サブ層 = ⊕ が12回', ACT.y + 70, { size: 22 });
  },
};
SPEC['C-033'] = {
  build(B) {
    B.done(); hotBands(B, 3301);
    mecha(B, 720, 60, 1.25, { arms: 0.35 });
    prodCredit(B);
    note(B, '全身。腕が上がり始める', ACT.y + 2, { size: 22 });
    rnote(B, '(He+ 2016 残差学習)', ACT.y + 70, { size: 22 });
  },
};

SPEC['C-034'] = {
  dlg: [{ s: '12行目', y: L.panel.y + 120, size: 16 }],
  build(B) {
    B.done();
    hotBands(B, 3401, { base: '#e2471b' });
    // the wings (64+10〜): yellow-orange light, radiating from the back — the skip paths
    const cx = 720, cy = 300;
    const wing = (lt) => E.outCubic(clamp((lt - 0.55) / 0.5));
    B.group({ m: (lt) => { const s = 0.2 + 0.8 * wing(lt); return [s, 0, 0, s, cx * (1 - s), cy * (1 - s)]; }, alpha: (lt) => (wing(lt) > 0 ? 1 : 0) });
    const rng = mulberry32(3402);
    for (let k = 0; k < 13; k++) {
      for (const sgn of [-1, 1]) {
        const a = -Math.PI / 2 + sgn * (0.22 + k * 0.105), L2 = 700 + rng() * 380, w0 = 18, w1 = 38 + rng() * 26;
        const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
        const P = [[cx + ca * 90 + nx * w0, cy + sa * 90 + ny * w0], [cx + ca * L2 + nx * w1, cy + sa * L2 + ny * w1], [cx + ca * (L2 + 60), cy + sa * (L2 + 60)], [cx + ca * L2 - nx * w1, cy + sa * L2 - ny * w1], [cx + ca * 90 - nx * w0, cy + sa * 90 - ny * w0]];
        B.marker(P, k % 3 === 1 ? '#fbe27a' : '#f7c23a', { a: 0.92, streak: 0.4, weight: 5 });
        if (k % 2 === 0) B.line(cx + ca * 110, cy + sa * 110, cx + ca * (L2 - 40), cy + sa * (L2 - 40), { col: '#b8521a', w: 2.2, a: 0.6, passes: 1, weight: 5 });
      }
    }
    B.paste((ctx, p, lt) => {     // the wings are light (透過光), as in the reference
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, cy, 30, cx, cy, 1000);
      g.addColorStop(0, 'rgba(255,236,170,0.32)'); g.addColorStop(0.5, 'rgba(255,170,60,0.14)'); g.addColorStop(1, 'rgba(255,140,30,0)');
      ctx.fillStyle = g; ctx.fillRect(-400, -400, 2240, 1880);
      const r2 = mulberry32(3403);
      ctx.lineCap = 'round';
      for (let k = 0; k < 13; k++) for (const sgn of [-1, 1]) {
        const a = -Math.PI / 2 + sgn * (0.22 + k * 0.105), L3 = 760 + r2() * 380;
        const lg = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * L3, cy + Math.sin(a) * L3);
        lg.addColorStop(0, 'rgba(255,250,210,0)'); lg.addColorStop(0.2, 'rgba(255,245,200,0.5)'); lg.addColorStop(1, 'rgba(255,190,60,0)');
        ctx.strokeStyle = lg; ctx.lineWidth = 16 + r2() * 20;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60); ctx.lineTo(cx + Math.cos(a) * L3, cy + Math.sin(a) * L3); ctx.stroke();
      }
      ctx.restore();
    });
    B.ungroup();
    // the unit: arms rise 64+04 .. 64+16 (four key poses)
    const poses = [[0.25, -1, 0.02], [0.45, 0.08, 0.2], [0.8, 0.2, 0.28], [1.0, 0.32, 99]];
    for (const [arms, a0, a1] of poses) {
      B.group({ alpha: (lt) => (lt >= a0 && lt < a1 ? 1 : 0) });
      mecha(B, 720, 150, 0.92, { arms, a: 0.9, w: 2.8 });
      B.ungroup();
    }
    B.paste(creditF([
      { s: 'プロデューサー', x: 720, y: 160, size: 38, role: true, align: 'center' },
      { s: 'ImageNet', x: 720, y: 270, size: 86, fam: FONT.minchoN, w: 900, align: 'center', sx: 0.86 },
      { s: '(ILSVRC-2012)', x: 720, y: 326, size: 32, role: true, align: 'center' },
      { s: 'GeForce GTX 580 ×2', x: 720, y: 450, size: 72, fam: FONT.minchoN, w: 900, align: 'center', sx: 0.8 },
    ], 0.05, 9, { halo: 'rgba(90,30,10,0.35)' }));
    camNote(B, '64+10 翼 (透過光) 広がる', 60, 1040, { size: 30, col: '#fff1c9' });
    B.at(0.05, 0.5);
    note(B, 'ユニット全身。両腕を広げる', ACT.y + 2, { size: 22 });
    note(B, '背後に光の翼 (黄〜橙)', ACT.y + 32, { size: 22 });
    note(B, 'テロップ⑫ プロデューサー', ACT.y + 62, { size: 22 });
    B.at(0.35, 0.15); rnote(B, '(続き) L 層まで連鎖律:', ACT.y + 118, { size: 22, col: COL.red });
    B.at(0.5, 0.6); mnote(B, 'rs3', ACT.y + 186, 25);
    B.at(1.15, 0.6); mnote(B, 'rs4', ACT.y + 290, 25);
    B.at(1.8, 0.2); scirc(B, ACT.x + 128, ACT.y + 282, 26, 30);
    B.at(1.95, 0.35); rnote(B, '「I」の項 = どの層にも', ACT.y + 356, { size: 24 });
    rnote(B, '勾配が直通する', ACT.y + 388, { size: 24 });
    B.at(2.35, 0.25); rnote(B, '= 翼!!', ACT.y + 440, { size: 34, col: COL.red, x: ACT.x + 40 });
  },
};
