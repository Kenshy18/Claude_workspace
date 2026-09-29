# p4_rebuild — progress log
## Done (session 2, after restart)
- Timeline (js/shots.js) spans 0–90.51 s, ~110 shots on the original cut times; page loads & renders all frames.
- Fixed: initArt() never called; U.uSwap missing; web fonts never loaded under tools/render.mjs (it serves .css as
  octet-stream → Chrome drops fonts_v2.css) → fonts now registered via FontFace API in main.js.
- Perf: CPU-raster 2D canvases (willReadFrequently), 3D at 0.75 scale (1440×810) upscaled, shadow map 1024,
  depth pre-pass, post upload without CPU flip/unpremultiply, 3-tap post shader, terrain noise baked per vertex.
  Under contention (load ~5–7) mean went ~1150 → ~580 ms/frame.
- Profiling: scratchpad prof.mjs; set window.PROFILE=1 for sync points (main.js window.__T).
## Next
- Unit-01 redesign (Eva silhouette: tall shoulder pylons, low head + horn, slim limbs, elbow joints), poses.
- Intro red clouds, slam smoke, emergence framing, director card, rank/pyramid shots, credit legibility, NOTES.md.
## Session 3 (after 2nd restart) — started 21:25
- Lead review: (1) Unit-01 redesign top priority (lean Eva proportions, small horned head + jaw, huge pylons,
  hunched stance, NO chest fan; GPU joke subtle: heatsink fins on pylons, small TYPE-01 stencil);
  (2) credits must sit on sky/flat areas; (3) aerial city grey blotches (terrain urb tint) → remove.
- Plan: new buildUnit (loft helper + inverted-hull silhouette, jointed legs/torso/head, anchors), then city fixes.
- 21:35 DONE Unit-01 rebuild (world.js buildUnit): loft()/slab()/faceOut() helpers, inverted-hull silhouette (hullMat,
  withHull), jointed hips/knees/ankles/torso/head/shoulders/elbows, anchors (eyes/head/horn/chest/socket/handL/handR)
  via WD.unitAnchor(); tapered heatsink pylons (fin pattern 6) beside a 1.3× head w/ horn+jaw; TYPE-01 decal;
  umbilical plug + cable. shots.js unitPose() = hunched default; all Unit shots re-framed with camAt(anchor,...).
- 21:45 DONE lead items 2+3: credits carry a faint soft dark fringe (credits.js shadowBlur); terrain urb tint softened
  (smoothstep edge, near-land tone, tUrbA 0.6); octa excluded from shadow pass. Re-framed: sky_tilt (holds in blue sky
  under credit block 1, fast drop at 25.6 to the basin; towers sunk), emergence (from the southern rim, credits on green),
  attention (long lens, skyline in flat navy silhouette + cream beams), ring (city right half, credits on terrain).
- DONE intro: A.redClouds (3 airbrushed parallax layers, painted at init), slam: A.smoke zoom-blurred painted smoke +
  pre-blurred dark cross; blue_core octa moved right of credits.
- 22:10 DONE chorus pass: rank mugshots (camera outside the ring on the chunk face, flat colour bg, LEDs full, RANK n
  label), head mugshots (silhouette skyline on flat colour, HEAD n + W_Q label; R(-h) sign fixed), pink pyramid,
  NABLA keyline, satellite framed inside terrain, loss_a (both ribbons into the basin), loss_b (Unit turns head),
  converged (f(3,2)=0 + arrival steps), 監督 138px. Shader warm-up in main.js (WD.warmup()).
- Perf (bench.mjs, load ~3.6): mean 274 ms, worst non-first frame ~490 ms. First frame of a run ~700 ms (warm-up).
- NEXT: NOTES.md; ≥60-timestamp compare review; remaining polish (lance shot, sunset_touch hand, c_unit02 read).
- 22:25 DONE NOTES.md (concept, shot map, every number + source, weaknesses). Compare review A+B done (scratchpad
  p4cmp.sh → p4_A_*.jpg, p4_B_*.jpg): intro credits enlarged (block1 70/150, block2 72/118), credits t0>20 ×1.3,
  theme block titles re-spaced, kana VH .95 + strokes ×1.3 + overlaps wordmark, no bloom under credits (blue_core,
  wings: painted glows), AlexNet label = TEST error, sunset_touch = Unit silhouette reaching over the sunset.
- NEXT: compare batches C, D, E (52.7→90), then perf re-measure and final report.
- 22:35 compare C reviewed (cage/silhouette/63 s head/wings/eyes match well; cut timings verified vs 8 fps sheet).
  Code-only while queue busy: Lance thicker (w 2.0, bigger fork), EVAL-02 guard pose, production card larger,
  engraving contours at quarter levels (tiered weights). Compare D running, then E, then bench.
- 22:55 Compare D+E reviewed (all sections now matched; 78 timestamps total incl. A–C). Fixed: 監督 card 178/360 px,
  Lance enters on screen, EVAL-02 framing. PERF FIX: engraving was 1–2.5 s/frame (Skia rasterising ~70k line points);
  now painted ONCE into a 4096² mask (A.engravingMask) and draped on the terrain relief (WD.buildEngraving/engraved)
  → one textured mesh per frame. main.js resets all 2D state per frame (shadow, dash, caps, align).
- NEXT: full bench, representative stills in out/opening_v2/p4_rebuild/final/, final report.
- 23:05 FINAL polish: c_cross = yellow whiteout + orange cross (no bloom), mugshot labels fringed, NOTES perf updated.
  Representative stills: out/opening_v2/p4_rebuild/final/stills (12) + final/sheet.jpg. Bench (load 9–16): mean 398 ms
  excl. warm-up; earlier light load: 274 ms. Depth pre-pass verified beneficial (A/B).
