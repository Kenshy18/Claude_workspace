// ─────────────────────────────────────────────────────────────────────────────
//  NEON GENESIS GRADIENT DESCENT — core drawing kit
//  Every frame is a pure function of time t, so any frame can be rendered
//  independently (parallel workers, deterministic output).
// ─────────────────────────────────────────────────────────────────────────────
const W = 1920, H = 1080, FPS = 30;

const C = {
  bg: '#030405',
  orange: '#ff8a1c',
  amber: '#ffb52e',
  orangeDim: 'rgba(255,138,28,0.35)',
  red: '#ff2436',
  redDeep: '#b3001b',
  green: '#39ff8a',
  cyan: '#44d7ff',
  blue: '#2a6bff',
  white: '#f4f1ea',
  grey: '#8b8f96',
  purple: '#8a4dff',
  e01green: '#8cff3c',
  lcl: '#ff6a00',
};

const F = {
  mincho: '"Noto Serif CJK JP"',
  gothic: '"Noto Sans CJK JP"',
  mono: '"Share Tech Mono", "JetBrains Mono", monospace',
  code: '"JetBrains Mono", monospace',
  cond: '"Barlow Condensed", "Noto Sans CJK JP", sans-serif',
  serif: '"Liberation Serif", "Noto Serif CJK JP", serif',
};

// ── math ────────────────────────────────────────────────────────────────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const invlerp = (a, b, x) => clamp((x - a) / (b - a));
const seg = (t, a, b) => clamp((t - a) / (b - a));           // 0..1 progress in [a,b]
const smooth = (t) => t * t * (3 - 2 * t);
const E = {
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: (t) => t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
// integer hash -> [0,1)
function hash1(n) {
  n = Math.floor(n) | 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = n ^ (n >>> 16);
  return (n >>> 0) / 4294967296;
}
function hash2(a, b) { return hash1(a * 7919 + b * 104729 + 17); }
// smooth value noise
function vnoise(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = hash1(i + seed * 1013), b = hash1(i + 1 + seed * 1013);
  return lerp(a, b, smooth(f));
}
// stepped flicker: true/false at a given rate with duty cycle
function flick(t, rate = 12, duty = 0.5, seed = 0) {
  return hash1(Math.floor(t * rate) + seed * 977) < duty;
}
// blink on/off with fixed period
const blink = (t, period = 0.5, duty = 0.5) => (t % period) / period < duty;

// ── canvas helpers ──────────────────────────────────────────────────────────
function font(size, family = F.cond, weight = 700, style = '') {
  return `${style} ${weight} ${size}px ${family}`.trim();
}

/** Draw text. opts: size, family, weight, color, align, base, sx, sy, ls (letterSpacing px), alpha, stroke, strokeW, style */
function text(ctx, str, x, y, o = {}) {
  ctx.save();
  ctx.font = font(o.size || 24, o.family || F.cond, o.weight ?? 700, o.style || '');
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'alphabetic';
  ctx.letterSpacing = (o.ls || 0) + 'px';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(o.sx || 1, o.sy || 1);
  if (o.stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = o.strokeW || 6;
    ctx.strokeStyle = o.stroke;
    ctx.strokeText(str, 0, 0);
  }
  ctx.fillStyle = o.color || C.white;
  ctx.fillText(str, 0, 0);
  ctx.restore();
}
function measure(ctx, str, o = {}) {
  ctx.save();
  ctx.font = font(o.size || 24, o.family || F.cond, o.weight ?? 700, o.style || '');
  ctx.letterSpacing = (o.ls || 0) + 'px';
  const w = ctx.measureText(str).width * (o.sx || 1);
  ctx.restore();
  return w;
}

const GLYPHS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&@*+=<>/\\|';
/** HUD "decode" effect: random glyphs resolving left→right into the final string. p in [0,1] */
function scramble(str, p, seed = 1) {
  if (p >= 1) return str;
  const n = str.length, out = [];
  const frame = Math.floor(p * 60);
  for (let i = 0; i < n; i++) {
    const reveal = i / n;
    if (p > reveal * 0.8 + 0.2) out.push(str[i]);
    else if (p > reveal * 0.8) out.push(str[i] === ' ' ? ' ' : GLYPHS[Math.floor(hash2(i + seed, frame) * GLYPHS.length)]);
    else out.push(' ');
  }
  return out.join('');
}
/** typewriter substring */
function typed(str, p) {
  const n = Math.floor(clamp(p) * str.length + 1e-6);
  return [...str].slice(0, n).join('');
}

function line(ctx, x1, y1, x2, y2, color, w = 1, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.restore();
}
function rect(ctx, x, y, w, h, o = {}) {
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fillRect(x, y, w, h); }
  if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
  ctx.restore();
}
function poly(ctx, pts, o = {}) {
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  if (o.close !== false) ctx.closePath();
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
  if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 1; ctx.lineJoin = o.join || 'miter'; ctx.stroke(); }
  ctx.restore();
}
function hexPts(cx, cy, r, flat = true) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + (flat ? 0 : Math.PI / 6);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}
function octPts(cx, cy, r, rot = Math.PI / 8) {
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i + rot;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}
/** Hex grid of flat-top hexagons across a rect (pattern cached per radius/colour). */
const HEXCACHE = {};
function hexGrid(ctx, x0, y0, w, h, r, color, alpha = 0.15, lw = 1) {
  if (alpha <= 0) return;
  const key = r + '|' + color + '|' + lw;
  let cv = HEXCACHE[key];
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = Math.ceil(W + 4 * r); cv.height = Math.ceil(H + 4 * r);
    const g = cv.getContext('2d');
    const dx = r * 1.5, dy = r * Math.sqrt(3);
    g.strokeStyle = color; g.lineWidth = lw;
    g.beginPath();
    for (let c = -1; c * dx < cv.width + r; c++) {
      for (let rr = -1; rr * dy < cv.height + r; rr++) {
        const cx = r + c * dx, cy = r + rr * dy + (c % 2 ? dy / 2 : 0);
        const p = hexPts(cx, cy, r * 0.96);
        g.moveTo(p[0][0], p[0][1]);
        for (let i = 1; i < 6; i++) g.lineTo(p[i][0], p[i][1]);
        g.closePath();
      }
    }
    g.stroke();
    HEXCACHE[key] = cv;
  }
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
  ctx.drawImage(cv, x0 - r, y0 - r);
  ctx.restore();
}
/** diagonal hazard stripes inside rect */
function stripes(ctx, x, y, w, h, c1, c2, sw = 24, off = 0) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (c2) { ctx.fillStyle = c2; ctx.fillRect(x, y, w, h); }
  ctx.fillStyle = c1;
  const start = x - h - sw * 2 + ((off % (sw * 2)) + sw * 2) % (sw * 2);
  for (let sx = start; sx < x + w + h; sx += sw * 2) {
    ctx.beginPath();
    ctx.moveTo(sx, y + h); ctx.lineTo(sx + sw, y + h); ctx.lineTo(sx + sw + h, y); ctx.lineTo(sx + h, y);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
/** corner brackets */
function brackets(ctx, x, y, w, h, len, color, lw = 2, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
  ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len);
  ctx.moveTo(x + w, y + h - len); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - len, y + h);
  ctx.moveTo(x + len, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - len);
  ctx.stroke();
  ctx.restore();
}

