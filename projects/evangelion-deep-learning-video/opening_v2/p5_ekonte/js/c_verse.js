// ── C-010 .. C-019 : verse A (sky, √d_k), verse B (sunset, softmax-CE), bridge start ──
const WHITE = '#fbfaf4';
function creditF(lines, a0, a1, o = {}) {
  // paste-up credit visible during [a0, a1) with short F.I./F.O. (the reference cross-fades its telops)
  const fn = (ctx, p, lt) => {
    const fi = clamp((lt - a0) / 0.25), fo = 1 - clamp((lt - (a1 - 0.2)) / 0.2);
    const a = Math.min(fi, fo);
    if (a <= 0) return;
    credit(ctx, lines, { col: o.col || INK, alpha: a, halo: o.halo });
  };
  fn.win = [a0, a1];
  return fn;
}

SPEC['C-010'] = {
  dlg: [{ s: '♪ Aメロ', y: L.panel.y + 120 }, { s: '1行目', y: L.panel.y + 160, size: 16 }, { s: '2行目', y: L.panel.y + 250, t: 2.9, size: 16 }, { s: '3行目', y: L.panel.y + 340, t: 6.5, size: 16 }, { s: '4行目', y: L.panel.y + 430, t: 10.0, size: 16 }],
  build(B) {
    // sky (drawn fast) with slowly drifting clouds
    B.at(0.0, 0.12);
    B.marker(FULL, COL.mSky, { a: 0.8, ang: -0.15 });
    B.done();
    B.group({ m: (lt) => [1, 0, 0, 1, -lt * 9, 0] });
    for (const c of [[-60, 80, 520, 170, 3], [560, 20, 460, 140, 5], [980, 150, 520, 190, 8], [120, 620, 640, 200, 11], [840, 700, 700, 230, 13], [380, 380, 360, 120, 17]]) {
      const poly = cloudPoly(c[0], c[1], c[2], c[3], c[4], false);
      whiteOut(B, poly);
      B.stroke(poly.slice(1, -8), { w: 2.2, a: 0.6, col: COL.blue, passes: 1, wob: 0.7, step: 4 });
      B.hatch([[c[0] + c[2] * 0.1, c[1] + c[3] * 0.75], [c[0] + c[2] * 0.9, c[1] + c[3] * 0.75], [c[0] + c[2] * 0.84, c[1] + c[3] * 1.02], [c[0] + c[2] * 0.14, c[1] + c[3] * 1.02]], -0.5, 13, { col: COL.blue, w: 1.5, a: 0.4 });
    }
    B.ungroup();
    // the "face": transformer block diagram, double-exposed from 24+12 (lt 1.0), turns to the profile at ~26.0
    B.group({ alpha: (lt) => clamp((lt - 1.0) / 0.8) * (1 - clamp((lt - 2.6) / 0.5)) });
    B.at(1.0, 1.3);
    xfmr(B, 560, 150, 1.12, { a: 0.95, w: 3.2, color: true });
    B.ungroup();
    B.group({ alpha: (lt) => clamp((lt - 2.5) / 0.5) });
    B.at(2.6, 1.6);
    slabStack(B, 290, 880, 1.32, 12, { a: 0.9, labels: true, stream: true, fill: true });
    B.at(4.0, 0.5);
    B.text('横顔 = 12層', 250, 1030, { size: 30, col: COL.red, a: 0.85 });
    B.ungroup();
    // silhouettes slide in: LSTM (right, 26+12) and a CNN pyramid (left, 30+12), black marker
    B.group({ m: (lt) => [1, 0, 0, 1, 380 * (1 - E.outCubic(clamp((lt - 3.1) / 0.8))), 0], alpha: (lt) => (lt > 3.1 ? 1 : 0) });
    B.done();
    const lstm = [[1180, 1090], [1180, 520], [1200, 470], [1250, 440], [1250, 380], [1230, 340], [1250, 290], [1300, 270], [1350, 290], [1370, 340], [1350, 380], [1350, 440], [1400, 470], [1420, 520], [1420, 1090]];
    B.marker(lstm, COL.mBlack, { a: 0.93, streak: 0.4 });
    B.text('LSTM (1997)', 1190, 250, { size: 30, col: COL.red, a: 0.9 });
    B.ungroup();
    B.group({ m: (lt) => [1, 0, 0, 1, -520 * (1 - E.outCubic(clamp((lt - 7.1) / 0.9))), 0], alpha: (lt) => (lt > 7.1 ? 1 : 0) });
    B.done();
    for (let i = 0; i < 4; i++) {
      const x = -40 + i * 70, w = 250 - i * 45, h = 700 - i * 120, y = 250 + i * 60;
      B.marker([[x, y], [x + w * 0.5, y - 60], [x + w * 0.5, y - 60 + h], [x, y + h]], COL.mBlack, { a: 0.92, streak: 0.4 });
    }
    B.text('CNN (1998)', 40, 160, { size: 30, col: COL.red, a: 0.9 });
    B.ungroup();
    // credits ③..⑥ (paste-up, white on sky), changing on the lyric lines
    B.done();
    B.paste(creditF([{ s: 'キャラクターデザイン', x: 700, y: 330, size: 34, role: true, align: 'right' }, { s: 'メカニックデザイン', x: 700, y: 540, size: 34, role: true, align: 'right' },
      { s: 'Byte-Pair Encoding', x: 740, y: 345, size: 70, fam: FONT.minchoN, w: 900, sx: 0.8 }, { s: 'CUDA', x: 740, y: 555, size: 76, fam: FONT.minchoN, w: 900 },
      { s: 'Tensor Core', x: 740, y: 690, size: 76, fam: FONT.minchoN, w: 900, sx: 0.84 }], 0.0, 2.9));
    B.paste(creditF([{ s: '副監督', x: 560, y: 880, size: 36, role: true }, { s: 'LayerNorm', x: 720, y: 790, size: 74, fam: FONT.minchoN, w: 900, sx: 0.84 },
      { s: 'Residual Connection', x: 720, y: 905, size: 74, fam: FONT.minchoN, w: 900, sx: 0.78 }], 2.9, 6.5));
    B.paste(creditF([{ s: '美術監督', x: 90, y: 130, size: 34, role: true }, { s: 'Positional Encoding', x: 270, y: 140, size: 62, fam: FONT.minchoN, w: 900, sx: 0.82 },
      { s: '色彩設定', x: 640, y: 930, size: 34, role: true }, { s: 'viridis', x: 820, y: 940, size: 70, fam: FONT.minchoN, w: 900, sx: 0.88 }], 6.5, 10.0));
    B.paste(creditF([{ s: '撮影監督', x: 640, y: 130, size: 34, role: true }, { s: 'TensorBoard', x: 820, y: 140, size: 64, fam: FONT.minchoN, w: 900, sx: 0.84 },
      { s: '音響監督', x: 330, y: 850, size: 34, role: true }, { s: 'WaveNet', x: 510, y: 860, size: 64, fam: FONT.minchoN, w: 900, sx: 0.86 },
      { s: '音響制作', x: 330, y: 948, size: 28, role: true }, { s: 'librosa', x: 510, y: 952, size: 50, fam: FONT.minchoN, w: 900, sx: 0.86 }], 10.0, 12.55));
    // the notebook takes over the panel: the final formula in red pencil across the sky (36+00)
    B.at(12.5, 1.1);
    B.math('sd6', 400, 1000, 58, { col: COL.red, a: 0.92 });
    B.at(13.6, 0.4);
    B.rect(372, 918, 540, 124, { col: COL.red, w: 3, a: 0.8 });
    // notes column: storyboard notes, then why √d_k
    B.at(0.3, 2.2);
    note(B, 'BG: 空 (入道雲)。雲 SL. 右→左', ACT.y + 2, { size: 22 });
    note(B, 'テロップ③〜⑥ 歌詞の行ごと', ACT.y + 32, { size: 22 });
    note(B, '24+12〜 顔 = Transformer 図 (W)', ACT.y + 62, { size: 22 });
    B.at(2.6, 0.9);
    note(B, '26+00 振り向き → 横顔 (12層)', ACT.y + 92, { size: 22 });
    note(B, 'シルエット S.I. (LSTM → CNN)', ACT.y + 122, { size: 22 });
    B.at(3.6, 0.6); rnote(B, 'なぜ √d_k で割る?', ACT.y + 182, { col: COL.red, size: 30 });
    B.at(4.3, 0.7); mnote(B, 'sd1', ACT.y + 236, 34);
    B.at(5.1, 1.0); mnote(B, 'sd2', ACT.y + 318, 32);
    B.at(6.3, 1.1); mnote(B, 'sd3', ACT.y + 412, 30);
    B.at(7.5, 0.6); rnote(B, '(q_i, k_i 独立・平均0・分散1)', ACT.y + 458, { size: 22 });
    B.at(8.2, 0.6); mnote(B, 'sd4', ACT.y + 512, 34);
    B.at(8.9, 0.8); rnote(B, '→ softmax 飽和、勾配 ≈ 0 ?!', ACT.y + 560, { size: 26 });
    B.at(9.8, 0.4); mnote(B, 'sd5a', ACT.y + 630, 34);
    B.at(10.25, 0.25); snote(B, ACT.x - 6, ACT.y + 600, ACT.x + 82, ACT.y + 650);
    B.at(10.5, 0.4); mnote(B, 'sd5b', ACT.y + 630, 34, { x: ACT.x + 130 });
    B.at(10.9, 0.2); rnote(B, '!!', ACT.y + 624, { x: ACT.x + 222, col: COL.red, size: 34 });
    B.at(11.2, 0.9); mnote(B, 'sd7', ACT.y + 718, 30);
    B.at(12.1, 0.25); rnote(B, '✓', ACT.y + 716, { x: ACT.x + 222, col: COL.red, size: 36 });
    B.at(13.0, 1.0);
    rnote(B, '検算: 2万回の試行で Var = ' + window.D5.varEmp.toFixed(1), ACT.y + 770, { size: 21 });
    rnote(B, '(Vaswani+ 2017, §3.2.1 脚注4)', ACT.y + 798, { size: 21 });
  },
};

