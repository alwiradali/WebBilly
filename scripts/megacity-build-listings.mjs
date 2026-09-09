/* Builds the static Megacity listing pages for the properties Walid asked to
   keep on the website permanently.

   The shared chrome (head, nav, mega-menu, search overlay, footer) is lifted
   out of megacity-let-ladywell-point.html at build time rather than copied,
   so the nine pages cannot drift from the page that is already live.

   Facts rule: a property only prints a fact we were actually given. Anything
   missing is omitted — never guessed, never rendered as "N/A". Rent, deposit,
   bedrooms, bathrooms, council tax band, EPC and the reference are still with
   the client; when they arrive they go in the FACTS field below and the row
   appears. Availability comes from Walid, 8 September 2026: all nine are
   available from 1 August 2027.

   Usage: node scripts/megacity-build-listings.mjs [--check]
*/
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const T = join(ROOT, "templates");
const SOURCE = join(T, "megacity-let-ladywell-point.html");
const ORIGIN = "https://billydigitals.com";
const AVAILABLE = "Available from 1 August 2027";

/* ---------------------------------------------------------------- the nine */
/* photos: source index -> alt text, in the order they should appear.
   The first entry is the cover. Indices are the -NN suffix on disk. */

const PROPS = [
  {
    slug: "north-street-hyde",
    name: "28 North Street, Hyde",
    crumb: "28 North Street, Hyde",
    map: "28 North Street, Hyde",
    type: "House",
    area: "hyde",
    areaLabel: "Hyde",
    tag: "Conservatory",
    blurb:
      "A house on North Street in Hyde, shown unfurnished in the photographs, with a lounge opening through to a dining area, a conservatory across the back looking onto the garden, and a fitted kitchen with a door to the rear.",
    extra:
      "Upstairs there are several bedrooms, a number of them with fitted wardrobes and their own shower room, along with a family bathroom and a separate WC.",
    features: [
      "Lounge with a fireplace, opening through to the dining area",
      "Conservatory across the back of the house, onto the garden",
      "Fitted kitchen with integrated oven and hob",
      "Fitted wardrobes to several of the bedrooms",
      "En-suite shower room and a family bathroom",
      "Separate ground floor WC",
      "Shown unfurnished",
    ],
    photos: [
      [14, "Lounge with a fireplace, opening through to the dining area"],
      [2, "Conservatory with a tiled floor looking onto the rear garden"],
      [10, "Reception room with the stairs rising and doors to the garden"],
      [3, "Hallway looking through an arch into the lounge"],
      [5, "Fitted kitchen with integrated oven, hob and a door to the rear"],
      [6, "Kitchen with white units, dark worktops and an extractor over the hob"],
      [0, "Bedroom with fitted wardrobes and a door through to the shower room"],
      [1, "Bedroom with fitted wardrobes and open shelving"],
      [4, "Bedroom with a run of fitted wardrobes and an en-suite off"],
      [9, "Bedroom with fitted wardrobes and shelving, en-suite beyond"],
      [7, "Bedroom with a fitted wardrobe and shelving under the window"],
      [8, "Bedroom with a window to the front"],
      [13, "Landing with doors to the bedrooms"],
      [12, "Bathroom with a bath and shower over"],
      [16, "En-suite with a shower cubicle and basin"],
      [11, "Ground floor WC with a basin"],
      [15, "Separate WC with a basin and window"],
    ],
  },
  {
    slug: "carlton-road-5",
    name: "5 Carlton Road, Salford",
    crumb: "5 Carlton Road, Salford M6 7EW",
    map: "5 Carlton Road, Salford M6 7EW",
    type: "House",
    area: "salford",
    areaLabel: "Salford",
    tag: "Furnished",
    blurb:
      "A large furnished house on Carlton Road in Salford, with a shared kitchen and dining area, a separate living room, and bedrooms on the upper floors and up in the attic.",
    extra:
      "The bedrooms are furnished with a bed, wardrobe or fitted storage and a desk, and the top floor rooms sit under the eaves with a skylight. Bathrooms and a separate WC are shared.",
    features: [
      "Open-plan kitchen and dining area with a range cooker",
      "Separate living room with a wall-mounted television",
      "Furnished bedrooms with a bed, storage and a desk",
      "Attic bedrooms with skylights",
      "Bathrooms with a bath and shower over, and a separate WC",
      "Washing machine in the kitchen",
      "Furnished",
    ],
    photos: [
      [9, "Open-plan kitchen and dining area with a range cooker and television"],
      [11, "Living room with a sofa and a wall-mounted television"],
      [10, "Kitchen and dining area with a washing machine and integrated microwave"],
      [0, "Fitted kitchen with a range cooker, fridge freezer and washing machine"],
      [4, "Bedroom with a double bed, chest of drawers and a radiator"],
      [7, "Bedroom with a double bed, desk and a mirrored wardrobe"],
      [13, "Bay window bedroom with a double bed, desk and chest of drawers"],
      [12, "Bay window bedroom with a double bed and wardrobe"],
      [1, "Bedroom with a double bed, desk chair and chest of drawers"],
      [3, "Bedroom with a double bed, desk and a wardrobe"],
      [5, "Bedroom with a desk and a mirrored wardrobe"],
      [6, "Bedroom with a bed, desk and chest of drawers"],
      [8, "Attic bedroom with a skylight, wardrobe and desk"],
      [14, "Attic bedroom with a skylight, bed and desk"],
      [15, "Attic bedroom with a skylight, single bed and a desk under the eaves"],
      [16, "Attic bedroom with a bed, desk and mirrored wardrobe"],
      [17, "Attic bedroom with a bed and a chest of drawers"],
      [2, "Bathroom with a bath, shower over and a basin"],
      [18, "Second bathroom with a bath, shower over and a basin"],
      [19, "Separate WC with a basin"],
    ],
  },
  {
    slug: "carlton-road-9",
    name: "9 Carlton Road, Salford",
    crumb: "9 Carlton Road, Salford M6 7EW",
    map: "9 Carlton Road, Salford M6 7EW",
    type: "House",
    area: "salford",
    areaLabel: "Salford",
    tag: "Furnished",
    blurb:
      "A furnished house on Carlton Road in Salford with a shared kitchen at the back, bedrooms across the upper floors, shared bathrooms and a separate WC.",
    extra:
      "The bedrooms are furnished, several with a wardrobe and a desk, and the top floor rooms sit under the eaves with a skylight.",
    features: [
      "Shared kitchen with a range cooker and washing machine",
      "Furnished bedrooms with a bed and storage",
      "Bay window bedrooms to the front",
      "Attic bedrooms with skylights",
      "Bathrooms with a bath and shower over, and a separate WC",
      "Furnished",
    ],
    photos: [
      [8, "Shared kitchen with a range cooker, washing machine and fitted units"],
      [7, "Bay window bedroom with a double bed, desk and chest of drawers"],
      [9, "Bay window bedroom with a double bed and a wardrobe"],
      [2, "Bedroom with a double bed, mirrored wardrobe and bedside table"],
      [5, "Bedroom with a double bed and a wardrobe"],
      [1, "Bedroom with a double bed and a chest of drawers"],
      [4, "Attic bedroom with a double bed, drawers and a desk under the skylight"],
      [6, "Attic bedroom with a double bed and a chest of drawers"],
      [3, "Attic bedroom with a desk, chest of drawers and storage in the eaves"],
      [11, "Bedroom with a single bed, bedside table and a desk"],
      [0, "Bathroom with a bath, shower over, basin and heated towel rail"],
      [10, "Second bathroom with a bath, shower over, basin and WC"],
      [12, "Separate WC with a basin"],
    ],
  },
  {
    slug: "drayton-street",
    name: "93 Drayton Street, Manchester",
    crumb: "93 Drayton Street, Manchester M15 5LL",
    map: "93 Drayton Street, Manchester M15 5LL",
    type: "",
    area: "manchester",
    areaLabel: "Manchester",
    tag: "Furnished",
    blurb:
      "A furnished home on Drayton Street in Manchester, with a living and dining area, a fitted kitchen, bedrooms off the hallway, a bathroom and a separate shower room.",
    extra: "",
    features: [
      "Living and dining area with two windows",
      "Fitted kitchen with a gas hob, oven and washing machine",
      "Furnished bedrooms with wardrobes",
      "Bathroom with a bath and shower over",
      "Separate shower room",
      "Furnished",
    ],
    photos: [
      [7, "Living and dining area with a sofa, dining table and a washing machine"],
      [1, "Living room with a sofa, coffee table and a rug"],
      [2, "Fitted kitchen with a gas hob, oven, extractor and fridge freezer"],
      [4, "Bedroom with a double bed and a wardrobe"],
      [5, "Bedroom with a double bed, wardrobe and a chest of drawers"],
      [6, "Hallway looking through to two of the bedrooms"],
      [0, "Bathroom with a bath, shower over, basin and WC"],
      [3, "Shower room with a walk-in shower, basin and WC"],
    ],
  },
  {
    slug: "adelphi-apartments",
    name: "Adelphi Apartments",
    crumb: "Adelphi Apartments",
    map: "Adelphi Apartments",
    type: "Apartment",
    area: "",
    areaLabel: "",
    tag: "Furnished",
    blurb:
      "A furnished studio apartment at Adelphi Apartments, arranged as one open room with a double bed, a sofa and a dining table, a kitchen along one wall and a floor-to-ceiling window.",
    extra: "",
    features: [
      "Open-plan studio with a double bed, sofa and dining table",
      "Fitted kitchen with an integrated oven",
      "Shower room with a walk-in shower",
      "Floor-to-ceiling window",
      "Television",
      "Furnished",
    ],
    photos: [
      [0, "Open-plan studio with a dining table, sofa, double bed and a floor-to-ceiling window"],
      [1, "Seating area by the window with a dining table, sofa and television"],
      [2, "Double bed with a sofa in front and artwork above the headboard"],
      [3, "Kitchen area with white gloss units and an integrated oven, beside the living space"],
      [5, "Living area with a television, chest of drawers and a round coffee table"],
      [4, "Shower room with a walk-in shower, basin, WC and mirror"],
    ],
  },
  {
    slug: "grove-house",
    name: "Apartment 12, Grove House",
    crumb: "Apartment 12, Grove House",
    map: "Grove House",
    type: "Apartment",
    area: "",
    areaLabel: "",
    tag: "Furnished",
    blurb:
      "A furnished apartment at Grove House, with a fitted kitchen, a bedroom with a wardrobe and drawers, and a bathroom with a shower over the bath.",
    extra: "",
    features: [
      "Fitted kitchen with an integrated oven, hob and extractor",
      "Bedroom with a wardrobe and a chest of drawers",
      "Bathroom with a bath and shower over",
      "Entrance hallway",
      "Furnished",
    ],
    photos: [
      [1, "Bedroom with a double bed, wardrobe and a chest of drawers"],
      [2, "Fitted kitchen with white units, a black worktop and an integrated oven"],
      [3, "Bathroom with a bath, glass shower screen and a shower over"],
      [0, "Entrance hallway with the front door and a doorway through to the bedroom"],
    ],
  },
  {
    slug: "anvil-place",
    name: "Apartment 17, 6 Anvil Place",
    crumb: "Apartment 17, 6 Anvil Place",
    map: "6 Anvil Place, Manchester",
    type: "Apartment",
    area: "",
    areaLabel: "",
    tag: "Balcony",
    blurb:
      "An apartment at Anvil Place, with a living room opening onto a Juliet balcony, a dining area beside the kitchen, a bedroom with a wardrobe, and a bathroom with a shower over the bath.",
    extra: "",
    features: [
      "Living room with a floor-to-ceiling window and a Juliet balcony",
      "Dining area open to the kitchen",
      "Fitted kitchen with an integrated fridge freezer, oven, hob and washing machine",
      "Bedroom with a wardrobe and bedside drawers",
      "Bathroom with a bath, shower over and a basin",
      "Entrance hall",
    ],
    photos: [
      [0, "Living room with a sofa, coffee table and a floor-to-ceiling window onto a Juliet balcony"],
      [5, "Dining area with a table and four chairs, looking through to the kitchen"],
      [3, "Kitchen with an integrated fridge freezer, oven, hob, extractor and washing machine"],
      [4, "Kitchen with wood-effect worktops and integrated appliances"],
      [2, "Bedroom with a double bed, wardrobe and bedside drawers"],
      [6, "Bathroom with a bath, glass shower screen, basin and WC"],
      [1, "Entrance hall with the front door"],
    ],
  },
  {
    slug: "rope-works",
    name: "Apartment 5, The Rope Works",
    crumb: "Apartment 5, The Rope Works",
    map: "The Rope Works",
    type: "Apartment",
    area: "",
    areaLabel: "",
    tag: "Furnished",
    blurb:
      "A furnished apartment at The Rope Works, with an open-plan living and dining room running to a full-height window, a fitted kitchen in dark units, a bedroom with mirrored wardrobes, a shower room and a bathroom.",
    extra: "",
    features: [
      "Open-plan living and dining room with a full-height window",
      "Fitted kitchen with an induction hob, integrated oven and an undermount sink",
      "Bedroom with mirrored sliding wardrobes",
      "Shower room with a walk-in shower and a heated towel rail",
      "Bathroom with a panelled bath",
      "Furnished",
    ],
    photos: [
      [1, "Open-plan living and dining room with a corner sofa, round dining table and a full-height window"],
      [0, "Kitchen with dark units, a white worktop, induction hob and an integrated oven"],
      [2, "Bedroom with mirrored sliding wardrobes and a navy feature wall"],
      [3, "Shower room with a walk-in shower, basin on a vanity unit and a heated towel rail"],
      [4, "Bathroom with a panelled bath and a tiled surround"],
    ],
  },
  {
    slug: "whitworth-street",
    name: "Apartment 508, 51 Whitworth Street, Manchester",
    crumb: "Apartment 508, 51 Whitworth Street, Manchester M1 5ED",
    map: "51 Whitworth Street, Manchester M1 5ED",
    type: "Apartment",
    area: "manchester",
    areaLabel: "Manchester",
    tag: "City centre",
    blurb:
      "A furnished apartment on Whitworth Street in the centre of Manchester, with a living room opening to a full-height window, a fitted kitchen with integrated appliances, bedrooms off the hallway, a bathroom and an en-suite shower room.",
    extra: "",
    features: [
      "Living room with a full-height window and a television",
      "Fitted kitchen with an integrated oven, hob, dishwasher and an American-style fridge freezer",
      "Furnished bedrooms with wardrobes and drawers",
      "Bathroom with a bath and shower over",
      "En-suite shower room",
      "Manchester city centre",
      "Furnished",
    ],
    photos: [
      [5, "Living room with a sofa, armchair, television and a full-height window"],
      [4, "Fitted kitchen with an integrated oven, hob, extractor, dishwasher and an American-style fridge freezer"],
      [6, "Bedroom with a double bed, bedside table and a window over the city"],
      [7, "Bedroom with a bed, wardrobe and a chest of drawers"],
      [2, "Hallway with framed artwork, looking through to a bedroom"],
      [3, "Entrance hall with doors to the rooms"],
      [0, "En-suite shower room with a walk-in shower, basin and WC"],
      [1, "Bathroom with a bath, shower over, basin and WC"],
    ],
  },
];

