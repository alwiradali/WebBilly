/* SMARTin SCIENCE — the timetable, from Rod's own Google Calendar.

   He keeps class dates in a calendar on his phone; this reads it so the
   timetable page shows them instead of saying they are confirmed on enquiry.
   One way only: the site never writes to his calendar and never asks a
   visitor to sign in to anything.

   It talks to the Google Calendar API rather than the .ics feed for two
   reasons. The ics endpoint sends no CORS headers, so a browser cannot read
   it at all — it would need a server, and his site is static files with no
   Worker. And singleEvents=true makes Google expand the repeats, so a class
   that runs "every Tuesday for four weeks" arrives as four dated sessions
   rather than a recurrence rule this would have to interpret itself. Getting
   that wrong prints the wrong day on a parent's screen.

   The calendar must be public, which is why the runbook is emphatic about
   using a calendar made for this and not his own.

   Nothing here is allowed to make the page worse. If the calendar is not
   configured, or Google is slow, or the answer is empty or unexpected, the
   page keeps exactly the words it has today — a timetable that silently
   empties is worse than one that never claimed to be live. */
(function (w, d) {
  'use strict';

  var LONDON = 'Europe/London';

  function ready(fn) {
    if (d.readyState !== 'loading') fn();
    else d.addEventListener('DOMContentLoaded', fn);
  }

  function el(tag, cls, text) {
    var n = d.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* Google gives a timed event start.dateTime and an all-day event
     start.date. They format differently and an all-day event has no time to
     print, so they are kept apart from here on. */
  function whenOf(ev) {
    var s = ev.start || {}, e = ev.end || {};
    if (s.dateTime) return { at: new Date(s.dateTime), until: e.dateTime ? new Date(e.dateTime) : null, allDay: false };
    if (s.date) return { at: new Date(s.date + 'T00:00:00Z'), until: null, allDay: true };
    return null;
  }

  function fmt(date, opts) {
    try {
      opts.timeZone = LONDON;
      return new Intl.DateTimeFormat('en-GB', opts).format(date);
    } catch (err) {
      return '';
    }
  }

  /* "6:00pm", and "6pm" when it lands on the hour — how Rod writes times
     everywhere else on the site. */
  function clock(date) {
    var s = fmt(date, { hour: 'numeric', minute: '2-digit', hour12: true });
    return s.replace(/:00(?=\s?[ap]m)/i, '').replace(/\s/g, '').toLowerCase();
  }

  function render(list, events) {
    var ol = el('ol', 'gcal-list');
    var lastMonth = '';

    events.forEach(function (ev) {
      var when = whenOf(ev);
      if (!when) return;

      var month = fmt(when.at, { month: 'long', year: 'numeric' });
      if (month && month !== lastMonth) {
        lastMonth = month;
        var h = el('li', 'gcal-month');
        h.appendChild(el('span', null, month));
        ol.appendChild(h);
      }

      var li = el('li', 'gcal-item');

      var time = el('time', 'gcal-when');
      time.setAttribute('datetime', when.at.toISOString());
      time.appendChild(el('span', 'gcal-dow', fmt(when.at, { weekday: 'short' })));
      time.appendChild(el('span', 'gcal-day', fmt(when.at, { day: 'numeric' })));
      li.appendChild(time);

      var what = el('div', 'gcal-what');
      what.appendChild(el('b', null, (ev.summary || 'Session').trim()));

      var meta = el('div', 'gcal-meta');
      if (!when.allDay) {
        var t = clock(when.at) + (when.until ? '–' + clock(when.until) : '');
        meta.appendChild(el('span', 'gcal-time', t));
      } else {
        meta.appendChild(el('span', 'gcal-time', 'All day'));
      }
      if (ev.location) meta.appendChild(el('span', 'gcal-where', String(ev.location).trim()));
      what.appendChild(meta);

      li.appendChild(what);
      ol.appendChild(li);
    });

    if (!ol.querySelector('.gcal-item')) return false;   /* nothing datable */

    list.innerHTML = '';
    list.appendChild(ol);
    list.hidden = false;
    return true;
  }

  ready(function () {
    var list = d.getElementById('gcal');
    if (!list) return;

    var id = (list.getAttribute('data-calendar-id') || '').trim();
    var key = (list.getAttribute('data-api-key') || '').trim();
    /* Not configured yet. This is the ordinary state until Rod makes the
       calendar, and it must look like nothing happened. */
    if (!id || !key) return;

    var months = parseInt(list.getAttribute('data-months'), 10) || 4;
    var from = new Date();
    var to = new Date();
    to.setMonth(to.getMonth() + months);

    var url = 'https://www.googleapis.com/calendar/v3/calendars/' +
      encodeURIComponent(id) + '/events' +
      '?key=' + encodeURIComponent(key) +
      '&singleEvents=true&orderBy=startTime' +
      '&timeMin=' + encodeURIComponent(from.toISOString()) +
      '&timeMax=' + encodeURIComponent(to.toISOString()) +
      '&maxResults=50';

    fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (body) {
      var items = (body && body.items) || [];
      /* A cancelled class is still returned, with status "cancelled". Printing
         it would send a parent to a session that is not happening. */
      items = items.filter(function (ev) { return ev && ev.status !== 'cancelled'; });
      if (!items.length) throw new Error('no upcoming events');

      if (!render(list, items)) throw new Error('nothing renderable');

      /* Only now, with real dates on the screen, is the heading above them
         untrue. Changing it before the fetch would leave the page promising a
         timetable it could not produce. */
      var head = d.getElementById('dates-head');
      if (head) head.textContent = 'The next few weeks';
      var note = d.getElementById('dates-note');
      if (note) {
        note.textContent = 'These are the sessions currently in the diary. ' +
          'Group sizes and rates are set block by block — send an enquiry ' +
          'and Rod will come back to you with the detail.';
      }
    }).catch(function (e) {
      /* The page is already correct without this, so there is nothing to tell
         the visitor. The reason goes to the console so it can be diagnosed. */
      if (w.console && console.info) {
        console.info('[timetable] calendar not shown —', e && e.message ? e.message : e);
      }
    });
  });
})(window, document);
