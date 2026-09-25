#!/usr/bin/env node
/* No words on the site may sit on a layer that blurs them.

   Walid saw "some words in the whole website look a bit blurry" (2026-09-25).
   Three causes, all found by this check before they were fixed:
     - every .card floated in an endless 3D tilt-and-bob animation, so its text
       was redrawn on its own layer every frame;
     - every .btn carried will-change:transform, which keeps a layer for good,
       and Windows draws text on a layer without its usual sharpening;
     - hover effects (tilt, magnet) left a transform behind — a near-zero 3D
       rotation, or translate(0,0) — so anything once hovered stayed soft.

   Each page is loaded, scrolled top to bottom so every scroll animation has
   run, its hover effects are triggered and released, and then every element
   with text is checked for an ancestor with will-change:transform, any 3D
   transform, a scale, a filter, or a translate that is not a whole pixel.
   The two deliberate exceptions are named below.

     (cd . && python3 -m http.server 8971) &
     NODE_PATH=$(npm root -g) node scripts/megacity-crisp-text-check.js

   Exit code 1 if any text is on a blurring layer. */
const { chromium } = require("playwright");

const BASE = (process.argv[2] || "http://127.0.0.1:8971").replace(/\/$/, "");
const PAGES = ["skyline", "properties", "for-landlords", "tenant-find", "rent-collection", "fully-managed", "switch", "hmo", "maintenance", "compliance", "renting", "valuation", "tools", "journal", "about-us", "contact-us", "privacy", "terms", "tenant-application-form"];
/* Moving on purpose: the ticker scrolls, and the header slides out of view
   while you scroll down (it has no transform once it is back). */
const ALLOWED = [/^\.marq-track /, /^\.nav — .*translate 0\.00,-\d/];

(async () => {
  const b = await chromium.launch();
  const hits = {};
  for (const pg of PAGES) {
    const p = await b.newPage({ viewport: { width: 1366, height: 900 } });
    const res = await p.goto(`${BASE}/templates/megacity-${pg}.html`, { waitUntil: "networkidle" }).catch(() => null);
    if (!res || !res.ok()) { console.error(`cannot load ${pg} from ${BASE} — is the static server running?`); process.exit(2); }
    await p.waitForTimeout(2600);
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 500) { await p.evaluate((yy) => window.scrollTo(0, yy), y); await p.waitForTimeout(110); }
    await p.waitForTimeout(1400);
    for (const sel of ["[data-tilt]", ".magnet", ".card", ".btn"]) {
      const n = await p.locator(sel).count();
      for (let i = 0; i < Math.min(n, 6); i++) {
        const el = p.locator(sel).nth(i);
        if (await el.isVisible().catch(() => false)) { await el.hover({ force: true, timeout: 2000 }).catch(() => {}); await p.mouse.move(2, 2); }
      }
    }
    await p.waitForTimeout(1600);
    const found = await p.evaluate(() => {
      const out = [];
      const hasText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 2);
      for (const el of document.querySelectorAll("body *")) {
        if (!hasText(el)) continue;
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
        for (let a = el; a && a !== document.body; a = a.parentElement) {
          const cs = getComputedStyle(a), t = cs.transform;
          let why = null;
          if (cs.willChange.includes("transform")) why = "will-change:transform";
          else if (t && t !== "none") {
            if (t.startsWith("matrix3d")) why = "3d transform";
            else {
              const v = (t.match(/matrix\(([^)]+)\)/) || [, ""])[1].split(",").map(Number);
              const frac = (x) => Math.abs(x - Math.round(x)) > 0.01;
              if (v.length === 6 && (v[0] !== 1 || v[3] !== 1 || v[1] || v[2])) why = "scaled or rotated";
              else if (v.length === 6 && (frac(v[4]) || frac(v[5]))) why = "half-pixel translate " + v[4].toFixed(2) + "," + v[5].toFixed(2);
            }
          } else if (cs.filter && cs.filter !== "none") why = "filter " + cs.filter;
          if (why) { out.push((typeof a.className === "string" && a.className ? "." + a.className.split(" ")[0] : a.tagName.toLowerCase()) + " — " + why); break; }
        }
      }
      return out;
    });
    for (const f of found) if (!ALLOWED.some((re) => re.test(f))) (hits[f] = hits[f] || new Set()).add(pg);
    await p.close();
  }
  await b.close();
  const rows = Object.entries(hits);
  for (const [k, v] of rows) console.log(`FAIL ${k}   on ${[...v].join(", ")}`);
  console.log(rows.length ? `CRISP TEXT: ${rows.length} cause(s) of blurred words` : `CRISP TEXT: ALL PASS — no words on a blurring layer across ${PAGES.length} pages, after scrolling and hovering`);
  process.exit(rows.length ? 1 : 0);
})();
