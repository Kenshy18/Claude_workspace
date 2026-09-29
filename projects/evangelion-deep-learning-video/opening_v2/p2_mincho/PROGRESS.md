# p2_mincho progress

## State (session 3, resumed after 2nd restart, 21:23)
- p2_film.js drafts every shot 0–90.5 s (shots dispatched by absolute time, credits overlaid). Page loads & renders.
- Fonts inlined in index.html. Render ~130–320 ms/frame.
- Session 3: FIXED grain hash in fx_p2.js (sin() precision loss left a diagonal grain-free band on
  every frame after ~30 s). Chorus reviewed at every cut (sheets c1..c5 in scratchpad).
- Chorus fix list (in progress): FGSM overflow 69.5; 摂動、襲来; Asuka split 76.467/76.8 (+cut 76.967);
  MNIST label; 暴走 caption collision; Adam m_t crop 81.133; メ kerning; climax 83.7–86.1 camera;
  sub-cuts 68.333/70.833/75.8/81.8/82.133; GPT-3 label.

## Next
1. Apply chorus fix list, re-review; outro 86.1–90.5 check.
2. NOTES.md (concept, shot table, sources, weaknesses).
3. Perf check; ≥60-timestamp compare.sh review.
