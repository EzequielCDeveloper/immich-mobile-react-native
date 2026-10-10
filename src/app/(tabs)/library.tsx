import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';

import { PhaseBadge } from '@/components/ui/phase-badge';
import { AppBar } from '@/components/ui/app-bar';
import { ActionButton } from '@/components/ui/action-button';
import { Screen } from '@/components/ui/screen';
import { SurfaceCard } from '@/components/ui/surface-card';
import { useMediaContext } from '@/context/media-context';
import { useTheme } from '@/hooks/use-theme';

export default function LibraryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const media = useMediaContext();
  const [storageLabel, setStorageLabel] = useState('Checking metadata…');

  useEffect(() => {
    let active = true;
    void media.service.getStorageEstimate().then((estimate) => {
      if (!active) {
        return;
      }
      if (estimate.status === 'available' && estimate.bytes !== null) {
        setStorageLabel(formatBytes(estimate.bytes));
      } else {
        setStorageLabel('Unavailable from metadata');
      }
    });
    return () => {
      active = false;
    };
  }, [media.revision, media.service]);

  return (
    <Screen>
      <AppBar title="Library" subtitle="Local-only controls" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SurfaceCard>
          <Text style={[styles.cardTitle, { color: theme.onSurface }]}>Storage usage</Text>
          <Text style={[styles.value, { color: theme.primary }]}>{storageLabel}</Text>
          <Text style={[styles.body, { color: theme.onSurfaceVariant }]}>Estimate uses metadata only. File sizes are not read when unavailable.</Text>
        </SurfaceCard>

        <SurfaceCard>
          <Text style={[styles.cardTitle, { color: theme.onSurface }]}>Access</Text>
          <Text style={[styles.body, { color: theme.onSurfaceVariant }]}>{permissionLabel(media.permission.state)}</Text>
          <View style={styles.actionRow}>
            <ActionButton label="Manage access" variant="tonal" onPress={() => router.push('/permissions')} />
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <Text style={[styles.cardTitle, { color: theme.onSurface }]}>Personalize</Text>
          <Text style={[styles.body, { color: theme.onSurfaceVariant }]}>Theme, density, viewer controls, and video playback preferences.</Text>
          <View style={styles.actionRow}>
            <ActionButton label="Open settings" onPress={() => router.push('/settings')} />
            <ActionButton label="About" variant="outlined" onPress={() => router.push('/about')} />
          </View>
        </SurfaceCard>

        <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Server features</Text>
        <DisabledPhaseTwoCard title="Connect to a server" detail="Network accounts are intentionally not available in this phase." />
        <DisabledPhaseTwoCard title="Backup and sync" detail="This local gallery does not send media or metadata anywhere." />
      </ScrollView>
    </Screen>
  );
}

function DisabledPhaseTwoCard({ title, detail }: { title: string; detail: string }) {
  const theme = useTheme();
  return (
    <Pressable
      disabled
      accessibilityRole="button"
      accessibilityLabel={`${title}, disabled, Phase 2`}
      accessibilityState={{ disabled: true }}
      style={[styles.disabledCard, { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant }]}>
      <View style={styles.disabledText}>
        <Text style={[styles.cardTitle, { color: theme.onSurfaceVariant }]}>{title}</Text>
        <Text style={[styles.body, { color: theme.onSurfaceVariant }]}>{detail}</Text>
      </View>
      <PhaseBadge />
    </Pressable>
  );
}

function permissionLabel(state: string): string {
  switch (state) {
    case 'granted-all':
      return 'Full photo and video access';
    case 'granted-limited':
      return 'Limited photo and video access';
    case 'denied-retryable':
      return 'Access denied; it can be requested again';
    case 'denied-settings':
      return 'Access is disabled in system settings';
    case 'undetermined':
      return 'Access has not been requested';
    default:
      return 'Checking access';
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 0; index < units.length - 1 && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index + 1];
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${unit}`;
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 14,
  },
  cardTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
  },
  value: {
    marginTop: 8,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
  },
  body: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  sectionTitle: {
    paddingHorizontal: 4,
    paddingTop: 8,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  disabledCard: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  disabledText: {
    flex: 1,
  },
});
