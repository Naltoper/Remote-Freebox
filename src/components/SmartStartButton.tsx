import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useSettings } from '../context/SettingsContext';
import { runSmartStart, type SmartStartProgress } from '../services/freeboxRemote';
import { colors } from '../theme/colors';

type SmartStartButtonProps = {
  disabled?: boolean;
  onProgress: (progress: SmartStartProgress | null) => void;
};

export function SmartStartButton({
  disabled = false,
  onProgress,
}: SmartStartButtonProps) {
  const { config } = useSettings();
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handlePress = useCallback(async () => {
    if (running || disabled) return;
    setRunning(true);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // ignore
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await runSmartStart(config, onProgress, controller.signal);
      if (result.ok) {
        try {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
        } catch {
          // ignore
        }
      } else {
        try {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error,
          );
        } catch {
          // ignore
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Macro interrompue';
      if (message !== 'Aborted') {
        onProgress({ message, tone: 'error', countdown: null });
      }
    } finally {
      abortRef.current = null;
      setRunning(false);
    }
  }, [config, disabled, onProgress, running]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Démarrage intelligent"
      disabled={running || disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.btn,
        (pressed || running) && styles.pressed,
        (running || disabled) && styles.disabled,
      ]}
    >
      <View style={styles.inner}>
        {running ? (
          <ActivityIndicator color="#1a1d24" size="small" />
        ) : (
          <Text style={styles.icon}>▶</Text>
        )}
        <View style={styles.labels}>
          <Text style={styles.title}>Démarrage intelligent</Text>
          <Text style={styles.subtitle}>
            {running
              ? 'Macro en cours…'
              : 'Allume / Accueil + OK automatiquement'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: '#c48a10',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.75,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  icon: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1d24',
    width: 28,
    textAlign: 'center',
  },
  labels: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#1a1d24',
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(26, 29, 36, 0.75)',
    fontSize: 12,
    fontWeight: '600',
  },
});
