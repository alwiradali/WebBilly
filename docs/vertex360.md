# VERTEX 360 — virtual tour engine

A self-contained 360° tour runtime. Vanilla JS + raw WebGL, no dependencies,
no build step. Two files ship a whole tour:

```
templates/vertex360.html   shell + tour definition (window.VERTEX_TOUR)
templates/vertex360.js     engine
```

Live demo: `/templates/vertex360` — Charnwood House, 18,500 sq ft over two floors.
Sales page: `/virtual-tour-360`.

## How a tour is defined

Everything is one object. Drop it inline, or fetch it as `tour.json` and assign
it to `window.VERTEX_TOUR` before loading the engine.

```js
window.VERTEX_TOUR = {
  project: { name, slug, location, size },
  autoDwell: 11000,                 // ms per space in guided mode
  autoOrder: ["arrival", "atrium"], // guided route (defaults to scene order)
  floors: [{ id, name, short, plan /* inline SVG for the minimap */ }],
  scenes: [ /* see below */ ]
};
```

### Branding (white label)

```js
brand: {
  name: "360", nameAccent: "RED", sub: "PRODUCTIONS",
  c1: "#b3121f", c2: "#ff2f3f", c3: "#ff6a45",
  credit: "Tour engine by Billy Digitals"
}
```

That block is the only thing that changes to put the viewer in someone else's
colours. The engine writes `--c1/--c2/--c3` onto `:root` and derives every
accent glow (`--g-soft`, `--g-mid`, `--g-strong`, `--g-tint`) from them, so
hotspots, the plan radar, the active thumbnail, tabs, the progress bar and the
loader all follow. Omit `credit` for no attribution at all. The demo tour ships
white-labelled for 360RED PRODUCTIONS.

### A scene

```js
{
  id: "atrium", name: "Atrium & Social Stair", short: "Atrium", floor: "g",
  area: "2,150 sq ft", capacity: "120 standing",
  plan: [51, 51],           // x,y in the floor plan's 0–100 × 0–72 viewBox
  north: -90,               // rotates the plan's view cone to match the capture
  start: { yaw: 12, pitch: -7, fov: 84 },

  pano: "panos/atrium.jpg", // ← a real stitched capture, OR omit for `room`
  room: { … },              // synthesised space (see below)

  hotspots: [
    { type: "nav",  yaw: 178, pitch: -14, to: "arrival", label: "Reception" },
    { type: "info", yaw: 0,   pitch: -24, label: "Social stair",
      body: "…", stats: [["Void height","6.6 m"]],
      cta: { label: "Book a viewing", href: "/#contact" } }
  ]
}
```

`yaw`/`pitch` are **camera angles in degrees** — the angles that centre the
hotspot. Yaw 0 faces the room's −z wall; positive yaw turns left. Don't
hand-compute them: open the tour, press **E**, click where you want the hotspot
and hit **Export tour.json**.

## Real captures vs synthesised rooms

| | `pano` set | `room` set |
|---|---|---|
| Source | your stitched equirectangular (2:1) image | ray-marched on the GPU into an equirect framebuffer |
| Use for | the delivered tour | pitching, hotspot planning and sign-off before the shoot |

Everything downstream — viewer, hotspots, plan, editor, deep links — is
identical, so a scene moves from synthesised to real capture by adding one
line. Captures of any size are resampled to power-of-two before upload:
WebGL 1 only wraps POT textures, and a panorama that can't wrap has a seam.

### `room` fields

```js
room: {
  w: 14, h: 6.6, d: 12.5,      // interior metres
  eye: 1.62, cam: [x, z],      // tripod height and position
  layout: 1,                   // 0 reception · 1 atrium · 2 café · 3 event hall
                               // 4 boardroom · 5 studio · 6 meeting · 7 booths · 8 terrace
  glaze: "+z", glaze2: "+x",   // glazed faces: -z +z -x +x
  open: true,                  // no ceiling — roof terraces
  city: 1, warm: 0,            // skyline density · golden hour
  seed: 11.7, exposure: 1.02,
  palette: { wall, floor, accent, light, wood, fabric }
}
```

Keep the tripod out of the furniture — a camera inside a table renders as a
smear across the nadir, exactly as it would on a real shoot.

## Runtime

Previews bake first (1024 × 512, all scenes), then the active space bakes to
full resolution (4096 × 2048 desktop, 2048 × 1024 mobile) in bands across
frames, so nothing ever blocks the main thread. The first bake times itself and
drops a tier on slow hardware. `?q=lo|md|hi` pins it.

Keyboard: arrows look · `+`/`−` zoom · `1`–`9` jump to a space · `A` guided
tour · `F` fullscreen · `E` editor · `Esc` close.

Deep links: `?s=<scene>&y=<yaw>&p=<pitch>&f=<fov>`.

API: `VERTEX360.go(id)`, `.look(yaw, pitch, fov)`, `.auto()`, `.config`,
`.panorama(id)` (the flat equirect preview as a data URL, for QA).

## Hand-over

The editor's **Export tour.json** button writes the entire tour — scenes,
hotspots, opening views — as one file. That file plus `vertex360.js`, a shell
page and the panorama folder is the whole product; it runs on any static host,
including an offline intranet.
