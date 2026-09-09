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
- **Two database migrations must be applied before the new Worker goes out**:
  `migrations/megacity/0003_tours_live.sql` (`tours.live_version`) and
  `0004_media_pano2048.sql` (`media.key_pano2048`). `npx wrangler d1 migrations
  apply megacity --remote` applies both. Without them every 360 tour read and
  every media upload fails.

Local check (both hosts):

```
npx wrangler@4 d1 migrations apply megacity --local --config wrangler.dev.toml
npx wrangler@4 dev --local --config wrangler.dev.toml --port 8787
scripts/megacity-golive-check.sh http://localhost:8787 --host www.megacityproperties.co.uk
node scripts/megacity-smoke.js http://www.megacityproperties.co.uk:8787   # add "127.0.0.1 www.megacityproperties.co.uk" to /etc/hosts
node scripts/megacity-smoke.js http://localhost:8787 --demo
```

## Stage B — DNS day (Billy with Walid)

**Do this as two separate sittings, not one.** B1 moves the DNS and touches
Walid's email; the website does not change and nobody notices anything. B2
switches the website and cannot touch email at all. Keeping them apart means
that if something goes wrong you always know which change caused it, and each
one is reversible on its own. Doing both at once is how agencies lose a
client's mailbox on a Friday afternoon.

Before either sitting: **fix the Workers Builds production branch** (Cloudflare
→ Workers & Pages → billydigitals → Settings → Builds → production branch
`main`, non-production branches must not deploy to production). Until that is
set, a push to the other branch in this repository replaces the deployment —
and after go-live that would put a tree with no Megacity in it on the client's
own domain. See PROJECT-NOTES.md.

### B1 — move DNS to Cloudflare, with the old website still serving

The state of the domain before anything moved is recorded in
`docs/megacity-old-site/dns-export.txt`: 14 records, captured from public DNS.
Mail is **Microsoft 365 sold through GoDaddy** — `info@`, `lettings@` and
`management@` all depend on the MX, SPF, `autodiscover` and `_dmarc` records in
that file.

1. **Capture the old site.** `scripts/megacity-capture-old-site.sh` saves every
   old page into `docs/megacity-old-site/`. Confirm the DNS inventory is still
   current: `node scripts/megacity-dns-check.mjs` — all 14 must pass.
2. Cloudflare → *Add a site* → `megacityproperties.co.uk`, Free plan.
   Cloudflare scans and imports what it can find. **It does not reliably import
   SRV records**, so go through `dns-export.txt` line by line and add anything
   missing. Every record in that file is **DNS only (grey cloud)**.
   Leave the apex `A` on `77.68.34.162` and `www` as it is — the old site keeps
   serving throughout B1, which is the point.
3. SSL/TLS → **Full**. Do not use Flexible: the old server already does HTTPS.
4. **Prove it before you switch.** Cloudflare shows two assigned nameservers.
   Ask them directly, while the live domain is still on GoDaddy and nothing has
   changed for anyone:
   ```
   node scripts/megacity-dns-check.mjs --ns=<the first nameserver Cloudflare shows>
   ```
   Every line must say `ok`. A `STOP` line is an email record — fix it in
   Cloudflare and run it again. Do not go to step 5 until this passes.
5. Walid changes the two nameservers at GoDaddy to the ones Cloudflare shows.
   GoDaddy will warn that this affects his email; that is expected, and it is
   safe **because step 4 passed**. Wait for Cloudflare to report *Active*
   (usually minutes, occasionally a few hours).
6. `node scripts/megacity-dns-check.mjs` — public DNS now. All 14 pass.
   Then have Walid send a test email to `info@`, `lettings@` and `management@`
   and reply from each. **B1 is not finished until he has done that.**
   The website is still the old one, unchanged, on the old server.

   *If mail misbehaves:* put the two GoDaddy nameservers back
   (`ns15.domaincontrol.com`, `ns16.domaincontrol.com`). Nothing else has been
   touched.

   *One consequence to know:* GoDaddy can no longer auto-manage the Microsoft
   365 records once DNS is at Cloudflare. If Microsoft ever changes them, they
   are changed by hand in Cloudflare.

### B2 — switch the website to the new site

Email is not involved in any step below.

1. In `wrangler.toml`: uncomment the two Megacity routes **and**
   `MEGACITY_HOST` (the first hostname is the one everything redirects to).
   Both together — `node scripts/check-wrangler.mjs` fails the build if one is
   set without the other, and an active route for a zone Cloudflare does not
   hold fails the deploy for every client on this Worker.
2. In Cloudflare DNS, delete the apex `A` (`77.68.34.162`) and the `www`
   record. A Worker custom domain cannot be created over them. The site is now
   down for the minute this takes — do it when the office is quiet.
3. Commit and push to `main`. When the build finishes, Cloudflare creates the
   two custom domains and their proxied records automatically.
4. `scripts/megacity-golive-check.sh` against the live domain. Everything
   must print `ok`. (Before the nameservers change it can be run against the
   Cloudflare edge with `--resolve www.megacityproperties.co.uk:443:<ip>`.)
   Its **360 tours** section checks that `/billy360/` and `/billy360/embed.js`
   answer, that the viewer sends no `X-Frame-Options` and does send
   `Content-Security-Policy: frame-ancestors` (so the listing pages can frame
   it) and is `noindex`, that `/api/public/tours` answers, and then follows one
   live tour end to end: its JSON, its first panorama out of R2 (a `/media/`
   URL that returns an image), the pretty `/tour/<id>` link with the
   "360° tour · Megacity Properties" title, the canonical back to the listing,
   and the `data-billy360` frame on `/let/<id>`. It picks the first live tour
   from the manifest, or the one named in `MEGACITY_TOUR_CANARY`; with no live
   tour it prints a warning instead. `scripts/megacity-setup.sh verify` runs the
   same probes.
5. `node scripts/megacity-dns-check.mjs` once more. The apex and `www` lines
   will now say `MISS` — correct, they are the Worker's records — and every
   email line must still say `ok`.

   *If the site is wrong:* re-add the apex `A` `77.68.34.162` and the `www`
   `CNAME` in Cloudflare, and the old site is back within the TTL. Email is
   unaffected either way.
6. Sign in at `https://www.megacityproperties.co.uk/studio` (the login cookie
   is per host, so everyone signs in again). Settings → Integrations: enter
   the existing Google Analytics id **G-HP7S96BP9Y** and Tag Manager id
   **GTM-T67B5R3L** (both were on the old site, so the history continues).
   Settings → Redirects & 404s shows the first missing addresses within a
   day.

From this point the demo addresses on billydigitals.com redirect to the live
site.

**360 tour links copied before this day point at billydigitals.com.** They keep
working, but the canonical link is `https://www.megacityproperties.co.uk/tour/<id>`
once the domain is live. The Studio's 360 tab says so while the link is still on
the demo host; after go-live, copy each live tour's link again (360 tab → *Copy
tour link for 10ninety*) and re-paste it into the property's virtual-tour box in
10ninety. The embed on the agency's own listing pages needs nothing — it is built
from the host it is served on.

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
- **Email recipients** are already Walid's own three Microsoft 365 mailboxes:
  landlord enquiries to `info@`, tenant enquiries to `lettings@`, repairs to
  `management@` (see docs/megacity-studio.md). All three must be watched —
  nothing is copied to the agency, and with the database unbound the email is
  the only record an enquiry ever existed.
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
