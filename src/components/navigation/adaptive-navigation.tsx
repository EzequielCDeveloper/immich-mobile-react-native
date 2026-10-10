import { useWindowDimensions, Pressable, Text, View, StyleSheet } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';

import { useTheme } from '@/hooks/use-theme';

const labels: Record<string, string> = {
  index: 'Photos',
  search: 'Search',
  albums: 'Albums',
  library: 'Library',
};

const icons: Record<string, string> = {
  index: '▦',
  search: '⌕',
  albums: '▤',
  library: '☰',
};

export function AdaptiveNavigation({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { width, height } = useWindowDimensions();
  const theme = useTheme();
  const isLandscape = width > height;

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        isLandscape
          ? [styles.rail, { backgroundColor: theme.surfaceContainer, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]
          : [styles.bottomBar, { backgroundColor: theme.surfaceContainer, paddingBottom: insets.bottom + 8 }],
      ]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = labels[route.name] ?? descriptors[route.key]?.options.title ?? route.name;
        const icon = icons[route.name] ?? '•';
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={`${label} tab${focused ? ', selected' : ''}`}
            accessibilityState={{ selected: focused }}
            testID={`tab-${route.name}`}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }}
            style={({ pressed }) => [
              styles.item,
              isLandscape ? styles.railItem : styles.bottomItem,
              focused ? { backgroundColor: theme.primaryContainer } : null,
              pressed ? { opacity: 0.75 } : null,
            ]}>
            <Text style={[styles.icon, { color: focused ? theme.primary : theme.onSurfaceVariant }]}>{icon}</Text>
            <Text style={[styles.label, { color: focused ? theme.onSurface : theme.onSurfaceVariant }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 5,
    elevation: 5,
  },
  bottomBar: {
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 76,
    paddingTop: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 4,
  },
  rail: {
    left: 0,
    top: 0,
    bottom: 0,
    width: 76,
    paddingHorizontal: 8,
    justifyContent: 'center',
    gap: 12,
  },
  item: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  bottomItem: {
    flex: 1,
  },
  railItem: {
    width: 60,
  },
  icon: {
    fontSize: 22,
    lineHeight: 26,
  },
  label: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
});
