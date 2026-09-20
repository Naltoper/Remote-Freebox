import { type ReactNode } from 'react';
import {
  ImageBackground,
  StyleSheet,
  View,
} from 'react-native';

import { colors } from '../theme/colors';

const bgImage = require('../../assets/images/bgMoumouMatrix.png');

type AppBackgroundProps = {
  children: ReactNode;
};

/**
 * Full-screen Matrix background shared by every screen, with a dark overlay
 * so remote controls and text stay readable.
 */
export function AppBackground({ children }: AppBackgroundProps) {
  return (
    <View style={styles.root}>
      <ImageBackground
        source={bgImage}
        style={styles.image}
        resizeMode="cover"
        imageStyle={styles.imageStyle}
      />
      <View style={styles.overlay} pointerEvents="none" />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  image: {
    ...StyleSheet.absoluteFill,
  },
  imageStyle: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 10, 14, 0.58)',
  },
  content: {
    flex: 1,
  },
});
