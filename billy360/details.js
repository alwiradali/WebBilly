/* billy360 · property details
   Renders the listing's facts into a sheet: rent, bedrooms, bathrooms, EPC,
   features and the agent, with the three ways to get in touch — Book a
   viewing (the lead form), Call and WhatsApp. Pure DOM, no markup strings
   from the data: every value is a text node. Used by app.js (openDetails)
   in the tour view; the same block could serve any host element. */
(function () {
  "use strict";

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function icon(name) {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    var u = document.createElementNS("http://www.w3.org/2000/svg", "use");
    u.setAttribute("href", "#i-" + name);
    s.appendChild(u);
    return s;
  }
  function digits(n) { return String(n || "").replace(/[^0-9+]/g, ""); }
  function waDigits(n) {
    var d = String(n || "").replace(/[^0-9]/g, "");
    if (!d) return "";
    if (d.indexOf("0") === 0) d = "44" + d.slice(1);   // a UK number typed the local way
    return d;
  }
  function str(v) { return v == null ? "" : String(v); }

  /* facts worth a row, in the order a tenant reads them */
  function facts(p) {
    var out = [];
    if (p.price) out.push(["Rent", str(p.price) + (p.priceQualifier && !/pcm|month|week|pw/i.test(p.price) ? " " + p.priceQualifier : "")]);
    if (p.beds != null && p.beds !== "") out.push(["Bedrooms", str(p.beds)]);
    if (p.baths != null && p.baths !== "") out.push(["Bathrooms", str(p.baths)]);
    if (p.receptions) out.push(["Receptions", str(p.receptions)]);
    if (p.propertyType) out.push(["Type", str(p.propertyType)]);
    if (p.furnishing) out.push(["Furnishing", str(p.furnishing)]);
    if (p.epc) out.push(["EPC", str(p.epc)]);
    if (p.availability) out.push(["Available", str(p.availability)]);
    if (p.councilTax) out.push(["Council tax", str(p.councilTax)]);
    if (p.ref) out.push(["Reference", str(p.ref)]);
    return out;
  }

  /* render(host, {project, agent, onBook, onCall, onWhatsApp}) → { actions: [buttons] }
     host is emptied first; the returned buttons let the caller put them in a footer */
  function render(host, o) {
    o = o || {};
    var p = o.project || {}, ag = o.agent || p.agent || {};
    host.innerHTML = "";

    var head = el("div", "det-head");
    if (p.price) head.appendChild(el("b", "det-price", str(p.price)));
    var line = [p.location, p.propertyType].filter(Boolean).join(" · ");
    if (line) head.appendChild(el("p", "det-line", line));
    if (p.status) head.appendChild(el("span", "chip chip--accent det-status", str(p.status)));
    if (head.childNodes.length) host.appendChild(head);

    var rows = facts(p);
    if (rows.length) {
      var dl = el("dl", "dl det-facts");
      rows.forEach(function (r) { dl.appendChild(el("dt", null, r[0])); dl.appendChild(el("dd", null, r[1])); });
      host.appendChild(dl);
    }

    if (p.summary) host.appendChild(el("p", "t-body det-summary", str(p.summary)));

    var feats = Array.isArray(p.features) ? p.features.filter(Boolean) : [];
    if (feats.length) {
      host.appendChild(el("p", "side-label", "Features"));
      var ul = el("ul", "det-features");
      feats.forEach(function (f) { ul.appendChild(el("li", null, str(f))); });
      host.appendChild(ul);
    }

    if (ag.name || ag.phone || ag.email) {
      host.appendChild(el("p", "side-label", "Agent"));
      var card = el("div", "det-agent");
      if (ag.name) card.appendChild(el("b", null, str(ag.name)));
      if (ag.phone) card.appendChild(el("span", null, str(ag.phone)));
      if (ag.email) card.appendChild(el("span", null, str(ag.email)));
      host.appendChild(card);
    }

    var actions = [];
    if (o.onBook) {
      var book = el("button", "btn btn--primary det-book", "Book a viewing");
      book.id = "btnDetailsBook";
      book.insertBefore(icon("check"), book.firstChild);
      book.onclick = function () { o.onBook(); };
      actions.push(book);
    }
    if (digits(ag.phone)) {
      var call = el("button", "btn det-call", "Call");
      call.id = "btnDetailsCall";
      call.insertBefore(icon("phone"), call.firstChild);
      call.onclick = function () {
        if (o.onCall) o.onCall(ag.phone);
        else location.href = "tel:" + digits(ag.phone);
      };
      actions.push(call);
    }
    if (waDigits(ag.whatsapp || ag.phone)) {
      var wa = el("button", "btn det-wa", "WhatsApp");
      wa.id = "btnDetailsWhatsApp";
      wa.insertBefore(icon("wa"), wa.firstChild);
      wa.onclick = function () {
        var num = waDigits(ag.whatsapp || ag.phone);
        if (o.onWhatsApp) o.onWhatsApp(num);
        else window.open("https://wa.me/" + num, "_blank", "noopener");
      };
      actions.push(wa);
    }
    return { actions: actions, facts: rows };
  }

  /* is there anything to show? (the buttons that open the sheet ask this) */
  function has(project, agent) {
    var p = project || {}, ag = agent || p.agent || {};
    return !!(facts(p).length || (Array.isArray(p.features) && p.features.length) || ag.phone || ag.email || ag.name);
  }

  window.BILLY360Details = { render: render, has: has, facts: facts };
})();
