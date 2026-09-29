// ── C-103 .. C-108 : the crucifix pose, the last faces, 製作 on red, END ────
SPEC['C-103'] = {
  dlg: [{ s: '♪ サビ終', y: L.panel.y + 120 }],
  noNotesCam: true,
  // T.B.: from the outstretched arm (close) back to the full figure, as in the reference (83.7 → 85.0)
  pcam(lt) {
    const u = E.inOutCubic(clamp((lt - 0.15) / 1.25));
    const s = lerp(2.5, 1.0, u), fx = lerp(1080, 720, u), fy = lerp(330, 540, u);
    return zoomAt(s, fx, fy);
  },
  build(B) {
    B.done();
    hotBands(B, 10301, { base: '#e2471b' });
    mecha(B, 720, 90, 0.9, { arms: 1.0, a: 0.92, w: 3 });
    // double exposure (85+06〜): the pilot = the block diagram, same pose, printed over the unit
    B.group({ alpha: (lt) => 0.8 * clamp((lt - 1.55) / 0.5) });
    B.done();
    whiteOut(B, rectPts(470, 160, 500, 820));
    xfmr(B, 600, 140, 1.02, { a: 0.9, w: 3, color: true });
    B.ungroup();
    const n0 = B.items.length;
    B.text('T.B.', 1260, 90, { size: 44, col: COL.red, font: 'cond', a: 0.9 });
    B.text('85+06 W (二重露光)', 70, 1040, { size: 32, col: '#fff1c9', a: 0.9 });
    fixLast(B, n0);
    note(B, '両腕を広げたユニット', ACT.y + 2, { size: 22 });
    note(B, '橙の縦光。T.B. (引き)', ACT.y + 32, { size: 22 });
    note(B, '85+06〜 パイロット W', ACT.y + 62, { size: 22 });
    note(B, '= 主人公の顔 (ブロック図)', ACT.y + 92, { size: 22, col: COL.red });
  },
};

SPEC['C-104'] = {
  noNotesCam: true,
  build(B) {
    B.done();
    bg(B, '#79b4e6', 0.6);
    for (const c of [[-60, 120, 560, 180, 104], [900, 60, 600, 200, 105], [160, 760, 700, 220, 106], [1000, 820, 560, 200, 107]]) {
      const P = cloudPoly(c[0], c[1], c[2], c[3], c[4], false); whiteOut(B, P);
      B.stroke(P.slice(1, -8), { w: 2.2, a: 0.6, col: COL.blue, passes: 1 });
    }
    // looking down (86.3) → faces forward, determined (86.75)
    const pose = (a0, a1, rot, dx) => {
      B.group({ m: () => [Math.cos(rot), Math.sin(rot), -Math.sin(rot), Math.cos(rot), dx, 0], alpha: (lt) => (lt >= a0 && lt < a1 ? 1 : 0) });
      B.done(); xfmr(B, 560, 150, 1.12, { a: 0.95, w: 3.2, color: true }); B.ungroup();
    };
    pose(-1, 0.45, 0.16, 60); pose(0.45, 9, 0, 0);
    note(B, '主人公 決意の顔 (青空)', ACT.y + 2, { size: 22 });
    note(B, '俯き → 正面 (0+11)', ACT.y + 32, { size: 22 });
  },
};

SPEC['C-105'] = {
  noNotesCam: true,
  build(B) {
    B.done();
    bg(B, '#3f8f8a', 0.6);
    // the strain before the jump: validation accuracy of the real grokking run (log steps)
    const g = window.D5.grok, x = 170, y = 170, w = 1100, h = 680;
    axes2(B, x, y, w, h, { xl: 'step', yl: 'val acc', xt: [[0, '50'], [0.5, '1.2k'], [1, '30k']], yt: [[1, '1.0']], w: 2.6, ls: 30 });
    B.at(0.0, 0.36);
    B.stroke(plotPts(g.steps.map((s) => s + 50), g.val_acc, x, y, w, h, [50, 30050], [0, 1], true), { w: 7, col: '#0f3b38', a: 0.95, step: 3, over: 0, passes: 1 });
    B.done();
    const n0 = B.items.length;
    B.text('grokking', 1000, 1030, { size: 40, col: COL.red, a: 0.9 }); fixLast(B, n0);
    note(B, '歯を食いしばる (緑がかった青)', ACT.y + 2, { size: 22 });
    rnote(B, '汎化の直前 = 最も苦しい', ACT.y + 40, { size: 22, col: COL.red });
  },
};

