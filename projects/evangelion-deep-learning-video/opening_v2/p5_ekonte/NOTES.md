# p5_ekonte — 「絵コンテ／研究ノート」

## Concept (3 lines)
1. The film is the **storyboard (絵コンテ) of the 1995 opening, filmed on a rostrum**: one printed 絵コンテ row per real cut
   (108 cuts, measured frame by frame), with cut numbers, camera notes and s+k durations that add up to 1′30″+12.
2. The panels re-cast every composition of the real OP as deep learning, drawn in graphite with sparse coloured-pencil and
   marker accents; credits are black 写植 strips pasted onto the board, and the text cards are black paper paste-ups.
3. The 内容 column doubles as a **research notebook**: five correct derivations are handwritten in sync with the music, with
   crossings-out, "?!", arrows and circled results.

## Format: 1920×1080 sheet, 4:3 panel
The sheet is a 16:9 photograph of an A4 storyboard form: カット / 画面 (a 4:3 frame) / 内容 / セリフ / 秒. The 4:3 panel
keeps the OP's own compositions, and the margin carries what makes a 絵コンテ a 絵コンテ (cut numbers, camera notes,
timing), plus the notebook. A rostrum camera (film.js `buildCamKeys`) keeps this readable at 1080p:
- **PANEL** (scale 1.32): the 4:3 frame fills the screen height. This is the default for every cut.
- **SPLIT** (scale 1.2): the camera slides right to take in the panel and the notes column together while a derivation is
  being written. Notes read at about 26–36 px, and no credit is ever cropped. The keys come from each cut's own note items.
  A credit's entrance holds the camera on the panel for 1.4 s.
- **ROW** (scale 1.0, the whole sheet): used at section boundaries (C-001, C-010 A-melo, C-011 B-melo, C-020 bridge) and
  at the very end, where the camera pulls back so the whole last sheet shows the circled total 1′30″+12 and おわり.

## Timing
`js/cuts_table.js` holds the first frame of all 108 cuts, measured from reference/op_original.mp4 (frame differences, and
every frame of the fast sections checked by eye). Re-checked this session against exact frame tiles for
1500–1599, 2002–2121, 2226–2285 and 2358–2417. Each cut's 秒 cell shows its true length in 24-koma s+k, and the running
total cell ends on 1′30″+12 (2172 koma = 90.5 s).

