import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { SMART_START_BACKGROUND_TASK } from '../config/defaults';
import {
  loadAutomationSettings,
  runScheduledAutomation,
} from './automation';
import {
  isInProcessSchedulerRunning,
  startInProcessScheduler,
  stopInProcessScheduler,
} from './automationScheduler';

export type AutomationRuntimeResult = {
  ok: boolean;
  warning?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __smartStartTaskDefined: boolean | undefined;
}

/**
 * Register TaskManager handler once. Must stay free of native Foreground Service
 * APIs — those caused fatal Android process kills that JS try/catch cannot catch.
 */
if (!globalThis.__smartStartTaskDefined && Platform.OS !== 'web') {
  try {
    TaskManager.defineTask(SMART_START_BACKGROUND_TASK, async () => {
      try {
        await runScheduledAutomation();
        return BackgroundTask.BackgroundTaskResult.Success;
      } catch (error) {
        console.warn('[SmartStart] background task failed', error);
        return BackgroundTask.BackgroundTaskResult.Failed;
      }
    });
  } catch (error) {
    console.warn('[SmartStart] defineTask failed', error);
  }
  globalThis.__smartStartTaskDefined = true;
}

async function registerExpoBackgroundTask(): Promise<void> {
  if (Platform.OS === 'web') return;

  const automation = await loadAutomationSettings();
  const minutes = Math.max(
    automation.intervalMinutes,
    automation.offWindowIntervalMinutes,
    15,
  );

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      SMART_START_BACKGROUND_TASK,
    );
    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(SMART_START_BACKGROUND_TASK);
    }
    await BackgroundTask.registerTaskAsync(SMART_START_BACKGROUND_TASK, {
      minimumInterval: minutes,
    });
  } catch (error) {
    console.warn('[SmartStart] registerExpoBackgroundTask failed', error);
    throw error;
  }
}

async function unregisterExpoBackgroundTask(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      SMART_START_BACKGROUND_TASK,
    );
    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(SMART_START_BACKGROUND_TASK);
    }
  } catch (error) {
    console.warn('[SmartStart] unregister failed', error);
  }
}

/**
 * Stable automation runtime (no react-native-background-actions).
 * - In-process timer while the app runtime is alive
 * - expo-background-task for OS-deferred background wakes (Android/iOS)
 */
export async function startAutomationRuntime(): Promise<AutomationRuntimeResult> {
  try {
    const automation = await loadAutomationSettings();
    if (!automation.enabled) {
      await stopAutomationRuntime();
      return { ok: true };
    }

    await startInProcessScheduler();

    let warning: string | undefined;
    if (Platform.OS !== 'web') {
      try {
        await registerExpoBackgroundTask();
      } catch {
        warning =
          'Tâche système d’arrière-plan indisponible — la surveillance continue tant que l’app reste ouverte.';
      }
    } else {
      warning =
        'Sur le web, l’automatisation ne tourne que lorsque l’onglet est ouvert.';
    }

    return { ok: true, warning };
  } catch (error) {
    console.warn('[SmartStart] startAutomationRuntime failed', error);
    try {
      await stopInProcessScheduler();
    } catch {
      // ignore
    }
    return {
      ok: false,
      warning:
        error instanceof Error
          ? error.message
          : 'Échec du démarrage de l’automatisation',
    };
  }
}

export async function stopAutomationRuntime(): Promise<void> {
  try {
    await stopInProcessScheduler();
  } catch (error) {
    console.warn('[SmartStart] stop scheduler failed', error);
  }
  try {
    await unregisterExpoBackgroundTask();
  } catch (error) {
    console.warn('[SmartStart] stop background task failed', error);
  }
}

export async function syncAutomationRuntime(
  enabled: boolean,
): Promise<AutomationRuntimeResult> {
  try {
    if (enabled) {
      return await startAutomationRuntime();
    }
    await stopAutomationRuntime();
    return { ok: true };
  } catch (error) {
    console.warn('[SmartStart] syncAutomationRuntime failed', error);
    return {
      ok: false,
      warning:
        error instanceof Error
          ? error.message
          : 'Échec synchronisation automatisation',
    };
  }
}

export function isForegroundServiceRunning(): boolean {
  // Kept for Settings UI compatibility — now reflects in-process scheduler.
  return isInProcessSchedulerRunning();
}
