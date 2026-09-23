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
