import { FONTS } from "./fonts.js";
import { day, local } from "./lib.js";

const DAY = 86400000;
const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const W = 825;
const L = 32;
const R = W - 32;
const BG = "#0B0B0D";
const TRACK = "#1C1C1F";
const TEXT = "#F2F1EC";
const MUTED = "#8B8B86";
const ACCENT = "#E2703A";
const RAMP = ["#161618", "#71351C", "#A94C22", "#DE6D31", "#FFAD74"];

const esc = (s) =>
  s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const num = (n) => n.toLocaleString("en-US");
const plural = (n) => `${num(n)} contribution${n === 1 ? "" : "s"}`;

export const svgResponse = (svg) =>
  new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control":
        "public, max-age=0, s-maxage=21600, stale-while-revalidate=86400",
    },
  });

export function totals(rows) {
  const t = {};
  for (const r of rows) t[r.date] = (t[r.date] ?? 0) + r.count;
  return t;
}

const fmt = (x, now) => {
  const d = new Date(x);
  const year =
    d.getUTCFullYear() === new Date(now).getUTCFullYear()
      ? ""
      : `, ${d.getUTCFullYear()}`;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}${year}`;
};
const range = ({ start, end }, now) =>
  start === end ? fmt(start, now) : `${fmt(start, now)} – ${fmt(end, now)}`;

const card = (
  h,
  body,
  defs = "",
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}">
<defs>${defs}</defs>
<style>${FONTS}
text{font-family:Geist,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;fill:${MUTED}}
.t{fill:${TEXT}}
.l{font-size:18px;letter-spacing:-0.2px}
.b{font-weight:500}
.n{font-size:36px;letter-spacing:-1.2px}
.u{font-size:14px}
</style>
<rect width="${W}" height="${h}" rx="10" fill="${BG}"/>
${body}
</svg>`;

const headline = (value, rest) =>
  `<text x="${L}" y="46" class="l"><tspan class="t b">${value}</tspan> ${rest}</text>`;

export function graph(rows, now = Date.now()) {
  const today = Date.parse(local(now));
  const start = today - 364 * DAY;
  const offset = new Date(start).getUTCDay();
  const byDay = {};
  for (const r of rows) {
    const repos = (byDay[r.date] ??= {});
    const name = r.private ? "Private repository" : r.repo;
    repos[name] = (repos[name] ?? 0) + r.count;
  }
  const cells = [];
  for (let t = start; t <= today; t += DAY) {
    const repos = byDay[day(t)] ?? {};
    cells.push({
      t,
      repos,
      n: Object.values(repos).reduce((a, b) => a + b, 0),
    });
  }
  const sorted = cells.map((c) => c.n).sort((a, b) => a - b);
  const cap = sorted[Math.floor(0.99 * sorted.length)];
  const sum = sorted.reduce((a, b) => a + b, 0);
  const best = cells.reduce((a, c) => (c.n > a.n ? c : a), cells[0]);

  const step = (R - L - 11) / 52;
  const top = 72;
  let body = "";
  cells.forEach(({ t, repos, n }, i) => {
    const x = (L + Math.floor((i + offset) / 7) * step).toFixed(1);
    if (new Date(t).getUTCDate() === 1)
      body += `<text x="${x}" y="190">${MONTHS[new Date(t).getUTCMonth()]}</text>`;
    const lines = Object.entries(repos)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `\n${esc(k)}: ${v}`)
      .join("");
    const level = n && (cap ? Math.min(4, Math.ceil((n / cap) * 4)) : 4);
    body += `<rect x="${x}" y="${(top + ((i + offset) % 7) * step).toFixed(1)}" width="11" height="11" rx="2" fill="${RAMP[level]}"><title>${plural(n)} on ${fmt(t, 0)}${lines}</title></rect>`;
  });

  return card(
    214,
    `${headline(num(sum), "contributions in the last year")}
${best.n ? `<text x="${R}" y="46" text-anchor="end">Best day <tspan class="t">${num(best.n)}</tspan> on ${fmt(best.t, now)}</text>` : ""}
${body}`,
  );
}

