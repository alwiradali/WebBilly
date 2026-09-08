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

The short way: enable R2 in the dashboard, then run `bash scripts/megacity-setup.sh` from the repo root. It creates the bucket and database, writes the real id into `wrangler.toml`, applies the migration and sets the secrets, then tells you what to commit. `bash scripts/megacity-setup.sh verify` checks the live site after the deploy. The long way is below.

1. Cloudflare dashboard → R2 → enable R2 (a payment card is required even for the free 10 GB tier). Then:
   `npx wrangler r2 bucket create megacity-media`
2. `npx wrangler d1 create megacity` → copy the `database_id` it prints.
3. In `wrangler.toml`, paste the id into the `[[d1_databases]]` block and uncomment the D1 and R2 blocks. **Commit that together with the code.** A placeholder id rejects the whole deploy (it happened before with M2L). `node scripts/check-wrangler.mjs` refuses a placeholder; set it as the Workers Builds build command if you want the safety net.
4. `npx wrangler d1 migrations apply megacity --remote` — this applies every file in
   `migrations/megacity/`, including `0003_tours_live.sql` (`tours.live_version`, which
   tells the Studio when a live tour has unpublished changes) and
   `0004_media_pano2048.sql` (`media.key_pano2048`, the phone-sized panorama).
   **Apply the migrations before the new Worker goes out**: without those two columns
   every tour read and every media upload fails.
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

- Cookie `__Host-mc_studio` — `HttpOnly; Secure; SameSite=Lax; Path=/`, 14-day sliding session; the cookie carries a random secret whose SHA-256 is stored in the `sessions` table (no signing key to manage).
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

R2 keys: `l/<listingId>/<mediaId>/orig.<ext>`, `w1600.jpg`, `w480.jpg`, `pano4096.jpg`, `pano2048.jpg`. Allowed types: `image/jpeg|png|webp|gif|avif`, `video/mp4|webm`, `application/pdf`. HEIC cannot be decoded by Chrome/Firefox; the Studio shows the iPhone "Most Compatible" instruction instead of failing silently.

### 360° tours
The tour JSON is billy360's own format (see `docs/billy360.md`). One draft and
one live copy per listing. The listing is the source of the facts: title, rent,
bedrooms, EPC and reference are overlaid onto the tour on every read and every
publish, so editing those fields in the tour editor has no effect (they are
read-only there).

| Route | Body | Response |
|---|---|---|
| `GET /api/studio/tours/:listingId` | – | `{tour, status, version, health, roomCount, liveAt, updatedAt, updatedBy, liveVersion, listingLive, gate, publicUrl, embedOrigin}`; 404 `{canCreate:true}` when none exists; 410 `{binned:true}` when the listing is in the Bin |
| `POST /api/studio/tours/:listingId` | `{brand?, agent?}` or `{tour}` | creates the tour — with no `tour` a skeleton is built from the listing (see below) |
| `PUT /api/studio/tours/:listingId` | `{tour, version, health}` | `{ok, version, updatedAt, health, status, liveVersion, listingLive, gate, publicUrl, embedOrigin}`; 409 if `version` is stale; 413 if the tour still embeds a `data:` image or a `data:` URI inside a floor plan (upload it first) |
| `POST …/publish` | `{}` | `{ok, status, health, gate, problems, listingLive, version, liveVersion, liveAt, note, url, publicUrl, embedOrigin}` |
| `POST …/unpublish` | – | `{ok, status:'draft', liveAt:null, …}` |
| `DELETE /api/studio/tours/:listingId` | – | `{ok}` |
| `POST /api/studio/tours/import` | `{tours:[…], overwrite?}` | `{imported:[ids], skipped:[{id, reason}]}` — for tours saved in a browser before the Studio existed |
| `POST /api/billy360-verify` | `{code}` (ignored) | `{ok:true}` when the Studio cookie is valid — billy360's `admin.verifyUrl` |
| `GET /api/public/tours/:listingId` | – | the live tour JSON, `cache-control: public, max-age=0, stale-while-revalidate=60`; 404 `{error, listingUrl}` with `cache-control: no-store` while the tour is draft, the listing is hidden or not live, or the id is unknown |
| `GET /api/public/tours` | – | `{items:[{id, title, rentPcm, bedrooms, area, liveAt, roomCount}]}` |

