/* =====================================================================
   The Bespoke Bouquets — page script
   Everything she might want to change is in the first three blocks:
   CONFIG (contact + payments), REVIEWS and CATALOGUE.
   ===================================================================== */
(() => {
'use strict';

/* --------------------------------------------------------------------
   CONFIG
   Every empty value degrades to something that still works:
   - no web3formsKey  -> orders/enquiries are handed back as a ready-written
                         message, one tap from her Instagram DMs
   - no whatsapp      -> the floating bubble opens an Instagram DM
   - no payment setup -> checkout runs in preview mode and says so
   -------------------------------------------------------------------- */
const CONFIG = {
  instagram: 'thebespokebouquets',
  tiktok: 'thebespokebouquets_',
  whatsapp: '',            // digits with country code, e.g. '447700900123'
  email: '',               // e.g. 'hello@thebespokebouquets.co.uk'
  web3formsKey: '',        // from web3forms.com — the key IS the inbox
  depositRate: 0.5,        // her order guide: non-refundable 50% deposit
  minDays: 5,              // her order guide: minimum 5 days in advance
  deliveryFee: null,       // number (e.g. 8) once set; null = "confirmed with order"
  payments: {
    // POST the order here and expect { url } back (a Stripe Checkout
    // Session made by a small worker). That is the seam for real card,
    // Apple Pay and Google Pay payments.
    checkoutEndpoint: '',
    paypalMe: '',          // e.g. 'thebespokebouquets' -> paypal.me/<name>/<amount>
    bank: null             // e.g. { name:'…', sort:'00-00-00', account:'00000000' }
  },
  google: {
    profile: '',           // her Google Business profile link
    write: '',             // the "write a review" link
    rating: null,          // e.g. 5.0
    count: null            // e.g. 37
  }
};

/* --------------------------------------------------------------------
   REVIEWS — sample:true puts an "Example" chip on every card and a line
   above the rail saying so. A made-up review shown as a real one would be
   a lie told on her behalf. Set sample:false once real ones are in.
   -------------------------------------------------------------------- */
const REVIEWS = {
  sample: true,
  items: [
    { name: 'Aaliyah R.', text: 'Ordered the skirt bouquet for my sister’s birthday and she was speechless. Even prettier in person — the bow is everything.', about: 'The Skirt Bouquet' },
    { name: 'Hamza S.', text: 'The 100 roses with our initials were absolutely stunning. So easy to order from start to finish.', about: '100 Red Roses' },
    { name: 'Sophie L.', text: 'Got the balloon hatbox for my mum and she hasn’t stopped talking about it. So thoughtful and beautifully made.', about: 'Balloon Hatbox' },
    { name: 'Mariam K.', text: 'My gajre were perfect for my mehndi — fresh, delicate and exactly what I pictured.', about: 'Gajre' },
    { name: 'Daniel P.', text: 'The money bouquet was the best gift idea. Neatly done and so well presented.', about: 'Money Bouquet' },
    { name: 'Priya M.', text: 'Gorgeous flowers, gorgeous wrapping, and collection was so easy.', about: 'Blush Garden Gift Bag' }
  ]
};

/* --------------------------------------------------------------------
   CATALOGUE — the shop. The three prices are hers (£145 / £95 / £70, from
   her own messages). Everything else she makes is on the portfolio page
   (portfolio.js (in this folder)); give a design a price and add it here
   to make it buyable. price:null would show "Price on request".
   -------------------------------------------------------------------- */
const CATALOGUE = [
  { id: 'skirt', name: 'The Skirt Bouquet', price: 145, cats: ['signature', 'personalised'], badge: 'Showstopper',
    imgs: ['skirt-bouquet', 'skirt-bouquet-wide'], alt: 'Red and blush roses in layered pink wrap with an oversized crimson satin bow',
    short: 'Red & blush roses, a layered skirt wrap and an oversized satin bow.',
    desc: 'The showstopper. Red and blush roses framed in layer upon layer of pink wrap, finished with an oversized satin bow that falls like a ball-gown skirt. Pearl lettering can be added to the centre.',
    options: ['wrap', 'bow', 'lettering', 'card'] },
  { id: 'blush', name: 'Blush Garden Gift Bag', price: 95, cats: ['signature'],
    imgs: ['blush-stocks'], alt: 'Pink roses, white stocks and eucalyptus in a white gift bag with a pink satin bow',
    short: 'Pink roses, white stocks and eucalyptus in a gift bag.',
    desc: 'Soft pink roses, scented white stocks, eucalyptus and pistachio leaf, arranged standing in a crisp white gift bag and tied with satin ribbon — beautiful from every side.',
    options: ['ribbon', 'card'] },
  { id: 'birthday', name: 'Birthday Banner Bouquet', price: 70, cats: ['personalised', 'signature'], badge: 'Personalised',
    imgs: ['birthday-blush'], alt: 'Pink carnations and lilac roses with a personalised birthday banner, in a white gift bag',
    short: 'Carnations, lilac roses and a personalised satin banner.',
    desc: 'Pink carnations, lilac roses and clouds of gypsophila in white wrap, with a satin banner across the top carrying any name, age or message.',
    options: ['banner', 'ribbon', 'card'] },
];

const OPTION_DEFS = {
  wrap:   { label: 'Wrap colour', type: 'swatch', values: [['Blush pink', '#f7c3cd'], ['White', '#ffffff'], ['Black', '#1f1418'], ['Ivory', '#f4ecdf']] },
  bow:    { label: 'Satin bow', type: 'swatch', values: [['Crimson', '#a3123b'], ['Blush', '#f2a7b8'], ['Black', '#1f1418'], ['Ivory', '#f4ecdf']] },
  ribbon: { label: 'Ribbon colour', type: 'swatch', values: [['Pink', '#ef93ad'], ['Crimson', '#a3123b'], ['White', '#ffffff'], ['Black', '#1f1418']] },
  lettering: { label: 'Pearl lettering', type: 'text', max: 14, optional: true, placeholder: 'e.g. Wifey, V & P, 21' },
  banner: { label: 'Banner wording', type: 'text', max: 40, placeholder: 'e.g. Happy Birthday Matthew' },
  card:   { label: 'Message card', type: 'textarea', max: 160, optional: true, placeholder: 'A few words for the card…' }
};
const CAT_LABEL = { signature: 'Signature', personalised: 'Personalised', hatbox: 'Hatboxes & balloons', gifts: 'Gifts & hampers', bridal: 'Bridal & mehndi' };
const IMG = n => `/assets/bespoke/photos/${n}.webp`;
const LOGO = '/assets/bespoke/logo.png';

/* ------------------------------ helpers ------------------------------ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const desktop = () => innerWidth > 980;
const gsap = window.gsap, ST = window.ScrollTrigger;
const motion = !reduced && !!gsap && !!ST;
if (gsap && ST) gsap.registerPlugin(ST);
if (!motion) root.classList.add(reduced ? 'no-motion' : 'no-gsap');

const money = n => '£' + (Math.round(n * 100) / 100).toFixed(n % 1 ? 2 : 0);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: lasts the visit */ } }
};
const dm = () => `https://ig.me/m/${CONFIG.instagram}`;
const wa = text => `https://wa.me/${CONFIG.whatsapp}${text ? '?text=' + encodeURIComponent(text) : ''}`;
const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const earliest = () => { const d = new Date(); d.setDate(d.getDate() + CONFIG.minDays); return isoDay(d); };
const niceDate = v => { if (!v) return ''; const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' }); };

let toastT;
function toast(msg) {
  const t = $('.toast');
  t.textContent = msg; t.classList.add('is-in');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('is-in'), 3200);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { /* ignore */ }
    ta.remove(); return ok;
  }
}

/* ------------------------------ smooth scroll ------------------------------
   Lenis drives the wheel on a mouse; touch screens keep their own native
   momentum, which is already smooth and is what people expect on a phone.
   ---------------------------------------------------------------------------- */
