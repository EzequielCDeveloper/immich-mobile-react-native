import { useEffect, useState } from 'react';
import { AppState, FlatList, Text, View, StyleSheet } from 'react-native';

import { useMediaContext } from '@/context/media-context';
import { deriveOnThisDay, onThisDayCacheKey } from '@/lib/memories/derive-on-this-day';
import type { MediaAssetMetadata } from '@/lib/media/contracts';
import { useTheme } from '@/hooks/use-theme';

import { MediaTile } from '@/components/media/media-tile';
import { StatusBlock } from '@/components/ui/status-block';

const cache = new Map<string, MediaAssetMetadata[]>();

export function OnThisDay({ onAssetPress }: { onAssetPress: (asset: MediaAssetMetadata, index: number) => void }) {
  const media = useMediaContext();
  const theme = useTheme();
  const [today, setToday] = useState(() => new Date());
  const cacheKey = onThisDayCacheKey(today, media.permission.scope, media.revision);
  const [resolved, setResolved] = useState<{
    key: string;
    assets: MediaAssetMetadata[] | null;
    error: string | null;
  }>(() => ({ key: cacheKey, assets: cache.get(cacheKey) ?? null, error: null }));

  useEffect(() => {
    const syncToday = () => {
      const nextToday = new Date();
      setToday((current) => (sameLocalDay(current, nextToday) ? current : nextToday));
    };

    let timeout: ReturnType<typeof setTimeout> | null = null;
    const scheduleDayBoundary = () => {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      const now = new Date();
      const nextBoundary = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        1
      );
      timeout = setTimeout(() => {
        timeout = null;
        syncToday();
        scheduleDayBoundary();
      }, Math.max(1000, nextBoundary.getTime() - now.getTime()));
    };

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncToday();
        scheduleDayBoundary();
      }
    });
    scheduleDayBoundary();

    return () => {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const cached = cache.get(cacheKey);
    if (cached) {
      return;
    }

    let active = true;
    void media
      .loadAll({
        pageSize: 100,
        revision: media.revision,
        scope: media.permission.scope,
      })
      .then((allMetadata) => {
        if (!active) {
          return;
        }
        const derived = deriveOnThisDay(allMetadata, today);
        cache.set(cacheKey, derived);
        setResolved({ key: cacheKey, assets: derived, error: null });
      })
      .catch((reason: unknown) => {
        if (active) {
          setResolved({
            key: cacheKey,
            assets: null,
            error: reason instanceof Error ? reason.message : 'Memory metadata is unavailable.',
          });
        }
      });
    return () => {
      active = false;
    };
  }, [cacheKey, media, today]);

  const cachedAssets = cache.get(cacheKey);
  const visibleAssets = cachedAssets ?? (resolved.key === cacheKey ? resolved.assets : null);
  const error = resolved.key === cacheKey ? resolved.error : null;
  if (error) {
    return <StatusBlock kind="error" title="On this day is unavailable" message={error} />;
  }
  if (visibleAssets === null) {
    return <StatusBlock kind="loading" title="Loading memories" message="Local metadata is being checked." />;
  }
  if (visibleAssets.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.headingRow}>
        <Text style={[styles.title, { color: theme.onSurface }]}>On this day</Text>
        <Text style={[styles.detail, { color: theme.onSurfaceVariant }]}>{visibleAssets.length} memories</Text>
      </View>
      <FlatList
        horizontal
        data={visibleAssets}
        keyExtractor={(asset) => asset.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <View style={styles.memory}>
            <MediaTile asset={item} onPress={() => onAssetPress(item, index)} style={styles.memoryTile} />
            <Text numberOfLines={1} style={[styles.filename, { color: theme.onSurfaceVariant }]}>{item.filename}</Text>
          </View>
        )}
        accessibilityLabel="On this day memories"
      />
    </View>
  );
}

function sameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 10,
  },
  headingRow: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  detail: {
    fontSize: 12,
    lineHeight: 16,
  },
  list: {
    paddingHorizontal: 16,
    gap: 10,
  },
  memory: {
    width: 128,
    gap: 4,
  },
  memoryTile: {
    width: 128,
    height: 128,
  },
  filename: {
    fontSize: 12,
    lineHeight: 16,
  },
});
