#!/usr/bin/env node
/* The words and photographs Walid can change from the Studio (Website).

   Every heading, paragraph, button, list item and photograph inside <main> on
   the public pages carries a data-e="<page>-<n>" id. The Studio edits by id;
   the Worker swaps the content in by id on the way out (worker/studio/host.js),
   so an edit follows its element even if the template around it is rewritten.
   Ids are never reused or renumbered: a new element gets the next free number.

   What is deliberately NOT editable here, and why:
     - anything outside <main> (header, menus, footer): the same on every page,
       so a per-page edit would make the pages disagree; the logo is its own
       setting;
     - forms: a label or option changed by hand can stop a form working;
     - anything the Worker fills itself ([data-slot]: listings, tours);
     - anything with a picture, icon or block inside it (a card is edited as its
       heading and its text, not as a whole).

     node scripts/megacity-content-index.mjs          add missing ids, rewrite the index
     node scripts/megacity-content-index.mjs --check  exit 1 if anything is missing or stale

   Output: templates/megacity-content.json — what the Studio shows, per page. */

import { readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const CHECK = process.argv.includes("--check");

/* The public pages, in the order the Studio lists them, with the name people
   know them by. Same set as PUBLIC_STATIC_SLUGS in worker/studio/urls.js
   (asserted in scripts/megacity-website-check.mjs). */
export const PAGES = [
  ["skyline", "home", "Home"],
  ["for-landlords", "landlords", "Landlords"],
  ["renting", "tenants", "Tenants"],
  ["properties", "properties", "Properties"],
  ["tenant-find", "tenant-find", "Tenant Find"],
  ["rent-collection", "rent-collection", "Rent Collection"],
  ["fully-managed", "fully-managed", "Full Management"],
  ["hmo", "hmo", "HMO Management"],
  ["switch", "switch", "Switching Agent"],
  ["compliance", "compliance", "Compliance"],
  ["valuation", "valuation", "Valuation"],
  ["maintenance", "maintenance", "Maintenance"],
  ["tools", "tools", "Landlord Tools"],
  ["journal", "journal", "Journal"],
  ["about-us", "about", "About"],
  ["contact-us", "contact", "Contact"],
  ["area-manchester", "area-manchester", "Area: Manchester"],
  ["area-salford", "area-salford", "Area: Salford"],
  ["area-swinton", "area-swinton", "Area: Swinton"],
  ["area-old-trafford", "area-old-trafford", "Area: Old Trafford"],
  ["area-city-centre", "area-city-centre", "Area: Manchester City Centre"],
  ["tenant-application-form", "apply", "Tenancy Application"],
  ["privacy", "privacy", "Privacy"],
  ["terms", "terms", "Terms"],
];

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const RAW = new Set(["script", "style", "textarea", "title"]);
/* inside these, nothing is offered for editing */
const FENCE = new Set(["form", "nav", "header", "footer", "script", "style", "svg", "template", "noscript", "select", "dialog", "iframe", "video", "audio", "canvas", "picture"]);
const TEXT_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "p", "li", "figcaption", "blockquote", "dt", "dd", "summary", "td", "th"]);
/* what may sit inside an editable element; anything else makes it not editable */
const INLINE_OK = new Set(["em", "strong", "b", "i", "br", "a", "span", "small", "sup", "sub", "abbr", "time", "u", "mark", "q", "cite", "wbr"]);

function attrsOf(tag) {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    if (m.index === 0) continue;                       // the tag name itself
    out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return out;
}
const hasClass = (a, c) => (" " + (a.class || "") + " ").includes(" " + c + " ");
const stripTags = (h) => h.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/\s+/g, " ").trim();
const tidy = (h) => h.replace(/\s+/g, " ").trim();

/* A small tokenizer is enough: these are our own hand-written templates. It
   refuses a page whose tags do not balance rather than guessing. */