let lenis = null;
const HEAD = () => $('#hdr').offsetHeight;
if (!reduced && fine && typeof window.Lenis === 'function') {
  lenis = new window.Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  root.style.scrollBehavior = 'auto';
  if (motion) {
    lenis.on('scroll', ST.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
}
function scrollToEl(el) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: el.id === 'top' ? 0 : -HEAD() + 1, duration: 1.4 });
  else {
    const y = el.id === 'top' ? 0 : el.getBoundingClientRect().top + scrollY - HEAD() + 1;
    scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  if (id.length < 2) return;
  const el = $(id);
  if (!el) return;
  e.preventDefault();
  closeDrawer();
  scrollToEl(el);
});

let locks = 0;
function lock(on) {
  locks = Math.max(0, locks + (on ? 1 : -1));
  const l = locks > 0;
  document.body.classList.toggle('locked', l);
  if (lenis) l ? lenis.stop() : lenis.start();
}

/* ------------------------------ header ------------------------------ */
const hdr = $('#hdr');
let lastY = 0;
function onScrollHeader() {
  const y = scrollY;
  hdr.classList.toggle('is-solid', y > 30);
  const menuOpen = $('#drawer').classList.contains('is-open');
  if (!menuOpen && y > 500 && y > lastY + 4) hdr.classList.add('is-hidden');
  else if (y < lastY - 4 || y < 500) hdr.classList.remove('is-hidden');
  lastY = y;
  $('[data-bubble]').classList.toggle('is-in', y > innerHeight * 0.8);
}
addEventListener('scroll', onScrollHeader, { passive: true });
onScrollHeader();

const navLinks = $$('.hdr-nav a');
const io = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
['shop', 'moments', 'bridal', 'bespoke', 'reviews', 'delivery'].forEach(id => { const s = document.getElementById(id); if (s) io.observe(s); });

/* mobile drawer — its top padding is the real, measured header height */
const drawer = $('#drawer'), menuBtn = $('.menu-btn');
function sizeDrawer() { drawer.style.setProperty('--navh', hdr.offsetHeight + 'px'); }
function openDrawer() {
  sizeDrawer(); drawer.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => drawer.classList.add('is-open')));
  menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.setAttribute('aria-label', 'Close menu');
  hdr.classList.remove('is-hidden'); lock(true);
}
function closeDrawer() {
  if (!drawer.classList.contains('is-open')) return;
  drawer.classList.remove('is-open');
  menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Open menu');
  lock(false);
  setTimeout(() => { if (!drawer.classList.contains('is-open')) drawer.hidden = true; }, 800);
}
menuBtn.addEventListener('click', () => drawer.classList.contains('is-open') ? closeDrawer() : openDrawer());
addEventListener('resize', sizeDrawer);

/* contact links that depend on config */
(function contactLinks() {
  const bubble = $('[data-bubble]');
  if (CONFIG.whatsapp) {
    bubble.href = wa('Hi! I have a question about a bouquet 🌸');
    bubble.setAttribute('aria-label', 'Message on WhatsApp');
    bubble.innerHTML = '<svg><use href="#i-whatsapp"/></svg><span>WhatsApp</span>';
    const w = $('[data-wa]'); w.href = wa(''); w.hidden = false; w.target = '_blank'; w.rel = 'noopener';
  }
  if (CONFIG.email) { const m = $('[data-mail]'); m.href = 'mailto:' + CONFIG.email; m.hidden = false; }
  $$('[data-dm]').forEach(a => { a.href = dm(); });
  if (CONFIG.deliveryFee != null) $('[data-delivery-fee]').textContent = money(CONFIG.deliveryFee);
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();

/* minimum dates (5 days' notice) */
$$('input[type="date"][data-min-days]').forEach(i => { i.min = earliest(); });

/* ------------------------------ SHOP ------------------------------ */
const grid = $('#grid');
const byId = Object.fromEntries(CATALOGUE.map(p => [p.id, p]));
const ordered = CATALOGUE.slice().sort((a, b) => (b.price != null) - (a.price != null));
grid.innerHTML = ordered.map(p => `
  <article class="pcard" data-id="${p.id}" data-cats="${p.cats.join(' ')}" tabindex="0" role="button" aria-label="${esc(p.name)} — ${p.price != null ? money(p.price) : 'price on request'}">
    <div class="pcard-img" data-cursor="view">
      <img src="${IMG(p.imgs[0])}" alt="${esc(p.alt)}" loading="lazy" decoding="async">
      ${p.badge ? `<span class="pcard-badge${p.price == null ? ' soft' : ''}">${p.badge}</span>` : ''}
      <span class="pcard-cta">${p.price != null ? 'Choose options' : 'Ask for a quote'} <svg><use href="#i-arrow"/></svg></span>
    </div>
    <div class="pcard-body">
      <div><h3>${esc(p.name)}</h3><p>${esc(p.short)}</p></div>
      ${p.price != null ? `<span class="price">${money(p.price)}</span>` : '<span class="price ask">Price on<br>request</span>'}
    </div>
  </article>`).join('');

/* pictures fade up as they decode; a 4s safety net means a slow or failed
   image can never leave an invisible hole */
function arrive(img) {
  const on = () => img.classList.add('is-in');
  if (img.complete && img.naturalWidth) on();
  else { img.addEventListener('load', on, { once: true }); img.addEventListener('error', on, { once: true }); setTimeout(on, 4000); }
}
$$('.pcard-img img').forEach(arrive);

grid.addEventListener('click', e => { const c = e.target.closest('.pcard'); if (c) openProduct(c.dataset.id); });
grid.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('pcard')) { e.preventDefault(); openProduct(e.target.dataset.id); }
});

function setFilter(f) {
  $$('.filters .chip').forEach(c => { const on = c.dataset.filter === f; c.classList.toggle('is-on', on); c.setAttribute('aria-selected', on); });
  const cards = $$('.pcard', grid);
  const show = cards.filter(c => f === 'all' || c.dataset.cats.split(' ').includes(f));
  if (motion) {
    gsap.to(cards, { opacity: 0, y: 14, duration: 0.25, ease: 'power2.in', overwrite: true, onComplete() {
      cards.forEach(c => c.classList.toggle('is-out', !show.includes(c)));
      gsap.fromTo(show, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.05, overwrite: true });
      ST.refresh();
    } });
  } else cards.forEach(c => c.classList.toggle('is-out', !show.includes(c)));
}
$$('.filters .chip').forEach(c => c.addEventListener('click', () => setFilter(c.dataset.filter)));
$$('[data-goto-filter]').forEach(b => b.addEventListener('click', () => { setFilter(b.dataset.gotoFilter); scrollToEl($('#shop')); }));

/* ------------------------------ modals ------------------------------ */
const stack = [];
function openModal(el) {
  el.hidden = false;
  el._last = document.activeElement;
  stack.push(el);
  lock(true);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-open')));
  setTimeout(() => { const f = el.querySelector('.close, button, input'); if (f) f.focus({ preventScroll: true }); }, 60);
}
function closeModal(el) {
  if (!el || el.hidden || !el.classList.contains('is-open')) return;
  el.classList.remove('is-open');
  const i = stack.indexOf(el); if (i > -1) stack.splice(i, 1);
  lock(false);
  setTimeout(() => { if (!el.classList.contains('is-open')) el.hidden = true; }, 600);
  if (el._last && el._last.focus) el._last.focus({ preventScroll: true });
}
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (stack.length) closeModal(stack[stack.length - 1]);
  else closeDrawer();
});

/* ------------------------------ product sheet ------------------------------ */
const pm = $('#product');
$$('[data-close]', pm).forEach(b => b.addEventListener('click', () => closeModal(pm)));

function optionHTML(key) {
  const d = OPTION_DEFS[key];
  const lab = `<span class="og-label">${d.label}${d.optional ? '<small>optional</small>' : ''}</span>`;
  if (d.type === 'swatch') {
    return `<div class="og">${lab}<div class="o-chips">${d.values.map(([n, c], i) => `
      <label class="o-chip"><input type="radio" name="${key}" value="${n}"${i === 0 ? ' checked' : ''}><span><i style="--c:${c}"></i>${n}</span></label>`).join('')}</div></div>`;
  }
  if (d.type === 'textarea') return `<label class="field">${lab}<textarea name="${key}" rows="2" maxlength="${d.max}" placeholder="${d.placeholder}"></textarea></label>`;
  return `<label class="field">${lab}<input type="text" name="${key}" maxlength="${d.max}" placeholder="${d.placeholder}"${d.optional ? '' : ' required'}></label>`;
}

