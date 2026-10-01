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
const CAT_LABEL = { signature: 'Bouquets', personalised: 'Personalised', hatbox: 'Hatboxes & balloons', gifts: 'Gifts & hampers', bridal: 'Bridal & mehndi' };

const PIECES = [
  { img: 'hundred-roses', w: 1200, h: 1494, name: '100 Red Roses', cats: ['personalised'],
    desc: 'One hundred red roses in black, lettered in pearls — in any language.', alt: 'One hundred red roses in black wrap, lettered Wifey in pearls' },
  { img: 'pink-cloud', w: 1200, h: 1594, name: 'Pink Cloud Hand-tie', cats: ['signature'],
    desc: 'Roses and spray roses in every shade of pink, dotted with gypsophila and wrapped in soft ivory mesh.', alt: 'A full dome of pink roses and gypsophila in ivory mesh' },
  { img: 'balloon-hatbox', w: 1200, h: 1781, name: 'Balloon Hatbox', cats: ['hatbox', 'personalised'],
    desc: 'Red roses and berries in a white hatbox, crowned with a feather-filled bubble balloon personalised in gold.', alt: 'Red roses in a hatbox under a clear balloon lettered Happy Birthday Mum' },
  { img: 'milestone-250k', w: 1200, h: 1494, name: 'Milestone Bouquet', cats: ['personalised'],
    desc: 'Red and blush roses with a milestone spelled out in pearls — made for a 250K celebration.', alt: 'Red and pink roses with 250K in pearls' },
  { img: 'money-bouquet', w: 1200, h: 1493, name: 'Money Bouquet', cats: ['gifts'],
    desc: 'Bank notes folded into petals around ivory roses, framed with clouds of gypsophila.', alt: 'Bank notes folded into petals around ivory roses' },
  { img: 'bridal-gajre', w: 1200, h: 1472, name: 'Bridal Gajre', cats: ['bridal'],
    desc: 'Fresh white rose and gypsophila gajra for the bride. Photography: @shumaelaphotography.', alt: 'A white rose gajra on a bride’s wrist' },
  { img: 'midnight-blue', w: 1200, h: 1494, name: 'Midnight Blue', cats: ['signature'],
    desc: 'Royal blue and white roses edged with pearls, wrapped in black with an organza bow.', alt: 'Royal blue and white roses in black wrap' },
  { img: 'beauty-hamper', w: 1200, h: 1594, name: 'Beauty & Blooms Hamper', cats: ['gifts'],
    desc: 'A white wicker basket of roses, carnations and berries, styled around beauty favourites.', alt: 'A white wicker hamper of roses and beauty products' },
  { img: 'milestone-22', w: 1200, h: 1260, name: 'Birthday Number Bouquet', cats: ['personalised'],
    desc: 'Blush roses with a birthday age in pearls, set in a white gift bag with an organza bow.', alt: 'Pink roses with 22 in pearls' },
  { img: 'hatbox-blooms', w: 1200, h: 1716, name: 'Hatbox Blooms', cats: ['hatbox'],
    desc: 'Roses, tulips, carnations and gypsophila arranged in a round white hatbox.', alt: 'Roses, tulips and carnations in a white hatbox' },
  { img: 'initials-vp', w: 1200, h: 1378, name: 'Initials & Luxe Gift Bouquet', cats: ['personalised', 'gifts'],
    desc: 'A sea of red roses lettered with initials, beside a gift bouquet of roses, notes and beauty treats.', alt: 'Red roses lettered V and P beside a gift bouquet' },
  { img: 'valentine-reds', w: 1200, h: 1374, name: 'Classic Reds', cats: ['signature'],
    desc: 'Deep red roses and gypsophila in matte black wrap — a Valentine’s favourite.', alt: 'Red roses and gypsophila in black wrap with a Valentine’s card' },
  { img: 'autumn-pair', w: 1200, h: 1781, name: 'Seasonal Gift Bags', cats: ['signature'],
    desc: 'Autumn colour, hand-tied and standing in white gift bags with crimson satin ribbon.', alt: 'Two autumn bouquets in white gift bags' },
  { img: 'bridal-bouquet', w: 1290, h: 1587, name: 'Bridal Bouquet', cats: ['bridal'],
    desc: 'Abida’s bridal bouquet: white calla lilies, ivory carnations and blush peonies with plum clematis, magenta globe amaranth and astilbe, tied with an ivory silk ribbon.', alt: 'Bridal bouquet of white calla lilies, ivory and blush blooms and purple clematis, tied with ivory ribbon' }
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

/* ------------------------------ gallery ------------------------------ */
const grid = $('#pfGrid');
grid.innerHTML = PIECES.map((p, i) => `
  <figure class="pf-tile" data-i="${i}" data-cats="${p.cats.join(' ')}">
    <button type="button" class="pf-img" aria-label="View ${esc(p.name)}">
      <img src="${IMG(p.img)}" alt="${esc(p.alt)}" width="${p.w}" height="${p.h}" loading="${i < 6 ? 'eager' : 'lazy'}" decoding="async">
    </button>
    <figcaption><h3>${esc(p.name)}</h3><span>${p.cats.map(c => CAT_LABEL[c]).join(' · ')}</span></figcaption>
  </figure>`).join('');
$$('.pf-img img', grid).forEach(img => {
  const on = () => img.classList.add('is-in');
  if (img.complete && img.naturalWidth) on();
  else { img.addEventListener('load', on, { once: true }); img.addEventListener('error', on, { once: true }); setTimeout(on, 4000); }
});

let current = 'all';
const visible = () => $$('.pf-tile', grid).filter(t => !t.classList.contains('is-out'));
function setFilter(f, animate = true) {
  if (!CAT_LABEL[f]) f = 'all';
  current = f;
  $$('.pf-filters .chip').forEach(c => { const on = c.dataset.filter === f; c.classList.toggle('is-on', on); c.setAttribute('aria-selected', on); });
  const tiles = $$('.pf-tile', grid);
  const apply = () => {
    tiles.forEach(t => t.classList.toggle('is-out', !(f === 'all' || t.dataset.cats.split(' ').includes(f))));
    if (motion && animate) { gsap.fromTo(visible(), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.05, overwrite: true }); ST.refresh(); }
  };
  if (motion && animate) gsap.to(tiles, { opacity: 0, y: 12, duration: 0.22, ease: 'power2.in', overwrite: true, onComplete: apply });
  else apply();
}
$$('.pf-filters .chip').forEach(c => c.addEventListener('click', () => setFilter(c.dataset.filter)));

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
  if (!lb.hidden) return;              // never take a second scroll lock
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
setFilter(new URLSearchParams(location.search).get('show') || 'all', false);

})();
