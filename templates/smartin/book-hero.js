/* SMARTin SCIENCE — the hero, as a book
   ==================================================================
   Same page-turn model as the standalone book, with one important
   difference: this one lives INSIDE a page that has to keep scrolling
   normally afterwards.

   THE MODEL
   A book is a stack of leaves. Leaf i carries one page on its front
   and one on its back, and a spread is the back of one leaf beside
   the front of the next. The section's own scroll progress maps to a
   single position `p` measured in leaves:

       p = 0   closed, cover up
       p = 1   cover turned, first spread open
       p = 2   second spread open — and it stays there

   Leaf i's turn is clamp(p - i, 0, 1), so every leaf runs the same
   maths and the whole hero is one number. It stops at N-1 rather than
   N: the last spread carries the buttons, and a hero that shut itself
   just as the reader arrived at the call to action would be perverse.

   NO SCROLL-JACKING
   The standalone book snaps the window to the nearest leaf. Doing that
   here would fight anyone trying to scroll past the hero to the rest
   of the site. Instead the progress curve is shaped so each leaf rests
   flat across the first and last fifth of its range and turns through
   the middle — you get the same "never frozen on edge" result without
   ever taking the scroll away from the reader.

   The section ships as a plain stacked hero. This file adds `.bh-on`,
   and only then does any of the 3D in book-hero.css apply, so no-JS
   and reduced-motion readers keep an ordinary, complete hero.        */

