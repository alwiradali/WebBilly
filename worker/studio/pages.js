/* Megacity Studio — SEO pages: area guides, landing pages, guides.
   Stored as blocks, rendered by the Worker at /templates/megacity-<slug>
   through templates/megacity-page-template.html (slots marked data-slot). */

import { uid, nowIso, HttpError, json, readJsonBody, clampStr, slugify, parseJson, audit } from "./db.js";
import { esc } from "./email.js";
import { mediaUrl } from "./media.js";

const KINDS = ["area", "landing", "guide"];
const KIND_LABEL = { area: "Area guide", landing: "Megacity Properties", guide: "Guide" };
const RESERVED = new Set(["skyline", "properties", "for-landlords", "tenant-find", "rent-collection", "fully-managed", "switch", "hmo", "maintenance", "compliance", "renting", "valuation", "tools", "journal", "about-us", "contact-us", "privacy", "terms", "studio", "sitemap", "consent", "intake", "seed", "let-template", "page-template", "data", "admin", "portal", "tours", "property", "hero-lab", "about", "contact", "landlords", "tenants"]);

function badSlug(s) {
  return !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) || s.length < 3 || s.length > 80 || RESERVED.has(s) || /^(let|studio)(-|$)/.test(s);
}

function normaliseBlocks(v) {
  const list = Array.isArray(v) ? v : [];
  return list.slice(0, 40).map((b) => {
    const type = ["h2", "p", "list", "cta", "image"].includes(b && b.type) ? b.type : "p";
    const out = { type };
    if (type === "list") out.items = (Array.isArray(b.items) ? b.items : []).map((i) => clampStr(i, 300)).filter(Boolean).slice(0, 12);
    else if (type === "image") { out.mediaId = clampStr(b.mediaId, 40); out.caption = clampStr(b.caption, 200); }
    else if (type === "cta") { out.text = clampStr(b.text, 120) || "Talk to the office"; out.href = clampStr(b.href, 300) || "megacity-contact-us"; }
    else out.text = clampStr(b.text, type === "h2" ? 160 : 4000);
    return out;
  }).filter((b) => b.type === "list" ? b.items.length : b.type === "image" ? b.mediaId : b.text);
}
function normaliseFaq(v) {
  return (Array.isArray(v) ? v : []).slice(0, 12).map((f) => ({ q: clampStr(f && f.q, 200), a: clampStr(f && f.a, 2000) })).filter((f) => f.q && f.a);
}

function toJson(r) {
  return {
    id: r.id, slug: r.slug, kind: r.kind, title: r.title, seoTitle: r.seo_title, seoDescription: r.seo_description, heroMediaId: r.hero_media_id,
    blocks: parseJson(r.body_json, []), faq: parseJson(r.faq_json, []), status: r.status, publishedAt: r.published_at, updatedAt: r.updated_at, updatedBy: r.updated_by,
    url: "/templates/megacity-" + r.slug,
  };
}

async function mustGet(db, id) {
  const r = await db.prepare(`SELECT * FROM pages WHERE id=?1`).bind(id).first();
  if (!r) throw new HttpError(404, "No such page.");
  return r;
}

export async function list(c) {
  const rows = (await c.db.prepare(`SELECT id, slug, kind, title, status, published_at, updated_at FROM pages ORDER BY updated_at DESC`).all()).results || [];
  return json({ items: rows.map((r) => ({ id: r.id, slug: r.slug, kind: r.kind, title: r.title, status: r.status, publishedAt: r.published_at, updatedAt: r.updated_at, url: "/templates/megacity-" + r.slug })) });
}

export async function create(c) {
  const body = await readJsonBody(c.request);
  const title = clampStr(body.title, 160);
  if (!title) throw new HttpError(400, "Give the page a title.");
  const kind = KINDS.includes(body.kind) ? body.kind : "area";
  let slug = slugify(body.slug || title);
  if (badSlug(slug)) throw new HttpError(400, `"${slug}" cannot be used as the address. Choose another.`);
  if (await c.db.prepare(`SELECT id FROM pages WHERE slug=?1`).bind(slug).first()) throw new HttpError(409, "A page with that address already exists.");
  const id = uid("p"), now = nowIso();
  await c.db.prepare(
    `INSERT INTO pages (id, slug, kind, title, seo_title, seo_description, hero_media_id, body_json, faq_json, status, updated_at, updated_by)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'draft', ?10, ?11)`
  ).bind(id, slug, kind, title, clampStr(body.seoTitle, 120), clampStr(body.seoDescription, 320), clampStr(body.heroMediaId, 40),
    JSON.stringify(normaliseBlocks(body.blocks)), JSON.stringify(normaliseFaq(body.faq)), now, c.user.id).run();
  await audit(c.db, { userId: c.user.id, action: "page.created", entity: "page", entityId: id, detail: { slug } });
  return json(toJson(await mustGet(c.db, id)), 201);
}

