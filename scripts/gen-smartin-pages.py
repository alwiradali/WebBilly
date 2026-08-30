#!/usr/bin/env python3
"""Generate the SMARTin SCIENCE area pages and their index.

Area pages are the one part of the site where the same shell repeats, so
they are generated rather than hand-copied — the shell stays identical and
the writing per area stays hand-written. Every page carries a paragraph of
real, checkable local context and its own angle; none of them is a spun
copy of another, which is the whole difference between a useful local page
and a doorway page Google penalises.

    python3 scripts/gen-smartin-pages.py

Rewrites templates/smartin/areas/*.html only. Never touches the hand-built
pages. Safe to re-run.
"""

import os

ROOT = os.path.join(os.path.dirname(__file__), '..', 'templates', 'smartin')
OUT = os.path.join(ROOT, 'areas')

# ── every area: slug, name, region, the true local detail, and its own angle ──
AREAS = [
    dict(slug='leeds', name='Leeds', region='West Yorkshire', mode='both',
         blurb='GCSE science tuition across Leeds — in person around the city and online anywhere in the UK.',
         local="Leeds is a big city for a science tutor to cover, and the practical answer is usually a mix: in person where it works, online where it doesn't. Between the city centre, the northern suburbs and the outer towns, families sit anywhere from ten minutes to forty from each other, so the sessions that suit one household don't always suit the next.",
         detail="Leeds students sit GCSE Combined Science with AQA, Edexcel or OCR depending on the school, and the course content overlaps far more than the badge on the paper suggests. What changes between boards is the wording of questions and the shape of the mark scheme — which is exactly the part most students are never taught."),
    dict(slug='headingley', name='Headingley', region='Leeds', mode='both',
         blurb='GCSE science tuition in Headingley — in person in north Leeds or online.',
         local="Headingley sits a couple of miles north-west of Leeds city centre, along the Otley Road corridor. It is a busy, well-connected part of the city, and for families here an after-school session usually has to fit around a bus route and a tea time rather than a free afternoon.",
         detail="Sessions can run straight after school while the day's lesson is still fresh, or later in the evening once everyone is home — whichever actually gets done rather than whichever sounds ideal."),
    dict(slug='roundhay', name='Roundhay', region='Leeds', mode='both',
         blurb='GCSE science tuition in Roundhay — in person in north-east Leeds or online.',
         local="Roundhay is in north-east Leeds, best known for Roundhay Park — one of the largest city parks in Europe. It is a settled residential part of the city, and families here often want a regular weekly slot in term time rather than a crash course in the spring.",
         detail="A steady weekly hour through Year 10 does more for a grade than an intensive fortnight in April. It also means gaps get caught in October rather than discovered in a mock."),
    dict(slug='horsforth', name='Horsforth', region='Leeds', mode='both',
         blurb='GCSE science tuition in Horsforth — in person in north-west Leeds or online.',
         local="Horsforth sits north-west of the city towards Leeds Bradford Airport, with its own long high street and a strong sense of being a town in its own right rather than a suburb.",
         detail="For families out this way, online sessions often win on time alone — no drive, no parking, and the twenty minutes saved each way goes back into the week."),
    dict(slug='chapel-allerton', name='Chapel Allerton', region='Leeds', mode='both',
         blurb='GCSE science tuition in Chapel Allerton — in person in north Leeds or online.',
         local="Chapel Allerton is a couple of miles north of the centre, with a compact high street of independent shops and cafés and good links back into town.",
         detail="Small-group sessions work particularly well where friends are at the same school and sitting the same papers — they push each other, and explaining a topic to a friend is the fastest way to find out whether you actually understand it."),
    dict(slug='alwoodley', name='Alwoodley', region='Leeds', mode='both',
         blurb='GCSE science tuition in Alwoodley — in person in north Leeds or online.',
         local="Alwoodley sits at the northern edge of Leeds, out past Moortown towards the ring road, and is largely residential.",
         detail="Being on the edge of the city cuts both ways: quiet for studying, but a long way from anywhere at five o'clock on a school night. Online removes that problem entirely."),
    dict(slug='morley', name='Morley', region='Leeds', mode='both',
         blurb='GCSE science tuition in Morley — in person in south-west Leeds or online.',
         local="Morley is a town in its own right in south-west Leeds, with its own town hall, market and railway station, sitting close to the M62.",
         detail="Plenty of Morley families are juggling shift patterns and school runs. Evening and weekend slots exist for exactly that reason."),
    dict(slug='pudsey', name='Pudsey', region='Leeds', mode='both',
         blurb='GCSE science tuition in Pudsey — in person between Leeds and Bradford, or online.',
         local="Pudsey sits between Leeds and Bradford, which means students here go to schools on either side of that line and sit papers set by whichever board their school chose.",
         detail="That split matters more than it sounds. Two friends a street apart can be revising the same physics with different required practicals and different exam wording — worth checking before anyone buys a revision guide."),
    dict(slug='garforth', name='Garforth', region='Leeds', mode='both',
         blurb='GCSE science tuition in Garforth — in person across east Leeds, or online anywhere in the UK.',
         local="Garforth lies east of Leeds towards the A1, with its own station on the York line and a settled community feel.",
         detail="East Leeds families are often furthest from tutors clustered around the centre and the north. Online levels that out — the same teacher, no travel."),
    dict(slug='wetherby', name='Wetherby', region='West Yorkshire', mode='both',
         blurb='GCSE science tuition in Wetherby — in person in the Leeds outskirts or online.',
         local="Wetherby is a market town on the River Wharfe at the north-eastern edge of the Leeds district, roughly equidistant from Leeds, York and Harrogate.",
         detail="Being between three centres, Wetherby students end up at a wide spread of schools. Sessions are built around the specification the student is actually sitting, not a generic 'GCSE science' syllabus."),
    dict(slug='otley', name='Otley', region='West Yorkshire', mode='both',
         blurb='GCSE science tuition in Otley and Wharfedale — in person locally, or online anywhere in the UK.',
         local="Otley is a market town on the Wharfe below the Chevin, north-west of Leeds, with a long-standing Wednesday and Saturday market.",
         detail="Wharfedale is beautiful and not always quick to drive across, especially in winter. Online sessions run whatever the weather is doing on the Chevin."),
    dict(slug='guiseley', name='Guiseley', region='West Yorkshire', mode='both',
         blurb='GCSE science tuition in Guiseley — in person in Aireborough or online.',
         local="Guiseley sits in the Aireborough area between Leeds and Ilkley, on the Wharfedale rail line and close to the airport.",
         detail="Train links make Guiseley an easy place to reach and an easy place to leave — but a session that happens at the kitchen table beats one that depends on a connection."),
    dict(slug='bradford', name='Bradford', region='West Yorkshire', mode='both',
         blurb='GCSE science tuition in Bradford — in person nearby or online across the district.',
         local="Bradford is a city of its own next door to Leeds, with a large and varied set of secondary schools across the district.",
         detail="Bradford students sit the same national qualifications as everyone else, and the same handful of habits move grades: reading the command word, showing the working, and answering the question that was actually asked."),
    dict(slug='wakefield', name='Wakefield', region='West Yorkshire', mode='both',
         blurb='GCSE science tuition in Wakefield — online, or in person by arrangement.',
         local="Wakefield sits south of Leeds, a cathedral city with its own district covering Ossett, Horbury, Normanton and Castleford.",
         detail="Distance is the honest issue here: online is usually the sensible default, and it costs nothing in teaching quality. Screen-shared past papers and a shared whiteboard work better than most people expect."),
    dict(slug='harrogate', name='Harrogate', region='North Yorkshire', mode='both',
         blurb='GCSE science tuition in Harrogate — online, or in person by arrangement.',
         local="Harrogate lies north of Leeds in North Yorkshire, a spa town within comfortable reach of the Leeds ring road.",
         detail="Harrogate families often ask about stretch as much as rescue — students aiming at the top grades who keep dropping marks on six-mark questions and required practicals rather than on the science itself."),
    dict(slug='online-uk', name='Online across the UK', region='Anywhere in the UK', mode='online',
         blurb='Online GCSE Combined Science tuition anywhere in the UK, from a former Head of Science in Leeds.',
         local="Rod teaches from Leeds, but a screen does not care where anyone is sitting. Students join from anywhere in the UK — the sessions are live and taught, not recorded videos handed over.",
         detail="Online works because the material suits it. Past papers can be shared on screen and annotated together, diagrams get drawn live, and a student can be asked to explain something back with nowhere to hide — which is the moment you find out whether it has landed."),
]

