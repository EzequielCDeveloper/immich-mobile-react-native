export type ColorSchemeName = 'light' | 'dark';

export type ThemeTokens = {
  surface: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceVariant: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  info: string;
  success: string;
  error: string;
  onError: string;
  scrim: string;
};

export const lightTokens: ThemeTokens = {
  surface: '#f9f9f9',
  surfaceContainer: '#efefef',
  surfaceContainerHigh: '#e8e8e8',
  surfaceVariant: '#e1e2e6',
  onSurface: '#1b1b1b',
  onSurfaceVariant: '#45464b',
  outline: '#76777c',
  outlineVariant: '#c6c6ca',
  primary: '#1984E9',
  onPrimary: '#ffffff',
  primaryContainer: '#d5e8ff',
  onPrimaryContainer: '#001d35',
  info: '#1984E9',
  success: '#10C14D',
  error: '#FA2921',
  onError: '#ffffff',
  scrim: '#000000',
};

export const darkTokens: ThemeTokens = {
  surface: '#131313',
  surfaceContainer: '#202020',
  surfaceContainerHigh: '#2a2a2a',
  surfaceVariant: '#45464b',
  onSurface: '#E2E2E2',
  onSurfaceVariant: '#c6c6ca',
  outline: '#909196',
  outlineVariant: '#45464b',
  primary: '#1984E9',
  onPrimary: '#ffffff',
  primaryContainer: '#004a7d',
  onPrimaryContainer: '#d5e8ff',
  info: '#1984E9',
  success: '#10C14D',
  error: '#FA2921',
  onError: '#ffffff',
  scrim: '#000000',
};

export const tokens: Record<ColorSchemeName, ThemeTokens> = {
  light: lightTokens,
  dark: darkTokens,
};

export function getThemeTokens(scheme: ColorSchemeName): ThemeTokens {
  return tokens[scheme];
}