export function streaks(t, now = Date.now()) {
  const today = Date.parse(local(now));
  const active = Object.keys(t)
    .filter((d) => t[d] > 0)
    .sort();
  const total = active.reduce((a, d) => a + t[d], 0);
  let run = null;
  let longest = { start: today, end: today, len: 0 };
  for (
    let x = active.length ? Date.parse(active[0]) : today;
    x <= today;
    x += DAY
  ) {
    if (t[day(x)] > 0) {
      run = run
        ? { ...run, end: x, len: run.len + 1 }
        : { start: x, end: x, len: 1 };
      if (run.len > longest.len) longest = run;
    } else if (x < today) run = null;
  }
  return {
    total,
    first: active.length ? Date.parse(active[0]) : today,
    current: run ?? { start: today, end: today, len: 0 },
    longest,
  };
}

export function streak(t, now = Date.now()) {
  const s = streaks(t, now);
  const width = 225;
  const done = s.longest.len ? (width * s.current.len) / s.longest.len : 0;
  const first = new Date(s.first);
  const col = (x, value, unit, label, meta) => `
<text x="${x}" y="66"><tspan class="t n">${value}</tspan>${unit ? `<tspan dx="6" class="u">${unit}</tspan>` : ""}</text>
<text x="${x}" y="94" class="t">${label}</text>
<text x="${x}" y="113">${meta}</text>`;
  return card(
    152,
    `${col(L, num(s.current.len), s.current.len === 1 ? "day" : "days", "Current streak", s.current.len ? `Since ${fmt(s.current.start, now)}` : "Starts with the next push")}
<line x1="${L}" x2="${L + width}" y1="130" y2="130" stroke="${TRACK}" stroke-width="2" stroke-linecap="round"/>
${done ? `<line x1="${L}" x2="${(L + done).toFixed(1)}" y1="130" y2="130" stroke="${ACCENT}" stroke-width="2" stroke-linecap="round"><title>${s.current.len} of ${s.longest.len} days</title></line>` : ""}
${col(305, num(s.longest.len), "days", "Longest streak", range(s.longest, now))}
${col(578, num(s.total), "", "Contributions, all time", `Since ${MONTHS[first.getUTCMonth()]} ${first.getUTCFullYear()}`)}`,
  );
}

export function activity(t, now = Date.now()) {
  const today = Date.parse(local(now));
  const pts = Array.from({ length: 31 }, (_, i) => {
    const x = today - (30 - i) * DAY;
    return { t: x, n: t[day(x)] ?? 0 };
  });
  const sum = pts.reduce((a, p) => a + p.n, 0);
  const max = Math.max(...pts.map((p) => p.n));
  const peak = pts.findIndex((p) => p.n === max);
  const base = 190;
  const X = (i) => L + (i * (R - L)) / 30;
  const Y = (n) => base - (n / (max * 1.15 || 1)) * 104;
  const curve = pts
    .map((p, i) => {
      if (!i) return `M${X(0)},${Y(p.n)}`;
      const mid = (X(i - 1) + X(i)) / 2;
      return `C${mid},${Y(pts[i - 1].n)} ${mid},${Y(p.n)} ${X(i)},${Y(p.n)}`;
    })
    .join("");
  const anchor = (i) => (i < 2 ? "start" : i > 28 ? "end" : "middle");
  const marks = [...new Set([max ? peak : 30, 30])]
    .map(
      (i) =>
        `<circle cx="${X(i)}" cy="${Y(pts[i].n)}" r="3.5" fill="${ACCENT}" stroke="${BG}" stroke-width="2"/><text x="${X(i)}" y="${Y(pts[i].n) - 11}" text-anchor="${anchor(i)}" class="t">${num(pts[i].n)}</text>`,
    )
    .join("");
  const hits = pts
    .map(
      (p, i) =>
        `<circle cx="${X(i)}" cy="${Y(p.n)}" r="10" fill="transparent"><title>${plural(p.n)} on ${fmt(p.t, 0)}</title></circle>`,
    )
    .join("");

  return card(
    234,
    `${headline(num(sum), "contributions in the last 31 days")}
<text x="${R}" y="46" text-anchor="end"><tspan class="t">${num(Math.round(sum / 31))}</tspan> a day on average</text>
<line x1="${L}" x2="${R}" y1="${base + 0.5}" y2="${base + 0.5}" stroke="${TRACK}"/>
<path d="${curve}L${X(30)},${base}L${X(0)},${base}Z" fill="url(#fade)"/>
<path d="${curve}" fill="none" stroke="${ACCENT}" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round"/>
${marks}${hits}
<text x="${L}" y="214">${fmt(pts[0].t, now)}</text>
<text x="${R}" y="214" text-anchor="end">Today</text>`,
    `<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ACCENT}" stop-opacity="0.14"/><stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/></linearGradient>`,
  );
}

