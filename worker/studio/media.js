/* Megacity Studio — media: uploads to R2, the /media/* reader, patch/delete.

   Keys:  l/<listingId>/<mediaId>/orig.<ext> | w1600.jpg | w480.jpg | pano4096.jpg
   The browser derives the sizes (templates/megacity-intake.js) so the Worker
   never decodes an image; it only checks types by magic bytes and stores. */

import { uid, nowIso, HttpError, json, readJsonBody, clampStr, toInt, toNum, parseJson, audit } from "./db.js";
import { valid } from "./options.js";

export const IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };
export const STREAM_TYPES = { "video/mp4": "mp4", "video/webm": "webm", "application/pdf": "pdf" };
const MAX_IMAGE = 40 * 1024 * 1024;
const MAX_STREAM = 60 * 1024 * 1024;
const MAX_DERIVED = { large: 6 * 1024 * 1024, thumb: 1024 * 1024, pano: 20 * 1024 * 1024 };
const KEY_RE = /^l\/[a-z0-9-]{1,80}\/m_[a-z0-9]{10}\/(orig\.[a-z0-9]{2,5}|w1600\.jpg|w480\.jpg|pano4096\.jpg)$/;

export function mediaUrl(key) {
  return key ? "/media/" + key : null;
}

export function mediaToJson(m) {
  return {
    id: m.id,
    listingId: m.listing_id,
    kind: m.kind,
    role: m.role,
    roomLabel: m.room_label,
    url: mediaUrl(m.key_large || m.key_orig),
    thumb: mediaUrl(m.key_thumb || m.key_large || m.key_orig),
    orig: mediaUrl(m.key_orig),
    pano: mediaUrl(m.key_pano),
    mime: m.mime,
    width: m.width,
    height: m.height,
    bytes: m.bytes,
    alt: m.alt,
    caption: m.caption,
    sort: m.sort,
    isPano: !!m.key_pano || m.kind === "pano",
    aiLabel: m.ai_label,
    createdAt: m.created_at,
  };
}

/* Magic-byte sniffing — the browser's declared type is not trusted. */
function sniff(bytes) {
  const b = bytes;
  const s = (i, n) => String.fromCharCode(...b.slice(i, i + n));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && s(1, 3) === "PNG") return "image/png";
  if (s(0, 4) === "RIFF" && s(8, 4) === "WEBP") return "image/webp";
  if (s(0, 4) === "GIF8") return "image/gif";
  if (s(4, 4) === "ftyp") {
    const brand = s(8, 4);
    if (/^avi[fs]$/.test(brand)) return "image/avif";
    return "video/mp4";
  }
  if (s(0, 4) === "%PDF") return "application/pdf";
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/webm";
  return null;
}

async function head(file) {
  const buf = await file.slice(0, 16).arrayBuffer();
  return new Uint8Array(buf);
}

async function listingExists(db, id) {
  return !!(await db.prepare(`SELECT id FROM listings WHERE id=?1 AND deleted_at IS NULL`).bind(id).first());
}

async function nextSort(db, listingId) {
  const r = await db.prepare(`SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM media WHERE listing_id=?1`).bind(listingId).first();
  return Number(r.n) || 0;
}

async function maybeSetCover(db, listingId, mediaId, role, kind) {
  if (kind !== "photo" && kind !== "pano") return;
  const l = await db.prepare(`SELECT cover_media_id FROM listings WHERE id=?1`).bind(listingId).first();
  if (!l) return;
  if (role === "cover" || !l.cover_media_id) {
    await db.prepare(`UPDATE listings SET cover_media_id=?1 WHERE id=?2`).bind(mediaId, listingId).run();
  }
}

function normaliseRole(role) {
  return valid("mediaRole", role) && role ? role : "gallery";
}

function needStore(env) {
  if (!env.MEDIA) throw new HttpError(503, "The photo store (R2) is not connected. Add the MEDIA binding and redeploy.");
}

/* a derived size must really be a JPEG of sane size, or it is dropped */
async function derived(file, kind) {
  if (!(file instanceof File) || !file.size) return null;
  if (file.size > MAX_DERIVED[kind]) throw new HttpError(413, `The ${kind} version is too large.`);
  if ((await sniff(await head(file))) !== "image/jpeg") throw new HttpError(415, `The ${kind} version is not a JPEG.`);
  return file;
}