// ── C-011: sunset, the hand, and the Tree of Life = computation graph of one block ──
const TREE = {
  nodes: {
    10: [720, 950, 'x_ℓ', 'INITIVM'], 9: [720, 815, 'LN', 'NORMA I'], 8: [520, 720, 'QKᵀ/√d', 'QVAESTIO·CLAVIS'], 7: [920, 720, 'V', 'VALOR'],
    5: [520, 500, 'softmax', 'ATTENTIO'], 4: [920, 500, '·V·W_O', 'PROIECTIO'], 6: [720, 590, '⊕', 'SVMMA I'],
    3: [520, 300, 'LN', 'NORMA II'], 2: [920, 300, 'FFN', 'RETE PROGREDIENS'], 1: [720, 200, '⊕', 'SVMMA II → x_ℓ₊₁'],
  },
  edges: [[10, 9], [9, 8], [9, 7], [8, 5], [5, 4], [7, 4], [4, 6], [10, 6], [6, 3], [3, 2], [2, 1], [6, 1]],
};
function treeOfLife(B, o = {}) {
  const c = { col: o.col || '#8ef0a0', a: 0.95, layer: 'paste' };
  const N = TREE.nodes;
  B.text('HORIZON  CONTEXTVS', 720, 72, { size: 26, align: 'center', ...c });
  B.stroke(ellipsePts(720, 140, 60, 40, Math.PI, Math.PI * 2, 0), { ...c, w: 2.4, over: 0 });
  B.line(640, 140, 800, 140, { ...c, w: 2.2 });
  B.text('SYSTEMA', 330, 190, { size: 36, ...c }); B.text('TRANSFORMATORIVM', 880, 190, { size: 36, ...c });
  B.text('X  NODI', 330, 236, { size: 26, ...c }); B.text('XII  VIAE', 1000, 236, { size: 26, ...c });
  for (const [a, b] of TREE.edges) {
    const A = N[a], Bn = N[b];
    const mid = a === 10 && b === 6;   // the residual stream runs up the middle pillar
    const off = mid ? 20 : 0;
    B.line(A[0] + off, A[1] - 44, Bn[0] + off, Bn[1] + 44, { ...c, w: mid ? 4 : 2.2 });
    if (!mid) B.line(A[0] + 5, A[1] - 44, Bn[0] + 5, Bn[1] + 44, { ...c, w: 1.2, a: 0.45, passes: 1 });
  }
  B.line(720, 546, 720, 244, { ...c, w: 4 });
  for (const [k, [x, y, sym, lat]] of Object.entries(N)) {
    B.circle(x, y, 46, { ...c, w: 2.4 });
    B.circle(x, y, 38, { ...c, w: 1.2, a: 0.5, passes: 1 });
    B.text(sym, x, y + 9, { size: sym.length > 3 ? 20 : 28, align: 'center', ...c });
    B.text(lat, x, y + 72, { size: 17, align: 'center', ...c, a: 0.8 });
  }
}
SPEC['C-011'] = {
  dlg: [{ s: '♪ Bメロ', y: L.panel.y + 120 }, { s: '5行目', y: L.panel.y + 160, size: 16 }, { s: '6行目', y: L.panel.y + 300, t: 3.33, size: 16 }],
  build(B) {
    // O.L. from blue sky into the sunset
    B.group({ alpha: (lt) => 1 - clamp(lt / 0.45) });
    B.done(); B.marker(FULL, COL.mSky, { a: 0.8 });
    B.ungroup();
    B.group({ alpha: (lt) => clamp(lt / 0.45) });
    B.done();
    B.marker(FULL, COL.mOrange, { a: 0.85, ang: -0.1 });
    const rng = mulberry32(111);
    for (let i = 0; i < 10; i++) { const cx = rng() * 1440, cy = 80 + rng() * 900; B.marker(blob(cx, cy, 160 + rng() * 200, 40 + rng() * 50, 700 + i, 0.5, 40, -0.1), i % 2 ? '#f7b24a' : '#d0641f', { a: 0.55, streak: 0.4 }); }
    B.ungroup();
    // the hand reaches in from the upper right (black silhouette)
    B.group({ m: (lt) => { const u = E.outCubic(clamp((lt - 0.45) / 1.1)); return [1, 0, 0, 1, (1 - u) * 520, -(1 - u) * 300]; }, alpha: (lt) => (lt > 0.45 ? 1 : 0) });
    B.done();
    const hand = [[1460, 40], [1180, 130], [980, 250], [800, 390], [640, 520], [560, 610], [548, 648], [575, 652], [680, 585], [760, 548], [705, 640], [662, 720], [692, 762], [735, 742], [805, 642], [885, 565], [965, 545], [1045, 522], [1145, 472], [1255, 422], [1460, 372]];
    B.marker(catmull(hand, 4), COL.mBlack, { a: 0.93, streak: 0.3 });
    B.ungroup();
    // the tree draws itself 39+17 .. 41+05 (green line art)
    B.at(1.87, 1.5);
    treeOfLife(B);
    // next silhouette slides in at 41+11
    B.group({ m: (lt) => [1, 0, 0, 1, 900 * (1 - E.outCubic(clamp((lt - 3.6) / 0.25))), 0], alpha: (lt) => (lt > 3.58 ? 1 : 0) });
    B.done();
    B.marker(blob(1250, 560, 420, 560, 1234, 0.25), COL.mBlack, { a: 0.95 });
    B.ungroup();
    B.at(0.2, 1.0);
    note(B, 'BG: 夕焼け雲 (LCL 橙)', ACT.y + 2, { size: 22 });
    note(B, '手のシルエット IN ↙', ACT.y + 32, { size: 22 });
    B.at(1.8, 0.8);
    note(B, '39+17〜 生命の樹 描き込み (緑)', ACT.y + 62, { size: 22 });
    note(B, '= 1ブロックの計算グラフ', ACT.y + 92, { size: 22 });
    B.at(2.5, 1.0);
    rnote(B, '中央の柱 = 残差ストリーム!', ACT.y + 160, { col: COL.red, size: 28 });
    rnote(B, 'x_ℓ → ⊕ → ⊕ → x_ℓ₊₁', ACT.y + 204, { size: 26 });
    rnote(B, '10 ノード / 12 辺 (X NODI · XII VIAE)', ACT.y + 246, { size: 21 });
  },
};

