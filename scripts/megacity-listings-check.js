#!/usr/bin/env node
/* Checks the nine listing pages Walid asked to keep on the website.
     node scripts/megacity-listings-check.mjs http://localhost:8977

   Two things are being defended here:
     1. every photograph loads and declares alt text, at phone and desktop width;
     2. no page states a fact nobody gave us. Rent, deposit, bedroom and
        bathroom counts, council tax band, EPC rating and the reference are all
        still with the client, so a page that prints one has invented it.
   Also checks each listing is reachable from the grid and from site search. */
module.paths.push("/opt/node22/lib/node_modules");
const { chromium } = require("playwright");

const BASE = (process.argv[2] || "http://localhost:8977").replace(/\/$/, "");
const SLUGS = ["north-street-hyde", "carlton-road-5", "carlton-road-9", "drayton-street",
  "adelphi-apartments", "grove-house", "anvil-place", "rope-works", "whitworth-street"];
const LET = (s) => `${BASE}/templates/megacity-let-${s}`;

let fails = 0;
const ok = (c, what) => { console.log((c ? "ok   " : "FAIL ") + what); if (!c) fails++; };

/* A price, a bedroom count, a band or an EPC letter anywhere in the page text
   is a fact we were not given. Written to catch the shapes, not the words. */
const INVENTED = [
  [/£\s?\d/, "a price"],
  /* digits and words both: "2 bed" and "two bathrooms" are the same claim */
  [/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(bed|bedroom|bath|bathroom|reception|floor|storey)s?\b/i, "a room or storey count"],
  [/\bband\s+[A-H]\b/i, "a council tax band"],
  [/\bEPC\s*(rating)?\s*[:\-]?\s*[A-G]\b/i, "an EPC rating"],
  [/\bref(erence)?\s*[:.]?\s*[A-Z]{2}\d{3,}/i, "a reference number"],
  [/\bavailable\s+now\b/i, "an availability we were not given"],
];

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--use-gl=swiftshader"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ contentType: "text/css", body: "" }));
  await ctx.route(/fonts\.gstatic\.com|google\.com\/maps/, (r) => r.fulfill({ status: 204, body: "" }));
  const page = await ctx.newPage();
  const bad = [];
  page.on("response", (r) => { if (r.status() >= 400) bad.push(r.status() + " " + r.url()); });

  for (const slug of SLUGS) {
    bad.length = 0;
    const res = await page.goto(LET(slug), { waitUntil: "networkidle" });
    ok(res && res.status() === 200, `GET ${slug} -> ${res && res.status()}`);
    ok(bad.length === 0, `${slug}: no failed requests` + (bad.length ? " — " + bad.join(", ") : ""));

    /* every picture, at desktop then phone */
    for (const w of [1440, 390]) {
      await page.setViewportSize({ width: w, height: w === 390 ? 844 : 900 });
      await page.evaluate(() => new Promise((r) => { window.scrollTo(0, 1e6); setTimeout(r, 350); }));
      /* The lightbox keeps a hidden <img> with no src until a thumbnail is
         clicked; that is a placeholder, not a picture that failed to load. */
      const imgs = await page.$$eval("img", (els) => els
        .filter((i) => !(i.hidden && !i.getAttribute("src")))
        .map((i) => ({ src: i.getAttribute("src"), w: i.naturalWidth, alt: i.getAttribute("alt") })));
      const broken = imgs.filter((i) => i.w === 0).map((i) => i.src);
      const noAlt = imgs.filter((i) => i.alt === null).map((i) => i.src);
      ok(broken.length === 0, `${slug} @${w}: every picture loads` + (broken.length ? " — " + broken.join(", ") : ""));
      ok(noAlt.length === 0, `${slug} @${w}: every picture declares alt` + (noAlt.length ? " — " + noAlt.join(", ") : ""));
    }
    await page.setViewportSize({ width: 1440, height: 900 });

    /* nothing invented */
    const text = await page.$eval("main", (m) => m.innerText);
    const found = INVENTED.filter(([re]) => re.test(text)).map(([, what]) => what);
    ok(found.length === 0, `${slug}: states no fact we were not given` + (found.length ? " — claims " + found.join(", ") : ""));

    /* the availability Walid did give */
    ok(/Available from 1 August 2027/.test(text), `${slug}: shows the availability date`);
    ok(/Rent on application/.test(text), `${slug}: asks for the rent rather than inventing one`);

    /* the viewing form is wired to this property */
    const prop = await page.$eval("form[data-viewing]", (f) => f.getAttribute("data-property"));
    ok(!!prop && prop.length > 3, `${slug}: viewing form names the property (${prop})`);
  }

  /* Things Walid found on his phone, so they cannot come back:
     a link out to the old website, a print button labelled as a brochure,
     and the office number that his live site says is 21, not 18. */
  {
    const pages = SLUGS.concat(["denmark-road", "ladywell-point", "room-3", "room-5", "room-7"]);
    let oldSite = 0, mislabelled = 0, wrongOffice = 0;
    for (const slug of pages) {
      await page.goto(LET(slug), { waitUntil: "domcontentloaded" });
      const f = await page.evaluate(() => ({
        old: [...document.querySelectorAll("a[href]")].filter((a) => /megacityproperties\.co\.uk\/property\//.test(a.href)).length,
        brochure: /View brochure/i.test(document.body.innerText),
        office: (document.body.innerText.match(/Office\s+(\d+),\s*The Tube/) || [])[1] || "",
      }));
      if (f.old) oldSite++;
      if (f.brochure) mislabelled++;
      if (f.office && f.office !== "21") wrongOffice++;
    }
    ok(oldSite === 0, `no listing links out to the old website (${oldSite} of ${pages.length} do)`);
    ok(mislabelled === 0, `no button promises a brochure and prints instead (${mislabelled})`);
    ok(wrongOffice === 0, `every page gives the office as 21, as his live site does (${wrongOffice} wrong)`);
  }

  /* reachable from the grid */
  await page.goto(`${BASE}/templates/megacity-properties`, { waitUntil: "networkidle" });
  const hrefs = await page.$$eval(".pl-card", (as) => as.map((a) => a.getAttribute("href")));
  for (const slug of SLUGS) {
    const n = hrefs.filter((h) => h === "megacity-let-" + slug).length;
    ok(n === 1, `grid lists ${slug} once (${n})`);
  }
  const gridBroken = await page.$$eval(".pl-card img", (els) => els.filter((i) => i.naturalWidth === 0).map((i) => i.src));
  ok(gridBroken.length === 0, "grid: every card picture loads" + (gridBroken.length ? " — " + gridBroken.join(", ") : ""));

  /* and from site search */
  await page.click("#navSearch");
  for (const slug of SLUGS) {
    const term = slug.split("-")[0];
    await page.fill("#slInput", term);
    await page.waitForTimeout(120);
    const found = await page.$$eval("#slRes a", (as) => as.map((a) => a.getAttribute("href")));
    ok(found.some((h) => h && h.includes(slug)), `search "${term}" finds ${slug}`);
  }

  await browser.close();
  console.log(fails ? `\nLISTINGS: ${fails} FAILED` : "\nLISTINGS: ALL PASS");
  process.exit(fails ? 1 : 0);
})();