/* POST /api/studio/media — multipart: meta + orig + large + thumb (+ pano) */
export async function upload(c) {
  needStore(c.env);
  const len = Number(c.request.headers.get("content-length") || 0);
  if (len > MAX_IMAGE * 2) throw new HttpError(413, "That upload is too large.");
  let form;
  try { form = await c.request.formData(); } catch { throw new HttpError(400, "Expected a multipart upload."); }
  const meta = parseJson(form.get("meta"), null);
  if (!meta || !meta.listingId) throw new HttpError(400, "Missing upload details.");
  const listingId = String(meta.listingId);
  if (!/^[a-z0-9-]{1,80}$/.test(listingId) || !(await listingExists(c.db, listingId))) throw new HttpError(404, "No such listing.");

  const orig = form.get("orig");
  if (!(orig instanceof File) || !orig.size) throw new HttpError(400, "No file received.");
  if (orig.size > MAX_IMAGE) throw new HttpError(413, "Images must be under 40 MB.");
  const mime = sniff(await head(orig));
  if (!mime || !IMAGE_TYPES[mime]) throw new HttpError(415, "That file is not a supported image (JPEG, PNG, WebP, GIF or AVIF).");
  const large = await derived(form.get("large"), "large"), thumb = await derived(form.get("thumb"), "thumb"), pano = await derived(form.get("pano"), "pano");

  const id = uid("m");
  const base = `l/${listingId}/${id}/`;
  const keys = { key_orig: base + "orig." + IMAGE_TYPES[mime], key_large: null, key_thumb: null, key_pano: null };
  const puts = [c.env.MEDIA.put(keys.key_orig, await orig.arrayBuffer(), { httpMetadata: { contentType: mime } })];
  if (large) { keys.key_large = base + "w1600.jpg"; puts.push(c.env.MEDIA.put(keys.key_large, await large.arrayBuffer(), { httpMetadata: { contentType: "image/jpeg" } })); }
  if (thumb) { keys.key_thumb = base + "w480.jpg"; puts.push(c.env.MEDIA.put(keys.key_thumb, await thumb.arrayBuffer(), { httpMetadata: { contentType: "image/jpeg" } })); }
  if (pano) { keys.key_pano = base + "pano4096.jpg"; puts.push(c.env.MEDIA.put(keys.key_pano, await pano.arrayBuffer(), { httpMetadata: { contentType: "image/jpeg" } })); }
  await Promise.all(puts);

  const isPano = !!keys.key_pano || meta.isPano === true;
  const role = normaliseRole(meta.role) === "gallery" && isPano ? "tour" : normaliseRole(meta.role);
  const row = {
    id, listing_id: listingId, kind: isPano ? "pano" : "photo", role,
    room_label: clampStr(meta.roomLabel, 60), ...keys, mime,
    width: toInt(meta.width), height: toInt(meta.height), bytes: orig.size,
    alt: clampStr(meta.alt, 200), caption: clampStr(meta.caption, 300),
    sort: await nextSort(c.db, listingId),
    phash: clampStr(meta.phash, 80), luma: toInt(meta.luma), sharp: toInt(meta.sharp),
    created_at: nowIso(), created_by: c.user.id,
  };
  await insertMedia(c.db, row);
  await maybeSetCover(c.db, listingId, id, role, row.kind);
  await touch(c.db, listingId, c.user.id);
  await audit(c.db, { userId: c.user.id, action: "media.uploaded", entity: "listing", entityId: listingId, detail: { mediaId: id, kind: row.kind, role, bytes: orig.size } });
  let wentLive = false;
  try { wentLive = await (await import("./listings.js")).autoPublishIfReady(c.env, c.db, listingId); } catch (e) { console.error("autoPublish", e); }
  return json({ ...mediaToJson(row), listingWentLive: wentLive }, 201);
}

