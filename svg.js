import { FONTS } from "./fonts.js";
import { day, local } from "./lib.js";

const DAY = 86400000;
const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const W = 825;
const BG = "#0B0B0D";
const BORDER = "#1F1F22";
const GRID = "#18181B";
const TEXT = "#F2F1EC";
const MUTED = "#8B8B86";
const ACCENT = "#E2703A";
const RAMP = ["#18181B", "#71351C", "#A94C22", "#DE6D31", "#FFAD74"];

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
text{font-family:Geist,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;fill:${MUTED}}
.e,.m,.v{font-family:GeistMono,ui-monospace,Menlo,monospace}
.e{font-size:10px;letter-spacing:1.6px;fill:#75756F}
.m{font-size:11px;fill:${MUTED}}
.v{font-size:11px;fill:${TEXT}}
.h{font-size:44px;letter-spacing:-1.8px;fill:${TEXT}}
.s{font-size:22px;letter-spacing:-0.6px;fill:${TEXT}}
.u{font-size:14px}
</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${h - 1}" rx="14" fill="${BG}" stroke="${BORDER}"/>
${body}
</svg>`;

const stat = (x, label, value) =>
  `<text x="${x}" y="40" text-anchor="end" class="e">${label}</text><text x="${x}" y="76" text-anchor="end" class="s">${value}</text>`;

const hero = (label, value, unit) =>
  `<text x="28" y="40" class="e">${label}</text><text x="26" y="90"><tspan class="h">${value}</tspan><tspan dx="12" class="u">${unit}</tspan></text>`;

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

  const gx = 58;
  const gy = 138;
  let body = "";
  cells.forEach(({ t, repos, n }, i) => {
    const x = gx + Math.floor((i + offset) / 7) * 14;
    const date = new Date(t);
    if (date.getUTCDate() === 1)
      body += `<text x="${x}" y="126" class="m">${MONTHS[date.getUTCMonth()]}</text>`;
    const lines = Object.entries(repos)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `\n${esc(k)}: ${v}`)
      .join("");
    const level = n && (cap ? Math.min(4, Math.ceil((n / cap) * 4)) : 4);
    body += `<rect x="${x}" y="${gy + ((i + offset) % 7) * 14}" width="11" height="11" rx="2.5" fill="${RAMP[level]}"><title>${plural(n)} on ${fmt(t, 0)}${lines}</title></rect>`;
  });
  ["Mon", "Wed", "Fri"].forEach((d, i) => {
    body += `<text x="28" y="${gy + (i * 2 + 1) * 14 + 9}" class="m">${d}</text>`;
  });
  RAMP.forEach((c, l) => {
    body += `<rect x="${698 + l * 14}" y="256" width="11" height="11" rx="2.5" fill="${c}"/>`;
  });

  return card(
    290,
    `${hero("CONTRIBUTIONS", num(sum), "in the last year")}
${stat(797, "ACTIVE DAYS", num(cells.filter((c) => c.n).length))}
${stat(680, "BEST DAY", best.n ? `${num(best.n)}<tspan dx="8" class="m">${fmt(best.t, now)}</tspan>` : "0")}
${body}
<text x="28" y="266" class="m">${fmt(start, 0)} – ${fmt(today, 0)}</text>
<text x="690" y="266" text-anchor="end" class="m">Less</text>
<text x="797" y="266" text-anchor="end" class="m">More</text>`,
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
  const c = 2 * Math.PI * 52;
  const ratio = s.longest.len ? s.current.len / s.longest.len : 0;
  const side = (x, label, value, unit, date) => `
<text x="${x}" y="70" text-anchor="middle" class="e">${label}</text>
<text x="${x}" y="126" text-anchor="middle"><tspan class="h">${value}</tspan>${unit ? `<tspan dx="8" class="u">${unit}</tspan>` : ""}</text>
<text x="${x}" y="156" text-anchor="middle" class="m">${date}</text>`;
  return card(
    226,
    `<line x1="275" y1="50" x2="275" y2="176" stroke="${BORDER}"/>
<line x1="550" y1="50" x2="550" y2="176" stroke="${BORDER}"/>
${side(137.5, "TOTAL CONTRIBUTIONS", num(s.total), "", `${fmt(s.first, now)} – Present`)}
<circle cx="412.5" cy="100" r="52" fill="none" stroke="${GRID}" stroke-width="5"/>
<circle cx="412.5" cy="100" r="52" fill="none" stroke="url(#ember)" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(c * ratio).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 412.5 100)"><title>${s.current.len} of ${s.longest.len} days (longest)</title></circle>
<path transform="translate(412.5 74) scale(0.6)" fill="${ACCENT}" d="M0-13C5-7 9-3 9 3 9 9 5 13 0 13-5 13-9 9-9 3-9-2-5-4-4-9-2-5 0-4 0-13Z"/>
<text x="412.5" y="123" text-anchor="middle" class="h" style="font-size:36px">${num(s.current.len)}</text>
<text x="412.5" y="186" text-anchor="middle" class="e">CURRENT STREAK</text>
<text x="412.5" y="206" text-anchor="middle" class="m">${range(s.current, now)}</text>
${side(687.5, "LONGEST STREAK", num(s.longest.len), "days", range(s.longest, now))}`,
    `<linearGradient id="ember" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFAD74"/><stop offset="1" stop-color="${ACCENT}"/></linearGradient>`,
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
  const step =
    [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000].find(
      (s) => s * 4 >= max,
    ) ?? 5000;
  const X = (i) => 58 + (i * 739) / 30;
  const Y = (n) => 258 - (n / (step * 4)) * 134;
  const curve = pts
    .map((p, i) => {
      if (!i) return `M${X(0)},${Y(p.n)}`;
      const mid = (X(i - 1) + X(i)) / 2;
      return `C${mid},${Y(pts[i - 1].n)} ${mid},${Y(p.n)} ${X(i)},${Y(p.n)}`;
    })
    .join("");

  let body = "";
  for (let k = 0; k <= 4; k++)
    body += `<line x1="58" x2="797" y1="${Y(k * step)}" y2="${Y(k * step)}" stroke="${k ? GRID : BORDER}"/><text x="46" y="${Y(k * step) + 4}" text-anchor="end" class="m">${num(k * step)}</text>`;
  for (const i of [0, 5, 10, 15, 20, 25, 30])
    body += `<text x="${X(i)}" y="284" text-anchor="${i ? (i === 30 ? "end" : "middle") : "start"}" class="m">${fmt(pts[i].t, now)}</text>`;
  const marks = [...new Set([max ? peak : 30, 30])]
    .map(
      (i) =>
        `<circle cx="${X(i)}" cy="${Y(pts[i].n)}" r="4.5" fill="${ACCENT}" stroke="${BG}" stroke-width="2"/><text x="${X(i)}" y="${Y(pts[i].n) - 12}" text-anchor="middle" class="v">${num(pts[i].n)}</text>`,
    )
    .join("");
  const hits = pts
    .map(
      (p, i) =>
        `<circle cx="${X(i)}" cy="${Y(p.n)}" r="10" fill="transparent"><title>${plural(p.n)} on ${fmt(p.t, 0)}</title></circle>`,
    )
    .join("");

  return card(
    304,
    `${hero("ACTIVITY · LAST 31 DAYS", num(sum), "contributions")}
${stat(797, "PEAK", num(max))}
${stat(700, "DAILY AVG", num(Math.round(sum / 31)))}
${body}
<path d="${curve}L${X(30)},258L${X(0)},258Z" fill="url(#fade)"/>
<path d="${curve}" fill="none" stroke="${ACCENT}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
${marks}${hits}`,
    `<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ACCENT}" stop-opacity="0.28"/><stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/></linearGradient>`,
  );
}
