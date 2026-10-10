import { useEffect, useMemo, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { ExpoVideoModule } from '@/lib/video/expo-video-boundary';

export function VideoPlayback({
  module,
  uri,
  loading,
  loop,
}: {
  module: ExpoVideoModule | null;
  uri: string | null;
  loading: boolean;
  loop: boolean;
}) {
  if (!module) {
    return <VideoPlaybackUnavailable loop={loop} />;
  }
  if (loading) {
    return <VideoLoading />;
  }
  if (!uri) {
    return (
      <VideoPlaybackUnavailable
        loop={loop}
        reason="This video is not available on the device."
      />
    );
  }

  return <VideoPlaybackWithModule key={`${uri}:${loop}`} module={module} uri={uri} loop={loop} />;
}

function VideoPlaybackWithModule({
  module,
  uri,
  loop,
}: {
  module: ExpoVideoModule;
  uri: string;
  loop: boolean;
}) {
  const theme = useTheme();
  const source = useMemo(() => ({ uri }), [uri]);
  const player = module.useVideoPlayer(source, (nextPlayer) => {
    nextPlayer.loop = loop;
    nextPlayer.play();
  });
  const [status, setStatus] = useState(player.status);
  const [error, setError] = useState<string | null>(() => formatPlayerError(player.error));
  const VideoView = module.VideoView;

  useEffect(() => {
    const subscription = player.addListener('statusChange', (event) => {
      setStatus(event.status);
      setError(formatPlayerError(event.error));
    });
    return () => subscription.remove();
  }, [player]);

  const playbackError = error ?? (status === 'error' ? 'The video player could not open this local file.' : null);

  return (
    <View style={styles.playerContainer}>
      <VideoView
        player={player}
        nativeControls
        contentFit="contain"
        accessible
        accessibilityLabel="Local video player"
        style={styles.video}
      />
      {playbackError ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.error, { color: theme.error }]}
        >
          {playbackError}
        </Text>
      ) : null}
    </View>
  );
}

export function VideoPlaybackUnavailable({
  loop,
  reason = 'The optional SDK 57 video package is not installed in this local build.',
}: {
  loop: boolean;
  reason?: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={[styles.container, { backgroundColor: theme.surfaceContainer }]}
    >
      <Text style={[styles.icon, { color: theme.primary }]}>▶</Text>
      <Text style={[styles.title, { color: theme.onSurface }]}>Video playback unavailable</Text>
      <Text style={[styles.message, { color: theme.onSurfaceVariant }]}>{reason}</Text>
      <Text style={[styles.detail, { color: theme.onSurfaceVariant }]}>Loop preference: {loop ? 'On' : 'Off'}</Text>
    </View>
  );
}

function VideoLoading() {
  const theme = useTheme();
  return (
    <View
      style={[styles.container, { backgroundColor: theme.surfaceContainer }]}
    >
      <Text style={[styles.title, { color: theme.onSurface }]}>Loading local video</Text>
      <Text style={[styles.message, { color: theme.onSurfaceVariant }]}>The local file is being opened.</Text>
    </View>
  );
}

function formatPlayerError(error: unknown): string | null {
  if (typeof error === 'string' && error.length > 0) {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = error.message;
    return typeof message === 'string' && message.length > 0 ? message : 'The video player could not open this local file.';
  }
  return null;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 420,
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
    gap: 10,
  },
  playerContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  icon: {
    fontSize: 36,
    lineHeight: 44,
  },
  title: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  detail: {
    fontSize: 12,
    lineHeight: 18,
  },
  error: {
    maxWidth: 360,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
