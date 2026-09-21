/* SMARTin SCIENCE — the class calendar.
   ----------------------------------------------------------------------
   Rod keeps his sessions in a Google Calendar on his phone. This reads that
   calendar and draws a month grid in the site's own styling, so he never has
   to touch the website to add a class or move one.

   Parents pick a year group, see what is running for it, and tapping a
   session takes them to the enquiry form with that year already chosen.

   One direction only: the site never writes to his calendar, never books
   anything, and never asks a visitor to sign in.

   No server. His site is static files with no Worker, which also rules out
   the .ics feed — it sends no CORS headers, so a browser cannot read it.
   The API can be read with a restricted key, and singleEvents=true makes
   Google expand repeats, so "every Tuesday for four weeks" arrives as four
   dated sessions rather than a recurrence rule this would have to interpret
   itself. Getting that wrong prints the wrong day on a parent's screen.

   Naming events: put the year group in the title so it can be filtered and
   colour-coded — "Y10 Biology — Week 1", "Y9-Y11 Masterclass: Required
   Practicals". A session naming more than one year shows under each of them.
   Anything with no year still shows, under "Other sessions"; nothing Rod
   types is ever dropped for not matching a pattern.

   An all-day entry titled "Off" or "No classes" marks the day rather than
   drawing a session — otherwise a half-term entry rendered as a class at
   midnight.

   Until a calendar is configured the page keeps the wording it has today and
   nothing is fetched. A timetable that silently empties is worse than one
   that never claimed to be live.                                          */