function openProduct(id) {
  const p = byId[id]; if (!p) return;
  const main = $('[data-p-img]', pm);
  main.src = IMG(p.imgs[0]); main.alt = p.alt;
  const th = $('[data-p-thumbs]', pm);
  th.innerHTML = p.imgs.length > 1 ? p.imgs.map((n, i) => `<button type="button" class="${i ? '' : 'is-on'}" data-src="${IMG(n)}" aria-label="Picture ${i + 1}"><img src="${IMG(n)}" alt=""></button>`).join('') : '';
  $$('button', th).forEach(b => b.addEventListener('click', () => {
    $$('button', th).forEach(x => x.classList.toggle('is-on', x === b));
    main.style.opacity = 0; setTimeout(() => { main.src = b.dataset.src; main.style.opacity = 1; }, 180);
  }));
  $('[data-p-cat]', pm).innerHTML = `<span class="dot"></span>${p.cats.map(c => CAT_LABEL[c]).join(' · ')}`;
  $('[data-p-title]', pm).textContent = p.name;
  const pr = $('[data-p-price]', pm);
  pr.textContent = p.price != null ? money(p.price) : 'Price on request';
  pr.classList.toggle('ask', p.price == null);
  $('[data-p-desc]', pm).textContent = p.desc;

  const form = $('[data-p-form]', pm);
  if (p.price != null) {
    form.innerHTML = (p.options || []).map(optionHTML).join('') + `
      <p class="p-note"><svg><use href="#i-petal"/></svg>Personal touches are noted on the order and confirmed with it. Seasonal flowers may be swapped for similar blooms.</p>
      <div class="p-buy">
        <div class="qty"><button type="button" data-q="-1" aria-label="One fewer"><svg><use href="#i-minus"/></svg></button><output>1</output><button type="button" data-q="1" aria-label="One more"><svg><use href="#i-plus"/></svg></button></div>
        <button type="submit" class="btn btn-satin"><svg><use href="#i-bag"/></svg><span>Add to basket · <b data-line>${money(p.price)}</b></span></button>
      </div>`;
    let q = 1;
    const out = $('output', form);
    $$('[data-q]', form).forEach(b => b.addEventListener('click', () => {
      q = Math.min(10, Math.max(1, q + Number(b.dataset.q)));
      out.textContent = q; $('[data-line]', form).textContent = money(p.price * q);
    }));
    form.onsubmit = e => {
      e.preventDefault();
      const bad = $$('[required]', form).filter(i => !i.value.trim());
      $$('.field', form).forEach(f => f.classList.remove('err'));
      if (bad.length) { bad.forEach(i => i.closest('.field').classList.add('err')); bad[0].focus(); return; }
      const opts = {};
      (p.options || []).forEach(k => {
        const el = form.elements[k];
        const v = el && (el.value || '').trim();
        if (v) opts[OPTION_DEFS[k].label] = v;
      });
      addToBasket(p.id, q, opts);
      closeModal(pm);
      setTimeout(openBasket, 350);
    };
  } else {
    form.innerHTML = `
      <p class="p-note"><svg><use href="#i-petal"/></svg>Every one of these is made to order, so the price depends on size, flowers and finishing touches. A personal quote comes straight back.</p>
      <button type="submit" class="btn btn-satin btn-wide"><span>Ask for a quote</span><svg><use href="#i-arrow"/></svg></button>`;
    form.onsubmit = e => { e.preventDefault(); closeModal(pm); setTimeout(() => prefillEnquiry(p.name), 300); };
  }
  openModal(pm);
}

/* ------------------------------ basket ------------------------------ */
let basket = store.get('tbb-basket', []).filter(l => byId[l.id] && byId[l.id].price != null);
const bk = $('#basket');
const subtotal = () => basket.reduce((s, l) => s + byId[l.id].price * l.qty, 0);
const deposit = n => Math.round(n * CONFIG.depositRate * 100) / 100;

