# Enterprise RAG: Identity, Without Blockchain Infrastructure

**Status: built.** This documents the identity system and invite-only
membership flow built on top of `docs/ENTERPRISE_RAG_DATA_MODEL.md`'s
`Organization`/`OrganizationMember` schema -- routes, an invitation flow,
and a password-based login now exist. What's still not built (a frontend
UI) is listed at the bottom.

## The problem this solves

Every identity concept in this codebase -- `RAGDocument.walletAddress`,
`OrganizationMember.walletAddress`, `ApiKey`, even the JWT payload itself
(`AuthService`) -- keys off a wallet address authenticated via an
Ethereum signature. That's a real adoption blocker for an enterprise
buyer: requiring every employee at a customer company to install
MetaMask and manage a private key just to read a shared knowledge base
is a needless barrier that has nothing to do with what Enterprise RAG
actually needs to do.

Three ways to remove that barrier were considered:

1. **Real custodial wallet per user** -- generate an actual ECDSA
   keypair server-side (`ethers.Wallet.createRandom()`, free, offline,
   no gas) and hold the private key on the user's behalf. Rejected:
   this makes the *platform* custody real private keys, a security and
   liability surface (key storage, backup, breach blast radius) that
   buys nothing here, since nothing about Enterprise RAG needs a
   signable key -- only a stable identity string.
2. **Outsourced embedded wallet** (Privy/Web3Auth/Magic/Dynamic/Coinbase
   embedded wallets) -- a third party manages a real wallet behind
   email/social login. Rejected for the same reason as (1) plus a new
   vendor dependency: it's still blockchain infrastructure, just
   somebody else's, for a feature that doesn't need one.
3. **A fully parallel identity system** (a `User` model, a `req.user`
   union type, auditing every `walletAddress`-keyed route and
   middleware for the new shape) -- rejected as *more* invasive than
   necessary, not less: `walletAddress` is a foreign key or an identity
   check in well over a dozen models and every piece of auth middleware.
   Teaching all of it about a second identity concept is a large,
   ongoing maintenance cost for no corresponding benefit.

**What was built instead:** a deterministic, non-signable pseudo-address
derived from the account's email. It satisfies `ethers.isAddress()` and
every existing `walletAddress` column, so `OrganizationMember`,
`RAGDocument.organizationId` sharing, `authMiddleware`, and the JWT
pipeline all work completely unchanged -- an email/password account
*is* a walletAddress-shaped identity to the rest of the platform. No
private key is ever generated, held, or exists anywhere for it; there is
nothing to custody and nothing that touches a chain.

## How it works

`services/emailIdentity.ts`'s `deriveWalletAddressForEmail(email)`:

```
address = lowercase(checksum(0x + last20Bytes(sha256("TAIS-EMAIL-IDENTITY-v1:" + lowercase(email)))))
```

Domain-separated with a fixed prefix so this can never collide with a
real address-derivation scheme even in principle, and lowercased to
match this codebase's existing convention (`AuthService.generateToken`
always lowercases the wallet address in the JWT payload, so a
checksummed/mixed-case pseudo-address would silently fail every
membership lookup against it).

Authentication is a plain password check
(`EmailIdentityService.verifyPassword`, bcrypt, 12 rounds). A successful
login calls the *same* `AuthService.generateToken(walletAddress)` a real
wallet-signature login uses, producing the identical `{walletAddress}`
JWT shape -- `authMiddleware` and every downstream route need zero
changes to accept these callers. These accounts are scoped to
Enterprise RAG only: they hold no NFTs and are not expected to reach
NFT-gated routes (skill publishing, audits) or own a Skill/
AgentConfiguration.

## Invite-only, deliberately

There is no self-serve "sign up" or "create your own org" flow:

- **Creating an organization is admin-only** (`POST /api/v1/orgs`,
  gated by the same `ADMIN_WALLET_ADDRESSES`-based `requireAdmin`
  middleware `/admin` already uses). An org is provisioned for a new
  enterprise customer, not spun up by anyone who shows up. Creating it
  immediately sends the org's first invitation, as `OWNER`, to the
  email the admin specifies -- there is no other way for an org to end
  up with an initial member.
- **Every other membership change flows through an invitation**
  (`services/organizationInvitations.ts`): an `OWNER`/`ADMIN` invites a
  specific email to a specific role; accepting the one-time,
  sha256-hashed token (mirroring the `AuthNonce`/`ApiKey`/
  `TokenBlacklist` convention of never persisting a secret raw) is the
  only way that email gets an `OrganizationMember` row. Accepting also
  creates the account's `EmailIdentity` in the same step if it doesn't
  already have one -- the invite itself is what proves the recipient
  controls that inbox, so there's no separate "verify your email" step.
- Role rules match `OrganizationMember`'s existing comments: `OWNER` can
  manage anyone including other owners (but the sole remaining owner
  can't be demoted or removed -- an org can never be left ownerless);
  `ADMIN` can invite/manage `MEMBER` and `ADMIN` rows but not touch an
  `OWNER`-level membership or promote someone to `OWNER`; `MEMBER` has
  no membership-management rights.
- Password reset (`POST /api/v1/auth/email/forgot-password` /
  `/reset-password`) exists as ordinary account hygiene, independent of
  the invitation system, using the same hashed-token pattern.

## What's built

- `EmailIdentity`, `PasswordResetToken`, `OrganizationInvitation` Prisma
  models (migration `20260913225431_enterprise_rag_email_identity`).
- `services/emailIdentity.ts`, `services/organizationInvitations.ts`.
- `routes/emailAuth.ts` -- `/api/v1/auth/email/{login,forgot-password,reset-password}`.
- `routes/orgs.ts` -- `/api/v1/orgs`: create (admin-only), get, delete
  (owner-only), list/change-role/remove members, create invitation,
  preview invitation (public), accept invitation (public), and
  `GET /:orgId/rag/documents` (member-only metadata listing).
- `routes/rag.ts`'s existing `POST /documents` now accepts an optional
  `organizationId` (membership-checked before the document is created)
  and `DELETE /documents/:documentId` now also allows an org
  `ADMIN`/`OWNER` to moderate-delete a document they didn't upload,
  resolving `docs/ENTERPRISE_RAG_DATA_MODEL.md`'s open access-boundary
  question as its own option (a): app-layer membership checks, reusing
  the existing community-key encryption with no new crypto.
- A dedicated migration (`20260913220000_add_github_tokens`) also fixes
  the pre-existing, unrelated `GitHubToken` schema-drift bug flagged but
  not fixed in the 2026-09-12 handoff (`schema.prisma` had a real,
  wired-up `GitHubToken` model with no corresponding migration) --
  split out on its own rather than folded into this feature's migration.
- Full e2e coverage of the invite -> accept -> login -> role-gated-action
  lifecycle (`__tests__/routes/orgs-invite-flow.e2e.test.ts`) and unit
  coverage of the pseudo-address derivation and password flow
  (`__tests__/services/emailIdentity.test.ts`).

## What's still not built

- **Frontend UI.** No `tais_frontend` screens exist yet: email login/
  signup(-via-invite)/forgot-password pages, an org management view
  (members, roles, invite form), an invitation-accept landing page, or
  an org document library. Every route above is real and tested at the
  API level; there is nothing to click yet.
- **SSO/SAML/OIDC.** Deliberately out of scope for this pass -- a
  distinct, materially larger effort (per-org identity-provider config,
  metadata exchange) layered on top of the same `OrganizationMember`
  model rather than a prerequisite for it.
- Domain-based auto-join (e.g. "anyone `@acme.com` joins automatically")
  -- not built; membership is invite-only, one email at a time.