export function scan(html, file) {
  const stack = [];
  const found = [];                                    // candidates, in document order
  const sections = [];
  const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tok = m[0];
    if (tok.startsWith("<!")) continue;
    const name = m[1].toLowerCase();
    if (tok.startsWith("</")) {
      /* close the nearest open element of that name */
      let i = stack.length - 1;
      while (i >= 0 && stack[i].name !== name) i--;
      if (i < 0) throw new Error(`${file}: </${name}> at ${m.index} closes nothing`);
      if (i !== stack.length - 1) {
        const open = stack.slice(i + 1).map((e) => e.name).filter((n) => n !== "p" && n !== "li");
        if (open.length) throw new Error(`${file}: </${name}> at ${m.index} while <${open.join(">, <")}> still open`);
      }
      for (let j = stack.length - 1; j >= i; j--) close(stack[j], j === i ? m.index : m.index);
      stack.length = i;
      continue;
    }
    const a = attrsOf(tok);
    const parent = stack[stack.length - 1];
    const el = {
      name, a, start: m.index, tagEnd: m.index + tok.length, nameEnd: m.index + 1 + name.length,
      inMain: (parent && parent.inMain) || name === "main",
      fenced: (parent && parent.fenced) || FENCE.has(name) || "data-slot" in a || "hidden" in a || a["aria-hidden"] === "true" || hasClass(a, "vis-hidden"),
      section: name === "section" ? { start: m.index } : parent ? parent.section : null,
      badChild: false,
    };
    if (name === "section") sections.push(el.section);
    if (parent && !INLINE_OK.has(name)) parent.badChild = true;
    if (name === "img" && el.inMain && !el.fenced) {
      const src = a.src || "";
      if (/^assets\//.test(src) && !/logo/i.test(src)) found.push({ kind: "image", el, src, alt: a.alt || "" });
    }
    if (el.inMain && !el.fenced && /--ph-img\s*:\s*url\(/.test(a.style || "")) {
      const src = (/--ph-img\s*:\s*url\(\s*['"]?([^'")]+)/.exec(a.style) || [])[1];
      found.push({ kind: "hero", el, src });
    }
    if (VOID.has(name) || tok.endsWith("/>")) { if (parent && !INLINE_OK.has(name)) parent.badChild = true; continue; }
    if (RAW.has(name)) {
      const endRe = new RegExp("</" + name + "\\s*>", "ig");
      endRe.lastIndex = re.lastIndex;
      const e = endRe.exec(html);
      if (!e) throw new Error(`${file}: <${name}> never closed`);
      re.lastIndex = e.index + e[0].length;
      if (parent) parent.badChild = true;
      continue;
    }
    stack.push(el);
  }
  if (stack.some((e) => !["html", "body", "head"].includes(e.name))) throw new Error(`${file}: unclosed <${stack.filter((e) => !["html", "body", "head"].includes(e.name)).map((e) => e.name).join(">, <")}>`);

  function close(el, closeStart) {
    el.end = closeStart;
    if (el.section && el.name === "section") el.section.end = closeStart;
    if (!el.inMain || el.fenced || el.badChild) {
      const parent = stack[stack.indexOf(el) - 1];
      if (parent && el.badChild) parent.badChild = true;
      return;
    }
    const isBtn = (el.name === "a" || el.name === "button") && (hasClass(el.a, "btn") || /\bbtn[-_]/.test(el.a.class || ""));
    if (!TEXT_TAGS.has(el.name) && !isBtn) return;
    const inner = html.slice(el.tagEnd, closeStart);
    const text = stripTags(inner);
    if (!text || text.length < 2) return;
    found.push({ kind: /^h[1-5]$/.test(el.name) ? "heading" : isBtn ? "button" : el.name === "li" ? "item" : "text", el, html: tidy(inner), text });
  }

  /* an editable element inside another editable element is edited as part of it */
  found.sort((x, y) => x.el.start - y.el.start);
  const out = [];
  for (const f of found) {
    const inside = out.find((o) => o.kind !== "image" && o.kind !== "hero" && f.el.start > o.el.start && f.el.start < o.el.end);
    if (!inside) out.push(f);
  }
  return { items: out, sections };
}

export function build({ write, root = ROOT } = {}) {
  const index = { version: 1, pages: [] };
  const problems = [];
  for (const [slug, key, title] of PAGES) {
    const file = new URL(`templates/megacity-${slug}.html`, root);
    /* A Windows checkout has CRLF line endings (Git's core.autocrlf), and the
       deploy runs on Windows. The index is built from LF text either way, so
       it comes out identical on every machine, and a page is written back
       with the line endings it had. */
    const raw = readFileSync(file, "utf8");
    const crlf = raw.includes("\r\n");
    let html = crlf ? raw.replace(/\r\n/g, "\n") : raw;
    const { items, sections } = scan(html, `megacity-${slug}.html`);
    /* ids already given are kept; new ones continue the page's numbering */
    const used = new Set(), taken = [];
    for (const it of items) {
      const id = it.el.a["data-e"];
      if (id) { if (used.has(id)) problems.push(`${slug}: data-e="${id}" is used twice`); used.add(id); it.id = id; taken.push(Number(id.split("-").pop()) || 0); }
    }
    let next = Math.max(0, ...taken) + 1;
    const inserts = [];
    for (const it of items) {
      if (it.id) continue;
      it.id = `${key}-${next++}`;
      inserts.push([it.el.nameEnd, ` data-e="${it.id}"`]);
    }
    if (inserts.length) {
      if (!write) problems.push(`${slug}: ${inserts.length} editable element(s) have no data-e id — run node scripts/megacity-content-index.mjs`);
      else {
        for (const [at, s] of inserts.sort((x, y) => y[0] - x[0])) html = html.slice(0, at) + s + html.slice(at);
        writeFileSync(file, crlf ? html.replace(/\n/g, "\r\n") : html);
      }
    }
    /* a label for each group: the first heading in its section */
    const label = (it) => {
      const sec = sections.filter((s) => s.start <= it.el.start && (s.end == null || it.el.start < s.end)).pop();
      if (!sec) return "Page";
      const h = items.find((x) => x.kind === "heading" && x.el.start >= sec.start && x.el.start < (sec.end ?? Infinity));
      return h ? h.text.slice(0, 80) : "Page";
    };
    index.pages.push({
      slug, key, title,
      items: items.map((it) => ({
        id: it.id, kind: it.kind, tag: it.el.name, section: label(it),
        ...(it.kind === "image" || it.kind === "hero" ? { src: it.src, alt: it.alt || "" } : { html: it.html, text: it.text }),
      })),
    });
  }
  const json = JSON.stringify(index, null, 1) + "\n";
  const indexFile = new URL("templates/megacity-content.json", root);
  let old = "";
  try { old = readFileSync(indexFile, "utf8").replace(/\r\n/g, "\n"); } catch {}
  if (old !== json) {
    if (write) writeFileSync(indexFile, json);
    else problems.push("templates/megacity-content.json is out of date — run node scripts/megacity-content-index.mjs");
  }
  return { index, problems };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { index, problems } = build({ write: !CHECK });
  const n = index.pages.reduce((s, p) => s + p.items.length, 0);
  for (const p of problems) console.log("FAIL " + p);
  if (!CHECK) for (const p of index.pages) console.log(`${p.title.padEnd(22)} ${String(p.items.length).padStart(4)} editable  (${Object.entries(p.items.reduce((m, i) => (m[i.kind] = (m[i.kind] || 0) + 1, m), {})).map(([k, v]) => v + " " + k).join(", ")})`);
  console.log(problems.length ? `CONTENT INDEX: ${problems.length} problem(s)` : `CONTENT INDEX: ${n} editable elements on ${index.pages.length} pages, all with ids, index current`);
  process.exit(problems.length ? 1 : 0);
}
