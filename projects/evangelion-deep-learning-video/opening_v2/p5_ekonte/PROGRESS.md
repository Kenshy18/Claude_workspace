# p5_ekonte progress
(resumed after 2nd machine restart, 2026-09-29 ~21:25)

## Done
- engine.js (paper/form, pencil strokes, marker, handwriting, MathJax-as-hand, paste-up credits, post)
- motifs.js (clouds, transformer diagram, slab stack, GPU, mecha, attention grid, plots, 7-seg, cards)
- cuts_table.js: 108 cuts measured from the real OP, s+k durations
- film.js: timeline, per-cut builder, camera, render
- c_intro.js C-001..C-009, c_verse.js C-010..C-019, c_pre.js C-020..C-034 (complete)
- data_p5.js (prep_data.py), formulas_p5.js (build_formulas.mjs)

## Lead review (21:25) — to address
1. panels read as finished colour art -> graphite-dominant, colour only as sparse accents
2. notes unreadable at 1080p -> rostrum camera: push in on panel, slide to notes column while a
   derivation is written (28-36 px), pull back at section boundaries
3. low contrast -> darker graphite, visible paper tooth, "photographed" sheet
4. priority: all 90.5 s drafted first

## Done since restart (21:25-22:10)
- engine: marker modes (wash / graphite / accent / solid), cluster hatch tiles, darker graphite,
  stronger paper tooth; credits = black 写植 on pasted paper strips (INK); fraction-bar cache fixed
- film.js: auto rostrum camera keys (CAM_P panel push-in, camNotesY for research bursts, ROW at
  section starts; credit entrances force panel; S.noNotesCam / S.camKeys / S.panelWins overrides)
- c_chorus.js C-035..C-102 drafted (frame-accurate content map from op_original.mp4)
- c_end.js C-103..C-108 drafted (T.B. crucifix + W, faces, 製作, pull-back + おわり + F.O.)
- WHOLE 90.5 s NOW EXISTS. All stills render without errors.

## Plan / Next
A. engine restyle: FULL/large markers -> coloured-pencil hatch wash (pattern), dark markers -> graphite
   tone, small colour markers kept as accents (alpha down); darker strokes; credits = black 写植 strips
B. c_chorus.js C-035..C-102, c_end.js C-103..C-108
C. auto camera keys per cut (PANEL / NOTES(y) / ROW), credit windows force PANEL
D. drawMath fraction-bar cache bug (rule stroke cached on shared formula object -> per item)
E. NOTES.md, >=60-timestamp compare review, polish