SPEC['C-012'] = {
  dlg: [{ s: '♪ 6行目', y: L.panel.y + 120 }, { s: '7行目', y: L.panel.y + 300, t: 3.27, size: 16 }],
  build(B) {
    B.done();
    B.marker(FULL, COL.mOrange, { a: 0.85, ang: -0.1 });
    B.marker(ellipsePts(1120, 520, 250, 250, 0, 7, 0, 40), '#f9d24a', { a: 0.85, streak: 0.3 });
    const rng = mulberry32(121);
    for (let i = 0; i < 7; i++) { const cx = rng() * 1440, cy = 80 + rng() * 900; B.marker(blob(cx, cy, 170 + rng() * 200, 36 + rng() * 40, 800 + i, 0.5, 40, -0.08), '#d0641f', { a: 0.45, streak: 0.4 }); }
    // silhouette -> GPU module (the second character's face = the GPU that houses the model)
    B.group({ m: (lt) => [1, 0, 0, 1, 300 * (1 - E.outCubic(clamp(lt / 0.4))), 0], alpha: (lt) => 1 - clamp((lt - 0.5) / 0.6) });
    B.marker([[330, 220], [1020, 150], [1110, 860], [380, 960]], COL.mBlack, { a: 0.95 });
    B.ungroup();
    const gm = (lt) => [Math.cos(-0.12), Math.sin(-0.12) * 0.9, -Math.sin(-0.12), Math.cos(-0.12) * 0.9, 330, 230];
    B.group({ m: gm, alpha: (lt) => clamp((lt - 0.4) / 0.5) });
    B.done();
    B.marker([[0, 0], [640 * 1.1, 0], [640 * 1.1, 560 * 1.1], [0, 560 * 1.1]], '#e8e2d4', { a: 0.9, streak: 0 });
    B.at(0.5, 2.0);
    gpuModule(B, 0, 0, 1.1, { a: 0.85 });
    B.ungroup();
    B.at(2.6, 0.8);
    const n0 = B.items.length;
    B.text('H100 SXM · HBM3 80GB · 3.35 TB/s', 360, 1010, { size: 30, col: COL.red, a: 0.9 });
    fixLast(B, n0);
    // credits ⑦ music, ⑧ theme songs (two columns)
    B.done();
    B.paste(creditF([{ s: '音楽', x: 110, y: 140, size: 36, role: true }, { s: 'Cooley–Tukey FFT', x: 230, y: 150, size: 64, fam: FONT.minchoN, w: 900, sx: 0.84 },
      { s: '音楽協力', x: 420, y: 950, size: 34, role: true }, { s: 'librosa', x: 600, y: 958, size: 64, fam: FONT.minchoN, w: 900, sx: 0.86 }], 0.9, 3.2, { halo: 'rgba(90,40,10,0.35)' }));
    const tsL = 110, tsR = 760, r0 = 175;
    const rows = [['作詞', 'GPT-2', 'Steepest Descent'], ['作曲', 'Music Transformer', 'Backpropagation'], ['編曲', 'Jukebox', 'Nesterov Momentum'], ['歌', 'WaveNet', 'Flat Minima']];
    const lines = [{ s: 'オープニングテーマ', x: tsL + 90, y: 70, size: 24, role: true }, { s: 'エンディングテーマ', x: tsR + 90, y: 70, size: 24, role: true },
      { s: '「残酷な勾配のテーゼ」', x: tsL + 40, y: 118, size: 36 }, { s: '「FLY ME TO THE MINIMUM」', x: tsR + 10, y: 118, size: 34, fam: FONT.minchoN, w: 700, sx: 0.8 }];
    rows.forEach(([r, a, b], i) => {
      lines.push({ s: r, x: tsL - 40, y: r0 + i * 56, size: 24, role: true });
      lines.push({ s: a, x: tsL + 60, y: r0 + i * 56, size: 36, fam: FONT.minchoN, w: 800, sx: 0.84 });
      lines.push({ s: b, x: tsR + 40, y: r0 + i * 56, size: 36, fam: FONT.minchoN, w: 800, sx: 0.84 });
    });
    lines.push({ s: '(seed = 0)', x: 720, y: r0 + 4 * 56 + 6, size: 26, align: 'center', role: true });
    B.paste(creditF(lines, 3.25, 6.9, { halo: 'rgba(90,40,10,0.35)' }));
    // notes: backprop through softmax + cross-entropy
    B.at(0.2, 1.2);
    note(B, 'シルエット S.I. → GPU の顔 F.I.', ACT.y + 2, { size: 22 });
    note(B, 'テロップ⑦ 音楽 / ⑧ 主題歌 2段組', ACT.y + 32, { size: 22 });
    B.at(0.8, 0.6); rnote(B, '出力層の勾配 (softmax + CE)', ACT.y + 96, { col: COL.red, size: 26 });
    B.at(1.3, 0.8); mnote(B, 'ce1', ACT.y + 160, 30);
    B.at(2.0, 0.6); mnote(B, 'ce1b', ACT.y + 160, 28, { x: ACT.x + 250 });
    B.at(2.7, 0.8); mnote(B, 'ce2', ACT.y + 250, 32);
    B.at(3.6, 0.9); mnote(B, 'ce3', ACT.y + 340, 30);
    B.at(4.5, 0.6); mnote(B, 'ce4', ACT.y + 420, 30);
    B.at(5.0, 0.3); rnote(B, '(Σ y_i = 1)', ACT.y + 416, { x: ACT.x + 250, size: 22 });
    B.at(5.25, 0.3); mnote(B, 'ce5a', ACT.y + 486, 32);
    B.at(5.55, 0.15); snote(B, ACT.x - 4, ACT.y + 468, ACT.x + 108, ACT.y + 494);
    B.at(5.6, 0.2); rnote(B, '符号!', ACT.y + 488, { x: ACT.x + 130, col: COL.red, size: 26 });
    B.at(5.8, 0.5); mnote(B, 'ce5', ACT.y + 580, 40, { x: ACT.x + 10 });
    B.at(6.3, 0.2); B.sheet(); B.rect(ACT.x - 8, ACT.y + 515, 230, 100, { col: COL.red, w: 2.8, a: 0.85 }); B.panel();
    B.at(6.4, 0.3); rnote(B, 'きれい!!', ACT.y + 580, { x: ACT.x + 250, col: COL.red, size: 32 });
  },
};

