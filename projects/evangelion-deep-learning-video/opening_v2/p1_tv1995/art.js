// ─────────────────────────────────────────────────────────────────────────────
//  p1_tv1995 · background art, painted once at init (seeded → deterministic).
//  Painted-sky language of a 1995 TV series: banded skies, 3-tone cel cumulus,
//  soft airbrushed red clouds, copper-plate engraving, smoke, light bars.
// ─────────────────────────────────────────────────────────────────────────────
const ART = {};

// ── fbm value noise fields (computed at low res, upscaled by bilinear drawImage) ──
function noiseGrid(n, seed) { const R = rngFor(seed); const a = new Float32Array(n * n); for (let i = 0; i < n * n; i++) a[i] = R(); return a; }
const _NG = {};
function vn2(x, y, seed) {
  const n = 64, g = _NG[seed] || (_NG[seed] = noiseGrid(n, seed));
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const X0 = ((xi % n) + n) % n, Y0 = ((yi % n) + n) % n, X1 = (X0 + 1) % n, Y1 = (Y0 + 1) % n;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = g[Y0 * n + X0], b = g[Y0 * n + X1], c = g[Y1 * n + X0], d = g[Y1 * n + X1];
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
function fbm2(x, y, oct, seed) { let s = 0, amp = 0.5, f = 1, norm = 0; for (let o = 0; o < oct; o++) { s += amp * vn2(x * f, y * f, seed + o * 17); norm += amp; amp *= 0.5; f *= 2.03; } return s / norm; }
/** render a colour field fn(u,v)->[r,g,b,a] into a w×h canvas */
function fieldCanvas(w, h, fn) {
  const c = mkCanvas(w, h), g = c.getContext('2d'); const im = g.createImageData(w, h); const d = im.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = fn(x / w, y / h, x, y); const i = (y * w + x) * 4; d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = p[3] ?? 255; }
  g.putImageData(im, 0, 0); return c;
}
function upscale(src, w, h) { const c = mkCanvas(w, h), g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, w, h); return c; }
function rampCol(stops, k) {
  k = clamp(k); let i = 0; while (i < stops.length - 2 && k > stops[i + 1][0]) i++;
  const [k0, c0] = stops[i], [k1, c1] = stops[i + 1]; const u = clamp((k - k0) / (k1 - k0));
  return [lerp(c0[0], c1[0], u), lerp(c0[1], c1[1], u), lerp(c0[2], c1[2], u)];
}

/** one cel cumulus: shadow union → mid tone → highlight, each clipped to the union (source-atop) */
function paintCloud(w, h, seed, pal, o = {}) {
  const pad = 40;
  const c = mkCanvas(Math.ceil(w + pad * 2), Math.ceil(h + pad * 2)), g = c.getContext('2d');
  const R = rngFor(seed);
  const puffs = [];
  const n = o.n || Math.max(5, Math.round(w / h * 3.2));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n + (R() - 0.5) * 0.5 / n;
    const env = Math.sin(Math.PI * clamp(u, 0.02, 0.98)) ** (o.envP ?? 0.7);   // taller in the middle
    const r = h * (0.18 + 0.34 * env) * (0.75 + 0.5 * R());
    const x = pad + u * w;
    const y = pad + h - r * (0.55 + 0.35 * R()) - (o.flatBase === false ? R() * h * 0.2 : 0);
    puffs.push([x, y, r]);
  }
  // small secondary puffs on top
  for (let i = 0; i < (o.tops ?? Math.round(n * 0.7)); i++) {
    const p = puffs[Math.floor(R() * n)];
    puffs.push([p[0] + (R() - 0.5) * p[2], p[1] - p[2] * (0.35 + 0.3 * R()), p[2] * (0.35 + 0.35 * R())]);
  }
  const base = pad + h;
  const unionPath = () => { g.beginPath(); for (const [x, y, r] of puffs) { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); } };
  g.save();
  g.beginPath(); g.rect(0, 0, c.width, base + (o.baseSoft ?? 0)); g.clip();
  unionPath(); g.fillStyle = pal[0]; g.fill();
  g.restore();
  g.globalCompositeOperation = 'source-atop';
  const lx = o.lx ?? -0.16, ly = o.ly ?? -0.26;
  for (const [x, y, r] of puffs) { g.beginPath(); g.arc(x + r * lx * 0.6, y + r * ly * 0.6, r * 0.9, 0, Math.PI * 2); g.fillStyle = pal[1]; g.fill(); }
  for (const [x, y, r] of puffs) { g.beginPath(); g.arc(x + r * lx * 1.3, y + r * ly * 1.25, r * 0.68, 0, Math.PI * 2); g.fillStyle = pal[2]; g.fill(); }
  if (pal[3]) for (const [x, y, r] of puffs) { if (R() < 0.6) { g.beginPath(); g.arc(x + r * lx * 1.9, y + r * ly * 1.9, r * 0.38, 0, Math.PI * 2); g.fillStyle = pal[3]; g.fill(); } }
  // flat under-shadow band
  if (o.under) { g.fillStyle = o.under; g.fillRect(0, base - h * 0.16, c.width, h * 0.2); }
  g.globalCompositeOperation = 'source-over';
  return c;
}
/** soften a canvas (painted edge) */
function softened(src, px) {
  const k = 1 / (1 + px * 0.7);
  const s = mkCanvas(Math.ceil(src.width * k), Math.ceil(src.height * k)); s.getContext('2d').drawImage(src, 0, 0, s.width, s.height);
  return upscale(s, src.width, src.height);
}

