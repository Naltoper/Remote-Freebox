import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

// Define background tasks before the React tree mounts.
import './src/services/backgroundAutomation';

if (Platform.OS === 'android') {
  // Widget Headless JS handler (AppWidgetProvider → JS).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { widgetTaskHandler } = require('./src/widget/widgetTaskHandler');
  registerWidgetTaskHandler(widgetTaskHandler);
}

import App from './App';

registerRootComponent(App);
