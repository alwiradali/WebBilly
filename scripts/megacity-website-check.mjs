#!/usr/bin/env node
/* Studio → Website: the words, photos, logo and announcement bar Walid edits
   himself. What must hold:

   - every public page is in the index, and every editable element has an id
     the index knows (a template edited without re-indexing would ship
     elements the Studio cannot see);
   - an edit can carry emphasis, line breaks and safe links, and nothing else —
     no script, no attribute, no javascript: link, whatever is pasted;
   - an 8% can never lose "inc. VAT" or "first tenancy";
   - an announcement's last day is judged in UK time;
   and, against a running Worker (--live), what a visitor actually receives:
   the edited heading, the replaced photo, the logo, the bar — and the original
   back the moment an edit is undone.

     node scripts/megacity-website-check.mjs
     node scripts/megacity-website-check.mjs --live http://localhost:8788 --token <OFFICE_SETUP_TOKEN>
       (wrangler dev --env megacity --local --var MEGACITY_HOST:localhost --var OFFICE_SETUP_TOKEN:<token>)
*/
import { build, PAGES } from "./megacity-content-index.mjs";
import { sanitize, feeProblem, announcementLive, plainText } from "../worker/studio/site.js";
import * as urls from "../worker/studio/urls.js";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

let bad = 0;
const ok = (c, what, got) => { console.log((c ? "ok   " : "FAIL ") + what + (c || got === undefined ? "" : "   got " + JSON.stringify(got))); if (!c) bad++; };

/* ── the index ─────────────────────────────────────────────────────────── */
const { index, problems } = build({ write: false });
ok(!problems.length, "every editable element has an id and the index is current", problems);
ok(JSON.stringify(PAGES.map((p) => p[0]).sort()) === JSON.stringify([...urls.PUBLIC_STATIC_SLUGS].sort()), "the Studio lists exactly the public pages");
const ids = index.pages.flatMap((p) => p.items.map((i) => i.id));
ok(new Set(ids).size === ids.length, `${ids.length} ids, none used twice`);
ok(!index.pages.some((p) => p.items.some((i) => /<(form|input|select|script|svg|img|div|p)\b/i.test(i.html || ""))), "no editable element contains a form field, a script, a picture or a block");
/* The deploy is run from Windows, where Git checks files out with CRLF line
   endings. On 25 September the index compared byte for byte, called itself
   out of date on his machine, and stopped the build — so the deploy re-sent
   the previous build and nothing changed. The same pages with CRLF endings
   must give the same index and no problems. */
{
  const tmp = mkdtempSync(join(tmpdir(), "mc-crlf-"));
  mkdirSync(join(tmp, "templates"));
  for (const [slug] of PAGES) {
    const f = `templates/megacity-${slug}.html`;
    writeFileSync(join(tmp, f), readFileSync(new URL("../" + f, import.meta.url), "utf8").replace(/\n/g, "\r\n"));
  }
  writeFileSync(join(tmp, "templates/megacity-content.json"),
    readFileSync(new URL("../templates/megacity-content.json", import.meta.url), "utf8").replace(/\n/g, "\r\n"));
  const crlf = build({ write: false, root: pathToFileURL(tmp + "/") });
  ok(!crlf.problems.length, "a Windows checkout (CRLF line endings) builds: the index is not called out of date", crlf.problems);
  ok(JSON.stringify(crlf.index) === JSON.stringify(index), "and gives exactly the same index");
  rmSync(tmp, { recursive: true, force: true });
}
const tenants = index.pages.find((p) => p.slug === "renting");
ok(tenants.items.some((i) => i.kind === "hero") && tenants.items.some((i) => i.kind === "heading" && /Megacity/.test(i.text)), "the tenants page offers its banner photo and its headline");

