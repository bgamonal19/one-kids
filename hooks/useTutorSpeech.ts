import * as Speech from 'expo-speech';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

export function useTutorSpeech(age: number) {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState('');
  const generation = useRef(0);
  const stop = useCallback(async () => {
    generation.current++;
    setSpeakingId(null);
    await Speech.stop();
  }, []);
  useFocusEffect(useCallback(() => () => {
    generation.current++;
    setSpeakingId(null);
    void Speech.stop();
  }, []));
  // onEnd runs once when this utterance ends, fails or is replaced, so callers can move on.
  const speak = async (id: string, text: string, onEnd?: () => void) => {
    if (speakingId === id) { await stop(); onEnd?.(); return; }
    const current = ++generation.current;
    setSpeechError('');
    try {
      await Speech.stop();
      if (current !== generation.current) return;
      setSpeakingId(id);
      const finish = () => { if (current === generation.current) setSpeakingId(null); onEnd?.(); };
      Speech.speak(text.replace(/[*#`]/g, '').slice(0, Math.min(6000, Speech.maxSpeechInputLength)), {
        language: 'es-ES', rate: age <= 8 ? 0.82 : 0.94,
        onDone: finish, onStopped: finish,
        onError: () => {
          onEnd?.();
          if (current !== generation.current) return;
          setSpeakingId(null);
          setSpeechError('No pudimos reproducir la voz. Revisa el volumen y la voz en español de tu dispositivo.');
        },
      });
    } catch {
      onEnd?.();
      if (current === generation.current) {
        setSpeakingId(null);
        setSpeechError('La voz no está disponible en este dispositivo. Puedes seguir leyendo la explicación.');
      }
    }
  };
  return { speakingId, speechError, speak, stop };
}
