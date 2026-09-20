import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type HeaderProps = {
  title?: string;
  subtitle?: string;
  onOpenSettings: () => void;
  onOpenLogs: () => void;
};

export function Header({
  title = 'Remote TV',
  subtitle,
  onOpenSettings,
  onOpenLogs,
}: HeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View style={styles.titles}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open HTTP logs"
            onPress={onOpenLogs}
            style={({ pressed }) => [
              styles.iconBtn,
              pressed && styles.iconPressed,
            ]}
          >
            <Text style={styles.iconText}>☰</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={onOpenSettings}
            style={({ pressed }) => [
              styles.iconBtn,
              pressed && styles.iconPressed,
            ]}
          >
            <Text style={styles.iconText}>⚙</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(44, 49, 60, 0.88)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPressed: {
    backgroundColor: colors.surfacePressed,
  },
  iconText: {
    fontSize: 20,
    color: colors.text,
  },
});
