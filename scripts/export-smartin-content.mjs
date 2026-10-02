// Read every built SMARTin page and dump its editable blocks to extracted-smartin.json.
// What gets exported is exactly what templates/smartin/content.js replaces (collectForExport).
//
//   python3 scripts/build-smartin.py smartinscience.co.uk
//   python3 -m http.server 8901 --directory dist/smartin-science &
//   node scripts/export-smartin-content.mjs 8901
//   python3 scripts/gen-smartin-editor-payloads.py
import { readdirSync, statSync, writeFileSync } from "fs";
import { join, relative } from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require("/opt/node22/lib/node_modules/playwright"); }
const DIST = new URL("../dist/smartin-science/", import.meta.url).pathname;
const PORT = process.argv[2] || "8901";
const pages = [];
(function walk(d) {
  for (const f of readdirSync(d).sort()) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".html") && f !== "404.html") pages.push(relative(DIST, p));
  }
})(DIST);
const b = await pw.chromium.launch();
const pg = await b.newPage();
// only localhost: nothing from the network can change what is exported
// and no scroll-fx: its text animation splits headings into word spans, which must not reach WordPress
await pg.route("**/*", (r) => {
  const u = r.request().url();
  return u.includes("localhost") && !u.includes("scroll-fx.js") ? r.continue() : r.abort();
});
const out = {};
for (const rel of pages) {
  await pg.goto(`http://localhost:${PORT}/${rel}`);
  await pg.waitForTimeout(400);
  const items = await pg.evaluate(() => (window.__smContent ? window.__smContent.collectForExport() : null));
  if (!items) { console.log("NO BRIDGE:", rel); continue; }
  out[rel] = items;
  console.log(`${rel}: ${items.length} blocks`);
}
await b.close();
writeFileSync("extracted-smartin.json", JSON.stringify(out));
