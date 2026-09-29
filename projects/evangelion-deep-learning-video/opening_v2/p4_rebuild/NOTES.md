# p4_rebuild — 「新劇場版」 cel-shaded 3DCG opening (1920×1080, 30 fps, 90.5 s)

## Concept (3 lines)
1. The 1995 OP re-shot as a Rebuild-era CG film: three.js cel shading (2–3 flat bands, analytic face-edge ink + inverted-hull silhouettes), painted skies, hard cuts on the original cut list.
2. Tokyo-3 is a GPU city standing in the (3,2) basin of Himmelblau's loss surface; its towers are server racks, the Geofront is a datacenter, the Angel is an L1-ball octahedron, Unit-01 is a heatsink-pyloned mech.
3. Every diagram is live math computed in `js/mathml.js` at load (optimizer runs, softmax attention, ring all-reduce, gradient clipping), and the staff credits name the papers, algorithms and hardware that "made" deep learning.

## Shot map (original → this film)
| Time (s) | Original shot | This film | ML idea |
|---|---|---|---|
| 0–2.4 | Black, white speck | Black, speck | — |
| 2.4–7.3 | Red roiling clouds, faint red emblem; 企画・原作 | Airbrushed red cloud field (3 parallax layers), faint red line-art of the L1 ball; 企画・原作 PERCEPTRON (Rosenblatt, 1958) | ‖w‖₁ ≤ t octahedron with its inscribed ‖w‖₂ ≤ t/√3 sphere (exact) |
| 7.3–10.4 | Blue Kabbalah engraving | Copper-plate engraving draped on the loss relief: log-loss contours (quarter levels), −∇f streamlines, medallions at all 9 critical points (MINIMVM I–IV, SELLA, MAXIMVM LOCALE) with their coordinates and f | Himmelblau critical points by Newton's method |
| 10.4–14.1 | Blue light blob; 企画/掲載 | The octahedron's blue core with slabs spreading; 企画 Project Eval. / 掲載 arXiv cs.LG | — |
| 14.1–15.9 | White flash, smoke, dark cross | Flash, zoom-blurred painted smoke, blurred dark cross, wordmark emerging | — |
| 15.9–22.9 | Wordmark, blue kana, final logo, flare 19.0, ring 21.0 | Original parody mark: EVALUATION (wide serif) / hand-built jagged ヱヴァリュヱーション / 新世紀; flare at 19.0, ring at 21.0 | — |
| 22.9–23.4 | White flash, blue X rays | Same construction | — |
| 23.4–26.93 | Blue sky; キャラクター/メカニックデザイン | Holds on blue sky under the credits, fast tilt down at 25.6 to the basin with the towers still sunk | BPE = "character" design; Tensor Cores / HBM = mechanic design |
| 26.93–29.9 | Face over sky; 副監督 | Towers rise out of the basin (seen from the southern rim) | 副監督 warmup / cosine decay (the towers rise on a ramp) |
| 29.9–33.9 | Profile over sky; 美術/色彩 | Long-lens skyline in flat navy silhouette; cream softmax beams between the 10 "token towers" | Real causal softmax attention: q = 3·R(−h)·PE(p), k = 3·PE(j), d = 64 |
| 33.9–37.9 | 撮影/音響 | 8 rank towers run a ring all-reduce; chunk displays fill cell by cell | Ring all-reduce: 2(N−1) = 14 steps, reduce-scatter then all-gather |
| 37.9–41.6 | Sunset, silhouette hand, green Sephirot | Unit-01 in black silhouette reaching over the sunset clouds; green "SYSTEMA ATTENTIONIS" tree draws over it | A Transformer block laid out as the Sephirotic tree |
| 41.6–48.4 | Second face; music + theme-song credit block | Sunset race: SGD+momentum (red) and Adam (cream) ribbons run down the surface, live f readouts | True update rules, seeded noise |
| 48.4–51.4 | Split panels, red eye, mech detail | Descent into the Geofront datacenter; the core as an eye; umbilical plug in its socket | 12V-2×6 plug = the umbilical cable |
| 51.4–52.9 | TEST TYPE plate, 4:59:56 timer, green grid | EVALUATION 2017 01 TEST TYPE plate; 活動限界まで timer counting down from 5:00:00 (UPS ride-through) with fp32/tf32/bf16/fp8 lamps; paged KV-cache block table | Transformer year; precision modes; paged attention |
| 52.9–58.4 | Cage, pilot clips, red silhouette | Unit-01 in its gantry; NVLink bridge clamps close on the temples; silhouette with eyes flashing | NVLink = neural clips |
| 58.4–60.0 | Commander, pale girl | Red sweep through the rack hall; pale octahedron | — |
| 60.0–66.8 | Mech close-ups; wings | Unit-01 close-ups on hot orange bars; arms spread with wings of light | 広報 leaderboard/h-index; 制作 PyTorch/CUDA; プロデューサー compute/power |
| 66.8–70.1 | Chorus montage; TEST TYPE, EVA-01 | Unit in the city, eyes, hand; TEST SET / EVAL-01 cards; red core | test set |
| 70.1–70.4 | ABSOLUTE TERROR FIELD | ATTENTION TENSOR FIELD (oversized A/T/F) | — |
| 70.4–72.3 | Moon, ANGELS, TOKYO-3, pyramid, org logo | Octahedron before the moon; PRIORS; sunset city; TOKYO-3; pink pyramid; NABLA mark ("Grad's in his heaven") | priors = what comes from above |
| 72.3–74.6 | Staff mugshots, map, bridge | The 8 ranks as mugshots (flat colour, RANK n, owned chunk), engraving map, rack bridge | Rank r owns reduced chunk (r+1) mod 8 after reduce-scatter |
| 74.6–74.8 | 人類補完計画 document | 極秘 次トークン補完計画 第７版中間報告, arXiv:1706.03762v7, 初版 二〇一七年六月十二日 | "Attention Is All You Need" versions |
| 74.8–76.1 | EVA heads; PROTOTYPE / PRODUCTION cards | Palette-swapped Units; PROTOTYPE EVAL-00 / PRODUCTION MODEL EVAL-02 | — |
| 76.1–78.1 | Classmates, pink blast | Attention heads 1–4 as mugshots (flat colour, silhouette skyline, beams), pink blast | Head h attends h tokens back (exact PE rotation property) |
| 78.1–78.6 | Yellow cross explosion | Yellow whiteout with an orange cross burst over the city, ‖∇f(−5,−5)‖ = 286.8 EXPLODING GRADIENT | Exact gradient norm |
| 78.6–79.5 | Berserk, commander, sketch | Crouched feral Unit; the Lance = clip_grad_norm_(max_norm=1.0), g · 0.00349 | Exact clipping factor 1/286.84 |
| 79.5–80.4 | SECOND IMPACT, white giant, satellite A.D. 2000 | SECOND IMPACT; white crucified silhouette; satellite crater: A.D. 2012, ILSVRC-2012 top-5 test error 26.2% → 15.3%, epoch 90, GTX 580 3GB ×2 | AlexNet |
| 80.4–82.6 | Blue void, sketch, green eye, ADAM card, scientist, green grid, director turning | Blue octa, sketch Unit, eye; ADAM card; Adam (Kingma & Ba, 2014) β₁=0.9 β₂=0.999 ε=10⁻⁸; printed attention matrix (MAGI green); both ribbons into the basin; Unit turns its head | ADAM = optimizer |
| 82.6–83.7 | 監督 card, green slash 83.6 | 監督 (vertical) 逆伝播 / 法; green slash at 83.6 | Backpropagation directed it |
| 83.7–86.1 | Arms spread on orange bars | Unit-01 arms spread (forearms raised), faint L1 emblem | — |
| 86.1–88.2 | Determined face, teal, black, smile | Unit under blue sky, teal close-up, black, flash; both runs arrive: f(3,2) = 0 (Adam step 54, SGD+M step 104) | convergence |
| 88.2–90.5 | 製作 on red, scrawled glyphs | 製作 ImageNet / Common Crawl on painted red with the Adam update rule scrawled in dark red | the data made it |

