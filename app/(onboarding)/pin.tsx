import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { PinPad } from '@/components/PinPad';
import { Screen } from '@/components/Screen';
import { colors, fonts, spacing } from '@/constants/theme';
import { isValidPin } from '@/lib/pin';
import { useFamily } from '@/lib/store';

export default function PinSetupScreen() {
  const { state, setPin } = useFamily();
  const [pin, setLocalPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phase, setPhase] = useState<'create' | 'confirm'>('create');
  const [error, setError] = useState('');

  useEffect(() => {
    if (state.parent?.pinHash && !state.child) {
      router.replace('/(onboarding)/child');
    }
  }, [state.parent?.pinHash, state.child]);

  const saving = useRef(false);
  const handlePinChange = async (value: string) => {
    if (saving.current) return;
    if (phase === 'create') {
      setLocalPin(value);
      if (value.length !== 4) return;
      if (!isValidPin(value)) { setError('El PIN debe ser de 4 dígitos.'); setLocalPin(''); return; }
      setPhase('confirm'); setError('');
      return;
    }
    setConfirm(value);
    if (value.length !== 4) return;
    if (value !== pin) {
      setError('No coinciden. Intenta de nuevo.'); setLocalPin(''); setConfirm(''); setPhase('create');
      return;
    }
    saving.current = true;
    try { await setPin(pin); router.replace('/(onboarding)/child'); }
    catch { setError('No se pudo guardar el PIN. Inténtalo otra vez.'); setConfirm(''); }
    finally { saving.current = false; }
  };

  return (
    <Screen>
      <Text style={styles.kicker}>Seguridad familiar</Text>
      <Text style={styles.title}>
        {phase === 'create' ? 'Crea tu PIN parental' : 'Confirma el PIN'}
      </Text>
      <Text style={styles.hint}>
        Con este PIN desbloqueas el modo enfoque y entras al panel de padres.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PinPad
        value={phase === 'create' ? pin : confirm}
        onChange={value => void handlePinChange(value)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    marginTop: spacing.lg,
    fontFamily: fonts.bodySemi,
    color: colors.skyDeep,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
  },
  title: {
    marginTop: 8,
    fontFamily: fonts.displayBold,
    fontSize: 30,
    color: colors.ink,
  },
  hint: {
    marginTop: 10,
    marginBottom: spacing.xl,
    fontFamily: fonts.body,
    color: colors.inkMuted,
    fontSize: 15,
  },
  error: {
    marginBottom: spacing.md,
    fontFamily: fonts.bodySemi,
    color: colors.coral,
    textAlign: 'center',
  },
});
