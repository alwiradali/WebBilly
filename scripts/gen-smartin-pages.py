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
         blurb='GCSE science tuition across Leeds — in person around the city and online anywhere in England and Wales.',
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
         blurb='GCSE science tuition in Garforth — in person across east Leeds, or online anywhere in England and Wales.',
         local="Garforth lies east of Leeds towards the A1, with its own station on the York line and a settled community feel.",
         detail="East Leeds families are often furthest from tutors clustered around the centre and the north. Online levels that out — the same teacher, no travel."),
    dict(slug='wetherby', name='Wetherby', region='West Yorkshire', mode='both',
         blurb='GCSE science tuition in Wetherby — in person in the Leeds outskirts or online.',
         local="Wetherby is a market town on the River Wharfe at the north-eastern edge of the Leeds district, roughly equidistant from Leeds, York and Harrogate.",
         detail="Being between three centres, Wetherby students end up at a wide spread of schools. Sessions are built around the specification the student is actually sitting, not a generic 'GCSE science' syllabus."),
    dict(slug='otley', name='Otley', region='West Yorkshire', mode='both',
         blurb='GCSE science tuition in Otley and Wharfedale — in person locally, or online anywhere in England and Wales.',
         local="Otley is a market town on the Wharfe below the Chevin, north-west of Leeds, with a long-standing Wednesday and Saturday market.",
         detail="Wharfedale is beautiful and not always quick to drive across, especially in winter. Online sessions run whatever the weather is doing on the Chevin."),
    dict(slug='guiseley', name='Guiseley', region='West Yorkshire', mode='both',
         blurb='GCSE science tuition in Guiseley — in person in Aireborough or online.',
         local="Guiseley sits in the Aireborough area between Leeds and Ilkley, on the Wharfedale rail line and close to the airport.",
         detail="Train links make Guiseley an easy place to reach and an easy place to leave — but a session that happens at the kitchen table beats one that depends on a connection."),
    dict(slug='bradford', name='Bradford', region='West Yorkshire', mode='online',
         blurb='GCSE science tuition in Bradford — in person nearby or online across the district.',
         local="Bradford is a city of its own next door to Leeds, with a large and varied set of secondary schools across the district.",
         detail="Bradford students sit the same national qualifications as everyone else, and the same handful of habits move grades: reading the command word, showing the working, and answering the question that was actually asked."),
    dict(slug='wakefield', name='Wakefield', region='West Yorkshire', mode='online',
         blurb='GCSE science tuition in Wakefield — online, or in person by arrangement.',
         local="Wakefield sits south of Leeds, a cathedral city with its own district covering Ossett, Horbury, Normanton and Castleford.",
         detail="Distance is the honest issue here: online is usually the sensible default, and it costs nothing in teaching quality. Screen-shared past papers and a shared whiteboard work better than most people expect."),
    dict(slug='harrogate', name='Harrogate', region='North Yorkshire', mode='online',
         blurb='GCSE science tuition in Harrogate — online, or in person by arrangement.',
         local="Harrogate lies north of Leeds in North Yorkshire, a spa town within comfortable reach of the Leeds ring road.",
         detail="Harrogate families often ask about stretch as much as rescue — students aiming at the top grades who keep dropping marks on six-mark questions and required practicals rather than on the science itself."),
    dict(slug='online-uk', name='Online across England & Wales', region='England and Wales', mode='online',
         blurb='Online GCSE Combined Science tuition anywhere in England and Wales, from a former Head of Science in Leeds.',
         local="Rod teaches from Leeds, but a screen does not care where anyone is sitting. Students join from anywhere in England and Wales — the sessions are live and taught, not recorded videos handed over. Scotland is the one place not covered, and for a real reason: Scottish students sit National 5 and Highers rather than GCSEs, which is a different qualification with a different specification.",
         detail="Online works because the material suits it. Past papers can be shared on screen and annotated together, diagrams get drawn live, and a student can be asked to explain something back with nowhere to hide — which is the moment you find out whether it has landed."),
]

