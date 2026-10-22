/** Stable IDs preserve saved student profiles when the visual collection grows. */
export const COMPANIONS = {
  kiko: { name: 'Kiko', role: 'Curioso y optimista', family: 'original', ages: '4–8 años', color: '#25B8C6', intro: 'Me pregunto… ', asset: require('../assets/characters/kiko.webp') },
  nova: { name: 'Nova', role: 'Inventora de ideas', family: 'original', ages: '9–12 años', color: '#9471D6', intro: 'Tengo una idea: ', asset: require('../assets/characters/nova.webp') },
  axon: { name: 'Axon', role: 'Estratega de retos', family: 'original', ages: '13–16 años', color: '#324D75', intro: 'Pensemos una estrategia: ', asset: require('../assets/characters/axon.webp') },
  lumi: { name: 'Lumi', role: 'Paciente y lector', family: 'original', ages: '4–8 años', color: '#BE8B31', intro: 'Leamos con calma: ', asset: require('../assets/characters/lumi.webp') },
  miko: { name: 'Miko', role: 'Aventurero valiente', family: 'original', ages: '7–12 años', color: '#E5814B', intro: '¡Vamos a explorar! ', asset: require('../assets/characters/miko.webp') },
  orbit: { name: 'Orbit', role: 'Ingenioso y científico', family: 'original', ages: '10–16 años', color: '#507DD5', intro: 'Comprobemos una hipótesis: ', asset: require('../assets/characters/orbit.webp') },
  bear: { name: 'Oso explorador', role: 'Guía de aventuras', family: 'blocks', ages: '4–10 años', color: '#AD6A35', intro: '¡Seguimos el mapa! ', asset: require('../assets/characters/bear.webp') },
  inventor: { name: 'Oso inventor', role: 'Creativo y resolutivo', family: 'blocks', ages: '7–12 años', color: '#8E59AF', intro: 'Construyamos una solución: ', asset: require('../assets/characters/inventor.webp') },
  polar: { name: 'Oso polar', role: 'Compañero de lectura', family: 'blocks', ages: '4–10 años', color: '#3888A7', intro: 'Una página a la vez: ', asset: require('../assets/characters/polar.webp') },
  turtle: { name: 'Tortuga sabia', role: 'Matemáticas sin prisa', family: 'blocks', ages: '6–12 años', color: '#589832', intro: 'Paso a paso llegamos: ', asset: require('../assets/characters/turtle.webp') },
  penguin: { name: 'Pingüino curioso', role: 'Descubre el universo', family: 'blocks', ages: '7–14 años', color: '#355B83', intro: 'Miremos más allá: ', asset: require('../assets/characters/penguin.webp') },
  tutorbot: { name: 'Robot tutor', role: 'Organiza y acompaña', family: 'blocks', ages: '8–16 años', color: '#269C83', intro: 'Organicemos el siguiente paso: ', asset: require('../assets/characters/tutorbot.webp') },
} as const;
export type CompanionId = keyof typeof COMPANIONS;
export const COMPANION_IDS = Object.keys(COMPANIONS) as CompanionId[];
export function isCompanionId(value: unknown): value is CompanionId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(COMPANIONS, value);
}
