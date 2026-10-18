import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (phase === 'create' && pin.length === 4) {
      if (!isValidPin(pin)) {
        setError('El PIN debe ser de 4 dígitos.');
        setLocalPin('');
        return;
      }
      setPhase('confirm');
      setError('');
    }
  }, [pin, phase]);

  useEffect(() => {
    if (phase !== 'confirm' || confirm.length !== 4) return;
    (async () => {
      if (confirm !== pin) {
        setError('No coinciden. Intenta de nuevo.');
        setLocalPin('');
        setConfirm('');
        setPhase('create');
        return;
      }
      await setPin(pin);
      router.replace('/(onboarding)/child');
    })();
  }, [confirm, phase, pin, setPin]);

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
        onChange={phase === 'create' ? setLocalPin : setConfirm}
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
