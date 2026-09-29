// ── p2_mincho timeline + frame entry points used by tools/render.mjs ───────────
// One scene, 90.5 s; the film itself (p2_film.js) dispatches shots by absolute time.
const sceneCanvas = document.getElementById('scene');
const sctx = sceneCanvas.getContext('2d', { willReadFrequently: false });
const post = new PostFX(document.getElementById('out'), W, H);

let TIMELINE = [], TOTAL = 0;
function buildTimeline() {
  let t0 = 0;
  TIMELINE = SCENES.map((s) => { const e = { ...s, start: t0 }; t0 += s.dur; return e; });
  TOTAL = t0;
}

function renderAt(t) {
  let sc = TIMELINE[TIMELINE.length - 1];
  for (const s of TIMELINE) if (t >= s.start && t < s.start + s.dur) { sc = s; break; }
  const lt = t - sc.start;
  const fx = { time: t, bloom: 0, thr: 0.7, ca: 0.15, grain: 0.05, vig: 0.1, flash: 0, flashCol: [1, 1, 1], soft: 0.35, contrast: 1, lift: 0.025 };
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.globalAlpha = 1; sctx.globalCompositeOperation = 'source-over'; sctx.filter = 'none';
  sc.draw(sctx, lt, fx, t);
  post.render(sceneCanvas, fx);
  return sc.name;
}

window.renderFrame = (f) => renderAt(f / FPS);
window.getCues = () => ({ total: TOTAL, fps: FPS, scenes: TIMELINE.map((s) => ({ name: s.name, start: s.start, dur: s.dur })), cues: [] });

window.READY = (async () => {
  const fams = ['900 40px "Noto Serif CJK JP"', '700 40px "Noto Serif CJK JP"', '500 40px "Noto Serif CJK JP"', '300 40px "Noto Serif CJK JP"',
    '900 40px "Noto Sans CJK JP"', '700 40px "Noto Sans CJK JP"', '700 40px "Liberation Sans"', '400 40px "Liberation Sans"',
    '700 40px "Liberation Serif"', 'italic 400 40px "Liberation Serif"', '700 40px "Roboto Condensed"',
    '700 40px "Cinzel"', '400 40px "Cinzel"', '500 40px "EB Garamond"', 'italic 500 40px "EB Garamond"',
    '900 40px "Zen Old Mincho"', '800 40px "Shippori Mincho B1"', '400 40px "Share Tech Mono"'];
  await Promise.all(fams.map((f) => document.fonts.load(f, 'Aaあア使徒θβ0')));
  await document.fonts.ready;
  for (const s of SCENES) if (s.init) await s.init();
  buildTimeline();
  return { total: TOTAL, frames: Math.round(TOTAL * FPS), w: W, h: H };
})();
