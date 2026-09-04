/* Megacity Studio — settings (JSON blobs in the settings table). */

import { json, readJsonBody, HttpError, setSetting, clampStr, toInt, isEmail, audit } from "./db.js";

export const DEFAULTS = {
  brand: {
    name: "Megacity Properties",
    phone: "0161 220 1763",
    whatsapp: "",
    email: "info@megacityproperties.co.uk",
    address: "Office 21, The Tube Business Centre, 86 North Street, Manchester M8 8RA",
  },
  notifyEmails: [],
  links10ninety: {
    maintenance: "https://megacityproperties-maintenance.10ninety.co.uk",
    /* the old site's forms died with it; the website has its own now. Set
       these only if 10ninety supplies hosted forms to link to. */
    apply: "",
    registerTenant: "",
    registerLandlord: "",
  },
  tourGateScore: 70,
  ga4Id: "",
  metaPixelId: "",
  gscVerification: "",
  gtmId: "",
  /* [{from, to, status}] applied on the client domain before anything else (host.js) */
  redirects: [],
  consentText: "We use cookies to understand how the site is used and to measure our advertising. Essential cookies keep the site working.",
};

const OWNER_ONLY = new Set(["notifyEmails", "ga4Id", "metaPixelId", "gscVerification", "gtmId"]);
const KEYS = Object.keys(DEFAULTS);

export async function readAll(db) {
  const out = {};
  const rows = (await db.prepare(`SELECT key, value FROM settings`).all()).results || [];
  const have = {};
  for (const r of rows) { try { have[r.key] = JSON.parse(r.value); } catch {} }
  for (const k of KEYS) {
    const v = have[k];
    out[k] = v === undefined ? DEFAULTS[k] : (typeof DEFAULTS[k] === "object" && !Array.isArray(DEFAULTS[k]) ? { ...DEFAULTS[k], ...(v && typeof v === "object" ? v : {}) } : v);
  }
  return out;
}

export async function get(c) {
  return json({ settings: await readAll(c.db) });
}

/* Redirects: a lowercase root path -> a root path (optionally #section) or a
   full https:// address. Paths the site itself owns cannot be redirected. */
const PROTECTED = /^\/(api|media|billy360|templates)(\/|$)|^\/studio(\/|$)|^\/$/;
function redirectsList(v) {
  const list = Array.isArray(v) ? v.slice(0, 200) : [];
  const out = [], seen = new Set();
  for (const it of list) {
    if (!it || typeof it !== "object") continue;
    let from = String(it.from || "").trim().toLowerCase();
    if (from.length > 1) from = from.replace(/\/+$/, "");
    if (!/^\/[a-z0-9\/._~-]*$/.test(from) || from.length > 300 || PROTECTED.test(from)) {
      throw new HttpError(400, `"${String(it.from || "").slice(0, 80)}" cannot be redirected. Use a path such as /old-page (not the home page, /studio, /api or /media).`);
    }
    const to = String(it.to || "").trim();
    const okTo = /^https?:\/\/[^\s"'<>]+$/i.test(to) ? to : (/^\/[a-z0-9\/._~-]*(#[a-z0-9_-]+)?$/i.test(to) && to.length <= 500 ? to : null);
    if (!okTo) throw new HttpError(400, `"${to.slice(0, 80)}" is not a valid destination. Use a path such as /landlords, /tenants#register, or a full https:// address.`);
    if (okTo.split("#")[0].replace(/\/+$/, "") === from) throw new HttpError(400, `${from} cannot redirect to itself.`);
    if (seen.has(from)) throw new HttpError(400, `${from} is listed twice.`);
    seen.add(from);
    out.push({ from, to: okTo, status: toInt(it.status) === 302 ? 302 : 301 });
  }
  return out;
}

/* The live redirect list, cached per isolate for a minute (host.js asks on
   every request). A save from the Studio clears it straight away. */
let redirectCache = { at: 0, list: [] };
export function invalidateRedirects() { redirectCache = { at: 0, list: [] }; }
export async function liveRedirects(db) {
  if (!db) return [];
  if (Date.now() - redirectCache.at < 60e3) return redirectCache.list;
  try {
    const row = await db.prepare(`SELECT value FROM settings WHERE key='redirects'`).bind().first();
    const list = row ? JSON.parse(row.value) : [];
    redirectCache = { at: Date.now(), list: Array.isArray(list) ? list : [] };
  } catch (e) {
    console.error("redirects", e);
    redirectCache = { at: Date.now(), list: redirectCache.list };
  }
  return redirectCache.list;
}

function url(v) {
  const s = clampStr(v, 400);
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) throw new HttpError(400, "Links must start with https://");
  return s;
}

