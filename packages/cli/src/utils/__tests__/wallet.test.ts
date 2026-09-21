// Regression test for the CLI having no real wallet-signing
// infrastructure at all: audit.ts used to hardcode auditor_wallet as the
// zero address and signature as 32 zero bytes ("Would get from
// config" / "Would sign"), so nothing it submitted could ever pass real
// signature verification. loadSigningWallet() is the minimal real
// alternative: load an actual private key and construct a real
// ethers.Wallet capable of genuinely signing.

import { ethers } from 'ethers';
import { loadSigningWallet } from '../wallet';

describe('loadSigningWallet', () => {
  const originalKey = process.env.TAIS_PRIVATE_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.TAIS_PRIVATE_KEY;
    } else {
      process.env.TAIS_PRIVATE_KEY = originalKey;
    }
  });

  it('throws a clear error when no private key is configured', () => {
    delete process.env.TAIS_PRIVATE_KEY;
    expect(() => loadSigningWallet()).toThrow(/TAIS_PRIVATE_KEY/);
  });

  it('throws a clear error for a malformed private key', () => {
    process.env.TAIS_PRIVATE_KEY = 'not-a-real-private-key';
    expect(() => loadSigningWallet()).toThrow(/not a valid private key/i);
  });

  it('returns a real, working wallet for a valid private key', () => {
    const testWallet = ethers.Wallet.createRandom();
    process.env.TAIS_PRIVATE_KEY = testWallet.privateKey;

    const wallet = loadSigningWallet();

    expect(wallet.address).toBe(testWallet.address);

    // It must be able to genuinely sign -- not just hold an address.
    const signature = wallet.signMessageSync('test payload');
    expect(ethers.verifyMessage('test payload', signature)).toBe(testWallet.address);
  });
});
