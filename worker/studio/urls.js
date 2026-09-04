/* Megacity — one URL scheme, two modes.

   demo : the site on billydigitals.com (and localhost), where every page
          lives at /templates/megacity-<slug>. Links in the HTML are written
          relative to that folder ("megacity-properties", "assets/mcr/x.jpg").
   root : the site on its own domain (any host in MEGACITY_HOST), where the
          same files are served at root paths ("/lettings", "/let/<id>") and
          the Worker rewrites every relative link and asset on the way out
          (worker/studio/host.js).

   This file is the single source of truth for slug <-> path. The part between
   the @browser markers is copied into templates/megacity-urls.js by
   scripts/megacity-urls-sync.mjs for the site's own scripts (window.MCUrls).
   Never edit that copy by hand; `node scripts/megacity-urls-sync.mjs --check`
   fails when it is stale. */

/* @browser-start */
const DEMO_HOSTS = /^(www\.)?billydigitals\.com$|^localhost$|^127\.0\.0\.1$/i;
const FALLBACK_HOST = "www.megacityproperties.co.uk";

/* static page slug (the part after "megacity-") -> path on the client domain.
   Old-site paths are reused wherever the page is the same thing, so those
   addresses never change; everything else 301s (LEGACY_REDIRECTS below). */
const ROOT_MAP = {
  "skyline": "/",
  "properties": "/lettings",
  "for-landlords": "/landlords",
  "renting": "/tenants",
  "about-us": "/about-us",
  "contact-us": "/contact-us",
  "valuation": "/valuation",
  "journal": "/journal",
  "tenant-find": "/tenant-find",
  "rent-collection": "/rent-collection",
  "fully-managed": "/fully-managed",
  "switch": "/switch",
  "hmo": "/hmo",
  "maintenance": "/maintenance",
  "compliance": "/compliance",
  "tools": "/tools",
  "privacy": "/privacy-policy",
  "terms": "/terms",
  "tenant-application-form": "/tenant-application-form",
  "studio": "/studio",
};
const PATH_TO_SLUG = {};
for (const k in ROOT_MAP) PATH_TO_SLUG[ROOT_MAP[k]] = k;

/* the hand-built pages, in sitemap order */
const PUBLIC_STATIC_SLUGS = ["skyline", "properties", "for-landlords", "tenant-find", "rent-collection", "fully-managed", "switch", "hmo", "maintenance", "compliance", "renting", "valuation", "tools", "journal", "about-us", "contact-us", "privacy", "terms", "tenant-application-form"];
/* the five hand-built listing pages: the fallback while the database is empty */
const STATIC_LET_SLUGS = ["denmark-road", "ladywell-point", "room-3", "room-5", "room-7"];
/* old-site /property/<id>/ numbers -> our slugs, for the listings we know */
const LEGACY_LISTINGS = { "226": "denmark-road", "225": "ladywell-point", "102": "room-7", "108": "room-3", "110": "room-5" };
/* root paths a Studio page may never take */
const RESERVED_ROOT_SLUGS = ["lettings", "landlords", "tenants", "privacy-policy", "tenant-application-form", "let", "property", "api", "media", "billy360", "templates", "sitemap", "sitemap.xml", "robots", "robots.txt", "images", "css", "js", "free-valuation", "testimonials", "register", "blog", "sales", "buyers", "vendors", "commercial", "index", "home", "404", "favicon.ico", "apple-touch-icon.png"];

function withFrag(p, frag) { return frag ? p + (frag.charAt(0) === "#" ? frag : "#" + frag) : p; }
function pagePath(mode, slug, frag) {
  const s = String(slug || "skyline");
  return withFrag(mode === "root" ? (Object.prototype.hasOwnProperty.call(ROOT_MAP, s) ? ROOT_MAP[s] : "/" + s) : "/templates/megacity-" + s, frag);
}
function listingPath(mode, id) { return (mode === "root" ? "/let/" : "/templates/megacity-let-") + String(id); }
function studioPath(mode, hash) { return (mode === "root" ? "/studio" : "/templates/megacity-studio") + (hash || ""); }
function assetPath(rel) { return "/templates/" + String(rel || "").replace(/^\/+/, ""); }

