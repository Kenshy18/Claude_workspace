# p3_magi — 「MAGI監視記録」 (4:3, 1440×1080, 90.5 s / 2715 f @ 30 fps)

## Concept (3 lines)
The whole opening is NERV/MAGI monitor footage of **one real training run**: `opening_v2/shared/data/grokking.json` (a 2-layer MLP learning (a+b) mod 97).
Film time is mapped non-linearly onto training steps so the run's true story rides the song: memorization in the verses, the plateau and weight decay in the pre-chorus, and **the grokking jump landing on 66.8 s** ("zankoku na tenshi no teeze").
Every shot is a recreation of the 1995 OP's layout, colour, and cut timing, rebuilt out of real plots of that run; the key Fourier frequencies play "the Angels", and weight decay is the director (監督 荷重減衰).

## Film time → training step
Monotone cubic (Fritsch–Carlson) through story keyframes (`lib.js`, `TK`):
0–23.4 → step 0 · 26.3 → 60 · 29.9 → 170 · 33.4 → 250 (train acc locks at 100 %) · 37.9 → 600 · 44.9 → 1,550 (val-loss peak, "unmei sae mada shiranai") ·
51.9 → 3,000 · **66.8 → 9,982.8 = G₀** (val loss falls back under ln 97) · 67.4 → 13,000 · 68.1 → 14,000 · 72 → 17,000 · 80 → 22,000 · 86.1–90.5 → 30,000.
Values between logged points are linearly interpolated (loss on a log scale); the embedding is interpolated only between 250-step snapshots that share the same dominant Fourier plane, otherwise it hard-switches.

