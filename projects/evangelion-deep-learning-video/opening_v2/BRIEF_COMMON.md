# OPENING v2 — common brief (read fully before starting)

## What this is
A re-imagining of the **1995 TV opening of Neon Genesis Evangelion** (song: 残酷な天使のテーゼ, 90.5 s) for
**deep learning**. The viewer is an **ML engineer who loves Evangelion**. Their verdict on the previous attempt:
it didn't follow the real opening, the music was wrong, and it looked "AI-made". This time the bar is:

1. **An ML engineer gets excited.** Every ML mapping is clever *and technically correct*; there's real data, and
   there are in-jokes that only practitioners get.
2. **Good enough to pass for an official production.** Typography, layout, pacing, and film texture are at a
   professional anime-studio level.
3. **A true homage to and recreation of Evangelion.** The structure, rhythm, and signature moments of the real OP
   are recognizable within seconds, and the cuts land exactly on the original timings.
4. **No "AI look".** No generic neon or glowing-HUD soup, no filler numbers, no decorative particles.

Five different directors are each making one version. Yours must be **distinct in concept** from the other
four (you are told your direction below). Commit to it hard.

## Ground truth you must use
- `reference/song.wav` is the original song, 90.51 s. Your film is **exactly 90.5 s (2715 frames @ 30 fps)** and syncs
  to it. You cannot hear it, so use the timing data:
  - `opening_v2/shared/data/op_timing.json` has `beats` (189 tracked beats, ≈128.7 BPM), `lyrics` (line start/end +
    romaji), `sections`, and `shots` (a 45-entry shot map of the real OP with timestamps, descriptions, and credit roles).
  - `opening_v2/shared/data/op_cuts_detected.txt` lists automatic cut detections, which are dense in the fast chorus montage.
  - Key hits: vocal-only intro 0–14.2 (the band slams in at **14.2**); logo 15.9–22.9 (blue flare 19.0, ring 21.0);
    white flash 22.9; verse from 23.0; orange B-section from 37.9; build from 51.9; chorus 66.8–86.1 with 2–6 frame
    cuts; the 「監督」 card at **82.6**; a green slash wipe at 83.6; the final 製作 card on red from 88.2.
- **Look at the real OP.** It is for your eyes only; never embed, trace, or rotoscope its frames into output.
  - `reference/sheets/s_01..07.jpg` are timestamped contact sheets at 2 fps (the whole OP).
  - `reference/fine/title_01.jpg` (13.9–23.5 s @ 6 fps), `mid_01.jpg` (50.5–66.8 @ 6 fps), and `end_01/02.jpg`
    (66.5–90.5 @ 8 fps) cover the fast sections.
  - `reference/frames/f_NNNN.jpg` has single frames at 4 fps (index = round(t·4)+1), 480×360.
  - Study: credit typography and placement, the logo construction, the Kabbalah engravings, the text cards
    ("TEST TYPE", "ABSOLUTE TERROR FIELD", "ANGELS", "TOKYO-3", "SECOND IMPACT" in red, "ADAM" black-on-white),
    the 人類補完計画 document, the 4:59:56 activity timer, and the green data grids.

## Hard rules
- Work **only** inside your folder `opening_v2/<your_pattern>/`. Read anything else, but **do not modify** `src/`,
  `tools/`, `opening_v2/shared/`, `reference/`, or other patterns. Copy files into your folder if you need changes.
- **No git commands** (no commit, no push). The lead handles git.
- **Don't render the full video.** Render stills and review them. The lead renders the final.
- Every frame must be a **pure function of t**: deterministic and seeded, with no accumulated state across frames.
- Performance: **≤ 0.6 s per frame** in headless Chromium (4 CPU cores, SwiftShader WebGL). Measure it.
- No official logos: don't reproduce the EVANGELION logo or the NERV fig-leaf logo. Design **original parody marks** in
  the same design language, e.g. a wide Roman serif wordmark, a jagged orange-red katakana underneath, and a small
  新世紀 above it.
- **Credits are mandatory** (the real OP runs staff credits almost continuously: small role, big name, white heavy
  mincho). Parody credits must name **concepts, algorithms, papers, libraries, hardware, or datasets**. Do **not** put
  real living people in fake roles; a paper citation such as 原作「Attention Is All You Need」(Vaswani et al., 2017) is fine.
- All text is spelled correctly (JP/EN). Every number on screen is either **computed from something real** or a
  **real published value**; give the source in NOTES.md. No random filler digits.

## Anti-"AI look" checklist (violations = failure)
- No neon-glow-everything, and no bloom except where the real OP has light (flares, explosions, wings, the cross).
- No floating dust or particles, decorative bokeh, generic HUD brackets, or scanline overlays on everything. Use HUD
  graphics only where the reference has screens (4:59:56 timer, green grid, MAGI-like data), and then match *its* style.
- No decorative gradients. The 1995 OP uses **flat cel colours**, painted skies, hard cuts, 1–3 frame flashes,
  double exposures, and slow camera pushes or pans with holds.
