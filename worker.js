/* ============================================================
   Billy Digitals — site Worker
   Serves the static site via the ASSETS binding and adds one API route:

     POST /api/send-review   { "name": "...", "email": "..." }
       header: Authorization: Bearer <REVIEW_TOKEN>

   Sends a Google-review request email to the customer through Resend.
   Static assets are served by Cloudflare before this Worker runs, so
   existing pages are unaffected — this only adds the /api/send-review route.

   Required Worker secrets (set in the Cloudflare dashboard or via
   `wrangler secret put`):
     RESEND_API_KEY  — your Resend API key
     REVIEW_TOKEN    — a long random string; the admin page must send it
   ============================================================ */

const REVIEW_URL = "https://g.page/r/CaibQuMCDDWPEAE/review";
const FROM = "Billy Digitals <hello@billydigitals.com>";
const REPLY_TO = "hello@billydigitals.com";
const LOGO = "https://www.billydigitals.com/assets/email-logo.png";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/send-review") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      return handleSendReview(request, env);
    }
    if (url.pathname === "/api/quote") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      return handleQuote(request, env);
    }
    // Mumbai2London is parked — see M2L_PARKED below. The code all still
    // works; flip the flag and the pages come back with it.
    if (!M2L_PARKED) {
      if (url.pathname === "/api/m2l-book") {
        return handleM2LBook(request, env);
      }
      if (url.pathname === "/api/m2l/availability") {
        return handleAvailability(request, env);
      }
      if (url.pathname.startsWith("/api/m2l/admin/")) {
        return handleM2LAdmin(request, env, url);
      }
      if (url.pathname === "/api/m2l-invoice/send") {
        if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
        return handleInvoiceSend(request, env);
      }
      if (url.pathname === "/api/m2l-invoice/sign") {
        if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
        return handleInvoiceSign(request, env);
      }
    }
    if (url.pathname === "/api/book") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      return handleBook(request, env);
    }
    // The client's own domain (M2L_HOST) serves only the Mumbai2London site,
    // at clean root URLs, and is indexable.
    if (!M2L_PARKED && isM2LHost(url.hostname, env)) return serveM2L(request, url, env);

    // HeatFix Mcr Limited on heatfixmcrlimited.co.uk (HEATFIX_HOST).
    if (isClientHost(url.hostname, env, "HEATFIX_HOST")) {
      return serveClient(request, url, env, HEATFIX_PAGES, HEATFIX_PUBLIC);
    }

    // Everything else is a static asset (ASSETS honours 404-page handling).
    return env.ASSETS.fetch(request);
  },
};

/* Mumbai2London is parked.
   The whole build — pages, booking diary, invoice signing, the lot — is kept
   in this repository and still compiles, but nothing of it is served: the
   pages are excluded from the asset upload in .assetsignore and every /api/m2l
   route is switched off below.
   To bring it back: set this to false and delete the four M2L lines from
   .assetsignore. Nothing else needs changing. */
const M2L_PARKED = true;

/* ------------------------------------------------------------------
   Client-domain hosting

   Set M2L_HOST in wrangler.toml (or as a secret) to the client's own
   hostnames, comma separated — e.g. "mumbai2london.co.uk,www.mumbai2london.co.uk".
   Requests to those hosts get:
       /          -> the Mumbai2London site
       /admin     -> the back office
       /invoice   -> the invoice builder
       /sign      -> the customer signing page
   …with the noindex tag stripped so Google can find it, and everything
   else on billydigitals.com hidden behind a 404.
------------------------------------------------------------------- */
const M2L_PAGES = {
  "/": "/templates/mumbai2london.html",
  "/admin": "/templates/m2l-admin.html",
  "/invoice": "/templates/m2l-invoice-admin.html",
  "/sign": "/templates/m2l-invoice.html",
};

function m2lHosts(env) {
  return String((env && env.M2L_HOST) || "")
    .split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
}
function isM2LHost(hostname, env) {
  return m2lHosts(env).includes(String(hostname || "").toLowerCase());
}

async function serveM2L(request, url, env) {
  let p = url.pathname.replace(/\/+$/, "") || "/";

  // Assets, the favicon and robots/sitemap pass straight through.
  if (p.startsWith("/assets/") || p === "/favicon.ico" || p === "/robots.txt" || p === "/sitemap.xml") {
    return env.ASSETS.fetch(request);
  }

  const target = M2L_PAGES[p];
  if (!target) {
    // Anything that isn't part of the client's site is not on their domain.
    return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
  }

  const res = await env.ASSETS.fetch(new Request(new URL(target, url.origin), request));
  if (!res.ok) return res;

  // The pages carry noindex so the demo stays hidden on billydigitals.com.
  // On the client's own domain we want the opposite: index the front page,
  // keep the back office and the signing pages out of search.
  const publicPage = p === "/";
  const canonical = "https://" + url.hostname + (publicPage ? "/" : p);

  let rw = new HTMLRewriter().on('meta[name="robots"]', {
    element: (el) => (publicPage ? el.remove() : el.setAttribute("content", "noindex,nofollow")),
  });
  if (publicPage) {
    rw = rw.on("head", {
      element: (el) => el.append(
        `<link rel="canonical" href="${canonical}">` +
        `<meta property="og:url" content="${canonical}">`,
        { html: true }
      ),
    });
  }
  return rw.transform(new Response(res.body, res));
}

/* ------------------------------------------------------------------
   HeatFix Mcr Limited — heatfixmcrlimited.co.uk

   Set HEATFIX_HOST in wrangler.toml (or as a secret) to the client's own
   hostnames, comma separated. Requests to those hosts get:
       /         -> the HeatFix website          (indexed)
       /book     -> the request-a-visit page      (indexed)
       /invoice  -> the invoice builder (his tool, noindex)
       /i        -> the customer's invoice view   (noindex)
------------------------------------------------------------------- */
const HEATFIX_PAGES = {
  "/": "/templates/heatfixmcr.html",
  "/book": "/templates/heatfix-book.html",
  "/about": "/templates/heatfix-about.html",
  "/faqs": "/templates/heatfix-faqs.html",
  "/blog": "/templates/heatfix-blog.html",
  "/safety-tips": "/templates/heatfix-safety-tips.html",
  "/manufacturers-warranty": "/templates/heatfix-manufacturers-warranty.html",
  "/privacy": "/templates/heatfix-privacy.html",
  "/terms": "/templates/heatfix-terms.html",
  "/invoice": "/templates/heatfix-invoice.html",
  "/i": "/templates/heatfix-invoice-view.html",
};
/* Everything except the two back-office tools should be indexable. */
const HEATFIX_PUBLIC = ["/", "/book", "/about", "/faqs", "/blog", "/safety-tips",
                        "/manufacturers-warranty", "/privacy", "/terms"];
/* Blog articles live at /blog/<slug>. */
const HEATFIX_BLOG = /^\/blog\/([a-z0-9-]{2,60})$/;

function clientHosts(env, key) {
  return String((env && env[key]) || "")
    .split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
}
function isClientHost(hostname, env, key) {
  return clientHosts(env, key).includes(String(hostname || "").toLowerCase());
}

/* Generic version of serveM2L for any client domain. */
async function serveClient(request, url, env, PAGES, PUBLIC) {
  let p = url.pathname.replace(/\/+$/, "") || "/";

  if (p.startsWith("/assets/") || p === "/favicon.ico" || p === "/robots.txt" || p === "/sitemap.xml") {
    return env.ASSETS.fetch(request);
  }

  let target = PAGES[p], publicPage = PUBLIC.indexOf(p) !== -1;

  // Blog articles: /blog/<slug> -> /templates/heatfix-blog-<slug>.html
  if (!target && PAGES === HEATFIX_PAGES) {
    const m = HEATFIX_BLOG.exec(p);
    if (m) { target = "/templates/heatfix-blog-" + m[1] + ".html"; publicPage = true; }
  }
  if (!target) {
    return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
  }

  const res = await env.ASSETS.fetch(new Request(new URL(target, url.origin), request));
  if (!res.ok) return res;

  const canonical = "https://" + url.hostname + (p === "/" ? "/" : p);

  let rw = new HTMLRewriter().on('meta[name="robots"]', {
    element: (el) => (publicPage ? el.remove() : el.setAttribute("content", "noindex,nofollow")),
  });
  if (publicPage) {
    rw = rw
      .on('link[rel="canonical"]', { element: (el) => el.setAttribute("href", canonical) })
      .on('meta[property="og:url"]', { element: (el) => el.setAttribute("content", canonical) });
  }
  return rw.transform(new Response(res.body, res));
}

