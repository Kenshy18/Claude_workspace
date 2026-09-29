// ─────────────────────────────────────────────────────────────────────────────
//  p2_mincho · typographic kit
//  jp()   horizontal Japanese setting with palt-like optical kana spacing
//  vjp()  縦書き: rotated long vowel/brackets, 、。 in the upper-right, small kana offset
//  fml()  MathJax paths drawn as Path2D (any colour, any size, optional emboldening)
//  blade() hand-cut katakana strokes for the title mark
// ─────────────────────────────────────────────────────────────────────────────
const K = {
  ink: '#0a0a0b', black: '#050506', paper: '#f2eee3', white: '#f7f4ec', grey: '#8d8a84',
  red: '#d4141d', redHot: '#e8161f', redDeep: '#7c0a10', redDark: '#3a0508',
  blue: '#1d47ad', blueSky: '#2457c2', blueDeep: '#0b1e5c', blueNight: '#06113a', bluePale: '#9cc3f0',
  orange: '#e8741e', orangeHot: '#f0470f', orangeDeep: '#b8360c', yellow: '#ffe21a', amber: '#ffb31a',
  green: '#3fe07a', greenDeep: '#0b3a1c', teal: '#1c6f6a', pink: '#f2a0b8', plum: '#3a0f2e', purple: '#3b1860',
  eva: '#8cff3c', logoOrange: '#ff5a14', logoRed: '#e0200f',
};
const FM = '"Noto Serif CJK JP"';          // heavy mincho, credits & cards
const FZ = '"Zen Old Mincho"';            // alternate display mincho (900)
const FS = '"Shippori Mincho B1"';        // alternate (800)
const FGc = '"Roboto Condensed"';         // condensed grotesk cards
const FH = '"Liberation Sans"';           // Helvetica-metric grotesk cards
const FR = '"Liberation Serif"';          // Latin serif
const FC = '"Cinzel"';                    // roman capitals
const FE = '"EB Garamond"';               // engraved Latin
const FGo = '"Noto Sans CJK JP"';         // gothic (used sparingly: logos)

function bg(ctx, col) { ctx.fillStyle = col; ctx.fillRect(-40, -40, W + 80, H + 80); }
function withAlpha(ctx, a, fn) { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; fn(); ctx.restore(); }
function pushAt(ctx, s, cx = W / 2, cy = H / 2) { ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); }

// ── metrics ─────────────────────────────────────────────────────────────────
const METRIC = new Map();
function cinfo(ctx, ch, fs, base = 'alphabetic') {
  const k = fs + '|' + base + '|' + ch;
  let m = METRIC.get(k);
  if (!m) {
    ctx.save(); ctx.font = fs; ctx.textBaseline = base; ctx.letterSpacing = '0px';
    const mm = ctx.measureText(ch);
    m = { w: mm.width, l: mm.actualBoundingBoxLeft, r: mm.actualBoundingBoxRight, a: mm.actualBoundingBoxAscent, d: mm.actualBoundingBoxDescent };
    ctx.restore(); METRIC.set(k, m);
  }
  return m;
}
const RX_KANJI = /[㐀-鿿々〆一-鿿]/;
const SMALL_KANA = 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ';
const isKana = (c) => /[ぁ-ゟ゠-ヺヽ-ヿ]/.test(c);
const HALF_PUNCT = '、。，．';
// optical side-bearing corrections (em) where the ink box misstates a kana's visual edge
// [left, right]: negative pulls the neighbour closer. Voiced marks get a little air on the right.
const KERN = { 'イ': [-0.09, 0], 'ィ': [-0.06, 0], 'ト': [0, -0.05], 'ド': [0, -0.02], 'ハ': [-0.02, -0.02],
  'ル': [-0.02, 0], 'レ': [0, -0.04], 'ム': [0, 0], 'ソ': [-0.03, 0], 'ン': [-0.03, 0], 'ツ': [-0.02, 0], 'ッ': [-0.02, 0],
  'う': [0, 0], 'り': [-0.02, -0.02], 'い': [-0.02, -0.02], 'く': [-0.02, -0.02], 'し': [-0.03, -0.02], 'つ': [0, -0.02] };
const DAKU = 'ガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポヴがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ';
const OPENB = '「『（〈《【〔', CLOSEB = '」』）〉》】〕';

