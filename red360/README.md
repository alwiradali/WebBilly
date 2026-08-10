# RED360 — interactive enterprise virtual tour platform

A complete tour product in one folder. Vanilla JS, raw WebGL, no dependencies,
no build step, no server runtime.

```
red360/
  index.html      shell — four screens, one canvas
  config.js       deployment config — portfolio behaviour, studio passcode
  app.css         design system — every colour derives from the brand block
  app.js          application — router, portfolio, panels, search, studio
  engine.js       WebGL engine — panorama rendering, camera, projection
  embed.js        drop-in for the client's existing website
  tour.js         a building  ← the only kind of file that changes per client
  tour-ashby.js   a second building
  tour-homes.js   a residential portfolio — six listings from one table
```

Live at `/red360/`. Runs identically from a file:// path, an S3 bucket, a
closed intranet or a memory stick.

## Three screens, one GPU context

| Screen | Route | What it is | Who sees it |
|---|---|---|---|
| Portfolio | `#/sites` | Every property, with search, filters and sort | everyone |
| Overview | `#/` · `#/site/<id>` | One property's dashboard, with a **live** preview | everyone |
| Tour | `#/tour/<room>` | The immersive viewer | everyone |
| Studio | `#/studio/<tab>` | The CMS | signed-in admin only |

The canvas is never re-created. `mountStage()` re-parents it between screens,
so the context, the baked panoramas and the camera survive navigation —
entering the tour from the dashboard is instantaneous, with no reload and no
second loading bar.

Because the Studio re-renders its whole body, `parkStage()` moves the live
canvas back onto the tour stage first. Removing that call takes the WebGL
context down with the DOM.

## The portfolio

An agency does not have one building, it has a list that changes every week.
The portfolio is the landing screen whenever a deployment carries more than one
property: a card per listing with price, status, beds, baths, floor area and
position count, plus search across name, street, postcode, reference and
summary, status filters and four sort orders.

`config.js` decides how it behaves:

```js
portfolio: {
  mode: "auto",        // auto · always · never
  eyebrow, title, blurb,
  statuses: ["For sale", "To let", "Under offer", "Sold STC", …]
}
```

`mode: "auto"` skips the portfolio entirely for a single-property deployment,
so nothing changes for a one-building client.

### The listing block

Everything the card shows lives on `project`, editable in Studio → Properties:

```js
project: {
  name, location, summary, area,
  price, priceQualifier, status,
  beds, baths, receptions, propertyType, tenure, epc, ref,
  cover,          // which room the card frame comes from
  coverImage,     // or a photo, if the agency has one
  hidden,         // draft — the agency sees it, visitors don't
  agent: { name, phone, email, url }
}
```

`hidden: true` is the one that matters day to day: a property being built out
is invisible in the public grid and in search, and becomes live the moment its
visibility is switched in the Studio.

Card artwork falls back gracefully: `coverImage` if set, a live frame from the
engine for the property that is open, and otherwise the property's own floor
plan drawn as artwork — real data, no GPU, no photography.

## Admin access

The Studio is the agency's back office and is hidden from visitors entirely —
no nav link, no toolbar button, no `E` shortcut, no palette entries, and the
`#/studio` route bounces to the portfolio.

```js
admin: {
  enabled: true,
  hash: "b1908d99",     // fnv1a("red360:" + passcode) — the passcode is never stored
  hint: "Ask 360RED for the studio passcode.",
  rememberDays: 14,     // 0 = until the tab closes
  verifyUrl: null       // POST {code} → {ok:true}, checked on your server
}
```

Sign in from the lock icon in the portfolio header, or bookmark
`?admin=<passcode>` — it signs in and then strips itself out of the URL.
Studio → Access changes the passcode and prints the line to paste back into
`config.js`.

**Say this to the client in plain words.** It is a front-of-house lock: it
keeps the editing tools out of a visitor's way and off a shared screen. It is
not a security boundary — the whole product is static files, so anyone who
reads the JavaScript can get past a passcode that lives in it. Where the
listings themselves are confidential, put the folder behind the server's own
login (Cloudflare Access, `.htpasswd`, `auth_basic`) or point `verifyUrl` at an
endpoint that checks the code server-side.

## Putting it on a website that already exists

Nothing here replaces the client's site. Upload the folder to it — FTP is
fine — and paste one of four things onto a page:

```html
<!-- one property -->
<iframe src="/tours/?site=willow-lane-12&embed=1#/tour/living"
        width="100%" height="640" loading="lazy" style="border:0"
        allow="fullscreen; accelerometer; gyroscope; xr-spatial-tracking"></iframe>

<!-- the whole portfolio -->
<iframe src="/tours/#/sites" width="100%" height="900" loading="lazy"></iframe>

<!-- a listing template: one line per property -->
<div data-red360="willow-lane-12" data-height="16:9"></div>
<script src="/tours/embed.js"></script>

<!-- or just a link, for a slow listing page -->
<a href="/tours/?site=willow-lane-12&embed=1">View the 360° tour</a>
```