/* Same-origin guard: accept posts from our own site, and from the client
   domains listed in M2L_HOST / HEATFIX_HOST once their sites point here. */
function originOk(request, env) {
  const origin = request.headers.get("origin") || "";
  if (!origin) return true;
  if (/^https?:\/\/(www\.)?billydigitals\.com$/i.test(origin)) return true;
  try {
    const h = new URL(origin).hostname;
    return isM2LHost(h, env) || isClientHost(h, env, "HEATFIX_HOST");
  } catch (_) {
    return false;
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function handleSendReview(request, env) {
  // --- Auth: shared secret ---
  const auth = request.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!env.REVIEW_TOKEN || token !== env.REVIEW_TOKEN) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!env.RESEND_API_KEY) {
    return json({ error: "Email service not configured — set the RESEND_API_KEY secret." }, 500);
  }

  // --- Input ---
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: "A valid customer email is required" }, 400);
  }
  const firstName = name ? name.split(/\s+/)[0] : "there";

  // --- Compose + send ---
  const subject = "Thank you from Billy Digitals — a quick 10-second favour? ⭐";
  const { html, text } = reviewEmail(firstName);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: "Bearer " + env.RESEND_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [email], reply_to: REPLY_TO, subject, html, text }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return json({ error: "Email provider rejected the request", detail }, 502);
  }
  return json({ ok: true, sent_to: email });
}

async function handleQuote(request, env) {
  if (!env.RESEND_API_KEY) {
    return json({ error: "Email service not configured — set the RESEND_API_KEY secret." }, 500);
  }
  // Same-origin guard: only accept posts made from our own site.
  if (!originOk(request, env)) return json({ error: "Forbidden" }, 403);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // Honeypot — a real person never fills this. Pretend success so bots move on.
  if (body.botcheck) return json({ ok: true });

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const business = String(body.business || "").trim();
  const category = String(body.category || "").trim();
  const plan = String(body.plan || "").trim();
  const message = String(body.message || "").trim();

  if (!name || !message) return json({ error: "Please include your name and a message." }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: "A valid email address is required." }, 400);
  }

  const subject = "New project enquiry — " + (business || name) + " · " + (category || "Website");
  const { html, text } = quoteEmail({ name, email, phone, business, category, plan, message });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: "Bearer " + env.RESEND_API_KEY,
      "content-type": "application/json",
    },
    // Sent from our own domain, straight to our inbox, with the customer set
    // as reply-to so hitting "Reply" answers them directly.
    body: JSON.stringify({ from: FROM, to: [REPLY_TO], reply_to: email, subject, html, text }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return json({ error: "Email provider rejected the request", detail }, 502);
  }

  // Best-effort instant acknowledgement to the customer. If this fails we
  // still succeed — the enquiry already reached our inbox.
  try {
    const ack = ackEmail(name.split(/\s+/)[0] || "there");
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: "Bearer " + env.RESEND_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        reply_to: REPLY_TO,
        subject: "We've got your enquiry ✅ — Billy Digitals",
        html: ack.html,
        text: ack.text,
      }),
    });
  } catch (e) {
    /* ignore — the enquiry already reached us */
  }

  return json({ ok: true });
}

function ackEmail(firstName) {
  const wa = "https://wa.me/447519022117";
  const text =
`Hi ${firstName},

Thanks for getting in touch with Billy Digitals — we've received your enquiry and we'll get back to you within 24 hours (usually much sooner).

If it's urgent, message us on WhatsApp: ${wa}

Talk soon,
Billy
Billy Digitals
billydigitals.com`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#eef2fb;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#1a2540;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Thanks — we've got your enquiry and we'll reply within 24 hours.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2fb;padding:28px 12px;"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(20,40,90,.10);">
      <tr><td style="padding:0;background:#0a1226;" align="center">
        <img src="${LOGO}" alt="Billy Digitals" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
      </td></tr>
      <tr><td style="height:4px;background:linear-gradient(100deg,#2b7fff,#38bdf8 50%,#22d3ee);font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 40px 8px;">
        <p style="margin:0 0 18px;font-size:18px;">Hi ${firstName},</p>
        <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#3a476a;">
          Thanks for getting in touch with <strong>Billy Digitals</strong> — we've received your enquiry and one of us will get back to you <strong>within 24 hours</strong> (usually much sooner). 🚀
        </p>
        <p style="margin:0 0 26px;font-size:16px;line-height:1.6;color:#3a476a;">
          Prefer to chat now? We're one message away.
        </p>
      </td></tr>
      <tr><td align="center" style="padding:0 40px 30px;">
        <a href="${wa}" style="display:inline-block;background:linear-gradient(100deg,#1d6ff5,#0ea5e9 55%,#0891b2);color:#ffffff;text-decoration:none;font-size:17px;font-weight:700;padding:15px 34px;border-radius:999px;">
          💬 Message us on WhatsApp
        </a>
      </td></tr>
      <tr><td style="padding:0 40px 36px;">
        <p style="margin:0;font-size:16px;line-height:1.5;color:#3a476a;">
          Talk soon,<br><strong style="color:#1a2540;">Billy</strong><br>Billy Digitals
        </p>
      </td></tr>
      <tr><td style="background:#f4f7fd;padding:20px 40px;border-top:1px solid #e4ebf7;" align="center">
        <p style="margin:0;font-size:13px;color:#8a97b5;">
          <a href="https://www.billydigitals.com" style="color:#1d6ff5;text-decoration:none;">billydigitals.com</a>
          &nbsp;·&nbsp; Just reply to this email to reach us directly.
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  return { html, text };
}

function quoteEmail(d) {
  const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
  const rows = [
    ["Name", d.name],
    ["Business", d.business || "—"],
    ["Email", d.email],
    ["Phone", d.phone || "—"],
    ["Website type", d.category || "—"],
    ["Plan", d.plan || "—"],
  ];
  const text =
`New project enquiry — via billydigitals.com

Name: ${d.name}
Business: ${d.business || "—"}
Email: ${d.email}
Phone: ${d.phone || "—"}
Website type: ${d.category || "—"}
Plan: ${d.plan || "—"}

Project details:
${d.message}

Reply straight to this email to answer ${d.name}.`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#eef2fb;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#1a2540;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2fb;padding:28px 12px;"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(20,40,90,.10);">
      <tr><td style="background:#0a1226;padding:22px 40px;">
        <span style="color:#ffffff;font-size:18px;font-weight:700;">New project enquiry</span>
        <span style="display:block;color:#8fb2ff;font-size:13px;margin-top:2px;">via billydigitals.com</span>
      </td></tr>
      <tr><td style="height:4px;background:linear-gradient(100deg,#2b7fff,#38bdf8 50%,#22d3ee);font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="padding:26px 40px 6px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;color:#3a476a;">
          ${rows.map(([k, v]) => {
            let val = esc(v);
            if (k === "Email" && v && v !== "—") val = `<a href="mailto:${esc(v)}" style="color:#1d6ff5;text-decoration:none;">${esc(v)}</a>`;
            if (k === "Phone" && v && v !== "—") val = `<a href="tel:${v.replace(/[^0-9+]/g, "")}" style="color:#1d6ff5;text-decoration:none;">${esc(v)}</a>`;
            return `<tr><td style="padding:6px 0;width:140px;color:#8a97b5;">${k}</td><td style="padding:6px 0;color:#1a2540;font-weight:600;">${val}</td></tr>`;
          }).join("")}
        </table>
      </td></tr>
      <tr><td style="padding:14px 40px 30px;">
        <div style="font-size:13px;color:#8a97b5;margin-bottom:6px;">Project details</div>
        <div style="font-size:15px;line-height:1.6;color:#1a2540;white-space:pre-wrap;background:#f4f7fd;border:1px solid #e4ebf7;border-radius:10px;padding:14px 16px;">${esc(d.message)}</div>
      </td></tr>
      <tr><td style="background:#f4f7fd;padding:16px 40px;border-top:1px solid #e4ebf7;" align="center">
        <span style="font-size:13px;color:#8a97b5;">Reply to this email to answer <strong>${esc(d.name)}</strong> directly.</span>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  return { html, text };
}

