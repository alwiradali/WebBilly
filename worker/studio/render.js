/* Megacity Studio — Worker-rendered public pages.

   The hand-built listing page is the template (templates/megacity-let-
   template.html, slots marked data-slot). For a live listing the Worker
   fetches that asset and fills the slots with HTMLRewriter, so the page keeps
   the exact design while every fact comes from the database. Anything not
   stated is simply not rendered. Unknown or draft slugs fall through to the
   static files, so nothing ever leaks and the demo pages keep working. */

import { parseJson } from "./db.js";
import { label } from "./options.js";
import { listForListing, mediaUrl } from "./media.js";
import { pageUrl } from "./public.js";

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const money = (n) => "£" + Number(n).toLocaleString("en-GB");
const plural = (n, one, many) => n + " " + (n === 1 ? one : many || one + "s");

function publicBase(env, url) {
  const b = env.MEGACITY_PUBLIC_BASE || (url.origin + "/templates/");
  return b.replace(/\/?$/, "/");
}
function absolute(env, url, path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const origin = new URL(publicBase(env, url)).origin;
  return origin + (path.startsWith("/") ? path : "/templates/" + path);
}

/* the live listing row plus everything the page needs; null when not live */
export async function loadLive(db, id) {
  const r = await db.prepare(
    `SELECT l.*, (SELECT 1 FROM tours t WHERE t.listing_id=l.id AND t.status='live') AS tour_live
       FROM listings l WHERE l.id=?1 AND l.status='live' AND l.hidden=0 AND l.deleted_at IS NULL`
  ).bind(id).first();
  if (!r) return null;
  const media = await listForListing(db, id);
  return { r, media };
}

