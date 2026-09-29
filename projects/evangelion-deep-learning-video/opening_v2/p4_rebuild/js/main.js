// p4_rebuild — timeline + frame entry points (renderFrame(f) is a pure function of f).
import * as WD from './world.js';
import { PostFX } from './post.js';
import { initPaint } from './paint.js';
import { initArt } from './art.js';
import { SHOTS, TOTAL, overlayCredits } from './shots.js';

const W = 1920, H = 1080, FPS = 30;
const out = document.getElementById('out');
const sc = document.getElementById('scene');
const ctx = sc.getContext('2d', { willReadFrequently: window.CPU2D !== false }); // CPU raster: faster than SwiftShader-accelerated 2D
let post = null;

function renderAt(t) {
  let s = SHOTS[SHOTS.length - 1];
  for (const x of SHOTS) if (t >= x.t0 && t < x.t1) { s = x; break; }
  const lt = t - s.t0;
  // film finish defaults; gate weave = deterministic ±1 px per frame
  const fr = Math.round(t * FPS);
  const hw = (n) => { let x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
  const fx = { time: t, bloom: 0, thr: 0.8, grain: 0.05, vig: 0.28, soft: 0.22, ca: 0.12, flash: 0, flashCol: [1, 1, 1], sat: 1, contrast: 1, lift: 0, tint: [1, 1, 1],
    weave: [(hw(fr) - 0.5) * 1.6, (hw(fr + 101) - 0.5) * 1.2] };
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  WD.PROF.shadow = 0; WD.PROF.main = 0;
  const T0 = performance.now();
  WD.resetWorld(t);
  s.draw(ctx, lt, t, fx, s);
  const T1 = performance.now();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  overlayCredits(ctx, t, fx);
  const T2 = performance.now();
  post.render(sc, fx);
  if (window.PROFILE) WD.syncGL(post.gl);
  window.__T = { upload: window.__up - T2, sh3d: WD.PROF.shadow, main3d: WD.PROF.main, shot: T1 - T0, credits: T2 - T1, post: performance.now() - T2 };
  return s.name;
}

// tools/render.mjs serves .css as application/octet-stream, which Chrome's strict MIME check refuses, so the
// shared fonts_v2.css never applies there. Register every web font directly with the FontFace API instead.
const SF = '../shared/fonts/', RF = '../../fonts/';
const FONT_FILES = [
  ['Roboto Condensed', SF + 'RobotoCondensed-700.ttf', { weight: '700' }], ['Cinzel', SF + 'Cinzel-400.ttf', { weight: '400' }], ['Cinzel', SF + 'Cinzel-700.ttf', { weight: '700' }],
  ['EB Garamond', SF + 'EBGaramond-500.ttf', { weight: '500' }], ['EB Garamond', SF + 'EBGaramond-500i.ttf', { weight: '500', style: 'italic' }],
  ['Zen Old Mincho', SF + 'ZenOldMincho-900.ttf', { weight: '900' }], ['Shippori Mincho B1', SF + 'ShipporiMinchoB1-800.ttf', { weight: '800' }],
  ['Zen Kurenaido', SF + 'ZenKurenaido-400.ttf', { weight: '400' }], ['Klee One', SF + 'KleeOne-600.ttf', { weight: '600' }],
  ['Share Tech Mono', RF + 'ShareTechMono.ttf', { weight: '400' }], ['Barlow Condensed', RF + 'BarlowCondensed-700.ttf', { weight: '700' }],
];
async function registerFonts() {
  await Promise.all(FONT_FILES.map(async ([fam, url, desc]) => {
    try { const ff = new FontFace(fam, `url(${new URL(url, location.href).href})`, desc); await ff.load(); document.fonts.add(ff); }
    catch (e) { console.error('font failed', fam, url, e && e.message); }
  }));
}

(async () => {
  await registerFonts();
  const fams = ['900 40px "Noto Serif CJK JP"', '700 40px "Noto Serif CJK JP"', '800 40px "Shippori Mincho B1"', '900 40px "Zen Old Mincho"',
    '700 40px "Roboto Condensed"', '700 40px "Liberation Sans"', '700 40px "Liberation Serif"', '400 40px "Liberation Serif"', '700 40px "Cinzel"', '400 40px "Cinzel"',
    '500 40px "EB Garamond"', 'italic 500 40px "EB Garamond"', '400 40px "Zen Kurenaido"', '600 40px "Klee One"', '400 40px "Share Tech Mono"', '700 40px "Barlow Condensed"', '900 40px "Noto Sans CJK JP"', '700 40px "Noto Sans CJK JP"'];
  await Promise.all(fams.map((f) => document.fonts.load(f, 'Aあ監督ヱ')));
  WD.buildWorld();
  await initPaint();
  initArt();
  post = new PostFX(out, W, H);
  WD.warmup(); for (const f of [0, 360, 1500]) renderAt(f / FPS);   // shader + canvas warm-up (frames stay pure functions of t)
  window.renderFrame = (f) => renderAt(f / FPS);
  window.__readyResolve({ total: TOTAL, frames: Math.round(TOTAL * FPS), w: W, h: H });
})().catch((e) => { console.error('INIT FAILED', e && e.stack || e); });
