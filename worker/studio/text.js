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
