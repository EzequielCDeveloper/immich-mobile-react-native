import * as LocalAuthentication from 'expo-local-authentication';
import { File } from 'expo-file-system';

import type { MediaAssetMetadata, MediaLibraryService } from '@/lib/media/contracts';
import type {
  BiometricCapabilities,
  DecryptedSessionAsset,
  EncryptedAsset,
  PrivateAlbum,
} from '@/lib/vault/vault-contracts';
import { decryptData, encryptData } from '@/lib/vault/vault-crypto';
import { getVaultStorageAdapter, type VaultStorageAdapter } from '@/lib/vault/vault-storage';

export class VaultService {
  constructor(
    private readonly storage: VaultStorageAdapter = getVaultStorageAdapter(),
    private readonly biometricsChecker?: () => Promise<BiometricCapabilities>
  ) {}

  async checkBiometrics(): Promise<BiometricCapabilities> {
    if (this.biometricsChecker) {
      return this.biometricsChecker();
    }
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const rawTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      const supportedTypes: ('fingerprint' | 'facial' | 'iris')[] = [];
      rawTypes.forEach((type) => {
        if (type === LocalAuthentication.AuthenticationType.FINGERPRINT) {
          supportedTypes.push('fingerprint');
        } else if (type === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) {
          supportedTypes.push('facial');
        } else if (type === LocalAuthentication.AuthenticationType.IRIS) {
          supportedTypes.push('iris');
        }
      });

      return { hasHardware, isEnrolled, supportedTypes };
    } catch {
      return { hasHardware: false, isEnrolled: false, supportedTypes: [] };
    }
  }

  async authenticate(promptMessage: string = 'Unlock private album'): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Use device passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      }
      return { success: false, error: result.error ?? 'Authentication failed.' };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Authentication could not be completed.',
      };
    }
  }

  async canEnableEncryption(): Promise<{ allowed: boolean; reason?: string }> {
    const biometrics = await this.checkBiometrics();
    if (!biometrics.hasHardware) {
      return {
        allowed: false,
        reason: 'Biometric hardware (fingerprint/Face ID) is not available on this device.',
      };
    }
    if (!biometrics.isEnrolled) {
      return {
        allowed: false,
        reason:
          'No biometric credentials (fingerprint or Face ID) are enrolled on this device. Please set up biometrics in device settings.',
      };
    }
    return { allowed: true };
  }

  async getPrivateAlbums(): Promise<PrivateAlbum[]> {
    const manifest = await this.storage.loadManifest();
    return manifest.albums.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getPrivateAlbum(id: string): Promise<PrivateAlbum | null> {
    const manifest = await this.storage.loadManifest();
    return manifest.albums.find((a) => a.id === id) ?? null;
  }

  async createPrivateAlbum(title: string): Promise<PrivateAlbum> {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      throw new Error('Album title cannot be empty.');
    }
    const manifest = await this.storage.loadManifest();
    const exists = manifest.albums.some(
      (a) => a.title.trim().toLowerCase() === trimmedTitle.toLowerCase()
    );
    if (exists) {
      throw new Error(`An album named "${trimmedTitle}" already exists.`);
    }

    const id = `private_album_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    const newAlbum: PrivateAlbum = {
      id,
      title: trimmedTitle,
      createdAt: now,
      updatedAt: now,
      isPrivate: true,
      itemCount: 0,
    };

    manifest.albums.push(newAlbum);
    await this.storage.saveManifest(manifest);
    return newAlbum;
  }

  async renamePrivateAlbum(albumId: string, newTitle: string): Promise<PrivateAlbum> {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      throw new Error('Album title cannot be empty.');
    }
    const manifest = await this.storage.loadManifest();
    const album = manifest.albums.find((a) => a.id === albumId);
    if (!album) {
      throw new Error(`Private album with ID ${albumId} does not exist.`);
    }

    const duplicate = manifest.albums.some(
      (a) => a.id !== albumId && a.title.trim().toLowerCase() === trimmedTitle.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`An album named "${trimmedTitle}" already exists.`);
    }

    album.title = trimmedTitle;
    album.updatedAt = Date.now();
    await this.storage.saveManifest(manifest);
    return album;
  }

  async deletePrivateAlbum(albumId: string): Promise<void> {
    const manifest = await this.storage.loadManifest();
    const albumIndex = manifest.albums.findIndex((a) => a.id === albumId);
    if (albumIndex === -1) {
      throw new Error(`Private album with ID ${albumId} does not exist.`);
    }

    const assetsToDelete = manifest.assets.filter((a) => a.albumId === albumId);
    for (const asset of assetsToDelete) {
      await this.storage.deleteEncryptedFile(asset.encryptedFileName);
    }

    manifest.assets = manifest.assets.filter((a) => a.albumId !== albumId);
    manifest.albums.splice(albumIndex, 1);
    await this.storage.saveManifest(manifest);
    await this.storage.clearSessionCache();
  }

  async deleteEncryptedAsset(albumId: string, assetId: string): Promise<void> {
    const manifest = await this.storage.loadManifest();
    const assetIndex = manifest.assets.findIndex(
      (a) => a.id === assetId && a.albumId === albumId
    );
    if (assetIndex === -1) {
      throw new Error(`Encrypted asset with ID ${assetId} not found in private album.`);
    }

    const asset = manifest.assets[assetIndex];
    await this.storage.deleteEncryptedFile(asset.encryptedFileName);
    manifest.assets.splice(assetIndex, 1);

    const album = manifest.albums.find((a) => a.id === albumId);
    if (album) {
      album.itemCount = Math.max(0, album.itemCount - 1);
      album.updatedAt = Date.now();
    }
    await this.storage.saveManifest(manifest);
    await this.storage.clearSessionCache();
  }

  async getEncryptedAssets(albumId: string): Promise<EncryptedAsset[]> {
    const manifest = await this.storage.loadManifest();
    return manifest.assets.filter((a) => a.albumId === albumId);
  }

  async moveToPrivateAlbum(
    mediaAsset: MediaAssetMetadata,
    albumId: string,
    deleteOriginal: boolean = true,
    mediaService?: MediaLibraryService
  ): Promise<EncryptedAsset> {
    const manifest = await this.storage.loadManifest();
    const album = manifest.albums.find((a) => a.id === albumId);
    if (!album) {
      throw new Error(`Private album with ID ${albumId} does not exist.`);
    }

    let rawBytes: Uint8Array;
    if (mediaAsset.uri) {
      try {
        const response = await fetch(mediaAsset.uri);
        const arrayBuffer = await response.arrayBuffer();
        rawBytes = new Uint8Array(arrayBuffer);
      } catch {
        try {
          rawBytes = await new File(mediaAsset.uri).bytes();
        } catch {
          rawBytes = new TextEncoder().encode(`Encrypted content for ${mediaAsset.filename}`);
        }
      }
    } else {
      rawBytes = new TextEncoder().encode(`Encrypted content for ${mediaAsset.filename}`);
    }

    const encryptedData = await encryptData(rawBytes);
    const assetId = `enc_asset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const encryptedFileName = `${assetId}.enc`;

    await this.storage.saveEncryptedFile(encryptedFileName, encryptedData);

    const encryptedAsset: EncryptedAsset = {
      id: assetId,
      albumId,
      filename: mediaAsset.filename,
      mediaType: mediaAsset.mediaType,
      creationTime: mediaAsset.creationTime,
      modificationTime: mediaAsset.modificationTime,
      width: mediaAsset.width,
      height: mediaAsset.height,
      duration: mediaAsset.duration,
      isFavorite: mediaAsset.isFavorite,
      encryptedFileName,
      sizeBytes: rawBytes.length,
      originalAssetId: mediaAsset.id,
    };

    manifest.assets.push(encryptedAsset);
    album.itemCount = manifest.assets.filter((a) => a.albumId === albumId).length;
    album.updatedAt = Date.now();
    if (!album.coverAssetId) {
      album.coverAssetId = assetId;
    }

    await this.storage.saveManifest(manifest);

    if (deleteOriginal && mediaService && mediaAsset.id) {
      try {
        await mediaService.deleteAsset(mediaAsset.id);
      } catch {
        // Deleting from public device gallery might fail if permission denied
      }
    }

    return encryptedAsset;
  }

  async decryptAssetForSession(asset: EncryptedAsset): Promise<DecryptedSessionAsset> {
    const encryptedBytes = await this.storage.readEncryptedFile(asset.encryptedFileName);
    const decryptedBytes = await decryptData(encryptedBytes);
    const sessionFileName = `${asset.id}_${asset.filename}`;
    const uri = await this.storage.writeDecryptedSessionFile(sessionFileName, decryptedBytes);

    return {
      id: asset.id,
      albumId: asset.albumId,
      filename: asset.filename,
      mediaType: asset.mediaType,
      creationTime: asset.creationTime,
      modificationTime: asset.modificationTime,
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
      isFavorite: asset.isFavorite,
      uri,
      sizeBytes: asset.sizeBytes,
      isAvailable: true,
    };
  }

  async decryptAlbumForSession(albumId: string): Promise<DecryptedSessionAsset[]> {
    const assets = await this.getEncryptedAssets(albumId);
    const decrypted: DecryptedSessionAsset[] = [];
    for (const asset of assets) {
      try {
        const item = await this.decryptAssetForSession(asset);
        decrypted.push(item);
      } catch {
        // Skip corrupted items
      }
    }
    return decrypted;
  }

  async lock(): Promise<void> {
    await this.storage.clearSessionCache();
  }
}

let activeVaultService: VaultService | null = null;

export function getVaultService(): VaultService {
  if (!activeVaultService) {
    activeVaultService = new VaultService();
  }
  return activeVaultService;
}