/* ── what an edit may contain ─────────────────────────────────────────── */
const S = (h, o) => sanitize(h, o);
ok(S("Hello <b>there</b>") === "Hello <b>there</b>", "bold survives");
ok(S("<script>alert(1)</script>Hi") === "Hi", "a script is removed with its contents");
ok(S('<a href="javascript:alert(1)">x</a>') === "x", "a javascript: link loses the link, keeps the word");
ok(S('<a href="/valuation" onclick="x()" style="color:red">Book</a>') === '<a href="/valuation">Book</a>', "a link keeps only its safe address");
ok(S('<a href="valuation">Book</a>') === '<a href="/valuation">Book</a>', 'a page name typed as a link becomes "/valuation"');
ok(S('<img src=x onerror="alert(1)">Text') === "Text", "an image with a handler is dropped");
ok(S("<div>One</div><div>Two</div>") === "One<br>Two", "the editor's own paragraphs become line breaks");
ok(S("Tom &amp; Jerry <3") === "Tom &amp; Jerry &lt;3", "text is escaped, never markup");
ok(S("<em>unclosed") === "<em>unclosed</em>", "an unclosed tag is closed");
ok(S("Line<br>two", { inline: true }) === "Line two", "a button stays on one line");
let threw = false; try { S("x".repeat(3000)); } catch { threw = true; }
ok(threw, "a paragraph longer than 2000 characters is refused");
ok(plainText("A <b>b</b>&nbsp;c") === "A b c", "the plain text of an edit is what the fee rule reads");

/* ── the fee rule ─────────────────────────────────────────────────────── */
ok(!!feeProblem("From 8% for letting", "8% inc. VAT for the first tenancy"), "8% without VAT and first tenancy is refused");
ok(!!feeProblem("From 8% inc. VAT", ""), "8% with VAT but not first tenancy is refused");
ok(feeProblem("From 8% inc. VAT for the first tenancy", "") === null, "8% inc. VAT for the first tenancy is fine");
ok(!!feeProblem("Full management 12%", "10% inc. VAT"), "a percentage that used to say VAT still has to");
ok(feeProblem("Rent collection 5% inc. VAT", "5% inc. VAT") === null, "and is fine when it does");
ok(feeProblem("Friendly local team", "") === null, "words with no percentage are not checked");

/* ── the announcement's last day, in UK time ──────────────────────────── */
const a = { on: true, text: "x", until: "2026-10-31" };
ok(announcementLive(a, new Date("2026-10-31T23:30:00Z")) === true, "the last day still shows at 23:30 in London (GMT)");
ok(announcementLive(a, new Date("2026-11-01T00:30:00Z")) === false, "and is gone the next morning");
ok(announcementLive({ ...a, until: "2026-09-30" }, new Date("2026-09-30T22:30:00Z")) === true, "summer time: 23:30 BST on the last day still shows");
ok(announcementLive({ ...a, on: false }) === false, "switched off is off");
ok(announcementLive({ on: true, text: "" }) === false, "an empty bar never shows");

/* ── the same edit on the test address, before go-live ──────────────────
   Edits are stored with links in root form ("/valuation"); on the demo
   address the page is /templates/megacity-valuation. On 25 September an
   announcement saved in the Studio never appeared on the test site at all,
   because the edits were only applied on his own domain. */
ok(urls.demoHref("/valuation") === "/templates/megacity-valuation", "a root link points at the page on the test address");
ok(urls.demoHref("/tenants") === "/templates/megacity-renting" && urls.demoHref("/") === "/templates/megacity-skyline", "…by the page's own name there");
ok(urls.demoHref("/let/ladywell-point") === "/templates/megacity-let-ladywell-point", "a listing link too");
ok(urls.demoHref("/valuation#book") === "/templates/megacity-valuation#book", "a link to a section keeps its section");
ok(urls.demoHref("/templates/megacity-for-landlords") === "/templates/megacity-for-landlords", "a link already in test-address form is left alone");
ok(urls.demoHref("https://wa.me/447804900719") === "https://wa.me/447804900719" && urls.demoHref("/media/s/x.jpg") === "/media/s/x.jpg", "outside links and uploaded photos are left alone");

