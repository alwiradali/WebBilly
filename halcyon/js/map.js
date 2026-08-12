/* ═══════════════════════════════════════════════════════════════════════════
   HALCYON — bespoke map engine (HAL.map)
   A designed, dependency-free canvas map instead of a generic tile provider:
   night-ink ground, procedurally seeded street grain, water and parks, with
   price markers, clustering, hover sync, click-through and draw-a-search-area.
   Real lat/lng in, Mercator-ish projection out. Swappable later for Mapbox —
   the public surface (init/setData/onSelect/…) is the integration contract.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  function Map(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = 0, H = 0;
    var cam = { lat: 53.05, lng: -1.6, zoom: opts.zoom || 6.4 };  /* fits MCR+LDN */
    var props = [], markers = [], hoverId = null, selectedId = null;
    var drawMode = false, drawPts = [], polygon = null;
    var pan = null, moved = false;
    var raf = null, t0 = performance.now();
    var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    var COL = {
      ground: "#101014", block: "#16161d", street: "#232330", streetLite: "#2e2e3b",
      water: "#0c1526", parkFill: "#131c15", label: "#98957f",
      pin: "#f5f2ea", pinInk: "#16150f", accent: "#d5b98e", hover: "#a07c48", ring: "rgba(213,185,142,.35)"
    };

    /* ── projection ─────────────────────────────────────────────────────── */
    function scale() { return Math.pow(2, cam.zoom) * 1.2; }
    function project(lat, lng) {
      var s = scale();
      var x = (lng - cam.lng) * s * 1.6 + W / 2;
      var y = (cam.lat - lat) * s * 2.6 + H / 2;
      return [x, y];
    }
    function unproject(x, y) {
      var s = scale();
      return { lat: cam.lat - (y - H / 2) / (s * 2.6), lng: cam.lng + (x - W / 2) / (s * 1.6) };
    }
    function bounds() {
      var a = unproject(0, 0), b = unproject(W, H);
      return { n: a.lat, s: b.lat, w: a.lng, e: b.lng };
    }

    /* ── procedural ground texture (seeded, stable per pan/zoom) ─────────── */
    function rnd(seed) { var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
    var CITIES = [
      { lat: 53.48, lng: -2.24, r: 0.16, seed: 5 },   /* Manchester */
      { lat: 53.31, lng: -2.23, r: 0.10, seed: 11 },  /* Cheshire */
      { lat: 51.505, lng: -0.12, r: 0.22, seed: 23 }, /* London */
      { lat: 51.46, lng: -0.30, r: 0.07, seed: 31 }   /* Richmond */
    ];
    function drawGround() {
      ctx.fillStyle = COL.ground; ctx.fillRect(0, 0, W, H);
      var z = cam.zoom;
      /* rivers: Irwell/Thames gestures */
      ctx.strokeStyle = COL.water; ctx.lineWidth = Math.max(6, scale() * 0.012); ctx.lineCap = "round";
      [[53.499, -2.27, 53.468, -2.30, 53.47, -2.256], [51.51, -0.30, 51.508, -0.02, 51.49, -0.12]].forEach(function (rv) {
        ctx.beginPath();
        var p1 = project(rv[0], rv[1]), pm = project(rv[4], rv[5]), p2 = project(rv[2], rv[3]);
        ctx.moveTo(p1[0], p1[1]); ctx.quadraticCurveTo(pm[0], pm[1], p2[0], p2[1]); ctx.stroke();
      });
      /* street grain per city */
      CITIES.forEach(function (c) {
        var center = project(c.lat, c.lng);
        var R = c.r * scale() * 2.0;
        if (center[0] < -R || center[0] > W + R || center[1] < -R || center[1] > H + R) return;
        var n = Math.min(140, Math.floor(R / 3));
        for (var i = 0; i < n; i++) {
          var a = rnd(c.seed + i) * Math.PI * 2;
          var d = Math.sqrt(rnd(c.seed + i * 3 + 1)) * R;
          var x = center[0] + Math.cos(a) * d, y = center[1] + Math.sin(a) * d * 0.72;
          var horiz = rnd(c.seed + i * 7) > 0.5;
          var len = (6 + rnd(c.seed + i * 13) * 26) * (R / 260);
          var wgt = rnd(c.seed + i * 17);
          ctx.strokeStyle = wgt > 0.8 ? COL.streetLite : COL.street;
          ctx.lineWidth = wgt > 0.8 ? 2 : 1;
          ctx.beginPath();
          if (horiz) { ctx.moveTo(x - len, y); ctx.lineTo(x + len, y); }
          else { ctx.moveTo(x, y - len); ctx.lineTo(x, y + len); }
          ctx.stroke();
        }
        /* park blobs */
        for (var k = 0; k < 4; k++) {
          var pa = rnd(c.seed * 3 + k) * Math.PI * 2, pd = Math.sqrt(rnd(c.seed * 5 + k)) * R * 0.8;
          var px = center[0] + Math.cos(pa) * pd, py = center[1] + Math.sin(pa) * pd * 0.7;
          ctx.fillStyle = COL.parkFill;
          ctx.beginPath(); ctx.ellipse(px, py, R * (0.06 + rnd(c.seed + k) * 0.05), R * 0.05, pa, 0, 7); ctx.fill();
        }
      });
      /* city labels at low zoom */
      if (z < 8.6) {
        ctx.fillStyle = COL.label; ctx.font = "600 10px 'Space Grotesk',sans-serif"; ctx.textAlign = "center";
        [["MANCHESTER", 53.52, -2.24], ["CHESHIRE", 53.27, -2.23], ["LONDON", 51.54, -0.12]].forEach(function (L) {
          var p = project(L[1], L[2]);
          ctx.save(); ctx.globalAlpha = 0.75;
          ctx.fillText(L[0].split("").join("  "), p[0], p[1]); ctx.restore();
        });
      }
      /* subtle vignette */
      var g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, "rgba(16,16,20,0)"); g.addColorStop(1, "rgba(6,6,9,.55)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    /* ── clustering ─────────────────────────────────────────────────────── */
    var pops = {};   /* pop-in progress per marker key — survives rebuilds */
    function buildMarkers() {
      markers = [];
      var pts = props.map(function (p) {
        var xy = project(p.lat, p.lng);
        return { p: p, x: xy[0], y: xy[1] };
      }).filter(function (m) { return m.x > -80 && m.x < W + 80 && m.y > -40 && m.y < H + 40; });
      var used = {};
      var thresh = 64;
      pts.forEach(function (m, i) {
        if (used[i]) return;
        var group = [m]; used[i] = 1;
        pts.forEach(function (n, j) {
          if (used[j] || i === j) return;
          if (Math.abs(n.x - m.x) < thresh && Math.abs(n.y - m.y) < 34) { group.push(n); used[j] = 1; }
        });
        if (group.length > 1 && cam.zoom < 10.5) {
          var cx = 0, cy = 0;
          group.forEach(function (g) { cx += g.x; cy += g.y; });
          markers.push({ cluster: group.map(function (g) { return g.p; }), x: cx / group.length, y: cy / group.length, key: "c:" + group.map(function (g) { return g.p.id; }).sort().join(",") });
        } else {
          group.forEach(function (g) { markers.push({ p: g.p, x: g.x, y: g.y, key: g.p.id }); });
        }
      });
    }

    function priceLabel(p) {
      var v = p.price;
      if (p.status === "rent") return "£" + (v >= 1000 ? (v / 1000).toFixed(1).replace(/\.0$/, "") + "k" : v) + " pcm";
      return v >= 1e6 ? "£" + (v / 1e6).toFixed(2).replace(/0$/, "").replace(/\.$/, "") + "m" : "£" + Math.round(v / 1000) + "k";
    }

    function drawMarkers(t) {
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      markers.forEach(function (m) {
        var hovered = m.p && (m.p.id === hoverId);
        var selected = m.p && (m.p.id === selectedId);
        pops[m.key] = Math.min(1, (pops[m.key] || 0) + 0.1);
        var k = reduced ? 1 : (1 - Math.pow(1 - pops[m.key], 3));
        if (m.cluster) {
          var r = 16 + Math.min(14, m.cluster.length * 1.6);
          ctx.beginPath(); ctx.arc(m.x, m.y, (r + 6) * k, 0, 7); ctx.fillStyle = COL.ring; ctx.fill();
          ctx.beginPath(); ctx.arc(m.x, m.y, r * k, 0, 7);
          ctx.fillStyle = COL.pin; ctx.fill();
          ctx.fillStyle = COL.pinInk; ctx.font = "700 12px 'Space Grotesk',sans-serif";
          ctx.fillText(m.cluster.length, m.x, m.y + 0.5);
          m.__r = r;
        } else {
          var label = priceLabel(m.p);
          ctx.font = "600 11px 'Space Grotesk',sans-serif";
          var w = ctx.measureText(label).width + 22, h = 26;
          var y = m.y - (hovered || selected ? 4 : 0);
          ctx.save(); ctx.globalAlpha = k;
          if (m.p.badges && m.p.badges.indexOf("sponsored") >= 0) {
            ctx.beginPath(); roundRect(m.x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4, 15);
            ctx.strokeStyle = COL.accent; ctx.lineWidth = 1; ctx.stroke();
          }
          ctx.beginPath(); roundRect(m.x - w / 2, y - h / 2, w, h, 13);
          ctx.fillStyle = hovered || selected ? COL.hover : COL.pin; ctx.fill();
          ctx.fillStyle = hovered || selected ? "#fff" : COL.pinInk;
          ctx.fillText(label, m.x, y + 0.5);
          /* stem */
          ctx.beginPath(); ctx.moveTo(m.x, y + h / 2); ctx.lineTo(m.x, y + h / 2 + 5);
          ctx.strokeStyle = hovered || selected ? COL.hover : COL.pin; ctx.lineWidth = 2; ctx.stroke();
          ctx.restore();
          m.__w = w; m.__h = h;
        }
      });
      /* draw polygon */
      if (drawPts.length || polygon) {
        var pts = polygon ? polygon.map(function (ll) { return project(ll[0], ll[1]); }) : drawPts;
        ctx.beginPath();
        pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
        if (polygon) ctx.closePath();
        ctx.strokeStyle = COL.accent; ctx.lineWidth = 1.6; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
        if (polygon) { ctx.fillStyle = "rgba(213,185,142,.08)"; ctx.fill(); }
      }
    }

    function roundRect(x, y, w, h, r) {
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    function frame() {
      raf = null;
      drawGround(); buildMarkers(); drawMarkers(performance.now() - t0);
      if (!reduced && markers.some(function (m) { return pops[m.key] < 1; })) schedule();
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(frame); }

    /* ── hit testing ────────────────────────────────────────────────────── */
    function hit(x, y) {
      for (var i = markers.length - 1; i >= 0; i--) {
        var m = markers[i];
        if (m.cluster) { var dx = x - m.x, dy = y - m.y; if (dx * dx + dy * dy < (m.__r || 20) * (m.__r || 20)) return m; }
        else if (Math.abs(x - m.x) < (m.__w || 50) / 2 && Math.abs(y - m.y) < 16) return m;
      }
      return null;
    }

    /* ── interaction ────────────────────────────────────────────────────── */
    canvas.style.touchAction = "none";
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", "Interactive property map. Use plus and minus to zoom, arrow keys to pan.");

    canvas.addEventListener("pointerdown", function (e) {
      canvas.setPointerCapture(e.pointerId);
      moved = false;
      if (drawMode) { drawPts.push([e.offsetX, e.offsetY]); schedule(); return; }
      pan = { x: e.offsetX, y: e.offsetY, lat: cam.lat, lng: cam.lng };
    });
    canvas.addEventListener("pointermove", function (e) {
      if (pan) {
        var s = scale();
        cam.lng = pan.lng - (e.offsetX - pan.x) / (s * 1.6);
        cam.lat = pan.lat + (e.offsetY - pan.y) / (s * 2.6);
        if (Math.abs(e.offsetX - pan.x) + Math.abs(e.offsetY - pan.y) > 4) moved = true;
        schedule(); emit("move");
        return;
      }
      var m = hit(e.offsetX, e.offsetY);
      var id = m && m.p ? m.p.id : null;
      canvas.style.cursor = drawMode ? "crosshair" : (m ? "pointer" : "grab");
      if (id !== hoverId) { hoverId = id; schedule(); emit("hover", id); }
    });
    canvas.addEventListener("pointerup", function (e) {
      pan = null;
      if (drawMode || moved) return;
      var m = hit(e.offsetX, e.offsetY);
      if (!m) { selectedId = null; schedule(); emit("select", null); return; }
      if (m.cluster) { flyTo(avgLat(m.cluster), avgLng(m.cluster), Math.min(12, cam.zoom + 1.6)); return; }
      selectedId = m.p.id; schedule(); emit("select", m.p.id);
    });
    canvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      var before = unproject(e.offsetX, e.offsetY);
      cam.zoom = clamp(cam.zoom - e.deltaY * 0.0016, 5.4, 13);
      var after = unproject(e.offsetX, e.offsetY);
      cam.lng += before.lng - after.lng; cam.lat += before.lat - after.lat;
      schedule(); emit("move");
    }, { passive: false });
    canvas.addEventListener("keydown", function (e) {
      var step = 30 / scale();
      if (e.key === "+" || e.key === "=") cam.zoom = clamp(cam.zoom + 0.5, 5.4, 13);
      else if (e.key === "-") cam.zoom = clamp(cam.zoom - 0.5, 5.4, 13);
      else if (e.key === "ArrowLeft") cam.lng -= step;
      else if (e.key === "ArrowRight") cam.lng += step;
      else if (e.key === "ArrowUp") cam.lat += step * 0.6;
      else if (e.key === "ArrowDown") cam.lat -= step * 0.6;
      else return;
      e.preventDefault(); schedule(); emit("move");
    });
    /* pinch */
    var pinch = null;
    canvas.addEventListener("touchstart", function (e) { if (e.touches.length === 2) pinch = dist(e); }, { passive: true });
    canvas.addEventListener("touchmove", function (e) {
      if (e.touches.length === 2 && pinch) {
        var d = dist(e); cam.zoom = clamp(cam.zoom + (d - pinch) * 0.008, 5.4, 13); pinch = d; schedule(); emit("move");
      }
    }, { passive: true });
    function dist(e) { var a = e.touches[0], b = e.touches[1]; return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function avgLat(list) { return list.reduce(function (s, p) { return s + p.lat; }, 0) / list.length; }
    function avgLng(list) { return list.reduce(function (s, p) { return s + p.lng; }, 0) / list.length; }

    function flyTo(lat, lng, zoom, instant) {
      if (reduced || instant) { cam.lat = lat; cam.lng = lng; cam.zoom = zoom; schedule(); emit("move"); return; }
      var from = { lat: cam.lat, lng: cam.lng, zoom: cam.zoom }, t0 = performance.now(), dur = 700;
      (function step(t) {
        var k = Math.min(1, (t - t0) / dur); k = 1 - Math.pow(1 - k, 3);
        cam.lat = from.lat + (lat - from.lat) * k;
        cam.lng = from.lng + (lng - from.lng) * k;
        cam.zoom = from.zoom + (zoom - from.zoom) * k;
        schedule();
        if (k < 1) requestAnimationFrame(step); else emit("move");
      })(t0);
    }

    /* ── events out ─────────────────────────────────────────────────────── */
    var handlers = {};
    function emit(ev, arg) { (handlers[ev] || []).forEach(function (fn) { fn(arg); }); }

    /* ── resize ─────────────────────────────────────────────────────────── */
    function resize() {
      var r = canvas.parentElement.getBoundingClientRect();
      W = Math.max(200, r.width); H = Math.max(200, r.height);
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      schedule();
    }
    new ResizeObserver(resize).observe(canvas.parentElement);
    resize();

    /* ── public surface ─────────────────────────────────────────────────── */
    return {
      setData: function (rows) { props = rows || []; pops = {}; schedule(); },
      on: function (ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); },
      hover: function (id) { if (id !== hoverId) { hoverId = id; schedule(); } },
      select: function (id) { selectedId = id; schedule(); },
      flyTo: flyTo,
      bounds: bounds,
      fit: function (rows) {
        var list = rows && rows.length ? rows : props;
        if (!list.length) return;
        var lats = list.map(function (p) { return p.lat; }), lngs = list.map(function (p) { return p.lng; });
        var la = (Math.min.apply(0, lats) + Math.max.apply(0, lats)) / 2;
        var ln = (Math.min.apply(0, lngs) + Math.max.apply(0, lngs)) / 2;
        var span = Math.max(Math.max.apply(0, lats) - Math.min.apply(0, lats), (Math.max.apply(0, lngs) - Math.min.apply(0, lngs)) * 0.62, 0.02);
        flyTo(la, ln, clamp(Math.log2((H / 2.6) / (span * 1.55)), 5.4, 12.2), true);
      },
      drawStart: function () { drawMode = true; drawPts = []; polygon = null; canvas.style.cursor = "crosshair"; schedule(); },
      drawFinish: function () {
        drawMode = false; canvas.style.cursor = "grab";
        if (drawPts.length > 2) {
          polygon = drawPts.map(function (p) { var ll = unproject(p[0], p[1]); return [ll.lat, ll.lng]; });
        }
        drawPts = []; schedule();
        return polygon;
      },
      drawClear: function () { polygon = null; drawPts = []; drawMode = false; schedule(); },
      inPolygon: function (p) {
        if (!polygon) return true;
        var inside = false;
        for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
          var yi = polygon[i][0], xi = polygon[i][1], yj = polygon[j][0], xj = polygon[j][1];
          if ((yi > p.lat) !== (yj > p.lat) && p.lng < (xj - xi) * (p.lat - yi) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
      },
      hasPolygon: function () { return !!polygon; },
      zoomBy: function (dz) { cam.zoom = clamp(cam.zoom + dz, 5.4, 13); schedule(); emit("move"); }
    };
  }

  window.HAL = window.HAL || {};
  window.HAL.map = { create: Map };
})();
