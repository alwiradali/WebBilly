/* ============================================================
   ROSES BY RACHEL
   FILL IN WHEN RACHEL HAS THEM
                  land in their inbox
     RR_GA4     — "G-XXXXXXX" from Google Analytics
     RR_PIXEL   — the long number from Meta Events Manager
     RR_PAYLINK — the Stripe payment link
   Leave any of them empty and the site still works, it just
   doesn't send / track / take payment.
   ============================================================ */
(function () {
  'use strict';
  var RR_EMAIL   = 'info@rosesbyrachel.co.uk';
  var RR_GA4     = '';
  var RR_PIXEL   = '';
  var RR_PAYLINK = '';

  var $  = function (id) { return document.getElementById(id); };
  var money = function (p) { return '£' + (p % 1 ? p.toFixed(2) : p); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* One script serves nine pages, so nothing may assume an element is here.
     `on` binds only when the element exists; every block that belongs to a
     single page checks for its own anchor first. */
  function on(id, ev, fn) { var el = $(id); if (el) el.addEventListener(ev, fn); }

  if ($('yr')) $('yr').textContent = new Date().getFullYear();

  /* ---------------- petals + gold bokeh ---------------- */
  (function petals() {
    var c = $('petals'); if (!c) return;
    var x = c.getContext('2d'), W, H, bits = [], raf, last = 0;
    var PINKS = ['#F6C9C2', '#F2B9B4', '#F8D8D0', '#EFA9A6', '#FBE3DC'];
    function size() {
      W = c.width = innerWidth; H = c.height = innerHeight;
      var n = Math.round(Math.min(64, W / 26));
      bits = [];
      for (var i = 0; i < n; i++) bits.push(make(true));
      for (var j = 0; j < Math.round(n * 0.55); j++) bits.push(spark());
    }
    function make(any) {
      var s = 9 + Math.random() * 26;
      return { t: 'p', x: Math.random() * W, y: any ? Math.random() * H : -40,
        s: s, sp: 0.22 + Math.random() * 0.55, dr: (Math.random() - 0.5) * 0.5,
        a: Math.random() * Math.PI * 2, va: (Math.random() - 0.5) * 0.016,
        o: 0.30 + Math.random() * 0.55, blur: Math.random() < 0.35 ? 2.5 + Math.random() * 3 : 0,
        col: PINKS[(Math.random() * PINKS.length) | 0] };
    }
    function spark() {
      return { t: 's', x: Math.random() * W, y: Math.random() * H,
        r: 0.8 + Math.random() * 2.4, sp: 0.05 + Math.random() * 0.18,
        ph: Math.random() * Math.PI * 2, vp: 0.012 + Math.random() * 0.03 };
    }
    function petal(b) {
      x.save(); x.translate(b.x, b.y); x.rotate(b.a);
      x.globalAlpha = b.o; x.fillStyle = b.col;
      if (b.blur) x.filter = 'blur(' + b.blur + 'px)';
      x.beginPath();
      x.moveTo(0, -b.s * 0.5);
      x.bezierCurveTo(b.s * 0.62, -b.s * 0.34, b.s * 0.5, b.s * 0.42, 0, b.s * 0.52);
      x.bezierCurveTo(-b.s * 0.5, b.s * 0.42, -b.s * 0.62, -b.s * 0.34, 0, -b.s * 0.5);
      x.fill(); x.restore();
    }
    function draw(ts) {
      raf = requestAnimationFrame(draw);
      if (ts - last < 33) return; last = ts;              /* 30fps is plenty */
      x.clearRect(0, 0, W, H);
      for (var i = 0; i < bits.length; i++) {
        var b = bits[i];
        if (b.t === 'p') {
          b.y += b.sp; b.x += b.dr + Math.sin(b.y / 90) * 0.35; b.a += b.va;
          if (b.y > H + 50) { bits[i] = make(false); continue; }
          petal(b);
        } else {
          b.y -= b.sp; b.ph += b.vp;
          if (b.y < -8) { b.y = H + 8; b.x = Math.random() * W; }
          var tw = 0.28 + Math.abs(Math.sin(b.ph)) * 0.62;
          x.save(); x.globalAlpha = tw; x.fillStyle = '#D8B45C'; x.filter = 'blur(.6px)';
          x.beginPath(); x.arc(b.x, b.y, b.r, 0, 7); x.fill(); x.restore();
        }
      }
    }
    size(); addEventListener('resize', size, { passive: true });
    if (reduce) {
      x.clearRect(0, 0, W, H);
      bits.forEach(function (b) { if (b.t === 'p') petal(b); });
    } else {
      raf = requestAnimationFrame(draw);
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) cancelAnimationFrame(raf);
        else raf = requestAnimationFrame(draw);
      });
    }
  })();

  /* ---------------- nav ---------------- */
  var nav = $('nav');
  addEventListener('scroll', function () { nav.classList.toggle('stuck', scrollY > 30); }, { passive: true });
  var drawer = $('drawer');
  $('burger').addEventListener('click', function () { drawer.classList.add('on'); });
  $('drawerx').addEventListener('click', function () { drawer.classList.remove('on'); });
  drawer.addEventListener('click', function (e) {
    if (e.target === drawer || e.target.tagName === 'A') drawer.classList.remove('on');
  });

  function toast(t) {
    var el = $('toast'); el.textContent = t; el.classList.add('on');
    clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('on'); }, 2600);
  }

  /* ---------------- consent, then analytics ---------------- */
  function loadAnalytics() {
    if (RR_GA4) {
      var g = document.createElement('script'); g.async = true;
      g.src = 'https://www.googletagmanager.com/gtag/js?id=' + RR_GA4;
      document.head.appendChild(g);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { dataLayer.push(arguments); };
      gtag('js', new Date()); gtag('config', RR_GA4);
    }
    if (RR_PIXEL) {
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v;
        s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', RR_PIXEL); fbq('track', 'PageView');
    }
  }
  function track(n, d) { if (window.gtag) gtag('event', n, d || {}); if (window.fbq) fbq('trackCustom', n, d || {}); }
  var bar = $('cbar'), choice = null;
  try { choice = localStorage.getItem('rr-consent'); } catch (e) {}
  if (choice === 'yes') loadAnalytics();
  else if (choice !== 'no') setTimeout(function () { bar.classList.add('on'); }, 1500);
  function decide(v) {
    try { localStorage.setItem('rr-consent', v); } catch (e) {}
    bar.classList.remove('on'); if (v === 'yes') loadAnalytics();
  }
  $('cok').addEventListener('click', function () { decide('yes'); });
  $('cno').addEventListener('click', function () { decide('no'); });

  /* ---------------- the collection ---------------- */
  var PRODUCTS = [
    { n: "Blush Garden",    p: 45, img: 'p-blush-garden',   cat: ['roses','bouquets'],
      alt: 'Blush pink garden roses with eucalyptus in a glass vase',
      d: 'Soft blush garden roses with seeded eucalyptus, hand-arranged and delivered fresh.' },
    { n: "Velvet Romance",  p: 62, img: 'p-velvet-romance', cat: ['roses','bouquets'], big: 'pdp-velvet',
      alt: 'Deep red roses with burgundy astilbe in a glass vase',
      d: 'Deep burgundy garden roses with blush accents, hand-arranged and delivered fresh.' },
    { n: "Airy Bridal",     p: 58, img: 'p-airy-bridal',    cat: ['wedding','bouquets'],
      alt: 'White roses and blossom tied with ivory ribbon',
      d: 'Ivory roses and spring blossom, tied loose and light for a bride who wants air in her flowers.' },
    { n: "Ivory Dream",     p: 52, img: 'p-ivory-dream',    cat: ['wedding','roses'],
      alt: 'Cream roses with eucalyptus in a clear vase',
      d: 'Cream roses banked with eucalyptus. Quiet, timeless and right for almost any occasion.' },
    { n: "Peony Rose",      p: 68, img: 'p-peony-rose',     cat: ['bouquets','gifts'],
      alt: 'Pink peonies and garden roses in a glass vase',
      d: 'Full-headed pink peonies with garden roses. In season only, and worth the wait.' },
    { n: "Rachel's Choice", p: 74, img: 'p-rachels-choice', cat: ['gifts','bouquets'],
      alt: 'Blush and burgundy roses arranged by the florist',
      d: 'The best of whatever came in that morning, arranged the way I would want it myself.' },
    { n: "Blush & Chamomile", p: 49, img: 'own-blush', cat: ['roses','bouquets'],
      alt: 'Pink roses with chamomile daisies in a blush and cream wrap',
      d: 'Pink roses set against chamomile daisies, wrapped in blush and cream and stood in a gift bag so it can be carried and handed over without a vase.' },
    { n: "Classic Cream",    p: 55, img: 'own-classic', cat: ['roses','gifts'],
      alt: 'Pink and ivory roses banked with gypsophila in an ivory wrap',
      d: 'Pink and ivory roses banked in gypsophila, finished in ivory and tied with a lace bow. The one people order when they are not sure and want to be certain.' },
    { n: "Twelve Ivory Roses", p: 58, img: 'own-ivory', cat: ['roses','wedding'],
      alt: 'Twelve long-stem ivory roses laid on fresh salal',
      d: 'Twelve long-stem ivory roses laid on fresh salal and boxed flat. Quiet and formal, and right when a dozen red would say too much.' },
    { n: "Sorbet",          p: 47, img: 'own-sorbet', cat: ['bouquets','gifts'],
      alt: 'Peach and mango roses with gypsophila and solidago in a gift bag',
      d: 'Peach and mango roses with gypsophila and solidago. It goes with almost any room, which is why it travels well as a thank you.' },
    { n: "The Statement",   p: 95, img: 'own-statement', cat: ['gifts','bouquets'],
      alt: 'Deep pink hydrangea heads with gypsophila in a grey and blush wrap',
      d: 'Three deep pink hydrangea heads with gypsophila behind them. Large, and meant to be: this is the one that gets photographed.' },
    { n: "Sunshine",        p: 42, img: 'own-sunshine', cat: ['gifts','bouquets'],
      alt: 'Sunflowers, alstroemeria and yellow chrysanthemum in a box',
      d: 'Sunflowers, white alstroemeria and yellow chrysanthemum, boxed so it stands up on a table the moment it arrives. Hard to be miserable near.' }
  ];
  var SHARE_ICON = '<svg viewBox="0 0 24 24"><path d="M18 16.1c-.8 0-1.5.3-2 .8l-7.1-4.2c.1-.2.1-.5.1-.7s0-.5-.1-.7L16 7.1c.5.5 1.2.8 2 .8 1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3c0 .2 0 .5.1.7L8 9.8c-.5-.5-1.2-.8-2-.8-1.7 0-3 1.3-3 3s1.3 3 3 3c.8 0 1.5-.3 2-.8l7.1 4.2c-.1.2-.1.4-.1.6 0 1.6 1.3 2.9 2.9 2.9s2.9-1.3 2.9-2.9-1.2-2.9-2.8-2.9z"/></svg>';
  var cardsEl = $('cards');
  function renderCards(cat) {
    if (!cardsEl) return;
    cardsEl.innerHTML = '';
    var only = +(cardsEl.getAttribute('data-max') || 0), shown = 0;
    PRODUCTS.forEach(function (pr) {
      if (cat !== 'all' && pr.cat.indexOf(cat) === -1) return;
      if (only && ++shown > only) return;
      var a = document.createElement('article');
      a.className = 'card';
      a.innerHTML =
        '<div class="ph" data-open="' + pr.n + '" role="button" tabindex="0" aria-label="View ' + pr.n + '">' +
        '<img src="../../assets/rachel/' + pr.img + '-sm.webp" alt="' + pr.alt + '" loading="lazy" width="451" height="563"></div>' +
        '<div class="bd"><h3 data-open="' + pr.n + '" style="cursor:pointer">' + pr.n + '</h3><p class="pr">' + money(pr.p) + '</p>' +
        '<button class="add" type="button" data-add="' + pr.n + '">Add to Cart</button>' +
        '<div class="shr"><small>Share</small>' +
        '<button class="shbtn" type="button" data-share="' + pr.n + '" aria-label="Share ' + pr.n + '">' + SHARE_ICON + '</button>' +
        '</div></div>';
      cardsEl.appendChild(a);
    });
  }
  if (cardsEl) {
    renderCards(cardsEl.getAttribute('data-only') || 'all');
    [].forEach.call(document.querySelectorAll('.filters button'), function (b) {
      b.addEventListener('click', function () {
        [].forEach.call(document.querySelectorAll('.filters button'), function (o) {
          o.setAttribute('aria-pressed', String(o === b));
        });
        renderCards(b.getAttribute('data-cat'));
        track('filter_collection', { category: b.getAttribute('data-cat') });
      });
    });
  }

  /* ---------------- share ---------------- */
  var sheet = $('sharesheet'), shWhat = '';
  function shareUrl() {
    return location.origin + location.pathname + '?f=' +
      encodeURIComponent(shWhat.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  }
  function openShare(what) {
    shWhat = what; $('shtitle').textContent = what;
    var url = shareUrl(), msg = what + ' from Roses by Rachel, Manchester florist. ' + url;
    $('sh-wa').href   = 'https://wa.me/?text=' + encodeURIComponent(msg);
    $('sh-fb').href   = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);
    $('sh-x').href    = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(what + ' from Roses by Rachel') + '&url=' + encodeURIComponent(url);
    $('sh-mail').href = 'mailto:?subject=' + encodeURIComponent(what + ' from Roses by Rachel') + '&body=' + encodeURIComponent(msg);
    $('sh-sms').href  = 'sms:?&body=' + encodeURIComponent(msg);
    $('sh-native').style.display = navigator.share ? '' : 'none';
    sheet.classList.add('on'); track('share_open', { item: what });
  }
  function closeShare() { sheet.classList.remove('on'); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-share]');
    if (b) { e.preventDefault(); openShare(b.getAttribute('data-share').replace(/&amp;/g, '&')); }
  });
  $('shx').addEventListener('click', closeShare);
  sheet.addEventListener('click', function (e) { if (e.target === sheet) closeShare(); });
  addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeShare(); drawer.classList.remove('on'); }
  });
  function copyText(t, after) {
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast(after); });
    else { var a = document.createElement('textarea'); a.value = t; document.body.appendChild(a);
           a.select(); document.execCommand('copy'); a.remove(); toast(after); }
  }
  $('sh-copy').addEventListener('click', function () { copyText(shareUrl(), 'Link copied'); closeShare(); });
  $('sh-ig').addEventListener('click', function () {
    /* Instagram has no web share target, so the link goes to the clipboard */
    copyText(shareUrl(), 'Link copied. Paste it into your Instagram story or DM'); closeShare();
  });
  $('sh-native').addEventListener('click', function () {
    if (navigator.share) navigator.share({ title: 'Roses by Rachel', text: shWhat, url: shareUrl() }).catch(function () {});
    closeShare();
  });

  /* ---------------- build your own ---------------- */
  var ROSE = '<path d="M25 5c8 0 14 6 14 13s-6 15-14 21C17 33 11 25 11 18S17 5 25 5z" fill="{a}"/><path d="M25 11c4 0 7 3 7 7s-3 8-7 11c-4-3-7-7-7-11s3-7 7-7z" fill="{b}"/><circle cx="25" cy="18" r="3" fill="{c}"/>';
  var DAISY = '<g fill="{a}"><ellipse cx="25" cy="8" rx="4" ry="8"/><ellipse cx="25" cy="32" rx="4" ry="8"/><ellipse cx="13" cy="20" rx="8" ry="4"/><ellipse cx="37" cy="20" rx="8" ry="4"/><ellipse cx="16" cy="11" rx="7" ry="3.4" transform="rotate(-45 16 11)"/><ellipse cx="34" cy="29" rx="7" ry="3.4" transform="rotate(-45 34 29)"/><ellipse cx="34" cy="11" rx="7" ry="3.4" transform="rotate(45 34 11)"/><ellipse cx="16" cy="29" rx="7" ry="3.4" transform="rotate(45 16 29)"/></g><circle cx="25" cy="20" r="6" fill="{c}"/>';
  var TULIP = '<path d="M13 13c0-3 3-6 12-6s12 3 12 6c0 10-5 20-12 20S13 23 13 13z" fill="{a}"/><path d="M19 8c0 9 2 16 6 22 4-6 6-13 6-22-2 4-4 6-6 6s-4-2-6-6z" fill="{b}"/>';
  var CLUSTER = '<g fill="{a}"><circle cx="17" cy="13" r="7"/><circle cx="33" cy="13" r="7"/><circle cx="25" cy="23" r="8"/><circle cx="13" cy="26" r="6"/><circle cx="37" cy="26" r="6"/><circle cx="25" cy="9" r="6"/></g><g fill="{c}"><circle cx="17" cy="13" r="2.2"/><circle cx="33" cy="13" r="2.2"/><circle cx="25" cy="23" r="2.4"/></g>';
  var SUNNY = '<g fill="{a}">' + (function () { var o = '';
    for (var i = 0; i < 12; i++) o += '<ellipse cx="25" cy="6" rx="3.3" ry="7.6" transform="rotate(' + i * 30 + ' 25 20)"/>';
    return o; })() + '</g><circle cx="25" cy="20" r="7.6" fill="{c}"/>';
  var LEAF = '<path d="M25 4c10 6 14 13 14 20 0 8-6 13-14 13S11 32 11 24c0-7 4-14 14-20z" fill="{a}" opacity=".88"/><path d="M25 6v30" stroke="{c}" stroke-width="1.5" fill="none"/><path d="M25 13l7 4M25 20l8 4M25 27l7 4M25 13l-7 4M25 20l-8 4M25 27l-7 4" stroke="{c}" stroke-width="1.1" fill="none" opacity=".7"/>';

  var STEMS = [
    { n: 'Roses',             u: 'stem',  p: 3.50, s: ROSE,    a: '#E0899F', b: '#CE6B85', c: '#A94766' },
    { n: 'Peonies',           u: 'stem',  p: 6.00, s: ROSE,    a: '#F3C3CD', b: '#E8A7B7', c: '#D77B93' },
    { n: 'Ranunculus',        u: 'stem',  p: 4.20, s: ROSE,    a: '#F2C9A8', b: '#E5AB7F', c: '#C98A5C' },
    { n: 'Lisianthus',        u: 'stem',  p: 3.20, s: ROSE,    a: '#F7F0E4', b: '#EADFC7', c: '#C0982A' },
    { n: 'Hydrangea',         u: 'head',  p: 7.50, s: CLUSTER, a: '#E3B4CC', b: '#D194B3', c: '#B06F95' },
    { n: 'Gypsophila',        u: 'bunch', p: 5.00, s: CLUSTER, a: '#FCF8F2', b: '#F0E8D8', c: '#DCCDAF' },
    { n: 'Tulips',            u: 'stem',  p: 2.60, s: TULIP,   a: '#EAA0B4', b: '#D97D97', c: '#B95A76' },
    { n: 'Sunflowers',        u: 'stem',  p: 3.60, s: SUNNY,   a: '#EEC457', b: '#DCAE3C', c: '#8A6A3C' },
    { n: 'Chamomile daisies', u: 'bunch', p: 3.00, s: DAISY,   a: '#FDFAF3', b: '#F0E8D8', c: '#EEC457' },
    { n: 'Alstroemeria',      u: 'stem',  p: 2.80, s: DAISY,   a: '#F6C9B0', b: '#EAB094', c: '#D98D68' },
    { n: 'Dahlias',           u: 'stem',  p: 4.60, s: SUNNY,   a: '#C96B8B', b: '#B4577A', c: '#8E3B5C' },
    { n: 'Eucalyptus',        u: 'sprig', p: 2.40, s: LEAF,    a: '#9FB193', b: '#8AA07D', c: '#6D8262' }
  ];
  var picked = {};
  var stemsEl = $('stems');
  if (stemsEl) STEMS.forEach(function (f, i) {
    var d = document.createElement('div');
    d.className = 'stem'; d.setAttribute('data-i', i);
    d.innerHTML = '<b>' + f.n + '</b><em>' + money(f.p) + ' per ' + f.u + '</em>' +
      '<div class="qty"><button type="button" data-d="-1" aria-label="One fewer ' + f.n + '">&minus;</button>' +
      '<i data-q>0</i><button type="button" data-d="1" aria-label="One more ' + f.n + '">+</button></div>';
    stemsEl.appendChild(d);
  });
  if (stemsEl) stemsEl.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-d]'), card = e.target.closest('.stem');
    if (!card) return;
    var i = +card.getAttribute('data-i'), step = btn ? +btn.getAttribute('data-d') : 1;
    picked[i] = Math.max(0, Math.min(40, (picked[i] || 0) + step));
    card.querySelector('[data-q]').textContent = picked[i];
    card.classList.toggle('picked', picked[i] > 0);
    redraw();
  });
  function finish() {
    var r = document.querySelector('input[name="bfin"]:checked');
    return r ? { label: r.value, add: +r.getAttribute('data-add') } : { label: 'Hand-tied', add: 0 };
  }
  function redraw() {
    if (!$('blines')) return 0;
    var html = '', total = 0, any = false;
    STEMS.forEach(function (f, i) {
      var q = picked[i] || 0; if (!q) return;
      any = true; var line = q * f.p; total += line;
      html += '<div><span>' + f.n + ' <b>&times;' + q + '</b></span><b>' + money(+line.toFixed(2)) + '</b></div>';
    });
    var fin = finish();
    if (any && fin.add) { total += fin.add; html += '<div><span>' + fin.label + '</span><b>' + money(fin.add) + '</b></div>'; }
    $('blines').innerHTML = any ? html : '<div class="empty">Nothing picked yet. Start with a rose.</div>';
    $('btot').textContent = money(+total.toFixed(2));
    return total;
  }
  [].forEach.call(document.querySelectorAll('input[name="bfin"]'), function (r) {
    r.addEventListener('change', redraw);
  });
  on('bsend', 'click', function () {
    var parts = [], total = 0, fin = finish();
    STEMS.forEach(function (f, i) { var q = picked[i] || 0; if (q) { parts.push(q + ' × ' + f.n); total += q * f.p; } });
    if (!parts.length) { toast('Pick a few stems first'); return; }
    total += fin.add;
    if (total < 25) { toast('Bouquets start at £25. Add a few more stems'); return; }
    track('build_bouquet', { value: +total.toFixed(2), items: parts.length });
    goOrder('My own bouquet (built above)',
      'My own bouquet: ' + parts.join(', ') + ', ' + fin.label + ' (about ' + money(+total.toFixed(2)) + ')');
  });

  /* ---------------- the order form ---------------- */
  function val(id) { return ($(id).value || '').trim(); }
  function fulfil() {
    var r = document.querySelector('input[name="fulfil"]:checked');
    return r ? r.value : 'Delivery';
  }
  /* The form is on one page now. A button pressed anywhere else carries what
     it was asked for across in the session, so the reader arrives at the form
     with it already filled in rather than having to say it twice. */
  function goOrder(label, notes) {
    try {
      sessionStorage.setItem('rr-prefill', JSON.stringify({ label: label || '', notes: notes || '' }));
    } catch (e) {}
    location.href = 'contact.html';
  }
  /* A button that says "Plan the surprise" is not the name of an option in
     the list, so the words it was pressed for decide which one it picks. */
  var ROUTE = [
    [/airport|arrival/i,             'Airport arrivals bouquet'],
    [/corporate|contract|reception/i,'Corporate or contract flowers'],
    [/subscription|monthly|six weeks|birthday list|pre-book/i, 'A flower subscription'],
    [/wedding/i,                     'A wedding, please quote the whole day'],
    [/sympathy|funeral/i,            'Sympathy flowers']
  ];
  function applyOrder(label, notes) {
    if (!$('oform')) return;
    if (label) {
      var sel = $('fStyle'), hit = false;
      [].forEach.call(sel.options, function (o) { if (o.text === label) { sel.value = o.value; hit = true; } });
      if (!hit) {
        for (var r = 0; r < ROUTE.length && !hit; r++) {
          if (!ROUTE[r][0].test(label)) continue;
          [].forEach.call(sel.options, function (o) {
            if (o.text === ROUTE[r][1]) { sel.value = o.value; hit = true; }
          });
        }
        notes = (notes ? notes + '\n' : '') + label;
      }
    }
    if (notes && $('fNotes').value.indexOf(notes) === -1) {
      $('fNotes').value = ($('fNotes').value ? $('fNotes').value + '\n' : '') + notes;
    }
    compose();
  }
  function nice(d) {
    if (!d) return '';
    var p = d.split('-'); if (p.length !== 3) return d;
    var M = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return (+p[2]) + ' ' + M[(+p[1]) - 1] + ' ' + p[0];
  }
  function compose() {
    if (!$('oform')) return '';
    var f = fulfil(), L = [];
    L.push('Hello Rachel, I would love to order.');
    L.push('');
    L.push('Bouquet: ' + $('fStyle').value);
    L.push('Presented: ' + $('fPres').value);
    if (val('fOcc')) L.push('Occasion: ' + val('fOcc'));
    L.push(f === 'Delivery'
      ? 'Delivery' + (val('fPostcode') ? ' to ' + val('fPostcode') : '')
      : 'I will collect');
    if (val('fDate')) L.push('Date: ' + nice(val('fDate')));
    if (val('fBudget')) L.push('Budget: ' + val('fBudget'));
    if (val('fColours')) L.push('Colours: ' + val('fColours'));
    if (val('fNotes')) L.push('Notes: ' + val('fNotes'));
    L.push('');
    L.push((val('fName') || 'Thank you') + (val('fEmail') ? ', ' + val('fEmail') : ''));
    var txt = L.join('\n');
    $('msgOut').textContent = txt;
    return txt;
  }
  ['fName','fEmail','fStyle','fPres','fOcc','fPostcode','fDate','fBudget','fColours','fNotes']
    .forEach(function (id) { on(id, 'input', compose); on(id, 'change', compose); });
  [].forEach.call(document.querySelectorAll('input[name="fulfil"]'), function (r) {
    r.addEventListener('change', function () {
      $('deliveryRow').classList.toggle('on', fulfil() === 'Delivery');
      compose();
    });
  });
  [].forEach.call(document.querySelectorAll('.occ'), function (row) {
    row.addEventListener('click', function () {
      var what = row.getAttribute('data-occ');
      track('enquiry_start', { item: what });
      if ($('oform')) { $('fOcc').value = what; compose(); $('order').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      else goOrder('', what);
    });
  });
  /* every [data-order] button anywhere routes into the form */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-order]');
    if (!b) return;
    var label = b.getAttribute('data-order').replace(/&amp;/g, '&');
    track('enquiry_start', { item: label });
    if (!$('oform')) { goOrder(label, ''); return; }
    applyOrder(label, '');
    $('order').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  on('copyBtn', 'click', function () {
    copyText(compose(), 'Message copied. Paste it into our DMs');
  });
  on('sendBtn', 'click', function () {
    var txt = compose();
    if (!val('fName') || !val('fEmail')) { toast('Add your name and how to reach you'); return; }
    track('order_submit');
    function done() {
      $('formBody').style.display = 'none';
      $('sentPanel').classList.add('on');
      if (RR_PAYLINK) window.open(RR_PAYLINK, '_blank', 'noopener');
    }
    /* Straight to our inbox. The page carries no key: the Worker holds
       it and does the sending. "On its way" is only ever shown once the
       server has actually accepted the order. */
    var btn = $('sendBtn'), was = btn.textContent;
    btn.disabled = true; btn.textContent = 'Sending…';
    fetch('/api/rbr/order', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: val('fName'), contact: val('fEmail'), style: val('fStyle'),
        presentation: val('fPres'), occasion: val('fOcc'),
        fulfilment: (document.querySelector('input[name=fulfil]:checked') || {}).value || '',
        postcode: val('fPostcode'), date: val('fDate'), budget: val('fBudget'),
        colours: val('fColours'), notes: val('fNotes'), botcheck: val('botcheck')
      })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        btn.disabled = false; btn.textContent = was;
        if (!res.ok || !res.j.ok) throw new Error(res.j.error || 'not sent');
        done();
      })
      .catch(function () {
        btn.disabled = false; btn.textContent = was;
        /* Never claim it went. Hand them the message so the sale is not lost. */
        copyText(txt, 'Could not send. Message copied, paste it to us on WhatsApp');
      });
  });
  if ($('oform')) {
    var pre = null;
    try { pre = JSON.parse(sessionStorage.getItem('rr-prefill') || 'null'); } catch (e) {}
    if (pre) {
      try { sessionStorage.removeItem('rr-prefill'); } catch (e) {}
      applyOrder(pre.label, pre.notes);
    }
  }
  compose();

  /* ---------------- newsletter ---------------- */
  on('newsform', 'submit', function (e) {
    e.preventDefault();
    var mail = val('newsmail'); if (!mail) return;
    track('newsletter_signup');
    var say = function (t) { $('newsmsg').textContent = t; };
    say('One moment…');
    fetch('/api/rbr/subscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: mail })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.j.ok) throw new Error('no');
        $('newsform').style.display = 'none';
        say('You’re on the list. Thank you');
      })
      .catch(function () { say('That didn’t send. Message us on Instagram and we’ll add you.'); });
  });

  /* ---------------- product page + cart ---------------- */
  var CART_KEY = 'rr-cart';
  var cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]') || []; } catch (e) { cart = []; }
  function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} }
  function findProduct(name) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].n === name) return PRODUCTS[i];
    return null;
  }
  function cartCount() { return cart.reduce(function (a, l) { return a + l.q; }, 0); }
  function cartTotal() {
    return cart.reduce(function (a, l) {
      var p = findProduct(l.n); return a + (p ? p.p * l.q : 0);
    }, 0);
  }
  function paintCount() {
    var n = cartCount(), b = $('cartcount');
    b.textContent = n; b.classList.toggle('on', n > 0);
  }
  function addToCart(name, qty) {
    var p = findProduct(name); if (!p) return;
    var line = null;
    cart.forEach(function (l) { if (l.n === name) line = l; });
    if (line) line.q = Math.min(30, line.q + qty); else cart.push({ n: name, q: qty });
    saveCart(); paintCount(); paintCart();
    track('add_to_cart', { item: name, quantity: qty, value: p.p * qty });
    toast(name + ' added to your cart');
  }
  function paintCart() {
    var box = $('cartItems'), sum = $('cartSummary');
    if (!cart.length) {
      box.innerHTML = '<div class="cartempty"><h3>Nothing in here yet</h3>' +
        '<p>Have a look through the collection. Everything is arranged the morning it goes out.</p>' +
        '<button class="btn" type="button" id="emptyShop">Browse the collection</button></div>';
      sum.style.display = 'none';
      $('emptyShop').addEventListener('click', toShop);
      return;
    }
    sum.style.display = '';
    box.innerHTML = cart.map(function (l) {
      var p = findProduct(l.n); if (!p) return '';
      return '<div class="citem" data-line="' + p.n + '">' +
        '<img src="../../assets/rachel/' + p.img + '-sm.webp" alt="' + p.alt + '" loading="lazy">' +
        '<h3>' + p.n + '</h3>' +
        '<p class="ip">' + money(p.p) + '</p>' +
        '<div class="ctrl"><div class="stepper">' +
          '<button type="button" data-line-d="-1" aria-label="One fewer ' + p.n + '">&minus;</button>' +
          '<i>' + l.q + '</i>' +
          '<button type="button" data-line-d="1" aria-label="One more ' + p.n + '">+</button>' +
        '</div><button class="rm" type="button" data-rm="1">Remove</button></div>' +
      '</div>';
    }).join('');
    var t = cartTotal();
    $('cSub').textContent = money(t);
    $('cTot').textContent = money(t);
  }
  $('cartItems').addEventListener('click', function (e) {
    var row = e.target.closest('.citem'); if (!row) return;
    var name = row.getAttribute('data-line');
    var step = e.target.closest('[data-line-d]');
    var rm = e.target.closest('[data-rm]');
    if (rm) { cart = cart.filter(function (l) { return l.n !== name; }); }
    else if (step) {
      cart.forEach(function (l) { if (l.n === name) l.q += +step.getAttribute('data-line-d'); });
      cart = cart.filter(function (l) { return l.q > 0; });
    } else return;
    saveCart(); paintCount(); paintCart();
  });

  /* On the shop page the collection is right there; anywhere else the cart
     has to send the reader to it. */
  function toShop() {
    closeCart();
    if ($('shop')) $('shop').scrollIntoView();
    else location.href = 'shop.html';
  }

  var pdpCurrent = null, pdpQty = 1;
  function openPDP(name) {
    var p = findProduct(name); if (!p) return;
    pdpCurrent = p; pdpQty = 1;
    $('pdpImg').src = '../../assets/rachel/' + (p.big || p.img) + '.webp';
    $('pdpImg').alt = p.alt;
    $('pdpName').textContent = p.n;
    $('pdpPrice').textContent = money(p.p);
    $('pdpDesc').textContent = p.d;
    $('pdpQty').textContent = '1';
    $('pdp').classList.add('on');
    document.body.style.overflow = 'hidden';
    $('pdp').scrollTop = 0;
    track('view_item', { item: name, value: p.p });
  }
  function closePDP() { $('pdp').classList.remove('on'); document.body.style.overflow = ''; }
  function openCart() {
    paintCart(); $('cart').classList.add('on'); document.body.style.overflow = 'hidden';
    $('cart').scrollTop = 0; track('view_cart', { value: cartTotal() });
  }
  function closeCart() { $('cart').classList.remove('on'); document.body.style.overflow = ''; }

  document.addEventListener('click', function (e) {
    var open = e.target.closest && e.target.closest('[data-open]');
    if (open) { openPDP(open.getAttribute('data-open')); return; }
    var add = e.target.closest && e.target.closest('[data-add]');
    if (add) { addToCart(add.getAttribute('data-add'), 1); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var open = e.target.closest && e.target.closest('[data-open]');
    if (open) { e.preventDefault(); openPDP(open.getAttribute('data-open')); }
  });
  $('pdpMinus').addEventListener('click', function () { pdpQty = Math.max(1, pdpQty - 1); $('pdpQty').textContent = pdpQty; });
  $('pdpPlus').addEventListener('click', function () { pdpQty = Math.min(30, pdpQty + 1); $('pdpQty').textContent = pdpQty; });
  $('pdpAdd').addEventListener('click', function () { if (pdpCurrent) { addToCart(pdpCurrent.n, pdpQty); closePDP(); } });
  $('pdpBuy').addEventListener('click', function () { if (pdpCurrent) { addToCart(pdpCurrent.n, pdpQty); closePDP(); openCart(); } });
  $('pdpx').addEventListener('click', closePDP);
  $('cartbtn').addEventListener('click', openCart);
  $('cartx').addEventListener('click', closeCart);
  $('keepShopping').addEventListener('click', toShop);
  $('pdpHome').addEventListener('click', function (e) { e.preventDefault(); closePDP(); });
  $('cartHome').addEventListener('click', function (e) { e.preventDefault(); closeCart(); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') { closePDP(); closeCart(); closeCheckout(); $('pop').classList.remove('on'); } });

  $('checkout').addEventListener('click', openCheckout);
  paintCount(); paintCart();

  /* ---------------- checkout ----------------
     The card boxes are Stripe Elements: Stripe drops its own iframed inputs
     into them, so a card number never touches this page or our server.
     Put the publishable key in RR_STRIPE_PK and it goes live. Building the
     card fields as ordinary inputs would put us in full PCI scope and mean
     card numbers arriving by email — so this is the only way it is done. */
  var RR_STRIPE_PK = '';
  var stripe = null, coCard = null;

  function openCheckout() {
    if (!cart.length) return;
    paintCheckout();
    closeCart();
    $('checkoutScreen').classList.add('on');
    document.body.style.overflow = 'hidden';
    $('checkoutScreen').scrollTop = 0;
    track('begin_checkout', { value: cartTotal(), items: cartCount() });
    mountStripe();
  }
  function closeCheckout() {
    $('checkoutScreen').classList.remove('on');
    document.body.style.overflow = '';
  }
  function paintCheckout() {
    $('coLines').innerHTML = cart.map(function (l) {
      var p = findProduct(l.n); if (!p) return '';
      return '<div class="coline">' +
        '<img src="../../assets/rachel/' + p.img + '-sm.webp" alt="' + p.alt + '" loading="lazy">' +
        '<span><b>' + p.n + '</b>' + (l.q > 1 ? '<small>Quantity ' + l.q + '</small>' : '') + '</span>' +
        '<span class="p">' + money(p.p * l.q) + '</span></div>';
    }).join('');
    var t = cartTotal();
    $('coSub').textContent = money(t);
    $('coTot').textContent = money(t);
  }
  function mountStripe() {
    if (!RR_STRIPE_PK || coCard) return;
    var go = function () {
      if (!window.Stripe) return;
      stripe = Stripe(RR_STRIPE_PK);
      var el = stripe.elements();
      var style = { base: { color: '#6A2E3A', fontFamily: 'Cormorant Garamond, Georgia, serif',
        fontSize: '17px', '::placeholder': { color: '#B7A08F' } } };
      coCard = el.create('cardNumber', { style: style, placeholder: '1234 5678 9012 3456' });
      coCard.mount('#co-card');
      el.create('cardExpiry', { style: style }).mount('#co-exp');
      el.create('cardCvc', { style: style }).mount('#co-cvc');
      $('coCardLive').hidden = false;
      $('coCardOff').style.display = 'none';
    };
    if (window.Stripe) { go(); return; }
    var sc = document.createElement('script');
    sc.src = 'https://js.stripe.com/v3/'; sc.onload = go;
    document.head.appendChild(sc);
  }
  $('cox').addEventListener('click', function () { closeCheckout(); openCart(); });
  $('coHome').addEventListener('click', function (e) { e.preventDefault(); closeCheckout(); });
  $('coform').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = ($('coEmail').value || '').trim();
    var addr  = ($('coAddr').value || '').trim();
    var city  = ($('coCity').value || '').trim();
    var post  = ($('coPost').value || '').trim();
    if (!email || !addr || !city || !post) { toast('Fill in your email and delivery address'); return; }

    if (RR_PAYLINK) { window.open(RR_PAYLINK, '_blank', 'noopener'); return; }

    /* no Stripe yet: send it to us as a written order so nothing is lost */
    var lines = cart.map(function (l) { return l.q + ' × ' + l.n; }).join(', ');
    var notes = 'Checkout order: ' + lines + ', total ' + money(cartTotal()) +
      '\nDeliver to: ' + addr + ', ' + city + ' ' + post;
    track('order_submit', { source: 'checkout', value: cartTotal() });
    closeCheckout();
    if ($('oform')) {
      $('fName').value  = $('fName').value || email.split('@')[0];
      $('fEmail').value = email;
      $('fPostcode').value = post;
      applyOrder('Something bespoke, help me choose', notes);
      $('order').scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast('Nearly there. Press Send my order and it comes to us');
    } else {
      goOrder('Something bespoke, help me choose', notes + '\nEmail: ' + email);
    }
  });

  /* ---------------- rose-list popup ---------------- */
  (function popup() {
    var shown = false;
    try { shown = localStorage.getItem('rr-pop') === 'seen'; } catch (e) {}
    function show() {
      if (shown) return; shown = true;
      try { localStorage.setItem('rr-pop', 'seen'); } catch (e) {}
      $('pop').classList.add('on'); track('popup_shown');
    }
    function hide() { $('pop').classList.remove('on'); }
    $('popx').addEventListener('click', hide);
    $('pop').addEventListener('click', function (e) { if (e.target === $('pop')) hide(); });
    $('popform').addEventListener('submit', function (e) {
      e.preventDefault();
      var mail = ($('popmail').value || '').trim(); if (!mail) return;
      track('newsletter_signup', { source: 'popup' });
      $('popmsg').textContent = 'One moment…';
      fetch('/api/rbr/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mail, source: 'popup' })
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok || !res.j.ok) throw new Error('no');
          $('popform').style.display = 'none';
          $('popmsg').textContent = 'Thank you. You are on the list';
        })
        .catch(function () { $('popmsg').textContent = 'That didn’t send. Try the form at the bottom of the page.'; });
    });
    /* leaving on desktop, or a good scroll then a pause on touch */
    document.addEventListener('mouseout', function (e) {
      if (!e.relatedTarget && e.clientY < 12) show();
    });
    var deep = false;
    addEventListener('scroll', function () {
      if (deep) return;
      if (scrollY > document.body.scrollHeight * 0.42) { deep = true; setTimeout(show, 9000); }
    }, { passive: true });
  })();

  /* Safety net. The shared toolkit reveals with an IntersectionObserver;
     if it ever misses one, this makes sure no content is left invisible. */
  (function () {
    var els = [].slice.call(document.querySelectorAll('[data-fx]'));
    function sweep() {
      var vh = innerHeight, i = els.length;
      while (i--) {
        var el = els[i];
        if (el.getBoundingClientRect().top < vh * 0.94) {
          el.classList.add('fx-in');
          [].forEach.call(el.querySelectorAll('.fx-stagger-item,.fx-word-inner'),
            function (c) { c.classList.add('fx-in'); });
          els.splice(i, 1);
        }
      }
      if (!els.length) removeEventListener('scroll', tick);
    }
    var t = 0;
    function tick() { if (!t) t = requestAnimationFrame(function () { t = 0; sweep(); }); }
    addEventListener('scroll', tick, { passive: true });
    addEventListener('resize', tick, { passive: true });
    setTimeout(sweep, 400); setTimeout(sweep, 1200);
  })();

  redraw();
})();
