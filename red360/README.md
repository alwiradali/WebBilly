# RED360 — interactive enterprise virtual tour platform

A complete tour product in one folder. Vanilla JS, raw WebGL, no dependencies,
no build step, no server runtime.

```
red360/
  index.html   shell — three screens, one canvas
  app.css      design system — every colour derives from the brand block
  app.js       application — router, panels, search, guided tour, studio
  engine.js    WebGL engine — panorama rendering, camera, projection
  tour.js      a building  ← the only kind of file that changes per client
  tour-ashby.js  a second building — proof the platform is multi-project
```

Live at `/red360/`. Runs identically from a file:// path, an S3 bucket, a
closed intranet or a memory stick.

## Three screens, one GPU context

| Screen | Route | What it is |
|---|---|---|
| Overview | `#/` | Project dashboard with a **live** preview of the building |
| Tour | `#/tour/<room>` | The immersive viewer |
| Studio | `#/studio/<tab>` | The CMS |

The canvas is never re-created. `mountStage()` re-parents it between screens,
so the context, the baked panoramas and the camera survive navigation —
entering the tour from the dashboard is instantaneous, with no reload and no
second loading bar.

Because the Studio re-renders its whole body, `parkStage()` moves the live
canvas back onto the tour stage first. Removing that call takes the WebGL
context down with the DOM.

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

Everything else is automatic: the dashboard header grows a project switcher,
`⌘K` gains a **Projects** group, Studio gains a **Projects** tab, and
`?p=<id>` deep-links straight to one. Each project carries its own `brand`
block, so two clients can share one deployment and neither sees the other's
colours.

Projects can also be made in the browser — Studio → Projects → *New project*,
*Duplicate this project* or *Import a tour.json*. Those live in `localStorage`
for whoever made them; **Export tour.json** plus the two steps above is how one
becomes permanent for everybody.

## Adding a space to a building

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
fullscreen · `E` studio · `H` overview · `S` still · `Esc` back.

## Persistence and hand-over

Studio edits live in `localStorage`, one key per project —
`red360:tour:<project-id>` — with `red360:project` remembering which one was
open. A saved edit always wins over the shipped file, so the demo can be
restored with Studio → Publish → *Reset to shipped demo*. **Publish** saves;
**Export tour.json** writes the whole project to a file, which goes back into
the folder as `tour-<name>.js` (see **Projects** above).

`window.RED360App` exposes `go(id)`, `view(name)`, `tour()` and `engine()` for
embedding hosts.