# ── England, online ─────────────────────────────────────────────────────────
# Rod teaches from Leeds. In person means West Yorkshire and Harrogate and
# nowhere else, so every city below is an ONLINE page and says so in its own
# title, heading and hero. Claiming to turn up in Plymouth would be a lie that
# costs one wasted enquiry each time it is believed.
#
# Each still carries a true local detail and its own angle, for the reason in
# the docstring: forty pages of the same paragraph with the place name swapped
# is a doorway-page pattern, and Google treats it as one.
CITIES = [
    dict(slug='london', name='London', region='Greater London',
         local="London's secondary schools sit across thirty-two boroughs and use all three of the main exam boards, sometimes differently from one neighbouring school to the next.",
         detail="The commonest London problem is not the science but the diary: travel eats the evening. A live online hour that starts the minute the front door shuts is usually the difference between a session that happens weekly and one that slips."),
    dict(slug='birmingham', name='Birmingham', region='West Midlands',
         local="Birmingham is England's second city, with one of the largest school populations in the country spread across the city and the wider West Midlands conurbation.",
         detail="In a big cohort it is easy for a quiet student to go a whole term without being asked a direct question. Online, one to one, there is nowhere to sit at the back — every answer gets said out loud."),
    dict(slug='manchester', name='Manchester', region='Greater Manchester',
         local="Manchester and the Greater Manchester boroughs around it — Salford, Trafford, Stockport, Oldham — run a dense mix of schools and academy trusts, so two students the same age can be on different boards.",
         detail="Knowing the board matters most for the required practicals, which differ in wording and in what the examiner expects you to have done. Sessions use the specification the student is actually sitting."),
    dict(slug='liverpool', name='Liverpool', region='Merseyside',
         local="Liverpool sits on the Mersey with a long-established set of city schools and colleges, and a strong tradition of students moving into science and healthcare courses at sixteen.",
         detail="Where the goal is a science-related college course, the grade threshold is usually specific and non-negotiable. That makes the target concrete, which makes it far easier to plan backwards from."),
    dict(slug='sheffield', name='Sheffield', region='South Yorkshire',
         local="Sheffield is the largest city in South Yorkshire, close enough to Leeds to share a lot of the same educational geography without being in the same county.",
         detail="Sheffield is near enough that families sometimes ask about in person. The honest answer is that online is the sensible default at this distance and costs nothing in teaching quality — a shared screen and an annotated past paper work better than most people expect."),
    dict(slug='newcastle-upon-tyne', name='Newcastle upon Tyne', region='Tyne and Wear',
         local="Newcastle sits on the north bank of the Tyne, the centre of a wider North East region taking in Gateshead, North Tyneside and Northumberland.",
         detail="Distance from a tutor is the usual complaint here, and it is exactly the complaint online removes. The lesson is live and taught — questions asked and answered in the moment, not a recorded video handed over."),
    dict(slug='nottingham', name='Nottingham', region='Nottinghamshire',
         local="Nottingham is the largest city in the East Midlands, with schools across the city and out into the county at Beeston, West Bridgford and Arnold.",
         detail="Mocks in Nottingham schools tend to land in the same window as everywhere else, in November and again in the spring. A mock paper is the single most useful thing a student can bring to a session: it shows where the marks actually went."),
    dict(slug='leicester', name='Leicester', region='Leicestershire',
         local="Leicester is one of the most diverse cities in England, and its schools serve families speaking a wide range of first languages at home.",
         detail="Science has a vocabulary problem before it has a concept problem. A student who can do the chemistry can still lose marks because 'evaluate' and 'explain' were read as the same instruction. That is taught explicitly here."),
    dict(slug='bristol', name='Bristol', region='South West',
         local="Bristol is the largest city in the South West, with a mix of city academies, independent schools and strong sixth-form provision.",
         detail="Where students are aiming at grades 7 to 9, the marks are rarely lost on knowledge. They go on six-mark questions with no structure and on calculations where the working is not shown. Both are fixable in weeks rather than terms."),
    dict(slug='coventry', name='Coventry', region='West Midlands',
         local="Coventry sits between Birmingham and the Warwickshire towns, a city rebuilt after the war with a long engineering and manufacturing history.",
         detail="Physics is often the paper Coventry students are keenest to fix, and it is usually the maths inside it rather than the physics: choosing the equation, rearranging it, and keeping the units straight."),
    dict(slug='hull', name='Hull', region='East Yorkshire',
         local="Kingston upon Hull sits at the mouth of the Humber, at the eastern end of the M62 and about an hour and a half from Leeds.",
         detail="Hull is on the same motorway as Leeds and still too far for a weeknight session, which is precisely the case online was made for. Same teacher, same materials, no drive in the dark."),
    dict(slug='stoke-on-trent', name='Stoke-on-Trent', region='Staffordshire',
         local="Stoke-on-Trent is a city formed from six towns, with schools spread across Hanley, Burslem, Longton and the rest rather than clustered in one centre.",
         detail="Students who have changed school, or missed a run of lessons through illness or staff absence, arrive with holes rather than weaknesses. Finding the hole is the first session's job; filling it is quicker than anyone expects."),
    dict(slug='derby', name='Derby', region='Derbyshire',
         local="Derby sits on the Derwent at the southern edge of the Peak District, a city with a strong engineering employment base.",
         detail="Required practicals catch people out because they are examined in writing, not in a lab. Knowing why a variable was controlled matters more in the exam than having personally held the measuring cylinder."),
    dict(slug='southampton', name='Southampton', region='Hampshire',
         local="Southampton is a major port on the south coast, with schools across the city and the wider Hampshire area around Eastleigh and the Waterside.",
         detail="Year 11 in the spring is a scramble, and the temptation is to revise everything equally. It is far more effective to spend the time on the three topics that keep losing marks and leave the secure ones alone."),
    dict(slug='portsmouth', name='Portsmouth', region='Hampshire',
         local="Portsmouth is built largely on Portsea Island, which makes it one of the most densely populated cities in the country and keeps its schools close together.",
         detail="Small-group sessions work well where friends sit the same papers: they push each other, and explaining a topic to a friend is the fastest way to find out whether you actually understand it."),
    dict(slug='plymouth', name='Plymouth', region='Devon',
         local="Plymouth sits on the Devon and Cornwall border, a long way from most things and with a strong naval and marine science tradition.",
         detail="Geography genuinely limits tutor choice in the far South West. Online lifts that limit entirely — the pool stops being whoever is within driving distance."),
    dict(slug='reading', name='Reading', region='Berkshire',
         local="Reading sits on the Thames west of London, a commuter town large enough to be a town in its own right and well connected along the M4 corridor.",
         detail="Where parents commute, the reliable slot is often later than a tutor would normally offer. Sessions are arranged around the evening that actually exists rather than the one that would be ideal."),
    dict(slug='preston', name='Preston', region='Lancashire',
         local="Preston is the administrative centre of Lancashire, sitting on the Ribble with the wider county spread out around it.",
         detail="Students in county towns often travel a fair way to school already. Adding a drive to a tutor on top is what makes weekly support collapse by half term; removing it is what keeps it going to the exam."),
    dict(slug='sunderland', name='Sunderland', region='Tyne and Wear',
         local="Sunderland sits at the mouth of the Wear on the North East coast, south of Newcastle and with its own city schools and college provision.",
         detail="Confidence is often the thing to rebuild first. A student who has decided they are 'not a science person' will not revise, and no amount of content helps until that sentence stops being true."),
    dict(slug='norwich', name='Norwich', region='Norfolk',
         local="Norwich is the largest city in Norfolk and serves a wide rural county, so students travel in from a long way out.",
         detail="Rural East Anglia is one of the hardest places in England to find a subject-specialist tutor locally. Online is not a compromise here — it is the only way to get a former Head of Science at the kitchen table."),
    dict(slug='york', name='York', region='North Yorkshire',
         local="York sits about twenty-five miles east of Leeds, a walled city with a compact centre and schools serving both the city and the surrounding villages.",
         detail="York is close enough to Leeds that in person can sometimes be arranged; online is the default and the quicker thing to start. Ask either way and the honest answer comes back."),
    dict(slug='oxford', name='Oxford', region='Oxfordshire',
         local="Oxford's school landscape runs from long-established independents to city academies, and expectations around science grades tend to be high across all of them.",
         detail="High expectations produce a particular kind of stress: students who are doing well and still panicking. Structure helps more than reassurance — knowing exactly what a six-mark answer should contain removes the guesswork."),
    dict(slug='cambridge', name='Cambridge', region='Cambridgeshire',
         local="Cambridge sits at the centre of a strong science and technology corridor, and many families here have science in the household already.",
         detail="Knowing a subject and being able to teach it are different skills, which is why parents who are scientists themselves often still want a teacher. Twenty years of watching where marks are lost is not the same as knowing the content."),
    dict(slug='milton-keynes', name='Milton Keynes', region='Buckinghamshire',
         local="Milton Keynes is a planned city between London and Birmingham, laid out on a grid and still growing, with a young population and newer schools.",
         detail="Newer schools sometimes mean newer staff, and a class that has had three teachers in a year has almost certainly lost continuity somewhere. Finding where the thread broke is the first job."),
    dict(slug='northampton', name='Northampton', region='Northamptonshire',
         local="Northampton is the largest town in the East Midlands, sitting on the M1 between Milton Keynes and Leicester.",
         detail="Combined Science is two GCSEs and 240 guided learning hours, which is more content than most students realise they are carrying. Seeing the size of it on paper is oddly reassuring — it explains why it feels like a lot."),
    dict(slug='luton', name='Luton', region='Bedfordshire',
         local="Luton sits just north of London in Bedfordshire, closely connected to the capital by rail and with a diverse and growing school population.",
         detail="Where a student is aiming for a grade 4 or 5 to unlock a college place, every mark is worth the same and the cheapest ones are in exam technique. That is where the first sessions go."),
    dict(slug='bolton', name='Bolton', region='Greater Manchester',
         local="Bolton is one of the larger Greater Manchester towns, north-west of the city with its own centre and identity rather than a suburb of Manchester.",
         detail="Homework that is set, marked and returned with feedback is what turns a weekly hour into weekly progress. Without it, a session is a conversation the student forgets by Thursday."),
    dict(slug='stockport', name='Stockport', region='Greater Manchester',
         local="Stockport sits south-east of Manchester where the Tame and Goyt meet, on the edge of the Peak District and served by schools on both the Cheshire and Manchester sides.",
         detail="Students on the top set often coast until the first mock and then drop. Coasting is invisible until it is examined, and it is best caught in Year 10 rather than diagnosed in Year 11."),
    dict(slug='doncaster', name='Doncaster', region='South Yorkshire',
         local="Doncaster sits at the junction of the A1 and the M18 in South Yorkshire, a large town serving a wide surrounding area.",
         detail="Past-paper practice under timed conditions is the part almost everyone skips, because it is uncomfortable. It is also the part that moves a grade fastest, which is why sessions include it rather than setting it as homework."),
    dict(slug='huddersfield', name='Huddersfield', region='West Yorkshire',
         local="Huddersfield sits in the Colne Valley in Kirklees, about twenty miles south-west of Leeds, with schools across Kirklees using more than one exam board.",
         detail="Twenty miles is far enough that a weeknight round trip eats the evening on both sides. Online keeps the hour an hour, which is what makes it survive a wet February."),
    dict(slug='halifax', name='Halifax', region='West Yorkshire',
         local="Halifax is the main town of Calderdale, west of Bradford in the Pennine valleys, with students travelling in from across the surrounding hillsides.",
         detail="Calderdale families often already travel a long way for school. Adding a second journey for tuition is what makes weekly support collapse by half term; removing it is what keeps it going to the exam."),
    dict(slug='middlesbrough', name='Middlesbrough', region='North Yorkshire',
         local="Middlesbrough sits on the Tees in the North East, at the centre of the Teesside towns and with a strong industrial and chemical-processing history.",
         detail="Chemistry has a local resonance on Teesside, and it is also the paper where marks most often go missing on moles and balancing. Both are mechanical skills, and mechanical skills respond quickly to practice."),
    dict(slug='lincoln', name='Lincoln', region='Lincolnshire',
         local="Lincoln sits on a hill above a largely rural county, with students travelling in from villages across a wide area of Lincolnshire.",
         detail="A long school run plus a long tutor run is not sustainable through a whole GCSE year. Online means the hour is the hour, with nothing either side of it."),
    dict(slug='brighton', name='Brighton', region='East Sussex',
         local="Brighton and Hove sits on the South Coast, an hour from London, with a mix of city schools and a large sixth-form population.",
         detail="Students who intend to carry science to A level need the top grades rather than a pass, and the gap between the two is almost entirely in extended answers and data questions."),
    dict(slug='exeter', name='Exeter', region='Devon',
         local="Exeter is the county town of Devon, serving a wide rural catchment stretching towards Dartmoor and the coast.",
         detail="Where a school is small, a science department can be two or three people, and a single absence changes a whole term. Outside support is not a criticism of the school — it is cover for a gap nobody chose."),
    dict(slug='peterborough', name='Peterborough', region='Cambridgeshire',
         local="Peterborough sits on the East Coast Main Line in Cambridgeshire, a growing city serving a wide fenland catchment.",
         detail="Sessions are built around the gaps that are actually costing marks, which usually means starting with the last paper the student sat rather than the first topic in the specification."),
]
# ── Wales ───────────────────────────────────────────────────────────────────
# Welsh students sit GCSEs, overwhelmingly with WJEC/Eduqas, so the course
# genuinely applies. Scotland does not sit GCSEs at all — National 5 and
# Highers are a different qualification with a different specification — so no
# Scottish page exists and the copy says England and Wales throughout.
CITIES += [
    dict(slug='cardiff', name='Cardiff', region='Wales',
         local="Cardiff is the Welsh capital and its largest city, with English-medium and Welsh-medium secondary schools side by side across the city.",
         detail="Welsh schools sit WJEC and Eduqas far more often than AQA, and the paper structure and question wording differ from the English boards. Sessions follow the specification the student is actually entered for."),
    dict(slug='swansea', name='Swansea', region='Wales',
         local="Swansea sits on the south Wales coast at the edge of the Gower, serving the city and a wide surrounding area of the old industrial valleys.",
         detail="Where a student is entered for Eduqas, past papers from that board are the ones worth practising. Working through an AQA paper is better than nothing, but it is not the paper they will open in May."),
    dict(slug='newport', name='Newport', region='Wales',
         local="Newport sits on the Usk in south-east Wales, between Cardiff and the Severn crossing into England.",
         detail="Being close to the border, Newport families sometimes have children at schools on either side of it — and therefore on different boards, in different countries, with different papers. Worth establishing before anyone buys a revision guide."),
    dict(slug='wrexham', name='Wrexham', region='Wales',
         local="Wrexham is the largest town in north Wales, close to the English border near Chester and serving a wide rural catchment.",
         detail="North Wales is a hard place to find a subject-specialist science tutor within driving distance. Online is not a compromise here — it is what makes a former Head of Science available at all."),
    dict(slug='bangor', name='Bangor', region='Wales',
         local="Bangor sits on the Menai Strait in Gwynedd, a small cathedral city serving a largely Welsh-speaking part of north-west Wales.",
         detail="For students taught partly through Welsh, the science is not the obstacle — the English exam vocabulary can be. Command words get taught explicitly rather than assumed."),
]

