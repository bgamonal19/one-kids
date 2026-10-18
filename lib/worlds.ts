import type { AgeBand } from './ages';
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
    subtitle: 'Sumas y restas divertidas',
    color: colors.worldNumbers,
    minBand: '5-7',
  },
  {
    id: 'letters',
    title: 'Mundo Letras',
    subtitle: 'Palabras y emparejar',
    color: colors.worldLetters,
    minBand: '5-7',
  },
  {
    id: 'explorer',
    title: 'Mundo Explorador',
    subtitle: 'Curiosidades y ciencia',
    color: colors.worldExplorer,
    minBand: '5-7',
  },
];

const BAND_ORDER: AgeBand[] = ['5-7', '8-10', '11-13'];

export function worldsForBand(band: AgeBand): WorldDef[] {
  const idx = BAND_ORDER.indexOf(band);
  return WORLDS.filter((w) => BAND_ORDER.indexOf(w.minBand) <= idx);
}

export type MathQuestion = { a: number; b: number; op: '+' | '-'; answer: number };

export function makeMathQuestion(band: AgeBand): MathQuestion {
  if (band === '5-7') {
    const a = 1 + Math.floor(Math.random() * 8);
    const b = 1 + Math.floor(Math.random() * 8);
    return { a, b, op: '+', answer: a + b };
  }
  if (band === '8-10') {
    const a = 5 + Math.floor(Math.random() * 20);
    const b = 2 + Math.floor(Math.random() * 12);
    const op: '+' | '-' = Math.random() > 0.4 ? '+' : '-';
    const left = op === '-' ? Math.max(a, b) : a;
    const right = op === '-' ? Math.min(a, b) : b;
    return { a: left, b: right, op, answer: op === '+' ? left + right : left - right };
  }
  const a = 12 + Math.floor(Math.random() * 40);
  const b = 5 + Math.floor(Math.random() * 25);
  const op: '+' | '-' = Math.random() > 0.5 ? '+' : '-';
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
  '5-7': [
    { word: 'SOL', options: ['SOL', 'SAL', 'LOS'], prompt: '¿Cuál es la palabra del astro brillante?' },
    { word: 'MAR', options: ['RAM', 'MAR', 'ARM'], prompt: '¿Cuál dice mar?' },
    { word: 'PAN', options: ['NAP', 'PAN', 'APN'], prompt: '¿Cuál se come fresco?' },
  ],
  '8-10': [
    { word: 'LIBRO', options: ['BOLIR', 'LIBRO', 'LORBI'], prompt: '¿Cuál se lee en clase?' },
    { word: 'AMIGO', options: ['IGOAM', 'AMIGO', 'MOGIA'], prompt: '¿Quién juega contigo?' },
    { word: 'CIELO', options: ['CIELO', 'LOCIE', 'CIELOX'], prompt: '¿Dónde están las nubes?' },
  ],
  '11-13': [
    { word: 'PLANETA', options: ['PLANETA', 'PALTENA', 'PETALAN'], prompt: '¿Cuál gira alrededor del Sol?' },
    { word: 'ENERGIA', options: ['GENERAÍ', 'ENERGIA', 'ENARGIE'], prompt: '¿Cuál mueve las máquinas?' },
    { word: 'HISTORIA', options: ['HISTORIA', 'HORISTIA', 'STOHIRIA'], prompt: '¿Cuál estudia el pasado?' },
  ],
};

export function makeLetterRound(band: AgeBand): LetterRound {
  const pool = LETTER_SETS[band];
  return pool[Math.floor(Math.random() * pool.length)];
}

export type ExplorerQ = { question: string; options: string[]; answer: string };

const EXPLORER: Record<AgeBand, ExplorerQ[]> = {
  '5-7': [
    { question: '¿De qué color es el cielo en un día soleado?', options: ['Azul', 'Verde', 'Rojo'], answer: 'Azul' },
    { question: '¿Qué animal dice miau?', options: ['Perro', 'Gato', 'Vaca'], answer: 'Gato' },
    { question: '¿Cuántas patas tiene una araña?', options: ['6', '8', '4'], answer: '8' },
  ],
  '8-10': [
    { question: '¿Qué planeta es el más cercano al Sol?', options: ['Tierra', 'Mercurio', 'Marte'], answer: 'Mercurio' },
    { question: '¿Qué gas necesitamos para respirar?', options: ['Oxígeno', 'Helio', 'Nitrógeno puro'], answer: 'Oxígeno' },
    { question: '¿En qué estado está el agua del mar?', options: ['Sólido', 'Líquido', 'Gas'], answer: 'Líquido' },
  ],
  '11-13': [
    { question: '¿Cuál es la unidad básica de la vida?', options: ['Átomo', 'Célula', 'Tejido'], answer: 'Célula' },
    { question: '¿Qué fuerza nos mantiene en la Tierra?', options: ['Magnetismo', 'Gravedad', 'Fricción'], answer: 'Gravedad' },
    { question: '¿Cuántos continentes hay?', options: ['5', '6', '7'], answer: '7' },
  ],
};

export function makeExplorerQuestion(band: AgeBand): ExplorerQ {
  const pool = EXPLORER[band];
  return pool[Math.floor(Math.random() * pool.length)];
}
