# Molecular Miracles — editor site seed

These JSON files are the WordPress pages that back the self-service content
bridge (`templates/mm/content.js`). Each file is one page on the editor site:

```json
{"slug": "areas-glasgow", "title": "Area: Glasgow", "content": "<!-- wp:heading ... -->"}
```

`content.js` fetches the page whose slug matches the current URL
(`/areas/glasgow` → `areas-glasgow`, home → `home`) and maps its blocks back
onto the live page positionally — Nth heading fills Nth heading, and so on.
So these payloads must stay in step with the built site.

## Regenerating after a copy change

```
python3 scripts/build-mm.py molecularmiracleschemistrytuition.co.uk
python3 -m http.server 8900 --directory dist/molecular-miracles &
python3 scripts/export-mm-content.py          # drives a browser over the built site
python3 scripts/gen-mm-editor-payloads.py     # writes payloads/*.json
cp payloads/*.json scripts/mm-editor-seed/
```

Then push the refreshed content to the editor site (`pages.update`, matching
`ids.json`). Skipping that step means the bridge quietly repaints the OLD
wording over the corrected HTML on the next page load.

## Rebuilding the editor site from scratch

`ids.json` maps slug → page id on the **original** editor site
(`molecularmiracleseditor.wordpress.com`, created under Billy's WordPress
account). That site is being replaced: WordPress.com refused every attempt to
invite Lynsey as a collaborator — from the UI and from the API alike, despite
the account holding administrator with `add_users`/`promote_users` — so the
editor is being recreated under Lynsey's own WordPress account instead, where
she needs no invitation at all.

To rebuild on a fresh account:

1. `wpcom-mcp-create-site` — title "Molecular Miracles Editor". Note the new
   subdomain; it will differ from the old one.
2. `settings.update` — `blog_public: 0` (reachable by the API, hidden from
   search engines), `timezone_string: Europe/London`.
3. `pages.create` for every file here except `ids.json` (40 pages), plus an
   empty page with slug `announcement` for the site-wide notice bar. Pass
   `content` byte-for-byte; publish, don't draft.
4. Delete the default "About"/"Sample" pages so her Pages list shows only the
   mirror.
5. Point `API` in `templates/mm/content.js` at the new subdomain, rebuild, and
   upload the zip to Cloudflare once.
6. Regenerate `ids.json` from the new page ids.

The old editor site can be deleted once the new one is verified working.
