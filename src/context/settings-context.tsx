import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { defaultSettings, type AppSettings } from '@/lib/settings/defaults';
import { FileSettingsStore, type SettingsStore } from '@/lib/settings/settings-store';

export type SettingsPersistenceStatus = 'loading' | 'saving' | 'available' | 'unavailable';

type SettingsContextValue = {
  settings: AppSettings;
  isReady: boolean;
  persistenceStatus: SettingsPersistenceStatus;
  persistenceError: string | null;
  updateSettings: (patch: Partial<AppSettings>) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children, store }: PropsWithChildren<{ store?: SettingsStore }>) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isReady, setIsReady] = useState(false);
  const [persistenceStatus, setPersistenceStatus] = useState<SettingsPersistenceStatus>('loading');
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const userChangedRef = useRef(false);
  const saveOperationRef = useRef(0);
  const settingsStore = useMemo(() => store ?? new FileSettingsStore(), [store]);

  useEffect(() => {
    let active = true;
    userChangedRef.current = false;
    saveOperationRef.current += 1;
    void settingsStore
      .load()
      .then((loaded) => {
        if (!active || loaded === null) {
          return;
        }
        if (!userChangedRef.current) {
          setSettings(loaded);
        }
        setIsReady(true);
        setPersistenceStatus('available');
      })
      .catch((reason: unknown) => {
        if (!active) {
          return;
        }
        setIsReady(true);
        setPersistenceStatus('unavailable');
        setPersistenceError(
          reason instanceof Error ? reason.message : 'Saved settings could not be read.'
        );
      });

    return () => {
      active = false;
    };
  }, [settingsStore]);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    const operation = saveOperationRef.current + 1;
    saveOperationRef.current = operation;
    let active = true;
    void Promise.resolve()
      .then(() => {
        if (!active) {
          return;
        }
        setPersistenceStatus('saving');
        return settingsStore.save(settings);
      })
      .then(
        () => {
          if (active && operation === saveOperationRef.current) {
            setPersistenceStatus('available');
            setPersistenceError(null);
          }
        },
        (reason: unknown) => {
          if (active && operation === saveOperationRef.current) {
            setPersistenceStatus('unavailable');
            setPersistenceError(reason instanceof Error ? reason.message : 'Settings could not be saved locally.');
          }
        }
      );
    return () => {
      active = false;
    };
  }, [isReady, settings, settingsStore]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    userChangedRef.current = true;
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const value = useMemo(
    () => ({ settings, isReady, persistenceStatus, persistenceError, updateSettings }),
    [isReady, persistenceError, persistenceStatus, settings, updateSettings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return value;
}
