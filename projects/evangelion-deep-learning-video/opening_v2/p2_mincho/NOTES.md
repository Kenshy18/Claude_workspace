# p2_mincho 「明朝体」 — notes

## Concept (3 lines)
1. The 1995 opening re-told **only in Evangelion's typographic language**: heavy mincho credits, ep.25/26 intertitles, condensed-grotesk text cards, red/white/black fields, plus a few flat shapes (bars, circles, a cross, a hairline engraving).
2. Every original shot keeps its cut time and its **idea**, rendered as type. Characters become words or symbols (the protagonist is θ, the second face is ℒ, Rei is ReLU / 零, Asuka's shout is a verdict on overfitting), and credits sit where the original's credits sit.
3. The story is training: θ is initialised (θ₀), searches (argmin), groks (val 0.0 → 100.0), meets the Transformer (the chorus climax is a camera move over the typeset attention formula), and ends as θ*, followed by 「おめでとう」.

Format: 4:3, 1440×1080, 30 fps, 2715 frames. Entry: `index.html` → `p2_lib.js` (type kit: kana optical kerning, 縦書き, MathJax paths) + `p2_film.js` (shots dispatched by absolute time, snapped to the 30 fps grid; credits overlaid) + `fx_p2.js` (TV-master post: softness, grain, slight chroma, 0.1 vignette; no bloom). Formulas: `node opening_v2/p2_mincho/build_formulas.mjs` → `formulas.js`.

## Shot map (original → p2)
| time (s) | original | p2_mincho | ML idea |
|---|---|---|---|
| 0.0–2.4 | black, tiny speck | black, a single white point | the empty model |
| 2.4–7.3 | red clouds, red emblem; 企画・原作 | flat red, the ten-node tree as a faint red line-art emblem; 企画・原作 **GRADIENT** | the gradient is the original author |
| 7.3–10.4 | blue Kabbalah engraving, stepped push | copper-plate engraving: 160 rays, ring legend SYSTEMA · GRADIENTIVM · ET · ERRORIS · PROPAGATIO · RETRO, 12 Latin medallions (Gradientia, Regula Catenæ, Entropia Crucis, Attentio, Residuum, Momentum…), θ at the centre; push stepped every 5 frames | backprop as an occult diagram |
| 10.4–14.1 | blue light blob; 企画 / 掲載 | flat blue light circles opening into a ring at 13.95; 企画 Project Eval. / 掲載 arXiv 査読前プレプリント | preprint culture |
| 14.1–15.9 | white flash; dark cross sweeping through smoke | white flash (14.12), then × bars turning into + on grey smoke, cut on each detected cut | multiply → accumulate (the MAC) |
| 15.9–22.9 | wordmark, blue katakana streaks, final logo, flare 19.0, ring 21.0 | parody mark: wide Cinzel **EVALUATION** (the V and A share a stroke), hand-cut shear katakana エヴァリュエーション built from blade polygons, small 新世紀 in dark red with a keyline; flat flare at 19.0, ring pulse at 21.0 | "evaluation" is the eval |
| 22.9–23.4 | white flash, blue X rays | white flash with a flat blue X of light over the fading mark | |
| 23.4–37.9 | blue sky, protagonist double exposure turning to profile, silhouettes; credits | blue sky: a pale θ double exposure turns to profile (sx squeeze at 26.0); a black *y* (label) slides in from the right, then a black *x* (input) from the left; the credits are in the original positions: キャラクターデザイン トークン化 · メカニックデザイン 自己注意 / 残差接続 · 副監督 逆伝播 / 自動微分 · 美術監督 潜在空間 · 色彩設定 非線形性 · 撮影監督 層正規化 · 音響監督 位置符号化 / 音響制作 サイン・コサイン | the model sits between x and y |
| 37.9–39.3 | sunset, black hand reaches in | sunset clouds; a huge black ∂ swings in like the hand | the derivative touches the graph |
| 39.3–41.6 | green Tree of Life draws on | green engraving SYSTEMA ATTENTIONIS · X TENSORVM NOMINVM: the Sephirot as one transformer block (INPVT, QVERY, CLAVIS, VALOR, SOFTMAX, ATTENTIO, RESIDVVM, NORMA, MLP, LOGITS), push stepped on the detected cuts | the Sephirot as a transformer block |
| 41.6–48.4 | second face at sunset; 音楽; the two-column theme block | orange sky and sun, a pale θ* = argmin double exposure, a black ℒ standing at the right; 音楽 交差エントロピー · 音楽協力 ラベル平滑化; two-column block: OP 「残酷な勾配のテーゼ」 / ED 「FLY ME TO THE MINIMUM」, 作詞/作曲/編曲/歌 = 順伝播/逆伝播/最適化器/損失関数 ‖ Steepest Descent/Heavy Ball/Cosine Annealing/LION, （チェックポイントレコード） | "obsessed with seeking" = the optimizer |
| 48.4–49.9 | pink face, split-panel window | pink field: θ₀ and a window holding He init 𝒩(0, 2/n_in) | innocent eyes = an initialised model |
| 49.9–50.8 | extreme close-up of an eye | 瞳 in red filling the frame | the lyric's own word |
| 50.8–51.4 | mechanical detail | chain rule, cropped, panning | the machinery |
| 51.4–51.8 | stencil plate EVANGELION 2014 / 01 / TEST TYPE | stencil plate ∂ EVALUATION / 1998 / MNIST / TEST SET | the oldest test set |
| 51.8–52.27 | 7-seg timer 4:59:56 | 7-seg "締切まで DEADLINE (AoE)" counting the film's own remaining time; 内部 INTERNAL; 主計算資源供給システム; FP32/TF32/**BF16**/FP8 in place of STOP/SLOW/NORMAL/RACING | the paper deadline; mixed precision |
| 52.27–52.9 | cockpit detail, green angled grid | chain rule plate; red/green angled bars labelled L05 / H03 | the attention map, edge-on |
| 52.9–54.57 | robot in its cage; OP animation credits | Unit-01 as the single kanji 初 (初号機 / 初期値) in purple with green keyline between black restraints; the residual equations run up the gantries; オープニングアニメーション 作画 行列積 / 半精度演算 · 演出 計算グラフ | |
| 54.57–56.57 | pilot's eyes open | the "eyes" are two numbers: 訓練 100.0 and 検証 0.0 → 100.0 (grokking, real run, step 1,000 → 16,000); いつか above | grokking: the second eye opens |
| 56.57–58.4 | dark red silhouette, eyes flash | vertical なぜ、勾配は消えるのか; 消える flashes white on the eye-flash frames | vanishing gradients |
| 58.4–60.0 | commander glint, three staff faces, pale character | name cards 目的関数 OBJECTIVE (red glint bars) · 学習率 · 正則化 · 乱数種 SEED · SEED = 42 | the bridge crew of training |
| 60.0–64.0 | Unit-01 close-ups on hot orange; 広報 / アニメーション制作 | Chinchilla L(N,D) in close-ups on orange, then set whole with its fitted constants; 広報 ベンチマーク（リーダーボード）事例紹介（厳選済み）· アニメーション制作 テンソルコア / AUTOGRAD | the far future = scaling |
| 64.0–66.8 | wings of light; プロデューサー | a standing "1" with flat yellow rays opening; the residual-gradient identity underneath; プロデューサー 計算資源（GPU時間）/ 学習データ | the wings are the identity path: ∂/∂x of x is 1 |
| 66.7–67.2 | Unit-01 hand/face | 苦い教訓 vertical, THE BITTER LESSON (Sutton, 2019) | the cruel thesis |
| 67.2–67.67 | face, eyes flash | 探索 / 学習 / COMPUTE | Sutton: search and learning scale with compute |
| 67.67–68.07 | hand | SGD update | |
| 68.07–68.2 | "TEST TYPE" | **TEST SET** | |
| 68.2–68.57 | robot in city | 漏洩 / テストデータ (lands on the 68.333 sub-cut) | test-set leakage |
| 68.57–68.7 | "EVA-01" | **EPOCH-01** | |
| 68.7–69.5 | robot shots | cross-entropy · softmax · 損失 · stretched 損失 · ∂ℒ/∂θ in Eva purple/green | |
| 69.5–69.73 | angel mask | FGSM, ADVERSARIAL | the adversary |
| 69.73–70.17 | red silhouette, red sphere | 摂動、襲来 (ep.1 「使徒、襲来」) · 核 in a red sphere | |
| 70.17–70.4 | "ABSOLUTE TERROR FIELD" | **ATTENTION TENSOR FIELD** (same layout, oversized A/T) | |
| 70.5–71.23 | Rei before the moon | 「わたしが消えても、代わりはいるもの。」 vertical on the moon, checkpoint.pt; push-in on the 70.833 sub-cut | checkpoints |
| 71.23–72.37 | ANGELS · city · TOKYO-3 · pyramid · org logo | **OUTLIERS** · 14,197,122 ImageNet · **TOP-5** · ∇ as the pyramid · parody mark: red ∂ with "GRAD'S IN HIS HEAVEN / ALL'S RIGHT WITH THE WORLD" | |
| 72.37–74.67 | staff mugshots, map, bridge, SEELE sketch | the bridge crew = Transformer-base hyperparameters, one card per face: β₂ 0.98 · ε 10⁻⁹ · β₁ 0.9 · P_drop 0.1 · ε_ls 0.1 · warmup 4000 · d_model 512 · d_ff 2048 · h = 8 (red hairline, the SEELE sketch) · d_k 64 · N 6 | |
| 74.67–74.73 | 極秘 人類補完計画 第17次中間報告 | 極秘 **人類補間計画** 第17次中間報告 (補完→補間, both read *hokan*), 大規模言語模型最高幹部会, 人類補間委員会, 2017年度業務計画概要, 総括篇 | interpolation, not completion |
| 74.73–75.47 | sketch, robot heads, Unit-00 | 補間 outline · 関係者以外立入禁止 TEST SET · 問題ない。 ℒ = −log(1/10) = ln 10 ≈ 2.303 · 零 with a red dot (the Unit-00 eye), ZERO-SHOT | initial-loss sanity check |
| 75.47–76.13 | "PROTOTYPE EVA-00", Unit-02, "PRODUCTION MODEL EVA-02" | PROTOTYPE **LeNet-5** · W = W₀ + BA 微調整, then ΔW = BA, rank r = 8 on the 75.8 sub-cut · PRODUCTION MODEL **ResNet-50** | |
| 76.13–76.97 | Rei, Asuka (eyes closed → shout) | ReLU max(0,x) · 「それ、過学習よ。」(quiet) → 「あんたバカァ？」 squashed, on her open mouth at 76.8 | |
| 76.97–77.67 | classmates | MNIST 訓練 60,000 · 試験 10,000 · 早期終了 | |
| 77.67–78.57 | red city, pink explosion, robot, cross whiteout | red flash · 発散 · LOSS SPIKE · **NaN** on the yellow whiteout | divergence |
| 78.57–79.63 | berserk robot, commander, crying child, rotated figure | 暴走 exploding gradients · 勾配クリッピング ‖g‖ ≤ 1.0 · 忘 as a hairline sketch · 破滅的忘却 CATASTROPHIC FORGETTING rotated 90° | |
| 79.63–80.33 | cross pendant, "SECOND IMPACT" (red), white giant, A.D. 2000 crater | white cross on red · **SECOND DESCENT** in red · 175,000,000,000 パラメータ GPT-3 · crater "A.D. 2019 / INTERPOLATION THRESHOLD" | double descent |
| 80.33–80.97 | blue void, sketch, green eye | ∅ · 蒸留 teacher → student · val_acc 1.000 with a green eye | |
| 80.97–81.13 | "ADAM" | **ADAM**, black on white (kept, since it names the optimizer) | |
| 81.13–82.63 | scientist profile, green data grid, director turning | Adam m_t · green grid with Adam's six lines · 逃げちゃダメだ ×3, squeezed tighter each time, （局所解から）, on the sub-cuts · vertical あなたは、何を最小化しているの？ · θ* outline sketch | |
| 82.63–83.7 | 監督 card, green slash 83.63 | 監督 (vertical, small) **勾配降下** (three across, 下 below), same placement; green slash | |
| 83.7–86.1 | arms spread against orange light bars, camera pulls back; pilot double-exposed | camera over the typeset attention formula, cut on the original's camera changes: QKᵀ → √d_k → softmax( → the whole formula → the full figure held small; θ double-exposed inside it at 85.27 | the pilot inside the Transformer |
| 86.1–87.67 | protagonist looks up; strained on teal | θ (narrow) turns into θ* at 86.66; θ* squeezed on teal | converged |
| 87.67–87.93 | black frame, washed-out flashback | one black frame; θ₀ almost white on white | memory of initialisation |
| 87.93–88.2 | smiling | おめでとう on green | ep.26 |
| 88.2–90.5 | red, scrawls, 製作 + logos, fade | red with hairline ∂ ∇ ℒ θ ∅ 1; 製作 ○勾配 電気代 / GPU; fade to black | who really paid |

## Numbers and facts on screen, with sources
- Countdown 0:38:50 (51.87–52.27): the film's own remaining time, 90.5 − t, formatted m:ss:cc. The 8:88:88 on its first two frames is the all-segments lamp test.
- Grokking 訓練 100.0 / 検証 0.0 → 100.0, step 1,000 → 16,000, "(a + b) mod 97", and val_acc 1.000: `opening_v2/shared/data/grokking.json`, a real run (2-layer MLP, (a+b) mod 97, 30 % train, AdamW wd = 1.0). In that run train_acc reaches 1.0 by step 250, val_acc is 0.0 at step 1,000 and first reaches ≥ 0.9995 at step 15,100.
- Chinchilla L(N,D) = E + A/N^α + B/D^β with E = 1.69, A = 406.4, B = 410.7, α = 0.34, β = 0.28: Hoffmann et al., 2022, "Training Compute-Optimal Large Language Models", §3.3 (Approach 3, the parametric fit).
- Transformer-base values β₁ = 0.9, β₂ = 0.98, ε = 10⁻⁹, warmup_steps = 4000 (§5.3); P_drop = 0.1, ε_ls = 0.1 (§5.4); d_model = 512, d_ff = 2048, h = 8, d_k = 64, N = 6 (Table 3, base): Vaswani et al., 2017, "Attention Is All You Need". The same paper gives the attention formula (eq. 1).
- Adam's six lines (g_t, m_t, v_t, bias corrections, update): Kingma & Ba, 2015, Algorithm 1.
- ImageNet 14,197,122 images: the image-net.org headline count ("14,197,122 images, 21841 synsets indexed").
- MNIST 60,000 training / 10,000 test images, and the 1998 on the stencil: LeCun et al., 1998 (MNIST database page; "Gradient-Based Learning Applied to Document Recognition").
- LeNet-5: LeCun et al., 1998. ResNet-50: He et al., 2016.
- GPT-3 175,000,000,000 parameters: Brown et al., 2020. ‖g‖ ≤ 1.0: the same paper clips the global gradient norm at 1.0 (Appendix B), which is also the usual LLM default.
- ℒ = −log(1/10) = ln 10 ≈ 2.303: expected cross-entropy of a uniform 10-class prediction, the standard "check the initial loss" sanity test.
- LoRA W = W₀ + BA (ΔW = BA): Hu et al., 2021. r = 8 is Hugging Face PEFT's `LoraConfig` default, and the LoRA paper uses r = 8 for W_q (Table 5).
- He init 𝒩(0, 2/n_in): He et al., 2015. ReLU = max(0, x): Nair & Hinton, 2010.
- FGSM x̃ = x + ε·sign(∇ₓℒ(θ, x, y)): Goodfellow et al., 2015.
- Residual forward x_L = x_ℓ + Σ F(x_i) and the gradient ∂ℒ/∂x_ℓ = ∂ℒ/∂x_L (1 + ∂/∂x_ℓ Σ F): He et al., 2016, "Identity Mappings in Deep Residual Networks", eqs. 4–5.
- The Bitter Lesson (search and learning, which scale with computation): Sutton, 2019 (essay citation only).
- A.D. 2019 / INTERPOLATION THRESHOLD, SECOND DESCENT: double descent peaks at the interpolation threshold (Belkin et al., PNAS 2019; Nakkiran et al., "Deep Double Descent", 2019).
- 第17次 / 2017年度: the Transformer's year (Vaswani et al., 2017), which also matches the original's 第17次.
- SEED = 42: convention, not a claim. EPOCH-01 and L05 / H03 (layer 5, head 3) are identifiers, not measurements.
- FP32 / TF32 / BF16 / FP8: real numeric formats (BF16 lit as the mixed-precision default).
- All formulas are typeset from TeX by MathJax (`build_formulas.mjs`), never drawn by hand.

## Known weaknesses
- With no characters, the chorus depends on the viewer reading 2–6-frame cards. At speed, some jokes (ln 10, rank r = 8, the L05/H03 labels) are subliminal and land only on a pause.
- The 製作 background uses outlined math glyphs; the original's hand-drawn line scrawl is looser and hairier. The 80.13 crater is a flat two-ellipse graphic, cruder than the original's satellite painting.
- The 12.5 s light blob and the 17.4 s katakana streaks are flat stand-ins for light effects that are soft and glowing in the original. This is deliberate (no bloom), but it reads less "electric".
- The hyperparameter mugshot cards (72.37–74.67) share one layout: consistent as a series, but plainer than the original's faces.
- Kana optical kerning is a hand-tuned table (p2_lib `KERN`) for the kana this film uses. New text may need new entries.
- Perf: mean ≈ 250 ms per still including PNG capture (40 stills spread over the film, max ≈ 500 ms). The first engraving frame in a session costs ≈ 500 ms (glyph warm-up); later ones ≈ 220–300 ms.
