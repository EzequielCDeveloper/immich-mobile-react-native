import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function StatusBlock({
  kind,
  title,
  message,
  action,
}: {
  kind: 'loading' | 'empty' | 'error' | 'unavailable';
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceContainer }]}>
      {kind === 'loading' ? <ActivityIndicator color={theme.primary} /> : null}
      <Text style={[styles.title, { color: theme.onSurface }]}>{title}</Text>
      {message ? <Text style={[styles.message, { color: theme.onSurfaceVariant }]}>{message}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
    padding: 24,
    minHeight: 140,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '700',
  },
  message: {
    maxWidth: 420,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  action: {
    marginTop: 4,
  },
});
