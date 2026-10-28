/* Study Buddies · seed.js — sample members and history (local mode only).
 * Every document is flagged demo:true so "Remove sample data" can delete it.
 */
window.Seed = (() => {
  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const DONE = {
    VLSI: [
      "CMOS inverter: derived the voltage transfer curve and noise margins",
      "MOSFET short-channel effects, solved 6 numericals",
      "Verilog: wrote a 4-bit ALU with a self-checking testbench",
      "Static timing analysis, setup and hold slack practice",
      "Gate sizing for equal rise and fall delay in NAND and NOR",
      "Layout rules and stick diagrams for a 2-input NAND"
    ],
    AI: [
      "Gradient descent from scratch in NumPy, plotted the loss curve",
      "Implemented k-means and visualised the clusters",
      "Backpropagation through a convolution layer, worked a small example",
      "Trained a small CNN on Fashion-MNIST, reached 88% test accuracy",
      "Bias-variance trade-off and regularisation revision",
      "Read the attention paper, summarised scaled dot-product attention"
    ],
    BBA: [
      "Marketing mix case study, summarised the 4Ps for the example firm",
      "Principles of Management chapter 5, planning and decision making",
      "Financial accounting, balance sheet practice questions",
      "Organisational behaviour notes on motivation theories",
      "Prepared slides for the economics assignment"
    ],
    "B.Tech": [
      "Digital electronics, K-map simplification, 15 problems",
      "Signals and systems, Fourier series revision",
      "Data structures, 8 linked list problems",
      "Engineering maths, Laplace transform practice",
      "Microprocessors, 8085 addressing modes and instruction set"
    ],
    Other: ["Aptitude practice set, 30 questions", "Updated resume and LinkedIn profile"]
  };
  const NEXT = {
    VLSI: ["Finish CMOS delay notes", "Solve 10 timing analysis problems", "Simulate the ALU in Icarus Verilog"],
    AI: ["Implement logistic regression", "Finish week 3 quiz", "Read the CNN chapter"],
    BBA: ["Draft the marketing report", "Revise accounting ratios", "Prepare viva answers on HRM"],
    "B.Tech": ["Complete the digital electronics worksheet", "Solve last year's signals paper", "Revise 8085 programs"],
    Other: ["Take one full aptitude mock"]
  };
  const DOUBTS = [
    "I don't follow why the body effect raises the threshold voltage. Can someone explain it simply?",
    "Stuck on problem 4 of the setup-time worksheet. The clock skew part is confusing.",
    "Which resource is best for revising hypothesis testing quickly?",
    "Is it better to learn Verilog or SystemVerilog first for placements?"
  ];
  const COMMENTS = [
    "Good progress today. That is a lot covered.",
    "Can you share your notes on this? I would like to compare with mine.",
    "Let's go through the numericals together tonight.",
    "Nice consistency this week, keep it going.",
    "I had the same confusion last week. Check the derivation in chapter 3, it clears it up.",
    "Well done on the testbench. Did you cover the corner cases?"
  ];
  const REPLIES = ["Thanks, will send them after dinner.", "Yes, tonight works for me.", "That helped a lot, thank you."];

  const PEOPLE = [
    { name: "Yasaswini", focus: "VLSI and B.Tech", color: "#D9487E", w: { VLSI: 4, "B.Tech": 3, AI: 1, BBA: 0.4 }, rate: 0.88, mean: 4.4, streak: 9 },
    { name: "Arjun Rao", focus: "AI and B.Tech", color: "#3B6EF5", w: { AI: 4, "B.Tech": 2, VLSI: 1.5, Other: 0.5 }, rate: 0.93, mean: 3.9, streak: 17 },
    { name: "Meera Nair", focus: "BBA and AI", color: "#D9861A", w: { BBA: 4, AI: 1.5, Other: 1 }, rate: 0.7, mean: 3.2, streak: 0 }
  ];

  function run(Store, CFG) {
    if (Store.mode !== "local" || Store.list("members").length || !CFG.seedDemo) return false;
    const R = rng(20261028);
    const pick = (a) => a[Math.floor(R() * a.length)];
    const t = U.today();
    const now = Date.now();
    let n = 0;
    const id = (p) => p + "_" + ++n;

    const members = PEOPLE.map((p, i) =>
      Store.set("members", "m_" + (i + 1), { name: p.name, focus: p.focus, color: p.color, createdAt: now - (60 - i) * 864e5, demo: true })
    );

    const posts = [];
    members.forEach((m, mi) => {
      const p = PEOPLE[mi];
      for (let i = 44; i >= 0; i--) {
        const d = U.addDays(t, -i);
        const dow = U.parse(d).getDay();
        let attend = R() < p.rate * (dow === 0 || dow === 6 ? 0.82 : 1);
        if (i < p.streak) attend = true;          // guaranteed current streak
        if (i === p.streak && p.streak > 0) attend = false; // and a break before it
        if (mi === 2 && i <= 1) attend = false;   // Meera is behind, shows the nudge flow
        if (!attend) continue;

        const total = Math.max(1, Math.round((p.mean + (R() - 0.5) * 3) * 4) / 4);
        const keys = Object.keys(p.w);
        const chosen = [];
        const count = total > 4 ? 3 : total > 2 ? 2 : 1;
        while (chosen.length < Math.min(count, keys.length)) {
          const bag = keys.flatMap((k) => Array(Math.round(p.w[k] * 2)).fill(k));
          const k = pick(bag);
          if (!chosen.includes(k)) chosen.push(k);
        }
        let left = total;
        const subjects = chosen.map((name, ix) => {
          const h = ix === chosen.length - 1 ? left : Math.max(0.5, Math.round(((total / chosen.length) * (0.7 + R() * 0.6)) * 4) / 4);
          left = Math.max(0, left - h);
          return { name, hours: Math.round(h * 4) / 4 };
        });
        const hours = subjects.reduce((s, x) => s + x.hours, 0);
        const doubts = R() < 0.17 ? pick(DOUBTS) : "";
        const reactions = {};
        ["👍", "🔥", "👏", "💡"].forEach((e) => {
          const who = members.filter((o) => o.id !== m.id && R() < 0.4).map((o) => o.id);
          if (who.length) reactions[e] = who;
        });
        const c = Store.set("checkins", d + "_" + m.id, {
          memberId: m.id, date: d, subjects, hours,
          mood: R() < 0.2 ? 3 : R() < 0.6 ? 4 : 5,
          done: subjects.map((s) => `${s.name}: ${pick(DONE[s.name] || DONE.Other)}`).join("\n"),
          next: subjects.slice(0, 2).map((s) => pick(NEXT[s.name] || NEXT.Other)),
          doubts, reactions,
          createdAt: Math.min(U.parse(d).getTime() + (19 + R() * 3) * 36e5, now - (5 + R() * 40) * 6e4),
          updatedAt: Math.min(U.parse(d).getTime() + 21 * 36e5, now - 3 * 6e4), demo: true
        });
        posts.push(c);
      }
    });

    // conversation on the last two weeks
    posts.filter((c) => c.date >= U.addDays(t, -14)).forEach((c) => {
      const others = members.filter((o) => o.id !== c.memberId);
      const recentDoubt = c.doubts && c.date >= U.addDays(t, -2);
      if (recentDoubt) return; // leave the newest doubts unanswered
      if (c.doubts || R() < 0.42) {
        const first = Store.set("comments", id("c"), {
          checkinId: c.id, memberId: pick(others).id, text: c.doubts ? COMMENTS[4] : pick(COMMENTS),
          createdAt: Math.min(c.createdAt + (30 + R() * 200) * 6e4, now - 60000), demo: true
        });
        if (R() < 0.55)
          Store.set("comments", id("c"), {
            checkinId: c.id, memberId: c.memberId, parentId: first.id, text: pick(REPLIES),
            createdAt: Math.min(first.createdAt + (10 + R() * 90) * 6e4, now - 30000), demo: true
          });
      }
    });

    // tasks
    const status = ["todo", "doing", "done", "done"];
    members.forEach((m, mi) => {
      const keys = Object.keys(PEOPLE[mi].w);
      for (let k = 0; k < 6; k++) {
        const s = keys[k % keys.length];
        const st = status[k % 4];
        Store.set("tasks", id("t"), {
          memberId: m.id, text: pick(NEXT[s] || NEXT.Other), subject: s, status: st,
          due: U.addDays(t, st === "done" ? -k : k - 1),
          createdAt: now - (k + 1) * 864e5, doneAt: st === "done" ? now - k * 36e5 * 5 : null, demo: true
        });
      }
    });

    // exams and deadlines
    [["VLSI Design internal exam", 9, "VLSI"], ["Machine Learning mid-term", 16, "AI"], ["Marketing case viva", 5, "BBA"], ["Digital Electronics lab record due", 3, "B.Tech"]].forEach(
      ([title, days, subject]) => Store.set("events", id("e"), { title, date: U.addDays(t, days), subject, memberId: members[0].id, demo: true })
    );

    // focus sessions
    members.forEach((m, mi) => {
      for (let i = 13; i >= 0; i--) {
        const d = U.addDays(t, -i);
        const k = Math.round(R() * 3 + (mi === 1 ? 1 : 0));
        for (let j = 0; j < k; j++)
          Store.set("sessions", id("s"), { memberId: m.id, date: d, minutes: 25, subject: pick(Object.keys(PEOPLE[mi].w)), createdAt: Math.min(U.parse(d).getTime() + (9 + j * 2 + R()) * 36e5, now - (120 + j * 40) * 6e4), demo: true });
      }
    });
    return true;
  }

  return { run };
})();
