# Westfield Garage — go-live

## LIVE — 14 September 2026

**https://westfieldgarageintlimited.co.uk** (and `www.`) is his site, on his
own Cloudflare account. Verified from outside: HTTP 200, `westfield.css`
byte-identical to the build, three real reviews, company number, Saturday
hours, canonical pointing at itself, no `noindex`, robots and sitemap served.

**How it went live** — not through the GitHub pipeline (no secrets yet):

1. `python3 scripts/build-westfield.py westfieldgarageintlimited.co.uk`
2. zipped the *contents* of `dist/westfield-garage/` (index.html at the zip
   root)
3. he created a Worker in **his** dashboard — it got the generated name
   **`noisy-forest-8b27`** — and uploaded the zip as its static assets
4. Worker → Settings → Domains & Routes → **Add Domain**, twice: the bare
   domain and `www`. Cloudflare wrote the DNS records and the certificate.

**To update the site now:** steps 1–2, then in his dashboard open that Worker
and upload the new zip. Or add the two secrets from Phase 3 and push to
`main`: `wrangler.toml` `[env.westfield]` now carries the name
`noisy-forest-8b27`, so the pipeline updates that same Worker in place (a
Worker cannot be renamed, so the config was changed to match it, not the
other way round).

**Still to flick in his Cloudflare:** SSL/TLS → Edge Certificates → **Always
Use HTTPS → On**. Plain `http://` currently answers 200 with the page instead
of redirecting; harmless to a visitor, untidy for Google.

**Not yet proven:** one real enquiry through the form on the live domain,
landing in westfieldgarage45@gmail.com. Web3Forms' bot wall blocks anything
that is not a browser, so it cannot be tested from a script — send one.

---

The rest of this page is the runbook as it was written, kept for the
reasoning. The demo is at `/templates/westfield-garage`, `noindex` and
disallowed in `robots.txt`, and stays as the demo.

## The domain is bought — checked 13 Sep

**`westfieldgarageintlimited.co.uk`**, in his own Cloudflare account, bought
through Cloudflare Registrar. Public DNS confirms it:

- Nameservers are `grannbo.ns.cloudflare.com` / `salvador.ns.cloudflare.com`,
  so the zone is live on Cloudflare and Phase 2 steps 1–4 are done.
- **No MX, no TXT, no A record.** There is no email on this domain and nothing
  is served on it yet, so the one genuinely risky step in Phase 2 — carrying
  his mail across before the nameservers move — does not apply. There is
  nothing to break.

It is a long name for something he has to say over the phone. Worth £10 to
also buy the short **westfieldgarage.co.uk** if it is free and redirect it at
this one: it is what a customer will actually type, and it stops somebody else
taking it. Not a blocker either way — the long name matches his registered
company name exactly, which is no bad thing on a trading site.

**The short version of what you need to buy or sign up for:**

| Thing | Needed? | Cost |
|---|---|---|
| A domain | **Bought** — westfieldgarageintlimited.co.uk | £10–15/yr |
| Cloudflare (his own account) | **Yes** — you have it | Free |
| **Web3Forms** — enquiry form delivery | **Yes** | Free |
| **Resend** | **No** | — |
| Cloudflare Email Routing — `info@` → his Gmail | Recommended | Free |
| Cloudflare Web Analytics | Recommended | Free |
| Google Workspace (real mailboxes on the domain) | Optional, later | ~£5/user/mo |
| Google Search Console | Yes, launch day | Free |
| Google Analytics | **No** — see below | — |

So: **one domain, and nothing else costs money.** Everything on this page that
is not the domain is free.

---

## Why Web3Forms and not Resend

Resend is an email-sending API. Its key has to stay server-side, which means
this site would need a Worker of its own with an `/api/enquiry` route and a
Cloudflare secret, and to send *from* his domain you have to verify the domain
in Resend with SPF and DKIM records. That is three more moving parts and two
more DNS records, on a site that otherwise needs no server at all.

Web3Forms posts straight from the browser to a hosted endpoint and the enquiry
lands in whichever inbox created the key. Its access key is public by design —
it identifies the destination inbox and grants nothing else — so it lives in
the repo, not in a secret. Nothing goes in DNS, so it cannot clash with his
email. This is what Rod's site already uses (`templates/smartin/site.js`) and
it has been reliable.

