/* Megacity — the office details from Studio → Settings → Branding, on every
   public page.

   The pages carry the office address, phone, email and WhatsApp number as
   printed text (the header menu, every footer, the contact page, the
   structured data Google reads, the map links). The Branding screen says
   those details are "shown in the website header, footer and on every
   enquiry email", and Walid changed the address there expecting the site to
   follow (27 Sep: "when i changed into the backoffice it should change
   too"). It did not: only the listing pages read Branding.

   So each detail the pages print is listed here, in every form it takes,
   and when a saved Branding value differs from it, every one of those forms
   is swapped for the saved value on the way out. When nothing differs,
   nothing is touched and the page is sent exactly as before, so the only
   pages that change are the ones Walid asked to change.

   The swap is a single pass (one regular expression, longest form first),
   so a new value that contains an old one (Office 20 in the same building)
   is never replaced a second time. The business name is not swapped: it is
   in titles, headings and legal lines where a blind swap would do harm.
   Prose that mentions the office in passing ("We are at The Tube Business
   Centre on North Street") is Website text, edited in Edit website. */

/* what the pages print today; keep in step with the templates */
export const PRINTED = {
  address: "Office 18, The Tube Business Centre, 86 North Street, Manchester M8 8RA",
  phone: "0161 220 1763",
  phoneE164: "+441612201763",
  email: "info@megacityproperties.co.uk",
  whatsapp: "447804900719",
};

const norm = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/* a JSON string for inside <script type="application/ld+json"> */
const J = (s) => JSON.stringify(String(s)).replace(/</g, "\\u003c");
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const UK_POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\s*$/i;

/* "Office 18, The Tube Business Centre, 86 North Street, Manchester M8 8RA"
   -> the parts the pages use */
export function addressParts(a) {
  const full = norm(a);
  const parts = full.split(/\s*,\s*/).filter(Boolean);
  const half = Math.ceil(parts.length / 2);
  const out = { full, line1: parts.slice(0, half).join(", "), line2: parts.slice(half).join(", "), street: null, locality: null, postcode: null };
  const m = UK_POSTCODE.exec(full);
  if (m) {
    out.postcode = (m[1] + " " + m[2]).toUpperCase();
    const rest = full.slice(0, m.index).replace(/[\s,]+$/, "").split(/\s*,\s*/).filter(Boolean);
    if (rest.length > 1) { out.locality = rest.pop(); out.street = rest.join(", "); }
  }
  return out;
}

/* "0161 220 1763" -> "+441612201763"; null when it is not a phone number */
export function e164(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.length < 10 || d.length > 15) return null;
  if (d.startsWith("44")) return "+" + d;
  if (d.startsWith("0")) return "+44" + d.slice(1);
  return "+" + d;
}
/* the digits wa.me wants, the same rule the listing pages use (render.js) */
export function waDigits(n) {
  const d = String(n || "").replace(/\D/g, "");
  if (d.length < 10 || d.length > 15) return null;
  return d.startsWith("44") ? d : "44" + d.replace(/^0/, "");
}

/* [from, to] for every printed form of every Branding value that differs */
export function brandPairs(brand) {
  const b = brand || {};
  const P = PRINTED, pairs = [];

  const addr = norm(b.address);
  if (addr && addr.toLowerCase() !== P.address.toLowerCase()) {
    const n = addressParts(addr), o = addressParts(P.address);
    pairs.push([`${o.line1},<br>${o.line2}`, n.line2 ? `${esc(n.line1)},<br>${esc(n.line2)}` : esc(n.full)]);
    pairs.push([`<b>${o.line1}</b><span>${o.line2}</span>`, `<b>${esc(n.line1)}</b><span>${esc(n.line2)}</span>`]);
    pairs.push([P.address, esc(n.full)]);
    pairs.push(["Office 18, The Tube, 86 North Street, M8 8RA", esc(n.full)]);
    pairs.push(["The Tube Business Centre, 86 North Street, Manchester M8 8RA", esc(n.full)]);
    pairs.push(["The+Tube+Business+Centre,+86+North+Street,+Manchester+M8+8RA", encodeURIComponent(n.full).replace(/%20/g, "+")]);
    /* structured data only when the new address reads as street, town,
       postcode; otherwise Google keeps a complete old one rather than a
       half-new one */
    if (n.street && n.locality && n.postcode) {
      pairs.push([`"streetAddress":${J(o.street)}`, `"streetAddress":${J(n.street)}`]);
      pairs.push([`"addressLocality":${J(o.locality)},"postalCode":${J(o.postcode)}`, `"addressLocality":${J(n.locality)},"postalCode":${J(n.postcode)}`]);
    }
  }

  const phone = norm(b.phone), tel = e164(phone);
  if (phone && tel && tel !== P.phoneE164) {
    pairs.push([`tel:${P.phoneE164}`, `tel:${tel}`]);
    pairs.push([`"telephone":"${P.phoneE164}"`, `"telephone":"${tel}"`]);
    pairs.push([P.phone, esc(phone)]);
  }

  const email = norm(b.email).toLowerCase();
  if (email && email !== P.email && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email)) {
    pairs.push([P.email, esc(email)]);
  }

  const wa = waDigits(b.whatsapp);
  if (wa && wa !== P.whatsapp) pairs.push([`wa.me/${P.whatsapp}`, `wa.me/${wa}`]);

  return pairs;
}

/* one pass: every printed form is replaced at most once */
export function applyBrand(html, pairs) {
  if (!pairs || !pairs.length) return html;
  const map = new Map(pairs);
  const re = new RegExp([...map.keys()].sort((a, b) => b.length - a.length).map(reEsc).join("|"), "g");
  return String(html).replace(re, (m) => map.get(m));
}
