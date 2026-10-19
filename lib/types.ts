export type TaskItem = {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
};

export type ChildProfile = {
  id: string;
  name: string;
  age: number;
  stars: number;
};

export type ParentAccount = {
  id: string;
  email: string;
  name: string;
  password: string;
  pinHash: string;
};

export type CourseLink = 'numbers' | 'letters' | 'explorer' | 'tutor' | 'custom';

export type CourseItem = {
  id: string;
  title: string;
  desc: string;
  color: string;
  link: CourseLink;
};

export type AgendaEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm or ''
  note: string;
};

export type FamilyState = {
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
