/* Megacity Studio — analytics and verification injected into public pages.
   When Settings → Integrations holds a GA4 id, a Google Tag Manager id or a
   Meta Pixel id, every public Megacity page gets the consent script; a
   Search Console token adds its meta tag. The Studio page itself never gets
   any of this. Works on both hosts (worker/studio/urls.js). */

import { esc } from "./email.js";
import { pagePath } from "./urls.js";

export function needsInjection(settings) {
  return !!(settings && (settings.ga4Id || settings.metaPixelId || settings.gtmId || settings.gscVerification));
}

/* Wrap an HTML Response; pass anything else through untouched.
   opts.mode: "root" on the client domain, "demo" (default) elsewhere. */
export function inject(response, settings, opts) {
  const ct = response.headers.get("content-type") || "";
  if (!/text\/html/i.test(ct) || !needsInjection(settings)) return response;
  const mode = (opts && opts.mode) || "demo";
  const parts = [];
  if (settings.gscVerification) parts.push(`<meta name="google-site-verification" content="${esc(settings.gscVerification)}">`);
  if (settings.ga4Id || settings.metaPixelId || settings.gtmId) {
    parts.push(`<script src="/templates/megacity-consent.js" data-ga="${esc(settings.ga4Id || "")}" data-gtm="${esc(settings.gtmId || "")}" data-pixel="${esc(settings.metaPixelId || "")}" data-privacy="${esc(pagePath(mode, "privacy"))}" data-text="${esc(settings.consentText || "")}" defer></script>`);
  }
  const res = new HTMLRewriter().on("head", { element: (e) => e.append(parts.join("\n"), { html: true }) }).transform(response);
  const headers = new Headers(res.headers);
  headers.delete("content-length"); headers.delete("etag"); headers.delete("last-modified");
  return new Response(res.body, { status: res.status, headers });
}