SPEC['C-106'] = {
  noNotesCam: true,
  build(B) {
    B.done();
    B.scribbleFill([[20, 20], [1420, 20], [1420, 1060], [20, 1060]], { sp: 10, w: 9, a: 0.9 });
    B.group({ alpha: (lt) => (lt >= 3 / 30 ? 0.35 : 0) });
    B.curve([[500, 1100], [560, 700], [720, 620], [880, 700], [940, 1100]], { w: 3, a: 0.5, col: '#8a8f98' });
    B.ungroup();
    note(B, '黒味 → うっすら人影', ACT.y + 2, { size: 22 });
  },
};

SPEC['C-107'] = {
  noNotesCam: true,
  build(B) {
    B.done();
    bg(B, '#9fd49a', 0.55);
    const rng = mulberry32(10701);
    for (let i = 0; i < 16; i++) {           // the reference's green bokeh, as loose pencil circles
      const cx = rng() * 1440, cy = rng() * 1080, r = 40 + rng() * 90;
      B.marker(ellipsePts(cx, cy, r, r, 0, 7, 0, 28), i % 3 ? '#e8f6c8' : '#5aa860', { a: 0.6, streak: 0, mode: 'accent' });
      B.circle(cx, cy, r, { w: 1.6, a: 0.45, col: COL.green, passes: 1 });
    }
    // the smile: closed happy eyes + open mouth, pencil
    for (const x of [520, 920]) B.curve([[x - 120, 470], [x - 40, 400], [x + 40, 400], [x + 120, 470]], { w: 6, a: 0.92 });
    B.curve([[560, 640], [640, 760], [800, 760], [880, 640]], { w: 5, a: 0.9 }); B.stroke([[560, 640], [880, 640]], { w: 4, a: 0.9 });
    B.marker([[600, 660], [840, 660], [790, 740], [650, 740]], COL.mRed, { a: 0.6, streak: 0 });
    const n0 = B.items.length;
    B.text('val acc = ' + window.D5.grok.table[window.D5.grok.table.length - 1][4].toFixed(3) + '  ✓', 70, 1030, { size: 40, col: COL.red, a: 0.92 });
    fixLast(B, n0);
    note(B, '笑顔 (緑のボケ)', ACT.y + 2, { size: 22 });
    rnote(B, 'val 99% @ step ' + window.D5.grok.val99.toLocaleString('en-US'), ACT.y + 40, { size: 22, col: COL.red });
  },
};

// C-108: 製作 on red with dark scrawled glyphs; the camera pulls back over the whole sheet; END
SPEC['C-108'] = {
  dlg: [{ s: '♪ 終', y: L.panel.y + 120 }],
  camKeys: (c) => [{ t: 0, cam: CAM_P }, { t: 0.9, cam: CAM_ROW, tr: 1.0 }],
  fx(lt, fx) { fx.black = clamp((lt - 1.95) / 0.33); },
  build(B, c) {
    B.done();
    bg(B, COL.mRed, 0.85, { ang: -0.6 });
    // the reference's dark hand-scrawled glyphs: our own derivations, scrawled huge in dark red
    const scr = [['∂L/∂z = p − y', 80, 330, 150, -0.1], ['I + ∂F/∂x', 620, 560, 170, 0.06], ['√d', 160, 860, 220, -0.05], ['β₁ = 0.9', 760, 990, 120, 0.04], ['6ND', 1040, 250, 160, 0.1]];
    for (const [s, x, y, size, rot] of scr) B.text(s, x, y, { size, font: 'kure', col: '#5a0e0c', a: 0.5, rot });
    B.paste((ctx) => {
      credit(ctx, [{ s: '製作', x: 330, y: 500, size: 60, role: true }]);
      credit(ctx, [{ s: 'Common Crawl', x: 520, y: 460, size: 84, fam: FONT.minchoN, w: 900, sx: 0.84 }, { s: 'The Pile', x: 520, y: 640, size: 110, fam: '"Barlow Condensed"', w: 800, sx: 1.0 }]);
    }, { cred: [0, 9] });
    // the storyboard's last word: total time, checked
    B.sheet();
    B.at(1.05, 0.35);
    B.text('1′30″+12', (L.cSec[0] + L.cSec[1]) / 2, L.rowY1 + 60, { size: 30, align: 'center', col: COL.red, weight: 600, seed: 99 });
    B.stroke(ellipsePts((L.cSec[0] + L.cSec[1]) / 2, L.rowY1 + 50, 62, 30, 0.3, Math.PI * 2.2, -0.05), { over: 0, w: 2.6, col: COL.red, a: 0.9 });
    B.at(1.2, 0.4);
    B.text('おわり', ACT.x + 40, L.rowY1 + 70, { size: 54, font: 'kure', col: COL.graph, a: 0.92 });
    B.panel();
    B.done();
    note(B, '赤。暗い手書き文字', ACT.y + 2, { size: 22 });
    note(B, 'テロップ 製作。F.O.', ACT.y + 32, { size: 22 });
  },
};
