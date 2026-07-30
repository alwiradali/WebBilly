# Bay Beauty by Bayan — site notes

Luxury mobile makeup artist site. Pages (clean URLs):
- `/bay-beauty` — main landing (3D animated hero, services, gallery, pricing, occasions, process, reel, testimonials, shop teaser)
- `/bay-beauty-booking` — booking form → WhatsApp confirmation
- `/bay-beauty-shop` — boutique with cart + WhatsApp checkout

All three share `bb.css`, `bb.js` (interactions + AI chat concierge), `bb-gl.js` (WebGL hero).
The logo (`bb-logo.png`) is Bayan's original — **do not alter**.

## ✏️ Update real details (one place)
Edit `BB.config` at the top of **`assets/baybeauty/bb.js`**:
- `phoneDisplay`, `whatsapp` (digits only, e.g. `447123456789`), `email`, `facebook`.
- Instagram `@officialbaybeautybb` and TikTok `@officialbaybeauty2` are already set.

WhatsApp is the booking + checkout backend — no server needed. Every "Book" / "Checkout"
opens WhatsApp with the details pre-filled.

## 🎬 Add the hero reel (premium cinematic hero)
1. Drop the video at `assets/baybeauty/hero.mp4` (mp4, ~1080p, muted-friendly).
2. In `bay-beauty.html`, change the hero `<source>` to:
   `<source src="/assets/baybeauty/hero.mp4" type="video/mp4">`
That's it — it auto-detects, colour-grades it (vignette, grain, gold scrim, slow push-in)
and floats gold dust on top. The reel section (`#reel`) works the same way.

## 🤖 AI chat
"Bay" is a local knowledge-base concierge (prices, bridal, booking, areas) — instant, offline.
To upgrade to a live LLM, replace `replyFor()` in `bb.js` with a `fetch()` to your endpoint.
