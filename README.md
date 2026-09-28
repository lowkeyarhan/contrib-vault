# contrib-vault

Self-hosted GitHub contribution cards. Year graph, streaks, 31-day activity and
a profile header — rendered as SVG, no build step, no runtime dependencies.

## Endpoints

| Route           | Card                                                        |
| --------------- | ----------------------------------------------------------- |
| `/api/hero`     | Name, handle, location and a 12-month contribution sparkline |
| `/api/story`    | Career timeline, EDM producer through to harness engineering |
| `/api/skills`   | Technical skills, two-column                                |
| `/api/social`   | Social handle badge, one per platform (`?p=linkedin\|x\|instagram\|leetcode`) |
| `/api/graph`    | 365-day contribution grid and best day                       |
| `/api/streak`   | Current streak progress, longest streak, all-time total      |
| `/api/activity` | 31-day activity curve with peak and daily average            |

Every card returns `image/svg+xml` behind a CDN cache, so they drop straight
into any README:

```markdown
![hero](https://YOUR_DOMAIN/api/hero)
![story](https://YOUR_DOMAIN/api/story)
![skills](https://YOUR_DOMAIN/api/skills)
![linkedin](https://YOUR_DOMAIN/api/social?p=linkedin)
![graph](https://YOUR_DOMAIN/api/graph)
![streak](https://YOUR_DOMAIN/api/streak)
![activity](https://YOUR_DOMAIN/api/activity)
```

`/api/social` is sized to its own content and caches for 24h, so a row of them
tiles edge to edge. An unknown `?p=` returns `404`.

`/api/sync` is not a card — it's the nightly backfill endpoint and rejects
anything without `Authorization: Bearer $CRON_SECRET`.

## How it works

```
GitHub GraphQL ──► lib.js ──► Supabase ──► svg.js ──► SVG
 (contributionsCollection)  (contributions)  (renderers)
```

1. `lib.js` pages the GraphQL API in 7-day windows and normalises commits,
   issues, pull requests, reviews and plain repository contributions into rows
   of `{ date, repo, private, count }`.
2. Private repositories are anonymised as `(restricted)`. Any gap between
   GitHub's public calendar count and the per-repo counts we can see is folded
   into `(restricted)` too, so the total always matches GitHub's.
3. Rows upsert into Postgres (`schema.sql`, RLS on) via the Supabase REST API.
4. Card endpoints fire a best-effort sync capped at 3s, then render from the
   database — a cold cache still self-heals and a slow sync never blocks the
   response.
5. A Vercel cron hits `/api/sync` at midnight to keep things fresh.

## Setup

```sh
git clone https://github.com/lowkeyarhan/contrib-vault
cp .env.example .env   # fill in the five values below
npm run seed           # backfill from your account creation date
npm run dev            # http://localhost:3000/api/graph
```

Paste `schema.sql` into the Supabase SQL editor once, before seeding.

| Variable              | Purpose                                     |
| --------------------- | ------------------------------------------- |
| `GITHUB_TOKEN`        | token with `read:user`, for the GraphQL API |
| `SUPABASE_URL`        | project URL, e.g. `https://abc.supabase.co` |
| `SUPABASE_SECRET_KEY` | service role key (server-side only)         |
| `CRON_SECRET`         | bearer token guarding `/api/sync`           |
| `TIMEZONE`            | day boundary, e.g. `Asia/Kolkata`           |

## Tests

```sh
npm test
```

Assert-based smoke test over row aggregation, restricted-repo anonymisation,
SVG output and streak math.

## Deploy

Push to Vercel and set the same variables there. `vercel.json` already declares
the nightly cron, so there is nothing else to configure.

## License

Code is MIT. `fonts.js` vendors Geist and Geist Mono under the SIL Open Font
License 1.1 — see [FONTS-LICENSE.txt](FONTS-LICENSE.txt).