/* PUT /api/studio/media/stream?listingId=&kind=video|pdf&role=&filename= — raw body */
export async function stream(c) {
  needStore(c.env);
  const listingId = String(c.url.searchParams.get("listingId") || "");
  if (!/^[a-z0-9-]{1,80}$/.test(listingId) || !(await listingExists(c.db, listingId))) throw new HttpError(404, "No such listing.");
  const len = Number(c.request.headers.get("content-length") || 0);
  if (!len) throw new HttpError(411, "Content-Length is required for streamed uploads.");
  if (len > MAX_STREAM) throw new HttpError(413, "Videos and PDFs must be under 60 MB.");
  const declared = (c.request.headers.get("content-type") || "").split(";")[0].trim();
  if (!STREAM_TYPES[declared]) throw new HttpError(415, "Only MP4, WebM and PDF can be streamed.");
  const mime = declared;
  const id = uid("m");
  const key = `l/${listingId}/${id}/orig.${STREAM_TYPES[mime]}`;
  // R2 needs a stream of known length; the first chunk is sniffed on the way through.
  let typeOk = null;
  const inspect = new TransformStream({
    transform(chunk, controller) {
      if (typeOk === null) {
        typeOk = sniff(chunk.slice(0, 16)) === declared;
        if (!typeOk) { controller.error(new Error("type")); return; }
      }
      controller.enqueue(chunk);
    },
  });
  const fixed = new FixedLengthStream(len);
  const piping = c.request.body.pipeThrough(inspect).pipeTo(fixed.writable).catch(() => {});
  try {
    await c.env.MEDIA.put(key, fixed.readable, { httpMetadata: { contentType: mime, contentDisposition: "inline" } });
  } catch (e) {
    await piping;
    if (typeOk === false) throw new HttpError(415, "The file does not look like " + declared + ".");
    throw e;
  }
  await piping;
  const kind = mime === "application/pdf" ? "pdf" : "video";
  const role = normaliseRole(c.url.searchParams.get("role"));
  const row = {
    id, listing_id: listingId, kind, role: kind === "pdf" && role === "gallery" ? "floorplan" : role,
    room_label: clampStr(c.url.searchParams.get("roomLabel"), 60),
    key_orig: key, key_large: null, key_thumb: null, key_pano: null, mime,
    width: null, height: null, bytes: len, alt: clampStr(c.url.searchParams.get("alt") || c.url.searchParams.get("filename"), 200), caption: null,
    sort: await nextSort(c.db, listingId), phash: null, luma: null, sharp: null,
    created_at: nowIso(), created_by: c.user.id,
  };
  await insertMedia(c.db, row);
  await touch(c.db, listingId, c.user.id);
  await audit(c.db, { userId: c.user.id, action: "media.uploaded", entity: "listing", entityId: listingId, detail: { mediaId: id, kind, bytes: len } });
  return json(mediaToJson(row), 201);
}

async function insertMedia(db, r) {
  await db.prepare(
    `INSERT INTO media (id, listing_id, kind, role, room_label, key_orig, key_large, key_thumb, key_pano, mime, width, height, bytes, alt, caption, sort, phash, luma, sharp, created_at, created_by)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)`
  ).bind(r.id, r.listing_id, r.kind, r.role, r.room_label, r.key_orig, r.key_large, r.key_thumb, r.key_pano, r.mime, r.width, r.height, r.bytes, r.alt, r.caption, r.sort, r.phash, r.luma, r.sharp, r.created_at, r.created_by).run();
}

async function touch(db, listingId, userId) {
  await db.prepare(`UPDATE listings SET updated_at=?1, updated_by=?2 WHERE id=?3`).bind(nowIso(), userId, listingId).run();
}

/* PATCH /api/studio/media/:id */
export async function patch(c) {
  const m = await c.db.prepare(`SELECT * FROM media WHERE id=?1`).bind(c.params.id).first();
  if (!m) throw new HttpError(404, "No such media.");
  const body = await readJsonBody(c.request);
  const sets = {};
  if ("alt" in body) sets.alt = clampStr(body.alt, 200);
  if ("caption" in body) sets.caption = clampStr(body.caption, 300);
  if ("roomLabel" in body) sets.room_label = clampStr(body.roomLabel, 60);
  if ("role" in body) {
    const role = normaliseRole(body.role);
    sets.role = role;
    if (role === "cover") await c.db.prepare(`UPDATE listings SET cover_media_id=?1 WHERE id=?2`).bind(m.id, m.listing_id).run();
  }
  const keys = Object.keys(sets);
  if (keys.length) {
    await c.db.prepare(`UPDATE media SET ${keys.map((k, i) => `${k}=?${i + 1}`).join(", ")} WHERE id=?${keys.length + 1}`).bind(...keys.map((k) => sets[k]), m.id).run();
    await touch(c.db, m.listing_id, c.user.id);
  }
  const fresh = await c.db.prepare(`SELECT * FROM media WHERE id=?1`).bind(m.id).first();
  return json(mediaToJson(fresh));
}

