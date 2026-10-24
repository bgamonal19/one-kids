export const SCHOOL_COUNTRIES = ['Italia', 'España', 'Perú', 'Otro'];
const years = (count: number, stage: string) => Array.from({ length: count }, (_, i) => `${i + 1}.º de ${stage}`);
export function schoolGrades(country: string): string[] {
  const initial = ['Inicial / Infantil · 3 años', 'Inicial / Infantil · 4 años', 'Inicial / Infantil · 5 años'];
  if (country === 'Italia') return [...initial, ...years(5, 'primaria'), ...years(3, 'secundaria · media'), ...years(5, 'secundaria · superior'), 'Otro nivel'];
  if (country === 'España') return [...initial, ...years(6, 'primaria'), ...years(4, 'ESO'), ...years(2, 'bachillerato'), 'Otro nivel'];
  if (country === 'Perú') return [...initial, ...years(6, 'primaria'), ...years(5, 'secundaria'), 'Otro nivel'];
  return ['Inicial / Preescolar', ...years(6, 'primaria'), ...years(6, 'secundaria'), 'Otro nivel'];
}
