#!/usr/bin/env bash
# Chat-shareable copies (<30 MiB each, still 1080p): the OP whole, the main film split at EPISODE:4.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist/preview
enc() {   # src audio start end out maxrate
  ffmpeg -y -v error -ss "$3" -to "$4" -i "$1" -ss "$3" -to "$4" -i "$2" -map 0:v -map 1:a \
    -c:v libx264 -preset slow -tune film -crf 20 -maxrate "$6" -bufsize 5M -pix_fmt yuv420p \
    -c:a aac -b:a 160k -shortest -movflags +faststart "$5"
}
enc out/opening/master_video.mp4  out/opening/score.wav  0    86.27 dist/preview/OP_opening_1080p.mp4        2350k &
enc out/episodes/master_video.mp4 out/episodes/score.wav 0    75.5  dist/preview/EP_part1_ep0-3_1080p.mp4    2550k &
enc out/episodes/master_video.mp4 out/episodes/score.wav 75.5 152.5 dist/preview/EP_part2_ep4-end_1080p.mp4  2550k &
wait
for f in dist/preview/*.mp4; do echo "$f $(ffprobe -v error -show_entries format=duration,size -of csv=p=0 "$f")"; done