/**
 * NERV-style HUD panel. Draw-in animation with p∈[0,1].
 * Header tab with label, thin frame, tick marks.
 */
function panel(ctx, x, y, w, h, o = {}) {
  const p = o.p ?? 1;
  if (p <= 0) return;
  const col = o.color || C.orange;
  const a = o.alpha ?? 1;
  ctx.save();
  ctx.globalAlpha *= a;
  // background
  const pb = E.outCubic(seg(p, 0, 0.6));
  if (o.fill !== false) rect(ctx, x, y, w, h * pb, { fill: o.fill || 'rgba(8,6,4,0.72)' });
  // frame lines grow from top-left
  const pw = E.outExpo(seg(p, 0, 0.5)), ph = E.outExpo(seg(p, 0.15, 0.7));
  ctx.strokeStyle = col; ctx.lineWidth = 1.5;
  ctx.globalAlpha *= 0.55;
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + w * pw, y);
  ctx.moveTo(x, y); ctx.lineTo(x, y + h * ph);
  ctx.moveTo(x + w, y + h); ctx.lineTo(x + w - w * pw, y + h);
  ctx.moveTo(x + w, y + h); ctx.lineTo(x + w, y + h - h * ph);
  ctx.stroke();
  ctx.globalAlpha /= 0.55;
  brackets(ctx, x - 4, y - 4, w + 8, h + 8, 16, col, 2, E.outCubic(seg(p, 0.4, 1)));
  // header tab
  if (o.label) {
    const tp = seg(p, 0.3, 0.9);
    const lab = scramble(o.label, tp, o.seed || 3);
    const tw = measure(ctx, o.label, { size: 22, family: F.cond, weight: 700, ls: 3 }) + 34;
    poly(ctx, [[x, y - 30], [x + tw, y - 30], [x + tw + 18, y], [x, y]], { fill: col, alpha: E.outCubic(tp) });
    text(ctx, lab, x + 12, y - 8, { size: 22, family: F.cond, weight: 700, color: '#0a0604', ls: 3 });
    if (o.sub) text(ctx, scramble(o.sub, tp, 9), x + tw + 30, y - 9, { size: 18, family: F.mono, color: col, alpha: 0.8, ls: 1 });
  }
  if (o.id) text(ctx, o.id, x + w - 6, y - 8, { size: 16, family: F.mono, color: col, align: 'right', alpha: 0.7 * E.outCubic(seg(p, 0.5, 1)) });
  // edge ticks
  if (o.ticks !== false) {
    const tpp = E.outCubic(seg(p, 0.5, 1));
    ctx.globalAlpha *= 0.5 * tpp;
    for (let i = 1; i < 20; i++) {
      const yy = y + (h * i) / 20;
      line(ctx, x + w + 6, yy, x + w + (i % 5 === 0 ? 18 : 11), yy, col, 1);
    }
  }
  ctx.restore();
}

