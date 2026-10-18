import { Redirect } from 'expo-router';
import { ActivityIndicator, Platform, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useFamily } from '@/lib/store';

export default function Index() {
  const { ready, state } = useFamily();

  // During static SSR, avoid a forever spinner in the HTML snapshot.
  if (!ready) {
    if (Platform.OS === 'web') {
      return <Redirect href="/(auth)/welcome" />;
    }
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.paper,
        }}
      >
        <ActivityIndicator color={colors.coral} size="large" />
      </View>
    );
  }

  if (!state.parent) return <Redirect href="/(auth)/welcome" />;
  if (!state.onboarded || !state.parent.pinHash || !state.child) {
    return <Redirect href="/(onboarding)/pin" />;
  }
  return <Redirect href="/(child)" />;
}
