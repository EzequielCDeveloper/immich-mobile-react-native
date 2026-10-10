import { useRouter } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';

import { useMediaPermission } from '@/hooks/use-media-permission';
import { useTheme } from '@/hooks/use-theme';

import { ActionButton } from '@/components/ui/action-button';
import { StatusBlock } from '@/components/ui/status-block';

export function PermissionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { permission, isChecking, request } = useMediaPermission();
  const theme = useTheme();

  if (isChecking || permission.state === 'checking') {
    return <StatusBlock kind="loading" title="Checking photo access" message="The permission state is checked locally." />;
  }

  const isAccessAllowed =
    permission.granted ||
    permission.state === 'granted-all' ||
    permission.state === 'granted-limited';

  if (isAccessAllowed) {
    return <>{children}</>;
  }

  const unavailable = Boolean(permission.unavailableReason);
  const retryable = permission.state === 'undetermined' || permission.state === 'denied-retryable';
  return (
    <View style={styles.wrapper}>
      <View style={[styles.card, { backgroundColor: theme.surfaceContainer }]}>
        <Text style={[styles.title, { color: theme.onSurface }]}>Photo access is needed</Text>
        <Text style={[styles.message, { color: theme.onSurfaceVariant }]}>
          {unavailable
            ? permission.unavailableReason
            : 'Allow access to browse photos and videos stored on this device.'}
        </Text>
        <View style={styles.actions}>
          {retryable && !unavailable ? (
            <ActionButton label="Allow access" onPress={() => void request()} />
          ) : null}
          <ActionButton label="Open permission details" variant="tonal" onPress={() => router.push('/permissions')} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
});
