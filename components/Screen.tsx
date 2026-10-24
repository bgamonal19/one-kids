import { BackButton } from './BackButton';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  wide?: boolean;
};

export function Screen({ children, scroll, style, wide }: Props) {
  const { width } = useWindowDimensions();
  const isWebWide = Platform.OS === 'web' && width >= 900;
  const maxW = wide || isWebWide ? 1100 : 720;

  const inner = (
    <View style={[styles.inner, { maxWidth: maxW }, style]}><BackButton />{children}</View>
  );

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {inner}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.pad]}>{inner}</View>
  );

  return (
    <LinearGradient colors={[colors.paper, colors.mist, '#D7F0F8']} style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        {body}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    flexGrow: 1,
  },
  inner: {
    width: '100%',
    alignSelf: 'center',
  },
});
