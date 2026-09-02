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
    var fr = new FileReader();
    fr.onerror = function () { cb({ error: "That file couldn't be read — it may be corrupted." }); };
    fr.onload = function () {
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
        var isPano = ratio > 1.9 && ratio < 2.1 && w >= 1024;
        var edge = isPano ? Math.max(opts.panoEdge || 4096, maxEdge) : maxEdge;
        var scale = Math.min(1, edge / Math.max(w, h));
        var ow = Math.round(w * scale), oh = Math.round(h * scale);
        var c = document.createElement("canvas");
        c.width = ow; c.height = oh;
        try { c.getContext("2d").drawImage(im, 0, 0, ow, oh); }
        catch (e) { cb({ error: "That image couldn't be processed." }); return; }
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
        if (isPano && w < 4096) notes.push("On the low side for a 360° — 4096\u00D72048 or better looks sharpest.");
        if (!isPano && w < 1200 && h < 1200) notes.push("Low resolution — it will look soft on large screens.");
        if (luma && luma < 58) notes.push("“" + (file.name || "This image") + "” is quite dark — lights on and re-shoot if you can.");
        if (sharp && sharp < 8 && luma > 30) notes.push("“" + (file.name || "This image") + "” looks soft or blurred — worth checking the focus.");
        cb({
          src: src, w: w, h: h, outW: ow, outH: oh,
          isPano: isPano, name: file.name || "",
          luma: Math.round(luma), sharp: Math.round(sharp), hash: hash,
          savedKB: Math.max(0, Math.round((file.size - src.length * 0.75) / 1024)),
          notes: notes
        });
        }
      }
      im.src = fr.result;
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

  root.MCIntake = { image: intakeImage, imageAsync: imageAsync, isImageFile: isImageFile };
})(typeof window !== "undefined" ? window : this);