function addToBasket(id, qty, opts) {
  const key = id + '|' + JSON.stringify(opts);
  const ex = basket.find(l => l.key === key);
  if (ex) ex.qty = Math.min(10, ex.qty + qty); else basket.push({ key, id, qty, opts });
  saveBasket();
  const b = $('.basket-btn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  toast(`${byId[id].name} added to the basket`);
}
function saveBasket() { store.set('tbb-basket', basket); renderBasket(); }
function renderBasket() {
  const count = basket.reduce((s, l) => s + l.qty, 0);
  $$('[data-count]').forEach(el => { el.textContent = count; });
  const wrap = $('[data-basket-items]', bk);
  const foot = $('[data-basket-foot]', bk);
  if (!basket.length) {
    wrap.innerHTML = `<div class="b-empty"><img src="${LOGO}" alt=""><span class="script">so empty…</span><p>Nothing in the basket yet — the bouquets are waiting.</p><a href="#shop" class="btn btn-satin" data-close-basket>Browse the shop</a></div>`;
    foot.hidden = true;
  } else {
    foot.hidden = false;
    wrap.innerHTML = basket.map((l, i) => {
      const p = byId[l.id];
      const o = Object.entries(l.opts).map(([k, v]) => `${esc(k)}: ${esc(v)}`).join('<br>');
      return `<div class="b-item"><img src="${IMG(p.imgs[0])}" alt="">
        <div><h4>${esc(p.name)}</h4>${o ? `<p class="opts">${o}</p>` : ''}
          <div class="qty"><button type="button" data-bq="${i}|-1" aria-label="One fewer"><svg><use href="#i-minus"/></svg></button><output>${l.qty}</output><button type="button" data-bq="${i}|1" aria-label="One more"><svg><use href="#i-plus"/></svg></button></div></div>
        <div><p class="b-price">${money(p.price * l.qty)}</p><button type="button" class="b-remove" data-brm="${i}">Remove</button></div></div>`;
    }).join('');
    const s = subtotal();
    $('[data-subtotal]', bk).textContent = money(s);
    $('[data-deposit]', bk).textContent = money(deposit(s));
  }
  $$('[data-close-basket]', wrap).forEach(b => b.addEventListener('click', () => closeModal(bk)));
}
$('[data-basket-items]', bk).addEventListener('click', e => {
  const q = e.target.closest('[data-bq]'), r = e.target.closest('[data-brm]');
  if (q) { const [i, d] = q.dataset.bq.split('|').map(Number); basket[i].qty = Math.min(10, Math.max(1, basket[i].qty + d)); saveBasket(); }
  if (r) { basket.splice(Number(r.dataset.brm), 1); saveBasket(); }
});
function openBasket() { renderBasket(); openModal(bk); }
$$('[data-open-basket]').forEach(b => b.addEventListener('click', openBasket));
$$('[data-close-basket]').forEach(b => b.addEventListener('click', () => closeModal(bk)));
renderBasket();

/* ------------------------------ checkout ------------------------------ */
const co = $('#checkout'), coForm = $('#coForm');
let step = 1;
$('[data-checkout]').addEventListener('click', () => {
  if (!basket.length) return;
  closeModal(bk);
  setTimeout(() => { goStep(1); renderSummary(); openModal(co); }, 300);
});
$$('[data-close-checkout]').forEach(b => b.addEventListener('click', () => {
  closeModal(co);
  if (step === 4) { goStep(1); coForm.reset(); $$('input[type="date"]', coForm).forEach(i => { i.min = earliest(); }); }
}));

function fulfil() { return coForm.elements.fulfil.value; }
function totals() {
  const sub = subtotal();
  const del = fulfil() === 'delivery' && CONFIG.deliveryFee != null ? CONFIG.deliveryFee : 0;
  const total = sub + del;
  const today = coForm.elements.amount.value === 'full' ? total : deposit(total);
  return { sub, del, total, today };
}
function renderSummary() {
  const t = totals();
  $('[data-co-lines]', co).innerHTML = basket.map(l => {
    const p = byId[l.id];
    const o = Object.values(l.opts).map(esc).join(' · ');
    return `<div class="co-line"><img src="${IMG(p.imgs[0])}" alt=""><div>${esc(p.name)}${l.qty > 1 ? ` × ${l.qty}` : ''}<small>${o}</small></div><b>${money(p.price * l.qty)}</b></div>`;
  }).join('');
  $('[data-co-sub]', co).textContent = money(t.sub);
  $('[data-co-del]', co).textContent = fulfil() === 'collection' ? 'Free' : (CONFIG.deliveryFee != null ? money(CONFIG.deliveryFee) : 'Confirmed with order');
  $('[data-co-total]', co).textContent = money(t.total);
  $('[data-co-today]', co).textContent = money(t.today);
  $('[data-amt-deposit]', co).textContent = money(deposit(t.total));
  $('[data-amt-full]', co).textContent = money(t.total);
  const next = $('[data-co-next]', co);
  const bank = coForm.elements.method.value === 'bank';
  next.querySelector('span').textContent = step === 3 ? (bank ? `Place order · ${money(t.today)} by transfer` : `Pay ${money(t.today)} securely`) : 'Continue';
}
coForm.addEventListener('input', e => {
  const f = e.target.closest('.field'); if (f) f.classList.remove('err');
  if (!$$('.field.err', co).length && e.target.name !== 'agree') $('[data-co-msg]', co).textContent = '';
});
coForm.addEventListener('change', e => {
  if (e.target.name === 'fulfil') $('[data-deliv-fields]', co).hidden = fulfil() !== 'delivery';
  renderSummary();
});
coForm.elements.postcode.addEventListener('input', e => {
  const out = $('[data-co-pc]', co), r = checkPostcode(e.target.value);
  out.className = 'pc-out ' + (r ? r.cls : ''); out.textContent = r ? r.msg : '';
});

function goStep(n) {
  step = n;
  $$('.co-step', co).forEach(s => s.classList.toggle('is-on', Number(s.dataset.step) === n));
  $$('.co-steps li', co).forEach((li, i) => { li.classList.toggle('is-on', i + 1 === n); li.classList.toggle('is-done', i + 1 < n || n === 4); });
  $('[data-co-actions]', co).hidden = n === 4;
  $('[data-co-back]', co).style.visibility = n === 1 ? 'hidden' : 'visible';
  $('[data-co-msg]', co).textContent = '';
  coForm.scrollTop = 0; $('.co-body', co).scrollTop = 0;
  renderSummary();
}
function validStep(n) {
  const sec = $(`.co-step[data-step="${n}"]`, co);
  $$('.field', sec).forEach(f => f.classList.remove('err'));
  let bad = $$('[required]', sec).filter(i => i.type !== 'checkbox' && !i.value.trim());
  if (n === 1) {
    const d = coForm.elements.date;
    if (d.value && d.value < earliest()) bad.push(d);
    if (fulfil() === 'delivery') ['address', 'postcode'].forEach(k => { if (!coForm.elements[k].value.trim()) bad.push(coForm.elements[k]); });
  }
  if (n === 2) {
    const em = coForm.elements.email;
    if (em.value && !/^\S+@\S+\.\S+$/.test(em.value)) bad.push(em);
  }
  bad = [...new Set(bad)];
  bad.forEach(i => i.closest('.field') && i.closest('.field').classList.add('err'));
  const msg = $('[data-co-msg]', co);
  if (n === 1 && coForm.elements.date.value && coForm.elements.date.value < earliest()) msg.textContent = `Orders need at least ${CONFIG.minDays} days’ notice — the earliest date is ${niceDate(earliest())}.`;
  else msg.textContent = bad.length ? 'Just a couple of details missing — they’re highlighted above.' : '';
  if (n === 3) {
    const ag = $('.agree', co);
    ag.classList.toggle('err', !coForm.elements.agree.checked);
    if (!coForm.elements.agree.checked) { msg.textContent = 'Please tick to confirm the deposit and seasonal flowers note.'; return false; }
  }
  if (bad.length) { bad[0].focus(); return false; }
  return true;
}
$('[data-co-back]', co).addEventListener('click', () => goStep(Math.max(1, step - 1)));
$('[data-co-next]', co).addEventListener('click', () => {
  if (!validStep(step)) return;
  if (step < 3) goStep(step + 1); else placeOrder();
});

function orderText(o) {
  const lines = [
    `Hi! I’d like to place an order 🌸 (ref ${o.ref})`, '',
    ...o.items.map(l => `• ${l.name}${l.qty > 1 ? ' × ' + l.qty : ''} — ${money(l.price * l.qty)}${Object.keys(l.opts).length ? '\n   ' + Object.entries(l.opts).map(([k, v]) => `${k}: ${v}`).join('\n   ') : ''}`),
    '',
    `${o.fulfil === 'delivery' ? 'Delivery' : 'Collection from B92'}: ${niceDate(o.date)}, ${o.time}`,
    o.fulfil === 'delivery' ? `Address: ${o.address}, ${o.postcode.toUpperCase()}${o.recipient ? ' (for ' + o.recipient + ')' : ''}` : '',
    o.card ? `Message card: “${o.card}”` : '',
    '',
    `Total: ${money(o.total)}${o.fulfil === 'delivery' && CONFIG.deliveryFee == null ? ' + delivery' : ''}`,
    `Paying today: ${money(o.today)} (${o.amount === 'full' ? 'in full' : '50% deposit'}) by ${{ card: 'card', paypal: 'PayPal', bank: 'bank transfer' }[o.method]}`,
    '',
    `Name: ${o.name}`, `Phone: ${o.phone}`, `Email: ${o.email}`, o.ig ? `Instagram: ${o.ig}` : '',
    o.notes ? `Notes: ${o.notes}` : ''
  ];
  return lines.filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n').trim();
}

async function sendForm(subject, message, extra) {
  if (!CONFIG.web3formsKey) return false;
  try {
    const r = await fetch('https://api.web3forms.com/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(Object.assign({ access_key: CONFIG.web3formsKey, subject, from_name: 'The Bespoke Bouquets website', message }, extra || {}))
    });
    const j = await r.json();
    return !!j.success;
  } catch (e) { return false; }
}