/** horizontal JP setting. o: size, family, weight, sx, sy, color, align, track (em), kana (spacing em), alpha, stroke */
function jpLayout(ctx, str, o) {
  const size = Math.min(o.size || 60, MAXPX), fam = o.family || FM, wt = o.weight ?? 900;
  const fs = `${wt} ${size}px ${fam}`;
  const tr = (o.track ?? 0) * size, kpad = (o.kana ?? 0.07) * size;
  const items = []; let x = 0;
  for (const ch of str) {
    const m = cinfo(ctx, ch, fs);
    let adv, dx = 0;
    if (ch === ' ') adv = size * 0.3;
    else if (ch === '　') adv = size;
    else if (isKana(ch) && ch !== 'ー') {
      const ink = m.l + m.r, pad = SMALL_KANA.includes(ch) ? kpad * 0.6 : kpad;
      const kk = KERN[ch], kl = kk ? kk[0] * size : 0, kr = (kk ? kk[1] * size : 0) + (DAKU.includes(ch) ? 0.035 * size : 0);
      adv = ink + 2 * pad + kl + kr; dx = pad + m.l + kl;
    } else if (HALF_PUNCT.includes(ch)) { adv = m.w * 0.55; }
    else if (OPENB.includes(ch)) { adv = m.w * 0.55; dx = -m.w * 0.45; }
    else if (CLOSEB.includes(ch)) { adv = m.w * 0.55; }
    else if (ch === '・') { adv = m.w * 0.6; dx = -m.w * 0.2; }
    else adv = m.w;
    items.push({ ch, x: x + dx }); x += adv + tr;
  }
  return { items, w: (x - tr), fs };
}
function jp(ctx, str, x, y, o = {}) {
  const L = jpLayout(ctx, str, o);
  const k = (o.size || 60) > MAXPX ? (o.size || 60) / MAXPX : 1;
  const sx = (o.sx ?? 0.88) * k, sy = (o.sy ?? 1) * k;
  const wpx = L.w * sx;
  let x0 = x;
  if (o.align === 'center') x0 = x - wpx / 2; else if (o.align === 'right') x0 = x - wpx;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.font = L.fs; ctx.textAlign = 'left'; ctx.textBaseline = o.base || 'alphabetic'; ctx.letterSpacing = '0px';
  ctx.translate(x0, y); ctx.scale(sx, sy);
  if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = (o.strokeW || 4) / k; ctx.strokeStyle = o.stroke; for (const it of L.items) ctx.strokeText(it.ch, it.x, 0); }
  if (!o.outline) { ctx.fillStyle = o.color || K.white; for (const it of L.items) ctx.fillText(it.ch, it.x, 0); }
  ctx.restore();
  return wpx;
}
function jpWidth(ctx, str, o = {}) { const k = (o.size || 60) > MAXPX ? (o.size || 60) / MAXPX : 1; return jpLayout(ctx, str, o).w * (o.sx ?? 0.88) * k; }

/** vertical setting (縦書き). x = column centre, y = top. returns column height */
const VROT = 'ー〜～…‥—―－「」『』（）〈〉《》【】〔〕→';
function vjp(ctx, str, x, y, o = {}) {
  const size = o.size || 60, fam = o.family || FM, wt = o.weight ?? 900;
  const fs = `${wt} ${size}px ${fam}`;
  const sx = o.sx ?? 1, sy = o.sy ?? 0.92;   // vertical: compress the advance slightly, keep glyph width
  const tr = (o.track ?? 0) * size;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.font = fs; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '0px';
  ctx.fillStyle = o.color || K.white;
  let pen = y;
  for (const ch of str) {
    if (ch === ' ' || ch === '　') { pen += size * (ch === ' ' ? 0.35 : 1) * sy; continue; }
    const m = cinfo(ctx, ch, fs, 'middle');
    let cy, adv, dx = 0, dy = 0, rot = false;
    if (isKana(ch) && ch !== 'ー') {
      const pad = size * (SMALL_KANA.includes(ch) ? 0.05 : 0.09);
      adv = (m.a + m.d + 2 * pad) * sy; cy = pen + (pad + m.a) * sy;
      if (SMALL_KANA.includes(ch)) { dx = size * 0.1; dy = -size * 0.08; }
    } else if (HALF_PUNCT.includes(ch)) {
      adv = size * 0.55 * sy; cy = pen + size * 0.5 * sy; dx = size * 0.55; dy = -size * 0.55;
    } else {
      adv = size * sy; cy = pen + size * 0.5 * sy; rot = VROT.includes(ch);
    }
    ctx.save();
    ctx.translate(x + dx, cy + dy);
    if (rot) ctx.rotate(Math.PI / 2);
    ctx.scale(sx, rot ? 1 : sy);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    pen += adv + tr;
  }
  ctx.restore();
  return pen - y;
}

