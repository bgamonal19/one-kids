import { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

/** Contenedor web a pantalla completa (no marco de móvil). */
export function WebShell({ children }: { children: ReactNode }) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return <View style={styles.page}>{children}</View>;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.paper,
    ...(Platform.OS === 'web' ? ({ minHeight: 0 } as object) : null),
  },
});
