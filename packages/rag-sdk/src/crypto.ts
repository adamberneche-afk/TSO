export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  salt: string;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

function getSubtle(): SubtleCrypto {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return crypto.subtle;
  }
  throw new Error('Web Crypto API not available. Use a browser or Node.js 18+.');
}

export async function generateKeyPair(): Promise<KeyPair> {
  const subtle = getSubtle();
  
  const keyPair = await subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-384',
    },
    true,
    ['deriveKey']
  );

  const publicKeyBuffer = await subtle.exportKey('raw', keyPair.publicKey);
  const privateKeyBuffer = await subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicKey: bufferToBase64(new Uint8Array(publicKeyBuffer)),
    privateKey: bufferToBase64(new Uint8Array(privateKeyBuffer)),
  };
}

export async function generateAESKey(): Promise<{ key: CryptoKey; raw: string }> {
  const subtle = getSubtle();
  
  const key = await subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );

  const rawKey = await subtle.exportKey('raw', key);
  
  return {
    key,
    raw: bufferToBase64(new Uint8Array(rawKey)),
  };
}

export async function importAESKey(rawKeyBase64: string): Promise<CryptoKey> {
  const subtle = getSubtle();
  const rawKey = base64ToBuffer(rawKeyBase64);
  
  return subtle.importKey(
    'raw',
    rawKey.buffer as ArrayBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptDocument(
  content: string,
  key: CryptoKey
): Promise<EncryptionResult> {
  const subtle = getSubtle();
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const data = encoder.encode(content);

  const encryptedBuffer = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );

  return {
    encryptedData: bufferToBase64(new Uint8Array(encryptedBuffer)),
    iv: bufferToBase64(iv),
    salt: bufferToBase64(salt),
  };
}

export async function decryptContent(
  encryptedData: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  const subtle = getSubtle();
  
  const encryptedBuffer = base64ToBuffer(encryptedData);
  const iv = base64ToBuffer(ivBase64);

  const decryptedBuffer = await subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer,
    },
    key,
    encryptedBuffer.buffer as ArrayBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

export async function generateEmbeddingHash(content: string): Promise<string> {
  const subtle = getSubtle();
  
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await subtle.digest('SHA-256', data);
  return bufferToHex(new Uint8Array(hashBuffer));
}

export function bufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function createChunks(content: string, chunkSize: number = 500, overlap: number = 50): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < content.length) {
    const end = Math.min(start + chunkSize, content.length);
    chunks.push(content.slice(start, end));
    start += chunkSize - overlap;
    if (start < 0) start = 0;
  }

  return chunks;
}

export async function encryptChunks(
  chunks: string[],
  key: CryptoKey
): Promise<Array<{ encryptedContent: string; iv: string; embeddingHash: string }>> {
  const encryptedChunks = [];

  for (const chunk of chunks) {
    const { encryptedData, iv } = await encryptDocument(chunk, key);
    const embeddingHash = await generateEmbeddingHash(chunk);

    encryptedChunks.push({
      encryptedContent: encryptedData,
      iv,
      embeddingHash,
    });
  }

  return encryptedChunks;
}
