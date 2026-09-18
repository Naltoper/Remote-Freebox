import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveLoopDelayMs(): Promise<number> {
  try {
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
  } catch {
    return 15 * 60 * 1000;
  }
}

const foregroundLoop = async () => {
  // First pass after a short delay so the UI / save can settle.
  await sleep(3000);
  while (BackgroundService.isRunning()) {
    try {
      await runScheduledAutomation();
    } catch (error) {
      console.warn('[SmartStart] foreground loop error', error);
    }
    try {
      const delayMs = await resolveLoopDelayMs();
      await sleep(delayMs);
    } catch {
      await sleep(15 * 60 * 1000);
    }
  }
};

async function ensureNotificationSetup(): Promise<{
  ok: boolean;
  warning?: string;
}> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(
        'RN_BACKGROUND_ACTIONS_CHANNEL',
        {
          name: 'Surveillance Freebox',
          importance: Notifications.AndroidImportance.LOW,
          vibrationPattern: [0],
          enableVibrate: false,
          showBadge: false,
        },
      );
    }

    const permissions = await Notifications.getPermissionsAsync();
    let status = permissions.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }

    if (status !== 'granted') {
      return {
        ok: false,
        warning:
          'Permission notification refusée — le service de premier plan peut échouer.',
      };
    }
    return { ok: true };
  } catch (error) {
    console.warn('[SmartStart] notification setup failed', error);
    return {
      ok: false,
      warning: 'Impossible de préparer les notifications.',
    };
  }
}

async function startAndroidForegroundService(): Promise<{
  started: boolean;
  warning?: string;
}> {
  try {
    if (BackgroundService.isRunning()) {
      return { started: true };
    }

    const notif = await ensureNotificationSetup();

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

    return {
      started: true,
      warning: notif.ok ? undefined : notif.warning,
    };
  } catch (error) {
    console.warn('[SmartStart] Foreground Service start failed', error);
    return {
      started: false,
      warning:
        error instanceof Error
          ? `Service premier plan indisponible: ${error.message}`
          : 'Service premier plan indisponible.',
    };
  }
}

async function stopAndroidForegroundService(): Promise<void> {
  try {
    if (!BackgroundService.isRunning()) return;
    await BackgroundService.stop();
  } catch (error) {
    console.warn('[SmartStart] Foreground Service stop failed', error);
  }
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
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      SMART_START_BACKGROUND_TASK,
    );
    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(SMART_START_BACKGROUND_TASK);
    }
  } catch (error) {
    console.warn('[SmartStart] unregister background task failed', error);
  }
}

export type AutomationRuntimeResult = {
  ok: boolean;
  warning?: string;
};

/**
 * Android: sticky Foreground Service + Expo BackgroundTask fallback.
 * Never throws — callers can safely await this on save / app start.
 */
export async function startAutomationRuntime(): Promise<AutomationRuntimeResult> {
  try {
    const automation = await loadAutomationSettings();
    if (!automation.enabled) {
      await stopAutomationRuntime();
      return { ok: true };
    }

    const fg = await startAndroidForegroundService();

    try {
      await registerExpoBackgroundTask();
    } catch (error) {
      console.warn('[SmartStart] could not register background task', error);
    }

    // Do not run the heavy macro synchronously here — the FS loop starts after 3s.
    return {
      ok: fg.started,
      warning: fg.warning,
    };
  } catch (error) {
    console.warn('[SmartStart] startAutomationRuntime failed', error);
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
    await stopAndroidForegroundService();
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
      // Let AsyncStorage / UI settle before touching native services.
      await sleep(400);
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
  try {
    return BackgroundService.isRunning();
  } catch {
    return false;
  }
}
