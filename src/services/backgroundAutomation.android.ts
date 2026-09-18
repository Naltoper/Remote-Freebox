import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';
import BackgroundService from 'react-native-background-actions';

import {
  SMART_START_BACKGROUND_TASK,
  SMART_START_FOREGROUND_TASK,
} from '../config/defaults';
import {
  loadAutomationSettings,
  runScheduledAutomation,
} from './automation';
import { isInTimeWindow } from '../utils/timeWindow';

declare global {
  // eslint-disable-next-line no-var
  var __smartStartTaskDefined: boolean | undefined;
}

if (!globalThis.__smartStartTaskDefined) {
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveLoopDelayMs(): Promise<number> {
  const automation = await loadAutomationSettings();
  const inWindow = isInTimeWindow(
    new Date(),
    automation.windowStart,
    automation.windowEnd,
  );
  const minutes = inWindow
    ? automation.intervalMinutes
    : automation.offWindowIntervalMinutes;
  return Math.max(minutes, 1) * 60 * 1000;
}

const foregroundLoop = async () => {
  while (BackgroundService.isRunning()) {
    try {
      await runScheduledAutomation();
    } catch (error) {
      console.warn('[SmartStart] foreground loop error', error);
    }
    const delayMs = await resolveLoopDelayMs();
    await sleep(delayMs);
  }
};

async function startAndroidForegroundService(): Promise<void> {
  if (BackgroundService.isRunning()) return;

  try {
    await Notifications.requestPermissionsAsync();
  } catch {
    // Notification permission is best-effort for the sticky FS notification.
  }

  await BackgroundService.start(foregroundLoop, {
    taskName: SMART_START_FOREGROUND_TASK,
    taskTitle: 'Surveillance Freebox',
    taskDesc: 'Automatisation Démarrage intelligent active',
    taskIcon: {
      name: 'ic_launcher',
      type: 'mipmap',
    },
    color: '#e8a317',
    linkingURI: 'remotetvmamie://',
    foregroundServiceType: ['dataSync'],
    parameters: {},
  });
}

async function stopAndroidForegroundService(): Promise<void> {
  if (!BackgroundService.isRunning()) return;
  await BackgroundService.stop();
}

async function registerExpoBackgroundTask(): Promise<void> {
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
  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    SMART_START_BACKGROUND_TASK,
  );
  if (isRegistered) {
    await BackgroundTask.unregisterTaskAsync(SMART_START_BACKGROUND_TASK);
  }
}

/**
 * Android: sticky Foreground Service (24/7 loop) + Expo BackgroundTask fallback.
 */
export async function startAutomationRuntime(): Promise<void> {
  const automation = await loadAutomationSettings();
  if (!automation.enabled) {
    await stopAutomationRuntime();
    return;
  }

  await startAndroidForegroundService();

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
  await stopAndroidForegroundService();
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
  try {
    return BackgroundService.isRunning();
  } catch {
    return false;
  }
}
