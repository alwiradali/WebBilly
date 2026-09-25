#!/usr/bin/env node
/* What is actually in the 10ninety feed right now — and what the website
 * would do with it.
 *
 * When the Studio says "No listings yet" this answers, in one run, which of
 * the four things is wrong:
 *
 *   1. the key            — the feed refuses to answer
 *   2. what is on the market — the feed answers with nothing in it
 *   3. the mapper         — properties arrive but are skipped
 *   4. the website        — the feed is fine, so nothing has run the sync
 *
 * It only READS. It touches no database, writes nothing, and never prints the
 * key. Run it on your own machine, where the key already is:
 *
 *   PowerShell:  $env:TENNINETY_KEY = "the key"
 *                node scripts/megacity-feed-peek.mjs
 *
 *   bash:        TENNINETY_KEY="the key" node scripts/megacity-feed-peek.mjs
 */
import { toListings, fetchProperties, fetchPropertyTypes } from "../worker/studio/tenninety.js";

const KEY = (process.env.TENNINETY_KEY || process.env.TENNINETY_API_KEY || "").replace(/\s/g, "");
if (!KEY) {
  console.error("Set the key first. In PowerShell:\n  $env:TENNINETY_KEY = \"...\"\n  node scripts/megacity-feed-peek.mjs");
  process.exit(2);
}
/* The key arrives by email and email wraps long lines. A line break inside it
   is the single most common reason this fails, and it is invisible on paste. */
console.log(`Using a ${KEY.length}-character key ending "${KEY.slice(-4)}".`);
if (KEY.length !== 32) console.log(`  note: Walid's Web API key is 32 characters. ${KEY.length} suggests something came along with it.`);
console.log();

const env = { TENNINETY_API_KEY: KEY };

let props;
try {
  props = await fetchProperties(env);
} catch (e) {
  const msg = String((e && e.message) || e);
  console.error("The feed would not answer:\n  " + msg + "\n");
  /* Azure API Management's two messages differ by one word, and that word is
     the whole diagnosis. */
  if (/missing subscription key/i.test(msg)) console.error("  -> the header name is wrong (this is a bug on our side, tell me).");
  else if (/invalid subscription key/i.test(msg)) console.error("  -> the header is right and the KEY is wrong. Check for a line break or a stray space.");
  else if (/\b404\b|Resource not found/i.test(msg)) console.error("  -> that path does not exist on their API (a bug on our side, tell me).");
  else if (/\b403\b/.test(msg)) console.error("  -> the key is known but not allowed. That is one for 10ninety support.");
  process.exit(1);
}

console.log(`The feed answered with ${props.length} ${props.length === 1 ? "property" : "properties"}.`);
if (!props.length) {
  console.log("\nNothing is in it. That is not a fault — the feed carries what is ON THE MARKET.");
  console.log("In 10ninety, a property shows 'On The Market | Change' on the right of its row.");
  console.log("Anything reading 'Off The Market' is deliberately not advertised and will not appear.");
  console.log("If properties ARE on the market, ask Walid to run Portal Export — the feed is\nrebuilt on export and again overnight, not the moment he saves.");
  process.exit(0);
}

const types = await fetchPropertyTypes(env).catch(() => null);
const { listings, skipped } = toListings(props, { propertyTypes: types });

console.log();
for (const p of props) {
  const row = listings.find((l) => l.ref === p.property_ref);
  const bits = [
    (p.property_ref || "?").padEnd(10),
    row ? ("/let/" + row.id).padEnd(34) : "(skipped)".padEnd(34),
    row && row.rentPcm != null ? ("£" + row.rentPcm + " pcm").padStart(11) : "".padStart(11),
    row ? String(row.area || "—").padEnd(11) : "".padEnd(11),
    row ? (row.availableFrom ? "from " + row.availableFrom : row.availability || "") : "",
  ];
  console.log("  " + bits.join(" "));
}

const photos = listings.reduce((n, l) => n + l.images.length, 0);
console.log(`\n${listings.length} would be published, with ${photos} photographs between them.`);

if (skipped.length) {
  console.log(`\n${skipped.length} would NOT be, and this is why:`);
  for (const s of skipped) console.log(`  ${s.ref || "?"}  ${s.why}`);
  console.log("\nIf any of those should be on the website, send me this output — that is a\nmapping question, not something to change in 10ninety.");
}

console.log("\nSo the feed is readable and the mapper is happy with it.");
console.log("If the Studio still shows no listings, nothing has run the sync yet:");
console.log("  deploy, then Listings -> Refresh from 10ninety.");
