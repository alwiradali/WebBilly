/* ═══════════════════════════════════════════════════════════════════════════
   RED360 · TOUR DEFINITION
   The entire product is driven by this one object. Nothing about the building,
   the branding or the content lives in the code.

   A room gets its panorama from ONE of two places:
     pano   "panos/atrium.jpg"   a stitched capture — Matterport, Insta360,
                                 Ricoh Theta, any 2:1 equirectangular image
     space  { … }                a synthesised space, ray-marched on the GPU,
                                 so the tour can be built and signed off
                                 before the shoot
   Everything downstream — viewer, hotspots, plan, search, guided tour, CMS —
   behaves identically either way. Moving a room from synthesised to captured
   is one line.
   ═══════════════════════════════════════════════════════════════════════════ */

window.RED360_TOUR = {
  id: "charnwood-house",
  version: 2,

  /* ── WHITE LABEL ────────────────────────────────────────────────────────
     Every colour, name and typeface in the interface resolves from here.
     Nothing is hard-coded. Edit it here, or in Studio → Branding. */
  brand: {
    name: "360RED",
    mark: "360",                 // the part before the accent
    markAccent: "RED",           // the part painted in the accent colour
    sub: "PRODUCTIONS",
    tagline: "Interactive Enterprise Virtual Tours",
    logo: null,                  // data URL or path — replaces the wordmark when set
    accent: "#FF2D46",
    accent2: "#FF7A45",
    bg: "#08080B",
    ink: "#F2F3F5",
    fontDisplay: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontBody: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    credit: "Platform by Billy Digitals",
    creditHref: "/virtual-tour-360"
  },

  /* ── PROJECT ─────────────────────────────────────────────────────────── */
  project: {
    name: "Charnwood House",
    slug: "charnwood-house",
    client: "Confidential · commercial office",
    location: "Leicester, LE1",
    area: "18,500 sq ft",
    floors: 2,
    duration: "11 min",
    captured: "Single shoot day · 1.62 m tripod · levelled horizon",
    summary: "A two-floor commercial headquarters captured end to end — arrival, " +
      "circulation, meeting and event space, the studio floor and the roof terrace. " +
      "Thirteen positions, linked the way the building actually works.",
    facts: [
      ["Footprint", "18,500 sq ft"],
      ["Floors", "2"],
      ["Positions", "13"],
      ["Walkthrough", "11 min"],
      ["Capture", "1 day"],
      ["Delivery", "7 working days"]
    ]
  },

  /* ── GUIDED TOUR ─────────────────────────────────────────────────────── */
  guided: {
    dwell: 9000,
    order: ["reception", "hall-g", "event", "cafe", "board", "atrium", "lounge",
      "studio", "soar", "wreake", "focus", "terrace", "hall-1"]
  },

  /* ── FLOORS ──────────────────────────────────────────────────────────── */
  floors: [
    {
      id: "g", name: "Ground Floor", short: "G",
      plan:
        '<rect class="fp-out" x="6" y="6" width="108" height="68" rx="2"/>' +
        '<rect class="fp-rm" x="6" y="50" width="34" height="24"/>' +
        '<rect class="fp-rm" x="40" y="50" width="36" height="24"/>' +
        '<rect class="fp-rm" x="76" y="50" width="24" height="24"/>' +
        '<rect class="fp-core" x="100" y="50" width="14" height="24"/>' +
        '<rect class="fp-rm fp-hall" x="6" y="40" width="108" height="10"/>' +
        '<rect class="fp-rm" x="6" y="6" width="42" height="34"/>' +
        '<rect class="fp-rm" x="48" y="6" width="32" height="34"/>' +
        '<rect class="fp-rm" x="80" y="6" width="34" height="34"/>' +
        '<path class="fp-glaze" d="M6 74h108"/>' +
        '<path class="fp-stair" d="M102 54h10M102 58h10M102 62h10M102 66h10M102 70h10"/>' +
        '<text class="fp-lb" x="9" y="55">RECEPTION</text>' +
        '<text class="fp-lb" x="43" y="55">SOCIAL / ATRIUM</text>' +
        '<text class="fp-lb" x="79" y="55">LOUNGE</text>' +
        '<text class="fp-lb" x="102" y="55">CORE</text>' +
        '<text class="fp-lb" x="9" y="46">HALLWAY</text>' +
        '<text class="fp-lb" x="9" y="11">EVENT HALL</text>' +
        '<text class="fp-lb" x="51" y="11">CAFÉ</text>' +
        '<text class="fp-lb" x="83" y="11">BOARD ROOM</text>'
    },
    {
      id: "f1", name: "First Floor", short: "01",
      plan:
        '<rect class="fp-out" x="6" y="6" width="108" height="68" rx="2"/>' +
        '<rect class="fp-rm" x="6" y="6" width="56" height="34"/>' +
        '<rect class="fp-rm" x="62" y="6" width="26" height="18"/>' +
        '<rect class="fp-rm" x="62" y="24" width="26" height="16"/>' +
        '<rect class="fp-rm" x="88" y="6" width="26" height="34"/>' +
        '<rect class="fp-rm fp-hall" x="6" y="40" width="108" height="10"/>' +
        '<rect class="fp-rm fp-open" x="6" y="50" width="70" height="24"/>' +
        '<rect class="fp-rm" x="76" y="50" width="24" height="24"/>' +
        '<rect class="fp-core" x="100" y="50" width="14" height="24"/>' +
        '<path class="fp-glaze" d="M6 74h70M114 6v68"/>' +
        '<path class="fp-stair" d="M102 54h10M102 58h10M102 62h10M102 66h10M102 70h10"/>' +
        '<text class="fp-lb" x="9" y="11">STUDIO FLOOR</text>' +
        '<text class="fp-lb" x="65" y="11">SOAR</text>' +
        '<text class="fp-lb" x="65" y="29">WREAKE</text>' +
        '<text class="fp-lb" x="91" y="11">FOCUS BOOTHS</text>' +
        '<text class="fp-lb" x="9" y="46">HALLWAY</text>' +
        '<text class="fp-lb" x="9" y="55">SKYLINE TERRACE</text>' +
        '<text class="fp-lb" x="79" y="55">PLANT</text>' +
        '<text class="fp-lb" x="102" y="55">CORE</text>'
    }
  ],

  /* ── ROOMS ───────────────────────────────────────────────────────────── */
  rooms: [
    /* ══ GROUND ══ */
    {
      id: "reception", name: "Reception", short: "Reception", kind: "Arrival", floor: "g",
      area: "1,240 sq ft", capacity: "Host desk + 8 seated", ceiling: "3.6 m",
      description: "The arrival sequence: host desk, brand wall and a waiting lounge under " +
        "full-height glazing. The first position most visitors land on, and the one that " +
        "carries the brochure, the enquiry form and the welcome video in a live deployment.",
      plan: [23, 62], north: -90,
      view: { yaw: 24, pitch: -6, fov: 78 },
      pano: null,
      space: {
        w: 11.5, h: 3.6, d: 9.5, eye: 1.62, cam: [0, 0.2], layout: 0, glaze: "+z",
        seed: 3.1, exposure: 1.06, city: 1, warm: 0,
        palette: { wall: "#dfe3ea", floor: "#8e9198", accent: "#16325f", light: "#ffe6c4", wood: "#b78448", fabric: "#44506a" }
      },
      hotspots: [
        { id: "r1", type: "nav", to: "hall-g", yaw: 168, pitch: -13, label: "Hallway" },
        { id: "r2", type: "nav", to: "atrium", yaw: -112, pitch: -12, label: "Social Atrium" },
        {
          id: "r3", type: "info", yaw: -4, pitch: 14, label: "Brand wall", icon: "sparkle",
          body: "The reception headwall is the most-clicked hotspot in almost every tour we build. " +
            "In a live deployment it carries a looping brand film, a downloadable brochure and a " +
            "'book a viewing' form that lands in the client's inbox.",
          stats: [["Hotspot types", "Nav · Info · Image · Video · Doc · Link"], ["Panorama", "8K equirectangular"]]
        },
        {
          id: "r4", type: "image", yaw: 96, pitch: -4, label: "Flat panorama", icon: "image",
          src: "@equirect",
          body: "The same position as a flat 2:1 equirectangular frame — exactly what comes off " +
            "the rig after stitching, before it is wrapped back onto the sphere."
        },
        {
          id: "r5", type: "doc", yaw: 62, pitch: 6, label: "Capture spec", icon: "doc",
          body: "Every position in this building was shot to the same standard, which is what stops " +
            "a walkthrough lurching as you move between rooms.",
          stats: [["Tripod height", "1.62 m"], ["Horizon", "Levelled"], ["Nadir", "Patched"],
          ["Exposure", "HDR bracketed"], ["White balance", "Matched room to room"], ["Delivery", "WebP + JPEG + masters"]]
        }
      ]
    },
    {
      id: "hall-g", name: "Ground Hallway", short: "Hallway", kind: "Circulation", floor: "g",
      area: "480 sq ft", capacity: "Circulation spine", ceiling: "2.9 m",
      description: "The spine of the ground floor. Timber battens one side, meeting-room doors the " +
        "other, and a glazed end elevation that pulls daylight the length of the run.",
      plan: [60, 45], north: -90,
      view: { yaw: 4, pitch: -4, fov: 82 },
      pano: null,
      space: {
        w: 3.4, h: 2.9, d: 16, eye: 1.62, cam: [0, 1.2], layout: 9, glaze: "+z",
        seed: 6.6, exposure: 1.04, city: 1, warm: 0,
        palette: { wall: "#e3e6eb", floor: "#84878e", accent: "#7d1420", light: "#ffe8cc", wood: "#a5713c", fabric: "#3d4859" }
      },
      hotspots: [
        { id: "h1", type: "nav", to: "reception", yaw: 176, pitch: -13, label: "Reception" },
        { id: "h2", type: "nav", to: "event", yaw: 88, pitch: -11, label: "Event Hall" },
        { id: "h3", type: "nav", to: "cafe", yaw: -84, pitch: -11, label: "Café" },
        { id: "h4", type: "nav", to: "board", yaw: -26, pitch: -12, label: "Board Room" },
        { id: "h5", type: "nav", to: "atrium", yaw: 132, pitch: -12, label: "Social Atrium" },
        {
          id: "h6", type: "info", yaw: 0, pitch: 8, label: "Why shoot corridors", icon: "info",
          body: "Most tours skip circulation and feel like a slideshow of rooms because of it. " +
            "Capturing the hallways is what makes a building read as a building — you arrive " +
            "somewhere rather than teleporting.",
          stats: [["Run", "16 m"], ["Clear width", "3.4 m"], ["Positions", "1 per 16 m"]]
        }
      ]
    },
    {
      id: "atrium", name: "Social Atrium", short: "Atrium", kind: "Social Area", floor: "g",
      area: "2,150 sq ft", capacity: "120 standing", ceiling: "6.6 m",
      description: "A double-height social heart with a tiered stair that doubles as all-hands " +
        "seating, a mezzanine walkway above and a lounge cluster under the glazing.",
      plan: [58, 62], north: -90,
      view: { yaw: 12, pitch: -7, fov: 84 },
      pano: null,
      space: {
        w: 14, h: 6.6, d: 12.5, eye: 1.62, cam: [0, 2.4], layout: 1, glaze: "+z",
        seed: 11.7, exposure: 1.02, city: 1, warm: 0,
        palette: { wall: "#e4e7ec", floor: "#7f8288", accent: "#8d1424", light: "#ffe8cb", wood: "#b0783f", fabric: "#455873" }
      },
      hotspots: [
        { id: "a1", type: "nav", to: "reception", yaw: 178, pitch: -14, label: "Reception" },
        { id: "a2", type: "nav", to: "cafe", yaw: -70, pitch: -12, label: "Café" },
        { id: "a3", type: "nav", to: "lounge", yaw: -128, pitch: -12, label: "Lounge" },
        { id: "a4", type: "nav", to: "studio", yaw: 18, pitch: 12, label: "Up to Studio" },
        {
          id: "a5", type: "info", yaw: 0, pitch: -22, label: "Social stair", icon: "info",
          body: "Tiered seating for all-hands, product demos and Friday drinks. Because the tour is " +
            "a graph rather than a slideshow, the stair links straight up to the first floor — " +
            "visitors travel the way the building is actually used.",
          stats: [["Void height", "6.6 m"], ["All-hands", "120 standing"], ["Links", "4 positions"]]
        },
        {
          id: "a6", type: "link", yaw: 92, pitch: 2, label: "How this was built", icon: "link",
          href: "/virtual-tour-360",
          body: "Capture, stitching, hotspot design, hosting and hand-over — the full service behind this tour."
        }
      ]
    },
    {
      id: "cafe", name: "The Café", short: "Café", kind: "Hospitality", floor: "g",
      area: "1,480 sq ft", capacity: "48 seated", ceiling: "3.4 m",
      description: "Barista counter, two coffee stations and a servery that opens through to the " +
        "event hall for catering. Communal tables and bar seating along the glazed elevation.",
      plan: [64, 23], north: -90,
      view: { yaw: -26, pitch: -7, fov: 80 },
      pano: null,
      space: {
        w: 12.5, h: 3.4, d: 10.5, eye: 1.62, cam: [0.4, 1.9], layout: 2, glaze: "+z",
        seed: 5.4, exposure: 1.05, city: 1, warm: 0.15,
        palette: { wall: "#e7e2da", floor: "#8a7f72", accent: "#7c1a1f", light: "#ffdfb2", wood: "#b8813f", fabric: "#4c5a5a" }
      },
      hotspots: [
        { id: "c1", type: "nav", to: "hall-g", yaw: 150, pitch: -13, label: "Hallway" },
        { id: "c2", type: "nav", to: "atrium", yaw: -100, pitch: -12, label: "Social Atrium" },
        {
          id: "c3", type: "info", yaw: 2, pitch: 2, label: "Servery", icon: "info",
          body: "The counter opens for events, so catering runs straight through to the hall without " +
            "crossing the visitor route. Info hotspots carry copy, specs and a call to action — all " +
            "editable in Studio without touching code.",
          stats: [["Covers", "48 seated"], ["Servery", "Opens to Event Hall"], ["Power", "12 × twin sockets"]]
        }
      ]
    },
    {
      id: "lounge", name: "The Lounge", short: "Lounge", kind: "Breakout", floor: "g",
      area: "820 sq ft", capacity: "18 seated", ceiling: "3.2 m",
      description: "A quiet, warm breakout off the atrium: facing sofas, low table, library wall and " +
        "soft lighting. The room clients are taken to before a pitch.",
      plan: [88, 62], north: -90,
      view: { yaw: -8, pitch: -7, fov: 80 },
      pano: null,
      space: {
        w: 9, h: 3.2, d: 8.5, eye: 1.62, cam: [0, 2.2], layout: 10, glaze: "+x",
        seed: 17.2, exposure: 1.07, city: 1, warm: 0.35,
        palette: { wall: "#e6ded2", floor: "#8b7d6d", accent: "#6f1a20", light: "#ffd9a4", wood: "#a86f38", fabric: "#57493f" }
      },
      hotspots: [
        { id: "l1", type: "nav", to: "atrium", yaw: 172, pitch: -13, label: "Social Atrium" },
        {
          id: "l2", type: "info", yaw: 0, pitch: 4, label: "Warm capture", icon: "sparkle",
          body: "Shot late in the day with the lamps on. Time of day is a creative decision, not an " +
            "accident — the same room can be captured twice and switched from a single hotspot.",
          stats: [["Seats", "18"], ["Capture", "Golden hour"], ["Acoustic", "Class C ceiling"]]
        }
      ]
    },
    {
      id: "event", name: "Event Hall", short: "Events", kind: "Event Space", floor: "g",
      area: "3,400 sq ft", capacity: "180 theatre · 120 cabaret", ceiling: "4.8 m",
      description: "The dedicated event space: 5 m LED wall, two rigged truss lines, blackout " +
        "glazing and a mobile bar fed from the café servery.",
      plan: [27, 23], north: -90,
      view: { yaw: 18, pitch: -5, fov: 84 },
      pano: null,
      space: {
        w: 17, h: 4.8, d: 15, eye: 1.62, cam: [0, 5.0], layout: 3, glaze: "+x",
        seed: 21.3, exposure: 0.98, city: 1, warm: 0,
        palette: { wall: "#cfd5df", floor: "#6f7480", accent: "#5d0f1c", light: "#ffe3bd", wood: "#96612f", fabric: "#2c3340" }
      },
      hotspots: [
        { id: "e1", type: "nav", to: "hall-g", yaw: 168, pitch: -13, label: "Hallway" },
        {
          id: "e2", type: "info", yaw: 0, pitch: 8, label: "Stage & LED wall", icon: "info",
          body: "Event spaces are where a tour earns its fee. Organisers walk the room, check " +
            "sightlines from the back row and count the rig without a site visit.",
          stats: [["Theatre", "180"], ["Cabaret", "120"], ["Ceiling", "4.8 m"], ["Rig", "2 × truss lines"], ["LED wall", "5 m"]]
        },
        {
          id: "e3", type: "video", yaw: -140, pitch: -6, label: "Event showreel", icon: "play",
          src: null,
          body: "A media slot. Drop an MP4, a YouTube or a Vimeo link into this hotspot in Studio " +
            "and it plays here, in the room, without leaving the tour."
        },
        {
          id: "e4", type: "doc", yaw: -78, pitch: -4, label: "Layout pack", icon: "doc",
          body: "Seating plans, rigging points and power drops, attached to the space they describe.",
          stats: [["Theatre", "180 seats · 12 rows"], ["Cabaret", "15 × tables of 8"], ["Dining", "140 covers"],
          ["Power", "3 × 32 A single phase"], ["Rigging", "500 kg per truss line"]]
        }
      ]
    },
    {
      id: "board", name: "Board Room", short: "Board", kind: "Meeting", floor: "g",
      area: "640 sq ft", capacity: "12 around the table", ceiling: "3.2 m",
      description: "Twelve around a solid oak table, 98-inch display, ceiling array microphones and " +
        "oak acoustic battens across the return wall.",
      plan: [97, 23], north: -90,
      view: { yaw: 20, pitch: -8, fov: 76 },
      pano: null,
      space: {
        w: 9, h: 3.2, d: 11, eye: 1.62, cam: [0, 3.0], layout: 4, glaze: "+z",
        seed: 8.8, exposure: 1.03, city: 1, warm: 0.1,
        palette: { wall: "#dcd7cf", floor: "#7a6f62", accent: "#4a1220", light: "#ffdcae", wood: "#7d5029", fabric: "#3f3a56" }
      },
      hotspots: [
        { id: "b1", type: "nav", to: "hall-g", yaw: 176, pitch: -14, label: "Hallway" },
        {
          id: "b2", type: "info", yaw: 0, pitch: 6, label: "AV & acoustics", icon: "info",
          body: "Everything a facilities team asks about, answered before the viewing.",
          stats: [["Seats", "12"], ["Display", "98\""], ["Audio", "Ceiling array"], ["Acoustic", "NRC 0.75 battens"]]
        }
      ]
    },

    /* ══ FIRST ══ */
    {
      id: "hall-1", name: "First Floor Hallway", short: "Hallway 01", kind: "Circulation", floor: "f1",
      area: "480 sq ft", capacity: "Circulation spine", ceiling: "2.85 m",
      description: "The upper spine, linking the studio floor to the meeting rooms, the focus " +
        "booths and the terrace.",
      plan: [60, 45], north: -90,
      view: { yaw: -6, pitch: -4, fov: 82 },
      pano: null,
      space: {
        w: 3.4, h: 2.85, d: 16, eye: 1.62, cam: [0, -1.4], layout: 9, glaze: "-z",
        seed: 13.9, exposure: 1.05, city: 1, warm: 0.08,
        palette: { wall: "#e5e1da", floor: "#87817a", accent: "#7d1420", light: "#ffe4c0", wood: "#a5713c", fabric: "#3d4859" }
      },
      hotspots: [
        { id: "n1", type: "nav", to: "studio", yaw: 172, pitch: -13, label: "Studio Floor" },
        { id: "n2", type: "nav", to: "soar", yaw: 86, pitch: -11, label: "Soar" },
        { id: "n3", type: "nav", to: "wreake", yaw: 52, pitch: -11, label: "Wreake" },
        { id: "n4", type: "nav", to: "focus", yaw: -30, pitch: -12, label: "Focus Booths" },
        { id: "n5", type: "nav", to: "terrace", yaw: -104, pitch: -12, label: "Terrace" }
      ]
    },
    {
      id: "studio", name: "Studio Floor", short: "Studio", kind: "Workspace", floor: "f1",
      area: "6,100 sq ft", capacity: "96 desks", ceiling: "2.9 m clear",
      description: "Ninety-six sit-stand desks on a 1,500 mm grid, raised floor, glazing on both " +
        "long elevations and a glass meeting pod in the corner.",
      plan: [34, 23], north: -90,
      view: { yaw: -24, pitch: -7, fov: 84 },
      pano: null,
      space: {
        w: 19, h: 3.5, d: 15, eye: 1.62, cam: [1.6, 1.3], layout: 5, glaze: "+z",
        seed: 2.2, exposure: 1.04, city: 1, warm: 0,
        palette: { wall: "#e2e6ec", floor: "#87837c", accent: "#7a1220", light: "#ffe8c8", wood: "#c19a6d", fabric: "#42536b" }
      },
      hotspots: [
        { id: "s1", type: "nav", to: "hall-1", yaw: 168, pitch: -13, label: "Hallway" },
        { id: "s2", type: "nav", to: "atrium", yaw: 118, pitch: -16, label: "Down to Atrium" },
        { id: "s3", type: "nav", to: "terrace", yaw: 74, pitch: -12, label: "Terrace" },
        {
          id: "s4", type: "info", yaw: 0, pitch: 10, label: "Floor spec", icon: "info",
          body: "Measurements taken from the survey, not estimated from the photograph — the tour and " +
            "the drawing pack agree, which is the entire point of doing it properly.",
          stats: [["Desks", "96"], ["Clear height", "2.9 m"], ["Grid", "1.5 m"], ["Raised floor", "150 mm"], ["Occupancy", "1:8 m²"]]
        }
      ]
    },
    {
      id: "soar", name: "Meeting Room · Soar", short: "Soar", kind: "Meeting", floor: "f1",
      area: "320 sq ft", capacity: "8 seated", ceiling: "3.0 m",
      description: "One of six meeting rooms, all named after Leicestershire rivers. Eight seats, " +
        "75-inch display, full-height glazing to the studio floor.",
      plan: [75, 15], north: -90,
      view: { yaw: 22, pitch: -8, fov: 76 },
      pano: null,
      space: {
        w: 6.6, h: 3.0, d: 7.8, eye: 1.62, cam: [0, 2.2], layout: 6, glaze: "+z",
        seed: 14.2, exposure: 1.05, city: 1, warm: 0.08,
        palette: { wall: "#e6e1d8", floor: "#8b8078", accent: "#6d1420", light: "#ffe1b6", wood: "#a96f38", fabric: "#3d5063" }
      },
      hotspots: [
        { id: "so1", type: "nav", to: "hall-1", yaw: 176, pitch: -14, label: "Hallway" },
        { id: "so2", type: "nav", to: "wreake", yaw: -96, pitch: -13, label: "Wreake" },
        {
          id: "so3", type: "info", yaw: 0, pitch: 4, label: "Room booking", icon: "info",
          body: "In a live deployment this hotspot is wired to the room-booking system, so a visitor " +
            "can hold the room from inside the tour.",
          stats: [["Seats", "8"], ["Display", "75\""], ["Glazed", "Full height"], ["Booking", "Outlook / Google"]]
        }
      ]
    },
    {
      id: "wreake", name: "Meeting Room · Wreake", short: "Wreake", kind: "Meeting", floor: "f1",
      area: "240 sq ft", capacity: "6 seated", ceiling: "3.0 m",
      description: "The smaller of the pair — six seats, video-first, acoustic battens on the return " +
        "wall and a planted corner.",
      plan: [75, 32], north: -90,
      view: { yaw: 14, pitch: -8, fov: 76 },
      pano: null,
      space: {
        w: 5.6, h: 3.0, d: 6.6, eye: 1.62, cam: [0, 1.9], layout: 6, glaze: "+z",
        seed: 23.5, exposure: 1.06, city: 1, warm: 0.2,
        palette: { wall: "#e2e6e0", floor: "#7f857e", accent: "#1f4438", light: "#ffe3ba", wood: "#9d6b39", fabric: "#3a5148" }
      },
      hotspots: [
        { id: "w1", type: "nav", to: "hall-1", yaw: 176, pitch: -14, label: "Hallway" },
        { id: "w2", type: "nav", to: "soar", yaw: -88, pitch: -13, label: "Soar" },
        {
          id: "w3", type: "info", yaw: 0, pitch: 3, label: "Video-first", icon: "info",
          body: "Camera at eye height, acoustic treatment behind the participants and no window " +
            "directly behind the screen — a room designed to be joined remotely.",
          stats: [["Seats", "6"], ["Display", "65\""], ["Camera", "Eye-height bar"]]
        }
      ]
    },
    {
      id: "focus", name: "Focus Booths", short: "Focus", kind: "Quiet Zone", floor: "f1",
      area: "520 sq ft", capacity: "4 booths + lounge", ceiling: "3.2 m",
      description: "Four upholstered booths for calls and heads-down work, plus a soft lounge. The " +
        "kind of small enclosed space flat photography cannot describe.",
      plan: [101, 23], north: -90,
      view: { yaw: -18, pitch: -6, fov: 80 },
      pano: null,
      space: {
        w: 10.5, h: 3.2, d: 8.5, eye: 1.62, cam: [0, 2.1], layout: 7, glaze: "+x",
        seed: 19.6, exposure: 1.05, city: 1, warm: 0.1,
        palette: { wall: "#e3ded6", floor: "#867c74", accent: "#4a2036", light: "#ffe2ba", wood: "#a46c37", fabric: "#4b3f57" }
      },
      hotspots: [
        { id: "f1", type: "nav", to: "hall-1", yaw: 170, pitch: -13, label: "Hallway" },
        { id: "f2", type: "nav", to: "terrace", yaw: -88, pitch: -12, label: "Terrace" },
        {
          id: "f3", type: "info", yaw: 0, pitch: 2, label: "Acoustic pods", icon: "info",
          body: "Small rooms are exactly where 360 earns its fee over flat photography — you can feel " +
            "the enclosure, judge the width, see the seat.",
          stats: [["Booths", "4"], ["Absorption", "Class C"], ["Power", "USB-C at every seat"]]
        }
      ]
    },
    {
      id: "terrace", name: "Skyline Terrace", short: "Terrace", kind: "Outdoor", floor: "f1",
      area: "1,150 sq ft", capacity: "70 standing", ceiling: "Open · pergola",
      description: "A roof terrace with a heated pergola, planted edge, fire table and glass " +
        "balustrade to the city. Captured at golden hour.",
      plan: [41, 62], north: -90,
      view: { yaw: 158, pitch: -4, fov: 86 },
      pano: null,
      space: {
        w: 15, h: 3.1, d: 9.5, eye: 1.62, cam: [0, 1.6], layout: 8, open: true, glaze: "+z", glaze2: "+x",
        seed: 27.4, exposure: 1.10, city: 1, warm: 1,
        palette: { wall: "#d8cfc4", floor: "#7d7268", accent: "#5a2f24", light: "#ffcf8f", wood: "#9c6531", fabric: "#4a4038" }
      },
      hotspots: [
        { id: "t1", type: "nav", to: "focus", yaw: 176, pitch: -14, label: "Focus Booths" },
        { id: "t2", type: "nav", to: "studio", yaw: -120, pitch: -13, label: "Studio Floor" },
        {
          id: "t3", type: "info", yaw: 0, pitch: 6, label: "Golden hour", icon: "sparkle",
          body: "Terraces and event spaces sell on atmosphere, so we shoot them when they look their " +
            "best and switch between times of day from a single hotspot.",
          stats: [["Standing", "70"], ["Capture", "2 × time of day"], ["Pergola", "Heated"], ["Balustrade", "Structural glass"]]
        },
        {
          id: "t4", type: "image", yaw: 82, pitch: 0, label: "Flat panorama", icon: "image",
          src: "@equirect",
          body: "The terrace as a flat equirectangular frame. Open roofs are the hardest thing to " +
            "stitch cleanly — there is no ceiling to hide the seam in."
        }
      ]
    }
  ]
};

/* Register on the project list. Every project file ends with this line. */
(window.RED360_TOURS = window.RED360_TOURS || []).push(window.RED360_TOUR);
