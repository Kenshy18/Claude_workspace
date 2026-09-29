// ─────────────────────────────────────────────────────────────────────────────
//  p1_tv1995 · kit: credit typography, text cards, cel painting, tiny 3D, 7-seg.
// ─────────────────────────────────────────────────────────────────────────────
const MINCHO = '"Noto Serif CJK JP"';
const MINCHO2 = '"Zen Old Mincho"';
const GROT = '"Liberation Sans"';
const COND = '"Roboto Condensed"';
const ROMAN = '"Liberation Serif"';
const CW = '#fbf9f2';                     // credit white (slightly warm, like the cel)

function fill(ctx, col) { ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); }
function frameIdx(t) { return Math.round(t * FPS); }
function rngFor(seed) { return mulberry32(seed * 2654435761 >>> 0); }

// ── typography ──────────────────────────────────────────────────────────────
/** heavy mincho line, horizontally compressed like the Matisse credits */
function mincho(ctx, str, x, y, size, o = {}) {
  ctx.save();
  ctx.font = `${o.weight ?? 900} ${size}px ${o.family || MINCHO}`;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'alphabetic';
  ctx.letterSpacing = (o.ls || 0) + 'px';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.translate(x, y);
  ctx.scale(o.sx ?? 0.84, o.sy ?? 1);
  if (o.halo) { ctx.shadowColor = o.halo; ctx.shadowBlur = o.haloB ?? 6; }
  ctx.fillStyle = o.color || CW;
  const eb = o.embolden ?? 0.022;
  if (eb > 0) { ctx.strokeStyle = o.color || CW; ctx.lineWidth = size * eb; ctx.lineJoin = 'miter'; ctx.strokeText(str, 0, 0); }
  ctx.fillText(str, 0, 0);
  ctx.restore();
}
function minchoW(ctx, str, size, o = {}) {
  ctx.save(); ctx.font = `${o.weight ?? 900} ${size}px ${o.family || MINCHO}`; ctx.letterSpacing = (o.ls || 0) + 'px';
  const w = ctx.measureText(str).width * (o.sx ?? 0.84); ctx.restore(); return w;
}
/** mincho with explicit per-character pitch (for spaced names like 摩 砂 雪) */
function minchoSpaced(ctx, str, x, y, size, pitch, o = {}) {
  [...str].forEach((ch, i) => { if (ch !== ' ') mincho(ctx, ch, x + i * pitch, y, size, { ...o, align: 'center' }); });
}
/** vertical mincho */
function minchoV(ctx, str, x, y, size, o = {}) {
  let yy = y;
  for (const ch of [...str]) {
    ctx.save(); ctx.translate(x, yy);
    if ('ーｰ—'.includes(ch)) ctx.rotate(Math.PI / 2);
    mincho(ctx, ch, 0, 0, size, { ...o, align: 'center', base: 'middle', sx: o.sx ?? 1 });
    ctx.restore();
    yy += size * (o.lh || 1.05);
  }
}
/** fit a string into a width with the mincho compression capped */
function minchoFit(ctx, str, x, y, size, maxW, o = {}) {
  const w = minchoW(ctx, str, size, { ...o, sx: 1 });
  const sx = Math.min(o.sx ?? 0.84, maxW / w);
  mincho(ctx, str, x, y, size, { ...o, sx });
}
/** bold condensed grotesk used for the chorus text cards */
function grot(ctx, str, x, y, size, o = {}) {
  ctx.save();
  ctx.font = `${o.weight ?? 700} ${size}px ${o.family || GROT}`;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'alphabetic';
  ctx.letterSpacing = (o.ls || 0) + 'px';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.translate(x, y); ctx.scale(o.sx ?? 1, o.sy ?? 1);
  ctx.fillStyle = o.color || '#ffffff';
  ctx.fillText(str, 0, 0);
  ctx.restore();
}
function grotW(ctx, str, size, o = {}) {
  ctx.save(); ctx.font = `${o.weight ?? 700} ${size}px ${o.family || GROT}`; ctx.letterSpacing = (o.ls || 0) + 'px';
  const w = ctx.measureText(str).width; ctx.restore(); return w * (o.sx ?? 1);
}
/** a centred word fitted to a target width (scaleX only), baseline y */
function grotFit(ctx, str, cx, y, size, targetW, o = {}) {
  const w = grotW(ctx, str, size, { ...o, sx: 1 });
  grot(ctx, str, cx, y, size, { ...o, align: 'center', sx: targetW / w });
}

