/* ═══════════════════════════════════════════════════════════════════════════
   MEGACITY · IMAGE INTAKE  (standalone)

   Verbatim copy of the billy360 image intake pipeline — `intakeImage()` and
   its "IMAGE INTAKE" banner from /billy360/app.js (lines 438–539 at the time
   of copying). The function body is unchanged; it depends on nothing outside
   itself (FileReader, Image, canvas only), so no other billy360 helpers were
   needed and no billy360 UI (toast/engine) is referenced.

   Exposed as window.MCIntake:
     image(file, opts, cb)   the original contract, unchanged: cb is called
                             exactly once with either the result object
                             {src,w,h,outW,outH,isPano,name,luma,sharp,hash,
                              savedKB,notes[]} or {error: "message"}.
     imageAsync(file, opts)  Promise wrapper — resolves with the result,
                             rejects with Error(result.error).
     isImageFile(file)       the same MIME / extension test intakeImage runs.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  "use strict";

  /* ═══════════════════════════════════════════════════════════════════════
     IS THIS A 360?

     It used to be decided by measuring the sides: within a hair of 2:1 and at
     least 1024 across. That is the shape a 360 usually has, and it is not the
     same question. A panorama cropped at the top and bottom — which is what a
     phone and most one-shot cameras produce, because they cannot see straight
     up — is not 2:1 and was silently filed as an ordinary photograph, with no
     way to say otherwise.

     Every 360 camera writes the answer into the file. The XMP packet carries
     Google's GPano namespace, which states the projection outright and, when
     the picture is a crop, gives the size of the full sphere and where this
     piece sits in it. That is the authoritative signal; the shape is the
     fallback for a file whose metadata has been stripped.
     ═══════════════════════════════════════════════════════════════════════ */

  /* the XMP packet is plain ASCII inside the file, so it can be found without
     parsing the container: JPEG, PNG and WebP all carry it the same way. */
  function findXmp(bytes) {
    var open = "<x:xmpmeta", close = "</x:xmpmeta>";
    var text = "";
    for (var i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]);
    var a = text.indexOf(open);
    if (a < 0) { a = text.indexOf("<rdf:RDF"); if (a < 0) return null; }
    var b = text.indexOf(close, a);
    return b < 0 ? text.slice(a, a + 20000) : text.slice(a, b + close.length);
  }

  /* GPano fields appear as attributes on one element or as child elements,
     and both forms are in the wild from the same manufacturers. */
  function field(xmp, name) {
    var m = new RegExp("GPano:" + name + '\\s*=\\s*"([^"]*)"').exec(xmp);
    if (m) return m[1];
    m = new RegExp("<GPano:" + name + "[^>]*>([^<]*)</GPano:" + name + ">").exec(xmp);
    return m ? m[1].trim() : null;
  }
  function num(v) { var n = parseInt(v, 10); return isFinite(n) && n > 0 ? n : null; }

  /* Pure, so it can be tested without a browser or a camera. */
  function gpanoFromBytes(bytes) {
    if (!bytes || !bytes.length) return null;
    var xmp = findXmp(bytes);
    if (!xmp || xmp.indexOf("GPano") < 0) return null;
    var proj = (field(xmp, "ProjectionType") || "").toLowerCase();
    var use = (field(xmp, "UsePanoramaViewer") || "").toLowerCase();
    var fullW = num(field(xmp, "FullPanoWidthPixels")), fullH = num(field(xmp, "FullPanoHeightPixels"));
    var cw = num(field(xmp, "CroppedAreaImageWidthPixels")), ch = num(field(xmp, "CroppedAreaImageHeightPixels"));
    var cx = parseInt(field(xmp, "CroppedAreaLeftPixels") || "0", 10) || 0;
    var cy = parseInt(field(xmp, "CroppedAreaTopPixels") || "0", 10) || 0;
    /* equirectangular is the only projection this viewer draws. A file that
       says "cylindrical" is a flat panorama and must NOT go on a sphere. */
    var equirect = proj === "equirectangular" || (!proj && use === "true" && !!fullW);
    if (!equirect) return proj ? { equirect: false, projection: proj } : null;
    var cropped = !!(fullW && fullH && cw && ch && (cw !== fullW || ch !== fullH || cx || cy));
    return { equirect: true, projection: "equirectangular",
      fullW: fullW, fullH: fullH, cropW: cw, cropH: ch, cropX: cx, cropY: cy, cropped: cropped };
  }

  /* the first part of the file is enough: XMP sits near the front in every
     format that carries it, and reading 512KB of a 30MB picture is free */
  function readGPano(file) {
    try {
      var head = file.slice ? file.slice(0, 512 * 1024) : file;
      if (head.arrayBuffer) return head.arrayBuffer().then(function (b) { return gpanoFromBytes(new Uint8Array(b)); }, function () { return null; });
      return new Promise(function (resolve) {
        var fr = new FileReader();
        fr.onerror = function () { resolve(null); };
        fr.onload = function () { try { resolve(gpanoFromBytes(new Uint8Array(fr.result))); } catch (e) { resolve(null); } };
        fr.readAsArrayBuffer(head);
      });
    } catch (e) { return Promise.resolve(null); }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     IMAGE INTAKE
     Every image that enters the product goes through here: decoded, measured,
     downscaled and recompressed on the visitor's own machine, and checked for
     what it actually is. A 2:1 frame at panorama resolution is offered as a
     360° — never forced. All of it is real measurement; nothing is guessed.
     ═══════════════════════════════════════════════════════════════════════ */
  function intakeImage(file, opts, cb) {
    opts = opts || {};
    var maxEdge = opts.maxEdge || 1920, quality = opts.quality || 0.82;
    if (!/^image\//.test(file.type || "") && !/\.(jpe?g|png|webp|avif)$/i.test(file.name || "")) {
      cb({ error: "\u201C" + (file.name || "That file") + "\u201D isn't an image. JPEG, PNG or WebP." });
      return;
    }
    var gp = null;
    var fr = new FileReader();
    fr.onerror = function () { cb({ error: "That file couldn't be read — it may be corrupted." }); };
    fr.onload = function () {
      /* ask the file what it is before measuring it */
      readGPano(file).then(function (g) { gp = g; go(); }, function () { go(); });
      function go() {
      var im = new Image();
      im.onerror = function () { cb({ error: "\u201C" + (file.name || "That image") + "\u201D couldn't be decoded — it may be corrupted." }); };
      im.onload = function () {
        /* decode off the main thread where the browser can — drawing an
           undecoded image forces a synchronous decode right here */
        if (im.decode) im.decode().then(process, process);
        else process();
      };
      function process() {
        var w = im.width, h = im.height, ratio = w / h;
        /* The shape, loosened: a 2:1 frame is the usual export, but a file
           that has been cropped or re-encoded drifts off it, and the old
           window of 1.9-2.1 rejected pictures that plainly are 360s. */
        var shape = ratio > 1.8 && ratio < 2.25 && w >= 1024;
        /* Told > measured > guessed. "Told" is either the camera, through
           GPano, or the person uploading, through the 360 switch. And a file
           that names a projection this viewer cannot draw — cylindrical, say,
           which is a flat panorama — is NOT a 360 however square it looks. */
        var told = opts.forcePano === true;
        var isPano = told ? true
          : (gp && gp.equirect === true) ? true
          : (gp && gp.equirect === false) ? false
          : shape;
        var panoSource = !isPano ? null : told ? "told" : (gp && gp.equirect) ? "metadata" : "shape";

        var edge = isPano ? Math.max(opts.panoEdge || 4096, maxEdge) : maxEdge;
        var ow, oh, padded = false;
        var c = document.createElement("canvas");
        try {
          /* A cropped panorama is a slice of the sphere, not the whole of it.
             Drawn as if it were the whole, the room is stretched and the
             horizon sits in the wrong place. GPano says how big the sphere is
             and where this slice belongs in it, so it is put back. */
          if (isPano && gp && gp.cropped && gp.fullW && gp.fullH && gp.cropW && gp.cropH) {
            var ps = Math.min(1, edge / gp.fullW);
            ow = Math.round(gp.fullW * ps); oh = Math.round(gp.fullH * ps);
            c.width = ow; c.height = oh;
            var pctx = c.getContext("2d");
            pctx.fillStyle = "#000"; pctx.fillRect(0, 0, ow, oh);
            pctx.drawImage(im, Math.round(gp.cropX * ps), Math.round(gp.cropY * ps),
              Math.max(1, Math.round(gp.cropW * ps)), Math.max(1, Math.round(gp.cropH * ps)));
            padded = true;
          } else {
            var scale = Math.min(1, edge / Math.max(w, h));
            ow = Math.round(w * scale); oh = Math.round(h * scale);
            c.width = ow; c.height = oh;
            c.getContext("2d").drawImage(im, 0, 0, ow, oh);
          }
        } catch (e) { cb({ error: "That image couldn't be processed." }); return; }
        /* the JPEG encode is the expensive part — toBlob runs it off the
           main thread, so a batch of uploads no longer freezes the page.
           (Profiled: toDataURL was seconds of main-thread time per batch.) */
        if (c.toBlob) {
          c.toBlob(function (blob) {
            if (!blob) { finish(null); return; }
            var fr2 = new FileReader();
            fr2.onerror = function () { finish(null); };
            fr2.onload = function () { finish(fr2.result); };
            fr2.readAsDataURL(blob);
          }, "image/jpeg", quality);
        } else finish(fallbackEncode());
        function fallbackEncode() {
          try { return c.toDataURL("image/jpeg", quality); } catch (e) { return null; }
        }
        function finish(src) {
        if (src == null) src = fallbackEncode();
        if (src == null) { cb({ error: "That image couldn't be processed." }); return; }
        /* honest, on-device media intelligence — brightness, sharpness and a
           small perceptual hash for duplicate detection. Measured from the
           pixels, never guessed; only ever a warning, never a block. */
        var luma = 0, sharp = 0, hash = "";
        try {
          var an = document.createElement("canvas");
          an.width = 64; an.height = 32;
          var actx = an.getContext("2d");
          actx.drawImage(im, 0, 0, 64, 32);
          var apx = actx.getImageData(0, 0, 64, 32).data;
          var lumArr = new Float32Array(2048), sumL = 0, pi;
          for (pi = 0; pi < 2048; pi++) {
            var L = 0.299 * apx[pi * 4] + 0.587 * apx[pi * 4 + 1] + 0.114 * apx[pi * 4 + 2];
            lumArr[pi] = L; sumL += L;
          }
          luma = sumL / 2048;
          var lsum = 0, lsq = 0, lapN = 0, ax, ay, av;
          for (ay = 1; ay < 31; ay++) for (ax = 1; ax < 63; ax++) {
            av = 4 * lumArr[ay * 64 + ax] - lumArr[ay * 64 + ax - 1] - lumArr[ay * 64 + ax + 1] -
              lumArr[(ay - 1) * 64 + ax] - lumArr[(ay + 1) * 64 + ax];
            lsum += av; lsq += av * av; lapN++;
          }
          var lmn = lsum / lapN;
          sharp = lsq / lapN - lmn * lmn;
          for (var hy = 0; hy < 8; hy++) for (var hx = 0; hx < 8; hx++) {
            var acc = 0;
            for (var yy = 0; yy < 4; yy++) for (var xx = 0; xx < 8; xx++) acc += lumArr[(hy * 4 + yy) * 64 + hx * 8 + xx];
            hash += (acc / 32 > luma ? "1" : "0");
          }
        } catch (e2) { /* analysis is a nicety — never a blocker */ }

        var notes = [];
        if (padded) notes.push("This 360\u00B0 does not cover the whole sphere — the missing part shows as black above and below, which is how the camera took it.");
        if (isPano && panoSource === "metadata" && !shape) notes.push("Filed as a 360\u00B0 because the camera said so, not because of its shape.");
        if (!isPano && gp && gp.equirect === false && gp.projection) notes.push("This is a " + gp.projection + " panorama, not a 360\u00B0 — it is kept as an ordinary photograph.");
        if (isPano && w < 4096) notes.push("On the low side for a 360\u00B0 — 4096\u00D72048 or better looks sharpest.");
        if (!isPano && w < 1200 && h < 1200) notes.push("Low resolution — it will look soft on large screens.");
        if (luma && luma < 58) notes.push("“" + (file.name || "This image") + "” is quite dark — lights on and re-shoot if you can.");
        if (sharp && sharp < 8 && luma > 30) notes.push("“" + (file.name || "This image") + "” looks soft or blurred — worth checking the focus.");
        cb({
          src: src, w: w, h: h, outW: ow, outH: oh,
          isPano: isPano, panoSource: panoSource, panoPadded: padded, name: file.name || "",
          luma: Math.round(luma), sharp: Math.round(sharp), hash: hash,
          savedKB: Math.max(0, Math.round((file.size - src.length * 0.75) / 1024)),
          notes: notes
        });
        }
      }
      im.src = fr.result;
      }
    };
    fr.readAsDataURL(file);
  }

  /* the same accept test intakeImage performs on entry */
  function isImageFile(file) {
    return /^image\//.test((file && file.type) || "") || /\.(jpe?g|png|webp|avif)$/i.test((file && file.name) || "");
  }

  function imageAsync(file, opts) {
    return new Promise(function (resolve, reject) {
      intakeImage(file, opts, function (r) {
        if (!r || r.error) reject(new Error((r && r.error) || "That image couldn't be processed."));
        else resolve(r);
      });
    });
  }

  root.MCIntake = { image: intakeImage, imageAsync: imageAsync, isImageFile: isImageFile,
    readGPano: readGPano, gpanoFromBytes: gpanoFromBytes };
})(typeof window !== "undefined" ? window : this);
