#!/usr/bin/env node
/* How long does a change in 10ninety take to reach the feed?
 *
 * The whole "on the website within seconds" promise rests on this, and the
 * only honest answer is a measurement. 10ninety's FAQ says the feed updates
 * "whenever the agent runs the Portal Export... and by the system
 * automatically overnight", which if true means an unexported change appears
 * tomorrow, not in seconds — and nothing we build on our side moves it.
 *
 * So: watch the feed, have Walid change one thing, and time it.
 *
 *   $env:TENNINETY_KEY = "the key"
 *   node scripts/megacity-tenninety-latency.mjs
 *
 * Then ask Walid to change something small and visible — a word in a
 * description — and watch. Run it a second time having asked him to press
 * Portal Export, and the difference between the two answers is what the
 * promise to him should actually say.
 *
 *   --interval=20   seconds between checks (default 20)
 *   --minutes=15    how long to watch for (default 15)
 */

const KEY = process.env.TENNINETY_KEY || process.env.TENNINETY_API_KEY;
const arg = (n, d) => {
  const m = process.argv.find((a) => a.startsWith(`--${n}=`));
  return m ? Number(m.split("=")[1]) : d;
};
const INTERVAL = Math.max(5, arg("interval", 20)) * 1000;
const MINUTES = Math.max(1, arg("minutes", 15));

if (!KEY) {
  console.error("Set TENNINETY_KEY first. In PowerShell:\n  $env:TENNINETY_KEY = \"...\"");
  process.exit(2);
}

const URL_ = "https://webapi.10ninety.co.uk/properties";

async function snapshot() {
  const res = await fetch(URL_, { headers: { "10ninety-webapi-key": KEY, Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 120)}`);
  const data = await res.json();
  const props = (data && data.properties) || [];
  /* update_date is 10ninety's own idea of when the record last changed, and
     the body is hashed as well because a field can change without it. */
  const rows = props.map((p) => ({
    ref: p.property_ref,
    updated: p.update_date,
    fingerprint: JSON.stringify(p).length + ":" + simpleHash(JSON.stringify(p)),
  }));
  return { count: props.length, rows, latest: rows.map((r) => r.updated).sort().pop() || null };
}

function simpleHash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}

const hhmm = () => new Date().toTimeString().slice(0, 8);

const first = await snapshot();
console.log(`${hhmm()}  watching ${first.count} properties.`);
console.log(`${hhmm()}  newest update_date in the feed: ${first.latest}`);
console.log();
console.log("Now ask Walid to change one word in a property description in 10ninety.");
console.log("Leave this running. It reports the moment the feed shows it.\n");

const started = Date.now();
let prev = first;
let reported = false;

while (Date.now() - started < MINUTES * 60_000) {
  await new Promise((r) => setTimeout(r, INTERVAL));
  let now;
  try { now = await snapshot(); }
  catch (e) { console.log(`${hhmm()}  (feed error: ${e.message})`); continue; }

  const changed = [];
  const was = new Map(prev.rows.map((r) => [r.ref, r]));
  for (const r of now.rows) {
    const b = was.get(r.ref);
    if (!b) { changed.push(`${r.ref} appeared`); continue; }
    if (b.fingerprint !== r.fingerprint) changed.push(`${r.ref} changed` + (b.updated !== r.updated ? ` (update_date ${b.updated} -> ${r.updated})` : " (same update_date)"));
  }
  for (const r of prev.rows) if (!now.rows.some((x) => x.ref === r.ref)) changed.push(`${r.ref} disappeared`);

  const secs = Math.round((Date.now() - started) / 1000);
  if (changed.length) {
    console.log(`${hhmm()}  CHANGED after ${secs}s — ${changed.join("; ")}`);
    reported = true;
    prev = now;
  } else {
    process.stdout.write(`${hhmm()}  no change yet (${secs}s)\r`);
  }
}

console.log();
console.log(reported
  ? "\nSo the feed does move without waiting for the overnight run."
  : `\nNothing changed in ${MINUTES} minutes.\n` +
    "If Walid definitely edited something, that is the Portal Export step:\n" +
    "the feed is not live, and 'within seconds' needs him to press Export.\n" +
    "Run this again and ask him to press it — if it then appears, that is the answer.");