The publish gate uses the **stored** health score, not the one in the request
body, so the editor's score has to reach the server through a `PUT` before
`/publish` runs (the Studio's Publish button drains the editor's save queue
first). `problems` is empty on success and otherwise names what is missing:
"The tour has no rooms.", "No room has a 360° capture yet.", "The tour has not
been scored yet — open it in the Studio once so it can be checked.", or "The
quality score is N; it needs at least G to go live." `G` is
`settings.tourGateScore` (default 70) and is returned as `gate` on every tour
response, so the Studio never hard-codes it. Publishing writes the refreshed
draft back as well (`project.hidden=false`, agency brand, office contacts,
current listing facts) without bumping `version`, records `live_version`, keeps
the original `live_at` on a re-publish, and purges the cached public JSON for
both the request origin and the canonical host.

How billy360 uses it (`billy360/store.js`, loaded before `app.js`):
- `/billy360/?site=<id>&office=1` — the office editor: the draft from the API, no
  passcode (the Studio cookie is the login), saves go through `PUT`, every
  embedded image is uploaded to R2 first.
- `/billy360/?site=<id>` or `…&embed=1` — visitors: the live tour, or nothing.
- `/tour/<id>` on the client domain — the same viewer served in place; the
  address bar keeps `/tour/<id>`.
- `/billy360/` with no `?site=` — unchanged: browser storage and the demo tours.

**The viewer is fail-closed.** A visitor link for a listing whose tour is still
a draft, whose listing is hidden, not live or unknown gets a card — "This tour
isn't published yet · Ask the office and we will send it over as soon as it is
live." — with a *Back to the listing* button built from the 404's `listingUrl`.
A network failure or a timeout gets "Couldn't load the tour"; an office link for
a binned listing gets "This listing is in the Bin". It never falls back to a
demo property: there is no Charnwood House stand-in and no portfolio grid on a
`?site=` link, and the browser Studio cannot be opened from one.

#### The 360 tab in the Studio (a listing → **360**)

The strip along the top is the whole status of the tour:

| What it shows | When |
|---|---|
| Quality ring with the score, "Quality score · it needs N to go live." | always; "The quality score appears after the first save in the studio." until the tour has been scored once |
| **Draft** pill | the tour has never been published, or it was taken off |
| **Live** pill + "live since <date>" | published |
| "Changes not live — Publish latest changes" | live, and the draft has been saved since (`version > liveVersion`) |
| "Published, but the listing is not live yet, so nobody can see it until the listing goes live." | published while the listing itself is still a draft |
| "Publish first — the link, embed code and QR code show nothing until the tour is live." | draft |
| "Links point at billydigitals.com until the domain moves — re-paste into 10ninety after go-live." | live, while the server's link is still on the demo host |

*Copy tour link for 10ninety*, *Copy embed code* and *Download QR (PNG)* are
disabled while the tour is a draft (and again after *Take it off the listing*) —
the link would show the "not published yet" card. Both copies come from the
server, not from the browser's address bar: `publicUrl` is
`https://www.megacityproperties.co.uk/tour/<id>` on the client domain and
`https://billydigitals.com/billy360/?site=<id>` on the demo host, and the embed
snippet uses the matching `embedOrigin`. That is why the domain note above
matters: a link copied before DNS day points at billydigitals.com, works, but
should be re-pasted into 10ninety after go-live.

