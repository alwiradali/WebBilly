/* Deciding what a sync should do — separately from doing it.
 *
 * This file holds no database calls and no network calls on purpose. Every
 * judgement a sync makes about a client's live website is made here, in a pure
 * function over two lists, so it can be tested against the cases that matter
 * rather than against a database that happens to be in a convenient state.
 *
 * WHAT DRIVES REMOVAL
 *
 * Absence. If a property is not in the feed, Walid is not marketing it, and it
 * comes off the website. That is what he asked for: he adds it in 10ninety and
 * it appears, he takes it off there and it goes.
 *
 * Which makes the feed being WRONG the thing to defend against, because
 * "Walid withdrew eight properties" and "10ninety had a bad minute" arrive
 * looking identical — an empty-ish list. A sync that believes the second one
 * empties a letting agent's website, and it does it at whatever hour the cron
 * happened to run.
 *
 * So there are three defences, and none of them is a retry:
 *
 *   1. A feed that could not be READ changes nothing. Not "remove nothing and
 *      update the rest" — nothing. A partial read is not a smaller feed.
 *   2. A feed that arrives EMPTY never removes. Nine to zero is not a business
 *      event; it is an outage, an expired key, or an export nobody ran.
 *   3. A feed that has lost more than a third of the listings in one go stops
 *      and says so, instead of acting. A real withdrawal of that size is rare
 *      and can be confirmed by a human in a minute. A false one is a day of
 *      the phone not ringing, and nobody knows why.
 *
 * None of that protects a property Walid genuinely let. It is meant not to.
 */

import { toListings, fetchProperties, fetchPropertyTypes, feedMediaKey, imageShape } from "./tenninety.js";
import { uid, nowIso, parseJson, getSetting, setSetting, sha256Hex } from "./db.js";

/* Above this fraction of existing listings disappearing at once, refuse to act
   and report instead. A third is chosen to be well clear of ordinary churn —
   with nine properties, three going in one sync is already unusual. */
export const MAX_REMOVAL_FRACTION = 1 / 3;

/* Columns the sync owns. Anything not here is the website's own and is never
   touched by a sync, which is what lets the Studio keep editing extras on a
   listing whose facts come from 10ninety. */
export const SYNCED_FIELDS = [
  "ref", "status", "title", "headline", "type", "letType", "rentPcm", "deposit",
  "bills", "availability", "availableFrom", "councilTaxBand", "bedrooms",
  "bathrooms", "receptions", "hmoLicensed", "address1", "address2", "town",
  "postcode", "area", "lat", "lng", "summary", "description",
];

const val = (v) => (v === undefined ? null : v);

/* Has anything the sync owns actually changed? Without this every sync writes
   every row, which turns a quiet no-op into nine writes, nine audit entries
   and a changed updated_at on properties nobody touched. */
export function changedFields(existing, incoming) {
  const out = [];
  for (const f of SYNCED_FIELDS) {
    const a = val(existing && existing[f]);
    const b = val(incoming[f]);
    if (a === null && b === null) continue;
    if (String(a) !== String(b)) out.push(f);
  }
  /* Photographs are not one of the columns above, and leaving them out of this
     comparison meant a property whose only change was a new photograph counted
     as unchanged — so the photograph never reached the website. Walid adds a
     picture in 10ninety, exports, and nothing happens, with nothing to say why.
     The signature is the media keys in order, which is exactly what the sync
     would write, so it changes when and only when the set of photographs does.
     Deliberately not the URLs: 10ninety puts a ?at= cache-buster on those that
     moves on every export, and comparing them would make every sync a write. */
  const pa = val(existing && existing.photoSig), pb = val(incoming.photoSig);
  if (pb !== null && String(pa) !== String(pb)) out.push("photos");
  /* The same blind spot, for everything else he can upload or type in
     10ninety that is not one of the columns: the key features, the EPC, the
     floor plans, the brochure and the virtual tour link. A property whose only
     change was a new floor plan used to count as unchanged, so it never came
     across however often the sync ran. */
  const docA = val(existing && existing.docSig), docB = val(incoming.docSig);
  if (docB !== null && String(docA) !== String(docB)) out.push("documents");
  return out;
}

