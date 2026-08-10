/* Molecular Miracles — reviews carousel
   ----------------------------------------------------------------------
   Turns the reviews already in the HTML into a swipeable carousel, and
   optionally prepends live Google reviews on top of them.

   Progressive enhancement on purpose: every testimonial stays in the page
   source, so it is readable with JavaScript off and crawlable by Google.
   This file only changes how they are presented.

   GOOGLE REVIEWS — not yet switched on
   Fill in placeId and apiKey below and the newest Google reviews appear
   first, with her live star rating and total review count in the header.

     1. Find the Place ID at developers.google.com/maps/documentation/places/web-service/place-id
        (search her business name — it looks like ChIJ...)
     2. In the same Google Cloud project as the calendar key, enable
        "Places API (New)"
     3. Create a second API key, restricted to this site's two domains and
        to Places API only — same as the calendar key
     4. Paste both below

   Google's API returns AT MOST 5 reviews. That is a hard limit on their
   side, not a setting. Her own testimonials carry the rest, and the header
   links out to the full list on Google.                                  */

(function () {
  var CONFIG = {
    // Molecular Miracles Chemistry Tuition on Google Maps, confirmed to
    // resolve via https://www.google.com/maps/place/?q=place_id:<this>
    placeId: 'ChIJs-VC4edkcQwRBBdecMMkvN8',
    apiKey: '',   // Places API (New) key, restricted to this site's domains
    profileUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJs-VC4edkcQwRBBdecMMkvN8'
  };

  var track = document.getElementById('reviews-track');
  if (!track) return;

  var slides = [].slice.call(track.children);
  if (!slides.length) return;

  var index = 0, perView = 1;

  function measure() {
    var w = track.clientWidth;
    perView = w >= 1080 ? 3 : (w >= 720 ? 2 : 1);
    slides.forEach(function (s) { s.style.flex = '0 0 ' + (100 / perView) + '%'; });
    index = Math.min(index, Math.max(0, slides.length - perView));
    buildDots();
    apply();
  }

  /* One dot per page, not per slide. Rebuilt on every measure() because the
     page count changes both with the viewport and when Google reviews are
     appended after load — an earlier version built them once from the initial
     slides, so late arrivals were unreachable and the active dot desynced. */
  function buildDots() {
    var pages = Math.max(1, Math.ceil(slides.length / perView));
    if (dots.length === pages) return;
    dotWrap.innerHTML = '';
    dots = [];
    for (var i = 0; i < pages; i++) {
      (function (page) {
        var d = document.createElement('button');
        d.className = 'rev-dot';
        d.setAttribute('aria-label', 'Reviews page ' + (page + 1) + ' of ' + pages);
        d.addEventListener('click', function () { go(page * perView); });
        dotWrap.appendChild(d);
        dots.push(d);
      })(i);
    }
  }

  function apply() {
    track.style.transform = 'translateX(' + (-index * (100 / perView)) + '%)';
    var max = Math.max(0, slides.length - perView);
    prev.disabled = index <= 0;
    next.disabled = index >= max;
    var page = Math.round(index / perView);
    dots.forEach(function (d, i) { d.classList.toggle('on', i === page); });
  }

  function go(i) {
    var max = Math.max(0, slides.length - perView);
    index = Math.max(0, Math.min(i, max));
    apply();
  }

  // controls
  var nav = document.createElement('div');
  nav.className = 'rev-nav';
  var prev = document.createElement('button');
  prev.className = 'rev-btn'; prev.innerHTML = '‹';
  prev.setAttribute('aria-label', 'Previous reviews');
  var next = document.createElement('button');
  next.className = 'rev-btn'; next.innerHTML = '›';
  next.setAttribute('aria-label', 'More reviews');
  var dotWrap = document.createElement('div');
  dotWrap.className = 'rev-dots';
  var dots = [];   // filled by buildDots(), which runs on every measure()
  nav.appendChild(prev); nav.appendChild(dotWrap); nav.appendChild(next);
  track.parentNode.parentNode.appendChild(nav);

  prev.addEventListener('click', function () { go(index - perView); });
  next.addEventListener('click', function () { go(index + perView); });

  // keyboard
  track.parentNode.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { go(index - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { go(index + 1); e.preventDefault(); }
  });

  // touch / drag swipe
  var startX = 0, dragging = false;
  function down(x) { startX = x; dragging = true; track.style.transition = 'none'; }
  function move(x) {
    if (!dragging) return;
    var dx = x - startX;
    track.style.transform = 'translateX(calc(' + (-index * (100 / perView)) + '% + ' + dx + 'px))';
  }
  function up(x) {
    if (!dragging) return;
    dragging = false;
    track.style.transition = '';
    var dx = x - startX;
    if (Math.abs(dx) > 45) go(index + (dx < 0 ? 1 : -1)); else apply();
  }
  track.addEventListener('touchstart', function (e) { down(e.touches[0].clientX); }, { passive: true });
  track.addEventListener('touchmove', function (e) { move(e.touches[0].clientX); }, { passive: true });
  track.addEventListener('touchend', function (e) { up(e.changedTouches[0].clientX); });
  track.addEventListener('mousedown', function (e) { down(e.clientX); e.preventDefault(); });
  window.addEventListener('mousemove', function (e) { move(e.clientX); });
  window.addEventListener('mouseup', function (e) { up(e.clientX); });

  window.addEventListener('resize', measure);
  measure();

  /* ---- live Google reviews, if configured ---------------------------- */

  function stars(n) {
    var full = Math.round(n || 5);
    return new Array(5).fill(0).map(function (_, i) { return i < full ? '★' : '☆'; }).join('');
  }

  function addGoogle(data) {
    var header = document.getElementById('reviews-google');
    if (header && data.rating) {
      header.innerHTML =
        '<span class="rg-score">' + data.rating.toFixed(1) + '</span>' +
        '<span class="rg-stars">' + stars(data.rating) + '</span>' +
        '<span class="rg-count">from ' + data.total + ' Google reviews</span>' +
        (CONFIG.profileUrl ? '<a class="rg-link" href="' + CONFIG.profileUrl +
          '" target="_blank" rel="noopener">Read them all on Google →</a>' : '');
      header.classList.add('on');
    }
    // newest Google reviews go in front of her own testimonials
    (data.reviews || []).slice().reverse().forEach(function (r) {
      var d = document.createElement('div');
      d.className = 'quote g';
      d.innerHTML = '<div class="stars">' + stars(r.rating) + '</div>' +
        '<p>' + (r.text || '').replace(/[<>]/g, '') + '</p>' +
        '<div class="who">— ' + (r.author || 'Google reviewer') + ' · via Google</div>';
      track.insertBefore(d, track.firstChild);
    });
    slides = [].slice.call(track.children);
    measure();
  }

  if (!CONFIG.placeId || !CONFIG.apiKey) return;

  fetch('https://places.googleapis.com/v1/places/' + encodeURIComponent(CONFIG.placeId) +
        '?fields=rating,userRatingCount,reviews&key=' + encodeURIComponent(CONFIG.apiKey),
        { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (d) {
      addGoogle({
        rating: d.rating,
        total: d.userRatingCount,
        reviews: (d.reviews || []).map(function (r) {
          return { rating: r.rating, author: r.authorAttribution && r.authorAttribution.displayName,
                   text: r.originalText && r.originalText.text };
        })
      });
    })
    .catch(function (e) {
      // Her own testimonials are already on the page, so a failure here just
      // means no Google header — never an empty reviews section.
      console.error('[reviews] Google reviews unavailable —', e && e.message ? e.message : e);
    });
})();
