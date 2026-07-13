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
    // Everything else is a static asset (ASSETS honours 404-page handling).
    return env.ASSETS.fetch(request);
  },
};

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
  const origin = request.headers.get("origin") || "";
  if (origin && !/^https?:\/\/(www\.)?billydigitals\.com$/i.test(origin)) {
    return json({ error: "Forbidden" }, 403);
  }

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
  return json({ ok: true });
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
