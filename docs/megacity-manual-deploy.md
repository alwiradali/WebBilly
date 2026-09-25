# Deploying Megacity Properties by hand

One sitting, start to finish, in **Walid's own Cloudflare account**. Every
command is meant to be pasted as written. After each step there is a check —
do not carry on past a check that fails, because the failures in this process
look like success.

The website does not change until **step 9**. Everything before it is
invisible to the public, which is deliberate: it means the whole thing can be
built and verified while his current site carries on serving.

---

## Before you start

| you need | where it comes from |
|---|---|
| A terminal with Node 22+ | `node -v` — wrangler refuses to run below 22 |
| This repository, up to date | `git pull` |
| Walid signed in to Cloudflare | his account, not the agency's |
| His payment card on the account | R2 needs one even on the free tier |
| The Resend API key | **his own account**, not the agency's |

Walid's password is not on this list and never will be. `wrangler login` opens
a browser and he signs in himself.

---

## 0. Make sure you are in HIS account

The single most expensive mistake available here is doing all of this in the
agency's account by accident. It succeeds, it looks right, and the domain
never works because a Worker can only take a custom domain for a zone in the
**same** account.

```
npx wrangler login
npx wrangler whoami
```

**Check:** the account name printed is **Walid's**, not Billy Digitals. If two
accounts are listed, note the right Account ID — you will need it again in
step 6 and can pass `CLOUDFLARE_ACCOUNT_ID=<id>` before any command below.

---

## 1. The bucket

Done on 21 September with his card. If you are repeating this on a fresh
account:

```
npx wrangler r2 bucket create megacity-media
```

**Check:**

```
npx wrangler r2 bucket list
```

`megacity-media` appears. The name is not a free choice — `wrangler.toml`
refers to it by name.

---

## 2. The database

```
npx wrangler d1 create megacity
```

It prints a block ending in a **`database_id`**. Copy it. It is a UUID, like
`8f3c1a20-...`. If you lose it:

```
npx wrangler d1 list
```

---

## 3. Put the database id in the config

Open `wrangler.toml`, find `[env.megacity]` at the bottom, and **uncomment the
two binding blocks**, pasting the real id:

```toml
[[env.megacity.d1_databases]]
binding = "MEGACITY_DB"
database_name = "megacity"
database_id = "the-uuid-from-step-2"

[[env.megacity.r2_buckets]]
binding = "MEDIA"
bucket_name = "megacity-media"
```

Leave the `routes = [...]` block commented for now. That is step 9.

**Check:**

```
node scripts/check-wrangler.mjs
```

It must print `check-wrangler: ok`. It refuses while the placeholder is there,
and refuses if one binding is uncommented without the other — a Worker with
storage and no database serves a site whose listings and inbox are simply
absent, which reads as a broken website rather than a missing binding.

It will also print a note that the routes are still commented. That note is
correct at this stage.

---

## 4. Build his files, and only his

```
node scripts/build-megacity.mjs
```

**Check:** it prints roughly

```
Wrote dist/megacity — 390 files, 46.2 MB.
```

and ends with the line about the allow-list. If it refuses to build, read what
it says — it refuses when another client's name appears in a path, or when a
file the site cannot work without is missing. Both are worth stopping for.

---

## 5. Create the tables

```
npx wrangler d1 migrations apply megacity --remote --env megacity
```

**Check:** **all five** migrations apply — `0001_init`, `0002_legacy`,
`0003_tours_live`, `0004_media_pano2048`, `0005_listings_pinned`. Without
`0003` and `0004` every 360 tour read and every media upload fails, and it
fails at the moment someone tries to use it rather than now.

Confirm the tables exist:

