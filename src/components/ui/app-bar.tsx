import { View, Text, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

import { IconButton } from '@/components/ui/icon-button';

export function AppBar({
  title,
  subtitle,
  onSettings,
  onBack,
  action,
  actions,
}: {
  title: string;
  subtitle?: string;
  onSettings?: () => void;
  onBack?: () => void;
  action?: React.ReactNode;
  actions?: React.ReactNode[];
}) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      {onBack ? <IconButton icon="‹" label="Go back" onPress={onBack} /> : null}
      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: theme.onSurface }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.onSurfaceVariant }]}>{subtitle}</Text> : null}
      </View>
      {actions ?? (action ? [action] : null)}
      {onSettings ? <IconButton icon="⚙" label="Open settings" onPress={onSettings} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 64,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});
