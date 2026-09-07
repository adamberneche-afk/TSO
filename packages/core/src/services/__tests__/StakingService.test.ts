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
