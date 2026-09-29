// ─────────────────────────────────────────────────────────────────────────────
//  p3_magi shot table + credit overlay. Shots are keyed by ABSOLUTE film time
//  (cuts land on the original OP's cut times; see NOTES.md).
// ─────────────────────────────────────────────────────────────────────────────
const SHOTS = [];     // {t0, t1, name, draw(ctx, lt, t, fx, dur)}
const CREDITS = [];   // {t0, t1, draw(octx, t, a)}
function shot(t0, t1, name, draw) { SHOTS.push({ t0, t1, name, draw }); }
function cred(t0, t1, draw, fin = 0.1, fout = 0.1) { CREDITS.push({ t0, t1, draw, fin, fout }); }

/** full-frame CRT look */
function crt(fx, o = {}) {
  fx.curve = o.curve ?? 0.05; fx.bloom = o.bloom ?? 0.55; fx.thr = o.thr ?? 0.6;
  if (o.roll) { fx.roll = o.roll; fx.rollPos = o.rollPos ?? 0; }
}

function drawFrame(ctx, octx, t, fx) {
  let sh = SHOTS[SHOTS.length - 1];
  for (const s of SHOTS) if (t >= s.t0 && t < s.t1) { sh = s; break; }
  fx.shot = sh.name;
  ctx.save();
  fill(ctx, '#000');
  sh.draw(ctx, t - sh.t0, t, fx, sh.t1 - sh.t0);
  ctx.restore();
  let used = false;
  for (const c of CREDITS) {
    if (t < c.t0 || t >= c.t1) continue;
    const a = credA(t, c.t0, c.t1, c.fin, c.fout);
    if (a <= 0) continue;
    octx.save(); c.draw(octx, t, a); octx.restore(); used = true;
  }
  fx.useOvl = used;
}

window.initShots = () => { for (const f of (window.SHOT_INITS || [])) f(); };
window.SHOT_INITS = [];
window.FORMULA_LIST = [
  ['task', '#cfe4ff'], ['cosadd', '#2a0400'], ['cosadd', '#39f07a'], ['omega', '#1b1a1d'], ['adamw', '#cfe4ff'],
  ['logits', '#39f07a'], ['power', '#ffae1a'], ['cosadd', '#1b1a1d'],
];