/** Latin / grotesk: single line with sx, sy scale. align left/center/right. */
const MAXPX = 160;
function lat(ctx, str, x, y, o = {}) {
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  const size = o.size || 60, k = size > MAXPX ? size / MAXPX : 1;
  ctx.font = `${o.style || ''} ${o.weight ?? 700} ${size / k}px ${o.family || FH}`.trim();
  ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
  ctx.letterSpacing = ((o.ls || 0) / k) + 'px';
  ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.scale((o.sx || 1) * k, (o.sy || 1) * k);
  if (o.strokeW) o = { ...o, strokeW: o.strokeW / k };
  if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.strokeW || 4; ctx.strokeStyle = o.stroke; ctx.strokeText(str, 0, 0); }
  if (!o.outline) { ctx.fillStyle = o.color || K.white; ctx.fillText(str, 0, 0); }
  ctx.restore();
}
function latW(ctx, str, o = {}) {
  const size = o.size || 60, k = size > MAXPX ? size / MAXPX : 1;
  ctx.save(); ctx.font = `${o.style || ''} ${o.weight ?? 700} ${size / k}px ${o.family || FH}`.trim(); ctx.letterSpacing = ((o.ls || 0) / k) + 'px';
  const w = ctx.measureText(str).width * (o.sx || 1) * k; ctx.restore(); return w;
}
/** fit a grotesk string into a box width wbox with cap height capH (sx derived). */
function latFit(ctx, str, cx, baseY, wbox, capH, o = {}) {
  const fam = o.family || FH, wt = o.weight ?? 700;
  const size = capH / (o.capRatio || 0.716);
  const w0 = latW(ctx, str, { size, family: fam, weight: wt, ls: o.ls || 0 });
  const sx = wbox / w0;
  lat(ctx, str, cx, baseY, { ...o, size, family: fam, weight: wt, sx, align: o.align || 'center' });
  return sx;
}

// ── MathJax formulas as Path2D ────────────────────────────────────────────
const FML = {};
function initFormulas() {
  const P = new DOMParser();
  for (const [k, f] of Object.entries(window.FORMULAS)) {
    const doc = P.parseFromString(f.svg, 'image/svg+xml');
    const items = [];
    const walk = (node, M) => {
      for (const el of node.children) {
        let m = M;
        const tf = el.getAttribute('transform');
        if (tf) {
          for (const mt of tf.matchAll(/(translate|scale)\(([^)]+)\)/g)) {
            const v = mt[2].split(/[ ,]+/).map(Number);
            if (mt[1] === 'translate') m = mul(m, [1, 0, 0, 1, v[0], v[1] || 0]);
            else m = mul(m, [v[0], 0, 0, v[1] ?? v[0], 0, 0]);
          }
        }
        if (el.tagName === 'path') items.push({ p: new Path2D(el.getAttribute('d')), m });
        else if (el.tagName === 'rect') items.push({ r: ['x', 'y', 'width', 'height'].map((a) => +(el.getAttribute(a) || 0)), m });
        else walk(el, m);
      }
    };
    const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
    walk(doc.documentElement, [1, 0, 0, 1, 0, 0]);
    FML[k] = { items, w: f.w, h: f.h, asc: f.asc };
  }
}
/**
 * fml(ctx, key, x, y, hpx, color, o)
 *  hpx: pixel height of 1 em (1000 MathJax units)  -> consistent sizing across formulas
 *  y: baseline. o.align: left|center|right; o.sw: embolden stroke (MathJax units); o.sx: horizontal scale
 *  o.reveal: 0..1 wipe from left; o.outline: stroke only (lw in px)
 */
