/* =====================================================================
   The Bespoke Bouquets — settings and helpers shared by every page.
   Edit CONFIG here: the shop, checkout and enquiry page all read it.

   Every empty value degrades to something that still works:
   - no web3formsKey  -> orders/enquiries are handed back as a ready-written
                         message, one tap from her Instagram DMs
   - no whatsapp      -> the WhatsApp contact card stays hidden
   - no payment setup -> checkout runs in preview mode and says so
   ===================================================================== */
(() => {
'use strict';

const CONFIG = {
  instagram: 'thebespokebouquets',
  tiktok: 'thebespokebouquets_',
  whatsapp: '',            // digits with country code, e.g. '447700900123'
  email: '',               // e.g. 'hello@thebespokebouquets.co.uk'
  web3formsKey: '',        // from web3forms.com — the key IS the inbox
  depositRate: 1,          // shop orders are paid in full (owner's call); bespoke deposits are arranged by hand
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
   DELIVERY AREA — Birmingham and Solihull only.
   Postcode districts: Birmingham city B1–B38, B40, B42–B45, Sutton
   Coldfield B72–B76; Solihull B90–B94 (B36/B37 are in the list above).
   Anything else — Sandwell (B62–B71), Tamworth, Coleshill, Redditch,
   Bromsgrove, Coventry — is outside, and checkout will not let a
   delivery order through: collection from B92 is offered instead.
   -------------------------------------------------------------------- */
const AREA = new Set([]);
for (let d = 1; d <= 38; d++) AREA.add(d);
[40, 42, 43, 44, 45, 72, 73, 74, 75, 76, 90, 91, 92, 93, 94].forEach(d => AREA.add(d));
const FULL_PC = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/;

/* returns { ok, cls, msg } or null while there is nothing to check yet */
function checkPostcode(v, needFull) {
  const s = (v || '').toUpperCase().replace(/\s+/g, '');
  if (s.length < 2) return null;
  const m = s.match(/^([A-Z]{1,2})(\d{1,2})/);
  if (!m) return { ok: false, cls: 'no', msg: 'That doesn’t look like a postcode.' };
  const inArea = m[1] === 'B' && AREA.has(Number(m[2]));
  if (!inArea) return { ok: false, cls: 'no', msg: 'Sorry — delivery is only available within Birmingham & Solihull. Collection from B92 is always an option.' };
  if (needFull && !FULL_PC.test(s)) return { ok: false, cls: 'maybe', msg: 'Please enter the full postcode, e.g. B91 3AA.' };
  return { ok: true, cls: 'ok', msg: '✓ Good news — that’s within the local delivery area.' };
}

const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const earliest = () => { const d = new Date(); d.setDate(d.getDate() + CONFIG.minDays); return isoDay(d); };
const niceDate = v => { if (!v) return ''; const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' }); };
const dm = () => `https://ig.me/m/${CONFIG.instagram}`;
const wa = text => `https://wa.me/${CONFIG.whatsapp}${text ? '?text=' + encodeURIComponent(text) : ''}`;

let toastT;
function toast(msg) {
  const t = document.querySelector('.toast'); if (!t) return;
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
  const fine = matchMedia('(pointer: fine)').matches;
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

window.TBB = { CONFIG, checkPostcode, isoDay, earliest, niceDate, dm, wa, toast, copy, sendForm, handoverButtons };
})();
