/* ===========================================================================
   Brownielicious — page behaviour
   ---------------------------------------------------------------------------
   Vanilla, no build step, one file. Everything that will need changing when
   she sends the outstanding details is in CONFIG at the top, so nobody has to
   read the rest of this to swap a phone number or a price.
   =========================================================================== */
(function () {
  'use strict';

  /* ======================================================== CONFIG — edit me */

  var CONTACT = {
    instagram: 'https://www.instagram.com/browniieliciousss',
    tiktok: 'https://www.tiktok.com/@browniieliciousss',

    /* Her Facebook page. While this is empty the Facebook button is simply
       not rendered, rather than sitting there as a dead link. */
    facebook: '',

    /* An address for the enquiry form to fall back to. Empty means the
       fallback offers Instagram and WhatsApp only — never a broken mailto. */
    email: '',

    /* WhatsApp: international format, digits only, no + and no spaces,
       e.g. '447700900123'. While this is empty the floating bubble opens an
       Instagram DM instead — which is where her bio already sends people. */
    whatsapp: '',

    /* Google Business: the "see all reviews" and "write a review" links.
       Leave empty until the profile exists and the buttons stay hidden. */
    googleReviews: '',
    googleWrite: '',

    /* The fundraiser linked from her Instagram bio. Clear this when the
       campaign ends and the charity card loses its button, not its meaning. */
    charity: 'https://gofund.me/4b825a399',

    area: 'Stoke-on-Trent'
  };

  /* Web3Forms delivers the enquiry form to her inbox. Create the key free at
     web3forms.com against her email address and paste it here. With no key
     the form still works: it hands the visitor everything they typed, already
     written out, one tap from a DM — so an order is never lost just because
     the key has not been set up yet. */
  var W3F_KEY = '';

  /* ------------------------------------------------------------------ MENU
     Taken straight off her own menu graphic. A price of '' shows "Ask" —
     which is what her menu does for the minis and the wrapped items. */
  var MENU = [
    { name: 'Minis', price: '', sub: 'Box of 10, 20 or 30',
      text: 'Bite-sized. Perfect when there are a lot of you.',
      opt: 'Brownies & blondies', img: 'mn-mini' },
    { name: 'Small box', price: '£10', sub: 'Box of 6',
      text: 'Six pieces. A little treat, or a present.',
      opt: 'Brownies · blondies · brookies', img: 'mn-small' },
    { name: 'Regular box', price: '£15', sub: 'Box of 9',
      text: 'The one most people go for.',
      opt: 'Brownies · blondies · brookies', img: 'mn-regular' },
    { name: 'Large box', price: '£20', sub: 'Box of 12',
      text: 'Twelve, mixed however you like them.',
      opt: 'Brownies · blondies · brookies', img: 'mn-large' },
    { name: 'Personalised slab', price: '£20', sub: 'One whole slab',
      text: 'A full slab with your message on it.',
      opt: 'Brownie or blondie slab', img: 'mn-slab' },
    { name: 'NYC cookies', price: '£2', sub: 'Each · premium £3',
      text: 'Thick, soft in the middle. As they should be.',
      opt: 'Standard & premium flavours', img: 'mn-cookies' },
    { name: 'Cake pops', price: '£1.50', sub: 'Each',
      text: 'Little ones love them.',
      opt: 'Brownie or blondie flavour', img: 'mn-pops' },
    { name: 'Individually wrapped', price: '', sub: 'Priced per item',
      text: 'Favours, hampers, goody bags and postals.',
      opt: 'Cookies · brownies · blondies · brookies', img: 'mn-wrapped' }
  ];

  /* -------------------------------------------------------------- FLAVOURS */
  var FLAVOURS = [
    { tab: 'Brownies & blondies',
      standard: ['Oreo', 'Biscoff', 'Nutella', 'Milk choc', 'White choc', 'Dark choc',
                 'Jammie Dodger', 'Kinder sticks', 'Fresh strawberry'],
      premium: ['Hazelnut crème', 'Pistachio', 'Kinder Bueno', 'Ferrero Rocher / Raffaello',
                'Mini egg', "Reese's cups", "Terry's Chocolate Orange", 'Dried raspberry'] },
    { tab: 'NYC cookies',
      standard: ['Oreo', 'Biscoff', 'Milk choc chip', 'White choc chip', 'Dark choc chip', 'Kinder sticks'],
      premium: ['Pistachio & white choc', 'Kinder Bueno', 'Ferrero Rocher / Raffaello', 'Mini egg',
                "Reese's cups", "Terry's Chocolate Orange", 'Raspberry & white choc', 'Matcha & white choc'] }
  ];

  /* ------------------------------------------------------------- OCCASIONS */
  var OCCASIONS = [
    { title: 'Eid', text: 'Eid boxes and specials, up on my page as the date comes round.', img: 'oc-eid', tall: true },
    { title: 'Birthdays', text: 'Slabs with the name on, and boxes for the table.', img: 'oc-birthday' },
    { title: 'Ramadan', text: 'Orders all month, and bakes put out for charity.', img: 'oc-ramadan' },
    { title: 'Baby showers', text: 'Pastel boxes and cake pops to match your theme.', img: 'oc-baby', tall: true },
    { title: 'Favours', text: 'Wrapped singles for weddings, nikkahs and party bags.', img: 'oc-favours' },
    { title: 'Thank-yous', text: 'A box posted to someone who deserves one.', img: 'oc-thanks' }
  ];

  /* ---------------------------------------------------------- AVAILABILITY
     An example month, laid out the way she posts it on her story. `booked`
     is a list of day numbers. Set it each month, or clear `example` once the
     dates are real so the "Example" chip and the note come off. */
  var AVAILABILITY = {
    example: true,
    booked: [3, 4, 5, 6, 10, 11, 12, 20, 21, 22, 24, 28, 29],
    note: 'I post each month’s availability on Instagram. This one is an example of how it will look here — the dates are not the real ones yet.'
  };

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
      { name: 'Hafsa B.', when: 'Box of 12, posted to Leeds',
        text: 'Ordered for my sister’s birthday and they arrived perfect, nothing broken. The biscoff one did not make it to the evening.' },
      { name: 'Aaliyah R.', when: 'Eid boxes, collection',
        text: 'Got four boxes for Eid and every single person asked where they were from. Beautifully packaged as well, I did not want to open them.' },
      { name: 'Zain M.', when: 'NYC cookies, Stoke',
        text: 'The kinder bueno cookie is unreal. Thick, still soft in the middle. I have ordered three times since and I am not stopping.' },
      { name: 'Chloe W.', when: 'Personalised slab',
        text: 'Asked for a slab with a message on it for an anniversary and she got it spot on. Tasted even better than it looked.' },
      { name: 'Nadia K.', when: 'Favours, posted UK-wide',
        text: 'Ordered individually wrapped ones for our nikkah favours. Arrived early, packed properly, and the guests kept asking for the page.' }
    ]
  };

  /* ====================================================== small DOM helpers */

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PH = '../assets/brownielicious/photos/';

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function fxRefresh() { if (window.ScrollFXKit) window.ScrollFXKit.refresh(); }

  /* The icons, once. */
  var ICON = {
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5 0-.2 0-.4 0-.5 0-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.3 5.2 4.6.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>',
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>',
    tt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.4 2.2 1.7 3.6 3.9 3.8v2.5c-1.3.1-2.6-.2-3.8-.9v5.7c0 4.3-3.6 6.9-7.1 5.6-2.3-.9-3.6-3.2-3.3-5.7.3-2.4 2.3-4.2 4.8-4.3.3 0 .6 0 .9.1v2.6c-.3-.1-.6-.2-1-.1-1.2.1-2.1 1.1-2.1 2.3.1 1.3 1.3 2.3 2.6 2.1 1.2-.1 2.1-1.2 2.1-2.5V3h3z"/></svg>',
    fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8.5V7c0-.7.5-1 1-1h2V3h-2.7C11.6 3 10.5 4.6 10.5 7v1.5H8V12h2.5v9H14v-9h2.6l.4-3.5H14z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 8l9-4 9 4v8l-9 4-9-4z"/><path d="M3 8l9 4 9-4M12 12v8"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5-4.8-4.6 6.6-.9z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8c0 4.8-7 9.2-7 9.2z"/></svg>',
    google: '<svg viewBox="0 0 48 48"><path fill="#4285F4" d="M45 24.3c0-1.5-.1-2.9-.4-4.3H24v8.1h11.8c-.5 2.7-2 5-4.3 6.6v5.5h7c4.1-3.8 6.5-9.4 6.5-15.9z"/><path fill="#34A853" d="M24 46c5.8 0 10.7-1.9 14.3-5.3l-7-5.5c-1.9 1.3-4.4 2.1-7.3 2.1-5.6 0-10.4-3.8-12.1-8.9H4.7v5.6C8.3 41.2 15.6 46 24 46z"/><path fill="#FBBC05" d="M11.9 28.4a13.2 13.2 0 0 1 0-8.8v-5.6H4.7a22 22 0 0 0 0 20l7.2-5.6z"/><path fill="#EA4335" d="M24 9.9c3.2 0 6 1.1 8.2 3.2l6.2-6.2C34.7 3.4 29.8 1.4 24 1.4 15.6 1.4 8.3 6.2 4.7 13.2l7.2 5.6c1.7-5.1 6.5-8.9 12.1-8.9z"/></svg>'
  };

  /* ====================================================== where "message us"
     actually goes. One decision, used by every button on the page. */

  function waHref(text) {
    var msg = encodeURIComponent(text || 'Hi Brownielicious — I’d like to order some brownies please.');
    if (CONTACT.whatsapp) return 'https://wa.me/' + CONTACT.whatsapp + '?text=' + msg;
    return CONTACT.instagram;          // her bio's own route: DM to order
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
        var html = document.documentElement, was = html.style.scrollBehavior;
        html.style.scrollBehavior = 'auto';
        window.scrollTo(0, lockedAt);
        html.style.scrollBehavior = was;
      }
    }
  }

  /* `jump` means put me there, now. Watching the whole page fly past on the
     way to a section is a lot of motion to sit through, especially from a
     menu, so every menu link and everything on a touch screen jumps. */
  /* The sticky header's height. The smooth-scroll library, the instant jump
     and the browser's own scroll-margin-top must all use the same number or
     a section lands in a slightly different place depending on the route. */
  var HEAD = 84;

  function scrollToHash(hash, jump) {
    var target = hash && hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
    if (!target) return false;
    if (jump || reduced) {
      var html = document.documentElement, was = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';
      if (lenis) lenis.scrollTo(target, { offset: -HEAD, immediate: true });
      else window.scrollTo(0, target.getBoundingClientRect().top + (window.scrollY || 0) - HEAD);
      html.style.scrollBehavior = was;
    } else if (lenis) {
      lenis.scrollTo(target, { offset: -HEAD, duration: 1.3 });
    } else {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    return true;
  }

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
    var jump = wasOpen || !fine || !!a.closest('.nav, .drawer');
    closeDrawer();
    if (wasOpen && !lenis) requestAnimationFrame(function () { scrollToHash(hash, jump); });
    else scrollToHash(hash, jump);
    history.replaceState(null, '', hash);
  });

  /* ================================================================ loader */

  window.addEventListener('load', function () {
    setTimeout(function () {
      var l = $('#loader');
      if (l) l.classList.add('gone');
      $('#chat').classList.add('in');
    }, reduced ? 0 : 850);
  });

  /* ==================================================== nav, drawer, header */

  burger.addEventListener('click', function () {
    var open = !drawer.classList.contains('open');
    drawer.classList.toggle('open', open);
    burger.classList.toggle('on', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (lenis) { open ? lenis.stop() : lenis.start(); }
    lockScroll(open);
    $$('a', drawer).forEach(function (a, i) {
      a.style.transitionDelay = open ? (0.12 + i * 0.05) + 's' : '0s';
    });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeDrawer(); closeLb(); } });

  function onScroll() {
    nav.classList.toggle('stuck', (window.scrollY || document.documentElement.scrollTop) > 40);
  }
  (lenis ? lenis.on('scroll', onScroll) : window.addEventListener('scroll', onScroll, { passive: true }));
  onScroll();

  /* ===================================================== drifting sprinkles */
  /* Hundreds-and-thousands, drifting. Drawn as plain elements rather than
     emoji or cut-out photographs: a photographed sprinkle over a photograph
     of a brownie looks like a mistake, a soft coloured capsule reads as
     texture. Size, tint, drift and duration are random per sprinkle, and the
     whole thing is skipped when the visitor asks for reduced motion. */

  (function sprinkles() {
    var TINTS = ['#e87cbb', '#f2c2dc', '#ffe7fd', '#6b2626', '#8a4b2a', '#71804a', '#f3b94d'];
    /* A blurred, composited layer costs a phone something on every scroll
       frame, and thirty of them cost it thirty times that. Small screens get
       fewer and no blur. */
    var small = Math.min(window.innerWidth, window.innerHeight) < 760;

    $$('[data-sprinkles]').forEach(function (field) {
      var n = parseInt(field.getAttribute('data-sprinkles'), 10) || 18;
      if (small) n = Math.round(n * 0.6);
      if (reduced) n = Math.min(n, 6);
      for (var i = 0; i < n; i++) {
        var round = Math.random() < 0.34;
        var w = round ? 5 + Math.random() * 6 : 4 + Math.random() * 3;
        var h = round ? w : w * (2.4 + Math.random() * 1.6);
        var deep = Math.random();
        var travel = 120 + Math.random() * 200;
        var s = el('i');
        s.style.cssText =
          'width:' + w.toFixed(1) + 'px;height:' + h.toFixed(1) + 'px;' +
          'background:' + TINTS[(Math.random() * TINTS.length) | 0] + ';' +
          'left:' + (Math.random() * 97 - 2).toFixed(2) + '%;' +
          'top:' + (Math.random() * 92 - 3).toFixed(2) + '%;' +
          'opacity:' + (0.22 + deep * 0.5).toFixed(2) + ';' +
          (small ? '' : 'filter:blur(' + ((1 - deep) * 1.1).toFixed(2) + 'px);') +
          '--y0:' + (travel * 0.45).toFixed(0) + 'px;' +
          '--y1:' + (-travel * 0.55).toFixed(0) + 'px;' +
          '--x0:' + (-8 - Math.random() * 20).toFixed(0) + 'px;' +
          '--x1:' + (8 + Math.random() * 20).toFixed(0) + 'px;' +
          '--r0:' + (-40 - Math.random() * 90).toFixed(0) + 'deg;' +
          '--r1:' + (40 + Math.random() * 120).toFixed(0) + 'deg;' +
          '--d:' + (14 + Math.random() * 12).toFixed(1) + 's;' +
          '--s:' + (5 + Math.random() * 5).toFixed(1) + 's;' +
          'animation-delay:' + (-Math.random() * 20).toFixed(1) + 's,' +
                         '-' + (Math.random() * 8).toFixed(1) + 's';
        field.appendChild(s);
      }
    });
  }());

  /* =============================================================== marquee */

  /* iOS and iPadOS will not paint a moving layer wider than about 4096
     DEVICE pixels, and they fail silently: the band came out as an empty
     brown bar on her phone and was perfect in every desktop browser.
     Making one long strip and animating it cannot be fixed by making the
     strip shorter, because to cover a 2560px band the moving element has
     to BE 2560px — 5120 device pixels on a retina screen. So nothing long
     moves here. The strip is cut into short runs, each of which animates
     itself by exactly its own width. They are identical and they move in
     lockstep, so the row reads as one continuous strip, while no layer is
     ever wider than one run whatever the screen. */
  (function marquee() {
    var track = $('#marquee');
    if (!track) return;
    var band = track.parentNode;
    var words = ['Brownies', 'Blondies', 'Brookies', 'NYC cookies', 'Cake pops',
      'Personalised slabs', 'Halal', 'UK-wide postals', 'Made with love'];

    function build() {
      var wide = band.clientWidth || 360;
      /* One run's own layer is all that has to stay small. The limit is in
         device pixels, so a 3x phone can afford a third of what a 1x screen
         can; 1600 device pixels leaves plenty of room under it. */
      var dpr = window.devicePixelRatio || 1;
      var target = Math.min(wide, Math.max(420, 1600 / dpr));

      track.innerHTML = '';
      var run = el('div', { class: 'band-run' });
      track.appendChild(run);
      for (var i = 0; i < 40 && run.getBoundingClientRect().width < target; i++) {
        run.insertAdjacentHTML('beforeend', '<span>' + esc(words[i % words.length]) + '</span>');
      }
      var runW = run.getBoundingClientRect().width;
      if (!runW) return;

      /* Every run slides one run's width and repeats. At any moment the
         runs cover (k-1) runs of band, so k-1 runs must span it. */
      var runs = Math.ceil(wide / runW) + 1;
      for (var c = 1; c < runs; c++) track.appendChild(run.cloneNode(true));
      track.style.setProperty('--run', runW.toFixed(1) + 'px');
      track.style.setProperty('--dur', Math.max(7, Math.round(runW / 48)) + 's');
    }

    build();
    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t); t = setTimeout(build, 250);
    });
  }());

  /* ================================================================== menu */

  (function menu() {
    var host = $('#menuGrid');
    if (!host) return;
    MENU.forEach(function (m, i) {
      var card = el('article', {
        class: 'item', 'data-tilt': '',
        'data-fx': 'reveal', 'data-fx-delay': String((i % 4) * 80)
      });
      card.innerHTML =
        '<div class="item-art">' +
          '<img src="' + PH + m.img + '.jpg" alt="' + esc(m.name) + '" width="900" height="900" loading="lazy">' +
          '<span class="item-price' + (m.price ? '' : ' ask') + '">' + (m.price || 'Ask') + '</span>' +
        '</div>' +
        '<div class="item-body">' +
          '<h3>' + esc(m.name) + '</h3>' +
          '<p><b>' + esc(m.sub) + '</b> — ' + esc(m.text) + '</p>' +
          '<span class="opt">' + esc(m.opt) + '</span>' +
        '</div>';
      host.appendChild(card);
    });
  }());

  /* ============================================================== flavours */

  (function flavours() {
    var tabs = $('#flavTabs'), panels = $('#flavPanels');
    if (!tabs) return;

    function list(items, cls) {
      return '<div class="chips ' + cls + '">' + items.map(function (f) {
        return '<span class="f">' + esc(f) + '</span>';
      }).join('') + '</div>';
    }

    FLAVOURS.forEach(function (f, i) {
      var id = 'flav' + i;
      var b = el('button', {
        type: 'button', class: 'flav-tab' + (i === 0 ? ' on' : ''),
        role: 'tab', 'aria-selected': i === 0 ? 'true' : 'false', 'aria-controls': id
      }, esc(f.tab));
      tabs.appendChild(b);

      var p = el('div', { class: 'flav-panel' + (i === 0 ? ' on' : ''), id: id, role: 'tabpanel' });
      p.innerHTML =
        '<div class="flav-col"><h3>Standard <small>included</small></h3>' + list(f.standard, '') + '</div>' +
        '<div class="flav-col"><h3>Premium <small>a little extra</small></h3>' + list(f.premium, 'prem') + '</div>';
      panels.appendChild(p);

      b.addEventListener('click', function () {
        $$('.flav-tab', tabs).forEach(function (t) { t.classList.remove('on'); t.setAttribute('aria-selected', 'false'); });
        $$('.flav-panel', panels).forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        b.setAttribute('aria-selected', 'true');
        p.classList.add('on');
      });
    });
  }());

  /* =============================================================== gallery */

  var GALLERY = [
    { img: 'gal-1', title: 'Walnut brownie tray', kind: 'Brownies' },
    { img: 'gal-2', title: 'NYC cookie stack', kind: 'Cookies' },
    { img: 'gal-3', title: 'Blondie squares', kind: 'Blondies' },
    { img: 'gal-4', title: 'Raspberry & almond', kind: 'Brownies' },
    { img: 'gal-5', title: 'Pastel dessert table', kind: 'Occasions' },
    { img: 'gal-6', title: 'Straight off the tray', kind: 'Cookies' },
    { img: 'gal-7', title: 'Chocolate drizzle slab', kind: 'Slabs' },
    { img: 'gal-8', title: 'Cake pops, iced', kind: 'Cake pops' },
    { img: 'gal-9', title: 'Fresh from the oven', kind: 'Cookies' },
    { img: 'gal-10', title: 'Boxed and ribboned', kind: 'Gifting' }
  ];

  (function gallery() {
    var rail = $('#gal');
    if (!rail) return;
    GALLERY.forEach(function (g) {
      var t = el('figure', { class: 'tile', 'data-lb': '' });
      t.innerHTML =
        '<img src="' + PH + g.img + '.jpg" alt="' + esc(g.title) + '" width="1000" height="1250" loading="lazy">' +
        '<figcaption class="cap"><b>' + esc(g.title) + '</b><em>' + esc(g.kind) + '</em></figcaption>';
      rail.appendChild(t);
    });
  }());

  /* ========================================================== availability */

  (function calendar() {
    var grid = $('#calGrid'), title = $('#calMonth'), note = $('#calNote');
    if (!grid) return;

    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth(), today = now.getDate();
    var first = new Date(y, m, 1).getDay();            // 0 = Sunday
    first = (first + 6) % 7;                           // week starts Monday
    var days = new Date(y, m + 1, 0).getDate();

    title.textContent = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) + ' availability';

    var html = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (d) {
      return '<i>' + d + '</i>';
    }).join('');
    for (var p = 0; p < first; p++) html += '<b class="pad"></b>';
    for (var d = 1; d <= days; d++) {
      var cls = [];
      if (d < today) cls.push('gone');
      else if (AVAILABILITY.booked.indexOf(d) > -1) cls.push('booked');
      if (d === today) cls.push('today');
      html += '<b class="' + cls.join(' ') + '">' + d + '</b>';
    }
    grid.innerHTML = html;

    note.textContent = AVAILABILITY.example ? AVAILABILITY.note : '';
    if (!AVAILABILITY.example) {
      var chip = $('.cal-head span');
      if (chip) chip.hidden = true;
    }
  }());

  /* ============================================================= occasions */

  (function occasions() {
    var host = $('#occGrid');
    if (!host) return;
    OCCASIONS.forEach(function (o, i) {
      var c = el('article', {
        class: 'occ' + (o.tall ? ' tall' : ''),
        'data-fx': 'reveal', 'data-fx-delay': String((i % 3) * 90)
      });
      c.innerHTML =
        '<img src="' + PH + o.img + '.jpg" alt="' + esc(o.title) + '" width="1200" height="800" loading="lazy">' +
        '<div class="oc-in"><h3>' + esc(o.title) + '</h3><p>' + esc(o.text) + '</p></div>';
      host.appendChild(c);
    });

    $('#giveCta').innerHTML =
      '<a class="btn" href="' + CONTACT.instagram + '" target="_blank" rel="noopener">Follow on Instagram</a>' +
      '<a class="btn ghost" href="' + CONTACT.tiktok + '" target="_blank" rel="noopener">And on TikTok</a>';

    $('#charityCta').innerHTML = CONTACT.charity
      ? '<a class="btn ghost" href="' + CONTACT.charity + '" target="_blank" rel="noopener">See the fundraiser</a>'
      : '';
  }());

  /* =============================================================== reviews */

  (function reviews() {
    var rail = $('#rvRail'), score = $('#rvScore'), note = $('#rvNote');
    if (!rail) return;
    var stars = '<span class="stars" aria-hidden="true">' + ICON.star.repeat(5) + '</span>';

    if (REVIEWS.sample) {
      score.innerHTML =
        '<span class="g">' + ICON.google + '</span>' +
        '<div><b>' + REVIEWS.rating + '</b>' + stars +
        '<small>Google reviews — example layout</small></div>';
      note.innerHTML =
        'These cards show how the Google reviews will look once the Google ' +
        'Business profile is live. They are examples, labelled as such until ' +
        'the real ones are in — see REVIEWS in brownielicious.js.';
    } else {
      score.innerHTML =
        '<span class="g">' + ICON.google + '</span>' +
        '<div><b>' + REVIEWS.rating + '</b>' + stars +
        '<small>' + REVIEWS.count + ' Google reviews</small></div>';
      note.innerHTML = CONTACT.googleWrite
        ? '<a href="' + CONTACT.googleWrite + '" target="_blank" rel="noopener">Leave a review on Google</a>'
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
        '<p>“' + esc(r.text) + '”</p>' +
        '<div class="rv-who"><span class="rv-av" aria-hidden="true">' + esc(r.name.charAt(0)) + '</span>' +
        '<span><b>' + esc(r.name) + '</b><small>' + esc(r.when) + '</small></span></div>' +
        (REVIEWS.sample ? '<span class="rv-tag">Example</span>' : '');
      rail.appendChild(card);
    });
  }());

  /* ================================================================= rails */
  /* The gallery, the steps and the reviews are strips you drag, flick or
     arrow along. Native overflow scrolling already handles the wheel and the
     touch flick; what it does not give you is a grab-and-throw with a mouse,
     or an arrow button that glides instead of jumping. Both are here, and
     both leave the element's own scrollLeft as the single source of truth,
     so the scrollbar, the snap points and the keyboard stay honest. */

  (function rails() {
    /* easeInOutCubic: starts slow, gets on with it, arrives slowly. An
       ease-out alone leaves the first frames jumping away from your thumb. */
    var ease = function (t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    /* Where a card edge would sit if it were parked at the left of the strip.
       Stepping to one of these, rather than by "one card width", is what makes
       the arrow land on a card every time instead of drifting out of step. */
    function stops(rail) {
      var rr = rail.getBoundingClientRect();
      var pad = parseFloat(getComputedStyle(rail).paddingLeft) || 0;
      var max = rail.scrollWidth - rail.clientWidth;
      var out = [];
      [].forEach.call(rail.children, function (c) {
        if (c.nodeType !== 1 || c.hidden) return;
        var at = Math.round(rail.scrollLeft + (c.getBoundingClientRect().left - rr.left) - pad);
        out.push(Math.max(0, Math.min(max, at)));
      });
      out.push(max);
      return out.sort(function (a, b) { return a - b; });
    }

    function stepTo(rail, dir) {
      var from = rail.__to != null ? rail.__to : rail.scrollLeft;
      var list = stops(rail), i;
      if (dir > 0) {
        for (i = 0; i < list.length; i++) if (list[i] > from + 4) return list[i];
        return list[list.length - 1];
      }
      for (i = list.length - 1; i >= 0; i--) if (list[i] < from - 4) return list[i];
      return 0;
    }

    /* Snapping and the browser's own smooth scrolling both want to own
       scrollLeft. While we are animating it ourselves, they are switched off;
       without that the two animations fight each other and the strip judders. */
    function takeOver(rail) {
      rail.style.scrollSnapType = 'none';
      rail.style.scrollBehavior = 'auto';
    }
    function handBack(rail) {
      rail.style.scrollSnapType = '';
      rail.style.scrollBehavior = '';
    }

    function glide(rail, to) {
      var from = rail.scrollLeft;
      var max = rail.scrollWidth - rail.clientWidth;
      to = Math.max(0, Math.min(max, Math.round(to)));
      cancelAnimationFrame(rail.__glide);
      cancelAnimationFrame(rail.__flick);
      if (Math.abs(to - from) < 1) { rail.__to = null; return; }
      if (reduced) { takeOver(rail); rail.scrollLeft = to; handBack(rail); rail.__to = null; return; }

      rail.__to = to;
      takeOver(rail);
      /* far to go, a little longer to get there — but never a crawl */
      var ms = Math.min(820, 320 + Math.abs(to - from) * 0.42);
      var t0 = performance.now();
      (function frame(now) {
        var k = Math.min(1, (now - t0) / ms);
        rail.scrollLeft = from + (to - from) * ease(k);
        if (k < 1) { rail.__glide = requestAnimationFrame(frame); }
        else { rail.__to = null; handBack(rail); }
      }(t0));
    }

    $$('[data-rail]').forEach(function (rail) {
      var prev = $('[data-rail-prev="' + rail.id + '"]');
      var next = $('[data-rail-next="' + rail.id + '"]');
      var ctrl = prev && prev.parentNode;

      function ends() {
        var max = rail.scrollWidth - rail.clientWidth - 1;
        if (prev) prev.disabled = rail.scrollLeft <= 1;
        if (next) next.disabled = rail.scrollLeft >= max;
        /* nothing to scroll — four steps on a wide screen, say — so the whole
           row of arrows goes away rather than sitting there greyed out */
        if (ctrl) ctrl.hidden = max <= 1;
      }
      rail.addEventListener('scroll', ends, { passive: true });
      window.addEventListener('resize', ends);
      setTimeout(ends, 80);
      window.addEventListener('load', ends);

      function go(dir) { glide(rail, stepTo(rail, dir)); }
      if (prev) prev.addEventListener('click', function () { go(-1); });
      if (next) next.addEventListener('click', function () { go(1); });

      rail.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
        if (e.key === 'Home') { e.preventDefault(); glide(rail, 0); }
        if (e.key === 'End') { e.preventDefault(); glide(rail, rail.scrollWidth); }
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
        rail.__to = null;
        takeOver(rail);
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

      /* However it ended, finish on a card edge rather than halfway across one. */
      function settle() {
        var list = stops(rail), at = rail.scrollLeft, best = list[0];
        for (var i = 1; i < list.length; i++) {
          if (Math.abs(list[i] - at) < Math.abs(best - at)) best = list[i];
        }
        if (Math.abs(best - at) > 1) glide(rail, best);
        else handBack(rail);
      }

      function release() {
        if (!down) return;
        down = false;
        rail.classList.remove('dragging');
        if (moved > 6) {
          rail.__drag = Date.now();            // a click that ended a drag is not a click
          if (!reduced && Math.abs(v) > 0.15) {
            var speed = v * 16;                // carry the throw on
            (function decay() {
              speed *= 0.94;
              rail.scrollLeft -= speed;
              if (Math.abs(speed) > 0.4) rail.__flick = requestAnimationFrame(decay);
              else settle();
            }());
            return;
          }
          settle();
          return;
        }
        handBack(rail);
      }
      window.addEventListener('pointerup', release);
      window.addEventListener('pointercancel', release);
      rail.addEventListener('dragstart', function (e) { e.preventDefault(); });
    });
  }());

  /* ============================================== menu tiles: gentle tilt */

  (function tilt() {
    if (reduced || window.matchMedia('(hover: none)').matches) return;
    $$('[data-tilt]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          'translateY(-7px) perspective(900px) rotateX(' + (-y * 4.5).toFixed(2) +
          'deg) rotateY(' + (x * 5.5).toFixed(2) + 'deg)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  }());

  /* =============================================================== lightbox */

  var lb = $('#lb'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  var tiles = $$('[data-lb]'), lbAt = 0;

  function openLb(i) {
    lbAt = (i + tiles.length) % tiles.length;
    var img = $('img', tiles[lbAt]);
    var cap = $('.cap', tiles[lbAt]);
    lbImg.src = img.src;
    lbImg.alt = img.alt;
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
        '<a href="' + CONTACT.tiktok + '" target="_blank" rel="noopener" aria-label="TikTok">' + ICON.tt + '</a>' +
        (CONTACT.facebook ? '<a href="' + CONTACT.facebook + '" target="_blank" rel="noopener" aria-label="Facebook">' + ICON.fb + '</a>' : '') +
        (hasWA ? '<a href="' + waHref() + '" target="_blank" rel="noopener" aria-label="WhatsApp">' + ICON.wa + '</a>' : '') +
        (CONTACT.email ? '<a href="mailto:' + CONTACT.email + '" aria-label="Email">' + ICON.mail + '</a>' : '');
    }
    ['#footSocial', '#sideSocial', '#drawerSocial'].forEach(function (s) { socialRow($(s)); });

    /* the three ways to reach her, beside the form */
    var ways = $('#enqWays');
    if (ways) {
      ways.innerHTML =
        (hasWA
          ? '<a class="way" href="' + waHref() + '" target="_blank" rel="noopener">' + ICON.wa +
            '<span><b>WhatsApp</b><small>Quickest for a question about a date</small></span></a>'
          : '') +
        '<a class="way" href="' + CONTACT.instagram + '" target="_blank" rel="noopener">' + ICON.ig +
          '<span><b>Instagram DM</b><small>@browniieliciousss — where most orders start</small></span></a>' +
        '<a class="way" href="' + CONTACT.tiktok + '" target="_blank" rel="noopener">' + ICON.tt +
          '<span><b>TikTok</b><small>New flavours and giveaways go up here first</small></span></a>' +
        '<span class="way" style="cursor:default">' + ICON.pin +
          '<span><b>' + esc(CONTACT.area) + '</b><small>Collect locally, or posted UK-wide</small></span></span>';
    }

    var foot = $('#footContact');
    if (foot) {
      foot.innerHTML =
        '<li><a href="' + CONTACT.instagram + '" target="_blank" rel="noopener">Instagram</a></li>' +
        '<li><a href="' + CONTACT.tiktok + '" target="_blank" rel="noopener">TikTok</a></li>' +
        (CONTACT.facebook ? '<li><a href="' + CONTACT.facebook + '" target="_blank" rel="noopener">Facebook</a></li>' : '') +
        (hasWA ? '<li><a href="' + waHref() + '" target="_blank" rel="noopener">WhatsApp</a></li>' : '') +
        (CONTACT.email ? '<li><a href="mailto:' + CONTACT.email + '">' + esc(CONTACT.email) + '</a></li>' : '') +
        '<li><a href="#enquire">Order enquiry form</a></li>' +
        '<li>' + esc(CONTACT.area) + ' · UK-wide postals</li>';
    }

    var route = $('#msgRoute');
    if (route) {
      route.textContent = hasWA
        ? 'Prefer to message? I am on WhatsApp and Instagram, and answer both.'
        : 'Prefer to message? A DM on Instagram gets picked up fastest.';
    }

    var chat = $('#chat');
    chat.classList.toggle('dm', !hasWA);
    chat.innerHTML = (hasWA ? ICON.wa : ICON.ig) +
      '<span>' + (hasWA ? 'WhatsApp us' : 'Message us') + '</span>';
    chat.setAttribute('aria-label', hasWA ? 'Message us on WhatsApp' : 'Message us on Instagram');
    chat.addEventListener('click', function () { window.open(waHref(), '_blank', 'noopener'); });

    $('#yr').textContent = new Date().getFullYear();
  }());

  /* ============================================================= want chips */

  var WANTS = ['Brownies', 'Blondies', 'Brookies', 'NYC cookies', 'Cake pops',
    'Personalised slab', 'A mixed box', 'Favours / wrapped'];

  (function chips() {
    var host = $('#wantChips'), hidden = $('#want');
    if (!host) return;
    WANTS.forEach(function (name, i) {
      var b = el('button', {
        type: 'button', class: 'chip' + (i === 0 ? ' on' : ''),
        'aria-pressed': i === 0 ? 'true' : 'false'
      }, esc(name));
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
    if (!form) return;

    function val(id) { var n = $('#' + id); return n ? n.value.trim() : ''; }

    /* Everything they typed, in the order it was asked for. Used both for the
       message that goes to her and for the fallback below — the two must never
       disagree about what the order said. */
    function summary() {
      return [
        ['Wants', val('want')],
        ['Name', val('name')],
        ['Email', val('email')],
        ['Phone / Instagram', val('phone')],
        ['Date needed', val('date')],
        ['Box size', val('size')],
        ['Collection or postal', val('how')],
        ['Occasion', val('occasion')],
        ['Flavours', val('flavs')],
        ['Notes', val('msg')]
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
      var body = 'Order enquiry from the Brownielicious website\n\n' + lines;
      var subject = 'Order enquiry — ' + val('want') + (val('date') ? ' for ' + val('date') : '');
      var mail = CONTACT.email
        ? 'mailto:' + CONTACT.email + '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(body)
        : '';
      show('err',
        '<b>We could not send that from here.</b><br>' +
        'Nothing you typed is lost — ' +
        (mail ? '<a href="' + mail + '">open it as an email</a> or ' : '') +
        '<a href="' + waHref(body) + '" target="_blank" rel="noopener">' +
        (hasWA ? 'send it on WhatsApp' : 'send it as an Instagram message') + '</a>, ' +
        'and it is already written for you.');
      if (reason) console.warn('[enquiry] ' + reason);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (val('company')) return;                       // honeypot: a bot filled it

      if (!val('name') || !val('email')) {
        show('err', 'Please give your name and an email address so I can reply.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val('email'))) {
        show('err', 'That email address does not look quite right — could you check it?');
        return;
      }

      msg.className = 'form-msg';

      if (!W3F_KEY) { fallback('no Web3Forms key set — see W3F_KEY in brownielicious.js'); return; }

      var payload = {
        access_key: W3F_KEY,
        subject: 'Order enquiry — ' + val('want') + (val('date') ? ' for ' + val('date') : ''),
        from_name: 'Brownielicious website',
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
      '<a class="btn ghost" href="#gallery">Back to the gallery</a>';
  }());

  /* ======================================================== scroll reveals */
  /* Handled by the global data-fx toolkit (assets/js/scroll-fx.js). Two
     things it cannot know about on its own: everything above was built after
     it first ran, and the hero is never scrolled INTO. */

  fxRefresh();

  (function heroOnLoad() {
    $$('.hero [data-fx]').forEach(function (n, i) {
      if (n.getAttribute('data-fx') === 'parallax') return;
      setTimeout(function () { n.classList.add('fx-in'); }, reduced ? 0 : 420 + i * 140);
    });
  }());

}());
