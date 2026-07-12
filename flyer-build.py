#!/usr/bin/env python3
import base64, pathlib
SP = pathlib.Path("/tmp/claude-0/-home-user-WebBilly/e07a0f09-b2dd-5567-9605-bf050f1d16c0/scratchpad")
FILES = SP / "node_modules"
def b64(p):
    return base64.b64encode((FILES / p).read_bytes()).decode()
sg500 = b64("@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff2")
sg700 = b64("@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2")
in400 = b64("@fontsource/inter/files/inter-latin-400-normal.woff2")
in600 = b64("@fontsource/inter/files/inter-latin-600-normal.woff2")
B = "http://localhost:4231"  # local server rooted at repo

FONTS = f"""
@font-face{{font-family:'SG';font-weight:500;src:url(data:font/woff2;base64,{sg500}) format('woff2')}}
@font-face{{font-family:'SG';font-weight:700;src:url(data:font/woff2;base64,{sg700}) format('woff2')}}
@font-face{{font-family:'IN';font-weight:400;src:url(data:font/woff2;base64,{in400}) format('woff2')}}
@font-face{{font-family:'IN';font-weight:600;src:url(data:font/woff2;base64,{in600}) format('woff2')}}
"""

CSS = FONTS + f"""
*{{box-sizing:border-box;margin:0;padding:0}}
body{{background:#222}}
.page{{width:874px;height:1240px;overflow:hidden;position:relative;background:#050912;color:#eaf2ff;
  font-family:'IN',system-ui,sans-serif}}
.bg{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}}
.scrim{{position:absolute;inset:0;z-index:1}}
.pad{{position:relative;z-index:2;height:100%;padding:58px 58px;display:flex;flex-direction:column}}
.sg{{font-family:'SG',sans-serif}}
.g{{background:linear-gradient(100deg,#2b7fff,#22d3ee 55%,#7cc4ff);-webkit-background-clip:text;background-clip:text;color:transparent}}
.gold{{color:#fbbf24;letter-spacing:2px}}

/* FRONT */
.top{{display:flex;align-items:center;justify-content:space-between}}
.logo{{height:60px;width:auto;object-fit:contain;display:block}}
.loc{{font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:#8fb3ff;font-weight:600}}
.kick{{margin-top:34px;font-size:15px;letter-spacing:.26em;text-transform:uppercase;color:#22d3ee;font-weight:600}}
h1{{font-family:'SG';font-weight:700;font-size:60px;line-height:1.0;letter-spacing:-.02em;margin-top:16px;color:#fff}}
.sub{{margin-top:18px;font-size:20px;line-height:1.5;color:#c7d5f0;max-width:640px}}
.stars-row{{margin-top:16px;display:inline-flex;align-items:center;gap:10px;font-size:15px;color:#c7d5f0;font-weight:600}}
.offer{{margin-top:22px;border:1px solid rgba(43,127,255,.4);border-radius:20px;
  background:linear-gradient(100deg,rgba(43,127,255,.16),rgba(34,211,238,.09));padding:26px 28px}}
.offer .o1{{font-family:'SG';font-weight:700;font-size:30px;color:#fff}}
.offer .o1 em{{font-style:normal;color:#22d3ee}}
.offer .o2{{margin-top:8px;font-size:19px;color:#dbe6ff}}
.offer .pill{{display:inline-block;margin-top:14px;font-size:15px;font-weight:700;color:#04213f;
  background:linear-gradient(100deg,#7cc4ff,#22d3ee);padding:8px 18px;border-radius:999px}}
.foot{{margin-top:auto;display:flex;align-items:center;gap:26px}}
.qr{{width:150px;height:150px;border-radius:16px;background:#fff;padding:12px;flex-shrink:0}}
.qr img{{width:100%;height:100%;display:block}}
.ftxt .web{{font-family:'SG';font-weight:700;font-size:24px;color:#fff}}
.ftxt .web b{{color:#22d3ee}}
.ftxt .line{{margin-top:8px;font-size:17px;color:#c7d5f0}}
.ftxt .rate{{margin-top:8px;font-size:15px;color:#fbbf24;font-weight:700;letter-spacing:.02em}}

/* BACK */
.bh{{font-family:'SG';font-weight:700;font-size:44px;line-height:1.05;letter-spacing:-.02em;color:#fff}}
.bsub{{margin-top:14px;font-size:18px;color:#c7d5f0;max-width:640px}}
.svc{{margin-top:30px;display:grid;grid-template-columns:1fr 1fr;gap:16px 24px}}
.svc .item{{display:flex;gap:12px;align-items:flex-start}}
.svc .ic{{width:34px;height:34px;border-radius:9px;flex-shrink:0;display:grid;place-items:center;
  font-size:17px;background:linear-gradient(135deg,#2b7fff,#22d3ee);color:#fff;font-weight:700}}
.svc .it{{font-family:'SG';font-weight:500;font-size:19px;color:#fff;line-height:1.15}}
.svc .id{{font-size:14px;color:#9fb0d0;margin-top:2px}}
.newband{{margin-top:26px;border:1px solid rgba(124,92,255,.45);border-radius:18px;padding:22px 24px;
  background:linear-gradient(100deg,rgba(124,92,255,.18),rgba(34,211,238,.08))}}
.newband .nt{{font-family:'SG';font-weight:700;font-size:22px;color:#fff}}
.newband .nt span{{color:#c4b5fd}}
.newband .nd{{margin-top:6px;font-size:16px;color:#dbe6ff}}
.steps{{margin-top:26px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}}
.step{{text-align:center}}
.step .n{{width:44px;height:44px;border-radius:50%;margin:0 auto 10px;display:grid;place-items:center;
  font-family:'SG';font-weight:700;font-size:18px;color:#04213f;background:linear-gradient(135deg,#7cc4ff,#22d3ee)}}
.step b{{font-family:'SG';font-size:17px;color:#fff;display:block}}
.step span{{font-size:13.5px;color:#9fb0d0;display:block;margin-top:3px;line-height:1.35}}
.quote{{margin-top:26px;border-left:3px solid #22d3ee;padding:4px 0 4px 20px}}
.quote .qs{{color:#fbbf24;font-size:18px;letter-spacing:3px}}
.quote p{{font-family:'SG';font-weight:500;font-style:italic;font-size:19px;line-height:1.35;margin-top:8px;color:#eef4ff}}
.quote .who{{margin-top:8px;font-size:14px;color:#9fb0d0}}
.cta{{margin-top:20px;display:flex;align-items:center;gap:24px;padding-top:4px}}
.backbrand{{margin-top:auto;padding-top:20px}}
.backbrand .brandlock{{justify-content:center}}
.backbrand .bmark{{height:46px}}
.backbrand .bname{{font-size:26px;text-align:center}}
.backbrand .bname i{{letter-spacing:.3em}}
.cta .big{{font-family:'SG';font-weight:700;font-size:26px;line-height:1.1;color:#fff}}
.cta .big em{{font-style:normal;color:#22d3ee}}
.cta .lines{{margin-top:8px;font-size:16px;color:#c7d5f0;line-height:1.6}}
.cta .lines b{{color:#fff}}

/* brand lockup (real 'Billy Digitals' name) */
.brandlock{{display:flex;align-items:center;gap:15px}}
.bmark{{height:60px;width:auto;display:block;filter:drop-shadow(0 5px 16px rgba(34,211,238,.45))}}
.bname{{font-family:'SG';font-weight:700;font-size:33px;letter-spacing:-.015em;color:#fff;line-height:1}}
.bname b{{font-weight:700;background:linear-gradient(100deg,#5cc6ff,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent}}
.bname i{{display:block;font-family:'IN';font-style:normal;font-weight:600;font-size:11px;letter-spacing:.34em;
  text-transform:uppercase;color:#7f93bd;margin-top:6px}}

/* gold hairline accent */
.foil{{height:2px;border:0;background:linear-gradient(90deg,transparent,rgba(251,191,36,.75),rgba(92,198,255,.4),transparent)}}

/* results card — web analytics growth graph */
.result{{margin-top:24px;border:1px solid rgba(120,180,255,.24);border-radius:18px;overflow:hidden;
  background:linear-gradient(180deg,rgba(13,20,40,.9),rgba(8,12,26,.9));box-shadow:0 22px 54px rgba(0,0,0,.55)}}
.result .rbar{{display:flex;align-items:center;gap:8px;padding:12px 16px;background:rgba(7,12,26,.94);border-bottom:1px solid rgba(120,180,255,.14)}}
.result .rbar .rd{{width:9px;height:9px;border-radius:50%;background:#2b3a5e}}
.result .rbar b{{margin-left:8px;font-size:13px;color:#8ea6d6;font-weight:600;letter-spacing:.02em}}
.result .rbar .live{{margin-left:auto;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#37d67a}}
.result .rbody{{display:flex;align-items:center;gap:24px;padding:20px 22px 22px}}
.result .rstat{{flex-shrink:0}}
.result .rnum{{font-family:'SG';font-weight:700;font-size:44px;color:#22d3ee;line-height:1}}
.result .rlbl{{font-size:14.5px;color:#c7d5f0;margin-top:6px;line-height:1.32}}
.result .chart{{flex:1;height:104px;display:block}}
"""

