// ─────────────────────────────────────────────────────────────────────────────
//  p4_rebuild — 2D layer: painted skies & cel clouds, typography, light FX.
//  Skies are painted once at init into large canvases and panned with the 3D camera.
// ─────────────────────────────────────────────────────────────────────────────
import * as WD from './world.js';

export const W = 1920, H = 1080;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = { io: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), out: (t) => 1 - Math.pow(1 - t, 3), in: (t) => t * t * t, outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)) };
export function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// ── cel cumulus: union of discs, 3 flat tones (light / body / shade), flat-ish base ───────────
function cumulus(g, x, y, w, h, pal, seed) { for (const ox of [-SW, 0, SW]) cumulus1(g, x + ox, y, w, h, pal, seed); }
function cumulus1(g, x, y, w, h, pal, seed) {
  const r = rng(seed); const discs = [];
  const n = 10 + Math.floor(r() * 6);
  for (let i = 0; i < n; i++) {           // main masses: a dome profile
    const t = (i + r() * 0.8) / n; const dome = Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.5) * 2, 2)));
    const rad = (0.13 + r() * 0.12) * w * (0.5 + 0.5 * dome);
    discs.push([x + (t - 0.5) * w * 0.92, y - dome * h * (0.45 + r() * 0.35) + rad * 0.55, rad]);
  }
  const big = discs.slice();
  for (const [cx, cy, rr] of big) {       // billows on the upper rim
    const m = 3 + Math.floor(r() * 4);
    for (let k = 0; k < m; k++) { const a = -Math.PI * (0.15 + 0.7 * r()); const q = rr * (0.3 + r() * 0.3); discs.push([cx + Math.cos(a) * rr * 0.85, cy + Math.sin(a) * rr * 0.85, q]); }
  }
  const path = (ox, oy, sc, list = discs) => { g.beginPath(); for (const [cx, cy, rr] of list) { g.moveTo(cx + ox + rr * sc, cy + oy); g.arc(cx + ox, cy + oy, rr * sc, 0, Math.PI * 2); } };
  g.save();
  g.beginPath(); g.rect(x - w * 2, y - h * 4, w * 4, h * 4 + h * 0.06); g.clip();       // flat base
  g.fillStyle = pal[2]; path(0, 0, 1); g.fill();
  g.save(); path(0, 0, 1); g.clip();
  g.fillStyle = pal[1]; path(-w * 0.025, -h * 0.1, 0.94); g.fill();
  g.fillStyle = pal[0]; path(-w * 0.05, -h * 0.2, 0.78, discs.filter((d, i) => i % 3 !== 1)); g.fill();
  // soft base shadow band
  const gb = g.createLinearGradient(0, y - h * 0.25, 0, y + h * 0.06); gb.addColorStop(0, 'rgba(0,0,0,0)'); gb.addColorStop(1, pal[3] || pal[2]);
  g.fillStyle = gb; g.fillRect(x - w, y - h * 0.25, w * 2, h * 0.31);
  g.restore(); g.restore();
}
function softCloud(g, x, y, w, h, rgb, a, seed) { // soft painted mass: radial-gradient blobs (no canvas filters: too slow)
  const r = rng(seed);
  for (let i = 0; i < 12; i++) {
    const px = x + (r() - 0.5) * w, py = y + (r() - 0.5) * h, rw = w * (0.14 + r() * 0.2), rh = h * (0.25 + r() * 0.35);
    for (const ox of [-SW, 0, SW]) {
      g.save(); g.translate(px + ox, py); g.scale(1, rh / rw);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rw); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(0.6, `rgba(${rgb},${a * 0.6})`); gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rw, 0, Math.PI * 2); g.fill(); g.restore();
    }
  }
}

