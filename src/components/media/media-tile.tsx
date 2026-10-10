import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, Text, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import type { MediaAssetMetadata } from '@/lib/media/contracts';
import { useTheme } from '@/hooks/use-theme';

export function MediaTile({
  asset,
  onPress,
  style,
}: {
  asset: MediaAssetMetadata;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const uri = asset.uri ?? null;
  const imageFailed = uri !== null && failedUri === uri;
  const accessibilityLabel = `${asset.filename}, ${asset.mediaType}${asset.isFavorite ? ', favorite' : ''}${!uri || imageFailed ? ', local preview unavailable' : ''}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, style, pressed ? { opacity: 0.78 } : null]}>
      {uri && !imageFailed ? (
        <Image
          source={{ uri }}
          contentFit="cover"
          transition={120}
          onError={() => setFailedUri(uri)}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          style={[styles.fallback, { backgroundColor: theme.primaryContainer }]}
        >
          <Text
            style={[styles.fallbackText, { color: theme.onPrimaryContainer }]}
          >
            {asset.mediaType === 'video' ? '▶' : '•'}
          </Text>
          <Text style={[styles.fallbackLabel, { color: theme.onPrimaryContainer }]}>Unavailable</Text>
        </View>
      )}
      <View style={styles.scrim} />
      <View style={styles.meta}>
        {asset.mediaType === 'video' ? (
          <Text style={styles.videoBadge}>{formatDuration(asset.duration)}</Text>
        ) : null}
        {asset.isFavorite ? <Text style={styles.favorite}>♥</Text> : null}
      </View>
    </Pressable>
  );
}

function formatDuration(duration: number | null): string {
  if (duration === null || duration < 0) {
    return 'Video';
  }
  const totalSeconds = Math.round(duration / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 44,
    minHeight: 44,
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#303030',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontSize: 30,
    fontWeight: '700',
  },
  fallbackLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'transparent',
  },
  meta: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoBadge: {
    color: '#ffffff',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    textShadowColor: '#000000',
    textShadowRadius: 4,
  },
  favorite: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 18,
    textShadowColor: '#000000',
    textShadowRadius: 4,
  },
});
