const {
  withAndroidManifest,
  withDangerousMod,
  AndroidConfig,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const BOOT_RECEIVER_JAVA = `package com.naltoper.remotefreebox;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;

/**
 * After reboot / update, bring MainActivity up so JS can start the dataSync
 * Foreground Service. Android 15+ forbids starting dataSync FGS directly
 * from BOOT_COMPLETED — launching an Activity is the supported path.
 */
public class BootReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    if (intent == null) return;
    String action = intent.getAction();
    if (action == null) return;

    boolean relevant =
        Intent.ACTION_BOOT_COMPLETED.equals(action)
            || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
            || "android.intent.action.QUICKBOOT_POWERON".equals(action)
            || "com.htc.intent.action.QUICKBOOT_POWERON".equals(action);

    if (!relevant) return;

    Intent launch = new Intent(context, MainActivity.class);
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    launch.setData(Uri.parse("remotetvmamie://from-boot"));
    launch.putExtra("from_boot", true);
    context.startActivity(launch);
  }
}
`;

function ensureReceiver(application) {
  if (!application.receiver) {
    application.receiver = [];
  }

  const name = 'com.naltoper.remotefreebox.BootReceiver';
  let receiver = application.receiver.find(
    (item) => item?.$?.['android:name'] === name,
  );

  if (!receiver) {
    receiver = { $: { 'android:name': name } };
    application.receiver.push(receiver);
  }

  receiver.$ = {
    ...receiver.$,
    'android:name': name,
    'android:enabled': 'true',
    'android:exported': 'true',
  };

  receiver['intent-filter'] = [
    {
      action: [
        { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
        { $: { 'android:name': 'android.intent.action.QUICKBOOT_POWERON' } },
        { $: { 'android:name': 'com.htc.intent.action.QUICKBOOT_POWERON' } },
        { $: { 'android:name': 'android.intent.action.MY_PACKAGE_REPLACED' } },
      ],
    },
  ];
}

/**
 * Registers BootReceiver.java + manifest entry so automation can resume after reboot.
 */
function withBootReceiver(config) {
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const javaDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app/src/main/java/com/naltoper/remotefreebox',
      );
      fs.mkdirSync(javaDir, { recursive: true });
      fs.writeFileSync(
        path.join(javaDir, 'BootReceiver.java'),
        BOOT_RECEIVER_JAVA,
        'utf8',
      );
      return cfg;
    },
  ]);

  return withAndroidManifest(config, (cfg) => {
    const application =
      AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    ensureReceiver(application);
    return cfg;
  });
}

module.exports = withBootReceiver;
