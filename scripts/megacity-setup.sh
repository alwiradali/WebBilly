#!/usr/bin/env bash
# Megacity Studio — one-time Cloudflare setup, in the right order.
#
#   bash scripts/megacity-setup.sh            create the bucket + database, wire wrangler.toml, migrate, set secrets
#   bash scripts/megacity-setup.sh verify     post-deploy checks against the live site
#
# Prerequisites: run from the repository root on a machine where
# `npx wrangler whoami` shows the Billy Digitals Cloudflare account, and R2 has
# been enabled once in the dashboard (it needs a payment card even for the free
# 10 GB tier). Safe to re-run: every step checks before it changes anything.
set -euo pipefail
cd "$(dirname "$0")/.."

BASE="${MEGACITY_BASE:-https://billydigitals.com}"
if [[ "${1:-}" == "verify" ]]; then
  echo "Checking $BASE …"
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/studio/auth/me")
  body=$(curl -s "$BASE/api/studio/auth/me")
  echo " /api/studio/auth/me → $code  $body"
  case "$code" in
    401) echo " ✓ Worker + database connected (401 = not signed in, which is right)";;
    503) echo " ✗ Database not connected yet — bindings missing or not deployed";;
    *)   echo " ✗ Unexpected — if this is HTML, /api/* is not reaching the Worker (run_worker_first)";;
  esac
  curl -s -I "$BASE/templates/megacity-studio" | grep -i "x-robots-tag" && echo " ✓ Studio page is noindex" || echo " ✗ X-Robots-Tag missing on the Studio page"
  curl -s -o /dev/null -w ' /media/does-not-exist → %{http_code} (404 from the Worker is right)\n' "$BASE/media/l/x/m_aaaaaaaaaa/w480.jpg"
  curl -s -o /dev/null -w ' /templates/megacity-let-ladywell-point → %{http_code}\n' "$BASE/templates/megacity-let-ladywell-point"
  curl -s -I "$BASE/templates/megacity-let-ladywell-point" | grep -i "x-mc-render" || true
  exit 0
fi

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1"; exit 1; }; }
need npx; need node; need curl

echo "1/5  R2 bucket megacity-media"
if npx wrangler r2 bucket list 2>/dev/null | grep -q "megacity-media"; then echo "     already exists"
else npx wrangler r2 bucket create megacity-media; fi

echo "2/5  D1 database megacity"
DB_ID=$(npx wrangler d1 list --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const a=JSON.parse(s);const m=a.find(x=>x.name==="megacity");console.log(m?m.uuid:"")}catch{console.log("")}})')
if [[ -z "$DB_ID" ]]; then
  OUT=$(npx wrangler d1 create megacity)
  echo "$OUT"
  DB_ID=$(echo "$OUT" | grep -Eo '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
fi
[[ -n "$DB_ID" ]] || { echo "Could not find the database id. Run 'npx wrangler d1 list' and paste it into wrangler.toml by hand."; exit 1; }
echo "     database_id = $DB_ID"

echo "3/5  wrangler.toml bindings"
if grep -q "^database_id = \"$DB_ID\"" wrangler.toml; then echo "     already wired"
else
  node - "$DB_ID" <<'EOF'
const fs = require("fs"); const id = process.argv[2];
let t = fs.readFileSync("wrangler.toml", "utf8");
const block = /# \[\[d1_databases\]\]\n# binding = "MEGACITY_DB"\n# database_name = "megacity"\n# database_id = "PASTE_REAL_ID_HERE"\n# migrations_dir = "migrations\/megacity"\n#\n# \[\[r2_buckets\]\]\n# binding = "MEDIA"\n# bucket_name = "megacity-media"/;
if (!block.test(t)) { console.error("The commented Megacity blocks were not found in wrangler.toml — edit it by hand."); process.exit(1); }
t = t.replace(block, `[[d1_databases]]\nbinding = "MEGACITY_DB"\ndatabase_name = "megacity"\ndatabase_id = "${id}"\nmigrations_dir = "migrations/megacity"\n\n[[r2_buckets]]\nbinding = "MEDIA"\nbucket_name = "megacity-media"`);
fs.writeFileSync("wrangler.toml", t);
console.log("     wrangler.toml updated");
EOF
fi
node scripts/check-wrangler.mjs

echo "4/5  migrations"
npx wrangler d1 migrations apply megacity --remote

echo "5/5  secrets"
echo "     OFFICE_SETUP_TOKEN — a one-off code you type into the Studio to create the owner account"
TOKEN=$(node -e 'console.log(require("crypto").randomBytes(9).toString("base64url"))')
printf '%s' "$TOKEN" | npx wrangler secret put OFFICE_SETUP_TOKEN
echo "     Your setup token (keep it until the owner account exists):  $TOKEN"
echo
echo "     ANTHROPIC_API_KEY (optional now; needed for the AI buttons). Press Enter to skip."
read -r -p "     paste key: " AK || true
if [[ -n "${AK:-}" ]]; then printf '%s' "$AK" | npx wrangler secret put ANTHROPIC_API_KEY; fi

echo
echo "Done. Now: git add wrangler.toml && git commit -m 'Wire Megacity Studio bindings' && git push  → merge to main."
echo "After the deploy: open $BASE/templates/megacity-studio, choose 'Create the owner account', paste the setup token."
echo "Then: npx wrangler secret delete OFFICE_SETUP_TOKEN"