SPEC['C-013'] = {
  dlg: [{ s: '♪ 8行目', y: L.panel.y + 120 }],
  build(B) {
    B.group({ alpha: (lt) => 1 - clamp(lt / 0.5) });
    B.done(); B.marker(FULL, COL.mOrange, { a: 0.8 });
    B.ungroup();
    B.done();
    B.marker(FULL, COL.mPink, { a: 0.55, ang: -0.2 });
    xfmr(B, 300, 170, 1.02, { a: 0.8, color: false });
    // split windows: eight heads, each a real attention map softmax(P_h P_h^T / sqrt(d_h)) from sinusoidal PE
    const A = window.D5.att;
    for (let h = 0; h < 8; h++) {
      const col = h % 2, row = Math.floor(h / 2);
      const x = 900 + col * 250, y = 90 + row * 240;
      B.marker(rectPts(x - 8, y - 8, 216, 216), '#fffaf5', { a: 0.9, streak: 0 });
      attnGrid(B, x, y, 8.3, A[h], { vmax: Math.max(...A[h].flat()) * 0.7 });
      B.text('head ' + (h + 1), x + 100, y + 232, { size: 20, align: 'center', a: 0.8 });
    }
    B.poly([[880, 70], [1410, 70], [1410, 1040], [880, 1040]], { w: 3, a: 0.8 });
    B.at(0.1, 0.8);
    note(B, '顔 (ピンク) + 分割窓 8つ', ACT.y + 2, { size: 22 });
    note(B, '= マルチヘッド (h = 8)', ACT.y + 32, { size: 22 });
    B.at(0.5, 1.2);
    rnote(B, '各窓: 正弦波 PE の帯域 h の内積', ACT.y + 96, { size: 22 });
    mnote(B, 'pe', ACT.y + 150, 30);
    rnote(B, '(P̃ = 標準化, β = 1.5, 実計算)', ACT.y + 194, { size: 20 });
    rnote(B, '高周波 = 局所的 / 低周波 = 端に偏る', ACT.y + 224, { size: 20 });
  },
};