function fml(ctx, key, x, y, em, color, o = {}) {
  const f = FML[key]; if (!f) { console.warn('formula missing', key); return 0; }
  const s = em / 1000, sx = o.sx || 1;
  const w = f.w * s * sx;
  let x0 = x;
  if (o.align === 'center') x0 = x - w / 2; else if (o.align === 'right') x0 = x - w;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.reveal !== undefined && o.reveal < 1) { ctx.beginPath(); ctx.rect(x0 - 20, y - f.asc * s - 40, (w + 40) * Math.max(0, o.reveal), f.h * s + 80); ctx.clip(); }
  ctx.translate(x0, y); ctx.scale(s * sx, s);
  ctx.fillStyle = color; ctx.strokeStyle = o.strokeCol || color; ctx.lineJoin = 'round';
  const sw = o.sw || 0;
  for (const it of f.items) {
    ctx.save(); ctx.transform(...it.m);
    if (o.outline) {
      ctx.lineWidth = o.outline / s;
      if (it.p) ctx.stroke(it.p); else ctx.strokeRect(...it.r);
    } else if (it.p) { ctx.fill(it.p); if (sw) { ctx.lineWidth = sw; ctx.stroke(it.p); } }
    else { ctx.fillRect(it.r[0] - sw / 2, it.r[1] - sw / 2, it.r[2] + sw, it.r[3] + sw); }
    ctx.restore();
  }
  ctx.restore();
  return w;
}
function fmlW(key, em, sx = 1) { return FML[key].w * em / 1000 * sx; }
function fmlAsc(key, em) { return FML[key].asc * em / 1000; }
function fmlH(key, em) { return FML[key].h * em / 1000; }

// ── blade strokes (hand-cut katakana) ──────────────────────────────────────
/** stroke from (x1,y1) to (x2,y2), half-widths w1,w2, end cuts c1,c2 (slant, in units of w) */
function bladePts(x1, y1, x2, y2, w1, w2, c1 = 0, c2 = 0) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  return [
    [x1 + nx * w1 + ux * c1 * w1, y1 + ny * w1 + uy * c1 * w1],
    [x2 + nx * w2 + ux * c2 * w2, y2 + ny * w2 + uy * c2 * w2],
    [x2 - nx * w2 - ux * c2 * w2, y2 - ny * w2 - uy * c2 * w2],
    [x1 - nx * w1 - ux * c1 * w1, y1 - ny * w1 - uy * c1 * w1],
  ];
}

// ── 7-segment digits (the timer card) ──────────────────────────────────────
const SEG = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '' };
function seg7(ctx, ch, x, y, w, h, t, col, slant = 0.12) {
  const on = SEG[ch] || '';
  const k = (px, py) => [x + px + (h - py) * slant, y + py];
  const hs = [ // horizontal hexagon segments
    ['a', 0, 0], ['g', 0, h / 2], ['d', 0, h],
  ];
  const vs = [['f', 0, 0], ['b', w, 0], ['e', 0, h / 2], ['c', w, h / 2]];
  ctx.fillStyle = col;
  const g = t * 0.18;
  for (const [n, sx, sy] of hs) {
    if (!on.includes(n)) continue;
    const pts = [[sx + g, sy], [sx + g + t / 2, sy - t / 2], [sx + w - g - t / 2, sy - t / 2], [sx + w - g, sy], [sx + w - g - t / 2, sy + t / 2], [sx + g + t / 2, sy + t / 2]].map((p) => k(p[0], p[1]));
    poly(ctx, pts, { fill: col });
  }
  for (const [n, sx, sy] of vs) {
    if (!on.includes(n)) continue;
    const L = h / 2;
    const pts = [[sx, sy + g], [sx + t / 2, sy + g + t / 2], [sx + t / 2, sy + L - g - t / 2], [sx, sy + L - g], [sx - t / 2, sy + L - g - t / 2], [sx - t / 2, sy + g + t / 2]].map((p) => k(p[0], p[1]));
    poly(ctx, pts, { fill: col });
  }
}

// ── small utilities ─────────────────────────────────────────────────────────
/** frames since a (integer) */
const fr = (t, a) => Math.floor((t - a) * FPS + 1e-6);
/** credit dissolve: in over din, out over dout */
function dissolve(t, a, b, din = 0.2, dout = 0.2) { return Math.min(seg(t, a, a + din), 1 - seg(t, b - dout, b)); }
/** gate weave: ±1px, changes every frame, deterministic */
function weave(t) { const f = Math.floor(t * FPS); return [Math.round((hash1(f * 3 + 1) - 0.5) * 2.2), Math.round((hash1(f * 7 + 5) - 0.5) * 1.6)]; }
/** fit a formula inside a box (maxW × maxH) centred on (cx, cy); returns the em used */
function fmlFit(ctx, key, cx, cy, maxW, maxH, color, o = {}) {
  const f = FML[key]; if (!f) { console.warn('formula missing', key); return 0; }
  const sx = o.sx || 1;
  const em = Math.min(maxW * 1000 / (f.w * sx), maxH * 1000 / f.h) * (o.scale || 1);
  const hpx = f.h * em / 1000, base = cy - hpx / 2 + f.asc * em / 1000;
  fml(ctx, key, cx, base, em, color, { ...o, align: 'center' });
  return em;
}
