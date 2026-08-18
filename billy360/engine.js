/* ═══════════════════════════════════════════════════════════════════════════
   BILLY360 · ENGINE
   The rendering core of the virtual tour platform. Raw WebGL, no dependencies.

   It does four things:
     1. Turns a room definition into an equirectangular panorama, ray-marched
        on the GPU in bands across frames so the main thread never blocks.
     2. Or loads a real stitched capture — Matterport, Insta360, Ricoh Theta,
        any 2:1 equirectangular JPEG — into exactly the same slot.
     3. Presents it as a photosphere with inertial look, zoom and a
        dolly-through transition between rooms.
     4. Projects world angles to screen coordinates so the interface can hang
        DOM hotspots in the scene, and inverts that so the CMS can place them.

   Public API — BILLY360.createEngine({ host, canvas, on… }) returns:
     load(tour)            adopt a tour definition
     mount(el)             move the canvas into another container (live)
     go(id, opts)          travel to a room
     look(yaw,pitch,fov)   aim the camera
     nudge(dy,dp) zoom(d)  relative camera moves
     camera()              { yaw, pitch, fov }
     project(yaw,pitch)    → [x, y, radius] in host pixels, or null if behind
     angleAt(clientX,Y)    → { yaw, pitch } under a screen point
     autoRotate(on,speed)  idle drift / guided-tour drift
     setPano(id, src)      swap a room to a real capture
     thumbnail(id,w,h,yaw) → canvas, or null until the preview has baked
     capture()             → PNG data URL of the current view
     quality(q)            'auto' | 'lo' | 'md' | 'hi'
     inputs(bool)          suspend look controls (modal open)
     resize() current() ready() destroy()
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  "use strict";

  var BILLY360 = global.BILLY360 = global.BILLY360 || {};

  var TAU = Math.PI * 2, D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var now = function () { return performance.now(); };
  var noop = function () { };
  /* the house easing curve — everything in the product decelerates like this */
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var easeInOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  BILLY360.easing = { out: easeOut, inOut: easeInOut };
  BILLY360.clamp = clamp;
  BILLY360.lerp = lerp;

  BILLY360.createEngine = function (opts) {
    opts = opts || {};
    var canvas = opts.canvas, host = opts.host || (canvas && canvas.parentNode);
    var on = {
      progress: opts.onProgress || noop,   // (0..1, stageLabel)
      ready: opts.onReady || noop,
      room: opts.onRoom || noop,           // (room, previousRoom)
      frame: opts.onFrame || noop,         // (camera, room)
      error: opts.onError || noop,         // ({ title, message, detail, diag })
      sharpen: opts.onSharpen || noop      // (bool) full-resolution pass running
    };
    if (!canvas) return null;

    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var coarse = matchMedia("(pointer: coarse)").matches;

    /* ─────────────────────────────────────────────────────────────────────
       GL CONTEXT — three attempts, then a real error rather than a hang
       ───────────────────────────────────────────────────────────────────── */
    var diag = [], gl = null;
    var tries = [
      { antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" },
      { antialias: false, alpha: false, preserveDrawingBuffer: true },
      {}
    ];
    for (var ti = 0; ti < tries.length && !gl; ti++) {
      try { gl = canvas.getContext("webgl", tries[ti]) || canvas.getContext("experimental-webgl", tries[ti]); }
      catch (e) { diag.push("getContext[" + ti + "]: " + e.message); }
    }
    if (!gl) {
      on.error({
        title: "This browser can't start WebGL",
        message: "The tour renders in 3D, so it needs hardware acceleration switched on. In Edge or Chrome open " +
          "<b>Settings → System → Use graphics acceleration when available</b>, turn it on and restart the browser. " +
          "If it is already on, the graphics driver may need updating.",
        detail: "canvas.getContext('webgl') returned null on all three attempts.",
        diag: diag.join("\n")
      });
      return null;
    }
    try {
      var dbg = gl.getExtension("WEBGL_debug_renderer_info");
      diag.push("renderer: " + (dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)));
      diag.push("vendor: " + (dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)));
      diag.push("version: " + gl.getParameter(gl.VERSION));
      diag.push("max texture: " + gl.getParameter(gl.MAX_TEXTURE_SIZE));
    } catch (e) { }

  var VS = [
    "attribute vec2 aP;",
    "void main(){ gl_Position = vec4(aP, 0.0, 1.0); }"
  ].join("\n");

  /* ── 1a · the baker: ray-marches a room into equirectangular space ─────── */
  var BAKE_BODY = [
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
    "#if LAYOUT==0",
    "  {",
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
    "#endif",
    "#if LAYOUT==1",
    "  {",
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
    "#endif",
    "#if LAYOUT==2",
    "  {",
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
    "#endif",
    "#if LAYOUT==3",
    "  {",
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
    "#endif",
    "#if LAYOUT==4",
    "  {",
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
    "#endif",
    "#if LAYOUT==5",
    "  {",
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
    "#endif",
    "#if LAYOUT==6",
    "  {",
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
    "#endif",
    "#if LAYOUT==7",
    "  {",
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
    "#endif",
    "#if LAYOUT==8",
    "  {",
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

    /* 9 — hallway */
    "#endif",
    "#if LAYOUT==9",
    "  {",
    "    vec3 dp=p; dp.z=rep1(dp.z,3.2,2.0);",
    "    vec3 sd=vec3(dp.x-(w-0.05), dp.y, dp.z);",
    "    r=um(r, vec2(sdBox(sd-vec3(0.0,1.06,0.0), vec3(0.055,1.06,0.58)), MM));",
    "    r=um(r, vec2(sdBox(sd-vec3(-0.02,1.02,0.0), vec3(0.035,1.02,0.50)), MD));",
    "    r=um(r, vec2(sdSph(sd-vec3(-0.06,1.02,0.40),0.028), MM));",
    "    r=um(r, vec2(sdBox(sd-vec3(0.0,2.26,0.0), vec3(0.018,0.085,0.24)), ME));",
    "    vec3 bat=p-vec3(-w+0.02,0.0,0.0); bat.z=rep1(bat.z,0.14,60.0);",
    "    r=um(r, vec2(sdBox(bat-vec3(0.0,1.30,0.0), vec3(0.035,1.30,0.030)), MD));",
    "    vec3 bt=p-vec3(w-0.46,0.0,-d+3.2);",
    "    r=um(r, vec2(sdRBox(bt-vec3(0.0,0.43,0.0), vec3(0.28,0.05,1.05),0.05), MD));",
    "    r=um(r, vec2(sdBox(bt-vec3(0.0,0.21,0.0), vec3(0.025,0.21,0.88)), MM));",
    "    vec3 pl=p-vec3(-w+0.5,0.0,d-1.5);",
    "    r=um(r, vec2(sdCyl(pl-vec3(0.0,0.26,0.0),0.26,0.23), MT));",
    "    r=um(r, vec2(sdSph((pl-vec3(0.0,0.92,0.0))*vec3(1.0,0.72,1.0),0.50), MP));",
    "    r=um(r, vec2(sdBox(p-vec3(-w+0.06,1.55,-d+2.0), vec3(0.02,0.34,0.62)), MA));",
    "  }",

    /* 10 — lounge */
    "#endif",
    "#if LAYOUT==10",
    "  {",
    "    r=um(r, vec2(sdBox(p-vec3(0.0,0.005,0.3), vec3(2.4,0.005,1.85)), MR));",
    "    r=um(r, vec2(sofa(p-vec3(0.0,0.0,-1.45),1.45), MB));",
    "    vec3 s2=p-vec3(0.0,0.0,2.05); s2.z=-s2.z;",
    "    r=um(r, vec2(sofa(s2,1.45), MB));",
    "    vec3 ac=p-vec3(2.5,0.0,0.3); ac.z=abs(ac.z)-0.95;",
    "    r=um(r, vec2(sdRBox(ac-vec3(0.0,0.30,0.0), vec3(0.36,0.28,0.36),0.13), MB));",
    "    r=um(r, vec2(sdRBox(ac-vec3(0.26,0.60,0.0), vec3(0.09,0.26,0.36),0.09), MB));",
    "    r=um(r, vec2(sdRBox(p-vec3(0.0,0.35,0.3), vec3(0.85,0.035,0.44),0.03), MD));",
    "    r=um(r, vec2(sdBox(p-vec3(0.0,0.17,0.3), vec3(0.70,0.17,0.06)), MM));",
    "    r=um(r, vec2(sdCyl(p-vec3(-0.35,0.40,0.3),0.05,0.09), MT));",
    "    vec3 lp=p-vec3(-2.6,0.0,-1.1);",
    "    r=um(r, vec2(sdCyl(lp-vec3(0.0,0.02,0.0),0.02,0.21), MM));",
    "    r=um(r, vec2(sdCyl(lp-vec3(0.0,0.82,0.0),0.82,0.017), MM));",
    "    r=um(r, vec2(sdCyl(lp-vec3(0.0,1.70,0.0),0.15,0.19), ME));",
    "    vec3 sh=p-vec3(0.0,0.0,-d+0.30); sh.y=rep1(sh.y-1.15,0.44,2.0);",
    "    r=um(r, vec2(sdBox(sh, vec3(1.55,0.025,0.15)), MD));",
    "    r=um(r, vec2(sdBox(p-vec3(0.0,1.30,-d+0.06), vec3(1.75,1.25,0.045)), MA));",
    "    vec3 pl=p-vec3(w-0.75,0.0,-d+1.1);",
    "    r=um(r, vec2(sdCyl(pl-vec3(0.0,0.28,0.0),0.28,0.25), MT));",
    "    r=um(r, vec2(sdSph((pl-vec3(0.0,0.96,0.0))*vec3(1.0,0.74,1.0),0.55), MP));",
    "    vec3 pd=p-vec3(0.0,h-0.72,0.3); pd.x=rep1(pd.x,0.82,1.0);",
    "    r=um(r, vec2(sdSph(pd,0.115), ME));",
    "    r=um(r, vec2(sdCyl(pd-vec3(0.0,0.40,0.0),0.40,0.006), MM));",
    "  }",
    "#endif",
    "  return r;",
    "}",

    "vec2 map(vec3 p){ return um(um(shell(p), lights(p)), props(p)); }",

    "vec3 normal(vec3 p){",
    "  vec2 e=vec2(0.0012,0.0);",
    "  return normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x, map(p+e.yxy).x-map(p-e.yxy).x, map(p+e.yyx).x-map(p-e.yyx).x));",
    "}",
    "vec2 march(vec3 ro, vec3 rd, float mx){",
    "  float t=0.02, m=0.0;",
    "  for(int i=0;i<STEPS;i++){",
    "    vec3 p=ro+rd*t; vec2 h=map(p);",
    "    if(abs(h.x)<0.0012*t+0.0006){ m=h.y; break; }",
    "    t+=h.x*0.92; if(t>mx){ m=0.0; break; }",
    "  }",
    "  return vec2(t,m);",
    "}",
    "float shadow(vec3 ro, vec3 rd, float mx){",
    "  float res=1.0, t=0.05;",
    "  for(int i=0;i<SHSTEPS;i++){",
    "    float h=map(ro+rd*t).x;",
    "    if(h<0.002) return 0.06;",
    "    res=min(res, 9.0*h/t); t+=clamp(h,0.03,0.5);",
    "    if(t>mx) break;",
    "  }",
    "  return clamp(res,0.06,1.0);",
    "}",
    "float ao(vec3 p, vec3 n){",
    "  float s=0.0, sca=1.0;",
    "  for(int i=0;i<AOTAPS;i++){",
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
    "#if COMPAT==0",
    "    vec3 refl = render_cheap_flag(p,n,rd);",
    "#else",
    "    vec3 refl = sky(reflect(rd,n));",
    "#endif",
    "    return mix(out1, refl, 0.10) * (0.94+0.06*uWarm);",
    "  }",
    "  vec3 col = lightAt(p,n,rd,alb,rough,emis,m,ao(p,n),true);",
    /* one gloss bounce for polished floors / stone / screens */
    "#if COMPAT==0",
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
    "#endif",
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

  /* One program per furniture set, not one program containing all eleven.
     ANGLE/Direct3D rejects the combined shader on older integrated graphics —
     it links past the driver's instruction budget and takes the GL context
     with it. Specialising by layout cuts the compiled size by roughly an
     order of magnitude; COMPAT drops the two secondary ray-marches for the
     drivers that still can't take it. */
  function bakeSource(layout, compat) {
    return "#define LAYOUT " + (layout | 0) + "\n" +
      "#define COMPAT " + (compat ? 1 : 0) + "\n" +
      "#define STEPS " + (compat ? 88 : 128) + "\n" +
      "#define SHSTEPS " + (compat ? 12 : 28) + "\n" +
      "#define AOTAPS " + (compat ? 3 : 5) + "\n" +
      BAKE_BODY;
  }


  /* ── 1c · the lite renderer ────────────────────────────────────────────
     No ray-marching, no loops, no SDFs — one analytic ray/box intersection
     and a face shade. It is the shader that compiles when nothing else will,
     on hardware a decade old. Rooms lose their furniture; the tour, the
     hotspots, the plan, the navigation and any real captured panorama are
     completely unaffected. */
  var LITE_FS = [
    "precision mediump float;",
    "uniform vec2  uRes;",
    "uniform vec3  uRoom, uCam, uWall, uFlr, uAcc, uLit;",
    "uniform float uGlazeA, uGlazeB, uWarm, uOpen, uExpo, uSeed, uCity;",
    "float hash21(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }",
    "vec3 sky(vec3 rd){",
    "  float t=clamp(rd.y*0.5+0.5,0.0,1.0);",
    "  vec3 zen=mix(vec3(0.26,0.44,0.86), vec3(0.16,0.30,0.72), uWarm);",
    "  vec3 hz =mix(vec3(0.86,0.90,0.97), vec3(1.00,0.86,0.72), uWarm);",
    "  vec3 c=mix(hz, zen, smoothstep(0.5,0.94,t));",
    "  vec3 sun=normalize(vec3(0.55,0.30,-0.78));",
    "  float sd=max(dot(rd,sun),0.0);",
    "  c+=vec3(1.0,0.88,0.70)*pow(sd,900.0)*7.0 + vec3(1.0,0.82,0.62)*pow(sd,10.0)*0.20;",
    "  if(rd.y<0.06){",
    "    float ang=atan(rd.x,rd.z);",
    "    float hgt=(0.02+hash21(vec2(floor(ang*8.0),1.0))*0.10)*uCity;",
    "    vec3 bc=mix(hz*0.9, vec3(0.13,0.16,0.24), 0.7);",
    "    c=mix(c, bc, step(rd.y,hgt)*0.9);",
    "    c=mix(c, vec3(0.16,0.18,0.19), smoothstep(0.0,-0.10,rd.y)*0.92);",
    "  }",
    "  return c;",
    "}",
    "vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }",
    "void main(){",
    "  vec2 uv = gl_FragCoord.xy / uRes;",
    "  float lon=(uv.x-0.5)*6.2831853, lat=(uv.y-0.5)*3.14159265;",
    "  vec3 rd = vec3(cos(lat)*sin(lon), sin(lat), -cos(lat)*cos(lon));",
    "  vec3 ro = uCam;",
    "  vec3 bmin = vec3(-uRoom.x*0.5, 0.0, -uRoom.z*0.5);",
    "  vec3 bmax = vec3( uRoom.x*0.5, uRoom.y,  uRoom.z*0.5);",
    "  vec3 sd = sign(rd) * max(abs(rd), vec3(1e-5));",
    "  vec3 tm = (mix(bmin, bmax, step(0.0, sd)) - ro) / sd;",
    "  float t = min(min(tm.x, tm.y), tm.z);",
    "  vec3 p = ro + rd * t;",
    "  vec3 col;",
    "  bool up = (t == tm.y) && rd.y > 0.0;",
    "  bool dn = (t == tm.y) && rd.y <= 0.0;",
    "  if(up && uOpen > 0.5) { col = sky(rd); }",
    "  else if(dn){",                                   /* floor */
    "    vec2 g = p.xz;",
    "    float seam = min(abs(fract(g.x/1.2)-0.5), abs(fract(g.y/1.2)-0.5));",
    "    float fall = 1.0 - clamp(length(g)/max(uRoom.x,uRoom.z), 0.0, 0.55);",
    "    col = uFlr * (0.42 + 0.42*fall);",
    "    col *= mix(0.55, 1.0, smoothstep(0.0, 0.035, seam));",
    "    col += uLit * 0.10 * pow(max(0.0, 1.0 - abs(fract(g.x/2.6)-0.5)*3.4), 6.0);",
    "  }",
    "  else if(up){",                                   /* ceiling + light lines */
    "    float strip = abs(fract(p.x/(uRoom.x*0.33))-0.5)*(uRoom.x*0.33);",
    "    float inRun = step(abs(p.z), uRoom.z*0.36);",
    "    col = uWall * 0.16;",
    "    col += uLit * 3.2 * step(strip, 0.08) * inRun;",
    "  }",
    "  else {",                                         /* walls + glazing */
    "    bool xf = (t == tm.x);",
    "    float face = xf ? (rd.x < 0.0 ? 2.0 : 3.0) : (rd.z < 0.0 ? 0.0 : 1.0);",
    "    bool glazed = abs(face-uGlazeA) < 0.5 || abs(face-uGlazeB) < 0.5;",
    "    if(glazed){",
    "      float u = xf ? p.z : p.x;",
    "      float bar = min(abs(fract(u/1.55)-0.5)*1.55, abs(fract(p.y/2.3)-0.5)*2.3);",
    "      col = bar < 0.035 ? vec3(0.05,0.055,0.065) : sky(rd)*0.96;",
    "    } else {",
    "      col = uWall * (0.40 + 0.42*smoothstep(0.0, uRoom.y, p.y));",
    "      col *= mix(0.55, 1.0, smoothstep(0.0, 0.02, abs(p.y-2.42)));",
    "      if(p.y < 0.10) col = uWall * 0.34;",
    "      if(abs(face-0.0) < 0.5) col = mix(col, uAcc, 0.55*step(abs(p.x), uRoom.x*0.22)*step(1.0, p.y)*step(p.y, 2.9));",
    "      col += uLit * 0.16 * smoothstep(uRoom.y*0.62, uRoom.y, p.y);",
    "    }",
    "  }",
    "  col *= uExpo * 0.92;",
    "  col = aces(col);",
    "  col = pow(col, vec3(1.0/2.2));",
    "  col += (hash21(gl_FragCoord.xy+uSeed)-0.5)*0.014;",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

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

    /* ─────────────────────────────────────────────────────────────────────
       PROGRAMS
       ───────────────────────────────────────────────────────────────────── */
    var shaderLog = "";
    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        shaderLog += (gl.getShaderInfoLog(s) || "unknown compile error") + "\n";
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
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        shaderLog += (gl.getProgramInfoLog(p) || "unknown link error") + "\n";
        return null;
      }
      var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < n; i++) {
        var nm = gl.getActiveUniform(p, i).name;
        u[nm] = gl.getUniformLocation(p, nm);
      }
      return { p: p, u: u };
    }

    var quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    var progView = program(VIEW_FS);
    if (!progView) {
      on.error({
        title: "This GPU couldn't compile the renderer",
        message: "The viewer is built by a shader and the graphics driver rejected it. Updating the graphics " +
          "driver usually resolves it — or open the tour on another machine.",
        detail: shaderLog, diag: diag.join("\n")
      });
      return null;
    }

    /* Three renderers, hardest first. Some integrated GPUs — Intel HD through
       ANGLE and Direct3D especially — cannot link the full shader; the link
       fails and takes the GL context with it. So each tier is tried in turn,
       the working one is remembered, and a machine that needs a lower tier
       never sees a failure twice.

         0  full     ray-marched, reflections, soft shadows
         1  compact  ray-marched, no secondary marches, shorter loops
         2  lite     analytic ray/box — no loops at all, compiles anywhere */
    var TIERS = ["full", "compact", "lite"];
    var TIER = 0, bakeProgs = {}, shaderFailed = false;
    try { TIER = Math.min(2, Math.max(0, parseInt(localStorage.getItem("billy360:tier"), 10) || 0)); } catch (e) { }
    var tq = /[?&]tier=([0-2])/.exec(location.search);
    if (tq) TIER = +tq[1];
    if (/[?&]compat=1/.test(location.search)) TIER = Math.max(TIER, 1);
    /* ?safe=1 — the one switch for a struggling machine: lite renderer,
       remembered, so the same laptop never tries the heavy shader again */
    if (/[?&]safe=1/.test(location.search)) { TIER = 2; rememberTier(2); }
    if (TIER) diag.push("starting on the " + TIERS[TIER] + " renderer");

    function rememberTier(t) { try { localStorage.setItem("billy360:tier", String(t)); } catch (e) { } }
    function reloadOnce() {
      var done = false;
      try { done = sessionStorage.getItem("billy360:tier-reload") === "1"; } catch (e) { }
      if (done) return false;
      try { sessionStorage.setItem("billy360:tier-reload", "1"); } catch (e) { }
      location.reload();
      return true;
    }

    function bakeProgram(layout) {
      layout = layout | 0;
      if (bakeProgs[layout + ":" + TIER]) return bakeProgs[layout + ":" + TIER];
      if (shaderFailed) return null;
      for (var t = TIER; t <= 2; t++) {
        shaderLog = "";
        var prog = (t === 2) ? program(LITE_FS) : program(bakeSource(layout, t));
        if (prog) {
          if (t !== TIER) { TIER = t; rememberTier(t); diag.push("renderer → " + TIERS[t]); }
          bakeProgs[layout + ":" + t] = prog;
          return prog;
        }
        diag.push("the " + TIERS[t] + " renderer was rejected: " + ((shaderLog || "no log").split("\n")[0]));
        /* a failed link often loses the context — reload straight into the
           next tier rather than limping on a dead one */
        if (gl.isContextLost()) {
          rememberTier(Math.min(2, t + 1));
          shaderFailed = true;
          if (reloadOnce()) return null;
          break;
        }
      }
      shaderFailed = true;
      on.error({
        title: "This GPU couldn't compile the renderer",
        message: "Each space is drawn by a shader, and this graphics driver rejected every version of it — " +
          "including the one written for older hardware. Updating the graphics driver almost always resolves " +
          "it. A tour built from real captured panoramas does not use this shader at all and would still run.",
        detail: shaderLog, diag: diag.join("\n")
      });
      return null;
    }

    /* ─────────────────────────────────────────────────────────────────────
       PANORAMA SIZES — always power-of-two: WebGL 1 only wraps POT textures
       and a panorama that cannot wrap shows a seam at 0°.
       ───────────────────────────────────────────────────────────────────── */
    var MAXTEX = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    function pot(v) { var n = 1; while (n * 2 <= v) n *= 2; return n; }
    var HI_W, LO_W, HI_H, LO_H, tiersLeft, qualityMode = "auto";

    function applyQuality(q) {
      qualityMode = q || "auto";
      if (q === "lo") { HI_W = 512; LO_W = 256; tiersLeft = 0; }
      else if (q === "md") { HI_W = 1024; LO_W = 512; tiersLeft = 0; }
      else if (q === "hi") { HI_W = pot(Math.min(4096, MAXTEX)); LO_W = 1024; tiersLeft = 0; }
      else {
        HI_W = pot(Math.min(coarse ? 2048 : 4096, MAXTEX));
        LO_W = pot(Math.min(1024, MAXTEX));
        tiersLeft = 2;
      }
      HI_H = HI_W / 2; LO_H = LO_W / 2;
    }
    applyQuality((opts.quality) || "auto");

    function downshift() {
      if (tiersLeft-- <= 0 || HI_W <= 512) return;
      HI_W = Math.max(512, HI_W / 2); HI_H = HI_W / 2;
      for (var i = queue.length - 1; i >= 0; i--) {
        if (queue[i].kind === "hi" && !queue[i].target) { queue[i].w = HI_W; queue[i].h = HI_H; }
      }
      diag.push("quality downshift → " + HI_W + "×" + HI_H);
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
    var blank = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, blank);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([8, 8, 10]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    function srgb(h, mul) {
      h = String(h || "#888").replace("#", "");
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var n = parseInt(h, 16), m = mul == null ? 1 : mul;
      if (isNaN(n)) n = 0x888888;
      return [Math.pow(((n >> 16) & 255) / 255, 2.2) * m,
              Math.pow(((n >> 8) & 255) / 255, 2.2) * m,
              Math.pow((n & 255) / 255, 2.2) * m];
    }
    var GLAZE = { "-z": 0, "+z": 1, "-x": 2, "+x": 3, "": -1, none: -1 };

    function bakeUniforms(room, prog, w, h) {
      var R = room.space || {}, P = R.palette || {}, u = prog.u;
      gl.uniform2f(u.uRes, w, h);
      gl.uniform3f(u.uRoom, R.w || 10, R.h || 3, R.d || 10);
      gl.uniform3f(u.uCam, (R.cam && R.cam[0]) || 0, R.eye || 1.62, (R.cam && R.cam[1]) || 0);
      gl.uniform1f(u.uLayout, R.layout || 0);
      gl.uniform1f(u.uGlazeA, GLAZE[R.glaze] != null ? GLAZE[R.glaze] : 1);
      gl.uniform1f(u.uGlazeB, GLAZE[R.glaze2] != null ? GLAZE[R.glaze2] : -1);
      gl.uniform3fv(u.uWall, srgb(P.wall || "#d9dde6"));
      gl.uniform3fv(u.uFlr, srgb(P.floor || "#8d8f96"));
      gl.uniform3fv(u.uAcc, srgb(P.accent || "#1e3a8a"));
      gl.uniform3fv(u.uLit, srgb(P.light || "#ffe9c9"));
      gl.uniform3fv(u.uWood, srgb(P.wood || "#a9743f"));
      gl.uniform3fv(u.uFab, srgb(P.fabric || "#39506e"));
      gl.uniform1f(u.uSeed, R.seed || 1);
      gl.uniform1f(u.uExpo, R.exposure || 1);
      gl.uniform1f(u.uCity, R.city == null ? 1 : R.city);
      gl.uniform1f(u.uWarm, R.warm || 0);
      gl.uniform1f(u.uOpen, R.open ? 1 : 0);
    }

    /* ─────────────────────────────────────────────────────────────────────
       ROOM STORE + PROGRESSIVE BAKER
       Previews for every room, full resolution only where the visitor is —
       with an LRU so a thirteen-room building never holds thirteen 4K
       panoramas in video memory at once.
       ───────────────────────────────────────────────────────────────────── */
    var tour = null, rooms = [], byId = {}, store = {}, thumbSrc = {};
    var queue = [], hiPool = [], HI_KEEP = coarse ? 2 : 3;
    /* measured GPU cost, ms per pixel. GL submits return immediately, so the
       CPU clock says nothing about what the GPU is being asked to chew — on a
       slow chip an unpaced queue can back the driver up past its watchdog and
       freeze the whole browser. One honest measurement, then every frame's
       submissions are capped by *estimated GPU milliseconds*. */
    /* previews start banded — 8 small draws instead of one big one — because
       the first draw happens before anything is known about the GPU, and one
       oversize draw on a weak chip can trip the driver watchdog and take the
       whole browser with it. Fast GPUs collapse back to single-draw previews
       the moment the first band has been measured. */
    var perPx = 0, gpuMeasured = false, LO_ROWS = 8;

    function enqueue(id, kind, priority) {
      for (var i = 0; i < queue.length; i++) if (queue[i].id === id && queue[i].kind === kind) return queue[i];
      var job = {
        id: id, kind: kind,
        w: kind === "hi" ? HI_W : LO_W, h: kind === "hi" ? HI_H : LO_H,
        rows: kind === "hi" ? (coarse ? 8 : 16) : LO_ROWS, row: 0, target: null, done: false
      };
      var pos = 0;
      while (pos < queue.length && queue[pos].row > 0) pos++;          // never interrupt live work
      if (!(kind === "lo" && priority)) {
        while (pos < queue.length && queue[pos].kind === "lo") pos++;   // previews outrank full res
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
            if (victim.id === (current && current.id) || (incoming && victim.id === incoming.id)) { hiPool.push(victim); break; }
            gl.deleteTexture(victim.t.tex);
            if (store[victim.id]) store[victim.id].hi = null;
          }
          job.target = makeTex(job.w, job.h);
          hiPool.push({ id: job.id, t: job.target });
        } else job.target = makeTex(job.w, job.h);
      }
      var room = byId[job.id];
      if (!room) { job.done = true; return; }
      var progBake = bakeProgram((room.space && room.space.layout) || 0);
      if (!progBake) { job.done = true; return; }
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, job.target.tex, 0);
      gl.useProgram(progBake.p);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      bakeUniforms(room, progBake, job.w, job.h);
      gl.viewport(0, 0, job.w, job.h);
      var band = Math.ceil(job.h / job.rows), t0 = now();
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0, job.row * band, job.w, band);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.SCISSOR_TEST);
      job.row++;
      if (!gpuMeasured && job.kind === "lo") {
        /* one synchronous read of the true GPU cost of a raymarched band */
        gl.finish();
        perPx = Math.max(now() - t0, 0.5) / (job.w * band);
        gpuMeasured = true;
        var hiRows = coarse ? 8 : 16;
        while (tiersLeft > 0 && perPx * (HI_W * HI_H / hiRows) > 110) downshift();
        if (perPx * LO_W * LO_H < 12) {
          /* fast GPU — collapse untouched previews back to one draw each */
          LO_ROWS = 1;
          for (var qi = 0; qi < queue.length; qi++) {
            if (queue[qi].kind === "lo" && queue[qi].row === 0) queue[qi].rows = 1;
          }
        } else {
          diag.push("slow GPU · previews stay banded (" + perPx.toFixed(4) + " ms/px)");
        }
      }
      if (job.row >= job.rows) {
        job.done = true;
        if (job.kind === "hi") store[job.id].hi = job.target;
        else { store[job.id].lo = job.target; readbackThumb(job); }
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /* the preview pass is already on the GPU — pull it back once and every
       thumbnail in the interface is free after that */
    function readbackThumb(job) {
      try {
        var px = new Uint8Array(job.w * job.h * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.readPixels(0, 0, job.w, job.h, gl.RGBA, gl.UNSIGNED_BYTE, px);
        var c = document.createElement("canvas");
        c.width = job.w; c.height = job.h;
        var ctx = c.getContext("2d"), img = ctx.createImageData(job.w, job.h);
        for (var y = 0; y < job.h; y++) {
          var srow = (job.h - 1 - y) * job.w * 4;
          img.data.set(px.subarray(srow, srow + job.w * 4), y * job.w * 4);
        }
        ctx.putImageData(img, 0, 0);
        thumbSrc[job.id] = c;
        if (opts.onThumb) opts.onThumb(job.id);
      } catch (e) { /* a nicety, never a blocker */ }
    }

    /* Real captures arrive together, and each one costs a JPEG decode plus a
       full-frame GPU upload. Fire them all at once and a modest laptop locks
       up in exactly the way the bake scheduler was built to prevent — so
       captures get the same treatment: one at a time, decoded off the main
       thread where the browser can, resampled down to what the tier can
       afford, with a breather between each so input and rendering stay
       alive. The room being walked into jumps the queue. */
    var panoQ = [], panoBusy = false, panoLoading = {};

    function panoCap() {
      /* full desktop tier takes the capture as shipped; touch devices,
         downshifted tiers and explicit low-quality modes take a quarter of
         the pixels (half the edge) — indistinguishable at phone FOVs,
         and a quarter of the decode, upload and VRAM */
      var cap = (TIER > 0 || coarse || qualityMode === "lo" || qualityMode === "md") ? 1024 : 2048;
      return Math.max(512, Math.min(cap, HI_W, MAXTEX));
    }

    function panoStep(job) {
      var room = job.room, im = job.im;
      try {
        var tw = Math.min(pot(im.width), panoCap()), th = tw / 2, src = im;
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
        store[room.id].lo = store[room.id].hi = { tex: t, w: tw, h: th };
        /* thumbnail straight off the capture */
        var tc = document.createElement("canvas");
        tc.width = 640; tc.height = 320;
        tc.getContext("2d").drawImage(im, 0, 0, 640, 320);
        thumbSrc[room.id] = tc;
        if (opts.onThumb) opts.onThumb(room.id);
        if (job.cb) job.cb();
      } catch (e) {
        diag.push("panorama upload failed: " + room.pano);
        if (room.space) enqueue(room.id, "lo", true);
      }
    }

    function panoPump() {
      if (panoBusy || !panoQ.length || destroyed) return;
      panoBusy = true;
      var job = panoQ.shift();
      var im = new Image();
      im.crossOrigin = "anonymous";
      var done = function (ok) {
        if (ok) { job.im = im; panoStep(job); }
        delete panoLoading[job.room.id];
        /* a breather between captures — frames, scroll and clicks get
           serviced before the next decode+upload lands */
        setTimeout(function () { panoBusy = false; panoPump(); }, job.priority ? 30 : 150);
      };
      im.onload = function () {
        /* decode() moves the JPEG decode off the main thread; drawing an
           undecoded image forces a synchronous decode right in the handler */
        if (im.decode) im.decode().then(function () { done(true); }, function () { done(true); });
        else done(true);
      };
      im.onerror = function () {
        diag.push("panorama failed to load: " + job.room.pano);
        if (job.room.space) enqueue(job.room.id, "lo", true);
        done(false);
      };
      im.src = job.room.pano;
    }

    function loadPano(room, kind, cb, priority) {
      if (panoLoading[room.id]) return;
      panoLoading[room.id] = true;
      var job = { room: room, cb: cb, priority: !!priority };
      if (priority) panoQ.unshift(job); else panoQ.push(job);
      panoPump();
    }

    function needLo(room, priority) {
      if (!room || store[room.id].lo) return;
      if (room.pano) loadPano(room, "lo", null, priority);
      else enqueue(room.id, "lo", priority);
    }
    function needHi(room, priority) {
      if (!room || store[room.id].hi) return;
      if (room.pano) return;                       // a capture is already full resolution
      enqueue(room.id, "hi", priority);
    }
    function best(id) { return store[id] ? (store[id].hi || store[id].lo) : null; }

    /* ─────────────────────────────────────────────────────────────────────
       CAMERA
       ───────────────────────────────────────────────────────────────────── */
    var cam = { yaw: 0, pitch: 0, fov: 75, tYaw: 0, tPitch: 0, tFov: 75 };
    var current = null, incoming = null;
    var trans = { t: 1, dur: 1100 };
    var drift = 0, driftSpeed = 0.0022, idleSince = now(), inputsOn = true;
    var asleep = false;   // canvas parked in a hidden view — skip the draw, keep baking
    var flash = 0, booted = false, bootStart = now(), destroyed = false;

    function camDir(yawDeg, pitchDeg) {
      var y = yawDeg * D2R, p = pitchDeg * D2R;
      var dy = Math.sin(p), dz = -Math.cos(p);
      var cy = Math.cos(y), sy = Math.sin(y);
      return [dz * sy, dy, dz * cy];
    }

    function project(yawDeg, pitchDeg) {
      var w = camDir(yawDeg, pitchDeg);
      var y = -cam.yaw * D2R, p = -cam.pitch * D2R;
      var cy = Math.cos(y), sy = Math.sin(y);
      var x1 = w[0] * cy + w[2] * sy, y1 = w[1], z1 = -w[0] * sy + w[2] * cy;
      var cp = Math.cos(p), sp = Math.sin(p);
      var y2 = y1 * cp - z1 * sp, z2 = y1 * sp + z1 * cp;
      if (z2 > -0.02) return null;
      var f = 1 / Math.tan(cam.fov * D2R * 0.5);
      var sx = f * x1 / -z2, sy2 = f * y2 / -z2;
      var W = host.clientWidth, H = host.clientHeight;
      return [W * 0.5 + sx * H * 0.5, H * 0.5 - sy2 * H * 0.5, Math.hypot(sx, sy2)];
    }

    function angleAt(clientX, clientY) {
      var r = host.getBoundingClientRect();
      var x = (clientX - r.left - r.width * 0.5) / (r.height * 0.5);
      var y = -(clientY - r.top - r.height * 0.5) / (r.height * 0.5);
      var f = 1 / Math.tan(cam.fov * D2R * 0.5);
      var d = [x, y, -f], L = Math.hypot(d[0], d[1], d[2]);
      d = [d[0] / L, d[1] / L, d[2] / L];
      var p = cam.pitch * D2R, cp = Math.cos(p), sp = Math.sin(p);
      var d1 = [d[0], d[1] * cp - d[2] * sp, d[1] * sp + d[2] * cp];
      var yw = cam.yaw * D2R, cy = Math.cos(yw), sy = Math.sin(yw);
      var wv = [d1[0] * cy + d1[2] * sy, d1[1], -d1[0] * sy + d1[2] * cy];
      return {
        yaw: -Math.atan2(wv[0], -wv[2]) * R2D,
        pitch: Math.asin(clamp(wv[1], -1, 1)) * R2D
      };
    }

    /* ─────────────────────────────────────────────────────────────────────
       NAVIGATION
       ───────────────────────────────────────────────────────────────────── */
    function go(id, o) {
      var room = byId[id];
      o = o || {};
      if (!room) return false;
      if ((incoming && incoming.id === id) || (!incoming && current && current.id === id && !o.force)) {
        if (o.yaw != null) look(o.yaw, o.pitch, o.fov);
        return false;
      }
      var from = incoming || current;
      incoming = room;
      needLo(room, true); needHi(room, true);
      trans.t = 0;
      trans.dur = reduce ? 220 : (o.dur || 1100);
      var s = room.view || {};
      cam.tYaw = o.yaw != null ? o.yaw : (s.yaw || 0);
      cam.tPitch = o.pitch != null ? o.pitch : (s.pitch || 0);
      cam.tFov = o.fov != null ? o.fov : (s.fov || 75);
      while (cam.tYaw - cam.yaw > 180) cam.tYaw -= 360;
      while (cam.tYaw - cam.yaw < -180) cam.tYaw += 360;
      (room.links || []).forEach(function (l) { needLo(byId[l.to || l]); });
      on.room(room, from);
      idleSince = now();
      return true;
    }

    function look(y, p, f) {
      if (y != null) cam.tYaw = y;
      if (p != null) cam.tPitch = clamp(p, -88, 88);
      if (f != null) cam.tFov = clamp(f, 30, 100);
      idleSince = now();
    }

    /* ─────────────────────────────────────────────────────────────────────
       INPUT
       ───────────────────────────────────────────────────────────────────── */
    var drag = null, pinch = null, gyro = null;

    function down(e) {
      if (!inputsOn) return;
      if (e.target.closest && e.target.closest("[data-no-drag]")) return;
      drag = { x: e.clientX, y: e.clientY, yaw: cam.tYaw, pitch: cam.tPitch, moved: 0 };
      host.classList.add("is-grabbing");
      idleSince = now();
      if (opts.onInteract) opts.onInteract();
    }
    function move(e) {
      if (!drag) return;
      var k = cam.fov / 75 * 0.13;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      cam.tYaw = drag.yaw + dx * k;                       // grab-and-pull, like every photosphere
      cam.tPitch = clamp(drag.pitch + dy * k, -88, 88);
      idleSince = now();
    }
    function up(e) {
      if (!drag) return;
      host.classList.remove("is-grabbing");
      var moved = drag.moved;
      drag = null;
      idleSince = now();
      if (moved < 6 && opts.onTap) opts.onTap(e);
    }
    host.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", function () { drag = null; host.classList.remove("is-grabbing"); });
    host.addEventListener("wheel", function (e) {
      if (!inputsOn) return;
      e.preventDefault();
      var step = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      cam.tFov = clamp(cam.tFov + clamp(step, -90, 90) * 0.045, 30, 100);
      idleSince = now();
      if (opts.onInteract) opts.onInteract();
    }, { passive: false });
    host.addEventListener("touchstart", function (e) {
      if (e.touches.length === 2) {
        pinch = { d: Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY), fov: cam.tFov };
        drag = null;
      }
    }, { passive: true });
    host.addEventListener("touchmove", function (e) {
      if (pinch && e.touches.length === 2) {
        var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        cam.tFov = clamp(pinch.fov * pinch.d / d, 30, 100);
        idleSince = now();
      }
    }, { passive: true });
    host.addEventListener("touchend", function (e) { if (e.touches.length < 2) pinch = null; }, { passive: true });

    /* Device-orientation look-around. The naive alpha/beta mapping falls apart
       the moment the phone is turned to landscape — which is exactly how people
       hold a phone to look around a room. So we build the full device
       quaternion (à la three.js DeviceOrientationControls), correct it for the
       current screen-orientation angle, then read yaw + pitch off the resulting
       forward vector. Yaw is captured relative to the live view on engage so
       switching gyro on never snaps the camera. */
    function screenOrient() {
      var a = (screen.orientation && typeof screen.orientation.angle === "number")
        ? screen.orientation.angle
        : (typeof window.orientation === "number" ? window.orientation : 0);
      return (a || 0) * D2R;
    }
    function gyroToggle(want) {
      if (gyro && !want) { window.removeEventListener("deviceorientation", gyro); gyro = null; return false; }
      if (gyro || !want) return !!gyro;

      var yawOffset = null;                       // captured on the first sample
      // q1 = −90° about X: the camera looks out through the back of the device.
      var Q1X = -Math.SQRT1_2, Q1W = Math.SQRT1_2;

      function fromEulerYXZ(x, y, z) {            // returns [x,y,z,w]
        var c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2);
        var s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
        return [
          s1 * c2 * c3 + c1 * s2 * s3,
          c1 * s2 * c3 - s1 * c2 * s3,
          c1 * c2 * s3 - s1 * s2 * c3,
          c1 * c2 * c3 + s1 * s2 * s3
        ];
      }
      function mul(a, b) {                        // a * b, quaternions as [x,y,z,w]
        return [
          a[0] * b[3] + a[3] * b[0] + a[1] * b[2] - a[2] * b[1],
          a[1] * b[3] + a[3] * b[1] + a[2] * b[0] - a[0] * b[2],
          a[2] * b[3] + a[3] * b[2] + a[0] * b[1] - a[1] * b[0],
          a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
        ];
      }

      var handler = function (e) {
        if (e.alpha == null) return;
        var q = fromEulerYXZ((e.beta || 0) * D2R, (e.alpha || 0) * D2R, -(e.gamma || 0) * D2R);
        q = mul(q, [Q1X, 0, 0, Q1W]);                             // out the back
        var o = -screenOrient() / 2;                              // screen-angle fix, about Z
        q = mul(q, [0, 0, Math.sin(o), Math.cos(o)]);
        // forward = q · (0,0,-1), expanded (t = 2·cross(q.xyz, v))
        var qx = q[0], qy = q[1], qz = q[2], qw = q[3];
        var tx = -2 * qy, ty = 2 * qx;                            // t.z is 0 for v=(0,0,-1)
        var fx = qw * tx - qz * ty;
        var fy = qw * ty + qz * tx;
        var fz = -1 + (qx * ty - qy * tx);
        var yaw = -Math.atan2(fx, -fz) * R2D;
        var pitch = Math.asin(clamp(fy, -1, 1)) * R2D;
        if (yawOffset == null) yawOffset = cam.tYaw - yaw;         // engage without a jump
        cam.tYaw = yaw + yawOffset;
        cam.tPitch = clamp(pitch, -88, 88);
        idleSince = now();
      };
      var start = function () { gyro = handler; window.addEventListener("deviceorientation", handler); };
      if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) {
        DeviceOrientationEvent.requestPermission().then(function (r) { if (r === "granted") start(); }).catch(function () { });
      } else if (window.DeviceOrientationEvent) start();
      return true;
    }

    /* ─────────────────────────────────────────────────────────────────────
       FRAME
       ───────────────────────────────────────────────────────────────────── */
    var lastT = now(), lastW = 0, lastH = 0, dpr = 1;
    var slowStrikes = 0;   // consecutive multi-second frames while bakes were pending

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.75 : 2);
      var w = Math.max(2, host.clientWidth), h = Math.max(2, host.clientHeight);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      lastW = w; lastH = h;
    }
    window.addEventListener("resize", function () { resize(); });
    // iOS/Android can report stale dimensions the instant an orientation flips,
    // so re-fit the canvas on the change and again once layout has settled.
    window.addEventListener("orientationchange", function () {
      resize(); setTimeout(resize, 250); setTimeout(resize, 600);
    });

    function bakeBudget(loOnly) {
      if (!queue.length) return;
      var start = now(), budget = (drag || pinch) ? 4 : (coarse ? 8 : 12);
      /* until the GPU is measured, exactly one band per frame — conservative
         start-up beats a frozen laptop */
      var gpuBudget = gpuMeasured ? 28 : 0, gpuSpent = 0;
      while (queue.length && now() - start < budget) {
        var job = queue[0];
        if (loOnly && job.kind === "hi") break;          // portfolio open: previews only
        bakeStep(job);
        gpuSpent += gpuMeasured ? perPx * (job.w * job.h / job.rows) : 1e9;
        if (job.done) queue.shift();
        if (job.kind === "hi" && !job.done) break;      // one full-res band per frame keeps it silky
        if (gpuSpent > gpuBudget) break;                 // the GPU queue is deep enough
      }
    }

    function loadProgress() {
      var room = incoming || current;
      if (!room) return 0;
      var s = store[room.id];
      if (!s) return 0;
      if (s.hi) return 1;
      var job = null;
      for (var i = 0; i < queue.length; i++) if (queue[i].id === room.id) { job = queue[i]; break; }
      if (!job) return s.lo ? 0.62 : 0.06;
      var base = job.kind === "lo" ? 0 : 0.5;
      return base + (job.kind === "lo" ? 0.5 : 0.5) * (job.row / job.rows);
    }

    function frame(t, once) {
      if (destroyed) return;
      var rawGap = t - lastT;
      var dt = Math.min(64, rawGap); lastT = t;

      /* Watchdog for GPUs where the shader compiles but crawls — the
         link-failure fallback never catches those, and each bake band can
         take seconds, which reads as a hung tab. Three consecutive
         multi-second frames with bakes pending = this tier is beyond the
         machine: remember the next tier down and reload once (the same
         path a failed link takes). At the bottom tier, abandon the
         background previews instead — the current room is all that bakes. */
      if (rawGap > 900 && queue.length && booted) {
        slowStrikes++;
        if (slowStrikes >= 3) {
          slowStrikes = 0;
          if (TIER < 2) {
            diag.push("GPU too slow for the " + TIERS[TIER] + " renderer — dropping a tier");
            rememberTier(TIER + 1);
            if (reloadOnce()) return;
          }
          diag.push("background previews abandoned — this GPU bakes on demand only");
          for (var qi = queue.length - 1; qi >= 0; qi--) {
            if (!(current && queue[qi].id === current.id)) queue.splice(qi, 1);
          }
        }
      } else if (rawGap < 400) slowStrikes = 0;

      /* nobody can see the canvas (portfolio screen) — no draw, no camera
         math, no callbacks. Baking continues so previews finish while the
         viewer browses, and the loop stays armed so waking is one frame. */
      if (asleep && booted && !once && !incoming && trans.t >= 1) {
        bakeBudget(true);
        requestAnimationFrame(frame);
        return;
      }

      /* frame-rate independent damping: the same feel at 30 fps and 120 */
      var k = drag ? 1 - Math.pow(0.00002, dt / 1000) : 1 - Math.pow(0.0016, dt / 1000);
      cam.yaw = lerp(cam.yaw, cam.tYaw, k);
      cam.pitch = lerp(cam.pitch, cam.tPitch, k);
      cam.fov = lerp(cam.fov, cam.tFov, 1 - Math.pow(0.002, dt / 1000));

      if (drift && !drag && !gyro && !reduce) cam.tYaw += driftSpeed * drift * dt;
      else if (!drag && !gyro && !reduce && now() - idleSince > 5200) cam.tYaw += 0.0016 * dt;

      if (trans.t < 1) {
        trans.t = clamp(trans.t + dt / trans.dur, 0, 1);
        if (trans.t >= 1 && incoming) { current = incoming; incoming = null; }
      }

      var A, B, mix = 0, avail;
      if (incoming) {
        A = best(current && current.id); B = best(incoming.id) || A;
        mix = easeInOut(trans.t);
      } else if (current) {
        var s = store[current.id];
        A = s.lo || s.hi;
        B = (s.hi && s.lo && s.hi !== s.lo) ? s.hi : (s.hi || s.lo);
        if (s.hi && s.lo && s.hi !== s.lo) {
          current._sharp = Math.min(1, (current._sharp || 0) + dt / 420);
          mix = current._sharp;
        } else current._sharp = 0;
        on.sharpen(!!s.lo && !s.hi);
      }
      avail = (A && B) ? 1 : 0;
      if (!A) A = B; if (!B) B = A;

      var fovA = cam.fov, fovB = cam.fov;
      if (incoming && !reduce) {
        var e = easeInOut(trans.t);
        fovA = cam.fov * (1 - 0.30 * e);      // the room you are leaving pushes past you
        fovB = cam.fov * (1 + 0.26 * (1 - e)); // the room you are entering opens up
      }

      if (host.clientWidth !== lastW || host.clientHeight !== lastH) resize();
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
      gl.uniform1f(u.uMix, mix);
      gl.uniform1f(u.uAvail, avail);
      gl.uniform1f(u.uGrain, 0.020);
      gl.uniform1f(u.uVig, 0.32);
      gl.uniform1f(u.uFlash, flash);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      flash *= 0.86; if (flash < 0.004) flash = 0;

      on.frame(cam, incoming || current, trans.t);

      if (once) return;
      bakeBudget();
      if (!booted) {
        var pr = loadProgress();
        var label = pr < 0.14 ? "Calibrating optics"
          : pr < 0.5 ? "Ray-marching geometry"
            : pr < 0.94 ? "Stitching panorama" : "Sharpening";
        on.progress(pr, label);
        var st = current && store[current.id];
        if (st && (st.hi || (st.lo && now() - bootStart > 1600))) {
          booted = true;
          on.progress(1, "Ready");
          on.ready();
          rooms.forEach(function (r) { if (!current || r.id !== current.id) needLo(r); });
        }
      }
      requestAnimationFrame(frame);
    }

    /* if nothing has rendered in 25 s, say so — a bar at 0% is not an error
       message */
    setTimeout(function () {
      if (booted || destroyed) return;
      on.error({
        title: "This is taking longer than it should",
        message: "The first panorama has not finished rendering. On older graphics hardware the full-resolution " +
          "pass can stall — low quality mode renders a smaller panorama and usually runs fine.",
        detail: "queue=" + queue.length + (queue[0] ? " job=" + queue[0].kind + " " + queue[0].w + "×" + queue[0].h +
          " band " + queue[0].row + "/" + queue[0].rows : ""),
        diag: diag.join("\n"), recoverable: true
      });
    }, 25000);

    /* ─────────────────────────────────────────────────────────────────────
       API
       ───────────────────────────────────────────────────────────────────── */
    var api = {
      load: function (t) {
        tour = t;
        rooms = t.rooms || [];
        byId = {}; store = {};
        rooms.forEach(function (r, i) { r._i = i; byId[r.id] = r; store[r.id] = { lo: null, hi: null }; });
        return api;
      },
      start: function (id, view) {
        var room = byId[id] || rooms[0];
        current = room;
        var s = (view || room.view || {});
        cam.yaw = cam.tYaw = s.yaw || 0;
        cam.pitch = cam.tPitch = s.pitch || 0;
        cam.fov = cam.tFov = s.fov || 75;
        cam.yaw -= 22; cam.fov = Math.min(100, cam.fov + 8);   // settle into the opening view
        /* only compile the space shader when the starting room will actually
           draw it — a real captured panorama never touches it, and on some
           laptop drivers this compile alone stalls the tab for seconds */
        if (room.space && !room.pano && !bakeProgram(room.space.layout || 0)) return api;   // reload or error already handled
        needLo(room, true); needHi(room, true);
        (room.links || []).forEach(function (l) { needLo(byId[l.to || l]); });
        on.room(room, null);
        resize();
        requestAnimationFrame(frame);
        return api;
      },
      mount: function (el) {
        if (!el || el === host) return api;
        host.removeEventListener("pointerdown", down);
        el.appendChild(canvas);
        host = el;
        host.addEventListener("pointerdown", down);
        resize();
        return api;
      },
      go: go,
      look: look,
      nudge: function (dy, dp) { look(cam.tYaw + dy, clamp(cam.tPitch + dp, -88, 88)); },
      zoom: function (d) { look(null, null, clamp(cam.tFov + d, 30, 100)); },
      camera: function () { return { yaw: cam.yaw, pitch: cam.pitch, fov: cam.fov }; },
      project: project,
      angleAt: angleAt,
      autoRotate: function (v, speed) { drift = v ? 1 : 0; if (speed) driftSpeed = speed; },
      gyro: gyroToggle,
      gyroOn: function () { return !!gyro; },
      inputs: function (v) { inputsOn = !!v; },
      sleep: function (v) { asleep = !!v; },
      setPano: function (id, src) {
        var room = byId[id];
        if (!room) return;
        room.pano = src;
        /* a preview bake already queued for this room would land after the
           capture and overwrite it — purge it, exactly as rebake does */
        for (var i = queue.length - 1; i >= 0; i--) if (queue[i].id === id) queue.splice(i, 1);
        if (store[id].lo && store[id].lo.tex) { try { gl.deleteTexture(store[id].lo.tex); } catch (e) { } }
        store[id] = { lo: null, hi: null };
        loadPano(room, "lo", function () { if (opts.onThumb) opts.onThumb(id); }, true);
      },
      rebake: function (id) {
        var room = byId[id];
        if (!room) return;
        for (var i = queue.length - 1; i >= 0; i--) if (queue[i].id === id) queue.splice(i, 1);
        ["lo", "hi"].forEach(function (k) {
          var s = store[id] && store[id][k];
          if (s && s.tex) { try { gl.deleteTexture(s.tex); } catch (e) { } }
        });
        for (var j = hiPool.length - 1; j >= 0; j--) if (hiPool[j].id === id) hiPool.splice(j, 1);
        store[id] = { lo: null, hi: null };
        needLo(room, true);
        if ((current && current.id === id) || (incoming && incoming.id === id)) needHi(room, true);
      },
      thumbnail: function (id, w, h, yaw) {
        var src = thumbSrc[id];
        if (!src) return null;
        var room = byId[id];
        var c = document.createElement("canvas");
        c.width = w; c.height = h;
        var ctx = c.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        var ya = yaw != null ? yaw : ((room && room.view && room.view.yaw) || 0);
        var cx = ((-ya / 360) + 0.5) * src.width;
        var sw = src.width * 0.22, sh = sw * (h / w);
        var sy = src.height * 0.5 - sh * 0.5;
        var sx = cx - sw / 2;
        if (sx < 0) sx += src.width;
        if (sx + sw <= src.width) ctx.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
        else {
          var w1 = src.width - sx, f = w1 / sw;
          ctx.drawImage(src, sx, sy, w1, sh, 0, 0, w * f, h);
          ctx.drawImage(src, 0, sy, sw - w1, sh, w * f, 0, w * (1 - f), h);
        }
        return c;
      },
      equirect: function (id) { return thumbSrc[id] || null; },
      capture: function () {
        flash = 0.9;
        frame(now(), true);
        try { return canvas.toDataURL("image/png"); } catch (e) { return null; }
      },
      quality: function (q) {
        if (!q) return qualityMode;
        applyQuality(q);
        var keep = (incoming || current);
        rooms.forEach(function (r) { api.rebake(r.id); });
        if (keep) { needLo(keep, true); needHi(keep, true); }
        return qualityMode;
      },
      progress: loadProgress,
      current: function () { return incoming || current; },
      isReady: function () { return booted; },
      transitioning: function () { return trans.t < 1; },
      resize: resize,
      diagnostics: function () { return diag.join("\n"); },
      renderer: function () { return TIERS[TIER]; },
      destroy: function () {
        destroyed = true;
        host.removeEventListener("pointerdown", down);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        if (gyro) window.removeEventListener("deviceorientation", gyro);
      }
    };
    return api;
  };
})(window);
