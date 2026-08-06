/* Molecular Miracles — class timetable
   ----------------------------------------------------------------------
   Lynsey keeps her classes in a Google Calendar on her phone. This reads
   that calendar and draws a month grid in the site's own styling, so she
   never has to touch the website to change a time.

   Parents pick a course first, then see which dates and times are running
   for it. Tapping a class preselects that course on the booking form.

   No server, no database — it runs entirely in the browser, so it keeps
   working whichever host the site ends up on.

   Naming events: put the level first so it can be colour-coded, e.g.
     "Higher — 2 places left"      "National 5"      "Advanced Higher"

   SETUP is already done — the calendar and key below belong to Lynsey's own
   Google account. The key is restricted to this site's two domains and to
   the Calendar API only, which is what makes it safe in a public repo. Do
   not remove those restrictions.                                        */

(function () {
  var CONFIG = {
    calendarId: 'bef34ce678f5a10579ef6f74060abe0cacbaa9f29f84514995989f3dec11e180@group.calendar.google.com',
    apiKey: 'AIzaSyAd9k2Aa3bHjRVxIJ6WnK6jP9ER6de99dg',
    monthsAhead: 6,
    maxEvents: 250
  };

  var root = document.getElementById('timetable-body');
  if (!root) return;

  var LEVELS = [
    { key: 'all',             label: 'All classes',     cls: 'all' },
    { key: 'national 5',      label: 'National 5',      cls: 'n5', alt: ['nat 5', 'n5'] },
    { key: 'higher',          label: 'Higher',          cls: 'hi' },
    { key: 'advanced higher', label: 'Advanced Higher', cls: 'ah' }
  ];
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                'August', 'September', 'October', 'November', 'December'];

  var events = [];
  var offDays = {};      // ymd -> true, days Lynsey has marked Off
  var filter = 'all';
  var view;            // first day of the month currently shown
  var minMonth, maxMonth;

  /* Advanced Higher has to be tested before Higher, since "advanced higher"
     contains "higher" and would otherwise match the wrong level. Returns null
     for anything that is not a class — Lynsey also keeps "Off" days and the
     occasional untitled entry in this calendar, and those are not timetable
     entries a parent should see. */
  function levelOf(title) {
    var t = (title || '').toLowerCase();
    if (t.indexOf('advanced higher') > -1) return LEVELS[3];
    if (t.indexOf('national 5') > -1 || t.indexOf('nat 5') > -1 || /\bn5\b/.test(t)) return LEVELS[1];
    if (t.indexOf('higher') > -1) return LEVELS[2];
    return null;
  }

  function noteOf(title) {
    return (title || '')
      .replace(/^\s*(advanced higher|national 5|nat 5|n5|higher)\s*[—\-–:]?\s*/i, '')
      .trim();
  }

  function fmtTime(d) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  function ymd(d) {
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function monthStart(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function sameMonth(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }

  function msg(html) {
    root.innerHTML = '<div class="tt-empty">' + html + '</div>';
  }

  function visible() {
    return events.filter(function (e) {
      return filter === 'all' || e.level.key === filter;
    });
  }

  function render() {
    // With nothing in the calendar at all, a grid of empty cells above four
    // greyed-out filters reads as broken rather than as "no classes yet".
    if (!events.length) {
      msg('No classes are scheduled at the moment. ' +
          '<a href="#booking">Send an enquiry</a> and I\'ll let you know as soon as the ' +
          'next group runs, and what\'s left in it.');
      return;
    }

    var shown = visible();
    var byDay = {};
    shown.forEach(function (e) {
      (byDay[ymd(e.start)] = byDay[ymd(e.start)] || []).push(e);
    });

    var html = '<div class="cal">';

    // course filter
    html += '<div class="cal-filters" role="tablist">';
    LEVELS.forEach(function (l) {
      var n = l.key === 'all' ? events.length
            : events.filter(function (e) { return e.level.key === l.key; }).length;
      // "All classes" stays clickable even when a level filter is active
      html += '<button class="cal-fil ' + l.cls + (filter === l.key ? ' on' : '') +
              '" data-level="' + l.key + '" role="tab"' +
              (n || l.key === 'all' ? '' : ' disabled') + '>' + l.label +
              '<span class="cal-n">' + n + '</span></button>';
    });
    html += '</div>';

    // month header
    var atMin = sameMonth(view, minMonth), atMax = sameMonth(view, maxMonth);
    html += '<div class="cal-head">' +
      '<h3>' + MONTHS[view.getMonth()] + ' ' + view.getFullYear() + '</h3>' +
      '<div class="cal-nav">' +
        '<button class="cal-btn" data-go="today">Today</button>' +
        '<button class="cal-btn ico" data-go="-1"' + (atMin ? ' disabled' : '') + ' aria-label="Previous month">‹</button>' +
        '<button class="cal-btn ico" data-go="1"' + (atMax ? ' disabled' : '') + ' aria-label="Next month">›</button>' +
      '</div></div>';

    // grid
    html += '<div class="cal-grid">';
    DAYS.forEach(function (d) { html += '<div class="cal-dow">' + d + '</div>'; });

    var first = new Date(view.getFullYear(), view.getMonth(), 1);
    var lead = (first.getDay() + 6) % 7;               // Monday-first
    var days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    var today = new Date();

    for (var i = 0; i < lead; i++) html += '<div class="cal-cell out"></div>';
    for (var day = 1; day <= days; day++) {
      var date = new Date(view.getFullYear(), view.getMonth(), day);
      var list = byDay[ymd(date)] || [];
      var isToday = ymd(date) === ymd(today);
      var isOff = offDays[ymd(date)];
      html += '<div class="cal-cell' + (isToday ? ' today' : '') +
              (list.length ? ' has' : '') + (isOff ? ' off' : '') + '">' +
              '<span class="cal-num">' + day + '</span>';
      if (isOff) html += '<span class="cal-off">Off</span>';
      list.sort(function (a, b) { return a.start - b.start; }).forEach(function (e) {
        html += '<button class="cal-ev ' + e.level.cls + '" data-level="' + e.level.label + '"' +
                ' title="' + fmtTime(e.start) + ' ' + e.level.label +
                (e.note ? ' — ' + e.note : '') + '">' +
                '<b>' + fmtTime(e.start) + '</b><span>' + e.level.label + '</span></button>';
      });
      html += '</div>';
    }
    var trail = (7 - ((lead + days) % 7)) % 7;
    for (var t = 0; t < trail; t++) html += '<div class="cal-cell out"></div>';
    html += '</div>';

    // month summary, and the empty state for this particular month
    var inMonth = shown.filter(function (e) { return sameMonth(e.start, view); });
    if (!inMonth.length) {
      html += '<p class="cal-none">No ' +
        (filter === 'all' ? 'classes' : LEVELS.filter(function (l) { return l.key === filter; })[0].label + ' classes') +
        ' scheduled in ' + MONTHS[view.getMonth()] + '. ' +
        '<a href="#booking">Send an enquiry</a> and I\'ll let you know when the next group runs.</p>';
    } else {
      html += '<p class="cal-key">Tap a class to enquire about that group. ' +
              '<span class="cal-swatch n5"></span>National 5 ' +
              '<span class="cal-swatch hi"></span>Higher ' +
              '<span class="cal-swatch ah"></span>Advanced Higher</p>';
    }

    html += '</div>';
    root.innerHTML = html;
    wire();
  }

  function wire() {
    root.querySelectorAll('.cal-fil').forEach(function (b) {
      b.addEventListener('click', function () { filter = this.dataset.level; render(); });
    });
    root.querySelectorAll('.cal-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var go = this.dataset.go;
        if (go === 'today') view = monthStart(new Date());
        else view = new Date(view.getFullYear(), view.getMonth() + (+go), 1);
        if (view < minMonth) view = new Date(minMonth);
        if (view > maxMonth) view = new Date(maxMonth);
        render();
      });
    });
    // tapping a class preselects that course on the booking form
    root.querySelectorAll('.cal-ev').forEach(function (b) {
      b.addEventListener('click', function () {
        var want = this.dataset.level, sel = document.getElementById('level');
        if (sel) {
          for (var i = 0; i < sel.options.length; i++) {
            if (sel.options[i].text.indexOf(want) > -1) { sel.selectedIndex = i; break; }
          }
        }
        var bk = document.getElementById('booking');
        if (bk) bk.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  if (!CONFIG.calendarId || !CONFIG.apiKey) {
    msg('Class times for the coming term are being confirmed. ' +
        '<a href="#booking">Send an enquiry</a> and I\'ll come straight back to you with the ' +
        'days and times that are running, and what\'s left in each group.');
    return;
  }

  var now = new Date();
  var from = monthStart(now);
  var until = new Date(now.getFullYear(), now.getMonth() + CONFIG.monthsAhead + 1, 0);
  minMonth = monthStart(now);
  maxMonth = monthStart(until);
  view = new Date(minMonth);

  var url = 'https://www.googleapis.com/calendar/v3/calendars/' +
    encodeURIComponent(CONFIG.calendarId) + '/events' +
    '?key=' + encodeURIComponent(CONFIG.apiKey) +
    '&timeMin=' + from.toISOString() +
    '&timeMax=' + until.toISOString() +
    '&singleEvents=true&orderBy=startTime&maxResults=' + CONFIG.maxEvents;

  msg('Loading class times…');

  fetch(url)
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (data) {
      var parsed = (data.items || []).map(function (it) {
        var st = it.start || {};

        // All-day "Off" entries mark days Lynsey is not teaching. They are not
        // classes, so they get their own marker rather than a class chip — an
        // earlier version rendered them as "00:00 Chemistry", which read as a
        // midnight class.
        if (!st.dateTime && st.date && /^\s*off\b/i.test(it.summary || '')) {
          var od = new Date(st.date + 'T00:00:00');
          return isNaN(od) ? null : { off: true, start: od };
        }

        if (!st.dateTime) return null;          // any other all-day entry
        var d = new Date(st.dateTime);
        if (isNaN(d)) return null;
        var lv = levelOf(it.summary);
        if (!lv) return null;                   // untitled or not a class
        return { start: d, title: it.summary || '', level: lv, note: noteOf(it.summary) };
      }).filter(Boolean);

      events = parsed.filter(function (e) { return !e.off; });
      offDays = {};
      parsed.forEach(function (e) { if (e.off) offDays[ymd(e.start)] = true; });
      render();
    })
    .catch(function () {
      // Never leave a broken-looking section — fall back to the enquiry route.
      msg('Class times are being confirmed. ' +
          '<a href="#booking">Send an enquiry</a> and I\'ll come back to you with the current ' +
          'days, times and availability.');
    });
})();
