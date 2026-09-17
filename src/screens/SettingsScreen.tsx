import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEFAULT_CONFIG } from '../config/defaults';
import { useSettings } from '../context/SettingsContext';
import { colors } from '../theme/colors';

type SettingsScreenProps = {
  onClose: () => void;
};

export function SettingsScreen({ onClose }: SettingsScreenProps) {
  const { config, updateConfig, resetConfig } = useSettings();
  const [host, setHost] = useState(config.host);
  const [code, setCode] = useState(config.code);
  const [timeoutMs, setTimeoutMs] = useState(String(config.timeoutMs));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setHost(config.host);
    setCode(config.code);
    setTimeoutMs(String(config.timeoutMs));
  }, [config]);

  const handleSave = async () => {
    const parsedTimeout = Number(timeoutMs);
    await updateConfig({
      host: host.trim() || DEFAULT_CONFIG.host,
      code: code.trim() || DEFAULT_CONFIG.code,
      timeoutMs:
        Number.isFinite(parsedTimeout) && parsedTimeout >= 500
          ? parsedTimeout
          : DEFAULT_CONFIG.timeoutMs,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleReset = async () => {
    await resetConfig();
    setHost(DEFAULT_CONFIG.host);
    setCode(DEFAULT_CONFIG.code);
    setTimeoutMs(String(DEFAULT_CONFIG.timeoutMs));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>Settings</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.hint}>
            Freebox Player address for `/pub/remote_control`. Use the LAN IP or
            WireGuard VPN IP (default `192.168.1.49`). The Android app sends
            plain HTTP — connect to the same network or VPN as the Player.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Player host / IP</Text>
            <TextInput
              value={host}
              onChangeText={setHost}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              placeholder={DEFAULT_CONFIG.host}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Remote code</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="number-pad"
              placeholder={DEFAULT_CONFIG.code}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Timeout (ms)</Text>
            <TextInput
              value={timeoutMs}
              onChangeText={setTimeoutMs}
              keyboardType="number-pad"
              placeholder={String(DEFAULT_CONFIG.timeoutMs)}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>{saved ? 'Saved' : 'Save'}</Text>
          </Pressable>

          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>Reset to defaults</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  backText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
  },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: colors.ok,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 15,
  },
  pressed: {
    opacity: 0.85,
  },
});
