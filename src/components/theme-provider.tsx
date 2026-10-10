import { StatusBar } from 'expo-status-bar';
import { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { useColorScheme, View } from 'react-native';

import { useSettings } from '@/context/settings-context';
import { getThemeTokens, type ColorSchemeName, type ThemeTokens } from '@/theme/tokens';

type ThemeContextValue = {
  scheme: ColorSchemeName;
  tokens: ThemeTokens;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const { settings } = useSettings();
  const scheme: ColorSchemeName =
    settings.theme === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : settings.theme;
  const value = useMemo(() => ({ scheme, tokens: getThemeTokens(scheme) }), [scheme]);

  return (
    <ThemeContext.Provider value={value}>
      <View style={{ flex: 1, backgroundColor: value.tokens.surface }}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }
  return value;
}
