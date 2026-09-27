import assert from "node:assert/strict";
import { RESTRICTED, toRows } from "./lib.js";
import { graph, streaks } from "./svg.js";

process.env.TIMEZONE = "Asia/Kolkata";

const repo = (nameWithOwner, isPrivate, nodes) => ({
  repository: { nameWithOwner, isPrivate },
  contributions: { nodes },
});
const rows = toRows(
  {
    contributionCalendar: {
      weeks: [
        {
          contributionDays: [
            { date: "2026-09-19", contributionCount: 99 },
            { date: "2026-09-20", contributionCount: 10 },
            { date: "2026-09-21", contributionCount: 0 },
          ],
        },
      ],
    },
    repositoryContributions: {
      nodes: [
        {
          occurredAt: "2026-09-19T19:14:59Z",
          repository: { nameWithOwner: "me/new", isPrivate: false },
        },
      ],
    },
    commit: [
      repo("me/app", false, [
        { occurredAt: "2026-09-20T07:00:00Z", commitCount: 5 },
      ]),
      repo("org/secret", true, [
        { occurredAt: "2026-09-20T07:00:00Z", commitCount: 2 },
      ]),
    ],
    issue: [],
    pullRequest: [
      repo("me/app", false, [{ occurredAt: "2026-09-20T09:53:12Z" }]),
    ],
    pullRequestReview: [],
  },
  "2026-09-20",
  "2026-09-27",
);

const get = (r) => rows.find((x) => x.repo === r)?.count;
assert.equal(get("me/app"), 6);
assert.equal(get("me/new"), 1);
assert.equal(get("org/secret"), 2);
assert.equal(get(RESTRICTED), 1);
assert.equal(
  rows.reduce((a, r) => a + r.count, 0),
  10,
);

const svg = graph(rows, Date.parse("2026-09-27"));
assert.match(svg, />10<\/tspan>.*in the last year/);
assert.match(
  svg,
  /10 contributions on Sep 20, 2026\nme\/app: 6\nPrivate repository: 3\nme\/new: 1/,
);
assert.doesNotMatch(svg, /org\/secret/);
assert.equal(svg.match(/<title>/g).length, 365);

const t = {
  "2026-09-20": 1,
  "2026-09-21": 2,
  "2026-09-22": 3,
  "2026-09-25": 1,
  "2026-09-26": 4,
};
const s = streaks(t, Date.parse("2026-09-27T06:00:00Z"));
assert.equal(s.total, 11);
assert.equal(s.current.len, 2);
assert.equal(s.longest.len, 3);
assert.equal(streaks(t, Date.parse("2026-09-28T06:00:00Z")).current.len, 0);
console.log("ok");
