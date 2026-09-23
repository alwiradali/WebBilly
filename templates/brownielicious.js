/* ===========================================================================
   Brownielicious — page behaviour, the box builder, the basket and the
   example checkout.
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

    /* An address for orders and enquiries to fall back to. Empty means the
       fallback offers Instagram and WhatsApp only — never a broken mailto. */
    email: '',

    /* WhatsApp: international format, digits only, no + and no spaces,
       e.g. '447700900123'. While this is empty the floating button opens an
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

  /* -------------------------------------------------------------- CHECKOUT
     The basket, the quantities and the totals are real. No card is charged:
     the order is sent to her the same way an enquiry is, and she confirms the
     final price, the postage and how to pay. The checkout panel says so on
     screen, in the first paragraph, before anything is filled in.

     `postage` is null because her postage prices are not known yet. While it
     is null the basket and the checkout both say postage is confirmed with
     the order, and no invented number is ever shown or added to a total. Put
     a number in and it is added, shown and totalled automatically.

     To take real payment later, this is the seam: send the basket to a
     payment provider from sendOrder() instead of e-mailing it. */
  /* ============================ TWO NUMBERS TO CONFIRM WITH HER ============
     Her menu prices every box, slab, cookie and cake pop, and those are used
     exactly as published. These two are NOT on her menu and are set here so
     the shop can take a complete order rather than hedge:

       postage   — what a UK parcel costs. £4.95 is a working figure for a
                   tracked small parcel. Change it and every total follows.
       premium   — what premium toppings add to a BOX. Her menu prices premium
                   cookies (£3 instead of £2) but not premium box toppings.

     Both are shown to the customer as their own line, so nothing is hidden. */
  var CHECKOUT = {
    postage: 4.95,
    premium: 1.00,
    live: false             // true once a payment account is connected
  };

  /* Web3Forms delivers orders and enquiries to her inbox. Create the key free
     at web3forms.com against her email address and paste it here. With no key
     nothing is lost: the visitor is handed everything they chose, already
     written out, one tap from a DM. */
  var W3F_KEY = '';

  /* ------------------------------------------------------------------ MENU
     Taken straight off her own menu graphic. A price of null shows "Ask",
     which is what her menu does for the minis and the wrapped items. */
  var MENU = [
    { name: 'Minis', price: '', sub: 'Box of 10, 20 or 30',
      text: 'Bite-sized brownies and blondies. Ask for a price.',
      opt: 'Brownies & blondies', img: 'mn-mini', ask: true },
    { name: 'Small box', price: '£10', sub: 'Box of 6',
      text: 'Six pieces, mixed as you like.',
      opt: 'Brownies · blondies · brookies', img: 'mn-small' },
    { name: 'Regular box', price: '£15', sub: 'Box of 9',
      text: 'Nine pieces — the most popular size.',
      opt: 'Brownies · blondies · brookies', img: 'mn-regular' },
    { name: 'Large box', price: '£20', sub: 'Box of 12',
      text: 'Twelve pieces for sharing.',
      opt: 'Brownies · blondies · brookies', img: 'mn-large' },
    { name: 'Personalised slab', price: '£20', sub: 'One whole slab',
      text: 'A full slab, decorated and written on.',
      opt: 'Brownie or blondie', img: 'mn-slab' },
    { name: 'NYC cookies', price: '£2', sub: 'Each · premium £3',
      text: 'Thick, soft-centred cookies.',
      opt: 'Standard & premium flavours', img: 'mn-cookies' },
    { name: 'Cake pops', price: '£1.50', sub: 'Each',
      text: 'In brownie or blondie.',
      opt: 'Brownie or blondie', img: 'mn-pops' },
    { name: 'Individually wrapped', price: '', sub: 'Priced per item',
      text: 'For favours, hampers and party bags. Ask for a price.',
      opt: 'Cookies · brownies · blondies · brookies', img: 'mn-wrapped', ask: true }
  ];

  /* -------------------------------------------------------------- FLAVOURS */
  var BAKE_STD = ['Oreo', 'Biscoff', 'Nutella', 'Milk choc', 'White choc', 'Dark choc',
    'Jammie Dodger', 'Kinder sticks', 'Fresh strawberry'];
  var BAKE_PREM = ['Hazelnut crème', 'Pistachio', 'Kinder Bueno', 'Ferrero Rocher / Raffaello',
    'Mini egg', "Reese's cups", "Terry's Chocolate Orange", 'Dried raspberry'];
  var COOKIE_STD = ['Oreo', 'Biscoff', 'Milk choc chip', 'White choc chip', 'Dark choc chip', 'Kinder sticks'];
  var COOKIE_PREM = ['Pistachio & white choc', 'Kinder Bueno', 'Ferrero Rocher / Raffaello', 'Mini egg',
    "Reese's cups", "Terry's Chocolate Orange", 'Raspberry & white choc', 'Matcha & white choc'];

  var FLAVOURS = [
    { tab: 'Brownies & blondies', standard: BAKE_STD, premium: BAKE_PREM },
    { tab: 'NYC cookies', standard: COOKIE_STD, premium: COOKIE_PREM }
  ];

  /* ------------------------------------------------------- WHAT SHE SELLS
     The builder is driven entirely by this. `price: null` means the price is
     not published — that line goes in the basket as "price on confirmation"
     and is never guessed at or added to a total. */
  var ITEMS = [
    { id: 'brownies', name: 'Brownies', img: 'mn-regular', from: 'from £10', set: 'bake',
      sizes: [
        { id: 's6', label: 'Box of 6', price: 10, pieces: 6 },
        { id: 'r9', label: 'Box of 9', price: 15, pieces: 9 },
        { id: 'l12', label: 'Box of 12', price: 20, pieces: 12 }
      ] },
    { id: 'blondies', name: 'Blondies', img: 'mn-slab', from: 'from £10', set: 'bake',
      sizes: [
        { id: 's6', label: 'Box of 6', price: 10, pieces: 6 },
        { id: 'r9', label: 'Box of 9', price: 15, pieces: 9 },
        { id: 'l12', label: 'Box of 12', price: 20, pieces: 12 }
      ] },
    /* her menu offers brookies in the boxes, but not as minis */
    { id: 'brookies', name: 'Brookies', img: 'mn-small', from: 'from £10', set: 'bake',
      sizes: [
        { id: 's6', label: 'Box of 6', price: 10, pieces: 6 },
        { id: 'r9', label: 'Box of 9', price: 15, pieces: 9 },
        { id: 'l12', label: 'Box of 12', price: 20, pieces: 12 }
      ] },
    { id: 'cookies', name: 'NYC cookies', img: 'mn-cookies', from: '£2 each', set: 'cookie', each: true,
      sizes: [
        { id: 'std', label: 'Standard flavour', price: 2, pieces: 1, std: true },
        { id: 'prem', label: 'Premium flavour', price: 3, pieces: 1, prem: true }
      ] },
    { id: 'pops', name: 'Cake pops', img: 'mn-pops', from: '£1.50 each', set: 'pop', each: true,
      sizes: [{ id: 'pop', label: 'Each', price: 1.5, pieces: 1 }] },
    { id: 'slab', name: 'Personalised slab', img: 'mn-slab', from: '£20', set: 'bake', message: true,
      sizes: [{ id: 'slab', label: 'One whole slab', price: 20, pieces: 1 }] }
  ];

  function flavourList(set, which) {
    if (set === 'cookie') return which === 'prem' ? COOKIE_PREM : COOKIE_STD;
    if (set === 'pop') return which === 'prem' ? [] : ['Brownie', 'Blondie'];
    return which === 'prem' ? BAKE_PREM : BAKE_STD;
  }

  /* ------------------------------------------------------------- OCCASIONS */
  var OCCASIONS = [
    { title: 'Eid', text: 'Eid boxes and specials, announced as the date comes round.', img: 'oc-eid', tall: true },
    { title: 'Birthdays', text: 'Slabs written on for the day, and boxes for the table.', img: 'oc-birthday' },
    { title: 'Ramadan', text: 'Orders through the month, and bakes for charity.', img: 'oc-ramadan' },
    { title: 'Baby showers', text: 'Pastel boxes and cake pops to match your theme.', img: 'oc-baby', tall: true },
    { title: 'Favours', text: 'Individually wrapped for weddings, nikkahs and party bags.', img: 'oc-favours' },
    { title: 'Thank-yous', text: 'A box posted to someone who deserves one.', img: 'oc-thanks' }
  ];

  /* ---------------------------------------------------------- AVAILABILITY
     An example month, laid out the way she posts it on her story. `booked` is
     a list of day numbers. Set it each month, or clear `example` once the
     dates are real so the chip and the note come off. */
  var AVAILABILITY = {
    example: true,
    booked: [3, 4, 5, 6, 10, 11, 12, 20, 21, 22, 24, 28, 29],
    note: 'Availability is posted on Instagram each month. This calendar is an example of how it will look here — the dates are not the real ones yet.'
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
        text: 'Ordered for my sister’s birthday and everything arrived perfect, nothing broken. The biscoff one did not make it to the evening.' },
      { name: 'Aaliyah R.', when: 'Eid boxes, collection',
        text: 'Four boxes for Eid and every single person asked where they were from. Beautifully packaged as well.' },
      { name: 'Zain M.', when: 'NYC cookies, Stoke',
        text: 'The kinder bueno cookie is unreal — thick and still soft in the middle. I have ordered three times since.' },
      { name: 'Chloe W.', when: 'Personalised slab',
        text: 'Asked for a slab with a message on it for an anniversary and it was spot on. Tasted even better than it looked.' },
      { name: 'Nadia K.', when: 'Favours, posted UK-wide',
        text: 'Individually wrapped favours for our nikkah. Arrived early, packed properly, and the guests kept asking for the page.' }
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
  function money(n) { return '£' + Number(n).toFixed(2); }
  function fxRefresh() { if (window.ScrollFXKit) window.ScrollFXKit.refresh(); }

  /* The icons, once. */
  var ICON = {
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5 0-.2 0-.4 0-.5 0-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.3 5.2 4.6.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>',
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>',
    /* centred on the 24x24 box — the old one sat high and to the right */
    tt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.6 2.2h2.7c.2 1.4.9 2.6 2 3.3.7.5 1.5.7 2.3.8v2.7c-1.5 0-2.9-.5-4.1-1.3v5.9c0 3.1-2.5 5.6-5.6 5.6s-5.6-2.5-5.6-5.6 2.5-5.6 5.6-5.6c.3 0 .6 0 .8.1v2.8c-.3-.1-.6-.1-.8-.1a2.9 2.9 0 1 0 2.9 2.9V2.2z"/></svg>',
    fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8.5V7c0-.7.5-1 1-1h2V3h-2.7C11.6 3 10.5 4.6 10.5 7v1.5H8V12h2.5v9H14v-9h2.6l.4-3.5H14z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5-4.8-4.6 6.6-.9z"/></svg>',
    google: '<svg viewBox="0 0 48 48"><path fill="#4285F4" d="M45 24.3c0-1.5-.1-2.9-.4-4.3H24v8.1h11.8c-.5 2.7-2 5-4.3 6.6v5.5h7c4.1-3.8 6.5-9.4 6.5-15.9z"/><path fill="#34A853" d="M24 46c5.8 0 10.7-1.9 14.3-5.3l-7-5.5c-1.9 1.3-4.4 2.1-7.3 2.1-5.6 0-10.4-3.8-12.1-8.9H4.7v5.6C8.3 41.2 15.6 46 24 46z"/><path fill="#FBBC05" d="M11.9 28.4a13.2 13.2 0 0 1 0-8.8v-5.6H4.7a22 22 0 0 0 0 20l7.2-5.6z"/><path fill="#EA4335" d="M24 9.9c3.2 0 6 1.1 8.2 3.2l6.2-6.2C34.7 3.4 29.8 1.4 24 1.4 15.6 1.4 8.3 6.2 4.7 13.2l7.2 5.6c1.7-5.1 6.5-8.9 12.1-8.9z"/></svg>'
  };

  /* ====================================================== where "message us"
     actually goes. One decision, used by every button on the page. */

  function waHref(text) {
    var msg = encodeURIComponent(text || 'Hi Brownielicious — I’d like to place an order please.');
    if (CONTACT.whatsapp) return 'https://wa.me/' + CONTACT.whatsapp + '?text=' + msg;
    return CONTACT.instagram;
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

  /* Holding the page still behind the drawer, the basket and the lightbox.
     With Lenis driving the scroll, lenis.stop() is enough. Without it — every
     touch device now — `overflow:hidden` on the body is famously not enough on
     iOS, so the body is pinned in place and put back where it was after. */
  var lockedAt = 0, locks = 0;
  function lockScroll(on) {
    locks = Math.max(0, locks + (on ? 1 : -1));
    if (on && locks > 1) return;
    if (!on && locks > 0) return;
    var b = document.body;
    if (on) {
      lockedAt = window.scrollY || document.documentElement.scrollTop || 0;
      if (lenis) lenis.stop();
      b.style.overflow = 'hidden';
      if (!lenis) {
        b.style.position = 'fixed';
        b.style.top = (-lockedAt) + 'px';
        b.style.left = '0';
        b.style.right = '0';
      }
    } else {
      if (lenis) lenis.start();
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

  /* The sticky header's height. The smooth-scroll library, the instant jump
     and the browser's own scroll-margin-top must all use the same number or
     a section lands in a slightly different place depending on the route. */
  var HEAD = 84;

  /* `jump` means put me there, now. Watching the whole page fly past on the
     way to a section is a lot of motion to sit through, especially from a
     menu, so every menu link and everything on a touch screen jumps. */
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
    closeSheet();
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
    }, reduced ? 0 : 800);
  });

  /* ==================================================== nav, drawer, header */

  burger.addEventListener('click', function () {
    var open = !drawer.classList.contains('open');
    drawer.classList.toggle('open', open);
    burger.classList.toggle('on', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    lockScroll(open);
    $$('a', drawer).forEach(function (a, i) {
      a.style.transitionDelay = open ? (0.1 + i * 0.04) + 's' : '0s';
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeDrawer(); closeLb(); closeSheet();
  });

  function onScroll() {
    nav.classList.toggle('stuck', (window.scrollY || document.documentElement.scrollTop) > 40);
  }
  (lenis ? lenis.on('scroll', onScroll) : window.addEventListener('scroll', onScroll, { passive: true }));
  onScroll();

  /* ===================================================== drifting sprinkles */
  /* Hundreds-and-thousands, drifting. Drawn as plain elements rather than
     emoji or cut-out photographs: a photographed sprinkle over a photograph
     of a brownie looks like a mistake, a soft coloured capsule reads as
     texture. Skipped entirely when the visitor asks for reduced motion. */

  (function sprinkles() {
    var TINTS = ['#e87cbb', '#f2c2dc', '#ffe7fd', '#6b2626', '#8a4b2a', '#71804a', '#f3b94d'];
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
          /* slow. A sprinkle should take the best part of a minute to
             cross its patch of screen — noticed, never watched. */
          '--d:' + (34 + Math.random() * 22).toFixed(1) + 's;' +
          '--s:' + (13 + Math.random() * 10).toFixed(1) + 's;' +
          'animation-delay:' + (-Math.random() * 40).toFixed(1) + 's,' +
                         '-' + (Math.random() * 16).toFixed(1) + 's';
        field.appendChild(s);
      }
    });
  }());

  /* =============================================================== marquee */
  /* Twice this strip came out as an empty brown bar on her phone while being
     perfect in every desktop browser. Both times the cause was the same: a
     moving layer wider than iOS will paint (about 4096 device pixels, which
     on a 3x screen is only ~1365 CSS px). Cutting it shorter cannot fix it,
     because to cover a wide screen the moving element has to be at least as
     wide as the screen.

     So nothing moves. The band is an overflow box and this scrolls it. A
     scrolling box is tiled and painted by the browser as it goes, so there is
     no composited layer to overflow — at any screen size — and every word
     fits in one run, so the list flows past instead of restarting after four. */

  (function marquee() {
    var track = $('#marquee');
    if (!track) return;
    var band = track.parentNode;
    var words = ['Brownies', 'Blondies', 'Brookies', 'NYC cookies', 'Cake pops',
      'Personalised slabs', 'Halal', 'Baked in ' + CONTACT.area, 'UK-wide postals',
      'Made with love'];
    var runW = 0;

    function build() {
      track.innerHTML = '';
      var run = el('div', { class: 'band-run' },
        words.map(function (w) { return '<span>' + esc(w) + '</span>'; }).join(''));
      track.appendChild(run);
      runW = run.getBoundingClientRect().width;
      if (!runW) return;
      /* The strip must span the band plus one run, so that when a run has
         slid its own width away there is still something behind it. That is
         the minimum, and the minimum is what is built: every extra copy is
         more DOM and more paint for nothing. */
      var copies = Math.ceil((band.clientWidth + runW) / runW);
      for (var c = 1; c < copies; c++) track.appendChild(run.cloneNode(true));
      band.scrollLeft = 0;
    }

    build();
    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () { build(); x = 0; }, 250);
    });

    if (reduced) return;                     // no drift for anyone who asked

    var x = 0, last = 0, running = true;
    var SPEED = 42;                          // px per second
    document.addEventListener('visibilitychange', function () {
      running = !document.hidden; last = 0;
    });
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        running = es[0].isIntersecting && !document.hidden;
        last = 0;
      }).observe(band);
    }

    (function frame(now) {
      requestAnimationFrame(frame);
      if (!running || !runW) { last = now; return; }
      if (!last) { last = now; return; }
      var dt = Math.min(64, now - last);     // a tab that was asleep must not lurch
      last = now;
      x += SPEED * dt / 1000;
      if (x >= runW) x -= runW;              // one run on, and round again
      band.scrollLeft = x;
    }(0));
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
          '<p><b>' + esc(m.sub) + '</b></p>' +
          '<p>' + esc(m.text) + '</p>' +
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

  /* ================================================================ basket
     Kept in this site's own localStorage so a basket survives a reload and a
     closed tab. Private browsing throws on write; the basket then lasts for
     this visit only, which is still worth having, and must never break the
     page — hence the try/catch on both sides. */

  var STORE = 'bnl-basket';
  var basket = [];
  try { basket = JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) {}
  if (!Array.isArray(basket)) basket = [];

  function persist() {
    try { localStorage.setItem(STORE, JSON.stringify(basket)); } catch (e) {}
  }
  function basketCount() {
    return basket.reduce(function (n, l) { return n + (l.qty || 1); }, 0);
  }
  function subtotal() {
    return basket.reduce(function (n, l) { return n + l.unit * l.qty; }, 0);
  }

  var FULFIL = 'post';
  try { FULFIL = localStorage.getItem(STORE + '-fulfil') || 'post'; } catch (e) {}

  function orderTotal() {
    return subtotal() + (FULFIL === 'collect' ? 0 : CHECKOUT.postage);
  }

  /* ---------------------------------------------------------- the toast */
  var toastEl = $('#toast'), toastT;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2400);
  }

  /* ------------------------------------------------------- the bag button */
  var bagBtn = $('#bagBtn'), bagCount = $('#bagCount');
  function paintBag(pop) {
    var n = basketCount();
    bagCount.textContent = n;
    bagCount.hidden = n === 0;
    bagBtn.setAttribute('aria-label', n ? 'Open your basket — ' + n + ' item' + (n === 1 ? '' : 's') : 'Open your basket');
    if (pop) {
      bagBtn.classList.remove('pop');
      void bagBtn.offsetWidth;               // restart the animation
      bagBtn.classList.add('pop');
    }
  }

  /* ========================================================= the box builder */

  var pick = { item: ITEMS[0], size: ITEMS[0].sizes[1], flavs: [], qty: 1, note: '' };

  /* Premium toppings cost more. Her menu prices premium COOKIES directly
     (£3 instead of £2, which is the size itself), and for a box it is a
     surcharge — CHECKOUT.premium — shown on its own line so the customer can
     see exactly what it added. */
  function premiumApplies(item, size, flavs) {
    if (item.set !== 'bake') return false;
    var pr = flavourList('bake', 'prem');
    return flavs.some(function (f) { return pr.indexOf(f) > -1; });
  }
  function unitPrice(item, size, flavs) {
    return size.price + (premiumApplies(item, size, flavs) ? CHECKOUT.premium : 0);
  }

  (function builder() {
    var itemsHost = $('#bdItems'), sizesHost = $('#bdSizes'), flavsHost = $('#bdFlavs');
    if (!itemsHost) return;
    var hint = $('#bdHint'), noteIn = $('#bdNote'), noteLbl = $('#bdNoteLabel');

    function maxFlavours() { return Math.max(1, Math.min(pick.size.pieces, 6)); }

    /* Clicking a button focuses it, and focusing something that is only
       half on screen makes the browser scroll to it — so choosing a card in
       the second row jumped the page under your thumb. Focus is taken
       without the scroll instead, and the keyboard is unaffected. */
    function quietClick(btn, fn) {
      btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
      btn.addEventListener('click', function (e) {
        fn(e);
        try { btn.focus({ preventScroll: true }); } catch (err) { /* older browsers */ }
      });
    }

    /* The item cards are built ONCE. Rebuilding them on every tap threw seven
       images away and fetched them again, which is what made choosing one
       flash and jump. Choosing now only moves a class. */
    var itemBtns = {};
    ITEMS.forEach(function (it) {
      var b = el('button', {
        type: 'button', class: 'bd-item', role: 'radio', 'aria-checked': 'false'
      },
        '<img src="' + PH + it.img + '.jpg" alt="" width="900" height="900" loading="lazy">' +
        '<span><b>' + esc(it.name) + '</b><small>' + esc(it.from) + '</small></span>');
      quietClick(b, function () {
        if (pick.item.id === it.id) return;
        pick.item = it;
        pick.size = it.sizes[it.sizes.length > 1 ? 1 : 0];
        pick.flavs = [];
        pick.qty = 1;
        markItems(); drawSizes(); drawFlavs(); drawSide();
      });
      itemBtns[it.id] = b;
      itemsHost.appendChild(b);
    });
    function markItems() {
      ITEMS.forEach(function (it) {
        var on = it.id === pick.item.id;
        itemBtns[it.id].classList.toggle('on', on);
        itemBtns[it.id].setAttribute('aria-checked', on ? 'true' : 'false');
      });
    }

    function drawSizes() {
      sizesHost.innerHTML = '';
      pick.item.sizes.forEach(function (sz) {
        var on = sz.id === pick.size.id;
        var b = el('button', {
          type: 'button', class: 'chip' + (on ? ' on' : ''),
          role: 'radio', 'aria-checked': on ? 'true' : 'false'
        }, esc(sz.label) + ' · ' + money(sz.price));
        quietClick(b, function () {
          if (pick.size.id === sz.id) return;
          pick.size = sz;
          if (pick.flavs.length > Math.max(1, Math.min(sz.pieces, 6))) pick.flavs = [];
          drawSizes(); drawFlavs(); drawSide();
        });
        sizesHost.appendChild(b);
      });
    }

    function drawFlavs() {
      var std = flavourList(pick.item.set, 'std');
      var pr = flavourList(pick.item.set, 'prem');
      if (pick.item.set === 'cookie') {           // the size IS the tier
        if (pick.size.prem) { std = []; } else { pr = []; }
      }

      var max = maxFlavours();
      hint.textContent = pick.size.pieces === 1
        ? 'Choose the flavour you’d like.'
        : 'Choose up to ' + max + ' — they are mixed across the box.' +
          (pr.length ? ' Premium toppings add ' + money(CHECKOUT.premium) + ' to a box.' : '');

      flavsHost.innerHTML = '';
      function chip(name, isPrem) {
        var on = pick.flavs.indexOf(name) > -1;
        var full = !on && pick.flavs.length >= max;
        var b = el('button', {
          type: 'button',
          class: 'f' + (on ? ' on' : '') + (isPrem ? ' prem' : '') + (full ? ' full' : ''),
          'aria-pressed': on ? 'true' : 'false'
        }, esc(name) + (isPrem && pick.item.set === 'bake' ? ' +' + money(CHECKOUT.premium) : ''));
        quietClick(b, function () {
          var i = pick.flavs.indexOf(name);
          if (i > -1) pick.flavs.splice(i, 1);
          else if (pick.flavs.length < max) pick.flavs.push(name);
          else { toast('That is the most flavours for this size.'); return; }
          drawFlavs(); drawSide();
        });
        flavsHost.appendChild(b);
      }
      std.forEach(function (f) { chip(f, false); });
      pr.forEach(function (f) { chip(f, true); });
    }

    function drawSide() {
      $('#bdPic').src = PH + pick.item.img + '.jpg';
      $('#bdName').textContent = pick.item.name;
      $('#bdMeta').textContent = pick.size.label;

      var list = $('#bdChosen');
      list.innerHTML = '';
      if (!pick.flavs.length) list.appendChild(el('li', { class: 'none' }, 'No flavours chosen yet'));
      else pick.flavs.forEach(function (f) { list.appendChild(el('li', null, esc(f))); });

      $('#bdQty').textContent = pick.qty;
      var unit = unitPrice(pick.item, pick.size, pick.flavs);
      $('#bdPrice').textContent = money(unit * pick.qty);

      $('#bdSmall').textContent = premiumApplies(pick.item, pick.size, pick.flavs)
        ? 'Includes ' + money(CHECKOUT.premium) + ' for premium toppings.'
        : (FULFIL === 'collect' ? 'Collection from ' + CONTACT.area + '.'
                                : 'Postage ' + money(CHECKOUT.postage) + ', added at checkout.');

      noteLbl.innerHTML = pick.item.message
        ? 'Message for the slab <span>(optional)</span>'
        : 'Message or notes <span>(optional)</span>';
      noteIn.placeholder = pick.item.message ? 'e.g. Happy Birthday Amina' : 'Anything I should know';
    }

    $('#bdMinus').addEventListener('click', function () { pick.qty = Math.max(1, pick.qty - 1); drawSide(); });
    $('#bdPlus').addEventListener('click', function () { pick.qty = Math.min(99, pick.qty + 1); drawSide(); });
    noteIn.addEventListener('input', function () { pick.note = noteIn.value.trim(); });

    $('#bdAdd').addEventListener('click', function () {
      if (!pick.flavs.length) {
        toast('Pick at least one flavour first.');
        flavsHost.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
        return;
      }
      var key = [pick.item.id, pick.size.id, pick.flavs.join('+'), pick.note].join('|');
      var found = null;
      for (var i = 0; i < basket.length; i++) if (basket[i].key === key) found = basket[i];
      if (found) found.qty += pick.qty;
      else basket.push({
        key: key, item: pick.item.name, img: pick.item.img,
        size: pick.size.label, flavs: pick.flavs.slice(), note: pick.note,
        unit: unitPrice(pick.item, pick.size, pick.flavs),
        premium: premiumApplies(pick.item, pick.size, pick.flavs),
        qty: pick.qty
      });
      persist(); paintBag(true); paintBasket();
      toast(pick.qty + ' × ' + pick.item.name + ' added to your basket');
      pick.qty = 1; drawSide();
    });

    markItems(); drawSizes(); drawFlavs(); drawSide();
  }());

  /* ======================================================= the basket panel */

  var sheet = $('#sheet'), bkBody = $('#bkBody'), bkFoot = $('#bkFoot');

  function paintBasket() {
    if (!basket.length) {
      bkBody.innerHTML =
        '<div class="bk-empty">' + ICON.bag +
        '<p>Your basket is empty.</p>' +
        '<p style="font-size:.88rem">Build a box and it will appear here.</p></div>';
      bkFoot.innerHTML = '<a class="btn" href="#build" style="width:100%;justify-content:center">Build your box</a>';
      return;
    }

    bkBody.innerHTML = '';
    basket.forEach(function (l, i) {
      var line = el('div', { class: 'bk-line' });
      line.innerHTML =
        '<img src="' + PH + l.img + '.jpg" alt="" width="900" height="900" loading="lazy">' +
        '<div class="bl-main">' +
          '<b>' + esc(l.item) + '</b>' +
          '<small>' + esc(l.size) + '</small>' +
          (l.flavs.length ? '<small>' + esc(l.flavs.join(', ')) + '</small>' : '') +
          (l.note ? '<small>“' + esc(l.note) + '”</small>' : '') +
          (l.premium ? '<small>Premium toppings +' + money(CHECKOUT.premium) + '</small>' : '') +
          '<div class="bl-row">' +
            '<div class="qty">' +
              '<button type="button" data-less="' + i + '" aria-label="One fewer">−</button>' +
              '<output>' + l.qty + '</output>' +
              '<button type="button" data-more="' + i + '" aria-label="One more">+</button>' +
            '</div>' +
            '<span class="bl-price">' + money(l.unit * l.qty) + '</span>' +
          '</div>' +
          '<button class="bl-drop" type="button" data-drop="' + i + '">Remove</button>' +
        '</div>';
      bkBody.appendChild(line);
    });

    bkFoot.innerHTML =
      '<div class="co-opts" style="margin-bottom:14px">' +
        fulfilOption('collect', 'Collection', 'From ' + CONTACT.area + ' — free') +
        fulfilOption('post', 'Posted to me', 'UK-wide — ' + money(CHECKOUT.postage)) +
      '</div>' +
      '<div class="bk-sum">' +
        '<div><span>Subtotal</span><span>' + money(subtotal()) + '</span></div>' +
        '<div><span>Postage</span><span>' +
          (FULFIL === 'collect' ? 'Free' : money(CHECKOUT.postage)) + '</span></div>' +
        '<div class="tot"><span>Total</span><span>' + money(orderTotal()) + '</span></div>' +
      '</div>' +
      '<button class="btn" type="button" id="bkGo" style="width:100%;justify-content:center">' +
        'Checkout · ' + money(orderTotal()) + '</button>';

    $$('[data-less]', bkBody).forEach(function (b) {
      b.addEventListener('click', function () {
        var i = +b.getAttribute('data-less');
        basket[i].qty -= 1;
        if (basket[i].qty < 1) basket.splice(i, 1);
        persist(); paintBag(); paintBasket();
      });
    });
    $$('[data-more]', bkBody).forEach(function (b) {
      b.addEventListener('click', function () {
        basket[+b.getAttribute('data-more')].qty += 1;
        persist(); paintBag(); paintBasket();
      });
    });
    $$('[data-drop]', bkBody).forEach(function (b) {
      b.addEventListener('click', function () {
        basket.splice(+b.getAttribute('data-drop'), 1);
        persist(); paintBag(); paintBasket();
        toast('Removed from your basket');
      });
    });
    $$('[data-fulfil]', bkFoot).forEach(function (b) {
      b.addEventListener('click', function () {
        FULFIL = b.getAttribute('data-fulfil');
        try { localStorage.setItem(STORE + '-fulfil', FULFIL); } catch (e) {}
        paintBasket(); paintCheckout();
      });
    });
    var go = $('#bkGo');
    if (go) go.addEventListener('click', openCheckout);
  }

  function fulfilOption(id, title, sub) {
    return '<button class="co-opt' + (FULFIL === id ? ' on' : '') + '" type="button" data-fulfil="' + id + '">' +
      '<i></i><span><b>' + title + '</b><small>' + sub + '</small></span></button>';
  }

  /* ------------------------------------------------------- opening/closing */
  function openSheet(which) {
    sheet.hidden = false;
    void sheet.offsetWidth;
    sheet.classList.add('in');
    sheet.classList.toggle('co', which === 'co');
    lockScroll(true);
    setTimeout(function () {
      var f = $(which === 'co' ? '#coClose' : '#bkClose');
      if (f) f.focus();
    }, 60);
  }
  function closeSheet() {
    if (sheet.hidden || !sheet.classList.contains('in')) return;
    sheet.classList.remove('in', 'co');
    lockScroll(false);
    setTimeout(function () { sheet.hidden = true; }, 480);
  }
  bagBtn.addEventListener('click', function () { paintBasket(); openSheet('bk'); });
  $('#bkClose').addEventListener('click', closeSheet);
  $('#coClose').addEventListener('click', function () { sheet.classList.remove('co'); });
  $('#sheetBg').addEventListener('click', closeSheet);

  /* =============================================================== checkout */

  var PAY = 'card';

  function paintCheckout() {
    var host = $('#coFulfil');
    if (!host) return;
    host.innerHTML = fulfilOption('collect', 'Collection', 'From ' + CONTACT.area + ' — free') +
      fulfilOption('post', 'Posted to me', 'UK-wide — ' + money(CHECKOUT.postage));
    $$('[data-fulfil]', host).forEach(function (b) {
      b.addEventListener('click', function () {
        FULFIL = b.getAttribute('data-fulfil');
        try { localStorage.setItem(STORE + '-fulfil', FULFIL); } catch (e) {}
        paintCheckout(); paintBasket();
      });
    });
    $('#coAddrWrap').hidden = FULFIL === 'collect';

    var pays = $('#coPay');
    pays.innerHTML =
      payOption('card', 'Card', 'Visa, Mastercard, Apple Pay') +
      payOption('bank', 'Bank transfer', 'Details sent with your confirmation');
    $$('[data-pay]', pays).forEach(function (b) {
      b.addEventListener('click', function () { PAY = b.getAttribute('data-pay'); paintCheckout(); });
    });
    $('#coCard').hidden = PAY !== 'card';
    $('#coBank').hidden = PAY !== 'bank';

    var lines = basket.map(function (l) {
      return '<div><span>' + l.qty + ' × ' + esc(l.item) + ' <small>' + esc(l.size) + '</small></span>' +
        '<span>' + money(l.unit * l.qty) + '</span></div>';
    }).join('');
    $('#coTotal').innerHTML =
      '<div class="bk-sum" style="width:100%">' + lines +
        '<div><span>Postage</span><span>' + (FULFIL === 'collect' ? 'Free' : money(CHECKOUT.postage)) + '</span></div>' +
        '<div class="tot"><span>Total</span><span>' + money(orderTotal()) + '</span></div>' +
      '</div>';
    $('#coSend').textContent = (PAY === 'card' ? 'Pay ' : 'Place order · ') + money(orderTotal());
  }
  function payOption(id, title, sub) {
    return '<button class="co-opt' + (PAY === id ? ' on' : '') + '" type="button" data-pay="' + id + '">' +
      '<i></i><span><b>' + title + '</b><small>' + sub + '</small></span></button>';
  }

  function openCheckout() {
    if (!basket.length) { toast('Your basket is empty.'); return; }
    paintCheckout();
    $('#coDone').classList.remove('on');
    $('#coForm').style.display = '';
    sheet.classList.add('co');
    setTimeout(function () { $('#coClose').focus(); }, 60);
  }

  /* The whole order in one block of text — used for the message that goes to
     her and for the fallback, so the two can never disagree. */
  function orderText(d) {
    var out = ['Order from the Brownielicious website', ''];
    basket.forEach(function (l) {
      out.push('• ' + l.qty + ' × ' + l.item + ' — ' + l.size + ' — ' + money(l.unit * l.qty));
      if (l.flavs.length) out.push('    flavours: ' + l.flavs.join(', '));
      if (l.note) out.push('    message: ' + l.note);
      if (l.premium) out.push('    premium toppings +' + money(CHECKOUT.premium));
    });
    out.push('');
    out.push('Subtotal: ' + money(subtotal()));
    out.push(FULFIL === 'collect'
      ? 'Collection from ' + CONTACT.area
      : 'Postage: ' + money(CHECKOUT.postage));
    out.push('TOTAL: ' + money(orderTotal()));
    out.push('Paying by: ' + PAY);
    out.push('');
    out.push('Name: ' + d.name);
    out.push('Email: ' + d.email);
    if (d.phone) out.push('Phone / Instagram: ' + d.phone);
    if (d.date) out.push('Date needed: ' + d.date);
    if (d.addr) out.push('Address: ' + d.addr);
    return out.join('\n');
  }

  (function checkoutForm() {
    var form = $('#coForm'), btn = $('#coSend'), msg = $('#coMsg');
    if (!form) return;

    function v(id) { var n = $('#' + id); return n ? n.value.trim() : ''; }
    function show(kind, html) { msg.className = 'form-msg on ' + kind; msg.innerHTML = html; }
    function details() {
      return { name: v('co_name'), email: v('co_email'), phone: v('co_phone'),
        date: v('co_date'), addr: FULFIL === 'collect' ? '' : v('co_addr') };
    }

    function fallback(reason) {
      var body = orderText(details());
      var mail = CONTACT.email
        ? 'mailto:' + CONTACT.email + '?subject=' + encodeURIComponent('Order from the website') +
          '&body=' + encodeURIComponent(body)
        : '';
      show('err',
        '<b>That did not send from here.</b><br>Nothing is lost — ' +
        (mail ? '<a href="' + mail + '">open it as an email</a> or ' : '') +
        '<a href="' + waHref(body) + '" target="_blank" rel="noopener">' +
        (hasWA ? 'send it on WhatsApp' : 'send it as an Instagram message') +
        '</a>, and your whole order is already written out.');
      if (reason) console.warn('[order] ' + reason);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (v('co_company')) return;
      var d = details();
      if (!d.name || !d.email) { show('err', 'Please add your name and email.'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) { show('err', 'That email address does not look right.'); return; }
      if (FULFIL === 'post' && !d.addr) { show('err', 'Please add the address it should be posted to.'); return; }

      msg.className = 'form-msg';
      if (!W3F_KEY) { fallback('no Web3Forms key set — see W3F_KEY in brownielicious.js'); return; }

      btn.disabled = true;
      var label = btn.textContent;
      btn.textContent = 'Sending…';

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: W3F_KEY,
          subject: 'Order ' + money(orderTotal()) + (d.date ? ' for ' + d.date : ''),
          from_name: 'Brownielicious website',
          replyto: d.email,
          order: orderText(d)
        })
      })
        .then(function (r) { return r.json(); })
        .then(function (body) {
          if (!body || !body.success) throw new Error(body && body.message ? body.message : 'no success flag');
          done();
        })
        .catch(function (ex) { fallback(ex && ex.message ? ex.message : String(ex)); })
        .then(function () { btn.disabled = false; btn.textContent = label; });
    });

    function done() {
      basket = [];
      persist(); paintBag(); paintBasket();
      form.style.display = 'none';
      $('#coDone').classList.add('on');
    }

    $('#coDoneCta').innerHTML = '<button class="btn" type="button" id="coDoneClose">Done</button>';
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'coDoneClose') closeSheet();
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
    var first = (new Date(y, m, 1).getDay() + 6) % 7;      // week starts Monday
    var days = new Date(y, m + 1, 0).getDate();

    title.textContent = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) + ' availability';

    var html = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (d) { return '<i>' + d + '</i>'; }).join('');
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
     both leave the element's own scrollLeft as the single source of truth. */

  (function rails() {
    var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

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
       scrollLeft. While we animate it ourselves, they are switched off. */
    function takeOver(rail) { rail.style.scrollSnapType = 'none'; rail.style.scrollBehavior = 'auto'; }
    function handBack(rail) { rail.style.scrollSnapType = ''; rail.style.scrollBehavior = ''; }

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
        if (dt > 0) v = (e.clientX - last) / dt;
        last = e.clientX; lastT = now;
      });

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
          rail.__drag = Date.now();
          if (!reduced && Math.abs(v) > 0.15) {
            var speed = v * 16;
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

  /* =============================================== menu tiles: gentle tilt */

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

  /* ================================================================ lightbox */

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
    lockScroll(true);
    $('#lbX').focus();
  }
  function closeLb() {
    if (!lb.classList.contains('open')) return;
    lb.classList.remove('open');
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

    var ways = $('#enqWays');
    if (ways) {
      ways.innerHTML =
        (hasWA
          ? '<a class="way" href="' + waHref() + '" target="_blank" rel="noopener">' + ICON.wa +
            '<span><b>WhatsApp</b><small>Quickest for a question about a date</small></span></a>'
          : '') +
        '<a class="way" href="' + CONTACT.instagram + '" target="_blank" rel="noopener">' + ICON.ig +
          '<span><b>Instagram</b><small>@browniieliciousss</small></span></a>' +
        '<a class="way" href="' + CONTACT.tiktok + '" target="_blank" rel="noopener">' + ICON.tt +
          '<span><b>TikTok</b><small>New flavours and giveaways first</small></span></a>' +
        '<span class="way" style="cursor:default">' + ICON.pin +
          '<span><b>' + esc(CONTACT.area) + '</b><small>Collection locally, or posted UK-wide</small></span></span>';
    }

    var foot = $('#footContact');
    if (foot) {
      foot.innerHTML =
        '<li><a href="' + CONTACT.instagram + '" target="_blank" rel="noopener">Instagram</a></li>' +
        '<li><a href="' + CONTACT.tiktok + '" target="_blank" rel="noopener">TikTok</a></li>' +
        (CONTACT.facebook ? '<li><a href="' + CONTACT.facebook + '" target="_blank" rel="noopener">Facebook</a></li>' : '') +
        (hasWA ? '<li><a href="' + waHref() + '" target="_blank" rel="noopener">WhatsApp</a></li>' : '') +
        (CONTACT.email ? '<li><a href="mailto:' + CONTACT.email + '">' + esc(CONTACT.email) + '</a></li>' : '') +
        '<li>' + esc(CONTACT.area) + '</li>';
    }

    var route = $('#msgRoute');
    if (route) {
      route.textContent = hasWA
        ? 'WhatsApp and Instagram are both answered.'
        : 'A DM on Instagram is usually quickest.';
    }

    var chat = $('#chat');
    chat.classList.toggle('dm', !hasWA);
    chat.innerHTML = (hasWA ? ICON.wa : ICON.ig) +
      '<span>' + (hasWA ? 'WhatsApp us' : 'Message us') + '</span>';
    chat.setAttribute('aria-label', hasWA ? 'Message us on WhatsApp' : 'Message us on Instagram');
    chat.addEventListener('click', function () { window.open(waHref(), '_blank', 'noopener'); });

    $('#yr').textContent = new Date().getFullYear();
  }());

  /* ========================================================== enquiry form */

  (function form() {
    var form = $('#enqForm'), btn = $('#enqBtn'), msg = $('#formMsg');
    if (!form) return;

    function val(id) { var n = $('#' + id); return n ? n.value.trim() : ''; }

    function summary() {
      return [
        ['Name', val('name')], ['Email', val('email')],
        ['Phone / Instagram', val('phone')], ['Date', val('date')],
        ['Occasion', val('occasion')], ['Message', val('msg')]
      ].filter(function (p) { return p[1]; });
    }
    function show(kind, html) { msg.className = 'form-msg on ' + kind; msg.innerHTML = html; }

    function fallback(reason) {
      var body = 'Message from the Brownielicious website\n\n' +
        summary().map(function (p) { return p[0] + ': ' + p[1]; }).join('\n');
      var mail = CONTACT.email
        ? 'mailto:' + CONTACT.email + '?subject=' + encodeURIComponent('Website enquiry') +
          '&body=' + encodeURIComponent(body)
        : '';
      show('err',
        '<b>We could not send that from here.</b><br>Nothing you typed is lost — ' +
        (mail ? '<a href="' + mail + '">open it as an email</a> or ' : '') +
        '<a href="' + waHref(body) + '" target="_blank" rel="noopener">' +
        (hasWA ? 'send it on WhatsApp' : 'send it as an Instagram message') +
        '</a>, and it is already written for you.');
      if (reason) console.warn('[enquiry] ' + reason);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (val('company')) return;
      if (!val('name') || !val('email')) {
        show('err', 'Please give your name and an email address so I can reply.'); return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val('email'))) {
        show('err', 'That email address does not look quite right — could you check it?'); return;
      }
      msg.className = 'form-msg';
      if (!W3F_KEY) { fallback('no Web3Forms key set — see W3F_KEY in brownielicious.js'); return; }

      var payload = {
        access_key: W3F_KEY, subject: 'Website enquiry',
        from_name: 'Brownielicious website', replyto: val('email')
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
        .then(function (r) { return r.json(); })
        .then(function (body) {
          if (!body || !body.success) throw new Error(body && body.message ? body.message : 'no success flag');
          form.style.display = 'none';
          $('#sentPanel').classList.add('on');
        })
        .catch(function (ex) { fallback(ex && ex.message ? ex.message : String(ex)); })
        .then(function () { btn.disabled = false; btn.textContent = label; });
    });

    $('#sentCta').innerHTML =
      '<a class="btn" href="#build">Build your box</a>' +
      '<a class="btn ghost" href="' + CONTACT.instagram + '" target="_blank" rel="noopener">Instagram</a>';
  }());

  /* ======================================================== scroll reveals */

  paintBag();
  paintBasket();
  fxRefresh();

  (function heroOnLoad() {
    /* The hero is never scrolled INTO, so its reveals are fired outright. */
    $$('.hero [data-fx]').forEach(function (n, i) {
      if (n.getAttribute('data-fx') === 'parallax') return;
      setTimeout(function () { n.classList.add('fx-in'); }, reduced ? 0 : 400 + i * 130);
    });
  }());

}());