- No symmetric-centred-everything compositions. Copy the OP's actual layouts: credits sit left or right in fixed spots,
  vertical 監督, big names.
- Japanese typography: use a Matisse-like heavy mincho, `"Noto Serif CJK JP"` weight 900, `"Shippori Mincho B1"` 800, or
  `"Zen Old Mincho"` 900. Compress it horizontally about 0.82–0.92. No letter-spacing hacks on kanji unless intended.
- Text cards like "ABSOLUTE TERROR FIELD" use a bold condensed grotesk: `"Roboto Condensed"` 700 or `"Liberation Sans"`
  bold with scaleX. Match the oversized first letters.
- Texture: subtle grain, slight gate weave (±1 px), mild softness. 4:3 patterns should feel like a 1995 TV master.
- No emoji, no rounded "app" cards, no drop shadows everywhere, no Lorem-ipsum-like English babble.

## Engine (optional but recommended — it's proven)
- Page template: see `episodes.html` / `opening.html`. Set `window.CANVAS_W/H` **before** `src/core.js`
  (4:3 → 1440×1080). Load fonts via `<link rel="stylesheet" href="../shared/fonts/fonts_v2.css">`. It provides Klee One,
  Shippori Mincho B1, Zen Kurenaido, Roboto Condensed, Cinzel, EB Garamond, Zen Old Mincho, Share Tech Mono, Barlow
  Condensed, and JetBrains Mono. System fonts include Noto Serif/Sans CJK JP (all weights) and Liberation Serif/Sans.
  If you use a font in canvas, add it to the preload list, i.e. your own copy of `src/main.js`, because READY awaits
  `document.fonts.load`.
- `src/core.js` provides math, easing, RNG, text/measure, panel, hexGrid, stripes, axes/plotLine, formula (MathJax SVG),
  titleCard, caption, octahedron, and rot3/proj. `src/fx.js` is the WebGL post-process (bloom, chromatic aberration,
  grain, scanlines, vignette, glitch, flash); set `fx.*` per frame and turn off what you don't want. `src/main.js` does
  timeline assembly. Scenes are `SCENES.push({name, dur, draw(ctx,t,fx), cues(){}})` in order and must sum to 90.5 s.
- Formulas: copy `tools/build_formulas.mjs` into your folder, edit the TeX list, write your own `formulas.js`
  (`node <yourfolder>/build_formulas.mjs`; mathjax-full is in the root node_modules).
- 3D is available: `npm i three --prefix opening_v2/<pattern>` and load it from your folder's node_modules (the render
  server serves the whole project root).
- Real ML data:
  - `opening_v2/shared/data/grokking.json` is a **real grokking run** (2-layer MLP, (a+b) mod 97, 30% train, AdamW wd=1.0,
    30k steps). Its fields are `steps`, `train_loss`, `val_loss`, `train_acc`, `val_acc`, `wnorm` (every 50 steps), and
    `snap_steps`, `fourier` (normalized power over 48 frequencies), and `emb2d` (97 points projected onto the dominant
    Fourier plane, every 250 steps).
  - Feel free to compute more with NumPy (scipy, librosa, and matplotlib are installed), e.g. Chinchilla
    L(N,D)=E+A/N^α+B/D^β with E=1.69, A=406.4, B=410.7, α=0.34, β=0.28 (Hoffmann et al., 2022).

## Commands
```bash
cd /home/user/Claude_workspace/projects/evangelion-deep-learning-video
# stills (PNG) into out/opening_v2/<pattern>/stills/
node tools/render.mjs --page opening_v2/<pattern>/index.html --out out/opening_v2/<pattern> --w 1440 --h 1080 --stills 3,12.5,20,70.2
# side-by-side vs. the original at the same timestamps -> out/opening_v2/<pattern>/compare.jpg
bash opening_v2/shared/compare.sh opening_v2/<pattern> 1440 1080 "3 12.5 20 30 45 60 70.2 82.8"
# quick contact sheet of your stills
ffmpeg -y -v error -pattern_type glob -i 'out/opening_v2/<pattern>/stills/*.png' -vf "scale=480:-1,tile=4x4" out/opening_v2/<pattern>/sheet.jpg
```
Use `--w 1920 --h 1080` if your pattern is 16:9. View images with the Read tool, a few at a time (tiled sheets are
efficient). Review **at least 60 timestamps** across the whole 90.5 s before you finish, including every
section boundary and the chorus montage at frame resolution. Iterate until each still would survive a studio review.

## Deliverables in your folder
- `index.html` plus your JS, i.e. a complete 90.5 s film at your chosen resolution.
- `NOTES.md` containing: your concept in 3 lines; a table mapping each original shot → your shot, with the time range
  and the ML idea; every ML fact or number with its source; known weaknesses.
- In your final message: the resolution, the path of 8–12 representative stills, and a frank self-assessment against
  the 4 goals.
