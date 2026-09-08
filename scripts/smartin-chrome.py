#!/usr/bin/env python3
"""Rewrite the nav and footer on every SMARTin SCIENCE page.

Both blocks are byte-identical across all 33 pages apart from the ../ depth,
so they are generated here rather than hand-edited thirty-three times. Run it
after changing either one:

    python3 scripts/smartin-chrome.py

It replaces only the <nav class="nav">…</nav> and <footer>…</footer> blocks and
leaves everything else in each file untouched.
"""

import glob
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(__file__), '..', 'templates', 'smartin')

# The footer lists the in-person places — which means Leeds — and then the one
# page that covers everywhere else. Mixing in Bradford or Harrogate under a
# heading that says "where Rod teaches" reads as an offer to turn up there.
# The full fifty-seven live on areas/index.html, behind "All areas".
FOOTER_AREAS = [
    ('leeds', 'Leeds'), ('headingley', 'Headingley'), ('roundhay', 'Roundhay'),
    ('horsforth', 'Horsforth'), ('chapel-allerton', 'Chapel Allerton'),
    ('morley', 'Morley'), ('pudsey', 'Pudsey'),
    ('online-uk', 'Online, England &amp; Wales'),
]

NAV = '''<nav class="nav">
  <div class="wrap">
    <div class="nav-in">
      <a class="brand" href="{p}index.html" aria-label="SMARTin SCIENCE home">
        <img class="mark" src="{a}assets/smartin/flask-512.png" alt="">
        <span class="wm"><b>SMART<i>in</i></b><em>SCIENCE</em></span>
      </a>
      <span class="sp"></span>
      <div class="nlinks">
        <a href="{p}course.html">GCSE Courses</a>
        <a href="{p}daytime.html">Daytime</a>
        <a href="{p}timetable.html">Timetable</a>
        <a href="{p}masterclasses.html">Masterclasses</a>
        <a href="{p}workshops.html">STEM Activities</a>
        <a href="{p}about.html">About Rod</a>
        <a href="{p}faqs.html">FAQs</a>
        <a href="{p}areas/index.html">Areas</a>
      </div>
      <a class="btn btn-p" href="{p}index.html#booking">Enquiry</a>
      <div class="burger" id="bg" role="button" tabindex="0" aria-label="Menu"><span></span><span></span><span></span></div>
    </div>
    <div class="mobmenu" id="mm">
      <a href="{p}course.html">GCSE Courses</a>
      <a href="{p}timetable.html">Timetable</a>
      <a href="{p}daytime.html">Daytime</a>
      <a href="{p}masterclasses.html">Masterclasses</a>
      <a href="{p}exam-boards.html">Exam boards &amp; courses</a>
      <a href="{p}workshops.html">STEM Activities</a>
      <a href="{p}about.html">About Rod</a>
      <a href="{p}faqs.html">FAQs</a>
      <a href="{p}areas/index.html">Areas</a>
      <a href="{p}blog/index.html">Blog</a>
      <a href="{p}index.html#booking">Enquiry</a>
    </div>
  </div>
</nav>'''

FOOTER = '''<footer>
  <div class="wrap">
    <div class="fgrid">
      <div>
        <a class="brand" href="{p}index.html" style="margin-bottom:16px">
          <img class="mark" src="{a}assets/smartin/flask-512.png" alt="">
          <span class="wm"><b>SMART<i>in</i></b><em>SCIENCE</em></span>
        </a>
        <p style="max-width:36ch">Science made simple. Results made real. GCSE Science tuition, workshops and clubs with Rod Martin — Leeds-based, and online across England and Wales.</p>
        <p style="margin-top:18px"><a class="btn btn-g" href="{p}index.html#booking">Enquire about a place →</a></p>
      </div>
      <div>
        <h4>Tuition</h4>
        <ul>
          <li><a href="{p}course.html">The four-week course</a></li>
          <li><a href="{p}timetable.html">Timetable</a></li>
          <li><a href="{p}daytime.html">Daytime sessions</a></li>
          <li><a href="{p}masterclasses.html">Weekend masterclasses</a></li>
          <li><a href="{p}exam-boards.html">Exam boards &amp; courses</a></li>
        </ul>
      </div>
      <div>
        <h4>STEM &amp; schools</h4>
        <ul>
          <li><a href="{p}workshops.html#stem">STEM workshops</a></li>
          <li><a href="{p}workshops.html#clubs">After-school clubs</a></li>
          <li><a href="{p}workshops.html#holiday">Holiday clubs</a></li>
          <li><a href="{p}blog/index.html">Blog &amp; free guides</a></li>
          <li><a href="{p}faqs.html">Questions</a></li>
        </ul>
      </div>
      <div>
        <h4>Where Rod teaches</h4>
        <ul class="fareas">
{areas}
        </ul>
        <p style="margin-top:12px"><a href="{p}areas/index.html">All areas →</a></p>
      </div>
    </div>
    <div class="fbot">© SMARTin SCIENCE · Science made simple. Results made real! · <a data-c="mail" data-fill="text">Email Rod</a></div>
  </div>
</footer>'''


def chrome(depth):
    """nav + footer for a page `depth` folders below templates/smartin."""
    p = '../' * depth
    a = '../' * (2 + depth)          # assets sit two levels above templates/smartin
    areas = '\n'.join(
        '          <li><a href="%sareas/%s.html">%s</a></li>' % (p, slug, name)
        for slug, name in FOOTER_AREAS)
    return (NAV.format(p=p, a=a),
            FOOTER.format(p=p, a=a, areas=areas))


def main():
    files = sorted(glob.glob(os.path.join(ROOT, '**', '*.html'), recursive=True))
    changed = 0
    for f in files:
        rel = os.path.relpath(f, ROOT)
        depth = rel.count(os.sep)
        nav, footer = chrome(depth)
        s = open(f).read()
        before = s
        s, n1 = re.subn(r'<nav class="nav">.*?</nav>', lambda _m: nav, s, count=1, flags=re.S)
        s, n2 = re.subn(r'<footer>.*?</footer>', lambda _m: footer, s, count=1, flags=re.S)
        if not n1 or not n2:
            sys.exit('%s: nav=%d footer=%d — refusing to write a half-updated page' % (rel, n1, n2))
        if s != before:
            open(f, 'w').write(s)
            changed += 1
    print('nav + footer refreshed on %d of %d pages' % (changed, len(files)))


if __name__ == '__main__':
    main()
