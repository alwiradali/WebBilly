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

import { toListings, fetchProperties, fetchPropertyTypes, feedMediaKey } from "./tenninety.js";
import { uid, nowIso } from "./db.js";

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
  return out;
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

  const have = new Map((existing || []).map((r) => [r.id, r]));
  const want = new Map((incoming || []).map((r) => [r.id, r]));

  for (const [id, row] of want) {
    const prev = have.get(id);
    if (!prev) { plan.create.push(row); continue; }
    const fields = changedFields(prev, row);
    if (fields.length) plan.update.push({ ...row, _changed: fields });
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
  if (plan.update.length) bits.push(`${plan.update.length} updated`);
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
  ["external_json", (r) => JSON.stringify({ epcUrl: r.epcUrl, brochureUrl: r.brochureUrl, tourUrl: r.tourUrl, updatedAt: r.updatedAt })],
];

/* A photograph that stays on 10ninety: a media row with a synthetic key and
   the real address in source_url. See migrations/megacity/0006. */
function mediaStatements(db, row, now) {
  const out = [];
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
  const { statements: media, coverId } = mediaStatements(db, row, now);
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
  const sql = `SELECT id, pinned, ${COLS.map(([n]) => n).filter((n) => n !== "features_json" && n !== "external_json").join(", ")}
                 FROM listings WHERE source='tenninety' AND deleted_at IS NULL AND status != 'withdrawn'`;
  const rows = (await db.prepare(sql).all()).results || [];
  return rows.map((r) => ({
    id: r.id, pinned: r.pinned, ref: r.ref, status: r.status, title: r.title, headline: r.headline,
    type: r.type, letType: r.let_type, rentPcm: r.rent_pcm, deposit: r.deposit, bills: r.bills,
    availability: r.availability, availableFrom: r.available_from, councilTaxBand: r.council_tax_band,
    bedrooms: r.bedrooms, bathrooms: r.bathrooms, receptions: r.receptions, hmoLicensed: r.hmo_licensed,
    address1: r.address_1, address2: r.address_2, town: r.town, postcode: r.postcode, area: r.area,
    lat: r.lat, lng: r.lng, summary: r.summary, description: r.description,
  }));
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
  const existing = await existingSynced(db).catch(() => []);
  const plan = planSync(existing, listings, { feedOk, ...opts });
  const result = feedOk ? await applyPlan(db, plan, opts) : { created: 0, updated: 0, removed: 0, failed: [] };

  return {
    ok: feedOk && !result.failed.length,
    feedOk, why: why || plan.reason,
    counted: { feed: listings.length, existing: existing.length, skipped: skipped.length },
    ...result,
    summary: feedOk ? describePlan(plan) : `Nothing changed — the feed could not be read (${why}).`,
    at: opts.now || nowIso(),
  };
}
