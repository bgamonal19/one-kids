import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radii } from '@/constants/theme';
import { NUMERIC_PASSWORD_MAX } from '@/lib/account-validation';

export function PasswordField({ label, ...props }: ComponentProps<typeof TextInput> & { label: string }) {
  const [visible, setVisible] = useState(false);
  return <View style={{ gap: 6 }}>
    <Text style={{ fontFamily: fonts.bodySemi, color: colors.ink, fontSize: 14 }}>{label}</Text>
    <View style={styles.row}>
      <TextInput {...props} accessibilityLabel={label} inputMode="numeric" keyboardType="number-pad" maxLength={NUMERIC_PASSWORD_MAX} autoCorrect={false} autoCapitalize="none" secureTextEntry={!visible} style={styles.input} />
      <Pressable accessibilityRole="button" accessibilityLabel={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`} accessibilityState={{ expanded: visible }} onPress={() => setVisible(!visible)} style={styles.toggle}><Text style={{ fontFamily: fonts.bodyBold, color: colors.skyDeep }}>{visible ? 'Ocultar' : 'Mostrar'}</Text></Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radii.md },
  input: { flex: 1, minWidth: 0, padding: 14, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  toggle: { padding: 14 },
});