/** Screen-wide HUD chrome: top bar, bottom bar, timecode */
function hudChrome(ctx, t, o = {}) {
  const col = o.color || C.orange;
  const a = o.alpha ?? 1;
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  // top line & labels
  line(ctx, 40, 58, W - 40, 58, col, 1, 0.5);
  line(ctx, 40, H - 52, W - 40, H - 52, col, 1, 0.5);
  for (let i = 0; i <= 96; i++) {
    const xx = 40 + ((W - 80) * i) / 96;
    line(ctx, xx, H - 52, xx, H - 52 + (i % 8 === 0 ? 12 : 5), col, 1, 0.5);
  }
  text(ctx, o.left || 'MAGI // NEURAL MONITOR', 40, 46, { size: 22, family: F.cond, weight: 800, color: col, ls: 4 });
  const tc = timecode(o.clock ?? t);
  text(ctx, tc, W - 40, 46, { size: 22, family: F.mono, color: col, align: 'right', ls: 2 });
  if (o.center) text(ctx, o.center, W / 2, 46, { size: 20, family: F.mono, color: col, align: 'center', alpha: 0.75, ls: 3 });
  text(ctx, o.bottomLeft || 'SYS.STATUS  ' + (o.status || 'NOMINAL'), 40, H - 22, { size: 18, family: F.mono, color: col, alpha: 0.8, ls: 2 });
  text(ctx, o.bottomRight || 'GRAD-FLOW  ▮▮▮▮▮▮▯▯', W - 40, H - 22, { size: 18, family: F.mono, color: col, align: 'right', alpha: 0.8, ls: 2 });
  ctx.restore();
}
function timecode(t) {
  const f = Math.floor((t % 1) * FPS), s = Math.floor(t) % 60, m = Math.floor(t / 60);
  const p = (n) => String(n).padStart(2, '0');
  return `T+${p(m)}:${p(s)}:${p(f)}`;
}

