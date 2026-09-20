import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { FREEBOX_WIDGET_NAME } from '../config/defaults';
import { FreeboxWidget } from './FreeboxWidget';
import { loadWidgetViewState } from './widgetState';

/** Redraw every FreeboxRemote instance on the home screen from AsyncStorage. */
export async function refreshFreeboxWidget(busy = false): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const state = await loadWidgetViewState(busy);
    await requestWidgetUpdate({
      widgetName: FREEBOX_WIDGET_NAME,
      renderWidget: () => <FreeboxWidget state={state} />,
    });
  } catch (error) {
    console.warn('[Widget] refresh failed', error);
  }
}
