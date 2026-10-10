import { Directory, File, Paths } from 'expo-file-system';

import type { VaultManifest } from '@/lib/vault/vault-contracts';

export interface VaultStorageAdapter {
  loadManifest(): Promise<VaultManifest>;
  saveManifest(manifest: VaultManifest): Promise<void>;
  saveEncryptedFile(fileName: string, data: Uint8Array): Promise<string>;
  readEncryptedFile(fileName: string): Promise<Uint8Array>;
  deleteEncryptedFile(fileName: string): Promise<void>;
  writeDecryptedSessionFile(fileName: string, data: Uint8Array): Promise<string>;
  clearSessionCache(): Promise<void>;
}

const defaultManifest: VaultManifest = {
  version: 1,
  albums: [],
  assets: [],
};

export class FileSystemVaultStorageAdapter implements VaultStorageAdapter {
  private getVaultDirectory(): Directory {
    const dir = new Directory(Paths.document, 'vault');
    if (!dir.exists) {
      dir.create({ idempotent: true });
    }
    return dir;
  }

  private getSessionDirectory(): Directory {
    const dir = new Directory(Paths.cache, 'vault_session');
    if (!dir.exists) {
      dir.create({ idempotent: true });
    }
    return dir;
  }

  async loadManifest(): Promise<VaultManifest> {
    try {
      const vaultDir = this.getVaultDirectory();
      const manifestFile = new File(vaultDir, 'manifest.json');
      if (!manifestFile.exists) {
        return defaultManifest;
      }
      const text = await manifestFile.text();
      const parsed = JSON.parse(text) as VaultManifest;
      if (parsed && Array.isArray(parsed.albums) && Array.isArray(parsed.assets)) {
        return parsed;
      }
      return defaultManifest;
    } catch {
      return defaultManifest;
    }
  }

  async saveManifest(manifest: VaultManifest): Promise<void> {
    const vaultDir = this.getVaultDirectory();
    const manifestFile = new File(vaultDir, 'manifest.json');
    manifestFile.write(JSON.stringify(manifest, null, 2));
  }

  async saveEncryptedFile(fileName: string, data: Uint8Array): Promise<string> {
    const vaultDir = this.getVaultDirectory();
    const file = new File(vaultDir, fileName);
    file.write(data);
    return file.uri;
  }

  async readEncryptedFile(fileName: string): Promise<Uint8Array> {
    const vaultDir = this.getVaultDirectory();
    const file = new File(vaultDir, fileName);
    if (!file.exists) {
      throw new Error(`Encrypted file ${fileName} does not exist.`);
    }
    return file.bytes();
  }

  async deleteEncryptedFile(fileName: string): Promise<void> {
    try {
      const vaultDir = this.getVaultDirectory();
      const file = new File(vaultDir, fileName);
      if (file.exists) {
        file.delete();
      }
    } catch {
      // Ignore deletion errors for missing files
    }
  }

  async writeDecryptedSessionFile(fileName: string, data: Uint8Array): Promise<string> {
    const sessionDir = this.getSessionDirectory();
    const file = new File(sessionDir, fileName);
    file.write(data);
    return file.uri;
  }

  async clearSessionCache(): Promise<void> {
    try {
      const sessionDir = new Directory(Paths.cache, 'vault_session');
      if (sessionDir.exists) {
        sessionDir.delete();
      }
    } catch {
      // Session cache cleanup error
    }
  }
}

export class InMemoryVaultStorageAdapter implements VaultStorageAdapter {
  private manifest: VaultManifest = { ...defaultManifest };
  private encryptedFiles = new Map<string, Uint8Array>();
  private sessionFiles = new Map<string, Uint8Array>();

  async loadManifest(): Promise<VaultManifest> {
    return JSON.parse(JSON.stringify(this.manifest));
  }

  async saveManifest(manifest: VaultManifest): Promise<void> {
    this.manifest = JSON.parse(JSON.stringify(manifest));
  }

  async saveEncryptedFile(fileName: string, data: Uint8Array): Promise<string> {
    this.encryptedFiles.set(fileName, new Uint8Array(data));
    return `memory://vault/${fileName}`;
  }

  async readEncryptedFile(fileName: string): Promise<Uint8Array> {
    const data = this.encryptedFiles.get(fileName);
    if (!data) {
      throw new Error(`Encrypted file ${fileName} not found in memory.`);
    }
    return new Uint8Array(data);
  }

  async deleteEncryptedFile(fileName: string): Promise<void> {
    this.encryptedFiles.delete(fileName);
  }

  async writeDecryptedSessionFile(fileName: string, data: Uint8Array): Promise<string> {
    this.sessionFiles.set(fileName, new Uint8Array(data));
    return `memory://session/${fileName}`;
  }

  async clearSessionCache(): Promise<void> {
    this.sessionFiles.clear();
  }
}

let activeStorageAdapter: VaultStorageAdapter | null = null;

export function getVaultStorageAdapter(): VaultStorageAdapter {
  if (activeStorageAdapter) {
    return activeStorageAdapter;
  }
  try {
    if (Paths?.document) {
      activeStorageAdapter = new FileSystemVaultStorageAdapter();
      return activeStorageAdapter;
    }
  } catch {
    // Fall back to in-memory adapter
  }
  activeStorageAdapter = new InMemoryVaultStorageAdapter();
  return activeStorageAdapter;
}

export function setVaultStorageAdapter(adapter: VaultStorageAdapter | null): void {
  activeStorageAdapter = adapter;
}
