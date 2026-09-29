"""シリーズ全体の設定（声・パス）。

声を変えたいときは NARRATOR_STYLE を書き換えるか、環境変数 RLV_VOICE で
スタイルIDを渡す（例: RLV_VOICE=52）。キャッシュは声ごとに分かれるので、
切り替えたら build.py で再レンダリングするだけでよい。
"""
from __future__ import annotations

import os
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
VENDOR = ROOT / ".vendor" / "voicevox"
CACHE_DIR = ROOT / ".cache"
BUILD_DIR = ROOT / "build"
OUTPUT_DIR = ROOT / "output"

# スタイルID -> (VVMファイル, クレジット表記)
VOICES = {
    13: ("15.vvm", "青山龍星"),
    84: ("15.vvm", "青山龍星"),
    52: ("12.vvm", "雀松朱司"),
    53: ("12.vvm", "麒ヶ島宗麟"),
    11: ("4.vvm", "玄野武宏"),
    21: ("4.vvm", "剣崎雌雄"),
    29: ("6.vvm", "No.7"),
    30: ("6.vvm", "No.7"),
    31: ("6.vvm", "No.7"),
}

NARRATOR_STYLE = int(os.environ.get("RLV_VOICE", "13"))

# 話し方のパラメータ。解説動画として落ち着いて聞ける速さに寄せている。
SPEED = float(os.environ.get("RLV_SPEED", "1.02"))
PITCH = 0.0
INTONATION = 1.22
PRE_PHONEME = 0.06
POST_PHONEME = 0.08
SENTENCE_GAP = 0.5  # 文と文のあいだの間（秒）
COMMA_PAUSE_SCALE = 1.0
EMPH_PITCH = 0.09     # 《強調》したモーラの音高を上げる量（log F0）
EMPH_LENGTH = 1.12    # 《強調》したモーラの母音を伸ばす倍率


def narrator_credit() -> str:
    return f"VOICEVOX:{VOICES[NARRATOR_STYLE][1]}"
