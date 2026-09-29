#!/usr/bin/env bash
# Concatenate rendered segments, attach the synthesized score, and encode the deliverable.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist
ffmpeg -y -loglevel error -f concat -safe 0 -i out/segments/list.txt -c copy out/master_video.mp4
# two-pass ABR keeps the file under GitHub's 100 MB limit (~3.8 Mb/s video + 256 kb/s AAC)
ffmpeg -y -loglevel error -i out/master_video.mp4 -c:v libx264 -preset slow -b:v 3800k -pass 1 -passlogfile out/x264 -an -f mp4 /dev/null
ffmpeg -y -loglevel error -i out/master_video.mp4 -i out/score.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -b:v 3800k -pass 2 -passlogfile out/x264 -pix_fmt yuv420p \
  -c:a aac -b:a 256k -shortest -movflags +faststart dist/neon_genesis_gradient_descent.mp4
ls -la dist/
# contact sheet of key frames for the README
ffmpeg -y -loglevel error -i dist/neon_genesis_gradient_descent.mp4 \
  -vf "select='eq(n\,249)+eq(n\,684)+eq(n\,1395)+eq(n\,1845)+eq(n\,2672)+eq(n\,3288)+eq(n\,3480)+eq(n\,3780)+eq(n\,4245)',scale=640:-1,tile=3x3:padding=6:color=black" \
  -frames:v 1 -q:v 3 dist/contact_sheet.jpg