function handoverButtons(text, holder) {
  holder.innerHTML = '';
  const add = (html, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-satin btn-sm'; b.innerHTML = html; b.addEventListener('click', fn); holder.appendChild(b); };
  add('<svg><use href="#i-insta"/></svg><span>Copy &amp; open Instagram</span>', async () => {
    await copy(text); toast('Copied — paste it into the chat'); window.open(dm(), '_blank', 'noopener');
  });
  if (CONFIG.whatsapp) add('<svg><use href="#i-whatsapp"/></svg><span>WhatsApp</span>', () => window.open(wa(text), '_blank', 'noopener'));
  if (CONFIG.email) add('<svg><use href="#i-mail"/></svg><span>Email</span>', () => { location.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent('Bouquet enquiry')}&body=${encodeURIComponent(text)}`; });
  if (navigator.share && !fine) add('<span>Share…</span>', () => navigator.share({ text }).catch(() => {}));
  const c = document.createElement('button'); c.type = 'button'; c.className = 'btn btn-ghost btn-sm'; c.innerHTML = '<span>Copy text</span>';
  c.addEventListener('click', async () => { toast(await copy(text) ? 'Copied to the clipboard' : 'Select the text above to copy it'); });
  holder.appendChild(c);
}

async function placeOrder() {
  const f = coForm.elements, t = totals();
  const o = {
    ref: 'TBB-' + Date.now().toString(36).slice(-5).toUpperCase(),
    items: basket.map(l => ({ name: byId[l.id].name, price: byId[l.id].price, qty: l.qty, opts: l.opts })),
    fulfil: fulfil(), date: f.date.value, time: f.time.value, address: f.address.value.trim(), postcode: f.postcode.value.trim(),
    recipient: f.recipient.value.trim(), card: f.card.value.trim(), name: f.name.value.trim(), phone: f.phone.value.trim(),
    email: f.email.value.trim(), ig: f.ig.value.trim(), notes: f.notes.value.trim(),
    amount: f.amount.value, method: f.method.value, total: t.total, today: t.today
  };
  const text = orderText(o);
  const panel = $('.co-panel', co);
  const proc = document.createElement('div'); proc.className = 'processing';
  proc.innerHTML = '<div class="spinner"></div><p>Securing the order…</p>';
  panel.appendChild(proc);

  /* real payments: the endpoint makes a Stripe Checkout Session and returns its url */
  if (o.method === 'card' && CONFIG.payments.checkoutEndpoint) {
    try {
      const r = await fetch(CONFIG.payments.checkoutEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) });
      const j = await r.json();
      if (j.url) { store.set('tbb-pending', o); location.href = j.url; return; }
    } catch (e) { /* falls through to the hand-over below */ }
  }
  const sent = await sendForm(`New order ${o.ref} — ${money(o.total)}`, text, { name: o.name, email: o.email, phone: o.phone });
  await new Promise(r => setTimeout(r, 1100));
  proc.remove();

  if (o.method === 'paypal' && CONFIG.payments.paypalMe) window.open(`https://paypal.me/${CONFIG.payments.paypalMe}/${o.today}GBP`, '_blank', 'noopener');

  $('[data-ref]', co).textContent = o.ref;
  const preview = (o.method === 'card' && !CONFIG.payments.checkoutEndpoint) || (o.method === 'paypal' && !CONFIG.payments.paypalMe);
  $('[data-preview-note]', co).hidden = !preview;
  const bank = CONFIG.payments.bank;
  $('[data-done-msg]', co).textContent = o.method === 'bank'
    ? (bank ? `Please transfer ${money(o.today)} to ${bank.name}, sort code ${bank.sort}, account ${bank.account}, using ${o.ref} as the reference.` : `Bank details for the ${money(o.today)} ${o.amount === 'full' ? 'payment' : 'deposit'} follow with the order confirmation — use ${o.ref} as the reference.`)
    : `${o.fulfil === 'delivery' ? 'Delivery' : 'Collection'} on ${niceDate(o.date)}, ${o.time}. A confirmation follows with everything that happens next.`;
  const ho = $('[data-handover]', co);
  ho.hidden = sent;
  if (!sent) handoverButtons(text, $('.handover-btns', ho));
  goStep(4);              // summary is drawn from the basket, so before it empties
  basket = []; saveBasket();
}

/* ------------------------------ bespoke enquiry ------------------------------ */
const enq = $('#enquiry');
$$('[data-name="occasion"] .chip', enq).forEach(c => c.addEventListener('click', () => {
  $$('[data-name="occasion"] .chip', enq).forEach(x => x.classList.toggle('is-on', x === c && !c.classList.contains('is-on')));
}));
const swLabel = $('[data-swatch-label]', enq);
$$('.sw', enq).forEach(s => s.addEventListener('click', () => {
  s.classList.toggle('is-on');
  s.setAttribute('aria-pressed', s.classList.contains('is-on'));
  const on = $$('.sw.is-on', enq).map(x => x.title);
  swLabel.textContent = on.length ? on.join(', ') : 'Tap all that apply.';
}));
const inspo = enq.elements.inspo, thumbs = $('[data-thumbs]', enq);
inspo.addEventListener('change', () => {
  thumbs.innerHTML = '';
  Array.from(inspo.files).slice(0, 6).forEach(f => { const i = new Image(); i.src = URL.createObjectURL(f); i.alt = ''; thumbs.appendChild(i); });
});
function prefillEnquiry(name) {
  const sel = enq.elements.style;
  const match = Array.from(sel.options).find(o => name.toLowerCase().includes(o.text.toLowerCase().split(' ')[0]) && o.value !== '');
  if (/bridal|gajre/i.test(name)) sel.value = 'Bridal / mehndi florals';
  else if (match) sel.value = match.value || match.text;
  const d = enq.elements.details;
  if (!d.value.includes(name)) d.value = `Interested in: ${name}\n` + d.value;
  scrollToEl($('#bespoke'));
  setTimeout(() => d.focus({ preventScroll: true }), 900);
}
$$('[data-enquire]').forEach(b => b.addEventListener('click', () => prefillEnquiry(b.dataset.enquire)));
/* the portfolio page sends people here as ?enquire=<design name>#bespoke */
(function fromPortfolio() {
  const want = new URLSearchParams(location.search).get('enquire');
  if (!want) return;
  history.replaceState(null, '', location.pathname + '#bespoke');
  setTimeout(() => prefillEnquiry(want.slice(0, 80)), motion ? 2600 : 300);
})();

const ho = $('#handoff');
$$('[data-close-handoff]', ho).forEach(b => b.addEventListener('click', () => closeModal(ho)));

enq.addEventListener('input', e => { const f = e.target.closest('.field'); if (f) f.classList.remove('err'); });
enq.addEventListener('submit', async e => {
  e.preventDefault();
  if (enq.elements.botcheck.checked) return;
  const f = enq.elements, msg = $('.form-msg', enq);
  $$('.field', enq).forEach(x => x.classList.remove('err'));
  const bad = ['details', 'name', 'contact', 'date'].map(k => f[k]).filter(i => !i.value.trim() || (i.type === 'date' && i.value < earliest()));
  if (bad.length) {
    bad.forEach(i => i.closest('.field').classList.add('err'));
    msg.textContent = f.date.value && f.date.value < earliest() ? `Orders need at least ${CONFIG.minDays} days’ notice — the earliest date is ${niceDate(earliest())}.` : 'Just a couple of details missing — they’re highlighted above.';
    bad[0].focus(); return;
  }
  const occ = $('[data-name="occasion"] .chip.is-on', enq);
  const cols = $$('.sw.is-on', enq).map(x => x.title);
  const pics = inspo.files.length;
  const text = [
    'Hi! I’d love a bespoke bouquet 🌸', '',
    occ ? `Occasion: ${occ.textContent}` : '',
    f.style.value ? `Design idea: ${f.style.value}` : '',
    cols.length ? `Colours: ${cols.join(', ')}` : '',
    f.budget.value ? `Budget: ${f.budget.value}` : '',
    `Date needed: ${niceDate(f.date.value)}`,
    `${f.fulfil.value}`,
    f.lettering.value ? `Wording: ${f.lettering.value}` : '',
    '', f.details.value.trim(), '',
    pics ? `I have ${pics} inspiration picture${pics > 1 ? 's' : ''} to send over.` : '',
    `— ${f.name.value.trim()} (${f.contact.value.trim()})`
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n').trim();

  const btn = $('button[type="submit"]', enq);
  btn.disabled = true;
  const sent = await sendForm(`Bespoke enquiry — ${f.name.value.trim()}`, text, { name: f.name.value.trim(), contact: f.contact.value.trim() });
  btn.disabled = false;
  if (sent) {
    msg.textContent = 'Thank you! The enquiry is in — a personal quote is on its way.' + (pics ? ' Inspiration pictures can be sent over on Instagram too.' : '');
    enq.reset(); thumbs.innerHTML = ''; $$('.is-on', enq).forEach(x => x.classList.remove('is-on')); swLabel.textContent = 'Tap all that apply.';
  } else {
    msg.textContent = '';
    $('[data-ho-text]', ho).textContent = text;
    handoverButtons(text, $('[data-ho-btns]', ho));
    openModal(ho);
  }
});

/* ------------------------------ postcode checker ------------------------------ */
function checkPostcode(v) {
  const s = (v || '').toUpperCase().replace(/\s+/g, '');
  if (s.length < 2) return null;
  const m = s.match(/^([A-Z]{1,2})(\d{1,2})/);
  if (!m) return { cls: 'maybe', msg: 'That doesn’t look like a postcode yet.' };
  const area = m[1], d = Number(m[2]);
  if (area === 'B' && ((d >= 1 && d <= 48) || (d >= 72 && d <= 76) || (d >= 90 && d <= 94)))
    return { cls: 'ok', msg: '✓ Good news — that’s within the local delivery area.' };
  if (area === 'B' || area === 'CV' || area === 'WS' || area === 'DY' || area === 'WV')
    return { cls: 'maybe', msg: 'Just outside the usual area — send a message to check.' };
  return { cls: 'no', msg: 'That’s outside the delivery area, but collection from B92 is always an option.' };
}
$('#pcForm').addEventListener('submit', e => {
  e.preventDefault();
  const out = $('.pc-out', e.target.closest('.deliv')), r = checkPostcode(e.target.elements.pc.value);
  out.className = 'pc-out ' + (r ? r.cls : 'maybe');
  out.textContent = r ? r.msg : 'Pop a postcode in first.';
});

/* ------------------------------ reviews ------------------------------ */
(function reviews() {
  const rail = $('#reviewRail');
  rail.innerHTML = REVIEWS.items.map(r => `
    <article class="review">${REVIEWS.sample ? '<span class="ex">Example</span>' : ''}
      <span class="stars" aria-label="5 stars">${'<svg><use href="#i-star"/></svg>'.repeat(5)}</span>
      <blockquote>${esc(r.text)}</blockquote>
      <footer><span class="av">${esc(r.name[0])}</span><span class="who"><b>${esc(r.name)}</b><small>${esc(r.about)}</small></span></footer>
    </article>`).join('');
  $('[data-sample-note]').hidden = !REVIEWS.sample;
  const g = CONFIG.google;
  if (g.rating) $('[data-g-rating]').textContent = Number(g.rating).toFixed(1);
  $('[data-g-sub]').textContent = g.count ? `${g.count} reviews on Google` : (REVIEWS.sample ? 'Example · Reviews on Google' : 'Reviews on Google');
  const w = $('[data-g-write]');
  if (g.write || g.profile) w.href = g.write || g.profile; else w.hidden = true;
})();

/* rails: grab-and-throw on a mouse, native swipe on touch, eased arrows */
$$('[data-rail]').forEach(rail => {
  const wrap = rail.closest('.rail-wrap');
  const stepW = () => { const c = rail.firstElementChild; return c ? c.offsetWidth + 19 : 300; };
  let anim;
  const glide = to => {
    cancelAnimationFrame(anim);
    const from = rail.scrollLeft, dist = to - from, t0 = performance.now(), dur = 650;
    rail.style.scrollSnapType = 'none';
    const tick = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      rail.scrollLeft = from + dist * e;
      if (k < 1) anim = requestAnimationFrame(tick); else rail.style.scrollSnapType = '';
    };
    anim = requestAnimationFrame(tick);
  };
  $('[data-rail-prev]', wrap).addEventListener('click', () => glide(rail.scrollLeft - stepW()));
  $('[data-rail-next]', wrap).addEventListener('click', () => glide(rail.scrollLeft + stepW()));
  rail.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); glide(rail.scrollLeft + stepW()); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); glide(rail.scrollLeft - stepW()); }
  });
  let down = false, sx = 0, sl = 0, moved = 0, v = 0, lx = 0, lt = 0;
  rail.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') return;
    down = true; moved = 0; sx = lx = e.clientX; sl = rail.scrollLeft; lt = performance.now(); v = 0;
    cancelAnimationFrame(anim);
  });
  addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
    if (moved > 4) rail.classList.add('is-drag');
    rail.scrollLeft = sl - dx;
    const now = performance.now(); v = (e.clientX - lx) / Math.max(1, now - lt); lx = e.clientX; lt = now;
  });
  addEventListener('pointerup', () => {
    if (!down) return; down = false;
    rail.classList.remove('is-drag');
    if (moved > 4) {
      const target = rail.scrollLeft - v * 320, w = stepW();
      glide(Math.round(target / w) * w);
    }
  });
});

