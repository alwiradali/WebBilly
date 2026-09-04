/* ============================================================
   HeatFix Mcr Limited — invoice engine
   Shared by /invoice (the builder) and /i (the customer's view).
   No dependencies, no build step: writes a real PDF byte-for-byte.
   ============================================================ */
(function (root) {
'use strict';

var HF = {
  company: {
    name:   'HeatFix Mcr Limited',
    person: '',            /* a named person no longer appears on invoices */
    role:   'Domestic Gas Engineer',
    phone:  '07890 452629',
    intl:   '447890452629',
    email:  'heatfixmcr@hotmail.com',
    web:    'heatfixmcrlimited.co.uk',
    logo:   'assets/heatfix/logo-invoice.jpg'
  }
};

/* ---------------------------------------------------------- utils */
function money(n){
  n = Number(n) || 0;
  return n.toLocaleString('en-GB', {minimumFractionDigits:2, maximumFractionDigits:2});
}
HF.money = money;
HF.gbp = function(n){ return '£' + money(n); };

HF.today = function(){ return new Date(); };
HF.fmtDate = function(d){
  if (typeof d === 'string') d = new Date(d + 'T00:00:00');
  var M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return d.getDate() + ' ' + M[d.getMonth()] + ' ' + d.getFullYear();
};
HF.isoDate = function(d){
  function p(n){ return (n<10?'0':'') + n; }
  return d.getFullYear() + '-' + p(d.getMonth()+1) + '-' + p(d.getDate());
};

/* UK mobile/landline -> wa.me digits */
HF.waNumber = function(raw){
  var s = String(raw || '').replace(/[^\d+]/g, '');
  if (s.indexOf('+') === 0) s = s.slice(1);
  if (s.indexOf('00') === 0) s = s.slice(2);
  if (s.indexOf('0') === 0)  s = '44' + s.slice(1);
  if (s.indexOf('44') !== 0 && s.length === 10) s = '44' + s;
  return s;
};

/* totals */
HF.totals = function(inv){
  var sub = 0;
  (inv.items || []).forEach(function(it){
    sub += (Number(it.qty) || 0) * (Number(it.price) || 0);
  });
  var disc = Number(inv.discount) || 0;
  var net  = Math.max(0, sub - disc);
  var vat  = inv.vat ? net * (Number(inv.vatRate || 20) / 100) : 0;
  var tot  = net + vat;
  var paid = Number(inv.paid) || 0;
  return { sub:sub, disc:disc, net:net, vat:vat, total:tot, paid:paid, due:Math.max(0, tot - paid) };
};

/* ------------------------------------------------- share payload */
function b64urlEncode(str){
  var utf8 = unescape(encodeURIComponent(str));
  return btoa(utf8).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function b64urlDecode(str){
  str = String(str).replace(/-/g,'+').replace(/_/g,'/');
  while (str.length % 4) str += '=';
  return decodeURIComponent(escape(atob(str)));
}
HF.encode = function(inv){ return b64urlEncode(JSON.stringify(inv)); };
HF.decode = function(hash){
  try { return JSON.parse(b64urlDecode(String(hash).replace(/^#/, ''))); }
  catch (e) { return null; }
};
HF.viewUrl = function(inv, origin){
  var base = origin || (location.origin + (location.pathname.indexOf('/templates/') === 0 ? '/templates/heatfix-invoice-view.html' : '/i'));
  return base + '#' + HF.encode(inv);
};

/* =============================================================
   Minimal PDF writer  (Helvetica + one baseline-JPEG image)
   ============================================================= */
var WINANSI = { 0x2013:0x96, 0x2014:0x97, 0x2018:0x91, 0x2019:0x92,
                0x201C:0x93, 0x201D:0x94, 0x2022:0x95, 0x2026:0x85, 0x20AC:0x80 };

function enc(str){
  var out = '';
  for (var i = 0; i < str.length; i++){
    var c = str.charCodeAt(i);
    if (WINANSI[c] !== undefined) c = WINANSI[c];
    else if (c > 255) c = 63;                       /* '?' */
    var ch = String.fromCharCode(c);
    if (ch === '(' || ch === ')' || ch === '\\') out += '\\';
    out += ch;
  }
  return out;
}
function toBytes(str){
  var a = new Uint8Array(str.length);
  for (var i = 0; i < str.length; i++) a[i] = str.charCodeAt(i) & 0xFF;
  return a;
}

/* Helvetica advance widths (/1000 em) for the printable ASCII range. */
var HW = [
278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,
556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,
1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,
667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,
333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,
556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
var HWB = [
278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,
556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,
975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,
667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,
333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,
611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
function textWidth(s, size, bold){
  var t = bold ? HWB : HW, w = 0;
  for (var i = 0; i < s.length; i++){
    var c = s.charCodeAt(i);
    if (c === 0xA3) { w += bold ? 556 : 556; continue; }   /* £ */
    w += (c >= 32 && c <= 126) ? t[c - 32] : 556;
  }
  return w * size / 1000;
}
HF.textWidth = textWidth;

function wrap(s, size, bold, maxW){
  /* split on spaces, but hard-break any single token too long to fit
     (long email addresses and part numbers would otherwise run off) */
  var words = [];
  String(s).split(/\s+/).forEach(function(w){
    while (textWidth(w, size, bold) > maxW && w.length > 1){
      var n = 1;
      while (n < w.length && textWidth(w.slice(0, n + 1), size, bold) <= maxW) n++;
      words.push(w.slice(0, n)); w = w.slice(n);
    }
    if (w) words.push(w);
  });
  var lines = [], cur = '';
  for (var i = 0; i < words.length; i++){
    var t = cur ? cur + ' ' + words[i] : words[i];
    if (textWidth(t, size, bold) > maxW && cur){ lines.push(cur); cur = words[i]; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

/* read width/height out of a baseline JPEG */
function jpegSize(buf){
  var d = new DataView(buf), i = 2;
  while (i < d.byteLength){
    if (d.getUint8(i) !== 0xFF){ i++; continue; }
    var m = d.getUint8(i + 1);
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC)
      return { h:d.getUint16(i + 5), w:d.getUint16(i + 7) };
    i += 2 + d.getUint16(i + 2);
  }
  return { w:657, h:900 };
}

/* ---------------------------------------------------- the layout */
var A4 = { w:595.28, h:841.89 };
var NAVY = '0.051 0.165 0.388', GOLD = '0.788 0.635 0.290',
    GREY = '0.42 0.46 0.51',   DARK = '0.09 0.11 0.14', LINE = '0.85 0.87 0.90';

HF.buildPdf = function (inv, logoBuf) {
  var t = HF.totals(inv), c = HF.company, ops = [], M = 46, y = A4.h - M;

  function txt(s, x, yy, size, bold, colour){
    ops.push('BT /' + (bold ? 'F2' : 'F1') + ' ' + size + ' Tf ' +
             (colour || DARK) + ' rg 1 0 0 1 ' + x.toFixed(2) + ' ' + yy.toFixed(2) + ' Tm (' + enc(s) + ') Tj ET');
  }
  function right(s, xr, yy, size, bold, colour){ txt(s, xr - textWidth(s, size, bold), yy, size, bold, colour); }
  function rect(x, yy, w, h, colour){ ops.push(colour + ' rg ' + x.toFixed(2) + ' ' + yy.toFixed(2) + ' ' + w.toFixed(2) + ' ' + h.toFixed(2) + ' re f'); }
  function rule(x, yy, w, colour, th){ ops.push((colour||LINE) + ' RG ' + (th||0.7) + ' w ' + x.toFixed(2) + ' ' + yy.toFixed(2) + ' m ' + (x+w).toFixed(2) + ' ' + yy.toFixed(2) + ' l S'); }

  /* The Gas Safe Register lockup, drawn as vectors so it stays crisp at any
     zoom and costs nothing in file size. Right-angled triangle with the
     vertical edge on the right, GAS safe inside, REGISTER beneath — the
     official arrangement. Bottom-left of the triangle sits at x,yy. */
  function gasSafe(x, yy, w){
    var h = w * 0.98, r = w * 0.13, R = x + w;                    /* right edge */
    ops.push('q 1 0.824 0 rg 1 0.824 0 RG ' + r.toFixed(2) + ' w 1 j ' +
      (R - r).toFixed(2) + ' ' + (yy + r).toFixed(2) + ' m ' +          /* bottom-right */
      (R - r).toFixed(2) + ' ' + (yy + h - r).toFixed(2) + ' l ' +      /* top-right */
      (x + r).toFixed(2) + ' ' + (yy + r).toFixed(2) + ' l h B Q');     /* bottom-left */
    var gs = w * 0.16, ss = w * 0.33, INK = '0.07 0.07 0.07';
    txt('GAS',  R - r * 1.1 - textWidth('GAS', gs, true),  yy + h * 0.45, +gs.toFixed(2), true, INK);
    txt('safe', R - r * 1.1 - textWidth('safe', ss, true), yy + h * 0.17, +ss.toFixed(2), true, INK);
    var rs = w * 0.135;
    txt('REGISTER', x, yy - rs * 1.25, +rs.toFixed(2), true, NAVY);
    return h;
  }

  /* --- header band --- */
  rect(0, A4.h - 132, A4.w, 132, '0.984 0.988 0.992');
  rect(0, A4.h - 136, A4.w, 4, NAVY);
  rect(0, A4.h - 138, A4.w, 2, GOLD);

  var lw = 0, lh = 0;
  if (logoBuf){
    var s = jpegSize(logoBuf); lh = 62; lw = s.w / s.h * lh;
    ops.push('q ' + lw.toFixed(2) + ' 0 0 ' + lh.toFixed(2) + ' ' + M + ' ' + (A4.h - 40 - lh).toFixed(2) + ' cm /Im0 Do Q');
  }
  var hy = A4.h - 44 - (logoBuf ? 0 : 10);
  txt(c.name, M + (lw ? lw + 16 : 0), hy - 14, 15, true, NAVY);
  txt(c.role, M + (lw ? lw + 16 : 0), hy - 30, 9.5, false, GREY);
  var gx = M + (lw ? lw + 16 : 0);
  gasSafe(gx, hy - 51, 21);
  txt('GAS SAFE REGISTERED', gx + 29, hy - 44, 8, true, NAVY);
  txt(inv.gassafe ? ('Reg. no. ' + inv.gassafe) : 'Registered business', gx + 29, hy - 54, 7.5, false, GREY);

  var xr = A4.w - M;
  right('INVOICE', xr, hy - 12, 26, true, NAVY);
  right(c.phone, xr, hy - 32, 9.5, false, GREY);
  right(c.email, xr, hy - 45, 9.5, false, GREY);
  right(c.web,   xr, hy - 58, 9.5, false, GREY);

  y = A4.h - 172;

  /* --- meta strip --- */
  var meta = [
    ['Invoice no.', inv.number || '—'],
    ['Date',        HF.fmtDate(inv.date || HF.isoDate(new Date()))],
    ['Due',         inv.due ? HF.fmtDate(inv.due) : 'On receipt']
  ];
  var MCOL = [0, 106, 200];
  meta.forEach(function(m, i){
    txt(m[0].toUpperCase(), M + MCOL[i], y, 7.5, true, GREY);
    txt(m[1], M + MCOL[i], y - 15, 11.5, true);
  });

  /* --- bill to: right-aligned so it can never collide with the meta strip --- */
  var BW = 190;
  right('BILL TO', xr, y, 7.5, true, GREY);
  var by = y - 15;
  right(inv.client || '—', xr, by, 11.5, true); by -= 14;
  [inv.caddress, inv.cpostcode, inv.cphone, inv.cemail].forEach(function(v){
    if (!v) return;
    wrap(v, 9.5, false, BW).forEach(function(l){ right(l, xr, by, 9.5, false, GREY); by -= 12.5; });
  });

  y = Math.min(y - 78, by - 14);
  rule(M, y, A4.w - M * 2, GOLD, 1);
  y -= 26;

  /* --- table head --- */
  var cQty = A4.w - M - 210, cUnit = A4.w - M - 130, cAmt = xr;
  rect(M - 6, y - 8, A4.w - M * 2 + 12, 24, '0.965 0.972 0.980');
  txt('DESCRIPTION', M, y, 8, true, GREY);
  right('QTY',    cQty + 26, y, 8, true, GREY);
  right('UNIT',   cUnit + 60, y, 8, true, GREY);
  right('AMOUNT', cAmt, y, 8, true, GREY);
  y -= 26;

  /* --- rows (one page: anything that will not fit is summarised) --- */
  var all = inv.items || [], shown = 0, restAmt = 0;
  for (var r = 0; r < all.length; r++){
    var it = all[r], qty = Number(it.qty) || 0, price = Number(it.price) || 0;
    var lines = wrap(it.desc || '', 10.5, false, cQty - M - 18).slice(0, 3);
    if (y - lines.length * 13 < 330 && r < all.length - 1){
      for (var k = r; k < all.length; k++) restAmt += (Number(all[k].qty)||0) * (Number(all[k].price)||0);
      txt((all.length - shown) + ' further item' + (all.length - shown === 1 ? '' : 's'), M, y, 10.5, false, GREY);
      right('£' + money(restAmt), cAmt, y, 10.5, true);
      y -= 12; rule(M, y, A4.w - M * 2); y -= 20;
      break;
    }
    txt(lines[0], M, y, 10.5, false);
    right(String(qty),              cQty + 26, y, 10.5, false, GREY);
    right('£' + money(price),       cUnit + 60, y, 10.5, false, GREY);
    right('£' + money(qty * price), cAmt, y, 10.5, true);
    for (var i = 1; i < lines.length; i++){ y -= 13; txt(lines[i], M, y, 9.5, false, GREY); }
    y -= 12; rule(M, y, A4.w - M * 2); y -= 20; shown++;
  }

  var afterRows = y;

  /* --- totals --- */
  var tx = A4.w - M - 210, ty = y - 4;
  function trow(label, val, bold, size, colour){
    txt(label, tx, ty, size || 10, bold, bold ? DARK : GREY);
    right(val, xr, ty, size || 10, bold, colour || (bold ? DARK : GREY));
    ty -= (size ? size + 7 : 17);
  }
  trow('Subtotal', '£' + money(t.sub));
  if (t.disc) trow('Discount', '-£' + money(t.disc));
  if (inv.vat) trow('VAT ' + (inv.vatRate || 20) + '%', '£' + money(t.vat));
  ty -= 2;
  rule(tx, ty + 10, xr - tx, GOLD, 1);
  ty -= 6;
  rect(tx - 10, ty - 10, xr - tx + 10, 30, '0.965 0.972 0.980');
  txt('TOTAL', tx, ty, 11, true, NAVY);
  right('£' + money(t.total), xr, ty, 15, true, NAVY);
  ty -= 26;
  if (t.paid){
    trow('Paid', '-£' + money(t.paid));
    trow('Balance due', '£' + money(t.due), true, 12);
  }

  /* --- notes + payment ---
     The work/notes column sits beside the totals, not adrift below them. */
  var NW = tx - M - 22;
  var ny = afterRows - 2;          /* level with the totals, filling the left column */
  if (inv.work){
    txt('WORK CARRIED OUT', M, ny, 7.5, true, GREY); ny -= 14;
    wrap(inv.work, 9.5, false, NW).slice(0, 3).forEach(function(l){ txt(l, M, ny, 9.5, false); ny -= 12.5; });
    ny -= 8;
  }
  if (inv.notes){
    txt('NOTES', M, ny, 7.5, true, GREY); ny -= 14;
    wrap(inv.notes, 9.5, false, NW).slice(0, 4).forEach(function(l){ txt(l, M, ny, 9.5, false, GREY); ny -= 12.5; });
  }

  /* the payment panel sits under whatever the notes needed, never on the footer */
  var payLines = (inv.payto || '').split('\n').filter(function(l){ return l.trim(); }).length || 1;
  var payH = 46 + payLines * 13.5;
  var py = Math.max(74 + payH - 40, Math.min(168, ny - 30));
  rect(M - 6, py + 22 - payH, A4.w - M * 2 + 12, payH, '0.965 0.972 0.980');
  rect(M - 6, py + 22, A4.w - M * 2 + 12, 2, GOLD);
  txt('HOW TO PAY', M, py + 6, 7.5, true, GREY);
  var pl = (inv.payto || ''), pln = py - 10;
  if (pl){
    pl.split('\n').forEach(function(l){ if (!l.trim()) return; txt(l, M, pln, 10, false); pln -= 13.5; });
  } else {
    txt('Bank details on request — call ' + c.phone + '.', M, pln, 10, false, GREY);
  }
  right('Please quote invoice ' + (inv.number || ''), xr, py - 10, 9, false, GREY);


  /* --- footer --- */
  rect(0, 0, A4.w, 44, '0.051 0.165 0.388');
  txt([c.name, c.person, c.phone].filter(Boolean).join('  \u00b7  '), M, 24, 8.5, true, '1 1 1');
  right(c.web, xr, 24, 8.5, false, '0.78 0.84 0.92');
  txt('Thank you for your custom.', M, 12, 7.5, false, '0.62 0.70 0.82');

  /* ------------------------------------------------ assemble file */
  var stream = ops.join('\n');
  var objs = [];
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
  objs[3] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + A4.w + ' ' + A4.h + '] ' +
            '/Resources << /Font << /F1 5 0 R /F2 6 0 R >> ' +
            (logoBuf ? '/XObject << /Im0 7 0 R >> ' : '') + '>> /Contents 4 0 R >>';
  objs[4] = null;   /* stream, written specially */
  objs[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objs[6] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

  var chunks = [], len = 0, offsets = [];
  function push(x){ var b = (x instanceof Uint8Array) ? x : toBytes(x); chunks.push(b); len += b.length; }

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  function obj(n, body, extraBytes){
    offsets[n] = len;
    push(n + ' 0 obj\n' + body + '\n');
    if (extraBytes){ push(extraBytes); push('\nendstream\n'); }
    push('endobj\n');
  }
  obj(1, objs[1]); obj(2, objs[2]); obj(3, objs[3]);
  obj(4, '<< /Length ' + toBytes(stream).length + ' >>\nstream', toBytes(stream));
  obj(5, objs[5]); obj(6, objs[6]);
  if (logoBuf){
    var s2 = jpegSize(logoBuf);
    obj(7, '<< /Type /XObject /Subtype /Image /Width ' + s2.w + ' /Height ' + s2.h +
           ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' +
           logoBuf.byteLength + ' >>\nstream', new Uint8Array(logoBuf));
  }
  var count = logoBuf ? 8 : 7, xref = len;
  var x = 'xref\n0 ' + count + '\n0000000000 65535 f \n';
  for (var i = 1; i < count; i++) x += ('0000000000' + offsets[i]).slice(-10) + ' 00000 n \n';
  push(x);
  push('trailer\n<< /Size ' + count + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');

  var out = new Uint8Array(len), o = 0;
  chunks.forEach(function(b){ out.set(b, o); o += b.length; });
  return new Blob([out], { type:'application/pdf' });
};

/* ------------------------------------------------------------------
   The logo is embedded, not fetched. An invoice gets written in a
   cellar with one bar of signal; a failed request must never quietly
   produce a letterhead with no logo on it. Being synchronous also
   keeps navigator.share() inside the user gesture on iOS.
------------------------------------------------------------------ */
var LOGO_B64 =
'/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8X'+
'GBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAAR'+
'CAFoAQcDAREAAhEBAxEB/8QAHgABAAIBBQEBAAAAAAAAAAAAAAgJBwECAwUGBAr/xABIEAABAgUCBAQDBQQGCAYDAAABAgMABAUGEQchCBIx'+
'QQkTUWEiMnEUI0KBkRUWUqEkM2JyscEXGEOCkrLR4RklJjV18XOGov/EAB0BAQABBQEBAQAAAAAAAAAAAAAGAQMEBQcCCAn/xAA1EQACAgIC'+
'AgEDAwMDAgYDAAAAAQIDBBEFEiExEwYiQRQyUSNhcQcVJDM0FkJSgbHwkaHB/9oADAMBAAIRAxEAPwC1OAEAIAQAgBACAEAIAQAgBACAEAIA'+
'0gD45asyM5PPSbE007NMgKcaSr4kg9DiPTi0ttHlSUvTPs5uvaPJ6NYAQAgBACAEAIAQAgBACAEAIAQAgBACAEAIAQAgBACAEAIAQAgBACAE'+
'AeF1h1GpmmVi1Ct1NREsygkpQrlWT2x+cZmLRK6ekYGbkLHqbZW3p9xOVq3Nc3LpqdWLkpUHUom2m9kIlyfugkdlep7xLbOOTq1og+Hy8le+'+
'3otFti5ZW6aWxOSykqQ62lxJScgpIyCIh19Lpl1Z0Gq2Nse0TuYxy8IAQAgBACAEAIAQAgBACAEAIAQAgBACAEAIAQAgBACAEAIAQBpkYzna'+
'ANYA4pmYRKS7jzh5W20lSj6ARVJt6R5lJRTkyrrjf4lEXvdL9Op802qg0rIVyLyidV/Y9cGJ3xOG61uaOb8nnSzL1XT6IS0u6XGKwudfSXJV'+
'9X3jRP4T8uP7vWJhKuOjzdgqNK6vyiybgM4iRLzbVkXBPIdS4M06cUrZ0Ho2k9yPSILzGJLe4I2nDZrj9lvgn4lQWAQcg7xDScezdACAEAIA'+
'QAgBACAEAIAQAgBACAEAIAQAgBACAEAIAQAgBACANiglCNx8IgPRuyMZgCIvG7xFqsehLtilTAaqs8MIdQr5Bjcn+cSLjsF2tSaIjzHI/Cvj'+
'iypa9LhXW54I58oBOfTOd/5x0mFXWKRocDE+P73+Tzq0htChzEjYCMj8Eh+OMkZD0uvSdolUlUysz5M9LHmlXf4Fe3pGuvq7bRF8qE6Z9olx'+
'nCrr5K6z2RLvOLQiflkhhxsn4ypIwT+ZzHNM7ElTNyJrxmcsiCg/aM4MzKHSrAKVA4IPrGn2b5rRzZGcd4qDWAEAIAQAgBACAEAIAQAgBACA'+
'EAIAQAgBACAEAIAQAgBAGxTYUADuBAGOdc9XabpJZFQq87lxLSOUNoPxKWR8IHr7+0bDExpXzX8Gq5DKWPU9eymXW3VKoXjc05PTr/mT0+sq'+
'SCcpYbPQJ9DiOnYOOqYo5/TXLOs7S9GHzuTkAn1jazkSWMdLqgABnYHI7xaT2VScGEFTSm1NqLa0bhaTvFX59ni6MJR2yTnDbr3Mad3dIV+W'+
'UGm+ZLVRlDnyQnpzJT2PfMaPksVWQekR+myWHemvRcJZF0029KNK1inPeezNtJcCk7pO3+Mc0uodM2mdJovjkVqSPRcvxZ9sRjmSawAgBACA'+
'EAIAQAgBACAEAIAQAgBACAEAIAQAgBACAEAIA+GsVaXotMmZ6aeQxLMNqWtxasAY949wg7JKMS3ZZGuLlJ6RUpxgcR69RLmmVSswtFDkCtqT'+
'l0nPnrPzrPrvHSOMw1XBNo5zl5E8u7pHyiHUzOGYecmH1F1xz17CJLGPU2eNX8CWjiHxeXjfzBlH9oe0UabMxrT2gPj+XfttCOjxKTf4AI/L'+
'OPzisitkFKHg7O3q47Rp5t9YDjO6ZhsfiHaPKj3WmanKx+0fHssI4EuI5q1qpIWfXJ8KodRcK6c+V5DDuN0LPYY7RDOYwtLtFF3icz4p/Ha9'+
'FkrTqH20uIUFIUMpUO4iCta8Mnqakto3xQqIAQAgBACAEAIAQAgBACAEAIAQAgBACAEAIAQAgDil3w+lRCSnBI3gVa0bnnUMNKccUEoSMknt'+
'FUt+EeW0ltkEOOniJRKy7lm2/Nhh5nP20JVsU9cRLuKwXFqTRBObz3OXwwZWNc1xuVufKwOVhBIb/wA4n9a6Is4ON8Ue8vydLyg7mKykbdrX'+
'lGrTT8xNsyrDalTUyoS0khA3SSe36x5stVdbbLtX3k3NX+Cd2z+ECgXDIyqjc1GUqeqfKn4n23B8I98REquU3kODfgyZUPrsg8gpdCF5KPOT'+
'zBB/CqJhF947Rrp/azkUMKUlPcdfeDej049keu05uaYp863T0ueVMrUDKL7JcG+Ys3Vq6PU0GZjOL+SP4LdeC3iJRqbaaaJVZkGuU7DThWrd'+
'eNgRHNuTwXRLskSPiM9Wr4peyUUR4lBpAGsAIAQAgBACAEAIAQAgBACAEAIAQAgBACAEAbUJ5UgZz7wAKehzgDeAMBcUvETI6Q2e+0wWZmsz'+
'gKJWXePwObYJON9uo9xG2w8SVklJmh5TOjj1OKfllO+p97TNcqEwHJpUy+8olycWcur3zgx07GqUIoheFQ75fLYY+cWEpTstXQBKegjP9sky'+
'++PWP4NzifMJCDskZXntFJR0WYNxfWRMDw7OHFWq+oTV5VRh5VuUpwKkypIw6sfx5/yiJ8vmKutxizbY1XktwrdIk6pQ5qQnJVExIutloy/L'+
'kFJGMYjn1c5Rmpb8m6cU1oo74udBZvQHVyYlHW3VUequKepzqx0yc8p7Yjp3FZkbvtbI7kVPZhRRUCQQAoHBI9YkGk9liL6xNQtSVFxGUvDd'+
'DifmQfUR4T6steLU0zNOiWr8/Ztw06sSSizPyqh9wCQ1NEdPM7xr87GjkRIxPvg3doly2iOrFL1bsCQrtPfSQ8A080DlTTw+dOP4c9PaOW5W'+
'PKixxaOkYeRG+pS35MhpzyjPWMEzzdACAEAIAQAgBACAEAIAQAgBACAEAIAQAgBAGiQEjAGwgDxurGodM01syfrFSeS20yj5SrBUT2HufSMm'+
'iqVk1pbMLLyI49Tk2U5cRGt8/qFcs1WZ9Z5nlFFLlicFlHuO20dL47EShuSOZqdnIXvfpEfFkqdWtZ5jG7S0SiutVJQRtCstKwry0jffufSK'+
'rZ6/6T8HrNLdNq1q9qBSLVoDCnJqoKAeVyk+SnO5X/DtnrGFlZMaoNyejKhS7fuL1tD9IaVozYlPoNKaDLTTaStIAGV4GT+uY5TlZEsibb9G'+
'/rrUEZCxGEXiP/GNw2SfELplOyLbSE3AwgmQmj1bV16xtuPynj2rb8GPbUp+Skiq0iZodRmqbOsuy87JuLYeafQUOZQeUqKTuAcZzHU4WqUU'+
'4vZH7Ialo+FKeZwZUUbZHvGQo7XksT/peUc9Pn36ZNtONOHZUWXLXgxrqI5ENsl/wpcSLmlF1sTxdU5bVSUmXqcqlWfJPTzAO31iO8nhqcNp'+
'Gsw8ueNb0n4RbZblalq/R5WelH25iWfQHGnG184Ug9CT64jnVkHCTizotNitgpI7SLZeEAIAQAgBACAEAIAQAgBACAEAIAQBoQD1gDWANCcC'+
'AOrrVakqRTnp+YWlLDaCVOKOEgDcn6RdqrdsusSzdZGmLnIqp4x+JYal3E4widU3blNdPktN/LMrHRePbpE+4zB+JJtHOc3LlyVvRekQsqNR'+
'eq0/+0Zglbzrh8tKuvLiJZvS0bCmr9PFRicUNbZn7NWkLfm5eXaYVNzD6w0ywkZJcOwP5RW6caIdmIwcmW++H3wpo0VtP94620HrqqiAt59Q'+
'3SkjIT+Ucv5XN/UT6pm/xodVsmLEfM4QBooBQIIyDsYArk8SbhFeqvnao2vLkzjKAKq0gZLjY7xL+J5Dq1CTNZdR7ZWu2+3NNpcaB5flGeqf'+
'aOhxatj2RqLI6ZrHjS9FrR2ls19dAqSSU/0R/wCF9A9PWKdFYmjX5uIr4d37RYrwNcUjdsTUtZlxTeaZOH/y+Y7BR6IP5RBuWwHvskeeI5L4'+
'p/BZ6LF2nUPtpW2oLQoZCknIMQtpp6Z0BNNbRvihUQAgBACAEAIAQAgBACAEAIAQBoYADpvAAn8gIA4nZhpLKlqUPLxjOesVScnpFJSUFtle'+
'nG9xOtzypmzrcmzLy8mfLqL7at04/An1B7mJfxeD1ackc/5bkZXz+Kv0Vx3FXP21O/AkolGjhpo7gep/OJ7GChHSK4mNGuG37OoWFOulRV8X'+
'RHomPcVs2MUl5YUtDZPNkBs8rhA6q9EesXe0YR2y5GPZ+CwXw7eDqYrE1Lal3hJqRKD/ANqpzzeUPJ/E44TukjsB1iA8vybbdcGbfHp/LLO2'+
'GG5ZlDTSQhtAwlI6ARCW9vbNmlrwjkihUQAgD4avTpesU5+UnGETEs6lSFy7vyOAjGD7R7hN1y7Rfk8yW1op346eEeoaG3cu5aI0qYtGqrLi'+
'mkIwJJ3qUjHVPuY6NxXIq2HVvyaW6pp+SKCnW0JaVkqS8PulJGxPvEl128o1z8G7BDiivBJHKpPaLkPs9ib7+Eetse6zR5tqXdeVLpzmXmU7'+
'qYczsoRi5NauWiOZuHKD+Wv2WucEnEwm+qUmz7hdaYr8okeS5z5+1I/iOe/sI51ymC6pd4kl4fkldFVT9kuojhKxACAEAIAQAgBACAEAIAQA'+
'gBACANOu8Abch1Ch2O0ARc4yOIZnTK1XKHS3kprU8ny2eVYy0k7KWR2PXGY3/GYjsmpNEV5bkPjTriypG+7oXW6nMSSZtTjafifmycqeV657'+
'x0eNEa/RHsHFco/LP2eOQpS0hR+U7JjKSbRuqob3v8G7KRnmOEj5j6DvFG9Htr5HpEsOBHhEf13uaXuettqFl0mYCpULSUmaUN989RET5TkP'+
'ij1izZ41Tb8ouIpVKlaLIMyUkwiXlmk8qGkDCUj2Ec/nOVku0vZukklpH1x4KiAEAIA2KQHBhQ2EAeb1D0+pOpNqVGhVaVbmJacaLR5055fQ'+
'j0MZNF8qJqUWW5wU15KTOKfhwq/Dff8AMU5banrdnVEyb5QSlGe3N0jpnGZ0boLyaHIr6vyYWCSjCCckbZ9Y3z+7yjDX9P8A9wMc6Ssf0cH7'+
'5XdKfUe+YtJeT3JJx8mV9I9SKnQqzITUs8Zeq09Yck3grBdQOiTGFl4yui9kXureDYr6y5bh01upmten0nVGJlBqrY8qflfxtOjrt6H1jlmX'+
'Q6bGteDoeFkxyaYz35MrRgmwEAIAQAgBACAEAIAQAgBACANOsAbeRPMT3xjrAHgNV78puk9kVCoTDxaCEKUgqV0X1A/OM3Ex3dNL8GtzcmOJ'+
'U5FNOv8Aq9O3teE/V55XnTtSylJB6I/+o6bhUKqCWjnlcZZ9zs/gwoAAAANhG0fnySiP2rRoQpzLY6EZHsrsYvQl2Wi2/L8GWeGLQGpcReoU'+
'rTJZpf7AlVA1abx8Jwc8v59I0ubmRxotGdRU9ovKsWyqRYNq0uiUans0+RkWEtNMtJA5cDfPqT3jlVk3OTbZIktI9DFoqIAQAgDQ7wBorGO/'+
'XtAGhylX9kwBjXiC0Oo2ven07btVaSXFoJlnj/snOyoz8PKli2dl6LFtStWmUaaq6Y1jR2+Kha1ebW1OMOLTLOqGzqAcBQ+sdTxMlWwTI9dD'+
'qeSH3jOVp5VjqPeM/wBPZjxnrwb5d9yXmWZhv5mzkRSz70WL6/kRLHhV4g5jS685GtMuj9mz6kStRT7A9YjXI4itr1o1GDdLj7329MuBoVbl'+
'LjpMpUpF0PSky2HG1g9QY5xZXKqThL8HSa7I2wU4+mdhFsuiAEAIAQAgBACAEAIAQAgBAHE6+hhK1LIAQnmUfaKpbekUb0tsrB479e/3ouN6'+
'iyj4/ZdNUUzSUL2ed7D2wInfE4mkm0c45TKlmW/FEgTUJ1dRmXHnByZV90c55B6RM+ulo2GJjrFgt/k+IOABZc+AhWEgb80VivwZDO1ta2an'+
'e9yyNu0WWVM1aecSltCR8refiX+XpGNlWrHj2Miqvs/Jd7wl8PtM0D03lKbKIC5x9tLk3Mqa5FvOdSSPaOYcjlvJno31FfVGdI05lCAEAaAY'+
'gB36/lAGilcoyRgepMAdfUa7IU9pTkzMttISMlS1hI/UxehTZZ+1GNPJqh7Z5Cga02ncl2C35Gty71SIJTLtrCirHXpFyzFtqW5LweK8iFst'+
'IyAQFAg9DtGKZhEXj54VWtZ9Pna5RmALqpSC42ttvJdQkfKfTaJFxec6pquT8GFfSpLaKeXZeZlnXmZxsszTDhaeaI3Ssdo6ZVNWw2iN2QcW'+
'cWVFKuXv2h6PUWd5adbbo8+C4kqkVJCHGub8Z/FFHBTT2ankMb5I9oryi0bw/NfUVGXVp9VZtbk4wgvyTj23mNdx7YjnvMYvWTkkZ3Ccg5f0'+
'Jk4grIOdsGIoTc3QAgBACAEAIAQAgBACAEAIAwpxS6qNaaadz8yh3knHUFloA4JURt/jG34/H+We2jScrlrHpaT8spd1QuRytVFTbiiZh0l2'+
'aVn5nCf+kdOxqVXDwQnjqnZZ8kzxC8nBP9WBgfWM6PlEmsl8j0vwbCrlQtahzFpGfzi231js8LyyyfwzeGRUvTk6mV2XzPTS0imFaflY/Gd/'+
'eIFy+c3uCZusav8AJY+BgbRDTaGsAIAQB8M3W5GSDnnTTSCgZUFLAx+sXI1yn6RZndCv9zMH6jcZWnlgeey/XpWYnG8hTEurmU3j+I9N/aNp'+
'Rx87H5Rp7uTjDxFER9SvE/mnXVtWrIibCScFzvElo4RS/Bprc+6x69EUdQeKXULUZS0VS4HpdpSifKYWRgE9No3lPHQpaWjGUbLHvZ8fDzqn'+
'MaX66WjdLzj5al5wNTLrrmQ6lz4AMH3MORxa3S1o2WLCdct7L6KfMCbkZd8EKDraVgj3GY5RJak0SyL2kzfMcpbKFpyhYIVt2jyn1eyrKjfE'+
'f4aE6Y38ze1HZ8i3ay4JVbaBsmaI5snHQYzuY6Dw+b8i6yfk1GRSQvCFoJBiY635NV1SfgLHOotr+7aWByq9VCC16PG+24matENTZ+26tT6u'+
'y9y1CkvIdWpHzKl0n4h7xqeQxlZBsjFkP0V/yRLttNrzl9QbJpFeliC3OsJdwDnqI5XfV8VjidJw8hZNKmenjHM4QAgBACAEAIAQAgBACANj'+
'ykoaWpZwgA5PtFUt+CjeltlYHHxqt+8V+OUlKv6PTm1KGDsFDt9Y6Bw1PWtbRzPl7Xflai/BAKYmlz77kyv5nVEmJfBG1qr6QSOMkgZHUbj6'+
'w87Mj8GRuH3SdzWzVmjWtLtqMg24mbnnANk75jWchkqFbiZNEHJ7L4bOt1i07ZpdIlABLyjKW08oAyAI5PdP5LHIkkI9YpHbvzDUskKdcS2C'+
'cAqOMxbS36PTaXs+Ocr1Pp60omppthROBzHG8elXJrei181e9bPuCwojGCkjII7x4LxtmioSzpRsvkOPriKo8y9PRTpxrXrqHQdSa1bVWuOZ'+
'fpraw61yKKMpO4G0dH4jHrnWno51kTl+o6yZFSfqE3WVpQ4+Vp+dK3iTk94ksKq4P0bGvH0lJmynSk1VnuWTkJidW593zS7RUM/lFLL66X7M'+
'l1be0iQGmPAZq5qf5a1UFNrSZwfMd6qSeit/WNJk8xTX+1+TKjjOXpExNJPCotigPy1Qu+qvVqbbCVoZ6JbWD8wiNZPOzsXWKNhTiOPlk5rf'+
'oUtbFKlqZIoLclLICEc6yo4ERac3ZLszYpdVo7SPB6Mea86UymsumNbtmbSD9rl1JbJAOF42Pt9YzsPI/T2qX4LVse0dFCd3WxN2HdFXt6pI'+
'Uico76pdtChupGesdYxb1dWiOTj9x1Seg2x7HtGQk0y3Fa2dpbdWcodXanG/wjCv7p6xWS2jUZtXywLTvDj1M8ySrNhTLmDJgTkrlWeZKuuP'+
'1jnnN0pSU0jP4DISTqkycIGABETJoawAgBACAEAIAQAgBAGwKJWR2gUPN6lXAi1rGrVUWOcSkst7k5sFXKM4z+UZFEe9sUYebZ8WPOX9ijnX'+
'S73bhr09NOTJLtTfMwHDv5SDvye/1jq+FSq4JHNMP/kWOyXkxT5oe+JKORHRIjaJaRK2kopAEJ3PQbmLWxrZZt4VOjjdOtSsXxPsgTFRdLbK'+
'Fo3CE/i5u4PpEB5zIfbrE3GJXryWEvOeWypYGcDIEQ82j8IghxacaF0aS3POUSk0JuVebRlFSm1hxLoPZKO0SjjMGN/siWdmyUuqILXXxe6g'+
'12sS1Reqj4Zk5hDipbzP65PNvv2iWPjIKt+DGprm5bci6DRi7Wb904oFbl3Q63MSjS9lZwSkZGfYxzjNq+G5xJdj7UFs92RmMIySuLxO9Lmg'+
'ZG5pdpWE/dPBI3UD3z7RN+Dv39rZCOVoUL1NFbrrZaeU0n4gPgbUvcDPeJxOttbTLnyN1x0Wi+FvOWpc2ltQpzlCkFXDSJghb7iErW4D0IB6'+
'Rz7m3bCSafgkGEoyr2ye6Ety7YACWkjsNgIiW3I2Wkjobm1BtyzacqerFZk5CWSeXneeSnJ7gDO8X4UWzelEtysjH2zp9MNZ7U1ikpybtepI'+
'qUtKzK5ZTrfylSeuDFLKJ1fuRWM1P0e6iwXDatQbClKUEoAySe0CjeipLxOtL6fR9Sqfe9DCHWZweXNtNpx8f8RMdD4SyXVKRHMiyHd6fgha'+
'4MLUM82D1HeJe/Zj73E2knkWAeUlPT19oLyeVDtBkpeEvUx60NQrOrqSpXI6JOabC+XzUk4AJ7YzEa5PH+SDItiWPGz0vxsuaYeS+0hxPyqA'+
'I/SOZtOL0zqsWpLaOSKHoQAgBACAEAIAQAgDiZ6KJGN4FERs42bzXbmk1eUHFJK1tSfL0+Fzr+sbvjau1iZGeaucanApyvl1K7hebUPumEgJ'+
'jqUFqJHOHqXx7Ohz8I25QBtF1Pwbly3LRzSUkanPSkin5pyYblU/VxXKP8YsyfWuTMlLbRf5oLp+3pnpHbVuhlLTknJobdwN1KxuTHIMy13X'+
'SlskdcesT3c0+iWl1uLBKUjJAGYwX4LyXZ6RAPxL9ME1SjUevy7QTylSFKxuoYyImXC5Kj9rITzFHSxSRV83ygHzB8JSqX/3on8U3DR6rnJa'+
'LVvCr1Udr+kM3aM04VzFuzIacUrc4dOUD+Uc35mjpPv+SS4820TsBzEXM4wtxS6dtal6TV+TQlDzyGCtGCMpKQY2mBbKq5aNDytXapz/AIKN'+
'rhpT0jU35EkpeZWcf7p3jrmPJzrRosSfeLTMx8IHEuOGe/avVjIuT1NqUqS4gHYKA6xp+Q45ZUdM2tN0q14Mh6meJnqrezbrNvSstbEoslIW'+
'tXMsp7Hf2jXY3EUxe5Iyf1LfhsjFct33BfVQ+13JcFTrTq1cy23HVBlBPdO+IkUcbHgvCMOdrZZx4Sa2mND6tKsrYOKxMEJByoHbGYgPOQUW'+
'nE3OLJv2TqmZ9iSZW4+8htKBlRKukRVJszpSUfbMB6ia3B8vyNLUopOUKezt9I3+LiKS3oi+fyDgtIjDrjbTt76WV6Sm1+bMyjSpoKVuQAMx'+
'JcSCpfgjlOS7peStpg5YbJOTjr6xKU9xTN2n6RyBQbUlxXyoPMfpFYPbL2+r0e90vn3JV2aYQohyVeTOIPoBvGNlwTTIvyMfitjai8/RO5f3'+
'y0ntauZz9vkW38/Uf9o5LlrV8kdEwJ/JjQl/KPbxhmwEAIAQAgBACAEAad4A2E/fAZ/D0gUITeJJVQxRrfpvQzT/AJmP4uUfziW8Gk29kF+p'+
'pa6Iqmrrnm1ioHr94ev1ifQLWAtVI+FKQst5VhKTn+UZH4NjNGSuGm22bi17sWnzjiRLImhM5V0KknIz+ca7K26pJfwXPlVajsvsplRYnGWw'+
'lafMCQFIB/w9Y5FZCUG9ok1dkbI7RyOJEwHmHAeReRn8os7LqbT2Ym4hdMV33phctJUS8iYlcoUdygo3AHp0jbYV0YTSfg1PJY/6iHZfgo1u'+
'+nKpFwTTLqORxLxBSRjGDiOt4zhOK0yJY1kk9P8ABnDgW12kdCNb/ttaqD0jb07KOicS2nKXFAfBn6RoOXxFfFxj7JFRe4tMlRqf4slHkS/K'+
'2Rb71TIKh5zuwPuIjuNwTm9zZnzyml4Ikaocb+rup7C5WZudVJpy8hUjJoCSoehUN4lGNw9MPuRqrcj5PHswU6+uZeU846XHVnKio/Fn3jcw'+
'hGv0zEUHL9qNoHbt6RSco2eNl9eF1kd3Z9jXPqBPoaty3J+sTkwfLSplpXl+nUjEYll9WKttlY0zm/RKXSvwytULsbYduOeatCluHDzKsFwj'+
'09o0ORzsHtRMyOI15kTS0T00szg2tOZpFHq7tYnXl8zpxnc9TEZvnPN/GkUnmQxm/Ozrrv1Gq13rUh9RbZJPLynlJT2ziMyjHUUlojt2ZObb'+
'2eWS2lvlCd1ZzvG1jHqtI1M7XL2bZlv7bKTTGAftbJZOffaLqkUhPXpFX930/wDZN312RwB9lnnWcAdMGJHU/sRJavME2dOs4SYvovNnpNP3'+
'i3Xik5+JBH12i3PyRzmIN1Muf4HKwanw/wBDZ5siTKpfGemN8RyvlIpZDaJZwMm8SKZIKNOSQQAgBACAEAIAQAgDiIP2lJxtyneBT8kDPE2z'+
'+07CUDtmaSR/ujES7gvbOe/Uz/qQKvahvU5/PXnMT9eDIw1/SR8SUJURzZI9BFzZnPyj3uiCltX1JutrU1MISrynQfk2i1KKn9rI7ylsqobR'+
'N7TXibumxGw3MvKqki11QsHzT9DGkyuJjJeEaTC+oJ1y1Ik3YvGNa1yty6ZqdNKmXBgS88nJJ9eYdB9YitvDzj6J/jc5VYltmZZG9aZcNPWE'+
'TEvMBaCOVh5K0uZGMeojTzxLapejcxzabYPyU98culjli6x1NSJXllJ4faWUtjPlg/hPqYnvF5H2psiMa+sn5I2luaLPIllxCV4UtakdvSN9'+
'K6qT8mygtL2bg2orCWm3kIAx90nJj389UFqJ6k9r2e5tLQu/rvkJiq060qmqksf1k2+gy2B6/GI0WdykcKpuRuuIwFl2qpeWel1X4aKvpXpp'+
'QL6mK1IVWnVZ9bDstJtkuyJSMgur6EHoMRZ4rmqcvakZHLcVfxtn7WYnkKbN1JXLKSrkx0ICRjmB7xvJyhrtFmgsnGxfwyz7gM1YbtTQI02t'+
'SSWarSJknmbbSHH0k5AGR2iE8lTZbPey88+FMdJGULw1mrlxuONS3LKS34VKJCyD2PaMfF47xuRpsjlpz8HhHX3FnzFFS3juVKOcmNpVXClm'+
'mnKdz2bSebClbnvF9OO9nn14Nzagh5LhAUlO5SDvCU0WzSnpKZ1lB3+9SoEdhnpFtS2yqKzdVttVb2/+ZmP+aJTT/wBNEpr/AOnE8qrt9YyE'+
'H7O/srH7zN4/hi1M1XK6+Jlwnh8pP+g4qyf/AHJ4AfkI5dyv/cNG/wCCX/HTJQxpSTiAEAIAQAgBACAEAaY3zAEEfEulFOzVirHTzJnHv8Ai'+
'X8F7Zzv6o8TrZVtWUhFWqH/5DE/MrAe6EfEkfEn0ihlJ+dHtNHZzyb6kwNyULAx64j0jScxBfF2ZIYc5SlaXVIUPmSoRmL7vZzJ9bP2nIUpc'+
'HNhtfqFDEWrIQPKlbW/DPsptXqdGVzyM/M01XYsOlUYUsSuzzoz687Ir/J8F9VievEsv1qddqky2jkLjgzGP+jhDwjJ/3e5M8a9QJJ1JSrcK'+
'AAQlPTEe/wBCtbM9cxd1Pb6eVs2d8NPptEdX61KTSv8Axjx+mik9nmHL3zlo9xXdW73vKkzkjO1lS6Y/hLsq2nkGB7ekcd+sc2qupwh4PpP/'+
'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';

var logoBuf = null;
HF.logoBuf = function(){
  if (logoBuf) return logoBuf;
  try {
    var bin = atob(LOGO_B64), n = bin.length, a = new Uint8Array(n);
    for (var i = 0; i < n; i++) a[i] = bin.charCodeAt(i);
    logoBuf = a.buffer;
  } catch (e) { logoBuf = null; }
  return logoBuf;
};
/* kept for callers that still await it */
HF.logo = function(){ return Promise.resolve(HF.logoBuf()); };

/* ------------------------------------------------ message text */
HF.message = function(inv, link){
  var t = HF.totals(inv);
  var first = String(inv.client || '').trim().split(/\s+/)[0] || 'there';
  var L = [];
  L.push('Hi ' + first + ',');
  L.push('');
  L.push('Thanks for having us out. Here is your invoice from ' + HF.company.name + '.');
  L.push('');
  L.push('Invoice: ' + (inv.number || ''));
  L.push('Date: ' + HF.fmtDate(inv.date || HF.isoDate(new Date())));
  if (inv.work) L.push('Work: ' + inv.work);
  L.push('Total: £' + money(t.total));
  if (t.paid) L.push('Balance due: £' + money(t.due));
  if (inv.payto) { L.push(''); L.push(inv.payto); }
  if (link) { L.push(''); L.push('View or download the PDF: ' + link); }
  L.push('');
  L.push('Any questions just give me a ring.');
  L.push([HF.company.person, HF.company.name].filter(Boolean).join(', '));
  L.push(HF.company.phone);
  return L.join('\n');
};

root.HF = HF;
})(window);
