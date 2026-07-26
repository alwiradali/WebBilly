# Billy Digitals — Promo Reel

A 9:16 (1080×1920) animated advert built in plain HTML/CSS/JS. No video editor,
no After Effects — open `reel.html` and it plays on a loop.

## Files
- `reel.html` — the whole reel: design tokens, layout, and timeline
- `reel-shots.js` — the site screenshots shown on the device (swap for client work)

## Editing it

**Colours and type** — the `:root` block at the top of `reel.html`.
`--gold` is the offer/CTA accent; `--c1/--c2/--c3` are the brand blues.

**Copy, contact details and timings** — the `CONFIG` object in the `<script>`.
Change the offer, the deadline, the phone number or any scene timing there.

**The sites on screen** — replace the four images in `reel-shots.js`
(base64 data URIs, so the file stays self-contained).

## Scenes
| Time | Scene |
|------|-------|
| 0.0–2.9s | Hook — headline rises on a dark slab |
| 2.9–4.4s | The slab cracks apart, light spills through |
| 3.6–8.6s | Showcase — headline, device cycling real sites, count-up stats |
| 8.6–13.0s | Offer card — £100 off, deadline, CTA, contact details |

## Exporting to MP4
The timeline is a pure function of `t` (`window.__renderAt(seconds)`), so every
frame is deterministic — screenshot frame by frame and encode. Or just screen-record
it: click **● Recording mode** to hide the on-screen buttons, then **↻ Replay**.
