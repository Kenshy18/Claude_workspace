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

## Review pass 1 (22:40): 128 timestamps via compare.sh (out/opening_v2/p5_ekonte/review/b1..b8)
- perf: avg 108 ms, max 181 ms per frame (hatch masks prebuilt at READY)
- camNotesY now s=1.2 showing panel + notes (no cropped credits)
- fixed: C-004 dots dark, C-006 faster rough, C-009 flash timing, tree of life green, 企画=Chinchilla
- TODO from review: bigger text cards; C-071 blue face sketch, C-072 red MODEL CARD, C-073 gloved
  hands; C-034 wings light; C-020 low-angle warp; C-039 hand; C-085 explosion; portraits offsets;
  C-027 wall; C-053 figure bigger; 監督 name bigger; C-108 fade; C-092/094/095; C-050 glow; NOTES.md

## 23:05
- NOTES.md written (concept, format, timing, shot map, credits, number sources, weaknesses)
- fixes applied: cards enlarged, 監督 name 400px, C-071 face sketch, C-072 MODEL CARD, C-073 gloves,
  C-034 wing light, C-020 low-angle warp, C-039 new mechaHand, C-085 explosion+cross light,
  portrait offsets/ears/shading, C-027 pencil wall, C-050 glow, layer counts = 6×2 sublayers, NIPS 2017
- remaining polish: C-092/094/095/096/100/101 drawings, wing glow over unit, C-073 mouth colour

## 23:30
- polish: wing glow toned down, C-022 face detail, C-094/095/100/101 redrawn, C-092 humanoid giant of
  light, C-039 hand proportions (bigger, rotated). Next: final >=60-timestamp compare pass + handback.

## 23:50 final pass 2 done (~110 more timestamps: review/p2a,p2b + rC..rG sheets)
- C-044 close mecha crop, C-076 shared mecha in red with 4 eyes, C-012 silhouette blob, subscripts
- C-027 wall cached to an offscreen canvas (was ~1 s/frame)
- representative stills: out/opening_v2/p5_ekonte/final/stills/*.png (12)
- machine load avg ~26 from other renders: perf numbers taken now are unreliable; idle run gave 108 ms avg

## 00:10
- perf fixed properly: offscreen canvases now CPU-backed (GPU canvas patterns forced readbacks);
  whole film avg 97 ms / max 170 ms per frame incl. JPEG
- real data replaces the illustrative C-022 inset; C-019 labels L6/H8; WASH_K = 0.9 lighter washes
- C-096 uses the shared head design
- STATUS: complete 90.5 s film, reviewed at ~240 timestamps; NOTES.md up to date

## Next (only if more time is given)
- figure drawing quality: faces (C-022, C-024, C-087 busts) and the unit head are still stiff and procedural
- C-094 / C-101 / C-071 sketches could be looser; a C-100 turn with more in-between poses
- the hatch-tile repeat is sometimes visible on big washes