On a phone the tab shows the strip plus **Open the tour Studio** — a same-tab
link to `/billy360/?site=<id>&office=1#/studio/rooms`, with Back to return. On a
desktop the editor is framed in the page and **Open full screen** opens the same
address in a new tab.

**Phone preview and print** is the QR card: the QR code of the tour link, the
link in full, and *Download QR (PNG)*. The PNG is built for print — the code
itself is at least 1000 px across, with the listing title above it and the
MEGACITY PROPERTIES wordmark and the link below, roughly 1200 × 1500 px in all
(the toast reports the exact size). It is the same link, so it needs the tour
published first.

**Start again** deletes the tour and builds a fresh skeleton from the listing
after a confirm. Rooms, doors and captures in the tour are lost; 360s uploaded
in the **Media** tab are kept and offered again.

360s uploaded on the Media tab (kind `pano`) are offered to the tour: the Studio
posts them to the editor on load and after every change on that tab, and the
editor lists them under "Or use a 360° already uploaded to this listing".
Picking one points the room at the file that is already in R2 — no second
upload, no waiting — and the tile whose room label matches the room is
highlighted. Deleting a 360 that a tour uses answers 409 and the Media tab shows
the server's reason ("This 360 is used by the tour (room X) — replace it there
first.").

When the database is not bound the tab shows one line — "Tours need the
database" — instead of the strip; the rest of the Studio is unaffected. A
listing in the Bin shows "This listing is in the Bin · Restore it to keep
editing the tour."

#### How long a publish takes to show

Publishing purges the cached tour JSON, and the browser revalidates it on every
load, so the tour link and the QR code show the new version straight away. The
**listing page** that frames the tour is HTML cached for a minute
(`max-age=60, s-maxage=120`) and nothing purges it, so the frame on
`/let/<id>` picks up the change within a minute or so — which is what the
Studio's toast says ("Tour published — the listing page picks it up within a
minute").

#### The skeleton built from a listing

Creating a tour with no JSON builds the rooms the listing says exist, with the
doors already linked:

- Houses, maisonettes and whole-house HMOs get a **Ground Floor** and a **First
  Floor**; anything else gets a single, unnamed floor (a fourth-floor flat is not
  a "ground floor").
- A studio flat — or a listing with no bedrooms — gets one room called
  **Studio**; a room let gets **The room**.
- Bathrooms are named from the listing's own subtypes: Bathroom, Shower room,
  En-suite, WC, Wet room, Shared bathroom, numbered when there is more than one
  of the same name. En-suites open off Bedroom 1, 2, … in order; the other
  bathrooms open off the landing (or the hallway when there is no upstairs).
- Gardens follow the same rule: Garden, Front garden, Shared garden, Communal
  garden, Yard, Balcony, Terrace. A driveway or garage becomes an outside room in
  front of the hallway; a kitchen with a garden gets the door to it.
- A hallway or landing with more than six doors spreads them evenly around the
  room instead of fanning them from one side.
- Every room opens facing its first door, so the way on is never behind the
  visitor.

The panorama for each room is uploaded as `pano4096.jpg` with a `pano2048.jpg`
beside it and a `w480.jpg` thumbnail; phones fetch the 2048 file, tablets and
desktops the 4096 one, and the thumbnail is what appears first. Image originals
(`orig.*`) need the Studio session — they still carry the camera's EXIF.

The tour link for 10ninety's virtual-tour box is `publicUrl` from the 360 tab
(*Copy tour link for 10ninety*); the embed is
`<div data-billy360="<listingId>" data-height="16:9"></div><script src="/billy360/embed.js" defer></script>`,
which the listing pages already carry.

### Dashboard and audit (Phase 1 minimum)
`GET /api/studio/dashboard` → `{counts:{listings:{live,draft,total}, media, tours:{live}}, recent:[{at,action,entity,entityId,user}]}`
`GET /api/studio/audit?limit=50` → `{items:[…]}`

