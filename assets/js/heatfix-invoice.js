/* ============================================================
   Heat Fix Mcr Limited — invoice engine
   Shared by /invoice (the builder) and /i (the customer's view).
   No dependencies, no build step: writes a real PDF byte-for-byte.
   ============================================================ */
(function (root) {
'use strict';

var HF = {
  company: {
    name:   'Heat Fix Mcr Limited',
    person: 'Mohammad Ejaz',
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
  var words = String(s).split(/\s+/), lines = [], cur = '';
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
  txt('Gas Safe registered engineer', M + (lw ? lw + 16 : 0), hy - 43, 9.5, false, GREY);

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
  var mx = M;
  meta.forEach(function(m){
    txt(m[0].toUpperCase(), mx, y, 7.5, true, GREY);
    txt(m[1], mx, y - 15, 11.5, true);
    mx += 132;
  });

  /* --- bill to --- */
  txt('BILL TO', xr - 200, y, 7.5, true, GREY);
  var by = y - 15;
  txt(inv.client || '—', xr - 200, by, 11.5, true); by -= 14;
  [inv.caddress, inv.cpostcode, inv.cphone, inv.cemail].forEach(function(v){
    if (v){ txt(v, xr - 200, by, 9.5, false, GREY); by -= 12.5; }
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

  /* --- notes + payment --- */
  var ny = Math.min(ty - 24, 292), NW = A4.w - M * 2 - 220;
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
  if (inv.gassafe) right('Gas Safe reg. ' + inv.gassafe, xr, py - 24, 9, false, GREY);

  /* --- footer --- */
  rect(0, 0, A4.w, 44, '0.051 0.165 0.388');
  txt(c.name + '  ·  ' + c.person + '  ·  ' + c.phone, M, 24, 8.5, true, '1 1 1');
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

/* fetch the logo once, cache the ArrayBuffer */
var logoCache = null;
HF.logo = function(path){
  if (logoCache) return Promise.resolve(logoCache);
  return fetch(path || ('/' + HF.company.logo))
    .then(function(r){ return r.ok ? r.arrayBuffer() : null; })
    .then(function(b){ logoCache = b; return b; })
    .catch(function(){ return null; });
};

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
  L.push(HF.company.person + ' — ' + HF.company.name);
  L.push(HF.company.phone);
  return L.join('\n');
};

root.HF = HF;
})(window);
