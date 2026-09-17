import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { RemoteButton } from './RemoteButton';

type ControlPadProps = {
  onResult?: (ok: boolean, message?: string) => void;
};

export function ControlPad({ onResult }: ControlPadProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Navigation</Text>
      <View style={styles.grid}>
        <View style={styles.row}>
          <View style={styles.spacer} />
          <RemoteButton label="▲" remoteKey="up" size="md" onResult={onResult} />
          <View style={styles.spacer} />
        </View>
        <View style={styles.row}>
          <RemoteButton label="◀" remoteKey="left" size="md" onResult={onResult} />
          <RemoteButton
            label="OK"
            remoteKey="ok"
            variant="ok"
            size="lg"
            onResult={onResult}
          />
          <RemoteButton label="▶" remoteKey="right" size="md" onResult={onResult} />
        </View>
        <View style={styles.row}>
          <View style={styles.spacer} />
          <RemoteButton label="▼" remoteKey="down" size="md" onResult={onResult} />
          <View style={styles.spacer} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 10,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  grid: {
    gap: 10,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  spacer: {
    width: 64,
    height: 56,
  },
});
