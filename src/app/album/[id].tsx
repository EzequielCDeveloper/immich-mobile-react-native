import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { AssetGrid } from '@/components/media/asset-grid';
import { ActionButton } from '@/components/ui/action-button';
import { AppBar } from '@/components/ui/app-bar';
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal';
import { NotificationCard, type NotificationItem } from '@/components/ui/notification-card';
import { RenameAlbumModal } from '@/components/albums/rename-album-modal';
import { PermissionGate } from '@/components/permissions/permission-gate';
import { Screen } from '@/components/ui/screen';
import { useSettings } from '@/context/settings-context';
import { useMediaContext } from '@/context/media-context';
import { useViewerContext } from '@/context/viewer-context';
import { usePagedMetadata } from '@/hooks/use-paged-metadata';

export default function AlbumDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const albumId = Array.isArray(id) ? id[0] : id;
  const media = useMediaContext();
  const viewer = useViewerContext();
  const { settings } = useSettings();
  const [albumTitle, setAlbumTitle] = useState('Album');
  const [existingTitles, setExistingTitles] = useState<string[]>([]);
  const [renameVisible, setRenameVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [notification, setNotification] = useState<NotificationItem | null>(null);

  useEffect(() => {
    let active = true;
    void media.service.getAlbums().then((albums) => {
      if (active) {
        setExistingTitles(albums.map((a) => a.title));
        const found = albums.find((a) => a.id === albumId);
        if (found) {
          setAlbumTitle(found.title);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [albumId, media.service]);

  const assets = usePagedMetadata({
    albumId,
    enabled: Boolean(albumId) && media.permission.granted,
    pageSize: 60,
  });

  const handleRename = async (newTitle: string) => {
    if (!albumId) return;
    await media.renameAlbum(albumId, newTitle);
    setAlbumTitle(newTitle);
    media.refreshLibrary();
    setNotification({
      id: String(Date.now()),
      type: 'album-renamed',
      title: 'Album Renamed',
      message: `Album was renamed to "${newTitle}".`,
    });
  };

  const handleDelete = async () => {
    if (!albumId) return;
    await media.deleteAlbum(albumId);
    media.refreshLibrary();
    setNotification({
      id: String(Date.now()),
      type: 'deleted-item',
      title: 'Album Deleted',
      message: `Album "${albumTitle}" was deleted.`,
    });
    setTimeout(() => {
      router.back();
    }, 1100);
  };

  return (
    <Screen navigationInset={false}>
      <NotificationCard
        notification={notification}
        onDismiss={() => setNotification(null)}
      />
      <AppBar
        title={albumTitle}
        subtitle={`${assets.assets.length} items`}
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
        ]}
      />
      <PermissionGate>
        <View style={styles.content}>
          <AssetGrid
            assets={assets.assets}
            columns={settings.tilesPerRow}
            onAssetPress={(asset, index) => {
              viewer.open(assets.assets, index);
              router.push({ pathname: '/asset/[id]', params: { id: asset.id } });
            }}
            onEndReached={assets.loadMore}
            hasMore={assets.hasMore}
            refreshing={assets.refreshing}
            onRefresh={assets.refresh}
            loading={assets.status === 'loading'}
            error={assets.error}
            onRetry={assets.retry}
            emptyTitle="This album is empty"
            emptyMessage="No image or video metadata is available in this album."
          />
        </View>
      </PermissionGate>

      <RenameAlbumModal
        visible={renameVisible}
        initialTitle={albumTitle}
        onClose={() => setRenameVisible(false)}
        onRename={handleRename}
        existingAlbumNames={existingTitles}
      />

      <ConfirmDeleteModal
        visible={deleteVisible}
        title="Delete Album?"
        message={`Are you sure you want to delete "${albumTitle}"? Photos and videos inside will remain on your device.`}
        confirmLabel="Delete Album"
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
});