## Shot map (original → storyboard)
| time (s) | cuts | original OP | this film | ML idea |
|---|---|---|---|---|
| 0.0–2.4 | C-001 | black, a spark of light | graphite scribbled black, eraser lifts a spark; whole sheet then push in | — |
| 2.4–7.3 | C-002 | red clouds, credit 企画・原作 | red coloured-pencil clouds, perceptron crest (MCMLVIII); 原作「Attention Is All You Need」 | notebook: Chinchilla, C≈6ND, min L s.t. 6ND=C |
| 7.3–10.4 | C-003 | blue Kabbalah engraving, strobe cuts from 7+22 | blue-pencil "SYSTEMA ATTENTIONIS": 8 petals = 8 heads (CAPVT I–VIII), QVAESTIO·CLAVIS·VALOR | 8 × 64 = 512 = d_model |
| 10.4–14.2 | C-004 | blue watery light, credit 企画/掲載 | the 97 token embeddings of (a+b) mod 97, one real snapshot per beat (step 0→30k) | notebook: αA/N^α = βB/D^β, N_opt ∝ C^0.45, D_opt ∝ C^0.55, D/N = 20 |
| 14.2–15.9 | C-005 | band slam: white flash, grey smoke | 3-frame flash, graphite smoke, a giant "×" sweeping across | × = matmul: 2N forward + 4N backward FLOPs per token → the 6 in 6ND |
| 15.9–22.9 | C-006–C-008 | logo; 19.0 blue flare; 21.0 ring; 新世紀 | wordmark roughed in pencil (C-006), katakana in blue light (C-007), inked final GRADIENT / グラディエント / 新世紀 with flare at 19.0 and ring at 21.0 | notebook: θ ← θ − η∇L |
| 22.9–23.4 | C-009 | blue X flash → white | blue X light over the logo, then white-out | — |
| 23.4–37.9 | C-010 | Shinji over blue sky; profile; silhouettes; credits ③–⑥ | sky with drifting clouds; the "face" = the Transformer block (Vaswani fig. 1); turns to profile = 6 layers × 2 sublayers; LSTM (1997) and CNN (1998) silhouettes slide in; credits change on the lyric lines | notebook: why divide by √d_k (Var(q·k) = d_k, σ = 8, saturation, crossed-out /d_k, Var(·/√d_k) = 1, check: Var = 63.8 over 20k draws); the final formula in red across the sky |
| 37.9–41.7 | C-011 | sunset, the hand, the Tree of Life | LCL-orange sunset, black hand, green Tree of Life = computation graph of one block (10 nodes, 12 edges, Latin labels) | the middle pillar = the residual stream |
| 41.7–48.4 | C-012 | Misato over the sun; credits 音楽, theme songs | the second "face" = an H100 SXM module (HBM3 80 GB, 3.35 TB/s); two-column theme credits | notebook: softmax + cross-entropy → ∂L/∂z = p − y (with a sign slip crossed out) |
| 48.4–50.3 | C-013 | pink face + split windows | 8 windows = 8 heads, each a real softmax(P̃P̃ᵀ/√d_h) map from sinusoidal PE | multi-head attention |
| 50.3–50.8 | C-014 | red eye close-up, two blinks | the iris = one attention row (query 40 over 64 keys, computed); blinks on the real frames | attention "eye" |
| 50.8–51.4 | C-015 | mechanical detail | 12VHPWR connector (600 W) | power instead of an entry plug |
| 51.4–51.8 | C-016 | stencil EVANGELION 2014 01 TEST TYPE | stencil TRANSFORMER 2017 01 BASE 65M | Transformer base = 65M params |
| 51.8–52.3 | C-017 | 4:59:56 activity timer | 学習打ち切りまで / TRAINING TIME REMAINING, digit sequence frame-exact to the OP; STOP/SLOW/NORMAL/RACING → FP32/TF32/BF16/FP8 | precision modes |
| 52.3–52.8 | C-018/019 | lever; red → green grid | Enter key under `torchrun train.py`; red → green grid bars | — |
| 52.8–54.6 | C-020 | cage, low angle; credits 作画/演出 | the unit in extreme low angle (perspective warp) between black restraints | notebook: Adam, m_t recursion, m_0 = 0 |
| 54.6–56.6 | C-021/022 | neural clips; eyes closed → open | clips = W_Q, W_K; eyes open at 0+19; inset: uniform attention at init → sharp after training | notebook: E[m_t] = (1−β₁ᵗ)E[g]; m̂ = m/β₁ᵗ crossed out → m/(1−β₁ᵗ) |
| 56.6–58.4 | C-023 | dark red silhouette, eyes flash | same, eyes light at 56+22 | notebook: Adam update; t=1 → Δθ = −η·sign(g₁) ?! |
| 58.4–60.2 | C-024–C-027 | commander, Misato, Ritsuko, Rei | commander = the loss L(θ); operations director = LR schedule (Vaswani eq. 3); technical head = Adam on an ill-conditioned quadratic; the pale child = the histogram of a He-initialised wall of weights (1728 samples) | — |
| 60.2–63.9 | C-028–C-033 | unit close-ups on hot orange; credits 広報, アニメーション制作 | unit head / shoulder / body; green lines = the residual stream | notebook: x_{ℓ+1} = x_ℓ + F(x_ℓ), ∂x_{ℓ+1}/∂x_ℓ = I + ∂F/∂x |
| 63.9–66.7 | C-034 | arms spread, light wings; credit プロデューサー | four key poses, wings of light (透過光) | notebook: product of (I + ∂F/∂x) → the I-term passes gradient to every layer "= 翼!!" |
| 66.7–70.2 | C-035–C-050 | chorus flips: face, eyes, hand, TEST TYPE, back in city, EVA-01, shoulder, mask, red silhouette, red core | same compositions, 2–14 frames each; TEST SET, EVAL-01 cards; the city = server racks; mask "j > i → −∞" (causal mask); the core = loss = NaN | EVA → EVAL |
| 70.2–70.4 | C-051 | ABSOLUTE TERROR FIELD | ATTENTION TENSOR FIELD (oversized A/T/F) | A.T. field |
| 70.5–71.2 | C-053 | Rei before the moon | a pale figure before a moon whose limb is the 97-point embedding circle at step 30,000 | grokking learns a circle (dominant frequency k = 12) |
| 71.2–72.4 | C-054–C-058 | ANGELS, city at sunset, TOKYO-3, pyramid, org mark | LOSS SPIKES; datacenter at sunset; US-EAST-1; Feature Pyramid P2–P6 (Lin+ 2017); original red ∇ mark "GRAD" | — |
| 72.4–74.3 | C-059–C-067 | staff mugshots, map, bridge, SEELE eyes | mugshots = optimizer portraits on the same quadratic: SGD, Momentum, Nesterov, AdaGrad, GD, Adam (paths and f(θ₄₀) computed); map = loss landscape; bridge monitor = real grokking train/val accuracy; red eyes = Reviewer 2 | optimizer zoo |
| 74.3–74.7 | C-068–C-070 | Gendo, Keel, 人類補完計画 document | L(θ); visor "SOTA"; 極秘 次単語補完計画 第17次中間報告 with p(x) = ∏ p(x_t \| x_<t) | 補完 = completion |
| 74.7–76.1 | C-071–C-077 | blue face, red ID card, gloves, Unit-00, PROTOTYPE EVA-00, Unit-02, PRODUCTION MODEL EVA-02 | blue face sketch; red MODEL CARD (Mitchell+ 2019); gloves; the prototype's single eye = a 5×5 conv kernel; PROTOTYPE EVAL-00; red unit with 4 eyes = 4 heads; PRODUCTION MODEL EVAL-02 | — |
| 76.1–77.7 | C-078–C-082 | Rei, Asuka, Toji, Kensuke, Hikari | the children = five held-out sklearn digits with real logistic-regression p̂ (0.994, 0.982, 0.752 ?!, 0.985, 0.992) | test images |
| 77.7–78.8 | C-083–C-085 | pink explosion, unit in city, cross explosion | exploding gradients ‖∇L‖ → ∞; unit among racks; cross-shaped flash (light) | — |
| 78.8–79.6 | C-086–C-089 | berserk eye, young Gendo, crying child, reclining figure | the loss at init: L(θ₀) = 4.576 ≈ ln 97 = 4.575 ✓; the child = the student (distillation) | initial-loss sanity check |
| 79.6–80.3 | C-090–C-093 | cross pendant, SECOND IMPACT, white giant, satellite photo A.D. 2000 / TIME +10 sec | same; satellite photo A.D. 2012 / EPOCH 90, "ILSVRC top-5 err 28.2 → 15.3 %" | Second Impact = AlexNet (2012) |
| 80.3–82.6 | C-094–C-101 | Rei in void, pencil sketch, green-eyed head, ADAM, Ritsuko, green data grid, Misato turns, pencil trio | same compositions; ADAM (the optimizer); inset 1/(1−β₁ᵗ); green table = real grokking accuracy by step; the turn = the LR schedule drawn on; trio = Q, K, V | — |
| 82.6–83.7 | C-102 | 監督 card, green slash at 83.6 | 監督 (vertical) 逆伝播 + 法 below (3+1 kanji like the original), green marker slash at 83.6 | backpropagation (Rumelhart, Hinton & Williams, 1986) |
| 83.7–86.3 | C-103 | unit arms spread on orange bars, pilot superimposed | T.B. from the arm to the full figure; at 85+06 the Transformer block is double-exposed over it | the pilot = the architecture |
| 86.3–88.2 | C-104–C-107 | determined face on blue sky; strained; black; smile on green bokeh | the block diagram as the face; val-accuracy curve at the moment of grokking; black; happy eyes, "val acc = 1.000 ✓" | — |
| 88.2–90.5 | C-108 | 製作 on red with dark scrawled glyphs, fade | red wash with our own formulas scrawled big; 製作 Common Crawl / The Pile; pull back to the whole sheet, 1′30″+12 circled, おわり, fade | data = the producer |

