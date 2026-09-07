/* billy360 — the save queue for the Studio-on-the-server (remote) mode.

   One queue, and it tells the truth: "Saved" is only said once the PUT has
   answered AND the tour on screen still equals what was sent. An edit that
   lands mid-save runs another pass afterwards; a failed save retries by
   itself (2 s, 5 s, 15 s) and then waits for a tap on the pill; a lost login
   — or the tab going away with an edit in hand — keeps the draft in memory
   and stashes it in this browser; a version clash stops autosaving and asks
   which copy should win. Nothing here touches the DOM — app.js paints the
   states this reports through onState.

   BILLY360Sync.create({ store, getTour, getHealth, onState, onConflict, onSaved })
     → { schedule(delay), flush(opts) → Promise, retry(), keepMine(), useTheirs(),
         fetchServer(), stash(), pending(), clearStash(), busy(), state, info, dirty }
   states: idle | queued | saving | saved | error | conflict                     */
(function () {
  "use strict";
  var RETRY = [2000, 5000, 15000];

  function isDataUrl(v) { return typeof v === "string" && v.indexOf("data:") === 0 && v.length > 4096; }
  var PLAN_HREF = /href="([^"]+)"/g;

  /* every embedded image in the tour, by path — so a save can report which
     data URL became which uploaded URL (app.js patches its undo history) */
  function collect(tour) {
    var out = [];
    (function walk(v, path) {
      if (typeof v === "string") {
        if (isDataUrl(v)) { out.push({ path: path, v: v }); return; }
        if (v.indexOf('href="data:') < 0) return;
        var m, i = 0;
        PLAN_HREF.lastIndex = 0;
        while ((m = PLAN_HREF.exec(v))) { if (isDataUrl(m[1])) out.push({ path: path, v: m[1], plan: true, nth: i }); i++; }
        return;
      }
      if (!v || typeof v !== "object") return;
      if (Array.isArray(v)) { for (var a = 0; a < v.length; a++) walk(v[a], path.concat(a)); return; }
      for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) walk(v[k], path.concat(k));
    })(tour, []);
    return out;
  }
  function at(obj, path) {
    var v = obj;
    for (var i = 0; i < path.length; i++) { if (v == null) return undefined; v = v[path[i]]; }
    return v;
  }
  function replacements(before, tour) {
    var reps = [];
    before.forEach(function (b) {
      var now = at(tour, b.path);
      if (typeof now !== "string" || now === b.v) return;
      if (!b.plan) { if (!isDataUrl(now)) reps.push({ from: b.v, to: now }); return; }
      var m, i = 0;
      PLAN_HREF.lastIndex = 0;
      while ((m = PLAN_HREF.exec(now))) { if (i === b.nth) { if (m[1] !== b.v && !isDataUrl(m[1])) reps.push({ from: b.v, to: m[1] }); break; } i++; }
    });
    return reps;
  }

  function create(opts) {
    var store = opts.store;
    var getTour = opts.getTour;
    var getHealth = opts.getHealth || function () { return null; };
    var onState = opts.onState || function () { };
    var onConflict = opts.onConflict || function () { };
    var onSaved = opts.onSaved || function () { };
    var debounce = opts.debounce || 1400;
    var sync = { state: "idle", info: {}, dirty: false, attempt: 0, lastError: null, lastSaved: null, everSaved: false };
    var timer = null, retryT = null, running = null, waiters = [], sent = null;

    function stashKey() { return "billy360:pending:" + store.listingId; }
    function set(state, info) { sync.state = state; sync.info = info || {}; onState(state, sync.info); }
    function snapshot() { try { return JSON.stringify(getTour()); } catch (e) { return null; } }
    function settle(ok, err) {
      var w = waiters; waiters = [];
      w.forEach(function (x) { if (ok) x.resolve(sync.lastSaved); else x.reject(err); });
    }
    function adopt(j) {
      if (!j) return;
      if (typeof j.status === "string") store.status = j.status;
      if (j.liveVersion !== undefined) store.liveVersion = j.liveVersion;
      if (j.listingLive !== undefined) store.listingLive = !!j.listingLive;
      if (j.gate != null) store.gate = j.gate;
      if (j.health !== undefined) store.health = j.health;
    }

    function run() {
      clearTimeout(timer); clearTimeout(retryT); timer = null; retryT = null;
      if (running) return running;
      var before = collect(getTour());
      sent = null;
      set("saving", { label: "Saving…" });
      running = store.save(getTour(), {
        health: getHealth(),
        onStatus: function (s) {
          s = String(s || "");
          /* store.js says "Saving…" right before it serialises the body —
             that is the moment the sent snapshot is taken */
          if (/^Saving/.test(s)) { sent = snapshot(); set("saving", { label: "Saving…" }); }
          else set("saving", { label: s.replace(/…$/, ""), uploading: true });
        }
      }).then(function (j) {
        running = null;
        sync.attempt = 0; sync.lastError = null; sync.lastSaved = j; sync.everSaved = true;
        adopt(j);
        sync.clearStash();
        var reps = replacements(before, getTour());
        if (reps.length) onSaved(reps, j);
        /* an edit landed while the PUT was out: it goes in the next pass */
        if (sent == null || snapshot() !== sent) { sync.dirty = true; set("queued", { again: true }); run(); return; }
        sync.dirty = false;
        set("saved", { version: j && j.version });
        settle(true);
      }, function (e) {
        running = null;
        sync.lastError = e;
        var st = e && e.status;
        if (st === 409) {
          set("conflict", { version: e.body && e.body.version, message: e.message });
          settle(false, e);
          onConflict(e);
          return;
        }
        if (st === 401) {
          var kept = sync.stash();
          set("error", { signin: true, label: "Sign in", stashed: kept, message: e.message });
          settle(false, e);
          return;
        }
        if (st === 410) { set("error", { binned: true, final: true, label: "In the Bin", message: e.message }); settle(false, e); return; }
        var retryable = !st || st >= 500 || st === 429 || st === 408;
        if (retryable && sync.attempt < RETRY.length) {
          var wait = RETRY[sync.attempt++];
          set("error", { retrying: true, label: "Not saved — retrying", wait: wait, message: e.message });
          retryT = setTimeout(run, wait);
        } else {
          set("error", { retry: true, final: !retryable, label: "Not saved", message: e.message, status: st });
        }
        settle(false, e);
      });
      return running;
    }

    /* an edit happened — save once typing settles */
    sync.schedule = function (delay) {
      sync.dirty = true;
      if (sync.state === "conflict") return;         // the sheet decides, never an autosave storm (F29 F166)
      if (sync.state === "error" && sync.info.signin) return;   // nowhere to save until they sign in again
      clearTimeout(timer);
      if (running) { set("saving", sync.info); return; }   // picked up by the pass that follows this one
      set("queued", {});
      timer = setTimeout(run, delay == null ? debounce : delay);
    };
    /* drain the queue now; resolves with the last PUT's JSON once the tour
       on screen is what the server holds. {force:true} makes at least one
       PUT happen even when nothing changed (publish needs the score there). */
    sync.flush = function (o) {
      o = o || {};
      return new Promise(function (resolve, reject) {
        if (sync.state === "conflict") { reject(sync.lastError || new Error("Someone else saved this tour since you opened it.")); return; }
        if (!running && !sync.dirty && !o.force) { resolve(sync.lastSaved); return; }
        waiters.push({ resolve: resolve, reject: reject });
        if (!running) { sync.attempt = 0; run(); }
      });
    };
    sync.retry = function () {
      if (running) return running;
      sync.attempt = 0;
      return run();
    };
    sync.busy = function () { return !!running || sync.state === "queued" || sync.state === "saving"; };

    /* ── a lost login: the draft stays in memory and in this browser ────── */
    sync.stash = function () {
      try {
        localStorage.setItem(stashKey(), JSON.stringify({ at: Date.now(), version: store.version, tour: getTour() }));
        return true;
      } catch (e) { return false; }
    };
    sync.pending = function () {
      try {
        var raw = localStorage.getItem(stashKey());
        var j = raw ? JSON.parse(raw) : null;
        return j && j.tour && j.tour.rooms ? j : null;
      } catch (e) { return null; }
    };
    sync.clearStash = function () { try { localStorage.removeItem(stashKey()); } catch (e) { } };

    /* ── a version clash: their copy, or mine on top of it ──────────────── */
    sync.fetchServer = function () {
      return fetch("/api/studio/tours/" + encodeURIComponent(store.listingId), {
        credentials: "same-origin", cache: "no-store", headers: { "X-Studio": "1" }
      }).then(function (r) {
        return r.text().then(function (t) {
          var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { }
          if (!r.ok) { var err = new Error((j && j.error) || ("HTTP " + r.status)); err.status = r.status; err.body = j; throw err; }
          return j;
        });
      });
    };
    /* "Keep mine": take the server's version number, PUT once. It resolves
       only once that PUT has landed: run()'s own promise fulfils whether the
       save worked or not, so going through the queue's waiters is what makes
       a second clash or a dropped connection reject instead of reporting a
       save that never happened. */
    sync.keepMine = function () {
      return sync.fetchServer().then(function (j) {
        store.version = j.version;
        adopt(j);
        sync.dirty = true;
        sync.attempt = 0;
        set("queued", {});                 // out of "conflict", or flush refuses at once
        return sync.flush({ force: true });
      });
    };
    /* "Load their version": hand the server copy back for app.js to apply;
       the queue is clean again once it has */
    sync.useTheirs = function () {
      return sync.fetchServer().then(function (j) {
        store.version = j.version;
        adopt(j);
        sync.dirty = false;
        sync.lastError = null;
        set("saved", { version: j.version, theirs: true });
        return j;
      });
    };

    /* the network coming back, or the tab being looked at again, is a
       reason to try once more (F168); the tab going away is the last chance
       to keep the draft — a phone that reclaims a backgrounded tab discards
       it without ever firing beforeunload, and offerPendingDraft hands a
       stash back on the next boot */
    function nudge() {
      if (sync.state === "error" && !sync.info.signin && !sync.info.final && !running) sync.retry();
    }
    function keepSafe() { if (sync.dirty || running) sync.stash(); }
    window.addEventListener("online", nudge);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") keepSafe(); else nudge();
    });
    window.addEventListener("pagehide", keepSafe);

    return sync;
  }

  window.BILLY360Sync = { create: create, collect: collect, replacements: replacements };
})();
