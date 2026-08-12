/* ═══════════════════════════════════════════════════════════════════════════
   HALCYON — seed data
   Demo inventory for the prototype. In production this file disappears and
   js/api.js points at the real REST endpoints instead — every page already
   consumes data only through HAL.api, never through this file directly.

   Photography: Unsplash (Unsplash License — free to use). Each image is
   requested responsively via the img()/srcset() helpers.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var U = "https://images.unsplash.com/photo-";
  function img(id, w) { return U + id + "?auto=format&fit=crop&w=" + (w || 1600) + "&q=75"; }
  function srcset(id) {
    return [480, 800, 1200, 1600, 2000].map(function (w) { return img(id, w) + " " + w + "w"; }).join(", ");
  }

  /* ── image pools (curated, reused thoughtfully) ─────────────────────────── */
  var IMG = {
    extModern: ["1600585154340-be6161a56a0c", "1600596542815-ffad4c1539a9", "1580587771525-78b9dba3b914", "1512917774080-9991f1c4c750", "1613490493576-7fde63acd811", "1613977257363-707ba9348227"],
    extClassic: ["1564013799919-ab600027ffc6", "1523217582562-09d0def993a6", "1568605114967-8130f3a36994", "1570129477492-45c003edd2be", "1449844908441-8829872d2607", "1560185007-cde436f6a4d0"],
    aptBuilding: ["1460317442991-0ec209397118", "1571055107559-3e67626fa8be", "1486406146926-c627a92ad1ab", "1545324418-cc1a3fa10c00"],
    living: ["1600607687939-ce8a6c25118c", "1618221195710-dd6b41faaea6", "1586023492125-27b2c045efd7", "1522708323590-d24dbb6b0267", "1493809842364-78817add7ffb", "1598928506311-c55ded91a20c", "1615873968403-89e068629265", "1560448204-e02f11c3d0e2", "1502672260266-1c1ef2d93688"],
    kitchen: ["1556909114-f6e7ad7d3136", "1556912998-c57cc6b63cd7", "1556909212-d5b604d0c90d", "1600121848594-d8644e57abab", "1571508601891-ca5e7a713859", "1588854337221-4cf9fa96059c"],
    bedroom: ["1616594039964-ae9021a400a0", "1616486338812-3dadae4b4ace", "1617325247661-675ab4b64ae2", "1600607688969-a5bfcd646154", "1595526114035-0d45ed16cfbf"],
    bathroom: ["1620626011761-996317b8d101", "1552321554-5fefe8c9ef14", "1600566752355-35792bedcfea", "1584622650111-993a426fbf0a", "1600607687920-4e2a09cf159d"],
    garden: ["1558036117-15d82a90b9b1", "1585320806297-9794b3e4eeae", "1564078516393-cf04bd966897", "1416331108676-a22ccb276e35"],
    dining: ["1617806118233-18e1de247200", "1615874959474-d609969a20ed", "1554995207-c18c203602cb"],
    office: ["1497366216548-37526070297c", "1524758631624-e2822e304c36", "1497366811353-6870744d04b2"],
    city: ["1519710164239-da123dc03ef4", "1529655683826-aba9b3e77383", "1543832923-44667a44c804", "1515586838455-8f8f940d6853"],
    stair: ["1600585154084-4e5fe7c39198", "1507089947368-19c1da9775ae"]
  };

  /* ── business ───────────────────────────────────────────────────────────── */
  var BIZ = {
    name: "Halcyon",
    legal: "Halcyon Property Group Ltd",
    strap: "Where exceptional property meets exceptional technology",
    phone: "0161 000 0161",
    phoneHref: "tel:+441610000161",
    whatsapp: "https://wa.me/441610000161",
    email: "hello@halcyon.estate",
    offices: [
      { city: "Manchester", addr: "1 St Peter's Square, Manchester M2 3AE" },
      { city: "Cheshire", addr: "14 London Road, Alderley Edge SK9 7JS" },
      { city: "London", addr: "22 Berkeley Square, Mayfair W1J 6EN" }
    ]
  };

  /* ── agents ─────────────────────────────────────────────────────────────── */
  var AGENTS = [
    { id: "a-okafor", name: "Amara Okafor", role: "Head of Sales · Manchester", phone: "0161 000 0162", email: "amara@halcyon.estate", patch: "Manchester", bio: "Twelve years selling Manchester's most interesting buildings, from Ancoats mills to Deansgate towers.", responseRate: 0.98, avgResponseMins: 22 },
    { id: "j-whitfield", name: "James Whitfield", role: "Director · Cheshire", phone: "01625 000 163", email: "james@halcyon.estate", patch: "Cheshire", bio: "The Cheshire market, quietly. Off-market manors, barns and modernist one-offs across the golden triangle.", responseRate: 0.94, avgResponseMins: 41 },
    { id: "s-marchetti", name: "Sofia Marchetti", role: "Partner · London", phone: "020 7000 0164", email: "sofia@halcyon.estate", patch: "London", bio: "Prime central London lateral living and riverside townhouses, with a black book to match.", responseRate: 0.96, avgResponseMins: 35 },
    { id: "d-craven", name: "Daniel Craven", role: "Lettings Lead", phone: "0161 000 0165", email: "daniel@halcyon.estate", patch: "Manchester", bio: "Runs the rental desk — city lofts, family lets and build-to-rent partnerships.", responseRate: 0.91, avgResponseMins: 55 }
  ];

  /* ── landlords ──────────────────────────────────────────────────────────── */
  var LANDLORDS = [
    { id: "l-hartley", name: "Hartley Estates", contact: "Vivian Hartley", email: "vivian@hartleyestates.co.uk", properties: ["northern-quarter-loft", "deansgate-sky-residence", "stockport-garden-semi"] },
    { id: "l-obrien", name: "O'Brien Holdings", contact: "Patrick O'Brien", email: "patrick@obrienholdings.co.uk", properties: ["shoreditch-warehouse", "salford-quays-apartment"] },
    { id: "l-rosewood", name: "Rosewood Capital", contact: "Elena Rosewood", email: "elena@rosewoodcap.co.uk", properties: ["spinningfields-commercial"] }
  ];

  /* ── properties ─────────────────────────────────────────────────────────── */
  /* status: sale | rent | commercial ; badges: featured | sponsored | new    */
  var PROPERTIES = [
    {
      id: "king-street-penthouse", title: "The Penthouse, King Street",
      addr: "King Street, Manchester City Centre", postcode: "M2", area: "manchester-city-centre", city: "Manchester",
      lat: 53.4794, lng: -2.2451,
      status: "sale", price: 1250000, type: "Penthouse",
      beds: 4, baths: 3, sqft: 2400, epc: "B", councilTax: "G", tenure: "Leasehold · 985 years",
      chainFree: true, parking: true, balcony: true, lift: true, newBuild: false,
      badges: ["featured"], tour: "granby-court-7", video: true, addedDays: 6,
      agent: "a-okafor",
      hero: IMG.city[0], gallery: [IMG.city[0], IMG.living[0], IMG.kitchen[0], IMG.dining[0], IMG.bedroom[0], IMG.bathroom[0], IMG.living[1], IMG.city[1]],
      rooms: [
        { floor: "Fifth floor", name: "Reception", image: IMG.living[0], note: "Seven-metre glazed reception with the Town Hall clock tower in the window." },
        { floor: "Fifth floor", name: "Kitchen", image: IMG.kitchen[0], note: "Bulthaup kitchen, honed granite, a bar for twelve." },
        { floor: "Fifth floor", name: "Dining", image: IMG.dining[0], note: "Formal dining beneath the original steel trusses." },
        { floor: "Sixth floor", name: "Principal suite", image: IMG.bedroom[0], note: "The whole north wing: bedroom, dressing room, bath in the turret." },
        { floor: "Sixth floor", name: "Bathroom", image: IMG.bathroom[0], note: "Book-matched marble, brass, a tub with a skyline." },
        { floor: "Roof", name: "Terrace", image: IMG.city[1], note: "Private 800 sq ft terrace over King Street." }
      ],
      features: ["Grade II listed conversion", "800 sq ft private roof terrace", "Two secure parking spaces", "24-hour concierge", "985-year lease", "No onward chain"],
      desc: [
        "A penthouse that behaves like a house — 2,400 square feet across the top two floors of one of King Street's great Victorian banking halls, with its own roof terrace over the rooftops of the city.",
        "The reception runs the full width of the building under original steel trusses, with seven metres of glazing framing the Town Hall clock tower. Below the calm there is engineering: zoned climate control, acoustic glazing, and a service lift that opens into the hall."
      ],
      floorplan: [["Reception 7.2×5.8m", "Kitchen 4.9×4.2m", "Dining 4.6×3.9m", "WC"], ["Principal 5.5×4.8m", "Bed 2 4.2×3.8m", "Bed 3 3.9×3.6m", "Bed 4/Study 3.5×3.0m", "2 Baths"]],
      nearby: { schools: [["St Bede's Prep", "0.8 mi", "Ofsted Outstanding"], ["Chetham's School of Music", "0.6 mi", "Independent"]], transport: [["St Peter's Square Metrolink", "3 min walk"], ["Manchester Piccadilly", "12 min walk"], ["Airport", "25 min drive"]], amenities: [["The Ivy Spinningfields", "4 min"], ["King Street boutiques", "on the doorstep"], ["John Rylands Library", "5 min"]] }
    },
    {
      id: "ancoats-victoria-mill-loft", title: "Loft 12, Victoria Mill",
      addr: "Blossom Street, Ancoats", postcode: "M4", area: "ancoats", city: "Manchester",
      lat: 53.4841, lng: -2.2266,
      status: "sale", price: 425000, type: "Loft apartment",
      beds: 2, baths: 2, sqft: 1180, epc: "C", councilTax: "D", tenure: "Leasehold · 150 years",
      chainFree: false, parking: true, balcony: false, newBuild: false,
      badges: ["new"], tour: "abbey-wharf-14", video: false, addedDays: 2,
      agent: "a-okafor",
      hero: IMG.living[3], gallery: [IMG.living[3], IMG.kitchen[1], IMG.bedroom[1], IMG.bathroom[1], IMG.living[4], IMG.aptBuilding[1]],
      rooms: [
        { floor: "Third floor", name: "Living space", image: IMG.living[3], note: "Open-plan across 40 feet of mill window." },
        { floor: "Third floor", name: "Kitchen", image: IMG.kitchen[1], note: "Concrete worktops against original brick." },
        { floor: "Mezzanine", name: "Principal bedroom", image: IMG.bedroom[1], note: "Sleeping floor on the mezzanine, storage below." },
        { floor: "Third floor", name: "Bathroom", image: IMG.bathroom[1], note: "Wet-room with brushed steel and slate." }
      ],
      features: ["Original mill windows and brick", "4m ceilings", "Mezzanine principal suite", "Allocated parking", "Cutting Room Square at the door"],
      desc: [
        "Twelve windows of Grade II listed cotton mill, one loft. Number 12 keeps everything you want kept — brick, iron columns, four-metre ceilings — and hides everything you don't behind a calm, gallery-white fit-out.",
        "Ancoats does the rest: Cutting Room Square, a bakery that queues at 8am, and the tram two streets away."
      ],
      floorplan: [["Living/Kitchen 12.1×5.6m", "Bed 2 4.1×3.4m", "Bath", "Utility"], ["Principal 5.2×4.4m", "En-suite"]],
      nearby: { schools: [["New Islington Free School", "0.3 mi", "Ofsted Good"]], transport: [["New Islington Metrolink", "6 min walk"], ["Piccadilly", "10 min walk"]], amenities: [["Pollen Bakery", "2 min"], ["Cutting Room Square", "1 min"], ["Marina", "5 min"]] }
    },
    {
      id: "alderley-edge-ridgeway-manor", title: "Ridgeway Manor",
      addr: "Macclesfield Road, Alderley Edge", postcode: "SK9", area: "alderley-edge", city: "Cheshire",
      lat: 53.2977, lng: -2.2137,
      status: "sale", price: 2850000, type: "Detached house",
      beds: 6, baths: 5, sqft: 6200, epc: "C", councilTax: "H", tenure: "Freehold",
      chainFree: false, parking: true, garden: true, garage: true, newBuild: false,
      badges: ["featured", "sponsored"], tour: "oadby-grange", video: true, addedDays: 14,
      agent: "j-whitfield",
      hero: IMG.extClassic[3], gallery: [IMG.extClassic[3], IMG.stair[0], IMG.living[2], IMG.kitchen[5], IMG.bedroom[2], IMG.bathroom[2], IMG.garden[0], IMG.garden[3]],
      rooms: [
        { floor: "Ground", name: "Hall", image: IMG.stair[0], note: "Double-height oak hall with the original 1907 staircase." },
        { floor: "Ground", name: "Drawing room", image: IMG.living[2], note: "South-facing, fireplace at each end." },
        { floor: "Ground", name: "Kitchen garden room", image: IMG.kitchen[5], note: "Kitchen, orangery and breakfast room in one glass sweep." },
        { floor: "First", name: "Principal suite", image: IMG.bedroom[2], note: "Bedroom, two dressing rooms, bathroom over the lawn." },
        { floor: "Grounds", name: "Gardens", image: IMG.garden[0], note: "2.3 acres: lawns, kitchen garden, wildflower orchard." }
      ],
      features: ["2.3 acres of gardens", "Arts & Crafts, 1907", "Six bedroom suites", "Triple garage + EV", "Pool house consent granted", "Alderley Edge village 0.7 mi"],
      desc: [
        "An Arts & Crafts manor on the quiet side of Alderley Edge, held by two families in a century and carefully modernised by the second. 6,200 square feet that still feel like a home rather than a statement.",
        "The gardens are the point: 2.3 acres running to open farmland, a kitchen garden that actually feeds the kitchen, and planning consent already granted for a pool house."
      ],
      floorplan: [["Hall 6.4×5.1m", "Drawing 8.8×5.4m", "Kitchen/Garden rm 11.2×6.1m", "Study 4.6×4.0m", "Boot rm"], ["Principal 6.2×5.5m", "5 further suites", "Laundry"]],
      nearby: { schools: [["Alderley Edge School for Girls", "0.9 mi", "Independent"], ["The Ryleys", "0.6 mi", "Independent prep"]], transport: [["Alderley Edge station", "0.8 mi"], ["Manchester Airport", "15 min"]], amenities: [["The Merlin", "3 min drive"], ["Alderley Edge village", "0.7 mi"], ["National Trust Edge walks", "5 min"]] }
    },
    {
      id: "didsbury-marlborough-villa", title: "Marlborough Villa",
      addr: "Fog Lane, Didsbury", postcode: "M20", area: "didsbury", city: "Manchester",
      lat: 53.4218, lng: -2.2296,
      status: "sale", price: 875000, type: "Semi-detached house",
      beds: 5, baths: 3, sqft: 2900, epc: "D", councilTax: "F", tenure: "Freehold",
      chainFree: true, parking: true, garden: true, newBuild: false,
      badges: [], tour: "willow-lane-12", video: false, addedDays: 9,
      agent: "a-okafor",
      hero: IMG.extClassic[0], gallery: [IMG.extClassic[0], IMG.living[5], IMG.kitchen[2], IMG.bedroom[3], IMG.bathroom[3], IMG.garden[1]],
      rooms: [
        { floor: "Ground", name: "Living room", image: IMG.living[5], note: "Original bay, stripped boards, working fire." },
        { floor: "Ground", name: "Kitchen", image: IMG.kitchen[2], note: "Rear extension with a nine-foot skylight." },
        { floor: "First", name: "Principal bedroom", image: IMG.bedroom[3], note: "Full-width principal over the garden." },
        { floor: "Garden", name: "Garden", image: IMG.garden[1], note: "West-facing 90ft garden with studio." }
      ],
      features: ["1890s Victorian semi", "90ft west garden + studio", "Loft conversion with en-suite", "No chain", "Didsbury Village 5 min walk"],
      desc: [
        "The Didsbury house everyone asks for: red-brick Victorian bones, a glass-roofed kitchen where the family actually lives, and a 90-foot garden that faces the right way.",
        "Five honest bedrooms across three floors, a garden studio that works as an office, and Fog Lane park at the end of the road."
      ],
      floorplan: [["Living 5.2×4.4m", "Sitting 4.4×3.9m", "Kitchen/Dining 8.4×5.5m", "WC", "Cellar"], ["Principal 5.4×4.2m", "3 beds", "Bath"], ["Loft suite 6.1×4.4m"]],
      nearby: { schools: [["Beaver Road Primary", "0.4 mi", "Ofsted Outstanding"], ["Parrs Wood High", "0.9 mi", "Ofsted Good"]], transport: [["Didsbury Village Metrolink", "7 min walk"], ["East Didsbury rail", "10 min"]], amenities: [["Didsbury Village", "5 min walk"], ["Fletcher Moss Gardens", "12 min walk"]] }
    },
    {
      id: "castlefield-quay-apartment", title: "404 Merchants' Quay",
      addr: "Castlefield, Manchester", postcode: "M15", area: "manchester-city-centre", city: "Manchester",
      lat: 53.4747, lng: -2.2542,
      status: "sale", price: 320000, type: "Apartment",
      beds: 1, baths: 1, sqft: 620, epc: "B", councilTax: "C", tenure: "Leasehold · 132 years",
      chainFree: true, parking: false, balcony: true, newBuild: false, investment: true,
      badges: [], tour: null, video: false, addedDays: 21,
      agent: "a-okafor",
      hero: IMG.living[8], gallery: [IMG.living[8], IMG.kitchen[3], IMG.bedroom[4], IMG.aptBuilding[0]],
      rooms: [
        { floor: "Fourth floor", name: "Living space", image: IMG.living[8], note: "Canal-side living with a Juliet balcony." },
        { floor: "Fourth floor", name: "Kitchen", image: IMG.kitchen[3], note: "Galley kitchen, quartz, integrated appliances." },
        { floor: "Fourth floor", name: "Bedroom", image: IMG.bedroom[4], note: "Double with fitted wardrobes and water views." }
      ],
      features: ["Canal basin views", "6.1% projected gross yield", "132-year lease", "Chain-free", "Castlefield bowl 3 min"],
      desc: [
        "A disciplined one-bed over the Castlefield basin — the kind that lets in ninety seconds and rents in a weekend. Currently achieving £1,395 pcm; the numbers are in the data room.",
        "Sold chain-free with tenants happy to stay or go."
      ],
      floorplan: [["Living/Kitchen 6.8×4.2m", "Bedroom 4.4×3.2m", "Bath", "Hall store"]],
      nearby: { schools: [], transport: [["Deansgate-Castlefield Metrolink", "4 min walk"], ["Deansgate rail", "6 min walk"]], amenities: [["Castlefield Bowl", "3 min"], ["Barça basin bars", "2 min"], ["Science + Industry Museum", "5 min"]] }
    },
    {
      id: "wilmslow-hawthorn-house", title: "Hawthorn House",
      addr: "Gravel Lane, Wilmslow", postcode: "SK9", area: "wilmslow", city: "Cheshire",
      lat: 53.3268, lng: -2.2385,
      status: "sale", price: 695000, type: "Detached house",
      beds: 4, baths: 2, sqft: 2100, epc: "C", councilTax: "F", tenure: "Freehold",
      chainFree: false, parking: true, garden: true, garage: true, newBuild: false,
      badges: [], tour: "thurnby-rise-3", video: false, addedDays: 17,
      agent: "j-whitfield",
      hero: IMG.extClassic[2], gallery: [IMG.extClassic[2], IMG.living[6], IMG.kitchen[4], IMG.bedroom[1], IMG.garden[2]],
      rooms: [
        { floor: "Ground", name: "Family room", image: IMG.living[6], note: "Snug at the front, family room behind." },
        { floor: "Ground", name: "Kitchen", image: IMG.kitchen[4], note: "Shaker kitchen opening to the terrace." },
        { floor: "Garden", name: "Garden", image: IMG.garden[2], note: "South garden with mature hawthorn and oak." }
      ],
      features: ["Quiet lane, 8 min walk to Wilmslow station", "South-facing garden", "Double garage", "Scope to extend (STPP)"],
      desc: [
        "A proper four-bed detached on one of Wilmslow's quiet gravel lanes — walkable to the station that gets you to London in 1h50, with a south garden and room to grow.",
        "Unfussy, well-kept, and priced for the work the next owner will want to put their name on."
      ],
      floorplan: [["Hall", "Snug 4.2×3.8m", "Family 5.8×4.4m", "Kitchen/Dining 7.2×4.6m", "Utility", "WC"], ["Principal 4.8×4.2m + en-suite", "3 beds", "Bath"]],
      nearby: { schools: [["Wilmslow Prep", "0.7 mi", "Independent"], ["Wilmslow High", "1.1 mi", "Ofsted Good"]], transport: [["Wilmslow station", "8 min walk"], ["Airport", "10 min drive"]], amenities: [["Wilmslow town centre", "10 min walk"], ["The Carrs park", "6 min walk"]] }
    },
    {
      id: "northern-quarter-loft", title: "The Print Rooms, Unit 7",
      addr: "Thomas Street, Northern Quarter", postcode: "M4", area: "northern-quarter", city: "Manchester",
      lat: 53.4839, lng: -2.2358,
      status: "rent", price: 1850, type: "Loft apartment",
      beds: 2, baths: 1, sqft: 950, epc: "C", councilTax: "D", tenure: "Assured shorthold",
      furnished: true, pets: false, parking: false, availableFrom: "1 September",
      badges: ["new"], tour: null, video: false, addedDays: 3,
      agent: "d-craven", landlord: "l-hartley",
      hero: IMG.living[4], gallery: [IMG.living[4], IMG.kitchen[1], IMG.bedroom[2], IMG.bathroom[4]],
      rooms: [
        { floor: "Second floor", name: "Living space", image: IMG.living[4], note: "Open living under cast-iron columns." },
        { floor: "Second floor", name: "Kitchen", image: IMG.kitchen[1], note: "Stainless counters, gas hob, wine fridge." },
        { floor: "Second floor", name: "Bedroom", image: IMG.bedroom[2], note: "King room with exposed brick." }
      ],
      features: ["Furnished by the developer", "5 weeks' deposit", "Thomas Street on the doorstep", "Fibre pre-installed"],
      desc: ["A furnished Northern Quarter loft that photographs exactly how it lives. Two bedrooms, one long living space, and Thomas Street's coffee below."],
      floorplan: [["Living/Kitchen 9.4×5.1m", "Bed 1 4.6×3.9m", "Bed 2 3.8×3.2m", "Bath"]],
      nearby: { schools: [], transport: [["Shudehill interchange", "4 min walk"], ["Victoria", "7 min walk"]], amenities: [["Afflecks", "1 min"], ["Mackie Mayor", "3 min"]] }
    },
    {
      id: "mayfair-berkeley-lateral", title: "The Berkeley Lateral",
      addr: "Charles Street, Mayfair, London", postcode: "W1J", area: "mayfair", city: "London",
      lat: 51.5074, lng: -0.1466,
      status: "sale", price: 4500000, type: "Lateral apartment",
      beds: 3, baths: 3, sqft: 2800, epc: "C", councilTax: "H", tenure: "Share of freehold",
      chainFree: false, parking: false, lift: true, balcony: true, newBuild: false,
      badges: ["featured", "sponsored"], tour: null, video: true, addedDays: 11,
      agent: "s-marchetti",
      hero: IMG.living[1], gallery: [IMG.living[1], IMG.dining[1], IMG.kitchen[0], IMG.bedroom[0], IMG.bathroom[0], IMG.city[2]],
      rooms: [
        { floor: "Second floor", name: "Drawing room", image: IMG.living[1], note: "Three sash windows over Charles Street." },
        { floor: "Second floor", name: "Dining", image: IMG.dining[1], note: "Formal dining for ten, butler's pantry behind." },
        { floor: "Second floor", name: "Principal suite", image: IMG.bedroom[0], note: "Quiet side, dressing room, marble bath." }
      ],
      features: ["2,800 sq ft on one floor", "Share of freehold", "Porter", "Two-minute walk to Berkeley Square", "Bespoke joinery throughout"],
      desc: [
        "True lateral space two minutes from Berkeley Square — 2,800 square feet on a single floor of a red-brick Mayfair mansion block, with a porter downstairs and a share of the freehold.",
        "The current owners rebuilt it around entertaining; the butler's pantry and cloakroom arrangement is the giveaway."
      ],
      floorplan: [["Drawing 8.2×5.9m", "Dining 5.8×4.9m", "Kitchen 5.1×4.4m", "Principal suite", "2 further suites", "Pantry"]],
      nearby: { schools: [["Wetherby Prep", "1.0 mi", "Independent"]], transport: [["Green Park", "4 min walk"], ["Bond Street (Elizabeth line)", "8 min walk"]], amenities: [["Berkeley Square", "2 min"], ["Mount Street", "4 min"], ["Scott's", "5 min"]] }
    },
    {
      id: "richmond-thames-townhouse", title: "The Boathouse Terrace",
      addr: "Cholmondeley Walk, Richmond, London", postcode: "TW9", area: "richmond", city: "London",
      lat: 51.4595, lng: -0.3086,
      status: "sale", price: 1975000, type: "Townhouse",
      beds: 4, baths: 3, sqft: 2450, epc: "C", councilTax: "G", tenure: "Freehold",
      chainFree: false, parking: true, garden: true, newBuild: false,
      badges: [], tour: null, video: false, addedDays: 26,
      agent: "s-marchetti",
      hero: IMG.extClassic[4], gallery: [IMG.extClassic[4], IMG.living[7], IMG.kitchen[2], IMG.bedroom[3], IMG.garden[1]],
      rooms: [
        { floor: "Ground", name: "River room", image: IMG.living[7], note: "Sitting room with the Thames beyond the walk." },
        { floor: "Lower", name: "Kitchen", image: IMG.kitchen[2], note: "Garden-level kitchen opening to the courtyard." },
        { floor: "Second", name: "Principal", image: IMG.bedroom[3], note: "Top-floor principal with river light." }
      ],
      features: ["Direct river frontage walk", "Four storeys, 2,450 sq ft", "Courtyard garden", "Resident permit parking", "Richmond Green 3 min"],
      desc: ["A townhouse on the water at Richmond — swans at breakfast, the Green behind, and Waterloo in twenty minutes when you must."],
      floorplan: [["Kitchen/Dining 7.6×5.2m", "Utility"], ["River room 6.8×5.0m", "Study"], ["2 beds", "Bath"], ["Principal suite 6.4×5.0m"]],
      nearby: { schools: [["The Vineyard School", "0.6 mi", "Ofsted Outstanding"]], transport: [["Richmond (District/Overground/SWR)", "7 min walk"]], amenities: [["Richmond Green", "3 min"], ["Petersham Nurseries", "20 min walk"]] }
    },
    {
      id: "shoreditch-warehouse", title: "The Tannery, Loft 3",
      addr: "Rivington Street, Shoreditch, London", postcode: "EC2A", area: "shoreditch", city: "London",
      lat: 51.5265, lng: -0.0805,
      status: "rent", price: 3200, type: "Warehouse conversion",
      beds: 3, baths: 2, sqft: 1600, epc: "D", councilTax: "F", tenure: "Assured shorthold",
      furnished: true, pets: true, parking: false, availableFrom: "Available now",
      badges: [], tour: null, video: true, addedDays: 8,
      agent: "s-marchetti", landlord: "l-obrien",
      hero: IMG.living[6], gallery: [IMG.living[6], IMG.kitchen[5], IMG.bedroom[4], IMG.bathroom[2], IMG.office[2]],
      rooms: [
        { floor: "Third floor", name: "Living space", image: IMG.living[6], note: "1,600 sq ft of open warehouse floor." },
        { floor: "Third floor", name: "Kitchen", image: IMG.kitchen[5], note: "Steel island under the crane rail." },
        { floor: "Third floor", name: "Studio", image: IMG.office[2], note: "Third bedroom rigged as a studio/office." }
      ],
      features: ["Pets considered", "Furnished, design-led", "Crittall partitions", "Rivington Street location"],
      desc: ["Shoreditch as advertised: a third-floor tannery loft with crane rails in the ceiling and Rivington Street below. Pets welcome, personality required."],
      floorplan: [["Open living 13.8×7.4m", "Bed 1 4.9×4.1m", "Bed 2 4.2×3.6m", "Bed 3/Studio 4.0×3.3m", "2 Baths"]],
      nearby: { schools: [], transport: [["Old Street", "6 min walk"], ["Shoreditch High St Overground", "5 min walk"]], amenities: [["Columbia Road (Sun)", "12 min walk"], ["Boxpark", "4 min"]] }
    },
    {
      id: "chorlton-beech-terrace", title: "48 Beech Road",
      addr: "Beech Road, Chorlton", postcode: "M21", area: "chorlton", city: "Manchester",
      lat: 53.4383, lng: -2.2789,
      status: "sale", price: 465000, type: "Terraced house",
      beds: 3, baths: 1, sqft: 1350, epc: "D", councilTax: "D", tenure: "Freehold",
      chainFree: false, parking: false, garden: true, newBuild: false,
      badges: ["new"], tour: "kirby-mews-2", video: false, addedDays: 1,
      agent: "a-okafor",
      hero: IMG.extClassic[1], gallery: [IMG.extClassic[1], IMG.living[5], IMG.kitchen[3], IMG.bedroom[1], IMG.garden[2]],
      rooms: [
        { floor: "Ground", name: "Living room", image: IMG.living[5], note: "Knocked-through with the original arch kept." },
        { floor: "Ground", name: "Kitchen", image: IMG.kitchen[3], note: "Side-return extension, quarry tiles." },
        { floor: "Garden", name: "Garden", image: IMG.garden[2], note: "Low-maintenance courtyard with studio shed." }
      ],
      features: ["Beech Road, the best street in Chorlton", "Side-return kitchen", "Cellar storage", "Garden studio"],
      desc: ["A Beech Road terrace done properly — arch kept, side return glazed, cellar dry. Two minutes from the green and the bar that starts every Chorlton evening."],
      floorplan: [["Living 7.8×3.9m", "Kitchen/Dining 6.4×4.1m", "Cellar"], ["3 beds", "Bath"]],
      nearby: { schools: [["Chorlton CofE Primary", "0.3 mi", "Ofsted Good"]], transport: [["Chorlton Metrolink", "8 min walk"]], amenities: [["Beech Road shops", "0 min"], ["Chorlton Green", "2 min"]] }
    },
    {
      id: "deansgate-sky-residence", title: "Residence 4102, Deansgate Sky",
      addr: "Deansgate Square, Manchester", postcode: "M15", area: "manchester-city-centre", city: "Manchester",
      lat: 53.4713, lng: -2.2510,
      status: "rent", price: 2400, type: "Apartment",
      beds: 2, baths: 2, sqft: 1100, epc: "B", councilTax: "E", tenure: "Build to rent",
      furnished: true, pets: true, parking: true, availableFrom: "1 October", newBuild: true,
      badges: ["featured"], tour: null, video: true, addedDays: 5,
      agent: "d-craven", landlord: "l-hartley",
      hero: IMG.aptBuilding[3], gallery: [IMG.aptBuilding[3], IMG.living[0], IMG.kitchen[0], IMG.bedroom[0], IMG.city[3]],
      rooms: [
        { floor: "41st floor", name: "Living space", image: IMG.living[0], note: "Corner living on the 41st floor." },
        { floor: "41st floor", name: "Kitchen", image: IMG.kitchen[0], note: "Stone island, city both sides." },
        { floor: "Amenity", name: "Sky lounge", image: IMG.city[3], note: "Residents' lounge, pool and gym on 44." }
      ],
      features: ["41st floor corner residence", "Pool, spa and gym", "24/7 concierge", "Pets welcome", "Parking available"],
      desc: ["Forty-one floors up with the Pennines on one side and the city grid on the other. Residents' pool, spa and a lounge that makes working from home negotiable."],
      floorplan: [["Living/Kitchen 8.9×5.4m", "Principal + en-suite", "Bed 2", "Bath", "Winter garden"]],
      nearby: { schools: [], transport: [["Deansgate-Castlefield", "5 min walk"]], amenities: [["Tower amenity floors", "lift"], ["First Street", "6 min"]] }
    },
    {
      id: "prestbury-longcroft-barn", title: "Longcroft Barn",
      addr: "Withinlee Road, Prestbury", postcode: "SK10", area: "prestbury", city: "Cheshire",
      lat: 53.2891, lng: -2.1512,
      status: "sale", price: 1395000, type: "Barn conversion",
      beds: 5, baths: 4, sqft: 3800, epc: "C", councilTax: "G", tenure: "Freehold",
      chainFree: true, parking: true, garden: true, garage: true, newBuild: false,
      badges: [], tour: null, video: false, addedDays: 19,
      agent: "j-whitfield",
      hero: IMG.extModern[2], gallery: [IMG.extModern[2], IMG.living[2], IMG.kitchen[4], IMG.bedroom[2], IMG.garden[0]],
      rooms: [
        { floor: "Ground", name: "Great hall", image: IMG.living[2], note: "Full-height living under the original king posts." },
        { floor: "Ground", name: "Kitchen", image: IMG.kitchen[4], note: "Farmhouse kitchen with a four-oven Aga." },
        { floor: "Grounds", name: "Paddock", image: IMG.garden[0], note: "Gardens and paddock, just over an acre." }
      ],
      features: ["King-post great hall", "Just over an acre with paddock", "Chain-free", "Double garage + workshop"],
      desc: ["A Cheshire barn done twenty years ago and done right, with the great hall every barn promises and few deliver. An acre, a paddock, and Prestbury village down the lane."],
      floorplan: [["Great hall 11.6×7.2m", "Kitchen 6.8×5.4m", "Snug", "Study", "Guest suite"], ["Principal + 3 suites", "Gallery landing"]],
      nearby: { schools: [["Prestbury CofE Primary", "0.8 mi", "Ofsted Outstanding"]], transport: [["Prestbury station", "1.0 mi"], ["Macclesfield (London 1h45)", "10 min"]], amenities: [["Prestbury village", "3 min drive"], ["The Legh Arms", "4 min"]] }
    },
    {
      id: "salford-quays-waterfront", title: "Apartment 908, Meridian Quay",
      addr: "The Quays, Salford", postcode: "M50", area: "salford-quays", city: "Manchester",
      lat: 53.4719, lng: -2.2936,
      status: "sale", price: 289000, type: "Apartment",
      beds: 2, baths: 2, sqft: 850, epc: "B", councilTax: "C", tenure: "Leasehold · 990 years",
      chainFree: false, parking: true, balcony: true, sharedOwnership: true, investment: true, newBuild: false,
      badges: [], tour: null, video: false, addedDays: 30,
      agent: "d-craven", landlord: "l-obrien",
      hero: IMG.aptBuilding[0], gallery: [IMG.aptBuilding[0], IMG.living[8], IMG.kitchen[3], IMG.bedroom[4]],
      rooms: [
        { floor: "Ninth floor", name: "Living space", image: IMG.living[8], note: "Open living with a balcony over the basin." },
        { floor: "Ninth floor", name: "Kitchen", image: IMG.kitchen[3], note: "White quartz galley." }
      ],
      features: ["Shared ownership from 40%", "Water views", "Parking included", "MediaCity tram 4 min"],
      desc: ["Ninth-floor water views at a first-rung price — offered from a 40% share, with the tram to MediaCity in four minutes and the whole basin below."],
      floorplan: [["Living/Kitchen 7.2×4.6m", "Bed 1 + en-suite", "Bed 2", "Bath", "Balcony"]],
      nearby: { schools: [], transport: [["Harbour City Metrolink", "4 min walk"]], amenities: [["The Lowry", "8 min walk"], ["Quayside MediaCity", "6 min"]] }
    },
    {
      id: "spinningfields-commercial", title: "The Counting House",
      addr: "Hardman Street, Spinningfields", postcode: "M3", area: "manchester-city-centre", city: "Manchester",
      lat: 53.4796, lng: -2.2513,
      status: "commercial", price: 850000, type: "Office · Class E",
      beds: 0, baths: 2, sqft: 3200, epc: "B", councilTax: "—", tenure: "Long leasehold",
      chainFree: false, parking: true, newBuild: false,
      badges: [], tour: null, video: false, addedDays: 24,
      agent: "a-okafor", landlord: "l-rosewood",
      hero: IMG.office[0], gallery: [IMG.office[0], IMG.office[1], IMG.aptBuilding[2]],
      rooms: [
        { floor: "Ground + first", name: "Open floor", image: IMG.office[1], note: "3,200 sq ft over two floors, 28 desks as fitted." }
      ],
      features: ["Class E use", "Fitted to 28 desks", "Two secure spaces", "Spinningfields core"],
      desc: ["A self-contained Spinningfields office with its own door — fitted, cabled and ready for a name plate. Two floors, 3,200 square feet, Class E."],
      floorplan: [["Open plan 16.2×9.8m ×2 floors", "2 meeting rooms", "Kitchen", "2 WC"]],
      nearby: { schools: [], transport: [["Salford Central", "4 min walk"], ["St Peter's Sq Metrolink", "8 min"]], amenities: [["The Avenue", "1 min"], ["Courts", "3 min"]] }
    },
    {
      id: "hale-glass-house", title: "The Glass House",
      addr: "Bankhall Lane, Hale", postcode: "WA15", area: "hale", city: "Cheshire",
      lat: 53.3781, lng: -2.3467,
      status: "sale", price: 1750000, type: "Detached house",
      beds: 4, baths: 3, sqft: 3100, epc: "A", councilTax: "G", tenure: "Freehold",
      chainFree: false, parking: true, garden: true, garage: true, newBuild: true,
      badges: ["featured"], tour: null, video: true, addedDays: 4,
      agent: "j-whitfield",
      hero: IMG.extModern[0], gallery: [IMG.extModern[0], IMG.extModern[4], IMG.living[0], IMG.kitchen[0], IMG.bedroom[0], IMG.garden[3]],
      rooms: [
        { floor: "Ground", name: "Living wing", image: IMG.living[0], note: "Glazed living wing to the south garden." },
        { floor: "Ground", name: "Kitchen", image: IMG.kitchen[0], note: "Monolithic stone island, hidden pantry." },
        { floor: "First", name: "Principal suite", image: IMG.bedroom[0], note: "Cantilevered principal over the lawn." }
      ],
      features: ["EPC A — passive-spec build", "Air-source + solar + battery", "Cantilevered principal suite", "Bowdon/Hale schools", "10-year warranty"],
      desc: [
        "A one-off modernist house finished last year to near-passive spec — EPC A, air-source heating, and running costs that embarrass houses half its size.",
        "Architect-designed around a south courtyard, with the principal suite cantilevered over the lawn like the diving board nobody was brave enough to build."
      ],
      floorplan: [["Living wing 10.4×5.8m", "Kitchen/Dining 9.2×5.6m", "Study", "Guest suite", "Plant"], ["Principal 6.8×5.2m", "2 further suites", "Landing library"]],
      nearby: { schools: [["Altrincham Grammar", "1.2 mi", "Ofsted Outstanding"], ["Bowdon Prep", "0.9 mi", "Independent"]], transport: [["Hale station", "12 min walk"], ["Airport", "9 min"]], amenities: [["Hale village", "10 min walk"], ["Dunham Massey", "8 min drive"]] }
    },
    {
      id: "stockport-garden-semi", title: "11 Aragon Grove",
      addr: "Heaton Moor, Stockport", postcode: "SK4", area: "heaton-moor", city: "Manchester",
      lat: 53.4184, lng: -2.1855,
      status: "rent", price: 1295, type: "Semi-detached house",
      beds: 3, baths: 1, sqft: 1050, epc: "C", councilTax: "C", tenure: "Assured shorthold",
      furnished: false, pets: true, parking: true, garden: true, availableFrom: "15 September",
      badges: [], tour: null, video: false, addedDays: 12,
      agent: "d-craven", landlord: "l-hartley",
      hero: IMG.extClassic[5], gallery: [IMG.extClassic[5], IMG.living[5], IMG.kitchen[2], IMG.garden[1]],
      rooms: [
        { floor: "Ground", name: "Living room", image: IMG.living[5], note: "Bay-front living room." },
        { floor: "Garden", name: "Garden", image: IMG.garden[1], note: "60ft lawn, shed, gated drive." }
      ],
      features: ["Unfurnished family let", "Pets considered", "60ft garden", "Heaton Moor high street 6 min"],
      desc: ["A family semi on a quiet Heaton Moor grove — unfurnished, pet-friendly, with the kind of garden that decides it."],
      floorplan: [["Living 4.6×3.9m", "Dining 3.9×3.6m", "Kitchen"], ["3 beds", "Bath"]],
      nearby: { schools: [["St John's CofE Primary", "0.4 mi", "Ofsted Good"]], transport: [["Heaton Chapel rail", "9 min walk"]], amenities: [["Heaton Moor Road", "6 min walk"]] }
    },
    {
      id: "city-road-pied-a-terre", title: "Apt 5, The Ledger Building",
      addr: "City Road, London", postcode: "EC1V", area: "shoreditch", city: "London",
      lat: 51.5286, lng: -0.0921,
      status: "sale", price: 549950, type: "Apartment",
      beds: 1, baths: 1, sqft: 540, epc: "B", councilTax: "D", tenure: "Leasehold · 116 years",
      chainFree: true, parking: false, newBuild: false, investment: true,
      badges: [], tour: null, video: false, addedDays: 15,
      agent: "s-marchetti",
      hero: IMG.living[7], gallery: [IMG.living[7], IMG.kitchen[1], IMG.bedroom[4]],
      rooms: [
        { floor: "First floor", name: "Living space", image: IMG.living[7], note: "Tall-windowed living in a converted ledger hall." }
      ],
      features: ["Pied-à-terre scale, prime location", "Chain-free", "Porter", "Old Street 5 min"],
      desc: ["A disciplined City Road one-bed for the three-nights-a-week life. Porter downstairs, Old Street five minutes, nothing wasted."],
      floorplan: [["Living/Kitchen 5.9×4.4m", "Bedroom 4.1×3.3m", "Bath"]],
      nearby: { schools: [], transport: [["Old Street", "5 min walk"], ["Moorgate (Elizabeth line)", "12 min walk"]], amenities: [["Shoreditch Grind", "3 min"], ["Barbican", "14 min walk"]] }
    },
    {
      id: "cheadle-orchard-bungalow", title: "The Orchard Bungalow",
      addr: "Ladybridge Road, Cheadle Hulme", postcode: "SK8", area: "cheadle", city: "Manchester",
      lat: 53.3745, lng: -2.1902,
      status: "sale", price: 385000, type: "Bungalow",
      beds: 2, baths: 1, sqft: 980, epc: "D", councilTax: "D", tenure: "Freehold",
      chainFree: true, parking: true, garden: true, retirement: true, newBuild: false,
      badges: [], tour: null, video: false, addedDays: 34,
      agent: "a-okafor",
      hero: IMG.extClassic[1], gallery: [IMG.extClassic[1], IMG.living[3], IMG.garden[2]],
      rooms: [
        { floor: "Ground", name: "Living room", image: IMG.living[3], note: "Dual-aspect living over the orchard garden." }
      ],
      features: ["Single-level living", "Orchard garden", "Chain-free", "Village 5 min"],
      desc: ["Single-level living behind an actual orchard — apples, plums, and a greenhouse that comes with its own instructions from the seller."],
      floorplan: [["Living 5.4×4.2m", "Kitchen", "2 beds", "Bath", "Sun room"]],
      nearby: { schools: [], transport: [["Cheadle Hulme station", "10 min walk"]], amenities: [["Cheadle Hulme village", "5 min walk"]] }
    }
  ];

  /* ── developments ───────────────────────────────────────────────────────── */
  var DEVELOPMENTS = [
    {
      id: "one-cotton-field", name: "One Cotton Field", area: "ancoats", city: "Manchester",
      strap: "94 canal-side residences around a private garden square",
      priceFrom: 299950, completion: "Q2 2027", units: 94, developer: "Field & Foundry",
      hero: IMG.extModern[1], gallery: [IMG.extModern[1], IMG.living[0], IMG.aptBuilding[3]],
      highlights: ["1, 2 & 3-bed residences", "Residents' garden square", "EPC A across the scheme", "Help to Buy alternative: 5% deposit scheme"]
    },
    {
      id: "the-ivy-works", name: "The Ivy Works", area: "didsbury", city: "Manchester",
      strap: "A Victorian print works remade as 28 lofts and 6 garden houses",
      priceFrom: 385000, completion: "Ready now", units: 34, developer: "Halcyon Developments",
      hero: IMG.extModern[5], gallery: [IMG.extModern[5], IMG.living[3], IMG.kitchen[1]],
      highlights: ["Original brick and steel", "Six garden houses", "Show loft open Thu–Sun", "Two remaining penthouses"]
    },
    {
      id: "kingsbrook-green", name: "Kingsbrook Green", area: "wilmslow", city: "Cheshire",
      strap: "Twelve family houses on the green edge of Wilmslow",
      priceFrom: 725000, completion: "Q4 2026", units: 12, developer: "Kingsbrook Homes",
      hero: IMG.extModern[3], gallery: [IMG.extModern[3], IMG.kitchen[4], IMG.garden[0]],
      highlights: ["4 & 5-bed detached", "Air-source heating", "10-year NHBC", "Woodland-backed plots"]
    }
  ];

  /* ── areas ──────────────────────────────────────────────────────────────── */
  var AREAS = [
    { id: "manchester-city-centre", name: "Manchester City Centre", city: "Manchester", image: IMG.city[0], avgPrice: 285000, avgRent: 1450, growth5y: 31, strap: "Mills, towers and everything in between — the fastest-moving market in the North.", blurb: "The city centre runs on contrast: listed banking halls two streets from 60-storey glass, a tram network that makes cars optional, and a rental market that never sleeps. Buy-side stock splits between conversion character and new-build convenience." },
    { id: "ancoats", name: "Ancoats", city: "Manchester", image: IMG.aptBuilding[1], avgPrice: 315000, avgRent: 1350, growth5y: 43, strap: "The world's first industrial suburb, now its most decorated dinner table.", blurb: "Cutting Room Square is the postcard, but the draw is texture — cobbles, mills, the marina — and a food scene that outgrew the city around it. Stock is almost entirely conversion lofts and considered new-builds." },
    { id: "didsbury", name: "Didsbury", city: "Manchester", image: IMG.extClassic[0], avgPrice: 520000, avgRent: 1600, growth5y: 24, strap: "Villages within the city: red brick, good schools, better coffee.", blurb: "West Didsbury for the bars, Didsbury Village for the school run, East for the tram. Victorian semis and villas dominate; gardens face the right way more often than not." },
    { id: "chorlton", name: "Chorlton", city: "Manchester", image: IMG.extClassic[1], avgPrice: 410000, avgRent: 1400, growth5y: 27, strap: "Independent to its bones — terraces, greens and a high street with opinions.", blurb: "Beech Road sets the tone. Expect bay-fronted terraces, an organic grocer per capita record, and a market where well-finished houses go in a weekend." },
    { id: "alderley-edge", name: "Alderley Edge", city: "Cheshire", image: IMG.extClassic[3], avgPrice: 895000, avgRent: 2400, growth5y: 19, strap: "The golden triangle's point — wooded lanes, big gates, bigger views.", blurb: "The Edge itself is National Trust; the lanes below it hold Cheshire's most valuable addresses. Arts & Crafts manors, discreet new builds, and a village that runs on espresso and horsepower." },
    { id: "wilmslow", name: "Wilmslow", city: "Cheshire", image: IMG.extModern[3], avgPrice: 640000, avgRent: 1900, growth5y: 21, strap: "Commuter Cheshire at full strength — London in 1h50, the Edge in 10 minutes.", blurb: "Wilmslow trades on connection: the West Coast main line, the airport, the M56. Family detacheds on quiet lanes, with a growing sliver of high-spec new stock." },
    { id: "hale", name: "Hale & Bowdon", city: "Cheshire", image: IMG.extModern[0], avgPrice: 780000, avgRent: 2200, growth5y: 22, strap: "Village polish, grammar schools, and the leafiest crescents in the North West.", blurb: "Hale village does the mornings, Bowdon does the space. The grammar-school catchment underwrites the market; one-off modern houses are the new chapter." },
    { id: "mayfair", name: "Mayfair", city: "London", image: IMG.city[2], avgPrice: 3400000, avgRent: 7800, growth5y: 9, strap: "The square mile where property is measured in centuries.", blurb: "Lateral mansion-block space, mews houses and the last true garden squares. Turnover is low, discretion high; the best of it never reaches a portal." },
    { id: "richmond", name: "Richmond", city: "London", image: IMG.extClassic[4], avgPrice: 1150000, avgRent: 3200, growth5y: 14, strap: "River, park, green — London's gentlest gravity.", blurb: "The Thames path and the park bracket a market of Georgian terraces and river-facing townhouses. Twenty minutes to Waterloo buys a different life." },
    { id: "shoreditch", name: "Shoreditch", city: "London", image: IMG.city[3], avgPrice: 725000, avgRent: 2900, growth5y: 16, strap: "Warehouse floors and new towers around London's creative engine room.", blurb: "Tannery lofts, ex-print works and glass infill, walkable to the City. Rental demand is relentless; character stock holds its premium." }
  ];

  /* ── reviews ────────────────────────────────────────────────────────────── */
  var REVIEWS = [
    { name: "R. & T. Ellison", text: "The virtual tour sold the house before we'd set foot in it. We flew back from Singapore for one viewing — the keys, effectively.", context: "Bought Ridgeway Manor area, Cheshire" },
    { name: "Priya S.", text: "Every portal shows you houses. Halcyon showed us three we hadn't thought to want, and one of them is now home.", context: "Bought in Didsbury" },
    { name: "Marcus W.", text: "Our landlord dashboard replaced a decade of email chains. Enquiry to signed tenancy in nine days.", context: "Landlord, 14 units" },
    { name: "Hannah & Joel", text: "The viewing scheduling actually works — picked a Saturday slot at midnight, confirmed by 8am.", context: "Renting in Ancoats" },
    { name: "D. Craven-Moore", text: "The valuation walkthrough felt like private banking, not a form. The figure was within 2% of what we achieved.", context: "Sold in Hale" }
  ];

  /* ── virtual tour registry (bridge to the existing billy360 platform) ───── */
  var TOURS_BASE = "/billy360/";
  var TOURS = PROPERTIES.filter(function (p) { return p.tour; }).map(function (p) {
    return {
      id: "vt-" + p.id, propertyId: p.id, provider: "billy360",
      tourId: p.tour, room: p.tourRoom || "",
      embedUrl: TOURS_BASE + "?site=" + p.tour + "&embed=1",
      status: "published", sessions: 40 + Math.floor(((p.sqft || 900) * 7) % 400), completion: 0.52 + ((p.price % 37) / 100)
    };
  });

  /* ── advertising products ───────────────────────────────────────────────── */
  var AD_PRODUCTS = [
    { id: "featured", name: "Featured", desc: "Priority placement in search results and area pages.", pricePerWeek: 45 },
    { id: "premium", name: "Premium", desc: "Featured, plus larger editorial card treatment.", pricePerWeek: 85 },
    { id: "homepage-spotlight", name: "Homepage spotlight", desc: "One of six curated slots in the homepage Featured Collection.", pricePerWeek: 150 },
    { id: "search-boost", name: "Search boost", desc: "Ranks above non-sponsored matches for chosen filters.", pricePerWeek: 60 },
    { id: "area-spotlight", name: "Area spotlight", desc: "Hero placement on a chosen area guide.", pricePerWeek: 75 },
    { id: "weekend-promotion", name: "Weekend promotion", desc: "Friday–Sunday boost across search and homepage.", pricePerWeek: 40 }
  ];

  var CAMPAIGNS = [
    { id: "cmp-1", propertyId: "alderley-edge-ridgeway-manor", product: "homepage-spotlight", status: "live", start: -12, end: 16, budget: 600, spend: 257, impressions: 48210, clicks: 1620, enquiries: 14, viewings: 6 },
    { id: "cmp-2", propertyId: "mayfair-berkeley-lateral", product: "premium", status: "live", start: -8, end: 20, budget: 340, spend: 97, impressions: 21470, clicks: 903, enquiries: 9, viewings: 4 },
    { id: "cmp-3", propertyId: "deansgate-sky-residence", product: "search-boost", status: "live", start: -5, end: 9, budget: 120, spend: 43, impressions: 15890, clicks: 731, enquiries: 11, viewings: 5 },
    { id: "cmp-4", propertyId: "one-cotton-field", product: "area-spotlight", status: "scheduled", start: 3, end: 31, budget: 300, spend: 0, impressions: 0, clicks: 0, enquiries: 0, viewings: 0 },
    { id: "cmp-5", propertyId: "hale-glass-house", product: "weekend-promotion", status: "ended", start: -21, end: -14, budget: 80, spend: 80, impressions: 12040, clicks: 561, enquiries: 7, viewings: 3 }
  ];

  /* ── CRM seed: leads across the pipeline ────────────────────────────────── */
  var LEADS = [
    { id: "ld-01", name: "Sarah Chen", email: "sarah.chen@example.com", phone: "07700 900101", propertyId: "king-street-penthouse", source: "Virtual tour", stage: "viewing-booked", agent: "a-okafor", value: 1250000, days: 2, note: "Relocating from Hong Kong; cash position confirmed." },
    { id: "ld-02", name: "The Patels", email: "n.patel@example.com", phone: "07700 900102", propertyId: "didsbury-marlborough-villa", source: "Property enquiry", stage: "offer-made", agent: "a-okafor", value: 862000, days: 9, note: "Offer £862k, chain-free. Vendor considering." },
    { id: "ld-03", name: "Tom Rowntree", email: "tom.r@example.com", phone: "07700 900103", propertyId: "ancoats-victoria-mill-loft", source: "Saved property", stage: "new", agent: "a-okafor", value: 425000, days: 0, note: "" },
    { id: "ld-04", name: "Freya Lindqvist", email: "freya.l@example.com", phone: "07700 900104", propertyId: "northern-quarter-loft", source: "Viewing request", stage: "viewing-completed", agent: "d-craven", value: 1850, days: 4, note: "Second viewing with partner requested." },
    { id: "ld-05", name: "Ade & Simi Bakare", email: "bakare@example.com", phone: "07700 900105", propertyId: "hale-glass-house", source: "Property enquiry", stage: "contacted", agent: "j-whitfield", value: 1750000, days: 1, note: "Selling in Fulham; agreed sale." },
    { id: "ld-06", name: "Golding Family Office", email: "office@example.com", phone: "020 7000 9106", propertyId: "mayfair-berkeley-lateral", source: "Phone", stage: "viewing-booked", agent: "s-marchetti", value: 4500000, days: 3, note: "Third London acquisition this year." },
    { id: "ld-07", name: "Megan O'Shea", email: "megan.os@example.com", phone: "07700 900107", propertyId: "chorlton-beech-terrace", source: "Mortgage enquiry", stage: "new", agent: "a-okafor", value: 465000, days: 0, note: "AIP in place with Nationwide." },
    { id: "ld-08", name: "Kenji Watanabe", email: "kenji.w@example.com", phone: "07700 900108", propertyId: "castlefield-quay-apartment", source: "Property enquiry", stage: "under-offer", agent: "a-okafor", value: 312500, days: 18, note: "Investor; solicitor instructed." },
    { id: "ld-09", name: "Lauren & Chris Doyle", email: "doyles@example.com", phone: "07700 900109", propertyId: "wilmslow-hawthorn-house", source: "Viewing request", stage: "viewing-completed", agent: "j-whitfield", value: 695000, days: 6, note: "Loved it; comparing against Kingsbrook Green plot 4." },
    { id: "ld-10", name: "Ibrahim Khan", email: "i.khan@example.com", phone: "07700 900110", propertyId: "salford-quays-waterfront", source: "Contact form", stage: "contacted", agent: "d-craven", value: 289000, days: 2, note: "Shared-ownership eligibility being checked." },
    { id: "ld-11", name: "Verity Alcock", email: "verity.a@example.com", phone: "07700 900111", propertyId: "prestbury-longcroft-barn", source: "Email", stage: "completed", agent: "j-whitfield", value: 1362500, days: 44, note: "Completed 28 days after offer. Review requested." },
    { id: "ld-12", name: "Stefan Brandt", email: "s.brandt@example.com", phone: "07700 900112", propertyId: "shoreditch-warehouse", source: "Virtual tour", stage: "lost", agent: "s-marchetti", value: 3200, days: 15, note: "Took a corporate let in the City instead." }
  ];

  var LEAD_STAGES = [
    { id: "new", name: "New" },
    { id: "contacted", name: "Contacted" },
    { id: "viewing-booked", name: "Viewing booked" },
    { id: "viewing-completed", name: "Viewing completed" },
    { id: "offer-made", name: "Offer made" },
    { id: "under-offer", name: "Under offer" },
    { id: "completed", name: "Completed" },
    { id: "lost", name: "Lost" }
  ];

  /* ── viewings calendar seed (day offsets from today) ────────────────────── */
  var VIEWINGS = [
    { id: "vw-01", propertyId: "king-street-penthouse", lead: "Sarah Chen", day: 1, time: "10:30", kind: "in-person", agent: "a-okafor", status: "confirmed" },
    { id: "vw-02", propertyId: "mayfair-berkeley-lateral", lead: "Golding Family Office", day: 2, time: "14:00", kind: "in-person", agent: "s-marchetti", status: "confirmed" },
    { id: "vw-03", propertyId: "northern-quarter-loft", lead: "Freya Lindqvist", day: 3, time: "17:30", kind: "in-person", agent: "d-craven", status: "requested" },
    { id: "vw-04", propertyId: "hale-glass-house", lead: "Ade & Simi Bakare", day: 4, time: "11:00", kind: "virtual", agent: "j-whitfield", status: "confirmed" },
    { id: "vw-05", propertyId: "ancoats-victoria-mill-loft", lead: "Tom Rowntree", day: 5, time: "09:30", kind: "in-person", agent: "a-okafor", status: "requested" }
  ];

  /* ── CMS: homepage section registry (Website Builder reads/writes this) ─── */
  var CMS_SECTIONS = [
    { id: "hero", name: "Cinematic hero", locked: true, visible: true },
    { id: "stats", name: "Market ticker", visible: true },
    { id: "featured", name: "Featured Collection", visible: true },
    { id: "potw", name: "Property of the Week", visible: true },
    { id: "latest", name: "Latest to market (rail)", visible: true },
    { id: "areas", name: "Area spotlights", visible: true },
    { id: "developments", name: "Developments", visible: true },
    { id: "tours", name: "Virtual tours strip", visible: true },
    { id: "valuation", name: "Valuation CTA", visible: true },
    { id: "reviews", name: "Testimonials", visible: true }
  ];

  var CMS_COPY = {
    heroKicker: "Private sales · Lettings · New homes",
    heroTitle: "Find somewhere|extraordinary.",
    heroSub: "A curated portfolio across Manchester, Cheshire and London — with virtual tours, real data and people who answer.",
    potwId: "hale-glass-house",
    valuationTitle: "What is your property worth, really?",
    valuationSub: "Not a widget guess. A walkthrough that ends with a figure we would put our name to."
  };

  /* ── exports ────────────────────────────────────────────────────────────── */
  window.HAL = window.HAL || {};
  window.HAL.seed = {
    BIZ: BIZ, IMG: IMG, img: img, srcset: srcset,
    AGENTS: AGENTS, LANDLORDS: LANDLORDS, PROPERTIES: PROPERTIES,
    DEVELOPMENTS: DEVELOPMENTS, AREAS: AREAS, REVIEWS: REVIEWS,
    TOURS: TOURS, TOURS_BASE: TOURS_BASE,
    AD_PRODUCTS: AD_PRODUCTS, CAMPAIGNS: CAMPAIGNS,
    LEADS: LEADS, LEAD_STAGES: LEAD_STAGES, VIEWINGS: VIEWINGS,
    CMS_SECTIONS: CMS_SECTIONS, CMS_COPY: CMS_COPY
  };
})();