/* ============================================================
   Clean My Car — booking requests  (POST /api/book)
   Emails the booking to Clean My Car and an instant confirmation
   to the customer. Uses the same verified Resend sender.
   ============================================================ */
const CMC_EMAIL = "cleanmycarbirmingham@gmail.com";
const CMC_FROM = "Clean My Car <hello@billydigitals.com>";
const CMC_WA = "https://wa.me/447513286544";
const CMC_PHONE = "07513 286544";

async function handleBook(request, env) {
  if (!env.RESEND_API_KEY) {
    return json({ error: "Email service not configured — set the RESEND_API_KEY secret." }, 500);
  }
  if (!originOk(request, env)) return json({ error: "Forbidden" }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  // Honeypot — bots fill this; pretend success.
  if (body.botcheck) return json({ ok: true });

  const d = {
    service: String(body.service || "").trim(),
    vehicle: String(body.vehicle || "").trim(),
    price: String(body.price || "").trim(),
    duration: String(body.duration || "").trim(),
    date: String(body.date || "").trim(),
    time: String(body.time || "").trim(),
    name: String(body.name || "").trim(),
    email: String(body.email || "").trim(),
    phone: String(body.phone || "").trim(),
    address: String(body.address || "").trim(),
    parking: String(body.parking || "").trim(),
    notes: String(body.notes || "").trim(),
  };

  if (!d.name || !d.service || !d.date || !d.time) {
    return json({ error: "Please choose a service, date and time and add your name." }, 400);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) {
    return json({ error: "A valid email address is required." }, 400);
  }
  if (!d.phone) return json({ error: "A contact phone number is required." }, 400);

  // 1) Booking notification to Clean My Car (reply-to = customer)
  const owner = cmcOwnerEmail(d);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      from: CMC_FROM, to: [CMC_EMAIL], reply_to: d.email,
      subject: `New booking — ${d.service} · ${d.date} ${d.time} · ${d.name}`,
      html: owner.html, text: owner.text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    return json({ error: "Email provider rejected the request", detail }, 502);
  }

  // 2) Instant confirmation to the customer (reply-to = Clean My Car)
  try {
    const cust = cmcCustomerEmail(d);
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({
        from: CMC_FROM, to: [d.email], reply_to: CMC_EMAIL,
        subject: "Booking request received ✨ — Clean My Car",
        html: cust.html, text: cust.text,
      }),
    });
  } catch (e) { /* booking already reached Clean My Car */ }

  return json({ ok: true });
}

function cmcRows(d) {
  return [
    ["Service", d.service],
    ["Vehicle", d.vehicle || "—"],
    ["Price", d.price || "—"],
    ["Duration", d.duration || "—"],
    ["Date", d.date],
    ["Time", d.time],
    ["Name", d.name],
    ["Email", d.email],
    ["Phone", d.phone],
    ["Address", d.address || "—"],
    ["Parking", d.parking || "—"],
  ];
}

function cmcOwnerEmail(d) {
  const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
  const rows = cmcRows(d);
  const text =
`New booking request — via billydigitals.com

${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}

Notes:
${d.notes || "—"}

Reply straight to this email to answer ${d.name}.`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#fdeef2;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#241a20;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdeef2;padding:28px 12px;"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(190,30,110,.14);">
      <tr><td style="background:#241a20;padding:22px 40px;">
        <span style="color:#ffffff;font-size:19px;font-weight:700;">New booking request 💗</span>
        <span style="display:block;color:#f5a8c0;font-size:13px;margin-top:2px;">Clean My Car — via billydigitals.com</span>
      </td></tr>
      <tr><td style="height:4px;background:linear-gradient(100deg,#ff4da0,#e01b76 55%,#f5a8c0);font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="padding:26px 40px 6px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;color:#5a4750;">
          ${rows.map(([k, v]) => {
            let val = esc(v);
            if (k === "Email" && v && v !== "—") val = `<a href="mailto:${esc(v)}" style="color:#e01b76;text-decoration:none;">${esc(v)}</a>`;
            if (k === "Phone" && v && v !== "—") val = `<a href="tel:${String(v).replace(/[^0-9+]/g, "")}" style="color:#e01b76;text-decoration:none;">${esc(v)}</a>`;
            if (k === "Price") val = `<strong style="color:#e01b76;">${esc(v)}</strong>`;
            return `<tr><td style="padding:6px 0;width:120px;color:#a48;">${k}</td><td style="padding:6px 0;color:#241a20;font-weight:600;">${val}</td></tr>`;
          }).join("")}
        </table>
      </td></tr>
      <tr><td style="padding:14px 40px 30px;">
        <div style="font-size:13px;color:#a48;margin-bottom:6px;">Customer notes</div>
        <div style="font-size:15px;line-height:1.6;color:#241a20;white-space:pre-wrap;background:#fdf2f6;border:1px solid #f6d6e2;border-radius:10px;padding:14px 16px;">${esc(d.notes || "—")}</div>
      </td></tr>
      <tr><td style="background:#fdf2f6;padding:16px 40px;border-top:1px solid #f6d6e2;" align="center">
        <span style="font-size:13px;color:#a48;">Reply to this email to confirm with <strong>${esc(d.name)}</strong>.</span>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  return { html, text };
}

