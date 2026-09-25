/* Megacity Studio — Website: the words, photographs, logo and announcement bar
   on the public pages, changed by the office without a developer.

   The pages themselves stay the files they are. Every editable element carries
   a data-e id (scripts/megacity-content-index.mjs, which also writes the
   templates/megacity-content.json this reads); an edit is stored against its
   id in settings, and worker/studio/host.js swaps it in on the way out. So:
     - "Undo" is deleting the edit — the original is always still there;
     - an edit cannot leak onto another element or another page;
     - nothing here can change a form, a menu, a listing or the code.

   Settings keys: siteText {id: html}, siteImages {id: {key,w,h}},
   announcement {on,text,linkText,href,until}, logo {light,dark}. */

import { json, readJsonBody, HttpError, clampStr, safeHref, audit, uid, getSetting, setSetting } from "./db.js";

/* ── the index of editable elements ─────────────────────────────────────── */

let INDEX = null;               // per isolate: the file only changes with a deploy
export async function loadIndex(env, origin) {
  if (INDEX) return INDEX;
  if (!env || !env.ASSETS) throw new HttpError(503, "The page index is not available here.");
  const res = await env.ASSETS.fetch(new Request((origin || "https://assets.invalid") + "/templates/megacity-content.json"));
  if (!res.ok) throw new HttpError(503, "The page index is missing from this deploy.");
  const data = await res.json();
  const byId = new Map();
  for (const p of data.pages || []) for (const it of p.items || []) byId.set(it.id, { ...it, page: p.slug });
  INDEX = { pages: data.pages || [], byId };
  return INDEX;
}
export function _setIndexForTest(data) {
  const byId = new Map();
  for (const p of data.pages || []) for (const it of p.items || []) byId.set(it.id, { ...it, page: p.slug });
  INDEX = data ? { pages: data.pages || [], byId } : null;
}

/* ── what an edit may contain ───────────────────────────────────────────── */

/* Emphasis, line breaks and links — the things the original words use — and
   nothing else. Everything else is reduced to its text: a pasted Word
   document, a stray <div> from the editor, a <script>. The result is always
   well-formed and every attribute but a link's safe address is dropped. */
