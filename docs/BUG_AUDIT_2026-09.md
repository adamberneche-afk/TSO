# Codebase Bug Audit & Remediation Plan — 2026-09

Full deep-dive audit of the TSO/TAIS monorepo, run as five parallel deep-reads
(registry backend, core services + Rust RCRT service, CLI/SDK packages,
`tais_frontend`, CI/tooling). Every finding below was either confirmed by
actually running/building the code, or is unambiguous on read (marked per
item). This is a discovery + planning document — **nothing in this file has
been fixed yet** except where explicitly marked `[FIXED]`.

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

## Phase 0 — Stop the bleeding (do first, same day)

Small, contained, no dependencies on anything else in this plan. Several are
live security holes or actively broken scheduled jobs.

| # | Issue | Fix |
|---|---|---|
| P0.1 | `deploy.yml` deploys to **production** on every PR, not just push to `main` | Add `if: github.event_name == 'push'` |
| P0.2 | `health-report.yml`'s `permissions:` block implicitly sets `contents: none`, so checkout 403s every run | Add `contents: read` |
| P0.3 | `/api/v1/rcrt/*` trusts an unverified JWT payload and falls back to a `?wallet=` query param — unauthenticated device-token disclosure + takeover | Apply `authMiddleware`; require `req.user.walletAddress`, never trust client-supplied wallet |
| P0.4 | `/api/v1/memory/*` mounted with zero auth — any wallet's private agent memories readable/writable by anyone | Apply `authMiddleware` |
| P0.5 | `/admin/cron/*` fails **open** (not closed) when `CRON_SECRET` is unset | Fail closed: refuse to serve, or crash-on-boot if unset outside dev |
| P0.6 | Same fail-open pattern, `packages/registry/src/routes/cron.ts` (this is the same code as P0.5, listed once) | — |

---

## Phase 1 — Rebuild the safety net

Every fix after this phase needs a CI job to actually run its regression
test. Do this before Phase 2 so Phase 2+ fixes are provably permanent, not
just "looks right in this session."

| # | Issue | Fix |
|---|---|---|
| P1.1 | 10 of 11 workspace packages have zero CI coverage | Add a matrix/loop CI job: `npm install && npm run build --workspaces` at minimum; ideally per-package `test` where tests exist |
| P1.2 | `tais_frontend` has no `tsconfig.json`, no `@types/react`, never type-checked | Add tsconfig, install `@types/react`/`@types/react-dom`, add `"typecheck": "tsc --noEmit"`, wire into CI |
| P1.3 | `test.yml` lint job: eslint isn't installed, no config exists, always exits 127 | Either install+configure eslint for real, or remove the job until it's real |
| P1.4 | `test.yml` "build" job only checks `dist/index.js` exists, not that it runs | Add `node -e "require('./dist/index.js')"` or boot + curl `/health` |
| P1.5 | `tests/silent_errors.test.js` is tautological (asserts `typeof x === 'boolean'` on expressions that can only ever be boolean) — cannot fail | Delete it or replace with real assertions against actual repo code |
| P1.6 | `tests/e2e-hybrid-config.ts` (real, 30+ assertions) is never run — wrong extension for the `npm test` glob | Fix the glob or the extension, wire into CI |
| P1.7 | Coverage collected and uploaded but no threshold enforced | Add `coverageThreshold` to `jest.config.js`, `fail_ci_if_error: true` on Codecov step |
| P1.8 | `tools/watchdog/check.js` reports "all clean" if actionlint's output doesn't parse (wrong shape, panic, permission error) | If exit was non-zero and zero lines matched, flag every file instead of none |
| P1.9 | Watchdog can't detect a schedule that silently stopped firing (GitHub auto-disables workflows after 60 days idle) | Also check `workflow.state !== 'active'` via the Actions API, and flag runs older than ~2x the cron interval |
| P1.10 | `crates/rcrt-standalone` only builds in CI on a release tag, never on a PR | Add a `cargo build`/`cargo clippy` job on every PR touching `crates/**` |
| P1.11 | Rust service currently **panics on startup** — see Phase 2 — needs P1.10 to ever be caught again | (tracked here for sequencing; fix itself is P2.11) |

---

## Phase 2 — Critical: features that are 100% non-functional

