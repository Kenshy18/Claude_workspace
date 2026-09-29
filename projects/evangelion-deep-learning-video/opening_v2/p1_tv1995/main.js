// ── p1_tv1995 · timeline entry points used by tools/render.mjs ───────────────
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
  const f = Math.round(t * FPS);
  // gate weave: slow drift + per-frame jitter, bounded to ±1 px
  const wx = clamp(0.55 * Math.sin(t * 1.7) + 0.9 * (hash1(f * 3 + 1) - 0.5), -1, 1);
  const wy = clamp(0.45 * Math.sin(t * 2.3 + 1.0) + 0.9 * (hash1(f * 5 + 2) - 0.5), -1, 1);
  const fx = { time: t, bloom: 0, thr: 0.78, grain: 0.055, vig: 0.12, flash: 0, flashCol: [1, 1, 1], sat: 1, contrast: 1,
    soft: 1.0, chroma: 1.7, lift: 0.025, tint: [1, 1, 1], weave: [wx, wy] };
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.globalAlpha = 1; sctx.globalCompositeOperation = 'source-over'; sctx.filter = 'none';
  sc.draw(sctx, lt, fx, t);
  post.render(sceneCanvas, fx);
  return sc.name;
}

window.renderFrame = (f) => renderAt(f / FPS);
window.getCues = () => ({ total: TOTAL, fps: FPS, scenes: TIMELINE.map((s) => ({ name: s.name, start: s.start, dur: s.dur })), cues: [] });

window.READY = (async () => {
  const fams = ['900 24px "Noto Serif CJK JP"', '700 24px "Noto Serif CJK JP"', '500 24px "Noto Serif CJK JP"',
    '900 24px "Noto Sans CJK JP"', '700 24px "Noto Sans CJK JP"', '500 24px "Noto Sans CJK JP"',
    '800 24px "Shippori Mincho B1"', '900 24px "Zen Old Mincho"', '700 24px "Roboto Condensed"',
    '700 24px "Liberation Sans"', '400 24px "Liberation Sans"', '700 24px "Liberation Serif"', '400 24px "Liberation Serif"',
    'italic 400 24px "Liberation Serif"', '700 24px "Cinzel"', '400 24px "Cinzel"', 'italic 500 24px "EB Garamond"', '500 24px "EB Garamond"',
    '400 24px "Share Tech Mono"', '700 24px "Barlow Condensed"', '500 24px "Barlow Condensed"', '400 24px "Klee One"', '600 24px "Klee One"',
    '400 24px "JetBrains Mono"'];
  await Promise.all(fams.map((f) => document.fonts.load(f, 'Aあ使徒監督')));
  window.GROK = await (await fetch('../shared/data/grokking.json')).json();
  for (const s of SCENES) if (s.init) s.init();
  buildTimeline();
  return { total: TOTAL, frames: Math.round(TOTAL * FPS), w: W, h: H };
})();
