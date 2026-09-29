// ─────────────────────────────────────────────────────────────────────────────
//  OPENING · 「残酷な勾配のテーゼ」 — an homage to the TV opening, cut to 128 BPM.
//  bars: intro 0-4 · title 4 · riff 5-8 · verse 8-16 · pre 16-22 · build 22-24 ·
//        chorus 24-40 (launch · battle · descent · climax) · lineup 40-42 · logo 42-46
// ─────────────────────────────────────────────────────────────────────────────
(() => {
  const BPM = 128, BEAT = 60 / BPM, BAR = BEAT * 4;
  const punch = (t, k = 7) => Math.exp(-((((t % BEAT) + BEAT) % BEAT) / BEAT) * k);   // decays after each beat

  // ── helpers ────────────────────────────────────────────────────────────────
  function vtext(ctx, str, x, y, size, o = {}) {
    let yy = y;
    for (const ch of [...str]) {
      let dx = 0, dy = 0;
      if ('、。'.includes(ch)) { dx = size * 0.55; dy = -size * 0.62; }
      if ('ッャュョィェァ'.includes(ch)) { dx = size * 0.08; dy = -size * 0.08; }
      ctx.save();
      ctx.translate(x + dx, yy + dy);
      if ('ー〜…—'.includes(ch)) ctx.rotate(Math.PI / 2);
      text(ctx, ch, 0, 0, { size, family: o.family || F.mincho, weight: o.weight ?? 900, color: o.color || '#fbfaf5', align: 'center', base: 'middle', alpha: o.alpha, stroke: o.stroke, strokeW: o.strokeW });
      ctx.restore();
      yy += size * (o.lh || 1.04);
    }
  }
  function bg(ctx, c) { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); }
  function radial(ctx, x, y, r, c0, c1) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function zoom(ctx, s, cx = W / 2, cy = H / 2) { ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); }
  function credit(ctx, lt, a, b, role, name, pos = 'bl') {
    if (lt < a || lt > b) return;
    const f = Math.floor((lt - a) * FPS);
    const al = (f < 2 ? 0.45 : 1) * (1 - seg(lt, b - 0.2, b));
    const x = pos === 'br' ? W - 120 : 120, al2 = pos === 'br' ? 'right' : 'left';
    text(ctx, role, x, H - 150, { size: 26, family: F.mincho, weight: 700, color: '#f4f1ea', align: al2, alpha: al, ls: 6 });
    text(ctx, name, x, H - 100, { size: 40, family: F.mincho, weight: 900, color: '#ffffff', align: al2, alpha: al, stroke: 'rgba(0,0,0,0.6)', strokeW: 6 });
  }

  // ── intro: horizon, a point of light, vertical text ───────────────────────
  function horizon(ctx, t, o = {}) {
    const hy = o.hy ?? 640;
    const sky = ctx.createLinearGradient(0, 0, 0, hy);
    sky.addColorStop(0, o.sky0 || '#02060f'); sky.addColorStop(1, o.sky1 || '#1d4f8f');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hy);
    const sea = ctx.createLinearGradient(0, hy, 0, H);
    sea.addColorStop(0, o.sea0 || '#0d2a52'); sea.addColorStop(1, '#010308');
    ctx.fillStyle = sea; ctx.fillRect(0, hy, W, H - hy);
    // reflective swell lines
    for (let i = 0; i < 26; i++) {
      const y = hy + 6 + Math.pow(i / 26, 1.6) * (H - hy);
      const a = 0.25 * (1 - i / 26);
      ctx.beginPath();
      for (let k = 0; k <= 60; k++) {
        const x = (k / 60) * W;
        const yy = y + Math.sin(k * 0.6 + t * 1.2 + i) * (1 + i * 0.25);
        k ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
      }
      ctx.strokeStyle = o.line || `rgba(150,200,255,${a})`; ctx.lineWidth = 1; ctx.stroke();
    }
    line(ctx, 0, hy, W, hy, o.hline || '#a9d4ff', 1.5, 0.8);
  }
  function glowPoint(ctx, x, y, r, col = '255,255,255') {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},1)`); g.addColorStop(0.15, `rgba(${col},0.6)`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    const s = ctx.createLinearGradient(x - r * 6, 0, x + r * 6, 0);
    s.addColorStop(0, `rgba(${col},0)`); s.addColorStop(0.5, `rgba(${col},0.55)`); s.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = s; ctx.fillRect(x - r * 6, y - 2, r * 12, 4);
    ctx.restore();
  }
  function crossLight(ctx, x, y, k, col = '255,236,210') {
    if (k <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, k);
    const vw = 20 + 110 * k, hw = 1500 * k;
    const vg = ctx.createLinearGradient(x - vw, 0, x + vw, 0);
    vg.addColorStop(0, `rgba(${col},0)`); vg.addColorStop(0.5, `rgba(255,255,255,1)`); vg.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = vg; ctx.fillRect(x - vw, 0, vw * 2, H);
    const hg = ctx.createLinearGradient(0, y - 180 - 40, 0, y - 180 + 40);
    hg.addColorStop(0, `rgba(${col},0)`); hg.addColorStop(0.5, 'rgba(255,255,255,1)'); hg.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = hg; ctx.fillRect(x - hw / 2, y - 220, hw, 80);
    ctx.restore();
  }

  function sIntro(ctx, t, fx) {
    const f = Math.floor(t * FPS);
    horizon(ctx, t);
    const g = E.inCubic(seg(t, 0.3, 7.2));
    glowPoint(ctx, W / 2, 640, 30 + 280 * g);
    text(ctx, 'OPENING', 120, 150, { size: 22, family: F.cond, weight: 700, color: '#a9d4ff', ls: 12, alpha: seg(t, 0.8, 1.6) * (1 - seg(t, 5.5, 6.0)) });
    text(ctx, '残酷な勾配のテーゼ', 120, 200, { size: 40, family: F.mincho, weight: 700, color: '#eef6ff', alpha: seg(t, 1.0, 1.8) * (1 - seg(t, 5.5, 6.0)) });
    text(ctx, 'A CRUEL GRADIENT’S THESIS', 120, 238, { size: 20, family: F.cond, weight: 500, color: '#a9d4ff', ls: 6, alpha: seg(t, 1.3, 2.1) * (1 - seg(t, 5.5, 6.0)) });
    // vertical lines of text, one phrase per bar
    const a1 = seg(t, BAR * 1, BAR * 1 + 0.4) * (1 - seg(t, BAR * 3.6, BAR * 3.9));
    const a2 = seg(t, BAR * 2, BAR * 2 + 0.4) * (1 - seg(t, BAR * 3.6, BAR * 3.9));
    vtext(ctx, '少年よ、', 1560, 170, 96, { alpha: a1 });
    vtext(ctx, '勾配になれ', 1420, 290, 96, { alpha: a2 });
    text(ctx, 'BOY, BECOME THE GRADIENT.', 1290, 900, { size: 22, family: F.cond, weight: 700, color: '#cfe6ff', ls: 8, align: 'right', alpha: a2 });
    crossLight(ctx, W / 2, 640, E.inExpo(seg(t, BAR * 3.5, BAR * 4)));
    fx.bloom = 0.8; fx.thr = 0.5; fx.scan = 0.04; fx.vig = 0.7; fx.grain = 0.05; fx.ca = 0.25;
    fx.flash = E.inExpo(seg(t, BAR * 3.75, BAR * 4)) * 0.9;
    if (f < 3) { bg(ctx, '#000'); }
  }

  // ── title flash: the logo, stuttered into single-frame cards ───────────────
  const TFLASH = [   // [lines, bg, fg, frames]
    [[['新', 360]], '#000', '#fff', 3], [[['世', 360]], '#fff', '#000', 2], [[['紀', 360]], '#000', '#fff', 3],
    [[['NEON', 220, 'serif']], '#b3001b', '#fff', 2], [[['GENESIS', 200, 'serif']], '#000', '#fff', 3],
    [[['勾配', 330]], '#fff', '#000', 3], [[['降下', 330]], '#000', '#fff', 3],
    [[['GRADIENT', 190, 'serif']], '#000', '#ff2436', 2], [[['DESCENT', 190, 'serif']], '#fff', '#000', 3],
    [[['∇', 420, 'serif']], '#000', '#fff', 2], [[['新世紀', 130], ['勾配降下', 250]], '#000', '#fff', 20],
    [[['NEON GENESIS', 70, 'serif'], ['GRADIENT DESCENT', 110, 'serif']], '#000', '#fff', 10],
  ];
  function sTitle(ctx, t, fx) {
    const f = Math.floor(t * FPS);
    let acc = 0, card = TFLASH[TFLASH.length - 1];
    for (const c of TFLASH) { if (f < acc + c[3]) { card = c; break; } acc += c[3]; }
    const [lines, b, fg] = card;
    bg(ctx, b);
    const tot = lines.reduce((s, l) => s + l[1] * 1.05, 0);
    let y = H / 2 - tot / 2;
    for (const [s, size, fam] of lines) {
      y += size;
      text(ctx, s, W / 2, y - size * 0.15, { size, family: fam === 'serif' ? F.serif : F.mincho, weight: fam === 'serif' ? 700 : 900, color: fg, align: 'center', sx: fam === 'serif' ? 0.82 : 0.9, ls: fam === 'serif' ? 6 : 0 });
      y += size * 0.05;
    }
    fx.bloom = b === '#fff' ? 0 : 0.3; fx.scan = 0; fx.grain = 0.08; fx.ca = 0.8; fx.vig = 0.4;
  }

  // ── riff montage ───────────────────────────────────────────────────────────
  const SEPH = [[0, 0], [1, 0.8], [-1, 0.8], [1, 2.3], [-1, 2.3], [0, 3.1], [1, 4.4], [-1, 4.4], [0, 5.2], [0, 6.5]];
  const PATHS = [[0, 1], [0, 2], [0, 5], [1, 2], [1, 5], [1, 3], [2, 5], [2, 4], [3, 4], [3, 5], [3, 6], [4, 5], [4, 7], [5, 6], [5, 8], [5, 7], [6, 7], [6, 8], [6, 9], [7, 8], [7, 9], [8, 9]];
  const LAYERS = ['embed', 'attn.q', 'attn.k', 'mlp.up', 'mlp.gate', 'residual', 'attn.o', 'norm', 'lm_head', 'loss'];
  function tree3d(ctx, t, cx, cy, sc, rot, col = C.red) {
    const P = SEPH.map(([x, y], i) => {
      const p = rot3([x * 1.4, y - 3.25, Math.sin(i * 1.3) * 0.25], 0.12, rot, 0);
      const k = 3.4 / (3.4 + p[2]);
      return [cx + p[0] * sc * k, cy + p[1] * sc * k, k];
    });
    PATHS.forEach(([i, j], n) => {
      line(ctx, P[i][0], P[i][1], P[j][0], P[j][1], col, 2.5, 0.8);
      const u = ((t * 1.3 + n * 0.17) % 1);
      dot(ctx, lerp(P[i][0], P[j][0], u), lerp(P[i][1], P[j][1], u), 4, C.amber);
    });
    P.forEach(([x, y, k], i) => {
      dot(ctx, x, y, 30 * k, '#120404'); ring(ctx, x, y, 30 * k, col, 3); ring(ctx, x, y, 22 * k, '#ff8f6a', 1, 0.8);
      dot(ctx, x, y, 8 * k, C.amber);
      text(ctx, LAYERS[i], x + 40 * k, y + 6, { size: 18, family: F.mono, color: col, alpha: 0.9 });
    });
  }
  function atField(ctx, x, y, r, t, a = 1, col = C.orange) {
    for (let k = 0; k < 6; k++) {
      const ph = (t * 1.4 + k / 6) % 1;
      poly(ctx, octPts(x, y, r * (0.3 + ph * 0.9)), { stroke: col, lw: 3 - ph * 2, alpha: a * (1 - ph) * 0.9 });
    }
    poly(ctx, octPts(x, y, r), { stroke: col, lw: 4, alpha: a });
  }
  const WORDS = [['注意', 'ATTENTION'], ['勾配', 'GRADIENT'], ['残差', 'RESIDUAL'], ['損失', 'LOSS'], ['補完', 'COMPLETE'], ['埋込', 'EMBED']];
  function wordFlash(ctx, t, i, fx) {
    const [jp, en] = WORDS[i % WORDS.length];
    const inv = i % 2 === 1;
    bg(ctx, inv ? '#f5f3ec' : (i % 3 === 2 ? '#b3001b' : '#000'));
    const col = inv ? '#000' : '#fff';
    text(ctx, jp, W / 2, H / 2 + 110, { size: 320, family: F.mincho, weight: 900, color: col, align: 'center', sx: i % 2 ? 1.2 : 0.85 });
    text(ctx, en, W / 2, H / 2 + 230, { size: 48, family: F.serif, weight: 700, color: col, align: 'center', ls: 16 });
    fx.bloom = inv ? 0 : 0.3; fx.scan = 0; fx.ca = 0.7;
  }
  function magiFlash(ctx, t, k) {
    bg(ctx, '#050300');
    const names = ['MELCHIOR•1', 'BALTHASAR•2', 'CASPER•3'];
    const pos = [[1300, 620], [960, 330], [620, 620]];
    pos.forEach(([x, y], i) => {
      const on = ((k + i) % 3) !== 0;
      rect(ctx, x - 230, y - 100, 460, 200, { fill: on ? '#e2721a' : '#200406', stroke: on ? C.orange : C.red, lw: 3 });
      text(ctx, names[i], x - 200, y - 40, { size: 38, family: F.cond, weight: 800, color: on ? '#140800' : C.red, ls: 3 });
      text(ctx, on ? '承認' : '否決', x - 200, y + 60, { size: 70, family: F.gothic, weight: 900, color: on ? '#140800' : C.red, ls: 6 });
    });
    text(ctx, 'MAGI', 960, 560, { size: 80, family: F.serif, weight: 700, color: C.orange, align: 'center', ls: 12 });
  }
  function sRiff(ctx, t, fx) {
    const bar = Math.floor(t / BAR), lt = t - bar * BAR;
    const p = punch(t);
    ctx.save();
    if (bar === 0) {
      bg(ctx, '#040101'); radial(ctx, W / 2, H / 2, 900, 'rgba(120,0,10,0.35)', 'rgba(0,0,0,0)');
      hexGrid(ctx, 0, 0, W, H, 50, C.red, 0.06);
      zoom(ctx, 1 + 0.03 * p);
      tree3d(ctx, t, W / 2, H / 2 + 20, 112, 0.55 * Math.sin(t * 1.6), C.red);
      text(ctx, 'SEPHIROTH  //  COMPUTE GRAPH', 120, 130, { size: 26, family: F.cond, weight: 800, color: C.red, ls: 8 });
    } else if (bar === 1) {
      bg(ctx, '#01040a'); radial(ctx, 1250, 520, 800, 'rgba(40,110,255,0.3)', 'rgba(0,0,0,0)');
      hexGrid(ctx, 0, 0, W, H, 60, C.cyan, 0.05);
      zoom(ctx, 1.02 + 0.03 * p);
      octahedron(ctx, 1250, 520, 280, t * 1.2, { lw: 3 });
      atField(ctx, 640, 540, 300, t, 1);
      text(ctx, 'ANGEL', 1250, 930, { size: 90, family: F.serif, weight: 700, color: '#bfe0ff', align: 'center', ls: 30, alpha: flick(t, 15, 0.8) ? 1 : 0.2 });
      text(ctx, 'x ∉ p_data', 1250, 990, { size: 30, family: F.mono, color: C.cyan, align: 'center' });
    } else {
      const beat = Math.floor(lt / BEAT);
      if (beat < 2) magiFlash(ctx, t, Math.floor(lt / (BEAT / 2)));
      else wordFlash(ctx, t, Math.floor((lt - 2 * BEAT) / (BEAT / 2)), fx);
    }
    ctx.restore();
    if (Math.floor(t * FPS) % Math.round(BAR * FPS) < 2) fx.flash = 0.6;
    fx.ca = Math.max(fx.ca ?? 0.25, 0.3 + 0.8 * p); fx.bloom = fx.bloom ?? 0.8; fx.scan = 0.06;
  }

  // ── character cards ───────────────────────────────────────────────────────
  const R = mulberry32(99);
  const QV = Array.from({ length: 24 }, () => gauss(R));
  const KM = Array.from({ length: 10 }, () => Array.from({ length: 24 }, () => gauss(R)));
  const SC = KM.map((k) => k.reduce((s, v, j) => s + v * QV[j], 0) / Math.sqrt(24));
  const SMX = (() => { const m = Math.max(...SC); const e = SC.map((v) => Math.exp(v - m)); const z = e.reduce((a, b) => a + b); return e.map((v) => v / z); })();
  const VV = Array.from({ length: 8 }, () => Array.from({ length: 12 }, () => R()));
  const VA = (() => { const e = VV.map(() => Math.exp(gauss(R) * 1.2)); const z = e.reduce((a, b) => a + b); return e.map((v) => v / z); })();

  function vizQ(ctx, lt, col) {
    const x0 = 1000, y0 = 210;
    text(ctx, 'q = x W_Q', x0, y0 - 30, { size: 26, family: F.mono, color: col });
    QV.forEach((v, j) => rect(ctx, x0, y0 + j * 20, 40, 17, { fill: col, alpha: 0.15 + 0.85 * clamp(Math.abs(v) / 2.2) }));
    const imax = SMX.indexOf(Math.max(...SMX));
    KM.forEach((k, i) => {
      const y = y0 + 12 + i * 46;
      const a = seg(lt, 0.1 + i * 0.12, 0.3 + i * 0.12);
      if (a <= 0) return;
      line(ctx, x0 + 44, y0 + 240, 1240, y, col, 1 + 3 * SMX[i], a * (0.25 + SMX[i]));
      k.forEach((v, j) => rect(ctx, 1250 + j * 11, y - 8, 9, 16, { fill: '#cfe8ff', alpha: a * (0.1 + 0.6 * clamp(Math.abs(v) / 2.2)) }));
      const bw = 190 * SMX[i] * E.outCubic(seg(lt, BAR * 0.9 + i * 0.05, BAR * 1.3 + i * 0.05)) / Math.max(...SMX);
      rect(ctx, 1530, y - 8, bw, 16, { fill: i === imax ? C.white : col, alpha: a });
      text(ctx, (SMX[i] * 100).toFixed(1) + '%', 1780, y + 7, { size: 18, family: F.mono, color: i === imax ? C.white : col, align: 'right', alpha: a });
    });
    text(ctx, 'αᵢ = softmax(q·kᵢ / √d)', 1250, 720, { size: 26, family: F.mono, color: col, alpha: seg(lt, BAR, BAR + 0.4) });
  }
  function vizK(ctx, lt, col) {
    const x0 = 1000, y0 = 200;
    text(ctx, 'K = X W_K', x0, y0 - 30, { size: 26, family: F.mono, color: col });
    const row = Math.floor(lt / BEAT) % 12;
    for (let i = 0; i < 12; i++) for (let j = 0; j < 24; j++) {
      const v = hash2(i * 31 + 7, j);
      const hot = i === row;
      rect(ctx, x0 + j * 32, y0 + i * 40, 28, 34, { fill: hot ? '#ffffff' : col, alpha: hot ? 0.3 + 0.7 * v : 0.08 + 0.4 * v });
    }
    const y = y0 + row * 40 + 17;
    poly(ctx, [[x0 - 40, y - 14], [x0 - 12, y], [x0 - 40, y + 14]], { fill: '#ffffff' });
    text(ctx, `k_${pad(row + 1)} · q`, x0 + 24 * 32 + 20, y + 8, { size: 22, family: F.mono, color: '#ffffff' });
  }
  function vizV(ctx, lt, col) {
    const x0 = 1000, y0 = 230;
    text(ctx, 'o = Σ αᵢ vᵢ', x0, y0 - 50, { size: 26, family: F.mono, color: col });
    const grow = E.outCubic(seg(lt, 0.3, BAR * 1.6));
    VV.forEach((v, i) => {
      const x = x0 + i * 72;
      text(ctx, (VA[i] * 100).toFixed(0) + '%', x + 22, y0 - 10, { size: 18, family: F.mono, color: col, align: 'center' });
      v.forEach((u, j) => rect(ctx, x, y0 + j * 36, 44, 30, { fill: col, alpha: (0.15 + 0.8 * u) * (0.35 + 0.65 * VA[i] / Math.max(...VA)) }));
      line(ctx, x + 44, y0 + 216, 1680, y0 + 216, col, 1 + 5 * VA[i], 0.3 * grow);
    });
    for (let j = 0; j < 12; j++) {
      const o = VV.reduce((s, v, i) => s + VA[i] * v[j], 0);
      rect(ctx, 1690, y0 + j * 36, 60 * grow, 30, { fill: '#ffffff', alpha: 0.2 + 0.8 * o });
    }
    text(ctx, 'o', 1720, y0 + 470, { size: 36, family: F.serif, weight: 700, color: '#ffffff', align: 'center', alpha: grow });
  }
  function vizRes(ctx, lt, col) {
    const A = [1010, 450], Bx = [1360, 560], P = [1720, 450];
    ring(ctx, A[0], A[1], 38, col, 3); text(ctx, 'x', A[0], A[1] + 12, { size: 36, family: F.serif, weight: 700, color: '#fff', align: 'center' });
    rect(ctx, Bx[0] - 140, Bx[1] - 55, 280, 110, { fill: 'rgba(40,40,50,0.8)', stroke: col, lw: 2 });
    text(ctx, 'SELF-ATTENTION', Bx[0], Bx[1] + 9, { size: 26, family: F.cond, weight: 800, color: '#fff', align: 'center', ls: 3 });
    ring(ctx, P[0], P[1], 38, '#ffffff', 3); text(ctx, '+', P[0], P[1] + 16, { size: 50, family: F.serif, weight: 700, color: '#fff', align: 'center' });
    line(ctx, A[0] + 30, A[1] + 25, Bx[0] - 140, Bx[1], col, 2, 0.8); line(ctx, Bx[0] + 140, Bx[1], P[0] - 30, P[1] + 25, col, 2, 0.8);
    ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.moveTo(A[0], A[1] - 38); ctx.bezierCurveTo(A[0] + 150, 230, P[0] - 150, 230, P[0], P[1] - 38); ctx.stroke(); ctx.restore();
    for (let k = 0; k < 10; k++) {
      const u = (lt * 0.7 + k / 10) % 1;
      const bx = Math.pow(1 - u, 3) * A[0] + 3 * Math.pow(1 - u, 2) * u * (A[0] + 150) + 3 * (1 - u) * u * u * (P[0] - 150) + u * u * u * P[0];
      const by = Math.pow(1 - u, 3) * (A[1] - 38) + 3 * Math.pow(1 - u, 2) * u * 230 + 3 * (1 - u) * u * u * 230 + u * u * u * (P[1] - 38);
      dot(ctx, bx, by, 6, '#ffffff');
      const v = (lt * 0.5 + k / 10) % 1;
      const px = v < 0.5 ? lerp(A[0] + 30, Bx[0] - 140, v * 2) : lerp(Bx[0] + 140, P[0] - 30, v * 2 - 1);
      const py = v < 0.5 ? lerp(A[1] + 25, Bx[1], v * 2) : lerp(Bx[1], P[1] + 25, v * 2 - 1);
      dot(ctx, px, py, 4, col, 0.8);
    }
    text(ctx, 'x + SA(x)', 1360, 760, { size: 40, family: F.mono, color: '#ffffff', align: 'center' });
  }
  function vizLR(ctx, lt, col) {
    const { X, Y } = axes(ctx, 1000, 230, 780, 420, { color: col, xmin: 0, xmax: 1, ymin: 0, ymax: 1.1, nx: 10, ny: 4, xlabel: 'step', ylabel: 'η(t)' });
    const eta = (u) => u < 0.1 ? u / 0.1 : 0.1 + 0.9 * 0.5 * (1 + Math.cos(Math.PI * (u - 0.1) / 0.9));
    const pts = []; for (let i = 0; i <= 200; i++) pts.push([X(i / 200), Y(eta(i / 200))]);
    const pr = E.inOutCubic(seg(lt, 0.2, BAR * 1.8));
    const h = plotLine(ctx, pts, col, 4, pr);
    if (h) { dot(ctx, h[0], h[1], 9, '#fff'); text(ctx, `η = ${(3e-4 * eta(pr)).toExponential(1)}`, h[0] + 16, h[1] - 16, { size: 24, family: F.mono, color: '#fff' }); }
    text(ctx, 'warmup → cosine', 1000, 720, { size: 28, family: F.mono, color: col });
  }
  function lossF(x, y) { return 0.16 * (x * x + y * y) - 1.3 * Math.exp(-((x - 1) ** 2 + (y - 0.6) ** 2)) - 0.9 * Math.exp(-(((x + 1.3) ** 2 + (y + 0.9) ** 2) / 0.5)) + 0.12 * Math.sin(3 * x) * Math.cos(3 * y); }
  const PATH = (() => {
    let x = -2.2, y = 2.0; const p = [[x, y]];
    for (let i = 0; i < 160; i++) {
      const e = 1e-4, gx = (lossF(x + e, y) - lossF(x - e, y)) / (2 * e), gy = (lossF(x, y + e) - lossF(x, y - e)) / (2 * e);
      x -= 0.12 * gx; y -= 0.12 * gy; p.push([x, y]);
    }
    return p;
  })();
  function landscape(ctx, t, cx, cy, sc, rot, tilt, prog, o = {}) {
    const n = 34, span = 2.6;
    const P = (x, y) => { const z = lossF(x, y); const p = rot3([x, -z * 1.1, y], tilt, rot, 0); const k = (o.persp ?? 6) / ((o.persp ?? 6) + p[2]); return [cx + p[0] * sc * k, cy + p[1] * sc * k, z]; };
    ctx.save();
    for (let i = 0; i <= n; i++) for (const dir of [0, 1]) {
      ctx.beginPath();
      for (let j = 0; j <= n; j++) {
        const a = -span + (2 * span * i) / n, b = -span + (2 * span * j) / n;
        const [px, py] = dir ? P(a, b) : P(b, a);
        j ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.strokeStyle = o.col || C.orange; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const k = Math.floor(prog * (PATH.length - 1));
    const pts = PATH.slice(0, k + 1).map(([x, y]) => P(x, y));
    if (pts.length > 1) plotLine(ctx, pts.map((p) => [p[0], p[1] - 4]), C.red, 4);
    const hd = pts[pts.length - 1];
    if (hd) { dot(ctx, hd[0], hd[1] - 6, 11, '#fff'); ring(ctx, hd[0], hd[1] - 6, 20 + 6 * Math.sin(t * 8), C.red, 2); }
    ctx.restore();
    return hd ? lossF(...PATH[k]) : 0;
  }
  function vizLoss(ctx, lt, col) {
    const v = landscape(ctx, lt, 1380, 600, 125, 0.6 + lt * 0.25, 0.6, seg(lt, 0.2, BAR * 1.9), { col, persp: 7 });
    text(ctx, `θ* = argmin ℒ(θ)     ℒ = ${v.toFixed(3)}`, 1000, 180, { size: 28, family: F.mono, color: col });
  }

  const CHARS = [
    { jp: '碇シンジ', en: 'SHINJI IKARI', sym: 'Q', role: 'QUERY', tag: '問い続ける者', col: '#44d7ff', viz: vizQ },
    { jp: '綾波レイ', en: 'REI AYANAMI', sym: 'K', role: 'KEY', tag: '問いに応える者', col: '#a8dcff', viz: vizK },
    { jp: '惣流アスカ', en: 'ASUKA LANGLEY SOHRYU', sym: 'V', role: 'VALUE', tag: '自分の価値を示す者', col: '#ff3346', viz: vizV },
    { jp: '渚カヲル', en: 'KAWORU NAGISA', sym: '+', role: 'RESIDUAL', tag: '君を、君のままに', col: '#d6dae6', viz: vizRes },
    { jp: '葛城ミサト', en: 'MISATO KATSURAGI', sym: 'η', role: 'LEARNING RATE', tag: '導く者（ときどき高すぎる）', col: '#c26bff', viz: vizLR },
    { jp: '碇ゲンドウ', en: 'GENDO IKARI', sym: 'ℒ', role: 'OBJECTIVE', tag: 'すべては、シナリオ通りに', col: '#ff8a1c', viz: vizLoss },
  ];
  function card(ctx, lt, ch, fx) {
    bg(ctx, '#020203');
    radial(ctx, 1400, 520, 1100, ch.col + '38', 'rgba(0,0,0,0)');
    hexGrid(ctx, 0, 0, W, H, 54, ch.col, 0.05);
    const push = 1.06 - 0.06 * E.outCubic(seg(lt, 0, 0.35));
    ctx.save(); zoom(ctx, push * (1 + 0.012 * punch(lt)));
    text(ctx, ch.sym, 1420, 930, { size: 980, family: F.serif, weight: 700, color: 'rgba(0,0,0,0)', align: 'center', stroke: ch.col, strokeW: 3, alpha: 0.13 });
    vtext(ctx, ch.jp, 230, 190, 118, { alpha: seg(lt, 0.05, 0.25) });
    ctx.save(); ctx.translate(320, 170); ctx.rotate(Math.PI / 2);
    text(ctx, ch.en, 0, 0, { size: 26, family: F.cond, weight: 700, color: ch.col, ls: 10, alpha: seg(lt, 0.2, 0.5) });
    ctx.restore();
    const ra = seg(lt, 0.25, 0.6);
    text(ctx, ch.sym, 430, 820, { size: 170, family: F.serif, weight: 700, color: ch.col, alpha: ra });
    const sw = measure(ctx, ch.sym, { size: 170, family: F.serif, weight: 700 });
    text(ctx, '— ' + ch.role, 430 + sw + 30, 800, { size: 64, family: F.serif, weight: 700, color: '#ffffff', alpha: ra, sx: 0.9, ls: 3 });
    text(ctx, ch.tag, 430 + sw + 34, 872, { size: 46, family: F.mincho, weight: 700, color: '#f2efe8', alpha: seg(lt, 0.45, 0.8) });
    ch.viz(ctx, lt, ch.col);
    ctx.restore();
    if (Math.floor(lt * FPS) < 2) fx.flash = 0.7;
    fx.bloom = 0.7; fx.scan = 0.06; fx.ca = 0.3 + 0.5 * punch(lt); fx.vig = 0.6;
  }
  function sVerse(ctx, t, fx) {
    const i = Math.min(3, Math.floor(t / (2 * BAR))), lt = t - i * 2 * BAR;
    card(ctx, lt, CHARS[i], fx);
    credit(ctx, t, 0.3, BAR * 1.8, '原作', '「Attention Is All You Need」');
    credit(ctx, t, BAR * 2 + 0.3, BAR * 3.8, '監督', '確率的勾配降下法', 'br');
    credit(ctx, t, BAR * 4 + 0.3, BAR * 5.8, 'キャラクターデザイン', '埋め込み層');
    credit(ctx, t, BAR * 6 + 0.3, BAR * 7.8, 'メカニックデザイン', 'Transformer', 'br');
  }

  // ── pre-chorus: Misato, Gendo, SEELE ───────────────────────────────────────
  function seele(ctx, t, fx) {
    bg(ctx, '#000');
    radial(ctx, W / 2, H / 2, 900, 'rgba(90,0,0,0.25)', 'rgba(0,0,0,0)');
    const rot = -0.5 + t * 0.18;
    const M = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + rot;
      const p = [Math.cos(a) * 3.2, 0, Math.sin(a) * 3.2 + 1.8];
      M.push({ i, x: p[0], z: p[2] });
    }
    M.sort((a, b) => b.z - a.z);
    for (const m of M) {
      const k = 5.5 / (5.5 + m.z);
      const cx = W / 2 + m.x * 330 * k, cy = H / 2 + 20;
      const w = 130 * k, h = 470 * k;
      rect(ctx, cx - w / 2, cy - h / 2, w, h, { fill: '#050505', stroke: '#6b0010', lw: 2 });
      vtext(ctx, 'HEAD', cx, cy - h / 2 + 60 * k, 34 * k, { family: F.cond, weight: 800, color: C.red, lh: 0.9 });
      text(ctx, pad(m.i + 1), cx, cy + 40 * k, { size: 70 * k, family: F.serif, weight: 700, color: C.red, align: 'center' });
      text(ctx, 'ATTENTION', cx, cy + 120 * k, { size: 17 * k, family: F.cond, weight: 800, color: C.red, align: 'center', ls: 2 });
      text(ctx, 'ONLY', cx, cy + 142 * k, { size: 17 * k, family: F.cond, weight: 800, color: C.red, align: 'center', ls: 4 });
    }
    text(ctx, 'SEELE', 120, 130, { size: 60, family: F.serif, weight: 700, color: C.red, ls: 20 });
    text(ctx, 'ゼーレ ＝ 12 ATTENTION HEADS', 120, 180, { size: 30, family: F.gothic, weight: 700, color: '#ffd0d0' });
    text(ctx, '「全ては、ゼーレのシナリオ通りに」', W - 120, H - 110, { size: 38, family: F.mincho, weight: 700, color: '#fff', align: 'right', alpha: seg(t, BAR * 0.5, BAR * 0.9) });
    if (Math.floor(t * FPS) < 2) fx.flash = 0.6;
    fx.bloom = 0.8; fx.scan = 0.07; fx.ca = 0.35; fx.vig = 0.75;
  }
  function sPre(ctx, t, fx) {
    const i = Math.floor(t / (2 * BAR)), lt = t - i * 2 * BAR;
    if (i === 0) card(ctx, lt, CHARS[4], fx);
    else if (i === 1) card(ctx, lt, CHARS[5], fx);
    else seele(ctx, lt, fx);
    credit(ctx, t, 0.3, BAR * 1.8, '音楽', 'NumPy · SciPy');
    credit(ctx, t, BAR * 2 + 0.3, BAR * 3.8, '作画', 'Canvas 2D · WebGL', 'br');
    credit(ctx, t, BAR * 4 + 0.3, BAR * 5.8, '副監督', 'Adam（β₁ = 0.9, β₂ = 0.999）');
  }

  // ── build: attention matrix fills beat by beat ───────────────────────────
  function sBuild(ctx, t, fx) {
    const beat = Math.floor(t / BEAT);
    bg(ctx, '#030201');
    const n = 16, cs = 42, x0 = W / 2 - (n * cs) / 2, y0 = H / 2 - (n * cs) / 2;
    const rows = Math.min(n, (beat + 1) * 2);
    for (let i = 0; i < rows; i++) {
      let z = 0; const e = [];
      for (let j = 0; j <= i; j++) { const v = Math.exp(2.5 * hash2(i + 3, j + 11)); e.push(v); z += v; }
      for (let j = 0; j < n; j++) {
        const a = j <= i ? e[j] / z : 0;
        rect(ctx, x0 + j * cs, y0 + i * cs, cs - 3, cs - 3, { fill: j <= i ? `rgba(255,${120 + 100 * a | 0},${20 + 60 * a | 0},${0.15 + 0.85 * Math.min(1, a * 3)})` : 'rgba(40,20,10,0.5)' });
      }
    }
    text(ctx, 'softmax( QKᵀ / √d  +  M_causal )', W / 2, y0 - 30, { size: 30, family: F.mono, color: C.orange, align: 'center' });
    // beat words, then 16th-note stutter into the chorus
    const words = ['Q', 'K', 'V', 'SOFTMAX', '∇θ', 'ℒ', 'BACKPROP', 'GO'];
    const w = words[Math.min(words.length - 1, beat)];
    const lt = t % BEAT;
    if (lt < 0.1 || beat >= 6) {
      const k = beat >= 6 ? Math.floor(t / (BEAT / 4)) : 0;
      if (beat < 6 || k % 2 === 0) {
        bg(ctx, k % 4 === 0 ? '#fff' : '#000');
        text(ctx, beat >= 6 ? ['勾', '配', 'に', 'な', 'れ', '！', '！', '！'][k % 8] : w, W / 2, H / 2 + 120, { size: 340, family: beat >= 6 ? F.mincho : F.serif, weight: 900, color: k % 4 === 0 && beat >= 6 ? '#000' : '#fff', align: 'center', sx: 0.85 });
      }
    }
    fx.bloom = 0.7; fx.scan = 0.05; fx.ca = 0.4 + 0.8 * punch(t); fx.flash = E.inExpo(seg(t, BAR * 1.85, BAR * 2)) * 0.9;
  }

  // ── chorus 1: launch (forward pass as the catapult rail) ───────────────────
  function sLaunch(ctx, t, fx) {
    const bar = Math.floor(t / BAR), lt = t - bar * BAR;
    bg(ctx, '#040109');
    const PUR = C.purple, GRN = C.e01green;
    if (bar < 2) {
      // shaft: rings rushing past
      const speed = 5 + bar * 3;
      for (let i = 0; i < 24; i++) {
        const z = ((i - t * speed) % 24 + 24) % 24 + 0.3;
        const k = 1 / z;
        const w = 1500 * k, h = 900 * k;
        rect(ctx, W / 2 - w / 2, H / 2 - h / 2, w, h, { stroke: i % 3 ? PUR : GRN, lw: Math.max(1, 6 * k), alpha: clamp(1.4 - z / 16) });
        if (i % 2 === 0) text(ctx, `L${pad((i / 2 | 0) + 1)}`, W / 2 - w / 2 + 10 * k, H / 2 - h / 2 + 50 * k, { size: 60 * k, family: F.mono, color: GRN, alpha: clamp(1.2 - z / 12) });
      }
      for (let i = 0; i < 60; i++) {                   // speed streaks
        const a = hash1(i) * Math.PI * 2, r0 = ((hash1(i + 9) * 900 + t * 1400) % 900) + 100;
        line(ctx, W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0, W / 2 + Math.cos(a) * (r0 + 80), H / 2 + Math.sin(a) * (r0 + 80), '#d9c8ff', 2, 0.5);
      }
      dot(ctx, W / 2, H / 2, 16 + 8 * punch(t), '#ffffff');
      if (bar === 0) {
        text(ctx, 'EVA-01', W / 2, 220, { size: 110, family: F.serif, weight: 700, color: '#ffffff', align: 'center', ls: 24 });
        text(ctx, 'FORWARD PASS // LAYER 01 → 12', W / 2, 280, { size: 28, family: F.cond, weight: 800, color: GRN, align: 'center', ls: 8 });
      } else {
        text(ctx, '発進！', W / 2, H / 2 + 150, { size: 380, family: F.mincho, weight: 900, color: '#ffffff', align: 'center', stroke: PUR, strokeW: 14, alpha: lt < BEAT * 2 ? 1 : 0.0 });
      }
    } else {
      // side view: the transformer stack lighting up block by block
      const layers = 12, lit = Math.floor(lt / (BAR / 12)) + (bar - 2) * 12;
      for (let i = 0; i < layers; i++) {
        const y = H - 120 - i * 70;
        const on = i <= lit % 13;
        rect(ctx, 560, y - 50, 800, 56, { fill: on ? 'rgba(138,77,255,0.45)' : 'rgba(30,15,50,0.8)', stroke: on ? GRN : PUR, lw: 2 });
        text(ctx, `BLOCK ${pad(i + 1)}   attn · mlp · +x`, 590, y - 14, { size: 24, family: F.mono, color: on ? '#fff' : PUR });
      }
      const top = H - 120 - Math.min(11, lit % 13) * 70;
      dot(ctx, 960 + 440, top - 22, 14, '#ffffff');
      for (let k = 0; k < 8; k++) line(ctx, 1400, top - 22 + k * 30, 1400, top + k * 30, GRN, 3, 0.6 - k * 0.07);
      text(ctx, bar === 3 ? 'LIFT-OFF' : '射出', 1560, 500, { size: bar === 3 ? 96 : 150, family: bar === 3 ? F.serif : F.mincho, weight: 900, color: '#fff', ls: bar === 3 ? 10 : 0 });
      text(ctx, 'EVANGELION UNIT-01', 1560, 560, { size: 26, family: F.cond, weight: 800, color: GRN, ls: 8 });
    }
    if (lt < 0.07) fx.flash = 0.7;
    fx.bloom = 0.9; fx.scan = 0.05; fx.ca = 0.4 + 0.8 * punch(t); fx.vig = 0.65;
  }

  // ── chorus 2: battle — the AT field, the beam, the Lance ──────────────────
  function sBattle(ctx, t, fx) {
    const bar = Math.floor(t / BAR), lt = t - bar * BAR;
    bg(ctx, '#01040a');
    radial(ctx, 1400, 500, 900, 'rgba(40,110,255,0.25)', 'rgba(0,0,0,0)');
    hexGrid(ctx, 0, 0, W, H, 60, C.cyan, 0.04);
    const shake = bar === 1 || bar === 3 ? (hash1(Math.floor(t * 30)) - 0.5) * 18 : 0;
    ctx.save(); ctx.translate(shake, shake * 0.6);
    const alive = !(bar === 3 && lt > BEAT * 0.5);
    if (alive) octahedron(ctx, 1450, 500, 250 + 40 * (bar === 0 ? E.inCubic(lt / BAR) : 0), t * (bar === 0 ? 1 + 3 * lt : 1.5), { lw: 3 });
    atField(ctx, 560, 540, 330 + (bar === 1 ? 40 * punch(t, 4) : 0), t * (bar === 1 ? 3 : 1), 1);
    if (bar === 1) {                                        // the beam
      const k = 0.7 + 0.3 * Math.sin(t * 50);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, 470, 0, 610);
      g.addColorStop(0, 'rgba(80,160,255,0)'); g.addColorStop(0.5, `rgba(220,240,255,${k})`); g.addColorStop(1, 'rgba(80,160,255,0)');
      ctx.fillStyle = g; ctx.fillRect(700, 470, 750, 140);
      ctx.restore();
      text(ctx, 'ATフィールド、全開！', W / 2, 900, { size: 88, family: F.mincho, weight: 900, color: '#fff', align: 'center', stroke: 'rgba(0,0,0,0.8)', strokeW: 10 });
      text(ctx, 'weight_decay = 0.1   dropout = 0.1', W / 2, 960, { size: 28, family: F.mono, color: C.orange, align: 'center' });
    }
    if (bar === 0) text(ctx, 'PATTERN BLUE', 1450, 900, { size: 64, family: F.cond, weight: 800, color: '#bfe0ff', align: 'center', ls: 14, alpha: flick(t, 12, 0.75) ? 1 : 0.2 });
    if (bar === 2) {                                        // the Lance of Longinus
      const u = E.inCubic(clamp(lt / (BAR * 0.9)));
      const x = lerp(-300, 1450, u), y = lerp(820, 500, u);
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.18);
      line(ctx, -700, 0, 0, 0, '#ff3b3b', 10, 1);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(120, -10, 170, -40, 260, -60); ctx.moveTo(0, 0); ctx.bezierCurveTo(120, 10, 170, 40, 260, 60);
      ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 9; ctx.stroke();
      ctx.restore();
      text(ctx, 'ロンギヌスの槍', 140, 170, { size: 70, family: F.mincho, weight: 900, color: '#fff' });
      text(ctx, 'clip_grad_norm_(θ, max_norm=1.0)', 140, 230, { size: 32, family: F.mono, color: C.red });
    }
    ctx.restore();
    if (bar === 3) {
      const k = 1 - seg(lt, BEAT * 0.5, BAR);
      crossLight(ctx, 1450, 680, lt < BEAT * 0.5 ? lt / (BEAT * 0.5) : k);
      if (lt > BEAT) text(ctx, 'NEUTRALIZED', 1450, 950, { size: 60, family: F.cond, weight: 800, color: '#fff', align: 'center', ls: 16, alpha: seg(lt, BEAT, BEAT * 1.5) });
    }
    if (lt < 0.07) fx.flash = 0.6;
    if (bar === 3 && lt > BEAT * 0.45 && lt < BEAT * 0.55) { fx.flash = 1; }
    fx.bloom = 0.9; fx.scan = 0.06; fx.ca = 0.4 + 0.9 * punch(t); fx.vig = 0.65; fx.glitch = bar === 1 ? 0.15 : 0;
  }

  // ── chorus 3: descent over the loss landscape ─────────────────────────────
  function sDescent(ctx, t, fx) {
    const bar = Math.floor(t / BAR), lt = t - bar * BAR;
    bg(ctx, '#030100');
    radial(ctx, W / 2, 300, 1100, 'rgba(255,120,20,0.18)', 'rgba(0,0,0,0)');
    const prog = seg(t, 0, BAR * 4);
    const v = landscape(ctx, t, W / 2, H / 2 + 170, 240, 0.4 + t * 0.12, 0.5 + 0.08 * Math.sin(t * 0.4), prog, { persp: 11 });
    text(ctx, `ℒ(θ) = ${v.toFixed(4)}`, 120, 150, { size: 44, family: F.mono, color: C.amber });
    text(ctx, `step ${Math.floor(prog * 160)} / 160     η = 0.12`, 120, 200, { size: 26, family: F.mono, color: C.orange });
    const K = ['勾', '配', '降', '下'];
    if (lt < 0.18) {
      bg(ctx, bar % 2 ? '#fff' : '#000');
      text(ctx, K[bar], W / 2, H / 2 + 150, { size: 440, family: F.mincho, weight: 900, color: bar % 2 ? '#000' : '#fff', align: 'center' });
      fx.bloom = bar % 2 ? 0 : 0.4;
    } else {
      text(ctx, K.slice(0, bar + 1).join(''), W - 120, 190, { size: 120, family: F.mincho, weight: 900, color: '#fff', align: 'right', alpha: 0.9 });
      fx.bloom = 0.85;
    }
    fx.scan = 0.05; fx.ca = 0.3 + 0.7 * punch(t); fx.vig = 0.6;
  }

  // ── chorus 4: climax montage, 8 cuts with single-frame inserts ────────────
  function lclBg(ctx, t) {
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H / 2, 1100);
    g.addColorStop(0, '#ff9636'); g.addColorStop(0.45, '#e5560a'); g.addColorStop(1, '#4a0c00');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const x = (i / 60) * W, y = (k / 6) * H + 80 + Math.sin(i * 0.3 + t * 2 + k) * 40; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.strokeStyle = 'rgba(255,220,160,0.12)'; ctx.lineWidth = 10; ctx.stroke();
    }
  }
  function collapseViz(ctx, t, u) {
    bg(ctx, '#040302');
    for (let i = 0; i < 60; i++) {
      const a = hash1(i) * Math.PI * 2 + u * 3, r = (120 + hash1(i + 5) * 380) * Math.pow(1 - u, 2.2);
      const x = W / 2 + Math.cos(a) * r, y = H / 2 + Math.sin(a) * r * 0.7;
      poly(ctx, octPts(x, y, 26 * (1 - u)), { stroke: C.orange, lw: 1.5, alpha: 0.6 * (1 - u) });
      dot(ctx, x, y, 4, i < 8 ? '#fff' : C.amber);
    }
    text(ctx, `rank(X) = ${Math.max(1, Math.round(24 * Math.pow(1 - u, 3)))}`, W / 2, 940, { size: 56, family: F.mono, color: u > 0.8 ? C.red : '#fff', align: 'center' });
  }
  function sClimax(ctx, t, fx) {
    const cut = Math.floor(t / (BAR / 2)), lt = t - cut * (BAR / 2);
    const f = Math.floor(lt * FPS);
    if (f < 2 && cut > 0) {                               // single-frame insert between cuts
      const ins = ['神', '経', '網', '勾', '配', '補', '完', '！'];
      bg(ctx, cut % 2 ? '#fff' : '#b3001b');
      text(ctx, ins[cut % 8], W / 2, H / 2 + 150, { size: 460, family: F.mincho, weight: 900, color: cut % 2 ? '#000' : '#fff', align: 'center' });
      fx.bloom = 0; fx.ca = 1.2; fx.scan = 0;
      return;
    }
    ctx.save(); zoom(ctx, 1.05 - 0.05 * E.outCubic(clamp(lt / 0.4)) + 0.02 * punch(t));
    switch (cut) {
      case 0: bg(ctx, '#050101'); tree3d(ctx, t, W / 2, H / 2 + 20, 112, 0.6 * Math.sin(t * 2.4), C.red); break;
      case 1: {
        bg(ctx, '#030201');
        const n = 24, cs = 36, x0 = W / 2 - 432, y0 = H / 2 - 432;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          const a = j <= i ? Math.pow(hash2(i + Math.floor(t * 8), j), 3) : 0;
          rect(ctx, x0 + j * cs, y0 + i * cs, cs - 2, cs - 2, { fill: `rgba(255,${130 + 110 * a | 0},40,${0.08 + 0.92 * a})` });
        }
        break;
      }
      case 2: magiFlash(ctx, t, Math.floor(t / (BEAT / 2))); break;
      case 3: lclBg(ctx, t); text(ctx, 'LCL', W / 2, H / 2 + 80, { size: 260, family: F.serif, weight: 700, color: 'rgba(255,235,200,0.85)', align: 'center', ls: 40 }); break;
      case 4: collapseViz(ctx, t, clamp(lt / (BAR / 2))); break;
      case 5: bg(ctx, '#05030a'); octahedron(ctx, W / 2, H / 2 - 60, 200, t * 2, {}); crossLight(ctx, W / 2, H / 2 + 120, 1 - clamp(lt / (BAR / 2)) * 0.6); break;
      case 6: {
        bg(ctx, '#020203');
        for (let k = 0; k < 8; k++) {
          const s = Math.pow(2, ((k + lt * 3) % 8) - 2);
          ctx.save(); zoom(ctx, s); hexGrid(ctx, 0, 0, W, H, 60, k % 2 ? C.orange : C.red, 0.12); ctx.restore();
        }
        text(ctx, 'ATTENTION IS NOT ALL YOU NEED', W / 2, H / 2 + 20, { size: 70, family: F.serif, weight: 700, color: '#fff', align: 'center', ls: 6 });
        break;
      }
      default: {
        const k = Math.floor(lt / (BEAT / 4));
        const s = ['少', '年', 'よ', '勾', '配', 'に', 'な', 'れ'][k % 8];
        bg(ctx, k % 2 ? '#fff' : '#000');
        text(ctx, s, W / 2, H / 2 + 150, { size: 440, family: F.mincho, weight: 900, color: k % 2 ? '#000' : '#fff', align: 'center' });
      }
    }
    ctx.restore();
    fx.bloom = cut === 3 ? 0.35 : 0.85; fx.thr = cut === 3 ? 0.82 : 0.55; fx.scan = 0.05; fx.ca = 0.5 + 0.9 * punch(t); fx.vig = 0.6;
    fx.flash = E.inExpo(seg(t, BAR * 3.85, BAR * 4)) * 0.95;
  }

  // ── outro: lineup at dusk, then the logo ─────────────────────────────────
  const LINE = [['シンジ', 'Q'], ['レイ', 'K'], ['アスカ', 'V'], ['カヲル', '+'], ['ミサト', 'η'], ['ゲンドウ', 'ℒ'], ['リツコ', '∇'], ['ペンペン', 'p']];
  function sLineup(ctx, t, fx) {
    horizon(ctx, t, { sky0: '#1a0b26', sky1: '#ff7a3a', sea0: '#5a2410', hy: 700, line: 'rgba(255,190,140,0.2)', hline: '#ffd2a0' });
    glowPoint(ctx, W / 2, 712, 110, '255,190,130');
    const pull = 1.12 - 0.12 * E.outCubic(seg(t, 0, BAR * 2));
    ctx.save(); zoom(ctx, pull, W / 2, 700);
    LINE.forEach(([n, s], i) => {
      const x = 260 + i * 200, y = 560 - (i % 2) * 18;
      const a = seg(t, i * 0.12, i * 0.12 + 0.3);
      ctx.save(); ctx.globalAlpha = a;
      atField(ctx, x, y, 70, t + i * 0.3, 0.8, '#ffb070');
      dot(ctx, x, y, 12, '#fff');
      text(ctx, s, x, y - 90, { size: 60, family: F.serif, weight: 700, color: '#fff', align: 'center' });
      text(ctx, n, x, y + 120, { size: 34, family: F.mincho, weight: 900, color: '#fff', align: 'center', stroke: 'rgba(40,10,0,0.6)', strokeW: 6 });
      ctx.restore();
    });
    ctx.restore();
    credit(ctx, t, BAR * 0.5, BAR * 1.95, '制作', 'Claude', 'br');
    fx.bloom = 0.6; fx.thr = 0.7; fx.scan = 0.03; fx.vig = 0.6; fx.ca = 0.25;
    if (Math.floor(t * FPS) < 2) fx.flash = 0.8;
  }
  function logo(ctx, t, parts, invert = false, a = 1) {
    const col = invert ? '#000' : '#fbfaf5';
    ctx.save(); ctx.globalAlpha = a;
    if (parts > 0) text(ctx, '新世紀', 262, 318, { size: 128, family: F.mincho, weight: 900, color: col, sx: 0.92 });
    if (parts > 3) text(ctx, 'NEON GENESIS', 700, 318, { size: 60, family: F.serif, weight: 700, color: col, ls: 8, sx: 0.9 });
    if (parts > 1) text(ctx, '勾配', 250, 650, { size: 330, family: F.mincho, weight: 900, color: col, sx: 0.86, sy: 1.05 });
    if (parts > 2) text(ctx, '降下', 848, 650, { size: 330, family: F.mincho, weight: 900, color: col, sx: 0.86, sy: 1.05 });
    if (parts > 4) { text(ctx, 'GRADIENT', 1450, 540, { size: 124, family: F.serif, weight: 700, color: col, sx: 0.56, ls: 1 }); text(ctx, 'DESCENT', 1450, 650, { size: 124, family: F.serif, weight: 700, color: col, sx: 0.56, ls: 1 }); }
    if (parts > 5) { line(ctx, 262, 740, 1720, 740, invert ? '#000' : '#fbfaf5', 3); text(ctx, 'OPENING  —  残酷な勾配のテーゼ', 262, 800, { size: 34, family: F.cond, weight: 700, color: invert ? '#b3001b' : C.orange, ls: 9 }); }
    ctx.restore();
  }
  function sLogo(ctx, t, fx) {
    bg(ctx, '#000');
    if (t < BAR * 2) {
      const parts = Math.min(5, Math.floor(t / (BEAT * 1.5)) + 1);
      const lt = t % (BEAT * 1.5);
      logo(ctx, t, parts, false, lt < 0.05 ? 0.4 : 1);
      if (lt < 0.07) fx.flash = 0.35;
    } else {
      const lt = t - BAR * 2;
      const f = Math.floor(lt * FPS);
      if (f < 3) { bg(ctx, '#fbfaf5'); logo(ctx, t, 6, true); fx.bloom = 0; }
      else {
        const push = 1 + 0.03 * E.outCubic(seg(lt, 0, BAR * 2));
        ctx.save(); zoom(ctx, push); logo(ctx, t, 6, false, 1 - seg(lt, BAR * 1.2, BAR * 2)); ctx.restore();
        fx.bloom = 0.25;
      }
    }
    fx.scan = 0; fx.grain = 0.07; fx.ca = 0.2 + 0.6 * punch(t); fx.vig = 0.5;
  }

  const SEQ = [['op_intro', 4, sIntro], ['op_title', 1, sTitle], ['op_riff', 3, sRiff], ['op_verse', 8, sVerse], ['op_pre', 6, sPre],
    ['op_build', 2, sBuild], ['op_launch', 4, sLaunch], ['op_battle', 4, sBattle], ['op_descent', 4, sDescent], ['op_climax', 4, sClimax],
    ['op_lineup', 2, sLineup], ['op_logo', 4, sLogo]];
  SEQ.forEach(([name, bars, fn]) => SCENES.push({
    name, dur: bars * BAR,
    draw(ctx, t, fx) { fn(ctx, t, fx); },
    cues() {
      const c = [];
      if (name === 'op_title') TFLASH.reduce((acc, card) => { c.push({ t: acc / FPS, type: 'flash' }); return acc + card[3]; }, 0);
      if (name === 'op_riff') for (let k = 0; k < 4; k++) c.push({ t: BAR * 2 + BEAT * 2 + k * BEAT / 2, type: 'flash' });
      if (name === 'op_verse' || name === 'op_pre') for (let k = 0; k < bars / 2; k++) c.push({ t: k * 2 * BAR, type: 'blip' });
      if (name === 'op_build') for (let k = 0; k < 6; k++) c.push({ t: k * BEAT, type: 'flash' });
      if (name === 'op_launch') c.push({ t: 0.0, type: 'launch' });
      if (name === 'op_battle') c.push({ t: BAR, type: 'beam' }, { t: BAR * 3 + BEAT * 0.5, type: 'cross' });
      if (name === 'op_descent') for (let k = 0; k < 4; k++) c.push({ t: k * BAR, type: 'flash' });
      if (name === 'op_climax') for (let k = 1; k < 8; k++) c.push({ t: k * BAR / 2, type: 'flash' });
      if (name === 'op_climax') c.push({ t: BAR * 2.5, type: 'cross' });
      if (name === 'op_logo') for (let k = 0; k < 5; k++) c.push({ t: k * BEAT * 1.5, type: 'flash' });
      return c;
    },
  }));
})();
