# 10ninety Web API — what is known, and what is still needed

Walid's properties live in 10ninety. Everything the listing pages cannot
currently say — rent, deposit, bedrooms, **bathrooms**, EPC, council tax band,
reference — is in there, and Walid has told us so himself ("You can see
marketing details on 10nintey"). Billy has been given API access.

## Where the documentation is

10ninety's own page for this is
<https://www.10ninety.co.uk/estate-agent-websites/>, which says:

> Our Web API allows your developers to access your property listings on
> 10ninety and display them on your website.

and links to **<https://apidocs.10ninety.co.uk>**, which redirects (301) to
**<https://10ninety-webapi.stoplight.io/>**.

**That page does not serve its contents to an anonymous visitor.** Checked
2026-09-15: the Stoplight shell renders, the title is "10ninety Web API", and
the table of contents is empty — no endpoints, no schemas, no authentication
notes, whether the page is fetched or rendered in a real browser engine and the
navigation opened. So either the project is private, or it needs a signed-in
Stoplight session.

Two ways round it, in order of effort:

1. Open <https://apidocs.10ninety.co.uk> while signed in to whatever account
   10ninety gave access to. If the contents appear, save the page.
2. Ask 10ninety support for three things, which is one short email: the base
   URL, how a request authenticates (header or parameter name), and the
   endpoint that lists properties.

## The other route in: the property feed

The same page says properties can be exported in **Rightmove BLM** or **XML**:

> For WordPress sites your developers can use the Property Hive Plugin with
> Property Import add-on to import your properties, in either Rightmove BLM or
> XML format.

That matters because a BLM feed is a documented, public format that already
carries every field this site is missing — price/rent, bedrooms, bathrooms,
property type, availability date, EPC figures and the agent's own reference.
If the Web API turns out to be awkward or slow to get access to, ask 10ninety
to point the existing BLM/XML feed at us instead. It is the same data.

## What to send, and what never to send

Needed, none of it secret:

- the base URL
- how it authenticates — the *name* of the header or parameter, not its value
- one sample response for a single property, so the field names are known

**Never paste the key into chat, into this repository, or into any browser
JavaScript.** It goes straight into Cloudflare as a Worker secret:

```
npx wrangler secret put TENNINETY_API_KEY
```

The command prompts for the value. It is then readable only by the Worker at
runtime. The same rule as every other key on this project.

## What the codebase already expects

The Studio was built with this sync in mind, so there is less to do than it
looks:

- `migrations/megacity/0002_legacy.sql` gives listings a `legacy_id`, and
  `worker/studio/listings.js` fills it from an old `/property/<id>/…` link.
- A listing carries a `source`. When it is `"tenninety"`, the editor refuses
  changes to anything 10ninety owns — only the website's own extras stay
  editable — so the office can never end up with two versions of the truth.
- `STATIC_LET_SLUGS` in `worker/studio/urls.js` keeps Walid's own fourteen
  pages served from the repository, so a sync that fails, or returns nothing,
  can never take his portfolio off the website. See PROJECT-NOTES.md, "the
  properties that stay".

## The two facts a sync would settle

Both are open questions Walid raised, and both are waiting on data rather than
on code:

- **Bathrooms.** "Worth including number of baths too, not sure if that will be
  automatic with the feed." It will be, if the feed carries it — BLM does.
  Until then the pages say "Shared bath" and no count, because nobody has given
  us one and a letting agent's site is the last place to guess.
- **The nine properties' figures.** Rent, deposit, beds, council tax, EPC and
  reference are all absent from the new listing pages for the same reason.
