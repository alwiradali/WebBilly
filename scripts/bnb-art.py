#!/usr/bin/env python3
"""
Bash'n'Boujee — set-up artwork.

Her Instagram photographs are the pictures that belong in the gallery, and
they are not ours to copy. Until they arrive, every tile on the page is drawn
here instead: balloon garlands, hoops, arches and stage sets rendered as SVG
in the rose-gold and blush taken straight out of her logo. They are honest
illustrations, not stock photography pretending to be her work, and because
they are vector they stay sharp on a phone and animate on the page for free.

    python3 scripts/bnb-art.py      ->  assets/bashnboujee/art/*.svg

Each scene is deterministic: the seed is the file name, so re-running this
never reshuffles a garland that has already been approved.
"""

import math
import os
import random

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   '..', 'assets', 'bashnboujee', 'art')

W, H = 1200, 900

# Straight out of the logo: the plate colour and the rose gold of the script.
CREAM = '#f4e3dc'
ROSE = '#ac6e59'


def esc(n):
    return round(n, 2)


# ---------------------------------------------------------------- balloons

def balloon(x, y, r, colour, hi, rot=0, matte=False, idp=''):
    """One balloon: the body, its neck, and the highlight that sells the latex."""
    gid = f'g{idp}'
    body = (
        f'<g transform="translate({esc(x)},{esc(y)}) rotate({esc(rot)})">'
        f'<path d="M0,{esc(r * 1.02)} l{esc(-r * 0.10)},{esc(r * 0.17)} '
        f'l{esc(r * 0.20)},0 Z" fill="{colour}" opacity=".85"/>'
        f'<ellipse cx="0" cy="0" rx="{esc(r)}" ry="{esc(r * 1.06)}" fill="url(#{gid})"/>'
    )
    if not matte:
        body += (
            f'<ellipse cx="{esc(-r * 0.33)}" cy="{esc(-r * 0.36)}" '
            f'rx="{esc(r * 0.20)}" ry="{esc(r * 0.30)}" fill="{hi}" '
            f'opacity=".55" transform="rotate(-18 {esc(-r * 0.33)} {esc(-r * 0.36)})"/>'
            f'<ellipse cx="{esc(r * 0.40)}" cy="{esc(r * 0.30)}" '
            f'rx="{esc(r * 0.13)}" ry="{esc(r * 0.22)}" fill="{hi}" opacity=".20"/>'
        )
    body += '</g>'
    grad = (
        f'<radialGradient id="{gid}" cx="34%" cy="30%" r="78%">'
        f'<stop offset="0%" stop-color="{hi}"/>'
        f'<stop offset="52%" stop-color="{colour}"/>'
        f'<stop offset="100%" stop-color="{shade(colour, -.22)}"/>'
        f'</radialGradient>'
    )
    return body, grad


def hexrgb(c):
    c = c.lstrip('#')
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def shade(c, amt):
    """amt < 0 darkens, > 0 lightens."""
    r, g, b = hexrgb(c)
    if amt >= 0:
        f = lambda v: int(v + (255 - v) * amt)
    else:
        f = lambda v: int(v * (1 + amt))
    return '#%02x%02x%02x' % (max(0, min(255, f(r))),
                              max(0, min(255, f(g))),
                              max(0, min(255, f(b))))


def garland(rng, pts, palette, big=54, small=26, density=1.0, idp=''):
    """
    An organic balloon garland threaded along `pts`.

    Real garlands are not a neat row of one size: they are clusters of four
    or five large balloons with the small ones tucked into the gaps. That is
    what the jitter here is doing — not noise for its own sake.
    """
    out, grads = [], []
    n = 0
    step = max(1, int(round(1 / density)))
    for i in range(0, len(pts), step):
        x, y = pts[i]
        t = i / max(1, len(pts) - 1)
        # the garland swells in the middle and tapers at both tails
        swell = 0.55 + 0.45 * math.sin(math.pi * min(1, max(0, t)))
        for _ in range(rng.choice([2, 3, 3, 4])):
            r = rng.uniform(small, big) * swell
            ang = rng.uniform(0, math.tau)
            spread = rng.uniform(0.25, 1.0) * big * 0.95
            bx = x + math.cos(ang) * spread
            by = y + math.sin(ang) * spread * 0.78
            col = rng.choice(palette)
            n += 1
            b, g = balloon(bx, by, r, col, shade(col, .45),
                           rot=rng.uniform(-22, 22),
                           matte=rng.random() < .35, idp=f'{idp}{n}')
            out.append((r, b))
            grads.append(g)
    # biggest at the back so the small ones read as tucked in
    out.sort(key=lambda p: -p[0])
    return ''.join(b for _, b in out), ''.join(grads)


