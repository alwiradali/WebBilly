# HeatFix Mcr — stock photo credits

Every decorative photo on the HeatFix site is licensed stock, downloaded to
`assets/heatfix/` and served from our own origin (no hotlinking). Photos of
actual jobs — `work-01` … `work-12` — are Mohammad Ejaz's own and are not
listed here.

**Pexels** (pexels.com/license): free for commercial use, no attribution
required, modification allowed. Cannot be resold as stock.

**Unsplash** (unsplash.com/license): free for commercial use. The Unsplash API
guidelines ask for a visible photographer credit, so the one Unsplash photo
(`mcr-1`) carries a credit line under the Areas section on the home page, and
its download endpoint was triggered when it was pulled.

| File | Source | Photographer | Original |
|---|---|---|---|
| `about-1` | Pexels | Max Vakhtbovych | https://www.pexels.com/photo/white-counter-top-on-gray-kitchen-cabinets-8146317/ |
| `about-2` | Pexels | Daniel  Wells | https://www.pexels.com/photo/charming-brick-homes-on-shrewsbury-street-35578889/ |
| `band-1` | Pexels | Torsten Dettlaff | https://www.pexels.com/photo/close-up-photography-of-stove-fire-195029/ |
| `blog-1` | Pexels | Pavel Danilyuk | https://www.pexels.com/photo/steel-pipes-with-pressure-gauge-7937300/ |
| `blog-2` | Pexels | Zulfugar Karimov | https://www.pexels.com/photo/chrome-faucet-against-marble-background-34295404/ |
| `blog-3` | Pexels | BOOM 💥 Photography | https://www.pexels.com/photo/hand-of-a-person-turning-the-radiator-valve-12644994/ |
| `blog-4` | Pexels | Vidal Balielo Jr. | https://www.pexels.com/photo/black-gas-stove-on-kitchen-counter-11295908/ |
| `faq-1` | Pexels | МОБО Модульные Котельные | https://www.pexels.com/photo/engineer-adjusting-industrial-pipes-in-factory-34938441/ |
| `hero-1` | Pexels | Heiko Ruth | https://www.pexels.com/photo/plumber-repairing-power-source-7859953/ |
| `hero-2` | Pexels | Max Vakhtbovych | https://www.pexels.com/photo/brown-and-white-counter-in-the-kitchen-8146322/ |
| `hero-3` | Pexels | Sonny Sixteen | https://www.pexels.com/photo/close-up-of-pipes-14845870/ |
| `hero-4` | Pexels | Skylar Kang | https://www.pexels.com/photo/finned-white-radiator-near-wall-6045338/ |
| `hero-5` | Pexels | Nishant Aneja | https://www.pexels.com/photo/close-up-of-wrench-and-tools-12105083/ |
| `hero-6` | Pexels | Max Vakhtbovych | https://www.pexels.com/photo/toilet-and-sink-in-modern-light-bathroom-6890406/ |
| `mcr-1` | Unsplash | Greg Willson | https://unsplash.com/photos/brown-concrete-building-during-daytime-fFUBw5bF38s |
| `safety-1` | Pexels | Cnordic Nordic | https://www.pexels.com/photo/man-holding-a-handheld-air-quality-analyzer-device-30428330/ |
| `safety-2` | Pexels | Pavel Danilyuk | https://www.pexels.com/photo/man-in-gray-overall-standing-in-front-of-woman-7190862/ |
| `svc-bathroom` | Pexels | Max Vakhtbovych | https://www.pexels.com/photo/bathroom-with-shower-and-bathtub-6438751/ |
| `svc-cooker` | Pexels | RDNE Stock project | https://www.pexels.com/photo/frying-on-a-gas-stove-5737568/ |
| `svc-cylinder` | Pexels | Pavel Danilyuk | https://www.pexels.com/photo/steel-underground-heating-manifolds-7937299/ |
| `svc-install` | Pexels | МОБО Модульные Котельные | https://www.pexels.com/photo/engineer-assembling-industrial-heating-unit-34938443/ |
| `svc-plumbing` | Pexels | Castorly Stock | https://www.pexels.com/photo/person-washing-shaver-on-sink-3944863/ |
| `svc-repair` | Pexels | МОБО Модульные Котельные | https://www.pexels.com/photo/technician-repairing-heating-system-in-workshop-34938439/ |

## Background animation

No stock video. The background is drawn in the browser by
`assets/js/heatfix-bg.js`: an orthogonal pipe network in pale navy with pulses
of flow running through it — cool blue on the way out, warm amber on the way
back. Nothing to license, nothing to download, about 4KB gzipped, and the
paths are generated fresh on every load so no two visits are identical.

It is one fixed layer behind the whole page (`<div class="site-fx"
data-heatfx="circuit">`, first thing in the body), not a per-section effect.
That means the paper colour lives on `<html>` rather than `<body>` — while it
sits on `<body>` it propagates to the root canvas and paints over any
`z-index:-1` child, so the layer would never be visible.

A radial mask keeps it strong out in the gutters and settles it down through
the middle, where the words are; the phone breakpoint holds it back further
still because there are no gutters to hide in.

Two stacked canvases: the pipework is painted once and never touched again, so
the frame loop only clears and strokes the pulse layer — measured at 0.002ms of
2D work per frame. Capped at 30fps, paused when scrolled out of view or the tab
is hidden, and one still frame under `prefers-reduced-motion`.

Every page carries it except the invoice builder, which is the tool Ejaz fills
in on a job — motion behind form fields is noise. The customer-facing `/i` view
does have it.

## Reviews

The reviews live on Ejaz's Yell profile:
https://www.yell.com/biz/heatfix-mcr-ltd-manchester-10187176/

There is no public Yell reviews API, so nothing on the page fetches them. Two
ways to get them onto the site:

1. **Live (what he asked for).** Yell's own widget, from the Yell account:
   Reputation Manager → Reviews → Widgets → Create. Paste the embed code Yell
   gives you inside `<div id="yellWidget">` on the home page and it takes over
   the section — the hand-typed list below it is suppressed automatically. Note
   the widget caps at five reviews per page. Reputation Manager is part of a
   paid Yell package, so check the account has it.

2. **By hand, until then.** Copy real Yell reviews word for word into the
   `HF_REVIEWS` array near the bottom of `templates/heatfixmcr.html`. A "Reviews
   from our Yell profile" line appears under them automatically.

Nothing is ever invented, and the star rating is not hard-coded anywhere — a
number typed into the page goes stale silently and becomes a false claim.
