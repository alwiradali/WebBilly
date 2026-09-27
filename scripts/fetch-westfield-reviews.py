#!/usr/bin/env python3
"""Put Westfield Garage's real Google reviews into the page.

Reads his Featurable widget and rewrites templates/westfield-garage.html with
what it finds: three real reviews, his real rating, his real review count and
the direct write-a-review link that carries his Google Place ID. Then it takes
off `data-demo-reviews`, which is what scripts/build-westfield.py refuses to
build past.

    python3 scripts/fetch-westfield-reviews.py            # fetch and write
    python3 scripts/fetch-westfield-reviews.py --list     # just show them
    python3 scripts/fetch-westfield-reviews.py --check    # is the page current?

**No API key.** The documented v2 endpoint wants one; the v1 endpoint the
widget's own embed script uses does not, and the widget is published with no
domain restriction, so there is nothing secret here and nothing to rotate.
Both live under api.featurable.com — featurable.com/api/... only 308s there,
and a client that does not follow redirects silently gets nothing.

Run it again whenever he gets new reviews, and commit the diff. The reviews
are then in git: the page needs no third-party request, cannot show an empty
box on the day Featurable is slow, and Google reads the words rather than
having to run somebody's JavaScript.
"""

import html as htmllib
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.join(os.path.dirname(__file__), '..')
PAGE = os.path.join(ROOT, 'templates', 'westfield-garage.html')
JS = os.path.join(ROOT, 'assets', 'js', 'westfield.js')

WIDGET = 'b976820a-286c-4486-91a5-1e8476e809dd'
API = 'https://featurable.com/api/v1/widgets/%s'

# The three that go on the page, by Google's own review id, each with the job
# it was for — the job is ours, the words are entirely his customers'.
#
# Chosen to be complete quotes (never an excerpt, which would misrepresent
# somebody), to cover three different kinds of work, and to name no competitor.
# To change them: run with --list, copy the ids you want, and edit this.
FEATURED = [
    ('AbFvOqkTQuJCvEnRLgZMiQiIMcfv7U2vLv__rMvXDr99x4e8sVxo1Bx6XE6YmW0-D5ZtFdRJclyIQQ',
     'Suspension & brakes'),   # Arran Johnson
    ('AbFvOqkUtH5lqasS2Bs_V9TbUVcKw-WTdzFP414SIG5P6VvQ26jd7Vwm2Hf56cNpF0o1M2S0Mq5JIA',
     'MOT & ABS'),             # rachele
    ('AbFvOqnhAkJGUCMGuxaqA9f3jze8_4FDnn4vpMA-pIXtKpmnAFS1i5866Z_BA46P2PQqkgvOnHzuAg',
     'Clutch'),                # John N
]

STAR = ('<svg viewBox="0 0 24 24"><path d="m12 2 3 6.6 7 .7-5.2 4.7 1.5 7L12 '
        '17.4 5.7 21l1.5-7L2 9.3l7-.7Z"/></svg>')
GMARK = ('<svg class="gmark" viewBox="0 0 24 24"><path fill="#4285f4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6Z"/>'
         '<path fill="#34a853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A11.5 11.5 0 0 0 12 24Z"/>'
         '<path fill="#fbbc04" d="M5.6 14.3a6.8 6.8 0 0 1 0-4.4v-3H1.8a11.5 11.5 0 0 0 0 10.4Z"/>'
         '<path fill="#ea4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 0 0 1.8 6.9l3.8 3a6.9 6.9 0 0 1 6.4-5Z"/></svg>')

WORDS = {1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven',
         8: 'Eight', 9: 'Nine', 10: 'Ten'}
TENS = {2: 'Twenty', 3: 'Thirty', 4: 'Forty', 5: 'Fifty', 6: 'Sixty',
        7: 'Seventy', 8: 'Eighty', 9: 'Ninety'}


