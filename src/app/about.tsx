import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ScrollView, Text, View, StyleSheet } from 'react-native';

import { AppBar } from '@/components/ui/app-bar';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';

const licenses = [
  ['Expo', 'MIT'],
  ['React', 'MIT'],
  ['React Native', 'MIT'],
  ['Expo Router', 'MIT'],
];

export default function AboutScreen() {
  const router = useRouter();
  const theme = useTheme();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen navigationInset={false}>
      <AppBar title="About" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.name, { color: theme.onSurface }]}>Local Gallery</Text>
        <Text style={[styles.version, { color: theme.primary }]}>Version {version}</Text>
        <Text style={[styles.body, { color: theme.onSurfaceVariant }]}>A private, local-only photo and video browser. The app reads supported device metadata and does not connect to a remote service.</Text>
        <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Licenses</Text>
        <View style={[styles.licenseCard, { backgroundColor: theme.surfaceContainer }]}>
          {licenses.map(([name, license]) => (
            <View key={name} style={[styles.licenseRow, { borderBottomColor: theme.outlineVariant }]}>
              <Text style={[styles.body, { color: theme.onSurface }]}>{name}</Text>
              <Text style={[styles.body, { color: theme.onSurfaceVariant }]}>{license}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 10,
  },
  name: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
  },
  version: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  sectionTitle: {
    marginTop: 22,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  licenseCard: {
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  licenseRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