function cmcCustomerEmail(d) {
  const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
  const first = d.name ? d.name.split(/\s+/)[0] : "there";
  const rows = [
    ["Service", d.service], ["Vehicle", d.vehicle || "—"], ["Price", d.price || "—"],
    ["Date", d.date], ["Time", d.time], ["Address", d.address || "—"],
  ];
  const text =
`Hi ${first},

Thank you for booking with Clean My Car 💗 We've received your request:

${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}

This is a booking REQUEST — we'll message you shortly to confirm your slot.

A couple of quick things for the day:
• Please have access to a water tap (outside is best).
• We need access to a power socket — we have an extension lead.

Need to change anything? Reply to this email, message us on WhatsApp (${CMC_WA}) or call ${CMC_PHONE}.

See you soon,
Clean My Car — Women's Mobile Valeting, Birmingham
Clean. Shine. Protect. ♥`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#fdeef2;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#241a20;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">We've received your booking request — we'll confirm your slot shortly. 💗</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdeef2;padding:28px 12px;"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(190,30,110,.14);">
      <tr><td align="center" style="background:#fff5f9;padding:30px 40px 16px;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:700;color:#241a20;letter-spacing:.5px;">Clean <span style="color:#e01b76;">My</span> Car <span style="color:#f03e8e;">&#10084;</span></div>
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c77;margin-top:6px;">Women's Mobile Valeting · Birmingham</div>
      </td></tr>
      <tr><td style="height:4px;background:linear-gradient(100deg,#ff4da0,#e01b76 55%,#f5a8c0);font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="padding:32px 40px 8px;">
        <p style="margin:0 0 16px;font-size:18px;">Hi ${esc(first)},</p>
        <p style="margin:0 0 22px;font-size:16px;line-height:1.6;color:#5a4750;">
          Thank you for booking with <strong>Clean My Car</strong> — we've received your request. This is a booking <strong>request</strong>, and we'll message you shortly to confirm your slot. ✨
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;color:#5a4750;background:#fdf2f6;border:1px solid #f6d6e2;border-radius:12px;">
          ${rows.map(([k, v], i) => `<tr><td style="padding:11px 18px;width:110px;color:#a48;${i ? "border-top:1px solid #f6d6e2;" : ""}">${k}</td><td style="padding:11px 18px;color:#241a20;font-weight:600;${i ? "border-top:1px solid #f6d6e2;" : ""}">${k === "Price" ? `<strong style="color:#e01b76;">${esc(v)}</strong>` : esc(v)}</td></tr>`).join("")}
        </table>
      </td></tr>
      <tr><td style="padding:20px 40px 6px;">
        <div style="font-size:13px;color:#a48;margin-bottom:8px;">Two quick things for the day</div>
        <p style="margin:0 0 6px;font-size:15px;line-height:1.6;color:#5a4750;">💧 Please have access to a water tap (outside is best).</p>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#5a4750;">🔌 We need access to a power socket — we bring an extension lead.</p>
      </td></tr>
      <tr><td align="center" style="padding:6px 40px 30px;">
        <a href="${CMC_WA}" style="display:inline-block;background:linear-gradient(100deg,#ff4da0,#e01b76);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 30px;border-radius:999px;">💬 Message us on WhatsApp</a>
      </td></tr>
      <tr><td style="background:#fff5f9;padding:20px 40px;border-top:1px solid #f6d6e2;" align="center">
        <p style="margin:0;font-size:13px;color:#a48;">Clean. Shine. Protect. ♥ &nbsp;·&nbsp; ${CMC_PHONE} &nbsp;·&nbsp; Birmingham &amp; surrounding areas</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  return { html, text };
}

function reviewEmail(firstName) {
  const text =
`Hi ${firstName},

Thank you so much for choosing Billy Digitals — it's been a genuine pleasure building for you.

If you're happy with how everything turned out, would you mind leaving us a quick Google review? It takes about 10 seconds, and as a small team it makes a huge difference in helping other businesses find us.

Leave a 5-star review: ${REVIEW_URL}

Thank you again — and remember we're always here if you ever need anything: a tweak, a new page, hosting, or your next big idea.

Warm regards,
Billy
Billy Digitals
billydigitals.com`;

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#eef2fb;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#1a2540;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">If you're happy with your new site, a quick Google review means the world to our small team.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2fb;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(20,40,90,.10);">
        <!-- header -->
        <tr><td style="padding:0;background:#0a1226;" align="center">
          <img src="${LOGO}" alt="Billy Digitals" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
        </td></tr>
        <!-- gradient rule -->
        <tr><td style="height:4px;background:#1d6ff5;background:linear-gradient(100deg,#2b7fff,#38bdf8 50%,#22d3ee);font-size:0;line-height:0;">&nbsp;</td></tr>
        <!-- body -->
        <tr><td style="padding:36px 40px 8px;">
          <p style="margin:0 0 18px;font-size:18px;">Hi ${firstName},</p>
          <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#3a476a;">
            Thank you so much for choosing <strong>Billy Digitals</strong> — it's been a genuine pleasure building for you. 🙌
          </p>
          <p style="margin:0 0 26px;font-size:16px;line-height:1.6;color:#3a476a;">
            If you're happy with how everything turned out, would you mind leaving us a quick <strong>Google review</strong>?
            It takes about <strong>10 seconds</strong>, and as a small team it makes a huge difference in helping other businesses find us.
          </p>
        </td></tr>
        <!-- button -->
        <tr><td align="center" style="padding:0 40px 30px;">
          <a href="${REVIEW_URL}" style="display:inline-block;background:#1d6ff5;background:linear-gradient(100deg,#1d6ff5,#0ea5e9 55%,#0891b2);color:#ffffff;text-decoration:none;font-size:17px;font-weight:700;padding:15px 34px;border-radius:999px;">
            ⭐ Leave a 5-star review
          </a>
        </td></tr>
        <!-- signoff -->
        <tr><td style="padding:0 40px 36px;">
          <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#3a476a;">
            Thank you again — and remember we're always here if you ever need anything: a tweak, a new page, hosting, or your next big idea.
          </p>
          <p style="margin:0;font-size:16px;line-height:1.5;color:#3a476a;">
            Warm regards,<br><strong style="color:#1a2540;">Billy</strong><br>Billy Digitals
          </p>
        </td></tr>
        <!-- footer -->
        <tr><td style="background:#f4f7fd;padding:20px 40px;border-top:1px solid #e4ebf7;" align="center">
          <p style="margin:0;font-size:13px;color:#8a97b5;">
            <a href="https://www.billydigitals.com" style="color:#1d6ff5;text-decoration:none;">billydigitals.com</a>
            &nbsp;·&nbsp; Reply to this email to reach us directly.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { html, text };
}


/* ============================================================
   Mumbai2London — rickshaw hire enquiries  (POST /api/m2l-book)
   Emails the enquiry to Mumbai2London and an instant
   confirmation to the customer. Same verified Resend sender.
   ============================================================ */
const M2L_EMAIL = "enquiries@mumbai2london.co.uk";
const M2L_FROM = "Mumbai2London <hello@billydigitals.com>";
const M2L_WA = "https://wa.me/447940762404";

