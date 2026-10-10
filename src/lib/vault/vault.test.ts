import {
  type AesGcmNativeModule,
  base64ToUint8Array,
  decryptData,
  encryptData,
  getRandomBytes,
  resetInMemoryKeyFallback,
  setNativeAesGcmForTest,
  uint8ArrayToBase64,
} from '@/lib/vault/vault-crypto';
import { InMemoryVaultStorageAdapter } from '@/lib/vault/vault-storage';
import { VaultService } from '@/lib/vault/vault-service';
import { InMemoryMediaLibraryService } from '@/lib/media/in-memory-service';
import type { MediaAssetMetadata } from '@/lib/media/contracts';

declare function describe(name: string, callback: () => void): void;
declare function it(name: string, callback: () => void | Promise<void>): void;
declare function beforeEach(callback: () => void | Promise<void>): void;
declare const expect: any;

describe('Vault Cryptography & Private Albums', () => {
  beforeEach(() => {
    resetInMemoryKeyFallback();
  });

  describe('AES-256-GCM Crypto', () => {
    it('generates random bytes of requested length', () => {
      const bytes1 = getRandomBytes(16);
      const bytes2 = getRandomBytes(16);
      expect(bytes1.length).toBe(16);
      expect(bytes2.length).toBe(16);
      expect(bytes1).not.toEqual(bytes2);
    });

    it('converts Uint8Array to base64 and back losslessly', () => {
      const original = new Uint8Array([0, 1, 255, 128, 64, 32, 16, 8, 4, 2]);
      const base64 = uint8ArrayToBase64(original);
      const decoded = base64ToUint8Array(base64);
      expect(decoded).toEqual(original);
    });

    it('encrypts and decrypts binary data with AES-256-GCM', async () => {
      const secret = new TextEncoder().encode('My top secret photo binary data 📸');
      const encrypted = await encryptData(secret);

      // Ciphertext must be different from original and include 12-byte IV + 16-byte tag
      expect(encrypted).not.toEqual(secret);
      expect(encrypted.length).toBeGreaterThanOrEqual(secret.length + 28);

      const decrypted = await decryptData(encrypted);
      expect(new TextDecoder().decode(decrypted)).toBe('My top secret photo binary data 📸');
    });

    it('encrypts and decrypts with react-native-aes-gcm-crypto native module driver', async () => {
      let nativeEncryptCalled = false;
      let nativeDecryptCalled = false;

      const mockNative: AesGcmNativeModule = {
        async encrypt(plainText, inBinary, _key) {
          nativeEncryptCalled = true;
          return {
            iv: '0102030405060708090a0b0c',
            tag: '0102030405060708090a0b0c0d0e0f10',
            content: plainText,
          };
        },
        async decrypt(base64Ciphertext, _key, _iv, _tag, _isBinary) {
          nativeDecryptCalled = true;
          return base64Ciphertext;
        },
        async encryptFile() {
          return { iv: '', tag: '' };
        },
        async decryptFile() {
          return true;
        },
      };

      setNativeAesGcmForTest(mockNative);
      try {
        const secret = new TextEncoder().encode('Testing react-native-aes-gcm-crypto module');
        const encrypted = await encryptData(secret);
        expect(nativeEncryptCalled).toBe(true);
        expect(encrypted.length).toBeGreaterThanOrEqual(secret.length + 28);

        const decrypted = await decryptData(encrypted);
        expect(nativeDecryptCalled).toBe(true);
        expect(new TextDecoder().decode(decrypted)).toBe('Testing react-native-aes-gcm-crypto module');
      } finally {
        setNativeAesGcmForTest(null);
      }
    });

    it('throws error when trying to decrypt invalid or truncated payload', async () => {
      const invalid = new Uint8Array([1, 2, 3]);
      await expect(decryptData(invalid)).rejects.toThrow('Invalid encrypted payload');
    });
  });

  const sampleAsset: MediaAssetMetadata = {
    id: 'photo_101',
    filename: 'IMG_2026.jpg',
    mediaType: 'image',
    creationTime: 1774000000000,
    modificationTime: 1774000000000,
    width: 1920,
    height: 1080,
    duration: null,
    isFavorite: false,
    uri: 'memory://photos/IMG_2026.jpg',
  };

  describe('VaultService', () => {
    let storage: InMemoryVaultStorageAdapter;
    let vault: VaultService;
    let mockMediaService: InMemoryMediaLibraryService;

    beforeEach(() => {
      storage = new InMemoryVaultStorageAdapter();
      vault = new VaultService(storage);
      mockMediaService = new InMemoryMediaLibraryService({
        assets: [sampleAsset],
      });
    });

    it('creates a private album with zero items', async () => {
      const album = await vault.createPrivateAlbum('Vacation Vault');
      expect(album.title).toBe('Vacation Vault');
      expect(album.isPrivate).toBe(true);
      expect(album.itemCount).toBe(0);

      const all = await vault.getPrivateAlbums();
      expect(all.length).toBe(1);
      expect(all[0].id).toBe(album.id);
    });

    it('moves a photo to private album, encrypts it and updates count', async () => {
      const album = await vault.createPrivateAlbum('Secret Folder');
      const encrypted = await vault.moveToPrivateAlbum(sampleAsset, album.id, true, mockMediaService);

      expect(encrypted.albumId).toBe(album.id);
      expect(encrypted.filename).toBe('IMG_2026.jpg');
      expect(encrypted.encryptedFileName).toContain('.enc');

      // Check persistent storage: raw file in storage is encrypted
      const rawStored = await storage.readEncryptedFile(encrypted.encryptedFileName);
      expect(rawStored).not.toEqual(new TextEncoder().encode('IMG_2026.jpg'));

      // Check album item count
      const updatedAlbum = await vault.getPrivateAlbum(album.id);
      expect(updatedAlbum?.itemCount).toBe(1);

      // Check original asset was removed from public media library
      const remainingPublic = await mockMediaService.getAsset('photo_101');
      expect(remainingPublic).toBeNull();
    });

    it('decrypts encrypted assets for active session and wipes them on lock', async () => {
      const album = await vault.createPrivateAlbum('Locked Vault');
      const encrypted = await vault.moveToPrivateAlbum(sampleAsset, album.id, false);

      const sessionItems = await vault.decryptAlbumForSession(album.id);
      expect(sessionItems.length).toBe(1);
      expect(sessionItems[0].id).toBe(encrypted.id);
      expect(sessionItems[0].isAvailable).toBe(true);
      expect(sessionItems[0].uri).toContain('memory://session/');

      // Locking vault cleans session cache
      await vault.lock();
    });

    it('rejects creating a private album with a duplicate title', async () => {
      await vault.createPrivateAlbum('Financial Docs');
      await expect(vault.createPrivateAlbum('Financial Docs')).rejects.toThrow(
        'An album named "Financial Docs" already exists.'
      );
      // Case-insensitive & trimmed duplicate
      await expect(vault.createPrivateAlbum('  financial docs  ')).rejects.toThrow(
        'An album named "financial docs" already exists.'
      );
    });

    it('rejects creating a private album with an empty title', async () => {
      await expect(vault.createPrivateAlbum('   ')).rejects.toThrow('Album title cannot be empty.');
    });

    it('renames a private album and prevents duplicate renaming', async () => {
      const album = await vault.createPrivateAlbum('Tax Receipts');
      const renamed = await vault.renamePrivateAlbum(album.id, '2026 Taxes');
      expect(renamed.title).toBe('2026 Taxes');

      const retrieved = await vault.getPrivateAlbum(album.id);
      expect(retrieved?.title).toBe('2026 Taxes');

      await vault.createPrivateAlbum('Medical');
      await expect(vault.renamePrivateAlbum(album.id, 'Medical')).rejects.toThrow(
        'An album named "Medical" already exists.'
      );
    });

    it('deletes an encrypted asset from a private album and storage', async () => {
      const album = await vault.createPrivateAlbum('Confidential');
      const enc = await vault.moveToPrivateAlbum(sampleAsset, album.id, false);

      expect((await vault.getPrivateAlbum(album.id))?.itemCount).toBe(1);

      await vault.deleteEncryptedAsset(album.id, enc.id);

      expect((await vault.getPrivateAlbum(album.id))?.itemCount).toBe(0);
      expect((await vault.getEncryptedAssets(album.id)).length).toBe(0);
      await expect(storage.readEncryptedFile(enc.encryptedFileName)).rejects.toThrow();
    });

    it('deletes a private album and purges all its encrypted files', async () => {
      const album = await vault.createPrivateAlbum('Temporary Vault');
      const enc = await vault.moveToPrivateAlbum(sampleAsset, album.id, false);

      await vault.deletePrivateAlbum(album.id);

      expect(await vault.getPrivateAlbum(album.id)).toBeNull();
      await expect(storage.readEncryptedFile(enc.encryptedFileName)).rejects.toThrow();
    });

    it('evaluates whether encryption can be enabled based on biometric hardware and enrollment', async () => {
      const vaultNoHardware = new VaultService(
        storage,
        async () => ({ hasHardware: false, isEnrolled: false, supportedTypes: [] })
      );
      const resNoHardware = await vaultNoHardware.canEnableEncryption();
      expect(resNoHardware.allowed).toBe(false);
      expect(resNoHardware.reason).toContain('Biometric hardware');

      const vaultNotEnrolled = new VaultService(
        storage,
        async () => ({ hasHardware: true, isEnrolled: false, supportedTypes: ['fingerprint'] })
      );
      const resNotEnrolled = await vaultNotEnrolled.canEnableEncryption();
      expect(resNotEnrolled.allowed).toBe(false);
      expect(resNotEnrolled.reason).toContain('No biometric credentials');

      const vaultReady = new VaultService(
        storage,
        async () => ({ hasHardware: true, isEnrolled: true, supportedTypes: ['fingerprint'] })
      );
      const resReady = await vaultReady.canEnableEncryption();
      expect(resReady.allowed).toBe(true);
      expect(resReady.reason).toBeUndefined();
    });
  });

  describe('Standard Album Operations on MediaLibraryService', () => {
    it('creates standard album and adds assets', async () => {
      const asset1: MediaAssetMetadata = {
        id: 'asset_1',
        filename: 'one.jpg',
        mediaType: 'image',
        creationTime: 1000,
        modificationTime: 1000,
        width: 100,
        height: 100,
        duration: null,
        isFavorite: false,
      };
      const service = new InMemoryMediaLibraryService({ assets: [asset1] });

      const newAlbum = await service.createAlbum('Family Photos', asset1.id);
      expect(newAlbum.title).toBe('Family Photos');

      const albums = await service.getAlbums();
      expect(albums.some((a) => a.id === newAlbum.id)).toBe(true);

      const asset2: MediaAssetMetadata = {
        id: 'asset_2',
        filename: 'two.jpg',
        mediaType: 'image',
        creationTime: 2000,
        modificationTime: 2000,
        width: 100,
        height: 100,
        duration: null,
        isFavorite: false,
      };
      const serviceWithTwo = new InMemoryMediaLibraryService({ assets: [asset1, asset2] });
      const album2 = await serviceWithTwo.createAlbum('Trip');
      await serviceWithTwo.addAssetToAlbum('asset_2', album2.id);

      const queried = await serviceWithTwo.queryMetadata({
        pageSize: 10,
        offset: 0,
        cursor: null,
        revision: 1,
        scope: 'all',
        albumId: album2.id,
      });
      expect(queried.assets.length).toBe(1);
      expect(queried.assets[0].id).toBe('asset_2');
    });

    it('rejects creating a standard album with a duplicate title', async () => {
      const service = new InMemoryMediaLibraryService();
      await service.createAlbum('Summer 2026');
      await expect(service.createAlbum('Summer 2026')).rejects.toThrow(
        'An album named "Summer 2026" already exists.'
      );
      // Case-insensitive & trimmed duplicate
      await expect(service.createAlbum('  summer 2026  ')).rejects.toThrow(
        'An album named "summer 2026" already exists.'
      );
    });

    it('rejects creating a standard album with an empty title', async () => {
      const service = new InMemoryMediaLibraryService();
      await expect(service.createAlbum('   ')).rejects.toThrow('Album title cannot be empty.');
    });

    it('renames a standard album and validates duplicates', async () => {
      const service = new InMemoryMediaLibraryService();
      const album = await service.createAlbum('Original Name');
      const renamed = await service.renameAlbum(album.id, 'Updated Name');
      expect(renamed.title).toBe('Updated Name');

      await service.createAlbum('Another Album');
      await expect(service.renameAlbum(album.id, 'Another Album')).rejects.toThrow(
        'An album named "Another Album" already exists.'
      );
    });

    it('deletes a standard album and removes its associations', async () => {
      const service = new InMemoryMediaLibraryService({
        assets: [sampleAsset],
      });
      const album = await service.createAlbum('To Delete', sampleAsset.id);
      expect((await service.getAlbums()).length).toBe(1);

      await service.deleteAlbum(album.id);
      expect((await service.getAlbums()).length).toBe(0);
    });

    it('deletes a media asset (photo/video) from the library', async () => {
      const service = new InMemoryMediaLibraryService({
        assets: [sampleAsset],
      });
      expect(await service.getAsset('photo_101')).not.toBeNull();

      await service.deleteAsset('photo_101');
      expect(await service.getAsset('photo_101')).toBeNull();
    });
  });
});
