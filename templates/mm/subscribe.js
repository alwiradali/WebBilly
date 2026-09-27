/* Molecular Miracles — the mailing list signup.

   Lynsey asked to start collecting parents' addresses. They go to her own
   site's /api/mm-subscribe and are stored in her own Cloudflare account; no
   third-party list service is involved and nothing about the visitor leaves
   her domain.

   The tick is not decoration. An address given while enquiring about tuition
   is given for that enquiry, and marketing to it later needs its own consent —
   so the endpoint refuses anything without consent:true, and this refuses to
   send it. Both ends check, because either one alone is a single point of
   failure for the one thing here that is a legal obligation rather than a
   preference.

   No form ever claims to have signed someone up when it has not. */
(function (w, d) {
  'use strict';

  function ready(fn) {
    if (d.readyState !== 'loading') fn();
    else d.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var forms = d.querySelectorAll('form.sub-form');

    Array.prototype.forEach.call(forms, function (form) {
      var email = form.querySelector('input[type=email]');
      var consent = form.querySelector('input[type=checkbox]');
      var pot = form.querySelector('.sub-pot');
      var btn = form.querySelector('button[type=submit]');
      var say = form.querySelector('.sub-say');

      function tell(msg, kind) {
        say.textContent = msg;
        say.className = 'sub-say' + (kind ? ' is-' + kind : '');
      }

      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (pot && pot.value) return;               /* a bot filled the trap */

        var addr = (email.value || '').trim();
        if (!addr || addr.indexOf('@') < 0) {
          tell('Please enter your email address.', 'bad');
          email.focus();
          return;
        }
        if (!consent.checked) {
          tell('Please tick the box so Lynsey knows she may email you.', 'bad');
          consent.focus();
          return;
        }

        var label = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Signing you up…';
        tell('');

        fetch('/api/mm-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: addr,
            consent: true,
            /* which page they signed up from, so she can see what works */
            source: (w.location.pathname || '/').slice(0, 60)
          })
        }).then(function (r) {
          return r.json().then(function (body) { return { ok: r.ok, body: body }; });
        }).then(function (res) {
          if (!res.ok || !res.body.ok) {
            throw new Error((res.body && res.body.error) || 'signup failed');
          }
          form.innerHTML = '';
          var p = d.createElement('p');
          p.className = 'sub-done';
          p.textContent = 'You’re on the list. Lynsey will be in touch when ' +
                          'there is something worth telling you.';
          form.appendChild(p);
        }).catch(function (e) {
          /* The visitor gets something they can act on; the reason goes to the
             console, because "something went wrong" is impossible to diagnose
             from a message weeks later. */
          if (w.console && console.info) {
            console.info('[subscribe] not signed up —', e && e.message ? e.message : e);
          }
          btn.disabled = false;
          btn.textContent = label;
          tell('That did not go through. Please try again, or email ' +
               'molecularmiracletutoring@gmail.com and Lynsey will add you.', 'bad');
        });
      });
    });
  });
})(window, document);
