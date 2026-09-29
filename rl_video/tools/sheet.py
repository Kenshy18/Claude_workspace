"""動画からコマを抜き出して一覧画像にする（レビュー用）。

    python tools/sheet.py VIDEO [--every 2.0] [--cols 4] [--width 480] [--start 0] [--end None] [-o out.png]
"""
import argparse, json, pathlib, subprocess, tempfile

p = argparse.ArgumentParser()
p.add_argument("video")
p.add_argument("--every", type=float, default=2.0)
p.add_argument("--cols", type=int, default=4)
p.add_argument("--width", type=int, default=480)
p.add_argument("--start", type=float, default=0.0)
p.add_argument("--end", type=float, default=None)
p.add_argument("--times", type=str, default=None, help="カンマ区切りの秒数")
p.add_argument("-o", "--out", default=None)
a = p.parse_args()

dur = float(json.loads(subprocess.check_output(
    ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", a.video]))["format"]["duration"])
end = min(a.end or dur, dur - 0.05)
if a.times:
    times = [float(t) for t in a.times.split(",")]
else:
    times, t = [], a.start
    while t <= end:
        times.append(t)
        t += a.every
out = a.out or str(pathlib.Path(a.video).with_suffix("")) + "_sheet.png"
with tempfile.TemporaryDirectory() as d:
    files = []
    for i, t in enumerate(times):
        f = f"{d}/{i:04d}.png"
        subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", a.video, "-frames:v", "1",
                        "-vf", f"scale={a.width}:-1,drawtext=text='{t:.1f}s':x=w-tw-4:y=h-th-4:fontsize=14:fontcolor=white:box=1:boxcolor=black@0.6",
                        f], check=True)
        files.append(f)
    rows = (len(files) + a.cols - 1) // a.cols
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", "1", "-i", f"{d}/%04d.png",
                    "-vf", f"tile={a.cols}x{rows}:padding=4:color=gray", "-frames:v", "1", out], check=True)
print(out, len(times), "frames")
