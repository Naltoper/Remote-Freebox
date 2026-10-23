import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';

const ANDROID_PACKAGE =
  Constants.expoConfig?.android?.package ?? 'com.naltoper.remotefreebox';

export const BOOT_DEEP_LINK = 'remotetvmamie://from-boot';

/**
 * Opens the system dialog to ignore battery optimizations for this app.
 * Falls back to app settings if the direct Intent is blocked.
 */
export async function requestIgnoreBatteryOptimizations(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
      { data: `package:${ANDROID_PACKAGE}` },
    );
  } catch (error) {
    console.warn('[KeepAlive] REQUEST_IGNORE_BATTERY_OPTIMIZATIONS failed', error);
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS,
      );
    } catch (fallbackError) {
      console.warn('[KeepAlive] battery settings fallback failed', fallbackError);
      await Linking.openSettings();
    }
  }
}

/**
 * Best-effort: leave the UI and keep the process (FGS) alive after a boot relaunch.
 */
export async function sendAppToBackground(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await IntentLauncher.startActivityAsync('android.intent.action.MAIN', {
      category: 'android.intent.category.HOME',
    });
  } catch (error) {
    console.warn('[KeepAlive] sendAppToBackground failed', error);
  }
}

export function isBootRelaunchUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('from-boot');
}
