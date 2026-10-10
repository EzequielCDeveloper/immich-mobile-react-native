import { View, StyleSheet, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function SurfaceCard({ style, ...props }: ViewProps) {
  const theme = useTheme();
  return <View {...props} style={[styles.card, { backgroundColor: theme.surfaceContainer }, style]} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
  },
});
