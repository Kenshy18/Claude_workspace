// ─────────────────────────────────────────────────────────────────────────────
//  Original parody title mark, same construction as the 1995 logo:
//  small 新世紀 · wide Roman serif wordmark · jagged orange-red katakana (hand-built polygons).
//  EVALUATION / ヱヴァリュヱーション (ヱ: the Rebuild films' archaic kana, as in ヱヴァンゲリヲン).
// ─────────────────────────────────────────────────────────────────────────────
import { jp } from './paint.js';

// strokes: [x1,y1,x2,y2,width,spikeStart,spikeEnd] in em units (y down); small kana scale 0.72
const WE = [[0.06, 0.13, 0.92, 0.07, 0.13, 0.05, 0.12], [0.85, 0.08, 0.78, 0.43, 0.12, 0, 0.02], [0.28, 0.45, 0.82, 0.42, 0.11, 0.03, 0], [0.53, 0.45, 0.5, 0.9, 0.13, 0, 0], [-0.02, 0.93, 0.99, 0.86, 0.14, 0.1, 0.16]];
const GLYPHS = [
  { adv: 1.0, s: WE },                                                                                   // ヱ
  { adv: 1.06, s: [[0.47, -0.08, 0.5, 0.2, 0.12, 0.3, 0], [0.13, 0.25, 0.15, 0.53, 0.12, 0, 0.05], [0.1, 0.27, 0.86, 0.22, 0.13, 0, 0.05], [0.85, 0.22, 0.77, 0.56, 0.13, 0, 0], [0.77, 0.56, 0.34, 0.99, 0.13, 0, 0.14], [0.9, -0.16, 0.94, 0.08, 0.07, 0.2, 0], [1.02, -0.16, 1.06, 0.08, 0.07, 0.24, 0]] }, // ヴ
  { adv: 0.74, small: 1, s: [[0.08, 0.3, 0.88, 0.25, 0.13, 0, 0.02], [0.87, 0.26, 0.66, 0.56, 0.12, 0, 0], [0.53, 0.43, 0.3, 0.99, 0.13, 0, 0.12]] }, // ァ
  { adv: 0.82, s: [[0.2, 0.08, 0.22, 0.6, 0.13, 0.22, 0.02], [0.7, 0.0, 0.7, 0.55, 0.14, 0.42, 0], [0.7, 0.55, 0.38, 0.99, 0.14, 0, 0.12]] }, // リ
  { adv: 0.74, small: 1, s: [[0.18, 0.36, 0.76, 0.33, 0.12, 0, 0], [0.75, 0.34, 0.72, 0.84, 0.12, 0.02, 0], [0.03, 0.87, 0.97, 0.82, 0.13, 0.06, 0.13]] }, // ュ
  { adv: 1.0, s: WE },                                                                                   // ヱ
  { adv: 0.96, s: [[0.0, 0.53, 0.98, 0.44, 0.14, 0.12, 0.2]] },                                            // ー
  { adv: 1.0, s: [[0.12, 0.1, 0.3, 0.26, 0.12, 0, 0], [0.03, 0.38, 0.23, 0.52, 0.12, 0, 0], [0.13, 0.97, 0.9, 0.17, 0.14, 0.05, 0.34]] }, // シ
  { adv: 0.72, small: 1, s: [[0.2, 0.3, 0.76, 0.27, 0.12, 0, 0], [0.24, 0.58, 0.74, 0.56, 0.11, 0, 0], [0.12, 0.88, 0.8, 0.85, 0.12, 0.06, 0.04], [0.75, 0.27, 0.74, 0.9, 0.13, 0.1, 0]] }, // ョ
  { adv: 1.0, s: [[0.07, 0.14, 0.32, 0.37, 0.13, 0.06, 0], [0.09, 0.99, 0.93, 0.23, 0.15, 0.04, 0.38]] },  // ン
];

