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
>
> **Update — 2026-09-12:** `test.yml` got re-enabled (the blocker above
> was a repo-admin toggle, not code) and a follow-up pass fixed what its
> first real runs since being disabled exposed: a missing `@think/types`
> build step (and the regression introduced fixing that -- a scoped
> `npm ci` inside a workspace member pruning the hoisted root
> `node_modules`), missing `ADMIN_WALLET_ADDRESSES`, three e2e fixture
> files (`agent`/`oauth`/`billing`) that never actually completed real
> auth so their "tests" only ever exercised a 401, a Codecov step failing
> the whole job over a missing token unrelated to test results, and a
> flaky `packages/core` test caused by five services firing an unawaited
> async file write from their constructor. Also fixed two pre-existing
> `tais_frontend` typecheck errors that had kept `deploy.yml` red since
> February (a dead `openapi-types` import; a zod `.default({})` typing
> gap with an existing object schema). Then, asked to work `docs/
> DOCS_VS_CODEBASE.md` rows 6 and 8: **built the real multi-party
> provenance chain row 6 was still missing** -- a persisted
> `ProvenanceLink` table (author/auditor/voucher roles, real per-link
> ECDSA signatures, a new open-to-any-wallet `POST /api/v1/provenance/
> :skillHash/vouch`), `Skill.provenanceScore` computed with the same
> weighted/time-decayed formula `IsnadService` already used locally, and
> `tais verify --provenance`/a new `tais vouch` command wired to the real
> chain instead of a hardcoded mock. Row 6 is now **BUILT**. For row 8,
> **considered and declined** extending sandbox enforcement to the live
> registry server: the server has no skill-execution endpoint at all
> today (only static YARA scanning), and `vm2` (`SandboxService`'s
> engine) has been EOL since 2023 with known, unpatched sandbox-escape
> CVEs -- an acceptable-ish risk for a CLI sandboxing skills a user chose
> to install locally, not for a network-reachable code-execution surface
> on shared production infrastructure. Row 8 stays **local/CLI-only by
> design** -- add this to the standing recommendation below alongside the
> $THINK layer: don't build live skill execution on the server without
> first replacing `vm2` with an actually-maintained isolation mechanism.
> Also found, not fixed (unrelated, pre-existing, out of scope for the
> row-6 PR it surfaced in): `schema.prisma`'s `GitHubToken` model has no
> corresponding migration, so any code path touching it
> (`services/githubToken.ts` is real, wired-up code) 500s against a
> database built purely from migration history. `docs/
> DOCS_VS_CODEBASE.md` now stands at **19 BUILT · 1 PARTIAL · 4 NOT
> BUILT** of 24 (the 18/2/4 figure a few paragraphs above is stale,
> preserved as the 2026-09-08 update's own point-in-time record).
>
> **Update — 2026-09-12 (follow-up):** Asked to work row 14 (App-level
> RAG / Enterprise RAG). Split it: **App RAG is now BUILT for real.** A
> new `rag:read` OAuth scope reuses the exact same app-registration and
> authorize/approve/token-exchange flow already built for row 10 (Cross-
> App Agent Portability) -- no new OAuth system needed, and the existing
> `OAuthAuthorize.tsx` consent screen needed zero changes since it
> already renders whatever scopes an app requests generically. The
> harder question -- how does a third-party app decrypt anything, given
> RAG documents are supposed to be E2EE -- turned out to already be
> answered by an earlier session's fix: "community" (`isPublic: true`)
> documents are encrypted with a single server-held key, not a per-
> wallet one (`services/communityCrypto.ts`, extracted from
> `routes/rag.ts`'s `/community/encrypt`/`/decrypt`, which already
> proved this out), so the server can legitimately decrypt on an
> authorized app's behalf the same way it already does for the owning
> wallet's own browser session -- no new key-wrapping/sharing crypto
> required. New `GET /api/v1/agent/rag` (registry) and
> `TAISAgent.getRagDocuments()` (`@think/agent-sdk`) do exactly that.
> Deleted `tais_frontend/src/services/rag/appRAGAuth.ts` and its types
> along the way -- real-looking OAuth2/PKCE code, but backwards: it
> assumed TAIS connects *out* to each third-party app's own OAuth/RAG
> server, the wrong direction for "third-party dev SDK," and was never
> imported anywhere except its own barrel re-export. **Enterprise RAG
> got a real, migrated data model** (`Organization`/`OrganizationMember`
> roles, an `organizationId` on `RAGDocument`) and nothing else --
> deliberately: unlike App RAG, there's no existing multi-tenant/org
> infrastructure anywhere in this schema to reuse, so building routes,
> an invitation flow, and a UI against untested product decisions (who
> can create an org, how org documents get encrypted/access-checked)
> would have meant guessing at requirements rather than reusing proven
> plumbing. See `docs/ENTERPRISE_RAG_DATA_MODEL.md` for the full design
> and the specific open question (org-document encryption/access
> boundary) a real build-out still needs to answer. `docs/
> DOCS_VS_CODEBASE.md` now stands at **19 BUILT · 2 PARTIAL · 3 NOT
> BUILT** of 24.
>
> **Update — 2026-09-12 (follow-up):** Asked to work row 22 (Agent
> marketplace / skill publishing wizard / web+desktop deployment) --
> another row bundling several different-sized asks, so it got the same
> split treatment as row 14. **Skill publishing is now BUILT for real.**
> The backend route (`POST /api/v1/skills`) already worked and already
> scanned every submission (row 5); what didn't exist was any UI calling
> it. Building that UI surfaced that the one API-client method that
> already targeted this endpoint (`registryClient.publishSkill`) had
> never actually been exercised end-to-end: it sent `{ data: skillData }`
> as the request body when `api.post`'s second argument *is* the body
> (so the server always received a body with none of the expected top-
> level fields), and its `CreateSkillDTO` type was missing two fields
> (`author`, `manifestCid`) the server's Zod schema requires while
> misnaming a third (`categories` instead of `categoryIds`) -- meaning
> every real call would have 400'd regardless of whether a UI existed.
> Both bugs are fixed alongside the new `PublishSkillForm.tsx`, which
> gates on a connected, NFT-verified wallet and surfaces the server's
> real error (e.g. "Publishing skills requires a THINK Genesis NFT or
> Publisher NFT") instead of the old toast-only stub that claimed the
> feature "requires $THINK token staking" (it doesn't -- that was stale
> copy; the actual gate is a Publisher/Genesis NFT, per
> `middleware/nftAuth.ts`). **Agent Marketplace got a real, migrated data
> model** (`AgentListing` -- one curated public listing per
> `AgentConfiguration`, status mirroring `Skill`'s own moderation states)
> and nothing else, deliberately, for the same reason Enterprise RAG
> stopped at its data model: no existing browsable/listed "Agent" concept
> exists anywhere in this schema to build routes/UI against, so this
> designed and tested the foundation rather than guessing at moderation
> and browse-UI requirements. See `docs/AGENT_MARKETPLACE_DATA_MODEL.md`.
> **Web agent deployment and desktop app packaging were left NOT BUILT,
> deliberately** -- the wizard's "Web Agent"/"Desktop App" cards
> (`InterviewWizard.tsx`) are still disabled "Coming soon" placeholders.
> Making either real means committing to actual infrastructure (live
> hosting compute for the former, code-signing certificates and a release
> pipeline for the latter) that this pass correctly declined to
> unilaterally commit this codebase to -- add this to the standing
> recommendation below alongside the $THINK layer and row 8's vm2
> decision: don't build live agent hosting or ship desktop installers
> without a real infrastructure/ops decision behind it first. API
> endpoint generation (a per-agent invocable HTTP API) also remains NOT
> BUILT and undesigned -- genuinely small on its own (it could reuse the
> existing `/agent/chat` logic scoped to one `AgentConfiguration`), just
> not in scope for this pass. `docs/DOCS_VS_CODEBASE.md` now stands at
> **19 BUILT · 3 PARTIAL · 2 NOT BUILT** of 24.
>
> **Update — 2026-09-13:** Asked to build out row 14's remaining
> Enterprise RAG half (org CRUD, invite-only membership, role-gated
> management, org-scoped RAG document routes), with one explicit
> constraint: no blockchain infrastructure -- an enterprise member should
> never need to install or manage a crypto wallet. Three ways to remove
> that requirement were weighed (a real server-custodied wallet keypair;
> an outsourced embedded-wallet vendor like Privy/Web3Auth; a fully
> parallel non-wallet identity system touching every `walletAddress`-keyed
> table and auth middleware) before landing on the one actually built: a
> deterministic, non-signable pseudo-address derived from an email/
> password account (`services/emailIdentity.ts`), satisfying every
> existing `walletAddress` column and the JWT pipeline with zero changes
> anywhere else -- no private key ever exists, nothing is custodied,
> nothing touches a chain. See `docs/ENTERPRISE_RAG_IDENTITY.md` for the
> full design writeup and the reasoning against the other two options.
> Built: `EmailIdentity`/`PasswordResetToken`/`OrganizationInvitation`
> Prisma models (their own migration, `20260913225431_enterprise_rag_
> email_identity`); org CRUD, invitation create/preview/accept, member
> list/role-change/remove (`routes/orgs.ts`); email login/forgot/reset-
> password (`routes/emailAuth.ts`); `routes/rag.ts`'s document upload and
> delete extended to accept/moderate org-scoped documents, resolving the
> org-document encryption/access-boundary question `docs/
> ENTERPRISE_RAG_DATA_MODEL.md` had deliberately left open, as its own
> option (a) -- app-layer `OrganizationMember` checks over the existing
> community-key encryption, no new crypto needed. Full e2e coverage of
> the invite -> accept -> login -> role-gated-action lifecycle. Also
> fixed, because it was blocking a clean migration for this work: a
> pre-existing, unrelated schema-drift bug flagged in the 2026-09-12
> update above but not fixed there -- `GitHubToken` was a real, migrated-
> looking model in `schema.prisma` with no actual migration ever
> generated for it -- given its own dedicated migration
> (`20260913220000_add_github_tokens`) rather than folded into this
> feature's. **Deliberately not built:** a `tais_frontend` UI -- every
> route above is real and tested at the API level, but nothing is
> clickable yet; this is genuinely the one remaining gap for row 14.
> SSO/SAML/OIDC was also deliberately left out of scope, as a distinct,
> materially larger effort layered on top of the same
> `OrganizationMember` model rather than a prerequisite for it. `docs/
> DOCS_VS_CODEBASE.md`'s BUILT/PARTIAL/NOT BUILT counts are unchanged (row
> 14 stays PARTIAL, now solely for the missing UI) -- see its row 14 and
> the updated narrative paragraph for the detail.
>
> **Update — 2026-09-13 (same-day follow-up):** Asked to build the
> frontend UI for the Enterprise RAG work above. Built, under
> `tais_frontend/src/app/components/enterprise/`: email sign-in/forgot/
> reset-password screens with no wallet-connect button anywhere; the
> invitation-accept landing page an invite email's link points at; an
> org dashboard (member list with role change/removal and an
> invite-by-email form, both gated to owner/admin, plus a document
> panel: list, share, view/decrypt, delete); and an admin-only
> org-provisioning screen -- the one part of this feature that
> legitimately still uses the existing wallet-connect flow, since
> creating an org is a platform-admin action. `useEnterpriseAuth.ts`/
> `enterpriseAuthApi.ts` deliberately parallel `useWallet.ts`/`authApi.ts`
> rather than reusing them (restoring a session here never checks
> `window.ethereum`), but store the JWT under the exact same
> `localStorage` keys the wallet flow uses, so every existing API call
> in the app already attaches it unchanged. Document upload/view
> deliberately bypasses `services/rag/publicRAGClient.ts` (which
> requires a connected wallet just to derive its encryption key) for the
> existing `POST /rag/community/encrypt`/`/decrypt` endpoints instead --
> the community-key design the data model doc already settled on needs
> no wallet at all. Needed one small backend addition once the UI
> exposed the gap: `GET /api/v1/orgs` ("which org(s) is the caller a
> member of" -- there was no way to answer that after a plain login,
> only right after accepting an invitation), plus extending
> `GET /:orgId/rag/documents` to include the ciphertext/iv/salt a
> member's client needs to decrypt-on-view. All of it e2e/unit-tested (5
> new backend assertions, 16 new frontend tests) and verified against a
> real build (`tsc --noEmit`, `vite build`, both clean) -- not just typed
> and hoped for. **Row 14 is now fully BUILT**; `docs/DOCS_VS_CODEBASE.md`
> now stands at **20 BUILT · 2 PARTIAL · 2 NOT BUILT** of 24. **Found,
> not fixed:** while building this, `authApi.ts`'s wallet-signature
> login and most of `oauthApi.ts` turned out to double-wrap their
> request bodies as `{ data: {...} }` when `api.post`'s second argument
> *is* the body -- the exact bug row 22's `registryClient.publishSkill`
> fix (above) already found and fixed once, apparently never
> generalized to the rest of the API client. This session's own new
> code deliberately doesn't repeat it, but did not fix the pre-existing
> instances: doing so blind, with no real browser/MetaMask available in
> this environment to verify a wallet-login fix against, is a
> materially riskier change than this pass's scope -- and wallet login
> is the platform's *primary* auth path, so a blind fix that's subtly
> wrong would be worse than leaving it flagged. See `docs/
> ENTERPRISE_RAG_IDENTITY.md`'s "Found, not fixed" section; this is
> worth a dedicated follow-up session with real end-to-end verification.
>
> **Update — 2026-09-14:** Asked to "put the skills marketplace
> together" -- interpreted as row 22's Agent Marketplace half (the
> actual named PARTIAL capability; there's no separately-tracked "skill
> marketplace" concept, and skill publishing itself was already BUILT).
> Built on top of the existing, migrated `AgentListing` data model:
> `routes/agentListings.ts` (public browse/search, create/update/
> withdraw a listing, an install flow), moderation added to
> `routes/admin.ts` mirroring the existing Skill block/unblock/verify
> pattern exactly (approve/reject/suspend, each requiring a reason), and
> a `tais_frontend/src/app/components/marketplace/` UI (browse grid with
> an Install button, a "My Listings" publish/edit/withdraw panel, an
> admin moderation queue). Resolved the three open questions
> `docs/AGENT_MARKETPLACE_DATA_MODEL.md` had left open: who can list an
> agent (whoever already owns the configuration -- no new gating needed,
> since creating an `AgentConfiguration` at all already requires THINK
> NFT ownership); what "installing" means (copying the configuration
> into the installer's own, reusing the existing, already-tested
> `saveConfiguration()` rather than any live-hosting concept, which
> stays properly out of scope alongside row 22's other undecided
> infrastructure pieces); what moderating a listing checks (an
> application-layer human judgment call, not a scanning engine -- a
> listing has no executable content the way a Skill package does).
> Added one small endpoint neither this nor the pre-existing Skill
> moderation flow had before: `GET /admin/agent-listings?status=`, a
> real moderation queue -- both `GET /skills` and `GET /agent-listings`
> had only ever hardcoded `status: 'APPROVED'` for public browsing, with
> no way for an admin to discover what's waiting on a decision except
> already knowing an id. Editing an approved listing now resets it to
> `PENDING` for re-review. Verified against a real Postgres instance and
> a real frontend build, not just typed: `tsc --noEmit` and `vite build`
> both clean on both packages, 34/34 backend test suites (205/205
> tests, 6 new for this pass) and 12/12 frontend test files (48/48
> tests, 7 new) all passing. `docs/DOCS_VS_CODEBASE.md`'s counts are
> unchanged (20 BUILT · 2 PARTIAL · 2 NOT BUILT) -- row 22 stays PARTIAL,
> now solely for its still-undecided web-deployment/desktop-packaging/
> API-generation pieces, which this pass deliberately left alone for the
> same reason row 8's `vm2` decision did: no infrastructure commitment
> (hosting compute, code-signing certificates) should be made
> unilaterally.
>
> **Update — 2026-09-14 (follow-up):** Asked to fix the `{ data: {...} }`
> double-wrapping bug flagged (not fixed) above, as a final pass before
> merging. It turned out to be far more widespread than that flag
> described: not just `authApi.ts` and most of `oauthApi.ts`, but also
> `rcrtApi.ts`/`kbApi`/`grantApi` (7 calls), `configApi.ts`'s
> `saveConfiguration`/`updateConfiguration`, `memoryAPI.ts`'s cloud
> backup, and one inline call each in `PlatformSettings.tsx` and
> `GoldTierDashboard.tsx` -- 23 call sites across 8 files, all sending
> `{"data": {...}}` to routes that do a plain `const { x } = req.body`,
> reading every field as `undefined`. The worst of these:
> `configApi.saveConfiguration` is the actual save call behind the
> product's core "answer 7 questions, save your agent" flow
> (`GuidedDiscoveryWizard.tsx`/`ConfigPreview.tsx`) -- it 400'd with
> "Configuration name cannot be empty" on every real attempt, and
> `updateConfiguration` (Dashboard.tsx's agent editor) the same way.
> `oauthApi`'s wallet-signature OAuth flows (register app, approve
> authorization, sandbox creation/tokens, enterprise org upsert) were
> similarly broken wherever `OAuthAuthorize.tsx`/`DeveloperPortal.tsx`
> actually called them -- not dead code, live and broken. Fixed all 23
> by sending the intended object directly (`api.post`'s second argument
> already *is* the body -- no wrapper needed), plus one call
> (`updatePermissionScopes`) that was also missing its `scopes` key
> entirely under the wrapper. Two call sites remain non-functional for
> an unrelated, separate reason found along the way and deliberately not
> fixed: `rcrtApi.refreshToken`/`scanContent` call
> `POST /api/v1/rcrt/{refresh,scan}`, and no such route exists anywhere
> in `packages/registry` -- a 404 regardless of body shape. Building
> those routes is new backend work, not a wrapping fix, and neither
> method is called anywhere in the live app today (verified by
> search), so left as a documented gap rather than invented here.
> Verified, not just typed: `tsc --noEmit` and `vite build` both clean,
> and 19 new regression tests (`authApi.test.ts`, `configApi.test.ts`,
> `oauthApi.test.ts`, `rcrtApi.test.ts`) each asserting the exact flat
> body now sent, on top of the existing 48 (67/67 total, 16/16 files).
> Backend untouched by this pass -- still 34/34 suites, 205/205 tests.
> `docs/ENTERPRISE_RAG_IDENTITY.md`'s "Found, not fixed" section (the
> origin of this flag) should be read as resolved by this update rather
> than edited to remove the finding -- the record of what was found and
> why it was deferred stays accurate; this note is where the resolution
> lives.
>
> **Update — 2026-09-18:** Sprint-planned the path from "code is ready" to
> a confirmed live deployment, then started the recon (Sprint 0) and
> repo-only infrastructure-truth work (Sprint 1) from that plan. This
> session has no network egress to Render or Vercel's dashboards, so
> everything below is what's determinable from GitHub's own record --
> confirming the database/service are actually still alive, applying
> migrations, and taking a backup all still need a human with dashboard
> access before this goes further.
>
> **Recon finding:** every run of `.github/workflows/deploy.yml`'s
> `deploy` job on `main`, back through the oldest one still in Actions
> history (2026-02-24), has failed at the `vercel pull` step --
> completing in under a second, consistent with a missing or invalid
> `VERCEL_TOKEN` secret or a project that's no longer linked. The `test`
> job passes every time; only the push to Vercel fails. Two explanations
> both fit `taisplatform.vercel.app` having been live in `docs/
> E2E_TEST_REPORT.md`: either Vercel's own native Git integration deploys
> independently of this workflow (making this workflow a broken,
> redundant duplicate), or it's the only deploy path and the frontend has
> not received a single CI-driven deploy since at least February --
> meaning roughly seven months of merges to `main`, Enterprise RAG and
> the Agent Marketplace included, may never have reached production.
> **Needs a human with Vercel dashboard access to tell which** -- this
> session cannot reach vercel.com to check.
>
> **Also found, reading source rather than docs, while building the env
> reference below:** `render.yaml`'s `CORS_ORIGIN: "*"` cannot be what
> the live Render service is actually running with -- `config/cors.ts`
> treats `CORS_ORIGIN` as a literal comma-separated origin list, not a
> wildcard, so a literal `"*"` would reject every real browser origin
> outright rather than allow all of them, which contradicts `docs/
> E2E_TEST_REPORT.md`'s own recorded CORS results against a real frontend
> origin. `render.yaml` was already known to be documentation rather than
> the live config source (per `DEPLOYMENT.md`); this confirms the drift
> extends to values that would break the service if actually applied, not
> just cosmetic ones. Separately: `services/githubToken.ts` falls back to
> a **hardcoded** encryption key (visible in this repo's own source)
> whenever `GITHUB_TOKEN_ENCRYPTION_KEY` is unset, and no deployment doc
> or `render.yaml` revision has ever provisioned that variable -- given
> `GitHubToken`'s migration (`20260913220000_add_github_tokens`) is now
> live per the 2026-09-13 update above, this is a real, current gap if
> that code path is reachable in production, not a theoretical one. And
> `MONITORING.md`'s documented `REDIS_URL`/Upstash caching layer has zero
> matches for `REDIS` anywhere in `packages/registry/src` despite
> `ioredis` being a listed dependency -- the doc describes wiring that
> either never happened or was since removed; treat it as unverified
> rather than working until someone traces it further.
>
> **Fixed this pass (repo-only -- nothing deployed or touched outside
> GitHub):** `render.yaml`'s placeholder `repo:` URL; `CORS_ORIGIN` set to
> the one known production frontend origin, flagged pending dashboard
> confirmation; `IPFS_ENABLED` set to `false` (its credentials were never
> actually provisioned, so it was silently erroring rather than working,
> per `docs/E2E_TEST_REPORT.md`'s own "IPFS: error" finding) with
> `ENABLE_IPFS_STORAGE`/`ENABLE_FIAT_PAYMENTS` flagged as read nowhere in
> `packages/registry/src` as of this pass. Added `packages/registry/
> .env.production.example`, built by grepping every `process.env.*`
> reference in `packages/registry/src` directly rather than transcribing
> the four docs (`DEPLOYMENT.md`, `PREFLIGHT.md`, `MONITORING.md`,
> `render.yaml`) that had each drifted into their own partial list --
> `GITHUB_TOKEN_ENCRYPTION_KEY` called out there as effectively required,
> not optional.
>
> **Not done, deliberately, pending human dashboard access:** confirming
> the Render service/Postgres and Vercel project are still alive on the
> intended plan; applying pending Prisma migrations and taking a backup;
> everything in the later sprints (a real predeploy CI gate, a fresh E2E
> report, Sentry/alerting/Redis wiring, the Render tier upgrade, and the
> seven still-open Dependabot PRs). None of it is safe to do blind
> against infrastructure this session cannot reach or confirm is still
> the live target.
>
> **Update — 2026-09-18 (same-day follow-up):** Continued the relaunch
> plan into Sprint 4 (dependency hardening) -- the one sprint fully
> reachable from GitHub access alone, no dashboard needed. Re-triaged all
> 13 currently-open Dependabot PRs by actually merging each into a local
> scratch branch and building/testing it (`cargo build` for Rust,
> `tsc`/`npm test` for TypeScript), rather than trusting either the
> original 2026-09-06 triage or the PRs' own stale `mergeable_state`.
>
> **Merged (8), each verified clean first:** `uuid` 1.26.0→1.26.1 and
> `actions/cache` 4→6 (both already based on current `main`, GitHub's own
> `mergeable_state: clean` matched local verification); `dotenv`
> 16.6.1→17.4.2 (`packages/registry` `tsc` build clean once `@think/types`
> was built and `prisma generate` run -- the same two-step bootstrap
> `test.yml` needed per the 2026-09-08 update above); `@radix-ui/react-
> progress`/`react-dialog`/`react-label` and `tailwind-merge` (all four:
> `tais_frontend` typecheck clean, 16/16 test files, 67/67 tests); and
> `electron` 25.9.8→44.2.0 (`packages/core` `tsc --noEmit` clean, 7/7
> suites, 29/29 tests -- flagged in the merge itself that this only
> exercises typecheck/unit tests, not an actual packaged-app launch, so a
> real desktop smoke test is still worth doing before trusting this fully
> given the 19-major-version jump).
>
> **Left open (5), each with a comment giving the current, re-verified
> reason -- not just re-stating the 2026-09-06 notes:**
> - `rand` 0.8→0.10 -- `rand::thread_rng()` (removed in 0.10) is still
>   live in `crates/rcrt-standalone/src/main.rs`, and the PR now also has
>   a real merge conflict in that same file.
> - `chalk` 4→6 -- confirmed via `tsconfig.json` (`"module": "commonjs"`)
>   and all 8 `import chalk from 'chalk'` sites in `packages/cli/src`
>   that chalk 5+'s ESM-only build would break `require()` at runtime,
>   not just in theory; also now conflicted in 4 files.
> - `@sentry/node` 7→10 -- `monitoring/sentry.ts` calls `configureScope`,
>   removed in Sentry SDK v8; `@sentry/tracing@7` (folded into core in
>   v8) would ship mismatched regardless. Needs an actual rewrite against
>   the current SDK surface, which this session can't verify without
>   network access to the package's real v10 API -- not safe to guess at
>   for an error-tracking integration.
> - `typescript` 5.9.3→7.0.2 -- monorepo-wide (root + every workspace
>   member), two major versions at once, and the branch is stale enough
>   that its own diff pulls in unrelated deletions of files added to
>   `main` since its base commit. Deserves a dedicated, rebased pass, not
>   a blind merge.
> - `vite` 6→8 -- **worse than risky:** merging this PR as it stands
>   would silently *downgrade* `ethers` 6→5, `lucide-react` 1.33→0.575,
>   and `zod` 4→3, and *delete* `@testing-library/react`/`jsdom`/
>   `vitest` and the `typecheck`/`test` npm scripts from `tais_frontend/
>   package.json` entirely -- an artifact of how stale the branch has
>   become, unrelated to vite's own compatibility, which was never
>   actually re-evaluated because the diff makes it moot. Commented
>   recommending the PR be closed and Dependabot asked to recreate it
>   fresh against current `main`, rather than continuing to leave this
>   specific stale PR open.
>
> No repo file changed by this pass except this entry -- the 8 merges
> were direct PR merges via GitHub, not commits pushed to any working
> branch. Sprints 0-3's dashboard-gated items (confirming Render/Vercel/
> Postgres are alive, applying migrations, monitoring wiring, the Render
> tier upgrade) remain exactly as blocked as the update above describes.
>
> **Update — 2026-09-18 (second follow-up):** Reviewed this account's KOS
> and Mothership repos (separate Google Apps Script projects, unrelated to
> TSO's own product) specifically for their deployment-integrity tooling,
> and ported the one piece TSO didn't already have: `deploy-drift`. TSO's
> own `tools/watchdog/check.js` turned out to already be a port of a KOS
> tool (its header says so -- "Ported from the same watchdog already
> running in this account's KOS, Argoloth, and Mothership repos"), and is
> in fact the most advanced of the three (it added workflow-active-state
> and cron-staleness detection KOS's original lacks). `deploy-drift` is
> the other half of that same family: it catches the gap between "what
> git says `main` should be running" and "what's actually live" -- the
> exact blind spot the first 2026-09-18 update above hit (the "Deploy to
> Vercel" Action failing silently at auth since February, with nothing
> anywhere that would have surfaced that on its own).
>
> KOS's version pushes -- a GAS project self-reports its version outward
> via `repository_dispatch`, because most of its web apps sit behind
> Google's own sign-in wall and an external poll never reaches them. That
> constraint doesn't exist here, so this polls instead, which turns out to
> be a real simplification, not just a port: no committed marker file, no
> "commit the code, then commit the marker as a separate commit" ritual,
> and neither deployed service needs to hold a GitHub token of any kind --
> the only credential anywhere in the mechanism is the workflow's own
> ambient `GITHUB_TOKEN`.
>
> Built: `GET /api/version` on the registry (`routes/version.ts`, reading
> `RENDER_GIT_COMMIT`, which Render stamps automatically -- no config
> needed); a `prebuild` step on the frontend
> (`tais_frontend/scripts/write-version.cjs`) that writes a static
> `public/version.json` from `VERCEL_GIT_COMMIT_SHA` (falling back to
> `git rev-parse HEAD`), served at `/version.json` since Vercel's
> filesystem routes win over the SPA catch-all rewrite; `tools/
> deploy-drift/` (`services.js`, `expected-marker.js`, `check.js`,
> `README.md`) polling both hourly
> (`.github/workflows/deploy-drift.yml`) and managing one pinned `Deploy
> drift: <service>` issue per service, same update-in-place pattern
> `tools/watchdog/check.js` already uses. 19 new regression tests
> (`tests/deploy-drift.test.js`, injectable fetch/exec, no real network or
> git-history dependency) plus 5 for the registry route
> (`packages/registry/src/__tests__/routes/version.test.ts`, run against a
> real local Postgres with all 26 migrations applied) -- 39/39 across the
> root suite, registry `tsc` build clean, frontend `vite build` verified
> to actually produce and copy `version.json` into `dist/`, workflow file
> passes `actionlint`.
>
> **Not verified: whether this actually reports correctly against the
> real live Render/Vercel deployments.** This session still has no network
> egress to either dashboard or either live URL -- everything above is
> tested with injected fakes, which proves the logic but not the real
> integration. First real signal arrives whenever `deploy-drift.yml` next
> runs on `main` (hourly) or someone triggers it via `workflow_dispatch`;
> if both services are actually live and current, expect a clean run with
> no issues opened. If `tais-frontend` comes back `unreachable` or drifted,
> that's likely confirmation of the still-open question from the first
> 2026-09-18 update: whether Vercel's deploys have truly been broken this
> whole time, or its native Git integration has been deploying
> independently of the failing Action.
>
> **Update — 2026-09-18 (third follow-up):** Ported one more piece of
> KOS/Mothership's deployment tooling: `doctor` -- Mothership's
> `scripts/doctor.js`, which exists because `GLOBAL_GITHUB_TOKEN` was found
> silently invalid through 5 straight scheduled runs and a spoke had been
> failing 100+ runs on a secret that was never set, both checkable in
> under a second by something that actually asked. TSO's version
> (`tools/doctor/check.js`, `.github/workflows/doctor.yml`,
> `tests/doctor.test.js`) checks the four GitHub Actions secrets this repo's
> workflows actually reference (`grep -rhoE "secrets\.[A-Z_0-9]+"
> .github/workflows/*.yml`, not guessed): `VERCEL_TOKEN` gets a real,
> read-only validity probe (`GET https://api.vercel.com/v2/user`) --
> the one thing in this file that can actually confirm the exact failure
> `deploy-drift`'s still-open question is pointing at, rather than
> inferring it from a failing build step three layers away.
> `VERCEL_URL`/`VERCEL_BYPASS_TOKEN` (call-hub.yml's target -- TSO turns
> out to be a registered Mothership spoke, confirmed by reading
> call-hub.yml's own `POST ${VERCEL_URL}/api/autonomous_agent` call
> against Mothership's real `api/autonomous_agent.js`) and `CRON_SECRET`
> (weekly-insights.yml's auth to `/admin/cron/weekly-insights`) get
> presence-only checks, deliberately not exercised live -- both guard a
> real side effect (a live Mothership agent review; a real weekly-insights
> email), so firing either just to validate a secret would trade one
> problem for a worse one. `workflow_dispatch`-only, no schedule, same
> reasoning `tools/watchdog/check.js` and Mothership's own `doctor.yml`
> already give: adding a *scheduled* job here risks the exact
> failing-silently-unwatched failure mode this tool exists to catch.
>
> Verified for real: 13 new tests (`tests/doctor.test.js`, injectable
> fetch, no real network dependency) plus a live local run against the
> real `api.vercel.com` with a deliberately garbage token, which came back
> a real `403` end-to-end -- not just asserted against a mock. Root suite
> now 52/52. Workflow file passes `actionlint`.
>
> `coverage-gaps` (scheduled-job test-coverage) and a narrow `doc-currency`
> (catching a doc that names a function/route no longer in source) are the
> two KOS/Mothership concepts flagged as worth adapting next but not yet
> built -- see the conversation this pass came from for the full reasoning
> on each.
>
> **Update — 2026-09-18 (fourth follow-up):** Ported `coverage-gaps`.
> KOS's version answers "was this Apps Script trigger handler's body ever
> entered", using V8 coverage instrumentation over files loaded into a vm
> sandbox -- a real trick needed only because GAS has no module system.
> TSO's scheduled-job scripts are ordinary Node modules with a real
> `require()` graph, so the same underlying question ("does this
> unattended, scheduled script have any real safety net at all") is
> answerable by resolving that graph directly -- no coverage
> instrumentation needed. `tools/coverage-gaps/check.js` discovers its own
> target set from source (every `node <script>.js` a `schedule:`-triggered
> workflow actually invokes -- currently `tools/deploy-drift/check.js`,
> `scripts/health-analyzer.js`, `tools/watchdog/check.js`), rather than a
> hand-maintained list that could itself go stale.
>
> **It found a real, live gap on its first real run, not a synthetic one:**
> `scripts/health-analyzer.js` (health-report.yml, daily) had a genuine
> test file -- `scripts/__tests__/health-analyzer.test.js`, 6 passing
> tests covering the exact inverted-heuristic bugs a previous session
> fixed -- but root `package.json`'s `"test": "node --test
> tests/*.test.js && ..."` only glob-expands files directly inside
> `tests/`, so those 6 tests have never once run as part of `npm test`.
> Same underlying failure class this repo already lived through twice
> (health-analyzer.js's own repo-owner typo going unnoticed for months;
> `JWT_SECRET` blocking every registry test for weeks) -- this time a
> human had already done the work of writing the safety net, and nothing
> wired it in. **Fixed in the same pass**, not just flagged: moved the
> file to `tests/health-analyzer.test.js` (matching every other root-level
> tool's test location) and corrected its now-relative require path.
> `npm test`'s `node --test` count went from 52 to 58 as a direct result.
>
> Push/PR-gated (`.github/workflows/coverage-gaps.yml`), not scheduled --
> unlike `watchdog`/`deploy-drift`/`doctor`, this checks static config, not
> live state, so the right moment to catch a regression (a new scheduled
> script shipping with no wired-in test) is before merge, not on a clock.
>
> Verified: 20 new tests (`tests/coverage-gaps.test.js`, real temp-file
> fixtures over mocks where a real filesystem made the test more honest),
> a real run against this actual repo (not just synthetic fixtures) both
> before the fix (correctly flagged the orphaned file, exit 1) and after
> (clean, exit 0). Root suite 78/78. Workflow passes `actionlint`.
>
> A narrow `doc-currency` (catching a doc that names a function/route no
> longer in source) remains the one flagged-but-unbuilt concept from the
> original KOS/Mothership review.
>
> **Update — 2026-09-18 (fifth follow-up):** Ported `doc-currency` --
> narrowly, as flagged: only KOS's check 1 (a doc names a backticked
> function/file gone from source), not the full 14-check version built for
> an Apps Script codebase's addendum files and blocked-GCP-surface prose.
> `tools/doc-currency/check.js` checks two things: a backticked,
> slash-containing file path that doesn't exist anywhere in the repo, and a
> backticked bare `identifier(...)` call that appears nowhere in actual
> code (any occurrence counts, not just a declaration -- if a name is truly
> gone, it won't appear anywhere, including at a call site).
>
> **The first real run found ~90 apparent findings, and nearly all of them
> were a bug in the tool, not the docs.** This repo's own convention is to
> cite a file relative to its own package's `src/` (a doc under
> `packages/registry/` writing `` `routes/skills.ts` `` to mean
> `packages/registry/src/routes/skills.ts`), not the monorepo root --
> resolving only against repo root flagged the large majority of
> `docs/DOCS_VS_CODEBASE.md`'s own citations, every one of them a real,
> current file once traced by hand. Fixed by accepting a path-boundary-safe
> SUFFIX match against any real file in the repo, not just an exact
> root-relative one -- the same "false conflict on every run is how a check
> gets muted" reasoning `gas-lint`'s own column-map check already
> documents. Also excluded, beyond KOS's own CHANGELOG/HISTORY precedent:
> any doc filename containing a 4-digit year (a point-in-time snapshot,
> same signal as an explicit CHANGELOG name) and `docs/*_PLAN.md`/
> `*_PRD.md` -- HANDOFF.md's own "Key documents to read next" section
> already names these as non-authoritative vision docs, in this repo's own
> words, honored here rather than re-derived.
>
> One tool bug found along the way and fixed: the file-existence check was
> built on the same `EXCLUDE_DIRS` list used to decide which docs/code to
> *scan*, which also excludes `archive/` -- so a real, legitimate citation
> of `archive/outdated/NORTH_STAR.md` (a file this very HANDOFF.md points
> readers at, several sections up) came back "missing" purely because the
> existence check couldn't see into the directory it was checking against.
> Split into `GENERATED_DIRS` (excluded everywhere, including existence
> checks) and `STALE_CONTENT_DIRS` (excluded only from scanning/corpus,
> never from existence checks) to fix it.
>
> That left exactly 3 real findings against the actual repo, and all 3 were
> genuine, not tool bugs -- but 2 of the 3 were this session's own writing:
> `tools/deploy-drift/README.md`'s Testing section, written by a prior pass
> this same session, cited `tests/tools/deploy-drift-expected-marker.test.js`
> and `tests/tools/deploy-drift-check.test.js` -- KOS's own nested test
> layout, copied by habit instead of TSO's real, flat
> `tests/deploy-drift.test.js`. **Fixed the doc**, not just flagged it. The
> remaining 2 are legitimate cross-system references this tool can't tell
> apart from a real citation on its own (Mothership's `scripts/deploy-drift.js`,
> Apps Script's `doGet()` convention, both cited for contrast, not claimed
> as this repo's own) plus one genuine "create this file, it doesn't exist
> yet" AWS instruction -- rather than let CI start permanently red on
> findings that will never resolve (the exact "a check that noisy is worse
> than none" failure mode `gas-lint`'s own README warns about), added a
> declared, explicit per-line escape hatch
> (`<!-- doc-currency:ignore -- why -->`, an invisible HTML comment) and
> used it on those 3 lines -- same philosophy KOS's own `sandboxScope.allow`
> uses: reach for it only when the citation is genuinely not this tool's
> business, and say why right there.
>
> Push/PR-gated (`.github/workflows/doc-currency.yml`), same reasoning as
> `coverage-gaps.yml`: checks static text against static source, so the
> right moment to catch a regression is before merge.
>
> Verified: 25 new tests (`tests/doc-currency.test.js`), a real run against
> this actual repo confirmed clean (exit 0) after the fixes above -- not
> just asserted against synthetic fixtures. Root suite 103/103. Workflow
> passes `actionlint`.
>
> **All five KOS/Mothership concepts flagged in the original review are
> now ported**: `watchdog` (already existed), `deploy-drift`, `doctor`,
> `coverage-gaps`, `doc-currency`.

> **Update — 2026-09-19:** Fixed CodeQL's 4 findings on the PR carrying
> everything in the five entries above (1 high -- `doc-currency`'s
> `checkFunctionCitation` only escaped `$` in its regex, not a complete
> escape; 3 medium -- `coverage-gaps.yml`/`doc-currency.yml`/`doctor.yml`
> all lacked an explicit `permissions:` block), verified clean, and merged
> as **PR #2032**. Then ran `doctor.yml` for real via `workflow_dispatch`
> on `main` -- first real signal, not inference: **`VERCEL_TOKEN` and
> `VERCEL_URL` are both simply not configured as repo secrets at all**,
> not invalid/expired. That's the definitive root cause of the "Deploy to
> Vercel" Action's 100% failure rate since Feb 2026, closing the question
> Sprint 0 could only speculate about.
>
> Asked what else besides Vercel `tais_frontend` could run on, then for a
> cost/pros/cons comparison (Vercel-fixed vs. Render Static Site vs.
> Cloudflare Pages vs. Netlify), then to confirm the one real open
> question -- whether Render Static Site PR previews are free or
> paid-tier-gated (`WebSearch` against Render's own docs: **free**,
> previews bill at the base service's rate, and static sites are free
> unconditionally, no commercial-use restriction unlike Vercel's Hobby
> tier). Decision: **migrate `tais_frontend` to a Render Static Site**,
> consolidating onto the platform already trusted for `tais-registry`
> rather than adding a fourth account/dashboard/token to babysit.
>
> **This pass built the migration scaffolding, deliberately not the full
> cutover** (see "not done" below -- several of the changes below are
> unconfirmed against a live dashboard by design, the same caveat
> `render.yaml`'s existing `tais-registry` block already carries):
> - `render.yaml`: added a `tais-frontend` static-site service block
>   (`rootDir: tais_frontend`, `buildCommand: npm ci && npm run build`,
>   `staticPublishPath: dist`, the same 4 `VITE_*` build-time env vars
>   `vercel.json`'s own `env` block sets, one SPA-catch-all `routes:`
>   rewrite -- `vercel.json`'s `/api/*`/`/assets/*` "rewrite to
>   themselves" entries were already no-ops, real files win over rewrites
>   on both platforms, so they had no Render equivalent to port).
>   `CORS_ORIGIN` widened to a comma-separated pair (`config/cors.ts`
>   already splits on `,`) -- the original Vercel origin **and** the new
>   Render one, deliberately, since this session can't confirm from here
>   whether Vercel's native git integration is still independently live
>   during the transition.
> - `.github/workflows/deploy.yml` → renamed `frontend-ci.yml`, the
>   `deploy` job (Vercel CLI `pull`/`build`/`deploy`) removed entirely --
>   safe to remove outright, not just neuter, because it's not "possibly
>   still working": `doctor.yml`'s run confirmed it had literally never
>   had a token to authenticate with. The `test` job (typecheck + vitest,
>   `tais_frontend`'s only CI coverage) is unchanged.
> - `tools/doctor/check.js`: `VERCEL_TOKEN`'s check removed (grepped --
>   deploy.yml's CLI steps were its only consumer anywhere in the repo,
>   confirmed before deleting) along with its header section and the now-
>   unused `fetchImpl` plumbing in `runDoctor`. `VERCEL_URL`/
>   `VERCEL_BYPASS_TOKEN` checks are untouched -- confirmed via
>   `call-hub.yml` that these are Mothership's own hub URL/bypass token,
>   entirely unrelated to where `tais_frontend` is hosted.
> - `tais_frontend/scripts/write-version.cjs`: added `RENDER_GIT_COMMIT`
>   as the first-priority SHA source (ahead of `VERCEL_GIT_COMMIT_SHA`,
>   ahead of the `git rev-parse HEAD` fallback) -- **not yet confirmed**
>   whether Render actually stamps this in a Static Site's build
>   environment specifically (only confirmed for `tais-registry`'s web
>   service, in `routes/version.ts`); harmless to check speculatively
>   either way since the `git` fallback already covers the "unset" case
>   with no behavior change from before this pass.
>
> **Deliberately NOT done in this pass, and why:**
> - **`tais_frontend/vercel.json` left untouched.** Its `env` block may be
>   the only thing currently setting `VITE_*` vars if Vercel's native git
>   integration is still deploying independently of the (now-deleted)
>   Action -- deleting it blind risked silently breaking a still-live
>   production frontend from this session, with no way to verify either
>   way without dashboard access.
> - **`tools/deploy-drift/services.js`'s `tais-frontend` entry left
>   pointed at `taisplatform.vercel.app/version.json`, not the new Render
>   URL.** `deploy-drift.yml` runs hourly on `main` -- repointing it to a
>   Render static site that doesn't exist yet would file a real, false
>   "Deploy drift: tais-frontend" issue on its very next scheduled run,
>   exactly the "nobody watching, silently wrong" failure mode this whole
>   line of tooling exists to prevent, not cause. This is the single
>   remaining code change cutover needs, and it's a one-line edit.
> - **No Render static site actually exists yet.** `render.yaml`'s new
>   block is the same kind of best-effort record its own `tais-registry`
>   block already is -- a human with Render dashboard access needs to
>   either run a Blueprint sync from this file or create the service by
>   hand, then confirm the resulting URL matches what `CORS_ORIGIN` and
>   (once cutover happens) `deploy-drift/services.js` assume.
> - **No DNS/custom-domain cutover, no Vercel project decommissioning.**
>   Both need dashboard access this session doesn't have, and shouldn't
>   happen until the Render service is confirmed live and serving
>   correctly.
>
> Verified: root suite 98/98 (103 minus the 5 `VERCEL_TOKEN`-specific
> tests removed from `tests/doctor.test.js`, tests renumbered/renamed to
> match). `doc-currency` and `coverage-gaps` both re-run clean against the
> real repo post-change. `tais_frontend`: `tsc --noEmit` clean, vitest
> 16/16 files (67/67 tests) unchanged, a real `npm run build` confirmed
> `version.json` still lands in `dist/` and the `RENDER_GIT_COMMIT`/
> `git`-fallback priority both work as designed (tested by hand with and
> without the env var set). `actionlint` was not available in this
> session's sandbox (no cached binary, and `rhysd/actionlint` is outside
> this session's GitHub repo scope) -- new/changed workflow YAML was
> instead validated with `yaml.safe_load` (syntax-valid) and reviewed by
> hand against `frontend-ci.yml`'s and `doctor.yml`'s own prior,
> actionlint-clean structure; a human or a later session with actionlint
> available should still run it once before or shortly after this merges.

> **Update — 2026-09-19 (follow-up):** The user added the Render MCP
> connector to this session and asked to have the cutover actually
> carried out, not just scaffolded. With real Render account access,
> found the correct workspace by listing all three the account has
> access to and matching which one actually hosts the live `tso.onrender.com`
> registry service (`tea-d65249fpm1nc738km5gg`, confusingly also the
> name of two of the three workspaces) -- created the `tais-frontend`
> static site there for real via `create_static_site`, wired to
> `github.com/adamberneche-afk/TSO`, branch `main`, matching the
> `render.yaml` block from the prior entry (`create_static_site`'s tool
> doesn't expose a `rootDir` parameter, so `buildCommand`/`publishPath`
> encode it instead: `cd tais_frontend && npm ci && npm run build` /
> `tais_frontend/dist`).
>
> **The first real build succeeded end-to-end** (watched via
> `get_deploy` and confirmed with the actual build log, not just a
> status field): `write-version.cjs`'s prebuild step reported
> `source: "render"` with the deploying commit's SHA -- **this resolves
> the "not yet confirmed" flag on `RENDER_GIT_COMMIT` from the entry
> above: Render Static Site builds do stamp it**, the same as the
> `tais-registry` web service already relied on. `vite build` completed
> (4387 modules), and Render's own log ends with "Your site is live".
> The resulting URL, `https://tais-frontend.onrender.com`, is exactly
> what `render.yaml`'s block and `CORS_ORIGIN` already assumed -- no
> follow-up edit needed there. This session has no network egress to
> `onrender.com` itself (same block that already applied to
> `render.com`'s docs pages), so the build log is the actual evidence,
> not an external HTTP check.
>
> **Completed the one remaining code change the prior entry flagged**:
> `tools/deploy-drift/services.js`'s `tais-frontend` entry now points at
> the real Render URL instead of the Vercel one, label updated to
> `Frontend (Render)`. This was deliberately left for last, after (not
> before) the service was confirmed to actually exist and build
> successfully -- repointing it earlier would have made `deploy-drift.yml`'s
> next hourly run file a real false "unreachable" issue against a
> service that didn't exist yet.
>
> **Still not done, and still needs a human**: PR-preview deployments on
> the new static site are off by default and there's no MCP tool
> exposed to flip that setting -- needs a dashboard visit (Settings → PR
> Previews). Also spotted, unrelated to this migration but worth a
> separate look: the *live* `tais-registry` web service's actual
> configuration disagrees with `render.yaml` in two ways -- its real
> build command is `start.sh`, not `build.sh`, and `autoDeploy` is off,
> not on. `vercel.json` and the Vercel origin in `CORS_ORIGIN` are still
> deliberately untouched -- decommissioning Vercel is a separate decision
> the user hasn't made yet, independent of whether the Render replacement
> works.
>
> Verified: root suite 98/98, `doc-currency` and `coverage-gaps` both
> re-run clean against the real repo after the one-line `services.js`
> change.

> **Update — 2026-09-19 (second follow-up):** Asked to reconcile the
> `render.yaml`/live-dashboard drift flagged above. Before editing
> anything, checked the live service's deploy history via the Render
> connector -- and found something bigger than a doc mismatch:
> **`tais-registry` has not deployed since 2026-03-24.** `autoDeploy` had
> been off the entire time, and nobody had manually triggered a deploy
> in the ~6 months since. Every backend change from every session since
> then -- everything this file documents from the 2026-09-18 entries
> onward, including this session's own `/api/version` route -- has never
> actually reached `tso.onrender.com`. The live server has been running
> commit `c0e5623a` (a March 24 commit) the whole time.
>
> Also found while checking this: **no Postgres instance exists in any
> of the three Render workspaces this account can see** (nor a Key-Value
> store). `render.yaml` declares `tais-db` as a Render-managed free
> Postgres the registry's `DATABASE_URL` should draw from -- if that's
> what was actually live, Render's free-tier database expiration policy
> (auto-deleted after a period of inactivity) is a plausible explanation
> given the 6-month gap, but this wasn't confirmed (this session has no
> tool to read the live service's actual `DATABASE_URL` value, only to
> set new env vars). **Flagged to the user, not yet resolved.**
>
> Walked the user through the two dashboard changes this session's
> Render MCP connector can't make itself (no tool exposes editing an
> *existing* service's build command or auto-deploy setting, only
> creating new services) -- Build Command back to `build.sh`,
> Auto-Deploy on -- then confirmed both took via `get_service` before
> triggering a real deploy.
>
> **That deploy failed** (safely -- Render never cuts traffic to a
> failed build, so `tso.onrender.com` kept serving the March version
> throughout): `tsc` failed on every `@think/types` import with "Cannot
> find module... or its corresponding type declarations". Root cause,
> confirmed by reproducing it against a fresh clone locally before
> touching the real script: `build.sh` deliberately renames the root
> `package.json` away to disable npm workspace detection (a workaround
> for something else, predating this session), which means
> `packages/registry`'s `npm install` pulls in `@think/types` as a bare
> `file:../types` dependency rather than a workspace link -- and npm's
> `file:` protocol only copies/symlinks source, it never runs the
> target's own build script. `packages/types/dist` is gitignored, never
> committed, so nothing anywhere in this build path had ever compiled it
> on a truly fresh clone. This had been silently latent since whenever
> workspace-detection-disabling was added to `build.sh` -- invisible for
> as long as autoDeploy stayed off.
>
> **Fixed, not just diagnosed**: `build.sh` now explicitly builds
> `@think/types` (`npm install` for its own runtime dep, `zod`, then
> registry's own already-installed `tsc` binary directly -- deliberately
> *not* `npm run build` inside `packages/types`, since that package has
> no `typescript` devDependency of its own and would fail with "tsc: not
> found" in a real clean environment; confirmed by testing with this
> sandbox's own global `tsc` explicitly excluded from `PATH`, after an
> earlier test run was misleadingly saved by that same global `tsc`
> masking the real failure mode). Verified end-to-end against a fresh
> `git clone` of `main`, twice -- once to reproduce the original failure,
> once to confirm the fix -- before touching the real file, and confirmed
> `packages/registry/dist/index.js` (what `start.sh` actually execs) gets
> produced and the root `package.json` restoration trap still fires
> correctly on both success and failure paths.
>
> **Not yet done**: re-triggering the real Render deploy with this fix
> (next step after this commit merges) to confirm it actually goes live
> -- and if it does, the still-open Postgres question above becomes
> urgent, since a successful build with a dead `DATABASE_URL` would
> still fail at `prisma migrate deploy` inside `build.sh`, or start
> serving traffic with no working database if that step were ever
> weakened. Root suite 98/98, `doc-currency` and `coverage-gaps` both
> clean.

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
something this session decided for you. **Also standing as of
2026-09-12**: don't wire skill-sandbox enforcement (`docs/
DOCS_VS_CODEBASE.md` row 8) into the live registry server without first
replacing `SandboxService`'s `vm2` engine — EOL since 2023, with known,
unpatched sandbox-escape CVEs — with an actually-maintained isolation
mechanism; the server has no skill-execution endpoint at all today, so
there's no existing surface this would even be "just wiring up." **Also
standing as of 2026-09-12 (follow-up)**: don't build live web-hosted
agent deployment or ship desktop-app installers (`docs/
DOCS_VS_CODEBASE.md` row 22) without a real infrastructure/ops decision
behind them first — both need genuine new commitments (hosting compute
and isolation for the former, code-signing certificates and a release
pipeline for the latter) that no session should make unilaterally while
scoping a documentation-vs-codebase pass.

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
