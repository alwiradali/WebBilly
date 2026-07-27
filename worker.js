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
    if (url.pathname === "/api/book") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      return handleBook(request, env);
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
  const origin = request.headers.get("origin") || "";
  if (origin && !/^https?:\/\/(www\.)?billydigitals\.com$/i.test(origin)) {
    return json({ error: "Forbidden" }, 403);
  }

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
