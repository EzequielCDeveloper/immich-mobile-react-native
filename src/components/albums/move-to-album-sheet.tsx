import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ActionButton } from '@/components/ui/action-button';
import { CreateAlbumModal } from '@/components/albums/create-album-modal';
import { useMediaContext } from '@/context/media-context';
import { useVault } from '@/context/vault-context';
import { useTheme } from '@/hooks/use-theme';
import type { MediaAlbum, MediaAssetMetadata } from '@/lib/media/contracts';

export type MoveToAlbumSheetProps = {
  visible: boolean;
  asset: MediaAssetMetadata | null;
  onClose: () => void;
  onSuccess?: (albumTitle: string, isPrivate: boolean, createdNewAlbum?: boolean) => void;
};

export function MoveToAlbumSheet({
  visible,
  asset,
  onClose,
  onSuccess,
}: MoveToAlbumSheetProps) {
  const theme = useTheme();
  const media = useMediaContext();
  const vault = useVault();
  const [standardAlbums, setStandardAlbums] = useState<MediaAlbum[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const existingAlbumNames = useMemo(() => {
    const std = standardAlbums.map((a) => a.title);
    const pvt = vault.vaultAlbums.map((a) => a.title);
    return [...std, ...pvt];
  }, [standardAlbums, vault.vaultAlbums]);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    void media.service
      .getAlbums()
      .then((albums) => {
        if (active) {
          setStandardAlbums(albums);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [media.service, visible]);

  if (!asset) {
    return null;
  }

  const handleSelectStandard = async (album: MediaAlbum) => {
    setActionInProgress(album.id);
    setError(null);
    try {
      await media.addAssetToAlbum(asset.id, album.id);
      onSuccess?.(album.title, false, false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add to album.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSelectPrivate = async (albumId: string, albumTitle: string) => {
    setActionInProgress(albumId);
    setError(null);
    try {
      await vault.moveToPrivateAlbum(asset, albumId, true);
      onSuccess?.(albumTitle, true, false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not encrypt and move to private album.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCreateStandard = async (title: string) => {
    const created = await media.createAlbum(title, asset.id);
    onSuccess?.(created.title, false, true);
    onClose();
  };

  const handleCreatePrivate = async (title: string) => {
    const created = await vault.createPrivateAlbum(title);
    await vault.moveToPrivateAlbum(asset, created.id, true);
    onSuccess?.(created.title, true, true);
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible && !createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: theme.surface, borderColor: theme.outlineVariant },
            ]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <View>
                <Text style={[styles.title, { color: theme.onSurface }]}>Move to Album</Text>
                <Text numberOfLines={1} style={[styles.subtitle, { color: theme.onSurfaceVariant }]}>
                  {asset.filename}
                </Text>
              </View>
              <ActionButton
                label="+ New Album"
                variant="tonal"
                onPress={() => setCreateModalVisible(true)}
              />
            </View>

            {error ? <Text style={[styles.error, { color: theme.error }]}>{error}</Text> : null}

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={theme.primary} />
                <Text style={{ color: theme.onSurfaceVariant }}>Loading albums…</Text>
              </View>
            ) : (
              <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {/* Private Vault Albums Section */}
                <Text style={[styles.sectionHeader, { color: theme.primary }]}>
                  🔒 Private Encrypted Albums (Biometric)
                </Text>
                {vault.vaultAlbums.length === 0 ? (
                  <Pressable
                    onPress={() => setCreateModalVisible(true)}
                    style={[styles.emptyPrompt, { backgroundColor: theme.surfaceContainer }]}>
                    <Text style={[styles.emptyPromptText, { color: theme.onSurfaceVariant }]}>
                      No private albums yet. Tap here to create one.
                    </Text>
                  </Pressable>
                ) : (
                  vault.vaultAlbums.map((album) => (
                    <Pressable
                      key={album.id}
                      accessibilityRole="button"
                      onPress={() => void handleSelectPrivate(album.id, album.title)}
                      disabled={actionInProgress !== null}
                      style={[
                        styles.albumRow,
                        {
                          backgroundColor: theme.surfaceContainer,
                          borderColor: theme.outlineVariant,
                        },
                      ]}>
                      <Text style={styles.albumIcon}>🔒</Text>
                      <View style={styles.albumInfo}>
                        <Text style={[styles.albumTitle, { color: theme.onSurface }]}>
                          {album.title}
                        </Text>
                        <Text style={[styles.albumMeta, { color: theme.onSurfaceVariant }]}>
                          {album.itemCount} item{album.itemCount === 1 ? '' : 's'} • AES-256
                        </Text>
                      </View>
                      {actionInProgress === album.id ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : (
                        <Text style={[styles.arrow, { color: theme.onSurfaceVariant }]}>›</Text>
                      )}
                    </Pressable>
                  ))
                )}

                {/* Standard Device Albums Section */}
                <Text style={[styles.sectionHeader, { color: theme.onSurface, marginTop: 16 }]}>
                  📁 Device Albums
                </Text>
                {standardAlbums.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>
                    No device albums found.
                  </Text>
                ) : (
                  standardAlbums.map((album) => (
                    <Pressable
                      key={album.id}
                      accessibilityRole="button"
                      onPress={() => void handleSelectStandard(album)}
                      disabled={actionInProgress !== null}
                      style={[
                        styles.albumRow,
                        {
                          backgroundColor: theme.surfaceContainer,
                          borderColor: theme.outlineVariant,
                        },
                      ]}>
                      <Text style={styles.albumIcon}>📁</Text>
                      <View style={styles.albumInfo}>
                        <Text style={[styles.albumTitle, { color: theme.onSurface }]}>
                          {album.title}
                        </Text>
                      </View>
                      {actionInProgress === album.id ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : (
                        <Text style={[styles.arrow, { color: theme.onSurfaceVariant }]}>›</Text>
                      )}
                    </Pressable>
                  ))
                )}
              </ScrollView>
            )}

            <View style={styles.footer}>
              <ActionButton label="Cancel" variant="outlined" onPress={onClose} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <CreateAlbumModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreateStandard={handleCreateStandard}
        onCreatePrivate={handleCreatePrivate}
        existingAlbumNames={existingAlbumNames}
        canEnableEncryption={vault.canEnableEncryption}
        encryptionUnavailableReason={vault.encryptionUnavailableReason}
        onNotifyUnavailable={(reason) => setError(`Encryption unavailable: ${reason}`)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 220,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  list: {
    maxHeight: 380,
  },
  listContent: {
    gap: 8,
    paddingBottom: 16,
  },
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  albumIcon: {
    fontSize: 22,
  },
  albumInfo: {
    flex: 1,
  },
  albumTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  albumMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  arrow: {
    fontSize: 20,
    fontWeight: '400',
  },
  emptyPrompt: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyPromptText: {
    fontSize: 13,
  },
  emptyText: {
    fontSize: 13,
    paddingVertical: 8,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  error: {
    fontSize: 13,
    marginBottom: 8,
  },
  footer: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
});
