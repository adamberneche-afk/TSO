# header-drift

Checks that the live static site actually serves the response headers
`render.yaml` says it does.

Workflow: [`.github/workflows/header-drift.yml`](../../.github/workflows/header-drift.yml)
· Check: [`check.js`](check.js) · Tests: [`tests/header-drift.test.js`](../../tests/header-drift.test.js)

## Why this exists

**`render.yaml` is not synced to Render.** The services were hand-created in
the dashboard and nothing reconciles the file against them, so it is
documentation shaped like configuration — and it looks authoritative right
up until you rely on it.

A single reconciliation pass on 2026-09-20 found **five** values in it that
disagreed with reality:

| Claimed | Actual | Consequence if applied |
| --- | --- | --- |
| service `tais-registry` | `TSO` | Blueprint sync would create a *second* service |
| `startCommand: npm start` | `packages/registry/start.sh` | **Migrations silently stop running on deploy** |
| `healthCheckPath: /api/health` | blank | Render polls a route that has never existed |
| two databases | one | — |
| frontend build settings | all three differ | — |

Three of those had been wrong for months. Fixing them was one-at-a-time
work; nothing stopped the sixth from appearing. This closes the loop for the
subset of `render.yaml`'s claims that can be verified from outside with
nothing but an HTTP request.

## The design property that matters

**Expectations are parsed out of `render.yaml` at run time, not hardcoded.**

There is deliberately no second copy of the expected values here to drift
from the first. Change `render.yaml` and this check changes with it. A
checker carrying its own private copy of the truth would just become a third
thing needing reconciliation — which is the problem, not the solution.

## What it does, precisely

1. Parses the `headers:` blocks out of `render.yaml`.
2. Resolves each declared path to something actually fetchable.
3. Requests it and compares the real response header against the declaration.

Three details that are not incidental:

**Wildcards resolve to a real asset.** `/assets/*` cannot be fetched, so the
tool pulls a genuine asset filename out of the live `index.html`. Requesting
an invented name would prove nothing — the SPA rewrite serves `index.html`
for any unmatched path, so the comparison would silently be measuring the
wrong resource and passing.

**Comparison is by directive set, not string equality.** A CDN may reorder,
respace or re-case directives without changing meaning. Failing on that
would make the check cry wolf, and a check that cries wolf gets muted.

**Both `headers:` shapes in `render.yaml` are distinguished.** The static
site declares *response* headers (`path`/`name`/`value`); the cron job
declares a *request* header (`key`/`value`). Entries are accepted on shape
rather than position, and there is a test asserting the cron job's
`Authorization` header is never collected.

## Zero declarations is a failure, not a pass

If `render.yaml` loses its headers, or this tool stops being able to parse
them, the run goes **red**.

A checker that quietly verifies nothing and reports success is the precise
failure mode this repo keeps getting bitten by — `GET /health` returned a
correct 503 for six months and nothing asked; `deploy-drift` stayed green
through a total database outage because it polled an endpoint that never
touched the database. Reporting a vacuous pass would make this tool the next
one in that list.

## Scope, stated plainly

It verifies **only what is observable over plain HTTP from a GitHub runner
with no credentials.** It cannot see `startCommand`, `healthCheckPath`,
`plan`, `autoDeploy`, build settings, or environment variable values —
those still need a human against the dashboard. Overstating coverage would
be worse than not checking at all.

Natural extensions, if this proves useful: the SPA rewrite rule (request a
deep path, expect `index.html`) and `CORS_ORIGIN` (send an `Origin`, read
`Access-Control-Allow-Origin`) are both observable the same way.

## No pinned issue of its own

`tools/watchdog` already inspects every workflow with an `on.schedule`
trigger and reports a non-success conclusion into its own pinned issue. A
failure here is surfaced through that, rather than adding a **third** copy
of the GitHub-issue plumbing `db-health` and `deploy-drift` each already
carry. (`db-health`'s own header notes that duplication as worth
consolidating one day, as its own deliberate change. This declines to make
it worse.)

## What the first real run found

Run 1 (2026-09-20, `workflow_dispatch` on `main`) reported drift and exited
1, as designed. It also answered a question that could not be answered from
a sandbox with no egress, and that neither the docs nor the config could
settle — **what Render actually serves by default:**

```
/assets/*     declared: public, max-age=31536000, immutable
              live:     public, max-age=0, s-maxage=300
/index.html   declared: no-cache
              live:     public, max-age=0, s-maxage=300
```

That measurement **reverses the priority** these two rules were originally
given:

- **`/index.html` is already fine for browsers.** Render sends `max-age=0`,
  so browsers already revalidate before use — the "stale HTML references
  deleted hashed assets" failure is already prevented. `s-maxage=300` means
  the CDN may serve a five-minute-old `index.html` after a deploy, so
  `no-cache` closes a small window rather than fixing a live problem.
- **`/assets/*` is the rule worth having.** Content-hashed assets are served
  `max-age=0`, so every returning visitor revalidates every JS and CSS file
  on every page load. That is a real, entirely avoidable cost, and
  `immutable` is safe precisely because Vite hashes the filenames — a
  changed file is always a new URL.

This is the case for the tool in a single run: the docs said what Render
*supports*; only the check said what Render *does*.

## It is expected to be red until the dashboard catches up

The `tais-frontend` headers block exists in `render.yaml` but has **not**
been applied in the Render dashboard. Until it is, this workflow reports
real drift — which is the tool working, not a defect. Do not "fix" it in
code. It goes green when reality catches up:

Render Dashboard → **tais-frontend** → Settings → **Headers**

| Path | Name | Value |
| --- | --- | --- |
| `/assets/*` | `Cache-Control` | `public, max-age=31536000, immutable` |
| `/index.html` | `Cache-Control` | `no-cache` |
