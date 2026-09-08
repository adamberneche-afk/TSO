# TSO Handoff — 2026-09-06

Session summary for whoever (human or Claude) picks this project up next. This
file is the bridge between "TSO was abandoned, is it worth reviving" and
whatever gets decided next — read this before re-reading the whole repo.

> **Update — 2026-09-07:** The follow-up session this handoff called for
> happened. `docs/BUG_AUDIT_2026-09.md` (a full 5-way deep-dive audit) was
> written and then worked phase-by-phase — every phase is now fully done
> (every finding fixed except `P3.9`, a placeholder NFT contract address
> that needs a real deployed contract). That includes
> the "disconnected trust/security layer" called out below as untouched:
> **YARA-style skill scanning, usage analytics, and the CTO Agent are now
> wired up for real** (mounted, authenticated, and — where mounting the
> code as originally written would have shipped an IDOR — access-control
> holes closed as part of the same fix). A re-verification pass initially
> found that **Phase 0 had never actually been started** — three live,
> exploitable security holes on the running server
> (`/api/v1/rcrt`'s unverified-JWT wallet fallback, `/api/v1/memory`'s
> complete lack of auth, `/admin/cron`'s fail-open behavior when
> `CRON_SECRET` is unset) — and that was fixed immediately after being
> found. A second follow-up pass then closed out Phase 1's 4 remaining
> CI/quality-gate items (a tautological test, a real test that never ran,
> no coverage threshold, a watchdog blind spot for silently-disabled
> scheduled workflows) plus two incidental findings from the same pass
> (`POST /rcrt/audit`'s forgeable `ownerId`, and a dead duplicate env
> validator). A third pass then closed the last two incidental findings
> (`GET /api/v1/skills`'s dead `trending` param and missing pagination,
> and `securityScannerService.ts`'s PII detector — now wired into
> `POST /api/v1/scan` as an advisory-only signal). **Phases 0 through 5
> are now all complete** (`P3.9` excepted), with nothing left open. See
> `docs/BUG_AUDIT_2026-09.md` and
> `docs/DOCS_VS_CODEBASE.md` (also updated) for current, accurate status;
> treat "The verdict" and "What was cleaned up" / "not done" sections
> below as the record of *that* session, not the current state of the
> repo — in particular, the specific claim under "The verdict" that
> `routes/scan.ts` is a hardcoded fake never imported into `index.ts`,
> and the "12 of 23 / 6 PARTIAL / 5 not built" capability counts, are
> both now stale; see `docs/DOCS_VS_CODEBASE.md`'s current 18/2/4 of 24.
>
> **Update — 2026-09-08:** Follow-up session, scoped specifically to
> `docs/DOCS_VS_CODEBASE.md`'s remaining **PARTIAL** rows (6/7/9 as they
> stood then — trust score/audit submission, the standalone SDK, and the
> CLI's `audit`/`verify`), not a general continuation of the bug audit.
> `POST /api/v1/audits` now exists for real (it didn't before — only
> `GET` was ever implemented) with real ECDSA signature verification and
> a real `Skill.trustScore` computation (`services/trustScore.ts`) that
> actually changes from community audit history instead of sitting at a
> static default forever; `tais audit`/`tais verify <hash>` and
> `packages/sdk`'s non-Electron path (`checkMalicious`/`install`/
> `submitAudit`) all now call the registry over HTTP instead of
> simulating success locally or returning a hardcoded value regardless
> of reachability. Also found and fixed, because it silently blocked
> every one of this session's own new tests from running in CI: the
> "test" job in `.github/workflows/test.yml` set a 15-character
> `JWT_SECRET`, and `AuthService` rejects anything under 32 — so `npm
> test` never got past importing the app in that job, for *any*
> registry test, e2e suites included (the "build" job's smoke test
> already used a long-enough one; "test" just never got the same fix).
> Also added a real `packages/sdk` test suite (there wasn't one) and
> wired `packages/core` and `packages/cli`'s existing real test suites
> into `build-all-packages.yml`, which built them but never ran their
> tests — `packages/core`'s suite is the one covering the path-traversal
> and hash-collision regression tests from the 2026-09-07 pass, so those
> were silently not running in CI either. **Deliberately not touched:**
> a real multi-party provenance chain (still just the flat audit list),
> sandbox enforcement on the live server, and the $THINK
> staking/tier/subscription layer (per the standing recommendation
> against building that out) — see `docs/DOCS_VS_CODEBASE.md` rows 6, 8,
> 18-19. Also not touched: the same "build but never test" gap this
> session fixed for `core`/`cli`/`sdk` still applies to `rag-sdk`,
> `agent-sdk`, `notion-integration`, `slack-integration`, and
> `linear-integration` (all have real `test` scripts — jest or vitest —
> that `build-all-packages.yml` never calls); worth a follow-up pass but
> out of scope for this one.
>
> **Update — 2026-09-08 (follow-up):** That last gap is now closed —
> `build-all-packages.yml` runs all five packages' real test suites too.
> Along the way: `agent-sdk`'s test file had never actually run (two
> `require('../src/client')` calls that can't resolve under vitest's ESM
> loader, taking down the whole suite) and, once fixed, exposed three
> real bugs the never-run suite had been hiding -- `getAuthorizationUrl`
> awaited incorrectly (masking a wrong assertion elsewhere in the same
> test), and `TAISAgent` was missing `getAccessToken()`/`clearTokens()`
> entirely (added, symmetric with the existing `setTokens()`/
> `getTokens()`). `slack-integration` and `linear-integration` had a
> `"test": "jest"` script with zero test files and no jest/ts-jest
> devDependency at all -- `npm test` failed outright with "No tests
> found" before this pass added a real jest config plus a first,
> deliberately-minimal (not exhaustive) real test suite for each,
> covering their pure/deterministic logic (JSON-parse-with-fallback,
> task-line parsing, priority mapping) with the Slack/Linear SDK clients
> mocked. **Still not done:** re-enabling `.github/workflows/test.yml`
> itself (`Test and Build`, which runs `packages/registry`'s own ~142-test
> suite against a real Postgres service) -- it's disabled at the GitHub
> Actions level (a repo-admin toggle in Settings → Actions → Workflows),
> not something a code change can flip; needs a human with repo admin
> access. No `docs/DOCS_VS_CODEBASE.md` capability changed status this
> pass -- this was CI/test infrastructure only.

