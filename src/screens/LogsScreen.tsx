import { useEffect, useState } from 'react';
import {
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

export function LogsScreen({ onClose }: LogsScreenProps) {
  const [entries, setEntries] = useState<HttpLogEntry[]>([]);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    void loadHttpLogs().then(setEntries);
    return subscribeHttpLogs(setEntries);
  }, []);

  const handleClear = async () => {
    if (clearing) return;
    setClearing(true);
    try {
      await clearHttpLogs();
    } finally {
      setClearing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Logs HTTP</Text>
          <Pressable
            onPress={handleClear}
            disabled={clearing || entries.length === 0}
            style={({ pressed }) => [
              styles.clearBtn,
              pressed && styles.pressed,
              (clearing || entries.length === 0) && styles.disabled,
            ]}
          >
            <Text style={styles.clearText}>
              {clearing ? '…' : 'Vider'}
            </Text>
          </Pressable>
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
    backgroundColor: colors.bg,
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
  },
  clearBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  clearText: {
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