**The thing that matters about the key: whichever email address creates it is
where every enquiry lands.** Create it signed in as `westfieldgarage45@gmail.com`
(or as his new `info@` address once that exists), not as yours.

Resend is worth revisiting later if he wants branded auto-replies going out
*as* `westfieldgarageintlimited.co.uk`. It is not worth it for launch.

### Done — 13 Sep

The key is in `CONFIG.web3formsKey` and `CONFIG.endpoint` is the Web3Forms API.
The form now sends `access_key` in the body, reads `body.success` rather than
the HTTP status (Web3Forms answers a bad key with a **200** and
`success:false`), and gives up after 8 seconds. All four outcomes fall back to
the WhatsApp handoff except a confirmed delivery.

**Delivery itself is still unverified.** Web3Forms' free tier refuses
server-side calls — `403 "Use our API in client side"` — and this build
environment's browser has no route to the internet, so neither a curl nor a
headless run can prove the key works. **Send one enquiry from a real browser and
confirm it lands.** Check his spam folder: the first message from a new sender
often does, and once it is marked "not spam" it never does again.

### Why not Google Analytics

GA4 sets cookies, which means a consent banner, which means a cookie policy —
real work and a worse first impression, on a site whose job is to get somebody
to ring a phone number. **Cloudflare Web Analytics** is free, cookieless,
needs no banner, and tells you the same thing that actually matters here: how
many people landed, on what, from where. One line of script.

---

## Phase 0 — what you need from him

Nothing below Phase 1 can start without the first item.

1. ~~**A domain, bought in his name.**~~ **Done** —
   `westfieldgarageintlimited.co.uk`, on Cloudflare Registrar in his own
   account. Check **auto-renew is on**; a lapsed domain is the single most
   common way a small business loses its website.

2. ~~**His company number.**~~ **Done.** Companies House, 14 Sep: *Westfield
   Garage Int Limited*, company number **12312093**, private limited company,
   incorporated 13 November 2019, registered office **2 Broom Lane,
   Manchester, M19 2TW**. The trading-disclosure line is in the footer.

3. ~~**Opening and closing times.**~~ **Done.** Mon–Fri 9:30–6:00, Saturday
   9:30–3:00, Sunday closed, off his Google Business Profile. In the hours
   table and the JSON-LD.

4. **Facebook and Instagram URLs**, if he has them. If he genuinely has none,
   say so and the buttons come off the page rather than pointing nowhere.

5. **Is the pre-MOT check free or not?** It is badged *Pre-test* rather than
   *Free* because nobody has told us.

6. **One Google profile, or two?** A search for his name and phone number
   also turns up a Westfield Garage at a **Hazel Grove, SK7 4EL** address.
   Same phone number, so it is his. Ask him whether he has moved, whether he
   runs two sites, or whether there is a duplicate Google listing that should
   be merged — see Phase 1 item 2. Two profiles means his 45 reviews are split
   between them and both rank worse for it.

7. **Does he issue MOT certificates, or only check?** The copy is deliberately
   written as "we check what a tester checks". If he is an actual MOT test
   station that is worth saying loudly and the copy should change.

---

## Phase 1 — kill the placeholders (no domain needed, do this first)

All of this can be done today, on the demo, while the domain is being bought.
Everything here is listed in `docs/westfield-handoff.md` too.

1. ~~**Replace the three example reviews with real ones.**~~ **Done — 14 Sep,
   via Featurable.** `scripts/fetch-westfield-reviews.py` reads his widget and
   writes the page: three real reviews, his real 5.0, his real 45, and the
   write-a-review link carrying his Place ID. Run it again when he gets new
   reviews and commit the diff. `--list` shows all 38 with text and their ids;
   `--check` exits non-zero if the page has fallen behind.

   **No API key, in the end.** The documented v2 endpoint demands one; the v1
   endpoint his own embed script uses does not, and the widget is published
   with `allowedDomains: []`. So there is no secret here and nothing to
   rotate — the whole "key is a secret, so fetch at build time" argument below
   still lands on the same architecture, just for a simpler reason.

   The reviews are **committed into the page**, not fetched in the browser.
   They are in the HTML so Google reads the words rather than having to run
   somebody's JavaScript; the page makes no third-party request; and it cannot
   show an empty box on the day Featurable is slow.

   His Place ID, for anything else that needs it:
   **`ChIJxyph9VK1e0gRIYnoS26cc3s`**

