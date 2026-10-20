import type { AgeBand } from './ages';
import { BAND_ORDER } from './ages';
import { colors } from '@/constants/theme';

export type WorldId = 'numbers' | 'letters' | 'explorer';

export type WorldDef = {
  id: WorldId;
  title: string;
  subtitle: string;
  color: string;
  minBand: AgeBand;
};

export const WORLDS: WorldDef[] = [
  {
    id: 'numbers',
    title: 'Mundo Números',
    subtitle: 'Practica operaciones',
    color: colors.worldNumbers,
    minBand: '4-6',
  },
  {
    id: 'letters',
    title: 'Mundo Letras',
    subtitle: 'Palabras y lectura',
    color: colors.worldLetters,
    minBand: '4-6',
  },
  {
    id: 'explorer',
    title: 'Mundo Explorador',
    subtitle: 'Ciencia y curiosidades',
    color: colors.worldExplorer,
    minBand: '4-6',
  },
];

export function worldsForBand(band: AgeBand): WorldDef[] {
  const idx = BAND_ORDER.indexOf(band);
  return WORLDS.filter((w) => BAND_ORDER.indexOf(w.minBand) <= idx);
}

export type MathQuestion = { a: number; b: number; op: '+' | '-' | '×'; answer: number };

export function makeMathQuestion(band: AgeBand): MathQuestion {
  if (band === '4-6') {
    const a = 1 + Math.floor(Math.random() * 5);
    const b = 1 + Math.floor(Math.random() * 5);
    return { a, b, op: '+', answer: a + b };
  }
  if (band === '7-9') {
    const a = 3 + Math.floor(Math.random() * 12);
    const b = 2 + Math.floor(Math.random() * 10);
    const op: '+' | '-' = Math.random() > 0.45 ? '+' : '-';
    const left = op === '-' ? Math.max(a, b) : a;
    const right = op === '-' ? Math.min(a, b) : b;
    return { a: left, b: right, op, answer: op === '+' ? left + right : left - right };
  }
  if (band === '10-12') {
    const a = 8 + Math.floor(Math.random() * 30);
    const b = 3 + Math.floor(Math.random() * 15);
    const roll = Math.random();
    if (roll > 0.66) {
      const x = 2 + Math.floor(Math.random() * 9);
      const y = 2 + Math.floor(Math.random() * 9);
      return { a: x, b: y, op: '×', answer: x * y };
    }
    const op: '+' | '-' = roll > 0.33 ? '+' : '-';
    const left = op === '-' ? Math.max(a, b) : a;
    const right = op === '-' ? Math.min(a, b) : b;
    return { a: left, b: right, op, answer: op === '+' ? left + right : left - right };
  }
  // 13-16
  const a = 12 + Math.floor(Math.random() * 40);
  const b = 4 + Math.floor(Math.random() * 20);
  const roll = Math.random();
  if (roll > 0.5) {
    const x = 6 + Math.floor(Math.random() * 12);
    const y = 3 + Math.floor(Math.random() * 9);
    return { a: x, b: y, op: '×', answer: x * y };
  }
  const op: '+' | '-' = roll > 0.25 ? '+' : '-';
  const left = op === '-' ? Math.max(a, b) : a;
  const right = op === '-' ? Math.min(a, b) : b;
  return { a: left, b: right, op, answer: op === '+' ? left + right : left - right };
}

export type LetterRound = {
  word: string;
  options: string[];
  prompt: string;
};

