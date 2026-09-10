# Westfield Garage Int Limited — handoff

The demo lives at **`/templates/westfield-garage`** (source:
`templates/westfield-garage.html`). It is `noindex, nofollow` and `/templates/`
is disallowed in `robots.txt`, so it is shareable with the client but invisible
to search engines until we decide otherwise.

| Piece | File |
|---|---|
| Page | `templates/westfield-garage.html` |
| Design system | `assets/css/westfield.css` |
| Behaviour + CONFIG | `assets/js/westfield.js` |
| Logo, photography, icons, fonts | `assets/westfield/` |
| Stock photo credits | `docs/westfield-photo-credits.md` |

Shared, not client-specific: `assets/css/scroll-fx.css` + `assets/js/scroll-fx.js`
(the house `data-fx` toolkit) and `templates/vendor/lenis.min.js` (smooth scroll).

---

## The logo is his, not a lookalike

He supplied two JPEGs — a sign and a banner. The banner holds the wordmark at
the largest size available, so **every letterform in every asset is a vector
trace of that file**. Nothing is re-set in a substitute typeface, and nothing
should be: if the wordmark ever needs to change, re-trace, don't retype.

| File | Use |
|---|---|
| `logo-lockup.svg` | wordmark + `INT LIMITED` — nav, hero, footer |
| `logo-wordmark.svg` | wordmark alone, no strap |
| `logo-stacked.svg` | two lines, as on his sign — square-ish spaces |
| `logo-strap.svg` | `INT LIMITED` alone |
| `logo-mark.svg` | the `W`, cropped from his own wordmark — favicon only |
| `*-dark.svg` | the same paths in charcoal `#3a3a3c`, for light/print |

Each has a white (`#ffffff`) and a charcoal (`-dark`) variant because an SVG
loaded through `<img>` cannot see the page's CSS, so `currentColor` renders
black. Pick the file, don't recolour with a filter.

The favicon (`icon-*.png`) is the one asset that is *derived* rather than
copied: his own `W`, white on his charcoal, over a red bar. The full wordmark
is illegible at 32px. If he'd rather have something else there, it's a
five-minute change.

**Brand colours, all sampled from the artwork** — charcoal `#3a3a3c`, signal
red `#ed1b24`, hazard yellow `#fef200`. Nothing was invented.

---

## What is HIS, and correct

- Phone **07949 859112**, dialled as `+447949859112`, WhatsApp `447949859112`
- Email **westfieldgarage45@gmail.com**
- The eight specialisms: Services, Diagnostics, Brakes, Clutches, Exhausts,
  Suspensions, Gearbox, Timing Belt

---

## What is PLACEHOLDER — clear this list before it goes live

Everything below is invented for layout purposes only. It is all marked with an
HTML comment at the point of use.

1. **The three social links.** `CONFIG.facebook`, `CONFIG.instagram`,
   `CONFIG.google` at the top of `assets/js/westfield.js` currently point at the
   networks' home pages. Paste his real profile URLs in and the footer icons,
   the review buttons and everything else follow automatically. **Set one to
   `""` and its button is removed from the page** rather than left pointing
   nowhere — so an unanswered question costs nothing.

2. **`CONFIG.googleReview`** ends `...writereview?placeid=` with no place ID.
   Get the Place ID from his Google Business Profile and append it, or drop in
   the short link Google generates under "Ask for reviews".

3. **The four counters** (`data-count` in the stats band): `8` specialisms is
   real — it is his own list. `4.9` average rating, `12+` years and `100%`
   quoted-first are **not confirmed**. Ask him, or delete the ones he can't
   stand behind.

4. **The three reviews.** Written by us, attributed to invented first names.
   They must be replaced with real Google reviews or removed entirely — a made-up
   testimonial on a live site is a consumer-protection problem, not a style
   choice. There is a visible note under them saying so; delete the note when
   the real ones go in.

5. **Opening hours.** Mon–Fri 8:30–18:00, Sat 9:00–16:00, Sun closed — a guess.
   Each row in `#hours` carries `data-day` (0 = Sunday) and `data-open` /
   `data-close` in *minutes past midnight* (`510` = 8:30). The "Open now" pill
   reads those attributes, so correcting the table corrects the pill; there is
   no second copy to keep in step.

6. **The address and map.** Not supplied, so the page says so rather than
   guessing at a town. Once we have it: add it to the Find us column, drop an
   embedded map into the `.shot` beside it, and add `LocalBusiness`
   structured data.

7. **All photography is licensed stock**, not his garage. Credits and licences:
   `docs/westfield-photo-credits.md`. Swapping in real photos of the workshop is
   the single biggest upgrade available — replace the files in
   `assets/westfield/` keeping the same names and the page needs no edits.

---

## Where the enquiries go

Both forms (the hero card and the main enquiry form) share one code path in
`westfield.js`.

**As it stands, `CONFIG.endpoint` is empty**, so a submission opens WhatsApp
with the whole enquiry pre-written into the message. That works today, needs no
server and no secrets, and lands where a garage actually reads things.

To post to an inbox instead, set `CONFIG.endpoint` to a URL that accepts a JSON
body. On failure it still falls back to the WhatsApp handoff, so an enquiry is
never silently lost. Field names sent: `name`, `phone`, `email`, `car`, `reg`,
`job`, `notes`.

---

## Notes for whoever picks this up next

- **Scroll effects are the shared `data-fx` toolkit**, per the house convention
  in `PROJECT-NOTES.md` — `reveal`, `stagger`, `text`, `parallax`, `pin`,
  `progressbar`. Don't hand-roll new ones here.
- **The pinned "how it works" sequence** is `data-fx="pin"`. The toolkit makes
  `.fx-pin-inner` sticky and publishes `--fx-progress` (0→1); `westfield.js`
  turns that into which step is showing. Note `.fx-pin-inner` is a **flex**
  container — a second `position:sticky` nested inside it collapses to zero
  width and the section renders blank. That bug is fixed; don't reintroduce it.
- **`overflow-x` is clipped on `html` *and* `body`.** `clip`, not `hidden`, so
  `position:sticky` keeps working. Body alone leaves the root scrollable and one
  stray wide element slides the whole page sideways on a phone.
- **Fonts are self-hosted** (`assets/westfield/fonts/`, `@font-face` at the top
  of `westfield.css`). Saira and Inter, both SIL OFL 1.1. No Google Fonts
  request, so nothing about the visitor leaves our origin and there is no
  font-swap flash on a slow connection.
- **The visual system is one idea:** his wordmark leans right, so everything
  that leans on this page leans the same 12° (`--lean`). Nothing rotates.
- Deploy is the usual `PROJECT-NOTES.md` procedure — stamp, push the branch,
  fast-forward `main`, then `node scripts/deploy-verify.mjs`. Remember a push to
  *any* branch currently deploys to production.
