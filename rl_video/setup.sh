#!/usr/bin/env bash
# 動画ビルドに必要なツール一式をセットアップする（Ubuntu 24.04 想定）。
#   - Manim Community + LaTeX (xelatex / xeCJK) + ffmpeg + 日本語フォント
#   - VOICEVOX CORE（Python wheel, ONNX Runtime, 音声モデル, Open JTalk 辞書）
# 何度実行しても安全（ダウンロード済みのものはスキップ）。
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENDOR="$HERE/.vendor/voicevox"
VV_VERSION="0.16.4"
ORT_VERSION="1.17.3"
# 使う音声モデル（VVM）。スタイルIDとの対応は common/config.py を参照。
VVMS=(4 6 12 15)

echo "==> apt packages"
if command -v apt-get >/dev/null; then
  apt-get update -qq || true
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    ffmpeg sox libcairo2-dev libpango1.0-dev pkg-config \
    fonts-noto-cjk fonts-noto-cjk-extra \
    texlive-latex-base texlive-latex-extra texlive-latex-recommended \
    texlive-fonts-recommended texlive-fonts-extra texlive-science \
    texlive-xetex texlive-lang-japanese dvisvgm >/dev/null
fi

echo "==> python packages"
# manim の依存 srt は sdist しかなく、環境によってはビルドに失敗するので手で入れる
if ! python3 -c "import srt" 2>/dev/null; then
  tmp="$(mktemp -d)"
  pip download -q --no-deps --no-binary :all: srt==3.5.3 -d "$tmp"
  tar xzf "$tmp"/srt-3.5.3.tar.gz -C "$tmp"
  SP="$(python3 -c 'import site;print(site.getsitepackages()[0])')"
  cp "$tmp/srt-3.5.3/srt.py" "$SP/"
  mkdir -p "$SP/srt-3.5.3.dist-info"
  printf "Metadata-Version: 2.1\nName: srt\nVersion: 3.5.3\n" > "$SP/srt-3.5.3.dist-info/METADATA"
  echo "srt.py,," > "$SP/srt-3.5.3.dist-info/RECORD"
fi
pip install -q -r "$HERE/requirements.txt"

echo "==> VOICEVOX CORE"
mkdir -p "$VENDOR/models"
GH="https://github.com/VOICEVOX"
if ! python3 -c "import voicevox_core" 2>/dev/null; then
  whl="voicevox_core-${VV_VERSION}-cp310-abi3-manylinux_2_34_x86_64.whl"
  curl -sSL -o "/tmp/$whl" "$GH/voicevox_core/releases/download/${VV_VERSION}/$whl"
  pip install -q "/tmp/$whl"
fi
if [ ! -d "$VENDOR/onnxruntime" ]; then
  curl -sSL -o /tmp/ort.tgz \
    "$GH/onnxruntime-builder/releases/download/voicevox_onnxruntime-${ORT_VERSION}/voicevox_onnxruntime-linux-x64-${ORT_VERSION}.tgz"
  tar xzf /tmp/ort.tgz -C /tmp
  mv "/tmp/voicevox_onnxruntime-linux-x64-${ORT_VERSION}" "$VENDOR/onnxruntime"
fi
if [ ! -d "$VENDOR/dict" ]; then
  curl -sSL -o /tmp/ojt_dic.tgz \
    "https://github.com/r9y9/open_jtalk/releases/download/v1.11.1/open_jtalk_dic_utf_8-1.11.tar.gz"
  tar xzf /tmp/ojt_dic.tgz -C /tmp
  mv /tmp/open_jtalk_dic_utf_8-1.11 "$VENDOR/dict"
fi
for n in "${VVMS[@]}"; do
  if [ ! -f "$VENDOR/models/$n.vvm" ]; then
    curl -sSL -o "$VENDOR/models/$n.vvm" "$GH/voicevox_vvm/releases/download/${VV_VERSION}/$n.vvm"
  fi
done

echo "==> done"
