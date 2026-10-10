import { Pressable, Text, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.surfaceContainer },
        pressed && !disabled ? { opacity: 0.7 } : null,
        disabled ? { opacity: 0.45 } : null,
      ]}>
      <Text style={[styles.icon, { color: theme.onSurface }]}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
    lineHeight: 24,
  },
});
