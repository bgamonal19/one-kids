import { BackButton } from './BackButton';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, RefObject } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle, useWindowDimensions, KeyboardAvoidingView, Platform, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';

type Props = {
  children: ReactNode;
  toolbar?: ReactNode;
  dock?: ReactNode;
  hideBack?: boolean;
  onViewportHeight?: (height: number) => void;
  scroll?: boolean;
  style?: ViewStyle;
  wide?: boolean;
  /** Lets drawing surfaces pause page scrolling while a finger is down. */
  scrollEnabled?: boolean;
  scrollRef?: RefObject<ScrollViewInstance | null>;
  /** No width cap: the screen manages its own columns (e.g. an edge-to-edge whiteboard). */
  fill?: boolean;
};

export function Screen({ children, toolbar, scroll, style, wide, scrollEnabled = true, scrollRef, fill, dock, hideBack, onViewportHeight }: Props) {
  const { width } = useWindowDimensions();
  // Edge to edge on every device: only the side gutter grows with the screen.
  const maxW = wide ? 1100 : undefined;
  const gutter = width >= 900 ? spacing.xl : width < 520 ? spacing.md : spacing.lg;

  const inner = (
    <View style={[styles.inner, { maxWidth: fill ? undefined : maxW }, style]}>{!hideBack ? <BackButton /> : null}{children}</View>
  );

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      onLayout={event => onViewportHeight?.(event.nativeEvent.layout.height)}
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, { paddingHorizontal: gutter }]}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={scrollEnabled}
      showsVerticalScrollIndicator={false}
    >
      {inner}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.pad, { paddingHorizontal: gutter }]}>{inner}</View>
  );

  return (
    <LinearGradient colors={[colors.paper, colors.mist, '#D7F0F8']} style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={dock ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}>
        {toolbar ? <View style={{ paddingHorizontal: gutter, paddingTop: 8, alignItems: 'flex-start' }}>{toolbar}</View> : null}
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {body}
        {dock ? <View style={{ paddingHorizontal: gutter }}>{dock}</View> : null}
        </KeyboardAvoidingView>
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
