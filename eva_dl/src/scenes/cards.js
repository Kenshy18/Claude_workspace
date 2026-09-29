// ── Episode title cards (heavy Mincho on black, each with its own layout) ────
const CARDS = {
  ep1: [
    { s: 'EPISODE:1', x: 190, y: 250, size: 66, family: F.serif, weight: 700, ls: 6 },
    { s: '使徒、襲来', x: 170, y: 590, size: 262, sx: 0.86 },
    { s: 'ANGEL ATTACK', x: 1760, y: 790, size: 104, family: F.serif, weight: 700, align: 'right', sx: 0.8 },
    { s: 'OUT-OF-DISTRIBUTION DETECTION', x: 1760, y: 868, size: 40, family: F.cond, weight: 700, align: 'right', ls: 10, color: C.orange, at: 0.35 },
  ],
  ep2: [
    { s: 'EPISODE:2', x: 190, y: 220, size: 66, family: F.serif, weight: 700, ls: 6 },
    { s: 'シンクロ率', x: 170, y: 480, size: 200, sx: 0.8, sy: 1.1 },
    { s: '400%', x: 1000, y: 800, size: 360, family: F.serif, weight: 700, sx: 0.72 },
    { s: 'SYNC RATIO: OVERFITTING', x: 190, y: 880, size: 48, family: F.serif, weight: 700, ls: 4, sx: 0.9, at: 0.3 },
  ],
  ep3: [
    { s: 'EPISODE:3', x: 1730, y: 210, size: 66, family: F.serif, weight: 700, ls: 6, align: 'right' },
    { s: '三賢者', x: 150, y: 640, size: 340, sx: 0.8, sy: 1.18 },
    { s: 'MAGI', x: 1730, y: 520, size: 210, family: F.serif, weight: 700, align: 'right', sx: 0.8, ls: 10 },
    { s: 'MIXTURE OF EXPERTS', x: 1730, y: 610, size: 50, family: F.serif, weight: 700, align: 'right', ls: 3, at: 0.3 },
    { s: 'N = 3 · k = 2', x: 1730, y: 690, size: 40, family: F.cond, weight: 700, align: 'right', ls: 8, color: C.orange, at: 0.5 },
  ],
  ep4: [
    { s: 'EPISODE:4', x: 190, y: 210, size: 66, family: F.serif, weight: 700, ls: 6 },
    { s: '拘束具、', x: 160, y: 560, size: 270, sx: 0.84, sy: 1.18 },
    { s: '解除', x: 1130, y: 860, size: 300, sx: 0.84, sy: 1.18 },
    { s: 'RESTRAINTS OFF', x: 190, y: 720, size: 84, family: F.serif, weight: 700, ls: 3, sx: 0.84, at: 0.25 },
    { s: 'KL PENALTY  ×  REWARD HACKING', x: 190, y: 790, size: 38, family: F.cond, weight: 700, ls: 8, color: C.e01green, at: 0.45 },
  ],
  final: [
    { s: 'FINAL EPISODE', x: 190, y: 230, size: 62, family: F.serif, weight: 700, ls: 6 },
    { s: '人類補完計画', x: 150, y: 580, size: 250, sx: 0.84 },
    { s: 'THE INSTRUMENTALITY OF TOKENS', x: 1760, y: 780, size: 76, family: F.serif, weight: 700, align: 'right', sx: 0.82, ls: 2 },
    { s: 'RANK COLLAPSE IN SELF-ATTENTION', x: 1760, y: 852, size: 40, family: F.cond, weight: 700, align: 'right', ls: 10, color: C.orange, at: 0.4 },
  ],
  end: [
    { s: '最終話', x: 200, y: 250, size: 84, weight: 900 },
    { s: '残差を、君に', x: 170, y: 590, size: 250, sx: 0.84 },
    { s: 'ONE MORE FINAL:', x: 1760, y: 745, size: 70, family: F.serif, weight: 700, align: 'right', sx: 0.84, ls: 3 },
    { s: 'ATTENTION IS NOT ALL YOU NEED.', x: 1760, y: 835, size: 84, family: F.serif, weight: 700, align: 'right', sx: 0.8, ls: 2, at: 0.6 },
    { s: 'cf. Dong, Cordonnier & Loukas — “Attention is Not All You Need: Pure Attention Loses Rank Doubly Exponentially with Depth”, ICML 2021',
      x: 1760, y: 930, size: 22, family: F.cond, weight: 500, align: 'right', ls: 1, color: '#9c978d', at: 1.6 },
  ],
};

function cardScene(name, key, dur) {
  SCENES.push({
    name, dur,
    draw(ctx, t, fx) {
      titleCard(ctx, t, dur, CARDS[key]);
      fx.scan = 0; fx.grain = 0.065; fx.ca = 0.15; fx.bloom = 0.2; fx.vig = 0.45;
    },
    cues() {
      const c = [{ t: 0.033, type: 'card_hit' }];
      CARDS[key].forEach((L) => { if (L.at) c.push({ t: L.at, type: 'card_tick' }); });
      return c;
    },
  });
}

cardScene('card1', 'ep1', 2.5);
cardScene('card2', 'ep2', 2.5);
cardScene('card3', 'ep3', 2.5);
cardScene('card4', 'ep4', 2.5);
cardScene('card5', 'final', 3.0);
cardScene('card6', 'end', 5.0);
