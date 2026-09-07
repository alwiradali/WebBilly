/* billy360 · floor-plan sanitiser
   A floor plan is SVG markup stored with the tour. Before it goes anywhere
   near innerHTML it is parsed and rebuilt from an allow-list that mirrors the
   server's (worker/studio/tours.js sanitisePlan) exactly: drawing elements
   and geometry/paint attributes only, and the one link allowed is an uploaded
   image under /media/. Everything else — script, foreignObject, use, a, style,
   animate*, on*, xlink:href, id, comments — is dropped with its content.
   Runs in every mode, the shipped demo tours included. */
(function () {
  "use strict";
  var SVG = "http://www.w3.org/2000/svg";
  var ELEMENTS = { rect: 1, path: 1, circle: 1, ellipse: 1, line: 1, polyline: 1, polygon: 1, g: 1, text: 1, tspan: 1, image: 1 };
  var ATTRS = { "class": 1, x: 1, y: 1, width: 1, height: 1, rx: 1, ry: 1, cx: 1, cy: 1, r: 1, d: 1, points: 1, transform: 1,
    fill: 1, stroke: 1, "stroke-width": 1, opacity: 1, "font-size": 1, "font-family": 1, "text-anchor": 1 };
  var HREF = /^\/media\/[A-Za-z0-9._\/-]+$/;
  /* a paint value must never smuggle a URL reference in (url(#…) / url(data:…)) */
  var PAINT_URL = /url\s*\(/i;

  function copy(src, out) {
    var kids = src.childNodes;
    for (var i = 0; i < kids.length; i++) {
      var n = kids[i];
      if (n.nodeType === 3) { out.appendChild(document.createTextNode(n.nodeValue)); continue; }
      if (n.nodeType !== 1) continue;                       // comments, processing instructions
      var tag = String(n.localName || n.nodeName).toLowerCase();
      if (tag === "svg") { copy(n, out); continue; }        // a pasted whole document: keep its drawing
      if (!ELEMENTS[tag]) continue;                         // dropped with its content
      var e = document.createElementNS(SVG, tag);
      for (var a = 0; a < n.attributes.length; a++) {
        var at = n.attributes[a], name = String(at.name).toLowerCase(), v = String(at.value);
        if (name === "href") { if (tag === "image" && HREF.test(v)) e.setAttribute("href", v); continue; }
        if (!ATTRS[name]) continue;                          // on*, style, xlink:href, id, …
        if ((name === "fill" || name === "stroke") && PAINT_URL.test(v)) continue;
        e.setAttribute(name, v);
      }
      copy(n, e);
      out.appendChild(e);
    }
  }

  /* sanitize(markup) → DocumentFragment of SVG nodes, safe to append into an <svg> */
  function sanitize(markup) {
    var frag = document.createDocumentFragment();
    var src = markup == null ? "" : String(markup);
    if (!src.trim() || typeof DOMParser === "undefined") return frag;
    var doc;
    try {
      /* parsed as HTML: an unbalanced or hostile string can never throw its
         way out, and foreign content still arrives as elements we can walk */
      doc = new DOMParser().parseFromString("<svg xmlns=\"" + SVG + "\">" + src + "</svg>", "text/html");
    } catch (e) { return frag; }
    var root = doc && doc.body && doc.body.querySelector("svg");
    if (!root) return frag;
    copy(root, frag);
    return frag;
  }

  /* the same rules as a string — for previews and tests */
  function toString(markup) {
    var s = document.createElementNS(SVG, "svg");
    s.appendChild(sanitize(markup));
    return s.innerHTML;
  }

  window.BILLY360Plan = { sanitize: sanitize, toString: toString, ELEMENTS: ELEMENTS, ATTRS: ATTRS };
})();