/* ------------------------------ FAQ: smooth open/close ------------------------------ */
$$('.faq-list details').forEach(d => {
  const s = $('summary', d), body = $('div', d);
  s.addEventListener('click', e => {
    if (reduced) return;
    e.preventDefault();
    if (d.open) {
      const h = body.offsetHeight;
      body.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => { d.open = false; if (ST) ST.refresh(); };
    } else {
      d.open = true;
      const h = body.offsetHeight;
      body.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => { if (ST) ST.refresh(); };
    }
  });
});

/* ------------------------------ marquee ------------------------------
   Each word moves on its own, so no single layer is ever wider than a word.
   (Moving the whole strip makes one layer wider than iOS will paint.)
   --------------------------------------------------------------------- */
(function marquee() {
  const box = $('.marquee'), track = $('.marquee-track');
  if (!box) return;
  const run = track.innerHTML;
  let runW = 0, items = [], off = 0, last = 0, visible = true, boost = 0;
  function build() {
    track.innerHTML = run;
    runW = track.scrollWidth;
    const n = Math.max(2, Math.ceil((innerWidth * 2) / Math.max(1, runW)) + 1);
    track.innerHTML = run.repeat(n);
    items = Array.from(track.children);
  }
  build();
  addEventListener('resize', () => { build(); });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(box);
  if (lenis) lenis.on('scroll', ({ velocity }) => { boost = Math.min(240, Math.abs(velocity) * 22); });
  if (reduced) return;
  const tick = now => {
    const dt = Math.min(50, now - (last || now)); last = now;
    if (visible) {
      off = (off + (42 + boost) * dt / 1000) % runW;
      boost *= 0.92;
      const tx = `translate3d(${-off}px,0,0)`;
      for (let i = 0; i < items.length; i++) items[i].style.transform = tx;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

/* ------------------------------ falling petals ------------------------------ */
function petals(canvas) {
  const ctx = canvas.getContext('2d');
  const N = Number(canvas.dataset.petals) || 20;
  const cols = ['#f7c6cf', '#f2a7b8', '#ffe0e5', '#e98ea4', '#fff4f6', '#d9667f'];
  let w, h, dpr, list = [], on = true, raf;
  function size() {
    dpr = Math.min(2, devicePixelRatio || 1);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const make = (init) => ({
    x: Math.random() * w, y: init ? Math.random() * h : -30 - Math.random() * 80,
    s: 7 + Math.random() * 11, vy: 18 + Math.random() * 28, vx: -8 + Math.random() * 16,
    r: Math.random() * Math.PI * 2, vr: (-0.6 + Math.random() * 1.2), ph: Math.random() * 6.28,
    c: cols[(Math.random() * cols.length) | 0], a: 0.45 + Math.random() * 0.45
  });
  size(); list = Array.from({ length: N }, () => make(true));
  addEventListener('resize', size);
  new IntersectionObserver(([en]) => { on = en.isIntersecting; if (on) { last = 0; raf = requestAnimationFrame(tick); } }).observe(canvas);
  let last = 0;
  function draw(p) {
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, Math.abs(Math.cos(p.ph)) * 0.75 + 0.25);
    ctx.globalAlpha = p.a;
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.moveTo(0, -p.s);
    ctx.bezierCurveTo(p.s * 0.9, -p.s * 0.6, p.s * 0.75, p.s * 0.7, 0, p.s);
    ctx.bezierCurveTo(-p.s * 0.75, p.s * 0.7, -p.s * 0.9, -p.s * 0.6, 0, -p.s);
    ctx.fill();
    ctx.globalAlpha = p.a * 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, -p.s * 0.7); ctx.quadraticCurveTo(p.s * 0.15, 0, 0, p.s * 0.7); ctx.stroke();
    ctx.restore();
  }
  function tick(now) {
    if (!on) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    ctx.clearRect(0, 0, w, h);
    for (const p of list) {
      p.ph += dt * 1.6; p.y += p.vy * dt; p.x += (p.vx + Math.sin(p.ph) * 22) * dt; p.r += p.vr * dt;
      if (p.y > h + 30 || p.x < -40 || p.x > w + 40) Object.assign(p, make(false));
      draw(p);
    }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
}
if (!reduced) $$('canvas.petals').forEach(petals);

/* ------------------------------ hero wrap petals (SVG) ------------------------------ */
(function wrapPetals() {
  const back = $('.wrap-back'), front = $('.wrap-front');
  const petal = (len, wd) => `M0 0 C ${-wd} ${-len * 0.35}, ${-wd * 0.9} ${-len * 0.78}, 0 ${-len} C ${wd * 0.9} ${-len * 0.78}, ${wd} ${-len * 0.35}, 0 0Z`;
  const ns = 'http://www.w3.org/2000/svg';
  for (let i = 0; i < 12; i++) {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', petal(262 + (i % 3) * 14, 64));
    p.setAttribute('fill', 'url(#wrapA)'); p.setAttribute('opacity', '.55');
    p.setAttribute('transform', `rotate(${i * 30 + 6})`);
    back.appendChild(p);
  }
  for (let i = 0; i < 10; i++) {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', petal(212 + (i % 2) * 18, 58));
    p.setAttribute('fill', 'url(#wrapB)'); p.setAttribute('opacity', '.85');
    p.setAttribute('stroke', 'rgba(255,255,255,.7)'); p.setAttribute('stroke-width', '1');
    p.setAttribute('transform', `rotate(${i * 36 + 20})`);
    front.appendChild(p);
  }
})();

/* ribbons are drawn at their real pixel size, so the stroke never stretches */
function ribbonPath(svg, fn) {
  const path = $('path', svg);
  const set = () => {
    const w = svg.clientWidth, h = svg.clientHeight;
    if (!w || !h) return;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    path.setAttribute('d', fn(w, h));
    path.setAttribute('pathLength', '1');
  };
  set(); addEventListener('resize', set);
  if (window.ResizeObserver) new ResizeObserver(set).observe(svg);
  return path;
}
const heroRibbon = ribbonPath($('.hero-ribbon'), (w, h) => `M -40 ${h * 0.96} C ${w * 0.18} ${h * 1.02}, ${w * 0.36} ${h * 0.88}, ${w * 0.55} ${h * 0.5} S ${w * 0.82} ${h * 0.02}, ${w + 40} ${h * 0.34}`);
const stepsRibbon = ribbonPath($('.steps-ribbon'), (w, h) => {
  let d = `M ${w / 2} 0`; const seg = 5;
  for (let i = 0; i < seg; i++) {
    const y0 = h * i / seg, y1 = h * (i + 1) / seg, dx = i % 2 ? -w * 0.42 : w * 0.42;
    d += ` C ${w / 2 + dx} ${y0 + (y1 - y0) * 0.33}, ${w / 2 + dx} ${y0 + (y1 - y0) * 0.66}, ${w / 2} ${y1}`;
  }
  return d;
});

/* ------------------------------ cursor + magnetic + tilt ------------------------------ */
if (fine && !reduced) {
  const cur = $('.cursor'), dot = $('.cursor-dot'), ring = $('.cursor-ring');
  let mx = -100, my = -100, rx = -100, ry = -100;
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
    const t = e.target;
    cur.classList.toggle('is-view', !!t.closest('[data-cursor="view"]'));
    cur.classList.toggle('is-link', !t.closest('[data-cursor="view"]') && !!t.closest('a,button,label,.chip,select,input,textarea,summary'));
  }, { passive: true });
  document.addEventListener('mouseleave', () => cur.classList.add('is-hidden'));
  document.addEventListener('mouseenter', () => cur.classList.remove('is-hidden'));
  (function loop() { rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18; ring.style.transform = `translate3d(${rx}px,${ry}px,0)`; requestAnimationFrame(loop); })();

  if (gsap) $$('.magnetic').forEach(b => {
    const xTo = gsap.quickTo(b, 'x', { duration: 0.6, ease: 'power3' }), yTo = gsap.quickTo(b, 'y', { duration: 0.6, ease: 'power3' });
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * 0.25); yTo((e.clientY - r.top - r.height / 2) * 0.35); });
    b.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
  $$('[data-tilt]').forEach(c => {
    const img = $('.detail-img', c);
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      img.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
    });
    c.addEventListener('pointerleave', () => { img.style.transform = ''; });
  });
}

