import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type HeaderProps = {
  title?: string;
  subtitle?: string;
  statusMessage?: string | null;
  statusOk?: boolean | null;
  warningMessage?: string | null;
  onOpenSettings: () => void;
};

export function Header({
  title = 'Remote TV',
  subtitle,
  statusMessage,
  statusOk,
  warningMessage,
  onOpenSettings,
}: HeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View style={styles.titles}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          onPress={onOpenSettings}
          style={({ pressed }) => [styles.settingsBtn, pressed && styles.settingsPressed]}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>
      </View>
      {warningMessage ? (
        <View style={[styles.status, styles.statusError]}>
          <Text style={[styles.statusText, styles.statusTextError]} numberOfLines={4}>
            {warningMessage}
          </Text>
        </View>
      ) : null}
      {statusMessage ? (
        <View
          style={[
            styles.status,
            statusOk === false && styles.statusError,
            statusOk === true && styles.statusOk,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              statusOk === false && styles.statusTextError,
              statusOk === true && styles.statusTextOk,
            ]}
            numberOfLines={2}
          >
            {statusMessage}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    paddingHorizontal: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsPressed: {
    backgroundColor: colors.surfacePressed,
  },
  settingsIcon: {
    fontSize: 20,
    color: colors.text,
  },
  status: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusError: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.power,
  },
  statusOk: {
    backgroundColor: colors.successSoft,
    borderColor: colors.ok,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  statusTextError: {
    color: '#f0a0a0',
  },
  statusTextOk: {
    color: '#9fd4b5',
  },
});
