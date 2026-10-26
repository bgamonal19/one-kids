import * as Speech from 'expo-speech';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { fetchTutorVoice } from '@/lib/tutor';
import { aiVoicesAvailable, deviceSpanishVoices, type VoiceChoice } from '@/lib/voices';

// One shared <audio> on the web. Safari only lets a page play sound later if an element
// already played during a tap, so the first touch "unlocks" it with a silent clip.
let player: HTMLAudioElement | null = null;
function webPlayer() {
  if (!player && Platform.OS === 'web' && typeof Audio !== 'undefined') {
    player = new Audio();
    const unlock = () => {
      document.removeEventListener('pointerdown', unlock);
      if (player && !player.src) { player.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='; void player.play().catch(() => {}); }
    };
    document.addEventListener('pointerdown', unlock);
  }
  return player;
}
const clips = new Map<string, string>();

export function useTutorSpeech(age: number, choice: VoiceChoice) {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState('');
  const generation = useRef(0);
  const pendingEnd = useRef<(() => void) | null>(null);
  const bestDeviceVoice = useRef<string | undefined>(undefined);
  // After a refusal (no account, no key, monthly limit) the natural voice rests until the page reloads.
  const aiBlocked = useRef(false);
  useEffect(() => {
    webPlayer();
    void deviceSpanishVoices().then(voices => { bestDeviceVoice.current = voices[0]?.identifier; });
  }, []);

  const endPending = () => { const end = pendingEnd.current; pendingEnd.current = null; end?.(); };
  const halt = useCallback(async () => {
    generation.current++;
    setSpeakingId(null);
    if (player) { player.pause(); player.onended = player.onerror = null; }
    endPending();
    await Speech.stop();
  }, []);
  useFocusEffect(useCallback(() => () => { void halt(); }, [halt]));

  const speakDevice = (text: string, current: number, voice: string | undefined, finish: () => void) => {
    try {
      Speech.speak(text.slice(0, Math.min(6000, Speech.maxSpeechInputLength)), {
        language: 'es-ES', voice, rate: age <= 8 ? 0.86 : 0.96, pitch: 1.05,
        onDone: finish, onStopped: finish,
        onError: () => {
          finish();
          if (current === generation.current) setSpeechError('No pudimos reproducir la voz. Revisa el volumen y la voz en español de tu dispositivo.');
        },
      });
    } catch {
      finish();
      if (current === generation.current) setSpeechError('La voz no está disponible en este dispositivo. Puedes seguir leyendo la explicación.');
    }
  };

  // onEnd runs once when this utterance ends, fails or is replaced, so callers can move on.
  const speak = async (id: string, raw: string, onEnd?: () => void, override?: VoiceChoice) => {
    if (speakingId === id) { await halt(); onEnd?.(); return; }
    await halt();
    const current = generation.current;
    const voice = override ?? choice;
    const text = raw.replace(/[*#`_]/g, '').trim();
    setSpeechError('');
    setSpeakingId(id);
    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      if (pendingEnd.current === finish) pendingEnd.current = null;
      if (current === generation.current) setSpeakingId(null);
      onEnd?.();
    };
    pendingEnd.current = finish;
    const deviceVoice = voice.kind === 'device' ? voice.id : bestDeviceVoice.current;
    const audio = webPlayer();
    if (voice.kind !== 'ai' || !aiVoicesAvailable || !audio || aiBlocked.current) { speakDevice(text, current, deviceVoice, finish); return; }
    try {
      const key = `${voice.id}|${age}|${text}`;
      let url = clips.get(key);
      if (!url) {
        url = URL.createObjectURL(await fetchTutorVoice(text, voice.id, age));
        clips.set(key, url);
        if (clips.size > 40) { const [oldKey, oldUrl] = clips.entries().next().value!; clips.delete(oldKey); URL.revokeObjectURL(oldUrl); }
      }
      if (current !== generation.current) return;
      audio.onended = finish;
      audio.onerror = () => { if (current === generation.current) speakDevice(text, current, deviceVoice, finish); };
      audio.src = url;
      await audio.play();
    } catch (error) {
      if (current !== generation.current) return;
      if (error instanceof Error && error.name !== 'NotAllowedError') aiBlocked.current = true;
      // The natural voice failed: read it with the device voice instead of staying silent.
      speakDevice(text, current, deviceVoice, finish);
    }
  };
  return { speakingId, speechError, speak, stop: halt };
}
