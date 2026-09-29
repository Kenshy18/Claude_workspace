# 制作ガイド（章を実装する人・エージェント向け）

第1章 (`chapters/ch01/scenes.py`) が見本。迷ったら同じ書き方をする。

## コマンド

```bash
cd rl_video
python3 tools/kana_check.py chNN                 # ナレーションの読みを一覧（読み間違い探し）
python3 tools/build.py chNN -q l -j 2            # 480p15 の下書きを全シーン
python3 tools/build.py chNN -q l --scenes A,B    # 一部だけ再レンダリング
python3 tools/sheet.py media/chNN/videos/scenes/480p15/Scene.mp4 --every 3 --cols 5 --width 384 -o /tmp/x.png
                                                 # コマ一覧画像 → Read で目視確認
python3 tools/transcript.py chNN                 # 台本 chapters/chNN/script.md を書き出す
```

単体で試すとき: `PYTHONPATH=. manim -ql --media_dir media/chNN chapters/chNN/scenes.py SceneName`

## ファイル構成

- `chapters/chNN/scenes.py` に `CHAPTER_TITLE` と `SCENES`（再生順のクラス名リスト）を定義する。
- 章だけで使う部品は `chapters/chNN/helpers.py` に置き、`from chapters.chNN.helpers import ...` で読み込む
  （build.py は PYTHONPATH にプロジェクトのルートを入れて manim を起動する）。
- `common/` は全章で共有なので、章の作業中は編集しない。

## ナレーション

- `with self.voice("...") as v:` の中でアニメーションを再生する。抜けると音声の終わりまで自動で待つ。
- `{A}` のようなブックマークを書き、`self.wait_to(v, "A")` / `v.until("A")` で同期する。
- 読みの指定は `[表示|よみ]`（字幕は表示、音声はよみ）。例: `[SARSA|サルサ]`, `[DQN|ディーキューエヌ]`, `[Q|キュー]`, `[sₜ|エスティー]`
- 「」は字幕にだけ出て読み上げない（余計な間が入らないように）。
- `common/lexicon.py` は共有なので触らない。読み間違いはインラインの `[表示|よみ]` で直す。
- `kana_check.py` で全文の読みを確認する。よくある誤り: 「上へ」→ジョウエ、「下の」→モトノ、「〜歩」→フ、英字略語。
- 数式の記号は字幕用に Unicode（γ, π, θ, sₜ, rₜ₊₁ など）を表示側に書き、よみ側にカタカナを書く。

## 画面づくりのルール

- 背景は `style.BG`、色は `common/style.py` の意味づけ（状態=青, 行動=緑, 報酬=黄, 価値=青緑, 方策=紫, γ=橙, θ=桃）を守る。
- フレームは横 14.2 × 縦 8。要素は x ∈ [−6.8, 6.8], y ∈ [−3.7, 3.7] に収める（端でのはみ出しに注意）。
- 文字サイズの目安: 本文ラベル 32〜40、補足 26〜30（これより小さくしない）、主役の数式 52〜64、補助の数式 40〜48。
  グリッドが主役のときは cell ≥ 1.2。小さく作りがちなので、迷ったら大きく。
- 各シーンの最初のナレーションの間に、必ず何かを画面に出す（真っ黒な時間を作らない）。
- 箇条書きスライドにしない。文字はラベルと式に絞り、説明は動きで見せる。
- 画面に出す数値（価値、確率、学習曲線、ヒストグラム…）は実際に計算したものを使う。乱数はシード固定。
- シーンの最後は `FadeOut` で画面を空にして終える（章はシーンを単純につなぐため）。

## Manim の落とし穴（実際に踏んだもの）

- `always_redraw` の図形は、`self.wait()` 中は更新されないことがある（静止フレーム最適化）。
  トラッカーの値を決めたあとで `always_redraw` を作る／`.update()` を呼ぶ。