def head(depth, title, desc, canonical_path, extra=''):
    # two different roots: siblings inside templates/smartin/ are `depth` up,
    # repo-root assets are two levels further out again.
    sib = '../' * depth
    up = '../' * (depth + 1)
    return f'''<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#0457ac">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:image" content="{up}../assets/smartin/og.png">
<link rel="icon" type="image/png" href="{up}../assets/smartin/flask.png">
<link rel="preload" href="{up}../assets/fonts/jost-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{up}../assets/fonts/fonts-smartin.css">
<link rel="stylesheet" href="{up}../assets/css/scroll-fx.css">
<link rel="stylesheet" href="{sib}shared.css">
{extra}</head>
<body>
<canvas id="letters" aria-hidden="true"></canvas>
<div data-fx="progressbar" style="color:#37bd79"></div>
'''

def nav(depth):
    up = '../' * depth
    ast = '../' * (depth + 2)
    return f'''
<nav class="nav">
  <div class="wrap">
    <div class="nav-in">
      <a class="brand" href="{up}index.html" aria-label="SMARTin SCIENCE home">
        <img class="mark" src="{ast}assets/smartin/flask.png" alt="">
        <span class="wm"><b>SMART<i>in</i></b><em>SCIENCE</em></span>
      </a>
      <span class="sp"></span>
      <div class="nlinks">
        <a href="{up}course.html">The Course</a>
        <a href="{up}workshops.html">Workshops &amp; Clubs</a>
        <a href="{up}about.html">About Rod</a>
        <a href="{up}areas/index.html">Areas</a>
        <a href="{up}blog/index.html">Blog</a>
        <a href="{up}faqs.html">FAQs</a>
      </div>
      <a class="btn btn-p" href="{up}index.html#booking">Book a Free Chat</a>
      <div class="burger" id="bg" role="button" tabindex="0" aria-label="Menu"><span></span><span></span><span></span></div>
    </div>
    <div class="mobmenu" id="mm">
      <a href="{up}course.html">The Course</a>
      <a href="{up}workshops.html">Workshops &amp; Clubs</a>
      <a href="{up}about.html">About Rod</a>
      <a href="{up}areas/index.html">Areas We Cover</a>
      <a href="{up}blog/index.html">Blog</a>
      <a href="{up}faqs.html">FAQs</a>
      <a href="{up}index.html#booking">Book a Free Chat</a>
    </div>
  </div>
</nav>
'''

