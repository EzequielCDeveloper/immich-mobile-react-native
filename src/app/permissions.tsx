import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';

import { ActionButton } from '@/components/ui/action-button';
import { AppBar } from '@/components/ui/app-bar';
import { Screen } from '@/components/ui/screen';
import { SurfaceCard } from '@/components/ui/surface-card';
import { useMediaPermission } from '@/hooks/use-media-permission';
import { useTheme } from '@/hooks/use-theme';

export default function PermissionsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { permission, isChecking, recheck, request, manageLimitedAccess } = useMediaPermission();
  const canManageLimited = permission.state === 'granted-limited';
  const canRequest = permission.state === 'undetermined' || permission.state === 'denied-retryable';

  return (
    <Screen navigationInset={false}>
      <AppBar title="Photo access" onBack={() => router.back()} />
      <View style={styles.content}>
        <SurfaceCard>
          <Text style={[styles.state, { color: theme.primary }]}>{stateTitle(permission.state)}</Text>
          <Text style={[styles.message, { color: theme.onSurfaceVariant }]}>
            {permission.unavailableReason ?? stateMessage(permission.state)}
          </Text>
          <View style={styles.actions}>
            {canRequest ? <ActionButton label="Request access" onPress={() => void request()} /> : null}
            {permission.state === 'denied-settings' ? (
              <ActionButton label="Open system settings" variant="tonal" onPress={() => void Linking.openSettings()} />
            ) : null}
            {canManageLimited ? (
              <ActionButton label="Manage selected media" variant="tonal" onPress={() => void manageLimitedAccess()} />
            ) : null}
            <ActionButton label={isChecking ? 'Checking…' : 'Check again'} variant="outlined" disabled={isChecking} onPress={() => void recheck()} />
          </View>
        </SurfaceCard>
        <Text style={[styles.note, { color: theme.onSurfaceVariant }]}>Only images and videos are included. Audio and unknown media are excluded.</Text>
      </View>
    </Screen>
  );
}

function stateTitle(state: string): string {
  switch (state) {
    case 'granted-all':
      return 'Full access granted';
    case 'granted-limited':
      return 'Limited access granted';
    case 'denied-retryable':
      return 'Access was denied';
    case 'denied-settings':
      return 'Access is disabled';
    case 'undetermined':
      return 'Access has not been requested';
    default:
      return 'Checking access';
  }
}

function stateMessage(state: string): string {
  switch (state) {
    case 'granted-all':
      return 'The app can browse all supported local photos and videos.';
    case 'granted-limited':
      return 'The app can browse only the media selected in system permissions.';
    case 'denied-retryable':
      return 'You can request local photo and video access again.';
    case 'denied-settings':
      return 'Open system settings to change this app’s media permission.';
    case 'undetermined':
      return 'Grant access to browse the device library.';
    default:
      return 'The permission state is being checked locally.';
  }
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 12,
  },
  state: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  message: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  note: {
    paddingHorizontal: 4,
    fontSize: 13,
    lineHeight: 19,
  },
});
