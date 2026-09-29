// ── p1_tv1995 · one 90.5 s scene; shots are looked up by absolute time ───────
SCENES.push({
  name: 'op_tv1995', dur: 90.5,
  init() { ART.init(); SHOTS.sort((a, b) => a.t0 - b.t0); for (const s of SHOTS) if (s.fn.init) s.fn.init(); },
  draw(ctx, t, fx) {
    let s = null;
    for (const c of SHOTS) if (t >= c.t0 && t < c.t1) s = c;      // later-starting shot wins on overlap
    fill(ctx, '#000');
    if (!s) return;
    ctx.save(); s.fn(ctx, t - s.t0, fx, t, s); ctx.restore();
  },
});
