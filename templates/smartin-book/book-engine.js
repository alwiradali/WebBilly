/* SMARTin SCIENCE — book engine
   ==================================================================
   A scroll-driven page-turning book. Content-agnostic: it reads the
   leaves that already exist in the DOM, so pages can be added, removed
   or rewritten without touching this file.

   THE MODEL
   A physical book is a stack of leaves (sheets). Leaf i carries page
   2i on its front and 2i+1 on its back, and a spread is the back of
   one leaf beside the front of the next. Scroll maps to a single
   continuous position `p` measured in leaves:

       p = 0     closed, cover up
       p = 1     cover fully turned, first spread open
       p = 4.5   leaf 4 halfway through its turn

   Leaf i's turn is therefore just clamp(p - i, 0, 1) — every leaf runs
   the same maths, and the whole book is one number. Reverse scrolling
   needs no special case: p simply decreases.

   WHY IT FEELS LIKE PAPER
   Geometry alone reads as a flat card flipping. What sells paper is
   shading, so each face carries two overlays driven by its own turn
   value: a spine-side gradient that deepens as the sheet lifts, and a
   specular sweep that travels across it. The leaf also gains a slight
   rotateX and a shadow that grows then collapses as it lands.

   PERFORMANCE
   Only leaves near p are transformed each frame; the rest keep their
   resting transform and are skipped. Scroll is smoothed with a lerp
   rather than read raw, so a trackpad flick decelerates like a real
   page instead of snapping.                                          */

