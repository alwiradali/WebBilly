# Putting the site in Walid's own Cloudflare account

Everything the site needs — the Worker, the database, the storage, the secrets
— goes in **his** account, not the agency's. He owns the domain, the site, the
listings and the photographs, and can hand them to someone else one day without
asking anybody.

It is also not optional. A Worker custom domain can only be created for a zone
in the same account as the Worker, and `megacityproperties.co.uk` is in his.

## What is already done

- `scripts/build-megacity.mjs` builds **`dist/megacity`** — his files and no
  one else's, from an allow-list, refusing to build if another client's name
  appears in a path or if anything `.assetsignore` marks as never-served has
  crept in.
- **`[env.megacity]`** in `wrangler.toml` points the deploy at that directory.
- **`.github/workflows/deploy-megacity.yml`** builds, checks and deploys on a
  push to `main` that touches his files.
- `scripts/check-wrangler.mjs` reads the config **per environment** and refuses
  to deploy a half-wired one.
- `dist` is in `.assetsignore`, so the agency's own deploy does not carry a
  copy of his 46 MB of photographs.

None of it is live: the routes are commented out, and no credentials exist yet.

## What to do in his account

**1. R2 → Enable.** Free for the first 10 GB, but Cloudflare wants a payment
card on the account even so. It is **his** card — ask before you get here, not
while he is watching.

**2. Create the bucket and the database.** Either in the dashboard:

- R2 → Create bucket → **`megacity-media`**
- Storage & Databases → D1 → Create → **`megacity`**, region Western Europe.
  Copy the **Database ID** it shows.

or from a terminal signed in to his account (`npx wrangler login`, then check
`npx wrangler whoami` says his account before anything else):

```
npx wrangler r2 bucket create megacity-media
npx wrangler d1 create megacity
```

The names are not free choices — `wrangler.toml` refers to them by name.

**3. Make a scoped API token.** My Profile → API Tokens → Create Token →
Custom. Give it exactly:

| Scope | Permission |
|---|---|
| Account → Workers Scripts | Edit |
| Account → D1 | Edit |
| Account → Workers R2 Storage | Edit |
| Zone → Workers Routes | Edit, on `megacityproperties.co.uk` only |

Nothing else. The zone permission is what lets wrangler bind his domain later;
without it the upload succeeds, the domain keeps serving the old site, and it
reads as a deploy that did nothing.

**4. His account ID** — on the right of any page in his dashboard.

## What to do back here

**5. Two repository secrets** (Settings → Secrets and variables → Actions):

- `CLOUDFLARE_API_TOKEN_MEGACITY`
- `CLOUDFLARE_ACCOUNT_ID_MEGACITY`

**6. Uncomment the two binding blocks** at the bottom of `wrangler.toml` and
paste the real `database_id`. `check-wrangler.mjs` fails the build while the
placeholder is there, and fails it if one binding is uncommented without the
other — a Worker with storage and no database serves a site whose listings and
inbox are simply absent, which looks like the site is broken rather than like a
binding is missing.

**7. Apply the migrations to his database:**

```
npx wrangler d1 migrations apply megacity --remote --env megacity
```

All five. Without `0003_tours_live` and `0004_media_pano2048` every 360 tour
read and every media upload fails.

**8. Set his secrets on the Worker**, not in the repository:

```
npx wrangler secret put RESEND_API_KEY --env megacity
npx wrangler secret put OFFICE_SETUP_TOKEN --env megacity
```

Each one prompts for the value and stores it in Cloudflare. The value is never
typed into this repository, into a chat window, or into anything that keeps a
transcript — that is the whole point of the command.

While signed in, the 10ninety key can go in the same way, even though nothing
reads it yet:

```
npx wrangler secret put TENNINETY_API_KEY --env megacity
```

The sync is not written, so this changes nothing today. It is here because it
is free to do while signed in to his account and saves going back. The thing
actually blocking the sync is not the key but **the name of the header it goes
in** — see `docs/megacity-10ninety-api.md`. That is configuration, not a
secret, and 10ninety can answer it in one line.

**9. Push to `main`.** The workflow builds `dist/megacity`, checks nothing else
came with it, and deploys. Until the routes are uncommented the Worker is
uploaded but his domain is not pointed at it — the workflow says so rather than
failing.

**10. After the nameservers have moved and his zone reads Active**, uncomment
the two routes in `[env.megacity]` and push again. That is the moment the
website changes; everything before it is invisible to the public.

## The order these have to happen in

Two of these steps cannot be swapped, and both failures look like something
else:

1. **Nameservers move first, routes second.** A Worker custom domain can only
   be created for a zone the account holds. Uncommenting the routes before his
   zone reads Active fails the deploy — and reads as a broken config rather
   than as a step taken early.
2. **The website move is separate from the DNS move, on purpose.** Copying the
   records and changing the nameservers does not touch the website: the records
   are DNS-only, so mail and the old site carry on being served by whoever
   serves them now. The site changes only at step 10. If anything looks wrong
   after the nameserver change, it is a record, not the website — and fixing
   the record in Cloudflare lands within one record TTL, where reverting the
   delegation would take far longer in both directions.

## The one thing that is not in his account at all

Nothing pushed to `main` has reached the live agency site since 17 September,
because Workers Builds is still building a different branch. Cloudflare →
Workers & Pages → billydigitals → Settings → Builds → production branch
`main`. That is in the **agency's** account, not his, and until it is changed
the deploy verification here is checking work that never shipped.

## The thing to know about the Worker code

`main` is `worker.js` — the same entry the agency's own site uses. It carries
routing for the other client sites in it, because they share one file. No
secrets and no other client's *files* travel, but their code does.

Separating a Megacity-only entry means lifting the five enquiry handlers out of
`worker.js` into a module both can import. It is mechanical and about 400 lines,
and `scripts/megacity-routing-check.mjs` exercises those endpoints for real, so
there is a test to do it against. It was not done the night before a client
meeting, on the file that serves every other client's site. Worth doing next.