for c in CITIES:
    c.setdefault('mode', 'online')
    c.setdefault('blurb',
                 ('GCSE science tuition in %s — in person locally, or online.' % c['name'])
                 if c['mode'] == 'both' else
                 ('Online GCSE science tuition for students in %s — live, taught sessions '
                  'with a former Head of Science.' % c['name']))
AREAS += CITIES

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
        <p style="max-width:36ch">Science made simple. Results made real. GCSE Combined Science tuition, workshops and clubs with Rod Martin — Leeds-based, and online across England and Wales.</p>
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
    where = 'Online, England &amp; Wales' if online_only else f"In person around {a['name']} · Online anywhere"
    title = (f"Online GCSE Science Tuition UK | SMARTin SCIENCE" if online_only
             else f"GCSE Science Tutor in {a['name']} | SMARTin SCIENCE")
    h1 = (f'Online GCSE science tuition, <span class="g">anywhere in England and Wales</span>' if online_only
          else f'GCSE science tuition in <span class="g">{a["name"]}</span>')
    jsonld = f'''<script type="application/ld+json">
{{"@context":"https://schema.org","@type":"EducationalOrganization",
"name":"SMARTin SCIENCE","url":"https://smartinscience.co.uk/areas/{a['slug']}",
"description":{a['blurb']!r},
"email":"rod@smartinscience.co.uk",
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
      Not on the list? <a href="{up}index.html#booking" style="color:var(--teal);font-weight:600">Ask anyway</a> — online sessions reach anywhere in England and Wales.
    </p>
  </div>
</section>
''' + footer(1) + scripts(1))

