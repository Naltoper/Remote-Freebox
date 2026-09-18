import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';

export type ToastTone = 'info' | 'success' | 'error';

type StatusToastProps = {
  message: string | null;
  tone?: ToastTone;
  countdown?: number | null;
};

export function StatusToast({
  message,
  tone = 'info',
  countdown = null,
}: StatusToastProps) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const visible = Boolean(message);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [opacity, visible]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { top: Math.max(insets.top, 8) + 4, opacity },
        tone === 'success' && styles.success,
        tone === 'error' && styles.error,
        tone === 'info' && styles.info,
      ]}
    >
      <View style={styles.row}>
        <Text
          style={[
            styles.text,
            tone === 'success' && styles.textSuccess,
            tone === 'error' && styles.textError,
            tone === 'info' && styles.textInfo,
          ]}
          numberOfLines={3}
        >
          {message}
        </Text>
        {countdown != null && countdown >= 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{countdown}s</Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
    elevation: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  info: {
    backgroundColor: 'rgba(36, 40, 48, 0.96)',
    borderColor: colors.border,
  },
  success: {
    backgroundColor: 'rgba(25, 55, 40, 0.96)',
    borderColor: colors.ok,
  },
  error: {
    backgroundColor: 'rgba(55, 28, 28, 0.96)',
    borderColor: colors.power,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  textInfo: {
    color: colors.text,
  },
  textSuccess: {
    color: '#9fd4b5',
  },
  textError: {
    color: '#f0a0a0',
  },
  badge: {
    minWidth: 40,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  badgeText: {
    color: '#1a1d24',
    fontWeight: '800',
    fontSize: 13,
  },
});