async function handleM2LBook(request, env) {
  if (!env.RESEND_API_KEY) {
    return json({ error: "Email service not configured — set the RESEND_API_KEY secret." }, 500);
  }
  if (!originOk(request, env)) return json({ error: "Forbidden" }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  if (body.botcheck) return json({ ok: true });

  const d = {
    eventType: String(body.eventType || "").trim(),
    date: String(body.date || "").trim(),
    time: String(body.time || "").trim(),
    hours: String(body.hours || "").trim(),
    location: String(body.location || "").trim(),
    name: String(body.name || "").trim(),
    email: String(body.email || "").trim(),
    phone: String(body.phone || "").trim(),
    notes: String(body.notes || "").trim(),
    addons: (Array.isArray(body.addons) ? body.addons : String(body.addons || "").split(","))
      .map((x) => String(x).trim()).filter(Boolean).slice(0, 12).join(", "),
    source: body.source === "chat" ? "chat" : "form",
  };
  if (!d.name || !d.eventType || !d.date) {
    return json({ error: "Please choose an event type and date, and add your name." }, 400);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) {
    return json({ error: "A valid email address is required." }, 400);
  }
  if (!d.phone) return json({ error: "A contact phone number is required." }, 400);

  const esc = (x) => String(x).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

  /* Save it to the diary (if D1 is connected) and note any clash that day. */
  let enquiryId = "", clash = 0;
  const db = m2lDb(env);
  if (db) {
    try {
      enquiryId = "ENQ-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-"
        + Math.random().toString(36).slice(2, 6).toUpperCase();
      const iso = /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : "";
      if (iso) {
        const c = await db.prepare(
          `SELECT COUNT(*) n FROM enquiries WHERE event_date=?1 AND status IN ('confirmed','quoted')`
        ).bind(iso).first();
        clash = (c && c.n) || 0;
      }
      await db.prepare(
        `INSERT INTO enquiries (id,created_at,status,event_type,event_date,event_time,hours,location,addons,name,email,phone,notes,source)
         VALUES (?1,?2,'new',?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)`
      ).bind(enquiryId, new Date().toISOString(), d.eventType, iso, d.time, d.hours,
             d.location, d.addons, d.name, d.email, d.phone, d.notes, d.source).run();
    } catch (e) { enquiryId = ""; }
  }

  const rows = [
    ["Event", d.eventType], ["Date", d.date], ["Time", d.time || "—"],
    ["Hours", d.hours || "—"], ["Location", d.location || "—"],
    ["Extras", d.addons || "—"],
    ["Name", d.name], ["Email", d.email], ["Phone", d.phone],
    ["Came from", d.source === "chat" ? "Website chat" : "Booking form"],
  ];
  const ownerText = `New rickshaw enquiry\n\n${rows.map(([k,v])=>`${k}: ${v}`).join("\n")}\n\nNotes:\n${d.notes || "—"}\n\nReply straight to this email to answer ${d.name}.`;
  const ownerHtml = `<!doctype html><html><body style="margin:0;background:#fff7ea;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#2b1a0d">
<div style="max-width:600px;margin:0 auto;padding:28px">
<div style="background:linear-gradient(135deg,#ff8a1f,#ffc93c);border-radius:18px;padding:22px 24px;color:#231204">
<h1 style="margin:0;font-size:22px">New rickshaw enquiry</h1>
<p style="margin:6px 0 0;opacity:.85">${enquiryId ? esc(enquiryId) + " · " : ""}via the mumbai2london website</p></div>
${clash ? `<div style="margin-top:14px;background:#fff2cf;border:1px solid #e8b33d;border-radius:12px;padding:13px 15px;color:#6b4a06;font-size:14px"><b>Heads up:</b> you already have ${clash} booking${clash > 1 ? "s" : ""} in the diary for ${esc(d.date)}.</div>` : ""}
<table style="width:100%;border-collapse:collapse;margin-top:18px;background:#fff;border-radius:14px;overflow:hidden">
${rows.map(([k,v])=>`<tr><td style="padding:11px 16px;border-bottom:1px solid #f3e6d2;color:#8a6b46;font-size:13px">${esc(k)}</td><td style="padding:11px 16px;border-bottom:1px solid #f3e6d2;font-weight:600">${esc(v)}</td></tr>`).join("")}
</table>
<div style="margin-top:16px;background:#fff;border-radius:14px;padding:16px"><b>Notes</b><p style="margin:8px 0 0;white-space:pre-wrap">${esc(d.notes || "—")}</p></div>
<p style="text-align:center;margin-top:18px"><a href="${m2lPage(env, "admin")}" style="display:inline-block;background:linear-gradient(135deg,#ff8a1f,#ffc93c);color:#231204;font-weight:800;text-decoration:none;padding:13px 26px;border-radius:999px">Open the back office</a></p>
</div></body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      from: M2L_FROM, to: [M2L_EMAIL], reply_to: d.email,
      subject: `New enquiry — ${d.eventType} · ${d.date} · ${d.name}`,
      html: ownerHtml, text: ownerText,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    return json({ error: "Email provider rejected the request", detail }, 502);
  }

  try {
    const custHtml = `<!doctype html><html><body style="margin:0;background:#fff7ea;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#2b1a0d">
<div style="max-width:600px;margin:0 auto;padding:28px">
<div style="background:linear-gradient(135deg,#ff8a1f,#ffc93c);border-radius:18px;padding:26px 24px;color:#231204">
<h1 style="margin:0;font-size:24px">Thanks, ${esc(d.name)}</h1>
<p style="margin:8px 0 0">We've got your enquiry for <b>${esc(d.eventType)}</b> on <b>${esc(d.date)}</b>.</p></div>
<div style="background:#fff;border-radius:14px;padding:20px;margin-top:16px">
<p style="margin:0 0 12px">We'll come back to you shortly to confirm availability and pricing.</p>
<p style="margin:0">Need us sooner? <a href="${M2L_WA}" style="color:#e2620a;font-weight:700">WhatsApp us</a> or reply to this email.</p></div>
<p style="text-align:center;color:#8a6b46;font-size:12px;margin-top:18px">Mumbai2London · Nationwide Rickshaw Hire</p>
</div></body></html>`;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({
        from: M2L_FROM, to: [d.email], reply_to: M2L_EMAIL,
        subject: "Enquiry received — Mumbai2London",
        html: custHtml,
        text: `Thanks ${d.name}! We've got your enquiry for ${d.eventType} on ${d.date}. We'll confirm availability shortly.`,
      }),
    });
  } catch (e) { /* enquiry already delivered */ }

  return json({ ok: true });
}


/* ============================================================
   Mumbai2London — invoices by email, signed digitally
   ------------------------------------------------------------
   No database is bound to this Worker, so invoices are carried in a
   tamper-proof signed token rather than stored server-side:

     token = base64url(payload JSON) + "." + base64url(HMAC-SHA256)

   The customer opens /templates/m2l-invoice#<token>, which renders the
   invoice from the payload. When they sign, the Worker re-verifies the
   HMAC before doing anything, so the amounts in a signed invoice cannot
   have been edited in the URL. The signed copy is emailed to both
   parties — those two emails are the record of the agreement.

   Secrets:
     M2L_ADMIN_TOKEN — required. Protects invoice creation so the
                       endpoint cannot be used to send mail from the
                       domain. Requests without it are refused.
     INVOICE_SECRET  — HMAC key. Falls back to RESEND_API_KEY so the
                       flow works before it is set; set it properly in
                       production (the response flags when it is missing).
   ============================================================ */

/* Where the M2L pages live. Once M2L_HOST is set the links in every email
   point at the client's own domain instead of billydigitals.com. */
function m2lPage(env, key) {
  const hosts = m2lHosts(env);
  if (hosts.length) return "https://" + hosts[0] + { admin: "/admin", invoice: "/invoice", sign: "/sign", site: "" }[key];
  return "https://www.billydigitals.com" +
    { admin: "/templates/m2l-admin", invoice: "/templates/m2l-invoice-admin",
      sign: "/templates/m2l-invoice", site: "/templates/mumbai2london" }[key];
}
const M2L_TERMS = [
  "A booking is confirmed once this invoice is signed and any deposit has cleared.",
  "The balance is due on or before the event date unless agreed otherwise in writing.",
  "Cancellations more than 14 days before the event are refunded in full, less the deposit.",
  "The rickshaw is supplied decorated and delivered to the agreed address at the agreed time.",
  "Mumbai2London holds its own insurance; the hirer is responsible for damage caused by guests.",
];

function b64uEncode(bytes) {
  let bin = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64uDecodeToString(str) {
  const pad = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "===".slice((pad.length + 3) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
async function hmacKey(env) {
  const secret = env.INVOICE_SECRET || env.RESEND_API_KEY || "";
  return crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
}
async function signPayload(env, payloadJson) {
  const key = await hmacKey(env);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadJson));
  return b64uEncode(new TextEncoder().encode(payloadJson)) + "." + b64uEncode(sig);
}
async function verifyToken(env, token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return null;
  let payloadJson;
  try { payloadJson = b64uDecodeToString(parts[0]); } catch { return null; }
  const key = await hmacKey(env);
  let sigBytes;
  try {
    const raw = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(raw + "===".slice((raw.length + 3) % 4));
    sigBytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) sigBytes[i] = bin.charCodeAt(i);
  } catch { return null; }
  const ok = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payloadJson));
  if (!ok) return null;
  try { return JSON.parse(payloadJson); } catch { return null; }
}
async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const gbp = (n) => "£" + (Math.round(Number(n) * 100) / 100).toFixed(2);
const escHtml = (x) => String(x == null ? "" : x).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

/* Build the invoice totals on the server — client-sent totals are ignored. */
function computeInvoice(body) {
  const items = (Array.isArray(body.items) ? body.items : [])
    .map((it) => ({
      desc: String(it.desc || "").trim().slice(0, 160),
      qty: Math.max(0, Number(it.qty) || 0),
      unit: Math.max(0, Number(it.unit) || 0),
    }))
    .filter((it) => it.desc && it.qty > 0);
  const subtotal = items.reduce((t, it) => t + it.qty * it.unit, 0);
  const vatRate = Math.min(100, Math.max(0, Number(body.vatRate) || 0));
  const vat = subtotal * (vatRate / 100);
  const total = subtotal + vat;
  const deposit = Math.min(total, Math.max(0, Number(body.deposit) || 0));
  return { items, subtotal, vatRate, vat, total, deposit, balance: total - deposit };
}

function invoiceRowsHtml(inv) {
  return inv.items.map((it) => `<tr>
<td style="padding:11px 14px;border-bottom:1px solid #f0e2cd">${escHtml(it.desc)}</td>
<td style="padding:11px 14px;border-bottom:1px solid #f0e2cd;text-align:center;color:#8a6b46">${it.qty}</td>
<td style="padding:11px 14px;border-bottom:1px solid #f0e2cd;text-align:right;color:#8a6b46">${gbp(it.unit)}</td>
<td style="padding:11px 14px;border-bottom:1px solid #f0e2cd;text-align:right;font-weight:700">${gbp(it.qty * it.unit)}</td>
</tr>`).join("");
}
function invoiceTotalsHtml(inv) {
  const row = (k, v, strong) => `<tr><td style="padding:6px 14px;text-align:right;color:#8a6b46">${escHtml(k)}</td>
<td style="padding:6px 14px;text-align:right;${strong ? "font-weight:800;font-size:17px;color:#2b1a0d" : "font-weight:600"}">${escHtml(v)}</td></tr>`;
  let h = row("Subtotal", gbp(inv.subtotal));
  if (inv.vatRate > 0) h += row("VAT (" + inv.vatRate + "%)", gbp(inv.vat));
  h += row("Total", gbp(inv.total), true);
  if (inv.deposit > 0) {
    h += row("Deposit", "− " + gbp(inv.deposit));
    h += row("Balance due", gbp(inv.balance), true);
  }
  return h;
}

/* ---------- create + email an invoice ---------- */
async function handleInvoiceSend(request, env) {
  if (!env.RESEND_API_KEY) return json({ error: "Email service not configured — set the RESEND_API_KEY secret." }, 500);
  if (!env.M2L_ADMIN_TOKEN) {
    return json({ error: "Invoicing is locked until the M2L_ADMIN_TOKEN secret is set on the Worker." }, 503);
  }
  const auth = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (auth !== env.M2L_ADMIN_TOKEN) return json({ error: "Not authorised." }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const cust = {
    name: String(body.customerName || "").trim(),
    email: String(body.customerEmail || "").trim(),
    phone: String(body.customerPhone || "").trim(),
    address: String(body.customerAddress || "").trim(),
  };
  if (!cust.name) return json({ error: "Customer name is required." }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cust.email)) return json({ error: "A valid customer email is required." }, 400);

  const inv = computeInvoice(body);
  if (!inv.items.length) return json({ error: "Add at least one line item." }, 400);

  const payload = {
    v: 1,
    id: String(body.invoiceNo || "").trim() || ("M2L-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase()),
    issued: new Date().toISOString(),
    due: String(body.dueDate || "").trim(),
    event: {
      type: String(body.eventType || "").trim(),
      date: String(body.eventDate || "").trim(),
      time: String(body.eventTime || "").trim(),
      location: String(body.eventLocation || "").trim(),
    },
    customer: cust,
    items: inv.items,
    vatRate: inv.vatRate,
    deposit: inv.deposit,
    notes: String(body.notes || "").trim().slice(0, 800),
  };
  const payloadJson = JSON.stringify(payload);
  const token = await signPayload(env, payloadJson);
  const link = m2lPage(env, "sign") + "#" + token;

  const ev = payload.event;
  const meta = [
    ["Invoice", payload.id],
    ["Issued", new Date(payload.issued).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })],
    payload.due ? ["Due", payload.due] : null,
    ev.type ? ["Event", ev.type] : null,
    ev.date ? ["Event date", ev.date + (ev.time ? " · " + ev.time : "")] : null,
    ev.location ? ["Location", ev.location] : null,
  ].filter(Boolean);

  const invoiceBlock = `
<table style="width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden;margin-top:16px">
<tr style="background:#fdf3e2"><th align="left" style="padding:10px 14px;font-size:12px;color:#8a6b46;text-transform:uppercase;letter-spacing:.08em">Description</th>
<th style="padding:10px 14px;font-size:12px;color:#8a6b46">Qty</th>
<th align="right" style="padding:10px 14px;font-size:12px;color:#8a6b46">Unit</th>
<th align="right" style="padding:10px 14px;font-size:12px;color:#8a6b46">Amount</th></tr>
${invoiceRowsHtml(inv)}
</table>
<table style="width:100%;border-collapse:collapse;margin-top:10px">${invoiceTotalsHtml(inv)}</table>`;

  const metaBlock = `<table style="width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden">
${meta.map(([k, v]) => `<tr><td style="padding:10px 14px;border-bottom:1px solid #f3e6d2;color:#8a6b46;font-size:13px">${escHtml(k)}</td><td style="padding:10px 14px;border-bottom:1px solid #f3e6d2;font-weight:600">${escHtml(v)}</td></tr>`).join("")}
</table>`;

  const custHtml = `<!doctype html><html><body style="margin:0;background:#fff7ea;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#2b1a0d">
<div style="max-width:640px;margin:0 auto;padding:28px">
<div style="background:linear-gradient(135deg,#ff8a1f,#ffc93c);border-radius:18px;padding:24px;color:#231204">
<h1 style="margin:0;font-size:23px">Your invoice from Mumbai2London</h1>
<p style="margin:7px 0 0;opacity:.85">Invoice ${escHtml(payload.id)}${ev.date ? " · " + escHtml(ev.date) : ""}</p></div>
<p style="margin:18px 0 14px">Hi ${escHtml(cust.name)}, thanks for booking with us. Here's your invoice — please review and sign it online to confirm the booking.</p>
${metaBlock}
${invoiceBlock}
<div style="text-align:center;margin:26px 0 8px">
<a href="${escHtml(link)}" style="display:inline-block;background:linear-gradient(135deg,#ff8a1f,#ffc93c);color:#231204;font-weight:800;text-decoration:none;padding:15px 32px;border-radius:999px;font-size:16px">Review &amp; sign your invoice</a>
</div>
<p style="text-align:center;color:#8a6b46;font-size:12px;margin:0 0 18px">Signing takes about 20 seconds — no account needed.</p>
${payload.notes ? `<div style="background:#fff;border-radius:14px;padding:16px"><b>Notes</b><p style="margin:8px 0 0;white-space:pre-wrap">${escHtml(payload.notes)}</p></div>` : ""}
<p style="color:#8a6b46;font-size:12px;margin-top:20px;text-align:center">Mumbai2London · Nationwide Rickshaw Hire<br>${escHtml(M2L_EMAIL)}</p>
</div></body></html>`;

  const custText = `Invoice ${payload.id} from Mumbai2London\n\n`
    + meta.map(([k, v]) => `${k}: ${v}`).join("\n")
    + `\n\n${inv.items.map((it) => `${it.desc} — ${it.qty} x ${gbp(it.unit)} = ${gbp(it.qty * it.unit)}`).join("\n")}`
    + `\n\nTotal: ${gbp(inv.total)}` + (inv.deposit > 0 ? `\nDeposit: ${gbp(inv.deposit)}\nBalance due: ${gbp(inv.balance)}` : "")
    + `\n\nReview and sign your invoice:\n${link}\n`;

  const r1 = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      from: M2L_FROM, to: [cust.email], reply_to: M2L_EMAIL,
      subject: `Invoice ${payload.id} — Mumbai2London`,
      html: custHtml, text: custText,
    }),
  });
  if (!r1.ok) return json({ error: "Email provider rejected the request", detail: await r1.text() }, 502);

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({
        from: M2L_FROM, to: [M2L_EMAIL], reply_to: cust.email,
        subject: `Invoice ${payload.id} sent to ${cust.name} — awaiting signature`,
        html: `<!doctype html><html><body style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#2b1a0d;background:#fff7ea;padding:24px">
<div style="max-width:640px;margin:0 auto">
<h2 style="margin:0 0 6px">Invoice ${escHtml(payload.id)} sent</h2>
<p style="margin:0 0 16px;color:#8a6b46">To ${escHtml(cust.name)} &lt;${escHtml(cust.email)}&gt; — awaiting their signature.</p>
${metaBlock}${invoiceBlock}
<p style="margin-top:18px;font-size:12px;color:#8a6b46">Signing link: <a href="${escHtml(link)}">${escHtml(link)}</a></p>
</div></body></html>`,
        text: `Invoice ${payload.id} sent to ${cust.name} <${cust.email}>. Awaiting signature.\n\n${custText}`,
      }),
    });
  } catch (e) { /* the customer already has it */ }

  return json({ ok: true, id: payload.id, url: link, total: inv.total, insecureSecret: !env.INVOICE_SECRET });
}

