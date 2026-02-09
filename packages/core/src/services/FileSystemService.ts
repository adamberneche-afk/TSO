import fs from 'fs/promises';
import path from 'path';
import { App } from 'electron';
import { UserProfile } from '@think/types';

export class FileSystemService {
  private profileDir: string;
  private profilePath: string;
  private backupPath: string;

  constructor(electronApp: App) {
    this.profileDir = electronApp.getPath('userData');
    this.profilePath = path.join(this.profileDir, 'user_profile.json');
    this.backupPath = path.join(this.profileDir, 'user_profile.json.backup');
  }

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.profilePath);
      return true;
    } catch {
      return false;
    }
  }

  async read(): Promise<UserProfile | null> {
    try {
      const data = await fs.readFile(this.profilePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async readBackup(): Promise<UserProfile | null> {
    try {
      const data = await fs.readFile(this.backupPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async write(profile: UserProfile): Promise<void> {
    const tempPath = `${this.profilePath}.tmp`;
    await fs.mkdir(this.profileDir, { recursive: true });

    if (await this.exists()) {
      await fs.copyFile(this.profilePath, this.backupPath);
    }

    await fs.writeFile(tempPath, JSON.stringify(profile, null, 2), 'utf-8');
    await fs.rename(tempPath, this.profilePath);

    if (process.platform !== 'win32') {
      await fs.chmod(this.profilePath, 0o600);
    }
  }
}
