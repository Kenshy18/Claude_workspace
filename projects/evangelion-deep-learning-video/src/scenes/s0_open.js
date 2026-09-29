// ── SCENE 0 · cold open: MAGI boot log + Sephirot as a computation graph ─────
(() => {
  // Tree of Life layout (10 sephirot, 22 paths) — the oldest "network diagram".
  const NODES = [
    ['KETHER', 0, 0], ['CHOKMAH', 1, 0.8], ['BINAH', -1, 0.8],
    ['CHESED', 1, 2.3], ['GEBURAH', -1, 2.3], ['TIPHARETH', 0, 3.1],
    ['NETZACH', 1, 4.4], ['HOD', -1, 4.4], ['YESOD', 0, 5.2], ['MALKUTH', 0, 6.5],
  ];
  const PATHS = [[0, 1], [0, 2], [0, 5], [1, 2], [1, 5], [1, 3], [2, 5], [2, 4], [3, 4], [3, 5], [3, 6],
    [4, 5], [4, 7], [5, 6], [5, 8], [5, 7], [6, 7], [6, 8], [6, 9], [7, 8], [7, 9], [8, 9]];
  const LAYER = ['embed', 'attn.q', 'attn.k', 'mlp.up', 'mlp.gate', 'residual', 'attn.o', 'norm', 'lm_head', 'loss'];

  const LOG = [
    ['>', 'MAGI-OS 3.0 // cold boot', 0.0],
    ['OK', 'cuda: 2048 x H200 visible, HBM3e 141GB/dev', 0.25],
    ['OK', 'nccl: ring all-reduce up  (world_size=2048)', 0.5],
    ['OK', 'ckpt: lilith-base-70b.safetensors  [##########]', 0.8],
    ['OK', 'tokenizer: 128k BPE  //  ctx 131072', 1.1],
    ['OK', 'optimizer: ADAM (b1=0.9, b2=0.95)  // the first angel', 1.35],
    ['WARN', 'grad_norm spike @ step 3 -> clipped (max_norm=1.0)', 1.65],
    ['OK', 'lr: warmup 2000 -> cosine  //  bf16  //  FSDP', 1.9],
    ['>', 'python train.py --project=INSTRUMENTALITY', 2.25],
  ];

  function tree(ctx, t, cx, cy, sc, a) {
    const P = NODES.map(([n, x, y]) => [cx + x * sc * 1.45, cy + (y - 3.25) * sc]);
    ctx.save();
    ctx.globalAlpha *= a;
    // paths draw in
    PATHS.forEach(([i, j], k) => {
      const p = E.outCubic(seg(t, 0.2 + k * 0.05, 0.9 + k * 0.05));
      if (p <= 0) return;
      const [x1, y1] = P[i], [x2, y2] = P[j];
      line(ctx, x1, y1, lerp(x1, x2, p), lerp(y1, y2, p), C.red, 2.2, 0.75);
      line(ctx, x1, y1, lerp(x1, x2, p), lerp(y1, y2, p), '#ff8f6a', 0.8, 0.9);
    });
    // forward (orange, down) and backward (cyan, up) pulses
    const fwd = t - 1.4, bwd = t - 2.6;
    PATHS.forEach(([i, j], k) => {
      const [x1, y1] = P[i], [x2, y2] = P[j];
      if (fwd > 0) {
        const u = ((fwd * 0.9 + k * 0.13) % 1.2);
        if (u < 1) dot(ctx, lerp(x1, x2, u), lerp(y1, y2, u), 4, C.amber, 0.95);
      }
      if (bwd > 0) {
        const u = ((bwd * 1.1 + k * 0.29) % 1.3);
        if (u < 1) dot(ctx, lerp(x2, x1, u), lerp(y2, y1, u), 3.5, C.cyan, 0.9);
      }
    });
    // nodes
    P.forEach(([x, y], i) => {
      const p = E.outBack(seg(t, 0.1 + i * 0.07, 0.5 + i * 0.07));
      if (p <= 0) return;
      const r = 30 * p;
      dot(ctx, x, y, r, '#140504', 1);
      ring(ctx, x, y, r, C.red, 3, 1);
      ring(ctx, x, y, r - 7, '#ff7a55', 1, 0.8);
      const act = 0.5 + 0.5 * Math.sin(t * 5 + i * 1.7);
      dot(ctx, x, y, 9 * p * (0.6 + 0.4 * act), C.amber, 0.9);
      const side = NODES[i][1] < 0 ? -1 : 1;
      const lx = x + side * (r + 14) * (NODES[i][1] === 0 ? 1 : 1);
      const al = NODES[i][1] === 0 ? 'left' : (side < 0 ? 'right' : 'left');
      text(ctx, NODES[i][0], NODES[i][1] === 0 ? x + r + 14 : lx, y - 4, { size: 17, family: F.cond, weight: 700, color: C.red, align: al, ls: 3, alpha: 0.9 * seg(t, 0.8, 1.4) });
      text(ctx, LAYER[i] + '  ' + (act * 2 - 1).toFixed(3), NODES[i][1] === 0 ? x + r + 14 : lx, y + 16, { size: 15, family: F.mono, color: C.orange, align: al, alpha: 0.7 * seg(t, 1.0, 1.6) });
    });
    ctx.restore();
  }

  function boot(ctx, t, fx) {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    hexGrid(ctx, 0, 0, W, H, 46, C.orange, 0.05 * seg(t, 0.2, 1.5));
    hudChrome(ctx, t, { alpha: seg(t, 0.3, 0.8), left: 'MAGI-OS // BOOT SEQUENCE', center: 'PROJECT: INSTRUMENTALITY', status: 'INITIALIZING' });
    // terminal
    const x0 = 110, y0 = 250;
    panel(ctx, x0 - 30, y0 - 70, 900, 560, { p: seg(t, 0.1, 0.8), label: 'TERMINAL', sub: 'tty0 // root@magi', id: '01' });
    LOG.forEach(([tag, msg, at], i) => {
      const tt = t - 0.5 - at;
      if (tt < 0) return;
      const y = y0 + i * 54;
      const col = tag === 'WARN' ? C.red : tag === '>' ? C.amber : C.orange;
      if (tag !== '>') text(ctx, `[${tag.padStart(4)}]`, x0, y, { size: 24, family: F.mono, color: tag === 'OK' ? C.green : col });
      const str = typed(msg, tt / 0.22);
      text(ctx, (tag === '>' ? '> ' : '') + str, x0 + (tag === '>' ? 0 : 110), y, { size: 24, family: F.mono, color: col });
      if (i === LOG.length - 1 && blink(t, 0.4)) {
        const w = measure(ctx, '> ' + str, { size: 24, family: F.mono });
        rect(ctx, x0 + w + 4, y - 20, 13, 24, { fill: C.amber });
      }
    });
    tree(ctx, t, 1430, 560, 118, seg(t, 0.2, 1.0));
    fx.scan = 0.12; fx.bloom = 1.0; fx.ca = 0.35; fx.vig = 0.7;
  }

  // rapid intertitle flashes (each ~5 frames)
  const FLASH = [
    ['神経', 'NEURAL', false], ['回路', 'CIRCUIT', true], ['勾配', 'GRADIENT', false], ['降下', 'DESCENT', true],
    ['補完', 'COMPLEMENT', false], ['計画', 'PROJECT', true],
  ];
  function flashes(ctx, t, fx) {
    const i = Math.min(FLASH.length - 1, Math.floor(t / (1.0 / FLASH.length)));
    const [jp, en, inv] = FLASH[i];
    ctx.fillStyle = inv ? '#f5f3ec' : '#000'; ctx.fillRect(0, 0, W, H);
    const col = inv ? '#000' : '#f5f3ec';
    text(ctx, jp, W / 2, H / 2 + 110, { size: 330, family: F.mincho, weight: 900, color: col, align: 'center', sx: i % 2 ? 1.25 : 0.8, sy: i % 2 ? 0.8 : 1.12 });
    text(ctx, en, W / 2, H / 2 + 250, { size: 44, family: F.serif, weight: 700, color: col, align: 'center', ls: 18 });
    fx.grain = 0.09; fx.scan = 0; fx.ca = 0.6; fx.bloom = inv ? 0.0 : 0.35; fx.vig = inv ? 0.25 : 0.55;
  }

  function mainTitle(ctx, t, fx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const f = Math.floor(t * FPS);
    if (f < 1) return;
    const push = 1 + 0.03 * E.outCubic(seg(t, 0, 4.3));
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);
    ctx.globalAlpha = f === 1 ? 0.4 : 1;
    const col = '#fbfaf5';
    text(ctx, '新世紀', 262, 318, { size: 128, family: F.mincho, weight: 900, color: col, sx: 0.92 });
    text(ctx, '勾配', 250, 650, { size: 330, family: F.mincho, weight: 900, color: col, sx: 0.86, sy: 1.05 });
    text(ctx, '降下', 848, 650, { size: 330, family: F.mincho, weight: 900, color: col, sx: 0.86, sy: 1.05 });
    text(ctx, 'NEON GENESIS', 700, 318, { size: 60, family: F.serif, weight: 700, color: col, ls: 8, sx: 0.9 });
    text(ctx, 'GRADIENT', 1450, 540, { size: 124, family: F.serif, weight: 700, color: col, sx: 0.56, ls: 1 });
    text(ctx, 'DESCENT', 1450, 650, { size: 124, family: F.serif, weight: 700, color: col, sx: 0.56, ls: 1 });
    line(ctx, 262, 740, 1720, 740, col, 3, E.outExpo(seg(t, 0.6, 1.6)));
    const sub = 'A DEEP LEARNING  ×  EVANGELION  TRIBUTE';
    text(ctx, scramble(sub, seg(t, 1.0, 2.2), 5), 262, 800, { size: 34, family: F.cond, weight: 700, color: C.orange, ls: 9 });
    text(ctx, '∇θ ℒ(θ) → 0', 1720, 800, { size: 34, family: F.mono, color: '#bcb6aa', align: 'right', alpha: seg(t, 1.6, 2.4) });
    ctx.restore();
    fx.scan = 0; fx.grain = 0.07; fx.ca = 0.2; fx.bloom = 0.25; fx.vig = 0.5;
    fx.flash = 0.9 * (1 - seg(t, 0, 0.35));
  }

  SCENES.push({
    name: 'open', dur: 9.5,
    draw(ctx, t, fx) {
      if (t < 4.2) boot(ctx, t, fx);
      else if (t < 5.2) flashes(ctx, t - 4.2, fx);
      else mainTitle(ctx, t - 5.2, fx);
    },
    cues() {
      const c = [{ t: 0.0, type: 'drone_in' }];
      LOG.forEach(([tag, , at]) => c.push({ t: 0.5 + at, type: tag === 'WARN' ? 'blip_warn' : 'blip' }));
      FLASH.forEach((_, i) => c.push({ t: 4.2 + i / FLASH.length, type: 'flash_hit', i }));
      c.push({ t: 5.2, type: 'title_boom' });
      return c;
    },
  });
})();
