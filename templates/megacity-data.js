/* ============================================================
   MEGACITY PROPERTIES — shared data layer
   One source of truth for every page: the business facts, the
   listings, and the mapping onto the existing billy360 tours.

   Business facts below (phone, email, office, memberships) are
   taken from megacityproperties.co.uk. The listings are demo
   inventory for this redesign concept — in production this file
   is replaced by a CMS/portal feed with the same shape, which is
   why nothing on any page hardcodes a property.
   ============================================================ */
(function () {
  "use strict";

  var BIZ = {
    name: "Megacity Properties",
    /* the two-line wordmark shown in the nav, menu, loader and footer —
       editable in the Studio, so the whole site can be re-branded */
    brandName: "Megacity",
    brandSub: "Properties",
    strap: "Lettings & property management, Manchester & Salford",
    tagline: "Doing rental right",
    phone: "0161 220 1763",
    phoneHref: "tel:+441612201763",
    email: "info@megacityproperties.co.uk",
    office: "Office 21, The Tube Business Centre, 86 North Street, Manchester M8 8RA",
    mapsHref: "https://maps.google.com/?q=The+Tube+Business+Centre,+86+North+Street,+Manchester+M8+8RA",
    companyNo: "12321291",
    facebook: "https://www.facebook.com/megacityproperties",
    linkedin: "https://www.linkedin.com/company/megacity-properties",
    /* memberships listed on the current site — nothing invented */
    memberships: [
      { name: "ARLA Propertymark", note: "Regulated agent · Client Money Protection" },
      { name: "The Property Ombudsman", note: "Membership T06217" },
      { name: "DPS", note: "Deposit Protection Service" },
      { name: "NRLA", note: "National Residential Landlords Association" }
    ]
  };

  /* where the existing 360° platform lives — the site never rebuilds
     any of this, it only launches it */
  var TOURS_BASE = "/billy360/";

  function img(id, w) {
    return "https://images.unsplash.com/photo-" + id + "?auto=format&fit=crop&w=" + (w || 1600) + "&q=80";
  }

  /* ── the listings ─────────────────────────────────────────────
     status: available · new · let-agreed
     tour:   billy360 site id, or null when no capture exists yet  */
  var PROPERTIES = [
    {
      id: "foundry-loft",
      name: "The Foundry Loft",
      area: "Ancoats", postcode: "M4",
      price: 1650, priceLabel: "£1,650 pcm",
      status: "available", statusLabel: "Available",
      beds: 2, baths: 2, type: "Loft apartment",
      furnishing: "Furnished", availableFrom: "Available now",
      deposit: "5 weeks' rent", epc: "C", councilTaxBand: "C",
      tour: "foundry-loft", tourRoom: "living",
      cover: img("1554995207-c18c203602cb"),
      summary: "A double-height warehouse conversion on the Rochdale Canal — exposed brick, cast-iron columns and nine-foot windows over the water.",
      description: [
        "The Foundry is one of Ancoats' original mill conversions, and number 12 is its best corner: a double-height living space wrapped in original brickwork, with the bedroom mezzanine floating above and nine-foot warehouse windows holding the light all day.",
        "Both bedrooms take a proper double; the principal has its own shower room. The kitchen is fitted along one wall in matte black with quartz worktops, leaving the floor open for living and dining. Cutting Room Square, the tram at New Islington and the best coffee in Manchester are all under five minutes on foot."
      ],
      features: ["Double-height living space", "Original brick & cast iron", "Two double bedrooms", "Principal with en-suite", "Secure fob entry & lift", "Canal-side, moments from Cutting Room Square"],
      story: [
        { room: "Living", caption: "Nine-foot windows, original brick, a double-height ceiling.", src: img("1554995207-c18c203602cb") },
        { room: "Kitchen", caption: "Matte black units and quartz, fitted along one wall.", src: img("1484154218962-a197022b5858") },
        { room: "Bedroom", caption: "The mezzanine principal, above the living space.", src: img("1616594039964-ae9021a400a0") },
        { room: "Bathroom", caption: "Concrete, brass and a walk-in rainfall shower.", src: img("1620626011761-996317b8d101") }
      ]
    },
    {
      id: "quay-house-27",
      name: "27 Quay House",
      area: "Castlefield", postcode: "M15",
      price: 2600, priceLabel: "£2,600 pcm",
      status: "available", statusLabel: "Available",
      beds: 3, baths: 2, type: "Penthouse",
      furnishing: "Furnished", availableFrom: "From 1 September",
      deposit: "5 weeks' rent", epc: "B", councilTaxBand: "E",
      tour: "quay-house-27", tourRoom: "living",
      cover: img("1615873968403-89e068629265"),
      summary: "The top floor of Quay House — a three-bedroom penthouse with a wrap-around terrace over the Bridgewater Canal basin.",
      description: [
        "Twenty-seven is the whole top floor. The living room runs the full width of the building, opening through sliding glazing onto a terrace that follows the corner of the basin — water on two sides, the city behind.",
        "Three genuine doubles, two marble-lined bathrooms, and a kitchen island cut from a single slab. Castlefield's bars and the Deansgate-Castlefield tram stop sit at the bottom of the private stair."
      ],
      features: ["Wrap-around canal terrace", "Full-width living room", "Three double bedrooms", "Two marble bathrooms", "Two secure parking spaces", "Private top-floor position"],
      story: [
        { room: "Living", caption: "The full width of the building, ending in the terrace.", src: img("1615873968403-89e068629265") },
        { room: "Kitchen", caption: "An island cut from a single slab.", src: img("1556909114-f6e7ad7d3136") },
        { room: "Bedroom", caption: "The principal suite, facing the basin.", src: img("1522444195799-478538b28823") },
        { room: "Terrace", caption: "Water on two sides, the city behind.", src: img("1600585154340-be6161a56a0c") }
      ]
    },
    {
      id: "chapel-wharf-14",
      name: "14 Chapel Wharf",
      area: "Salford", postcode: "M3",
      price: 1275, priceLabel: "£1,275 pcm",
      status: "new", statusLabel: "New",
      beds: 2, baths: 1, type: "Apartment",
      furnishing: "Furnished", availableFrom: "Available now",
      deposit: "5 weeks' rent", epc: "B", councilTaxBand: "C",
      tour: "chapel-wharf-14", tourRoom: "living",
      cover: img("1522708323590-d24dbb6b0267"),
      summary: "A bright two-bedroom apartment on the Irwell, three minutes' walk from Deansgate over the Trinity footbridge.",
      description: [
        "Chapel Wharf sits on the Salford bank of the Irwell, and number 14 faces the water. The open-plan living room takes the morning sun through full-height glazing, with a Juliet balcony over the river path.",
        "Both bedrooms are doubles, the bathroom is freshly refitted, and the building has a concierge, a gym and secure cycle storage. Deansgate is three minutes over the footbridge; Spinningfields five."
      ],
      features: ["River-facing living room", "Juliet balcony", "24-hour concierge", "Residents' gym", "Secure cycle storage", "Three minutes to Deansgate"],
      story: [
        { room: "Living", caption: "Morning sun through full-height glazing.", src: img("1522708323590-d24dbb6b0267") },
        { room: "Kitchen", caption: "Refitted, with the river beyond the glass.", src: img("1556909212-d5b604d0c90d") },
        { room: "Bedroom", caption: "A calm double over the river path.", src: img("1560185127-6ed189bf02f4") }
      ]
    },
    {
      id: "beech-house",
      name: "The Beech House",
      area: "West Didsbury", postcode: "M20",
      price: 2850, priceLabel: "£2,850 pcm",
      status: "available", statusLabel: "Available",
      beds: 4, baths: 3, type: "Detached house",
      furnishing: "Unfurnished", availableFrom: "From 15 September",
      deposit: "5 weeks' rent", epc: "C", councilTaxBand: "F",
      tour: "beech-house", tourRoom: "living",
      cover: img("1494526585095-c41746248156"),
      summary: "A four-bedroom detached family house on one of West Didsbury's tree-lined roads, with a south-facing garden and a studio over the garage.",
      description: [
        "The Beech House sits back from the road behind a mature copper beech. Inside, two receptions run front to back either side of the hall, and the kitchen-diner across the rear opens onto a south-facing garden of about eighty feet.",
        "Four bedrooms upstairs, the principal with an en-suite; a third bathroom serves the studio above the garage — a proper work-from-home room. Burton Road's restaurants and the Metrolink are both a short walk."
      ],
      features: ["South-facing 80ft garden", "Garage studio / office", "Two receptions", "Kitchen-diner across the rear", "Driveway for two cars", "Walk to Burton Road & Metrolink"],
      story: [
        { room: "Living", caption: "The front reception, bay window to the beech.", src: img("1600121848594-d8644e57abab") },
        { room: "Kitchen", caption: "Across the full rear, opening to the garden.", src: img("1616486338812-3dadae4b4ace") },
        { room: "Bedroom", caption: "The principal, quiet at the back of the house.", src: img("1560185007-cde436f6a4d0") },
        { room: "Garden", caption: "South-facing, about eighty feet.", src: img("1600210492486-724fe5c67fb0") }
      ]
    },
    {
      id: "hilton-street-9",
      name: "9 Hilton Street",
      area: "Northern Quarter", postcode: "M1",
      price: 1150, priceLabel: "£1,150 pcm",
      status: "let-agreed", statusLabel: "Let agreed",
      beds: 1, baths: 1, type: "Apartment",
      furnishing: "Furnished", availableFrom: "Let agreed",
      deposit: "5 weeks' rent", epc: "C", councilTaxBand: "B",
      tour: "hilton-street-9", tourRoom: "living",
      cover: img("1522156373667-4c7234bbd804"),
      summary: "A one-bedroom loft on Hilton Street itself — brick walls, steel windows and the Northern Quarter on the doorstep.",
      description: [
        "Number 9 is a textbook Northern Quarter loft: one big brick-walled room for living and dining, a galley kitchen behind a steel-framed screen, and a mezzanine double above.",
        "It suits one person or a couple who want the city at the door — Stevenson Square is thirty seconds away, Piccadilly station six minutes."
      ],
      features: ["Exposed brick throughout", "Steel-framed windows", "Mezzanine double bedroom", "Video entry", "Stevenson Square 30 seconds", "Piccadilly 6 minutes on foot"],
      story: [
        { room: "Living", caption: "One big brick-walled room, steel windows to the street.", src: img("1522156373667-4c7234bbd804") },
        { room: "Kitchen", caption: "A galley behind the steel screen.", src: img("1556909114-f6e7ad7d3136") },
        { room: "Bedroom", caption: "The mezzanine double.", src: img("1598928506311-c55ded91a20c") }
      ]
    },
    {
      id: "waterloo-road-room",
      name: "Room 3, Waterloo Road",
      area: "Cheetham Hill", postcode: "M8",
      price: 600, priceLabel: "£600 pcm · bills included",
      status: "available", statusLabel: "Available",
      beds: 1, baths: 1, type: "Double room",
      furnishing: "Fully furnished", availableFrom: "Available now",
      deposit: "5 weeks' rent", epc: "C", councilTaxBand: "A",
      tour: null, tourRoom: null,
      cover: img("1556020685-ae41abfc9365"),
      summary: "A fully furnished double with every bill included, around the corner from our own office — renting at its simplest.",
      description: [
        "Room 3 is a proper double in a well-kept house share on Waterloo Road: bed, wardrobe and chest of drawers all in, with a lock on the door and a fitted kitchen shared with the house.",
        "One payment covers everything — rent, gas, electric, water, Wi-Fi and council tax — so what you see is what you pay. Buses to the city run from the end of the road, and our office is two minutes away if you ever need us."
      ],
      features: ["All bills included — gas, electric, water, Wi-Fi & council tax", "Fully furnished double", "Lock on the bedroom door", "Shared fitted kitchen", "Two minutes from our office", "Buses to the city from the end of the road"],
      story: [
        { room: "Bedroom", caption: "A furnished double — bed, wardrobe and drawers included.", src: img("1556020685-ae41abfc9365") },
        { room: "Bedroom", caption: "Light, simple and ready to move into.", src: img("1540518614846-7eded433c457") },
        { room: "Kitchen", caption: "The shared kitchen, fitted and looked after.", src: img("1556909114-f6e7ad7d3136") }
      ]
    },
    {
      id: "albany-terrace",
      name: "Albany Road Terrace",
      area: "Chorlton", postcode: "M21",
      price: 1495, priceLabel: "£1,495 pcm",
      status: "available", statusLabel: "Available",
      beds: 3, baths: 1, type: "Terraced house",
      furnishing: "Unfurnished", availableFrom: "Available now",
      deposit: "5 weeks' rent", epc: "D", councilTaxBand: "C",
      tour: null, tourRoom: null,
      cover: img("1600121848594-d8644e57abab"),
      summary: "A three-bedroom Victorian terrace off Beech Road — stripped floors, two receptions and a courtyard garden.",
      description: [
        "A proper Chorlton terrace: stripped boards and high ceilings through two receptions, a rear kitchen with a skylight, and a paved courtyard behind.",
        "Three bedrooms up, the family bathroom refitted last year. Beech Road's shops are at the end of the street and Chorlton Green is two minutes beyond."
      ],
      features: ["Two receptions", "Stripped original floors", "Skylit rear kitchen", "Courtyard garden", "Refitted bathroom", "Off Beech Road"],
      story: [
        { room: "Living", caption: "Stripped boards and the bay to the street.", src: img("1600121848594-d8644e57abab") },
        { room: "Kitchen", caption: "The rear kitchen, lit from above.", src: img("1556909212-d5b604d0c90d") },
        { room: "Bedroom", caption: "The front double.", src: img("1560184897-ae75f418493e") }
      ]
    },
    {
      id: "dock-5",
      name: "Dock 5 Apartments",
      area: "Salford Quays", postcode: "M50",
      price: 1395, priceLabel: "£1,395 pcm",
      status: "available", statusLabel: "Available",
      beds: 2, baths: 2, type: "Apartment",
      furnishing: "Furnished", availableFrom: "From 1 September",
      deposit: "5 weeks' rent", epc: "B", councilTaxBand: "D",
      tour: null, tourRoom: null,
      cover: img("1515263487990-61b07816b324"),
      summary: "A two-bedroom, two-bathroom apartment on the seventh floor at the Quays, with MediaCity and the tram two minutes away.",
      description: [
        "Seventh-floor and dual-aspect, so the living room gets the water one way and the sunset the other. Both bedrooms are doubles with their own bathrooms — ideal for sharers.",
        "The building has a concierge and allocated parking, and MediaCityUK's studios, restaurants and tram stop are two minutes' level walk."
      ],
      features: ["Dual-aspect seventh floor", "Two en-suite doubles", "Allocated parking", "Concierge", "Two minutes to MediaCityUK", "Water views"],
      story: [
        { room: "Living", caption: "Dual aspect — water one way, sunset the other.", src: img("1493809842364-78817add7ffb") },
        { room: "Kitchen", caption: "Open to the living space.", src: img("1484154218962-a197022b5858") },
        { room: "Bedroom", caption: "Both doubles carry their own bathroom.", src: img("1560185007-cde436f6a4d0") }
      ]
    },
    {
      id: "sandgate-road",
      name: "Sandgate Road",
      area: "Prestwich", postcode: "M25",
      price: 1325, priceLabel: "£1,325 pcm",
      status: "let-agreed", statusLabel: "Let agreed",
      beds: 3, baths: 1, type: "Semi-detached",
      furnishing: "Unfurnished", availableFrom: "Let agreed",
      deposit: "5 weeks' rent", epc: "C", councilTaxBand: "C",
      tour: null, tourRoom: null,
      cover: img("1600047509807-ba8f99d2cdde"),
      summary: "A modern three-bedroom semi near St Mary's Park, with a garage, a west garden and Prestwich village up the road.",
      description: [
        "A well-kept modern semi on a quiet road: lounge to the front, kitchen-diner to the rear, and a west-facing garden that keeps the evening sun.",
        "Three bedrooms and the family bathroom upstairs, a garage and driveway beside. St Mary's Park is around the corner, the village and Metrolink ten minutes on foot."
      ],
      features: ["Garage and driveway", "West-facing garden", "Kitchen-diner", "Near St Mary's Park", "Village 10 minutes on foot", "Quiet residential road"],
      story: [
        { room: "Living", caption: "The lounge, facing the road through the bay.", src: img("1493809842364-78817add7ffb") },
        { room: "Kitchen", caption: "The rear kitchen-diner.", src: img("1556909114-f6e7ad7d3136") },
        { room: "Garden", caption: "West-facing — evening sun.", src: img("1600210492486-724fe5c67fb0") }
      ]
    }
  ];

  /* helpers every page uses */
  function byId(id) {
    for (var i = 0; i < PROPERTIES.length; i++) if (PROPERTIES[i].id === id) return PROPERTIES[i];
    return null;
  }
  function withTours() {
    return PROPERTIES.filter(function (p) { return !!p.tour; });
  }
  /* deep link into the existing 360 platform (embed chrome off) */
  function tourUrl(p, room) {
    if (!p || !p.tour) return null;
    return TOURS_BASE + "?site=" + encodeURIComponent(p.tour) + "&embed=1" +
      "#/tour/" + encodeURIComponent(room || p.tourRoom || "living");
  }

  /* ── Studio overlay ───────────────────────────────────────────
     Edits made in the Megacity Studio (/templates/megacity-admin)
     are saved to this browser and win over the shipped file — the
     same model as the billy360 Studio. Everyone else keeps seeing
     the shipped data until the Studio's exported file is deployed. */
  try {
    var saved = JSON.parse(localStorage.getItem("megacity:data") || "null");
    if (saved && saved.properties && saved.properties.length) {
      PROPERTIES.length = 0;
      Array.prototype.push.apply(PROPERTIES, saved.properties);
    }
    /* additive entries — written by the 360° Studio's assistant when a
       property is "published everywhere". They sit alongside the shipped
       (or Studio-replaced) list; a matching id replaces its entry. */
    if (saved && saved.addProperties && saved.addProperties.length) {
      saved.addProperties.forEach(function (p) {
        if (!p || !p.id) return;
        for (var i = 0; i < PROPERTIES.length; i++) {
          if (PROPERTIES[i].id === p.id) { PROPERTIES.splice(i, 1); break; }
        }
        PROPERTIES.unshift(p);
      });
    }
    if (saved && saved.biz) {
      for (var k in saved.biz) if (Object.prototype.hasOwnProperty.call(saved.biz, k)) BIZ[k] = saved.biz[k];
    }
  } catch (e) { /* corrupted save — fall back to the shipped data */ }

  window.MEGACITY = {
    biz: BIZ,
    properties: PROPERTIES,
    areas: ["Ancoats", "Castlefield", "Northern Quarter", "Salford", "Salford Quays", "West Didsbury", "Chorlton", "Prestwich", "Cheetham Hill"],
    toursBase: TOURS_BASE,
    byId: byId,
    withTours: withTours,
    tourUrl: tourUrl,
    img: img
  };
})();
