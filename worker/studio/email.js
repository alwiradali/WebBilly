/* Megacity Studio — transactional email through Resend.
   Invites, password resets and enquiry notifications.

   Nothing here is ever sent to a member of the public: every message goes to
   Walid or his staff. So the sender address is seen only inside the agency,
   which is why launching on the agency's already-verified domain costs
   nothing and why moving to his own can wait for a quiet week.

   MAIL_FROM makes that move a setting rather than a deploy. When his own
   domain is verified in his own Resend account, set MAIL_FROM to
   "Megacity Properties <website@megacityproperties.co.uk>" and swap
   RESEND_API_KEY for his. Nothing else changes.

   Verification puts its records on a send. subdomain and a
   resend._domainkey TXT — his root MX and root SPF, and therefore his
   Microsoft 365 mail, are not touched. */

const DEFAULT_FROM = "Megacity Studio <hello@billydigitals.com>";

/* A from address must be one the Resend key is allowed to send as. A typo
   here is rejected by Resend for every email at once, so an obviously broken
   value falls back rather than taking the mail with it. */
export function mailFrom(env) {
  const v = env && typeof env.MAIL_FROM === "string" ? env.MAIL_FROM.trim() : "";
  return /@[a-z0-9.-]+\.[a-z]{2,}/i.test(v) ? v.slice(0, 200) : DEFAULT_FROM;
}

export const STUDIO_FROM = DEFAULT_FROM;

export async function sendEmail(env, { to, subject, html, text, replyTo }) {
  if (!env.RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY is not set" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      from: mailFrom(env),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("resend", res.status, detail.slice(0, 300));
    return { ok: false, error: "Email provider rejected the request" };
  }
  return { ok: true };
}

export function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* The Megacity email frame: navy header, ivory body. */
export function layout(title, bodyHtml, foot) {
  return (
    `<div style="max-width:600px;margin:0 auto;border:1px solid #E3E8F4;border-radius:14px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">` +
    `<div style="background:#1D2049;padding:20px 24px;font:700 17px/1.3 Arial,sans-serif;color:#F5F2EA;">Megacity Properties <span style="color:#8FC4F5;font-weight:400;">· Studio</span></div>` +
    `<div style="padding:24px;background:#fff;color:#12142B;font:400 15px/1.65 Arial,sans-serif;">` +
    `<h1 style="margin:0 0 12px;font:700 21px/1.3 Georgia,'Times New Roman',serif;color:#1D2049;">${esc(title)}</h1>` +
    bodyHtml +
    `</div>` +
    `<div style="padding:12px 24px;background:#F3F7FA;font:400 12px/1.6 Arial,sans-serif;color:#5A617D;">${foot || "If you were not expecting this email you can ignore it."}</div></div>`
  );
}

export function button(href, label) {
  return `<p style="margin:20px 0;"><a href="${esc(href)}" style="display:inline-block;background:#176B99;color:#fff;text-decoration:none;font:700 14px/1 Arial,sans-serif;padding:14px 22px;border-radius:999px;">${esc(label)}</a></p>` +
    `<p style="margin:0;font:400 12px/1.6 Arial,sans-serif;color:#5A617D;">Or paste this link into your browser:<br><span style="word-break:break-all;">${esc(href)}</span></p>`;
}

export function inviteEmail({ name, inviterName, role, link }) {
  const who = inviterName ? `${esc(inviterName)} has` : "You have been";
  const html = layout(
    "You're invited to the Megacity Studio",
    `<p>${who} invited you to join the Megacity Properties Studio as <b>${role === "owner" ? "an owner" : "a member of staff"}</b>. ` +
      `It is where the team manages 360° tours, website content and enquiries.</p>` +
      button(link, "Create your login") +
      `<p style="margin-top:18px;">The link works for 48 hours and can be used once.</p>`
  );
  const text = `${inviterName ? inviterName + " has" : "You have been"} invited to the Megacity Properties Studio as ${role}.\n\nCreate your login: ${link}\n\nThe link works for 48 hours and can be used once.`;
  return { subject: "Your Megacity Studio invitation", html, text };
}

export function resetEmail({ link }) {
  const html = layout(
    "Reset your Studio password",
    `<p>Someone asked to reset the password for this email address. If that was you, choose a new password here:</p>` +
      button(link, "Choose a new password") +
      `<p style="margin-top:18px;">The link works for 48 hours and can be used once. If you did not ask for this, nothing has changed.</p>`
  );
  const text = `Reset your Megacity Studio password: ${link}\n\nThe link works for 48 hours and can be used once. If you did not ask for this, nothing has changed.`;
  return { subject: "Reset your Megacity Studio password", html, text };
}
