import { PrismaClient } from '@prisma/client';

export interface TrustScoreResult {
  trustScore: number;
  isBlocked: boolean;
}

/**
 * Recomputes a skill's trust score from its real audit history and
 * persists the result -- a minimal, real replacement for the static
 * `trustScore` column that used to be nothing but a sort/filter field
 * nobody ever wrote to (see docs/DOCS_VS_CODEBASE.md row 6).
 *
 * Weighted average of SAFE (1.0) / SUSPICIOUS (0.4) / MALICIOUS (0.0)
 * audits, clamped to [0, 1]. Any MALICIOUS audit blocks the skill
 * outright and permanently (never auto-unblocked by a later audit) --
 * mirrors the same "one bad verdict blocks the skill" rule the YARA
 * scanner already enforces on publish (POST /api/v1/skills).
 */
export async function recomputeTrustScore(
  prisma: PrismaClient,
  skillId: string
): Promise<TrustScoreResult> {
  const [audits, skill] = await Promise.all([
    prisma.audit.findMany({ where: { skillId }, select: { status: true } }),
    prisma.skill.findUnique({
      where: { id: skillId },
      select: { isBlocked: true },
    }),
  ]);

  let safe = 0;
  let suspicious = 0;
  let malicious = 0;
  for (const audit of audits) {
    if (audit.status === 'SAFE') safe++;
    else if (audit.status === 'SUSPICIOUS') suspicious++;
    else if (audit.status === 'MALICIOUS') malicious++;
  }

  const total = audits.length;
  const trustScore =
    total === 0
      ? 0
      : Math.max(0, Math.min(1, (safe * 1.0 + suspicious * 0.4) / total));

  const shouldBlock = malicious > 0;
  const isBlocked = !!skill?.isBlocked || shouldBlock;

  await prisma.skill.update({
    where: { id: skillId },
    data: {
      trustScore,
      ...(shouldBlock && !skill?.isBlocked
        ? {
            isBlocked: true,
            blockedAt: new Date(),
            blockedReason: 'Flagged malicious by community audit',
          }
        : {}),
    },
  });

  return { trustScore, isBlocked };
}
