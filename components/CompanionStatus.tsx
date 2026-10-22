import { StyleSheet, Text, View } from 'react-native';
import { COMPANIONS, KikoMascot } from './KikoMascot';
import { expressionLabel, type ExpressionId } from '@/lib/expressions';
import { useFamily } from '@/lib/store';
import { colors, fonts } from '@/constants/theme';

export function CompanionStatus({ expression, message }: { expression: ExpressionId; message?: string }) {
  const { state } = useFamily();
  const id = state.child?.companion ?? 'bear';
  return (
    <View style={s.panel}>
      <KikoMascot character={id} age={state.child?.age ?? 8} expression={expression} mood={expression === 'celebrate' ? 'celebrate' : 'happy'} size={100} />
      <View style={s.copy}>
        <Text style={s.name}>{COMPANIONS[id].name}</Text>
        <Text style={s.label} accessibilityLiveRegion="polite">{expressionLabel(expression)}</Text>
        {message ? <Text style={s.message}>{message}</Text> : null}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  panel: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFEFA', borderRadius: 22, padding: 10, gap: 12, marginVertical: 12 },
  copy: { flex: 1 }, name: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.skyDeep, marginTop: 3 },
  message: { fontFamily: fonts.body, color: colors.inkMuted, fontSize: 14, lineHeight: 20, marginTop: 5 },
});
