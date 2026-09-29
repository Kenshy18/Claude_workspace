// ─────────────────────────────────────────────────────────────────────────────
//  p4_rebuild — the cut list. Every shot boundary sits on the 1995 OP's cut times
//  (opening_v2/shared/data/op_timing.json + op_cuts_detected.txt, frame-checked).
// ─────────────────────────────────────────────────────────────────────────────
import * as WD from './world.js';
import * as P from './paint.js';
import * as M from './mathml.js';
import * as A from './art.js';
import * as L from './logo.js';
import { credits, directorCard, productionCard } from './credits.js';
const { W, H, clamp, seg, lerp, ease, jp } = P;
export const TOTAL = 90.5;
const cx = M.S * 3, cz = -M.S * 2;           // Tokyo-3 = the (3,2) minimum
const G = WD.ground;
const OBJ = WD.OBJ, U = WD.U;
const vis = (...n) => { for (const k of n) OBJ[k].visible = true; };
const L3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const q = (t, fps = 12) => Math.floor(t * fps) / fps;                // limited-animation time (on twos)
function render3d(ctx, sky, o = {}) {
  if (o.shadow) WD.shadows(o.shadow.c || [cx, 30, cz], o.shadow.s || 260);
  if (sky) P.sky(ctx, sky, o.skyO || {});
  else if (o.bg) { ctx.fillStyle = o.bg; ctx.fillRect(0, 0, W, H); }
  ctx.imageSmoothingQuality = 'low'; ctx.drawImage(WD.render(), 0, 0, W, H);
}
function fill(ctx, c) { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); }
function shake(t, amp, rate = 30) { const h = (n) => { const x = Math.sin(n * 91.7 + 3.1) * 43758.5; return x - Math.floor(x) - 0.5; }; const f = Math.floor(t * rate); return [h(f) * amp, h(f + 57) * amp]; }
function vbars(ctx, t, o = {}) { // hot orange ground with vertical light bars (60–66.8, 83.7–86.1)
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, o.top || '#c8321a'); g.addColorStop(1, o.bot || '#f06a1e'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const r = P.rng(3);
  for (let i = 0; i < 22; i++) {
    const x = ((r() * W * 1.3 + t * (o.drift || 40) * (0.5 + r())) % (W * 1.3)) - W * 0.15, w = 20 + r() * 90, a = 0.25 + r() * 0.45;
    const gb = ctx.createLinearGradient(x, 0, x + w, 0); gb.addColorStop(0, 'rgba(255,190,80,0)'); gb.addColorStop(0.5, `rgba(255,${190 + r() * 50},${90 + r() * 60},${a})`); gb.addColorStop(1, 'rgba(255,190,80,0)');
    ctx.fillStyle = gb; ctx.fillRect(x, 0, w, H);
  }
}
function trailHead(ctx, k, tr, col, r = 14) {
  const i = Math.min(tr.P.length - 1, Math.floor(k)), j = Math.min(tr.P.length - 1, i + 1), f = k - i;
  const u = lerp(tr.P[i][0], tr.P[j][0], f), v = lerp(tr.P[i][1], tr.P[j][1], f);
  const p = WD.project(M.toWorld(u, v, 2.5)); if (p[2] > 1) return p;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 3); g.addColorStop(0, 'rgba(255,255,250,1)'); g.addColorStop(0.25, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], r * 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  return p;
}
// attention beams between the token towers: real softmax weights A[i][j]
const ATT = [0, -1, -2, -3].map((k) => M.attention(10, k, 3));
function beams(ctx, head, p, col = '255,244,214', o = {}) {
  const T = WD.CITYDATA.tokens, Am = ATT[head];
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < T.length; i++) for (let j = 0; j <= i; j++) {
    const w = Am[i][j]; if (w < 0.02) continue;
    const s = clamp((p * (T.length + 4) - i) / 2.5); if (s <= 0) continue;
    const a = WD.project([T[i].x, T[i].top + 2, T[i].z]), b = WD.project([T[j].x, T[j].top + 2, T[j].z]); if (a[2] > 1 || b[2] > 1) continue;
    ctx.strokeStyle = `rgba(${col},${Math.min(1, 0.25 + w * 1.1) * (o.a ?? 1)})`; ctx.lineWidth = 1.5 + w * 14;
    ctx.beginPath();
    if (i === j) { ctx.arc(a[0], a[1] - 26, 22 * s, 0, Math.PI * 2); }
    else {
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]); const c = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - d * 0.55];
      const N = 24, m = Math.max(1, Math.floor(N * s));
      ctx.moveTo(a[0], a[1]);
      for (let k = 1; k <= m; k++) { const u = k / N; ctx.lineTo((1 - u) ** 2 * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1]); }
    }
    ctx.stroke();
  }
  // token tower caps: query markers
  for (const t of T) { const a = WD.project([t.x, t.top + 2, t.z]); if (a[2] > 1) continue; ctx.fillStyle = `rgba(${col},0.95)`; ctx.beginPath(); ctx.arc(a[0], a[1], 6, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
// ring all-reduce over the 8 rank towers
function ringDraw(ctx, stepF, o = {}) {
  const R = WD.CITYDATA.ring, N = M.RING_N; const step = Math.floor(stepF), frac = stepF - step;
  const st = M.ringState(Math.min(step, 14)); const cur = M.ringState(Math.min(step + 1, 14));
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) U.uChunks.value[r * 8 + c] = st.st[r][c] / N;
  U.uRingOn.value = 1;
  return () => {
    ctx.save(); ctx.lineCap = 'round';
    for (let r = 0; r < N; r++) {
      const a = R[r], b = R[(r + 1) % N];
      const A2 = WD.project([a.x, a.top + 3, a.z]), B2 = WD.project([b.x, b.top + 3, b.z]); if (A2[2] > 1 || B2[2] > 1) continue;
      ctx.strokeStyle = 'rgba(255,160,60,0.55)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(A2[0], A2[1]); ctx.lineTo(B2[0], B2[1]); ctx.stroke();
      if (step < 14) { // packet in flight
        const px = lerp(A2[0], B2[0], frac), py = lerp(A2[1], B2[1], frac);
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(px, py, 0, px, py, 26); g.addColorStop(0, 'rgba(255,250,230,1)'); g.addColorStop(0.3, 'rgba(255,170,60,0.9)'); g.addColorStop(1, 'rgba(255,120,20,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, 26, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.font = '400 26px "Share Tech Mono"'; ctx.fillStyle = 'rgba(255,236,200,0.95)';
    const phase = step < 7 ? 'REDUCE-SCATTER' : step < 14 ? 'ALL-GATHER' : 'DONE';
    ctx.fillText(`RING ALL-REDUCE  N=8  STEP ${String(Math.min(step + 1, 14)).padStart(2, '0')}/14  ${phase}`, o.lx ?? 1150, o.ly ?? 1040);
    ctx.restore();
  };
}
// Unit-01 pose. Default = the hunched, predatory Eva stance (torso forward, head up, knees soft).
//  spread: arms out (rad) · elbow: forearm raise (rad, + = up/out) · reach: arm forward (−) · lean/twist: torso ·
//  nod/look: head · hip/knee (per side …L/…R): legs. Soles are kept on the ground analytically.
function unitPose(o = {}) {
  vis('unit'); const UN = WD.UNIT;
  const lean = o.lean ?? 0.11, spread = o.spread || 0, elbow = o.elbow ?? 0;
  UN.torso.rotation.set(lean, o.twist || 0, o.tilt || 0);
  UN.head.rotation.set(o.nod ?? -lean * 1.1, o.look || 0, o.roll || 0);
  let drop = 0;
  for (let i = 0; i < 2; i++) {
    const s = i ? 1 : -1, L = i ? 'R' : 'L';
    const sp = o['spread' + L] ?? spread, el = o['elbow' + L] ?? elbow, re = o['reach' + L] ?? (i ? 0 : o.reach || 0);
    UN.arms[i].rotation.set(re - lean * 0.75, 0, s * (0.07 + sp));
    UN.elbows[i].rotation.set(-(o.curl ?? 0.14), 0, s * el);
    UN.pylons[i].rotation.set(0, 0, -s * (0.1 + sp * 0.22));
    const hp = o['hip' + L] ?? o.hip ?? -0.07, kn = o['knee' + L] ?? o.knee ?? 0.16;
    UN.hips[i].rotation.set(hp, 0, s * 0.05); UN.knees[i].rotation.set(kn, 0, 0); UN.ankles[i].rotation.set(-(hp + kn), 0, 0);
    drop = Math.max(drop, 34.4 - (15.4 * Math.cos(hp) + 16.2 * Math.cos(hp + kn) + 2.8));
  }
  OBJ.unit.position.set(o.x || 0, (o.y || 0) - drop, o.z || 0); OBJ.unit.rotation.set(0, o.ry || 0, 0);
  UN.eyeMat.uniforms.uEmis.value = o.eyes ?? 1;
  UN.cable.visible = o.cable ?? true; UN.plug.visible = UN.cable.visible;
}
const UA = (n) => WD.unitAnchor(n);
// camera relative to a Unit anchor (offsets in world axes)
function camAt(anchor, off, lookOff = [0, 0, 0], fov = 35, roll = 0) { const a = UA(anchor); WD.setCam([a[0] + off[0], a[1] + off[1], a[2] + off[2]], [a[0] + lookOff[0], a[1] + lookOff[1], a[2] + lookOff[2]], fov, roll); }
const UNIT_CITY = [WD.UNIT_SPOT[0], 0, WD.UNIT_SPOT[1]];   // where Unit-01 stands in the city (chorus): a cleared plaza

// ── the cut list ─────────────────────────────────────────────────────────────────────────
const S = [];
const add = (t0, t1, name, draw) => S.push({ t0, t1, name, draw });

// INTRO (a cappella) — pre-dawn
add(0, 2.4, 'void', (ctx, lt) => {
  fill(ctx, '#000');
  const a = clamp((lt - 1.0) / 0.8); if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(960, 520, 0, 960, 520, 18); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.3, `rgba(255,190,190,${0.5 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(900, 460, 120, 120); ctx.restore();
});
add(2.4, 7.3, 'red_clouds', (ctx, lt, t, fx) => {   // deep red airbrushed cloud field, faint red line-art emblem (the L1 ball)
  A.redClouds(ctx, lt);
  const ea = clamp((lt - 1.9) / 1.2) * clamp((4.7 - lt) / 0.6);
  A.l1Emblem(ctx, 960, 470, 190, 0.36 * ea, t);
  fx.vig = 0.45; fx.flash = clamp(1 - lt / 0.5); fx.flashCol = [0, 0, 0]; fx.grain = 0.06;
});
add(7.3, 10.4, 'engraving', (ctx, lt, t, fx) => {
  const tq = q(lt, 6);                                                // the 1995 engraving push moves on 5s (6 drawings/s)
  const k = ease.io(tq / 3.1);
  const cam = L3([220, 1500, 950], [-60, 520, 260], k);
  WD.setCam(cam, [lerp(60, -30, k), 60, lerp(-160, -60, k)], 40, 0.25 - k * 0.35);
  A.engraving(ctx, tq, { reveal: 1 });
  fx.vig = 0.6; if (lt < 0.2) { fx.flash = 1 - lt / 0.2; fx.flashCol = [0.7, 0.05, 0.08]; }
});
add(10.4, 14.1, 'blue_core', (ctx, lt, t, fx) => {
  WD.mood('blue'); vis('terrain', 'octa'); U.uRiseT.value = 0;
  const o = WD.OCTA.pos; OBJ.octa.userData.mat.uniforms.uSpread.value = 1.5 + lt * 0.9;
  WD.setCam([o.x + 150 - lt * 8, o.y - 150, o.z + 190 - lt * 10], [o.x - 62, o.y - 2, o.z + 40], 36);
  render3d(ctx, 'blue', { skyO: { dy: 200 } });
  const c = WD.project([o.x, o.y, o.z]);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) { const rr = 90 + i * 42 + Math.sin(lt * 2 + i) * 10; ctx.strokeStyle = `rgba(90,170,255,${0.22 - i * 0.03})`; ctx.lineWidth = 18 - i * 2; ctx.beginPath(); ctx.ellipse(c[0], c[1], rr * 1.25, rr * 0.55, -0.35 + lt * 0.2 + i * 0.4, 0, Math.PI * 2); ctx.stroke(); }
  const g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], 140); g.addColorStop(0, 'rgba(210,235,255,0.9)'); g.addColorStop(0.35, 'rgba(80,150,255,0.45)'); g.addColorStop(1, 'rgba(0,40,120,0)');
  ctx.fillStyle = g; ctx.fillRect(c[0] - 140, c[1] - 140, 280, 280);
  const flashR = seg(lt, 3.45, 3.7); if (flashR > 0) { ctx.strokeStyle = `rgba(230,245,255,${1 - flashR * 0.4})`; ctx.lineWidth = 30; ctx.beginPath(); ctx.arc(c[0], c[1], 60 + flashR * 500, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
  fx.bloom = 0.7; fx.thr = 0.72;
});

// TITLE — band slam at 14.2
add(14.1, 15.9, 'slam', (ctx, lt, t, fx) => {
  A.smoke(ctx, lt);
  const k = lt / 1.8; A.darkCross(ctx, lerp(1500, 300, k), lerp(200, 900, k), 900 - k * 200, 0.4 + k * 1.3, clamp((1.3 - lt) / 0.2));
  if (lt > 1.15) { ctx.save(); ctx.globalAlpha = 0.45 * seg(lt, 1.15, 1.6); L.wordmark(ctx, 1, { color: '#6a6a6a' }); ctx.restore(); }
  fx.flash = lt < 0.1 ? 1 : clamp(1 - (lt - 0.1) / 0.25); fx.soft = 0.4;
});
add(15.9, 17.4, 'wordmark', (ctx, lt) => { fill(ctx, '#000'); L.wordmark(ctx, 1); });
add(17.4, 18.2, 'kana_blue', (ctx, lt, t, fx) => {
  fill(ctx, '#000'); L.wordmark(ctx, 1);
  if (lt < 0.1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(700, 0, 1100, 0); g.addColorStop(0, 'rgba(120,200,255,0)'); g.addColorStop(0.5, 'rgba(200,240,255,1)'); g.addColorStop(1, 'rgba(120,200,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(820, 0); ctx.lineTo(1100, 0); ctx.lineTo(990, H); ctx.lineTo(700, H); ctx.fill(); ctx.restore(); }
  L.kana(ctx, 'blue', 1, clamp(0.35 + lt * 1.4));
  fx.bloom = 0.9; fx.thr = 0.5;
});
add(18.2, 22.9, 'logo', (ctx, lt, t, fx) => {
  fill(ctx, '#000');
  L.wordmark(ctx, 1); L.kana(ctx, 'final', 1); L.shinseiki(ctx, clamp((t - 19.4) / 0.35));
  const fl = t - 19.0;
  if (fl > -0.1 && fl < 0.5) { const a = fl < 0.05 ? clamp((fl + 0.1) / 0.15) : clamp(1 - (fl - 0.05) / 0.45); P.flareH(ctx, 960, 430, 1100, a); fx.bloom = 0.8 * a; fx.thr = 0.6; }
  const rg = t - 21.0;
  if (rg > -0.05 && rg < 0.45) { const a = clamp(1 - rg / 0.45); const r = 820 - rg * 120; ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const [lw, al] of [[40, 0.18], [14, 0.5], [4, 1]]) { ctx.strokeStyle = `rgba(60,150,255,${al * a})`; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(960, 540, r, 0, Math.PI * 2); ctx.stroke(); } ctx.restore(); fx.bloom = 0.6 * a; fx.thr = 0.5; }
});
add(22.9, 23.4, 'x_flash', (ctx, lt, t, fx) => {
  fill(ctx, '#000'); ctx.save(); ctx.globalAlpha = 0.6; L.fullLogo(ctx, 1); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const ang of [0.62, -0.62]) { ctx.save(); ctx.translate(960, 540); ctx.rotate(ang); const g = ctx.createLinearGradient(0, -60, 0, 60); g.addColorStop(0, 'rgba(80,170,255,0)'); g.addColorStop(0.5, 'rgba(230,248,255,1)'); g.addColorStop(1, 'rgba(80,170,255,0)'); ctx.fillStyle = g; ctx.fillRect(-1400, -60, 2800, 120); ctx.restore(); }
  ctx.restore();
  fx.flash = clamp(lt / 0.22) * 0.9; fx.flashCol = [0.95, 0.97, 1]; fx.bloom = 1.0; fx.thr = 0.5;
});

// VERSE A — blue sky over the GPU city
add(23.4, 26.93, 'sky_tilt', (ctx, lt, t, fx) => {   // tilt down from open sky to the basin: towers still sunk (they rise next shot)
  WD.mood('day'); vis('terrain', 'city', 'octa'); U.uRiseT.value = -1; OBJ.octa.position.set(cx - 250, 300, cz - 380);
  const k = 0.12 * (lt / 2.2) * (lt < 2.2) + (lt >= 2.2) * (0.12 + 0.88 * ease.io(seg(lt, 2.2, 2.95))); const pos = [cx + 40, 0, cz + 300]; pos[1] = G(pos[0], pos[2]) + 26;
  WD.setCam(pos, [cx + lerp(-60, 30, k), lerp(900, 40, k), cz - 150], 36);
  render3d(ctx, 'day', { shadow: { s: 300 } });
});
add(26.93, 29.9, 'emergence', (ctx, lt, t, fx) => {   // towers rise on the warmup ramp; seen from the basin's southern rim
  WD.mood('day'); vis('terrain', 'city', 'octa'); U.uRiseT.value = lt * 1.7 - 0.1;
  const [sx, sy] = shake(t, lt < 2.4 ? 1.2 : 0.3, 20);
  const p = [cx + 70 + sx, 0, cz + 250]; p[1] = G(p[0], p[2]) + 6 + sy;
  WD.setCam(p, [cx - 20, 50, cz - 60], 34);
  render3d(ctx, 'day', { shadow: { s: 300 } });
});
add(29.9, 33.9, 'attention', (ctx, lt, t, fx) => {   // long lens from the south: tower tops + softmax beams against the sky
  WD.mood('day'); vis('terrain', 'city', 'octa');
  const T0 = WD.CITYDATA.tokens[0], T9 = WD.CITYDATA.tokens[9];
  const k = lt / 4.0; const mid = [lerp(T0.x, T9.x, 0.5), 0, lerp(T0.z, T9.z, 0.5)];
  const p = [mid[0] + 40 - k * 25, 0, mid[2] + 420]; p[1] = Math.max(G(p[0], p[2]), 20) + 14;
  WD.setCam(p, [mid[0] + 10 - k * 25, T0.top + 26, mid[2]], 17);
  U.uMode.value = 2; U.uSil.value.set(0.07, 0.09, 0.18);            // skyline in flat silhouette (the OP's black shapes on sky)
  render3d(ctx, 'day');
  const head = lt < 2.0 ? 1 : 2; const pp = lt < 2.0 ? lt / 1.4 : (lt - 2.0) / 1.4;
  beams(ctx, head, pp);
  ctx.font = '400 24px "Share Tech Mono"'; ctx.fillStyle = 'rgba(255,248,230,0.95)';
  ctx.fillText(`HEAD ${head + 1}/8   q = 3·R(-${head})·PE(p),  k = 3·PE(j),  d = 64`, 1180, 1040);
});
add(33.9, 37.9, 'ring', (ctx, lt, t, fx) => {
  WD.mood('day'); vis('terrain', 'city');
  const k = lt / 4.0;
  WD.setCam([cx + 70 - k * 30, 230, cz + 400 - k * 30], [cx - 95 - k * 20, 30, cz - 150], 34);
  const post = ringDraw(ctx, lt / 0.233);
  render3d(ctx, 'day', { shadow: { s: 300 } });
  post();
});

// VERSE B — sunset
add(37.9, 41.6, 'sunset_touch', (ctx, lt, t, fx) => {
  WD.mood('sunset'); vis('octa'); U.uMode.value = 2; U.uSil.value.set(0.06, 0.03, 0.06);
  const o = WD.OCTA.pos; OBJ.octa.userData.halo.visible = false; OBJ.octa.userData.haloInk.visible = false;
  const k = ease.out(clamp(lt / 1.4));
  OBJ.octa.position.set(o.x, o.y + lerp(95, 30, k), o.z);
  WD.setCam([o.x + 30, o.y - 60, o.z + 170], [o.x - 10, o.y - 10, o.z], 40);
  render3d(ctx, 'sunset', { skyO: { dy: 420, dx: 1400 } });
  if (t >= 39.3) A.tree(ctx, 960, 560, 900, clamp((t - 39.3) / 2.0), 0.95);
});
add(41.6, 48.4, 'race', (ctx, lt, t, fx) => {
  WD.mood('sunset'); vis('terrain', 'city', 'octa', 'trailSGD', 'trailAdam');
  const step = Math.min(300, 130 * lt / 6.8);
  OBJ.trailSGD.material.uniforms.uHead.value = step; OBJ.trailAdam.material.uniforms.uHead.value = step;
  const k = lt / 6.8;
  WD.setCam([cx + 150 - k * 30, 150 + k * 40, cz - 130 + k * 20], [lerp(40, 120, k), 60, lerp(-10, -90, k)], 30);
  render3d(ctx, 'sunset', { shadow: { c: [150, 40, -100], s: 420 }, skyO: { dx: 900 } });
  trailHead(ctx, step, M.TRAJ.adam, 'rgba(255,245,220,0.9)'); trailHead(ctx, step, M.TRAJ.sgd, 'rgba(255,90,60,0.9)');
  // loss readouts (real values along each run)
  const si = Math.min(300, Math.floor(step));
  ctx.font = '400 26px "Share Tech Mono"';
  ctx.fillStyle = '#fff4e0'; ctx.fillText(`ADAM  lr=0.08  step ${String(si).padStart(3, '0')}  f=${M.TRAJ.adam.L[si].toExponential(2)}`, 1150, 1000);
  ctx.fillStyle = '#ff8a6a'; ctx.fillText(`SGD+MOMENTUM μ=0.9  step ${String(si).padStart(3, '0')}  f=${M.TRAJ.sgd.L[si].toExponential(2)}`, 1150, 1036);
  fx.bloom = 0.35; fx.thr = 0.85;
});
add(48.4, 50.0, 'descent', (ctx, lt, t, fx) => {
  WD.mood('geo'); vis('geo'); U.uLed.value = 1;
  const y0 = WD.GEO.y0, k = lt / 1.6;
  if (lt < 0.8) { WD.setCam([0, y0 + WD.GEO.R + 900 - lt * 700, 0], [0.01, y0 + WD.GEO.R - 200 - lt * 700, 0.2], 60); render3d(ctx, null, { bg: '#120c0c' }); }
  else { const kk = ease.out((lt - 0.8) / 0.8); WD.setCam([60, y0 + lerp(640, 470, kk), 90], [0, y0 + 40, 0], lerp(70, 60, kk), 0.1); render3d(ctx, null, { bg: '#120c0c' }); }
  fx.tint = [1.08, 0.9, 1.0];
});
add(50.0, 50.83, 'core_eye', (ctx, lt, t, fx) => {
  WD.mood('dusk'); vis('octa'); const o = WD.OCTA.pos; OBJ.octa.userData.mat.uniforms.uSpread.value = 9;
  OBJ.octa.rotation.y = 0.785; WD.setCam([o.x, o.y + 1, o.z + 70 - lt * 12], [o.x, o.y, o.z], 34);
  render3d(ctx, null, { bg: '#1a0508' });
  const c = WD.project([o.x, o.y, o.z]); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], 300); g.addColorStop(0, 'rgba(255,90,70,0.8)'); g.addColorStop(1, 'rgba(255,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(c[0] - 300, c[1] - 300, 600, 600); ctx.restore();
  fx.bloom = 0.5; fx.thr = 0.7;
});
add(50.83, 51.4, 'gpu_detail', (ctx, lt, t, fx) => {   // "mechanical detail": the umbilical plug seated in the 12V-2×6 socket
  WD.mood('day'); unitPose({ eyes: 0, lean: 0.02, hip: 0, knee: 0 }); WD.U.uL.value.set(-0.5, 0.7, -0.5).normalize();
  camAt('socket', [-7.5 + lt * 3, 2.5, -9.5], [0.6, -0.6, -1.5], 36, 0.22);
  render3d(ctx, null, { bg: '#2f5a34' });
});
// PRE-CHORUS — Geofront, timer, cage
add(51.4, 51.83, 'plate', (ctx, lt) => A.plate(ctx, lt));
add(51.83, 52.5, 'timer', (ctx, lt) => A.timer(ctx, lt, 0.17));
add(52.5, 52.9, 'kv_grid', (ctx, lt) => A.kvGrid(ctx, lt));
add(52.9, 54.57, 'cage', (ctx, lt, t, fx) => {
  WD.mood('cage'); unitPose({ eyes: 0, lean: 0.03, hip: 0, knee: 0, spread: 0.05 }); vis('cage');
  const k = ease.io(lt / 1.67);
  WD.setCam([0, 6, 58], [0, lerp(36, 54, k), 0], 44);
  render3d(ctx, null, { bg: '#e2601e' });
});
add(54.57, 56.57, 'nvlink', (ctx, lt, t, fx) => {   // NVLink bridge clamps close on the temples (pilot's neural clips)
  WD.mood('cage'); unitPose({ eyes: lt > 1.35 ? 1 : 0, cable: false });
  WD.U.uL.value.set(0.2, 0.5, 0.9).normalize();
  const k = lt / 2.0;
  camAt('head', [0, 0.6, 21 - k * 4], [0, 0.4, 0], 30);
  render3d(ctx, null, { bg: '#2a0808' });
  const h = UA('head'), pl = WD.project([h[0] - 2.9, h[1] + 0.6, h[2] + 0.5]), pr = WD.project([h[0] + 2.9, h[1] + 0.6, h[2] + 0.5]);
  const c = clamp((lt - 0.05) / 0.6); ctx.save();
  for (const [s, p] of [[-1, pl], [1, pr]]) { const x = lerp(960 + s * 1000, p[0], ease.out(c)), y = p[1]; ctx.fillStyle = '#d8dce2'; ctx.strokeStyle = '#111'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + s * 190, y - 95); ctx.lineTo(x, y - 55); ctx.lineTo(x, y + 45); ctx.lineTo(x + s * 190, y + 85); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#78e650'; ctx.fillRect(x + s * 125 - 30, y - 22, 60, 36); ctx.strokeRect(x + s * 125 - 30, y - 22, 60, 36); }
  ctx.restore();
});
add(56.57, 58.4, 'silhouette_red', (ctx, lt, t, fx) => {
  WD.mood('cage'); unitPose({ eyes: 1, lean: 0.16, look: -0.25 }); U.uMode.value = 2; U.uSil.value.set(0.04, 0.02, 0.03); U.uLed.value = (lt > 1.0 && lt < 1.15) || lt > 1.55 ? 1 : 0.0;
  camAt('head', [16, -24, 30], [-2, -4, 0], 42, 0.12);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a0404'); g.addColorStop(1, '#8a1208'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  render3d(ctx, null);
  if (U.uLed.value > 0) { fx.bloom = 0.8; fx.thr = 0.6; }
});
add(58.4, 59.53, 'geo_hall', (ctx, lt, t, fx) => {
  WD.mood('geo'); vis('geo'); U.uLed.value = 1; U.uLedCol.value.set(1, 0.12, 0.08);
  const y0 = WD.GEO.y0; WD.setCam([-40 + lt * 20, y0 + 9, 120], [200, y0 + 14, 100], 44);
  render3d(ctx, null, { bg: '#0c0808' });
  const sweep = seg(lt, 0.3, 0.8); if (sweep > 0 && sweep < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const x = lerp(500, 1500, sweep); const g = ctx.createRadialGradient(x, 520, 0, x, 520, 90); g.addColorStop(0, 'rgba(255,80,60,0.9)'); g.addColorStop(1, 'rgba(255,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - 90, 430, 180, 180); ctx.restore(); fx.bloom = 0.5; }
});
add(59.53, 60.03, 'pale', (ctx, lt, t, fx) => {
  WD.mood('day'); vis('octa'); U.uMode.value = 1; const o = WD.OCTA.pos;
  WD.setCam([o.x + 20, o.y + 10, o.z + 150], [o.x, o.y, o.z], 38);
  render3d(ctx, null, { bg: '#9c9a96' });
});
add(60.03, 62.2, 'unit_close_a', (ctx, lt, t, fx) => {
  WD.mood('cage'); unitPose({ eyes: 1, look: 0.35, nod: -0.2 }); WD.U.uL.value.set(0.5, 0.6, 0.6).normalize();
  const a = lerp(-0.75, -0.45, lt / 2.17), h = UA('head');
  WD.setCam([h[0] + Math.sin(a) * 22, h[1] - 7 + lt, h[2] + Math.cos(a) * 22], [h[0] - 1, h[1] - 4, h[2]], 44, -0.1);
  vbars(ctx, t); render3d(ctx, null);
});
add(62.2, 64.03, 'unit_close_b', (ctx, lt, t, fx) => {
  WD.mood('cage'); unitPose({ eyes: 1, nod: -0.05 }); WD.U.uL.value.set(0.1, 0.5, 0.9).normalize();
  camAt('head', [0, -5.5, 27 - lt * 2.5], [0, -1.5, 0], 44);
  vbars(ctx, t); render3d(ctx, null);
});
add(64.03, 66.75, 'wings', (ctx, lt, t, fx) => {
  WD.mood('cage'); const sp = ease.out(clamp(lt / 0.5)); unitPose({ eyes: 1, lean: 0.03, hip: 0, knee: 0, nod: 0.05, spread: 0.2 + sp * 1.05, elbow: sp * 0.3, cable: false }); WD.U.uL.value.set(0, 0.4, 0.9).normalize();
  WD.setCam([0, 36, 140 - lt * 8], [0, 40, 0], 38);
  vbars(ctx, t, { top: '#b8281a', bot: '#f07a24' });
  const c = WD.project(UA('chest'));
  A.wings(ctx, c[0], c[1], 620 * clamp((lt - 0.3) / 0.6), 0.9, lt);
  render3d(ctx, null);
  fx.bloom = 0.6; fx.thr = 0.7;
});
// CHORUS — rapid montage (2–6 frame cuts on the original rhythm)
const cityDay = (ctx, camP, look, fov = 40, o = {}) => { WD.mood('day'); vis('terrain', 'city'); if (o.octa) vis('octa'); if (o.unit) unitPose({ ...o.unit, x: UNIT_CITY[0], y: G(UNIT_CITY[0], UNIT_CITY[2]) - 1, z: UNIT_CITY[2] }); WD.setCam(camP, look, fov, o.roll || 0); render3d(ctx, 'day', { shadow: { s: 300 }, skyO: o.skyO }); };
const UC = () => [UNIT_CITY[0], G(UNIT_CITY[0], UNIT_CITY[2]), UNIT_CITY[2]];
add(66.75, 67.33, 'c_unit_sky', (ctx, lt) => { const u = UC(); cityDay(ctx, [u[0] + 18 - lt * 10, u[1] + 40, u[2] + 30], [u[0], u[1] + 60, u[2]], 40, { unit: { eyes: 1, ry: 0.5 } }); });
add(67.33, 67.6, 'c_eyes', (ctx, lt, t, fx) => { WD.mood('cage'); unitPose({ eyes: 1, cable: false }); camAt('eyes', [0, 0.3, 7.5], [0, 0, 0], 30); render3d(ctx, null, { bg: '#140a1e' }); fx.bloom = 0.9; fx.thr = 0.5; });
add(67.6, 68.07, 'c_hand', (ctx, lt) => {   // the hand reaches for the lens
  WD.mood('day'); vis('terrain', 'city'); const u = UC();
  unitPose({ eyes: 1, x: u[0], y: u[1] - 1, z: u[2], ry: 0.3, reachR: -1.35 - lt * 0.25, elbowR: 0.1, curl: 0.35, look: 0.2 });
  const h = UA('handR'); WD.setCam([h[0] + 6, h[1] - 2, h[2] + 16 - lt * 4], [h[0] - 1, h[1] + 2, h[2]], 46, 0.12);
  render3d(ctx, 'day', { shadow: { s: 300 } });
});
add(68.07, 68.2, 'c_card_testset', (ctx) => A.card(ctx, 'TEST SET'));
add(68.2, 68.57, 'c_unit_city', (ctx, lt) => { const u = UC(); cityDay(ctx, [u[0] + 70, u[1] + 20, u[2] + 60], [u[0], u[1] + 40, u[2]], 36, { unit: { eyes: 1, ry: 0.7 } }); });
add(68.57, 68.7, 'c_card_eval01', (ctx) => A.card(ctx, 'EVAL-01'));
add(68.7, 69.0, 'c_unit_a', (ctx, lt) => { WD.mood('day'); unitPose({ eyes: 1, look: -0.3, twist: 0.1 }); camAt('head', [16, -12, 16], [0, -5, 0], 40, 0.2); render3d(ctx, 'day'); });
add(69.0, 69.17, 'c_unit_b', (ctx, lt) => { WD.mood('day'); unitPose({ eyes: 1, look: 0.4, nod: 0.1 }); camAt('head', [-14, 5, 13], [0, -2, 0], 40, -0.15); render3d(ctx, 'day'); });
add(69.17, 69.33, 'c_unit_c', (ctx, lt) => { WD.mood('day'); unitPose({ eyes: 1, spread: 0.35, elbow: 0.3, hipL: -0.3, kneeL: 0.35 }); WD.setCam([10, 18, 40], [0, 38, 0], 44); render3d(ctx, 'day'); });
add(69.33, 69.5, 'c_unit_d', (ctx, lt) => { const u = UC(); cityDay(ctx, [u[0] + 110, u[1] + 60, u[2] + 90], [u[0], u[1] + 38, u[2]], 34, { unit: { eyes: 1, ry: 0.8 } }); });
add(69.5, 69.73, 'c_octa_face', (ctx, lt) => { WD.mood('day'); vis('octa'); U.uMode.value = 1; const o = WD.OCTA.pos; OBJ.octa.rotation.y = 0.785; WD.setCam([o.x, o.y, o.z + 105], [o.x, o.y, o.z], 40); render3d(ctx, null, { bg: '#1e2a1e' }); });
add(69.73, 69.93, 'c_red_sil', (ctx, lt) => { WD.mood('cage'); unitPose({ eyes: 1, lean: 0.2 }); U.uMode.value = 2; U.uSil.value.set(0.35, 0.03, 0.05); WD.setCam([0, 30, 110], [0, 38, 0], 38); fill(ctx, '#d4202a'); render3d(ctx, null); });
add(69.93, 70.17, 'c_red_core', (ctx, lt, t, fx) => { fill(ctx, '#3a0306'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(960, 540, 0, 960, 540, 520); g.addColorStop(0, '#ffb0a0'); g.addColorStop(0.3, '#ff2a2a'); g.addColorStop(0.8, '#8a0508'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(960, 540, 520, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(255,190,170,0.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(960, 540, 520 / Math.sqrt(3) * 1.6, 520 / Math.sqrt(3) * 1.6, 0, 0, Math.PI * 2); ctx.stroke(); fx.bloom = 0.6; });
add(70.17, 70.4, 'c_card_atf', (ctx) => A.card(ctx, 'ATF'));
add(70.4, 70.5, 'c_red', (ctx) => fill(ctx, '#d81e22'));
add(70.5, 71.23, 'c_octa_moon', (ctx, lt, t, fx) => {
  WD.mood('blue'); vis('octa'); const o = WD.OCTA.pos; WD.setCam([o.x, o.y - 10, o.z + 260 - lt * 30], [o.x, o.y + 5, o.z], 30);
  fill(ctx, '#0a1a44'); const g = ctx.createRadialGradient(960, 640, 300, 960, 640, 560); g.addColorStop(0, '#e8eef6'); g.addColorStop(0.92, '#c6d2e6'); g.addColorStop(1, 'rgba(160,190,230,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(960, 640, 560, 0, Math.PI * 2); ctx.fill();
  render3d(ctx, null);
});
add(71.23, 71.37, 'c_card_priors', (ctx) => A.card(ctx, 'PRIORS'));
add(71.37, 71.73, 'c_city_sunset', (ctx, lt) => { WD.mood('sunset'); vis('terrain', 'city', 'octa'); WD.setCam([cx + 330, 170, cz + 260], [cx - 60, 40, cz - 60], 30); render3d(ctx, 'sunset', { shadow: { s: 300 }, skyO: { dx: 2600 } }); });
add(71.73, 71.87, 'c_card_tokyo3', (ctx) => A.card(ctx, 'TOKYO-3'));
add(71.87, 72.23, 'c_pyramid', (ctx, lt) => { WD.mood('geo'); vis('geo'); U.uLed.value = 1; U.uWarm.value.set(1.45, 0.95, 1.15); U.uFog.value.set(0.85, 0.45, 0.62); U.uFogR.value.set(120, 900); const y0 = WD.GEO.y0; WD.setCam([230 - lt * 40, y0 + 40, 230], [0, y0 + 70, 0], 40); render3d(ctx, null, { bg: '#c86a8c' }); });
add(72.23, 72.37, 'c_nabla', (ctx) => A.nabla(ctx));
// "staff mugshots" → the eight ranks of the ring, one tower face each
const RANK_BG = ['#3a78c8', '#8a5ab8', '#e08a3a', '#3f9a9a', '#c84a5a', '#5a7ad0', '#d0a040', '#5a9a5a'];
const rankShot = (r) => (ctx, lt, t, fx) => {   // the eight ranks as quick "mugshots": each tower's chunk display after the all-reduce
  const R = WD.CITYDATA.ring[r]; WD.mood('day'); vis('terrain', 'city'); ringDraw(ctx, 14);
  const ang = Math.atan2(R.z - cz, R.x - cx), side = r % 2 ? 1 : -1;       // outward: the chunk face looks away from the ring centre
  const px = R.x + Math.cos(ang) * 34 - Math.sin(ang) * 8 * side, pz = R.z + Math.sin(ang) * 34 + Math.cos(ang) * 8 * side;
  WD.setCam([px, R.top - 22, pz], [R.x, R.top - 12, R.z], 36, 0.06 * side);
  U.uLed.value = 1; fill(ctx, RANK_BG[r]); render3d(ctx, null);
  jp(ctx, `RANK ${r}`, 110, 990, 110, { family: '"Roboto Condensed"', weight: 700, sx: 0.9 });
  ctx.font = '400 28px "Share Tech Mono"'; ctx.fillStyle = '#fff'; ctx.fillText(`owns reduced chunk ${(r + 1) % 8} · 8/8 contributions in every cell`, 116, 1036);
};
add(72.37, 72.6, 'c_rank0', rankShot(0));
add(72.6, 72.73, 'c_map', (ctx, lt) => { WD.setCam([150, 2600, 10], [150, 0, 0], 30); A.engraving(ctx, 0, { bg: '#1c2a3a', ink: '220,230,240' }); });
add(72.73, 73.0, 'c_rank1', rankShot(1));
add(73.0, 73.27, 'c_rank2', rankShot(2));
add(73.27, 73.53, 'c_rank3', rankShot(3));
add(73.53, 73.7, 'c_bridge', (ctx, lt) => { WD.mood('geo'); vis('geo'); U.uLed.value = 1; const y0 = WD.GEO.y0; WD.setCam([100, y0 + 24, 300], [100, y0 + 10, -100], 50); render3d(ctx, null, { bg: '#0c0808' }); });
add(73.7, 74.0, 'c_rank4', rankShot(4));
add(74.0, 74.2, 'c_rank5', rankShot(5));
add(74.2, 74.33, 'c_sketch1', (ctx, lt) => { WD.mood('day'); vis('octa'); U.uMode.value = 1; const o = WD.OCTA.pos; WD.setCam([o.x + 80, o.y - 40, o.z + 90], [o.x, o.y, o.z], 40); render3d(ctx, null, { bg: '#0a0a0a' }); });
add(74.33, 74.53, 'c_rank6', rankShot(6));
add(74.53, 74.67, 'c_rank7', rankShot(7));
add(74.67, 74.83, 'c_document', (ctx, lt) => A.documentCard(ctx, lt));
add(74.83, 74.93, 'c_sketch2', (ctx, lt) => { WD.mood('day'); unitPose({ eyes: 0, look: 0.3, cable: false }); U.uMode.value = 1; camAt('head', [11, 1.5, 12], [0, 0, 0], 36); render3d(ctx, null, { bg: '#e8e4dc' }); });
const swap = (pal) => { OBJ.unit.traverse((o) => { if (o.material && o.material.uniforms && o.material.uniforms.uSwap) o.material.uniforms.uSwap.value = pal; }); };
add(74.93, 75.47, 'c_unit00', (ctx, lt) => { WD.mood('day'); unitPose({ eyes: 1, look: -0.2, cable: false }); U.uSwap.value = 1; camAt('head', [7, 0.8, 14 - lt * 3], [0, -0.3, 0], 34); render3d(ctx, null, { bg: '#5d86b8' }); });
add(75.47, 75.57, 'c_card_proto', (ctx) => A.card(ctx, 'PROTOTYPE'));
add(75.57, 75.97, 'c_unit02', (ctx, lt) => { WD.mood('day'); unitPose({ eyes: 1, spread: 0.3, lean: 0.2, look: 0.25 }); U.uSwap.value = 2; WD.setCam([-18, 38, 44], [0, 46, 0], 40); render3d(ctx, null, { bg: '#1c2a44' }); });
add(75.97, 76.13, 'c_card_prod', (ctx) => A.card(ctx, 'PRODUCTION'));
// "classmates" → attention heads, one per cut
const HEAD_BG = ['#4a86d0', '#e0843a', '#9a62c0', '#3a9a8a'];
const headShot = (head, side) => (ctx, lt) => {   // "classmates" → attention heads: silhouette skyline on a flat colour, one head per cut
  WD.mood('day'); vis('terrain', 'city'); const T = WD.CITYDATA.tokens; const m = T[4 + side];
  WD.setCam([m.x + 60 * (side ? 1 : -1), m.top + 6, m.z + 330], [m.x, m.top + 52, m.z], 22, 0.05 * (side ? 1 : -1)); U.uLed.value = 0;
  U.uMode.value = 2; U.uSil.value.set(0.06, 0.07, 0.14); fill(ctx, HEAD_BG[head]); render3d(ctx, null); beams(ctx, head, 1.2);
  jp(ctx, `HEAD ${head + 1}`, 110, 990, 110, { family: '"Roboto Condensed"', weight: 700, sx: 0.9 });
  ctx.font = '400 28px "Share Tech Mono"'; ctx.fillStyle = '#fff'; ctx.fillText(`W_Q = 3·R(${head ? '-' + head : 0}) — attends ${head === 0 ? 'to itself' : head + (head === 1 ? ' token' : ' tokens') + ' back'}`, 116, 1036);
};
add(76.13, 76.47, 'c_head0', headShot(0, 0));
add(76.47, 76.63, 'c_head1', headShot(1, 1));
add(76.63, 76.97, 'c_head2', headShot(2, 0));
add(76.97, 77.2, 'c_head3', headShot(3, 1));
add(77.2, 77.4, 'c_head1b', headShot(1, 0));
add(77.4, 77.67, 'c_head2b', headShot(2, 1));
add(77.67, 77.8, 'c_city_red', (ctx) => { WD.mood('dusk'); vis('terrain', 'city', 'octa'); WD.setCam([cx + 200, 90, cz + 180], [cx - 40, 50, cz - 60], 36); render3d(ctx, 'dusk', { shadow: { s: 300 } }); });
add(77.8, 77.9, 'c_pink_blast', (ctx, lt, t, fx) => { WD.mood('day'); vis('terrain', 'city', 'octa'); WD.setCam([cx + 160, 60, cz + 140], [cx, 60, cz - 20], 40); render3d(ctx, 'day'); const c = WD.project([cx, 30, cz]); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], 700); g.addColorStop(0, 'rgba(255,240,250,1)'); g.addColorStop(0.3, 'rgba(255,120,200,0.9)'); g.addColorStop(1, 'rgba(255,60,160,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); fx.bloom = 0.8; });
add(77.9, 78.07, 'c_unit_blast', (ctx, lt, t, fx) => { const u = UC(); cityDay(ctx, [u[0] + 60, u[1] + 30, u[2] + 70], [u[0], u[1] + 40, u[2]], 38, { unit: { eyes: 1, ry: 0.6 } }); const c = WD.project([cx - 60, 40, cz - 80]); P.crossBurst(ctx, c[0], c[1], 360, 0.9); fx.bloom = 0.8; fx.thr = 0.6; });
add(78.07, 78.57, 'c_cross', (ctx, lt, t, fx) => {
  WD.mood('day'); vis('terrain', 'city'); WD.setCam([cx + 260, 120, cz + 240], [cx - 30, 70, cz - 40], 34); render3d(ctx, 'day');
  const c = WD.project([cx - 20, 20, cz - 30]); const s = lerp(300, 900, ease.outExpo(lt / 0.5));
  P.crossBurst(ctx, c[0], c[1] - s * 0.6, s, 1, { core: '#fffef0', edge: '#ffc830' });
  fx.flash = clamp(lt < 0.08 ? 1 : 0.85 - (lt - 0.08) * 0.8); fx.flashCol = [1, 0.93, 0.3]; fx.bloom = 1.0; fx.thr = 0.5;
  ctx.font = '400 30px "Share Tech Mono"'; ctx.fillStyle = 'rgba(80,40,0,0.9)'; ctx.fillText(`‖∇f(−5,−5)‖ = ${M.CLIP.norm.toFixed(1)}   EXPLODING GRADIENT`, 110, 1010);
});
add(78.57, 78.8, 'c_berserk', (ctx, lt, t, fx) => {   // crouched, feral: the loss diverges
  WD.mood('night'); unitPose({ eyes: 1, lean: 0.62, nod: -0.55, hip: -0.75, knee: 1.25, reach: -0.9, reachR: -0.5, elbow: 0.2, spread: 0.25, cable: false }); U.uLed.value = 1;
  camAt('head', [9, -8, 20], [0, -3, 0], 40, 0.3); render3d(ctx, null, { bg: '#120818' }); fx.bloom = 0.6; });
add(78.8, 79.2, 'c_lance', (ctx, lt, t, fx) => {
  WD.mood('dusk'); vis('lance', 'octa'); const o = WD.OCTA.pos; const k = ease.in(clamp(lt / 0.4));
  OBJ.lance.position.set(lerp(o.x + 400, o.x + 60, k), o.y + 4, o.z + 20); OBJ.lance.rotation.set(0, 0.15, 0);
  WD.setCam([o.x + 120, o.y - 30, o.z + 200], [o.x + 40, o.y, o.z], 36); render3d(ctx, 'dusk');
  ctx.font = '700 44px "Roboto Condensed"'; ctx.fillStyle = '#fff'; ctx.fillText('clip_grad_norm_(max_norm=1.0)', 110, 980);
  ctx.font = '400 30px "Share Tech Mono"'; ctx.fillText(`g ← g · min(1, 1.0/${M.CLIP.norm.toFixed(1)}) = g · ${M.CLIP.scale.toFixed(5)}`, 112, 1024);
});
add(79.2, 79.33, 'c_sketch3', (ctx) => { WD.mood('day'); vis('lance', 'octa'); U.uMode.value = 1; const o = WD.OCTA.pos; OBJ.lance.position.set(o.x + 30, o.y + 4, o.z + 20); OBJ.lance.rotation.set(0, 0.15, 0); WD.setCam([o.x + 60, o.y - 20, o.z + 150], [o.x, o.y, o.z], 40); render3d(ctx, null, { bg: '#eeece6' }); });
add(79.33, 79.63, 'c_blue_void', (ctx, lt) => { WD.mood('blue'); vis('octa'); const o = WD.OCTA.pos; OBJ.octa.userData.mat.uniforms.uSpread.value = 4; OBJ.octa.rotation.z = 1.5708; WD.setCam([o.x, o.y, o.z + 150], [o.x, o.y, o.z], 40); render3d(ctx, null, { bg: '#0a14a0' }); });
add(79.63, 79.7, 'c_cross_red', (ctx) => { fill(ctx, '#c8121c'); ctx.fillStyle = '#111'; ctx.fillRect(560, 0, 800, H); ctx.fillStyle = '#d8d8dc'; ctx.fillRect(930, 420, 60, 240); ctx.fillRect(860, 490, 200, 60); });
add(79.7, 79.8, 'c_card_si', (ctx) => A.card(ctx, 'SECOND IMPACT'));
add(79.8, 80.13, 'c_white_giant', (ctx, lt, t, fx) => { WD.mood('day'); unitPose({ eyes: 0, spread: 1.42, elbow: 0, lean: 0, hip: 0, knee: 0, nod: 0.35, cable: false }); U.uMode.value = 2; U.uSil.value.set(0.96, 0.88, 0.94); WD.setCam([0, 36, 120], [0, 38, 0], 40); fill(ctx, '#171320'); render3d(ctx, null); fx.bloom = 0.6; fx.thr = 0.8; });
add(80.13, 80.33, 'c_satellite', (ctx, lt, t, fx) => {
  WD.mood('dusk'); vis('terrain'); WD.TU.tLineA.value = 0.9; U.uRiseT.value = 0; WD.setCam([cx - 40, 820, cz + 420], [cx, 0, cz - 20], 34);
  render3d(ctx, null, { bg: '#2a1050' });
  const c = WD.project([cx, 0, cz]); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], 380); g.addColorStop(0, 'rgba(255,255,220,0.95)'); g.addColorStop(0.25, 'rgba(255,60,50,0.9)'); g.addColorStop(1, 'rgba(160,0,40,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(c[0], c[1], 520, 250, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.strokeStyle = '#ff4050'; ctx.lineWidth = 3; for (const m of M.CRIT) { const p = WD.project(M.toWorld(m.u, m.v)); ctx.beginPath(); ctx.moveTo(p[0] - 12, p[1] - 12); ctx.lineTo(p[0] + 12, p[1] + 12); ctx.moveTo(p[0] + 12, p[1] - 12); ctx.lineTo(p[0] - 12, p[1] + 12); ctx.stroke(); }
  A.satelliteLabels(ctx, lt);
});
add(80.33, 80.5, 'c_octa_void', (ctx) => { WD.mood('blue'); vis('octa'); const o = WD.OCTA.pos; WD.setCam([o.x - 60, o.y + 20, o.z + 120], [o.x, o.y, o.z], 40); render3d(ctx, null, { bg: '#1a2ab0' }); });
add(80.5, 80.73, 'c_sketch4', (ctx, lt) => { WD.mood('day'); unitPose({ eyes: 0, spread: 0.2, look: -0.3 }); U.uMode.value = 1; camAt('head', [-18, -8, 30], [0, -6, 0], 40); render3d(ctx, null, { bg: '#f0dcee' }); });
add(80.73, 80.97, 'c_green_eye', (ctx, lt, t, fx) => { WD.mood('night'); unitPose({ eyes: 1, look: 0.25, cable: false }); U.uSwap.value = 2; camAt('eyes', [4.5, 0.6, 5.5], [0, 0, 0], 30, 0.2); render3d(ctx, null, { bg: '#2a1a40' }); fx.bloom = 0.5; });
add(80.97, 81.13, 'c_card_adam', (ctx) => A.card(ctx, 'ADAM'));
add(81.13, 81.37, 'c_adam_profile', (ctx, lt) => {
  WD.mood('day'); vis('terrain', 'trailAdam', 'city'); OBJ.trailAdam.material.uniforms.uHead.value = 300; WD.setCam([200, 260, 180], [130, 60, -100], 34); render3d(ctx, 'day');
  ctx.font = '700 46px "Roboto Condensed"'; ctx.fillStyle = '#fff'; ctx.fillText('ADAM (Kingma & Ba, 2014)   β₁=0.9  β₂=0.999  ε=10⁻⁸', 110, 1000);
});
add(81.37, 81.63, 'c_data_grid', (ctx, lt) => A.dataGrid(ctx, lt, 1));
add(81.63, 81.97, 'c_loss_a', (ctx, lt) => {   // both optimizer ribbons run down into the (3,2) basin
  WD.mood('day'); vis('terrain', 'city', 'trailAdam', 'trailSGD'); OBJ.trailAdam.material.uniforms.uHead.value = 300; OBJ.trailSGD.material.uniforms.uHead.value = 300;
  WD.setCam([-120 + lt * 30, 300, 260], [170, 20, -110], 32); render3d(ctx, 'day', { shadow: { s: 420, c: [150, 40, -100] } });
});
add(81.97, 82.37, 'c_loss_b', (ctx, lt) => {   // "operations director turning": Unit-01 turns its head to the lens
  const u = UC(); WD.mood('day'); vis('terrain', 'city');
  unitPose({ eyes: 1, x: u[0], y: u[1] - 1, z: u[2], ry: 0.9, look: lerp(-0.7, 0.35, ease.io(clamp(lt / 0.3))), nod: -0.05 });
  const h = UA('head'); WD.setCam([h[0] + 30, h[1] - 6, h[2] + 22], [h[0], h[1] - 3, h[2]], 38); render3d(ctx, 'day', { shadow: { s: 300 } });
});
add(82.37, 82.63, 'c_sketch5', (ctx) => { WD.mood('day'); vis('city', 'terrain'); U.uMode.value = 1; WD.TU.tLineA.value = 0; WD.setCam([cx + 150, 70, cz + 150], [cx, 40, cz], 36); render3d(ctx, null, { bg: '#e8dcc8' }); });
add(82.63, 83.7, 'director', (ctx, lt, t, fx) => {
  directorCard(ctx, lt);
  const s = seg(t, 83.6, 83.72); if (s > 0) { ctx.save(); ctx.fillStyle = '#41ff5a'; ctx.beginPath(); const x = lerp(-600, W + 200, s); ctx.moveTo(x - 1400, 700); ctx.lineTo(x, 520); ctx.lineTo(x, 640); ctx.lineTo(x - 1400, 820); ctx.fill(); ctx.restore(); }
});
add(83.7, 84.4, 'c_arms_close', (ctx, lt, t, fx) => {
  WD.mood('cage'); const tq = q(lt, 8); unitPose({ eyes: 1, lean: 0.03, hip: 0, knee: 0, spread: 0.3 + tq * 1.4, elbow: tq * 0.7, cable: false }); WD.U.uL.value.set(0, 0.5, 0.8).normalize();
  camAt('chest', [0, -2, 42 + tq * 22], [0, 0, 0], 44); vbars(ctx, t, { drift: 80 }); render3d(ctx, null);
  if (lt < 0.1) { ctx.save(); ctx.fillStyle = '#41ff5a'; ctx.beginPath(); ctx.moveTo(0, 700); ctx.lineTo(W, 560); ctx.lineTo(W, 700); ctx.lineTo(0, 840); ctx.fill(); ctx.restore(); }
});
add(84.4, 86.1, 'c_arms_full', (ctx, lt, t, fx) => {
  WD.mood('cage'); unitPose({ eyes: 1, lean: 0.03, hip: 0, knee: 0, spread: 1.3, elbow: 0.75, curl: 0.05, nod: 0.12, cable: false }); WD.U.uL.value.set(0, 0.4, 0.9).normalize();
  WD.setCam([0, 36, 132 - lt * 10], [0, 40, 0], 38); vbars(ctx, t, { drift: 60 }); render3d(ctx, null);
  if (lt > 0.8) { const a = 0.35 * seg(lt, 0.8, 1.2); ctx.save(); ctx.globalAlpha = a; A.l1Emblem(ctx, 960, 470, 260, 1, t); ctx.restore(); }
});
add(86.1, 87.27, 'c_final_sky', (ctx, lt) => { const u = UC(); cityDay(ctx, [u[0] + 14, u[1] + 50, u[2] + 26], [u[0], u[1] + 66, u[2]], 38, { unit: { eyes: 1, ry: 0.35 } }); });
add(87.27, 87.6, 'c_teal', (ctx, lt, t, fx) => { WD.mood('night'); unitPose({ eyes: 1, look: 0.3, nod: 0.12, cable: false }); camAt('head', [-7, -1, 12], [0, 0, 0], 34, -0.2); render3d(ctx, null, { bg: '#1c6a6e' }); fx.tint = [0.85, 1.05, 1.05]; });
add(87.6, 87.73, 'c_black', (ctx) => fill(ctx, '#000'));
add(87.73, 87.87, 'c_flash', (ctx, lt, t, fx) => { fill(ctx, '#fff'); fx.flash = 0.6; });
add(87.87, 88.2, 'c_converged', (ctx, lt) => {   // both runs arrive: f(3,2) = 0
  WD.mood('day'); vis('terrain', 'city', 'trailAdam', 'trailSGD'); OBJ.trailAdam.material.uniforms.uHead.value = 300; OBJ.trailSGD.material.uniforms.uHead.value = 300;
  WD.setCam([60, 420, 160], [cx - 40, 0, cz + 20], 36); render3d(ctx, 'day', { shadow: { s: 420, c: [150, 40, -100] } });
  jp(ctx, 'f(3, 2) = 0', 110, 960, 84, { family: '"Roboto Condensed"', weight: 700, sx: 0.9 });
  ctx.font = '400 30px "Share Tech Mono"'; ctx.fillStyle = '#fff'; ctx.fillText(`ADAM reaches f < 0.01 at step ${M.ARRIVE.adam}   SGD+MOMENTUM at step ${M.ARRIVE.sgd}`, 114, 1012);
});
add(88.2, 90.51, 'production', (ctx, lt, t, fx) => {
  A.redFinal(ctx, lt); productionCard(ctx, lt);
  fx.flash = clamp((lt - 1.9) / 0.4); fx.flashCol = [0, 0, 0]; fx.vig = 0.5;
});

export const SHOTS = S;
export function overlayCredits(ctx, t) { credits(ctx, t); }
