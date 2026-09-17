import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { RemoteButton } from './RemoteButton';

type VolumeChannelPadProps = {
  onResult?: (ok: boolean, message?: string) => void;
};

export function VolumeChannelPad({ onResult }: VolumeChannelPadProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.column}>
        <Text style={styles.sectionLabel}>Vol</Text>
        <RemoteButton label="+" remoteKey="vol_inc" size="md" onResult={onResult} />
        <RemoteButton
          label="Mute"
          remoteKey="mute"
          size="sm"
          variant="accent"
          onResult={onResult}
        />
        <RemoteButton label="−" remoteKey="vol_dec" size="md" onResult={onResult} />
      </View>
      <View style={styles.column}>
        <Text style={styles.sectionLabel}>Ch</Text>
        <RemoteButton label="+" remoteKey="prgm_inc" size="md" onResult={onResult} />
        <View style={styles.gap} />
        <RemoteButton label="−" remoteKey="prgm_dec" size="md" onResult={onResult} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    gap: 24,
  },
  column: {
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
  gap: {
    height: 44,
  },
});