def chips(current):
    """A short, relevant list — not all fifty-six other areas.

    Printing every area on every page was fine at seventeen and is a wall of
    links at fifty-seven, which helps nobody and reads to a search engine as
    a link farm. A page shows its own kind: a Leeds page shows the rest of
    Leeds, a city page shows other cities in its part of the country, and
    every page ends with the England-and-Wales online page.
    """
    me = next(a for a in AREAS if a['slug'] == current)
    online_page = next(a for a in AREAS if a['slug'] == 'online-uk')

    if me['mode'] == 'both':
        pool = [a for a in AREAS if a['mode'] == 'both']
    else:
        # same region first, then the rest of the country, so a Cardiff page
        # leads with Wales rather than with whatever happens to be next.
        same = [a for a in AREAS if a['mode'] == 'online' and a['region'] == me['region']]
        rest = [a for a in AREAS if a['mode'] == 'online' and a['region'] != me['region']]
        pool = same + rest

    picked, out = [], []
    for a in pool:
        if a['slug'] in (current, 'online-uk'):
            continue
        picked.append(a)
        if len(picked) == 11:
            break
    if current != online_page['slug']:
        picked.append(online_page)
    for a in picked:
        out.append(f'<a class="chip" href="{a["slug"]}.html">{a["name"]}</a>')
    return '\n      '.join(out)