export async function put(c) {
  const body = await readJsonBody(c.request);
  const changed = {};
  for (const k of Object.keys(body)) {
    if (!KEYS.includes(k)) continue;
    if (OWNER_ONLY.has(k) && c.user.role !== "owner") throw new HttpError(403, "Only an owner can change " + k + ".");
    const raw = body[k];
    const v = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : (k === "brand" || k === "links10ninety" ? {} : raw);
    switch (k) {
      case "brand":
        changed.brand = {
          name: clampStr(v.name, 80) || DEFAULTS.brand.name,
          phone: clampStr(v.phone, 40) || "",
          whatsapp: clampStr(v.whatsapp, 40) || "",
          email: clampStr(v.email, 160) || "",
          address: clampStr(v.address, 240) || "",
        };
        if (changed.brand.email && !isEmail(changed.brand.email)) throw new HttpError(400, "The office email address is not valid.");
        break;
      case "notifyEmails": {
        const list = (Array.isArray(v) ? v : String(v || "").split(/[,\n]/)).map((s) => String(s).trim().toLowerCase()).filter(Boolean);
        for (const e of list) if (!isEmail(e)) throw new HttpError(400, e + " is not a valid email address.");
        changed.notifyEmails = list.slice(0, 10);
        break;
      }
      case "links10ninety":
        changed.links10ninety = {
          maintenance: url(v.maintenance), apply: url(v.apply), registerTenant: url(v.registerTenant), registerLandlord: url(v.registerLandlord),
        };
        break;
      case "tourGateScore": {
        const n = toInt(v);
        if (n == null || n < 0 || n > 100) throw new HttpError(400, "Tour gate score must be between 0 and 100.");
        changed.tourGateScore = n;
        break;
      }
      case "ga4Id": {
        const s = clampStr(v, 30) || "";
        if (s && !/^G-[A-Z0-9]{6,14}$/.test(s)) throw new HttpError(400, "A GA4 measurement ID looks like G-XXXXXXXXXX.");
        changed.ga4Id = s;
        break;
      }
      case "metaPixelId": {
        const s = clampStr(v, 30) || "";
        if (s && !/^\d{10,20}$/.test(s)) throw new HttpError(400, "A Meta Pixel ID is a long number.");
        changed.metaPixelId = s;
        break;
      }
      case "gscVerification":
        changed.gscVerification = clampStr(v, 120) || "";
        break;
      case "gtmId": {
        const s = (clampStr(v, 30) || "").toUpperCase();
        if (s && !/^GTM-[A-Z0-9]{4,10}$/.test(s)) throw new HttpError(400, "A Google Tag Manager container ID looks like GTM-XXXXXXX.");
        changed.gtmId = s;
        break;
      }
      case "redirects":
        changed.redirects = redirectsList(v);
        break;
      case "consentText":
        changed.consentText = clampStr(v, 600) || DEFAULTS.consentText;
        break;
    }
  }
  for (const k of Object.keys(changed)) await setSetting(c.db, k, changed[k], c.user.id);
  if (changed.redirects) invalidateRedirects();
  if (Object.keys(changed).length) await audit(c.db, { userId: c.user.id, action: "settings.updated", entity: "settings", entityId: Object.keys(changed).join(","), detail: null });
  return json({ ok: true, settings: await readAll(c.db) });
}
