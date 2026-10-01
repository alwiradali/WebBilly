/* =====================================================================
   The Bespoke Bouquets — portfolio page
   Her work that isn't in the shop. Every picture is her own, from her
   Instagram. "Request something like this" sends people to the bespoke
   enquiry on the main page with the design already filled in.
   To move a design into the shop, give it a price in CATALOGUE in
   script.js (in this folder) and take it out of PIECES here.
   ===================================================================== */
(() => {
'use strict';

const MAIN = '/bespoke-bouquets/';
const IMG = n => `/assets/bespoke/photos/${n}.webp`;
const CAT_LABEL = { red: 'Red roses', pastel: 'Pastels & whites', personalised: 'Personalised', hatbox: 'Hatboxes & baskets', gifts: 'Gifts', bridal: 'Weddings & nikkahs' };

const PIECES = [
  { img: 'red-mesh', w: 1290, h: 1605, name: 'Grand Red Roses', cats: ['red'],
    desc: 'A generous armful of red roses with hypericum berries and eucalyptus, wrapped in black mesh.', alt: 'Large bouquet of red roses with berries and eucalyptus in black mesh wrap' },
  { img: 'blush-astilbe', w: 1290, h: 1605, name: 'Blush & Ivory Hand-tie', cats: ['pastel'],
    desc: 'Blush and ivory roses with spray roses, gypsophila and pink astilbe, wrapped in ivory linen with a black ribbon.', alt: 'Blush and white roses with pink astilbe in ivory wrap, tied with black ribbon' },
  { img: 'hundred-roses', w: 1200, h: 1494, name: '100 Red Roses', cats: ['personalised'],
    desc: 'One hundred red roses in black, lettered in pearls — in any language.', alt: 'One hundred red roses in black wrap, lettered in pearls' },
  { img: 'peony-pearl', w: 1290, h: 1490, name: 'Peony & Pearl Bag', cats: ['pastel'],
    desc: 'Magenta roses, white peonies and candy-striped carnations in a pearl-edged ruffle, standing in a white gift bag.', alt: 'Pink roses, white peonies and carnations with a pearl ruffle in a white gift bag' },
  { img: 'royal-blue', w: 1290, h: 1605, name: 'Royal Blue & White', cats: ['gifts'],
    desc: 'Royal blue and white roses with gypsophila and a pearl trim, in black wrap and a black gift bag.', alt: 'Blue and white roses edged with pearls in black wrap' },
  { img: 'red-white-hatbox', w: 1290, h: 1602, name: 'Red & White Hatbox', cats: ['hatbox'],
    desc: 'Red and white roses with eucalyptus and gypsophila, arranged in a round white hatbox.', alt: 'Red and white roses with eucalyptus in a white hatbox' },
  { img: 'balloon-hatbox', w: 1200, h: 1781, name: 'Balloon Hatbox', cats: ['personalised'],
    desc: 'Red roses and berries in a white hatbox, crowned with a feather-filled bubble balloon personalised in gold.', alt: 'Red roses in a hatbox under a clear personalised balloon' },
  { img: 'white-noir', w: 1290, h: 1605, name: 'White Roses, Black Wrap', cats: ['gifts'],
    desc: 'A full dome of white roses with gypsophila, in black wrap and a black gift bag.', alt: 'White roses with gypsophila in black wrap and gift bag' },
  { img: 'milestone-250k', w: 1200, h: 1494, name: 'Milestone Bouquet', cats: ['personalised'],
    desc: 'Red and blush roses with a milestone spelled out in pearls.', alt: 'Red and pink roses with 250K in pearls' },
  { img: 'baby-girl-basket', w: 1290, h: 1605, name: 'Baby Girl Basket', cats: ['hatbox'],
    desc: 'Pink and white roses with lilac limonium in a wicker basket, finished with a pink organza bow — made for a new arrival.', alt: 'Pink and white roses with lilac limonium in a wicker basket' },
  { img: 'money-bouquet', w: 1200, h: 1493, name: 'Money Bouquet', cats: ['gifts'],
    desc: 'Bank notes folded into petals around ivory roses, framed with clouds of gypsophila.', alt: 'Bank notes folded into petals around ivory roses' },
  { img: 'red-greenery', w: 1290, h: 1605, name: 'Hand-tied Red Roses', cats: ['red'],
    desc: 'Deep red roses with pistachio greenery and gypsophila, hand-tied with a crimson ribbon.', alt: 'Hand-tied red roses with greenery and gypsophila' },
  { img: 'tulip-bag', w: 1290, h: 1473, name: 'Tulip & Rose Bag', cats: ['pastel'],
    desc: 'Pink and white tulips with roses and carnations in a pearl-edged ruffle, in a white gift bag.', alt: 'Pink and white tulips with roses in a pearl ruffle and white gift bag' },
  { img: 'bridal-bouquet', w: 1290, h: 1587, name: 'Bridal Bouquet', cats: ['bridal'],
    desc: 'Abida’s bridal bouquet: white calla lilies, ivory carnations and blush peonies with plum clematis, magenta globe amaranth and astilbe, tied with an ivory silk ribbon.', alt: 'Bridal bouquet of white calla lilies, ivory and blush blooms and purple clematis' },
  { img: 'premium-red-pair', w: 1290, h: 1605, name: 'Premium Red Pair', cats: ['red'],
    desc: 'Two premium red rose bouquets with gypsophila in pearl-edged black ruffles, each in a black gift bag.', alt: 'Two red rose bouquets in black pearl-edged ruffles and gift bags' },
  { img: 'pink-cloud', w: 1200, h: 1594, name: 'Pink Cloud Hand-tie', cats: ['pastel'],
    desc: 'Roses and spray roses in every shade of pink, dotted with gypsophila and wrapped in soft ivory mesh.', alt: 'A dome of pink roses and gypsophila in ivory mesh' },
  { img: 'beauty-hamper', w: 1200, h: 1594, name: 'Beauty & Blooms Hamper', cats: ['gifts'],
    desc: 'A white wicker basket of roses, carnations and berries, styled around beauty favourites.', alt: 'A white wicker hamper of roses and beauty products' },
  { img: 'red-cloud-black', w: 1290, h: 1605, name: 'Red Roses, Gypsophila Halo', cats: ['red'],
    desc: 'Red roses ringed with a deep halo of gypsophila and pearls, in black wrap and a black gift bag.', alt: 'Red roses ringed with gypsophila in black wrap' },
  { img: 'milestone-22', w: 1200, h: 1260, name: 'Birthday Number Bouquet', cats: ['personalised'],
    desc: 'Blush roses with a birthday age in pearls, in a white gift bag with an organza bow.', alt: 'Pink roses with 22 in pearls' },
  { img: 'hatbox-blooms', w: 1200, h: 1716, name: 'Hatbox Blooms', cats: ['hatbox'],
    desc: 'Roses, tulips, carnations and gypsophila arranged in a round white hatbox.', alt: 'Roses, tulips and carnations in a white hatbox' },
  { img: 'bridal-gajre', w: 1200, h: 1472, name: 'Bridal Gajre', cats: ['bridal'],
    desc: 'Fresh white rose and gypsophila gajra for the bride. Photography: @shumaelaphotography.', alt: 'A white rose gajra on a bride’s wrist' }
];

/* ------------------------------ helpers ------------------------------ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const gsap = null, ST = null;
const motion = false;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* basket count is shared with the shop through localStorage */
try {
  const b = JSON.parse(localStorage.getItem('tbb-basket') || '[]');
  $$('[data-count]').forEach(el => { el.textContent = b.reduce((n, l) => n + (l.qty || 0), 0); });
} catch (e) { /* private mode */ }
$$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

/* ------------------------------ smooth scroll ------------------------------ */
let lenis = null;
if (!reduced && fine && typeof window.Lenis === 'function') {
  lenis = new window.Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
  root.style.scrollBehavior = 'auto';
  if (motion) { lenis.on('scroll', ST.update); gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
  else { const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
}
let locks = 0;
let lockedY = 0;
function lock(on) {
  const was = locks > 0;
  locks = Math.max(0, locks + (on ? 1 : -1));
  const l = locks > 0;
  if (l === was) return;
  if (l) { lockedY = scrollY; document.body.style.top = -lockedY + 'px'; document.body.classList.add('locked'); }
  else { document.body.classList.remove('locked'); document.body.style.top = ''; root.style.scrollBehavior = 'auto'; scrollTo(0, lockedY); if (!lenis) root.style.scrollBehavior = ''; }
  if (lenis) l ? lenis.stop() : lenis.start();
}

/* ------------------------------ header + drawer ------------------------------ */
const hdr = $('#hdr'), drawer = $('#drawer'), menuBtn = $('.menu-btn');
let lastY = 0;
function onScroll() {
  const y = scrollY;
  hdr.classList.toggle('is-solid', y > 30);
  lastY = y;
}
addEventListener('scroll', onScroll, { passive: true }); onScroll();
function toggleDrawer(open) {
  if (open) {
    drawer.style.setProperty('--navh', hdr.offsetHeight + 'px');
    drawer.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => drawer.classList.add('is-open')));
    hdr.classList.remove('is-hidden'); lock(true);
  } else {
    if (!drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open'); lock(false);
    setTimeout(() => { if (!drawer.classList.contains('is-open')) drawer.hidden = true; }, 800);
  }
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}
menuBtn.addEventListener('click', () => toggleDrawer(!drawer.classList.contains('is-open')));

/* ------------------------------ gallery ------------------------------
   One titled section per category, in this order; every piece lives in
   exactly one. The buttons at the top jump to a section. */
const SECTIONS = [
  { key: 'red',          title: 'Red roses',          sub: 'Classic, romantic and always a favourite.' },
  { key: 'pastel',       title: 'Pastels & whites',   sub: 'Soft blush, ivory and white, with seasonal touches.' },
  { key: 'personalised', title: 'Personalised',       sub: 'Names, initials, numbers and balloons.' },
  { key: 'hatbox',       title: 'Hatboxes & baskets', sub: 'Arranged and ready to display.' },
  { key: 'gifts',        title: 'Gifts',              sub: 'Money bouquets, hampers and something a little different.' },
  { key: 'bridal',       title: 'Weddings & nikkahs', sub: 'Bridal bouquets and gajre for the big day.' }
];
const grid = $('#pfGrid');
let n = 0;
grid.innerHTML = SECTIONS.map(sec => {
  const items = PIECES.map((p, i) => ({ p, i })).filter(x => x.p.cats[0] === sec.key);
  return `<section class="pf-sec" id="pf-${sec.key}" data-sec="${sec.key}">
    <header class="pf-sec-head"><h2>${esc(sec.title)}</h2><p>${esc(sec.sub)}</p><span class="pf-count">${items.length} ${items.length === 1 ? 'piece' : 'pieces'}</span></header>
    <div class="pf-sec-grid">${items.map(({ p, i }) => `
      <figure class="pf-tile" data-i="${i}" data-sec="${sec.key}">
        <button type="button" class="pf-img" aria-label="View ${esc(p.name)}">
          <img src="${IMG(p.img)}" alt="${esc(p.alt)}" width="${p.w}" height="${p.h}" loading="${n++ < 6 ? 'eager' : 'lazy'}" decoding="async">
        </button>
        <figcaption><h3>${esc(p.name)}</h3></figcaption>
      </figure>`).join('')}</div>
  </section>`;
}).join('');
$$('.pf-img img', grid).forEach(img => {
  const on = () => img.classList.add('is-in');
  if (img.complete && img.naturalWidth) on();
  else { img.addEventListener('load', on, { once: true }); img.addEventListener('error', on, { once: true }); setTimeout(on, 4000); }
});

const bar = $('.pf-filters');
bar.innerHTML = SECTIONS.map(sec => `<a class="chip" href="#pf-${sec.key}" data-filter="${sec.key}">${esc(sec.title)} <span class="n">${PIECES.filter(p => p.cats[0] === sec.key).length}</span></a>`).join('');
function jump(key, smooth = true) {
  const el = document.getElementById('pf-' + key); if (!el) return;
  const y = el.getBoundingClientRect().top + scrollY - hdr.offsetHeight - 16;
  if (lenis && smooth) lenis.scrollTo(y, { duration: 1.2 }); else scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
}
bar.addEventListener('click', e => { const a = e.target.closest('a[data-filter]'); if (!a) return; e.preventDefault(); jump(a.dataset.filter); });
/* highlight the section in view */
const io = new IntersectionObserver(es => es.forEach(en => {
  if (!en.isIntersecting) return;
  $$('.chip', bar).forEach(c => c.classList.toggle('is-on', c.dataset.filter === en.target.dataset.sec));
}), { rootMargin: '-40% 0px -55% 0px' });
$$('.pf-sec', grid).forEach(s => io.observe(s));
let current = 'all';
/* the viewer steps through the section the picture belongs to */
const visible = () => $$(`.pf-tile[data-sec="${current}"]`, grid);
function setFilter() {}

/* ------------------------------ lightbox ------------------------------ */
const lb = $('#lb'), lbImg = $('[data-lb-img]', lb);
let idx = 0, last = null;
function show(i, dir = 0) {
  const list = visible().map(t => Number(t.dataset.i));
  const pos = (list.indexOf(i) + list.length) % list.length;
  idx = list[pos];
  const p = PIECES[idx];
  const swap = () => {
    lbImg.src = IMG(p.img); lbImg.alt = p.alt;
    $('[data-lb-cat]', lb).innerHTML = `<span class="dot"></span>${p.cats.map(c => CAT_LABEL[c]).join(' · ')}`;
    $('[data-lb-title]', lb).textContent = p.name;
    $('[data-lb-desc]', lb).textContent = p.desc;
    $('[data-lb-enquire]', lb).href = `${MAIN}?enquire=${encodeURIComponent(p.name)}#bespoke`;
    $('[data-lb-count]', lb).textContent = `${pos + 1} / ${list.length}`;
  };
  if (dir && motion) {
    gsap.to('.lb-fig', { opacity: 0, x: -30 * dir, duration: 0.2, ease: 'power2.in', onComplete() { swap(); gsap.fromTo('.lb-fig', { opacity: 0, x: 30 * dir }, { opacity: 1, x: 0, duration: 0.45, ease: 'expo.out' }); } });
  } else swap();
}
function step(d) {
  const list = visible().map(t => Number(t.dataset.i));
  show(list[(list.indexOf(idx) + d + list.length) % list.length], d);
}
function openLb(i) {
  if (!lb.hidden) return;
  current = PIECES[i].cats[0];              // never take a second scroll lock
  last = document.activeElement;
  show(i);
  lb.hidden = false; lock(true);
  requestAnimationFrame(() => requestAnimationFrame(() => lb.classList.add('is-open')));
  setTimeout(() => $('[data-lb-close]', lb).focus({ preventScroll: true }), 60);
}
function closeLb() {
  if (lb.hidden) return;
  lb.classList.remove('is-open'); lock(false);
  setTimeout(() => { if (!lb.classList.contains('is-open')) lb.hidden = true; }, 500);
  if (last) last.focus({ preventScroll: true });
}
grid.addEventListener('click', e => { const t = e.target.closest('.pf-tile'); if (t) openLb(Number(t.dataset.i)); });
$('[data-lb-close]', lb).addEventListener('click', closeLb);
$('[data-lb-prev]', lb).addEventListener('click', () => step(-1));
$('[data-lb-next]', lb).addEventListener('click', () => step(1));
lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (!lb.hidden) closeLb(); else toggleDrawer(false); }
  if (lb.hidden) return;
  if (e.key === 'ArrowRight') step(1);
  if (e.key === 'ArrowLeft') step(-1);
});
let sx = null;
lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', e => {
  if (sx == null) return;
  const dx = e.changedTouches[0].clientX - sx; sx = null;
  if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
});

/* the main page links here as ?show=<category> */
{ const want = new URLSearchParams(location.search).get('show');
  if (want && SECTIONS.some(x => x.key === want)) addEventListener('load', () => setTimeout(() => jump(want, false), 50)); }

})();
