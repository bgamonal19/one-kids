import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TutorProvider } from './tutor';
const key = (family: string) => `onekids.tutor-provider.${family}`;
export async function loadTutorProvider(family: string): Promise<TutorProvider> {
  const value = await AsyncStorage.getItem(key(family)).catch(() => null);
  return value === 'openai' || value === 'anthropic' ? value : 'auto';
}
export async function saveTutorProvider(family: string, provider: TutorProvider) {
  await AsyncStorage.setItem(key(family), provider);
}