function view(env, url, { r, media }, settings) {
  const home = { bathrooms: [], receptions: [], kitchen: null, garden: null, driveway: null, ...parseJson(r.home_json, {}) };
  const extras = (parseJson(r.external_json, {}) || {}).extras || {};
  const isRoom = r.let_type === "room" || r.type === "room_in_share";
  const photos = media.filter((m) => m.kind === "photo" || m.kind === "pano");
  const cover = photos.find((m) => m.id === r.cover_media_id) || photos.find((m) => m.role === "cover") || photos[0] || null;
  const gallery = photos.filter((m) => m !== cover && m.role !== "epc" && m.role !== "floorplan" && m.role !== "og");
  const epcImg = media.find((m) => m.role === "epc");
  const floorplan = media.find((m) => m.role === "floorplan");
  const addr = [r.address_1, r.address_2, r.town].filter(Boolean).join(", ");
  const addrShort = [r.address_1, r.town].filter(Boolean).join(", ");
  const typeLabel = label("type", r.type) || "Property";
  const beds = isRoom ? 1 : r.bedrooms;
  const bathsCount = home.bathrooms.length;
  const bathsShared = home.bathrooms.some((b) => b.subtype === "shared");
  const summary = r.summary || (r.description || "").split(/\n{2,}/)[0] || "";
  const desc = (r.description || "").split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  const features = parseJson(r.features_json, []);
  const availability = r.availability === "from_date" && r.available_from
    ? "Available from " + new Date(r.available_from + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : label("availability", r.availability);
  const brand = (settings && settings.brand) || {};
  const links = (settings && settings.links10ninety) || {};
  const phone = brand.phone || "0161 220 1763";
  const phoneHref = "tel:+44" + phone.replace(/\D/g, "").replace(/^0/, "");
  const wa = (brand.whatsapp || "").replace(/\D/g, "");
  const waDigits = wa ? (wa.startsWith("44") ? wa : "44" + wa.replace(/^0/, "")) : null;
  const title = r.title;
  const pageTitle = title + " | Megacity Properties";
  const metaDesc = r.seo_description || summary.slice(0, 155);
  const canonical = publicBase(env, url) + "megacity-let-" + r.id;
  const ogImage = cover ? absolute(env, url, cover.url) : absolute(env, url, "assets/mcr/ph-manchester.jpg");
  return { r, home, extras, isRoom, photos, cover, gallery, epcImg, floorplan, addr, addrShort, typeLabel, beds, bathsCount, bathsShared, summary, desc, features, availability, brand, links, phone, phoneHref, waDigits, title, pageTitle, metaDesc, canonical, ogImage };
}

/* ── fragments ─────────────────────────────────────────────────────────── */
function quickHtml(v) {
  const li = [];
  if (v.isRoom) li.push("<li><b>1</b> room</li>");
  else if (v.beds != null) li.push(`<li><b>${v.beds}</b> bed</li>`);
  if (v.bathsShared) li.push("<li>Shared bath</li>");
  else if (v.bathsCount) li.push(`<li><b>${v.bathsCount}</b> bath</li>`);
  if (v.availability) li.push(`<li>${esc(v.availability)}</li>`);
  return li.join("");
}

function galleryHtml(v) {
  return v.gallery.map((m) => {
    const alt = m.alt || (m.roomLabel ? m.roomLabel + ", " + v.addrShort : v.title);
    return `<button class="pg-thumb" data-full="${esc(m.url)}" aria-label="View photo: ${esc(m.roomLabel || alt)}"><img loading="lazy" src="${esc(m.thumb || m.url)}" alt="${esc(alt)}"></button>`;
  }).join("\n      ");
}

function homeItems(v) {
  const r = v.r, h = v.home, items = [];
  if (v.isRoom) items.push("One room, in a shared home");
  else if (r.bedrooms != null) items.push(r.bedrooms === 0 ? "Studio" : plural(r.bedrooms, "bedroom"));
  h.receptions.forEach((x) => items.push((label("reception", x.subtype) || "Living room") + (x.notes ? " — " + x.notes : "")));
  if (h.kitchen) items.push((label("kitchen", h.kitchen.subtype) || "Kitchen") + (h.kitchen.notes ? " — " + h.kitchen.notes : ""));
  h.bathrooms.forEach((x) => items.push((label("bathroom", x.subtype) || "Bathroom") + (x.notes ? " — " + x.notes : "")));
  if (h.garden) items.push((label("garden", h.garden.subtype) || "Garden") + (h.garden.notes ? " — " + h.garden.notes : ""));
  if (h.driveway) items.push((label("driveway", h.driveway.subtype) || "Driveway") + (h.driveway.notes ? " — " + h.driveway.notes : ""));
  if (r.parking_spaces != null) {
    if (r.parking_spaces > 0) items.push(plural(r.parking_spaces, "parking space"));
    else items.push("No allocated parking" + (r.parking_note ? " — " + r.parking_note : ""));
  }
  if (r.floor_area_sqft) items.push(Number(r.floor_area_sqft).toLocaleString("en-GB") + " sq ft");
  if (r.furnishing) items.push(label("furnishing", r.furnishing));
  if (r.bills) items.push(label("bills", r.bills) + (r.bills_note ? " — " + r.bills_note : ""));
  if (r.pets) items.push(label("pets", r.pets));
  if (r.min_term) items.push("Minimum term " + label("minTerm", r.min_term).toLowerCase());
  if (r.hmo_licensed) items.push("Licensed HMO" + (r.hmo_licence_ref ? " (" + r.hmo_licence_ref + ")" : ""));
  return items;
}

function mainHtml(v) {
  let h = "";
  h += "<h2>About this property</h2>\n";
  h += (v.desc.length ? v.desc : [v.summary]).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("");
  if (v.features.length) h += `\n<h3>Key features</h3>\n<ul class="pd-ticks">${v.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>`;
  const items = homeItems(v);
  if (items.length) h += `\n<h3>The home</h3>\n<ul class="pd-ticks">${items.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>`;
  if (Array.isArray(v.extras.services) && v.extras.services.length) {
    h += `\n<h3>Services</h3>\n<dl class="pd-mini">${v.extras.services.map(([k, val]) => `<div><dt>${esc(k)}</dt><dd>${esc(val)}</dd></div>`).join("")}</dl>`;
  }
  return h;
}

function epcHtml(v) {
  const r = v.r;
  if (!r.epc_rating && !v.epcImg && !v.floorplan && !(v.extras.links && v.extras.links.tenninety)) return null;
  let h = "<h3>Energy performance</h3>";
  if (r.epc_rating === "pending") h += "<p>The certificate for this property is being re-issued. Ask the office and we will send it over.</p>";
  else if (r.epc_rating) h += `<p>Energy rating <b>${esc(r.epc_rating)}</b>.</p>`;
  if (v.epcImg) h += `<figure class="pd-epc"><img loading="lazy" src="${esc(v.epcImg.url)}" alt="${esc(v.epcImg.alt || "Energy efficiency rating certificate for " + v.addr)}"></figure>`;
  if (v.floorplan) h += `<p><a class="jr-link" href="${esc(v.floorplan.url)}" target="_blank" rel="noopener">${v.floorplan.kind === "pdf" ? "Open the floor plan (PDF)" : "View the floor plan"} &rarr;</a></p>`;
  if (v.extras.links && v.extras.links.tenninety) h += `<p>The floor plan and full brochure are held on our lettings portal. <a class="jr-link" href="${esc(v.extras.links.tenninety)}" target="_blank" rel="noopener">View floor plan and brochure &rarr;</a></p>`;
  return h;
}

function tourHtml(v) {
  if (v.r.tour_live) {
    return `<h3>360&deg; virtual tour</h3>
      <p>Walk through ${esc(v.addrShort || "the property")} from wherever you are. Drag to look around; tap a door to move between rooms.</p>
      <div class="pd-tour" data-billy360="${esc(v.r.id)}" data-height="16:9" data-title="${esc(v.title)} — 360° virtual tour"></div>
      <p><a class="jr-link" href="/billy360/?site=${encodeURIComponent(v.r.id)}" target="_blank" rel="noopener">Open the tour full screen &rarr;</a></p>
      <script src="/billy360/embed.js" defer></script>`;
  }
  const ask = v.waDigits
    ? `<a class="btn" href="https://wa.me/${v.waDigits}?text=${encodeURIComponent("Hello, please could you send me the 360 tour of " + v.title + " when it is ready?")}" target="_blank" rel="noopener">Ask for the tour on WhatsApp</a>`
    : `<a class="btn" href="${esc(v.phoneHref)}">Call ${esc(v.phone)} to ask for the tour</a>`;
  return `<h3>360&deg; virtual tour</h3>
      <p>Every home we manage gets professional photography and a 360&deg; walkthrough. Ask us for this home&rsquo;s tour, or a video of anything you want a closer look at, before you travel.</p>
      ${ask}`;
}

function factsHtml(v) {
  const r = v.r, rows = [];
  const row = (k, val) => { if (val != null && val !== "") rows.push(`<div><dt>${esc(k)}</dt><dd>${esc(val)}</dd></div>`); };
  if (r.rent_pcm) row("Rent", money(r.rent_pcm) + " pcm");
  if (r.deposit) row("Deposit", money(r.deposit) + (v.extras.depositNote ? " " + v.extras.depositNote.toLowerCase() : ""));
  if (v.isRoom) row("Let type", "Room in a shared home");
  else if (r.bedrooms != null) row("Bedrooms", String(r.bedrooms));
  if (v.bathsShared) row("Bathrooms", "Shared");
  else if (v.bathsCount) row("Bathrooms", String(v.bathsCount));
  row("Type", label("type", r.type));
  if (r.furnishing) row("Furnishing", label("furnishing", r.furnishing));
  if (r.council_tax_band) row("Council tax", "Band " + r.council_tax_band);
  if (r.epc_rating && r.epc_rating !== "pending") row("EPC rating", r.epc_rating);
  if (r.min_term) row("Minimum term", label("minTerm", r.min_term));
  if (r.ref) row("Reference", r.ref);
  if (v.availability) row("Availability", v.availability);
  return rows.join("\n        ");
}

function jsonLd(env, url, v) {
  const r = v.r;
  const kind = /^house_|bungalow/.test(r.type || "") ? "House" : v.isRoom ? "Room" : "Apartment";
  const about = {
    "@type": kind, name: v.title,
    ...(v.beds != null && !v.isRoom ? { numberOfBedrooms: v.beds } : {}),
    ...(v.bathsCount && !v.bathsShared ? { numberOfBathroomsTotal: v.bathsCount } : {}),
    ...(r.floor_area_sqft ? { floorSize: { "@type": "QuantitativeValue", value: r.floor_area_sqft, unitCode: "FTK" } } : {}),
    ...(r.pets ? { petsAllowed: r.pets !== "no" } : {}),
    address: { "@type": "PostalAddress", ...(r.address_1 ? { streetAddress: [r.address_1, r.address_2].filter(Boolean).join(", ") } : {}), ...(r.town ? { addressLocality: r.town } : {}), ...(r.postcode ? { postalCode: r.postcode } : {}), addressRegion: "Greater Manchester", addressCountry: "GB" },
    ...(r.lat != null && r.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: r.lat, longitude: r.lng } } : {}),
  };
  const listing = {
    "@type": "RealEstateListing", "@id": v.canonical + "#listing", name: v.title, url: v.canonical, description: v.metaDesc,
    ...(r.published_at ? { datePosted: r.published_at } : {}),
    image: v.photos.slice(0, 8).map((m) => absolute(env, url, m.url)),
    about,
    ...(r.rent_pcm ? { offers: { "@type": "Offer", price: r.rent_pcm, priceCurrency: "GBP", priceSpecification: { "@type": "UnitPriceSpecification", price: r.rent_pcm, priceCurrency: "GBP", unitText: "MONTH" }, businessFunction: "http://purl.org/goodrelations/v1#LeaseOut", availability: r.availability === "let_agreed" ? "https://schema.org/SoldOut" : "https://schema.org/InStock", url: v.canonical } } : {}),
    provider: { "@type": "RealEstateAgent", name: "Megacity Properties", telephone: v.phone, url: publicBase(env, url) + "megacity-skyline" },
  };
  const crumbs = {
    "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: publicBase(env, url) + "megacity-skyline" },
      { "@type": "ListItem", position: 2, name: "Properties to rent", item: publicBase(env, url) + "megacity-properties" },
      { "@type": "ListItem", position: 3, name: v.title, item: v.canonical },
    ],
  };
  return JSON.stringify({ "@context": "https://schema.org", "@graph": [listing, crumbs] });
}

