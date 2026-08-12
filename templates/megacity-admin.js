/* ════════════════════════════════════════════════════════════════
   MEGACITY STUDIO — the site's back office
   Edits listings, business details and calculator rates. Saves to
   this browser (localStorage) where they override the shipped data
   everywhere on the site — the same model as the billy360 Studio.
   Publish exports the content file that makes edits permanent.

   Front-of-house lock only: the passcode keeps the tools away from
   visitors, not from someone reading the JavaScript. Production
   would sit behind the CRM's own login.  Passcode: megacity2026
   ════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var HASH = "eddf17ed";                       /* fnv1a("megacity:" + passcode) */
  var KEY_DATA = "megacity:data", KEY_RATES = "megacity:rates", KEY_AUTH = "megacity:studio";

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
  function fnv1a(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h.toString(16);
  }

  /* ── the working copy (starts from shipped data + any prior save) ── */
  var D = window.MEGACITY, R = window.MEGACITY_RATES;
  if (!D || !R) return;
  var state = {
    biz: clone(D.biz),
    properties: clone(D.properties),
    rates: {
      asOf: R.asOf, houseFactor: R.houseFactor,
      councilTaxBandD: clone(R.councilTaxBandD),
      rents: clone(R.rents),
      mortgage: clone(R.mortgage),
      affordability: clone(R.affordability)
    }
  };
  var selected = 0;
  var STATUS_LABEL = { "available": "Available", "new": "New", "let-agreed": "Let agreed" };

  /* ── autosave ─────────────────────────────────────────────────── */
  var saveTimer = null;
  function persist() {
    state.properties.forEach(function (p) {
      p.price = Math.round(+p.price || 0);
      p.priceLabel = "£" + p.price.toLocaleString("en-GB") + " pcm";
      p.statusLabel = STATUS_LABEL[p.status] || p.status;
    });
    var digits = String(state.biz.phone || "").replace(/[^0-9]/g, "");
    if (digits.charAt(0) === "0") state.biz.phoneHref = "tel:+44" + digits.slice(1);
    try {
      localStorage.setItem(KEY_DATA, JSON.stringify({ biz: state.biz, properties: state.properties }));
      localStorage.setItem(KEY_RATES, JSON.stringify(state.rates));
    } catch (e) {
      alert("This browser's storage is full — uploaded photos take room. Remove a photo or two (or use image URLs for some rooms), then it will save again.");
      var chipErr = $("#mcaSaved span");
      if (chipErr) chipErr.textContent = "Not saved — storage full";
      return;
    }
    var chip = $("#mcaSaved span");
    if (chip) { chip.textContent = "Saved"; }
    var json = $("#mcaJson");
    if (json) json.value = JSON.stringify({ biz: state.biz, properties: state.properties, rates: state.rates }, null, 2);
  }
  function queueSave() {
    var chip = $("#mcaSaved span");
    if (chip) chip.textContent = "Saving…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 600);
  }

  /* generic field builder: label + control bound to a getter/setter path */
  function field(label, ctrl, span) {
    return '<div class="field ' + (span || "") + '"><label>' + label + "</label>" + ctrl + "</div>";
  }
  function inp(path, value, type) {
    return '<input data-path="' + path + '" type="' + (type || "text") + '" value="' + esc(value) + '"' +
      (type === "number" ? ' inputmode="decimal" step="any"' : "") + ">";
  }
  function area(path, value) {
    return '<textarea data-path="' + path + '">' + esc(value) + "</textarea>";
  }
  function sel(path, value, options) {
    return '<select data-path="' + path + '">' + options.map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === value ? " selected" : "") + ">" + o[1] + "</option>";
    }).join("") + "</select>";
  }

  /* resolve "a.b.c" against an object */
  function setPath(root, path, value) {
    var parts = path.split("."), o = root;
    for (var i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = value;
  }

  /* ── properties pane ──────────────────────────────────────────── */
  function renderPropList() {
    $("#mcaPropList").innerHTML = state.properties.map(function (p, i) {
      return '<button type="button" data-i="' + i + '"' + (i === selected ? ' class="is-on"' : "") + ">" +
        "<b>" + esc(p.name) + "</b><span>" + esc(p.area) + " · £" + (+p.price).toLocaleString("en-GB") +
        " · " + (STATUS_LABEL[p.status] || p.status) + "</span></button>";
    }).join("");
  }
  function renderPropForm() {
    var p = state.properties[selected];
    if (!p) { $("#mcaPropForm").innerHTML = "<p class='mca-sub'>No listings — add one.</p>"; return; }
    var base = "properties." + selected + ".";
    $("#mcaPropForm").innerHTML =
      field("Name", inp(base + "name", p.name)) +
      field("Slug / link id", inp(base + "id", p.id)) +
      field("Status", sel(base + "status", p.status, [["available", "Available"], ["new", "New"], ["let-agreed", "Let agreed"]])) +
      field("Area", inp(base + "area", p.area)) +
      field("Postcode district", inp(base + "postcode", p.postcode)) +
      field("Rent £ pcm", inp(base + "price", p.price, "number")) +
      field("Bedrooms", inp(base + "beds", p.beds, "number")) +
      field("Bathrooms", inp(base + "baths", p.baths, "number")) +
      field("Property type", inp(base + "type", p.type)) +
      field("Furnishing", inp(base + "furnishing", p.furnishing)) +
      field("Availability", inp(base + "availableFrom", p.availableFrom)) +
      field("Deposit", inp(base + "deposit", p.deposit)) +
      field("EPC", inp(base + "epc", p.epc)) +
      field("Council tax band", inp(base + "councilTaxBand", p.councilTaxBand)) +
      field("360° tour id (blank = none)", inp(base + "tour", p.tour || "")) +
      '<div class="field f-3"><label>Cover photo — paste a URL or upload</label>' +
      '<div class="mca-uprow"><img class="mca-thumb" alt="" src="' + esc(p.cover) + '">' +
      inp(base + "cover", p.cover) +
      '<button type="button" class="btn btn--ghost mca-up" data-upload="' + base + 'cover">Upload</button></div></div>' +
      field("Card summary", area(base + "summary", p.summary), "f-3") +
      field("Description — blank line between paragraphs", area(base + "descriptionText", (p.description || []).join("\n\n")), "f-3") +
      field("Key features — one per line", area(base + "featuresText", (p.features || []).join("\n")), "f-3") +
      '<div class="mca-story"><label style="font:600 9.5px/1 var(--ff-body);letter-spacing:.24em;text-transform:uppercase;color:var(--ink-2)">Room-by-room story</label>' +
      (p.story || []).map(function (s, si) {
        var sb = base + "story." + si + ".";
        return '<div class="mca-story-row">' +
          '<div class="mca-uprow" style="min-width:0"><img class="mca-thumb" alt="" src="' + esc(s.src) + '">' +
          '<input data-path="' + sb + 'room" value="' + esc(s.room) + '" placeholder="Room" aria-label="Room"></div>' +
          '<input data-path="' + sb + 'caption" value="' + esc(s.caption) + '" placeholder="Caption" aria-label="Caption">' +
          '<div class="mca-uprow"><input data-path="' + sb + 'src" value="' + esc(s.src) + '" placeholder="Image URL" aria-label="Image URL">' +
          '<button type="button" class="mca-up" data-upload="' + sb + 'src">Upload</button></div>' +
          '<button type="button" data-story-del="' + si + '" aria-label="Remove room">×</button></div>';
      }).join("") +
      '<button type="button" class="btn btn--ghost" data-story-add style="align-self:start;padding:10px 16px">＋ Add room</button></div>' +
      '<div class="mca-actions">' +
      '<button type="button" class="btn btn--ghost" data-prop-dup>Duplicate</button>' +
      '<button type="button" class="btn btn--ghost" data-prop-del style="color:#8a3f3f;border-color:#8a3f3f">Delete listing</button></div>';
  }

  /* ── business pane ────────────────────────────────────────────── */
  function renderBiz() {
    var b = state.biz;
    $("#mcaBizForm").innerHTML =
      field("Company name — large", inp("biz.brandName", b.brandName || "Megacity"), "f-2") +
      field("Company name — small line", inp("biz.brandSub", b.brandSub || "Properties")) +
      field("Strapline", inp("biz.strap", b.strap), "f-3") +
      field("Phone", inp("biz.phone", b.phone)) +
      field("Email", inp("biz.email", b.email, "email")) +
      field("Company number", inp("biz.companyNo", b.companyNo)) +
      field("Office address", inp("biz.office", b.office), "f-3") +
      field("Google Maps link", inp("biz.mapsHref", b.mapsHref), "f-3") +
      field("Facebook", inp("biz.facebook", b.facebook), "f-2") +
      field("LinkedIn", inp("biz.linkedin", b.linkedin));
  }

  /* ── rates pane ───────────────────────────────────────────────── */
  function renderRates() {
    var r = state.rates;
    var councils = Object.keys(r.councilTaxBandD);
    var rentAreas = Object.keys(r.rents);
    $("#mcaRatesForm").innerHTML =
      field("Figures label shown on the Tools page", inp("rates.asOf", r.asOf), "f-3") +
      councils.map(function (c) {
        return field(c + " — Band D £/yr", inp("rates.councilTaxBandD." + c, r.councilTaxBandD[c], "number"));
      }).join("") +
      field("Typical residential rate %", inp("rates.mortgage.typicalResidential", r.mortgage.typicalResidential, "number")) +
      field("Typical buy-to-let rate %", inp("rates.mortgage.typicalBtl", r.mortgage.typicalBtl, "number")) +
      field("Bank base rate %", inp("rates.mortgage.baseRate", r.mortgage.baseRate, "number")) +
      field("Income multiple (referencing)", inp("rates.affordability.incomeMultiple", r.affordability.incomeMultiple, "number")) +
      field("Guarantor multiple", inp("rates.affordability.guarantorMultiple", r.affordability.guarantorMultiple, "number")) +
      field("House uplift factor", inp("rates.houseFactor", r.houseFactor, "number")) +
      '<div class="rates-grid"><span class="rg-h">Typical rents £ pcm</span><span class="rg-h">1 bed</span><span class="rg-h">2 bed</span><span class="rg-h">3 bed</span><span class="rg-h">4+ bed</span>' +
      rentAreas.map(function (a) {
        return '<span class="rg-h" style="letter-spacing:.06em;text-transform:none;font-size:13px;color:var(--ink)">' + a + "</span>" +
          [1, 2, 3, 4].map(function (b) {
            return '<input data-path="rates.rents.' + a + "." + b + '" type="number" inputmode="numeric" value="' + r.rents[a][b] + '">';
          }).join("");
      }).join("") + "</div>";
  }

  /* ── photo uploads ────────────────────────────────────────────────
     Files never leave the machine: each photo is decoded, downscaled
     and recompressed right here (max 1400px, JPEG), then stored with
     the listing — the same approach the billy360 Studio takes. */
  var pendingUploadPath = null;
  function uploadInput() {
    var f = $("#mcaFile");
    if (f) return f;
    f = document.createElement("input");
    f.type = "file"; f.accept = "image/*"; f.id = "mcaFile"; f.hidden = true;
    document.body.appendChild(f);
    f.addEventListener("change", function () {
      var file = f.files && f.files[0];
      f.value = "";
      if (!file || !pendingUploadPath) return;
      var img = new Image();
      img.onload = function () {
        var MAX = 1400;
        var scale = Math.min(1, MAX / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        var dataUrl = c.toDataURL("image/jpeg", 0.78);
        URL.revokeObjectURL(img.src);
        setPath(state, pendingUploadPath, dataUrl);
        pendingUploadPath = null;
        renderPropForm();
        queueSave();
      };
      img.onerror = function () { alert("That file doesn't look like an image this browser can read."); };
      img.src = URL.createObjectURL(file);
    });
    return f;
  }

  /* ── events ───────────────────────────────────────────────────── */
  function bind() {
    /* photo uploads — any Upload button routes through one file picker */
    document.addEventListener("click", function (e) {
      var up = e.target.closest && e.target.closest("[data-upload]");
      if (!up) return;
      pendingUploadPath = up.getAttribute("data-upload");
      uploadInput().click();
    });
    /* editor forms never navigate — Enter just blurs politely */
    document.addEventListener("submit", function (e) {
      if (e.target.closest(".mca-form")) e.preventDefault();
    });
    /* every input writes straight into the working copy */
    document.addEventListener("input", function (e) {
      var path = e.target.getAttribute && e.target.getAttribute("data-path");
      if (!path) return;
      var v = e.target.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value;
      if (/descriptionText$/.test(path)) {
        setPath(state, path.replace("descriptionText", "description"),
          String(e.target.value).split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean));
      } else if (/featuresText$/.test(path)) {
        setPath(state, path.replace("featuresText", "features"),
          String(e.target.value).split("\n").map(function (s) { return s.trim(); }).filter(Boolean));
      } else {
        setPath(state, path, v);
      }
      if (path.indexOf("properties." + selected + ".name") === 0 ||
          path.indexOf("properties." + selected + ".price") === 0 ||
          path.indexOf("properties." + selected + ".status") === 0) renderPropList();
      queueSave();
    });
    document.addEventListener("change", function (e) {
      if (e.target.getAttribute && e.target.getAttribute("data-path")) queueSave();
    });

    $("#mcaPropList").addEventListener("click", function (e) {
      var b = e.target.closest("[data-i]");
      if (!b) return;
      selected = +b.getAttribute("data-i");
      renderPropList(); renderPropForm();
    });
    $("#mcaPropNew").addEventListener("click", function () {
      var n = clone(state.properties[0] || {});
      n.id = "new-listing-" + (state.properties.length + 1);
      n.name = "New listing"; n.status = "new"; n.tour = null;
      state.properties.push(n);
      selected = state.properties.length - 1;
      renderPropList(); renderPropForm(); queueSave();
    });
    $("#mcaPropForm").addEventListener("click", function (e) {
      if (e.target.closest("[data-prop-dup]")) {
        var c = clone(state.properties[selected]);
        c.id += "-copy"; c.name += " (copy)";
        state.properties.splice(selected + 1, 0, c);
        selected++; renderPropList(); renderPropForm(); queueSave();
      }
      if (e.target.closest("[data-prop-del]")) {
        if (!confirm("Delete “" + state.properties[selected].name + "”? This removes it from the whole site.")) return;
        state.properties.splice(selected, 1);
        selected = Math.max(0, selected - 1);
        renderPropList(); renderPropForm(); queueSave();
      }
      var del = e.target.closest("[data-story-del]");
      if (del) {
        state.properties[selected].story.splice(+del.getAttribute("data-story-del"), 1);
        renderPropForm(); queueSave();
      }
      if (e.target.closest("[data-story-add]")) {
        (state.properties[selected].story = state.properties[selected].story || [])
          .push({ room: "Room", caption: "", src: "" });
        renderPropForm(); queueSave();
      }
    });

    /* pane switcher */
    $$(".mca-nav button").forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".mca-nav button").forEach(function (x) { x.classList.remove("is-on"); });
        $$(".mca-pane").forEach(function (x) { x.classList.remove("is-on"); });
        b.classList.add("is-on");
        $("#pane-" + b.getAttribute("data-pane")).classList.add("is-on");
      });
    });

    /* publish */
    $("#mcaExport").addEventListener("click", function () {
      var blob = new Blob([JSON.stringify({ biz: state.biz, properties: state.properties, rates: state.rates }, null, 2)],
        { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "megacity-content.json";
      a.click();
      URL.revokeObjectURL(a.href);
    });
    $("#mcaCopy").addEventListener("click", function () {
      var t = $("#mcaJson");
      t.select();
      try { navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand("copy"); }
    });
    $("#mcaReset").addEventListener("click", function () {
      if (!confirm("Reset everything to the shipped site data? Your Studio edits on this browser will be lost.")) return;
      localStorage.removeItem(KEY_DATA);
      localStorage.removeItem(KEY_RATES);
      location.reload();
    });

    $("#mcaSignOut").addEventListener("click", function () {
      localStorage.removeItem(KEY_AUTH);
      location.reload();
    });
  }

  /* ── gate ─────────────────────────────────────────────────────── */
  function openStudio() {
    $("#mcaGate").classList.remove("is-open");
    $("#mcaGate").style.display = "none";
    $("#mcaApp").hidden = false;
    renderPropList(); renderPropForm(); renderBiz(); renderRates();
    bind(); persist();
  }
  function boot() {
    document.documentElement.classList.remove("no-js");
    var q = new URLSearchParams(location.search);
    if (q.get("code") && fnv1a("megacity:" + q.get("code")) === HASH) {
      try { localStorage.setItem(KEY_AUTH, "1"); } catch (e) {}
      history.replaceState(null, "", location.pathname);
    }
    var authed = false;
    try { authed = localStorage.getItem(KEY_AUTH) === "1"; } catch (e) {}
    if (authed) { openStudio(); return; }
    $("#mcaGateForm").addEventListener("submit", function (e) {
      e.preventDefault();
      if (fnv1a("megacity:" + $("#mcaCode").value) === HASH) {
        try { localStorage.setItem(KEY_AUTH, "1"); } catch (err) {}
        openStudio();
      } else {
        $("#mcaGateErr").hidden = false;
      }
    });
    $("#mcaCode").focus();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
