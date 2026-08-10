/* ═══════════════════════════════════════════════════════════════════════════
   RED360 · DEPLOYMENT CONFIG
   One file per deployment. It decides how the portfolio behaves and who is
   allowed to see the editing tools. Nothing here is per-property — properties
   live in their own tour-*.js files.
   ═══════════════════════════════════════════════════════════════════════════ */

window.RED360_CONFIG = {

  /* ── PORTFOLIO ────────────────────────────────────────────────────────────
     The listing screen: every property in one grid, with search and filters.
     mode "auto"   portfolio is the landing screen when there is more than one
                   property, and skipped entirely when there is only one
          "always" always land on the portfolio
          "never"  single-property deployment — go straight to the building  */
  portfolio: {
    mode: "auto",
    eyebrow: "Portfolio",
    title: "Every property, walkable",
    blurb: "Each one is a full 360° walkthrough — floor plans, room detail and " +
      "hotspots. Open one and you are inside it in about a second.",
    /* the filter chips down the top of the grid. "All" is added automatically. */
    statuses: ["For sale", "To let", "Under offer", "Sold STC", "Let agreed", "Coming soon"]
  },

  /* ── ADMIN ────────────────────────────────────────────────────────────────
     The Studio — adding properties, adding rooms, editing hotspots, branding —
     is hidden from visitors and only appears once someone signs in.

     IMPORTANT, and say this to the client in plain words:
     this is a *front-of-house* lock. It keeps the editing tools out of a
     visitor's way and off a shared screen. It is not a security boundary: the
     whole app is static files, so anyone who reads the JavaScript can get past
     it. If the property data itself is confidential, put the folder behind
     your server's own login (Basic auth, Cloudflare Access, an .htaccess rule)
     or point `verifyUrl` at an endpoint that checks the code server-side.

     To change the passcode: sign in, then Studio → Access → Change passcode.
     It prints the new line to paste back in here.                            */
  admin: {
    enabled: true,
    /* fnv1a("red360:" + passcode) — the passcode itself is never stored.
       This one is:  redadmin                                                 */
    hash: "b1908d99",
    hint: "Ask 360RED for the studio passcode.",
    /* let a signed-in device stay signed in for this many days (0 = until the
       tab closes) */
    rememberDays: 14,
    /* optional: POST {code} here and expect {ok:true}. When set, the hash
       above is ignored and the check happens on your server instead. */
    verifyUrl: null
  },

  /* ── LEADS ────────────────────────────────────────────────────────────────
     Where "Book a viewing" goes. With an endpoint set, every enquiry is
     POSTed there as JSON ({property, ref, name, email, phone, date, message}).
     Without one, the form opens a pre-filled email to the listing's agent —
     the button only appears when one of the two routes exists.               */
  leads: {
    endpoint: null
  },

  /* ── ANALYTICS ────────────────────────────────────────────────────────────
     Events (tour opens, room visits, hotspot taps, gallery opens, enquiries)
     are always recorded to the viewer's own browser so the Studio can show an
     honest "on this device" picture. To count every visitor, set an endpoint:
     each event is POSTed there as a small JSON beacon. No endpoint, no
     network — nothing is sent anywhere by default.                           */
  analytics: {
    endpoint: null
  },

  /* ── EMBED ────────────────────────────────────────────────────────────────
     What a tour looks like when it is running inside someone else's page.   */
  embed: {
    /* hide the portfolio chrome and land straight in the walkthrough */
    chrome: false,
    /* show the "Platform by …" credit inside embeds */
    credit: true
  }
};
