/* Study Buddies · util.js — small helpers shared by every module */
window.U = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---- dates (all dates are local "YYYY-MM-DD" strings) ---- */
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => ymd(new Date());
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
  const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 864e5);
  const weekStart = (s) => addDays(s, -((parse(s).getDay() + 6) % 7)); // Monday
  const fmt = (s, o) => parse(s).toLocaleDateString("en-IN", o);
  const dayName = (s) => fmt(s, { weekday: "short" });
  const dlabel = (d, t = today()) =>
    d === t ? "Today" : d === addDays(t, -1) ? "Yesterday" : fmt(d, { weekday: "short", day: "numeric", month: "short" });

  /* ---- numbers ---- */
  const num = (n, d = 1) => String(+(+n || 0).toFixed(d));
  const fmtH = (h) => { h = +h || 0; return h > 0 && h < 1 ? Math.round(h * 60) + "m" : num(h) + "h"; };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const timeAgo = (ts) => {
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + " min ago";
    if (s < 86400) return Math.floor(s / 3600) + " h ago";
    const d = ymd(new Date(ts));
    return dlabel(d) + ", " + new Date(ts).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  };

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const initials = (n) => String(n).trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const av = (m, size = 36) =>
    m ? `<span class="av" style="--c:${esc(m.color)};--s:${size}px" aria-hidden="true">${esc(initials(m.name))}</span>` : "";

  const COLORS = ["#3B6EF5", "#D9487E", "#D9861A", "#1E9B77", "#8B5CF6", "#0E9FBF", "#CF4A3F", "#7C8A2A"];

  /* ---- localStorage that never throws ---- */
  const mem = new Map();
  const ls = {
    get(k) { if (mem.has(k)) return mem.get(k); try { return localStorage.getItem("sb2." + k); } catch { return null; } },
    set(k, v) { mem.set(k, v); try { localStorage.setItem("sb2." + k, v); } catch { /* blocked: kept in memory */ } },
    del(k) { mem.delete(k); try { localStorage.removeItem("sb2." + k); } catch { /* blocked */ } }
  };

  /* ---- icons (stroke, 24px grid) ---- */
  const P = {
    overview: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    checkin: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    feed: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
    tasks: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    focus: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2"/><path d="M9 2h6"/>',
    progress: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    flame: '<path d="M12 2c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9Z"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    reply: '<path d="M9 14 4 9l5-5"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    play: '<path d="M6 4l14 8-14 8Z"/>',
    pause: '<path d="M7 4h3v16H7zM14 4h3v16h-3z"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>'
  };
  const icon = (n, s = 18) =>
    `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ""}</svg>`;

  let toastT;
  function toast(msg, kind = "") {
    const box = document.getElementById("toasts");
    if (!box) return;
    box.innerHTML = `<div class="toast ${kind}">${esc(msg)}</div>`;
    clearTimeout(toastT);
    toastT = setTimeout(() => { box.innerHTML = ""; }, 2600);
  }

  return { $, $$, esc, ymd, today, parse, addDays, diffDays, weekStart, fmt, dayName, dlabel, num, fmtH, clamp, timeAgo, uid, initials, av, COLORS, ls, icon, toast };
})();
