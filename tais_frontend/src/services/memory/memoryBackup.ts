import { ethers } from 'ethers';
import { getMemoryDB } from './types';

const STORAGE_KEY = 'tais_memory_backup_directory';
const MEMORY_FILE_NAME = 'tais_memories_backup.json';

interface MemoryBackupData {
  version: string;
  exportedAt: string;
  walletAddress: string;
  encryptedData: string;
  iv: string;
  salt: string;
}

async function deriveKeyFromWallet(signer: ethers.JsonRpcSigner, salt: Uint8Array): Promise<CryptoKey> {
  const address = await signer.getAddress();
  const message = `TAIS Memory Backup Encryption\nWallet: ${address}\nSalt: ${Array.from(salt).join(',')}`;
  
  const signature = await signer.signMessage(message);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signature),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
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

export async function chooseMemoryBackupFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('Your browser does not support folder selection. Try Chrome or Edge.');
  }

  try {
    const dirHandle = await (window as any).showDirectoryPicker({
      mode: 'readwrite'
    });
    
    if (await dirHandle.queryPermission({ mode: 'readwrite' }) === 'granted') {
      localStorage.setItem(STORAGE_KEY, dirHandle.name);
      return dirHandle;
    }
    
    const permission = await dirHandle.requestPermission({ mode: 'readwrite' });
    if (permission === 'granted') {
      localStorage.setItem(STORAGE_KEY, dirHandle.name);
      return dirHandle;
    }
    
    return null;
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      throw err;
    }
    return null;
  }
}

export function getStoredBackupFolderName(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export async function exportMemoriesToLocal(
  signer: ethers.JsonRpcSigner
): Promise<{ success: boolean; count: number; message: string }> {
  try {
    const dirHandle = await chooseMemoryBackupFolder();
    if (!dirHandle) {
      return { success: false, count: 0, message: 'No folder selected' };
    }

    const db = await getMemoryDB();
    const memories = {
      active: await db.getAll('activeMemory'),
      reflective: await db.getAll('reflectiveMemory'),
      immutable: await db.getAll('immutableMemory'),
      core: await db.getAll('coreMemory'),
      meta: await db.getAll('metaMemory'),
    };

    const totalCount = 
      memories.active.length + 
      memories.reflective.length + 
      memories.immutable.length + 
      memories.core.length;

    if (totalCount === 0) {
      return { success: false, count: 0, message: 'No memories to export' };
    }

    const plainData = JSON.stringify(memories);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptionKey = await deriveKeyFromWallet(signer, salt);
    
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      encryptionKey,
      new TextEncoder().encode(plainData)
    );

    const backupData: MemoryBackupData = {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      walletAddress: await signer.getAddress(),
      encryptedData: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
      iv: btoa(String.fromCharCode(...iv)),
      salt: btoa(String.fromCharCode(...salt)),
    };

    const fileHandle = await dirHandle.getFileHandle(MEMORY_FILE_NAME, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(backupData, null, 2));
    await writable.close();

    return { 
      success: true, 
      count: totalCount, 
      message: `Exported ${totalCount} memories to ${dirHandle.name}` 
    };
  } catch (err) {
    console.error('Export failed:', err);
    return { 
      success: false, 
      count: 0, 
      message: err instanceof Error ? err.message : 'Export failed' 
    };
  }
}

export async function importMemoriesFromLocal(
  signer: ethers.JsonRpcSigner
): Promise<{ success: boolean; count: number; message: string }> {
  try {
    const dirHandle = await chooseMemoryBackupFolder();
    if (!dirHandle) {
      return { success: false, count: 0, message: 'No folder selected' };
    }

    let fileHandle: FileSystemFileHandle;
    try {
      fileHandle = await dirHandle.getFileHandle(MEMORY_FILE_NAME);
    } catch {
      return { success: false, count: 0, message: 'No backup found in selected folder' };
    }

    const file = await fileHandle.getFile();
    const backupData: MemoryBackupData = JSON.parse(await file.text());

    if (backupData.walletAddress.toLowerCase() !== (await signer.getAddress()).toLowerCase()) {
      return { 
        success: false, 
        count: 0, 
        message: 'Backup was created with a different wallet' 
      };
    }

    const salt = new Uint8Array(atob(backupData.salt).split('').map(c => c.charCodeAt(0)));
    const iv = new Uint8Array(atob(backupData.iv).split('').map(c => c.charCodeAt(0)));
    const encryptedData = new Uint8Array(atob(backupData.encryptedData).split('').map(c => c.charCodeAt(0)));

    const encryptionKey = await deriveKeyFromWallet(signer, salt);
    
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      encryptionKey,
      encryptedData
    );

    const memories = JSON.parse(new TextDecoder().decode(decryptedData));

    const db = await getMemoryDB();

    let count = 0;
    for (const mem of memories.active || []) {
      await db.put('activeMemory', mem);
      count++;
    }
    for (const mem of memories.reflective || []) {
      await db.put('reflectiveMemory', mem);
      count++;
    }
    for (const mem of memories.immutable || []) {
      await db.put('immutableMemory', mem);
      count++;
    }
    for (const mem of memories.core || []) {
      await db.put('coreMemory', mem);
      count++;
    }
    for (const mem of memories.meta || []) {
      await db.put('metaMemory', mem);
    }

    return { 
      success: true, 
      count, 
      message: `Imported ${count} memories` 
    };
  } catch (err) {
    console.error('Import failed:', err);
    return { 
      success: false, 
      count: 0, 
      message: err instanceof Error ? err.message : 'Import failed - wrong wallet or corrupted backup' 
    };
  }
}

export async function hasLocalBackup(): Promise<boolean> {
  const folderName = getStoredBackupFolderName();
  if (!folderName) return false;
  
  try {
    if (!('showDirectoryPicker' in window)) return false;
    
    const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    const fileHandle = await dirHandle.getFileHandle(MEMORY_FILE_NAME);
    return !!fileHandle;
  } catch {
    return false;
  }
}
