// ── timeline: 108 storyboard cuts on the real OP's cut boundaries ────────────
const SPEC = {};                       // per-cut content, filled by c_*.js
const pad3 = (n) => String(n).padStart(3, '0');
const CUTS = CUT_F0.map((f0, i) => {
  const f1 = i + 1 < CUT_F0.length ? CUT_F0[i + 1] : TOTAL_F;
  return { i, id: 'C-' + pad3(i + 1), f0, f1, t0: f0 / 30, t1: f1 / 30, dur: (f1 - f0) / 30, k0: koma(f0), k1: koma(f1) };
});
const SCENE_NAMES = [[0, 'アバン'], [4, 'タイトル'], [9, 'Aメロ'], [10, 'Bメロ'], [15, 'ブリッジ'], [34, 'サビ'], [103, 'ラスト']];
function sceneOf(i) { let s = SCENE_NAMES[0][1]; for (const [k, n] of SCENE_NAMES) if (i >= k) s = n; return s; }

// columns: notes cursor helpers for the 内容 column
const ACT = { x: L.cAct[0] + 16, y: L.colY1 + 36, w: L.cAct[1] - L.cAct[0] - 28 };

function autoRow(B, c, S) {
  const long = c.dur > 0.9;
  B.sheet();
  // header (handwritten fields) — written live only on the first cut
  if (c.i === 0) B.at(0.05, 1.1); else B.done();
  B.text('新世紀グラディエント', 160, 53, { size: 29, weight: 600, seed: 17 });
  B.text('オープニング 絵コンテ', 480, 53, { size: 21, seed: 18 });
  B.text('OP', 900, 53, { size: 27, seed: 19 });
  if (c.i === 0) B.at(1.1, 0.5); else B.done();
  B.text(sceneOf(c.i), 1180, 53, { size: 22, seed: 20 + c.i });
  B.text('全108カット', 1436, 53, { size: 21, seed: 21 });
  B.text(`${Math.floor(c.i / 5) + 1} / 22`, 1720, 53, { size: 25, seed: 22 + c.i });
  // cut number
  if (long) B.at(0.02, Math.min(0.3, c.dur * 0.2)); else B.done();
  B.text('C-' + pad3(c.i + 1), (L.cCut[0] + L.cCut[1]) / 2, L.panel.y + 44, { size: 26, align: 'center', weight: 600, seed: 400 + c.i });
  // duration (s+k) and running total
  const k = c.k1 - c.k0;
  if (long) B.at(Math.min(0.35, c.dur * 0.3), 0.3); else B.done();
  B.text(secKoma(k), (L.cSec[0] + L.cSec[1]) / 2, L.panel.y + 52, { size: 34, align: 'center', weight: 600, seed: 600 + c.i });
  B.text(totalStr(c.k1), L.cSec[1] - 8, L.rowY1 - 22, { size: 17, align: 'right', seed: 700 + c.i });
  // dialogue / music column
  if (S.dlg) for (const d of S.dlg) {
    if (d.t === undefined || !long) B.done(); else B.at(d.t, d.d ?? 0.3);
    B.text(d.s, d.x ?? L.cDlg[0] + 12, d.y, { size: d.size || 19, col: d.col || COL.graph, font: d.font, seed: 800 + c.i * 7 + d.y, vert: d.vert });
  }
  B.flush();
  B.panel();
}

function buildCut(c) {
  const B = new Builder(c);
  const S = SPEC[c.id] || {};
  autoRow(B, c, S);
  B.done();
  if (S.build) S.build(B, c);
  B.flush();
  c.items = B.items;
  c.S = S;
}

// ── frame render ─────────────────────────────────────────────────────────────
function cutAt(f) {
  let lo = 0, hi = CUTS.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (CUTS[m].f0 <= f) lo = m; else hi = m - 1; }
  return CUTS[lo];
}
function weave(f) {
  // gate weave: ±1 px, changes every 2 frames
  const k = Math.floor(f / 2);
  return [(hash1(k * 13 + 5) - 0.5) * 1.6, (hash1(k * 29 + 11) - 0.5) * 1.8];
}
function mulM(A, B2) {
  return [A[0] * B2[0] + A[2] * B2[1], A[1] * B2[0] + A[3] * B2[1], A[0] * B2[2] + A[2] * B2[3], A[1] * B2[2] + A[3] * B2[3],
    A[0] * B2[4] + A[2] * B2[5] + A[4], A[1] * B2[4] + A[3] * B2[5] + A[5]];
}

