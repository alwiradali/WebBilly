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
  var leaves = [].slice.call(sec.querySelectorAll('.bh-leaf'));
  var N = leaves.length;
  if (!book || N < 2) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var TURNS = N - 1;              // p runs 0 → TURNS; the last spread stays open
  var LEAD = 0.24;                // a beat on the closed cover before it lifts
  var TAIL = 0.45;                // and a beat on the last spread before release
  var REST = 0.19;                // share of each leaf's range spent lying flat

  sec.classList.add('bh-on');

  /* ---- geometry -------------------------------------------------- */

  function measure() {
    var vh = window.innerHeight;
    var vw = window.innerWidth;

    /* The page has to clear the sticky nav and leave room for the
       scroll cue, so it is sized against the viewport height first and
       only then capped by width. */
    var pw = vw > 900
      ? Math.min(vw * 0.42, (vh - 150) / 1.17)
      : Math.min(vw * 0.9, 470, (vh - 130) / 1.62);

    var ph = vw > 900 ? pw * 1.17 : Math.min(pw * 1.62, vh - 130);

    sec.style.setProperty('--bh-pw', pw + 'px');
    sec.style.setProperty('--bh-ph', ph + 'px');
    sec.style.setProperty('--bh-u', (pw / (vw > 900 ? 100 : 80)) + 'px');

    /* One viewport for the sticky stage, plus the travel the turns need.
       A turn costs less on a phone: the same gesture covers less of the
       page, and a hero that takes four thumb-flicks to get past is a
       hero people leave. */
    single = vw <= 900;
    STEP = single ? 76 : 100;
    sec.style.height = (100 + (TURNS + LEAD + TAIL) * STEP) + 'vh';
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
  /* Below 900px the book shows one page at a time and the leaf already
     fills it, so there is no second half to slide off-centre for. */
  var single = false;

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
    var faces = [];
    if (spread > 0) {
      if (leaves[spread - 1]) faces.push(leaves[spread - 1].querySelector('.bh-face.bh-back'));
    }
    if (leaves[spread]) faces.push(leaves[spread].querySelector('.bh-face.bh-front'));
    faces.forEach(function (f) { if (f) f.classList.add('bh-live'); });
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
