/**
 * Wallet Address Utilities
 * Provides consistent wallet address normalization and validation
 */

import { ethers } from 'ethers';

/**
 * Normalizes a wallet address to lowercase checksum format
 * Returns null if address is invalid
 */
export function normalizeWalletAddress(address: string | undefined | null): string | null {
  if (!address || typeof address !== 'string') {
    return null;
  }

  // Remove 0x prefix if present for validation
  const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
  
  // Basic validation - should be 40 hex characters
  if (!/^[0-9a-fA-F]{40}$/.test(cleanAddress)) {
    return null;
  }

  // Return lowercase with 0x prefix for consistency
  return `0x${cleanAddress.toLowerCase()}`;
}

/**
 * Validates if a string is a valid Ethereum wallet address
 */
export function isValidWalletAddress(address: string | undefined | null): boolean {
  return normalizeWalletAddress(address) !== null;
}

/**
 * Compares two wallet addresses for equality (case-insensitive)
 */
export function walletAddressesEqual(addr1: string | undefined | null, addr2: string | undefined | null): boolean {
  const norm1 = normalizeWalletAddress(addr1);
  const norm2 = normalizeWalletAddress(addr2);
  return norm1 !== null && norm2 !== null && norm1 === norm2;
}