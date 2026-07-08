/* Hale & Marsh — bespoke law firm: practice-area explorer (tabs swap the
   detail panel) + a consultation request form with confirmation. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var AREAS = {
    corporate: { title: "Corporate & Commercial", lead: "For businesses at every stage",
      desc: "From incorporation to exit, we handle the deals and documents that keep a company moving — with commercial instincts, not just legal ones.",
      items: ["Company formation & governance", "Shareholder agreements", "Mergers & acquisitions", "Commercial contracts", "Fundraising & investment", "Business sales & exits"], cta: "Discuss a corporate matter" },
    litigation: { title: "Dispute Resolution", lead: "When it has to be resolved",
      desc: "We prepare every case as if it's going to trial — which is often why it doesn't. Pragmatic first, tenacious when it counts.",
      items: ["Commercial disputes", "Contract & debt claims", "Mediation & arbitration", "Professional negligence", "Injunctions", "Trial advocacy"], cta: "Discuss a dispute" },
    property: { title: "Property & Real Estate", lead: "Moves that complete on time",
      desc: "Residential and commercial property handled without the wait — clear timelines, proactive updates and no surprises at completion.",
      items: ["Residential conveyancing", "Commercial leases", "Property development", "Landlord & tenant", "Land transactions", "Planning agreements"], cta: "Discuss a property matter" },
    family: { title: "Family & Private Client", lead: "Handled with care",
      desc: "Sensitive matters need a steady hand. We give clear options and protect what matters most — quietly and constructively.",
      items: ["Divorce & separation", "Children arrangements", "Prenuptial agreements", "Wills & probate", "Lasting powers of attorney", "Trusts & estate planning"], cta: "Discuss a private matter" },
    employment: { title: "Employment", lead: "For employers and individuals",
      desc: "From contracts and policies to the hardest people decisions, we advise both sides of the table with the same clear head.",
      items: ["Contracts & handbooks", "Settlement agreements", "Tribunal claims", "Redundancy & restructuring", "Discrimination advice", "TUPE transfers"], cta: "Discuss an employment matter" },
    ip: { title: "IP & Technology", lead: "Protecting what you build",
      desc: "The law that keeps pace with your product — protecting ideas, licensing them well and getting the contracts right the first time.",
      items: ["Trade marks & brand", "IP licensing", "Software & SaaS contracts", "Data protection & GDPR", "Confidentiality & NDAs", "Tech disputes"], cta: "Discuss an IP matter" },
  };

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

    /* practice-area explorer */
    var tabs = $$("#paTabs .pa-tab");
    function setArea(key) {
      var a = AREAS[key]; if (!a) return;
      tabs.forEach(function (t) { t.classList.toggle("on", t.getAttribute("data-p") === key); });
      $("#paTitle").textContent = a.title;
      $("#paLead").textContent = a.lead;
      $("#paDesc").textContent = a.desc;
      $("#paList").innerHTML = a.items.map(function (i) { return "<li>" + i + "</li>"; }).join("");
      $("#paCta").textContent = a.cta;
      $("#paCta").dataset.matter = a.title;
    }
    $("#paTabs").addEventListener("click", function (e) { var b = e.target.closest(".pa-tab"); if (b) setArea(b.getAttribute("data-p")); });
    setArea("corporate");
    // clicking the panel CTA preselects the matter in the form
    $("#paCta").addEventListener("click", function () {
      var m = this.dataset.matter, sel = $("#cMatter");
      $$("option", sel).forEach(function (o) { if (o.textContent.replace(/&amp;/g, "&") === m) sel.value = o.value; });
    });

    /* consultation form */
    var form = $("#consultForm"), ok = $("#cformOk");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("#cName").value.trim(), email = $("#cEmail").value.trim();
      if (!name) { $("#cName").focus(); return; }
      if (!/.+@.+\..+/.test(email)) { $("#cEmail").focus(); return; }
      $("#cformMsg").textContent = "Thank you, " + name.split(" ")[0] + " — a " + $("#cMatter").value.toLowerCase() +
        " solicitor at Hale & Marsh will be in touch within one business day.";
      form.style.display = "none"; ok.classList.add("show");
    });
  });
})();