2. ~~**Google Place ID → the review button.**~~ **Done** — it came with item 1.
   `CONFIG.googleReview` now opens his review box directly.

   **Take it from his own dashboard, never from a web search** — but not for
   the reason first written here. The "Westfield Garage, Hazel Grove, SK7 4EL"
   that comes back from a search is **not a different business**: it carries
   his phone number, 07949 859112. It is his, under an old or duplicated
   address.

   That is a bigger problem than a name clash would have been, and it is the
   one open question on this page that could change what the site says:

   - **If there are two Google Business Profiles**, his 45 reviews are split
     across them, each one ranks worse than a single merged profile would,
     and Featurable will only ever pull from whichever one it is connected
     to. Duplicates should be merged in Google Business Profile, not left.
   - **If he has moved** from Hazel Grove to Levenshulme, the old address is
     still sitting in directory listings. An address and phone number that
     disagree across the web is one of the few things that genuinely damages
     local search ranking, and it is cheap to fix.
   - **If he genuinely runs two sites**, the website should say so, and the
     `PostalAddress` in the JSON-LD needs to become the right one of the two
     with the second stated as well.

   Until he answers, the site carries the address on his own Business Profile
   — 2 Broom Ln, Stockport Rd, Levenshulme, M19 2TW — which is correct under
   every one of those three readings.

3. **Real photographs of his garage.** His Business Profile already has
   photos of the shopfront and the workshop. Pull them down. Every photo on
   the site is licensed stock and this is the single biggest visible upgrade
   available. Keep the same filenames in `assets/westfield/` and no markup
   changes at all: `hero`, `bay-wide`, `bay-lift`, `engine`, `tools`,
   `wheel`, `mechanic`, `hero-alt`, and the eleven `svc-*` tiles.

4. **Hours.** Correct the table in `#find`; `data-open`/`data-close` are
   minutes past midnight. Then add `openingHours` to the JSON-LD in the head,
   which is deliberately absent while the times are a guess.

5. **Company details in the footer** — registered name, number and registered
   office, once you have them.

6. **A privacy page.** The forms collect a name, phone and email, so UK GDPR
   wants a privacy notice: who holds the data, what for, how long, and how to
   ask for it back. One short page, linked from the footer and from under both
   forms. Nothing elaborate — a garage enquiry form is the simplest case there
   is.

7. **Facebook and Instagram**, or remove them.

---

## Phase 2 — the domain onto Cloudflare

**Steps 1–4 of this phase are already done** — he bought at Cloudflare
Registrar, so the domain went straight into his own account with Cloudflare's
nameservers on it, and there is no email on the zone to carry across. Left to
do here is only the optional one.

1. ~~Add the site in his Cloudflare, Free plan.~~ Done.
2. ~~Paste the nameservers into the registrar.~~ Nothing to paste — bought at
   Cloudflare Registrar.
3. ~~Carry his existing email records across first.~~ Nothing to carry: the
   zone has no MX and no TXT records at all.
4. ~~Wait for the zone to read Active.~~ Done — public DNS answers with
   Cloudflare's nameservers.
5. **Cloudflare Email Routing** (optional but cheap in effort): turn it on,
   add `info@westfieldgarage.co.uk` → forwards into his Gmail. He gets a
   professional address on business cards without paying for a mailbox. Note
   it only *receives*: replies still go out from his Gmail unless he later
   pays for Workspace, so do not promise him more than that.

---

## Phase 3 — the build and the deploy pipeline

This is the engineering, and it copies `[env.smartin]` line for line. **Do not
put his domain on the billydigitals Worker.** A push to any branch of this
repository deploys to production there (see `PROJECT-NOTES.md`), so a stray
branch push would put the wrong tree on a client's live site. His site gets
its own Worker in his own account, exactly like Rod's and Lynsey's.

**Written — 13 Sep. Only the two secrets are left.**

1. ✓ **`scripts/build-westfield.py`** — takes the domain as an argument and
   writes `dist/westfield-garage/`:
   - `templates/westfield-garage.html` → `index.html`
   - `../assets/` → `/assets/`, `vendor/lenis.min.js` → `/vendor/lenis.min.js`
   - `noindex, nofollow` **removed**, a `<link rel="canonical">` added
   - the OG image path made absolute, which it has to be to work
   - its own `robots.txt` (allow everything) and `sitemap.xml`
   - only the assets this page actually uses copied over — not the whole
     repository
   - notes marked `data-demo` stripped, and every HTML comment with them: they
     earn their place on the demo and have no business on his website
   - `--analytics <token>` injects the Cloudflare Web Analytics beacon

   **It refuses to build** while the page still carries the invented reviews
   (`data-demo-reviews` on the `.revs` block) or a social link pointing at a
   network's own home page, and prints the fix for each. A demo cannot become
   his live website by accident, and nobody reads a checklist at that moment.
   Clearing a blocker is the fix, never deleting the check.

