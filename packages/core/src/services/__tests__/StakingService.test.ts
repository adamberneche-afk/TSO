// Regression test for the executeUnstake typo: this file previously called
// contract.ununstake(...), a method that doesn't exist on the real staking
// contract's ABI (only `unstake` does) -- unstaking was permanently broken
// for every user. The mock below only implements `unstake`, exactly like
// the real contract, so calling the wrong method name fails the test the
// same way it fails in production: a TypeError, not a silent no-op.

const mockUnstake = jest.fn().mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) });

jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers');
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
      Contract: jest.fn().mockImplementation(() => ({
        unstake: mockUnstake,
        // Deliberately no `ununstake` -- matches the real contract's ABI.
      })),
    },
  };
});

import { StakingService } from '../StakingService';
import { ethers } from 'ethers';
import fs from 'fs';

describe('StakingService.executeUnstake', () => {
  beforeEach(() => {
    mockUnstake.mockClear();
  });

  it('calls the real contract method `unstake`, not a typo\'d `ununstake`', async () => {
    const service = new StakingService('http://localhost:8545', '/tmp/staking-test');
    const fakeSigner = {} as ethers.Signer;

    const result = await service.executeUnstake('0xWallet', '10', fakeSigner);

    expect(result.success).toBe(true);
    expect(mockUnstake).toHaveBeenCalledTimes(1);
    expect(mockUnstake).toHaveBeenCalledWith(ethers.parseUnits('10', 18));
  });
});

// Regression test for the dead signed-cache subsystem: calculateStakingWeight
// used to be a pure cache reader (`const cacheEntry = this.cacheMap.get(...);
// if (!cacheEntry) return 0;`) -- but nothing anywhere in this class ever
// populated cacheMap with a live balance. loadCache() only restores what a
// previous saveCache() call wrote, and saveCache() was never invoked from
// anywhere. So this always returned 0 for every wallet, forever, which fed
// straight into IsnadService.calculateTrustScore's staking-weight component
// (used by the real, exercised SkillInstaller.getSkillInfo() trust score).
describe('StakingService.calculateStakingWeight', () => {
  function freshService(): StakingService {
    // A fresh, never-before-used userDataPath each time, so no leftover
    // cache file from a previous test run can produce a false cache hit.
    const dir = `/tmp/staking-weight-test-${Date.now()}-${Math.random()}`;
    fs.mkdirSync(dir, { recursive: true });
    return new StakingService('http://localhost:8545', dir);
  }

  it('computes a real weight from a live fetch instead of returning 0 on a cache miss', async () => {
    const service = freshService();
    const getTokenBalance = jest.spyOn(service, 'getTokenBalance').mockResolvedValue({
      tokenAddress: '0xthink',
      tokenType: 'ERC20',
      balance: '50',
      decimals: 18,
      symbol: 'THINK',
    } as any);
    const getStakingInfo = jest.spyOn(service, 'getStakingInfo').mockResolvedValue({
      stakedAmount: '150', // crosses the 100-threshold -> 0.6 weight
      rewardsAmount: '2',
      currentEpoch: 1,
      totalStaked: '100000',
      canUnstake: true,
      unstakePenalty: 0,
    });

    const weight = await service.calculateStakingWeight('0xwallet');

    expect(weight).toBe(0.6);
    expect(getTokenBalance).toHaveBeenCalledWith('0xwallet');
    expect(getStakingInfo).toHaveBeenCalledWith('0xwallet');
  });

  it('reuses the cached weight within the TTL instead of re-fetching', async () => {
    const service = freshService();
    const getStakingInfo = jest.spyOn(service, 'getStakingInfo').mockResolvedValue({
      stakedAmount: '5000',
      rewardsAmount: '0',
      currentEpoch: 1,
      totalStaked: '100000',
      canUnstake: true,
      unstakePenalty: 0,
    });
    jest.spyOn(service, 'getTokenBalance').mockResolvedValue(null);

    const first = await service.calculateStakingWeight('0xwallet');
    const second = await service.calculateStakingWeight('0xwallet');

    expect(first).toBe(0.8);
    expect(second).toBe(0.8);
    expect(getStakingInfo).toHaveBeenCalledTimes(1);
  });

  it('still returns 0 when the wallet has no stake at all', async () => {
    const service = freshService();
    jest.spyOn(service, 'getTokenBalance').mockResolvedValue(null);
    jest.spyOn(service, 'getStakingInfo').mockResolvedValue({
      stakedAmount: '0',
      rewardsAmount: '0',
      currentEpoch: 1,
      totalStaked: '100000',
      canUnstake: true,
      unstakePenalty: 0,
    });

    const weight = await service.calculateStakingWeight('0xwallet');
    expect(weight).toBe(0);
  });
});