Each of these makes a headline, advertised feature completely broken for
every user, every time — not an edge case.

| # | Area | Issue | Regression test to add |
|---|---|---|---|
| P2.1 | registry | OAuth/Agent API: tokens stored via non-deterministic CryptoJS encryption, looked up by re-encrypting — can never match. Every `/oauth/*` and `/agent/*` call 401s | Integration test: issue token → look it up → must succeed. Switch to SHA-256 hash lookup (mirror `apiKey.ts`'s correct pattern) |
| P2.2 | core | `calculateSkillHash` uses `JSON.stringify`'s replacer arg as if it were a sort function — every nested object flattens to `{}` (hash collisions), and the hash is computed over JSON containing the hash field itself (unsatisfiable fixed point) | Unit test: two manifests with different nested permissions must hash differently; a valid manifest must pass `verifyManifest` |
| P2.3 | core | `SandboxService`: vm2 configured with mutually-exclusive `allowAsync`+`fixAsync` — every skill execution throws `"Async not available"` | Unit test: execute a trivial async skill, assert success |
| P2.4 | core | `executeUnstake` calls `contract.ununstake` (typo) — unstaking permanently broken, `any`-typed so `tsc` didn't catch it | Unit/integration test against a mock contract asserting `unstake` is called |
| P2.5 | core/rust | `rcrt-standalone` panics on startup — axum 0.8 requires `{id}` path syntax, code still has `:id` | The service literally cannot boot; fix + add a "does it start and answer `/health`" smoke test, gated by P1.10 |
| P2.6 | frontend | `useWallet.ts` calls `registryClient.setWalletAddress()`, which doesn't exist — wallet login always throws after a successful sign+JWT issuance, and the token gets deleted in the catch | E2E/integration test of the connect flow; also add the missing tsconfig (P1.2) so this class can't recur silently |
| P2.7 | frontend | `Dashboard.tsx` renders 6 undefined lucide icons — opening any agent's detail modal crashes | Covered by P1.2 (tsc would catch this) + a render-smoke test on `AgentDetailModal` |
| P2.8 | frontend | Private RAG: encryption salt generated correctly, then dropped before upload — every private document permanently unrecoverable; also fires one MetaMask signature per chunk concurrently | Unit test: encrypt → upload → download → decrypt round-trip must succeed |
| P2.9 | frontend | Public RAG: `decryptResult()` does `JSON.parse` on plaintext document prose under a false comment — every search throws, uncaught | Unit test on `decryptResult` against a real encrypted-then-decrypted fixture |
| P2.10 | CLI/SDK | `rag-sdk`'s `exports` map has no `require`/`default` condition — every `sdk-assistant` command, including `--help`, crashes at require-time | Add `"require"` condition; smoke test: `node dist/index.js --help` exits 0, wired into P1.1 |
| P2.11 | CLI/SDK | `tais install` (the CLI's primary command) reads `analysis.risks`, a field renamed to `redFlags` on the producer side — crashes on every invocation | Integration test: `tais install <fixture-skill>` must succeed end-to-end |

---

## Phase 3 — Critical: exploitable security holes

| # | Area | Issue |
|---|---|---|
| P3.1 | registry | (covered in Phase 0 as P0.3/P0.4 — listed for completeness) |
| P3.2 | core | "Signatures" in `IsnadService`/`AuditRegistry` are unkeyed SHA-256 of public data — anyone can forge authorship attribution or forge a "malicious" audit report against a competitor's skill (permanent install-block) |
| P3.3 | core | Path traversal in skill install/uninstall — `manifest.name`/`skillName` reach `path.join` + `fs.writeFile`/`fs.rm(recursive,force)` with no validation, reachable from the Electron renderer |
| P3.4 | frontend | The "E2EE public/community" key is a hardcoded string constant compiled into the JS bundle (used as both PBKDF2 password and salt) — anyone with the bundle decrypts every "public" document; the stated privacy model is false |
| P3.5 | frontend | RAG API key is derived from signing a fixed, nonce-less string — deterministic ECDSA means any unrelated site that gets this signature can compute the same API key (phishable) |
| P3.6 | registry | `/monitoring` dashboard's DB health check is `return true` unconditionally — reports `overall: healthy` even with the database fully down; also unauthenticated outbound-email trigger and public Prometheus metrics dump |
| P3.7 | registry | `/admin/migration/fix-migration` (the break-glass migration-repair tool) 401s unconditionally for everyone including real admins — mounted outside the middleware chain that would populate `req.user` |
| P3.8 | registry | IDOR: `GET /enterprise/organization/:orgId` checks the org's admin wallet against a client-supplied query param instead of `req.user.walletAddress` |
| P3.9 | core | `NftService` points at a placeholder contract address (`0x1234...7890`) — NFT ownership checks always return false |

---

## Phase 4 — High: broken features & data integrity

Grouped by area; see the five full agent reports (this session's transcript)
for exact file:line and reproduction steps on each. Highlights:

- **registry**: fabricated `Math.random()` "memory alignment report" persisted to DB and emailed to real users as if it were analytics; guided-discovery session delete-authz bypassed by omitting the wallet field; unauthenticated RAG session-token disclosure via `/rag/session/active`; uncapped public search `limit`.
- **core**: `verifyMinThinkTokens` compares a formatted decimal string against raw base units — publisher gate blocks 100% of wallets; module-global `PromptCache` leaks one user's answers to another session; `finalizeProfile` hardcodes `genesis_nft_verified: true`; session cleanup wired with an `ipcMain.handle`/`ipcRenderer.send` mismatch — sessions leak until the app permanently refuses new interviews; entire signed-cache subsystem is dead from unawaited constructor calls (trust scores always compute to 0); `rcrt-standalone` persistence silently masks corruption as "empty" and then overwrites the original file with that empty state.
- **frontend**: settings save always reports failure (destructures a `wallet` field the hook never returns — the backend preferences PATCH has never once executed); `usePublicRAG` auto-fires wallet signature prompts on every Dashboard mount despite a code comment saying it shouldn't; failed upload leaks a `setInterval` forever; memory-context extraction silently no-ops for every user due to a variable-name typo swallowed by a generic catch; a rejected MetaMask popup silently destroys the user's encryption keypair (permanent data loss).
- **CLI/SDK**: `tais verify` reports PASSED for input that fails its own checks (security-verification CLI whose exit code is a no-op); three CJS integration packages (Notion/Slack/Linear) `require()` an ESM-only SDK and fail on the project's own Node version; `rag-sdk`'s public `createChunks()` hangs forever on `overlap >= chunkSize`; Notion integration burns an LLM call then writes hardcoded placeholder text into the user's real workspace.
- **CI/tooling**: `build.sh` swallows migration failures with `|| echo`; a production cron job has hit a 404 since it was written (wrong route prefix); a "set env vars" deploy step uses invalid CLI syntax masked by `|| true`.

Full itemized list preserved in the audit transcripts; promote each to its
own tracked issue as Phase 2/3 wraps up.

---

## Phase 5 — Medium/low cleanup & product decisions

Two categories that aren't really "bugs" so much as decisions:

1. **~3,200 lines of dead-but-real registry service code** (full YARA
   malware scanner never wired to the publish path, analytics API, CTO-agent
   API) plus the frontend's `MonitoringDashboard` (broken *and* orphaned).
   Decide per-item: wire it up for real, or delete it and the docs that
   describe it as live (`YARA.md` etc.) — per `DOCS_VS_CODEBASE.md`'s own
   framing, shipping docs that overclaim relative to code is the root
   credibility problem.
2. Everything else: dependency drift between packages sharing a library,
   dead/unused imports and dependencies, `npm audit` findings on transitive
   deps, Node-version drift across workflows vs `.nvmrc`, a dead invalid
   workflow file at the repo root, misleading heuristics in
   `health-analyzer.js`, an inert `prisma.config.ts` targeting the wrong
   Prisma major version.

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

_Generated by Claude Code, 2026-09-06 — five parallel deep-dive audits of
`packages/registry`, `packages/core` + `crates/rcrt-standalone`,
CLI/SDK packages, `tais_frontend`, and CI/tooling. Session:
[claude.ai/code/session_011JD9uEuXzzS29ZuUHWbwUX](https://claude.ai/code/session_011JD9uEuXzzS29ZuUHWbwUX)_
