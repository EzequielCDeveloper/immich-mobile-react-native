import { Text, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function PhaseBadge() {
  const theme = useTheme();
  return <Text style={[styles.badge, { color: theme.onSurfaceVariant, backgroundColor: theme.surfaceVariant }]}>Phase 2</Text>;
}

const styles = StyleSheet.create({
  badge: {
    overflow: 'hidden',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
