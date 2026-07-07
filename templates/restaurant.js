/* Saffron House — bespoke interactions: reservation flow, menu filter,
   sticky nav, mobile menu, staggered scroll reveals, toast. Vanilla JS. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  document.addEventListener("DOMContentLoaded", function () {
    /* ---- default dates: today, no past bookings ---- */
    var today = new Date();
    var iso = today.getFullYear() + "-" + pad(today.getMonth() + 1) + "-" + pad(today.getDate());
    $$("#qDate, #rDate").forEach(function (d) { d.min = iso; if (!d.value) d.value = iso; });

    /* ---- sticky nav + mobile menu ---- */
    var nav = $("#nav"), navLinks = $("#navLinks"), burger = $("#burger");
    var onScroll = function () { nav.classList.toggle("stuck", window.scrollY > 24); };
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    burger.addEventListener("click", function () {
      var open = navLinks.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$("#navLinks a").forEach(function (a) { a.addEventListener("click", function () { navLinks.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); }); });

    /* ---- staggered reveal ---- */
    if ("IntersectionObserver" in window && !reduce) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var sibs = $$(".rv", e.target.parentNode).filter(function (n) { return !n.classList.contains("in"); });
          var i = sibs.indexOf(e.target);
          e.target.style.transitionDelay = Math.max(0, i) * 70 + "ms";
          e.target.classList.add("in");
          io.unobserve(e.target);
        });
      }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
      $$(".rv").forEach(function (el) { io.observe(el); });
    } else {
      $$(".rv").forEach(function (el) { el.classList.add("in"); });
    }

    /* ---- menu filter ---- */
    var chips = $$("#menuFilters .chip"), items = $$(".mitem");
    $("#menuFilters").addEventListener("click", function (e) {
      var chip = e.target.closest(".chip"); if (!chip) return;
      chips.forEach(function (c) { c.classList.remove("on"); }); chip.classList.add("on");
      var f = chip.getAttribute("data-f");
      items.forEach(function (it) {
        var show = f === "all" || (" " + it.getAttribute("data-tags") + " ").indexOf(" " + f + " ") > -1;
        it.classList.toggle("hide", !show);
      });
    });

    /* ---- reservations ---- */
    var toast = $("#toast"), toastT;
    function showToast(msg) { toast.textContent = msg; toast.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove("show"); }, 2600); }

    // hero quick-check → prefill the full form and jump to it
    $("#quickRes").addEventListener("submit", function (e) {
      e.preventDefault();
      $("#rDate").value = $("#qDate").value;
      $("#rTime").value = $("#qTime").value;
      $("#rGuests").value = $("#qGuests").value;
      document.getElementById("reserve").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      showToast("Tables free at " + $("#qTime").value + " — add your name to confirm.");
      setTimeout(function () { $("#rName").focus(); }, reduce ? 0 : 600);
    });

    // full reservation → confirmation
    var form = $("#resForm"), ok = $("#resOk");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("#rName").value.trim(), date = $("#rDate").value;
      if (!date) { showToast("Please choose a date."); $("#rDate").focus(); return; }
      if (!name) { showToast("What name should the table be under?"); $("#rName").focus(); return; }
      var guests = $("#rGuests").value, time = $("#rTime").value;
      $("#resOkMsg").innerHTML = "Table for <b>" + guests + "</b> on <b>" + prettyDate(date) + "</b> at <b>" + time + "</b>.<br>See you soon, " + escapeHtml(name.split(" ")[0]) + " — we'll text to confirm.";
      form.style.display = "none"; ok.classList.add("show");
      showToast("✓ Table booked — check your phone.");
    });
    $("#resAgain").addEventListener("click", function () {
      ok.classList.remove("show"); form.style.display = ""; $("#rName").value = ""; $("#rName").focus();
    });
  });

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function prettyDate(iso) {
    var p = iso.split("-"); var d = new Date(+p[0], +p[1] - 1, +p[2]);
    var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return days[d.getDay()] + " " + d.getDate() + " " + mon[d.getMonth()];
  }
  function escapeHtml(s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
})();

/* ---- signature layer: warm trailing cursor, hero spice-dust,
   and a dish photo that follows the cursor over the menu.
   Desktop-only (hover + fine pointer); disabled for reduced-motion. ---- */
(function () {
  "use strict";
  var fine = window.matchMedia && matchMedia("(hover:hover) and (pointer:fine)").matches;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.addEventListener("DOMContentLoaded", function () {
    var mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
    var cursor = null, dot = null;

    if (fine && !reduce) {
      cursor = document.getElementById("cursor");
      dot = document.getElementById("cursorDot");
      if (cursor && dot) {
        document.body.classList.add("cursor-on");
        var grow = function () { cursor.classList.add("big"); }, shrink = function () { cursor.classList.remove("big"); };
        document.querySelectorAll("a,button,.mitem,input,select,label,.chip").forEach(function (el) {
          el.addEventListener("mouseenter", grow); el.addEventListener("mouseleave", shrink);
        });
      }
    }
    window.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (dot) dot.style.transform = "translate(" + mx + "px," + my + "px) translate(-50%,-50%)";
    }, { passive: true });

    /* dish photo follows the cursor over the menu */
    var peek = document.getElementById("dishPeek");
    if (peek && fine) {
      document.querySelectorAll(".mitem[data-img]").forEach(function (it) {
        it.addEventListener("mouseenter", function () { peek.src = it.getAttribute("data-img"); peek.classList.add("show"); });
        it.addEventListener("mousemove", function (e) { peek.style.left = e.clientX + 34 + "px"; peek.style.top = e.clientY + "px"; });
        it.addEventListener("mouseleave", function () { peek.classList.remove("show"); });
      });
    }

    /* hero spice-dust */
    var canvas = document.getElementById("spice"), ctx = null, parts = [], W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas && !reduce) {
      ctx = canvas.getContext("2d");
      var host = canvas.parentNode;
      var size = function () { W = host.clientWidth; H = host.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + "px"; canvas.style.height = H + "px"; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
      size(); window.addEventListener("resize", size);
      for (var i = 0; i < 40; i++) parts.push({ x: Math.random() * W, y: Math.random() * H, r: 0.6 + Math.random() * 1.9, vx: (Math.random() - 0.5) * 0.16, vy: -0.08 - Math.random() * 0.26, a: 0.08 + Math.random() * 0.4, c: Math.random() < 0.5 ? "242,165,65" : "224,67,47" });
    }

    var run = (cursor || ctx);
    function frame() {
      requestAnimationFrame(frame);
      if (cursor) { cx += (mx - cx) * 0.18; cy += (my - cy) * 0.18; cursor.style.transform = "translate(" + cx + "px," + cy + "px) translate(-50%,-50%)"; }
      if (ctx) {
        ctx.clearRect(0, 0, W, H);
        for (var j = 0; j < parts.length; j++) {
          var p = parts[j]; p.x += p.vx; p.y += p.vy;
          if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
          ctx.beginPath(); ctx.fillStyle = "rgba(" + p.c + "," + p.a + ")"; ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
        }
      }
    }
    if (run) requestAnimationFrame(frame);
  });
})();
