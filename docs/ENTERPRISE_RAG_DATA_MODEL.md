# Enterprise RAG: Data Model Design

**Status: data model designed and migrated, not built.** This document
records the schema design for `docs/DOCS_VS_CODEBASE.md` row 14's
Enterprise RAG half ("Organization-level with admin controls"). The
Prisma models below are real, migrated, and covered by a test proving
they're mechanically sound (`src/__tests__/services/
organizationDataModel.test.ts`) — but there are **no routes, no
invitation flow, no UI, and no billing/tier implications worked out**.
Treat this the same way the codebase already treats "designed but not
built": a real foundation a future session can build directly on top
of, not a claim that Enterprise RAG works today.

## Why this is scoped as design-only

App RAG (the other half of row 14) reused existing OAuth/community-crypto
infrastructure and shipped as a real, working feature in the same pass
this document was written in. Enterprise RAG has no equivalent existing
infrastructure to reuse — there is no "Organization"/"Team"/multi-tenant
concept anywhere else in this schema — so building it out fully (org
creation flow, invitation/acceptance, a management UI, moderation
routes, and the real-world questions those raise: who's allowed to
create an org, is there a cap, what happens to an org's data if its
owner's wallet goes dark) is a materially larger, more speculative
effort than reusing existing plumbing. Rather than half-build routes
against untested product decisions, this pass designed and validated
the data model real business logic would sit on top of, and stopped
there.

## The model

```prisma
enum OrganizationRole {
  OWNER
  ADMIN
  MEMBER
}

model Organization {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members     OrganizationMember[]
  documents   RAGDocument[]
}

model OrganizationMember {
  id             String           @id @default(uuid())
  organizationId String
  organization   Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  walletAddress  String
  role           OrganizationRole @default(MEMBER)
  invitedBy      String?
  joinedAt       DateTime         @default(now())

  @@unique([organizationId, walletAddress])
}
```

`RAGDocument` gained one new nullable field:

```prisma
organizationId String?       @map("organization_id")
organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)
```

### Design decisions and their reasoning

**A wallet, not a new account system, is the identity.** `OrganizationMember.walletAddress` mirrors every other identity reference in this schema (`Skill.author`, `RAGDocument.walletAddress`, `AgentAppPermission.walletAddress`, ...). No separate "user account" concept was introduced — the same wallet that authenticates everywhere else is the org member.

**Three roles, matching the row's own "admin controls" framing:**
- **OWNER** — full control, including deleting the organization itself. Exactly one conceptually, though the schema doesn't hard-enforce a single owner (a real invitation/ownership-transfer flow would need to, at the application layer).
- **ADMIN** — manage membership (invite, remove, change non-owner roles) and moderate any org document (delete/hide), not just their own.
- **MEMBER** — upload documents to the org and read every org document; cannot manage membership or touch others' documents.

This mirrors the pattern already established for the (separately real, already-built) audit/provenance system's role weighting (`ProvenanceLink`'s AUTHOR/AUDITOR/VOUCHER), not a new pattern invented for this feature.

**`RAGDocument.organizationId` is additive, not a fork.** An org-shared document is still a normal `RAGDocument` row — same encryption, same chunks, same everything — just with `organizationId` set. Sharing with an org is deliberately independent of `isPublic`/`allowedViewers`: an org document can be `isPublic: false` (visible only to org members, not the whole platform) or `isPublic: true` (both org-shared and community-visible) — proven by `organizationDataModel.test.ts`'s second test.

**Encryption is an open question this data model does not answer.** `RAGDocument`'s existing encryption is either wallet-derived (the individual uploader's key — meaning only that one wallet could ever decrypt it, useless for org-wide sharing) or the single shared community key (meaning any authenticated user, not just this org's members, could ask the server to decrypt it via the existing `/rag/community/decrypt` — no org-boundary enforcement at the crypto layer, only at whatever a future read route chooses to check). A real implementation needs one of: (a) accept that org documents use the community key and enforce the org boundary purely at the application layer (read routes check `OrganizationMember` before returning content — same trust model as `GET /agent/rag`'s wallet check, just extended to "is this wallet a member of this document's org"), or (b) introduce a genuine per-organization key (its own key-management problem: who holds it, how do new members get it, what happens on member removal). Option (a) requires no new crypto and is the more likely real starting point; this document flags the question rather than silently picking (a) as fully decided, since it's a real security-relevant design call for whoever builds the read/write routes next.

**`onDelete: SetNull` on `RAGDocument.organizationId`, `onDelete: Cascade` on `OrganizationMember`** — both verified by `organizationDataModel.test.ts`. Deleting an organization removes its memberships outright (they have no meaning without the org) but only *un-shares* its documents rather than deleting their content — a member's uploaded document is theirs first, org-shared second.

## What a real build-out still needs (not started)

- Routes: create org, invite/accept/remove member, change role, list org documents, upload/moderate an org document, delete org.
- An invitation flow (the schema has `invitedBy` for audit purposes but no pending-invitation state — right now `OrganizationMember` rows are created directly, implying an admin action, not a two-sided accept).
- A UI (no `tais_frontend` component exists for any of this).
- The encryption/access-boundary decision above.
- Product decisions: who can create an organization (any wallet? gated somehow?), whether there's a member cap or any relationship to the (separately not-built) `$THINK` tier system, and what "admin controls" should include beyond membership/document moderation (audit log of org actions? something more).
