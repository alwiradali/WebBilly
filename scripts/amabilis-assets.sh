#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Baked with Amabilis — media build.
#
# Source of truth: the five vertical clips the baker supplied (TikTok exports,
# 576x1024 h264 + aac). This script turns them into the web assets the site
# ships: muted, faststart MP4 loops with poster frames, plus the editorial
# stills used across the showcase and gallery.
#
# Every frame carries the creator's TikTok handle in one of two slots, which
# cross-fade as the clip runs:
#     A  left  — roughly x 0-255
#     B  right — roughly x 300-576
# The mark's horizontal extent is bounded even though its vertical position
# drifts, so each still below is cropped to the clear column: slot-A frames are
# cut from x 260 rightwards, slot-B frames from x 0 to about x 330. That leaves
# tall, watermark-free portraits with no retouching — `delogo` smears badly over
# buttercream, so nothing is painted out.
#
# The clips themselves keep the mark; the site frames them as reels, where a
# creator watermark belongs.
#
# Usage:  FF=<ffmpeg> SRC=<folder of the five mp4s> bash scripts/amabilis-assets.sh
# ---------------------------------------------------------------------------
set -euo pipefail

FF="${FF:-ffmpeg}"
SRC="${SRC:?set SRC to the folder holding the five source mp4s}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/assets/amabilis"
mkdir -p "$OUT/cakes" "$OUT/video"

V1=3b2c9085-WhatsApp_Video_20260820_at_6.48.45_PM.mp4   # pink heritage "Twenty Three"
V2=471c63d4-WhatsApp_Video_20260820_at_6.48.04_PM.mp4   # merlot + gold satin
V3=7865e116-WhatsApp_Video_20260820_at_6.48.43_PM.mp4   # blush + fresh florals
V4=a44a91d9-WhatsApp_Video_20260820_at_6.48.42_PM.mp4   # sculpted Lamborghini
V5=b8dc8f30-WhatsApp_Video_20260820_at_6.48.46_PM.mp4   # midnight portrait

# slug | source | timestamp | crop w:h:x:y
STILLS=$(cat <<EOF
heirloom|$V1|8.3|330:620:0:280
heirloom-detail|$V1|4.2|316:620:260:280
merlot|$V2|1.4|316:560:260:170
merlot-detail|$V2|6.4|300:560:45:300
bloom|$V3|5.4|330:620:0:300
bloom-detail|$V3|2.6|316:620:260:230
velocity|$V4|1.2|316:620:260:250
velocity-detail|$V4|2.4|316:620:260:250
midnight|$V5|3.5|316:620:260:270
midnight-detail|$V5|2.0|316:620:260:270
EOF
)

GRADE='eq=saturation=1.05:contrast=1.03:gamma=1.01'

# Macro texture crops for the craft sequence — buttercream, piping, pearls.
# Small windows, so they are upscaled harder and sharpened a little more.
# slug | source | timestamp | crop w:h:x:y
TEXTURES=$(cat <<EOF
texture-build|$V3|5.4|200:200:70:640
texture-pipe|$V5|3.5|200:200:330:560
texture-finish|$V2|1.4|200:200:330:300
EOF
)

echo "→ stills"
while IFS='|' read -r slug file ts crop; do
  [ -z "$slug" ] && continue
  # 2x lanczos + gentle unsharp so a 576-wide source holds up in a large frame
  "$FF" -nostdin -v error -ss "$ts" -i "$SRC/$file" -frames:v 1 \
    -vf "crop=$crop,scale=iw*2:ih*2:flags=lanczos,unsharp=5:5:0.5:5:5:0.0,$GRADE" \
    -q:v 88 "$OUT/cakes/$slug.webp" -y
  "$FF" -nostdin -v error -ss "$ts" -i "$SRC/$file" -frames:v 1 \
    -vf "crop=$crop,scale=iw*1.15:ih*1.15:flags=lanczos,$GRADE" \
    -q:v 80 "$OUT/cakes/$slug-sm.webp" -y
  echo "   $slug"
done <<< "$STILLS"

# slug | source | poster timestamp (frame is shown behind the reel before play)
CLIPS=$(cat <<EOF
heirloom|$V1|8.3
merlot|$V2|6.4
bloom|$V3|1.2
velocity|$V4|7.4
midnight|$V5|10.4
EOF
)

echo "→ textures"
while IFS='|' read -r slug file ts crop; do
  [ -z "$slug" ] && continue
  "$FF" -nostdin -v error -ss "$ts" -i "$SRC/$file" -frames:v 1 \
    -vf "crop=$crop,scale=iw*3.2:ih*3.2:flags=lanczos,unsharp=5:5:0.65:5:5:0.0,$GRADE" \
    -q:v 86 "$OUT/cakes/$slug.webp" -y
  echo "   $slug"
done <<< "$TEXTURES"

echo "→ reels"
while IFS='|' read -r slug file ts; do
  [ -z "$slug" ] && continue
  "$FF" -nostdin -v error -i "$SRC/$file" -an \
    -vf "scale=540:960:flags=lanczos,$GRADE" \
    -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 30 -preset slow \
    -movflags +faststart -g 60 "$OUT/video/$slug.mp4" -y
  # VP9 alongside H.264: smaller, and it covers builds without proprietary codecs
  "$FF" -nostdin -v error -i "$SRC/$file" -an \
    -vf "scale=540:960:flags=lanczos,$GRADE" \
    -c:v libvpx-vp9 -crf 48 -b:v 0 -deadline good -cpu-used 4 -row-mt 1 \
    -g 60 "$OUT/video/$slug.webm" -y
  "$FF" -nostdin -v error -ss "$ts" -i "$SRC/$file" -frames:v 1 \
    -vf "scale=540:960:flags=lanczos,$GRADE" -q:v 78 "$OUT/video/$slug-poster.webp" -y
  echo "   $slug"
done <<< "$CLIPS"

echo "done → $OUT"
