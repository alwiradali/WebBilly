/* ============================================================
   HeatFix Mcr Limited — invoice templates
   ============================================================
   Eight designs, one set of data. The same code draws the preview he sees
   while typing and the copy the customer opens, so what he approves is
   exactly what lands in their inbox.

   Every template is a legal UK VAT invoice when he is VAT registered: the
   VAT number, the rate, the VAT shown as its own line, and a tax point
   (the date it was issued). Those are not styling choices, so no template
   is allowed to drop them.

   Exposed as window.HFInvoice — no modules, no build step.
   ============================================================ */
(function (w) {
  "use strict";

  /* ------------------------------------------------------------ helpers */
  function esc(s) {
    return String(s ?? "").replace(/[<>&"]/g, function (c) {
      return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c];
    });
  }
  /* Free text the engineer typed. Newlines are meaningful in an address. */
  function escLines(s) {
    return esc(s).replace(/\r?\n/g, "<br>");
  }
  function money(p) {
    var n = (Number(p) || 0) / 100;
    return "£" + n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function qty(n) {
    var v = Number(n) || 0;
    return v % 1 === 0 ? String(v) : v.toFixed(2).replace(/0$/, "");
  }
  function date(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return esc(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }
  function rate(bp) {
    var v = (Number(bp) || 0) / 100;
    return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(2)) + "%";
  }
  /* A readable text colour for whatever accent he picks. */
  function onAccent(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
    if (!m) return "#ffffff";
    var n = parseInt(m[1], 16);
    var lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return lum > 0.62 ? "#10233f" : "#ffffff";
  }
  function mix(hex, withHex, amount) {
    var a = /^#?([0-9a-f]{6})$/i.exec(String(hex || "")), b = /^#?([0-9a-f]{6})$/i.exec(String(withHex || ""));
    if (!a || !b) return hex || "#0B2E63";
    var A = parseInt(a[1], 16), B = parseInt(b[1], 16), out = "#";
    for (var s = 16; s >= 0; s -= 8) {
      var v = Math.round((((A >> s) & 255) * (1 - amount)) + (((B >> s) & 255) * amount));
      out += v.toString(16).padStart(2, "0");
    }
    return out;
  }

  /* ------------------------------------------------------------- catalogue */
  var TEMPLATES = [
    { id: "classic",   name: "Classic",   note: "Navy band, logo left. The safe one." },
    { id: "minimal",   name: "Minimal",   note: "No fills. Hairlines and white space." },
    { id: "bold",      name: "Bold",      note: "Big total, hard to misread." },
    { id: "slate",     name: "Slate",     note: "Dark header, logo reversed out." },
    { id: "letter",    name: "Letterhead", note: "Serif, centred. Reads formal." },
    { id: "compact",   name: "Compact",   note: "Tight. For jobs with many lines." },
    { id: "trade",     name: "Trade",     note: "Van livery. Always orange, Gas Safe badge on." },
    { id: "statement", name: "Statement", note: "Ruled and columned. Accountant friendly." }
  ];

  /* --------------------------------------------------------------- pieces */
  /* `onDark` is worked out from the actual colour behind the logo, not from
     the template name — the accent is his to change, and the standard navy
     lockup vanishes the moment it lands on a dark band. His own uploaded
     logo is used exactly as supplied; we cannot reverse an image for him. */
  function logoImg(b, onDark) {
    var src = b.logo_data;
    if (!src) src = onDark ? "/assets/heatfix/logo-lockup-rev-600.webp"
                           : "/assets/heatfix/logo-lockup-600.webp";
    return '<img class="hf-logo" src="' + esc(src) + '" alt="' + esc(b.name || "HeatFix Mcr Limited") + '">';
  }

  function fromBlock(b) {
    var bits = [];
    if (b.address) bits.push(escLines(b.address));
    if (b.postcode) bits.push(esc(b.postcode));
    if (b.phone) bits.push(esc(b.phone));
    if (b.email) bits.push(esc(b.email));
    if (b.website) bits.push(esc(b.website));
    return bits.join("<br>");
  }

  /* The same details on one flowing line. A stacked address costs six lines
     of height, which is the difference between one sheet of A4 and two. */
  function fromInline(b) {
    var bits = [];
    if (b.address) bits.push(String(b.address).split(/\r?\n/).filter(Boolean).map(esc).join(", "));
    if (b.postcode) bits.push(esc(b.postcode));
    if (b.phone) bits.push(esc(b.phone));
    if (b.email) bits.push(esc(b.email));
    if (b.website) bits.push(esc(b.website));
    return bits.join(" &nbsp;·&nbsp; ");
  }

  function toBlock(inv) {
    var bits = [];
    if (inv.cust_address) bits.push(escLines(inv.cust_address));
    if (inv.cust_postcode) bits.push(esc(inv.cust_postcode));
    if (inv.cust_phone) bits.push(esc(inv.cust_phone));
    if (inv.cust_email) bits.push(esc(inv.cust_email));
    return bits.join("<br>");
  }

  /* Registration numbers a customer may need to check him out, and which
     Companies House and HMRC require on the document. */
  function legalLine(b) {
    var bits = [];
    if (b.company_no) bits.push("Company no. " + esc(b.company_no));
    if (b.vat_number) bits.push("VAT no. " + esc(b.vat_number));
    if (b.gas_safe_no) bits.push("Gas Safe " + esc(b.gas_safe_no));
    return bits.join(" &nbsp;·&nbsp; ");
  }

  function itemRows(inv) {
    var items = inv.items || [];
    if (!items.length) {
      return '<tr class="hf-empty"><td colspan="4">No work has been listed on this invoice yet.</td></tr>';
    }
    return items.map(function (it) {
      return '<tr>' +
        '<td class="hf-desc">' + escLines(it.description) + '</td>' +
        '<td class="hf-num">' + qty(it.qty) + '</td>' +
        '<td class="hf-num">' + money(it.unit_pence) + '</td>' +
        '<td class="hf-num hf-line">' + money(it.line_pence) + '</td>' +
        '</tr>';
    }).join("");
  }

  function itemsTable(inv) {
    return '<table class="hf-items"><thead><tr>' +
      '<th class="hf-desc">Work carried out</th>' +
      '<th class="hf-num">Qty</th>' +
      '<th class="hf-num">Unit</th>' +
      '<th class="hf-num">Amount</th>' +
      '</tr></thead><tbody>' + itemRows(inv) + '</tbody></table>';
  }

  /* The money block. VAT gets its own line whenever he is registered, even
     at 0%, because "VAT included" without a figure is not a VAT invoice. */
  function totalsBlock(inv, b) {
    var vatShown = !!b.vat_number || inv.vat_pence > 0;
    var due = (inv.gross_pence || 0) - (inv.paid_pence || 0);
    var rows = '<div class="hf-trow"><span>Subtotal</span><b>' + money(inv.net_pence) + '</b></div>';
    if (vatShown) {
      rows += '<div class="hf-trow"><span>VAT at ' + rate(inv.vat_rate) + '</span><b>' + money(inv.vat_pence) + '</b></div>';
    }
    rows += '<div class="hf-trow hf-gross"><span>Total</span><b>' + money(inv.gross_pence) + '</b></div>';
    if (inv.paid_pence) {
      rows += '<div class="hf-trow"><span>Already paid</span><b>&minus;' + money(inv.paid_pence) + '</b></div>' +
              '<div class="hf-trow hf-due"><span>Amount due</span><b>' + money(due) + '</b></div>';
    }
    return '<div class="hf-totals">' + rows + '</div>';
  }

  function payBlock(b) {
    var bits = [];
    if (b.bank_name) bits.push('<div><span>Bank</span>' + esc(b.bank_name) + '</div>');
    if (b.bank_sort) bits.push('<div><span>Sort code</span>' + esc(b.bank_sort) + '</div>');
    if (b.bank_account) bits.push('<div><span>Account</span>' + esc(b.bank_account) + '</div>');
    if (!bits.length && !b.payment_terms) return "";
    return '<div class="hf-pay">' +
      (bits.length ? '<h4>How to pay</h4><div class="hf-bank">' + bits.join("") + '</div>' : "") +
      (b.payment_terms ? '<p class="hf-terms">' + escLines(b.payment_terms) + '</p>' : "") +
      '</div>';
  }

  /* The review ask. It sits in the footer row beside the bank details, so on
     a normal job it costs no extra height — the QR is shorter than the
     "how to pay" block it stands next to. Drawn from the link at render
     time, so changing the link changes every future invoice. */
  function reviewBlock(b) {
    if (!b.review_url || !w.HFQR) return "";
    var qr;
    try {
      qr = w.HFQR.svg(b.review_url, { size: 82, label: "Scan to leave a Google review" });
    } catch (e) {
      return "";                    /* never let a bad link break the invoice */
    }
    return '<div class="hf-review">' + qr +
      '<span>Happy with the job?<br><b>Scan to leave a review</b></span></div>';
  }

  function notesBlock(inv) {
    if (!inv.notes) return "";
    return '<div class="hf-notes"><h4>Notes</h4><p>' + escLines(inv.notes) + '</p></div>';
  }

  /* Draft and void copies must say so, loudly, so an unfinished sheet is
     never mistaken for a bill. */
  function stampFor(inv) {
    if (inv.status === "void") return '<div class="hf-stamp hf-stamp-void">Void</div>';
    if (inv.status === "draft") return '<div class="hf-stamp hf-stamp-draft">Draft</div>';
    if (inv.status === "paid") return '<div class="hf-stamp hf-stamp-paid">Paid</div>';
    return "";
  }

  /* -------------------------------------------------------------- layouts */
  /* Each layout gets the same data and returns the sheet's inner markup.
     Shared pieces above keep the legal content identical across all eight. */

  function metaRows(inv, b) {
    var rows = [["Invoice", esc(inv.number)]];
    rows.push(["Date", date(inv.issued_at || inv.created_at)]);
    if (inv.due_at) rows.push(["Due", date(inv.due_at)]);
    if (b.vat_number) rows.push(["VAT no.", esc(b.vat_number)]);
    return rows.map(function (r) {
      return '<div class="hf-mrow"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>';
    }).join("");
  }

  var LAYOUT = {

    classic: function (inv, b, ctx) {
      return '' +
        '<header class="hf-head">' + logoImg(b, ctx.onDark) +
          '<div class="hf-headmeta"><div class="hf-title">Invoice</div>' +
          '<div class="hf-no">' + esc(inv.number) + '</div></div>' +
        '</header>' +
        '<div class="hf-body">' +
          '<div class="hf-cols">' +
            '<div class="hf-party"><h4>From</h4><b>' + esc(b.name) + '</b><p>' + fromBlock(b) + '</p></div>' +
            '<div class="hf-party"><h4>Invoice to</h4><b>' + esc(inv.cust_name) + '</b><p>' + toBlock(inv) + '</p></div>' +
            '<div class="hf-meta">' + metaRows(inv, b) + '</div>' +
          '</div>' +
          (inv.work_summary ? '<p class="hf-summary">' + escLines(inv.work_summary) + '</p>' : "") +
          itemsTable(inv) + totalsBlock(inv, b) +
          '<div class="hf-foot2">' + payBlock(b) + notesBlock(inv) + reviewBlock(b) + '</div>' +
        '</div>' +
        '<footer class="hf-foot">' + legalLine(b) + '</footer>';
    },

    minimal: function (inv, b, ctx) {
      return '' +
        '<header class="hf-head">' +
          '<div class="hf-title">Invoice</div>' +
          '<div class="hf-no">' + esc(inv.number) + '</div>' +
        '</header>' +
        '<div class="hf-body">' +
          '<div class="hf-cols">' +
            '<div class="hf-party"><h4>From</h4><b>' + esc(b.name) + '</b><p>' + fromBlock(b) + '</p></div>' +
            '<div class="hf-party"><h4>To</h4><b>' + esc(inv.cust_name) + '</b><p>' + toBlock(inv) + '</p></div>' +
            '<div class="hf-meta">' + metaRows(inv, b) + '</div>' +
          '</div>' +
          (inv.work_summary ? '<p class="hf-summary">' + escLines(inv.work_summary) + '</p>' : "") +
          itemsTable(inv) + totalsBlock(inv, b) +
          '<div class="hf-foot2">' + payBlock(b) + notesBlock(inv) + reviewBlock(b) + '</div>' +
        '</div>' +
        '<footer class="hf-foot">' + esc(b.name) + '<br>' + legalLine(b) + '</footer>';
    },

    bold: function (inv, b, ctx) {
      var due = (inv.gross_pence || 0) - (inv.paid_pence || 0);
      return '' +
        '<header class="hf-head">' + logoImg(b, ctx.onDark) +
          '<div class="hf-title">Invoice</div>' +
        '</header>' +
        '<div class="hf-shout">' +
          '<div class="hf-shout-l"><span>Amount due</span><b>' + money(due) + '</b></div>' +
          '<div class="hf-shout-r">' + metaRows(inv, b) + '</div>' +
        '</div>' +
        '<div class="hf-body">' +
          '<div class="hf-cols hf-cols2">' +
            '<div class="hf-party"><h4>From</h4><b>' + esc(b.name) + '</b><p>' + fromBlock(b) + '</p></div>' +
            '<div class="hf-party"><h4>Invoice to</h4><b>' + esc(inv.cust_name) + '</b><p>' + toBlock(inv) + '</p></div>' +
          '</div>' +
          (inv.work_summary ? '<p class="hf-summary">' + escLines(inv.work_summary) + '</p>' : "") +
          itemsTable(inv) + totalsBlock(inv, b) +
          '<div class="hf-foot2">' + payBlock(b) + notesBlock(inv) + reviewBlock(b) + '</div>' +
        '</div>' +
        '<footer class="hf-foot">' + legalLine(b) + '</footer>';
    },

    slate: function (inv, b, ctx) {
      return '' +
        '<header class="hf-head">' +
          '<div class="hf-headl">' + logoImg(b, ctx.onDark) + '</div>' +
          '<div class="hf-headmeta"><div class="hf-title">Invoice</div>' +
            '<div class="hf-no">' + esc(inv.number) + '</div>' +
            '<div class="hf-headdate">' + date(inv.issued_at || inv.created_at) + '</div></div>' +
        '</header>' +
        '<div class="hf-body">' +
          '<div class="hf-cols">' +
            '<div class="hf-party"><h4>From</h4><b>' + esc(b.name) + '</b><p>' + fromBlock(b) + '</p></div>' +
            '<div class="hf-party"><h4>Invoice to</h4><b>' + esc(inv.cust_name) + '</b><p>' + toBlock(inv) + '</p></div>' +
            '<div class="hf-meta">' + metaRows(inv, b) + '</div>' +
          '</div>' +
          (inv.work_summary ? '<p class="hf-summary">' + escLines(inv.work_summary) + '</p>' : "") +
          itemsTable(inv) + totalsBlock(inv, b) +
          '<div class="hf-foot2">' + payBlock(b) + notesBlock(inv) + reviewBlock(b) + '</div>' +
        '</div>' +
        '<footer class="hf-foot">' + legalLine(b) + '</footer>';
    },

    letter: function (inv, b, ctx) {
      return '' +
        '<header class="hf-head">' + logoImg(b, ctx.onDark) +
          '<div class="hf-letterhead">' + esc(b.name) + '</div>' +
          '<div class="hf-letteraddr">' + fromInline(b) + '</div>' +
        '</header>' +
        '<div class="hf-body">' +
          '<div class="hf-title">Invoice</div>' +
          '<div class="hf-cols hf-cols2">' +
            '<div class="hf-party"><h4>Invoice to</h4><b>' + esc(inv.cust_name) + '</b><p>' + toBlock(inv) + '</p></div>' +
            '<div class="hf-meta">' + metaRows(inv, b) + '</div>' +
          '</div>' +
          (inv.work_summary ? '<p class="hf-summary">' + escLines(inv.work_summary) + '</p>' : "") +
          itemsTable(inv) + totalsBlock(inv, b) +
          '<div class="hf-foot2">' + payBlock(b) + notesBlock(inv) + reviewBlock(b) + '</div>' +
        '</div>' +
        '<footer class="hf-foot">' + legalLine(b) + '</footer>';
    },

    compact: function (inv, b, ctx) {
      return '' +
        '<header class="hf-head">' + logoImg(b, ctx.onDark) +
          '<div class="hf-headmeta"><div class="hf-title">Invoice ' + esc(inv.number) + '</div>' +
          '<div class="hf-headdate">' + date(inv.issued_at || inv.created_at) +
            (inv.due_at ? " &nbsp;·&nbsp; due " + date(inv.due_at) : "") + '</div></div>' +
        '</header>' +
        '<div class="hf-body">' +
          '<div class="hf-cols">' +
            '<div class="hf-party"><h4>From</h4><b>' + esc(b.name) + '</b><p>' + fromBlock(b) + '</p></div>' +
            '<div class="hf-party"><h4>Invoice to</h4><b>' + esc(inv.cust_name) + '</b><p>' + toBlock(inv) + '</p></div>' +
            '<div class="hf-meta">' + metaRows(inv, b) + '</div>' +
          '</div>' +
          (inv.work_summary ? '<p class="hf-summary">' + escLines(inv.work_summary) + '</p>' : "") +
          itemsTable(inv) + totalsBlock(inv, b) +
          '<div class="hf-foot2">' + payBlock(b) + notesBlock(inv) + reviewBlock(b) + '</div>' +
        '</div>' +
        '<footer class="hf-foot">' + legalLine(b) + '</footer>';
    },

    trade: function (inv, b, ctx) {
      var badge = b.gas_safe_no
        ? '<div class="hf-badge"><img src="/assets/heatfix/gas-safe.svg" alt="Gas Safe registered">' +
          '<span>Registered<br><b>' + esc(b.gas_safe_no) + '</b></span></div>'
        : "";
      return '' +
        '<header class="hf-head">' + logoImg(b, ctx.onDark) +
          '<div class="hf-headmeta"><div class="hf-title">Invoice</div>' +
          '<div class="hf-no">' + esc(inv.number) + '</div></div>' +
        '</header>' +
        '<div class="hf-rule"></div>' +
        '<div class="hf-body">' +
          '<div class="hf-cols">' +
            '<div class="hf-party"><h4>From</h4><b>' + esc(b.name) + '</b><p>' + fromBlock(b) + '</p></div>' +
            '<div class="hf-party"><h4>Invoice to</h4><b>' + esc(inv.cust_name) + '</b><p>' + toBlock(inv) + '</p></div>' +
            '<div class="hf-meta">' + metaRows(inv, b) + badge + '</div>' +
          '</div>' +
          (inv.work_summary ? '<p class="hf-summary">' + escLines(inv.work_summary) + '</p>' : "") +
          itemsTable(inv) + totalsBlock(inv, b) +
          '<div class="hf-foot2">' + payBlock(b) + notesBlock(inv) + reviewBlock(b) + '</div>' +
        '</div>' +
        '<footer class="hf-foot">' + legalLine(b) + '</footer>';
    },

    statement: function (inv, b, ctx) {
      return '' +
        '<header class="hf-head">' +
          '<div class="hf-headl">' + logoImg(b, ctx.onDark) + '</div>' +
          '<div class="hf-headmeta"><div class="hf-title">Invoice</div></div>' +
        '</header>' +
        '<table class="hf-grid"><tbody>' +
          '<tr><th>Invoice number</th><td>' + esc(inv.number) + '</td>' +
              '<th>Date of supply</th><td>' + date(inv.issued_at || inv.created_at) + '</td></tr>' +
          '<tr><th>From</th><td>' + esc(b.name) + '</td>' +
              '<th>Payment due</th><td>' + (inv.due_at ? date(inv.due_at) : "On receipt") + '</td></tr>' +
          '<tr><th>Invoice to</th><td>' + esc(inv.cust_name) + '</td>' +
              '<th>VAT number</th><td>' + (b.vat_number ? esc(b.vat_number) : "&mdash;") + '</td></tr>' +
        '</tbody></table>' +
        '<div class="hf-body">' +
          '<div class="hf-cols hf-cols2">' +
            '<div class="hf-party"><h4>From</h4><p>' + fromBlock(b) + '</p></div>' +
            '<div class="hf-party"><h4>Invoice to</h4><p>' + toBlock(inv) + '</p></div>' +
          '</div>' +
          (inv.work_summary ? '<p class="hf-summary">' + escLines(inv.work_summary) + '</p>' : "") +
          itemsTable(inv) + totalsBlock(inv, b) +
          '<div class="hf-foot2">' + payBlock(b) + notesBlock(inv) + reviewBlock(b) + '</div>' +
        '</div>' +
        '<footer class="hf-foot">' + legalLine(b) + '</footer>';
    }
  };

  /* ------------------------------------------------------------------ css */
  /* One base sheet plus a short override per template. A4 at 96dpi is
     794 x 1123px; the sheet is drawn at that width and scaled to fit
     whatever it is dropped into. */
  function baseCss(accent, ink) {
    return '' +
    '.hfdoc{--a:' + accent + ';--on:' + ink + ';--line:#dde3ec;--mut:#5a6b82;--ink:#101c30;' +
      'width:794px;min-height:1123px;background:#fff;color:var(--ink);' +
      'font:14px/1.55 Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;' +
      'display:flex;flex-direction:column;position:relative;box-sizing:border-box}' +
    '.hfdoc *{box-sizing:border-box}' +
    '.hfdoc .hf-body{flex:1;padding:34px 54px 0}' +
    '.hfdoc .hf-logo{display:block;max-width:230px;max-height:82px;width:auto;height:auto;object-fit:contain}' +
    '.hfdoc .hf-title{font:600 30px/1.1 "Space Grotesk",Inter,system-ui,sans-serif;letter-spacing:-.02em}' +
    '.hfdoc .hf-no{font:600 15px/1.4 Inter,system-ui,sans-serif;color:var(--mut);margin-top:4px}' +
    '.hfdoc .hf-headdate{font-size:12.5px;color:var(--mut);margin-top:4px}' +
    '.hfdoc .hf-head{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding:38px 54px 0}' +
    '.hfdoc .hf-headmeta{text-align:right}' +

    '.hfdoc .hf-cols{display:grid;grid-template-columns:1fr 1fr 200px;gap:26px;margin:26px 0 6px}' +
    '.hfdoc .hf-cols2{grid-template-columns:1fr 200px}' +
    '.hfdoc .hf-party h4,.hfdoc .hf-pay h4,.hfdoc .hf-notes h4{margin:0 0 6px;font:600 10px/1 Inter,sans-serif;' +
      'letter-spacing:.13em;text-transform:uppercase;color:var(--mut)}' +
    '.hfdoc .hf-party b{display:block;font-weight:600;font-size:14.5px;margin-bottom:3px}' +
    '.hfdoc .hf-party p{margin:0;font-size:12.5px;line-height:1.6;color:#3d4d63}' +

    '.hfdoc .hf-mrow{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;padding:4px 0;' +
      'border-bottom:1px solid var(--line)}' +
    '.hfdoc .hf-mrow:last-child{border-bottom:0}' +
    '.hfdoc .hf-mrow span{color:var(--mut)}' +
    '.hfdoc .hf-mrow b{font-weight:600;text-align:right}' +

    '.hfdoc .hf-summary{margin:14px 0 0;padding:12px 14px;background:#f5f7fa;border-radius:6px;' +
      'font-size:13px;color:#33455e}' +

    '.hfdoc .hf-items{width:100%;border-collapse:collapse;margin:22px 0 0;font-size:13px}' +
    '.hfdoc .hf-items th{text-align:left;font:600 10px/1 Inter,sans-serif;letter-spacing:.13em;' +
      'text-transform:uppercase;color:var(--mut);padding:0 10px 8px;border-bottom:2px solid var(--a)}' +
    '.hfdoc .hf-items th:first-child,.hfdoc .hf-items td:first-child{padding-left:0}' +
    '.hfdoc .hf-items th:last-child,.hfdoc .hf-items td:last-child{padding-right:0}' +
    '.hfdoc .hf-items td{padding:10px;border-bottom:1px solid var(--line);vertical-align:top}' +
    '.hfdoc .hf-items .hf-num{text-align:right;white-space:nowrap}' +
    '.hfdoc .hf-items .hf-line{font-weight:600}' +
    '.hfdoc .hf-items .hf-desc{width:auto}' +
    '.hfdoc .hf-items th.hf-num{text-align:right}' +
    '.hfdoc .hf-empty td{color:var(--mut);font-style:italic;text-align:center;padding:22px 0}' +

    '.hfdoc .hf-totals{margin:18px 0 0;margin-left:auto;width:290px}' +
    '.hfdoc .hf-trow{display:flex;justify-content:space-between;gap:16px;padding:7px 0;font-size:13.5px}' +
    '.hfdoc .hf-trow span{color:var(--mut)}' +
    '.hfdoc .hf-trow b{font-weight:600}' +
    '.hfdoc .hf-gross{border-top:1px solid var(--line);margin-top:4px;padding-top:11px;font-size:16px}' +
    '.hfdoc .hf-gross b{font-weight:700}' +
    '.hfdoc .hf-due{border-top:2px solid var(--a);margin-top:4px;padding-top:11px;font-size:17px}' +
    '.hfdoc .hf-due span{color:var(--ink);font-weight:600}' +
    '.hfdoc .hf-due b{font-weight:700;color:var(--a)}' +

    '.hfdoc .hf-foot2{display:grid;grid-template-columns:1fr 1fr auto;gap:26px;margin:26px 0 28px}' +
    '.hfdoc .hf-review{text-align:center;width:124px}' +
    '.hfdoc .hf-review svg{display:block;margin:0 auto 6px;width:82px;height:82px;' +
      'border:1px solid var(--line);border-radius:4px}' +
    '.hfdoc .hf-review span{display:block;font-size:9.5px;line-height:1.4;color:var(--mut)}' +
    '.hfdoc .hf-review b{color:var(--ink);font-size:10px}' +
    '.hfdoc .hf-bank div{display:flex;gap:10px;font-size:12.5px;padding:3px 0}' +
    '.hfdoc .hf-bank span{color:var(--mut);min-width:74px}' +
    '.hfdoc .hf-terms{margin:10px 0 0;font-size:12.5px;color:#3d4d63}' +
    '.hfdoc .hf-notes p{margin:0;font-size:12.5px;color:#3d4d63;line-height:1.65}' +

    '.hfdoc .hf-foot{padding:14px 54px;border-top:1px solid var(--line);font-size:11px;' +
      'color:var(--mut);text-align:center;line-height:1.7}' +

    '.hfdoc .hf-badge{display:flex;align-items:center;gap:9px;margin-top:14px;padding:8px 10px;' +
      'border:1px solid var(--line);border-radius:6px}' +
    '.hfdoc .hf-badge img{width:34px;height:auto}' +
    '.hfdoc .hf-badge span{font-size:10.5px;line-height:1.35;color:var(--mut)}' +
    '.hfdoc .hf-badge b{color:var(--ink);font-size:12px}' +

    /* Status stamp. Rotated and pale so it never hides a figure. */
    '.hfdoc .hf-stamp{position:absolute;top:210px;right:56px;transform:rotate(-14deg);' +
      'font:800 44px/1 "Space Grotesk",Inter,sans-serif;letter-spacing:.06em;text-transform:uppercase;' +
      'padding:8px 20px;border:4px solid currentColor;border-radius:8px;opacity:.16;pointer-events:none}' +
    '.hfdoc .hf-stamp-draft{color:#5a6b82}' +
    '.hfdoc .hf-stamp-void{color:#c0392b}' +
    '.hfdoc .hf-stamp-paid{color:#1e8e5a}';
  }

  var SKIN = {
    classic: function (a, on) {
      return '.hfdoc.t-classic .hf-head{background:' + a + ';color:' + on + ';padding:26px 54px;align-items:center}' +
        '.hfdoc.t-classic .hf-no{color:' + on + ';opacity:.82}' +
        '.hfdoc.t-classic .hf-title{font-size:27px}';
    },
    minimal: function (a) {
      return '.hfdoc.t-minimal .hf-head{border-bottom:1px solid #e7ebf1;padding-bottom:18px;align-items:baseline}' +
        '.hfdoc.t-minimal .hf-title{font-weight:400;letter-spacing:.24em;text-transform:uppercase;font-size:16px}' +
        '.hfdoc.t-minimal .hf-items th{border-bottom-color:#101c30}' +
        '.hfdoc.t-minimal .hf-due{border-top-color:#101c30}' +
        '.hfdoc.t-minimal .hf-due b{color:#101c30}' +
        '.hfdoc.t-minimal .hf-summary{background:none;border-left:2px solid ' + a + ';border-radius:0;padding:2px 0 2px 14px}';
    },
    bold: function (a, on) {
      return '.hfdoc.t-bold .hf-head{align-items:center;padding-top:26px}' +
        '.hfdoc.t-bold .hf-logo{max-height:66px}' +
        '.hfdoc.t-bold .hf-title{font-size:38px;font-weight:700;color:' + a + '}' +
        '.hfdoc.t-bold .hf-body{padding-top:22px}' +
        '.hfdoc.t-bold .hf-cols{margin-top:14px}' +
        '.hfdoc.t-bold .hf-foot2{margin:22px 0 22px}' +
        '.hfdoc.t-bold .hf-shout{display:flex;justify-content:space-between;align-items:center;gap:30px;' +
          'margin:12px 54px 0;padding:12px 24px;background:' + a + ';color:' + on + ';border-radius:10px}' +
        '.hfdoc.t-bold .hf-shout-l span{display:block;font-size:11px;letter-spacing:.13em;' +
          'text-transform:uppercase;opacity:.78}' +
        '.hfdoc.t-bold .hf-shout-l b{font:700 34px/1.1 "Space Grotesk",Inter,sans-serif;letter-spacing:-.02em}' +
        /* Two across rather than four down: the same facts, half the height. */
        '.hfdoc.t-bold .hf-shout-r{display:grid;grid-template-columns:1fr 1fr;gap:0 20px;min-width:320px}' +
        '.hfdoc.t-bold .hf-shout-r .hf-mrow{border-bottom-color:rgba(255,255,255,.22)}' +
        '.hfdoc.t-bold .hf-shout-r .hf-mrow span{color:' + on + ';opacity:.78}' +
        '.hfdoc.t-bold .hf-shout-r .hf-mrow b{color:' + on + '}' +
        '.hfdoc.t-bold .hf-gross{font-size:18px}';
    },
    slate: function (a, on) {
      var deep = mix(a, "#000000", 0.55);
      return '.hfdoc.t-slate .hf-head{background:' + deep + ';color:#eaf0f8;padding:26px 54px;align-items:center}' +
        '.hfdoc.t-slate .hf-no,.hfdoc.t-slate .hf-headdate{color:#a9b8cc}' +
        '.hfdoc.t-slate .hf-title{color:#fff}' +
        '.hfdoc.t-slate .hf-items th{border-bottom-color:' + deep + '}' +
        '.hfdoc.t-slate .hf-due{border-top-color:' + deep + '}' +
        '.hfdoc.t-slate .hf-due b{color:' + deep + '}' +
        '.hfdoc.t-slate .hf-foot{background:#f4f6fa}';
    },
    letter: function (a) {
      return '.hfdoc.t-letter{font-family:Inter,system-ui,sans-serif}' +
        '.hfdoc.t-letter .hf-head{display:block;text-align:center;padding:24px 54px 0;border-bottom:3px double ' + a + ';padding-bottom:14px}' +
        '.hfdoc.t-letter .hf-logo{margin:0 auto 10px;max-height:62px}' +
        '.hfdoc.t-letter .hf-letterhead{font:600 24px/1.2 "Playfair Display",Georgia,serif;letter-spacing:.01em}' +
        '.hfdoc.t-letter .hf-letteraddr{margin:7px auto 0;max-width:600px;font-size:11.5px;' +
          'color:var(--mut);line-height:1.7}' +
        '.hfdoc.t-letter .hf-body{padding-top:18px}' +
        '.hfdoc.t-letter .hf-cols{margin-top:12px}' +
        '.hfdoc.t-letter .hf-foot2{margin:22px 0 20px}' +
        '.hfdoc.t-letter .hf-title{font-family:"Playfair Display",Georgia,serif;font-size:25px;' +
          'text-align:center;margin:0 0 2px;letter-spacing:.02em}' +
        '.hfdoc.t-letter .hf-items th{font-family:Inter,sans-serif}' +
        '.hfdoc.t-letter .hf-gross b,.hfdoc.t-letter .hf-due b{font-family:"Playfair Display",Georgia,serif}';
    },
    compact: function (a) {
      return '.hfdoc.t-compact{font-size:12.5px}' +
        '.hfdoc.t-compact .hf-head{padding:26px 44px 0;align-items:center}' +
        '.hfdoc.t-compact .hf-body{padding:18px 44px 0}' +
        '.hfdoc.t-compact .hf-logo{max-height:56px;max-width:180px}' +
        '.hfdoc.t-compact .hf-title{font-size:19px}' +
        '.hfdoc.t-compact .hf-cols{margin:16px 0 4px;gap:18px}' +
        '.hfdoc.t-compact .hf-items{margin-top:14px;font-size:12px}' +
        '.hfdoc.t-compact .hf-items td{padding:6px 8px}' +
        '.hfdoc.t-compact .hf-party p{font-size:11.5px;line-height:1.5}' +
        '.hfdoc.t-compact .hf-trow{padding:5px 0;font-size:12.5px}' +
        '.hfdoc.t-compact .hf-foot2{margin:20px 0 24px}' +
        '.hfdoc.t-compact .hf-summary{padding:9px 11px;font-size:12px}' +
        '.hfdoc.t-compact .hf-items th{border-bottom-color:' + a + '}';
    },
    /* The one that matches the van and the website. It keeps the HeatFix
       orange whatever accent is set elsewhere — that livery is the whole
       point of choosing it. */
    trade: function () {
      var fire = "#ef5b18", navy = "#0b2e63";
      return '.hfdoc.t-trade{--a:' + fire + '}' +
        '.hfdoc.t-trade .hf-head{padding:30px 54px 18px;align-items:center}' +
        '.hfdoc.t-trade .hf-rule{height:7px;background:linear-gradient(90deg,' + fire + ' 0 62%,' +
          navy + ' 62% 100%)}' +
        '.hfdoc.t-trade .hf-title{color:' + navy + ';font-weight:700;text-transform:uppercase;' +
          'letter-spacing:.04em;font-size:26px}' +
        '.hfdoc.t-trade .hf-no{color:' + fire + ';font-weight:700}' +
        '.hfdoc.t-trade .hf-summary{background:' + mix(fire, "#ffffff", 0.9) + ';color:#4a2a17}' +
        '.hfdoc.t-trade .hf-items th{border-bottom-color:' + navy + '}' +
        '.hfdoc.t-trade .hf-gross{border-top-width:1px}' +
        '.hfdoc.t-trade .hf-due{border-top-color:' + fire + '}' +
        '.hfdoc.t-trade .hf-due b{color:' + fire + '}' +
        '.hfdoc.t-trade .hf-badge{border-color:' + mix(fire, "#ffffff", 0.7) + ';' +
          'background:' + mix(fire, "#ffffff", 0.95) + '}' +
        '.hfdoc.t-trade .hf-badge img{width:42px}' +
        '.hfdoc.t-trade .hf-foot{border-top:3px solid ' + fire + '}';
    },
    statement: function (a, on) {
      return '.hfdoc.t-statement .hf-head{padding:26px 50px 14px;align-items:center}' +
        '.hfdoc.t-statement .hf-logo{max-height:62px}' +
        '.hfdoc.t-statement .hf-title{font-size:21px;letter-spacing:.2em;text-transform:uppercase;font-weight:500}' +
        '.hfdoc.t-statement .hf-grid{width:calc(100% - 100px);margin:0 50px;border-collapse:collapse;font-size:12.5px}' +
        '.hfdoc.t-statement .hf-grid th{text-align:left;font:600 10px/1.3 Inter,sans-serif;letter-spacing:.1em;' +
          'text-transform:uppercase;color:var(--mut);background:#f4f6fa;padding:6px 10px;' +
          'border:1px solid var(--line);width:118px;vertical-align:middle}' +
        '.hfdoc.t-statement .hf-grid td{padding:6px 10px;border:1px solid var(--line);font-weight:600}' +
        '.hfdoc.t-statement .hf-body{padding-top:18px}' +
        '.hfdoc.t-statement .hf-cols{margin-top:0}' +
        '.hfdoc.t-statement .hf-items th{background:#f4f6fa;padding:8px 10px;border-bottom:1px solid var(--line)}' +
        '.hfdoc.t-statement .hf-items th:first-child{padding-left:10px}' +
        '.hfdoc.t-statement .hf-items td:first-child{padding-left:10px}' +
        '.hfdoc.t-statement .hf-items td{border:1px solid var(--line)}';
    }
  };

  /* ------------------------------------------------------------------ api */
  function pick(id) {
    return LAYOUT[id] ? id : "classic";
  }

  /* Style + markup, ready to drop into an element or a document. */
  function fragment(data) {
    var inv = data.invoice || {};
    var b = data.business || {};
    var tpl = pick(data.template || inv.template || b.template);
    var accent = /^#[0-9a-f]{6}$/i.test(String(b.accent || "")) ? b.accent : "#0B2E63";
    var ink = onAccent(accent);
    var css = baseCss(accent, ink) + (SKIN[tpl] ? SKIN[tpl](accent, ink) : "");
    /* Which colour the logo actually sits on, per template. */
    var behind = tpl === "classic" ? accent
               : tpl === "slate"   ? mix(accent, "#000000", 0.55)
               : "#ffffff";
    var ctx = { accent: accent, ink: ink, onDark: onAccent(behind) === "#ffffff" };
    var html = '<div class="hfdoc t-' + tpl + '">' + stampFor(inv) + LAYOUT[tpl](inv, b, ctx) + '</div>';
    return { css: css, html: html, template: tpl };
  }

  /* A whole page, for an iframe preview or a print window. */
  function doc(data) {
    var f = fragment(data);
    var inv = data.invoice || {};
    return '<!doctype html><html lang="en-GB"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=794">' +
      '<title>Invoice ' + esc(inv.number || "") + '</title>' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">' +
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&' +
        'family=Space+Grotesk:wght@500;600;700;800&family=Playfair+Display:wght@500;600&display=swap">' +
      '<style>html,body{margin:0;padding:0;background:#eef1f6}' +
      '@media print{html,body{background:#fff}.hfdoc{box-shadow:none!important}' +
      '@page{size:A4;margin:0}}' +
      f.css + '</style></head><body>' + f.html + '</body></html>';
  }

  w.HFInvoice = {
    templates: TEMPLATES,
    fragment: fragment,
    doc: doc,
    money: money,
    date: date,
    esc: esc
  };
})(window);