def footer(depth):
    up = '../' * depth
    ast = '../' * (depth + 2)
    return f'''
<footer>
  <div class="wrap">
    <div class="fgrid">
      <div>
        <a class="brand" href="{up}index.html" style="margin-bottom:16px">
          <img class="mark" src="{ast}assets/smartin/flask.png" alt="">
          <span class="wm"><b>SMART<i>in</i></b><em>SCIENCE</em></span>
        </a>
        <p style="max-width:36ch">Science made simple. Results made real. GCSE Combined Science tuition, workshops and clubs with Rod Martin — Leeds-based, and online across the UK.</p>
      </div>
      <div>
        <h4>Tuition</h4>
        <ul>
          <li><a href="{up}course.html">The Course</a></li>
          <li><a href="{up}workshops.html">Workshops &amp; Clubs</a></li>
          <li><a href="{up}areas/index.html">Areas We Cover</a></li>
          <li><a href="{up}index.html#booking">Book a Free Chat</a></li>
        </ul>
      </div>
      <div>
        <h4>SMARTin SCIENCE</h4>
        <ul>
          <li><a href="{up}about.html">About Rod Martin</a></li>
          <li><a href="{up}blog/index.html">Blog</a></li>
          <li><a href="{up}faqs.html">Questions</a></li>
          <li><a data-c="mail">Email Rod</a></li>
        </ul>
      </div>
    </div>
    <div class="fbot">© SMARTin SCIENCE · Science made simple. Results made real!</div>
  </div>
</footer>
'''