// ── plots ───────────────────────────────────────────────────────────────────
/** axes with ticks. returns mapping fns */
function axes(ctx, x, y, w, h, o = {}) {
  const col = o.color || C.orange;
  const p = o.p ?? 1;
  const xmin = o.xmin ?? 0, xmax = o.xmax ?? 1, ymin = o.ymin ?? 0, ymax = o.ymax ?? 1;
  const logy = !!o.logy;
  const ty = (v) => logy ? invlerpRaw(Math.log10(ymin), Math.log10(ymax), Math.log10(Math.max(v, 1e-30))) : invlerpRaw(ymin, ymax, v);
  const X = (v) => x + invlerpRaw(xmin, xmax, v) * w;
  const Y = (v) => y + h - ty(v) * h;
  ctx.save();
  const pa = E.outExpo(p);
  line(ctx, x, y + h, x + w * pa, y + h, col, 1.5, 0.8);
  line(ctx, x, y + h, x, y + h - h * pa, col, 1.5, 0.8);
  // grid
  ctx.globalAlpha *= 0.18 * pa;
  const nx = o.nx ?? 10, ny = o.ny ?? 5;
  for (let i = 1; i <= nx; i++) line(ctx, x + (w * i) / nx, y, x + (w * i) / nx, y + h, col, 1);
  for (let i = 1; i <= ny; i++) line(ctx, x, y + h - (h * i) / ny, x + w, y + h - (h * i) / ny, col, 1);
  ctx.restore();
  if (o.xlabel) text(ctx, o.xlabel, x + w, y + h + 50, { size: 18, family: F.mono, color: col, align: 'right', alpha: 0.8 * pa });
  if (o.ylabel) text(ctx, o.ylabel, x - 12, y - 14, { size: 18, family: F.mono, color: col, alpha: 0.8 * pa });
  if (o.xticks) o.xticks.forEach(([v, s]) => text(ctx, s, X(v), y + h + 24, { size: 16, family: F.mono, color: col, align: 'center', alpha: 0.6 * pa }));
  if (o.yticks) o.yticks.forEach(([v, s]) => text(ctx, s, x - 10, Y(v) + 5, { size: 16, family: F.mono, color: col, align: 'right', alpha: 0.6 * pa }));
  return { X, Y };
}
function invlerpRaw(a, b, x) { return (x - a) / (b - a); }
/** polyline of (x,y) data drawn up to fraction p */
function plotLine(ctx, pts, color, lw = 2.5, p = 1, o = {}) {
  if (pts.length < 2 || p <= 0) return null;
  const n = pts.length;
  const upto = p * (n - 1);
  const k = Math.floor(upto), fr = upto - k;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i <= k; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  let hx = pts[k][0], hy = pts[k][1];
  if (k < n - 1) {
    hx = lerp(pts[k][0], pts[k + 1][0], fr); hy = lerp(pts[k][1], pts[k + 1][1], fr);
    ctx.lineTo(hx, hy);
  }
  ctx.stroke();
  if (o.fillTo !== undefined) {
    ctx.lineTo(hx, o.fillTo); ctx.lineTo(pts[0][0], o.fillTo); ctx.closePath();
    ctx.globalAlpha *= o.fillAlpha ?? 0.12; ctx.fillStyle = color; ctx.fill();
  }
  ctx.restore();
  return [hx, hy];
}
function dot(ctx, x, y, r, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function ring(ctx, x, y, r, color, lw = 1.5, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}

// ── formulas (MathJax SVG, preloaded into Image objects per color) ─────────
const FORMULA_IMG = {};
function formulaKey(k, color) { return k + '|' + color; }
async function preloadFormulas(list) {
  const jobs = [];
  for (const [k, color] of list) {
    const key = formulaKey(k, color);
    if (FORMULA_IMG[key]) continue;
    const f = window.FORMULAS[k];
    const svg = f.svg.replaceAll('currentColor', color);
    const img = new Image();
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    FORMULA_IMG[key] = { img, w: f.w, h: f.h };
    jobs.push(new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; }));
  }
  await Promise.all(jobs);
}
/** draw formula with its height = hpx (MathJax box height incl. depth). align: left|center|right. reveal: wipe 0..1 */
const FORMULA_RASTER = {};
function formula(ctx, k, x, y, hpx, color, o = {}) {
  const f = FORMULA_IMG[formulaKey(k, color)];
  if (!f) { console.warn('formula not preloaded', k, color); return 0; }
  const scale = hpx / f.h;
  const w = f.w * scale;
  let dx = x;
  if (o.align === 'center') dx = x - w / 2;
  else if (o.align === 'right') dx = x - w;
  const rv = o.reveal ?? 1;
  if (rv <= 0) return w;
  const rk = formulaKey(k, color) + '|' + hpx;
  let cv = FORMULA_RASTER[rk];
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = Math.ceil(w) + 4; cv.height = Math.ceil(hpx) + 4;
    cv.getContext('2d').drawImage(f.img, 2, 2, w, hpx);
    FORMULA_RASTER[rk] = cv;
  }
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (rv < 1) { ctx.beginPath(); ctx.rect(dx - 4, y - 10, (w + 8) * rv, hpx + 20); ctx.clip(); }
  ctx.drawImage(cv, dx - 2, y - 2);
  ctx.restore();
  return w;
}
function formulaWidth(k, hpx) { const f = window.FORMULAS[k]; return (f.w * hpx) / f.h; }

// ── Evangelion-style title card ─────────────────────────────────────────────
/**
 * lines: [{s, size, x, y, sx, sy, family, weight, align, ls, color}]
 * The card flickers in over ~3 frames (like a cut with a bad splice), holds, cuts.
 */
function titleCard(ctx, t, dur, lines, o = {}) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  // 2-frame flicker in
  const f = Math.floor(t * FPS);
  if (f === 0) return;               // one black frame
  const a = f === 1 ? 0.35 : 1;
  const push = 1 + 0.018 * (t / dur);  // very slow push-in
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);
  ctx.globalAlpha = a;
  for (const L of lines) {
    if (L.at !== undefined && t < L.at) continue;
    text(ctx, L.s, L.x, L.y, {
      size: L.size, family: L.family || F.mincho, weight: L.weight ?? 900,
      color: L.color || '#fbfbf7', align: L.align || 'left', sx: L.sx || 1, sy: L.sy || 1, ls: L.ls || 0,
    });
  }
  ctx.restore();
}