export function hero(t, now = Date.now()) {
  const today = Date.parse(local(now));
  const weeks = Array.from({ length: 52 }, (_, w) => {
    let n = 0;
    for (let d = 0; d < 7; d++)
      n += t[day(today - ((51 - w) * 7 + d) * DAY)] ?? 0;
    return n;
  });
  const sum = weeks.reduce((a, b) => a + b, 0);
  const max = Math.max(...weeks) || 1;
  const X = (i) => L + (i * (R - L)) / 51;
  const Y = (n) => 262 - (n / (max * 1.1)) * 68;
  const curve = weeks
    .map((n, i) => {
      if (!i) return `M${X(0)},${Y(n)}`;
      const mid = (X(i - 1) + X(i)) / 2;
      return `C${mid},${Y(weeks[i - 1])} ${mid},${Y(n)} ${X(i)},${Y(n)}`;
    })
    .join("");

  return card(
    304,
    `<text x="${L}" y="46">@lowkeyarhan</text>
<text x="${R}" y="46" text-anchor="end">Bengaluru, India</text>
<text x="${L - 3}" y="124" class="t" style="font-size:60px;letter-spacing:-2.6px;font-weight:450">Arhan Das</text>
<text x="${L}" y="160" style="font-size:19px;letter-spacing:-0.2px">Building things that ship. <tspan style="fill:#FFAD74">And survive.</tspan></text>
<path d="${curve}L${X(51)},262L${X(0)},262Z" fill="url(#heat)" opacity="0.14"/>
<path d="${curve}" fill="none" stroke="url(#heat)" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round"/>
<circle cx="${X(51)}" cy="${Y(weeks[51])}" r="3.5" fill="#FFAD74" stroke="${BG}" stroke-width="2"/>
<text x="${L}" y="286">Past 12 months</text>
<text x="${R}" y="286" text-anchor="end"><tspan class="t">${num(sum)}</tspan> contributions</text>`,
    `<linearGradient id="heat" x1="${L}" x2="${R}" y1="0" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#71351C"/><stop offset="0.6" stop-color="${ACCENT}"/><stop offset="1" stop-color="#FFAD74"/></linearGradient>`,
  );
}

const STORY = [
  [
    "Basslines",
    "EDM producer",
    "Where it started. Producing electronic music taught me structure, layering and timing long before I wrote code.",
  ],
  [
    "Frames",
    "Video editor, 8 years and counting",
    "Freelance video editing and post-production, still going. Pacing, restraint and an eye for detail, which prolly explains why my UIs look good.",
  ],
  [
    "Kernels",
    "Open-source Android kernels",
    "QA on open-source MT6785 Android kernels. Close to the metal: flashing builds, reading logs, breaking things on purpose.",
  ],
  [
    "Backends",
    "Backend-first engineer",
    "Distributed systems and products built to scale. Backend by instinct, frontend when needed, designer when no one's looking.",
  ],
  [
    "Now",
    "Agentic harness engineering",
    "Making agents write code that scales, ships, and doesn't embarrass me. Full-time student, movie maniac, part-time gamer (yes, on a Mac).",
  ],
];
const DOTS = ["#71351C", "#A94C22", "#DE6D31", ACCENT, "#FFAD74"];

