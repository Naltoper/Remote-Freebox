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
import {
  syncAutomationRuntime,
  type AutomationRuntimeResult,
} from '../services/backgroundAutomation';
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
  lastAutomationWarning: string | null;
  updateConfig: (partial: Partial<FreeboxConfig>) => Promise<void>;
  updateAutomation: (
    partial: Partial<AutomationSettings>,
  ) => Promise<AutomationRuntimeResult>;
  resetConfig: () => Promise<void>;
  clearAutomationWarning: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

async function loadConfig(): Promise<FreeboxConfig> {
  try {
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
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

async function persistConfig(config: FreeboxConfig): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.host, config.host),
      AsyncStorage.setItem(STORAGE_KEYS.code, config.code),
      AsyncStorage.setItem(STORAGE_KEYS.timeoutMs, String(config.timeoutMs)),
    ]);
  } catch (error) {
    console.warn('[Settings] persistConfig failed', error);
  }
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
  };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<FreeboxConfig>(DEFAULT_CONFIG);
  const [automation, setAutomation] =
    useState<AutomationSettings>(DEFAULT_AUTOMATION);
  const [loaded, setLoaded] = useState(false);
  const [lastAutomationWarning, setLastAutomationWarning] = useState<
    string | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    let bootTimer: ReturnType<typeof setTimeout> | null = null;

    Promise.all([loadConfig(), loadAutomationSettings()])
      .then(([nextConfig, nextAutomation]) => {
        if (cancelled) return;
        setConfig(nextConfig);
        setAutomation(nextAutomation);
        setLoaded(true);

        if (nextAutomation.enabled) {
          bootTimer = setTimeout(() => {
            void syncAutomationRuntime(true)
              .then((result) => {
                if (!cancelled && result.warning) {
                  setLastAutomationWarning(result.warning);
                }
              })
              .catch((error) => {
                console.warn('[Settings] boot automation sync failed', error);
              });
          }, 1500);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
      if (bootTimer) clearTimeout(bootTimer);
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
      await persistAutomationSettings(nextSettings);
      setAutomation(nextSettings);

      try {
        const result = await syncAutomationRuntime(nextSettings.enabled);
        if (result.warning) {
          setLastAutomationWarning(result.warning);
        } else {
          setLastAutomationWarning(null);
        }
        return result;
      } catch (error) {
        const warning =
          error instanceof Error
            ? error.message
            : 'Échec démarrage automatisation';
        setLastAutomationWarning(warning);
        return { ok: false, warning };
      }
    },
    [automation],
  );

  const resetConfig = useCallback(async () => {
    setConfig(DEFAULT_CONFIG);
    setAutomation(DEFAULT_AUTOMATION);
    setLastAutomationWarning(null);
    await persistConfig(DEFAULT_CONFIG);
    await persistAutomationSettings(DEFAULT_AUTOMATION);
    try {
      await syncAutomationRuntime(false);
    } catch {
      // ignore
    }
  }, []);

  const clearAutomationWarning = useCallback(() => {
    setLastAutomationWarning(null);
  }, []);

  const value = useMemo(
    () => ({
      config,
      automation,
      loaded,
      lastAutomationWarning,
      updateConfig,
      updateAutomation,
      resetConfig,
      clearAutomationWarning,
    }),
    [
      config,
      automation,
      loaded,
      lastAutomationWarning,
      updateConfig,
      updateAutomation,
      resetConfig,
      clearAutomationWarning,
    ],
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
