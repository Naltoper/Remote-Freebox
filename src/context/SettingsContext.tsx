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

import {
  DEFAULT_AUTOMATION,
  DEFAULT_CONFIG,
  STORAGE_KEYS,
} from '../config/defaults';
import {
  loadAutomationSettings,
  persistAutomationSettings,
} from '../services/automation';
import { syncAutomationRuntime } from '../services/backgroundAutomation';
import type { AutomationSettings, FreeboxConfig } from '../types/remote';
import {
  clampIntervalMinutes,
  formatHm,
  parseHmToMinutes,
} from '../utils/timeWindow';

type SettingsContextValue = {
  config: FreeboxConfig;
  automation: AutomationSettings;
  loaded: boolean;
  updateConfig: (partial: Partial<FreeboxConfig>) => Promise<void>;
  updateAutomation: (partial: Partial<AutomationSettings>) => Promise<void>;
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

function normalizeAutomation(
  partial: Partial<AutomationSettings>,
  base: AutomationSettings,
): AutomationSettings {
  const windowStartRaw = partial.windowStart ?? base.windowStart;
  const windowEndRaw = partial.windowEnd ?? base.windowEnd;
  const windowStart =
    parseHmToMinutes(windowStartRaw) != null
      ? formatHm(windowStartRaw)
      : base.windowStart;
  const windowEnd =
    parseHmToMinutes(windowEndRaw) != null
      ? formatHm(windowEndRaw)
      : base.windowEnd;

  return {
    enabled: partial.enabled ?? base.enabled,
    windowStart,
    windowEnd,
    intervalMinutes: clampIntervalMinutes(
      partial.intervalMinutes ?? base.intervalMinutes,
      DEFAULT_AUTOMATION.intervalMinutes,
    ),
    offWindowIntervalMinutes: clampIntervalMinutes(
      partial.offWindowIntervalMinutes ?? base.offWindowIntervalMinutes,
      DEFAULT_AUTOMATION.offWindowIntervalMinutes,
    ),
  };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<FreeboxConfig>(DEFAULT_CONFIG);
  const [automation, setAutomation] =
    useState<AutomationSettings>(DEFAULT_AUTOMATION);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadConfig(), loadAutomationSettings()])
      .then(([nextConfig, nextAutomation]) => {
        if (cancelled) return;
        setConfig(nextConfig);
        setAutomation(nextAutomation);
        setLoaded(true);
        if (nextAutomation.enabled) {
          void syncAutomationRuntime(true);
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

  const updateAutomation = useCallback(
    async (partial: Partial<AutomationSettings>) => {
      const nextSettings = normalizeAutomation(partial, automation);
      setAutomation(nextSettings);
      await persistAutomationSettings(nextSettings);
      await syncAutomationRuntime(nextSettings.enabled);
    },
    [automation],
  );

  const resetConfig = useCallback(async () => {
    setConfig(DEFAULT_CONFIG);
    setAutomation(DEFAULT_AUTOMATION);
    await persistConfig(DEFAULT_CONFIG);
    await persistAutomationSettings(DEFAULT_AUTOMATION);
    await syncAutomationRuntime(false);
  }, []);

  const value = useMemo(
    () => ({
      config,
      automation,
      loaded,
      updateConfig,
      updateAutomation,
      resetConfig,
    }),
    [config, automation, loaded, updateConfig, updateAutomation, resetConfig],
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
