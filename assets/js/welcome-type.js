/* ============================================================
   Billy Digitals — hero typewriter welcome
   Types "Welcome to Billy Digitals" then "Where you grow" letter
   by letter; each letter flips up in 3D as it lands, with a
   blinking caret. Reduced-motion shows the text instantly.
   ============================================================ */
(function () {
  "use strict";
  var l1 = document.getElementById("hwTop");
  var l2 = document.getElementById("hwBot");
  if (!l1 || !l2) return;

  var T1 = "Welcome to Billy Digitals";
  var T2 = "Where you grow";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduce) { l1.textContent = T1; l2.textContent = T2; return; }

  var caret = document.createElement("span");
  caret.className = "hw-cursor";
  caret.setAttribute("aria-hidden", "true");
  l1.appendChild(caret);

  function typeInto(el, text, done) {
    var i = 0;
    (function step() {
      if (i >= text.length) { done && done(); return; }
      var ch = text.charAt(i++);
      var s = document.createElement("span");
      s.className = "ch";
      s.textContent = ch === " " ? " " : ch;
      el.insertBefore(s, caret);
      requestAnimationFrame(function () { s.classList.add("in"); });
      setTimeout(step, ch === " " ? 45 : 58 + Math.random() * 46);
    })();
  }

  setTimeout(function () {
    typeInto(l1, T1, function () {
      setTimeout(function () {
        l2.appendChild(caret);            // caret drops to line two
        typeInto(l2, T2, function () { caret.classList.add("rest"); });
      }, 340);
    });
  }, 380);
})();
