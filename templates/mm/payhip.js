/* Molecular Miracles — Payhip shop mirror (client half)
   -----------------------------------------------------
   Renders Lynsey's live Payhip products into #shop on /resources, so a
   product she adds over there appears here without anyone rebuilding or
   redeploying the site.

   Payhip publishes no products API (theirs covers coupons and licence keys
   only) and sends no CORS header, so the storefront cannot be read from the
   browser. The Billy Digitals Worker reads it server-side and republishes it
   as JSON at /api/payhip?store=<slug>; this file is only the rendering half.

   Progressive enhancement, exactly like content.js: the page ships with copy
   already in #shop, and that copy is only ever replaced once real products
   are in hand. Shop unreachable, store slug not set, or a store with nothing
   in it yet — in every one of those cases the visitor keeps the built-in
   text rather than an error or an empty hole.

   Product text is inserted with textContent and links are checked against
   Payhip's own product URL shape, so nothing from the remote store can turn
   into markup on her page. */

(function () {
  var box = document.getElementById('shop');
  if (!box) return;

  var store = (box.getAttribute('data-store') || '').trim();
  var api = (box.getAttribute('data-api') || '').trim();
  // Not wired up to a storefront yet — leave the built-in copy alone.
  if (!store || !api) return;

  function card(p) {
    var el = document.createElement('div');
    el.className = 'shop-card';

    // https only, checked here as well as in the Worker: this file must be
    // safe on its own terms, exactly as content.js is with editor images.
    if (/^https:\/\//i.test(p.image || '')) {
      var thumb = document.createElement('div');
      thumb.className = 'shop-thumb';
      var img = document.createElement('img');
      img.setAttribute('src', p.image);
      img.alt = p.name;
      img.loading = 'lazy';
      thumb.appendChild(img);
      el.appendChild(thumb);
    }

    var body = document.createElement('div');
    body.className = 'shop-body';

    var name = document.createElement('h3');
    name.className = 'shop-name';
    name.textContent = p.name;
    body.appendChild(name);

    // Free and tiered products come back without a price; showing an empty
    // line for them looks broken, so the price is only added when there is one.
    if (p.price) {
      var price = document.createElement('div');
      price.className = 'shop-price';
      price.textContent = p.price;
      body.appendChild(price);
    }

    var go = document.createElement('a');
    go.className = 'btn btn-p';
    go.href = p.url;
    go.target = '_blank';
    go.rel = 'noopener';
    go.textContent = !p.price ? 'View details' :
      (/^free$/i.test(p.price) ? 'Download free' : 'Buy now');
    // Screen readers hear a run of identical "Buy now" links otherwise.
    go.setAttribute('aria-label', go.textContent + ' — ' + p.name);
    body.appendChild(go);

    el.appendChild(body);
    return el;
  }

  fetch(api + '?store=' + encodeURIComponent(store), { cache: 'no-store' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      var products = (data && data.products) || [];
      // Only ever trust Payhip's own product URLs — this is what a link on
      // her site is allowed to point at.
      products = products.filter(function (p) {
        return p && p.name && /^https:\/\/payhip\.com\/b\//.test(p.url || '');
      });
      if (!products.length) return;      // nothing for sale yet: keep the copy

      var grid = document.createElement('div');
      grid.className = 'shop-grid';
      products.forEach(function (p) {
        try { grid.appendChild(card(p)); } catch (e) { /* one bad product never empties the shop */ }
      });
      if (!grid.childNodes.length) return;

      box.innerHTML = '';
      box.appendChild(grid);
    })
    .catch(function (e) {
      // The built-in copy is already on screen — this is informational only.
      console.info('[payhip] shop unavailable, showing built-in copy —',
                   e && e.message ? e.message : e);
    });
})();
