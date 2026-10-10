import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AssetGrid } from '@/components/media/asset-grid';
import { ActionButton } from '@/components/ui/action-button';
import { AppBar } from '@/components/ui/app-bar';
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal';
import { NotificationCard, type NotificationItem } from '@/components/ui/notification-card';
import { RenameAlbumModal } from '@/components/albums/rename-album-modal';
import { Screen } from '@/components/ui/screen';
import { useSettings } from '@/context/settings-context';
import { useVault } from '@/context/vault-context';
import { useViewerContext } from '@/context/viewer-context';
import { useTheme } from '@/hooks/use-theme';
import type { MediaAssetMetadata } from '@/lib/media/contracts';
import type { DecryptedSessionAsset } from '@/lib/vault/vault-contracts';

export default function PrivateAlbumDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const albumId = Array.isArray(id) ? id[0] : id;
  const vault = useVault();
  const viewer = useViewerContext();
  const { settings } = useSettings();

  const isUnlocked = Boolean(albumId && vault.isUnlocked(albumId));
  const album = useMemo(
    () => vault.vaultAlbums.find((a) => a.id === albumId) ?? null,
    [albumId, vault.vaultAlbums]
  );
  const existingVaultTitles = useMemo(
    () => vault.vaultAlbums.map((a) => a.title),
    [vault.vaultAlbums]
  );

  const [decryptedAssets, setDecryptedAssets] = useState<DecryptedSessionAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renameVisible, setRenameVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [notification, setNotification] = useState<NotificationItem | null>(null);

  const loadDecrypted = useCallback(async () => {
    if (!albumId || !isUnlocked) return;
    setLoading(true);
    setError(null);
    try {
      const items = await vault.getDecryptedAssets(albumId);
      setDecryptedAssets(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not decrypt album contents.');
    } finally {
      setLoading(false);
    }
  }, [albumId, isUnlocked, vault]);

  useEffect(() => {
    let active = true;
    if (!albumId || !isUnlocked) {
      return;
    }
    void vault.getDecryptedAssets(albumId).then(
      (items) => {
        if (active) {
          setDecryptedAssets(items);
          setLoading(false);
        }
      },
      (err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not decrypt album contents.');
          setLoading(false);
        }
      }
    );
    return () => {
      active = false;
    };
  }, [albumId, isUnlocked, vault]);

  const handleUnlock = async () => {
    if (!albumId) return;
    const ok = await vault.unlockAlbum(albumId);
    if (!ok) {
      setError(vault.error ?? 'Authentication failed.');
    }
  };

  const handleLock = async () => {
    await vault.lockVault();
    router.back();
  };

  const handleRename = async (newTitle: string) => {
    if (!albumId) return;
    await vault.renamePrivateAlbum(albumId, newTitle);
    setNotification({
      id: String(Date.now()),
      type: 'album-renamed',
      title: 'Vault Renamed',
      message: `Private vault renamed to "${newTitle}".`,
    });
  };

  const handleDelete = async () => {
    if (!albumId) return;
    const title = album?.title ?? 'Private Vault';
    await vault.deletePrivateAlbum(albumId);
    setNotification({
      id: String(Date.now()),
      type: 'deleted-item',
      title: 'Private Vault Deleted',
      message: `Vault "${title}" and its encrypted files were permanently deleted.`,
    });
    setTimeout(() => {
      router.back();
    }, 1100);
  };

  // Convert DecryptedSessionAsset to MediaAssetMetadata format for AssetGrid / Viewer
  const gridAssets: MediaAssetMetadata[] = decryptedAssets.map((asset) => ({
    id: asset.id,
    filename: asset.filename,
    mediaType: asset.mediaType,
    creationTime: asset.creationTime,
    modificationTime: asset.modificationTime,
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
    isFavorite: asset.isFavorite,
    uri: asset.uri,
  }));

  if (!isUnlocked) {
    return (
      <Screen navigationInset={false}>
        <AppBar
          title="Private Album"
          subtitle="Biometric Protection"
          onBack={() => router.back()}
        />
        <View style={styles.lockedContainer}>
          <View
            style={[
              styles.lockCard,
              { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant },
            ]}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={[styles.lockedTitle, { color: theme.onSurface }]}>
              {album?.title ?? 'Private Album'}
            </Text>
            <Text style={[styles.lockedSubtitle, { color: theme.onSurfaceVariant }]}>
              This album is encrypted with AES-256. Scan your fingerprint or Face ID to decrypt and
              view its contents.
            </Text>
            {vault.error || error ? (
              <Text style={[styles.errorText, { color: theme.error }]}>
                {vault.error ?? error}
              </Text>
            ) : null}
            <View style={styles.lockActions}>
              <ActionButton
                label={vault.status === 'authenticating' ? 'Scanning…' : 'Scan to Unlock'}
                variant="filled"
                onPress={() => void handleUnlock()}
                disabled={vault.status === 'authenticating'}
              />
            </View>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen navigationInset={false}>
      <NotificationCard
        notification={notification}
        onDismiss={() => setNotification(null)}
      />
      <AppBar
        title={album?.title ?? 'Private Album'}
        subtitle={`🔒 ${decryptedAssets.length} encrypted photo${decryptedAssets.length === 1 ? '' : 's'}`}
        onBack={() => router.back()}
        actions={[
          <ActionButton
            key="rename"
            label="Rename ✏️"
            variant="tonal"
            onPress={() => setRenameVisible(true)}
          />,
          <ActionButton
            key="delete"
            label="Delete 🗑️"
            variant="outlined"
            onPress={() => setDeleteVisible(true)}
          />,
          <ActionButton
            key="lock"
            label="Lock 🔒"
            variant="tonal"
            onPress={() => void handleLock()}
          />,
        ]}
      />
      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.onSurfaceVariant }]}>
              Decrypting photos in memory…
            </Text>
          </View>
        ) : (
          <AssetGrid
            assets={gridAssets}
            columns={settings.tilesPerRow}
            onAssetPress={(asset, index) => {
              viewer.open(gridAssets, index);
              router.push({
                pathname: '/asset/[id]',
                params: { id: asset.id, vaultAlbumId: albumId },
              });
            }}
            onEndReached={() => undefined}
            hasMore={false}
            refreshing={loading}
            onRefresh={loadDecrypted}
            loading={loading}
            error={error}
            onRetry={loadDecrypted}
            emptyTitle="This private album is empty"
            emptyMessage="Move photos here from the viewer or library to encrypt them."
          />
        )}
      </View>

      <RenameAlbumModal
        visible={renameVisible}
        initialTitle={album?.title ?? 'Private Album'}
        onClose={() => setRenameVisible(false)}
        onRename={handleRename}
        existingAlbumNames={existingVaultTitles}
      />

      <ConfirmDeleteModal
        visible={deleteVisible}
        title="Delete Private Vault?"
        message={`Are you sure you want to permanently delete "${album?.title ?? 'this vault'}"? All encrypted items inside will be erased from storage.`}
        confirmLabel="Delete Vault"
        onClose={() => setDeleteVisible(false)}
        onConfirm={handleDelete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    gap: 14,
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: 4,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  lockedSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  lockActions: {
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
});
