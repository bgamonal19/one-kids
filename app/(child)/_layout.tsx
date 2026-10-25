import { RequireFamily } from '@/components/RequireFamily';
import { Stack, router, usePathname } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SIGN_OUT_SPACE } from '@/components/AccountStatus';
import { PinPad } from '@/components/PinPad';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fonts } from '@/constants/theme';
import { useFamily } from '@/lib/store';

export default function ChildLayout() {
  const insets = useSafeAreaInsets();
  const onHome = usePathname() === '/';
  const narrow = useWindowDimensions().width < 520;
  const { checkPin, state, accountMode } = useFamily();
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const tryParent = async () => {
    if (pin.length !== 4) return;
    const ok = await checkPin(pin);
    if (!ok) {
      setError('PIN incorrecto');
      setPin('');
      return;
    }
    setShowPin(false);
    setPin('');
    setError('');
    router.push('/(parent)');
  };

  return (
    <RequireFamily><View style={{ flex: 1 }}>
      <Stack key={state.child?.id ?? 'empty'}
        // Each child screen has its own big title and back button, so the stack header would only repeat them.
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="profile" options={{ title: 'Mi aprendizaje' }} />
        <Stack.Screen name="tasks" options={{ title: 'Tareas' }} />
        <Stack.Screen name="tutor" options={{ title: 'Tutor' }} />
        <Stack.Screen name="worlds" />
        <Stack.Screen name="calculator" options={{ title: 'Calculadora' }} />
        <Stack.Screen name="calendar" options={{ title: 'Calendario' }} />
        <Stack.Screen name="courses" options={{ title: 'Cursos' }} />
        <Stack.Screen name="course/[id]" options={{ title: 'Perfil del curso' }} />
        <Stack.Screen name="schedule" options={{ title: 'Rol semanal' }} />
      </Stack>

      {/* Top-right pills, left to right: Cambiar personaje (home only), Padres, then Salir from the root layout. */}
      <View pointerEvents="box-none" style={[styles.topActions, { top: insets.top + 12, right: accountMode === 'signed-out' ? 12 : 12 + SIGN_OUT_SPACE }]}>
        {onHome ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Cambiar de personaje" onPress={() => router.push('/(child)/profile')} style={styles.parentBtn}>
            <Text style={styles.parentBtnText}>{narrow ? '🔄 Personaje' : '🔄 Cambiar personaje'}</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => {
            setShowPin(true);
            setPin('');
            setError('');
          }}
          accessibilityRole="button"
          accessibilityLabel="Panel de padres, pide el PIN"
          style={styles.parentBtn}
        >
          <Text style={styles.parentBtnText}>🔒 Padres</Text>
        </Pressable>
      </View>

      <Modal visible={showPin} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>PIN parental</Text>
            <Text style={styles.modalHint}>Solo para mamá o papá 👋</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PinPad value={pin} onChange={setPin} />
            <PrimaryButton label="Entrar al panel" onPress={tryParent} style={{ marginTop: 16 }} />
            <PrimaryButton label="Cancelar" variant="ghost" onPress={() => setShowPin(false)} />
          </View>
        </View>
      </Modal>
    </View></RequireFamily>
  );
}

const styles = StyleSheet.create({
  topActions: { position: 'absolute', zIndex: 30, flexDirection: 'row', gap: 8 },
  parentBtn: {
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  parentBtnText: { fontFamily: fonts.bodySemi, color: colors.inkMuted, fontSize: 13 },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(26,43,60,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontFamily: fonts.displayBold, fontSize: 24, color: colors.ink },
  modalHint: { fontFamily: fonts.body, color: colors.inkMuted, marginBottom: 16 },
  error: {
    fontFamily: fonts.bodySemi,
    color: colors.coral,
    marginBottom: 8,
    textAlign: 'center',
  },
});
