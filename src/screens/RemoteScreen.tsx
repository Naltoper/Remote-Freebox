import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ControlPad } from '../components/ControlPad';
import { Header } from '../components/Header';
import { NumberPad } from '../components/NumberPad';
import { RemoteButton } from '../components/RemoteButton';
import { VolumeChannelPad } from '../components/VolumeChannelPad';
import { useSettings } from '../context/SettingsContext';
import { colors } from '../theme/colors';

type RemoteScreenProps = {
  onOpenSettings: () => void;
};

export function RemoteScreen({ onOpenSettings }: RemoteScreenProps) {
  const { config } = useSettings();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusOk, setStatusOk] = useState<boolean | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, []);

  const handleResult = useCallback((ok: boolean, message?: string) => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
    setStatusOk(ok);
    setStatusMessage(ok ? 'Command sent' : message ?? 'Request failed');
    clearTimer.current = setTimeout(() => {
      setStatusMessage(null);
      setStatusOk(null);
    }, ok ? 1200 : 5000);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Header
          title="Freebox Remote"
          subtitle={config.host}
          statusMessage={statusMessage}
          statusOk={statusOk}
          onOpenSettings={onOpenSettings}
        />

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
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
