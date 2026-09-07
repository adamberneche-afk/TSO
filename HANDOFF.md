# TSO Handoff — 2026-09-06

Session summary for whoever (human or Claude) picks this project up next. This
file is the bridge between "TSO was abandoned, is it worth reviving" and
whatever gets decided next — read this before re-reading the whole repo.

> **Session closed out — 2026-09-07, end of day.** Everything below this box
> and the "Update — 2026-09-07" box right under it is historical narrative
> from earlier in this multi-day effort; read this box first, it supersedes
> both for "what's the current state" purposes.
>
> **All work is merged to `main`** (squash-merged as PR
> [#2020](https://github.com/adamberneche-afk/TSO/pull/2020), commit
> `903c102`). `docs/BUG_AUDIT_2026-09.md` — the full 5-way deep-dive audit —
> is completely closed out: **Phases 0 through 5 are all done, `P3.9`
> excepted** (a placeholder NFT contract address that needs a real deployed
> contract; see that doc's Phase 3 table). `docs/DOCS_VS_CODEBASE.md` is
> current (16 BUILT / 3 PARTIAL / 5 NOT BUILT of 24). Both were re-verified
> against actual running code multiple times this session, not just trusted
> from memory or commit messages — a dedicated cross-check pass late in the
> session found and fixed 6 further stale doc spots elsewhere in the repo
> (`TESTING.md`, this file's own then-current "verdict" section,
> `packages/registry/API.md`, `tais_frontend/README.md` and
> `IMPLEMENTATION.md`) that had drifted after earlier fixes landed.
>
> **Two things a fresh session should pick up first:**
>
> 1. **`.github/workflows/test.yml` ("Test and Build") and `deploy.yml`
>    ("Deploy to Vercel") are still `disabled_manually`**, since
>    2026-08-24 — confirmed still disabled as of this handoff. `test.yml` is
>    the workflow with the registry's actual Jest suite, lint, and build
>    jobs; nothing has run it for real via GitHub Actions in the ~2 weeks
>    before this session, and PR #2020 above merged without it running at
>    all (only CodeQL and a couple of doc-check workflows fired). The user
>    asked to re-enable them, but no tool available this session wraps
>    GitHub's enable-workflow endpoint — re-enabling needs the GitHub web UI
>    (Actions tab → workflow → "···" menu → Enable workflow) or `gh workflow
>    enable "Test and Build"` / `"Deploy to Vercel"` run by someone with
>    real `gh` access. **Once re-enabled, don't just trust it's green** —
>    verify the next real run actually passes, since it hasn't been
>    exercised in a while and this session's own merge (which included a
>    real, previously-latent `ipfs-http-client` ESM-vs-CJS break, see below)
>    is proof that "nothing's touched this in weeks" isn't the same as
>    "nothing would break."
> 2. **Three CodeQL alerts on `crates/rcrt-standalone/src/main.rs` (lines
>    163/167, alert IDs #42/#43/#44)** — "Uncontrolled data used in path
>    expression". Investigated on PR #2020: the only external input feeding
>    the flagged `fs::write`/`fs::rename` calls is the `HOME`/`APPDATA` env
>    var used to resolve the app's own local data directory (standard
>    desktop-app pattern, equivalent to `os.homedir()`); every path
>    *suffix* joined onto it is a hardcoded literal, so there's no
>    attacker-suppliable filename or `../` component reachable through this
>    code. Full reasoning is on the PR's review threads (now marked
>    resolved there) — but resolving a PR conversation thread is not the
>    same as dismissing the underlying code-scanning alert, so these may
>    still show as **open** in the repo's Security → Code scanning tab.
>    Worth a look to formally dismiss them ("won't fix" / false positive)
>    if the reasoning holds up, rather than leaving them looking
>    unaddressed to whoever next opens that tab.
>
> **Smaller things worth knowing, not blocking anything:**
> - `main` had moved 4 commits (3 Dependabot bumps + a weekly issue-export
>   chore) between when this branch was cut and when PR #2020 merged. One
>   of those bumps, `ipfs-http-client` 55→60, is a real breaking change
>   disguised as routine (60.x is pure ESM, no CJS build at all) — it was
>   crashing 22 of 26 registry test suites on load before being fixed (see
>   `packages/registry/src/services/ipfs.ts`'s comment for the fix: a
>   native dynamic `import()` constructed via `new Function(...)` so
>   TypeScript's CJS compilation target can't downlevel it back to a
>   `require()` that would crash on the ESM-only package). Worth watching
>   for the same class of surprise on any *other* dependency bump that
>   looks routine but changes a package's module format.
> - The `adamberneche-afk/Tais` repo (separate from this one) was checked
>   this session too: its own `claude/review-handoff-md-n90lsy` branch is
>   already identical to its `main` (0 ahead/behind) — nothing pending
>   there, no action needed.
>
> **A fresh session picking this up**: read `docs/BUG_AUDIT_2026-09.md`,
> `docs/DOCS_VS_CODEBASE.md`, and this box, in that order, before the rest
> of this file — the sections below (including the next "Update —
> 2026-09-07" box) describe earlier points in this same multi-day effort
> and are kept for continuity, not as current status.

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
> both now stale; see `docs/DOCS_VS_CODEBASE.md`'s current 16/3/5 of 24.

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

_Closed out 2026-09-07 across several follow-up passes on session
[claude.ai/code/session_011JD9uEuXzzS29ZuUHWbwUX](https://claude.ai/code/session_011JD9uEuXzzS29ZuUHWbwUX)
— see the "Session closed out" box at the top of this file, and commit
history on `main` (PR #2020) and `claude/review-handoff-md-n90lsy` for the
fix-by-fix record._
