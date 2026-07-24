# Scroll-FX toolkit (global)

A reusable, opt-in scroll-effects system. Add the two global files to any page,
then tag elements with `data-fx="…"`. No framework, no build step.

```html
<link rel="stylesheet" href="assets/css/scroll-fx.css">
<script src="assets/js/scroll-fx.js" defer></script>
```

(Both are already loaded on `index.html`. Adjust the relative path for pages in
subfolders, e.g. `../assets/…` inside `templates/`.)

## Effects

| `data-fx` | What it does | Options |
|-----------|--------------|---------|
| `reveal` | Fades + slides in when it enters the viewport | `data-fx-variant="up\|down\|left\|right\|scale"` (default up), `data-fx-delay="150"` (ms) |
| `stagger` | Reveals direct children one after another | `data-fx-step="100"` (ms between children), `data-fx-delay` (ms base) |
| `text` | Splits into words that rise in line-by-line | `data-fx-step="50"` (ms per word), `data-fx-delay` (ms base) |
| `parallax` | Drifts at a different speed to the scroll | `data-fx-speed="0.25"` (−1…1; higher = more drift) |
| `pin` | Sticky section that exposes `--fx-progress` (0→1) to drive child transforms | wrap content in `.fx-pin-inner`; set a tall height e.g. `style="height:300vh"` |
| `horizontal` | Scrolls a row sideways while the section is pinned | `.fx-h-sticky > .fx-h-track`; set a tall height |
| `progressbar` | Fixed top page-scroll indicator | colour via `style="color:#38bdf8"` |

## Examples

```html
<h2 data-fx="reveal">Fades up on scroll</h2>
<img data-fx="reveal" data-fx-variant="scale" data-fx-delay="150" src="…">

<ul data-fx="stagger" data-fx-step="100">
  <li>One</li><li>Two</li><li>Three</li>
</ul>

<h1 data-fx="text">Words rise in one at a time</h1>

<div data-fx="parallax" data-fx-speed="0.25"><img src="bg.jpg"></div>

<section data-fx="pin" style="height:300vh">
  <div class="fx-pin-inner"><img class="hero" src="…"></div>
</section>
<!-- drive from progress in CSS: .hero{transform:scale(calc(1 + var(--fx-progress)*0.3))} -->

<section data-fx="horizontal" style="height:300vh">
  <div class="fx-h-sticky"><div class="fx-h-track"><!-- cards --></div></div>
</section>

<div data-fx="progressbar" style="color:#38bdf8"></div>
```

## Notes
- Purely additive — does not affect the legacy `.reveal` class or the hero
  parallax that predate it (those live in the same two files, above the toolkit).
- Respects `prefers-reduced-motion` (transitions off; progress bar still updates).
- Global feel is controlled by the tokens at the top of the toolkit CSS block:
  `--fx-dur`, `--fx-ease`, `--fx-distance`.
- After injecting content dynamically, call `window.ScrollFXKit.refresh()` (or
  `refresh(rootEl)`) to scan the new nodes.

**Convention:** whenever new scroll effects / animations are requested, use this
`data-fx` system rather than hand-rolling per-page one-offs.
