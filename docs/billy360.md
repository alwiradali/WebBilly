# billy360 — interactive virtual tour platform

A complete tour product in one folder. Vanilla JS, raw WebGL, no dependencies,
no build step. The demos run from static files; the Megacity deployment adds a
Cloudflare Worker behind the same files (see **Modes** below and
`docs/megacity-studio.md`).

```
billy360/
  index.html      shell — four screens, one canvas
  config.js       deployment config — portfolio behaviour, studio passcode
  app.css         design system — every colour derives from the brand block
  app.js          application — router, portfolio, panels, search, studio
  engine.js       WebGL engine — panorama rendering, camera, projection
  store.js        where a tour lives (browser, public API or Studio API); loads app.js
  sync.js         the save queue for office mode (window.BILLY360Sync)
  plan.js         floor-plan SVG sanitiser (window.BILLY360Plan)
  details.js      the property-details sheet (window.BILLY360Details)
  embed.js        drop-in for the client's existing website
  qr.js           QR encoder — byte mode, ECC M, v1–10, zero dependencies
  tour.js         a building  ← the only kind of file that changes per client
  tour-ashby.js   a second building
  tour-homes.js   a residential portfolio — six listings from one table
  tour-megacity.js  the Megacity demo listings
```

Live at `/billy360/`. There is no `/tours/` mount anywhere: every path in this
document, in `embed.js` and in the snippets the Studio generates is
`/billy360/…`.

The shipped demos are real photography end to end: every walkable position is
a genuine 360° capture (equirectangular 2:1, CC0, from Poly Haven, resampled
to 2048×1024 and self-hosted in `panos/`), and every room's gallery carries
real interior photographs served from Unsplash. The synthesised `space` block
each demo room also carries is what a brand-new room shows before its capture
is dropped in. A captured room whose file fails to download is **not** replaced
by a synthesised render — it retries (see **Panoramas**).

## Three screens, one GPU context

| Screen | Route | What it is | Who sees it |
|---|---|---|---|
| Portfolio | `#/sites` | Every property, with search, filters and sort | local mode only |
| Overview | `#/` · `#/site/<id>` | One property's dashboard, with a **live** preview | everyone |
| Tour | `#/tour/<room>` | The immersive viewer | everyone |
| Studio | `#/studio/<tab>` | The CMS | signed-in admin only |

The canvas is never re-created. `mountStage()` re-parents it between screens,
so the context, the loaded panoramas and the camera survive navigation —
entering the tour from the dashboard is instantaneous, with no reload and no
second loading bar. The engine binds its pointer, wheel and touch listeners on
the canvas itself, so they travel with it: dragging, wheel zoom and pinch work
in every view the canvas is mounted in.

Because the Studio re-renders its whole body, `parkStage()` moves the live
canvas back onto the tour stage first. Removing that call takes the WebGL
context down with the DOM.

## Modes — where a tour comes from

`store.js` runs before `app.js` and decides, from the address, which of three
modes the page is in. `window.BILLY360_STORE.mode` says which.

| Mode | Address | Tour source | Who |
|---|---|---|---|
| `local` | `/billy360/` (no `?site=`) | the shipped `tour-*.js` files + `localStorage` edits | Billy's demos, other clients |
| `public` | `/billy360/?site=<id>` (also `&embed=1`), or `/tour/<id>` on the Megacity host | `GET /api/public/tours/<id>` — the **live** copy | visitors |
| `remote` (office) | `/billy360/?site=<id>&office=1` | `GET /api/studio/tours/<id>` — the **draft**, with the Studio cookie | Walid and staff, usually inside the Studio's iframe |