/* Features and document links, as one comparable string. Query strings are
   dropped for the same reason as with photographs: 10ninety adds a
   cache-buster that moves on every export. */
const noQuery = (u) => (typeof u === "string" ? u.split("?")[0] : "");
export function docSigOf(r) {
  return JSON.stringify([
    Array.isArray(r && r.features) ? r.features : [],
    noQuery(r && r.epcUrl), noQuery(r && r.brochureUrl), noQuery(r && r.tourUrl),
    (Array.isArray(r && r.floorplans) ? r.floorplans : []).map(noQuery),
  ]);
}

/**
 * Decide what to do, given what is on the site and what the feed says.
 *
 * @param {Array}  existing  listings already in the database, source tenninety
 * @param {Array}  incoming  listings mapped from the feed (toListings)
 * @param {object} opts      { feedOk, pinned, maxRemovalFraction }
 * @returns {{create, update, unchanged, remove, held, refusedRemoval, reason}}
 */
export function planSync(existing, incoming, opts = {}) {
  const feedOk = opts.feedOk !== false;
  const maxFrac = opts.maxRemovalFraction ?? MAX_REMOVAL_FRACTION;

  const plan = {
    create: [], update: [], unchanged: [], remove: [], held: [],
    refusedRemoval: false, reason: null,
  };

  /* 1. A feed that could not be read is not a feed. */
  if (!feedOk) {
    plan.reason = "the feed could not be read, so nothing was changed";
    plan.refusedRemoval = true;
    return plan;
  }

  /* Every row the feed has ever given us, for matching; only the ones on the
     website, for removal. A property that was Let, left the feed and was
     withdrawn, and is now back On The Market is the same property, so it is
     an update that puts it live again, not a new row. Treating it as new
     tried to insert an id that already existed, failed every minute, and the
     property never came back (73 Drayton Street, RL0089, 26 Sep). */
  const all = new Map((existing || []).map((r) => [r.id, r]));
  const have = new Map((existing || []).filter((r) => r.status !== "withdrawn" && !r.deletedAt).map((r) => [r.id, r]));
  const want = new Map((incoming || []).map((r) => [r.id, r]));
  plan.binned = [];

  for (const [id, row] of want) {
    const prev = all.get(id);
    if (!prev) { plan.create.push(row); continue; }
    /* In the Studio's Bin: somebody put it there on purpose, so the feed does
       not overrule them. It is reported, and restoring it is one click. */
    if (prev.deletedAt) { plan.binned.push(row); continue; }
    const fields = changedFields(prev, row);
    if (fields.length) plan.update.push({ ...row, _changed: fields, _returning: prev.status === "withdrawn" });
    else plan.unchanged.push(row);
  }

  const gone = [...have.values()].filter((r) => !want.has(r.id));

  /* "Keep on the website" beats the feed. A pinned listing is one somebody
     deliberately said a sync may not remove, and the sync does not get a
     casting vote on that. */
  for (const r of gone) if (r.pinned) plan.held.push(r);
  const removable = gone.filter((r) => !r.pinned);

  /* 2. An empty feed removes nothing, whatever the arithmetic says. */
  if (!want.size && have.size) {
    plan.refusedRemoval = true;
    plan.reason = `the feed returned no properties at all, and ${have.size} are on the site — ` +
      `treated as a fault rather than as ${have.size} withdrawals`;
    return plan;
  }

  /* 3. Losing a large share at once is reported, not acted on. */
  if (removable.length && have.size && removable.length / have.size > maxFrac) {
    plan.refusedRemoval = true;
    plan.reason = `the feed dropped ${removable.length} of ${have.size} listings in one sync, ` +
      `more than the ${Math.round(maxFrac * 100)}% that is treated as ordinary churn — ` +
      `nothing was removed, confirm in 10ninety and refresh`;
    return plan;
  }

  plan.remove = removable;
  return plan;
}