## TL;DR

TSO was abandoned mid-August 2026, buried under its own automation, not
because the product failed. This session did two things: **(1)** answered
"is it worth returning to" — yes, narrower scope, deliberately — and
**(2)** cleared the operational debt that was making the repo unreadable
(closed ~1,762 spam issues, fixed 3 dead CI workflows, triaged 17
Dependabot PRs). The repo is now in a state where a real decision about
next steps can actually be made by looking at it. That decision itself
— what to build next, if anything — has **not** been made yet; that's
the "establish our way forward" the next session is for.

## The verdict: is TSO worth reviving?

**Yes, but only with a deliberate scope cut — not a resume-where-it-left-off.**

The product core is more real than "abandoned side project" implies. A
prior audit in the repo (`docs/DOCS_VS_CODEBASE.md`) cross-checked every
claimed capability against actual code:

- **12 of 23 capabilities are BUILT and wired up**: wallet-based auth, the
  on-chain skill registry, a genuinely functional guided-discovery agent
  builder, private + public RAG, OAuth-based cross-app agent portability,
  and a real RCRT local-sync layer (Rust/Axum binary + Electron shell).
  This is a working full-stack platform, not vaporware.
- **6 are PARTIAL — built but never connected**: YARA-style skill security
  scanning, trust-score computation, audit submission, and a whole "CTO
  Agent" assistant all have real implementation code that's simply never
  mounted into the running server (`routes/scan.ts` returns a hardcoded
  fake "clean" result; the scan router isn't even imported in `index.ts`).
- **5 were designed but never built at all**, most importantly the entire
  **$THINK token staking/tier/subscription monetization layer** — two
  detailed engineering docs, zero corresponding code in the web platform.

So: a real MVP exists, wrapped in a lot of aspirational documentation that
overclaims relative to the code. Treat `docs/DOCS_VS_CODEBASE.md` as the
source of truth over `archive/outdated/NORTH_STAR.md` and the various PRD
docs under `docs/`, which are now actively misleading about what exists.

**Why it was abandoned** looks like a process/tooling problem, not a
product one — see "What was cleaned up" below. That problem is now fixed,
which is exactly why the revival decision can be made cleanly from here
rather than from underneath a pile of noise.

**If reviving**: pick one thin vertical slice of what's already BUILT
(the RAG + agent builder is the strongest candidate — genuinely working,
no fictitious economics attached) and ship it standalone. Drop the
token/staking/tier vision entirely rather than half-building it further.
This is a real project-scoping decision for the next session, not
something this session decided for you.

## What was cleaned up this session

### 1. Issue tracker: 1,987 issues → 1 open
An automated "CTO Hub" integration had been firing every ~10 minutes
against an endpoint with no real code context (no diff, no file
contents, just `{owner, repo, mode}`), so its LLM hallucinated a
plausible-looking "bug + patch" every run and filed it as an issue — none
referencing code that actually exists in this repo. Over ~4 months this
produced ~1,974 such issues.
- The automatic schedule was **already disabled** by a prior session
  (see `.github/workflows/call-hub.yml`'s header comment) — it's now
  `workflow_dispatch`-only.
- This session **bulk-closed the ~1,762 open backlog issues** (`state_reason:
  not_planned`, no per-issue comment to avoid spamming watchers).
- **Issue #2010** (`TSO Scheduled-Job Watchdog`) is the only one left open
  — it's real, automated, and legitimate (see below).

### 2. Three dead scheduled workflows, fixed and merged (PR #2011)
Daily Health Report, Weekly Insights, and (per the watchdog's own
actionlint pass) `call-hub.yml` had all been red for weeks:
- `scripts/health-analyzer.js` queried the GitHub API for repo owner
  `"amberneche-afk"` — missing "ad" — so every run 404'd. It also
  `require()`s `@octokit/rest`, which was never an actual dependency
  anywhere in the workspace. Both fixed.
- `health-report.yml` unconditionally ran `npx prisma generate` even
  though the script never touches Prisma and no `schema.prisma` exists at
  repo root. Removed.
- `weekly-insights.yml` built its curl target from `${{ secrets.RENDER_URL
  }}`, a secret that was never set, instead of the hardcoded env var two
  lines below that the curl command never referenced — producing an
  unparseable relative URL every run. Fixed, plus added
  `--fail-with-body` so a bad response actually fails the job.
- `call-hub.yml`: quoted `$GITHUB_OUTPUT` per the shellcheck finding the
  watchdog had already surfaced.

All merged to `main` in PR #2011. **Watch the next scheduled runs** of
Daily Health Report (`0 7 * * *`) and Weekly Insights (`0 9 * * 1`) to
confirm they're actually green now — they were verified locally
(`health-analyzer.js` now correctly targets `adamberneche-afk/TSO`) but
not by an actual scheduled run yet as of this handoff.

The watchdog (`tools/watchdog/check.js`, weekly Tuesday 06:00 UTC,
issue #2010) exists specifically to catch this class of problem in the
future — a workflow file silently going invalid, or a scheduled run
silently failing, with nothing else noticing. Leave it running.

### 3. 17 Dependabot PRs triaged
There is **no CI that exercises a dependency bump** in this repo — PRs
only get a Vercel preview-deploy status check, nothing that would catch a
broken `require()` or a failed `cargo build`. So each PR was checked by
hand rather than merged on trust:

**Merged (10)** — low-risk patch/minor bumps, or verified safe by actually
building against them locally:
`#2009` codecov-action, `#2005` ethers (patch), `#2004` semver/@types-semver,
`#2003` actions/setup-node, `#2002` actions/upload-artifact,
`#2001` actions/checkout (had to resolve a merge conflict between these
three action-version PRs — done, see git history),
`#1999` base64 0.22→0.23 (Rust — **verified** with `cargo build`),
`#1998` axum 0.7→0.8 (Rust — **verified** with `cargo build`),
`#1994` @radix-ui/react-radio-group (minor), `#1995` @types/dompurify.

**Left open, with an explanatory PR comment on each (7)** — major
version bumps to code with no safety net:
- `#2008` chalk 4→6 — drops CJS support; this repo's CLI/registry/sdk
  packages are CommonJS
- `#2007` ipfs-http-client 55→60 — its own changelog flags breaking changes
- `#2006` @sentry/node 7→10 — full API rewrite, and this PR alone would
  leave `@sentry/tracing@7` mismatched against it
- `#2000` rand 0.8→0.10 — **verified this one actually breaks the
  build**: `cargo build` fails, `rand::thread_rng()` no longer exists
- `#1997` lucide-react 0.575→1.33 — icon component API changed at 1.0
- `#1996` zod 3→4 — breaking changes to a library this app uses for
  central config validation (`config-schema.ts`)
- `#1993` vite 6→8 — two-major-version bump of the build tool, plugin
  versions not bumped in lockstep

These 7 need someone to actually run the affected package locally against
the new version before merging — don't merge them on a green Vercel check
alone, that check doesn't cover this.

## What was *not* done (deliberately out of scope for this session)

- **No feature work.** Nothing was built, no vertical slice was shipped.
  This session was cleanup + a go/no-go read, not implementation.
- **The 7 risky Dependabot PRs above are still open**, waiting on someone
  to verify them against the actual affected code.
- **No decision was made on which vertical slice to build**, if any. The
  recommendation (RAG + agent builder) is a starting suggestion, not a
  commitment.
- **The disconnected trust/security layer** (YARA scanning, trust scores,
  the orphaned CTO Agent) was documented but not touched — deciding
  whether to wire it up, rip it out, or leave it dormant is a real
  decision for whoever scopes the next phase.
- **Tais repo** (the separate `adamberneche-afk/Tais` repo) is a much
  smaller, mostly-empty Figma Make export — noted during the review but
  not otherwise acted on this session.

## Where things stand as of this handoff

- **Open issues**: 1 (`#2010`, the watchdog — legitimate, leave it)
- **Open PRs**: 7 (the risky Dependabot bumps listed above)
- **`main`** includes PR #2011 (the workflow fixes) as of commit `0bf1a74`
- **This session's branch** (`claude/tso-codebase-review-m5ip7q`) has been
  reset to latest `main` after PR #2011 merged, per this repo's own branch
  policy (a merged PR's branch can't be stacked on further — see
  repo-level instructions) — a fresh session starting new work should
  either continue on this branch (already at `main` tip) or cut a new one.

## Key documents to read next, in this order

1. `docs/DOCS_VS_CODEBASE.md` — the capability-level ground truth (BUILT
   vs PARTIAL vs NOT BUILT), cross-checked against actual source
2. This file
3. `lessons.md` — prior debugging lessons (unsafe property access, wallet
   race conditions, Prisma gotchas) if doing further engineering
4. `ai_decision_log.json` — terse log of prior automated debug/hunt/refactor
   decisions, mostly superseded by this session's cleanup but kept for
   continuity
5. Skip `archive/outdated/NORTH_STAR.md` and the `docs/*PLAN.md` /
   `docs/*PRD.md` files as authoritative — they describe the vision, not
   the code, and are now known to overclaim (see #1 above)

---
_Generated by Claude Code, 2026-09-06 — session
[claude.ai/code/session_01MhivLABzq6q9UZvHqyyZCx](https://claude.ai/code/session_01MhivLABzq6q9UZvHqyyZCx)_