**Public mode fails closed.** The viewer fetches the live JSON with
`cache:'no-cache'`, `credentials:'omit'` and an 8 s timeout. On a 404 (draft,
unpublished, hidden, let-agreed, binned or unknown listing) or any other
failure it shows one card — "This tour isn't published yet" (or "Couldn't load
the tour" on a network error) with a **Back to the listing** link taken from
the 404 body's `listingUrl` (a relative `/let/<id>` or
`/templates/megacity-let-<id>` path, or an https URL; anything else falls back
to `/`), opened in `_top`. It never falls back to a demo tour. A shipped demo
with exactly that id (the demo host only) still opens. On success the viewer
knows **one** project (`window.BILLY360_TOURS = [tour]`): no portfolio grid,
no demo palette entries. The admin lock is closed with a random hash per load,
`?admin=` is ignored, `#/studio*` is rewritten to `#/tour/<room>`, `#btnAdmin`
is hidden, and any `billy360:tour:<id>` browser copy is discarded so a stale
edit can never shadow the server. `CFG.leads` and `CFG.analytics` point at
`/api/public/lead` and `/api/public/event`; the opening room is
`project.cover` (else `rooms[0]`), booted straight into the tour view, and
`document.title` becomes `<project.name> · <room.name>` on every room change.
The cover room's `thumb` and panorama are warmed with
`<link rel="preload" as="image" crossorigin="anonymous">` (the only form the
engine's own request reuses), choosing the same file the engine will ask for.

**Office mode** loads the draft (creating a skeleton via `POST` when the
server answers 404 `{canCreate:true}`), keeps `version`, `status`, `health`,
`liveVersion`, `listingLive`, `gate`, `publicUrl` and `embedOrigin` on
`STORE`, opens the Studio without a passcode (the cookie is the login;
`admin.verifyUrl = /api/billy360-verify`), sets `CFG.leads` but **no**
analytics endpoint (office sessions never count as visitors) and lands on
`#/studio/rooms`. Failures show a card: 401 "Sign in to the Studio first",
503 "Not connected yet", 404 "No such listing", 410 "This listing is in the
Bin" (→ the listing in the Studio). `STORE.studioUrl` is
`/templates/megacity-studio` on billydigitals.com/localhost and `/studio`
elsewhere; the Studio rail shows "← Back to the listing" from it (hidden
inside the Studio's own iframe). In office mode the Properties tab has no
New/Duplicate/Import/Delete and no export instructions, the Access tab and
`#btnAdmin` are gone (the palette's "Sign out of the Studio" posts
`/api/studio/auth/logout` and opens `#/login` in `_top`), Name / Price /
Bedrooms / EPC / Reference are read-only ("Edit this in the listing" — the
listing row is overlaid on every load), Visibility is a status line plus
Publish / Take it off, and the assistant answers "new property" with "Add
listings in the Studio's Listings page".

### URL parameters

| Param | Effect |
|---|---|
| `?site=<id>` | the listing id (`^[a-z0-9-]{1,80}$`, case-folded); `?property=` is an alias; `/tour/<id>` on the Megacity host passes it as `window.BILLY360_SITE` and the address stays `/tour/<id>` |
| `&office=1` | office mode (needs the Studio cookie) |
| `&embed=1` | embed mode: no portfolio chrome, poster, passive wheel, `replaceState` (see **Embeds**) |
| `&from=<path>` | shows the "← Back to property" bar; must match `^/[a-z0-9\-/]*$`. A same-origin referrer under `/let/…` or `/templates/megacity-let-…` shows it too. Never inside an embed. |
| `?q=lo|md|hi` | pins the quality mode; `lo`/`md` cap captures at 1024 (the `w1600.jpg` file) |
| `?tier=0|1|2`, `?compat=1` | forces a renderer tier for synthesised rooms (captures are unaffected) |
| `?admin=<passcode>` | local mode only — signs in and strips itself from the URL |

Deep links: `#/tour/<room>?y=<yaw>&p=<pitch>&f=<fov>` opens that room at that
view. `#/site/<id>` and `#/studio/<tab>` as before (local/office only).

## The portfolio

An agency does not have one building, it has a list that changes every week.
In local mode the portfolio is the landing screen whenever a deployment
carries more than one property: a card per listing with price, status, beds,
baths, floor area and position count, plus search across name, street,
postcode, reference and summary, status filters and four sort orders.

`config.js` decides how it behaves:

```js
portfolio: {
  mode: "auto",        // auto · always · never
  eyebrow, title, blurb,
  statuses: ["For sale", "To let", "Under offer", "Sold STC", …]
}
```

`mode: "auto"` skips the portfolio entirely for a single-property deployment,
so nothing changes for a one-building client. Public and office mode always
hold exactly one project, so the portfolio never appears there.

### The listing block

Everything the card shows lives on `project`, editable in Studio → Properties:

```js
project: {
  name, location, summary, area,
  price, priceQualifier, status,
  beds, baths, receptions, propertyType, tenure, epc, ref,
  cover,          // the opening room — the card frame, the embed and public links start here
  coverImage,     // or a photo, if the agency has one
  hidden,         // draft — the agency sees it, visitors don't
  agent: { name, phone, whatsapp, email, url }
}
```

In local mode `hidden: true` keeps a property out of the public grid and
search. In office mode the switch is **Publish**: the server clears
`project.hidden` when it copies the draft to live (see **Publishing**), and
the listing's own status decides whether visitors can reach the tour at all.

Card artwork falls back gracefully: `coverImage` if set, a live frame from the
engine for the property that is open, and otherwise the property's own floor
plan drawn as artwork — real data, no GPU, no photography.

## Admin access

The Studio is the agency's back office and is hidden from visitors entirely —
no nav link, no toolbar button, no `E` shortcut, no palette entries, and the
`#/studio` route bounces away.

```js
admin: {
  enabled: true,
  hash: "b1908d99",     // fnv1a("billy360:" + passcode) — the passcode is never stored
  hint: "Ask billy360 for the studio passcode.",
  rememberDays: 14,     // 0 = until the tab closes
  verifyUrl: null       // POST {code} → {ok:true}, checked on your server
}
```

Sign in from the lock icon in the portfolio header, or bookmark
`?admin=<passcode>` — it signs in and then strips itself out of the URL.
Studio → Access changes the passcode and prints the line to paste back into
`config.js`. Both apply to local mode only: public mode closes the lock, and
office mode replaces it with the Studio cookie (`verifyUrl`).

**Say this to the client in plain words.** It is a front-of-house lock: it
keeps the editing tools out of a visitor's way and off a shared screen. It is
not a security boundary — the whole product is static files, so anyone who
reads the JavaScript can get past a passcode that lives in it. Where the
listings themselves are confidential, put the folder behind the server's own
login (Cloudflare Access, `.htpasswd`, `auth_basic`) or point `verifyUrl` at an
endpoint that checks the code server-side.

## Embeds — putting it on a website that already exists

Nothing here replaces the client's site. Upload the folder to it — FTP is
fine — and paste one of these onto a page:

```html
<!-- one property -->
<iframe src="/billy360/?site=willow-lane-12&embed=1#/tour/living"
        width="100%" height="640" loading="lazy" style="border:0"
        allow="fullscreen; accelerometer; gyroscope; web-share; clipboard-write"></iframe>

<!-- a listing template: one line per property -->
<div data-billy360="willow-lane-12" data-height="16:9" data-room="living"></div>
<script src="/billy360/embed.js" defer></script>

<!-- or just a link, for a slow listing page -->
<a href="/billy360/?site=willow-lane-12&from=/let/willow-lane-12">View the 360° tour</a>
```

`embed.js` builds the iframe from the attribute, only when the element scrolls
into view (`data-lazy="0"` loads at once), so a listing page with twenty tours
on it loads like a page with none. `data-height` takes pixels or an aspect
ratio: the default is `16:9`, and on phones narrower than 700 px it becomes
`4:5` unless `data-height-phone` says otherwise; the host also gets a
`min-height` of 280 px (60vh on phones) so the box is reserved before the
frame arrives. `data-room` opens on a particular position (default: the
cover). The iframe's `allow` list is `fullscreen; accelerometer; gyroscope;
web-share; clipboard-write`. The host page can call `BILLY360Embed.scan()`
after it injects more listings. `data-billy360="*"` embeds the folder
deployment's demo portfolio and is not for Studio-backed pages — `embed.js`
warns in the console if it is used there. `/api/public/tours` (the manifest
of live tours) exists if a portfolio of Megacity tours is ever wanted.

**Where an embed may live.** `_headers` detaches the site-wide
`X-Frame-Options: SAMEORIGIN` for `/billy360/*` and sends
`Content-Security-Policy: frame-ancestors 'self' https://megacityproperties.co.uk
https://*.megacityproperties.co.uk https://billydigitals.com
https://*.billydigitals.com`; the Worker sends the same pair on the viewer index
(`worker/studio/router.js FRAME_ANCESTORS`). To let another site frame a tour,
add its origin to both lists. Portals open the 10ninety link in a new window,
so the allow-list does not affect them.

**What an embed does differently** (`?embed=1`, and a few things whenever
`window !== top`):

- boots straight into the tour view on the cover room; the dashboard is not
  the overview (the listing page is), so `#btnHome` is hidden;
- a **poster** ("Tap to explore", "N rooms · 360°") sits over the panorama
  until the first tap. Until then the wheel is left to the listing page
  (`passiveWheel`: no zoom, no `preventDefault`), vertical swipes scroll the
  page (`touch-action: pan-y`), and nothing beyond the first room is
  preloaded. The tap removes the poster, hands the wheel to the tour and
  starts the neighbour prefetch;
- every hash write uses `history.replaceState`, so walking rooms never adds
  history entries and the browser's Back leaves the listing page as expected
  (the same rule applies in office mode, whose editor lives in an iframe);
- idle drift is off; the render loop sleeps while the frame is off-screen or
  the tab is hidden;
- compact chrome under 420 px of height (`body.is-embed`): filmstrip, dock,
  hint and search hide and a **Rooms** button opens the palette narrowed to
  rooms;
- fullscreen where the API exists (iOS in particular has none inside an
  iframe) — otherwise the button opens the full-screen page
  `STORE.tourUrl()#/tour/<room>` in a new tab. The listing page's own "Open
  the tour full screen" link carries `?from=<listing path>` so the full page
  shows the **← Back to property** bar;
- when a sheet opens it posts `billy360:height {px}` so `embed.js` can raise
  the host's `min-height` (capped at the viewport height) and nothing clips.

The "Platform by …" credit and the chrome switch follow `config.js`
`embed: { chrome, credit }`.

## Projects — more than one building (local mode)

A deployment carries as many buildings as you like. Every tour file ends with
the same line, so it registers itself on load:

```js
(window.BILLY360_TOURS = window.BILLY360_TOURS || []).push(window.BILLY360_TOUR);
```

Shipping another building is two steps and no build:

```
1.  add  billy360/tour-<name>.js   (a tour object ending with the push line)
2.  add  <script src="tour-<name>.js?v=<stamp>"></script>  to index.html
```

Everything else is automatic: the portfolio grows a card, `⌘K` gains a
**Properties** group, and `?site=<id>` or `#/site/<id>` deep-links straight to
one. Each property carries its own `brand` block, so two clients can share one
deployment and neither sees the other's colours. Note that on a deployment
with the Worker, `?site=<id>` is public mode: only a shipped tour with exactly
that id opens without a live server copy.

Properties can also be made in the browser — Studio → Properties → *New
property*, *Duplicate* or *Import a tour.json*. Those live in `localStorage`
for whoever made them, and start as drafts; **Export tour.json** plus the two
steps above is how one becomes permanent for everybody.

### A portfolio with hundreds of listings

Past about fifty properties, register a **stub** instead. The card renders from
the listing block at once, and the rooms are pulled in only when someone opens
that property:

```js
(window.BILLY360_TOURS = window.BILLY360_TOURS || []).push({
  id: "willow-lane-12",
  src: "tours/willow-lane-12.js",     // fetched on demand, relative to index.html
  project: { name: "12 Willow Lane", price: "£465,000", beds: 4, … },
  floors: [{ id: "g", plan: "…" }]    // so the card still has its artwork
});
```

## Adding a space to a property

Studio → Rooms → **Add space**. Name it, pick the floor and pick a space type,
and it renders immediately — a synthesised room, navigable, editable, with its
own pin on the plan and its own card on the dashboard. The space type only
decides what the placeholder looks like; dropping a real capture onto Studio →
Rooms → Panorama replaces it and the type stops mattering.

*Duplicate this space* and *Delete this space* sit at the bottom of the same
panel. Deleting also strips every `nav` hotspot that pointed at the room, so a
tour can never link to a position that is gone.

### Bringing in 360° captures

Every intake path — the bulk drop, the capture card, the room picker,
Photographs and the assistant — reads **one file at a time** (a global queue,
concurrency 1) and shows "Reading photo n of N…" while it does; the drop zones
take nothing new meanwhile. Each file is decoded once: the sized panorama, a
64×32 analysis frame and a `w480` thumbnail (`room.thumb`) come from the same
decode, so the filmstrip and the engine have a picture before any upload
returns. What is measured is what is claimed:

- a 2:1 frame is a 360°; one under 1024 px wide is refused ("too small for a
  360° (needs at least 1024 px wide)");
- HEIC cannot be decoded by Chrome or Firefox — "HEIC photos can't be read
  here. On iPhone: Settings → Camera → Formats → Most Compatible, or share it
  as JPEG.";
- a JPEG without its end marker is accepted with a "looks cut off" note;
  blurred or cut-off captures carry `room.panoNote`, which the health card
  shows as a weight-1 check only for rooms that have one;
- a mixed drop ends in one summary — "N files were left out: “a.jpg” (reason),
  …" — and ordinary photos are pointed at Photographs.

**"Which room is this?"** is a modal dialog (focus trapped, background views
`inert`, idle drift off, focus restored). Its options are: rooms without a
360° first, then "replace its 360°", then rooms already chosen in this drop
(never pre-selected; choosing one asks "Replace the photo you just chose for
X?"), then "A new room…". The pre-selection is a file-name match across all
rooms (a re-shoot called `kitchen.jpg` pre-selects Kitchen's replace entry),
else the first unclaimed room without a 360°, else "A new room…" with the name
pre-filled. Camera names (`R0010123`, `WhatsApp Image …`, DJI/GoPro,
screenshots) and `kitchen(1).jpg` / `kitchen copy.jpg` map sensibly. In office
mode the assistant's chat intake asks the same card for any file whose name is
not an existing room; local mode keeps creating rooms by name. In office mode
the capture card also offers the listing's 360s already uploaded in the
Studio's Media tab ("Or use a 360° already uploaded to this listing") —
picking one sets `room.pano` / `room.thumb` to the `/media/` URLs, nothing is
uploaded twice, and the tile whose room label matches is highlighted.

**Doors.** A bulk-added room links only to its floor's hallway or landing
(else the previous new room in the drop, else the first room on its floor) —
one door each way, `auto` until aimed, hub doors fanned 40° apart. A
tap-placed door goes through `linkRoomsAt` (moves the existing door and makes
the way back); a door click on the Studio stage switches the editor's room;
renaming a room rewrites the "To <old>" / "Back to <old>" labels of doors
leading to it, and a door ring's accessible name is always "Walk to <room>".

**Plans.** Pins for new rooms wrap in a 4×3 grid per floor; `buildPlan` clamps
pins into the plan box and health counts an out-of-box pin as unplaced. Raster
floor plans: office mode uploads the JPEG (sized to 2000 px) with role
`floorplan` and stores `<image href="/media/…/w1600.jpg">`; the browser demo
refuses raster plans, because the client sanitiser only allows `/media/` hrefs.

**Other uploads** (office mode, all through `STORE.hydrate` before the PUT):
logo → PNG ≤ 512 px (an SVG ≤ 200 KB is kept as it is) → role `logo` → the
original file; cover → 1600 px → role `cover`; image hotspot → 1600 px;
video/PDF hotspot files → `STORE.uploadStream` (MP4, WebM and PDF only, ≤ 200
MB; anything else: "Only MP4, WebM and PDF files can be uploaded — paste a
link…").

## Photographs

Every room carries ordinary photography alongside its 360°:

```js
photos: [{ src, thumb, caption, w, h }, …]
```

Studio → Rooms → **Photographs** takes a whole batch at once — drag-drop or
file picker, phone camera included. Each image is decoded, measured, downscaled
and recompressed *on the agent's own machine* before it is stored, so nothing
huge ever enters the tour. Captions, drag-to-reorder and delete are inline.

- A frame within 5% of 2:1 at panorama resolution is **offered** as the room's
  360° — "Looks like a panorama. Use it as this room's 360°?" — never forced.
- A non-2:1 image dropped on the Panorama slot gets a plain-English warning
  before it is accepted.
- Low-resolution images get a note ("it will look soft on large screens"),
  not a rejection.

In the tour, photographs appear as a strip in the room panel and open into a
full-screen gallery — swipe on touch, arrow keys on desktop, thumbnail rail,
captions. `G` opens it; phones get a **Photos** dock button. Thumbnails come
from the `w480` file (`photo.thumb`, written back by the upload) before the
larger picture arrives.

## Tour health

Studio → Publish opens with a health score — the weighted fraction of real
checks that pass, each one naming the exact room or field that needs work:
listing basics, imagery per room, real captures vs placeholders, photographs,
descriptions, **walkability** (a breadth-first walk over the nav hotspots from
the opening room — a room you can't reach from `project.cover` is flagged),
plan placement, capture notes, and whether a viewer can actually enquire.
Clicking a warning jumps to the tab that fixes it. Nothing in the score is
invented. In office mode the score reaches the server with every save (`PUT
{tour, version, health}`) and the publish gate reads the **stored** score —
which is why a never-saved tour cannot be published (see **Publishing**).

## Autosave, undo, redo

Every Studio change autosaves a moment after typing stops. In local mode the
"Saved automatically" chip is the confirmation and the copy lives in the
browser. In office mode the save queue (**`BILLY360Sync`**, below) uploads
embedded images, PUTs the draft and only then says "Saved". The state before
each burst of changes goes on an undo stack: `Ctrl Z` walks back, `Ctrl Shift
Z` (or `Ctrl Y`) walks forward, sixty steps deep, and the toolbar has matching
buttons. Undo and redo keep the engine's textures (the engine diffs rooms by
id and picture rather than reloading), and an upload that finishes after an
edit patches the undo history so no step re-embeds a data URL. Switching
property resets the history.

### The save queue — `BILLY360Sync`

```js
var sync = BILLY360Sync.create({ store, getTour, getHealth, onState, onConflict, onSaved });
// → { schedule(delay), flush({force}) → Promise, retry(), keepMine(), useTheirs(),
//     fetchServer(), stash(), pending(), clearStash(), busy(), state, info, dirty }
```

States: `idle | queued | saving | saved | error | conflict`. `schedule()`
coalesces edits (1.4 s); a pass is `STORE.hydrate` (uploads, looping until
nothing is left to upload) → `PUT`; the queue snapshots the tour at the moment
`STORE.save` reports "Saving…", and `dirty` clears only when the tour still
equals that snapshot after the PUT answers — an edit that lands mid-save runs
another pass. Failures retry by themselves after 2 s, 5 s and 15 s, then wait
for a tap on the **Retry** pill; `online` and `visibilitychange` nudge it. A
**401** keeps the draft in memory, stashes it under
`sessionStorage`/`localStorage` key `billy360:pending:<listingId>`
(`{at, version, tour}`) and shows a **Sign in** bar (inside the Studio's
iframe it posts `billy360:signin` so the parent can re-login without reloading
the frame; standalone it opens the Studio login in `_top`). At the next office
boot a stash is offered back: "You have unsaved changes from <time> that never
reached the Studio. Restore them?". A **409** stops autosaving and opens the
conflict sheet — "Someone else saved this tour": **Load their version**
(`useTheirs()` = GET + apply) or **Keep mine** (`keepMine()` = take the
server's version number and PUT once). Every PUT and publish response's
`status / liveVersion / listingLive / gate / health` is adopted onto `STORE`.

The `#saveState` pill (a 26 px chip on phones, `role=status`) shows: `Unsaved
changes`, `Saving…`, `Uploading n of m · <room>`, `Saved`, `Changes not live`,
`Not saved — retrying`, `Not saved · Retry`, `Not saved`, `Sign in`,
`Conflict`. It becomes a button when a tap does something. A `beforeunload`
guard holds the tab while `dirty || saving`.

## Publishing (office mode)

One `goLive()` serves every entry point — the top-bar Publish, Visibility →
Live, the guide's "Make it live now", the assistant's "publish" / "publish
everywhere" (which copies the 10ninety pack only on success), the Publish tab
and the parent Studio's `billy360:publish`. It flushes the save queue first
(so the stored health is current), then `POST /api/studio/tours/:id/publish`.

Server semantics (`worker/studio/tours.js`):

- the **draft** (`draft_json`, `version`) is what the editor saves; the
  **live** copy (`live_json`, `live_version`, `status`) is what visitors get;
- the gate reads the stored `health_score` against `settings.tourGateScore`
  (`gate` in every response; default 70, changed through
  `PUT /api/studio/settings`, there is no Studio field). A tour with no rooms,
  no room with a 360°, no score yet ("The tour has not been scored yet — open
  it in the Studio once so it can be checked.") or a score under the gate
  answers `{ok:false, problems:[…]}`, and the problems are listed under the
  button in every path;
- on success the draft is copied to live with `project.hidden=false`, the
  Megacity brand, the agent block from settings and the listing's current
  title / rent / bedrooms / EPC / reference overlaid, then written back to the
  draft **without** bumping `version` — the editor sets `project.hidden=false`
  locally too. `liveVersion` becomes the draft's `version`; `live_at` records
  the **first** publish and survives re-publishes; the public cache is purged
  for the request origin and the canonical host;
- `listingLive` says whether the listing itself is live and not hidden.
  `ok:true` with `listingLive:false` carries `note: "Published, but the
  listing is not live yet, so nobody can see it until the listing goes live."`
  and the viewer shows that instead of "Live on the listing";
- after publishing, further saves make `version > liveVersion`: the pill and
  the Publish tab say **Changes not live — Publish again**, and the Studio
  strip says the same;
- **Take it off the listing** (`/unpublish`) sets `status='draft'`, `live_at`
  null, keeps `live_json`, purges the cache; the public route then 404s
  (`no-store`) and the viewer fails closed;
- the public route also 404s when the listing is not live, hidden, let-agreed
  or in the Bin, so hiding a listing hides its tour;
- a listing in the Bin answers **410** `{error, binned:true}` on every Studio
  tour route.

Public links come from the server, never from `location.origin`:
`STORE.publicUrl` (`https://<canonical host>/tour/<id>` in root mode,
`<origin>/billy360/?site=<id>` on the demo host) and `STORE.embedOrigin` feed
`STORE.tourUrl()` and `STORE.embedCode()`; the share sheet and the "The link
for 10ninety" card use them. The office Publish tab is: the quality card, the
Publish card (status line, problems list, "It needs a quality score of at
least N."), the 10ninety card (copy link / copy embed) and a phone preview
once live. The local-mode hosting cards (`?admin=`, "Reset to shipped demo",
"Export tour.json", "The whole portfolio" snippet) are not shown in office
mode.

## The message bus — Studio iframe ↔ parent

Every message carries `source:'billy360'`; both sides check
`event.origin === location.origin`, the iframe additionally checks
`event.source === window.parent` and the parent `event.source ===
iframe.contentWindow`. Messages are posted with `location.origin` as the
target.

Iframe → parent:

| Message | When |
|---|---|
| `{type:'billy360:ready'}` | once `bootReady` runs in office mode — gates the flush handshake and triggers the parent's status/media push |
| `{type:'billy360:room', id}` | every room change |
| `{type:'billy360:state', dirty, saving, status}` | every queue change; `status` is the **queue** state (`idle|queued|saving|saved|error|conflict`), `saving` is true for `queued` and `saving` |
| `{type:'billy360:height', px}` | `?embed=1` only, when a sheet opens |
| `{type:'billy360:flushed', version}` / `{type:'billy360:flush-failed', reason}` | the reply to `flush` (a flush during an open 409 sheet fails with the server's message; a flush after a 401 retries the PUT) |
| `{type:'billy360:published', ok, problems}` | after every `goLive()`; `{ok:false, problems:[], unpublished:true}` after "Take it off the listing" |
| `{type:'billy360:signin'}` | the 401 bar's Sign in was tapped inside a frame |

Parent → iframe:

| Message | Effect |
|---|---|
| `{type:'billy360:flush'}` | drain the queue, then reply `flushed` / `flush-failed`; outside office mode the reply is immediate |
| `{type:'billy360:publish'}` | `goLive()` |
| `{type:'billy360:status', status, health, version, liveVersion, gate, listingLive}` | adopted onto `STORE`; when `version` is newer than the iframe's and nothing is unsaved there, the iframe fetches and applies that copy ("Updated with changes saved elsewhere") |
| `{type:'billy360:media', items:[{id, pano, pano2048, thumb, roomLabel}]}` | the listing's 360s from the Media tab, offered on the capture card; only `/media/…` paths are kept |

The Studio's strip Publish sends `flush`, waits up to 5 s for `flushed`
("Still saving — try again in a moment" otherwise), then POSTs; it also sends
`flush` after a successful re-login.

## Booking a viewing and property details

"Book a viewing" appears on the listing hero, as a `cta` hotspot type, in the
**Details** sheet and at the end of the guided tour. The form (name, email,
phone, preferred date, message) submits to `leads.endpoint` when one exists —
a JSON POST carrying `property, site, listingId, room, roomName, source, url`
beside the fields — and otherwise opens a pre-filled email to the listing's
agent. No route, no button: it never pretends to send. `store.js` sets the
endpoint to `/api/public/lead` in public and office mode; the Worker records
the enquiry with `source:'tour'` and the listing id so it lands in the
Studio's inbox.

**`BILLY360Details`** renders the listing's facts into the Details sheet:

```js
BILLY360Details.render(host, { project, agent, onBook, onCall, onWhatsApp })
// → { actions: [buttons], facts: [[label, value], …] }
BILLY360Details.has(project, agent)   // anything worth a sheet?
```

Rent, beds, baths, EPC, features and the agent (Book a viewing / Call /
WhatsApp). The dock's **Details** button and the toolbar's **Enquire** open it
when `has()` is true or a lead route exists.

## Events

In local mode tour opens, room visits, hotspot taps, gallery opens and
enquiries are recorded to the viewer's own browser (a bounded ring under
`billy360:events:<project>`), which gives Studio → Publish an honest "on this
device" card. With `analytics.endpoint` set every event is also sent as a
small JSON beacon (`{t, ev, site, room, …}` via `sendBeacon`). In public mode
the ring is off and the endpoint is `/api/public/event`: a first-party beacon,
no cookies, a daily-rotating session hash, kept 90 days. Office mode sends
nothing.

## QR codes

Studio → Publish generates a QR for the property's link — window cards,
brochures, For Sale boards — with a PNG download at print resolution. The
encoder is in-house (`qr.js`): byte mode, error-correction M, versions 1–10,
verified against an independent decoder. The Megacity Studio's 360 tab uses
the same encoder for its print card.

## Panoramas

Each room resolves its panorama from one of two sources:

```js
pano: "panos/atrium.jpg"   // a stitched capture — any 2:1 equirectangular image
thumb: "/media/…/w480.jpg" // optional: a small copy the engine shows first
space: { … }               // synthesised — ray-marched on the GPU
```

Everything downstream is identical, so a room moves from synthesised to
captured by adding one line — or by dropping a file onto Studio → Rooms →
Panorama. Captures are resampled to power-of-two sizes when they are uploaded
to the GPU: WebGL 1 only wraps POT textures, and a panorama that cannot wrap
shows a seam at 0°.

### Texture size and the file ladder

The texture cap comes from the **canvas**, not the pointer:
`clamp(pot(canvasWidth × 4), 1024, phone ? 2048 : 4096)`, where the canvas
width is CSS px × min(DPR, 1.75 on coarse pointers / 2 on fine) and "phone"
means a coarse pointer whose canvas is under 1500 device px on its long side
(an iPad-class canvas gets 4096). `?q=lo|md` caps at 1024. Captures are never
below 1024, and the renderer tier (`?compat=1`, `billy360:tier`) has no say —
it only concerns the space shader, which a photographed room never runs.

Studio uploads live under `/media/` with a fixed ladder beside the original:
`w480.jpg` (thumb), `w1600.jpg`, `pano2048.jpg`, `pano4096.jpg`. The engine
rewrites a `/media/…/pano4096.jpg` source to `pano2048.jpg` when the cap is
≤ 2048 and to `w1600.jpg` when it is ≤ 1024, and falls back to the 4096 file
once if the derivative fails. Shipped `panos/`, `data:` and `blob:` sources are
untouched, so the demos never change. Changing quality on a phone does not
re-download anything the cap did not change.

### Loading behaviour

- **Thumb first.** A room with a `thumb` is drawn from a 512×256 texture
  within about 100 ms and `onReady` fires on it; the full file sharpens in
  with a 420 ms dissolve (`onSharpen(true)` while only the thumb is up).
- **Never dissolve into nothing.** `go(id)` into a room whose picture has not
  arrived keeps drawing the current room and fires `onLoading(id, true)`; the
  door ring and filmstrip tile show a small ring (`.is-loading`); `onRoom` and
  the dissolve happen when the texture lands. `pending()` names the room being
  waited on; `current()` is still the room on screen.
- **Order.** The current room first, then rooms reachable by its `nav`
  hotspots, then the rest; a tapped room moves to the front of the queue.
  Nothing beyond the first room is preloaded on the dashboard or in an embed
  until the first drag, wheel, pinch, `go()` or gyro — `preload()` releases it
  by hand.
- **Failures.** A download that fails retries after 2 s and 8 s, then
  `onLoading(id, false, "failed")` shows "Couldn't load <room> — tap to retry"
  and the next `go(id)` tries once more. A captured room is never replaced by a
  synthetic render. If the **first** room is still downloading after 25 s of
  visible time the engine raises "This is taking longer than it should" with a
  single **Retry** (`network: true`, `retry()`), which re-fetches at the front
  of the queue and re-arms the guard.
- **Progress.** The loader says "Loading <room name>…" with real byte
  progress for `/media/` files (`fetch` + `ReadableStream`), then "Ready"; the
  bake stage names appear only for synthesised demo rooms.
- **Memory.** Full-size textures are kept in a small pool (two on touch
  devices, three on desktop) around the current room, incoming room and its
  neighbours; the rest drop back to the thumb texture. `load(tour)` diffs by
  room id + picture, keeps textures whose `pano` is unchanged and frees the
  rest, so undo/redo and re-loads never leak. POT captures get mipmaps with an
  analytic LOD (seam-safe) used only while the view minifies; touch devices
  with a captured room use an adaptive DPR (≤ 1.25 device px per texel, never
  below 1).
- **Context loss.** On `webglcontextlost` the engine stops drawing and raises
  `{title:"The tour paused", message:"Tap to restart", detail:"webglcontextlost",
  recoverable:true}`; the app shows a tap-to-restart overlay (a reload the
  crash sentinel does not count). When the browser hands the context back the
  engine rebuilds everything and calls `onReady()` again.
- **Field of view.** On a portrait canvas the stored fov is taken as
  horizontal and the vertical field capped at 100° (`viewFov()`), so a phone
  sees a room, not a slit; `camera().fov` still reports the stored number.

### Synthesised space fields

```js
space: {
  w: 14, h: 6.6, d: 12.5,     // interior metres
  eye: 1.62, cam: [x, z],     // tripod height and position
  layout: 1,                  // 0 reception · 1 atrium · 2 café · 3 event hall
                              // 4 boardroom · 5 studio · 6 meeting · 7 booths
                              // 8 terrace · 9 hallway · 10 lounge
  glaze: "+z", glaze2: "+x",  // glazed faces: -z +z -x +x
  open: true,                 // no ceiling — roof terraces
  city: 1, warm: 0,           // skyline density · golden hour
  seed: 11.7, exposure: 1.02,
  palette: { wall, floor, accent, light, wood, fabric }
}
```

Keep the tripod out of the furniture. A camera inside a table smears across
the nadir — exactly as it would on a real shoot.

## Hotspots

```js
{ id, type, yaw, pitch, label, icon, body, stats, to, src, href, auto }
```

| type | behaviour |
|---|---|
| `nav` | walks to `to` with the dolly transition; `auto: true` marks a door placed by the skeleton or intake that nobody has aimed yet |
| `info` | opens the sheet with `body` + `stats` |
| `image` | `src` image, or `"@equirect"` for the room's own flat panorama |
| `video` | MP4/WebM inline, or a YouTube / Vimeo URL as an embed |
| `doc` | PDF via `src`, or a spec sheet from `body` + `stats` |
| `link` | external `href` |

`yaw`/`pitch` are **camera angles in degrees** — the angles that centre the
hotspot. Never hand-compute them: Studio → Hotspots → *Place a hotspot*, then
click in the panorama (a tap is a pointer that moved under 12 px on touch /
5 px with a mouse in under 600 ms). Ids follow `^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$`
(the server rejects anything else); `href`, `brand.creditHref`, `brand.logo`
and `agent.url` must be http(s), `mailto:`, `tel:` or a root-relative path —
the editor marks a bad URL and the server drops it silently.

## Floor plans and `BILLY360Plan`

`floors[].plan` is SVG markup drawn behind the pins. In every mode it goes
through `BILLY360Plan.sanitize(markup) → DocumentFragment` (or `.toString()`)
before it touches the DOM, with the same allow-list the server applies on
save: elements `rect path circle ellipse line polyline polygon g text tspan
image`; attributes `class x y width height rx ry cx cy r d points transform
fill stroke stroke-width opacity font-size font-family text-anchor`, and
`href` only when it starts with `/media/`. A wrapping `<svg>` is unwrapped;
scripts, `foreignObject`, `use`, `a`, `style`, `set`/`animate*`, `on*`
handlers, `xlink:href`, ids and comments are removed with their content. A
`data:` URI anywhere inside plan markup is refused by the server with 413
(`{path:"$.floors[i].plan"}`) — raster plans are uploaded first. Gradient ids
are `cone-<floor index>`.

## White label

```js
brand: {
  name, mark, markAccent, sub, tagline, logo,
  accent, accent2, bg, ink, fontDisplay, fontBody, credit, creditHref
}
```

`applyBrand()` writes these onto `:root`, and every accent in the product —
buttons, hotspots, the radar cone, focus rings, progress bars, the plan
glazing line — derives from them. There is no hard-coded brand colour in the
CSS. Studio → Branding edits it live. Megacity tours get their brand from the
server at create and publish (`MEGACITY_BRAND` in `worker/studio/tours.js`:
"Megacity Properties", `#2b7fff` / `#38bdf8` on `#060b1a`, the logo at
`/templates/assets/mcr/logo.png`, `creditHref` = the listing's public page)
and the `agent` block from Settings → Branding (name, phone, WhatsApp, email).

## Three renderers

Some integrated GPUs — Intel HD through ANGLE and Direct3D in particular —
cannot link the full shader. The link fails and takes the GL context with it.
So the engine tries three renderers in order, remembers the one that worked,
and never shows the same machine a failure twice:

| tier | what it is | when |
|---|---|---|
| 0 `full` | ray-marched, gloss reflections, soft shadows | any modern GPU |
| 1 `compact` | ray-marched, no secondary marches, shorter loops | older integrated graphics |
| 2 `lite` | one analytic ray/box intersection, **no loops at all** | anything that can run WebGL |

Each furniture set is compiled as its own program rather than eleven inside
one shader, which cuts the instruction count at every march site by roughly an
order of magnitude. Force a tier with `?tier=0|1|2`; `?compat=1` is shorthand
for tier 1. The space shader is only compiled when the starting room will
actually draw it.

At tier 2 the synthesised rooms lose their furniture. Nothing else changes —
tour, hotspots, floor plans, navigation, Studio and **real captured
panoramas** are all unaffected: a photographed tour never touches this shader
and its texture size never follows the tier.

## Performance

For **synthesised** rooms, previews bake first (1024 × 512), then the active
room bakes to full resolution (4096 × 2048 desktop, 2048 × 1024 mobile) in
bands across frames, so the main thread is never blocked; the first bake times
itself and drops a quality tier on slow hardware — in office mode
(`noReload`) it degrades in place rather than reloading. `?q=lo|md|hi` pins
the quality mode and the command palette exposes the same control (hidden in
public mode and on coarse pointers, where it would change nothing for
captures). **Captured** rooms follow the texture cap and file ladder above.

The render loop sleeps while the portfolio is on screen, while the tab is
hidden and while an embed is scrolled out of view (`sleep(bool)`, driven by
`visibilitychange` and an IntersectionObserver); previews keep baking in the
background. Idle drift (the slow look-around when nobody touches the tour) is
off in the Studio, in embeds, during the guided tour and behind any open
panel, sheet or palette (`idleDrift(bool)`). Boot pans are skipped under
`prefers-reduced-motion`.

## Guided tour

**Play the tour** (toolbar, the phone dock, `Space`) walks every room in
order; `#transportPos` shows "Room n of N"; `N`/`P` step; a drag or wheel
pauses it and it resumes 3.5 s later; the transport's pause is sticky. It ends
after the last room with "That's the whole tour — book a viewing" (lead form /
details / play again) rather than looping, and a one-room tour says "This tour
has one room — there is nothing to walk through yet." Gyro (phones) asks for
motion permission inside the tap and reports the real outcome ("Move your
phone to look around." / "Motion access was blocked — allow Motion &
Orientation in Safari settings and reload." / "Motion control off.").

## Keyboard

Global shortcuts are single letters and run only when the **tour surface**
has focus (the page itself, the stage, the room title, a door ring or a
filmstrip tile) and no modifier is held; `Tab` is never intercepted outside a
dialog (dialogs, the palette and the lock trap it within themselves).

`⌘K`/`Ctrl K` search · `G` photo gallery · `Ctrl Z` / `Ctrl Shift Z` / `Ctrl Y`
undo / redo (Studio) · arrows look (`Shift` for a bigger step) · `+`/`−` zoom ·
`1`–`9` jump to a room · `Space` play / stop the guided tour · `N`/`P` next /
previous while it runs · `P` panels otherwise · `M` plan · `F` fullscreen ·
`B` portfolio (local) / overview · `E` studio (admin, never in public mode) ·
`H` overview · `S` still · `Enter` on the overview enters the tour.

`Esc` closes whatever is open — a sheet, the palette, the lock, the guided
tour, the hint — and blurs a form field; it never leaves the tour. In the
Studio `Esc` returns to the tour (or the portfolio it came from). Room changes
are announced through the `#roomLive` live region and the room title takes
focus; door markers behind the camera are taken out of the tab order.

## Persistence and hand-over

**Local mode.** Studio edits live in `localStorage`, one key per project —
`billy360:tour:<project-id>` — with `billy360:project` remembering which one
was open. A saved edit always wins over the shipped file, so the demo can be
restored with Studio → Publish → *Reset to shipped demo*. **Publish** saves;
**Export tour.json** writes the whole project to a file, which goes back into
the folder as `tour-<name>.js` (see **Projects** above). A "browser storage is
full" banner stays up until a save succeeds. The admin session is
`billy360:admin` (local or session storage); the renderer tier is
`billy360:tier`.

**Office mode** — `store.js` (`window.BILLY360_STORE`):

- `STORE.upload(src, meta)` → `{url, thumb, pano, pano2048, orig, id,
  listingWentLive}`. `src` is a data URL or Blob; `meta` is `{isPano, role,
  roomLabel, alt, listingId, derivedThumb}`. Roles: `tour` (implicit for a
  panorama), `logo`, `floorplan`, `gallery`, `cover`. The browser makes the
  ladder itself (`w1600`, `w480`, `pano2048`, and `pano4096` only when the
  source is not already a JPEG ≤ 4096 wide — `meta.panoIsOrig` tells the
  server to file the original as the 4096 panorama, so nothing is sent
  twice). `derivedThumb` passes an intake-made `w480` through so a panorama is
  decoded once. A panorama, logo or floor plan never becomes the listing's
  cover photo and never counts as a listing photo; a gallery/cover photo that
  completes an imported listing can make it go live (`listingWentLive`, the
  editor toasts it).
- `STORE.uploadStream(src, meta)` → `{url, id}` for MP4, WebM and PDF (raw
  `PUT /api/studio/media/stream`); anything else rejects.
- `STORE.hydrate(tour, onStatus, listingId)` uploads every embedded data URL
  — `rooms[].pano` (writes back `room.thumb` too), `photos[].src`, image /
  video / doc hotspots, `project.coverImage`, `brand.logo` (keeps the
  original file), raster `floors[].plan` hrefs — one at a time, reporting
  "Uploading n of m · <room>…", and only writes a field back when it still
  holds the same data URL (a capture re-shot mid-upload is not lost).
  `STORE.save` loops hydrate until nothing is left, reports "Saving…", then
  `PUT {tour, version, health}` and adopts the returned `version`.
- `STORE.publish(health)` / `STORE.unpublish()`; `STORE.tourUrl()` /
  `STORE.embedCode()` from the server's `publicUrl` / `embedOrigin`;
  `STORE.studioUrl`; `STORE.mediaOffered` (the Media tab's 360s).
- Nothing about the draft is kept in the browser except the 401 stash
  (`billy360:pending:<listingId>`), and any `billy360:tour:<id>` copy is
  removed at boot.

The crash sentinel is `sessionStorage` `billy360:boot-crash`: incremented at
boot, removed at `onReady`, on `pagehide`, on `visibilitychange → hidden` and
`freeze`; it never writes `billy360:tier`, and a second tab is never counted.

## Engine API

```js
var engine = BILLY360.createEngine({
  canvas, host,
  passiveWheel,   // ignore the wheel entirely until passiveWheel(false) — embeds before the poster tap
  noReload,       // office mode: the slow-GPU watchdog degrades in place instead of location.reload()
  embed,          // no idle drift, no preload before the first interaction
  onProgress(p, label), onReady(), onRoom(room, previous), onFrame(camera, room),
  onError({ title, message, detail, diag, recoverable, network, retry }),
  onSharpen(bool), onLoading(roomId, bool[, "failed"]), onInteract()
});
```

| Method | What it does |
|---|---|
| `load(tour)` | diffs rooms by id + picture; keeps unchanged textures, frees the rest |
| `start(id, view)` · `mount(el)` · `resize()` · `destroy()` | lifecycle; `mount` only re-parents the canvas |
| `go(id, {force})` · `look(yaw, pitch, fov)` · `nudge(dy, dp)` · `zoom(d)` | navigation; `go` into an unloaded room waits (see **Loading behaviour**); `force` re-points an in-flight walk at the new room object |
| `camera()` → `{yaw, pitch, fov}` · `viewFov()` · `project()` · `angleAt()` | the stored camera; the on-screen vertical field; hotspot layout helpers |
| `current()` · `pending()` · `isReady()` · `transitioning()` | the room on screen; the room being waited on |
| `gyro(bool)` → `Promise<boolean>` · `gyroOn()` | asks for motion permission inside the gesture and resolves with the real outcome |
| `inputs(bool)` · `passiveWheel(bool)` · `autoRotate(bool, speed)` · `idleDrift(bool)` · `sleep(bool)` | input and loop switches |
| `preload()` | release the neighbour prefetch by hand |
| `setPano(id, src)` · `rebake(id)` · `retry(id)` → boolean | change a room's picture (a no-op for the same source); re-bake a synthesised room; re-fetch a failed download at the front of the queue |
| `quality(q)` | `lo|md|hi|auto`; captures re-download only when the cap actually changes |
| `thumbnail(id, w, h, yaw)` · `equirect(id)` · `capture()` | a still for cards; the flat panorama; a PNG of the view (does not advance the camera clock) |
| `stats()` | `{textures, queued, inflight, bakes, pending, cap, dpr, vfov, mip, mipOn}` — test hooks |
| `diagnostics()` · `renderer()` | the diag log; the tier in use |

`window.BILLY360App` exposes `go(roomId)`, `view(name)`, `tour()`, `site(id)`,
`sites()`, `isAdmin()`, `signOut()`, `health()`, `save()`, `publish()`,
`sync()` and `engine()` for embedding hosts and tests.

## Cache-busting

Every `billy360/*.js|css` tag in `index.html`, the `<link rel="preload">` for
`app.js` and the `APP` constant in `store.js` carry the same `?v=` stamp
(`20260907a` today). Bump them together — a mismatch downloads `app.js` twice.