const LETTER_SETS: Record<AgeBand, LetterRound[]> = {
  '4-6': [
    { word: 'SOL', options: ['SOL', 'SAL', 'LOS'], prompt: '¿Cuál es SOL?' },
    { word: 'MAR', options: ['RAM', 'MAR', 'ARM'], prompt: '¿Cuál dice MAR?' },
    { word: 'OSO', options: ['OSO', 'SOS', 'OOS'], prompt: '¿Cuál es OSO?' },
  ],
  '7-9': [
    { word: 'LIBRO', options: ['BOLIR', 'LIBRO', 'LORBI'], prompt: '¿Cuál se lee en clase?' },
    { word: 'AMIGO', options: ['IGOAM', 'AMIGO', 'MOGIA'], prompt: '¿Quién juega contigo?' },
    { word: 'CIELO', options: ['CIELO', 'LOCIE', 'CIELOX'], prompt: '¿Dónde están las nubes?' },
  ],
  '10-12': [
    { word: 'PLANETA', options: ['PLANETA', 'PALTENA', 'PETALAN'], prompt: '¿Cuál gira alrededor del Sol?' },
    { word: 'ENERGIA', options: ['GENERAÍ', 'ENERGIA', 'ENARGIE'], prompt: '¿Cuál mueve las máquinas?' },
    { word: 'HISTORIA', options: ['HISTORIA', 'HORISTIA', 'STOHIRIA'], prompt: '¿Cuál estudia el pasado?' },
  ],
  '13-16': [
    { word: 'DEMOCRACIA', options: ['DEMOCRACIA', 'DEMARCOCIA', 'CDEMOCRIA'], prompt: '¿Sistema de gobierno del pueblo?' },
    { word: 'ECOSISTEMA', options: ['ECOSISTEMA', 'ECOSESTIMA', 'SISTECOEMA'], prompt: '¿Comunidad de seres vivos y su entorno?' },
    { word: 'ALGORITMO', options: ['ALGORITMO', 'ALOGIRTMO', 'ALGORTIMO'], prompt: '¿Pasos ordenados para resolver un problema?' },
  ],
};

export function makeLetterRound(band: AgeBand): LetterRound {
  const pool = LETTER_SETS[band];
  return pool[Math.floor(Math.random() * pool.length)];
}

export type ExplorerQ = { question: string; options: string[]; answer: string };

const EXPLORER: Record<AgeBand, ExplorerQ[]> = {
  '4-6': [
    { question: '¿De qué color es el sol en los dibujos?', options: ['Amarillo', 'Azul', 'Verde'], answer: 'Amarillo' },
    { question: '¿Qué animal dice miau?', options: ['Perro', 'Gato', 'Vaca'], answer: 'Gato' },
    { question: '¿Cuántas patas tiene un perro?', options: ['2', '4', '6'], answer: '4' },
  ],
  '7-9': [
    { question: '¿Qué planeta es el más cercano al Sol?', options: ['Tierra', 'Mercurio', 'Marte'], answer: 'Mercurio' },
    { question: '¿Qué gas necesitamos para respirar?', options: ['Oxígeno', 'Helio', 'Humos'], answer: 'Oxígeno' },
    { question: '¿En qué estado está el agua del mar?', options: ['Sólido', 'Líquido', 'Gas'], answer: 'Líquido' },
  ],
  '10-12': [
    { question: '¿Cuál es la unidad básica de la vida?', options: ['Átomo', 'Célula', 'Tejido'], answer: 'Célula' },
    { question: '¿Qué fuerza nos mantiene en la Tierra?', options: ['Magnetismo', 'Gravedad', 'Fricción'], answer: 'Gravedad' },
    { question: '¿Cuántos continentes hay?', options: ['5', '6', '7'], answer: '7' },
  ],
  '13-16': [
    { question: '¿Qué es la fotosíntesis?', options: ['Proceso de las plantas con luz', 'Un tipo de roca', 'Una nube'], answer: 'Proceso de las plantas con luz' },
    { question: '¿Quién propuso la relatividad?', options: ['Newton', 'Einstein', 'Darwin'], answer: 'Einstein' },
    { question: '¿Capital de Japón?', options: ['Seúl', 'Pekín', 'Tokio'], answer: 'Tokio' },
  ],
};

export function makeExplorerQuestion(band: AgeBand): ExplorerQ {
  const pool = EXPLORER[band];
  return pool[Math.floor(Math.random() * pool.length)];
}
