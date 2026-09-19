import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEFAULT_AUTOMATION, DEFAULT_CONFIG } from '../config/defaults';
import { useSettings } from '../context/SettingsContext';
import { isForegroundServiceRunning } from '../services/backgroundAutomation';
import { colors } from '../theme/colors';

type SettingsScreenProps = {
  onClose: () => void;
};

export function SettingsScreen({ onClose }: SettingsScreenProps) {
  const {
    config,
    automation,
    updateConfig,
    updateAutomation,
    resetConfig,
    lastAutomationWarning,
    clearAutomationWarning,
  } = useSettings();
  const [host, setHost] = useState(config.host);
  const [code, setCode] = useState(config.code);
  const [timeoutMs, setTimeoutMs] = useState(String(config.timeoutMs));
  const [windowStart, setWindowStart] = useState(automation.windowStart);
  const [windowEnd, setWindowEnd] = useState(automation.windowEnd);
  const [intervalMinutes, setIntervalMinutes] = useState(
    String(automation.intervalMinutes),
  );
  const [offWindowIntervalMinutes, setOffWindowIntervalMinutes] = useState(
    String(automation.offWindowIntervalMinutes),
  );
  const [autoEnabled, setAutoEnabled] = useState(automation.enabled);
  const [saved, setSaved] = useState(false);
  const [fgRunning, setFgRunning] = useState(false);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHost(config.host);
    setCode(config.code);
    setTimeoutMs(String(config.timeoutMs));
  }, [config]);

  useEffect(() => {
    setWindowStart(automation.windowStart);
    setWindowEnd(automation.windowEnd);
    setIntervalMinutes(String(automation.intervalMinutes));
    setOffWindowIntervalMinutes(String(automation.offWindowIntervalMinutes));
    setAutoEnabled(automation.enabled);
    setFgRunning(isForegroundServiceRunning());
  }, [automation]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveWarning(null);
    clearAutomationWarning();

    try {
      const parsedTimeout = Number(timeoutMs);
      const parsedInterval = Number(intervalMinutes);
      const parsedOffInterval = Number(offWindowIntervalMinutes);

      await updateConfig({
        host: host.trim() || DEFAULT_CONFIG.host,
        code: code.trim() || DEFAULT_CONFIG.code,
        timeoutMs:
          Number.isFinite(parsedTimeout) && parsedTimeout >= 500
            ? parsedTimeout
            : DEFAULT_CONFIG.timeoutMs,
      });

      const runtime = await updateAutomation({
        enabled: autoEnabled,
        windowStart: windowStart.trim() || DEFAULT_AUTOMATION.windowStart,
        windowEnd: windowEnd.trim() || DEFAULT_AUTOMATION.windowEnd,
        intervalMinutes: Number.isFinite(parsedInterval)
          ? parsedInterval
          : DEFAULT_AUTOMATION.intervalMinutes,
        offWindowIntervalMinutes: Number.isFinite(parsedOffInterval)
          ? parsedOffInterval
          : DEFAULT_AUTOMATION.offWindowIntervalMinutes,
      });

      setFgRunning(isForegroundServiceRunning());
      if (runtime.warning) {
        setSaveWarning(runtime.warning);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (error) {
      setSaveWarning(
        error instanceof Error
          ? error.message
          : 'Erreur lors de l’enregistrement',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    await resetConfig();
    setHost(DEFAULT_CONFIG.host);
    setCode(DEFAULT_CONFIG.code);
    setTimeoutMs(String(DEFAULT_CONFIG.timeoutMs));
    setWindowStart(DEFAULT_AUTOMATION.windowStart);
    setWindowEnd(DEFAULT_AUTOMATION.windowEnd);
    setIntervalMinutes(String(DEFAULT_AUTOMATION.intervalMinutes));
    setOffWindowIntervalMinutes(
      String(DEFAULT_AUTOMATION.offWindowIntervalMinutes),
    );
    setAutoEnabled(DEFAULT_AUTOMATION.enabled);
    setFgRunning(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backBtn}>
            <Text style={styles.backText}>← Retour</Text>
          </Pressable>
          <Text style={styles.title}>Réglages</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.hint}>
            Adresse du Freebox Player pour `/pub/remote_control`. Utilisez l’IP
            LAN ou VPN WireGuard (défaut `192.168.1.49`).
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Hôte / IP du Player</Text>
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
            <Text style={styles.label}>Code télécommande</Text>
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

          <Text style={styles.section}>Démarrage intelligent auto</Text>
          <Text style={styles.hint}>
            Dans la plage (ex. 19:00 → 10:00) : maintient le Player allumé sur le
            menu (Power + 20s sans OK, ou Home). Hors plage : démarrage
            intelligent complet (Power → 20s → OK). Sur Android, un Foreground
            Service (notification « Automatisation Freebox active ») maintient
            la surveillance en arrière-plan.
          </Text>

          {(saveWarning || lastAutomationWarning) && (
            <Text style={styles.warningText}>
              {saveWarning || lastAutomationWarning}
            </Text>
          )}

          <View style={styles.switchRow}>
            <Text style={styles.label}>Activer l’automatisation</Text>
            <Switch
              value={autoEnabled}
              onValueChange={setAutoEnabled}
              trackColor={{ false: colors.border, true: colors.ok }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.rowFields}>
            <View style={[styles.field, styles.half]}>
              <Text style={styles.label}>Début (HH:mm)</Text>
              <TextInput
                value={windowStart}
                onChangeText={setWindowStart}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={DEFAULT_AUTOMATION.windowStart}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>
            <View style={[styles.field, styles.half]}>
              <Text style={styles.label}>Fin (HH:mm)</Text>
              <TextInput
                value={windowEnd}
                onChangeText={setWindowEnd}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={DEFAULT_AUTOMATION.windowEnd}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Intervalle dans la plage (min)</Text>
            <TextInput
              value={intervalMinutes}
              onChangeText={setIntervalMinutes}
              keyboardType="number-pad"
              placeholder={String(DEFAULT_AUTOMATION.intervalMinutes)}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Intervalle hors plage (min)</Text>
            <TextInput
              value={offWindowIntervalMinutes}
              onChangeText={setOffWindowIntervalMinutes}
              keyboardType="number-pad"
              placeholder={String(DEFAULT_AUTOMATION.offWindowIntervalMinutes)}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          {Platform.OS === 'android' ? (
            <Text style={styles.statusLine}>
              Foreground Service :{' '}
              {fgRunning ? 'actif' : autoEnabled ? 'démarrage…' : 'arrêté'}
            </Text>
          ) : null}

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
              saving && styles.disabled,
            ]}
          >
            <Text style={styles.primaryText}>
              {saving ? 'Enregistrement…' : saved ? 'Enregistré' : 'Enregistrer'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryText}>Réinitialiser</Text>
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
  section: {
    marginTop: 8,
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  warningText: {
    color: '#f0a0a0',
    fontSize: 13,
    lineHeight: 18,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.power,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  field: {
    gap: 8,
  },
  half: {
    flex: 1,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
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
  statusLine: {
    color: colors.textMuted,
    fontSize: 13,
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
  disabled: {
    opacity: 0.6,
  },
});
