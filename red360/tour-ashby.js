/* ═══════════════════════════════════════════════════════════════════════════
   A SECOND PROJECT
   This is all it takes to add another building to the same deployment: one
   file that pushes itself onto the registry, and one <script> line in
   index.html. No build step, no database, no rebuild of anything else.
   ═══════════════════════════════════════════════════════════════════════════ */

(window.RED360_TOURS = window.RED360_TOURS || []).push({
  id: "ashby-retail",
  version: 2,

  /* branding is per project — a different end client can have their own
     colours and wordmark without touching a line of code */
  brand: {
    name: "billy360", mark: "billy", markAccent: "360", sub: "VIRTUAL TOURS",
    tagline: "Interactive Enterprise Virtual Tours",
    logo: null,
    accent: "#FF2D46", accent2: "#FF7A45", bg: "#08080B", ink: "#F2F3F5",
    fontDisplay: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontBody: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    credit: "Platform by Billy Digitals", creditHref: "/virtual-tour-360"
  },

  project: {
    name: "Ashby Retail Unit", slug: "ashby-retail",
    client: "Confidential · retail",
    location: "Ashby-de-la-Zouch, LE65",
    area: "4,200 sq ft", floors: 1, duration: "4 min",
    captured: "Half-day capture · 1.62 m tripod",
    summary: "A single-floor retail unit captured in half a day — shop floor, " +
      "stockroom, staff room and the mezzanine office. Five positions, the " +
      "smaller end of what a tour is worth doing for.",
    facts: [
      ["Footprint", "4,200 sq ft"],
      ["Floors", "1"],
      ["Positions", "5"],
      ["Walkthrough", "4 min"],
      ["Capture", "Half day"],
      ["Delivery", "5 working days"]
    ]
  },

  guided: { dwell: 8000, order: ["shopfloor", "run", "stock", "staff", "mezz"] },

  floors: [{
    id: "g", name: "Ground Floor", short: "G",
    plan:
      '<rect class="fp-out" x="6" y="6" width="108" height="68" rx="2"/>' +
      '<rect class="fp-rm" x="6" y="6" width="64" height="68"/>' +
      '<rect class="fp-rm fp-hall" x="70" y="6" width="12" height="68"/>' +
      '<rect class="fp-rm" x="82" y="6" width="32" height="34"/>' +
      '<rect class="fp-rm" x="82" y="40" width="32" height="20"/>' +
      '<rect class="fp-rm fp-open" x="82" y="60" width="32" height="14"/>' +
      '<path class="fp-glaze" d="M6 74h64"/>' +
      '<text class="fp-lb" x="9" y="11">SHOP FLOOR</text>' +
      '<text class="fp-lb" x="71" y="11">RUN</text>' +
      '<text class="fp-lb" x="85" y="11">STOCKROOM</text>' +
      '<text class="fp-lb" x="85" y="45">STAFF ROOM</text>' +
      '<text class="fp-lb" x="85" y="65">MEZZANINE</text>'
  }],

  rooms: [
    {
      id: "shopfloor", name: "Shop Floor", short: "Shop", kind: "Retail", floor: "g",
      area: "2,600 sq ft", capacity: "Open plan", ceiling: "4.2 m",
      description: "Full-height glazed shopfront onto the street, open trading floor and a " +
        "counter run along the return wall. Captured before opening, with the lights set for trade.",
      plan: [38, 40], north: -90,
      view: { yaw: 16, pitch: -6, fov: 84 },
      pano: null,
      space: {
        w: 16, h: 4.2, d: 14, eye: 1.62, cam: [0, 3.6], layout: 3, glaze: "+z",
        seed: 31.5, exposure: 1.06, city: 1, warm: 0.05,
        palette: { wall: "#e6e6e4", floor: "#8d8a85", accent: "#7a1220", light: "#ffeacd", wood: "#b78448", fabric: "#3d4450" }
      },
      hotspots: [
        { id: "s1", type: "nav", to: "run", yaw: -74, pitch: -12, label: "Rear run" },
        {
          id: "s2", type: "info", yaw: 0, pitch: 8, label: "Shopfront", icon: "info",
          body: "Retail is the easiest case to justify a tour: a landlord or a franchisee can judge " +
            "the frontage, the run of the floor and the ceiling height without a viewing.",
          stats: [["Frontage", "9.4 m"], ["Clear height", "4.2 m"], ["Floor", "2,600 sq ft"]]
        }
      ]
    },
    {
      id: "run", name: "Rear Run", short: "Run", kind: "Circulation", floor: "g",
      area: "180 sq ft", capacity: "Circulation", ceiling: "2.8 m",
      description: "The service run linking the shop floor to the back of house.",
      plan: [76, 40], north: -90,
      view: { yaw: 4, pitch: -5, fov: 82 },
      pano: null,
      space: {
        w: 2.8, h: 2.8, d: 12, eye: 1.62, cam: [0, 0], layout: 9, glaze: "none",
        seed: 9.9, exposure: 1.02, city: 1, warm: 0,
        palette: { wall: "#e0e2e5", floor: "#82858a", accent: "#7a1220", light: "#ffe8cc", wood: "#9d6b39", fabric: "#3d4859" }
      },
      hotspots: [
        { id: "r1", type: "nav", to: "shopfloor", yaw: 176, pitch: -13, label: "Shop floor" },
        { id: "r2", type: "nav", to: "stock", yaw: -80, pitch: -12, label: "Stockroom" },
        { id: "r3", type: "nav", to: "staff", yaw: -34, pitch: -12, label: "Staff room" },
        { id: "r4", type: "nav", to: "mezz", yaw: 40, pitch: 10, label: "Mezzanine" }
      ]
    },
    {
      id: "stock", name: "Stockroom", short: "Stock", kind: "Back of house", floor: "g",
      area: "900 sq ft", capacity: "Racked", ceiling: "3.6 m",
      description: "Racked stockroom with a roller shutter to the service yard.",
      plan: [98, 23], north: -90,
      view: { yaw: -14, pitch: -6, fov: 82 },
      pano: null,
      space: {
        w: 10, h: 3.6, d: 9, eye: 1.62, cam: [0, 2.2], layout: 5, glaze: "none",
        seed: 4.3, exposure: 0.98, city: 1, warm: 0,
        palette: { wall: "#d7d9dc", floor: "#75787d", accent: "#5d0f1c", light: "#ffe3bd", wood: "#96612f", fabric: "#2c3340" }
      },
      hotspots: [
        { id: "k1", type: "nav", to: "run", yaw: 172, pitch: -13, label: "Rear run" },
        {
          id: "k2", type: "info", yaw: 0, pitch: 4, label: "Back of house", icon: "info",
          body: "Racking, roller shutter and the goods-in route — the parts a retail operator " +
            "always asks about and a photographer never shoots.",
          stats: [["Racking", "6 bays"], ["Shutter", "2.6 m"], ["Yard", "Shared"]]
        }
      ]
    },
    {
      id: "staff", name: "Staff Room", short: "Staff", kind: "Welfare", floor: "g",
      area: "260 sq ft", capacity: "8 seated", ceiling: "2.8 m",
      description: "Staff room with a kitchenette, lockers and a window to the yard.",
      plan: [98, 50], north: -90,
      view: { yaw: -22, pitch: -7, fov: 80 },
      pano: null,
      space: {
        w: 6, h: 2.8, d: 6.5, eye: 1.62, cam: [0, 1.6], layout: 2, glaze: "+z",
        seed: 16.8, exposure: 1.06, city: 1, warm: 0.25,
        palette: { wall: "#e7e2da", floor: "#8a7f72", accent: "#7c1a1f", light: "#ffdfb2", wood: "#b8813f", fabric: "#4c5a5a" }
      },
      hotspots: [
        { id: "f1", type: "nav", to: "run", yaw: 168, pitch: -13, label: "Rear run" }
      ]
    },
    {
      id: "mezz", name: "Mezzanine Office", short: "Mezzanine", kind: "Office", floor: "g",
      area: "460 sq ft", capacity: "6 desks", ceiling: "2.5 m",
      description: "Mezzanine office over the back of house, looking down the run.",
      plan: [98, 67], north: -90,
      view: { yaw: 8, pitch: -8, fov: 80 },
      pano: null,
      space: {
        w: 8, h: 2.5, d: 7, eye: 1.62, cam: [0.8, 1.2], layout: 6, glaze: "+z",
        seed: 22.1, exposure: 1.05, city: 1, warm: 0.1,
        palette: { wall: "#e4e6ea", floor: "#87837c", accent: "#213f5c", light: "#ffe8c8", wood: "#c19a6d", fabric: "#42536b" }
      },
      hotspots: [
        { id: "m1", type: "nav", to: "run", yaw: 176, pitch: -16, label: "Down to the run" },
        {
          id: "m2", type: "info", yaw: 0, pitch: 2, label: "Second project", icon: "sparkle",
          body: "This whole building is a second tour running inside the same deployment. It is one " +
            "extra file and one line in index.html — the viewer, the Studio and the branding are shared.",
          stats: [["Files added", "1"], ["Lines changed", "1"], ["Rebuild", "None"]]
        }
      ]
    }
  ]
});