/* DELETE /api/studio/media/:id */
export async function remove(c) {
  const m = await c.db.prepare(`SELECT * FROM media WHERE id=?1`).bind(c.params.id).first();
  if (!m) throw new HttpError(404, "No such media.");
  await deleteObjects(c.env, m, c.url.origin);
  await c.db.prepare(`DELETE FROM media WHERE id=?1`).bind(m.id).run();
  const l = await c.db.prepare(`SELECT cover_media_id FROM listings WHERE id=?1`).bind(m.listing_id).first();
  if (l && l.cover_media_id === m.id) {
    const next = await c.db.prepare(`SELECT id FROM media WHERE listing_id=?1 AND kind IN ('photo','pano') ORDER BY sort LIMIT 1`).bind(m.listing_id).first();
    await c.db.prepare(`UPDATE listings SET cover_media_id=?1 WHERE id=?2`).bind(next ? next.id : null, m.listing_id).run();
  }
  await touch(c.db, m.listing_id, c.user.id);
  await audit(c.db, { userId: c.user.id, action: "media.deleted", entity: "listing", entityId: m.listing_id, detail: { mediaId: m.id } });
  return json({ ok: true });
}

export async function deleteObjects(env, m, origin) {
  const keys = [m.key_orig, m.key_large, m.key_thumb, m.key_pano].filter(Boolean);
  if (!keys.length) return;
  if (env.MEDIA) await env.MEDIA.delete(keys);
  /* the edge copy is immutable for a year unless we drop it here */
  if (origin) {
    for (const k of keys) { try { await caches.default.delete(new Request(origin + "/media/" + k)); } catch {} }
  }
}

export async function deleteAllForListing(env, db, listingId, origin) {
  const rows = (await db.prepare(`SELECT * FROM media WHERE listing_id=?1`).bind(listingId).all()).results || [];
  for (const m of rows) await deleteObjects(env, m, origin);
  await db.prepare(`DELETE FROM media WHERE listing_id=?1`).bind(listingId).run();
}

export async function listForListing(db, listingId) {
  const rows = (await db.prepare(`SELECT * FROM media WHERE listing_id=?1 ORDER BY sort, created_at`).bind(listingId).all()).results || [];
  return rows.map(mediaToJson);
}

/* GET /media/<key> — public, immutable, range-aware (video seeking). */
export async function serve(request, env, url) {
  try {
    return await serveInner(request, env, url);
  } catch (e) {
    if (e instanceof URIError) return new Response("Not found", { status: 404 });
    console.error("media serve", e && e.message);
    return new Response("Bad request", { status: 400 });
  }
}

async function serveInner(request, env, url) {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  const key = decodeURIComponent(url.pathname.slice("/media/".length));
  if (!KEY_RE.test(key)) return new Response("Not found", { status: 404 });
  if (!env.MEDIA) return new Response("Media store not connected", { status: 503 });

  const cache = caches.default;
  /* the key is the path alone, so ?anything cannot bypass the edge copy */
  const cacheKey = new Request(url.origin + url.pathname, { method: "GET" });
  if (!request.headers.has("range")) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }
  const hasRange = request.headers.has("range");
  const obj = await env.MEDIA.get(key, hasRange ? { range: request.headers, onlyIf: request.headers } : { onlyIf: request.headers });
  if (!obj) return new Response("Not found", { status: 404, headers: { "cache-control": "public, max-age=60" } });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("accept-ranges", "bytes");
  headers.set("x-content-type-options", "nosniff");
  if (hasRange && obj.range) {
    const start = obj.range.suffix != null ? Math.max(0, obj.size - obj.range.suffix) : (obj.range.offset || 0);
    const end = obj.range.suffix != null ? obj.size - 1 : (obj.range.length != null ? start + obj.range.length - 1 : obj.size - 1);
    headers.set("content-range", `bytes ${start}-${end}/${obj.size}`);
    headers.set("content-length", String(end - start + 1));
    return new Response(request.method === "HEAD" ? null : obj.body, { status: 206, headers });
  }
  if (!("body" in obj)) return new Response(null, { status: 304, headers });
  headers.set("content-length", String(obj.size));
  const res = new Response(request.method === "HEAD" ? null : obj.body, { status: 200, headers });
  if (request.method === "GET") {
    try { await cache.put(cacheKey, res.clone()); } catch {}
  }
  return res;
}