/* ------------------------------ INTRO + MOTION ------------------------------ */
const intro = $('#intro');
function hideIntro() { if (intro) intro.remove(); }

if (!motion) {
  hideIntro();
  if (!reduced) {
    // GSAP did not load: everything is simply there, nothing is hidden
    $$('.statement-text').forEach(el => { el.style.opacity = 1; });
  }
  splitWords();
  $$('.statement-text .w').forEach(w => { w.style.opacity = 1; });
} else {
  splitWords();
  runMotion();
}

function splitWords() {
  $$('.statement-text').forEach(el => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  });
  if (!motion) return;
  $$('[data-split]').forEach(el => {
    const walk = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(' '));
            else { const w = document.createElement('span'); w.className = 'w'; w.innerHTML = `<span>${esc(part)}</span>`; frag.appendChild(w); }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
  });
}

function runMotion() {
  /* ---------- intro: a fixed beat, not a wait for load ---------- */
  const seen = (() => { try { return sessionStorage.getItem('tbb-intro'); } catch (e) { return null; } })();
  try { sessionStorage.setItem('tbb-intro', '1'); } catch (e) { /* ignore */ }
  const MIN = seen ? 500 : 1900, t0 = performance.now();
  const heroArch = $('.hero-arch');
  gsap.set('.hero-wrap', { xPercent: -50, yPercent: -50, x: 0, y: 0 });
  gsap.set('.hero-mirror', { xPercent: -62, yPercent: -50, x: 0, y: 0 });
  gsap.set('.hero-title .ln > span', { yPercent: 112 });
  gsap.set(['.hero .eyebrow', '.hero-sub', '.hero-cta', '.hero-facts'], { opacity: 0, y: 24 });
  gsap.set(heroArch, { opacity: 0, y: 70, scale: 0.94 });
  gsap.set('.hero-mirror', { opacity: 0, scale: 0.85 });
  gsap.set('.hero-wrap path', { scale: 0.15, opacity: 0, svgOrigin: '0 0' });
  gsap.set('.hero-tag', { opacity: 0, y: 18, scale: 0.9 });
  gsap.set(heroRibbon, { strokeDasharray: 1, strokeDashoffset: 1 });

  if (intro) {
    gsap.to('.intro-ring circle', { strokeDashoffset: 0, duration: seen ? 0.5 : 1.4, ease: 'power2.inOut' });
    gsap.fromTo('.intro-badge img', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.9, ease: 'expo.out' });
    gsap.to('.intro-line', { opacity: 1, duration: 0.8, delay: 0.5 });
  }
  let done = false;
  const finish = () => {
    if (done) return; done = true;
    const tl = gsap.timeline();
    if (intro) tl.to(intro, { yPercent: -100, duration: 1, ease: 'power4.inOut', onComplete: hideIntro });
    tl.add(heroIn(), intro ? '-=0.45' : 0);
  };
  const wait = Math.max(0, MIN - (performance.now() - t0));
  setTimeout(finish, wait);
  setTimeout(finish, 4600);

  function heroIn() {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.hero-title .ln > span', { yPercent: 0, duration: 1.4, stagger: 0.1 }, 0)
      .to('.hero .eyebrow', { opacity: 1, y: 0, duration: 1 }, 0.1)
      .to(['.hero-sub', '.hero-cta', '.hero-facts'], { opacity: 1, y: 0, duration: 1.1, stagger: 0.1 }, 0.35)
      .to('.hero-mirror', { opacity: 1, scale: 1, duration: 1.8 }, 0.1)
      .to('.hero-wrap .wrap-back path', { scale: 1, opacity: 0.55, duration: 1.8, stagger: { each: 0.035, from: 'random' } }, 0.15)
      .to('.hero-wrap .wrap-front path', { scale: 1, opacity: 0.85, duration: 1.6, stagger: { each: 0.04, from: 'random' } }, 0.3)
      .to(heroArch, { opacity: 1, y: 0, scale: 1, duration: 1.6 }, 0.25)
      .to('.hero-tag', { opacity: 1, y: 0, scale: 1, duration: 1, stagger: 0.15, ease: 'back.out(1.6)' }, 0.9)
      .to(heroRibbon, { strokeDashoffset: 0, duration: 2.2, ease: 'power2.inOut' }, 0.3)
      .add(() => { gsap.to('.tag-a', { y: -10, duration: 2.6, yoyo: true, repeat: -1, ease: 'sine.inOut' }); gsap.to('.tag-b', { y: 9, duration: 3.1, yoyo: true, repeat: -1, ease: 'sine.inOut' }); });
    return tl;
  }

  const mm = gsap.matchMedia();

  /* ---------- hero: the arch opens up to fill the screen (desktop) ---------- */
  mm.add('(min-width: 981px)', () => {
    const hero = $('.hero'), arch = $('.hero-arch'), visual = $('.hero-visual');
    const ph = document.createElement('div');
    ph.className = 'hero-arch'; ph.style.visibility = 'hidden'; ph.setAttribute('aria-hidden', 'true');
    visual.insertBefore(ph, arch);
    hero.appendChild(arch);
    arch.style.position = 'absolute'; arch.style.margin = '0'; arch.style.zIndex = '4';
    const shade = document.createElement('div');
    shade.style.cssText = 'position:absolute;inset:0;background:linear-gradient(180deg,rgba(46,10,20,.15),rgba(46,10,20,.55));opacity:0;pointer-events:none';
    arch.appendChild(shade);
    const home = () => { const h = hero.getBoundingClientRect(), p = ph.getBoundingClientRect(); return { left: p.left - h.left, top: p.top - h.top, width: p.width, height: p.height }; };
    const place = () => gsap.set(arch, home());
    place();
    const tl = gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: '+=120%', pin: true, scrub: 0.8, invalidateOnRefresh: true, onRefreshInit: () => { gsap.set(arch, { clearProps: 'left,top,width,height,borderRadius' }); place(); } }
    });
    tl.to('.hero-copy', { y: -120, opacity: 0, ease: 'none', duration: 0.45 }, 0)
      .to('.hero-tag', { autoAlpha: 0, ease: 'none', duration: 0.3 }, 0)
      .to('.hero-wrap', { scale: 1.9, rotate: 28, opacity: 0, ease: 'none', duration: 0.7 }, 0)
      .to('.hero-mirror', { scale: 1.5, opacity: 0, ease: 'none', duration: 0.6 }, 0)
      .to('.hero-ribbon', { opacity: 0, y: 60, ease: 'none', duration: 0.4 }, 0)
      .to('.scroll-cue', { opacity: 0, duration: 0.1 }, 0)
      .fromTo(arch, { left: () => home().left, top: () => home().top, width: () => home().width, height: () => home().height, borderRadius: '400px 400px 26px 26px' },
        { left: 0, top: 0, width: () => hero.clientWidth, height: () => innerHeight, borderRadius: '0px 0px 0px 0px', ease: 'power2.inOut', duration: 0.85 }, 0.05)
      .fromTo($('img', arch), { scale: 1 }, { scale: 1.08, ease: 'none', duration: 1 }, 0)
      .to(shade, { opacity: 1, ease: 'none', duration: 0.35 }, 0.6)
      .fromTo('.hero-reveal-copy', { opacity: 0, y: 40 }, { opacity: 1, y: 0, ease: 'power2.out', duration: 0.3 }, 0.68);
    return () => {
      visual.insertBefore(arch, ph); ph.remove(); shade.remove();
      arch.style.position = arch.style.margin = arch.style.zIndex = '';
      gsap.set(arch, { clearProps: 'left,top,width,height,borderRadius' });
    };
  });

  /* ---------- occasions: horizontal ride on desktop ----------
     Pins are created first, in page order, so every trigger below them
     is measured with their extra scroll length already in place. */
  mm.add('(min-width: 981px)', () => {
    const track = $('.moments-track');
    const dist = () => Math.max(0, track.scrollWidth - (innerWidth - track.getBoundingClientRect().left) + 40);
    const tween = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.moments', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true } });
    $$('.moment figure img').forEach(img => gsap.fromTo(img, { xPercent: -5 }, { xPercent: 5, ease: 'none', scrollTrigger: { trigger: img.closest('.moment'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } }));
  });

  /* ---------- mobile hero: gentle parallax only ---------- */
  mm.add('(max-width: 980px)', () => {
    gsap.to('.hero-wrap', { rotate: 30, scale: 1.15, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  });

  /* ---------- statement: words fill in as you read ---------- */
  gsap.to('.statement-text .w', { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.statement-text', start: 'top 80%', end: 'bottom 45%', scrub: true } });

  /* ---------- counters ---------- */
  $$('[data-count-to]').forEach(el => {
    const to = Number(el.dataset.countTo), o = { v: 0 };
    ST.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: to, duration: 2, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('en-GB'); } }) });
  });

  /* ---------- split headings ---------- */
  $$('[data-split]').forEach(h => {
    gsap.from($$('.w > span', h), { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: h, start: 'top 88%' } });
  });

  /* ---------- general reveals ----------
     Never hand GSAP a <form> directly: it has a .length, so GSAP treats it
     as a list and animates its inputs instead. Reveal a wrapper. */
  const rev = $$('.sec-head .sec-sub, .filters, .pcard, .detail, .steps li, .how-side, .bridal-copy, .bespoke-side, .form-wrap, .g-card, .ig, .deliv, .care, .faq-list details, .insta-cta, .shop-note, .stats > div, .moments-head');
  rev.forEach(el => el.setAttribute('data-reveal', ''));
  /* one trigger per element; things that arrive in the same frame share a
     small stagger so a row of cards still lands in sequence */
  let queued = 0, qFrame = 0;
  const stagger = () => { if (!qFrame) qFrame = requestAnimationFrame(() => { queued = 0; qFrame = 0; }); return Math.min(queued++, 6) * 0.08; };
  rev.forEach(el => ST.create({
    trigger: el, start: 'top 92%', once: true,
    onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', delay: stagger(), overwrite: 'auto' })
  }));

  /* ---------- product images: a soft arch wipe as they come in ---------- */
  $$('.pcard-img').forEach(el => ST.create({ trigger: el, start: 'top 94%', once: true, onEnter: () => gsap.fromTo(el, { clipPath: 'inset(18% 8% 0% 8% round 46% 46% 18px 18px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0% 0% 0px 0px)', duration: 1.4, ease: 'expo.out', clearProps: 'clipPath' }) }));

  /* ---------- how-to ribbon draws down the steps ---------- */
  gsap.set(stepsRibbon, { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.to(stepsRibbon, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 70%', end: 'bottom 60%', scrub: true } });
  $$('.step-n').forEach(n => gsap.from(n, { scale: 0, duration: 0.8, ease: 'back.out(2)', scrollTrigger: { trigger: n, start: 'top 80%' } }));

  /* ---------- parallax ---------- */
  gsap.to('.bridal-bg', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.bridal', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.bridal-stack .b1', { yPercent: 20, rotate: -10, ease: 'none', scrollTrigger: { trigger: '.bridal', start: 'top bottom', end: 'center center', scrub: true } });
  gsap.from('.bridal-stack .b2', { yPercent: 35, rotate: 12, ease: 'none', scrollTrigger: { trigger: '.bridal', start: 'top bottom', end: 'center center', scrub: true } });
  gsap.from('.bespoke-photo', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.bespoke', start: 'top bottom', end: 'bottom top', scrub: true } });
  $$('.ig img').forEach((img, i) => gsap.fromTo(img, { yPercent: -4 - (i % 3) * 2 }, { yPercent: 4 + (i % 3) * 2, scale: 1.1, ease: 'none', scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } }));
  gsap.from('.ftr-big', { yPercent: 40, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.ftr', start: 'top bottom', end: 'center bottom', scrub: true } });
  gsap.from('.cta h2', { scale: 0.92, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top 85%', end: 'center center', scrub: true } });

  /* fonts change heights; re-measure once they land */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ST.refresh());
  addEventListener('load', () => ST.refresh());
}
})();
