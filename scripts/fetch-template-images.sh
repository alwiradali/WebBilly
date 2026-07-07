#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Billy Digitals — self-host the template photography.
#
# The sample templates currently hotlink their images from higgsfield's CDN.
# This script downloads every one of those images into the repo and rewrites
# the templates to point at the local copies, so the site no longer depends
# on an external CDN staying up.
#
# Run it once from the repo root:
#     bash scripts/fetch-template-images.sh
# then review `git status` and commit the new files + edits.
#
# Safe to re-run: images already downloaded are skipped, and the rewrite is
# idempotent (local paths are left untouched).
# ---------------------------------------------------------------------------
set -euo pipefail

# Move to the repo root (parent of this script's directory) regardless of cwd.
cd "$(dirname "$0")/.."

CDN_HOST="d8j0ntlcm91z4.cloudfront.net"
IMG_DIR="templates/assets/img"
mkdir -p "$IMG_DIR"

echo "Scanning templates for hotlinked images…"
# Every CDN image URL referenced in the templates (unique).
mapfile -t URLS < <(grep -rhoE "https://${CDN_HOST}/[^\"']+\.webp" templates/*.html | sort -u)

if [ "${#URLS[@]}" -eq 0 ]; then
  echo "No CDN-hosted images found — templates may already be self-hosted. Nothing to do."
  exit 0
fi
echo "Found ${#URLS[@]} unique images."

# --- 1. Download -----------------------------------------------------------
downloaded=0
for url in "${URLS[@]}"; do
  fname="$(basename "$url")"
  dest="$IMG_DIR/$fname"
  if [ -f "$dest" ]; then
    continue
  fi
  echo "  ↓ $fname"
  if ! curl -fsSL "$url" -o "$dest"; then
    echo "  ! failed to download $url" >&2
    rm -f "$dest"
    exit 1
  fi
  downloaded=$((downloaded + 1))
done
echo "Downloaded $downloaded new image(s) into $IMG_DIR."

# --- 2. Rewrite the templates ---------------------------------------------
# HTML lives in templates/, images in templates/assets/img/, so the relative
# src is assets/img/<file>. Replace any CDN .webp URL with its local path.
echo "Rewriting templates to use local paths…"
for html in templates/*.html; do
  perl -0pi -e "s{https://${CDN_HOST}/[^\"']*/([^\"'/]+\.webp)}{assets/img/\$1}g" "$html"
done

remaining="$(grep -rlE "https://${CDN_HOST}/" templates/*.html || true)"
if [ -n "$remaining" ]; then
  echo "! Some CDN links remain in: $remaining" >&2
else
  echo "All templates now reference local images under $IMG_DIR."
fi

echo
echo "Done. Next steps:"
echo "  git add templates/assets/img templates/*.html"
echo "  git commit -m 'Self-host template photography'"