const KEEP = new Set(["em", "strong", "b", "i", "br", "a"]);
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", ndash: "–", mdash: "—", hellip: "…", pound: "£", middot: "·", euro: "€", copy: "©", reg: "®", trade: "™", deg: "°" };
function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") { const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ""; }
    return ENT[e.toLowerCase()] ?? m;
  });
}
const escText = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ /g, "&nbsp;");
const escAttr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function sanitize(input, { inline = false, max = 2000 } = {}) {
  let src = String(input == null ? "" : input);
  /* scripts and styles lose their contents, not just their tags */
  src = src.replace(/<(script|style|template|iframe|object|svg|math|noscript)\b[\s\S]*?<\/\1\s*>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  /* the editor's own paragraphs become line breaks */
  src = src.replace(/<\/(div|p|li|h[1-6])\s*>\s*<(div|p|li|h[1-6])\b[^>]*>/gi, "<br>").replace(/<\/?(div|p|li|h[1-6]|ul|ol)\b[^>]*>/gi, "");
  let out = "", open = [];
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|([^<]+)|(<)/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[3] != null || m[4] != null) { out += escText(decode(m[3] != null ? m[3] : "<")); continue; }
    const tag = m[1].toLowerCase(), closing = m[0][1] === "/";
    if (!KEEP.has(tag) || (inline && tag === "br")) { if (inline && tag === "br" && !closing) out += " "; continue; }
    if (tag === "br") { if (!closing) out += "<br>"; continue; }
    if (closing) {
      const i = open.lastIndexOf(tag);
      if (i < 0) continue;
      while (open.length > i) out += "</" + open.pop() + ">";
      continue;
    }
    if (tag === "a") {
      const h = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[2]);
      let href = h ? safeHref(decode(h[1] ?? h[2] ?? h[3])) : null;
      /* "valuation" typed as a link means the page, not a file beside this one */
      if (href && /^[a-z0-9-]+(#[a-z0-9-]*)?$/i.test(href) && !/^megacity-/i.test(href)) href = "/" + href;
      if (!href || open.includes("a")) continue;          // no link without a safe address, no link in a link
      out += '<a href="' + escAttr(href) + '">';
    } else out += "<" + tag + ">";
    open.push(tag);
  }
  while (open.length) out += "</" + open.pop() + ">";
  out = out.replace(/(<br>\s*){3,}/g, "<br><br>").replace(/^(\s|<br>)+|(\s|<br>)+$/g, "").replace(/[ \t]{2,}/g, " ");
  if (plainText(out).length > max) throw new HttpError(400, `That is too long — keep it under ${max} characters.`);
  return out;
}
export function plainText(html) { return decode(String(html || "").replace(/<br>/g, " ").replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim(); }

/* ── the fee rule ───────────────────────────────────────────────────────── */

/* A letting agent's fees have to be shown with VAT, and the 8% this agency
   advertises is for the first tenancy. Every 8% on the site already says both;
   an edit may not quietly drop either. Anything else with a percentage that
   used to mention VAT must still mention it. */
const VAT = /\bVAT\b/i, FIRST = /first\s+tenancy/i, EIGHT = /(^|[^\d.])8\s?%/, PCT = /\d\s?%/;
export function feeProblem(newHtml, originalHtml) {
  const t = plainText(newHtml), o = plainText(originalHtml || "");
  if (EIGHT.test(t) && !(VAT.test(t) && FIRST.test(t))) return 'Where it says 8%, it has to say "inc. VAT" and "first tenancy" too — for example "8% inc. VAT for the first tenancy".';
  if (PCT.test(t) && VAT.test(o) && !VAT.test(t)) return "Fees have to say whether VAT is included, as the original did — for example “10% inc. VAT”.";
  return null;
}

/* ── reading ────────────────────────────────────────────────────────────── */

const imgUrl = (v) => (v && v.key ? "/media/" + v.key : null);

export async function overview(c) {
  const idx = await loadIndex(c.env, c.url.origin);
  const text = await getSetting(c.db, "siteText", {}), images = await getSetting(c.db, "siteImages", {});
  const announcement = await getSetting(c.db, "announcement", null), logo = await getSetting(c.db, "logo", {});
  return json({
    announcement: normaliseAnnouncement(announcement || {}),
    logo: { light: logo && logo.light ? { ...logo.light, url: imgUrl(logo.light) } : null, dark: logo && logo.dark ? { ...logo.dark, url: imgUrl(logo.dark) } : null },
    pages: idx.pages.map((p) => ({
      slug: p.slug, title: p.title, items: p.items.length,
      edited: p.items.filter((it) => (it.kind === "image" || it.kind === "hero" ? images[it.id] : text[it.id] != null)).length,
    })),
  });
}

export async function page(c) {
  const idx = await loadIndex(c.env, c.url.origin);
  const p = idx.pages.find((x) => x.slug === c.params.slug);
  if (!p) throw new HttpError(404, "No such page.");
  const text = await getSetting(c.db, "siteText", {}), images = await getSetting(c.db, "siteImages", {});
  return json({
    slug: p.slug, title: p.title,
    items: p.items.map((it) => it.kind === "image" || it.kind === "hero"
      ? { ...it, current: images[it.id] ? { ...images[it.id], url: imgUrl(images[it.id]) } : null }
      : { ...it, current: text[it.id] != null ? text[it.id] : null }),
  });
}

/* ── writing ────────────────────────────────────────────────────────────── */

/* PUT /site/pages/:slug  {text: {id: html|null}, images: {id: {key,w,h}|null}}
   null puts the original back. Only ids that belong to this page are taken. */
export async function savePage(c) {
  const idx = await loadIndex(c.env, c.url.origin);
  const p = idx.pages.find((x) => x.slug === c.params.slug);
  if (!p) throw new HttpError(404, "No such page.");
  const body = await readJsonBody(c.request);
  const text = { ...(await getSetting(c.db, "siteText", {})) }, images = { ...(await getSetting(c.db, "siteImages", {})) };
  const mine = new Map(p.items.map((it) => [it.id, it]));
  let changed = 0;
  for (const [id, v] of Object.entries(body.text && typeof body.text === "object" ? body.text : {})) {
    const it = mine.get(id);
    if (!it || it.kind === "image" || it.kind === "hero") continue;
    if (v == null) { if (id in text) { delete text[id]; changed++; } continue; }
    const opts = { inline: it.kind === "button", max: it.kind === "heading" ? 240 : it.kind === "button" ? 60 : 2000 };
    const clean = sanitize(v, opts);
    if (!plainText(clean)) throw new HttpError(400, `"${it.text.slice(0, 40)}…" cannot be left empty. Use "Put the original back" to undo a change instead.`);
    const fee = feeProblem(clean, it.html);
    if (fee) throw new HttpError(400, fee);
    /* the same as the original is not an edit */
    let orig = null;
    try { orig = sanitize(it.html, { ...opts, max: 100000 }); } catch { orig = null; }
    if (orig !== null && clean === orig) { if (id in text) { delete text[id]; changed++; } continue; }
    if (text[id] !== clean) { text[id] = clean; changed++; }
  }
  for (const [id, v] of Object.entries(body.images && typeof body.images === "object" ? body.images : {})) {
    const it = mine.get(id);
    if (!it || (it.kind !== "image" && it.kind !== "hero")) continue;
    if (v == null) { if (images[id]) { delete images[id]; changed++; } continue; }
    const key = String(v.key || "");
    if (!SITE_KEY_RE.test(key)) throw new HttpError(400, "That photo was not uploaded here.");
    images[id] = { key, w: Math.max(0, Math.min(10000, Number(v.w) || 0)) || null, h: Math.max(0, Math.min(10000, Number(v.h) || 0)) || null };
    changed++;
  }
  if (changed) {
    await setSetting(c.db, "siteText", text, c.user.id);
    await setSetting(c.db, "siteImages", images, c.user.id);
    await audit(c.db, { userId: c.user.id, action: "website.page", entity: "page", entityId: p.slug, detail: { changed } });
  }
  return page(c);
}

/* "valuation" means the page, from wherever the bar is showing — a relative
   link would point at /let/valuation on a property page */
export function pageLink(href) {
  const h = href ? safeHref(href) : null;
  if (!h) return "";
  return /^[a-z0-9-]+(#[a-z0-9-]*)?$/i.test(h) && !/^megacity-/i.test(h) ? "/" + h : h;
}
function normaliseAnnouncement(a) {
  return {
    on: !!a.on, text: clampStr(a.text, 180) || "", linkText: clampStr(a.linkText, 40) || "",
    href: pageLink(a.href), until: /^\d{4}-\d{2}-\d{2}$/.test(String(a.until || "")) ? a.until : "",
  };
}

/* PUT /site/announcement {on, text, linkText, href, until} */
export async function saveAnnouncement(c) {
  const b = await readJsonBody(c.request);
  const a = normaliseAnnouncement(b || {});
  if (b.href && !a.href) throw new HttpError(400, "The link has to be a page on the site (like /valuation) or a full https:// address.");
  if (a.on && !a.text) throw new HttpError(400, "Write the announcement before switching it on.");
  if (a.linkText && !a.href) throw new HttpError(400, "Add where the link goes, or leave the link words empty.");
  const t = sanitize(a.text, { inline: true, max: 180 });
  a.text = plainText(t);
  const fee = feeProblem(a.text, /%/.test(a.text) ? "VAT" : "");
  if (fee) throw new HttpError(400, fee);
  /* a new wording is a new announcement: people who closed the old one see it */
  a.version = (await sha8(a.text + "|" + a.linkText + "|" + a.href));
  await setSetting(c.db, "announcement", a, c.user.id);
  await audit(c.db, { userId: c.user.id, action: "website.announcement", entity: "settings", entityId: "announcement", detail: { on: a.on } });
  return json({ announcement: a });
}

/* PUT /site/logo {light: {key,w,h}|null, dark: {key,w,h}|null} */
export async function saveLogo(c) {
  const b = await readJsonBody(c.request);
  const out = {};
  for (const k of ["light", "dark"]) {
    const v = b[k];
    if (v == null) { out[k] = null; continue; }
    if (!SITE_KEY_RE.test(String(v.key || ""))) throw new HttpError(400, "That logo was not uploaded here.");
    out[k] = { key: v.key, w: Number(v.w) || null, h: Number(v.h) || null };
  }
  await setSetting(c.db, "logo", out, c.user.id);
  await audit(c.db, { userId: c.user.id, action: "website.logo", entity: "settings", entityId: "logo", detail: { light: !!out.light, dark: !!out.dark } });
  return overview(c);
}

/* POST /site/upload?w=&h=   raw body: a JPEG, PNG or WebP the browser has
   already sized. Stored under s/ — never tied to a listing, never deleted
   with one. The bytes are checked, not the name or the header. */
export const SITE_KEY_RE = /^s\/m_[a-z0-9]{10}\/image\.(jpg|png|webp)$/;
const MAX = 12 * 1024 * 1024;
export async function upload(c) {
  if (!c.env.MEDIA) throw new HttpError(503, "The photo store is not connected.");
  const len = Number(c.request.headers.get("content-length") || 0);
  if (len > MAX) throw new HttpError(413, "That picture is too large — under 12 MB, please.");
  const buf = await c.request.arrayBuffer();
  if (!buf.byteLength) throw new HttpError(400, "No picture received.");
  if (buf.byteLength > MAX) throw new HttpError(413, "That picture is too large — under 12 MB, please.");
  const b = new Uint8Array(buf.slice(0, 12));
  const ext = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? "jpg"
    : b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 ? "png"
    : b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 ? "webp" : null;
  if (!ext) throw new HttpError(415, "That is not a JPEG, PNG or WebP picture.");
  const key = `s/${uid("m")}/image.${ext}`;
  await c.env.MEDIA.put(key, buf, { httpMetadata: { contentType: ext === "jpg" ? "image/jpeg" : "image/" + ext } });
  const w = Math.max(0, Math.min(10000, Number(c.url.searchParams.get("w")) || 0)) || null;
  const h = Math.max(0, Math.min(10000, Number(c.url.searchParams.get("h")) || 0)) || null;
  await audit(c.db, { userId: c.user.id, action: "website.upload", entity: "media", entityId: key, detail: { bytes: buf.byteLength } });
  return json({ key, url: "/media/" + key, w, h }, 201);
}

async function sha8(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 4).map((x) => x.toString(16).padStart(2, "0")).join("");
}

/* ── on the way out (host.js) ───────────────────────────────────────────── */

/* Is the announcement showing today? `until` is the last day, inclusive, in
   UK time — a promotion "until the 30th" is still up on the evening of the 30th. */
export function announcementLive(a, now = new Date()) {
  if (!a || !a.on || !a.text) return false;
  if (!a.until) return true;
  const uk = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return uk <= a.until;
}

export function announcementHtml(a) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const link = a.href && a.linkText ? ` <a class="annc-link" href="${esc(a.href)}">${esc(a.linkText)} <span aria-hidden="true">→</span></a>` : "";
  /* the script runs before the header is drawn, so a bar someone has closed
     never flashes up, and the page is pushed down by the bar's real height */
  return `<div class="annc" id="annc" role="region" aria-label="Announcement" data-v="${esc(a.version || "")}"><p class="annc-in"><span class="annc-text">${esc(a.text)}</span>${link}</p><button type="button" class="annc-x" aria-label="Close the announcement">×</button></div>` +
    `<script>(function(){var b=document.getElementById("annc"),d=document.documentElement,k="mc-annc";if(!b)return;try{if(localStorage.getItem(k)===b.getAttribute("data-v")){b.remove();return}}catch(e){}d.classList.add("has-annc");function s(){d.style.setProperty("--annc-h",b.offsetHeight+"px")}s();addEventListener("resize",s);b.querySelector(".annc-x").addEventListener("click",function(){try{localStorage.setItem(k,b.getAttribute("data-v"))}catch(e){}b.remove();d.classList.remove("has-annc");d.style.removeProperty("--annc-h")})})();</script>`;
}