### Enquiries, notifications, events
| Route | Purpose |
|---|---|
| `POST /api/megacity-viewing`, `-contact`, `-maintenance`, `-apply`, `-landlord` | email the office **and** insert an `enquiries` row + a notification. Bodies may carry `listingId` and `attr` (`{utm_source, utm_medium, utm_campaign, referrer, landing}`, captured by the site script) |
**Which inbox each form reaches** — `notifyTo(env, kind)` in
`worker/studio/enquiries.js`. The office runs three Microsoft 365 mailboxes and
each form goes to the team that acts on it:

| Form | Inbox |
|---|---|
| Landlord registration (`/landlords#register`), valuation request | info@ |
| Viewing, tenant registration, tenancy application, 360° tour lead | lettings@ |
| Maintenance and repair reports | management@ |
| General contact form | info@ **and** lettings@, since the sender cannot be told apart |

Settings → Notifications overrides all of it: set any address there and every
form goes to that list instead, from one screen. The contact endpoint carries
three different forms and tells them apart by `topic`, using the same regexes
that decide the enquiry's `source`, so the inbox and the filing can never
disagree. `node scripts/megacity-routing-check.mjs` asserts the whole table
against the real Worker, including the address handed to Resend.

Note the stakes while the database is unbound: `recordEnquiry` writes nothing,
so the email is the only record of an enquiry, and no copy goes anywhere else.

| `POST /api/public/lead` | billy360's "Book a viewing" (`{property, site, name, email, phone, date, message, room, url}`) → enquiry `source:"tour"` + email |
| `POST /api/public/event` | `sendBeacon` body `{name, listingId}` (`listing_view`, `tour_open`, …) or billy360's `{ev, site}`; stored 90 days with a daily-rotating session hash, no cookies |
| `GET /api/studio/enquiries?status=&source=&listingId=` → `{items, counts}`; `GET/PATCH /api/studio/enquiries/:id` (`{status:new|handled|spam, note}`) | the inbox |
| `GET /api/studio/notifications` → `{items, unread}`; `POST /api/studio/notifications/read {ids?}` | the bell |
| `GET /api/studio/dashboard` | also returns `enquiries:{new,last7,bySource,daily}` and `events7` |

### Public pages rendered by the Worker
`/templates/megacity-let-<id>` is rendered from the database for a live listing (header `X-MC-Render: d1`), otherwise the static file is served (`static`). `/templates/megacity-properties` gets its grid and filters from the feed when there is at least one live listing. `/templates/megacity-sitemap.xml` lists the static pages and every live listing. `GET /api/public/listings?area&type&beds&minRent&maxRent&furnishing&pets&sort&view=cards|search` and `GET /api/public/listings/:id` are the read-only feed (cached 120 s).

When a GA4 id, Meta Pixel id or Search Console token is set in Settings → Integrations, the Worker injects `megacity-consent.js` (UK consent banner, Consent Mode v2, nothing loads before "Accept all") and/or the verification meta into every public Megacity page it serves.

### Pages and backlinks
| Route | Body | Response |
|---|---|---|
| `GET /api/studio/pages` | – | `{items:[{id, slug, kind, title, status, publishedAt, updatedAt, url}]}` |
| `POST /api/studio/pages` | `{title, slug?, kind:"area"\|"landing"\|"guide", seoTitle?, seoDescription?, heroMediaId?, blocks?, faq?}` | `Page` (201); reserved addresses (the static page names, `let-…`, `studio…`) are refused |
| `GET/PATCH/DELETE /api/studio/pages/:id` | partial `Page` | `Page` |
| `POST /api/studio/pages/:id/publish`, `/unpublish` | – | `{ok, page}` or `{ok:false, problems}` |
| `GET /templates/megacity-<slug>` | – | the live page, rendered through `templates/megacity-page-template.html` with `WebPage`, `BreadcrumbList` and `FAQPage` JSON-LD |
| `GET/POST /api/studio/backlinks`; `PATCH/DELETE …/:id`; `POST …/:id/check`; `POST /api/studio/backlinks/check-all` | `{sourceUrl, targetPath, anchor, contact, notes, status:"planned"\|"requested"\|"live"\|"lost"}` | the tracker; `check` fetches the source page and looks for a link to the site |

