import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View, StyleSheet, useWindowDimensions } from 'react-native';

import { ActionButton } from '@/components/ui/action-button';
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal';
import { DetailsSheet } from '@/components/viewer/details-sheet';
import { MoveToAlbumSheet } from '@/components/albums/move-to-album-sheet';
import { NotificationCard, type NotificationItem } from '@/components/ui/notification-card';
import { ImageSlide } from '@/components/viewer/image-slide';
import { VideoPlayback } from '@/components/viewer/video-playback';
import { useMediaContext } from '@/context/media-context';
import { useSettings } from '@/context/settings-context';
import { useVault } from '@/context/vault-context';
import { useViewerContext } from '@/context/viewer-context';
import type { MediaAssetDetails, MediaAssetMetadata } from '@/lib/media/contracts';
import {
  canApplyDetailResult,
  detailErrorState,
  detailLoadingState,
  detailReadyState,
  type DetailLoadState,
  type DetailRequestToken,
} from '@/lib/viewer/detail-state';
import { expoVideoModule } from '@/lib/video/optional-module';
import { useTheme } from '@/hooks/use-theme';

export default function AssetViewerScreen() {
  const router = useRouter();
  const theme = useTheme();
  const media = useMediaContext();
  const { settings } = useSettings();
  const vault = useVault();
  const viewer = useViewerContext();
  const { id, vaultAlbumId } = useLocalSearchParams<{ id: string; vaultAlbumId?: string }>();
  const assetId = Array.isArray(id) ? id[0] : id;
  const assets = useMemo(
    () => (viewer.assets.length > 0 ? viewer.assets : [createFallbackMetadata(assetId)]),
    [assetId, viewer.assets]
  );
  const initialIndex = viewer.assets.length > 0 ? viewer.initialIndex : 0;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [details, setDetails] = useState<Record<string, DetailLoadState>>({});
  const [controlsVisible, setControlsVisible] = useState(true);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [moveSheetVisible, setMoveSheetVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [notification, setNotification] = useState<NotificationItem | null>(null);
  const { width } = useWindowDimensions();
  const currentAsset = assets[currentIndex] ?? assets[0];
  const currentDetailState = currentAsset ? details[currentAsset.id] : undefined;
  const currentDetail = currentDetailState?.detail ?? null;
  const detailLoading = currentDetailState === undefined || currentDetailState.status === 'loading';
  const detailError = currentDetailState?.status === 'error' ? currentDetailState.error : null;
  const mountedRef = useRef(false);
  const detailRunRef = useRef(0);
  const requestSequenceRef = useRef(0);
  const activeRequestsRef = useRef(new Map<string, DetailRequestToken>());

  const loadDetail = useCallback(
    (asset: MediaAssetMetadata, run: number) => {
      if (!mountedRef.current) {
        return;
      }
      const token = { run, request: requestSequenceRef.current + 1 };
      requestSequenceRef.current = token.request;
      activeRequestsRef.current.set(asset.id, token);
      setDetails((current) => ({
        ...current,
        [asset.id]: detailLoadingState(current[asset.id]),
      }));

      void media.service.getAsset(asset.id).then(
        (detail) => {
          if (
            !canApplyDetailResult(
              token,
              activeRequestsRef.current.get(asset.id),
              detailRunRef.current,
              mountedRef.current
            )
          ) {
            return;
          }
          setDetails((current) => ({ ...current, [asset.id]: detailReadyState(detail) }));
        },
        (reason: unknown) => {
          if (
            !canApplyDetailResult(
              token,
              activeRequestsRef.current.get(asset.id),
              detailRunRef.current,
              mountedRef.current
            )
          ) {
            return;
          }
          setDetails((current) => ({
            ...current,
            [asset.id]: detailErrorState(current[asset.id], reason),
          }));
        }
      );
    },
    [media.service]
  );

  useEffect(() => {
    mountedRef.current = true;
    const run = detailRunRef.current + 1;
    detailRunRef.current = run;
    assets.forEach((asset) => loadDetail(asset, run));

    return () => {
      if (detailRunRef.current === run) {
        detailRunRef.current += 1;
      }
      mountedRef.current = false;
    };
  }, [assets, loadDetail, media.revision]);

  const retryDetail = useCallback(
    (id: string) => {
      const asset = assets.find((candidate) => candidate.id === id);
      if (asset) {
        loadDetail(asset, detailRunRef.current);
      }
    },
    [assets, loadDetail]
  );

  useEffect(() => {
    if (!settings.controlsAutoHide || !controlsVisible) {
      return;
    }
    const timer = setTimeout(() => setControlsVisible(false), 3500);
    return () => clearTimeout(timer);
  }, [controlsVisible, currentIndex, settings.controlsAutoHide]);

  const toggleFavorite = async () => {
    if (!currentAsset) {
      return;
    }
    const isFavorite = !(currentDetail?.isFavorite ?? currentAsset.isFavorite);
    try {
      await media.toggleFavorite(currentAsset.id, isFavorite);
      viewer.updateFavorite(currentAsset.id, isFavorite);
      setDetails((current) => {
        const detail = current[currentAsset.id]?.detail;
        return detail
          ? {
              ...current,
              [currentAsset.id]: {
                status: 'ready',
                detail: { ...detail, isFavorite },
                error: null,
              },
            }
          : current;
      });
    } catch {
      setControlsVisible(true);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      <FlatList
        data={assets}
        horizontal
        pagingEnabled
        initialScrollIndex={initialIndex}
        keyExtractor={(asset) => asset.id}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={{ width }}>
            {item.mediaType === 'video' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Toggle viewer controls"
                onPress={() => setControlsVisible((visible) => !visible)}
                style={styles.videoSlide}>
                <VideoPlayback
                  module={expoVideoModule}
                  uri={getVideoUri(item, details[item.id]?.detail)}
                  loading={details[item.id]?.status === 'loading' && !item.uri}
                  loop={settings.videoLoop}
                />
              </Pressable>
            ) : (
              <ImageSlide
                asset={item}
                detail={details[item.id]?.detail ?? null}
                loading={details[item.id] === undefined || details[item.id].status === 'loading'}
                onPress={() => setControlsVisible((visible) => !visible)}
              />
            )}
          </View>
        )}
        onMomentumScrollEnd={(event) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1));
          setCurrentIndex(Math.max(0, Math.min(next, assets.length - 1)));
          setControlsVisible(true);
        }}
      />

      {currentAsset && detailError ? (
        <View pointerEvents="box-none" style={styles.detailRecovery}>
          <Text style={styles.detailRecoveryTitle}>Details unavailable</Text>
          <ActionButton label="Retry details" variant="tonal" onPress={() => retryDetail(currentAsset.id)} />
        </View>
      ) : null}

      {controlsVisible ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View style={styles.topControls}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close viewer" onPress={() => router.back()} style={styles.controlButton}>
              <Text style={styles.controlText}>‹</Text>
            </Pressable>
            <Text numberOfLines={1} style={styles.filename}>{currentAsset?.filename ?? 'Media'}</Text>
          </View>
          <View style={styles.bottomControls}>
            <Pressable accessibilityRole="button" accessibilityLabel={currentDetail?.isFavorite ? 'Remove from favorites' : 'Add to favorites'} onPress={() => void toggleFavorite()} style={styles.controlButton}>
              <Text style={[styles.controlText, currentDetail?.isFavorite || currentAsset?.isFavorite ? styles.favorite : null]}>♥</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Move or add to album" onPress={() => setMoveSheetVisible(true)} style={styles.controlButton}>
              <Text style={[styles.controlText, { fontSize: 18 }]}>📁+</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Show media details" onPress={() => setDetailsVisible(true)} style={styles.controlButton}>
              <Text style={styles.controlText}>ⓘ</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Delete photo or video" onPress={() => setDeleteModalVisible(true)} style={styles.controlButton}>
              <Text style={[styles.controlText, { fontSize: 18 }]}>🗑️</Text>
            </Pressable>
            <Text style={styles.counter}>{currentIndex + 1} / {assets.length}</Text>
          </View>
        </View>
      ) : null}

      <NotificationCard
        notification={notification}
        onDismiss={() => setNotification(null)}
      />

      <ConfirmDeleteModal
        visible={deleteModalVisible}
        title={`Delete ${currentAsset?.mediaType === 'video' ? 'Video' : 'Photo'}?`}
        message={`Are you sure you want to permanently delete "${currentAsset?.filename ?? 'this file'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={async () => {
          if (!currentAsset) return;
          const isVid = currentAsset.mediaType === 'video';
          const filename = currentAsset.filename ?? (isVid ? 'Video' : 'Photo');
          if (vaultAlbumId) {
            await vault.deleteEncryptedAsset(vaultAlbumId, currentAsset.id);
          } else {
            await media.deleteAsset(currentAsset.id);
            media.refreshLibrary();
          }
          setNotification({
            id: String(Date.now()),
            type: 'deleted-item',
            title: isVid ? 'Video Deleted' : 'Photo Deleted',
            message: `"${filename}" was permanently deleted.`,
          });
          setTimeout(() => {
            router.back();
          }, 1100);
        }}
      />

      <MoveToAlbumSheet
        visible={moveSheetVisible}
        asset={currentAsset ?? null}
        onClose={() => setMoveSheetVisible(false)}
        onSuccess={(albumTitle, isPrivate, createdNewAlbum) => {
          setMoveSheetVisible(false);
          const filename = currentAsset?.filename ?? 'Photo';
          if (createdNewAlbum) {
            setNotification({
              id: String(Date.now()),
              type: isPrivate ? 'private-album' : 'standard-album',
              title: isPrivate ? 'Private Vault Created' : 'Standard Album Created',
              message: isPrivate
                ? `Created private encrypted vault "${albumTitle}" and secured "${filename}".`
                : `Created device album "${albumTitle}" and added "${filename}".`,
            });
          } else {
            setNotification({
              id: String(Date.now()),
              type: isPrivate ? 'private-album' : 'moved-photo',
              title: isPrivate ? 'Moved to Private Vault' : 'Added to Album',
              message: isPrivate
                ? `Encrypted "${filename}" with AES-256 into vault "${albumTitle}".`
                : `Added "${filename}" to album "${albumTitle}".`,
            });
          }
          if (isPrivate) {
            setTimeout(() => {
              router.back();
            }, 1200);
          }
        }}
      />

      <DetailsSheet
        detail={currentDetail}
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        loading={detailLoading}
        error={detailError}
        onRetry={currentAsset ? () => retryDetail(currentAsset.id) : undefined}
      />
      <Text style={[styles.orientationHint, { color: theme.onSurfaceVariant }]}>Pinch to zoom images</Text>
    </View>
  );
}

function createFallbackMetadata(id: string | undefined): MediaAssetMetadata {
  return {
    id: id ?? 'unknown',
    filename: 'Media',
    mediaType: 'image',
    creationTime: null,
    modificationTime: null,
    width: null,
    height: null,
    duration: null,
    isFavorite: false,
  };
}

function getVideoUri(
  asset: MediaAssetMetadata,
  detail: MediaAssetDetails | null | undefined
): string | null {
  if (detail === undefined || detail === null) {
    return asset.uri ?? null;
  }
  return detail.isAvailable && detail.uri ? detail.uri : null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  videoSlide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  topControls: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bottomControls: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlButton: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(30, 30, 30, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlText: {
    color: '#ffffff',
    fontSize: 24,
    lineHeight: 28,
  },
  favorite: {
    color: '#ff7780',
  },
  filename: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  counter: {
    marginLeft: 'auto',
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  orientationHint: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    fontSize: 11,
  },
  detailRecovery: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 92,
    alignItems: 'center',
    gap: 8,
  },
  detailRecoveryTitle: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
});
