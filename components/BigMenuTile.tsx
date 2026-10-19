import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii } from '@/constants/theme';

type Props = {
  label: string;
  color: string;
  badge: string;
  onPress: () => void;
  locked?: boolean;
};

export function BigMenuTile({ label, color, badge, onPress, locked }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: locked ? '#8A9AAB' : color },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      {locked ? <Text style={styles.lock}>Bloqueado</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 140,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  badgeText: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.white,
  },
  label: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: colors.white,
    textAlign: 'center',
  },
  lock: {
    marginTop: 8,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.white,
  },
});
