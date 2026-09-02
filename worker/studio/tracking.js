/* Megacity Studio — analytics and verification injected into public pages.
   When Settings → Integrations holds a GA4 id or a Meta Pixel id, every
   public Megacity page gets the consent script; a Search Console token adds
   its meta tag. The Studio page itself never gets any of this. */

import { esc } from "./email.js";

export function needsInjection(settings) {
  return !!(settings && (settings.ga4Id || settings.metaPixelId || settings.gscVerification));
}

/* Wrap an HTML Response; pass anything else through untouched. */
export function inject(response, settings) {
  const ct = response.headers.get("content-type") || "";
  if (!/text\/html/i.test(ct) || !needsInjection(settings)) return response;
  const parts = [];
  if (settings.gscVerification) parts.push(`<meta name="google-site-verification" content="${esc(settings.gscVerification)}">`);
  if (settings.ga4Id || settings.metaPixelId) {
    parts.push(`<script src="/templates/megacity-consent.js" data-ga="${esc(settings.ga4Id || "")}" data-pixel="${esc(settings.metaPixelId || "")}" data-text="${esc(settings.consentText || "")}" defer></script>`);
  }
  const res = new HTMLRewriter().on("head", { element: (e) => e.append(parts.join("\n"), { html: true }) }).transform(response);
  const headers = new Headers(res.headers);
  headers.delete("content-length");
  return new Response(res.body, { status: res.status, headers });
}