```
npx wrangler d1 execute megacity --remote --env megacity --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

---

## 6. His secrets, on the Worker

Each command prompts for the value and stores it in Cloudflare. The value is
never typed into this repository, into a chat window, or into anything that
keeps a transcript. That is the entire point of doing it this way.

```
npx wrangler secret put RESEND_API_KEY --env megacity
npx wrangler secret put OFFICE_SETUP_TOKEN --env megacity
```

`OFFICE_SETUP_TOKEN` is one you invent — a long random string. It is what lets
the first Studio account be created, once.

The 10ninety key can go in at the same time, though nothing reads it yet:

```
npx wrangler secret put TENNINETY_API_KEY --env megacity
```

**Check:**

```
npx wrangler secret list --env megacity
```

Names appear, values never do.

---

## 7. Deploy

```
npx wrangler deploy --env megacity
```

**Check:** the output contains **`Uploaded megacity-properties`**.

Judge it on that line, not on the exit code. Wrangler can exit non-zero having
uploaded perfectly well, when the token cannot re-assert routes. At this stage
there are no routes, so that does not arise — but it will at step 9.

The Worker now exists in his account with the site inside it, and **his domain
is still serving the old site**. Nothing public has changed.

---

## 8. Check it before anyone else sees it

The Worker has a `workers.dev` address. Find it in the dashboard under
Workers & Pages → `megacity-properties`, or enable it there if it is off.

Open it and check, in this order:

1. The homepage loads, with the hero photograph
2. **No fee prices on the homepage** — they belong on the landlords page only
3. A property page opens from the grid
4. The tenants page names **Canopy**
5. `/studio` loads and asks for a login
6. A made-up address returns the branded 404, not a Cloudflare error

If 5 gives a Cloudflare **1101** rather than a login screen, the bindings are
wrong — go back to step 3.

---

## 8b. Resend — and why it comes AFTER the nameservers

Resend verifies a sending domain by reading DNS. Its three records
(`resend._domainkey` TXT and the `rsend` / `send` CNAMEs) are already in his
Cloudflare zone, and a record in a zone that is not authoritative is not a
record anyone can see. Until the nameservers move, GoDaddy is still answering
for megacityproperties.co.uk and GoDaddy does not have them, so verification
cannot succeed however many times it is pressed.

After the move it is quick, because the records are already there:

1. Add **megacityproperties.co.uk** as a domain in **his** Resend account.
2. It should verify within a minute or two. If it does not, the zone has not
   finished going Active — wait, do not re-add the records.
3. Create an API key there, and set two things on the Worker:

```
npx wrangler secret put RESEND_API_KEY --env megacity
```

and, as a plain variable (not a secret — it is an address, not a credential):

```
MAIL_FROM = Megacity Properties <website@megacityproperties.co.uk>
```

`MAIL_FROM` is why this is a setting and not a deploy: until it is set, mail
goes out on the agency's verified domain, and the moment it is set it goes out
on his. Nothing else changes.

**Do this before step 9, not after.** Step 9 puts the public site on his
domain, and a live site whose enquiry forms reach nobody is worse than a site
that is not live yet. Enquiries are still saved to the database and still
posted into 10ninety without it — but nothing lands in an inbox.

---

## 9. The moment the website changes

Only once his nameservers have moved, the zone reads **Active** in his
account, and mail has been tested. Check that first — the dashboard says so on
the zone's overview.

Uncomment the two routes in `[env.megacity]`:

```toml
routes = [
  { pattern = "megacityproperties.co.uk", custom_domain = true },
  { pattern = "www.megacityproperties.co.uk", custom_domain = true }
]
```

Then:

```
node scripts/check-wrangler.mjs
npx wrangler deploy --env megacity
```

**Check, from a browser that has never seen the site:**

```
curl -sI https://www.megacityproperties.co.uk/ | head -3
curl -s  https://www.megacityproperties.co.uk/version.json
```

If wrangler says it uploaded but the domain still shows the old site, the API
token is missing **Zone → Workers Routes** on `megacityproperties.co.uk`. That
combination — a successful upload and an unchanged website — is the one that
reads as "the deploy did nothing".

---

## 10. Email, immediately after

The nameserver move is the part that can break something Walid notices within
minutes, and it is not the website.

Send and reply, both directions, on all three:

- `info@megacityproperties.co.uk`
- `lettings@megacityproperties.co.uk`
- `management@megacityproperties.co.uk`

All 30 DNS records were copied and reconciled against GoDaddy's own export
before the move, so this should be uneventful. Do it anyway — an agency that
cannot receive a viewing enquiry has a worse day than one whose website is a
few hours late.

---

## If something is wrong

**Fix forward. Do not revert the nameservers.**

Moving delegation back is slow in both directions and leaves two sets of
answers in circulation while it settles. Correcting the record in Cloudflare
lands within one record TTL. There is a short-TTL copy of the zone in
`docs/megacity-old-site/` for exactly this.

To take the website back off his domain without touching DNS at all: comment
the two routes out again and redeploy. That is a one-minute change, and his
domain goes back to whatever the DNS records point at.

---

## Doing it from GitHub instead

Everything above can be done by hand, and the first time is worth doing by
hand. But the two repository secrets are now set, so a push to `main` that
touches his files does the same work with nobody watching:

1. builds `dist/megacity` from the allow-list
2. refuses to continue if another client's file is in it
3. runs `check-wrangler.mjs`
4. **applies the migrations** to his database
5. deploys
6. and, once the routes are uncommented, checks that his domain is actually
   serving that build

The migrations run **before** the deploy, because the Worker begins serving
the moment it is uploaded and one whose tables do not exist answers every
listing and every enquiry with an error. They are safe to repeat: D1 records
what it has applied and skips it.

What the workflow deliberately does not do is set the Worker's secrets. Those
go in once, either with `wrangler secret put` as in step 6 or from the
dashboard — Workers & Pages → `megacity-properties` → Settings → Variables
and Secrets → Add — and putting their values into GitHub as well would be a
second place for them to leak from.

## What is deliberately not automated

`.github/workflows/deploy-megacity.yml` can do steps 4 and 7 on a push to
`main`, given two repository secrets holding a scoped API token and his
account ID.

It is worth setting up eventually and it is not worth setting up first. The
first deploy into a client's own account is the one where a wrong account, a
missing binding or an over-broad token does real damage, and it should be done
by someone watching each check go green.
