const DAY = 86400000;
const KINDS = ["commit", "issue", "pullRequest", "pullRequestReview"];
export const RESTRICTED = "(restricted)";

const QUERY = `query($from: DateTime!, $to: DateTime!) {
  viewer {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar { weeks { contributionDays { date contributionCount } } }
      repositoryContributions(first: 100) { nodes { occurredAt repository { nameWithOwner isPrivate } } }
      ${KINDS.map(
        (k) => `${k}: ${k}ContributionsByRepository(maxRepositories: 100) {
        repository { nameWithOwner isPrivate }
        contributions(first: 100) { nodes { occurredAt${k === "commit" ? " commitCount" : ""} } }
      }`,
      ).join("\n")}
    }
  }
}`;

export const day = (t) => new Date(t).toISOString().slice(0, 10);
export const local = (t) =>
  new Date(t).toLocaleDateString("en-CA", {
    timeZone: process.env.TIMEZONE || "UTC",
  });

export async function gh(query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors)
    throw new Error(JSON.stringify(json.errors ?? json));
  return json.data;
}

async function db(path, init = {}) {
  const key = process.env.SUPABASE_SECRET_KEY;
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res;
}

export function toRows(c, from, to) {
  const rows = {};
  const add = (date, repo, isPrivate, n) => {
    if (date < from || date >= to) return;
    rows[date + "|" + repo] ??= { date, repo, private: isPrivate, count: 0 };
    rows[date + "|" + repo].count += n;
  };
  for (const n of c.repositoryContributions.nodes)
    add(
      local(n.occurredAt),
      n.repository.nameWithOwner,
      n.repository.isPrivate,
      1,
    );
  for (const k of KINDS)
    for (const { repository, contributions } of c[k])
      for (const n of contributions.nodes)
        add(
          k === "commit" ? day(n.occurredAt) : local(n.occurredAt),
          repository.nameWithOwner,
          repository.isPrivate,
          n.commitCount ?? 1,
        );
  const seen = {};
  for (const r of Object.values(rows))
    seen[r.date] = (seen[r.date] ?? 0) + r.count;
  for (const w of c.contributionCalendar.weeks)
    for (const d of w.contributionDays)
      if (d.contributionCount > (seen[d.date] ?? 0))
        add(
          d.date,
          RESTRICTED,
          true,
          d.contributionCount - (seen[d.date] ?? 0),
        );
  return Object.values(rows);
}

export async function sync(since) {
  let total = 0;
  for (let t = Date.parse(day(since)); t < Date.now(); t += 7 * DAY) {
    const to = Math.min(t + 8 * DAY, Date.now());
    const { viewer } = await gh(QUERY, {
      from: new Date(t - DAY).toISOString(),
      to: new Date(to).toISOString(),
    });
    const rows = toRows(
      viewer.contributionsCollection,
      day(t),
      day(t + 7 * DAY),
    );
    if (rows.length)
      await db("contributions?on_conflict=date,repo", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(rows),
      });
    console.log(day(t), rows.length);
    total += rows.length;
  }
  return total;
}

export async function load(since) {
  const rows = [];
  for (;;) {
    const res = await db(
      `contributions?select=date,repo,private,count&date=gte.${since}&order=date,repo&offset=${rows.length}&limit=1000`,
    );
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

export async function fresh(since) {
  await Promise.race([
    sync(Date.now() - 7 * DAY).catch((e) =>
      console.error("sync failed:", e.message),
    ),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
  return load(since);
}