2. ✓ **`[env.westfield]` in `wrangler.toml`**, with `name`, `routes` for the
   apex and `www`, and `[env.westfield.assets] directory = "dist/westfield-garage"`.
   Static only — no `main`, because with Web3Forms there is no server code.

3. ✓ **`.github/workflows/deploy-westfield.yml`**, copied from
   `deploy-smartin.yml`, with the same three guards that workflow learned
   the hard way:
   - the build is checked before it deploys (a deploy that publishes an empty
     directory is worse than one that fails, because nobody looks)
   - `wrangler.toml` is checked to target *his* worker, because
     `--env westfield` with a missing block does not fail: it silently falls
     back to the top-level config and uploads **the entire repository** —
     every other client's files — into his Cloudflare account
   - the live site is compared against the build byte-for-byte afterwards,
     because a 200 only proves that something is there

4. **Two GitHub secrets** — **this is the next thing to do**
   (Settings → Secrets and variables → Actions):
   - `CLOUDFLARE_API_TOKEN_WESTFIELD` — created in **his** Cloudflare, with
     **both** Account → Workers Scripts → Edit **and** Zone → Workers Routes →
     Edit on his zone. Without the zone permission the first deploy uploads
     fine and the domain keeps showing the registrar's holding page, which
     reads as a deploy that did nothing.
   - `CLOUDFLARE_ACCOUNT_ID_WESTFIELD` — on the right of any page in his
     dashboard.

   A third is optional: `CLOUDFLARE_WEB_ANALYTICS_WESTFIELD`. Set it and the
   beacon goes into the build; leave it unset and it does not.

   **Use a scoped API token, not his login.** You should not be holding a
   password for an asset that is not yours, and a token can be revoked by him
   in one click.

   With no secrets set the workflow still builds and checks on every push — it
   just does not deploy — so it is safe to merge before they exist.

5. ✓ **Web3Forms** — key in, code changed, all four outcomes verified.
   Delivery itself still has to be proved from a real browser; see above.

6. **Cloudflare Web Analytics**: add the site in his dashboard and put the
   token in `CLOUDFLARE_WEB_ANALYTICS_WESTFIELD`. The build does the rest.

---

## Phase 4 — launch day

1. Push. The workflow builds, checks, deploys, and verifies the live site is
   the build.
2. Open the real domain on a phone and on a laptop and click everything:
   call, WhatsApp, directions, both forms, the lightbox, the review buttons.
3. **Google Search Console** — add `westfieldgarageintlimited.co.uk` as a domain property, verify with the DNS
   TXT record (two minutes, since Cloudflare holds DNS now), submit
   `https://<domain>/sitemap.xml`.
4. **Put the website address on his Google Business Profile.** This is the
   single biggest local-SEO signal available and it is one field.
5. **Test the enquiry forms once more on the live domain**, not just locally.
6. Tell him to put the address on his signage, his invoices and his van.

---

## Phase 5 — after it is live

- Diary the domain renewal date. A client whose domain expires blames the web
  person, every time.
- Add `westfieldgarageintlimited.co.uk` to the Billy Digitals portfolio page.
- `/templates/westfield-garage` stays `noindex` and disallowed so the demo and
  the real site never compete in search. Do not remove the robots meta there.
- Revisit Resend only if he wants branded auto-replies.

---

## The two things to say to him before he signs off

**The DPF wording is deliberate.** Removing a diesel particulate filter from a
road car is an automatic MOT failure and it is an offence to advertise the
work — the ASA and trading standards both act on it. So the DPF & EGR tile,
the remapping tile and two FAQ answers are written around checking, cleaning
and unblocking, and around maps that leave every emissions part where the
factory put it. If he wants that changed, that is a conversation with him, not
a quiet copy edit.

**The reviews on the page now are examples and have to come out.** Say it
plainly. It is the one item on this whole list that could actually cost him
something.
