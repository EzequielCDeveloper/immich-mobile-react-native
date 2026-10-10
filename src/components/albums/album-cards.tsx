import { Pressable, Text, View, StyleSheet } from 'react-native';

import type { AlbumCardModel } from '@/lib/albums/album-catalog';
import { useTheme } from '@/hooks/use-theme';

import { MediaTile } from '@/components/media/media-tile';
import { StatusBlock } from '@/components/ui/status-block';

export function AlbumCards({
  cards,
  onAlbumPress,
}: {
  cards: AlbumCardModel[];
  onAlbumPress: (id: string) => void;
}) {
  const theme = useTheme();
  if (cards.length === 0) {
    return <StatusBlock kind="empty" title="No albums" message="Albums from the device library will appear here." />;
  }

  return (
    <View style={styles.grid}>
      {cards.map((card) => (
        <Pressable
          key={card.id}
          accessibilityRole="button"
          accessibilityLabel={`${card.title} album${card.count === null ? '' : `, ${card.count} items`}`}
          onPress={() => onAlbumPress(card.id)}
          style={({ pressed }) => [styles.card, { backgroundColor: theme.surfaceContainer }, pressed ? { opacity: 0.78 } : null]}>
          <View style={styles.cover}>
            {card.cover ? (
              <MediaTile asset={card.cover} onPress={() => onAlbumPress(card.id)} style={styles.coverTile} />
            ) : card.state === 'pending' ? (
              <View style={[styles.pending, { backgroundColor: theme.surfaceVariant }]}>
                <Text style={[styles.pendingText, { color: theme.onSurfaceVariant }]}>Loading</Text>
              </View>
            ) : (
              <View style={[styles.pending, { backgroundColor: theme.primaryContainer }]}>
                <Text style={[styles.pendingText, { color: theme.onPrimaryContainer }]}>Album</Text>
              </View>
            )}
          </View>
          <Text numberOfLines={1} style={[styles.title, { color: theme.onSurface }]}>{card.title}</Text>
          {card.state === 'pending' ? (
            <Text style={[styles.detail, { color: theme.onSurfaceVariant }]}>Counting items…</Text>
          ) : card.state === 'error' ? (
            <Text style={[styles.error, { color: theme.error }]}>Count unavailable</Text>
          ) : (
            <Text style={[styles.detail, { color: theme.onSurfaceVariant }]}>{card.count} items</Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 150,
    padding: 10,
    borderRadius: 18,
    gap: 4,
  },
  cover: {
    width: '100%',
    aspectRatio: 1.25,
    overflow: 'hidden',
    borderRadius: 12,
  },
  coverTile: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  pending: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingText: {
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    paddingTop: 4,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  detail: {
    fontSize: 12,
    lineHeight: 17,
  },
  error: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
});
