import { StyleSheet, Text, View } from 'react-native';
import type { TutorAccount } from '@/lib/tutor';
import { colors, fonts } from '@/constants/theme';

/** A typical tutor turn uses about 2,500 tokens; parents see consultations, not tokens. */
export const TOKENS_PER_QUESTION = 2500;
export const approxQuestions = (tokens: number) => Math.max(0, Math.round(tokens / TOKENS_PER_QUESTION));

export function TutorUsageBar({ account, compact }: { account: TutorAccount; compact?: boolean }) {
  const ratio = Math.min(1, account.used / account.limit);
  const color = ratio >= 0.9 ? colors.coral : ratio >= 0.7 ? colors.sun : colors.leafDeep;
  const left = approxQuestions(account.limit - account.used);
  return (
    <View accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }} accessibilityLabel={`Uso del tutor este mes: ${Math.round(ratio * 100)} por ciento`} style={s.wrap}>
      <View style={[s.track, compact && s.trackCompact]}><View style={[s.fill, { width: `${Math.max(2, ratio * 100)}%`, backgroundColor: color }]} /></View>
      <Text style={s.text}>
        {ratio >= 1 ? 'Límite del mes alcanzado' : `${Math.round(ratio * 100)}% usado este mes · quedan ≈ ${left} consultas`}
        {compact ? '' : ` (${account.used.toLocaleString('es-ES')} de ${account.limit.toLocaleString('es-ES')} tokens)`}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 6, marginVertical: 6 },
  track: { height: 14, borderRadius: 7, backgroundColor: '#D5E3EE', overflow: 'hidden' },
  trackCompact: { height: 8 },
  fill: { height: '100%', borderRadius: 7 },
  text: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.inkMuted },
});
