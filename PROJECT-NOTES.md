# Billy Digitals — project notes

Static marketing + portfolio site. **Vanilla HTML + CSS + JS**, no framework,
no build step. Served as static assets on **Cloudflare Workers** (`worker.js`
adds only `/api/quote` and `/api/send-review`). Clean URLs: a root file
`foo.html` is served at `/foo`; templates at `/templates/<name>`.
Short preview aliases (`billydigitals.com/westfield`) live in `PREVIEW_ALIASES` in
`worker.js`; each one is also disallowed in every group of `robots.txt`.

Brand palette: `--bg:#060b1a`, `--text:#eaf2ff`, accents `--c1:#2b7fff` /
`--c2:#38bdf8` / `--c3:#22d3ee`. Fonts: Space Grotesk (display), Inter (body),
Playfair Display (serif). Keep client-demo pages `noindex`.

## Scroll effects / animations — use the global toolkit
When asked to add scroll effects or animations, use the **`data-fx` system** in
`assets/css/scroll-fx.css` + `assets/js/scroll-fx.js` (loaded globally). Tag
elements with `data-fx="reveal|stagger|text|parallax|pin|horizontal|progressbar"`.
Full reference: `docs/scroll-fx.md`. Do not hand-roll per-page one-offs unless
the toolkit genuinely can't express the effect.

## Bash n Boujee (event decor, London) — `templates/bashnboujee`

One page, three files: `templates/bashnboujee.{html,css,js}`, plus her assets
in `assets/bashnboujee/`. Noindex, like every client demo.

