/* ============================================================
   Krem&Choc — templates/kremchoc.js
   No build step, no framework.

   EVERYTHING SHE MIGHT WANT CHANGED IS IN THIS BLOCK.
   ============================================================ */
(function () {
  'use strict';

  /* ---- her details, from kremchoc.co.uk and her Instagram ----------- */
  var CONTACT = {
    name:      'Krem&Choc',
    founder:   'Zahra',
    email:     'kremchoc@gmail.com',
    handle:    'krem_choc',
    instagram: 'https://www.instagram.com/krem_choc',
    area:      'Leicester',
    /* Paste these when the Google Business profile is linked and the review
       box below stops being an example. */
    googleReviews: '',
    googleWrite:   '',
    googleRating:  '',            // e.g. '5.0'
    googleCount:   ''             // e.g. '27'
  };

  /* Web3Forms access key. Empty = the form still works: it hands the whole
     enquiry back as copyable text with her email address ready to paste. */
  var W3F_KEY = '';

  /* ---- her flavours, off her own site ------------------------------- */
  var FLAVOURS = [
    { n: 'Vanilla bean',        d: 'Classic' },
    { n: 'Rich chocolate',      d: 'Classic' },
    { n: 'Lemon &amp; blueberry',   d: 'Adventurous' },
    { n: 'Coffee',              d: 'Adventurous' },
    { n: 'Salted caramel',      d: 'In-house signature' },
    { n: 'Red velvet',          d: 'Soft &amp; luxurious' }
  ];

  var OCCASIONS = ['Wedding', 'Birthday', 'Engagement', 'Corporate', 'Anniversary', 'Something else'];

  /* ---- her booking process, her own words --------------------------- */
  var STEPS = [
    { n: 'i', h: 'You submit an enquiry',
      p: 'Once you submit your enquiry, please allow 48 hours for a response. My go-to method of communication is email, so please keep an eye on your inbox — the spam folder too. If your enquiry was detailed enough, I will include your bespoke quote. If you have limited information about the cake you require, that is not a problem at all; I will be in touch to discuss things further with you.' },
    { n: 'ii', h: 'We agree the details, and a deposit secures the date',
      p: 'Once we are happy with all the information, the next step is to book you in. A 50% deposit is required to secure your booking and payment details will be sent over to you. Please note: no booking is secured without a deposit. If it is not processed within 48 hours of the details being sent, there is a chance your date has been taken, and the enquiry process would begin again.' },
    { n: 'iii', h: 'You are in the diary',
      p: 'You have processed your deposit and received a confirmation of booking from me. You are now in my diary and can rest assured your bespoke cake order is being prepared for.' }
  ];

  /* ---- her portfolio. Every photograph on this page is hers: these six
     are from her Instagram grid, cropped clear of the app's own pins and
     play buttons, and in two cases cropped in to the cake so her clients'
     faces are not on the page. ---------------------------------------- */
  var GALLERY = [
    { src: 'g1.jpg', cap: 'Pearl and blush, tiered' },
    { src: 'g2.jpg', cap: 'Gold leaf, four tiers' },
    { src: 'g3.jpg', cap: 'Pastel arch, butterflies' },
    { src: 'g4.jpg', cap: 'Ivory and roses' },
    { src: 'g5.jpg', cap: 'White and raspberry' },
    { src: 'g6.jpg', cap: 'Spring florals, sculpted' }
  ];

  /* Placeholder reviews, labelled as examples on the page. */
  var REVIEWS = [
    { n: 'Aaliyah R.', t: 'Our wedding cake was the first thing every single guest mentioned. Zahra understood the brief from one conversation and somehow made something better than we had pictured.' },
    { n: 'Daniel W.',  t: 'Commissioned a cake for a company launch. Immaculate finish, delivered exactly on time, and it photographed beautifully — which mattered more than I expected.' },
    { n: 'Sana M.',    t: 'The gold leaf work is unreal in person. Tasted as good as it looked too — the salted caramel is dangerous.' },
    { n: 'Priya K.',   t: 'She kept me calm through the whole process, answered everything within a day, and the cake arrived set up perfectly at the venue.' },
    { n: 'Hannah L.',  t: 'Worth every penny. It was genuinely the centrepiece of the room and people were still talking about it weeks later.' },
    { n: 'Yusuf A.',   t: 'Professional from the first email to the final delivery. The attention to detail is on another level.' }
  ];

  var FAQ = [
    { q: 'How far in advance should I book?',
      a: 'As early as you can. Only a limited number of commissions are taken each season, and wedding dates in particular are held on a first-deposit basis — so a date is never reserved until the deposit has been processed.' },
    { q: 'How much does a bespoke cake cost?',
      a: 'Every cake is quoted individually, because size, tiers, finish and detail all change the figure. Include as much as you can in your enquiry — the date, rough guest numbers, and any styling you have in mind — and a bespoke quote will come back with the reply.' },
    { q: 'Is a deposit required?',
      a: 'Yes. A 50% deposit secures your date, and the balance is settled before the event. No booking is confirmed without it.' },
    { q: 'Can you match my colours and styling?',
      a: 'That is the whole point of bespoke. Send through your palette, your florist’s work, your invitations, anything you have seen and loved, and the design will be built around them.' },
    { q: 'Do you deliver and set up?',
      a: 'Yes — tiered and installed cakes are delivered and set up at the venue, so they arrive exactly as designed. Delivery is quoted with the cake.' },
    { q: 'What flavours can I choose?',
      a: 'Vanilla bean, rich chocolate, lemon and blueberry, coffee, the in-house signature caramel and red velvet are the mainstays. Anything else, just ask — it can almost always be made.' },
    { q: 'Can you work around allergies or dietary needs?',
      a: 'Raise it in your enquiry and it will be discussed properly before anything is agreed, so there is no doubt on the day.' },
    { q: 'How do I get in touch?',
      a: 'Use the enquiry form on this page, or email kremchoc@gmail.com directly. Email is the go-to method, and a reply usually comes within 48 hours.' }
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
     and not from when this script arrived — either stretches the intro by
     however long the network took. */
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

  /* ---------------- smooth scroll ---------------- */
  var lenis = null;
  if (!reduced && (!window.matchMedia || matchMedia('(pointer: fine)').matches)
      && typeof window.Lenis === 'function') {
    lenis = new window.Lenis({
      duration: 1.2,
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
      if (lenis) { lenis.scrollTo(id === '#top' ? 0 : target, { offset: -90 }); return; }
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

    $$('.welcome-art img, .phil-art img, .strip-bg img, .quote-bg img, .gal img').forEach(function (img) {
      if (img.complete && img.naturalWidth) return;
      img.style.opacity = '0';
      img.style.transition = 'opacity .8s var(--ease)';
      var show = function () { img.style.opacity = '1'; };
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
    var words = ['Wedding cakes', 'Celebration cakes', 'Corporate', 'Hand-crafted',
                 'Leicester', 'Bespoke', 'By commission'];
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

    var x = 0, last = 0, SPEED = 30, seen = true;
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

  /* ---------------- flavours ---------------- */
  (function flavours() {
    var ul = $('#flavList'); if (!ul) return;
    ul.innerHTML = FLAVOURS.map(function (f) {
      return '<li><b>' + f.n + '</b><span>' + f.d + '</span></li>';
    }).join('');
    if (window.ScrollFXKit) window.ScrollFXKit.refresh(ul.parentNode);
  }());

  /* ---------------- her booking process ---------------- */
  (function steps() {
    var ol = $('#stepList'); if (!ol) return;
    ol.innerHTML = STEPS.map(function (s) {
      return '<li><span class="step-n" aria-hidden="true">' + s.n + '</span>' +
             '<div><h3>' + esc(s.h) + '</h3><p>' + esc(s.p) + '</p></div></li>';
    }).join('');
    if (window.ScrollFXKit) window.ScrollFXKit.refresh(ol.parentNode);
  }());

  /* ---------------- portfolio ---------------- */
  (function gallery() {
    var ul = $('#galGrid'); if (!ul) return;
    ul.innerHTML = GALLERY.map(function (g, i) {
      return '<li data-lb="' + i + '"><img src="../assets/kremchoc/photos/' + g.src +
             '" alt="' + esc(g.cap) + '" width="760" height="950" loading="lazy"></li>';
    }).join('');
    if (window.ScrollFXKit) window.ScrollFXKit.refresh(ul.parentNode);
  }());

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
      img.src = '../assets/kremchoc/photos/' + GALLERY[at].src;
      img.alt = GALLERY[at].cap;
      cap.textContent = GALLERY[at].cap;
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
      else { w.href = 'mailto:' + CONTACT.email; w.textContent = 'Email instead'; }
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

  /* ---------------- chip groups ---------------- */
  function chipGroup(hostSel, hiddenSel, opts) {
    var host = $(hostSel), hidden = $(hiddenSel);
    if (!host || !hidden) return;
    opts.forEach(function (o) {
      var b = el('button', { type: 'button', class: 'chip-b' }, o);
      var plain = b.textContent;
      b.setAttribute('aria-pressed', plain === hidden.value ? 'true' : 'false');
      if (plain === hidden.value) b.classList.add('on');
      quietClick(b, function () {
        hidden.value = b.textContent;
        [].forEach.call(host.children, function (c) {
          var on = c === b;
          c.classList.toggle('on', on);
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      });
      host.appendChild(b);
    });
  }
  chipGroup('#occChips', '#enqOccasion', OCCASIONS);
  chipGroup('#flavChips', '#enqFlavour',
    FLAVOURS.map(function (f) { return f.n; }).concat(['Not sure yet']));

  /* ---------------- clipboard + share ---------------- */
  function canShare() { try { return typeof navigator.share === 'function'; } catch (e) { return false; } }
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
      if (val('enqHp')) return;                       // honeypot

      var name = val('enqName'), email = val('enqEmail');
      if (!name)  { say('Please add your name.'); $('#enqName').focus(); return; }
      if (!email || email.indexOf('@') < 0) {
        say('Please add an email address — it is how the reply and your quote will come back.');
        $('#enqEmail').focus(); return;
      }

      var plain =
        'Name: ' + name + '\n' +
        'Email: ' + email + '\n' +
        'Occasion: ' + (val('enqOccasion') || 'Something else') + '\n' +
        'Date: ' + (val('enqDate') || 'Not given') + '\n' +
        'Servings: ' + (val('enqServes') || 'Not given') + '\n' +
        'Flavour: ' + (val('enqFlavour') || 'Not sure yet') + '\n' +
        'Budget: ' + (val('enqBudget') || 'Not given') + '\n\n' +
        (val('enqMsg') || '(no further details)');

      if (!W3F_KEY) {
        /* Not wired to an inbox yet, so nothing is silently swallowed: the
           whole enquiry is handed over instead. */
        say('Preparing your enquiry…');
        handOver(plain, function (how) {
          if (how === 'shared')    { f.reset(); say('Thank you — that is on its way.'); return; }
          if (how === 'cancelled') { say('No problem — the form is still here when you want it.'); return; }
          var mail = 'mailto:' + CONTACT.email +
            '?subject=' + encodeURIComponent('Cake enquiry — ' + (val('enqOccasion') || 'Something else')) +
            '&body=' + encodeURIComponent(plain);
          if (how === 'copied') {
            say('This demo form isn’t wired to an inbox yet, so your enquiry has been copied — ' +
                '<a href="' + esc(mail) + '">open it in an email to ' + esc(CONTACT.email) + '</a> and it will arrive exactly as written.', true);
            return;
          }
          say('Send this to <a href="' + esc(mail) + '">' + esc(CONTACT.email) + '</a>:<br><br>' +
              esc(plain).replace(/\n/g, '<br>'), true);
        });
        return;
      }

      btn.disabled = true; btn.textContent = 'Sending…';
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: W3F_KEY,
          subject: 'Cake enquiry — ' + (val('enqOccasion') || 'Something else'),
          from_name: 'Krem&Choc website',
          name: name, email: email,
          message: plain
        })
      }).then(function (r) { return r.json(); }).then(function (d) {
        btn.disabled = false; btn.textContent = 'Submit enquiry';
        if (d && d.success) { f.reset(); say('Sent — please allow 48 hours for a reply. Thank you!'); }
        else say('That didn’t send. Please try again, or email ' + CONTACT.email + ' directly.');
      }).catch(function () {
        btn.disabled = false; btn.textContent = 'Submit enquiry';
        say('That didn’t send. Please try again, or email ' + CONTACT.email + ' directly.');
      });
    });
  }());

  /* ---------------- socials + links ---------------- */
  (function links() {
    var ICONS = {
      instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/>',
      mail:      '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'
    };
    var host = $('#socials');
    if (host) {
      [['instagram', CONTACT.instagram, 'Instagram'],
       ['mail', 'mailto:' + CONTACT.email, 'Email']].forEach(function (s) {
        if (!s[1]) return;
        var a = el('a', { href: s[1], 'aria-label': s[2] },
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
          'stroke-linecap="round" aria-hidden="true">' + ICONS[s[0]] + '</svg>');
        if (s[0] === 'instagram') { a.target = '_blank'; a.rel = 'noopener'; }
        host.appendChild(a);
      });
    }
    ['#enqIg', '#galIg', '#drawerIg'].forEach(function (sel) {
      var n = $(sel); if (n) n.href = CONTACT.instagram;
    });
    var m = $('#enqMail'); if (m) m.href = 'mailto:' + CONTACT.email;
  }());

}());
