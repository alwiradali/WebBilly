/* ═══════════════════════════════════════════════════════════════════════════
   A PORTFOLIO OF PROPERTIES
   An estate agency does not have one building, it has a list that changes
   every week. This file is what that looks like: a compact table of homes at
   the bottom, and a small builder that turns each row into a full tour.

   Adding a listing is one row. Nothing else in the platform changes.

   The `space` blocks here are placeholders — synthesised rooms so the listing
   is walkable the day it goes live, before the photographer has been. When the
   real 360° captures come back, set `pano: "panos/<file>.jpg"` on each room and
   the placeholder is gone. Everything else — plan, hotspots, guided tour,
   portfolio card — carries straight over.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {

  /* the agency's own branding — nothing to do with 360RED's */
  var AGENCY = {
    name: "MERIDIAN", mark: "MERI", markAccent: "DIAN", sub: "RESIDENTIAL",
    tagline: "Virtual viewings, any hour",
    logo: null,
    accent: "#C8A159", accent2: "#E4C88B", bg: "#0B0C0E", ink: "#F4F2EE",
    fontDisplay: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontBody: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    credit: "Platform by Billy Digitals", creditHref: "/virtual-tour-360"
  };

  var AGENT = {
    name: "Meridian Residential",
    phone: "0116 000 0000",
    email: "viewings@example.co.uk",
    url: ""
  };

  /* ── room recipes ───────────────────────────────────────────────────────
     Each entry is [layout, width, height, depth, glazed face, warmth].
     The layout only decides which furniture set the placeholder draws.      */
  var RECIPE = {
    hall: [0, 3.2, 2.6, 5.4, "-z", 0.15],
    living: [10, 5.4, 2.6, 6.4, "+z", 0.35],
    kitchen: [2, 4.6, 2.5, 6.2, "+z", 0.2],
    dining: [2, 4.0, 2.5, 4.4, "+x", 0.3],
    master: [10, 4.4, 2.5, 4.8, "+z", 0.4],
    bed2: [10, 3.4, 2.5, 3.8, "+z", 0.4],
    bath: [6, 2.4, 2.4, 3.0, "+z", 0.1],
    study: [6, 3.0, 2.5, 3.4, "+z", 0.25],
    garden: [8, 11.0, 3.0, 8.0, "none", 0.75],
    landing: [9, 2.6, 2.5, 5.0, "none", 0.15]
  };

  var LABEL = {
    hall: ["Entrance Hall", "Hall", "Arrival"],
    living: ["Living Room", "Living", "Reception"],
    kitchen: ["Kitchen / Diner", "Kitchen", "Kitchen"],
    dining: ["Dining Room", "Dining", "Reception"],
    master: ["Principal Bedroom", "Principal", "Bedroom"],
    bed2: ["Bedroom Two", "Bed 2", "Bedroom"],
    bath: ["Family Bathroom", "Bathroom", "Bathroom"],
    study: ["Study", "Study", "Home office"],
    garden: ["Rear Garden", "Garden", "Outside"],
    landing: ["Landing", "Landing", "Circulation"]
  };

  /* a warm domestic palette, varied a little per property so the placeholder
     tours do not all look like the same house */
  var WARM = [
    { wall: "#efece6", floor: "#a0988c", accent: "#7b5a34", light: "#ffe6bd", wood: "#c1975c", fabric: "#5b5348" },
    { wall: "#f1efe9", floor: "#9c9086", accent: "#6a5946", light: "#ffe8c6", wood: "#c9a06a", fabric: "#4f5a5c" },
    { wall: "#eceae6", floor: "#918a80", accent: "#5c5346", light: "#ffe4bb", wood: "#b98f56", fabric: "#5a4f4a" },
    { wall: "#f3f0ea", floor: "#a2988c", accent: "#7a6247", light: "#ffeac9", wood: "#cda772", fabric: "#525d63" }
  ];
  function palette(seed) {
    var p = WARM[((seed | 0) % WARM.length + WARM.length) % WARM.length];
    return { wall: p.wall, floor: p.floor, accent: p.accent, light: p.light, wood: p.wood, fabric: p.fabric };
  }

  function makeRoom(key, i, seedBase, floorId) {
    var r = RECIPE[key], l = LABEL[key];
    var pos = [[22, 60], [50, 60], [82, 60], [22, 24], [50, 24], [82, 24], [66, 42]][i % 7];
    return {
      id: key,
      name: l[0], short: l[1], kind: l[2], floor: floorId,
      area: "", capacity: "", ceiling: r[2].toFixed(1) + " m",
      description: "",
      plan: pos, north: -90,
      view: { yaw: (i * 37) % 360 - 180, pitch: -6, fov: 82 },
      pano: null,                      /* ← the real capture goes here */
      space: {
        w: r[1], h: r[2], d: r[3], eye: 1.55, cam: [0, 0],
        layout: r[0], glaze: r[4] === "none" ? "none" : r[4],
        open: key === "garden", city: 0, warm: r[5],
        seed: +(seedBase + i * 3.7).toFixed(1), exposure: 1.05,
        palette: palette(seedBase | 0)
      },
      hotspots: []
    };
  }

  /* every room links back to the hall, and the hall links to everything —
     the shape a small house actually walks in */
  function linkRooms(rooms) {
    var hub = rooms[0];
    rooms.slice(1).forEach(function (r, i) {
      var yaw = -140 + (i * (280 / Math.max(1, rooms.length - 1)));
      hub.hotspots.push({ id: "to-" + r.id, type: "nav", to: r.id, yaw: yaw, pitch: -13, label: r.short });
      r.hotspots.push({ id: "back-" + r.id, type: "nav", to: hub.id, yaw: 176, pitch: -14, label: hub.short });
    });
    return rooms;
  }

  function buildHome(h) {
    var gl = planLabels(h.rooms, "g");
    var floors = [{
      id: "g", name: "Ground Floor", short: "G",
      plan: planSvg(h.seed + h.rooms.length, "Ground", gl[0], gl[1], !!h.upstairs)
    }];
    if (h.upstairs) {
      var fl = planLabels(h.rooms, "f1");
      floors.push({
        id: "f1", name: "First Floor", short: "01",
        plan: planSvg(h.seed + 7, "First", fl[0], fl[1].length ? fl[1] : ["EN-SUITE", "STORE"], true)
      });
    }

    var upstairsKeys = { master: 1, bed2: 1, bath: 1, landing: 1 };
    var rooms = linkRooms(h.rooms.map(function (key, i) {
      return makeRoom(key, i, h.seed, (h.upstairs && upstairsKeys[key]) ? "f1" : "g");
    }));

    return {
      id: h.id,
      version: 2,
      brand: AGENCY,
      project: {
        name: h.name, slug: h.id,
        client: "Meridian Residential",
        location: h.location,
        area: h.area,
        floors: floors.length,
        duration: Math.max(2, Math.round(rooms.length * 0.7)) + " min",
        captured: h.captured || "Placeholder tour · awaiting capture",
        summary: h.summary,
        /* ── the listing card ── */
        price: h.price,
        priceQualifier: h.qualifier || "",
        status: h.status,
        beds: h.beds, baths: h.baths, receptions: h.receptions,
        propertyType: h.type,
        tenure: h.tenure,
        epc: h.epc,
        ref: h.ref,
        cover: h.cover || "living",
        agent: AGENT,
        hidden: !!h.hidden,
        facts: [
          ["Price", h.price],
          ["Bedrooms", String(h.beds)],
          ["Bathrooms", String(h.baths)],
          ["Type", h.type],
          ["Tenure", h.tenure],
          ["EPC", h.epc]
        ]
      },
      guided: { dwell: 7000, order: rooms.map(function (r) { return r.id; }) },
      floors: floors,
      rooms: rooms
    };
  }

  /* A domestic plan drawn from the property's own shape, so no two listings
     have the same card. Replaced the moment the agency uploads the real floor
     plan in Studio → Floor plans. */
  function planSvg(seed, label, top, bottom, stairs) {
    var rnd = (function (n) { return function () { n = (n * 1103515245 + 12345) & 0x7fffffff; return n / 0x7fffffff; }; })(seed * 977 + 13);
    var out = ['<rect class="fp-out" x="6" y="6" width="108" height="68" rx="2"/>'];

    function band(y, h, cells, labels) {
      var x = 6, left = 108, i;
      var widths = [];
      for (i = 0; i < cells; i++) {
        var share = (0.7 + rnd() * 0.6) / cells;
        widths.push(Math.max(16, Math.round(108 * share)));
      }
      var total = widths.reduce(function (a, b) { return a + b; }, 0);
      widths = widths.map(function (w) { return Math.round(w * 108 / total); });
      widths[widths.length - 1] = 108 - widths.slice(0, -1).reduce(function (a, b) { return a + b; }, 0);
      for (i = 0; i < cells; i++) {
        out.push('<rect class="fp-rm" x="' + x + '" y="' + y + '" width="' + widths[i] + '" height="' + h + '"/>');
        if (labels && labels[i]) out.push('<text class="fp-lb" x="' + (x + 3) + '" y="' + (y + 5) + '">' + labels[i] + "</text>");
        x += widths[i];
        left -= widths[i];
      }
    }

    band(6, 32, top.length, top);
    out.push('<rect class="fp-rm fp-hall" x="6" y="38" width="108" height="9"/>');
    out.push('<text class="fp-lb" x="9" y="44">HALL</text>');
    band(47, 27, bottom.length, bottom);
    out.push('<path class="fp-glaze" d="M6 74h' + (44 + Math.round(rnd() * 40)) + '"/>');
    /* the stair run only exists where there is a floor to reach */
    if (stairs) out.push('<path class="fp-stair" d="M98 52h13M98 56h13M98 60h13M98 64h13M98 68h13"/>');
    return out.join("");
  }
  /* the labels each plan carries, taken from the rooms the property actually has */
  function planLabels(keys, floorId) {
    var up = { master: 1, bed2: 1, bath: 1, landing: 1 };
    var mine = keys.filter(function (k) {
      if (k === "hall" || k === "landing") return false;   /* the hall has its own strip */
      return floorId === "f1" ? up[k] : !up[k];
    });
    var names = mine.map(function (k) { return (LABEL[k] || [k])[1].toUpperCase(); });
    var half = Math.ceil(names.length / 2);
    return [names.slice(0, half), names.slice(half)];
  }

  /* ═════════════════════════════════════════════════════════════════════════
     THE LISTINGS
     One row per property. This is the only part an agency ever touches.
     ═════════════════════════════════════════════════════════════════════════ */
  var HOMES = [
    {
      id: "willow-lane-12", name: "12 Willow Lane", location: "Stoneygate, Leicester LE2",
      price: "£465,000", status: "For sale", beds: 4, baths: 2, receptions: 2,
      type: "Detached house", tenure: "Freehold", epc: "C", ref: "MER-1042",
      area: "1,640 sq ft", seed: 3, upstairs: true, cover: "living",
      captured: "Captured 4 Aug · 8 positions",
      summary: "A four-bedroom detached on a quiet lane, with a through living room, " +
        "a rear kitchen-diner opening onto the garden, and a converted study off the hall.",
      rooms: ["hall", "living", "kitchen", "study", "landing", "master", "bed2", "bath", "garden"]
    },
    {
      id: "granby-court-7", name: "Apartment 7, Granby Court", location: "City Centre, Leicester LE1",
      price: "£1,250 pcm", qualifier: "per calendar month", status: "To let",
      beds: 2, baths: 2, receptions: 1,
      type: "Apartment", tenure: "Leasehold", epc: "B", ref: "MER-2210",
      area: "780 sq ft", seed: 1, upstairs: false, cover: "living",
      captured: "Captured 29 Jul · 5 positions",
      summary: "Two double bedrooms, both en-suite, on the fourth floor of a converted " +
        "warehouse. Open-plan living with the original cast-iron columns left exposed.",
      rooms: ["hall", "living", "kitchen", "master", "bed2", "bath"]
    },
    {
      id: "thurnby-rise-3", name: "3 Thurnby Rise", location: "Thurnby, Leicester LE7",
      price: "£729,950", status: "For sale", beds: 5, baths: 3, receptions: 3,
      type: "Detached house", tenure: "Freehold", epc: "B", ref: "MER-1088",
      area: "2,410 sq ft", seed: 2, upstairs: true, cover: "kitchen",
      captured: "Captured 1 Aug · 10 positions",
      summary: "A five-bedroom family house on a third of an acre. Triple-aspect kitchen-diner, " +
        "separate dining room, home office, and a west-facing garden that holds the sun until late.",
      rooms: ["hall", "living", "kitchen", "dining", "study", "landing", "master", "bed2", "bath", "garden"]
    },
    {
      id: "kirby-mews-2", name: "2 Kirby Mews", location: "Kirby Muxloe, Leicester LE9",
      price: "£315,000", status: "Under offer", beds: 3, baths: 1, receptions: 1,
      type: "Semi-detached", tenure: "Freehold", epc: "D", ref: "MER-0977",
      area: "1,020 sq ft", seed: 0, upstairs: true, cover: "living",
      captured: "Captured 21 Jul · 6 positions",
      summary: "Three bedrooms in a small mews of six. Recently rewired, with a long rear " +
        "garden and a garage on a separate title.",
      rooms: ["hall", "living", "kitchen", "landing", "master", "bed2", "bath", "garden"]
    },
    {
      id: "abbey-wharf-14", name: "14 Abbey Wharf", location: "Abbey Park, Leicester LE4",
      price: "£950 pcm", qualifier: "per calendar month", status: "Let agreed",
      beds: 1, baths: 1, receptions: 1,
      type: "Apartment", tenure: "Leasehold", epc: "C", ref: "MER-2185",
      area: "540 sq ft", seed: 1, upstairs: false, cover: "living",
      captured: "Captured 18 Jul · 4 positions",
      summary: "A one-bedroom canal-side flat with a balcony over the water. Small, but the " +
        "living room takes the light all afternoon.",
      rooms: ["hall", "living", "kitchen", "master", "bath"]
    },
    {
      id: "oadby-grange", name: "The Grange, Oadby", location: "Oadby, Leicester LE2",
      price: "£1,150,000", qualifier: "guide price", status: "Coming soon",
      beds: 6, baths: 4, receptions: 4,
      type: "Detached house", tenure: "Freehold", epc: "C", ref: "MER-1101",
      area: "4,180 sq ft", seed: 3, upstairs: true, cover: "living",
      captured: "Booked for capture · listing not yet public",
      hidden: true,
      summary: "A six-bedroom Edwardian house on just under an acre, coming to market in " +
        "September. Held back from the portfolio until the photography is signed off.",
      rooms: ["hall", "living", "dining", "kitchen", "study", "landing", "master", "bed2", "bath", "garden"]
    }
  ];

  HOMES.forEach(function (h) {
    (window.RED360_TOURS = window.RED360_TOURS || []).push(buildHome(h));
  });
})();
