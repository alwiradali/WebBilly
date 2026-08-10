/* ═══════════════════════════════════════════════════════════════════════════
   RED360 · QR
   A complete QR encoder — byte mode, error-correction level M, versions 1–10
   (213 bytes of URL, far more than any tour link). No dependencies; output is
   a plain canvas. Ported from the ISO 18004 procedure: Reed–Solomon over
   GF(256), all eight masks scored with the standard penalties.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* GF(256), polynomial 0x11D */
  var EXP = new Array(512), LOG = new Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1; if (x & 0x100) x ^= 0x11D;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function gmul(a, b) { return (a && b) ? EXP[LOG[a] + LOG[b]] : 0; }

  function rsGenerator(n) {
    var g = [1];
    for (var i = 0; i < n; i++) {
      var next = new Array(g.length + 1).fill(0);
      for (var j = 0; j < g.length; j++) {
        next[j] ^= gmul(g[j], EXP[i]);
        next[j + 1] ^= g[j];
      }
      g = next;
    }
    return g.reverse();      // highest degree first
  }
  function rsRemainder(data, gen) {
    var res = data.concat(new Array(gen.length - 1).fill(0));
    for (var i = 0; i < data.length; i++) {
      var f = res[i];
      if (!f) continue;
      for (var j = 0; j < gen.length; j++) res[i + j] ^= gmul(gen[j], f);
    }
    return res.slice(data.length);
  }

  /* level M, versions 1–10:
     [total codewords, ec per block, g1 blocks, g1 data, g2 blocks, g2 data] */
  var SPEC = {
    1: [26, 10, 1, 16, 0, 0], 2: [44, 16, 1, 28, 0, 0], 3: [70, 26, 1, 44, 0, 0],
    4: [100, 18, 2, 32, 0, 0], 5: [134, 24, 2, 43, 0, 0], 6: [172, 16, 4, 27, 0, 0],
    7: [196, 18, 4, 31, 0, 0], 8: [242, 22, 2, 38, 2, 39], 9: [292, 22, 3, 36, 2, 37],
    10: [346, 26, 4, 43, 1, 44]
  };
  var ALIGN = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
  };

  function utf8(str) {
    var out = [], enc = encodeURIComponent(str);
    for (var i = 0; i < enc.length; i++) {
      var c = enc.charAt(i);
      if (c === "%") { out.push(parseInt(enc.substr(i + 1, 2), 16)); i += 2; }
      else out.push(enc.charCodeAt(i));
    }
    return out;
  }

  function encode(text) {
    var bytes = utf8(text);

    var version = 0;
    for (var v = 1; v <= 10; v++) {
      var sp = SPEC[v];
      var dataCW = sp[0] - sp[1] * (sp[2] + sp[4]);
      var countBits = v <= 9 ? 8 : 16;
      if ((4 + countBits + bytes.length * 8) <= dataCW * 8) { version = v; break; }
    }
    if (!version) return null;

    var spec = SPEC[version];
    var dataCW2 = spec[0] - spec[1] * (spec[2] + spec[4]);
    var cb = version <= 9 ? 8 : 16;

    /* bitstream: mode 0100 · count · bytes · terminator · pads */
    var bits = [];
    function push(val, n) { for (var i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); }
    push(4, 4);
    push(bytes.length, cb);
    bytes.forEach(function (b) { push(b, 8); });
    var cap = dataCW2 * 8;
    push(0, Math.min(4, cap - bits.length));
    while (bits.length % 8) bits.push(0);
    var cw = [];
    for (var i2 = 0; i2 < bits.length; i2 += 8) {
      var b2 = 0;
      for (var k = 0; k < 8; k++) b2 = (b2 << 1) | bits[i2 + k];
      cw.push(b2);
    }
    var pad = [0xEC, 0x11], pi = 0;
    while (cw.length < dataCW2) cw.push(pad[(pi++) % 2]);

    /* split into blocks, compute EC, interleave */
    var blocks = [], pos = 0, g;
    for (g = 0; g < spec[2]; g++) { blocks.push(cw.slice(pos, pos + spec[3])); pos += spec[3]; }
    for (g = 0; g < spec[4]; g++) { blocks.push(cw.slice(pos, pos + spec[5])); pos += spec[5]; }
    var gen = rsGenerator(spec[1]);
    var ecs = blocks.map(function (b) { return rsRemainder(b, gen); });
    var out = [], maxLen = Math.max.apply(null, blocks.map(function (b) { return b.length; }));
    for (var c = 0; c < maxLen; c++) blocks.forEach(function (b) { if (c < b.length) out.push(b[c]); });
    for (var e = 0; e < spec[1]; e++) ecs.forEach(function (b) { out.push(b[e]); });

    return { version: version, codewords: out };
  }

  function buildMatrix(version, codewords, mask) {
    var size = version * 4 + 17;
    var M = [], F = [];         // modules · is-function-module
    for (var y = 0; y < size; y++) { M.push(new Array(size).fill(0)); F.push(new Array(size).fill(false)); }
    function set(x, y2, v2) { M[y2][x] = v2 ? 1 : 0; F[y2][x] = true; }

    /* finders + separators */
    [[0, 0], [size - 7, 0], [0, size - 7]].forEach(function (p) {
      for (var dy = -1; dy <= 7; dy++) for (var dx = -1; dx <= 7; dx++) {
        var x = p[0] + dx, y2 = p[1] + dy;
        if (x < 0 || y2 < 0 || x >= size || y2 >= size) continue;
        var on = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6 &&
          (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
        set(x, y2, on);
      }
    });
    /* timing */
    for (var t = 8; t < size - 8; t++) { set(t, 6, t % 2 === 0); set(6, t, t % 2 === 0); }
    /* alignment */
    var ap = ALIGN[version];
    for (var ai = 0; ai < ap.length; ai++) for (var aj = 0; aj < ap.length; aj++) {
      var cx = ap[ai], cy = ap[aj];
      /* only the three finder corners are skipped — patterns that straddle a
         timing line are part of the symbol and must be drawn */
      var last = ap.length - 1;
      if ((ai === 0 && aj === 0) || (ai === 0 && aj === last) || (ai === last && aj === 0)) continue;
      for (var dy2 = -2; dy2 <= 2; dy2++) for (var dx2 = -2; dx2 <= 2; dx2++) {
        set(cx + dx2, cy + dy2, Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1);
      }
    }
    /* reserve format areas */
    for (var fi = 0; fi <= 8; fi++) {
      if (fi !== 6) { set(8, fi, 0); set(fi, 8, 0); }
      if (fi < 8) { set(size - 1 - fi, 8, 0); set(8, size - 1 - fi, 0); }
    }
    set(8, size - 8, 1);                     // dark module
    /* version info, v ≥ 7 */
    if (version >= 7) {
      var rem = version;
      for (var vb = 0; vb < 12; vb++) rem = (rem << 1) ^ ((rem >> 11) * 0x1F25);
      var vbits = (version << 12) | rem;
      for (var vi = 0; vi < 18; vi++) {
        var bit = (vbits >> vi) & 1;
        var a2 = size - 11 + (vi % 3), b3 = Math.floor(vi / 3);
        set(a2, b3, bit); set(b3, a2, bit);
      }
    }

    /* data, zig-zag from the bottom right, skipping the timing column */
    var i3 = 0, total = codewords.length * 8;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var j2 = 0; j2 < 2; j2++) {
          var x2 = right - j2;
          var upward = ((right + 1) & 2) === 0;
          var y3 = upward ? size - 1 - vert : vert;
          if (F[y3][x2] || i3 >= total) continue;
          M[y3][x2] = (codewords[i3 >> 3] >> (7 - (i3 & 7))) & 1;
          i3++;
        }
      }
    }

    /* mask (non-function modules only) */
    function masked(x, y4) {
      switch (mask) {
        case 0: return (x + y4) % 2 === 0;
        case 1: return y4 % 2 === 0;
        case 2: return x % 3 === 0;
        case 3: return (x + y4) % 3 === 0;
        case 4: return (Math.floor(x / 3) + Math.floor(y4 / 2)) % 2 === 0;
        case 5: return x * y4 % 2 + x * y4 % 3 === 0;
        case 6: return (x * y4 % 2 + x * y4 % 3) % 2 === 0;
        default: return ((x + y4) % 2 + x * y4 % 3) % 2 === 0;
      }
    }
    for (var my = 0; my < size; my++) for (var mx = 0; mx < size; mx++) {
      if (!F[my][mx] && masked(mx, my)) M[my][mx] ^= 1;
    }

    /* format info: level M (00) · mask, BCH(15,5), masked with 0x5412 */
    var fdata = (0 << 3) | mask;             // M = 00
    var frem = fdata;
    for (var fb = 0; fb < 10; fb++) frem = (frem << 1) ^ ((frem >> 9) * 0x537);
    var fbits = ((fdata << 10) | frem) ^ 0x5412;
    function fbit(i4) { return (fbits >> i4) & 1; }
    for (var q = 0; q <= 5; q++) set(8, q, fbit(q));
    set(8, 7, fbit(6)); set(8, 8, fbit(7)); set(7, 8, fbit(8));
    for (var q2 = 9; q2 < 15; q2++) set(14 - q2, 8, fbit(q2));
    for (var q3 = 0; q3 < 8; q3++) set(size - 1 - q3, 8, fbit(q3));
    for (var q4 = 8; q4 < 15; q4++) set(8, size - 15 + q4, fbit(q4));
    set(8, size - 8, 1);

    return M;
  }

  /* the four standard penalties — lowest total wins */
  function penalty(M) {
    var size = M.length, score = 0, x, y, run, prev, k;
    for (y = 0; y < size; y++) {
      run = 1; prev = M[y][0];
      for (x = 1; x < size; x++) {
        if (M[y][x] === prev) { run++; }
        else { if (run >= 5) score += 3 + run - 5; run = 1; prev = M[y][x]; }
      }
      if (run >= 5) score += 3 + run - 5;
    }
    for (x = 0; x < size; x++) {
      run = 1; prev = M[0][x];
      for (y = 1; y < size; y++) {
        if (M[y][x] === prev) { run++; }
        else { if (run >= 5) score += 3 + run - 5; run = 1; prev = M[y][x]; }
      }
      if (run >= 5) score += 3 + run - 5;
    }
    for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) {
      var v2 = M[y][x];
      if (v2 === M[y][x + 1] && v2 === M[y + 1][x] && v2 === M[y + 1][x + 1]) score += 3;
    }
    var pat1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], pat2 = pat1.slice().reverse();
    function findPat(get, len) {
      for (var s2 = 0; s2 + 11 <= len; s2++) {
        var m1 = true, m2 = true;
        for (k = 0; k < 11; k++) {
          if (get(s2 + k) !== pat1[k]) m1 = false;
          if (get(s2 + k) !== pat2[k]) m2 = false;
        }
        if (m1 || m2) score += 40;
      }
    }
    for (y = 0; y < size; y++) (function (yy) { findPat(function (i) { return M[yy][i]; }, size); })(y);
    for (x = 0; x < size; x++) (function (xx) { findPat(function (i) { return M[i][xx]; }, size); })(x);
    var dark = 0;
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) dark += M[y][x];
    var pct = dark * 100 / (size * size);
    score += 10 * Math.floor(Math.abs(pct - 50) / 5);
    return score;
  }

  function matrix(text) {
    var enc = encode(text);
    if (!enc) return null;
    var best = null, bestScore = Infinity;
    for (var m = 0; m < 8; m++) {
      var M = buildMatrix(enc.version, enc.codewords, m);
      var sc = penalty(M);
      if (sc < bestScore) { bestScore = sc; best = M; }
    }
    return best;
  }

  function canvas(text, scale, quiet) {
    var M = matrix(text);
    if (!M) return null;
    scale = scale || 6; quiet = quiet == null ? 4 : quiet;
    var size = M.length, px = (size + quiet * 2) * scale;
    var c = document.createElement("canvas");
    c.width = c.height = px;
    var ctx = c.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = "#000000";
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      if (M[y][x]) ctx.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
    }
    return c;
  }

  window.RED360QR = { matrix: matrix, canvas: canvas };
})();
