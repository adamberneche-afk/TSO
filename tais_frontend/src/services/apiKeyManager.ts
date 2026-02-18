import { ethers } from 'ethers';

const ENCRYPTION_MESSAGE = "TAIS Configuration Encryption Key";
const STORAGE_KEY = 'encrypted_api_keys';

export interface EncryptedApiKey {
  provider: string;
  encryptedData: string;
  iv: string;
  createdAt: number;
}

export interface ApiKeyStore {
  [provider: string]: EncryptedApiKey;
}

/**
 * Derive encryption key from wallet signature
 * Uses the user's wallet to create a unique encryption key
 */
export async function deriveEncryptionKey(
  signer: ethers.JsonRpcSigner
): Promise<CryptoKey> {
  // User signs a static message
  const signature = await signer.signMessage(ENCRYPTION_MESSAGE);
  
  // Use signature hash as encryption key material
  const keyMaterial = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(signature)
  );
  
  // Import as AES-GCM key
  return crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt API key using wallet-derived key
 */
export async function encryptApiKey(
  apiKey: string,
  signer: ethers.JsonRpcSigner
): Promise<{ encryptedData: string; iv: string }> {
  const key = await deriveEncryptionKey(signer);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(apiKey)
  );
  
  // Convert to base64 strings for storage
  const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  const ivBase64 = btoa(String.fromCharCode(...iv));
  
  return {
    encryptedData: encryptedBase64,
    iv: ivBase64
  };
}

/**
 * Decrypt API key using wallet signature
 * Will prompt user to sign message
 */
export async function decryptApiKey(
  encryptedData: string,
  iv: string,
  signer: ethers.JsonRpcSigner
): Promise<string> {
  const key = await deriveEncryptionKey(signer);
  
  // Convert from base64
  const encrypted = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const ivArray = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivArray },
    key,
    encrypted
  );
  
  return new TextDecoder().decode(decrypted);
}

/**
 * Save encrypted API key to localStorage
 */
export function saveApiKey(
  provider: string,
  encryptedData: string,
  iv: string
): void {
  try {
    const existing = getStoredApiKeys();
    existing[provider] = {
      provider,
      encryptedData,
      iv,
      createdAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error('Failed to save API key:', error);
    throw new Error('Failed to save API key securely');
  }
}

/**
 * Get stored encrypted API keys
 */
export function getStoredApiKeys(): ApiKeyStore {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Failed to load API keys:', error);
    return {};
  }
}

/**
 * Get specific provider's encrypted key
 */
export function getStoredApiKey(provider: string): EncryptedApiKey | null {
  const keys = getStoredApiKeys();
  return keys[provider] || null;
}

/**
 * Delete stored API key for provider
 */
export function deleteApiKey(provider: string): void {
  try {
    const existing = getStoredApiKeys();
    delete existing[provider];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error('Failed to delete API key:', error);
  }
}

/**
 * Check if API key exists for provider
 */
export function hasApiKey(provider: string): boolean {
  return !!getStoredApiKey(provider);
}

/**
 * Clear all stored API keys
 */
export function clearAllApiKeys(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get decrypted API key for provider
 * This will prompt user to sign message
 */
export async function getDecryptedApiKey(
  provider: string,
  signer: ethers.JsonRpcSigner
): Promise<string | null> {
  const stored = getStoredApiKey(provider);
  if (!stored) return null;
  
  try {
    return await decryptApiKey(stored.encryptedData, stored.iv, signer);
  } catch (error) {
    console.error('Failed to decrypt API key:', error);
    return null;
  }
}
