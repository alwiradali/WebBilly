#!/usr/bin/env bash
# Megacity go-live check: run against the live domain after DNS moves (or
# earlier against the Cloudflare edge with --resolve), and against a local
# wrangler dev with a Host header. Every old address must land in one hop.
#   scripts/megacity-golive-check.sh                                   # https://www.megacityproperties.co.uk
#   scripts/megacity-golive-check.sh https://www.megacityproperties.co.uk --resolve www.megacityproperties.co.uk:443:<cloudflare ip>
#   scripts/megacity-golive-check.sh http://localhost:8787 --host www.megacityproperties.co.uk
set -u
BASE=${1:-https://www.megacityproperties.co.uk}; shift || true
EXTRA=(); HOST=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --resolve) EXTRA+=(--resolve "$2"); shift 2 ;;
    --host) HOST="$2"; shift 2 ;;
    *) shift ;;
  esac
done
[[ -n "$HOST" ]] && EXTRA+=(-H "Host: $HOST")
CANON="https://${HOST:-${BASE#*://}}"; CANON=${CANON%%:*}; CANON="https://${CANON#https://}"
CANON="https://$( [[ -n "$HOST" ]] && echo "$HOST" || echo "${BASE#*://}" | cut -d: -f1 )"
fail=0
c()   { curl -sS -m 25 "${EXTRA[@]}" "$@"; }
st()  { c -o /dev/null -w '%{http_code} %{redirect_url}' "$1"; }
want(){ local got="$1" exp="$2" what="$3"; got="${got/http:\/\//https://}"; if [[ "$got" == $exp ]]; then echo "ok   $what -> $got"; else echo "FAIL $what -> got '$got' want '$exp'"; fail=1; fi; }
has() { local what="$1" pat="$2" url="$3"; c "$url" > /tmp/mc_body.$$; if grep -q -- "$pat" /tmp/mc_body.$$; then echo "ok   $what has $pat"; else echo "FAIL $what lacks $pat"; fail=1; fi; }
lacks(){ local what="$1" pat="$2" url="$3"; c "$url" > /tmp/mc_body.$$; if grep -q -- "$pat" /tmp/mc_body.$$; then echo "FAIL $what has $pat"; fail=1; else echo "ok   $what lacks $pat"; fi; }
hdr() { local what="$1" pat="$2" url="$3"; if c -D - -o /dev/null "$url" | tr -d '\r' | grep -qi -- "$pat"; then echo "ok   $what header $pat"; else echo "FAIL $what header $pat"; fail=1; fi; }
nohdr(){ local what="$1" pat="$2" url="$3"; if c -D - -o /dev/null "$url" | tr -d '\r' | grep -qi -- "$pat"; then echo "FAIL $what still sends header $pat"; fail=1; else echo "ok   $what has no $pat header"; fi; }

echo "== host"
want "$(st "$BASE/landlords/")" "301 $CANON/landlords" "trailing slash"
want "$(st "$BASE/Landlords")" "301 $CANON/landlords" "uppercase"
echo "== old addresses (one hop each)"
while read -r p code to; do want "$(st "$BASE$p")" "$code $CANON$to" "$p"; done <<'T'
/lettings/ 301 /lettings
/properties 301 /lettings
/buyers/ 301 /lettings
/buyers/register/ 301 /lettings
/commercial/lettings/ 301 /lettings
/free-valuation/ 301 /valuation
/sales/ 301 /valuation
/vendors/register/ 301 /valuation
/commercial/sales/ 301 /valuation
/register/commercial/ 301 /valuation
/blog/ 301 /journal
/testimonials/ 301 /about-us
/register/ 301 /tenants#register
/tenants/register/ 301 /tenants#register
/landlords/register/ 301 /landlords#register
/privacy 301 /privacy-policy
/property/225/ 301 /let/ladywell-point
/property/225/2-bed-apartment-to-let-apartment-ladywell-point-pilgrims-way-salford/ 301 /let/ladywell-point
/property/226/2-bed-apartment-to-let-apartment--denmark-road-manchester/ 301 /let/denmark-road
/property/102/1-bed-double-room-to-let-room-7/ 301 /let/room-7
/property/108/1-bed-double-room-to-let-room-3/ 301 /let/room-3
/property/110/8-bed-double-room-to-let-room-5/ 301 /let/room-5
/property/9999/ 301 /lettings
/property/goulden-street-salford-manchester/ 301 /lettings
/property/default.asp 301 /lettings
/templates/megacity-skyline 301 /
/templates/megacity-let-room-3 301 /let/room-3
/templates/megacity-studio 301 /studio
/templates/megacity-sitemap.xml 301 /sitemap.xml
/index.html 301 /
T
echo "== pages"
for p in / /lettings /landlords /tenants /about-us /contact-us /valuation /journal /tenant-find /rent-collection /fully-managed /switch /hmo /maintenance /compliance /tools /privacy-policy /terms /tenant-application-form /let/denmark-road /let/ladywell-point /studio; do want "$(st "$BASE$p")" "200 " "GET $p"; done
echo "== markup"
lacks "/" 'name="robots"' "$BASE/"
has "/" "<link rel=\"canonical\" href=\"$CANON/\">" "$BASE/"
has "/" 'Letting Agents Manchester' "$BASE/"
has "/" '"@type":"RealEstateAgent"' "$BASE/"
has "/" 'sameAs' "$BASE/"
lacks "/" 'href="megacity-' "$BASE/"
lacks "/" 'src="assets/' "$BASE/"
lacks "/" 'billydigitals.com/templates' "$BASE/"
has "/" 'href="/lettings"' "$BASE/"
has "/landlords" 'href="/tenants#register"' "$BASE/landlords"
has "/lettings" 'href="/let/' "$BASE/lettings"
has "/let/room-3" "rel=\"canonical\" href=\"$CANON/let/room-3\"" "$BASE/let/room-3"
has "/tenants" 'data-register' "$BASE/tenants"
has "/tenant-application-form" 'data-apply' "$BASE/tenant-application-form"
echo "== studio, 404, robots, sitemap, api, assets"
hdr "/studio" 'x-robots-tag: noindex' "$BASE/studio"
has "/studio" 'content="noindex,nofollow"' "$BASE/studio"
want "$(st "$BASE/this-does-not-exist")" "404 " "unknown path"
has "/this-does-not-exist" 'moved on' "$BASE/this-does-not-exist"
want "$(st "$BASE/images/logo.png")" "404 " "/images/logo.png"
want "$(st "$BASE/templates/heatfixmcr")" "404 " "another client's page"
want "$(st "$BASE/api/quote")" "404 " "/api/quote"
want "$(st "$BASE/api/public/listings")" "200 " "/api/public/listings"
has "robots" 'Disallow: /studio' "$BASE/robots.txt"
has "robots" "Sitemap: $CANON/sitemap.xml" "$BASE/robots.txt"
has "sitemap" "<loc>$CANON/</loc>" "$BASE/sitemap.xml"
has "sitemap" "<loc>$CANON/lettings</loc>" "$BASE/sitemap.xml"
has "sitemap" "<loc>$CANON/let/" "$BASE/sitemap.xml"
lacks "sitemap" '/templates/' "$BASE/sitemap.xml"
for a in /templates/megacity-skyline.css /templates/megacity-skyline.js /templates/megacity-urls.js /templates/megacity-consent.js /templates/assets/mcr/logo-nav.png /templates/assets/mcr/hero-wide.jpg /templates/vendor/gsap.min.js /billy360/embed.js /favicon.ico /apple-touch-icon.png; do want "$(st "$BASE$a")" "200 " "asset $a"; done
echo "== 360 tours (G27)"
# The viewer and its embed must be framable by the listing pages, the public
# tour API must answer, and one live tour (the canary — the first in the
# manifest, or MEGACITY_TOUR_CANARY) must open end to end: its JSON, its first
# panorama and thumbnail out of R2, the pretty /tour/<id> link, the head of the
# viewer, and a listing page whose tour box is reserved before embed.js runs
# and whose frame opens on the panorama of the cover room.
want "$(st "$BASE/billy360/")" "200 " "GET /billy360/"
want "$(st "$BASE/billy360/embed.js")" "200 " "GET /billy360/embed.js"
nohdr "/billy360/" 'x-frame-options' "$BASE/billy360/"
hdr "/billy360/" 'content-security-policy: frame-ancestors' "$BASE/billy360/"
has "/billy360/" 'name="robots" content="noindex' "$BASE/billy360/"
want "$(st "$BASE/api/public/tours")" "200 " "/api/public/tours"
CANARY="${MEGACITY_TOUR_CANARY:-$(c "$BASE/api/public/tours" 2>/dev/null | grep -o '"id":"[a-z0-9-]*"' | head -1 | cut -d'"' -f4)}"
if [[ -z "$CANARY" ]]; then
  echo "WARN no live tour to probe yet (publish one in the Studio, or set MEGACITY_TOUR_CANARY=<listing id>)"
else
  echo "     canary: $CANARY"
  want "$(st "$BASE/api/public/tours/$CANARY")" "200 " "/api/public/tours/$CANARY"
  PANO=$(c "$BASE/api/public/tours/$CANARY" | python3 -c 'import json,sys
try:
  t=json.load(sys.stdin); r=[x for x in t.get("rooms",[]) if isinstance(x.get("pano"),str)]
  print(r[0]["pano"] if r else "")
except Exception: print("")' 2>/dev/null)
  if [[ "$PANO" == /media/* ]]; then echo "ok   rooms[0].pano is under /media/ ($PANO)"; else echo "FAIL rooms[0].pano is not a /media/ URL: '$PANO'"; fail=1; fi
  if [[ -n "$PANO" ]]; then
    hdr "first panorama" 'content-type: image/' "$BASE$PANO"
    want "$(st "$BASE$PANO")" "200 " "GET $PANO"
  fi
  # thumb-first: the opening room needs its w480 beside the panorama
  THUMB=$(c "$BASE/api/public/tours/$CANARY" | python3 -c 'import json,sys
try:
  t=json.load(sys.stdin); r=[x for x in t.get("rooms",[]) if isinstance(x.get("thumb"),str)]
  print(r[0]["thumb"] if r else "")
except Exception: print("")' 2>/dev/null)
  if [[ "$THUMB" == /media/* ]]; then echo "ok   rooms[0].thumb is under /media/ ($THUMB)"; else echo "FAIL rooms[0].thumb is not a /media/ URL: '$THUMB'"; fail=1; fi
  want "$(st "$BASE/tour/$CANARY")" "200 " "/tour/$CANARY"
  has "/tour/$CANARY" '360° tour · Megacity Properties' "$BASE/tour/$CANARY"
  has "/tour/$CANARY" 'window.BILLY360_SITE' "$BASE/tour/$CANARY"
  has "/billy360/?site=$CANARY" "rel=\"canonical\" href=\"$CANON/let/$CANARY\"" "$BASE/billy360/?site=$CANARY"
  # the listing page: the frame is asked for by id and opens on the cover room
  has "/let/$CANARY" "data-billy360=\"$CANARY\"" "$BASE/let/$CANARY"
  has "/let/$CANARY" 'data-room="' "$BASE/let/$CANARY"
fi
# the box the frame drops into is reserved by the stylesheet, before embed.js
# runs, so the page never jumps (F80 F225); embed.js pins the iframe into it
# and needs no wrapper of its own.
has "skyline.css" '.pd-tour{position:relative;width:100%;aspect-ratio:16/9;min-height:280px' "$BASE/templates/megacity-skyline.css"
has "skyline.css" '@media (max-width:700px){.pd-tour{min-height:60vh}}' "$BASE/templates/megacity-skyline.css"
lacks "skyline.css" '.pd-tour>div' "$BASE/templates/megacity-skyline.css"
has "embed.js" 'host.style.aspectRatio' "$BASE/billy360/embed.js"
has "embed.js" 'data-room' "$BASE/billy360/embed.js"
lacks "robots" 'Allow: /tour/' "$BASE/robots.txt"
has "robots" 'Disallow: /tour/' "$BASE/robots.txt"
has "robots" 'Disallow: /billy360/' "$BASE/robots.txt"
rm -f /tmp/mc_body.$$
echo; if [[ $fail == 0 ]]; then echo "GO-LIVE CHECK: ALL PASS"; else echo "GO-LIVE CHECK: FAILURES"; fi
exit $fail
