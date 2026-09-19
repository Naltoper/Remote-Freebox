import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import { LogsScreen } from './src/screens/LogsScreen';
import { RemoteScreen } from './src/screens/RemoteScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { colors } from './src/theme/colors';

type Screen = 'remote' | 'settings' | 'logs';

function AppShell() {
  const { loaded } = useSettings();
  const [screen, setScreen] = useState<Screen>('remote');

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (screen === 'settings') {
    return <SettingsScreen onClose={() => setScreen('remote')} />;
  }

  if (screen === 'logs') {
    return <LogsScreen onClose={() => setScreen('remote')} />;
  }

  return (
    <RemoteScreen
      onOpenSettings={() => setScreen('settings')}
      onOpenLogs={() => setScreen('logs')}
    />
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <StatusBar style="light" />
        <AppShell />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
