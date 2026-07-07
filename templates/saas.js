/* Pulse — bespoke SaaS: a live animated dashboard (line chart + KPIs + bars),
   metric tabs, scroll count-ups, monthly/yearly pricing toggle, nav. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  document.addEventListener("DOMContentLoaded", function () {
    /* nav */
    var nav = $("#nav"), links = $("#navLinks"), burger = $("#burger");
    var onScroll = function () { nav.classList.toggle("stuck", scrollY > 20); };
    onScroll(); addEventListener("scroll", onScroll, { passive: true });
    burger.addEventListener("click", function () { var o = links.classList.toggle("open"); burger.setAttribute("aria-expanded", o); });
    $$("#navLinks a").forEach(function (a) { a.addEventListener("click", function () { links.classList.remove("open"); }); });

    /* reveals + count-ups */
    var io = ("IntersectionObserver" in window) ? new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        $$("[data-count]", e.target).forEach(countUp);
        io.unobserve(e.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }) : null;
    if (io && !reduce) $$(".rv").forEach(function (el) { io.observe(el); });
    else { $$(".rv").forEach(function (el) { el.classList.add("in"); }); $$("[data-count]").forEach(function (el) { el.textContent = fmt(+el.getAttribute("data-count")) + (el.getAttribute("data-suffix") || ""); }); }

    function countUp(el) {
      var target = +el.getAttribute("data-count"), suf = el.getAttribute("data-suffix") || "", t0 = null, dur = 1400;
      if (reduce) { el.textContent = fmt(target) + suf; return; }
      function step(now) { if (t0 === null) t0 = now; var p = Math.min((now - t0) / dur, 1); var e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(Math.round(target * e)) + suf; if (p < 1) requestAnimationFrame(step); }
      requestAnimationFrame(step);
    }

    /* ---------- live dashboard ---------- */
    var metrics = {
      users: { kpi: [12480, "▲ 8.2%", true], data: series(24, 40, 100), bars: series(7, 40, 100), fmt: function (v) { return fmt(Math.round(v * 128)); } },
      rev:   { kpi: [86200, "▲ 12.4%", true], data: series(24, 30, 95), bars: series(7, 30, 95), fmt: function (v) { return "£" + fmt(Math.round(v * 940)); } },
      ret:   { kpi: [68, "▼ 1.1%", false], data: series(24, 55, 88), bars: series(7, 55, 88), fmt: function (v) { return Math.round(v) + "%"; } }
    };
    var cur = "users", W = 600, H = 200, PAD = 8;
    var lineEl = $("#line"), areaEl = $("#area"), dotEl = $("#dot"), gridEl = $("#gridL"), barsEl = $("#bars");
    var pointsNow = metrics.users.data.slice(), pointsTarget = metrics.users.data.slice();

    // gridlines
    for (var g = 1; g <= 3; g++) { var y = (H / 4) * g; gridEl.insertAdjacentHTML("beforeend", '<line class="grid-l" x1="0" y1="' + y + '" x2="' + W + '" y2="' + y + '"/>'); }
    // bars
    for (var b = 0; b < 7; b++) barsEl.insertAdjacentHTML("beforeend", '<div class="bar"></div>');
    var barEls = $$(".bar", barsEl);

    function toXY(arr) {
      var n = arr.length, min = 20, max = 100;
      return arr.map(function (v, i) {
        var x = PAD + (i / (n - 1)) * (W - PAD * 2);
        var y = H - PAD - ((v - min) / (max - min)) * (H - PAD * 2);
        return [x, y];
      });
    }
    function draw() {
      var xy = toXY(pointsNow);
      lineEl.setAttribute("points", xy.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "));
      areaEl.setAttribute("d", "M" + xy[0][0].toFixed(1) + "," + H + " L" + xy.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" L") + " L" + xy[xy.length - 1][0].toFixed(1) + "," + H + " Z");
      var last = xy[xy.length - 1]; dotEl.setAttribute("cx", last[0].toFixed(1)); dotEl.setAttribute("cy", last[1].toFixed(1));
    }
    function setBars(arr) { barEls.forEach(function (el, i) { el.style.height = Math.round(((arr[i] - 20) / 80) * 100) + "%"; }); }

    function setKpis() {
      var m = metrics[cur];
      $$("[data-kpi]").forEach(function (el) {
        var k = el.getAttribute("data-kpi"); var val = metrics[k].kpi[0];
        el.textContent = (k === "rev" ? "£" : "") + fmt(val) + (k === "ret" ? "%" : "");
      });
      $$("[data-kpi-d]").forEach(function (el) {
        var k = el.getAttribute("data-kpi-d"); el.textContent = metrics[k].kpi[1];
        el.className = "d " + (metrics[k].kpi[2] ? "up" : "dn");
      });
    }
    setKpis(); setBars(metrics.users.bars); draw();

    function switchMetric(m) {
      cur = m; pointsTarget = metrics[m].data.slice();
      setBars(metrics[m].bars);
    }
    $("#dashTabs").addEventListener("click", function (e) {
      var btn = e.target.closest("button"); if (!btn) return;
      $$("#dashTabs button").forEach(function (x) { x.classList.remove("on"); }); btn.classList.add("on");
      switchMetric(btn.getAttribute("data-m"));
    });

    // live updates + smooth lerp
    var running = true;
    if (!reduce) {
      setInterval(function () {
        if (!running) return;
        var d = metrics[cur].data; d.shift(); d.push(clamp(d[d.length - 1] + (Math.random() - 0.45) * 22, 22, 98));
        pointsTarget = d.slice();
        // nudge bars a touch
        var bd = metrics[cur].bars; bd.shift(); bd.push(clamp(bd[bd.length - 1] + (Math.random() - 0.5) * 20, 22, 98)); setBars(bd);
      }, 1700);
      (function tick() { requestAnimationFrame(tick); for (var i = 0; i < pointsNow.length; i++) pointsNow[i] += (pointsTarget[i] - pointsNow[i]) * 0.12; draw(); })();
      document.addEventListener("visibilitychange", function () { running = document.visibilityState !== "hidden"; });
      // pause chart when offscreen
      if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { running = e[0].isIntersecting; }, { threshold: 0.01 }).observe($("#dash"));
    } else { pointsNow = pointsTarget.slice(); draw(); }

    /* ---------- pricing toggle ---------- */
    var sw = $("#billSwitch"), yearly = false;
    sw.addEventListener("click", function () {
      yearly = !yearly; sw.classList.toggle("on", yearly); sw.setAttribute("aria-checked", yearly);
      $$(".plan .pr").forEach(function (el) {
        var v = +el.getAttribute(yearly ? "data-y" : "data-m");
        el.innerHTML = "£" + v + (v > 0 ? '<span> /mo</span>' : "");
      });
    });
  });

  function series(n, lo, hi) { var a = [], v = (lo + hi) / 2; for (var i = 0; i < n; i++) { v = clamp(v + (Math.random() - 0.5) * 26, lo, hi); a.push(v); } return a; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function fmt(n) { if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B"; if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M"; if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "k"; return String(n); }
})();
