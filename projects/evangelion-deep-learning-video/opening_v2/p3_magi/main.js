// p3_magi — frame entry points for tools/render.mjs. Every frame is a pure function of t.
const sceneCanvas = document.getElementById('scene');
const sctx = sceneCanvas.getContext('2d');
const ovlCanvas = document.getElementById('ovl');
const octx = ovlCanvas.getContext('2d');
const post = new PostFX(document.getElementById('out'), W, H);
const TOTAL = 90.5;

function renderAt(t) {
  const frame = Math.round(t * FPS);
  // gate weave: ±1 px, re-drawn every 2 frames (film registration), deterministic
  const wf = Math.floor(frame / 2);
  const fx = {
    frame, bloom: 0, thr: 0.62, ca: 0.1, grain: 0.035, vig: 0.22, flash: 0, flashCol: [1, 1, 1], sat: 1, contrast: 1,
    curve: 0, roll: 0, rollPos: 0, soft: 0.35, useOvl: false, lift: 0,
    weave: [Math.round((hash1(wf * 3 + 1) - 0.5) * 2.2), Math.round((hash1(wf * 5 + 2) - 0.5) * 2.2)],
  };
  for (const c of [sctx, octx]) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none'; }
  octx.clearRect(0, 0, W, H);
  drawFrame(sctx, octx, t, fx);
  post.render(sceneCanvas, ovlCanvas, fx);
  return fx.shot || '';
}

window.renderFrame = (f) => renderAt(f / FPS);
window.getCues = () => ({ total: TOTAL, fps: FPS, scenes: [{ name: 'p3_magi', start: 0, dur: TOTAL }], cues: [] });

window.READY = (async () => {
  const fams = ['900 24px "Noto Serif CJK JP"', '700 24px "Noto Serif CJK JP"', '900 24px "Noto Sans CJK JP"', '700 24px "Noto Sans CJK JP"',
    '500 24px "Noto Sans CJK JP"', '800 24px "Shippori Mincho B1"', '900 24px "Zen Old Mincho"', '700 24px "Roboto Condensed"',
    '700 24px "Cinzel"', '400 24px "Cinzel"', '500 24px "EB Garamond"', 'italic 500 24px "EB Garamond"', '600 24px "Klee One"',
    '400 24px "Share Tech Mono"', '400 24px "JetBrains Mono"', '700 24px "JetBrains Mono"', '500 24px "Barlow Condensed"',
    '700 24px "Barlow Condensed"', '800 24px "Barlow Condensed"', '700 24px "Liberation Serif"', '700 24px "Liberation Sans"',
    '400 24px "Liberation Mono"', '700 24px "Liberation Mono"'];
  await Promise.all(fams.map((f) => document.fonts.load(f, 'Aあ使徒監督荷重減衰')));
  await preloadFormulas(window.FORMULA_LIST || []);
  if (window.initShots) window.initShots();
  return { total: TOTAL, frames: Math.round(TOTAL * FPS), w: W, h: H };
})();