SPEC['C-014'] = {
  build(B) {
    B.done();
    const cx = 720, cy = 560;
    const eye = [[180, 560], [420, 380], [720, 330], [1040, 390], [1290, 580], [1010, 720], [720, 770], [420, 720]];
    const openA = (lt) => (lt >= 0.03 && lt < 0.1) || (lt >= 0.26 && lt < 0.3) ? 0 : 1;
    B.group({ alpha: openA });
    B.marker(catmull(eye.concat([eye[0]]), 5), '#fffaf6', { a: 1, streak: 0 });
    B.marker(ellipsePts(cx, cy, 230, 230, 0, 7, 0, 60), '#e8584a', { a: 0.75 });
    // iris = one attention row over 64 keys (red pencil wedges, density = weight)
    const w = window.D5.eyeRow;
    const wmax = Math.max(...w);
    B.custom((ctx) => {
      ctx.fillStyle = '#5a0a0a';
      for (let i = 0; i < 64; i++) {
        const a0 = i / 64 * Math.PI * 2 - Math.PI / 2, a1 = (i + 1) / 64 * Math.PI * 2 - Math.PI / 2;
        ctx.globalAlpha = 0.08 + 0.85 * Math.sqrt(w[i] / wmax);
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a0) * 95, cy + Math.sin(a0) * 95); ctx.arc(cx, cy, 225, a0, a1); ctx.lineTo(cx + Math.cos(a1) * 95, cy + Math.sin(a1) * 95); ctx.arc(cx, cy, 95, a1, a0, true); ctx.fill();
      }
    });
    for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2 - Math.PI / 2; B.line(cx + Math.cos(a) * 96, cy + Math.sin(a) * 96, cx + Math.cos(a) * 224, cy + Math.sin(a) * 224, { w: 1.2, a: 0.45, passes: 1, col: '#4a0808', wob: 0.3 }); }
    B.marker(ellipsePts(cx, cy, 92, 92, 0, 7, 0, 40), COL.mBlack, { a: 0.95 });
    whiteOut(B, ellipsePts(cx - 70, cy - 90, 34, 26, 0, 7, 0.4, 20));
    B.stroke(catmull(eye.concat([eye[0]]), 5), { w: 4.5, a: 0.9 });
    B.stroke(catmull([[160, 520], [420, 330], [720, 270], [1060, 340], [1320, 560]], 6), { w: 3, a: 0.7 });
    for (let i = 0; i < 64; i += 8) { const a = i / 64 * Math.PI * 2 - Math.PI / 2; B.text(String(i), cx + Math.cos(a) * 262, cy + Math.sin(a) * 262 + 7, { size: 18, align: 'center', col: COL.red, a: 0.8 }); }
    B.ungroup();
    B.group({ alpha: (lt) => 1 - openA(lt) });
    B.stroke(catmull([[180, 600], [420, 640], [720, 660], [1040, 640], [1290, 600]], 6), { w: 5, a: 0.9 });
    for (let i = 0; i < 12; i++) B.line(260 + i * 85, 640 + Math.sin(i / 11 * Math.PI) * 18, 245 + i * 88, 690 + Math.sin(i / 11 * Math.PI) * 18, { w: 2.4, a: 0.8 });
    B.ungroup();
    note(B, '目 超アップ。瞬き 2回', ACT.y + 2, { size: 22 });
    note(B, '虹彩 = attention の1行', ACT.y + 32, { size: 22 });
    note(B, '(query 40 → key 0..63)', ACT.y + 62, { size: 22 });
  },
};