def fetch():
    req = urllib.request.Request(API % WIDGET, headers={
        'accept': 'application/json',
        'user-agent': 'billydigitals-build/1.0',
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.load(r)
    if not d.get('success'):
        sys.exit('featurable: ' + json.dumps(d)[:300])
    if not d.get('published'):
        sys.exit('featurable: the widget is not published, so it serves nothing')
    if d.get('isExampleReviews'):
        sys.exit('featurable: this is returning ITS OWN example reviews, not his. '
                 'Swapping our invented ones for somebody else\'s is not an improvement.')
    if not d.get('reviews'):
        sys.exit('featurable: no reviews came back')
    return d


def short_name(n):
    """Google shows full names. The page shows a first name and an initial —
    the same courtesy a printed testimonial gets, and enough for a reader to
    see a real person left it."""
    parts = [p for p in n.strip().split() if p]
    if len(parts) >= 2 and parts[-1][0].isalpha():
        # a surname already down to an initial ("John N") keeps its shape
        return '%s %s.' % (parts[0], parts[-1][0].upper())
    return parts[0] if parts else n


def initials(n):
    parts = [p for p in n.strip().split() if p and p[0].isalpha()]
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    return (parts[0][:2] if parts else '?').upper()


def pick(reviews):
    by_id = {r['reviewId']: r for r in reviews}
    out, missing = [], []
    for rid, job in FEATURED:
        r = by_id.get(rid)
        if r:
            out.append((r, job))
        else:
            missing.append(rid)
    if missing:
        # A review its author deleted must not silently become a blank card.
        sys.exit('These featured reviews are no longer in the feed:\n  '
                 + '\n  '.join(missing)
                 + '\n\nRun with --list, pick replacements and edit FEATURED.')
    return out


def card(r, job):
    name = r['reviewer']['displayName']
    text = htmllib.escape((r.get('comment') or '').strip())
    stars = int(r.get('starRating') or 5)
    return (
        '      <article class="rev">\n'
        '        <div class="stars" aria-label="%d out of 5">\n'
        '          %s\n'
        '        </div>\n'
        '        <p>%s</p>\n'
        '        <div class="who"><span class="av">%s</span>'
        '<span class="nm"><b>%s</b><span>%s</span></span>\n'
        '          %s\n'
        '        </div>\n'
        '      </article>'
        % (stars, STAR * stars, text, initials(name), short_name(name),
           htmllib.escape(job), GMARK)
    )


def rewrite(page, js, d, chosen):
    rating = d['averageRating']
    rating = ('%.1f' % rating) if isinstance(rating, (int, float)) else str(rating)
    count = int(d['totalReviewCount'])
    cards = '\n\n'.join(card(r, job) for r, job in chosen)

    # --- the three cards, and the attribute that blocks the live build ------
    page, n = re.subn(
        r'(<div class="revs"[^>]*>).*?(\n    </div>)',
        lambda m: '<div class="revs" data-fx="stagger" data-fx-step="90">\n'
                  + cards + m.group(2),
        page, count=1, flags=re.S)
    if n != 1:
        sys.exit('could not find the .revs block in the page')

    # the comment that explained the placeholder, and the note under them
    page = re.sub(r'\n    <!-- PLACEHOLDER REVIEWS.*?-->', '', page, flags=re.S)
    page = re.sub(r'\n *<p class="note centre mt" data-demo[^>]*>Example reviews.*?</p>',
                  '', page, flags=re.S)

    # --- his rating and his count, everywhere they appear -------------------
    page = page.replace('<div class="big">5.0</div>', '<div class="big">%s</div>' % rating)
    page = re.sub(r'(<div class="stars" aria-label=")[\d.]+( out of 5">\s*\n\s*<svg viewBox="0 0 24 24"><path d="m12 2 3 6\.6 7 \.7-5\.2 4\.7 1\.5 7L12 17\.4 5\.7 21l1\.5-7L2 9\.3l7-\.7Z"/></svg>\n)',
                 r'\g<1>' + rating + r'\g<2>', page, count=1)
    page = re.sub(r'<div class="g">from [\d,]+ Google reviews</div>',
                  '<div class="g">from %d Google reviews</div>' % count, page)
    page = re.sub(r'<span data-count="[\d.]+">[\d.]+</span></b><span>Average Google rating</span>',
                  '<span data-count="%s">%s</span></b><span>Average Google rating</span>' % (rating, rating), page)
    page = re.sub(r'<span data-count="\d+">\d+</span></b><span>Google reviews, all five star</span>',
                  '<span data-count="%d">%d</span></b><span>Google reviews, all five star</span>' % (count, count), page)
    # The lede spells the count out in words. Rather than try to write an
    # English number speller, keep the shape and let the digits carry it once
    # the count leaves the range we have words for.
    tens, units = divmod(count, 10)
    if 20 <= count < 100 and tens in TENS:
        spelt = TENS[tens] + ('-' + WORDS[units].lower() if units else '')
    elif count in WORDS:
        spelt = WORDS[count]
    else:
        spelt = str(count)
    page = re.sub(r'(<p class="lede" style="margin:0">)[^<]*?(The quickest way)',
                  lambda m: m.group(1) + spelt
                  + ' reviews on Google and not one of them under five stars. '
                  + m.group(2),
                  page, count=1)

    # --- the Place ID, straight off his profile -----------------------------
    profile = d.get('profileUrl') or ''
    if 'placeid=' in profile:
        place = profile.split('placeid=')[1].split('&')[0]
        js = re.sub(r'googleReview: "https://www\.google\.com/maps/search/\?api=1&query=" \+\n'
                    r'                  "[^"]*"',
                    'googleReview: "https://search.google.com/local/writereview?placeid=%s"' % place,
                    js, count=1)
        js = js.replace('PLACE_ID_GOES_HERE', place)
    return page, js, rating, count


def main():
    d = fetch()
    reviews = d['reviews']

    if '--list' in sys.argv:
        print('%s — %s★ from %s reviews, %d with text\n'
              % (WIDGET, d['averageRating'], d['totalReviewCount'],
                 sum(1 for r in reviews if (r.get('comment') or '').strip())))
        for r in reviews:
            c = (r.get('comment') or '').strip().replace('\n', ' ')
            if not c:
                continue
            print('%s\n  %d★ %s · %s\n  %s\n'
                  % (r['reviewId'], r['starRating'], r['reviewer']['displayName'],
                     r['createTime'][:10], c))
        return

    chosen = pick(reviews)
    page = open(PAGE, encoding='utf-8').read()
    js = open(JS, encoding='utf-8').read()
    new_page, new_js, rating, count = rewrite(page, js, d, chosen)

    if '--check' in sys.argv:
        stale = (new_page != page) or (new_js != js)
        print('reviews on the page are %s (%s★, %d reviews)'
              % ('STALE — run this script' if stale else 'current', rating, count))
        sys.exit(1 if stale else 0)

    open(PAGE, 'w', encoding='utf-8').write(new_page)
    open(JS, 'w', encoding='utf-8').write(new_js)
    print('wrote %d real reviews, %s★ from %d, and his Place ID.'
          % (len(chosen), rating, count))
    for r, job in chosen:
        print('  · %s — %s' % (short_name(r['reviewer']['displayName']), job))


if __name__ == '__main__':
    main()
