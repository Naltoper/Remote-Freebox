const {
  withAndroidManifest,
  AndroidConfig,
} = require('@expo/config-plugins');

const FGS_PERMISSIONS = [
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.WAKE_LOCK',
  'android.permission.RECEIVE_BOOT_COMPLETED',
];

const SERVICE_CANDIDATES = [
  'com.asterinet.react.bgactions.RNBackgroundActionsTask',
  '.RNBackgroundActionsTask',
];

function ensureToolsNamespace(manifest) {
  if (!manifest.$) manifest.$ = {};
  if (!manifest.$['xmlns:tools']) {
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
  }
}

function ensurePermission(manifest, name) {
  if (!manifest['uses-permission']) {
    manifest['uses-permission'] = [];
  }
  const list = manifest['uses-permission'];
  const exists = list.some((item) => item?.$?.['android:name'] === name);
  if (!exists) {
    list.push({ $: { 'android:name': name } });
  }
}

function findBackgroundService(application) {
  if (!application.service) {
    application.service = [];
  }
  return application.service.find((service) => {
    const name = service?.$?.['android:name'] || '';
    return (
      SERVICE_CANDIDATES.includes(name) ||
      name.endsWith('RNBackgroundActionsTask') ||
      name.includes('bgactions.RNBackgroundActionsTask')
    );
  });
}

/**
 * Declares react-native-background-actions Foreground Service correctly for Android 14+.
 * Missing android:foregroundServiceType previously caused fatal native crashes.
 */
function withForegroundService(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    ensureToolsNamespace(manifest);

    for (const permission of FGS_PERMISSIONS) {
      ensurePermission(manifest, permission);
    }

    const application =
      AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);

    let service = findBackgroundService(application);
    if (!service) {
      service = {
        $: {
          'android:name': SERVICE_CANDIDATES[0],
        },
      };
      if (!application.service) application.service = [];
      application.service.push(service);
    }

    service.$ = {
      ...service.$,
      'android:name':
        service.$['android:name'] || SERVICE_CANDIDATES[0],
      'android:exported': 'false',
      'android:foregroundServiceType': 'dataSync',
      'android:stopWithTask': 'false',
      'tools:replace':
        'android:exported,android:foregroundServiceType,android:stopWithTask',
    };

    return cfg;
  });
}

module.exports = withForegroundService;
