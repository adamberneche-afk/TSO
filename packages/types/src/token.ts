import { z } from 'zod';

export const TokenTypeSchema = z.enum(['ERC20', 'ERC721', 'ERC1155']);
export const TokenBalanceSchema = z.object({
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tokenType: TokenTypeSchema,
  balance: z.string(),
  decimals: z.number().optional(),
  symbol: z.string().optional(),
});

export const TokenHoldingSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  holdings: z.array(TokenBalanceSchema),
  totalUsdValue: z.number().optional(),
});

export const StakingInfoSchema = z.object({
  stakedAmount: z.string(),
  rewardsAmount: z.string(),
  currentEpoch: z.number(),
  totalStaked: z.string(),
  canUnstake: z.boolean(),
  unstakePenalty: z.number(),
});

export const CombinedStakingInfoSchema = z.object({
  tokenBalance: TokenBalanceSchema.nullable(),
  stakingInfo: StakingInfoSchema.nullable(),
  totalWeight: z.number(),
  canSkillPublish: z.boolean(),
});

export type StakingInfo = z.infer<typeof StakingInfoSchema>;
export type CombinedStakingInfo = z.infer<typeof CombinedStakingInfoSchema>;

export type TokenType = z.infer<typeof TokenTypeSchema>;
export type TokenBalance = z.infer<typeof TokenBalanceSchema>;
export type TokenHolding = z.infer<typeof TokenHoldingSchema>;