// ─────────────────────────────────────────────────────────────────────────────
//  p4_rebuild — 2D inserts modelled on the 1995 OP's own graphics (engraving, emblem, Sephirot
//  line-art, stencil plate, 4:59:56 timer, green grids, text cards, document, satellite labels).
// ─────────────────────────────────────────────────────────────────────────────
import * as M from './mathml.js';
import * as WD from './world.js';
import { W, H, clamp, seg, lerp, ease, rng, jp, jpW, vert, MIN, mk } from './paint.js';

const CACHE = {};

// ── engraving: iso-contours + gradient streamlines + medallions at every critical point ────────
export function initArt() {
  CACHE.lines = M.streamlines(24, 0.04, 500);
  const lv = []; for (let L = 0.5; L <= 8.5; L += 0.5) lv.push(L);
  CACHE.contours = M.contours(lv, 150, -6.5, 6.5);
  CACHE.attn = [0, -1, -2, -3].map((k) => M.attention(10, k, 3));
  paintMasses();
}
const LAT = { min: 'MINIMVM', saddle: 'SELLA', max: 'MAXIMVM LOCALE' };
const ROMAN = ['I', 'II', 'III', 'IV'];
// project a loss-plane point (u,v) at relief height through the three camera
const P3 = (u, v, lift = 0) => WD.project(M.toWorld(u, v, lift));
export function engraving(ctx, t, o = {}) {
  ctx.fillStyle = o.bg || '#061a4a'; ctx.fillRect(0, 0, W, H);
  const ink = o.ink || '200,225,255';
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // contours
  for (const c of CACHE.contours) {
    const major = Math.abs((c.level * 2) % 2) < 1e-6;
    ctx.strokeStyle = `rgba(${ink},${major ? 0.8 : 0.42})`; ctx.lineWidth = major ? 1.8 : 1.0;
    ctx.beginPath();
    for (const [a, b] of c.segs) { const p = P3(a[0], a[1]), q = P3(b[0], b[1]); if (p[2] > 1 || q[2] > 1) continue; ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
    ctx.stroke();
  }
  // streamlines (engraved hatching of the gradient flow)
  const reveal = o.reveal ?? 1;
  ctx.strokeStyle = `rgba(${ink},0.55)`; ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (const L of CACHE.lines) {
    const n = Math.floor(L.length * reveal);
    for (let i = 0; i < n; i += 2) { const p = P3(L[i][0], L[i][1]); if (p[2] > 1) continue; if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); }
    ctx.moveTo(0, 0);
  }
  ctx.stroke();
  // medallions
  let mi = 0;
  for (const c of M.CRIT) {
    const p = P3(c.u, c.v); if (p[2] > 1) continue;
    const q = P3(c.u + 0.45, c.v); const r = Math.max(18, Math.hypot(q[0] - p[0], q[1] - p[1]));
    ctx.strokeStyle = `rgba(${ink},0.95)`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p[0], p[1], r * 0.84, 0, Math.PI * 2); ctx.stroke();
    const name = c.kind === 'min' ? `${LAT.min} ${ROMAN[mi++]}` : LAT[c.kind];
    const fs = Math.max(11, r * 0.24);
    ctx.fillStyle = `rgba(${ink},0.95)`; ctx.font = `500 ${fs}px "EB Garamond"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(name, p[0], p[1] - fs * 0.6);
    ctx.font = `italic 500 ${fs * 0.85}px "EB Garamond"`;
    ctx.fillText(`(${c.u.toFixed(3)}, ${c.v.toFixed(3)})`, p[0], p[1] + fs * 0.55);
    ctx.fillText(`f = ${c.f < 1e-9 ? '0' : c.f.toFixed(2)}`, p[0], p[1] + fs * 1.45);
  }
  ctx.textAlign = 'left';
}

// ── faint red line-art emblem: the L1 ball as a drawing (octahedron, axes, inscribed circle) ────
export function l1Emblem(ctx, cx, cy, s, a, t) {
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#ff6a5a'; ctx.fillStyle = '#ff6a5a'; ctx.lineWidth = 1.4;
  const ry = t * 0.15; const V = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const pr = ([x, y, z]) => { const X = x * Math.cos(ry) - z * Math.sin(ry), Z = x * Math.sin(ry) + z * Math.cos(ry); const Y = y * 0.98 - Z * 0.18; return [cx + X * s, cy - Y * s * 1.25]; };
  const E = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [4, 3], [3, 5], [5, 2]];
  ctx.beginPath(); for (const [i, j] of E) { const p = pr(V[i]), q = pr(V[j]); ctx.moveTo(...p); ctx.lineTo(...q); } ctx.stroke();
  ctx.setLineDash([6, 6]); ctx.beginPath(); for (const i of [0, 2, 4]) { const p = pr(V[i]), q = pr(V[i + 1]); ctx.moveTo(...p); ctx.lineTo(...q); } ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.ellipse(cx, cy, s / Math.sqrt(3), s / Math.sqrt(3) * 1.25, 0, 0, Math.PI * 2); ctx.stroke();       // inscribed L2 sphere
  ctx.beginPath(); ctx.arc(cx, cy, s * 1.32, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, s * 1.38, 0, Math.PI * 2); ctx.stroke();
  ctx.font = 'italic 500 22px "EB Garamond"'; ctx.textAlign = 'center';
  ctx.fillText('‖w‖₁ ≤ t', cx, cy - s * 1.32 - 14); ctx.fillText('‖w‖₂ ≤ t / √3', cx, cy + s * 1.32 + 30);
  ctx.restore(); ctx.textAlign = 'left';
}

// ── airbrushed painted masses (red cloud field 2.4–7.3, slam smoke 14.1–15.9), painted once at init ─────
function softMass(g, x, y, rx, ry, rgb, a) {
  g.save(); g.translate(x, y); g.scale(1, ry / rx);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(0.55, `rgba(${rgb},${a * 0.55})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill(); g.restore();
}
function paintMasses() {
  const LW = 2600, LH = 1500;
  const base = mk(LW, LH), g = base.getContext('2d'); g.fillStyle = '#c40c10'; g.fillRect(0, 0, LW, LH);
  const r = rng(301);
  for (let i = 0; i < 44; i++) softMass(g, r() * LW, r() * LH, 200 + r() * 420, 120 + r() * 240, r() < 0.55 ? '236,44,30' : '150,4,10', 0.55);
  const l2 = mk(LW, LH), g2 = l2.getContext('2d'); const r2 = rng(302);             // dark maroon roiling masses
  for (let i = 0; i < 24; i++) { const x = r2() * LW, y = r2() * LH, sz = 180 + r2() * 380; for (let k = 0; k < 5; k++) softMass(g2, x + (r2() - 0.5) * sz, y + (r2() - 0.5) * sz * 0.5, sz * (0.4 + r2() * 0.4), sz * (0.25 + r2() * 0.25), '64,0,6', 0.5); }
  const l3 = mk(LW, LH), g3 = l3.getContext('2d'); const r3 = rng(303);             // hot rims
  for (let i = 0; i < 18; i++) softMass(g3, r3() * LW, r3() * LH, 160 + r3() * 300, 60 + r3() * 120, '255,92,52', 0.33);
  CACHE.red3 = [base, l2, l3];
  const sm = mk(2400, 1400), gs = sm.getContext('2d'); gs.fillStyle = '#cfcfcc'; gs.fillRect(0, 0, 2400, 1400);
  const r4 = rng(77);
  for (let i = 0; i < 80; i++) { const v = r4(); softMass(gs, r4() * 2400, r4() * 1400, 110 + r4() * 300, 70 + r4() * 180, v < 0.45 ? '64,66,70' : v < 0.75 ? '118,120,122' : '246,246,244', 0.45 + r4() * 0.3); }
  CACHE.smoke = sm;
  const cc = mk(1200, 1200), gc = cc.getContext('2d'); gc.filter = 'blur(12px)'; gc.fillStyle = '#18191c';
  gc.fillRect(545, 40, 110, 1120); gc.fillRect(170, 330, 860, 96); gc.filter = 'none';
  CACHE.cross = cc;
}
export function redClouds(ctx, t) {
  const [b, l2, l3] = CACHE.red3;
  const draw = (img, sc, dx, dy) => { const w = img.width * sc, h = img.height * sc; ctx.drawImage(img, W / 2 - w / 2 + dx, H / 2 - h / 2 + dy, w, h); };
  draw(b, 0.86 + t * 0.012, -t * 14, t * 3);
  draw(l2, 0.9 + t * 0.022, -60 + t * 26, -t * 6);
  draw(l3, 0.95 + t * 0.03, 40 - t * 38, t * 4);
}
// grey smoke rushing past the lens: zoom + pan with a 3-tap zoom blur (no particles)
export function smoke(ctx, t) {
  const img = CACHE.smoke;
  for (let k = 0; k < 3; k++) {
    const sc = (1.0 + t * 0.34) * (1 + k * 0.025), w = img.width * sc, h = img.height * sc;
    ctx.globalAlpha = k === 0 ? 1 : 0.34; ctx.drawImage(img, W / 2 - w / 2 - t * 260, H / 2 - h / 2 + t * 40, w, h);
  }
  ctx.globalAlpha = 1;
}
export function darkCross(ctx, x, y, s, rot, a = 1) {
  const img = CACHE.cross; const sc = s / 560;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  for (let k = 0; k < 3; k++) { ctx.globalAlpha = a * (k === 0 ? 1 : 0.38); ctx.drawImage(img, -600 * sc - k * 26, -600 * sc, 1200 * sc, 1200 * sc); }
  ctx.restore();
}

