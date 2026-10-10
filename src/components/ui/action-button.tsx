import { Pressable, Text, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function ActionButton({
  label,
  onPress,
  variant = 'filled',
  disabled = false,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'filled' | 'tonal' | 'outlined' | 'text';
  disabled?: boolean;
}) {
  const theme = useTheme();
  const filled = variant === 'filled';
  const tonal = variant === 'tonal';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        filled ? { backgroundColor: theme.primary } : null,
        tonal ? { backgroundColor: theme.primaryContainer } : null,
        variant === 'outlined' ? { borderColor: theme.outline, borderWidth: 1 } : null,
        variant === 'text' ? { backgroundColor: 'transparent' } : null,
        pressed && !disabled ? { opacity: 0.75 } : null,
        disabled ? { opacity: 0.45 } : null,
      ]}>
      <Text
        style={[
          styles.label,
          { color: filled ? theme.onPrimary : tonal ? theme.onPrimaryContainer : theme.primary },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
});
