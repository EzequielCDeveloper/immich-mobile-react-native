export type ThemePreference = 'system' | 'light' | 'dark';

export type AppSettings = {
  theme: ThemePreference;
  tilesPerRow: 3 | 4 | 5;
  controlsAutoHide: boolean;
  videoLoop: boolean;
};

export const defaultSettings: AppSettings = {
  theme: 'system',
  tilesPerRow: 4,
  controlsAutoHide: true,
  videoLoop: true,
};

export function normalizeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== 'object') {
    return defaultSettings;
  }

  const candidate = value as Partial<AppSettings>;
  const theme: ThemePreference =
    candidate.theme === 'light' || candidate.theme === 'dark' ? candidate.theme : 'system';
  const tilesPerRow: AppSettings['tilesPerRow'] =
    candidate.tilesPerRow === 3 || candidate.tilesPerRow === 5 ? candidate.tilesPerRow : 4;

  return {
    theme,
    tilesPerRow,
    controlsAutoHide: candidate.controlsAutoHide !== false,
    videoLoop: candidate.videoLoop !== false,
  };
}
