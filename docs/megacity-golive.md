# Megacity Properties — go-live on www.megacityproperties.co.uk

The new site runs from the same Worker, database and storage as the demo on
billydigitals.com. Setting `MEGACITY_HOST` switches on "root mode": the same
pages are served at root addresses on the client's domain, every old address
from the previous website redirects once, the domain gets its own robots.txt
and sitemap, and unknown addresses get a branded 404 that the Studio lists
under **Settings → Redirects & 404s**.

Why this keeps the rankings: the domain does not change, the home page and
the six addresses Google already knows (`/landlords`, `/tenants`,
`/about-us`, `/contact-us`, `/lettings`, `/privacy-policy`) keep their
addresses, and every other old address (property pages, registration forms,
the sales pages) is a permanent redirect to the right new page. Titles and
descriptions now say what the agency is and where it works ("Letting agents
Manchester & Salford", "Property management Manchester & Salford"), and every
public page carries the agency's structured data.

## Stage A — before DNS moves (done in the codebase)

- `worker/studio/urls.js` — the one place that says which page lives at which
  address, on both hosts. `templates/megacity-urls.js` is its browser copy
  (`node scripts/megacity-urls-sync.mjs --check` fails if it is stale).
- `worker/studio/host.js` — serving on the client domain: canonical host,
  tidy addresses, allow-lists, redirects, page rendering, the rewriter,
  robots/sitemap/icons, the logged 404.
- `run_worker_first = true` in `wrangler.toml` — every request reaches the
  Worker (needed for the redirects and the branded 404 on the client domain).
- New pages: `/tenant-application-form` (the site's own application form;
  the old 10ninety-hosted one went with the old site) and the 404 page.
  Tenant registration is a form on `/tenants#register`; landlord
  registration goes to the valuation page.
- Settings → Integrations gained **Google Tag Manager**; Settings gained
  **Redirects & 404s**; the listing editor gained **Old website id**.

Local check (both hosts):

```
npx wrangler@4 d1 migrations apply megacity --local --config wrangler.dev.toml
npx wrangler@4 dev --local --config wrangler.dev.toml --port 8787
scripts/megacity-golive-check.sh http://localhost:8787 --host www.megacityproperties.co.uk
node scripts/megacity-smoke.js http://www.megacityproperties.co.uk:8787   # add "127.0.0.1 www.megacityproperties.co.uk" to /etc/hosts
node scripts/megacity-smoke.js http://localhost:8787 --demo
```

## Stage B — DNS day (Billy with Walid; about an hour)

1. **Capture the old site and its DNS first.** Run
   `scripts/megacity-capture-old-site.sh` (saves every old page into
   `docs/megacity-old-site/`). Then, at the current DNS provider, write down
   every record — MX, SPF (TXT), DKIM, DMARC, `mail`, `webmail`,
   `autodiscover`, anything else — into `docs/megacity-old-site/dns-export.txt`.
   **If the MX record is lost, info@megacityproperties.co.uk stops receiving
   email.**
2. In Cloudflare → *Add a site* → `megacityproperties.co.uk` (Free plan is
   fine). Check the imported records against the export and add any that are
   missing (grey cloud for `mail`/`webmail`). **Delete the imported `A`
   record for the apex and the `www` record that point at the old server
   (77.68.34.162)** — a Worker custom domain cannot be created over them.
   SSL/TLS → Full. Edge Certificates → *Always Use HTTPS* on.
3. Walid changes the two nameservers at his registrar to the ones Cloudflare
   shows. Wait until Cloudflare reports the zone as *Active*.
4. In `wrangler.toml`: uncomment the two Megacity routes and set
   `MEGACITY_HOST = "www.megacityproperties.co.uk,megacityproperties.co.uk"`
   (the first hostname is the one everything redirects to). Run
   `node scripts/check-wrangler.mjs`, commit, push to `main`.
5. `scripts/megacity-golive-check.sh` against the live domain. Everything
   must print `ok`. (Before the nameservers change it can be run against the
   Cloudflare edge with `--resolve www.megacityproperties.co.uk:443:<ip>`.)
6. Sign in at `https://www.megacityproperties.co.uk/studio` (the login cookie
   is per host, so everyone signs in again). Settings → Integrations: enter
   the existing Google Analytics id **G-HP7S96BP9Y** and Tag Manager id
   **GTM-T67B5R3L** (both were on the old site, so the history continues).
   Settings → Redirects & 404s shows the first missing addresses within a
   day.

From this point the demo addresses on billydigitals.com redirect to the live
site.

## Stage C — after launch

- **Search Console.** Sign in to search.google.com/search-console with the
  Google account that owns the Analytics property. Add a *Domain* property
  for `megacityproperties.co.uk`; verify it with the TXT record it gives you
  (Billy adds it in Cloudflare DNS). Add Billy as an owner. Submit
  `https://www.megacityproperties.co.uk/sitemap.xml`. If a Search Console
  property already exists, add Billy to it instead. (The HTML-tag method also
  works: paste the `content` value into Settings → Integrations.)
- **URL inspection**: request indexing for `/`, `/landlords`, `/lettings`,
  `/fully-managed`, `/tenants`.
- **Weekly for six weeks**: Search Console → Pages (redirect errors, not
  found) and Studio → Redirects & 404s. Add a redirect for anything with real
  visitors behind it.
- **Email sender**: add `megacityproperties.co.uk` in Resend, publish its
  DKIM records and merge its SPF include into the ONE existing `v=spf1`
  record (never add a second one), then change `MEGACITY_FROM` in
  `worker.js` and `STUDIO_FROM` in `worker/studio/email.js` to an
  `@megacityproperties.co.uk` address.
- Zoopla, Facebook and LinkedIn all link to the home page, which has not
  changed. Nothing to update there.
- Expect a few weeks of small movement in rankings, as with any redesign on
  the same domain. The old Zoopla valuation widget is not carried over; the
  site's own valuation form replaces it.

## What redirects where

| Old address | Now |
|---|---|
| `/lettings/`, `/landlords/`, `/tenants/`, `/about-us/`, `/contact-us/`, `/privacy-policy/` | same address, without the trailing slash |
| `/properties`, `/buyers/…`, `/commercial/lettings/` | `/lettings` |
| `/free-valuation/…`, `/sales/…`, `/vendors/…`, `/commercial/sales/`, `/register/commercial/` | `/valuation` |
| `/blog/…` | `/journal` |
| `/testimonials/` | `/about-us` |
| `/register/`, `/tenants/register/` | `/tenants#register` |
| `/landlords/register/` | `/landlords#register` |
| `/property/<id>/…` | `/let/<slug>` for a known listing (by "Old website id" or the 10ninety id), otherwise `/lettings` |
| old files (`/images/…`, `*.asp`) | 404, listed in the Studio as old-site files |
| `/templates/megacity-<page>` on either host | the root address |

Anything else can be added in Settings → Redirects & 404s without a deploy.
