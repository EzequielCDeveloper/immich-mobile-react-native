import { useRouter } from 'expo-router';
import { ScrollView, Switch, Text, Pressable, View, StyleSheet } from 'react-native';

import { AppBar } from '@/components/ui/app-bar';
import { Screen } from '@/components/ui/screen';
import { useSettings } from '@/context/settings-context';
import { useTheme } from '@/hooks/use-theme';
import type { ThemePreference } from '@/lib/settings/defaults';

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { settings, updateSettings, persistenceStatus, persistenceError } = useSettings();

  return (
    <Screen navigationInset={false}>
      <AppBar title="Settings" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.persistenceStatus, { color: persistenceStatus === 'unavailable' ? theme.error : theme.onSurfaceVariant }]}>
          {persistenceStatusLabel(persistenceStatus, persistenceError)}
        </Text>
        <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Theme</Text>
        <View style={styles.choiceRow}>
          {(['system', 'light', 'dark'] as ThemePreference[]).map((choice) => (
            <PreferenceChoice
              key={choice}
              label={capitalize(choice)}
              selected={settings.theme === choice}
              onPress={() => updateSettings({ theme: choice })}
            />
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Timeline density</Text>
        <View style={styles.choiceRow}>
          {([3, 4, 5] as const).map((columns) => (
            <PreferenceChoice
              key={columns}
              label={`${columns} per row`}
              selected={settings.tilesPerRow === columns}
              onPress={() => updateSettings({ tilesPerRow: columns })}
            />
          ))}
        </View>

        <SettingSwitch
          label="Auto-hide viewer controls"
          detail="Controls fade after a short pause while viewing an item."
          value={settings.controlsAutoHide}
          onValueChange={(value) => updateSettings({ controlsAutoHide: value })}
        />
        <SettingSwitch
          label="Loop videos"
          detail="Repeat video playback when the native video module is available."
          value={settings.videoLoop}
          onValueChange={(value) => updateSettings({ videoLoop: value })}
        />
      </ScrollView>
    </Screen>
  );
}

function persistenceStatusLabel(
  status: 'loading' | 'saving' | 'available' | 'unavailable',
  error: string | null
): string {
  switch (status) {
    case 'loading':
      return 'Loading saved settings…';
    case 'saving':
      return 'Saving settings locally…';
    case 'unavailable':
      return error ? `Local persistence unavailable: ${error}` : 'Local persistence unavailable.';
    default:
      return 'Settings saved locally.';
  }
}

function PreferenceChoice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        { backgroundColor: selected ? theme.primaryContainer : theme.surfaceContainer, borderColor: selected ? theme.primary : theme.outlineVariant },
        pressed ? { opacity: 0.75 } : null,
      ]}>
      <Text style={{ color: selected ? theme.onPrimaryContainer : theme.onSurfaceVariant, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function SettingSwitch({ label, detail, value, onValueChange }: { label: string; detail: string; value: boolean; onValueChange: (value: boolean) => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.switchRow, { borderBottomColor: theme.outlineVariant }]}>
      <View style={styles.switchText}>
        <Text style={[styles.label, { color: theme.onSurface }]}>{label}</Text>
        <Text style={[styles.detail, { color: theme.onSurfaceVariant }]}>{detail}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        accessibilityRole="switch"
        trackColor={{ false: theme.outline, true: theme.primary }}
        thumbColor={value ? theme.onPrimary : theme.surfaceContainerHigh}
      />
    </View>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
  },
  persistenceStatus: {
    fontSize: 13,
    lineHeight: 19,
  },
  sectionTitle: {
    marginTop: 6,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choice: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    minHeight: 72,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  switchText: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  detail: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
  },
});