def scripts(depth):
    up = '../' * depth
    ast = '../' * (depth + 2)
    return f'''
<a class="wa-float" data-c="wa" target="_blank" rel="noopener" aria-label="Message Rod on WhatsApp">
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z"/><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.83 2.41a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23z"/></svg>
  <span>Message Rod</span>
</a>

<script src="{ast}assets/js/scroll-fx.js" defer></script>
<script src="{up}letters.js" defer></script>
<script src="{up}site.js" defer></script>
</body>
</html>
'''

def area_page(a):
    up = '../'
    ast = '../../../'
    online_only = a['mode'] == 'online'
    where = 'Online, UK-wide' if online_only else f"In person around {a['name']} · Online anywhere"
    title = (f"Online GCSE Science Tuition UK | SMARTin SCIENCE" if online_only
             else f"GCSE Science Tutor in {a['name']} | SMARTin SCIENCE")
    h1 = (f'Online GCSE science tuition, <span class="g">anywhere in the UK</span>' if online_only
          else f'GCSE science tuition in <span class="g">{a["name"]}</span>')
    jsonld = f'''<script type="application/ld+json">
{{"@context":"https://schema.org","@type":"EducationalOrganization",
"name":"SMARTin SCIENCE","url":"https://smartinscience.co.uk/areas/{a['slug']}",
"description":{a['blurb']!r},
"email":"roddymartin80@gmail.com",
"areaServed":{{"@type":"Place","name":"{a['name']}"}},
"founder":{{"@type":"Person","name":"Rod Martin","jobTitle":"STEM Tutor and former Head of Science"}},
"address":{{"@type":"PostalAddress","addressLocality":"Leeds","addressRegion":"West Yorkshire","addressCountry":"GB"}}}}
</script>
'''
    return (head(1, title, a['blurb'], f"/areas/{a['slug']}", jsonld) + nav(1) + f'''
<section class="areahero">
  <div class="orb a" aria-hidden="true"></div><div class="orb b" aria-hidden="true"></div>
  <div class="wrap" style="position:relative;z-index:2">
    <p class="crumb" data-fx="reveal"><a href="{up}index.html">Home</a> &rsaquo; <a href="index.html">Areas</a> &rsaquo; {a['name']}</p>
    <div style="max-width:790px">
      <span class="eyebrow" data-fx="reveal">
        <img src="{ast}assets/smartin/icons/globe.png" alt="" width="18" height="18">{where}
      </span>
      <h1 style="font-size:clamp(2rem,4.6vw,3.2rem);margin:18px 0 16px" data-fx="text" data-fx-step="45">{h1}</h1>
      <p style="color:var(--mut);font-size:1.06rem" data-fx="reveal" data-fx-delay="200">{a['blurb']} Taught by Rod Martin — an expert STEM tutor and former Head of Science with over twenty years in UK classrooms.</p>
      <div class="hero-cta" data-fx="reveal" data-fx-delay="320">
        <a class="btn btn-p" href="{up}index.html#booking">Book a Free Chat →</a>
        <a class="btn btn-g" href="{up}course.html">See How It Works</a>
      </div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="prose" style="max-width:760px;margin:0 auto" data-fx="reveal">
      <h2 style="font-size:clamp(1.5rem,3.4vw,2.1rem);margin-bottom:16px">Science tuition around {a['name']}</h2>
      <p>{a['local']}</p>
      <p>{a['detail']}</p>
    </div>
  </div>
</section>

<section class="alt">
  <div class="wrap">
    <div class="sec-head" data-fx="reveal">
      <span class="pill">What's on offer</span>
      <h2>Three ways to <span class="g">work together</span></h2>
      <p>Whichever suits the student in front of me — not whichever is easiest to sell.</p>
    </div>
    <div class="grid g3">
      <div class="card" data-fx="reveal">
        <img class="ic-img" src="{ast}assets/smartin/icons/clipboard.png" alt="" width="46" height="46">
        <h3>The course</h3>
        <p>Structured GCSE Combined Science support through Biology, Chemistry, Physics and exam technique.</p>
        <p style="margin-top:10px"><a href="{up}course.html" class="ln">See the course →</a></p>
      </div>
      <div class="card" data-fx="reveal" data-fx-delay="120">
        <img class="ic-img" src="{ast}assets/smartin/icons/student-lab.png" alt="" width="46" height="46">
        <h3>Workshops &amp; clubs</h3>
        <p>Hands-on STEM workshops, after-school science clubs and holiday clubs for groups and schools.</p>
        <p style="margin-top:10px"><a href="{up}workshops.html" class="ln">See workshops →</a></p>
      </div>
      <div class="card" data-fx="reveal" data-fx-delay="240">
        <img class="ic-img" src="{ast}assets/smartin/icons/formula-screen.png" alt="" width="46" height="46">
        <h3>One to one</h3>
        <p>Individual or small-group sessions built around the gaps that are actually costing marks.</p>
        <p style="margin-top:10px"><a href="{up}index.html#booking" class="ln">Ask about a place →</a></p>
      </div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="sec-head" data-fx="reveal">
      <span class="pill">Nearby</span>
      <h2>Other areas <span class="g">covered</span></h2>
    </div>
    <div class="chips" data-fx="stagger" data-fx-step="40">
      {chips(a['slug'])}
    </div>
    <p style="text-align:center;margin-top:26px;color:var(--mut);font-size:.95rem">
      Not on the list? <a href="{up}index.html#booking" style="color:var(--teal);font-weight:600">Ask anyway</a> — online sessions reach the whole UK.
    </p>
  </div>
</section>
''' + footer(1) + scripts(1))

