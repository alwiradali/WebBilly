#!/usr/bin/env bash
# Refresh Lynsey's product list and publish it.
#
# Run this after she adds or changes a product in Payhip. It takes about
# fifteen seconds and you can leave it alone.
#
# WHY THIS IS A SCRIPT AND NOT AUTOMATIC
#
# Payhip sits behind Cloudflare, and Cloudflare refuses requests from
# datacentre networks. Not just some — all of them, every way we tried:
#
#   Cloudflare Workers      403 "Just a moment..."   (her own site's server)
#   GitHub Actions, curl    403, every header combination, the API included
#   GitHub Actions, Chrome  403, still challenged after nine seconds
#
# So no server can read her shop, which means no server can notice a new
# product. An ordinary home or office connection is not blocked, which is why
# this runs on your machine. Your computer fetches the list; GitHub does the
# rest by itself the moment the snapshot is pushed.
#
#   ./scripts/mm-refresh-shop.sh
#
# Nothing happens if her shop has not changed.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Reading her Payhip shop..."
out=$(python3 scripts/build-mm.py molecularmiracleschemistrytuition.co.uk 2>&1) || {
  echo "$out"; echo "Build failed — nothing was changed."; exit 1; }
echo "$out" | sed 's/^/  /'

if echo "$out" | grep -q 'could not reach the shop'; then
  echo
  echo "Could not reach Payhip from this machine either."
  echo "If you are on a VPN or a work network, turn it off and try again."
  exit 1
fi

if git diff --quiet -- scripts/mm-shop-snapshot.json; then
  echo
  echo "Her shop has not changed. Nothing to publish."
  exit 0
fi

added=$(python3 - <<'PY'
import json, subprocess
old = json.loads(subprocess.run(['git','show','HEAD:scripts/mm-shop-snapshot.json'],
                                capture_output=True, text=True).stdout or '[]')
new = json.load(open('scripts/mm-shop-snapshot.json'))
name = lambda p: p.get('name','')
gone = [name(p) for p in old if name(p) not in {name(q) for q in new}]
fresh = [name(p) for p in new if name(p) not in {name(q) for q in old}]
for n in fresh: print('  + ' + n[:70])
for n in gone:  print('  - ' + n[:70])
print('%d product(s) now live' % len(new))
PY
)
echo; echo "$added"

# The covers come down with the products, and both have to be committed or CI
# ships product cards pointing at payhip.com images that do not load. Adding
# only the snapshot left eleven covers untracked once already.
git add scripts/mm-shop-snapshot.json assets/mm/shop
git commit -q -m "Molecular Miracles: refresh the shop snapshot

Run from scripts/mm-refresh-shop.sh. Payhip refuses datacentre networks, so
the product list cannot be read by any server — not her Cloudflare Worker,
not GitHub's runners, not even headless Chrome on one. It is fetched from an
ordinary connection and committed here; the deploy workflow does the rest."

branch=$(git rev-parse --abbrev-ref HEAD)
echo
echo "Pushing..."
git push -u origin "$branch"
echo
if [ "$branch" = "main" ]; then
  echo "Done. Her site updates in about a minute:"
  echo "  https://github.com/alwiradali/WebBilly/actions"
else
  echo "Pushed to $branch. Merge it into main to publish."
fi
