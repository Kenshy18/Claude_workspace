// ─────────────────────────────────────────────────────────────────────────────
//  Staff credits — white heavy mincho, small role / big name, placed where the 1995 OP puts them.
//  Names are concepts, papers, libraries, hardware, datasets (no living people in roles).
//  X positions are given in the original 4:3 frame (0..1) and mapped into the 16:9 frame.
// ─────────────────────────────────────────────────────────────────────────────
import { W, H, jp, jpW, vert, clamp } from './paint.js';

const X = (x43) => 960 + (x43 - 0.5) * 1440 * 1.06;
const Y = (y) => y * H;
const LAT = '"Liberation Serif"';
const ROLE = 44, NAME = 84;
// each block: [t0, t1, items]; item = {s, x, y, size, align, lat, sx}
const B = [
  [3.0, 6.35, [{ s: '企画・原作', x: 0.5, y: 0.36, size: ROLE + 4, align: 'center' }, { s: 'PERCEPTRON', x: 0.5, y: 0.5, size: 104, align: 'center', lat: 1, sx: 1.02 }, { s: '(Rosenblatt, 1958)', x: 0.5, y: 0.575, size: 34, align: 'center', lat: 1, reg: 1 }]],
  [10.45, 13.95, [{ s: '企画', x: 0.12, y: 0.33, size: ROLE }, { s: 'Project Eval.', x: 0.3, y: 0.335, size: NAME, lat: 1, sx: 0.9 }, { s: '掲載', x: 0.12, y: 0.54, size: ROLE }, { s: 'arXiv', x: 0.3, y: 0.545, size: NAME, lat: 1, sx: 0.9 }, { s: 'cs.LG', x: 0.3, y: 0.7, size: NAME, lat: 1, sx: 0.9 }]],
  [23.4, 26.1, [{ s: 'キャラクターデザイン', x: 0.5, y: 0.31, size: ROLE - 4, align: 'right' }, { s: 'バイト対符号化', x: 0.54, y: 0.315, size: NAME }, { s: 'メカニックデザイン', x: 0.5, y: 0.5, size: ROLE - 4, align: 'right' }, { s: 'テンソルコア', x: 0.54, y: 0.505, size: NAME }, { s: '広帯域メモリ', x: 0.54, y: 0.67, size: NAME }]],
  [26.35, 29.8, [{ s: '副監督', x: 0.52, y: 0.73, size: ROLE }, { s: 'ウォームアップ', x: 0.62, y: 0.63, size: NAME }, { s: '余弦減衰', x: 0.62, y: 0.8, size: NAME }]],
  [29.9, 33.35, [{ s: '美術監督', x: 0.06, y: 0.14, size: ROLE }, { s: '損失曲面', x: 0.28, y: 0.145, size: NAME }, { s: '色彩設定', x: 0.4, y: 0.87, size: ROLE }, { s: 'ソフトマックス', x: 0.6, y: 0.875, size: NAME }]],
  [33.9, 36.0, [{ s: '撮影監督', x: 0.38, y: 0.15, size: ROLE }, { s: '畳み込み', x: 0.6, y: 0.155, size: NAME }, { s: '音響監督', x: 0.06, y: 0.74, size: ROLE }, { s: 'WaveNet', x: 0.25, y: 0.745, size: NAME, lat: 1, sx: 0.9 }, { s: '音響制作', x: 0.09, y: 0.815, size: 34 }, { s: 'メル周波数', x: 0.25, y: 0.82, size: 50 }]],
  [42.4, 44.85, [{ s: '音楽', x: 0.06, y: 0.14, size: ROLE }, { s: '正弦波位置符号化', x: 0.17, y: 0.145, size: NAME }, { s: '音楽協力', x: 0.22, y: 0.87, size: ROLE }, { s: '高速フーリエ変換', x: 0.4, y: 0.875, size: NAME }]],
  [44.9, 48.4, [
    { s: 'オープニングテーマ', x: 0.43, y: 0.075, size: 30, align: 'center' }, { s: 'エンディングテーマ', x: 0.8, y: 0.075, size: 30, align: 'center' },
    { s: '「残酷な勾配のテーゼ」', x: 0.43, y: 0.145, size: 44, align: 'center' }, { s: '「FLY ME TO THE MINIMUM」', x: 0.8, y: 0.145, size: 40, align: 'center', lat: 1, sx: 0.82 },
    { s: '作詞', x: 0.1, y: 0.24, size: 34 }, { s: '次トークン予測', x: 0.28, y: 0.245, size: 50 }, { s: 'Cross-Entropy', x: 0.66, y: 0.245, size: 50, lat: 1, sx: 0.85 },
    { s: '作曲', x: 0.1, y: 0.33, size: 34 }, { s: '関数合成', x: 0.28, y: 0.335, size: 50 }, { s: 'Chain Rule', x: 0.66, y: 0.335, size: 50, lat: 1, sx: 0.85 },
    { s: '編曲', x: 0.1, y: 0.42, size: 34 }, { s: 'einops', x: 0.28, y: 0.425, size: 50, lat: 1, sx: 0.85 }, { s: 'Dropout', x: 0.66, y: 0.425, size: 50, lat: 1, sx: 0.85 },
    { s: '歌', x: 0.1, y: 0.51, size: 34 }, { s: '自己回帰', x: 0.28, y: 0.515, size: 50 }, { s: 'Beam Search', x: 0.66, y: 0.515, size: 50, lat: 1, sx: 0.85 },
    { s: '(torch.hub)', x: 0.52, y: 0.6, size: 32, align: 'center', lat: 1, reg: 1 }]],
  [52.95, 54.55, [{ s: 'オープニングアニメーション', x: 0.5, y: 0.13, size: 50, align: 'center' }, { s: '作画', x: 0.27, y: 0.32, size: ROLE }, { s: 'three.js', x: 0.4, y: 0.325, size: NAME, lat: 1, sx: 0.9 }, { s: 'SwiftShader', x: 0.4, y: 0.47, size: NAME, lat: 1, sx: 0.9 }, { s: '演出', x: 0.27, y: 0.63, size: ROLE }, { s: 'Canvas 2D', x: 0.4, y: 0.635, size: NAME, lat: 1, sx: 0.9 }]],
  [60.25, 62.15, [{ s: '広報', x: 0.5, y: 0.14, size: ROLE, align: 'center' }, { s: 'リーダーボード', x: 0.5, y: 0.29, size: NAME, align: 'center' }, { s: '(SOTA)', x: 0.5, y: 0.35, size: 34, align: 'center', lat: 1, reg: 1 }, { s: '引用数', x: 0.5, y: 0.47, size: NAME, align: 'center' }, { s: '(h-index)', x: 0.5, y: 0.53, size: 34, align: 'center', lat: 1, reg: 1 }]],
  [62.2, 64.0, [{ s: 'アニメーション制作', x: 0.5, y: 0.29, size: ROLE, align: 'center' }, { s: 'PyTorch', x: 0.5, y: 0.45, size: 104, align: 'center', gothic: 1 }, { s: 'CUDA', x: 0.5, y: 0.62, size: 104, align: 'center', gothic: 1 }]],
  [64.05, 66.7, [{ s: 'プロデューサー', x: 0.5, y: 0.27, size: ROLE, align: 'center' }, { s: '計算資源', x: 0.5, y: 0.4, size: NAME, align: 'center' }, { s: '(GPU時間)', x: 0.5, y: 0.46, size: 34, align: 'center' }, { s: '電力', x: 0.5, y: 0.58, size: NAME, align: 'center' }]],
];

