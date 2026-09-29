# p2_mincho progress

## State (session 2, resumed after restart)
- p2_film.js drafts every shot 0–90.5 s (shots dispatched by absolute time, credits overlaid). Page loads & renders.
- Fonts inlined in index.html (render.mjs serves .css as octet-stream). dev_* helpers deleted.
- Session 2 fixes: kana optical kerning table (p2_lib), engraving red->blue dissolve, verse-A x legible,
  tree engraving redesigned (medallion nodes, Kircher-style heading), 59.1–60.0 re-cut to the reference,
  Chinchilla/resgrad overlaps, ED column (Heavy Ball / LION), attention-bars labels.

## Next
1. Chorus 66.7–86.1 at frame resolution; outro 86.1–90.5.
2. NOTES.md (concept, shot table, sources, weaknesses).
3. Perf check (mean ~270 ms/frame under load; re-measure when idle).
