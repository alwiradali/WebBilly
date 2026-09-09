/* Roses by Rachel — orders and newsletter sign-ups.
 *
 * The order form used to hand the customer a copied message to paste into
 * WhatsApp themselves, because the page had nothing it could send with. That
 * loses the ones who do not bother, and they are the ones who were ready to
 * buy.
 *
 * It is done from the Worker rather than the page for one reason: her Resend
 * key can create and delete anything in her account, so it can never appear in
 * the page source. The browser posts here; the key stays in Cloudflare.
 *
 * Everything is length-capped and the honeypot is honoured, because these two
 * endpoints have to be open to the public.
 */

const RESEND = "https://api.resend.com";

const clean = (v, max = 400) => String(v ?? "").trim().slice(0, max);
const esc = (s) => String(s ?? "").replace(/[<>&"]/g,
  (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function isRachelPath(p) {
  return p === "/api/rbr/order" || p === "/api/rbr/subscribe";
}

function settings(env) {
  return {
    key: clean(env.RBR_RESEND_KEY, 120),
    audience: clean(env.RBR_AUDIENCE_ID, 80),
    to: clean(env.RBR_TO, 160) || "info@rosesbyrachel.co.uk",
    from: clean(env.RBR_FROM, 160) || "Roses by Rachel <orders@rosesbyrachel.co.uk>",
  };
}

/* A field she has to read at 6am on a phone, so: her own labels, in the order
   she needs them, and nothing empty taking up a row. */
const ORDER_FIELDS = [
  ["name", "Name"], ["contact", "Email or mobile"], ["style", "Bouquet"],
  ["presentation", "Presentation"], ["occasion", "Occasion"],
  ["fulfilment", "Delivery or collection"], ["postcode", "Postcode"],
  ["date", "Date needed"], ["budget", "Budget"], ["colours", "Colours"],
  ["notes", "Notes"],
];

async function sendOrder(env, body) {
  const s = settings(env);
  if (!s.key) return { error: "Ordering by email is not switched on yet.", status: 503 };

  const name = clean(body.name, 120);
  const contact = clean(body.contact, 160);
  if (!name || !contact) {
    return { error: "A name and a way to reach you are both needed.", status: 400 };
  }

  const rows = ORDER_FIELDS
    .map(([k, label]) => [label, clean(body[k], k === "notes" ? 2000 : 200)])
    .filter(([, v]) => v)
    .map(([label, v]) =>
      `<tr><td style="padding:7px 14px 7px 0;color:#8A7268;white-space:nowrap;vertical-align:top">${esc(label)}</td>` +
      `<td style="padding:7px 0;color:#2E1C20"><b>${esc(v)}</b></td></tr>`)
    .join("");

  const html =
    `<div style="font-family:Georgia,'Times New Roman',serif;color:#2E1C20;line-height:1.6">
      <p style="font-size:19px;margin:0 0 4px"><b>New order from your website</b></p>
      <p style="margin:0 0 18px;color:#8A7268">${esc(name)} would like to order.</p>
      <table style="border-collapse:collapse;font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:15px">${rows}</table>
      <p style="margin-top:22px;font-size:13px;color:#8A7268">
        Reply to this email and it goes straight back to them.</p>
    </div>`;

  const payload = {
    from: s.from,
    to: [s.to],
    subject: `New order from ${name}`,
    html,
  };
  /* So she can simply press reply. Only when they left an email, not a phone. */
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact)) payload.reply_to = contact;

  const res = await fetch(RESEND + "/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${s.key}`, "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { error: "Could not send that order: " + detail.slice(0, 200), status: 502 };
  }
  return { ok: true };
}

/* The Flower Note. Consent is the whole point of this endpoint: nobody is
   added here except by asking to be, and Resend puts the unsubscribe link in
   every send, which the law requires. */
async function subscribe(env, body) {
  const s = settings(env);
  if (!s.key || !s.audience) {
    return { error: "Sign-ups are not switched on yet.", status: 503 };
  }
  const email = clean(body.email, 160);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "That does not look like an email address.", status: 400 };
  }

  const res = await fetch(`${RESEND}/audiences/${encodeURIComponent(s.audience)}/contacts`, {
    method: "POST",
    headers: { authorization: `Bearer ${s.key}`, "content-type": "application/json" },
    body: JSON.stringify({ email, unsubscribed: false }),
    signal: AbortSignal.timeout(8000),
  });
  /* Resend answers 200 for somebody already on the list, which is the right
     outcome for her and should never be shown to the visitor as an error. */
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (!/already/i.test(detail)) {
      return { error: "Could not add you just now.", status: 502 };
    }
  }
  return { ok: true };
}

export async function handleRachel(request, env, url) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const body = await request.json().catch(() => ({}));
  if (clean(body.botcheck, 40)) return json({ ok: true });   /* a bot: look normal, do nothing */

  const out = url.pathname === "/api/rbr/order"
    ? await sendOrder(env, body)
    : await subscribe(env, body);

  return out.error ? json({ error: out.error }, out.status || 500) : json(out);
}
