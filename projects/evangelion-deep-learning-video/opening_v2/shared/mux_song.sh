#!/usr/bin/env bash
# Concatenate a pattern's rendered segments and lay the original song under it (personal-use copy).
#   bash opening_v2/shared/mux_song.sh out/opening_v2/p1_xxx dist/opening_v2/p1_xxx.mp4
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT="$1"; DST="$2"; mkdir -p "$(dirname "$DST")"
ffmpeg -y -v error -f concat -safe 0 -i "$OUT/segments/list.txt" -c copy "$OUT/master.mp4"
ffmpeg -y -v error -i "$OUT/master.mp4" -i reference/song.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 17 \
  -pix_fmt yuv420p -c:a aac -b:a 256k -shortest -movflags +faststart "$DST"
ls -la "$DST"
