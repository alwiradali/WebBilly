#!/usr/bin/env node
/* The video walkthrough on a listing page.
 *
 * Two things are being defended. One is that a tenant on a slow connection or
 * an old phone is not made to download a 40MB file before they have decided
 * to watch it. The other is that a 360° video never ends up in a rectangle:
 * equirectangular footage played flat is a warped, unwatchable mess, and
 * nothing in the file says which kind it is — only the role the office set.
 *
 *   node scripts/megacity-video-check.mjs
 */
import { videoHtml, video360Html } from "../worker/studio/render.js";
import { mediaToJson } from "../worker/studio/media.js";

let bad = 0;
const ok = (c, what) => { console.log((c ? "ok   " : "FAIL ") + what); if (!c) bad++; };

const vid = (role, over = {}) => ({ id: "m1", listing_id: "carlton-road-5", kind: "video", role,
  key_orig: "l/carlton-road-5/m_abc1234567/orig.mp4", mime: "video/mp4", width: 1920, height: 1080, ...over });
const cover = { id: "c1", kind: "photo", role: "cover", key_large: "l/carlton-road-5/m_cover00000/w1600.jpg", key_orig: "l/carlton-road-5/m_cover00000/orig.jpg" };
const V = (over = {}) => ({ addrShort: "Carlton Road, Salford", cover, walkthrough: null, video360: null, ...over });

/* ── nothing to show ─────────────────────────────────────────────────────── */
ok(videoHtml(V()) === "", "a property with no video says nothing about one");
ok(videoHtml(V({ walkthrough: vid("video", { key_orig: null }) })) === "",
  "a row with no file behind it produces no player rather than a broken one");

/* ── the walkthrough ─────────────────────────────────────────────────────── */
{
  const h = videoHtml(V({ walkthrough: vid("video") }));
  ok(/<video[^>]*\scontrols/.test(h), "the walkthrough is a plain video with controls");
  ok(/preload="none"/.test(h), "nothing downloads until the tenant presses play");
  ok(/playsinline/.test(h), "it plays in place on an iPhone instead of taking the screen");
  ok(/poster="\/media\/l\/carlton-road-5\/m_cover00000\/w1600\.jpg"/.test(h),
    "the poster is the property's own cover photograph, not a black rectangle");
  ok(/<source src="\/media\/l\/carlton-road-5\/m_abc1234567\/orig\.mp4" type="video\/mp4">/.test(h),
    "it points at the original file, which is what R2 serves with range requests");
  ok(/width="1920" height="1080"/.test(h), "the box is sized before it loads, so the page does not jump");
  ok(/aria-label="Video walkthrough of Carlton Road, Salford"/.test(h), "and it is named for a screen reader");
  ok(/Download it instead/.test(h), "a browser that cannot play it is offered the file");
}

/* ── the one that must not be played flat ────────────────────────────────── */
{
  /* the view builder is what picks these apart; this asserts the rule it uses */
  const media = [vid("video360"), { ...cover, kind: "photo" }];
  const walkthrough = media.find((m) => m.kind === "video" && m.role !== "video360") || null;
  const video360 = media.find((m) => m.kind === "video" && m.role === "video360") || null;
  ok(walkthrough === null, "a 360° video is not picked up as the walkthrough");
  ok(video360 !== null, "it is picked up as a 360° video, which goes on the sphere");
  ok(videoHtml(V({ walkthrough })) === "", "so the flat player is not rendered for it");
}

/* ── both at once ────────────────────────────────────────────────────────── */
{
  const media = [vid("video360", { id: "m2" }), vid("video", { id: "m3" })];
  const walkthrough = media.find((m) => m.kind === "video" && m.role !== "video360");
  ok(walkthrough && walkthrough.id === "m3", "a property can have both, and each is found on its own");
}

/* ── a video is never a listing photograph ───────────────────────────────── */
{
  const j = mediaToJson(vid("video"));
  ok(j.kind === "video" && j.role === "video", "the row keeps its kind and role through the public API");
}

/* ── the 360° video block ────────────────────────────────────────────────── */
{
  const env = { MEGACITY_HOST: "www.megacityproperties.co.uk" };
  const url = new URL("https://www.megacityproperties.co.uk/let/carlton-road-5");
  ok(video360Html(V(), env, url) === "", "no 360° video, no block");

  const h = video360Html(V({ video360: vid("video360"), title: "Carlton Road, Salford" }), env, url);
  ok(/class="pd-v360"/.test(h), "a 360° video gets the sphere viewer, not a flat player");
  ok(!/<video/.test(h), "and no <video> tag in the page — the viewer makes its own when play is pressed");
  ok(/data-src="\/media\/l\/carlton-road-5\/m_abc1234567\/orig\.mp4"/.test(h), "the file is handed to it by address only");
  ok(/data-poster="\/media\/l\/carlton-road-5\/m_cover00000\/w1600\.jpg"/.test(h), "with the property's cover as the still");
  ok(/megacity-video360\.js" defer/.test(h), "the viewer loads deferred, and only on a page that has one");
  ok(/https:\/\/www\.megacityproperties\.co\.uk\/templates\/megacity-video360\.js/.test(h),
    "addressed for this host rather than relatively, so it works at /let/<id>");
}

console.log();
console.log(bad ? `VIDEO: ${bad} FAILED` : "VIDEO: ALL PASS — nothing downloads unasked, and 360° footage never plays flat.");
process.exit(bad ? 1 : 0);