// ── credit timing: hard cut in with a 2-frame dissolve, like the telecine'd titles
function cAlpha(t, a, b, fin = 2, fout = 2) {
  if (t < a || t >= b) return 0;
  const fi = (t - a) * FPS, fo = (b - t) * FPS;
  return Math.min(1, fin ? fi / fin : 1, fout ? fo / fout : 1);
}

// ── cel painting ────────────────────────────────────────────────────────────
function pathPts(ctx, pts, close = true) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  if (close) ctx.closePath();
}
function fillPts(ctx, pts, col) { pathPts(ctx, pts); ctx.fillStyle = col; ctx.fill(); }
function strokePts(ctx, pts, col, lw, close = true) {
  pathPts(ctx, pts, close); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
}
/** smooth closed curve through points (Catmull-Rom) */
function smoothPath(ctx, pts, close = true, tension = 0.5) {
  const n = pts.length; ctx.beginPath();
  const P = (i) => pts[close ? (i + n) % n : clamp(i, 0, n - 1)];
  ctx.moveTo(P(0)[0], P(0)[1]);
  const m = close ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const k = tension / 3;
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
  }
  if (close) ctx.closePath();
}
function circle(ctx, x, y, r, col) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); }
function ringS(ctx, x, y, r, col, lw) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); }
function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2); ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
/** cel box: base fill + hard shadow band on one side + outline */
function celRect(ctx, x, y, w, h, r, base, shade, o = {}) {
  ctx.save();
  rrect(ctx, x, y, w, h, r); ctx.fillStyle = base; ctx.fill();
  ctx.clip();
  if (shade) {
    ctx.fillStyle = shade;
    const k = o.shadeK ?? 0.28;
    if ((o.side || 'right') === 'right') { ctx.beginPath(); ctx.moveTo(x + w * (1 - k), y - 2); ctx.lineTo(x + w + 2, y - 2); ctx.lineTo(x + w + 2, y + h + 2); ctx.lineTo(x + w * (1 - k) - h * 0.25, y + h + 2); ctx.fill(); }
    else if (o.side === 'bottom') { ctx.fillRect(x - 2, y + h * (1 - k), w + 4, h * k + 2); }
    else { ctx.beginPath(); ctx.moveTo(x - 2, y - 2); ctx.lineTo(x + w * k + h * 0.25, y - 2); ctx.lineTo(x + w * k, y + h + 2); ctx.lineTo(x - 2, y + h + 2); ctx.fill(); }
  }
  ctx.restore();
  if (o.line) { rrect(ctx, x, y, w, h, r); ctx.strokeStyle = o.line; ctx.lineWidth = o.lw || 3; ctx.stroke(); }
}