def arc_pts(cx, cy, r, a0, a1, n):
    return [(cx + r * math.cos(a), cy + r * math.sin(a))
            for a in (a0 + (a1 - a0) * i / (n - 1) for i in range(n))]


def bez_pts(p0, p1, p2, n):
    out = []
    for i in range(n):
        t = i / (n - 1)
        u = 1 - t
        out.append((u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
                    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]))
    return out


# ---------------------------------------------------------------- florals

def bloom(x, y, r, petal, centre, petals=7, rot=0, idp=''):
    p = []
    for i in range(petals):
        a = rot + i * math.tau / petals
        px, py = x + math.cos(a) * r * .52, y + math.sin(a) * r * .52
        p.append(f'<ellipse cx="{esc(px)}" cy="{esc(py)}" rx="{esc(r * .55)}" '
                 f'ry="{esc(r * .34)}" fill="{petal}" opacity=".95" '
                 f'transform="rotate({esc(math.degrees(a))} {esc(px)} {esc(py)})"/>')
    p.append(f'<circle cx="{esc(x)}" cy="{esc(y)}" r="{esc(r * .30)}" fill="{centre}"/>')
    return ''.join(p)


def foliage(rng, x, y, r, colour):
    out = []
    for _ in range(rng.randint(3, 6)):
        a = rng.uniform(0, math.tau)
        lx, ly = x + math.cos(a) * r, y + math.sin(a) * r
        out.append(f'<ellipse cx="{esc(lx)}" cy="{esc(ly)}" rx="{esc(r * .72)}" '
                   f'ry="{esc(r * .26)}" fill="{colour}" opacity=".8" '
                   f'transform="rotate({esc(math.degrees(a))} {esc(lx)} {esc(ly)})"/>')
    return ''.join(out)


# ---------------------------------------------------------------- staging

def room(wall_a, wall_b, floor, skirting=True):
    """The wall, the floor and the soft pool of light every set-up is shot in."""
    s = (
        f'<rect width="{W}" height="{H}" fill="url(#wall)"/>'
        f'<ellipse cx="{W * .5}" cy="{H * .62}" rx="{W * .52}" ry="{H * .46}" '
        f'fill="#fff" opacity=".22"/>'
        f'<rect y="{H - 132}" width="{W}" height="132" fill="{floor}"/>'
    )
    if skirting:
        s += f'<rect y="{H - 140}" width="{W}" height="12" fill="#fff" opacity=".55"/>'
    defs = (
        f'<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0%" stop-color="{wall_a}"/>'
        f'<stop offset="100%" stop-color="{wall_b}"/></linearGradient>'
    )
    return s, defs


def hoop(cx, cy, r, colour, width=13):
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{colour}" '
            f'stroke-width="{width}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" '
            f'stroke="{shade(colour, .5)}" stroke-width="{width * .34}" '
            f'stroke-dasharray="{r * .9} {r * 2.4}" opacity=".7"/>'
            f'<rect x="{esc(cx - r * .30)}" y="{esc(cy + r - 6)}" width="{esc(r * .60)}" '
            f'height="14" rx="7" fill="{shade(colour, -.18)}"/>')


def svg(body, defs, extra_style=''):
    """Wrap a scene. The float/shimmer lives inside the file so the tiles are
    alive even though the page loads them as plain <img>."""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        f'width="{W}" height="{H}" role="img">'
        f'<defs>{defs}</defs>'
        f'<style>'
        f'@media (prefers-reduced-motion:no-preference){{'
        f'.fl{{animation:fl 7s ease-in-out infinite}}'
        f'.fl2{{animation:fl 9s ease-in-out infinite reverse}}'
        f'.tw{{animation:tw 4.5s ease-in-out infinite}}'
        f'}}'
        f'@keyframes fl{{0%,100%{{transform:translateY(0)}}50%{{transform:translateY(-9px)}}}}'
        f'@keyframes tw{{0%,100%{{opacity:.35}}50%{{opacity:1}}}}'
        f'{extra_style}'
        f'</style>'
        f'{body}</svg>'
    )