def icon(t): return f'<span class="ic">{t}</span>'

FRONT = f"""
<section class="page front">
  <img class="bg" src="{B}/assets/flyer-orb.png" alt="">
  <div class="scrim" style="background:linear-gradient(180deg,rgba(5,9,18,.72),rgba(5,9,18,.32) 30%,rgba(5,9,18,.55) 62%,rgba(5,9,18,.95))"></div>
  <div class="pad">
    <div class="top">
      <div class="brandlock">
        <img class="bmark" src="{B}/assets/logo-billy-icon.png" alt="">
        <span class="bname">Billy <b>Digitals</b><i>Web · SEO · Advertising</i></span>
      </div>
      <span class="loc">Manchester · UK</span>
    </div>
    <p class="kick">Web Design · SEO · Advertising</p>
    <h1>Websites that<br><span class="g">win you customers</span>.</h1>
    <p class="sub">Bespoke, lightning-fast websites — designed to look the part, get you found on Google, and turn visitors into enquiries.</p>
    <span class="stars-row"><span class="gold">★★★★★</span> Rated 5.0 on Google</span>

    <div class="result">
      <div class="rbar"><span class="rd"></span><span class="rd"></span><span class="rd"></span><b>billydigitals.com · Analytics</b><span class="live">● Live</span></div>
      <div class="rbody">
        <div class="rstat"><div class="rnum">3&times;</div><div class="rlbl">more enquiries<br>within 90 days</div></div>
        <svg class="chart" viewBox="0 0 360 104" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22d3ee" stop-opacity=".5"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></linearGradient>
            <linearGradient id="ln" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2b7fff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient>
          </defs>
          <line x1="0" y1="52" x2="360" y2="52" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
          <line x1="0" y1="26" x2="360" y2="26" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
          <path d="M4,90 C46,84 74,76 116,68 C168,57 196,48 244,38 C296,27 330,18 356,10 L356,104 L4,104 Z" fill="url(#ar)"/>
          <path d="M4,90 C46,84 74,76 116,68 C168,57 196,48 244,38 C296,27 330,18 356,10" fill="none" stroke="url(#ln)" stroke-width="3.6" stroke-linecap="round"/>
          <circle cx="356" cy="10" r="10" fill="#22d3ee" opacity=".26"/><circle cx="356" cy="10" r="5.5" fill="#22d3ee"/>
        </svg>
      </div>
    </div>

    <div class="offer">
      <div class="o1"><em>£100 OFF</em> your new website</div>
      <div class="o2">Pay in 3 · interest-free — spread the cost, no extra to pay.</div>
      <span class="pill">Offer ends 31 July</span>
    </div>
    <div class="foot">
      <div class="qr"><img src="{B}/assets/flyer-qr.png" alt="QR"></div>
      <div class="ftxt">
        <div class="web"><b>billydigitals.com</b></div>
        <div class="line">WhatsApp 07519 022117 · hello@billydigitals.com</div>
        <div class="rate">★★★★★ Rated 5.0 on Google · Scan to see our work</div>
      </div>
    </div>
  </div>
</section>
"""