/* ---------- customer signs it ---------- */
async function handleInvoiceSign(request, env) {
  if (!env.RESEND_API_KEY) return json({ error: "Email service not configured." }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const payload = await verifyToken(env, body.token);
  if (!payload) return json({ error: "This invoice link is invalid or has been altered. Please ask for a fresh link." }, 400);

  const typedName = String(body.typedName || "").trim().slice(0, 120);
  const sigData = String(body.signature || "");
  if (!typedName) return json({ error: "Please type your full name to sign." }, 400);
  if (body.agree !== true) return json({ error: "Please tick the box to confirm you agree." }, 400);
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(sigData);
  if (!m || m[1].length < 400) return json({ error: "Please draw your signature in the box." }, 400);
  if (m[1].length > 900000) return json({ error: "Signature image is too large." }, 400);

  const inv = computeInvoice(payload);
  const signedAt = new Date();
  const audit = {
    signedAt: signedAt.toISOString(),
    name: typedName,
    ip: request.headers.get("cf-connecting-ip") || "unknown",
    country: (request.cf && request.cf.country) || "unknown",
    agent: (request.headers.get("user-agent") || "unknown").slice(0, 200),
    invoiceHash: (await sha256Hex(JSON.stringify(payload))).slice(0, 32),
  };

  const ev = payload.event;
  const meta = [
    ["Invoice", payload.id],
    ev.type ? ["Event", ev.type] : null,
    ev.date ? ["Event date", ev.date + (ev.time ? " · " + ev.time : "")] : null,
    ev.location ? ["Location", ev.location] : null,
    ["Customer", payload.customer.name],
    ["Email", payload.customer.email],
  ].filter(Boolean);

  const auditRows = [
    ["Signed by", audit.name],
    ["Signed at", signedAt.toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/London" }) + " (UK time)"],
    ["IP address", audit.ip],
    ["Country", audit.country],
    ["Device", audit.agent],
    ["Invoice fingerprint", audit.invoiceHash],
  ];

  const shared = `
<table style="width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden">
${meta.map(([k, v]) => `<tr><td style="padding:10px 14px;border-bottom:1px solid #f3e6d2;color:#8a6b46;font-size:13px">${escHtml(k)}</td><td style="padding:10px 14px;border-bottom:1px solid #f3e6d2;font-weight:600">${escHtml(v)}</td></tr>`).join("")}
</table>
<table style="width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden;margin-top:14px">
<tr style="background:#fdf3e2"><th align="left" style="padding:10px 14px;font-size:12px;color:#8a6b46;text-transform:uppercase;letter-spacing:.08em">Description</th>
<th style="padding:10px 14px;font-size:12px;color:#8a6b46">Qty</th>
<th align="right" style="padding:10px 14px;font-size:12px;color:#8a6b46">Unit</th>
<th align="right" style="padding:10px 14px;font-size:12px;color:#8a6b46">Amount</th></tr>
${invoiceRowsHtml(inv)}
</table>
<table style="width:100%;border-collapse:collapse;margin-top:10px">${invoiceTotalsHtml(inv)}</table>
<div style="background:#fff;border-radius:14px;padding:18px;margin-top:16px">
<b style="display:block;margin-bottom:10px">Signature</b>
<p style="margin:0 0 4px;font-family:'Segoe Script','Brush Script MT',cursive;font-size:26px;color:#2b1a0d">${escHtml(audit.name)}</p>
<p style="margin:0;color:#8a6b46;font-size:12px">The handwritten signature is attached to this email as signature.png</p>
</div>
<div style="background:#fff;border-radius:14px;padding:18px;margin-top:14px">
<b style="display:block;margin-bottom:10px">Audit trail</b>
<table style="width:100%;border-collapse:collapse;font-size:12.5px">
${auditRows.map(([k, v]) => `<tr><td style="padding:5px 0;color:#8a6b46;width:150px">${escHtml(k)}</td><td style="padding:5px 0;word-break:break-word">${escHtml(v)}</td></tr>`).join("")}
</table></div>
<div style="background:#fff;border-radius:14px;padding:18px;margin-top:14px">
<b style="display:block;margin-bottom:8px">Terms agreed</b>
<ol style="margin:0;padding-left:18px;color:#5c4630;font-size:12.5px;line-height:1.7">${M2L_TERMS.map((t) => `<li>${escHtml(t)}</li>`).join("")}</ol>
</div>`;

  const attachments = [{ filename: "signature.png", content: m[1] }];
  const textSummary = `Invoice ${payload.id} signed by ${audit.name} on ${audit.signedAt}\n`
    + meta.map(([k, v]) => `${k}: ${v}`).join("\n")
    + `\n\nTotal: ${gbp(inv.total)}` + (inv.deposit > 0 ? `\nDeposit: ${gbp(inv.deposit)}\nBalance due: ${gbp(inv.balance)}` : "")
    + `\n\nAudit: ip=${audit.ip} country=${audit.country} fingerprint=${audit.invoiceHash}`;

  const ownerRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      from: M2L_FROM, to: [M2L_EMAIL], reply_to: payload.customer.email,
      subject: `SIGNED — Invoice ${payload.id} · ${payload.customer.name}`,
      html: `<!doctype html><html><body style="margin:0;background:#fff7ea;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#2b1a0d">
<div style="max-width:640px;margin:0 auto;padding:28px">
<div style="background:linear-gradient(135deg,#00b451,#7ce495);border-radius:18px;padding:22px 24px;color:#04331b">
<h1 style="margin:0;font-size:22px">Invoice signed</h1>
<p style="margin:6px 0 0;opacity:.9">${escHtml(payload.customer.name)} signed invoice ${escHtml(payload.id)}</p></div>
${shared}</div></body></html>`,
      text: textSummary,
      attachments,
    }),
  });
  if (!ownerRes.ok) return json({ error: "Could not record the signature — please try again.", detail: await ownerRes.text() }, 502);

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({
        from: M2L_FROM, to: [payload.customer.email], reply_to: M2L_EMAIL,
        subject: `Your signed copy — Invoice ${payload.id} · Mumbai2London`,
        html: `<!doctype html><html><body style="margin:0;background:#fff7ea;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#2b1a0d">
<div style="max-width:640px;margin:0 auto;padding:28px">
<div style="background:linear-gradient(135deg,#ff8a1f,#ffc93c);border-radius:18px;padding:24px;color:#231204">
<h1 style="margin:0;font-size:23px">Thanks, ${escHtml(payload.customer.name)} — you're booked</h1>
<p style="margin:7px 0 0;opacity:.85">Signed copy of invoice ${escHtml(payload.id)}. Keep this email for your records.</p></div>
${shared}
<p style="text-align:center;color:#8a6b46;font-size:12px;margin-top:18px">Questions? Reply to this email or <a href="${M2L_WA}" style="color:#e2620a;font-weight:700">WhatsApp us</a>.<br>Mumbai2London · Nationwide Rickshaw Hire</p>
</div></body></html>`,
        text: textSummary,
        attachments,
      }),
    });
  } catch (e) { /* the business copy is the record */ }

  return json({ ok: true, id: payload.id, signedAt: audit.signedAt, name: audit.name });
}


