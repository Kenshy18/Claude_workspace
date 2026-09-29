"""章をレンダリングして1本の動画にまとめる。

    python tools/build.py ch01                 # 480p15 の下書き
    python tools/build.py ch01 -q h            # 1080p60 の本番
    python tools/build.py ch01 -q h --scenes Hook,Title   # 一部のシーンだけ再レンダリング

出力: output/<章>_<quality>.mp4（字幕トラック付き）と .srt
各シーンの SCENES リストの順につなぐ。音量は EBU R128 で正規化する。
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import datetime
import importlib.util
import json
import os
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

QUALITY_DIR = {"l": "480p15", "m": "720p30", "h": "1080p60", "k": "2160p60"}


def load_chapter(ch: str):
    path = ROOT / "chapters" / ch / "scenes.py"
    spec = importlib.util.spec_from_file_location(f"chapters.{ch}.scenes", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return path, mod


def render(path: pathlib.Path, scene: str, q: str, media: pathlib.Path) -> tuple[str, float]:
    env = dict(os.environ, PYTHONPATH=str(ROOT))
    t0 = datetime.datetime.now()
    cmd = ["manim", f"-q{q}", "--media_dir", str(media), str(path), scene]
    r = subprocess.run(cmd, cwd=ROOT, env=env, capture_output=True, text=True)
    if r.returncode != 0:
        # 並列実行時に LaTeX のキャッシュ書き込みが競合することがあるので1回だけやり直す
        r = subprocess.run(cmd, cwd=ROOT, env=env, capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(r.stdout[-4000:] + r.stderr[-4000:])
        raise RuntimeError(f"render failed: {scene}")
    return scene, (datetime.datetime.now() - t0).total_seconds()


def probe_duration(p: pathlib.Path) -> float:
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                   "-of", "json", str(p)])
    return float(json.loads(out)["format"]["duration"])


def has_audio(p: pathlib.Path) -> bool:
    out = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "a",
                                   "-show_entries", "stream=index", "-of", "csv=p=0", str(p)])
    return bool(out.strip())


def parse_srt(text: str):
    import srt
    return list(srt.parse(text))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("chapter")
    ap.add_argument("-q", "--quality", default="l", choices=list(QUALITY_DIR))
    ap.add_argument("-j", "--jobs", type=int, default=3)
    ap.add_argument("--scenes", default=None, help="再レンダリングするシーン（カンマ区切り）")
    ap.add_argument("--no-render", action="store_true", help="レンダリングせず結合だけ")
    a = ap.parse_args()

    path, mod = load_chapter(a.chapter)
    media = ROOT / "media" / a.chapter  # 章ごとに分ける（どの章もモジュール名が scenes のため）
    scenes: list[str] = list(mod.SCENES)
    todo = scenes if a.scenes is None else [s for s in a.scenes.split(",") if s]
    if not a.no_render:
        with cf.ThreadPoolExecutor(a.jobs) as ex:
            futs = [ex.submit(render, path, s, a.quality, media) for s in todo]
            for f in cf.as_completed(futs):
                s, sec = f.result()
                print(f"  rendered {s} ({sec:.0f}s)", flush=True)

    vdir = media / "videos" / path.stem / QUALITY_DIR[a.quality]
    work = ROOT / "build" / a.chapter / a.quality
    work.mkdir(parents=True, exist_ok=True)

    import srt
    subs = []
    offset = 0.0
    concat_list = work / "videos.txt"
    audio_parts = []
    with open(concat_list, "w") as f:
        for s in scenes:
            mp4 = vdir / f"{s}.mp4"
            if not mp4.exists():
                raise FileNotFoundError(mp4)
            dur = probe_duration(mp4)
            f.write(f"file '{mp4}'\n")
            wav = work / f"{s}.wav"
            if has_audio(mp4):
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp4), "-vn", "-ac", "2",
                                "-ar", "48000", "-t", f"{dur:.3f}", "-af", "apad", str(wav)], check=True)
            else:
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i",
                                "anullsrc=r=48000:cl=stereo", "-t", f"{dur:.3f}", str(wav)], check=True)
            audio_parts.append(wav)
            srt_path = mp4.with_suffix(".srt")
            if srt_path.exists():
                for sub in parse_srt(srt_path.read_text()):
                    sub.start += datetime.timedelta(seconds=offset)
                    sub.end += datetime.timedelta(seconds=offset)
                    subs.append(sub)
            offset += dur

    video = work / "video.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i",
                    str(concat_list), "-an", "-c", "copy", str(video)], check=True)
    alist = work / "audio.txt"
    alist.write_text("".join(f"file '{p}'\n" for p in audio_parts))
    audio = work / "audio.m4a"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(alist),
                    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "160k",
                    str(audio)], check=True)
    for i, sub in enumerate(subs, 1):
        sub.index = i
    out_dir = ROOT / "output"
    out_dir.mkdir(exist_ok=True)
    name = f"{a.chapter}_{QUALITY_DIR[a.quality]}"
    srt_out = out_dir / f"{name}.srt"
    srt_out.write_text(srt.compose(subs))
    title = getattr(mod, "CHAPTER_TITLE", a.chapter)
    final = out_dir / f"{name}.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-i", str(audio), "-i", str(srt_out),
                    "-map", "0:v", "-map", "1:a", "-map", "2:s", "-c:v", "copy", "-c:a", "copy",
                    "-c:s", "mov_text", "-metadata:s:s:0", "language=jpn",
                    "-metadata", f"title={title}", "-movflags", "+faststart", "-shortest",
                    str(final)], check=True)
    print(f"{final}  {offset/60:.1f} min")


if __name__ == "__main__":
    main()