/* One line a person can read, for the Studio and for a log. A sync that says
   "ok" tells nobody whether it did anything. */
export function describePlan(plan) {
  if (plan.reason) return `Nothing changed — ${plan.reason}.`;
  const bits = [];
  if (plan.create.length) bits.push(`${plan.create.length} added`);
  const back = plan.update.filter((r) => r._returning).length;
  if (back) bits.push(`${back} back on the market`);
  if (plan.update.length - back) bits.push(`${plan.update.length - back} updated`);
  if (plan.binned && plan.binned.length) bits.push(`${plan.binned.length} left in the Studio's Bin`);
  if (plan.remove.length) bits.push(`${plan.remove.length} taken off`);
  if (plan.held.length) bits.push(`${plan.held.length} kept (pinned)`);
  if (!bits.length) return `Up to date — ${plan.unchanged.length} properties, nothing changed.`;
  return bits.join(", ") + `, ${plan.unchanged.length} unchanged.`;
}

/* ─────────────────────────────────────────────────────────── writing it down */


/* The columns a synced listing owns, in the order they are bound. Anything
   not here — the SEO fields, the pinned flag, the cover choice once a human
   has made one — belongs to the website and a sync never touches it. */
const COLS = [
  ["external_id", (r) => r.externalId], ["ref", (r) => r.ref], ["status", (r) => r.status],
  ["title", (r) => r.title], ["headline", (r) => r.headline], ["type", (r) => r.type],
  ["let_type", (r) => r.letType], ["rent_pcm", (r) => r.rentPcm], ["deposit", (r) => r.deposit],
  ["bills", (r) => r.bills], ["availability", (r) => r.availability], ["available_from", (r) => r.availableFrom],
  ["council_tax_band", (r) => r.councilTaxBand], ["bedrooms", (r) => r.bedrooms],
  ["bathrooms", (r) => r.bathrooms], ["receptions", (r) => r.receptions],
  ["hmo_licensed", (r) => r.hmoLicensed], ["address_1", (r) => r.address1], ["address_2", (r) => r.address2],
  ["town", (r) => r.town], ["postcode", (r) => r.postcode], ["area", (r) => r.area],
  ["lat", (r) => r.lat], ["lng", (r) => r.lng], ["summary", (r) => r.summary],
  ["description", (r) => r.description],
  ["features_json", (r) => JSON.stringify(r.features || [])],
  ["external_json", (r) => JSON.stringify({ epcUrl: r.epcUrl, brochureUrl: r.brochureUrl, tourUrl: r.tourUrl, floorplans: r.floorplans || [], updatedAt: r.updatedAt })],
];

/* A photograph that stays on 10ninety: a media row with a synthetic key and
   the real address in source_url. See migrations/megacity/0006. */
function mediaStatements(db, row, now) {
  const out = [];
  /* the feed sent no photographs for a property that has some: keep them
     (runSync decides this; see keepPhotosWhenFeedHasNone) */
  if (row._keepPhotos) return { statements: out, coverId: null, keep: true };
  /* Replace rather than merge: the feed is the whole truth about which
     photographs a property has, and in what order. A photo Walid deleted in
     10ninety must not survive here because it was here first. */
  out.push(db.prepare(`DELETE FROM media WHERE listing_id=?1 AND key_orig LIKE '%/feed.jpg'`).bind(row.id));
  let sort = 0, coverId = null;
  for (const img of row.images || []) {
    const id = uid("m");
    if (!coverId) coverId = id;
    out.push(db.prepare(
      `INSERT INTO media (id, listing_id, kind, role, key_orig, source_url, mime, alt, sort, created_at)
       VALUES (?1, ?2, 'photo', ?3, ?4, ?5, 'image/jpeg', ?6, ?7, ?8)`)
      .bind(id, row.id, sort === 0 ? "cover" : "gallery", feedMediaKey(row.id, img.url), img.url,
            img.text || row.title || null, sort, now));
    sort += 1;
  }
  return { statements: out, coverId };
}