SPEC['C-015'] = {
  build(B) {
    B.done();
    B.marker(FULL, '#6f7d5c', { a: 0.75 });
    B.marker([[0, 0], [600, 0], [380, 1080], [0, 1080]], COL.mBlack, { a: 0.8 });
    // 12VHPWR connector (white housing) with red cables
    const hx = 420, hy = 520;
    B.marker([[hx, hy], [hx + 520, hy - 120], [hx + 600, hy + 170], [hx + 80, hy + 300]], '#f6f3ea', { a: 1, streak: 0 });
    B.poly([[hx, hy], [hx + 520, hy - 120], [hx + 600, hy + 170], [hx + 80, hy + 300]], { w: 3.4 });
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) {
      const x = hx + 120 + i * 70 + j * 26, y = hy + 40 - i * 16 + j * 110;
      B.rect(x, y, 40, 44, { w: 2, a: 0.8, passes: 1 });
    }
    for (let i = 0; i < 4; i++) B.rect(hx + 160 + i * 60, hy - 30 - i * 13, 22, 16, { w: 1.6, a: 0.7, passes: 1 });
    for (let i = 0; i < 6; i++) {
      const x0 = hx + 140 + i * 70, y0 = hy - 60 - i * 16;
      B.curve([[x0, y0], [x0 + 40, y0 - 220], [x0 + 200 + i * 20, y0 - 380], [x0 + 420, -40]], { w: 16, a: 0.6, col: COL.mRed, passes: 1 });
      B.curve([[x0, y0], [x0 + 40, y0 - 220], [x0 + 200 + i * 20, y0 - 380], [x0 + 420, -40]], { w: 2.4, a: 0.85, col: '#7a1010' });
    }
    B.text('12VHPWR · 600 W', 520, 980, { size: 34, col: COL.red, a: 0.9 });
    note(B, 'メカ ディテール: 電源コネクタ', ACT.y + 2, { size: 22 });
    note(B, '(= エントリープラグの代わり)', ACT.y + 32, { size: 22 });
  },
};

