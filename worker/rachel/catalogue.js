/* Roses by Rachel — the shop, read from Stripe.
 *
 * The collection used to be a list written into shared.js, which meant every
 * new bouquet was a job for me. Rachel adds a product in Stripe now — name,
 * price, photograph, description — and it is on the website within five
 * minutes. Take one off sale in Stripe and it comes off the site.
 *
 * Read-only, and it never touches a customer. The key lives in Cloudflare, so
 * it cannot appear in the page source; the browser only ever sees the handful
 * of fields below.
 *
 * If the key is missing, or Stripe is slow, or she has not put anything in the
 * catalogue yet, this answers with an empty list and the page keeps the
 * collection it already has. The shop must never go blank because an API had a
 * bad morning.
 */

const STRIPE = "https://api.stripe.com/v1";
const TTL = 300;                       /* five minutes at the edge */

const clean = (v, max = 400) => String(v ?? "").trim().slice(0, max);

/* Categories drive the filter buttons on the shop page. Rachel types them into
   the product's metadata in Stripe as "roses, bouquets". Anything she invents
   that the site has no filter for is harmless — it simply never matches. */
const CATS = ["roses", "bouquets", "wedding", "gifts"];

function categories(meta) {
  const raw = clean(meta && (meta.category || meta.categories), 120).toLowerCase();
  const out = raw.split(/[,\s|]+/).filter((c) => CATS.indexOf(c) !== -1);
  /* Everything has to live under at least one filter or it is invisible on
     every page except the full collection. */
  return out.length ? out : ["bouquets"];
}

/* Stripe hosts product images itself, on a URL that is already public the
   moment she uploads one. Anything else is somebody else's server and does not
   belong in an <img> on her site. */
function imageUrl(p) {
  const src = (p.images && p.images[0]) || "";
  return /^https:\/\/files\.stripe\.com\//.test(src) ? src : "";
}

function priceOf(p) {
  const dp = p.default_price;
  if (!dp || typeof dp !== "object") return null;
  if (dp.currency && dp.currency !== "gbp") return null;
  if (typeof dp.unit_amount !== "number") return null;   /* "customer chooses" */
  return dp;
}

function mapProduct(p) {
  const dp = priceOf(p);
  if (!dp) return null;

  const meta = p.metadata || {};
  const name = clean(p.name, 80);
  if (!name) return null;

  const out = {
    id: clean(p.id, 60),
    n: name,
    p: dp.unit_amount / 100,
    d: clean(p.description, 400),
    imgUrl: imageUrl(p),
    alt: clean(meta.alt, 200) || name,
    cat: categories(meta),
    order: Number(meta.order) || 0,
  };
  if (dp.recurring) {
    out.interval = clean(dp.recurring.interval, 20);   /* month, year */
    out.badge = clean(meta.badge, 40);                 /* "Most Popular" */
  }
  return out;
}

/* A product with no photograph would render as a broken frame in a grid where
   every other tile has one, which looks worse than not listing it. She will
   see it missing and add the picture. */
const sellable = (x) => x && x.imgUrl;

function byOrder(a, b) {
  return (a.order - b.order) || a.n.localeCompare(b.n);
}

async function fromStripe(key) {
  const url = STRIPE + "/products?active=true&limit=100&expand[]=data.default_price";
  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${key}`,
      "stripe-version": "2024-06-20",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    /* A key without "Products: read" is the likeliest failure by a mile, and
       it is worth saying so out loud rather than logging a bare 403. */
    const why = res.status === 401 || res.status === 403
      ? "the Stripe key cannot read products"
      : "Stripe answered " + res.status;
    return { error: why, detail: detail.slice(0, 300) };
  }

  const body = await res.json();
  const all = (body.data || []).map(mapProduct).filter(sellable);

  return {
    products: all.filter((x) => !x.interval).sort(byOrder),
    plans: all.filter((x) => x.interval).sort(byOrder),
  };
}

export async function catalogue(request, env) {
  const key = clean(env.RBR_STRIPE_KEY, 200);

  /* No key yet: say so plainly and let the page keep its own list. This is a
     200 on purpose — nothing is wrong from the visitor's side. */
  if (!key) {
    return json({ ok: true, source: "builtin", products: [], plans: [] }, 60);
  }

  const cache = caches.default;
  const cacheKey = new Request(new URL("/api/rbr/catalogue", request.url).toString(),
    { method: "GET" });

  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let out;
  try {
    out = await fromStripe(key);
  } catch (e) {
    out = { error: "Stripe did not answer in time" };
  }

  if (out.error) {
    /* Short cache so a fixed key takes effect quickly, and the page falls back
       to the collection it shipped with. */
    return json({ ok: false, source: "builtin", error: out.error, products: [], plans: [] }, 30);
  }

  const res = json({
    ok: true,
    source: "stripe",
    products: out.products,
    plans: out.plans,
  }, TTL);

  /* waitUntil is not available here, and the put is quick. */
  await cache.put(cacheKey, res.clone());
  return res;
}

function json(body, maxAge) {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=60, s-maxage=${maxAge}`,
    },
  });
}