/* ------------------------------------------------------------- the chrome */

const src = readFileSync(SOURCE, "utf8");
const HEAD_END = src.indexOf("<main id=\"main\">") + "<main id=\"main\">".length;
const FOOT_START = src.indexOf("</main>");
if (HEAD_END < 40 || FOOT_START < 0) throw new Error("cannot find the chrome markers in " + SOURCE);
const CHROME_TOP = src.slice(0, HEAD_END);
const CHROME_BOTTOM = src.slice(FOOT_START);

const enc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const u = (s) => encodeURIComponent(String(s));

/* Photo dimensions, read off disk so the pages never guess and never shift. */
const PROPDIR = join(T, "assets", "mcr", "props");
const files = new Set(readdirSync(PROPDIR));
function dims(file) {
  const b = readFileSync(join(PROPDIR, file));
  /* JPEG: walk the markers to the SOF and read the frame size. */
  for (let i = 2; i < b.length - 9; ) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc)
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error("no JPEG frame header in " + file);
}

function head(p) {
  const title = `${p.name} | Megacity Properties`;
  const desc = p.blurb;
  const url = `${ORIGIN}/templates/megacity-let-${p.slug}`;
  const img = `${ORIGIN}/templates/assets/mcr/props/${photoFile(p, 0)}`;
  return CHROME_TOP
    .replace(/<title>[^<]*<\/title>/, `<title>${enc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(">)/, `$1${enc(desc)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(">)/, `$1${url}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(">)/, `$1${url}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(">)/, `$1${enc(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(">)/, `$1${enc(desc)}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(">)/, `$1${img}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(">)/, `$1${enc(title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(">)/, `$1${enc(desc)}$2`)
    .replace(/(<meta name="twitter:image" content=")[^"]*(">)/, `$1${img}$2`);
}

const photoFile = (p, i) => `${p.slug}-${String(p.photos[i][0]).padStart(2, "0")}.jpg`;

function facts(p) {
  /* Only rows we were actually given. Rent, deposit, beds, baths, council tax,
     EPC and the reference are not among them yet. */
  const rows = [];
  if (p.type) rows.push(["Type", p.type]);
  rows.push(["Availability", AVAILABLE]);
  rows.push(["Furnishing", p.tag === "Furnished" ? "Furnished" : "Ask the office"]);
  return rows
    .map(([k, v]) => `        <div><dt>${enc(k)}</dt><dd>${enc(v)}</dd></div>`)
    .join("\n");
}

function main(p) {
  const cover = photoFile(p, 0);
  const rest = p.photos.slice(1);
  const gallery = rest
    .map(([n, alt]) => {
      const f = `${p.slug}-${String(n).padStart(2, "0")}.jpg`;
      const a = `${alt}, ${p.name}`;
      return `      <button class="pg-thumb" data-full="assets/mcr/props/${f}" aria-label="View photo: ${enc(alt.toLowerCase())}"><img loading="lazy" src="assets/mcr/props/${f}" alt="${enc(a)}"></button>`;
    })
    .join("\n");

  const quick = [p.type ? `<li>${enc(p.type)}</li>` : "", `<li>${enc(AVAILABLE)}</li>`]
    .filter(Boolean)
    .join("");

  return `
<nav class="pd-crumb" aria-label="Breadcrumb">
  <a href="megacity-renting#available">Properties to rent</a> <span>/</span> <b>${enc(p.crumb)}</b>
</nav>

<section class="pd-hero">
  <figure class="pd-main">
    <img src="assets/mcr/props/${cover}" alt="${enc(p.photos[0][1] + ", " + p.name)}" fetchpriority="high">
  </figure>
  <div class="pd-head">
    <p class="no">${p.type ? enc(p.type) + " to rent" : "To rent"}</p>
    <h1>${enc(p.name)}</h1>
    <p class="pd-price pd-price--ask">Rent on application</p>
    <ul class="pd-quick">
      ${quick}
    </ul>
    <div class="pd-ctas">
      <a class="btn btn--fill" href="#viewing">Arrange a viewing</a>
      <a class="btn" href="tel:+441612201763">Call 0161 220 1763</a>
    </div>
  </div>
</section>

<nav class="pd-actions" aria-label="Property actions">
  <button type="button" class="pd-act" data-print>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 8V3h10v5M7 17H4v-6a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 11v6h-3"/><path d="M7 14h10v7H7z"/></svg>
    Print / save as PDF</button>
  <a class="pd-act" href="#tour360">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M3.5 12c0 2.8 3.8 5 8.5 5s8.5-2.2 8.5-5-3.8-5-8.5-5-8.5 2.2-8.5 5z"/></svg>
    360&deg; virtual tour</a>
  <a class="pd-act" href="#epc">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 3h9l3 3v15H6z"/><path d="M9 12h6M9 16h6M9 8h3"/></svg>
    EPC</a>
  <a class="pd-act" href="#map">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-6.5-5.4-6.5-10a6.5 6.5 0 0 1 13 0c0 4.6-6.5 10-6.5 10z"/><circle cx="12" cy="10.6" r="2.3"/></svg>
    Map &amp; area</a>
</nav>

<section class="pd-gallery" aria-label="Photographs">
  <div class="pg-grid">
${gallery}
  </div>
</section>

<section class="pd-body">
  <div class="pd-main-col">
    <h2>About this property</h2>
    <p>${enc(p.blurb)}</p>${p.extra ? `<p>${enc(p.extra)}</p>` : ""}

    <h3>Key features</h3>
    <ul class="pd-ticks">
${p.features.map((f) => `      <li>${enc(f)}</li>`).join("\n")}
    </ul>

    <div class="pd-block pd-block--ask">
      <h3>Rent and the rest of the detail</h3>
      <p>The rent, deposit, room count, council tax band and reference for this property are held on
        our lettings system. Ring the office or send us a message and we will give you the figures
        and send the full brochure the same day.</p>
      <p><a class="jr-link" href="tel:+441612201763">Call 0161 220 1763</a> &nbsp;
        <a class="jr-link" href="https://wa.me/447804900719?text=${u("Hello, please could you send me the rent and full details for " + p.name + "?")}" target="_blank" rel="noopener">Ask on WhatsApp &rarr;</a></p>
    </div>

    <div class="pd-block" id="epc">
      <h3>Energy performance</h3>
      <p>Ask the office for this property&rsquo;s certificate and we will send it over with the brochure
        and the floor plan.</p>
    </div>

    <div class="pd-block" id="tour360">
      <h3>360&deg; virtual tour</h3>
      <p>Every home we manage gets professional photography and a 360&deg; walkthrough. Ask us for this
        home&rsquo;s tour, or a video of anything you want a closer look at, before you travel.</p>
      <a class="btn" href="https://wa.me/447804900719?text=${u("Hello, please could you send me the 360 tour of " + p.name + " when it is ready?")}" target="_blank" rel="noopener">Ask for the tour on WhatsApp</a>
    </div>

    <div class="pd-block">
      <h3>What we need from you</h3>
      <p>Every applicant is referenced the same way, and we will tell you honestly before a viewing
        whether you are likely to pass.</p>
      <ul class="pd-ticks">
        <li>Proof of income that comfortably covers the rent, or a UK-based guarantor</li>
        <li>Photo ID for the Right to Rent check, which is a legal requirement</li>
        <li>A previous landlord reference where you have one</li>
        <li>Credit check and confirmation of employment or student status</li>
      </ul>
      <p>Under the Tenant Fees Act we cannot charge you for referencing, for the tenancy agreement or
        for an inventory. The deposit is capped at five weeks' rent and is protected with the Deposit
        Protection Service within 30 days. <a class="jr-link" href="megacity-renting#faq">More on renting with us &rarr;</a></p>
    </div>
  </div>

  <aside class="pd-side">
    <div class="pd-card">
      <h3>Key facts</h3>
      <dl class="pd-facts">
${facts(p)}
      </dl>
      <p class="pd-facts-note">Rent, deposit and room numbers on request.</p>
    </div>
    <div class="pd-card pd-card--cta" id="viewing">
      <h3>Arrange a viewing</h3>
      <p>Viewings are accompanied, so there is someone there who can answer your questions about the
        bills, the heating and the neighbours.</p>
      <form class="pd-vform" data-viewing data-property="${enc(p.name)}">
        <input name="name" placeholder="Your name" required maxlength="120" autocomplete="name">
        <input name="phone" type="tel" placeholder="Phone number" required maxlength="60" autocomplete="tel">
        <input name="email" type="email" placeholder="Email (optional)" maxlength="160" autocomplete="email">
        <input name="day" placeholder="When suits you? e.g. weekday evenings" maxlength="40">
        <input type="text" name="botcheck" class="vis-hidden" tabindex="-1" autocomplete="off" aria-hidden="true">
        <button type="submit" class="btn btn--fill">Request a viewing</button>
        <p class="pd-vnote" aria-live="polite"></p>
      </form>
      <p class="pd-vdone" hidden>Request sent &mdash; we will come back to you to confirm a time.</p>
      <a class="btn" href="tel:+441612201763">Or call 0161 220 1763</a>
      <a class="btn" href="https://wa.me/447804900719" target="_blank" rel="noopener">WhatsApp us</a>
      <a class="btn" href="mailto:lettings@megacityproperties.co.uk?subject=${u("Viewing enquiry: " + p.name)}">Email lettings</a>
      <a class="btn" href="megacity-tenant-application-form?property=${u(p.name)}&amp;listing=${p.slug}">Apply for this property</a>
    </div>

  </aside>
</section>

<section class="pd-map" id="map" aria-label="Location map">
  <div class="sec-in">
    <p class="no">Where it is</p>
    <h2>On the <em>map.</em></h2>
    <div class="pd-mapframe">
      <iframe src="https://www.google.com/maps?q=${u(p.map)}&amp;output=embed"
        title="Map showing ${enc(p.map)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
    </div>
  </div>
</section>

<section class="endcta">
  <h2>Want to see it<br><em>in person?</em></h2>
  <p>Ring the office and we will get you booked in. If it has just gone, we will tell you what else is coming up.</p>
  <div class="ctas">
    <a class="btn btn--fill" href="tel:+441612201763">Call 0161 220 1763</a>
    <a class="btn" href="megacity-renting#available">See other properties</a>
  </div>
</section>

`;
}

/* ------------------------------------------------------------------- write */

const check = process.argv.includes("--check");
let stale = 0;

for (const p of PROPS) {
  for (const [n] of p.photos) {
    const f = `${p.slug}-${String(n).padStart(2, "0")}.jpg`;
    if (!files.has(f)) throw new Error(`missing photo ${f}`);
  }
  const html = head(p) + main(p) + CHROME_BOTTOM;
  const out = join(T, `megacity-let-${p.slug}.html`);
  let before = "";
  try { before = readFileSync(out, "utf8"); } catch { /* new page */ }
  if (before === html) continue;
  stale++;
  if (check) { console.log("stale: " + out); continue; }
  writeFileSync(out, html);
  console.log(`wrote megacity-let-${p.slug}.html (${p.photos.length} photos)`);
}

/* The properties grid card for each, so they are reachable from the site. */
export function cards() {
  return PROPS.map((p) => {
    const f = photoFile(p, 0);
    const d = dims(f);
    const facts = [p.type ? `<span>${enc(p.type)}</span>` : "", `<span>${enc(AVAILABLE)}</span>`]
      .filter(Boolean).join("");
    return `      <a class="pl-card" href="megacity-let-${p.slug}"
         data-area="${p.area}" data-type="${(p.type || "").toLowerCase()}" data-beds="">
        <span class="pl-img"><img src="assets/mcr/props/${f}" alt="${enc(p.photos[0][1] + ", " + p.name)}" loading="lazy" decoding="async" width="${d.w}" height="${d.h}"></span>
        <span class="pl-tag">${enc(p.tag)}</span>
        <span class="pl-body">
${p.areaLabel ? `          <span class="pl-area">${enc(p.areaLabel)}</span>\n` : ""}          <b>${enc(p.name)}</b>
          <span class="pl-facts">${facts}</span>
          <span class="pl-go">View Property
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 12h13M12.5 6l6 6-6 6"/></svg></span>
        </span>
      </a>`;
  }).join("\n");
}

export { PROPS, AVAILABLE };

if (check) process.exit(stale ? 1 : 0);
if (process.argv.includes("--cards")) console.log(cards());
