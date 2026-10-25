import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

type RecognitionEvent = { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
type Recognition = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start(): void; stop(): void; abort(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | undefined {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

const errors: Record<string, string> = {
  'not-allowed': 'Necesitamos permiso para usar el micrófono. Pide ayuda a un adulto.',
  'service-not-allowed': 'Este navegador no deja usar el micrófono. Prueba con el teclado.',
  'no-speech': 'No te escuché. Toca el micrófono y habla un poco más fuerte.',
  'audio-capture': 'No encontramos un micrófono en este dispositivo.',
  network: 'El dictado necesita internet. Revisa la conexión.',
};

/** Browser dictation (Chrome, Edge and Safari on iPad/iPhone). Native apps use the keyboard microphone. */
export function useSpeechInput(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recognition = useRef<Recognition | null>(null);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;

  // Detected after mount so the static web render matches the first client render.
  useEffect(() => { setSupported(Boolean(recognitionConstructor())); }, []);
  useEffect(() => () => recognition.current?.abort(), []);

  const stop = useCallback(() => { recognition.current?.stop(); }, []);
  const start = useCallback(() => {
    const Constructor = recognitionConstructor();
    if (!Constructor) return;
    recognition.current?.abort();
    const current = new Constructor();
    recognition.current = current;
    current.lang = 'es-ES'; current.interimResults = true; current.continuous = false; current.maxAlternatives = 1;
    let heard = '';
    current.onresult = event => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
      heard = text.trim();
      setInterim(heard);
    };
    current.onerror = event => { if (event.error !== 'aborted') setError(errors[event.error] ?? 'No pude escucharte. Prueba otra vez o usa el teclado.'); };
    current.onend = () => {
      if (recognition.current !== current) return;
      recognition.current = null;
      setListening(false); setInterim('');
      if (heard) finalRef.current(heard);
    };
    setError(''); setInterim(''); setListening(true);
    try { current.start(); }
    catch { recognition.current = null; setListening(false); setError('No pude encender el micrófono. Prueba otra vez.'); }
  }, []);
  return { supported, listening, interim, error, start, stop };
}
