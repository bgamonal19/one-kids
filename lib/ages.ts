export type AgeBand = '4-6' | '7-9' | '10-12' | '13-16';

export type AgeProfile = {
  band: AgeBand;
  label: string;
  /** Escala visual: botones y tipografía */
  uiScale: number;
  maxCols: number;
  mascotSize: number;
  showPlayground: boolean;
  kikoName: string;
  tone: 'playful' | 'friendly' | 'coach' | 'mentor';
  sky: string;
  accent: string;
  tileLabels: Record<string, string>;
  greeting: (name: string, focus: boolean, done: boolean) => string;
  tutorHint: string;
  bandTitle: string;
};

export function clampAge(age: number): number {
  return Math.min(16, Math.max(4, Math.round(age)));
}

export function getAgeBand(age: number): AgeBand {
  const a = clampAge(age);
  if (a <= 6) return '4-6';
  if (a <= 9) return '7-9';
  if (a <= 12) return '10-12';
  return '13-16';
}

export function tutorTone(band: AgeBand): string {
  switch (band) {
    case '4-6':
      return 'Habla como un cuentacuentos muy dulce con niños de 4 a 6 años. Frases cortísimas, palabras fáciles, mucha alegría. Un solo paso a la vez.';
    case '7-9':
      return 'Habla como un maestro divertido con niños de 7 a 9 años. Claro, paciente y con ejemplos del recreo o casa.';
    case '10-12':
      return 'Habla como un coach cercano con preadolescentes de 10 a 12 años. Motiva, explica el porqué y respeta su ritmo.';
    case '13-16':
      return 'Habla como un mentor serio y cercano con adolescentes de 13 a 16 años. Sé directo, útil y sin tono infantil.';
  }
}

export function getAgeProfile(age: number): AgeProfile {
  const band = getAgeBand(age);
  const a = clampAge(age);

  if (band === '4-6') {
    return {
      band,
      label: `${a} años · Pequeños exploradores`,
      uiScale: 1.15,
      maxCols: 2,
      mascotSize: 132,
      showPlayground: true,
      kikoName: 'Kiko',
      tone: 'playful',
      sky: '#B8F0FF',
      accent: '#FF6B4A',
      tileLabels: {
        inicio: 'Casa',
        tareas: 'Mis cosas',
        tutor: 'Ayuda',
        mundos: 'Jugar',
        calculadora: 'Números',
        calendario: 'Días',
        cursos: 'Aprender',
      },
      greeting: (name, focus, done) =>
        done
          ? `¡Muy bien ${name}! Ya puedes jugar.`
          : focus
            ? `Hola ${name}. Primero terminamos juntas las cositas.`
            : `¡Hola ${name}! Toca un dibujo grande.`,
      tutorHint: 'Kiko te ayuda con dibujos y pasos cortitos.',
      bandTitle: 'Modo peques',
    };
  }

  if (band === '7-9') {
    return {
      band,
      label: `${a} años · Aventureros`,
      uiScale: 1.05,
      maxCols: 3,
      mascotSize: 118,
      showPlayground: true,
      kikoName: 'Kiko',
      tone: 'friendly',
      sky: '#BFEFFF',
      accent: '#3DB8E8',
      tileLabels: {
        inicio: 'Inicio',
        tareas: 'Tareas',
        tutor: 'Tutor IA',
        mundos: 'Mundos',
        calculadora: 'Calculadora',
        calendario: 'Calendario',
        cursos: 'Cursos',
      },
      greeting: (name, focus, done) =>
        done
          ? `¡Genial ${name}! Terminaste. ¡A los mundos!`
          : focus
            ? `Hola ${name}, soy Kiko. Primero tus tareas… ¡tú puedes!`
            : `¡Hola ${name}! Elige un recuadro para empezar.`,
      tutorHint: 'Foto o escribe tu duda. Te guío paso a paso.',
      bandTitle: 'Modo aventura',
    };
  }

  if (band === '10-12') {
    return {
      band,
      label: `${a} años · Exploradores`,
      uiScale: 1,
      maxCols: 4,
      mascotSize: 100,
      showPlayground: true,
      kikoName: 'Kiko',
      tone: 'coach',
      sky: '#D7F0F8',
      accent: '#2BA86F',
      tileLabels: {
        inicio: 'Inicio',
        tareas: 'Tareas',
        tutor: 'Tutor IA',
        mundos: 'Mundos',
        calculadora: 'Calculadora',
        calendario: 'Agenda',
        cursos: 'Cursos',
      },
      greeting: (name, focus, done) =>
        done
          ? `Buen trabajo, ${name}. Ya desbloqueaste el tiempo libre.`
          : focus
            ? `${name}, organízate: primero tareas, luego juegos.`
            : `Hola ${name}. ¿Qué quieres practicar hoy?`,
      tutorHint: 'Explica tu duda o manda una foto. Vamos paso a paso.',
      bandTitle: 'Modo explorador',
    };
  }

  return {
    band,
    label: `${a} años · Mentores`,
    uiScale: 0.95,
    maxCols: 4,
    mascotSize: 84,
    showPlayground: false,
    kikoName: 'Kiko',
    tone: 'mentor',
    sky: '#EEF4F7',
    accent: '#1A8FBF',
    tileLabels: {
      inicio: 'Inicio',
      tareas: 'Tareas',
      tutor: 'Tutor',
      mundos: 'Práctica',
      calculadora: 'Calculadora',
      calendario: 'Agenda',
      cursos: 'Cursos',
    },
    greeting: (name, focus, done) =>
      done
        ? `${name}, checklist completa. Buen ritmo.`
        : focus
          ? `${name}, modo enfoque activo. Termina y desbloqueas práctica.`
          : `Hola ${name}. Elige una herramienta.`,
    tutorHint: 'Describe el problema o sube una imagen. Te oriento sin dar la respuesta de golpe.',
    bandTitle: 'Modo teen',
  };
}

export const AGE_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] as const;

export const BAND_ORDER: AgeBand[] = ['4-6', '7-9', '10-12', '13-16'];
