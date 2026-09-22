/* ===========================================================================
   Bash n Boujee — page behaviour
   ---------------------------------------------------------------------------
   Vanilla, no build step, one file. Everything that will need changing when
   she sends the outstanding details is in CONFIG at the top, so nobody has to
   read the rest of this to swap a phone number.
   =========================================================================== */
(function () {
  'use strict';

  /* ======================================================== CONFIG — edit me */

  var CONTACT = {
    email: 'bashandboujeesa@gmail.com',
    instagram: 'https://www.instagram.com/bashnboujeesa',
    facebook: 'https://www.facebook.com/share/1CHYdX4v9H/',

    /* WhatsApp: international format, digits only, no + and no spaces.
       e.g. '447700900123'. While this is empty the floating bubble opens an
       Instagram DM instead — which is where her bio already sends people —
       rather than sitting there as a dead link. */
    whatsapp: '',

    /* Google Business: the "write a review" and "see all reviews" links.
       Leave empty until the profile exists and the buttons stay hidden. */
    googleReviews: '',
    googleWrite: ''
  };

  /* Web3Forms delivers the enquiry form to her inbox. Create the key free at
     web3forms.com against bashandboujeesa@gmail.com and paste it here. With
     no key the form still works: it hands the visitor a pre-written email and
     WhatsApp message with everything they typed already in it, so an enquiry
     is never lost just because the key has not been set up yet. */
  var W3F_KEY = '';

  /* ---------------------------------------------------------------- REVIEWS
     `sample: true` renders the example cards below so the section can be seen
     working. Real reviews go in `items` with sample set to false — and while
     it is true, every card carries a visible "Example" chip, because a made-up
     review presented as a real one is a lie told on her behalf. */
  var REVIEWS = {
    sample: true,
    rating: '5.0',
    count: 0,
    items: [
      { name: 'Aisha K.', when: 'Mehndi party, Ilford',
        text: 'The marigold stage was better than the picture I sent them. Everyone asked who did it and I have sent about six people their way since.' },
      { name: 'Danielle M.', when: '18th birthday, Romford',
        text: 'Balloon hoop and the neon sign — my daughter cried. Set up while we were still doing the food and you would never know they had been in.' },
      { name: 'Sofia R.', when: 'Baby shower, Stratford',
        text: 'Told them blush and gold and left them to it. The cake corner was the only thing anyone photographed all afternoon.' },
      { name: 'Nadia H.', when: 'Engagement, East London',
        text: 'Priced it honestly, turned up when they said, and the arch was still perfect at midnight. Booking them again for the wedding.' },
      { name: 'Jaz S.', when: "Son's 5th, Barking",
        text: 'The helium cloud over the table was gorgeous and the plinths made the whole room look hired-in. Lovely to deal with, too.' }
    ]
  };

  /* ====================================================== small DOM helpers */

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* The icons, once. */
  var ICON = {
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5 0-.2 0-.4 0-.5 0-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.3 5.2 4.6.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>',
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>',
    fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8.5V7c0-.7.5-1 1-1h2V3h-2.7C11.6 3 10.5 4.6 10.5 7v1.5H8V12h2.5v9H14v-9h2.6l.4-3.5H14z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5-4.8-4.6 6.6-.9z"/></svg>',
    google: '<svg viewBox="0 0 48 48"><path fill="#4285F4" d="M45 24.3c0-1.5-.1-2.9-.4-4.3H24v8.1h11.8c-.5 2.7-2 5-4.3 6.6v5.5h7c4.1-3.8 6.5-9.4 6.5-15.9z"/><path fill="#34A853" d="M24 46c5.8 0 10.7-1.9 14.3-5.3l-7-5.5c-1.9 1.3-4.4 2.1-7.3 2.1-5.6 0-10.4-3.8-12.1-8.9H4.7v5.6C8.3 41.2 15.6 46 24 46z"/><path fill="#FBBC05" d="M11.9 28.4a13.2 13.2 0 0 1 0-8.8v-5.6H4.7a22 22 0 0 0 0 20l7.2-5.6z"/><path fill="#EA4335" d="M24 9.9c3.2 0 6 1.1 8.2 3.2l6.2-6.2C34.7 3.4 29.8 1.4 24 1.4 15.6 1.4 8.3 6.2 4.7 13.2l7.2 5.6c1.7-5.1 6.5-8.9 12.1-8.9z"/></svg>'
  };

  /* ====================================================== where "message us"
     actually goes. One decision, used by every button on the page. */

  function waHref(text) {
    var msg = encodeURIComponent(text || 'Hi Bash n Boujee — I\'d like to enquire about decor for my event.');
    if (CONTACT.whatsapp) return 'https://wa.me/' + CONTACT.whatsapp + '?text=' + msg;
    return CONTACT.instagram;          // her bio's own route: DM to enquire
  }
  var hasWA = !!CONTACT.whatsapp;

  /* ========================================================== smooth scroll */

  /* Smooth scrolling is a desktop nicety. A phone already has momentum
     scrolling of its own, done by the operating system on another thread, and
     a library scrolling the page from a rAF loop while a thumb is dragging it
     fights that: the page stutters, jumps back, or stops moving altogether.
     So Lenis is for a mouse, and a touch screen keeps its native scroll. */
  var fine = !window.matchMedia || window.matchMedia('(pointer: fine)').matches;

  var lenis = null;
  if (!reduced && fine && typeof window.Lenis === 'function') {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6
    });
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  /* Holding the page still behind the drawer and the lightbox. With Lenis
     driving the scroll, lenis.stop() is enough. Without it — every touch
     device now — `overflow:hidden` on the body is famously not enough on
     iOS, so the body is pinned in place and put back where it was after. */
  var lockedAt = 0;
  function lockScroll(on) {
    var b = document.body;
    if (on) {
      lockedAt = window.scrollY || document.documentElement.scrollTop || 0;
      b.style.overflow = 'hidden';
      if (!lenis) {
        b.style.position = 'fixed';
        b.style.top = (-lockedAt) + 'px';
        b.style.left = '0';
        b.style.right = '0';
      }
    } else {
      b.style.overflow = '';
      if (!lenis) {
        b.style.position = '';
        b.style.top = '';
        b.style.left = '';
        b.style.right = '';
        /* html has scroll-behavior:smooth, which would turn putting the page
           back into a visible animation from the top. Put it back instantly. */
        var html = document.documentElement, was = html.style.scrollBehavior;
        html.style.scrollBehavior = 'auto';
        window.scrollTo(0, lockedAt);
        html.style.scrollBehavior = was;
      }
    }
  }

  function scrollToHash(hash) {
    var target = hash && hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
    if (!target) return false;
    if (lenis) lenis.scrollTo(target, { offset: -70, duration: 1.3 });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    return true;
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var hash = a.getAttribute('href');
    if (hash === '#' || !document.getElementById(hash.slice(1))) return;
    e.preventDefault();
    /* Close first. Closing the drawer puts the page back where it was, which
       would undo the scroll we are about to do, so the scroll goes after it —
       on the next frame, once the page is unpinned and can move again. */
    var wasOpen = drawer.classList.contains('open');
    closeDrawer();
    if (wasOpen && !lenis) requestAnimationFrame(function () { scrollToHash(hash); });
    else scrollToHash(hash);
    history.replaceState(null, '', hash);
  });

  /* ================================================================ loader */

  window.addEventListener('load', function () {
    setTimeout(function () {
      var l = $('#loader');
      if (l) l.classList.add('gone');
      $('#chat').classList.add('in');
    }, reduced ? 0 : 900);
  });

  /* =================================================== nav, drawer, progress */

  var nav = $('#nav'), burger = $('#burger'), drawer = $('#drawer');

  function closeDrawer() {
    if (!drawer.classList.contains('open')) return;
    drawer.classList.remove('open');
    burger.classList.remove('on');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
    if (lenis) lenis.start();
    lockScroll(false);
  }

  burger.addEventListener('click', function () {
    var open = !drawer.classList.contains('open');
    drawer.classList.toggle('open', open);
    burger.classList.toggle('on', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (lenis) { open ? lenis.stop() : lenis.start(); }
    lockScroll(open);
    // the links cascade in, one after the other
    $$('a', drawer).forEach(function (a, i) {
      a.style.transitionDelay = open ? (0.12 + i * 0.055) + 's' : '0s';
    });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeDrawer(); closeLb(); } });

  /* The scroll bar across the top and the hero garland's drift are both the
     global data-fx toolkit's (assets/js/scroll-fx.js); all this has to do is
     tell the header when it has left the top of the page. */
  function onScroll() {
    nav.classList.toggle('stuck', (window.scrollY || document.documentElement.scrollTop) > 40);
  }
  (lenis ? lenis.on('scroll', onScroll) : window.addEventListener('scroll', onScroll, { passive: true }));
  onScroll();

  /* ==================================================== floating balloons */
  /* Every [data-balloons] layer gets that many balloons, drawn as small SVGs
     rather than emoji or photo cut-outs: a real balloon photographed on a
     white background and dropped over a photograph of a party looks like a
     mistake, a soft translucent one reads as texture. Size, tint, drift and
     duration are random per balloon, so no two sections look alike, and the
     whole thing is skipped when the visitor asks for reduced motion. */

  (function balloons() {
    var TINTS = [
      ['#f3ded8', '#dfb0a3'], ['#e8c3b6', '#cf9280'], ['#f7efe9', '#e2cec5'],
      ['#dda7a8', '#c07d7e'], ['#e3c08c', '#c08a4e'], ['#eccfc6', '#d6a394']
    ];
    var uid = 0;

    function balloon(scale) {
      var t = TINTS[(Math.random() * TINTS.length) | 0];
      var id = 'bg' + (++uid);
      var w = (34 + Math.random() * 56) * scale;
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 70 132');
      svg.setAttribute('width', w.toFixed(1));
      svg.setAttribute('height', (w * 132 / 70).toFixed(1));
      svg.innerHTML =
        '<defs><radialGradient id="' + id + '" cx="34%" cy="28%" r="78%">' +
        '<stop offset="0" stop-color="#fff" stop-opacity=".92"/>' +
        '<stop offset=".42" stop-color="' + t[0] + '"/>' +
        '<stop offset="1" stop-color="' + t[1] + '"/></radialGradient></defs>' +
        '<path d="M35 82c-2.6 3.2-2.6 5.6 0 8 2.6-2.4 2.6-4.8 0-8z" fill="' + t[1] + '"/>' +
        '<path d="M35 88c6 10-7 14-1 24 3 5 2 12-2 20" fill="none" ' +
        'stroke="' + t[1] + '" stroke-width="1.1" stroke-linecap="round" opacity=".55"/>' +
        '<ellipse cx="35" cy="45" rx="30" ry="38" fill="url(#' + id + ')"/>' +
        '<ellipse cx="24" cy="30" rx="7" ry="11" fill="#fff" opacity=".45" transform="rotate(-18 24 30)"/>';
      return svg;
    }

    /* A blurred, composited layer costs a phone something on every scroll
       frame, and thirty of them cost it thirty times that. Small screens get
       fewer balloons and no blur — the CSS drops the blur too, this keeps the
       elements themselves from being created in the first place. */
    var small = Math.min(window.innerWidth, window.innerHeight) < 760;

    $$('[data-balloons]').forEach(function (field) {
      var n = parseInt(field.getAttribute('data-balloons'), 10) || 6;
      var scale = parseFloat(field.getAttribute('data-balloon-scale')) || 1;
      if (small) n = Math.ceil(n / 2);
      if (reduced) n = Math.min(n, 4);
      for (var i = 0; i < n; i++) {
        var b = balloon(scale * (0.7 + Math.random() * 0.6));
        var deep = Math.random();                    // how far back it sits
        b.style.cssText =
          'left:' + (Math.random() * 96 - 3).toFixed(2) + '%;' +
          'top:' + (Math.random() * 92 - 4).toFixed(2) + '%;' +
          'opacity:' + (0.2 + deep * 0.34).toFixed(2) + ';' +
          (small ? '' : 'filter:blur(' + ((1 - deep) * 1.6).toFixed(2) + 'px);') +
          '--dx:' + (Math.random() * 46 - 23).toFixed(0) + 'px;' +
          '--dy:' + (-28 - Math.random() * 54).toFixed(0) + 'px;' +
          '--r0:' + (Math.random() * 6 - 3).toFixed(1) + 'deg;' +
          '--r1:' + (Math.random() * 6 - 3).toFixed(1) + 'deg;' +
          '--d:' + (16 + Math.random() * 18).toFixed(1) + 's;' +
          'animation-delay:' + (-Math.random() * 18).toFixed(1) + 's';
        field.appendChild(b);
      }
    });
  }());

  /* ================================================================= rails */
  /* The look book and the reviews are strips you drag, flick or arrow along.
     Native overflow scrolling already handles the wheel and the touch flick;
     what it does not give you is a grab-and-throw with a mouse, or an arrow
     button that glides instead of jumping. Both are here, and both leave the
     element's own scrollLeft as the single source of truth, so the scrollbar,
     the snap points and the keyboard all stay honest. */

  (function rails() {
    var ease = function (t) { return 1 - Math.pow(1 - t, 3); };

    function glide(rail, to, ms) {
      var from = rail.scrollLeft;
      var max = rail.scrollWidth - rail.clientWidth;
      to = Math.max(0, Math.min(max, to));
      if (Math.abs(to - from) < 1) return;
      if (reduced) { rail.scrollLeft = to; return; }
      var t0 = performance.now();
      cancelAnimationFrame(rail.__glide);
      (function step(now) {
        var k = Math.min(1, (now - t0) / ms);
        rail.scrollLeft = from + (to - from) * ease(k);
        if (k < 1) rail.__glide = requestAnimationFrame(step);
      }(t0));
    }

    function cardStep(rail) {
      var card = rail.firstElementChild;
      if (!card) return rail.clientWidth * 0.8;
      var gap = parseFloat(getComputedStyle(rail).columnGap) || 16;
      return Math.round(card.getBoundingClientRect().width + gap);
    }

    $$('[data-rail]').forEach(function (rail) {
      var prev = $('[data-rail-prev="' + rail.id + '"]');
      var next = $('[data-rail-next="' + rail.id + '"]');

      function ends() {
        var max = rail.scrollWidth - rail.clientWidth - 1;
        if (prev) prev.disabled = rail.scrollLeft <= 1;
        if (next) next.disabled = rail.scrollLeft >= max;
      }
      rail.addEventListener('scroll', ends, { passive: true });
      window.addEventListener('resize', ends);
      setTimeout(ends, 80);
      rail.__ends = ends;

      if (prev) prev.addEventListener('click', function () { glide(rail, rail.scrollLeft - cardStep(rail), 620); });
      if (next) next.addEventListener('click', function () { glide(rail, rail.scrollLeft + cardStep(rail), 620); });

      rail.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); glide(rail, rail.scrollLeft + cardStep(rail), 620); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); glide(rail, rail.scrollLeft - cardStep(rail), 620); }
      });

      /* Grab and throw. Pointer events cover mouse and pen; touch is left to
         the browser, which already does it better than we could. */
      var down = false, startX = 0, startLeft = 0, last = 0, lastT = 0, v = 0, moved = 0;

      rail.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'touch' || e.button !== 0) return;
        down = true; moved = 0; v = 0;
        startX = last = e.clientX; startLeft = rail.scrollLeft; lastT = performance.now();
        cancelAnimationFrame(rail.__glide);
        cancelAnimationFrame(rail.__flick);
      });

      window.addEventListener('pointermove', function (e) {
        if (!down) return;
        var dx = e.clientX - startX;
        if (!moved && Math.abs(dx) > 4) rail.classList.add('dragging');
        moved = Math.max(moved, Math.abs(dx));
        rail.scrollLeft = startLeft - dx;
        var now = performance.now(), dt = now - lastT;
        if (dt > 0) v = (e.clientX - last) / dt;          // px per ms
        last = e.clientX; lastT = now;
      });

      function release() {
        if (!down) return;
        down = false;
        rail.classList.remove('dragging');
        /* A click that followed a drag is not a click. */
        if (moved > 6) {
          rail.__drag = Date.now();
          if (!reduced && Math.abs(v) > 0.15) {
            var speed = v * 16;                            // carry the throw on
            (function decay() {
              speed *= 0.94;
              rail.scrollLeft -= speed;
              if (Math.abs(speed) > 0.4) rail.__flick = requestAnimationFrame(decay);
            }());
          }
        }
      }
      window.addEventListener('pointerup', release);
      window.addEventListener('pointercancel', release);
      rail.addEventListener('dragstart', function (e) { e.preventDefault(); });
    });
  }());

  /* ============================================================== marquee */

  (function marquee() {
    var track = $('#marquee');
    if (!track) return;
    var words = ['Mehndi parties', 'Engagements', 'Birthdays', 'Baby showers',
      'Balloon garlands', 'Flower arches', 'Stage decor', 'Neon signs',
      'Plinths & props', 'London'];
    // twice through, so the -50% translate loops seamlessly
    var run = words.concat(words).map(function (w) { return '<span>' + w + '</span>'; }).join('');
    track.innerHTML = run;
  }());

  /* ================================================================= reviews */

  (function reviews() {
    var rail = $('#rvRail'), score = $('#rvScore'), note = $('#rvNote');
    var stars = '<span class="stars" aria-hidden="true">' + ICON.star.repeat(5) + '</span>';

    if (REVIEWS.sample) {
      score.innerHTML =
        '<span class="g">' + ICON.google + '</span>' +
        '<div><b>' + REVIEWS.rating + '</b>' + stars +
        '<small>Google reviews — example layout</small></div>';
      note.innerHTML =
        'These cards are an example of how the Google reviews will look. ' +
        'They are not real reviews and are labelled as such until the Google ' +
        'Business profile is live — see REVIEWS in bashnboujee.js.';
    } else {
      score.innerHTML =
        '<span class="g">' + ICON.google + '</span>' +
        '<div><b>' + REVIEWS.rating + '</b>' + stars +
        '<small>' + REVIEWS.count + ' Google reviews</small></div>';
      note.innerHTML = CONTACT.googleWrite
        ? '<a href="' + CONTACT.googleWrite + '" target="_blank" rel="noopener">Leave us a review on Google</a>'
        : '';
    }
    if (CONTACT.googleReviews) {
      score.style.cursor = 'pointer';
      score.addEventListener('click', function () { window.open(CONTACT.googleReviews, '_blank', 'noopener'); });
    }

    REVIEWS.items.forEach(function (r, i) {
      var card = el('article', { class: 'rv', 'data-fx': 'reveal', 'data-fx-delay': String(i * 70) });
      card.innerHTML =
        stars +
        '<p>“' + r.text + '”</p>' +
        '<div class="rv-who"><span class="rv-av" aria-hidden="true">' + r.name.charAt(0) + '</span>' +
        '<span><b>' + r.name + '</b><small>' + r.when + '</small></span></div>' +
        (REVIEWS.sample ? '<span class="rv-tag">Example</span>' : '');
      rail.appendChild(card);
    });
    fxRefresh();
  }());

  /* ======================================================== scroll reveals */
  /* Handled by the global data-fx toolkit (assets/js/scroll-fx.js) — see
     docs/scroll-fx.md. Two things it cannot know about on its own: */

  function fxRefresh() {
    if (window.ScrollFXKit) window.ScrollFXKit.refresh();
  }

  (function heroOnLoad() {
    /* The hero is never scrolled INTO. On a short laptop screen its buttons
       start just past the observer's margin and would sit invisible until the
       visitor scrolled away from them. Reveal that first screen outright. */
    $$('.hero [data-fx]').forEach(function (n, i) {
      if (n.getAttribute('data-fx') === 'parallax') return;
      setTimeout(function () { n.classList.add('fx-in'); }, reduced ? 0 : 420 + i * 150);
    });
  }());

  /* ============================================== service tiles: gentle tilt */

  (function tilt() {
    if (reduced || window.matchMedia('(hover: none)').matches) return;
    $$('[data-tilt]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          'translateY(-8px) perspective(900px) rotateX(' + (-y * 5).toFixed(2) +
          'deg) rotateY(' + (x * 6).toFixed(2) + 'deg)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  }());

  /* ================================================================ lightbox */

  var lb = $('#lb'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  var tiles = $$('[data-lb]'), lbAt = 0;

  function openLb(i) {
    lbAt = (i + tiles.length) % tiles.length;
    var img = $('img', tiles[lbAt]);
    var cap = $('.cap', tiles[lbAt]);
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    // title and kind are two separate spans; joined blind they run together
    lbCap.textContent = cap
      ? [$('b', cap), $('em', cap)].filter(Boolean)
          .map(function (n) { return n.textContent.trim(); }).join(' — ')
      : '';
    lb.classList.add('open');
    if (lenis) lenis.stop();
    lockScroll(true);
    $('#lbX').focus();
  }
  function closeLb() {
    if (!lb.classList.contains('open')) return;
    lb.classList.remove('open');
    if (lenis) lenis.start();
    lockScroll(false);
  }
  /* A tile inside a rail is also the drag handle for that rail, so a click
     that ended a drag must not also open the picture. */
  tiles.forEach(function (t, i) {
    t.addEventListener('click', function () {
      var rail = t.closest('[data-rail]');
      if (rail && rail.__drag && Date.now() - rail.__drag < 250) return;
      openLb(i);
    });
  });
  $('#lbX').addEventListener('click', closeLb);
  $('#lbPrev').addEventListener('click', function () { openLb(lbAt - 1); });
  $('#lbNext').addEventListener('click', function () { openLb(lbAt + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'ArrowLeft') openLb(lbAt - 1);
    if (e.key === 'ArrowRight') openLb(lbAt + 1);
  });

  /* ===================================================================== FAQ */

  $$('.q button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var q = btn.parentElement, panel = $('.q-a', q), open = q.classList.contains('on');
      // one answer at a time, so the page never springs about
      $$('.q.on').forEach(function (o) {
        o.classList.remove('on');
        $('.q-a', o).style.height = '0px';
        $('button', o).setAttribute('aria-expanded', 'false');
      });
      if (!open) {
        q.classList.add('on');
        panel.style.height = panel.firstElementChild.offsetHeight + 'px';
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
  window.addEventListener('resize', function () {
    var open = $('.q.on');
    if (open) $('.q-a', open).style.height = $('.q-a', open).firstElementChild.offsetHeight + 'px';
  });

  /* ============================================ contact blocks + social rows */

  (function contacts() {
    function socialRow(host) {
      if (!host) return;
      host.innerHTML =
        '<a href="' + CONTACT.instagram + '" target="_blank" rel="noopener" aria-label="Instagram">' + ICON.ig + '</a>' +
        '<a href="' + CONTACT.facebook + '" target="_blank" rel="noopener" aria-label="Facebook">' + ICON.fb + '</a>' +
        (hasWA ? '<a href="' + waHref() + '" target="_blank" rel="noopener" aria-label="WhatsApp">' + ICON.wa + '</a>' : '') +
        '<a href="mailto:' + CONTACT.email + '" aria-label="Email">' + ICON.mail + '</a>';
    }
    ['#footSocial', '#sideSocial', '#drawerSocial'].forEach(function (s) { socialRow($(s)); });

    var route = $('#msgRoute');
    if (route) {
      route.textContent = hasWA
        ? 'Prefer to message? We are on WhatsApp and Instagram, and we answer both.'
        : 'Prefer to message? Send us a DM on Instagram — it is where we pick things up fastest.';
    }

    var chat = $('#chat');
    chat.classList.toggle('dm', !hasWA);
    chat.innerHTML = (hasWA ? ICON.wa : ICON.ig) +
      '<span>' + (hasWA ? 'WhatsApp us' : 'Message us') + '</span>';
    chat.setAttribute('aria-label', hasWA ? 'Message us on WhatsApp' : 'Message us on Instagram');
    chat.addEventListener('click', function () { window.open(waHref(), '_blank', 'noopener'); });

    $('#yr').textContent = new Date().getFullYear();
  }());

  /* ============================================================ event chips */

  var EVENTS = ['Birthday', 'Mehndi', 'Engagement', 'Baby shower', 'Nikkah',
    'Anniversary', 'Christening', 'Something else'];

  (function chips() {
    var host = $('#evChips'), hidden = $('#ev');
    EVENTS.forEach(function (name, i) {
      var b = el('button', { type: 'button', class: 'chip' + (i === 0 ? ' on' : ''),
        'aria-pressed': i === 0 ? 'true' : 'false' }, name);
      b.addEventListener('click', function () {
        $$('.chip', host).forEach(function (c) { c.classList.remove('on'); c.setAttribute('aria-pressed', 'false'); });
        b.classList.add('on');
        b.setAttribute('aria-pressed', 'true');
        hidden.value = name;
      });
      host.appendChild(b);
    });
  }());

  /* =========================================================== enquiry form */

  (function form() {
    var form = $('#enqForm'), btn = $('#enqBtn'), msg = $('#formMsg');

    function val(id) { var n = $('#' + id); return n ? n.value.trim() : ''; }

    /* Everything they typed, in the order it was asked for. Used both for the
       email that goes to her and for the fallback below — the two must never
       disagree about what the enquiry said. */
    function summary() {
      return [
        ['Event', val('ev')],
        ['Name', val('name')],
        ['Email', val('email')],
        ['Phone / Instagram', val('phone')],
        ['Date', val('date')],
        ['Venue or area', val('area')],
        ['Stand needed for', val('hours')],
        ['Colours or theme', val('colours')],
        ['Budget', val('budget')],
        ['Ideas', val('msg')]
      ].filter(function (p) { return p[1]; });
    }

    function show(kind, html) {
      msg.className = 'form-msg on ' + kind;
      msg.innerHTML = html;
    }

    /* If the send fails — or was never configured — the visitor has just
       filled in nine fields and will not do it twice. So hand them the whole
       thing back, already written, one tap from her inbox. */
    function fallback(reason) {
      var lines = summary().map(function (p) { return p[0] + ': ' + p[1]; }).join('\n');
      var body = 'Enquiry from the Bash n Boujee website\n\n' + lines;
      var subject = 'Decor enquiry — ' + val('ev') + (val('date') ? ' on ' + val('date') : '');
      var mail = 'mailto:' + CONTACT.email + '?subject=' + encodeURIComponent(subject) +
                 '&body=' + encodeURIComponent(body);
      show('err',
        '<b>We could not send that from here.</b><br>' +
        'Nothing you typed is lost — ' +
        '<a href="' + mail + '">open it as an email</a> or ' +
        '<a href="' + waHref(body) + '" target="_blank" rel="noopener">' +
        (hasWA ? 'send it on WhatsApp' : 'send it as an Instagram message') + '</a>, ' +
        'and it is already written for you.');
      if (reason) console.warn('[enquiry] ' + reason);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (val('company')) return;                       // honeypot: a bot filled it

      if (!val('name') || !val('email')) {
        show('err', 'Please give us your name and an email address so we can reply.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val('email'))) {
        show('err', 'That email address does not look quite right — could you check it?');
        return;
      }

      msg.className = 'form-msg';

      if (!W3F_KEY) { fallback('no Web3Forms key set — see W3F_KEY in bashnboujee.js'); return; }

      var payload = {
        access_key: W3F_KEY,
        subject: 'Decor enquiry — ' + val('ev') + (val('date') ? ' on ' + val('date') : ''),
        from_name: 'Bash n Boujee website',
        replyto: val('email')                            // reply goes to them, not the form service
      };
      summary().forEach(function (p) { payload[p[0]] = p[1]; });

      btn.disabled = true;
      var label = btn.textContent;
      btn.textContent = 'Sending…';

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, body: d }; }); })
        .then(function (res) {
          if (!res.body || !res.body.success) {
            throw new Error(res.body && res.body.message ? res.body.message : 'no success flag');
          }
          form.style.display = 'none';
          $('#sentPanel').classList.add('on');
        })
        .catch(function (ex) { fallback(ex && ex.message ? ex.message : String(ex)); })
        .then(function () { btn.disabled = false; btn.textContent = label; });
    });

    // the two buttons on the thank-you panel
    $('#sentCta').innerHTML =
      '<a class="btn" href="' + waHref() + '" target="_blank" rel="noopener">' +
        (hasWA ? 'Message on WhatsApp' : 'Message on Instagram') + '</a>' +
      '<a class="btn ghost" href="#gallery">Back to the look book</a>';
  }());

}());
