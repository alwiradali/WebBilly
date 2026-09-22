# Molecular Miracles — the mailing list

Lynsey wanted to start collecting parents' email addresses. The addresses are
stored on her own site, in her own Cloudflare account. No list service is
involved, nothing is shared with anyone, and nothing about the visitor leaves
her domain.

## What is live now

A band above the footer on all 43 pages: one email field, one consent tick,
one button. It posts to `/api/mm-subscribe` on her Worker.

The endpoint refuses anything without `consent: true`, so an address can only
reach the list if the person ticked the box. It also refuses anything that
cannot be an email address, and swallows anything that fills the hidden
honeypot field.

**Until the database below exists, signups arrive in her inbox instead**, via
the same Web3Forms setup her enquiry form uses, so nothing is lost while this
is being set up. The moment the binding exists they go to the database
instead, with no change to the site.

## Turning the database on

Three steps, all in **her** Cloudflare account. They need a token with D1
permissions — the one in `CLOUDFLARE_API_TOKEN_MM` is scoped to Workers
Scripts, so either widen it or do this from her dashboard while signed in.

1. Create the database:

   ```
   npx wrangler d1 create mm-subscribers
   ```

   It prints a `database_id`. Keep it.

2. Add the binding to `wrangler.toml`, under `[env.mm]`, with the **real** id:

   ```toml
   [[env.mm.d1_databases]]
   binding = "SUBSCRIBERS"
   database_name = "mm-subscribers"
   database_id = "<the id wrangler printed>"
   ```

   Put the real id in. A placeholder is rejected by Cloudflare and takes the
   whole deploy with it — that is what happened to the Mumbai2London binding
   in the top-level config, and every push failed silently until it was
   commented out.

3. Create the table:

   ```
   npx wrangler d1 execute mm-subscribers --remote --file=./migrations/0002_mm_subscribers.sql
   ```

Push, and the next deploy picks it up. Confirm with a real signup from a
phone: it should land in the database and **not** in her inbox.

## Getting the list out

Cloudflare's dashboard → Workers & Pages → D1 → `mm-subscribers` → Console.
She can run this herself and export the result as CSV:

```sql
SELECT email, source, consented_at
FROM subscribers
WHERE unsubscribed_at IS NULL
ORDER BY consented_at DESC;
```

From the command line it is the same query through
`npx wrangler d1 execute mm-subscribers --remote --command "…"`.

## Taking someone off

```sql
UPDATE subscribers SET unsubscribed_at = datetime('now') WHERE email = 'them@example.com';
```

The row stays, so the record that they asked to come off survives the next
export and they are not quietly re-added.

## The two things still to sort

**Where she sends from.** The list is hers, but the site does not send email.
When she picks something to send campaigns with, every message needs a working
unsubscribe link in it — that is a legal requirement, not a nicety, and most
sending tools add it themselves. Until then the signup wording tells people to
ask her directly, which is enough for a list that is not yet being mailed.

**Her existing addresses.** Two places already hold parents' emails and
neither is on this list:

- **Payhip** has every buyer. Exportable from her dashboard. She may email
  these about similar classes under the soft opt-in, since they bought from
  her — but not about anything unrelated.
- **Her Gmail** has every enquiry. These people asked about tuition; they did
  not ask for a mailing list. Adding them wholesale is exactly what the
  consent tick exists to prevent. If she wants them on it, the clean route is
  one email asking them to sign up themselves.
