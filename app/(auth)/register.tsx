import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';

export default function RegisterScreen() {
  const { registerParent } = useFamily();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim() || !email.trim() || password.length < 4) {
      setError('Completa nombre, correo y una clave de al menos 4 caracteres.');
      return;
    }
    await registerParent({ name, email, password });
    router.replace('/(onboarding)/pin');
  };

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
        <Field
          label="Clave"
          value={password}
          onChangeText={setPassword}
          placeholder="••••"
          secureTextEntry
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label="Continuar" onPress={submit} />
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
