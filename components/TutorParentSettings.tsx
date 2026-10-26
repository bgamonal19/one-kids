import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { approxQuestions, TutorUsageBar } from './TutorUsageBar';
import { getTutorStatus, saveTutorSettings, TUTOR_LIMITS, type TutorAccount } from '@/lib/tutor';
import { useFamily } from '@/lib/store';
import { colors, fonts, radii } from '@/constants/theme';

/** Parent-only (behind the PIN): free assistant switch, monthly limit and usage bar. */
export function TutorParentSettings() {
  const { accountMode } = useFamily();
  const [account, setAccount] = useState<TutorAccount | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (accountMode !== 'cloud') return;
    let active = true;
    getTutorStatus()
      .then(status => { if (active) { setAccount(status.account ?? null); setError(''); } })
      .catch(e => { if (active) { setAccount(null); setError(e instanceof Error ? e.message : 'No se pudo consultar el tutor.'); } });
    return () => { active = false; };
  }, [accountMode]);
  const save = async (settings: { openMode?: boolean; monthlyLimit?: number }) => {
    if (busy) return;
    setBusy(true); setError('');
    try { setAccount(await saveTutorSettings(settings)); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { setBusy(false); }
  };

  return (
    <View style={s.card}>
      <Text style={s.label}>Tutor IA</Text>
      {accountMode !== 'cloud' ? <Text style={s.sub}>El modo libre y el límite de consumo necesitan una cuenta familiar real.</Text>
        : account === undefined ? <ActivityIndicator color={colors.coral} />
        : account === null ? <Text style={s.sub}>{error || 'El contador de consumo todavía no está activado en el servidor.'}</Text>
        : <View style={s.body}>
          <TutorUsageBar account={account} />
          <View style={s.row}>
            <View style={s.flex}>
              <Text style={s.value}>Modo libre</Text>
              <Text style={s.sub}>El tutor responde y hace lo que el niño le pida, como un asistente tipo ChatGPT, siempre con contenido apto para niños. Apagado, solo ayuda con las tareas paso a paso.</Text>
            </View>
            <Switch accessibilityLabel="Activar el modo libre del tutor" value={account.openMode} disabled={busy} onValueChange={value => void save({ openMode: value })} trackColor={{ true: colors.leafDeep, false: '#CDDCE9' }} />
          </View>
          <Text style={s.value}>Límite al mes</Text>
          <View style={s.chips}>
            {TUTOR_LIMITS.map(limit => <Pressable key={limit} accessibilityRole="button" accessibilityState={{ selected: account.limit === limit, disabled: busy }} disabled={busy} onPress={() => void save({ monthlyLimit: limit })} style={[s.chip, account.limit === limit && s.chipOn]}>
              <Text style={[s.chipText, account.limit === limit && s.chipTextOn]}>≈ {approxQuestions(limit)} consultas</Text>
            </Pressable>)}
          </View>
          <Text style={s.sub}>Cuenta todo el uso del tutor (tareas y modo libre). Al llegar al límite el tutor se pausa hasta el mes siguiente o hasta que lo amplíes.</Text>
          {error ? <Text style={s.error}>{error}</Text> : null}
        </View>}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radii.md, padding: 16, marginBottom: 10, gap: 8 },
  body: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  label: { fontFamily: fonts.bodySemi, color: colors.inkMuted, fontSize: 13 },
  value: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 17 },
  sub: { marginTop: 4, fontFamily: fonts.body, color: colors.inkMuted, fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: colors.mist },
  chipOn: { backgroundColor: colors.skyDeep },
  chipText: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 14 },
  chipTextOn: { color: colors.white },
  error: { fontFamily: fonts.bodySemi, color: '#9D3025' },
});
