/**
 * Signature verification utilities -- verifies real Ethereum message
 * signatures (ECDSA, recovered via ethers.verifyMessage). Mirrors
 * packages/registry/src/utils/signature.ts.
 */

import { ethers } from 'ethers';

export interface SignatureVerificationResult {
  valid: boolean;
  walletAddress?: string;
  error?: string;
}

/**
 * Verify an Ethereum message signature.
 * @param message The original message that was signed
 * @param signature The signature to verify
 * @param expectedAddress The expected signer address (optional)
 * @returns Verification result with recovered address if valid
 */
export function verifySignature(
  message: string,
  signature: string,
  expectedAddress?: string
): SignatureVerificationResult {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (expectedAddress) {
      if (recoveredAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
        return {
          valid: false,
          error: 'Signature does not match expected address',
        };
      }
    }

    return {
      valid: true,
      walletAddress: recoveredAddress,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid signature',
    };
  }
}

export default {
  verifySignature,
};