## Shot map (original → this film)
| Time (s) | Original OP shot | p3_magi shot | ML idea / what is on screen |
|---|---|---|---|
| 0–2.4 | black, tiny flare | `crt_warmup` | a CRT warming up: one phosphor dot, then the raster line |
| 2.4–7.3 | red clouds, emblem, 企画・原作 | `magi_boot_red` | red field, MAGI trinity line-art; credit 企画・原作 **Power et al.** *Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets (2022)* |
| 7.3–10.4 | blue Kabbalah engraving, push | `cayley_engraving` | the whole task as a copper-plate **Cayley table of (a+b) mod 97**; the exact 30 % training cells of grokking.py's seed-0 split are hatched; roundels PARS DOCTA 2,822 / PARS IGNOTA 6,587; the camera travels along an anti-diagonal (every cell on it has the same answer) |
| 10.4–14.1 | blue watery blob, credit | `emb_blob` | the **untrained embedding** (step 0, 97 points on its dominant Fourier plane) painted as pools of light; 2-frame premonition ring at 13.97 = mean radius of the step-30k circle; credit 解析 Nanda et al. / 掲載 ICLR 2023 |
| 14.1–15.9 | flash, smoke, giant cross | `plus_smoke` | the task's "+" whips through smoke; the wordmark surfaces |
| 15.9–22.9 | wordmark, blue katakana, final logo (flare 19.0, 新世紀 19.4, ring 21.0) | `logo_word` / `logo_blue` / `logo_final` | original parody mark: 新世紀 / **EVALUATION** (wide Cinzel) / jagged orange-red katakana **エヴァリュエーション** built from hand-set blade polygons; blue flare 19.0, 新世紀 19.4, ring 21.0 |
| 22.9–23.4 | white flash, blue X rays | `logo_flash` | same, on the original's timing |
| 23.4–37.9 | blue sky, face double exposure, silhouettes, 6 credit cards | `verseA_main` | the big blue MAGI screen is the sky: **train acc climbs 1.4 % → 100 % (step 250)** while val acc sits at chance (dashed 1/97); operator profile double-exposed, standing silhouettes slide in on the original's beats, camera pulls back into the control room. Credits (fixed bands, never on data): キャラクターデザイン 埋め込み 97×128 · メカニックデザイン MLP 256×256 / ReLU · 副監督 AdamW β 0.9·0.98 · 美術監督 フーリエ基底 · 色彩設定 蛍光体 P1・P3 · 撮影監督 フーリエ平面射影 · 音響監督 交差エントロピー · 音響制作 log-softmax |
| 37.9–39.3 | orange sunset, black hand | `verseB_hand_tree` | inverse-video amber screen: **train loss plunges to the 1e-5 logging floor**; a black hand reaches for the curve |
| 39.3–41.6 | green Tree of Life | (same shot) | the model's **computation graph as a Sephirotic tree** — a, b, E[a], E[b], concat 256, W₁x+b₁ (256×256), ReLU, W₂h+b₂, logits 97, softmax; SYSTEMA PERCEPTRONICVM / EX DIVINO NVMERO XCVII |
| 41.6–48.4 | second face on sunset, music + theme-song credit block | `verseB_valloss_profile` | **val loss climbs to 22.05 nats (step 1,550), far worse than a uniform guess ln 97 = 4.575**: pure memorization. Credits 音楽 三角関数 / 音楽協力 NumPy; the two-column theme-song block becomes a live train/val sheet (2,822 vs 6,587 pairs; 100.0 % vs 0.00 %; loss < 0.00001 vs ~21; 丸暗記 vs 偶然以下) |
| 48.4–50.8 | face in split panels, red eye | `verseB_hardcopy`, `verseB_eye` | four pink hardcopies of the four metrics at one step; the embedding scope in red as an iris that is **not yet a circle** (r-CV readout) |
| 50.8–51.4 | machine detail | `verseB_printer` | green-bar line printer feeding grokking.py's real log records |
| 51.4–52.2 | "EVANGELION 2014 / 01 / TEST TYPE" stencil | `verseB_stencil` | "EVALUATION / 6587 / 01 / TEST TYPE" (6,587 = held-out pairs) |
| 52.2–52.5 | 4:59:56 活動限界 display | `pre_timer` | **汎化開始まで**: wall-clock time grokking.py still needs to reach G₀, at its measured 53.97 ms/step; 8:88:88 segment test first; 内部 INTERNAL; 荷重減衰システム λ = 1.0; lr buttons (1e-3 lit) |
| 52.5–52.9 | green angled bars (B17, D23) | `pre_greenbars` | Fourier power of the embedding for k = 1…48 as the angled neon bars; uniform 1/48 line |
| 52.9–54.6 | robot in cage, OP animation credits | `pre_wnorm` | **‖W‖ on the tilted cage monitor: peak 95.9 at step 1,450, decaying under weight decay**; the AdamW update rule; credits 作画 順伝播 / 逆伝播, 演出 全バッチ勾配降下 |
| 54.6–56.6 | pilot head, eyes open | `pre_headset_digits` | operator in headset before the val-loss log plot; then the val-loss 7-segment readout |
| 56.6–58.4 | robot silhouette, eyes flash | `pre_redspectrum` | spectrum in the dark; the two leading frequencies flash white (the eyes); "pattern BLOOD TYPE : BLUE" |
| 58.4–59.5 | commander, glasses glint | `pre_commander` | the commander before the countdown |
| 59.5–60.0 | pale character on concrete | `pre_stdout_paper` | grey paper: grokking.py's own stdout (it prints every 1,000 steps) |
| 60.0–64.0 | purple/green robot on hot orange, 広報 / アニメーション制作 | `pre_hot` | Unit-01-purple monitor housing with green trim: **val loss (log) turns down, then val acc lifts off chance (log axis)**; green phosphor line with scan-hatch fill. Credits 広報 arXiv:2201.02177 (Power et al., 2022) / arXiv:2301.05217 (Nanda et al., 2023); アニメーション制作 Canvas 2D / WebGL |
| 64.0–66.8 | wings of light, プロデューサー | `pre_wings` | the full 96-bin DFT spectrum of the embedding (k and 97−k carry equal power) as wings around the embedding "eclipse"; key-5 share readout; credit プロデューサー 勾配降下法 |
| 66.8–70.1 | chorus montage (hand, eyes flash, TEST TYPE, city, EVA-01, mask, red sphere) | `grok_valacc`, `grok_scope`, GROKKING card, `city_table`, MLP-01 card, `cu_wnorm`, `cu_losses`, `cu_bars`, `paper_mask`, `red_core` | **66.8: val acc shoots 16 % → 79 % → 99 %** (GROKKING / 汎化 warning); the 97 points snap into a circle on plane k = 12 (the n→n+1 star polygon {97/12}); cards GROKKING (= TEST TYPE) and MLP-01 (= EVA-01); the table in perspective as the city; key frequencies spiking |
| 70.1–70.4 | ABSOLUTE / TERROR / FIELD | `card_atf`, `red_formula` | **A**NGLE-SUM / **T**RIG / **F**ORMULA, then cos ω(a+b) = cos ωa cos ωb − sin ωa sin ωb on red: the mechanism the network learned (Nanda et al.) |
| 70.4–71.2 | pale figure before the moon | `moon` | figure before a moon carrying the circle |
| 71.2–72.3 | ANGELS → sunset city → TOKYO-3 → pyramid → red org logo | FOURIER card, `skyline`, MOD-97 card, `magi_verdict`, `emblem` | the spectrum as a sunset skyline; MAGI verdict 承認 ×3 (提訴: 汎化); original parody emblem "MOD XCVII" |
| 72.3–74.6 | staff mugshots, map, bridge, red eye sketch | `file_12/1/20/34/38/3/28`, `fmap`, `bridge`, `red_sketch`, `commander_cu` | **frequency mugshots**: cos/sin(2πkx/97) sampled on the 97 residues, power and rank at step 30k, KEY-5 vs LATE ARRIVAL; Fourier-power heat map with the G₀ line; operators before three screens |
| 74.6–74.8 | 極秘 人類補完計画 第17次中間報告 | `document` | 極秘 **汎化補完計画 第56次中間報告** (snapshot 56 = step 14,000, val acc 99.8 %) |
| 74.8–76.1 | robot heads, PROTOTYPE EVA-00 / PRODUCTION MODEL EVA-02 | `scope_1k`, `scope_30k`, cards, `memorizer_red` | the memorizer (step 1,000: train 100 %, val 0.0 %, val loss 19.11, ‖W‖ 90.6) vs the generalizer (step 30,000: r-CV 0.015); PROTOTYPE CKPT-1k / PRODUCTION MODEL CKPT-30k |
| 76.1–78.1 | classmates' mugshots, pink explosion, city explosion | `mug_*`, `red_table`, `pink_burst`, `table_flash` | six "mugshots" of whole-run curves: train acc, val acc, losses, ‖W‖ 21.2 → 95.9 → 61.1, key-5 share 11.2 % → 70.3 %, r-CV 0.47 → 0.015 |
| 78.1–78.6 | cross-shaped explosion | `plus_explosion` | the "+" whiteout |
| 78.6–79.5 | berserk unit, young commander, sketch | `berserk_dark`, `commander_young`, `pencil_memo` | pencil memo of the first 3,000 steps: "丸暗記… val = 0 %" |
| 79.5–80.4 | SECOND IMPACT (red), white giant, crater "TIME +10 sec" | `card_second`, `white_descent`, `crater` | the val-loss curve as the white giant; satellite view of the impact: STEP 9,983 (G₀), "+1,226 STEPS VAL 50 %" |
| 80.4–81.0 | blue void, pencil boy, green eye | `blue_void`, `pencil_grok`, `purple_eye` | pencil note "grokking! step ≈ 11,210" |
| 81.0–81.1 | ADAM (black on white) | `card_adam` | **ADAM** with a small **W**: the optimizer actually used (AdamW) |
| 81.1–82.6 | scientist profile, green data grid, director turning | `profile_cyan`, `green_grid`, `director_turn` | 48-cell green grid: power of every k at 10 snapshots (every 3,000 steps) |
| 82.6–83.7 | 監督 card, green slash 83.6 | `director_card` | 監督 **荷重減 / 衰** (weight decay): without wd = 1.0 this run does not grok |
| 83.7–86.1 | unit, arms spread, orange light bars | `light_bars` | 96 DFT bins as vertical light columns: exactly the bins of k ∈ {1,3,12,20,28,34,38,41} and their mirrors burn white; the "+" in Unit-01 colours; the converged circle superimposed |
| 86.1–87.6 | determined face on blue, then teal | `converged` | 学習完了 table (step 30,000, train/val 100.0 %, ‖W‖ 61.1, key freqs, key-5 power 70.3 %, r-CV 0.015); teal close-up of VAL ACC 100.0 |
| 87.6–88.2 | black → smile on green | `black`, `smile` | the converged circle on green |
| 88.2–90.5 | 製作 on red with scrawls | `seisaku_red` | 製作 grokking.py / NumPy; scrawled cos(2π·12x/97) samples and "(a+b) mod 97"; fade out |

