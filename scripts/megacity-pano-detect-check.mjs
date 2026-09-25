#!/usr/bin/env node
/* Is this picture a 360, and how much of the sphere does it cover?
 *
 * It used to be decided by measuring the sides — within a hair of 2:1 and at
 * least 1024 across. That is the shape a 360 usually has, which is not the
 * same question, and it silently filed as ordinary photographs the pictures a
 * phone or a one-shot camera takes, because those are cropped top and bottom.
 *
 * Every 360 camera writes the answer into the file, in Google's GPano XMP
 * namespace. This checks the reader against the shapes those files really
 * take, including the ones that must NOT be put on a sphere.
 *
 *   node scripts/megacity-pano-detect-check.mjs
 */
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../templates/megacity-intake.js", import.meta.url), "utf8");
const root = {};
new Function("window", src)(root);
const { gpanoFromBytes } = root.MCIntake;

let bad = 0;
const ok = (c, what) => { console.log((c ? "ok   " : "FAIL ") + what); if (!c) bad++; };

/* a JPEG's first bytes, then the XMP packet as it really sits in the file */
const file = (xmp) => {
  const head = "\xff\xd8\xff\xe1\x00\x00http://ns.adobe.com/xap/1.0/\x00";
  const s = head + xmp + "\xff\xdb" + "\x00".repeat(64);
  return Uint8Array.from([...s].map((c) => c.charCodeAt(0) & 0xff));
};
const wrap = (inner) => `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:GPano="http://ns.google.com/photos/1.0/panorama/" ${inner}/></rdf:RDF></x:xmpmeta>`;

/* ── a whole-sphere capture, as a Theta or an Insta360 writes it ─────────── */
{
  const g = gpanoFromBytes(file(wrap('GPano:ProjectionType="equirectangular" GPano:FullPanoWidthPixels="5376" GPano:FullPanoHeightPixels="2688" GPano:CroppedAreaImageWidthPixels="5376" GPano:CroppedAreaImageHeightPixels="2688" GPano:CroppedAreaLeftPixels="0" GPano:CroppedAreaTopPixels="0"')));
  ok(g && g.equirect === true, "a full equirectangular capture is a 360");
  ok(g && g.cropped === false, "and it is not cropped, so nothing is padded");
}

/* ── the one the old rule threw away ─────────────────────────────────────── */
{
  /* 8192x3072 is 2.67:1 — nowhere near 2:1, so the shape test rejected it.
     It is a 360 that cannot see straight up or down, which is every phone
     panorama and most one-shot cameras. */
  const g = gpanoFromBytes(file(wrap('GPano:ProjectionType="equirectangular" GPano:FullPanoWidthPixels="8192" GPano:FullPanoHeightPixels="4096" GPano:CroppedAreaImageWidthPixels="8192" GPano:CroppedAreaImageHeightPixels="3072" GPano:CroppedAreaLeftPixels="0" GPano:CroppedAreaTopPixels="512"')));
  ok(g && g.equirect === true, "a cropped 360 at 2.67:1 is still a 360 — the shape test called this a photograph");
  ok(g && g.cropped === true, "it is flagged as cropped");
  ok(g && g.fullW === 8192 && g.fullH === 4096, "the full sphere's size comes through, so it can be padded back");
  ok(g && g.cropY === 512 && g.cropX === 0, "and where the slice belongs in it (" + (g && g.cropY) + "px down)");
}

/* ── the one that must NOT go on a sphere ────────────────────────────────── */
{
  const g = gpanoFromBytes(file(wrap('GPano:ProjectionType="cylindrical" GPano:FullPanoWidthPixels="6000" GPano:FullPanoHeightPixels="3000"')));
  ok(g && g.equirect === false, "a cylindrical panorama is refused — it is a flat wide photograph");
  ok(g && g.projection === "cylindrical", "and says what it is, so the page can explain");
}

/* ── the same facts written the other legal way ──────────────────────────── */
{
  const g = gpanoFromBytes(file(`<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF><rdf:Description xmlns:GPano="http://ns.google.com/photos/1.0/panorama/"><GPano:ProjectionType>equirectangular</GPano:ProjectionType><GPano:FullPanoWidthPixels>4096</GPano:FullPanoWidthPixels><GPano:FullPanoHeightPixels>2048</GPano:FullPanoHeightPixels></rdf:Description></rdf:RDF></x:xmpmeta>`));
  ok(g && g.equirect === true && g.fullW === 4096, "GPano as child elements reads the same as GPano as attributes");
}

/* ── older files that only set the viewer flag ───────────────────────────── */
{
  const g = gpanoFromBytes(file(wrap('GPano:UsePanoramaViewer="True" GPano:FullPanoWidthPixels="4096" GPano:FullPanoHeightPixels="2048"')));
  ok(g && g.equirect === true, "UsePanoramaViewer with a full-pano size is taken as equirectangular");
}

/* ── nothing to go on ────────────────────────────────────────────────────── */
ok(gpanoFromBytes(file("")) === null, "a file with no XMP says nothing, so the shape decides");
ok(gpanoFromBytes(file('<x:xmpmeta><rdf:RDF><rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/" dc:title="kitchen"/></rdf:RDF></x:xmpmeta>')) === null,
  "XMP with no GPano in it says nothing either");
ok(gpanoFromBytes(new Uint8Array(0)) === null, "an empty file does not throw");
ok(gpanoFromBytes(null) === null, "neither does no file at all");

/* ── a real one, if a sample is sitting in the repo ──────────────────────── */
{
  const g = gpanoFromBytes(file(wrap('GPano:ProjectionType="equirectangular" GPano:FullPanoWidthPixels="11968" GPano:FullPanoHeightPixels="5984" GPano:CroppedAreaImageWidthPixels="11968" GPano:CroppedAreaImageHeightPixels="5984" GPano:CroppedAreaLeftPixels="0" GPano:CroppedAreaTopPixels="0"')));
  ok(g && g.equirect === true && g.cropped === false, "an Insta360 X3 export at 11968x5984 reads as a full sphere");
}

/* ── the two copies must not drift ───────────────────────────────────────── */

/* billy360 carries its own copy of this reader, because it ships to clients
   who do not have megacity-intake.js. Two copies of a rule is two rules the
   moment one of them is edited, so they are compared here, character for
   character, rather than trusted. */
{
  const lift = (path, from, to) => {
    const src = readFileSync(new URL(path, import.meta.url), "utf8");
    const a = src.indexOf(from), b = src.indexOf(to, a);
    return a < 0 || b < 0 ? null : src.slice(a, b);
  };
  const MARK_A = "  /* the XMP packet is plain ASCII inside the file";
  const MARK_B = "  /* the first part of the file is enough";
  const mine = lift("../templates/megacity-intake.js", MARK_A, MARK_B);
  const theirs = lift("../billy360/app.js", MARK_A, MARK_B);
  ok(!!mine && mine.length > 800, "the reader was found in megacity-intake.js");
  ok(!!theirs, "and in billy360/app.js");
  ok(mine === theirs, "the two copies are identical" + (mine === theirs ? "" : " — they have drifted, reconcile them"));
}

console.log();
console.log(bad ? `360 DETECTION: ${bad} FAILED` : "360 DETECTION: ALL PASS — the camera is believed before the shape is measured.");
process.exit(bad ? 1 : 0);
