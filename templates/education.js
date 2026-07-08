/* BrightPath Academy — bespoke education: a "find your path" quiz that
   recommends a course from your answers, plus a filterable + searchable
   course catalog. Reveals + mobile nav. */
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

    /* ---- recommendation catalog ---- */
    var catalog = {
      code:   { Beginner: { t: "Web Development Bootcamp", meta: "Code · 12 weeks · Beginner", price: "£299", icon: "💻", col: "#6d5efc" },
                Intermediate: { t: "Front-End with React", meta: "Code · 10 weeks · Intermediate", price: "£329", icon: "⚛️", col: "#6d5efc" } },
      design: { Beginner: { t: "Brand & Visual Identity", meta: "Design · 6 weeks · Beginner", price: "£229", icon: "🖌️", col: "#ec4899" },
                Intermediate: { t: "UX & Product Design", meta: "Design · 10 weeks · Intermediate", price: "£349", icon: "🎨", col: "#ec4899" } },
      data:   { Beginner: { t: "Data Analytics Essentials", meta: "Data · 8 weeks · Beginner", price: "£279", icon: "📊", col: "#10b981" },
                Intermediate: { t: "Python for Data Science", meta: "Data · 12 weeks · Intermediate", price: "£379", icon: "🐍", col: "#10b981" } },
    };
    var trackName = { code: "building", design: "designing", data: "working with data" };
    var timeWord = { light: "a few hours a week", steady: "evenings and weekends", all: "going all-in" };

    /* ---- quiz ---- */
    var steps = $$("#quizPanel .qstep"), qi = 0, answers = { track: "code", time: "steady", level: "Beginner" };
    var panel = $("#quizPanel"), result = $("#quizResult"), qback = $("#qback"), qbar = $("#qbar");

    function showStep(i) {
      qi = i;
      steps.forEach(function (s) { s.classList.toggle("on", +s.getAttribute("data-q") === i); });
      qbar.style.width = ((i + 1) / steps.length * 100) + "%";
      qback.style.display = i > 0 ? "inline-flex" : "none";
    }
    showStep(0);

    steps.forEach(function (step) {
      $$(".qopt", step).forEach(function (opt) {
        opt.addEventListener("click", function () {
          if (opt.dataset.track) answers.track = opt.dataset.track;
          if (opt.dataset.time) answers.time = opt.dataset.time;
          if (opt.dataset.level) answers.level = opt.dataset.level;
          if (qi < steps.length - 1) showStep(qi + 1);
          else finish();
        });
      });
    });
    qback.addEventListener("click", function () { if (qi > 0) showStep(qi - 1); });

    function finish() {
      // "all-in" learners get bumped up a level where an intermediate exists
      var level = answers.level;
      if (answers.time === "all" && level === "Beginner") level = "Intermediate";
      var rec = (catalog[answers.track] && catalog[answers.track][level]) || catalog.code.Beginner;
      $("#rBadge").textContent = rec.icon;
      $("#rBadge").style.background = "linear-gradient(135deg," + rec.col + ",#00000022)";
      $("#rTitle").textContent = rec.t;
      $("#rMeta").textContent = rec.meta;
      $("#rPrice").textContent = rec.price;
      $("#rWhy").textContent = "Because you're into " + trackName[answers.track] + " and studying " +
        timeWord[answers.time] + ", this is the ideal place to begin.";
      panel.style.display = "none"; result.classList.add("on");
    }
    $("#qrestart").addEventListener("click", function () {
      result.classList.remove("on"); panel.style.display = ""; showStep(0);
    });
    // enrol scrolls to the matching course and highlights it briefly
    $("#rEnrol").addEventListener("click", function () {
      var title = $("#rTitle").textContent;
      var card = $$("#courseGrid .course").filter(function (c) { return c.getAttribute("data-title").replace(/&amp;/g, "&") === title; })[0];
      if (card) { setTimeout(function () { card.animate ? card.animate([{ boxShadow: "0 0 0 3px #f59e0b" }, { boxShadow: "0 0 0 0 transparent" }], { duration: 1400 }) : 0; }, 400); }
    });

    /* ---- course filter + search ---- */
    var courses = $$("#courseGrid .course"), empty = $("#empty"), curTrack = "all", q = "";
    function applyFilter() {
      var shown = 0;
      courses.forEach(function (c) {
        var okTrack = curTrack === "all" || c.getAttribute("data-track") === curTrack;
        var title = c.getAttribute("data-title").replace(/&amp;/g, "&").toLowerCase();
        var desc = ($(".cdesc", c).textContent || "").toLowerCase();
        var okQ = !q || title.indexOf(q) > -1 || desc.indexOf(q) > -1;
        var show = okTrack && okQ;
        c.classList.toggle("hide", !show);
        if (show) shown++;
      });
      empty.classList.toggle("show", shown === 0);
    }
    $("#trackFilter").addEventListener("click", function (e) {
      var b = e.target.closest(".fbtn"); if (!b) return;
      $$("#trackFilter .fbtn").forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on");
      curTrack = b.getAttribute("data-track"); applyFilter();
    });
    $("#search").addEventListener("input", function () { q = this.value.trim().toLowerCase(); applyFilter(); });
  });
})();
