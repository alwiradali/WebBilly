/* ════════════════════════════════════════════════════════════════════
   MEGACITY STUDIO · API façade  (window.MCStudioAPI)
   One place that knows how to talk to the Worker (/api/studio/*), per
   docs/megacity-studio.md. Every request is same-origin, carries
   X-Studio: 1, and a 401 on anything but the auth routes raises the
   `studio:signedout` event so the app can drop to the sign-in screen.

   Mock mode: add ?mock=1 to the page URL and the same façade answers
   from memory with fixtures derived from the five current listings
   (templates/megacity-let-*.html) so the whole UI can be exercised
   without the Worker. ?mock=1&state=out|setup|offline starts signed
   out / needing an owner / not connected.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var BASE = "/api/studio";
  var qs = new URLSearchParams(location.search);
  var MOCK = qs.get("mock") === "1";
  var AUTH_ROUTE = /^\/auth\//;

  /* ── error type ──────────────────────────────────────────────────── */
  function ApiError(status, body) {
    this.name = "ApiError";
    this.status = status;
    this.body = body || {};
    this.message = (body && body.error) || (status === 0 ? "Network problem — check your connection and try again." : "Request failed (" + status + ")");
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  function signedOut() {
    try { document.dispatchEvent(new CustomEvent("studio:signedout")); } catch (e) { /* older engines */ }
  }
  function handle401(path, status) {
    if (status === 401 && !AUTH_ROUTE.test(path)) signedOut();
  }

  /* ── real transport ──────────────────────────────────────────────── */
  function parseBody(text, status) {
    if (!text) return {};
    try { return JSON.parse(text); } catch (e) { return { error: "Unexpected response from the server (" + status + ")" }; }
  }
  function http(method, path, body) {
    var headers = { "X-Studio": "1", "Accept": "application/json" };
    var init = { method: method, credentials: "same-origin", headers: headers };
    if (body !== undefined && body !== null) { headers["Content-Type"] = "application/json"; init.body = JSON.stringify(body); }
    return fetch(BASE + path, init).then(function (res) {
      return res.text().then(function (text) {
        var data = parseBody(text, res.status);
        if (!res.ok) throw new ApiError(res.status, data);
        return data;
      });
    }, function () { throw new ApiError(0, null); });
  }
  /* uploads go through XHR so progress events work */
  function xhrSend(method, url, body, contentType, onProgress) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open(method, url, true);
      x.withCredentials = true;
      x.setRequestHeader("X-Studio", "1");
      x.setRequestHeader("Accept", "application/json");
      if (contentType) x.setRequestHeader("Content-Type", contentType);
      if (x.upload && onProgress) x.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      x.onload = function () {
        var data = parseBody(x.responseText, x.status);
        if (x.status >= 200 && x.status < 300) { if (onProgress) onProgress(1); resolve(data); }
        else reject(new ApiError(x.status, data));
      };
      x.onerror = function () { reject(new ApiError(0, null)); };
      x.onabort = function () { reject(new ApiError(0, { error: "Upload cancelled" })); };
      x.send(body);
    });
  }
  function query(params) {
    var parts = [];
    Object.keys(params || {}).forEach(function (k) {
      var v = params[k];
      if (v === undefined || v === null || v === "" || v === false) return;
      parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(v === true ? "1" : v));
    });
    return parts.length ? "?" + parts.join("&") : "";
  }

  /* ── option lists: a copy of worker/studio/options.js ─────────────
     The UI always asks GET /api/studio/options first; this copy is the
     network fallback and the mock's answer. Values are what is stored. */
  var LISTS = {
    type: [["apartment", "Apartment"], ["studio", "Studio"], ["house_terraced", "Terraced house"], ["house_semi", "Semi-detached house"], ["house_detached", "Detached house"], ["maisonette", "Maisonette"], ["bungalow", "Bungalow"], ["room_in_share", "Room in a shared house"], ["hmo_whole", "Whole HMO"], ["commercial", "Commercial unit"]],
    letType: [["whole", "Whole property"], ["room", "Room in a share"], ["student", "Student let"]],
    furnishing: [["furnished", "Furnished"], ["part", "Part-furnished"], ["unfurnished", "Unfurnished"]],
    availability: [["available_now", "Available now"], ["from_date", "Available from a date"], ["let_agreed", "Let agreed"], ["coming_soon", "Coming soon"]],
    bills: [["included", "Bills included"], ["excluded", "Bills not included"], ["some", "Some bills included"]],
    minTerm: [["6", "6 months"], ["12", "12 months"], ["24", "24 months"], ["flexible", "Flexible"]],
    councilTaxBand: ["A", "B", "C", "D", "E", "F", "G", "H"].map(function (b) { return [b, "Band " + b]; }),
    epcRating: ["A", "B", "C", "D", "E", "F", "G"].map(function (r) { return [r, r]; }).concat([["pending", "Certificate pending"]]),
    pets: [["considered", "Pets considered"], ["yes", "Pets welcome"], ["no", "No pets"]],
    parkingSpaces: [0, 1, 2, 3, 4, 5, 6].map(function (n) { return [String(n), n === 0 ? "No allocated parking" : n + (n === 1 ? " space" : " spaces")]; }),
    area: [["manchester", "Manchester"], ["salford", "Salford"], ["trafford", "Trafford"], ["stockport", "Stockport"], ["bury", "Bury"], ["oldham", "Oldham"], ["tameside", "Tameside"], ["rochdale", "Rochdale"], ["bolton", "Bolton"], ["wigan", "Wigan"]],
    bathroom: [["bathroom", "Bathroom with bath"], ["bath_shower_over", "Bathroom, shower over bath"], ["shower_room", "Shower room"], ["en_suite", "En-suite"], ["wc", "Separate WC"], ["wet_room", "Wet room"], ["shared", "Shared bathroom"]],
    reception: [["living", "Living room"], ["lounge_diner", "Lounge / diner"], ["open_plan", "Open-plan living"], ["reception", "Reception room"], ["dining", "Dining room"], ["conservatory", "Conservatory"]],
    kitchen: [["fitted", "Fitted kitchen"], ["fitted_integrated", "Fitted kitchen with integrated appliances"], ["kitchen_diner", "Kitchen / diner"], ["open_plan", "Open-plan kitchen"], ["shared", "Shared kitchen"]],
    garden: [["private_rear", "Private rear garden"], ["private_front", "Private front garden"], ["shared", "Shared garden"], ["communal", "Communal garden"], ["yard", "Yard"], ["balcony", "Balcony"], ["terrace", "Terrace"]],
    driveway: [["driveway_1", "Driveway, one car"], ["driveway_2", "Driveway, two or more cars"], ["garage", "Garage"], ["off_street", "Off-street parking"]],
    status: [["draft", "Draft"], ["live", "Live"], ["let_agreed", "Let agreed"], ["let", "Let"], ["withdrawn", "Withdrawn"]],
    mediaRole: [["gallery", "Gallery"], ["cover", "Cover"], ["epc", "EPC certificate"], ["floorplan", "Floor plan"], ["tour", "360° panorama"]],
    tourRoom: [["hallway", "Hallway"], ["living", "Living room"], ["kitchen", "Kitchen"], ["bedroom", "Bedroom"], ["bathroom", "Bathroom"], ["en_suite", "En-suite"], ["garden", "Garden"], ["driveway", "Driveway"], ["landing", "Landing"], ["other", "Other"]],
    enquirySource: [["viewing", "Viewing request"], ["contact", "Contact form"], ["valuation", "Valuation request"], ["register", "Registration"], ["tour", "360° tour"], ["maintenance", "Maintenance"]]
  };
  function optionsJson() {
    var out = {};
    Object.keys(LISTS).forEach(function (k) { out[k] = LISTS[k].map(function (p) { return { value: p[0], label: p[1] }; }); });
    return out;
  }

  /* ── shared dispatcher ───────────────────────────────────────────── */
  var mock = null;
  function call(method, path, body) {
    var p = MOCK ? mock.call(method, path, body) : http(method, path, body);
    return p.catch(function (err) {
      if (err instanceof ApiError) handle401(path, err.status);
      throw err;
    });
  }
  function upload(method, path, body, contentType, onProgress) {
    var p = MOCK ? mock.upload(method, path, body, onProgress) : xhrSend(method, BASE + path, body, contentType, onProgress);
    return p.catch(function (err) {
      if (err instanceof ApiError) handle401(path, err.status);
      throw err;
    });
  }

  /* ── the public surface ──────────────────────────────────────────── */
  var optionsCache = null;
  var API = {
    isMock: MOCK,
    base: BASE,
    ApiError: ApiError,
    auth: {
      me: function () { return call("GET", "/auth/me"); },
      login: function (email, password) { return call("POST", "/auth/login", { email: email, password: password }); },
      logout: function () { return call("POST", "/auth/logout"); },
      bootstrap: function (body) { return call("POST", "/auth/bootstrap", body); },
      forgot: function (email) { return call("POST", "/auth/forgot", { email: email }); },
      reset: function (token, password) { return call("POST", "/auth/reset", { token: token, password: password }); },
      changePassword: function (current, next) { return call("POST", "/auth/change-password", { current: current, next: next }); },
      acceptInvite: function (token, name, password) { return call("POST", "/auth/accept-invite", { token: token, name: name, password: password }); }
    },
    team: {
      list: function () { return call("GET", "/team"); },
      invite: function (email, role) { return call("POST", "/team/invite", { email: email, role: role }); },
      resendInvite: function (email) { return call("POST", "/team/invite/resend", { email: email }); },
      update: function (id, patch) { return call("PATCH", "/team/" + encodeURIComponent(id), patch); }
    },
    options: {
      get: function () {
        if (optionsCache) return Promise.resolve(optionsCache);
        return call("GET", "/options").then(function (o) { optionsCache = o; return o; }, function (err) {
          if (err.status === 401 || err.status === 503) throw err;
          optionsCache = optionsJson();
          return optionsCache;
        });
      },
      fallback: optionsJson
    },
    settings: {
      get: function () { return call("GET", "/settings"); },
      put: function (partial) { return call("PUT", "/settings", partial); }
    },
    listings: {
      list: function (params) { return call("GET", "/listings" + query(params)); },
      get: function (id) { return call("GET", "/listings/" + encodeURIComponent(id)); },
      create: function (body) { return call("POST", "/listings", body); },
      patch: function (id, patch) { return call("PATCH", "/listings/" + encodeURIComponent(id), patch); },
      remove: function (id, hard) { return call("DELETE", "/listings/" + encodeURIComponent(id) + (hard ? "?hard=1" : "")); },
      restore: function (id) { return call("POST", "/listings/" + encodeURIComponent(id) + "/restore"); },
      duplicate: function (id) { return call("POST", "/listings/" + encodeURIComponent(id) + "/duplicate"); },
      publish: function (id) { return call("POST", "/listings/" + encodeURIComponent(id) + "/publish"); },
      unpublish: function (id) { return call("POST", "/listings/" + encodeURIComponent(id) + "/unpublish"); },
      setStatus: function (id, status) { return call("POST", "/listings/" + encodeURIComponent(id) + "/status", { status: status }); },
      orderMedia: function (id, ids) { return call("PUT", "/listings/" + encodeURIComponent(id) + "/media/order", { ids: ids }); },
      importLegacy: function (listings) { return call("POST", "/import/legacy", { listings: listings }); }
    },
    media: {
      /* formData: meta (JSON string) + orig + large + thumb (+ pano) */
      upload: function (formData, onProgress) { return upload("POST", "/media", formData, null, onProgress); },
      /* video / pdf: raw body, params {listingId, kind, role, filename} */
      stream: function (file, params, onProgress) {
        return upload("PUT", "/media/stream" + query(params), file, file.type || "application/octet-stream", onProgress);
      },
      patch: function (id, patch) { return call("PATCH", "/media/" + encodeURIComponent(id), patch); },
      remove: function (id) { return call("DELETE", "/media/" + encodeURIComponent(id)); }
    },
    dashboard: { get: function () { return call("GET", "/dashboard"); } },
    notfound: { list: function (q) { return call("GET", "/notfound" + (q && q.days ? "?days=" + encodeURIComponent(q.days) : "")); } },
    tours: {
      get: function (id) { return call("GET", "/tours/" + encodeURIComponent(id)); },
      create: function (id, body) { return call("POST", "/tours/" + encodeURIComponent(id), body || {}); },
      put: function (id, body) { return call("PUT", "/tours/" + encodeURIComponent(id), body); },
      publish: function (id, body) { return call("POST", "/tours/" + encodeURIComponent(id) + "/publish", body || {}); },
      unpublish: function (id) { return call("POST", "/tours/" + encodeURIComponent(id) + "/unpublish"); },
      remove: function (id) { return call("DELETE", "/tours/" + encodeURIComponent(id)); }
    },
    enquiries: {
      list: function (params) { return call("GET", "/enquiries" + query(params)); },
      get: function (id) { return call("GET", "/enquiries/" + encodeURIComponent(id)); },
      patch: function (id, patch) { return call("PATCH", "/enquiries/" + encodeURIComponent(id), patch); }
    },
    pages: {
      list: function () { return call("GET", "/pages"); },
      get: function (id) { return call("GET", "/pages/" + encodeURIComponent(id)); },
      create: function (body) { return call("POST", "/pages", body); },
      patch: function (id, patch) { return call("PATCH", "/pages/" + encodeURIComponent(id), patch); },
      remove: function (id) { return call("DELETE", "/pages/" + encodeURIComponent(id)); },
      publish: function (id) { return call("POST", "/pages/" + encodeURIComponent(id) + "/publish"); },
      unpublish: function (id) { return call("POST", "/pages/" + encodeURIComponent(id) + "/unpublish"); }
    },
    backlinks: {
      list: function () { return call("GET", "/backlinks"); },
      create: function (body) { return call("POST", "/backlinks", body); },
      patch: function (id, patch) { return call("PATCH", "/backlinks/" + encodeURIComponent(id), patch); },
      remove: function (id) { return call("DELETE", "/backlinks/" + encodeURIComponent(id)); },
      check: function (id) { return call("POST", "/backlinks/" + encodeURIComponent(id) + "/check"); },
      checkAll: function () { return call("POST", "/backlinks/check-all"); }
    },
    ai: {
      listingCopy: function (listingId, tone) { return call("POST", "/ai/listing-copy", { listingId: listingId, tone: tone || "standard" }); },
      classifyRoom: function (mediaId) { return call("POST", "/ai/classify-room", { mediaId: mediaId }); },
      altText: function (mediaId) { return call("POST", "/ai/alt-text", { mediaId: mediaId }); },
      shareKit: function (listingId) { return call("POST", "/ai/share-kit", { listingId: listingId }); },
      pageDraft: function (body) { return call("POST", "/ai/page-draft", body); },
      usage: function () { return call("GET", "/ai/usage"); }
    },
    notifications: {
      list: function () { return call("GET", "/notifications"); },
      /* ids: [] or nothing marks everything read */
      markRead: function (ids) { return call("POST", "/notifications/read", ids && ids.length ? { ids: ids } : {}); }
    },
    /* the hand-built seed (scripts/megacity-seed.mjs writes it) */
    seed: {
      get: function () {
        var real = fetch("/templates/megacity-seed.json", { credentials: "same-origin" }).then(function (res) {
          if (!res.ok) throw new ApiError(res.status, { error: res.status === 404 ? "The seed file (templates/megacity-seed.json) has not been built yet." : "Could not read the seed file." });
          return res.json();
        }, function () { throw new ApiError(0, null); });
        /* mock mode prefers the real seed file when it is served, else its own copy */
        return MOCK ? real.catch(function () { return mock.seed(); }) : real;
      }
    },
    exportUrl: BASE + "/export"
  };
  window.MCStudioAPI = API;

  /* ══ MOCK MODE ═══════════════════════════════════════════════════════
     Fixtures are the five listings currently on the site, taken from
     templates/megacity-let-*.html (titles, rents, deposits, refs, the
     feature lists and the photo alt text). Nothing here is invented. */
  function buildMock() {
    var now = Date.now();
    var mode = qs.get("state") || "";
    var PROPS = "/templates/assets/mcr/props/";
    function ago(hours) { return new Date(now - hours * 3600e3).toISOString(); }
    function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function fail(status, body) { throw new ApiError(status, body); }
    function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
    var seq = 0;
    function uid(prefix) { seq++; return prefix + "_" + now.toString(36).slice(-4) + seq.toString(36); }
    function slug(s) { return String(s || "listing").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "listing"; }

    var ME = { id: "u_walid", name: "Walid Mhana", email: "info@megacityproperties.co.uk", role: "owner" };
    var DB = {
      signedIn: mode !== "out" && mode !== "setup",
      needsOwner: mode === "setup",
      offline: mode === "offline",
      users: [
        { id: "u_walid", name: "Walid Mhana", email: "info@megacityproperties.co.uk", role: "owner", disabled: false, lastLoginAt: ago(2), createdAt: ago(24 * 20) },
        { id: "u_staff", name: "Sample staff account", email: "staff@example.com", role: "staff", disabled: false, lastLoginAt: ago(31), createdAt: ago(24 * 12) }
      ],
      invites: [],
      settings: {
        brand: { name: "Megacity Properties", phone: "0161 220 1763", whatsapp: "", email: "info@megacityproperties.co.uk", address: "Office 21, The Tube Business Centre, 86 North Street, Manchester M8 8RA" },
        notifyEmails: ["info@megacityproperties.co.uk"],
        links10ninety: { maintenance: "", apply: "", registerTenant: "", registerLandlord: "" },
        tourGateScore: null, ga4Id: "", gtmId: "", metaPixelId: "", gscVerification: "", consentText: "", redirects: []
      },
      listings: [],
      audit: [],
      enquiries: [],
      notifications: [],
      tours: {},
      pages: [],
      backlinks: [],
      aiUsage: [],
      ai: qs.get("ai") !== "0"
    };
    function mockLabel(list, v) { var hit = (LISTS[list] || []).filter(function (p) { return p[0] === String(v); })[0]; return hit ? hit[1] : ""; }

    function photo(listingId, file, i, roomLabel, alt) {
      var id = "m_" + listingId.replace(/[^a-z0-9]/g, "") + "_" + (i < 10 ? "0" + i : i);
      return { id: id, kind: "photo", role: "gallery", roomLabel: roomLabel || "", url: PROPS + file, thumb: PROPS + file, orig: PROPS + file, pano: null, mime: "image/jpeg", width: null, height: null, bytes: null, alt: alt || "", caption: null, sort: i, isPano: false, aiLabel: null };
    }
    function listing(o) {
      var media = (o.photos || []).map(function (p, i) { return photo(o.id, p[0], i, p[1], p[2]); });
      var base = {
        id: o.id, source: "manual", externalId: null, ref: null, status: "live", hidden: false,
        title: "", headline: null, type: null, letType: null, furnishing: null,
        rentPcm: null, deposit: null, bills: null, billsNote: null,
        availability: null, availableFrom: null, minTerm: null, councilTaxBand: null, epcRating: null,
        bedrooms: null, home: { bathrooms: [], receptions: [], kitchen: null, garden: null, driveway: null },
        parkingSpaces: null, parkingNote: null, pets: null, hmoLicensed: false, floorAreaSqft: null,
        address: { line1: "", line2: "", town: "", postcode: "", area: null, lat: null, lng: null },
        summary: null, description: null, features: [], coverMediaId: media.length ? media[0].id : null,
        seoTitle: null, seoDescription: null, media: media, tour: null, syncedAt: null,
        publishedAt: null, createdAt: ago(24 * 9), updatedAt: ago(6), updatedBy: "u_walid"
      };
      Object.keys(o).forEach(function (k) { if (k !== "photos") base[k] = o[k]; });
      return base;
    }
    function bath(s) { return { subtype: s }; }

    DB.listings.push(listing({
      id: "ladywell-point", ref: "RL0140", title: "2 bed apartment, Ladywell Point, Salford",
      type: "apartment", letType: "whole", furnishing: "furnished", rentPcm: 1250, deposit: 1250,
      availability: "available_now", councilTaxBand: "B", bedrooms: 2,
      home: { bathrooms: [bath("bath_shower_over"), bath("en_suite")], receptions: [bath("open_plan")], kitchen: bath("fitted_integrated"), garden: null, driveway: null },
      address: { line1: "Ladywell Point", line2: "Pilgrims Way", town: "Salford", postcode: "", area: "salford", lat: null, lng: null },
      summary: "A well-presented two-bedroom apartment within easy reach of Salford Quays, MediaCityUK and Manchester city centre.",
      description: "Megacity Properties are delighted to present this well-presented two-bedroom apartment, ideally situated within easy reach of Salford Quays, MediaCityUK and Manchester city centre.\n\nOffering bright and spacious accommodation throughout, the property comprises a welcoming entrance hall, two good-sized double bedrooms, a modern family bathroom and a contemporary open-plan living and kitchen area.\n\nConveniently located just a short walk from Ladywell Metrolink stop, the apartment offers excellent transport links across Greater Manchester.",
      features: ["Two spacious double bedrooms", "Master bedroom with en-suite shower room", "Modern family bathroom", "Bright open-plan living and kitchen area", "Furnished", "Contemporary fitted kitchen with integrated appliances", "Excellent transport links", "Walking distance to Ladywell Metrolink", "Close to MediaCityUK, Salford Quays and Manchester city centre"],
      publishedAt: ago(24 * 3), updatedAt: ago(5),
      photos: [
        ["ladywell-00.jpg", "Living room", "Living room with corner sofa at Ladywell Point, Pilgrims Way, Salford"],
        ["ladywell-01.jpg", "Kitchen", "Fitted kitchen with oven, hob and fridge freezer, Ladywell Point, Salford"],
        ["ladywell-02.jpg", "Bedroom 1", "Double bedroom with floor-to-ceiling window, Ladywell Point, Salford"],
        ["ladywell-03.jpg", "Bedroom 2", "Second double bedroom, Ladywell Point, Salford"],
        ["ladywell-04.jpg", "Bathroom", "Bathroom with bath and shower over, Ladywell Point, Salford"],
        ["ladywell-05.jpg", "En-suite", "Shower room, Ladywell Point, Salford"],
        ["ladywell-06.jpg", "Hallway", "Hallway leading to both bedrooms, Ladywell Point, Salford"]
      ]
    }));
    DB.listings.push(listing({
      id: "denmark-road", title: "2 bed apartment, Denmark Road, Manchester",
      type: "apartment", letType: "whole", rentPcm: 1300, deposit: 1300,
      availability: "available_now", councilTaxBand: "B", bedrooms: 2, parkingSpaces: 2,
      home: { bathrooms: [bath("en_suite"), bath("bathroom")], receptions: [bath("open_plan")], kitchen: bath("open_plan"), garden: bath("balcony"), driveway: null },
      address: { line1: "99 Denmark Road", line2: "", town: "Manchester", postcode: "", area: "manchester", lat: null, lng: null },
      summary: "A spacious two-bedroom apartment on the second floor at 99 Denmark Road, ideally located for the University of Manchester and Manchester Metropolitan University.",
      description: "Megacity Properties is pleased to offer this spacious two-bedroom apartment, ideally located for University of Manchester and Manchester Metropolitan University students.\n\nSituated on the second floor at 99 Denmark Road, the apartment is an excellent choice for two students looking to share, offering two double bedrooms, two bathrooms, an open-plan living space, private balcony and two parking spaces.",
      features: ["Ideal for two students sharing", "Two double bedrooms", "Master bedroom with private en-suite", "Separate main bathroom", "Spacious open-plan kitchen and lounge", "Private balcony", "Two parking spaces", "Second-floor apartment", "Excellent location for Manchester universities"],
      publishedAt: ago(24 * 5), updatedAt: ago(26),
      photos: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (i) { return ["denmark-" + (i < 10 ? "0" + i : i) + ".jpg", "", "Denmark Road, Manchester" + (i ? ", photo " + (i + 1) : "")]; })
    }));
    DB.listings.push(listing({
      id: "room-3", ref: "RL0063-3", title: "Furnished double room, licensed HMO, Salford",
      type: "room_in_share", letType: "room", furnishing: "furnished", rentPcm: 600, deposit: 500, bills: "included",
      availability: "available_now", councilTaxBand: "B", epcRating: "D", bedrooms: 1, hmoLicensed: true,
      home: { bathrooms: [bath("shared"), bath("shared"), bath("shared")], receptions: [], kitchen: bath("shared"), garden: null, driveway: null },
      address: { line1: "", line2: "", town: "Salford", postcode: "", area: "salford", lat: null, lng: null },
      summary: "A furnished double room in a spacious licensed HMO in Salford, ideally located for students and working professionals.",
      description: "A furnished double room is available in this spacious licensed HMO in Salford, ideally located for both students and working professionals.\n\nThe property is approximately a 15-minute walk from the University of Salford and is conveniently located near local shops and transport links.\n\nSet over four floors, the property comprises eight bedrooms, three bathrooms and a large shared kitchen.",
      features: ["Furnished double room", "Licensed HMO", "Approximately 15 minutes' walk to the University of Salford", "Eight bedrooms over four floors", "Three bathrooms", "Large shared kitchen", "Double glazing", "Gas central heating", "Parking", "Students welcome", "No smoking"],
      publishedAt: ago(24 * 8), updatedAt: ago(24 * 2),
      photos: [0, 1, 2, 3, 4, 5].map(function (i) { return ["room3-0" + i + ".jpg", "", "Room 3, licensed HMO, Salford" + (i ? ", photo " + (i + 1) : "")]; })
    }));
    DB.listings.push(listing({
      id: "room-5", title: "Double room, high-spec house share, Salford",
      type: "room_in_share", letType: "room", furnishing: "furnished", rentPcm: 600, deposit: 500, bills: "included",
      availability: "available_now", councilTaxBand: "B", bedrooms: 1, parkingSpaces: 0, parkingNote: "On-street parking available",
      home: { bathrooms: [bath("shared"), bath("shared"), bath("wc")], receptions: [], kitchen: bath("kitchen_diner"), garden: bath("private_rear"), driveway: null },
      address: { line1: "", line2: "", town: "Salford", postcode: "", area: "salford", lat: null, lng: null },
      summary: "A beautifully presented double room in a high-spec house share, fully furnished and equipped throughout.",
      description: "A beautifully presented double room in a high-spec house share, fully furnished and equipped throughout.\n\nThe room comes with a comfortable double bed and quality mattress, a double wardrobe, chest of drawers and bedside tables, and a desk and chair for studying or working from home.",
      features: ["Comfortable double bed with quality mattress", "Double wardrobe, chest of drawers and bedside tables", "Desk and chair", "Fully furnished and equipped throughout", "Large kitchen-diner with two American fridge freezers and an extra freezer", "Eight-hob stove and four-door oven", "Two washer-dryers", "Two modern bathrooms and a separate WC", "Private rear garden", "On-street parking available"],
      publishedAt: ago(24 * 6), updatedAt: ago(24 * 4),
      photos: [0, 1, 2, 3, 4, 5, 6].map(function (i) { return ["room5-0" + i + ".jpg", "", "Room 5, house share, Salford" + (i ? ", photo " + (i + 1) : "")]; })
    }));
    DB.listings.push(listing({
      id: "room-7", ref: "RL0060-7", title: "Large double room, HMO, Salford",
      type: "room_in_share", letType: "room", furnishing: "furnished", rentPcm: 600, deposit: 500, bills: "included",
      availability: "available_now", councilTaxBand: "B", bedrooms: 1,
      home: { bathrooms: [bath("shared"), bath("shared")], receptions: [], kitchen: bath("shared"), garden: null, driveway: null },
      address: { line1: "", line2: "", town: "Salford", postcode: "", area: "salford", lat: null, lng: null },
      summary: "A large double on the second floor of a well-kept Salford house share — every bill included, close to the University, Salford Quays and MediaCityUK.",
      description: "A large double room on the second floor of an HMO in Salford, close to the University, Salford Quays and Manchester city centre.\n\nThe property comprises an entrance hall, ground-floor bathroom, large kitchen and dining area, and a first-floor bathroom.",
      features: ["Large double room on the second floor", "Close to the University of Salford", "Near Salford Quays and Manchester city centre", "Large kitchen and dining area", "Two bathrooms", "Double glazing", "Gas central heating", "Students welcome"],
      publishedAt: ago(24 * 7), updatedAt: ago(24 * 6),
      photos: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (i) { return ["room7-" + (i < 10 ? "0" + i : i) + ".jpg", "", "Room 7, HMO, Salford" + (i ? ", photo " + (i + 1) : "")]; })
    }));

    /* the seed the Import flow reads, snapshotted before anything changes */
    var SEED = { listings: DB.listings.map(function (l) {
      var c = clone(l);
      c.media = l.media.map(function (m, i) { return { src: m.url.replace("/templates/", ""), role: i === 0 ? "cover" : "gallery", roomLabel: m.roomLabel, alt: m.alt, kind: "photo" }; });
      delete c.coverMediaId; delete c.tour; delete c.updatedAt; delete c.createdAt; delete c.updatedBy; delete c.publishedAt; delete c.syncedAt;
      return c;
    }) };

    /* sample enquiries — clearly labelled as samples, with Ofcom's reserved
       drama numbers (07700 900xxx) and example.com addresses */
    function enquiry(o) {
      return Object.assign({ id: "", createdAt: ago(1), source: "contact", status: "new", name: "Sample enquiry", email: "", phone: "", listingId: null, message: "", preferredDay: null,
        attribution: { utmSource: null, utmMedium: null, utmCampaign: null, referrer: null, landingUrl: null }, handledBy: null, handledAt: null, note: null }, o);
    }
    DB.enquiries.push(enquiry({ id: "q_sample1", createdAt: ago(3), source: "viewing", name: "Sample enquiry — viewing", email: "sample.viewing@example.com", phone: "07700 900123", listingId: "ladywell-point", preferredDay: "Saturday morning",
      message: "This is a sample enquiry so the inbox has something to show.\n\nCould I view the Ladywell Point apartment this Saturday morning? Two of us, both working full time, looking to move in October.",
      attribution: { utmSource: "google", utmMedium: "organic", utmCampaign: null, referrer: "https://www.google.com/", landingUrl: "/templates/megacity-let-ladywell-point" } }));
    DB.enquiries.push(enquiry({ id: "q_sample2", createdAt: ago(27), source: "valuation", name: "Sample enquiry — valuation", email: "sample.landlord@example.com", phone: "",
      message: "Sample message: I own a two-bed terrace in Prestwich and would like to know what it would let for, and your fully managed fees.",
      attribution: { utmSource: "facebook", utmMedium: "social", utmCampaign: "landlords-autumn", referrer: "https://m.facebook.com/", landingUrl: "/templates/megacity-for-landlords" } }));
    DB.enquiries.push(enquiry({ id: "q_sample3", createdAt: ago(24 * 4), source: "maintenance", status: "handled", name: "Sample enquiry — maintenance", email: "sample.tenant@example.com", phone: "07700 900456", listingId: "room-5",
      message: "Sample report: the boiler pressure keeps dropping to zero every couple of days and the hot water goes with it.",
      attribution: { utmSource: null, utmMedium: null, utmCampaign: null, referrer: null, landingUrl: "/templates/megacity-maintenance" }, handledBy: ME.name, handledAt: ago(24 * 3), note: "Sample note: plumber booked for Thursday, tenant told." }));
    DB.enquiries.forEach(function (q) {
      var l = DB.listings.filter(function (x) { return x.id === q.listingId; })[0];
      DB.notifications.push({ id: "n_" + q.id, at: q.createdAt, kind: "enquiry", title: mockLabel("enquirySource", q.source) + (l ? " — " + l.title.slice(0, 80) : "") + ": " + q.name.slice(0, 60), body: q.message.slice(0, 200), link: "#/enquiries/" + q.id, read: q.status !== "new" });
    });
    DB.notifications.sort(function (a, b) { return a.at < b.at ? 1 : -1; });

    /* a skeleton tour — the same rooms the Worker's buildSkeleton derives from the listing */
    function skeleton(l) {
      var rooms = [], h = l.home || {};
      function add(kind, name) { rooms.push({ id: kind + "-" + (rooms.length + 1), name: name, pano: null }); }
      add("hallway", "Hallway");
      (h.receptions || []).forEach(function (r) { add("living", mockLabel("reception", r.subtype) || "Living room"); });
      if (h.kitchen) add("kitchen", "Kitchen");
      var beds = l.letType === "room" ? 1 : (l.bedrooms || 0);
      for (var i = 1; i <= beds; i++) add("bedroom", "Bedroom " + i);
      (h.bathrooms || []).forEach(function (b) { add("bathroom", mockLabel("bathroom", b.subtype) || "Bathroom"); });
      if (h.garden) add("garden", mockLabel("garden", h.garden.subtype) || "Garden");
      if (h.driveway) add("driveway", "Driveway");
      return { id: l.id, version: 1, project: {}, rooms: rooms };
    }
    (function () { var l = DB.listings[0], t = skeleton(l); DB.tours[l.id] = { tour: t, status: "draft", version: 1, health: null, roomCount: t.rooms.length, liveAt: null, updatedAt: ago(20), updatedBy: ME.id }; })();
    function tourSummary(t) { return { status: t.status, version: t.version, health: t.health, roomCount: t.roomCount, liveAt: t.liveAt, updatedAt: t.updatedAt }; }

    /* pages: one live area page, one draft — all copy is plainly sample text */
    var LADYWELL_COVER = DB.listings[0].media[0].id;
    DB.pages.push({ id: "p_salford", slug: "renting-in-salford", kind: "area", title: "Renting in Salford", seoTitle: "Renting in Salford | Megacity Properties",
      seoDescription: "Sample page: what renting in Salford is like with Megacity Properties, and the homes we manage there.", heroMediaId: LADYWELL_COVER,
      blocks: [
        { type: "h2", text: "Sample heading: the area at a glance" },
        { type: "p", text: "Sample paragraph. This page exists so the Studio has a live page to show; the words are placeholders, not published claims about Salford." },
        { type: "list", items: ["Sample point one", "Sample point two", "Sample point three"] },
        { type: "image", mediaId: LADYWELL_COVER, caption: "Ladywell Point, Salford" },
        { type: "cta", text: "Talk to the office", href: "megacity-contact-us" }
      ],
      faq: [{ q: "Sample question: how do viewings work?", a: "Sample answer: ring the office and we book a time that suits you." }],
      status: "live", publishedAt: ago(24 * 2), updatedAt: ago(24 * 2), updatedBy: ME.id });
    DB.pages.push({ id: "p_draft", slug: "sample-draft-applying", kind: "guide", title: "Sample draft: what a tenant needs to apply", seoTitle: null, seoDescription: null, heroMediaId: null,
      blocks: [{ type: "h2", text: "Sample heading only — no paragraph yet" }], faq: [], status: "draft", publishedAt: null, updatedAt: ago(5), updatedBy: ME.id });
    function pageJson(pg) { var c = clone(pg); c.url = "/templates/megacity-" + pg.slug; return c; }
    function pageRow(pg) { return { id: pg.id, slug: pg.slug, kind: pg.kind, title: pg.title, status: pg.status, publishedAt: pg.publishedAt, updatedAt: pg.updatedAt, url: "/templates/megacity-" + pg.slug }; }
    var RESERVED = ["skyline", "properties", "for-landlords", "tenant-find", "rent-collection", "fully-managed", "switch", "hmo", "maintenance", "compliance", "renting", "valuation", "tools", "journal", "about-us", "contact-us", "privacy", "terms", "studio", "sitemap", "consent", "intake", "seed", "let-template", "page-template", "data", "admin", "portal", "tours", "property", "hero-lab", "about", "contact", "landlords", "tenants"];
    function slugify(v) { return String(v || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80); }
    function badSlug(sl) { return !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sl) || sl.length < 3 || sl.length > 80 || RESERVED.indexOf(sl) >= 0 || /^(let|studio)(-|$)/.test(sl); }
    function normBlocks(v) {
      return (Array.isArray(v) ? v : []).slice(0, 40).map(function (b) {
        var type = ["h2", "p", "list", "cta", "image"].indexOf(b && b.type) >= 0 ? b.type : "p", out = { type: type };
        if (type === "list") out.items = (Array.isArray(b.items) ? b.items : []).map(function (i) { return String(i || "").trim().slice(0, 300); }).filter(Boolean).slice(0, 12);
        else if (type === "image") { out.mediaId = String(b.mediaId || "").slice(0, 40); out.caption = String(b.caption || "").trim().slice(0, 200); }
        else if (type === "cta") { out.text = String(b.text || "").trim().slice(0, 120) || "Talk to the office"; out.href = String(b.href || "").trim().slice(0, 300) || "megacity-contact-us"; }
        else out.text = String(b.text || "").trim().slice(0, type === "h2" ? 160 : 4000);
        return out;
      }).filter(function (b) { return b.type === "list" ? b.items.length : b.type === "image" ? b.mediaId : b.text; });
    }
    function normFaq(v) { return (Array.isArray(v) ? v : []).slice(0, 12).map(function (f) { return { q: String((f && f.q) || "").trim().slice(0, 200), a: String((f && f.a) || "").trim().slice(0, 2000) }; }).filter(function (f) { return f.q && f.a; }); }

    /* backlinks: two sample rows on example.com / example.org */
    DB.backlinks.push({ id: "b_sample1", sourceUrl: "https://example.org/manchester-lettings-agents", targetPath: "/templates/megacity-for-landlords", anchor: "Megacity Properties, Manchester", contact: "sample.editor@example.org", notes: "Sample row — a directory that agreed to list the agency.", status: "live", lastCheckedAt: ago(30), lastResult: "Sample result: link found (this mock does not fetch pages).", createdAt: ago(24 * 12) });
    DB.backlinks.push({ id: "b_sample2", sourceUrl: "https://example.com/salford-business-directory", targetPath: "/templates/megacity-skyline", anchor: "Megacity Properties", contact: "sample.admin@example.com", notes: "Sample row — asked by email, waiting to hear back.", status: "requested", lastCheckedAt: null, lastResult: null, createdAt: ago(24 * 3) });
    function blCounts() { var c = { planned: 0, requested: 0, live: 0, lost: 0 }; DB.backlinks.forEach(function (b) { c[b.status] = (c[b.status] || 0) + 1; }); return c; }
    function blSort() { var o = { live: 0, requested: 1, planned: 2, lost: 3 }; return DB.backlinks.slice().sort(function (a, b) { return (o[a.status] - o[b.status]) || (a.createdAt < b.createdAt ? 1 : -1); }); }
    function blUrl(v, field) { var t = String(v || "").trim().slice(0, 500); if (!t || !/^https?:\/\/[^\s]+$/i.test(t)) fail(400, { error: field + " must be a full address starting with https://" }); return t; }

    function aiUse(route) { DB.aiUsage.push({ at: new Date().toISOString(), route: route, ok: 1, inputTokens: 0, outputTokens: 0 }); }
    function needAi() { if (!DB.ai) fail(503, { error: "AI is not configured. Add the ANTHROPIC_API_KEY secret to the Worker.", configured: false }); }

    DB.listings.forEach(function (l) { DB.audit.push({ at: l.updatedAt, action: "listing.import", entity: "listing", entityId: l.id, user: ME.name }); });
    DB.audit.push({ at: ago(2), action: "user.login", entity: "user", entityId: ME.id, user: ME.name });
    DB.audit.sort(function (a, b) { return a.at < b.at ? 1 : -1; });

    /* ── helpers ── */
    function needAuth() { if (!DB.signedIn) fail(401, { error: "Not signed in" }); }
    function needOwner() { if (ME.role !== "owner") fail(403, { error: "Only the owner can do that" }); }
    function pwCheck(pw) { if (!pw || String(pw).length < 10) fail(400, { error: "Use at least 10 characters for the password" }); }
    function audit(action, entity, entityId) { DB.audit.unshift({ at: new Date().toISOString(), action: action, entity: entity, entityId: entityId, user: ME.name }); }
    function touch(l) { l.updatedAt = new Date().toISOString(); l.updatedBy = ME.id; }
    function find(id) { var l = DB.listings.filter(function (x) { return x.id === id; })[0]; if (!l) fail(404, { error: "Listing not found" }); return l; }
    function full(l) { var c = clone(l); delete c.bin; return c; }
    function isPhoto(m) { return m.kind === "photo" || m.kind === "pano"; }
    function coverOf(l) { var m = l.media.filter(function (x) { return x.id === l.coverMediaId; })[0]; return m ? { thumb: m.thumb } : null; }
    function summary(l) {
      return { id: l.id, source: l.source, ref: l.ref, status: l.status, hidden: l.hidden, title: l.title, area: l.address && l.address.area, town: l.address && l.address.town, rentPcm: l.rentPcm, bedrooms: l.bedrooms, bathrooms: (l.home && l.home.bathrooms || []).length, type: l.type, cover: coverOf(l), mediaCount: l.media.length, tour: DB.tours[l.id] ? { status: DB.tours[l.id].status, health: DB.tours[l.id].health } : null, updatedAt: l.updatedAt, publishedAt: l.publishedAt };
    }
    function enqRow(q) {
      var c = clone(q), l = DB.listings.filter(function (x) { return x.id === q.listingId; })[0];
      c.sourceLabel = mockLabel("enquirySource", q.source) || q.source; c.listingTitle = l ? l.title : null;
      return c;
    }
    function problems(l) {
      var out = [];
      if (!l.title) out.push("Give the listing a title");
      if (!l.type) out.push("Choose a property type");
      if (!(l.rentPcm > 0)) out.push("Enter the monthly rent");
      if (!l.address || !l.address.area) out.push("Choose the area");
      if (l.letType !== "room" && (l.bedrooms == null || l.bedrooms === "")) out.push("Say how many bedrooms there are");
      if (!l.media.some(isPhoto)) out.push("Add at least one photo");
      if (!l.coverMediaId || !l.media.some(function (m) { return m.id === l.coverMediaId; })) out.push("Choose a cover photo");
      return out;
    }
    var PROTECTED = { id: 1, source: 1, externalId: 1, media: 1, tour: 1, createdAt: 1, updatedAt: 1, updatedBy: 1, publishedAt: 1, syncedAt: 1, status: 1 };
    var STATUSES = ["draft", "live", "let_agreed", "let", "withdrawn"];
    function uniqueId(base) { var id = base, n = 2; while (DB.listings.some(function (l) { return l.id === id; })) id = base + "-" + (n++); return id; }

    function handle(method, fullPath, body) {
      var parts = fullPath.split("?"), p = parts[0], q = new URLSearchParams(parts[1] || ""), m;
      body = body || {};
      if (DB.offline) fail(503, { connected: false, error: "The Studio is not connected to its database yet." });

      /* auth */
      if (p === "/auth/me") {
        if (!DB.signedIn) fail(401, { error: "Not signed in", setup: { needsOwner: DB.needsOwner }, connected: true, features: { ai: DB.ai, connected: true } });
        return { ok: true, user: clone(ME), features: { ai: DB.ai, connected: true, email: false }, setup: { needsOwner: false } };
      }
      if (p === "/auth/login") {
        if (!body.email || !body.password) fail(400, { error: "Enter your email address and password" });
        if (String(body.password).length < 10) fail(401, { error: "That email address and password do not match" });
        DB.signedIn = true; audit("user.login", "user", ME.id);
        return { ok: true, user: clone(ME) };
      }
      if (p === "/auth/logout") { DB.signedIn = false; return { ok: true }; }
      if (p === "/auth/bootstrap") {
        if (!DB.needsOwner) fail(403, { error: "The owner account already exists" });
        if (body.setupToken !== "setup123") fail(403, { error: "That setup token is not right" });
        if (!body.email || !body.name) fail(400, { error: "Name and email address are needed" });
        pwCheck(body.password);
        DB.needsOwner = false; DB.signedIn = true; ME.name = body.name; ME.email = body.email;
        DB.users[0].name = body.name; DB.users[0].email = body.email;
        return { ok: true, user: clone(ME) };
      }
      if (p === "/auth/forgot") return { ok: true };
      if (p === "/auth/reset") { pwCheck(body.password); if (!body.token) fail(400, { error: "That link is not valid" }); return { ok: true }; }
      if (p === "/auth/accept-invite") { pwCheck(body.password); if (!body.name) fail(400, { error: "Tell us your name" }); DB.signedIn = true; return { ok: true, user: clone(ME) }; }
      if (p === "/auth/change-password") { needAuth(); if (!body.current) fail(400, { error: "Enter your current password" }); pwCheck(body.next); return { ok: true }; }
      if (p === "/options") return optionsJson();

      needAuth();

      /* team */
      if (p === "/team" && method === "GET") return { users: clone(DB.users), invites: clone(DB.invites) };
      if (p === "/team/invite") {
        needOwner();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email || "")) fail(400, { error: "Enter a valid email address" });
        if (DB.users.some(function (u) { return u.email === body.email; })) fail(409, { error: "That person already has an account" });
        DB.invites = DB.invites.filter(function (i) { return i.email !== body.email; });
        DB.invites.push({ email: body.email, role: body.role === "owner" ? "owner" : "staff", expiresAt: ago(-48), createdAt: ago(0) });
        audit("team.invite", "user", body.email);
        return { ok: true };
      }
      if (p === "/team/invite/resend") { needOwner(); return { ok: true }; }
      if ((m = /^\/team\/([^/]+)$/.exec(p)) && method === "PATCH") {
        needOwner();
        var u = DB.users.filter(function (x) { return x.id === m[1]; })[0];
        if (!u) fail(404, { error: "No such person" });
        var owners = DB.users.filter(function (x) { return x.role === "owner" && !x.disabled; });
        if ((body.disabled === true || (body.role && body.role !== "owner")) && u.role === "owner" && owners.length <= 1) fail(409, { error: "There has to be at least one owner" });
        if (body.role) u.role = body.role;
        if (typeof body.disabled === "boolean") u.disabled = body.disabled;
        if (body.name) u.name = body.name;
        audit("team.update", "user", u.id);
        return { ok: true, user: clone(u) };
      }

      /* settings */
      if (p === "/settings" && method === "GET") return { settings: clone(DB.settings) };
      if (p.indexOf("/notfound") === 0 && method === "GET") return { days: 7, items: [
        { path: "/tenants/register/", kind: "page", count: 14, lastSeen: ago(2), referrer: "https://www.google.com/", bots: 1 },
        { path: "/property/225/", kind: "page", count: 6, lastSeen: ago(10), referrer: null, bots: 0 },
        { path: "/images/logo.png", kind: "legacy", count: 40, lastSeen: ago(1), referrer: null, bots: 38 },
      ], redirects: clone(DB.settings.redirects || []) };
      if (p === "/settings" && method === "PUT") {
        Object.keys(body).forEach(function (k) {
          if (["ga4Id", "metaPixelId", "gscVerification", "notifyEmails"].indexOf(k) >= 0) needOwner();
          if (k === "ga4Id") { var g = String(body[k] || "").trim().toUpperCase(); if (g && !/^G-[A-Z0-9]{6,14}$/.test(g)) fail(400, { error: "A GA4 measurement ID looks like G-XXXXXXXXXX." }); body[k] = g; }
          if (k === "metaPixelId") { var px = String(body[k] || "").trim(); if (px && !/^\d{10,20}$/.test(px)) fail(400, { error: "A Meta Pixel ID is a long number." }); body[k] = px; }
          if (k === "consentText" && !String(body[k] || "").trim()) body[k] = "We use cookies to understand how the site is used and to measure our advertising. Essential cookies keep the site working.";
          DB.settings[k] = (body[k] && typeof body[k] === "object" && !Array.isArray(body[k])) ? Object.assign({}, DB.settings[k] || {}, body[k]) : body[k];
        });
        audit("settings.update", "settings", "settings");
        return { ok: true, settings: clone(DB.settings) };
      }

      /* dashboard */
      if (p === "/dashboard") {
        var live = DB.listings.filter(function (l) { return !l.bin && l.status === "live"; }).length;
        var draft = DB.listings.filter(function (l) { return !l.bin && l.status === "draft"; }).length;
        var total = DB.listings.filter(function (l) { return !l.bin; }).length;
        var media = DB.listings.reduce(function (n, l) { return n + l.media.length; }, 0);
        var toursLive = Object.keys(DB.tours).filter(function (k) { return DB.tours[k].status === "live"; }).length;
        var since7 = ago(24 * 7), since30 = ago(24 * 30), bySource = {}, daily = {}, newCount = 0;
        DB.enquiries.forEach(function (q) {
          if (q.status === "new") newCount++;
          if (q.createdAt >= since7) bySource[q.source] = (bySource[q.source] || 0) + 1;
          if (q.createdAt >= since30) { var d = q.createdAt.slice(0, 10); daily[d] = (daily[d] || 0) + 1; }
        });
        var last7 = Object.keys(bySource).reduce(function (n, k) { return n + bySource[k]; }, 0);
        /* the mock has no page-view events, so listing_view / tour_open stay absent and the UI shows "—" */
        return { counts: { listings: { live: live, draft: draft, total: total }, media: media, tours: { live: toursLive, draft: Object.keys(DB.tours).length - toursLive } },
          enquiries: { new: newCount, last7: last7, bySource: bySource, daily: Object.keys(daily).sort().map(function (d) { return [d, daily[d]]; }) },
          events7: { enquiry: last7 }, recent: clone(DB.audit.slice(0, 12)) };
      }
      if (p === "/audit") return { items: clone(DB.audit.slice(0, +q.get("limit") || 50)) };
      if (p === "/export") fail(404, { error: "Export arrives in the next release" });

      /* enquiries + notifications */
      if (p === "/enquiries" && method === "GET") {
        var st = q.get("status"), src = q.get("source"), lid = q.get("listingId"), lim = Math.min(300, Math.max(1, +q.get("limit") || 100));
        var qs2 = DB.enquiries.filter(function (x) { return (!st || x.status === st) && (!src || x.source === src) && (!lid || x.listingId === lid); });
        qs2.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
        var qc = { new: 0, handled: 0, spam: 0 }; DB.enquiries.forEach(function (x) { qc[x.status] = (qc[x.status] || 0) + 1; });
        return { items: qs2.slice(0, lim).map(enqRow), counts: qc };
      }
      if ((m = /^\/enquiries\/([^/]+)$/.exec(p))) {
        var qe = DB.enquiries.filter(function (x) { return x.id === m[1]; })[0];
        if (!qe) fail(404, { error: "No such enquiry." });
        if (method === "GET") return enqRow(qe);
        if (method === "PATCH") {
          if ("status" in body) {
            if (["new", "handled", "spam"].indexOf(body.status) < 0) fail(400, { error: "Unknown status." });
            qe.status = body.status; qe.handledBy = body.status === "new" ? null : ME.name; qe.handledAt = body.status === "new" ? null : new Date().toISOString();
          }
          if ("note" in body) qe.note = body.note == null ? null : String(body.note).slice(0, 2000);
          audit("enquiry.updated", "enquiry", qe.id);
          return enqRow(qe);
        }
      }
      if (p === "/notifications" && method === "GET") return { items: clone(DB.notifications.slice(0, 50)), unread: DB.notifications.filter(function (n) { return !n.read; }).length };
      if (p === "/notifications/read" && method === "POST") {
        var ids = Array.isArray(body.ids) ? body.ids : null;
        DB.notifications.forEach(function (n) { if (!ids || ids.indexOf(n.id) >= 0) n.read = true; });
        return { ok: true };
      }

      /* tours */
      if (p === "/tours/import" && method === "POST") return { ok: true, imported: [], skipped: [] };
      if ((m = /^\/tours\/([^/]+)$/.exec(p))) {
        var tl = DB.listings.filter(function (x) { return x.id === m[1] && !x.bin; })[0];
        if (!tl) fail(404, { error: "No such listing." });
        var tt = DB.tours[m[1]];
        if (method === "GET") { if (!tt) fail(404, { error: "No tour yet for this listing.", canCreate: true, listing: { id: tl.id, title: tl.title } }); return Object.assign({ tour: clone(tt.tour) }, tourSummary(tt)); }
        if (method === "POST") {
          if (tt) fail(409, { error: "This listing already has a tour." });
          var built = body.tour ? body.tour : skeleton(tl);
          DB.tours[tl.id] = { tour: built, status: "draft", version: 1, health: null, roomCount: (built.rooms || []).length, liveAt: null, updatedAt: new Date().toISOString(), updatedBy: ME.id };
          audit("tour.created", "listing", tl.id);
          return Object.assign({ tour: clone(built) }, tourSummary(DB.tours[tl.id]));
        }
        if (method === "PUT") {
          if (!tt) fail(404, { error: "No tour yet for this listing. Create it first.", canCreate: true });
          if (body.version != null && Number(body.version) !== tt.version) fail(409, { error: "Someone else saved this tour since you opened it. Reload to see their changes.", version: tt.version });
          tt.tour = body.tour || tt.tour; tt.version++; if (body.health != null) tt.health = Math.max(0, Math.min(100, Number(body.health) || 0)); tt.roomCount = (tt.tour.rooms || []).length; tt.updatedAt = new Date().toISOString();
          return { ok: true, version: tt.version, updatedAt: tt.updatedAt, health: tt.health };
        }
        if (method === "DELETE") { delete DB.tours[m[1]]; return { ok: true }; }
      }
      if ((m = /^\/tours\/([^/]+)\/(publish|unpublish)$/.exec(p)) && method === "POST") {
        var tp = DB.tours[m[1]];
        if (!tp) fail(404, { error: "No tour yet for this listing." });
        if (m[2] === "unpublish") { tp.status = "draft"; tp.updatedAt = new Date().toISOString(); audit("tour.unpublished", "listing", m[1]); return { ok: true, status: "draft" }; }
        var gate = DB.settings.tourGateScore == null ? 70 : DB.settings.tourGateScore, health = body.health == null ? tp.health : Number(body.health), tpr = [];
        if (!tp.tour || !(tp.tour.rooms || []).length) tpr.push("The tour has no rooms.");
        if (!(tp.tour.rooms || []).some(function (r) { return r.pano; })) tpr.push("No room has a 360° capture yet.");
        if (health != null && health < gate) tpr.push("The quality score is " + health + "; it needs at least " + gate + " to go live.");
        if (tpr.length) return { ok: false, problems: tpr, health: health, gate: gate };
        tp.status = "live"; tp.liveAt = tp.updatedAt = new Date().toISOString(); tp.health = health; audit("tour.published", "listing", m[1]);
        return { ok: true, status: "live", liveAt: tp.liveAt, health: health, url: "/billy360/?site=" + encodeURIComponent(m[1]) };
      }

      /* pages */
      if (p === "/pages" && method === "GET") return { items: DB.pages.slice().sort(function (a, b) { return a.updatedAt < b.updatedAt ? 1 : -1; }).map(pageRow) };
      if (p === "/pages" && method === "POST") {
        var ptitle = String(body.title || "").trim().slice(0, 160);
        if (!ptitle) fail(400, { error: "Give the page a title." });
        var pslug = slugify(body.slug || ptitle);
        if (badSlug(pslug)) fail(400, { error: "\u201C" + pslug + "\u201D cannot be used as the address. Choose another." });
        if (DB.pages.some(function (x) { return x.slug === pslug; })) fail(409, { error: "A page with that address already exists." });
        var np = { id: uid("p"), slug: pslug, kind: ["area", "landing", "guide"].indexOf(body.kind) >= 0 ? body.kind : "area", title: ptitle, seoTitle: body.seoTitle ? String(body.seoTitle).slice(0, 120) : null, seoDescription: body.seoDescription ? String(body.seoDescription).slice(0, 320) : null, heroMediaId: body.heroMediaId || null, blocks: normBlocks(body.blocks), faq: normFaq(body.faq), status: "draft", publishedAt: null, updatedAt: new Date().toISOString(), updatedBy: ME.id };
        DB.pages.push(np); audit("page.created", "page", np.id);
        return pageJson(np);
      }
      if ((m = /^\/pages\/([^/]+)$/.exec(p))) {
        var pg = DB.pages.filter(function (x) { return x.id === m[1]; })[0];
        if (!pg) fail(404, { error: "No such page." });
        if (method === "GET") return pageJson(pg);
        if (method === "PATCH") {
          if ("title" in body) { pg.title = String(body.title || "").trim().slice(0, 160); if (!pg.title) fail(400, { error: "A title is required." }); }
          if ("kind" in body && ["area", "landing", "guide"].indexOf(body.kind) >= 0) pg.kind = body.kind;
          if ("slug" in body) { var ns = slugify(body.slug); if (badSlug(ns)) fail(400, { error: "\u201C" + ns + "\u201D cannot be used as the address." }); if (DB.pages.some(function (x) { return x.slug === ns && x.id !== pg.id; })) fail(409, { error: "A page with that address already exists." }); pg.slug = ns; }
          if ("seoTitle" in body) pg.seoTitle = body.seoTitle ? String(body.seoTitle).slice(0, 120) : null;
          if ("seoDescription" in body) pg.seoDescription = body.seoDescription ? String(body.seoDescription).slice(0, 320) : null;
          if ("heroMediaId" in body) pg.heroMediaId = body.heroMediaId ? String(body.heroMediaId).slice(0, 40) : null;
          if ("blocks" in body) pg.blocks = normBlocks(body.blocks);
          if ("faq" in body) pg.faq = normFaq(body.faq);
          pg.updatedAt = new Date().toISOString(); pg.updatedBy = ME.id;
          return pageJson(pg);
        }
        if (method === "DELETE") { DB.pages = DB.pages.filter(function (x) { return x !== pg; }); audit("page.deleted", "page", pg.id); return { ok: true }; }
      }
      if ((m = /^\/pages\/([^/]+)\/(publish|unpublish)$/.exec(p)) && method === "POST") {
        var pp = DB.pages.filter(function (x) { return x.id === m[1]; })[0];
        if (!pp) fail(404, { error: "No such page." });
        if (m[2] === "unpublish") { pp.status = "draft"; pp.updatedAt = new Date().toISOString(); return { ok: true, page: pageJson(pp) }; }
        var ppr = [];
        if (!pp.blocks.length) ppr.push("Add some content first.");
        if (!pp.blocks.some(function (b) { return b.type === "p"; })) ppr.push("Add at least one paragraph.");
        if (!(pp.seoDescription || "").trim()) ppr.push("Write the search description (what Google shows under the title).");
        if (ppr.length) return { ok: false, problems: ppr };
        pp.status = "live"; pp.publishedAt = pp.publishedAt || new Date().toISOString(); pp.updatedAt = new Date().toISOString(); audit("page.published", "page", pp.id);
        return { ok: true, page: pageJson(pp) };
      }

      /* backlinks */
      if (p === "/backlinks" && method === "GET") return { items: clone(blSort()), counts: blCounts() };
      if (p === "/backlinks" && method === "POST") {
        var nb = { id: uid("b"), sourceUrl: blUrl(body.sourceUrl, "The source page"), targetPath: String(body.targetPath || "").trim().slice(0, 300) || "/", anchor: String(body.anchor || "").trim().slice(0, 200), contact: String(body.contact || "").trim().slice(0, 200), notes: String(body.notes || "").trim().slice(0, 2000), status: ["planned", "requested", "live", "lost"].indexOf(body.status) >= 0 ? body.status : "planned", lastCheckedAt: null, lastResult: null, createdAt: new Date().toISOString() };
        DB.backlinks.push(nb); return clone(nb);
      }
      if (p === "/backlinks/check-all" && method === "POST") {
        var due = DB.backlinks.filter(function (b) { return b.status !== "planned"; });
        due.forEach(function (b) { b.lastCheckedAt = new Date().toISOString(); b.lastResult = "Sample check: this mock does not fetch pages, so the status is unchanged."; });
        return { ok: true, checking: due.length };
      }
      if ((m = /^\/backlinks\/([^/]+)(?:\/(check))?$/.exec(p))) {
        var bl = DB.backlinks.filter(function (x) { return x.id === m[1]; })[0];
        if (!bl) fail(404, { error: "No such link." });
        if (m[2] === "check" && method === "POST") { bl.lastCheckedAt = new Date().toISOString(); bl.lastResult = "Sample check: this mock does not fetch pages, so the status is unchanged."; return clone(bl); }
        if (method === "PATCH") {
          if ("sourceUrl" in body) bl.sourceUrl = blUrl(body.sourceUrl, "The source page");
          if ("targetPath" in body) bl.targetPath = String(body.targetPath || "").trim().slice(0, 300) || "/";
          ["anchor", "contact", "notes"].forEach(function (k) { if (k in body) bl[k] = String(body[k] || "").trim(); });
          if ("status" in body) { if (["planned", "requested", "live", "lost"].indexOf(body.status) < 0) fail(400, { error: "Unknown status." }); bl.status = body.status; }
          return clone(bl);
        }
        if (method === "DELETE") { DB.backlinks = DB.backlinks.filter(function (x) { return x !== bl; }); return { ok: true }; }
      }

      /* AI — sample text only, built from the record's own facts */
      if (p === "/ai/usage") {
        var byRoute = {};
        DB.aiUsage.forEach(function (u) { var r = byRoute[u.route] || (byRoute[u.route] = { route: u.route, calls: 0, ok: 0, inputTokens: 0, outputTokens: 0 }); r.calls++; r.ok += u.ok; });
        return { configured: DB.ai, last30: Object.keys(byRoute).map(function (k) { return byRoute[k]; }) };
      }
      if (p.indexOf("/ai/") === 0 && method === "POST") {
        needAi();
        if (p === "/ai/listing-copy") {
          var al = find(body.listingId);
          if (al.source === "tenninety") fail(400, { error: "This listing's copy is managed in 10ninety." });
          var beds = al.bedrooms != null ? al.bedrooms + "-bedroom " : "", where = (al.address && al.address.town) || mockLabel("area", al.address && al.address.area) || "Greater Manchester";
          aiUse("listing-copy");
          return { summary: "Sample AI summary (" + (body.tone || "standard") + "): a " + beds + (mockLabel("type", al.type) || "home").toLowerCase() + " in " + where + ", written from the listing's own facts.",
            description: "Sample AI paragraph one for \u201C" + al.title + "\u201D. In the real Studio this is written by Claude from the facts on the Details and The home tabs only.\n\nSample AI paragraph two: rent " + (al.rentPcm ? "\u00A3" + al.rentPcm + " pcm" : "not stated") + ", " + (al.furnishing ? mockLabel("furnishing", al.furnishing).toLowerCase() : "furnishing not stated") + ".",
            features: (al.features || []).slice(0, 4).map(function (f) { return "Sample: " + f; }).concat(["Sample feature written by the mock"]),
            seoTitle: ("Sample: " + al.title).slice(0, 60), seoDescription: ("Sample search description for " + al.title + " in " + where + ".").slice(0, 155) };
        }
        if (p === "/ai/classify-room" || p === "/ai/alt-text") {
          var am = null, aml = null;
          DB.listings.forEach(function (l) { l.media.forEach(function (x) { if (x.id === body.mediaId) { am = x; aml = l; } }); });
          if (!am) fail(404, { error: "No such photo." });
          if (am.kind !== "photo" && am.kind !== "pano") fail(400, { error: "Only photos can be looked at." });
          var guess = am.roomLabel || "Living room", kinds = { "Living room": "living", "Kitchen": "kitchen", "Bathroom": "bathroom", "En-suite": "en_suite", "Hallway": "hallway", "Garden": "garden", "Driveway": "driveway", "Landing": "landing" };
          var altS = "Sample alt text: " + guess.toLowerCase() + " at " + aml.title;
          if (p === "/ai/alt-text") { aiUse("alt-text"); return { alt: altS.slice(0, 120) }; }
          aiUse("classify-room"); am.aiLabel = guess;
          return { kind: /^Bedroom/.test(guess) ? "bedroom" : (kinds[guess] || "other"), name: guess, confidence: 0.5, alt: altS.slice(0, 120) };
        }
        if (p === "/ai/share-kit") {
          var sl = find(body.listingId), surl = "/templates/megacity-let-" + sl.id, isRoom = sl.letType === "room";
          aiUse("share-kit");
          return { headline: ("Sample: " + sl.title).slice(0, 70), facebook: "Sample Facebook post for \u201C" + sl.title + "\u201D, written from the listing facts only. " + surl, instagram: "Sample Instagram caption for " + sl.title + " \u2014 link in bio.", whatsapp: "Sample WhatsApp message: " + sl.title + (sl.rentPcm ? ", \u00A3" + sl.rentPcm + " pcm" : "") + ". " + surl, spareroom: isRoom ? "Sample SpareRoom advert for " + sl.title + ", written from the listing facts." : "", hashtags: ["sample", "manchester", "tolet", "salford"], metaDescription: ("Sample meta description for " + sl.title + ".").slice(0, 155), url: surl };
        }
        if (p === "/ai/page-draft") {
          var pkind = ["area", "landing", "guide"].indexOf(body.kind) >= 0 ? body.kind : "area", parea = String(body.area || "").trim(), pbrief = String(body.brief || "").trim();
          if (!parea && !pbrief) fail(400, { error: "Give the page a subject: an area, or a brief." });
          aiUse("page-draft");
          var subj = parea || "the subject in the brief";
          return { title: "Sample draft: " + (pkind === "area" ? "Renting in " + subj : pkind === "guide" ? "A guide to " + subj : subj), seoTitle: ("Sample: " + subj + " | Megacity Properties").slice(0, 60), seoDescription: ("Sample search description drafted for " + subj + ".").slice(0, 155),
            blocks: [{ type: "h2", text: "Sample heading about " + subj }, { type: "p", text: "Sample paragraph one. The real draft is written by Claude from the brief and the live listings, without invented statistics." }, { type: "list", items: ["Sample point one", "Sample point two", "Sample point three"] }, { type: "p", text: "Sample paragraph two" + (pbrief ? ", following the brief: " + pbrief.slice(0, 120) : ".") }, { type: "cta", text: "Talk to the office", items: [] }],
            faq: [{ q: "Sample question about " + subj + "?", a: "Sample answer." }, { q: "Sample second question?", a: "Sample second answer." }] };
        }
      }

      /* listings */
      if (p === "/listings" && method === "GET") {
        var bin = q.get("bin") === "1", status = q.get("status") || "", area = q.get("area") || "", qq = (q.get("q") || "").toLowerCase(), sort = q.get("sort") || "updated";
        var rows = DB.listings.filter(function (l) { return bin ? !!l.bin : !l.bin; });
        if (status && !bin) rows = rows.filter(function (l) { return l.status === status; });
        if (area) rows = rows.filter(function (l) { return l.address && l.address.area === area; });
        if (qq) rows = rows.filter(function (l) { return [l.title, l.ref, l.address && l.address.line1, l.address && l.address.town].join(" ").toLowerCase().indexOf(qq) >= 0; });
        rows.sort(function (a, b) {
          if (sort === "rent") return (b.rentPcm || 0) - (a.rentPcm || 0);
          if (sort === "title") return String(a.title).localeCompare(String(b.title));
          return a.updatedAt < b.updatedAt ? 1 : -1;
        });
        var counts = { draft: 0, live: 0, let_agreed: 0, let: 0, withdrawn: 0, bin: 0 };
        DB.listings.forEach(function (l) { if (l.bin) counts.bin++; else if (counts[l.status] != null) counts[l.status]++; });
        return { items: rows.map(summary), counts: counts };
      }
      if (p === "/listings" && method === "POST") {
        if (!body.title || !String(body.title).trim()) fail(400, { error: "A title is needed" });
        var created = listing({ id: uniqueId(slug(body.id || body.title)), status: "draft" });
        Object.keys(body).forEach(function (k) { if (!PROTECTED[k]) created[k] = body[k]; });
        created.createdAt = created.updatedAt = new Date().toISOString(); created.media = []; created.coverMediaId = null; created.publishedAt = null;
        DB.listings.push(created); audit("listing.create", "listing", created.id);
        return full(created);
      }
      if (p === "/import/legacy" && method === "POST") {
        var n = 0;
        (body.listings || []).forEach(function (src) {
          if (!src || !src.id) return;
          var ex = DB.listings.filter(function (l) { return l.id === src.id; })[0];
          if (!ex) { ex = listing({ id: src.id, status: "draft" }); ex.media = []; ex.coverMediaId = null; ex.createdAt = new Date().toISOString(); DB.listings.push(ex); }
          Object.keys(src).forEach(function (k) { if (!PROTECTED[k] && k !== "coverMediaId") ex[k] = src[k]; });
          if (src.status && STATUSES.indexOf(src.status) >= 0) ex.status = src.status;
          touch(ex); n++;
        });
        audit("listing.import", "listing", (body.listings || []).map(function (l) { return l && l.id; }).join(","));
        return { ok: true, imported: n };
      }
      if ((m = /^\/listings\/([^/]+)$/.exec(p))) {
        var l = find(m[1]);
        if (method === "GET") return full(l);
        if (method === "PATCH") {
          if (body.updatedAt && body.updatedAt !== l.updatedAt) fail(409, { error: "Someone else saved this listing", listing: full(l) });
          Object.keys(body).forEach(function (k) { if (!PROTECTED[k]) l[k] = body[k]; });
          if (l.coverMediaId && !l.media.some(function (x) { return x.id === l.coverMediaId; })) l.coverMediaId = null;
          touch(l); audit("listing.update", "listing", l.id);
          return full(l);
        }
        if (method === "DELETE") {
          if (q.get("hard") === "1") { needOwner(); DB.listings = DB.listings.filter(function (x) { return x !== l; }); audit("listing.delete", "listing", l.id); return { ok: true }; }
          l.bin = true; touch(l); audit("listing.bin", "listing", l.id); return { ok: true };
        }
      }
      if ((m = /^\/listings\/([^/]+)\/(restore|duplicate|publish|unpublish|status)$/.exec(p)) && method === "POST") {
        var t = find(m[1]), act = m[2];
        if (act === "restore") { t.bin = false; touch(t); audit("listing.restore", "listing", t.id); return full(t); }
        if (act === "duplicate") {
          var d = clone(t); d.id = uniqueId(t.id + "-copy"); d.title = t.title + " (copy)"; d.status = "draft"; d.media = []; d.coverMediaId = null; d.publishedAt = null; d.bin = false; d.tour = null;
          d.createdAt = d.updatedAt = new Date().toISOString(); DB.listings.push(d); audit("listing.duplicate", "listing", d.id);
          return full(d);
        }
        if (act === "publish") {
          var pr = problems(t);
          if (pr.length) return { ok: false, problems: pr };
          t.status = "live"; t.publishedAt = t.publishedAt || new Date().toISOString(); touch(t); audit("listing.publish", "listing", t.id);
          return { ok: true, listing: full(t) };
        }
        if (act === "unpublish") { t.status = "draft"; touch(t); audit("listing.unpublish", "listing", t.id); return { ok: true, listing: full(t) }; }
        if (act === "status") {
          if (STATUSES.indexOf(body.status) < 0) fail(400, { error: "Unknown status" });
          t.status = body.status; touch(t); audit("listing.status", "listing", t.id);
          return { ok: true, listing: full(t) };
        }
      }
      if ((m = /^\/listings\/([^/]+)\/media\/order$/.exec(p)) && method === "PUT") {
        var o = find(m[1]), ids = body.ids || [];
        o.media.sort(function (a, b) { var ia = ids.indexOf(a.id), ib = ids.indexOf(b.id); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); });
        o.media.forEach(function (x, i) { x.sort = i; });
        touch(o);
        return { ok: true };
      }
      if ((m = /^\/media\/([^/]+)$/.exec(p))) {
        var owner = null, med = null;
        DB.listings.forEach(function (l) { l.media.forEach(function (x) { if (x.id === m[1]) { owner = l; med = x; } }); });
        if (!med) fail(404, { error: "Media not found" });
        if (method === "PATCH") { ["alt", "caption", "roomLabel", "role"].forEach(function (k) { if (k in body) med[k] = body[k]; }); touch(owner); return clone(med); }
        if (method === "DELETE") {
          owner.media = owner.media.filter(function (x) { return x !== med; });
          if (owner.coverMediaId === med.id) owner.coverMediaId = null;
          touch(owner); audit("media.delete", "media", med.id);
          return { ok: true };
        }
      }
      fail(404, { error: "No such route in mock mode: " + method + " " + p });
    }

    function toDataUrl(blob) {
      if (!blob) return Promise.resolve(null);
      if (typeof blob === "string") return Promise.resolve(blob);
      return new Promise(function (resolve) { var r = new FileReader(); r.onload = function () { resolve(r.result); }; r.onerror = function () { resolve(null); }; r.readAsDataURL(blob); });
    }
    function progressTicks(onProgress) {
      var steps = [0.18, 0.42, 0.66, 0.88], p = Promise.resolve();
      steps.forEach(function (v) { p = p.then(function () { return delay(110); }).then(function () { if (onProgress) onProgress(v); }); });
      return p;
    }

    return {
      call: function (method, path, body) {
        return delay(90 + Math.random() * 160).then(function () { return handle(method, path, clone(body)); });
      },
      upload: function (method, fullPath, body, onProgress) {
        return delay(60).then(function () {
          if (DB.offline) fail(503, { connected: false, error: "The Studio is not connected to its database yet." });
          needAuth();
          var parts = fullPath.split("?"), q = new URLSearchParams(parts[1] || "");
          var meta, orig, large = null, thumb = null, pano = null;
          if (method === "POST") {
            meta = JSON.parse(body.get("meta") || "{}"); orig = body.get("orig"); large = body.get("large"); thumb = body.get("thumb"); pano = body.get("pano");
          } else {
            meta = { listingId: q.get("listingId"), kind: q.get("kind"), role: q.get("role"), filename: q.get("filename") }; orig = body;
          }
          var l = find(meta.listingId);
          return progressTicks(onProgress).then(function () { return Promise.all([toDataUrl(thumb), toDataUrl(large), toDataUrl(pano)]); }).then(function (urls) {
            var objectUrl = (!urls[1] && orig && typeof URL !== "undefined" && URL.createObjectURL) ? URL.createObjectURL(orig) : null;
            var med = { id: uid("m"), kind: meta.kind || "photo", role: meta.role || "gallery", roomLabel: meta.roomLabel || "", url: urls[1] || objectUrl, thumb: urls[0] || null, orig: objectUrl, pano: urls[2] || null, mime: (orig && orig.type) || null, width: meta.width || null, height: meta.height || null, bytes: (orig && orig.size) || null, alt: meta.alt || "", caption: null, sort: l.media.length, isPano: !!meta.isPano, aiLabel: null };
            l.media.push(med); touch(l); audit("media.upload", "media", med.id);
            if (onProgress) onProgress(1);
            return clone(med);
          });
        });
      },
      seed: function () { return delay(120).then(function () { return clone(SEED); }); }
    };
  }
  if (MOCK) mock = buildMock();
})();
