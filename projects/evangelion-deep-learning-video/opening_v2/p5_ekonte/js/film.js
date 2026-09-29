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
  c.camKeys = buildCamKeys(c);
  c.camFrom = camFromList(c.camKeys);
}

// ── rostrum camera: push in on the panel, slide to the notes column while a derivation is written,
//    pull back to the whole sheet at section boundaries. Keys are derived from the cut's own items. ──
const CAM_P = { s: 1.32, cx: 702, cy: L.panel.y + L.panel.h / 2 };
// panel + notes column together (no credit is ever cropped), notes at ~29-36 px
function camNotesY(y) { const s = 1.2, vh = H / s; return { s, cx: 918, cy: clamp(y, L.hdrY0 - 14 + vh / 2, L.rowY1 + 40 - vh / 2) }; }
const SECTION_START = new Set(['C-001', 'C-010', 'C-011', 'C-020']);
function buildCamKeys(c) {
  const S = c.S;
  if (S.camKeys) return S.camKeys(c);
  const P = S.camPanel || CAM_P;
  const keys = [];
  if (SECTION_START.has(c.id)) { keys.push({ t: 0, cam: CAM_ROW }); keys.push({ t: S.pushAt ?? Math.min(0.8, c.dur * 0.25), cam: P, tr: 1.0 }); }
  else keys.push({ t: 0, cam: P });
  if (c.dur < 1.2 || S.noNotesCam) return keys;
  const notes = c.items.filter((it) => it.note === 'r' && it.t0 > 0.05 && it.t0 < c.dur - 0.25).sort((a, b) => a.t0 - b.t0);
  const bursts = [];
  for (const it of notes) {
    const b = bursts[bursts.length - 1];
    if (b && it.t0 - b.t1 < 0.9) { b.t1 = Math.max(b.t1, it.t1); b.items.push(it); }
    else bursts.push({ t0: it.t0, t1: it.t1, items: [it] });
  }
  const must = [];
  for (const it of c.items) if (it.cred) must.push([Math.max(0, it.cred[0] - 0.15), it.cred[0] + 1.4]);
  for (const w of S.panelWins || []) must.push(w);
  if (keys.length > 1) must.push([0, keys[1].t + 0.9]);
  const segs = [];
  for (const b of bursts) {
    let pieces = [[b.t0 - 0.3, Math.min(c.dur, b.t1 + 0.7)]];
    for (const [m0, m1] of must) {
      const nx = [];
      for (const [a, z] of pieces) { if (m1 <= a || m0 >= z) nx.push([a, z]); else { if (m0 > a) nx.push([a, m0]); if (m1 < z) nx.push([m1, z]); } }
      pieces = nx;
    }
    for (const [a, z] of pieces) if (z - a >= 0.85) segs.push([a, z, b.items.filter((it) => it.t1 > a && it.t0 < z)]);
  }
  for (const [a, z, its] of segs) {
    let cy = null;
    for (const it of its) {
      const y = it.ny;
      if (cy === null) { cy = y; keys.push({ t: Math.max(0.01, a), cam: camNotesY(y + 90), tr: 0.45 }); }
      else if (Math.abs(y - cy) > 220 && it.t0 - 0.2 > a + 0.5) { cy = y; keys.push({ t: it.t0 - 0.2, cam: camNotesY(y + 60), tr: 0.5 }); }
    }
    if (z < c.dur - 0.2) keys.push({ t: z, cam: P, tr: 0.45 });
  }
  keys.sort((a, b) => a.t - b.t);
  return keys;
}
function camInterp(a, b, k) { return { s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), k)), cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k) }; }
function camSeg(from, key, t) { return camInterp(from, key.cam, E.inOutCubic(clamp((t - key.t) / (key.tr || 0.45)))); }
function camFromList(K) {
  const from = [K[0].cam];
  for (let i = 1; i < K.length; i++) from.push(camSeg(from[i - 1], K[i - 1], K[i].t));
  return from;
}
function camAt(c, lt) {
  const K = c.camKeys;
  let i = 0;
  while (i + 1 < K.length && K[i + 1].t <= lt) i++;
  return i === 0 && K.length === 1 ? K[0].cam : camSeg(c.camFrom[i], K[i], lt);
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

let _pt = 0;
function pmark(k) { if (!window.PROF) return; const n = performance.now(); window.PROF[k] = (window.PROF[k] || 0) + n - _pt; _pt = n; }
function renderFrameP5(f) {
  _pt = performance.now();
  const t = f / 30;
  const c = cutAt(f);
  if (!c.items) buildCut(c);
  pmark('build');
  const S = c.S;
  const lt = t - c.t0;
  const fx = { grain: 0.06, flash: 0, black: 0 };
  let cam = camAt(c, lt);
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
  pmark('paper');

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
  pmark('items');

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
  pmark('composite');

  // paste-ups (写植 credits, cards) and top annotations
  if (pm) { octx.save(); octx.setTransform(PB[0], PB[1], PB[2], PB[3], PB[4], PB[5]); octx.beginPath(); octx.rect(0, 0, 1440, 1080); octx.clip(); }
  renderItems(moving, lt, ctxs, matsMove, 'paste');
  if (pm) octx.restore();
  renderItems(still, lt, ctxs, mats, 'paste');
  pmark('paste');

  // panel dim (F.O./F.I. to black inside the frame) and panel flash
  const dim = S.dim ? S.dim(lt, c) : 0;
  if (dim > 0) {
    octx.save(); octx.setTransform(PB[0], PB[1], PB[2], PB[3], PB[4], PB[5]);
    octx.globalAlpha = clamp(dim); octx.fillStyle = S.dimCol || '#0d0c10'; octx.fillRect(0, 0, 1440, 1080); octx.restore();
  }
  if (S.fx) S.fx(lt, fx, c);
  post(octx, f, fx);
  pmark('post');
  return c.id;
}

window.renderFrame = (f) => renderFrameP5(f);
window.getCues = () => ({ total: TOTAL_F / 30, fps: 30, scenes: CUTS.map((c) => ({ name: c.id, start: c.t0, dur: c.dur })), cues: [] });
window.READY = (async () => {
  const fams = ['400 24px "Klee One"', '600 24px "Klee One"', '400 24px "Zen Kurenaido"', '800 24px "Shippori Mincho B1"',
    '900 24px "Noto Serif CJK JP"', '700 24px "Noto Serif CJK JP"', '700 24px "Roboto Condensed"', '700 24px "Cinzel"', '400 24px "Cinzel"',
    '500 24px "EB Garamond"', 'italic 500 24px "EB Garamond"', '500 24px "Noto Sans CJK JP"', '900 24px "Noto Sans CJK JP"', '700 24px "Liberation Sans"', '800 24px "Barlow Condensed"', '700 24px "Barlow Condensed"'];
  await Promise.all(fams.map((f) => document.fonts.load(f, 'Aあ使徒αβ∂√∇∈∑')));
  buildPaper();
  return { total: TOTAL_F / 30, frames: TOTAL_F, w: W, h: H };
})();