Blocks: `{type:"h2"|"p"|"list"|"cta"|"image", text?, items?, href?, mediaId?, caption?}`. FAQ: `[{q, a}]`.

### AI (Claude, key only in the `ANTHROPIC_API_KEY` secret)
All answer `503 {configured:false}` until the secret exists; the Studio hides the buttons. 60 calls per person per hour; every call is logged in `ai_usage` (`GET /api/studio/ai/usage`). The model writes only from the facts in the record and never writes to the database itself: staff review, then save.

| Route | Body | Response |
|---|---|---|
| `POST /api/studio/ai/listing-copy` | `{listingId, tone:"standard"\|"warm"\|"concise"}` | `{summary, description, features[], seoTitle, seoDescription}` (manual listings only; synced copy lives in 10ninety) |
| `POST /api/studio/ai/classify-room` | `{mediaId}` | `{kind, name, confidence, alt}` — which room a photo shows; also stored as `aiLabel` on the media |
| `POST /api/studio/ai/alt-text` | `{mediaId}` | `{alt}` |
| `POST /api/studio/ai/share-kit` | `{listingId}` | `{headline, facebook, instagram, whatsapp, spareroom, hashtags[], metaDescription, url}` |
| `POST /api/studio/ai/page-draft` | `{kind:"area"\|"landing"\|"guide", area?, brief?}` | `{title, seoTitle, seoDescription, blocks[{type:h2\|p\|list\|cta, text, items}], faq[{q,a}]}` |

Models: `claude-sonnet-5` for writing, `claude-haiku-4-5-20251001` for looking at photos.

## Two hosts, one site (worker/studio/urls.js)

The site has two addresses shapes. On the demo host (billydigitals.com,
localhost) pages live at `/templates/megacity-<slug>`; on the client domain
(any host in `MEGACITY_HOST`) the same files are served at root addresses
(`/`, `/lettings`, `/landlords`, `/let/<id>`, `/studio`) by
`worker/studio/host.js`, which rewrites every relative link on the way out.
`worker/studio/urls.js` is the only place that knows the slug ↔ path table;
`templates/megacity-urls.js` is its generated browser copy (`window.MCUrls`)
used by the site script and the Studio. Regenerate it with
`node scripts/megacity-urls-sync.mjs`; `--check` fails when it is stale.
Absolute links (canonical, sitemap, JSON-LD, invite emails, share kits) come
from `urls.absUrl(env, url, kind, id)` and follow the host automatically.

## Redirects & 404s

Every address the client domain answers with a 404 is logged (one row per
visitor per address per day, bots marked) as an `events` row named
`not_found`. `GET /api/studio/notfound?days=7|30` groups them; the Studio
screen (Settings → Redirects & 404s) lists them with an *Add redirect*
button. Redirects are the `redirects` setting: `[{from, to, status}]`,
validated in settings.js (paths only for `from`; a root path with optional
`#section`, or a full https:// address, for `to`; 301 or 302). host.js applies
them on the live host before its own tables, with a one-minute cache.

## Google Tag Manager

`gtmId` (owner-only, `GTM-XXXXXXX`) loads the container after "Accept all",
the same gate as GA4 and the Meta Pixel. If the container already fires GA4,
leave `ga4Id` empty to avoid double counting.

## Going live on the client domain

See `docs/megacity-golive.md`.

## Unbound behaviour
`officeDb(env)` returns `env.MEGACITY_DB || null`. Without it every studio/public route answers `503 {connected:false, error:"…"}` and the Studio shows the setup checklist. Rendered public pages (Phase 3) fall back to the static files with `X-MC-Render: static`.
