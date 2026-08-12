/* ═══════════════════════════════════════════════════════════════════════════
   HALCYON — API layer (HAL.api)
   API-first by design: every page talks to these Promise-returning methods
   and nothing else. In this prototype they resolve against the seed data plus
   a localStorage overlay (creates/edits/deletes survive reload). In production
   the bodies swap to fetch() against REST endpoints with identical shapes —
   which is what makes the same front-end viable as a PWA or native app shell.

   Contract sketch (production):
     GET  /api/v1/properties?status=sale&area=didsbury&minPrice=…
     GET  /api/v1/properties/:id
     POST /api/v1/enquiries | /api/v1/viewings | /api/v1/leads | /api/v1/valuations
     GET  /api/v1/tours/:propertyId          → provider, tourId, embedUrl
     POST /api/v1/analytics/events           (batched)
     Payments: Stripe PaymentIntents server-side only — no secrets in front-end.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var S = window.HAL.seed;
  var LS_KEY = "halcyon:v1";

  /* ── persistence overlay ────────────────────────────────────────────────── */
  function loadStore() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; }
  }
  var store = loadStore();
  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch (e) { /* private mode */ }
  }
  function bucket(name, def) { if (!store[name]) { store[name] = def; save(); } return store[name]; }

  /* merge seed + overlay for an entity list; overlay rows win on id */
  function merged(seedRows, name) {
    var over = store[name] || {};
    var out = seedRows
      .filter(function (r) { return !(over[r.id] && over[r.id].__deleted); })
      .map(function (r) { return over[r.id] ? Object.assign({}, r, over[r.id]) : r; });
    Object.keys(over).forEach(function (id) {
      if (over[id].__created && !over[id].__deleted) out.push(over[id]);
    });
    return out;
  }
  function patch(name, id, changes) {
    var b = bucket(name, {});
    b[id] = Object.assign({}, b[id] || {}, changes); save();
  }

  function delay(v, ms) { return new Promise(function (res) { setTimeout(function () { res(v); }, ms == null ? 120 : ms); }); }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function uid(p) { return p + "-" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }

  /* ── analytics (event log, kept small) ──────────────────────────────────── */
  function track(type, meta) {
    var b = bucket("events", []);
    b.push({ t: Date.now(), type: type, meta: meta || {} });
    if (b.length > 600) store.events = b.slice(-500);
    save();
  }

  /* ── property filtering ─────────────────────────────────────────────────── */
  function matches(p, f) {
    if (!f) return true;
    if (f.status && p.status !== f.status) return false;
    if (f.q) {
      var hay = (p.title + " " + p.addr + " " + p.city + " " + p.area + " " + p.type + " " + p.postcode).toLowerCase();
      var ok = String(f.q).toLowerCase().split(/[\s,]+/).every(function (w) { return !w || hay.indexOf(w) >= 0; });
      if (!ok) return false;
    }
    if (f.area && p.area !== f.area && p.city.toLowerCase() !== String(f.area).toLowerCase()) return false;
    if (f.city && p.city.toLowerCase() !== String(f.city).toLowerCase()) return false;
    if (f.type && p.type.toLowerCase().indexOf(String(f.type).toLowerCase()) < 0) return false;
    if (f.minPrice && p.price < f.minPrice) return false;
    if (f.maxPrice && p.price > f.maxPrice) return false;
    if (f.minBeds && (p.beds || 0) < f.minBeds) return false;
    if (f.maxBeds && (p.beds || 0) > f.maxBeds) return false;
    if (f.minBaths && (p.baths || 0) < f.minBaths) return false;
    if (f.minSqft && (p.sqft || 0) < f.minSqft) return false;
    var flags = ["garden", "parking", "garage", "balcony", "furnished", "pets", "newBuild", "sharedOwnership", "retirement", "investment", "chainFree"];
    for (var i = 0; i < flags.length; i++) { if (f[flags[i]] && !p[flags[i]]) return false; }
    if (f.tour && !p.tour) return false;
    if (f.video && !p.video) return false;
    if (f.epc && "ABCDEFG".indexOf(p.epc) > "ABCDEFG".indexOf(f.epc)) return false;
    if (f.maxDays != null && p.addedDays > f.maxDays) return false;
    if (f.bounds) { var b = f.bounds; if (p.lat < b.s || p.lat > b.n || p.lng < b.w || p.lng > b.e) return false; }
    return true;
  }

  function sortRows(rows, sort) {
    var s = sort || "curated";
    var arr = rows.slice();
    if (s === "price-asc") arr.sort(function (a, b) { return a.price - b.price; });
    else if (s === "price-desc") arr.sort(function (a, b) { return b.price - a.price; });
    else if (s === "newest") arr.sort(function (a, b) { return a.addedDays - b.addedDays; });
    else if (s === "size") arr.sort(function (a, b) { return (b.sqft || 0) - (a.sqft || 0); });
    else { /* curated: sponsored, featured, then newest */
      arr.sort(function (a, b) {
        var score = function (p) { return (p.badges.indexOf("sponsored") >= 0 ? 200 : 0) + (p.badges.indexOf("featured") >= 0 ? 100 : 0) - p.addedDays; };
        return score(b) - score(a);
      });
    }
    return arr;
  }

  /* ── natural-language search → structured filters ───────────────────────
     "3 bed house in Didsbury under £500k with a garden" works today with
     no model behind it; the same method later proxies to an LLM endpoint
     and returns an identical filter object. Architecture ready, not faked. */
  function parseQuery(text) {
    var f = {}, t = " " + String(text || "").toLowerCase().replace(/,/g, " ") + " ";
    var m;
    if (/\b(rent|rental|let|pcm|to let)\b/.test(t)) f.status = "rent";
    else if (/\b(buy|sale|purchase|for sale)\b/.test(t)) f.status = "sale";
    if (/\bcommercial|office|retail\b/.test(t)) f.status = "commercial";
    m = t.match(/(\d+)\s*(?:\+\s*)?(?:bed|beds|bedroom)/); if (m) f.minBeds = +m[1];
    m = t.match(/(\d+)\s*(?:\+\s*)?(?:bath|baths|bathroom)/); if (m) f.minBaths = +m[1];
    m = t.match(/under\s*£?\s*([\d.]+)\s*(k|m)?/) || t.match(/below\s*£?\s*([\d.]+)\s*(k|m)?/) || t.match(/max(?:imum)?\s*£?\s*([\d.]+)\s*(k|m)?/);
    if (m) f.maxPrice = +m[1] * (m[2] === "m" ? 1e6 : m[2] === "k" ? 1e3 : 1);
    m = t.match(/over\s*£?\s*([\d.]+)\s*(k|m)?/) || t.match(/above\s*£?\s*([\d.]+)\s*(k|m)?/);
    if (m) f.minPrice = +m[1] * (m[2] === "m" ? 1e6 : m[2] === "k" ? 1e3 : 1);
    if (f.status !== "rent" && f.maxPrice && f.maxPrice < 20000) f.status = "rent"; /* “under £2k” means pcm */
    if (/\bgarden\b/.test(t)) f.garden = true;
    if (/\bgarage\b/.test(t)) f.garage = true;
    if (/\bparking\b/.test(t)) f.parking = true;
    if (/\bbalcon/.test(t)) f.balcony = true;
    if (/\bfurnished\b/.test(t)) f.furnished = true;
    if (/\bpet/.test(t)) f.pets = true;
    if (/\bnew.?build|brand new\b/.test(t)) f.newBuild = true;
    if (/\bchain.?free\b/.test(t)) f.chainFree = true;
    if (/\b(virtual tour|360)\b/.test(t)) f.tour = true;
    ["house", "apartment", "flat", "penthouse", "loft", "bungalow", "townhouse", "barn"].some(function (k) {
      if (t.indexOf(" " + k) >= 0) { f.type = k === "flat" ? "apartment" : k; return true; }
      return false;
    });
    S.AREAS.forEach(function (a) { if (t.indexOf(a.name.toLowerCase()) >= 0) f.area = a.id; });
    ["manchester", "london", "cheshire"].forEach(function (c) {
      if (!f.area && t.indexOf(c) >= 0) f.city = c[0].toUpperCase() + c.slice(1);
    });
    return f;
  }

  /* ── user state (favourites, searches, journey, collections) ────────────── */
  function user() {
    return bucket("user", { name: "", email: "", saved: [], searches: [], collections: [], recent: [], compare: [], journey: [] });
  }
  function journey(step, propertyId) {
    var u = user();
    u.journey.push({ step: step, propertyId: propertyId, t: Date.now() }); save();
  }

  /* ── public API ─────────────────────────────────────────────────────────── */
  var api = {

    /* ······ properties ······ */
    properties: {
      list: function (filters, sort) {
        var rows = merged(S.PROPERTIES, "properties").filter(function (p) { return p.published !== false; });
        return delay(clone(sortRows(rows.filter(function (p) { return matches(p, filters); }), sort)));
      },
      all: function () { return delay(clone(merged(S.PROPERTIES, "properties"))); },
      get: function (id) {
        var p = merged(S.PROPERTIES, "properties").filter(function (r) { return r.id === id; })[0];
        return delay(p ? clone(p) : null);
      },
      similar: function (id, n) {
        var all = merged(S.PROPERTIES, "properties");
        var p = all.filter(function (r) { return r.id === id; })[0];
        if (!p) return delay([]);
        var rows = all.filter(function (r) { return r.id !== id && r.status === p.status; })
          .sort(function (a, b) {
            var d = function (x) { return (x.city === p.city ? 0 : 4) + Math.abs(Math.log((x.price + 1) / (p.price + 1))); };
            return d(a) - d(b);
          });
        return delay(clone(rows.slice(0, n || 3)));
      },
      update: function (id, changes) { patch("properties", id, changes); track("property.update", { id: id }); return delay(true); },
      create: function (row) {
        row.id = row.id || uid("prop"); row.__created = true; row.addedDays = 0; row.badges = row.badges || [];
        row.gallery = row.gallery && row.gallery.length ? row.gallery : [S.IMG.extModern[1]];
        row.hero = row.hero || row.gallery[0];
        patch("properties", row.id, row); track("property.create", { id: row.id }); return delay(clone(row));
      },
      duplicate: function (id) {
        var p = merged(S.PROPERTIES, "properties").filter(function (r) { return r.id === id; })[0];
        if (!p) return delay(null);
        var copy = clone(p); copy.id = uid(id); copy.title = p.title + " (copy)"; copy.__created = true; copy.published = false;
        patch("properties", copy.id, copy); return delay(clone(copy));
      },
      remove: function (id) { patch("properties", id, { __deleted: true }); return delay(true); }
    },

    /* ······ search ······ */
    search: {
      parse: parseQuery,
      run: function (queryOrFilters, sort) {
        var f = typeof queryOrFilters === "string" ? parseQuery(queryOrFilters) : queryOrFilters;
        track("search", f);
        return api.properties.list(f, sort).then(function (rows) { return { filters: f, results: rows }; });
      },
      save: function (filters, label) {
        var u = user(); u.searches.push({ id: uid("ss"), label: label, filters: filters, alerts: true, t: Date.now() }); save();
        return delay(true);
      },
      saved: function () { return delay(clone(user().searches)); },
      removeSaved: function (id) { var u = user(); u.searches = u.searches.filter(function (s) { return s.id !== id; }); save(); return delay(true); },
      toggleAlerts: function (id) { user().searches.forEach(function (s) { if (s.id === id) s.alerts = !s.alerts; }); save(); return delay(true); }
    },

    /* ······ user / account ······ */
    user: {
      get: function () { return delay(clone(user())); },
      signIn: function (name, email) { var u = user(); u.name = name; u.email = email; save(); track("signin", {}); return delay(clone(u)); },
      signOut: function () { var u = user(); u.name = ""; u.email = ""; save(); return delay(true); },
      toggleSaved: function (propertyId) {
        var u = user(); var i = u.saved.indexOf(propertyId);
        if (i >= 0) u.saved.splice(i, 1); else { u.saved.push(propertyId); journey("saved", propertyId); track("save", { id: propertyId }); }
        save(); return delay(u.saved.indexOf(propertyId) >= 0);
      },
      saved: function () { return delay(clone(user().saved)); },
      recent: function (propertyId) {
        var u = user();
        if (propertyId) {
          u.recent = [propertyId].concat(u.recent.filter(function (x) { return x !== propertyId; })).slice(0, 12);
          journey("viewed", propertyId); save();
        }
        return delay(clone(u.recent));
      },
      compare: {
        list: function () { return delay(clone(user().compare)); },
        toggle: function (id) {
          var u = user(); var i = u.compare.indexOf(id);
          if (i >= 0) u.compare.splice(i, 1); else if (u.compare.length < 4) u.compare.push(id);
          save(); return delay(clone(u.compare));
        },
        clear: function () { user().compare = []; save(); return delay(true); }
      },
      journey: function () { return delay(clone(user().journey)); }
    },

    /* ······ enquiries / viewings / valuations ······ */
    enquiries: {
      create: function (data) {
        var b = bucket("enquiries", []);
        var row = Object.assign({ id: uid("enq"), t: Date.now(), stage: "new" }, data);
        b.push(row); save(); journey("enquiry", data.propertyId); track("enquiry", { id: data.propertyId });
        return delay(clone(row), 400);
      },
      list: function () { return delay(clone(bucket("enquiries", []))); }
    },
    viewings: {
      request: function (data) {
        var b = bucket("viewings", []);
        var row = Object.assign({ id: uid("vw"), t: Date.now(), status: "requested" }, data);
        b.push(row); save(); journey("viewing", data.propertyId); track("viewing.request", { id: data.propertyId });
        return delay(clone(row), 400);
      },
      list: function () {
        var seed = S.VIEWINGS.map(function (v) { return clone(v); });
        return delay(seed.concat(clone(bucket("viewings", []))));
      },
      update: function (id, changes) {
        var b = bucket("viewings", []);
        var hit = b.filter(function (v) { return v.id === id; })[0];
        if (hit) Object.assign(hit, changes);
        else { var sv = S.VIEWINGS.filter(function (v) { return v.id === id; })[0]; if (sv) b.push(Object.assign(clone(sv), changes)); }
        save(); return delay(true);
      }
    },
    valuations: {
      create: function (data) {
        var b = bucket("valuations", []);
        /* deterministic demo estimate — production calls the AVM service */
        var base = { "detached": 520, "semi": 380, "terraced": 310, "apartment": 330, "bungalow": 350 }[data.type] || 340;
        var areaK = { "manchester": 1, "cheshire": 1.45, "london": 2.6 }[data.region] || 1;
        var mid = Math.round(base * areaK * (0.72 + 0.28 * (data.beds || 3)) * ({ "excellent": 1.12, "good": 1, "needs-work": 0.85 }[data.condition] || 1)) * 1000;
        var row = Object.assign({ id: uid("val"), t: Date.now(), estimate: { low: Math.round(mid * 0.93), mid: mid, high: Math.round(mid * 1.07) } }, data);
        b.push(row); save(); track("valuation", {});
        return delay(clone(row), 900);
      },
      list: function () { return delay(clone(bucket("valuations", []))); }
    },

    /* ······ CRM ······ */
    leads: {
      stages: function () { return clone(S.LEAD_STAGES); },
      list: function () { return delay(clone(merged(S.LEADS, "leads"))); },
      move: function (id, stage) { patch("leads", id, { stage: stage }); track("lead.move", { id: id, stage: stage }); return delay(true); },
      create: function (row) { row.id = uid("ld"); row.__created = true; row.days = 0; row.stage = row.stage || "new"; patch("leads", row.id, row); return delay(clone(row)); },
      update: function (id, changes) { patch("leads", id, changes); return delay(true); }
    },

    /* ······ agents / landlords ······ */
    agents: {
      list: function () { return delay(clone(S.AGENTS)); },
      get: function (id) { return delay(clone(S.AGENTS.filter(function (a) { return a.id === id; })[0] || null)); }
    },
    landlords: {
      list: function () { return delay(clone(S.LANDLORDS)); },
      get: function (id) { return delay(clone(S.LANDLORDS.filter(function (l) { return l.id === id; })[0] || null)); }
    },

    /* ······ areas / developments / reviews ······ */
    areas: {
      list: function () { return delay(clone(S.AREAS)); },
      get: function (id) { return delay(clone(S.AREAS.filter(function (a) { return a.id === id; })[0] || null)); }
    },
    developments: { list: function () { return delay(clone(S.DEVELOPMENTS)); } },
    reviews: { list: function () { return delay(clone(S.REVIEWS)); } },

    /* ······ 360 tours — bridge to the existing billy360 platform ······
       Halcyon never rebuilds the tour engine. This registry maps properties
       onto provider tours (billy360 today; provider field keeps it open) and
       hands back everything an embed needs. */
    tours: {
      list: function () { return delay(clone(merged(S.TOURS, "tours"))); },
      forProperty: function (propertyId) {
        var t = merged(S.TOURS, "tours").filter(function (r) { return r.propertyId === propertyId && r.status === "published"; })[0];
        return delay(t ? clone(t) : null);
      },
      attach: function (row) {
        row.id = row.id || uid("vt"); row.__created = true; row.provider = row.provider || "billy360";
        row.embedUrl = row.embedUrl || (S.TOURS_BASE + "?site=" + encodeURIComponent(row.tourId) + "&embed=1");
        row.status = row.status || "draft"; row.sessions = row.sessions || 0; row.completion = row.completion || 0;
        patch("tours", row.id, row); track("tour.attach", { id: row.id }); return delay(clone(row));
      },
      update: function (id, changes) { patch("tours", id, changes); return delay(true); },
      detach: function (id) { patch("tours", id, { __deleted: true }); return delay(true); },
      /* embed snippets for any host site — platform-independent by design */
      embedCode: function (t) {
        var origin = location.origin === "null" || !location.origin ? "https://your-domain.com" : location.origin;
        return {
          script: '<div data-billy360="' + t.tourId + '" data-height="16:9"' + (t.room ? ' data-room="' + t.room + '"' : "") + '></div>\n<script src="' + origin + S.TOURS_BASE + 'embed.js"><\/script>',
          iframe: '<iframe src="' + origin + t.embedUrl + '" style="width:100%;aspect-ratio:16/9;border:0" allow="fullscreen; gyroscope; accelerometer" allowfullscreen title="360 virtual tour"></iframe>'
        };
      },
      launchUrl: function (t) { return t.embedUrl + (t.room ? "#/tour/" + encodeURIComponent(t.room) : ""); }
    },

    /* ······ advertising ······ */
    ads: {
      products: function () { return delay(clone(S.AD_PRODUCTS)); },
      campaigns: function () { return delay(clone(merged(S.CAMPAIGNS, "campaigns"))); },
      create: function (row) {
        row.id = uid("cmp"); row.__created = true; row.status = row.start > 0 ? "scheduled" : "live";
        row.spend = 0; row.impressions = 0; row.clicks = 0; row.enquiries = 0; row.viewings = 0;
        patch("campaigns", row.id, row); track("campaign.create", { id: row.id }); return delay(clone(row));
      },
      update: function (id, changes) { patch("campaigns", id, changes); return delay(true); }
    },

    /* ······ payments (Stripe-ready stubs; secrets live server-side only) ··· */
    payments: {
      invoices: function () {
        return delay(clone(bucket("invoices", [
          { id: "inv-1042", to: "Hartley Estates", desc: "Search boost — Deansgate Sky", amount: 120, status: "paid", days: -9 },
          { id: "inv-1043", to: "Rosewood Capital", desc: "Premium listing — Counting House", amount: 340, status: "open", days: -2 },
          { id: "inv-1044", to: "Field & Foundry", desc: "Area spotlight — One Cotton Field", amount: 300, status: "open", days: 0 }
        ])));
      },
      createCheckout: function (desc, amount) {
        /* production: POST /api/v1/payments/checkout → Stripe session URL */
        track("payment.intent", { desc: desc, amount: amount });
        return delay({ ok: true, message: "Stripe checkout would open here — wire STRIPE_SECRET_KEY into the Worker and this call returns a session URL." }, 600);
      }
    },

    /* ······ CMS / website builder ······ */
    cms: {
      sections: function () {
        var order = store.cmsOrder || null;
        var rows = clone(S.CMS_SECTIONS).map(function (s) { return Object.assign(s, (store.cmsSections || {})[s.id] || {}); });
        if (order) rows.sort(function (a, b) { return order.indexOf(a.id) - order.indexOf(b.id); });
        return delay(rows);
      },
      setSections: function (rows) {
        store.cmsOrder = rows.map(function (r) { return r.id; });
        store.cmsSections = {};
        rows.forEach(function (r) { store.cmsSections[r.id] = { visible: r.visible }; });
        save(); return delay(true);
      },
      copy: function () { return delay(Object.assign(clone(S.CMS_COPY), store.cmsCopy || {})); },
      setCopy: function (changes) { store.cmsCopy = Object.assign(store.cmsCopy || {}, changes); save(); return delay(true); }
    },

    /* ······ analytics ······ */
    analytics: {
      track: track,
      events: function () { return delay(clone(bucket("events", []))); },
      /* deterministic demo series so the dashboards render believable charts */
      series: function (days, seedNum, base, spread) {
        var out = [], v = base;
        for (var i = days; i > 0; i--) {
          var wave = Math.sin((i + seedNum) / 3.1) * spread * 0.4 + Math.sin((i + seedNum * 7) / 8.3) * spread * 0.6;
          var weekend = ((i + seedNum) % 7 < 2) ? spread * 0.35 : 0;
          out.push(Math.max(0, Math.round(v + wave + weekend)));
          v += Math.sin((i + seedNum) / 11) * spread * 0.12;
        }
        return out;
      },
      summary: function () {
        var props = merged(S.PROPERTIES, "properties");
        var views = props.map(function (p) { return { id: p.id, title: p.title, views: 300 + ((p.price % 977) + p.sqft) % 2400, saves: 8 + (p.price % 63), enquiries: 2 + (p.price % 17) }; });
        views.sort(function (a, b) { return b.views - a.views; });
        return delay({
          totals: { properties: props.length, views: views.reduce(function (s, v) { return s + v.views; }, 0), enquiries: views.reduce(function (s, v) { return s + v.enquiries; }, 0), tourSessions: S.TOURS.reduce(function (s, t) { return s + t.sessions; }, 0) },
          topProperties: views.slice(0, 6),
          sources: [["Direct", 34], ["Search engines", 27], ["Portals", 18], ["Social", 12], ["Email alerts", 9]],
          devices: [["Mobile", 58], ["Desktop", 33], ["Tablet", 9]]
        });
      }
    },

    /* ······ utils ······ */
    fmt: {
      price: function (p, status) {
        var n = "£" + Number(p).toLocaleString("en-GB");
        return status === "rent" ? n + " pcm" : n;
      },
      sqft: function (n) { return n ? Number(n).toLocaleString("en-GB") + " sq ft" : ""; },
      pcm: function (n) { return "£" + Number(n).toLocaleString("en-GB") + " pcm"; }
    },
    img: S.img, srcset: S.srcset,
    reset: function () { localStorage.removeItem(LS_KEY); location.reload(); }
  };

  window.HAL.api = api;
})();
