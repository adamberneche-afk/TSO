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
