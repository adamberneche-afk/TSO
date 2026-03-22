import { app } from 'electron';
import { safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const SERVICE_NAME = 'THINK_TAIS';

export class CredentialManager {
  private getStoragePath(): string {
    return path.join(app.getPath('userData'), 'byok_key.enc');
  }

  isEncryptionAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  setByokKey(apiKey: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error(
        "SECURITY_ERROR: System does not support secure key storage. " +
        "Please enable a Keyring (Mac Keychain, Windows Credential Manager, Gnome Keyring) to use this feature."
      );
    }

    const encrypted = safeStorage.encryptString(apiKey);
    const storagePath = this.getStoragePath();
    // Ensure the directory exists
    const dir = path.dirname(storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(storagePath, encrypted);
    console.log('Key encrypted and stored securely.');
  }

  getByokKey(): string | null {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("SECURITY_ERROR: Encryption system unavailable.");
    }

    const storagePath = this.getStoragePath();
    try {
      const encryptedBuffer = fs.readFileSync(storagePath);
      return safeStorage.decryptString(encryptedBuffer);
    } catch (error) {
      // If the file doesn't exist or decryption fails, return null
      return null;
    }
  }

  clearKeys(): void {
    const storagePath = this.getStoragePath();
    try {
      fs.unlinkSync(storagePath);
      console.log('Keys cleared');
    } catch (error) {
      // Ignore if file doesn't exist
      console.log('No keys to clear');
    }
  }
}