function upsertStatements(db, row, now, isNew) {
  const { statements: media, coverId, keep } = mediaStatements(db, row, now);
  const names = COLS.map(([n]) => n);
  const values = COLS.map(([, get]) => {
    const v = get(row);
    return v === undefined ? null : v;
  });

  const head = isNew
    ? db.prepare(
        `INSERT INTO listings (id, source, ${names.join(", ")}, cover_media_id, synced_at, created_at, updated_at, published_at)
         VALUES (?1, 'tenninety', ${names.map((_, i) => "?" + (i + 2)).join(", ")}, ?${names.length + 2}, ?${names.length + 3}, ?${names.length + 4}, ?${names.length + 5}, ?${names.length + 6})`)
        .bind(row.id, ...values, coverId, now, now, now, row.status === "live" ? now : null)
    /* An update leaves created_at, published_at and everything the website
       owns alone — including a cover a person chose, unless there was none. */
    : keep
      /* photographs kept: the cover stays exactly as it is */
      ? db.prepare(
        `UPDATE listings SET ${names.map((n, i) => n + "=?" + (i + 2)).join(", ")},
           synced_at=?${names.length + 2}, updated_at=?${names.length + 3}
         WHERE id=?1`)
        .bind(row.id, ...values, now, now)
      : db.prepare(
        `UPDATE listings SET ${names.map((n, i) => n + "=?" + (i + 2)).join(", ")},
           cover_media_id = COALESCE((SELECT id FROM media WHERE id=listings.cover_media_id AND key_orig NOT LIKE '%/feed.jpg'), ?${names.length + 2}),
           synced_at=?${names.length + 3}, updated_at=?${names.length + 4}
         WHERE id=?1`)
        .bind(row.id, ...values, coverId, now, now);

  return [head, ...media];
}

/**
 * Carry out a plan. Batched so a half-written property cannot be served:
 * D1 runs a batch in one transaction, so either a listing and its photographs
 * are both there or neither is.
 */
export async function applyPlan(db, plan, opts = {}) {
  const now = opts.now || nowIso();
  const done = { created: 0, updated: 0, removed: 0, failed: [] };
  if (!db) return { ...done, failed: [{ id: "*", why: "no database bound" }] };

  for (const [rows, isNew, count] of [[plan.create, true, "created"], [plan.update, false, "updated"]]) {
    for (const row of rows) {
      try {
        await db.batch(upsertStatements(db, row, now, isNew));
        done[count] += 1;
      } catch (e) {
        /* One bad property does not stop the other eight. */
        console.error("sync write", row.id, e && e.message);
        done.failed.push({ id: row.id, why: String((e && e.message) || e).slice(0, 160) });
      }
    }
  }

  /* Gone from the feed: withdrawn, not deleted. It leaves the website
     immediately — the public query wants status 'live' — and stays visible in
     the Studio, so a property that vanished by mistake can be seen and put
     back rather than quietly not existing. */
  for (const row of plan.remove) {
    try {
      await db.prepare(`UPDATE listings SET status='withdrawn', synced_at=?2, updated_at=?2 WHERE id=?1 AND source='tenninety'`)
        .bind(row.id, now).run();
      done.removed += 1;
    } catch (e) {
      console.error("sync withdraw", row.id, e && e.message);
      done.failed.push({ id: row.id, why: "withdraw failed" });
    }
  }
  return done;
}