// ── 23.4–37.9 / 86.1–: summer sky ───────────────────────────────────────────
function buildSky() {
  const w = 2600, h = 1500;
  const c = mkCanvas(w, h), g = c.getContext('2d');
  bandSky(g, 0, 0, w, h, [[0, '#0c2478'], [0.4, '#16389c'], [0.75, '#2552b8'], [1, '#3c6cc8']], 12, 3, 10);
  const clouds = mkCanvas(w, h), cg = clouds.getContext('2d');
  const R = rngFor(77);
  const pal = ['#6a80bc', '#a9b9e2', '#e9eefb', '#ffffff'];
  // few, big, flat-bottomed masses + long wisps (the sky is mostly deep blue)
  const spots = [[-80, 560, 900, 230, 0.95], [1450, 420, 700, 170, 0.9], [300, 1180, 1200, 300, 0.95], [1650, 1260, 1000, 260, 0.92], [2150, 760, 520, 140, 0.85], [900, 820, 420, 110, 0.8]];
  spots.forEach(([x, y, cw, ch, al], i) => {
    const cl = softened(paintCloud(cw, ch, 100 + i, pal, { envP: 0.9, n: Math.round(cw / ch * 2.2) }), 2.2);
    cg.globalAlpha = al; cg.drawImage(cl, x - 40, y - ch - 40); cg.globalAlpha = 1;
  });
  // wisps: stretched soft streaks
  cg.save();
  for (let i = 0; i < 16; i++) {
    const x = R() * w, y = 250 + R() * (h - 300), L = 200 + R() * 500;
    cg.globalAlpha = 0.18 + R() * 0.22; cg.fillStyle = '#dfe7fb';
    cg.beginPath(); cg.ellipse(x, y, L, 6 + R() * 12, (R() - 0.5) * 0.08, 0, Math.PI * 2); cg.fill();
  }
  cg.restore();
  g.drawImage(softened(clouds, 1.2), 0, 0);
  ART.sky = c; ART.skyClouds = clouds;
  // a sparse drifting cloud layer for the double exposure over the Transformer being
  const ov = mkCanvas(2000, 1200), og = ov.getContext('2d');
  [[80, 480, 700, 180], [1100, 760, 640, 190], [420, 1150, 800, 230]].forEach(([x, y, cw, ch], i) => {
    og.drawImage(softened(paintCloud(cw, ch, 300 + i, ['#8497cc', '#c8d4f2', '#f6f8ff', '#ffffff'], { envP: 0.9 }), 4), x, y - ch);
  });
  ART.skyOver = ov;
}

// ── 37.9–48.4: sunset (painted bands + airbrushed golden streaks, posterised) ──
function buildSunset() {
  const sky = [[0, [150, 40, 22]], [0.3, [200, 72, 26]], [0.6, [232, 120, 40]], [0.85, [246, 160, 64]], [1, [250, 186, 90]]];
  const c = fieldCanvas(500, 350, (u, v) => {
    const band = Math.floor(v * 11) / 11;                         // painted bands
    let col = rampCol(sky, band + (fbm2(u * 3, v * 3, 2, 91) - 0.5) * 0.05);
    const n = fbm2(u * 2.2 + 3, v * 7.5, 5, 93) + (fbm2(u * 6, v * 16, 3, 95) - 0.5) * 0.25;
    const m = clamp((n - 0.5) * 5);
    if (m > 0) {
      const lit = fbm2(u * 2.2 + 3, v * 7.5 - 0.06, 5, 93) - n;       // lighter on the upper edge
      const tone = m > 0.66 ? (lit > -0.005 ? [255, 214, 120] : [248, 168, 70]) : m > 0.3 ? [236, 132, 48] : [206, 88, 34];
      col = col.map((x, i) => lerp(x, tone[i], Math.min(1, m * 1.4)));
    }
    return col;
  });
  ART.sunset = upscale(c, 2000, 1400);
}