SPEC['C-016'] = {
  build(B) {
    B.done();
    B.marker(FULL, '#e9dfe2', { a: 0.8 });
    B.curve([[80, 1080], [180, 400], [520, 120], [920, 120], [1260, 400], [1360, 1080]], { w: 4, a: 0.7 });
    B.curve([[260, 1080], [330, 520], [560, 300], [880, 300], [1110, 520], [1180, 1080]], { w: 2.4, a: 0.4 });
    B.paste((ctx) => {
      ctx.save(); ctx.globalAlpha = 0.72;
      condText(ctx, 'TRANSFORMER', 720, 420, 150, { align: 'center', col: '#5a5558', sx: 0.84 });
      condText(ctx, '2017', 720, 610, 190, { align: 'center', col: '#5a5558', sx: 0.9 });
      condText(ctx, '01', 720, 740, 110, { align: 'center', col: '#5a5558' });
      condText(ctx, 'BASE 65M', 720, 880, 110, { align: 'center', col: '#5a5558', sx: 0.9 });
      // stencil bridges
      ctx.fillStyle = '#e9dfe2'; ctx.globalAlpha = 1;
      for (const [x, y] of [[394, 330], [560, 330], [860, 330], [1030, 330], [650, 470], [790, 470], [690, 660], [760, 800]]) ctx.fillRect(x, y, 7, 110);
      ctx.restore();
    });
    B.paste((ctx) => { ctx.save(); ctx.font = `700 90px ${FONT.cinzel}`; ctx.fillStyle = '#b8302a'; ctx.globalAlpha = 0.8; ctx.textAlign = 'center'; ctx.fillText('∇', 720, 210); ctx.restore(); });
    note(B, '装甲のステンシル', ACT.y + 2, { size: 22 });
    rnote(B, 'base: 6層, d_model 512, 65M', ACT.y + 70, { size: 22 });
  },
};

