/* Study Buddies · views.js — every screen is a function that returns HTML */
window.Views = (() => {
  const { esc, num, fmtH, av, icon, dlabel } = U;
  const CFG = () => window.STUDY_CONFIG;
  const S = () => App.S;
  const EMOJI = ["👍", "🔥", "👏", "💡"];
  const EMOJI_NAME = { "👍": "Like", "🔥": "On fire", "👏": "Well done", "💡": "Helpful" };
  const MOODS = [[5, "Locked in"], [4, "Good"], [3, "Okay"], [2, "Struggling"], [1, "Drained"]];
  const moodName = (v) => (MOODS.find((m) => m[0] === +v) || [0, "Okay"])[1];
  const goalOf = (m) => +m.weeklyGoal || +CFG().weeklyGoalHours || 20;

  const dueChip = (d, t, done) => {
    if (!d) return "";
    if (done) return `<span class="tag">${esc(U.fmt(d, { day: "numeric", month: "short" }))}</span>`;
    if (d < t) return `<span class="tag bad">Overdue ${esc(U.fmt(d, { day: "numeric", month: "short" }))}</span>`;
    if (d === t) return `<span class="tag warn">Due today</span>`;
    return `<span class="tag">Due ${esc(U.fmt(d, { day: "numeric", month: "short" }))}</span>`;
  };
  const countdown = (d, t) => { const n = U.diffDays(d, t); return n === 0 ? "Today" : n === 1 ? "Tomorrow" : n < 0 ? Math.abs(n) + " days ago" : "in " + n + " days"; };
  const empty = (title, text) => `<div class="empty"><b>${esc(title)}</b><p>${esc(text)}</p></div>`;
  const legend = (ms) => `<ul class="legend">${ms.map((m) => `<li><i style="background:${esc(m.color)}"></i>${esc(m.name.split(" ")[0])}</li>`).join("")}</ul>`;

  /* ================= OVERVIEW ================= */
  function nudgeNotice(ctx) {
    const me = S().me, t = ctx.t;
    const got = Store.list("nudges").filter((n) => n.toId === me && n.date === t);
    if (!got.length || ctx.has(me, t)) return "";
    const names = [...new Set(got.map((n) => (ctx.M(n.fromId) || {}).name).filter(Boolean))].map((n) => n.split(" ")[0]);
    return `<div class="notice">${icon("bell")}<p><b>${esc(names.join(" and "))}</b> nudged you to check in today.</p><button class="btn sm primary" data-act="go" data-view="checkin">Check in now</button></div>`;
  }

  function overview(ctx) {
    const { ms, t, idx } = ctx, me = S().me, meM = ctx.M(me);
    const hr = new Date().getHours();
    const greet = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
    const ws = U.weekStart(t), pws = U.addDays(ws, -7);
    const week = [...Array(7)].map((_, i) => U.addDays(ws, i));
    const checked = ms.filter((m) => ctx.has(m.id, t));
    const meDone = ctx.has(me, t);

    /* figures */
    const teamWeek = ms.reduce((s, m) => s + ctx.sum(m.id, ws, t), 0);
    const teamPrev = ms.reduce((s, m) => s + ctx.sum(m.id, pws, U.addDays(ws, -1)), 0);
    const dayIdx = U.diffDays(t, ws);
    const prevSame = ms.reduce((s, m) => s + ctx.sum(m.id, pws, U.addDays(pws, dayIdx)), 0);
    const delta = prevSame > 0 ? Math.round(((teamWeek - prevSame) / prevSame) * 100) : null;
    const goalPct = ms.length ? Math.round(ms.reduce((s, m) => s + Math.min(1, ctx.sum(m.id, ws, t) / goalOf(m)), 0) / ms.length * 100) : 0;
    const figs = `<div class="figs">
      <div class="fig"><span class="fig-l">Team hours this week</span><span class="fig-v">${num(teamWeek)}<small>h</small></span>
        <span class="fig-d ${delta === null ? "" : delta >= 0 ? "up" : "down"}">${delta === null ? "No data for last week" : (delta >= 0 ? "Up " : "Down ") + Math.abs(delta) + "% on the same days last week"}</span></div>
      <div class="fig"><span class="fig-l">Checked in today</span><span class="fig-v">${checked.length}<small>of ${ms.length}</small></span>
        <span class="fig-d">${checked.length === ms.length ? "Everyone is in" : ms.length - checked.length + " still to go"}</span></div>
      <div class="fig"><span class="fig-l">Team streak</span><span class="fig-v">${ctx.teamStreak()}<small>days</small></span>
        <span class="fig-d">Days in a row everyone checked in</span></div>
      <div class="fig"><span class="fig-l">Weekly goal</span><span class="fig-v">${goalPct}<small>%</small></span>
        <span class="fig-d">Average across members</span></div></div>`;

    /* today list */
    const people = ms.map((m) => {
      const c = idx[m.id][t];
      const nudged = Store.get("nudges", `${t}_${me}_${m.id}`);
      const status = c
        ? `<span class="ok">Checked in</span> · ${fmtH(c.hours)} · ${esc((c.subjects || []).map((s) => s.name).join(", "))}`
        : `<span class="muted">Not yet</span>${ctx.lastSeen(m.id) ? " · last " + esc(dlabel(ctx.lastSeen(m.id), t)) : ""}`;
      const action = m.id === me
        ? `<button class="btn sm ${c ? "" : "primary"}" data-act="go" data-view="checkin">${c ? "Edit" : "Check in"}</button>`
        : c ? `<button class="btn sm" data-act="go-member" data-id="${m.id}">Read update</button>`
          : nudged ? `<button class="btn sm" disabled>Nudged</button>` : `<button class="btn sm" data-act="nudge" data-to="${m.id}">${icon("bell", 15)}Nudge</button>`;
      return `<li class="person">${av(m, 40)}<div class="pi"><b>${esc(m.name)}${m.id === me ? ' <span class="tag">You</span>' : ""}</b><span>${esc(m.focus || "")}</span></div>
        <div class="ps">${status}</div><div class="pk" title="Current streak">${icon("flame", 16)}<b>${ctx.streak(m.id)}</b></div><div class="pa">${action}</div></li>`;
    }).join("");

    /* weekly goals */
    const ranked = [...ms].sort((a, b) => ctx.sum(b.id, ws, t) - ctx.sum(a.id, ws, t));
    const goals = ranked.map((m, i) => {
      const h = ctx.sum(m.id, ws, t), g = goalOf(m);
      const pace = g * (dayIdx + 1) / 7, diff = h - pace;
      const txt = diff >= 0.5 ? `Ahead by ${fmtH(diff)}` : diff <= -0.5 ? `Behind by ${fmtH(-diff)}` : "On pace";
      return `<li class="goal"><span class="rank">${i + 1}</span>${av(m, 28)}
        <div class="gm"><div class="gt"><b>${esc(m.name.split(" ")[0])}</b><span>${num(h)} / ${num(g)}h</span></div>
        <div class="track"><i style="width:${U.clamp(h / g * 100, 0, 100)}%;background:${esc(m.color)}"></i><u style="left:${U.clamp(pace / g * 100, 0, 100)}%" title="Where you should be today"></u></div>
        <small class="${diff >= 0.5 ? "ok" : diff <= -0.5 ? "bad" : "muted"}">${txt}</small></div></li>`;
    }).join("");

    /* chart */
    const series = ms.map((m) => ({ name: m.name, color: m.color, by: Object.fromEntries(week.map((d) => [d, ctx.hours(m.id, d)])) }));

    /* study grid */
    const WEEKS = 16, start = U.addDays(ws, -(WEEKS - 1) * 7), dg = +CFG().dailyGoalHours || 4;
    const grids = ms.map((m) => {
      let cells = "";
      for (let w = 0; w < WEEKS; w++) for (let d = 0; d < 7; d++) {
        const date = U.addDays(start, w * 7 + d), h = ctx.hours(m.id, date);
        if (date > t) cells += `<i class="cell fut"></i>`;
        else if (!h) cells += `<i class="cell" title="${esc(U.fmt(date, { weekday: "short", day: "numeric", month: "short" }))}: no check-in"></i>`;
        else cells += `<i class="cell on" style="--c:${esc(m.color)};--p:${Math.round(U.clamp(30 + 70 * h / dg, 30, 100))}%" title="${esc(U.fmt(date, { weekday: "short", day: "numeric", month: "short" }))}: ${fmtH(h)}"></i>`;
      }
      return `<div class="gridwrap"><div class="gridhead">${av(m, 22)}<b>${esc(m.name.split(" ")[0])}</b><span>${ctx.daysIn(m.id, U.addDays(t, -(WEEKS * 7 - 1)), t)} days</span></div><div class="heat">${cells}</div></div>`;
    }).join("");

    /* subject mix, last 30 days */
    const a30 = U.addDays(t, -29);
    const per = ms.map((m) => ({ m, s: ctx.subj(m.id, a30, t) }));
    const names = [...new Set([...CFG().subjects, ...per.flatMap((p) => Object.keys(p.s))])];
    const tot = (n) => per.reduce((s, p) => s + (p.s[n] || 0), 0);
    const maxT = Math.max(1, ...names.map(tot));
    const mix = names.filter((n) => tot(n) > 0).sort((a, b) => tot(b) - tot(a)).map((n) =>
      `<li class="mixrow"><span>${esc(n)}</span><div class="mixbar">${per.map((p) => p.s[n] ? `<i style="width:${p.s[n] / maxT * 100}%;background:${esc(p.m.color)}" title="${esc(p.m.name)}: ${fmtH(p.s[n])}"></i>` : "").join("")}</div><b>${fmtH(tot(n))}</b></li>`).join("");

    /* coming up */
    const events = Store.list("events").filter((e) => e.date >= t).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
    const due = Store.list("tasks").filter((x) => x.status !== "done" && x.due && x.due <= U.addDays(t, 7)).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);
    const coming = `${events.length ? `<ul class="events">${events.map((e) => `<li><span class="cd"><b>${U.diffDays(e.date, t)}</b>${U.diffDays(e.date, t) === 1 ? "day" : "days"}</span><div><b>${esc(e.title)}</b><span>${esc(U.fmt(e.date, { weekday: "short", day: "numeric", month: "short" }))}${e.subject ? " · " + esc(e.subject) : ""}</span></div></li>`).join("")}</ul>` : empty("No exams added", "Add exam dates on the Tasks page so everyone can see the countdown.")}
      ${due.length ? `<h4 class="sub">Tasks due this week</h4><ul class="mini">${due.map((x) => `<li>${av(ctx.M(x.memberId), 22)}<span>${esc(x.text)}</span>${dueChip(x.due, t)}</li>`).join("")}</ul>` : ""}`;

    /* recent conversation */
    const recent = Store.list("comments").sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);
    const talk = recent.length ? `<ul class="talk">${recent.map((x) => {
      const c = Store.get("checkins", x.checkinId), a = ctx.M(x.memberId), o = c && ctx.M(c.memberId);
      if (!a || !c) return "";
      return `<li>${av(a, 28)}<div><p><b>${esc(a.name.split(" ")[0])}</b> on ${o && o.id === a.id ? "their own" : esc(o ? o.name.split(" ")[0] + "'s" : "a")} post, ${esc(dlabel(c.date, t))}</p><p class="q">${esc(x.text)}</p></div><button class="lnk" data-act="go-post" data-id="${esc(c.id)}">Open</button></li>`;
    }).join("")}</ul>` : empty("No replies yet", "Replies on check-ins show up here.");

    const openDoubts = ctx.ci.filter((c) => c.doubts && c.date >= U.addDays(t, -7) && !(ctx.cm[c.id] || []).length && c.memberId !== me).length;

    return `
    <header class="page-head"><div><h1>${greet}, ${esc((meM.name || "").split(" ")[0])}</h1>
      <p>${esc(U.fmt(t, { weekday: "long", day: "numeric", month: "long" }))}. ${meDone ? "You are checked in for today." : "You have not checked in yet today."}</p></div>
      <button class="btn primary" data-act="go" data-view="checkin">${icon("checkin", 16)}${meDone ? "Update today's check-in" : "Check in for today"}</button></header>
    ${nudgeNotice(ctx)}
    ${openDoubts ? `<div class="notice warn">${icon("help")}<p><b>${openDoubts}</b> ${openDoubts === 1 ? "doubt is" : "doubts are"} waiting for a reply from the team.</p><button class="btn sm" data-act="help-feed">See who needs help</button></div>` : ""}
    <section class="sec"><h2>Today</h2><ul class="people">${people}</ul></section>
    <section class="sec">${figs}</section>
    <div class="cols">
      <section class="panel"><div class="ph"><h3>This week</h3>${legend(ms)}</div>${Charts.weekBars({ days: week, series, today: t })}</section>
      <section class="panel"><div class="ph"><h3>Weekly goals</h3><span class="muted sm">Tick marks where you should be today</span></div><ul class="goals">${goals}</ul></section>
    </div>
    <section class="panel"><div class="ph"><h3>Study grid</h3><span class="muted sm">Last ${WEEKS} weeks. Darker means more hours.</span></div><div class="grids">${grids}</div></section>
    <div class="cols">
      <section class="panel"><div class="ph"><h3>Where the time went</h3><span class="muted sm">Last 30 days</span></div>${mix ? `<ul class="mix">${mix}</ul>` : empty("Nothing logged yet", "Subject totals appear after the first check-in.")}</section>
      <section class="panel"><div class="ph"><h3>Coming up</h3></div>${coming}</section>
    </div>
    <section class="panel"><div class="ph"><h3>Recent replies</h3><button class="lnk" data-act="go" data-view="feed">Open feed</button></div>${talk}</section>`;
  }

  /* ================= CHECK-IN ================= */
  function sumSubs(subs) { return Math.round(Object.values(subs).reduce((s, v) => s + (+v || 0), 0) * 100) / 100; }

  function subjectRows(f) {
    const keys = Object.keys(f.subs);
    if (!keys.length) return `<p class="hint">Pick at least one subject above, then enter the hours you spent.</p>`;
    return keys.map((k) => `<div class="subrow"><label for="sub-${esc(k)}">${esc(k)}</label>
      <div class="hrs"><input id="sub-${esc(k)}" type="number" inputmode="decimal" min="0" max="16" step="0.25" data-sub="${esc(k)}" value="${esc(f.subs[k])}" aria-label="Hours on ${esc(k)}"><span>hours</span></div></div>`).join("");
  }

  function checkin(ctx) {
    const f = S().form, me = S().me, t = ctx.t;
    const ex = ctx.idx[me] && ctx.idx[me][f.date];
    const total = sumSubs(f.subs);
    const sess = Store.list("sessions").filter((x) => x.memberId === me && x.date === f.date);
    const mins = sess.reduce((s, x) => s + x.minutes, 0);
    const open = Store.list("tasks").filter((x) => x.memberId === me && x.status !== "done").sort((a, b) => (a.due || "9").localeCompare(b.due || "9")).slice(0, 6);
    const recent = ctx.ci.filter((c) => c.memberId === me).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    return `
    <header class="page-head"><div><h1>${ex ? "Edit check-in" : "Daily check-in"}</h1><p>Tell the team what you finished, and what you will do next. Everyone can read and reply.</p></div></header>
    <div class="cols wide">
    <form class="panel form" data-form="checkin" novalidate>
      <div class="frow">
        <div class="field"><label for="f-date">Date</label><input id="f-date" type="date" data-f="date" value="${esc(f.date)}" min="${U.addDays(t, -30)}" max="${t}" required></div>
        <div class="field"><span class="lbl" id="mood-l">How was your focus?</span>
          <div class="seg" role="radiogroup" aria-labelledby="mood-l">${MOODS.map(([v, n]) => `<button type="button" role="radio" aria-checked="${+f.mood === v}" class="${+f.mood === v ? "on" : ""}" data-act="mood" data-v="${v}">${n}</button>`).join("")}</div></div>
      </div>
      <div class="field"><span class="lbl" id="sub-l">Subjects studied</span>
        <div class="chips" role="group" aria-labelledby="sub-l">${CFG().subjects.map((s) => `<button type="button" class="chipbtn ${s in f.subs ? "on" : ""}" aria-pressed="${s in f.subs}" data-act="toggle-sub" data-s="${esc(s)}">${esc(s)}</button>`).join("")}</div>
        <div id="subRows" class="subrows">${subjectRows(f)}</div>
        <div class="totalrow"><span>Total today</span><b id="totalH">${fmtH(total)}</b>
          ${mins ? `<button type="button" class="btn sm" data-act="fill-timer">${icon("focus", 15)}Add ${mins} min from focus timer</button>` : ""}</div></div>
      <div class="field"><label for="f-done">What I did today</label><textarea id="f-done" data-f="done" rows="5" placeholder="Topics covered, problems solved, projects worked on, videos or chapters finished…" required>${esc(f.done)}</textarea></div>
      <div class="field"><label for="f-next">Next targets <span class="opt">One per line. They are added to your task board.</span></label><textarea id="f-next" data-f="next" rows="3" placeholder="Finish CMOS delay notes&#10;Solve 10 DSA problems">${esc(f.next)}</textarea></div>
      <div class="field"><label for="f-doubts">Need help with something? <span class="opt">Optional. Shown to the team with a "Needs help" label.</span></label><textarea id="f-doubts" data-f="doubts" rows="2" placeholder="Describe what you are stuck on">${esc(f.doubts)}</textarea></div>
      ${S().formErr ? `<p class="err" role="alert">${esc(S().formErr)}</p>` : ""}
      <div class="actions"><button class="btn primary" type="submit">${ex ? "Update check-in" : "Post check-in"}</button>
        ${ex ? (S().confirmDel ? `<span class="confirm">Delete this check-in? <button type="button" class="btn sm danger" data-act="del-checkin">Yes, delete</button><button type="button" class="btn sm" data-act="cancel-del">Keep</button></span>` : `<button type="button" class="btn ghost" data-act="ask-del">Delete</button>`) : ""}</div>
    </form>
    <aside class="side-col">
      <section class="panel"><div class="ph"><h3>Open targets</h3></div>
        ${open.length ? `<ul class="todo">${open.map((x) => `<li><button class="tick" data-act="task-move" data-id="${esc(x.id)}" data-to="done" aria-label="Mark done: ${esc(x.text)}">${icon("check", 14)}</button><span>${esc(x.text)}</span>${dueChip(x.due, t)}</li>`).join("")}</ul>` : empty("All clear", "No open targets. Add some below.")}</section>
      <section class="panel"><div class="ph"><h3>Your recent check-ins</h3></div>
        ${recent.length ? `<ul class="mini">${recent.map((c) => `<li><span>${esc(dlabel(c.date, t))}</span><b>${fmtH(c.hours)}</b><button class="lnk" data-act="edit-day" data-date="${c.date}">Edit</button></li>`).join("")}</ul>` : empty("No check-ins yet", "Your first post will appear here.")}</section>
    </aside></div>`;
  }

  /* ================= FEED ================= */
  function post(c, ctx) {
    const me = S().me, t = ctx.t, m = ctx.M(c.memberId);
    if (!m) return "";
    const cms = ctx.cm[c.id] || [];
    const tops = cms.filter((x) => !x.parentId);
    const kids = (id) => cms.filter((x) => x.parentId === id);
    const hidden = !S().expanded.has(c.id) && tops.length > 3 ? tops.length - 3 : 0;
    const shown = hidden ? tops.slice(-3) : tops;
    const cmt = (x, isReply) => {
      const a = ctx.M(x.memberId);
      return `<li class="cm ${isReply ? "rp" : ""}">${av(a, isReply ? 24 : 30)}<div class="cm-b"><div class="cm-h"><b>${esc(a ? a.name : "Former member")}</b><span>${U.timeAgo(x.createdAt)}</span></div>
        <p>${esc(x.text)}</p><div class="cm-a"><button class="lnk" data-act="reply" data-post="${esc(c.id)}" data-cid="${esc(isReply ? x.parentId : x.id)}" data-to="${esc(x.memberId)}">${icon("reply", 13)}Reply</button>${x.memberId === me ? `<button class="lnk" data-act="del-comment" data-id="${esc(x.id)}">Delete</button>` : ""}</div>
        ${isReply ? "" : (kids(x.id).length ? `<ul class="thread rpl">${kids(x.id).map((k) => cmt(k, true)).join("")}</ul>` : "")}</div></li>`;
    };
    const rp = S().reply[c.id];
    const rpTo = rp && ctx.M(rp.to);
    const rx = EMOJI.map((e) => {
      const who = (c.reactions && c.reactions[e]) || [];
      const mine = who.includes(me);
      return `<button class="rx ${mine ? "on" : ""}" data-act="react" data-post="${esc(c.id)}" data-emoji="${e}" aria-pressed="${mine}" aria-label="${EMOJI_NAME[e]}" title="${esc(who.map((id) => (ctx.M(id) || {}).name).filter(Boolean).join(", ") || EMOJI_NAME[e])}"><span>${e}</span>${who.length ? `<b>${who.length}</b>` : ""}</button>`;
    }).join("");
    const meM = ctx.M(me);
    return `<article class="post ${S().flash === c.id ? "flash" : ""}" id="post-${esc(c.id)}">
      <header class="post-h">${av(m, 42)}<div class="grow"><b>${esc(m.name)}</b><span>${esc(dlabel(c.date, t))} · ${esc(U.fmt(c.date, { day: "numeric", month: "short" }))}</span></div>
        <div class="post-k"><b>${fmtH(c.hours)}</b><span>Focus: ${esc(moodName(c.mood))}</span></div></header>
      <div class="chips ro">${(c.subjects || []).map((s) => `<span class="chip"><i style="background:${esc(m.color)}"></i>${esc(s.name)}<b>${fmtH(s.hours)}</b></span>`).join("")}</div>
      <div class="post-b"><h4>Done today</h4><p class="pre">${esc(c.done)}</p></div>
      ${(c.next || []).length ? `<div class="post-b"><h4>Next targets</h4><ul class="plain">${c.next.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>` : ""}
      ${c.doubts ? `<div class="help">${icon("help", 16)}<div><b>Needs help</b><p>${esc(c.doubts)}</p></div>${cms.length ? "" : `<span class="tag warn">No reply yet</span>`}</div>` : ""}
      <footer class="post-f"><div class="rxs">${rx}</div><span class="muted sm">${cms.length ? cms.length + (cms.length === 1 ? " reply" : " replies") : "No replies yet"}</span></footer>
      ${cms.length ? `<ul class="thread">${hidden ? `<li><button class="lnk" data-act="more-comments" data-post="${esc(c.id)}">View ${hidden} earlier ${hidden === 1 ? "comment" : "comments"}</button></li>` : ""}${shown.map((x) => cmt(x, false)).join("")}</ul>` : ""}
      <form class="composer" data-form="comment" data-post="${esc(c.id)}">${av(meM, 30)}
        <div class="grow">${rp ? `<div class="replying">Replying to <b>${esc(rpTo ? rpTo.name : "comment")}</b><button type="button" class="lnk" data-act="cancel-reply" data-post="${esc(c.id)}">Cancel</button></div>` : ""}
          <textarea rows="1" data-draft="${esc(c.id)}" placeholder="${rp ? "Write a reply" : "Reply or ask a question"}" aria-label="Write a reply">${esc(S().drafts[c.id] || "")}</textarea></div>
        <button class="btn sm primary" type="submit">Send</button></form>
    </article>`;
  }

  function feed(ctx) {
    const F = S().feed, me = S().me, t = ctx.t;
    let list = [...ctx.ci].filter((c) => ctx.M(c.memberId)).sort((a, b) => b.date.localeCompare(a.date) || (b.updatedAt || 0) - (a.updatedAt || 0));
    if (F.member !== "all") list = list.filter((c) => c.memberId === F.member);
    if (F.subject !== "all") list = list.filter((c) => (c.subjects || []).some((s) => s.name === F.subject));
    if (F.help) list = list.filter((c) => c.doubts);
    const page = list.slice(0, F.limit);
    const helpCount = ctx.ci.filter((c) => c.doubts).length;
    return `
    <header class="page-head"><div><h1>Team feed</h1><p>Every check-in from every member. Reply, react and help each other.</p></div></header>
    ${nudgeNotice(ctx)}
    <div class="filters">
      <div class="seg" role="group" aria-label="Filter by member"><button class="${F.member === "all" ? "on" : ""}" data-act="feed-set" data-k="member" data-v="all">Everyone</button>${ctx.ms.map((m) => `<button class="${F.member === m.id ? "on" : ""}" data-act="feed-set" data-k="member" data-v="${esc(m.id)}">${esc(m.name.split(" ")[0])}</button>`).join("")}</div>
      <div class="frow2"><select data-feed="subject" aria-label="Filter by subject"><option value="all">All subjects</option>${CFG().subjects.map((s) => `<option value="${esc(s)}" ${F.subject === s ? "selected" : ""}>${esc(s)}</option>`).join("")}</select>
      <button class="chipbtn ${F.help ? "on" : ""}" aria-pressed="${F.help}" data-act="feed-help">Needs help${helpCount ? " (" + helpCount + ")" : ""}</button></div>
    </div>
    <div class="posts">${page.length ? page.map((c) => post(c, ctx)).join("") : empty("Nothing here yet", F.help ? "No one has asked for help. Nice." : "Post the first check-in and it will show up here.")}</div>
    ${list.length > page.length ? `<button class="btn more" data-act="feed-more">Show older check-ins</button>` : ""}`;
  }

  /* ================= TASKS ================= */
  function tasks(ctx) {
    const t = ctx.t, me = S().me, who = S().tasks.member;
    let all = Store.list("tasks").filter((x) => ctx.M(x.memberId));
    if (who !== "all") all = all.filter((x) => x.memberId === who);
    const col = (st, title, hint) => {
      let items = all.filter((x) => x.status === st);
      if (st === "done") items = items.filter((x) => (x.doneAt || 0) > Date.now() - 14 * 864e5).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
      else items.sort((a, b) => (a.due || "9").localeCompare(b.due || "9"));
      const next = { todo: ["doing", "Start"], doing: ["done", "Done"], done: ["todo", "Reopen"] }[st];
      const back = st === "doing" ? ["todo", "Back"] : null;
      return `<section class="bcol"><header><h3>${title}</h3><span class="count">${items.length}</span></header><p class="hint">${hint}</p>
        <ul class="tasklist">${items.length ? items.map((x) => {
          const m = ctx.M(x.memberId), mine = x.memberId === me;
          return `<li class="task ${st}"><div class="task-t">${esc(x.text)}</div>
            <div class="task-m">${av(m, 20)}<span>${esc(m.name.split(" ")[0])}</span>${x.subject ? `<span class="tag">${esc(x.subject)}</span>` : ""}${dueChip(x.due, t, st === "done")}</div>
            ${mine ? `<div class="task-a"><button class="btn sm ${st === "doing" ? "primary" : ""}" data-act="task-move" data-id="${esc(x.id)}" data-to="${next[0]}">${next[1]}</button>${back ? `<button class="btn sm" data-act="task-move" data-id="${esc(x.id)}" data-to="${back[0]}">${back[1]}</button>` : ""}<button class="iconbtn" data-act="task-del" data-id="${esc(x.id)}" aria-label="Delete task">${icon("trash", 15)}</button></div>` : ""}</li>`;
        }).join("") : `<li class="none">Nothing here</li>`}</ul></section>`;
    };
    const events = Store.list("events").sort((a, b) => a.date.localeCompare(b.date));
    const up = events.filter((e) => e.date >= t), past = events.filter((e) => e.date < t).slice(-3);
    return `
    <header class="page-head"><div><h1>Tasks and exams</h1><p>Everyone's targets in one place. You can move your own tasks.</p></div>
      <div class="seg" role="group" aria-label="Whose tasks">${[["all", "Everyone"], ...ctx.ms.map((m) => [m.id, m.id === me ? "Mine" : m.name.split(" ")[0]])].map(([v, n]) => `<button class="${who === v ? "on" : ""}" data-act="task-who" data-v="${esc(v)}">${esc(n)}</button>`).join("")}</div></header>
    <form class="panel addrow" data-form="task"><div class="field grow"><label for="t-text">Add a task for yourself</label><input id="t-text" type="text" maxlength="140" placeholder="e.g. Solve 10 timing analysis problems" required></div>
      <div class="field"><label for="t-sub">Subject</label><select id="t-sub">${CFG().subjects.map((s) => `<option>${esc(s)}</option>`).join("")}</select></div>
      <div class="field"><label for="t-due">Due</label><input id="t-due" type="date" min="${t}" value="${U.addDays(t, 1)}"></div>
      <button class="btn primary" type="submit">${icon("plus", 16)}Add task</button></form>
    <div class="board">${col("todo", "To do", "Planned and waiting")}${col("doing", "In progress", "Being worked on now")}${col("done", "Done", "Finished in the last 14 days")}</div>
    <section class="panel"><div class="ph"><h3>Exams and deadlines</h3><span class="muted sm">Shared with everyone</span></div>
      <form class="addrow tight" data-form="event"><div class="field grow"><label for="e-title">Title</label><input id="e-title" type="text" maxlength="90" placeholder="e.g. VLSI internal exam" required></div>
        <div class="field"><label for="e-date">Date</label><input id="e-date" type="date" min="${t}" value="${U.addDays(t, 7)}" required></div>
        <div class="field"><label for="e-sub">Subject</label><select id="e-sub">${CFG().subjects.map((s) => `<option>${esc(s)}</option>`).join("")}</select></div>
        <button class="btn" type="submit">Add</button></form>
      ${up.length ? `<ul class="events big">${up.map((e) => `<li><span class="cd"><b>${U.diffDays(e.date, t)}</b>${U.diffDays(e.date, t) === 1 ? "day" : "days"}</span><div class="grow"><b>${esc(e.title)}</b><span>${esc(U.fmt(e.date, { weekday: "long", day: "numeric", month: "long" }))}${e.subject ? " · " + esc(e.subject) : ""} · ${esc(countdown(e.date, t))}</span></div>${e.memberId === me ? `<button class="iconbtn" data-act="event-del" data-id="${esc(e.id)}" aria-label="Remove ${esc(e.title)}">${icon("trash", 15)}</button>` : ""}</li>`).join("")}</ul>` : empty("No upcoming exams", "Add one above and the countdown appears on everyone's overview.")}
      ${past.length ? `<p class="muted sm pastline">Recently passed: ${past.map((e) => esc(e.title)).join(", ")}</p>` : ""}</section>`;
  }

  /* ================= FOCUS ================= */
  const mmss = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  function focus(ctx) {
    const T = App.T, me = S().me, t = ctx.t;
    const total = T.len[T.mode] * 60;
    const label = { focus: "Focus", short: "Short break", long: "Long break" }[T.mode];
    const mine = Store.list("sessions").filter((x) => x.memberId === me && x.date === t).sort((a, b) => b.createdAt - a.createdAt);
    const ws = U.weekStart(t);
    const rows = ctx.ms.map((m) => {
      const day = Store.list("sessions").filter((x) => x.memberId === m.id && x.date === t).reduce((s, x) => s + x.minutes, 0);
      const wk = Store.list("sessions").filter((x) => x.memberId === m.id && x.date >= ws && x.date <= t).reduce((s, x) => s + x.minutes, 0);
      return { m, day, wk };
    });
    const maxWk = Math.max(60, ...rows.map((r) => r.wk));
    return `
    <header class="page-head"><div><h1>Focus timer</h1><p>Work in timed blocks. Finished focus blocks are saved and can be added to your check-in.</p></div></header>
    <div class="cols wide">
      <section class="panel timer">
        <div class="seg center" role="group" aria-label="Timer mode">${[["focus", "Focus"], ["short", "Short break"], ["long", "Long break"]].map(([k, n]) => `<button class="${T.mode === k ? "on" : ""}" data-act="t-mode" data-v="${k}">${n}</button>`).join("")}</div>
        <div class="dial">${Charts.ring(T.remaining / total)}<div class="dial-t"><span data-timer-text class="clock">${mmss(T.remaining)}</span><span class="muted">${label}</span></div></div>
        <div class="tctl"><button class="btn primary lg" data-act="t-toggle">${icon(T.running ? "pause" : "play", 16)}${T.running ? "Pause" : T.remaining < total ? "Resume" : "Start"}</button><button class="btn lg" data-act="t-reset">${icon("reset", 16)}Reset</button></div>
        <div class="tset"><div class="field"><label for="t-subject">Studying</label><select id="t-subject" data-timer="subject">${CFG().subjects.map((s) => `<option ${T.subject === s ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></div>
          <div class="field"><label for="t-len">${T.mode === "focus" ? "Focus" : "Break"} length</label><select id="t-len" data-timer="len">${(T.mode === "focus" ? [15, 25, 30, 45, 50, 60] : T.mode === "short" ? [3, 5, 10] : [10, 15, 20, 30]).map((n) => `<option value="${n}" ${T.len[T.mode] === n ? "selected" : ""}>${n} minutes</option>`).join("")}</select></div></div>
      </section>
      <aside class="side-col">
        <section class="panel"><div class="ph"><h3>Your blocks today</h3><b>${mine.reduce((s, x) => s + x.minutes, 0)} min</b></div>
          ${mine.length ? `<ul class="mini">${mine.map((x) => `<li><span>${esc(x.subject || "General")}</span><b>${x.minutes} min</b><span class="muted sm">${new Date(x.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span></li>`).join("")}</ul>` : empty("No blocks yet", "Start the timer to log your first one.")}</section>
        <section class="panel"><div class="ph"><h3>Team focus this week</h3></div>
          <ul class="goals">${rows.map(({ m, day, wk }) => `<li class="goal"><span></span>${av(m, 26)}<div class="gm"><div class="gt"><b>${esc(m.name.split(" ")[0])}</b><span>${wk} min · ${day} today</span></div><div class="track"><i style="width:${wk / maxWk * 100}%;background:${esc(m.color)}"></i></div></div></li>`).join("")}</ul></section>
      </aside></div>`;
  }

  /* ================= PROGRESS ================= */
  const BADGES = [
    ["First step", "Posted a first check-in", (s) => s.count >= 1],
    ["Three in a row", "3-day streak", (s) => s.longest >= 3],
    ["One week strong", "7-day streak", (s) => s.longest >= 7],
    ["Fortnight", "14-day streak", (s) => s.longest >= 14],
    ["Monthly habit", "30-day streak", (s) => s.longest >= 30],
    ["25 hour week", "25 hours in one week", (s) => s.bestWeek >= 25],
    ["Century", "100 hours in total", (s) => s.total >= 100],
    ["Team player", "Wrote 5 replies", (s) => s.replies >= 5]
  ];

  function stats(ctx, m) {
    const t = ctx.t, id = m.id, ws = U.weekStart(t);
    const mine = ctx.ci.filter((c) => c.memberId === id);
    const a28 = U.addDays(t, -27);
    const days28 = ctx.daysIn(id, a28, t);
    const h28 = ctx.sum(id, a28, t);
    const byDow = Array(7).fill(0), nDow = Array(7).fill(0);
    mine.forEach((c) => { const d = (U.parse(c.date).getDay() + 6) % 7; byDow[d] += c.hours; nDow[d]++; });
    let best = -1, bestV = 0;
    byDow.forEach((v, i) => { const avg = nDow[i] ? v / nDow[i] : 0; if (avg > bestV) { bestV = avg; best = i; } });
    const moods = mine.filter((c) => c.date >= a28).map((c) => +c.mood);
    const weeks = {}; mine.forEach((c) => { const w = U.weekStart(c.date); weeks[w] = (weeks[w] || 0) + c.hours; });
    const sj = ctx.subj(id, U.addDays(t, -29), t);
    const top = Object.entries(sj).sort((a, b) => b[1] - a[1])[0];
    const cms = Store.list("comments").filter((x) => x.memberId === id);
    return {
      count: mine.length, total: mine.reduce((s, c) => s + c.hours, 0), streak: ctx.streak(id), longest: ctx.longest(id),
      week: ctx.sum(id, ws, t), prev: ctx.sum(id, U.addDays(ws, -7), U.addDays(ws, -7 + U.diffDays(t, ws))),
      consistency: Math.round(days28 / 28 * 100), avgDay: days28 ? h28 / days28 : 0,
      bestDay: best >= 0 ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][best] : "none yet",
      mood: moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : 0,
      bestWeek: Math.max(0, ...Object.values(weeks)), top: top ? top[0] : "none yet", replies: cms.length, sj
    };
  }

  function progress(ctx) {
    const { ms, t } = ctx, me = S().me;
    const ws = U.weekStart(t);
    const weeks = [...Array(12)].map((_, i) => U.addDays(ws, (i - 11) * 7));
    const series = ms.map((m) => ({ name: m.name, color: m.color, vals: weeks.map((w) => ctx.sum(m.id, w, U.addDays(w, 6))) }));
    const st = Object.fromEntries(ms.map((m) => [m.id, stats(ctx, m)]));

    /* weekly review sentences */
    const teamNow = ms.reduce((s, m) => s + st[m.id].week, 0), teamPrev = ms.reduce((s, m) => s + st[m.id].prev, 0);
    const lines = [];
    const dIdx = U.diffDays(t, ws);
    const prevSame = ms.reduce((s, m) => s + ctx.sum(m.id, U.addDays(ws, -7), U.addDays(ws, -7 + dIdx)), 0);
    lines.push(`The team has logged <b>${fmtH(teamNow)}</b> so far this week${prevSame > 0 ? `, ${teamNow >= prevSame ? "ahead of" : "behind"} last week's <b>${fmtH(prevSame)}</b> by this day` : ""}.`);
    const lead = [...ms].sort((a, b) => st[b.id].week - st[a.id].week)[0];
    if (lead && st[lead.id].week > 0) lines.push(`<b>${esc(lead.name.split(" ")[0])}</b> leads the week with ${fmtH(st[lead.id].week)}.`);
    const longest = [...ms].sort((a, b) => st[b.id].streak - st[a.id].streak)[0];
    if (longest && st[longest.id].streak >= 3) lines.push(`<b>${esc(longest.name.split(" ")[0])}</b> is on a ${st[longest.id].streak}-day streak.`);
    ms.forEach((m) => { const last = ctx.lastSeen(m.id); if (last && U.diffDays(t, last) >= 2) lines.push(`<b>${esc(m.name.split(" ")[0])}</b> last checked in ${U.diffDays(t, last)} days ago. A nudge could help.`); });
    const unanswered = ctx.ci.filter((c) => c.doubts && !(ctx.cm[c.id] || []).length).length;
    if (unanswered) lines.push(`${unanswered} ${unanswered === 1 ? "doubt has" : "doubts have"} no reply yet.`);
    void teamPrev;

    const cards = ms.map((m) => {
      const s = st[m.id], d = s.week - s.prev;
      const earned = BADGES.filter((b) => b[2](s));
      const sjTot = Object.values(s.sj).reduce((a, b) => a + b, 0) || 1;
      return `<article class="panel member">
        <header class="mh">${av(m, 46)}<div class="grow"><b>${esc(m.name)}${m.id === me ? ' <span class="tag">You</span>' : ""}</b><span>${esc(m.focus || "")}</span></div>
          <div class="pk">${icon("flame", 16)}<b>${s.streak}</b><span>day streak</span></div></header>
        <dl class="kv">
          <div><dt>This week</dt><dd>${fmtH(s.week)} <em class="${d >= 0 ? "ok" : "bad"}" title="Compared with the same days last week">${d >= 0 ? "+" : ""}${num(d)}h vs last wk</em></dd></div>
          <div><dt>Consistency, 28 days</dt><dd>${s.consistency}%</dd></div>
          <div><dt>Average study day</dt><dd>${fmtH(s.avgDay)}</dd></div>
          <div><dt>Best day</dt><dd>${esc(s.bestDay)}</dd></div>
          <div><dt>Average focus</dt><dd>${s.mood ? esc(moodName(Math.round(s.mood))) : "none yet"}</dd></div>
          <div><dt>Longest streak</dt><dd>${s.longest} days</dd></div>
          <div><dt>All time</dt><dd>${fmtH(s.total)}</dd></div>
          <div><dt>Check-ins</dt><dd>${s.count}</dd></div></dl>
        <div class="splitbar" role="img" aria-label="Subject split, last 30 days">${Object.entries(s.sj).sort((a, b) => b[1] - a[1]).map(([k, v], i) => `<i style="width:${v / sjTot * 100}%;background:${esc(m.color)};opacity:${Math.max(0.3, 1 - i * 0.22)}" title="${esc(k)}: ${fmtH(v)}"></i>`).join("") || ""}</div>
        <p class="muted sm">${Object.keys(s.sj).length ? "Last 30 days: " + Object.entries(s.sj).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${esc(k)} ${Math.round(v / sjTot * 100)}%`).join(", ") : "No subject data yet."}</p>
        <div class="badges">${earned.length ? earned.map((b) => `<span class="badge" title="${esc(b[1])}">${esc(b[0])}</span>`).join("") : `<span class="muted sm">No badges yet</span>`}</div>
      </article>`;
    }).join("");

    const mineS = st[me] || {};
    const locked = BADGES.filter((b) => !b[2](mineS));
    return `
    <header class="page-head"><div><h1>Progress</h1><p>How each member is doing, and how the team is trending.</p></div>
      <button class="btn" data-act="export-csv">${icon("download", 16)}Export CSV</button></header>
    <section class="panel review"><div class="ph"><h3>This week in short</h3></div><ul class="plain big">${lines.map((l) => `<li>${l}</li>`).join("")}</ul></section>
    <section class="panel"><div class="ph"><h3>Weekly hours, last 12 weeks</h3>${legend(ms)}</div>${Charts.trend({ weeks, series })}</section>
    <div class="members">${cards}</div>
    ${locked.length ? `<section class="panel"><div class="ph"><h3>Badges you can still earn</h3></div><ul class="locked">${locked.map((b) => `<li><b>${esc(b[0])}</b><span>${esc(b[1])}</span></li>`).join("")}</ul></section>` : ""}`;
  }

  return { overview, checkin, feed, tasks, focus, progress, sumSubs, subjectRows };
})();/* Study Buddies · config.js
 * The only file you normally need to edit.
 */
window.STUDY_CONFIG = {
  appName: "Study Buddies",

  // Subjects offered in the check-in form.
  subjects: ["VLSI", "AI", "BBA", "B.Tech", "Other"],

  // Targets used for progress bars and the study grid.
  weeklyGoalHours: 20,
  dailyGoalHours: 4,
  // Shows sample members and history so you can explore the site before
  // anyone has joined. Only applies when Firebase is OFF. Use
  // "Remove sample data" in the profile menu when you are done.
  seedDemo: false,

  // Shared storage. With enabled:false every browser keeps its own copy.
  // With enabled:true all members see the same data live. Setup: README.md
  firebase: {
    enabled: true,
    config: {
      apiKey: "AIzaSyDDqRs47HXYsdfX6HWRH8OKRFmtJGgZEw0",
      authDomain: "sandeep-bd526.firebaseapp.com",
      projectId: "sandeep-bd526",
      storageBucket: "sandeep-bd526.firebasestorage.app",
      messagingSenderId: "812664539508",
      appId: "1:812664539508:web:121d106542c77bb9ef4421"
    }
  }
};

