import { Tabs } from 'expo-router/js-tabs';

import { AdaptiveNavigation } from '@/components/navigation/adaptive-navigation';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AdaptiveNavigation {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}>
      <Tabs.Screen name="index" options={{ title: 'Photos' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="albums" options={{ title: 'Albums' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
    </Tabs>
  );
}
