import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { DEFAULT_CONFIG, STORAGE_KEYS } from '../config/defaults';
import type { FreeboxConfig } from '../types/remote';

type SettingsContextValue = {
  config: FreeboxConfig;
  loaded: boolean;
  updateConfig: (partial: Partial<FreeboxConfig>) => Promise<void>;
  resetConfig: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

async function loadConfig(): Promise<FreeboxConfig> {
  const [host, code, timeoutRaw] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.host),
    AsyncStorage.getItem(STORAGE_KEYS.code),
    AsyncStorage.getItem(STORAGE_KEYS.timeoutMs),
  ]);

  const timeoutMs = timeoutRaw ? Number(timeoutRaw) : DEFAULT_CONFIG.timeoutMs;

  return {
    host: host?.trim() || DEFAULT_CONFIG.host,
    code: code?.trim() || DEFAULT_CONFIG.code,
    timeoutMs:
      Number.isFinite(timeoutMs) && timeoutMs > 0
        ? timeoutMs
        : DEFAULT_CONFIG.timeoutMs,
  };
}

async function persistConfig(config: FreeboxConfig): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.host, config.host),
    AsyncStorage.setItem(STORAGE_KEYS.code, config.code),
    AsyncStorage.setItem(STORAGE_KEYS.timeoutMs, String(config.timeoutMs)),
  ]);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<FreeboxConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadConfig()
      .then((next) => {
        if (!cancelled) {
          setConfig(next);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateConfig = useCallback(async (partial: Partial<FreeboxConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      void persistConfig(next);
      return next;
    });
  }, []);

  const resetConfig = useCallback(async () => {
    setConfig(DEFAULT_CONFIG);
    await persistConfig(DEFAULT_CONFIG);
  }, []);

  const value = useMemo(
    () => ({ config, loaded, updateConfig, resetConfig }),
    [config, loaded, updateConfig, resetConfig],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