/* What the site already has from the feed, in the shape planSync compares. */
export async function existingSynced(db) {
  if (!db) return [];
  const sql = `SELECT id, pinned, ${COLS.map(([n]) => n).join(", ")}
                 , deleted_at FROM listings WHERE source='tenninety'`;
  const rows = (await db.prepare(sql).all()).results || [];
  const out = rows.map((r) => ({
    id: r.id, pinned: r.pinned, deletedAt: r.deleted_at || null, ref: r.ref, status: r.status, title: r.title, headline: r.headline,
    type: r.type, letType: r.let_type, rentPcm: r.rent_pcm, deposit: r.deposit, bills: r.bills,
    availability: r.availability, availableFrom: r.available_from, councilTaxBand: r.council_tax_band,
    bedrooms: r.bedrooms, bathrooms: r.bathrooms, receptions: r.receptions, hmoLicensed: r.hmo_licensed,
    address1: r.address_1, address2: r.address_2, town: r.town, postcode: r.postcode, area: r.area,
    lat: r.lat, lng: r.lng, summary: r.summary, description: r.description,
    docSig: docSigOf({ features: parseJson(r.features_json, []), ...(parseJson(r.external_json, {}) || {}) }),
  }));

  /* one query for every listing's feed photographs, in the order they sit in,
     rather than one per listing. Reached through the feed's listings, so the
     index on media(listing_id) does the work: "LIKE '%/feed.jpg'" on its own
     read every row of the media table, and this ran every minute. */
  const media = (await db.prepare(
    `SELECT m.listing_id, m.key_orig FROM listings l JOIN media m ON m.listing_id = l.id
      WHERE l.source='tenninety' AND m.key_orig LIKE '%/feed.jpg'
      ORDER BY m.listing_id, m.sort, m.rowid`).all().catch(() => ({ results: [] }))).results || [];
  const sig = {};
  for (const m of media) sig[m.listing_id] = (sig[m.listing_id] ? sig[m.listing_id] + "," : "") + m.key_orig;
  for (const row of out) row.photoSig = sig[row.id] || "";
  return out;
}

/* fetch -> map -> plan -> apply, with the feed's failure kept separate from
   its contents. Never throws: a cron and a button both call this. */
export async function runSync(env, db, opts = {}) {
  let properties = null, feedOk = true, why = null;
  try {
    properties = await fetchProperties(env, opts);
  } catch (e) {
    feedOk = false;
    why = String((e && e.message) || e).slice(0, 200);
    console.error("10ninety feed", why);
  }

  const types = feedOk ? await fetchPropertyTypes(env, opts).catch(() => null) : null;
  const { listings, skipped } = feedOk ? toListings(properties, { propertyTypes: types, today: opts.today }) : { listings: [], skipped: [] };
  const at = opts.now || nowIso();

  /* The cron runs every minute and 10ninety's feed changes a few times a
     day. Comparing it with every listing and photograph each minute was the
     largest reader of the database (27 Sep: Cloudflare warned at 79% of the
     free plan's 5 million daily reads). So the feed is fingerprinted, with
     the date in it because "available from" becomes "available now" at
     midnight without the feed changing, and when it is the same as last
     time only the time of the read is recorded. A full comparison still
     runs at least hourly, after any failure, and whenever someone asks for
     one, so nothing can drift for long. */
  const prev = await getSetting(db, LAST_RUN_KEY, null).catch(() => null);
  const sig = feedOk ? await sha256Hex(JSON.stringify({ v: SYNC_FORMAT, p: properties, t: types, d: opts.today || at.slice(0, 10) })).catch(() => null) : null;
  const feedShape = feedOk ? imageShape(properties) : null;
  if (sig && !opts.force && prev && prev.ok && prev.sig === sig && prev.fullAt && Date.parse(at) - Date.parse(prev.fullAt) < FULL_EVERY_MS) {
    const quiet = {
      ok: true, feedOk: true, why: null, quiet: true, feedShape, photosKept: prev.photosKept || 0,
      counted: prev.counted || { feed: listings.length, existing: listings.length, skipped: skipped.length },
      created: 0, updated: 0, removed: 0, failed: [],
      summary: `Up to date — ${listings.length} properties, nothing changed.`,
      at, skipped: prev.skipped || [],
      newestUpdate: listings.map((l) => l.updatedAt).filter(Boolean).sort().pop() || null,
    };
    if (opts.record !== false) await recordRun(db, quiet, prev, { sig, fullAt: prev.fullAt }).catch((e) => console.error("sync record", e && e.message));
    return quiet;
  }

  /* the same keys mediaStatements will write, in the same order, so a
     property whose only change is a new photograph is seen as changed */
  for (const row of listings) row.photoSig = (row.images || []).map((i) => feedMediaKey(row.id, i.url)).join(",");
  for (const row of listings) row.docSig = docSigOf(row);
  const existing = await existingSynced(db).catch(() => []);
  const photosKept = feedOk ? keepPhotosWhenFeedHasNone(existing, listings) : 0;
  const plan = planSync(existing, listings, { feedOk, ...opts });
  const result = feedOk ? await applyPlan(db, plan, opts) : { created: 0, updated: 0, removed: 0, failed: [] };

  const out = {
    ok: feedOk && !result.failed.length,
    feedOk, why: why || plan.reason,
    counted: { feed: listings.length, existing: existing.filter((r) => r.status !== "withdrawn" && !r.deletedAt).length, skipped: skipped.length + ((plan.binned || []).length) },
    ...result,
    summary: feedOk ? describePlan(plan) + (photosKept ? ` Photos kept for ${photosKept} (10ninety sent none for ${photosKept === 1 ? "it" : "them"}).` : "")
                    : `Nothing changed — the feed could not be read (${why}).`,
    at, feedShape, photosKept,
    /* what 10ninety sent that is not on the website, and why */
    skipped: skipped.concat((plan.binned || []).map((r) => ({ ref: r.ref, address: [r.address1, r.town].filter(Boolean).join(", "), why: "it is in the Studio's Bin (restore it there to show it)" }))).slice(0, 20),
    /* the newest "last updated" among the properties 10ninety is sending: when
       it is older than a change Walid just made, 10ninety has not rebuilt its
       feed yet (it does that on Portal Export, and overnight) */
    newestUpdate: listings.map((l) => l.updatedAt).filter(Boolean).sort().pop() || null,
  };
  if (opts.record !== false) await recordRun(db, out, prev, { sig: feedOk ? sig : null, fullAt: at }).catch((e) => console.error("sync record", e && e.message));
  return out;
}
const FULL_EVERY_MS = 60 * 60e3;
/* part of the feed's fingerprint: a deploy that changes how the feed is read
   bumps it, so the first run after it compares everything */