// Sky canvases: SW wide × SH tall; horizon at row HZ. Panned by camera yaw/pitch.
const SW = 4600, SH = 2000, HZ = 1300;
export const SKY = {};
function paintSky(name) {
  const c = mk(SW, SH), g = c.getContext('2d');
  const grad = (stops) => { const gr = g.createLinearGradient(0, 0, 0, HZ + 200); for (const [p, cc] of stops) gr.addColorStop(p, cc); g.fillStyle = gr; g.fillRect(0, 0, SW, SH); };
  if (name === 'day') {
    grad([[0, '#1d4fb8'], [0.45, '#2f6fd4'], [0.8, '#79a8e4'], [1, '#b7d2ef']]);
    const pal = ['#ffffff', '#e2eaf5', '#a6bbdb', '#8ea6cc'];
    const r = rng(11);
    for (let i = 0; i < 9; i++) cumulus(g, (i + 0.3 + r() * 0.4) * SW / 9, HZ - 20 - r() * 120, 520 + r() * 520, 300 + r() * 320, pal, 100 + i);
    for (let i = 0; i < 7; i++) cumulus(g, (i + r()) * SW / 7, 520 + r() * 480, 300 + r() * 380, 140 + r() * 150, pal, 300 + i);
  } else if (name === 'sunset') {
    grad([[0, '#b8412e'], [0.35, '#e0662e'], [0.75, '#f39a3e'], [1, '#ffd27a']]);
    const pal = ['#ffe0a0', '#f5a560', '#c85a44'];
    const r = rng(21);
    for (let i = 0; i < 10; i++) cumulus(g, (i + r()) * SW / 10, HZ - 40 - r() * 160, 480 + r() * 520, 220 + r() * 260, pal, 500 + i);
    for (let i = 0; i < 9; i++) cumulus(g, (i + r()) * SW / 9, 420 + r() * 520, 360 + r() * 400, 90 + r() * 110, ['#ffd296', '#ee9458', '#b8503e'], 700 + i);
    const sun = g.createRadialGradient(SW * 0.62, HZ - 70, 10, SW * 0.62, HZ - 70, 160); sun.addColorStop(0, '#fff6d8'); sun.addColorStop(0.5, '#ffe8a8'); sun.addColorStop(1, 'rgba(255,220,140,0)');
    g.fillStyle = sun; g.beginPath(); g.arc(SW * 0.62, HZ - 70, 160, 0, Math.PI * 2); g.fill();
  } else if (name === 'predawn') {
    grad([[0, '#3a0610'], [0.5, '#7a0d18'], [0.85, '#b01a1c'], [1, '#d23a24']]);
    const r = rng(31);
    for (let i = 0; i < 34; i++) softCloud(g, r() * SW, 150 + r() * (HZ - 150), 700 + r() * 800, 200 + r() * 260, i % 3 ? '58,4,12' : '214,44,38', i % 3 ? 0.5 : 0.4, 900 + i);
  } else if (name === 'blue') {
    grad([[0, '#020a24'], [0.6, '#06184a'], [1, '#12357a']]);
    const r = rng(41); g.fillStyle = '#dbe6ff';
    for (let i = 0; i < 520; i++) { const s = r() < 0.08 ? 2.4 : 1.3; g.globalAlpha = 0.35 + r() * 0.6; g.fillRect(r() * SW, r() * HZ, s, s); }
    g.globalAlpha = 1;
  } else if (name === 'dusk') {
    grad([[0, '#2a1438'], [0.4, '#7a2a44'], [0.8, '#d0583a'], [1, '#f08a48']]);
    const r = rng(51);
    for (let i = 0; i < 8; i++) cumulus(g, (i + r()) * SW / 8, HZ - 60 - r() * 200, 500 + r() * 400, 160 + r() * 200, ['#f6a070', '#b8604e', '#6a3448'], 1100 + i);
  } else if (name === 'grey') {
    grad([[0, '#6c6c70'], [1, '#b0aeaa']]);
  }
  return c;
}
// draw the sky panned with the current three camera
export function sky(ctx, name, o = {}) {
  const img = SKY[name]; const cam = WD.camera;
  const dir = new WD.THREE.Vector3(); cam.getWorldDirection(dir);
  const yaw = Math.atan2(dir.x, -dir.z), pitch = Math.asin(Math.max(-1, Math.min(1, dir.y)));
  const vfov = (cam.fov * Math.PI) / 180, pxPerRad = H / vfov * 0.85;
  const hzY = H / 2 + pitch * pxPerRad + (o.dy || 0);
  let x0 = -((yaw * pxPerRad + (o.dx || 0)) % SW); if (x0 > 0) x0 -= SW;
  const y0 = hzY - HZ;
  ctx.save();
  const roll = Math.atan2(cam.up.x, cam.up.y);
  if (roll) { ctx.translate(W / 2, H / 2); ctx.rotate(-roll); ctx.translate(-W / 2, -H / 2); }
  for (let x = x0 - SW; x < W + SW; x += SW) ctx.drawImage(img, x, y0);
  if (y0 > 0) { ctx.fillStyle = o.top || '#000'; ctx.drawImage(img, 0, 0, SW, 2, x0, y0 - 2000, SW * 3, 2000); }
  ctx.restore();
}

