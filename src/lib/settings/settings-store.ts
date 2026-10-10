import { File, Paths } from 'expo-file-system';

import { defaultSettings, normalizeSettings, type AppSettings } from '@/lib/settings/defaults';

export interface SettingsStore {
  load(): Promise<AppSettings>;
  save(settings: AppSettings): Promise<void>;
}

const settingsFileName = 'local-gallery-settings.json';

export class FileSettingsStore implements SettingsStore {
  private readonly file = new File(Paths.document, settingsFileName);

  async load(): Promise<AppSettings> {
    try {
      if (!this.file.exists) {
        return defaultSettings;
      }
      return normalizeSettings(await this.file.json());
    } catch {
      throw new Error('Saved local settings could not be read.');
    }
  }

  async save(settings: AppSettings): Promise<void> {
    try {
      if (!this.file.exists) {
        this.file.create({ intermediates: true });
      }
      this.file.write(JSON.stringify(settings));
    } catch {
      throw new Error('Local settings could not be saved.');
    }
  }
}

export class MemorySettingsStore implements SettingsStore {
  private value: AppSettings;

  constructor(initial: AppSettings = defaultSettings) {
    this.value = normalizeSettings(initial);
  }

  async load(): Promise<AppSettings> {
    return this.value;
  }

  async save(settings: AppSettings): Promise<void> {
    this.value = normalizeSettings(settings);
  }
}