// ── Tree of Attention: a Transformer block laid out as the Sephirotic tree (green line-art) ────
const TREE = [ // [x,y] in 0..1 box, label (Latin-styled headings; real Transformer components)
  [0.5, 0.06, 'SOFTMAX'], [0.22, 0.2, 'QVERY'], [0.78, 0.2, 'CLAVIS'],
  [0.22, 0.42, 'NORMA'], [0.78, 0.42, 'VALOR'], [0.5, 0.52, 'ATTENTIO'],
  [0.22, 0.68, 'FFN'], [0.78, 0.68, 'RESIDVVM'], [0.5, 0.8, 'POSITIO'], [0.5, 0.95, 'EMBEDDING'],
];
const PATHS = [[0, 1], [0, 2], [1, 2], [0, 5], [1, 3], [2, 4], [1, 5], [2, 5], [3, 4], [3, 5], [4, 5], [3, 6], [4, 7], [5, 6], [5, 7], [6, 7], [6, 8], [7, 8], [5, 8], [8, 9], [6, 9], [7, 9]];
export function tree(ctx, cx, cy, s, p, a = 1) {
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#6dff9c'; ctx.fillStyle = '#6dff9c'; ctx.lineWidth = 2.2;
  const X = (u) => cx + (u - 0.5) * s * 0.9, Y = (v) => cy + (v - 0.5) * s * 1.1;
  const np = PATHS.length, shown = p * (np + 10);
  for (let i = 0; i < np; i++) {
    const k = clamp(shown - i * 0.9, 0, 1); if (k <= 0) continue;
    const [a1, b1] = PATHS[i]; const A = TREE[a1], B = TREE[b1];
    ctx.beginPath(); ctx.moveTo(X(A[0]), Y(A[1])); ctx.lineTo(lerp(X(A[0]), X(B[0]), k), lerp(Y(A[1]), Y(B[1]), k)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(A[0]) + 5, Y(A[1]) + 5); ctx.lineTo(lerp(X(A[0]), X(B[0]), k) + 5, lerp(Y(A[1]), Y(B[1]), k) + 5); ctx.globalAlpha = a * 0.5; ctx.stroke(); ctx.globalAlpha = a;
  }
  TREE.forEach(([u, v, lab], i) => {
    const k = clamp(shown - i * 1.4, 0, 1); if (k <= 0) return;
    const r = s * 0.058; ctx.globalAlpha = a * k;
    ctx.fillStyle = 'rgba(0,30,10,0.55)'; ctx.beginPath(); ctx.arc(X(u), Y(v), r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6dff9c'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(X(u), Y(v), r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(X(u), Y(v), r * 0.8, 0, Math.PI * 2); ctx.stroke();
    ctx.font = `500 ${r * 0.34}px "Cinzel"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lab, X(u), Y(v));
    ctx.font = `italic 500 ${r * 0.28}px "EB Garamond"`; ctx.fillText(`${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][i]}`, X(u), Y(v) + r * 0.42);
  });
  ctx.globalAlpha = a * clamp(shown / 6); ctx.fillStyle = '#6dff9c'; ctx.textAlign = 'center';
  ctx.font = `500 ${s * 0.04}px "Cinzel"`;
  ctx.fillText('SYSTEMA', X(0.1), Y(0.02)); ctx.fillText('ATTENTIONIS', X(0.9), Y(0.02));
  ctx.font = `italic 500 ${s * 0.026}px "EB Garamond"`; ctx.fillText('softmax(QKᵀ/√d)V', X(0.5), Y(0.13));
  ctx.restore(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

// ── stencil armour plate: EVALUATION / 2017 / 01 / TEST TYPE ─────────────────────────────────
export function plate(ctx, t) {
  ctx.fillStyle = '#e9dfe0'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2 + t * 30, H / 2); ctx.transform(1, -0.05, 0.12, 1, 0, 0); ctx.scale(1 + t * 0.04, 1 + t * 0.04);
  ctx.fillStyle = '#d6c9cb'; ctx.fillRect(-700, -620, 1400, 1300);
  ctx.strokeStyle = '#b3a3a6'; ctx.lineWidth = 6; ctx.strokeRect(-640, -560, 1280, 1180);
  const st = (s, y, size) => { ctx.font = `700 ${size}px "Roboto Condensed"`; ctx.textAlign = 'center'; ctx.fillStyle = '#6f6668'; ctx.save(); ctx.scale(1.1, 1); ctx.fillText(s, 0, y); ctx.restore();
    // stencil bridges
    ctx.fillStyle = '#d6c9cb'; const w = ctx.measureText(s).width * 1.1; for (let k = 0; k < s.length; k++) { const x = -w / 2 + (k + 0.5) * (w / s.length); ctx.fillRect(x - 3, y - size * 0.62, 6, size * 0.16); } };
  // small NABLA mark at top
  ctx.strokeStyle = '#b32a2a'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-48, -470); ctx.lineTo(48, -470); ctx.lineTo(0, -392); ctx.closePath(); ctx.stroke();
  st('EVALUATION', -180, 210); st('2017', 90, 250); st('01', 280, 140); st('TEST TYPE', 470, 140);
  ctx.restore(); ctx.textAlign = 'left';
}

// ── 7-segment timer panel (活動限界まで) ─────────────────────────────────────────────────────
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
function seven(ctx, d, x, y, h, on, off) {
  const w = h * 0.5, th = h * 0.11, sk = h * 0.12;
  const S = { a: [[0, 0], [1, 0]], b: [[1, 0], [1, 0.5]], c: [[1, 0.5], [1, 1]], d: [[0, 1], [1, 1]], e: [[0, 0.5], [0, 1]], f: [[0, 0], [0, 0.5]], g: [[0, 0.5], [1, 0.5]] };
  for (const k of 'abcdefg') {
    const [[x1, y1], [x2, y2]] = S[k]; const lit = SEG[d].includes(k);
    ctx.strokeStyle = lit ? on : off; ctx.lineWidth = th; ctx.lineCap = 'butt';
    const X = (u, v) => x + u * w + (1 - v) * sk, Y = (v) => y + v * h;
    const hx = x1 === x2 ? 0 : th * 0.7, hy = y1 === y2 ? 0 : th * 0.7;
    ctx.beginPath(); ctx.moveTo(X(x1, y1) + hx, Y(y1) + hy); ctx.lineTo(X(x2, y2) - hx, Y(y2) - hy); ctx.stroke();
  }
}
export function timer(ctx, lt, t0test = 0.17) {
  ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.1); ctx.scale(1.05 + lt * 0.08, 1.05 + lt * 0.08); ctx.translate(-W / 2, -H / 2);
  const Y = '#ffd21a', off = 'rgba(255,210,26,0.07)';
  // frame + labels (layout after the 1995 panel)
  ctx.strokeStyle = Y; ctx.lineWidth = 4; ctx.strokeRect(300, 250, 1330, 560);
  jp(ctx, '活動限界まで', 330, 330, 44, { color: Y, weight: 700, family: '"Noto Sans CJK JP"', sx: 0.9 });
  ctx.font = '400 26px "Share Tech Mono"'; ctx.fillStyle = Y; ctx.fillText('ACTIVE TIME REMAINING:', 330, 372);
  ctx.fillStyle = '#e8b60c'; ctx.fillRect(1180, 270, 430, 190);
  ctx.fillStyle = '#b01010'; for (let i = 0; i < 6; i++) { ctx.save(); ctx.beginPath(); ctx.rect(1480, 270, 130, 60); ctx.clip(); ctx.fillRect(1480 + i * 28 - 20, 270, 12, 70); ctx.restore(); }
  jp(ctx, '内部', 1200, 360, 86, { color: '#050505', weight: 900, family: '"Noto Sans CJK JP"', sx: 0.9 });
  ctx.font = '700 40px "Roboto Condensed"'; ctx.fillStyle = '#050505'; ctx.fillText('INTERNAL', 1380, 400);
  jp(ctx, 'UPS内部電源供給', 1200, 440, 34, { color: '#050505', weight: 700, family: '"Noto Sans CJK JP"', sx: 0.9 });
  const test = lt < t0test;
  const rem = Math.max(0, 300 - (lt - t0test) * 1.0) ;              // 5:00:00 UPS bridge time, real seconds
  const mm = Math.floor(rem / 60), ss = Math.floor(rem % 60), cs = Math.floor((rem * 100) % 100);
  const digs = test ? '888888' : `${mm}${String(ss).padStart(2, '0')}${String(cs).padStart(2, '0')}`.padStart(6, ' ');
  const dh = 300; let x = 360;
  const ds = test ? '88:88:88' : `${mm}:${String(ss).padStart(2, '0')}:${String(cs).padStart(2, '0')}`;
  for (const ch of ds) { if (ch === ':') { ctx.fillStyle = Y; ctx.fillRect(x + 20, 470, 20, 20); ctx.fillRect(x + 8, 560, 20, 20); x += 60; continue; } if (ch === ' ') { x += 170; continue; } seven(ctx, +ch, x, 410, dh, Y, off); x += 185; }
  // mode lamps: precision modes
  const modes = [['fp32', '#1a1a1a'], ['tf32', '#1a1a1a'], ['bf16', '#1a1a1a'], ['fp8', '#1faa3a']];
  modes.forEach(([m, c], i) => { ctx.fillStyle = i === 3 ? c : '#2a2410'; ctx.fillRect(330 + i * 200, 740, 180, 50); ctx.strokeStyle = Y; ctx.lineWidth = 2; ctx.strokeRect(330 + i * 200, 740, 180, 50); ctx.font = '700 32px "Roboto Condensed"'; ctx.fillStyle = i === 3 ? '#eaffea' : Y; ctx.textAlign = 'center'; ctx.fillText(m.toUpperCase(), 420 + i * 200, 777); });
  ctx.textAlign = 'left';
  ctx.restore();
}

// ── green angled bar display: paged KV-cache blocks ─────────────────────────────────────────
export function kvGrid(ctx, lt) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.transform(1, 0.28, -0.5, 0.9, 0, 0); ctx.translate(-W / 2 - lt * 260, -H / 2);
  const r = rng(5);
  for (let row = -2; row < 9; row++) for (let k = 0; k < 7; k++) {
    const used = r() < 0.62; const x = -200 + k * 420, y = row * 130; const w = 320 + r() * 60;
    ctx.fillStyle = used ? '#18ff7a' : '#0b3a1e'; ctx.fillRect(x, y, w, 84);
    if (used) { ctx.fillStyle = '#063a1c'; ctx.font = '700 30px "Share Tech Mono"'; ctx.fillText(`B${String(row * 7 + k + 17).padStart(2, '0')}`, x + 12, y + 56); }
  }
  ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-400, 520); ctx.lineTo(3000, 520); ctx.stroke();
  ctx.fillStyle = '#ff7a1a'; ctx.font = '400 30px "Share Tech Mono"'; ctx.fillText('KV-CACHE  PAGED  BLOCK TABLE', 900, 505);
  ctx.restore();
}

// ── text cards (Helvetica-like bold, first letters oversized where the OP does it) ────────────
export function card(ctx, kind) {
  const bg = kind === 'ADAM' ? '#f4f4f2' : '#000'; ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const txt = (s, x, y, size, o = {}) => { ctx.save(); ctx.font = `700 ${size}px ${o.f || '"Liberation Sans"'}`; ctx.fillStyle = o.c || '#fff'; ctx.textBaseline = 'alphabetic';
    const sx = o.sx || 1; const w = ctx.measureText(s).width * sx; const x0 = o.align === 'center' ? x - w / 2 : x; ctx.translate(x0, y); ctx.scale(sx, 1); ctx.fillText(s, 0, 0); ctx.restore(); return w; };
  if (kind === 'ATF') {
    const x = 560; let w;
    w = txt('A', x, 395, 330, { sx: 0.95 }); txt('TTENTION', x + w + 6, 395, 150, { sx: 0.95 });
    w = txt('T', x, 690, 330, { sx: 0.95 }); txt('ENSOR', x + w + 6, 690, 150, { sx: 0.95 });
    txt('FIELD', x - 6, 985, 330, { sx: 0.95 });
  } else if (kind === 'TEST SET') txt('TEST SET', W / 2, 640, 300, { align: 'center', f: '"Roboto Condensed"', sx: 0.9 });
  else if (kind === 'EVAL-01') txt('EVAL-01', W / 2, 700, 420, { align: 'center', f: '"Roboto Condensed"', sx: 0.82 });
  else if (kind === 'PRIORS') txt('PRIORS', W / 2, 680, 400, { align: 'center', f: '"Roboto Condensed"', sx: 0.9 });
  else if (kind === 'TOKYO-3') txt('TOKYO-3', W / 2, 700, 400, { align: 'center', f: '"Roboto Condensed"', sx: 0.86 });
  else if (kind === 'PROTOTYPE') { txt('PROTOTYPE', W / 2, 330, 130, { align: 'center', sx: 0.95 }); txt('EVAL-00', W / 2, 860, 420, { align: 'center', f: '"Roboto Condensed"', sx: 0.8 }); }
  else if (kind === 'PRODUCTION') { txt('PRODUCTION', W / 2, 300, 125, { align: 'center', sx: 0.95 }); txt('MODEL', W / 2, 420, 125, { align: 'center', sx: 0.95 }); txt('EVAL-02', W / 2, 900, 420, { align: 'center', f: '"Roboto Condensed"', sx: 0.8 }); }
  else if (kind === 'SECOND IMPACT') { txt('SECOND', W / 2, 430, 320, { align: 'center', c: '#ff1a2a', sx: 0.9 }); txt('IMPACT', W / 2, 930, 320, { align: 'center', c: '#ff1a2a', sx: 0.9 }); }
  else if (kind === 'ADAM') txt('ADAM', W / 2, 700, 440, { align: 'center', c: '#050505', sx: 0.92 });
}

// ── document: 極秘 / 次トークン補完計画 ────────────────────────────────────────────────────────
export function documentCard(ctx, lt) {
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(1 + lt * 0.3, 1 + lt * 0.3); ctx.translate(-W / 2, -H / 2);
  ctx.fillStyle = '#f2f0ea'; ctx.fillRect(360, 60, 1200, 960);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 5; ctx.strokeRect(392, 92, 1136, 896);
  ctx.lineWidth = 4; ctx.strokeRect(830, 130, 260, 120);
  jp(ctx, '極秘', 960, 225, 96, { align: 'center', color: '#111', sx: 0.95 });
  jp(ctx, '次トークン補完計画', 960, 470, 150, { align: 'center', color: '#111', sx: 0.82 });
  jp(ctx, '第７版中間報告', 960, 650, 104, { align: 'center', color: '#111', sx: 0.86 });
  jp(ctx, 'arXiv:1706.03762v7 [cs.CL]', 960, 800, 40, { align: 'center', color: '#111', weight: 700, sx: 0.9, family: '"Liberation Serif"' });
  jp(ctx, '初版 二〇一七年六月十二日', 960, 870, 40, { align: 'center', color: '#111', weight: 700, sx: 0.9 });
  jp(ctx, '取扱注意', 960, 940, 40, { align: 'center', color: '#111', weight: 700, sx: 0.9 });
  ctx.restore();
}

// ── NABLA emblem (original org mark: ∇ with a motto) ─────────────────────────────────────────
export function nabla(ctx) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const R = '#e0141e'; ctx.fillStyle = R; ctx.strokeStyle = R;
  ctx.save(); ctx.translate(W / 2, H / 2 - 20);
  ctx.beginPath(); ctx.moveTo(-330, -300); ctx.lineTo(330, -300); ctx.lineTo(0, 300); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(-170, -212); ctx.lineTo(250, -212); ctx.lineTo(10, 188); ctx.closePath(); ctx.fill();
  ctx.fillStyle = R; ctx.font = '700 170px "Liberation Serif"'; ctx.textAlign = 'center'; ctx.save(); ctx.scale(1.25, 1); ctx.fillText('NABLA', 0, 20); ctx.restore();
  ctx.font = 'italic 500 38px "EB Garamond"'; ctx.fillText("Grad's in his heaven — all's right with the world", 0, 400);
  ctx.restore(); ctx.textAlign = 'left';
}

// ── green data grid (MAGI style): the attention matrix, printed ──────────────────────────────
export function dataGrid(ctx, lt, head = 1) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const A = CACHE.attn[head]; const n = A.length;
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(1.02 + lt * 0.1, 1.02 + lt * 0.1); ctx.translate(-W / 2, -H / 2);
  const x0 = 170, y0 = 110, cw = 158, ch = 84;
  ctx.strokeStyle = '#1b9a3c'; ctx.lineWidth = 2;
  for (let i = 0; i <= n; i++) { ctx.beginPath(); ctx.moveTo(x0, y0 + i * ch); ctx.lineTo(x0 + n * cw, y0 + i * ch); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x0 + i * cw, y0); ctx.lineTo(x0 + i * cw, y0 + n * ch); ctx.stroke(); }
  ctx.font = '400 40px "Share Tech Mono"'; ctx.textAlign = 'center';
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = A[i][j]; if (j > i) { ctx.fillStyle = '#0c3a18'; ctx.fillText('-inf', x0 + j * cw + cw / 2, y0 + i * ch + 56); continue; }
    ctx.fillStyle = v > 0.5 ? '#eaffea' : v > 0.1 ? '#35ff6a' : '#1b9a3c'; ctx.fillText(v.toFixed(2), x0 + j * cw + cw / 2, y0 + i * ch + 56);
  }
  ctx.fillStyle = '#ff8a1a'; ctx.font = '400 30px "Share Tech Mono"'; ctx.textAlign = 'left';
  ctx.fillText(`HEAD ${head + 1}  W_Q = 3·R(${-[0, -1, -2, -3][head]})  d = 64  softmax(qk/√d)`, x0, y0 + n * ch + 50);
  ctx.restore();
}

// ── wings of light (64.0–66.8) ─────────────────────────────────────────────────────────────
export function wings(ctx, x, y, s, a, t) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {
    const ang = -Math.PI / 2 + side * (0.25 + i * 0.16) + Math.sin(t * 2 + i) * 0.015; const len = s * (1.1 - Math.abs(i - 3) * 0.08);
    const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len * 0.8;
    const cx1 = x + Math.cos(ang + side * 0.5) * len * 0.5, cy1 = y + Math.sin(ang + side * 0.5) * len * 0.3;
    const g = ctx.createLinearGradient(x, y, ex, ey); g.addColorStop(0, `rgba(255,250,210,${a})`); g.addColorStop(0.4, `rgba(255,200,60,${0.8 * a})`); g.addColorStop(1, 'rgba(255,120,20,0)');
    ctx.strokeStyle = g; ctx.lineWidth = s * 0.028 * (1 - i * 0.05); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(cx1, cy1, ex, ey); ctx.stroke();
    for (let k = 1; k < 4; k++) { const tt = 0.3 + k * 0.17; const px = (1 - tt) ** 2 * x + 2 * (1 - tt) * tt * cx1 + tt * tt * ex, py = (1 - tt) ** 2 * y + 2 * (1 - tt) * tt * cy1 + tt * tt * ey;
      ctx.lineWidth = s * 0.012; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(ang - side * 0.9) * s * 0.12, py + Math.sin(ang - side * 0.9) * s * 0.1); ctx.stroke(); }
  }
  ctx.restore();
}

// ── red finale: painted red ground + dark scrawled Adam update rule ─────────────────────────
export function redFinal(ctx, lt) {
  if (!CACHE.red) {
    const c = mk(W, H), g = c.getContext('2d');
    g.fillStyle = '#b8161b'; g.fillRect(0, 0, W, H);
    const r = rng(9);
    for (let i = 0; i < 60; i++) { const x = r() * W, y = r() * H, s = 80 + r() * 260; const gr = g.createRadialGradient(x, y, 0, x, y, s); const d = r() < 0.5; gr.addColorStop(0, d ? 'rgba(70,0,6,0.5)' : 'rgba(230,50,40,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - s, y - s, 2 * s, 2 * s); }
    g.save(); g.fillStyle = 'rgba(55,4,8,0.62)'; g.font = '400 150px "Zen Kurenaido"';
    const lines = ['m ← β₁m + (1−β₁) g', 'v ← β₂v + (1−β₂) g²', 'θ ← θ − α m̂ / (√v̂ + ε)'];
    lines.forEach((s, i) => { g.save(); g.translate(40 + i * 60, 260 + i * 330); g.rotate(-0.04 + i * 0.03); g.scale(1.25, 1.35); g.fillText(s, 0, 0); g.restore(); });
    g.restore();
    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(20,0,0,0.75)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    CACHE.red = c;
  }
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(1.02 + lt * 0.01, 1.02 + lt * 0.01); ctx.drawImage(CACHE.red, -W / 2, -H / 2); ctx.restore();
}

// ── satellite labels for SECOND IMPACT (A.D. 2012) ─────────────────────────────────────────
export function satelliteLabels(ctx, lt) {
  ctx.save();
  ctx.fillStyle = '#d0141e'; ctx.fillRect(70, 60, 360, 150);
  ctx.fillStyle = '#fff'; ctx.font = '700 30px "Roboto Condensed"'; ctx.fillText('ILSVRC-2012 VALIDATION', 88, 100);
  ctx.font = '700 84px "Roboto Condensed"'; ctx.fillText('A.D. 2012', 88, 186);
  ctx.strokeStyle = '#ff3040'; ctx.lineWidth = 3; ctx.strokeRect(1500, 900, 360, 110);
  ctx.fillStyle = '#ff3040'; ctx.font = '700 48px "Roboto Condensed"'; ctx.fillText('EPOCH 90', 1530, 972);
  ctx.font = '400 26px "Share Tech Mono"'; ctx.fillText('GTX 580 3GB ×2', 1530, 1002);
  ctx.font = '700 40px "Roboto Condensed"'; ctx.fillStyle = '#fff'; ctx.fillText('TOP-5 ERROR  26.2% → 15.3%', 88, 1000);
  ctx.restore();
}