/* One link as written in the HTML -> the path it should have in the given
   mode. Absolute, external, scheme-bearing and fragment-only links are
   untouched; in demo mode nothing changes because relative links already
   resolve inside /templates/. */
function rewriteHref(v, mode) {
  if (v == null) return v;
  const s = String(v).trim();
  if (!s || /^(#|\/|data:|javascript:|[a-z][a-z0-9+.-]*:)/i.test(s) || mode !== "root") return v;
  let path = s.replace(/^(\.\/)+/, ""), frag = "", query = "";
  const hi = path.indexOf("#"); if (hi >= 0) { frag = path.slice(hi); path = path.slice(0, hi); }
  const qi = path.indexOf("?"); if (qi >= 0) { query = path.slice(qi); path = path.slice(0, qi); }
  path = path.replace(/\.html$/, "");
  let m, out;
  if (path === "megacity-sitemap.xml") out = "/sitemap.xml";
  else if ((m = /^megacity-let-([a-z0-9-]+)$/.exec(path))) out = listingPath("root", m[1]);
  else if (path === "megacity-studio") out = "/studio";
  else if (/^megacity-[a-z0-9-]+\.(css|js|json|map|xml)$/.test(path)) out = "/templates/" + path;
  else if ((m = /^megacity-([a-z0-9-]+)$/.exec(path))) out = pagePath("root", m[1]);
  else out = "/templates/" + path;                     // assets/…, vendor/…: still served from there
  return out + query + frag;
}
function rewriteSrcset(v, mode) {
  if (v == null || mode !== "root") return v;
  return String(v).split(/\s*,\s*/).map((part) => {
    const bits = part.trim().split(/\s+/);
    if (!bits[0]) return part;
    bits[0] = rewriteHref(bits[0], mode);
    return bits.join(" ");
  }).join(", ");
}
function rewriteStyle(v, mode) {
  if (v == null || mode !== "root") return v;
  return String(v).replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (all, q, u) => "url(" + q + rewriteHref(u, mode) + q + ")");
}
/* a normalised root path (no trailing slash) -> what it is */
function resolveRoot(path) {
  if (path === "/") return { kind: "home", slug: "skyline" };
  if (path === "/studio") return { kind: "studio", slug: "studio" };
  let m;
  if ((m = /^\/let\/([a-z0-9-]{1,80})$/.exec(path))) return { kind: "listing", slug: m[1] };
  if (Object.prototype.hasOwnProperty.call(PATH_TO_SLUG, path)) return { kind: "page", slug: PATH_TO_SLUG[path] };
  if ((m = /^\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(path))) return { kind: "cms", slug: m[1] };
  return null;
}
/* the page slug for a pathname in either mode ("valuation"; "let-<id>" for a listing) */
function slugOfPath(pathname, mode) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  if (mode === "root") {
    if (Object.prototype.hasOwnProperty.call(PATH_TO_SLUG, p)) return PATH_TO_SLUG[p];
    const m = /^\/let\/([a-z0-9-]+)$/.exec(p);
    return m ? "let-" + m[1] : p.slice(1);
  }
  const m = /^\/templates\/megacity-([a-z0-9-]+?)(?:\.html)?$/.exec(p);
  return m ? m[1] : "";
}
/* @browser-end */

