import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinPad } from '@/components/PinPad';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fonts } from '@/constants/theme';
import { useFamily } from '@/lib/store';

export default function ChildLayout() {
  const insets = useSafeAreaInsets();
  const { checkPin } = useFamily();
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
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerTitleStyle: { fontFamily: fonts.displayBold, color: colors.ink },
          headerTintColor: colors.coral,
          headerStyle: { backgroundColor: colors.paper },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.paper },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="tasks" options={{ title: 'Tareas' }} />
        <Stack.Screen name="tutor" options={{ title: 'Tutor IA' }} />
        <Stack.Screen name="worlds" options={{ headerShown: false }} />
        <Stack.Screen name="calculator" options={{ title: 'Calculadora' }} />
        <Stack.Screen name="calendar" options={{ title: 'Calendario' }} />
        <Stack.Screen name="courses" options={{ title: 'Cursos' }} />
      </Stack>

      <Pressable
        onPress={() => {
          setShowPin(true);
          setPin('');
          setError('');
        }}
        style={[styles.parentBtn, { top: insets.top + 8 }]}
      >
        <Text style={styles.parentBtnText}>Padres</Text>
      </Pressable>

      <Modal visible={showPin} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>PIN parental</Text>
            <Text style={styles.modalHint}>Solo mamá o papá</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PinPad value={pin} onChange={setPin} />
            <PrimaryButton label="Entrar al panel" onPress={tryParent} style={{ marginTop: 16 }} />
            <PrimaryButton label="Cancelar" variant="ghost" onPress={() => setShowPin(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  parentBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 30,
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
