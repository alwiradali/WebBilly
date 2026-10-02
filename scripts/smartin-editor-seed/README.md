# SMARTin SCIENCE — WordPress editor seed

Rod edits his site's words and photos in WordPress; `templates/smartin/content.js`
pulls the edits onto smartinscience.co.uk on page load. Same design as Molecular
Miracles (`scripts/mm-editor-seed/README.md`): one WordPress page per site page,
mapped back positionally (Nth heading fills Nth heading, and so on). Nav, footer,
forms and the live timetable are not editable, so the design cannot break, and
if WordPress is unreachable the built-in copy shows.

Each `<slug>.json` here is one page: `{"slug","title","content"}` where content is
WordPress block markup. `/areas/leeds` -> `areas-leeds`, home -> `home`.

## Set-up (once)

The editor site must live on **Rod's own WordPress.com account**. With Molecular
Miracles, WordPress.com refused every attempt to invite the client to a site
created under Billy's account, so create it under his.

1. Rod makes a free account at wordpress.com and creates a site, e.g.
   `smartinscienceeditor.wordpress.com` (any free address).
2. Settings: **Privacy → Discourage search engines** (keep the API public;
   do not make the site Private), timezone Europe/London.
3. Create one page per file here (66 pages), title and slug from the file,
   content pasted byte for byte in the Code editor, **published**. Plus one empty
   page with slug `announcement` (anything typed there shows as a bar across the
   top of every page). Delete the sample pages.
4. Put the address in `EDITOR` at the top of `templates/smartin/content.js`
   (e.g. `'smartinscienceeditor.wordpress.com'`), commit, push, deploy.

## After a copy change in the repo

    python3 scripts/build-smartin.py smartinscience.co.uk
    python3 -m http.server 8901 --directory dist/smartin-science &
    node scripts/export-smartin-content.mjs 8901
    python3 scripts/gen-smartin-editor-payloads.py

Then update the matching WordPress pages, or the bridge repaints the old
wording over the new HTML.