def write(name, markup):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.normpath(os.path.join(OUT, name))
    with open(path, 'w') as f:
        f.write(markup)
    print(f'  {name}  {len(markup) // 1024}kb')


# ---------------------------------------------------------------- scenes

def scene_hoop_birthday():
    """The rose-gold hoop with a half garland — her signature set-up."""
    rng = random.Random('hoop-birthday')
    pal = ['#c9797f', '#e8b9bd', '#f0d8d4', '#ac6e59', '#d9a38c', '#f7efe9']
    body, defs = room('#fbf2ee', '#f2ddd6', '#e8d3c9')
    cx, cy, r = 600, 430, 300
    body += hoop(cx, cy, r, '#c08a4e')
    g, gd = garland(rng, arc_pts(cx, cy, r, math.radians(200), math.radians(20), 17),
                    pal, big=52, small=22, idp='a')
    body += f'<g class="fl">{g}</g>'
    defs += gd
    # the floor cluster the hoop stands in
    g2, gd2 = garland(rng, [(300, 760), (360, 776), (430, 764)], pal,
                      big=44, small=20, idp='b')
    body += g2
    defs += gd2
    g3, gd3 = garland(rng, [(880, 762), (940, 778)], pal, big=40, small=18, idp='c')
    body += g3
    defs += gd3
    # the neon sign inside the hoop
    body += (
        f'<g class="tw" filter="url(#glow)">'
        f'<text x="{cx}" y="{cy - 6}" text-anchor="middle" '
        f'font-family="Georgia,\'Times New Roman\',serif" '
        f'font-style="italic" font-size="98" fill="#fff3ea" stroke="#e0705a" '
        f'stroke-width="5" stroke-linejoin="round" paint-order="stroke">Happy</text>'
        f'<text x="{cx}" y="{cy + 86}" text-anchor="middle" '
        f'font-family="Georgia,\'Times New Roman\',serif" '
        f'font-style="italic" font-size="98" fill="#fff3ea" stroke="#e0705a" '
        f'stroke-width="5" stroke-linejoin="round" paint-order="stroke">Birthday</text>'
        f'</g>'
    )
    defs += ('<filter id="glow" x="-30%" y="-60%" width="160%" height="220%">'
             '<feGaussianBlur stdDeviation="13" result="b"/>'
             '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/>'
             '</feMerge></filter>')
    return svg(body, defs)


def scene_mehndi():
    """A mehndi stage: marigold garlands, drapes and low seating."""
    rng = random.Random('mehndi')
    pal = ['#e8a33c', '#d8862a', '#f2c35e', '#c9553f', '#e9d3a3', '#b8452f']
    body, defs = room('#fff6e7', '#f7e4c6', '#e6cfae', skirting=False)
    # drapes
    for i in range(7):
        x = 40 + i * 180
        body += (f'<path d="M{x},0 q{esc(60)},{esc(300 + i % 3 * 60)} 0,{H - 120} '
                 f'l90,0 q-60,-{esc(300 + i % 3 * 60)} 0,-{H - 120} Z" '
                 f'fill="#fff" opacity="{.28 + (i % 3) * .07}"/>')
    # gold hanging strings
    for i in range(22):
        x = 30 + i * 53
        body += (f'<line x1="{x}" y1="0" x2="{esc(x + 8)}" y2="300" '
                 f'stroke="#d8ae63" stroke-width="1.6" opacity=".55"/>')
        for k in range(4):
            body += (f'<circle cx="{esc(x + 2 + k * 2)}" cy="{esc(70 + k * 62)}" r="5" '
                     f'fill="#e8b953" opacity=".8"/>')
    # marigold swag across the top
    pts = bez_pts((60, 150), (600, 360), (1140, 150), 15)
    g, gd = garland(rng, pts, pal, big=34, small=15, idp='m')
    body += f'<g class="fl2">{g}</g>'
    defs += gd
    for i, (x, y) in enumerate(pts):
        if i % 2 == 0:
            body += bloom(x, y + 34, 26, '#f0b73f', '#c9553f', 8, rot=i, idp=f'f{i}')
    # the seat
    body += (
        f'<rect x="330" y="600" width="540" height="40" rx="14" fill="#c9553f" opacity=".9"/>'
        f'<rect x="352" y="560" width="496" height="52" rx="22" fill="#e9d3a3"/>'
        f'<rect x="300" y="636" width="600" height="132" fill="#d8b98a" opacity=".55"/>'
    )
    for i in range(5):
        body += (f'<rect x="{esc(380 + i * 90)}" y="520" width="72" height="48" rx="16" '
                 f'fill="#f2c35e" opacity=".92"/>')
    # petals on the floor
    for _ in range(40):
        x, y = rng.uniform(200, 1000), rng.uniform(780, 890)
        body += (f'<ellipse cx="{esc(x)}" cy="{esc(y)}" rx="13" ry="7" '
                 f'fill="{rng.choice(pal)}" opacity=".75" '
                 f'transform="rotate({esc(rng.uniform(0, 180))} {esc(x)} {esc(y)})"/>')
    return svg(body, defs)


