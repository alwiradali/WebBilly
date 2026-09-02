# Megacity Studio — runbook and API contract

The back office for Megacity Properties. It complements 10ninety (which stays
the office's system of record for tenancies, applicants and portal feeds) with
the things 10ninety cannot do: a 360° tour studio with real storage, a website
fed by the agency's data, site content and SEO pages, analytics with consent,
and an enquiry inbox. Everything runs inside the existing Cloudflare Worker.

```
templates/megacity-studio.html      the app shell (noindex; no Lenis/GSAP)
templates/megacity-studio.css       skyline tokens, denser scale
templates/megacity-studio.js        hash router + screens
templates/megacity-studio-api.js    fetch façade (window.MCStudioAPI)
templates/megacity-intake.js        image intake (resize, panorama detect, quality notes)
worker/studio/router.js             /api/studio/*, /api/public/*, /media/*, rendered pages
worker/studio/{db,auth,listings,media,settings,email,options}.js
migrations/megacity/0001_init.sql   D1 schema
wrangler.dev.toml + .dev.vars       local-only config (Miniflare D1 + R2)
scripts/check-wrangler.mjs          deploy guard against placeholder ids
scripts/megacity-seed.mjs           builds templates/megacity-seed.json from the 5 hand-built pages
```

## One-time setup (Billy, in this order)

1. Cloudflare dashboard → R2 → enable R2 (a payment card is required even for the free 10 GB tier). Then:
   `npx wrangler r2 bucket create megacity-media`
2. `npx wrangler d1 create megacity` → copy the `database_id` it prints.
3. In `wrangler.toml`, paste the id into the `[[d1_databases]]` block and uncomment the D1 and R2 blocks. **Commit that together with the code.** A placeholder id rejects the whole deploy (it happened before with M2L). `node scripts/check-wrangler.mjs` refuses a placeholder; set it as the Workers Builds build command if you want the safety net.
4. `npx wrangler d1 migrations apply megacity --remote`
5. Secrets (`npx wrangler secret put NAME`):
   - `OFFICE_SETUP_TOKEN` — a one-off random string; used once to create the owner account, then `npx wrangler secret delete OFFICE_SETUP_TOKEN`
   - `ANTHROPIC_API_KEY` — for the AI features (Phase 4); optional until then
   - `TENNINETY_API_KEY` — when Walid provides it (Phase 3)
   - `RESEND_API_KEY` already exists (invites and resets are emailed through it)
6. Push to `main`. Open `https://billydigitals.com/templates/megacity-studio`, choose **Create the owner account**, paste the setup token, done.
7. Workers Paid is recommended: password hashing (PBKDF2, 100 000 rounds) exceeds the Free plan's 10 ms CPU budget. On Free, set the var `PBKDF2_ITERS = "20000"` in `wrangler.toml` `[vars]`.

Until D1 is bound the Studio opens in "not connected" mode: it shows the setup checklist and every API answers `503 {connected:false}`. Nothing else on the site changes.

## Local development

```
printf 'OFFICE_SETUP_TOKEN=setup123\n' > .dev.vars
npx wrangler@4 d1 migrations apply megacity --local --config wrangler.dev.toml
npx wrangler@4 dev --local --config wrangler.dev.toml --port 8787
```
Then `http://localhost:8787/templates/megacity-studio`.

## Conventions

- Cookie `mc_studio` — `HttpOnly; Secure; SameSite=Lax; Path=/`, 14-day sliding session; the cookie carries a random secret whose SHA-256 is stored in the `sessions` table (no signing key to manage).
- Every non-GET call to `/api/studio/*` must send the header `X-Studio: 1` and pass a strict same-origin check (`Origin` or `Sec-Fetch-Site: same-origin`).
- Responses are JSON. Errors: `{error:"message"}` with 400/401/403/404/409/413/429/503.
- Field names are camelCase over the wire, snake_case in the database.
- Empty means absent: a field that is `null`/`""` is never rendered on the public site. There is no "N/A" anywhere.
- Owner-only routes are marked (O). Staff can do everything else.

## API

### Auth
| Route | Body | Response |
|---|---|---|
| `POST /api/studio/auth/bootstrap` | `{setupToken, email, name, password}` | `{ok, user}` + cookie. Only while `users` is empty. |
| `POST /api/studio/auth/login` | `{email, password}` | `{ok, user}` + cookie; 401 on failure; 429 after 10 tries / 15 min |
| `POST /api/studio/auth/logout` | – | `{ok}` and clears the cookie |
| `GET /api/studio/auth/me` | – | `{ok, user:{id,name,email,role}, features:{ai,connected}, setup:{needsOwner}}`; 401 when signed out (still carries `setup` and `connected`) |
| `POST /api/studio/auth/forgot` | `{email}` | always `{ok}`; emails a reset link if the account exists |
| `POST /api/studio/auth/reset` | `{token, password}` | `{ok}` |
| `POST /api/studio/auth/change-password` | `{current, next}` | `{ok}` |
| `POST /api/studio/auth/accept-invite` | `{token, name, password}` | `{ok, user}` + cookie |

Password rules: at least 10 characters, not in the small denylist. Links in emails: `/templates/megacity-studio#/reset/<token>` and `#/accept/<token>`, valid 48 h, single use.

### Team
| Route | Body | Response |
|---|---|---|
| `GET /api/studio/team` | – | `{users:[{id,name,email,role,disabled,lastLoginAt,createdAt}], invites:[{email,role,expiresAt,createdAt}]}` |
| `POST /api/studio/team/invite` (O) | `{email, role}` | `{ok}` (emails the invite) |
| `POST /api/studio/team/invite/resend` (O) | `{email}` | `{ok}` |
| `PATCH /api/studio/team/:id` (O) | `{role?, disabled?, name?}` | `{ok, user}` — cannot disable the last owner |

### Options and settings
| Route | Response |
|---|---|
| `GET /api/studio/options` | `{type:[{value,label}], letType, furnishing, availability, bills, minTerm, councilTaxBand, epcRating, pets, parkingSpaces, area, bathroom, reception, kitchen, garden, driveway, status, mediaRole, tourRoom, enquirySource}` |
| `GET /api/studio/settings` | `{settings:{brand:{name,phone,whatsapp,email,address}, notifyEmails:[], links10ninety:{maintenance,apply,registerTenant,registerLandlord}, tourGateScore, ga4Id, metaPixelId, gscVerification, consentText}}` |
| `PUT /api/studio/settings` | body is a partial object of the same keys; `ga4Id/metaPixelId/gscVerification/notifyEmails` are (O). Returns `{ok, settings}` |

### Listings
`GET /api/studio/listings?status=&area=&q=&sort=updated|rent|title&bin=1` → `{items:[Summary], counts:{draft,live,let_agreed,let,withdrawn,bin}}`

Summary: `{id, source, ref, status, hidden, title, area, town, rentPcm, bedrooms, bathrooms, type, cover:{thumb}|null, mediaCount, tour:{status,health}|null, updatedAt, publishedAt}`

| Route | Body | Response |
|---|---|---|
| `POST /api/studio/listings` | `{title, id?, ...any Listing fields}` | `Listing` (201). `id` is derived from the title when absent and made unique. |
| `GET /api/studio/listings/:id` | – | `Listing` |
| `PATCH /api/studio/listings/:id` | partial Listing + `updatedAt` (the value last read) | `Listing`; 409 `{error, listing}` if someone saved since |
| `DELETE /api/studio/listings/:id` | – | `{ok}` (moves to the Bin); `?hard=1` (O) deletes for good with its media |
| `POST /api/studio/listings/:id/restore` | – | `Listing` |
| `POST /api/studio/listings/:id/duplicate` | – | `Listing` (copy without media, status draft) |
| `POST /api/studio/listings/:id/publish` | – | `{ok:true, listing}` or `{ok:false, problems:[string]}` |
| `POST /api/studio/listings/:id/unpublish` | – | `{ok, listing}` |
| `POST /api/studio/listings/:id/status` | `{status}` | `{ok, listing}` |
| `PUT /api/studio/listings/:id/media/order` | `{ids:[mediaId...]}` | `{ok}` |
| `POST /api/studio/import/legacy` | `{listings:[Listing with id]}` | `{ok, imported:n}` (upsert by id; media must already be uploaded with those listing ids) |

Listing (full shape, all optional except `id`, `title`, `status`):
```json
{
  "id": "ladywell-point", "source": "manual", "externalId": null, "ref": "RL0140",
  "status": "live", "hidden": false,
  "title": "2 bed apartment, Ladywell Point, Salford",
  "headline": "Two doubles a short walk from Ladywell Metrolink",
  "type": "apartment", "letType": "whole", "furnishing": "furnished",
  "rentPcm": 1250, "deposit": 1250, "bills": "excluded", "billsNote": null,
  "availability": "available_now", "availableFrom": null, "minTerm": "12",
  "councilTaxBand": "B", "epcRating": null,
  "bedrooms": 2,
  "home": {
    "bathrooms": [{"subtype": "bath_shower_over"}, {"subtype": "en_suite"}],
    "receptions": [{"subtype": "open_plan"}],
    "kitchen": {"subtype": "fitted_integrated"},
    "garden": {"subtype": "balcony"},
    "driveway": null
  },
  "parkingSpaces": 0, "parkingNote": "Free on-street parking on Pilgrims Way",
  "pets": null, "hmoLicensed": false, "floorAreaSqft": null,
  "address": {"line1": "Ladywell Point", "line2": "Pilgrims Way", "town": "Salford", "postcode": "", "area": "salford", "lat": null, "lng": null},
  "summary": "…", "description": "Paragraph one.\n\nParagraph two.", "features": ["Two double bedrooms"],
  "coverMediaId": "m_abc", "seoTitle": null, "seoDescription": null,
  "media": [Media], "tour": null,
  "syncedAt": null, "publishedAt": "2026-09-10T09:12:00Z",
  "createdAt": "…", "updatedAt": "…", "updatedBy": "u_1"
}
```
`home.bathrooms` and `home.receptions` are arrays (one entry per room, each with a `subtype`); `kitchen`, `garden`, `driveway` are single objects or `null`. The server derives the `bathrooms` and `receptions` counts.

Media: `{id, kind:"photo|pano|video|pdf", role, roomLabel, url, thumb, orig, pano, mime, width, height, bytes, alt, caption, sort, isPano, aiLabel}`; `url` is the 1600-px derivative for photos (the original for video/pdf).

### Media
| Route | Body | Response |
|---|---|---|
| `POST /api/studio/media` | multipart: `meta` (JSON: `{listingId, kind, role, roomLabel, alt, width, height, phash, luma, sharp, isPano, filename}`), files `orig`, `large`, `thumb`, optional `pano` | `Media` (201) |
| `PUT /api/studio/media/stream?listingId=&kind=video|pdf&role=&filename=` | raw file body (`Content-Type` of the file) | `Media` (201). 60 MB cap on the client; 100 MB Worker limit |
| `PATCH /api/studio/media/:id` | `{alt?, caption?, roomLabel?, role?}` | `Media` |
| `DELETE /api/studio/media/:id` | – | `{ok}` (removes the R2 objects) |
| `GET /media/<key>` | – | the object, `Cache-Control: public, max-age=31536000, immutable` |

R2 keys: `l/<listingId>/<mediaId>/orig.<ext>`, `w1600.jpg`, `w480.jpg`, `pano4096.jpg`. Allowed types: `image/jpeg|png|webp|gif|avif`, `video/mp4|webm`, `application/pdf`. HEIC cannot be decoded by Chrome/Firefox; the Studio shows the iPhone "Most Compatible" instruction instead of failing silently.

### 360° tours
The tour JSON is billy360's own format (see `docs/billy360.md`). One draft and one live copy per listing.

| Route | Body | Response |
|---|---|---|
| `GET /api/studio/tours/:listingId` | – | `{tour, status, version, health, roomCount, liveAt, updatedAt}`; 404 `{canCreate:true}` when none exists |
| `POST /api/studio/tours/:listingId` | `{brand?, agent?}` or `{tour}` | creates the tour — with no `tour` a skeleton is built from the listing (hallway, receptions, kitchen, bedrooms, bathrooms, garden, driveway, doors already linked) |
| `PUT /api/studio/tours/:listingId` | `{tour, version, health}` | `{ok, version}`; 409 if `version` is stale; 413 if the tour still embeds a `data:` image (upload it first) |
| `POST …/publish` | `{health}` | `{ok:true, url}` or `{ok:false, problems}` — needs at least one 360° and `health ≥ settings.tourGateScore` (default 70) |
| `POST …/unpublish` | – | `{ok}` |
| `DELETE /api/studio/tours/:listingId` | – | `{ok}` |
| `POST /api/studio/tours/import` | `{tours:[…], overwrite?}` | `{imported:[ids], skipped:[{id, reason}]}` — for tours saved in a browser before the Studio existed |
| `POST /api/billy360-verify` | `{code}` (ignored) | `{ok:true}` when the Studio cookie is valid — billy360's `admin.verifyUrl` |
| `GET /api/public/tours/:listingId` | – | the live tour JSON (cached 120 s); 404 while draft |
| `GET /api/public/tours` | – | `{items:[{id, title, rentPcm, bedrooms, area, liveAt, roomCount}]}` |

How billy360 uses it (`billy360/store.js`, loaded before `app.js`):
- `/billy360/?site=<id>&office=1` — the Studio: draft from the API, no passcode (the office cookie is the login), saves go through `PUT`, every embedded image is uploaded to R2 first.
- `/billy360/?site=<id>` or `…&embed=1` — visitors: the live tour from the public feed, else the shipped file.
- `/billy360/` — unchanged: browser storage and the demo tours.

The tour link for 10ninety's virtual-tour box is `https://<host>/billy360/?site=<listingId>`; the embed is `<div data-billy360="<listingId>" data-height="16:9"></div><script src="/billy360/embed.js" defer></script>`.

### Dashboard and audit (Phase 1 minimum)
`GET /api/studio/dashboard` → `{counts:{listings:{live,draft,total}, media, tours:{live}}, recent:[{at,action,entity,entityId,user}]}`
`GET /api/studio/audit?limit=50` → `{items:[…]}`

## Unbound behaviour
`officeDb(env)` returns `env.MEGACITY_DB || null`. Without it every studio/public route answers `503 {connected:false, error:"…"}` and the Studio shows the setup checklist. Rendered public pages (Phase 3) fall back to the static files with `X-MC-Render: static`.
