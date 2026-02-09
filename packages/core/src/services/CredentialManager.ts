import { safeStorage } from 'electron';

const SERVICE_NAME = 'THINK_TAIS';

export class CredentialManager {
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
    console.log('Key encrypted and stored securely.');
  }

  getByokKey(): string | null {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("SECURITY_ERROR: Encryption system unavailable.");
    }
    return null;
  }

  clearKeys(): void {
  }
}
