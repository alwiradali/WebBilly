/* =====================================================================
   The Bespoke Bouquets — bespoke enquiry page
   Every choice is a [data-group] of buttons (single or multi select);
   the summary and the message are both built from the same read-out,
   so what the customer sees is exactly what gets sent.
   ===================================================================== */
(() => {
'use strict';
const { CONFIG, checkPostcode, earliest, niceDate, toast, sendForm, handoverButtons } = window.TBB;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const form = $('#enq'), f = form.elements;

/* ------------------------------ page chrome ------------------------------ */
let lenis = null;
if (!reduced && fine && typeof window.Lenis === 'function') {
  lenis = new window.Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
  root.style.scrollBehavior = 'auto';
  const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf);
}
let locks = 0, lockedY = 0;
function lock(on) {
  const was = locks > 0; locks = Math.max(0, locks + (on ? 1 : -1)); const l = locks > 0;
  if (l === was) return;
  if (l) { lockedY = scrollY; document.body.style.top = -lockedY + 'px'; document.body.classList.add('locked'); }
  else { document.body.classList.remove('locked'); document.body.style.top = ''; root.style.scrollBehavior = 'auto'; scrollTo(0, lockedY); if (!lenis) root.style.scrollBehavior = ''; }
  if (lenis) l ? lenis.stop() : lenis.start();
}
const hdr = $('#hdr'), drawer = $('#drawer'), menuBtn = $('.menu-btn');
addEventListener('scroll', () => hdr.classList.toggle('is-solid', scrollY > 30), { passive: true });
function toggleDrawer(open) {
  if (open) { drawer.style.setProperty('--navh', hdr.offsetHeight + 'px'); drawer.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => drawer.classList.add('is-open'))); lock(true); }
  else { if (!drawer.classList.contains('is-open')) return; drawer.classList.remove('is-open'); lock(false); setTimeout(() => { if (!drawer.classList.contains('is-open')) drawer.hidden = true; }, 400); }
  menuBtn.setAttribute('aria-expanded', String(open));
}
menuBtn.addEventListener('click', () => toggleDrawer(!drawer.classList.contains('is-open')));
try { const b = JSON.parse(localStorage.getItem('tbb-basket') || '[]'); $$('[data-count]').forEach(el => { el.textContent = b.reduce((n, l) => n + (l.qty || 0), 0); }); } catch (e) { /* private mode */ }
$$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

function openModal(el) { el.hidden = false; lock(true); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-open'))); }
function closeModal(el) { if (el.hidden) return; el.classList.remove('is-open'); lock(false); setTimeout(() => { el.hidden = true; }, 400); }
$$('.modal').forEach(m => $$('[data-close-handoff]', m).forEach(b => b.addEventListener('click', () => closeModal(m))));
document.addEventListener('keydown', e => { if (e.key === 'Escape') { $$('.modal').forEach(closeModal); toggleDrawer(false); } });

/* ------------------------------ choices ------------------------------ */
const groups = $$('[data-group]', form);
const itemsOf = g => $$('.chip, .type-card, .size-card, .sw', g);
const labelOf = b => b.dataset.value || b.title || b.textContent.trim();
groups.forEach(g => {
  const multi = g.dataset.multi === '1';
  itemsOf(g).forEach(b => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    if (!multi) itemsOf(g).forEach(x => { x.setAttribute('aria-pressed', 'false'); x.classList.remove('is-on'); });
    b.setAttribute('aria-pressed', String(on)); b.classList.toggle('is-on', on);
    if (b.dataset.reveal) { const t = document.getElementById(b.dataset.reveal); t.hidden = !on; if (on) setTimeout(() => t.querySelector('input,textarea').focus({ preventScroll: true }), 50); }
    if (g.dataset.group === 'Colours') { const v = picked(g); $('[data-sw-label]').textContent = v.length ? v.join(', ') : 'Nothing chosen yet.'; }
    render();
  }));
});
const picked = g => itemsOf(g).filter(b => b.getAttribute('aria-pressed') === 'true').map(labelOf);
const choice = name => { const g = groups.find(x => x.dataset.group === name); return g ? picked(g) : []; };
function select(name, value) {
  const g = groups.find(x => x.dataset.group === name); if (!g) return false;
  const b = itemsOf(g).find(x => labelOf(x).toLowerCase() === value.toLowerCase()); if (!b) return false;
  if (b.getAttribute('aria-pressed') !== 'true') b.click(); return true;
}

