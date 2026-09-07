// Regression tests for two InterviewAgent bugs.
//
// 1. PromptCache used to be a module-level `const PromptCache = new Map()`
//    shared by every InterviewAgent instance in the process, keyed only
//    on `${questionId}_${context}` -- no walletAddress or session
//    component. Two different agent instances (two different interview
//    sessions) reaching the same question with the same context got the
//    exact same cached extractedData back, regardless of what the second
//    session's user actually answered.
//
// 2. finalizeProfile hardcoded `genesis_nft_verified: true` unconditionally
//    -- every finalized profile claimed Genesis NFT ownership regardless
//    of the wallet's real ownership.

import { InterviewAgent } from '../InterviewAgent';
import { InterviewConfig } from '@think/types';

function baseConfig(): InterviewConfig {
  return {
    providerType: 'local',
    localProviderUrl: 'http://localhost:11434',
    localModel: 'llama3:instruct',
  } as InterviewConfig;
}

describe('InterviewAgent prompt cache isolation', () => {
  it('does not leak a cached answer from one agent instance to another', async () => {
    const agentA = new InterviewAgent(baseConfig());
    const agentB = new InterviewAgent(baseConfig());

    // Both agents' underlying providers are stubbed to return a
    // distinguishable, per-agent JSON payload for the same
    // questionId/context pair.
    (agentA as any).provider = { complete: jest.fn().mockResolvedValue('{"from": "A"}') };
    (agentB as any).provider = { complete: jest.fn().mockResolvedValue('{"from": "B"}') };

    const resultA = await agentA.askQuestion('q1', 'ctx', 'answer from user A');
    const resultB = await agentB.askQuestion('q1', 'ctx', 'answer from user B');

    expect(resultA.extractedData).toEqual({ from: 'A' });
    // If the cache were still a shared module-level Map, resultB would
    // come back as agent A's cached { from: 'A' } instead of actually
    // asking agent B's own provider.
    expect(resultB.extractedData).toEqual({ from: 'B' });
    expect((agentB as any).provider.complete).toHaveBeenCalled();
  });

  it('still caches repeated calls within the same agent instance', async () => {
    const agent = new InterviewAgent(baseConfig());
    const complete = jest.fn().mockResolvedValue('{"value": 1}');
    (agent as any).provider = { complete };

    await agent.askQuestion('q1', 'ctx', 'first answer');
    await agent.askQuestion('q1', 'ctx', 'first answer');

    expect(complete).toHaveBeenCalledTimes(1);
  });
});

describe('InterviewAgent.finalizeProfile', () => {
  it('reports genesis_nft_verified: false with no NftService available', async () => {
    const agent = new InterviewAgent(baseConfig());
    const profile = await agent.finalizeProfile('0xwallet');
    expect(profile.metadata.genesis_nft_verified).toBe(false);
  });

  it('reports genesis_nft_verified based on a real NftService check, not a hardcoded true', async () => {
    const agent = new InterviewAgent(baseConfig());

    const holder = { verifyOwnership: jest.fn().mockResolvedValue(true) } as any;
    const nonHolder = { verifyOwnership: jest.fn().mockResolvedValue(false) } as any;

    const verifiedProfile = await agent.finalizeProfile('0xholder', holder);
    expect(verifiedProfile.metadata.genesis_nft_verified).toBe(true);
    expect(holder.verifyOwnership).toHaveBeenCalledWith('0xholder');

    const unverifiedProfile = await agent.finalizeProfile('0xnonholder', nonHolder);
    expect(unverifiedProfile.metadata.genesis_nft_verified).toBe(false);
  });
});