**Her logo, and the one thing to know about it.** The supplied file,
`assets/bashnboujee/logo.jpg`, is a foil-embossed mark printed on a blush
plate (#f5e3dc). Knocking that plate out naively hollows the letterforms,
because the specular highlights inside the strokes are lighter than the plate
and a plain colour-distance cut takes them with it. `logo.png` is the cut-out
that does work: ink is colour-distance from the plate, PLUS anything lighter
than the plate (those highlights), PLUS the balloon's own enclosed shading,
filled only inside the balloon's connected component so the counters of B, o
and e stay open. That PNG is what every copy on the page uses, so the mark
sits on cream and on the dark footer alike with no card behind it. If it is
ever regenerated, check the balloon highlight and the insides of the letters
before shipping it.

**The pictures are stock photographs, and the page says so.** Every photo in
`assets/bashnboujee/photos/` is a free Pexels image (free for commercial use,
no attribution required) standing in for her own work, so the layout can be
judged with real photography in it. The look book says in brackets that they
are examples; the source id of each one is listed in a comment at the top of
`templates/bashnboujee.html`. When her photos arrive, drop them in the same
folder and swap the `src` on the `.svc-art` images (4:3, 1200x900) and the
`.tile` images (4:5, 1000x1250). Nothing else needs to change.

**The look book and the reviews are rails, not grids.** `[data-rail]` in
`bashnboujee.js` gives each one grab-and-throw dragging, eased arrow buttons
and arrow-key support, and leaves the element's own `scrollLeft` as the single
source of truth so the scrollbar, the snap points and the keyboard all agree.
Two things that are easy to lose: `scroll-padding-inline` on `.rail` (without
it the snap ignores the rail's padding and parks the first card against the
viewport edge before anyone has touched it), and `data-lenis-prevent` (without
it the smooth-scroll library swallows the sideways gesture).

**The floating balloons are drawn, and that is deliberate.** `[data-balloons]`
on any section gets that many soft SVG balloons from `bashnboujee.js`. A
photographic cut-out balloon over a photograph of a party reads as a mistake; a
translucent drawn one reads as texture. They are skipped under reduced motion.

**Still needed from her**, all in `CONTACT`/`REVIEWS` at the top of
`bashnboujee.js`: a WhatsApp number (until then the floating bubble opens an
Instagram DM, which is what her bio already tells people to do, rather than a
dead `wa.me` link), a Google Business profile, real reviews, and a Web3Forms
key. Every one of those degrades to something that works rather than something
that breaks — with no form key the enquiry hands the visitor their own answers
back as a pre-written email and WhatsApp/Instagram message, so an enquiry is
never lost.

**The sample reviews are labelled.** `REVIEWS.sample` is true, and while it is,
every card carries a visible "Example" chip and the section says so in as many
words. A made-up review presented as a real one is a lie told on her behalf.
Set `sample: false` and fill `items` when the real ones exist.

## Brownielicious (bespoke brownies, Stoke-on-Trent) — `templates/brownielicious`

One page, three files: `templates/brownielicious.{html,css,js}`, plus her
assets in `assets/brownielicious/`. Noindex, like every client demo. She is
`@browniieliciousss` on Instagram and TikTok; halal, bakes to order, collection
in Stoke or posted UK-wide.

**Her logo, untouched, in two forms.** There was no logo file — only her
Instagram profile picture. `assets/brownielicious/logo.png` is the round badge
lifted straight out of that screenshot (centre 644,1261, radius 424, resampled
to 900px) with everything outside the circle made transparent, so it is her
artwork pixel for pixel on its own pink plate. `wordmark.png` is the same
artwork with the plate (#ffe7fd) keyed out by colour distance, so the lettering
alone can sit on any background — that is what the header and the drawer use.
The badge is what goes on photographs and on the dark footer, where a keyed-out
brown wordmark would disappear. If either is ever regenerated from a better
source file, check the counters of B, o and e before shipping it.

**The pictures are stock photographs, and the page says so.** Every photo in
`assets/brownielicious/photos/` is a free Pexels image (free for commercial
use, no attribution required) standing in for her own bakes. The menu says in
brackets that they are examples; each source id is listed in a comment at the
top of `templates/brownielicious.html`. When her photos arrive, drop them in
the same folder and swap the `src`: hero 4:5 900x1125, menu items 1:1 900x900,
gallery 4:5 1000x1250, occasions 3:2 1200x800.

**The menu is her menu.** `MENU` and `FLAVOURS` in `brownielicious.js` are
transcribed off her own menu graphic — boxes of 6/9/12 at £10/£15/£20, minis,
£20 personalised slabs, £2 NYC cookies (£3 premium), £1.50 cake pops, and both
topping lists for brownies and for cookies. A price of `''` renders "Ask",
which is what her menu does for the minis and the wrapped items. The allergen
panel is her wording verbatim, including that items are **not** catered to
allergies.

**The availability calendar is generated, not drawn.** `AVAILABILITY` holds a
list of booked day numbers; the grid is built for the current month at page
load, so it never goes stale, past days grey out on their own, and a booked day
gets the cross she draws on her story — sized so the date underneath can still
be read. `example: true` puts the "Example" chip and the disclaimer on it.

**Rails, sprinkles, and the things that are easy to lose.** The gallery, the
ordering steps and the reviews are `[data-rail]` strips with grab-and-throw
dragging and eased arrow buttons, the same implementation as Bash n Boujee —
including `scroll-padding-inline` on `.rail`, `data-lenis-prevent`, and
`scroll-behavior:auto` (the page's smooth scrolling is inherited by every
scroll container and would animate each frame a second time). `[data-sprinkles]`
drifts hundreds-and-thousands behind the hero; drawn, not photographed, and
skipped under reduced motion. Lenis is gated behind `(pointer: fine)` so a
phone keeps its own momentum scrolling.

**iOS will not paint a moving layer wider than ~4096 DEVICE pixels, and
cutting the strip shorter does not fix it.** The word marquee under the hero
came out as an empty brown bar on her phone, twice, while being perfect in
every desktop browser. First it was a strip built by doubling a ten-word list:
3286 CSS px, which is 9858 device pixels on a 3x phone. Then it was short runs
each animating themselves — better, but to cover a 2560px band the moving
element still has to be 2560px, 5120 device pixels on a retina Mac. The fix
that holds is to stop moving anything: the band is an `overflow:hidden` box
and the JS drives its `scrollLeft`. A scrolling box is tiled and painted by
the browser as it goes, so there is no composited layer to overflow at any
screen size, and the whole word list fits in one run so it flows past instead
of restarting after four words. Anything that animates across the full width
of the page needs the same treatment.

**The order builder, the basket and the example checkout.** `ITEMS` in
`brownielicious.js` drives the whole builder — item, sizes, prices, which
flavour list applies. The basket is kept in this site's own localStorage
(`bnl-basket`), wrapped in try/catch because private browsing throws on
write; a basket then lasts the visit, which is still worth having. A size
with `price: null` is one she has not published (the minis, the wrapped
items): those lines say "price on confirmation", are never guessed at, and
are left out of the subtotal but still sent with the order. `CHECKOUT.postage`
is set to a working figure. **Every price in `ITEMS` is hers, off her own
menu.** The two numbers that are NOT on her menu — postage and what premium
toppings add to a box — are in `CHECKOUT` at the top with a block comment
saying exactly that, and each is shown to the customer on its own line rather
than folded into a total. The sizes she has never published a price for (the
minis, the individually wrapped items) are simply not in the shop: they stay
on the menu marked "ask", so nothing in the basket is ever a guess.

Bank transfer is the default payment because it is the one that works today;
card is offered beside it with one line saying it switches on when a payment
account is connected. The card inputs are `disabled` so nobody types a card
number into a form that goes nowhere. `checkoutForm`'s fetch is the seam where
a real provider goes.

Buttons in the builder take focus with `preventScroll` and swallow `mousedown`,
because clicking a card that is half off screen made the browser scroll to it
and the page jumped under your thumb. The item cards are also built once and
only re-classed, rather than re-rendered — re-rendering threw seven images away
and fetched them again on every tap, which is what made choosing one flash.

**An `img` with `width` and `height` attributes sets both dimensions.** Those
attributes are presentational hints, so `aspect-ratio` in the CSS loses to
them and every picture on the first build came out at its full intrinsic
height. `img{height:auto}` in the reset hands the height back; the few places
that want it (`.hero-art figure img`, `.occ img`) take it again by being more
specific.

**Checked across the device matrix, not just a phone and a laptop.** 320px
up to 2560px at 1x, 2x and 3x, portrait and landscape, touch and mouse:
no horizontal scroll anywhere, nothing hanging off the side, the order
button above the fold on every one, every tap target at least 34px on a
touch screen, and one number (`HEAD` in the JS, `scroll-margin-top` in the
CSS) shared by the smooth-scroll library, the instant jump and the
browser's own anchor scrolling so a section lands in the same place
whichever route took it there.

**Still needed from her**, all in `CONTACT`/`REVIEWS` at the top of
`brownielicious.js`: a WhatsApp number (until then the floating bubble opens an
Instagram DM, which is what her bio already tells people to do), her Facebook
page, an email address and a Web3Forms key for the order form, a Google
Business profile and real reviews, and whether the gofund.me link in her bio is
still the current one. Every one degrades to something that works: with no form
key the enquiry hands the visitor everything they typed, already written, one
tap from a DM. `REVIEWS.sample` is true, so every review card carries a visible
"Example" chip — a made-up review presented as a real one is a lie told on her
behalf.

## billy360 (the 360° tours) — run the tests before you push
`node scripts/billy360-test.js` (add `--only=<demo|public|embed|devices|engine|office|data>`)
and `node scripts/billy360-api.mjs --base=http://localhost:<port>`. Both need a
static server and, for the office and API sections, `wrangler dev`; the scripts
print the command to start whichever is missing. Reference: `docs/billy360.md`.

## Deploy workflow (branch → main, static site goes live on push)
### A push to ANY branch replaces production. Third time, 23 Sep 2026.

`billydigitals.com` served stamp `f1e5675781e9` — built 21 Sep from head
`d613da2` ("SMARTin SCIENCE: his calendar is wired up"), 1846 files — while
`origin/main` was `896ef45` with 2009 files. Every Brownielicious URL 404ed:
the page, its CSS, its JS and its images. Nothing was wrong with the branch,
the merge or the build; main was correct throughout.

What happened each time is the same: another branch was pushed
(`claude/megacity-properties-redesign-nt4l0n`, that day), Cloudflare Workers
Builds built THAT branch, and the result went to production because the
project has no production branch set. Previous occurrences: `62e267576474`
(9 Sep) and `f1e5675781e9` (21 Sep), both recorded below.

The recovery is to push a commit to main and wait for the stamp to match
again. That is a recovery, not a fix — the site is wrong for as long as it
takes someone to notice.

**The fix is one setting, and it is not in this repository.** In the
Cloudflare dashboard: Workers & Pages → the project → Settings → Builds →
set the production branch to `main`, and either disable preview builds or
leave them as previews. Until that is set, any push to any branch can take
the live site down, and the only warning is a stale stamp in
`/version.json`. `node scripts/deploy-verify.mjs` catches it in seconds —
run it after every deploy, and if a page 404s that you know you shipped,
check the stamp before you debug anything else.


Stamp the build before committing, so the deployed site can say which tree it
is running, then push and check that it actually went live:
```
git add -A && node scripts/stamp.mjs && git add version.json
git commit ...
git push -u origin <branch>
git checkout main -q && git merge --ff-only <branch> -q && git push origin main
git checkout <branch> -q
node scripts/deploy-verify.mjs          # after Cloudflare finishes the build
```
**Why the live site twice served a month-old build (found 9 Sep).** This
repository has TWO UNRELATED COMMIT HISTORIES — `git rev-list --max-parents=0
--all` returns two root commits, and `git merge-base` between them returns
nothing. `main` is one line; `claude/unclear-request-8u6hgo` (691 commits, still
being pushed to) is the other. That branch's tree has no `billy360/`, no
`halcyon/`, no Megacity, and still uploads `migrations/` — which is exactly what
billydigitals.com served during both outages, down to `index.html` and
`assets/css/style.css` being byte-identical to main while whole directories
404'd. Cloudflare deploys whichever branch was pushed last, so a push to that
branch takes every other client's pages off the web until someone pushes main
again.

Fix is in the Cloudflare dashboard, not in this repo: Workers Builds → set the
production branch to `main` and stop non-production branches deploying to
production. Until that is done, run `node scripts/deploy-verify.mjs` after any
push, and before showing the site to anyone.

**Caught in the act, 9 Sep 19:13 UTC.** A push to
`claude/megacity-properties-redesign-nt4l0n` (commit `0be6a50`, stamp
`45d2b27f1541`) went to production while `main` was at `39c7ff4`
(stamp `7948bfeb18f9`). `version.json` on billydigitals.com read
`45d2b27f1541` — a stamp that exists in no commit on `main`. So this is not an
inference from the two histories any more: **a push to any branch deploys to
production.** Fix the production-branch setting BEFORE a client's own domain is
routed to this Worker, or a stray branch push puts the wrong tree on the
client's live site.

**Twice more in one hour, 22 Sep.** While `main` was at `d227898` and then
`36cf027`, production twice reverted under it: first to a 9 Sep tree (stamp
`62e267576474`, 1832 files), then to a 21 Sep one (stamp `f1e5675781e9`, head
`d613da2`, 1846 files). Both times every page added since that tree — the whole
of `templates/bashnboujee`, assets included — returned the 404 page on the live
site while GitHub's `main` was perfectly correct. The only remedy from inside
this repository is to push another commit to `main`, which wins until the next
stray branch push. It is worth saying plainly: **this is not a flaky deploy, it
is a setting.** Workers Builds → production branch `main`, and non-production
branches must not deploy to production.

`node scripts/stamp.mjs --check` fails if `version.json` is stale.
`deploy-verify.mjs` compares the live bytes with this working copy and exits
non-zero on an older build — billydigitals.com has twice served a month-old
deployment while Workers Builds reported success, and nothing else catches it.
Commit messages end with the required attribution and session trailers.

## Megacity: the properties that stay on the website
Walid asked for his own portfolio to stay up permanently, so 10ninety cannot
take it down. Two mechanisms, and they are deliberately different:

- **Static pages.** The nine properties he photographed are plain HTML in
  `templates/megacity-let-<slug>.html`, generated by
  `node scripts/megacity-build-listings.mjs` and listed in `STATIC_LET_SLUGS`
  (`worker/studio/urls.js`). `worker/studio/host.js` serves the static page when
  D1 has no live row, so a sync can never remove them. Edit the DATA table in
  the generator, never the generated HTML — a rebuild overwrites it.
- **`pinned`** (migration `0005_listings_pinned`) is for Studio-managed
  listings, where the delete guard in `worker/studio/listings.js` refuses.

**No invented property facts.** These nine came with photographs and nothing
else. Rent, deposit, bedrooms, bathrooms, council tax band, EPC and the
reference are still with the client; the pages say "Rent on application" and
omit every row we were not given rather than guessing. Availability is the one
number we have — Walid, 8 Sep 2026: all nine available from 1 August 2027.
`node scripts/megacity-listings-check.js <base>` fails the build if a page ever
states a price, a room or storey count, a council tax band, an EPC rating or a
reference. Fill facts in via the generator's DATA table as they arrive.

Still unknown, worth asking before anyone guesses: the town for Adelphi
Apartments, Grove House, The Rope Works and Anvil Place (their folders carried
no postcode), and whether the Carlton Road houses are the ones behind the
`room-3`/`room-5`/`room-7` listings.

---

## Starlit Blooms — `templates/starlit-blooms.{html,css,js}`

Eternal satin roses, Manchester. `@starlitblooms_`. A client preview: unlisted
(meta noindex, `X-Robots-Tag` on the page **and** on `/assets/starlit/*`,
`robots.txt` already disallows `/templates/`, absent from the sitemap).

**Her logo is hers.** There was no source file, so it came out of her Instagram
profile picture: the circle is at (644, 1261.5) r=424 in the screenshot, giving
a clean 848px badge. `assets/starlit/logo.png` is that badge with the corners
made transparent. The other three are the artwork with the blush background
*keyed out* — solving `P = A·I + (1−A)·B` per channel for the ink `#be7282`
over the blush `#fde7ea`, which gives clean anti-aliased edges with no halo:
`mark-full.png` (all of it), `monogram.png` (the SB and lilies),
`wordmark.png` (the two lines of type, 1760x300 for the nav bar). Quantising
to 128 colours afterwards cut them from 2.2MB to 495KB with no visible loss.

**The photographs are stock, graded into one family.** CC0 / public-domain
images from Openverse (rawpixel), listed with their licences in a comment at
the top of the HTML. Unrelated stock never reads as one brand on its own, so
every frame goes through the same grade: hues between 58° and 179° (greens,
yellows, cyans) lose 86% of their saturation and 18% of their value, reds and
magentas gain a little, the deepest shadows are lifted toward the page's plum,
highlights are rolled off at 0.86 and a soft vignette is added. That is what
turns a yellow field behind a bouquet into neutral bokeh. The one high-key
frame (the gift box) is **blurred before it is darkened** — crushing gamma
first amplified the source JPEG's blocking into visible squares.

**The builder is the point of the page.** She takes orders by DM, so there is
no checkout and no invented prices. `PRICES` in the JS is her own list off her
Instagram highlight (£2 / £25 / £44 / £60 / £75, add-ons £1–£3, birthday £80,
wedding £95). The builder totals size + add-ons live, then offers two routes:
**Send this as an enquiry** fills in the form below and scrolls to it, and
**Send it on Instagram** copies the order to the clipboard and opens
`ig.me/m/starlitblooms_`, because nobody can pre-fill an Instagram DM. Gift
boxes and hampers have no published price, so they are marked "quoted on
enquiry" rather than guessed at.

**Three bugs this build found that are worth remembering:**

1. `[hidden]` is a UA rule with *no* type selector, so **any** class rule that
   sets `display` beats it. `.lb{display:grid}` meant the lightbox stayed laid
   out while "hidden" — an invisible full-screen layer swallowing every click
   on the page. A single `[hidden]{display:none!important}` fixes the whole
   class of bug (it also affected `.drawer` and the rail arrows).
2. **Lenis and `html{scroll-behavior:smooth}` fight each other.** Lenis drives
   the scroll from its own rAF loop; CSS then animates the same jump again and
   anchor links land hundreds of pixels short (measured: 890px). Set
   `scrollBehavior = 'auto'` as soon as Lenis is constructed.
3. **A lightbox that re-locks on every next/prev leaves the page frozen.**
   `open()` was calling `lockScroll(true)` each time, so arrowing through four
   pictures took four locks and closing released one. Guard on `!lb.hidden`.

**Still needed from her** — all in `CONTACT` at the top of the JS: an email +
Web3Forms key (until then the form hands the enquiry back as copyable text
with a link to her DMs, so nothing is silently swallowed), a Google Business
profile for `googleReviews` / `googleWrite` / rating / count (the reviews are
labelled examples until then), a TikTok or Facebook URL if she wants those
icons, and her own photographs to drop over `assets/starlit/photos/`.

**One thing to confirm with her:** the brief said "postage only, meaning she
delivers it herself". The page reads that as *delivery only, by hand, around
Manchester, no collection and no courier* — which is what the delivery section,
the FAQ and the builder all say. If she actually posts nationwide as well, the
Delivery section and FAQ need rewording.

**The voice is impersonal, not first or third person.** It went first person
("I make every rose by hand"), and she asked for it to come back out — the
page now says "every rose is made by hand", "orders need at least a fortnight
ahead", "delivery is arranged once the order is confirmed". No "I", no "she",
no "we". Two deliberate exceptions: the reviews, where customers talk *about*
her in the third person because that is how a real review reads, and the
builder's message preview, which is the **customer** speaking ("Hi! I'd like
30 roses…") and so is correctly first person.

**The builder ends in one button, and shows its own message first.** There
used to be two — "send as an enquiry" and "send on Instagram" — which made
people choose a route before they knew what either did. Now the exact text
that will be sent is printed on the page under "Your message", and a single
**Copy & send enquiry** does all three things: copies the message (or opens
the share sheet where there is one, which skips the pasting), fills in the
enquiry form below so the details are recorded either way, and opens her DMs.
A quiet secondary link still goes to the form for anyone without Instagram.

**The marquee moves each WORD, not the strip.** The scrolling-box version was
safe but stuttered: `scrollLeft` rounds to whole pixels and at 34px/s that is
0.57px a frame, so it alternated between moving and not. Transforming the
track instead would be smooth but makes one composited layer as wide as the
strip — straight back into the iOS 4096-device-pixel paint limit. So the
transform goes on each `<span>`: every word is its own small layer (widest
measured: 652dp against a ~4096 limit), they all move by the same sub-pixel
amount, and it looks identical to moving the strip. A `smooth` flag falls
back to `scrollLeft` if a cell ever measures over 3800dp.

**An `!important` is what beats the parallax kit.** On a phone the hero tiles
move from absolute positioning into normal flow, but `scroll-fx.js` keeps
writing an inline `transform` — which dragged them up over the text below the
buttons. Inline styles lose only to `!important`, so
`.hero-tile{transform:none!important}` inside the mobile query is the fix; do
not try to strip the attribute in JS, because a rotation puts it back.

**Instagram DMs cannot be pre-filled, by anyone.** There is no URL parameter
for it — `ig.me/m/<user>` opens the thread and that is all it does. The
closest thing that exists is the Web Share API: `navigator.share({text})`
opens the native share sheet, and picking Instagram carries the order text
into the message with nothing to paste. `handOver()` in the JS does that where
it is supported and falls back to clipboard-plus-open-DM everywhere else, so
the order is never lost either way. If she ever publishes a WhatsApp number,
that one *can* be fully pre-filled (`wa.me/<n>?text=`) and would be a better
default.

**Why the cards "randomly appeared", and the general rule.** Two faults, one
obvious and one not.

The invisible one: **a component's own `transition` REPLACES the fx toolkit's
rather than adding to it.** `.col-card` transitioned `transform` for its hover
lift, which wiped out the `opacity` transition that `[data-fx="reveal"]`
supplies — so the card went from opacity 0 to 1 in a single frame. Measured:
one frame. `.steps li` and `.occ li` had the same fault. Anything carrying
`data-fx` must keep `opacity` in its own transition list; `qa.mjs` now fails
any viewport where an fx element does not transition opacity, so it cannot
come back.

The other: **a `[data-fx="stagger"]` container fires once, when the container
enters.** Stacked on a phone the three collection cards are ~2138px tall, so
all three animated together while only the first was on screen — by the time
you scrolled to the second and third they had finished long ago and simply
existed. `pictureArrival()` in the JS splits any stagger container taller than
the viewport into individually revealed children (capped offsets so two that
land together still feel sequenced), and re-measures on `load` and on
`document.fonts.ready`, because a block of text is shorter before its real
font arrives and would otherwise look short enough to leave alone.

Lazy-loaded photographs also now fade up as they decode, over the card's own
background rather than a hole in the page, with a 4-second safety timeout so a
failed image can never leave a permanently invisible one.

**Two things that were visible but not obvious, and are now guarded.**

*An empty toast is still a padded, bordered pill.* `.toast` parked itself with
`translate(-50%,140%)` — but 140% of its own 26px height is only 36px, and it
sits `bottom:26px`, so 16px of an empty dark pill sat permanently at the
bottom of every screen looking like a stray blob. It now hides with
`opacity:0;visibility:hidden` and parks at `calc(100% + 40px)`. `qa.mjs` fails
any viewport where a fixed element with no text and no icon is still painting
inside the screen.

*The shared `scroll-fx.js` drifts `.section-head h2` and `.section-head .tag`
in opposite directions for depth.* Measured on this page it pushed the heading
up to **40px down** — 23px **into** the paragraph underneath it on a laptop.
These headings sit directly above their own sub-paragraph with ~14px of air,
so there is nothing to drift into. `.section-head h2,.section-head .tag
{transform:none!important}` stops it (inline styles only lose to
`!important`), and `qa.mjs` fails any viewport where a section heading still
carries a transform.

**The intro is a fixed beat, not a wait for `load`.** `finish()` is gated on
`MIN_INTRO = 2000ms` measured from when the script runs, and `ready()` is
called immediately rather than from the `load` handler. Both details matter:
gating on a minimum means a cached second visit gets the same beat as a cold
first one instead of flashing the logo for a frame, and *not* waiting for
`load` keeps it off the webfont critical path — waiting stretched it to 3–4s
on a real connection. Nothing is lost by going early, because the hero's own
pictures fade in as they decode. Measured live: holds ~2.1–2.3s, hero fully
there by ~3.0s. A 4.6s hard cap still calls `finish()` directly.

**The mobile menu was clipped at both ends, not scrollable.** `.drawer` was
`display:flex;justify-content:center` with no `overflow` — and centring a list
taller than its box cuts off the TOP as well as the bottom, with no way to
scroll to either. Ten links plus a button needed ~840px in a 664px screen, so
the first item sat under the header and the button under the browser bar.

Three parts to the fix: `justify-content:flex-start` plus `overflow-y:auto`
(with `overscroll-behavior:contain`) so it can always scroll; smaller type and
tighter padding, with breakpoints for short phones and landscape, so it
actually fits outright on every portrait size; and — the part worth
remembering — **the top padding is measured, not guessed**. `sizeDrawer()`
writes the real header height into `--navh` on load, resize and orientation
change. A hard-coded value was wrong on some size every time: 78px tucked the
first link under the header on iPad, 94px was right there but still wrong in
landscape. Measured, every size clears by exactly 22px.

Guarded in the interaction suite: the drawer is opened and checked for a first
link under the header, an unreachable last item, and `overflow:hidden`.

---

## Makeup by Sadia — `templates/makeup-by-sadia.{html,css,js}`

Pre-launch makeup artist, `@makeup_bysadia0`.

**Parked.** The page, its stylesheet, its script and `assets/sadia` are all in
`.assetsignore`, so Cloudflare does not upload them and
`/templates/makeup-by-sadia` answers 404 — link or no link. The files stay in
the repository; delete those four lines to put it back. Its `_headers` block
stays in place too, exactly as Brownielicious and Starlit Blooms do, so the
noindex returns by itself if it is ever unparked rather than having to be
remembered.

**Her logo is hers.** Lifted from her Instagram profile picture — circle at
(644, 1238) r=424 in the screenshot, an 848px badge. `logo.png` is the round
badge with transparent corners; `mark.png` is the artwork with the cream disc
keyed out (solving `P = A·I + (1−A)·B` for black ink over `#faebe5`). One
catch worth remembering: the disc's own antialiased **rim** is darker than the
cream, so it keys as ink and comes out as a stray arc — mask at `0.90 × radius`
rather than at the circle edge.

**The page is type-led on purpose, and the portfolio is deliberately empty.**
She told us she is "looking to build up a following first and get everything in
place before I properly launch" — and her feed has zero posts. Two things
follow from that. The CC0 pools have essentially no modern beauty photography,
so every photo here is **still-life or texture**, never a face. And the gallery
is a **"First looks, coming soon"** block: four framed spaces carrying her
monogram, with the page saying plainly that they are being kept for the real
thing rather than filled with somebody else's work. That is honest, it is what
she asked for, and it sidesteps presenting strangers as her clients. Every
frame is graded to one warm neutral so an unrelated set reads as one brand.

**The diary is the centrepiece.** `DIARY` at the top of the JS holds the
opening hours (08:00–18:00, hourly), the closed days, how far ahead people can
book (this month + 2, i.e. through November) and a minimum notice. `BOOKED` is
where real bookings go — a date is either `'all'` or a list of times. While
`DIARY.example` is true, anything not in `BOOKED` is generated from a **stable
hash of the date string**, never `Math.random()`: the example diary has to look
identical on every reload and every device, or a client refreshing the page
watches their chosen day change state. Weekends fill first, which is what a
real makeup diary looks like.

Two details that matter more than they look:

* **It opens on a month people can actually book.** Landing on the tail of the
  current month shows an almost empty grid, which reads as "nothing is
  available" rather than "this month is nearly over". `openOnUseful()` walks
  forward to the first month with at least six open days.
* **The generated spread has to show all four states.** With too narrow a
  range no day ever lands in the "a few times left" band and the legend has a
  row nothing uses. Tuned until October shows 16 free, 8 nearly full and 3
  fully booked.

Picking a day and a time fills the enquiry form's date field and scrolls to
it, so the booking and the enquiry are one flow rather than two.

**Still needed from her**, all in `CONTACT`: an email + Web3Forms key (until
then the form hands the enquiry to the share sheet, or the clipboard plus her
DMs — nothing is silently swallowed), a Google Business profile, prices, and
her own photographs for `assets/sadia/photos/`. Real availability replaces the
generated example by filling in `BOOKED` and setting `DIARY.example = false`.

---

## Krem&Choc — `templates/kremchoc.{html,css,js}`

Bespoke cake designer, Leicester. `@krem_choc`, `kremchoc@gmail.com`, founded
by **Zahra**. A **remake of a real site** (kremchoc.co.uk), not a template —
which changes what "unlisted" is for: the page carries her own copy and
photographs, so an indexed copy would compete with her live site in search.
`X-Robots-Tag` covers the page **and** `/assets/kremchoc/*`.

**The page is written AS her, in her first person** — "so I know who I am
holding the slot for", "I travel for bridal and for groups over three". Copy
that talks *about* her breaks that the moment it appears, and it crept in twice:
once with the calendar and once with the email routing, which between them said
"she will confirm it by DM", "so she can reply", "she has your enquiry" and
"Opening her DMs". `z-act.mjs` now walks every visible text node and fails on a
third-person reference to her outside the reviews carousel, where a client
saying "she" is the point.

**Everything on the page is hers.** No stock photography, no invented copy.

*Her copy* came off kremchoc.co.uk. The site is a static export with the
content in a JS bundle — `curl` returns the shell and nothing else, so it was
rendered in Playwright and the text read off `document.body.innerText`. Her
typos are corrected ("cantrepiece"→"centrepiece", "perdection"→"perfection",
US "flavor"→"flavour"); everything else is verbatim, including her three-step
booking process, which is the most valuable thing on her site and is
reproduced in full.

*Her logo* came from three places. The round green badge and the gold KC
monogram are keyed from her Instagram profile picture; the "Krem&choc"
wordmark is the transparent PNG on her own site, recoloured to her gold and
to cream. Her disc is `#282f27` and her gold `#a9814c`, and the whole palette
is built from those two.

*Her photographs*: the two high-resolution images on her website carry the
hero, the philosophy panel, the strip and the quote. The six portfolio tiles
are cut out of her Instagram grid screenshot, cropped clear of the app's own
pins, play buttons and dashboard overlays — and in two cases cropped in to the
cake so her clients' faces are not on the page.

**Three things worth remembering.**

*Finding a circle in a screenshot when the disc is dark.* The light-background
logos were easy to threshold; a dark green disc on a dark blurred background
is not. Detecting "green dominant" missed the specular highlight and the
shaded bottom. What worked: take the horizontal extent from the widest row,
then pick the vertical centre by testing candidates for the one where the ring
*outside* the crop reads neutral (R≈G≈B) and the inside reads green.

*A hero overlay is the wrong instinct for a product business.* The first
version put her cake behind a scrim heavy enough to carry white type, and the
cake disappeared — on a cake designer's site, of all places. The split hero
(copy on green, photograph full-bleed beside it) shows the work and keeps the
type legible. The header still needs its own top scrim, or the nav links wash
out against a pale cake.

*Size a wordmark by height, not width.* `.hero-word` at `width:clamp(...,280px)`
is 223px tall at a 1.26:1 ratio, which pushed the buttons off the first screen
on every laptop. `height:clamp(88px,15vh,150px);width:auto` is the controllable
axis, and two responsive rules were still overriding it by width.

**Still needed from her**: a Web3Forms key or inbox (until then the form hands
the enquiry over as copyable text with a pre-addressed `mailto:` to her Gmail),
a Google Business profile for the review block, and higher-resolution versions
of the Instagram photographs — the grid crops are 428px wide, fine for the
portfolio tiles but not for anything larger.

### Krem&Choc — her own lockup, in gold

Final answer on the logo: her lockup from kremchoc.co.uk, in her gold, with the
rule and the "Bespoke Cakes For Every Occasion" line cropped off — the arched KC
mark with her name beneath it and nothing else.

Assets, all cut from `wordmark.png` / `wordmark-cream.png` (703x560, which hold
the full lockup including the rule and tagline):

  lockup.png   723x440, 1.643:1  gold, arch + name        nav, hero, footer
  arch.png     393x520, 0.756:1  gold, arch alone         loader

Both are flat single-colour artwork over alpha, so FASTOCTREE at 48 colours
takes them from 70-94KB to 16KB with no visible change. The row bands in the
source are ink at 0-213 (arch), 276-426 (name), 489-490 (rule), 532-559
(tagline), so the crop is everything above row 428.

**Size by height, never width.** At 1.643:1 a width in px lands on whatever
height it likes, and the hero call to action goes off screen — the same trap the
1.26:1 wordmark set earlier. Heights: nav clamp(40,4.8vw,54), hero
clamp(74,11vh,112), footer clamp(64,7.4vw,88).

**Hierarchy.** A lockup that carries her name in type competes with the h1 in a
way the round badge never did. It has to read as a signature above the headline,
not as a second headline: roughly two thirds the h1's cap height, with a bigger
gap beneath it than above.

The round badge keyed from her Instagram stays as the favicon set — an outlined
arch is far too fine to survive 32px, where the solid disc and monogram read
cleanly. `logo.png` (the source disc) stays in the repo; `badge.png` was deleted
along with the cream lockup, and PROJECT-NOTES below has the recipe if the
feathered plate is ever wanted again.

Two alignment fixes came with it: the drawer's inline padding now matches the
nav's at every width, so the menu lines up under her logo instead of sitting 9px
further in, and `.nav.solid` went from 0.88 to 0.95 alpha — at 0.88 a cream
heading scrolling under the header ghosted through at about 25 levels, which is
loud behind delicate gold line-work. At 0.95 it is 11 levels, a frosted veil.

### Krem&Choc — her badge, and the ambience layer

Her real logo (the one on her Instagram, not the wordmark on kremchoc.co.uk) is
a gold KC monogram on a dark green disc. That disc is almost exactly the page
green, so pasting the badge straight onto the site produced a dull smudge with
a hard circular edge — it read as a sticker sitting *on* the page.

Ringing it in gold fixed the visibility but made it look pinned on. The answer
was to feather the plate instead: `assets/kremchoc/badge.png` is the badge with
its disc alpha ramped smoothly to zero over the outer third of the radius, while
the gold monogram keeps full alpha. The plate now dissolves into whatever green
is behind it and only the gold stays crisp, so the same file works over the hero
(`--green-2`) and the footer (`--ink`) with no per-surface variant.

Generation (source is the 900x900 `logo.png`):

  r       = radial distance, normalised to the disc radius
  feather = smoothstep(clamp((1 - r) / 0.34, 0, 1))
  ink     = blur(1.2, (R - B > 22) and (luma > 55))     # the gold, softened
  alpha   = plate * feather * 0.94  +  ink * (1 - that)  # gold always solid

Resized to 640 and quantised to 128 colours with FASTOCTREE: 235KB to 32KB with
no visible banding, because the image is one smooth gradient plus the monogram.
Sized by CSS height, never width — see the wordmark note above.

**Ambience.** `.amb` inside the hero carries two very slow blurred blooms and
nine 2-3px gold motes rising on 30-52s loops, plus one still bloom behind the
footer lockup. Everything is `aria-hidden`, clipped by `overflow:hidden` on
`.hero`/`.amb`/`.foot`, and stopped under `prefers-reduced-motion`. The widest
animated layer measured 1317 device pixels, comfortably inside the ~4096dp iOS
paint ceiling.

**Audit change.** The "element outside the viewport" check was failing on every
viewport because the blooms sit deliberately off-canvas. It now skips a node
that is both `aria-hidden` and clipped by an ancestor with `overflow-x: hidden`
or `clip` — such a node cannot spill onto the page, and real horizontal overflow
is still caught by the `scrollWidth > clientWidth` check.

### Krem&Choc — the enquiry goes straight to her inbox

There is no form endpoint yet, and the old no-key path tried `navigator.share`
first. On a phone that opens the system share sheet, and cancelling it landed
the reader on "No problem — the form is still here when you want it", which
reads like the site failed.

Submitting now opens the reader's own mail app, addressed to her, with the
subject naming the occasion and date and the whole enquiry already in the body.
Two things it depends on:

- it must happen inside the submit gesture, or Safari blocks the handover;
- it clicks a temporary `<a href="mailto:…">` rather than assigning
  `location.href` — more reliable across browsers, and testable by stubbing
  `HTMLAnchorElement.prototype.click`.

Underneath the confirmation there is a "Nothing happened? Copy it instead"
button, because a desktop with no mail client configured does nothing visible.
If the clipboard is also unavailable, the full text is printed to select by
hand. The Web3Forms path is untouched and takes over the moment a key is set.

The "Email instead" button inside the Google reviews box is gone. It only
appeared because no Google Business profile is linked yet, and offering email
from inside the reviews box competed with the enquiry form a few hundred pixels
below. When there is no profile to link to, the button is removed outright.

**Ambience, finished.** Every section now carries its own drift: eleven blocks,
108 motes, six blooms. `will-change` came off the motes — a running transform
animation is promoted anyway, and a hundred pre-promoted layers is a real cost
on a cheap phone. Measured under a 6x CPU throttle at iPhone 13 size: 59fps
idle, 58fps while scrolling the whole page.

**Craft.** `text-wrap: balance` on every display line so a heading never ends on
an orphan; Cormorant's own ligatures and old-style figures switched on, with
slightly negative tracking at display sizes; a sheen that crosses the gold
buttons on hover; and one slow sheen across her lockup after the page settles,
masked to the artwork's own alpha so it lights the letterforms rather than a
rectangle over them. That last one needed a symmetric ease — the site's
overshoot curve made the light whip across and then crawl, which reads as a
glitch. Measured: peak brightness 234 against a 149 baseline, over ~750ms.

### Krem&Choc — the zoom bug, the teleporting menu, and her real form

**The zoom bug.** Pinching or tapping a field left every line on the page
displaced. The cause was not the zoom: `.fld input` computed to 15.5px
(`.96rem` against a root of `clamp(15.5px,.55vw + 14px,17px)`), and **iOS
zooms the whole page in the moment a field under 16px takes focus, and never
zooms back out**. The fix is the font size under `(pointer: coarse)`, never
`maximum-scale`, which would take pinch zoom away from anyone who needs it.

Two layout faults rode along with it. `.fld-row` used plain `1fr`, which is
`minmax(auto,1fr)` — a child whose min-content width exceeds its share
overflows the track, and a native date control is exactly that, so its border
ran past the form edge. It is `minmax(0,1fr)` now. And the date control brings
its own intrinsic width and centres its value, so it needed
`-webkit-appearance:none`, `text-align:left` and an explicit `min-height` to
match the field beside it. The audit now checks, at every width, that no field
escapes its column and that nothing on a coarse pointer is under 16px.

**The teleporting menu.** Tapping a drawer link forced `scroll-behavior:auto`
and re-asserted `scrollIntoView` over four frames. That was written to beat
Lenis — but Lenis is gated behind `(pointer: fine)`, so on a phone it was
simply a teleport. Touch now gets its own rAF tween that nothing can fight and
a finger on the glass cancels (`touchstart`/`wheel` → `stopTween`).

The destination is a **function, not a number**. Images decoding and tall
reveal containers splitting as you pass them move the target mid-flight; a
tween aimed at a pixel measured at the start landed 530px short. Re-aiming
every frame lands it on 101px against a 92px target. The audit samples
`pageYOffset` every 30ms and fails on fewer than 8 distinct positions, or on a
single jump longer than half the journey.

**Her real form.** The enquiry now asks what kremchoc.co.uk asks — contact
number, date required, portions (with the 70-80%-of-guests hint), tiers (dummy
tiers available), flavour (white chocolate, traces of nuts; per-tier flavours
agreed after the enquiry), budget (single tier serving ~15 from £70), delivery
postcode, and whether she should suggest designs. Inspiration pictures are
asked for as attachments to the email that opens, which the mailto handover
makes possible and which suits her "inspiration only, no like-for-like copies"
rule. Required fields are checked in the order they are asked, so focus never
jumps backwards up the page.

The drawer's single Instagram button became two centred marks — Instagram and
email, no labels — with where she is based underneath. The labelled cards that
came first were two lines each and the bottom one was being cut off by the
browser chrome on a phone, which is the whole reason the drawer foot has to
stay short. Escape closes the drawer and returns focus to the burger, which it
never did.

### Krem&Choc — the floating enquire bubble is gone

It duplicated the ENQUIRE button that is pinned in the header at every scroll
position, and on a phone it sat over the hero facts. Removed outright: markup,
CSS and the reveal timer that slid it in at 1400ms. The other three sites still
carry their own `.dm-bubble`; this change is Krem&Choc only.

The hero facts now carry a dot on both sides of the last item rather than only
before it. Measured: the list is two lines at 360, 390, 430 and 1024, and one
line at 768 and 1440. On one line the pair reads as a separator and a full
stop; stacked and centred on a phone it flanks the line, so the leading dot is
no longer orphaned out to the left of a centred row.

### Krem&Choc — a tap in the menu arrives, it does not travel

The tween was the wrong answer. A menu tap should land on the section, not
scroll the reader past everything between. But an instant jump on its own is a
snap.

The drawer already covers the whole screen, so it doubles as the curtain. On a
link inside it: freeze its transition so it stays opaque, release the scroll
lock, jump in one `scrollTo`, call `ScrollFXKit.refresh()` so the destination's
reveals fire while it is still hidden, then two frames later restore the
transition and let the drawer dissolve over its usual 450ms. Measured: **two
distinct scroll positions** (0 → 10677), drawer opacity 1 at the moment of the
jump, ten intermediate opacity frames after it. The reader sees the menu
dissolve to reveal a section that is already assembled.

Links *outside* the menu — a hero button, a link in the copy — keep the glide,
because there the page in between is the context. Measured 75 scroll positions
for the hero's "View the portfolio".

**Flaky check fixed.** The marquee sub-pixel assertion sampled six rAF frames.
At ~34px/s a step is ~0.57px, so one dropped or coalesced frame can leave every
delta on a whole number by chance, and it failed a page that was moving
perfectly — twice over a live run. It samples 24 frames now.

### Makeup by Sadia — ambience on a light page

Her page is cream, so the Krem&Choc treatment does not transfer. Two things
had to change.

**Colour.** A bloom darker than the background reads as a smudge, and near-white
cannot be made lighter, so the blooms are warm blush washes — `--nude` and
`--tint` at low alpha, blurred past having an edge — which on cream read as
light rather than shadow. The motes are her `--taupe`, bigger and more opaque
than the gold ones on a dark page: measured, a 3px dot at .4 moved the pixel by
less than a level and was simply invisible.

**Cost.** Per-section mote blocks, the arrangement that costs nothing on the
dark site, cost **fifteen to twenty frames a second here**. Measured on a
6x-throttled phone while scrolling the whole page:

  everything on   33     motes off        55
  blooms off      35     quiet blocks off 53
  will-change     35     contain:strict   32

The blooms are free; the motes inside the sections are not. Each dot animating
inside a section full of photographs makes that region repaint, and this page
is mostly photographs. `will-change` did not help and `contain` made it worse.

The fix is one **fixed** layer for the whole page instead of a set per section:
composited once, never scrolled, so the cost does not grow with the page.
53 vs 54 and 48 vs 58 with it on and off — inside the noise. And because a
fixed layer at z-index 3 sits ABOVE the section backgrounds rather than behind
them, the drift carries across the tinted sections and the footer, which a
layer at the back could never do. It passes in front of the copy, so it runs
fainter than the hero's own set: at .30 a mote crossing a line of text reads as
air rather than as a mark on the screen.

A radial-gradient mote was tried first — it looked better and cost twenty
frames a second, because a gradient layer has to be re-rasterised where a
solid-colour quad goes straight to the compositor. Flat fills only.

The overflow audit for this page picked up the same aria-hidden/clipped
exemption the Krem&Choc one already had.

### The production rollbacks — the actual mechanism

Seven times between 9 and 25 September, billydigitals.com went back to an older
tree and every page built since answered 404. Each time the trigger was a push
to a SIBLING branch based on an older main, and each time the fix was to
restamp and push main again.

The cause is Workers Builds, not the code. Two settings decide it, and the
first one alone is not enough:

  Production branch                 main        <- stops main being ambiguous
  Builds for non-production branches            <- while this is ticked, every
                                                   other branch still BUILDS

A Workers build runs a deploy command. If the non-production deploy command is
`npx wrangler deploy` — the same as production's — then a branch build deploys
over the live Worker regardless of which branch is marked production. The
command that makes a branch build harmless is `npx wrangler versions upload`,
which uploads a version without giving it traffic; unticking non-production
builds altogether does the same thing more bluntly.

### Krem&Choc — landing flush, not twelve pixels low

The anchor landing subtracted the header height PLUS 12px, so every jump left
a 12px strip of the *previous* section showing under the header — a sliver of
the photo band above Flavours, a bar of dark green above Philosophy. Twelve CSS
pixels is about 33 device pixels on a phone, which is why it read as landing in
the wrong place rather than as a hairline.

The landing now subtracts the measured header height and nothing else, on all
three paths: the drawer's jump, the tween for a link outside the menu, and
Lenis on a fine pointer, which had its own hardcoded `offset: -90` against a
103px header. Measured after: 0px on every one. The breathing room above a
heading is the section's own top padding and the landing should not add to it.

`--navh` is now written to the root as well as the drawer, so
`scroll-padding-top` tracks the real header instead of a guessed 92px.

The interaction checks used to assert "top is near 92px", which passed either
way. They now assert the section's top edge sits within 2px of the header's
bottom edge, which is the actual requirement.

### Krem&Choc — why the mark looked blurry, and it was self-inflicted

Two faults, both introduced when the logo assets were first cut:

**1. The arch was enlarged 2.42x.** It was cropped out of `wordmark.png`
(703x560), where the arch occupies only 161x215 px, and then resized up to
393x520. No amount of care downstream recovers detail that was never there.

**2. Both files were quantised to about a dozen alpha levels.** `quantize()`
collapses the alpha channel along with the colour: `lockup.png` had 12 alpha
levels and `arch.png` 11, with a maximum alpha of 244 — so it never even
reached full opacity. Antialiased hairline curves need the full 256 steps;
with eleven, every curve staircases, and that reads as blur. The earlier note
claiming the quantisation cost nothing visible was wrong: it was checked by
file size and a downscaled preview, not by looking at the alpha channel.

**The source.** Her own site serves the lockup at **1600x1600** with a
transparent background
(`kremchoc.co.uk/_assets/media/49a8d930ed58d0cb3ba3086c5d09e0ca.png`). The arch
inside it is 326px tall against the 215px that was being used — so both assets
are now cut from that at native resolution and never enlarged.

**Keeping the file small without wrecking the alpha.** The artwork is one flat
colour plus an alpha ramp, so a PNG palette of 256 identical entries with tRNS
carrying alpha 0..255 stores every alpha level at one byte per pixel:

    im = Image.fromarray(alpha, 'P')
    im.putpalette(list(GOLD) * 256)
    im.save(out, optimize=True, transparency=bytes(range(256)))

Verified byte-identical alpha afterwards. lockup 19KB, arch 8KB — both SMALLER
than the broken quantised versions, with 256 alpha levels instead of eleven.

The loader is sized `clamp(80px,14vh,108px)` rather than 124px so 108 x 3 = 324
sits just inside the arch's true 326px and it is never enlarged on a phone.

**What is still soft, and why it is not fixable here.** Her photographs are the
limit, not the markup. `scripts`-free audit at four viewports, comparing each
image's natural width against CSS width x DPR:

    hero.jpg    900dp available, needs 2458dp on a 2x retina desktop  2.73x
    band.jpg   1800dp available, needs 5120dp                         2.84x
    quote.jpg  1600dp available, needs 5120dp                         3.20x
    g1..g6      760dp available, needs  813dp on a 2x laptop          1.07x

The originals on her own site are 1120x2398 and one 2048x1716 at 22KB. band and
quote were themselves cut larger than their source, so they carry invented
pixels — but re-cutting them means guessing the original crop box, and a fuzzy
match would change WHICH part of her photograph is shown. Left alone
deliberately. The fix is higher-resolution photographs from her, which is
already on the outstanding list.

## Henna by Zainab — Birmingham, B20

`templates/henna-by-zainab.{html,css,js}`, `assets/zainab/`.
@hennaabyzainab_ on Instagram and TikTok. No follower or like counts appear
anywhere on the page: they move, and a number months out of date reads worse
than no number at all.
Unlisted and noindex until she has seen it.

**This page has been built twice and the first one won.** A second version was
made after "it's like the same template on all the websites" — dark plum,
stations hung off a scroll-drawn vine, no nav bar. It was genuinely distinct
and it was rejected outright: *"make actually the previous one, the first one…
this one current is horrible."* The cream build is what ships. The lesson
worth keeping is that "make it different" and "make it better" are not the
same instruction, and the first was answered when the second was wanted.

What was asked for instead: richer, more expensive, more detailed, things
floating in the background, a cuter font, a bigger logo, and the logo matching
the background. All of that is in the cream build now.

**The page is written AS her, in her first person** — "so I know who I am
holding the slot for", "I travel for bridal and for groups over three". Copy
that talks *about* her breaks that the moment it appears, and it crept in twice:
once with the calendar and once with the email routing, which between them said
"she will confirm it by DM", "so she can reply", "she has your enquiry" and
"Opening her DMs". `z-act.mjs` now walks every visible text node and fails on a
third-person reference to her outside the reviews carousel, where a client
saying "she" is the point.

**Everything on the page is hers.** The aftercare, the three policy groups and
the five-item booking list are transcribed word for word from her Instagram
highlights, not paraphrased — they are the terms a client agrees to, and
rewording them changes what was agreed.

### Her mark

**There is no circle anywhere near it.** Her logo file is a disc: a cream plate
with a ring drawn inside it at r 0.85–0.92, the wordmark, "HENNA ARTIST" and a
floral spray. Blending the plate into the page got close but a disc is still a
disc, so the plate and both rings are cut away and only the drawing is left.

Cutting it took three passes, and the first two each lost something:

1. **Alpha from ink distance**, not a threshold — every stroke keeps its own
   antialiasing, which a hard cut staircases.
2. **A cut on radius alone also took the little cone above the "b"**, which
   sits at r 0.93, right inside the ring's band. The ring is the only mark that
   goes all the way round, so it is found by connected component instead: a
   long thin arc sitting at one radius. Two arcs, 8035px and 12902px, spanning
   16 and 20 of 36 sectors.
3. **Killing the labelled arcs still left a faint circle** — every
   sub-threshold pixel of the ring's antialiasing survived. The band is
   blanket-cleared now, with a disc around the cone protected.

The colours are then **un-premultiplied against the plate**, or every
antialiased edge keeps a ghost of the cream and the mark looks milky on
anything darker than it.

Two files come out of it: `mark.png`, the full lockup, and `wordmark.png`, the
script line alone at 3.5:1 for the header — at 48px tall the three-line lockup
is an unreadable smudge. `logo.png` is kept but no longer used by the page.

`z-act.mjs` asserts there is no circle from both ends: nothing on the page
draws one (no border-radius, no ring pseudo-element, no box-shadow) and the
file itself has fully transparent corners and mid-edges.

### Type

Marcellus out, **Gilda Display** in for headings — spaced Roman caps are
handsome but austere, and "cute" was the ask. EB Garamond stays for the body
(it is the voice her own cards are set in) and Parisienne stays for script
accents (it is her brand). None of the three is used on another page here:
Playfair, Cormorant Garamond, Fraunces, Prata and Bodoni Moda already are.

### The things floating past

Her mark is a little floral spray, so what drifts up the page is petals out of
it rather than anonymous dots — two shared inline SVGs, so the whole layer is
two image decodes however many are on screen. They live in the **one fixed
layer** with the existing motes, composited once for the whole document.

**Measured on a 6x-throttled phone**, scrolling: the whole fixed layer costs
about 12fps, the dots about 5 of that, the petals about 2, the paper grain
about 5 and the per-section glows about 4. A phone gets half the petals and
half the dots, which bought all of it back — 59fps idle and 49fps scrolling,
the same as before any of this was added.

Two traps worth remembering:

- **`animation: petal linear infinite` is a shorthand, so it resets
  `animation-duration` to its initial `0s`** — and `.amb-sky b` (0,1,1)
  outranks a bare `.pt-1` (0,1,0). Twelve petals were present, reported
  correctly by every count, and completely motionless. The per-petal rules are
  scoped `.amb-sky .pt-N` now, and `qa-z.mjs` fails the build if any petal
  computes to a 0s duration.
- **A petal with no `bottom` starts at the TOP of the layer.** The whole rise
  then happens off screen: one visible out of twelve.
- **`rotate` and `scale` both force the layer to re-rasterise every frame.**
  The scale is gone; nobody could see it and it was costing frames.

### Detail

- Cards are a gradient rather than a flat fill, with a gold hairline ruled in
  from the edge the way a printed card is, a corner of her floral spray, and
  gold-gradient script numerals.
- Section tags carry a drawn sprig instead of a plain rule, and headings a
  hairline that fades out.
- `.hero-mark` is `display:inline-block` — left inline, a `<span>` ignores
  width and both rings resolved their percentages against the whole text
  column, drawing a circle the size of the hero.
- The eyebrow is `position:relative;z-index:1`: the halo bleeds well past the
  disc and, as a later sibling, was painting over it.

### Pictures

**The hero photograph was changed, not re-cropped.** `hero.jpg` has the bride
left of centre in her own frame with a third of gravel on the right, so on a
phone the subject reads as off to one side and no crop fixes that. `g2.jpg` —
two hands finished in a trailing pattern — fills the frame at every crop the
page asks for and is 980px rather than 766, which also took the hero's
enlargement from 3x to 2.46x on a 5K screen. The bridal shot moved into the
gallery, where its framing is fine.

`group.jpg` is a 653px portrait off her stories and it was being stretched
across a full-width 16:9 band — **3.8x enlarged on an ordinary laptop**. It is
a plate now: held at its own shape and size beside the line it illustrates.
3.8x → 1.32x. `about.jpg` is capped the same way, 1.65x → 1.35x.

### Faults the audits caught this time

- The bigger mark pushed the booking button **under the fold on a landscape
  phone** — the old rule sized `.hero-logo`'s own margin, which now sits inside
  `.hero-mark` and counts for nothing.
- `.nav-cta` was a **36px tap target** on a phone and `.lnk` 42px; em padding
  alone does not reach 44.
- Two test bugs of my own worth recording, because both would have passed a
  broken page: the drawer's class is `open`, not `on`; and **Lenis takes over
  wheel and touch while `lockScroll()` stops Lenis rather than pinning the
  body**, so a `window.scrollTo` probe goes straight round the lock and every
  page looks unlocked. The suite drives a real wheel now.

### The hero picture, and a bug only a real phone showed

On a phone the hero photograph was sitting in a block about **63% of the
screen** with the page showing through beside it. Every viewport in `qa-z.mjs`
measured it at full width, because **Chromium renders it full width and Safari
does not**: Safari resolves a grid item's width FROM its `aspect-ratio` and
height, so `aspect-ratio: 4/5` on `.hero-art` in the one-column mobile hero
produced a box narrower than its column. There is no WebKit build in this
container to reproduce it in, so the fix is the one that removes the trap
rather than works around it: the box states `width:100%` and the **ratio moves
onto the `<img>`**, which no engine derives a container width from.

Both suites now assert the picture reaches both edges — `z-act.mjs` at six
widths, `qa-z.mjs` on every stacked viewport — so this cannot come back
silently on an engine nothing here can run.

While it was open: 4:5 is right on a phone and enormous on a tablet (960px of
photograph at 768 wide), so between 600 and 860px the band goes to 16:10. It
also carries the same inset gold hairline the other pictures do, and the
gradient at its top hand off from the cream rather than starting on a hard
edge.

### Type, measured rather than eyeballed

"Make the font a bit more visible" turned out to be three separate faults,
found by walking every run of text on the page and measuring it against the
ground it actually sits on (`z-contrast.mjs`):

- **`--ink-dim` was 3.17:1 on `--cream`** and `--gold` 3.02:1, both under the
  4.5 body text needs. Those two carried the small italic notes and every
  little gold label on the page. Now 4.6:1 and a separate `--gold-ink` at
  4.9:1 — `--gold` itself stays where it was for rules and ornament, where
  3.1 is the bar.
- **Body size** went from 16.5–18.5px to 17.5–19.5px.
- **The nav over the hero photograph** was 4.61:1 — clearing, but barely. The
  header scrim is deeper and taller: 6.3–6.8:1.

And one that only a pixel read could find. `z-overlay.mjs` renders the page
with overlaid text made transparent, reads the **real backdrop pixels** behind
every run of text that lands on a photograph, and takes the worst one. The
stain captions measured **1.49:1 and 1.21:1** — against a pale hand and
against her own watermark. A scrim over a photograph is only ever as good as
the brightest pixel under it.

So the captions came out of the pictures and sit under them, where the
contrast is fixed and nothing competes. That also resolved a collision nobody
had noticed: **her "Fresh stain" / "Fully developed stain" watermark is baked
into those photographs at exactly the height the overlay caption sat**, so the
page was saying it twice, on top of itself. The caption is just the day now.

Both audits run against the live site as well as the local one.

### The how-to-book section is gone

Her five things and the form ask for exactly the same information in exactly
the same order, so the section was the page saying it twice. One line of hers
lived only there — *"Hands, not just heads: one hand and two are different
jobs"* — and it moved into the form's note for that field rather than being
lost. The deposit terms it also carried are in Policies and in the FAQ
already. `STEPS` and `BOOK_NOTES` are deleted rather than left dead.

Reviews moved to the end. The order is now: welcome → the henna → portfolio →
**enquire** → the stain → aftercare → policies → questions → reviews, with the
tints reassigned by position again and `qa-z.mjs` asserting both that an
enquire section exists and that reviews is last. It also fails on any anchor
pointing at a section that no longer exists, which is how a removal like this
usually leaves a dead link behind.

### The example availability calendar

She has no live diary to read from, and a calendar that **looks** real but is
invented would have someone believing a date is free when it is not. So it
says what it is, in the same register as the Google reviews placeholder, and
picking a day only drops it into the date field — it never claims to have held
anything.

The pattern is **deterministic from the date itself**, not random: a small hash
of the date, with weekends weighted busier. Page forward and back and the same
month comes back identical, which a random fill would not. The suite asserts
exactly that.

**One live line under it, not a standing disclaimer.** Idle, it sells the busy
season: *"Eid and wedding season go first — the earlier you ask, the more of my
diary is still open."* Pick a day and the same line names it and says plainly
that **nothing is held until she confirms it by DM** — which is the moment that
actually matters, because that is when somebody might believe they have booked.
Paging to another month clears it, so a confirmation never outlives the day it
names.

That line no longer carries the word "example", so it moved into the calendar's
header, quiet and always on screen. A grid that looks like a real diary with no
caveat anywhere is how someone ends up believing a date is theirs.

Picking a day says nothing over the form: the day turns henna and the date
field fills in, both already on screen, so a banner on top of that was just
something in the way.

It opens on next month when this one is nearly spent — a grid that is four
fifths greyed out says nothing about when she is free.

**Seven columns cannot be 44px wide on a 320px screen**: that is 308px of cells
before any gutter, padding or gap. The grid gives up its square cells on a
touch screen and takes the 44 on the axis it can, height, with padding and gap
reduced so the width reaches 44 from about 390px up. The viewport audit checks
the height for these cells and says why in the code.

### Order of the page

Reordered so the persuasion comes before the ask and the reference material
after it: welcome → the henna → portfolio → reviews → how to book → **enquire**
→ the stain → aftercare → policies → questions. The nav and the drawer are
built to match. Reordering also broke the tint alternation — two `sec-tint`
sections landed side by side — so the classes are reassigned by position.

The header carried both an "Enquire" link and an "Enquire" button, side by
side. The link is gone.

**Bookings, two routes.** The form sends straight to her inbox through
Web3Forms, and the same message can be taken to her DMs instead. Both are built
from one `compose()`, so the email and the DM can never drift apart.

`W3F_KEY` at the top of the JS is empty until she generates one. **It has to be
generated by her, signed in as the inbox she wants the enquiries in.** With
Web3Forms the key IS the destination: whichever address asks for it is where
every enquiry lands. On the SMartin site a key requested by somebody else sent
two weeks of enquiries to the wrong inbox and nothing looked broken — the form
returned success and showed the thank-you, because Web3Forms had accepted it
and delivered it somewhere else. Until the key is set the send falls through to
the DM route, which is how she takes every booking today, so nothing is broken
in the meantime.

The Instagram and TikTok cards sit **after** the form, across both columns. On
a phone they had been between the calendar and the first field, which put a way
out of the form in the middle of filling it in.

**The form reads as three short asks** — About you / The booking / Anything I
should know — rather than one wall of fields. Optional fields say "optional"
outright; the asterisks are gone, because they were `aria-hidden` and so told a
screen reader nothing the input's own `required` did not.

**The postcode is asked for only when it is needed.** Choose "Please travel to
us" and it appears, required, directly under the Where it answers; choose
anything else and it hides *and clears*, so no postcode is ever sent that
nobody asked for. `[hidden]` is a type-less UA selector that any class rule
setting `display` beats, which is why the stylesheet carries
`[hidden]{display:none!important}`.

**The Where options are said by the person filling the form in.** "At yours in
B20" read as though the visitor lived there; it is "I'll come to you in B20" /
"Please travel to us" / "Not sure yet".

**Until the key is set, Send opens a mail app** with the whole enquiry already
written — the example asked for. Addressed to `CONTACT.email` once she gives
one; until then the To line is blank rather than carrying an invented address
that would bounce silently. The anchor is clicked inside the submit gesture,
because Safari blocks a mailto handover that happens a tick later, and it is an
`<a>` click rather than `location.href`, which some in-app browsers ignore.
It never says "sent".

An email field was added with it: the enquiry now lands in an inbox, so she
needs somewhere to reply to, and `replyto` is set to the visitor rather than to
the form service. It is required on the email route only — on the DM route she
answers in the DM, so asking there would be a wall for nothing.

**A failure is never reported as a success.** The thank-you is shown only after
Web3Forms returns `success: true`; anything else offers a retry and the DM,
with the real reason in the console. `z-act.mjs` proves the whole path by
rewriting the one constant in flight and intercepting the request, so the
shipped file carries no test backdoor and no real enquiry is ever sent — it
asserts the payload, the reply-to, the date written out in words, that the form
clears, and that a 500 does not read as "sent".

Instagram still cannot be sent a message from a link — no URL parameter exists
— so the DM route copies the message and opens her DMs, which remains the
honest maximum.


**Suites.** `qa-z.mjs` (14 viewports), `z-act.mjs` (67 interaction checks),
`sharp.mjs` with `P=henna-by-zainab` (image enlargement), `perf-z.mjs`, and
`perf-why.mjs`, which attributes the frame cost layer by layer.

**Still outstanding from her.** Higher-resolution photographs, `hero.jpg` above
all. Everything here came off Instagram stories at 653–1100px and the page is
built around what those pixels honestly carry. Also a Google Business profile
if she wants real reviews rather than the labelled placeholder layout.

## Strictly Sprinkles (home bakery, Stockton-on-Tees) — `templates/strictly-sprinkles`

Four files: `templates/strictly-sprinkles.{html,css,js}` plus
`templates/strictly-sprinkles-data.js`, and her assets in `assets/strictly/`.
Noindex, like every client demo.

**Two pages, one engine.** `strictly-sprinkles.html` is the home page and
`strictly-sprinkles-menu.html` is the full menu: every price list, the flavour
lists and the seasonal collections. Both load the same CSS, data and JS —
every render step checks for its host element and no-ops if the page does not
have it, so one file serves both. `HAS_BUILDER` guards the order builder,
which only exists on the home page. The home page keeps the category tiles
and a band that routes through to the menu.

**Seasonal is its own list.** `seasonal` in the data file holds the things that
come round with the calendar — Ramadan, Eid, Mehndi, Mother's Day, graduation
— rather than sitting on the menu all year. They carry no prices on purpose: a
figure published for one Ramadan should not still be on the site the next.
Give one a `price` and it appears.

**Test locally with `scratchpad/serve.py`, not `python -m http.server`.** The
site uses clean URLs (`/templates/strictly-sprinkles`), which the plain module
404s, so every cross-page link was untestable. serve.py maps `/foo` to
`foo.html` the way the Worker does.

**The data file is the site.** Every price, size, flavour, product and category
lives in `strictly-sprinkles-data.js`. Nothing in the HTML or the CSS names a
cake. Add an item to a list and it appears in the price list, in the category
tile's count, in the "from" figure and in the order builder's item chooser, and
it starts counting towards the running total — no other edit. Set `price: null`
and the site writes "On enquiry" everywhere instead of a figure, and the builder
stops totalling it. This is what "super customisable" was asked for: she can
reprice the whole shop without touching layout.

**The order builder is the point of the page.** `categories[].opts` decides which
questions each category asks: a cake asks for sponge, filling and frosting; a
box of macarons asks which flavours; a treatbox asks neither. Remove `"sponge"`
from a category and that step stops being rendered *and* the step numbers
renumber themselves. The composed message is built once by `compose()` and sent
down either route — `wa.me` or `mailto:` — so WhatsApp and email can never
drift apart.

**Her logo is used untouched.** `assets/strictly/logo.png` is the disc cut out of
her Instagram profile picture at r=423.5 (425 is the first background pixel) with
a 4× supersampled circular alpha, so it sits on cream and on purple with no
fringe. The purple `#4e4175` and the cream `#fdeae8` are *measured* from it and
from her Flavour Options artwork — the two agree to one point.

**The photographs are a mix, and the mix matters.** `assets/strictly/work/` is
six of her own photographs, cut out of an Instagram grid screenshot at 430px
because every public endpoint for her socials is closed to automated fetching
(Instagram 429/401, TikTok's post list needs signed requests, Facebook 400).
They are real but small — 430px is about half what a retina phone wants. Ask
her for the originals and drop them in at the same names. Everything in
`assets/strictly/photos/` is Pexels stock, copied in from the Amabilis and
Brownielicious libraries; both of those folders are in `.assetsignore`, so a
reference into them would 404 on the web — that is why they are copied rather
than linked.

**The reviews are examples and the page says so.** `reviewsAreExamples` in the
data file puts a marker next to the score. Replace `reviews` with her real
Google reviews and set it to `false`.

**Two things that were measured, not eyeballed.** The tile scrim stops at
rgba(36,29,56,.82) at 34% because at .46 the body copy read 3.1:1 over the
lighter photographs. The marquee transforms each *word* rather than the row:
the row is ~2930px, which at dpr 3 is 8800 device pixels, and iOS silently
declines to paint a moving composited layer that wide. The same reasoning is
why `.band[data-rv]` and `.sec[data-rv]` fade instead of translating.

**Self-hosted fonts.** Fraunces, Jost, Oswald (all variable, one file each) and
Caveat Brush, latin subsets, in `assets/strictly/fonts/`. Google Fonts is not
called at all.