export async function get(c) {
  return json(toJson(await mustGet(c.db, c.params.id)));
}

export async function patch(c) {
  const r = await mustGet(c.db, c.params.id);
  const body = await readJsonBody(c.request);
  const sets = {};
  if ("title" in body) { sets.title = clampStr(body.title, 160); if (!sets.title) throw new HttpError(400, "A title is required."); }
  if ("kind" in body && KINDS.includes(body.kind)) sets.kind = body.kind;
  if ("slug" in body) {
    const slug = slugify(body.slug);
    if (badSlug(slug)) throw new HttpError(400, `"${slug}" cannot be used as the address.`);
    const other = await c.db.prepare(`SELECT id FROM pages WHERE slug=?1 AND id<>?2`).bind(slug, r.id).first();
    if (other) throw new HttpError(409, "A page with that address already exists.");
    sets.slug = slug;
  }
  if ("seoTitle" in body) sets.seo_title = clampStr(body.seoTitle, 120);
  if ("seoDescription" in body) sets.seo_description = clampStr(body.seoDescription, 320);
  if ("heroMediaId" in body) sets.hero_media_id = clampStr(body.heroMediaId, 40);
  if ("blocks" in body) sets.body_json = JSON.stringify(normaliseBlocks(body.blocks));
  if ("faq" in body) sets.faq_json = JSON.stringify(normaliseFaq(body.faq));
  sets.updated_at = nowIso(); sets.updated_by = c.user.id;
  const keys = Object.keys(sets);
  await c.db.prepare(`UPDATE pages SET ${keys.map((k, i) => `${k}=?${i + 1}`).join(", ")} WHERE id=?${keys.length + 1}`).bind(...keys.map((k) => sets[k]), r.id).run();
  await audit(c.db, { userId: c.user.id, action: "page.updated", entity: "page", entityId: r.id, detail: { fields: keys } });
  return json(toJson(await mustGet(c.db, r.id)));
}

export async function remove(c) {
  const r = await mustGet(c.db, c.params.id);
  await c.db.prepare(`DELETE FROM pages WHERE id=?1`).bind(r.id).run();
  await audit(c.db, { userId: c.user.id, action: "page.deleted", entity: "page", entityId: r.id, detail: { slug: r.slug } });
  return json({ ok: true });
}

export async function publish(c) {
  const r = await mustGet(c.db, c.params.id);
  const blocks = parseJson(r.body_json, []);
  const problems = [];
  if (!blocks.length) problems.push("Add some content first.");
  if (!blocks.some((b) => b.type === "p")) problems.push("Add at least one paragraph.");
  if (!(r.seo_description || "").trim()) problems.push("Write the search description (what Google shows under the title).");
  if (problems.length) return json({ ok: false, problems });
  const now = nowIso();
  await c.db.prepare(`UPDATE pages SET status='live', published_at=COALESCE(published_at, ?1), updated_at=?1, updated_by=?2 WHERE id=?3`).bind(now, c.user.id, r.id).run();
  await audit(c.db, { userId: c.user.id, action: "page.published", entity: "page", entityId: r.id, detail: { slug: r.slug } });
  return json({ ok: true, page: toJson(await mustGet(c.db, r.id)) });
}

export async function unpublish(c) {
  const r = await mustGet(c.db, c.params.id);
  await c.db.prepare(`UPDATE pages SET status='draft', updated_at=?1, updated_by=?2 WHERE id=?3`).bind(nowIso(), c.user.id, r.id).run();
  return json({ ok: true, page: toJson(await mustGet(c.db, r.id)) });
}

/* ── public render ─────────────────────────────────────────────────────── */
export async function loadLive(db, slug) {
  if (badSlug(slug)) return null;
  return db.prepare(`SELECT * FROM pages WHERE slug=?1 AND status='live'`).bind(slug).first();
}