/* ── the page ──────────────────────────────────────────────────────────── */
export async function renderListingPage(request, env, url, live, settings) {
  const v = view(env, url, live, settings);
  const tpl = await env.ASSETS.fetch(new Request(new URL("/templates/megacity-let-template.html", url).toString()));
  if (!tpl.ok) return null;
  const mapQ = encodeURIComponent([v.addr, v.r.postcode].filter(Boolean).join(", "));
  const epc = epcHtml(v);
  const rewriter = new HTMLRewriter()
    .on("title", { element: (e) => e.setInnerContent(v.pageTitle) })
    .on('meta[name="description"]', { element: (e) => e.setAttribute("content", v.metaDesc) })
    .on('link[rel="canonical"]', { element: (e) => e.setAttribute("href", v.canonical) })
    .on('meta[property="og:url"]', { element: (e) => e.setAttribute("content", v.canonical) })
    .on('meta[property="og:title"], meta[name="twitter:title"]', { element: (e) => e.setAttribute("content", v.pageTitle) })
    .on('meta[property="og:description"], meta[name="twitter:description"]', { element: (e) => e.setAttribute("content", v.metaDesc) })
    .on('meta[property="og:image"], meta[name="twitter:image"]', { element: (e) => e.setAttribute("content", v.ogImage) })
    .on('script[data-slot="ld"]', { element: (e) => { e.removeAttribute("data-slot"); e.setInnerContent(jsonLd(env, url, v), { html: true }); } })
    .on('[data-slot="crumb"]', { element: (e) => e.setInnerContent(v.addr || v.title) })
    .on('[data-slot="cover"]', { element: (e) => { if (v.cover) { e.setAttribute("src", v.cover.url); e.setAttribute("alt", v.cover.alt || v.title); } else e.remove(); } })
    .on('[data-slot="kicker"]', { element: (e) => e.setInnerContent((v.isRoom ? "Room" : v.typeLabel) + " to rent") })
    .on('[data-slot="title"]', { element: (e) => e.setInnerContent(v.title) })
    .on('[data-slot="price"]', { element: (e) => { if (v.r.rent_pcm) e.setInnerContent(`${esc(money(v.r.rent_pcm))} <span>pcm</span>`, { html: true }); else e.remove(); } })
    .on('[data-slot="quick"]', { element: (e) => e.setInnerContent(quickHtml(v), { html: true }) })
    .on('[data-slot="actions"] a[href="#epc"]', { element: (e) => { if (!epc) e.remove(); } })
    .on('[data-slot="gallery"]', { element: (e) => { if (v.gallery.length) e.setInnerContent(galleryHtml(v), { html: true }); else e.remove(); } })
    .on('[data-slot="main"]', { element: (e) => { e.removeAndKeepContent(); e.replace(mainHtml(v), { html: true }); } })
    .on('[data-slot="epc"]', { element: (e) => { if (epc) e.setInnerContent(epc, { html: true }); else e.remove(); } })
    .on('[data-slot="tour"]', { element: (e) => e.setInnerContent(tourHtml(v), { html: true }) })
    .on('[data-slot="facts"]', { element: (e) => e.setInnerContent(factsHtml(v), { html: true }) })
    .on('[data-slot="vform"]', { element: (e) => { e.setAttribute("data-property", v.title); e.setAttribute("data-listing", v.r.id); } })
    .on('[data-slot="mailto"]', { element: (e) => e.setAttribute("href", "mailto:" + (v.brand.email || "info@megacityproperties.co.uk") + "?subject=" + encodeURIComponent("Viewing enquiry: " + v.title)) })
    .on('[data-slot="apply"]', { element: (e) => { if (v.links.apply) e.setAttribute("href", v.links.apply); } })
    .on('[data-slot="map"]', { element: (e) => { e.setAttribute("src", "https://www.google.com/maps?q=" + mapQ + "&output=embed"); e.setAttribute("title", "Map showing " + v.addr); } })
    .on('[data-slot="mapsec"]', { element: (e) => { if (!v.addr) e.remove(); } })
    .on("[data-slot]", { element: (e) => e.removeAttribute("data-slot") })
    .onDocument({ comments: (c) => { if (/TEMPLATE:/.test(c.text)) c.remove(); } });
  const res = rewriter.transform(tpl);
  const headers = new Headers(res.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=60, s-maxage=120");
  headers.set("x-mc-render", "d1");
  headers.delete("content-length");
  return new Response(res.body, { status: 200, headers });
}

/* the properties index: the static page with its grid and filters replaced */
export async function renderPropertiesPage(request, env, url, cards) {
  const page = await env.ASSETS.fetch(new Request(new URL("/templates/megacity-properties.html", url).toString()));
  if (!page.ok || !cards.items.length) return null;
  const opt = (list, blank) => `<option value="">${blank}</option>` + list.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("");
  const cardHtml = cards.items.map((c) => {
    const facts = [c.typeShort === "room" ? "1 bedroom available" : (c.bedrooms != null ? c.bedrooms + " bed" : null),
      c.typeShort === "room" ? "Shared bath" : (c.bathrooms ? c.bathrooms + " bath" : null),
      c.typeShort === "room" ? "Room" : c.typeLabel].filter(Boolean);
    const img = c.cover ? `<img src="${esc(c.cover.thumb || c.cover.url)}" alt="${esc(c.cover.alt || c.title)}" loading="lazy" decoding="async" width="1400" height="1050">` : "";
    return `<a class="pl-card" href="megacity-let-${esc(c.id)}" data-area="${esc(c.area || "")}" data-type="${esc(c.typeShort)}" data-beds="${esc(String(c.bedrooms ?? ""))}">
        <span class="pl-img">${img}</span>
        ${c.tag || c.headline ? `<span class="pl-tag">${esc(c.headline || c.tag)}</span>` : ""}
        <span class="pl-body">
          <span class="pl-area">${esc([c.line1, c.town].filter(Boolean).join(", ") || c.areaLabel)}</span>
          <b>${esc(c.title)}</b>
          <span class="pl-facts">${facts.map((f) => `<span>${esc(f)}</span>`).join("")}</span>
          <span class="pl-go">View Property
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 12h13M12.5 6l6 6-6 6"/></svg></span>
        </span>
      </a>`;
  }).join("\n      ");
  const res = new HTMLRewriter()
    .on("#plGrid", { element: (e) => e.setInnerContent(cardHtml, { html: true }) })
    .on("#fArea", { element: (e) => e.setInnerContent(opt(cards.filters.areas, "All areas"), { html: true }) })
    .on("#fType", { element: (e) => e.setInnerContent(opt(cards.filters.types, "Any type"), { html: true }) })
    .on("#fBeds", { element: (e) => e.setInnerContent(opt(cards.filters.beds, "Any"), { html: true }) })
    .transform(page);
  const headers = new Headers(res.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=60, s-maxage=120");
  headers.set("x-mc-render", "d1");
  headers.delete("content-length");
  return new Response(res.body, { status: 200, headers });
}

/* sitemap: the static Megacity pages plus every live listing */
const STATIC_PAGES = ["megacity-skyline", "megacity-properties", "megacity-for-landlords", "megacity-tenant-find", "megacity-rent-collection", "megacity-fully-managed", "megacity-switch", "megacity-hmo", "megacity-maintenance", "megacity-compliance", "megacity-renting", "megacity-valuation", "megacity-tools", "megacity-journal", "megacity-about-us", "megacity-contact-us", "megacity-privacy", "megacity-terms"];
export async function sitemap(env, url, db) {
  const base = publicBase(env, url);
  const rows = (await db.prepare(`SELECT id, updated_at FROM listings WHERE status='live' AND hidden=0 AND deleted_at IS NULL`).all()).results || [];
  const pages = (await db.prepare(`SELECT slug, updated_at FROM pages WHERE status='live'`).all().catch(() => ({ results: [] }))).results || [];
  const items = STATIC_PAGES.map((p) => `<url><loc>${esc(base + p)}</loc></url>`)
    .concat(rows.map((r) => `<url><loc>${esc(base + "megacity-let-" + r.id)}</loc><lastmod>${esc(String(r.updated_at).slice(0, 10))}</lastmod></url>`))
    .concat(pages.map((p) => `<url><loc>${esc(base + "megacity-" + p.slug)}</loc><lastmod>${esc(String(p.updated_at).slice(0, 10))}</lastmod></url>`));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join("\n")}\n</urlset>\n`;
  return new Response(xml, { status: 200, headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=600" } });
}

export { mediaUrl, pageUrl };