## Every number on screen and its source
- **Loss surface**: Himmelblau (1972), f(u,v) = (u²+v−11)² + (u+v²−7)². Critical points computed by Newton's method in `mathml.js`: minima (3, 2), (−2.805, 3.131), (−3.779, −3.283), (3.584, −1.848) with f = 0; local max (−0.271, −0.923) with f = 181.617; saddles (−3.073, −0.081) f = 104.015, (3.385, 0.074) f = 13.312, (−0.128, −1.954) f = 178.337, (0.087, 2.884) f = 67.719. Relief height = 30·ln(1+f/4), contours at ln(1+f) levels.
- **Optimizer race**: both runs start at (0, 0). SGD with heavy-ball momentum, PyTorch form (v←μv+g, θ←θ−ηv), lr 0.002, μ 0.9, gradient noise σ = 4 (seed 1). Adam: lr 0.08, β₁ 0.9, β₂ 0.999, ε 10⁻⁸, bias-corrected (Kingma & Ba, 2014). The on-screen f values are the actual per-step losses. "Arrival" = the first step with f < 0.01: Adam 54, SGD+M 104.
- **Attention**: sinusoidal PE with d = 64 (Vaswani et al., 2017, §3.5). PE(p+k) = R_k·PE(p), so a head with W_Q = 3·R(−h), W_K = 3·I scores q_p·k_j = 9·Σᵢ cos(ωᵢ(p−h−j)); scaled by 1/√d, causal mask, softmax. The printed matrix (81.4 s) and the beam widths are those weights (10 tokens).
- **Ring all-reduce**: N = 8 ranks, 8 chunks, 2(N−1) = 14 steps (Patarasuk & Yuan, 2009; popularised for DL by Baidu, 2017). The chunk cells show the exact number of summed contributions per chunk per step; after reduce-scatter rank r owns chunk (r+1) mod 8.
- **Gradient clipping**: ∇f(−5, −5) = (−154, −242), norm 286.84; `clip_grad_norm_(max_norm=1.0)` scales by 1/286.84 = 0.003486.
- **L1 ball**: the octahedron ‖w‖₁ ≤ t has inscribed sphere radius t/√3 (drawn in the emblem).
- **AlexNet** (Krizhevsky, Sutskever & Hinton, 2012): ILSVRC-2012 top-5 test error 15.3% vs 26.2% for the second-best entry; trained for roughly 90 epochs on two GTX 580 3 GB GPUs.
- **Adam defaults** β₁ = 0.9, β₂ = 0.999, ε = 10⁻⁸ (Kingma & Ba, 2014).
- **Transformer paper**: arXiv:1706.03762, v1 submitted 12 June 2017, current version v7 (hence 第７版). Plate "2017" = the same year.
- **Perceptron**: Rosenblatt (1958), Psychological Review.
- **Timer**: counts down in real seconds from 5:00:00 (a nod to both the Eva's five-minute internal battery and typical UPS ride-through); the digits are computed from t, and 88:88:88 is the lamp test.
- No other digits appear: tower LEDs and rack slots are unlabeled patterns; the KV-cache block labels B17… are sequential indices.

## Implementation notes
- `js/world.js`: geometry built from faces with per-vertex edge distances → constant-width ink without overdraw; Unit-01 adds an inverted hull for silhouettes. All animation is uniforms/joint angles set per frame from t (`resetWorld` restores everything, so every frame is a pure function of t).
- `js/shots.js`: the cut list (103 shots on the original cut times). `unitPose()` gives the hunched Eva stance with analytic ground contact; `camAt()` frames shots from Unit anchors.
- `js/paint.js` / `js/art.js`: skies and airbrushed masses are painted once at init and then only transformed.
- Performance (`bench.mjs`: SwiftShader, 1920×1080, renderFrame + JPEG readback exactly like the renderer; 46 frames every 2 s):
  - machine lightly loaded (load ≈ 3.6): mean 274 ms/frame, heaviest ≈ 490 ms (city views with shadows);
  - final build while three other directors were rendering and encoding (load 9–16; an empty frame then costs 2.5× its idle time): mean 398 ms/frame (excluding the warm-up first frame), heaviest 617–627 ms (emergence, cross). Since then the cross's bloom pass has been removed (c_cross now 0.55 s under that load). The heaviest shot, the emergence wide shot, measures 0.62–0.69 s while the machine is contended and ≈ 0.42–0.47 s at light load, so the lead's final render should run on a quiet machine.
  - The costs are known: the engraving plate is painted once into a 4096² mask draped on the relief; bloom runs only on the flare/ring/eyes/explosions; the 3D layer renders at 0.75 scale with a depth pre-pass.

## Known weaknesses
- No human characters: the character-driven verse (faces over sky) is replaced by city and sky compositions, so the emotional rhythm of 23–50 s rests on camera moves and credits alone.
- Unit-01 is built from faceted primitives (lofts and frusta). It reads as an Eva in silhouette and at mid distance, but close-ups show its low-poly construction.
- The painted-sky clouds are pre-rendered cel cumulus, so parallax against the 3D city is approximate (pan/tilt only).
- Some chorus inserts (lance, blue void, sketch frames) are simpler than the original's drawings.
