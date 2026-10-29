import { RequireFamily } from '@/components/RequireFamily';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return <RequireFamily parentOnly><Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} /></RequireFamily>;
}
