import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ControlPad } from '../components/ControlPad';
import { Header } from '../components/Header';
import { NumberPad } from '../components/NumberPad';
import { RemoteButton } from '../components/RemoteButton';
import { SmartStartButton } from '../components/SmartStartButton';
import { StatusToast, type ToastTone } from '../components/StatusToast';
import { VolumeChannelPad } from '../components/VolumeChannelPad';
import { useSettings } from '../context/SettingsContext';
import type { SmartStartProgress } from '../services/freeboxRemote';
import { colors } from '../theme/colors';

type RemoteScreenProps = {
  onOpenSettings: () => void;
  onOpenLogs: () => void;
};

export function RemoteScreen({
  onOpenSettings,
  onOpenLogs,
}: RemoteScreenProps) {
  const { config } = useSettings();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<ToastTone>('info');
  const [toastCountdown, setToastCountdown] = useState<number | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone, durationMs?: number) => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
      setToastMessage(message);
      setToastTone(tone);
      setToastCountdown(null);
      if (durationMs != null) {
        clearTimer.current = setTimeout(() => {
          setToastMessage(null);
          setToastCountdown(null);
        }, durationMs);
      }
    },
    [],
  );

  const handleResult = useCallback(
    (ok: boolean, message?: string) => {
      showToast(
        ok ? 'Commande envoyée' : message ?? 'Échec de la requête',
        ok ? 'success' : 'error',
        ok ? 1400 : 4500,
      );
    },
    [showToast],
  );

  const handleMacroProgress = useCallback(
    (progress: SmartStartProgress | null) => {
      if (!progress) {
        setToastMessage(null);
        setToastCountdown(null);
        return;
      }
      if (clearTimer.current) clearTimeout(clearTimer.current);
      setToastMessage(progress.message);
      setToastTone(progress.tone);
      setToastCountdown(progress.countdown);
      if (progress.tone === 'success' || progress.tone === 'error') {
        clearTimer.current = setTimeout(() => {
          setToastMessage(null);
          setToastCountdown(null);
        }, progress.tone === 'success' ? 2200 : 5000);
      }
    },
    [],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.shell}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Header
            title="Freebox Remote"
            subtitle={config.host}
            onOpenSettings={onOpenSettings}
            onOpenLogs={onOpenLogs}
          />

          <SmartStartButton onProgress={handleMacroProgress} />

          <View style={styles.topActions}>
            <RemoteButton
              label="Power"
              remoteKey="power"
              variant="power"
              size="lg"
              onResult={handleResult}
            />
            <RemoteButton
              label="Home"
              remoteKey="home"
              variant="accent"
              size="lg"
              onResult={handleResult}
            />
            <RemoteButton
              label="Back"
              remoteKey="back"
              size="lg"
              onResult={handleResult}
            />
          </View>

          <ControlPad onResult={handleResult} />
          <VolumeChannelPad onResult={handleResult} />
          <NumberPad onResult={handleResult} />
        </ScrollView>

        <StatusToast
          message={toastMessage}
          tone={toastTone}
          countdown={toastCountdown}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  shell: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 28,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
});
