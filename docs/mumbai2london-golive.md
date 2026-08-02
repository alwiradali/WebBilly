# Mumbai2London — moving it to the client's own domain

The site is built to run on **Himansu's own domain**, not on billydigitals.com.
Nothing is hard-coded: one variable switches it over.

Until `M2L_HOST` is set, everything behaves exactly as it does today — the demo
stays at `billydigitals.com/templates/mumbai2london`, hidden from Google.

## What his domain serves

| URL | Page |
|---|---|
| `/` | The Mumbai2London site — **indexable**, with a canonical tag |
| `/admin` | Back office (enquiry inbox + booking diary), noindex |
| `/invoice` | Invoice builder, noindex |
| `/sign` | Customer signing page, noindex |
| `/assets/…` | Images, video, fonts |
| anything else | 404 — none of the Billy Digitals site leaks onto his domain |

Every link follows automatically: the "Create invoice" button in the back
office, the "Open the back office" button in his enquiry emails, and the
signing link in the invoice emails all switch to his domain.

## The domain is on GoDaddy — two ways to do it

### Option A — move DNS to Cloudflare (recommended)

The booking calendar, the enquiry inbox, the automatic emails and the invoice
signing are all Cloudflare Worker code. GoDaddy's own hosting cannot run them.
Pointing the domain at Cloudflare keeps everything working and costs nothing.

He keeps the domain at GoDaddy — only the nameservers change.

1. **Cloudflare** → Add a site → type his domain → Free plan.
   Cloudflare scans his current DNS. Check the list it imports: if he has
   **email on that domain** (GoDaddy/Microsoft 365 mailboxes), make sure the
   `MX`, `SPF/TXT` and `autodiscover` records came across. Getting this wrong
   is the one way to break something that already works.
2. Cloudflare gives two nameservers, e.g. `xxx.ns.cloudflare.com`.
3. **GoDaddy** → My Products → the domain → **DNS** → Nameservers → Change →
   "I'll use my own nameservers" → paste both → Save.
4. Wait for Cloudflare to say **Active** (usually under an hour, up to 24).
5. In `wrangler.toml`, uncomment the two client routes and put the real
   hostname in, then set the variable:
   ```toml
   routes = [
     { pattern = "billydigitals.com", custom_domain = true },
     { pattern = "www.billydigitals.com", custom_domain = true },
     { pattern = "HISDOMAIN", custom_domain = true },
     { pattern = "www.HISDOMAIN", custom_domain = true }
   ]

   [vars]
   M2L_HOST = "HISDOMAIN,www.HISDOMAIN"
   ```
6. `npx wrangler deploy`. HTTPS is issued automatically.

### Option B — leave DNS at GoDaddy

Only works if he will not move nameservers. Point the domain at Cloudflare with
a `CNAME`, which needs Cloudflare for SaaS / a custom hostname — more setup, and
the root domain (`hisdomain.co.uk` with no `www`) cannot be CNAMEd at GoDaddy.
Not worth it. Use Option A.

**Do not** upload the HTML to GoDaddy's own hosting. The pages would load, but
the booking calendar, the enquiry inbox, the automatic emails and the invoice
signing would all stop — they are server code, not static files.

## Also needed before go-live

These are the Cloudflare one-offs that have to be run from Billy's account:

```bash
npx wrangler d1 create m2l                       # paste the id into wrangler.toml
npx wrangler d1 execute m2l --remote --file=./migrations/0001_m2l.sql
npx wrangler secret put M2L_ADMIN_TOKEN          # the back-office password
npx wrangler secret put INVOICE_SECRET           # signs the invoice links
```

And in **Resend**: verify his domain so the automatic emails come **from**
his address rather than hello@billydigitals.com — otherwise customers get
booking confirmations from a web agency they've never heard of.

## Notes

- `run_worker_first` in `wrangler.toml` lists `/`, `/admin`, `/invoice` and
  `/sign`. Those paths must reach the Worker before Cloudflare's static-asset
  router, or his domain would serve the Billy Digitals homepage at `/`. If a
  wrangler version rejects the array form, set `run_worker_first = true`.
- The noindex tag stays in the HTML files. The Worker strips it only on his
  domain, so the demo copy on billydigitals.com stays out of Google.
- Adding a second client site later is the same pattern: another host variable
  and another entry in the page map at the top of `worker.js`.
