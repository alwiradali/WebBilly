/* Lunera Ora — live free times for the booking calendar on /lunera-ora/.
 *
 *   GET /api/lunera/availability?variation=<service variation id>&from=YYYY-MM-DD&days=31
 *   → { live: true, tz: "America/Edmonton", slots: ["2026-10-03T15:00:00Z", …] }
 *
 * The calendar on her page asks here, and this asks Square's official Bookings
 * API (SearchAvailability) with her access token, so the page shows the same
 * free times her Square booking page does. The token lives only in Cloudflare
 * (Worker secret LUNERA_SQUARE_TOKEN): it can read her whole Square account,
 * so it must never reach the page. Without it this answers 503 and the page
 * falls back to her published hours and hands the chosen day to Square.
 *
 * Why not read the free times the way her Square booking page does: that
 * endpoint (app.squareup.com/appointments/api/buyer/availability) only answers
 * requests whose Origin is Square's own booking site. Sending that header from
 * here would be getting round Square's check, not using an API — so we don't.
 *
 * Only her own services can be asked about (VARIATIONS), so the endpoint
 * cannot be used to spend her token on anything else, and answers are cached
 * at the edge for a minute so a busy page does not hammer Square.
 */

const SQUARE = "https://connect.squareup.com/v2/bookings/availability/search";
const SQUARE_VERSION = "2026-09-16";
const LOCATION = "L8EH27QVVN1GN";
const TZ = "America/Edmonton";
const CACHE_SECONDS = 60;

// Her bookable service variations (from her Square booking page).
const VARIATIONS = new Set([
  "TF2UNCPOH3I4OZFO7HKX3NY7", // The Aura
  "KH6OBDR37HWXJ7QKQ6K6LWW3", // The Radiance
  "D6QW4UIBB5OJXPSEAMCCZYFV", // The Lumina
  "B2PUH46HJKJI7QHS7RTG2Z2D", // Launch promo — The Aura
  "TCSCFBWSGXDH6SXEKYURNH2C", // Launch promo — The Radiance
  "EFNBDZQST6J2WJOL5U7STXPY", // Launch promo — The Lumina
  "AIEJXQEJUKTEUSZRXENUEOTV", // Bride / Bridesmaids
]);

function json(body, status = 200, maxAge = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": maxAge ? `public, max-age=${maxAge}` : "no-store",
    },
  });
}

export function isLuneraPath(p) {
  return p === "/api/lunera/availability";
}

/* Minutes east of UTC for Edmonton at a given instant (−360 in summer, −420
   in winter). Intl knows the rules, so daylight saving needs no table. */
function offsetMinutes(at) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+v.year, +v.month - 1, +v.day, +v.hour % 24, +v.minute, +v.second);
  return Math.round((asUtc - at.getTime()) / 60000);
}

/* Midnight at the start of an Edmonton calendar day, as an instant. */
export function startOfDay(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d);
  // Guess with noon's offset, then re-check at the guess itself: on the day the
  // clocks change, midnight and noon are on different offsets.
  let at = new Date(wall - offsetMinutes(new Date(wall + 12 * 3600000)) * 60000);
  at = new Date(wall - offsetMinutes(at) * 60000);
  return at;
}

export async function handleLunera(request, env, ctx, { fetchImpl = fetch, now = () => new Date() } = {}) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const url = new URL(request.url);

  const variation = String(url.searchParams.get("variation") || "");
  if (!VARIATIONS.has(variation)) return json({ live: false, error: "Unknown service" }, 400);

  const from = String(url.searchParams.get("from") || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) return json({ live: false, error: "from must be YYYY-MM-DD" }, 400);
  const days = Math.min(31, Math.max(1, parseInt(url.searchParams.get("days") || "31", 10) || 31));

  const token = String(env.LUNERA_SQUARE_TOKEN || "").trim();
  if (!token) return json({ live: false, reason: "not-connected" }, 503);

  // Square wants a window between 24 hours and 32 days, starting no earlier than now.
  const nowAt = now();
  let start = startOfDay(from);
  if (start < nowAt) start = new Date(Math.ceil(nowAt.getTime() / 60000) * 60000);
  let end = new Date(startOfDay(from).getTime() + days * 86400000);
  if (end - start < 86400000) end = new Date(start.getTime() + 86400000);
  if (end - start > 32 * 86400000) end = new Date(start.getTime() + 32 * 86400000);

  const cache = typeof caches !== "undefined" ? caches.default : null;
  const key = new Request(`https://lunera-availability.cache/${variation}/${from}/${days}`);
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }

  let res;
  try {
    res = await fetchImpl(SQUARE, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Square-Version": SQUARE_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: {
          filter: {
            start_at_range: { start_at: start.toISOString(), end_at: end.toISOString() },
            location_id: LOCATION,
            segment_filters: [{ service_variation_id: variation }],
          },
        },
      }),
    });
  } catch {
    return json({ live: false, reason: "square-unreachable" }, 502);
  }
  if (!res.ok) return json({ live: false, reason: "square-error", status: res.status }, 502);

  const data = await res.json().catch(() => ({}));
  const slots = (data.availabilities || [])
    .map((a) => a && a.start_at)
    .filter((s) => typeof s === "string" && !Number.isNaN(Date.parse(s)))
    .map((s) => new Date(s).toISOString().replace(".000Z", "Z"))
    .sort();

  const out = json({ live: true, tz: TZ, from, days, slots }, 200, CACHE_SECONDS);
  if (cache && ctx && ctx.waitUntil) ctx.waitUntil(cache.put(key, out.clone()));
  return out;
}