// ── dialogue caption (JP line + EN line + speaker) ─────────────────────────
function caption(ctx, t, a, b, jp, en, speaker, o = {}) {
  if (t < a || t > b) return;
  const fi = seg(t, a, a + 0.18), fo = 1 - seg(t, b - 0.25, b);
  const al = Math.min(fi, fo);
  const y = o.y ?? H - 122;
  const jpShown = typed(jp, seg(t, a, a + Math.min(0.9, jp.length * 0.05)));
  ctx.save();
  ctx.globalAlpha *= al;
  // soft backing band
  const bw = Math.max(measure(ctx, jp, { size: o.size || 50, family: F.mincho, weight: 700 }), en ? measure(ctx, en, { size: 24, family: F.cond, weight: 500, ls: 1.5 }) : 0) + 160;
  const g = ctx.createLinearGradient(W / 2 - bw / 2, 0, W / 2 + bw / 2, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.15, 'rgba(0,0,0,0.6)'); g.addColorStop(0.85, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  if (o.band !== false) { ctx.fillStyle = g; ctx.fillRect(W / 2 - bw / 2, y - 86, bw, 150); }
  if (speaker) text(ctx, speaker, W / 2, y - 62, { size: 18, family: F.cond, weight: 700, color: o.spColor || C.orange, align: 'center', ls: 6, alpha: 0.9 });
  text(ctx, jpShown, W / 2, y, { size: o.size || 50, family: F.mincho, weight: 700, color: '#fbfaf5', align: 'center', stroke: o.band === false ? 'rgba(60,10,0,0.7)' : 'rgba(0,0,0,0.85)', strokeW: o.band === false ? 9 : 7 });
  if (en) text(ctx, en, W / 2, y + 42, { size: 24, family: F.cond, weight: 500, color: o.band === false ? '#fff3e2' : '#d8d4cc', align: 'center', ls: 1.5, alpha: seg(t, a + 0.25, a + 0.6), stroke: o.band === false ? 'rgba(60,10,0,0.6)' : null, strokeW: 4 });
  ctx.restore();
}

// ── 3D helpers ──────────────────────────────────────────────────────────────
function rot3(p, ax, ay, az) {
  let [x, y, z] = p;
  let c = Math.cos(ax), s = Math.sin(ax);
  [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(ay); s = Math.sin(ay);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(az); s = Math.sin(az);
  [x, y] = [x * c - y * s, x * s + y * c];
  return [x, y, z];
}
function proj(p, cx, cy, f = 900, scale = 1) {
  const z = p[2] + 4;
  const k = (f / (z * 220)) * scale;
  return [cx + p[0] * k * 220, cy + p[1] * k * 220, z];
}

/** Octahedron (a certain crystalline visitor). */
function octahedron(ctx, cx, cy, size, t, o = {}) {
  const V = [[0, -1.35, 0], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1], [0, 1.35, 0]];
  const Fc = [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1], [5, 2, 1], [5, 3, 2], [5, 4, 3], [5, 1, 4]];
  const ay = t * (o.spin ?? 0.9), ax = 0.18 * Math.sin(t * 0.7);
  const P = V.map((v) => { const r = rot3(v, ax, ay, 0); return [cx + r[0] * size, cy + r[1] * size, r[2]]; });
  const faces = Fc.map((f) => ({ f, z: (P[f[0]][2] + P[f[1]][2] + P[f[2]][2]) / 3 })).sort((a, b) => a.z - b.z);
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  for (const { f, z } of faces) {
    const [a, b, c] = f.map((i) => P[i]);
    // flat shading by normal.z
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nz = ux * vy - uy * vx;
    const nlen = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, nz) || 1;
    const lum = 0.35 + 0.65 * Math.abs(nz / nlen);
    const back = nz < 0;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.closePath();
    const base = o.color || [60, 140, 255];
    ctx.fillStyle = `rgba(${base[0] * lum | 0},${base[1] * lum | 0},${Math.min(255, base[2] * lum + 40) | 0},${back ? 0.25 : 0.55})`;
    ctx.fill();
    ctx.strokeStyle = o.edge || 'rgba(170,220,255,0.95)'; ctx.lineWidth = o.lw || 2;
    ctx.stroke();
  }
  ctx.restore();
}

// ── misc ────────────────────────────────────────────────────────────────────
function vignetteRect(ctx, color, a) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore(); }
function fmt(n, d = 2) { return n.toFixed(d); }
function pad(n, w = 2) { return String(n).padStart(w, '0'); }
