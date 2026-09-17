import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { RemoteButton } from './RemoteButton';
import type { FreeboxKey } from '../types/remote';

type NumberPadProps = {
  onResult?: (ok: boolean, message?: string) => void;
};

const ROWS: FreeboxKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

export function NumberPad({ onResult }: NumberPadProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Channels</Text>
      {ROWS.map((row) => (
        <View key={row.join('-')} style={styles.row}>
          {row.map((key) => (
            <RemoteButton
              key={key}
              label={key}
              remoteKey={key}
              size="md"
              onResult={onResult}
            />
          ))}
        </View>
      ))}
      <View style={styles.row}>
        <View style={styles.spacer} />
        <RemoteButton label="0" remoteKey="0" size="md" onResult={onResult} />
        <View style={styles.spacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 8,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  spacer: {
    width: 64,
    height: 56,
  },
});
