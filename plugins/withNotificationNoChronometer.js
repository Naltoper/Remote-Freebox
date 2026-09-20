const {
  withDangerousMod,
  createRunOncePlugin,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PATCH_MARKER = 'setShowWhen(false)';

/**
 * Hide the Android notification chronometer / "time since posted" on the
 * react-native-background-actions persistent notification.
 */
function withNotificationNoChronometer(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const javaPath = path.join(
        cfg.modRequest.projectRoot,
        'node_modules/react-native-background-actions/android/src/main/java/com/asterinet/react/bgactions/RNBackgroundActionsTask.java',
      );

      if (!fs.existsSync(javaPath)) {
        console.warn(
          '[withNotificationNoChronometer] RNBackgroundActionsTask.java not found — skip',
        );
        return cfg;
      }

      let source = fs.readFileSync(javaPath, 'utf8');
      if (source.includes(PATCH_MARKER)) {
        return cfg;
      }

      const needle =
        '.setOngoing(true)\n                .setPriority(NotificationCompat.PRIORITY_MIN)\n                .setColor(color);';
      const replacement =
        '.setOngoing(true)\n                .setShowWhen(false)\n                .setUsesChronometer(false)\n                .setPriority(NotificationCompat.PRIORITY_MIN)\n                .setColor(color);';

      if (!source.includes(needle)) {
        console.warn(
          '[withNotificationNoChronometer] unexpected builder chain — skip patch',
        );
        return cfg;
      }

      source = source.replace(needle, replacement);
      fs.writeFileSync(javaPath, source);
      return cfg;
    },
  ]);
}

module.exports = createRunOncePlugin(
  withNotificationNoChronometer,
  'withNotificationNoChronometer',
  '1.0.0',
);
