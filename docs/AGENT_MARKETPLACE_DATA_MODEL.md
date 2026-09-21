# Agent Marketplace: Data Model Design

> **Update — 2026-09-14:** Routes, moderation, a browse/discover UI, and
> an install flow were built on top of this data model -- see
> `docs/DOCS_VS_CODEBASE.md` row 22 for the current summary. The open
> questions this document originally raised (who can list an agent, what
> "installing" means, what moderating a listing checks) are resolved
> below in "Open questions, resolved". Read that first; treat the rest
> of this document as the original design record.

**Status: built** (data model + routes + moderation + browse/install UI;
see the update above). This document originally recorded the schema
design for `docs/DOCS_VS_CODEBASE.md` row 22's Agent Marketplace half
("Agent marketplace / skill publishing wizard / web+desktop
deployment") back when the Prisma model below was real and migrated but
nothing was built on top of it -- no routes, no moderation flow, no
browse/discover page, no install mechanism. That gap is now closed.
Treat this the same way the codebase already treats "designed but not
built" (see `docs/ENTERPRISE_RAG_DATA_MODEL.md`
for the precedent this follows): a real foundation a future session can
build directly on top of, not a claim that an agent marketplace works
today.

## Why this is scoped as design-only

Row 22 bundled five different-sized asks: a skill publishing flow, an
agent marketplace, web agent deployment, desktop app packaging, and
per-agent API endpoint generation. The skill publishing flow was built for
real this same pass -- it needed no new infrastructure, just a UI wired to
`POST /api/v1/skills`, a route that already existed and already scans
every submission (row 5). The agent marketplace has no equivalent
existing infrastructure to reuse: there is no browsable/listed "Agent"
concept anywhere in this schema (`AgentConfiguration` is private-per-wallet
storage, and `AgentApp` -- easy to confuse with this -- is an unrelated
OAuth third-party-integrations model, see row 10). Web deployment and
desktop packaging are bigger still: they require actual infrastructure
commitments (hosting compute, code-signing certificates) this pass
correctly declined to make unilaterally, the same treatment row 8's vm2
decision got. So this pass designed and validated the one piece of row 22
that's genuinely just a data-modeling problem -- what a listing *is* --
and stopped there.

## The model

