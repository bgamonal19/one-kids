import { Platform } from 'react-native';
import type { AgeBand } from './ages';
import { APP_URL } from './app-url';
import type { ReportPeriod, reportInput } from './study-plan';
import { getAccessToken } from './supabase';

export type QuizQuestion = { q: string; options: string[]; answer: number; why: string };
export type StudyLesson = { title: string; explain: string; points: string[]; example: string; quiz: QuizQuestion[] };
export type ParentReport = { summary: string; done: string[]; pending: string[]; tips: string[] };
export type SyllabusRead = { topics: { title: string; month: number | null }[]; unreadable: boolean };

// Lives next to /api/tutor on Vercel; the native app calls the deployed site.
export function studyEndpoint(): string {
  const custom = process.env.EXPO_PUBLIC_TUTOR_API_URL;
  if (custom?.endsWith('/api/tutor')) return custom.replace(/\/api\/tutor$/, '/api/study');
  return Platform.OS === 'web' ? '/api/study' : `${APP_URL}/api/study`;
}

async function post<T>(body: object, timeout = 55_000): Promise<T> {
  const token = await getAccessToken().catch(() => null);
  let response;
  try {
    response = await fetch(studyEndpoint(), { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeout) });
  } catch { throw new Error('No se pudo conectar con el tutor. Revisa tu conexión e inténtalo otra vez.'); }
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) throw new Error('El modo estudio con IA es para cuentas familiares. Entra con tu cuenta para usarlo.');
  if (!response.ok) throw new Error(data.error || 'El tutor no pudo responder. Inténtalo de nuevo.');
  return data as T;
}

export async function requestLesson(input: { ageBand: AgeBand; course: string; topic: string; done: string[]; next: string[]; retry?: boolean }): Promise<StudyLesson> {
  const data = await post<StudyLesson>({ kind: 'lesson', ...input });
  if (typeof data.explain !== 'string' || !Array.isArray(data.quiz)) throw new Error('El servicio del tutor necesita actualizarse.');
  return data;
}

export async function requestReport(report: ReturnType<typeof reportInput>, question = ''): Promise<ParentReport> {
  const data = await post<ParentReport>({ kind: 'report', report, question });
  if (typeof data.summary !== 'string') throw new Error('El servicio del tutor necesita actualizarse.');
  return data;
}

export async function readSyllabusPhoto(imageBase64: string, course: string): Promise<SyllabusRead> {
  return post<SyllabusRead>({ kind: 'syllabus', imageBase64, course });
}

export const PERIOD_LABEL: Record<ReportPeriod, string> = { today: 'Hoy', week: 'Esta semana', all: 'Todo el año' };

export async function requestAssessment(input: { ageBand: AgeBand; course: string; topic: string; grade: string; count: number; mode: 'practice' | 'exam'; difficulty: string }): Promise<import('./types').Assessment> {
  const data = await post<import('./types').Assessment>({ kind: 'assessment', ...input });
  if (!Array.isArray(data.questions) || data.questions.length !== input.count) throw new Error('La práctica llegó incompleta. Vuelve a generarla.');
  return data;
}