// ── tiny 3D (cel-shaded convex boxes / prisms) ──────────────────────────────
function v3rot(p, yaw, pitch, roll = 0) {
  let [x, y, z] = p;
  let c = Math.cos(yaw), s = Math.sin(yaw); [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(pitch); s = Math.sin(pitch); [y, z] = [y * c - z * s, y * s + z * c];
  if (roll) { c = Math.cos(roll); s = Math.sin(roll); [x, y] = [x * c - y * s, x * s + y * c]; }
  return [x, y, z];
}
/** camera: {yaw,pitch,roll,cx,cy,f,dist,scale} ; returns [sx,sy,depth] */
function v3proj(p, cam) {
  const q = v3rot(p, cam.yaw || 0, cam.pitch || 0, cam.roll || 0);
  const z = q[2] + (cam.dist || 2000);
  const k = (cam.f || 1600) / z * (cam.scale || 1);
  return [cam.cx + q[0] * k, cam.cy + q[1] * k, z, q];
}
/** box faces with an outward normal; returns list of {pts3, n, col, tag} */
function boxFaces(cx, cy, cz, w, h, d, col, tag) {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, z0 = cz - d / 2, z1 = cz + d / 2;
  const V = (x, y, z) => [x, y, z];
  return [
    { pts: [V(x0, y0, z0), V(x1, y0, z0), V(x1, y1, z0), V(x0, y1, z0)], n: [0, 0, -1], col, tag, face: 'front' },
    { pts: [V(x1, y0, z1), V(x0, y0, z1), V(x0, y1, z1), V(x1, y1, z1)], n: [0, 0, 1], col, tag, face: 'back' },
    { pts: [V(x0, y0, z1), V(x0, y0, z0), V(x0, y1, z0), V(x0, y1, z1)], n: [-1, 0, 0], col, tag, face: 'left' },
    { pts: [V(x1, y0, z0), V(x1, y0, z1), V(x1, y1, z1), V(x1, y1, z0)], n: [1, 0, 0], col, tag, face: 'right' },
    { pts: [V(x0, y0, z1), V(x1, y0, z1), V(x1, y0, z0), V(x0, y0, z0)], n: [0, -1, 0], col, tag, face: 'top' },
    { pts: [V(x0, y1, z0), V(x1, y1, z0), V(x1, y1, z1), V(x0, y1, z1)], n: [0, 1, 0], col, tag, face: 'bottom' },
  ];
}
/** draw faces with 2-tone cel shading: col = [light, shadow] ; light dir in camera space */
function drawFaces(ctx, faces, cam, o = {}) {
  const L = o.light || [0.45, 0.55, 0.7];
  const ln = Math.hypot(...L); const Ln = L.map((v) => v / ln);
  const items = [];
  for (const f of faces) {
    const P = f.pts.map((p) => v3proj(p, cam));
    const n = v3rot(f.n, cam.yaw || 0, cam.pitch || 0, cam.roll || 0);
    // back-face cull (camera looks +z)
    const c = P.reduce((a, p) => [a[0] + p[3][0], a[1] + p[3][1], a[2] + p[3][2] + (cam.dist || 2000)], [0, 0, 0]).map((v) => v / P.length);
    if (n[0] * c[0] + n[1] * c[1] + n[2] * c[2] >= 0) continue;
    const depth = P.reduce((a, p) => a + p[2], 0) / P.length;
    const lit = -(n[0] * Ln[0] + n[1] * Ln[1] + n[2] * Ln[2]);
    items.push({ f, P, depth, lit });
  }
  items.sort((a, b) => b.depth - a.depth + (a.f.z || 0) - (b.f.z || 0));
  for (const it of items) {
    const col = it.f.col;
    const c = Array.isArray(col) ? (it.lit > (o.thr ?? 0.25) ? col[0] : it.lit > (o.thr2 ?? -0.35) ? col[1] : (col[2] || col[1])) : col;
    pathPts(ctx, it.P.map((p) => [p[0], p[1]]));
    ctx.fillStyle = c; ctx.fill();
    if (o.line) { ctx.strokeStyle = o.line; ctx.lineWidth = o.lw || 2.5; ctx.lineJoin = 'round'; ctx.stroke(); }
    if (o.onFace) o.onFace(ctx, it);
  }
  return items;
}
/** affine map so that unit square (0..1) → quad corners p0 (tl), p1 (tr), p3 (bl) */
function faceTransform(ctx, P, w, h) {
  const p0 = P[0], p1 = P[1], p3 = P[3];
  ctx.transform((p1[0] - p0[0]) / w, (p1[1] - p0[1]) / w, (p3[0] - p0[0]) / h, (p3[1] - p0[1]) / h, p0[0], p0[1]);
}

// ── 7-segment digits (the 活動限界 timer) ────────────────────────────────────
const SEG7 = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '' };
function seg7Digit(ctx, ch, x, y, h, on, off, skew = 0.12) {
  const w = h * 0.52, t = h * 0.12, g = t * 0.18;
  const S = {
    a: [[g + t / 2, 0], [w - g - t / 2, 0], [w - g - t, t], [g + t, t]],
    d: [[g + t, h - t], [w - g - t, h - t], [w - g - t / 2, h], [g + t / 2, h]],
    g: [[g + t, h / 2 - t / 2], [w - g - t, h / 2 - t / 2], [w - g - t / 2, h / 2], [w - g - t, h / 2 + t / 2], [g + t, h / 2 + t / 2], [g + t / 2, h / 2]],
    f: [[0, g + t / 2], [t, g + t], [t, h / 2 - g - t / 2], [t / 2, h / 2 - g], [0, h / 2 - g - t / 2]],
    b: [[w, g + t / 2], [w, h / 2 - g - t / 2], [w - t / 2, h / 2 - g], [w - t, h / 2 - g - t / 2], [w - t, g + t]],
    e: [[0, h / 2 + g + t / 2], [t / 2, h / 2 + g], [t, h / 2 + g + t / 2], [t, h - g - t], [0, h - g - t / 2]],
    c: [[w, h / 2 + g + t / 2], [w, h - g - t / 2], [w - t, h - g - t], [w - t, h / 2 + g + t / 2], [w - t / 2, h / 2 + g]],
  };
  const lit = SEG7[ch] || '';
  for (const k of 'abcdefg') {
    const col = lit.includes(k) ? on : off; if (!col) continue;
    fillPts(ctx, S[k].map(([px, py]) => [x + px + (h - py) * skew, y + py]), col);
  }
  return w + t * 1.2;
}
function seg7Str(ctx, str, x, y, h, on, off, skew) {
  let xx = x;
  for (const ch of str) {
    if (ch === ':') { const t = h * 0.12; circle(ctx, xx + t * 0.9 + h * 0.3 * skew, y + h * 0.32, t * 0.62, on); circle(ctx, xx + t * 0.9 + h * 0.1 * skew, y + h * 0.72, t * 0.62, on); xx += t * 2.4; continue; }
    xx += seg7Digit(ctx, ch, xx, y, h, on, off, skew);
  }
  return xx - x;
}

