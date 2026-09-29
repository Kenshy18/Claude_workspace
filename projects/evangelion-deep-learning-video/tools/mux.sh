#!/usr/bin/env bash
# Concatenate rendered segments, attach the synthesized score, and encode the deliverable.
#   bash tools/mux.sh episodes   |   bash tools/mux.sh opening
set -euo pipefail
cd "$(dirname "$0")/.."
FILM="${1:-episodes}"
OUT="out/$FILM"
case "$FILM" in
  episodes) DST="dist/neon_genesis_gradient_descent_episodes.mp4"
            FRAMES="eq(n\,249)+eq(n\,684)+eq(n\,1395)+eq(n\,1845)+eq(n\,2672)+eq(n\,3288)+eq(n\,3480)+eq(n\,3780)+eq(n\,4245)" ;;
  opening)  DST="dist/neon_genesis_gradient_descent_opening.mp4"
            FRAMES="eq(n\,150)+eq(n\,510)+eq(n\,630)+eq(n\,1030)+eq(n\,1640)+eq(n\,1800)+eq(n\,2010)+eq(n\,2310)+eq(n\,2520)" ;;
  *) echo "unknown film: $FILM"; exit 1 ;;
esac
mkdir -p dist
ffmpeg -y -loglevel error -f concat -safe 0 -i "$OUT/segments/list.txt" -c copy "$OUT/master_video.mp4"
# two-pass ABR keeps each file well under GitHub's 100 MB limit (~3.8 Mb/s video + 256 kb/s AAC)
ffmpeg -y -loglevel error -i "$OUT/master_video.mp4" -c:v libx264 -preset slow -b:v 3800k -pass 1 -passlogfile "$OUT/x264" -an -f mp4 /dev/null
ffmpeg -y -loglevel error -i "$OUT/master_video.mp4" -i "$OUT/score.wav" -map 0:v -map 1:a \
  -c:v libx264 -preset slow -b:v 3800k -pass 2 -passlogfile "$OUT/x264" -pix_fmt yuv420p \
  -c:a aac -b:a 256k -shortest -movflags +faststart "$DST"
# contact sheet of key frames for the README
ffmpeg -y -loglevel error -i "$DST" -vf "select='$FRAMES',scale=640:-1,tile=3x3:padding=6:color=black" \
  -frames:v 1 -q:v 3 "dist/contact_sheet_${FILM}.jpg"
ls -la dist/
