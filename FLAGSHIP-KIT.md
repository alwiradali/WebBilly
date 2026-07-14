# Billy Digitals — Flagship Kit 🚀

How we build **Huly / Pixel Point-tier** premium sites, fast and repeatably.
Nothing here is paid — it's the same open stack the top agencies use.

## The stack (all free, all already vendored)
- **GSAP + ScrollTrigger** — `templates/vendor/gsap.min.js`, `ScrollTrigger.min.js`
- **Lenis** (smooth scroll) — `templates/vendor/lenis.min.js`
- **Three.js** (3D/WebGL) — `templates/vendor/three.module.js` + `jsm/`
- **Raw WebGL2 GLSL shaders** — for aurora / fluid / particle backgrounds
- Fonts: Space Grotesk (display) + Inter (body)

## Reusable engines (clone, don't rewrite)
| File | What it gives you |
|---|---|
| `templates/atelier.js` | The interaction engine: custom cursor, magnetic buttons, loader, Lenis smooth scroll, kinetic headline reveal, `[data-fade]` scroll reveals, `[data-words]` manifesto reveal, `.h-scroll` horizontal pin, `[data-count]` counters, marquee. **Data-attribute driven — just add the classes.** |
| `templates/orbit.js` | Live full-screen **aurora** WebGL2 shader (domain-warped fbm, pointer-reactive) + a **scroll-assembled product window** timeline. |
| `templates/nova.js` | 24k-point **GPU particle sphere** with bloom, noise displacement, scroll dolly. |
| `templates/orbit.css` | Full premium dark-theme system: nav, hero, bento grid, pinned app window, stats, feature wipe, CTA orbit-ring, footer. |

## Reference flagships (start by cloning one)
- `templates/orbit.html` — SaaS product (Huly-tier). Aurora + assembled UI + bento.
- `templates/nova.html` — Studio/agency. Particle sphere + horizontal scroll.
- `templates/creative.html` (Aether) — 3D crystal experience.
- `templates/noir.html` / `eclat.html` — luxury WebGL flagships.

## Recipe: a new flagship in ~an afternoon
1. **Copy** `orbit.html` + `orbit.css` + `orbit.js` → `<client>.html/.css/.js`.
2. **Reskin tokens** in the CSS `:root`: `--c1/--c2/--c3` (brand colours), fonts, `--bg`.
3. **Swap copy**: hero headline (kinetic `.ln > span` lines), manifesto `[data-words]`, bento cards, capabilities, CTA.
4. **Pick the hero visual**: aurora (orbit.js) / particles (nova.js) / crystal — or write a new GLSL shader for the brand.
5. **Keep the ingredients** that make it feel $90k: loader, custom cursor, magnetic CTAs, smooth scroll, one pinned scroll sequence, kinetic type, a bento grid, a marquee.
6. **Verify**: 0 horizontal overflow desktop + mobile, 60fps, graceful fallback (no-WebGL / reduced-motion reveals everything).
7. Add a card to the homepage **Our Work** showcase.

## The non-negotiables (what separates premium from template)
- Smooth scroll everywhere (Lenis).
- One "how did they do that" moment (a live shader or a scroll-assembled UI).
- Obsessive easing — nothing linear; `power3/power4` eases.
- Restraint: lots of black space, one or two accent colours, big bold type.
- Performance: pause WebGL off-screen, cap DPR, lazy-load, degrade gracefully.
