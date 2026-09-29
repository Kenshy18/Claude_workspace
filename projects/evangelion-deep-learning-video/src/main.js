// ── timeline assembly + frame entry points used by tools/render.mjs ─────────
// each page may set window.ORDER; otherwise scenes play in registration order
const ORDER = window.ORDER || null;

const sceneCanvas = document.getElementById('scene');
const sctx = sceneCanvas.getContext('2d', { willReadFrequently: false });
const post = new PostFX(document.getElementById('out'), W, H);

let TIMELINE = [], TOTAL = 0;
function buildTimeline() {
  const byName = Object.fromEntries(SCENES.map((s) => [s.name, s]));
  let t0 = 0;
  TIMELINE = (ORDER || SCENES.map((s) => s.name)).filter((n) => byName[n]).map((n) => { const s = byName[n]; const e = { ...s, start: t0 }; t0 += s.dur; return e; });
  TOTAL = t0;
}

function renderAt(t) {
  let sc = TIMELINE[TIMELINE.length - 1];
  for (const s of TIMELINE) if (t >= s.start && t < s.start + s.dur) { sc = s; break; }
  const lt = t - sc.start;
  const fx = { time: t, bloom: 0.8, ca: 0.25, grain: 0.045, scan: 0.08, vig: 0.55, glitch: 0, flash: 0, flashCol: [1, 1, 1], sat: 1, contrast: 1, thr: 0.55 };
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.globalAlpha = 1; sctx.globalCompositeOperation = 'source-over'; sctx.filter = 'none';
  sc.draw(sctx, lt, fx, t);
  post.render(sceneCanvas, fx);
  return sc.name;
}

window.renderFrame = (f) => renderAt(f / FPS);
window.getCues = () => {
  const out = [];
  for (const s of TIMELINE) if (s.cues) for (const c of s.cues()) out.push({ ...c, t: +(s.start + c.t).toFixed(4), scene: s.name });
  return { total: TOTAL, fps: FPS, scenes: TIMELINE.map((s) => ({ name: s.name, start: s.start, dur: s.dur })), cues: out.sort((a, b) => a.t - b.t) };
};

window.READY = (async () => {
  const fams = ['400 24px "Share Tech Mono"', '500 24px "Barlow Condensed"', '700 24px "Barlow Condensed"', '800 24px "Barlow Condensed"',
    '400 24px "JetBrains Mono"', '700 24px "JetBrains Mono"', '900 24px "Noto Serif CJK JP"', '700 24px "Noto Serif CJK JP"',
    '900 24px "Noto Sans CJK JP"', '700 24px "Noto Sans CJK JP"', '700 24px "Liberation Serif"', 'italic 400 24px "Liberation Serif"'];
  await Promise.all(fams.map((f) => document.fonts.load(f, 'Aあ使徒')));
  const need = [];
  for (const s of SCENES) if (s.formulas) need.push(...s.formulas);
  await preloadFormulas(need);
  for (const s of SCENES) if (s.init) s.init();
  buildTimeline();
  return { total: TOTAL, frames: Math.round(TOTAL * FPS), w: W, h: H };
})();
