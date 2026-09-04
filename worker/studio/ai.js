/* Megacity Studio — Claude behind the Studio's AI buttons.

   Rules that never bend:
   - the key lives only in the ANTHROPIC_API_KEY Worker secret;
   - every route returns 503 when it is unset, and the Studio hides the buttons;
   - copy is written from the facts in the record and nothing else — a fact
     that is absent is not mentioned, and nothing is written into the
     database by the model itself: staff read, edit and save;
   - every call is logged to ai_usage and rate limited per person. */

import { uid, nowIso, HttpError, json, readJsonBody, clampStr, bump, audit, parseJson } from "./db.js";
import * as urls from "./urls.js";
import { label } from "./options.js";
import { getFull } from "./listings.js";

const API = "https://api.anthropic.com/v1/messages";
const VERSION = "2023-06-01";
const MODELS = { write: "claude-sonnet-5", quick: "claude-haiku-4-5-20251001" };
const HOURLY = 60;

const HOUSE_RULES =
  "You write for Megacity Properties, a lettings agency in Manchester, UK. British English, plain and warm, no hype. " +
  "Write ONLY from the facts you are given. If a fact is absent, do not mention it and do not guess: no transport links, views, appliances, measurements, dates, prices, availability, schools or statistics unless they appear in the input. " +
  "Never invent testimonials, awards or claims about the agency. Comply with the Equality Act 2010: nothing that prefers or excludes people by protected characteristic, no 'professionals only', no 'no DSS'. " +
  "Never mention that you are an AI.";

function requireKey(env) {
  if (!env.ANTHROPIC_API_KEY) throw new HttpError(503, "AI is not configured. Add the ANTHROPIC_API_KEY secret to the Worker.", { configured: false });
}

async function limit(c, route) {
  const rl = await bump(c.db, "ai:user:" + c.user.id, 3600e3, HOURLY);
  if (!rl.ok) throw new HttpError(429, "That is enough AI for the moment; try again in a few minutes.", { retryAfter: rl.retryAfter });
}

/* One structured call: the model must answer through a single tool whose
   input schema is the JSON we want, so parsing never fails. */
