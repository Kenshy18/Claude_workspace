"""ナレーション（＋効果音）のトラックに BGM を重ねて、最終の音声を作る。

ナレーションを −16 LUFS、BGM を −27 LUFS にそろえてから、
ナレーションが鳴っている間だけ BGM をサイドチェインで数 dB 下げて足し合わせる。
"""
from __future__ import annotations

import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from common import audio  # noqa: E402


def duration(path) -> float:
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                   "-of", "json", str(path)])
    return float(json.loads(out)["format"]["duration"])


def mix(voice: str | pathlib.Path, out: str | pathlib.Path, seed: int = 0, bgm_lufs: float = -27.0,
        bitrate: str = "64k") -> str:
    voice = pathlib.Path(voice)
    out = pathlib.Path(out)
    dur = duration(voice)
    bgm = out.with_name(out.stem + "_bgm.wav")
    audio.make_bgm(dur, seed, bgm)
    filt = (
        f"[0:a]aformat=channel_layouts=stereo,aresample=48000,loudnorm=I=-16:TP=-2:LRA=11[v0];"
        f"[1:a]aresample=48000,loudnorm=I={bgm_lufs}:TP=-6:LRA=7[b0];"
        f"[v0]asplit=2[v][sc];"
        f"[b0][sc]sidechaincompress=threshold=0.08:ratio=3:attack=40:release=700:makeup=1[bd];"
        f"[v][bd]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11[out]"
    )
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(voice), "-i", str(bgm),
                    "-filter_complex", filt, "-map", "[out]", "-ar", "48000", "-c:a", "aac",
                    "-b:a", bitrate, str(out)], check=True)
    bgm.unlink(missing_ok=True)
    return str(out)


if __name__ == "__main__":
    mix(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 0)
