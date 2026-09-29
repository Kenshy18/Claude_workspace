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

## Next
1. Compare 66.7–90.5 vs reference; final compare.sh run (≥60 ts).
2. Final compare.sh (≥60 ts) + final polish pass; update NOTES shot table if anything changes.
