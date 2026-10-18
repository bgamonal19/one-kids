export type AgeBand = '5-7' | '8-10' | '11-13';

export function getAgeBand(age: number): AgeBand {
  if (age <= 7) return '5-7';
  if (age <= 10) return '8-10';
  return '11-13';
}

export function tutorTone(band: AgeBand): string {
  switch (band) {
    case '5-7':
      return 'Habla como un maestro muy amable con niños de 5 a 7 años. Frases cortas, palabras fáciles, mucha animación positiva.';
    case '8-10':
      return 'Habla como un tutor divertido con niños de 8 a 10 años. Claro, paciente y con ejemplos cotidianos.';
    case '11-13':
      return 'Habla como un mentor cercano con preadolescentes de 11 a 13 años. Respeta su inteligencia, sé claro y motivador.';
  }
}

export const AGE_OPTIONS = [5, 6, 7, 8, 9, 10, 11, 12, 13] as const;