export function credits(ctx, t) {
  for (const [t0, t1, items] of B) {
    if (t < t0 || t >= t1) continue;
    const a = clamp((t - t0) / 0.15) * clamp((t1 - t) / 0.12);
    ctx.save(); ctx.globalAlpha = a;
    for (const it of items) {
      const x = X(it.x), y = Y(it.y);
      // the 1995 masters' credits carry a faint soft dark fringe that keeps white type readable over light art
      ctx.shadowColor = 'rgba(10,6,16,0.6)'; ctx.shadowBlur = Math.max(5, it.size * 0.11); ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 1;
      if (it.lat) jp(ctx, it.s, x, y, it.size, { align: it.align, family: LAT, weight: it.reg ? 400 : 700, sx: it.sx ?? 0.95 });
      else if (it.gothic) jp(ctx, it.s, x, y, it.size, { align: it.align, family: '"Liberation Sans"', weight: 700, sx: 0.92 });
      else jp(ctx, it.s, x, y, it.size, { align: it.align, sx: 0.86 });
    }
    ctx.restore();
  }
}

// 監督 card (82.63–83.7): vertical small role, huge name 逆伝播 / 法, white mincho on black
export function directorCard(ctx, lt) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  vert(ctx, '監督', X(0.085), Y(0.1), 138, { sx: 0.9, lead: 1.0 });
  const s = 300; const x0 = X(0.26);
  jp(ctx, '逆伝播', x0, Y(0.56), s, { sx: 0.88 });
  const w = jpW(ctx, '逆伝播', s, { sx: 0.88 });
  jp(ctx, '法', x0 + w - s * 0.88, Y(0.9), s, { sx: 0.88 });
}
// 製作 card (88.2–90.5) on the red finale
export function productionCard(ctx, lt) {
  jp(ctx, '製作', X(0.14), Y(0.56), 60, { sx: 0.88 });
  jp(ctx, 'ImageNet', X(0.33), Y(0.44), 104, { family: '"Liberation Sans"', weight: 700, sx: 0.9 });
  jp(ctx, 'Common Crawl', X(0.33), Y(0.62), 104, { family: '"Liberation Sans"', weight: 700, sx: 0.9 });
}