// ── typography ─────────────────────────────────────────────────────────────────────────────
export const MIN = '"Noto Serif CJK JP"';
export function jp(ctx, str, x, y, size, o = {}) {
  ctx.save();
  ctx.font = `${o.weight || 900} ${size}px ${o.family || MIN}`;
  ctx.textBaseline = o.base || 'alphabetic'; ctx.fillStyle = o.color || '#f6f4ee';
  const sx = o.sx ?? 0.86; const wdt = ctx.measureText(str).width * sx + (o.track || 0) * (str.length - 1);
  let x0 = x; if (o.align === 'right') x0 = x - wdt; else if (o.align === 'center') x0 = x - wdt / 2;
  ctx.translate(x0, y); ctx.scale(sx, o.sy || 1);
  if (o.track) { let cx = 0; for (const ch of str) { ctx.fillText(ch, cx, 0); cx += ctx.measureText(ch).width + o.track / sx; } }
  else ctx.fillText(str, 0, 0);
  ctx.restore();
  return wdt;
}
export function jpW(ctx, str, size, o = {}) { ctx.save(); ctx.font = `${o.weight || 900} ${size}px ${o.family || MIN}`; const w = ctx.measureText(str).width * (o.sx ?? 0.86); ctx.restore(); return w; }
export function vert(ctx, str, x, y, size, o = {}) { let yy = y; for (const ch of str) { jp(ctx, ch, x, yy, size, { ...o, align: 'center', base: 'top' }); yy += size * (o.lead || 1.02); } }

// ── light FX (the only places bloom/additive light is allowed) ───────────────────────────────
export function crossBurst(ctx, x, y, s, a, o = {}) { // Eva cross explosion: tall column + bar
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
  const core = o.core || '#fffbe8', edge = o.edge || '#ffb030';
  const bar = (w, h) => { const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.3, edge); g.addColorStop(0.5, core); g.addColorStop(0.7, edge); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - w / 2, y - h / 2, w, h); };
  bar(s * 0.22, s * 3.2);
  ctx.save(); ctx.translate(x, y - s * (o.barY ?? 0.35)); ctx.rotate(Math.PI / 2); ctx.translate(-x, -y); bar(s * 0.16, s * 1.6); ctx.restore();
  ctx.restore();
}
export function flareH(ctx, x, y, len, a, color = '120,190,255') { // anamorphic horizontal flare
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [h, al] of [[90, 0.10], [36, 0.25], [12, 0.6], [3.5, 1]]) {
    const g = ctx.createLinearGradient(x - len, 0, x + len, 0);
    g.addColorStop(0, `rgba(${color},0)`); g.addColorStop(0.5, `rgba(${color},${al * a})`); g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, len, h, 0, 0, Math.PI * 2); ctx.fill();
  }
  const cg = ctx.createRadialGradient(x, y, 0, x, y, 120); cg.addColorStop(0, `rgba(255,255,255,${a})`); cg.addColorStop(0.3, `rgba(${color},${0.5 * a})`); cg.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = cg; ctx.fillRect(x - 120, y - 120, 240, 240);
  ctx.restore();
}

export async function initPaint() {
  for (const n of ['day', 'sunset', 'predawn', 'blue', 'dusk', 'grey']) SKY[n] = paintSky(n);
}
