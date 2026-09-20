# db-health

Answers the question nothing in this repo was asking while the registry's
database was unreachable from 2026-03-24 to 2026-09-20: **is the database
actually working right now?**

## Why this exists

The registry served 503s for roughly six months. Every startup logged
`P1017` (RAG) and `P1001` (Skills) and carried on. Nobody noticed, because
nothing was looking:

- `watchdog` watches whether *workflows* are healthy.
- `deploy-drift` watches whether the *deployed commit* matches git. It
  polls `/api/version`, which reads environment variables and never touches
  the database — so it stayed **perfectly green** through a total database
  outage.

There was no check anywhere whose red meant "the product does not work".

The uncomfortable part: `GET /health` already existed the entire time, it
already ran a real `SELECT 1`, and it already returned 503 with
`{"status":"unhealthy","error":"Database connection failed"}` on every
single request. The signal was there from day one. Nothing asked for it.
This tool is the asking.

## What it checks

| Check | Endpoint | What a pass actually proves |
| --- | --- | --- |
| Connectivity | `GET /health` | The registry can open a connection and run `SELECT 1`. |
| Schema | `GET /api/v1/skills?limit=1` | Real tables exist and answer a real query. |
| Expiry | arithmetic on `probes.js` | How long until a Render free-tier database expires, and then how long until it is permanently deleted. |

Both endpoints are public and unauthenticated, so — exactly like
`deploy-drift` — this holds **no credential** beyond the ambient
`GITHUB_TOKEN` the workflow already gets for managing its pinned issue.

### Why two probes and not one

Connectivity alone is not enough. A freshly created database with no
migrations applied answers `SELECT 1` perfectly happily while every real
query fails — which is precisely the state a recreated database sits in
before `prisma migrate deploy` runs. The schema probe runs a real query
against real tables.

### Why the schema probe does not assert `total > 0`

Because the registry can legitimately be empty. A check that demanded rows
would start failing the moment someone removed the last skill — a false
alarm, and the fastest way to teach everyone to ignore this tool. An empty
result from a working schema is a pass. The probe asserts *the query ran*.

### The expiry check is the one that would have prevented this

The others detect the outage. This one prevents it. A Render free Postgres
expires 30 days after creation — that is the actual root cause of the
original incident, not a random suspension but a scheduled deletion nobody
was watching for.

**Expiry is not deletion**, and the tool tracks both dates because
conflating them gives dangerously wrong advice:

```
created ---30 days---> EXPIRES ---14 days grace---> DELETED FOREVER
```

During the grace period the instance is expired but **upgrading to a paid
plan restores it with all data intact**. Only after that window is it
permanently deleted. So there are two distinct past-expiry states and the
tool reports them separately:

| State | What it means | What to do |
| --- | --- | --- |
| `in-grace` | Expired, still recoverable, with a deadline | Upgrade **now** — this is the most time-sensitive thing this tool reports |
| `deleted` | Past the grace period | Recreate and re-migrate; anything not separately backed up is gone |

Telling someone to "recreate and re-migrate" one day too early destroys
data that was still rescuable, which is why these are never collapsed into
a single `expired`. (The first version of this tool did collapse them. It
was corrected against Render's own docs — the same docs that confirm free
instances get **no backups of any kind**, which is why the grace period is
the only recovery mechanism this plan has, and why `tools/db-backup`
exists.)

This also probably explains the original incident's two different Prisma
errors: `P1017` on one database (expired, still present) and `P1001` on the
other (past grace, actually gone).

Both dates are recorded by hand in `probes.js` because no tool available to
this repo's CI can read a Render database's expiry, and adding a
`RENDER_API_KEY` secret purely to fetch it would introduce exactly the kind
of quietly-rotting credential `tools/doctor/check.js` exists to catch.

That hand-maintained date is a liability, so the tool guards it: an expiry
that has passed **while the probes are healthy** is reported as a problem
with `probes.js`, not with the database. A stale record makes every
"expires in N days" warning fiction, so it stays loud until someone fixes
the file.

## Cold starts, and not crying wolf

The registry runs on Render's free plan, which spins the instance down
after ~15 minutes idle. During the ~30-60s cold start the *platform*
answers 502/503 with its own holding page — not the app.

A naive check would report every cold start as a database outage, false-alarm
most of the day, and get muted within a week. So:

- A 502/503 is only believed to be a real outage when it carries **the
  app's own** `{"status":"unhealthy"}` JSON body.
- Anything else that looks transient is retried **once**, after a wait, and
  only then reported. The first request is what wakes the instance; the
  retry is the one that gets a real answer.
- A definitive `database-down` answer is **not** retried — that would only
  delay the alarm.

## How it reports

One pinned `Database health` issue (label `tso-db-health`), updated in
place, reopened if a human closed it while still broken, and closed with a
resolution comment once everything passes again. A healthy run never opens
an issue. Same pattern `watchdog` and `deploy-drift` already use.

## Running it

```bash
node tools/db-health/check.js          # human-readable
node tools/db-health/check.js --json   # machine-readable
```

Without `GITHUB_REPOSITORY`/`GITHUB_TOKEN` it still probes and prints, and
just skips publishing — which is what a local run does.

Scheduled hourly via
[`.github/workflows/db-health.yml`](../../.github/workflows/db-health.yml),
offset to `:30` so it and `deploy-drift` don't wake the free instance at the
same moment.

## Testing

`tests/db-health.test.js` — `fetchImpl`, `sleepFn` and `now` are all
injectable, so no test makes a real network call, waits on a real clock, or
depends on the live service. The cases that matter most are the ones
encoding the real incident: a 503 meaning "service up, database down", a
cold-start 503 meaning nothing of the sort, and the expired-vs-stale-record
correlation.

## What this deliberately does not do

It cannot connect to the database directly — it only polls what the running
service exposes. That is a deliberate trade: a direct connection would need
the database credential as a CI secret, and the whole point of this tool is
to need nothing that can quietly rot. The cost is that it cannot tell a
broken database apart from a broken service *by itself* — which is why
`service-unreachable`, `service-waking` and `database-down` are three
separate, separately-worded statuses rather than one.
