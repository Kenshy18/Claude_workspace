# p2_mincho progress

## State (session 3, resumed after 2nd restart, 21:23)
- p2_film.js drafts every shot 0–90.5 s (shots dispatched by absolute time, credits overlaid). Page loads & renders.
- Fonts inlined in index.html. Render ~130–320 ms/frame.
- Session 3: FIXED grain hash in fx_p2.js (sin() precision loss left a diagonal grain-free band on
  every frame after ~30 s). Chorus reviewed at every cut (sheets c1..c5 in scratchpad).
- DONE (21:50): FGSM overflow 69.5; 摂動、襲来; Asuka split 76.467/76.8 (+cut 76.967); MNIST label;
  暴走 caption; Adam m_t fit 81.133; メ kerning; climax 83.7–86.1 = camera over the typeset attention
  formula cut on the original camera changes (CLIMAX_CAM) + θ double exposure 85.27; sub-cuts
  68.333/70.833/75.8/81.8/82.133; GPT-3 label; ΔW=BA (loraBA formula added); grokking 100.0|100.0
  collision at 56.3 fixed; argmin ghost alpha .46.
- Compare review done (scratch cmp.sh, 3 pairs/row): 1.5–66.5 (48 ts) OK.

- NOTES.md written (21:45). Perf: mean 250 ms/still incl. PNG, max ~500 (first engraving frame, warm-up);
  engraving rays batched. Outro re-cut: 87.667 black 1f, 87.7 θ₀ washed-out memory, 87.933 おめでとう.

- 21:55: official compare.sh run, 67 timestamps (out/opening_v2/p2_mincho/compare.jpg), all reviewed in compact
  sheets. Polished: val_acc card (Eva purple, green eye, big 1.000), crater (concentric cels + survey ×),
  ∇-in-ring station mark on 製作.

- 22:00: voiced-kana right air 0.035→0.012 em (デザイン looked loose); sun at 41.6–48.4 now deep orange
  (#e0561a) so the ED column reads. Frame-accurate cut check at 76.4–76.9 OK. FINAL STATE: complete.

## Next
1. Optional polish only. Deliverables complete (index.html + JS, NOTES.md).