/* inspiration pictures */
const inspo = f.inspo, thumbs = $('[data-thumbs]');
inspo.addEventListener('change', () => {
  thumbs.innerHTML = '';
  Array.from(inspo.files).slice(0, 8).forEach(file => { const i = new Image(); i.src = URL.createObjectURL(file); i.alt = ''; thumbs.appendChild(i); });
  render();
});

/* ------------------------------ when & where ------------------------------ */
f.date.min = earliest();
const pcField = $('[data-pc-field]'), pcOut = $('[data-pc-out]');
function delivery() { return f.fulfil.value === 'Delivery'; }
function showPc(final) {
  if (!delivery()) { pcOut.textContent = ''; pcOut.className = 'pc-out'; return { ok: true }; }
  const r = checkPostcode(f.postcode.value, final);
  pcOut.className = 'pc-out ' + (r ? r.cls : '');
  const html = r ? esc(r.msg) + (r.cls === 'no' ? ' <button type="button" class="link-btn" data-to-collect>Switch to collection</button>' : '') : '';
  if (pcOut.dataset.html !== html) { pcOut.dataset.html = html; pcOut.innerHTML = html; }   // never rebuild mid-tap
  return r;
}
form.addEventListener('change', e => {
  if (e.target.name === 'fulfil') { pcField.hidden = !delivery(); showPc(false); }
  render();
});
f.postcode.addEventListener('input', () => { showPc(false); render(); });
f.postcode.addEventListener('blur', () => showPc(true));
pcOut.addEventListener('click', e => {
  if (!e.target.closest('[data-to-collect]')) return;
  $$('input[name="fulfil"]', form).forEach(i => { i.checked = i.value !== 'Delivery'; });
  pcField.hidden = true; showPc(false); f.postcode.closest('.field').classList.remove('err'); msg.textContent = ''; render();
});
form.addEventListener('input', e => { const fl = e.target.closest('.field'); if (fl) fl.classList.remove('err'); render(); });

/* ------------------------------ read-out ------------------------------ */
function readout() {
  const extras = choice('Extras');
  const detail = [];
  if (extras.includes('Pearl lettering') && f.letter.value.trim()) detail.push(['Lettering', f.letter.value.trim()]);
  if (extras.includes('Satin banner') && f.banner.value.trim()) detail.push(['Banner', f.banner.value.trim()]);
  if (extras.includes('Personalised balloon') && f.balloon.value.trim()) detail.push(['Balloon', f.balloon.value.trim()]);
  if (extras.includes('Message card') && f.card.value.trim()) detail.push(['Card', '“' + f.card.value.trim() + '”']);
  if (extras.includes('Money notes') && f.money.value.trim()) detail.push(['Money notes', f.money.value.trim()]);
  const rows = [
    ['Occasion', choice('Occasion').join(', ')],
    ['For', choice('For').join(', ')],
    ['Style', choice('Style').join(', ')],
    ['Size', choice('Size').join(', ')],
    ['Budget', choice('Budget').join(', ')],
    ['Colours', choice('Colours').join(', ')],
    ['Flowers', choice('Flowers').join(', ')],
    ['Wrap', choice('Wrap').join(', ')],
    ['Ribbon', choice('Ribbon').join(', ')],
    ['Extras', extras.join(', ')],
    ...detail,
    ['Inspiration', inspo.files.length ? `${inspo.files.length} picture${inspo.files.length > 1 ? 's' : ''} to send` : ''],
    ['Date', f.date.value ? niceDate(f.date.value) + (f.time.value ? ', ' + f.time.value : '') : ''],
    ['Collection / delivery', delivery() ? `Delivery${f.postcode.value.trim() ? ' to ' + f.postcode.value.trim().toUpperCase() : ''}` : 'Collection from B92'],
    ['Reply by', choice('Reply by').join(', ')]
  ];
  return rows.filter(r => r[1]);
}
const sum = $('[data-summary]'), sumEmpty = $('[data-summary-empty]');
function render() {
  const rows = readout().filter(r => r[0] !== 'Collection / delivery' || f.date.value || delivery());
  sum.innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  sumEmpty.hidden = rows.length > 0;
}

