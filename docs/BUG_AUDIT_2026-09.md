# Codebase Bug Audit & Remediation Plan — 2026-09

> **Status as of 2026-09-07: Phases 2, 3 (minus P3.9), 4, and 5 are
> complete; Phase 0 is entirely unfixed and Phase 1 has 4 open items.**
> This started as a discovery + planning
> document — every finding below was either confirmed by actually
> running/building the code, or is unambiguous on read — and was then
> worked phase-by-phase over several follow-up sessions on
> `claude/review-handoff-md-n90lsy`. **Read "Outstanding after this
> remediation pass" at the bottom before assuming this is done** — Phase 0
> in particular contains live, exploitable security holes that were never
> actually addressed, despite being labeled "do first, same day." Each
> completed fix shipped with a regression test verified against the
> pre-fix code (reverted → confirmed it failed → restored → confirmed it
> passed). See the ✅/❌ markers on each phase heading and the per-item
> status columns below for specifics, and `docs/DOCS_VS_CODEBASE.md` (also
> updated) for the resulting capability status.

Full deep-dive audit of the TSO/TAIS monorepo, run as five parallel deep-reads
(registry backend, core services + Rust RCRT service, CLI/SDK packages,
`tais_frontend`, CI/tooling).

**Read this alongside `docs/DOCS_VS_CODEBASE.md`** (what's built vs
aspirational) and `HANDOFF.md` (prior session's cleanup). This doc answers a
different question: of what's actually built and mounted, how much of it
actually works correctly?

## Why so much of this went unnoticed

This isn't ~90 unrelated bugs. It traces to two structural gaps, both
findings in their own right (see Phase 1):

1. **CI builds/tests only 2 of 11 workspace packages** (`packages/registry`,
   `tais_frontend`). `packages/core`, `cli`, `sdk-assistant`, `rag-sdk`,
   `types`, `agent-sdk`, and the three integration packages have never been
   built or run by any workflow. Dependabot still bumps their dependencies
   weekly regardless, because it follows the workspace root automatically.
2. **`tais_frontend` has no `tsconfig.json` at all** — `vite build` transpiles
   with esbuild and never type-checks. Six of its bugs are things a bare
   `tsc` run would have caught immediately (undefined identifiers, wrong
   hook return shape, wrong field names).

Fixing the safety net (Phase 1) is what makes every other fix in this plan
*stay* fixed — that's why it comes before the critical bug fixes, not after.

## Severity tally

| Area | Critical | High | Medium | Low |
|---|---|---|---|---|
| `packages/registry` | 5 | 5 | 8 | 1 |
| `packages/core` + `crates/rcrt-standalone` | 6 | 8 | 10 | 5 |
| `tais_frontend` | 4 | 7 | 9 | 5 |
| CLI/SDK packages | 2 | 5 | 7 | 4 |
| CI/CD + tooling | 2 | 8 | 10 | 6 |
| **Total** | **~19** | **~33** | **~44** | **~21** |

(~90 distinct findings, plus dead-code inventory. Exact counts are fuzzy at
the edges — some findings are two-line-item bugs bundled together.)

---

## Phase 0 — Stop the bleeding (do first, same day) — ❌ STILL ENTIRELY OPEN

**Re-verified 2026-09-07: every item in this phase is still unfixed in the
current codebase.** This phase was never actually started — the session
that produced this doc went straight to Phases 1-5 and never circled back.
Three of these six are live, exploitable security holes reachable on the
running server *right now*. This is the most important thing for whoever
reads this doc next to act on.

| # | Issue | Fix | Status |
|---|---|---|---|
| P0.1 | `deploy.yml` deploys to **production** on every PR, not just push to `main` | Add `if: github.event_name == 'push'` | ❌ **STILL OPEN** — `.github/workflows/deploy.yml` runs `vercel deploy --prebuilt --prod` on `pull_request` with no event-type guard |
| P0.2 | `health-report.yml`'s `permissions:` block implicitly sets `contents: none`, so checkout 403s every run | Add `contents: read` | ❌ **STILL OPEN** — permissions block is still `issues: read` only |
| P0.3 | `/api/v1/rcrt/*` trusts an unverified JWT payload and falls back to a `?wallet=` query param — unauthenticated device-token disclosure + takeover | Apply `authMiddleware`; require `req.user.walletAddress`, never trust client-supplied wallet | ❌ **STILL OPEN** — `routes/rcrt.ts`'s `extractWallet()` still base64-decodes the JWT payload with no signature check and falls back to a client-supplied wallet; `/rcrt` is mounted in `index.ts` with only rate limiting, no `authMiddleware` |
| P0.4 | `/api/v1/memory/*` mounted with zero auth — any wallet's private agent memories readable/writable by anyone | Apply `authMiddleware` | ❌ **STILL OPEN** — `index.ts` mounts `'/memory'` with `createMemoryBackupRoutes(...)` and nothing else |
| P0.5 | `/admin/cron/*` fails **open** (not closed) when `CRON_SECRET` is unset | Fail closed: refuse to serve, or crash-on-boot if unset outside dev | ❌ **STILL OPEN** — `routes/cron.ts`'s auth check is `if (expectedToken && authHeader !== ...) return 401`; an unset `CRON_SECRET` makes `expectedToken` falsy and skips the check entirely |
| P0.6 | Same fail-open pattern, `packages/registry/src/routes/cron.ts` (this is the same code as P0.5, listed once) | — | ❌ **STILL OPEN** (same code as P0.5) |

---

## Phase 1 — Rebuild the safety net — mostly done, 4 items still open

Every fix after this phase needs a CI job to actually run its regression
test. Re-verified 2026-09-07: P1.1-1.4, 1.8, 1.10 are fixed; **P1.5, 1.6,
1.7, and 1.9 are still open** (all coverage/quality-gate gaps, not
security holes).

| # | Issue | Fix | Status |
|---|---|---|---|
| P1.1 | 10 of 11 workspace packages have zero CI coverage | Add a matrix/loop CI job: `npm install && npm run build --workspaces` at minimum; ideally per-package `test` where tests exist | ✅ FIXED — `.github/workflows/build-all-packages.yml` builds all 11 workspace packages plus CJS/ESM smoke tests |
| P1.2 | `tais_frontend` has no `tsconfig.json`, no `@types/react`, never type-checked | Add tsconfig, install `@types/react`/`@types/react-dom`, add `"typecheck": "tsc --noEmit"`, wire into CI | ✅ FIXED — `tais_frontend/tsconfig.json` exists, `npm run typecheck` runs in `deploy.yml` |
| P1.3 | `test.yml` lint job: eslint isn't installed, no config exists, always exits 127 | Either install+configure eslint for real, or remove the job until it's real | ✅ FIXED — eslint is a real devDependency with a real config; `test.yml` has a dedicated `lint` job |
| P1.4 | `test.yml` "build" job only checks `dist/index.js` exists, not that it runs | Add `node -e "require('./dist/index.js')"` or boot + curl `/health` | ✅ FIXED — the job now boots the server and curls `/health` for a real response |
| P1.5 | `tests/silent_errors.test.js` is tautological (asserts `typeof x === 'boolean'` on expressions that can only ever be boolean) — cannot fail | Delete it or replace with real assertions against actual repo code | ❌ **STILL OPEN** — file is unchanged, still tautological |
| P1.6 | `tests/e2e-hybrid-config.ts` (real, 30+ assertions) is never run — wrong extension for the `npm test` glob | Fix the glob or the extension, wire into CI | ❌ **STILL OPEN** — root `package.json`'s `test` script still globs `tests/*.test.js` only; this file is `.ts` and still never runs |
| P1.7 | Coverage collected and uploaded but no threshold enforced | Add `coverageThreshold` to `jest.config.js`, `fail_ci_if_error: true` on Codecov step | ❌ **STILL OPEN** — neither exists yet |
| P1.8 | `tools/watchdog/check.js` reports "all clean" if actionlint's output doesn't parse (wrong shape, panic, permission error) | If exit was non-zero and zero lines matched, flag every file instead of none | ✅ FIXED |
| P1.9 | Watchdog can't detect a schedule that silently stopped firing (GitHub auto-disables workflows after 60 days idle) | Also check `workflow.state !== 'active'` via the Actions API, and flag runs older than ~2x the cron interval | ❌ **STILL OPEN** — `checkScheduledWorkflowRuns` only checks the last run's conclusion, never workflow state or staleness |
| P1.10 | `crates/rcrt-standalone` only builds in CI on a release tag, never on a PR | Add a `cargo build`/`cargo clippy` job on every PR touching `crates/**` | ✅ FIXED — `.github/workflows/rcrt-check.yml` |
| P1.11 | Rust service currently **panics on startup** — see Phase 2 — needs P1.10 to ever be caught again | (tracked here for sequencing; the fix itself is P2.5, below) | ✅ FIXED (see P2.5) |

---

## Phase 2 — Critical: features that are 100% non-functional — ✅ COMPLETE

Re-verified 2026-09-07: all 11 items fixed.

| # | Area | Issue | Status |
|---|---|---|---|
| P2.1 | registry | OAuth/Agent API: tokens stored via non-deterministic CryptoJS encryption, looked up by re-encrypting — can never match. Every `/oauth/*` and `/agent/*` call 401s | ✅ FIXED — switched to SHA-256 hash lookup, mirroring `apiKey.ts`'s correct pattern |
| P2.2 | core | `calculateSkillHash` uses `JSON.stringify`'s replacer arg as if it were a sort function — every nested object flattens to `{}` (hash collisions), and the hash is computed over JSON containing the hash field itself (unsatisfiable fixed point) | ✅ FIXED |
| P2.3 | core | `SandboxService`: vm2 configured with mutually-exclusive `allowAsync`+`fixAsync` — every skill execution throws `"Async not available"` | ✅ FIXED |
| P2.4 | core | `executeUnstake` calls `contract.ununstake` (typo) — unstaking permanently broken, `any`-typed so `tsc` didn't catch it | ✅ FIXED |
| P2.5 | core/rust | `rcrt-standalone` panics on startup — axum 0.8 requires `{id}` path syntax, code still has `:id` | ✅ FIXED — routes use `{id}`; `cargo build -p rcrt-standalone` succeeds |
| P2.6 | frontend | `useWallet.ts` calls `registryClient.setWalletAddress()`, which doesn't exist — wallet login always throws after a successful sign+JWT issuance, and the token gets deleted in the catch | ✅ FIXED — that call no longer exists; `connect()` uses `authApi` throughout |
| P2.7 | frontend | `Dashboard.tsx` renders 6 undefined lucide icons — opening any agent's detail modal crashes | ✅ FIXED — every icon used in `Dashboard.tsx` is imported and exists in the installed `lucide-react` version |
| P2.8 | frontend | Private RAG: encryption salt generated correctly, then dropped before upload — every private document permanently unrecoverable; also fires one MetaMask signature per chunk concurrently | ✅ FIXED |
| P2.9 | frontend | Public RAG: `decryptResult()` does `JSON.parse` on plaintext document prose under a false comment — every search throws, uncaught | ✅ FIXED |
| P2.10 | CLI/SDK | `rag-sdk`'s `exports` map has no `require`/`default` condition — every `sdk-assistant` command, including `--help`, crashes at require-time | ✅ FIXED — `require`/`import`/`types` conditions all present |
| P2.11 | CLI/SDK | `tais install` (the CLI's primary command) reads `analysis.risks`, a field renamed to `redFlags` on the producer side — crashes on every invocation | ✅ FIXED — CLI now reads `.redFlags` throughout, matching the producer |

---

## Phase 3 — Critical: exploitable security holes — ✅ COMPLETE except P3.9

All fixed 2026-09-07 except P3.9 (see below). Each shipped with a
regression test that was reverted to confirm it failed against the old
code, then restored — see commit history on `claude/review-handoff-md-n90lsy`.

| # | Area | Issue | Status |
|---|---|---|---|
| P3.1 | registry | (covered in Phase 0 as P0.3/P0.4 — listed for completeness) | see Phase 0 |
| P3.2 | core | "Signatures" in `IsnadService`/`AuditRegistry` are unkeyed SHA-256 of public data — anyone can forge authorship attribution or forge a "malicious" audit report against a competitor's skill (permanent install-block) | ✅ FIXED — real `ethers.verifyMessage`-backed signature verification (`packages/core/src/utils/signature.ts`); real end-to-end CLI wallet signing added (`packages/cli/src/utils/wallet.ts`, rewritten `audit.ts`), since none existed before |
| P3.3 | core | Path traversal in skill install/uninstall — `manifest.name`/`skillName` reach `path.join` + `fs.writeFile`/`fs.rm(recursive,force)` with no validation, reachable from the Electron renderer | ✅ FIXED — `SkillInstaller.ts` now validates against `SKILL_NAME_PATTERN` and checks path containment before every filesystem op |
| P3.4 | frontend | The "E2EE public/community" key is a hardcoded string constant compiled into the JS bundle (used as both PBKDF2 password and salt) — anyone with the bundle decrypts every "public" document; the stated privacy model is false | ✅ FIXED — built real server-side, authentication-gated encryption (`POST /api/v1/rag/community/{encrypt,decrypt}`); the old constant is now just a public PBKDF2 salt marker, with the real secret coming from `RAG_COMMUNITY_ENCRYPTION_KEY` (defaults to the old value so already-encrypted data stays decryptable) |
| P3.5 | frontend | RAG API key is derived from signing a fixed, nonce-less string — deterministic ECDSA means any unrelated site that gets this signature can compute the same API key (phishable) | ✅ FIXED — a random nonce is now embedded in the signed message every time |
| P3.6 | registry | `/monitoring` dashboard's DB health check is `return true` unconditionally — reports `overall: healthy` even with the database fully down; also unauthenticated outbound-email trigger and public Prometheus metrics dump | ✅ FIXED — real `SELECT 1` health check; whole router gated behind `authMiddleware` + `adminMiddleware` |
| P3.7 | registry | `/admin/migration/fix-migration` (the break-glass migration-repair tool) 401s unconditionally for everyone including real admins — mounted outside the middleware chain that would populate `req.user` | ✅ FIXED — `authMiddleware` added ahead of `adminMiddleware` on this mount |
| P3.8 | registry | IDOR: `GET /enterprise/organization/:orgId` checks the org's admin wallet against a client-supplied query param instead of `req.user.walletAddress` | ✅ FIXED |
| P3.9 | core | `NftService` points at a placeholder contract address (`0x1234...7890`) — NFT ownership checks always return false | **Explicitly deferred** — needs a real deployed contract address that can't be fabricated; not a code-logic bug |

---

## Phase 4 — High: broken features & data integrity — ✅ COMPLETE

Re-verified 2026-09-07, item by item (grouped by area, as originally
written):

- **registry**: fabricated `Math.random()` "memory alignment report" — ✅ FIXED, `computeAlignmentFactors` now derives every field from real Prisma queries. Guided-discovery session delete-authz bypass — ✅ FIXED, now requires and checks the owning wallet. Unauthenticated RAG session-token disclosure via `/rag/session/active` — ✅ FIXED, the response no longer includes the bearer credential. Uncapped public search `limit` — ✅ FIXED, capped at 100.
- **core**: `verifyMinThinkTokens` decimal/raw-unit mismatch — ✅ FIXED, both sides now parsed via `ethers.parseUnits` before comparing. Module-global `PromptCache` leak — ✅ FIXED, now an instance field. `finalizeProfile` hardcoded `genesis_nft_verified: true` — ✅ FIXED, now a real `nftService.verifyOwnership()` call. `ipcMain.handle`/`ipcRenderer.send` cleanup mismatch — ✅ FIXED, both sides now correctly use `invoke`/`handle`. Dead signed-cache subsystem (trust scores always 0) — ✅ FIXED, `calculateTrustScore` now fetches a live balance and persists the cache. `rcrt-standalone` masking corruption as empty — ✅ FIXED, an unparseable DB file is now backed up and loudly warned about instead of silently overwritten.
- **frontend**: Settings save always reporting failure — ✅ FIXED, no longer destructures a nonexistent field. `usePublicRAG` auto-firing wallet signature on mount — ✅ FIXED, opt-in via an explicit parameter, `Dashboard.tsx` opts out. Failed upload leaking a `setInterval` — ✅ FIXED, cleared on both the success and failure paths. Memory-context extraction typo — ✅ FIXED, `memoryInitializer.ts` declared `allTopics` but assigned `recentTopics` from an empty variable; now correctly assigns `data.conversations.recentTopics = allTopics.slice(0, 10)`. Rejected MetaMask popup destroying the keypair — ✅ FIXED, now throws instead of silently regenerating over an existing key.
- **CLI/SDK**: `tais verify` reporting PASSED incorrectly — ✅ FIXED, now computes `valid` from every individual check. Three CJS integration packages requiring an ESM-only SDK — ✅ FIXED, the SDK now exports a `require` condition. `rag-sdk`'s `createChunks()` infinite loop — ✅ FIXED, throws before looping when `overlap >= chunkSize`. Notion integration writing hardcoded placeholder text — ✅ FIXED, makes a real LLM call per section now.
- **CI/tooling**: `build.sh` swallowing migration failures — ✅ FIXED, `set -e` with no `|| echo` masking. Production cron job 404 (wrong route prefix) — ✅ FIXED, config now matches the real mount. Deploy step's invalid env-var CLI syntax — ✅ FIXED, corrected syntax with no `|| true` masking.

---

## Phase 5 — Medium/low cleanup & product decisions — ✅ COMPLETE

Two categories that weren't really "bugs" so much as decisions — both
resolved 2026-09-07:

1. **~3,200 lines of dead-but-real registry service code.** Decided
   per-item to wire up for real rather than delete, since each had a
   genuine live caller waiting on it:
   - **YARA malware scanner** — mounted at authenticated `POST /api/v1/scan`;
     wired into the skill-publish path (fetches package content from IPFS,
     scans it, blocks a `malicious` verdict with `403`). Along the way,
     found and fixed a broken `ipfs-http-client` dependency resolution (a
     stray `parse-duration` override pinned an ESM-only version, breaking
     every `require('ipfs-http-client')`) and a dead, always-500ing
     redundant NFT check on the same publish handler. `YARA.md` and
     `API.md` rewritten to match.
   - **Analytics API** — mounted at `/api/v1/analytics`; `POST /track` left
     open for anonymous SDK telemetry (now preferring an authenticated
     wallet over a client-submitted one when present), `GET
     /insights|summary|reports` gated admin-only.
   - **CTO-agent API** — mounted at `/api/v1/cto`. Mounting the router as
     originally written would have shipped a live IDOR (every endpoint
     trusted a client-submitted wallet or did no ownership check at all);
     closed that across every route, and built the previously-nonexistent
     `GET`/`POST /insights` (Community Knowledge Base) against the
     already-existing `CTOInsight` Prisma model.
   - **`MonitoringDashboard.tsx`** (frontend) — fixed the permanently-stuck
     loading spinner (`isLoading` was never set back to `false`). It
     remains orphaned (not linked from any route/nav) — whether to wire it
     into navigation is left as an undecided product question, out of
     scope for a bug fix.
   - `docs/DOCS_VS_CODEBASE.md` updated to reflect all of the above as
     BUILT rather than PARTIAL/NOT BUILT.
2. **Everything else**: `.nvmrc`/CI Node-version drift fixed (`20.19.0`,
   chosen to satisfy `eslint@^10`'s own engines range); dead invalid
   `issue-export.yml` at the repo root deleted; misleading/inverted
   heuristics in `health-analyzer.js` fixed (testing-status polarity,
   `extensibility` rendered as a raw count instead of a percentage, a
   safety-issue filter that could never match an unlabeled issue) and its
   report framing corrected to stop claiming to be a code-health scan;
   inert `prisma.config.ts` (targeting Prisma 6+, installed CLI is 5.22)
   removed. ethers v5→v6 migrated across `tais_frontend` to match every
   other package in the monorepo. Dependency drift/`npm audit` findings on
   other transitive deps were not otherwise pursued.

---

## How we know a fix stays fixed

Per-fix rule going forward, not just for this pass:

1. **Every fix ships with a test that would have caught the original bug**
   — unit test for logic bugs, integration test for cross-service bugs,
   smoke test for "does the process even start" bugs.
2. **That test must actually run in CI** — which is exactly what Phase 1
   is for. A regression test nobody runs is exactly how we got here
   (`tests/e2e-hybrid-config.ts` already exists and is already correct;
   it's just never executed).
3. **Where a whole class of bug slipped past tooling** (undefined
   identifiers past `tsc`, ESM/CJS mismatches past `tsc`, corrupted imports
   past `tsc`), the tooling gap itself is the fix, not just the instance —
   e.g. P1.2 (frontend type-checking) prevents recurrence of an entire
   category, not just findings P2.6/P2.7.

---

## Outstanding after this remediation pass

For anyone picking this up next, in priority order:

1. **Phase 0 (all 6 items)** — never actually started, and three of them
   (P0.3, P0.4, P0.5/P0.6) are live, exploitable security holes on the
   currently-running server. Do these first, same as the original plan
   said.
2. **P1.5, P1.6, P1.7, P1.9** — CI/quality-gate gaps (a tautological test,
   a real test that never runs, no coverage threshold, a watchdog blind
   spot). Lower severity, but each is exactly the kind of gap that let
   Phases 2-4's bugs go unnoticed for as long as they did.
3. A few incidental findings surfaced while re-verifying and updating docs
   during this pass, not yet independently tracked as their own items:
   `GET /api/v1/skills` doesn't implement the pagination or `trending`
   filter this doc's own `API.md` used to describe (see that file's
   current text for specifics), and `securityScannerService.ts` is a
   second, still-unwired regex-based scanner distinct from
   `yaraScanner.ts` (see `YARA.md`).

---

_Generated by Claude Code, 2026-09-06 — five parallel deep-dive audits of
`packages/registry`, `packages/core` + `crates/rcrt-standalone`,
CLI/SDK packages, `tais_frontend`, and CI/tooling. Session:
[claude.ai/code/session_011JD9uEuXzzS29ZuUHWbwUX](https://claude.ai/code/session_011JD9uEuXzzS29ZuUHWbwUX)_

_Remediation tracked here (Phases 2-5, minus the items marked open above —
Phase 0 and part of Phase 1 remain) done 2026-09-07 on a continuation of
the same session — see commit history on `claude/review-handoff-md-n90lsy`
for the fix-by-fix record._
