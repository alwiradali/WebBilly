/* Molecular Miracles — the shop, rendered.

   /masterclasses and /resources sell out of the same Payhip store through the
   same feed, and each page used to carry its own copy of this code. They
   drifted: the nine-product cap that hid two thirds of her shop was fixed on
   one page and left standing on the other, and every fault an audit turned up
   existed twice over. One module now, configured twice.

   The basket is this site's own — see below for why it is no longer Payhip's.
   Payhip is not involved until the customer chooses to check out. */
(function (w, d) {
  'use strict';

  /* ---- reading her product names ------------------------------------
     Lynsey types all 27 names by hand each year, so everything here is
     written to fail towards showing a product rather than hiding one. */

  var MONTH = '(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|' +
              'aug(ust)?|sep(t|tember)?|oct(ober)?|nov(ember)?|dec(ember)?)';

  /* Every masterclass is named with the date it runs, but only five of the
     twenty-seven carry the word "masterclass", so the date is what marks one.
     Accepted: "27th September", "27 Sept", "27th of September" (the British
     phrasing her own copy uses elsewhere), "September 27th", "27/09",
     "27.09.25".

     The closing \b is load-bearing. Without it a month name matched as a
     prefix of an ordinary word, so "20 Marks in 20 Minutes" — a revision
     download — read as a March masterclass and would have been sold on the
     booking page as a live Sunday class, counted in its level's heading. */
  var DATED = new RegExp(
    '\\b\\d{1,2}\\s*(st|nd|rd|th)?\\s*(of\\s+)?' + MONTH + '\\b' +
    '|\\b' + MONTH + '\\b\\.?\\s*\\d{1,2}\\b' +
    '|\\b\\d{1,2}[\\/.]\\d{1,2}\\b', 'i');

  function isMasterclass(n) { return DATED.test(n) || /masterclass/i.test(n); }

  /* Level, from her naming in Payhip: "N5 Chemistry...", "Higher
     Chemistry...", "AH Chemistry...". The aliases matter more than they look:
     typing "Nat 5" instead of "N5" for one season used to move all nine
     classes into a column headed "More masterclasses", turn the level's
     ember amber, and quietly break both the "Book National 5" button and the
     homepage's National 5 link — three failures, none of which look broken.

     Higher stays anchored so "Advanced Higher" cannot match it. */
  var GROUPS = [
    { key: 'n5', label: 'National 5',      slug: 'national-5',
      test: /^\s*(n5|nat\.?\s*5|national\s*5)\b|\bnational\s*5\b/i },
    { key: 'hi', label: 'Higher',          slug: 'higher',
      test: /^\s*higher\b/i },
    { key: 'ah', label: 'Advanced Higher', slug: 'advanced-higher',
      test: /^\s*(ah|adv\.?\s*higher|advanced\s*higher)\b|\badvanced\s*higher\b/i }
  ];

  function levelOf(n) {
    /* Advanced Higher first: "Advanced Higher" contains "Higher", and while
       the Higher test is anchored today, testing the more specific name
       first means that stays true if it is ever loosened. */
    if (GROUPS[2].test.test(n)) return 'ah';
    if (GROUPS[0].test.test(n)) return 'n5';
    if (GROUPS[1].test.test(n)) return 'hi';
    return 'other';
  }

  /* Payhip product keys. Their slugs are alphanumeric until a seller connects
     a custom domain, at which point a product can be renamed to something
     like /b/n5-pass. Reading only [A-Za-z0-9] would have truncated that to
     "n5" and added the wrong item to the basket. */
  var KEY = /\/b\/([A-Za-z0-9_-]+)/;

  var REDUCED = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function scrollTo(el) {
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
    }
  }

  /* ---- the basket ------------------------------------------------------
     Hers, on her own domain.

     It used to be Payhip's: a cross-origin iframe on payhip.com that held the
     cart, with "Add to basket" posting a message into it. That cannot work for
     most of her customers. Safari blocks third-party storage by default, and
     the Facebook and Instagram in-app browsers — where every visitor from her
     ads arrives — partition it away entirely. Payhip's own script knows this
     and refuses to use the cart in those browsers, which is why tapping Add to
     basket put the item somewhere the checkout could not read it and the cart
     came up empty.

     So the basket is kept here instead, in this site's own localStorage, which
     is first-party and works in every browser. Payhip is not involved until
     the customer chooses to check out, at which point the whole basket goes
     over in one URL: /buy?link[]=A&link[]=B&qty[A]=2. Checked against her live
     shop — two classes come to £36, two classes and a pass to £155.

     What that buys is a shop that behaves like a shop: adding an item adds it
     and leaves the customer where they were, the basket says how many are in
     it, and they open it when they are ready — with a way back out. */

  /* Payhip serves a seller's checkout from their own domain once a custom
     domain is verified. shop.molecularmiracleschemistrytuition.co.uk is
     connected and waiting on them. Change this one line when it answers and
     every checkout link on both pages follows. */
  var CHECKOUT_ORIGIN = 'https://payhip.com';

  var STORE = 'mm-basket';
  var basket = [];
  try { basket = JSON.parse(w.localStorage.getItem(STORE)) || []; } catch (e) {}
  if (!Array.isArray(basket)) basket = [];

  function persist() {
    /* Private browsing throws on write. The basket then lasts for this visit
       only, which is still worth having; it must never break the shop. */
    try { w.localStorage.setItem(STORE, JSON.stringify(basket)); } catch (e) {}
  }

  function money(v) {
    var m = String(v == null ? '' : v).replace(/,/g, '')
      .match(/([£$€])?\s*(\d+(?:\.\d{1,2})?)/);
    return m ? { cur: m[1] || '£', v: parseFloat(m[2]) } : null;
  }
  function fmt(m) { return m.cur + m.v.toFixed(2); }

  function total() {
    var cur = null, sum = 0;
    for (var i = 0; i < basket.length; i++) {
      var m = money(basket[i].price);
      if (!m) return null;        /* one price we cannot read, so no total at all */
      cur = cur || m.cur;
      sum += m.v * (basket[i].qty || 1);
    }
    return { cur: cur || '£', v: sum };
  }

  function count() {
    var n = 0;
    for (var i = 0; i < basket.length; i++) n += basket[i].qty || 1;
    return n;
  }
  function summary() {
    var n = count();
    return n === 1 ? '1 item in your basket.' : n + ' items in your basket.';
  }
  function find(key) {
    for (var i = 0; i < basket.length; i++) if (basket[i].key === key) return i;
    return -1;
  }

  /* The whole basket, handed to Payhip in one URL. */
  function checkoutHref() {
    var q = [];
    for (var i = 0; i < basket.length; i++) {
      var it = basket[i], n = it.qty || 1;
      q.push('link%5B%5D=' + encodeURIComponent(it.key));
      if (n > 1) q.push('qty%5B' + encodeURIComponent(it.key) + '%5D=' + n);
    }
    q.push('type=fallback_direct');
    q.push('parentUrl=' + encodeURIComponent(location.href));
    return CHECKOUT_ORIGIN + '/buy?' + q.join('&');
  }

  /* ---- the basket, on screen ---------------------------------------- */

  var ui = null, announce = null, lastFocus = null;

  function el(tag, cls, text) {
    var n = d.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function build() {
    if (ui) return ui;

    /* A bar along the bottom, only once there is something in the basket. It
       is how a customer who has scrolled into the middle of twenty-seven
       classes gets to the checkout without hunting back up the page. */
    var bar = el('div', 'bk-bar');
    bar.hidden = true;
    var sum = el('span', 'bk-sum');
    var openBtn = el('button', 'btn btn-p bk-open', 'View basket →');
    openBtn.type = 'button';
    bar.appendChild(sum); bar.appendChild(openBtn);

    var scrim = el('div', 'bk-scrim');
    scrim.hidden = true;

    var panel = el('aside', 'bk-panel');
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Your basket');

    var head = el('div', 'bk-head');
    head.appendChild(el('h3', null, 'Your basket'));
    var x = el('button', 'bk-x', '×');
    x.type = 'button';
    x.setAttribute('aria-label', 'Close the basket');
    head.appendChild(x);

    var items = el('div', 'bk-items');

    var foot = el('div', 'bk-foot');
    var tot = el('div', 'bk-total');
    tot.appendChild(el('span', null, 'Subtotal'));
    var totV = el('b');
    tot.appendChild(totV);
    var go = el('a', 'btn btn-p bk-go', 'Checkout securely →');
    var back = el('button', 'btn btn-g bk-back', '← Continue shopping');
    back.type = 'button';
    var note = el('p', 'bk-note', 'Payment is taken by Payhip on a secure page — ' +
      'card or PayPal. Your place and all the relevant information are then emailed to you.');
    var clear = el('button', 'bk-clear', 'Empty the basket');
    clear.type = 'button';
    foot.appendChild(tot); foot.appendChild(go); foot.appendChild(back);
    foot.appendChild(note); foot.appendChild(clear);

    panel.appendChild(head); panel.appendChild(items); panel.appendChild(foot);
    d.body.appendChild(bar); d.body.appendChild(scrim); d.body.appendChild(panel);

    openBtn.addEventListener('click', function () { openPanel(openBtn); });
    x.addEventListener('click', closePanel);
    back.addEventListener('click', closePanel);
    scrim.addEventListener('click', closePanel);
    d.addEventListener('keydown', function (ev) {
      if ((ev.key === 'Escape' || ev.keyCode === 27) && !panel.hidden) closePanel();
    });
    clear.addEventListener('click', function () {
      basket = []; persist(); paint();
      if (announce) announce.textContent = 'Your basket is empty.';
    });

    ui = { bar: bar, sum: sum, scrim: scrim, panel: panel, items: items,
           tot: tot, totV: totV, go: go, x: x };
    return ui;
  }

  function openPanel(from) {
    build();
    lastFocus = from || d.activeElement;
    paint();
    ui.scrim.hidden = false;
    ui.panel.hidden = false;
    d.body.classList.add('bk-open');
    ui.x.focus();
  }

  function closePanel() {
    if (!ui || ui.panel.hidden) return;
    ui.panel.hidden = true;
    ui.scrim.hidden = true;
    d.body.classList.remove('bk-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  function row(it) {
    var r = el('div', 'bk-row');
    if (it.img) {
      var im = el('img');
      im.src = it.img; im.alt = ''; im.loading = 'lazy';
      r.appendChild(im);
    }
    var meta = el('div', 'bk-meta');
    meta.appendChild(el('b', null, it.name));
    var m = money(it.price);
    meta.appendChild(el('span', null, m ? fmt(m) + ' each' : (it.price || '')));
    r.appendChild(meta);

    var qty = el('div', 'bk-qty');
    var less = el('button', null, '−');
    less.type = 'button';
    less.setAttribute('aria-label', 'One fewer place on ' + it.name);
    var num = el('span', null, String(it.qty || 1));
    var more = el('button', null, '+');
    more.type = 'button';
    more.setAttribute('aria-label', 'One more place on ' + it.name);
    less.addEventListener('click', function () { bump(it.key, -1); });
    more.addEventListener('click', function () { bump(it.key, 1); });
    qty.appendChild(less); qty.appendChild(num); qty.appendChild(more);
    r.appendChild(qty);

    var rm = el('button', 'bk-rm', '×');
    rm.type = 'button';
    rm.setAttribute('aria-label', 'Remove ' + it.name + ' from your basket');
    rm.addEventListener('click', function () { drop(it.key); });
    r.appendChild(rm);
    return r;
  }

  function paint() {
    build();
    var n = count(), t = total();

    ui.bar.hidden = n === 0;
    d.body.classList.toggle('has-basket', n > 0);
    ui.sum.textContent = (n === 1 ? '1 item' : n + ' items') + (t ? ' · ' + fmt(t) : '');

    /* Every "view basket" control on the page carries the count, so a customer
       can see something happened without opening anything. */
    var tags = d.getElementsByClassName('bk-count');
    for (var i = 0; i < tags.length; i++) tags[i].textContent = n ? ' (' + n + ')' : '';

    ui.items.innerHTML = '';
    if (!n) {
      ui.items.appendChild(el('p', 'bk-empty', 'Your basket is empty.'));
      ui.tot.hidden = true;
      ui.go.hidden = true;
    } else {
      ui.tot.hidden = !t;
      ui.go.hidden = false;
      ui.go.href = checkoutHref();
      if (t) ui.totV.textContent = fmt(t);
      for (var j = 0; j < basket.length; j++) ui.items.appendChild(row(basket[j]));
    }
  }

  function bump(key, by) {
    var i = find(key);
    if (i < 0) return;
    var next = (basket[i].qty || 1) + by;
    if (next < 1) return drop(key);
    basket[i].qty = next;
    persist(); paint();
    if (announce) announce.textContent = basket[i].name + ': ' + next + '. ' + summary();
  }

  function drop(key) {
    var i = find(key);
    if (i < 0) return;
    var name = basket[i].name;
    basket.splice(i, 1);
    persist(); paint();
    if (announce) announce.textContent = name + ' removed. ' + summary();
  }

  /* The button says so itself for a moment. Without this, adding without
     opening the basket looks like nothing happened — which is the complaint
     that started all of this, from the other direction. */
  function flash(btn) {
    if (btn.__t) clearTimeout(btn.__t);
    else btn.__label = btn.textContent;
    btn.textContent = 'Added ✓';
    btn.classList.add('is-added');
    btn.__t = setTimeout(function () {
      btn.textContent = btn.__label;
      btn.classList.remove('is-added');
      btn.__t = null;
    }, 1500);
  }

  function addToBasket(item) {
    var i = find(item.key);
    if (i < 0) {
      basket.push({ key: item.key, name: item.name, price: item.price,
                    img: item.img, qty: 1 });
    } else {
      basket[i].qty = (basket[i].qty || 1) + 1;
    }
    persist(); paint();
    if (announce) announce.textContent = item.name + ' added. ' + summary();
  }

  /* ---- one shop section ---------------------------------------------- */

  function mount(opts) {
    var grid = d.getElementById(opts.grid);
    if (!grid) return;
    var bar = opts.bar ? d.getElementById(opts.bar) : null;
    var say = opts.say ? d.getElementById(opts.say) : null;
    var otherLabel = opts.otherLabel || 'More from the shop';
    var noun = opts.noun || ['item', 'items'];

    /* Its own live region. Deliberately not #lvlsay: that one carries the
       filter's status ("Showing all 27 masterclasses"), and overwriting it
       with a basket message would leave a false description of the filter on
       screen and destroy the chips' own feedback. */
    var alerts = d.createElement('p');
    alerts.className = 'shop-sr';
    alerts.setAttribute('role', 'status');
    alerts.setAttribute('aria-live', 'polite');
    grid.parentNode.insertBefore(alerts, grid);

    announce = alerts;

    /* Every "View your basket" control on the page opens the panel. Painting
       now rather than on the first add means a customer who left with three
       classes in the basket comes back and can still see them. */
    var openers = d.getElementsByClassName('bk-view');
    for (var v = 0; v < openers.length; v++) {
      (function (o) {
        o.addEventListener('click', function (ev) { ev.preventDefault(); openPanel(o); });
      })(openers[v]);
    }
    paint();

    function fallback() {
      grid.innerHTML = '';
      var box = d.createElement('div');
      box.className = 'card rv in shopwait';
      var p = d.createElement('p');
      p.textContent = 'The live list is not loading at the moment. Everything is still available in the shop.';
      var a = d.createElement('a');
      a.className = 'btn btn-p';
      a.href = 'https://payhip.com/molecularmiraclesChemistryResourcesScottishCurricu';
      a.target = '_blank'; a.rel = 'noopener';
      a.textContent = 'Open the shop →';
      box.appendChild(p); box.appendChild(a);
      grid.appendChild(box);
    }

    function card(p, i) {
      var wrap = d.createElement('div');
      wrap.className = 'card rv in' + (i % 3 === 1 ? ' d1' : i % 3 === 2 ? ' d2' : '');
      var key = (String(p.link || '').match(KEY) || [])[1];

      if (p.img) {
        var im = d.createElement('img');
        im.src = p.img; im.alt = ''; im.loading = 'lazy';
        im.style.cssText = 'border-radius:12px;margin-bottom:14px;width:100%;aspect-ratio:16/10;object-fit:cover';
        wrap.appendChild(im);
      }
      var h = d.createElement('h3'); h.textContent = p.name; wrap.appendChild(h);
      var pr = d.createElement('p');
      pr.textContent = p.price || '';
      pr.style.cssText = 'font-weight:600;color:var(--teal);margin-bottom:12px';
      wrap.appendChild(pr);

      var row = d.createElement('div'); row.className = 'buyrow';
      if (key) {
        /* Adding adds, and nothing else. It used to open the basket drawer in
           the same breath, which threw the customer out of the list they were
           reading after every single tap. The count on the bar and the word on
           the button are the confirmation; the basket opens when they ask. */
        var add = d.createElement('button');
        add.type = 'button';
        add.className = 'btn btn-p bk-add';
        add.textContent = 'Add to basket';
        /* Twenty-seven buttons all reading "Add to basket" are impossible to
           tell apart in a screen reader's list of controls. */
        add.setAttribute('aria-label', 'Add ' + p.name + ' to basket');
        add.addEventListener('click', function () {
          addToBasket({ key: key, name: p.name, price: p.price, img: p.img });
          flash(add);
        });
        row.appendChild(add);
      } else {
        /* no readable key — fall back to the product's own page */
        var only = d.createElement('a');
        only.className = 'btn btn-p'; only.href = p.link;
        only.target = '_blank'; only.rel = 'noopener';
        only.textContent = 'View';
        row.appendChild(only);
      }
      wrap.appendChild(row);
      return wrap;
    }

    function render(all) {
      var items = opts.masterclassesOnly
        ? all.filter(function (p) { return isMasterclass(p.name || ''); })
        : all.slice();

      /* Say so when the gate drops something. It is the one place a product
         can leave the page with nothing to show it was ever there — the
         "other" column catches an unrecognised LEVEL, but a name that fails
         the masterclass test is gone before any column exists. */
      if (opts.masterclassesOnly && all.length !== items.length) {
        console.info('[shop] ' + (all.length - items.length) + ' of ' + all.length +
          ' shop products are not masterclasses and are not listed here:',
          all.filter(function (p) { return !isMasterclass(p.name || ''); })
             .map(function (p) { return p.name; }));
      }
      if (!items.length) { fallback(); return; }

      var counts = {};
      items.forEach(function (p) {
        var k = levelOf(p.name || '');
        counts[k] = (counts[k] || 0) + 1;
      });

      /* Anything her naming does not place into one of the three levels still
         gets a column. Without it a product she calls something unexpected
         renders nowhere at all. */
      var columns = GROUPS.filter(function (g) { return counts[g.key]; });
      if (counts.other) {
        columns.push({ key: 'other', label: otherLabel, slug: 'more' });
      }

      grid.innerHTML = '';
      /* The grid's track count follows the columns actually built. Hardcoding
         three while the count came from her data is what left the fourth
         column wrapping under National 5 with a stray rule down its side. */
      grid.style.setProperty('--cols', columns.length);

      columns.forEach(function (g) {
        var mine = items.filter(function (p) { return levelOf(p.name || '') === g.key; });
        if (!mine.length) return;

        var col = d.createElement('div');
        col.className = 'lvlcol';
        col.setAttribute('data-level', g.key);
        col.id = g.slug;

        var head = d.createElement('div');
        head.className = 'lvlhead';
        var ht = d.createElement('h3'); ht.textContent = g.label; head.appendChild(ht);
        var hc = d.createElement('span');
        hc.className = 'lvlcount';
        var n = mine.filter(function (p) { return !/pass/i.test(p.name || ''); }).length;
        hc.textContent = n + ' ' + (n === 1 ? noun[0] : noun[1]);
        head.appendChild(hc);
        col.appendChild(head);

        /* The pass goes first within its level: it is the offer she most wants
           taken and the one a parent is deciding about, so it should not sit
           at the bottom of nine dates. The rest keep the order the shop
           returns them in, which is her running order through the year. */
        var passes = mine.filter(function (p) { return /pass/i.test(p.name || ''); });
        var singles = mine.filter(function (p) { return !/pass/i.test(p.name || ''); });
        passes.concat(singles).forEach(function (p, i) {
          var c = card(p, i);
          if (/pass/i.test(p.name || '')) c.classList.add('is-pass');
          col.appendChild(c);
        });

        grid.appendChild(col);
      });

      /* ---- level filter ---------------------------------------------
         Selecting a level shows it alone, lights its chip and writes
         ?level= to the address bar, so the state is visible, shareable and
         survives a refresh. The chips are the way back to everything. */
      function describe(k) {
        if (k === 'all') return opts.sayAll ? opts.sayAll(items.length) : '';
        var g = columns.filter(function (x) { return x.key === k; })[0];
        return g && opts.sayOne ? opts.sayOne(counts[g.key], g.label) : '';
      }

      function apply(k, push) {
        grid.setAttribute('data-filter', k);
        if (bar) {
          [].forEach.call(bar.querySelectorAll('button'), function (b) {
            b.setAttribute('aria-pressed', String(b.getAttribute('data-key') === k));
          });
        }
        if (say) say.textContent = describe(k);
        if (push && w.history && history.replaceState) {
          var g = columns.filter(function (x) { return x.key === k; })[0];
          history.replaceState(null, '', g ? '?level=' + g.slug : location.pathname);
        }
      }

      /* Only worth showing when there is more than one level to choose. */
      if (bar && columns.length > 1) {
        var mk = function (key, label) {
          var b = d.createElement('button');
          b.type = 'button';
          b.setAttribute('data-key', key);
          b.setAttribute('aria-pressed', 'false');
          b.textContent = label;
          b.addEventListener('click', function () { apply(key, true); });
          bar.appendChild(b);
        };
        mk('all', opts.allLabel || 'All levels');
        columns.forEach(function (g) { mk(g.key, g.label); });
        bar.hidden = false;
      }

      /* The level the visitor asked for: ?level=higher from another page, or
         #higher from the buttons on this one. */
      function requested() {
        var m = (location.search.match(/[?&]level=([^&]+)/) || [])[1];
        var want = m ? decodeURIComponent(m) : (location.hash || '').replace('#', '');
        if (!want) return null;
        want = want.toLowerCase();
        var hit = columns.filter(function (g) {
          return g.slug === want || g.key === want;
        })[0];
        return hit ? hit.key : null;
      }

      var start = requested();
      apply(start || 'all', false);
      /* Scroll whenever a level was asked for, even one that has nothing open
         this season. Landing silently at the top of the page with every level
         showing tells a parent who followed "See Higher dates" nothing at
         all; landing on the shop at least shows them the shop. */
      if (start || /[?&]level=/.test(location.search)) {
        scrollTo(d.getElementById(opts.section));
      }

      /* Same-page level buttons filter in place rather than jumping. */
      [].forEach.call(d.querySelectorAll('[data-golevel]'), function (a) {
        a.addEventListener('click', function (ev) {
          ev.preventDefault();
          var k = a.getAttribute('data-golevel');
          /* Its href points at #national-5, an id that only exists once that
             column is built — so when the level is empty the anchor was a
             guaranteed no-op: the parent pressed it and the page did not
             move. Show them the shop instead. */
          if (counts[k]) apply(k, true);
          scrollTo(d.getElementById(opts.section));
        });
      });
    }

    /* Cache-bust deliberately. Her zone applies a four-hour browser cache to
       this response, which overrides the Worker's own no-store on an empty
       result — so a visitor who once got a failed feed kept being shown the
       "not loading" fallback for hours after the site was fixed. The feed is
       under 2KB, so a fresh fetch each visit costs nothing worth having. */
    fetch('/api/mm-shop?t=' + Date.now(), { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (data) {
      render(data.products || []);
    }).catch(function (e) {
      console.info('[shop] live products unavailable —', e && e.message ? e.message : e);
      fallback();
    });
  }

  w.MMShop = { mount: mount, isMasterclass: isMasterclass, levelOf: levelOf };
})(window, document);