## ML facts and numbers on screen, with sources
Everything is computed from `opening_v2/shared/data/grokking.json` by `build_data.py` (→ `data.js`) or read live from it in the page.
- **Run config** (grokking.py): p = 97, train fraction 0.3, full-batch AdamW, lr 1e-3, weight decay 1.0, β = (0.9, 0.98), embedding 97×128, MLP [E_a;E_b] (256) → 256 → 97, ReLU, 30,000 steps, seed 0. Logged every 50 steps; embedding snapshots every 250.
- **Split**: int(0.3 · 9,409) = 2,822 train pairs, 6,587 validation pairs; the hatched cells of the Cayley table are the exact seed-0 permutation of grokking.py (reproduced in build_data.py).
- **Memorization**: train acc first logged at 1.000 at step 250; val acc 0.000 from step 250 to ~8,000; val loss peaks at **22.05 nats at step 1,550**; at step 1,000 val loss 19.11, ‖W‖ 90.6. ln 97 = 4.5747 nats is the loss of a uniform guess.
- **‖W‖** (L2 norm of all parameters incl. biases, logged by grokking.py): 21.2 (init) → **95.9 peak at step 1,450** → 79.2 (10k) → 70.1 (14k) → 61.1 (30k).
- **G₀ = step 9,982.8**: val loss crosses back below ln 97 (linear interpolation between logged points). **G₅₀ = 11,208** (val acc 50 %), G₉₉ = 13,605. Val acc: 0.049 (9k), 0.164 (10k), 0.423 (11k), 0.775 (12k), 0.962 (13k), 0.998 (14k), 1.000 (30k).
- **Fourier power**: grokking.py's normalized power P_k = (‖c_kᵀE‖² + ‖s_kᵀE‖²) / Σ_j (…), k = 1…48 (the formula shown on screen is exactly this). **Key-5 = the top five at step 14,000 = {1, 12, 20, 34, 38}**; their share: 11.2 % (step 0) → 29.1 % (10k) → 51.0 % (14k) → 70.3 % (30k). Late arrivals k = 3 and 28 (11.3 %, 11.1 % at 30k); the top seven carry 92.7 % at 30k; k = 41 still holds 4.4 %. Final powers: k=12 16.6 %, 1 14.2 %, 20 14.2 %, 34 13.9 %, 38 11.4 %.
- **Embedding circle**: emb2d = the 97 embeddings projected onto the cos/sin directions of the dominant frequency (grokking.py). Dominant plane is k = 12 from step 13,000 onward. r-CV = std/mean of the 97 radii: 0.466 (0) → 0.343 (1k) → 0.076 (10k) → 0.055 (14k) → 0.015 (30k).
- **Star polygon {97/k}**: connecting residue n → n+1 on the plane of frequency k advances the angle by 2πk/97, so the path winds k times around; shown with the real (imperfect) points.
- **cos ω(a+b) = cos ωa cos ωb − sin ωa sin ωb**, ω_k = 2πk/97: the trig-identity algorithm for modular addition described by Nanda et al., *Progress measures for grokking via mechanistic interpretability*, ICLR 2023, arXiv:2301.05217 (their model is a 1-layer transformer at p = 113; only the mechanism is cited, none of their numbers).
- **AdamW** on screen: θ ← θ − η(m̂/(√v̂+ε) + λθ), exactly grokking.py's update (decay inside the lr, as in Loshchilov & Hutter's decoupled weight decay).
- **Grokking**: Power et al., *Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets*, 2022, arXiv:2201.02177.
- **汎化開始まで timer**: (G₀ − step) × 53.97 ms. 53.97 ms/step was measured by `time_steps.py` (grokking.py's own loop incl. its eval/Fourier logging, 400 steps, 1 thread, runs 53.87 and 54.07 ms) on this machine. It is honest wall-clock for this NumPy script, not a GPU figure.
- **P1 / P3**: real CRT phosphor designations (green / amber) used for the palette credit.
- Checkpoint names CKPT-1k / CKPT-30k and "第56回スナップショット" refer to the logged snapshots (snapshot index 56 × 250 = 14,000 steps).
- Green data grid (81.4 s): each cell is one frequency k, its bars are that k's power at steps 0, 3,000, …, 27,000; the bit string along the bottom is the mask of frequencies holding > 5 % of the power at step 30,000 (k = 1…48 → bits set at 1, 3, 12, 20, 28, 34, 38).
- Series in-jokes that are not ML facts: MAGI unit names (CASPER·3, BALTHASAR·2, MELCHIOR·1), "pattern BLOOD TYPE : BLUE", the 承認 verdicts.

## Credits (all concepts, papers, libraries — no living people in roles)
企画・原作 Power et al. (paper) · 解析 Nanda et al. / 掲載 ICLR 2023 · キャラクターデザイン 埋め込み 97×128 · メカニックデザイン MLP 256×256, ReLU · 副監督 AdamW β 0.9·0.98 · 美術監督 フーリエ基底 · 色彩設定 蛍光体 P1・P3 · 撮影監督 フーリエ平面射影 · 音響監督 交差エントロピー · 音響制作 log-softmax · 音楽 三角関数 · 音楽協力 NumPy · 作画 順伝播 / 逆伝播 · 演出 全バッチ勾配降下 · 広報 arXiv:2201.02177 / arXiv:2301.05217 · アニメーション制作 Canvas 2D / WebGL · プロデューサー 勾配降下法 · **監督 荷重減衰** · 製作 grokking.py / NumPy.

## Known weaknesses
- No drawn characters: faces are flat black silhouettes and the emotional beats (Shinji's face, Rei, the smile) are carried by data metaphors (the circle as the smile). Warmer than a HUD, colder than the original.
- The unit is abstracted into the task's "+" (plus_smoke, plus_explosion, light_bars); it reads as a symbol rather than a character.
- Many chorus inserts are flat-colour plot cards; they are real data but visually similar to each other at 4–8 frames each.
- The step→film mapping is a designed curve: film-time speed is not uniform in steps (stated on screen only through the step counters).
- Engine is 2D canvas; the cage and angled bars are hand-projected, not 3D models.
