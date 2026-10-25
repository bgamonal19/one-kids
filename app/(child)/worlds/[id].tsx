import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { CompanionStatus } from '@/components/CompanionStatus';
import { useCompanionReaction } from '@/hooks/useCompanionReaction';
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

function createQuestions(band: ReturnType<typeof getAgeBand>) {
  const math = makeMathQuestion(band);
  const letter = makeLetterRound(band);
  const explorer = makeExplorerQuestion(band);
  const distractors = math.op === '×'
    ? [math.answer + math.a, Math.max(0, math.answer - math.b), math.a + math.b]
    : [math.answer + 1, Math.max(0, math.answer - 2), math.answer + 3];
  const mathOptions = Array.from(new Set([math.answer, ...distractors])).slice(0, 4);
  while (mathOptions.length < 4) mathOptions.push(math.answer + mathOptions.length + 1);
  for (let i = mathOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mathOptions[i], mathOptions[j]] = [mathOptions[j], mathOptions[i]];
  }
  return { math, letter, explorer, mathOptions };
}

export default function WorldPlay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const worldId = id as WorldId;
  const world = WORLDS.find((w) => w.id === worldId);
  const { state, addStars, worldsUnlocked } = useFamily();
  const band = state.child ? getAgeBand(state.child.age) : '7-9';

  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [round, setRound] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [rightPick, setRightPick] = useState<string | null>(null);
  const { width } = useWindowDimensions();

  const [{ math, letter, explorer, mathOptions }, setQuestions] = useState(() => createQuestions(band));
  const { expression, react } = useCompanionReaction('curious');
  const resolving = useRef(false);
  const nextRoundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (nextRoundTimer.current) clearTimeout(nextRoundTimer.current); }, []);

  if (!world) {
    return (
      <Screen>
        <Text style={styles.title}>Mundo no encontrado 🤔</Text>
        <PrimaryButton label="Ver los mundos" onPress={() => router.replace('/(child)/worlds')} />
      </Screen>
    );
  }

  if (!worldsUnlocked) {
    return (
      <Screen>
        <Text style={styles.title}>🔒 ¡Primero las tareas!</Text>
        <PrimaryButton label="📝 Ir a mis tareas" onPress={() => router.replace('/(child)/tasks')} />
      </Screen>
    );
  }

  const board =
    worldId === 'numbers'
      ? { prompt: `¿Cuánto es ${math.a} ${math.op} ${math.b}?`, options: mathOptions.map(String), answer: String(math.answer) }
      : worldId === 'letters'
        ? { prompt: letter.prompt, options: letter.options, answer: letter.word }
        : { prompt: explorer.question, options: explorer.options, answer: explorer.answer };
  // Four short answers fit in a 2×2 grid, which keeps every button big and in reach; three would leave one alone.
  const twoColumns = board.options.length % 2 === 0 && (width >= 600 || board.options.every(option => option.length <= 10));

  const correct = async (option: string) => {
    if (resolving.current) return;
    resolving.current = true;
    setRightPick(option);
    react('correct');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setScore((s) => s + 1);
    setFeedback('¡Correcto! +1 ⭐');
    await addStars(1);
    nextRoundTimer.current = setTimeout(() => {
      setFeedback('');
      setWrongPicks([]);
      setRightPick(null);
      setQuestions(createQuestions(band));
      setRound((r) => r + 1);
      react('curious');
      resolving.current = false;
    }, 900);
  };

  const wrong = (option: string) => {
    if (resolving.current) return;
    setWrongPicks(picks => (picks.includes(option) ? picks : [...picks, option]));
    react('retry');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setFeedback('¡Casi! Prueba otra 💪');
  };

  return (
    <Screen scroll>
      <View style={styles.topRow}>
        <Text style={styles.kicker}>{world.title} · Ronda {round + 1}</Text>
        <View style={styles.scorePill} accessibilityLabel={`${score} estrellas en esta sesión`}>
          <Text style={styles.scoreText}>⭐ {score}</Text>
        </View>
      </View>
      <CompanionStatus expression={expression} message="¿Cuál es la respuesta?" />

      <View style={styles.board}>
        <Text style={styles.prompt}>{board.prompt}</Text>
        <View style={styles.options}>
          {board.options.map((option, i) => {
            const isRight = rightPick === option;
            const isWrong = wrongPicks.includes(option);
            return (
              <Pressable
                key={`${round}-${option}-${i}`}
                accessibilityRole="button"
                accessibilityLabel={option}
                accessibilityState={{ disabled: isWrong }}
                disabled={isWrong}
                onPress={() => (option === board.answer ? correct(option) : wrong(option))}
                style={({ pressed }) => [
                  styles.option,
                  { width: twoColumns ? '48%' : '100%' },
                  isRight && styles.optionRight,
                  isWrong && styles.optionWrong,
                  pressed && styles.optionPressed,
                ]}
              >
                <Text style={[styles.optionText, isRight && styles.optionTextRight, isWrong && styles.optionTextWrong]}>
                  {isRight ? '✓ ' : isWrong ? '✗ ' : ''}{option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {feedback ? (
        <View style={[styles.feedback, rightPick ? styles.feedbackRight : styles.feedbackRetry]} accessibilityLiveRegion="polite">
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  kicker: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    color: colors.skyDeep,
    fontSize: 16,
  },
  scorePill: { backgroundColor: colors.white, borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 8 },
  scoreText: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.ink },
  title: {
    marginTop: 8,
    marginBottom: spacing.lg,
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.ink,
  },
  board: { gap: 18, marginTop: spacing.sm },
  prompt: {
    fontFamily: fonts.displayBold,
    fontSize: 30,
    color: colors.ink,
    lineHeight: 38,
    textAlign: 'center',
  },
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  option: {
    minHeight: 84,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 3,
    borderColor: '#D7EAF5',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionPressed: { transform: [{ scale: 0.96 }] },
  optionRight: { backgroundColor: colors.leaf, borderColor: colors.leafDeep },
  optionWrong: { backgroundColor: '#FFF1EC', borderColor: '#FFD3C6', opacity: 0.7 },
  optionText: { fontFamily: fonts.displayBold, fontSize: 28, color: colors.ink, textAlign: 'center' },
  optionTextRight: { color: colors.white },
  optionTextWrong: { color: colors.coral },
  feedback: { marginTop: spacing.lg, borderRadius: radii.lg, paddingVertical: 14, paddingHorizontal: 16 },
  feedbackRight: { backgroundColor: '#DDF7EA' },
  feedbackRetry: { backgroundColor: '#FFF4D6' },
  feedbackText: { textAlign: 'center', fontFamily: fonts.displayBold, color: colors.ink, fontSize: 22 },
});
