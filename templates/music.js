/* Midnight Echo — bespoke music: a simulated audio player (playlist,
   play/pause, prev/next, seek, auto-advance) with a live waveform, plus
   a tour-dates list with sold-out states. No real audio — the transport
   is driven by requestAnimationFrame. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fmt = function (s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); };

  var TRACKS = [
    { t: "Afterglow", a: "Midnight Echo", d: 214 },
    { t: "Neon Rain", a: "Midnight Echo", d: 198 },
    { t: "Low Tide", a: "Midnight Echo feat. Sōl", d: 241 },
    { t: "Chapel Sessions", a: "Midnight Echo", d: 176 },
    { t: "Drive Home", a: "Midnight Echo", d: 227 },
    { t: "Static Bloom", a: "Midnight Echo", d: 203 },
  ];
  var TOUR = [
    { m: "May", n: 14, v: "O2 Academy", c: "Bristol, UK", sold: false },
    { m: "May", n: 21, v: "Village Underground", c: "London, UK", sold: true },
    { m: "Jun", n: 3, v: "Paradiso", c: "Amsterdam, NL", sold: false },
    { m: "Jun", n: 12, v: "Berghain", c: "Berlin, DE", sold: true },
    { m: "Jun", n: 27, v: "Le Trabendo", c: "Paris, FR", sold: false },
  ];

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

    /* ---- waveform bars ---- */
    var WB = 40, wave = $("#wave"), heights = [];
    var wh = "";
    for (var i = 0; i < WB; i++) { var h = 20 + Math.abs(Math.sin(i * 0.6)) * 60 + (i % 3) * 8; heights.push(h); wh += "<i></i>"; }
    wave.innerHTML = wh;
    var bars = $$("i", wave);
    bars.forEach(function (b, i) { b.style.height = heights[i] + "%"; });

    /* ---- tracklist ---- */
    var tracksEl = $("#tracks");
    tracksEl.innerHTML = TRACKS.map(function (tr, i) {
      return '<div class="track" data-i="' + i + '"><div class="no">' + (i + 1) + '</div>' +
        '<div><div class="tn">' + tr.t + '</div><div class="ta">' + tr.a + '</div></div>' +
        '<div style="display:flex; align-items:center; gap:12px"><span class="eq"><i></i><i></i><i></i></span><span class="td">' + fmt(tr.d) + '</span></div></div>';
    }).join("");

    /* ---- transport ---- */
    var idx = 0, playing = false, t = 0, raf = null, prevTs = null;
    var player = $("#player"), seekFill = $("#seekFill");
    function loadUI() {
      var tr = TRACKS[idx];
      $("#npTitle").textContent = tr.t; $("#npArtist").textContent = tr.a;
      $("#tDur").textContent = fmt(tr.d);
      $$("#tracks .track").forEach(function (el, i) { el.classList.toggle("on", i === idx); el.classList.toggle("playing", i === idx && playing); });
      draw();
    }
    function draw() {
      var tr = TRACKS[idx], pct = t / tr.d * 100;
      seekFill.style.width = pct + "%";
      $("#tCur").textContent = fmt(t);
    }
    function frame(ts) {
      raf = requestAnimationFrame(frame);
      if (prevTs === null) prevTs = ts; var dt = (ts - prevTs) / 1000; prevTs = ts;
      t += dt;
      // live waveform wobble while playing
      for (var i = 0; i < bars.length; i++) {
        var base = heights[i], mod = (0.5 + 0.5 * Math.sin(ts / 220 + i * 0.5)) * 40;
        bars[i].style.height = Math.min(100, base * 0.5 + mod) + "%";
      }
      if (t >= TRACKS[idx].d) { t = 0; go(idx + 1, true); return; }
      draw();
    }
    function play() {
      playing = true; player.classList.add("playing"); $("#playBtn").textContent = "❚❚"; $("#playBtn").setAttribute("aria-label", "Pause");
      $$("#tracks .track")[idx].classList.add("playing");
      prevTs = null; if (!reduce) raf = requestAnimationFrame(frame);
    }
    function pause() {
      playing = false; player.classList.remove("playing"); $("#playBtn").textContent = "▶"; $("#playBtn").setAttribute("aria-label", "Play");
      $$("#tracks .track").forEach(function (el) { el.classList.remove("playing"); });
      if (raf) cancelAnimationFrame(raf); raf = null;
      bars.forEach(function (b, i) { b.style.height = heights[i] + "%"; });
    }
    function go(n, keepPlaying) {
      idx = (n + TRACKS.length) % TRACKS.length; t = 0;
      loadUI();
      if (keepPlaying || playing) { pause(); play(); }
    }
    $("#playBtn").addEventListener("click", function () { playing ? pause() : play(); });
    $("#prev").addEventListener("click", function () { if (t > 3) { t = 0; draw(); } else go(idx - 1); });
    $("#next").addEventListener("click", function () { go(idx + 1); });
    tracksEl.addEventListener("click", function (e) {
      var tr = e.target.closest(".track"); if (!tr) return;
      var n = +tr.getAttribute("data-i");
      if (n === idx) { playing ? pause() : play(); } else { go(n); if (!playing) play(); }
    });
    $("#seek").addEventListener("click", function (e) {
      var r = this.getBoundingClientRect(); t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * TRACKS[idx].d; draw();
    });
    loadUI();

    /* ---- tour ---- */
    $("#tourList").innerHTML = TOUR.map(function (d) {
      return '<div class="date' + (d.sold ? " sold" : "") + '"><div class="dd"><div class="m">' + d.m + '</div><div class="n">' + d.n + '</div></div>' +
        '<div><div class="dv">' + d.v + '</div><div class="dc">' + d.c + '</div></div>' +
        '<button class="btn ' + (d.sold ? "" : "btn-fill") + '"' + (d.sold ? " disabled" : "") + '>' + (d.sold ? "Sold out" : "Get tickets") + '</button></div>';
    }).join("");
    $("#tourList").addEventListener("click", function (e) {
      var b = e.target.closest("button:not([disabled])"); if (!b) return;
      b.textContent = "✓ Reserved"; b.classList.remove("btn-fill"); b.classList.add("btn-line");
    });
  });
})();
