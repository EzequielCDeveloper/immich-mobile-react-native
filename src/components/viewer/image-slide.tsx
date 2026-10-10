import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { ActivityIndicator, Pressable, Text, View, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';

import type { MediaAssetDetails, MediaAssetMetadata } from '@/lib/media/contracts';
import { useTheme } from '@/hooks/use-theme';

const maximumScale = 4;

export function ImageSlide({
  asset,
  detail,
  loading,
  onPress,
}: {
  asset: MediaAssetMetadata;
  detail: MediaAssetDetails | null;
  loading: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
        <Text style={[styles.message, { color: theme.onSurfaceVariant }]}>Loading local media…</Text>
      </View>
    );
  }

  const uri = detail
    ? detail.isAvailable && detail.uri
      ? detail.uri
      : null
    : asset.uri ?? null;

  if (!uri) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Not available on device"
        onPress={onPress}
        style={styles.center}>
        <Text style={[styles.unavailableIcon, { color: theme.onSurfaceVariant }]}>□</Text>
        <Text style={[styles.unavailableTitle, { color: theme.onSurface }]}>Not available on device</Text>
        <Text
          style={[styles.message, { color: theme.onSurfaceVariant }]}
        >
          {detail?.unavailableReason ?? 'The local file could not be opened.'}
        </Text>
      </Pressable>
    );
  }

  return <ZoomableImage key={asset.id} asset={asset} uri={uri} onPress={onPress} />;
}

function ZoomableImage({
  asset,
  uri,
  onPress,
}: {
  asset: MediaAssetMetadata;
  uri: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const pinchStartScale = useSharedValue(1);
  const pinchStartTranslateX = useSharedValue(0);
  const pinchStartTranslateY = useSharedValue(0);
  const panStartTranslateX = useSharedValue(0);
  const panStartTranslateY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      pinchStartScale.set(scale.value);
      pinchStartTranslateX.set(translateX.value);
      pinchStartTranslateY.set(translateY.value);
    })
    .onUpdate((event) => {
      const nextScale = clamp(pinchStartScale.value * event.scale, 1, maximumScale);
      const scaleChange = nextScale / pinchStartScale.value;
      scale.set(nextScale);
      translateX.set(
        clamp(
          pinchStartTranslateX.value + (event.focalX - width / 2) * (1 - scaleChange),
          -maximumPan(width, nextScale),
          maximumPan(width, nextScale)
        )
      );
      translateY.set(
        clamp(
          pinchStartTranslateY.value + (event.focalY - height / 2) * (1 - scaleChange),
          -maximumPan(height, nextScale),
          maximumPan(height, nextScale)
        )
      );
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        scale.set(1);
        translateX.set(0);
        translateY.set(0);
      } else {
        translateX.set(
          clamp(
            translateX.value,
            -maximumPan(width, scale.value),
            maximumPan(width, scale.value)
          )
        );
        translateY.set(
          clamp(
            translateY.value,
            -maximumPan(height, scale.value),
            maximumPan(height, scale.value)
          )
        );
      }
    });

  const pan = Gesture.Pan()
    .onStart(() => {
      panStartTranslateX.set(translateX.value);
      panStartTranslateY.set(translateY.value);
    })
    .onUpdate((event) => {
      if (scale.value <= 1) {
        translateX.set(0);
        translateY.set(0);
        return;
      }
      translateX.set(
        clamp(
          panStartTranslateX.value + event.translationX,
          -maximumPan(width, scale.value),
          maximumPan(width, scale.value)
        )
      );
      translateY.set(
        clamp(
          panStartTranslateY.value + event.translationY,
          -maximumPan(height, scale.value),
          maximumPan(height, scale.value)
        )
      );
    });

  const zoomGesture = Gesture.Simultaneous(pinch, pan);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const resetZoom = () => {
    scale.set(1);
    translateX.set(0);
    translateY.set(0);
  };

  return (
    <View style={styles.viewer}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${asset.filename}`}
        onPress={onPress}
        style={styles.center}>
        <GestureDetector gesture={zoomGesture}>
          <Animated.View style={[styles.imageFrame, animatedStyle]}>
            <Image source={{ uri }} contentFit="contain" style={styles.image} />
          </Animated.View>
        </GestureDetector>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset image zoom"
        onPress={resetZoom}
        style={[styles.resetButton, { backgroundColor: theme.surfaceContainer }]}>
        <Text style={[styles.resetText, { color: theme.onSurface }]}>Reset zoom</Text>
      </Pressable>
    </View>
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  'worklet';
  return Math.min(maximum, Math.max(minimum, value));
}

function maximumPan(viewport: number, scale: number): number {
  'worklet';
  return Math.max(0, (viewport * (scale - 1)) / 2);
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 10,
  },
  viewer: {
    flex: 1,
  },
  imageFrame: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  unavailableIcon: {
    fontSize: 44,
    lineHeight: 52,
  },
  unavailableTitle: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    maxWidth: 340,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  resetButton: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 18,
    justifyContent: 'center',
  },
  resetText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
});