## Credits (small role / big name, following the OP's order and timing)
原作「Attention Is All You Need」(Vaswani et al., 2017) · 企画 Chinchilla (Hoffmann et al., 2022) · 掲載 arXiv:1706.03762 /
NIPS 2017 (the conference's name in 2017) · キャラクターデザイン Byte-Pair Encoding · メカニックデザイン CUDA / Tensor Core · 副監督 LayerNorm / Residual
Connection · 美術監督 Positional Encoding · 色彩設定 viridis · 撮影監督 TensorBoard · 音響監督 WaveNet · 音響制作 librosa ·
音楽 Cooley–Tukey FFT · 音楽協力 librosa · 主題歌 「残酷な勾配のテーゼ」 作詞 GPT-2 / 作曲 Music Transformer / 編曲 Jukebox /
歌 WaveNet; 「FLY ME TO THE MINIMUM」 Steepest Descent / Backpropagation / Nesterov Momentum / Flat Minima · オープニング
アニメーション 作画 matplotlib, TikZ / 演出 Jupyter · 広報 arXiv (cs.LG), Hugging Face Hub (huggingface_hub) · アニメーション制作
PyTorch / JAX · プロデューサー ImageNet (ILSVRC-2012), GeForce GTX 580 ×2 · 監督 逆伝播法 · 製作 Common Crawl / The Pile.
No living person is credited in a role. Papers are cited by title or author-year only.

## Every number on screen and its source
| number / claim | where | source |
|---|---|---|
| E=1.69, A=406.4, B=410.7, α=0.34, β=0.28 | C-002/C-004 | Hoffmann et al. 2022 (Chinchilla), approach-3 fit |
| C ≈ 6ND; 2N forward + 4N backward FLOPs per token | C-002, C-005 | Kaplan et al. 2020, §2.1 |
| N_opt ∝ C^0.45, D_opt ∝ C^0.55 | C-004 | computed: β/(α+β) = 0.4516, α/(α+β) = 0.5484 (prep_data.py) |
| D/N ≈ 1.4 T / 70 B = 20 | C-004 | Chinchilla-70B trained on 1.4 T tokens (Hoffmann et al. 2022) |
| Var(q·k) = d_k; d_k = 64 → σ = 8 | C-010 | Vaswani et al. 2017, §3.2.1 footnote 4; d_k = 64 for the base model |
| Var = 63.8 (20,000 draws) | C-010 | computed, seeded NumPy (prep_data.py `varEmp` = 63.78) |
| 8 heads × 64 = 512 | C-003 | Vaswani et al. 2017, §3.2.2 |
| ∂L/∂z = p − y | C-012 | derivation shown on screen (standard) |
| Adam update, E[m_t] = (1−β₁ᵗ)E[g], m̂, v̂, t=1 → sign step | C-020–C-023 | Kingma & Ba 2015, Alg. 1 and §3 |
| β = (0.9, 0.999), 1/(1−β₁ᵗ) curve | C-026, C-098 | Kingma & Ba defaults; curve computed for t = 1..40 |
| ∂x_{ℓ+1}/∂x_ℓ = I + ∂F/∂x, product expansion | C-028, C-034 | He et al. 2016 ("Identity Mappings…", eqs. 4–5) |
| η = d^−0.5 min(s^−0.5, s·w^−1.5), warmup 4000, peak 6.99×10⁻⁴ | C-025, C-100 | Vaswani et al. 2017, eq. 3; peak computed 512^−½·4000^−½ |
| W ~ N(0, 2/n), n = 512, 1728 samples | C-027 | He et al. 2015 init; 48×36 samples, seeded |
| Transformer base: 6 layers, d_model 512, 65M params | C-016, C-010 | Vaswani et al. 2017, Table 3 |
| H100 SXM: HBM3 80 GB, 3.35 TB/s; die 814 mm² | C-012 | NVIDIA H100 datasheet / GH100 die size |
| 12VHPWR 600 W | C-015 | PCIe CEM 5.0 / ATX 3.0 connector rating |
| 4:59:56 and its digit sequence | C-017 | the original OP (frame-exact homage, not an ML number) |
| L6 / H8 on the green grid | C-019 | last layer / last head of Transformer-base (6 layers, 8 heads) |
| FP32 / TF32 / BF16 / FP8 | C-017 | real numeric formats |
| 97 embeddings, steps 0…30,000 | C-004, C-053 | opening_v2/shared/data/grokking.json (`emb2d`, `snap_steps`) |
| dominant Fourier frequency k = 12 | C-053 | grokking.json `fourier` (argmax of the final snapshot) |
| train/val accuracy curves and table | C-064, C-099, C-105 | grokking.json (every 50 steps; table every 1000) |
| L(θ₀) = 4.576 vs ln 97 = 4.575 | C-087 | grokking.json train_loss[0]; ln 97 |
| val 99 % at step 13,650; val acc = 1.000 | C-107 | grokking.json (first step with val_acc ≥ 0.99; final value) |
| attention maps (8 heads) and the iris row (also the C-022 inset, keys 35–46) | C-013, C-014, C-022 | computed from sinusoidal PE (Vaswani §3.5), per-head band standardised, β = 1.5 (prep_data.py) |
| optimizer paths and f(θ₄₀) | C-026, C-059–C-066 | computed on f = ½xᵀHx, eigenvalues (1, 12) rotated −25°, x₀ = (−3.2, 1.9), 40 steps; SGD lr 0.13 + noise σ 0.9 (seed 7), Momentum μ 0.8 lr 0.05, Nesterov same, AdaGrad lr 0.9, Adam lr 0.3, GD lr 0.155 |
| digits p̂ = 0.994, 0.982, 0.752, 0.985, 0.992 | C-078–C-082 | sklearn `load_digits`, logistic regression (C = 1), 5 held-out images, train acc 0.984 |
| ILSVRC top-5 error 28.2 → 15.3 % | C-093 | ILSVRC 2010 and 2012 winning entries (2012 = AlexNet, SuperVision) |
| EPOCH 90, GTX 580 ×2 | C-093, C-034 | Krizhevsky et al. 2012 ("roughly 90 cycles", two GTX 580 3 GB GPUs) |
| LSTM 1997, CNN 1998, Perceptron 1958 | C-010, C-002 | Hochreiter & Schmidhuber 1997; LeCun et al. 1998; Rosenblatt 1958 |
| P2–P6 | C-057 | Lin et al. 2017 (FPN) |
| years of SGD 1951, Momentum 1964, Nesterov 1983, AdaGrad 2011, GD 1847 | portraits | Robbins & Monro; Polyak; Nesterov; Duchi et al.; Cauchy |
| total 1′30″+12 | C-108 | 2715 frames at 30 fps = 90.5 s = 2172 koma |
The loss-landscape "map" (C-060) is a drawn schematic with no numbers on it.

## Files
`index.html` · `js/engine.js` (paper, strokes, hatch-tile coloured pencil, handwriting, MathJax-as-hand, 写植 strips, post) ·
`js/film.js` (timeline, per-cut builder, rostrum camera keys, render) · `js/motifs.js` (drawing vocabulary) ·
`js/cuts_table.js` (108 measured cuts) · `js/c_intro.js`, `c_verse.js`, `c_pre.js`, `c_chorus.js`, `c_end.js` (the cuts) ·
`prep_data.py` → `js/data_p5.js` · `build_formulas.mjs` → `js/formulas_p5.js` · `perf.mjs`, `prof.mjs` (timing probes).
Performance: avg 97 ms / max 170 ms per frame including JPEG encode (every 5th frame of the whole film, headless Chromium,
`node opening_v2/p5_ekonte/perf.mjs 0 2715 5`). All offscreen canvases are CPU-backed (`willReadFrequently`); a GPU
(SwiftShader) canvas used as a pattern forces a readback on every frame.

## Known weaknesses
- The figure drawing (the unit, the faces) is procedural and stiffer than a real key animator's storyboard sketches. It reads
  as a board, but not as the hand of a great layout artist.
- Many chorus panels are simple, which is acceptable at 2–7 frames but visible when paused.
- The coloured-pencil wash is a repeating hatch tile. The loose patch shapes and rotation hide the repeat, but not always.
- The hot-orange pre-chorus (C-028–C-034) is still the most colour-heavy stretch, because the OP itself is at its most saturated there.
- Nothing was checked by ear. Sync relies on the measured cut table and the lyric and beat times.
