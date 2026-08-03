/* ═══════════════════════════════════════════════════════════════════════════
   VERTEX 360 — interactive virtual tour engine
   Billy Digitals · vanilla JS + raw WebGL · no framework, no build step.

   WHAT IT IS
   A complete 360° tour runtime: photosphere viewer, hotspot layer, floor-plan
   navigator, guided auto-tour, deep links, still export and an in-browser
   hotspot editor that exports the whole tour as JSON (hand-over ready).

   PANORAMAS
   Every scene is an equirectangular (2:1) panorama. Two sources are supported:

     1. REAL CAPTURE  — set  scene.pano = "assets/tour/atrium.jpg"
        Any stitched 360 photo (Insta360 / Theta / Matterport export …).
        The viewer, hotspots, plan and editor behave identically.

     2. SYNTHESISED   — leave scene.pano null and the engine ray-marches the
        space from scene.room{} straight into an equirect framebuffer on the
        GPU, tile by tile, so a tour can be previewed, hotspotted and signed
        off *before* anyone sets foot on site with a camera.

   Both paths end in the same texture, so a scene can be swapped from
   synthesised to real capture by adding one line — nothing else changes.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var CFG = window.VERTEX_TOUR;
  if (!CFG) return;

  /* ── tiny helpers ─────────────────────────────────────────────────────── */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var TAU = Math.PI * 2, D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var now = function () { return performance.now(); };
  var el = function (tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  };
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = matchMedia("(pointer: coarse)").matches;

  var stage = $("#vxStage"), canvas = $("#vxGL");
  if (!stage || !canvas) return;

  var gl = null;
  try {
    gl = canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" })
      || canvas.getContext("experimental-webgl", { antialias: false, alpha: false, preserveDrawingBuffer: true });
  } catch (e) { /* handled below */ }
  if (!gl) { stage.classList.add("vx-nogl"); return; }

  /* ═════════════════════════════════════════════════════════════════════════
     1 · SHADERS
     ═════════════════════════════════════════════════════════════════════════ */

  var VS = [
    "attribute vec2 aP;",
    "void main(){ gl_Position = vec4(aP, 0.0, 1.0); }"
  ].join("\n");

  /* ── 1a · the baker: ray-marches a room into equirectangular space ─────── */
  var BAKE_FS = [
    "precision highp float;",
    "uniform vec2  uRes;",       // panorama size
    "uniform vec3  uRoom;",      // interior w,h,d (metres)
    "uniform vec3  uCam;",       // tripod position
    "uniform float uLayout;",    // furniture set
    "uniform float uGlazeA;",    // glazed face: 0:-z 1:+z 2:-x 3:+x  (-1 none)
    "uniform float uGlazeB;",
    "uniform vec3  uWall, uFlr, uAcc, uLit, uWood, uFab;",
    "uniform float uSeed, uExpo, uCity, uWarm, uOpen;",

    "const float MF=1.0, MC=2.0, MW=3.0, MG=4.0, MM=5.0, MD=6.0, MB=7.0, ME=8.0, MP=9.0, MA=10.0, MS=11.0, MT=12.0, MR=13.0, MV=14.0;",

    "float hash11(float p){ p=fract(p*0.1031); p*=p+33.33; p*=p+p; return fract(p); }",
    "float hash21(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }",
    "float noise2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);",
    "  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x), mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x), f.y); }",
    "float fbm(vec2 p){ float a=0.5,s=0.0; for(int i=0;i<5;i++){ s+=a*noise2(p); p*=2.03; a*=0.5; } return s; }",

    "float sdBox(vec3 p, vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0); }",
    "float sdRBox(vec3 p, vec3 b, float r){ return sdBox(p, max(b-r,0.001))-r; }",
    "float sdCyl(vec3 p, float h, float r){ vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r,h); return min(max(d.x,d.y),0.0)+length(max(d,0.0)); }",
    "float sdSph(vec3 p, float r){ return length(p)-r; }",
    "vec2  um(vec2 a, vec2 b){ return a.x<b.x?a:b; }",
    "float rep1(float x, float s, float n){ return x - s*clamp(floor(x/s+0.5), -n, n); }",

    /* ── furniture primitives ───────────────────────────────────────────── */
    "float chair(vec3 p){",
    "  float seat=sdRBox(p-vec3(0.0,0.45,0.0), vec3(0.24,0.035,0.24), 0.035);",
    "  float back=sdRBox(p-vec3(0.0,0.70,-0.21), vec3(0.23,0.22,0.035), 0.05);",
    "  float post=sdCyl(p-vec3(0.0,0.22,0.0), 0.22, 0.035);",
    "  vec3 lp=p-vec3(0.0,0.04,0.0); float r=length(lp.xz); float a=atan(lp.z,lp.x);",
    "  float sc=6.2831853/5.0; a=mod(a+sc*0.5, sc)-sc*0.5;",
    "  vec3 fp=vec3(cos(a)*r, lp.y, sin(a)*r);",
    "  float base=sdBox(fp-vec3(0.17,0.0,0.0), vec3(0.17,0.018,0.022));",
    "  return min(min(seat,back), min(post,base));",
    "}",
    "float desk(vec3 p, vec2 s){",
    "  float top=sdRBox(p-vec3(0.0,0.73,0.0), vec3(s.x,0.022,s.y), 0.014);",
    "  vec3 lp=vec3(abs(p.x)-(s.x-0.08), p.y, abs(p.z)-(s.y-0.06));",
    "  float leg=sdBox(lp-vec3(0.0,0.36,0.0), vec3(0.03,0.36,0.03));",
    "  return min(top,leg);",
    "}",
    "float sofa(vec3 p, float len){",
    "  float base=sdRBox(p-vec3(0.0,0.24,0.0), vec3(len,0.22,0.40), 0.10);",
    "  float back=sdRBox(p-vec3(0.0,0.52,-0.30), vec3(len,0.26,0.11), 0.09);",
    "  float arm =sdRBox(vec3(abs(p.x)-len,p.y,p.z)-vec3(0.0,0.46,0.0), vec3(0.09,0.16,0.38), 0.08);",
    "  return min(min(base,back),arm);",
    "}",
    "float stool(vec3 p){",
    "  float seat=sdRBox(p-vec3(0.0,0.66,0.0), vec3(0.17,0.035,0.17), 0.06);",
    "  float post=sdCyl(p-vec3(0.0,0.33,0.0), 0.33, 0.028);",
    "  float base=sdCyl(p-vec3(0.0,0.02,0.0), 0.02, 0.19);",
    "  return min(min(seat,post),base);",
    "}",

    /* ── the shell ──────────────────────────────────────────────────────── */
    "vec2 shell(vec3 p){",
    "  float w=uRoom.x*0.5, h=uRoom.y, d=uRoom.z*0.5;",
    "  float dxn=w-abs(p.x), dzn=d-abs(p.z), dyd=p.y;",
    "  float dyu=uOpen>0.5 ? 1e5 : h-p.y;",
    "  float wl=min(dxn,dzn);",
    "  if(uOpen>0.5) wl=max(wl, p.y-h);",
    "  float dist=min(wl, min(dyu,dyd));",
    "  float m=MW;",
    "  if(dyd<=min(dyu,min(dxn,dzn))) m=MF;",
    "  else if(dyu<=min(dxn,dzn)) m=MC;",
    "  else {",
    "    float face = dxn<dzn ? (p.x<0.0?2.0:3.0) : (p.z<0.0?0.0:1.0);",
    "    if(abs(face-uGlazeA)<0.5 || abs(face-uGlazeB)<0.5) m=MG;",
    "  }",
    "  return vec2(dist,m);",
    "}",

    /* ── ceiling light lines (all layouts) ──────────────────────────────── */
    "vec2 lights(vec3 p){",
    "  if(uOpen>0.5) return vec2(1e9,0.0);",
    "  float w=uRoom.x*0.5, h=uRoom.y, d=uRoom.z*0.5;",
    "  vec3 q=p; q.x=rep1(q.x, w*0.66, 1.0);",
    "  float bar=sdBox(q-vec3(0.0,h-0.10,0.0), vec3(0.055,0.045,d*0.72));",
    "  float hsg=sdBox(q-vec3(0.0,h-0.035,0.0), vec3(0.085,0.045,d*0.73));",
    "  return um(vec2(bar,ME), vec2(hsg,MM));",
    "}",

    /* ── furniture sets ─────────────────────────────────────────────────── */
    "vec2 props(vec3 p){",
    "  vec2 r=vec2(1e9,0.0);",
    "  float w=uRoom.x*0.5, h=uRoom.y, d=uRoom.z*0.5;",
    "  float L=uLayout;",

    /* 0 — reception */
    "  if(L<0.5){",
    "    vec3 dp=p-vec3(0.0,0.0,-d+1.35);",
    "    r=um(r, vec2(sdRBox(dp-vec3(0.0,0.52,0.0), vec3(1.75,0.52,0.34), 0.05), MD));",
    "    r=um(r, vec2(sdRBox(dp-vec3(0.0,1.06,0.03), vec3(1.86,0.03,0.42), 0.02), MT));",
    "    r=um(r, vec2(sdBox(dp-vec3(0.0,0.10,0.0), vec3(1.70,0.06,0.30)), ME));",
    "    r=um(r, vec2(sdBox(p-vec3(0.0,1.9,-d+0.06), vec3(2.4,1.0,0.05)), MA));",
    "    r=um(r, vec2(sdBox(p-vec3(0.0,2.05,-d+0.13), vec3(1.05,0.14,0.03)), ME));",
    "    r=um(r, vec2(sofa(p-vec3(-1.9,0.0,1.5),0.95), MB));",
    "    vec3 s2=p-vec3(1.9,0.0,1.5); s2.z=-s2.z;",
    "    r=um(r, vec2(sofa(s2,0.95), MB));",
    "    r=um(r, vec2(sdRBox(p-vec3(0.0,0.36,1.5), vec3(0.46,0.03,0.30),0.02), MD));",
    "    r=um(r, vec2(sdCyl(p-vec3(0.0,0.18,1.5), 0.18, 0.05), MM));",
    "    r=um(r, vec2(sdBox(p-vec3(0.0,0.005,1.5), vec3(2.3,0.005,1.25)), MR));",
    "    vec3 pl=p-vec3(w-0.9, 0.0, d-1.0);",
    "    r=um(r, vec2(sdCyl(pl-vec3(0.0,0.28,0.0), 0.28, 0.26), MT));",
    "    r=um(r, vec2(sdSph((pl-vec3(0.0,0.95,0.0))*vec3(1.0,0.8,1.0), 0.52)/1.0, MP));",
    "    vec3 pd=p-vec3(0.0,h-0.55,1.5); pd.x=rep1(pd.x,0.55,1.0);",
    "    r=um(r, vec2(sdSph(pd,0.11), ME));",
    "    r=um(r, vec2(sdCyl(pd-vec3(0.0,0.34,0.0),0.34,0.006), MM));",
    "  }",

    /* 1 — atrium + social stair */
    "  else if(L<1.5){",
    "    float k=clamp(floor((p.z+d-0.5)/0.42), 0.0, 8.0);",
    "    vec3 sp=p-vec3(0.0,0.0,-d+0.5+k*0.42+0.21);",
    "    float hgt=0.20+(8.0-k)*0.20;",
    "    r=um(r, vec2(sdBox(sp-vec3(0.0,hgt*0.5,0.0), vec3(w*0.60,hgt*0.5,0.21)), MD));",
    "    vec3 cu=p-vec3(-1.3,0.0,-d+0.5+5.0*0.42+0.21);",
    "    r=um(r, vec2(sdRBox(cu-vec3(0.0,0.85,0.0), vec3(0.38,0.055,0.17),0.05), MB));",
    "    vec3 cv=p-vec3(1.5,0.0,-d+0.5+2.0*0.42+0.21);",
    "    r=um(r, vec2(sdRBox(cv-vec3(0.0,1.45,0.0), vec3(0.38,0.055,0.17),0.05), MB));",
    "    vec3 cw=p-vec3(0.1,0.0,-d+0.5+7.0*0.42+0.21);",
    "    r=um(r, vec2(sdRBox(cw-vec3(0.0,0.45,0.0), vec3(0.38,0.055,0.17),0.05), MB));",
    "    r=um(r, vec2(sdBox(p-vec3(0.0,3.55,-d+2.25), vec3(w,0.17,1.45)), MW));",
    "    vec3 bp=p-vec3(0.0,3.72,-d+3.62); bp.x=rep1(bp.x,0.33,30.0);",
    "    float post=sdBox(bp-vec3(0.0,0.48,0.0), vec3(0.011,0.48,0.011));",
    "    float rail=sdBox(p-vec3(0.0,4.22,-d+3.62), vec3(w,0.032,0.05));",
    "    r=um(r, vec2(min(post,rail), MM));",
    "    r=um(r, vec2(sdBox(p-vec3(0.0,5.15,-d+0.07), vec3(2.3,0.64,0.045)), MA));",
    "    r=um(r, vec2(sdBox(p-vec3(0.0,5.15,-d+0.14), vec3(1.55,0.11,0.02)), ME));",
    "    vec3 pl=p-vec3(-w+1.0,0.0,d-1.3);",
    "    r=um(r, vec2(sdCyl(pl-vec3(0.0,0.34,0.0),0.34,0.30), MT));",
    "    r=um(r, vec2(sdSph((pl-vec3(0.0,1.15,0.0))*vec3(1.0,0.72,1.0),0.62), MP));",
    "    vec3 p2=p-vec3(w-1.2,0.0,d-2.6);",
    "    r=um(r, vec2(sdCyl(p2-vec3(0.0,0.30,0.0),0.30,0.26), MT));",
    "    r=um(r, vec2(sdSph((p2-vec3(0.0,1.02,0.0))*vec3(1.0,0.75,1.0),0.54), MP));",
    "    vec3 lg=p-vec3(2.6,0.0,d-3.4);",
    "    vec3 ar=lg; ar.x=abs(ar.x)-1.15;",
    "    r=um(r, vec2(sdRBox(ar-vec3(0.0,0.30,0.0), vec3(0.36,0.26,0.36),0.12), MB));",
    "    r=um(r, vec2(sdRBox(ar-vec3(0.0,0.56,-0.28), vec3(0.36,0.24,0.09),0.08), MB));",
    "    r=um(r, vec2(sdRBox(lg-vec3(0.0,0.36,0.0), vec3(0.42,0.03,0.42),0.03), MD));",
    "    r=um(r, vec2(sdCyl(lg-vec3(0.0,0.18,0.0),0.18,0.05), MM));",
    "    r=um(r, vec2(sdBox(p-vec3(2.6,0.005,d-3.4), vec3(1.5,0.005,1.2)), MR));",
    "    vec3 bn=p-vec3(-3.4,0.0,0.6);",
    "    r=um(r, vec2(sdRBox(bn-vec3(0.0,0.40,0.0), vec3(1.25,0.05,0.24),0.05), MD));",
    "    vec3 bl=bn; bl.x=rep1(bl.x,2.2,0.0);",
    "    r=um(r, vec2(sdBox(bl-vec3(0.0,0.19,0.0), vec3(0.04,0.19,0.20)), MM));",
    "    vec3 pd=p-vec3(0.0,h-1.25,0.4); pd.x=rep1(pd.x,1.0,2.0);",
    "    pd.y-=hash11(floor(p.x/1.0+0.5)+uSeed)*0.5;",
    "    r=um(r, vec2(sdSph(pd,0.145), ME));",
    "    r=um(r, vec2(sdCyl(pd-vec3(0.0,0.9,0.0),0.9,0.005), MM));",
    "  }",

    /* 2 — café / kitchen */
    "  else if(L<2.5){",
    "    vec3 cp=p-vec3(0.0,0.0,-d+1.1);",
    "    r=um(r, vec2(sdRBox(cp-vec3(0.0,0.50,0.0), vec3(2.5,0.50,0.36),0.04), MA));",
    "    r=um(r, vec2(sdRBox(cp-vec3(0.0,1.02,0.02), vec3(2.6,0.03,0.42),0.02), MT));",
    "    r=um(r, vec2(sdBox(cp-vec3(0.0,0.08,0.30), vec3(2.4,0.04,0.05)), ME));",
    "    vec3 sh=p-vec3(0.0,0.0,-d+0.18); sh.y=rep1(sh.y-1.85,0.42,1.0);",
    "    r=um(r, vec2(sdBox(sh-vec3(0.0,0.0,0.0), vec3(2.2,0.025,0.16)), MD));",
    "    r=um(r, vec2(sdBox(p-vec3(-1.5,1.22,-d+1.05), vec3(0.26,0.20,0.22)), MM));",
    "    vec3 st=p-vec3(0.0,0.0,-d+1.95); st.x=rep1(st.x,0.72,2.0);",
    "    r=um(r, vec2(stool(st), MM));",
    "    r=um(r, vec2(desk(p-vec3(0.0,0.0,d-2.0), vec2(1.6,0.55)), MD));",
    "    vec3 bn=p-vec3(0.0,0.0,d-2.0); bn.z=abs(bn.z)-0.95;",
    "    r=um(r, vec2(sdRBox(bn-vec3(0.0,0.44,0.0), vec3(1.55,0.035,0.16),0.03), MD));",
    "    r=um(r, vec2(sdBox(bn-vec3(0.0,0.22,0.0), vec3(1.45,0.22,0.03)), MM));",
    "    vec3 pd=p-vec3(0.0,h-0.95,-d+1.35); pd.x=rep1(pd.x,1.1,2.0);",
    "    r=um(r, vec2(sdCyl(pd,0.13,0.15), ME));",
    "    r=um(r, vec2(sdCyl(pd-vec3(0.0,0.62,0.0),0.5,0.005), MM));",
    "    vec3 pl=p-vec3(w-0.85,0.0,d-1.1);",
    "    r=um(r, vec2(sdCyl(pl-vec3(0.0,0.26,0.0),0.26,0.24), MT));",
    "    r=um(r, vec2(sdSph((pl-vec3(0.0,0.88,0.0))*vec3(1.0,0.78,1.0),0.5), MP));",
    "  }",

    /* 3 — event hall */
    "  else if(L<3.5){",
    "    r=um(r, vec2(sdBox(p-vec3(0.0,0.22,-d+1.6), vec3(w*0.66,0.22,1.5)), MD));",
    "    r=um(r, vec2(sdBox(p-vec3(0.0,2.15,-d+0.10), vec3(w*0.52,1.05,0.05)), MS));",
    "    r=um(r, vec2(sdBox(p-vec3(0.0,2.15,-d+0.17), vec3(w*0.50,1.0,0.01)), ME));",
    "    vec3 ch=p-vec3(0.0,0.0,1.1);",
    "    ch.x=rep1(ch.x,0.72,4.0); ch.z=rep1(ch.z,0.86,2.0);",
    "    r=um(r, vec2(chair(ch)+0.02, MM));",
    "    vec3 tr=p-vec3(0.0,h-0.35,0.0); tr.z=rep1(tr.z,2.4,1.0);",
    "    r=um(r, vec2(sdBox(tr, vec3(w*0.9,0.045,0.045)), MM));",
    "    vec3 sl=tr; sl.x=rep1(sl.x,1.2,3.0);",
    "    r=um(r, vec2(sdCyl(sl-vec3(0.0,-0.17,0.0),0.11,0.065), MM));",
    "    r=um(r, vec2(sdSph(sl-vec3(0.0,-0.28,0.0),0.055), ME));",
    "    r=um(r, vec2(sdRBox(p-vec3(w-1.0,0.55,d-2.2), vec3(0.35,0.55,1.4),0.05), MA));",
    "    r=um(r, vec2(sdRBox(p-vec3(w-1.0,1.13,d-2.2), vec3(0.42,0.03,1.5),0.02), MT));",
    "  }",

    /* 4 — boardroom */
    "  else if(L<4.5){",
    "    vec3 tp=p; tp.x*=0.52;",
    "    r=um(r, vec2(sdRBox(tp-vec3(0.0,0.74,0.0), vec3(0.62,0.03,1.05),0.03), MD));",
    "    r=um(r, vec2(sdBox(p-vec3(0.0,0.36,0.0), vec3(0.9,0.36,0.28)), MM));",
    "    float ra=length(vec2(p.x*0.62,p.z)); float an=atan(p.z,p.x*0.62);",
    "    float sc=6.2831853/12.0; an=mod(an+sc*0.5,sc)-sc*0.5;",
    "    vec3 cp=vec3(cos(an)*ra-1.55, p.y, sin(an)*ra);",
    "    r=um(r, vec2(chair(vec3(cp.z,cp.y,cp.x))+0.015, MB));",
    "    r=um(r, vec2(sdBox(p-vec3(0.0,h-0.22,0.0), vec3(1.5,0.05,0.16)), MM));",
    "    r=um(r, vec2(sdBox(p-vec3(0.0,h-0.30,0.0), vec3(1.44,0.03,0.12)), ME));",
    "    r=um(r, vec2(sdBox(p-vec3(0.0,1.55,-d+0.06), vec3(1.25,0.72,0.045)), MS));",
    "    r=um(r, vec2(sdBox(p-vec3(0.0,1.55,-d+0.11), vec3(1.20,0.67,0.01)), MV));",
    "    vec3 sw=p-vec3(0.0,0.0,d-0.06); sw.x=rep1(sw.x,0.17,40.0);",
    "    r=um(r, vec2(sdBox(sw-vec3(0.0,1.3,0.0), vec3(0.022,1.3,0.04)), MD));",
    "    r=um(r, vec2(sdRBox(p-vec3(-w+0.45,0.36,d-2.0), vec3(0.28,0.36,1.1),0.03), MD));",
    "    vec3 pl=p-vec3(w-0.7,0.0,d-1.0);",
    "    r=um(r, vec2(sdCyl(pl-vec3(0.0,0.24,0.0),0.24,0.2), MT));",
    "    r=um(r, vec2(sdSph((pl-vec3(0.0,0.8,0.0))*vec3(1.0,0.75,1.0),0.44), MP));",
    "  }",

    /* 5 — open studio floor */
    "  else if(L<5.5){",
    "    vec3 dp=p; dp.x=rep1(dp.x,3.2,1.0); dp.z=rep1(dp.z,2.6,1.0);",
    "    vec3 db=dp; db.z=abs(db.z)-0.42;",
    "    r=um(r, vec2(desk(db, vec2(1.35,0.40)), MD));",
    "    r=um(r, vec2(sdBox(dp-vec3(0.0,0.60,0.0), vec3(1.34,0.16,0.02)), MB));",
    "    vec3 mo=db-vec3(0.0,0.0,-0.16); mo.x=rep1(mo.x,1.3,0.0);",
    "    r=um(r, vec2(sdBox(mo-vec3(0.0,1.06,0.0), vec3(0.30,0.19,0.012)), MS));",
    "    r=um(r, vec2(sdBox(mo-vec3(0.0,1.06,0.012), vec3(0.285,0.175,0.004)), MV));",
    "    r=um(r, vec2(sdCyl(mo-vec3(0.0,0.86,0.0),0.10,0.02), MM));",
    "    vec3 cp=db-vec3(0.0,0.0,0.78); cp.z=-cp.z;",
    "    r=um(r, vec2(chair(cp)+0.01, MM));",
    "    vec3 gp=p-vec3(-w+1.3,0.0,0.0); gp.z=rep1(gp.z,3.4,1.0);",
    "    r=um(r, vec2(sdCyl(gp-vec3(0.0,0.24,0.0),0.24,0.22), MT));",
    "    r=um(r, vec2(sdSph((gp-vec3(0.0,0.82,0.0))*vec3(1.0,0.72,1.0),0.46), MP));",
    "    vec3 pod=p-vec3(w-1.9,0.0,-d+2.2);",
    "    float shellP=max(sdBox(pod-vec3(0.0,1.25,0.0), vec3(1.5,1.25,1.5)), -sdBox(pod-vec3(0.0,1.25,0.0), vec3(1.44,1.22,1.44)));",
    "    float openP=sdBox(pod-vec3(0.0,1.05,1.5), vec3(0.42,1.05,0.4));",
    "    r=um(r, vec2(max(shellP,-openP), MG));",
    "    r=um(r, vec2(sdBox(pod-vec3(0.0,2.52,0.0), vec3(1.52,0.05,1.52)), MW));",
    "  }",

    /* 6 — meeting room */
    "  else if(L<6.5){",
    "    r=um(r, vec2(sdRBox(p-vec3(0.0,0.73,0.0), vec3(1.25,0.03,0.55),0.03), MD));",
    "    vec3 lg=vec3(abs(p.x)-0.95,p.y,p.z);",
    "    r=um(r, vec2(sdBox(lg-vec3(0.0,0.36,0.0), vec3(0.05,0.36,0.42)), MM));",
    "    vec3 ch=p; ch.x=rep1(ch.x,0.78,1.0); ch.z=abs(ch.z)-1.15;",
    "    vec3 chd=vec3(ch.x, ch.y, p.z>0.0?-ch.z:ch.z);",
    "    r=um(r, vec2(chair(chd)+0.01, MB));",
    "    r=um(r, vec2(sdBox(p-vec3(0.0,1.45,-d+0.06), vec3(0.95,0.55,0.04)), MS));",
    "    r=um(r, vec2(sdBox(p-vec3(0.0,1.45,-d+0.10), vec3(0.90,0.50,0.01)), MV));",
    "    vec3 sw=p-vec3(0.0,0.0,d-0.06); sw.x=rep1(sw.x,0.16,40.0);",
    "    r=um(r, vec2(sdBox(sw-vec3(0.0,1.2,0.0), vec3(0.021,1.2,0.038)), MD));",
    "    r=um(r, vec2(sdBox(p-vec3(0.0,h-0.30,0.0), vec3(1.1,0.04,0.10)), ME));",
    "    vec3 pl=p-vec3(-w+0.55,0.0,d-0.8);",
    "    r=um(r, vec2(sdCyl(pl-vec3(0.0,0.22,0.0),0.22,0.18), MT));",
    "    r=um(r, vec2(sdSph((pl-vec3(0.0,0.74,0.0))*vec3(1.0,0.75,1.0),0.4), MP));",
    "  }",

    /* 7 — focus booths */
    "  else if(L<7.5){",
    "    vec3 bp=p-vec3(0.0,0.0,-d+1.0); bp.x=rep1(bp.x,2.05,1.0);",
    "    float back=sdBox(bp-vec3(0.0,1.15,-0.62), vec3(0.92,1.15,0.06));",
    "    float side=sdBox(vec3(abs(bp.x)-0.92,bp.y,bp.z)-vec3(0.0,1.15,0.0), vec3(0.06,1.15,0.62));",
    "    float top =sdBox(bp-vec3(0.0,2.28,0.0), vec3(0.98,0.06,0.68));",
    "    r=um(r, vec2(min(min(back,side),top), MB));",
    "    r=um(r, vec2(sdRBox(bp-vec3(0.0,0.42,-0.30), vec3(0.84,0.08,0.28),0.06), MB));",
    "    r=um(r, vec2(sdRBox(bp-vec3(0.0,0.71,0.28), vec3(0.55,0.025,0.20),0.02), MD));",
    "    r=um(r, vec2(sdCyl(bp-vec3(0.0,0.35,0.28),0.35,0.03), MM));",
    "    r=um(r, vec2(sdBox(bp-vec3(0.0,2.18,0.0), vec3(0.72,0.02,0.06)), ME));",
    "    vec3 lp=p-vec3(0.0,0.0,d-1.4); lp.x=rep1(lp.x,1.5,1.0);",
    "    r=um(r, vec2(sdRBox(lp-vec3(0.0,0.40,0.0), vec3(0.40,0.18,0.40),0.14), MB));",
    "    vec3 pl=p-vec3(w-0.7,0.0,d-0.9);",
    "    r=um(r, vec2(sdCyl(pl-vec3(0.0,0.24,0.0),0.24,0.2), MT));",
    "    r=um(r, vec2(sdSph((pl-vec3(0.0,0.8,0.0))*vec3(1.0,0.72,1.0),0.44), MP));",
    "  }",

    /* 8 — terrace lounge */
    "  else {",
    "    vec3 sp=p-vec3(-1.2,0.0,0.6);",
    "    r=um(r, vec2(sdRBox(sp-vec3(0.0,0.22,0.0), vec3(1.5,0.20,0.45),0.10), MB));",
    "    r=um(r, vec2(sdRBox(sp-vec3(0.0,0.48,-0.34), vec3(1.5,0.24,0.10),0.08), MB));",
    "    vec3 s2=p-vec3(1.9,0.0,-0.5); s2=vec3(s2.z,s2.y,s2.x);",
    "    r=um(r, vec2(sdRBox(s2-vec3(0.0,0.22,0.0), vec3(1.0,0.20,0.45),0.10), MB));",
    "    r=um(r, vec2(sdRBox(s2-vec3(0.0,0.48,-0.34), vec3(1.0,0.24,0.10),0.08), MB));",
    "    r=um(r, vec2(sdRBox(p-vec3(0.2,0.20,0.6), vec3(0.55,0.20,0.35),0.04), MT));",
    "    r=um(r, vec2(sdBox(p-vec3(0.2,0.41,0.6), vec3(0.30,0.02,0.12)), ME));",
    "    vec3 pl=p-vec3(0.0,0.0,d-0.75); pl.x=rep1(pl.x,1.35,3.0);",
    "    r=um(r, vec2(sdRBox(pl-vec3(0.0,0.30,0.0), vec3(0.55,0.30,0.28),0.03), MT));",
    "    r=um(r, vec2(sdSph((pl-vec3(0.0,0.86,0.0))*vec3(0.65,0.9,1.0),0.62), MP));",
    "    vec3 pg=p-vec3(0.0,h-0.22,0.0); pg.z=rep1(pg.z,1.15,3.0);",
    "    r=um(r, vec2(sdBox(pg, vec3(w,0.075,0.05)), MD));",
    "    vec3 sl=p-vec3(0.0,h-0.55,0.0); sl.x=rep1(sl.x,0.62,7.0); sl.z=rep1(sl.z,2.3,1.0);",
    "    sl.y+=0.06*sin(p.x*2.0);",
    "    r=um(r, vec2(sdSph(sl,0.045), ME));",
    "  }",
    "  return r;",
    "}",

    "vec2 map(vec3 p){ return um(um(shell(p), lights(p)), props(p)); }",

    "vec3 normal(vec3 p){",
    "  vec2 e=vec2(0.0012,0.0);",
    "  return normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x, map(p+e.yxy).x-map(p-e.yxy).x, map(p+e.yyx).x-map(p-e.yyx).x));",
    "}",
    "vec2 march(vec3 ro, vec3 rd, float mx){",
    "  float t=0.02, m=0.0;",
    "  for(int i=0;i<128;i++){",
    "    vec3 p=ro+rd*t; vec2 h=map(p);",
    "    if(abs(h.x)<0.0012*t+0.0006){ m=h.y; break; }",
    "    t+=h.x*0.92; if(t>mx){ m=0.0; break; }",
    "  }",
    "  return vec2(t,m);",
    "}",
    "float shadow(vec3 ro, vec3 rd, float mx){",
    "  float res=1.0, t=0.05;",
    "  for(int i=0;i<28;i++){",
    "    float h=map(ro+rd*t).x;",
    "    if(h<0.002) return 0.06;",
    "    res=min(res, 9.0*h/t); t+=clamp(h,0.03,0.5);",
    "    if(t>mx) break;",
    "  }",
    "  return clamp(res,0.06,1.0);",
    "}",
    "float ao(vec3 p, vec3 n){",
    "  float s=0.0, sca=1.0;",
    "  for(int i=0;i<5;i++){",
    "    float hh=0.014+0.11*float(i);",
    "    s+=(hh-map(p+n*hh).x)*sca; sca*=0.72;",
    "  }",
    "  return clamp(1.0-2.1*s, 0.12, 1.0);",
    "}",

    /* ── the world outside the glass ────────────────────────────────────── */
    "vec3 sky(vec3 rd){",
    "  float t=clamp(rd.y*0.5+0.5,0.0,1.0);",
    "  vec3 zen=mix(vec3(0.26,0.44,0.86), vec3(0.16,0.30,0.72), uWarm);",
    "  vec3 hz =mix(vec3(0.86,0.90,0.97), vec3(1.00,0.86,0.72), uWarm);",
    "  vec3 c=mix(hz, zen, smoothstep(0.5,0.94,t));",
    "  vec3 sun=normalize(vec3(0.55,0.30,-0.78));",
    "  float sd=max(dot(rd,sun),0.0);",
    "  c+=vec3(1.0,0.88,0.70)*pow(sd,900.0)*8.0;",
    "  c+=vec3(1.0,0.82,0.62)*pow(sd,10.0)*0.22;",
    "  c+=vec3(1.0)*fbm(vec2(atan(rd.x,rd.z)*2.4, rd.y*5.0)+uSeed)*0.10*smoothstep(0.52,0.9,t);",
    "  float ang=atan(rd.x,rd.z);",
    "  if(rd.y<0.30){",
    "    for(int b=0;b<3;b++){",
    "      float fb=float(b);",
    "      float sc=7.0+fb*5.0;",
    "      float id=floor(ang*sc+fb*13.7);",
    "      float hgt=(0.035+hash11(id+fb*31.0+uSeed)*0.20)*uCity - 0.02;",
    "      float dep=0.55-fb*0.14;",
    "      if(rd.y<hgt && rd.y>-0.5){",
    "        vec3 bc=mix(vec3(0.11,0.14,0.22), vec3(0.21,0.25,0.34), dep);",
    "        float wx=floor(fract(ang*sc*11.0)*7.0), wy=floor((hgt-rd.y)*420.0);",
    "        float lit=step(0.80, hash21(vec2(wx+id*7.0, wy)))*step(0.35,fract((hgt-rd.y)*420.0));",
    "        bc+=vec3(1.0,0.88,0.62)*lit*0.30*uCity;",
    "        bc=mix(hz*0.92, bc, 0.34+dep*0.66);",
    "        c=mix(c, bc, 0.94);",
    "      }",
    "    }",
    "    float g=smoothstep(0.0,-0.12,rd.y);",
    "    vec3 grd=mix(vec3(0.22,0.26,0.24), vec3(0.13,0.16,0.18), 0.5);",
    "    grd+=fbm(vec2(ang*9.0, rd.y*30.0))*0.10;",
    "    c=mix(c, grd, g*0.94);",
    "  }",
    "  return c;",
    "}",

    /* ── surface description ────────────────────────────────────────────── */
    "void surf(vec3 p, vec3 n, float m, out vec3 alb, out float rough, out vec3 emis){",
    "  alb=vec3(0.5); rough=0.75; emis=vec3(0.0);",
    "  if(m==MF && uOpen>0.5){",
    "    float pk=abs(fract(p.x/0.17)-0.5)*0.17;",
    "    alb=uFlr*(0.80+fbm(vec2(p.z*7.0,p.x*1.6))*0.34);",
    "    alb*=mix(0.50,1.0,smoothstep(0.0,0.010,pk));",
    "    rough=0.66;",
    "  } else if(m==MF){",
    "    vec2 g=p.xz;",
    "    float grain=fbm(g*3.1+uSeed)*0.12+fbm(g*22.0)*0.05;",
    "    alb=uFlr*(0.86+grain);",
    "    float seam=min(abs(fract(g.x/1.2)-0.5), abs(fract(g.y/1.2)-0.5));",
    "    alb*=mix(0.62,1.0,smoothstep(0.0,0.035,seam));",
    "    rough=0.15+fbm(g*3.0)*0.05;",
    "  } else if(m==MC){",
    "    float pnl=min(abs(fract(p.x/1.2)-0.5), abs(fract(p.z/1.2)-0.5));",
    "    alb=uWall*mix(0.31,0.47,smoothstep(0.0,0.04,pnl));",
    "    rough=0.92;",
    "  } else if(m==MW){",
    "    alb=uWall*(0.74+fbm(p.xy*4.0+p.zz)*0.10);",
    "    alb*=mix(0.80,1.06,smoothstep(0.0,2.6,p.y));",
    "    alb*=mix(0.52,1.0,smoothstep(0.0,0.014,abs(p.y-2.42)));",
    "    if(p.y<0.10) alb=uWall*0.42;",
    "    rough=0.88;",
    "  } else if(m==MG){",
    "    alb=vec3(0.04); rough=0.05;",
    "  } else if(m==MM){",
    "    alb=vec3(0.10,0.11,0.13); rough=0.34;",
    "  } else if(m==MD){",
    "    float ring=fbm(vec2(p.x*2.4+p.z*0.4, p.z*17.0));",
    "    alb=uWood*(0.58+ring*0.26); rough=0.44;",
    "  } else if(m==MB){",
    "    alb=uFab*(0.88+fbm(p.xz*46.0+p.y*9.0)*0.22); rough=0.95;",
    "  } else if(m==ME){",
    "    alb=vec3(0.9); emis=uLit*4.4; rough=0.5;",
    "  } else if(m==MP){",
    "    float lf=fbm(p.xz*16.0+p.y*7.0);",
    "    alb=mix(vec3(0.09,0.24,0.12), vec3(0.20,0.42,0.18), lf); rough=0.82;",
    "  } else if(m==MA){",
    "    alb=uAcc*(0.92+fbm(p.xy*5.0)*0.10); rough=0.60;",
    "  } else if(m==MS){",
    "    alb=vec3(0.02); rough=0.12;",
    "  } else if(m==MV){",
    "    float sc=fbm(vec2(p.x*3.0+p.z*3.0, p.y*9.0));",
    "    alb=vec3(0.05); emis=mix(vec3(0.34,0.48,0.86), vec3(0.72,0.80,0.95), sc)*1.25; rough=0.10;",
    "  } else if(m==MR){",
    "    alb=mix(uFab, uWall, 0.55)*(0.80+fbm(p.xz*54.0)*0.20); rough=0.97;",
    "  } else if(m==MT){",
    "    float v=fbm(p.xz*2.2+uSeed)+fbm(p.xz*9.0)*0.4;",
    "    alb=mix(vec3(0.80,0.79,0.76), vec3(0.55,0.56,0.58), smoothstep(0.45,0.75,v)); rough=0.30;",
    "  }",
    "}",

    "vec3 winNormal(float f){",
    "  if(f<0.5) return vec3(0.0,0.0,1.0);",
    "  if(f<1.5) return vec3(0.0,0.0,-1.0);",
    "  if(f<2.5) return vec3(1.0,0.0,0.0);",
    "  return vec3(-1.0,0.0,0.0);",
    "}",

    "vec3 lightAt(vec3 p, vec3 n, vec3 rd, vec3 alb, float rough, vec3 emis, float m, float occl, bool deep){",
    "  vec3 wn = winNormal(uGlazeA>=0.0?uGlazeA:1.0);",
    "  vec3 L  = normalize(-wn*1.0 + vec3(0.10,0.62,0.06));",
    "  float sh = deep ? shadow(p+n*0.02, L, 22.0) : 1.0;",
    "  vec3 col = vec3(0.0);",
    "  vec3 daylight = mix(vec3(1.0,0.98,0.94), vec3(1.0,0.90,0.78), uWarm)*1.62;",
    "  col += alb*daylight*max(dot(n,L),0.0)*sh;",
    /* window as a big area source — wrap lighting */
    "  float wrap = max(dot(n,-wn)*0.5+0.5, 0.0);",
    "  col += alb*mix(vec3(0.42,0.55,0.82), vec3(0.68,0.58,0.54), uWarm)*wrap*0.32;",
    /* ceiling strips */
    "  float w=uRoom.x*0.5, h=uRoom.y;",
    "  for(int i=0;i<3;i++){",
    "    vec3 lp=vec3((float(i)-1.0)*w*0.66, h-0.16, p.z*0.35);",
    "    vec3 ld=lp-p; float dd=length(ld); ld/=dd;",
    "    float att=1.0/(1.0+dd*dd*0.13);",
    "    col += alb*uLit*max(dot(n,ld),0.0)*att*2.0;",
    "  }",
    /* bounce + hemi ambient */
    "  col += alb*uFlr*max(-n.y,0.0)*0.15;",
    "  col += alb*mix(uWall,vec3(0.30,0.42,0.66),0.35)*(0.42+0.58*n.y)*0.20;",
    /* speculars */
    "  vec3 V=-rd;",
    "  vec3 Hv=normalize(L+V);",
    "  float sp=pow(max(dot(n,Hv),0.0), mix(12.0,320.0,1.0-rough));",
    "  col += daylight*sp*(1.0-rough)*0.55*sh;",
    "  col *= occl;",
    "  col += emis;",
    "  return col;",
    "}",

    "vec3 render(vec3 ro, vec3 rd){",
    "  vec2 h=march(ro,rd,80.0);",
    "  if(h.y==0.0) return sky(rd);",
    "  vec3 p=ro+rd*h.x, n=normal(p);",
    "  float m=h.y;",
    "  vec3 alb, emis; float rough;",
    "  surf(p,n,m,alb,rough,emis);",
    /* glazing: frame bars + sky transmission + reflection */
    "  if(m==MG){",
    "    float w=uRoom.x*0.5, d=uRoom.z*0.5;",
    "    bool xf = abs(abs(p.x)-w) < abs(abs(p.z)-d);",
    "    float u = xf ? p.z : p.x;",
    "    float bar = min(abs(fract(u/1.55)-0.5)*1.55, abs(fract(p.y/2.3)-0.5)*2.3);",
    "    float edge = min(min(p.y, uRoom.y-p.y), 0.4);",
    "    if(bar<0.035 || edge<0.05){",
    "      alb=vec3(0.07,0.075,0.085); rough=0.3;",
    "      return lightAt(p,n,rd,alb,rough,vec3(0.0),MM,ao(p,n),true);",
    "    }",
    "    vec3 out1 = sky(refract(rd,-n,1.0)==vec3(0.0)?rd:rd);",
    "    vec3 refl = render_cheap_flag(p,n,rd);",
    "    return mix(out1, refl, 0.10) * (0.94+0.06*uWarm);",
    "  }",
    "  vec3 col = lightAt(p,n,rd,alb,rough,emis,m,ao(p,n),true);",
    /* one gloss bounce for polished floors / stone / screens */
    "  if(rough<0.34 && m!=MG){",
    "    vec3 R=reflect(rd,n);",
    "    vec2 h2=march(p+n*0.02,R,40.0);",
    "    vec3 rc;",
    "    if(h2.y==0.0) rc=sky(R);",
    "    else{",
    "      vec3 p2=p+n*0.02+R*h2.x; vec3 n2=normal(p2);",
    "      vec3 a2,e2; float r2; surf(p2,n2,h2.y,a2,r2,e2);",
    "      if(h2.y==MG) rc=sky(R)*0.9; else rc=lightAt(p2,n2,R,a2,r2,e2,h2.y,ao(p2,n2),false);",
    "    }",
    "    float fres=0.04+0.5*pow(1.0-max(dot(-rd,n),0.0),4.0);",
    "    col=mix(col, rc, clamp(fres*(1.0-rough*2.2),0.0,0.55));",
    "  }",
    "  return col;",
    "}",

    "vec3 aces(vec3 x){",
    "  return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0);",
    "}",

    "void main(){",
    "  vec2 uv = gl_FragCoord.xy / uRes;",
    "  float lon = (uv.x-0.5)*6.2831853;",
    "  float lat = (uv.y-0.5)*3.14159265;",
    "  vec3 rd = vec3(cos(lat)*sin(lon), sin(lat), -cos(lat)*cos(lon));",
    "  vec3 col = render(uCam, rd);",
    "  col *= uExpo;",
    "  col = aces(col);",
    "  col = pow(col, vec3(1.0/2.2));",
    "  col += (hash21(gl_FragCoord.xy+uSeed)-0.5)*0.016;",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n")
    /* the glass branch wants a reflection without recursion — inline a cheap one */
    .replace("vec3 refl = render_cheap_flag(p,n,rd);",
      ["vec3 R=reflect(rd,n); vec2 hr=march(p+n*0.03,R,30.0); vec3 refl;",
        "if(hr.y==0.0||hr.y==MG) refl=sky(R);",
        "else { vec3 pr=p+n*0.03+R*hr.x; vec3 nr=normal(pr); vec3 ar,er; float rr;",
        "surf(pr,nr,hr.y,ar,rr,er); refl=lightAt(pr,nr,R,ar,rr,er,hr.y,ao(pr,nr),false); }"].join("\n"))
    .replace("vec3 out1 = sky(refract(rd,-n,1.0)==vec3(0.0)?rd:rd);", "vec3 out1 = sky(rd);");

  /* ── 1b · the viewer: equirect → perspective, with cross-dissolve ─────── */
  var VIEW_FS = [
    "precision highp float;",
    "uniform sampler2D uA, uB;",
    "uniform vec2  uRes;",
    "uniform float uYaw, uPitch, uFov, uMix, uFovA, uFovB;",
    "uniform float uGrain, uVig, uFlash, uAvail;",
    "const float PI=3.14159265;",
    "vec3 dirFor(vec2 p, float fov){",
    "  float f = 1.0/tan(fov*0.5);",
    "  vec3 d = normalize(vec3(p.x, p.y, -f));",
    "  float cp=cos(uPitch), sp=sin(uPitch);",
    "  d = vec3(d.x, d.y*cp - d.z*sp, d.y*sp + d.z*cp);",
    "  float cy=cos(uYaw), sy=sin(uYaw);",
    "  d = vec3(d.x*cy + d.z*sy, d.y, -d.x*sy + d.z*cy);",
    "  return d;",
    "}",
    "vec2 uvFor(vec3 d){",
    "  float lon=atan(d.x,-d.z), lat=asin(clamp(d.y,-1.0,1.0));",
    "  return vec2(lon/(2.0*PI)+0.5, lat/PI+0.5);",
    "}",
    "void main(){",
    "  vec2 p = (gl_FragCoord.xy - 0.5*uRes)/(0.5*uRes.y);",
    "  float r = length(p);",
    "  float ca = 1.0 + r*r*0.00055;",   // whisper of chromatic aberration at the edges
    "  vec2 uva = uvFor(dirFor(p, uFovA));",
    "  vec2 uvb = uvFor(dirFor(p, uFovB));",
    "  vec3 A, B;",
    "  A.r=texture2D(uA, uvFor(dirFor(p*ca, uFovA))).r; A.g=texture2D(uA,uva).g; A.b=texture2D(uA, uvFor(dirFor(p/ca, uFovA))).b;",
    "  B.r=texture2D(uB, uvFor(dirFor(p*ca, uFovB))).r; B.g=texture2D(uB,uvb).g; B.b=texture2D(uB, uvFor(dirFor(p/ca, uFovB))).b;",
    "  vec3 col = mix(A, B, uMix*uAvail);",
    "  col *= 1.0 - uVig*smoothstep(0.85,2.25,r);",
    "  col += uFlash;",
    "  float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233)))*43758.5453);",
    "  col += (g-0.5)*uGrain;",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  /* ═════════════════════════════════════════════════════════════════════════
     2 · GL PLUMBING
     ═════════════════════════════════════════════════════════════════════════ */

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("VERTEX360 shader:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  function program(fs) {
    var v = compile(gl.VERTEX_SHADER, VS), f = compile(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    var p = gl.createProgram();
    gl.attachShader(p, v); gl.attachShader(p, f);
    gl.bindAttribLocation(p, 0, "aP");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error("VERTEX360 link:", gl.getProgramInfoLog(p)); return null; }
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); }
    return { p: p, u: u };
  }

  var quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  var progBake = program(BAKE_FS), progView = program(VIEW_FS);
  if (!progBake || !progView) { stage.classList.add("vx-nogl"); return; }

  /* Panorama sizes are kept power-of-two: WebGL1 only wraps POT textures, and
     a panorama that can't wrap has a black seam — or is black outright. */
  var MAXTEX = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  function pot(v) { var n = 1; while (n * 2 <= v) n *= 2; return n; }
  var HI_W = pot(Math.min(coarse ? 2048 : 4096, MAXTEX));
  var LO_W = pot(Math.min(1024, MAXTEX));
  /* ?q=lo|md|hi pins the render size; otherwise the first bake times itself
     and the engine drops a tier on anything slow (old phones, software GL). */
  var qOverride = new URLSearchParams(location.search).get("q");
  if (qOverride === "lo") { HI_W = 512; LO_W = 256; }
  else if (qOverride === "md") { HI_W = 1024; LO_W = 512; }
  else if (qOverride === "hi") { HI_W = pot(Math.min(4096, MAXTEX)); LO_W = 1024; }
  var HI_H = HI_W / 2, LO_H = LO_W / 2;
  var tiersLeft = qOverride ? 0 : 2;

  function downshift() {
    if (tiersLeft-- <= 0 || HI_W <= 512) return;
    HI_W = Math.max(512, HI_W / 2); HI_H = HI_W / 2;
    for (var i = queue.length - 1; i >= 0; i--) {
      if (queue[i].kind === "hi" && !queue[i].target) { queue[i].w = HI_W; queue[i].h = HI_H; }
    }
  }

  function makeTex(w, h) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, w, h, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { tex: t, w: w, h: h };
  }
  var fbo = gl.createFramebuffer();

  /* a 1×1 grey so the viewer never samples a null texture */
  var blank = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, blank);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([9, 12, 22]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  function hexv(h, mul) {
    h = (h || "#888").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16), m = mul == null ? 1 : mul;
    return [Math.pow(((n >> 16) & 255) / 255, 2.2) * m, Math.pow(((n >> 8) & 255) / 255, 2.2) * m, Math.pow((n & 255) / 255, 2.2) * m];
  }
  var GLAZE = { "-z": 0, "+z": 1, "-x": 2, "+x": 3, "": -1, none: -1 };

  function setBakeUniforms(sc, w, h) {
    var R = sc.room || {}, P = R.palette || {};
    var u = progBake.u;
    gl.uniform2f(u.uRes, w, h);
    gl.uniform3f(u.uRoom, R.w || 10, R.h || 3, R.d || 10);
    gl.uniform3f(u.uCam, (R.cam && R.cam[0]) || 0, R.eye || 1.62, (R.cam && R.cam[1]) || 0);
    gl.uniform1f(u.uLayout, R.layout || 0);
    gl.uniform1f(u.uGlazeA, GLAZE[R.glaze] != null ? GLAZE[R.glaze] : 1);
    gl.uniform1f(u.uGlazeB, GLAZE[R.glaze2] != null ? GLAZE[R.glaze2] : -1);
    gl.uniform3fv(u.uWall, hexv(P.wall || "#d9dde6"));
    gl.uniform3fv(u.uFlr, hexv(P.floor || "#8d8f96"));
    gl.uniform3fv(u.uAcc, hexv(P.accent || "#1e3a8a"));
    gl.uniform3fv(u.uLit, hexv(P.light || "#ffe9c9", 1.0));
    gl.uniform3fv(u.uWood, hexv(P.wood || "#a9743f"));
    gl.uniform3fv(u.uFab, hexv(P.fabric || "#39506e"));
    gl.uniform1f(u.uSeed, R.seed || 1.0);
    gl.uniform1f(u.uExpo, R.exposure || 1.0);
    gl.uniform1f(u.uCity, R.city == null ? 1 : R.city);
    gl.uniform1f(u.uWarm, R.warm || 0);
    gl.uniform1f(u.uOpen, R.open ? 1 : 0);
  }

  /* ═════════════════════════════════════════════════════════════════════════
     3 · SCENE STORE + PROGRESSIVE BAKER
     ═════════════════════════════════════════════════════════════════════════ */

  var scenes = CFG.scenes, byId = {};
  scenes.forEach(function (s, i) { s._i = i; byId[s.id] = s; });

  var store = {};   // id → { lo, hi, thumb, loading }
  scenes.forEach(function (s) { store[s.id] = { lo: null, hi: null, thumb: null }; });

  var queue = [], hiPool = [];
  var HI_KEEP = coarse ? 2 : 3;

  /* Queue order is the whole trick: previews always outrank full-resolution
     bakes, and a bake already part-way through is never preempted (that would
     leave a half-drawn panorama in the pool). */
  function enqueue(id, kind, priority) {
    for (var i = 0; i < queue.length; i++) if (queue[i].id === id && queue[i].kind === kind) return queue[i];
    var w = kind === "hi" ? HI_W : LO_W, h = kind === "hi" ? HI_H : LO_H;
    var rows = kind === "hi" ? (coarse ? 8 : 16) : 1;
    var job = { id: id, kind: kind, w: w, h: h, rows: rows, row: 0, target: null, done: false };
    var pos = 0;
    while (pos < queue.length && queue[pos].row > 0) pos++;            // never cut in on live work
    if (!(kind === "lo" && priority)) {
      while (pos < queue.length && queue[pos].kind === "lo") pos++;     // previews first
      if (kind === "hi" && !priority) pos = queue.length;
    }
    queue.splice(pos, 0, job);
    return job;
  }

  function bakeStep(job) {
    if (!job.target) {
      if (job.kind === "hi") {
        while (hiPool.length >= HI_KEEP) {
          var victim = hiPool.shift();
          if (victim.id === current.id || (incoming && victim.id === incoming.id)) { hiPool.push(victim); break; }
          gl.deleteTexture(victim.t.tex);
          store[victim.id].hi = null;
        }
        job.target = makeTex(job.w, job.h);
        hiPool.push({ id: job.id, t: job.target });
      } else {
        job.target = makeTex(job.w, job.h);
      }
    }
    var sc = byId[job.id];
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, job.target.tex, 0);
    gl.useProgram(progBake.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    setBakeUniforms(sc, job.w, job.h);
    gl.viewport(0, 0, job.w, job.h);
    var band = Math.ceil(job.h / job.rows);
    var t0 = now();
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, job.row * band, job.w, band);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.SCISSOR_TEST);
    job.row++;
    if (tiersLeft > 0 && job.kind === "lo" && job.row >= job.rows) {
      gl.finish();
      var perPx = Math.max(now() - t0, 0.5) / (job.w * job.h);
      var hiRows = coarse ? 8 : 16;
      /* budget: one hi-res band must stay under ~110 ms on this GPU */
      while (tiersLeft > 0 && perPx * (HI_W * HI_H / hiRows) > 110) downshift();
    }
    if (job.row >= job.rows) {
      job.done = true;
      if (job.kind === "hi") store[job.id].hi = job.target;
      else {
        store[job.id].lo = job.target;
        grabThumb(job);
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /* pull the low-res bake back to a 2D canvas → real thumbnails, free */
  var thumbSrc = {};
  function grabThumb(job) {
    try {
      var px = new Uint8Array(job.w * job.h * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.readPixels(0, 0, job.w, job.h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      var c = document.createElement("canvas"); c.width = job.w; c.height = job.h;
      var ctx = c.getContext("2d"), img = ctx.createImageData(job.w, job.h);
      for (var y = 0; y < job.h; y++) {
        var src = (job.h - 1 - y) * job.w * 4, dst = y * job.w * 4;
        for (var x = 0; x < job.w * 4; x++) img.data[dst + x] = px[src + x];
      }
      ctx.putImageData(img, 0, 0);
      thumbSrc[job.id] = c;
      paintThumb(job.id);
    } catch (e) { /* readback is a nicety, never a blocker */ }
  }

  function paintThumb(id) {
    var node = $('.vx-card[data-id="' + id + '"] canvas');
    var src = thumbSrc[id];
    if (!node || !src) return;
    var sc = byId[id], ctx = node.getContext("2d");
    var yaw = ((sc.start && sc.start.yaw) || 0);
    var cx = ((-yaw / 360) + 0.5) * src.width;
    var sw = src.width * 0.20, sh = sw * (node.height / node.width);
    var sy = src.height * 0.5 - sh * 0.5;
    ctx.imageSmoothingQuality = "high";
    var sx = cx - sw / 2;
    if (sx < 0) sx += src.width;
    if (sx + sw <= src.width) ctx.drawImage(src, sx, sy, sw, sh, 0, 0, node.width, node.height);
    else {
      var w1 = src.width - sx, f = w1 / sw;
      ctx.drawImage(src, sx, sy, w1, sh, 0, 0, node.width * f, node.height);
      ctx.drawImage(src, 0, sy, sw - w1, sh, node.width * f, 0, node.width * (1 - f), node.height);
    }
    node.parentNode.classList.add("is-ready");
  }

  /* real captured panoramas load straight into the same slot */
  function loadPhoto(sc, kind, cb) {
    var im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = function () {
      /* stitched captures arrive at any size — square them off to POT so the
         360° wrap stays seamless */
      var tw = Math.min(pot(im.width), MAXTEX), th = tw / 2, src = im;
      if (im.width !== tw || im.height !== th) {
        var c = document.createElement("canvas");
        c.width = tw; c.height = th;
        c.getContext("2d").drawImage(im, 0, 0, tw, th);
        src = c;
      }
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      store[sc.id][kind] = { tex: t, w: tw, h: th };
      if (cb) cb();
    };
    im.onerror = function () { enqueue(sc.id, kind, true); };
    im.src = sc.pano;
  }

  function needLo(sc, priority) {
    if (store[sc.id].lo) return;
    if (sc.pano) loadPhoto(sc, "lo");
    else enqueue(sc.id, "lo", priority);
  }
  function needHi(sc, priority) {
    if (store[sc.id].hi) return;
    if (sc.pano) { store[sc.id].hi = store[sc.id].lo; return; }
    enqueue(sc.id, "hi", priority);
  }

  /* ═════════════════════════════════════════════════════════════════════════
     4 · CAMERA + VIEW STATE
     ═════════════════════════════════════════════════════════════════════════ */

  var cam = { yaw: 0, pitch: 0, fov: 75, tYaw: 0, tPitch: 0, tFov: 75, vYaw: 0, vPitch: 0 };
  var current = scenes[0], incoming = null;
  var trans = { t: 1, dur: 1000, dir: 1 };
  var autoplay = false, autoTimer = 0, gyro = null, flash = 0;
  var idleSince = now(), hinted = false;

  function camDir(yawDeg, pitchDeg) {
    var y = yawDeg * D2R, p = pitchDeg * D2R;
    var d = [0, 0, -1];
    var cp = Math.cos(p), sp = Math.sin(p);
    d = [0, -(-1) * sp * 0 + sp * -0 + Math.sin(p) * 1, 0]; // replaced below
    // explicit: rotX(pitch) then rotY(yaw) applied to (0,0,-1)
    var dx = 0, dy = Math.sin(p), dz = -Math.cos(p);
    var cy = Math.cos(y), sy = Math.sin(y);
    return [dx * cy + dz * sy, dy, -dx * sy + dz * cy];
  }
  /* project a hotspot's (yaw,pitch) to screen px; null when behind the camera */
  function project(yawDeg, pitchDeg, W, H) {
    var w = camDir(yawDeg, pitchDeg);
    var y = -cam.yaw * D2R, p = -cam.pitch * D2R;
    var cy = Math.cos(y), sy = Math.sin(y);
    var x1 = w[0] * cy + w[2] * sy, y1 = w[1], z1 = -w[0] * sy + w[2] * cy;
    var cp = Math.cos(p), sp = Math.sin(p);
    var y2 = y1 * cp - z1 * sp, z2 = y1 * sp + z1 * cp;
    if (z2 > -0.02) return null;
    var f = 1 / Math.tan(cam.fov * D2R * 0.5);
    var sxp = f * x1 / -z2, syp = f * y2 / -z2;
    return [W * 0.5 + sxp * H * 0.5, H * 0.5 - syp * H * 0.5, Math.hypot(sxp, syp)];
  }

  /* ═════════════════════════════════════════════════════════════════════════
     5 · DOM: hotspots, rail, plan, panels
     ═════════════════════════════════════════════════════════════════════════ */

  var hotLayer = $("#vxHots"), rail = $("#vxRail"), planWrap = $("#vxPlan");
  var elTitle = $("#vxTitle"), elMeta = $("#vxMeta"), elIdx = $("#vxIdx");
  var elLoad = $("#vxLoad"), elBar = $("#vxBar"), elStage = $("#vxLoadStage"), elPct = $("#vxPct");
  var elTele = $("#vxTele"), elHint = $("#vxHint"), elSharp = $("#vxSharp");
  var drawer = $("#vxDrawer"), drawerBody = $("#vxDrawerBody"), drawerTitle = $("#vxDrawerTitle");

  var hotEls = [];
  function buildHotspots(sc) {
    hotLayer.innerHTML = "";
    hotEls = [];
    (sc.hotspots || []).forEach(function (h, i) {
      var b = el("button", "vx-hot vx-hot--" + h.type);
      b.type = "button";
      b.setAttribute("data-i", i);
      var target = h.to && byId[h.to];
      var label = h.label || (target ? target.name : "Info");
      b.setAttribute("aria-label", h.type === "nav" ? "Go to " + label : label);
      if (h.type === "nav") {
        b.innerHTML =
          '<span class="vx-hot-ring"><span class="vx-hot-arrow"></span></span>' +
          '<span class="vx-hot-tag">' + label + '</span>';
      } else {
        b.innerHTML =
          '<span class="vx-hot-dot"><i></i></span>' +
          '<span class="vx-hot-tag">' + label + '</span>';
      }
      b.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (editor.on) { editor.select(i); return; }
        if (h.type === "nav" && target) goTo(h.to);
        else openInfo(h, sc);
      });
      hotLayer.appendChild(b);
      hotEls.push({ el: b, h: h });
    });
  }

  function layoutHotspots() {
    var W = stage.clientWidth, H = stage.clientHeight;
    for (var i = 0; i < hotEls.length; i++) {
      var it = hotEls[i], pr = project(it.h.yaw, it.h.pitch, W, H);
      if (!pr || pr[2] > 2.9) { it.el.style.opacity = 0; it.el.style.pointerEvents = "none"; continue; }
      var fade = clamp(1 - (pr[2] - 1.55) / 1.1, 0, 1);
      it.el.style.transform = "translate3d(" + (pr[0] | 0) + "px," + (pr[1] | 0) + "px,0) translate(-50%,-50%) scale(" + (0.70 + 0.52 * clamp(1 - pr[2] * 0.42, 0, 1)).toFixed(3) + ")";
      it.el.style.opacity = (0.35 + 0.65 * fade).toFixed(3);
      it.el.style.pointerEvents = fade > 0.15 ? "auto" : "none";
    }
  }

  function openInfo(h, sc) {
    drawerTitle.textContent = h.label || sc.name;
    drawerBody.innerHTML = "";
    if (h.body) { var p = el("p", "", h.body); drawerBody.appendChild(p); }
    if (h.stats) {
      var dl = el("dl", "vx-stats");
      h.stats.forEach(function (s) {
        dl.appendChild(el("dt", "", s[0]));
        dl.appendChild(el("dd", "", s[1]));
      });
      drawerBody.appendChild(dl);
    }
    if (h.cta) {
      var a = el("a", "vx-btn vx-btn--go", h.cta.label);
      a.href = h.cta.href;
      drawerBody.appendChild(a);
    }
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
  }
  function closeDrawer() { drawer.classList.remove("is-open"); drawer.setAttribute("aria-hidden", "true"); }
  $("#vxDrawerClose").addEventListener("click", closeDrawer);

  /* ── space rail ───────────────────────────────────────────────────────── */
  function buildRail() {
    var floors = CFG.floors || [{ id: "", name: "" }];
    floors.forEach(function (f) {
      var grp = el("div", "vx-railgroup");
      grp.appendChild(el("span", "vx-railname", f.name));
      var row = el("div", "vx-railrow");
      scenes.filter(function (s) { return s.floor === f.id; }).forEach(function (s) {
        var card = el("button", "vx-card");
        card.type = "button";
        card.setAttribute("data-id", s.id);
        card.innerHTML = '<span class="vx-thumb"><canvas width="132" height="84"></canvas></span>' +
          '<span class="vx-cardname">' + s.name + '</span>' +
          '<span class="vx-cardmeta">' + (s.area || "") + '</span>';
        card.addEventListener("click", function () { goTo(s.id); });
        row.appendChild(card);
      });
      grp.appendChild(row);
      rail.appendChild(grp);
    });
  }

  /* ── floor plan ───────────────────────────────────────────────────────── */
  var planFloor = null, planNodes = {};
  function buildPlan() {
    var floors = CFG.floors || [];
    var tabs = $("#vxPlanTabs");
    floors.forEach(function (f) {
      var b = el("button", "vx-ptab", f.short || f.name);
      b.type = "button";
      b.addEventListener("click", function () { showFloor(f.id); });
      b.setAttribute("data-f", f.id);
      tabs.appendChild(b);

      var svgWrap = el("div", "vx-planfloor");
      svgWrap.setAttribute("data-f", f.id);
      svgWrap.innerHTML =
        '<svg viewBox="0 0 100 72" aria-hidden="true">' +
        '<defs><radialGradient id="vxcone' + f.id + '" cx="0" cy="0" r="1" gradientUnits="objectBoundingBox">' +
        '<stop offset="0" stop-color="#22d3ee" stop-opacity=".85"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>' +
        '</radialGradient></defs>' +
        '<g class="vx-plangeo">' + (f.plan || "") + '</g>' +
        '<g class="vx-planpins"></g></svg>';
      planWrap.appendChild(svgWrap);

      var pins = $(".vx-planpins", svgWrap);
      scenes.filter(function (s) { return s.floor === f.id; }).forEach(function (s) {
        var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "vx-pin");
        g.setAttribute("transform", "translate(" + s.plan[0] + "," + s.plan[1] + ")");
        g.innerHTML =
          '<path class="vx-cone" d="M0 0 L-13 -20 A24 24 0 0 0 13 -20 Z" fill="url(#vxcone' + f.id + ')"/>' +
          '<circle class="vx-pindot" r="2.5"/><circle class="vx-pinhit" r="5.5" fill="transparent"/>' +
          '<text class="vx-pinlabel" y="-5.5">' + (s.short || s.name) + '</text>';
        g.addEventListener("click", function () { goTo(s.id); });
        pins.appendChild(g);
        planNodes[s.id] = g;
      });
    });
  }
  function showFloor(id) {
    planFloor = id;
    $$(".vx-planfloor").forEach(function (n) { n.classList.toggle("is-on", n.getAttribute("data-f") === id); });
    $$(".vx-ptab").forEach(function (n) { n.classList.toggle("is-on", n.getAttribute("data-f") === id); });
  }

  /* ═════════════════════════════════════════════════════════════════════════
     6 · NAVIGATION
     ═════════════════════════════════════════════════════════════════════════ */

  function best(id) { return store[id].hi || store[id].lo || null; }

  function goTo(id, opts) {
    var sc = byId[id];
    if (!sc || (incoming && incoming.id === id) || (!incoming && current.id === id && !(opts && opts.force))) return;
    opts = opts || {};
    closeDrawer();
    incoming = sc;
    needLo(sc, true); needHi(sc, true);
    trans.t = 0;
    trans.dur = reduce ? 260 : (opts.dur || 1050);
    if (sc.start) {
      cam.tYaw = opts.yaw != null ? opts.yaw : sc.start.yaw;
      cam.tPitch = opts.pitch != null ? opts.pitch : (sc.start.pitch || 0);
      cam.tFov = opts.fov != null ? opts.fov : (sc.start.fov || 75);
      /* take the short way round */
      while (cam.tYaw - cam.yaw > 180) cam.tYaw -= 360;
      while (cam.tYaw - cam.yaw < -180) cam.tYaw += 360;
    }
    setChrome(sc);
    prefetchNeighbours(sc);
    var url = new URL(location.href);
    url.searchParams.set("s", id);
    history.replaceState(null, "", url);
  }

  function prefetchNeighbours(sc) {
    (sc.hotspots || []).forEach(function (h) { if (h.type === "nav" && byId[h.to]) needLo(byId[h.to]); });
  }

  function setChrome(sc) {
    elTitle.textContent = sc.name;
    var f = (CFG.floors || []).filter(function (x) { return x.id === sc.floor; })[0];
    elMeta.textContent = [f && f.name, sc.area, sc.capacity].filter(Boolean).join("  ·  ");
    elIdx.textContent = String(sc._i + 1).padStart(2, "0") + " / " + String(scenes.length).padStart(2, "0");
    $$(".vx-card").forEach(function (c) { c.classList.toggle("is-on", c.getAttribute("data-id") === sc.id); });
    Object.keys(planNodes).forEach(function (k) { planNodes[k].classList.toggle("is-on", k === sc.id); });
    if (sc.floor !== planFloor) showFloor(sc.floor);
    var card = $('.vx-card[data-id="' + sc.id + '"]');
    if (card && card.scrollIntoView) card.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest", inline: "center" });
    buildHotspots(sc);
  }

  /* ═════════════════════════════════════════════════════════════════════════
     7 · INPUT
     ═════════════════════════════════════════════════════════════════════════ */

  var drag = null;
  function pointerDown(e) {
    if (e.target.closest && e.target.closest(".vx-hot,.vx-ui")) return;
    drag = { x: e.clientX, y: e.clientY, yaw: cam.tYaw, pitch: cam.tPitch, moved: 0, t: now() };
    stage.classList.add("is-grabbing");
    cam.vYaw = cam.vPitch = 0;
    stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
    idleSince = now();
  }
  function pointerMove(e) {
    if (!drag) return;
    var k = cam.fov / 75 * 0.13;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    var ny = drag.yaw + dx * k, np = clamp(drag.pitch + dy * k, -88, 88);
    cam.vYaw = (ny - cam.tYaw); cam.vPitch = (np - cam.tPitch);
    cam.tYaw = ny; cam.tPitch = np;
    dismissHint();
  }
  function pointerUp(e) {
    if (!drag) return;
    stage.classList.remove("is-grabbing");
    if (drag.moved < 6 && editor.on) editor.placeAt(e.clientX, e.clientY);
    drag = null;
    idleSince = now();
  }
  stage.addEventListener("pointerdown", pointerDown);
  window.addEventListener("pointermove", pointerMove, { passive: true });
  window.addEventListener("pointerup", pointerUp);
  window.addEventListener("pointercancel", function () { drag = null; stage.classList.remove("is-grabbing"); });

  stage.addEventListener("wheel", function (e) {
    e.preventDefault();
    cam.tFov = clamp(cam.tFov + e.deltaY * 0.05, 32, 100);
    idleSince = now(); dismissHint();
  }, { passive: false });

  var pinch = null;
  stage.addEventListener("touchstart", function (e) {
    if (e.touches.length === 2) {
      pinch = { d: Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY), fov: cam.tFov };
      drag = null;
    }
  }, { passive: true });
  stage.addEventListener("touchmove", function (e) {
    if (pinch && e.touches.length === 2) {
      var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      cam.tFov = clamp(pinch.fov * pinch.d / d, 32, 100);
      dismissHint();
    }
  }, { passive: true });
  stage.addEventListener("touchend", function (e) { if (e.touches.length < 2) pinch = null; }, { passive: true });

  window.addEventListener("keydown", function (e) {
    if (e.target.matches && e.target.matches("input,textarea,select")) return;
    var k = e.key.toLowerCase(), step = e.shiftKey ? 18 : 6;
    if (k === "arrowleft") { cam.tYaw += step; dismissHint(); }
    else if (k === "arrowright") { cam.tYaw -= step; dismissHint(); }
    else if (k === "arrowup") { cam.tPitch = clamp(cam.tPitch + step * 0.6, -88, 88); dismissHint(); }
    else if (k === "arrowdown") { cam.tPitch = clamp(cam.tPitch - step * 0.6, -88, 88); dismissHint(); }
    else if (k === "+" || k === "=") cam.tFov = clamp(cam.tFov - 6, 32, 100);
    else if (k === "-" || k === "_") cam.tFov = clamp(cam.tFov + 6, 32, 100);
    else if (k === "a") toggleAuto();
    else if (k === "f") toggleFull();
    else if (k === "e") editor.toggle();
    else if (k === "escape") { closeDrawer(); if (editor.on) editor.toggle(); }
    else if (k >= "1" && k <= "9" && scenes[+k - 1]) goTo(scenes[+k - 1].id);
    else return;
    idleSince = now();
    if (autoplay && k !== "a") stopAuto();
  });

  function dismissHint() {
    if (!hinted) { hinted = true; elHint && elHint.classList.add("is-gone"); }
  }

  /* ═════════════════════════════════════════════════════════════════════════
     8 · TOOLBAR
     ═════════════════════════════════════════════════════════════════════════ */

  function toggleAuto() { autoplay ? stopAuto() : startAuto(); }
  function startAuto() {
    autoplay = true;
    $("#vxAuto").classList.add("is-on");
    $("#vxAuto").setAttribute("aria-pressed", "true");
    autoTimer = now() + (CFG.autoDwell || 11000);
    dismissHint();
  }
  function stopAuto() {
    autoplay = false;
    $("#vxAuto").classList.remove("is-on");
    $("#vxAuto").setAttribute("aria-pressed", "false");
  }
  $("#vxAuto").addEventListener("click", toggleAuto);

  function toggleFull() {
    var host = $("#vxApp");
    if (!document.fullscreenElement) (host.requestFullscreen || host.webkitRequestFullscreen).call(host);
    else document.exitFullscreen();
  }
  $("#vxFull").addEventListener("click", toggleFull);
  document.addEventListener("fullscreenchange", function () {
    $("#vxFull").classList.toggle("is-on", !!document.fullscreenElement);
    resize();
  });

  var gyroBtn = $("#vxGyro");
  if (!window.DeviceOrientationEvent || !coarse) gyroBtn.style.display = "none";
  gyroBtn.addEventListener("click", function () {
    if (gyro) { window.removeEventListener("deviceorientation", gyro); gyro = null; gyroBtn.classList.remove("is-on"); return; }
    var start = function () {
      var base = null;
      gyro = function (e) {
        if (e.alpha == null) return;
        if (base == null) base = e.alpha + cam.tYaw;
        cam.tYaw = base - e.alpha;
        cam.tPitch = clamp((e.beta || 0) - 90, -88, 88);
      };
      window.addEventListener("deviceorientation", gyro);
      gyroBtn.classList.add("is-on");
      dismissHint();
    };
    if (DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().then(function (r) { if (r === "granted") start(); });
    else start();
  });

  $("#vxShare").addEventListener("click", function () {
    var url = new URL(location.href);
    url.searchParams.set("s", (incoming || current).id);
    url.searchParams.set("y", cam.yaw.toFixed(1));
    url.searchParams.set("p", cam.pitch.toFixed(1));
    url.searchParams.set("f", cam.fov.toFixed(0));
    var link = url.toString();
    var done = function () { toast("View link copied — it opens on this exact angle."); };
    if (navigator.share && coarse) navigator.share({ title: document.title, url: link }).catch(function () { });
    else if (navigator.clipboard) navigator.clipboard.writeText(link).then(done, function () { prompt("Copy this link", link); });
    else prompt("Copy this link", link);
  });

  $("#vxShot").addEventListener("click", function () {
    flash = 0.85;
    render(now(), true);
    var a = el("a");
    a.download = (CFG.project.slug || "tour") + "-" + (incoming || current).id + ".png";
    a.href = canvas.toDataURL("image/png");
    a.click();
    toast("Still exported at " + canvas.width + "×" + canvas.height + ".");
  });

  var toastEl = $("#vxToast"), toastT = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove("is-on"); }, 3200);
  }

  /* ═════════════════════════════════════════════════════════════════════════
     9 · HOTSPOT EDITOR  — the hand-over half of the product
     ═════════════════════════════════════════════════════════════════════════ */

  var editor = {
    on: false,
    sel: -1,
    panel: $("#vxEditor"),
    toggle: function () {
      this.on = !this.on;
      stage.classList.toggle("is-editing", this.on);
      this.panel.classList.toggle("is-open", this.on);
      $("#vxEdit").classList.toggle("is-on", this.on);
      $("#vxEdit").setAttribute("aria-pressed", this.on ? "true" : "false");
      if (this.on) { stopAuto(); this.list(); toast("Editor on — click anywhere in the space to drop a hotspot."); }
    },
    placeAt: function (px, py) {
      var r = stage.getBoundingClientRect();
      var x = (px - r.left - r.width * 0.5) / (r.height * 0.5);
      var y = -(py - r.top - r.height * 0.5) / (r.height * 0.5);
      /* same basis as the shader: p ∈ [-1,1] vertically, f = 1/tan(fov/2) */
      var f = 1 / Math.tan(cam.fov * D2R * 0.5);
      var d = [x, y, -f];
      var L = Math.hypot(d[0], d[1], d[2]); d = [d[0] / L, d[1] / L, d[2] / L];
      var p = cam.pitch * D2R, cp = Math.cos(p), sp = Math.sin(p);
      var d1 = [d[0], d[1] * cp - d[2] * sp, d[1] * sp + d[2] * cp];
      var yw = cam.yaw * D2R, cy = Math.cos(yw), sy = Math.sin(yw);
      var w = [d1[0] * cy + d1[2] * sy, d1[1], -d1[0] * sy + d1[2] * cy];
      var pitch = Math.asin(clamp(w[1], -1, 1)) * R2D;
      var yaw = -Math.atan2(w[0], -w[2]) * R2D;
      var sc = incoming || current;
      sc.hotspots = sc.hotspots || [];
      sc.hotspots.push({ type: "info", yaw: +yaw.toFixed(2), pitch: +pitch.toFixed(2), label: "New hotspot", body: "" });
      buildHotspots(sc);
      this.list();
      this.select(sc.hotspots.length - 1);
    },
    select: function (i) {
      this.sel = i;
      this.list();
      var row = $('.vx-erow[data-i="' + i + '"]', this.panel);
      if (row) row.classList.add("is-sel");
    },
    list: function () {
      var sc = incoming || current, body = $("#vxEditList");
      body.innerHTML = "";
      (sc.hotspots || []).forEach(function (h, i) {
        var row = el("div", "vx-erow");
        row.setAttribute("data-i", i);
        var sel = el("select", "vx-esel");
        [["nav", "Navigate"], ["info", "Info"]].forEach(function (o) {
          var op = el("option", "", o[1]); op.value = o[0];
          if (h.type === o[0]) op.selected = true;
          sel.appendChild(op);
        });
        sel.addEventListener("change", function () { h.type = sel.value; buildHotspots(sc); editor.list(); });
        var lab = el("input", "vx-einp");
        lab.value = h.label || ""; lab.placeholder = "Label";
        lab.addEventListener("input", function () { h.label = lab.value; buildHotspots(sc); });
        var tgt = el("select", "vx-esel");
        var none = el("option", "", "— target —"); none.value = ""; tgt.appendChild(none);
        scenes.forEach(function (s) {
          var op = el("option", "", s.name); op.value = s.id;
          if (h.to === s.id) op.selected = true;
          tgt.appendChild(op);
        });
        tgt.addEventListener("change", function () { h.to = tgt.value; buildHotspots(sc); });
        var aim = el("button", "vx-ebtn", "Aim");
        aim.title = "Move this hotspot to where you're looking";
        aim.addEventListener("click", function () {
          h.yaw = +cam.yaw.toFixed(2); h.pitch = +cam.pitch.toFixed(2);
          buildHotspots(sc); toast("Hotspot re-aimed.");
        });
        var del = el("button", "vx-ebtn vx-ebtn--x", "✕");
        del.addEventListener("click", function () { sc.hotspots.splice(i, 1); buildHotspots(sc); editor.list(); });
        row.appendChild(sel); row.appendChild(lab); row.appendChild(tgt); row.appendChild(aim); row.appendChild(del);
        body.appendChild(row);
      });
      $("#vxEditWhere").textContent = sc.name;
    },
    exportJSON: function () {
      var out = JSON.stringify(CFG, null, 2);
      var blob = new Blob([out], { type: "application/json" });
      var a = el("a");
      a.href = URL.createObjectURL(blob);
      a.download = (CFG.project.slug || "tour") + ".json";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      toast("tour.json exported — that file is the whole tour.");
    }
  };
  $("#vxEdit").addEventListener("click", function () { editor.toggle(); });
  $("#vxEditExport").addEventListener("click", function () { editor.exportJSON(); });
  $("#vxEditClose").addEventListener("click", function () { editor.toggle(); });
  $("#vxEditStart").addEventListener("click", function () {
    var sc = incoming || current;
    sc.start = { yaw: +cam.yaw.toFixed(2), pitch: +cam.pitch.toFixed(2), fov: +cam.fov.toFixed(1) };
    paintThumb(sc.id);
    toast("Opening view for " + sc.name + " set to this angle.");
  });

  /* ═════════════════════════════════════════════════════════════════════════
     10 · RENDER LOOP
     ═════════════════════════════════════════════════════════════════════════ */

  var dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, coarse ? 2 : 2);
    var w = Math.max(2, stage.clientWidth), h = Math.max(2, stage.clientHeight);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
  }
  window.addEventListener("resize", resize);

  var lastT = now(), booted = false, totalJobs = 0, doneJobs = 0;

  function bakeBudget() {
    if (!queue.length) return;
    var start = now(), budget = coarse ? 10 : 14;
    while (queue.length && now() - start < budget) {
      var job = queue[0];
      bakeStep(job);
      if (job.done) { queue.shift(); doneJobs++; }
      if (job.kind === "hi" && !job.done) break;   // one hi-res band per frame, keeps it silky
    }
  }

  function loadProgress() {
    var first = byId[(incoming || current).id];
    var s = store[first.id];
    if (s.hi) return 1;
    var job = null;
    for (var i = 0; i < queue.length; i++) if (queue[i].id === first.id) { job = queue[i]; break; }
    if (!job) return s.lo ? 0.55 : 0.08;
    var base = job.kind === "lo" ? 0 : 0.45;
    var span = job.kind === "lo" ? 0.45 : 0.55;
    return base + span * (job.row / job.rows);
  }

  function render(t, force) {
    var dt = Math.min(64, t - lastT); lastT = t;
    var sc = incoming || current;

    /* camera easing */
    var k = 1 - Math.pow(0.0016, dt / 1000);
    if (!drag) { cam.tYaw += cam.vYaw * 0.0; }
    cam.yaw = lerp(cam.yaw, cam.tYaw, k);
    cam.pitch = lerp(cam.pitch, cam.tPitch, k);
    cam.fov = lerp(cam.fov, cam.tFov, 1 - Math.pow(0.002, dt / 1000));

    /* drift: a slow parallax breath when nobody's touching it */
    if (!drag && !gyro && !reduce && now() - idleSince > 4200) {
      cam.tYaw += (autoplay ? 0.013 : 0.0018) * dt;
    }

    /* transition */
    if (trans.t < 1) {
      trans.t = clamp(trans.t + dt / trans.dur, 0, 1);
      if (trans.t >= 1 && incoming) { current = incoming; incoming = null; }
    }

    /* auto tour */
    if (autoplay && t > autoTimer && trans.t >= 1) {
      var order = CFG.autoOrder || scenes.map(function (s) { return s.id; });
      var at = order.indexOf(current.id);
      goTo(order[(at + 1) % order.length]);
      autoTimer = t + (CFG.autoDwell || 11000);
    }

    /* textures */
    var texCur = best(current.id), texIn = incoming ? best(incoming.id) : null;
    var m = incoming ? ease(trans.t) : (function () {
      /* preview → hi-res sharpening fade inside a single scene */
      var s = store[current.id];
      if (s.hi && s.lo && s.hi !== s.lo) {
        current._sharp = Math.min(1, (current._sharp || 0) + dt / 420);
        return current._sharp;
      }
      current._sharp = 0;
      return 0;
    })();

    var A, B;
    if (incoming) { A = texCur; B = texIn || texCur; }
    else {
      var s = store[current.id];
      A = s.lo || s.hi; B = (s.hi && s.lo && s.hi !== s.lo) ? s.hi : (s.hi || s.lo);
    }
    var avail = (A && B) ? 1 : 0;
    if (!A) A = B;
    if (!B) B = A;

    if (elSharp) elSharp.classList.toggle("is-on", !incoming && !!store[current.id].lo && !store[current.id].hi);

    /* the dolly: A pushes past you, B opens up — reads as walking through */
    var fovA = cam.fov, fovB = cam.fov;
    if (incoming && !reduce) {
      var e = ease(trans.t);
      fovA = cam.fov * (1 - 0.30 * e);
      fovB = cam.fov * (1 + 0.26 * (1 - e));
    }

    resizeIfNeeded();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(progView.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, (A && A.tex) || blank);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, (B && B.tex) || blank);
    var u = progView.u;
    gl.uniform1i(u.uA, 0); gl.uniform1i(u.uB, 1);
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform1f(u.uYaw, cam.yaw * D2R);
    gl.uniform1f(u.uPitch, cam.pitch * D2R);
    gl.uniform1f(u.uFov, cam.fov * D2R);
    gl.uniform1f(u.uFovA, fovA * D2R);
    gl.uniform1f(u.uFovB, fovB * D2R);
    gl.uniform1f(u.uMix, m);
    gl.uniform1f(u.uAvail, avail);
    gl.uniform1f(u.uGrain, 0.022);
    gl.uniform1f(u.uVig, 0.30);
    gl.uniform1f(u.uFlash, flash);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    flash *= 0.86;
    if (flash < 0.004) flash = 0;

    layoutHotspots();

    /* plan radar + telemetry */
    var pin = planNodes[sc.id];
    if (pin) {
      var cone = $(".vx-cone", pin);
      if (cone) cone.setAttribute("transform", "rotate(" + (cam.yaw + (sc.north || 0)) + ")");
    }
    if (elTele) {
      elTele.textContent = "AZ " + ((cam.yaw % 360 + 360) % 360).toFixed(0).padStart(3, "0") +
        "°  EL " + (cam.pitch >= 0 ? "+" : "") + cam.pitch.toFixed(0) +
        "°  FOV " + cam.fov.toFixed(0) + "°";
    }

    if (!force) {
      bakeBudget();
      if (!booted) {
        var pr = loadProgress();
        elBar.style.transform = "scaleX(" + pr.toFixed(3) + ")";
        elPct.textContent = Math.round(pr * 100) + "%";
        elStage.textContent = pr < 0.12 ? "Calibrating optics" :
          pr < 0.45 ? "Ray-marching geometry" :
            pr < 0.92 ? "Stitching panorama" : "Sharpening";
        var st = store[current.id];
        if (st.hi || (st.lo && now() - bootStart > 2400)) {
          booted = true;
          elLoad.classList.add("is-gone");
          setTimeout(function () { elLoad.style.display = "none"; }, 900);
          if (!reduce) elHint && elHint.classList.add("is-on");
          scenes.forEach(function (s) { if (s !== current) needLo(s); });
        }
      }
      requestAnimationFrame(render);
    }
  }

  var lastW = 0, lastH = 0;
  function resizeIfNeeded() {
    var w = stage.clientWidth, h = stage.clientHeight;
    if (w !== lastW || h !== lastH) { lastW = w; lastH = h; resize(); }
  }

  /* ═════════════════════════════════════════════════════════════════════════
     11 · BOOT
     ═════════════════════════════════════════════════════════════════════════ */

  var bootStart = now();
  buildRail();
  buildPlan();

  var q = new URLSearchParams(location.search);
  var startScene = byId[q.get("s")] || scenes[0];
  current = startScene;
  cam.yaw = cam.tYaw = q.has("y") ? parseFloat(q.get("y")) : (startScene.start ? startScene.start.yaw : 0);
  cam.pitch = cam.tPitch = q.has("p") ? parseFloat(q.get("p")) : (startScene.start && startScene.start.pitch) || 0;
  cam.fov = cam.tFov = q.has("f") ? parseFloat(q.get("f")) : (startScene.start && startScene.start.fov) || 75;
  cam.yaw -= 26;                        // gentle settle-in on load
  cam.fov = Math.min(100, cam.fov + 9);

  showFloor(startScene.floor);
  setChrome(startScene);
  needLo(startScene, true);
  needHi(startScene, true);
  prefetchNeighbours(startScene);
  resize();
  requestAnimationFrame(render);

  /* expose a small API — hand-over friendly */
  window.VERTEX360 = {
    go: goTo,
    look: function (y, p, f) { cam.tYaw = y; cam.tPitch = p; if (f) cam.tFov = f; },
    auto: toggleAuto,
    editor: editor,
    config: CFG,
    /* QA hook: the flat equirectangular preview for a scene, as a data URL */
    panorama: function (id) { return thumbSrc[id] ? thumbSrc[id].toDataURL("image/png") : null; }
  };
})();
