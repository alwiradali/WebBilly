# Westfield Garage Int Limited — handoff

**Live since 14 Sep 2026 at https://westfieldgarageintlimited.co.uk**, on his
own Cloudflare account (Worker `noisy-forest-8b27`). How, and how to update it:
`docs/westfield-golive.md`, top section.

The demo lives at **`/templates/westfield-garage`**, and answers at the short
address **billydigitals.com/westfield** too (any capitalisation; an alias in
`worker.js`, still `noindex`) (source:
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
| Go-live runbook | `docs/westfield-golive.md` |

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
- Address **2 Broom Ln, Stockport Rd, Levenshulme, Manchester M19 2TW** — off
  his Google Business Profile, where he is listed as *Westfield garage
  Levenshulme*
- **5.0 stars from 45 Google reviews**, same source
- Monday opens **9:30am**, same source
- The eleven specialisms: Services, Diagnostics, Brakes, Clutches, Exhausts,
  Suspensions, Gearbox, Timing Belt — the eight off the sign — plus
  **Hybrid & Battery**, **DPF & EGR** and **Remapping**, which he asked for
- The free checks he asked for: **free MOT check**, **pre-MOT check**,
  **free oil check**, **free tyre pressure check**

### Where the address lives

In exactly one place: `CONFIG.address` and `CONFIG.maps` at the top of
`assets/js/westfield.js`. It is written into the strip above the nav, the
mobile menu, the Find us column, the address card and the footer from there,
and the `LocalBusiness` JSON-LD in the page head carries the same figures. If
he moves, change those two lines and the JSON-LD block, and nothing else.

### One thing to say to him before this goes live

**DPF removal is not on the table and the page says so.** Taking a diesel
particulate filter off a road car is an automatic MOT failure, and advertising
the work is an offence under the Consumer Protection from Unfair Trading
Regulations — the ASA and trading standards both act on it. So the DPF & EGR
tile, the remapping tile and two of the FAQ answers are written around
**checking, cleaning and unblocking**, and around maps that leave every
emissions part where the factory put it. If he does want to advertise deletes,
that is a conversation to have with him, not a copy change to make quietly.

---

## What is PLACEHOLDER — clear this list before it goes live

Everything below is invented for layout purposes only. It is all marked with an
HTML comment at the point of use.

1. **Facebook and Instagram.** `CONFIG.facebook` and `CONFIG.instagram` at the
   top of `assets/js/westfield.js` still point at the networks' home pages.
   Paste his real profile URLs in and the footer icons follow automatically.
   **Set one to `""` and its button is removed from the page** rather than left
   pointing nowhere — so an unanswered question costs nothing.

2. **`CONFIG.googleReview`** now points at a Maps search that lands on his real
   listing, so the button works — but the direct write-a-review deep link is
   better. Get the Place ID off his Business Profile and use
   `https://search.google.com/local/writereview?placeid=<PLACE_ID>`.

3. **One of the four counters.** `11` specialisms is his own list; `5.0` and
   `45` are straight off his Google profile. `100%` quoted-before-we-start is
   the promise the page is built on rather than a measured figure — it stays
   or goes on his say-so.

4. ~~**The three reviews.**~~ **Done.** They are his real Google reviews now,
   pulled from Featurable by `scripts/fetch-westfield-reviews.py` and committed
   into the page. Run that script again when he gets new ones. It needs no API
   key and no secret.

5. ~~**Closing times and Saturday.**~~ **Done.** Mon–Fri 9:30–6:00, Saturday
   9:30–3:00, Sunday closed — off his Google Business Profile, 14 Sep. Each row
   in `#hours` carries `data-day` (0 = Sunday) and `data-open` / `data-close`
   in *minutes past midnight* (`570` = 9:30, `900` = 3:00). The "Open now" pill
   reads those attributes, so if his hours change, correct the table and the
   `openingHoursSpecification` in the JSON-LD, and nothing else.

6. **The map.** The address is in and "Get directions" works. There is no
   *embedded* map, on purpose: an iframe would be the page's only third-party
   request and would hand Google every visitor's IP before they had clicked
   anything. If he wants one anyway it drops into `.findcard` in a minute.

7. **What the two MOT checks actually cover.** He asked for a free MOT check
   *and* a pre-MOT check as separate things, so the page shows both. We have no
   price for the pre-MOT check, so it is badged **Pre-test** rather than
   **Free** (`.check .tag.ghost`) — don't promote it until he says. The wording
   is careful not to imply he is an MOT test station: it says he checks the
   things a tester checks, not that he issues certificates. If he *is* a test
   station, that is worth saying loudly and the copy should change.

8. **All photography is licensed stock**, not his garage. Credits and licences:
   `docs/westfield-photo-credits.md`. Swapping in real photos of the workshop is
   the single biggest upgrade available — replace the files in
   `assets/westfield/` keeping the same names and the page needs no edits.

---

## Where the enquiries go

**Proven 14 Sep 2026:** a test enquiry from the live domain landed in his
Gmail. Web3Forms key `d0d929d0-…` in `CONFIG.web3formsKey`, delivering to
westfieldgarage45@gmail.com.

Both forms (the hero card and the main enquiry form) share one code path in
`westfield.js`.

**They go to `westfieldgarage45@gmail.com` through Web3Forms**, which posts
straight from the browser — so the site still needs no server and holds no
secret. `CONFIG.endpoint` is the Web3Forms API and `CONFIG.web3formsKey` is the
access key, which is **public by design**: it names the destination inbox and
grants nothing else, which is why it sits in the repo rather than in a secret.

**The key IS the destination.** It was created signed in as
`westfieldgarage45@gmail.com`, and that is where every enquiry lands. To move
them to a different inbox, sign in as that address and make a new key — there
is nothing else to change.

Fields are sent under the labels the form itself shows ("Make & model", not
`car`), so the email reads like a job sheet. `replyto` is set to the customer's
address, so hitting reply in his inbox answers them and not the form service.

Four outcomes, and every one of them ends somewhere:

| What happens | What the visitor gets |
|---|---|
| Delivered | "Thanks — that's come through", form cleared |
| Key wrong or revoked (Web3Forms answers 200 with `success:false`) | WhatsApp, enquiry pre-written, form kept so nothing is retyped |
| Network failure | the same |
| No answer within 8 seconds | the same |

The visitor is **never** told an enquiry arrived unless Web3Forms confirmed it,
and the button can never be left on "Sending…". The real reason always goes to
the browser console.

Set `CONFIG.endpoint` to `""` and both forms go back to the WhatsApp handoff for
everything. Any other JSON endpoint also works: with no `web3formsKey` set, the
HTTP status decides instead of `body.success`.

---

## His photographs are in (22 Sep)

Five photographs of the workshop arrived on 22 Sep and now fill the hero, the
about split, both gallery workshop shots, the bench, the wheel and process
steps 01, 02 and 04. Each is cut to 3:2 to fit its slot; the customer's number
plate is pixelated in every frame it appears in. Still stock and still to be
replaced: the eleven service tiles (they illustrate the job, not the garage)
and `engine`. A second batch — the front of the building with the
signage, both bays with two cars up, an Audi with its bonnet up — was sent but
did not arrive as files; when it does, the exterior with the sign becomes the
hero and the current hero moves to the gallery. The 26-second handheld video he
sent is 848×480 and too shaky to use on the page.

## The tiles link to "Each job, explained" (added 17 Sep)

His ask: the arrow on each service tile should go somewhere. It now does.
Every tile is a link (the arrow is the `<a>`, its `::before` covers the card)
to `#svc-<slug>` in a new section straight after the grid: one `<details>`
per specialism — a paragraph, "Signs it's this", "What we do", and two
buttons. **Book this in** carries `data-job`, which pre-selects that job in
the quote form's `#q-job` select (the value must match the option text
exactly). Arriving on `#svc-brakes` from a link opens that one. The copy is
generic garage practice consistent with the tiles and the FAQ; it names no
price, no equipment and no accreditation. To change a job's text, edit the
`<details>` in the page; to add one, add a tile, a `<details>` and an option
in the form.

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
- **The address strip lives inside `.nav`**, above `.nav-bar`. The nav's own
  padding moved onto `.nav-bar` so the strip can collapse to zero height on
  scroll (`.nav.stuck .topbar`) without the logo row moving with it. Don't put
  padding back on `.nav`.
- **The twelfth service card is not a twelfth service.** `.tile.plain` is the
  "not on the list, ring us" prompt; it carries no photograph and squares the
  grid off at two, three and four columns. The heading still says eleven, and
  that is correct.
- Deploy is the usual `PROJECT-NOTES.md` procedure — stamp, push the branch,
  fast-forward `main`, then `node scripts/deploy-verify.mjs`. Remember a push to
  *any* branch currently deploys to production.