def areas_index():
    """Two groups, because they are two different offers.

    In person means Leeds. Everywhere else in England and Wales is online, and
    saying so plainly here is worth more than a longer list that blurs the two
    — a family in Plymouth reading "areas covered" should not have to work out
    whether anyone is driving to them.

    The Leeds places get cards because there are twelve and each has something
    to say. The rest get a plain list, grouped by region: forty-five cards is
    a wall nobody reads to the bottom of.
    """
    local = [a for a in AREAS if a['mode'] == 'both']
    online = [a for a in AREAS if a['mode'] == 'online' and a['slug'] != 'online-uk']
    anywhere = next(a for a in AREAS if a['slug'] == 'online-uk')

    cards = []
    for a in local:
        cards.append(f'''      <a class="card areacard" href="{a['slug']}.html" data-fx="reveal">
        <h3>{a['name']}</h3>
        <p>{a['blurb']}</p>
        <span class="ln">See {a['name']} →</span>
      </a>''')

    regions = []
    for a in online:
        if a['region'] not in regions:
            regions.append(a['region'])
    blocks = []
    for r in regions:
        links = '\n        '.join(
            f'<a href="{a["slug"]}.html">{a["name"]}</a>'
            for a in online if a['region'] == r)
        blocks.append(f'''      <div class="regcol">
        <h3>{r}</h3>
        <div class="arealist">
        {links}
        </div>
      </div>''')

    return (head(1, 'Areas We Cover | GCSE Science Tuition in Leeds &amp; Online | SMARTin SCIENCE',
                 'GCSE Combined Science tuition in person across Leeds, and online for students anywhere in England and Wales, with former Head of Science Rod Martin.',
                 '/areas/') + nav(1) + '''
<section class="areahero">
  <div class="orb a" aria-hidden="true"></div><div class="orb b" aria-hidden="true"></div>
  <div class="wrap" style="position:relative;z-index:2">
    <p class="crumb" data-fx="reveal"><a href="../index.html">Home</a> &rsaquo; Areas</p>
    <div style="max-width:800px">
      <span class="eyebrow" data-fx="reveal">
        <img src="../../../assets/smartin/icons/globe.png" alt="" width="18" height="18">In person in Leeds · Online across England &amp; Wales
      </span>
      <h1 style="font-size:clamp(2rem,4.6vw,3.2rem);margin:18px 0 16px" data-fx="text" data-fx-step="45">Based in Leeds. <span class="g">Teaching everywhere.</span></h1>
      <p style="color:var(--mut);font-size:1.06rem" data-fx="reveal" data-fx-delay="200">In person around Leeds, and online for students anywhere in England and Wales. Same teacher, same sessions — the only thing that changes is whether we are in the same room.</p>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="sec-head" data-fx="reveal">
      <span class="pill">In person</span>
      <h2>Around <span class="g">Leeds</span></h2>
      <p>Sessions in the room, across the city and its districts.</p>
    </div>
    <div class="grid g3">
''' + '\n'.join(cards) + '''
    </div>
  </div>
</section>

<section class="alt">
  <div class="wrap">
    <div class="sec-head" data-fx="reveal">
      <span class="pill">Online</span>
      <h2>Everywhere else in <span class="g2">England &amp; Wales</span></h2>
      <p>Live, taught sessions — not recorded videos. The same course, the same worksheets and the same marked homework, wherever the student is sitting.</p>
    </div>
    <div class="regions">
''' + '\n'.join(blocks) + '''
    </div>
    <p style="text-align:center;margin-top:34px" data-fx="reveal">
      <a class="btn btn-g" href="''' + anywhere['slug'] + '''.html">How online sessions work →</a>
    </p>
    <p style="text-align:center;margin-top:16px;color:var(--mut);font-size:.93rem">
      Not listed? <a href="../index.html#booking" style="color:var(--teal);font-weight:600">Ask anyway</a> — online reaches anywhere in England and Wales.
      Scotland is the exception: Scottish students sit National 5 and Highers rather than GCSEs.
    </p>
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
