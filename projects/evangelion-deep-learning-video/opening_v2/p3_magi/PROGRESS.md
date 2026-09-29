# p3_magi progress

## Done (session 1, before restart)
- data.js (build_data.py), formulas.js, post.js (CRT/TV-master post), lib.js (run access, film-time→step map, 7-seg, plots, silhouettes, credits)
- s1_intro.js 0–23.4, s2_verse.js 23.4–66.8, s3_chorus.js 66.8–90.5 — all shots written, timeline covers 90.5 s
- stills reviewed up to 61 s

## Session 2 (partly lost to restart)
- chorus renders rv9–rv11 existed; key set already {1,12,20,34,38} in data.js (top-5 at step 14k; 3 & 28 = late arrivals)

## Session 3 (21:23 →)
- [x] review helper: scratchpad rv.sh NAME "t,t,.." → out/opening_v2/p3_magi/NAME/sheet.jpg (labelled, waits for other renders)
- [x] chorus 66.8–90.5 rendered + reviewed at ~0.25 s spacing (c1–c5): all shots OK
- [x] LEAD FIX 1: verse A screen re-laid out in fixed zones (title / credit band y110–440 / plot y470–800 / counter left + credit band right y850+); credits moved into bands (no data overlap, checked 24.5–37.6 incl. pull-back)
- [x] LEAD FIX 2: log line in header dropped; all monitor text ≥28 px (ticks) / 30–36 px (readouts, footers) across s1/s2/s3; MAGI diagram labels 30*s
- [x] LEAD FIX 3: pre_hot 60–64 redesigned: purple Unit-01 housing + green trim, black phosphor screen, green line + scan-hatch fill, orange light bars; 広報 credit centred with (Power et al., 2022)/(Nanda et al., 2023) parentheticals like the original
- [x] tree legend no longer runs through the crown node; pencil "grokking!" note moved off its curve; memorizer card WEIGHT NORM label
- [x] light_bars 83.7: only the real high-power bins burn white; + 4 purple/green close-ups on cuts 83.967/84.133/84.3/84.433, pull-back, circle superimposed 85.1
- [x] cu_wnorm: digits fully in frame (cropped '6' read as 58.6!) + label; red_core flat cel shading
- [x] NOTES.md written (concept, shot table, facts+sources, weaknesses); green-grid filler binary replaced by computed k>5% mask
- [x] chorus boundaries SNAPPED to op_cuts_detected.txt (all 66.8–88.2); new beats: lying 79.333, pencil_trio 82.367, grok_scope hot until 67.433 + close-up at 67.667, cu_bars cut 69.333; prototype/production block reordered like the original (proto scope+stats blue → PROTOTYPE → red scope+stats → PRODUCTION)
- [x] pre-chorus cuts: timer reframe at 52.267, greenbars→cage at 52.767; 14.1 flash holds white through 14.27; verse-A profile opacity 0.66
- [x] compare A (0.5–19.5), B (21–48.5), C (49.5–66.5) reviewed → cmp_A/B/C.jpg
- [ ] compare D/E/F (chorus + outro)
- [ ] perf check (≤0.6 s/frame) — blocked earlier by others' renders (p2 video); NOTE pgrep pattern must be "^node tools/render.mjs"