/* ------------------------------ arriving with a design in mind ------------------------------
   /bespoke-bouquets/enquire?design=<name>, from the portfolio or the shop */
(function fromLink() {
  const d = (new URLSearchParams(location.search).get('design') || '').slice(0, 80);
  if (!d) return;
  const map = [[/bridal|gajre|nikkah|wedding/i, 'Bridal bouquet'], [/balloon/i, 'Balloon bouquet'], [/hatbox/i, 'Hatbox'], [/basket/i, 'Basket'], [/hamper/i, 'Hamper'], [/money/i, 'Money bouquet'], [/100|letter|initial/i, 'Lettered roses'], [/skirt/i, 'Skirt bouquet'], [/bag/i, 'Gift bag bouquet']];
  const hit = map.find(([re]) => re.test(d));
  select('Style', hit ? hit[1] : 'Hand-tied bouquet');
  if (/gajre/i.test(d)) select('Style', 'Gajre & corsages');
  if (/nikkah/i.test(d)) select('Occasion', 'Nikkah');
  if (/bridal|wedding/i.test(d)) select('Occasion', 'Wedding');
  if (/wedding \/ nikkah florals/i.test(d)) return;
  f.idea.value = `Something like the “${d}” from the portfolio.`;
})();
render();

/* ------------------------------ send ------------------------------ */
const msg = $('[data-msg]');
form.addEventListener('submit', async e => {
  e.preventDefault();
  if (f.botcheck.checked) return;
  $$('.field', form).forEach(x => x.classList.remove('err'));
  const bad = [];
  if (!f.date.value || f.date.value < earliest()) bad.push(f.date);
  if (!f.name.value.trim()) bad.push(f.name);
  if (!f.phone.value.trim() && !f.email.value.trim()) bad.push(f.phone, f.email);
  if (f.email.value.trim() && !/^\S+@\S+\.\S+$/.test(f.email.value.trim())) bad.push(f.email);
  let text = '';
  if (delivery()) {
    const r = showPc(true);
    if (!r || !r.ok) { bad.push(f.postcode); text = r && r.cls === 'no' ? 'Delivery is only available within Birmingham & Solihull — please choose collection from B92 instead.' : 'Please enter the full delivery postcode.'; }
  }
  if (bad.length) {
    bad.forEach(i => i.closest('.field').classList.add('err'));
    msg.textContent = text || (f.date.value && f.date.value < earliest() ? `Orders need at least ${CONFIG.minDays} days’ notice — the earliest date is ${niceDate(earliest())}.` : (!f.phone.value.trim() && !f.email.value.trim() ? 'Please add a phone number or email so the quote can reach you.' : 'Just a couple of details missing — they’re highlighted.'));
    const first = bad[0]; first.closest('.enq-step').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => first.focus({ preventScroll: true }), 500);
    return;
  }
  msg.textContent = '';
  const lines = ['Hi! I’d love a bespoke bouquet 🌸', '', ...readout().map(([k, v]) => `${k}: ${v}`)];
  if (f.idea.value.trim()) lines.push('', f.idea.value.trim());
  lines.push('', `— ${f.name.value.trim()}`, [f.phone.value.trim(), f.email.value.trim(), f.ig.value.trim()].filter(Boolean).join(' · '));
  const message = lines.join('\n');
  const btns = $$('button[type="submit"]'); btns.forEach(b => { b.disabled = true; });
  const sent = await sendForm(`Bespoke enquiry — ${f.name.value.trim()}`, message, { name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim() });
  btns.forEach(b => { b.disabled = false; });
  if (sent) { openModal($('#thanks')); return; }
  const ho = $('#handoff');
  $('[data-ho-text]', ho).textContent = message;
  handoverButtons(message, $('[data-ho-btns]', ho));
  openModal(ho);
});
})();
