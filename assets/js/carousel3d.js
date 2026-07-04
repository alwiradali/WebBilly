/* ============================================================
   Billy Digitals — 3D Coverflow Carousel
   Turns any ".coverflow" grid into an interactive 3D coverflow:
   center card face-on, neighbours angled back in 3D space.
   Nav: click a side card, arrows, drag / swipe, keyboard.
   Filter-aware (templates) and resize-aware. No dependencies.
   Degrades to the normal grid when reduced motion is requested.
   ============================================================ */
(function () {
  "use strict";

  var reduce =
    window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var instances = [];

  function build(stage) {
    // Original card elements (direct element children only).
    var cards = Array.prototype.filter.call(stage.children, function (n) {
      return n.nodeType === 1;
    });
    if (cards.length < 2) return null;

    stage.classList.add("cf-stage");

    var viewport = document.createElement("div");
    viewport.className = "cf-viewport";
    var track = document.createElement("div");
    track.className = "cf-track";
    viewport.appendChild(track);

    // Wrap each card so coverflow transforms live on the wrapper,
    // leaving the card free for its own hover-tilt transform.
    var items = cards.map(function (card) {
      var item = document.createElement("div");
      item.className = "cf-item";
      card.classList.add("in"); // force-reveal inside the widget
      track.appendChild(item);
      item.appendChild(card);
      item._card = card;
      return item;
    });

    // Arrows
    var prev = document.createElement("button");
    prev.type = "button";
    prev.className = "cf-arrow cf-prev";
    prev.setAttribute("aria-label", "Previous");
    prev.innerHTML = "‹";
    var next = document.createElement("button");
    next.type = "button";
    next.className = "cf-arrow cf-next";
    next.setAttribute("aria-label", "Next");
    next.innerHTML = "›";

    // Dots
    var dots = document.createElement("div");
    dots.className = "cf-dots";
    var dotBtns = items.map(function (_, i) {
      var d = document.createElement("button");
      d.type = "button";
      d.className = "cf-dot";
      d.setAttribute("aria-label", "Go to item " + (i + 1));
      d.addEventListener("click", function () {
        api.go(visibleIndexOf(i));
      });
      dots.appendChild(d);
      return d;
    });

    stage.innerHTML = "";
    stage.appendChild(viewport);
    stage.appendChild(prev);
    stage.appendChild(next);
    stage.appendChild(dots);
    stage.setAttribute("role", "group");
    stage.setAttribute("aria-roledescription", "carousel");
    stage.tabIndex = 0;

    var active = 0; // index into the *visible* list
    var visible = items.slice(); // items not filtered out

    function visibleIndexOf(itemIdx) {
      var it = items[itemIdx];
      var v = visible.indexOf(it);
      return v < 0 ? active : v;
    }

    function itemWidth() {
      var vw = stage.clientWidth || 320;
      return Math.max(240, Math.min(vw * 0.82, 380));
    }

    function layout() {
      var w = itemWidth();
      var half = w / 2;
      var sideStep = w * 0.42;
      var maxH = 0;

      items.forEach(function (item) {
        var isVis = visible.indexOf(item) !== -1;
        item.style.display = isVis ? "" : "none";
        item.style.width = w + "px";
        // Clear state on every item so filtered-out cards don't keep a
        // stale active flag.
        item.classList.remove("cf-active");
        if (item._card) item._card.setAttribute("aria-hidden", "true");
      });

      // Measure tallest visible card at this width.
      visible.forEach(function (item) {
        var h = item.offsetHeight;
        if (h > maxH) maxH = h;
      });
      if (maxH) stage.style.setProperty("--cf-h", maxH + "px");

      visible.forEach(function (item, i) {
        var o = i - active;
        var a = Math.abs(o);
        var s = o < 0 ? -1 : 1;
        var x, z, ry, sc, op, show = true;

        if (o === 0) {
          x = 0; z = 60; ry = 0; sc = 1; op = 1;
        } else {
          x = s * (half * 1.5 + (a - 1) * sideStep);
          z = -Math.min(a, 4) * 150;
          ry = -s * 50;
          sc = Math.max(1 - a * 0.13, 0.72);
          op = a <= 3 ? Math.max(1 - a * 0.3, 0.2) : 0;
          if (a > 3) show = false;
        }

        item.style.transform =
          "translateX(-50%) translateX(" + x.toFixed(1) + "px)" +
          " translateZ(" + z.toFixed(1) + "px)" +
          " rotateY(" + ry + "deg) scale(" + sc.toFixed(3) + ")";
        item.style.opacity = show ? op : 0;
        item.style.filter = o === 0 ? "" : "brightness(0.66)";
        item.style.zIndex = String(100 - a);
        item.style.pointerEvents = show ? "auto" : "none";
        item.classList.toggle("cf-active", o === 0);
        var card = item._card;
        if (card) card.setAttribute("aria-hidden", o === 0 ? "false" : "true");
      });

      // Dots reflect the visible list.
      dotBtns.forEach(function (d) {
        d.style.display = "none";
        d.classList.remove("cf-dot-on");
      });
      visible.forEach(function (item, i) {
        var idx = items.indexOf(item);
        var d = dotBtns[idx];
        d.style.display = "";
        if (i === active) d.classList.add("cf-dot-on");
      });

      prev.disabled = active <= 0;
      next.disabled = active >= visible.length - 1;
    }

    var api = {
      stage: stage,
      go: function (i) {
        active = Math.max(0, Math.min(i, visible.length - 1));
        layout();
      },
      step: function (d) {
        api.go(active + d);
      },
      relayout: layout,
      refilter: function () {
        var activeItem = visible[active];
        visible = items.filter(function (item) {
          return !item._card.classList.contains("hide");
        });
        if (visible.length === 0) visible = items.slice();
        var ni = visible.indexOf(activeItem);
        active = ni >= 0 ? ni : 0;
        layout();
      },
    };

    // ---- Interaction ----
    prev.addEventListener("click", function () { api.step(-1); });
    next.addEventListener("click", function () { api.step(1); });

    // Click a side card to bring it forward; active card stays clickable.
    items.forEach(function (item) {
      item.addEventListener("click", function (e) {
        if (item.classList.contains("cf-active")) return; // let links work
        if (dragMoved) return;
        e.preventDefault();
        var v = visible.indexOf(item);
        if (v >= 0) api.go(v);
      });
    });

    // Keyboard
    stage.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); api.step(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); api.step(1); }
    });

    // Drag / swipe
    var dragging = false, startX = 0, dragMoved = false;
    viewport.addEventListener("pointerdown", function (e) {
      dragging = true; dragMoved = false; startX = e.clientX;
    });
    window.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      if (Math.abs(e.clientX - startX) > 8) dragMoved = true;
    });
    window.addEventListener("pointerup", function (e) {
      if (!dragging) return;
      dragging = false;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 55) api.step(dx < 0 ? 1 : -1);
      // reset the click-guard after the event loop tick
      setTimeout(function () { dragMoved = false; }, 0);
    });

    layout();
    return api;
  }

  function initFilterHook() {
    // Re-layout the templates coverflow when a category filter is clicked.
    var tGrid = document.getElementById("templatesGrid");
    if (!tGrid) return;
    var inst = instances.filter(function (i) { return i.stage === tGrid; })[0];
    if (!inst) return;
    document.querySelectorAll(".fbtn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        // main.js toggles .hide first; run after it on the same tick.
        setTimeout(function () { inst.refilter(); }, 0);
      });
    });
  }

  function initAll() {
    if (reduce) return; // keep the plain accessible grid
    document.querySelectorAll(".coverflow").forEach(function (stage) {
      var inst = build(stage);
      if (inst) instances.push(inst);
    });
    initFilterHook();

    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        instances.forEach(function (i) { i.relayout(); });
      }, 120);
    });
  }

  window.Carousel3D = {
    refreshAll: function () {
      instances.forEach(function (i) { i.relayout(); });
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
