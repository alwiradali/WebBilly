/* Molecular Miracles — the shop, rendered.

   /masterclasses and /resources sell out of the same Payhip store through the
   same feed, and each page used to carry its own copy of this code. They
   drifted: the nine-product cap that hid two thirds of her shop was fixed on
   one page and left standing on the other, and every fault an audit turned up
   existed twice over. One module now, configured twice.

   Payhip's embed turns each card into a basket that opens ON her site — the
   customer browses and adds without being sent to payhip.com, and only meets
   Payhip at the card-details step. */
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

  /* ---- Payhip ---------------------------------------------------------
     Loaded and bound at parse time rather than inside the feed's success
     handler. It used to live in there, which meant that on any path where the
     products did not arrive — the fetch failing, or simply a feed with
     nothing in it — the "View your basket" button was rendered, announced as
     a button, and had no listener at all: pressing it appended "#" to the URL
     and threw the reader to the top of the page. Payhip's basket persists
     across visits, so the customer most likely to press it is the one who
     already has something in it. */
  function payhip() {
    w.PayhipConfig = w.PayhipConfig || { enableCart: true };
    if (!w.__payhipLoading) {
      w.__payhipLoading = true;
      var ps = d.createElement('script');
      ps.src = 'https://payhip.com/payhip.js';
      d.body.appendChild(ps);
    }
    /* Their loader appends the real script asynchronously, so its own onload
       fires before Payhip exists. Setup() is what binds anything, refuses to
       run twice, and only creates a basket if enableCart was set before it
       ran. Hence: set the config, load, poll, then Setup once. */
    (function wait(tries) {
      tries = tries || 0;
      if (w.Payhip && typeof w.Payhip.Setup === 'function') {
        if (!w.PayhipSetupFinished) w.Payhip.Setup();
        return;
      }
      if (tries < 120) setTimeout(function () { wait(tries + 1); }, 100);
    })(0);
  }

  function openBasket() {
    if (w.Payhip && w.Payhip.Cart && w.Payhip.Cart.displayCartAndLauncher) {
      try { w.Payhip.Cart.displayCartAndLauncher(); } catch (e) {}
    }
  }

  /* Setup() binds .payhip-open-cart-button on its single DOM pass, but only
     reveals the drawer once the cart iframe has reported in. Bind it here too
     so the button works the moment someone presses it. */
  function bindBasketButtons() {
    var list = d.getElementsByClassName('payhip-open-cart-button');
    for (var i = 0; i < list.length; i++) {
      list[i].addEventListener('click', function (ev) {
        ev.preventDefault();
        openBasket();
      });
    }
  }

  /* Payhip calls this by name when a purchase completes, so the customer is
     thanked on Lynsey's site rather than left looking at a closed overlay
     wondering whether it worked. */
  w.mmPurchaseDone = function () {
    var n = d.createElement('div');
    n.setAttribute('role', 'status');
    n.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:9999;' +
      'background:#0B7F72;color:#fff;padding:16px 24px;border-radius:18px;font-weight:500;line-height:1.45;' +
      'box-shadow:0 18px 44px -18px rgba(0,0,0,.4);max-width:92vw;text-align:center';
    n.innerHTML = '<b>Thank you for your purchase!</b><br>Everything you need is on its way to your email.';
    d.body.appendChild(n);
    setTimeout(function () { n.style.transition = 'opacity .6s'; n.style.opacity = '0'; }, 9000);
    setTimeout(function () { n.remove(); }, 9800);
  };

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

    payhip();
    bindBasketButtons();

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
        /* One action, and it is the one that keeps them here: add to basket.
           Payhip's basket is an iframe drawer over this page, so browsing,
           adding, changing quantities and reviewing the order all happen on
           molecularmiracleschemistrytuition.co.uk.

           There is deliberately no "Buy now" button while the shop is still on
           payhip.com. Payhip's own embed ends Checkout.open() with an
           unconditional redirect — it builds an overlay URL and then navigates
           anyway — so a Buy-now button cannot be made to stay on this site.
           It only ever threw the customer out mid-journey. */
        if (opts.ownDomain) {
          var buy = d.createElement('a');
          buy.className = 'btn btn-p';
          buy.href = opts.shopOrigin + '/buy?link=' + encodeURIComponent(key);
          buy.textContent = 'Buy now';
          row.appendChild(buy);
        }
        var add = d.createElement('a');
        add.className = 'btn ' + (opts.ownDomain ? 'btn-g' : 'btn-p') + ' payhip-add-to-cart-button';
        add.href = p.link; add.rel = 'noopener';
        add.setAttribute('data-product', key);
        add.setAttribute('data-theme', 'none');
        add.textContent = 'Add to basket';
        /* Twenty-seven anchors all reading "Add to basket" are impossible to
           tell apart in a screen reader's list of links. */
        add.setAttribute('aria-label', 'Add ' + p.name + ' to basket');
        /* Bind it ourselves rather than trusting Payhip's DOM scan. Setup()
           walks the page once; these cards arrive later from a fetch, so that
           scan is a race, and when it loses, the anchor keeps its href and the
           click just navigates. Cart.addItem is public, so calling it directly
           is deterministic. The href stays as the fallback for anyone whose
           browser never loads their script — a working link beats a dead one. */
        add.addEventListener('click', function (ev) {
          if (!w.Payhip || !w.Payhip.Cart) return;  /* let the link work */
          ev.preventDefault();
          w.Payhip.Cart.addItem({ product: key });
          openBasket();
          /* The only confirmation Payhip gives is inside a cross-origin drawer
             appended to the end of <body> — not announced, and nowhere near
             the button that was just pressed. Without this a blind parent
             cannot tell whether the add worked, presses again, and buys two. */
          alerts.textContent = p.name + ' added to your basket.';
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
