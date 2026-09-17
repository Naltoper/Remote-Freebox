import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useSettings } from '../context/SettingsContext';
import { sendRemoteKey } from '../services/freeboxRemote';
import { colors } from '../theme/colors';
import type { FreeboxKey } from '../types/remote';

type RemoteButtonVariant = 'default' | 'power' | 'ok' | 'accent' | 'ghost';

type RemoteButtonProps = {
  label: string;
  remoteKey: FreeboxKey;
  variant?: RemoteButtonVariant;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  onResult?: (ok: boolean, message?: string) => void;
};

const SIZE_MAP = {
  sm: { minWidth: 52, minHeight: 44, fontSize: 15 },
  md: { minWidth: 64, minHeight: 56, fontSize: 16 },
  lg: { minWidth: 76, minHeight: 68, fontSize: 18 },
  xl: { minWidth: 88, minHeight: 88, fontSize: 20 },
} as const;

export function RemoteButton({
  label,
  remoteKey,
  variant = 'default',
  size = 'md',
  style,
  labelStyle,
  onResult,
}: RemoteButtonProps) {
  const { config } = useSettings();
  const [busy, setBusy] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const animatePress = useCallback(
    (pressed: boolean) => {
      Animated.spring(scale, {
        toValue: pressed ? 0.92 : 1,
        useNativeDriver: true,
        friction: 6,
        tension: 180,
      }).start();
    },
    [scale],
  );

  const handlePress = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    animatePress(true);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics unavailable on some web contexts — ignore.
    }

    const result = await sendRemoteKey(config, remoteKey);

    if (result.ok) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // ignore
      }
      onResult?.(true);
    } else {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        // ignore
      }
      onResult?.(false, result.error);
    }

    animatePress(false);
    setBusy(false);
  }, [animatePress, busy, config, onResult, remoteKey]);

  const dims = SIZE_MAP[size];

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={busy}
        onPress={handlePress}
        onPressIn={() => animatePress(true)}
        onPressOut={() => animatePress(false)}
        style={({ pressed }) => [
          styles.base,
          { minWidth: dims.minWidth, minHeight: dims.minHeight },
          variantStyles[variant],
          pressed && variantPressed[variant],
          busy && styles.busy,
        ]}
      >
        {busy ? (
          <ActivityIndicator color={colors.text} size="small" />
        ) : (
          <View style={styles.labelWrap}>
            <Text
              style={[
                styles.label,
                { fontSize: dims.fontSize },
                variant === 'power' && styles.powerLabel,
                variant === 'ok' && styles.okLabel,
                labelStyle,
              ]}
              numberOfLines={2}
            >
              {label}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  busy: {
    opacity: 0.7,
  },
  labelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  powerLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  okLabel: {
    color: '#fff',
    fontWeight: '700',
  },
});

const variantStyles = StyleSheet.create({
  default: {
    backgroundColor: colors.surface,
  },
  power: {
    backgroundColor: colors.power,
    borderColor: '#b83232',
  },
  ok: {
    backgroundColor: colors.ok,
    borderColor: '#2a6b48',
  },
  accent: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
    elevation: 0,
    shadowOpacity: 0,
  },
});

const variantPressed = StyleSheet.create({
  default: { backgroundColor: colors.surfacePressed },
  power: { backgroundColor: colors.powerPressed },
  ok: { backgroundColor: colors.okPressed },
  accent: { backgroundColor: colors.surface },
  ghost: { backgroundColor: colors.surface },
});
