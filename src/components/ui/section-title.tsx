import { Text, View, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function SectionTitle({ title, detail }: { title: string; detail?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.onSurface }]}>{title}</Text>
      {detail ? <Text style={[styles.detail, { color: theme.onSurfaceVariant }]}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  detail: {
    fontSize: 12,
    lineHeight: 16,
  },
});