- `always_redraw` の図形に `FadeIn` などをかけると、中身の構造が変わって落ちる。`self.add` で出す。
- 塗りつぶした箱（トークンのチップなど）を文字の後から `FadeIn` すると文字が隠れる。箱を先に add する。
- `ProbBars` のラベルは、1本あたりの幅（width / 本数）より広いと隣と重なる。width を十分に取る。
- `MathTex` の部分色付けは、分割引数（`mt("G_t", "=", ...)` の各要素）に `set_color` するのが確実。
  `tex_to_color_map` は `s` が `\sum` に当たるなどの事故が起きやすい。
- 並列レンダリングで LaTeX のキャッシュ書き込みが競合することがある（build.py は1回だけ自動で再試行）。

## レビューの手順

1. `build.py -q l` → シーンごとに `sheet.py`（3〜4秒間隔）で一覧画像を作り、Read で全コマを見る。
2. チェック項目: はみ出し／重なり／小さすぎる文字／何も映っていない時間／ナレーションと絵のズレ／数値の正しさ。
3. 直したシーンだけ `--scenes` で再レンダリングして、同じ確認を繰り返す。

## v2 の演出ルール（第1章 v2 が見本）

ユーザーの評価は「及第点だが驚きはない」。v2 では次の4点を必ず満たす。

1. **「なるほど」の瞬間を章に最低2つ**。定義の説明で終わらせず、意外な見方・実験・歴史的な事実を、実際の計算で見せる
   （例: 第1章の「割引率＝生き残る確率」を100台のロボットのシミュレーションで示す、報酬ハッキングのボート、アルファ碁ゼロ）。
2. **連続性**: 出して消す（FadeIn/FadeOut）の繰り返しを避け、ある物が別の物に「なる」ように見せる
   （Transform / ReplacementTransform / TransformFromCopy / TransformMatchingTex）。
   第1章 Differences のように、説明に使った図をそのまま縮めてまとめのカードにする、など。
   シーンの境目も、次のシーンの冒頭で同じ物を同じ位置に `self.add` しておけば、切れ目なくつながる。
3. **カメラとキャラクター**:
   - `self.focus_on(mob, height=...)` / `self.reset_frame()` でズーム・パン（章に数回）。3D が効く場面は `VoiceScene3D`。
   - ロボットは感情を持つ登場人物。`robot.change("happy"|"surprised"|"sad"|"worried"|"determined"|"normal")`,
     `robot.hop()`, `robot.look(dir)`, `robot.blink()`, `robot.say("…")` / `robot.think("？")`（吹き出し）, `robot.sweat()`。
     数式の場面でも、隅に置いたロボットが「？」→「！」と反応すると、見る側の気持ちの流れが作れる。
   - `glow_dot(point, color)` は光る点（価値の伝播、ボートなど）。
4. **音**:
   - 効果音 `self.sfx(name)`: pop（重要な物の登場）, hit（ラベル・結果の確定）, chime（成功）, fall / thud（失敗）,
     sparkle（なるほどの瞬間）, whoosh（カメラ移動・場面転換）, tick（カウンタ）。平均 5〜10 秒に1回程度、控えめに。
   - BGM は build.py が自動で入れる（章ごとに別のシード）。シーン側では何もしなくてよい。
   - ナレーションの《強調》は、1シーンに1〜2語まで。

その他の注意（各章の作業から）:
- `self.remove(group)` は、別々にアニメーションした部品が残ることがある。`self.remove(*m.get_family())` を使う。
- MathTex の1文字ラベルは Text より小さく見える。1文字なら size 60 以上。
- 回転の中心を保存して回す部品は、移動後に壊れる。回転は毎回 `get_center()` を基準に。
- `GridView.center_of` は移動後も正しいが、`_pos` / `origin` は移動前の座標のまま。
- 作業ファイル（ログ、コマ一覧）はスクラッチパッドの章ごとのサブフォルダに書く（並列作業で上書きし合わないように）。
