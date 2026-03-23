// TAIS Platform - Ethereum Address Validation and Normalization
/**
 * Normalizes and validates an Ethereum address.
 * Removes whitespace, ensures 0x prefix, filters to hex characters only,
 * and verifies exact length of 40 hex characters.
 * 
 * @param address - Potential Ethereum address (any type)
 * @returns Normalized address string or null if invalid
 */
export function normalizeEthAddress(address: unknown): string | null {
  // Handle non-string inputs
  if (typeof address !== 'string') {
    return null;
  }
  
  // Trim whitespace (handles leading/trailing spaces, tabs, etc.)
  let trimmed = address.trim();
  
  // Handle addresses that might not have 0x prefix
  if (!trimmed.startsWith('0x')) {
    trimmed = '0x' + trimmed;
  }
  
  // Extract the hex part (after 0x)
  const hexPart = trimmed.slice(2);
  
  // Remove any non-hexadecimal characters (keeps only 0-9, a-f, A-F)
  const cleanHex = hexPart.replace(/[^0-9a-fA-F]/g, '');
  
  // Check if we have exactly 40 hex characters
  if (cleanHex.length !== 40) {
    return null;
  }
  
  // Return normalized address (lowercase for consistency)
  return '0x' + cleanHex.toLowerCase();
}

/**
 * Checks if an address is a valid Ethereum address format.
 * 
 * @param address - Value to check
 * @returns True if valid Ethereum address format
 */
export function isValidEthAddress(address: unknown): boolean {
  return normalizeEthAddress(address) !== null;
}