function renderFrameP5(f) {
  const t = f / 30;
  const c = cutAt(f);
  if (!c.items) buildCut(c);
  const S = c.S;
  const lt = t - c.t0;
  const fx = { grain: 0.06, flash: 0, black: 0 };
  let cam = CAM_ROW;
  if (S.cam) cam = typeof S.cam === 'function' ? S.cam(lt, c) : S.cam;
  const [wx, wy] = weave(f);
  const M = camMatrix(cam, wx, wy);
  const PB = mulM(M, [PS, 0, 0, PS, L.panel.x, L.panel.y]);
  const mats = { sheet: M, panel: PB };

  // paper
  octx.setTransform(1, 0, 0, 1, 0, 0);
  octx.globalCompositeOperation = 'source-over'; octx.globalAlpha = 1; octx.filter = 'none';
  octx.fillStyle = '#3a3630'; octx.fillRect(0, 0, W, H);
  octx.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
  octx.drawImage(SHEET, -40, -40);

  pctx.setTransform(1, 0, 0, 1, 0, 0); pctx.clearRect(0, 0, W, H); pctx.globalCompositeOperation = 'source-over';
  mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.clearRect(0, 0, W, H);
  const ctxs = { pencil: pctx, marker: mctx, paste: octx };

  // panel in-camera move (T.U. / PAN / shake): applied to panel items that are not 'fixed'
  const pm = S.pcam ? S.pcam(lt, c) : null;
  const matsMove = pm ? { sheet: M, panel: mulM(PB, pm) } : mats;
  const moving = c.items.filter((it) => it.space === 'panel' && !it.fixed);
  const still = c.items.filter((it) => !(it.space === 'panel' && !it.fixed));
  if (pm) {
    // clip panel items to the frame even though they move
    for (const cx of [pctx, mctx]) { cx.save(); cx.setTransform(PB[0], PB[1], PB[2], PB[3], PB[4], PB[5]); cx.beginPath(); cx.rect(0, 0, 1440, 1080); cx.clip(); }
  }
  renderItems(moving, lt, ctxs, matsMove, 'marker');
  renderItems(moving, lt, ctxs, matsMove, 'pencil');
  if (pm) { pctx.restore(); mctx.restore(); }
  renderItems(still, lt, ctxs, mats, 'marker');
  renderItems(still, lt, ctxs, mats, 'pencil');

  // composite marker (multiply) then pencil (with paper tooth)
  octx.setTransform(1, 0, 0, 1, 0, 0);
  octx.globalCompositeOperation = 'multiply';
  octx.drawImage(MK, 0, 0);
  octx.globalCompositeOperation = 'source-over';
  pctx.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
  pctx.globalCompositeOperation = 'destination-out';
  pctx.globalAlpha = 0.55;
  pctx.drawImage(TOOTH, -40, -40);
  pctx.globalAlpha = 1; pctx.globalCompositeOperation = 'source-over';
  octx.setTransform(1, 0, 0, 1, 0, 0);
  octx.drawImage(PC, 0, 0);

  // paste-ups (写植 credits, cards) and top annotations
  if (pm) { octx.save(); octx.setTransform(PB[0], PB[1], PB[2], PB[3], PB[4], PB[5]); octx.beginPath(); octx.rect(0, 0, 1440, 1080); octx.clip(); }
  renderItems(moving, lt, ctxs, matsMove, 'paste');
  if (pm) octx.restore();
  renderItems(still, lt, ctxs, mats, 'paste');

  // panel dim (F.O./F.I. to black inside the frame) and panel flash
  const dim = S.dim ? S.dim(lt, c) : 0;
  if (dim > 0) {
    octx.save(); octx.setTransform(PB[0], PB[1], PB[2], PB[3], PB[4], PB[5]);
    octx.globalAlpha = clamp(dim); octx.fillStyle = S.dimCol || '#0d0c10'; octx.fillRect(0, 0, 1440, 1080); octx.restore();
  }
  if (S.fx) S.fx(lt, fx, c);
  post(octx, f, fx);
  return c.id;
}

window.renderFrame = (f) => renderFrameP5(f);
window.getCues = () => ({ total: TOTAL_F / 30, fps: 30, scenes: CUTS.map((c) => ({ name: c.id, start: c.t0, dur: c.dur })), cues: [] });
window.READY = (async () => {
  const fams = ['400 24px "Klee One"', '600 24px "Klee One"', '400 24px "Zen Kurenaido"', '800 24px "Shippori Mincho B1"',
    '900 24px "Noto Serif CJK JP"', '700 24px "Noto Serif CJK JP"', '700 24px "Roboto Condensed"', '700 24px "Cinzel"', '400 24px "Cinzel"',
    '500 24px "EB Garamond"', 'italic 500 24px "EB Garamond"', '500 24px "Noto Sans CJK JP"', '900 24px "Noto Sans CJK JP"', '700 24px "Liberation Sans"'];
  await Promise.all(fams.map((f) => document.fonts.load(f, 'Aあ使徒αβ∂√∇∈∑')));
  buildPaper();
  return { total: TOTAL_F / 30, frames: TOTAL_F, w: W, h: H };
})();
