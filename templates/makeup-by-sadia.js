/* ============================================================
   Makeup by Sadia — templates/makeup-by-sadia.js
   No build step, no framework.

   EVERYTHING SHE MIGHT WANT CHANGED IS IN THIS BLOCK.
   ============================================================ */
(function () {
  'use strict';

  /* ---- her details -------------------------------------------------- */
  var CONTACT = {
    handle:    'makeup_bysadia0',
    instagram: 'https://www.instagram.com/makeup_bysadia0',
    dm:        'https://ig.me/m/makeup_bysadia0',
    tiktok:    '',                 // add a URL and the icon appears
    facebook:  '',
    email:     '',                 // where enquiries should land
    /* Paste these when the Google Business profile is live and the review
       box stops being an example. */
    googleReviews: '',
    googleWrite:   '',
    googleRating:  '',             // e.g. '5.0'
    googleCount:   ''              // e.g. '18'
  };

  /* Web3Forms access key. Empty = the form still works: it hands the whole
     enquiry back as copyable text with a link straight to her DMs. */
  var W3F_KEY = '';

  /* ---- the diary ----------------------------------------------------
     Opening hours, how far ahead people can book, and which days are shut.
     `BOOKED` is where real bookings go — a date can be 'all' (nothing left)
     or a list of times already taken. Anything not listed is generated as a
     realistic-looking EXAMPLE so the calendar has something to show; set
     DIARY.example to false once the real diary is in and only `BOOKED`
     will be used. */
  var DIARY = {
    openHour:   8,                 // first appointment starts 08:00
    closeHour: 18,                 // last one finishes by 18:00
    slotHours:  1,
    closedDays: [0],               // 0 = Sunday
    monthsAhead: 2,                // this month + 2 = through November
    minNoticeDays: 2,              // nothing bookable in the next 2 days
    example: true
  };

  var BOOKED = {
    // '2026-10-11': 'all',
    // '2026-10-14': ['10:00', '11:00']
  };

  var OCCASIONS = ['Weddings', 'Birthdays', 'Eid', 'Baby showers', 'Engagements', 'Photoshoots'];
  var LOOKS = ['Natural', 'Soft glam', 'Party glam', 'Not sure yet'];

  /* Placeholder reviews, labelled as examples on the page. Swap them for real
     ones the day the Google profile goes live. */
  var REVIEWS = [
    { n: 'Amira H.',   t: 'Booked her for my engagement and she completely got what I meant by "natural but done". Lasted all day and I still looked like me in every photo.' },
    { n: 'Leah M.',    t: 'Soft glam for a birthday and it was gorgeous. She talked me through everything she was doing and nothing felt heavy.' },
    { n: 'Fatima R.',  t: 'Did me and my two sisters for Eid. On time, so calm, and all three of us looked completely different in the right way.' },
    { n: 'Chloe P.',   t: 'The lashes and the skin. That is all I am going to say. Already rebooked for my friend’s wedding.' },
    { n: 'Zara A.',    t: 'She listened. I have had makeup done before where I left feeling like someone else — not this. Exactly what I asked for.' },
    { n: 'Nadia K.',   t: 'Lovely from the first message to the last touch-up. Genuinely could not recommend more.' }
  ];

  var FAQ = [
    { q: 'Are bookings open yet?',
      a: 'Yes. The account is still being built up, but the diary is open and bookings are being taken now — pick a date on this page or send an enquiry and it will be confirmed by message.' },
    { q: 'How much is it?',
      a: 'Prices depend on the look, the occasion and how many people are being done, so they are given per enquiry rather than listed here. Send the details and you will get a price straight back.' },
    { q: 'Do you travel?',
      a: 'Yes — travel to you is usually fine and is worked out when the booking is confirmed. Just say where it is in the enquiry.' },
    { q: 'Can you do a group?',
      a: 'Yes. Bridal parties, families and groups of friends are all welcome. Say how many of you there are so enough time can be set aside.' },
    { q: 'Do you offer bridal trials?',
      a: 'Yes, and they are recommended. A trial is booked in well before the day so the look can be settled without any rush.' },
    { q: 'How far ahead should I book?',
      a: 'The earlier the better for weddings, Eid and the party season, which fill first. For everything else a couple of weeks is usually plenty.' },
    { q: 'What makeup do you use?',
      a: 'A professional kit built around what suits different skin tones and types, with long-wear products for events. If you have sensitivities or a brand you cannot use, say so in the enquiry.' },
    { q: 'How do I pay?',
      a: 'Payment is arranged directly once the booking is confirmed. Nothing is taken through this website.' }
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
  /* a duplicate id makes $('#x') return the wrong node and .value undefined */
  function val(id) { var n = $('#' + id); return n && typeof n.value === 'string' ? n.value.trim() : ''; }

  function quietClick(btn, fn) {
    btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
    btn.addEventListener('click', function (e) {
      fn(e);
      try { btn.focus({ preventScroll: true }); } catch (err) {}
    });
  }

  /* ---------------- loader ----------------
     A minimum measured from when the PAGE started loading, not from `load`
     and not from when this script arrived — either of those stretches the
     intro by however long the network took. */
  var sinceNav = (window.performance && performance.now) ? performance.now() : 0;
  var done = false, START = Date.now() - sinceNav, MIN_INTRO = 2000;
  function finish() {
    if (done) return; done = true;
    document.body.classList.add('ready');
    setTimeout(function () { var l = $('#loader'); if (l) l.remove(); }, 850);
    setTimeout(function () { var b = $('#dmBubble'); if (b) b.classList.add('in'); }, 1400);
  }
  function ready() {
    if (done) return;
    var left = MIN_INTRO - (Date.now() - START);
    if (left > 0) { setTimeout(finish, left); return; }
    finish();
  }
  ready();
  window.addEventListener('load', ready);
  setTimeout(finish, 4600);

  /* ---------------- smooth scroll ----------------
     Lenis for a wheel only: a library driving the page from a rAF loop fights
     a thumb that is already dragging it. */
  var lenis = null;
  if (!reduced && (!window.matchMedia || matchMedia('(pointer: fine)').matches)
      && typeof window.Lenis === 'function') {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.6
    });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    /* Lenis drives the scroll itself; leaving CSS smooth scrolling on means
       the browser animates the same jump again and anchors land short. */
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

  /* ---------------- nav + drawer ---------------- */
  var nav = $('#nav'), burger = $('#burger'), drawer = $('#drawer');
  addEventListener('scroll', function () {
    nav.classList.toggle('solid', (window.scrollY || 0) > 40);
  }, { passive: true });

  /* the drawer clears the header by measuring it: a fixed padding was always
     wrong on some screen, tucking the first link underneath */
  function sizeDrawer() {
    if (!nav || !drawer) return;
    drawer.style.setProperty('--navh', Math.round(nav.getBoundingClientRect().height) + 'px');
  }
  sizeDrawer();
  addEventListener('resize', sizeDrawer, { passive: true });
  addEventListener('orientationchange', function () { setTimeout(sizeDrawer, 200); });

  function setDrawer(open) {
    sizeDrawer();
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
     An instant scroll does not cancel a smooth one already in flight, so the
     landing is re-asserted over the next few frames. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute('href');
    if (!id || id === '#') return;
    var target = id === '#top' ? document.body : $(id);
    if (!target) return;
    e.preventDefault();
    var wasOpen = drawer && drawer.classList.contains('open');
    if (wasOpen) setDrawer(false);
    var land = function () {
      var b = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';
      if (id === '#top') window.scrollTo(0, 0);
      else target.scrollIntoView({ block: 'start' });
      html.style.scrollBehavior = b;
    };
    setTimeout(function () {
      if (lenis) { lenis.scrollTo(id === '#top' ? 0 : target, { offset: -86 }); return; }
      land(); requestAnimationFrame(land);
      setTimeout(land, 140); setTimeout(land, 360);
    }, wasOpen ? 120 : 0);
  });

  /* ---------------- how pictures arrive ----------------
     A [data-fx="stagger"] container fires ONCE, when the CONTAINER enters.
     Stacked on a phone a tall one animates every child while only the first
     is on screen, so the rest have finished before you reach them. And a
     lazy-loaded photo snaps in whenever it decodes unless it is faded. */
  (function pictureArrival() {
    if (reduced) return;
    function splitTall() {
      var changed = false;
      $$('[data-fx="stagger"]').forEach(function (c) {
        if (c.classList.contains('fx-in')) return;
        if (c.getBoundingClientRect().height <= innerHeight * 0.92) return;
        var step = parseFloat(c.getAttribute('data-fx-step')) || 80;
        c.removeAttribute('data-fx');
        [].forEach.call(c.children, function (kid, i) {
          kid.classList.remove('fx-stagger-item', 'fx-in');
          kid.style.transitionDelay = '';
          kid.setAttribute('data-fx', 'reveal');
          kid.setAttribute('data-fx-delay', String(Math.min(i, 2) * step));
        });
        changed = true;
      });
      if (changed && window.ScrollFXKit) window.ScrollFXKit.refresh();
    }
    /* measure again once the webfonts land: text is shorter before its real
       font arrives, which can make a tall block look short enough to skip */
    splitTall();
    addEventListener('load', splitTall);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(splitTall);

    $$('.hero-tile img, .about-art img, .quote-bg img, .look img').forEach(function (img) {
      if (img.complete && img.naturalWidth) return;
      img.style.opacity = '0';
      img.style.transition = 'opacity .75s var(--ease)';
      var show = function () { img.style.opacity = img.classList.contains('look-bg') ? '.3' : '1'; };
      img.addEventListener('load', show);
      img.addEventListener('error', show);
      setTimeout(show, 4000);
    });
  }());

  /* ---------------- marquee ----------------
     iOS will not paint a moving layer wider than ~4096 DEVICE pixels and it
     fails silently. So each WORD is what moves: small layers, sub-pixel
     motion (scrollLeft rounds to whole pixels and visibly stutters). */
  (function marquee() {
    var track = $('#marquee'); if (!track) return;
    var band = track.parentNode;
    var words = ['Party makeup', 'Natural', 'Soft glam', 'Weddings', 'Birthdays',
                 'Eid', 'Baby showers', 'For all occasions'];
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
      cells = $$('.band-run > span', track);
      var dpr = window.devicePixelRatio || 1, widest = 0;
      cells.forEach(function (c2) {
        var w = c2.getBoundingClientRect().width * dpr;
        if (w > widest) widest = w;
        c2.style.transform = '';
      });
      smooth = widest < 3800;                 /* it never is; this is the seatbelt */
      band.scrollLeft = 0;
    }
    build();
    var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 250); }, { passive: true });
    if (reduced) return;

    var x = 0, last = 0, SPEED = 32, seen = true;
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
        var t = 'translate3d(' + (-x).toFixed(2) + 'px,0,0)';
        for (var i = 0; i < cells.length; i++) cells[i].style.transform = t;
      } else {
        band.scrollLeft = x;
      }
    })(0);
  }());

  /* ============================================================
     The diary
     ============================================================ */
  var MONTHS = ['January','February','March','April','May','June','July',
                'August','September','October','November','December'];
  var DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  function key(d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function allSlots() {
    var out = [];
    for (var h = DIARY.openHour; h + DIARY.slotHours <= DIARY.closeHour; h += DIARY.slotHours) {
      out.push(('0' + h).slice(-2) + ':00');
    }
    return out;
  }
  /* A stable hash of the date string: the example diary has to look the same
     on every reload and on every device, so nothing random is used. */
  function seed(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967295;
  }

  function dayState(d) {
    var k = key(d), slots = allSlots();
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var min = new Date(today); min.setDate(min.getDate() + DIARY.minNoticeDays);

    if (d < min) return { state: 'past', taken: slots.slice() };
    if (DIARY.closedDays.indexOf(d.getDay()) >= 0) return { state: 'closed', taken: slots.slice() };

    var manual = BOOKED[k];
    if (manual === 'all') return { state: 'full', taken: slots.slice() };
    var taken = Array.isArray(manual) ? manual.slice() : [];

    if (DIARY.example) {
      var r = seed(k);
      /* weekends fill up first, which is what a real makeup diary looks like */
      var weekend = d.getDay() === 6 || d.getDay() === 5;
      if (r < (weekend ? 0.34 : 0.18)) return { state: 'full', taken: slots.slice() };
      var n = 1 + Math.floor(seed(k + 'n') * (weekend ? 9 : 8));
      for (var i = 0; i < slots.length && taken.length < n; i++) {
        if (seed(k + slots[i]) < 0.62 && taken.indexOf(slots[i]) < 0) taken.push(slots[i]);
      }
    }
    var left = slots.length - taken.length;
    if (left <= 0) return { state: 'full', taken: slots.slice() };
    return { state: left <= 3 ? 'some' : 'free', taken: taken };
  }

  (function calendar() {
    var grid = $('#calGrid'); if (!grid) return;
    var monthEl = $('#calMonth'), prev = $('#calPrev'), next = $('#calNext');
    var slotsEl = $('#slots'), sTitle = $('#slotTitle'), sSub = $('#slotSub');
    var go = $('#calGo'), picked = $('#calPicked');

    var today = new Date(); today.setHours(0, 0, 0, 0);
    var first = new Date(today.getFullYear(), today.getMonth(), 1);
    var lastMonth = new Date(today.getFullYear(), today.getMonth() + DIARY.monthsAhead, 1);
    /* Open on a month people can actually book. Landing on the tail end of
       the current month shows an almost empty grid, which reads as "nothing
       is available" rather than "this month is nearly over". */
    var view = new Date(first);
    (function openOnUseful() {
      for (var m = 0; m <= DIARY.monthsAhead; m++) {
        var probe = new Date(first.getFullYear(), first.getMonth() + m, 1);
        var count = new Date(probe.getFullYear(), probe.getMonth() + 1, 0).getDate(), open = 0;
        for (var n = 1; n <= count; n++) {
          var st = dayState(new Date(probe.getFullYear(), probe.getMonth(), n)).state;
          if (st === 'free' || st === 'some') open++;
        }
        if (open >= 6) { view = probe; return; }
      }
    }());
    var chosenDate = null, chosenTime = null;

    function drawMonth() {
      monthEl.textContent = MONTHS[view.getMonth()] + ' ' + view.getFullYear();
      prev.disabled = view <= first;
      next.disabled = view >= lastMonth;

      grid.innerHTML = '';
      var y = view.getFullYear(), m = view.getMonth();
      var lead = (new Date(y, m, 1).getDay() + 6) % 7;      /* weeks start Monday */
      for (var p = 0; p < lead; p++) grid.appendChild(el('div', { class: 'day pad', 'aria-hidden': 'true' }));

      var count = new Date(y, m + 1, 0).getDate();
      for (var n = 1; n <= count; n++) {
        var d = new Date(y, m, n);
        var st = dayState(d);
        var b = el('button', { type: 'button', class: 'day ' + st.state, role: 'gridcell' },
          '<span class="dn">' + n + '</span><span class="dd" aria-hidden="true"></span>');
        var label = DAYS[d.getDay()] + ' ' + n + ' ' + MONTHS[m];
        if (st.state === 'past' || st.state === 'closed' || st.state === 'full') {
          b.disabled = true;
          b.setAttribute('aria-label', label + ' — ' +
            (st.state === 'full' ? 'fully booked' : st.state === 'closed' ? 'not available' : 'too soon to book'));
        } else {
          b.setAttribute('aria-label', label + ' — ' +
            (st.state === 'some' ? 'a few times left' : 'free'));
          (function (dd, bb) { quietClick(bb, function () { pickDay(dd, bb); }); }(d, b));
        }
        grid.appendChild(b);
      }
      if (chosenDate && chosenDate.getMonth() === m && chosenDate.getFullYear() === y) {
        var idx = lead + chosenDate.getDate() - 1;
        if (grid.children[idx]) grid.children[idx].classList.add('on');
      }
    }

    function pickDay(d, btn) {
      chosenDate = d; chosenTime = null;
      $$('.day.on', grid).forEach(function (n) { n.classList.remove('on'); });
      btn.classList.add('on');
      var st = dayState(d), slots = allSlots();
      sTitle.textContent = DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
      var free = slots.filter(function (s) { return st.taken.indexOf(s) < 0; }).length;
      sSub.textContent = free + (free === 1 ? ' time' : ' times') + ' free — each appointment is about an hour.';
      slotsEl.innerHTML = '';
      slots.forEach(function (s) {
        var taken = st.taken.indexOf(s) >= 0;
        var b = el('button', { type: 'button', class: 'slot' }, esc(s));
        if (taken) { b.disabled = true; b.setAttribute('aria-label', s + ' — already booked'); }
        else quietClick(b, function () {
          chosenTime = s;
          $$('.slot.on', slotsEl).forEach(function (n) { n.classList.remove('on'); });
          b.classList.add('on');
          showPick();
        });
        slotsEl.appendChild(b);
      });
      go.hidden = true;
    }

    function niceDate() {
      if (!chosenDate) return '';
      return DAYS[chosenDate.getDay()] + ' ' + chosenDate.getDate() + ' ' +
             MONTHS[chosenDate.getMonth()] + ' ' + chosenDate.getFullYear();
    }
    function showPick() {
      go.hidden = false;
      picked.innerHTML = '<b>' + esc(niceDate()) + '</b> at <b>' + esc(chosenTime) + '</b>';
    }

    quietClick(prev, function () { if (prev.disabled) return; view.setMonth(view.getMonth() - 1); drawMonth(); });
    quietClick(next, function () { if (next.disabled) return; view.setMonth(view.getMonth() + 1); drawMonth(); });

    var send = $('#calSend');
    if (send) send.addEventListener('click', function () {
      var f = $('#enqDate');
      if (f) f.value = niceDate() + ' at ' + chosenTime;
      var sec = $('#enquire');
      if (sec) {
        if (lenis) lenis.scrollTo(sec, { offset: -86 });
        else sec.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      }
      setTimeout(function () {
        var n = $('#enqName');
        if (n) try { n.focus({ preventScroll: true }); } catch (e) {}
      }, 700);
      toast('Added to your enquiry below');
    });

    drawMonth();
  }());

  /* ---------------- occasions ---------------- */
  (function occasions() {
    var ul = $('#occGrid'); if (!ul) return;
    var ICONS = {
      'Weddings':      '<path d="M11 21a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/><path d="M21 21a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/><path d="M13 9l3-4 3 4"/>',
      'Birthdays':     '<rect x="6" y="14" width="20" height="12" rx="2"/><path d="M6 19h20"/><path d="M11 14v-3M16 14v-3M21 14v-3"/><path d="M11 8h.01M16 8h.01M21 8h.01"/>',
      'Eid':           '<path d="M21 6a10 10 0 1 0 0 20 12 12 0 0 1 0-20Z"/><path d="M25 12l1 2.6 2.7.4-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.4L25 12Z"/>',
      'Baby showers':  '<path d="M16 26a8 8 0 0 0 8-8v-4a8 8 0 1 0-16 0v4a8 8 0 0 0 8 8Z"/><path d="M13 14h.01M19 14h.01"/><path d="M13.5 19a4 4 0 0 0 5 0"/>',
      'Engagements':   '<path d="M16 12 11 7h10l-5 5Z"/><path d="M16 12a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z"/>',
      'Photoshoots':   '<rect x="5" y="10" width="22" height="15" rx="3"/><circle cx="16" cy="17.5" r="4.5"/><path d="M12 10l1.5-3h5L20 10"/>'
    };
    ul.innerHTML = OCCASIONS.map(function (o) {
      return '<li><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.2" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        (ICONS[o] || '<circle cx="16" cy="16" r="9"/>') + '</svg><span>' + esc(o) + '</span></li>';
    }).join('');
    if (window.ScrollFXKit) window.ScrollFXKit.refresh(ul.parentNode);
  }());

  /* ---------------- first looks (pre-launch) ---------------- */
  (function looks() {
    var ul = $('#looksGrid'); if (!ul) return;
    var tiles = ['tile-1', 'tile-2', 'tile-3', 'tile-4'];
    var caps = ['Coming soon', 'Coming soon', 'Coming soon', 'Coming soon'];
    ul.innerHTML = tiles.map(function (t, i) {
      return '<li class="look">' +
        '<img class="look-bg" src="../assets/sadia/photos/' + t + '.jpg" alt="" width="900" height="1125" loading="lazy">' +
        '<span class="look-in"><img src="../assets/sadia/mark.png" alt="" width="633" height="400">' +
        '<span>' + esc(caps[i]) + '</span></span></li>';
    }).join('');
    if (window.ScrollFXKit) window.ScrollFXKit.refresh(ul.parentNode);
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

  /* ---------------- rails ---------------- */
  $$('[data-rail]').forEach(function (rail) {
    var down = false, sx = 0, sl = 0, moved = 0;
    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;
      down = true; moved = 0; sx = e.clientX; sl = rail.scrollLeft;
      rail.classList.add('drag');
    });
    addEventListener('pointermove', function (e) {
      if (!down) return;
      var d = e.clientX - sx; moved = Math.abs(d); rail.scrollLeft = sl - d;
    });
    addEventListener('pointerup', function () { if (down) { down = false; rail.classList.remove('drag'); } });
    rail.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);

    function step(dir) {
      var f = rail.firstElementChild; if (!f) return;
      var gap = parseFloat(getComputedStyle(rail).columnGap || getComputedStyle(rail).gap) || 16;
      rail.scrollBy({ left: dir * (f.getBoundingClientRect().width + gap), behavior: reduced ? 'auto' : 'smooth' });
    }
    var prev = $('[data-rail-prev="' + rail.id + '"]');
    var next = $('[data-rail-next="' + rail.id + '"]');
    if (prev) quietClick(prev, function () { step(-1); });
    if (next) quietClick(next, function () { step(1); });
    function arrows() {
      var max = rail.scrollWidth - rail.clientWidth - 2;
      if (prev) prev.disabled = rail.scrollLeft <= 2;
      if (next) next.disabled = rail.scrollLeft >= max;
      var w = prev && prev.parentNode; if (w) w.hidden = max <= 4;
    }
    rail.addEventListener('scroll', arrows, { passive: true });
    addEventListener('resize', arrows, { passive: true });
    setTimeout(arrows, 300); setTimeout(arrows, 1200);
  });

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

  /* ---------------- chip groups on the form ---------------- */
  function chipGroup(hostSel, hiddenSel, opts) {
    var host = $(hostSel), hidden = $(hiddenSel);
    if (!host || !hidden) return;
    opts.forEach(function (o) {
      var b = el('button', { type: 'button', class: 'chip-b' }, esc(o));
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
  }
  chipGroup('#occChips', '#enqOccasion', OCCASIONS.concat(['Something else']));
  chipGroup('#lookChips', '#enqLook', LOOKS);

  /* ---------------- clipboard + share ----------------
     Instagram gives no way to pre-fill a DM from a link — no URL parameter
     exists. The share sheet is the closest thing: on a phone it carries the
     text into whichever app is picked, so nothing has to be pasted. */
  function canShare() { try { return typeof navigator.share === 'function'; } catch (e) { return false; } }
  function openDm() { try { window.open(CONTACT.dm || CONTACT.instagram, '_blank', 'noopener'); } catch (e) {} }
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
  function handOver(text, doneCb) {
    if (canShare()) {
      var p;
      try { p = navigator.share({ text: text }); } catch (e) { p = null; }
      if (p && p.then) {
        p.then(function () { doneCb('shared'); }, function (err) {
          if (err && err.name === 'AbortError') { doneCb('cancelled'); return; }
          copy(text, function (ok) { doneCb(ok ? 'copied' : 'manual'); });
        });
        return;
      }
    }
    copy(text, function (ok) { doneCb(ok ? 'copied' : 'manual'); });
  }

  var toastT;
  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('on'); }, 2800);
  }

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
      if (val('enqHp')) return;                    // honeypot

      var name = val('enqName'), reach = val('enqReach');
      if (!name)  { say('Please add your name.'); $('#enqName').focus(); return; }
      if (!reach) { say('Please add an Instagram handle, email or number for the reply.'); $('#enqReach').focus(); return; }

      var plain =
        'Name: ' + name + '\n' +
        'Contact: ' + reach + '\n' +
        'Occasion: ' + (val('enqOccasion') || 'Something else') + '\n' +
        'Look: ' + (val('enqLook') || 'Not sure yet') + '\n' +
        'Date: ' + (val('enqDate') || 'Not given') + '\n' +
        'People: ' + (val('enqPeople') || 'Not given') + '\n\n' +
        (val('enqMsg') || '(no extra notes)');

      if (!W3F_KEY) {
        /* Not wired to an inbox yet, so nothing is silently swallowed: the
           whole enquiry is handed over instead. */
        say('Opening your message…');
        handOver(plain, function (how) {
          if (how === 'shared')    { f.reset(); say('Thank you — that’s on its way.'); return; }
          if (how === 'cancelled') { say('No problem — the form is still here when you want it.'); return; }
          if (how === 'copied') {
            say('This demo form isn’t wired to an inbox yet, so your enquiry has been copied — ' +
                '<a href="' + esc(CONTACT.dm || CONTACT.instagram) + '" target="_blank" rel="noopener">' +
                'paste it into the Instagram DMs</a> and it’ll be picked up from there.', true);
            openDm();
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
          subject: 'Makeup by Sadia enquiry — ' + (val('enqOccasion') || 'Something else'),
          from_name: 'Makeup by Sadia website',
          name: name, email: CONTACT.email || undefined,
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

  /* ---------------- socials + every Instagram link ---------------- */
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
    [['#dmBubble', CONTACT.dm], ['#enqIg', CONTACT.dm], ['#drawerIg', CONTACT.instagram],
     ['#looksIg', CONTACT.instagram]].forEach(function (p) {
      var n = $(p[0]); if (n) n.href = p[1] || CONTACT.instagram;
    });
  }());

}());
