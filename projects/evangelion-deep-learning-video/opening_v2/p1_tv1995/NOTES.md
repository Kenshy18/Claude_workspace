# p1_tv1995 — 「TV版 完全再現」 (4:3, 1440×1080, 90.5 s / 2715 f @ 30 fps)

## Concept (3 lines)
A shot-for-shot remake of the 1995 TV opening: every one of the 45 shots is kept at the same time range, with the same
composition, camera move, palette and credit placement. Only the cast is changed. The pilot is the Transformer block
(Vaswani et al. 2017, Fig. 1), Unit-01 is an accelerator card in Unit-01 livery ("TYPE-01"), the guardian is the LSTM
cell, and the first and second children are the Perceptron and ResNet. The staff credits are ML concepts, papers,
datasets and hardware. The look is flat 2-tone cels, banded painted skies, hard cuts, 1–3-frame flashes, grain, ±1 px
gate weave and mild softness (a 1995 TV master).

## Files
`index.html` → `kit.js` (typography, cel boxes, 7-seg, 3-D box projector), `art.js` (painted skies, clouds, smoke,
bars, red wall, all generated once at init), `beings.js` (Transformer / LSTM / Perceptron / TYPE-01 card /
silhouettes), `shots_a.js` 0–23.4, `shots_b.js` 23.4–50.8, `shots_c.js` 50.8–66.8, `shots_d.js` 66.8–78.07,
`shots_e.js` 78.07–90.5, `timeline.js` (one 90.5 s scene; shots are looked up by absolute time), `main.js`, `fx.js`
(post: grain, weave, softness, light bloom only where there is light). Every frame is a pure function of t, with
seeded RNG only. Measured render time is 140–380 ms per frame (renderFrame + JPEG grab, SwiftShader, 1440×1080). The
worst frames in a 90-point sweep hit ~590 ms only while other renders were loading the machine, and re-time at ≤320 ms.

## Shot map (original → this film)
Chorus cut times are frame numbers taken from `op_cuts_detected.txt` and checked against `reference/fine/end_01/02`.