/* ============================================================
   Mumbai2London — booking diary + enquiry inbox (Cloudflare D1)
   ------------------------------------------------------------
   Every enquiry is stored in D1 so the public calendar can show which
   dates are already taken and Himansu has a back office to work from.

   Everything degrades safely: if the D1 binding is missing the site
   still takes enquiries by email, the calendar simply shows every slot
   as free, and the admin pages say the database is not connected yet.

     GET  /api/m2l/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
     GET  /api/m2l/admin/enquiries?status=&limit=
     GET  /api/m2l/admin/day?date=YYYY-MM-DD
     POST /api/m2l/admin/update    { id, status, reply, sendEmail }
   Admin routes need:  Authorization: Bearer <M2L_ADMIN_TOKEN>
   ============================================================ */

const M2L_SLOTS = ["10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
/* A booking blocks the whole day: one rickshaw, one event. */
const M2L_ONE_PER_DAY = true;

function m2lDb(env) { return env.M2L_DB || null; }

async function handleAvailability(request, env) {
  const db = m2lDb(env);
  const url = new URL(request.url);
  const from = (url.searchParams.get("from") || "").slice(0, 10);
  const to = (url.searchParams.get("to") || "").slice(0, 10);
  if (!db) return json({ ok: true, connected: false, slots: M2L_SLOTS, days: {} });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return json({ error: "from and to must be YYYY-MM-DD" }, 400);
  }
  try {
    const rs = await db.prepare(
      `SELECT event_date, event_time, status FROM enquiries
        WHERE event_date BETWEEN ?1 AND ?2 AND status IN ('confirmed','quoted')`
    ).bind(from, to).all();
    const days = {};
    for (const r of (rs.results || [])) {
      const d = r.event_date;
      if (!d) continue;
      if (!days[d]) days[d] = { taken: [], held: [], count: 0 };
      days[d].count++;
      (r.status === "confirmed" ? days[d].taken : days[d].held).push(r.event_time || "");
    }
    return json({ ok: true, connected: true, slots: M2L_SLOTS, onePerDay: M2L_ONE_PER_DAY, days });
  } catch (e) {
    return json({ ok: true, connected: false, slots: M2L_SLOTS, days: {}, note: String(e).slice(0, 120) });
  }
}