// ── 2.4–7.3: red roiling clouds (airbrushed, domain-warped fbm) ─────────────
function buildRed() {
  const mk = (seed) => upscale(fieldCanvas(400, 300, (u, v) => {
    const wx = fbm2(u * 3 + 5, v * 3, 3, seed) * 2.2, wy = fbm2(u * 3, v * 3 + 9, 3, seed + 3) * 2.2;
    const n = fbm2(u * 3.2 + wx, v * 3.2 + wy, 5, seed + 7);
    return rampCol([[0, [90, 0, 4]], [0.36, [150, 4, 8]], [0.5, [212, 16, 12]], [0.66, [240, 40, 18]], [0.8, [255, 90, 40]], [1, [255, 150, 90]]], (n - 0.2) * 1.55);
  }), 2000, 1500);
  ART.redA = mk(11); ART.redB = mk(12);
}

// ── 10.4–14.1: blue water light (swirled fbm, posterised like painted cels) ──
function buildCaustic() {
  const s = 800;
  const c = fieldCanvas(s, s, (u, v) => {
    const x = u - 0.5, y = v - 0.5, r = Math.hypot(x, y), a = Math.atan2(y, x);
    const sw = a + r * 7.5;                                   // swirl
    const n = fbm2(Math.cos(sw) * r * 6 + 10, Math.sin(sw) * r * 6 + 10, 5, 23);
    const edge = 0.36 + (fbm2(Math.cos(a) * 1.5 + 3, Math.sin(a) * 1.5 + 3, 3, 29) - 0.5) * 0.16;
    const m = clamp((edge - r) / 0.03);
    let k = n * 1.1 + (0.4 - r) * 0.9;
    k = Math.floor(k * 6) / 6;                                // painted bands
    const col = rampCol([[0, [18, 90, 210]], [0.45, [40, 150, 240]], [0.7, [110, 210, 255]], [0.9, [190, 240, 255]], [1, [235, 252, 255]]], k);
    return [col[0], col[1], col[2], 255 * m];
  });
  ART.caustic = upscale(c, 1600, 1600);
}

// ── 14.1–15.9: grey smoke (fbm, overexposed) ────────────────────────────────
function buildSmoke() {
  ART.smoke = upscale(fieldCanvas(480, 360, (u, v) => {
    const wx = fbm2(u * 2 + 1, v * 2, 3, 33) * 1.6;
    const n = fbm2(u * 3.5 + wx, v * 3.5 + wx * 0.5, 6, 37);
    const k = clamp((n - 0.28) * 2.0);
    const g = lerp(240, 60, k * k);
    return [g, g + 2, g + 3];
  }), 2400, 1800);
}

// ── 60–66.8 / 83.7–86.1: hot orange vertical light bars ─────────────────────
function buildBars() {
  const R = rngFor(41);
  const cols = [];
  for (let i = 0; i < 90; i++) cols.push(R());
  ART.bars = upscale(fieldCanvas(450, 60, (u, v) => {
    const n = fbm2(u * 22, v * 0.8, 3, 43), m = fbm2(u * 70, v * 0.5, 2, 47);
    const k = n * 0.75 + m * 0.35;
    return rampCol([[0, [170, 20, 6]], [0.35, [226, 60, 12]], [0.55, [245, 96, 20]], [0.72, [255, 140, 36]], [0.88, [255, 196, 90]], [1, [255, 236, 170]]], (k - 0.25) * 1.6);
  }), 1800, 1200);
}

// ── 88.2–90.5: red wall ─────────────────────────────────────────────────────
function buildRedWall() {
  ART.redWall = upscale(fieldCanvas(400, 300, (u, v) => {
    const wx = fbm2(u * 2.5, v * 2.5, 3, 53) * 1.5;
    const n = fbm2(u * 4 + wx, v * 4 - wx, 6, 57);
    const vg = 1 - 0.55 * ((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2;
    return rampCol([[0, [60, 4, 2]], [0.35, [130, 16, 6]], [0.55, [186, 36, 14]], [0.75, [214, 64, 26]], [1, [236, 110, 60]]], (n - 0.15) * 1.4 * vg);
  }), 1600, 1200);
}

ART.init = () => { buildSky(); buildSunset(); buildRed(); buildCaustic(); buildSmoke(); buildBars(); buildRedWall(); };
