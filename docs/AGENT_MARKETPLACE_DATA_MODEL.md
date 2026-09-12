# Agent Marketplace: Data Model Design

**Status: data model designed and migrated, not built.** This document
records the schema design for `docs/DOCS_VS_CODEBASE.md` row 22's Agent
Marketplace half ("Agent marketplace / skill publishing wizard /
web+desktop deployment"). The Prisma model below is real, migrated, and
covered by a test proving it's mechanically sound
(`src/__tests__/services/agentListingDataModel.test.ts`) -- but there are
**no routes, no moderation flow, no browse/discover page, and no
install/deployment mechanism**. Treat this the same way the codebase
already treats "designed but not built" (see `docs/ENTERPRISE_RAG_DATA_MODEL.md`
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

## What a real build-out still needs (not started)

- Routes: create/update/withdraw a listing, browse/search listings
  (public), an admin moderation endpoint to move a listing between
  statuses.
- A real definition of what moderating an agent listing means (the open
  question above) -- likely starting the same way `GET /agent/rag`
  extended App RAG's wallet check rather than inventing new crypto: an
  application-layer check, not a new scanning engine, unless a future
  session decides agent configs need content scanning too.
- A browse/discover UI (no `tais_frontend` component exists for any of
  this -- distinct from `SkillSelector.tsx`, which browses *skills*, not
  agents).
- Whatever "installing" a marketplace agent means for a viewer who isn't
  its owner (copying the configuration into their own
  `AgentConfiguration`? A live, hosted instance? That decision is
  entangled with row 22's still-undecided web-deployment question).
- Product decisions: who can list an agent (any wallet? NFT-gated like
  skill publishing?), whether a wallet can list the same configuration
  after editing it (a new configuration version, or does the listing
  track the current version implicitly?), and whether `$THINK`
  tier/staking (row 18, itself not built) should gate marketplace
  visibility the way it's aspirationally described gating other features.
