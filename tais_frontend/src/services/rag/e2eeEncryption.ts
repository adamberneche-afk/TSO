/**
 * E2EE Encryption Service for Public RAG
 * Handles encryption/decryption of documents and chunks
 * Uses ECDH (Elliptic Curve Diffie-Hellman) with HKDF and AES-256-GCM
 * 
 * Security Model: ECIES-like scheme
 * - Key pairs generated using Web Crypto API (P-384 curve)
 * - Hybrid encryption: ECDH for key exchange, AES-GCM for data
 * - HKDF for key derivation from shared secrets
 * - All crypto operations use browser's native Web Crypto API
 */

import { ethers } from 'ethers';
import type { PublicRAGKeyPair } from '../../types/rag-public';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const DERIVATION_MESSAGE = 'TAIS Public RAG Encryption Key v2';
const STORAGE_KEY = 'public_rag_keypair_v2';
const CURVE = 'P-384';
const COMMUNITY_SALT = 'TAIS-RAG-COMMUNITY-SHARED-KEY-v1'; // NIST P-384 curve for strong security

// Encrypted key pair storage format
interface StoredKeyPair {
  publicKeyJwk: JsonWebKey;
  encryptedPrivateKey: string;
  iv: string;
  salt: string;
  createdAt: number;
}

export class E2EEEncryptionService {
  private keyPair: {
    publicKey: CryptoKey;
    privateKey: CryptoKey;
    publicKeyBase64: string;
  } | null = null;

  /**
   * Initialize or load existing key pair
   */
  async initialize(signer?: ethers.JsonRpcSigner): Promise<void> {
    // Try to load existing key pair
    const stored = await this.loadStoredKeyPair();
    if (stored) {
      this.keyPair = stored;
      return;
    }

    // Generate new key pair if signer provided
    if (signer) {
      await this.generateKeyPair(signer);
    }
  }

