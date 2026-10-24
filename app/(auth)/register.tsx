import { PasswordField } from '@/components/PasswordField';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';
import { validateRegistration } from '@/lib/account-validation';

export default function RegisterScreen() {
  const { registerParent } = useFamily();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const submit = async () => {
    if (loading) return;
    const validation = validateRegistration({ name, email, password, confirmPassword });
    if (validation) { setError(validation); return; }
    setLoading(true); setError('');
    try {
      const result = await registerParent({ name, email, password });
      setPassword(''); setConfirmPassword('');
      if (result === 'confirm-email') setConfirmed(true);
      else router.replace('/');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo crear la cuenta. Inténtalo de nuevo.'); }
    finally { setLoading(false); }
  };

  if (confirmed) return <Screen scroll><BrandMark size="nav" /><Text style={styles.title}>Revisa tu correo</Text><Text style={styles.hint}>Si el correo puede registrarse, recibirás un enlace para confirmar tu cuenta. Después entra con tu correo y tu clave numérica. Si ya tenías cuenta, usa Entrar.</Text><PrimaryButton label="Ir a entrar" onPress={() => router.replace('/(auth)/login')} /></Screen>;

  return (
    <Screen scroll>
      <BrandMark size="nav" />
      <Text style={styles.title}>Cuenta de padres</Text>
      <Text style={styles.hint}>Tú configuras el PIN, las tareas y el modo enfoque.</Text>

      <View style={styles.form}>
        <Field label="Tu nombre" value={name} onChangeText={setName} placeholder="Ana" />
        <Field
          label="Correo"
          value={email}
          onChangeText={setEmail}
          placeholder="ana@correo.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <PasswordField label="Clave numérica" value={password} onChangeText={setPassword} placeholder="De 6 a 12 números" textContentType="newPassword" />
        <PasswordField label="Repite tu clave numérica" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Vuelve a escribir tu clave" textContentType="newPassword" />
        <Text style={styles.hint}>Solo números. Esta clave sirve para entrar a tu cuenta; después crearás un PIN parental de 4 dígitos.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={loading ? "Creando cuenta…" : "Crear mi cuenta"} onPress={submit} disabled={loading} />
        <PrimaryButton label="Volver" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

function Field(
  props: ComponentProps<typeof TextInput> & { label: string; value: string }
) {
  const { label, ...rest } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...rest}
        accessibilityLabel={label}
        placeholderTextColor={colors.inkMuted}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.lg,
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.ink,
  },
  hint: {
    marginTop: 8,
    marginBottom: spacing.lg,
    fontFamily: fonts.body,
    color: colors.inkMuted,
  },
  form: { gap: 14 },
  field: { gap: 6 },
  label: { fontFamily: fonts.bodySemi, color: colors.ink, fontSize: 14 },
  input: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  error: { fontFamily: fonts.bodySemi, color: colors.coral },
});
