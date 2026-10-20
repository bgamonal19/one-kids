import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { getAgeBand } from '@/lib/ages';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';
import {
  makeExplorerQuestion,
  makeLetterRound,
  makeMathQuestion,
  type WorldId,
  WORLDS,
} from '@/lib/worlds';

export default function WorldPlay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const worldId = id as WorldId;
  const world = WORLDS.find((w) => w.id === worldId);
  const { state, addStars, worldsUnlocked } = useFamily();
  const band = state.child ? getAgeBand(state.child.age) : '7-9';

  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [round, setRound] = useState(0);

  const math = useMemo(() => makeMathQuestion(band), [band, round]);
  const letter = useMemo(() => makeLetterRound(band), [band, round]);
  const explorer = useMemo(() => makeExplorerQuestion(band), [band, round]);
  const mathOptions = useMemo(() => {
    const distractors =
      math.op === '×'
        ? [math.answer + math.a, Math.max(0, math.answer - math.b), math.a + math.b]
        : [math.answer + 1, Math.max(0, math.answer - 2), math.answer + 3];
    const opts = Array.from(new Set([math.answer, ...distractors])).slice(0, 4);
    while (opts.length < 4) opts.push(math.answer + opts.length + 1);
    return opts.sort(() => Math.random() - 0.5);
  }, [math, round]);

  if (!world) {
    return (
      <Screen>
        <Text style={styles.title}>Mundo no encontrado</Text>
        <PrimaryButton label="Volver" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (!worldsUnlocked) {
    return (
      <Screen>
        <Text style={styles.title}>Bloqueado</Text>
        <PrimaryButton label="Volver" onPress={() => router.back()} />
      </Screen>
    );
  }

  const correct = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setScore((s) => s + 1);
    setFeedback('¡Correcto! +1 ★');
    await addStars(1);
    setTimeout(() => {
      setFeedback('');
      setRound((r) => r + 1);
    }, 700);
  };

  const wrong = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setFeedback('Casi… inténtalo otra vez');
  };

  return (
    <Screen scroll>
      <Text style={styles.kicker}>{world.title}</Text>
      <Text style={styles.title}>Ronda {round + 1}</Text>
      <Text style={styles.score}>Estrellas de sesión: {score}</Text>

      {worldId === 'numbers' ? (
        <View style={styles.board}>
          <Text style={styles.prompt}>
            ¿Cuánto es {math.a} {math.op} {math.b}?
          </Text>
          <View style={styles.options}>
            {mathOptions.map((n, i) => (
              <Pressable
                key={`${round}-${n}-${i}`}
                style={styles.option}
                onPress={() => (n === math.answer ? correct() : wrong())}
              >
                <Text style={styles.optionText}>{n}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {worldId === 'letters' ? (
        <View style={styles.board}>
          <Text style={styles.prompt}>{letter.prompt}</Text>
          <View style={styles.options}>
            {letter.options.map((opt) => (
              <Pressable
                key={`${round}-${opt}`}
                style={styles.option}
                onPress={() => (opt === letter.word ? correct() : wrong())}
              >
                <Text style={styles.optionText}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {worldId === 'explorer' ? (
        <View style={styles.board}>
          <Text style={styles.prompt}>{explorer.question}</Text>
          <View style={styles.options}>
            {explorer.options.map((opt) => (
              <Pressable
                key={`${round}-${opt}`}
                style={styles.option}
                onPress={() => (opt === explorer.answer ? correct() : wrong())}
              >
                <Text style={styles.optionText}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      <PrimaryButton label="Salir del mundo" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    marginTop: spacing.md,
    fontFamily: fonts.bodySemi,
    color: colors.skyDeep,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
  },
  title: {
    marginTop: 8,
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.ink,
  },
  score: {
    marginTop: 6,
    marginBottom: spacing.lg,
    fontFamily: fonts.bodySemi,
    color: colors.inkMuted,
  },
  board: { gap: 16 },
  prompt: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink,
    lineHeight: 32,
  },
  options: { gap: 10 },
  option: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  optionText: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink },
  feedback: {
    marginTop: spacing.lg,
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    color: colors.leafDeep,
    fontSize: 16,
  },
});
