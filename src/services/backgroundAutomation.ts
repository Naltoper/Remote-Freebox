import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { AppState, Platform } from 'react-native';

import { SMART_START_BACKGROUND_TASK } from '../config/defaults';
import {
  loadAutomationSettings,
  runScheduledAutomation,
} from './automation';

declare global {
  // eslint-disable-next-line no-var
  var __smartStartTaskDefined: boolean | undefined;
}

if (!globalThis.__smartStartTaskDefined && Platform.OS !== 'web') {
  TaskManager.defineTask(SMART_START_BACKGROUND_TASK, async () => {
    try {
      await runScheduledAutomation();
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch (error) {
      console.warn('[SmartStart] background task failed', error);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
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
  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    SMART_START_BACKGROUND_TASK,
  );
  if (isRegistered) {
    await BackgroundTask.unregisterTaskAsync(SMART_START_BACKGROUND_TASK);
  }
}

/** iOS / web: Expo BackgroundTask best-effort (OS-scheduled). */
export async function startAutomationRuntime(): Promise<void> {
  const automation = await loadAutomationSettings();
  if (!automation.enabled) {
    await stopAutomationRuntime();
    return;
  }

  try {
    await registerExpoBackgroundTask();
  } catch (error) {
    console.warn('[SmartStart] could not register background task', error);
  }

  if (AppState.currentState === 'active') {
    void runScheduledAutomation();
  }
}

export async function stopAutomationRuntime(): Promise<void> {
  try {
    await unregisterExpoBackgroundTask();
  } catch {
    // ignore
  }
}

export async function syncAutomationRuntime(enabled: boolean): Promise<void> {
  if (enabled) {
    await startAutomationRuntime();
  } else {
    await stopAutomationRuntime();
  }
}

export function isForegroundServiceRunning(): boolean {
  return false;
}
