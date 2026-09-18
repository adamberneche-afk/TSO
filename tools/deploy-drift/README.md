# deploy-drift

Catches the gap between "what git says `main` should be running" and
"what's actually live" — the exact blind spot the 2026-09-18 relaunch
review hit: the "Deploy to Vercel" GitHub Action had been failing at its
auth step on every run since at least February, and nothing anywhere
would have told you that without someone happening to check by hand.

Ported from the same mechanism already proven in this account's
[KOS](https://github.com/adamberneche-afk/KOS) (`tools/deploy-drift/`),
Argoloth, and [Mothership](https://github.com/adamberneche-afk/Mothership)
(`scripts/deploy-drift.js`) repos — see KOS's own `tools/deploy-drift/README.md`
for the fullest writeup of the underlying idea and the incidents that shaped
it.

## Why this polls instead of pushing (the one real difference from KOS)

KOS's version pushes: a GAS project self-reports outward via
`repository_dispatch`, because most of its web apps sit behind Google's own
sign-in wall — an external poll never even reaches `doGet()`. That's not
true here. Neither Render nor Vercel puts anything in front of the plain
HTTP endpoints this repo already exposes:

- **Registry**: `GET /api/version` (`packages/registry/src/routes/version.ts`)
  — reads `RENDER_GIT_COMMIT`, which Render stamps automatically on every
  deploy, no config needed.
- **Frontend**: `GET /version.json`, a static file
  (`tais_frontend/scripts/write-version.cjs`, run as a `prebuild` step) —
  reads `VERCEL_GIT_COMMIT_SHA`, which Vercel stamps automatically at build
  time, falling back to `git rev-parse HEAD` for any other build context.

So this polls both directly on a schedule
([`.github/workflows/deploy-drift.yml`](../../.github/workflows/deploy-drift.yml))
instead of waiting to be told. One real consequence: **neither deployed
service needs to hold a GitHub token, or any credential at all**, for this
to work — the only credential anywhere in this mechanism is the ambient
`GITHUB_TOKEN` the workflow already gets from GitHub Actions itself. KOS's
whole per-project token-provisioning/threat-model section (Script
Properties being plaintext to anyone with editor access, scoping a PAT to
exactly one permission) simply doesn't apply here.

The other simplification that falls out of not needing a committed marker:
there's no `stamp.js`, no separate "commit the code, then commit the
marker as its own commit" ritual, and no self-reference exclusion to carry
in `expected-marker.js`. Both endpoints generate their reported SHA fresh,
at build/runtime, from whatever the hosting platform stamps on that
specific build — nothing about the value is itself tracked in git.

## How it works, end to end

1. **[`tools/deploy-drift/expected-marker.js`](./expected-marker.js)** —
   pure, no network: given a service name, runs `git log` scoped to that
   service's paths (`tools/deploy-drift/services.js`) and returns the SHA
   of the most recent commit that touched any of them.
2. **[`.github/workflows/deploy-drift.yml`](../../.github/workflows/deploy-drift.yml)**
   runs on a schedule (and `workflow_dispatch` for a manual check).
3. **[`tools/deploy-drift/check.js`](./check.js)** polls each service's
   live version endpoint, compares the reported SHA against what
   `expected-marker.js` says should be live, and publishes the result: on
   a match with no open tracking issue, no-op; on a match that closes an
   existing open issue, closes it with a resolution comment; on drift (or
   on a live endpoint that couldn't be reached / reported nothing usable),
   opens or updates a pinned `Deploy drift: <service>` issue (label
   `tso-deploy-drift`).

A drift finding right after a real push is expected and not itself a
problem — Render/Vercel's own build-and-deploy takes a little while. It
self-resolves on the next scheduled run once the platform catches up. A
finding that persists across several runs is the real signal.

## Adding a third deployable

Add an entry to `tools/deploy-drift/services.js`'s `SERVICES` map
(`versionUrl` + `gitPaths`) and give it its own version-reporting route or
build step, matching either `routes/version.ts` (a live Node service) or
`write-version.cjs` (a static build) depending on what it is. Nothing else
needs to change — `expected-marker.js` and `check.js` both iterate the map.

## What this deliberately does not do

No path exists here for CI, this repo, or an agent session to push or
promote a deploy — only to poll two already-public URLs and read/write
GitHub issues. Fixing drift, once found, is still a human (or the
platform's own auto-deploy) actually getting the right code live — the
same boundary KOS's own deploy-drift explicitly protects.

## Testing

- `tests/tools/deploy-drift-expected-marker.test.js` — the git-log
  wrapper, scoped per service.
- `tests/tools/deploy-drift-check.test.js` — evaluate/publish logic, with
  an injectable `fetchImpl` (same convention `tools/watchdog/check.js`
  already uses) so no test makes a real network call.
- `packages/registry/src/__tests__/routes/version.test.ts` — the registry's
  own `/api/version` route.
