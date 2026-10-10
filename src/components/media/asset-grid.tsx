import { FlatList, View, StyleSheet } from 'react-native';

import type { MediaAssetMetadata } from '@/lib/media/contracts';
import { useTheme } from '@/hooks/use-theme';

import { MediaTile } from '@/components/media/media-tile';
import { ActionButton } from '@/components/ui/action-button';
import { StatusBlock } from '@/components/ui/status-block';

type GridRow = MediaAssetMetadata[];

export function AssetGrid({
  assets,
  columns,
  onAssetPress,
  onEndReached,
  refreshing = false,
  onRefresh,
  hasMore = false,
  emptyTitle = 'No media yet',
  emptyMessage = 'Photos and videos on this device will appear here.',
  error,
  loading = false,
  onRetry,
  header,
}: {
  assets: MediaAssetMetadata[];
  columns: number;
  onAssetPress: (asset: MediaAssetMetadata, index: number) => void;
  onEndReached?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  hasMore?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  error?: string | null;
  loading?: boolean;
  onRetry?: () => void;
  header?: React.ReactElement | null;
}) {
  const theme = useTheme();
  const rows: GridRow[] = [];
  for (let index = 0; index < assets.length; index += columns) {
    rows.push(assets.slice(index, index + columns));
  }
  const itemWidth = `${100 / columns}%` as `${number}%`;

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
      keyExtractor={(row) => row.map((asset) => asset.id).join(':')}
      renderItem={({ item: row }) => (
        <View style={styles.row}>
          {row.map((asset) => {
            const index = assets.findIndex((candidate) => candidate.id === asset.id);
            return (
              <View key={asset.id} style={[styles.cell, { width: itemWidth, padding: 2 }]}>
                <MediaTile asset={asset} onPress={() => onAssetPress(asset, index)} />
              </View>
            );
          })}
          {row.length < columns
            ? Array.from({ length: columns - row.length }, (_, index) => (
                <View key={`spacer-${index}`} style={[styles.cell, { width: itemWidth, padding: 2 }]} />
              ))
            : null}
        </View>
      )}
      ListHeaderComponent={header ?? null}
      ListEmptyComponent={
        <StatusBlock
          kind="empty"
          title={emptyTitle}
          message={emptyMessage}
        />
      }
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
      onEndReachedThreshold={0.6}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={assets.length === 0 ? styles.emptyContent : styles.content}
      style={{ backgroundColor: theme.surface }}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  cell: {
    aspectRatio: 1,
  },
  content: {
    paddingHorizontal: 10,
    paddingBottom: 24,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
