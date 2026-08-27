/* SMARTin SCIENCE — book UI
   ------------------------------------------------------------------
   Everything that is a tutoring website rather than a book: Rod's
   contact details, the persistent booking button, and the enquiry
   form. Kept apart from the engine so the pages, the physics and the
   business logic can each change without disturbing the others.     */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     CONTACT — the only values that need Rod's real details.
     Fill these in and every WhatsApp link and mailto across the book
     updates. Left empty, those links fall back to the booking page
     rather than pointing at a dead number.
     ------------------------------------------------------------------ */
  var CONTACT = {
    whatsapp: '',                 // digits only, e.g. 447700900123
    email: 'roddymartin80@gmail.com'
  };

  /* Web3Forms access key — paste Rod's key and enquiries land in his
     inbox. Free, no backend: sign up at web3forms.com with his email. */
  var W3F_KEY = '';

  var WA_MSG = "Hi Rod, I'd like to ask about the 4-week GCSE Science course.";

  /* ---- contact links --------------------------------------------- */

  function applyContact() {
    var wa = CONTACT.whatsapp
      ? 'https://wa.me/' + CONTACT.whatsapp + '?text=' + encodeURIComponent(WA_MSG)
      : null;

    document.querySelectorAll('[data-c="wa"]').forEach(function (a) {
      if (wa) { a.href = wa; return; }
      // no number yet: send them to the enquiry form instead of nowhere
      a.removeAttribute('target');
      a.removeAttribute('rel');
      a.setAttribute('data-goto', '8');
      a.href = '#';
    });

    document.querySelectorAll('[data-c="mail"]').forEach(function (a) {
      if (CONTACT.email) { a.href = 'mailto:' + CONTACT.email; return; }
      a.setAttribute('data-goto', '8');
      a.href = '#';
    });
  }

  /* ---- booking button --------------------------------------------
     A book is a lovely way to read, but this is a tutoring site: the
     way to book has to be reachable from any page, not only page 16.
     It hides on the booking spread itself, where it would be noise. */

  function bookingCta() {
    var cta = document.getElementById('bookcta');
    if (!cta) return;
    var root = document.documentElement;

    function sync() {
      var p = parseFloat(getComputedStyle(root).getPropertyValue('--p')) || 0;
      cta.classList.toggle('hide', p > 7.4);   // already on booking
      cta.classList.toggle('quiet', p < 0.4);  // still on the cover
    }
    window.addEventListener('scroll', sync, { passive: true });
    setInterval(sync, 400);   // the engine eases after scrolling stops
    sync();
  }

  /* ---- enquiry form -----------------------------------------------
     Posts to Web3Forms so the site stays static. The thank-you only
     appears on a confirmed success — never optimistically, so an
     enquiry can't be silently lost while the parent is told it sent. */

  function booking() {
    var form = document.getElementById('bkForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = function (id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
      };
      if (!v('pname') || !v('email') || !v('year')) {
        alert('Please add your name, email and your child’s year group.');
        return;
      }

      var btn = form.querySelector('button[type=submit]');
      var label = btn.textContent;
      var err = document.getElementById('bkErr');
      err.hidden = true;

      if (!W3F_KEY) {
        console.error('[booking] no Web3Forms key set — see W3F_KEY in book-ui.js');
        err.hidden = false;
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Sending…';

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: W3F_KEY,
          subject: 'GCSE Science enquiry — ' + v('year'),
          from_name: 'SMARTin SCIENCE',
          replyto: v('email'),
          name: v('pname'), email: v('email'),
          'Year group': v('year'), 'Exam board': v('board'),
          'Finds hardest': v('msg')
        })
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d.success) throw new Error(d.message || 'rejected');
          form.style.display = 'none';
          document.getElementById('ok').classList.add('on');
        })
        .catch(function (ex) {
          console.error('[booking] enquiry not sent —', ex && ex.message ? ex.message : ex);
          btn.disabled = false;
          btn.textContent = label;
          err.hidden = false;
        });
    });
  }

  function init() { applyContact(); bookingCta(); booking(); }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
