# Halcyon — premium estate platform

A complete property ecosystem living at **`/halcyon/`**: a public marketplace,
a business back office ("Halcyon Studio"), and a 360 Tour Studio that plugs
into the existing **billy360** platform rather than rebuilding it. Vanilla
HTML/CSS/JS, no build step, served as static assets on the same Cloudflare
Worker as the rest of the site.

## Map of the platform

| Surface | Path | What it is |
|---|---|---|
| Homepage | `/halcyon/` | Cinematic hero (rotating featured stock), search panel, CMS-ordered sections |
| Search | `/halcyon/search` | Split-screen results ↔ bespoke canvas map: clustering, price pills, hover sync, draw-a-search-area |
| Property | `/halcyon/property?id=<slug>` | Full-screen hero, immersive gallery, "Explore the home" room navigation, floor plan SVG, mortgage/stamp-duty calculators, EPC, schools/transport, viewing modal, 360 overlay |
| Compare | `/halcyon/compare` | Up to 4 homes side-by-side, best-value highlighting |
| Valuation | `/halcyon/valuation` | 7-step fintech-style walkthrough → animated estimate range → lead |
| Account | `/halcyon/account` | Saved homes, saved searches + alert toggles, recently viewed, viewing requests, **My Property Journey** |
| Areas | `/halcyon/areas` (+`?area=`) | Editorial guides with market stats |
| Developments | `/halcyon/developments` | Developer spotlight blocks |
| Agents | `/halcyon/agents` | Team with live response metrics |
| **Studio** | `/halcyon/studio/` | Admin OS: dashboard, analytics, property manager + media manager, CRM kanban, viewings calendar, agents, landlords, advertising, payments, CMS/website builder, settings. Role switcher: **Admin / Agent / Landlord** — three portals, one shell. `⌘K` command palette. |
| 360 Tour Studio | `/halcyon/studio/#/tours` | Tour registry, connect-a-tour wizard, preview, publish, embed-code generator, tour analytics |
| Widget | `/halcyon/embed.js` + `widget.html` | Drop Halcyon listings into ANY host website (iframe, auto-height) |

## Architecture (API-first)

```
Pages (public + studio + widget)
        │  only ever call
        ▼
HAL.api  (js/api.js)  — Promise-based, REST-shaped
        │
        ├─ demo: seed data (js/data.js) + localStorage overlay
        └─ production: same method signatures → fetch('/api/v1/…')
```

Entities: User, Agent, Landlord, Property (+Media/Amenity/Location/Listing),
PropertyViewing, PropertyEnquiry, SavedProperty, SavedSearch, VirtualTour,
Promotion/Campaign, Payment/Invoice, AnalyticsEvent, ContentPage(Section/Copy),
Area, Development, Review — all reachable through `HAL.api.*`.

Because no page touches the seed data directly, the front end is ready to be
re-hosted as a PWA or wrapped as an iOS/Android shell: swap `api.js` bodies
for `fetch()` and nothing else changes.

### Natural-language search — real, not faked
`HAL.api.search.parse("3-bed house in Didsbury under £900k with a garden")`
translates text → structured filters with a deterministic parser today. The
method is the seam where an LLM endpoint slots in later, returning the same
filter object. The same pattern holds for image auto-tagging in the media
manager (`autoTag()` → `/api/v1/media/classify`) and AI recommendations.

## 360 integration — billy360 is the engine, Halcyon is the socket

- Registry row: `{ propertyId, provider, tourId, room, embedUrl, status }`
- Public page: `api.tours.forProperty(id)` → "Enter virtual tour" overlay
  (lazy iframe onto `/billy360/?site=<id>&embed=1`).
- Studio mints host-agnostic embed snippets (drop-in script via
  `/billy360/embed.js`, or plain iframe) that work on GoDaddy, Squarespace,
  WordPress, Webflow or hand-written HTML.
- `provider` field keeps the socket open for other engines; authentication for
  private tours is a signed URL added server-side — snippets never change.
- Scenes, hotspots, floor plans and branding stay authored in billy360's own
  capture studio. **Nothing about the engine is duplicated.**

## Design system

- Public (`css/halcyon.css`): warm paper `#f5f2ea`, ink `#16150f`, bronze
  `#a07c48`/champagne `#d5b98e`; Playfair Display (editorial serif), Inter
  (body), Space Grotesk (data/labels). Fine 1px lines, sharp corners,
  buttons/inputs/cards/chips/modals/drawers/toasts/skeletons/empty/error
  states, compare tray, bottom mobile nav.
- Studio (`css/studio.css`): its own dark OS scale — panels `#14161c`,
  hairlines, Linear-style sidebar, kanban, drawer editor, media grid, charts.
- Motion: global `data-fx` toolkit (scroll-fx) for reveals/parallax/stagger;
  `js/motion.js` adds hero crossfade, magnetic buttons, cursor dot, counters,
  page-transition veil, card tilt. Everything transform/opacity;
  `prefers-reduced-motion` collapses it all gracefully.
- Chart palette (Studio): single-series marks use champagne; multi-category
  charts use the validated dark trio `#3987e5 / #d95926 / #199e70`
  (CVD-checked against surface `#14161c`; legends + direct labels always
  accompany color).

## Map engine (`js/map.js`)

Dependency-free canvas map — night-ink ground with procedurally seeded street
grain, rivers and parks; real lat/lng via a Mercator-ish projection. Features:
pan/zoom/pinch, clustering, price-pill markers (sponsored get a champagne
ring), hover ↔ card sync, click-to-select, fit-to-results, polygon
draw-a-search-area, keyboard operation. The public surface
(`setData/on/flyTo/bounds/fit/draw*`) is the contract for swapping in
Mapbox/MapLibre later without touching the search page.

## Performance & accessibility

- Unsplash imagery served responsively (`srcset` 480→2000, `auto=format` ⇒
  AVIF/WebP), lazy-loaded below the fold, `fetchpriority=high` on heroes,
  broken images degrade to a branded placeholder.
- 360 tours and the homepage tour frame load only on demand; the map renders
  on rAF only when dirty; animations are transform/opacity.
- Skip links, focus-trapped modals, aria labels/live regions, keyboard map,
  WCAG-minded contrast, `prefers-reduced-motion` respected everywhere.
- Demo pages are `noindex` per repo policy; full SEO scaffolding is in place
  (semantic HTML, OG/Twitter, canonical, breadcrumbs, RealEstateAgent +
  Residence/Offer JSON-LD) — remove `noindex` at launch.

## Payments & security posture

Stripe-ready: the studio calls `api.payments.createCheckout()` whose
production body is `POST /api/v1/payments/checkout` on the Worker
(`STRIPE_SECRET_KEY` as a Worker secret; webhooks reconcile invoices).
No secrets in front-end code. All rendered strings pass through `esc()`;
role-based access is modelled in Settings and enforced per-token at the API
layer in production.

## Demo data

19 listings across Manchester / Cheshire / London (sales, rentals, commercial,
shared-ownership, retirement, investment), 3 developments, 10 area guides,
4 agents, 3 landlords, 12-lead CRM pipeline, 5 campaigns, invoices and tours.
Photography via Unsplash (Unsplash License). Reset any time from
Studio → Settings.
