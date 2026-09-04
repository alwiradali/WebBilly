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
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAQDAwMDAgQDAwMEBAQFBgoGBgUFBgwICQcKDgwPDg4MDQ0PERYTDxAVEQ0NExoTFRcYGRkZDxIb'+
  'HRsYHRYYGRj/2wBDAQQEBAYFBgsGBgsYEA0QGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBj/wAAR'+
  'CAIIAjUDASIAAhEBAxEB/8QAHQABAAICAwEBAAAAAAAAAAAAAAEIBgcCBQkEA//EAGcQAAECBQEEAgkMCwoLBgUFAAEAAgMEBQYRBwgSITFB'+
  'URMXImFxkZSz0RQVFhgyN1V1gZXS0yMnQlJXZXSEobGyMzU4RUdWYmRykiU2Q0RUgoOToqPBJChztMLDNEaFxOEmU2Ok4v/EABwBAQABBQEB'+
  'AAAAAAAAAAAAAAAGAQIDBAUHCP/EAEERAAIBAgIHBQYDBwQCAgMAAAABAgMEBREGEhMhMXGRNEFRUoEUMmGhscEzU9EVFiIkcuHwIzVC8Qdi'+
  'Q8KCkrL/2gAMAwEAAhEDEQA/AL/IiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAvkqlSk6PRpqqVCMIMrLQ3RYjz0ADK+tVr141GZVagbMo'+
  '0xvScq/enorDwixRyhg9IbzPf8C3LCzld1lTXDv5GjiN7GzoupLj3LxZ32lGq0xXdSqrTKzG3IdVimYkWOPCC5ox2IeFgB8LT1reyoFLTExK'+
  'TsKblYz4MeE8RIcRhw5jgcgg9YKuNpjfsvfVoMmIjmMqksBDnYA4Ydjg8D713Md/I6F1scw1UWq1Jfw8H8P8+px8AxTbp0Kr/i4r4mboiKOk'+
  'mCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIoc5rGF73BrQMkk4AC1BdGvtFpc/EkbfkHVZ8M4dMuf2ODn+icEu8PALUu76hZx168skb1'+
  'hhlzfz2dtBya+XN8DcCLRlG2iYMSdbCr1vmBAccdmk4vZC3wtIGfkK3PSqrT63SIFTpc1DmZWO3eZFYeB9B7yx2WJ216nsJ55d3f0MuI4PeY'+
  'c17TTaT4PiuqPsREW+cwLXFn3u+o6s3Ra0zGD2Qo5iSZPQGgNewfLx+UrPKpUINKok3U5lwbCloLozyTjg0ZVPrXuKYpepkhccR53vVvZI3H'+
  'm2I7Dx4nFR7GsT9jrUEnxe/lw+/yJVo7gv7Rt7mTW+Md3Pj9svUuYigEFoIOQeRUqQkVCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiI'+
  'AiIgCIiAIiIAiIgCIiAIiIAiL5KpUIFJok3VJo4gysF8Z/gaCT+pVSbeSKNpLNms9aNTPYjRfWGjxwK1OsPdt5ysI8C/+0eIb8p6FVIlzjkk'+
  'kk54ldlX63O3Hcs7Xai8umJuKYjsng0dDR3gMAeBdavRMNsI2lJR/wCT4nmeKYhK8rOX/FcEcgu+tK66pZt1y9cpjzvQzuxYJOGx4Z90x3h6'+
  'D0HBXQA9AUreqU41IuE1mmc+nUlTkpweTRey2ript1WzK1ylRd+XmG5wfdMd0scOgg8Cu2VatnO5osrdU9a0VxMvOQjMwm/exWYDvG39kKyq'+
  '86xG09lrypd3dyPTcMvfbLeNXv4PmERFonQCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgNV673FM0ewINMk4hhxKnFMF7mnB7E0ZcPl4DwEqs'+
  'wCsnr7Q5ioWNKVeXYXinRi6KB0Q3jdLvkO6q3LzHSt1PbspcMll/nM9n0FVJYbnD3tZ58+75ZHHC3JoDcU3L3VNW1Eil0pMwXTENh+4iNxkj'+
  'wg8fAFpzpW3tAaDNTV6zNwFhbKycB0EPI4OiPxwHgAJPhC0tH3UV/S2fjv5d50dK1SeF1tr4bufcWORF8FarNPoFCmavU44gysuzfe48z1AD'+
  'pJPABesykoJyk8kjwmEJTkoxWbZrPXq6GUyy4duwIo9VVJ32QA8WwWnJ8ZwPGq3cd3C7q7bknLtu6brc7wMV27Ch54QoY9y0eAfpJXTNHJeS'+
  'Y1iPt106kfdW5cj3nR3Cf2ZYxoy9575c33enAuhZ0+apYFGqDjl0aThOce/ujP6V3axDSzf7Ttv9k5+pR4t44/RhZevVbSTnQhJ96X0PDr6C'+
  'p3NSC4KTXzCIi2DVCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiALEtT4MxMaPXFClQTFMi8gDqHE/oBWWr85'+
  'iBCmpWLLR2B8KKwsew8nNIwR4lkpT1Jxn4PMx1obSnKHimigDsHlyUYWWah2RPWJeMemxYb3SMRxiSUwRwiQ+gZ++byI+XpWKjivTaNWNWCq'+
  'QeaZ5RWozozdOayaIxxUoeCAHPDiepZTFkbG0LgRY2t1MdDziFCjxHn+j2Mj9bgreLT2hOn01bVFj3FWZZ0Co1BgZCgvGHQYI48R0Fx4kdAA'+
  'W4VAMbuY17luHBLI9GwG1nb2qU1k28wiIuQdoIiIAiIgCIiAIiIAiIgCIiAIiIAiLhEiw4MIxIsRrGNGS5xwB8qDic0XQTd8WfIkiaualQyO'+
  'Y9UtJ8QK612qunrXbpuqSJ728f1Ba0ry3i8pVEvVG3CwuprONKT9H+hlseDBmZaJLzEJkWFEaWPY8ZDgeBBHSFpK59n6HMT8SZtWqQpSE7j6'+
  'kmwXNYeprxxx3iCtkwNRrFmCBCuql5P30YN/XhdhDu21orcsuOkuHem2elad3Qsb+KjVall8d5v2F1iWFzc6ClHPimnk/Ro0pRtnmqvnmur1'+
  'clYUsDxZJhz3u72XAAeHBW8qHQ6ZblDg0mkSzYEtBHBo4lx6XOPST0ldfOX3ZshCMSauelsaOqYa4+IEkrX1ya/0GThRIFtScapTHENjRmmF'+
  'BB6+PdO8QWpRjheEpyjJJ882dCvPGsekozjKSXwyivj3I2pWKzTKDSI1Tq05DlZWEMue8/oA6SeoKrepOpE5fNUbBgNfLUiXdmBLk8Xn79/f'+
  '6h0LH7mu6v3bUfVlcnnRy3PY4TRuw4Q6mt5Dw810gHDKieNaRTvVsaP8MPm/7fAnejmiMMOkri4etU7vBcvF/EkKQCTusBc48AOsqGk5Wc6U'+
  '2ubm1IlGxIe9JyRE3MZ5Yae5b8rsfICuBaW8ritGjDjJ5Epv7uNpbzuKnCKzLN2rTfWayaTS3cHy8pDhuB++DRn9OV3CwZ91w5zXqXtKXeC2'+
  'Sp0WZjkH/KOLA1vyN4/6yzle2ezuhGMX4LLkfN/tKuJzn35vPn3hERULgiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiA'+
  'IiIAiIgCLXGoGsNv2REfToLDU6uBn1LCdhsLq7I77nwDJ8C0TWtcNQ6vGcYNVh0uCTwhSMINx/rOy4rq2mD3FytZLJeLOReY3bWr1W834ItR'+
  'cFuUW6aLEpVckIU3LP4hr+bD0OaRxae+FpGubNb+zuiW3cbRDJ4QahDJLe9vs5/3VqZ2pOoJOTeNY+SYIUs1Iv7ez7Mazn8pK7VrhV9a/hVU'+
  'l4dxwbvGLC731qTb8e8z+W2bLriRw2artHgw88XQ+yRD8gwP1raFk6JWtaU3DqU06JV6lDIcyNMtAZCPWyGOAPfOT4Fo2i62ahUaO10SsCpw'+
  'geMGfhh+f9YYcPGt7afaxUG9ojKbHYaZWCP/AIWI7LYvX2N3T4Dg+Fa+JrEowe0lnHv1fv3mzhUsLnUWzjlPu1vt3GyERFGCWBERAEREARdR'+
  'cdzUS1KK+qV2ehysu3g3PF0R33rWji494LQty7RlXmY0SBa1MgyMAHDZmbHZIpHXu+5b+lbtph1e6/Dju8e40LzE7e0/Flv8O8siipnMawak'+
  'R4m+brmmZ6IcOGwfoavx7a2ow4+zCo/8H0V1Vo3ceZfP9DkPSi38j+X6l0kVLO2tqMTn2YVHwZZ9FSNVtRf54VHxs+in7t1/Mvn+g/ei38j+'+
  'X6l0kVLe2vqMXY9l9Q/4PorkNVNRs59l9Rx4W/RT926/mXz/AEH70W/kfy/UugiqVbF1avXfXGUqiXHUo0U8XxCWiHCb98927wH6T0KytqUG'+
  'rUSl7tbuWdrc7EA7JFj4axp6mNA4DvnJK5t7h7tN05pvwWZ07DEle74QaXi8jIF0lyXdb9pyHqquVCHLh37nC91Eid5rRxP6lg2pOr0pbBi0'+
  'WgOhTVYHcxIh7qHLHv8A3zv6PR09SrlVKnUKxU4lRqk7Gm5qIcuixXZPgHUO8OCg+L6S07NulQWtP5I9IwDQ6tiCVe5epTfV8vBfH5G2Lm1+'+
  'rE450C2JFlOg8vVEwBEinwN9y39K1hVrhrlejOi1irTk649EaKS0eBvIeJdXngp5KBXeKXV28602/h3dD1CwwSysElQppPx4vq95G60HgAPA'+
  'pHAc1GDlR3lonVyJdxxnim63Gd1viUZUhUzDRBaByA+QIMdKE4KAKuYQ4Z4LkOngoHLgv1lpaZm5uHKysCJHjxXBkOFDaXOeT0ABVSbeSRbJ'+
  'qKzb3Ey8tHmpuFKysB8aPGeIcOGwZc9xOAAFZeh0+naNaQTVUqhZEn3ARY4aRmLGIwyC09IHL+8V8Wm+m8pY9MiXXdsSBDqEOGX/AGRw7HJM'+
  'xxOeRdjmejkFprVjUaNfdyNZJOiQ6LKEtloTuBiHpiuHWeQHQPCV6xoTorN1NvXWT+i/V/JHhn/kPTWEoey2zzj/AP0/HkvmzJNDJ+aq+uc/'+
  'Vp+IYk1MykeLEd1uc9hPydCs6qqbPL86uPHXIRf2mK1amuPxUbrJeCPPNHZOVpm+ObCIi4h3giIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiI'+
  'gCIiAIiIAiIgCIiAIiIAsB1cvl1j2G+PJuaKnOOMvKZ47hxl0TH9EfpIWfKre0XU4s1qbK00uPYpOSaWt6N57iSfEG+JdLCbaNxcxhLgt79D'+
  'l4xdStrWU4cXuXqaijRoseO+PHiviRYji98R7sucTxJJ6SuI4r8+JOMrmMgL0NLLgeaNt72Se8o5KVA5qpQno5r9IEeNLzMOYl4r4UaG4Phx'+
  'GHDmuByCD0ELhhQBxVGs9zKp5PMuTpPe773sGHNzhb64yr/U83ujG84DIfjo3gQfDlZ0q17Nc/Fh3jWqZvHsUaTbH3f6TH4z4nqyi86xW3jb'+
  '3MoR4cep6bhFzK5tYTlx4P0CIi550gvgrVYkaBb85WalF7HKysIxYjunA6B3yeA75X3rR20lXYktbFKt6DF3fVkZ0eM0dLIeMA97ecD8i2rK'+
  '39orxpeJqX1z7NQlV8PqaPvW9KvfFzxKtVIhbDBLZaWB7iXZng0d/rPSfkWOdOFBdhSF6RSpRpRUILJI8uq1ZVZuc3m2SeCjmeGFPNcTwHBZ'+
  'DGTkA8wnTlcW8TxXJAB7rku3t6iVG5LjlKHS4XZJqZfuNzyaOZc7vAZJXUhWY2e7NZT7ai3fOwR6rn8w5Yu5sgA8SP7Th4gFoYleK0oOp393'+
  'M6OF2TvK6p93F8jZFl2ZSbItmHSaZD3nnDpiZcO7jvxxc7/oOgLCtXtTDbcobdoUwBVo7cxYzTkyrD1f0z0dQ49Szi9LolrQsybrUcBz2Dcg'+
  'Qz/lIp4Nb4+J7wKp1Pz01U6pHqM9HdGmZiIYsWI7m5x5rxHSnG50I7KEv9SfF+C/ufQWhWjlO7ntqsf9KG5Lub/Rd/ifg5znPLnOLnOOSSck'+
  'nrKcXcwnTlSOS8z4nsq3cCOSnp5J31+sCXjzMQNloEWM4/cwmF5/QqqLbyQlNRWcnkfkcAcMqOCyOWsS85xofL2tVXtPImXc0f8AFhffD0n1'+
  'DjY3bYmGD+nEht/W5bUMPuZ+7Tk/RmhPFbKn79aK/wDyX6mF5BU8itgwdE9QooyaRLwv/EmmD9WV28noBeEcZm56lSveMR0Q/oatmGCX0+FJ'+
  '9MvqatTSTDIca8fR5/Q1OBnKkcOZwFv2m7O0mxzXVe5I8UDnDlYIh5/1nE/qWWQrX0s06l2zs82nSsVvETFQiCJFJ/oh3T/ZC6tpoje1pJTy'+
  'j830Rw7/AE9w23i3Tzm+i6v9DRNqaYXZdj2RZaRdJyRPGcmwWMx/RHN3ycO+t60W1LH0loT6zUZuEJgNxEqM3jfcfvYbejPU3ienKw+69oum'+
  'SrXytoU189FxgTk0DDhNPWGe6d8uFoe47pr111T1wr9RizkUZ3A7gyGOpjRwaPAvS8A0DhbtVKi3+L4+i7vqeQaT/wDkmteRdKm93guHq+/6'+
  'GZ6nas1G+Zl1OkN+SoUN+WwCcPmCOTon6w3kO+VrUuzw5rjnLj1LiCvTbe2p28FTprJHklzdVLmbqVXmzbWzxx1ef3pCL+0xWtVUtnbB1dif'+
  'F8X9pitaobpD2v0RONG+x+rCIi4Z3wiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAql6/wDDWiYP9UgfqKtoqkbQ'+
  'B+3VM/kcD9RXd0e7V6P7Ef0l7H6r7msABzC5KByXIKcnn4wo6VyUY4oAeCnIRQeSA3Ds4HOqM/x/i1/nGK0Sq5s3HOqFQP4td5xitGoHj/bH'+
  'yR6Fo52Jc2ERFxTvBVo2lXk3zRYeeDZBzvHEPoVl1WTaUI7YdIHT63f+65djAe2R5P6HE0heVlLmvqaTdxce8pDutHe6XIKfHnQXHjx4c++u'+
  'We8iA4cQeK5A5KnwogPqp0lFqVVladL8YszGZAZ4XODR+tXupVOl6RQ5OlyrQ2DKwWQWDvNAH/RU+0ikhP600CC5oIZHMfB/oMc4fpAVzehQ'+
  '/SWq3UhT8Fn1/wCia6LUUqU6vi8un/ZXPX25HTl2StuQX/YZGGIsUA84r+Xibj+8tP7ueIXdXXU3Vm+qvU3Oz2abiFv9kOIb+gBdvYmntZve'+
  'o7ssDK0+G7Eede3LW/0Wj7p3e6OlfPl5KriV9PZrNt7uSPqbDo0MHwyntmoqKzb+L3v1zMVlJKbn52HJyMtFmZiIcMhQWlznHvALa1saC1+o'+
  'MZMXDNw6TBPHsLMRYxHf+5b+lbhpFuWZprb0SbZ6nkobG/Z6hNOHZH+Fx/ZHiWqbz2iYpixJGyJRrWDINQm2ZLu+yH/1d4lN8E0FdZqVZaz6'+
  'RXN955vpF/5KdHONs9SPi98nyXBGw6bpXp3bEoZqckYEfcHdTNUiB4HyHDR4l+U7q1pdboMtLVSWeW/5Kmy5eB8rRu/pVV6zcVcuCaM1W6tN'+
  'T8UnP2eIS0eBvIfIF1RccL0yx0Qt7eKTyX9KS+Z5FiOmt3dSb3v4ybfyLLT20pbkGKW0+3qnNN6HRXshZ+TJK6h+0y/ePY7Objo3p30MVfwT'+
  '0qc8F2IYFZrjHP1ZxJ6Q3suEsvRG8I+0tXjkSts02H1GJGe7HiAXTTm0Nf0xn1O2lSf/AIcuXn/icVqbHNR90FmjhFpHhTRgnjV5LjUf0Myq'+
  'eqN/1aE6HN3VPhjubJdwgg97uAFiUePFjxjFjxYkWIeb4ji5x+UrgOSg5HALdp0KdP3IpckaNS4q1d9STfNk5J5qDyQHoUrKYSGjHNDwbwUl'+
  'RnigNs7OjSdXIxHJtPik/wB5itYtC7N9sRpeSqd2TEIsbMgSksT901py9w729gf6pW+lAMcqqpdy1e7JHo2j9KVOzjrd+bCIi5B2giIgCIiA'+
  'IiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAqj6/j7dk1+SQP2SrcKpWv3v1TP5JA/ZK7ujva/R/Yj2kvY1zX3NXgYUp0oFO'+
  'SAE54JlMJnrCAAqeYTGUwgNw7N4A1OqGPg13nGK0Kq9s3++fUB+LXecYrQqB4/2x8kehaOdiXNhERcU7wVYdpT3xqV8W/wDuOVnlWHaT98al'+
  'fFw845dnAe2R5M4ekXYnzX1NM8Cm7jjhAFKnp52RyKKcZTAQEKDy4LnjgowgNjaEN3tb6ZvfcwY7v+WVbWee6FTJiIz3TYTnDwgFVN0H9++n'+
  'f+BMebVto8Ls0rEg5xvsLc+EYUG0k33OS8q+5P8ARbJWub836FTNO7Cnb6uNzXF8GmwHB83MgcePHcb/AEj+gcepWMr1etnTGxWRYkNktKQG'+
  '9ilZODjfjOxwa0dJPMk98lfvRaVRdPNP+wdlbCk5KE6NMzDxgvdjLnnvnq8AVS9QL3n76u2LVJkvhyrMslJYnhBh/SPMn0BR3RLRiMFnLj/y'+
  'f2RK9N9MJV5fw8Fuiv8A7P8Az4eJwve/q7fVYM5VYxhy8Mn1PJQyexwR3h0u63Hj4BwWLB2VwJJK5ADHBer0qUKUVCCySPGq1adabnUebZPN'+
  'Exk8CiyGIcOXShOBlTjjko1pc4NAJJOABxJKMrxI5jKLYdK0T1Eq0gybZR4UpDiDeaJyO2E8g/0eJHy4X3HZ/wBReiXpflf/APlaMsStYvJ1'+
  'F1N6OGXclmqb6GrcpzW0Bs/6i54y1M8sHoUnQHUbolaZ5YPQqftO1/MXUr+yrz8p9DV27xzlStndoDUfOfUtM8HqwehfbIbO19TEYCcmaTJM'+
  '6XGM6IfE1v8A1VHilot+0RVYTePdsmaiAzzWwNN9LavflUZMRGRJShw3fZ50jHZOtkLrd3+Q/Qtz2rs+WtR47JuvTEWuR24IhRG9jgA/2Acu'+
  '+U47y23AgQZaXZLy0GHBhQxushw2hrWjqAHILjX+kEcnC26/od3D9G5ayndcPD9T8adT5Ok0mXplPl2QJWXhiFChM5NaBgBfUiKJttvNkxSS'+
  'WSCIioVCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCqTr/79U1+SQP1FW2VSdfgO3XMn+qQP1Fd3R3tXo/sR/SX'+
  'si5r7msRyUjmoBypHgU5PPyVHMocpyCAlOajKnvoDcWzfjtn1D4sd51itAqvbOHvnz/xa/zjFaFQPH+2Pkj0PRzsS5sIiLindCrBtJnGpNM+'+
  'LR516s+qwbSXvk034tHnHrs4D2xcmcPSLsT5o00OSkKByUqennZKIiAHPJRxQngoQGytB/fup/5PMfsK3SqPoKca2yI65aOP+BW4UH0i7UuS'+
  '+5P9GeyP+p/RGhto27IkvT5Gz5WJu+qf+1zW6ebGnDGnvFwJ/wBUKujjwwsz1XrL61rBXJlzssgx/UsPvNhjd/WCflWFEcSpPhdsqFtCPe97'+
  '9SJ4vcu4upy7luXJDdzzU4PQuJcVBJK6JzD9RyU4XBp4LkCUAC3js7WdKVGpTt21CXEUSTxAkw8ZaIhGXP8ACAQB1ZK0djvK1Wzu0N0hiYGC'+
  'ahGz4mrjY7VlTtXq9+SO3o/RjVvI6y4Zs2yiIoEeihERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQB'+
  'ERAEREAVStfvfpmQP9EgfqKtqqk6/e/XNY/0OB+oru6O9q9H9iPaTdj9V9zWAx1qcricg8ApzxKnJADkCnNQOK5ckBHJDxUdK5BAbh2bz9s+'+
  'oZ5+trvOMVoVWDZxA7Z1QP4td5xis+oFj3a3yR6Ho52Jc2ERFxjuhVg2kffJpo/Fw849WfVYNpI41KpvX62jzj12cB7WuTOFpF2J80abATio'+
  'yVPLmp6eeAKTlcRzXJAceSgnpC5ErgQSOhAbM0GP276fw/zeY/YVulUTQc/bwp35PMebVuzyUH0i7UuS+5PtGeyP+p/RFCa5EdFuOox3HLnz'+
  'UVxPhe5davvqnGszo/rET9sr4t3rKmtNZRRBKjzkzipbnPBcgO5wVKvLBgDipChEBPHpVq9nf3oH/GEb9TVVTmVarZ396B/xhG/U1cLSHsvq'+
  'jv6N9s9GbZREUGPQQiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAKpOv5A1rmfyOB+oq2y'+
  'qTr/AIOtUzgcRJwP1Fd3R3tXo/sR7SbsfqvuaxQNAToXJTkgAxhQepSoQDkeKlRjvqUBuPZw982o/FrvOsVn1V/Zvz2zaj8Wu86xWgUDx/tj'+
  '5I9D0c7EubCIi4p3Qqv7SXvl034tHnHq0CrBtIj7ZVN+LR5x67OA9rXJnC0i7G+aNMgZ8a5ccKcKMhT088I6eCkKehEBDgmOCZTKA2RoR7+F'+
  'N/8AAmPNlW76FUTQf38Kd+TzHm1bs8lB9Iu1LkvqyfaM9kf9T+iKCVXPr3OH+sRP2yvmzwyvqqZzW5zP+kRP2yvk3uOFNYe6iBz95gHIUqB1'+
  '4XL9avLSEQogJGelWq2d/egf8YRv1NVVQVavZ496B/DH+EI36mrhaQ9l9USDRvtnozbCIigx6AEREAREQBERAEREAREQBERAEREAREQBERAE'+
  'REAREQBERAEREAREQBERAEREAREQBERAEREAREQBVK19A7dUz+SQP1FW1VSNfzjWuZx/okD9RXd0d7U+T+xHtJuxrmvuaz4Z5qQvyBOcrmMq'+
  'ckAOSKPGgygJUJxChAba2fqnTqXqPPxqlPy0nCdT3ND5iK2G0u7Iw4yTz5qyPsutQc7mo/lkP6SorgEcRnwrjutH3DfEuJfYLG7quq55eh3s'+
  'Px2dnRVFQT9S9nsvtP8AnPR/LIf0k9l9p/zno/lkP0qiYY3ezut8S5FrT9w3xLT/AHZh+Y+hvfvVU/LXUvV7LbVxn2TUfyyH6VXHaBqVNquo'+
  'dPjU2flpyG2nhrny8VsRoPZHHBIPNaiLG59w3xIBg8BjwLbscEjaVVVU8/Q0sQx6d5RdFwS9TkVxHFSUC7hwBhMqVxQE4UFSEKA2ToMft4U8'+
  'D/R5j9hW6PJVE0H4a4U7vwJjzat2eSg+kXalyX3J9oz2R/1P6IoHUnE1mbOOceIf+Mr5gRhfTUxu1ec/8eIP+Mr5N0qbQ91EDn7zOakKAFIH'+
  'BXFo5omMFOfJARjjzVm9BK/Q6dpQ6WqFZp8pGE9GcYceYZDdg7uDgnkqyHwqDgni0HvkLSv7JXlLZN5b8zew6+dlV2qWe7IvaLttV2cXLSDj'+
  '+uQ/Sp9ldr/zkpHlkP0qiO6371viTcZ963xLi/uzD8x9DvfvVU/LXUvd7KrY/nHSfLIfpT2VWv8AzkpPlkP0qiJY3HBjfEuO6OljfEqfuzD8'+
  'x9B+9U/y11L4eyu1/wCclI8sh+lfpAuO35mKIctXabGeeAbDmmOJ+QFUMDQB7lviUgM3uDQCO8j0Zh+Y+hVaVTz3011/segvPkip9YOr1w2X'+
  'PQpeamI9To3uYknFfvOhjrhuPIjq5Hvc1bOj1eQr1ClaxS47Y8pMwxEhvHSD0HqI5EdBC4N/htWzktfenwZIcOxSlfRepua4o+5ERc86QREQ'+
  'BERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBVH1+b9u2bOf80gfslW4VSNfzjWua4f5pA/ZK7ujvanyf2I9pN2Nc'+
  '19zWQAyuS4h2QuQ4hTkgBB5KRyUDkgQEqOHLCFOlAFCnCY4oCORXLoXHkCUzgICc9ClcelTlASo5KRxU4CAhRhOlSgHeQjCnKg46UBsjQc/b'+
  'vp3fgTHm1bo8lUXQf38Kdw/zeY82rdHkoPpF2pcl9yfaNdkf9T+iKC1EYq83nj9nicf9Yr5Ac8l9VTH+GpxvVMRP2yvlxgKaw91EDn7zOQTO'+
  'OCgHgpxkK8tGUzhRyKIAh5KDyUb2ehASDxwVKY4ogAOVBODxQg4yFGCgOWeGU4c1xORwQZ5oAG8VZHZtrsSNRavbkWIXNlYjZmCD0NfkOHgy'+
  '0H5Sq4hbr2aSTfFbHVIM84uTjcFKznn3ZfU7GAzcL2GXfmvkWYREXn56QEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQ'+
  'BERAEREAVStfm51qms/6JA/UVbVVK1+JGtU1w/zOBjxFd3R3tXo/sR/SXsfqvuawwBwCkLgHceK5BTk8/JJChCEQBEwiA5YROaYOEBBCg5XP'+
  'Cjd76A4DHIKVO6M8woxhAcs8FAKBThAE6UUICVDuSlQUBsnQc/bvp/5PMfsK3R5KouguO3fT8nj6nmMf3Fbo8lB9Iu1LkvuT7Rnsj/qf0RQW'+
  'pj/Dk7+URP2yvjLivsqX79zv5RE/bK+TdGVNoe6iBz95kDLua5/KoHBMK4tJKj5UXHHdICcAnkpTiFJBygCg8FJBxzwowevKpmAEU4XHBByV'+
  'UA43gpAH6VHTlTkDmQEAPAqxWzXQYkGm1m5IrCGzD2SkE/fBmXOPjcB8hWsLE0suS96hBiNlYsjSN77LUIzd0bvSIYPu3eDgOkq3NEotOt6g'+
  'S1GpUuIEpLMDGMH6ST0knJJ6yozj2IQVP2eDzb4/AlWjuG1HVVzUWUVw+J2CIih5NgiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIi'+
  'IAiIgCIiAIiIAiIgCqTr+QNaZn8kgfqKtsqk6/jOtUzx/wA0gfsld3R3tT5P7Ee0m7H6r7mrhjeXIHPJcd09S5DlxU5IASoOc56FKgjggG9w'+
  '4JvcM9C4LngBAbV0FotIr+oM9KVqmy0/AbT3RGw5hge0O7IwZAPTglWI7W9hfzQo/kzfQtDbN2O2bUPi13nGK0Kg+O1qkLtqMmty7yfaP0KU'+
  '7NOUU3m+4xftcWF/NCj+St9CdriwsY9iFH8lb6FlCLj+0VfO+rO37LR8i6IxftcWH/NCj+St9Cr1r1Q6PQb/AJCVo1MlpCC+QER0OXhhjS7s'+
  'jhnA6cAK1qrDtIcdSqb8XDzj12MDrVJXaUpNrJ95xNIKFONm3GKTzXcaa6U6U6VKnBASMFSgCIAo5onIIDZGg/v4U78nmPNq3Z5Komg/HXCn'+
  'fk8x5tW7PJQfSLtS5L7k+0Z7I/6n9EUFqnGuzpHD/tET9sr5Md8r7Kpg1ud/KIn7ZXyKbQ91EDn7zCnmE4Iri0g8EHFMIBhAOR4KyOh1nWtX'+
  'NL3T9YoMhPTJnYrOyzEEPcGjdwMnoVb8cVavZ49593xhG/8ASuJj85Qts4vLejvaOwjO7yks1kzL+1rYP80KR5M1O1tYP80KP5M1ZSihXtNX'+
  'zvqyd+y0fIuiMW7W1g/zQo/kzUOmtgk5NoUfyZqylE9oq+d9WPZaPkXRGLdrawf5oUfyZq+iUsSy5CYEeUtakQoo5PbKsyPBwWQojuKr4yfV'+
  'lVbUlvUF0RAaGtDWgADgAOhSiLCZgiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAKpWvnv1TX5JA/ZKtq'+
  'qk6+e/XNfkkD9kru6O9qfJ/Yj2k3ZF/Uvuay7ynCjkpypyQAg8lC5KOOUBw3e+uSk80ygNxbN/vm1D4td5xitCqv7N/vm1Efi13nWK0CgeP9'+
  'sfJHoejnYlzYREXFO6FWHaR98mm/Fo849WeVYNpI41KpvxaPOPXZwHta5M4WkXYnzRpoE9K5A5XEcVyU9PPAijKcUA6VC5YUY6UBsnQbHbvp'+
  '/wCTzH7Ct0eSqNoN791P/J5j9hW5PJQfSLtS5L7k/wBGeyP+p/RFBan+/U5+URP2yvkJxhfZUz/hqdH9YiftlfERkqbQ91ECn7zOQOQiAIcK'+
  '4tHSnSpCceaAnPFWp2d89qGJn4Qjfqaqq9OVarZ396B/xhG/U1cLSHsvqiQaNds9H9jbKIigx6AEREAREQBERAEREAREQBERAEREAREQBERA'+
  'EREAREQBERAEREAREQBERAEREAREQBERAEREAREQBVL19H26po/1SB+yVbRVK19P26poH/RIH7JXd0d7V6P7Ee0m7Iv6l9zWSj5FBJA4c1IU'+
  '5IABzUpz5J4UBBUKScoEBuPZu982o/FrvOsVoFV/Zw986ofFrvOMVoFA8f7Y+SPQ9HexLmwiIuKd0Kr+0kPtlU0/i0ecerQKr+0mftlU34tH'+
  'nHrs4D2tcmcLSLsT5o02OCnIUBThT088CnKLigJynMJhQeXFAbK0G9/Cn/k8x+wrdHkqi6De/fT/AMnmP2Fbo8lB9Iu1LkvuT7Rnsj/qf0RQ'+
  'Wqfv3Oj+sRP2yvlX11P9+538oiftlfIptD3UQOfvMIiZVxaSE5qFIQE4VqtnjHahiY+EI36mqquVanZ4H2ooh/GEb9TVwtIeyeqO/o32z0Zt'+
  'lERQY9BCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAqk6/H7dcyP6pA/ZKtsqka/cNbJo'+
  '/wBUgfsld7R3tT5P7Ee0m7Iv6l9zWSckByFIwpwQAdGVC5KHICERThAbi2b/AHz6h8Wu84xWhVX9m/hqdUR+LXecYrQKB4/2x8keh6OdiXNh'+
  'ERcU7oVX9pP3yab8Wjzj1aBVg2kffLpvxaPOPXZwHta5M4WkXY3zRphpwFyyVAABUqennhOeKYChM8UA6EzwTp4o73PBAbK0G9/CQ/J5j9hW'+
  '6PJU60VqclStZqXMVCYZAhRGxYAiPOGhz2YaCejJ4fKrd1CoSdLpUxUZ+OyBKy8MxIkR5wGtAUI0hjL2pbuKX1ZPNGpxVpLfwb+iKH1LjWZw'+
  'j/SIn7ZXyr9pqK2PPR47AQ2JEc8A88FxP/VfkVNYLKKILN5yZwIKNXJMd9XFoU5UHwplATkK1ezx70D/AIwjfqaqp9KtXs757UDwfhCN+pq4'+
  'WkPZfVHf0a7Z6P7G2URFBj0EIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCqPr4d7W2cH'+
  '3srAH/CVbhVJ17hubrZOOcMB8rAcPBu4/WCu9o72p8n9iPaTdjXNfc1gOC5J0lQT1qcEAJ6MqOOVxBJ4KSOHBAcinFQM9KccIDcmzfntnVH4'+
  'td5xitAqy7Nks99/VabAPY4UgGE990QED/hKs0oFjzzvJcl9D0PR1ZWS5sIiLjHdCq/tJe+ZTfi0ecerQKs+0pKxGX1R5wtPYokiYYd0ZbEJ'+
  'I8TguzgLyvI8mcPSFZ2Uua+ppEkh3FTvDKhwO9yUcip6ednLPBMccqG8T3lzA4ICEGccVPTxT9SA4kce8vvma1WZ2QZIzdXn5iWZjdgRZh72'+
  'DHLuScL4lA5q1xT4ouU5JZJhM5Q+HCgDByri0npUk5XEnCZHWgJUAYKZye8pQE9KtXs8EHR93eqEb/0qqgCtjs/Sz5fRmA97S3s83HijPSN7'+
  'dz/wrg6RP+Vy+K+5IdGl/Oej+xtJERQcn4REQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAF'+
  'XjaRtmK2cpl2y8JzoRZ6imS0cGkEuhk+HLh4lYddfW6NT7ht+botUgCNKTUMw4jenvEHoIOCD1hblhdO1rxq93fyNLEbRXdCVLvfDmUM5LiQ'+
  'DzWd37pdcNjVKK+JAiTtJLvsNQhMy3HQIgHuHeHgegrBsdI5L0SjXhWgp03mmeZV7epQm4VFk0QMY4ICmDnkpx31mMJC5DA5qN0uIa0EknAA'+
  '5krc2luilRrM/Arl3Sb5OlQyIkOTjDESaPMbzebWdeeJ8HFat3d07aDnUf8Ac2rSzq3U1TpL+xsbQS1Y1B08fVpyEWTNWeI4aRxEIDDM+HJd'+
  '8oW11DGMhw2sY0Na0YDWjAA6lK86ua8rirKrLiz061t421KNKPBBERYDYC1brvaUa49OPXCShmJN0p5mQxoyXwyMRAPkw7/VW0lBAc0ggEHg'+
  'QVmt68qFSNWPFGC5t43FKVKXBnn5z5cVBacreuqWh87Kz0av2TJmYlHkvj06F7uEekwx903+jzHRkctHxYMSFFfBjQ3w4jDhzHgtc09RB4he'+
  'i2d5SuoKdN/qjzO9satpNwqL17mflwBypzkKSOKgArbNIkqDywh4LiASclASQc81KgHhyUnPUgOJ4g+FSOpO8gaTxKAgjJHHioAzxXLPQpDc'+
  'lAEUlq+qmUqp1qpsp1IkY87NPOGwYDC4+E9Q754KkpKKzb3FYxcnlFZsU2Qm6tV5WmSEIxZqZitgwmAc3E4CvHbFDgW1Z9OoUscw5SA2Fvff'+
  'H7p3ykk/Kte6SaRMsyH6+V4Qo9ciNwxrTvNlGnmGnpcel3yDpJ2woPjeIxupqnT92PzZPsBwyVpB1aq/il8kERFwiQhERAEREAREQBERAERE'+
  'AREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQEPYyIwse0Oa4YLSMghYXVNJNPKtHfHmbZlYcV5y58sXQcnwMI'+
  'CzVFkp1qlJ5wk1yMVWhTqrKpFPmjWnaG02+CZryyL6UGg2m2QfWmaOOj1ZF4/pWy0Wx+0Ln8x9Wa/wCzbX8uPRGM0HT2y7ajiYo1vScCOBgR'+
  '3NMSIPA52SPkWTIi1p1J1HrTeb+JtU6UKa1YJJfAIiKwvCIiAIiIAuirll2pcpDq5QZGceP8q+GA/wDvDB/Su9RXQnKDzi8mWTpxmtWazRri'+
  'JoVprEeXCixoeehk3FA/aXDtD6bfBEz5ZF9K2Ui2fb7n8x9Warw21f8A8UeiNa9obTXP70TPlkX6SjtDabfBMz5ZF9K2Wir+0Ln8x9WP2ba/'+
  'lR6I1odBdNSP3pmh4JyL6VPaG026aRMn88i+lbKRU/aFz+Y+rH7Ntfy49EayOgemxORS5seCcielchoLpsP4qmvLInpWy0Vf2hc/mPqU/Ztp'+
  '+VHojWnaG01zn1omfLIvpQ6DabZyKVNDvCcielbLRU/aFz+Y+rK/s21/Kj0RrqX0N01l4geaHEjd6NNRHDxbyzOj2/RLfkvUlEpUrIQelsCG'+
  'G73hPM/KuyRY6lzWqrKpNvmzLStKNF504JckERFgNgIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAi+GYrVIlJgwJuqyUCK'+
  '3nDix2NcPkJX5C4rfPKuU0+Cah+lXar8Cmsjs0XWeyO38n/DlN4c/wDtUP0r7ZablZ2B2eTmYMxCzjfhPD258IVHFrigmmfsiIqFQi4Ro0KX'+
  'gOjR4rIUNgy573BoaOsk8l14uO3zyrlNPgmofpVVFvgijaR2aLrDcdvg8a5TeH9ah+lQLkt5xw2vUwnqE1D9KrqS8BrLxO0ROYyF805UJCns'+
  'a+fnZeVa44a6PEawHwZKtSzKn0ousFx2+eVcpp/OofpUG5LeHOu0zyqH6VdqS8CmsvE7RF1YuW3Tyr1MPgmofpT2S278PUzyqH6U1JeA1l4n'+
  'aIus9klvfDtN8qh+lPZHb55V2m+VQ/SmpLwGsvE7NF1puKgDnW6d5Sz0qPZHb/w5TfKofpTUl4DWXidmi/ODHgzMuyPLxWRYTxlr4bg5rh3i'+
  'Oa/RWlQiIgCKHOaxhe9wa0DJJOAAut9kVA+HKb5Uz0qqTfAo2kdmi6w3Hb7Rl1cpoHfmofpUC5bdPKvUw/nUP0qupLwGsvE7RF+cCYgTUu2P'+
  'LRocaE/i18Nwc0+AhforSoRF8c1V6VIxxBnalJy8QjIZGjNYcdeCVVJvgM8j7EXW+yKgfDdO8pZ6VHsioHw5TfKmelV1JeBTWXidmi6z2R2/'+
  '8OU3yqH6U9kdv5x6+03P5VD9KakvAay8Ts0XV+yS3s49faZnq9VQ/SguW3ScCvUzPV6qh+lNSXgNZeJ2iLq/ZLbvw9TPKofpU+yO3849fabn'+
  '8qh+lNSXgNZeJ2aL45WrUuejGFJVKUmHgZLYMZryB4AV9io01xKp5hERUARflMTMvKQDHmo8KBCHN8V4a0fKV8Hslt34epnlUP0qqi3wRRtI'+
  '7RF1fslt34epnlUP0oblt0c69TB+dQ/Sq6kvAay8TtEXV+yS3vh6meVQ/Snskt74dpnlUP0pqS8BrLxO0RdYbjt8c65TfKofpUeyS3vh2meV'+
  'Q/SmpLwGsvE7RF1nsjt/4cpvlUP0rsIUWFHgNjQIjIkN4y17CHBw6wRzVHFriE0zmi+SbqlNkIjYc9UJWWe4ZDY0ZrCR18SvnNx2+Bk1ymj8'+
  '6h+lVUW+4Zo7NF1nsjt74dpvlUP0r6JOqUyoPc2QqErNOaMuECM15HhwUcWu4ayPrRfjNTkpIwOzTkzBl4ecb8Z4YM9WSvi9kdv/AA5TfKof'+
  'pVFFvghmkdmi6xtyW849zXaYfBNQ/SpNw0EDJrdOA78yz0qupLwGsvE7JFwhRoUxAbGgRWRIbxlr2ODg4dYI5rmrSoREQBF8U1WKTJTHYJyp'+
  'ycvFxnscWO1jseAlfl7IaCBxrVO8pZ6Vdqy8CmsjskXWeyKgfDlN8qZ6U9kVA+G6b5Uz0pqS8BrLxOzRfhKzkpPQTGkpqDMQwd3fgvDxnqyE'+
  'VvAqeS+tj3P2jr6dFcXu9e5oZccnAiEAeJYD3OeQ8SzzWzhtHX1x4evk15wrAcFeoW2WxhyX0IZV998z9Bu9AHiV69gWK91iXnBL3djZUoBa'+
  'zPAEwTkgdGcDxKibRnir17AgxY96n8Yy/mSuZjy/k5c19TcwvtC9S4KIigRJyve2hEiM2Vp5rIjmh9Rk2uDSRvDsnI9Y5cF5sHcB5DxL0j21'+
  'P4K838ZyfnCvNoDPWpvo72V839iOYt+MuQ7knkPEpIaGnuRy6lxGepcnfuZ8C7zOXmevGkL4kXQGyokWI+I91Dky5zySSewt5kqnW3rGiO1d'+
  'taWc9xhMo73iGTwBMdwJx1ndHiVxNH8e1+snHL1ik/MtVN9vTHbntkdPrIf/ADD1B8J/3DqSS+f8p0KoANzndHiUHdwRuDxKRzXHPFTjJEbO'+
  'QDce5HiTDB9yPEuQC4hr8nuVXJAHGMBowoyOW43xLnuEDGCuBYQeRVMkCQR96PEuWG4HcjxKGtIHJSAeoqu4oeluxs5x2TaOC4kCcnAATyHZ'+
  '3cB3lv1aB2Nf4J9JH9dnPPuW/l5riPaqnNkwtPwYckERfLU6jJUijTdVqUwyXk5SC+YjxnnhDY0FznHwAFaaWe5GxwKw7a2qZtrTmV08pUyW'+
  'VGv5iTZY7Docmw8Rw5b7wG+Br159uLeW6PEs21Z1DntUNW6xeM5vNhzUXclILj+4y7OEJn93ie+4rBySeK9Fwyz9loRg+L3vmRK8r7eq5d3c'+
  'SN0ni0eJct1v3rfEuAU5K6ORqlvth/U+JTLvn9L6nMn1HUmunaa17uEOYYPsjG55b7BvY62HrV714z29XqnbF1U64qPHMCoU+YZNS8Tqe05G'+
  'e8eR7xK9c9PrzpuoOmdGvGlOHqeoyzYpYDkwn8nwz32uDm/IoXpDZ7Oqq8Vulx5/3JDhVxrwdN8V9DJTyXl9tYOc/a4uvshL90yzRvHOB6nh'+
  '8B3l6gnkvLvatJO1xdxwRh8uP/68NW6N9ply+6K4v+CuZpg7ufcj5AmGjoCkcRyKEcFNskRwghvUPEuPAHg0J9zxUJkVJ7kn3LfEpDWjjuDx'+
  'LjgrkM8sJkN4IZj3LfEg3BxwPEp3SSeCjcOUBvDZHc5m11bIhuLQ5k0126cZHqd/A+IL086F5hbJHDa6tfP3k1/5d69PRyUJ0j7SuX3ZI8I/'+
  'BfMIiKPnUKqbeESI3RW3WNe4MdWhvNBOHYgRMZHSvP0hgONxviV/dvMuGj1s49z69cf9xEVAncyp5gK/k482RnFO0P0Hc891viU9webW+JRg'+
  'FMHPAFdrI5xO608d0eJBu5xujxKQ0g8im6QT3J8SpuKIh27jGB4lAA6APEm64cwUAPSCmSK9w3Rn3I8K9L9jaLEibJ9HbEiOcGTk4xocc7oE'+
  'Z2AOoLzTAOOS9KtjP+CjS/y6c88VwNIkvZlzX0Z1MIb2z5FUdslznbWdXa9xcGyMmGgnIaOxZwOriSflWgOHUPEt97ZDiNrat/kcn5kLQWV0'+
  '8NS9lp8kal3+PPmcuB6B4lYDYyivh7V9Mhw3uY2JITjXtacBwEPIB6+IB+RV9OVv7Y1OdrSj5/0Kc80VTEl/K1OTFn+PDmXi150kltYtI5m3'+
  'RGEvU5d/qumzDyQxkdoIAeBza4EtPVnPQvK+r0ao0CvTlErMjEkqhJRnS8xLRW4dDe04IPp6Rgr2fVT9r/QV110R+p1pSJiVunwsVKWhNy6c'+
  'l2jhEAHOJDHylvD7kKL4HiKoz2FT3Xw+D/udnErTaR2kOKKBYaOTR4lIxjkE4Y6D4FxPDkpruI78C1GyHruLMudunF1TpbQKrHHqCYiu7mSm'+
  'XcN0k8ocQ4HUHYP3RXoMvFRvEL0Y2Tdd+2JZ3sKuWb3rno8EbsWI7up+WHARO+9vBruvg7pOInj2G5fzNNc/1/U7mF3mf+jP0/QsmtY646yU'+
  'bRvTmJWJsMmqtNb0GmU/ewY8XHundUNuQXHwDmQsvvS8aDYNjVC7LknBLU+Rh9ke4cXPPJrGDpc44AHWV5WataoV3VrUmbuqtOMOGfsUlJB2'+
  'WSkAHLYbes9Lj0kk9S5uE4a7uprT9xcfj8Dbv7xW8cl7zMXr9dqtz3JO1+vTsSeqM7FdHjzEU5LnE/oHQAOAAAXWDdPMBCSVAHHCn0YqKyXA'+
  'jLbe9nMBuDgDxLv7Ls2vX/e8hadsyPqqozr91gxhkNo4uiPP3LGjiT/1IXTyEjOVKpy9Np0rFmpuZiNgwYEFu8+I9xw1rR0klem+zloNJaO2'+
  'T6rqbIMxdlShtNQmW90ILeYl4Z+9aeZ+6dx5AY5uJ4jCzp5r3nwRt2Vq7ifwXEzHSHS2iaRaYylqUdxjRAezzs44YdNR3AB0QjoHAADoAA76'+
  'LPEXn9ScqknOTzbJTGKilGPA8jtbR/3jb6+PJrzhWBjjwWd61knaNvo9Hr5NecKwPOCvTLb8KHJfQh1X35czmFevYF/xGvT4yl/MlUSHPirU'+
  '7JetmnmlFr3NJXrVpiSjT05BjS7YUpEjbzWwy0nLAccetaGM0p1LWUYLN7vqbOHTjTrpyeSPQRFob24ug3D/APU87x/Fkx9FPbi6Dfznnfmy'+
  'Y+ioX+z7n8t9GSL2uj511Pg21f4K818Zyf7ZXm0Sc8ldHaZ2iNLtSdCY1r2jWJqbqL56XjBkSSiwm7jHEuO84AfIqXqX4FSnStnGpHJ5vj6H'+
  'AxSpGdVOLzWRA4Fcne4PgXE4Uk9wfAV2jmnrvo8MbPtkD8RSfmWqm23mft120Oj1j/8AuIiuTpA3d2frJaeihyfmWqmu3n79ttcP4j/+4iKD'+
  '4T/uH/7Elv8AsnQqieJUccqTzyg58VOURzuLF7Hth2hqBqzXKZeVAlKxKS9I9UQoMyCWsidmY3eGCOOCQrm+1q0K/BnRP7j/AKSpnseX1aNh'+
  'auVyo3hXpOjSkzSDAhR5txa10TszHbucc8An5FdJ20Xoe3nqdb3yTGf+ihuMu6V09lrZZLhnkSDD1R2K18s/jkfj7WrQofyZ0T+4/wCkntat'+
  'CvwZ0T+4/wCkv1G0XoeeWp1veUf/AIUe2N0O/Cdb/wDvz6Fys73/AN/mb2Vv/wCvyPzOzVoUf5M6J8jHj/1KPa06Ej+TOif3X/SX7DaM0PPL'+
  'U63vlmP/AMLMLSvi0b7pcao2fcNPrMrBi9hixJOKHhj8A7p6jggq2dS7gs5OSXqVjChLckvkfXbltUC0Lbl6BbNJlaXTZfPYpWWZusbkkk+E'+
  'kkkldqiLTbbebM6SW5BVT22dUjb+nsrpxSpndqFdHZZ3cPdQ5Np5f7R4x4Gu61aCrVSRodBnazVJhktJScB8xHjP5MYxpc4+IFeSeqt/z2p2'+
  'rdYvKd32NnIu7LQHHPYJdvcw2fI3ie+Su3gVlt6+0kv4Y/XuOdidxs6WquLMMPE8VHLoUHmpb3XNTojRAHSh4Hmtgu0iutuz23V90Fgohn/U'+
  'Qh4PZNz3PZ+rsfZO48PHktf448RwVlOpGpnqvPJ5F0oSj7y4jju5VythnU4StTqelVTjgQ5reqVM3j/lAB2aGPC0B4HeeqaE911rurUuOoWh'+
  'e9JumkuLZ2mTUOahYON4tOS095wy094la1/aq6oSpPj3czLa1nRqKZ7JrWt4aA6R35dMa47ps6XnqpHa1kWZEeLDLw0brchjgCQABnHQFl1n'+
  'XTS72sOk3ZRYm/I1KWZMwuPFuRxae+05ae+Cu8XnUZ1KMnqtp9CWuMai3rNGlRsm6BD/AOQ4Z8M9MfWIdk3QLdx7AoXlsx9Yt1IeSy+3XH5j'+
  '6sx+zUvKuh45XzSpOianXHRqewslJKqTMtAaSTusZFc1oyeeAAsfweYWVak8dZ7v79bnfPvWKk9AXpFFtwi34ERn7zyOY5YVx9k3RDTHUnR2'+
  'pV29LZZU5+FV4ksyK6Yiw92GIUNwbhjgObnce+qbNPjXoVsJn/u/1kfj6L5mCuXjlSdO1coPJ5rgbuGwjKtlJZmc+1O0Czn2BQvLZj6xPana'+
  'BZz7AYXlsx9Yt0ooZ7dc/mPqyQ+zUvIuhrSztANJLCuyFc1q2hAkapBY6HCmDHixTDDhh26HuIBIyM4zglbLRFgqVZ1HrTbb+JlhCMFlFZBE'+
  'RYy4qdt6H7T9s/HJ4f7CIqCY4q/e3n7z9sHqrR8xEVBM99T3AOxx5v6kYxT8d+hHIrOtG6HSrm1+tCgVyTbOU2eqcOBMy73ECIw5y0kEHo6C'+
  'sFccrYGh9RkKRtGWVU6pOwJKSl6tCiRpiYeGQ4TePdOceAHHmV0rptUp6vHJ/Q06OW0jn4nogzZf0FDRjTem/LGjH/1qfav6Cn+Tam/72N9N'+
  'ZQNXdKw0fbItT51gfSXLtt6WAZ7ZFp/O0D6S892t55pdWSvUoeC+RintXdAyc9ranf76P9NR7V3QPOe1tTv99H+mssGrmlhGRqRamPjWB9JT'+
  '22tLQM9se1PnaB9JNteeaXVlNWh4L5GJ+1e0Dz721N/30b6a2NbFrW9ZlsS9vWvSZel0yX3uxS0uMNaXEuJ48SSSSSeK/SiXHb9yyL523a5T'+
  'qtLMf2N0aRmWR2NdjO6S0kA8RwXZrBVrVp/w1JN82zLCnBb4pHmbtkfwta3j/QpPzIWguK37tjcNreu8ecpJ+YC0HzPBeh4d2Wn/AEoit3+P'+
  'PmBxW/tjYY2taP8AkU55orQQwt+7G38LWj/kU55oqmJP+VqcmUtPx4cz0wUEBzSCMgqUXm5Lzzg2rdB+1nensutqVItasRiexsHcyEycuMLv'+
  'Mdxczq4t6BmuB4Feyt12tRb1s2oWvcMm2aps/BMGNDPPB5OaehwOCD0EAryl1c0xrWk2ps7adXDosNv2aSnMYbNS7idx47/DDh0OB7ym2CYl'+
  't4bGo/4l80RzEbPZS2kFufyMEBPgXd2pdVasu8qfdNuzjpWp0+KI0GIORPS1w6WuGWkdIJXSYU8ua70oqScXwZzE8nmuJuPXXaAr+tVRkIUa'+
  'WNJokjDa6HTYcUvD45b3cV5+6Ochv3re+StOkriTkKeBKx0aEKEFTprJIrVqSqy1pvNnHPSuYOT31GM8lb/ZG2dxXZuV1VvWSzTID+yUeRjN'+
  '4TMRp4TDwebGn3I+6IzyAzjvLuFrTdSf/ZloUJV5qETYeyds6izaZA1JvWSxcU3DzT5OKONPguHunDoiuB/1WnHMlWrRF53dXM7mo6lTiyV0'+
  'aMaMFCIREWuZTyM1qyNou+cn+PJvzhWCALPdahnaMvo/jyb84VgfAHgvT7b8KHJfQhlV/wAciOR4rkDlQeJ4JlreZA8JWfMxnPKZOVxJYOO+'+
  '3xhN5n37fGqZlMgXZCg8CCpBYTgOBPhTwhARjPJSR9jdnqKDgTlHEbjvAUfAHrxpCd7QCyT+IpPzDVTPbzcO3dbg3uVDHDq/7REVy9H/AOD9'+
  'ZHxFJ+ZaqZ7eUMN1vt2JxJdQgMeCYielQjCP9wfqSS+7IvQqlxz3lIb1oeQUjPWpwRwbxHLguW8esriS0DLiB4eCjfZyD2/3gmeRTJnLfJ6T'+
  '403sHpXHeh592z+8FBfD3vds/vBUzGWZ+gcTyJV69gb/ABFvP4xgcf8AYlURDmffs/vBXu2BRmwbyeOLTUoAyOWRB6/lXGx5r2OXNfU6OF9o'+
  'XqW/RF8NZq9PoFvT1bq0yyWkZKA+YmIzzgMYwFzj4goIk28kSdvIq1tuaoii2LJ6Z0uZAnaziYnww8WSrHcGn+28eJjutUHc7Ky3U6/KhqVq'+
  'rWbyqG8x09HJgwSc9ggt7mHDHgaB8uT0rDxkr0XDLT2Wgod/F8yJXlfb1XLuJ6OCyfT2yqpqHqVR7NpDD6pqEcQ3RMcIMMcYkQ95rQ4/IFjQ'+
  '49CvPsQ6by1Ktuoan1jsLJypZkqa17m5ZLtd9kiAdG+9uPAzvq7EbtWtCVRce7mUtKG2qqPcWYmdO7YmNHH6aeoWsoLqd62iCBxbD3d0O/tA'+
  '4dnr4ryevW06nYuoFXtCsN/7ZTJl0u92MCIBxa8d5zS1w8K9hvVkp/pUH++FSzbl0+lojqRqhSRBc7hTKmIbhk8zBiEdP3TCe+1RjAbyVOu6'+
  'U+Evr/c7GKUFOkpx4x+hS3m7lxXJcSDvZzhSDw4lTZEdZdjYZ1N3oVV0rqk1xbmpUoPd9yeEaE3wHDwO+9XTXjlZV3VOxdQaRd1Hficpsy2Y'+
  'Y3PCIBwcw95zS5p8K9drWuOm3dZdLuejxeySNSlmTUF3TuuGcHvjke+CoPj9nsa22jwl9SSYXca9PZvivoduh5Ih5LgHUPHnUf34bt+Op3z7'+
  '1i45LKNReGr92cc/4anfPvWMjGOK9So+5HkiFT958xjvL0K2Ex/3fax8fRfMwV57Ak+BehWwn/B9rHx9G8zBXI0g7I+aN/C/x1yLQoiKCEmC'+
  'IiAIiICpu3oftRWu3rrJP/IeqBlX729BnSW1j1Vh3mHqgxaFPcA7HHm/qRjE3/MP0OOOGVIPDGMpgpjqC7Jzxhv3o8SdwPuB4lIacqSHHoCo'+
  'CN1v3jfEoIbj3LfEp3XIRwwUZQvRsBf4mXsABj1fLcv/AAnK4ip3sB8LOvYf1+W805XEXnuMdsqen0RLbDs8TzM2xv4XFc/I5PzIWhTw5LfW'+
  '2Nw2t66f6pJeYC0IDxU2w3stPkvoRu7X+vPmQT41v/Y2/haUb8hnPNFaBxkrf2xsP+9nRvyKc80VTEuy1OTK2n48OZ6YIiLzclwWptoDRmQ1'+
  'j0xi0+G2FBr8iHR6VOP4bkTHGG4/ePAweo4PQtsrVevWstM0b00i1R3YpiuTgdBpUi4/usXHF7h/+2zILuvgOZWxabXbR2PvZ7jFX1Nm9pwP'+
  'LOq0yo0WtTdHq8nGk5+TiugTEvGbuvhPacFpHhXxEhdhW61VLiuGdrtanYs7UZ2M6PMTEU91Ee45J73eHIDAXXdK9LhnktbiQ15ZvLgQeI5L'+
  'k0cOaAKQryjN+7M2gMxq1d/r3X5aLDs+mxR6peQW+roowfU7D1ci8jkMDmeHpVKystJSMGTk4EOBLwWNhQoUJoa1jWjAaAOAAAAAXnBsta9P'+
  '0uvL2M3JOOFo1WKOyOfxEhHOAIw6mHgH97Dug59IocRkWE2LDe17HAOa5pyCDyIKg2P7f2jKp7vd/niSXC9nsv4OPeckRFwjphERAeR2teRt'+
  'GX18eTfnCsCHNZ9rb/COvr48mvOFYH0ZXqFv+FDkvoQyr775g4V4NhGk0qpWLeLqhTZSbcyowA0zEFsQtHYejIKo7nCvfsC/4gXmfxlA8yub'+
  'jras5NfD6m5hi/11n8S1XsYtzGPWCl4/JIfoT2MW38AUvySH6F2qKCbSXiSXVXgVl2z6NR5DZjiR5GlSMtF9dZRu/Bl2Mdgl2RkDK87HFekG'+
  '21/Bcf8AG8p+ty838d9TbR5t22/xZHMVS23oR8qk+4PgKD3KEfYzjqXcZzWevOkIxoBZI/Ecn5lqppt5j7dtt8f4j5fnERXK0fz7X6ycnJ9Y'+
  '5PzLVTTbyAGuFuEDiaEOP5xEUIwj/cOpI7/snQqkRxwpAwmeOAozg9anBHCzuxFRaRWtbq9BrFLkqhChURz2Q5uA2M1ruzwxvAOBwcZGe+r4'+
  'ewWyf5n0D5ug/RXnzsg37Z+n2r1aqt512Wo8nMUgy8KNMb266J2aG7d7kHjgE/Irn+2X0J/CXRfG/wCioVjdKtK6bhFtZLhmSLDp01RSk1mZ'+
  't7ArGzn2G2/83QfooLDsccrOt8f/AE6D9FYSdpjQkc9S6N8hiH/0odpjQkfyl0bxxPorkbC58sujN7aUfFfIzb2BWODws23/AJug/RXbU6lU'+
  'ykShlaTTpSRgFxd2KVgthNyenDQBlay9sxoR+Eujf8z6K+yk7Qui9crkpR6XqJR487NxWwYEHecwxHuOA0FzQMk8BxVJW9xlvjLoyqq0s9zX'+
  'yNmKom2/qn61WnJaW0qYxNVUCbqRY7iyWa7uIZ/tvGfAzvq1Fw16mWxalRuKszLZeQp8u+ZjxXH3LGjJ+XoA615H6jXtUtRNTqxedUBbGqMw'+
  'YjYRORBhjhDhjvNaAPGupgNlt621lwj9e40sTuNnT1Fxf0MXPWVxaMqFyA5qdEbOQ4Lk2I9gw2I9o7ziFwO6ObgPCcJln37f7wVHkyhz7PGz'+
  'nssX++fSpdEe8d097v7TiV+YLPv2eMISzH7o3xhUyRV5kO5KD7kKMA8nA+A5UtBVQBwIV4thzVMzFOqGlFWmCYksHVClF55wyfssIeBxDwOp'+
  'zupUcPNZLYd4VSwdRKReFHeWzdNmGxg0corOT4Z7zmlzflWliNorqhKn393M2bWu6FRT7u89iUPJdTbNxUu7bOptzUWOI9PqMuyZgP62uGcH'+
  'qI5EdBBXbHkvN2nF5MlqaazR476iAjV67AcfvzOefesaB4YKyfUQg6wXaef+Gp3z71jIPHkvUaPuR5IhdT3mSvQnYT/g/Vj4+i+Zgrz047/B'+
  'ehWwkc6AVr4+i+YgrkaQdkfNG9hf469S0aIighJwiIgCIiAqbt6e9Ha/xyfMPVBSeOAr9beh+1Fa4x/HJ8w9UDKnuA9jjzf1IxifaH6EjiTx'+
  'Wb6Q27S7r11tO2q3LumKdUKjDl5mE15YXsOcjeHEcuYWEDhxWy9n442orDPXWIX6iulctqjNrjkzTorOpFPxL2jZA0FIz7EZj5ymPprkNkLQ'+
  'UD/E+OfDUpn6a3kPchSvO/b7n8x9WSz2Wj5F0NG+1C0F/mdGP/1KZ+mh2Q9BCP8AE2L85TP01vJE9vufzH1Y9lo+RdDEdP8ATGydL6LM0uya'+
  'Kymy8zF7PH+yviuiPAwCXPJPAcAOSy5EWtOcpvWk82ZoxUVkluPMzbHGdraucf8ANJPzIWhA095b92xgPba1v8jk/MhaEJzwC9Hw3stP+lfQ'+
  'iN3+PPmQB3S35sccNraij+pTnmStB57rqW/tjjHttaN+RTnmSmJdlqcmLT8eHNHpeiL8JyclafT48/PTEKXloEN0WLGiuDWw2NGS4k8gACcr'+
  'zZLMl50d93vQNOrCqF23LNdgkZNm8Q3i+K88Gw2Dpe48AP8AoCvKrVLUqu6qakz1216IWmKexysoHZZKQAe4hN8HMnpcSVne0jrvM6w34JSl'+
  'RIsK1KY9zafAOW+qHcjMPHW4cGg+5b3yVpAkFTnBsMVtDa1F/G/kiNYjebaWpD3V8ziSSchcmgEcVGO5ytp6FaM1jWXURlJgdklaLKbsaqVB'+
  'o/cYeeDG9BiPwQ0dHFx4BdmrWhRg6k3kkaEKbqSUI8TVpBzw4qOSuztSbM1IpdkwL602ozZRlJlmQalTpZpIiS7AGiO0cy9oHdnm4d0eIOaU'+
  'EDOcrBZXtO7p7Sn/ANF9xbyoT1Jkb3DrV49j3X8T0rK6R3fOH1VCaW0ScjO/dYYGfUzifumgEs6x3PQM0cPcr6JOcmpCfgT0jMRZaagRGxYM'+
  'eE7dfDe05a5p6CCAcql/ZQu6Tpy49z8GXW1xKhPXie0iLSGzbrpLawWD6lqsWFCuulsayoQG4b2dvJswxv3rukD3LsjkQt3rzqvRnQm6c1vR'+
  'LKdSNSKnHgwiIsReeR2tZJ2jL6Of48mvOFYGM81tnWuzLubtE3q8WtWnQ41YmI0N7JGK9sRjn7zXNIaQQQQchYB7ELsB/wAVq583xvor0y2q'+
  'w2UP4lwX0IdVhLXlu7zpcnqV79gb/EG8vjOB5lUr9iF2dNrVz5vjfRV5Nheg1qj6cXVMVakzshDmanD7AZqA6EYm5CAcQHAEgE4z1rm47Ui7'+
  'SST8PqbeGRkq63eJa5ERQUkxXHbb/gvEddYlB+2vOHHQvSrbKpNUq2zJHhUqnTU9Eg1OVjxGS0J0RzGAuBcQ0E4GRk99edBt24fgCq+Rxfoq'+
  'baPTirbJvvZHMVjJ1ty7jqsKSO4J7y7T2OXBjjQKr5HF+ihty4C0tFAqpJGABJRcn/hXdc4+JzdWXgesmj2fa+2Rnn6xSfmWqmm3l799ud1/'+
  'EY4fnERXV0wlJqQ0TtGRnZaLLTMCjSkKLAit3Xw3CC0Frh0EHoVPNua3K7Pau23VJCi1GblHUgwOzy8s+KwPbGe4tJaDg4cDg9ahGESSv82/'+
  'EkV9F+y5cioHHOcIQu5Fr3L0W3WfII30VHsVuj+bdZ8gjfRU32kPFEd1JeB1IOFPRzK7T2K3OB/i3WfIYv0Vy9i1zH/5brPkMX6KptIeKKak'+
  'vA6fecccSpyccyu39i1zfzbrPkEX6Kj2LXNnHsbrPkEX6KrtIeZFdSXgdVvE9JWSae++9anHh68yfn2Lr/Yrc4f/AItVkfmMX6K72yqDc8lq'+
  'NQZ8WnXpj1LUIEy6DAp8Vz3thxA9waN3nhpVlScHBpNF0ISUk8i2e3BqmJOiyGlNKmfs85uz1V3He5gtP2KEf7ThvkdTG9ao2455LNL7nL0v'+
  'vUes3dV6HVzNVKadHLDJxSITOTIY7nk1oa0eBY77HLh5+sFWP5nF+itXDqELWhGnms+L5ma7qSr1XLLd3HVnxrmwFz2ta1znE4DWjJJ6h312'+
  'Hsdr7TxoNVHhk4v0Vv3ZS0XqV4azS9xXDR5yXodAc2cJmYDobZiZBzChjeHHB7t3eaB0rYuLunQpSqN8DFSoTqTUEuJaTQTZ/tezNGKfAu21'+
  '6TUrgngJ2efPykOO6C94GILS4HAY3AI++3j0rZx0x03Jz2v7X+aoH0VlXQi85q3VWrNzlJ5slsKEIRUUuBivax03Jz2v7X+aoH0U7WWm+c9r'+
  '+1/mqB9FZUix7ap5n1LtnHwKu7V+htvVLRKLdFn21T6dVKA4zcRlOlWQfVEseEVrgwDeLRh46t09a89XBe1MaFDjwHwY0NsSG9pa5jxkOBGC'+
  'COkLyt1s0drunGstWoUhRalMUeJFMzTZiFLPiMfAfxDd5oIywksP9kHpUq0fvtaLoVHvW9HExS1yaqQXM1PjHFS0ldm63LhxxoFVHhkov0UF'+
  'u3Bj94ar5HF+ipLtIeJyNSXgXT2G9UBOUOo6V1SOOzyZdUKZvH3UFzvssMf2XkOA6nnqVxjyXkVYE9eNg6m0S76VQav6pp002L2MScUdlZyf'+
  'DPc8nNLm/KvW+VmBNyECabDiQxFY2IGRW7rm5AOCOgjPEKEY7bRpV9pDhL695I8MrOdPUlxR4/ait+3Ddo/HU7596xnHBZ7qTa1zwNZLsZHt'+
  'yrscaxNux6jiHIdGc4EENwQQQQR0FYw627hx/i/VvIov0VM6M47OO/uRHqkJa73HUccr0L2EQBs+Vg54mvRfMwVQn2O3AOdAqw/M4v0V6CbE'+
  'VHqlJ2e6ganTpqS9U1qNFgtmYToZiMEKE3eAcAcZa4Z7xXIx+cXaZJ96N/DIvbptdxZVERQckgREQBERAVN29T9qC2Pjk+YeqC9PJeg23NR6'+
  'rVNH7ei02mTk4yXq+9GMtBdE7GHQXgFwaCQCeGetUNNu3AMf4AqvkcX6KneAzirSOb739SNYnFuu93gdZjjlbJ2fhnaisMfjiF+orCPY/X8/'+
  'vDVfI4v0Vs3Z7tq437T9kxBQKoIcCpsjxXulIjWw2Na4uc4kYAHWV0LycdhPf3P6GnQhLax3d56lj3IUqB7kKV5oTEIiIAiIgPMzbHH/AHtq'+
  '5+RyfmQtCYwFY/bCt6vRdqaqT0GiVGLKzElKOgx4cs97Im7CDThwBBwQQVoT2PXAf4hqnkcX6K9Gw6pFWtPf3IiN3GW3nu7zqxzW/tjfHttK'+
  'N+RTnmStKG3q8D+8VU8jifRW/tji3a8zajkahFotQhSsrITTo8eLLvYyHvM3W5JAHEnAVMSnH2Wpv7mVtIy28Hl3no6qKbX20D68z0xpRZs8'+
  'DToD92tTkF3CYiA//DtI5saR3fW7ueQOd37UuqtwWFp0ygWfTKrGrtcZEhQ56UlnxGyUIYD37zQfsh3sNHRku6BnzrbaN3xiXMtWvRCeJIp8'+
  'd3/pUfwPD4SftNV7lwX3OtiVzJLZU1zOkPPiuJBysjZYt7xP3OzLiceoUyP9BfdTtLNSqtU4FPkLBuSJHjvDGB1Oiw25PW5zQ1o75OApY60E'+
  't8l1OCqc8+B82n9h3DqRfsjaVtSpjTk07uohHcS8MHuosQ9DWjx8AOJC9UtLtM7e0o06lLTt6GXNh/ZJmbiNAiTcY+6ivx0nkB0AADksV2f9'+
  'EKXo1p+JeIIU1cc+1sSqT7RkOcOUKH1Q25OOs5J5jG3VCMYxN3U9SHuL5/H9CSWFlsI60vefyOMSGyLCdDiMa9jgWua4ZBB5ghea21HoU7Su'+
  '/PX635VwtKrxC6XDRlslH4l0AnobzczPRkfcr0rWP3tZtCv+xajadySgmKfPQ9x4HBzDza9h6HNOCD1hauG38rOrrf8AF8UZry1VxDLv7jxy'+
  'PFT05Cz/AFG0fvXTi/522qnRZ+aZBeTLT0tKvfCmoR9zEaQCOI5jmDkLFPY7X+XrDVPI4n0V6DCvTnFSjLcyLSpzi8mjsLEvev6d37T7utuZ'+
  '7DPSb87ridyMw+7hPHSxw4H5COIC9VtL9SaBqrpvI3bQIm6yMNyYlXuBiSsYe7hP74PI9IIPSvJgW9X/AIBqvkcX6K23s/aj3bo7qdCm4lFr'+
  'UxQKi5svU5FkpFJc3OGxWN3eMRmeHWCW9Ixx8YsIXUNeD/jXz+Bv4fcyoS1ZL+Fnp8i4seIkNr25w4AjIwfEigxJSceHxpjw+NSiAjHh8alE'+
  'QBERAEREAREQBERAMeFMeFEQDHhTHhREAx4Ux4URAMeFMeFEQBERAEREAREQBERAEREAREQBERAMJhEQBERAEREAREQBERAEREAREQBERAER'+
  'EAREQBERAEREAUY8PjUogIwO/wCNMKUQBERAEREAREQBERAEREAREQBERAfNUJ2FTaTM1COHGFLwnxnhgySGtLjjv4Cq+NvHTAgEWvdeDx/c'+
  'oH1qsfd7tzT6uv8AvafMH/lOXja3jCZ/ZH6l38Fw6jdqbqrhkcvEbupQ1dTvPZi3LhpN12nT7koU22ap1QgNmJeM37prhniOgjkR0EELo9TN'+
  'Sbb0p0/mbtueJF9TQ3thQoEuA6LMRXe5hsBIBPM8TgAE9CqDsX60QaFVJjSy5Z5kGnzbnzVKjx4gayDGxmJBJPIOALx/SDvvlrPab1pdq1qi'+
  '6WpE0X2vR3OgU8NPczDuT5gj+ljDf6IHWVSngs3dujL3Vvz+BWeIxVBVF7z7viWdo+2/pxWLgkKTCti6IcWdmYcsx74cDda57wwE4iZxkqzq'+
  '8cbKGdTLcGcf4VlPPsXscOSsxqxpWkoKkuOZdh1zOvGTn3BEXy1KoSdIo03VahHbAlJSC+YjxXcmMY0uc4+AAripZ7kdE6O+dQLR04teJcF4'+
  '1mBTpNp3Wb2XRIz+hkNg4vd3gO+cBVcru3zSYM8+Hbenk7Ny4dhseoTrYDnjr3GNdjxqsOrOptwazaszFcmPVD4ESL6mpNNbl3YIJdhjGtHN'+
  '7uBceZceoBWUsTYTk5q1IE7qDdVQlarHYHukaW2HuS2Rndc94O+4dOABnlnmpNDDrSzpxnevOT7v+jjSu69xNxt1uXeZxp7tr6eXVVYNKuun'+
  'TVpTMZwZDmJiII8qXHgA6IACzo4uaB1kKzMOJDjQWRYT2vhvAc17TkOB5EHpC839Q9j/AFItjUCQo9oSsW6KVUnlkvUGMEL1OQOImeOIYA4h'+
  '3J3Rx4K7+ien1a0x0fp9pV65YldmZcucIhGIcu04xBhZ7ow28cF3Hj0DAGhiVvaQjGpbT493+cPU2rOrXlJwrR4d5sNERcc3zSOtm0lRNFbq'+
  'ptCqdtVKqxZ6UM22JKxYbGsaHlmDvczkLWPt+LS/B9XvKYHpWv8Ab1P25LXH4ldw/wBu5fhsw7PNg6v6cVau3bFrDJqVqRlIYkZoQm7ghMdx'+
  'BacnLipNQsrOFnG5rp7/AA5nHqXNxK4dGmzbtC26tNZ+fZArdu3DSIbjj1RuQ5hjO+4MdvY8AKsjbly0G7rblq/bVVlqnTZlu9CmZZ+813WO'+
  '8RyIPEHmvN3aX0Oo+i120eFb9Wm52mVaDFiQ4U6WujQHQ3NDgXNADmnfGDgHgQtk7B911KFf9x2U6PEfTZiRFSZCJy2HGY9rHOHVvNeAevdC'+
  'tvMMt5WvtVq3l4Mrb3tVVtjW4l7kRFGzrhERAEREBpHWjaUt7Re7pC36rbtUqceck/VjXyj4bWtbvlmDvHOctKyTRfWOla0WhPV+lUeepkOT'+
  'nDJvhTbmOLjuNfkFpxjDlUTbuce3zQG9VCZ5+KtubCHvH189Pr47zEJd6tYUYYfG4S/ieX1OZTuqkrp0m9xalERcE6YREQGktaNpS3dFrsp9'+
  'Aq9u1Wpx52T9WNfJuhta1u+WYO8Qc5aVlejmrVK1ksGNdNIpc7ToMKcfJmDNuY5xc1rXZy0kY7seJU928HZ1zt9vVQ2+fiLdGwuB7XGoH8ez'+
  'HmoS7tewpQw+Nwl/E8jm07mcrqVJ8EWcREXCOka61g1it/Rm1pGuXBT6lOwp2b9SQ4ci1hcHbjn5O84DGGlYNp5tc6bah6gSNoSkhWqXOz5L'+
  'JeJUIcNsJ8QDIh7zXkhzsHHDieHSFhW3o8DSS12Z7o1lxA8EB/pVDJaamZKdgzknMRJeZgxGxYUaE7ddDe05a4HoIIB+RSfDsIo3VrtJZ6zz'+
  'ONeX9SjW1Vw3HtMtKasbTun+kd5QrXrErValUjAExGh01kN4l2u9yHlz24cRxx1YPSFi1vbVtvRNk6Jf9WjS77lkGinx6Vvhrpie3e4LRz7G'+
  '8fZCegB45hefNw3BVrqumfuKuzj5uoz8d0xMRnfdOJ6B0AcAB0AALBhuDOrUl7QslHdzZlvMQUILZcWenWj+0VaGs9fqNIt2lVqSjyEu2ZiG'+
  'fhw2tc1zt3ALXu45W4FQnYI99O7fimD55X2XPxS2hb3EqdPgsjasq0qtJTlxCwXVvU+maRacvu+rU2cqEu2ZhS3YJQtDy55IB7ogY4LOlXLb'+
  'aJGy8743lP1vWCzpRq14QlwbRkuJuFOUlxSO50e2nra1iv2PatJtur02YhSb5wxpt0JzC1rmtLe5cTnux4lvRed+w1j2xtRJPH1ijedhL0QW'+
  '1i9rTtrjZ0uGSMNjWlWpa0+IWEas6kyOk+l85elQpkzUYEtFhQjLSz2te4xHhg4u4cM5WbrEtSNPKHqjp9NWdcUadhSExEhxXPk4ghxAWPD2'+
  '4JBHMdS0aOptI7T3c9/I2amtqvU4lb/b82p+D2ueVwVA2+bW6dPK35XBWudpfZxsbR7TCnXFa89XJiamKmyTe2fmGRGBhhxHZAaxpzlg6etY'+
  'Hsz6R23rFqTVKDc81UZeVlKaZtjpCK2G8v7KxnEua7hhx4YUqhZYbOg7lReqviziSubuNVUm1m+RcTR3akoOsGoj7Sp9q1SmR2ycSbEeZjQ3'+
  'sIYWgtw3jnu/0Lfi0zpbsz2DpJe77ptufrsxOvlXym7PTDHsDHFpJw1jTnuB09a3Mo3eu3dT+WX8PxOvb7XU/wBXiF8NaqkCh23UK1NMiPgS'+
  'MtEmojYYBcWsYXEDPTgL7ljOoxa3R27HO9yKNOE+DsD1r01rSSZmk8k2V8G3jplugm1rrwRn9ygfWJ7fHTH+a12f7qB9aqIWtS4VdvOh0SPF'+
  'fChT87Lyj4kPG81sSI1hIzwyAVekbBunP877q8cD6tSm7scOtGlVz38zh0Lm7r56mW4zbTDatsfVPUiUsui0Kvyk7NQosVkWchwhDAht3iCW'+
  'vJ5A9C3ytBaXbKNmaV6lyl6Ue4a7OzctCiwmQZwwuxnsjd0k7rAeAJ6Vv1R699n2n8tnq5d/ida32up/rcQuouqvwbVsesXLMQHzEKmScWcf'+
  'BYQHPENhdugngCcYXbrBtZyBs8XuScD1jm/NOWClFSnGL72ZZvKLaK6e39tzGRpvV/L4X0V+kHb6tlzwI2nNZY3rZOwXH9ICpFQqeyrXRS6X'+
  'FiPZDnJuDLOczGWh72tJGenir0zWwXYj5R7ZG9rkgR8HcfGZAitB77Q1ufGFLLuyw20aVVNZ8zh0Li8rpuDW7kbC0/2sdI78qUGlGpzNAqUZ'+
  'wZDl6xDEJsRx6GxQSwnqBIJW8l5I6t6TXJpBfr7auDsceHEZ2aTnoIIhTcLON4A8iDwc08j1ggm3GxdrLUrno87ppc08+bnaVBEzTZiM8uiP'+
  'lshroTieJ3CW46d12PuVz8QwinCj7TbPOJs2t9KVTY1lky2yIij51QiIgCIiAIiIAiIgOgvlwZpfcbycbtLmjn/YuXkxppQ5K5dXLUtypsc+'+
  'SqNTlpWO1rt0uhve0OAPQcE8V6vakvMPRi7ogOC2izh/5D15c6HQxE2jrBZ0evcofE8FSjAHq0K0l/m5nGxNZ1KaZz1k0tq2kGqU5a1QL48o'+
  '7MenzpbgTUuSQ13ecMbrh0EdRCzTRLQqPeth3VqNcUvEh2/R6ZNvk2HufVs0yC4jH/8AHDOCT0uwOhyvdrLoxbetFoS9HrcWJJTUpMNjytRg'+
  'MDosHiOyNGebXtyCOvdPQvsu2g0e09mq4bfoclDk6bT7emoECBDHBrGwH+MnmTzJJKo8dlUoQgvfbyb+H9wsMUakpP3e48rLJJ7ZNtdJ9dJT'+
  'j/tmL2QHJeN9kj7Y1tn8ZynnmL2QHJNJffp8mVwj3ZBa02hIkeHsu30+Xzv+s8YcOeCMH9GVstdfXKNI3FbNQoNUhdlkp+WiSsdmcFzHtLXY'+
  '6jgqOUZqFSM33NM6tSOtFxXeeUuhsSRhbStivqRYJcVqX3i/3IdvYbn/AFt1etQ5LyP1S0wufSDUWNb9ZgxmNZEMSn1BgLWTcIHuIjHD7ocM'+
  'jm13yFbstTbmvyiWzApdwW1TLgmoDAxtQfMPl4kQDkYgDXBzusjGepSzF7Gd9qVrfesjh2NzG21qdXcegL4sJkRkN8RjXxCQxpIBcQM4A6eA'+
  'JXNeUGo+umoWpt8SVyVSqxKfEp796my1Me+EyScT7qGQd4vPDLicnly4L0R0DqmpdY0Up1Q1TlYUCsRCTCJZ2OPEgYG4+Ozk2IeJIGOGCQCS'+
  'FxL3Cp2lKNSclm+7/OJ0ra9jXm4xXDvNnIiLlG6UC28/fqtj4jP/AJh60tYWrurGnFrzsrY1ZmqfSYkfs8y5kiyNDEQtDcue9h3SQGjGR0Lc'+
  '23ic64W2MnhQh/5iItj7FdEplx7Nl3UKsycObp89VosvMQIgy2Ix0vDBH/56CpnTrwoYbTnOOst271I9OlKpeSjGWTKZ3dfF6al3PCql2Vqb'+
  'rVSc1svB7IAAwE8GQ2NADck8gOJKvfsmaC1fTCiz923hBbL3BVoTYLJLIc6Tlwd7deRw33HBIHINA55VJ9YdM6jpNq5UrTnOyvlmO7PT5t/D'+
  '1RLOJ3H5++GC12OTmlXt2U9au2dpp6wVya37noUNkKZc891NQOUOP3zw3Xf0hn7oKmMzm7OLt8tm+OXh3ehXD4pXDVX3iwKIihpIAiIgCIiA'+
  '89dux4O0DRmjm2hQ/PxVt/YOH2kLgPXXHeYhrTO3K4O2jqc372hQPOxli+im0rWdFbRn7fp9ryFWgzk4ZwxZiZfCcxxY1mMNBBHcg/KpnK2q'+
  'XGGQp01m9xH1WjSvJTm9x6coqKt2+blz3WnNK+SoxPoK1ejGokzqno3TL1m6XCpsWcfGa6WhRTEa3ciOZwcQCc7ueSjVzhtxbR16sclzR16N'+
  '3SrPVg95n6Ii0TZPPnbvOdd6CB0UJvn4i3XsMfwb5/49mPNwlo/breTtB0dh5NoUPH++ireGwx/BxqHx7MeahKVXX+0w9Di0O3SLNoiKKnaK'+
  'i7fBHa3tBueJqsU4/wBiVXDRnRg6vWHfbaY5wuCkQZaZprd7DYxJib8F3R3YaAD0OA6MqxG30/Fk2VD++qEwfFCHpXS7ATCZ2/IhH3Mk3P8A'+
  'vVLrWtOhhW0g96f/ANjhVqcal7qS4NfYpp6kmhPmRMrG9VCJ2H1PuHsnZM7u5u897PDHXwW7tXdDxpHoPZc/WG5uiszkaLPjPCWYITSyXHXu'+
  '5y49LiegBXcbs72M3aSdrD2EmdMPsgp5YOwic5Ga/t7vRjG93XNaZ2+jizLJH9fmfNNV9PGParmlTp7l388uBbOw2NKc5733GF7BPvqXb8Uw'+
  'vPq+yoRsEn7a92j8UwvPq+642O9sl6fQ6GG/gIKuG247d2YAPvqzKD9s/wDRWPVbtt7PtYoePhqVz4oi1cN7VT5oz3f4MuRX3Ybz7ZCe5fvH'+
  'H87CXomvO3YbAO0fUD+I4/nYS9Elu6QdrfJGthf4HqERFxDolW9u0jtCURueJrsPh1/YIq1JsGt+3dcjuqif++xbU28H40Ut5n31bafFAiLV'+
  '+wWB247od0iitH/Pb6FKbf8A2ifr9Ti1e3xL9oiKLHaCxPVF25ofeT8ZxQ53zD1lixHVThoXefxHO+YeslL348y2fus8h5GDMzE7KwJJkR81'+
  'EexkFkLO+55IDQ3HTkjHfW1xpRtIBu6LSv0Dq34v01rCg1J1FuSl1lkFsZ0jNQZoQnHAeYb2v3SegHGFbkbfVYHPTSQ+Spv+rXoF7O5i47Cm'+
  'peOZFbZUmntZNGydjm19RbYoF2wtQaXXZB8aalnSjas55LgGP3izeJ4ZLc47ys4qdWNts1O7tS6Da0bT2UlYdVn4MkY7Ki55h77g3e3TDGcZ'+
  '5ZVxVDMTpVo1nOvHVcu5Eis503T1abzSCwHXAluzdfJBx/gOb80Vny17rqd3Zpvo/iSa82VqW/4sea+pmq+5LkeWdkNzqXbTR01WUH/PYvY0'+
  'cl4x0Spvo1y02sMgtjOkpqDNCG44DzDeH7pPRndwrazW3xcLpVzZHTimwox5Pj1CI9o8LQwE+MKW43YV7qcHSWeWZw8OuqdBSU3kdzt9zNP9'+
  'QWNJ9wagIs3F4e6bC3YYOe8XY8RWpNjKDNRdq6nxJdrjChU6cfHI5BhYGjP+sWrWN43je+sepnrrWDHq1anC2BLSUnBJDG57mFBhjJDeJ8JJ'+
  'JPSr5bLGg03pNaU3XrohwhdFXa0RYLHB3qKAOLYO8OBcT3TiOGQBxxk0uHGww72eo85NP5/oKSd1d7WK3IsMiIoaSAIiIAiIgCIiAIiID46v'+
  'S5KuW/PUWpQzFk56XiSsdgcWl0N7S1wyOI4E8QtR23sr6NWpddNuOjUGdh1Cmx2TMtEiVCM8Ne33JLS7B8BW6EWWnXqU04wk0nxLJUoTacln'+
  'kF8VXpUlXbfnqLUYZiSc9LxJWOxri0uY9pa4ZHEcCeK+1FjTy3ovNGUzZF0QpNYk6nKW9PiPKRmR4W/UozgHMcHNyN7jxA4LeaIslWvUq5Op'+
  'JvLxLIUoU/cWQREWIvOjuqzrXveguot20GRrEi473YZuEHhp++aebXd8EFaQqGxPolOzro8vBuCnscc9glaiSxveG+1x/SrFotijdVqO6nNo'+
  'xVKFOpvnHM1JYezVpBp5VoVWo1s+q6nBO9CnanFdNRIR62B3ctPfABW20RY6tadV61STb+JdCnGCyisgiIsZea01H0G031VuCUrV5Uuamp2V'+
  'l/UsKJBnIkECHvF2CGnB4uPFd1pxphaGlVtzFDs2SjyspMTJmogjTD4znPLQ3OXHlho4LMUWZ3FVw2bk9Xwz3GNUoKWulvMC1J0a0/1ZhyAv'+
  'Wjum4kgXGXjQY74MRgdjebvNIJacA4PSMrprD2dNL9Nryh3RaVMn5Sow4T4Ie+oRYjSx4wQ5pODyHPpAPQtrIqq5rKGzUnq+Ge4OjBy13FZh'+
  'ERYDIEREAREQGrtQ9nzTLVC64dx3dSZuZqDJdsqIkGdiQRuNLiButOM5ceKxH2mmhPwDU/nSN6Vv9FtQvbiCUYzaS+Jhlb0pPNxWfI0B7TTQ'+
  'rOfWKqfOkb0rb1k2Vb2ntlSlqWvKxJamSpeYUOJFdFcC5xc4lziSeJKyFFZVuq1VatSba+LKwo04POMUgiIsBlNY6iaA6Z6pXNAr94Umamp+'+
  'DLiVZEgzkSCOxhxcBhpxzceKyHTzTe1NLrUiW7Z8lGlZCJMOmntix3RnGI4AE7ziTyaOHeWWos0rirKCpuT1fDuMapQUtdLeERFhMhg+pOkl'+
  'kasSNPlL1p8echyER8WXEGZfBLXOAa7O6RngBzX46a6N2HpN65ewqmx5Q1EwzMGNMvjb25vbuN4nHujyWfIsu3qamz1nq+HcWbKGtr5b/ELB'+
  'tSdJLJ1YkJCTvSnx5uFIRHxZcQZl8Etc4AHJaRngBzWcorYVJU5KUHkysoqSyktxrfTbQvTrSerz1TsymTUrMzsFsCM+PNxI2WB28AA48OK2'+
  'QiJUqTqS1pvNiMIwWUVkgsV1A08tbU60PY1d8nFmqf2dkyGQozoLg9md07zSD0ngsqRUjJwalF5NFZRUlkzWOnugGmWl90Rbgs+jzMrUIku6'+
  'VdFizkWMOxuc1xGHEjm0cVs5EV1SrOrLWm838SkIRgsorJBERYy4wzUfS2zdVqFKUi85CNNyspH9UwWwph8EtfuluctIzwJXU6b6E6c6U1uc'+
  'q1mUualZqcgCWivjTcSMCwO3sAOOBxAWyUWZXFVQ2ak9Xw7jG6UHLXy3hERYTIF8VXpUlXbfnqJUoRiyU9LxJWPDDi0uhvaWuGRxHAniF9qK'+
  'qeW9A0AdjTQktAFBqYA6qpG9Kj2mehXwFVPnSN6VYBFt/tC5/MfVmD2Wj5F0NJW9soaM2xdlOuKl0SoNnqfMMmpd0SoxntbEactJaTg4PQVu'+
  '1EWCrXqVXnUk3zMkKcKaygsgusuKgUu6rTqNt1qA6PT6hLvlZiG15YXMcMEBw4jwhdmixptPNF7We5mgDsaaEkgig1MeCqRvSv2l9jrQeDHE'+
  'R9sz0cD7iLU45afE4LfKLb/aFz+Y+rMHstHyLoYjZul2nunzHCzrRpdJe4bro8CFmK4dRiOy4j5VlyItWc5TetJ5szRiorJIIiK0qEREAREQ'+
  'Fcq9tqaSUK45+jukrlnHyUd8s+NLybOxucxxa7d3ogOMg8wF1426dIccaPdo/M4X1q3NUdHdKqvVpip1PTy2pqcmHmJGjxafDL4jjzc444k9'+
  'a+TtFaN/gwtX5uh+hdSNSwyWcJZ80abhc57pLoaj9vVpB8D3b5HC+tQ7dWkIxijXafzOD9att9ojRknPawtb5vh+hBoRoyDntY2t83w/Qq7T'+
  'D/JLqimpdeZdDUnt69Ivga7fI4P1qe3q0i+Bbt8jg/WrbvaK0b/BjavzdD9CjtE6N/gxtb5uh+hNrh/kl1Q1LrzLoaj9vVpF8DXZ5JB+tT29'+
  'WkWOFGuzySF9atudonRr8GNq/N0P0Ke0Vo3jHaxtXHxdD9CbXD/JLqhqXXmXQ1CNuvSP4Fu3ySD9ap9vVpF00e7PJIX1q252idGvwY2t83Q/'+
  'QpGhejg/kxtX5uh+hNrh/kl1Q1LrzLoajG3TpERn1mu3yOF9ao9vXpD8DXb5JB+tW3DoTo0eemNrfN0P0J2idGs57WNrfN0P0JtMP8kuqGpd'+
  'eZdDUY26tIfge7B+ZwvrUO3XpCBwo12n8zhfWrbnaJ0az72NrfN0P0J2iNGvwY2t83Q/Qm0w/wAkuqGpdeZdDUPt7NIvgW7fJIP1q5e3q0ix'+
  'n1mu3yOF9atujQvRwDHaxtX5uh+hQdCdGj/Jja3zdD9CbXD/ACS6oal15l0NR+3q0i+Brt8jhfWp7evSL4Gu3yOF9atudonRv8GNrfN0P0J2'+
  'idGvwY2t83Q/Qm0w/wAkuqGpdeZdDUft69IsfvLdvkcH61Dt1aQgfvNdp/M4X1q272itGwMdrG1vm6H6Fx7RGjWc9rG1vm+H6E2mH+SXVDUu'+
  'vMuhqT29WkWP3mu3yOD9apG3TpCedHu0fmcL61bb7ROjX4MbW+bofoUdojRr8GNrfN8P0JtMP8kuqGpdeZdDUvt6dIvga7fI4X1qj29Wkef3'+
  'luzySD9att9ojRr8GNrfN8P0Ke0To1+DG1vm6H6E2uH+SXVDUuvMuhqT29OkWP3mu3yOF9ant6dIsZ9Zrt8jhfWrbfaJ0aBz2sbWz8Xw/Qp7'+
  'Rejefextb5uh+hNrh/kl1Q1LrzLoaj9vTpFj957s8jhfWqDt1aRYyKNdp/M4P1q252iNGs57WNrfN8P0J2idG/wY2t83Q/Qm0w/yS6oal15l'+
  '0NRDbr0iPOi3aPzSD9apG3VpAedHu0fmcL61bc7ROjePextb5uh+hR2h9GfwY2t83w/Qm0w/yS6oal15l0NSHbq0h3ses1246/UcL61SdunS'+
  'IfxNdvkcL61ba7RGjWfextb5vh+hcu0Vo2P5MbV+bofoTa4f5JdUNS68y6Govb1aRk8KLdvkkH61T7enSL4Gu3yOF9atudorRv8ABjavzdD9'+
  'CgaFaNgEDTG1uP4uh+hNrh/kl1Q1LrzLoaj9vVpFnjRbtH5nC+tT29WkWeFGu3yOF9atudorRvGO1ja3zdD9CntF6OfgxtX5uh+hNrh/kl1Q'+
  '1LrzLoai9vVpF8C3b5HB+tU+3q0iPKjXb5HC+tW3DoXo4Rg6Y2r83Q/QnaL0bH8mNq/N0P0JtcP8kuqGpdeZdDUR26tIuijXafzOF9ao9vXp'+
  'H8CXb5JB+tW3joXo4f5MbW+bofoUdonRrPvY2t83Q/Qm1w/yS6opqXXmXQ1GNurSLpo12j80g/Wp7evSH4Gu3yOF9atudojRr8GNrfN0P0J2'+
  'iNGvwY2t83Q/Qm1w/wAkuqK6l15l0NR+3r0i+Brt8jhfWqPb16R/At2+SQfrVtztEaNfgxtb5vh+hDoPoyTk6YWtn4vh+hNrh/kl1Q1LrzLo'+
  'ak9vVpHjPrLdvkkH61T7enSLH7z3Z5HC+tW3O0Xo3jHaxtX5uh+hR2itGx/Jja3zdD9CbXD/ACS6oal15l0NRjbp0ixn1mu3yOF9ant6tIfg'+
  'a7fI4X1q272i9G/wY2r83Q/Qg0L0bBz2sbW+bofoTa4f5JdUNS68y6Govb1aRfA12eSQfrU9vVpDj95rt8jhfWrbnaJ0az72NrfN8P0KDoRo'+
  '0Rx0xtb5vh+hNph/kl1Q1LrzLoak9vVpFn95rs8kg/Wp7erSH4HuzyOF9att9ojRrh9rG1uH4vh+hT2idGs57WNrfN0P0JtMP8kuqGpdeZdD'+
  'Uft69Ifga7fI4X1qe3q0ixxot2j8zg/WrbfaI0a3s9rC1s/F0P0Ke0Vo3+DG1fm6H6E2uH+SXVDUuvMuhqM7dWkOf3nu3yOF9ant69Ifga7f'+
  'I4P1q252itGse9havzdD9CdonRvGO1javzdD9CbXD/JLqhqXXmXQ1H7evSHOBRrt8jhfWoduvSH4Gu3yOF9atuHQnRonPawtX5uh+hO0To1+'+
  'DG1vm6H6E2uH+SXVDUuvMuhqI7dekQ/iW7fJIP1qkbdWkR/iW7fJIP1q26NCtG28tMbV+bofoQ6FaNn+TG1fm6H6E2uH+SXVFNS68y6Govb1'+
  'aRYz6zXb5HC+tT29WkXRRbt8kg/WrbnaJ0aP8mNrfN0P0KO0Ro1nPaxtb5vh+hNph/kl1RXUuvMuhqP29ekfwJdvkkH61SNurSI/xNdnkkL6'+
  '1bcGhOjY/kxtb5uh+hDoTo0eemNrfN0P0JtMP8kuqGpdeZdDUXt69IvgW7fI4P1qn29WkWf3mu3yOD9attjQjRofyY2t83w/QuQ0L0bH8mNr'+
  'fN0P0JtcP8kuqGpdeZdDUR26tIvgW7fJIP1qe3q0h+Brt8jhfWrbnaJ0a/Bja3zdD9CDQnRsZxpja3H8Xw/Qm0w/yS6oal15l0NSe3p0h+B7'+
  't8jhfWqRt0aQkfvPdvg9RwvrVtrtFaN/gxtb5uh+hT2itG/wZWt83Q/Qm1w/yS6opqXXmXQwm09rjSK62ze7M1alulizLZ+T92HZwW9jLvvT'+
  'nOOhFtCh6c2DbTI7aBZlCpojlpi+ppKGzsm7nGcDjjJ8ZRatSds5PUi8ua/QzxjWy/iaz5GTosGtvUmUuOp3xJwqXHgG1J90jFc6I13qktgi'+
  'LvNx7kccYKw6wNo+29Qm2Y2l0eahR7jmp2TiQXxmEyESWhdlIfj3W80tII61jVtVab1eHHpn9C91YJpZ8TdSLVUHWSdqGs09ZdD0+rVVptMq'+
  'EKl1KuS8aFuSkd8PsgLoJO+YYBGYnLqyvxuLWC5aJrdJ6cyul1QqMaeY6YlJ2HU5eGyNLsLRFi7ruLQ0v9ycE44c0VtUbyy7s+K4FHWhx9Db'+
  'aLWmoWtFA071Is+z6nJzEeYuSY7CI8N4DJRpe1jYkTPMF7w3h313l0X9K2vf9nWtHp0aYi3NNR5aFHY8BsuYUExCXA8TnGOCt2E8k8uObXpx'+
  'LtpHes+Bl6LELzvyXs6uWnTo9NjTZuKrNpMOJDiBogOcxzw9wPMdzjA613F03DJWnZFWueo59S02TizkRoIBcGNLsDPScYHhVuzlu3ceBXWW'+
  '/wCB26LW9p6qx750EhaiWraU3PzsQPHrEZqHCjCIyIWPYYjsNBABdx5jhzXyadavz1+aWVO/pix52i0qWl4seUMadhRnTohb/ZA0M4sw6Hju'+
  'hxzwWR21RZ5rg8nw4lqqxeWT47zaaLV9X1okKZorbN9Qbfn56cub1LBpVEgRGdmjzEw3ebC3z3IwMku5ABcaDrRK1bTG8Lkn7anqVVrRMxDq'+
  '1EjxmPiQ4kKH2QBsRvcua5uCHJ7NUyzy78htYZ5Zm0kWo7G1+t2/qpZknSKbMA3LT5yc3nRWH1G+Wc1sSC8Dm7LuBHRg9K24rKlKdN6s1ky6'+
  'E4zWcWEX5S01LTks2YlJiFHguzuxITw9pwcHBHDmsL1N1Hbp5SqSZagzNdq9ZqDKZTabAjMgdnjOBd3UR/csAa08T3gqQhKctWK3iUlFZszl'+
  'Fq26NYZu1dF6ZfFSsKsQJ+enoFO9YZmLDhTEONFiGGAXZLcZGQekEHgvouTVKr2boTP6hXTYk5TpuTiNY6imegxYjg6K2G09lZlnHeBV6t6j'+
  'yyXF5cVxLXViu/4mykWq7a1miV62b1izdlVOlXDaLC+foUePDe9+YJisEOKwlp3mg+Ar7LZ1gpd23jbFCo1LmIra5bouN00Yrd2UglzWNY8c'+
  'y4uJHD70qsrapHPNcP8AsKrB5ZPibIRa0ktZ6HE0zvO96nT5mRp9rVGcp8wzeER8Yy5A3mAY92XAAHr4r97A1Ir12UyqTFx6cVu04slAhzcJ'+
  's7EZFhzUJ7C9u5Ebw3wBhzebcjKo7eok21wCqxbyzNiItNV3aFo9A2bqFrDNW9Ovp9ViwGGSZGZ2SA2I5wLieTsBhOBzWUWvqrQrouK8JGXY'+
  'YMlbTZWLEqLoodCmIUeX9UCI3HEAN55VXbVVFycdy+277hVoN5ZmeotT6ea0Tt+3HJy/a4uOlUSqy0SdpFdjhsWBNQmOAzE3P3AuBBaHniCt'+
  'sKypSlTerLiXQmprNBF+MvNS00IhlpiFGEN5hPMN4duvHNpxyI6l1V43JBs/T6tXVMSz5mFSpKLOvgQ3BroghsLi0E8AThWKLb1VxKtpLNnd'+
  'otYaa6w+zy5pm26raNQtuqw6bArEGDMx4UwyYlIxwyI18M8DngWkZCiz9V63eeoVWotO0+nGUOl1OZpUzXX1GBuNiwef2HPZCCd0cOvvFZnb'+
  'VFnmuHxRjVaDyyfE2gi0rXdoSFb+oVbo03Y9Ui0OiVKUpdRrsGZhOZAiTLWGG4wSQ8ty8AkZwu+vjWqgWLrFaGn1RkpiLNXG8tEyx7Ww5QF2'+
  '5DLweJD39yMdSr7LVzS1eKz+Wf0G2hveZsxFh1xagS1u6qWfZMWmxo8a5TNiHMsiANl+wQxEO8DxOc44clgVxbRcrbV/V2kT1lVSJQ6DUZWm'+
  '1KuwZmE5ku+Za0w3dhJD3Ny4A4zhUhb1J+6u7P55fUrKrCPFm7kWsb41emLX1DhWZQLHq911VlP9dpyDIRYUN0CW7J2MOY2IQYz8g9w3q5rZ'+
  'cKIYsBkQw3w95oduPGHNyOR76xypyik5d5dGak2l3HNF+LpuVbPNk3TEITL2GI2CXjfc0HBcG8yOI4r9lYXBFqKb15pkpIzkwbfm3GVvOHZz'+
  'mCOzJiPc0COP6Pde558F9t2ar1qjaus0+tnT6euaoCmsqkZ8CoQJVsKE6KYf+VIycjo61n9mqZ5ZfQxbaHHM2gi13rFq3S9HdO4d01WmzFQd'+
  'FmWSsKRl3tbEe4gucQTww1rXOPgX46l6rTFhaaSl90y0pq46NEhNmJmNLzcKAZaE8M7G8h/F28XgdznHSqRt6ktVpcdyKurFZpvgbKRa2uDV'+
  'SdtLTKj3Tc9mzlPm6jVJemOpYnIUV8Axou415iNy0jGHYHHjhfjdmtlDs/XKlaa1OnxxMVOmRahAneytbDL27+IODx3ndjdg8s4HSqxt6kvd'+
  'WfH5cQ6sFxf+M2ei1Q/XSjw9nqh6omhVCKa4YMGn0eA5r48eYivLIcEO4NySDl3IBZRp/eVWvClTzq9ZVXtSpyE0ZWPJT+Hsed0OD4MZvcxW'+
  'EOHdN6chWyoTinJrctxVVIt5JmXovzjzECVlokzMxocGDDaXPiRHBrWgcySeAC5Q4jIsJsWG9r2PAc1zTkEHkQViLzki13qbqdO2DWLao9Ks'+
  '+cuap1+PHgS0rKzUOXIMKH2R2XROHuc+JfFI630Op2FZN0yFJnXwLpq8OjNgRHNZEk4zjEa/f5g7robhw58wsyt6jippbn/n2ZjdWKbjnvRt'+
  'FFh9439LWhdNo0SPTo00+5KmaZCiMeGiA4QnRN9wPMdzjA61jDtcZAaH3bqOLfmjBtyem5GJJGO0PjugRRDLg7GADkHjySNCpJJpcf8Aoq6k'+
  'U2mza6LS0DaStOdrGmtNp9PmpmPfMPskINiNHqEZ3T2T74h4ezA+9JX53ttES9k6mVe3JqyqlOUui+oTU6xLzUICXE2cQyILsOf3XA7uTwV6'+
  's6zlq6u/++X1LHXp5Z5m7UWKTl8SsnrDSbAMhGfMVGmzFSbNBwDGNhPYwtI5knsmfkWs57ahtiRn71psShzhn7Wq8vTHy3Z2B00yLHEAR2dT'+
  'WuPEHjy61bC2qz91Z/8AeRdKrCPFm90WsNRdX4lmXfJWjb1mVS77hmJKLU4lPkIrIRgSsM7piFz+ZLuDWAZJ+TOe2/VxX7Wp9bbIT0gJ2XZH'+
  '9ST0EwY8HeGdyIw8WuHIhWSpSjFTa3MqpxbcV3HZIvxizcrAmIMCPMwYcWOS2Ex7w10QgZIaDzOOPBfssZeEWpY2tz42pVQt6g6f3FXKTSqj'+
  'DpNUrci1r2Ssy/HciF7uI1m83fcODc55LsdVtZaDpLM21CrUlMzPr5PiTDoDmj1OwbofGfnm1pe3PhWdW1RyUUt7Me1hk3nuRslFgOpupna+'+
  'hUKUkLcm7hrNenvUFOp0vHhy4iPDC9xdFiHdaA0fKVk9rVmauG0JGsz1CqFDmZiHvRadUGtEaXcCQWu3SR0ZB6QQVY6UlFTfBlymm9XvO3Ra'+
  'puvWacourT7EtywKxdMzJSsGeqsSRjQobpSDFfuMLIbzmMeZIbjA6V9esWs9D0cpNFnaxT5medVJ4SjIUu4NMNgGYkY5+5YMZHfV6tqjcYpb'+
  '3wLXVgk23wNlosB1R1Ldp1b1Fn5K3Y9wzVYqkGlSknLzLIBfEitcWnffwx3OPlXXXfqvV7I0ekLxr1hTkGqTc/Bp/rE2fguiMiRYhYzMUZYc'+
  '8D8qpG3qSSaXHcuAdWKbTfA2ei19Ub7vSl6RxrumtMJxtTl3vdHoYqksYkOA3JMbsoO4eAzujjxXUUbWKs1TZ9qGqkbTipSstAlRPylPE7Bi'+
  'xp2V3Q8xWFvucNLjuuAJ3e+it5tZrxy4riNrHPL1NsItX23rFDvqvVWVsK3Ylcp9NhSrolSE4yDCfEjwuy9jbkHLmNLd7qLsdCKkqM4vKSyZ'+
  'VVItZo+SxrFuSh1/VmZqEnDhwrirESbprhGa7ssN0s1gJwe57oEYK1Ppds7XhYmrGmVztkIECTlKXEZcMs2aY4QJ0QHwhFaAe7L2uY0lufcn'+
  'PNEWaN7UipJf8lk+mRjdvB5PwMvr9j6jT+1HTbmoVlSFBhQanCfO3VI1bAqVMbDw6XmZXm+KTwDsYbgYPDKzeuWdX53aotS9peVhuo1Ook9J'+
  'TMYxWhzYsV8MsAZzOQ08RywiK2VzJ5buCyKqklnzzNV6w6I6n6jaiXldFMqUCnQpenSkpQZR7YUUz5gu9UHuycy/2YDjzPTwWaamUHUqq1rS'+
  '286FaMCq1SgRo03U6YahClt18WWEMtbEdkHDi7iM8u+iK/22bUU0so7l6rItVvHe13/rmfrqxRNRLko2ndxUCzYMzWKLWYNWnqM+pQoYh4gv'+
  'a6GIx7l2HOxkDv4X7atW9qLqboHIWxIUaDQqnWZyWh1mC+bhx20+WETeineGBF9y3uW88kIisjcuOrkl/DwL3STzzfEaK2DfGnk9fFDuOcg1'+
  'SmztSFTp1ThshwPVD40MdnBgNP2LD2jhyOSQv10vsW5ba2TWWRWJGHArnqOfhGXbGa9u/FiRXMG+DjiHt8GURUnczm233tPoI0YxSS+PzMdr'+
  'GmN9M2e9LYFHkJOYuqyI8hPupceZayHNOhQjDiwRFGWg4ccO5cEoWm9+TOkWrk/XKVKyFz3yZmNAo8GabFbKgy3YYMN0bg0uOMkjgMoiv9sn'+
  'llkuOfzzy6lvs8f86GL6W7P12af7RdsXVDlIcOgC3cT8FsywiTqL4EOHGaxgPEPdDDt5vDn1BWhm5WBOyMaTmWb8GNDdCiNyRlrhgjI4jgUR'+
  'WXFzOvJTnxW4upUo004x4GOafafW1pjY0C0rTlo8CmwYkSK1seM6K4ue7ecS4rGtcrfqtz6fQKRIaeyF7S75oOmpCPUfUMeE0NduxZeKeDYj'+
  'XEccjhnnlEVkaslU2j3sulBauquBrS6NLtU6zsZW7Zlbkxc1zydTlpqalIlQa1zpeHHc7sLphxG85sMtYX8zzGcLv7q0/uW6NjWcsGj2DDti'+
  'fdFhQ5ehOqzZoMhNmmRHH1QTji0OPE5HJEWf22e55Lc8/XqY/Z479/FZHd6JaZTumjr0t6bpkKJTJqrGap9ViRxGjz0s+GAGRyTvb0PizLuY'+
  'OetY7s56OXLptcl4VC6YTQ2JHbTaJiO2Lu06HEiRGYx7kExPcnjwRFbK7qSU0/8Alln6FVQinHLuOcHSC66ls8apWPPtgSNQuGu1Kfpz3RQ9'+
  'jmRIjIkFzi3O6CWAEcx1LMbCndW61b1Yl9QLRpNvNhykOWp8vLTomY0aIIZESI9zTuNYXbu6OY45RFbK5lJNNLjny/zIqqKTzTMBi6P3ZPbK'+
  'Om2ntRpEtGnqVVadGq8o+YYWCXhxXOjDezh3cu5Dn0Llo7oXcFjyWq1q1eNmjV1zZSkTxjCI90r2GJDbvNBy0sa9rcHGd3hwRFkd9VcZQ7m8'+
  '/XPMtVvBSUu9bjqtJdLtVKXqvaE5dFK9ZaZadGfSo8eBW3TECslrOxwHw5YcIWGkucXDJPfVnkRYrivKtLWki+lTVNZIxCw9NLT02l6vBtWU'+
  'jy7arPvqM12aO6LmK/njePAd79a5ao0Op3NorddvUWCyNUahSpmVlob3hgdEfDLWguPADJHEois2stfXbzZdqLV1e41joTpJcGl1/V0z9Mhx'+
  'qdUqVT3wqnGmxHmIEeHDDY0oSSXGGH5c0juccOpdfphpvcdo7Qdx12q6WwXip1qfmYN2MrTMwZWKd5jDKg8ckDjjI3u8iLPK8qScm/8Aksnx'+
  '/UxK3ikku47ej6F06q7QF63vfNEdNS8aqyk7RWunXGDE7HLsb2SJAa7dLmxAcb4PLhwWHat6F6m6gakXhelLqcCnvl4MjBoMhEEKJ6vEsRHB'+
  'MUnMv9mJ8PTwRFWN9VjPXT7svTd+hR20HHV9TZl02jdlw63aT3e2mQoctRWT0Srj1QzMs+NLNa1oGe77vIy3PLK1ddehF31DXmu6kQKDDqbI'+
  'dz06flqXHnmCBUZNkAMjFzC7dERjwHML+ojpRFSleVKfu+GXpnmVnbxnx8c/lkZVr/ZF/wB312RdZdjSExUZaAz1qu2BWPUM5SJjsmXl7cfZ'+
  'IJaB3IJySeC3zJQ5mFTZeFOxmxplsNrYsVo3Q94A3nAdGTkoixTrOcIwa4F8aajJy8TGJzTW1J/WKnanTMrHdcNPknyEvGEdwhiG7Ocs5E90'+
  '7j3+8MZciLHKbllm+BeklwKqVHZ3rk1cs/drbdl3XBE1Gh1eDNGeA/wSIjXuO7vbueBO6RvLINVdPLmqW0zI31K6WMvemS9HgS0Fvr0ynOlp'+
  'pkw6J2Ti4F2ARwIxxRFt+31W834Zd/6mD2aCWSO81i0xvjVHUa2penVKXoNAptPnIsefiQYc2XTMdnYexCC4jP2J0Tu+je4cV1U5p7qRVNge'+
  'LppUaZCiXZAk2U6HB9VQyyNDgzDexu7JnAzCY08Tno5oisjeTUYwyWUXmiroRbb8TMdZ7LuG8dPLfpVAlIUxNSdeps9HY+K2GGwoMUOiOBPA'+
  'kDo5lYNrboXXdUNWp2sy0BkGBBtQy9LqPqgMdAqbJrssMYzvBpbvNLuWHFESjeVKWTh3Z/P/AKK1KEKmescBpNf8vsj6e0GSp8mLvtGflaqK'+
  'bHmW9ijvgxXkweyDLQS1/A8srLNBLKvS2GXZWLxhTVPNaqQmJKjTNVdUnSEFrSMGKSQS5znHA4AAfIRJ3c5wlBpb3n88xGhGMlJdxsa87Qol'+
  '+2JUrRuKDFjUyowuxR2QohhuxkOBDhxBBAK+u3qDTbXtSnW5R4ToUhTpZkrLsc8vLWMaGgEniTgc0Ra+vLV1c9xlyWefea01h0vmdStQNPhH'+
  'lY8Wg02bnItTiy06ZWLCa+X3Ye65pD+LwAd08ufBfJqbp1VKbp5Y1K0ptOXmodr3BK1KHShNtlmmDCEQuHZIh5ku4k5JJJ4oizRuZpRXdHu/'+
  'zmY3Ri833s/LUig6jXVRtPL3ptnS7bht2r+uU3bUSpw8uYYb4ZayYxuFwBDvl7yx+HpNfj9i+9LQmqfKi7Lkmp2pCnwplpZBiR44iCF2U4ac'+
  'NHE8kRXxu5xiopLc8/nnkWuim22+KOgpey9UbQ1Mta56G4T0KXuSBOvl3RQwUuREB5iQ2bx7r7PEccN6McOa/LVrRG+rs18uK4KNZcnN+uHr'+
  'UaTckaqtgGkRJcgxYnYRkxM4xgjoRFk/aVbX13veWXzzLPZKerqrgbqqdpV2Z2nbbvKFLQ30iRoM5IzEx2RocI0SLCc0bnMghrjkcAtC33s1'+
  '3nX5ur3LSqdLwq3EvaNPNZ6qY0TtKiPgvG87OAWvhbwaePPvIix0b2pSacfDL/OpfUt4VFlIz3WrTi+qjqhEu+zbeFfhVS3X2/Ny0GretkeV'+
  'eI4jQo7IvA7ocAHAHJAI5FbV0ttqsWfo5bttXDUjUarJSbIc3NGI6J2SJxLu6dxcATgE88IixzuJTpqm+CLo0lGbku8m59NrUu+97Zuytyke'+
  'LU7bjumKfEhx3Ma1zsZ3mjg4ZaDx6urIWXdCIsTm2km+BkSSeaKoXPozqnHvqsUKiST4VHql1+yGXuaUrbpQyUKL2P1RBjSzSHRnYh4bzHHP'+
  'BZHrboxfurGolUmJKqQKRR5O23yEgYkOHMerY8Z5fFZgnMH9zgjsnPhw6URbav6ikpLLNGD2aDTT7ztb6tm+Ln0BtKjV7S2m3ZUmS7BV5KJV'+
  '2ysxJzDYO62PLRx3O9v8SQeRxxWwtJKPd1v6K29Rr7n/AFdcEtK9jm45i9mJO8d1pf8Adlrd1pd0kdKIsM67nDUy3Z5l8aaUtY1ZrbYuol16'+
  'm06cs+x5GFPSxljTr1lav6lmJACJvR4cxCxmNDI9ywZHE9eF+us2jt86s6oNbL1WXotvyVuzEnBmokGHMmamJh2IsPsZIMMbjWfZOY6ERZYX'+
  'tSGq4pblu9eZbK3jLPPvOd16aXrfehellt3TRIUefptXkIlwy4nGgCBChvhxXh7XDeyC09yc90u21s0tmazoFSrIse2mVGVp1TkowpL53sPZ'+
  'ZaFELnw+yxHZGRwyTniiK1Xc04tdzzK7CLT+O4yC1reqMPZ3nrXhWKy0Yxk5yVlaKKkJ0M3w/dPZs/dF2eJ4ZXaaUW1Ubb0EtW1bhlIcOekq'+
  'TAk5uX3mxGhzWBrm5HBw5jqRFilWlJNeLzL400sn8MjoNn7T6o6baO+x6qUyBT5x1TnJl8KBEa8Fj4zuxkubwP2MMHeAAREVtWo6k3OXFiEF'+
  'CKiu4//Z';

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
