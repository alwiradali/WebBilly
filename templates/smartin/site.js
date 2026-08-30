/* SMARTin SCIENCE — shared site behaviour
   Nav, marquees, counters, FAQ and the booking form. One file across every
   page so a change lands everywhere at once.                              */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     CONTACT — the only thing that needs Rod's real details.
     Fill these three in and every WhatsApp button, phone link and mailto
     across the whole site updates. Leave a field empty and the links that
     depend on it quietly fall back to the booking form rather than going
     out to a dead number.
     ------------------------------------------------------------------ */
  var CONTACT = {
    whatsapp: '',                       // digits only, e.g. 447700900123
    email: 'roddymartin80@gmail.com',
    phone: ''                           // e.g. 07700 900123
  };

  /* Web3Forms access key — paste Rod's key here and the booking form starts
     delivering enquiries straight to his inbox. Free, no backend needed:
     sign up at web3forms.com with his email and copy the access key. */
  var W3F_KEY = '';

  var WA_MSG = "Hi Rod, I'd like to ask about the 4-week GCSE Science course.";

  function waHref() {
    return CONTACT.whatsapp
      ? 'https://wa.me/' + CONTACT.whatsapp + '?text=' + encodeURIComponent(WA_MSG)
      : '#booking';
  }

  function applyContact() {
    document.querySelectorAll('[data-c="wa"]').forEach(function (a) {
      a.setAttribute('href', waHref());
      if (!CONTACT.whatsapp) { a.removeAttribute('target'); a.removeAttribute('rel'); }
    });
    document.querySelectorAll('[data-c="mail"]').forEach(function (a) {
      a.setAttribute('href', CONTACT.email ? 'mailto:' + CONTACT.email : '#booking');
      if (CONTACT.email && a.dataset.fill === 'text') a.textContent = CONTACT.email;
    });
    document.querySelectorAll('[data-c="tel"]').forEach(function (a) {
      a.setAttribute('href', CONTACT.phone ? 'tel:' + CONTACT.phone.replace(/\s/g, '') : '#booking');
      if (CONTACT.phone && a.dataset.fill === 'text') a.textContent = CONTACT.phone;
    });
  }

  /* ---- nav ---- */
  function nav() {
    var b = document.getElementById('bg'), m = document.getElementById('mm');
    if (!b || !m) return;
    b.addEventListener('click', function () {
      b.classList.toggle('on'); m.classList.toggle('on');
    });
    m.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { b.classList.remove('on'); m.classList.remove('on'); }
    });
  }

  /* ---- marquee: duplicate the strapline run so the loop is seamless ---- */
  function marquees() {
    document.querySelectorAll('.mq-track').forEach(function (t) {
      t.innerHTML += t.innerHTML;
    });
  }

  /* ---- legacy .rv reveal, for anything the data-fx toolkit doesn't own ---- */
  function reveals() {
    var els = document.querySelectorAll('.rv:not(.in)');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---- stat counters ---- */
  function counters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length || !('IntersectionObserver' in window)) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var el = e.target;
        var to = parseFloat(el.dataset.count);
        var suf = el.dataset.suffix || '';
        if (reduce) { el.textContent = to + suf; return; }
        var t0 = null, dur = 1400;
        requestAnimationFrame(function step(t) {
          if (t0 === null) t0 = t;
          var p = Math.min((t - t0) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(to * eased) + suf;
          if (p < 1) requestAnimationFrame(step);
        });
      });
    }, { threshold: 0.4 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---- FAQ: only one answer open at a time ---- */
  function faq() {
    var qs = [].slice.call(document.querySelectorAll('.faq .q'));
    qs.forEach(function (q) {
      q.addEventListener('toggle', function () {
        if (!q.open) return;
        qs.forEach(function (o) { if (o !== q) o.open = false; });
      });
    });
  }

  /* ---- booking form ------------------------------------------------
     Posts to Web3Forms, a hosted form endpoint, so the site stays fully
     static with no Worker of its own. The success panel is shown ONLY on
     a confirmed success:true — never optimistically, so an enquiry can
     never be silently lost while the visitor is told it arrived.       */
  function booking() {
    var form = document.getElementById('bkForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (document.getElementById('botcheck').checked) return;

      var v = function (id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
      };
      if (!v('pname') || !v('email') || !v('year')) {
        alert('Please fill in your name, email and your child’s year group.');
        return;
      }

      var btn = form.querySelector('button[type=submit]');
      var label = btn.textContent;
      var err = document.getElementById('bkErr');
      err.classList.remove('on');

      if (!W3F_KEY) {
        console.error('[booking form] no Web3Forms access key set — see W3F_KEY in site.js');
        err.classList.add('on');
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
          from_name: 'SMARTin SCIENCE website',
          // so hitting reply answers the parent, not the form service
          replyto: v('email'),
          name: v('pname'), email: v('email'), phone: v('phone'),
          'Student': v('sname'), 'Year group': v('year'), 'Exam board': v('board'),
          'Preferred times': v('mode'), 'Where are you based': v('area'), 'Notes': v('msg')
        })
      })
        .then(function (r) { return r.json().then(function (d) { return { status: r.status, body: d }; }); })
        .then(function (res) {
          if (!res.body.success) {
            throw new Error('Web3Forms ' + res.status + ': ' + (res.body.message || 'no message'));
          }
          form.style.display = 'none';
          document.getElementById('ok').classList.add('on');
        })
        .catch(function (ex) {
          // Never claim an enquiry was sent when it was not. The visitor gets a
          // friendly fallback; the real reason goes to the console so it can
          // actually be diagnosed later.
          console.error('[booking form] enquiry not sent —', ex && ex.message ? ex.message : ex);
          btn.disabled = false;
          btn.textContent = label;
          err.classList.add('on');
        });
    });
  }


  /* ---- hero tilt -------------------------------------------------
     The hero panel and its floating element tiles sit in a real 3D
     scene. The pointer rotates that scene a few degrees, and because
     each child carries its own translateZ, the tiles part company
     from the panel as it turns — parallax you get for free from the
     geometry rather than faked with offsets.

     Pointer only: no gyro (it makes phones feel broken while you read),
     and nothing at all when the visitor prefers reduced motion.      */
  function heroTilt() {
    var el = document.getElementById('heroTilt');
    if (!el) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var stage = el.parentElement, MAX = 7, raf = 0, tx = 0, ty = 0;

    [].forEach.call(el.children, function (c) {
      var d = c.getAttribute('data-d');
      if (d) c.style.setProperty('--d', d);
    });

    function apply() {
      raf = 0;
      el.style.setProperty('--ry', tx.toFixed(2) + 'deg');
      el.style.setProperty('--rx', ty.toFixed(2) + 'deg');
    }
    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2 * MAX;
      ty = -((e.clientY - r.top) / r.height - 0.5) * 2 * MAX;
      el.classList.add('live');
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
    stage.addEventListener('pointerleave', function () {
      el.classList.remove('live');
      tx = ty = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
  }

  function init() {
    applyContact(); nav(); marquees(); reveals(); counters(); faq(); booking(); heroTilt();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
