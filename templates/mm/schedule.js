/* Molecular Miracles — class timetable
   ----------------------------------------------------------------------
   Lynsey keeps her classes in a Google Calendar on her phone. This reads
   that calendar and draws the upcoming classes in the site's own styling,
   so she never has to touch the website to change a time.

   No server, no database — it runs entirely in the browser, so it keeps
   working whichever host the site ends up on.

   SETUP (once):
     1. In Google Calendar, make a new calendar called "Molecular Miracles
        Classes". Settings > Add calendar > Create new calendar.
     2. Open its settings, tick "Make available to public", and set the
        permission to "See all event details".
     3. Scroll to "Integrate calendar" and copy the Calendar ID.
     4. Get an API key at console.cloud.google.com — enable the Google
        Calendar API, create an API key, and restrict it to this website.
     5. Paste both below and the timetable goes live.

   Until both are filled in, the section honestly says class times are being
   confirmed and points people at the enquiry form. It never invents times.

   Naming events: put the level first so it can be colour-coded, e.g.
     "Higher — 2 places left"      "National 5"      "Advanced Higher" */

(function () {
  var CONFIG = {
    calendarId: '',   // e.g. 'abc123@group.calendar.google.com'
    apiKey: '',       // e.g. 'AIzaSy...'
    weeksAhead: 6,
    maxEvents: 12
  };

  var root = document.getElementById('timetable-body');
  if (!root) return;

  var LEVELS = [
    { key: 'advanced higher', label: 'Advanced Higher', cls: 'ah' },
    { key: 'higher',          label: 'Higher',          cls: 'hi' },
    { key: 'national 5',      label: 'National 5',      cls: 'n5' },
    { key: 'nat 5',           label: 'National 5',      cls: 'n5' },
    { key: 'n5',              label: 'National 5',      cls: 'n5' }
  ];

  function levelOf(title) {
    var t = (title || '').toLowerCase();
    for (var i = 0; i < LEVELS.length; i++) {
      if (t.indexOf(LEVELS[i].key) > -1) return LEVELS[i];
    }
    return { label: 'Chemistry', cls: 'gen' };
  }

  function fmtDay(d) {
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function fmtTime(d) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function msg(html) {
    root.innerHTML = '<div class="tt-empty">' + html + '</div>';
  }

  function render(events) {
    if (!events.length) {
      msg('No classes are scheduled in the next few weeks. ' +
          '<a href="#booking">Enquire about the next intake</a> and I\'ll let you know as soon as a place opens.');
      return;
    }
    var html = '<div class="tt-list">';
    events.forEach(function (ev) {
      var lv = levelOf(ev.title);
      var extra = (ev.title || '').replace(/^\s*(advanced higher|higher|national 5|nat 5|n5)\s*[—\-–:]?\s*/i, '').trim();
      html += '<div class="tt-row">' +
        '<div class="tt-when"><b>' + fmtDay(ev.start) + '</b><span>' + fmtTime(ev.start) +
          (ev.end ? '–' + fmtTime(ev.end) : '') + '</span></div>' +
        '<div class="tt-what"><span class="tt-lvl ' + lv.cls + '">' + lv.label + '</span>' +
          (extra ? '<span class="tt-note">' + extra + '</span>' : '') + '</div>' +
        '<a class="tt-cta" href="#booking" data-level="' + lv.label + '">Request a place</a>' +
        '</div>';
    });
    html += '</div>';
    root.innerHTML = html;

    // tapping a class preselects that course on the booking form
    root.querySelectorAll('.tt-cta').forEach(function (a) {
      a.addEventListener('click', function () {
        var want = this.dataset.level, sel = document.getElementById('level');
        if (!sel) return;
        for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].text.indexOf(want) > -1) { sel.selectedIndex = i; break; }
        }
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
  var until = new Date(now.getTime() + CONFIG.weeksAhead * 7 * 86400000);
  var url = 'https://www.googleapis.com/calendar/v3/calendars/' +
    encodeURIComponent(CONFIG.calendarId) + '/events' +
    '?key=' + encodeURIComponent(CONFIG.apiKey) +
    '&timeMin=' + now.toISOString() +
    '&timeMax=' + until.toISOString() +
    '&singleEvents=true&orderBy=startTime&maxResults=' + CONFIG.maxEvents;

  msg('Loading class times…');

  fetch(url)
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (data) {
      var events = (data.items || []).map(function (it) {
        var s = it.start && (it.start.dateTime || it.start.date);
        var e = it.end && (it.end.dateTime || it.end.date);
        return { title: it.summary || '', start: new Date(s), end: it.start && it.start.dateTime ? new Date(e) : null };
      }).filter(function (ev) { return ev.start && !isNaN(ev.start); });
      render(events);
    })
    .catch(function () {
      // Never leave a broken-looking section — fall back to the enquiry route.
      msg('Class times are being confirmed. ' +
          '<a href="#booking">Send an enquiry</a> and I\'ll come back to you with the current ' +
          'days, times and availability.');
    });
})();
