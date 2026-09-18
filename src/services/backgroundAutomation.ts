import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { SMART_START_BACKGROUND_TASK } from '../config/defaults';
import {
  loadAutomationSettings,
  runScheduledAutomation,
} from './automation';

export type AutomationRuntimeResult = {
  ok: boolean;
  warning?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __smartStartTaskDefined: boolean | undefined;
}

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

  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    SMART_START_BACKGROUND_TASK,
  );
  if (isRegistered) {
    await BackgroundTask.unregisterTaskAsync(SMART_START_BACKGROUND_TASK);
  }

  await BackgroundTask.registerTaskAsync(SMART_START_BACKGROUND_TASK, {
    minimumInterval: minutes,
  });
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

/** iOS / web: Expo BackgroundTask best-effort (OS-scheduled). */
export async function startAutomationRuntime(): Promise<AutomationRuntimeResult> {
  try {
    const automation = await loadAutomationSettings();
    if (!automation.enabled) {
      await stopAutomationRuntime();
      return { ok: true };
    }

    try {
      await registerExpoBackgroundTask();
    } catch (error) {
      console.warn('[SmartStart] could not register background task', error);
      return {
        ok: false,
        warning: 'Tâche d’arrière-plan indisponible sur cet appareil.',
      };
    }

    return { ok: true };
  } catch (error) {
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
    await unregisterExpoBackgroundTask();
  } catch (error) {
    console.warn('[SmartStart] stopAutomationRuntime failed', error);
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
  return false;
}