const SYNC_FORMAT = 2;

/* 29 Sep, 03:04: one run found no photographs for any property and, because
   a sync replaces a listing's photographs with the feed's, the website lost
   every one. The photographs were still on 10ninety. A property the feed
   sends with none, that has photographs here, now keeps them (and its
   cover); they are only ever replaced by other photographs. Its photo
   signature is carried over so "no photos" is not itself a change. */
export function keepPhotosWhenFeedHasNone(existing, listings) {
  const had = new Map((existing || []).map((r) => [r.id, r.photoSig || ""]));
  let kept = 0;
  for (const row of listings) {
    if ((row.images || []).length) continue;
    const sig = had.get(row.id);
    if (sig) { row._keepPhotos = true; row.photoSig = sig; kept += 1; }
  }
  return kept;
}

/* The last run, kept so the Studio can say when 10ninety was last read and
   what came of it: the cron has nobody watching, and "it did not come
   across" should never again need a developer to find out why. One small
   row, overwritten every run; lastChangeAt survives quiet runs. */
export const LAST_RUN_KEY = "sync_tenninety_last";
async function recordRun(db, r, prev, fp) {
  if (!db) return;
  const changed = (r.created || 0) + (r.updated || 0) + (r.removed || 0) > 0;
  await setSetting(db, LAST_RUN_KEY, {
    at: r.at, ok: r.ok, feedOk: r.feedOk, summary: r.summary, counted: r.counted,
    created: r.created || 0, updated: r.updated || 0, removed: r.removed || 0,
    failed: (r.failed || []).slice(0, 10), skipped: r.skipped || [], newestUpdate: r.newestUpdate,
    lastChangeAt: changed ? r.at : (prev && prev.lastChangeAt) || null,
    /* the feed's fingerprint and when it was last compared in full */
    sig: (fp && fp.sig) || null, fullAt: (fp && fp.fullAt) || null,
    feedShape: r.feedShape || null, photosKept: r.photosKept || 0,
  }, null);
}
