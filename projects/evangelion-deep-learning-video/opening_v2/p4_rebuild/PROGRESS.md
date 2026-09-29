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
- 21:50 DONE Unit-01 rebuild (world.js buildUnit): loft()/slab()/faceOut() helpers, inverted-hull silhouette (hullMat,
  withHull), jointed hips/knees/ankles/torso/head/shoulders/elbows, anchors (eyes/head/horn/chest/socket/handL/handR)
  via WD.unitAnchor(); tapered heatsink pylons (fin pattern 6) beside a 1.3× head w/ horn+jaw; TYPE-01 decal;
  umbilical plug + cable. shots.js unitPose() = hunched default; all Unit shots re-framed with camAt(anchor,...).