(function () {
  'use strict';

  var sec = document.getElementById('bookhero');
  if (!sec) return;

  var book = sec.querySelector('.bh-book');
  if (!book) return;

  /* The markup ships as a flat list of pages in reading order — which is
     what the no-JS fallback wants anyway. The leaves are assembled here,
     because how many pages a leaf carries depends on the screen. */
  var faces = [].slice.call(book.querySelectorAll('.bh-face'));
  if (faces.length < 3) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var leaves = [], N = 0, TURNS = 0;
  var built = null;               // which mode the current leaves were built for

  /* A sheet of paper has two sides, so on a spread each leaf carries two
     pages. One page at a time, it carries one — otherwise every verso is
     face-down at every resting position and half the book is unreadable
     on a phone, which is exactly what was happening. */
  function build(one) {
    if (built === one) return;
    built = one;

    faces.forEach(function (f) { f.classList.remove('bh-front', 'bh-back'); });
    while (book.firstChild) book.removeChild(book.firstChild);

    var per = one ? 1 : 2;
    for (var i = 0; i < faces.length; i += per) {
      var leaf = document.createElement('div');
      leaf.className = 'bh-leaf';
      faces[i].classList.add('bh-front');
      leaf.appendChild(faces[i]);
      if (!one && faces[i + 1]) {
        faces[i + 1].classList.add('bh-back');
        leaf.appendChild(faces[i + 1]);
      }
      book.appendChild(leaf);
    }

    leaves = [].slice.call(book.querySelectorAll('.bh-leaf'));
    N = leaves.length;
    TURNS = N - 1;                // the last page stays open, never shuts
    leaves.forEach(function (l) { l._t = null; });
    render._s = null;
  }
  var LEAD = 0.24;                // a beat on the closed cover before it lifts
  var TAIL = 0.45;                // and a beat on the last spread before release
  var REST = 0.19;                // share of each leaf's range spent lying flat

  sec.classList.add('bh-on');

  /* ---- geometry --------------------------------------------------
     ONE source of truth. The stylesheet used to decide single-page vs
     spread with its own `@media (max-width:900px)` while this file
     decided it again from window.innerWidth. On a phone whose layout
     viewport reports wider than it really is, both took the desktop
     path: a two-page book wider than the screen, shifted half a page
     left, so what you saw was one blank half of a page. Now JS
     measures, JS decides, and CSS only reacts to the class it sets.

     Everything is in measured pixels rather than vh, because iOS
     counts the area behind the address bar in `100vh` — sizing the
     stage that way centres the book in a box taller than the screen
     and posts the bottom third of it off the display.
     ------------------------------------------------------------------ */

  function viewport() {
    var vv = window.visualViewport;
    return {
      w: Math.round((vv && vv.width) || window.innerWidth || document.documentElement.clientWidth),
      h: Math.round((vv && vv.height) || window.innerHeight || document.documentElement.clientHeight)
    };
  }

  var single = false;

  function measure() {
    var v = viewport();
    var nav = document.querySelector('.nav');
    var navH = nav ? Math.round(nav.getBoundingClientRect().height) : 92;
    var boxW = v.w;
    var boxH = Math.max(320, v.h - navH);

    /* A spread only earns its place when each page is still wide enough
       to hold a line of type. Below that it is one page at a time —
       decided from the space actually available, not from a breakpoint. */
    single = boxW < 900 || boxW / 2 < 330;

    var ratio = single ? 1.52 : 1.17;
    var pw = single ? boxW * 0.9 : boxW * 0.44;
    if (pw > boxH / ratio) pw = boxH / ratio;          // must fit vertically
    if (!single && pw * 2 > boxW - 40) pw = (boxW - 40) / 2;
    if (single && pw > 470) pw = 470;
    pw = Math.max(200, Math.floor(pw));
    var ph = Math.floor(pw * ratio);

    build(single);
    sec.classList.toggle('bh-single', single);
    sec.style.setProperty('--bh-pw', pw + 'px');
    sec.style.setProperty('--bh-ph', ph + 'px');
    sec.style.setProperty('--bh-u', (pw / (single ? 82 : 100)) + 'px');
    sec.style.setProperty('--bh-vh', v.h + 'px');
    sec.style.setProperty('--bh-nav', navH + 'px');

    /* One screen for the pinned stage, plus the travel the turns need.
       A turn costs less on a phone: the same gesture covers less of the
       page, and a hero that takes four thumb-flicks to get past is a
       hero people leave. */
    /* One page at a time means more turns, so each one costs less
       scroll — otherwise the hero takes half a dozen thumb-flicks to
       get past, and a hero like that is one people leave. */
    STEP = single ? v.h * 0.62 : v.h;
    sec.style.height = Math.round(v.h + (TURNS + LEAD + TAIL) * STEP) + 'px';
  }

  /* ---- scroll → p ------------------------------------------------ */

  /* Within one leaf: flat for the first and last REST of the range,
     turning through the middle. This is what replaces snapping. */
  function shape(x) {
    var t = (x - REST) / (1 - REST * 2);
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return t * t * (3 - 2 * t);
  }

  var target = 0, current = 0, STEP = 100;

  function read() {
    var box = sec.getBoundingClientRect();
    var travel = sec.offsetHeight - window.innerHeight;
    if (travel < 1) { target = 0; return; }

    var prog = -box.top / travel;                 // 0 → 1 across the section
    if (prog < 0) prog = 0;
    if (prog > 1) prog = 1;

    /* The lead-in holds the closed cover for a moment; the tail holds
       the last spread open, so the buttons are readable for a good
       half-screen before the section lets the page go. */
    var raw = prog * (TURNS + LEAD + TAIL) - LEAD;
    if (raw < 0) raw = 0;
    if (raw > TURNS) raw = TURNS;

    var i = Math.floor(raw);
    if (i >= TURNS) { target = TURNS; return; }
    target = i + shape(raw - i);
  }

  /* ---- render ---------------------------------------------------- */

  var EASE = 0.16;
  var running = false;

  function frame() {
    current += (target - current) * EASE;
    if (Math.abs(target - current) < 0.0004) current = target;
    render();
    requestAnimationFrame(frame);
  }

  function render() {
    var p = current;

    /* Closed, the visible half is the right-hand one, so the whole
       book sits half a page left of centre and slides back as the
       cover lifts — it settles into its spread rather than jumping. */
    var open = p < 1 ? p : 1;
    var eased = open * open * (3 - 2 * open);
    book.style.transform =
      'translateX(' + (single ? 0 : -25 + 25 * eased) + '%) ' +
      'rotateX(' + (6 - 3 * eased) + 'deg) ' +
      'scale(' + (0.95 + 0.05 * eased) + ')';

    for (var i = 0; i < N; i++) {
      var leaf = leaves[i];
      var t = p - i;
      if (t <= 0) {
        if (leaf._t !== 0) { setLeaf(leaf, 0, i); leaf._t = 0; }
        continue;
      }
      if (t >= 1) {
        if (leaf._t !== 1) { setLeaf(leaf, 1, i); leaf._t = 1; }
        continue;
      }
      setLeaf(leaf, t, i);
      leaf._t = t;
    }

    sec.style.setProperty('--bh-p', p.toFixed(3));
    sec.style.setProperty('--bh-open', eased.toFixed(3));
    sec.classList.toggle('bh-open', p > 0.06);

    var spread = Math.round(p);
    if (spread !== render._s) { render._s = spread; markLive(spread); }
  }

  /* One leaf's geometry and shading for turn value t (0 → 1). */
  function setLeaf(leaf, t, i) {
    /* Paper is not rigid: a sheet lifts, bows away from the spine at
       the middle of its arc, then flattens as it lands. */
    var bow = Math.sin(t * Math.PI);

    leaf.style.transform =
      'rotateY(' + (t * -180) + 'deg) ' +
      'rotateX(' + (bow * 1.4) + 'deg) ' +
      'translateZ(' + (bow * 22) + 'px)';

    // a turning leaf must sit above everything it passes over
    leaf.style.zIndex = String(t > 0 && t < 1 ? N + 10 : (t >= 1 ? i : N - i));

    leaf.style.setProperty('--bow', bow.toFixed(3));
    leaf.style.setProperty('--shade-front', (0.42 * bow + (t > 0.5 ? 0.3 : 0)).toFixed(3));
    leaf.style.setProperty('--shade-back', (0.34 * bow + (t < 0.5 ? 0.28 : 0)).toFixed(3));
    leaf.style.setProperty('--cast', (bow * 0.5).toFixed(3));
  }

  /* The pen and the ring draw themselves in when their spread arrives,
     and only once — a note that rewrote itself on every pass would be
     a tic rather than a flourish. */
  function markLive(spread) {
    [leaves[spread - 1], leaves[spread]].forEach(function (leaf) {
      if (!leaf) return;
      [].forEach.call(leaf.querySelectorAll('.bh-face'), function (f) {
        f.classList.add('bh-live');
      });
    });
  }

  /* ---- wiring ---------------------------------------------------- */

  function onScroll() { read(); }

  var rt;
  function onResize() {
    clearTimeout(rt);
    rt = setTimeout(function () { measure(); read(); }, 120);
  }

  measure();
  read();
  current = target;
  render();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  if (!running) { running = true; requestAnimationFrame(frame); }
})();