def chips(current):
    out = []
    for a in AREAS:
        if a['slug'] == current:
            continue
        out.append(f'<a class="chip" href="{a["slug"]}.html">{a["name"]}</a>')
    return '\n      '.join(out)

def areas_index():
    cards = []
    for a in AREAS:
        cards.append(f'''      <a class="card areacard" href="{a['slug']}.html" data-fx="reveal">
        <h3>{a['name']}</h3>
        <p>{a['blurb']}</p>
        <span class="ln">See {a['name']} →</span>
      </a>''')
    return (head(1, 'Areas We Cover | GCSE Science Tuition | SMARTin SCIENCE',
                 'GCSE Combined Science tuition in Leeds and across West Yorkshire, plus online tuition anywhere in the UK, with former Head of Science Rod Martin.',
                 '/areas/') + nav(1) + '''
<section class="areahero">
  <div class="orb a" aria-hidden="true"></div><div class="orb b" aria-hidden="true"></div>
  <div class="wrap" style="position:relative;z-index:2">
    <p class="crumb" data-fx="reveal"><a href="../index.html">Home</a> &rsaquo; Areas</p>
    <div style="max-width:800px">
      <span class="eyebrow" data-fx="reveal">
        <img src="../../../assets/smartin/icons/globe.png" alt="" width="18" height="18">Leeds · West Yorkshire · Online UK-wide
      </span>
      <h1 style="font-size:clamp(2rem,4.6vw,3.2rem);margin:18px 0 16px" data-fx="text" data-fx-step="45">Based in Leeds. <span class="g">Teaching everywhere.</span></h1>
      <p style="color:var(--mut);font-size:1.06rem" data-fx="reveal" data-fx-delay="200">In person around Leeds and West Yorkshire, and online for students anywhere in the UK. Same teacher, same sessions — the only thing that changes is whether we are in the same room.</p>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="sec-head" data-fx="reveal">
      <span class="pill">Areas</span>
      <h2>Where students <span class="g">come from</span></h2>
      <p>Pick the nearest place for local detail — or go straight to the online page if travelling is not the plan.</p>
    </div>
    <div class="grid g3">
''' + '\n'.join(cards) + '''
    </div>
  </div>
</section>
''' + footer(1) + scripts(1))

def main():
    os.makedirs(OUT, exist_ok=True)
    for a in AREAS:
        with open(os.path.join(OUT, a['slug'] + '.html'), 'w') as fh:
            fh.write(area_page(a))
    with open(os.path.join(OUT, 'index.html'), 'w') as fh:
        fh.write(areas_index())
    print(f'wrote {len(AREAS)} area pages + index into templates/smartin/areas/')

if __name__ == '__main__':
    main()
