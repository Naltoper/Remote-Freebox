import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  clearHttpLogs,
  formatLogTime,
  loadHttpLogs,
  subscribeHttpLogs,
} from '../services/httpLog';
import { colors } from '../theme/colors';
import type { HttpLogEntry } from '../types/remote';

type LogsScreenProps = {
  onClose: () => void;
};

function formatEntriesForClipboard(entries: HttpLogEntry[]): string {
  if (entries.length === 0) return 'Aucun log.';
  return entries
    .map((item) => {
      const status = item.ok ? 'OK' : 'ÉCHEC';
      return `[${formatLogTime(item.timestamp)}] ${status} — ${item.label}\n${item.detail}`;
    })
    .join('\n\n');
}

export function LogsScreen({ onClose }: LogsScreenProps) {
  const [entries, setEntries] = useState<HttpLogEntry[]>([]);
  const [clearing, setClearing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void loadHttpLogs().then(setEntries);
    return subscribeHttpLogs(setEntries);
  }, []);

  const handleCopy = async () => {
    if (entries.length === 0) return;
    try {
      await Clipboard.setStringAsync(formatEntriesForClipboard(entries));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      Alert.alert(
        'Copie impossible',
        error instanceof Error ? error.message : 'Erreur presse-papier',
      );
    }
  };

  const handleClear = () => {
    if (clearing || entries.length === 0) return;
    Alert.alert(
      'Vider l’historique',
      'Supprimer définitivement tous les logs HTTP ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setClearing(true);
              try {
                await clearHttpLogs();
              } finally {
                setClearing(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Logs HTTP</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={handleCopy}
              disabled={entries.length === 0}
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && styles.pressed,
                entries.length === 0 && styles.disabled,
              ]}
            >
              <Text style={styles.actionText}>
                {copied ? 'Copié' : 'Copier'}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleClear}
              disabled={clearing || entries.length === 0}
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && styles.pressed,
                (clearing || entries.length === 0) && styles.disabled,
              ]}
            >
              <Text style={styles.actionText}>
                {clearing ? '…' : 'Vider'}
              </Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.hint}>
          100 dernières requêtes Freebox (boutons, macro, automatisation).
        </Text>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Aucun log pour le moment.</Text>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.row,
              item.ok ? styles.rowOk : styles.rowFail,
            ]}
          >
            <View style={styles.rowTop}>
              <Text style={styles.time}>{formatLogTime(item.timestamp)}</Text>
              <Text
                style={[
                  styles.badge,
                  item.ok ? styles.badgeOk : styles.badgeFail,
                ]}
              >
                {item.ok ? 'OK' : 'ÉCHEC'}
              </Text>
            </View>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.detail} numberOfLines={3}>
              {item.detail}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(44, 49, 60, 0.88)',
  },
  actionText: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 13,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 10,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  row: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  rowOk: {
    backgroundColor: colors.successSoft,
    borderColor: colors.ok,
  },
  rowFail: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.power,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  badgeOk: {
    color: '#9fd4b5',
  },
  badgeFail: {
    color: '#f0a0a0',
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  detail: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});
