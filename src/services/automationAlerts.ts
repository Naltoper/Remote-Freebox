import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const AUTOMATION_ERRORS_CHANNEL = 'AUTOMATION_ERRORS';

const BODY_MAX = 180;

/**
 * High-priority Android channel for automation failure alerts.
 * Separate from the silent FGS ongoing notification channel.
 */
export async function ensureErrorChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(AUTOMATION_ERRORS_CHANNEL, {
    name: 'Alertes automatisation',
    description:
      'Notifications prioritaires quand le démarrage intelligent échoue',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 150, 250],
    enableVibrate: true,
    showBadge: true,
    sound: 'default',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

/**
 * Fire an immediate high-priority local notification for a failed scheduled run.
 * No-op on web. Never throws.
 */
export async function notifyAutomationFailure(message: string): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const granted = await ensurePermission();
    if (!granted) {
      console.warn('[AutomationAlerts] notification permission denied');
      return;
    }

    if (Platform.OS === 'android') {
      await ensureErrorChannel();
    }

    const body =
      message.trim().length > BODY_MAX
        ? `${message.trim().slice(0, BODY_MAX - 1)}…`
        : message.trim() || 'Échec du démarrage intelligent';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Échec automatisation Freebox',
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      // ChannelAwareTriggerInput → immediate delivery on the high-priority channel.
      trigger:
        Platform.OS === 'android'
          ? { channelId: AUTOMATION_ERRORS_CHANNEL }
          : null,
    });
  } catch (error) {
    console.warn('[AutomationAlerts] notify failed', error);
  }
}
