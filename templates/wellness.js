/* Stillwater — bespoke wellness: an interactive guided-breathing
   exercise (grow/hold/settle with selectable patterns and a cycle
   count) and a class-reservation schedule (day tabs + reserve). */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // patterns: sequence of [cue, seconds, orbState] — big = inhaled/held large, small = exhaled
  var PATTERNS = {
    calm: [["Breathe in", 4, "big"], ["Hold", 4, "big"], ["Breathe out", 6, "small"]],
    box: [["Breathe in", 4, "big"], ["Hold", 4, "big"], ["Breathe out", 4, "small"], ["Hold", 4, "small"]],
    sleep: [["Breathe in", 4, "big"], ["Hold", 7, "big"], ["Breathe out", 8, "small"]],
  };

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

    /* ---- breathing ---- */
    var orb = $("#orb"), cue = $("#cue"), meta = $("#bMeta"), start = $("#bStart"), stop = $("#bStop");
    var pattern = "calm", phase = 0, cycles = 0, timer = null, running = false;

    $("#patternPick").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      $$("button", this).forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on");
      pattern = b.getAttribute("data-p");
      if (running) { reset(); begin(); }
    });

    function applyPhase() {
      var seq = PATTERNS[pattern], p = seq[phase];
      cue.textContent = p[0];
      orb.classList.toggle("big", p[2] === "big");
      // set the CSS transition duration to match this phase
      var dur = p[1];
      orb.style.transitionDuration = dur + "s, " + dur + "s";
      meta.innerHTML = "Cycle <b>" + (cycles + 1) + "</b> · " + p[0].toLowerCase() + " for <b>" + dur + "s</b>";
      timer = setTimeout(function () {
        phase++;
        if (phase >= seq.length) { phase = 0; cycles++; }
        if (running) applyPhase();
      }, dur * 1000);
    }
    function begin() {
      running = true; phase = 0; cycles = 0;
      start.style.display = "none"; stop.style.display = "";
      applyPhase();
    }
    function reset() {
      running = false; if (timer) clearTimeout(timer); timer = null;
      orb.classList.remove("big"); orb.style.transitionDuration = "";
    }
    function finish() {
      reset();
      cue.textContent = "✿"; meta.innerHTML = cycles > 0 ? "Lovely — <b>" + cycles + "</b> full breath" + (cycles === 1 ? "" : "s") + ". Carry that with you." : "Whenever you're ready.";
      start.style.display = ""; stop.style.display = "none"; start.textContent = "Start again";
    }
    start.addEventListener("click", begin);
    stop.addEventListener("click", finish);

    /* ---- class schedule ---- */
    var days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    var SCHED = {
      Mon: [["07:00", "Sunrise Flow", "Vinyasa · Ana", 5], ["12:30", "Lunch Reset", "Slow flow · Theo", 8], ["18:15", "Candlelit Yin", "Yin · Marisol", 0]],
      Tue: [["08:00", "Breathwork", "Pranayama · Ana", 10], ["17:30", "Pilates Core", "Mat Pilates · Jo", 3], ["19:00", "Restore", "Restorative · Theo", 6]],
      Wed: [["07:00", "Sunrise Flow", "Vinyasa · Ana", 4], ["12:30", "Meditation", "Guided sit · Marisol", 12], ["18:15", "Power Hour", "Strong flow · Jo", 2]],
      Thu: [["08:00", "Gentle Hatha", "Hatha · Theo", 7], ["17:30", "Breathwork", "Pranayama · Ana", 9], ["19:00", "Candlelit Yin", "Yin · Marisol", 0]],
      Fri: [["07:00", "Sunrise Flow", "Vinyasa · Jo", 5], ["12:30", "Lunch Reset", "Slow flow · Theo", 8], ["17:30", "Sound Bath", "Sound · Marisol", 1]],
      Sat: [["09:00", "Weekend Flow", "Vinyasa · Ana", 11], ["10:45", "Family Yoga", "All levels · Theo", 6], ["12:00", "Deep Rest", "Restorative · Jo", 8]],
      Sun: [["09:30", "Slow Sunday", "Slow flow · Marisol", 9], ["11:00", "Meditation", "Guided sit · Ana", 12], ["16:00", "Sound Bath", "Sound · Theo", 4]],
    };
    var curDay = "Mon", tabs = $("#dayTabs"), list = $("#clList");
    tabs.innerHTML = days.map(function (d, i) { return '<button class="cl-tab' + (i === 0 ? " on" : "") + '" data-d="' + d + '">' + d + "</button>"; }).join("");
    function renderDay() {
      var rows = SCHED[curDay] || [];
      list.innerHTML = rows.map(function (c, i) {
        var full = c[3] === 0, low = c[3] > 0 && c[3] <= 3;
        var btn = full ? '<button class="rsv full" disabled>Waitlist</button>' : '<button class="rsv" data-i="' + i + '">Reserve</button>';
        return '<div class="cl"><div class="time">' + c[0] + '</div>' +
          '<div><div class="cn">' + c[1] + '</div><div class="ci">' + c[2] + '</div></div>' +
          '<div class="spots">' + (full ? "Full" : '<b>' + c[3] + '</b> mats') + '</div>' + btn + '</div>';
      }).join("");
    }
    tabs.addEventListener("click", function (e) {
      var b = e.target.closest(".cl-tab"); if (!b) return;
      $$(".cl-tab", this).forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on");
      curDay = b.getAttribute("data-d"); renderDay();
    });
    list.addEventListener("click", function (e) {
      var b = e.target.closest(".rsv"); if (!b || b.disabled || b.classList.contains("booked")) return;
      var i = +b.getAttribute("data-i"), row = SCHED[curDay][i];
      if (row[3] > 0) row[3]--;
      var cl = b.closest(".cl"), spots = $(".spots", cl);
      b.textContent = "Reserved ✓"; b.classList.add("booked");
      spots.innerHTML = row[3] === 0 ? "Full" : '<b>' + row[3] + '</b> mats';
    });
    renderDay();
  });
})();
