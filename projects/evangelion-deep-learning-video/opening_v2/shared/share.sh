#!/usr/bin/env bash
# Chat-shareable copy (<29 MiB) of a finished pattern: two-pass x264 sized to the duration,
# with a light temporal denoise so bits go to structure rather than film grain.
#   bash opening_v2/shared/share.sh dist/opening_v2/p2_mincho.mp4 dist/opening_v2/share/p2_mincho.mp4
set -euo pipefail
cd "$(dirname "$0")/../.."
SRC="$1"; DST="$2"; mkdir -p "$(dirname "$DST")"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC")
VB=$(python3 -c "print(int((27.0*8*1024*1024/$DUR - 160000)/1000))")
LOG="out/x264_share_$(basename "$DST" .mp4)"
ffmpeg -y -v error -i "$SRC" -vf "hqdn3d=1.2:1.2:5:5" -c:v libx264 -preset slow -b:v ${VB}k -pass 1 -passlogfile "$LOG" -an -f mp4 /dev/null
ffmpeg -y -v error -i "$SRC" -vf "hqdn3d=1.2:1.2:5:5" -c:v libx264 -preset slow -b:v ${VB}k -pass 2 -passlogfile "$LOG" \
  -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart "$DST"
echo "$DST $(du -h "$DST" | cut -f1) (video ${VB} kb/s)"
