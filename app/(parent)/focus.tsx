import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PinPad } from '@/components/PinPad';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';

export default function ParentFocus() {
  const { state, setFocus, checkPin, allTasksDone } = useFamily();
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [awaitingPin, setAwaitingPin] = useState(false);

  const activate = async () => {
    if (state.tasks.length === 0) {
      setMessage('Agrega al menos una tarea antes de activar el enfoque.');
      return;
    }
    await setFocus(true);
    setMessage('Modo enfoque activado. Los mundos quedan bloqueados hasta terminar tareas.');
  };

  const requestDeactivate = () => {
    setAwaitingPin(true);
    setPin('');
    setMessage('Ingresa tu PIN parental para desactivar.');
  };

  const confirmDeactivate = async () => {
    if (pin.length !== 4) return;
    const ok = await checkPin(pin);
    if (!ok) {
      setMessage('PIN incorrecto.');
      setPin('');
      return;
    }
    await setFocus(false);
    setAwaitingPin(false);
    setPin('');
    setMessage('Modo enfoque desactivado.');
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Modo enfoque</Text>
      <Text style={styles.hint}>
        Mientras esté activo, el niño completa tareas antes de jugar en los mundos. Tú siempre
        puedes desbloquear con el PIN.
      </Text>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          Estado: {state.focusActive ? 'ACTIVO' : 'inactivo'}
          {allTasksDone && state.tasks.length > 0 ? ' · tareas completas' : ''}
        </Text>
      </View>

      {!state.focusActive ? (
        <PrimaryButton label="Activar modo enfoque" onPress={activate} />
      ) : (
        <PrimaryButton label="Desactivar con PIN" variant="danger" onPress={requestDeactivate} />
      )}

      {awaitingPin ? (
        <View style={styles.pinBlock}>
          <PinPad value={pin} onChange={setPin} />
          <PrimaryButton
            label="Confirmar PIN"
            onPress={confirmDeactivate}
            disabled={pin.length !== 4}
            style={{ marginTop: spacing.md }}
          />
        </View>
      ) : null}

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.md,
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
  badge: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: spacing.lg,
  },
  badgeText: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 16 },
  pinBlock: { marginTop: spacing.lg },
  message: {
    marginTop: spacing.lg,
    fontFamily: fonts.bodySemi,
    color: colors.skyDeep,
  },
});
