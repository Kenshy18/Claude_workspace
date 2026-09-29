#!/usr/bin/env bash
# Side-by-side review: original OP frame (left) vs. your render (right) at the given times.
#   bash opening_v2/shared/compare.sh opening_v2/p1_xxx 1440 1080 "3.0 12.5 20 70.2"
# Writes out/opening_v2/<pattern>/compare.jpg (and individual stills). Reference frames are
# sampled at 4 fps from reference/op_original.mp4; they are for your eyes only.
set -euo pipefail
cd "$(dirname "$0")/../.."
PAT="$1"; W="$2"; H="$3"; TIMES="$4"
NAME=$(basename "$PAT")
OUT="out/opening_v2/$NAME"
node tools/render.mjs --page "$PAT/index.html" --out "$OUT" --w "$W" --h "$H" --stills "$(echo $TIMES | tr ' ' ',')" | grep -v "GL Driver" | tail -2
ARGS=(); FILT=""; i=0
for t in $TIMES; do
  idx=$(python3 -c "print(max(1, round($t*4)+1))")
  ref=$(printf "reference/frames/f_%04d.jpg" "$idx")
  mine=$(printf "$OUT/stills/still_%07.2f.png" "$t")
  ARGS+=(-i "$ref" -i "$mine")
  FILT+="[$((2*i)):v]scale=480:360,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='REF $t':x=6:y=6:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.6[r$i];"
  FILT+="[$((2*i+1)):v]scale=-2:360,pad=640:360:(ow-iw)/2:0:black[m$i];[r$i][m$i]hstack=2[row$i];"
  i=$((i+1))
done
ROWS=""; for ((k=0;k<i;k++)); do ROWS+="[row$k]"; done
ffmpeg -y -v error "${ARGS[@]}" -filter_complex "${FILT}${ROWS}vstack=$i[o]" -map "[o]" -q:v 3 "$OUT/compare.jpg"
echo "wrote $OUT/compare.jpg"