`embed.js` builds the iframe from the attribute, only when the element scrolls
into view, so a listing page with twenty tours on it loads like a page with
none. `data-height` takes pixels or an aspect ratio (`16:9`). `data-red360="*"`
embeds the portfolio instead of one property. The host page can call
`RED360Embed.scan()` after it injects more listings.

`?embed=1` drops the portfolio chrome so the tour fills the frame. Studio →
Publish generates all of these with the right ids already filled in.

## Projects — more than one building

A deployment carries as many buildings as you like. Every tour file ends with
the same line, so it registers itself on load:

```js
(window.RED360_TOURS = window.RED360_TOURS || []).push(window.RED360_TOUR);
```

Shipping another building is two steps and no build:

```
1.  add  red360/tour-<name>.js   (a tour object ending with the push line)
2.  add  <script src="tour-<name>.js"></script>  to index.html
```

Everything else is automatic: the portfolio grows a card, `⌘K` gains a
**Properties** group, and `?site=<id>` or `#/site/<id>` deep-links straight to
one. Each property carries its own `brand` block, so two clients can share one
deployment and neither sees the other's colours.

Properties can also be made in the browser — Studio → Properties → *New
property*, *Duplicate* or *Import a tour.json*. Those live in `localStorage`
for whoever made them, and start as drafts; **Export tour.json** plus the two
steps above is how one becomes permanent for everybody.

### A portfolio with hundreds of listings

Past about fifty properties, register a **stub** instead. The card renders from
the listing block at once, and the rooms are pulled in only when someone opens
that property:

```js
(window.RED360_TOURS = window.RED360_TOURS || []).push({
  id: "willow-lane-12",
  src: "tours/willow-lane-12.js",     // fetched on demand
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

## Panoramas

Each room resolves its panorama from one of two sources:

```js
pano: "panos/atrium.jpg"   // a stitched capture — Matterport, Insta360,
                           // Ricoh Theta, any 2:1 equirectangular image
space: { … }               // synthesised — ray-marched on the GPU
```

Everything downstream is identical, so a room moves from synthesised to
captured by adding one line — or by dropping a file onto Studio → Rooms →
Panorama. Captures of any size are resampled to power-of-two on upload:
WebGL 1 only wraps POT textures, and a panorama that cannot wrap shows a seam
at 0°.

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
{ id, type, yaw, pitch, label, icon, body, stats, to, src, href }
```

| type | behaviour |
|---|---|
| `nav` | walks to `to` with the dolly transition |
| `info` | opens the sheet with `body` + `stats` |
| `image` | `src` image, or `"@equirect"` for the room's own flat panorama |
| `video` | MP4/WebM inline, or a YouTube / Vimeo URL as an embed |
| `doc` | PDF via `src`, or a spec sheet from `body` + `stats` |
| `link` | external `href` |

`yaw`/`pitch` are **camera angles in degrees** — the angles that centre the
hotspot. Never hand-compute them: Studio → Hotspots → *Place a hotspot*, then
click in the panorama.

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
CSS. Studio → Branding edits it live.

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
for tier 1.

At tier 2 the synthesised rooms lose their furniture. Nothing else changes —
tour, hotspots, floor plans, navigation, Studio and **real captured
panoramas** are all unaffected, because a photographed tour never touches this
shader.

## Performance

Previews for every room bake first (1024 × 512), then the active room bakes to
full resolution (4096 × 2048 desktop, 2048 × 1024 mobile) in bands across
frames, so the main thread is never blocked. Full-resolution panoramas are
held in an LRU of three — a thirteen-room building never holds thirteen 4K
textures in video memory. The first bake times itself and drops a quality tier
on slow hardware; `?q=lo|md|hi` pins it, and the command palette exposes the
same control.

## Keyboard

`⌘K`/`Ctrl K` search · arrows look · `+`/`−` zoom · `1`–`9` jump · `Space`
guided tour · `N`/`P` next / previous · `Tab` panels · `M` plan · `F`
fullscreen · `B` portfolio · `E` studio (admin) · `H` overview · `S` still ·
`Esc` back.

## Persistence and hand-over

Studio edits live in `localStorage`, one key per project —
`red360:tour:<project-id>` — with `red360:project` remembering which one was
open. A saved edit always wins over the shipped file, so the demo can be
restored with Studio → Publish → *Reset to shipped demo*. **Publish** saves;
**Export tour.json** writes the whole project to a file, which goes back into
the folder as `tour-<name>.js` (see **Projects** above).

`window.RED360App` exposes `go(roomId)`, `site(id)`, `sites()`, `view(name)`,
`tour()`, `isAdmin()`, `signOut()` and `engine()` for embedding hosts.