async function claude(c, { route, model, system, content, tool, maxTokens }) {
  const started = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 28000);
  let ok = 0, usage = null, out = null, err = null;
  try {
    const res = await fetch(API, {
      method: "POST",
      signal: ctl.signal,
      headers: { "x-api-key": c.env.ANTHROPIC_API_KEY, "anthropic-version": VERSION, "content-type": "application/json" },
      body: JSON.stringify({
        model, max_tokens: maxTokens || 1000, system: HOUSE_RULES + "\n\n" + system,
        tools: [{ name: tool.name, description: tool.description, input_schema: tool.schema }],
        tool_choice: { type: "tool", name: tool.name },
        messages: [{ role: "user", content }],
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      err = (body.error && body.error.message) || ("HTTP " + res.status);
      throw new HttpError(res.status === 429 ? 429 : 502, "The AI service did not answer (" + err + ").");
    }
    usage = body.usage || null;
    const block = (body.content || []).find((b) => b.type === "tool_use" && b.name === tool.name);
    if (!block) throw new HttpError(502, "The AI service answered in an unexpected shape.");
    out = block.input;
    ok = 1;
    return out;
  } catch (e) {
    if (e.name === "AbortError") throw new HttpError(504, "The AI service took too long. Try again.");
    throw e;
  } finally {
    clearTimeout(timer);
    try {
      await c.db.prepare(`INSERT INTO ai_usage (id, at, user_id, route, model, input_tokens, output_tokens, ms, ok) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`)
        .bind(uid("ai"), nowIso(), c.user.id, route, model, usage ? usage.input_tokens : null, usage ? usage.output_tokens : null, Date.now() - started, ok).run();
    } catch (e2) { console.error("ai_usage", e2); }
  }
}

/* The facts a listing offers the model — labels, not codes; nothing empty. */
function factsFor(l) {
  const h = l.home || {};
  const f = {
    title: l.title, headline: l.headline, propertyType: label("type", l.type), letType: label("letType", l.letType),
    furnishing: label("furnishing", l.furnishing),
    rentPerMonth: l.rentPcm ? "£" + l.rentPcm : null, deposit: l.deposit ? "£" + l.deposit : null,
    bills: label("bills", l.bills), billsNote: l.billsNote, availability: label("availability", l.availability), availableFrom: l.availableFrom,
    minimumTerm: label("minTerm", l.minTerm), councilTaxBand: l.councilTaxBand, epcRating: l.epcRating && l.epcRating !== "pending" ? l.epcRating : null,
    bedrooms: l.bedrooms,
    bathrooms: (h.bathrooms || []).map((b) => label("bathroom", b.subtype) + (b.notes ? " (" + b.notes + ")" : "")),
    livingSpaces: (h.receptions || []).map((b) => label("reception", b.subtype) + (b.notes ? " (" + b.notes + ")" : "")),
    kitchen: h.kitchen ? label("kitchen", h.kitchen.subtype) + (h.kitchen.notes ? " (" + h.kitchen.notes + ")" : "") : null,
    garden: h.garden ? label("garden", h.garden.subtype) + (h.garden.notes ? " (" + h.garden.notes + ")" : "") : null,
    driveway: h.driveway ? label("driveway", h.driveway.subtype) : null,
    parking: l.parkingSpaces == null ? null : l.parkingSpaces > 0 ? l.parkingSpaces + " allocated space(s)" : "no allocated parking" + (l.parkingNote ? " — " + l.parkingNote : ""),
    pets: label("pets", l.pets), hmoLicensed: l.hmoLicensed ? "yes" : null, floorAreaSqft: l.floorAreaSqft,
    address: [l.address && l.address.line1, l.address && l.address.line2, l.address && l.address.town, label("area", l.address && l.address.area)].filter(Boolean).join(", "),
    existingSummary: l.summary, existingDescription: l.description, existingFeatures: l.features,
    photosOf: (l.media || []).map((m) => m.roomLabel || m.alt).filter(Boolean),
  };
  for (const k of Object.keys(f)) if (f[k] == null || f[k] === "" || (Array.isArray(f[k]) && !f[k].length)) delete f[k];
  return f;
}

async function listingFor(c, id) {
  const l = await getFull(c.db, String(id || ""));
  if (!l || l.deletedAt) throw new HttpError(404, "No such listing.");
  return l;
}

/* ── routes ────────────────────────────────────────────────────────────── */
export async function listingCopy(c) {
  requireKey(c.env);
  const body = await readJsonBody(c.request);
  const l = await listingFor(c, body.listingId);
  if (l.source === "tenninety") throw new HttpError(400, "This listing's copy is managed in 10ninety.");
  await limit(c, "listing-copy");
  const tone = ["standard", "warm", "concise"].includes(body.tone) ? body.tone : "standard";
  const out = await claude(c, {
    route: "listing-copy", model: MODELS.write, maxTokens: 1100,
    system: `Write the website listing for a rental home. Tone: ${tone}. The summary is one or two sentences for the search card. The description is two to four short paragraphs a tenant would actually read. Features are short noun phrases, most important first, no duplicates of each other, at most ten. seoTitle at most 60 characters, seoDescription at most 155.`,
    content: "Facts (JSON):\n" + JSON.stringify(factsFor(l), null, 1),
    tool: {
      name: "listing_copy", description: "The finished listing copy.",
      schema: { type: "object", required: ["summary", "description", "features", "seoTitle", "seoDescription"], properties: {
        summary: { type: "string" }, description: { type: "array", items: { type: "string" } }, features: { type: "array", items: { type: "string" } },
        seoTitle: { type: "string" }, seoDescription: { type: "string" } } },
    },
  });
  await audit(c.db, { userId: c.user.id, action: "ai.listing_copy", entity: "listing", entityId: l.id, detail: { tone } });
  return json({
    summary: clampStr(out.summary, 600), description: (out.description || []).map((p) => clampStr(p, 1500)).filter(Boolean).slice(0, 4).join("\n\n"),
    features: (out.features || []).map((f) => clampStr(f, 120)).filter(Boolean).slice(0, 10), seoTitle: clampStr(out.seoTitle, 70), seoDescription: clampStr(out.seoDescription, 170),
  });
}

async function imageBlock(c, mediaId) {
  if (!c.env.MEDIA) throw new HttpError(503, "The photo store (R2) is not connected.");
  const m = await c.db.prepare(`SELECT * FROM media WHERE id=?1`).bind(String(mediaId || "")).first();
  if (!m) throw new HttpError(404, "No such photo.");
  if (m.kind !== "photo" && m.kind !== "pano") throw new HttpError(400, "Only photos can be looked at.");
  const key = m.key_thumb || m.key_large || m.key_orig;
  const obj = await c.env.MEDIA.get(key);
  if (!obj) throw new HttpError(404, "The image file is missing.");
  const buf = new Uint8Array(await obj.arrayBuffer());
  if (buf.length > 4_000_000) throw new HttpError(413, "That image is too large to analyse; the thumbnail should be used.");
  let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  const mediaType = (obj.httpMetadata && obj.httpMetadata.contentType) || "image/jpeg";
  return { m, block: { type: "image", source: { type: "base64", media_type: mediaType, data: btoa(bin) } } };
}

const ROOM_KINDS = ["hallway", "living", "kitchen", "bedroom", "bathroom", "en_suite", "garden", "driveway", "landing", "exterior", "other"];

export async function classifyRoom(c) {
  requireKey(c.env);
  const body = await readJsonBody(c.request);
  const { m, block } = await imageBlock(c, body.mediaId);
  await limit(c, "classify-room");
  let rooms = [];
  if (m.listing_id) {
    const l = await getFull(c.db, m.listing_id);
    if (l) { const h = l.home || {}; rooms = [].concat(l.bedrooms ? Array.from({ length: Math.min(10, l.bedrooms) }, (_, i) => "Bedroom " + (i + 1)) : [], (h.bathrooms || []).map((b) => label("bathroom", b.subtype) || "Bathroom"), (h.receptions || []).map((b) => label("reception", b.subtype) || "Living room"), h.kitchen ? ["Kitchen"] : [], h.garden ? [label("garden", h.garden.subtype) || "Garden"] : [], h.driveway ? ["Driveway"] : []); }
  }
  const out = await claude(c, {
    route: "classify-room", model: MODELS.quick, maxTokens: 160,
    system: "Look at one estate-agency photograph and say which room or space it shows. Choose kind from the list. name is the label the agency would print, matching one of the property's rooms when it clearly is one. alt is a factual alt text of at most 120 characters describing what is visible — no adjectives like stunning.",
    content: [{ type: "text", text: "Kinds: " + ROOM_KINDS.join(", ") + (rooms.length ? "\nThis property's rooms: " + rooms.join("; ") : "") }, block],
    tool: { name: "room", description: "What the photo shows.", schema: { type: "object", required: ["kind", "name", "confidence", "alt"], properties: { kind: { type: "string", enum: ROOM_KINDS }, name: { type: "string" }, confidence: { type: "number" }, alt: { type: "string" } } } },
  });
  const conf = Math.max(0, Math.min(1, Number(out.confidence) || 0));
  await c.db.prepare(`UPDATE media SET ai_label=?1, ai_confidence=?2 WHERE id=?3`).bind(clampStr(out.name, 60), conf, m.id).run();
  return json({ kind: ROOM_KINDS.includes(out.kind) ? out.kind : "other", name: clampStr(out.name, 60), confidence: conf, alt: clampStr(out.alt, 120) });
}

export async function altText(c) {
  requireKey(c.env);
  const body = await readJsonBody(c.request);
  const { m, block } = await imageBlock(c, body.mediaId);
  await limit(c, "alt-text");
  const out = await claude(c, {
    route: "alt-text", model: MODELS.quick, maxTokens: 80,
    system: "Write factual alt text (max 120 characters) for a property photo: what is visible, in plain words, no marketing adjectives.",
    content: [{ type: "text", text: m.room_label ? "The agency labels this photo: " + m.room_label : "Describe the photo." }, block],
    tool: { name: "alt", description: "The alt text.", schema: { type: "object", required: ["alt"], properties: { alt: { type: "string" } } } },
  });
  return json({ alt: clampStr(out.alt, 120) });
}

export async function shareKit(c) {
  requireKey(c.env);
  const body = await readJsonBody(c.request);
  const l = await listingFor(c, body.listingId);
  await limit(c, "share-kit");
  const urlOf = urls.absUrl(c.env, c.url, "listing", l.id);
  const out = await claude(c, {
    route: "share-kit", model: MODELS.write, maxTokens: 1200,
    system: `Write a small social kit for one rental listing, from the facts only. facebook: 2–4 sentences, ends with the link. instagram: short lines, emoji allowed but sparing, the link is not clickable there so say "link in bio" and include no URL. whatsapp: one friendly message a landlord's agent would forward, with the link. spareroom: only if it is a room in a shared house — a factual advert of 3–5 sentences; otherwise an empty string. hashtags: 5–8, lowercase, no spaces, Manchester-relevant. headline: at most 70 characters. metaDescription: at most 155 characters. The listing URL is ${urlOf}.`,
    content: "Facts (JSON):\n" + JSON.stringify(factsFor(l), null, 1),
    tool: { name: "share_kit", description: "The social posts.", schema: { type: "object", required: ["headline", "facebook", "instagram", "whatsapp", "spareroom", "hashtags", "metaDescription"], properties: {
      headline: { type: "string" }, facebook: { type: "string" }, instagram: { type: "string" }, whatsapp: { type: "string" }, spareroom: { type: "string" }, hashtags: { type: "array", items: { type: "string" } }, metaDescription: { type: "string" } } } },
  });
  await audit(c.db, { userId: c.user.id, action: "ai.share_kit", entity: "listing", entityId: l.id });
  return json({
    headline: clampStr(out.headline, 90), facebook: clampStr(out.facebook, 1200), instagram: clampStr(out.instagram, 1200), whatsapp: clampStr(out.whatsapp, 800), spareroom: clampStr(out.spareroom, 1500) || "",
    hashtags: (out.hashtags || []).map((h) => clampStr(String(h).replace(/^#/, "").replace(/\s+/g, ""), 40)).filter(Boolean).slice(0, 8), metaDescription: clampStr(out.metaDescription, 170), url: urlOf,
  });
}

export async function pageDraft(c) {
  requireKey(c.env);
  const body = await readJsonBody(c.request);
  const kind = ["area", "landing", "guide"].includes(body.kind) ? body.kind : "area";
  const brief = clampStr(body.brief, 2000) || "";
  const area = clampStr(body.area, 80) || "";
  if (!brief && !area) throw new HttpError(400, "Give the page a subject: an area, or a brief.");
  await limit(c, "page-draft");
  const live = (await c.db.prepare(`SELECT title, rent_pcm, bedrooms, type, area, town FROM listings WHERE status='live' AND hidden=0 AND deleted_at IS NULL${area ? " AND (area=?1 OR town LIKE ?2)" : ""} LIMIT 12`).bind(...(area ? [area.toLowerCase(), "%" + area + "%"] : [])).all()).results || [];
  const out = await claude(c, {
    route: "page-draft", model: MODELS.write, maxTokens: 2600,
    system: `Draft a ${kind} page for the agency's website. Use blocks: h2 (heading text), p (one paragraph), list (3–7 items), cta (a short call to action about contacting the office or booking a valuation). Between 6 and 12 blocks. faq: 3–5 question/answer pairs a tenant or landlord would really ask. seoTitle at most 60 characters, seoDescription at most 155. Do not state statistics, prices, rankings, journey times, school ratings or crime figures unless they are in the input; write about what the agency does and general, verifiable characteristics of a place stated plainly. No testimonials.`,
    content: `Kind: ${kind}\nArea: ${area || "(none)"}\nBrief from the office: ${brief || "(none)"}\nLive listings we manage there (may be empty): ${JSON.stringify(live)}`,
    tool: { name: "page", description: "The drafted page.", schema: { type: "object", required: ["title", "seoTitle", "seoDescription", "blocks", "faq"], properties: {
      title: { type: "string" }, seoTitle: { type: "string" }, seoDescription: { type: "string" },
      blocks: { type: "array", items: { type: "object", required: ["type"], properties: { type: { type: "string", enum: ["h2", "p", "list", "cta"] }, text: { type: "string" }, items: { type: "array", items: { type: "string" } } } } },
      faq: { type: "array", items: { type: "object", required: ["q", "a"], properties: { q: { type: "string" }, a: { type: "string" } } } } } } },
  });
  return json({
    title: clampStr(out.title, 120), seoTitle: clampStr(out.seoTitle, 70), seoDescription: clampStr(out.seoDescription, 170),
    blocks: (out.blocks || []).slice(0, 14).map((b) => ({ type: ["h2", "p", "list", "cta"].includes(b.type) ? b.type : "p", text: clampStr(b.text, 2000), items: (b.items || []).map((i) => clampStr(i, 200)).filter(Boolean).slice(0, 8) })),
    faq: (out.faq || []).slice(0, 6).map((f) => ({ q: clampStr(f.q, 200), a: clampStr(f.a, 1200) })).filter((f) => f.q && f.a),
  });
}

export async function usage(c) {
  const rows = (await c.db.prepare(`SELECT route, COUNT(*) n, SUM(input_tokens) tin, SUM(output_tokens) tout, SUM(ok) ok FROM ai_usage WHERE at >= ?1 GROUP BY route`).bind(new Date(Date.now() - 30 * 864e5).toISOString()).all()).results || [];
  return json({ configured: !!c.env.ANTHROPIC_API_KEY, last30: rows.map((r) => ({ route: r.route, calls: Number(r.n), ok: Number(r.ok), inputTokens: Number(r.tin) || 0, outputTokens: Number(r.tout) || 0 })) });
}
