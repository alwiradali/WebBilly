/* Auto-sitemap: scans every public .html, skips noindex/known-private,
   maps to clean URLs, and rewrites sitemap.xml. Run: node scripts/gen-sitemap.mjs */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
const BASE = "https://www.billydigitals.com";
const today = new Date().toISOString().slice(0, 10);
const PRIVATE = new Set(["404","admin","send-review","thank-you","checklist-thanks",
  "flyer","flyer-live","flyer-print","flyer-promo","fx-showcase","experience",
  "portfolio-demo","salon-luxe","george-frank","izzy-order","izzy-refero"]);
function htmlFiles(dir, prefix="") {
  let out = [];
  for (const f of readdirSync(dir)) {
    const p = dir + "/" + f;
    if (statSync(p).isDirectory()) { if (f==="blog") out = out.concat(htmlFiles(p, "blog/")); continue; }
    if (f.endsWith(".html")) out.push(prefix + f);
  }
  return out;
}
function indexable(rel) {
  const base = rel.replace(/^blog\//,"").replace(/\.html$/,"");
  if (!rel.startsWith("blog/") && PRIVATE.has(base)) return false;
  const html = readFileSync(rel, "utf8");
  if (/name=["']robots["'][^>]*noindex/i.test(html)) return false;
  if (/<meta[^>]*content=["'][^"']*noindex/i.test(html)) return false;
  return true;
}
function loc(rel) {
  if (rel === "index.html") return BASE + "/";
  return BASE + "/" + rel.replace(/\.html$/,"");
}
function priority(rel){ if(rel==="index.html")return"1.0"; if(rel.startsWith("web-design-"))return"0.8";
  if(rel.startsWith("blog/"))return"0.7"; return"0.6"; }
function freq(rel){ return rel==="index.html"?"weekly":"monthly"; }

const files = htmlFiles(".").filter(indexable).sort();
const urls = files.map(f => `  <url>
    <loc>${loc(f)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${freq(f)}</changefreq>
    <priority>${priority(f)}</priority>
  </url>`).join("\n");
writeFileSync("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
console.log(`sitemap.xml rebuilt — ${files.length} indexable pages`);