def scene_flower_arch():
    """A white-and-blush flower arch for an engagement."""
    rng = random.Random('flower-arch')
    body, defs = room('#fdf7f4', '#f5e6e0', '#ead8d0')
    cx, cy, r = 600, 690, 360
    # the arch frame
    body += (f'<path d="M{cx - r},{H - 130} L{cx - r},{esc(cy - r * .1)} '
             f'A{r},{r} 0 0 1 {cx + r},{esc(cy - r * .1)} L{cx + r},{H - 130}" '
             f'fill="none" stroke="#e6d2c4" stroke-width="16" stroke-linecap="round"/>')
    pts = (arc_pts(cx, cy - r * .1, r, math.pi, math.radians(345), 13)
           + [(cx + r, cy - r * .1 + i * 62) for i in range(1, 4)]
           + [(cx - r, cy - r * .1 + i * 62) for i in range(1, 3)])
    blooms = []
    for i, (x, y) in enumerate(pts):
        for _ in range(rng.randint(3, 6)):
            bx = x + rng.uniform(-46, 46)
            by = y + rng.uniform(-40, 40)
            rr = rng.uniform(22, 46)
            petal = rng.choice(['#ffffff', '#f7e3dd', '#eec3bb', '#f9f1ec', '#dfa190'])
            blooms.append((rr, foliage(rng, bx, by, rr * .95, '#bcc8a8')
                           + bloom(bx, by, rr, petal, '#e0b487',
                                   rng.randint(6, 9), rot=rng.uniform(0, 3), idp=f'a{i}')))
    blooms.sort(key=lambda p: -p[0])
    body += f'<g class="fl">{"".join(b for _, b in blooms)}</g>'
    # greenery trailing off the two legs only — never across the empty middle
    for x in (cx - r, cx + r):
        for k in range(3):
            body += (f'<path d="M{esc(x + k * 9 - 9)},{esc(cy + 80 + k * 30)} '
                     f'q26,70 -6,150" fill="none" stroke="#bcc8a8" '
                     f'stroke-width="3" opacity=".55"/>')
    body += (f'<ellipse cx="{cx}" cy="{H - 118}" rx="330" ry="26" fill="#000" opacity=".06"/>')
    return svg(body, defs)


def scene_garland_wall():
    """A garland running up a corner wall — the one that fits any front room."""
    rng = random.Random('garland-wall')
    pal = ['#f0d8d4', '#f7efe9', '#d9a38c', '#e8bdae', '#c9797f', '#ac6e59']
    body, defs = room('#faf1ed', '#f0ded6', '#e5d0c6')
    pts = bez_pts((80, 820), (300, 120), (1120, 260), 18)
    g, gd = garland(rng, pts, pal, big=58, small=24, idp='w')
    body += f'<g class="fl">{g}</g>'
    defs += gd
    # eucalyptus threaded through
    for i, (x, y) in enumerate(pts):
        if i % 3 == 0:
            body += foliage(rng, x, y, 40, '#b9c6ab')
    # a plinth with a cake, because that is what it is usually framing
    # a plinth, a two-tier cake and a lit candle
    body += (
        f'<path d="M524,770 L536,592 L674,592 L686,770 Z" fill="#fffaf7"/>'
        f'<path d="M524,770 L536,592 L605,592 L605,770 Z" fill="#f4e6df" opacity=".7"/>'
        f'<ellipse cx="605" cy="592" rx="69" ry="13" fill="#f1ded5"/>'
        f'<rect x="552" y="500" width="106" height="92" rx="8" fill="#fdf4f0"/>'
        f'<path d="M552,524 q26,16 53,0 q27,-16 53,0 l0,-24 l-106,0 Z" fill="#e8bdae"/>'
        f'<rect x="572" y="446" width="66" height="56" rx="6" fill="#fdf4f0"/>'
        f'<path d="M572,462 q16,12 33,0 q17,-12 33,0 l0,-16 l-66,0 Z" fill="#e8bdae"/>'
        f'<rect x="601" y="424" width="8" height="24" rx="4" fill="#c08a4e"/>'
        f'<ellipse cx="605" cy="418" rx="6" ry="11" fill="#f3c46a" class="tw"/>'
        f'<ellipse cx="605" cy="778" rx="128" ry="18" fill="#000" opacity=".07"/>'
    )
    return svg(body, defs)