function blockHtml(b, mediaById) {
  switch (b.type) {
    case "h2": return `<h2>${esc(b.text)}</h2>`;
    case "list": return `<ul class="pd-ticks">${b.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
    case "cta": return `<p><a class="btn btn--fill" href="${esc(b.href)}">${esc(b.text)}</a></p>`;
    case "image": { const m = mediaById[b.mediaId]; return m ? `<figure class="pg-fig"><img loading="lazy" src="${esc(m.url)}" alt="${esc(m.alt || b.caption || "")}">${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ""}</figure>` : ""; }
    default: return `<p>${esc(b.text)}</p>`;
  }
}

export async function renderPage(request, env, url, db, row) {
  const tpl = await env.ASSETS.fetch(new Request(new URL("/templates/megacity-page-template.html", url).toString()));
  if (!tpl.ok) return null;
  const base = (env.MEGACITY_PUBLIC_BASE || (url.origin + "/templates/")).replace(/\/?$/, "/");
  const blocks = parseJson(row.body_json, []);
  const faq = parseJson(row.faq_json, []);
  const ids = blocks.filter((b) => b.type === "image" && b.mediaId).map((b) => b.mediaId).concat(row.hero_media_id ? [row.hero_media_id] : []);
  const mediaById = {};
  if (ids.length) {
    const rs = await db.prepare(`SELECT id, key_large, key_orig, alt FROM media WHERE id IN (${ids.map((_, i) => "?" + (i + 1)).join(",")})`).bind(...ids).all();
    for (const m of rs.results || []) mediaById[m.id] = { url: mediaUrl(m.key_large || m.key_orig), alt: m.alt };
  }
  const firstP = blocks.find((b) => b.type === "p");
  const lede = row.seo_description || (firstP ? firstP.text : "");
  const bodyBlocks = firstP && !row.seo_description ? blocks.filter((b) => b !== firstP) : blocks;
  const pageTitle = (row.seo_title || row.title) + " | Megacity Properties";
  const canonical = base + "megacity-" + row.slug;
  const hero = row.hero_media_id && mediaById[row.hero_media_id] ? mediaById[row.hero_media_id].url : null;
  const ogImage = hero ? (hero.startsWith("http") ? hero : new URL(base).origin + hero) : base + "assets/mcr/ph-manchester.jpg";
  const graph = [
    { "@type": "WebPage", "@id": canonical, url: canonical, name: row.seo_title || row.title, description: lede, ...(row.published_at ? { datePublished: row.published_at } : {}), dateModified: row.updated_at, isPartOf: { "@type": "WebSite", name: "Megacity Properties", url: base + "megacity-skyline" } },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: base + "megacity-skyline" }, { "@type": "ListItem", position: 2, name: row.title, item: canonical }] },
  ];
  if (faq.length) graph.push({ "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  const faqHtml = faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("\n");
  const res = new HTMLRewriter()
    .on("title", { element: (e) => e.setInnerContent(pageTitle) })
    .on('meta[name="description"]', { element: (e) => e.setAttribute("content", lede.slice(0, 300)) })
    .on('link[rel="canonical"]', { element: (e) => e.setAttribute("href", canonical) })
    .on('meta[property="og:url"]', { element: (e) => e.setAttribute("content", canonical) })
    .on('meta[property="og:title"], meta[name="twitter:title"]', { element: (e) => e.setAttribute("content", pageTitle) })
    .on('meta[property="og:description"], meta[name="twitter:description"]', { element: (e) => e.setAttribute("content", lede.slice(0, 300)) })
    .on('meta[property="og:image"], meta[name="twitter:image"]', { element: (e) => e.setAttribute("content", ogImage) })
    .on('script[data-slot="ld"]', { element: (e) => { e.removeAttribute("data-slot"); e.setInnerContent(JSON.stringify({ "@context": "https://schema.org", "@graph": graph }), { html: true }); } })
    .on('[data-slot="hero"]', { element: (e) => { if (hero) e.setAttribute("style", `--ph-img:url('${hero.replace(/'/g, "%27")}')`); else { e.removeAttribute("style"); e.setAttribute("class", "phead"); } } })
    .on('[data-slot="kicker"]', { element: (e) => e.setInnerContent(KIND_LABEL[row.kind] || "Megacity Properties") })
    .on('[data-slot="title"]', { element: (e) => e.setInnerContent(row.title) })
    .on('[data-slot="lede"]', { element: (e) => { if (lede) e.setInnerContent(lede); else e.remove(); } })
    .on('[data-slot="body"]', { element: (e) => e.setInnerContent(bodyBlocks.map((b) => blockHtml(b, mediaById)).join("\n"), { html: true }) })
    .on('[data-slot="faqsec"]', { element: (e) => { if (!faq.length) e.remove(); } })
    .on('[data-slot="faq"]', { element: (e) => e.setInnerContent(faqHtml, { html: true }) })
    .on("[data-slot]", { element: (e) => e.removeAttribute("data-slot") })
    .onDocument({ comments: (c) => { if (/TEMPLATE:/.test(c.text)) c.remove(); } })
    .transform(tpl);
  const headers = new Headers(res.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=60, s-maxage=120");
  headers.delete("content-length");
  return new Response(res.body, { status: 200, headers });
}
