import type { CompanionId } from './companions';

export const EXPRESSIONS = [
  { id: 'hello', label: 'Hola' }, { id: 'listen', label: 'Escuchando' },
  { id: 'think', label: 'Pensando' }, { id: 'explain', label: 'Explicando' },
  { id: 'curious', label: 'Curiosidad' }, { id: 'focused', label: 'Concentrado' },
  { id: 'hint', label: 'Una pista' }, { id: 'retry', label: 'Intenta otra vez' },
  { id: 'encourage', label: 'Tú puedes' }, { id: 'correct', label: 'Correcto' },
  { id: 'celebrate', label: 'Celebrando' }, { id: 'surprise', label: 'Sorprendido' },
  { id: 'confused', label: 'No entiendo' }, { id: 'rest', label: 'Descanso' },
  { id: 'bye', label: 'Hasta pronto' },
] as const;
export type ExpressionId = (typeof EXPRESSIONS)[number]['id'];
export const APPROVED_CHARACTERS = ['bear', 'inventor', 'polar', 'turtle', 'penguin', 'tutorbot'] as const;
export type ExpressiveCompanionId = (typeof APPROVED_CHARACTERS)[number];
export function hasExpressions(id: CompanionId): id is ExpressiveCompanionId {
  return APPROVED_CHARACTERS.some(value => value === id);
}

// Alpha-cutout derivatives retain the 5×3 pose order. Generous art-only
// windows leave room for hands, ears and accent marks without a white panel.
const SHEETS = {
  bear: { asset: require('../assets/characters/expressions/transparent/bear.png'), rows: [[52, 366], [370, 658], [660, 986]] },
  inventor: { asset: require('../assets/characters/expressions/transparent/inventor.png'), rows: [[52, 366], [370, 658], [660, 986]] },
  polar: { asset: require('../assets/characters/expressions/transparent/polar.png'), rows: [[52, 366], [370, 658], [660, 986]] },
  turtle: { asset: require('../assets/characters/expressions/transparent/turtle.png'), rows: [[52, 366], [370, 658], [660, 986]] },
  penguin: { asset: require('../assets/characters/expressions/transparent/penguin.png'), rows: [[52, 366], [370, 658], [660, 986]] },
  tutorbot: { asset: require('../assets/characters/expressions/transparent/tutorbot.png'), rows: [[52, 366], [370, 658], [660, 986]] },
} as const;
const COLUMNS = [[3, 305], [310, 612], [617, 919], [924, 1226], [1231, 1533]] as const;
export function expressionFrame(character: ExpressiveCompanionId, expression: ExpressionId) {
  const index = EXPRESSIONS.findIndex(item => item.id === expression);
  const column = COLUMNS[index % 5];
  const row = SHEETS[character].rows[Math.floor(index / 5)];
  return { asset: SHEETS[character].asset, x: column[0], y: row[0], width: column[1] - column[0], height: row[1] - row[0], sheetWidth: 1536, sheetHeight: 1024 };
}
export function expressionLabel(expression: ExpressionId) {
  return EXPRESSIONS.find(item => item.id === expression)?.label ?? 'Hola';
}
