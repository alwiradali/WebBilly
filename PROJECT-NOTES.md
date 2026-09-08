# Billy Digitals — project notes

Static marketing + portfolio site. **Vanilla HTML + CSS + JS**, no framework,
no build step. Served as static assets on **Cloudflare Workers** (`worker.js`
adds only `/api/quote` and `/api/send-review`). Clean URLs: a root file
`foo.html` is served at `/foo`; templates at `/templates/<name>`.

Brand palette: `--bg:#060b1a`, `--text:#eaf2ff`, accents `--c1:#2b7fff` /
`--c2:#38bdf8` / `--c3:#22d3ee`. Fonts: Space Grotesk (display), Inter (body),
Playfair Display (serif). Keep client-demo pages `noindex`.

## Scroll effects / animations — use the global toolkit
When asked to add scroll effects or animations, use the **`data-fx` system** in
`assets/css/scroll-fx.css` + `assets/js/scroll-fx.js` (loaded globally). Tag
elements with `data-fx="reveal|stagger|text|parallax|pin|horizontal|progressbar"`.
Full reference: `docs/scroll-fx.md`. Do not hand-roll per-page one-offs unless
the toolkit genuinely can't express the effect.

## billy360 (the 360° tours) — run the tests before you push
`node scripts/billy360-test.js` (add `--only=<demo|public|embed|devices|engine|office|data>`)
and `node scripts/billy360-api.mjs --base=http://localhost:<port>`. Both need a
static server and, for the office and API sections, `wrangler dev`; the scripts
print the command to start whichever is missing. Reference: `docs/billy360.md`.

## Deploy workflow (branch → main, static site goes live on push)
Stamp the build before committing, so the deployed site can say which tree it
is running, then push and check that it actually went live:
```
git add -A && node scripts/stamp.mjs && git add version.json
git commit ...
git push -u origin <branch>
git checkout main -q && git merge --ff-only <branch> -q && git push origin main
git checkout <branch> -q
node scripts/deploy-verify.mjs          # after Cloudflare finishes the build
```
`node scripts/stamp.mjs --check` fails if `version.json` is stale.
`deploy-verify.mjs` compares the live bytes with this working copy and exits
non-zero on an older build — billydigitals.com has twice served a month-old
deployment while Workers Builds reported success, and nothing else catches it.
Commit messages end with the required attribution and session trailers.