def scene_kids():
    """Two garland-topped plinths, a number balloon and a helium cloud —
    the baby shower / children's birthday set-up."""
    rng = random.Random('kids-v2')
    pal = ['#f7efe9', '#f0d8d4', '#e8bdae', '#d9a38c', '#c9797f', '#ffffff', '#c08a4e']
    body, defs = room('#fdf6f3', '#f3e3dd', '#e9d7ce')

    # the two plinths, each wearing a small garland
    for i, cx in enumerate((250, 950)):
        top = 400 + i * 40
        body += (f'<ellipse cx="{cx}" cy="{H - 126}" rx="104" ry="20" '
                 f'fill="#000" opacity=".07"/>'
                 f'<path d="M{esc(cx - 66)},{H - 132} L{esc(cx - 52)},{esc(top)} '
                 f'L{esc(cx + 52)},{esc(top)} L{esc(cx + 66)},{H - 132} Z" fill="#fffaf7"/>'
                 f'<path d="M{esc(cx - 66)},{H - 132} L{esc(cx - 52)},{esc(top)} '
                 f'L{cx},{esc(top)} L{cx},{H - 132} Z" fill="#f2e2da" opacity=".75"/>'
                 f'<ellipse cx="{cx}" cy="{esc(top)}" rx="52" ry="11" fill="#eedbd2"/>')
        g, gd = garland(rng, [(cx - 12, top - 26), (cx + 16, top - 74),
                              (cx - 6, top - 120)], pal,
                        big=40, small=17, idp=f'k{i}')
        body += f'<g class="fl">{g}</g>'
        defs += gd

    # helium cloud, each balloon on its own curling ribbon
    for i in range(16):
        x = 400 + (i * 61) % 400 + rng.uniform(-22, 22)
        y = 120 + (i * 47) % 210
        col = rng.choice(pal)
        r = rng.uniform(26, 44)
        body += (f'<path d="M{esc(x)},{esc(y + r + 6)} q{esc(rng.uniform(-34, 34))},120 '
                 f'{esc(rng.uniform(-18, 18))},250" fill="none" stroke="#d8bfb1" '
                 f'stroke-width="2" opacity=".65"/>')
        b, gd = balloon(x, y, r, col, shade(col, .45), rot=rng.uniform(-14, 14),
                        matte=rng.random() < .3, idp=f'h{i}')
        body += f'<g class="fl2">{b}</g>'
        defs += gd

    # the big rose-gold number, the thing everyone photographs the cake next to
    defs += ('<linearGradient id="num" x1="0" y1="0" x2="0" y2="1">'
             '<stop offset="0%" stop-color="#e0ad8a"/>'
             '<stop offset="40%" stop-color="#bd8149"/>'
             '<stop offset="100%" stop-color="#8e5c33"/></linearGradient>')
    body += (f'<g class="fl"><text x="600" y="700" text-anchor="middle" '
             f'font-family="Georgia,serif" font-weight="bold" font-size="300" '
             f'fill="url(#num)">1</text>'
             f'<ellipse cx="556" cy="470" rx="26" ry="44" fill="#fff" opacity=".28"/></g>')

    # a low table of favours under it
    body += (f'<rect x="430" y="716" width="340" height="16" rx="8" fill="#eedbd2"/>'
             f'<rect x="446" y="732" width="18" height="36" fill="#e6d2c8"/>'
             f'<rect x="736" y="732" width="18" height="36" fill="#e6d2c8"/>')
    for i in range(5):
        x = 470 + i * 62
        body += (f'<rect x="{esc(x)}" y="676" width="42" height="40" rx="6" '
                 f'fill="#fdf4f0" stroke="#e8cfc3" stroke-width="2"/>'
                 f'<rect x="{esc(x + 17)}" y="676" width="8" height="40" fill="#e8bdae"/>')
    return svg(body, defs)