  /**
   * Generate ECDH key pair using Web Crypto API
   * Private key encrypted with wallet-derived key for storage
   */
  async generateKeyPair(signer: ethers.JsonRpcSigner): Promise<PublicRAGKeyPair> {
    // Generate ECDH key pair using P-384 curve
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: CURVE,
      },
      true, // extractable for encryption before storage
      ['deriveBits', 'deriveKey']
    );

    // Export public key for sharing
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const publicKeyBase64 = this.jwkToBase64(publicKeyJwk);

    // Derive encryption key from wallet for securing the private key
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const walletKey = await this.deriveKeyFromWallet(signer, salt);

    // Export and encrypt private key
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    const privateKeyJson = JSON.stringify(privateKeyJwk);
    const encryptedPrivateKey = await this.encryptWithKey(walletKey, privateKeyJson);

    // Store encrypted key pair
    const storedData: StoredKeyPair = {
      publicKeyJwk,
      encryptedPrivateKey: encryptedPrivateKey.encrypted,
      iv: encryptedPrivateKey.iv,
      salt: this.arrayBufferToBase64(salt),
      createdAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedData));

    // Import keys back into non-extractable format for use
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      publicKeyJwk,
      { name: 'ECDH', namedCurve: CURVE },
      false,
      []
    );

    const privateKey = await crypto.subtle.importKey(
      'jwk',
      privateKeyJwk,
      { name: 'ECDH', namedCurve: CURVE },
      false,
      ['deriveBits', 'deriveKey']
    );

    this.keyPair = {
      publicKey,
      privateKey,
      publicKeyBase64,
    };

    return {
      publicKey: publicKeyBase64,
      privateKey: '[encrypted]', // Never expose raw private key
      createdAt: Date.now(),
    };
  }

  /**
   * Derive AES key from wallet signature
   */
  private async deriveKeyFromWallet(
    signer: ethers.JsonRpcSigner,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    const message = DERIVATION_MESSAGE + this.arrayBufferToBase64(salt);
    const signature = await signer.signMessage(message);

    // Use signature as key material
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(signature),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Derive AES key using PBKDF2
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data with AES-GCM using provided key
   */
  private async encryptWithKey(
    key: CryptoKey,
    data: string
  ): Promise<{ encrypted: string; iv: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(data)
    );

    return {
      encrypted: this.arrayBufferToBase64(new Uint8Array(encrypted)),
      iv: this.arrayBufferToBase64(iv),
    };
  }

  /**
   * Decrypt data with AES-GCM using provided key
   */
  private async decryptWithKey(
    key: CryptoKey,
    encrypted: string,
    iv: string
  ): Promise<string> {
    const encryptedBytes = this.base64ToArrayBuffer(encrypted);
    const ivBytes = this.base64ToArrayBuffer(iv);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      encryptedBytes
    );

    return new TextDecoder().decode(decrypted);
  }

  /**
   * Load and decrypt stored key pair
   */
  private async loadStoredKeyPair(): Promise<{
    publicKey: CryptoKey;
    privateKey: CryptoKey;
    publicKeyBase64: string;
  } | null> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const data: StoredKeyPair = JSON.parse(stored);

      // Import public key
      const publicKey = await crypto.subtle.importKey(
        'jwk',
        data.publicKeyJwk,
        { name: 'ECDH', namedCurve: CURVE },
        false,
        []
      );

      // Check if wallet is available to decrypt private key
      if (!window.ethereum) return null;

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = await provider.getSigner();

      // Derive wallet key and decrypt private key
      const salt = this.base64ToArrayBuffer(data.salt);
      const walletKey = await this.deriveKeyFromWallet(signer, salt);
      const privateKeyJson = await this.decryptWithKey(
        walletKey,
        data.encryptedPrivateKey,
        data.iv
      );

      const privateKeyJwk: JsonWebKey = JSON.parse(privateKeyJson);
      const privateKey = await crypto.subtle.importKey(
        'jwk',
        privateKeyJwk,
        { name: 'ECDH', namedCurve: CURVE },
        false,
        ['deriveBits', 'deriveKey']
      );

      return {
        publicKey,
        privateKey,
        publicKeyBase64: this.jwkToBase64(data.publicKeyJwk),
      };
    } catch (error) {
      console.error('Failed to load stored key pair:', error);
      return null;
    }
  }

  /**
   * Encrypt data with AES-256-GCM using wallet-derived key
   * Returns encrypted data with IV and salt
   */
  async encrypt(data: string, signer?: ethers.JsonRpcSigner): Promise<{ encrypted: string; iv: string; salt: string }> {
    if (!signer) {
      if (!window.ethereum) {
        throw new Error('No wallet detected');
      }
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      signer = await provider.getSigner();
    }

    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Derive encryption key from wallet
    const key = await this.deriveKeyFromWallet(signer, salt);

    // Encrypt data
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    return {
      encrypted: this.arrayBufferToBase64(new Uint8Array(encryptedBuffer)),
      iv: this.arrayBufferToBase64(iv),
      salt: this.arrayBufferToBase64(salt)
    };
  }

  /**
   * Decrypt data with AES-256-GCM using wallet-derived key
   */
  async decrypt(encrypted: string, iv: string, salt: string, signer?: ethers.JsonRpcSigner): Promise<string> {
    if (!signer) {
      if (!window.ethereum) {
        throw new Error('No wallet detected');
      }
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      signer = await provider.getSigner();
    }

    // Derive same key from wallet
    const saltBytes = this.base64ToArrayBuffer(salt);
    const key = await this.deriveKeyFromWallet(signer, saltBytes);

    // Decrypt
    const encryptedBytes = this.base64ToArrayBuffer(encrypted);
    const ivBytes = this.base64ToArrayBuffer(iv);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      encryptedBytes
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  /**
   * Encrypt data for community/public documents
   * Uses a shared community salt so anyone can decrypt
   */
  async encryptForCommunity(data: string): Promise<{ encrypted: string; iv: string; salt: string }> {
    const salt = this.stringToArrayBuffer(COMMUNITY_SALT);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const key = await this.deriveKeyFromMessage(COMMUNITY_SALT, salt);

    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    return {
      encrypted: this.arrayBufferToBase64(new Uint8Array(encryptedBuffer)),
      iv: this.arrayBufferToBase64(iv),
      salt: this.arrayBufferToBase64(salt)
    };
  }

  /**
   * Decrypt community/public documents
   * Uses the shared community salt
   */
  async decryptCommunity(encrypted: string, iv: string, salt: string): Promise<string> {
    const saltBytes = this.base64ToArrayBuffer(salt);
    
    // Verify this is actually a community document (uses community salt)
    if (this.arrayBufferToBase64(saltBytes) !== this.arrayBufferToBase64(this.stringToArrayBuffer(COMMUNITY_SALT))) {
      throw new Error('Invalid salt for community document');
    }

    const key = await this.deriveKeyFromMessage(COMMUNITY_SALT, saltBytes);

    const encryptedBytes = this.base64ToArrayBuffer(encrypted);
    const ivBytes = this.base64ToArrayBuffer(iv);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      encryptedBytes
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  /**
   * Derive key from a message string (used for community key)
   */
  private async deriveKeyFromMessage(message: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(message),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Check if a salt is the community salt
   */
  isCommunitySalt(salt: string): boolean {
    try {
      const saltBytes = this.base64ToArrayBuffer(salt);
      return this.arrayBufferToBase64(saltBytes) === this.arrayBufferToBase64(this.stringToArrayBuffer(COMMUNITY_SALT));
    } catch {
      return false;
    }
  }

  /**
   * Convert string to ArrayBuffer
   */
  private stringToArrayBuffer(str: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(str);
  }

  /**
   * Encrypt data for specific recipient using their public key
   * Uses ECIES-like scheme:
   * 1. Generate ephemeral ECDH key pair
   * 2. Derive shared secret using ECDH with recipient's public key
   * 3. Use HKDF to derive AES key from shared secret
   * 4. Encrypt data with AES-GCM
   * 5. Return ephemeral public key + encrypted data + IV
   */
  async encryptForRecipient(data: string, recipientPublicKey: string): Promise<{
    encryptedData: string;
    ephemeralPublicKey: string;
    iv: string;
  }> {
    // Parse recipient's public key
    const recipientKeyJwk = this.base64ToJwk(recipientPublicKey);
    const recipientPublicKeyCrypto = await crypto.subtle.importKey(
      'jwk',
      recipientKeyJwk,
      { name: 'ECDH', namedCurve: CURVE },
      false,
      []
    );

    // Generate ephemeral ECDH key pair
    const ephemeralKeyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: CURVE,
      },
      true,
      ['deriveBits', 'deriveKey']
    );

    // Derive shared secret using ECDH
    const sharedSecret = await crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: recipientPublicKeyCrypto,
      },
      ephemeralKeyPair.privateKey,
      384 // P-384 generates 384-bit shared secret
    );

    // Use HKDF to derive AES key from shared secret
    const aesKey = await this.deriveAESKeyFromSharedSecret(sharedSecret);

    // Encrypt data with AES-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encoder.encode(data)
    );

    // Export ephemeral public key
    const ephemeralPublicKeyJwk = await crypto.subtle.exportKey(
      'jwk',
      ephemeralKeyPair.publicKey
    );

    return {
      encryptedData: this.arrayBufferToBase64(new Uint8Array(encryptedData)),
      ephemeralPublicKey: this.jwkToBase64(ephemeralPublicKeyJwk),
      iv: this.arrayBufferToBase64(iv),
    };
  }

  /**
   * Derive AES-256-GCM key from shared secret using HKDF
   */
  private async deriveAESKeyFromSharedSecret(sharedSecret: ArrayBuffer): Promise<CryptoKey> {
    // Import shared secret as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      sharedSecret,
      { name: 'HKDF' },
      false,
      ['deriveKey']
    );

    // Derive AES key using HKDF
    // Salt is empty (context-specific), info distinguishes this use case
    return crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new ArrayBuffer(0),
        info: new TextEncoder().encode('TAIS-RAG-Encryption-v1'),
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Decrypt data encrypted for this user
   * Uses the recipient's private key to derive the same shared secret
   */
  async decryptFromSender(
    encryptedData: string,
    ephemeralPublicKey: string,
    iv: string
  ): Promise<string> {
    if (!this.keyPair) {
      throw new Error('Key pair not initialized');
    }

    // Parse ephemeral public key from sender
    const ephemeralKeyJwk = this.base64ToJwk(ephemeralPublicKey);
    const ephemeralPublicKeyCrypto = await crypto.subtle.importKey(
      'jwk',
      ephemeralKeyJwk,
      { name: 'ECDH', namedCurve: CURVE },
      false,
      []
    );

    // Derive same shared secret using our private key + sender's ephemeral public key
    const sharedSecret = await crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: ephemeralPublicKeyCrypto,
      },
      this.keyPair.privateKey,
      384
    );

    // Derive same AES key using HKDF
    const aesKey = await this.deriveAESKeyFromSharedSecret(sharedSecret);

    // Decrypt data
    const ivBytes = this.base64ToArrayBuffer(iv);
    const encryptedBytes = this.base64ToArrayBuffer(encryptedData);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      aesKey,
      encryptedBytes
    );

    return new TextDecoder().decode(decrypted);
  }

  /**
   * Get current public key
   */
  getPublicKey(): string | null {
    return this.keyPair?.publicKeyBase64 || null;
  }

  /**
   * Clear stored key pair
   */
  clearKeyPair(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.keyPair = null;
  }

  /**
   * Convert JWK to Base64 string
   */
  private jwkToBase64(jwk: JsonWebKey): string {
    const json = JSON.stringify(jwk);
    const bytes = new TextEncoder().encode(json);
    return this.arrayBufferToBase64(bytes);
  }

  /**
   * Convert Base64 string back to JWK
   */
  private base64ToJwk(base64: string): JsonWebKey {
    const bytes = this.base64ToArrayBuffer(base64);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  }

  /**
   * Utility: Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: Uint8Array | ArrayBuffer): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Utility: Convert Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): Uint8Array {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch (e: any) {
      console.error('[base64ToArrayBuffer] Invalid base64:', base64?.slice(0, 100), 'Error:', e.message);
      throw new Error(`Invalid base64 encoding: ${e.message}`);
    }
  }
}

// Singleton instance
let e2eeServiceInstance: E2EEEncryptionService | null = null;

export function getE2EEEncryptionService(): E2EEEncryptionService {
  if (!e2eeServiceInstance) {
    e2eeServiceInstance = new E2EEEncryptionService();
  }
  return e2eeServiceInstance;
}

export default E2EEEncryptionService;
