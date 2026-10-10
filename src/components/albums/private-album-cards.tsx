import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { PrivateAlbum } from '@/lib/vault/vault-contracts';

export function PrivateAlbumCards({
  albums,
  onAlbumPress,
  isUnlocked,
}: {
  albums: PrivateAlbum[];
  onAlbumPress: (id: string) => void;
  isUnlocked: (id: string) => boolean;
}) {
  const theme = useTheme();

  if (albums.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: theme.primary }]}>
          🔒 Private Vaults
        </Text>
        <Text style={[styles.badge, { backgroundColor: theme.primaryContainer, color: theme.onPrimaryContainer }]}>
          Biometric Protected
        </Text>
      </View>
      <View style={styles.grid}>
        {albums.map((album) => {
          const unlocked = isUnlocked(album.id);
          return (
            <Pressable
              key={album.id}
              accessibilityRole="button"
              accessibilityLabel={`${album.title} private album, ${unlocked ? 'unlocked' : 'locked'}`}
              onPress={() => onAlbumPress(album.id)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.surfaceContainer,
                  borderColor: unlocked ? theme.primary : theme.outlineVariant,
                },
                pressed ? { opacity: 0.78 } : null,
              ]}>
              <View style={[styles.cover, { backgroundColor: unlocked ? theme.primaryContainer : theme.surfaceContainerHigh }]}>
                <Text style={styles.coverIcon}>{unlocked ? '🔓' : '🔒'}</Text>
                <Text style={[styles.statusText, { color: unlocked ? theme.onPrimaryContainer : theme.onSurfaceVariant }]}>
                  {unlocked ? 'Unlocked' : 'Encrypted AES-256'}
                </Text>
              </View>
              <Text numberOfLines={1} style={[styles.title, { color: theme.onSurface }]}>
                {album.title}
              </Text>
              <Text style={[styles.detail, { color: theme.onSurfaceVariant }]}>
                {album.itemCount} encrypted item{album.itemCount === 1 ? '' : 's'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  badge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  grid: {
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
    borderWidth: 1.5,
    gap: 4,
  },
  cover: {
    width: '100%',
    aspectRatio: 1.25,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  coverIcon: {
    fontSize: 32,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
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
});
