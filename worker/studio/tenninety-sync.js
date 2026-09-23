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
