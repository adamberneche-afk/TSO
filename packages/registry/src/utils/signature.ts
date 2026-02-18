/**
 * Signature verification utilities
 * Verifies Ethereum message signatures
 */

import { ethers } from 'ethers';

export interface SignatureVerificationResult {
  valid: boolean;
  walletAddress?: string;
  error?: string;
}

/**
 * Verify an Ethereum message signature
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
    // Recover the address from the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    // If expected address provided, verify it matches
    if (expectedAddress) {
      if (recoveredAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
        return {
          valid: false,
          error: 'Signature does not match expected address'
        };
      }
    }
    
    return {
      valid: true,
      walletAddress: recoveredAddress
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid signature'
    };
  }
}

/**
 * Verify a typed data signature (EIP-712)
 * @param domain EIP-712 domain
 * @param types EIP-712 types
 * @param value The data that was signed
 * @param signature The signature to verify
 * @param expectedAddress The expected signer address (optional)
 * @returns Verification result
 */
export function verifyTypedDataSignature(
  domain: ethers.TypedDataDomain,
  types: Record<string, Array<ethers.TypedDataField>>,
  value: Record<string, any>,
  signature: string,
  expectedAddress?: string
): SignatureVerificationResult {
  try {
    const recoveredAddress = ethers.verifyTypedData(domain, types, value, signature);
    
    if (expectedAddress) {
      if (recoveredAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
        return {
          valid: false,
          error: 'Signature does not match expected address'
        };
      }
    }
    
    return {
      valid: true,
      walletAddress: recoveredAddress
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid signature'
    };
  }
}

export default {
  verifySignature,
  verifyTypedDataSignature
};
