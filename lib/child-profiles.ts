import type { ChildLearningState, FamilyState } from './types';
import { DEFAULT_COURSES } from './types';

export function activeLearning(state: FamilyState): ChildLearningState | null {
  return state.child ? { child: state.child, tasks: state.tasks, courses: state.courses, agenda: state.agenda, focusActive: state.focusActive } : null;
}
export function preserveProfiles(state: FamilyState): FamilyState {
  const active = activeLearning(state);
  const profiles = Array.isArray(state.profiles) ? state.profiles.filter(p => p?.child?.id && p.child.id !== active?.child.id) : [];
  return { ...state, profiles: active ? [active, ...profiles] : profiles };
}
export function selectChildProfile(state: FamilyState, id: string): FamilyState {
  const saved = preserveProfiles(state);
  const target = saved.profiles?.find(p => p.child.id === id);
  if (!target) throw new Error('No se encontró ese perfil infantil.');
  return preserveProfiles({ ...saved, ...target, onboarded: true });
}
export function addChildProfile(state: FamilyState, child: ChildLearningState['child']): FamilyState {
  if (!child.name.trim()) throw new Error('Escribe el nombre de tu hijo o hija.');
  const saved = preserveProfiles(state);
  return preserveProfiles({ ...saved, child, tasks: [], courses: DEFAULT_COURSES.map(c => ({ ...c })), agenda: [], focusActive: false, onboarded: true });
}
