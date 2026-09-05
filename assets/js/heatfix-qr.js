/* ============================================================
   HeatFix Mcr Limited — QR codes
   ============================================================
   A small, self-contained QR encoder. Byte mode, error correction level M,
   automatic version. It draws an SVG, so the code stays sharp at any size
   and prints crisply on a paper invoice.

   Deliberately no image service. A code fetched from a third party would
   stop working if that service went away or changed its terms, would put a
   customer's invoice number in somebody else's logs, and would leave a
   broken box on every printed sheet the day the internet is off.

   Exposed as window.HFQR.svg(text, options).
   ============================================================ */
(function (w) {
  "use strict";

  /* ------------------------------------------------ Galois field (2^8) */
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    for (var i = 0, x = 1; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;            /* the QR generator polynomial */
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function gmul(a, b) { return (a && b) ? EXP[LOG[a] + LOG[b]] : 0; }

  /* Reed–Solomon generator polynomial for `degree` check bytes. */
  function rsPoly(degree) {
    var poly = [1];
    for (var d = 0; d < degree; d++) {
      var next = new Array(poly.length + 1).fill(0);
      for (var i = 0; i < poly.length; i++) {
        next[i] ^= gmul(poly[i], 1);
        next[i + 1] ^= gmul(poly[i], EXP[d]);
      }
      poly = next;
    }
    return poly;
  }
  function rsRemainder(data, degree) {
    var gen = rsPoly(degree), rem = new Array(degree).fill(0);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ rem[0];
      rem.shift();
      rem.push(0);
      for (var j = 0; j < degree; j++) rem[j] ^= gmul(gen[j + 1], factor);
    }
    return rem;
  }

  /* --------------------------------------------------- version tables */
  /* Per version (1-20), for error correction level M:
     [ total data codewords, EC codewords per block, number of blocks ]
     Taken from the tables in ISO/IEC 18004. */
  var M_TABLE = [
    null,
    [16, 10, 1], [28, 16, 1], [44, 26, 1], [64, 18, 2], [86, 24, 2],
    [108, 16, 4], [124, 18, 4], [154, 22, 4], [182, 22, 5], [216, 26, 5],
    [254, 30, 5], [290, 22, 8], [334, 22, 9], [365, 24, 9], [415, 24, 10],
    [453, 28, 10], [507, 28, 11], [563, 26, 13], [627, 26, 14], [669, 26, 16]
  ];

  /* Alignment pattern centres per version. */
  var ALIGN = [
    null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54],
    [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70],
    [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86],
    [6, 34, 62, 90]
  ];

  /* ------------------------------------------------------- bit writing */
  function BitBuffer() { this.bits = []; }
  BitBuffer.prototype.put = function (value, length) {
    for (var i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  };

  /* ------------------------------------------------- BCH check bits */
  function bchFormat(data) {           /* 5 data bits -> 15 bit format info */
    var d = data << 10;
    while (bitLength(d) - 11 >= 0) d ^= 0x537 << (bitLength(d) - 11);
    return ((data << 10) | d) ^ 0x5412;
  }
  function bchVersion(version) {       /* 6 data bits -> 18 bit version info */
    var d = version << 12;
    while (bitLength(d) - 13 >= 0) d ^= 0x1f25 << (bitLength(d) - 13);
    return (version << 12) | d;
  }
  function bitLength(n) { var len = 0; while (n) { len++; n >>>= 1; } return len; }

  /* --------------------------------------------------------- the matrix */
  function build(text) {
    var bytes = utf8(text);

    /* Smallest version that holds the data, in byte mode. */
    var version = 0;
    for (var v = 1; v <= 20; v++) {
      var cap = M_TABLE[v][0];
      var lenBits = v < 10 ? 8 : 16;
      if (4 + lenBits + bytes.length * 8 <= cap * 8) { version = v; break; }
    }
    if (!version) throw new Error("That link is too long for a QR code.");

    var spec = M_TABLE[version];
    var totalData = spec[0], ecPerBlock = spec[1], blocks = spec[2];
    var lenBits = version < 10 ? 8 : 16;

    /* mode indicator, length, payload, terminator, padding */
    var bb = new BitBuffer();
    bb.put(4, 4);
    bb.put(bytes.length, lenBits);
    for (var i = 0; i < bytes.length; i++) bb.put(bytes[i], 8);
    var capBits = totalData * 8;
    for (var t = 0; t < 4 && bb.bits.length < capBits; t++) bb.bits.push(0);
    while (bb.bits.length % 8) bb.bits.push(0);
    var pad = [0xec, 0x11], p = 0;
    var data = [];
    for (var k = 0; k < bb.bits.length; k += 8) {
      var byte = 0;
      for (var q = 0; q < 8; q++) byte = (byte << 1) | bb.bits[k + q];
      data.push(byte);
    }
    while (data.length < totalData) data.push(pad[p++ % 2]);

    /* Split into blocks, interleave data then error correction. */
    var shortLen = Math.floor(totalData / blocks);
    var longCount = totalData % blocks;
    var dataBlocks = [], ecBlocks = [], at = 0;
    for (var bIdx = 0; bIdx < blocks; bIdx++) {
      var len = shortLen + (bIdx >= blocks - longCount ? 1 : 0);
      var blk = data.slice(at, at + len);
      at += len;
      dataBlocks.push(blk);
      ecBlocks.push(rsRemainder(blk, ecPerBlock));
    }
    var out = [];
    var maxLen = shortLen + (longCount ? 1 : 0);
    for (var c = 0; c < maxLen; c++) {
      for (var bi = 0; bi < blocks; bi++) if (c < dataBlocks[bi].length) out.push(dataBlocks[bi][c]);
    }
    for (var e = 0; e < ecPerBlock; e++) {
      for (var bj = 0; bj < blocks; bj++) out.push(ecBlocks[bj][e]);
    }

    /* ------------------------------------------------- lay out modules */
    var size = version * 4 + 17;
    var m = [], reserved = [];
    for (var r = 0; r < size; r++) {
      m.push(new Array(size).fill(0));
      reserved.push(new Array(size).fill(0));
    }
    function set(x, y, dark, keep) {
      if (x < 0 || y < 0 || x >= size || y >= size) return;
      m[y][x] = dark ? 1 : 0;
      if (keep) reserved[y][x] = 1;
    }

    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) {
        for (var dx = -4; dx <= 4; dx++) {
          var x = cx + dx, y = cy + dy;
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          var d = Math.max(Math.abs(dx), Math.abs(dy));
          set(x, y, d !== 2 && d <= 3, 1);
        }
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);

    /* timing patterns */
    for (var i2 = 8; i2 < size - 8; i2++) {
      set(i2, 6, i2 % 2 === 0, 1);
      set(6, i2, i2 % 2 === 0, 1);
    }

    /* alignment patterns, skipping the three finder corners */
    var centres = ALIGN[version];
    for (var a = 0; a < centres.length; a++) {
      for (var b2 = 0; b2 < centres.length; b2++) {
        var ax = centres[a], ay = centres[b2];
        if ((ax === 6 && ay === 6) || (ax === 6 && ay === size - 7) || (ax === size - 7 && ay === 6)) continue;
        for (var dy2 = -2; dy2 <= 2; dy2++) {
          for (var dx2 = -2; dx2 <= 2; dx2++) {
            set(ax + dx2, ay + dy2, Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1, 1);
          }
        }
      }
    }

    /* The dark module, and the space kept for the format information: row 8
       and column 8, both skipping index 6 — those two belong to the timing
       patterns and must be left exactly as the timing loop drew them. */
    set(8, size - 8, 1, 1);
    for (var f = 0; f < 9; f++) {
      if (f !== 6) { set(f, 8, 0, 1); set(8, f, 0, 1); }
    }
    for (var g = 0; g < 8; g++) {
      set(size - 1 - g, 8, 0, 1);
      set(8, size - 1 - g, 0, 1);
    }

    /* version information, version 7 and up */
    if (version >= 7) {
      var vb = bchVersion(version);
      for (var vi = 0; vi < 18; vi++) {
        var bit = (vb >>> vi) & 1;
        set(Math.floor(vi / 3), size - 11 + (vi % 3), bit, 1);
        set(size - 11 + (vi % 3), Math.floor(vi / 3), bit, 1);
      }
    }

    /* the data itself, two columns at a time, bottom right upwards */
    var bitIndex = 0, upward = true;
    for (var col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--;                     /* skip the timing column */
      for (var row = 0; row < size; row++) {
        var y2 = upward ? size - 1 - row : row;
        for (var side = 0; side < 2; side++) {
          var x2 = col - side;
          if (reserved[y2][x2]) continue;
          var dark = 0;
          if (bitIndex < out.length * 8) {
            dark = (out[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1;
          }
          bitIndex++;
          m[y2][x2] = dark;
        }
      }
      upward = !upward;
    }

    /* ----------------------------------------- masking and format info */
    var MASKS = [
      function (x, y) { return (x + y) % 2 === 0; },
      function (x, y) { return y % 2 === 0; },
      function (x) { return x % 3 === 0; },
      function (x, y) { return (x + y) % 3 === 0; },
      function (x, y) { return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0; },
      function (x, y) { return (x * y) % 2 + (x * y) % 3 === 0; },
      function (x, y) { return ((x * y) % 2 + (x * y) % 3) % 2 === 0; },
      function (x, y) { return ((x + y) % 2 + (x * y) % 3) % 2 === 0; }
    ];

    var best = null;
    for (var mask = 0; mask < 8; mask++) {
      var cand = m.map(function (rw) { return rw.slice(); });
      for (var yy = 0; yy < size; yy++) {
        for (var xx = 0; xx < size; xx++) {
          if (!reserved[yy][xx] && MASKS[mask](xx, yy)) cand[yy][xx] ^= 1;
        }
      }
      applyFormat(cand, mask);
      var score = penalty(cand, size);
      if (!best || score < best.score) best = { score: score, grid: cand };
    }
    return { size: size, grid: best.grid };

    /* Format info: EC level M is 0b00, then the mask, BCH protected. */
    function applyFormat(grid, mask) {
      var bitsVal = bchFormat((0 << 3) | mask);
      for (var i3 = 0; i3 < 15; i3++) {
        var bit2 = (bitsVal >>> i3) & 1;
        /* top left, running down the column then along the row */
        if (i3 < 6) grid[i3][8] = bit2;
        else if (i3 < 8) grid[i3 + 1][8] = bit2;
        else if (i3 === 8) grid[8][7] = bit2;
        else grid[8][14 - i3] = bit2;
        /* the copy split across the other two corners */
        if (i3 < 8) grid[8][size - 1 - i3] = bit2;
        else grid[size - 15 + i3][8] = bit2;
      }
      grid[size - 8][8] = 1;                    /* the dark module */
    }
  }

  /* The four penalty rules from the specification, used to choose a mask. */
  function penalty(g, size) {
    var score = 0, x, y, i, run, dark = 0;

    for (y = 0; y < size; y++) {                /* rule 1: runs in a row */
      run = 1;
      for (x = 1; x < size; x++) {
        if (g[y][x] === g[y][x - 1]) { run++; }
        else { if (run >= 5) score += run - 2; run = 1; }
      }
      if (run >= 5) score += run - 2;
    }
    for (x = 0; x < size; x++) {                /* and in a column */
      run = 1;
      for (y = 1; y < size; y++) {
        if (g[y][x] === g[y - 1][x]) { run++; }
        else { if (run >= 5) score += run - 2; run = 1; }
      }
      if (run >= 5) score += run - 2;
    }
    for (y = 0; y < size - 1; y++) {            /* rule 2: 2x2 blocks */
      for (x = 0; x < size - 1; x++) {
        var v = g[y][x];
        if (v === g[y][x + 1] && v === g[y + 1][x] && v === g[y + 1][x + 1]) score += 3;
      }
    }
    var A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];  /* rule 3: finder-like runs */
    var B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    for (y = 0; y < size; y++) {
      for (x = 0; x + 11 <= size; x++) {
        var okA = true, okB = true;
        for (i = 0; i < 11; i++) {
          if (g[y][x + i] !== A[i]) okA = false;
          if (g[y][x + i] !== B[i]) okB = false;
        }
        if (okA || okB) score += 40;
      }
    }
    for (x = 0; x < size; x++) {
      for (y = 0; y + 11 <= size; y++) {
        var okA2 = true, okB2 = true;
        for (i = 0; i < 11; i++) {
          if (g[y + i][x] !== A[i]) okA2 = false;
          if (g[y + i][x] !== B[i]) okB2 = false;
        }
        if (okA2 || okB2) score += 40;
      }
    }
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (g[y][x]) dark++;
    var pct = dark * 100 / (size * size);       /* rule 4: light/dark balance */
    score += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return score;
  }

  function utf8(str) {
    var out = [], s = unescape(encodeURIComponent(String(str)));
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xff);
    return out;
  }

  /* --------------------------------------------------------------- api */
  /* One <svg> string. `size` is the drawn width in CSS pixels; `quiet` is
     the white margin in modules, which scanners need — four is the spec. */
  function svg(text, opts) {
    opts = opts || {};
    var q = opts.quiet === undefined ? 4 : opts.quiet;
    var dark = opts.dark || "#101c30";
    var light = opts.light || "#ffffff";
    var r = build(text);
    var total = r.size + q * 2;

    /* One path for every dark module keeps the markup small enough to sit
       inside an email or a data: URI. */
    var d = "";
    for (var y = 0; y < r.size; y++) {
      for (var x = 0; x < r.size; x++) {
        if (r.grid[y][x]) d += "M" + (x + q) + " " + (y + q) + "h1v1h-1z";
      }
    }
    var px = opts.size ? ' width="' + opts.size + '" height="' + opts.size + '"' : "";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + " " + total + '"' +
      px + ' shape-rendering="crispEdges" role="img" aria-label="' +
      String(opts.label || "QR code").replace(/[<>&"]/g, "") + '">' +
      '<rect width="' + total + '" height="' + total + '" fill="' + light + '"/>' +
      '<path d="' + d + '" fill="' + dark + '"/></svg>';
  }

  function dataUri(text, opts) {
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg(text, opts));
  }

  w.HFQR = { svg: svg, dataUri: dataUri };
})(window);
