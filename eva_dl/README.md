# 新世紀 勾配降下 — NEON GENESIS GRADIENT DESCENT

深層学習 × エヴァンゲリオンのトリビュート映像（1920×1080 / 30fps / 約2分33秒、音声付き）。

**完成品:** [`dist/neon_genesis_gradient_descent.mp4`](dist/neon_genesis_gradient_descent.mp4)

![contact sheet](dist/contact_sheet.jpg)

映像も音も**全部コードから生成**しています。素材の取り込みはしていません。HUD や数式のアニメーションは
Canvas 2D と WebGL のポストエフェクトで描画し、数式は MathJax で組版、音楽と効果音は NumPy/SciPy で
オシレーターから合成しています。画面上の数値（エネルギースコア、マハラノビス距離、MoE ルーティング、KL 最適方策、
7層 self-attention）はその場で実際に計算したものです。第2話の学習曲線だけは説明用に作った曲線です。

## 構成：各話と深層学習の対応

| 話 | エヴァ | 深層学習 | 画面上で実際に計算しているもの |
|---|---|---|---|
| 0 | MAGI 起動 / セフィロトの樹 | 計算グラフの順伝播・逆伝播 | 10ノード22辺のグラフ上をパルスが往復 |
| 1 | 使徒、襲来 — **パターン青** | **分布外（OOD）検知** | ロジット `[2.6, −1.9, …]` → softmax は「猫 97.3%」と言うのに、エネルギー `E(x) = −T log Σ e^{f/T} = −2.63` が閾値を超えて検知（Liu+ 2020） |
| 2 | シンクロ率 **400%**、LCL に溶ける | **過学習** | `SYNC ≡ L*/L_train`（L* はベイズ誤差）。100% を超える＝ノイズ床より下まで訓練データに合わせている＝丸暗記。初期値の 41.3% は第弐話へのオマージュ |
| 3 | MAGI（三賢者）の合議 | **Sparse Mixture-of-Experts**（N=3, top-2） | 「逃げちゃダメだ」×3 のトークンを softmax ルーターが振り分け、Switch 型の補助損失を計算。三人格が同じ重みから分かれた＝sparse upcycling |
| 4 | **拘束具**（装甲ではない）、初号機の**暴走** | **RLHF の KL ペナルティと報酬ハッキング** | KL 正則化目的関数の厳密な最適解 `π_β ∝ π_ref · exp(r_φ/β)` を β → 0 まで掃引。代理報酬は上がり続け、真の報酬は Gao+ 2022 型の逆U字を描いて崩れる |
| 終 | **人類補完計画**、AT フィールド＝心の壁 | **Self-Attention のランク崩壊**（Dong+ 2021） | 48トークン×24次元に単一ヘッド attention を7層かける。スキップ接続なしだと ‖res(X)‖/‖X‖ が 0.97 → 0.66 → 0.11 → 1e-4 → 2e-13 → float64 の ε と**二重指数的に**崩壊（ランク1＝全ての心がひとつに）。同じ重みでも**残差接続**を入れれば、各トークンは自分を保つ |
| 最終話 | まごころを、君に | **残差を、君に** — *ATTENTION IS NOT ALL YOU NEED.* | |
| 終劇 | おめでとう | 学習収束 | 「教師モデルに、ありがとう／事前学習に、さようなら／そして、全ての勾配に／おめでとう」 |

## ビルド方法

必要なもの: Node 18+, Python 3.10+（numpy, scipy）, ffmpeg (libx264), Chromium (Playwright), Noto CJK フォント。

```bash
npm i                                   # playwright, mathjax-full
npm run formulas                        # TeX → SVG (src/formulas.js)
node tools/render.mjs --cues            # タイムラインから音響キューを書き出し → out/cues.json
python3 audio/synth.py                  # スコア合成 → out/score.wav
node tools/render.mjs --video --workers 4   # フレームをレンダリング → out/segments/*.mp4
node tools/render.mjs --stills 23,110   # 確認用の静止画 → out/stills/
bash tools/mux.sh                       # 結合 + 音声合成 → dist/neon_genesis_gradient_descent.mp4
```

各フレームは時刻 `t` の純粋関数なので、どのフレームも単独で描画できます（並列ワーカーで分担して描画）。

## ファイル構成

```
src/core.js            描画キット（HUD パネル、グラフ、タイトルカード、字幕、数式、正八面体…）
src/fx.js              WebGL ポスト処理（ブルーム、色収差、グリッチ、走査線、グレイン）
src/scenes/*.js        各話のシーン（数値計算もここ）
src/main.js            タイムライン組み立て、描画のエントリポイント
audio/synth.py         オリジナルスコアと効果音（サンプル素材なし）
tools/render.mjs       ヘッドレス Chromium → ffmpeg のレンダリングドライバ
tools/build_formulas.mjs
```

## クレジット

- 『新世紀エヴァンゲリオン』（庵野秀明 / カラー / GAINAX）への非公式ファントリビュートです。権利者とは一切関係ありません。
  公式のロゴ・映像・音楽は使っていません。書体は Noto Serif/Sans CJK JP、Barlow Condensed、Share Tech Mono、JetBrains Mono（いずれも OFL）。
- 参考文献: Liu et al. 2020 (Energy-based OOD), Nakkiran et al. 2019 (Deep Double Descent), Shazeer et al. 2017 / Fedus et al. 2021 (MoE),
  Komatsuzaki et al. 2022 (Sparse Upcycling), Gao, Schulman & Hilton 2022 (Reward Model Overoptimization),
  Dong, Cordonnier & Loukas 2021 (Attention is Not All You Need: Pure Attention Loses Rank Doubly Exponentially with Depth).