(function (w, d) {
  'use strict';

  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                'August', 'September', 'October', 'November', 'December'];

  /* The value each year maps to in the enquiry form's own dropdown, so
     tapping a session arrives with the right one chosen. These strings are
     matched loosely against the options, not compared exactly, so rewording
     an option does not quietly break the link. */
  var YEARS = [
    { key: 'y9',  label: 'Year 9',  cls: 'y9',  test: /\b(y\s*9|year\s*9)\b/i,  pick: 'Year 9' },
    { key: 'y10', label: 'Year 10', cls: 'y10', test: /\b(y\s*10|year\s*10)\b/i, pick: 'Year 10' },
    { key: 'y11', label: 'Year 11', cls: 'y11', test: /\b(y\s*11|year\s*11)\b/i, pick: 'Year 11' }
  ];

  function ready(fn) {
    if (d.readyState !== 'loading') fn();
    else d.addEventListener('DOMContentLoaded', fn);
  }

  /* ---- the enquiry form, on whichever page carries it -----------------
     The calendar lives on /timetable and the form on the home page, so the
     year travels between them in the query string. */
  function preselectYear() {
    var m = (w.location.search || '').match(/[?&]year=([^&]+)/);
    if (!m) return;
    var want = decodeURIComponent(m[1]).toLowerCase();
    var sel = d.getElementById('year');
    if (!sel) return;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].text.toLowerCase().indexOf(want) > -1) {
        sel.selectedIndex = i;
        break;
      }
    }
  }

  /* ---- reading his titles -------------------------------------------- */

  /* Which year groups a session is for.

     A range has to be read as a range. Rod writes "Y9-Y11" everywhere on the
     site, and treating that as "Y9 and Y11" hides the session from exactly
     the parent filtering for Y10 — the middle year, and the one most likely
     to be looking. So a range is expanded to every year inside it, and
     anything else is taken as the individual years named. */
  function yearsOf(title) {
    var t = String(title || '');
    var want = {};

    var range = /\b(?:y|year)\s*(9|10|11)\s*(?:-|–|—|to|&|and)\s*(?:y|year)?\s*(9|10|11)\b/i.exec(t);
    if (range) {
      var lo = Math.min(+range[1], +range[2]), hi = Math.max(+range[1], +range[2]);
      for (var n = lo; n <= hi; n++) want['y' + n] = true;
    }

    var one = /\b(?:y|year)\s*(9|10|11)\b/gi, m;
    while ((m = one.exec(t)) !== null) want['y' + m[1]] = true;

    return YEARS.filter(function (y) { return want[y.key]; });
  }

  /* What is left once the year groups are stripped off the front — "Biology
     — Week 1" out of "Y10 Biology — Week 1". If stripping leaves nothing,
     the whole title is used rather than an empty chip. */
  function labelOf(title) {
    var s = (title || '').replace(
      /^\s*(?:y\s*\d{1,2}|year\s*\d{1,2})(?:\s*[-–—/&,]+\s*(?:y\s*\d{1,2}|year\s*\d{1,2}))*\s*[:–—-]?\s*/i, '');
    s = s.trim();
    return s || (title || '').trim() || 'Session';
  }

  function isOff(ev) {
    var st = ev.start || {};
    return !st.dateTime && !!st.date && /^\s*(off\b|no classes\b|half.term\b)/i.test(ev.summary || '');
  }

  /* Always UK time. Without the explicit zone this uses the visitor's own
     clock, so a parent abroad — or anyone whose machine is set to UTC — sees
     every class shifted. These are UK classes; the page must say the UK
     time. */
  function fmtTime(date) {
    try {
      var s = new Intl.DateTimeFormat('en-GB', {
        hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London'
      }).format(date);
      return s.replace(/:00(?=\s?[ap]m)/i, '').replace(/\s/g, '').toLowerCase();
    } catch (e) {
      return '';
    }
  }

  function ymd(date) {
    return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
  }
  function monthStart(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
  function sameMonth(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---- the calendar --------------------------------------------------- */

  function mount(root) {
    var id = (root.getAttribute('data-calendar-id') || '').trim();
    var key = (root.getAttribute('data-api-key') || '').trim();
    /* Not configured. The ordinary state until Rod makes the calendar, and it
       has to look like nothing happened. */
    if (!id || !key) return;

    var months = parseInt(root.getAttribute('data-months'), 10) || 6;
    var events = [], offDays = {}, filter = 'all', view, minMonth, maxMonth;

    function matching(key) {
      return events.filter(function (e) {
        if (key === 'all') return true;
        if (key === 'other') return !e.years.length;
        return e.years.some(function (y) { return y.key === key; });
      });
    }

    function chips() {
      var out = [{ key: 'all', label: 'Everything', cls: 'all' }];
      YEARS.forEach(function (y) { if (matching(y.key).length) out.push(y); });
      if (matching('other').length) out.push({ key: 'other', label: 'Other sessions', cls: 'gen' });
      return out;
    }

    function render() {
      var shown = matching(filter);
      var byDay = {};
      shown.forEach(function (e) { (byDay[ymd(e.start)] = byDay[ymd(e.start)] || []).push(e); });

      var html = '<div class="cal">';

      var tabs = chips();
      if (tabs.length > 1) {
        html += '<div class="cal-filters" role="tablist" aria-label="Filter by year group">';
        tabs.forEach(function (t) {
          var n = matching(t.key).length;
          html += '<button type="button" class="cal-fil ' + t.cls + (filter === t.key ? ' on' : '') +
                  '" data-level="' + t.key + '" role="tab" aria-selected="' + (filter === t.key) + '">' +
                  esc(t.label) + '<span class="cal-n">' + n + '</span></button>';
        });
        html += '</div>';
      }

      var atMin = sameMonth(view, minMonth), atMax = sameMonth(view, maxMonth);
      html += '<div class="cal-head">' +
        '<h3>' + MONTHS[view.getMonth()] + ' ' + view.getFullYear() + '</h3>' +
        '<div class="cal-nav">' +
          '<button type="button" class="cal-btn" data-go="today">Today</button>' +
          '<button type="button" class="cal-btn ico" data-go="-1"' + (atMin ? ' disabled' : '') +
            ' aria-label="Previous month">&lsaquo;</button>' +
          '<button type="button" class="cal-btn ico" data-go="1"' + (atMax ? ' disabled' : '') +
            ' aria-label="Next month">&rsaquo;</button>' +
        '</div></div>';

      html += '<div class="cal-grid">';
      DAYS.forEach(function (day) { html += '<div class="cal-dow">' + day + '</div>'; });

      var first = new Date(view.getFullYear(), view.getMonth(), 1);
      var lead = (first.getDay() + 6) % 7;                       /* Monday first */
      var count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      var today = new Date();

      for (var i = 0; i < lead; i++) html += '<div class="cal-cell out"></div>';
      for (var day = 1; day <= count; day++) {
        var date = new Date(view.getFullYear(), view.getMonth(), day);
        var list = (byDay[ymd(date)] || []).sort(function (a, b) { return a.start - b.start; });
        var off = offDays[ymd(date)];
        html += '<div class="cal-cell' + (ymd(date) === ymd(today) ? ' today' : '') +
                (list.length ? ' has' : '') + (off ? ' off' : '') + '">' +
                '<span class="cal-num">' + day + '</span>';
        if (off && !list.length) html += '<span class="cal-off">' + esc(off) + '</span>';
        list.forEach(function (e) {
          var cls = e.years.length === 1 ? e.years[0].cls : 'gen';
          var years = e.years.map(function (y) { return y.label; }).join(', ');
          html += '<button type="button" class="cal-ev ' + cls + '"' +
                  ' data-year="' + esc(e.years.length === 1 ? e.years[0].pick : '') + '"' +
                  ' title="' + esc(fmtTime(e.start) + ' · ' + e.title) + '">' +
                  '<b>' + fmtTime(e.start) + '</b><span>' + esc(e.label) + '</span></button>';
        });
        html += '</div>';
      }
      var trail = (7 - ((lead + count) % 7)) % 7;
      for (var t = 0; t < trail; t++) html += '<div class="cal-cell out"></div>';
      html += '</div>';

      var inMonth = shown.filter(function (e) { return sameMonth(e.start, view); });
      if (!inMonth.length) {
        html += '<p class="cal-none">Nothing scheduled in ' + MONTHS[view.getMonth()] +
                (filter === 'all' ? '' : ' for that year group') + '. ' +
                '<a href="index.html#booking">Send an enquiry</a> and Rod will tell you ' +
                'when the next block runs.</p>';
      } else {
        html += '<p class="cal-key">Tap a session to enquire about that group.' +
                '<span class="cal-swatch y9"></span>Year 9' +
                '<span class="cal-swatch y10"></span>Year 10' +
                '<span class="cal-swatch y11"></span>Year 11</p>';
      }

      html += '</div>';
      root.innerHTML = html;
      root.hidden = false;
      wire();
    }

    function wire() {
      [].forEach.call(root.querySelectorAll('.cal-fil'), function (b) {
        b.addEventListener('click', function () {
          filter = b.getAttribute('data-level');
          render();
        });
      });
      [].forEach.call(root.querySelectorAll('.cal-btn'), function (b) {
        b.addEventListener('click', function () {
          var go = b.getAttribute('data-go');
          if (go === 'today') view = monthStart(new Date());
          else view = new Date(view.getFullYear(), view.getMonth() + parseInt(go, 10), 1);
          if (view < minMonth) view = new Date(minMonth);
          if (view > maxMonth) view = new Date(maxMonth);
          render();
        });
      });
      [].forEach.call(root.querySelectorAll('.cal-ev'), function (b) {
        b.addEventListener('click', function () {
          var year = b.getAttribute('data-year');
          w.location.href = 'index.html' + (year ? '?year=' + encodeURIComponent(year) : '') + '#booking';
        });
      });
    }

    var now = new Date();
    var from = monthStart(now);
    var until = new Date(now.getFullYear(), now.getMonth() + months + 1, 0);
    minMonth = monthStart(now);
    maxMonth = monthStart(until);
    view = new Date(minMonth);

    var url = 'https://www.googleapis.com/calendar/v3/calendars/' +
      encodeURIComponent(id) + '/events' +
      '?key=' + encodeURIComponent(key) +
      '&timeMin=' + encodeURIComponent(from.toISOString()) +
      '&timeMax=' + encodeURIComponent(until.toISOString()) +
      '&singleEvents=true&orderBy=startTime&maxResults=250';

    /* no-store, so a browser can never serve a stale copy of the calendar and
       make it look as though Rod's edits have not taken effect */
    fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (body) {
      var items = (body && body.items) || [];
      items.forEach(function (ev) {
        /* A cancelled session is still returned, with status "cancelled".
           Printing it sends a parent to a class that is not happening. */
        if (!ev || ev.status === 'cancelled') return;
        if (isOff(ev)) {
          var od = new Date(ev.start.date + 'T00:00:00');
          if (!isNaN(od)) offDays[ymd(od)] = (ev.summary || 'Off').trim().slice(0, 18);
          return;
        }
        var st = ev.start || {};
        if (!st.dateTime) return;                  /* any other all-day entry */
        var when = new Date(st.dateTime);
        if (isNaN(when)) return;
        events.push({
          start: when,
          title: (ev.summary || 'Session').trim(),
          label: labelOf(ev.summary),
          years: yearsOf(ev.summary)
        });
      });

      if (!events.length && !Object.keys(offDays).length) {
        throw new Error('nothing in the calendar');
      }

      /* Open on the first month that has something in it. Term starts and
         holidays mean the current month is often empty while the next one is
         full, and landing on "Nothing scheduled in August" reads as a tutor
         with no classes rather than one whose term starts in September. */
      var firstWith = events.reduce(function (earliest, e) {
        return !earliest || e.start < earliest ? e.start : earliest;
      }, null);
      if (firstWith && !events.some(function (e) { return sameMonth(e.start, view); })) {
        var target = monthStart(firstWith);
        if (target >= minMonth && target <= maxMonth) view = target;
      }

      render();

      /* Only now, with real dates on screen, is the heading above them
         untrue. Changing it before the fetch would leave the page promising
         a timetable it could not produce. */
      var head = d.getElementById('dates-head');
      if (head) head.textContent = 'What is running, and when';
      var note = d.getElementById('dates-note');
      if (note) {
        note.textContent = 'These are the sessions currently in the diary. ' +
          'Group sizes and rates are set block by block — send an enquiry ' +
          'and Rod will come back to you with the detail.';
      }
    }).catch(function (e) {
      /* The page is already correct without this, so there is nothing to tell
         the visitor. The reason goes to the console to be diagnosed. */
      if (w.console && console.info) {
        console.info('[timetable] calendar not shown —', e && e.message ? e.message : e);
      }
    });
  }

  ready(function () {
    preselectYear();
    var root = d.getElementById('timetable-body');
    if (root) mount(root);
  });
})(window, document);
