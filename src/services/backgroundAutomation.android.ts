import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import BackgroundService from 'react-native-background-actions';

import {
  SMART_START_BACKGROUND_TASK,
  SMART_START_FOREGROUND_TASK,
} from '../config/defaults';
import { PASSIVE_WAIT_MS } from '../config/defaults';
import {
  loadAutomationSettings,
  runScheduledAutomation,
} from './automation';
import {
  startInProcessScheduler,
  stopInProcessScheduler,
} from './automationScheduler';
import { msUntilNextAutomationWake } from '../utils/timeWindow';

export type AutomationRuntimeResult = {
  ok: boolean;
  warning?: string;
};

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
    return msUntilNextAutomationWake(
      new Date(),
      automation.windowStart,
      automation.windowEnd,
      automation.intervalMinutes,
      PASSIVE_WAIT_MS,
    );
  } catch {
    return PASSIVE_WAIT_MS;
  }
}

/**
 * Runs inside the Android Foreground Service / Headless JS context.
 * Network and macro errors must never escape uncaught.
 */
const foregroundLoop = async () => {
  await sleep(2500);
  while (BackgroundService.isRunning()) {
    try {
      await runScheduledAutomation();
    } catch (error) {
      console.warn('[SmartStart] FGS loop macro error', error);
    }
    try {
      await sleep(await resolveLoopDelayMs());
    } catch {
      await sleep(15 * 60 * 1000);
    }
  }
};

async function ensureNotificationReady(): Promise<{
  granted: boolean;
  warning?: string;
}> {
  try {
    await Notifications.setNotificationChannelAsync(
      'RN_BACKGROUND_ACTIONS_CHANNEL',
      {
        name: 'Automatisation Freebox',
        importance: Notifications.AndroidImportance.LOW,
        vibrationPattern: [0],
        enableVibrate: false,
        showBadge: false,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      },
    );

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }

    if (status !== 'granted') {
      return {
        granted: false,
        warning:
          'Permission notification refusée — le Foreground Service ne peut pas démarrer.',
      };
    }
    return { granted: true };
  } catch (error) {
    console.warn('[SmartStart] notification setup failed', error);
    return {
      granted: false,
      warning: 'Impossible de préparer le canal de notification.',
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

    const notif = await ensureNotificationReady();
    if (!notif.granted) {
      return { started: false, warning: notif.warning };
    }

    await BackgroundService.start(foregroundLoop, {
      taskName: SMART_START_FOREGROUND_TASK,
      taskTitle: 'Automatisation Freebox active',
      taskDesc: 'Surveillance du Player en arrière-plan',
      taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
      },
      color: '#e8a317',
      linkingURI: 'remotetvmamie://',
      // Must match android:foregroundServiceType in the Expo config plugin.
      foregroundServiceType: ['dataSync'],
      parameters: {},
    });

    return { started: true };
  } catch (error) {
    console.warn('[SmartStart] FGS start failed', error);
    return {
      started: false,
      warning:
        error instanceof Error
          ? `Foreground Service indisponible: ${error.message}`
          : 'Foreground Service indisponible.',
    };
  }
}

async function stopAndroidForegroundService(): Promise<void> {
  try {
    if (BackgroundService.isRunning()) {
      await BackgroundService.stop();
    }
  } catch (error) {
    console.warn('[SmartStart] FGS stop failed', error);
  }
}

async function registerExpoBackgroundTask(): Promise<void> {
  const automation = await loadAutomationSettings();
  const minutes = Math.max(automation.intervalMinutes, 15);

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

/**
 * Android: Foreground Service (dataSync) + expo-background-task fallback.
 * Never throws to callers.
 */
export async function startAutomationRuntime(): Promise<AutomationRuntimeResult> {
  try {
    const automation = await loadAutomationSettings();
    if (!automation.enabled) {
      await stopAutomationRuntime();
      return { ok: true };
    }

    // Prefer FGS so timers keep running in background.
    const fg = await startAndroidForegroundService();
    if (fg.started) {
      // Avoid double-firing macros with the in-process timer.
      await stopInProcessScheduler();
    } else {
      // Soft fallback if FGS cannot start (permissions / OEM).
      await startInProcessScheduler();
    }

    try {
      await registerExpoBackgroundTask();
    } catch (error) {
      console.warn('[SmartStart] background task register failed', error);
    }

    return {
      ok: true,
      warning: fg.started
        ? undefined
        : fg.warning ||
          'Foreground Service non démarré — surveillance limitée à l’app ouverte.',
    };
  } catch (error) {
    console.warn('[SmartStart] startAutomationRuntime failed', error);
    try {
      await startInProcessScheduler();
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
  await stopAndroidForegroundService();
  await stopInProcessScheduler();
  await unregisterExpoBackgroundTask();
}

export async function syncAutomationRuntime(
  enabled: boolean,
): Promise<AutomationRuntimeResult> {
  try {
    if (enabled) {
      await sleep(350);
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
  try {
    return BackgroundService.isRunning();
  } catch {
    return false;
  }
}
