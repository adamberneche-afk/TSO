// Regression test for verifyMinThinkTokens comparing a formatted decimal
// balance against a raw base-units minimum.
//
// thinkBalance.balance is already a human-readable decimal string (it's
// ethers.formatUnits'd in getTokenBalance), e.g. "10.5". The buggy code
// did `BigInt(thinkBalance.balance) >= amount` where `amount` is
// minAmount scaled up to base units via parseUnits (e.g. 5 THINK ->
// 5000000000000000000n). BigInt("10.5") throws on any fractional
// balance (caught, silently returning false); even a whole-number
// balance like "10" compares 10n against 5000000000000000000n and is
// always false. The publisher gate this backs blocked every wallet.

import { TokenService } from '../TokenService';
import fs from 'fs';

const THINK_TOKEN_ADDRESS = '0xF9ff95468cb9A0cD57b8542bbc4c148e290Ff465';

describe('TokenService.verifyMinThinkTokens', () => {
  // getTokenHoldings does real network calls via ethers.Contract; stub it
  // directly rather than mocking the provider/contract layer.
  function serviceWithHoldings(balance: string) {
    const service = Object.create(TokenService.prototype) as TokenService;
    (service as any).getTokenHoldings = jest.fn().mockResolvedValue({
      address: '0xwallet',
      holdings: [
        {
          tokenAddress: THINK_TOKEN_ADDRESS,
          tokenType: 'ERC20',
          balance,
          decimals: 18,
          symbol: 'THINK',
        },
      ],
    });
    return service;
  }

  it('passes a wallet whose fractional balance exceeds the minimum', async () => {
    const service = serviceWithHoldings('10.5');
    await expect(service.verifyMinThinkTokens('5', '0xwallet')).resolves.toBe(true);
  });

  it('passes a wallet whose whole-number balance exceeds the minimum', async () => {
    const service = serviceWithHoldings('100');
    await expect(service.verifyMinThinkTokens('10', '0xwallet')).resolves.toBe(true);
  });

  it('rejects a wallet whose balance is below the minimum', async () => {
    const service = serviceWithHoldings('1.5');
    await expect(service.verifyMinThinkTokens('10', '0xwallet')).resolves.toBe(false);
  });
});

// Regression test for the dead signed-cache subsystem: calculateTrustScore
// used to be a pure cache reader (`const cacheEntry = this.cacheMap.get(...);
// if (!cacheEntry) return 0;`) -- but nothing anywhere in this class ever
// populated cacheMap with a live balance. loadCache() only restores what a
// previous saveCache() call wrote, and saveCache() was never invoked from
// anywhere. So this always returned 0 for every wallet, forever.
describe('TokenService.calculateTrustScore', () => {
  function freshService(): TokenService {
    const dir = `/tmp/token-trust-test-${Date.now()}-${Math.random()}`;
    fs.mkdirSync(dir, { recursive: true });
    return new TokenService('http://localhost:8545', dir);
  }

  it('computes a real trust score from a live fetch instead of returning 0 on a cache miss', async () => {
    const service = freshService();
    const getTokenBalance = jest.spyOn(service, 'getTokenBalance').mockResolvedValue({
      tokenAddress: THINK_TOKEN_ADDRESS,
      tokenType: 'ERC20',
      balance: '1500', // crosses the 1000-threshold -> 0.8 trust score
      decimals: 18,
      symbol: 'THINK',
    } as any);

    const score = await service.calculateTrustScore('0xwallet');

    expect(score).toBe(0.8);
    expect(getTokenBalance).toHaveBeenCalledWith('0xwallet');
  });

  it('reuses the cached score within the TTL instead of re-fetching', async () => {
    const service = freshService();
    const getTokenBalance = jest.spyOn(service, 'getTokenBalance').mockResolvedValue({
      tokenAddress: THINK_TOKEN_ADDRESS,
      tokenType: 'ERC20',
      balance: '50000',
      decimals: 18,
      symbol: 'THINK',
    } as any);

    const first = await service.calculateTrustScore('0xwallet');
    const second = await service.calculateTrustScore('0xwallet');

    expect(first).toBe(1.0);
    expect(second).toBe(1.0);
    expect(getTokenBalance).toHaveBeenCalledTimes(1);
  });

  it('still returns 0 for a wallet with no balance', async () => {
    const service = freshService();
    jest.spyOn(service, 'getTokenBalance').mockResolvedValue({
      tokenAddress: THINK_TOKEN_ADDRESS,
      tokenType: 'ERC20',
      balance: '0',
      decimals: 18,
      symbol: 'THINK',
    } as any);

    const score = await service.calculateTrustScore('0xwallet');
    expect(score).toBe(0);
  });
});