function adminOk(request, env) {
  if (!env.M2L_ADMIN_TOKEN) return "unset";
  const auth = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return auth === env.M2L_ADMIN_TOKEN;
}

async function handleM2LAdmin(request, env, url) {
  const ok = adminOk(request, env);
  if (ok === "unset") return json({ error: "Set the M2L_ADMIN_TOKEN secret on the Worker to use the back office." }, 503);
  if (!ok) return json({ error: "Not authorised." }, 401);
  const db = m2lDb(env);
  if (!db) return json({ error: "The booking database is not connected yet. Create the D1 database and redeploy.", connected: false }, 503);
  const path = url.pathname.replace("/api/m2l/admin/", "");

  try {
    if (path === "enquiries" && request.method === "GET") {
      const status = url.searchParams.get("status") || "";
      const limit = Math.min(300, Math.max(1, Number(url.searchParams.get("limit")) || 200));
      const q = status
        ? db.prepare(`SELECT * FROM enquiries WHERE status=?1 ORDER BY created_at DESC LIMIT ?2`).bind(status, limit)
        : db.prepare(`SELECT * FROM enquiries ORDER BY created_at DESC LIMIT ?1`).bind(limit);
      const rs = await q.all();
      const counts = await db.prepare(`SELECT status, COUNT(*) n FROM enquiries GROUP BY status`).all();
      const byStatus = {};
      for (const c of (counts.results || [])) byStatus[c.status] = c.n;
      return json({ ok: true, connected: true, rows: rs.results || [], counts: byStatus });
    }

    if (path === "day" && request.method === "GET") {
      const date = (url.searchParams.get("date") || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "date must be YYYY-MM-DD" }, 400);
      const rs = await db.prepare(
        `SELECT * FROM enquiries WHERE event_date=?1 ORDER BY COALESCE(event_time,'99:99') ASC`
      ).bind(date).all();
      return json({ ok: true, date, rows: rs.results || [] });
    }

    if (path === "update" && request.method === "POST") {
      const body = await request.json();
      const id = String(body.id || "");
      const status = String(body.status || "");
      const reply = String(body.reply || "").trim().slice(0, 4000);
      if (!id) return json({ error: "Missing enquiry id." }, 400);
      if (status && !["new", "quoted", "confirmed", "declined"].includes(status)) {
        return json({ error: "Unknown status." }, 400);
      }
      const cur = await db.prepare(`SELECT * FROM enquiries WHERE id=?1`).bind(id).first();
      if (!cur) return json({ error: "Enquiry not found." }, 404);

      const newStatus = status || cur.status;
      const now = new Date().toISOString();
      await db.prepare(
        `UPDATE enquiries SET status=?1, reply=COALESCE(NULLIF(?2,''), reply), replied_at=CASE WHEN ?2<>'' THEN ?3 ELSE replied_at END WHERE id=?4`
      ).bind(newStatus, reply, now, id).run();

      let emailed = false;
      if (body.sendEmail && env.RESEND_API_KEY && cur.email) {
        const confirmed = newStatus === "confirmed";
        const declined = newStatus === "declined";
        const head = confirmed ? "Your booking is confirmed"
          : declined ? "About your enquiry"
          : "About your rickshaw enquiry";
        const bar = confirmed ? "linear-gradient(135deg,#00b451,#7ce495)" : "linear-gradient(135deg,#ff8a1f,#ffc93c)";
        const ink = confirmed ? "#04331b" : "#231204";
        const when = [cur.event_date, cur.event_time].filter(Boolean).join(" · ");
        const html = `<!doctype html><html><body style="margin:0;background:#fff7ea;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#2b1a0d">
<div style="max-width:620px;margin:0 auto;padding:28px">
<div style="background:${bar};border-radius:18px;padding:24px;color:${ink}">
<h1 style="margin:0;font-size:23px">${escHtml(head)}</h1>
<p style="margin:7px 0 0;opacity:.88">Hi ${escHtml(cur.name)}${when ? " — " + escHtml(when) : ""}</p></div>
${reply ? `<div style="background:#fff;border-radius:14px;padding:20px;margin-top:16px;white-space:pre-wrap">${escHtml(reply)}</div>` : ""}
<table style="width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden;margin-top:14px">
${[["Event", cur.event_type], ["Date", cur.event_date], ["Time", cur.event_time], ["Hours", cur.hours], ["Location", cur.location], ["Extras", cur.addons]]
  .filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:10px 14px;border-bottom:1px solid #f3e6d2;color:#8a6b46;font-size:13px">${escHtml(k)}</td><td style="padding:10px 14px;border-bottom:1px solid #f3e6d2;font-weight:600">${escHtml(v)}</td></tr>`).join("")}
</table>
<p style="text-align:center;color:#8a6b46;font-size:12px;margin-top:20px">Mumbai2London · Nationwide Rickshaw Hire<br>
<a href="${M2L_WA}" style="color:#e2620a;font-weight:700">WhatsApp</a> · ${escHtml(M2L_EMAIL)}</p>
</div></body></html>`;
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
          body: JSON.stringify({
            from: M2L_FROM, to: [cur.email], reply_to: M2L_EMAIL,
            subject: confirmed ? `Booking confirmed — ${when || cur.event_type || "your event"}` : `Re: your rickshaw enquiry`,
            html, text: (reply || head) + (when ? `\n\n${when}` : ""),
          }),
        });
        emailed = r.ok;
      }
      return json({ ok: true, status: newStatus, emailed });
    }
  } catch (e) {
    return json({ error: "Database error", detail: String(e).slice(0, 200) }, 500);
  }
  return json({ error: "Unknown admin route" }, 404);
}
