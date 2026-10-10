import { useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

export function Screen({
  children,
  style,
  contentStyle,
  navigationInset = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  navigationInset?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const theme = useTheme();
  const isLandscape = width > height;

  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={[{ flex: 1, backgroundColor: theme.surface }, style]}>
      <View
        style={[
          { flex: 1 },
          navigationInset && isLandscape ? { paddingLeft: 88, paddingBottom: 12 } : null,
          navigationInset && !isLandscape ? { paddingBottom: 88 } : null,
          contentStyle,
        ]}>
        {children}
      </View>
    </SafeAreaView>
  );
}