function strokePoly(x1, y1, x2, y2, w, e1, e2) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, hw = w / 2;
  const tipA = [x1 - ux * (e1 + hw * 0.7) + nx * hw * 0.55, y1 - uy * (e1 + hw * 0.7) + ny * hw * 0.55];
  const tipB = [x2 + ux * (e2 + hw * 0.7) - nx * hw * 0.55, y2 + uy * (e2 + hw * 0.7) - ny * hw * 0.55];
  return [[x1 + nx * hw, y1 + ny * hw], [x2 + nx * hw, y2 + ny * hw], tipB, [x2 - nx * hw, y2 - ny * hw], [x1 - nx * hw, y1 - ny * hw], tipA];
}
// Build katakana polygons in pixel space for a given layout.
export function kanaPolys(x0, yBase, width) {
  const total = GLYPHS.reduce((a, g) => a + g.adv * (g.small ? 0.72 : 1), 0) - 0.12;
  const E = width / total, VH = 0.66;     // wide letters: em height = 0.66 × em width
  const polys = []; let pen = 0;
  for (const g of GLYPHS) {
    const sc = g.small ? 0.72 : 1;
    for (const st of g.s) {
      const p = strokePoly(...st);
      polys.push(p.map(([x, y]) => {
        let px = x0 + (pen + x * sc) * E, py = yBase - (1 - (y * sc + (1 - sc))) * E * VH;
        px += (yBase - py) * 0.36;                      // lean (italic shear)
        py -= (px - x0) * 0.045;                        // rising baseline
        return [px, py];
      }));
    }
    pen += g.adv * sc;
  }
  return { polys, E, VH };
}

export const LOGO = { cx: 960, wordY: 452, wordW: 1180, kanaW: 1270 };
export function wordmark(ctx, a = 1, o = {}) {
  const { cx, wordY, wordW } = LOGO;
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = '700 150px "Liberation Serif"'; ctx.textBaseline = 'alphabetic';
  const str = 'EVALUATION'; const w0 = ctx.measureText(str).width; const sx = wordW / w0;
  ctx.translate(cx - wordW / 2, wordY); ctx.scale(sx, 0.78);
  ctx.fillStyle = o.color || '#f5f3ee'; ctx.fillText(str, 0, 0);
  ctx.restore();
}
export function kana(ctx, mode, a = 1, reveal = 1) {
  const { cx, wordY, kanaW } = LOGO;
  const { polys } = kanaPolys(cx - kanaW / 2 - 60, wordY + 150, kanaW);
  ctx.save(); ctx.globalAlpha = a;
  const n = Math.ceil(polys.length * reveal);
  const path = () => { ctx.beginPath(); for (let i = 0; i < n; i++) { const p = polys[i]; ctx.moveTo(p[0][0], p[0][1]); for (let k = 1; k < p.length; k++) ctx.lineTo(p[k][0], p[k][1]); ctx.closePath(); } };
  if (mode === 'blue') {
    ctx.globalCompositeOperation = 'lighter';
    // light streaks rising from every stroke (the 1995 "forming" frames)
    for (let i = 0; i < n; i++) for (const [x, y] of polys[i]) {
      const g = ctx.createLinearGradient(0, y + 30, 0, y - 260); g.addColorStop(0, 'rgba(120,210,255,0.55)'); g.addColorStop(1, 'rgba(40,120,255,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 5, y - 260, 10, 290);
    }
    ctx.fillStyle = 'rgba(150,225,255,0.95)'; path(); ctx.fill();
  } else {
    const g = ctx.createLinearGradient(0, wordY - 60, 0, wordY + 170); g.addColorStop(0, '#ffb13a'); g.addColorStop(0.45, '#ff6a1e'); g.addColorStop(1, '#e0170f');
    ctx.fillStyle = g; path(); ctx.fill();
    ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(90,6,4,0.9)'; ctx.stroke();
  }
  ctx.restore();
}
export function shinseiki(ctx, a = 1) {
  const { cx, wordY } = LOGO;
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(cx - 80, wordY - 128); ctx.transform(1, 0, -0.18, 1, 0, 0);
  const g = ctx.createLinearGradient(0, -60, 0, 0); g.addColorStop(0, '#f0602a'); g.addColorStop(1, '#b8190f');
  ctx.font = '900 64px "Zen Old Mincho"'; ctx.textBaseline = 'alphabetic';
  ctx.scale(1.12, 1); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(40,4,2,0.9)'; ctx.strokeText('新世紀', 0, 0);
  ctx.fillStyle = g; ctx.fillText('新世紀', 0, 0);
  ctx.restore();
}
export function fullLogo(ctx, a = 1, o = {}) { wordmark(ctx, a); kana(ctx, 'final', a); if (o.shin !== false) shinseiki(ctx, a * (o.shinA ?? 1)); }
