#!/usr/bin/env bash
# Keep a copy of the old megacityproperties.co.uk before its DNS moves: every
# address in its sitemaps, headers included, into docs/megacity-old-site/.
# Run it BEFORE changing nameservers; afterwards the old host is unreachable.
#   scripts/megacity-capture-old-site.sh
set -u
OUT="$(cd "$(dirname "$0")/.." && pwd)/docs/megacity-old-site"
SITE="https://www.megacityproperties.co.uk"
mkdir -p "$OUT"
echo "capturing $SITE into $OUT"
curl -sS -m 30 "$SITE/sitemap.xml" -o "$OUT/sitemap.xml" || { echo "could not fetch the sitemap index"; exit 1; }
{ echo "$SITE/"; grep -o '<loc>[^<]*</loc>' "$OUT/sitemap.xml" | sed 's/<[^>]*>//g' | while read -r sm; do curl -sS -m 30 "$sm" | grep -o '<loc>[^<]*</loc>' | sed 's/<[^>]*>//g'; done; } | sort -u > "$OUT/urls.txt"
n=0
while read -r u; do
  p=${u#"$SITE"}; p=${p%/}; [[ -z "$p" ]] && p="/index"
  f="$OUT${p}.html"; mkdir -p "$(dirname "$f")"
  curl -sS -m 30 -D "$f.headers" -o "$f" "$u" && n=$((n+1))
done < "$OUT/urls.txt"
echo "$n pages saved; addresses in $OUT/urls.txt"
echo
echo "Now export the DNS records at the current provider (MX, SPF/TXT, DKIM, DMARC, mail/webmail/autodiscover, any others)"
echo "into $OUT/dns-export.txt before the nameservers change. Losing MX means losing info@megacityproperties.co.uk."
