/* ═══════════════════════════════════════════════════════════════════════════
   HALCYON STUDIO — the back office
   Hash-routed single-page workspace over HAL.api. Three roles share one shell:
   admin (everything), agent (their pipeline), landlord (their portfolio).
   The 360 Tour Studio inside never rebuilds the tour engine — it manages the
   registry that points at the existing billy360 platform and mints embeds.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var api = HAL.api, S = HAL.seed;
  var view = document.getElementById("view");
  var role = "admin";
  var ROLE_AGENT = "a-okafor", ROLE_LANDLORD = "l-hartley";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toast(msg, kind) {
    var t = document.createElement("div");
    t.className = "os-toast" + (kind ? " os-toast--" + kind : "");
    t.textContent = msg;
    document.getElementById("toasts").appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }
  function money(v) { return "£" + Number(v).toLocaleString("en-GB"); }
  function thumb(id) { return api.img(id, 200); }

  /* ═══ charts (palette validated for this surface — see docs/halcyon.md) ═══ */
  var CH = { accent: "#d5b98e", s1: "#3987e5", s2: "#d95926", s3: "#199e70", grid: "#262933", ink: "#a7a69c" };

  function areaChart(el, labels, series, opts) {
    opts = opts || {};
    var W = 620, H = opts.h || 190, P = { t: 12, r: 10, b: 22, l: 38 };
    var max = Math.max.apply(0, series.map(function (s) { return Math.max.apply(0, s.values); })) * 1.15 || 1;
    var iw = W - P.l - P.r, ih = H - P.t - P.b;
    function x(i) { return P.l + iw * i / (labels.length - 1); }
    function y(v) { return P.t + ih - ih * v / max; }
    var gridLines = [0.33, 0.66, 1].map(function (k) {
      var v = max * k;
      return '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="' + CH.grid + '" stroke-width="1"/>' +
        '<text x="' + (P.l - 6) + '" y="' + (y(v) + 3) + '" text-anchor="end">' + (v >= 1000 ? (v / 1000).toFixed(1) + "k" : Math.round(v)) + "</text>";
    }).join("");
    var paths = series.map(function (s, si) {
      var pts = s.values.map(function (v, i) { return [x(i), y(v)]; });
      var d = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
      var area = si === 0 ? '<path d="' + d + " L" + x(s.values.length - 1) + " " + (P.t + ih) + " L" + P.l + " " + (P.t + ih) + ' Z" fill="' + s.color + '" opacity=".1"/>' : "";
      return area + '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    }).join("");
    var axis = [0, Math.floor(labels.length / 2), labels.length - 1].map(function (i) {
      return '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + labels[i] + "</text>";
    }).join("");
    el.classList.add("chart");
    el.innerHTML = (series.length > 1 ? '<div class="legend" style="margin-bottom:10px">' + series.map(function (s) {
      return "<span><i style='background:" + s.color + "'></i>" + esc(s.name) + "</span>";
    }).join("") + "</div>" : "") +
      '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(opts.label || "Trend chart") + '" style="width:100%;height:auto">' +
      gridLines + paths +
      '<line id="ch-cross" x1="0" x2="0" y1="' + P.t + '" y2="' + (P.t + ih) + '" stroke="' + CH.ink + '" stroke-width="1" stroke-dasharray="3 3" opacity="0"/>' +
      series.map(function (s, si) { return '<circle id="ch-dot-' + si + '" r="4" fill="' + s.color + '" stroke="#14161c" stroke-width="2" opacity="0"/>'; }).join("") +
      '<rect x="' + P.l + '" y="' + P.t + '" width="' + iw + '" height="' + ih + '" fill="transparent" id="ch-hit"/>' +
      axis + "</svg><div class='tip' id='ch-tip'></div>";
    var svg = el.querySelector("svg"), hit = el.querySelector("#ch-hit"), tip = el.querySelector("#ch-tip");
    hit.addEventListener("pointermove", function (e) {
      var r = svg.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width * W;
      var i = Math.round((px - P.l) / iw * (labels.length - 1));
      i = Math.max(0, Math.min(labels.length - 1, i));
      el.querySelector("#ch-cross").setAttribute("x1", x(i));
      el.querySelector("#ch-cross").setAttribute("x2", x(i));
      el.querySelector("#ch-cross").setAttribute("opacity", "1");
      series.forEach(function (s, si) {
        var d = el.querySelector("#ch-dot-" + si);
        d.setAttribute("cx", x(i)); d.setAttribute("cy", y(s.values[i])); d.setAttribute("opacity", "1");
      });
      tip.innerHTML = "<b>" + labels[i] + "</b>" + series.map(function (s) {
        return "<span style='color:" + CH.ink + "'>" + esc(s.name) + "</span> " + s.values[i].toLocaleString();
      }).join("<br>");
      tip.style.opacity = "1";
      var lx = (x(i) / W) * r.width;
      tip.style.left = Math.min(r.width - 130, Math.max(0, lx + 12)) + "px";
      tip.style.top = "18px";
    });
    hit.addEventListener("pointerleave", function () {
      tip.style.opacity = "0";
      el.querySelector("#ch-cross").setAttribute("opacity", "0");
      series.forEach(function (s, si) { el.querySelector("#ch-dot-" + si).setAttribute("opacity", "0"); });
    });
  }

  function hbars(el, rows, opts) {
    opts = opts || {};
    var max = Math.max.apply(0, rows.map(function (r) { return r[1]; })) || 1;
    el.innerHTML = rows.map(function (r) {
      var w = Math.max(2, r[1] / max * 100);
      return '<div style="display:grid;grid-template-columns:110px 1fr 48px;gap:10px;align-items:center;padding:6px 0" title="' + esc(r[0]) + ": " + r[1].toLocaleString() + '">' +
        '<span style="font-size:11.5px;color:var(--os-ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(r[0]) + "</span>" +
        '<span style="height:10px;border-radius:0 4px 4px 0;background:var(--os-panel-2);overflow:hidden"><span style="display:block;height:100%;width:' + w + "%;border-radius:0 4px 4px 0;background:" + (opts.color || CH.accent) + '"></span></span>' +
        '<span class="mono" style="font-size:11.5px;text-align:right;color:var(--os-ink-2)">' + r[1].toLocaleString() + (opts.suffix || "") + "</span></div>";
    }).join("");
  }

  function donut(el, rows, colors, label) {
    var total = rows.reduce(function (s, r) { return s + r[1]; }, 0) || 1;
    var R = 52, C = 2 * Math.PI * R, off = 0;
    var segs = rows.map(function (r, i) {
      var frac = r[1] / total;
      var seg = '<circle r="' + R + '" cx="70" cy="70" fill="none" stroke="' + colors[i] + '" stroke-width="16" stroke-dasharray="' + Math.max(0, frac * C - 2) + " " + (C - Math.max(0, frac * C - 2)) + '" stroke-dashoffset="' + (-off * C + C / 4) + '" />';
      off += frac;
      return seg;
    }).join("");
    var top = rows.slice().sort(function (a, b) { return b[1] - a[1]; })[0];
    el.innerHTML = '<div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">' +
      '<svg viewBox="0 0 140 140" style="width:120px" role="img" aria-label="' + esc(label || "Share chart") + '">' + segs +
      '<text x="70" y="66" text-anchor="middle" style="font:600 18px Space Grotesk;fill:var(--os-ink)">' + Math.round(top[1] / total * 100) + '%</text>' +
      '<text x="70" y="82" text-anchor="middle">' + esc(top[0].toLowerCase()) + '</text></svg>' +
      '<div class="legend" style="flex-direction:column;align-items:flex-start;gap:8px">' +
      rows.map(function (r, i) {
        return "<span><i style='background:" + colors[i] + "'></i>" + esc(r[0]) + " — <b class='mono'>" + Math.round(r[1] / total * 100) + "%</b></span>";
      }).join("") + "</div></div>";
  }

  /* ═══ navigation ═══ */
  var NAV = {
    admin: [
      ["Overview", null],
      ["dashboard", "Dashboard", "◧"],
      ["analytics", "Analytics", "∿"],
      ["Portfolio", null],
      ["properties", "Properties", "⌂"],
      ["tours", "360 Tour Studio", "◉"],
      ["Pipeline", null],
      ["leads", "Leads / CRM", "⇢"],
      ["viewings", "Viewings", "▤"],
      ["People", null],
      ["agents", "Agents", "☷"],
      ["landlords", "Landlords", "⌘"],
      ["Commercial", null],
      ["ads", "Advertising", "✦"],
      ["payments", "Payments", "¤"],
      ["Website", null],
      ["cms", "Content Studio", "✎"],
      ["settings", "Settings", "⚙"]
    ],
    agent: [
      ["My desk", null],
      ["agent", "My dashboard", "◧"],
      ["properties", "My properties", "⌂"],
      ["leads", "My leads", "⇢"],
      ["viewings", "My viewings", "▤"]
    ],
    landlord: [
      ["Portfolio", null],
      ["landlord", "My portfolio", "◧"],
      ["ads", "Promote a property", "✦"],
      ["payments", "Invoices", "¤"]
    ]
  };

  function renderNav() {
    var nav = document.getElementById("nav");
    var current = location.hash.replace("#/", "") || defaultRoute();
    nav.innerHTML = NAV[role].map(function (n) {
      if (!n[1] && typeof n[1] !== "string") return '<p class="nav-sec">' + n[0] + "</p>";
      return '<a href="#/' + n[0] + '"' + (current === n[0] ? ' class="is-on"' : "") + '><span aria-hidden="true">' + (n[2] || "•") + "</span>" + n[1] +
        (n[0] === "leads" ? '<span class="nav-badge" id="nav-leads"></span>' : "") + "</a>";
    }).join("");
  }
  function defaultRoute() { return role === "agent" ? "agent" : role === "landlord" ? "landlord" : "dashboard"; }

  document.getElementById("roles").addEventListener("click", function (e) {
    var b = e.target.closest("[data-role]"); if (!b) return;
    role = b.getAttribute("data-role");
    this.querySelectorAll("button").forEach(function (x) { x.classList.remove("is-on"); });
    b.classList.add("is-on");
    document.getElementById("brand-sub").textContent = role === "admin" ? "Studio" : role === "agent" ? "Agent desk" : "Landlord portal";
    location.hash = "#/" + defaultRoute();
    route();
  });
  document.getElementById("burger").addEventListener("click", function () { document.body.classList.toggle("side-open"); });

  /* ═══ drawer helper ═══ */
  var drawer = document.getElementById("drawer"), drawerOv = document.getElementById("drawer-overlay");
  function openDrawer(html) { drawer.innerHTML = html; drawer.classList.add("is-open"); drawerOv.classList.add("is-open"); }
  function closeDrawer() { drawer.classList.remove("is-open"); drawerOv.classList.remove("is-open"); }
  drawerOv.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeDrawer(); cmdkClose(); } });

  /* ═══ VIEWS ═══ */

  /* ── dashboard ── */
  function vDashboard() {
    Promise.all([api.analytics.summary(), api.leads.list(), api.ads.campaigns(), api.viewings.list()]).then(function (r) {
      var sum = r[0], leads = r[1], camps = r[2], viewings = r[3];
      var active = leads.filter(function (l) { return ["completed", "lost"].indexOf(l.stage) < 0; });
      var revenue = camps.reduce(function (s, c) { return s + c.spend; }, 0);
      view.innerHTML =
        '<div class="view-head"><h1>Good ' + dayPart() + '. The estate is moving.</h1>' +
        '<div class="vh-actions"><a class="btn" href="#/properties" data-new-prop>+ New property</a><a class="btn btn--accent" href="#/tours">+ New 360 tour</a></div></div>' +
        '<div class="kpis">' +
        kpi("Property views · 30d", sum.totals.views.toLocaleString(), "+12.4%", "up") +
        kpi("Enquiries · 30d", sum.totals.enquiries, "+8.1%", "up") +
        kpi("Active pipeline", money(active.reduce(function (s, l) { return s + (l.value > 10000 ? l.value : 0); }, 0)), active.length + " live leads", "up") +
        kpi("Ad revenue · 30d", money(revenue), camps.filter(function (c) { return c.status === "live"; }).length + " live campaigns", "up") +
        "</div>" +
        '<div class="grid-2" style="margin-top:14px;grid-template-columns:1.5fr 1fr">' +
        '<div class="panel"><div class="panel-head"><h2>Views & enquiries — 30 days</h2><span class="ph-hint">hover for detail</span></div><div id="ch-main"></div></div>' +
        '<div class="stack">' +
        '<div class="panel"><div class="panel-head"><h2>Traffic sources</h2></div><div id="ch-src"></div></div>' +
        '<div class="panel"><div class="panel-head"><h2>Devices</h2></div><div id="ch-dev"></div></div>' +
        "</div></div>" +
        '<div class="grid-2" style="margin-top:14px;grid-template-columns:1.5fr 1fr">' +
        '<div class="panel"><div class="panel-head"><h2>Most viewed properties</h2><a class="btn btn--sm" href="#/analytics">Full analytics</a></div><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Property</th><th>Views</th><th>Saves</th><th>Enquiries</th></tr></thead><tbody>' +
        sum.topProperties.map(function (p) {
          return "<tr><td class='row-title'>" + esc(p.title) + "</td><td class='mono'>" + p.views.toLocaleString() + "</td><td class='mono'>" + p.saves + "</td><td class='mono'>" + p.enquiries + "</td></tr>";
        }).join("") + "</tbody></table></div></div>" +
        '<div class="panel"><div class="panel-head"><h2>Next viewings</h2><a class="btn btn--sm" href="#/viewings">Calendar</a></div><div class="stack" style="gap:10px">' +
        viewings.slice(0, 4).map(function (v) {
          return '<div class="kb-card" style="cursor:default"><span class="kb-name">' + esc(v.lead) + '</span><span class="kb-sub">' + esc(propTitle(v.propertyId)) + '</span><span class="kb-meta"><span>' + (v.day != null ? "In " + v.day + "d · " : "") + esc(v.time || "") + "</span><span class='tag " + (v.kind === "virtual" ? "tag--blue" : "") + "'>" + (v.kind === "virtual" ? "Virtual" : "In person") + "</span></span></div>";
        }).join("") + "</div></div></div>";
      var days = labels30();
      areaChart(document.getElementById("ch-main"), days,
        [{ name: "Views", color: CH.accent, values: api.analytics.series(30, 3, 480, 120) },
         { name: "Enquiries", color: CH.s1, values: api.analytics.series(30, 9, 14, 8) }], { label: "Views and enquiries over 30 days" });
      hbars(document.getElementById("ch-src"), sum.sources, { suffix: "%" });
      donut(document.getElementById("ch-dev"), sum.devices, [CH.s1, CH.s2, CH.s3], "Sessions by device");
      var np = view.querySelector("[data-new-prop]");
      if (np) np.addEventListener("click", function (e) { e.preventDefault(); location.hash = "#/properties"; setTimeout(function () { editProperty(null); }, 80); });
    });
  }
  function kpi(label, num, delta, dir) {
    return '<div class="kpi"><span class="kpi-label">' + label + '</span><span class="kpi-num">' + num + '</span><span class="kpi-delta ' + dir + '">' + delta + "</span></div>";
  }
  function dayPart() { var h = new Date().getHours(); return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening"; }
  function labels30() { var out = []; for (var i = 29; i >= 0; i--) { var d = new Date(Date.now() - i * 864e5); out.push(d.getDate() + "/" + (d.getMonth() + 1)); } return out; }
  var PROP_CACHE = [];
  function propTitle(id) { var p = PROP_CACHE.filter(function (x) { return x.id === id; })[0]; return p ? p.title : id; }

  /* ── properties ── */
  function vProperties() {
    api.properties.all().then(function (rows) {
      PROP_CACHE = rows;
      if (role === "agent") rows = rows.filter(function (p) { return p.agent === ROLE_AGENT; });
      view.innerHTML =
        '<div class="view-head"><h1>Properties</h1><span class="tag">' + rows.length + " records</span>" +
        '<div class="vh-actions"><button class="btn btn--accent" id="new-prop">+ New property</button></div></div>' +
        '<div class="panel" style="padding:0"><div class="tbl-scroll"><table class="tbl"><thead><tr>' +
        "<th></th><th>Property</th><th>Price</th><th>Status</th><th>State</th><th>Flags</th><th>Tour</th><th style='text-align:right'>Actions</th>" +
        "</tr></thead><tbody>" +
        rows.map(function (p) {
          var state = p.published === false ? '<span class="tag tag--warn">Draft</span>' : p.scheduledFor ? '<span class="tag tag--blue">Scheduled</span>' : p.archived ? '<span class="tag">Archived</span>' : '<span class="tag tag--good">Live</span>';
          return "<tr data-id='" + p.id + "'>" +
            "<td><img class='tbl-thumb' src='" + thumb(p.hero) + "' alt=''></td>" +
            "<td><span class='row-title'>" + esc(p.title) + "</span><br><span class='row-sub'>" + esc(p.addr) + "</span></td>" +
            "<td class='mono'>" + api.fmt.price(p.price, p.status) + "</td>" +
            "<td><span class='tag'>" + p.status + "</span></td>" +
            "<td>" + state + "</td>" +
            "<td>" + (p.badges || []).map(function (b) { return "<span class='tag tag--accent'>" + b + "</span> "; }).join("") + "</td>" +
            "<td>" + (p.tour ? "<span class='tag tag--blue'>◉ " + esc(p.tour) + "</span>" : "<span class='muted'>—</span>") + "</td>" +
            "<td style='text-align:right;white-space:nowrap'>" +
            "<button class='btn btn--sm' data-act='edit'>Edit</button> " +
            "<button class='btn btn--sm' data-act='menu'>⋯</button></td></tr>" +
            "<tr class='row-menu' data-menu='" + p.id + "' hidden><td colspan='8' style='background:var(--os-panel-2)'>" +
            "<div style='display:flex;gap:8px;flex-wrap:wrap;padding:4px 0'>" +
            "<button class='btn btn--sm' data-act='publish'>" + (p.published === false ? "Publish" : "Unpublish") + "</button>" +
            "<button class='btn btn--sm' data-act='feature'>" + (has(p, "featured") ? "Unfeature" : "Set featured") + "</button>" +
            "<button class='btn btn--sm' data-act='sponsor'>" + (has(p, "sponsored") ? "Remove sponsored" : "Set sponsored") + "</button>" +
            "<button class='btn btn--sm' data-act='schedule'>Schedule publish</button>" +
            "<button class='btn btn--sm' data-act='duplicate'>Duplicate</button>" +
            "<button class='btn btn--sm' data-act='preview'>Preview ↗</button>" +
            "<button class='btn btn--sm btn--danger' data-act='archive'>Archive</button>" +
            "<button class='btn btn--sm btn--danger' data-act='delete'>Delete</button>" +
            "</div></td></tr>";
        }).join("") + "</tbody></table></div></div>";
      document.getElementById("new-prop").addEventListener("click", function () { editProperty(null); });
      view.querySelector("tbody").addEventListener("click", function (e) {
        var b = e.target.closest("[data-act]"); if (!b) return;
        var tr = e.target.closest("tr[data-id]") || view.querySelector("tr[data-id='" + e.target.closest(".row-menu").getAttribute("data-menu") + "']");
        var id = tr ? tr.getAttribute("data-id") : e.target.closest(".row-menu").getAttribute("data-menu");
        var p = rows.filter(function (x) { return x.id === id; })[0];
        var act = b.getAttribute("data-act");
        if (act === "menu") { var m = view.querySelector("[data-menu='" + id + "']"); m.hidden = !m.hidden; return; }
        if (act === "edit") return editProperty(p);
        if (act === "preview") return window.open("../property?id=" + id, "_blank");
        if (act === "duplicate") return api.properties.duplicate(id).then(function () { toast("Duplicated as draft", "good"); vProperties(); });
        if (act === "publish") return api.properties.update(id, { published: p.published === false }).then(function () { toast(p.published === false ? "Published" : "Unpublished"); vProperties(); });
        if (act === "feature") return toggleBadge(p, "featured");
        if (act === "sponsor") return toggleBadge(p, "sponsored");
        if (act === "schedule") {
          var when = prompt("Publish date (YYYY-MM-DD):", new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10));
          if (when) api.properties.update(id, { published: false, scheduledFor: when }).then(function () { toast("Scheduled for " + when, "good"); vProperties(); });
          return;
        }
        if (act === "archive") return api.properties.update(id, { archived: true, published: false }).then(function () { toast("Archived"); vProperties(); });
        if (act === "delete") { if (confirm("Delete “" + p.title + "”? This can't be undone.")) api.properties.remove(id).then(function () { toast("Deleted", "bad"); vProperties(); }); }
      });
    });
  }
  function has(p, b) { return (p.badges || []).indexOf(b) >= 0; }
  function toggleBadge(p, b) {
    var badges = (p.badges || []).slice();
    var i = badges.indexOf(b);
    if (i >= 0) badges.splice(i, 1); else badges.push(b);
    return api.properties.update(p.id, { badges: badges }).then(function () { toast(b + " updated", "good"); vProperties(); });
  }

  /* ── property editor drawer, with intelligent media manager ── */
  var ROOM_POOL = [
    ["Kitchen", S.IMG.kitchen], ["Living room", S.IMG.living], ["Bedroom", S.IMG.bedroom],
    ["Bathroom", S.IMG.bathroom], ["Garden", S.IMG.garden], ["Dining room", S.IMG.dining], ["Exterior", S.IMG.extModern]
  ];
  function autoTag(url) {
    /* demo classifier: in production this is the AI image-tagging endpoint —
       same signature, model behind /api/v1/media/classify */
    var pools = [["kitchen", S.IMG.kitchen], ["living room", S.IMG.living], ["bedroom", S.IMG.bedroom], ["bathroom", S.IMG.bathroom], ["garden", S.IMG.garden], ["dining", S.IMG.dining], ["exterior", S.IMG.extModern.concat(S.IMG.extClassic, S.IMG.aptBuilding)]];
    for (var i = 0; i < pools.length; i++) if (pools[i][1].some(function (id) { return url.indexOf(id) >= 0; })) return pools[i][0];
    return "other";
  }
  var ROOM_ORDER = ["exterior", "living room", "kitchen", "dining", "bedroom", "bathroom", "garden", "other"];

  function editProperty(p) {
    var isNew = !p;
    p = p || { title: "", addr: "", city: "Manchester", area: "manchester-city-centre", status: "sale", price: 500000, beds: 3, baths: 2, sqft: 1200, epc: "C", councilTax: "D", tenure: "Freehold", type: "House", gallery: [], badges: [], published: false, agent: ROLE_AGENT, desc: [], features: [], lat: 53.48, lng: -2.24 };
    var media = (p.gallery || []).slice();
    openDrawer(
      '<div class="d-head"><h2>' + (isNew ? "New property" : "Edit — " + esc(p.title)) + '</h2><button class="btn btn--sm" id="d-close">Esc</button></div>' +
      '<div class="d-body">' +
      '<div class="f"><label>Title</label><input id="e-title" value="' + esc(p.title) + '" placeholder="The Penthouse, King Street"></div>' +
      '<div class="f-row"><div class="f"><label>Address</label><input id="e-addr" value="' + esc(p.addr) + '"></div>' +
      '<div class="f"><label>City</label><select id="e-city">' + ["Manchester", "Cheshire", "London"].map(function (c) { return "<option" + (p.city === c ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="f-row"><div class="f"><label>Market</label><select id="e-status">' + ["sale", "rent", "commercial"].map(function (s) { return "<option" + (p.status === s ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select></div>" +
      '<div class="f"><label>Price (£' + '/pcm for rentals)</label><input id="e-price" type="number" value="' + p.price + '"></div></div>' +
      '<div class="f-row"><div class="f"><label>Beds</label><input id="e-beds" type="number" value="' + (p.beds || 0) + '"></div><div class="f"><label>Baths</label><input id="e-baths" type="number" value="' + (p.baths || 0) + '"></div></div>' +
      '<div class="f-row"><div class="f"><label>Sq ft</label><input id="e-sqft" type="number" value="' + (p.sqft || 0) + '"></div><div class="f"><label>Type</label><input id="e-type" value="' + esc(p.type) + '"></div></div>' +
      '<div class="f-row"><div class="f"><label>EPC</label><select id="e-epc">' + "ABCDEFG".split("").map(function (c) { return "<option" + (p.epc === c ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select></div>" +
      '<div class="f"><label>Tenure</label><input id="e-tenure" value="' + esc(p.tenure) + '"></div></div>' +
      '<div class="f"><label>Agent</label><select id="e-agent">' + S.AGENTS.map(function (a) { return '<option value="' + a.id + '"' + (p.agent === a.id ? " selected" : "") + ">" + a.name + "</option>"; }).join("") + "</select></div>" +
      '<div class="f"><label>Description</label><textarea id="e-desc" rows="4" placeholder="One paragraph per line">' + esc((p.desc || []).join("\n")) + "</textarea></div>" +
      '<div class="f"><label>Key features (one per line)</label><textarea id="e-feat" rows="3">' + esc((p.features || []).join("\n")) + "</textarea></div>" +
      '<div style="display:flex;gap:16px;flex-wrap:wrap">' +
      ["garden", "parking", "garage", "balcony", "furnished", "pets", "newBuild", "chainFree"].map(function (k) {
        return '<label class="check"><input type="checkbox" data-flag="' + k + '"' + (p[k] ? " checked" : "") + ">" + k + "</label>";
      }).join("") + "</div>" +
      '<div class="f"><label>Media — drag to reorder · first image is the hero · auto-tagged on upload</label>' +
      '<div class="media-grid" id="e-media"></div>' +
      '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' +
      '<button class="btn btn--sm" id="e-add-media">+ Add from library</button>' +
      '<button class="btn btn--sm" id="e-auto-order">✦ Suggest order</button>' +
      '<label class="btn btn--sm" style="cursor:pointer">Upload… <input type="file" id="e-upload" accept="image/*" multiple class="visually-hidden"></label>' +
      "</div></div>" +
      '<div class="f"><label>SEO — meta description</label><textarea id="e-seo" rows="2">' + esc(p.seo || "") + "</textarea></div>" +
      '<div class="f"><label>Internal notes (never public)</label><textarea id="e-notes" rows="2">' + esc(p.notes || "") + "</textarea></div>" +
      "</div>" +
      '<div class="d-foot"><label class="check" style="margin-right:auto"><input type="checkbox" id="e-pub"' + (p.published !== false ? " checked" : "") + "> Published</label>" +
      '<button class="btn" id="d-cancel">Cancel</button><button class="btn btn--accent" id="d-save">' + (isNew ? "Create property" : "Save changes") + "</button></div>");

    function renderMedia() {
      var box = document.getElementById("e-media");
      box.innerHTML = media.map(function (m, i) {
        return '<figure class="media-item" draggable="true" data-i="' + i + '">' +
          '<img src="' + thumb(m) + '" alt="">' +
          (i === 0 ? '<span class="mi-hero">Hero</span>' : "") +
          '<span class="mi-tag">' + autoTag(m) + "</span>" +
          '<button class="mi-x" data-del="' + i + '" aria-label="Remove image">✕</button></figure>';
      }).join("") + '<button class="media-drop" id="e-drop">Drop images here<br>or click to add</button>';
      /* drag reorder */
      var dragI = null;
      box.querySelectorAll(".media-item").forEach(function (item) {
        item.addEventListener("dragstart", function () { dragI = +item.getAttribute("data-i"); item.classList.add("is-drag"); });
        item.addEventListener("dragend", function () { item.classList.remove("is-drag"); });
        item.addEventListener("dragover", function (e) { e.preventDefault(); item.classList.add("is-over"); });
        item.addEventListener("dragleave", function () { item.classList.remove("is-over"); });
        item.addEventListener("drop", function (e) {
          e.preventDefault(); item.classList.remove("is-over");
          var to = +item.getAttribute("data-i");
          media.splice(to, 0, media.splice(dragI, 1)[0]);
          renderMedia();
        });
      });
      box.querySelectorAll("[data-del]").forEach(function (b) {
        b.addEventListener("click", function () { media.splice(+b.getAttribute("data-del"), 1); renderMedia(); });
      });
      document.getElementById("e-drop").addEventListener("click", addFromLibrary);
    }
    function addFromLibrary() {
      var pool = ROOM_POOL[Math.floor(Math.random() * ROOM_POOL.length)];
      var candidates = pool[1].filter(function (id) { return media.indexOf(id) < 0; });
      if (!candidates.length) { toast("Library exhausted for " + pool[0]); return; }
      media.push(candidates[0]);
      toast("Added — tagged “" + autoTag(candidates[0]) + "” automatically", "good");
      renderMedia();
    }
    document.getElementById("e-add-media").addEventListener("click", addFromLibrary);
    document.getElementById("e-auto-order").addEventListener("click", function () {
      media.sort(function (a, b) { return ROOM_ORDER.indexOf(autoTag(a)) - ROOM_ORDER.indexOf(autoTag(b)); });
      toast("Ordered: exterior → living → kitchen → beds → baths → garden", "good");
      renderMedia();
    });
    document.getElementById("e-upload").addEventListener("change", function () {
      /* demo: local files can't persist in localStorage sensibly — production
         posts to /api/v1/media and gets back CDN urls + AI tags */
      toast(this.files.length + " file(s) would upload, compress to AVIF/WebP and auto-tag in production", "good");
    });
    renderMedia();

    document.getElementById("d-close").addEventListener("click", closeDrawer);
    document.getElementById("d-cancel").addEventListener("click", closeDrawer);
    document.getElementById("d-save").addEventListener("click", function () {
      var g = function (id) { return document.getElementById(id).value; };
      var changes = {
        title: g("e-title") || "Untitled property", addr: g("e-addr"), city: g("e-city"),
        status: g("e-status"), price: +g("e-price") || 0, beds: +g("e-beds") || 0, baths: +g("e-baths") || 0,
        sqft: +g("e-sqft") || 0, type: g("e-type"), epc: g("e-epc"), tenure: g("e-tenure"),
        agent: g("e-agent"), desc: g("e-desc").split("\n").filter(Boolean), features: g("e-feat").split("\n").filter(Boolean),
        seo: g("e-seo"), notes: g("e-notes"), gallery: media, hero: media[0] || p.hero,
        published: document.getElementById("e-pub").checked
      };
      drawer.querySelectorAll("[data-flag]").forEach(function (c) { changes[c.getAttribute("data-flag")] = c.checked; });
      if (!changes.title.trim() || !changes.addr.trim()) { toast("Title and address are required", "bad"); return; }
      (isNew ? api.properties.create(changes) : api.properties.update(p.id, changes)).then(function () {
        toast(isNew ? "Property created" : "Saved", "good");
        closeDrawer(); vProperties();
      });
    });
  }

  /* ── leads / CRM kanban ── */
  function vLeads() {
    Promise.all([api.leads.list(), api.properties.all()]).then(function (r) {
      var leads = r[0]; PROP_CACHE = r[1];
      if (role === "agent") leads = leads.filter(function (l) { return l.agent === ROLE_AGENT; });
      var stages = api.leads.stages();
      view.innerHTML =
        '<div class="view-head"><h1>Leads</h1><span class="tag">' + leads.length + " in pipeline</span>" +
        '<div class="vh-actions"><button class="btn btn--accent" id="new-lead">+ New lead</button></div></div>' +
        '<div class="kanban" id="kanban">' +
        stages.map(function (st) {
          var cards = leads.filter(function (l) { return l.stage === st.id; });
          return '<div class="kb-col" data-stage="' + st.id + '"><div class="kb-head"><h3>' + st.name + '</h3><span class="tag">' + cards.length + "</span></div>" +
            cards.map(function (l) {
              return '<div class="kb-card" draggable="true" data-lead="' + l.id + '">' +
                '<span class="kb-name">' + esc(l.name) + '</span>' +
                '<span class="kb-sub">' + esc(propTitle(l.propertyId)) + "</span>" +
                (l.note ? '<span class="kb-sub" style="font-style:italic">' + esc(l.note) + "</span>" : "") +
                '<span class="kb-meta"><span class="mono">' + (l.value > 10000 ? money(l.value) : money(l.value) + " pcm") + '</span><span class="tag">' + esc(l.source) + "</span></span></div>";
            }).join("") + "</div>";
        }).join("") + "</div>";
      /* drag between stages */
      var dragging = null;
      view.querySelectorAll(".kb-card").forEach(function (c) {
        c.addEventListener("dragstart", function () { dragging = c.getAttribute("data-lead"); c.classList.add("is-drag"); });
        c.addEventListener("dragend", function () { c.classList.remove("is-drag"); });
      });
      view.querySelectorAll(".kb-col").forEach(function (col) {
        col.addEventListener("dragover", function (e) { e.preventDefault(); col.classList.add("is-over"); });
        col.addEventListener("dragleave", function () { col.classList.remove("is-over"); });
        col.addEventListener("drop", function (e) {
          e.preventDefault(); col.classList.remove("is-over");
          if (!dragging) return;
          api.leads.move(dragging, col.getAttribute("data-stage")).then(function () { toast("Lead moved", "good"); vLeads(); });
        });
      });
      document.getElementById("new-lead").addEventListener("click", function () {
        openDrawer(
          '<div class="d-head"><h2>New lead</h2><button class="btn btn--sm" id="d-close">Esc</button></div>' +
          '<div class="d-body">' +
          '<div class="f"><label>Name</label><input id="l-name"></div>' +
          '<div class="f-row"><div class="f"><label>Email</label><input id="l-email" type="email"></div><div class="f"><label>Phone</label><input id="l-phone"></div></div>' +
          '<div class="f"><label>Property</label><select id="l-prop">' + PROP_CACHE.map(function (p) { return '<option value="' + p.id + '">' + esc(p.title) + "</option>"; }).join("") + "</select></div>" +
          '<div class="f-row"><div class="f"><label>Source</label><select id="l-src"><option>Property enquiry</option><option>Viewing request</option><option>Contact form</option><option>Phone</option><option>Email</option><option>Virtual tour</option><option>Saved property</option><option>Mortgage enquiry</option></select></div>' +
          '<div class="f"><label>Agent</label><select id="l-agent">' + S.AGENTS.map(function (a) { return '<option value="' + a.id + '">' + a.name + "</option>"; }).join("") + "</select></div></div>" +
          '<div class="f"><label>Note</label><textarea id="l-note" rows="2"></textarea></div></div>' +
          '<div class="d-foot"><button class="btn" id="d-cancel">Cancel</button><button class="btn btn--accent" id="l-save">Create lead</button></div>');
        document.getElementById("d-close").addEventListener("click", closeDrawer);
        document.getElementById("d-cancel").addEventListener("click", closeDrawer);
        document.getElementById("l-save").addEventListener("click", function () {
          var name = document.getElementById("l-name").value.trim();
          if (!name) { toast("A name at minimum", "bad"); return; }
          var pid = document.getElementById("l-prop").value;
          var p = PROP_CACHE.filter(function (x) { return x.id === pid; })[0];
          api.leads.create({
            name: name, email: document.getElementById("l-email").value, phone: document.getElementById("l-phone").value,
            propertyId: pid, source: document.getElementById("l-src").value, agent: document.getElementById("l-agent").value,
            note: document.getElementById("l-note").value, value: p ? p.price : 0
          }).then(function () { toast("Lead created", "good"); closeDrawer(); vLeads(); });
        });
      });
    });
  }

  /* ── viewings calendar ── */
  function vViewings() {
    Promise.all([api.viewings.list(), api.properties.all()]).then(function (r) {
      var rows = r[0]; PROP_CACHE = r[1];
      if (role === "agent") rows = rows.filter(function (v) { return !v.agent || v.agent === ROLE_AGENT; });
      var days = [];
      for (var i = 0; i < 7; i++) {
        var d = new Date(Date.now() + i * 864e5);
        days.push({ i: i, label: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) });
      }
      view.innerHTML =
        '<div class="view-head"><h1>Viewings — next 7 days</h1><span class="tag">' + rows.length + " booked or requested</span></div>" +
        '<div class="cal">' +
        days.map(function (d) {
          var evs = rows.filter(function (v) { return (v.day != null ? v.day : 99) === d.i; });
          return '<div class="cal-day' + (d.i === 0 ? " is-today" : "") + '"><span class="cal-date">' + d.label + "</span>" +
            (evs.length ? evs.map(function (v) {
              return '<div class="cal-ev ' + (v.kind === "virtual" ? "virtual" : "") + '"><b>' + esc(v.time || "TBC") + " — " + esc(v.lead || v.name || "Viewer") + "</b>" +
                "<span>" + esc(propTitle(v.propertyId)) + "</span>" +
                '<span style="display:flex;gap:6px;margin-top:4px;align-items:center"><span class="tag ' + (v.status === "confirmed" ? "tag--good" : "tag--warn") + '">' + v.status + "</span>" +
                (v.status !== "confirmed" ? '<button class="btn btn--sm" data-confirm="' + v.id + '">Confirm</button>' : "") + "</span></div>";
            }).join("") : '<span class="muted" style="font-size:11px">—</span>') + "</div>";
        }).join("") + "</div>" +
        '<p class="muted" style="margin-top:14px;font-size:12px">Requests made on the public site land here instantly; confirmations trigger email + calendar invites in production.</p>';
      view.querySelectorAll("[data-confirm]").forEach(function (b) {
        b.addEventListener("click", function () {
          api.viewings.update(b.getAttribute("data-confirm"), { status: "confirmed" }).then(function () { toast("Confirmed — notification sent", "good"); vViewings(); });
        });
      });
    });
  }

  /* ── agents ── */
  function vAgents() {
    Promise.all([api.agents.list(), api.properties.all(), api.leads.list()]).then(function (r) {
      var agents = r[0]; PROP_CACHE = r[1]; var leads = r[2];
      view.innerHTML = '<div class="view-head"><h1>Agents</h1></div><div class="grid-2">' +
        agents.map(function (a) {
          var props = PROP_CACHE.filter(function (p) { return p.agent === a.id; });
          var ldz = leads.filter(function (l) { return l.agent === a.id; });
          var won = ldz.filter(function (l) { return l.stage === "completed"; }).length;
          return '<div class="panel"><div style="display:flex;gap:14px;align-items:center;margin-bottom:14px">' +
            '<span style="width:44px;height:44px;border-radius:50%;background:var(--os-raise);display:grid;place-items:center;font:600 14px var(--grot);color:var(--os-accent)">' + a.name.split(" ").map(function (w) { return w[0]; }).join("") + "</span>" +
            "<div><strong>" + esc(a.name) + "</strong><br><span class='muted' style='font-size:11.5px'>" + esc(a.role) + "</span></div>" +
            '<span class="tag tag--good" style="margin-left:auto">' + Math.round(a.responseRate * 100) + "% response</span></div>" +
            '<div class="kpis" style="grid-template-columns:repeat(3,1fr)">' +
            kpi("Properties", props.length, esc(a.patch), "up") +
            kpi("Live leads", ldz.filter(function (l) { return ["completed", "lost"].indexOf(l.stage) < 0; }).length, "~" + a.avgResponseMins + "m reply", "up") +
            kpi("Completed", won, "this quarter", "up") +
            "</div></div>";
        }).join("") + "</div>";
    });
  }

  /* ── landlords (admin list) ── */
  function vLandlords() {
    Promise.all([api.landlords.list(), api.properties.all()]).then(function (r) {
      PROP_CACHE = r[1];
      view.innerHTML = '<div class="view-head"><h1>Landlords</h1></div><div class="panel" style="padding:0"><div class="tbl-scroll"><table class="tbl">' +
        "<thead><tr><th>Landlord</th><th>Contact</th><th>Properties</th><th style='text-align:right'></th></tr></thead><tbody>" +
        r[0].map(function (l) {
          return "<tr><td class='row-title'>" + esc(l.name) + "</td><td>" + esc(l.contact) + "<br><span class='row-sub'>" + esc(l.email) + "</span></td>" +
            "<td>" + l.properties.map(function (id) { return "<span class='tag'>" + esc(propTitle(id)) + "</span> "; }).join("") + "</td>" +
            "<td style='text-align:right'><button class='btn btn--sm' data-portal='" + l.id + "'>Open portal view</button></td></tr>";
        }).join("") + "</tbody></table></div></div>";
      view.querySelectorAll("[data-portal]").forEach(function (b) {
        b.addEventListener("click", function () { role = "landlord"; document.getElementById("brand-sub").textContent = "Landlord portal"; location.hash = "#/landlord"; route(); });
      });
    });
  }

  /* ── landlord portal ── */
  function vLandlordPortal() {
    Promise.all([api.landlords.get(ROLE_LANDLORD), api.properties.all(), api.enquiries.list(), api.viewings.list(), api.payments.invoices()]).then(function (r) {
      var ll = r[0]; PROP_CACHE = r[1];
      var mine = PROP_CACHE.filter(function (p) { return p.landlord === ROLE_LANDLORD; });
      var enq = r[2].filter(function (e) { return mine.some(function (p) { return p.id === e.propertyId; }); });
      var vws = r[3].filter(function (v) { return mine.some(function (p) { return p.id === v.propertyId; }); });
      var inv = r[4].filter(function (x) { return x.to === ll.name; });
      view.innerHTML =
        '<div class="view-head"><h1>' + esc(ll.name) + '</h1><span class="tag">Landlord portal</span>' +
        '<div class="vh-actions"><a class="btn btn--accent" href="#/ads">✦ Promote a property</a></div></div>' +
        '<div class="kpis">' +
        kpi("Your properties", mine.length, mine.filter(function (p) { return p.status === "rent"; }).length + " to let", "up") +
        kpi("Enquiries", enq.length + 14, "+3 this week", "up") +
        kpi("Viewing requests", vws.length, "next: " + (vws[0] ? vws[0].time + " in " + vws[0].day + "d" : "—"), "up") +
        kpi("Open invoices", inv.filter(function (x) { return x.status === "open"; }).length, money(inv.filter(function (x) { return x.status === "open"; }).reduce(function (s, x) { return s + x.amount; }, 0)) + " due", "down") +
        "</div>" +
        '<div class="grid-2" style="margin-top:14px;grid-template-columns:1.5fr 1fr">' +
        '<div class="panel"><div class="panel-head"><h2>Your properties — performance</h2></div><div class="tbl-scroll"><table class="tbl">' +
        "<thead><tr><th>Property</th><th>Status</th><th>Views 30d</th><th>Enquiries</th><th></th></tr></thead><tbody>" +
        mine.map(function (p) {
          return "<tr><td><span class='row-title'>" + esc(p.title) + "</span><br><span class='row-sub'>" + esc(p.addr) + "</span></td>" +
            "<td><span class='tag " + (p.published !== false ? "tag--good" : "tag--warn") + "'>" + (p.published !== false ? "Marketing" : "Paused") + "</span></td>" +
            "<td class='mono'>" + (300 + (p.price % 900)).toLocaleString() + "</td><td class='mono'>" + (3 + p.price % 9) + "</td>" +
            "<td><button class='btn btn--sm' data-req='" + p.id + "'>Request change</button></td></tr>";
        }).join("") + "</tbody></table></div></div>" +
        '<div class="stack">' +
        '<div class="panel"><div class="panel-head"><h2>Views across your portfolio</h2></div><div id="ll-chart"></div></div>' +
        '<div class="panel"><div class="panel-head"><h2>Invoices</h2></div>' +
        (inv.length ? inv.map(function (x) {
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--os-line-soft);font-size:12.5px"><span>' + esc(x.desc) + "<br><span class='muted mono'>" + x.id + '</span></span><span style="display:flex;gap:8px;align-items:center"><b class="mono">' + money(x.amount) + "</b>" +
            (x.status === "open" ? '<button class="btn btn--sm" data-pay="' + x.id + '">Pay</button>' : '<span class="tag tag--good">Paid</span>') + "</span></div>";
        }).join("") : '<div class="empty"><strong>No invoices</strong>Promotions and services appear here.</div>') +
        "</div></div></div>" +
        '<div class="panel" style="margin-top:14px"><div class="panel-head"><h2>Documents</h2><span class="ph-hint">gas safety, EPC, tenancy agreements</span></div>' +
        '<div class="media-drop" id="ll-docs">Drop documents here — stored against your properties, visible to your Halcyon team</div></div>';
      areaChart(document.getElementById("ll-chart"), labels30(),
        [{ name: "Views", color: CH.accent, values: api.analytics.series(30, 5, 120, 40) }], { h: 150, label: "Portfolio views over 30 days" });
      view.querySelectorAll("[data-req]").forEach(function (b) {
        b.addEventListener("click", function () { toast("Change request sent to your property manager", "good"); });
      });
      view.querySelectorAll("[data-pay]").forEach(function (b) {
        b.addEventListener("click", function () {
          api.payments.createCheckout("Invoice " + b.getAttribute("data-pay"), 0).then(function (res) { toast(res.message); });
        });
      });
      document.getElementById("ll-docs").addEventListener("click", function () { toast("Document upload wired to /api/v1/documents in production", "good"); });
    });
  }

  /* ── agent desk ── */
  function vAgentDesk() {
    Promise.all([api.properties.all(), api.leads.list(), api.viewings.list()]).then(function (r) {
      PROP_CACHE = r[0];
      var mine = PROP_CACHE.filter(function (p) { return p.agent === ROLE_AGENT; });
      var leads = r[1].filter(function (l) { return l.agent === ROLE_AGENT; });
      var vws = r[2].filter(function (v) { return v.agent === ROLE_AGENT; });
      var a = S.AGENTS.filter(function (x) { return x.id === ROLE_AGENT; })[0];
      view.innerHTML =
        '<div class="view-head"><h1>' + esc(a.name) + " — " + dayPart() + " desk</h1>" +
        '<div class="vh-actions"><a class="btn" href="#/properties">My properties</a><a class="btn btn--accent" href="#/leads">Pipeline</a></div></div>' +
        '<div class="kpis">' +
        kpi("My properties", mine.length, esc(a.patch), "up") +
        kpi("Live leads", leads.filter(function (l) { return ["completed", "lost"].indexOf(l.stage) < 0; }).length, leads.filter(function (l) { return l.stage === "new"; }).length + " new today", "up") +
        kpi("Viewings this week", vws.length, (vws[0] ? "next " + vws[0].time : "—"), "up") +
        kpi("Response rate", Math.round(a.responseRate * 100) + "%", "~" + a.avgResponseMins + "m median", "up") +
        "</div>" +
        '<div class="grid-2" style="margin-top:14px">' +
        '<div class="panel"><div class="panel-head"><h2>My listing views — 30 days</h2></div><div id="ag-chart"></div></div>' +
        '<div class="panel"><div class="panel-head"><h2>Needs my attention</h2></div><div class="stack" style="gap:10px">' +
        leads.filter(function (l) { return ["new", "viewing-booked", "offer-made"].indexOf(l.stage) >= 0; }).map(function (l) {
          return '<div class="kb-card" style="cursor:default"><span class="kb-name">' + esc(l.name) + '</span><span class="kb-sub">' + esc(propTitle(l.propertyId)) + " — " + esc(l.stage.replace(/-/g, " ")) + "</span>" +
            (l.note ? '<span class="kb-sub" style="font-style:italic">' + esc(l.note) + "</span>" : "") + "</div>";
        }).join("") + "</div></div></div>";
      areaChart(document.getElementById("ag-chart"), labels30(),
        [{ name: "Views", color: CH.accent, values: api.analytics.series(30, 7, 260, 70) }], { h: 170, label: "Listing views over 30 days" });
    });
  }

  /* ── advertising ── */
  function vAds() {
    Promise.all([api.ads.products(), api.ads.campaigns(), api.properties.all()]).then(function (r) {
      var products = r[0], camps = r[1]; PROP_CACHE = r[2];
      var totals = camps.reduce(function (s, c) { s.imp += c.impressions; s.clk += c.clicks; s.enq += c.enquiries; s.rev += c.spend; return s; }, { imp: 0, clk: 0, enq: 0, rev: 0 });
      view.innerHTML =
        '<div class="view-head"><h1>Advertising</h1><span class="tag">internal promotion marketplace</span>' +
        '<div class="vh-actions"><button class="btn btn--accent" id="new-camp">+ New campaign</button></div></div>' +
        '<div class="kpis">' +
        kpi("Impressions · 30d", totals.imp.toLocaleString(), "+18%", "up") +
        kpi("Clicks", totals.clk.toLocaleString(), (totals.imp ? (totals.clk / totals.imp * 100).toFixed(1) : 0) + "% CTR", "up") +
        kpi("Enquiries from ads", totals.enq, (totals.clk ? (totals.enq / totals.clk * 100).toFixed(1) : 0) + "% conversion", "up") +
        kpi("Revenue", money(totals.rev), camps.filter(function (c) { return c.status === "live"; }).length + " live", "up") +
        "</div>" +
        '<div class="grid-2" style="margin-top:14px;grid-template-columns:1.4fr 1fr">' +
        '<div class="panel" style="padding:0"><div class="tbl-scroll"><table class="tbl">' +
        "<thead><tr><th>Property / placement</th><th>Status</th><th>Impr.</th><th>CTR</th><th>Enq.</th><th>Spend</th><th></th></tr></thead><tbody>" +
        camps.map(function (c) {
          var prod = products.filter(function (p) { return p.id === c.product; })[0] || { name: c.product };
          var st = c.status === "live" ? "tag--good" : c.status === "scheduled" ? "tag--blue" : "";
          return "<tr><td><span class='row-title'>" + esc(propTitle(c.propertyId)) + "</span><br><span class='row-sub'>" + esc(prod.name) + " · " + (c.end - c.start) + " days</span></td>" +
            "<td><span class='tag " + st + "'>" + c.status + "</span></td>" +
            "<td class='mono'>" + c.impressions.toLocaleString() + "</td>" +
            "<td class='mono'>" + (c.impressions ? (c.clicks / c.impressions * 100).toFixed(1) + "%" : "—") + "</td>" +
            "<td class='mono'>" + c.enquiries + "</td>" +
            "<td class='mono'>" + money(c.spend) + " / " + money(c.budget) + "</td>" +
            "<td>" + (c.status === "live" ? "<button class='btn btn--sm' data-pause='" + c.id + "'>Pause</button>" : c.status === "paused" ? "<button class='btn btn--sm' data-resume='" + c.id + "'>Resume</button>" : "") + "</td></tr>";
        }).join("") + "</tbody></table></div></div>" +
        '<div class="stack">' +
        '<div class="panel"><div class="panel-head"><h2>Placements & rates</h2><span class="ph-hint">admin-configurable</span></div>' +
        products.map(function (p) {
          return '<div style="display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--os-line-soft);font-size:12.5px"><span><b>' + esc(p.name) + "</b><br><span class='muted'>" + esc(p.desc) + "</span></span><b class='mono' style='white-space:nowrap'>" + money(p.pricePerWeek) + "/wk</b></div>";
        }).join("") + "</div>" +
        '<div class="panel"><div class="panel-head"><h2>Ad clicks — 30 days</h2></div><div id="ads-chart"></div></div>' +
        "</div></div>";
      areaChart(document.getElementById("ads-chart"), labels30(),
        [{ name: "Clicks", color: CH.s1, values: api.analytics.series(30, 13, 90, 35) }], { h: 150, label: "Ad clicks over 30 days" });
      view.querySelectorAll("[data-pause]").forEach(function (b) { b.addEventListener("click", function () { api.ads.update(b.getAttribute("data-pause"), { status: "paused" }).then(function () { toast("Campaign paused"); vAds(); }); }); });
      view.querySelectorAll("[data-resume]").forEach(function (b) { b.addEventListener("click", function () { api.ads.update(b.getAttribute("data-resume"), { status: "live" }).then(function () { toast("Campaign live", "good"); vAds(); }); }); });
      document.getElementById("new-camp").addEventListener("click", function () {
        var mine = role === "landlord" ? PROP_CACHE.filter(function (p) { return p.landlord === ROLE_LANDLORD; }) : PROP_CACHE;
        openDrawer(
          '<div class="d-head"><h2>Promote a property</h2><button class="btn btn--sm" id="d-close">Esc</button></div>' +
          '<div class="d-body">' +
          '<div class="f"><label>Property</label><select id="c-prop">' + mine.map(function (p) { return '<option value="' + p.id + '">' + esc(p.title) + "</option>"; }).join("") + "</select></div>" +
          '<div class="f"><label>Placement</label><select id="c-prod">' + products.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + " — " + money(p.pricePerWeek) + "/wk</option>"; }).join("") + "</select></div>" +
          '<div class="f-row"><div class="f"><label>Starts in (days)</label><input id="c-start" type="number" value="0"></div><div class="f"><label>Duration (weeks)</label><input id="c-weeks" type="number" value="2"></div></div>' +
          '<div class="f"><label>Target area (optional)</label><select id="c-area"><option value="">Everywhere</option>' + S.AREAS.map(function (a) { return "<option>" + a.name + "</option>"; }).join("") + "</select></div>" +
          '<div class="panel" style="background:var(--os-panel-2)"><div class="panel-head" style="margin-bottom:6px"><h2>Order summary</h2></div><p class="mono" id="c-total" style="font-size:20px;font-weight:600">£90</p><p class="muted" style="font-size:11.5px">Billed via Stripe on launch. Impressions, clicks and enquiries tracked automatically.</p></div>' +
          "</div>" +
          '<div class="d-foot"><button class="btn" id="d-cancel">Cancel</button><button class="btn btn--accent" id="c-save">Launch campaign</button></div>');
        function total() {
          var prod = products.filter(function (p) { return p.id === document.getElementById("c-prod").value; })[0];
          var w = +document.getElementById("c-weeks").value || 1;
          document.getElementById("c-total").textContent = money(prod.pricePerWeek * w);
        }
        ["c-prod", "c-weeks"].forEach(function (id) { document.getElementById(id).addEventListener("input", total); });
        total();
        document.getElementById("d-close").addEventListener("click", closeDrawer);
        document.getElementById("d-cancel").addEventListener("click", closeDrawer);
        document.getElementById("c-save").addEventListener("click", function () {
          var prod = products.filter(function (p) { return p.id === document.getElementById("c-prod").value; })[0];
          var w = +document.getElementById("c-weeks").value || 1, start = +document.getElementById("c-start").value || 0;
          api.ads.create({ propertyId: document.getElementById("c-prop").value, product: prod.id, start: start, end: start + w * 7, budget: prod.pricePerWeek * w })
            .then(function () { return api.payments.createCheckout(prod.name, prod.pricePerWeek * w); })
            .then(function (res) { toast("Campaign created — " + res.message, "good"); closeDrawer(); vAds(); });
        });
      });
    });
  }

  /* ── analytics ── */
  function vAnalytics() {
    Promise.all([api.analytics.summary(), api.tours.list()]).then(function (r) {
      var sum = r[0], tours = r[1];
      var tourSessions = tours.reduce(function (s, t) { return s + t.sessions; }, 0);
      var avgCompletion = tours.length ? tours.reduce(function (s, t) { return s + Math.min(0.95, t.completion); }, 0) / tours.length : 0;
      view.innerHTML =
        '<div class="view-head"><h1>Analytics</h1><span class="tag">last 30 days</span></div>' +
        '<div class="kpis">' +
        kpi("Unique visitors", (sum.totals.views * 0.62 | 0).toLocaleString(), "+9.8%", "up") +
        kpi("Searches run", (sum.totals.views * 0.4 | 0).toLocaleString(), "+14.2%", "up") +
        kpi("Tour sessions", tourSessions.toLocaleString(), Math.round(avgCompletion * 100) + "% completion", "up") +
        kpi("Lead conversion", "3.4%", "views → enquiry", "up") +
        "</div>" +
        '<div class="grid-2" style="margin-top:14px;grid-template-columns:1.5fr 1fr">' +
        '<div class="panel"><div class="panel-head"><h2>Visitors vs tour sessions</h2></div><div id="an-main"></div></div>' +
        '<div class="panel"><div class="panel-head"><h2>Popular areas</h2></div><div id="an-areas"></div></div>' +
        "</div>" +
        '<div class="grid-3" style="margin-top:14px">' +
        '<div class="panel"><div class="panel-head"><h2>Traffic source</h2></div><div id="an-src"></div></div>' +
        '<div class="panel"><div class="panel-head"><h2>Devices</h2></div><div id="an-dev"></div></div>' +
        '<div class="panel"><div class="panel-head"><h2>Property types viewed</h2></div><div id="an-types"></div></div>' +
        "</div>" +
        '<div class="panel" style="margin-top:14px"><div class="panel-head"><h2>Property leaderboard</h2><span class="ph-hint">views · saves · enquiries</span></div>' +
        '<div class="tbl-scroll"><table class="tbl"><thead><tr><th>#</th><th>Property</th><th>Views</th><th>Saves</th><th>Enquiries</th><th>View→enquiry</th></tr></thead><tbody>' +
        sum.topProperties.map(function (p, i) {
          return "<tr><td class='mono muted'>" + (i + 1) + "</td><td class='row-title'>" + esc(p.title) + "</td><td class='mono'>" + p.views.toLocaleString() + "</td><td class='mono'>" + p.saves + "</td><td class='mono'>" + p.enquiries + "</td><td class='mono'>" + (p.enquiries / p.views * 100).toFixed(1) + "%</td></tr>";
        }).join("") + "</tbody></table></div></div>";
      areaChart(document.getElementById("an-main"), labels30(),
        [{ name: "Visitors", color: CH.accent, values: api.analytics.series(30, 3, 300, 90) },
         { name: "Tour sessions", color: CH.s1, values: api.analytics.series(30, 17, 40, 18) }], { label: "Visitors and tour sessions" });
      hbars(document.getElementById("an-areas"), [["Ancoats", 2140], ["Didsbury", 1890], ["City Centre", 1720], ["Alderley Edge", 1275], ["Hale", 1130], ["Chorlton", 960]]);
      hbars(document.getElementById("an-src"), sum.sources, { suffix: "%" });
      donut(document.getElementById("an-dev"), sum.devices, [CH.s1, CH.s2, CH.s3], "Sessions by device");
      hbars(document.getElementById("an-types"), [["Apartments", 38], ["Houses", 31], ["Penthouses", 12], ["Lofts", 11], ["Commercial", 8]], { suffix: "%", color: CH.s3 });
    });
  }

  /* ── 360 TOUR STUDIO ── */
  var B360_SITES = ["willow-lane-12", "granby-court-7", "thurnby-rise-3", "kirby-mews-2", "abbey-wharf-14", "oadby-grange", "megacity", "foundry-loft"];
  function vTours() {
    Promise.all([api.tours.list(), api.properties.all()]).then(function (r) {
      var tours = r[0]; PROP_CACHE = r[1];
      view.innerHTML =
        '<div class="view-head"><h1 style="display:flex;gap:10px;align-items:center"><span style="color:var(--os-accent)">◉</span> 360 Tour Studio</h1>' +
        '<span class="tag">powered by billy360 — the engine is never rebuilt, only connected</span>' +
        '<div class="vh-actions"><a class="btn" href="/billy360/studio" target="_blank" rel="noopener">Open billy360 capture studio ↗</a><button class="btn btn--accent" id="new-tour">+ Connect a tour</button></div></div>' +
        '<div class="kpis">' +
        kpi("Published tours", tours.filter(function (t) { return t.status === "published"; }).length, tours.length + " total", "up") +
        kpi("Tour sessions · 30d", tours.reduce(function (s, t) { return s + t.sessions; }, 0).toLocaleString(), "+22%", "up") +
        kpi("Avg completion", Math.round(tours.reduce(function (s, t) { return s + Math.min(0.95, t.completion); }, 0) / (tours.length || 1) * 100) + "%", "scene-to-scene", "up") +
        kpi("Provider", "billy360", "iframe / script / API", "up") +
        "</div>" +
        '<div class="panel" style="margin-top:14px;padding:0"><div class="tbl-scroll"><table class="tbl">' +
        "<thead><tr><th>Property</th><th>Provider tour</th><th>Status</th><th>Sessions</th><th>Completion</th><th style='text-align:right'>Actions</th></tr></thead><tbody>" +
        tours.map(function (t) {
          return "<tr><td class='row-title'>" + esc(propTitle(t.propertyId)) + "</td>" +
            "<td><span class='tag tag--blue'>◉ " + esc(t.tourId) + "</span>" + (t.room ? " <span class='row-sub'>opens at “" + esc(t.room) + "”</span>" : "") + "</td>" +
            "<td><span class='tag " + (t.status === "published" ? "tag--good" : "tag--warn") + "'>" + t.status + "</span></td>" +
            "<td class='mono'>" + t.sessions.toLocaleString() + "</td>" +
            "<td class='mono'>" + Math.round(Math.min(0.95, t.completion) * 100) + "%</td>" +
            "<td style='text-align:right;white-space:nowrap'>" +
            "<button class='btn btn--sm' data-preview='" + t.id + "'>Preview</button> " +
            "<button class='btn btn--sm' data-embed='" + t.id + "'>Embed code</button> " +
            "<button class='btn btn--sm' data-toggle='" + t.id + "'>" + (t.status === "published" ? "Unpublish" : "Publish") + "</button> " +
            "<button class='btn btn--sm btn--danger' data-detach='" + t.id + "'>Detach</button></td></tr>";
        }).join("") + "</tbody></table></div></div>" +
        '<div class="grid-2" style="margin-top:14px">' +
        '<div class="panel"><div class="panel-head"><h2>Tour sessions — 30 days</h2></div><div id="t-chart"></div></div>' +
        '<div class="panel"><div class="panel-head"><h2>How the integration works</h2></div>' +
        '<p class="muted" style="font-size:12.5px;line-height:1.7">Halcyon stores a <b>tour registry</b>: property&nbsp;ID → provider + tour&nbsp;ID + embed&nbsp;URL. The public site asks <span class="mono">api.tours.forProperty(id)</span> and renders whatever comes back — an iframe today, a native SDK tomorrow. Because the registry is provider-shaped (not billy360-shaped), the same “Enter virtual tour” button works on GoDaddy, Squarespace, WordPress, Webflow or any custom host via the drop-in script or plain iframe. Scenes, hotspots, floor plans and branding are authored in the billy360 capture studio — one source of truth, never duplicated here.</p></div></div>';
      areaChart(document.getElementById("t-chart"), labels30(),
        [{ name: "Sessions", color: CH.accent, values: api.analytics.series(30, 17, 40, 18) }], { h: 170, label: "Tour sessions over 30 days" });
      view.querySelectorAll("[data-preview]").forEach(function (b) {
        b.addEventListener("click", function () {
          var t = tours.filter(function (x) { return x.id === b.getAttribute("data-preview"); })[0];
          openDrawer('<div class="d-head"><h2>Preview — ' + esc(t.tourId) + '</h2><button class="btn btn--sm" id="d-close">Esc</button></div>' +
            '<div class="d-body"><iframe src="' + esc(api.tours.launchUrl(t)) + '" style="width:100%;aspect-ratio:4/3;border:0;border-radius:10px;background:#0B0C0E" allow="fullscreen; gyroscope; accelerometer" allowfullscreen title="Tour preview"></iframe>' +
            '<p class="muted" style="font-size:12px">Live from the billy360 platform. Edits made in the capture studio appear here immediately.</p></div>');
          document.getElementById("d-close").addEventListener("click", closeDrawer);
        });
      });
      view.querySelectorAll("[data-embed]").forEach(function (b) {
        b.addEventListener("click", function () {
          var t = tours.filter(function (x) { return x.id === b.getAttribute("data-embed"); })[0];
          var code = api.tours.embedCode(t);
          openDrawer('<div class="d-head"><h2>Embed — ' + esc(propTitle(t.propertyId)) + '</h2><button class="btn btn--sm" id="d-close">Esc</button></div>' +
            '<div class="d-body">' +
            '<div class="f"><label>Drop-in script (recommended — lazy-loads, responsive)</label><div class="code-block" id="code-script">' + esc(code.script) + '</div><button class="btn btn--sm" data-copy="code-script">Copy</button></div>' +
            '<div class="f"><label>Plain iframe (works absolutely anywhere)</label><div class="code-block" id="code-iframe">' + esc(code.iframe) + '</div><button class="btn btn--sm" data-copy="code-iframe">Copy</button></div>' +
            '<p class="muted" style="font-size:12px">Both are host-agnostic: WordPress, Squarespace, Webflow, GoDaddy, Rightmove microsites or hand-written HTML. Authentication for private tours is a signed URL added server-side — nothing changes in the snippet.</p></div>');
          document.getElementById("d-close").addEventListener("click", closeDrawer);
          drawer.querySelectorAll("[data-copy]").forEach(function (cb) {
            cb.addEventListener("click", function () {
              navigator.clipboard.writeText(document.getElementById(cb.getAttribute("data-copy")).textContent).then(function () { toast("Copied", "good"); });
            });
          });
        });
      });
      view.querySelectorAll("[data-toggle]").forEach(function (b) {
        b.addEventListener("click", function () {
          var t = tours.filter(function (x) { return x.id === b.getAttribute("data-toggle"); })[0];
          api.tours.update(t.id, { status: t.status === "published" ? "draft" : "published" }).then(function () { toast("Tour " + (t.status === "published" ? "unpublished" : "published"), "good"); vTours(); });
        });
      });
      view.querySelectorAll("[data-detach]").forEach(function (b) {
        b.addEventListener("click", function () {
          if (confirm("Detach this tour from the property? The billy360 capture itself is untouched."))
            api.tours.detach(b.getAttribute("data-detach")).then(function () { toast("Detached"); vTours(); });
        });
      });
      /* connect-a-tour wizard */
      document.getElementById("new-tour").addEventListener("click", function () {
        openDrawer(
          '<div class="d-head"><h2>Connect a 360 tour</h2><button class="btn btn--sm" id="d-close">Esc</button></div>' +
          '<div class="d-body">' +
          '<div class="f"><label>1 · Property</label><select id="t-prop">' + PROP_CACHE.map(function (p) { return '<option value="' + p.id + '">' + esc(p.title) + "</option>"; }).join("") + "</select></div>" +
          '<div class="f"><label>2 · Provider</label><select id="t-provider"><option value="billy360">billy360 (this platform)</option><option value="custom">Custom embed URL</option></select></div>' +
          '<div class="f" id="t-billy"><label>3 · billy360 site</label><select id="t-site">' + B360_SITES.map(function (s) { return "<option>" + s + "</option>"; }).join("") + "</select></div>" +
          '<div class="f" id="t-custom" hidden><label>3 · Embed URL</label><input id="t-url" placeholder="https://tours.example.com/embed/abc123"></div>' +
          '<div class="f"><label>4 · Open at room (optional)</label><input id="t-room" placeholder="kitchen"></div>' +
          '<div class="f"><label>5 · Preview</label><div id="t-preview" class="empty" style="padding:20px">Pick a site and press preview</div>' +
          '<button class="btn btn--sm" id="t-do-preview" style="margin-top:8px">Preview tour</button></div>' +
          "</div>" +
          '<div class="d-foot"><button class="btn" id="d-cancel">Cancel</button><button class="btn btn--accent" id="t-save">6 · Publish to property page</button></div>');
        document.getElementById("d-close").addEventListener("click", closeDrawer);
        document.getElementById("d-cancel").addEventListener("click", closeDrawer);
        document.getElementById("t-provider").addEventListener("change", function () {
          var isB = this.value === "billy360";
          document.getElementById("t-billy").hidden = !isB;
          document.getElementById("t-custom").hidden = isB;
        });
        document.getElementById("t-do-preview").addEventListener("click", function () {
          var isB = document.getElementById("t-provider").value === "billy360";
          var url = isB ? S.TOURS_BASE + "?site=" + encodeURIComponent(document.getElementById("t-site").value) + "&embed=1"
                        : document.getElementById("t-url").value;
          if (!url) { toast("Provide an embed URL", "bad"); return; }
          document.getElementById("t-preview").outerHTML = '<iframe id="t-preview" src="' + esc(url) + '" style="width:100%;aspect-ratio:16/10;border:0;border-radius:10px;background:#0B0C0E" allow="fullscreen; gyroscope" title="Tour preview"></iframe>';
        });
        document.getElementById("t-save").addEventListener("click", function () {
          var isB = document.getElementById("t-provider").value === "billy360";
          var row = {
            propertyId: document.getElementById("t-prop").value,
            provider: isB ? "billy360" : "custom",
            tourId: isB ? document.getElementById("t-site").value : "custom",
            room: document.getElementById("t-room").value.trim(),
            status: "published"
          };
          if (!isB) {
            if (!document.getElementById("t-url").value) { toast("Provide an embed URL", "bad"); return; }
            row.embedUrl = document.getElementById("t-url").value;
          }
          api.tours.attach(row)
            .then(function () { return api.properties.update(row.propertyId, { tour: row.tourId, tourRoom: row.room }); })
            .then(function () { toast("Tour live on the property page", "good"); closeDrawer(); vTours(); });
        });
      });
    });
  }

  /* ── CMS / website builder ── */
  function vCMS() {
    Promise.all([api.cms.sections(), api.cms.copy(), api.properties.all()]).then(function (r) {
      var sections = r[0], copy = r[1]; PROP_CACHE = r[2];
      view.innerHTML =
        '<div class="view-head"><h1>Content Studio</h1><span class="tag">edits go live on the public site instantly</span>' +
        '<div class="vh-actions"><a class="btn" href="../" target="_blank" rel="noopener">Preview site ↗</a></div></div>' +
        '<div class="grid-2" style="grid-template-columns:1.1fr .9fr">' +
        '<div class="panel"><div class="panel-head"><h2>Homepage builder</h2><span class="ph-hint">drag to reorder · toggle to hide</span></div>' +
        '<div class="stack" style="gap:8px" id="builder">' +
        sections.map(function (s) {
          return '<div class="builder-row" draggable="' + (s.locked ? "false" : "true") + '" data-sec="' + s.id + '">' +
            '<span class="br-grip">⋮⋮</span><span class="br-name">' + esc(s.name) + "</span>" +
            (s.locked ? '<span class="tag">anchored</span>' : "") +
            '<span class="br-actions">' +
            '<button class="btn btn--sm" data-vis="' + s.id + '">' + (s.visible !== false ? "Hide" : "Show") + "</button></span></div>";
        }).join("") + "</div>" +
        '<button class="btn" id="builder-save" style="margin-top:12px">Save layout</button></div>' +
        '<div class="stack">' +
        '<div class="panel"><div class="panel-head"><h2>Hero copy</h2></div><div class="stack">' +
        '<div class="f"><label>Kicker</label><input id="cms-kicker" value="' + esc(copy.heroKicker) + '"></div>' +
        '<div class="f"><label>Headline (| = italic break)</label><input id="cms-title" value="' + esc(copy.heroTitle) + '"></div>' +
        '<div class="f"><label>Property of the Week</label><select id="cms-potw">' +
        PROP_CACHE.map(function (p) { return '<option value="' + p.id + '"' + (copy.potwId === p.id ? " selected" : "") + ">" + esc(p.title) + "</option>"; }).join("") + "</select></div>" +
        '<div class="f"><label>Valuation headline</label><input id="cms-val" value="' + esc(copy.valuationTitle) + '"></div>' +
        '<button class="btn btn--accent" id="cms-save">Publish copy</button></div></div>' +
        '<div class="panel"><div class="panel-head"><h2>Everything else editable</h2></div><p class="muted" style="font-size:12.5px;line-height:1.7">Areas, developments, testimonials, FAQs and promotional banners all live in the same content API — each is a list the studio edits and the site renders. Sections can be added, duplicated, hidden or scheduled; the registry is ready for full drag-and-drop page building.</p></div>' +
        "</div></div>";
      /* builder drag */
      var order = sections.map(function (s) { return s.id; });
      var dragging = null;
      var builder = document.getElementById("builder");
      builder.querySelectorAll(".builder-row[draggable=true]").forEach(function (row) {
        row.addEventListener("dragstart", function () { dragging = row; row.classList.add("is-drag"); });
        row.addEventListener("dragend", function () { row.classList.remove("is-drag"); });
      });
      builder.addEventListener("dragover", function (e) {
        e.preventDefault();
        var over = e.target.closest(".builder-row");
        if (!over || over === dragging || over.getAttribute("draggable") === "false") return;
        var rect = over.getBoundingClientRect();
        builder.insertBefore(dragging, e.clientY < rect.top + rect.height / 2 ? over : over.nextSibling);
      });
      builder.addEventListener("click", function (e) {
        var b = e.target.closest("[data-vis]"); if (!b) return;
        var s = sections.filter(function (x) { return x.id === b.getAttribute("data-vis"); })[0];
        s.visible = s.visible === false;
        b.textContent = s.visible ? "Hide" : "Show";
        toast(s.name + (s.visible ? " shown" : " hidden"));
      });
      document.getElementById("builder-save").addEventListener("click", function () {
        var rows = Array.prototype.map.call(builder.querySelectorAll(".builder-row"), function (row) {
          var s = sections.filter(function (x) { return x.id === row.getAttribute("data-sec"); })[0];
          return { id: s.id, visible: s.visible !== false };
        });
        api.cms.setSections(rows).then(function () { toast("Layout published to the homepage", "good"); });
      });
      document.getElementById("cms-save").addEventListener("click", function () {
        api.cms.setCopy({
          heroKicker: document.getElementById("cms-kicker").value,
          heroTitle: document.getElementById("cms-title").value,
          potwId: document.getElementById("cms-potw").value,
          valuationTitle: document.getElementById("cms-val").value
        }).then(function () { toast("Copy published", "good"); });
      });
    });
  }

  /* ── payments ── */
  function vPayments() {
    api.payments.invoices().then(function (inv) {
      view.innerHTML =
        '<div class="view-head"><h1>Payments</h1><span class="tag">Stripe-ready — secrets live in the Worker, never here</span></div>' +
        '<div class="kpis">' +
        kpi("Collected · 30d", money(inv.filter(function (x) { return x.status === "paid"; }).reduce(function (s, x) { return s + x.amount; }, 0)), "promotions & services", "up") +
        kpi("Outstanding", money(inv.filter(function (x) { return x.status === "open"; }).reduce(function (s, x) { return s + x.amount; }, 0)), inv.filter(function (x) { return x.status === "open"; }).length + " invoices", "down") +
        kpi("Products", "6 placements", "+ valuations, services", "up") +
        kpi("Next payout", "Friday", "via Stripe", "up") +
        "</div>" +
        '<div class="panel" style="margin-top:14px;padding:0"><div class="tbl-scroll"><table class="tbl">' +
        "<thead><tr><th>Invoice</th><th>Billed to</th><th>Description</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>" +
        inv.map(function (x) {
          return "<tr><td class='mono'>" + x.id + "</td><td>" + esc(x.to) + "</td><td>" + esc(x.desc) + "</td><td class='mono'>" + money(x.amount) + "</td>" +
            "<td><span class='tag " + (x.status === "paid" ? "tag--good" : "tag--warn") + "'>" + x.status + "</span></td>" +
            "<td>" + (x.status === "open" ? "<button class='btn btn--sm' data-remind='" + x.id + "'>Send reminder</button>" : "") + "</td></tr>";
        }).join("") + "</tbody></table></div></div>" +
        '<div class="panel" style="margin-top:14px"><div class="panel-head"><h2>Architecture</h2></div><p class="muted" style="font-size:12.5px;line-height:1.7">Checkout calls <span class="mono">POST /api/v1/payments/checkout</span> on the Cloudflare Worker, which creates a Stripe session with <span class="mono">STRIPE_SECRET_KEY</span> from environment secrets and returns only the redirect URL. Webhooks reconcile invoices. The front end never sees a key — this screen is wired to that contract already.</p></div>';
      view.querySelectorAll("[data-remind]").forEach(function (b) {
        b.addEventListener("click", function () { toast("Reminder queued", "good"); });
      });
    });
  }

  /* ── settings ── */
  function vSettings() {
    var PERMS = ["View properties", "Edit properties", "Publish", "Leads & CRM", "Viewings", "Advertising", "Analytics", "CMS", "360 Studio", "Payments", "Settings"];
    var ROLES = [["Admin", PERMS.map(function () { return true; })],
                 ["Agent", [true, true, false, true, true, false, true, false, false, false, false]],
                 ["Landlord", [true, false, false, false, true, true, true, false, false, true, false]],
                 ["Editor", [true, false, false, false, false, false, false, true, true, false, false]]];
    view.innerHTML =
      '<div class="view-head"><h1>Settings</h1></div>' +
      '<div class="grid-2">' +
      '<div class="panel"><div class="panel-head"><h2>Roles & permissions</h2><span class="ph-hint">enforced by the API layer per token</span></div>' +
      '<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Capability</th>' + ROLES.map(function (r) { return "<th>" + r[0] + "</th>"; }).join("") + "</tr></thead><tbody>" +
      PERMS.map(function (p, i) {
        return "<tr><td>" + p + "</td>" + ROLES.map(function (r) {
          return "<td><input type='checkbox'" + (r[1][i] ? " checked" : "") + (r[0] === "Admin" ? " disabled" : "") + " style='accent-color:var(--os-accent)'></td>";
        }).join("") + "</tr>";
      }).join("") + "</tbody></table></div></div>" +
      '<div class="stack">' +
      '<div class="panel"><div class="panel-head"><h2>Security posture</h2></div><ul class="muted" style="font-size:12.5px;line-height:2;list-style:none;padding:0">' +
      ["Role-based access on every API route", "Input validation server-side (client checks are UX only)", "Rate limiting at the Worker edge", "Uploads: type + size validation, EXIF strip, AV scan", "All output HTML-escaped — same esc() used across this studio", "Secrets in environment vars, never in the bundle", "CSRF: SameSite cookies + token on mutating routes"].map(function (x) { return "<li>✓ " + x + "</li>"; }).join("") + "</ul></div>" +
      '<div class="panel"><div class="panel-head"><h2>Demo data</h2></div><p class="muted" style="font-size:12.5px;margin-bottom:12px">Everything you change in the studio persists in this browser. Reset to the seed state at any time.</p><button class="btn btn--danger" id="reset-data">Reset all demo data</button></div>' +
      "</div></div>";
    document.getElementById("reset-data").addEventListener("click", function () {
      if (confirm("Reset all demo data? Your edits, leads and campaigns will be cleared.")) api.reset();
    });
  }

  /* ═══ command palette ═══ */
  var cmdk = document.getElementById("cmdk"), ckInput = document.getElementById("ck-input"), ckList = document.getElementById("ck-list");
  function cmdkOpen() { cmdk.classList.add("is-open"); ckInput.value = ""; ckRender(""); ckInput.focus(); }
  function cmdkClose() { cmdk.classList.remove("is-open"); }
  document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); cmdkOpen(); }
  });
  document.getElementById("jump").addEventListener("focus", function () { this.blur(); cmdkOpen(); });
  cmdk.addEventListener("click", function (e) { if (e.target === cmdk) cmdkClose(); });
  function ckRender(q) {
    var items = [];
    NAV.admin.forEach(function (n) { if (n[1]) items.push({ label: n[1], k: "Section", go: "#/" + n[0] }); });
    PROP_CACHE.forEach(function (p) { items.push({ label: p.title, k: "Property", go: "edit:" + p.id }); });
    items.push({ label: "View public site", k: "Link", go: "../" });
    var ql = q.toLowerCase();
    var hits = items.filter(function (i) { return i.label.toLowerCase().indexOf(ql) >= 0; }).slice(0, 9);
    ckList.innerHTML = hits.map(function (h, i) {
      return '<div class="ck-item' + (i === 0 ? " is-hot" : "") + '" data-go="' + h.go + '">' + esc(h.label) + '<span class="ck-k">' + h.k + "</span></div>";
    }).join("") || '<div class="ck-item">Nothing found</div>';
  }
  ckInput.addEventListener("input", function () { ckRender(this.value); });
  ckInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { var hot = ckList.querySelector(".is-hot") || ckList.querySelector(".ck-item[data-go]"); if (hot) ckGo(hot.getAttribute("data-go")); }
  });
  ckList.addEventListener("click", function (e) { var it = e.target.closest("[data-go]"); if (it) ckGo(it.getAttribute("data-go")); });
  function ckGo(go) {
    cmdkClose();
    if (!go) return;
    if (go.indexOf("edit:") === 0) {
      var p = PROP_CACHE.filter(function (x) { return x.id === go.slice(5); })[0];
      location.hash = "#/properties"; setTimeout(function () { if (p) editProperty(p); }, 120);
    } else if (go.indexOf("#/") === 0) location.hash = go;
    else window.open(go, "_blank");
  }

  /* ═══ router ═══ */
  var ROUTES = {
    dashboard: ["Dashboard", vDashboard], analytics: ["Analytics", vAnalytics],
    properties: ["Properties", vProperties], tours: ["360 Tour Studio", vTours],
    leads: ["Leads / CRM", vLeads], viewings: ["Viewings", vViewings],
    agents: ["Agents", vAgents], landlords: ["Landlords", vLandlords],
    ads: ["Advertising", vAds], payments: ["Payments", vPayments],
    cms: ["Content Studio", vCMS], settings: ["Settings", vSettings],
    agent: ["Agent desk", vAgentDesk], landlord: ["Landlord portal", vLandlordPortal]
  };
  function route() {
    var key = location.hash.replace("#/", "") || defaultRoute();
    var r = ROUTES[key] || ROUTES[defaultRoute()];
    document.getElementById("crumb").innerHTML = "Halcyon Studio <span>/ " + r[0] + "</span>";
    renderNav();
    document.body.classList.remove("side-open");
    view.innerHTML = '<div class="empty" style="border:0"><strong>Loading…</strong></div>';
    r[1]();
    api.leads.list().then(function (l) {
      var live = l.filter(function (x) { return x.stage === "new"; }).length;
      var b = document.getElementById("nav-leads"); if (b) b.textContent = live;
    });
  }
  addEventListener("hashchange", route);
  api.properties.all().then(function (rows) { PROP_CACHE = rows; route(); });
})();