```prisma
enum AgentListingStatus {
  PENDING
  APPROVED
  REJECTED
  SUSPENDED
}

model AgentListing {
  id              String   @id @default(uuid())
  configurationId String   @unique
  configuration   AgentConfiguration @relation(fields: [configurationId], references: [id], onDelete: Cascade)

  walletAddress String

  name        String
  description String?
  category    String?

  status       AgentListingStatus @default(PENDING)
  installCount Int                @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

`AgentConfiguration` gained one new optional relation field (`listing
AgentListing?`) -- the opposite side of the one-to-one.

### Design decisions and their reasoning

**A listing is an explicit, separate row -- not a flag on `AgentConfiguration`.**
Publishing is opt-in: a wallet's private agent configurations (the
default and, today, only state) stay untouched; a listing only exists once
someone deliberately creates one. `configurationId` is `@unique`, so it's
a strict one-to-one -- one public façade per configuration, not a
one-to-many "versions of a listing" concept.

**The listing is a curated public summary, not a read-through to
`AgentConfiguration.configData`.** `name`/`description`/`category` are
their own fields, duplicated from (and possibly narrower than) the
configuration's own name/description, rather than the marketplace reading
`configData` directly at render time. `configData` is the full agent
configuration JSON -- it can carry a wallet's private skill selections and
personality details, and listing an agent publicly shouldn't leak them
just because the underlying config is technically reachable through the
relation. This is the same "don't let public-adjacent plumbing leak a
private thing" principle Enterprise RAG's own design doc flags as its open
question -- here, resolved by construction: the public-facing fields are
a distinct, deliberately-populated copy, not a view onto private data.

**Status mirrors `Skill`'s own moderation states
(`PENDING`/`APPROVED`/`REJECTED`/`SUSPENDED`)**, as a separate
`AgentListingStatus` enum rather than reusing `SkillStatus` -- listings and
skills are different domains that only coincidentally share the same
four states, the same reasoning `OrganizationRole` (Enterprise RAG) got
its own enum instead of reusing `ProvenanceLink`'s role concept. What
*moderating* an agent listing should actually check is an open question:
skills have a concrete answer (YARA-pattern scanning of executable
package content, row 5); an agent listing has no equivalent "content" to
scan in the same sense -- its config is data/settings, not code. A real
moderation step would need its own design, not an assumption smuggled in
here.

**`installCount` is a placeholder, not a working counter.** Nothing
increments it yet, because there is no install/invoke flow for a
marketplace agent to have installs of -- row 22's web-deployment and
API-generation pieces remain undecided/unbuilt. It's here so the schema
doesn't need another migration the moment a real install flow exists.

**`onDelete: Cascade` on `configurationId`** (verified by
`agentListingDataModel.test.ts`), the opposite choice from Enterprise
RAG's `SetNull` on `RAGDocument.organizationId`. A `RAGDocument` has
content worth keeping independent of its org; an `AgentListing` has no
content of its own at all -- it is nothing but a public façade for one
`AgentConfiguration`. If the configuration is deleted, the façade has
nothing left to front, so it goes with it.

## What was built (2026-09-14)

- **Routes** (`packages/registry/src/routes/agentListings.ts`):
  `GET /api/v1/agent-listings` (public browse, APPROVED only, filterable
  by category/name, paginated), `GET /mine` (the caller's own listings,
  any status), `GET /:id` (public if APPROVED, or the owner regardless
  of status), `POST /` (create), `PUT /:id` (update, owner-only),
  `DELETE /:id` (withdraw, owner-only), `POST /:id/install`.
- **Moderation** (`packages/registry/src/routes/admin.ts`, mirroring the
  existing Skill block/unblock/verify pattern exactly): `POST
  /admin/agent-listings/:id/{approve,reject,suspend}`, each requiring a
  `reason` like every other admin action here does. Also added
  `GET /admin/agent-listings?status=` -- the moderation queue -- once
  building the moderation UI made concrete that neither this nor the
  Skill flow had ever had a "browse pending items for review" endpoint;
  before this, an admin needed to already know a listing's id.
- **Browse/discover and management UI**
  (`tais_frontend/src/app/components/marketplace/`): a public browse
  grid with search/category filtering and an Install button; a "My
  Listings" panel (publish an existing `AgentConfiguration`, edit,
  withdraw); and an admin moderation panel (approve/reject/suspend with
  a required reason, a per-status queue) -- the same
  connect-wallet-and-let-the-server-403 pattern `PublishSkillForm.tsx`
  and Enterprise RAG's `CreateOrganizationForm.tsx` already established
  for admin/gated actions, rather than trying to pre-check permissions
  client-side.
- e2e coverage of the full create -> moderate -> browse -> install
  lifecycle, plus unit coverage of the frontend API client
  (`agentListingDataModel.test.ts`'s original data-model tests untouched
  and still passing).

### Open questions, resolved

- **Who can list an agent?** Whoever already owns the underlying
  `AgentConfiguration` -- no separate gating was added, because creating
  an `AgentConfiguration` at all already requires THINK NFT ownership
  (`services/genesisConfigLimits.ts`). Whoever cleared that bar to create
  the configuration has cleared it to list it.
- **What does "installing" a marketplace agent mean?** Copying the
  listing's underlying configuration into a brand-new
  `AgentConfiguration` owned by the installer, reusing the existing,
  already-tested `saveConfiguration()` (same NFT/tier-limit enforcement
  as creating any configuration from scratch). Deliberately *not* a
  live/hosted instance -- that's the half of this question genuinely
  entangled with row 22's still-undecided web-deployment piece; a data
  copy isn't.
- **What does moderating an agent listing check?** An application-layer
  decision only (does this listing's public summary belong on the
  browse page), made by a human admin reading the name/description/
  wallet and typing a reason -- no automated scanning engine, since a
  listing has no executable content the way a `Skill` package does.
- **Does editing a listing after approval need re-review?** Yes -- `PUT
  /:id` always resets `status` to `PENDING`. An approved public summary
  shouldn't be silently swappable for different text without a fresh
  look.
- **Does a wallet re-listing after editing its configuration need a new
  listing?** No -- the listing's `configurationId` link is unaffected by
  editing the configuration's own `configData`; the existing
  one-listing-per-configuration uniqueness constraint was never in
  tension with this.
- **`$THINK` tier/staking gating marketplace visibility?** Not
  built, consistent with the standing recommendation against building
  that layer out further (see `HANDOFF.md`).
