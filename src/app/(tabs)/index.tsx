import { useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';

import { AppBar } from '@/components/ui/app-bar';
import { OnThisDay } from '@/components/memories/on-this-day';
import { PermissionGate } from '@/components/permissions/permission-gate';
import { Timeline } from '@/components/media/timeline';
import { Screen } from '@/components/ui/screen';
import { useSettings } from '@/context/settings-context';
import { useMediaContext } from '@/context/media-context';
import { useViewerContext } from '@/context/viewer-context';
import { usePagedMetadata } from '@/hooks/use-paged-metadata';

export default function PhotosScreen() {
  const router = useRouter();
  const media = useMediaContext();
  const { settings } = useSettings();
  const viewer = useViewerContext();
  const timeline = usePagedMetadata({ enabled: media.permission.granted, pageSize: 60 });

  const openAsset = (asset: Parameters<typeof viewer.open>[0][number], index: number) => {
    viewer.open(timeline.assets, index);
    router.push({ pathname: '/asset/[id]', params: { id: asset.id } });
  };

  return (
    <Screen>
      <AppBar title="Photos" subtitle="On this device" onSettings={() => router.push('/settings')} />
      <PermissionGate>
        <View style={styles.content}>
          <OnThisDay
            onAssetPress={(asset) => {
              viewer.open([asset], 0);
              router.push({ pathname: '/asset/[id]', params: { id: asset.id } });
            }}
          />
          <Timeline
            assets={timeline.assets}
            columns={settings.tilesPerRow}
            onAssetPress={openAsset}
            onEndReached={timeline.loadMore}
            hasMore={timeline.hasMore}
            refreshing={timeline.refreshing}
            onRefresh={timeline.refresh}
            loading={timeline.status === 'loading'}
            error={timeline.error}
            onRetry={timeline.retry}
          />
        </View>
      </PermissionGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
});
