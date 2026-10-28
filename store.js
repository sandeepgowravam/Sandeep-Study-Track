/* Study Buddies · store.js
 * One tiny data layer with two back-ends:
 *   local    -> localStorage in this browser (works offline, not shared)
 *   firebase -> Cloud Firestore, shared live between every member
 * The rest of the app only uses Store.list / get / set / patch / del / subscribe.
 */
window.Store = (() => {
  const COLS = ["members", "checkins", "comments", "tasks", "events", "sessions", "nudges"];
  const data = {};
  COLS.forEach((c) => (data[c] = {}));
  const subs = new Set();
  let mode = "local";   // "local" | "cloud"
  let status = "local"; // "local" | "connecting" | "cloud" | "error"
  let db = null;
  let team = null;
  let timer = null;

  const notify = () => {
    clearTimeout(timer);
    timer = setTimeout(() => subs.forEach((f) => { try { f(); } catch (e) { console.error(e); } }), 0);
  };

  /* ---------- local ---------- */
  const LS = "sb2.";
  function loadLocal() {
    COLS.forEach((c) => {
      try { data[c] = JSON.parse(localStorage.getItem(LS + c)) || {}; } catch { data[c] = {}; }
    });
  }
  function saveLocal(c) { try { localStorage.setItem(LS + c, JSON.stringify(data[c])); } catch { /* blocked */ } }

  /* ---------- cloud ---------- */
  const loadScript = (src) =>
    new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = () => rej(new Error("Could not load " + src));
      document.head.appendChild(s);
    });
  const clean = (o) => JSON.parse(JSON.stringify(o)); // Firestore rejects undefined
  const colRef = (c) => db.collection("teams").doc(team).collection(c);

  async function initCloud(cfg, teamCode) {
    status = "connecting";
    const v = "10.12.2";
    const base = `https://www.gstatic.com/firebasejs/${v}/firebase-`;
    await loadScript(base + "app-compat.js");
    await Promise.all([loadScript(base + "auth-compat.js"), loadScript(base + "firestore-compat.js")]);
    window.firebase.initializeApp(cfg);
    await window.firebase.auth().signInAnonymously();
    db = window.firebase.firestore();
    team = teamCode;
    mode = "cloud";
    await Promise.all(
      COLS.map(
        (c) =>
          new Promise((resolve) => {
            let first = true;
            const done = () => { if (first) { first = false; resolve(); } };
            setTimeout(done, 8000);
            colRef(c).onSnapshot(
              (snap) => {
                const o = {};
                snap.forEach((d) => (o[d.id] = d.data()));
                data[c] = o;
                status = "cloud";
                notify();
                done();
              },
              (err) => { console.error(err); status = "error"; notify(); done(); }
            );
          })
      )
    );
  }

  /* ---------- public API ---------- */
  async function init(opts) {
    const fb = opts.firebase;
    if (fb && fb.enabled && fb.config && fb.config.projectId && opts.team) {
      try { await initCloud(fb.config, opts.team); return; }
      catch (e) { console.error(e); status = "error"; mode = "local"; }
    }
    loadLocal();
    window.addEventListener("storage", (e) => {
      if (mode === "local" && e.key && e.key.startsWith(LS)) { loadLocal(); notify(); }
    });
  }

  const list = (c) => Object.values(data[c] || {});
  const get = (c, id) => (data[c] || {})[id] || null;

  function set(c, id, obj) {
    const doc = { ...obj, id };
    data[c][id] = doc;
    if (mode === "cloud") colRef(c).doc(id).set(clean(doc)).catch((e) => { console.error(e); status = "error"; notify(); });
    else saveLocal(c);
    notify();
    return doc;
  }
  function patch(c, id, part) { return set(c, id, { ...(data[c][id] || {}), ...part }); }
  function del(c, id) {
    delete data[c][id];
    if (mode === "cloud") colRef(c).doc(id).delete().catch((e) => { console.error(e); status = "error"; notify(); });
    else saveLocal(c);
    notify();
  }
  function clearDemo() {
    COLS.forEach((c) => list(c).filter((d) => d.demo).forEach((d) => del(c, d.id)));
    // comments or nudges that pointed at removed sample data
    list("comments").forEach((x) => { if (!get("members", x.memberId) || (x.checkinId && !get("checkins", x.checkinId))) del("comments", x.id); });
  }

  return {
    COLS, init, list, get, set, patch, del, clearDemo,
    subscribe: (f) => { subs.add(f); return () => subs.delete(f); },
    get mode() { return mode; },
    get status() { return status; }
  };
})();
