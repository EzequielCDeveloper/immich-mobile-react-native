import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useMediaContext } from '@/context/media-context';
import type { MediaAssetMetadata } from '@/lib/media/contracts';
import type {
  BiometricCapabilities,
  DecryptedSessionAsset,
  EncryptedAsset,
  PrivateAlbum,
} from '@/lib/vault/vault-contracts';
import { getVaultService, VaultService } from '@/lib/vault/vault-service';

type VaultContextValue = {
  vaultAlbums: PrivateAlbum[];
  unlockedAlbumId: string | null;
  isUnlocked: (albumId: string) => boolean;
  unlockAlbum: (albumId: string) => Promise<boolean>;
  lockVault: () => Promise<void>;
  createPrivateAlbum: (title: string) => Promise<PrivateAlbum>;
  renamePrivateAlbum: (albumId: string, newTitle: string) => Promise<PrivateAlbum>;
  deletePrivateAlbum: (albumId: string) => Promise<void>;
  deleteEncryptedAsset: (albumId: string, assetId: string) => Promise<void>;
  moveToPrivateAlbum: (
    asset: MediaAssetMetadata,
    albumId: string,
    deleteOriginal?: boolean
  ) => Promise<EncryptedAsset>;
  getDecryptedAssets: (albumId: string) => Promise<DecryptedSessionAsset[]>;
  biometrics: BiometricCapabilities;
  canEnableEncryption: boolean;
  encryptionUnavailableReason?: string;
  refresh: () => Promise<void>;
  status: 'idle' | 'authenticating' | 'loading';
  error: string | null;
};

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({
  children,
  service: providedService,
}: PropsWithChildren<{ service?: VaultService }>) {
  const vaultService = useMemo(() => providedService ?? getVaultService(), [providedService]);
  const media = useMediaContext();
  const [vaultAlbums, setVaultAlbums] = useState<PrivateAlbum[]>([]);
  const [unlockedAlbumId, setUnlockedAlbumId] = useState<string | null>(null);
  const [biometrics, setBiometrics] = useState<BiometricCapabilities>({
    hasHardware: false,
    isEnrolled: false,
    supportedTypes: [],
  });
  const [encryptionCheck, setEncryptionCheck] = useState<{ allowed: boolean; reason?: string }>({
    allowed: true,
  });
  const [status, setStatus] = useState<'idle' | 'authenticating' | 'loading'>('idle');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const albums = await vaultService.getPrivateAlbums();
      setVaultAlbums(albums);
      const bio = await vaultService.checkBiometrics();
      setBiometrics(bio);
      const encCheck = await vaultService.canEnableEncryption();
      setEncryptionCheck(encCheck);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh private albums.');
    }
  }, [vaultService]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const albums = await vaultService.getPrivateAlbums();
        const bio = await vaultService.checkBiometrics();
        if (active) {
          setVaultAlbums(albums);
          setBiometrics(bio);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not refresh private albums.');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [vaultService]);

  const lockVault = useCallback(async () => {
    setUnlockedAlbumId(null);
    await vaultService.lock();
  }, [vaultService]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState !== 'active') {
        void lockVault();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [lockVault]);

  const unlockAlbum = useCallback(
    async (albumId: string): Promise<boolean> => {
      if (unlockedAlbumId === albumId) {
        return true;
      }
      setStatus('authenticating');
      setError(null);
      const auth = await vaultService.authenticate('Scan fingerprint or Face ID to unlock private album');
      setStatus('idle');
      if (auth.success) {
        setUnlockedAlbumId(albumId);
        return true;
      }
      setError(auth.error ?? 'Biometric verification failed.');
      return false;
    },
    [unlockedAlbumId, vaultService]
  );

  const isUnlocked = useCallback(
    (albumId: string) => unlockedAlbumId === albumId,
    [unlockedAlbumId]
  );

  const createPrivateAlbum = useCallback(
    async (title: string): Promise<PrivateAlbum> => {
      const album = await vaultService.createPrivateAlbum(title);
      await refresh();
      return album;
    },
    [refresh, vaultService]
  );

  const moveToPrivateAlbum = useCallback(
    async (
      asset: MediaAssetMetadata,
      albumId: string,
      deleteOriginal: boolean = true
    ): Promise<EncryptedAsset> => {
      setStatus('loading');
      try {
        const encrypted = await vaultService.moveToPrivateAlbum(
          asset,
          albumId,
          deleteOriginal,
          media.service
        );
        media.refreshLibrary();
        await refresh();
        setStatus('idle');
        return encrypted;
      } catch (err) {
        setStatus('idle');
        throw err;
      }
    },
    [media, refresh, vaultService]
  );

  const getDecryptedAssets = useCallback(
    async (albumId: string): Promise<DecryptedSessionAsset[]> => {
      return vaultService.decryptAlbumForSession(albumId);
    },
    [vaultService]
  );

  const renamePrivateAlbum = useCallback(
    async (albumId: string, newTitle: string): Promise<PrivateAlbum> => {
      const album = await vaultService.renamePrivateAlbum(albumId, newTitle);
      await refresh();
      return album;
    },
    [refresh, vaultService]
  );

  const deletePrivateAlbum = useCallback(
    async (albumId: string): Promise<void> => {
      await vaultService.deletePrivateAlbum(albumId);
      await refresh();
    },
    [refresh, vaultService]
  );

  const deleteEncryptedAsset = useCallback(
    async (albumId: string, assetId: string): Promise<void> => {
      await vaultService.deleteEncryptedAsset(albumId, assetId);
      await refresh();
    },
    [refresh, vaultService]
  );

  const value = useMemo(
    () => ({
      vaultAlbums,
      unlockedAlbumId,
      isUnlocked,
      unlockAlbum,
      lockVault,
      createPrivateAlbum,
      renamePrivateAlbum,
      deletePrivateAlbum,
      deleteEncryptedAsset,
      moveToPrivateAlbum,
      getDecryptedAssets,
      biometrics,
      canEnableEncryption: encryptionCheck.allowed,
      encryptionUnavailableReason: encryptionCheck.reason,
      refresh,
      status,
      error,
    }),
    [
      biometrics,
      createPrivateAlbum,
      deleteEncryptedAsset,
      deletePrivateAlbum,
      encryptionCheck.allowed,
      encryptionCheck.reason,
      error,
      getDecryptedAssets,
      isUnlocked,
      lockVault,
      moveToPrivateAlbum,
      refresh,
      renamePrivateAlbum,
      status,
      unlockAlbum,
      unlockedAlbumId,
      vaultAlbums,
    ]
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const value = useContext(VaultContext);
  if (!value) {
    throw new Error('useVault must be used within VaultProvider');
  }
  return value;
}
