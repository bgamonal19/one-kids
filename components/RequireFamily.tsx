import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useFamily } from '@/lib/store';

export function RequireFamily({ children, parentOnly = false }: { children: ReactNode; parentOnly?: boolean }) {
  const { ready, state } = useFamily();
  if (!ready) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator accessibilityLabel="Cargando tu cuenta" /></View>;
  if (!state.parent) return <Redirect href="/(auth)/welcome" />;
  if (parentOnly && state.childAccess) return <Redirect href="/(child)" />;
  return children;
}
