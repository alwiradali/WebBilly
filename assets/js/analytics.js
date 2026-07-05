/* ============================================================
   Billy Digitals — Analytics & conversion tracking
   ------------------------------------------------------------
   1) Set GA_ID below to your Google Analytics 4 Measurement ID
      (looks like "G-XXXXXXXXXX"). Until you do, this stays
      completely inert — nothing is loaded or sent.
   2) Events fired via bdTrack():
        page_view          — every page (automatic via GA)
        generate_lead      — enquiry form completed (thank-you page)
        contact_whatsapp   — WhatsApp link clicked
        contact_email      — email link clicked
        select_plan        — a "Request a Quote" plan button clicked
   3) In Google Ads: link GA4 to Google Ads and import
      "generate_lead" (and optionally "contact_whatsapp") as
      conversions — then your Search campaign optimises for real
      enquiries.
   ============================================================ */
(function () {
  // 👉 Paste your GA4 Measurement ID here (e.g. "G-ABC123XYZ").
  var GA_ID = "G-XXXXXXXXXX";

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  // Fire a tracked event to GA (if live) and the dataLayer (always).
  window.bdTrack = function (name, params) {
    try {
      if (typeof window.gtag === "function") window.gtag("event", name, params || {});
      window.dataLayer.push(Object.assign({ event: name }, params || {}));
    } catch (e) { /* never break the page for analytics */ }
  };

  // Load GA only when a real Measurement ID is set (otherwise stay inert).
  var live = GA_ID && GA_ID.indexOf("G-XXXX") !== 0;
  if (live) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
    window.gtag("js", new Date());
    window.gtag("config", GA_ID);
  }

  // Conversion: the thank-you page is only reached after a completed enquiry.
  // Fired here (in <head>) so it never depends on the rest of the page's JS.
  if (/thank-you/i.test(location.pathname)) {
    window.bdTrack("generate_lead", { currency: "GBP", value: 1 });
  }
})();
