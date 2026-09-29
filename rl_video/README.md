# 強化学習の本質 — 3Blue1Brown スタイルの解説動画シリーズ（日本語）

強化学習をゼロから、ステップごとに理解するための解説動画シリーズ。
Manim Community でアニメーションを作り、ナレーションは VOICEVOX で合成している。

- シリーズ構成・制作ルール: [SERIES_PLAN.md](SERIES_PLAN.md)
- 各章の台本: `chapters/chNN/script.md`（`tools/transcript.py` で生成）

## ビルド

```bash
./setup.sh                          # 依存関係と VOICEVOX の取得（初回のみ）
python3 tools/build.py ch01         # 480p の下書き
python3 tools/build.py ch01 -q h    # 1080p60 の本番 → output/ch01_1080p60.mp4
```

## ディレクトリ

| パス | 中身 |
|---|---|
| `common/` | 共通部品（色・文字、VOICEVOX 合成、ナレーション同期 Scene、グリッドワールド、RL アルゴリズム） |
| `chapters/chNN/scenes.py` | 各章のシーン。ナレーション文もここに書く（台本の正本） |
| `tools/` | ビルド、台本書き出し、読みチェック、コマ一覧画像 |
| `output/` | 完成した動画と字幕（.srt） |

## クレジット

- ナレーション: VOICEVOX:青山龍星
- アニメーション: [Manim Community](https://www.manim.community/)