def scene_stage():
    """A full stage set for an engagement or a nikkah."""
    rng = random.Random('stage')
    pal = ['#f7efe9', '#f0d8d4', '#d9a38c', '#ac6e59', '#ffffff', '#c08a4e']
    body, defs = room('#fbf5f2', '#f1e2dc', '#e7d6cd', skirting=False)
    # backdrop panels
    body += (f'<rect x="180" y="90" width="840" height="640" rx="420" fill="#fff" opacity=".72"/>'
             f'<rect x="230" y="140" width="740" height="590" rx="370" fill="none" '
             f'stroke="#e2c9b8" stroke-width="5"/>')
    # drapes either side
    for x, flip in ((150, 1), (1050, -1)):
        body += (f'<path d="M{x},0 q{esc(120 * flip)},420 {esc(20 * flip)},{H - 120} '
                 f'l{esc(-130 * flip)},0 q{esc(60 * flip)},-420 {esc(-10 * flip)},-{H - 120} Z" '
                 f'fill="#fff" opacity=".55"/>')
    # garland framing the arch
    pts = arc_pts(600, 510, 420, math.radians(196), math.radians(344), 14)
    g, gd = garland(rng, pts, pal, big=50, small=22, idp='s')
    body += f'<g class="fl">{g}</g>'
    defs += gd
    for i, (x, y) in enumerate(pts):
        if i % 2:
            body += bloom(x, y, 30, '#ffffff', '#e0b487', 7, rot=i, idp=f'sb{i}')
    # the two chairs
    for cx in (500, 700):
        body += (f'<rect x="{esc(cx - 62)}" y="560" width="124" height="180" rx="16" '
                 f'fill="#f6ece6" stroke="#e0cabd" stroke-width="3"/>'
                 f'<rect x="{esc(cx - 62)}" y="430" width="124" height="150" rx="62" '
                 f'fill="#f9f2ee" stroke="#e0cabd" stroke-width="3"/>')
    body += (f'<rect x="300" y="740" width="600" height="28" rx="8" fill="#e8d5c9"/>')
    # candles
    for i in range(6):
        x = 250 + i * 140
        body += (f'<rect x="{esc(x)}" y="{esc(690 - (i % 3) * 30)}" width="16" '
                 f'height="{esc(56 + (i % 3) * 30)}" rx="8" fill="#fff"/>'
                 f'<ellipse cx="{esc(x + 8)}" cy="{esc(684 - (i % 3) * 30)}" rx="6" ry="11" '
                 f'fill="#f3c46a" class="tw"/>')
    return svg(body, defs)


def scene_hero():
    """The hero band: a wide garland with room for the logo to sit in."""
    rng = random.Random('hero')
    pal = ['#f7efe9', '#f3e2dc', '#f0d8d4', '#e8bdae', '#d9a38c', '#e2b6ae',
           '#c9797f', '#c08a4e']
    defs = ''
    body = ''
    left = bez_pts((-60, 200), (110, 620), (200, 920), 9)
    right = bez_pts((1260, 200), (1090, 620), (1000, 920), 9)
    for i, pts in enumerate((left, right)):
        g, gd = garland(rng, pts, pal, big=58, small=22, idp=f'x{i}')
        body += f'<g class="{"fl" if i else "fl2"}">{g}</g>'
        defs += gd
        for (x, y) in pts[::3]:
            body += foliage(rng, x, y, 38, '#c6d0b6')
    # Nothing in the middle. The logo's blush plate is opaque and would slice
    # a straight edge through anything that drifted behind it; the floating
    # balloons are the page's own, and they are kept out of the centre too.
    return svg(body, defs)


SCENES = {
    'hoop-birthday.svg': scene_hoop_birthday,
    'mehndi.svg': scene_mehndi,
    'flower-arch.svg': scene_flower_arch,
    'garland-wall.svg': scene_garland_wall,
    'kids.svg': scene_kids,
    'stage.svg': scene_stage,
    'hero-garland.svg': scene_hero,
}

if __name__ == '__main__':
    print('Bash\'n\'Boujee artwork ->', os.path.normpath(OUT))
    for name, fn in SCENES.items():
        write(name, fn())
