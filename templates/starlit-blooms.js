/* ============================================================
   Starlit Blooms — templates/starlit-blooms.js
   Everything the page needs. No build step, no framework.

   EVERYTHING SHE MIGHT WANT CHANGED IS IN THIS BLOCK.
   ============================================================ */
(function () {
  'use strict';

  /* ---- her details -------------------------------------------------- */
  var CONTACT = {
    handle:    'starlitblooms_',
    instagram: 'https://www.instagram.com/starlitblooms_',
    /* Instagram's own "message me" deep link — opens the app on a phone,
       the web inbox on a desktop. */
    dm:        'https://ig.me/m/starlitblooms_',
    tiktok:    '',                 // add the URL and the icon appears
    facebook:  '',
    email:     '',                 // where enquiries should land
    phone:     '',
    area:      'Manchester',
    /* Paste these when her Google Business profile is live and the review
       box below stops being an example. */
    googleReviews: '',
    googleWrite:   '',
    googleRating:  '',             // e.g. '5.0'
    googleCount:   ''              // e.g. '24'
  };

  /* Web3Forms access key. Empty = the form still works: it hands the whole
     enquiry back as copyable text with a link straight to her DMs. */
  var W3F_KEY = '';

  /* ---- her price list, transcribed from her Instagram highlight ------ */
  var PRICES = {
    bouquets: [
      { name: 'Single rose',  price: 2  },
      { name: '20 roses',     price: 25 },
      { name: '30 roses',     price: 44 },
      { name: '40 roses',     price: 60 },
      { name: '50 roses',     price: 75 }
    ],
    addons: [
      { name: 'Glitter',      price: 2, key: 'glitter'    },
      { name: 'Banner',       price: 1, key: 'banner'     },
      { name: 'Crown',        price: 3, key: 'crown'      },
      { name: 'Butterflies',  price: 1, key: 'butterflies'},
      { name: 'Bow',          price: 2, key: 'bow'        }
    ],
    specials: [
      { name: 'Birthday bouquet', price: 80 },
      { name: 'Wedding bouquet',  price: 95 }
    ]
  };

  var COLOURS = ['Red', 'Black', 'White', 'Champagne', 'Pink', 'Lilac', 'Mixed'];

  var STYLES = [
    { name: 'Wrapped bouquet', key: 'wrapped', quoted: false },
    { name: 'Gift box',        key: 'box',     quoted: true  },
    { name: 'Hamper',          key: 'hamper',  quoted: true  }
  ];

  /* her own list, off her price-list story */
  var OCCASIONS = [
    'Weddings', 'Birthdays', 'Baby showers', 'Valentine’s Day', 'Graduations',
    'Anniversaries', 'Get well soon', 'Eid', 'Sympathy'
  ];

  var GALLERY = [
    { src: 'gal-1.jpg', cap: 'Deep red, wrapped' },
    { src: 'gal-2.jpg', cap: 'Classic red rose' },
    { src: 'gal-3.jpg', cap: 'Blush and rose' },
    { src: 'gal-4.jpg', cap: 'Champagne and gold' },
    { src: 'gal-5.jpg', cap: 'A full red bouquet' },
    { src: 'gal-6.jpg', cap: 'Single stem, boxed' },
    { src: 'gal-7.jpg', cap: 'Lilac and pink' },
    { src: 'gal-8.jpg', cap: 'Red, close up' }
  ];

  /* Placeholder reviews. They are labelled as examples on the page — swap
     them for her real ones the day the Google profile goes live. */
  var REVIEWS = [
    { n: 'Aisha K.',   t: 'Ordered a 40 rose bouquet in red and black for my sister’s birthday and she genuinely cried. Six months on it still looks brand new on her shelf.' },
    { n: 'Danielle R.', t: 'I’d never heard of eternal roses before. Honestly better than real flowers — no mess, no wilting, and the finish is beautiful up close.' },
    { n: 'Maryam S.',  t: 'Did a hamper for Eid with roses and chocolates. She kept me updated the whole way through and dropped it off herself on the day.' },
    { n: 'Chloe B.',   t: 'Wedding bouquet was exactly what I asked for and I still have it. Worth every penny for something you keep forever.' },
    { n: 'Jade M.',    t: 'Gave two weeks’ notice like she asks and everything was spot on. The banner with his name on it was a lovely touch.' },
    { n: 'Sana A.',    t: 'Beautifully made and the packaging is gorgeous. Second order already placed.' }
  ];

  var FAQ = [
    { q: 'What actually are eternal roses?',
      a: 'Every rose is folded by hand from satin ribbon rather than grown. They look and sit like fresh roses, but they don’t wilt, drop petals or need water — so the bouquet stays exactly as it arrived.' },
    { q: 'How long do they last?',
      a: 'Years. There is nothing in them to go off. Keep them out of direct sunlight and they hold their colour.' },
    { q: 'How do I order?',
      a: 'Build what you want on this page and send it over, fill in the enquiry form, or message on Instagram. Everything is confirmed by message before anything is made.' },
    { q: 'How much notice do you need?',
      a: 'Two weeks at the very least. Everything is made by hand to order, so the more notice the better — especially around Valentine’s, Mother’s Day and Eid.' },
    { q: 'Do you deliver?',
      a: 'Yes — every order is delivered in person around Manchester, so nothing gets crushed on the way. The day and a rough time are agreed once the order is confirmed. Further out, just ask.' },
    { q: 'Can I choose my own colours?',
      a: 'That is the whole idea. Red, black, white, champagne, pink, lilac or a mix. If you have a particular shade in mind, send a picture and you’ll be told straight away whether it can be matched.' },
    { q: 'Can you put a name or a message on it?',
      a: 'Yes. Banners, crowns, butterflies and bows are all on the price list. Whatever you want written, send it spelled exactly as you want it and that is how it will be done.' },
    { q: 'How do I pay?',
      a: 'The price is confirmed and payment arranged directly once the order is agreed. Nothing is taken through this website.' }
  ];

  /* ============================================================
     Below here is the machinery.
     ============================================================ */

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var html = document.documentElement;

  function el(tag, attrs, inner) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (inner != null) n.innerHTML = inner;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) { return '£' + (Math.round(n * 100) / 100).toFixed(2); }
  /* a duplicate id makes $('#x') return the wrong node and .value undefined;
     that has broken a form on this site twice, so every read goes through here */
  function val(id) { var n = $('#' + id); return n && typeof n.value === 'string' ? n.value.trim() : ''; }

  /* clicking a control should never scroll the page to it */
  function quietClick(btn, fn) {
    btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
    btn.addEventListener('click', function (e) {
      fn(e);
      try { btn.focus({ preventScroll: true }); } catch (err) {}
    });
  }

  /* ---------------- how pictures arrive ----------------
     Two separate things made the collection cards pop into existence.

     1. A [data-fx="stagger"] container fires ONCE, when the container
        enters. Stacked on a phone the three cards are ~2500px tall, so all
        three animate together while only the first is on screen — by the
        time you scroll to the second and third they finished long ago and
        simply appear. A container taller than the screen cannot stagger, so
        its children are split into individually revealed elements instead.

     2. The photographs are lazy-loaded, so the card faded in empty and the
        image snapped in whenever it finished decoding. Each one now fades
        up as it decodes, over the card's own background rather than a hole. */
  (function pictureArrival() {
    if (reduced) return;

    function splitTall() {
      var changed = false;
      [].forEach.call(document.querySelectorAll('[data-fx="stagger"]'), function (c) {
        if (c.classList.contains('fx-in')) return;          // already on screen
        if (c.getBoundingClientRect().height <= innerHeight * 0.92) return;
        var step = parseFloat(c.getAttribute('data-fx-step')) || 80;
        c.removeAttribute('data-fx');
        [].forEach.call(c.children, function (kid, i) {
          kid.classList.remove('fx-stagger-item', 'fx-in');
          kid.style.transitionDelay = '';
          kid.setAttribute('data-fx', 'reveal');
          /* a small, capped offset: enough to feel sequenced when two land
             together, never enough to still be running when you reach one */
          kid.setAttribute('data-fx-delay', String(Math.min(i, 2) * step));
        });
        changed = true;
      });
      if (changed && window.ScrollFXKit) window.ScrollFXKit.refresh();
    }
    /* measure now, and again once the webfonts have settled — a block of
       text is shorter before its real font arrives, which is enough to make
       a tall container look short enough to leave alone */
    splitTall();
    addEventListener('load', splitTall);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(splitTall);

    [].forEach.call(
      document.querySelectorAll('.col-card img, .tile img, .eternal-art img, .quote-bg img, .hero-tile img'),
      function (img) {
        if (img.complete && img.naturalWidth) return;      // already decoded
        img.style.opacity = '0';
        img.style.transition = 'opacity .75s var(--ease)';
        var show = function () { img.style.opacity = '1'; };
        img.addEventListener('load', show);
        img.addEventListener('error', show);
        setTimeout(show, 4000);                            // never stay hidden
      });
  }());

  /* ---------------- loader ----------------
     A minimum on screen rather than a delay after load, so the intro is the
     same beat whether the page is cached or cold — otherwise a second visit
     flashes the logo for a frame and it reads as a glitch. */
  var done = false, START = Date.now(), MIN_INTRO = 2000;
  function finish() {
    if (done) return; done = true;
    document.body.classList.add('ready');
    setTimeout(function () { var l = $('#loader'); if (l) l.remove(); }, 850);
    setTimeout(function () { var b = $('#dmBubble'); if (b) b.classList.add('in'); }, 1500);
  }
  function ready() {
    if (done) return;
    var left = MIN_INTRO - (Date.now() - START);
    if (left > 0) { setTimeout(finish, left); return; }
    finish();
  }
  /* Start the clock straight away rather than waiting for `load`. Waiting
     meant the intro stretched to 3-4s on a real connection, because `load`
     waits on webfonts — and the hero's own pictures fade in as they decode
     anyway, so there is nothing to wait for. `load` is kept as a second
     trigger for the case where this script somehow runs before it. */
  ready();
  window.addEventListener('load', ready);
  setTimeout(finish, 4600);                      // never hold the page hostage

  /* ---------------- smooth scroll ----------------
     Lenis for a mouse wheel only. A library driving the page from a rAF loop
     fights a thumb that is already dragging it, so touch keeps its native
     momentum and feels better for it. */
  var lenis = null;
  if (!reduced && (!window.matchMedia || matchMedia('(pointer: fine)').matches)
      && typeof window.Lenis === 'function') {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.6
    });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    /* Lenis drives the scroll itself. Leaving CSS smooth scrolling on means
       the browser animates the same jump a second time and the two fight —
       anchor links land hundreds of pixels short. */
    html.style.scrollBehavior = 'auto';
  }

  var lockedAt = 0, locks = 0;
  function lockScroll(on) {
    locks = Math.max(0, locks + (on ? 1 : -1));
    if (on && locks > 1) return;
    if (!on && locks > 0) return;
    var b = document.body;
    if (on) {
      lockedAt = window.scrollY || html.scrollTop || 0;
      if (lenis) lenis.stop();
      b.style.overflow = 'hidden';
      if (!lenis) { b.style.position = 'fixed'; b.style.top = (-lockedAt) + 'px'; b.style.left = '0'; b.style.right = '0'; }
    } else {
      if (lenis) lenis.start();
      b.style.overflow = ''; b.style.position = ''; b.style.top = ''; b.style.left = ''; b.style.right = '';
      if (!lenis) window.scrollTo(0, lockedAt);
    }
  }

  /* ---------------- nav ---------------- */
  var nav = $('#nav'), burger = $('#burger'), drawer = $('#drawer');
  addEventListener('scroll', function () {
    nav.classList.toggle('solid', (window.scrollY || 0) > 40);
  }, { passive: true });

  function setDrawer(open) {
    if (!drawer) return;
    if (open) drawer.hidden = false;
    requestAnimationFrame(function () { drawer.classList.toggle('open', open); });
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    lockScroll(open);
    $$('#drawer nav a').forEach(function (a, i) {
      a.style.transitionDelay = open ? (60 + i * 38) + 'ms' : '0ms';
    });
    if (!open) setTimeout(function () { if (!drawer.classList.contains('open')) drawer.hidden = true; }, 480);
  }
  if (burger) burger.addEventListener('click', function () {
    setDrawer(!drawer.classList.contains('open'));
  });

  /* ---------------- anchor jumps ----------------
     An instant scroll does NOT cancel a smooth scroll already in flight —
     it resumes and finishes at its own target, landing ~100px off. So the
     landing is re-asserted over the next few frames. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute('href');
    if (!id || id === '#') return;
    var target = id === '#top' ? document.body : $(id);
    if (!target) return;
    e.preventDefault();
    if (drawer && drawer.classList.contains('open')) setDrawer(false);
    var land = function () {
      var b = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';
      if (id === '#top') window.scrollTo(0, 0);
      else target.scrollIntoView({ block: 'start' });
      html.style.scrollBehavior = b;
    };
    setTimeout(function () {
      if (lenis) { lenis.scrollTo(id === '#top' ? 0 : target, { offset: -84 }); return; }
      land(); requestAnimationFrame(land);
      setTimeout(land, 140); setTimeout(land, 360);
    }, drawer && drawer.hidden === false ? 120 : 0);
  });

  /* ---------------- starfield ----------------
     Slow. The point is that it is barely noticed. */
  (function stars() {
    var c = $('#stars'); if (!c || reduced) { if (c) c.remove(); return; }
    var ctx = c.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2), w = 0, h = 0, pts = [];
    function build() {
      w = innerWidth; h = innerHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(150, (w * h) / 13000));
      pts = [];
      for (var i = 0; i < n; i++) pts.push({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.25 + .28,
        a: Math.random() * .5 + .16,
        tw: Math.random() * .0012 + .0004,
        ph: Math.random() * Math.PI * 2,
        vy: (Math.random() * .012 + .004)      /* a very slow drift down */
      });
    }
    build();
    var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 200); }, { passive: true });
    (function frame(t) {
      requestAnimationFrame(frame);
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.y += p.vy; if (p.y > h + 2) { p.y = -2; p.x = Math.random() * w; }
        var a = p.a * (0.62 + 0.38 * Math.sin(t * p.tw + p.ph));
        ctx.beginPath();
        ctx.fillStyle = 'rgba(253,231,234,' + a.toFixed(3) + ')';
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fill();
      }
    })(0);
  }());

  /* ---------------- drifting petals ---------------- */
  (function petals() {
    var host = $('#petals'); if (!host || reduced) { if (host) host.remove(); return; }
    var n = innerWidth < 700 ? 7 : 12;
    for (var i = 0; i < n; i++) {
      var p = el('i', { class: 'petal' });
      p.style.setProperty('--w', (9 + Math.random() * 12).toFixed(1) + 'px');
      p.style.setProperty('--o', (0.10 + Math.random() * 0.22).toFixed(2));
      p.style.setProperty('--d', (34 + Math.random() * 26).toFixed(1) + 's');   /* slow */
      p.style.setProperty('--s', (13 + Math.random() * 11).toFixed(1) + 's');
      p.style.setProperty('--delay', (-Math.random() * 40).toFixed(1) + 's');
      p.style.left = (Math.random() * 100).toFixed(2) + '%';
      host.appendChild(p);
    }
  }());

  /* ---------------- marquee ----------------
     iOS will not paint a moving (composited) layer wider than ~4096 DEVICE
     pixels, and it fails silently — the strip just goes blank. Cutting it
     shorter cannot fix that, because covering a wide screen needs a wide
     element. So nothing here is animated: the band's own scrollLeft moves,
     which the browser tiles and which has no width limit at all. */
  (function marquee() {
    var track = $('#marquee'); if (!track) return;
    var band = track.parentNode;
    var words = ['Eternal roses', 'Gift boxes', 'Wrapped bouquets', 'Hampers',
                 'Made by hand', 'Manchester', 'Roses never fade'];
    var cells = [], runW = 0, smooth = true;

    function build() {
      track.innerHTML = '';
      var first = el('div', { class: 'band-run' },
        words.map(function (w) { return '<span>' + esc(w) + '</span>'; }).join(''));
      track.appendChild(first);
      runW = first.getBoundingClientRect().width;
      if (!runW) return;
      var copies = Math.ceil((band.clientWidth + runW) / runW) + 1;
      for (var c = 1; c < copies; c++) track.appendChild(first.cloneNode(true));

      /* iOS will not paint a moving (composited) layer wider than ~4096 DEVICE
         pixels, and it fails silently — the strip just goes blank. So the thing
         that moves is each WORD, not the strip: every span gets its own small
         layer, and the widest is a couple of hundred pixels. Moving them all by
         the same amount looks exactly like moving the strip. */
      cells = [].slice.call(track.querySelectorAll('.band-run > span'));
      var dpr = window.devicePixelRatio || 1, widest = 0;
      cells.forEach(function (c2) {
        var w = c2.getBoundingClientRect().width * dpr;
        if (w > widest) widest = w;
        c2.style.transform = '';
      });
      smooth = widest < 3800;              /* it never is; this is the seatbelt */
      band.scrollLeft = 0;
    }
    build();
    var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 250); }, { passive: true });
    if (reduced) return;

    var x = 0, last = 0, SPEED = 34, seen = true;
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) { seen = es[0].isIntersecting; }).observe(band);
    }
    (function frame(now) {
      requestAnimationFrame(frame);
      if (!runW || !seen) { last = now; return; }
      if (!last) { last = now; return; }
      var dt = Math.min(64, now - last); last = now;
      x += SPEED * dt / 1000;
      if (x >= runW) x -= runW;
      if (smooth) {
        /* sub-pixel, so it glides. scrollLeft rounds to whole pixels, and at
           34px a second that is ~0.57px a frame — which reads as a stutter. */
        var t = 'translate3d(' + (-x).toFixed(2) + 'px,0,0)';
        for (var i = 0; i < cells.length; i++) cells[i].style.transform = t;
      } else {
        band.scrollLeft = x;
      }
    })(0);
  }());

  /* ---------------- price list ---------------- */
  (function priceList() {
    function fill(id, rows) {
      var ul = $('#' + id); if (!ul) return;
      ul.innerHTML = rows.map(function (r) {
        return '<li><span class="nm">' + esc(r.name) + '</span>' +
               '<span class="dots"></span>' +
               '<span class="pv">£' + r.price + '</span></li>';
      }).join('');
    }
    fill('pcBouquets', PRICES.bouquets);
    fill('pcAddons',   PRICES.addons);
    fill('pcSpecials', PRICES.specials);
  }());

  /* ---------------- occasions ---------------- */
  (function occasions() {
    var ul = $('#occGrid'); if (!ul) return;
    var ICONS = {
      'Weddings':        '<path d="M11 20a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/><path d="M21 20a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/><path d="M13 8l3-4 3 4"/>',
      'Birthdays':       '<rect x="6" y="14" width="20" height="12" rx="2"/><path d="M6 19h20"/><path d="M11 14v-3M16 14v-3M21 14v-3"/><path d="M11 8a1 1 0 1 1 0 0M16 8a1 1 0 1 1 0 0M21 8a1 1 0 1 1 0 0"/>',
      'Baby showers':    '<path d="M16 26a8 8 0 0 0 8-8v-4a8 8 0 1 0-16 0v4a8 8 0 0 0 8 8Z"/><path d="M13 14h.01M19 14h.01"/><path d="M13.5 19a4 4 0 0 0 5 0"/>',
      'Valentine’s Day': '<path d="M16 26s-9-5.6-9-12.4A5.6 5.6 0 0 1 16 9a5.6 5.6 0 0 1 9 4.6C25 20.4 16 26 16 26Z"/>',
      'Graduations':     '<path d="M4 13l12-5 12 5-12 5-12-5Z"/><path d="M9 15.5V21c0 2 3.2 3.5 7 3.5s7-1.5 7-3.5v-5.5"/>',
      'Anniversaries':   '<circle cx="12" cy="18" r="6"/><circle cx="20" cy="18" r="6"/>',
      'Get well soon':   '<path d="M16 27s-9-5.6-9-12.4A5.6 5.6 0 0 1 16 10a5.6 5.6 0 0 1 9 4.6C25 21.4 16 27 16 27Z"/><path d="M13 16h6M16 13v6"/>',
      'Eid':             '<path d="M21 6a10 10 0 1 0 0 20 12 12 0 0 1 0-20Z"/><path d="M25 12l1 2.6 2.7.4-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.4L25 12Z"/>',
      'Sympathy':        '<path d="M16 27V12"/><path d="M16 16c-4-3-8-2-9 1 3 2 7 1 9-1Z"/><path d="M16 16c4-3 8-2 9 1-3 2-7 1-9-1Z"/><path d="M16 12c-2-3-1-6 0-7 1 1 2 4 0 7Z"/>'
    };
    ul.innerHTML = OCCASIONS.map(function (o) {
      return '<li><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.2" ' +
             'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
             (ICONS[o] || '<circle cx="16" cy="16" r="9"/>') + '</svg><span>' + esc(o) + '</span></li>';
    }).join('');
    if (window.ScrollFXKit) window.ScrollFXKit.refresh(ul.parentNode);
  }());

  /* ---------------- the builder ---------------- */
  (function builder() {
    var host = $('#bdSizes'); if (!host) return;

    var SIZES = PRICES.bouquets.concat(PRICES.specials);
    var state = { size: 1, colours: {}, style: 'wrapped', extras: {} };
    state.colours['Red'] = true;

    /* chips are built ONCE and only re-classed afterwards. Rebuilding them on
       every tap re-fetches nothing here but does throw away focus and, on a
       half-scrolled card, makes the page jump. */
    function chipRow(holder, items, isOn, onPick, label) {
      holder.innerHTML = '';
      items.forEach(function (it, i) {
        var b = el('button', { type: 'button', class: 'chip' },
          esc(it.name) + (it.price != null ? '<span class="cp">£' + it.price + '</span>' : ''));
        b.setAttribute('aria-pressed', 'false');
        quietClick(b, function () { onPick(i, it); paint(); });
        holder.appendChild(b);
      });
      holder._items = items; holder._isOn = isOn;
      if (label) holder.setAttribute('aria-label', label);
    }

    chipRow($('#bdSizes'), SIZES,
      function (it, i) { return state.size === i; },
      function (i) { state.size = i; });

    chipRow($('#bdColours'), COLOURS.map(function (c) { return { name: c }; }),
      function (it) { return !!state.colours[it.name]; },
      function (i, it) {
        state.colours[it.name] = !state.colours[it.name];
        /* "Mixed" is its own answer — it clears the rest, and picking a
           specific colour clears "Mixed" */
        if (it.name === 'Mixed' && state.colours.Mixed) {
          Object.keys(state.colours).forEach(function (k) { if (k !== 'Mixed') state.colours[k] = false; });
        } else if (it.name !== 'Mixed') { state.colours.Mixed = false; }
      });

    chipRow($('#bdStyle'), STYLES,
      function (it) { return state.style === it.key; },
      function (i, it) { state.style = it.key; });

    chipRow($('#bdExtras'), PRICES.addons,
      function (it) { return !!state.extras[it.key]; },
      function (i, it) { state.extras[it.key] = !state.extras[it.key]; });

    var noteEl = $('#bdNote');
    if (noteEl) noteEl.addEventListener('input', paint);

    function chosenColours() {
      return COLOURS.filter(function (c) { return state.colours[c]; });
    }
    function chosenExtras() {
      return PRICES.addons.filter(function (a) { return state.extras[a.key]; });
    }
    function total() {
      var t = SIZES[state.size].price;
      chosenExtras().forEach(function (a) { t += a.price; });
      return t;
    }
    function styleObj() {
      for (var i = 0; i < STYLES.length; i++) if (STYLES[i].key === state.style) return STYLES[i];
      return STYLES[0];
    }
    function list(a) {
      if (!a.length) return '';
      if (a.length === 1) return a[0];
      return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
    }

    /* the exact text that gets copied and sent — shown on the page first, so
       nobody is tapping a button without knowing what it says */
    function message() {
      return 'Hi! I’d like ' + summary() + '. That comes to ' + money(total()) +
        ' on your website' + (styleObj().quoted ? ', plus the ' + styleObj().name.toLowerCase() : '') + '.';
    }

    function summary() {
      var cols = chosenColours(), ex = chosenExtras().map(function (a) { return a.name.toLowerCase(); });
      var bits = [SIZES[state.size].name];
      if (cols.length) bits.push('in ' + list(cols).toLowerCase());
      bits.push('as a ' + styleObj().name.toLowerCase());
      if (ex.length) bits.push('with ' + list(ex));
      var note = noteEl ? noteEl.value.trim() : '';
      if (note) bits.push('written on it: “' + note + '”');
      return bits.join(', ');
    }

    function paint() {
      [['#bdSizes'], ['#bdColours'], ['#bdStyle'], ['#bdExtras']].forEach(function (s) {
        var h = $(s[0]); if (!h || !h._items) return;
        [].forEach.call(h.children, function (b, i) {
          var on = h._isOn(h._items[i], i);
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      });

      var spec = $('#bdSpec'), cols = chosenColours(), ex = chosenExtras();
      var rows = [['Size', SIZES[state.size].name + '  ' + money(SIZES[state.size].price)]];
      rows.push(['Colours', cols.length ? list(cols) : '—']);
      rows.push(['Arrives as', styleObj().name]);
      rows.push(['Extras', ex.length
        ? ex.map(function (a) { return a.name + ' ' + money(a.price); }).join(', ') : 'None']);
      var note = noteEl ? noteEl.value.trim() : '';
      if (note) rows.push(['Written on it', '“' + note + '”']);
      spec.innerHTML = rows.map(function (r) {
        return '<li><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></li>';
      }).join('');

      $('#bdPrice').textContent = money(total());
      $('#bdSmall').textContent = styleObj().quoted
        ? 'A ' + styleObj().name.toLowerCase() + ' is priced on enquiry — this is the roses and extras only.'
        : 'Two weeks’ notice. Delivery around ' + CONTACT.area + ' is arranged once the order is confirmed.';
      var m = $('#bdMsg');
      if (m) m.textContent = message();
    }

    /* One action: the message goes on the clipboard (or straight into the
       share sheet where there is one, which skips the pasting), the enquiry
       form below is filled in so the details are recorded either way, and her
       DMs open ready for it. */
    function fillForm() {
      var msg = $('#enqMsg');
      if (msg) {
        msg.value = 'I’d like ' + summary() + '.\n\nTotal from the website: ' + money(total()) +
          (styleObj().quoted ? ' (plus the ' + styleObj().name.toLowerCase() + ')' : '') + '.';
      }
    }
    function gotoForm() {
      var sec = $('#enquire'); if (!sec) return;
      if (lenis) lenis.scrollTo(sec, { offset: -84 });
      else sec.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      setTimeout(function () {
        var nm = $('#enqName');
        if (nm) try { nm.focus({ preventScroll: true }); } catch (e) {}
      }, 700);
    }

    var sendBtn = $('#bdSend');
    if (sendBtn) sendBtn.addEventListener('click', function () {
      var text = message(), note = $('#bdCopy');
      fillForm();
      handOver(text, function (how) {
        if (how === 'shared')    { note.textContent = 'Sent — your order went across with it.'; return; }
        if (how === 'cancelled') { note.textContent = ''; return; }
        if (how === 'copied')    { note.textContent = 'Copied — paste it into the message.'; }
        else                     { note.textContent = 'Copy the message above and send it over.'; }
        openDm();
      });
      toast('Copied — opening Instagram');
    });

    var formBtn = $('#bdForm');
    if (formBtn) formBtn.addEventListener('click', function () {
      fillForm(); gotoForm();
      toast('Added to the enquiry form below');
    });

    paint();
  }());

  /* Instagram gives no way to pre-fill a DM from a link — there is no URL
     parameter for it, from anyone. The share sheet is the closest thing that
     exists: on a phone it carries the text into whichever app is picked,
     Instagram Direct included, so nothing has to be pasted. Everywhere else
     the order goes on the clipboard and the DM opens ready for it. */
  function canShare() {
    try { return typeof navigator.share === 'function'; } catch (e) { return false; }
  }
  function openDm() {
    try { window.open(CONTACT.dm || CONTACT.instagram, '_blank', 'noopener'); } catch (e) {}
  }
  function handOver(text, done) {
    if (canShare()) {
      var p;
      try { p = navigator.share({ text: text }); } catch (e) { p = null; }
      if (p && p.then) {
        p.then(function () { done('shared'); }, function (err) {
          if (err && err.name === 'AbortError') { done('cancelled'); return; }
          copy(text, function (ok) { done(ok ? 'copied' : 'manual'); });
        });
        return;
      }
    }
    copy(text, function (ok) { done(ok ? 'copied' : 'manual'); });
  }

  function copy(text, cb) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { cb(true); }, function () { cb(false); });
      return;
    }
    try {
      var ta = el('textarea'); ta.value = text;
      ta.style.cssText = 'position:fixed;top:-2000px';
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta); cb(ok);
    } catch (e) { cb(false); }
  }

  /* ---------------- toast ---------------- */
  var toastT;
  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('on'); }, 2800);
  }

  /* ---------------- gallery ---------------- */
  (function gallery() {
    var rail = $('#gal'); if (!rail) return;
    rail.innerHTML = GALLERY.map(function (g, i) {
      return '<figure class="tile" role="listitem" data-lb="' + i + '">' +
        '<img src="../assets/starlit/photos/' + g.src + '" alt="' + esc(g.cap) +
        '" width="900" height="1125" loading="lazy">' +
        '<figcaption>' + esc(g.cap) + '</figcaption></figure>';
    }).join('');
  }());

  /* ---------------- reviews ---------------- */
  (function reviews() {
    var rail = $('#rvRail'); if (!rail) return;
    rail.innerHTML = REVIEWS.map(function (r) {
      return '<article class="rv" role="listitem">' +
        '<p class="rv-stars" aria-label="5 out of 5">★★★★★</p>' +
        '<p>' + esc(r.t) + '</p>' +
        '<footer><span class="rv-av" aria-hidden="true">' + esc(r.n.charAt(0)) + '</span>' +
        '<div><strong>' + esc(r.n) + '</strong>Google review (example)</div></footer></article>';
    }).join('');
    if (CONTACT.googleRating) $('#gRating').textContent = CONTACT.googleRating;
    if (CONTACT.googleCount)  $('#gCount').textContent  = 'from ' + CONTACT.googleCount + ' reviews';
    var w = $('#gWrite');
    if (w) {
      if (CONTACT.googleWrite) w.href = CONTACT.googleWrite;
      else { w.href = CONTACT.instagram; w.textContent = 'Message on Instagram'; }
    }
  }());

  /* ---------------- rails: drag, arrows, keyboard ---------------- */
  $$('[data-rail]').forEach(function (rail) {
    var down = false, sx = 0, sl = 0, moved = 0;
    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;          // let touch do its own thing
      down = true; moved = 0; sx = e.clientX; sl = rail.scrollLeft;
      rail.classList.add('drag');
    });
    addEventListener('pointermove', function (e) {
      if (!down) return;
      var d = e.clientX - sx; moved = Math.abs(d);
      rail.scrollLeft = sl - d;
    });
    addEventListener('pointerup', function () {
      if (!down) return;
      down = false; rail.classList.remove('drag');
    });
    rail.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);

    function step(dir) {
      var first = rail.firstElementChild; if (!first) return;
      var gap = parseFloat(getComputedStyle(rail).columnGap || getComputedStyle(rail).gap) || 16;
      rail.scrollBy({ left: dir * (first.getBoundingClientRect().width + gap), behavior: reduced ? 'auto' : 'smooth' });
    }
    var prev = $('[data-rail-prev="' + rail.id + '"]');
    var next = $('[data-rail-next="' + rail.id + '"]');
    if (prev) quietClick(prev, function () { step(-1); });
    if (next) quietClick(next, function () { step(1); });
    function arrows() {
      var max = rail.scrollWidth - rail.clientWidth - 2;
      if (prev) prev.disabled = rail.scrollLeft <= 2;
      if (next) next.disabled = rail.scrollLeft >= max;
      var wrapEl = prev && prev.parentNode;
      if (wrapEl) wrapEl.hidden = max <= 4;
    }
    rail.addEventListener('scroll', arrows, { passive: true });
    addEventListener('resize', arrows, { passive: true });
    setTimeout(arrows, 300); setTimeout(arrows, 1200);
  });

  /* ---------------- lightbox ---------------- */
  (function lightbox() {
    var lb = $('#lb'), img = $('#lbImg'), cap = $('#lbCap');
    if (!lb) return;
    var at = 0;
    function open(i) {
      /* stepping to the next picture calls this again — taking a SECOND
         scroll lock each time would leave the page pinned after it closes */
      var wasOpen = !lb.hidden;
      at = (i + GALLERY.length) % GALLERY.length;
      img.src = '../assets/starlit/photos/' + GALLERY[at].src;
      img.alt = GALLERY[at].cap;
      cap.textContent = GALLERY[at].cap + ' — example photography';
      if (wasOpen) return;
      lb.hidden = false;
      requestAnimationFrame(function () { lb.classList.add('open'); });
      lockScroll(true);
    }
    function close() {
      if (lb.hidden) return;
      lb.classList.remove('open'); lockScroll(false);
      setTimeout(function () { lb.hidden = true; img.removeAttribute('src'); }, 420);
    }
    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-lb]') : null;
      if (t) { open(parseInt(t.getAttribute('data-lb'), 10) || 0); return; }
      if (e.target === lb || (e.target.closest && e.target.closest('#lbX'))) close();
      else if (e.target.closest && e.target.closest('#lbPrev')) open(at - 1);
      else if (e.target.closest && e.target.closest('#lbNext')) open(at + 1);
    });
    addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') open(at - 1);
      if (e.key === 'ArrowRight') open(at + 1);
    });
  }());

  /* ---------------- FAQ ---------------- */
  (function faq() {
    var host = $('#faqList'); if (!host) return;
    host.innerHTML = FAQ.map(function (f, i) {
      return '<div class="q"><button type="button" aria-expanded="false" aria-controls="qa' + i + '">' +
        esc(f.q) + '<span class="q-ico" aria-hidden="true"></span></button>' +
        '<div class="q-a" id="qa' + i + '"><p>' + esc(f.a) + '</p></div></div>';
    }).join('');
    $$('.q button', host).forEach(function (b) {
      b.addEventListener('click', function () {
        var q = b.parentNode, panel = q.querySelector('.q-a'), on = q.classList.contains('on');
        $$('.q.on', host).forEach(function (o) {
          o.classList.remove('on');
          o.querySelector('.q-a').style.height = '0px';
          o.querySelector('button').setAttribute('aria-expanded', 'false');
        });
        if (!on) {
          q.classList.add('on');
          panel.style.height = panel.firstElementChild.offsetHeight + 'px';
          b.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }());

  /* ---------------- occasion chips on the form ---------------- */
  (function occChips() {
    var host = $('#occChips'), hidden = $('#enqOccasion');
    if (!host || !hidden) return;
    var opts = ['Just because'].concat(OCCASIONS);
    opts.forEach(function (o) {
      var b = el('button', { type: 'button', class: 'chip' }, esc(o));
      b.setAttribute('aria-pressed', o === hidden.value ? 'true' : 'false');
      if (o === hidden.value) b.classList.add('on');
      quietClick(b, function () {
        hidden.value = o;
        [].forEach.call(host.children, function (c) {
          var on = c === b;
          c.classList.toggle('on', on);
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      });
      host.appendChild(b);
    });
  }());

  /* ---------------- enquiry form ---------------- */
  (function form() {
    var f = $('#enqForm'); if (!f) return;
    var msg = $('#formMsg'), btn = $('#enqBtn');

    function say(text, isHtml) {
      msg.classList.add('on');
      if (isHtml) msg.innerHTML = text; else msg.textContent = text;
    }

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (val('enqHp')) return;                        // honeypot

      var name = val('enqName'), reach = val('enqReach'), body = val('enqMsg');
      if (!name)  { say('Please add your name.'); $('#enqName').focus(); return; }
      if (!reach) { say('Please add an Instagram handle, email or number for the reply.'); $('#enqReach').focus(); return; }
      if (!body)  { say('Add a little about what you’d like and it can go from there.'); $('#enqMsg').focus(); return; }

      var payload = {
        name: name, reach: reach,
        occasion: val('enqOccasion') || 'Just because',
        date: val('enqDate') || 'Not given',
        budget: val('enqBudget') || 'Not given',
        message: body
      };
      var plain =
        'Name: ' + payload.name + '\n' +
        'Contact: ' + payload.reach + '\n' +
        'Occasion: ' + payload.occasion + '\n' +
        'Date needed: ' + payload.date + '\n' +
        'Budget: ' + payload.budget + '\n\n' + payload.message;

      if (!W3F_KEY) {
        /* Not wired to an inbox yet, so nothing is silently swallowed: the
           whole enquiry is handed over instead — through the share sheet
           where there is one, the clipboard where there isn't. */
        say('Opening your message…');
        handOver(plain, function (how) {
          if (how === 'shared')    { f.reset(); say('Thank you — that’s on its way.'); return; }
          if (how === 'cancelled') { say('No problem — the form is still here when you want it.'); return; }
          if (how === 'copied') {
            say('This demo form isn’t wired to an inbox yet, so your enquiry has been copied — ' +
                '<a href="' + esc(CONTACT.dm || CONTACT.instagram) + '" target="_blank" rel="noopener">' +
                'paste it into the Instagram DMs</a> and it’ll be picked up from there.', true);
            return;
          }
          say('Send this on Instagram:<br><br>' + esc(plain).replace(/\n/g, '<br>'), true);
        });
        return;
      }

      btn.disabled = true; btn.textContent = 'Sending…';
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: W3F_KEY,
          subject: 'Starlit Blooms enquiry — ' + payload.occasion,
          from_name: 'Starlit Blooms website',
          name: payload.name, email: CONTACT.email || undefined,
          message: plain
        })
      }).then(function (r) { return r.json(); }).then(function (d) {
        btn.disabled = false; btn.textContent = 'Send enquiry';
        if (d && d.success) { f.reset(); say('Sent — you’ll get a reply shortly. Thank you!'); }
        else say('That didn’t send. Please try again, or send it on Instagram.');
      }).catch(function () {
        btn.disabled = false; btn.textContent = 'Send enquiry';
        say('That didn’t send. Please try again, or send it on Instagram.');
      });
    });
  }());

  /* ---------------- socials + every Instagram link on the page ---------------- */
  (function links() {
    var ICONS = {
      instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/>',
      tiktok:    '<g transform="translate(0.05 1.3)"><path d="M14.2 3.2v9.6a3 3 0 1 1-2.4-2.94" stroke-linecap="round"/><path d="M14.2 3.2c.3 1.9 1.7 3.3 3.6 3.5" stroke-linecap="round"/></g>',
      facebook:  '<path d="M14.5 9V7.4c0-.8.3-1.2 1.2-1.2h1.4V3.5h-2.3c-2.5 0-3.4 1.4-3.4 3.4V9H9.5v2.9h1.9V20.5h3.1V11.9h2.2l.4-2.9h-2.6Z" stroke-linejoin="round"/>'
    };
    var host = $('#socials');
    if (host) {
      [['instagram', CONTACT.instagram, 'Instagram'],
       ['tiktok', CONTACT.tiktok, 'TikTok'],
       ['facebook', CONTACT.facebook, 'Facebook']].forEach(function (s) {
        if (!s[1]) return;
        host.appendChild(el('a', { href: s[1], target: '_blank', rel: 'noopener', 'aria-label': s[2] },
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
          'stroke-linecap="round" aria-hidden="true">' + ICONS[s[0]] + '</svg>'));
      });
    }
    [['#dmBubble', CONTACT.dm], ['#enqIg', CONTACT.dm], ['#drawerIg', CONTACT.dm]].forEach(function (p) {
      var n = $(p[0]); if (n) n.href = p[1] || CONTACT.instagram;
    });
  }());

}());
