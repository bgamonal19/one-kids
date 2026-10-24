import { Redirect, Stack } from 'expo-router';
import { useFamily } from '@/lib/store';

export default function AuthLayout() {
  const { ready, state, accountMode } = useFamily();
  if (ready && accountMode === 'cloud' && state.parent) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
