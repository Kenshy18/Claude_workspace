// p4_rebuild — timeline + frame entry points (renderFrame(f) is a pure function of f).
import * as WD from './world.js';
import { PostFX } from './post.js';
import { initPaint } from './paint.js';
import { SHOTS, TOTAL, overlayCredits } from './shots.js';

const W = 1920, H = 1080, FPS = 30;
const out = document.getElementById('out');
const sc = document.getElementById('scene');
const ctx = sc.getContext('2d');
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
  WD.resetWorld(t);
  s.draw(ctx, lt, t, fx, s);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  overlayCredits(ctx, t, fx);
  post.render(sc, fx);
  return s.name;
}

(async () => {
  const fams = ['900 40px "Noto Serif CJK JP"', '700 40px "Noto Serif CJK JP"', '800 40px "Shippori Mincho B1"', '900 40px "Zen Old Mincho"',
    '700 40px "Roboto Condensed"', '700 40px "Liberation Sans"', '700 40px "Liberation Serif"', '400 40px "Liberation Serif"', '700 40px "Cinzel"', '400 40px "Cinzel"',
    '500 40px "EB Garamond"', 'italic 500 40px "EB Garamond"', '400 40px "Zen Kurenaido"', '600 40px "Klee One"', '400 40px "Share Tech Mono"', '700 40px "Barlow Condensed"', '900 40px "Noto Sans CJK JP"', '700 40px "Noto Sans CJK JP"'];
  await Promise.all(fams.map((f) => document.fonts.load(f, 'Aあ監督ヱ')));
  WD.buildWorld();
  await initPaint();
  post = new PostFX(out, W, H);
  window.renderFrame = (f) => renderAt(f / FPS);
  window.__readyResolve({ total: TOTAL, frames: Math.round(TOTAL * FPS), w: W, h: H });
})().catch((e) => { console.error('INIT FAILED', e && e.stack || e); });
