/* Study Buddies · app.js — state, routing, events, focus timer */
window.App = (() => {
  const { $, esc, av, icon, toast, ls } = U;
  const CFG = window.STUDY_CONFIG;
  const VIEWS = [
    { id: "overview", label: "Overview", icon: "overview" },
    { id: "checkin", label: "Check in", icon: "checkin" },
    { id: "feed", label: "Feed", icon: "feed" },
    { id: "tasks", label: "Tasks", icon: "tasks" },
    { id: "focus", label: "Focus", icon: "focus" },
    { id: "progress", label: "Progress", icon: "progress" }
  ];

  const S = {
    me: null, view: "overview", form: null, formErr: "", confirmDel: false,
    drafts: {}, reply: {}, expanded: new Set(), flash: null, modal: null, menu: false,
    feed: { member: "all", subject: "all", help: false, limit: 10 },
    tasks: { member: "all" }
  };
  const T = { mode: "focus", len: { focus: 25, short: 5, long: 15 }, remaining: 25 * 60, running: false, endAt: 0, iv: null, subject: CFG.subjects[0], cycles: 0 };
  const BASE_TITLE = document.title;

  /* ---------- derived data ---------- */
  function buildCtx() {
    const t = U.today();
    const ms = Store.list("members").sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    const ci = Store.list("checkins");
    const idx = {}; ms.forEach((m) => (idx[m.id] = {}));
    ci.forEach((c) => { if (idx[c.memberId]) idx[c.memberId][c.date] = c; });
    const cm = {};
    Store.list("comments").sort((a, b) => a.createdAt - b.createdAt).forEach((x) => { (cm[x.checkinId] || (cm[x.checkinId] = [])).push(x); });
    const ctx = { t, ms, ci, idx, cm };
    ctx.M = (id) => ms.find((m) => m.id === id) || null;
    ctx.has = (id, d) => !!(idx[id] && idx[id][d]);
    ctx.hours = (id, d) => (idx[id] && idx[id][d] ? +idx[id][d].hours || 0 : 0);
    ctx.sum = (id, a, b) => { let s = 0; for (let d = a; d <= b; d = U.addDays(d, 1)) s += ctx.hours(id, d); return s; };
    ctx.daysIn = (id, a, b) => Object.keys(idx[id] || {}).filter((d) => d >= a && d <= b).length;
    ctx.lastSeen = (id) => Object.keys(idx[id] || {}).sort().pop() || null;
    ctx.streak = (id) => { let d = ctx.has(id, t) ? t : U.addDays(t, -1), n = 0; while (ctx.has(id, d)) { n++; d = U.addDays(d, -1); } return n; };
    ctx.longest = (id) => {
      const ds = Object.keys(idx[id] || {}).sort(); let best = 0, run = 0, prev = null;
      ds.forEach((d) => { run = prev && U.diffDays(d, prev) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; });
      return best;
    };
    ctx.teamStreak = () => {
      if (!ms.length) return 0;
      const all = (d) => ms.every((m) => ctx.has(m.id, d));
      let d = all(t) ? t : U.addDays(t, -1), n = 0;
      while (all(d) && n < 400) { n++; d = U.addDays(d, -1); }
      return n;
    };
    ctx.subj = (id, a, b) => {
      const o = {};
      ci.filter((c) => c.memberId === id && c.date >= a && c.date <= b).forEach((c) => (c.subjects || []).forEach((s) => { o[s.name] = (o[s.name] || 0) + (+s.hours || 0); }));
      return o;
    };
    return ctx;
  }

  /* ---------- check-in form state ---------- */
  function loadForm(date) {
    const ex = Store.get("checkins", `${date}_${S.me}`);
    S.form = {
      date,
      mood: ex ? ex.mood : 4,
      subs: ex ? Object.fromEntries((ex.subjects || []).map((s) => [s.name, s.hours])) : {},
      done: ex ? ex.done : "",
      next: ex ? (ex.next || []).join("\n") : "",
      doubts: ex ? ex.doubts || "" : ""
    };
    S.formErr = ""; S.confirmDel = false;
  }

  /* ---------- shell ---------- */
  function syncLabel() {
    const st = Store.status;
    if (Store.mode === "cloud" && st !== "error") return `<span class="sync ok"><i></i>Shared live with your team</span>`;
    if (st === "error") return `<span class="sync bad"><i></i>Sync problem. Showing saved data</span>`;
    return `<span class="sync"><i></i>Saved in this browser only</span>`;
  }

  function shell(ctx, body) {
    const me = ctx.M(S.me);
    const timerMini = (id) => (T.running && id === "focus" ? `<span class="navtimer" data-timer-text>${mmss(T.remaining)}</span>` : "");
    const nav = VIEWS.map((v) => `<a href="#${v.id}" class="${S.view === v.id ? "on" : ""}" ${S.view === v.id ? 'aria-current="page"' : ""}>${icon(v.icon)}<span>${v.label}</span>${timerMini(v.id)}</a>`).join("");
    const hasDemo = Store.list("members").some((m) => m.demo);
    const dark = document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    return `
    <div class="app">
      <aside class="side">
        <div class="brand"><span class="mark" aria-hidden="true"><svg viewBox="0 0 32 32" width="30" height="30"><rect width="32" height="32" rx="8" fill="currentColor"/><path d="M8 21h5v-7h6V9h5" fill="none" stroke="var(--bg)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><b>${esc(CFG.appName)}</b></div>
        <nav class="nav" aria-label="Main">${nav}</nav>
        <div class="grow"></div>
        ${syncLabel()}
        <div class="me">
          <button class="me-btn" data-act="menu" aria-haspopup="true" aria-expanded="${S.menu}">${av(me, 36)}<span><b>${esc(me ? me.name : "")}</b><small>Switch profile or settings</small></span></button>
          ${S.menu ? `<div class="menu" role="menu">
            <button role="menuitem" data-act="open-switch">${icon("users", 16)}Switch member</button>
            <button role="menuitem" data-act="open-new">${icon("plus", 16)}Add a member</button>
            <button role="menuitem" data-act="theme">${icon(dark ? "sun" : "moon", 16)}${dark ? "Light mode" : "Dark mode"}</button>
            <button role="menuitem" data-act="export-csv">${icon("download", 16)}Export CSV</button>
            ${hasDemo ? `<button role="menuitem" class="danger" data-act="clear-demo">${icon("trash", 16)}Remove sample data</button>` : ""}
          </div>` : ""}
        </div>
      </aside>
      <div class="mainwrap">
        <header class="mbar"><div class="brand"><span class="mark" aria-hidden="true"><svg viewBox="0 0 32 32" width="28" height="28"><rect width="32" height="32" rx="8" fill="currentColor"/><path d="M8 21h5v-7h6V9h5" fill="none" stroke="var(--bg)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><b>${esc(CFG.appName)}</b></div>
          <button class="me-btn compact" data-act="menu" aria-label="Profile and settings" aria-expanded="${S.menu}">${av(me, 34)}</button></header>
        ${S.menu ? `<div class="menu mob" role="menu"><button role="menuitem" data-act="open-switch">${icon("users", 16)}Switch member</button><button role="menuitem" data-act="open-new">${icon("plus", 16)}Add a member</button><button role="menuitem" data-act="theme">${icon("moon", 16)}Toggle theme</button><button role="menuitem" data-act="export-csv">${icon("download", 16)}Export CSV</button>${hasDemo ? `<button role="menuitem" class="danger" data-act="clear-demo">${icon("trash", 16)}Remove sample data</button>` : ""}</div>` : ""}
        <main class="main" id="view" tabindex="-1">${body}</main>
      </div>
      <nav class="tabs" aria-label="Main">${VIEWS.map((v) => `<a href="#${v.id}" class="${S.view === v.id ? "on" : ""}">${icon(v.icon, 20)}<span>${v.label}</span></a>`).join("")}</nav>
    </div>${modal(ctx)}`;
  }

  function modal(ctx) {
    if (!S.modal) return "";
    const forced = !S.me || !ctx.M(S.me);
    const colorPick = `<div class="swatches" role="radiogroup" aria-label="Colour">${U.COLORS.map((c, i) => `<label><input type="radio" name="color" value="${c}" ${i === ctx.ms.length % U.COLORS.length ? "checked" : ""}><span style="background:${c}"></span></label>`).join("")}</div>`;
    const create = `<form data-form="member" class="dform"><div class="field"><label for="m-name">Your name</label><input id="m-name" name="name" maxlength="40" required autocomplete="name"></div>
        <div class="field"><label for="m-focus">What are you studying?</label><input id="m-focus" name="focus" maxlength="60" placeholder="e.g. VLSI and B.Tech"></div>
        <div class="field"><span class="lbl">Colour</span>${colorPick}</div>
        <div class="actions"><button class="btn primary" type="submit">Join the team</button>${ctx.ms.length ? `<button type="button" class="btn" data-act="${forced ? "open-switch" : "close-modal"}">${forced ? "Back" : "Cancel"}</button>` : ""}</div></form>`;
    const pick = `<ul class="pick">${ctx.ms.map((m) => `<li><button data-act="pick-member" data-id="${esc(m.id)}">${av(m, 38)}<span><b>${esc(m.name)}</b><small>${esc(m.focus || "")}</small></span></button></li>`).join("")}</ul>
        <div class="actions"><button class="btn" data-act="open-new">${icon("plus", 16)}I am new here</button>${forced ? "" : `<button class="btn ghost" data-act="close-modal">Close</button>`}</div>`;
    const showNew = S.modal === "new" || !ctx.ms.length;
    return `<div class="scrim" data-act="${forced ? "" : "close-modal"}"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t" data-stop>
      <h2 id="dlg-t">${showNew ? (ctx.ms.length ? "Add a member" : "Welcome to " + esc(CFG.appName)) : "Who is checking in?"}</h2>
      <p class="muted">${showNew ? "Add your name so the team can see your progress." : "Pick your name. Your choice is remembered on this device."}</p>
      ${showNew ? create : pick}</div></div>`;
  }

  /* ---------- render ---------- */
  let dirty = false;
  let lastView = null;
  const nav = (v) => { if (location.hash.slice(1) === v) render(); else location.hash = v; };
  function resolveMe(ctx) {
    let id = ls.get("me");
    if (!id || !ctx.M(id)) id = null;
    if (!id && ctx.ms.length && ctx.ms.some((m) => m.demo) && Store.mode === "local") id = ctx.ms[0].id; // preview convenience
    S.me = id;
    if (!id && !S.modal) S.modal = ctx.ms.length ? "switch" : "new";
  }

  function render() {
    dirty = false;
    const ctx = buildCtx();
    resolveMe(ctx);
    const h = location.hash.slice(1);
    S.view = VIEWS.some((v) => v.id === h) ? h : "overview";
    const root = $("#app");
    if (!S.me) { root.innerHTML = shell(ctx, ""); return; }
    if (S.view === "checkin" && !S.form) loadForm(ctx.t);
    const y = window.scrollY;
    const navigated = S.view !== lastView;
    lastView = S.view;
    root.innerHTML = shell(ctx, Views[S.view](ctx));
    if (navigated) {
      const el = S.flash && document.getElementById("post-" + S.flash);
      if (el) el.scrollIntoView({ block: "start" }); else window.scrollTo(0, 0);
    } else window.scrollTo(0, y);
    if (S.flash) {
      const id = S.flash;
      setTimeout(() => { if (S.flash === id) { S.flash = null; const e = document.getElementById("post-" + id); if (e) e.classList.remove("flash"); } }, 2200);
    }
    updateTimerUI();
  }

  function onStore() {
    const a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest("#view")) { dirty = true; return; }
    render();
  }

  /* ---------- focus timer ---------- */
  const mmss = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  function updateTimerUI() {
    document.querySelectorAll("[data-timer-text]").forEach((el) => (el.textContent = mmss(T.remaining)));
    const arc = document.getElementById("ringArc");
    if (arc) { const c = +arc.dataset.c; arc.setAttribute("stroke-dashoffset", (c * (1 - T.remaining / (T.len[T.mode] * 60))).toFixed(2)); }
    document.title = T.running ? `${mmss(T.remaining)} · ${BASE_TITLE}` : BASE_TITLE;
  }
  function beep() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25].forEach((d) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 880; g.gain.value = 0.08; o.connect(g); g.connect(ac.destination); o.start(ac.currentTime + d); o.stop(ac.currentTime + d + 0.18); });
    } catch { /* audio blocked */ }
  }
  function tick() {
    T.remaining = Math.max(0, Math.ceil((T.endAt - Date.now()) / 1000));
    updateTimerUI();
    if (T.remaining <= 0) finishTimer();
  }
  function startTimer() {
    if (T.running) return;
    if (T.remaining <= 0) T.remaining = T.len[T.mode] * 60;
    T.running = true; T.endAt = Date.now() + T.remaining * 1000;
    T.iv = setInterval(tick, 250);
    render();
  }
  function pauseTimer() {
    clearInterval(T.iv); T.running = false;
    T.remaining = Math.max(0, Math.round((T.endAt - Date.now()) / 1000));
    render();
  }
  function finishTimer() {
    clearInterval(T.iv); T.running = false;
    if (T.mode === "focus" && S.me) {
      Store.set("sessions", U.uid(), { memberId: S.me, date: U.today(), minutes: T.len.focus, subject: T.subject, createdAt: Date.now() });
      T.cycles++;
      toast(`Focus block saved: ${T.len.focus} min of ${T.subject}`, "ok");
      T.mode = T.cycles % 4 === 0 ? "long" : "short";
    } else { toast("Break over. Ready for the next block?"); T.mode = "focus"; }
    T.remaining = T.len[T.mode] * 60;
    beep(); render();
  }
  function resetTimer() { clearInterval(T.iv); T.running = false; T.remaining = T.len[T.mode] * 60; render(); }

  /* ---------- actions ---------- */
  const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };

  function saveCheckin() {
    const f = S.form;
    const subjects = Object.entries(f.subs).map(([name, h]) => ({ name, hours: Math.round((+h || 0) * 4) / 4 })).filter((s) => s.hours > 0);
    const total = subjects.reduce((s, x) => s + x.hours, 0);
    if (!subjects.length) { S.formErr = "Add hours for at least one subject."; return render(); }
    if (total > 24) { S.formErr = "That is more than 24 hours. Please check the numbers."; return render(); }
    if (!f.done.trim()) { S.formErr = "Write a few words about what you did today."; return render(); }
    const id = `${f.date}_${S.me}`, ex = Store.get("checkins", id);
    const next = f.next.split("\n").map((l) => l.trim()).filter(Boolean);
    Store.set("checkins", id, {
      memberId: S.me, date: f.date, subjects, hours: total, mood: +f.mood, done: f.done.trim(), next, doubts: f.doubts.trim(),
      reactions: ex ? ex.reactions || {} : {}, createdAt: ex ? ex.createdAt : Date.now(), updatedAt: Date.now()
    });
    const have = Store.list("tasks").filter((x) => x.memberId === S.me && x.status !== "done").map((x) => x.text.toLowerCase());
    next.forEach((text) => {
      if (have.includes(text.toLowerCase())) return;
      Store.set("tasks", U.uid(), { memberId: S.me, text, subject: subjects[0].name, status: "todo", due: U.addDays(f.date, 2), createdAt: Date.now(), doneAt: null });
    });
    S.form = null; S.flash = id;
    toast(ex ? "Check-in updated" : "Check-in posted", "ok");
    nav("feed");
  }

  function sendComment(form) {
    const postId = form.dataset.post;
    const ta = form.querySelector("textarea");
    const text = ta.value.trim();
    if (!text) return;
    const rp = S.reply[postId];
    Store.set("comments", U.uid(), { checkinId: postId, memberId: S.me, text, parentId: rp ? rp.cid : null, createdAt: Date.now() });
    delete S.drafts[postId]; delete S.reply[postId];
    S.expanded.add(postId);
    render();
  }

  function createMember(form) {
    const name = $("#m-name").value.trim();
    if (!name) return;
    const color = (form.querySelector("input[name=color]:checked") || {}).value || U.COLORS[0];
    const m = Store.set("members", "m_" + U.uid(), { name, focus: $("#m-focus").value.trim(), color, createdAt: Date.now() });
    ls.set("me", m.id); S.modal = null; S.menu = false; S.form = null;
    toast(`Welcome, ${name.split(" ")[0]}`, "ok");
    render();
  }

  function exportCsv() {
    const ctx = buildCtx();
    const q = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const rows = [["Date", "Member", "Hours", "Subjects", "Focus", "Done", "Next targets", "Needs help"].join(",")];
    [...ctx.ci].sort((a, b) => a.date.localeCompare(b.date)).forEach((c) => {
      const m = ctx.M(c.memberId); if (!m) return;
      rows.push([c.date, m.name, c.hours, (c.subjects || []).map((s) => `${s.name} ${s.hours}h`).join("; "), c.mood, c.done, (c.next || []).join("; "), c.doubts].map(q).join(","));
    });
    try {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
      a.download = `study-progress-${U.today()}.csv`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast("CSV exported", "ok");
    } catch { toast("Could not export from this view"); }
  }

  function act(el) {
    const d = el.dataset, a = d.act;
    switch (a) {
      case "go": location.hash = d.view; break;
      case "go-member": S.feed.member = d.id; S.feed.help = false; nav("feed"); break;
      case "go-post": S.feed = { member: "all", subject: "all", help: false, limit: 50 }; S.flash = d.id; nav("feed"); break;
      case "help-feed": S.feed.help = true; S.feed.member = "all"; nav("feed"); break;
      case "menu": S.menu = !S.menu; render(); break;
      case "theme": {
        const root = document.documentElement;
        const dark = root.dataset.theme === "dark" || (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
        root.dataset.theme = dark ? "light" : "dark"; ls.set("theme", root.dataset.theme); S.menu = false; render(); break;
      }
      case "open-switch": S.modal = "switch"; S.menu = false; render(); break;
      case "open-new": S.modal = "new"; S.menu = false; render(); break;
      case "close-modal": S.modal = null; render(); break;
      case "pick-member": ls.set("me", d.id); S.modal = null; S.menu = false; S.form = null; render(); break;
      case "clear-demo": { const mine = Store.get("members", S.me); Store.clearDemo(); S.menu = false; if (mine && mine.demo) ls.del("me"); S.modal = null; toast("Sample data removed"); break; }
      case "nudge": Store.set("nudges", `${U.today()}_${S.me}_${d.to}`, { fromId: S.me, toId: d.to, date: U.today(), createdAt: Date.now() }); toast("Nudge sent", "ok"); break;
      /* check-in */
      case "mood": S.form.mood = +d.v; render(); break;
      case "toggle-sub": if (d.s in S.form.subs) delete S.form.subs[d.s]; else S.form.subs[d.s] = 1; render(); break;
      case "fill-timer": {
        Store.list("sessions").filter((x) => x.memberId === S.me && x.date === S.form.date).forEach((x) => {
          const k = x.subject || CFG.subjects[0];
          S.form.subs[k] = Math.round(((+S.form.subs[k] || 0) + x.minutes / 60) * 4) / 4;
        });
        render(); break;
      }
      case "edit-day": loadForm(d.date); render(); window.scrollTo(0, 0); break;
      case "ask-del": S.confirmDel = true; render(); break;
      case "cancel-del": S.confirmDel = false; render(); break;
      case "del-checkin": Store.del("checkins", `${S.form.date}_${S.me}`); S.form = null; toast("Check-in deleted"); render(); break;
      /* feed */
      case "feed-set": S.feed[d.k] = d.v; S.feed.limit = 10; render(); break;
      case "feed-help": S.feed.help = !S.feed.help; S.feed.limit = 10; render(); break;
      case "feed-more": S.feed.limit += 10; render(); break;
      case "react": {
        const c = Store.get("checkins", d.post); if (!c) break;
        const r = { ...(c.reactions || {}) }, list = [...(r[d.emoji] || [])], i = list.indexOf(S.me);
        if (i >= 0) list.splice(i, 1); else list.push(S.me);
        if (list.length) r[d.emoji] = list; else delete r[d.emoji];
        Store.patch("checkins", d.post, { reactions: r }); break;
      }
      case "reply": {
        const m = Store.get("members", d.to);
        S.reply[d.post] = { cid: d.cid, to: d.to };
        if (!S.drafts[d.post] && m && d.to !== S.me) S.drafts[d.post] = "@" + m.name.split(" ")[0] + " ";
        render();
        const ta = document.querySelector(`[data-draft="${CSS.escape(d.post)}"]`);
        if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
        break;
      }
      case "cancel-reply": delete S.reply[d.post]; render(); break;
      case "more-comments": S.expanded.add(d.post); render(); break;
      case "del-comment": {
        Store.list("comments").filter((x) => x.parentId === d.id).forEach((x) => Store.del("comments", x.id));
        Store.del("comments", d.id); break;
      }
      /* tasks */
      case "task-who": S.tasks.member = d.v; render(); break;
      case "task-move": Store.patch("tasks", d.id, { status: d.to, doneAt: d.to === "done" ? Date.now() : null }); if (d.to === "done") toast("Task completed", "ok"); break;
      case "task-del": Store.del("tasks", d.id); break;
      case "event-del": Store.del("events", d.id); break;
      /* timer */
      case "t-toggle": T.running ? pauseTimer() : startTimer(); break;
      case "t-reset": resetTimer(); break;
      case "t-mode": if (!T.running) { T.mode = d.v; T.remaining = T.len[T.mode] * 60; render(); } break;
      case "export-csv": S.menu = false; exportCsv(); break;
    }
  }

  /* ---------- events ---------- */
  function bind() {
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-act]");
      if (S.menu && !e.target.closest(".menu,.me-btn")) { S.menu = false; if (!el) { render(); return; } }
      if (!el || el.disabled) return;
      if (el.classList.contains("scrim") && e.target !== el) return; // only the backdrop itself closes a dialog
      const a = document.activeElement;
      if (a && a !== el && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && el.dataset.act !== "reply") a.blur();
      act(el);
    });

    document.addEventListener("input", (e) => {
      const t = e.target;
      if (t.dataset.f && S.form && t.dataset.f !== "date") S.form[t.dataset.f] = t.value;
      else if (t.dataset.sub && S.form) {
        S.form.subs[t.dataset.sub] = t.value;
        const el = $("#totalH"); if (el) el.textContent = U.fmtH(Views.sumSubs(S.form.subs));
      } else if (t.dataset.draft) S.drafts[t.dataset.draft] = t.value;
    });

    document.addEventListener("change", (e) => {
      const t = e.target;
      if (t.dataset.f === "date" && S.form) { if (t.value) { loadForm(t.value); render(); } }
      else if (t.dataset.feed) { S.feed[t.dataset.feed] = t.value; S.feed.limit = 10; render(); }
      else if (t.dataset.timer === "subject") T.subject = t.value;
      else if (t.dataset.timer === "len" && !T.running) { T.len[T.mode] = +t.value; T.remaining = +t.value * 60; render(); }
    });

    document.addEventListener("submit", (e) => {
      const f = e.target.closest("form[data-form]");
      if (!f) return;
      e.preventDefault();
      switch (f.dataset.form) {
        case "checkin": saveCheckin(); break;
        case "comment": sendComment(f); break;
        case "member": createMember(f); break;
        case "task": {
          const text = val("t-text"); if (!text) return;
          Store.set("tasks", U.uid(), { memberId: S.me, text, subject: val("t-sub"), status: "todo", due: val("t-due") || null, createdAt: Date.now(), doneAt: null });
          toast("Task added", "ok"); break;
        }
        case "event": {
          const title = val("e-title"), date = val("e-date"); if (!title || !date) return;
          Store.set("events", U.uid(), { title, date, subject: val("e-sub"), memberId: S.me });
          toast("Added to the countdown", "ok"); break;
        }
      }
    });

    document.addEventListener("focusout", () => { if (dirty) setTimeout(() => { const a = document.activeElement; if (dirty && !(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) render(); }, 120); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && (S.modal || S.menu) && S.me) { S.modal = null; S.menu = false; render(); }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && e.target.dataset && e.target.dataset.draft) e.target.closest("form").requestSubmit();
    });
    window.addEventListener("hashchange", () => { S.menu = false; render(); });
  }

  /* ---------- start ---------- */
  async function init() {
    const saved = ls.get("theme");
    if (saved) document.documentElement.dataset.theme = saved;
    $("#app").innerHTML = `<div class="boot">Loading your team…</div>`;
    let team = null;
    const fb = CFG.firebase;
    if (fb && fb.enabled) team = "main"; // one shared team room, no code needed
    await Store.init({ firebase: fb, team });
    Seed.run(Store, CFG);
    Store.subscribe(onStore);
    bind();
    render();
  }

  return { S, T, init };
})();

App.init();