BACK = f"""
<section class="page back">
  <img class="bg" src="{B}/assets/flyer-orb.png" alt="" style="transform:scaleY(-1);opacity:.85">
  <div class="scrim" style="background:linear-gradient(180deg,rgba(5,9,18,.9),rgba(5,9,18,.82) 40%,rgba(5,9,18,.92))"></div>
  <div class="pad">
    <h2 class="bh">Everything to grow<br>your business online.</h2>
    <p class="bsub">One team, end to end — from a stunning website to the ads and SEO that bring customers to your door.</p>
    <div class="svc">
      <div class="item">{icon('◆')}<div><div class="it">Bespoke Web Design</div><div class="id">Custom sites &amp; online stores</div></div></div>
      <div class="item">{icon('⚙')}<div><div class="it">Web Apps &amp; Booking</div><div class="id">Portals, systems &amp; automation</div></div></div>
      <div class="item">{icon('🔍')}<div><div class="it">SEO — get found</div><div class="id">Rank on Google &amp; Maps</div></div></div>
      <div class="item">{icon('📈')}<div><div class="it">Auto SEO</div><div class="id">Rankings on autopilot, monthly</div></div></div>
      <div class="item">{icon('🎯')}<div><div class="it">Advertising — Google &amp; Meta Ads</div><div class="id">PPC that pays for itself</div></div></div>
      <div class="item">{icon('📣')}<div><div class="it">Social Media Marketing</div><div class="id">Content, reach &amp; growth</div></div></div>
      <div class="item">{icon('🛡')}<div><div class="it">Hosting &amp; Care</div><div class="id">Fast, secure, managed</div></div></div>
      <div class="item">{icon('✎')}<div><div class="it">Branding &amp; Copywriting</div><div class="id">Look the part, sound the part</div></div></div>
    </div>
    <div class="newband">
      <div class="nt">NEW · <span>Advertising &amp; Marketing</span> + Auto SEO</div>
      <div class="nd">We don't just build your site — we drive traffic to it. Google &amp; Meta ad campaigns, social media marketing, and hands-off Auto SEO that grows your rankings every month.</div>
    </div>
    <div class="steps">
      <div class="step"><div class="n">1</div><b>Free quote</b><span>Your vision, quoted in 24 hours</span></div>
      <div class="step"><div class="n">2</div><b>We build &amp; launch</b><span>Designed, developed, live</span></div>
      <div class="step"><div class="n">3</div><b>You grow</b><span>Ads, SEO &amp; marketing bring customers</span></div>
    </div>
    <div class="quote">
      <div class="qs">★★★★★</div>
      <p>"If you want a website that actually gets you customers rather than just sitting there, these are the people to go to."</p>
      <div class="who">— Ali, HEAT ON 24/7 Heating &amp; Plumbing, Manchester</div>
    </div>
    <div class="backbrand">
      <hr class="foil">
      <div class="brandlock" style="margin-top:20px">
        <img class="bmark" src="{B}/assets/logo-billy-icon.png" alt="">
        <span class="bname">Billy <b>Digitals</b><i>Bespoke Web · SEO · Advertising</i></span>
      </div>
    </div>
    <div class="cta">
      <div class="qr"><img src="{B}/assets/flyer-qr.png" alt="QR"></div>
      <div>
        <div class="big">A free quote in <em>24 hours</em></div>
        <div class="lines"><b>billydigitals.com</b> · WhatsApp 07519 022117<br>hello@billydigitals.com · ★★★★★ Rated 5.0 on Google</div>
      </div>
    </div>
  </div>
</section>
"""

HTML = f"<!DOCTYPE html><html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{FRONT}{BACK}</body></html>"
out = SP / "flyer_v2.html"
out.write_text(HTML)
print("wrote", out, len(HTML), "bytes")
