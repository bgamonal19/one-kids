import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { autoReload, canAutoReload, hardReload, isChunkLoadError } from '@/lib/staleBundle';

/**
 * Root error screen. If the error is a JS chunk that failed to load (old tab
 * after a new deploy, or a dropped request on mobile data), reload the page
 * once automatically instead of showing "Something went wrong".
 */
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const chunkError = isChunkLoadError(error);
  const [reloading] = useState(() => chunkError && canAutoReload());

  useEffect(() => {
    if (reloading) autoReload();
  }, [reloading]);

  if (reloading) {
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Actualizando ONE KIDS…</Text>
      </View>
    );
  }

  const onRetry = () => {
    if (chunkError) hardReload();
    else void retry();
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>¡Uy! Algo no ha cargado bien</Text>
      <Text style={styles.body}>
        {chunkError
          ? 'Hay una versión nueva de la app o la conexión ha fallado. Toca el botón para recargar.'
          : 'Ha ocurrido un error inesperado. Prueba otra vez.'}
      </Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.button}>
        <Text style={styles.buttonText}>{chunkError ? 'Recargar' : 'Reintentar'}</Text>
      </Pressable>
      {__DEV__ ? <Text style={styles.detail}>{error.message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: colors.paper,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.inkMuted,
    textAlign: 'center',
    maxWidth: 360,
  },
  button: {
    backgroundColor: colors.coral,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
  },
  buttonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  detail: {
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: 'center',
  },
});