/* ── against a running Worker ─────────────────────────────────────────── */
const li = process.argv.indexOf("--live");
if (li > 0) {
  const BASE = process.argv[li + 1].replace(/\/$/, "");
  /* --demo: the Worker is serving the test address (no MEGACITY_HOST), so
     every page is at its /templates/ name and links read that way */
  const DEMO = process.argv.includes("--demo");
  const P = (root) => (DEMO ? urls.demoHref(root) : root);
  const reEsc = (t) => t.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
  const TOKEN = process.argv[process.argv.indexOf("--token") + 1];
  let cookie = "";
  const api = async (method, path, body, raw) => {
    const res = await fetch(BASE + "/api/studio" + path, {
      method, headers: { origin: BASE, "x-studio": "1", cookie, ...(raw ? { "content-type": raw.type } : body ? { "content-type": "application/json" } : {}) },
      body: raw ? raw.body : body ? JSON.stringify(body) : undefined,
    });
    const sc = res.headers.get("set-cookie"); if (sc) cookie = sc.split(";")[0];
    const text = await res.text(); let data = null; try { data = JSON.parse(text); } catch {}
    return { status: res.status, data, text };
  };
  const page = async (path) => (await fetch(BASE + path)).text();

  const email = "owner-test@example.com", password = "a-long-local-test-password-1";
  let r = await api("POST", "/auth/bootstrap", { setupToken: TOKEN, email, name: "Test Owner", password });
  if (r.status !== 200) r = await api("POST", "/auth/login", { email, password });
  ok(r.status === 200, "signed in to the local Studio", r.status);

  r = await api("GET", "/site");
  ok(r.status === 200 && r.data.pages.length === 19, "the Website screen lists 19 pages", r.data && r.data.pages && r.data.pages.length);

  r = await api("GET", "/site/pages/renting");
  const h1 = r.data.items.find((i) => i.kind === "heading" && i.tag === "h1");
  const hero = r.data.items.find((i) => i.kind === "hero");
  const para = r.data.items.find((i) => i.kind === "text" && /Renting in Manchester/.test(i.text));
  ok(!!(h1 && hero && para), "the tenants page's headline, banner and intro are editable");

  /* a picture: a 1x1 PNG is enough to prove the path */
  const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
  r = await api("POST", "/site/upload?w=1&h=1", null, { type: "image/png", body: png });
  ok(r.status === 201 && /^s\/m_[a-z0-9]{10}\/image\.png$/.test(r.data.key), "a PNG uploads to the site's own store", r.status);
  const up = r.data;
  const notImage = await api("POST", "/site/upload", null, { type: "image/png", body: new TextEncoder().encode("<svg onload=alert(1)>") });
  ok(notImage.status === 415, "a file that is not really a picture is refused, whatever it calls itself", notImage.status);

  r = await api("PUT", "/site/pages/renting", { text: { [h1.id]: "Renting made <em>simple</em><script>x</script>", [para.id]: 'Call us or <a href="valuation" onclick="bad()">book</a>.' }, images: { [hero.id]: up } });
  ok(r.status === 200, "the edits save", r.data);
  r = await api("PUT", "/site/pages/renting", { text: { [para.id]: "Letting from 8% only" } });
  ok(r.status === 400 && /VAT/.test(r.data.error), "an 8% without VAT is refused on save", r.data);
  r = await api("PUT", "/site/pages/renting", { text: { "home-1": "Not this page" } });
  const stillHome = (await api("GET", "/site/pages/skyline")).data.items.find((i) => i.id === "home-1");
  ok(stillHome && stillHome.current == null, "an id from another page is ignored");

  let html = await page(P("/tenants"));
  ok(/<h1[^>]*>Renting made <em>simple<\/em><\/h1>/.test(html), "a visitor sees the new headline, emphasis kept");
  ok(!/<script>x<\/script>/.test(html) && !/onclick="bad\(\)"/.test(html), "and none of what was stripped");
  ok(html.includes('<a href="' + P("/valuation") + '">book</a>'), "the typed link points at the page on this address");
  ok(html.includes(`--ph-img:url('/media/${up.key}')`) && html.includes(`--ph-img-m:url('/media/${up.key}')`), "the banner shows the uploaded photo on every screen size");
  ok(!/data-e=/.test(html), "no edit ids reach the visitor");
  /* "live the second I save": the check above loads the page straight after
     the save and sees the edit, so nothing on the server holds the old one.
     What remains is a browser reusing its copy — it cannot if the page never
     gives it a validator to revalidate with and says max-age=0. */
  const hd = (await fetch(BASE + P("/tenants"))).headers;
  ok(!hd.get("etag") && !hd.get("last-modified") && /max-age=0|no-cache|no-store/.test(hd.get("cache-control") || "no-cache"),
     "the page tells browsers never to reuse an old copy, so a save shows on the next load", { etag: hd.get("etag"), lm: hd.get("last-modified"), cc: hd.get("cache-control") });
  const media = await fetch(BASE + "/media/" + up.key);
  ok(media.status === 200 && media.headers.get("content-type") === "image/png", "the uploaded photo is served to anyone, without a sign-in", media.status);

  /* the logo */
  r = await api("PUT", "/site/logo", { light: up, dark: null });
  html = await page(P("/tenants"));
  ok(html.includes(`class="brand-dark" src="/media/${up.key}"`), "the header shows the new logo");
  ok(/src="\/media\/[^"]+"[^>]*class="[^"]*logo-on-dark|class="[^"]*logo-on-dark[^"]*"[^>]*src="\/media\//.test(html) || /logo-on-dark/.test(html), "and the footer shows it drawn white");

  /* the announcement bar */
  r = await api("PUT", "/site/announcement", { on: true, text: "Landlords: 8% management", linkText: "Book", href: "/valuation" });
  ok(r.status === 400, "an announcement with 8% and no VAT is refused", r.status);
  r = await api("PUT", "/site/announcement", { on: true, text: "Free valuations this October", linkText: "Book one", href: "valuation", until: "2099-12-31" });
  ok(r.status === 200, "an announcement saves", r.data);
  html = await page(P("/tenants"));
  ok(new RegExp('<body[^>]*>\\s*<div class="annc"[^>]*>.*Free valuations this October.*<a class="annc-link" href="' + reEsc(P("/valuation")) + '">Book one', "s").test(html), "every page opens with the bar and its link");
  ok(/<div class="annc"/.test(await page(P("/"))), "the home page too");
  const deep = await page(P("/lettings"));
  ok(deep.includes('<a class="annc-link" href="' + P("/valuation") + '">'), "the link points at the valuation page from any page, not relative to it");
  await api("PUT", "/site/announcement", { on: true, text: "Old news", until: "2000-01-01" });
  ok(!/<div class="annc"/.test(await page(P("/tenants"))), "a bar past its last day is gone");
  await api("PUT", "/site/announcement", { on: false, text: "Free valuations this October" });
  ok(!/<div class="annc"/.test(await page(P("/tenants"))), "a bar switched off is gone");

  /* undo, all of it */
  await api("PUT", "/site/pages/renting", { text: { [h1.id]: null, [para.id]: null }, images: { [hero.id]: null } });
  await api("PUT", "/site/logo", { light: null, dark: null });
  html = await page(P("/tenants"));
  ok(/Everything you need<br>as a Megacity <em>tenant\.<\/em>/.test(html), "putting the original back restores the headline exactly");
  ok(html.includes("hero-renting.jpg") && html.includes("logo-nav.png"), "and the original banner and logo");
}

console.log();
console.log(bad ? `WEBSITE EDITING: ${bad} FAILED` : "WEBSITE EDITING: ALL PASS");
process.exit(bad ? 1 : 0);
