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

// The approved sheets are immutable sources. Viewport rectangles select art only:
// headings, grid lines and printed labels are outside each visible frame.
const SHEETS = {
  bear: { asset: require('../assets/characters/expressions/sheets/bear.png'), rows: [[99, 350], [401, 648], [694, 943]] },
  inventor: { asset: require('../assets/characters/expressions/sheets/inventor.png'), rows: [[99, 349], [403, 645], [694, 943]] },
  polar: { asset: require('../assets/characters/expressions/sheets/polar.png'), rows: [[108, 359], [413, 654], [714, 954]] },
  turtle: { asset: require('../assets/characters/expressions/sheets/turtle.png'), rows: [[105, 362], [414, 653], [712, 945]] },
  penguin: { asset: require('../assets/characters/expressions/sheets/penguin.png'), rows: [[111, 359], [414, 653], [711, 948]] },
  tutorbot: { asset: require('../assets/characters/expressions/sheets/tutorbot.png'), rows: [[115, 354], [409, 650], [708, 947]] },
} as const;
const COLUMNS = [[20, 308], [321, 609], [623, 911], [925, 1213], [1227, 1515]] as const;
export function expressionFrame(character: ExpressiveCompanionId, expression: ExpressionId) {
  const index = EXPRESSIONS.findIndex(item => item.id === expression);
  const column = COLUMNS[index % 5];
  const row = SHEETS[character].rows[Math.floor(index / 5)];
  return { asset: SHEETS[character].asset, x: column[0], y: row[0], width: column[1] - column[0], height: row[1] - row[0], sheetWidth: 1536, sheetHeight: 1024 };
}
export function expressionLabel(expression: ExpressionId) {
  return EXPRESSIONS.find(item => item.id === expression)?.label ?? 'Hola';
}
