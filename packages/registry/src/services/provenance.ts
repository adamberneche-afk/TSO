import { PrismaClient, ProvenanceRole } from '@prisma/client';

export interface ProvenanceScoreResult {
  provenanceScore: number;
}

// Mirrors packages/core/src/services/IsnadService.ts's calculateTrustScore
// isnad-chain component exactly: author=30, auditor=20, voucher=10,
// linear freshness decay to 0 over 30 days -- so a skill's community-
// endorsement reputation is computed the same way whether it's read from
// this shared registry (this file) or a user's local Electron/CLI cache
// (IsnadService). Deliberately NOT porting IsnadService's additional
// THINK-staking bonus on top: the $THINK monetization layer is out of
// scope here per the standing recommendation in HANDOFF.md against
// building that vision out further.
const ROLE_WEIGHT: Record<ProvenanceRole, number> = {
  AUTHOR: 30,
  AUDITOR: 20,
  VOUCHER: 10,
};
const DAY_MS = 24 * 60 * 60 * 1000;
const FRESHNESS_WINDOW_MS = 30 * DAY_MS;
// Max attainable score: one fully-fresh link of each role (30+20+10).
// Normalizes provenanceScore to the same [0, 1] range as trustScore.
const MAX_CHAIN_SCORE = ROLE_WEIGHT.AUTHOR + ROLE_WEIGHT.AUDITOR + ROLE_WEIGHT.VOUCHER;

/**
 * Recomputes a skill's provenanceScore from its real ProvenanceLink
 * history and persists the result. Distinct from trustScore
 * (services/trustScore.ts), which is purely the SAFE/SUSPICIOUS/
 * MALICIOUS audit-verdict ratio used to gate/block malicious skills --
 * provenanceScore instead reflects who has actually vouched for this
 * skill (the author, every auditor, any community voucher), weighted by
 * role and recency.
 */
export async function recomputeProvenanceScore(
  prisma: PrismaClient,
  skillId: string
): Promise<ProvenanceScoreResult> {
  const links = await prisma.provenanceLink.findMany({
    where: { skillId },
    select: { role: true, createdAt: true },
  });

  const now = Date.now();
  let score = 0;
  for (const link of links) {
    const age = now - link.createdAt.getTime();
    const freshness = Math.max(0, 1 - age / FRESHNESS_WINDOW_MS);
    score += ROLE_WEIGHT[link.role] * freshness;
  }

  const provenanceScore = Math.max(0, Math.min(1, score / MAX_CHAIN_SCORE));

  await prisma.skill.update({
    where: { id: skillId },
    data: { provenanceScore },
  });

  return { provenanceScore };
}

export interface AddProvenanceLinkParams {
  skillId: string;
  wallet: string;
  role: ProvenanceRole;
  signature?: string;
  auditId?: string;
  notes?: string;
}

/**
 * Appends one link to a skill's provenance chain and recomputes its
 * provenanceScore. The caller is responsible for having already verified
 * `wallet`'s signature (or, for an AUTHOR link, its wallet-JWT session)
 * proves this link is real -- this function only persists it.
 */
export async function addProvenanceLink(
  prisma: PrismaClient,
  params: AddProvenanceLinkParams
): Promise<ProvenanceScoreResult> {
  await prisma.provenanceLink.create({
    data: {
      skillId: params.skillId,
      wallet: params.wallet.toLowerCase(),
      role: params.role,
      signature: params.signature,
      auditId: params.auditId,
      notes: params.notes,
    },
  });

  return recomputeProvenanceScore(prisma, params.skillId);
}