// ── misc ────────────────────────────────────────────────────────────────────
function withAlpha(ctx, a, fn) { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; fn(); ctx.restore(); }
function camPush(ctx, s, cx = W / 2, cy = H / 2) { ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function mixHex(a, b, k) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const r = Math.round(lerp(A >> 16, B >> 16, k)), g = Math.round(lerp((A >> 8) & 255, (B >> 8) & 255, k)), bl = Math.round(lerp(A & 255, B & 255, k));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
/** painted-band vertical gradient: quantised into n bands with slightly wavy seams (hand-painted look) */
function bandSky(ctx, x, y, w, h, stops, n = 10, seed = 1, wav = 6) {
  const col = (k) => {
    let i = 0; while (i < stops.length - 2 && k > stops[i + 1][0]) i++;
    const [k0, c0] = stops[i], [k1, c1] = stops[i + 1];
    return mixHex(c0, c1, clamp((k - k0) / (k1 - k0)));
  };
  for (let b = 0; b < n; b++) {
    const k = (b + 0.5) / n;
    ctx.fillStyle = col(k);
    const yb = y + (b / n) * h;
    ctx.beginPath(); ctx.moveTo(x, yb + h);
    ctx.lineTo(x, yb);
    for (let s = 0; s <= 24; s++) { const xx = x + (s / 24) * w; ctx.lineTo(xx, yb + (b ? (vnoise(s * 0.7 + b * 3.1, seed) - 0.5) * wav : -2)); }
    ctx.lineTo(x + w, yb + h); ctx.closePath(); ctx.fill();
  }
}

// ── shot registry (filled by shots_*.js, dispatched by timeline.js) ─────────
const SHOTS = [];
function SHOT(t0, t1, name, fn) { SHOTS.push({ t0, t1, name, fn }); }

// ── box scenes: object-sorted cel boxes with front-face decals ───────────────
// box: {c:[x,y,z], s:[w,h,d], col:[light,shadow,deep], decal:(ctx,w,h)=>void (front face), side:(ctx,d,h)=>void (left face)}
function drawBoxes(ctx, boxes, cam, o = {}) {
  const L = o.light || [0.45, 0.55, 0.7]; const ln = Math.hypot(...L); const Ln = L.map((v) => v / ln);
  const dist = cam.dist || 2000;
  const withDepth = boxes.map((b) => { const q = v3rot(b.c, cam.yaw || 0, cam.pitch || 0, cam.roll || 0); return { b, d: q[2] + (b.bias || 0) }; });
  withDepth.sort((a, b) => b.d - a.d);
  for (const { b } of withDepth) {
    const faces = boxFaces(b.c[0], b.c[1], b.c[2], b.s[0], b.s[1], b.s[2], b.col, b.tag);
    for (const f of faces) {
      const P = f.pts.map((p) => v3proj(p, cam));
      const n = v3rot(f.n, cam.yaw || 0, cam.pitch || 0, cam.roll || 0);
      const c = P.reduce((a, p) => [a[0] + p[3][0], a[1] + p[3][1], a[2] + p[3][2] + dist], [0, 0, 0]).map((v) => v / 4);
      if (n[0] * c[0] + n[1] * c[1] + n[2] * c[2] >= 0) continue;
      const lit = -(n[0] * Ln[0] + n[1] * Ln[1] + n[2] * Ln[2]);
      const col = b.col;
      const fc = typeof col === 'string' ? col : lit > (o.thr ?? 0.3) ? col[0] : lit > (o.thr2 ?? -0.3) ? col[1] : (col[2] || col[1]);
      const P2 = P.map((p) => [p[0], p[1]]);
      pathPts(ctx, P2); ctx.fillStyle = fc; ctx.fill();
      const dec = f.face === 'front' ? b.decal : (f.face === 'left' || f.face === 'right') ? b.side : f.face === 'top' ? b.topDecal : null;
      if (dec) {
        ctx.save(); pathPts(ctx, P2); ctx.clip();
        const fw = f.face === 'left' ? b.s[2] : b.s[0], fh = f.face === 'top' ? b.s[2] : b.s[1];
        faceTransform(ctx, P2, fw, fh); dec(ctx, fw, fh, lit > (o.thr ?? 0.3));
        ctx.restore();
      }
      if (o.line !== null) { pathPts(ctx, P2); ctx.strokeStyle = o.line || '#23263a'; ctx.lineWidth = o.lw || 2.6; ctx.lineJoin = 'round'; ctx.stroke(); }
    }
  }
}
/** plain label in the paper's sans */
function paperLabel(ctx, str, w, h, o = {}) {
  const lines = str.split('|');
  ctx.save(); ctx.fillStyle = o.color || '#1d2030'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const size = o.size || Math.min(h / (lines.length + 0.9), w / 7.5);
  ctx.font = `400 ${size}px ${GROT}`;
  lines.forEach((ln, i) => ctx.fillText(ln, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.12));
  ctx.restore();
}

// ── tiny formula typesetter: x^{2}, W_{i}^{Q}, √ … (italic serif) ────────────
function fmlParse(str) {
  const out = []; let i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (ch === '^' || ch === '_') {
      let tok = '';
      if (str[i + 1] === '{') { const j = str.indexOf('}', i); tok = str.slice(i + 2, j); i = j + 1; } else { tok = str[i + 1]; i += 2; }
      out.push({ t: tok, k: ch === '^' ? 'sup' : 'sub' });
    } else { const last = out[out.length - 1]; if (last && last.k === 'n') last.t += ch; else out.push({ t: ch, k: 'n' }); i++; }
  }
  return out;
}
function fml(ctx, str, x, y, size, o = {}) {
  const parts = fmlParse(str);
  ctx.save(); ctx.fillStyle = o.color || '#fff'; ctx.textBaseline = 'alphabetic';
  const fam = o.family || '"Liberation Serif"'; const it = o.italic === false ? '' : 'italic ';
  const widths = parts.map((p) => { ctx.font = `${it}400 ${p.k === 'n' ? size : size * 0.62}px ${fam}`; return ctx.measureText(p.t).width; });
  const tot = widths.reduce((a, b) => a + b, 0);
  let xx = o.align === 'center' ? x - tot / 2 : o.align === 'right' ? x - tot : x;
  parts.forEach((p, i) => {
    ctx.font = `${it}400 ${p.k === 'n' ? size : size * 0.62}px ${fam}`;
    ctx.fillText(p.t, xx, y + (p.k === 'sup' ? -size * 0.38 : p.k === 'sub' ? size * 0.2 : 0));
    xx += widths[i];
  });
  ctx.restore();
  return tot;
}

// ── computed attention pattern: softmax(PE·PEᵀ/√d) of the paper's sinusoidal PE ──
function peVec(pos, d) { const v = new Float32Array(d); for (let i = 0; i < d / 2; i++) { const w = pos / Math.pow(10000, (2 * i) / d); v[2 * i] = Math.sin(w); v[2 * i + 1] = Math.cos(w); } return v; }
function attnPE(n, d, temp = 1, stride = 1) {
  const P = []; for (let i = 0; i < n; i++) P.push(peVec(i * stride, d));
  const A = [];
  for (let i = 0; i < n; i++) {
    const row = []; let mx = -1e9;
    for (let j = 0; j < n; j++) { let s = 0; for (let k = 0; k < d; k++) s += P[i][k] * P[j][k]; s = s / Math.sqrt(d) * temp; row.push(s); mx = Math.max(mx, s); }
    let z = 0; for (let j = 0; j < n; j++) { row[j] = Math.exp(row[j] - mx); z += row[j]; }
    A.push(row.map((v) => v / z));
  }
  return A;
}
