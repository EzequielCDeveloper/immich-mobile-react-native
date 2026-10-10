import type { ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type ExpoVideoSource = { uri: string };

export type ExpoVideoStatusEvent = {
  status: string;
  error?: unknown;
};

export type ExpoVideoPlayer = {
  loop: boolean;
  status: string;
  error: unknown;
  play(): void;
  pause(): void;
  addListener(
    eventName: 'statusChange',
    listener: (event: ExpoVideoStatusEvent) => void
  ): { remove(): void };
};

export type ExpoVideoViewProps = {
  player: ExpoVideoPlayer;
  style?: StyleProp<ViewStyle>;
  nativeControls?: boolean;
  contentFit?: 'contain' | 'cover' | 'fill';
  accessible?: boolean;
  accessibilityLabel?: string;
  onFirstFrameRender?: () => void;
};

export type ExpoVideoModule = {
  VideoView: ComponentType<ExpoVideoViewProps>;
  useVideoPlayer(
    source: ExpoVideoSource,
    setup?: (player: ExpoVideoPlayer) => void
  ): ExpoVideoPlayer;
};

export function adaptExpoVideoModule(module: {
  VideoView: unknown;
  useVideoPlayer: unknown;
}): ExpoVideoModule {
  if (typeof module.VideoView !== 'function' || typeof module.useVideoPlayer !== 'function') {
    throw new Error('The installed video module has no player view or player hook.');
  }
  return {
    VideoView: module.VideoView as ExpoVideoModule['VideoView'],
    useVideoPlayer: module.useVideoPlayer as ExpoVideoModule['useVideoPlayer'],
  };
}
