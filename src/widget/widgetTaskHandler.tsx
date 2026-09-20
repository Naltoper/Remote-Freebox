import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import {
  loadAutomationSettings,
  loadFreeboxConfig,
  persistAutomationSettings,
} from '../services/automation';
import { syncAutomationRuntime } from '../services/backgroundAutomation';
import { runSmartStart } from '../services/freeboxRemote';
import { FreeboxWidget } from './FreeboxWidget';
import { refreshFreeboxWidget } from './refreshWidget';
import {
  loadWidgetViewState,
  setWidgetActionStatus,
} from './widgetState';

let widgetActionLock = false;

async function handleSmartStart(): Promise<void> {
  if (widgetActionLock) {
    await setWidgetActionStatus('Déjà en cours…');
    await refreshFreeboxWidget(true);
    return;
  }

  widgetActionLock = true;
  try {
    await setWidgetActionStatus('Démarrage en cours…');
    await refreshFreeboxWidget(true);

    const config = await loadFreeboxConfig();
    const result = await runSmartStart(config, (progress) => {
      void setWidgetActionStatus(progress.message).then(() =>
        refreshFreeboxWidget(true),
      );
    });

    await setWidgetActionStatus(
      result.ok
        ? 'Démarrage intelligent OK'
        : `ÉCHEC — ${'error' in result ? result.error : 'inconnu'}`,
    );
  } catch (error) {
    await setWidgetActionStatus(
      error instanceof Error ? `ÉCHEC — ${error.message}` : 'ÉCHEC — erreur',
    );
  } finally {
    widgetActionLock = false;
    await refreshFreeboxWidget(false);
  }
}

async function handleToggleAuto(): Promise<void> {
  if (widgetActionLock) {
    await setWidgetActionStatus('Action en cours…');
    await refreshFreeboxWidget(true);
    return;
  }

  widgetActionLock = true;
  try {
    const current = await loadAutomationSettings();
    const next = { ...current, enabled: !current.enabled };
    await persistAutomationSettings(next);

    const runtime = await syncAutomationRuntime(next.enabled);
    if (runtime.warning) {
      await setWidgetActionStatus(
        next.enabled
          ? `Auto ON — ${runtime.warning}`
          : `Auto OFF — ${runtime.warning}`,
      );
    } else {
      await setWidgetActionStatus(
        next.enabled ? 'Automatisation activée' : 'Automatisation désactivée',
      );
    }
  } catch (error) {
    await setWidgetActionStatus(
      error instanceof Error
        ? `ÉCHEC auto — ${error.message}`
        : 'ÉCHEC bascule auto',
    );
  } finally {
    widgetActionLock = false;
    await refreshFreeboxWidget(false);
  }
}

/**
 * Android Headless JS entry for AppWidgetProvider events / clicks.
 */
export async function widgetTaskHandler({
  widgetAction,
  clickAction,
  renderWidget,
}: WidgetTaskHandlerProps): Promise<void> {
  if (widgetAction === 'WIDGET_DELETED') {
    return;
  }

  if (widgetAction === 'WIDGET_CLICK') {
    if (clickAction === 'SMART_START') {
      await handleSmartStart();
    } else if (clickAction === 'TOGGLE_AUTO') {
      await handleToggleAuto();
    }
  }

  const state = await loadWidgetViewState(widgetActionLock);
  renderWidget(<FreeboxWidget state={state} />);
}
