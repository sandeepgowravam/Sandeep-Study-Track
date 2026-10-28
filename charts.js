/* Study Buddies · charts.js — dependency-free SVG charts */
window.Charts = (() => {
  const { esc, num, fmtH } = U;

  function niceStep(x) {
    const p = Math.pow(10, Math.floor(Math.log10(x)));
    const n = x / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  }
  function axis(maxVal, ticks = 4) {
    const step = niceStep(Math.max(maxVal, 1) / ticks);
    return { step, max: step * ticks, ticks };
  }
  function grid(W, H, L, R, T, B, a, y) {
    let g = "";
    for (let i = 0; i <= a.ticks; i++) {
      const v = a.step * i, yy = y(v);
      g += `<line class="gl" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text class="tk" x="${L - 8}" y="${yy + 4}" text-anchor="end">${num(v)}</text>`;
    }
    return g;
  }

  /* Stacked bars: one bar per day, one segment per member. */
  function weekBars({ days, series, today }) {
    const W = 640, H = 250, L = 36, R = 8, T = 22, B = 28, iw = W - L - R, ih = H - T - B;
    const totals = days.map((d) => series.reduce((s, m) => s + (m.by[d] || 0), 0));
    const a = axis(Math.max(...totals, 2));
    const y = (v) => T + ih - (v / a.max) * ih;
    const sw = iw / days.length, bw = Math.min(46, sw * 0.58);
    let bars = "", labels = "";
    days.forEach((d, i) => {
      const cx = L + sw * i + sw / 2;
      let acc = 0;
      series.forEach((m) => {
        const h = m.by[d] || 0;
        if (h > 0) {
          const y1 = y(acc + h), y0 = y(acc);
          bars += `<rect x="${cx - bw / 2}" y="${y1}" width="${bw}" height="${Math.max(1, y0 - y1)}" rx="2" fill="${esc(m.color)}" stroke="var(--surface)" stroke-width="1.5"><title>${esc(m.name)}: ${fmtH(h)} on ${esc(U.dlabel(d, today))}</title></rect>`;
          acc += h;
        }
      });
      if (totals[i] > 0) bars += `<text class="tv" x="${cx}" y="${y(totals[i]) - 6}" text-anchor="middle">${fmtH(totals[i])}</text>`;
      labels += `<text class="tk ${d === today ? "now" : ""} ${d > today ? "future" : ""}" x="${cx}" y="${H - 8}" text-anchor="middle">${U.dayName(d)}</text>`;
    });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Hours studied per day this week, stacked by member">${grid(W, H, L, R, T, B, a, y)}${bars}${labels}</svg>`;
  }

  /* Lines: weekly hours for each member. */
  function trend({ weeks, series }) {
    const W = 1000, H = 300, L = 36, R = 34, T = 18, B = 28, iw = W - L - R, ih = H - T - B;
    const max = Math.max(...series.flatMap((s) => s.vals), 4);
    const a = axis(max);
    const y = (v) => T + ih - (v / a.max) * ih;
    const x = (i) => L + (weeks.length === 1 ? iw / 2 : (iw * i) / (weeks.length - 1));
    let lines = "", labels = "";
    series.forEach((s) => {
      const pts = s.vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
      lines += `<polyline fill="none" stroke="${esc(s.color)}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round" points="${pts.join(" ")}"/>`;
      s.vals.forEach((v, i) => {
        lines += `<circle cx="${x(i)}" cy="${y(v)}" r="${i === s.vals.length - 1 ? 4 : 2}" fill="${esc(s.color)}" stroke="var(--surface)" stroke-width="1.5"><title>${esc(s.name)}: ${fmtH(v)} in week of ${esc(U.fmt(weeks[i], { day: "numeric", month: "short" }))}</title></circle>`;
      });
    });
    weeks.forEach((w, i) => {
      if ((weeks.length - 1 - i) % 2 === 0 || weeks.length < 6)
        labels += `<text class="tk ${i === weeks.length - 1 ? "now" : ""}" x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(U.fmt(w, { day: "numeric", month: "short" }))}</text>`;
    });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weekly study hours for each member over the last ${weeks.length} weeks">${grid(W, H, L, R, T, B, a, y)}${lines}${labels}</svg>`;
  }

  /* Progress ring for the focus timer. frac = share remaining (0..1). */
  function ring(frac, size = 232) {
    const r = 100, c = 2 * Math.PI * r;
    return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" class="ring-bg" stroke-width="10"/>
      <circle id="ringArc" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" class="ring-fg" stroke-width="10" stroke-linecap="round"
        stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - frac)).toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})" data-c="${c.toFixed(2)}"/></svg>`;
  }

  return { weekBars, trend, ring };
})();
