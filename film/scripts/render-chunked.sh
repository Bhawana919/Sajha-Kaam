#!/usr/bin/env bash
# Usage: bash scripts/render-chunked.sh <CompositionId> <out.mp4> [chunkFrames] [concurrency]
# Renders a composition in frame-range chunks (resilient on low-RAM machines), then joins them losslessly.
set -euo pipefail
cd "$(dirname "$0")/.."
ID="$1"; OUT="$2"; CHUNK="${3:-1800}"; CONC="${4:-4}"
BUNDLE="out/bundle-$ID"
rm -rf "$BUNDLE"
# bundle once, so every chunk renders the same code even if src/ changes meanwhile
npx remotion bundle src/index.ts --out-dir="$BUNDLE" --log=error
TOTAL=$(npx remotion compositions "$BUNDLE" 2>/dev/null | awk -v id="$ID" '$1==id {print $4}')
echo "composition $ID: $TOTAL frames"
TMP="out/chunks-$ID"; mkdir -p "$TMP"; : > "$TMP/list.txt"
i=0; start=0
while [ "$start" -lt "$TOTAL" ]; do
  end=$((start + CHUNK - 1)); [ "$end" -ge "$TOTAL" ] && end=$((TOTAL - 1))
  part="$TMP/part$i.mp4"
  if [ ! -s "$part" ]; then
    echo "rendering $start-$end"
    npx remotion render "$BUNDLE" "$ID" "$part" --frames="$start-$end" --concurrency="$CONC" --log=error
  fi
  echo "file 'part$i.mp4'" >> "$TMP/list.txt"
  i=$((i + 1)); start=$((end + 1))
done
ffmpeg -v error -y -f concat -safe 0 -i "$TMP/list.txt" -c copy "$OUT"
echo "DONE $OUT"
