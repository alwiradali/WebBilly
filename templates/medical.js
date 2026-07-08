/* CarePoint Clinic — bespoke medical: interactive service switcher +
   a 4-step appointment booking wizard (service → clinician → time →
   details) with live summary and confirmation. Reveals + mobile nav. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  document.addEventListener("DOMContentLoaded", function () {
    var nav = $("#nav"), links = $("#navLinks"), burger = $("#burger");
    var onScroll = function () { nav.classList.toggle("stuck", scrollY > 20); };
    onScroll(); addEventListener("scroll", onScroll, { passive: true });
    burger.addEventListener("click", function () { var o = links.classList.toggle("open"); burger.setAttribute("aria-expanded", o); });
    $$("#navLinks a").forEach(function (a) { a.addEventListener("click", function () { links.classList.remove("open"); }); });

    if ("IntersectionObserver" in window && !reduce) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.14, rootMargin: "0px 0px -6% 0px" });
      $$(".rv").forEach(function (el) { io.observe(el); });
    } else $$(".rv").forEach(function (el) { el.classList.add("in"); });

    /* ---- service switcher ---- */
    var services = {
      gp:     { title: "General Practice", from: "Consultations from £75", tab: "General Practice",
        desc: "Same-day consultations, repeat prescriptions and long-term condition reviews with a GP who knows your history.",
        list: ["Same-day and pre-bookable appointments", "Repeat prescriptions & medication reviews", "Long-term condition management", "Referrals to our in-house specialists"] },
      screen: { title: "Health Screening", from: "Screening from £180", tab: "Health Screening",
        desc: "Comprehensive check-ups, blood tests and heart, cholesterol and diabetes screening with clear, unhurried results.",
        list: ["Full blood panel & analysis", "Heart, cholesterol & diabetes screening", "Blood pressure & lifestyle review", "Written report with plain-language advice"] },
      physio: { title: "Physiotherapy", from: "Sessions from £60", tab: "Physiotherapy",
        desc: "Hands-on assessment and tailored recovery plans for back pain, sports injuries and post-surgery rehabilitation.",
        list: ["45-minute assessment & treatment", "Personalised home exercise plan", "Sports injury & post-surgery rehab", "Direct-access, no referral needed"] },
      derm:   { title: "Dermatology", from: "Skin checks from £120", tab: "Dermatology",
        desc: "Skin checks, mole mapping and treatment for eczema, acne and everyday skin concerns from a specialist team.",
        list: ["Full-body mole mapping", "Suspicious lesion assessment", "Eczema, acne & rosacea treatment", "Minor procedures on site"] },
    };
    var tabs = $$("#svcTabs .svc-tab");
    function setService(key) {
      var s = services[key]; if (!s) return;
      tabs.forEach(function (t) { t.classList.toggle("on", t.getAttribute("data-s") === key); });
      $("#svcTitle").textContent = s.title;
      $("#svcFrom").textContent = s.from;
      $("#svcDesc").textContent = s.desc;
      $("#svcList").innerHTML = s.list.map(function (i) { return '<li><span class="chk">✓</span>' + i + "</li>"; }).join("");
      $("#svcBook").textContent = "Book " + s.title;
      $("#svcBook").dataset.svc = s.tab;
    }
    $("#svcTabs").addEventListener("click", function (e) { var b = e.target.closest(".svc-tab"); if (b) setService(b.getAttribute("data-s")); });
    setService("gp");

    /* ---- booking wizard ---- */
    var state = { service: null, clinician: "First available", day: null, dayLabel: null, time: null };
    var idx = 0, N = 4;
    var stepEls = $$("#steps .step"), panels = $$("#panels .panel");
    var bkBack = $("#bkBack"), bkNext = $("#bkNext"), actions = $("#bkActions"), done = $("#bookDone");

    // build the next 6 open days
    var dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var daysWrap = $("#days"), d = new Date(), html = "";
    for (var k = 0; k < 6; k++) {
      var dt = new Date(d.getFullYear(), d.getMonth(), d.getDate() + k);
      var label = (k === 0 ? "Today" : dow[dt.getDay()]) + ", " + dt.getDate() + " " + mon[dt.getMonth()];
      html += '<button class="day" data-v="' + label + '"><span class="dow">' + (k === 0 ? "Today" : dow[dt.getDay()]) +
        '</span><span class="dnum">' + dt.getDate() + '</span></button>';
    }
    daysWrap.innerHTML = html;

    var times = ["09:00", "09:45", "10:30", "11:15", "13:45", "14:30", "15:15", "16:30", "17:45"];
    $("#slots").innerHTML = times.map(function (t) { return '<button class="slot" data-v="' + t + '">' + t + "</button>"; }).join("");

    function selectIn(container, btn, key, labelKey) {
      $$(".opt, .day, .slot", container).forEach(function (o) { o.classList.remove("sel"); });
      btn.classList.add("sel");
      state[key] = btn.getAttribute("data-v");
      if (labelKey) state[labelKey] = btn.getAttribute("data-v");
      refresh();
    }
    $("#optService").addEventListener("click", function (e) { var b = e.target.closest(".opt"); if (b) selectIn(this, b, "service"); });
    $("#optClinician").addEventListener("click", function (e) { var b = e.target.closest(".opt"); if (b) selectIn(this, b, "clinician"); });
    daysWrap.addEventListener("click", function (e) { var b = e.target.closest(".day"); if (b) selectIn(this, b, "day"); });
    $("#slots").addEventListener("click", function (e) { var b = e.target.closest(".slot"); if (b) selectIn(this, b, "time"); });

    function canAdvance(i) {
      if (i === 0) return !!state.service;
      if (i === 1) return !!state.clinician;
      if (i === 2) return !!(state.day && state.time);
      return true;
    }
    function goto(i) {
      idx = Math.max(0, Math.min(N - 1, i));
      panels.forEach(function (p) { p.classList.toggle("on", +p.getAttribute("data-p") === idx); });
      stepEls.forEach(function (s) { var si = +s.getAttribute("data-i"); s.classList.toggle("on", si === idx); s.classList.toggle("done", si < idx); });
      bkBack.disabled = idx === 0;
      if (idx === 3) buildSummary();
      bkNext.textContent = idx === N - 1 ? "Confirm booking" : "Continue →";
      refresh();
    }
    function refresh() { bkNext.disabled = !canAdvance(idx); }

    function buildSummary() {
      $("#summary").innerHTML = "You're booking <b>" + (state.service || "—") + "</b> with <b>" + state.clinician +
        "</b><br>on <b>" + (state.day || "—") + "</b> at <b>" + (state.time || "—") + "</b>.";
    }

    bkNext.addEventListener("click", function () {
      if (idx < N - 1) { if (canAdvance(idx)) goto(idx + 1); return; }
      // final: validate details
      var name = $("#bkName").value.trim(), phone = $("#bkPhone").value.trim(), email = $("#bkEmail").value.trim();
      if (!name) { $("#bkName").focus(); return; }
      if (!phone) { $("#bkPhone").focus(); return; }
      if (!/.+@.+\..+/.test(email)) { $("#bkEmail").focus(); return; }
      $("#doneMsg").textContent = "Thanks, " + name.split(" ")[0] + " — your " + state.service.toLowerCase() +
        " appointment with " + state.clinician + " on " + state.day + " at " + state.time +
        " is requested. We'll text " + phone + " to confirm.";
      panels.forEach(function (p) { p.classList.remove("on"); });
      done.classList.add("show"); actions.style.display = "none";
      stepEls.forEach(function (s) { s.classList.remove("on"); s.classList.add("done"); });
    });
    bkBack.addEventListener("click", function () { goto(idx - 1); });

    // clicking a step chip jumps back to a completed step
    $("#steps").addEventListener("click", function (e) {
      var s = e.target.closest(".step"); if (!s) return; var t = +s.getAttribute("data-i");
      if (t < idx || (t === idx)) goto(t);
    });

    $("#bookReset").addEventListener("click", function () {
      state = { service: null, clinician: "First available", day: null, dayLabel: null, time: null };
      $$(".opt, .day, .slot").forEach(function (o) { o.classList.remove("sel"); });
      $("#optClinician .opt").classList.add("sel");
      $("#bkName").value = ""; $("#bkPhone").value = ""; $("#bkEmail").value = "";
      done.classList.remove("show"); actions.style.display = "";
      goto(0);
    });

    // "Book <service>" jumps to the wizard with that service preselected
    $("#svcBook").addEventListener("click", function () {
      var name = this.dataset.svc;
      var match = $$("#optService .opt").filter(function (o) { return o.getAttribute("data-v") === name; })[0];
      if (match) selectIn($("#optService"), match, "service");
      goto(0);
    });

    goto(0);
  });
})();