(function () {
  'use strict';

  var root = document.documentElement;
  var stage = document.getElementById('stage');
  var book = document.getElementById('book');
  if (!book) return;

  var leaves = [].slice.call(book.querySelectorAll('.leaf'));
  var N = leaves.length;
  if (!N) return;

  var scroller = document.getElementById('scroller');
  var chapters = [].slice.call(document.querySelectorAll('[data-goto]'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches;

  /* Reduced motion and no-JS both fall back to the flat editorial
     reading order that is already in the markup — the book metaphor
     survives as paper styling, without any of the motion. */
  if (reduce) {
    root.classList.add('is-flat');
    return;
  }

  /* ---- scroll → p ------------------------------------------------ */

  var VH_PER_LEAF = 1.0;          // how much scroll one turn costs
  /* Below 900px the book shows one page at a time and the leaf already
     fills it, so there is no second half to slide off-centre for —
     applying the opening slide there pushes the cover off the screen. */
  var single = window.matchMedia('(max-width: 900px)').matches;
  var target = 0, current = 0, velocity = 0;
  var maxScroll = 1;

  function measure() {
    // +1.15 gives the closed cover a moment before it starts to lift,
    // and the back cover somewhere to rest without a hard stop.
    scroller.style.height = ((N + 1.15) * VH_PER_LEAF * 100) + 'vh';
    maxScroll = Math.max(1, scroller.offsetHeight - window.innerHeight);
    root.style.setProperty('--vh', window.innerHeight * 0.01 + 'px');
    single = window.matchMedia('(max-width: 900px)').matches;
    buildSnaps();
  }

  /* A real book never rests half-turned. Without snapping the reader
     stops between spreads and sees a sheet frozen on edge with the next
     page showing past it — which reads as broken rather than physical.
     One snap point per leaf fixes that.

     `proximity` rather than `mandatory` on purpose: mandatory fights
     anyone scrolling deliberately slowly, and the brief is explicit
     that the reader stays in control. */
  function buildSnaps() { /* native snapping is off — see book.css */ }

  function readScroll() {
    var y = window.pageYOffset || root.scrollTop || 0;
    target = (y / maxScroll) * N;
    if (target < 0) target = 0;
    if (target > N) target = N;
    queueSettle();
  }

  /* CSS scroll-snap handles real gestures, but it does not fire for
     programmatic scrolls and browsers disagree about when proximity
     applies — so the settle is enforced here too. Once the reader stops,
     the nearest leaf is scrolled to, which keeps window scroll and `p`
     in step rather than letting them drift apart. */
  var settleTimer = null, settling = false, settleTo = 0, settleFrom = 0, settleT = 0;

  function queueSettle() {
    if (settling) return;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(startSettle, 170);
  }

  function startSettle() {
    var nearest = Math.round(target);
    var want = (nearest / N) * maxScroll;
    var now = window.pageYOffset || root.scrollTop || 0;
    if (Math.abs(now - want) < 2) return;
    settleFrom = now; settleTo = want; settleT = 0; settling = true;
  }

  /* Driven from the same rAF loop as everything else. The browser's own
     smooth scroll was landing short here — repeated calls interrupted
     each other mid-flight — and owning the tween removes that whole
     class of problem, as well as matching the book's easing exactly. */
  function stepSettle() {
    if (!settling) return;
    settleT += 0.085;
    if (settleT >= 1) { settleT = 1; settling = false; }
    var e = 1 - Math.pow(1 - settleT, 3);              // ease-out cubic
    window.scrollTo(0, settleFrom + (settleTo - settleFrom) * e);
  }

  /* ---- per-frame render ------------------------------------------ */

  var EASE_SPINE = 0.14;          // how quickly current chases target

  function frame() {
    stepSettle();
    var prev = current;
    current += (target - current) * EASE_SPINE;
    if (Math.abs(target - current) < 0.0004) current = target;
    velocity = current - prev;

    render();
    requestAnimationFrame(frame);
  }

  function render() {
    var p = current;

    /* The closed book sits centred on screen, so the stage is offset by
       half a page and slides back as the cover opens — the book appears
       to settle into its spread rather than jump sideways. */
    var open = p < 1 ? p : 1;

    /* And it closes the same way at the other end. Past the last leaf
       there is no paper on the right, so the book has to settle back
       onto its own half instead of leaving a page-shaped ghost of
       shadow floating beside the back cover. */
    var shut = p > N - 1 ? p - (N - 1) : 0;
    if (shut > 1) shut = 1;
    open *= 1 - shut;

    var eased = open * open * (3 - 2 * open);           // smoothstep
    // closed at the front, the visible half is the right one (-25%);
    // closed at the back it is the left one (+25%); open, neither (0).
    var slide = single ? 0 : (shut > 0 ? 25 * (1 - eased) : -25 + 25 * eased);
    book.style.transform =
      'translateX(' + slide + '%) ' +
      'rotateX(' + (7 - 3.5 * eased) + 'deg) ' +
      'scale(' + (0.94 + 0.06 * eased) + ')';

    for (var i = 0; i < N; i++) {
      var leaf = leaves[i];
      var t = p - i;

      // resting states: skip the maths entirely for settled leaves
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

    root.style.setProperty('--p', p.toFixed(3));
    root.style.setProperty('--open', eased.toFixed(3));

    // which spread is showing, for chapter state and page numbers
    var spread = Math.round(p);
    if (spread !== render._spread) {
      render._spread = spread;
      onSpreadChange(spread);
    }
  }

  /* One leaf's geometry and shading for turn value t (0 → 1). */
  function setLeaf(leaf, t, i) {
    var deg = t * -180;

    /* Paper is not rigid. A sheet lifts, bows away from the spine at
       the midpoint of its arc, then flattens as it lands — bow peaks at
       t = 0.5 and returns to nothing at both ends. */
    var bow = Math.sin(t * Math.PI);

    leaf.style.transform =
      'rotateY(' + deg + 'deg) ' +
      'rotateX(' + (bow * 1.6) + 'deg) ' +
      'translateZ(' + (bow * 26) + 'px)';

    // stacking: a turning leaf must sit above everything it passes over
    leaf.style.zIndex = String(t > 0 && t < 1 ? N + 10 : (t >= 1 ? i : N - i));

    /* Shading is what reads as paper. The face rotating away loses
       light; the one arriving gains it. Both carry a spine-side
       gradient that deepens with the bow. */
    var lift = bow;
    leaf.style.setProperty('--t', t.toFixed(3));
    leaf.style.setProperty('--bow', lift.toFixed(3));
    leaf.style.setProperty('--shade-front', (0.42 * lift + (t > 0.5 ? 0.3 : 0)).toFixed(3));
    leaf.style.setProperty('--shade-back', (0.34 * lift + (t < 0.5 ? 0.28 : 0)).toFixed(3));
    leaf.style.setProperty('--cast', (lift * 0.5).toFixed(3));
  }

  /* ---- spread changes: page numbers, chapter state ---------------- */

  function onSpreadChange(spread) {
    chapters.forEach(function (c) {
      var on = parseInt(c.getAttribute('data-goto'), 10) === spread;
      c.classList.toggle('on', on);
      c.setAttribute('aria-current', on ? 'true' : 'false');
    });
    root.classList.toggle('is-closed', spread <= 0);
    root.classList.toggle('is-end', spread >= N);

    // reveal the spread's own content once it has settled
    leaves.forEach(function (leaf, i) {
      var showsLeft = i === spread - 1, showsRight = i === spread;
      leaf.querySelector('.back').classList.toggle('live', showsLeft);
      leaf.querySelector('.front').classList.toggle('live', showsRight);
    });
  }

  /* ---- navigation ------------------------------------------------- */

  /* Clicking a chapter must not teleport. Scrolling the window to the
     chapter's offset lets the same engine drive the turns, so the book
     riffles through the intervening pages exactly as a drag would. */
  function goTo(leafIndex) {
    var y = (leafIndex / N) * maxScroll;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  chapters.forEach(function (c) {
    c.addEventListener('click', function (e) {
      e.preventDefault();
      goTo(parseInt(c.getAttribute('data-goto'), 10));
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.target.closest('input, textarea, select')) return;
    var step = maxScroll / N;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      window.scrollBy({ top: step, behavior: 'smooth' }); e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      window.scrollBy({ top: -step, behavior: 'smooth' }); e.preventDefault();
    } else if (e.key === 'Home') {
      window.scrollTo({ top: 0, behavior: 'smooth' }); e.preventDefault();
    } else if (e.key === 'End') {
      window.scrollTo({ top: maxScroll, behavior: 'smooth' }); e.preventDefault();
    }
  });

  /* Swipe: on touch the page edges are the natural affordance, so a
     horizontal swipe turns one leaf rather than scrubbing freely. */
  if (coarse) {
    var sx = 0, sy = 0, swiping = false;
    stage.addEventListener('touchstart', function (e) {
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; swiping = true;
    }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (!swiping) return;
      swiping = false;
      var dx = e.changedTouches[0].clientX - sx;
      var dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        goTo(Math.round(current) + (dx < 0 ? 1 : -1));
      }
    });
  }

  /* Clicking the outer third of a page turns it — the affordance every
     reader already has for a physical book. */
  book.addEventListener('click', function (e) {
    if (e.target.closest('a, button, input, textarea, select, label')) return;
    var r = book.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width;
    if (x > 0.72) goTo(Math.round(current) + 1);
    else if (x < 0.28 && current >= 1) goTo(Math.round(current) - 1);
  });

  /* ---- custom cursor: contextual, desktop only -------------------- */

  if (!coarse) {
    var cur = document.getElementById('cursor');
    if (cur) {
      var cx = 0, cy = 0, tx = 0, ty = 0;
      window.addEventListener('mousemove', function (e) {
        tx = e.clientX; ty = e.clientY;
        var el = document.elementFromPoint(tx, ty);
        var mode = '';
        if (el && el.closest('a, button, input, textarea, select')) mode = 'link';
        else if (el && el.closest('#book')) {
          var r = book.getBoundingClientRect();
          var x = (tx - r.left) / r.width;
          if (x > 0.72) mode = 'next';
          else if (x < 0.28 && current >= 1) mode = 'prev';
          else mode = 'read';
        }
        cur.dataset.mode = mode;
      }, { passive: true });

      (function trail() {
        cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
        cur.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
        requestAnimationFrame(trail);
      })();
    }
  }

  /* ---- boot ------------------------------------------------------- */

  measure();
  readScroll();
  current = target;
  render();
  onSpreadChange(Math.round(current));

  window.addEventListener('scroll', readScroll, { passive: true });
  window.addEventListener('resize', function () {
    measure(); readScroll();
  }, { passive: true });

  requestAnimationFrame(frame);
  root.classList.add('is-ready');
})();