| # | Time (s) | Original | This film | ML idea |
|---|---|---|---|---|
| 1 | 0–2.4 | black, speck | a single white speck inside a faint ring | θ₀, the initialisation |
| 2 | 2.4–7.3 | red clouds, angel emblem, 企画・原作 GAINAX | red painted clouds, winged-neuron line emblem (Σ hub, 3-layer wings), 企画・原作 **1706.03762** | the paper's arXiv id as the "original work" |
| 3 | 7.3–10.4 | blue Kabbalah engraving push | copper-plate engraving of the Perceptron (MCMLVIII) with Latin labels (Pondus, Signum, Gradiens, Descensus, Epocha, Error …) and formulas `h = σ(Wx)`, `w − η∇E`, `sgn(z)` | 1958 roots |
| 4 | 10.4–14.1 | blue caustic, 企画 / 掲載 | same caustic swirl; 企画 **Project Attn.** / 掲載 **arXiv** / **NIPS 2017 予稿集** | publication venue |
| 5 | 14.1–15.9 | flash, smoke, giant cross | flash, smoke, a giant ⊕ sweeping | the residual add |
| 6–8 | 15.9–22.9 | wordmark, blue kana forming, final logo (flare 19.0, ring 21.0) | original parody mark: wide Roman **TRANSFORMER**, hand-built jagged polygon katakana **トランスフォーマー**, small 新世紀; blue flare at 19.0, ring at 21.0 | — |
| 9 | 22.9–23.4 | white flash, blue X | same over the fading mark | — |
| 10 | 23.4–26.3 | sky + キャラクターデザイン / メカニックデザイン | キャラクターデザイン **サブワード** / メカニックデザイン **位置符号化・注意機構** | characters = subword tokens; the mechanism = PE + attention |
| 11 | 24.3–37.9 | face over sky turns to profile; black silhouettes; credits every lyric line | the Transformer block double-exposed over the sky, turning front → profile; black cut-outs of Perceptron, LSTM and CNN slide in. 副監督 **残差接続 / 層正規化**, 美術監督 **潜在空間**, 色彩設定 **BGR順**, 撮影監督 **ImageNet**, 音響監督 **WaveNet**, 音響制作 **librosa** | BGR = the OpenCV channel-order trap |
| 12 | 37.9–39.3 | sunset, silhouette hand | same | — |
| 13 | 39.3–41.6 | green Tree of Life | green line-art **SYSTEMA TRANSFORMATORVM** (Kabbalah layout redrawn as the computation graph; ATTENTIO, RESIDVVM, SOFTMAX, NORMA, EMBEDDING …; "VI STRATORVM · VIII CAPITVM"; d_model = 512, d_ff = 2048, h = 8, d_k = d_v = 64) | real base hyper-parameters |
| 14 | 41.6–48.4 | second character on sunset; music + theme credits in two columns | the LSTM cell (Olah-style) as the guardian. 音楽 **正弦余弦**, 音楽協力 **波長2π〜10000·2π**. OP theme 「残酷な天使のテンソル」: 作詞 WMT 2014, 作曲 自己注意, 編曲 ラベル平滑化, 歌 ビーム探索. ED theme 「FIT ME TO THE NOISE」: Memorization, Memorization, Double Descent, RANDOM LABELS. (チェックポイントレコード) | PE wavelengths; the paper's data, label smoothing, beam search; ED = fitting random labels (Zhang et al. 2017) |
| 15 | 48.4–50.8 | pink face, split panes; red eye | pink Transformer; the Perceptron in window panes; extreme close-up eye whose **iris is a softmax attention map** | attention |
| 16 | 50.8–51.4 | white canister | the checkpoint cartridge **CKPT model.pt · 65M** slides in (entry plug) | base model = 65 M params |
| 17 | 51.4–51.8 | stencil EVANGELION 2014 / 01 / TEST TYPE | **TRANSFORMER 2017 / 01 / TEST TYPE** | — |
| 18 | 51.8–52.27 | 7-seg 888:88 lamp test → 4:59:56, 活動限界まで, 内部/外部 | lamp test 88:88:88 → **11:59:56**, 学習終了まで / TRAINING TIME REMAINING, 主計算供給システム MAIN COMPUTE SUPPLY SYSTEM · 8×P100, 外部→内部, WARMUP lit | 12 h − 4 s (base model: 12 h on 8 P100); warm-up phase |
| 19 | 52.27–52.9 | clamp; red→green grid bars (B17, D23) | clamp slams; grid bars labelled **L06 / H08 / SOFTMAX LINE / ATTENTION LINE** | 6 layers, 8 heads |
| 20 | 52.9–54.6 | robot in cage, オープニングアニメーション 作画 / 演出 | TYPE-01 in its chassis; 作画 **順伝播 / 誤差逆伝播**, 演出 **学習率** | — |
| 21 | 54.6–56.6 | neural clips; eyes open | two **A10** connectors clip onto the MHA "face"; its two attention-map eyes open | NVIDIA A10 ↔ the A10 nerve |
| 22 | 56.6–58.4 | dark red, eyes flash | TYPE-01 silhouette, LED eyes flash twice | — |
| 23–24 | 58.4–60.0 | commander, Misato, Ritsuko, Rei | a ∇ with red glasses and white glove; LSTM; BatchNorm bell (μ, σ); Perceptron on concrete | ∇ = the commander |
| 25 | 60.0–64.0 | Unit-01 close-ups; 広報 / アニメーション制作 | TYPE-01 close-ups on orange bars; 広報 **ベンチマーク (GLUE) / 厳選サンプル (付録)**; アニメーション制作 **テンソルコア / GEMM** | "cherry-picked samples (appendix)" |
| 26 | 64.0–66.8 | wings; プロデューサー | 16 attention heads unfold as light wings (each wing's brightness is a row of a real softmax attention matrix); the card backlit; プロデューサー **計算予算 (C≈6ND) / 学習データ** | compute budget C ≈ 6ND |
| 27 | 66.8–70.1 | chorus montage | head splash, torso, diamond eyes, hand, **PRE-TRAINED** (TEST TYPE), back in the city, **GPU-01** (EVA-01), close-ups, **NaN mask** (Sachiel's mask as 0/0), red fog, **red core engraved with loss contours** | — |
| 28 | 70.1–70.4 | ABSOLUTE TERROR FIELD | **A**TTENTION **T**ENSOR **FIELD**, oversized initials | — |
| 29 | 70.4–71.2 | Rei before giant moon | the Perceptron before a giant moon | — |
| 30 | 71.2–72.3 | ANGELS → dusk city → TOKYO-3 → pyramid → fig-leaf logo | **OUTLIERS** → rack-tower city at dusk → **US-EAST-1** → a pink glowing **feature pyramid** (FPN) → the **GRAD** mark (∇ in a notched ring) | the region that goes down |
| 31 | 72.3–74.6 | staff mugshots, map, bridge, SEELE eyes | Fuyutsuki → **momentum** ball `βv + ∇L`; the map → **Himmelblau's function** contours with its 4 minima; Hyuga → **dropout**; Aoba → **ReLU** `max(0, x)`; Shinji eyes closed→open; carrier → **container ship**; Kaji → **GAN** `min_G max_D`; Ritsuko → BatchNorm bell; SEELE sketch → **8 red eyes** (h = 8); Gendo → ∇; Keel's visor → **Chinchilla L(N)** curve | — |
| 32 | 74.6–74.8 | 極秘 人類補完計画 第17次中間報告 | 極秘 **言語補完計画** 第17次中間報告, 計算資源統合戦略局 注意機構研究部, arXiv:1706.03762 付属文書, 第31回 NIPS (2017) 提出版 | — |
| 33 | 74.8–76.1 | robot heads; PROTOTYPE EVA-00; PRODUCTION MODEL EVA-02 | Transformer underwater; card underside; **Mark I Perceptron** head whose single eye is its 20×20 photocell retina reading "A"; **PROTOTYPE MARK I**; red TYPE-02 with a blade; **PRODUCTION MODEL RESNET-50** | — |
| 34 | 76.1–78.1 | Rei, Asuka, Toji, Kensuke, Hikari; pink blast; city blast | Perceptron; **ResNet** block `F(x) + x` in red (the second child); **SVM** margin (arms crossed); **decision tree**; **k-means, k = 3** (face + two pigtails); red rack city; pink bubbling blast; yellow X blast behind the card | — |
| 35 | 78.1–78.6 | yellow cross explosion | saturated yellow whiteout, orange smoke gathering | — |
| 36 | 78.6–79.5 | berserk, young Gendo, crying child | dark card with green eyes; young ∇; pale child sketch | — |
| 37 | 79.5–80.4 | red cross; SECOND IMPACT (red); white giant; satellite A.D. 2000 | red cross; **SECOND IMPACT**; white giant = **AlexNet in crucifix pose** (the 224 input slab is the torso, the two GPU towers are the arms, top cropped like the paper's Fig. 2); satellite: **A.D. 2012 / ILSVRC-2012 / TOP-5 ERR 15.3%** | the 2012 "impact" |
| 38 | 80.4–81.0 | Rei in void; boy sketch; Eva-00 head, green eye | Perceptron in a blue void; pencil sketch of the **decoder** stack; brown Mark I head | — |
| 39 | 81.0–81.1 | ADAM (black on white) | **ADAM** | Kingma & Ba 2014 |
| 40 | 81.1–82.6 | Ritsuko; green data grid; Misato turning | BatchNorm bell in profile; **grokking grid** (24 snapshots of the embedding's Fourier power + val acc from the real run); LSTM turning in four steps; pencil line-up of Perceptron / ResNet / LSTM | real data |
| 41 | 82.6–83.7 | 監督 庵野秀明, green slash 83.6 | 監督 **勾配降下** (3 + 1 layout, vertical 監督); at 83.6 the green slash drops and **wipes** the crucifix in behind it | gradient descent directs everything |
| 42 | 83.7–86.1 | Unit-01 crucifix on orange bars, pilot superimposed | TYPE-01 with NVLink-bridge arms spread, stepped zoom-outs, Transformer superimposed | — |
| 43 | 86.1–87.6 | Shinji determined (sky), strained (teal) | MHA "face" close-ups: eyes open on sky, squeezed shut on teal | — |
| 44 | 87.6–88.2 | black → burst → smiling on green bokeh | black, white burst with dark figure, smiling face on green bokeh (bokeh only where the original has it) | — |
| 45 | 88.2–90.5 | red wall, scrawl, 製作 + logos, fade | red wall with scrawled ∂ℒ ∇θ Σ ηg; 製作 **テンソル東京** (original ring mark) + **NAS**; fade to black from 90.0 | NAS = Neural Architecture Search |

## Every ML fact / number on screen, with its source
- **1706.03762**, **65M** params, **12 h on 8×P100** (base model, 100k steps), **warm-up 4000 steps** (WARMUP lamp), **d_model 512, d_ff 2048, h = 8, d_k = d_v = 64, N = 6** (L06/H08, "VI STRATORVM · VIII CAPITVM"), **PE wavelengths 2π … 10000·2π**, **WMT 2014**, **label smoothing**, **beam search**, **NIPS 2017 = the 31st conference**: Vaswani et al., "Attention Is All You Need", NIPS 2017 (§3.2, §3.5, §5.2, §5.4, §6.1, Tables 1–3).
- **11:59:56** = 12 h − 4 s, mirroring 5:00 − 4 s = 4:59:56 in the original; **88:88:88** is the lamp test the original also shows (51.83 s).
- **16 heads** (wings): Transformer (big), h = 16 (same paper, Table 3). The wing and iris intensities are rows of a real softmax attention matrix `attnPE()` over sinusoidal position encodings (d = 64), computed in `kit.js`.
- **C ≈ 6ND**: Kaplan et al., "Scaling Laws for Neural Language Models", 2020.
- **Chinchilla curve** on the visor: L(N, D) = 1.69 + 406.4/N^0.34 + 410.7/D^0.28, plotted for N = 10^7 … 10^11 at D = 1.4 T tokens: Hoffmann et al., 2022 (fitted constants as given in the brief; 1.4 T = Chinchilla's token count).
- **ILSVRC-2012, top-5 error 15.3 %**: Krizhevsky, Sutskever & Hinton, "ImageNet Classification with Deep CNNs", NIPS 2012 (winning entry).
- **AlexNet dimensions** 224 (input), 55, 27, 13, 13, 13 (spatial), 48/128/192/192/128 channels per GPU, fc 2048 per GPU (4096 total), two GPUs: same paper, Fig. 2 (which is itself cropped at the top in the published PDF).
- **Mark I Perceptron (1958)**, **20 × 20 photocell retina**: Rosenblatt, 1958, *Psych. Review* 65(6); the Mark I's sensory unit was a 20×20 array of CdS photocells (Mark I Perceptron Operators' Manual, 1960). **MCMLVIII** = 1958.
- **ResNet-50, F(x) + x**: He et al., CVPR 2016. **Highway network T(x) gate** (the ResNet's "mother"): Srivastava, Greff & Schmidhuber, 2015.
- **Momentum `βv + ∇L`**: Polyak 1964 heavy ball, written in PyTorch's SGD form. **Dropout**: Srivastava et al., JMLR 2014. **ReLU `max(0, x)`**: Nair & Hinton 2010. **GAN `min_G max_D`**: Goodfellow et al. 2014. **Adam**: Kingma & Ba 2014. **BatchNorm μ, σ**: Ioffe & Szegedy 2015. **LSTM**: Hochreiter & Schmidhuber 1997 (drawn after C. Olah's 2015 diagram).
- **Himmelblau's function** (x² + y − 11)² + (x + y² − 7)², minima (3, 2), (−2.805118, 3.131312), (−3.779310, −3.283186), (3.584428, −1.848126): Himmelblau 1972. Contours are computed at init.
- **Grokking grid** (81.1–81.6): `shared/data/grokking.json`, a real run: 2-layer MLP, (a + b) mod 97, 30 % train, AdamW wd = 1.0, 30 k steps. Each panel shows the step label (`snap_steps`), normalized Fourier power at 16 of the 48 frequencies, and `val_acc` at that step. The binary strings are 97 = 1100001₂ and 30000 = 111010100110000₂.
- **Random labels / memorization** (ED theme credit): Zhang et al., "Understanding deep learning requires rethinking generalization", ICLR 2017. **Double descent**: Nakkiran et al. 2019 / Belkin et al. 2019.
- **FPN** (the pyramid HQ): Lin et al. 2017. **GLUE**: Wang et al. 2018. **ImageNet** (Deng et al. 2009), **WaveNet** (van den Oord et al. 2016), **librosa** (McFee et al. 2015), **OpenCV BGR order**, **Tensor Cores / GEMM**, **NVIDIA A10**, **NVLink**, **US-EAST-1** (AWS region): real names used as credits or places.
- No other numbers appear on screen. The rack-tower LEDs and the scrawl glyphs on the red wall carry no digits.

## Credits policy
Every credit names a concept, paper, dataset, library, hardware item or place. No real living person is given a
role. The paper itself appears only as its arXiv id. The two producer marks (the ring for テンソル東京, and NAS) are
original designs, not broadcaster logos. The logo is an original parody mark, and no EVANGELION / NERV artwork is
reproduced.

## Known weaknesses (frank)
- **Characters are diagrams.** The Transformer "face" (the MHA block with two attention-map eyes) is a consistent
  convention, but it can't act like Shinji. The strained and smiling faces (87–88 s) read as cute emoticons rather
  than drama.
- **Chorus variety.** Many chorus close-ups are the same TYPE-01 card from different angles (the original also
  repeats Unit-01, but its drawings are richer). The staff roll-call (72.3–74.6) is a sequence of clean
  textbook diagrams on painted skies. It's clever to a practitioner but flatter than cel animation.
- **3-D boxes.** The cel-box renderer gives flat 2-tone shading with trace lines, but perspective boxes still look
  more "vector" than hand-drawn in places (feature pyramid 72.0, crucifix card 84–86).
- **Hands and organic shapes** (Unit-01's hand at 67.8, the pink blast, the smoke) are simple polygons and circles.
  They're correct in silhouette and palette but not in draughtsmanship.
- **Text density.** Some credit blocks sit over busy cels (25.5 s over the being, 60–64 s over the card). A soft
  dark video fringe is used there, and legibility is fine at 1440 px but tighter on a small screen.
- **Unverified micro-timing.** Chorus cuts use the detected-cut frames. A few 2–3-frame shots (e.g. the SECOND IMPACT
  card, 79.70–79.80) can't be confirmed against the 8 fps reference sheets and may be ±1–2 frames off.
