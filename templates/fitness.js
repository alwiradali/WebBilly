/* Iron Republic — bespoke fitness: interactive weekly class timetable
   (day tabs + program filter + book-a-spot), a 1-rep-max calculator
   (Epley + working %), and a monthly/annual membership toggle. */
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
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      $$(".rv").forEach(function (el) { io.observe(el); });
    } else $$(".rv").forEach(function (el) { el.classList.add("in"); });

    /* ---- timetable ---- */
    var days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var schedule = {
      Mon: [["06:00", "Strength", "Strength", "Coach Dane", 6], ["12:15", "Metcon", "Metcon", "Coach Priya", 10], ["18:00", "Powerlifting", "Powerlifting", "Coach Vic", 3], ["19:30", "HIIT", "HIIT", "Coach Mo", 0]],
      Tue: [["06:30", "HIIT", "HIIT", "Coach Mo", 8], ["12:00", "Strength", "Strength", "Coach Dane", 5], ["17:30", "Mobility", "Mobility", "Coach Lena", 12], ["18:45", "Grit Class", "Metcon", "Coach Priya", 2]],
      Wed: [["06:00", "Strength", "Strength", "Coach Vic", 7], ["12:15", "HIIT", "HIIT", "Coach Mo", 9], ["18:00", "Powerlifting", "Powerlifting", "Coach Vic", 4]],
      Thu: [["06:30", "Metcon", "Metcon", "Coach Priya", 10], ["12:00", "Strength", "Strength", "Coach Dane", 6], ["18:15", "HIIT", "HIIT", "Coach Mo", 1], ["19:30", "Mobility", "Mobility", "Coach Lena", 14]],
      Fri: [["06:00", "Strength", "Strength", "Coach Dane", 5], ["12:15", "Metcon", "Metcon", "Coach Priya", 8], ["17:30", "Grit Class", "HIIT", "Coach Mo", 0]],
      Sat: [["08:00", "Grit Class", "Metcon", "Coach Priya", 12], ["09:30", "Powerlifting", "Powerlifting", "Coach Vic", 6], ["11:00", "Strength", "Strength", "Coach Dane", 9]],
    };
    var curDay = "Mon", curProg = "all";
    var dayTabs = $("#dayTabs"), ttList = $("#ttList"), ttEmpty = $("#ttEmpty");
    dayTabs.innerHTML = days.map(function (d, i) { return '<button class="daytab' + (i === 0 ? " on" : "") + '" data-d="' + d + '">' + d + "</button>"; }).join("");

    function renderDay() {
      var rows = schedule[curDay] || [];
      ttList.innerHTML = rows.map(function (c, i) {
        var spots = c[4], low = spots > 0 && spots <= 3, full = spots === 0;
        var btn = full ? '<button class="book full" disabled>Full</button>' : '<button class="book" data-i="' + i + '">Book</button>';
        var spotTxt = full ? "Full" : '<b>' + spots + '</b> spots';
        return '<div class="cls" data-prog="' + c[2] + '" data-i="' + i + '">' +
          '<div class="time">' + c[0] + '</div>' +
          '<div class="info"><h4>' + c[1] + '</h4><div class="sub">' + c[3] + ' · ' + c[2] + '</div></div>' +
          '<div class="spots' + (low ? " low" : "") + '">' + spotTxt + '</div>' + btn + '</div>';
      }).join("");
      applyProg();
    }
    function applyProg() {
      var shown = 0;
      $$(".cls", ttList).forEach(function (el) {
        var ok = curProg === "all" || el.getAttribute("data-prog") === curProg;
        el.classList.toggle("hide", !ok); if (ok) shown++;
      });
      ttEmpty.classList.toggle("show", shown === 0);
    }
    dayTabs.addEventListener("click", function (e) {
      var b = e.target.closest(".daytab"); if (!b) return;
      $$(".daytab", dayTabs).forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on");
      curDay = b.getAttribute("data-d"); renderDay();
    });
    $("#progFilter").addEventListener("click", function (e) {
      var b = e.target.closest(".pf"); if (!b) return;
      $$(".pf", this).forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on");
      curProg = b.getAttribute("data-p"); applyProg();
    });
    ttList.addEventListener("click", function (e) {
      var b = e.target.closest(".book"); if (!b || b.classList.contains("booked") || b.classList.contains("full")) return;
      var i = +b.getAttribute("data-i"), row = schedule[curDay][i];
      if (row[4] > 0) row[4]--;
      var cls = b.closest(".cls"), spotsEl = $(".spots", cls);
      b.textContent = "Booked ✓"; b.classList.add("booked");
      if (row[4] === 0) { spotsEl.textContent = "Full"; } else { spotsEl.innerHTML = '<b>' + row[4] + '</b> spots'; spotsEl.classList.toggle("low", row[4] <= 3); }
    });
    renderDay();

    /* ---- 1RM calculator ---- */
    var wIn = $("#cWeight"), rIn = $("#cReps"), unit = "kg";
    function calc() {
      var w = parseFloat(wIn.value) || 0, r = Math.max(1, Math.min(12, parseInt(rIn.value, 10) || 1));
      var oneRm = r === 1 ? w : w * (1 + r / 30);        // Epley
      $("#oneRm").textContent = Math.round(oneRm);
      $("#unitOut").textContent = unit;
      var pcts = [[95, "2–3 reps"], [90, "3–4 reps"], [85, "5–6 reps"], [80, "7–8 reps"], [70, "10–12 reps"]];
      $("#pctTable").innerHTML = pcts.map(function (p) {
        return '<div class="r"><span class="p">' + p[0] + '%</span><span class="g">' + p[1] + '</span><span class="w">' + Math.round(oneRm * p[0] / 100) + " " + unit + "</span></div>";
      }).join("");
    }
    [wIn, rIn].forEach(function (el) { el.addEventListener("input", calc); });
    $("#unitToggle").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      $$("button", this).forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on");
      unit = b.getAttribute("data-u"); calc();
    });
    calc();

    /* ---- membership toggle ---- */
    var sw = $("#billSwitch"), yearly = false;
    var priceSpans = $$(".plan .price span[data-m]");
    function setBilling(y) {
      yearly = y; sw.classList.toggle("year", y); sw.setAttribute("aria-checked", y);
      $("#lblMonth").classList.toggle("on", !y); $("#lblYear").classList.toggle("on", y);
      priceSpans.forEach(function (s) { s.textContent = y ? s.getAttribute("data-y") : s.getAttribute("data-m"); });
      $("#per1").textContent = "per visit";
      $("#per2").textContent = y ? "billed annually" : "billed monthly";
      $("#per3").textContent = y ? "billed annually" : "billed monthly";
    }
    sw.addEventListener("click", function () { setBilling(!yearly); });
    sw.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setBilling(!yearly); } });
  });
})();