/* ── server side ──────────────────────────────────────────────────────── */
function megacityHosts(env) {
  return String((env && env.MEGACITY_HOST) || "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
}
function isMegacityHost(env, hostname) {
  return megacityHosts(env).includes(String(hostname || "").toLowerCase());
}
/* the first hostname in MEGACITY_HOST is the one every other host 301s to */
function canonicalHost(env) { return megacityHosts(env)[0] || FALLBACK_HOST; }
function mode(env, hostname) { return isMegacityHost(env, hostname) ? "root" : "demo"; }
/* where canonical/OG/sitemap links point: the client domain in root mode,
   MEGACITY_PUBLIC_BASE (…/templates/) on the demo host */
function publicBase(env, url) {
  if (mode(env, url && url.hostname) === "root") return "https://" + canonicalHost(env) + "/";
  const b = (env && env.MEGACITY_PUBLIC_BASE) || (url.origin + "/templates/");
  return b.replace(/\/?$/, "/");
}
/* kind: page | cms | listing | studio | asset | sitemap | path */
function absUrl(env, url, kind, id, frag) {
  if (kind === "asset" && /^https?:\/\//i.test(String(id || ""))) return String(id);
  const m = mode(env, url && url.hostname);
  const base = publicBase(env, url);
  const origin = new URL(base).origin;
  if (m === "root") {
    switch (kind) {
      case "listing": return origin + listingPath(m, id);
      case "studio": return origin + studioPath(m, id);
      case "asset": return origin + (String(id).charAt(0) === "/" ? String(id) : assetPath(id));
      case "sitemap": return origin + "/sitemap.xml";
      case "path": return origin + String(id || "/");
      default: return origin + pagePath(m, id, frag);
    }
  }
  switch (kind) {
    case "listing": return base + "megacity-let-" + id;
    case "studio": return base + "megacity-studio" + (id || "");
    case "asset": return String(id).charAt(0) === "/" ? origin + String(id) : base + String(id).replace(/^\/+/, "");
    case "sitemap": return base + "megacity-sitemap.xml";
    case "path": return origin + String(id || "/");
    default: return withFrag(base + "megacity-" + String(id || "skyline"), frag);
  }
}

/* Old-site addresses (megacityproperties.co.uk, as it was before the move)
   and demo-shaped addresses -> where they live now. Matched against the
   lowercase path with the trailing slash already removed; a function target
   receives the RegExp match. /property/<id>/ is handled in host.js because it
   needs the database. Everything here is a permanent (301) redirect. */
const LEGACY_REDIRECTS = [
  ["/properties", "/lettings"], ["/buyers", "/lettings"], ["/buyers/register", "/lettings"], ["/commercial/lettings", "/lettings"], ["/commercial", "/lettings"],
  ["/free-valuation", "/valuation"], [/^\/free-valuation\/.*/, "/valuation"],
  ["/sales", "/valuation"], [/^\/sales\/.*/, "/valuation"], ["/vendors", "/valuation"], [/^\/vendors\/.*/, "/valuation"],
  ["/commercial/sales", "/valuation"], ["/register/commercial", "/valuation"],
  ["/blog", "/journal"], [/^\/blog\/.*/, "/journal"],
  ["/testimonials", "/about-us"],
  ["/register", "/tenants#register"], ["/tenants/register", "/tenants#register"], [/^\/tenants\/.+/, "/tenants"],
  ["/landlords/register", "/landlords#register"], [/^\/landlords\/.+/, "/landlords"],
  ["/privacy", "/privacy-policy"], ["/about", "/about-us"], ["/contact", "/contact-us"],
  ["/index", "/"], ["/index.html", "/"], ["/default.asp", "/"], ["/home", "/"],
  [/^\/megacity-let-([a-z0-9-]+)$/, (m) => listingPath("root", m[1])],
  ["/megacity-sitemap.xml", "/sitemap.xml"],
  [/^\/megacity-([a-z0-9-]+)$/, (m) => rewriteHref("megacity-" + m[1], "root")],
];
function legacyRedirect(path) {
  for (const [from, to] of LEGACY_REDIRECTS) {
    if (typeof from === "string") { if (from === path) return to; continue; }
    const m = from.exec(path);
    if (m) return typeof to === "function" ? to(m) : to;
  }
  return null;
}

export {
  DEMO_HOSTS, FALLBACK_HOST, ROOT_MAP, PATH_TO_SLUG, PUBLIC_STATIC_SLUGS, STATIC_LET_SLUGS, LEGACY_LISTINGS, RESERVED_ROOT_SLUGS, LEGACY_REDIRECTS,
  pagePath, listingPath, studioPath, assetPath, rewriteHref, rewriteSrcset, rewriteStyle, resolveRoot, slugOfPath,
  megacityHosts, isMegacityHost, canonicalHost, mode, publicBase, absUrl, legacyRedirect,
};