SPEC['C-017'] = {
  build(B) {
    B.done();
    B.marker(FULL, COL.mBlack, { a: 0.92 });
    const seq = ['', '', '', '888:88', '5:00:00', '5:00:00', '4:59:87', '4:59:87', '4:59:56', '4:59:32', '4:59:10', '4:59:87', '4:59:87', '4:59:56'];
    B.paste((ctx, p, lt) => {
      const f = clamp(Math.floor(lt * 30 + 1e-6), 0, seq.length - 1);
      ctx.save();
      ctx.translate(720, 560); ctx.rotate(-0.16); ctx.transform(1, 0, -0.12, 1, 0, 0); ctx.translate(-720, -560);
      ctx.strokeStyle = '#cfc9b8'; ctx.lineWidth = 3; ctx.strokeRect(150, 300, 1150, 560);
      ctx.fillStyle = '#f2c94c'; ctx.font = `700 34px ${FONT.minchoN}`;
      ctx.fillText('学習打ち切りまで', 180, 360);
      ctx.font = `700 22px ${FONT.cond}`; ctx.fillText('TRAINING TIME REMAINING', 180, 392);
      // 内部 / 外部 box
      const internal = f >= 3;
      ctx.fillStyle = internal ? '#f2c94c' : '#c9a93a';
      ctx.font = `900 92px ${FONT.minchoN}`; ctx.fillText(internal ? '内部' : '外部', 960, 420);
      ctx.font = `700 40px ${FONT.cond}`; ctx.fillText(internal ? 'INTERNAL' : 'EXTERNAL', 960, 470);
      ctx.font = `700 30px ${FONT.minchoN}`; ctx.fillText('計算資源供給システム', 960, 520);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#141316' : '#e0452f'; ctx.beginPath(); ctx.moveTo(1180 + i * 20, 330); ctx.lineTo(1200 + i * 20, 330); ctx.lineTo(1160 + i * 20, 430); ctx.lineTo(1140 + i * 20, 430); ctx.fill(); }
      // 7-seg digits
      const s = seq[f];
      ctx.strokeStyle = '#ffd43b';
      let x = 200;
      for (const ch of s) {
        if (ch === ':') { ctx.fillStyle = '#ffd43b'; ctx.fillRect(x + 10, 610, 18, 18); ctx.fillRect(x + 2, 700, 18, 18); x += 50; continue; }
        seg7(ctx, ch, x, 560, 120, 220, 24);
        x += 165;
      }
      // precision buttons (STOP / SLOW / NORMAL / RACING -> FP32 / TF32 / BF16 / FP8)
      ['FP32', 'TF32', 'BF16', 'FP8'].forEach((b, i) => {
        const bx = 200 + i * 230;
        ctx.strokeStyle = '#cfc9b8'; ctx.lineWidth = 3; ctx.strokeRect(bx, 810, 200, 56);
        if (i === 2) { ctx.fillStyle = '#f2c94c'; ctx.fillRect(bx + 4, 814, 192, 48); }
        ctx.fillStyle = i === 2 ? '#141316' : '#cfc9b8'; ctx.font = `700 36px ${FONT.cond}`; ctx.textAlign = 'center'; ctx.fillText(b, bx + 100, 852); ctx.textAlign = 'left';
      });
      ctx.restore();
    });
    note(B, '活動限界 → 学習打ち切りまで', ACT.y + 2, { size: 22 });
    note(B, '4:59:56 (原典どおり)', ACT.y + 32, { size: 22 });
    rnote(B, 'STOP/SLOW/NORMAL/RACING', ACT.y + 90, { size: 20 });
    rnote(B, '→ FP32 / TF32 / BF16 / FP8', ACT.y + 118, { size: 22, col: COL.red });
  },
};

SPEC['C-018'] = {
  build(B) {
    B.done();
    B.marker(FULL, '#8b93b5', { a: 0.75 });
    B.marker([[0, 0], [1440, 0], [1440, 300], [0, 480]], '#d83a64', { a: 0.6 });
    // keyboard + a hand pressing Enter
    for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k++) { const x = 120 + k * 150 + r * 40, y = 560 + r * 150; B.marker(rectPts(x, y, 130, 125), '#e9e6ee', { a: 0.9, streak: 0 }); B.rect(x, y, 130, 125, { w: 2.2, a: 0.7 }); }
    B.marker([[1000, 560], [1300, 560], [1300, 960], [1120, 960], [1120, 700], [1000, 700]], '#f4f1e8', { a: 1, streak: 0 });
    B.poly([[1000, 560], [1300, 560], [1300, 960], [1120, 960], [1120, 700], [1000, 700]], { w: 3 });
    B.text('Enter ⏎', 1150, 650, { size: 40, a: 0.9 });
    const hand = [[1440, 180], [1240, 260], [1130, 400], [1110, 560], [1170, 600], [1230, 470], [1290, 480], [1360, 520], [1440, 520]];
    B.marker(catmull(hand, 4), '#3b4a8f', { a: 0.85 });
    B.stroke(catmull(hand, 4), { w: 3, a: 0.8 });
    B.text('$ torchrun train.py', 140, 420, { size: 44, a: 0.9, font: 'kure' });
    note(B, 'レバー → Enter キー', ACT.y + 2, { size: 22 });
  },
};

SPEC['C-019'] = {
  build(B) {
    B.done();
    B.marker(FULL, COL.mBlack, { a: 0.93 });
    const bars = (col) => { for (let i = 0; i < 6; i++) { const y = 140 + i * 150; B.marker([[80, y + 120], [1300, y - 110], [1340, y - 20], [120, y + 210]], col, { a: 0.9, streak: 0.4 }); } };
    B.group({ alpha: (lt) => (lt < 0.17 ? 1 : 0) }); bars(COL.mRed); B.ungroup();
    B.group({ alpha: (lt) => (lt >= 0.17 ? 1 : 0) }); bars(COL.mGreen); B.ungroup();
    B.paste((ctx) => { ctx.save(); ctx.fillStyle = '#e8f7d0'; ctx.font = `700 44px ${FONT.cond}`; ctx.fillText('L17', 1180, 330); ctx.fillText('H23', 1090, 860); ctx.font = `700 26px ${FONT.cond}`; ctx.fillText('ATTN·SCORES', 150, 1000); ctx.restore(); });
    note(B, '緑のグリッド (斜め)', ACT.y + 2, { size: 22 });
    note(B, '赤 5コマ → 緑', ACT.y + 32, { size: 22 });
  },
};
