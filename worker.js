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

const REVIEW_URL = "https://g.page/r/CVVojLMqV7dcECE/review";
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
