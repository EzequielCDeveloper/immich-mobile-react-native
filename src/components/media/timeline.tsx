import { FlatList, Text, View, StyleSheet } from 'react-native';

import type { MediaAssetMetadata } from '@/lib/media/contracts';
import { sortAssetsNewestFirst } from '@/lib/media/contracts';
import { useTheme } from '@/hooks/use-theme';

import { MediaTile } from '@/components/media/media-tile';
import { ActionButton } from '@/components/ui/action-button';
import { StatusBlock } from '@/components/ui/status-block';

type TimelineRow =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'assets'; key: string; assets: MediaAssetMetadata[] };

export function Timeline({
  assets,
  columns,
  onAssetPress,
  onEndReached,
  hasMore,
  refreshing,
  onRefresh,
  loading,
  error,
  onRetry,
  header,
}: {
  assets: MediaAssetMetadata[];
  columns: number;
  onAssetPress: (asset: MediaAssetMetadata, index: number) => void;
  onEndReached: () => void;
  hasMore: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  header?: React.ReactElement | null;
}) {
  const theme = useTheme();
  const sortedAssets = sortAssetsNewestFirst(assets);
  const rows = buildRows(sortedAssets, columns);

  if (loading && assets.length === 0) {
    return <StatusBlock kind="loading" title="Reading your library" message="Metadata is loaded locally." />;
  }
  if (error && assets.length === 0) {
    return (
      <StatusBlock
        kind="error"
        title="Could not read media"
        message={error}
        action={onRetry ? <ActionButton label="Try again" variant="tonal" onPress={onRetry} /> : undefined}
      />
    );
  }

  return (
    <FlatList
      data={rows}
      key={columns}
      keyExtractor={(row) => row.key}
      renderItem={({ item }) =>
        item.kind === 'header' ? (
          <Text style={[styles.header, { color: theme.onSurface }]}>{item.label}</Text>
        ) : (
          <View style={styles.assetRow}>
            {item.assets.map((asset) => {
              const index = sortedAssets.findIndex((candidate) => candidate.id === asset.id);
              return (
                <View key={asset.id} style={[styles.cell, { width: `${100 / columns}%` as `${number}%` }]}>
                  <MediaTile asset={asset} onPress={() => onAssetPress(asset, index)} />
                </View>
              );
            })}
            {item.assets.length < columns
              ? Array.from({ length: columns - item.assets.length }, (_, index) => (
                  <View key={`empty-${index}`} style={[styles.cell, { width: `${100 / columns}%` as `${number}%` }]} />
                ))
              : null}
          </View>
        )
      }
      ListHeaderComponent={header ?? null}
      ListEmptyComponent={<StatusBlock kind="empty" title="No photos or videos" message="Your device library is empty or access has not been granted." />}
      ListFooterComponent={
        error && assets.length > 0 ? (
          <StatusBlock
            kind="error"
            title="More media could not be loaded"
            message={error}
            action={onRetry ? <ActionButton label="Try again" variant="tonal" onPress={onRetry} /> : undefined}
          />
        ) : null
      }
      onEndReached={hasMore ? onEndReached : undefined}
      onEndReachedThreshold={0.65}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={rows.length === 0 ? styles.emptyContent : styles.content}
      style={{ backgroundColor: theme.surface }}
      showsVerticalScrollIndicator={false}
    />
  );
}

function buildRows(assets: MediaAssetMetadata[], columns: number): TimelineRow[] {
  const rows: TimelineRow[] = [];
  let activeDay = '';
  let dayAssets: MediaAssetMetadata[] = [];

  const flush = () => {
    if (dayAssets.length > 0) {
      for (let index = 0; index < dayAssets.length; index += columns) {
        const chunk = dayAssets.slice(index, index + columns);
        rows.push({ kind: 'assets', key: `assets-${activeDay}-${index}`, assets: chunk });
      }
    }
  };

  assets.forEach((asset) => {
    const day = dayKey(asset.creationTime);
    if (day !== activeDay) {
      flush();
      activeDay = day;
      dayAssets = [];
      rows.push({ kind: 'header', key: `header-${day}`, label: formatDay(asset.creationTime) });
    }
    dayAssets.push(asset);
  });
  flush();
  return rows;
}

function dayKey(timestamp: number | null): string {
  if (timestamp === null) {
    return 'unknown-date';
  }
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDay(timestamp: number | null): string {
  if (timestamp === null) {
    return 'Date unavailable';
  }
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(timestamp));
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 8,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
  },
  assetRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  cell: {
    padding: 2,
    aspectRatio: 1,
  },
  content: {
    paddingBottom: 24,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
