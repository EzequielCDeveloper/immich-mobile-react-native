import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemeProvider } from '@/components/theme-provider';
import { MediaProvider } from '@/context/media-context';
import { SettingsProvider } from '@/context/settings-context';
import { VaultProvider } from '@/context/vault-context';
import { ViewerProvider } from '@/context/viewer-context';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <ThemeProvider>
          <MediaProvider>
            <VaultProvider>
              <ViewerProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="permissions" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="about" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="album/[id]" />
                  <Stack.Screen name="album/private/[id]" />
                  <Stack.Screen name="asset/[id]" options={{ animation: 'fade' }} />
                </Stack>
              </ViewerProvider>
            </VaultProvider>
          </MediaProvider>
        </ThemeProvider>
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}
