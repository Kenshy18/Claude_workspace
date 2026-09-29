// ── FINAL · 人類補完計画 — rank collapse in pure self-attention; the residual as AT Field ──
// The simulation is real: 48 tokens in ℝ²⁴, 7 layers of single-head softmax attention
// (Dong, Cordonnier & Loukas 2021). Pure SAN collapses to rank 1 doubly-exponentially;
// the same attention with a residual stream (pre-LN) keeps every token itself.
(() => {
  const N = 48, D = 24, L = 7;
  const NAMES = ['SHINJI', 'ASUKA', 'REI', 'MISATO', 'GENDO', 'KAWORU', 'RITSUKO', 'TOJI', 'KENSUKE', 'HIKARI', 'MAYA', 'PEN²'];
  const STAGE = { cx: 960, cy: 485, sx: 360, sy: 300 };
  const EPS = 1e-3;
  let PURE = [], RES = [], B = null, MU0 = null, SCALE = 1, RSCALE = [];

  // ── linear algebra helpers ────────────────────────────────────────────────
  const mm = (A, Bm) => A.map((r) => Bm[0].map((_, j) => { let s = 0; for (let k = 0; k < r.length; k++) s += r[k] * Bm[k][j]; return s; }));
  const T = (A) => A[0].map((_, j) => A.map((r) => r[j]));
  const mean = (X) => X[0].map((_, j) => X.reduce((s, r) => s + r[j], 0) / X.length);
  function attn(X, Wq, Wk) {
    const Q = mm(X, Wq), K = mm(X, Wk);
    return Q.map((q) => {
      const s = K.map((k) => q.reduce((a, v, i) => a + v * k[i], 0) / Math.sqrt(D));
      const m = Math.max(...s); const e = s.map((v) => Math.exp(v - m)); const z = e.reduce((a, b) => a + b);
      return e.map((v) => v / z);
    });
  }
  const ln = (X) => X.map((r) => { const m = r.reduce((a, b) => a + b) / D; const v = r.reduce((a, b) => a + (b - m) ** 2, 0) / D; return r.map((x) => (x - m) / Math.sqrt(v + 1e-6)); });
  function relres(X) {
    const mu = mean(X); let a = 0, b = 0;
    for (const r of X) for (let j = 0; j < D; j++) { a += (r[j] - mu[j]) ** 2; b += r[j] ** 2; }
    return Math.sqrt(a / b);
  }
  // one-sided Jacobi SVD (accurate small singular values)
  function svals(X) {
    const A = T(X).map((c) => c.slice());       // columns
    for (let sweep = 0; sweep < 30; sweep++) {
      let off = 0;
      for (let i = 0; i < D - 1; i++) for (let j = i + 1; j < D; j++) {
        let al = 0, be = 0, ga = 0;
        const ai = A[i], aj = A[j];
        for (let k = 0; k < ai.length; k++) { al += ai[k] * ai[k]; be += aj[k] * aj[k]; ga += ai[k] * aj[k]; }
        if (Math.abs(ga) <= 1e-300 || Math.abs(ga) < 1e-15 * Math.sqrt(al * be)) continue;
        off = Math.max(off, Math.abs(ga) / Math.sqrt(al * be));
        const ze = (be - al) / (2 * ga);
        const t = Math.sign(ze || 1) / (Math.abs(ze) + Math.sqrt(1 + ze * ze));
        const c = 1 / Math.sqrt(1 + t * t), s = c * t;
        for (let k = 0; k < ai.length; k++) { const x = ai[k], y = aj[k]; ai[k] = c * x - s * y; aj[k] = s * x + c * y; }
      }
      if (off < 1e-15) break;
    }
    const sv = A.map((c) => Math.sqrt(c.reduce((a, v) => a + v * v, 0))).sort((a, b) => b - a);
    return sv.map((v) => v / sv[0]);
  }
  const topk = (row, i, k) => row.map((v, j) => [v, j]).filter(([, j]) => j !== i).sort((a, b) => b[0] - a[0]).slice(0, k);

  function init() {
    const rng = mulberry32(7);
    const mat = (r, c, s) => Array.from({ length: r }, () => Array.from({ length: c }, () => gauss(rng) * s));
    const X0 = mat(N, D, 1);
    const Wq = [], Wk = [], Wv = [];
    for (let l = 0; l < L; l++) { Wq.push(mat(D, D, 4 / Math.sqrt(D))); Wk.push(mat(D, D, 1 / Math.sqrt(D))); Wv.push(mat(D, D, 1 / Math.sqrt(D))); }
    // pure SAN (W_V = I): X ← softmax(XW_Q (XW_K)ᵀ/√d) X
    let X = X0;
    PURE = [];
    for (let l = 0; l <= L; l++) {
      const A = l < L ? attn(X, Wq[l], Wk[l]) : null;
      PURE.push({ X, rr: relres(X), sv: svals(X), top: A ? A.map((r, i) => topk(r, i, 3)) : null });
      if (A) X = mm(A, X);
    }
    // residual (pre-LN): Y ← Y + softmax(·)(LN Y) W_V
    let Y = X0;
    RES = [];
    for (let l = 0; l <= L; l++) {
      const Z = ln(Y);
      const A = l < L ? attn(Z, Wq[l], Wk[l]) : null;
      RES.push({ X: Y, rr: relres(Y), sv: svals(Y), top: A ? A.map((r, i) => topk(r, i, 3)) : null });
      if (A) { const S = mm(mm(A, Z), Wv[l]); Y = Y.map((r, i) => r.map((v, j) => v + 0.6 * S[i][j])); }
    }
    // display basis: top-2 principal directions of X0 (power iteration)
    MU0 = mean(X0);
    const Xc = X0.map((r) => r.map((v, j) => v - MU0[j]));
    const Cm = mm(T(Xc), Xc);
    const vecs = [];
    for (let k = 0; k < 2; k++) {
      let v = Array.from({ length: D }, (_, i) => Math.sin(i * 1.7 + k));
      for (let it = 0; it < 200; it++) {
        let w = Cm.map((r) => r.reduce((a, x, j) => a + x * v[j], 0));
        for (const u of vecs) { const d = w.reduce((a, x, j) => a + x * u[j], 0); w = w.map((x, j) => x - d * u[j]); }
        const n = Math.hypot(...w); v = w.map((x) => x / n);
      }
      vecs.push(v);
    }
    B = vecs;
    const P0 = Xc.map((r) => [r.reduce((a, x, j) => a + x * B[0][j], 0), r.reduce((a, x, j) => a + x * B[1][j], 0)]);
    SCALE = 1 / Math.max(...P0.map(([a, b]) => Math.max(Math.abs(a) / STAGE.sx, Math.abs(b) / STAGE.sy)));
    // pure run: per-layer mean position + shape normalised by its own spread (for the zoom camera)
    PURE.forEach((st) => {
      const mu = mean(st.X);
      const c = mu.map((v, j) => v - MU0[j]);
      st.m = [STAGE.cx + SCALE * c.reduce((a, x, j) => a + x * B[0][j], 0), STAGE.cy + SCALE * c.reduce((a, x, j) => a + x * B[1][j], 0)];
      st.dev = st.X.map((r) => { const d = r.map((v, j) => v - mu[j]); return [SCALE * d.reduce((a, x, j) => a + x * B[0][j], 0), SCALE * d.reduce((a, x, j) => a + x * B[1][j], 0)]; });
      st.rms = Math.sqrt(st.dev.reduce((a, [u, v]) => a + u * u + v * v, 0) / N);
      st.dist = st.X.map((r) => Math.sqrt(r.reduce((a, v, j) => a + (v - mu[j]) ** 2, 0)));
      st.drms = Math.sqrt(st.dist.reduce((a, v) => a + v * v, 0) / N);
    });
    PURE.forEach((st) => {
      st.rad = st.dist.map((d) => 7.5 * (d / st.drms) * PURE[0].drms);
      st.shape = st.dev.map(([u, v]) => [(u / st.rms) * PURE[0].rms, (v / st.rms) * PURE[0].rms]);
      st.app = Math.pow(st.rr / PURE[0].rr, 0.15);
      st.zoom = (st.app * PURE[0].rms) / st.rms;
    });
    // residual stream grows in norm; the display renormalises spread per layer (like a final LayerNorm)
    RSCALE = RES.map(({ X: Yl }) => {
      const mu = mean(Yl); let s = 0; for (const r of Yl) for (let j = 0; j < D; j++) s += (r[j] - mu[j]) ** 2;
      return Math.sqrt(s / N);
    });
  }

  function project(X, l, residual) {
    if (!residual) return X.map((r) => {
      const c = r.map((v, j) => v - MU0[j]);
      return [STAGE.cx + SCALE * c.reduce((a, x, j) => a + x * B[0][j], 0), STAGE.cy + SCALE * c.reduce((a, x, j) => a + x * B[1][j], 0)];
    });
    const mu = mean(X), k = RSCALE[0] / RSCALE[l];
    return X.map((r) => {
      const c = r.map((v, j) => (v - mu[j]) * k);
      return [STAGE.cx + SCALE * c.reduce((a, x, j) => a + x * B[0][j], 0), STAGE.cy + SCALE * c.reduce((a, x, j) => a + x * B[1][j], 0)];
    });
  }
  function atRadius(X, l, residual) {
    const mu = mean(X), k = residual ? RSCALE[0] / RSCALE[l] : 1;
    return X.map((r) => 7.5 * k * Math.sqrt(r.reduce((a, v, j) => a + (v - mu[j]) ** 2, 0)));
  }

  // continuous layer index → interpolated state
  function state(sim, lc, residual) {
    const l0 = clamp(Math.floor(lc), 0, L), l1 = Math.min(L, l0 + 1), f = E.inOutCubic(clamp(lc - l0));
    const P0 = project(sim[l0].X, l0, residual), P1 = project(sim[l1].X, l1, residual);
    const R0 = atRadius(sim[l0].X, l0, residual), R1 = atRadius(sim[l1].X, l1, residual);
    const logrr = lerp(Math.log10(sim[l0].rr), Math.log10(sim[l1].rr), f);
    const sv = sim[l0].sv.map((v, i) => Math.pow(10, lerp(Math.log10(Math.max(v, 1e-17)), Math.log10(Math.max(sim[l1].sv[i], 1e-17)), f)));
    return {
      P: P0.map((p, i) => [lerp(p[0], P1[i][0], f), lerp(p[1], P1[i][1], f)]),
      R: R0.map((r, i) => lerp(r, R1[i], f)), rr: Math.pow(10, logrr), sv,
      rank: sv.filter((v) => v > EPS).length, l0, f, top: sim[l0].top, lc,
    };
  }

  // pure run seen through a camera that chases the collapse: apparent spread = rr^0.15
  function zstate(lc) {
    const l0 = clamp(Math.floor(lc), 0, L), l1 = Math.min(L, l0 + 1), f = E.inOutCubic(clamp(lc - l0));
    const a = PURE[l0], b = PURE[l1];
    const lrr = lerp(Math.log10(a.rr), Math.log10(b.rr), f), rr = Math.pow(10, lrr);
    const app = Math.pow(rr / PURE[0].rr, 0.15);
    const zoom = Math.pow(10, lerp(Math.log10(a.zoom), Math.log10(b.zoom), f));
    const cx = lerp(a.m[0], b.m[0], f), cy = lerp(a.m[1], b.m[1], f);
    const k = clamp(Math.log10(zoom) / 2);            // camera recentres onto the collapse point
    const ox = lerp(cx, STAGE.cx, k), oy = lerp(cy, STAGE.cy, k);
    const sv = a.sv.map((v, i) => Math.pow(10, lerp(Math.log10(Math.max(v, 1e-17)), Math.log10(Math.max(b.sv[i], 1e-17)), f)));
    return {
      P: a.shape.map((p, i) => [ox + lerp(p[0], b.shape[i][0], f) * app, oy + lerp(p[1], b.shape[i][1], f) * app]),
      R: a.rad.map((r, i) => lerp(r, b.rad[i], f) * app), rr, sv, zoom, app,
      rank: sv.filter((v) => v > EPS).length, l0, f, top: a.top, lc,
    };
  }

  function drawTokens(ctx, S, t, o = {}) {
    const a = o.alpha ?? 1;
    // attention lines during a layer transition
    if (S.top && S.f > 0 && S.f < 1 && S.l0 < L) {
      const env = Math.sin(Math.PI * S.f);
      ctx.save(); ctx.globalAlpha = a;
      for (let i = 0; i < N; i++) for (const [w, j] of S.top[i]) {
        line(ctx, S.P[i][0], S.P[i][1], S.P[j][0], S.P[j][1], o.lineCol || C.amber, 1 + 2 * w, 0.55 * env * w + 0.05 * env);
      }
      ctx.restore();
    }
    for (let i = 0; i < N; i++) {
      const pop = E.outBack(seg(t, (o.popAt ?? -1) + hash1(i + 3) * 1.0, (o.popAt ?? -1) + hash1(i + 3) * 1.0 + 0.4));
      if (pop <= 0) continue;
      const [x, y] = S.P[i];
      const r = S.R[i] * pop;
      // AT field: octagonal rings + ripple
      if (r > 5) {
        const fa = clamp((r - 5) / 20) * a;
        const ph = (t * 0.8 + hash1(i * 7)) % 1;
        poly(ctx, octPts(x, y, r), { stroke: o.atCol || C.orange, lw: 1.6, alpha: 0.6 * fa });
        poly(ctx, octPts(x, y, r * 0.72), { stroke: o.atCol || C.orange, lw: 1, alpha: 0.35 * fa });
        poly(ctx, octPts(x, y, r * (0.72 + 0.6 * ph)), { stroke: o.atCol || C.amber, lw: 1.2, alpha: 0.5 * fa * (1 - ph) });
      }
      const named = i < NAMES.length;
      dot(ctx, x, y, (named ? 5.5 : 3.5) * pop, named ? C.white : C.amber, a);
      if (named && (o.labels ?? 1) > 0) {
        text(ctx, NAMES[i], x + 10, y - 9, { size: 17, family: F.cond, weight: 700, color: C.white, ls: 2, alpha: a * pop * (o.labels ?? 1) });
      }
    }
  }

  function leftPanel(ctx, t, S, ghost, residual, pa) {
    const x = 70, y = 150, w = 360, h = 690;
    const col = residual ? C.green : C.orange;
    panel(ctx, x, y, w, h, { p: pa, label: residual ? 'RESIDUAL NET' : 'PURE SAN', sub: residual ? `n=${N} · d=${D} · pre-LN` : `n=${N} · d=${D} · W_V = I`, color: col });
    if (pa < 0.3) return;
    text(ctx, 'LAYER', x + 24, y + 50, { size: 22, family: F.cond, weight: 800, color: col, ls: 5 });
    text(ctx, `${pad(Math.min(L, Math.round(S.lc)))}`, x + 24, y + 150, { size: 110, family: F.mono, color: C.white });
    text(ctx, `/ ${pad(L)}`, x + 170, y + 150, { size: 40, family: F.mono, color: col });
    text(ctx, 'rank_ε(X)', x + 24, y + 200, { size: 22, family: F.mono, color: col });
    const rk = S.rank;
    text(ctx, String(rk).padStart(2, '0'), x + w - 24, y + 214, { size: 56, family: F.mono, color: rk <= 1 ? C.red : C.white, align: 'right' });
    text(ctx, '‖res(X)‖ / ‖X‖', x + 24, y + 256, { size: 20, family: F.mono, color: col });
    text(ctx, S.rr.toExponential(2), x + w - 24, y + 290, { size: 34, family: F.mono, color: S.rr < 1e-3 ? C.red : C.white, align: 'right' });
    // log plot of relres vs layer
    const px = x + 70, py = y + 330, pw = w - 100, ph = h - 400;
    const { X, Y } = axes(ctx, px, py, pw, ph, { color: col, xmin: 0, xmax: L, ymin: 1e-17, ymax: 3, logy: true, nx: L, ny: 4,
      xticks: [[0, '0'], [L, String(L)]], yticks: [[1, '1'], [1e-4, '1e-4'], [1e-8, '1e-8'], [1e-12, '1e-12'], [1e-16, '1e-16']], xlabel: 'layer ℓ' });
    ctx.save(); ctx.setLineDash([4, 5]);
    line(ctx, px, Y(2.2e-16), px + pw, Y(2.2e-16), C.grey, 1, 0.7);
    ctx.restore();
    text(ctx, 'float64 ε', px + pw, Y(2.2e-16) - 6, { size: 14, family: F.mono, color: C.grey, align: 'right' });
    const curve = (sim, upto, c) => {
      const pts = [];
      for (let q = 0; q <= upto * 8 + 1e-9; q++) {
        const lc = q / 8; const l0 = Math.min(L, Math.floor(lc)), l1 = Math.min(L, l0 + 1), f = E.inOutCubic(lc - l0);
        pts.push([X(lc), Y(Math.pow(10, lerp(Math.log10(sim[l0].rr), Math.log10(sim[l1].rr), f)))]);
      }
      plotLine(ctx, pts, c, 3);
    };
    if (ghost) curve(PURE, L, 'rgba(255,36,54,0.7)');
    curve(residual ? RES : PURE, clamp(S.lc, 0, L), residual ? C.green : C.red);
  }

  function rightPanel(ctx, t, S, residual, pa) {
    const x = 1490, y = 150, w = 360, h = 690;
    const col = residual ? C.green : C.orange;
    panel(ctx, x, y, w, h, { p: pa, label: 'SPECTRUM', sub: 'σᵢ / σ₁  (log)', color: col });
    if (pa < 0.3) return;
    const bx = x + 60, bw = w - 90;
    const lg = (v) => clamp((Math.log10(Math.max(v, 1e-17)) + 17) / 17);
    S.sv.forEach((v, i) => {
      const yy = y + 30 + i * 26;
      rect(ctx, bx, yy, bw, 18, { stroke: col, alpha: 0.2 });
      rect(ctx, bx, yy, bw * lg(v) * pa, 18, { fill: v > EPS ? col : C.red, alpha: v > EPS ? 0.85 : 0.6 });
      text(ctx, `σ${i + 1}`, bx - 10, yy + 15, { size: 14, family: F.mono, color: col, align: 'right', alpha: 0.8 });
    });
    const ex = bx + bw * lg(EPS);
    ctx.save(); ctx.setLineDash([4, 4]); line(ctx, ex, y + 24, ex, y + 30 + 24 * 26, C.white, 1, 0.7); ctx.restore();
    text(ctx, 'ε', ex + 4, y + 30 + 24 * 26 + 18, { size: 16, family: F.mono, color: C.white });
  }

  function lcl(ctx, t, a) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 50, W / 2, H * 0.5, 1100);
    g.addColorStop(0, '#ff9636'); g.addColorStop(0.4, '#e5560a'); g.addColorStop(1, '#4a0c00');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 7; k++) {          // caustic bands
      ctx.beginPath();
      const y0 = (k / 7) * H + Math.sin(t * 0.5 + k) * 40;
      for (let i = 0; i <= 80; i++) {
        const xx = (i / 80) * W;
        const yy = y0 + Math.sin(i * 0.25 + t * 1.3 + k * 1.7) * 26 + Math.sin(i * 0.07 - t * 0.7 + k) * 60;
        i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.strokeStyle = 'rgba(255,200,130,0.06)'; ctx.lineWidth = 18; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,230,190,0.08)'; ctx.lineWidth = 3; ctx.stroke();
    }
    for (let i = 0; i < 70; i++) {         // rising particles
      const px = hash1(i * 11) * W + Math.sin(t + i) * 12;
      const py = H - ((t * (30 + hash1(i * 5) * 60) + hash1(i * 9) * H) % (H + 40));
      dot(ctx, px, py, 1.5 + hash1(i) * 3, 'rgba(255,235,200,0.5)');
    }
    ctx.restore();
    hexGrid(ctx, 0, 0, W, H, 70, '#fff0d0', 0.05 * a);
  }

  function crossFlare(ctx, lt, x, y) {
    if (lt < 0 || lt > 1.4) return;
    const a = lt < 0.15 ? lt / 0.15 : 1 - seg(lt, 0.5, 1.4);
    const vw = 30 + 90 * E.outExpo(seg(lt, 0, 0.6));
    const hw = 1100 * E.outExpo(seg(lt, 0, 0.5));
    ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter';
    const vg = ctx.createLinearGradient(x - vw, 0, x + vw, 0);
    vg.addColorStop(0, 'rgba(255,90,0,0)'); vg.addColorStop(0.35, 'rgba(255,170,60,0.8)'); vg.addColorStop(0.5, '#ffffff'); vg.addColorStop(0.65, 'rgba(255,170,60,0.8)'); vg.addColorStop(1, 'rgba(255,90,0,0)');
    ctx.fillStyle = vg; ctx.fillRect(x - vw, 0, vw * 2, H);
    const cy = y - 150, hh = 50;
    const hg = ctx.createLinearGradient(0, cy - hh, 0, cy + hh);
    hg.addColorStop(0, 'rgba(255,90,0,0)'); hg.addColorStop(0.5, '#ffffff'); hg.addColorStop(1, 'rgba(255,90,0,0)');
    ctx.fillStyle = hg; ctx.fillRect(x - hw / 2, cy - hh, hw, hh * 2);
    ctx.restore();
  }

  // ── scene A: collapse ─────────────────────────────────────────────────────
  const LT0 = 3.6, LSTEP = 1.2;                     // layer k transitions at LT0 + (k-1)·LSTEP
  const lcAt = (t, t0, step) => clamp((t - t0) / step, 0, L) - 0 + 0;
  const layerCont = (t, t0, step, dur) => { const k = Math.floor((t - t0) / step); const f = (t - t0) / step - k; return clamp(k + clamp(f / dur), 0, L); };
  const TCROSS = 12.4;

  SCENES.push({
    name: 'collapse', dur: 18, init,
    formulas: [['san', '#f4f1ea'], ['bound', '#f4f1ea'], ['atfield', '#f4f1ea'], ['skip', '#f4f1ea']],
    draw(ctx, t, fx) {
      ctx.fillStyle = '#040302'; ctx.fillRect(0, 0, W, H);
      const pa = seg(t, 0.2, 1.4);
      hexGrid(ctx, 0, 0, W, H, 60, C.orange, 0.04);
      hudChrome(ctx, t, { left: 'FINAL // HUMAN INSTRUMENTALITY', center: 'SINGLE-HEAD SELF-ATTENTION · NO SKIP · NO MLP', status: t > 8.5 ? 'AT FIELDS: LOST' : 'AT FIELDS: STABLE', color: t > 8.5 ? C.red : C.orange, clock: 101 + t });
      const lc = layerCont(t, LT0, LSTEP, 0.62);
      const S = zstate(t < LT0 ? 0 : lc);
      formula(ctx, 'san', W / 2, 80, 58, '#f4f1ea', { align: 'center', reveal: E.outCubic(seg(t, 0.4, 1.6)) });
      leftPanel(ctx, t, S, false, false, pa);
      rightPanel(ctx, t, S, false, pa);
      const merged = seg(S.app, 0.08, 0.4);         // 0 when collapsed
      drawTokens(ctx, S, t, { popAt: 0.2, labels: merged });
      if (S.zoom > 1.5) {
        const za = seg(Math.log10(S.zoom), 0.15, 0.5);
        text(ctx, `CAMERA ZOOM  ×${S.zoom.toExponential(1).replace('e+', 'e')}`, 490, 180, { size: 24, family: F.mono, color: C.amber, alpha: za });
        const bar = 120;
        line(ctx, 490, 200, 490 + bar, 200, C.amber, 2, za); line(ctx, 490, 194, 490, 206, C.amber, 2, za); line(ctx, 490 + bar, 194, 490 + bar, 206, C.amber, 2, za);
        text(ctx, `= ${(bar / (SCALE * S.zoom)).toExponential(0)} ‖x‖`, 490 + bar + 12, 207, { size: 18, family: F.mono, color: C.amber, alpha: za });
      }
      if (S.app < 0.06) {                           // the single remaining soul glows
        const [x, y] = [STAGE.cx, STAGE.cy];
        const gl = seg(t, 8.5, TCROSS);
        dot(ctx, x, y, 8 + 10 * gl, C.white, 1);
        ring(ctx, x, y, 22 + 30 * gl + 6 * Math.sin(t * 9), C.amber, 2, 0.8);
        text(ctx, 'rank(X) = 1', x + 40, y - 30, { size: 28, family: F.mono, color: C.red, alpha: seg(t, 8.8, 9.3) });
      }
      text(ctx, 'AT-FIELD RADIUS', 490, 790, { size: 18, family: F.cond, weight: 800, color: C.orange, ls: 4, alpha: seg(t, 1.6, 2.2) * (1 - seg(t, 5.8, 6.3)) });
      formula(ctx, 'atfield', 490, 800, 40, '#f4f1ea', { reveal: E.outCubic(seg(t, 1.6, 2.4)), alpha: 1 - seg(t, 5.8, 6.3) });
      // Dong et al. bound
      const bp = seg(t, 6.4, 7.2) * (1 - seg(t, 12.0, 12.4));
      if (bp > 0) {
        rect(ctx, 480, 872, 960, 92, { fill: 'rgba(0,0,0,0.75)', stroke: C.orange, alpha: bp });
        formula(ctx, 'bound', W / 2, 884, 64, '#f4f1ea', { align: 'center', alpha: bp, reveal: E.outCubic(seg(t, 6.6, 7.8)) });
        text(ctx, 'DOUBLY EXPONENTIAL', 470, 865, { size: 16, family: F.cond, weight: 800, color: C.orange, ls: 5, alpha: bp });
      }
      caption(ctx, t, 1.2, 4.6, 'ATフィールドは、誰もが持っている心の壁なんだ。', 'The AT Field is the wall of the heart that everyone carries.', 'KAWORU');
      // collapse → cross → LCL
      const [cx0, cy0] = [STAGE.cx, STAGE.cy];
      crossFlare(ctx, t - TCROSS, cx0, cy0);
      const la = seg(t, TCROSS + 0.2, TCROSS + 1.2);
      if (la > 0) {                                  // LCL erupts outward from the singularity
        ctx.save(); ctx.beginPath(); ctx.arc(cx0, cy0, 2200 * E.inCubic(la) + 4, 0, Math.PI * 2); ctx.clip();
        lcl(ctx, t, 1); ctx.restore();
      }
      if (la >= 1) {
        caption(ctx, t, 13.4, 16.0, '全ての心が、ひとつに——', 'Every heart, becoming one.', '', { y: H / 2 + 20, size: 64, band: false });
        const ea = seg(t, 16.0, 16.4);
        text(ctx, '人類補完計画 ／ 完遂', W / 2, H / 2 - 10, { size: 72, family: F.mincho, weight: 900, color: '#fff6e8', align: 'center', alpha: ea, stroke: 'rgba(70,14,0,0.55)', strokeW: 8 });
        text(ctx, `INSTRUMENTALITY COMPLETE   ·   rank(X) = 1   ·   ‖res(X)‖/‖X‖ = ${PURE[L].rr.toExponential(1)}`, W / 2, H / 2 + 50, { size: 24, family: F.mono, color: '#fff0dc', align: 'center', alpha: ea });
      }
      fx.scan = 0.08; fx.bloom = 0.9; fx.ca = 0.3; fx.vig = 0.65;
      if (t >= TCROSS && t < TCROSS + 0.07) { fx.flash = 1; fx.flashCol = [1, 0.98, 0.94]; } else if (t >= TCROSS && t < TCROSS + 0.4) fx.ca = 1.2;
      if (la >= 1) { fx.scan = 0.03; fx.bloom = 0.35; fx.thr = 0.82; }
      // subtle stutter at each layer hit
      const k = (t - LT0) / LSTEP; if (t > LT0 && k - Math.floor(k) < 0.08 && k < L) fx.ca = 0.9;
    },
    cues() {
      const c = [{ t: 0.2, type: 'hud_in' }, { t: 1.2, type: 'voice_tick' }];
      for (let k = 0; k < L; k++) c.push({ t: LT0 + k * LSTEP, type: 'layer', k, pure: 1 });
      c.push({ t: 6.4, type: 'formula_in' }, { t: 8.5, type: 'collapse_tone', dur: TCROSS - 8.5 }, { t: TCROSS, type: 'cross' }, { t: TCROSS + 0.4, type: 'lcl', dur: 18 - TCROSS + 2.6 }, { t: 16.0, type: 'complete' });
      return c;
    },
  });

  // ── scene B: the residual stream brings everyone back ────────────────────
  const RT0 = 4.2, RSTEP = 0.62;
  SCENES.push({
    name: 'residual', dur: 11,
    draw(ctx, t, fx) {
      const back = t >= 2.6;
      if (!back) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        lcl(ctx, 18 + t, 1);
        caption(ctx, t, 0.15, 2.5, 'でも……もう一度、会いたいと思ったんだ。', 'But... I wanted to see them again.', 'SHINJI', { y: H / 2 + 20, size: 58, band: false, spColor: '#fff0dc' });
        fx.scan = 0.03; fx.bloom = 0.35; fx.thr = 0.82; fx.vig = 0.65;
        return;
      }
      const u = t - 2.6;
      ctx.fillStyle = '#020403'; ctx.fillRect(0, 0, W, H);
      hexGrid(ctx, 0, 0, W, H, 60, C.green, 0.04);
      hudChrome(ctx, u, { left: 'FINAL // ATフィールド ≡ RESIDUAL', center: 'SAME ATTENTION WEIGHTS · + SKIP CONNECTION · PRE-LN', status: 'AT FIELDS: RESTORED', color: C.green, clock: 119 + t });
      formula(ctx, 'skip', W / 2, 78, 60, '#f4f1ea', { align: 'center', reveal: E.outExpo(seg(u, 0.0, 0.4)) });
      // burst back out of the singularity, then run residual layers
      const lc = t < RT0 ? 0 : layerCont(t, RT0, RSTEP, 0.7);
      const S = state(RES, lc, true);
      const bo = E.outExpo(seg(u, 0.05, 1.3));
      const [sx, sy] = [STAGE.cx, STAGE.cy];
      S.P = S.P.map(([x, y]) => [lerp(sx, x, bo), lerp(sy, y, bo)]);
      S.R = S.R.map((r) => r * bo);
      leftPanel(ctx, t, S, true, true, 1);
      rightPanel(ctx, t, S, true, 1);
      drawTokens(ctx, S, t, { lineCol: '#b9ffcf', atCol: C.orange, labels: seg(u, 0.8, 1.4) });
      const tg = seg(u, 0.2, 0.6);
      text(ctx, 'ATフィールド ≡ 残差接続', W / 2, 172, { size: 38, family: F.gothic, weight: 900, color: C.green, align: 'center', ls: 6, alpha: tg });
      caption(ctx, t, 8.2, 10.9, '注意機構は、他者を知るために。残差接続は、自分であるために。', 'Attention, to know the others.  The residual, to remain yourself.', '', { size: 48 });
      fx.scan = 0.08; fx.bloom = 0.85; fx.ca = 0.3; fx.vig = 0.6;
      if (u < 0.35) { fx.flash = 0.9 * (1 - seg(u, 0, 0.35)); fx.flashCol = [1, 1, 1]; fx.ca = 1.4; fx.glitch = 0.3; }
    },
    cues() {
      const c = [{ t: 0.15, type: 'voice_tick' }, { t: 2.6, type: 'rebirth' }];
      for (let k = 0; k < L; k++) c.push({ t: RT0 + k * RSTEP, type: 'layer', k, pure: 0 });
      c.push({ t: 8.2, type: 'voice_tick' });
      return c;
    },
  });
})();
