/* ═══════════════════════════════════════════════════════════════════════════
   MEGACITY PROPERTIES — Manchester & Salford lettings
   The billy360 deployment for the Megacity website redesign concept. Five
   walkable listings whose ids match the website's property slugs, so the
   site deep-links straight into a tour:  /billy360/?site=<id>&embed=1

   Same shape as every other tour file: a compact table of homes at the
   bottom, a small builder above it, one registration line per property.
   Every walkable position is a real 360° capture from the shared panos/
   folder; each room keeps a synthesised `space` fallback underneath.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {

  /* the agency's branding — the tour UI wears Megacity, not billy360 */
  var AGENCY = {
    name: "MEGACITY", mark: "MEGA", markAccent: "CITY", sub: "PROPERTIES",
    tagline: "See it before you visit",
    logo: null,
    accent: "#B9945E", accent2: "#D8BC8A", bg: "#12100C", ink: "#F5F1E9",
    fontDisplay: "'Manrope','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    fontBody: "'Manrope','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    credit: "Platform by Billy Digitals", creditHref: "/virtual-tour-360"
  };

  var AGENT = {
    name: "Megacity Properties",
    phone: "0161 220 1763",
    email: "info@megacityproperties.co.uk",
    url: "/templates/megacity"
  };

  /* ── room recipes ── [layout, w, h, d, glazed face, warmth] ──── */
  var RECIPE = {
    hall:    [0, 3.0, 2.6, 5.0, "-z", 0.15],
    living:  [10, 5.6, 3.4, 6.6, "+z", 0.35],
    kitchen: [2, 4.4, 2.6, 5.8, "+z", 0.2],
    master:  [10, 4.4, 2.6, 4.6, "+z", 0.4],
    bed2:    [10, 3.4, 2.5, 3.8, "+z", 0.4],
    bath:    [6, 2.4, 2.4, 3.0, "+z", 0.1],
    study:   [6, 3.2, 2.5, 3.6, "+z", 0.25],
    garden:  [8, 11.0, 3.0, 8.0, "none", 0.75],
    terrace: [8, 9.0, 3.0, 6.0, "none", 0.6],
    landing: [9, 2.6, 2.5, 5.0, "none", 0.15]
  };
  var LABEL = {
    hall:    ["Entrance Hall", "Hall", "Arrival"],
    living:  ["Living Room", "Living", "Reception"],
    kitchen: ["Kitchen / Diner", "Kitchen", "Kitchen"],
    master:  ["Principal Bedroom", "Principal", "Bedroom"],
    bed2:    ["Bedroom Two", "Bed 2", "Bedroom"],
    bath:    ["Bathroom", "Bathroom", "Bathroom"],
    study:   ["Study", "Study", "Home office"],
    garden:  ["Garden", "Garden", "Outside"],
    terrace: ["Roof Terrace", "Terrace", "Outside"],
    landing: ["Landing", "Landing", "Circulation"]
  };
  /* real captures per room type — deliberately a different selection to the
     Meridian demo, so the two portfolios don't walk identically */
  var PANO = {
    hall: "entrance_hall", living: "lythwood_lounge", kitchen: "kiara_interior",
    master: "hotel_room", bed2: "lythwood_room", bath: "modern_bathroom",
    study: "provence_studio", garden: "suburban_garden", terrace: "roof_garden",
    landing: "large_corridor"
  };
  /* real interior photography per room type (Unsplash CDN) — the same
     imagery the website's listing pages carry, so site and tour agree */
  function U(id) {
    return "https://images.unsplash.com/photo-" + id + "?auto=format&fit=crop&w=1600&q=80";
  }
  var STOCK = {
    hall: ["1558904541-efa843a96f01"],
    living: ["1554995207-c18c203602cb", "1615873968403-89e068629265"],
    kitchen: ["1484154218962-a197022b5858", "1556909114-f6e7ad7d3136"],
    master: ["1616594039964-ae9021a400a0", "1522444195799-478538b28823"],
    bed2: ["1598928506311-c55ded91a20c", "1560184897-ae75f418493e"],
    bath: ["1620626011761-996317b8d101"],
    study: ["1600494603989-9650cf6ddd3d"],
    garden: ["1600210492486-724fe5c67fb0"],
    terrace: ["1600585154340-be6161a56a0c"],
    landing: ["1600607688969-a5bfcd646154"]
  };
  var PALETTE = { wall: "#efe9df", floor: "#9a9184", accent: "#8a6a3f", light: "#ffe8c6", wood: "#c2996a", fabric: "#54503f" };

  function makeRoom(key, i, seed, floorId) {
    var r = RECIPE[key], l = LABEL[key];
    var pos = [[20, 62], [50, 62], [82, 62], [20, 24], [50, 24], [82, 24], [66, 42], [34, 42]][i % 8];
    return {
      id: key,
      name: l[0], short: l[1], kind: l[2], floor: floorId,
      area: "", capacity: "", ceiling: r[2].toFixed(1) + " m",
      description: "",
      plan: pos, north: -90,
      view: { yaw: (i * 41 + seed * 13) % 360 - 180, pitch: -6, fov: 82 },
      pano: PANO[key] ? "panos/" + PANO[key] + ".jpg" : null,
      photos: (STOCK[key] || []).map(function (id, n) {
        return { src: U(id), caption: l[0] + (n ? " — alternate view" : "") };
      }),
      space: {
        w: r[1], h: r[2], d: r[3], eye: 1.55, cam: [0, 0],
        layout: r[0], glaze: r[4] === "none" ? "none" : r[4],
        open: key === "garden" || key === "terrace", city: key === "terrace" ? 1 : 0,
        warm: r[5], seed: +(seed + i * 3.3).toFixed(1), exposure: 1.04,
        palette: PALETTE
      },
      hotspots: []
    };
  }

  /* every room links back to the hall; the hall links out to everything */
  function linkRooms(rooms) {
    var hub = rooms[0];
    rooms.slice(1).forEach(function (r, i) {
      var yaw = -140 + (i * (280 / Math.max(1, rooms.length - 2)));
      hub.hotspots.push({ id: "to-" + r.id, type: "nav", to: r.id, yaw: yaw, pitch: -13, label: r.short });
      r.hotspots.push({ id: "back-" + r.id, type: "nav", to: hub.id, yaw: 176, pitch: -14, label: hub.short });
    });
    return rooms;
  }

  /* a simple honest plan drawn from the rooms the home actually has */
  function planSvg(title, top, bottom, stairs) {
    var out = ['<rect class="fp-out" x="6" y="6" width="108" height="68" rx="2"/>'];
    function band(y, h, labels) {
      var n = Math.max(1, labels.length), x = 6;
      for (var i = 0; i < n; i++) {
        var w = Math.round(108 / n);
        if (i === n - 1) w = 114 - x;
        out.push('<rect class="fp-rm" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>');
        if (labels[i]) out.push('<text class="fp-lb" x="' + (x + 3) + '" y="' + (y + 6) + '">' + labels[i] + "</text>");
        x += w;
      }
    }
    band(6, 32, top);
    out.push('<rect class="fp-rm fp-hall" x="6" y="38" width="108" height="9"/>');
    out.push('<text class="fp-lb" x="9" y="44">HALL</text>');
    band(47, 27, bottom);
    out.push('<path class="fp-glaze" d="M6 74h64"/>');
    if (stairs) out.push('<path class="fp-stair" d="M98 52h13M98 56h13M98 60h13M98 64h13M98 68h13"/>');
    return out.join("");
  }

  var UP = { master: 1, bed2: 1, bath: 1, landing: 1 };

  function buildHome(h) {
    var upNames = h.rooms.filter(function (k) { return h.upstairs && UP[k] && k !== "landing"; })
      .map(function (k) { return LABEL[k][1].toUpperCase(); });
    var downNames = h.rooms.filter(function (k) { return (!h.upstairs || !UP[k]) && k !== "hall"; })
      .map(function (k) { return LABEL[k][1].toUpperCase(); });
    var half = Math.ceil(downNames.length / 2);

    var floors = [{
      id: "g", name: h.upstairs ? "Ground Floor" : "The Apartment", short: h.upstairs ? "G" : "PLAN",
      plan: planSvg("Ground", downNames.slice(0, half), downNames.slice(half), !!h.upstairs)
    }];
    if (h.upstairs) floors.push({
      id: "f1", name: "First Floor", short: "01",
      plan: planSvg("First", upNames, ["BATHROOM"], true)
    });

    var rooms = linkRooms(h.rooms.map(function (key, i) {
      var room = makeRoom(key, i, h.seed, (h.upstairs && UP[key]) ? "f1" : "g");
      if (h.notes && h.notes[key]) room.description = h.notes[key];
      return room;
    }));

    return {
      id: h.id,
      version: 3,
      brand: AGENCY,
      project: {
        name: h.name, slug: h.id,
        client: "Megacity Properties",
        location: h.location,
        area: h.area,
        floors: floors.length,
        duration: Math.max(2, Math.round(rooms.length * 0.7)) + " min",
        captured: h.captured,
        summary: h.summary,
        price: h.price, priceQualifier: "per calendar month",
        status: h.status,
        beds: h.beds, baths: h.baths, receptions: h.receptions,
        propertyType: h.type, tenure: "To let", epc: h.epc, ref: h.ref,
        cover: h.cover || "living",
        features: h.features || [],
        councilTax: h.councilTax || "",
        availability: h.availability || "",
        agent: AGENT,
        facts: [
          ["Rent", h.price],
          ["Bedrooms", String(h.beds)],
          ["Bathrooms", String(h.baths)],
          ["Type", h.type],
          ["Furnishing", h.furnishing],
          ["EPC", h.epc]
        ]
      },
      guided: { dwell: 7000, order: rooms.map(function (r) { return r.id; }) },
      floors: floors,
      rooms: rooms
    };
  }

  /* ═════════════════════════════════════════════════════════════════════════
     THE LISTINGS — ids match the website's property slugs
     ═════════════════════════════════════════════════════════════════════════ */
  var HOMES = [
    {
      id: "foundry-loft", name: "The Foundry Loft", location: "Ancoats, Manchester M4",
      price: "£1,650 pcm", status: "To let", beds: 2, baths: 2, receptions: 1,
      type: "Loft apartment", furnishing: "Furnished", epc: "C", ref: "MCP-1204",
      area: "980 sq ft", seed: 4, upstairs: false, cover: "living",
      councilTax: "C", availability: "Available now",
      captured: "Captured 6 Aug · 6 positions",
      features: ["Double-height living space", "Original brick & cast iron", "Principal with en-suite",
        "Secure fob entry & lift", "Canal-side position", "Cutting Room Square 4 min"],
      summary: "A double-height warehouse conversion on the Rochdale Canal — exposed brick, " +
        "cast-iron columns and nine-foot windows over the water.",
      notes: {
        living: "The double-height living space — nine-foot warehouse windows over the canal.",
        kitchen: "Matte black units and quartz worktops, fitted along one wall.",
        master: "The mezzanine principal, floating above the living space.",
        bath: "Concrete, brass and a walk-in rainfall shower."
      },
      rooms: ["hall", "living", "kitchen", "master", "bed2", "bath"]
    },
    {
      id: "quay-house-27", name: "27 Quay House", location: "Castlefield, Manchester M15",
      price: "£2,600 pcm", status: "To let", beds: 3, baths: 2, receptions: 1,
      type: "Penthouse", furnishing: "Furnished", epc: "B", ref: "MCP-1188",
      area: "1,560 sq ft", seed: 2, upstairs: false, cover: "living",
      councilTax: "E", availability: "From 1 September",
      captured: "Captured 4 Aug · 7 positions",
      features: ["Wrap-around canal terrace", "Full-width living room", "Two marble bathrooms",
        "Two secure parking spaces", "Top-floor position", "Deansgate-Castlefield tram 3 min"],
      summary: "The whole top floor of Quay House — a three-bedroom penthouse with a " +
        "wrap-around terrace over the Bridgewater Canal basin.",
      notes: {
        living: "The living room runs the full width of the building, ending in the terrace.",
        terrace: "Water on two sides, the city behind.",
        master: "The principal suite, facing the basin."
      },
      rooms: ["hall", "living", "kitchen", "master", "bed2", "bath", "terrace"]
    },
    {
      id: "chapel-wharf-14", name: "14 Chapel Wharf", location: "Salford M3",
      price: "£1,275 pcm", status: "To let", beds: 2, baths: 1, receptions: 1,
      type: "Apartment", furnishing: "Furnished", epc: "B", ref: "MCP-1211",
      area: "720 sq ft", seed: 1, upstairs: false, cover: "living",
      councilTax: "C", availability: "Available now",
      captured: "Captured 1 Aug · 6 positions",
      features: ["River-facing living room", "Juliet balcony", "24-hour concierge",
        "Residents' gym", "Deansgate 3 min on foot"],
      summary: "A bright two-bedroom apartment on the Irwell, three minutes' walk from " +
        "Deansgate over the Trinity footbridge.",
      notes: {
        living: "Morning sun through full-height glazing, the river below.",
        kitchen: "Refitted, open to the living space."
      },
      rooms: ["hall", "living", "kitchen", "master", "bed2", "bath"]
    },
    {
      id: "beech-house", name: "The Beech House", location: "West Didsbury, Manchester M20",
      price: "£2,850 pcm", status: "To let", beds: 4, baths: 3, receptions: 2,
      type: "Detached house", furnishing: "Unfurnished", epc: "C", ref: "MCP-1176",
      area: "1,850 sq ft", seed: 3, upstairs: true, cover: "living",
      councilTax: "F", availability: "From 15 September",
      captured: "Captured 29 Jul · 9 positions",
      features: ["South-facing 80ft garden", "Garage studio / office", "Two receptions",
        "Kitchen-diner across the rear", "Driveway for two", "Burton Road 6 min"],
      summary: "A four-bedroom detached family house on one of West Didsbury's tree-lined " +
        "roads, with a south-facing garden and a studio over the garage.",
      notes: {
        living: "The front reception — a bay window to the copper beech.",
        kitchen: "Across the full rear of the house, opening onto the garden.",
        study: "The studio over the garage — a proper work-from-home room.",
        garden: "South-facing, about eighty feet."
      },
      rooms: ["hall", "living", "kitchen", "study", "landing", "master", "bed2", "bath", "garden"]
    },
    {
      id: "hilton-street-9", name: "9 Hilton Street", location: "Northern Quarter, Manchester M1",
      price: "£1,150 pcm", status: "Let agreed", beds: 1, baths: 1, receptions: 1,
      type: "Apartment", furnishing: "Furnished", epc: "C", ref: "MCP-1160",
      area: "540 sq ft", seed: 5, upstairs: false, cover: "living",
      councilTax: "B", availability: "Let agreed",
      captured: "Captured 21 Jul · 5 positions",
      features: ["Exposed brick throughout", "Steel-framed windows", "Mezzanine double",
        "Video entry", "Stevenson Square 30 seconds"],
      summary: "A one-bedroom loft on Hilton Street itself — brick walls, steel windows " +
        "and the Northern Quarter on the doorstep.",
      notes: {
        living: "One big brick-walled room — living, dining and the kitchen behind a steel screen.",
        master: "The mezzanine double, above the living space."
      },
      rooms: ["hall", "living", "kitchen", "master", "bath"]
    }
  ];

  HOMES.forEach(function (h) {
    (window.BILLY360_TOURS = window.BILLY360_TOURS || []).push(buildHome(h));
  });
})();
