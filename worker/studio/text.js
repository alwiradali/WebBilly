/* 10ninety's descriptions are HTML fragments — "Media City.<br />Deposit:
   &pound;500<br /><br />" — and the site escapes what it prints, so the tags
   and entities reached visitors as literal text ("<br />", "&pound;"), and the
   same text went into Google's snippet. This turns such a fragment into plain
   text with its line breaks kept: <br> is a new line, a closed block is a new
   paragraph, other tags go, and entities become the characters they name.
   Plain text passes through unchanged, so it is safe to apply twice. */
const NAMED = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", pound: "£", euro: "€", dollar: "$",
  ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", hellip: "…", bull: "•",
  middot: "·", copy: "©", reg: "®", trade: "™", deg: "°", frac12: "½", frac14: "¼", frac34: "¾", sup2: "²", times: "×",
};
function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (all, e) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : all;
    }
    const v = NAMED[e.toLowerCase()];
    return v === undefined ? all : v;
  });
}
export function feedText(s) {
  if (s == null) return s;
  let t = String(s).replace(/\r\n?/g, "\n");
  if (!/[<&]/.test(t)) return t.trim();
  t = t
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|ul|ol|table|tr)\s*>/gi, "\n\n")
    .replace(/<li\b[^>]*>/gi, "\n• ")
    .replace(/<[^>]*>/g, "");
  t = decode(t);
  return t.replace(/[ \t ]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* A description cut to the length a search result shows, at the last whole
   word: slice(0, 155) left Anvil Place's Google snippet ending "…to the
   City Cen". */
export function clipWords(s, n = 155) {
  const t = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n - 1);
  const i = cut.lastIndexOf(" ");
  return (i > n * 0.6 ? cut.slice(0, i) : cut).replace(/[\s,;:.\-–—]+$/, "") + "…";
}

/* The display address 10ninety sends is built from its address fields with
   the flat and house numbers left out, on purpose: numbers stay off the
   public site. The words that went with them stay behind, so it arrives as
   "Apartment , Adelphi Wharf ,  Adelphi Street, Salford" (Walid, 26 Sep:
   "'Apartment ,' in several addresses"). This drops a part that is only a
   unit word ("Apartment", "Flat 58"), a number a part starts with ("99
   Denmark Road" -> "Denmark Road", so a number typed in later still stays
   off the site), and the stray spaces and commas. Nothing else changes:
   "Adelphi Wharf, Adelphi Street, Salford". The Studio shows the address as
   10ninety sent it, so the office can still see what is there. */
const UNIT_ONLY = /^(apartment|apt|flat|unit|room|suite|plot|no)\.?(\s*[0-9][0-9a-z/-]*)?$/i;
const LEADING_NUMBER = /^(?:(?:apartment|apt|flat|unit|room|suite|no)\.?\s*)?[0-9]+[a-z]?(?:[-/][0-9]+[a-z]?)?\s+(?=\S)/i;
export function displayAddress(s) {
  if (s == null) return s;
  return String(s).replace(/\s+/g, " ").split(",")
    .map((p) => p.trim())
    .filter((p) => p && !UNIT_ONLY.test(p))
    .map((p) => p.replace(LEADING_NUMBER, "").trim())
    .filter(Boolean)
    .join(", ");
}

/* The advert text as the public sees it. Two things only, both from 10ninety
   text that says something Walid did not mean to publish:
   - a house or flat number in front of the property's own street or
     building ("on the second floor at 99 Denmark Road"), and "Apartment 208"
     or "Flat 12" anywhere: numbers stay off the public site;
   - "Deposit: £0", which is a field not filled in (Carlton Road 9), not a
     tenancy with no deposit. The mapper already treats it that way.
   Every other word is his, as he typed it. */
const reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function advertText(s, title, town) {
  if (s == null) return s;
  let t = String(s).replace(/^[ \t]*deposit\s*:?\s*£\s*0(?:\.0+)?[ \t]*(?:\n|$)/gim, "");
  const own = String(town || "").trim().toLowerCase();
  const names = String(displayAddress(title) || "").split(",").map((x) => x.trim())
    .filter((x) => x.length > 3 && x.toLowerCase() !== own);
  for (const n of names) {
    t = t.replace(new RegExp("\\b(?:(?:apartment|apt|flat|unit|no)\\.?\\s*)?\\d+[a-z]?,?\\s+(?=" + reEscape(n) + "\\b)", "gi"), "");
  }
  return t.replace(/\b(?:apartment|apt|flat)\.?\s+(?:no\.?\s*)?\d+[a-z]?\b,?[ \t]*/gi, "").replace(/[ \t]+$/gm, "");
}
