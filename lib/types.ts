import type { CompanionId } from './companions';

export type Assessment = {
  title: string; instructions: string; course: string; topic: string; grade: string;
  mode: 'practice' | 'exam'; difficulty: string;
  questions: { q: string; options: string[]; answer: number; why: string }[];
};
export type AssessmentResult = { answers: number[]; right: number; total: number; submittedAt: string };
export type TaskItem = {
  assessment?: Assessment;
  assessmentResult?: AssessmentResult;
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  /** Course the task belongs to, so study mode and the parent report can group it. */
  courseId?: string;
  dueDate?: string; // YYYY-MM-DD
  doneAt?: string;
  note?: string;
  addedBy?: 'parent' | 'child';
};

export type ChildProfile = {
  loginUsername?: string;
  id: string;
  name: string;
  age: number;
  stars: number;
  grade?: string;
  country?: string;
  interests?: string[];
  companion?: CompanionId;
};

export type ParentAccount = {
  id: string;
  email: string;
  name: string;
  pinHash: string;
};

export type CourseLink = 'numbers' | 'letters' | 'explorer' | 'tutor' | 'custom';

/** One topic of the school year, uploaded by a parent. Study mode follows them in order. */
export type CourseTopic = {
  id: string;
  title: string;
  /** Month it is taught in class (1–12), when the syllabus says so. */
  month?: number;
  done: boolean;
  doneAt?: string;
  /** Last study-mode quiz: right answers out of total. */
  score?: { right: number; total: number };
  studiedAt?: string;
};

/** One weekly class: ISO weekday (1 = lunes … 7 = domingo) and times as HH:mm. */
export type CourseSlot = {
  day: number;
  start: string;
  end: string;
};

export type CourseItem = {
  id: string;
  title: string;
  desc: string;
  color: string;
  link: CourseLink;
  teacher?: string;
  reference?: string;
  schedule?: CourseSlot[];
  /** false for activities outside school (e.g. a sports club) that keep going during school holidays. */
  followsSchool?: boolean;
  /** The year's syllabus for this course, in teaching order. */
  topics?: CourseTopic[];
};

export type AgendaEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm or ''
  note: string;
};

export type ChildLearningState = {
  child: ChildProfile;
  tasks: TaskItem[];
  courses: CourseItem[];
  agenda: AgendaEvent[];
  focusActive: boolean;
};

export type FamilyState = {
  childAccess?: { childId: string; username: string };
  profiles?: ChildLearningState[];
  parent: ParentAccount | null;
  child: ChildProfile | null;
  tasks: TaskItem[];
  courses: CourseItem[];
  agenda: AgendaEvent[];
  focusActive: boolean;
  onboarded: boolean;
};

export type TutorMessage = {
  id: string;
  role: 'tutor' | 'child';
  text: string;
  imageUri?: string;
};

export const DEFAULT_COURSES: CourseItem[] = [
  {
    id: 'mates',
    title: 'Matemáticas',
    desc: 'Sumas, restas y problemas',
    color: '#3DB8E8',
    link: 'numbers',
  },
  {
    id: 'lectura',
    title: 'Lectura',
    desc: 'Palabras y comprensión',
    color: '#FF6B4A',
    link: 'letters',
  },
  {
    id: 'ciencias',
    title: 'Ciencias',
    desc: 'Curiosidades del mundo',
    color: '#3ECF8E',
    link: 'explorer',
  },
  {
    id: 'tutor',
    title: 'Con el tutor IA',
    desc: 'Foto de tu tarea y ayuda paso a paso',
    color: '#5B8DEF',
    link: 'tutor',
  },
];

export const COURSE_COLORS = ['#3DB8E8', '#FF6B4A', '#3ECF8E', '#E6A23C', '#5B8DEF', '#2BB8A8', '#FF7A59'];