const SKILLS = [
  [
    "Languages",
    "Java · JavaScript · TypeScript · Python · SQL · Bash · C · MQL5",
  ],
  [
    "Backend",
    "Spring Boot · NestJS · Express · REST APIs · gRPC · Microservices",
  ],
  [
    "AI & agents",
    "Agent orchestration · LangGraph · LangChain · MCP · RAG · Harness engineering · Agent loops · MinHash & LSH · KV cache",
  ],
  [
    "Databases",
    "PostgreSQL · MySQL · MongoDB · Redis · Apache Cassandra · ElectricSQL",
  ],
  ["Frontend", "React · Next.js · Tailwind CSS · React Native · Electron"],
  ["Messaging & testing", "Apache Kafka · Apache JMeter"],
  [
    "DevOps & observability",
    "Docker · Kubernetes · GitHub Actions · Grafana · Prometheus · Loki · OpenTelemetry",
  ],
  [
    "Foundations",
    "Distributed systems · System design · Concurrency · Operating systems · Low-level design · Android OS · Computer hardware",
  ],
];

const wrap = (s, n) =>
  s.split(" ").reduce((lines, w) => {
    const last = lines.at(-1);
    if (last !== undefined && `${last} ${w}`.length <= n)
      lines[lines.length - 1] = `${last} ${w}`;
    else lines.push(w);
    return lines;
  }, []);

export function story() {
  let y = 100;
  let body = "";
  const tops = [];
  STORY.forEach(([title, role, text], i) => {
    tops.push(y);
    body += `<circle cx="${L + 4}" cy="${y - 5}" r="4" fill="${DOTS[i]}" stroke="${BG}" stroke-width="3"/>
<text x="${L + 26}" y="${y}" class="t b" style="font-size:16px">${title}</text>
<text x="${L + 26}" y="${y + 21}">${role}</text>`;
    let ty = y;
    for (const line of wrap(text, 76)) {
      body += `<text x="270" y="${ty}" class="t" style="font-size:13.5px;fill:#CFCDC6">${esc(line)}</text>`;
      ty += 21;
    }
    y = Math.max(ty, y + 42) + 26;
  });
  return card(
    y - 2,
    `${headline("Basslines, frames, kernels, backends.", "The long way into engineering.")}
<line x1="${L + 4}" x2="${L + 4}" y1="${tops[0] - 5}" y2="${tops.at(-1) - 5}" stroke="${TRACK}" stroke-width="1.5"/>
${body}`,
  );
}

export function skills() {
  let y = 98;
  let body = "";
  for (let i = 0; i < SKILLS.length; i += 2) {
    let h = 0;
    SKILLS.slice(i, i + 2).forEach(([label, items], j) => {
      const x = j ? 428 : L;
      const lines = wrap(items, 54);
      body += `<rect x="${x}" y="${y - 9}" width="8" height="8" rx="2" fill="${DOTS[i / 2 + 1]}"/>
<text x="${x + 18}" y="${y}" class="t b" style="font-size:13.5px">${esc(label)}</text>`;
      lines.forEach((line, k) => {
        body += `<text x="${x + 18}" y="${y + 23 + k * 20}" style="font-size:13px">${esc(line)}</text>`;
      });
      h = Math.max(h, 23 + (lines.length - 1) * 20);
    });
    y += h + 36;
  }
  return card(
    y - 14,
    `${headline("Technical skills", "and the tools I ship with.")}\n${body}`,
  );
}
