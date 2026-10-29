import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { PasswordField } from './PasswordField';
import { PrimaryButton } from './PrimaryButton';
import { colors, fonts } from '@/constants/theme';
import { useFamily } from '@/lib/store';

export function ChildAccessForm({ childId, username: initial = '', onDone }: { childId: string; username?: string; onDone: () => void }) {
  const { saveChildAccess } = useFamily();
  const [username, setUsername] = useState(initial);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (busy) return;
    if (password !== confirm) { setError('Las claves no coinciden.'); return; }
    setBusy(true); setError('');
    try { await saveChildAccess(childId, username, password); setPassword(''); setConfirm(''); onDone(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar el acceso.'); }
    finally { setBusy(false); }
  };
  return <View style={{ gap: 12, padding: 16, backgroundColor: colors.paper, borderRadius: 16 }}>
    <Text style={{ fontFamily: fonts.bodySemi, color: colors.ink }}>{initial ? 'Cambiar clave del niño' : 'Crear acceso para este hijo'}</Text>
    <Text style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Para entrar en otro dispositivo: «Entrar» → «Hijos». No necesita correo propio. El usuario debe ser único.</Text>
    <TextInput accessibilityLabel="Usuario del niño" placeholder="Usuario: por ejemplo nathan.2026" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} editable={!initial && !busy} maxLength={40} style={{ padding: 14, backgroundColor: colors.white, borderRadius: 12, color: colors.ink, fontFamily: fonts.body }} />
    <PasswordField label="Clave numérica del niño" value={password} onChangeText={setPassword} placeholder="De 6 a 12 números" textContentType="newPassword" />
    <PasswordField label="Repetir clave del niño" value={confirm} onChangeText={setConfirm} placeholder="Repite la clave" textContentType="newPassword" />
    {error ? <Text accessibilityRole="alert" style={{ color: colors.coral, fontFamily: fonts.bodySemi }}>{error}</Text> : null}
    <PrimaryButton label={busy ? 'Guardando acceso…' : initial ? 'Guardar nueva clave' : 'Crear acceso infantil'} disabled={busy} onPress={() => void submit()} />
    <PrimaryButton label="Cancelar" variant="ghost" disabled={busy} onPress={onDone} />
  </View>;
}
