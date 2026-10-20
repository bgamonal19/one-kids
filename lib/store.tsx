import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { clampAge } from './ages';
import { hashPin, verifyPin } from './pin';
import type {
  AgendaEvent,
  CourseItem,
  CourseLink,
  FamilyState,
  ParentAccount,
  TaskItem,
} from './types';
import { COURSE_COLORS, DEFAULT_COURSES } from './types';

const STORAGE_KEY = 'onekids.family.v1';

const emptyState: FamilyState = {
  parent: null,
  child: null,
  tasks: [],
  courses: DEFAULT_COURSES,
  agenda: [],
  focusActive: false,
  onboarded: false,
};

type StoreApi = {
  ready: boolean;
  state: FamilyState;
  registerParent: (input: { email: string; name: string; password: string }) => Promise<void>;
  loginParent: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  checkPin: (pin: string) => Promise<boolean>;
  setChild: (name: string, age: number) => Promise<void>;
  updateChildAge: (age: number) => Promise<void>;
  addTask: (title: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  setFocus: (active: boolean) => Promise<void>;
  addStars: (n: number) => Promise<void>;
  addCourse: (input: { title: string; desc: string; link?: CourseLink }) => Promise<void>;
  removeCourse: (id: string) => Promise<void>;
  addAgenda: (input: { title: string; date: string; time?: string; note?: string }) => Promise<void>;
  removeAgenda: (id: string) => Promise<void>;
  loadDemo: () => Promise<void>;
  allTasksDone: boolean;
  worldsUnlocked: boolean;
};

const StoreContext = createContext<StoreApi | null>(null);

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeState(raw: Partial<FamilyState>): FamilyState {
  return {
    ...emptyState,
    ...raw,
    courses: raw.courses?.length ? raw.courses : DEFAULT_COURSES,
    agenda: raw.agenda ?? [],
    tasks: raw.tasks ?? [],
  };
}

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<FamilyState>(emptyState);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState(normalizeState(JSON.parse(raw)));
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = useCallback(async (next: FamilyState) => {
    setState(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const registerParent = useCallback(
    async (input: { email: string; name: string; password: string }) => {
      const parent: ParentAccount = {
        id: uid('parent'),
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        password: input.password,
        pinHash: '',
      };
      await persist({
        ...emptyState,
        parent,
        onboarded: false,
      });
    },
    [persist]
  );

  const loginParent = useCallback(
    async (email: string, password: string) => {
      if (!state.parent) return false;
      return (
        state.parent.email === email.trim().toLowerCase() && state.parent.password === password
      );
    },
    [state.parent]
  );

  const logout = useCallback(async () => {
    await persist(state);
  }, [persist, state]);

  const setPin = useCallback(
    async (pin: string) => {
      if (!state.parent) return;
      const pinHash = await hashPin(pin);
      await persist({ ...state, parent: { ...state.parent, pinHash } });
    },
    [persist, state]
  );

  const checkPin = useCallback(
    async (pin: string) => {
      if (!state.parent?.pinHash) return false;
      return verifyPin(pin, state.parent.pinHash);
    },
    [state.parent]
  );

  const setChild = useCallback(
    async (name: string, age: number) => {
      await persist({
        ...state,
        child: { id: uid('child'), name: name.trim(), age: clampAge(age), stars: 0 },
        onboarded: true,
      });
    },
    [persist, state]
  );

  const updateChildAge = useCallback(
    async (age: number) => {
      if (!state.child) return;
      await persist({
        ...state,
        child: { ...state.child, age: clampAge(age) },
      });
    },
    [persist, state]
  );

  const addTask = useCallback(
    async (title: string) => {
      const task: TaskItem = {
        id: uid('task'),
        title: title.trim(),
        done: false,
        createdAt: new Date().toISOString(),
      };
      await persist({ ...state, tasks: [task, ...state.tasks] });
    },
    [persist, state]
  );

  const toggleTask = useCallback(
    async (id: string) => {
      const tasks = state.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
      const allDone = tasks.length > 0 && tasks.every((t) => t.done);
      await persist({
        ...state,
        tasks,
        focusActive: allDone ? false : state.focusActive,
      });
    },
    [persist, state]
  );

  const removeTask = useCallback(
    async (id: string) => {
      await persist({ ...state, tasks: state.tasks.filter((t) => t.id !== id) });
    },
    [persist, state]
  );

  const setFocus = useCallback(
    async (active: boolean) => {
      await persist({ ...state, focusActive: active });
    },
    [persist, state]
  );

  const addStars = useCallback(
    async (n: number) => {
      if (!state.child) return;
      await persist({
        ...state,
        child: { ...state.child, stars: state.child.stars + n },
      });
    },
    [persist, state]
  );

  const addCourse = useCallback(
    async (input: { title: string; desc: string; link?: CourseLink }) => {
      const color = COURSE_COLORS[state.courses.length % COURSE_COLORS.length];
      const course: CourseItem = {
        id: uid('course'),
        title: input.title.trim(),
        desc: input.desc.trim() || 'Curso nuevo',
        color,
        link: input.link ?? 'custom',
      };
      await persist({ ...state, courses: [course, ...state.courses] });
    },
    [persist, state]
  );

  const removeCourse = useCallback(
    async (id: string) => {
      await persist({ ...state, courses: state.courses.filter((c) => c.id !== id) });
    },
    [persist, state]
  );

  const addAgenda = useCallback(
    async (input: { title: string; date: string; time?: string; note?: string }) => {
      const event: AgendaEvent = {
        id: uid('agenda'),
        title: input.title.trim(),
        date: input.date,
        time: input.time?.trim() ?? '',
        note: input.note?.trim() ?? '',
      };
      const agenda = [event, ...state.agenda].sort((x, y) =>
        `${x.date}${x.time}`.localeCompare(`${y.date}${y.time}`)
      );
      await persist({ ...state, agenda });
    },
    [persist, state]
  );

  const removeAgenda = useCallback(
    async (id: string) => {
      await persist({ ...state, agenda: state.agenda.filter((e) => e.id !== id) });
    },
    [persist, state]
  );

  const loadDemo = useCallback(async () => {
    const pinHash = await hashPin('1234');
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const date = `${y}-${m}-${d}`;

    const demo: FamilyState = {
      parent: {
        id: uid('parent'),
        email: 'demo@onekids.app',
        name: 'Alex',
        password: 'demo',
        pinHash,
      },
      child: {
        id: uid('child'),
        name: 'Luna',
        age: 8, // demo: cambia la edad en Panel padres (4–16)
        stars: 3,
      },
      tasks: [
        {
          id: uid('task'),
          title: 'Matemáticas: sumas página 12',
          done: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: uid('task'),
          title: 'Leer 10 minutos',
          done: false,
          createdAt: new Date().toISOString(),
        },
      ],
      courses: DEFAULT_COURSES,
      agenda: [
        {
          id: uid('agenda'),
          title: 'Hacer tareas',
          date,
          time: '16:00',
          note: 'Con el tutor IA si me trabo',
        },
        {
          id: uid('agenda'),
          title: 'Jugar en Mundos',
          date,
          time: '17:30',
          note: 'Cuando termine las tareas',
        },
      ],
      focusActive: true,
      onboarded: true,
    };
    await persist(demo);
  }, [persist]);

  const allTasksDone = state.tasks.length > 0 && state.tasks.every((t) => t.done);
  const worldsUnlocked = !state.focusActive || allTasksDone || state.tasks.length === 0;

  const api = useMemo<StoreApi>(
    () => ({
      ready,
      state,
      registerParent,
      loginParent,
      logout,
      setPin,
      checkPin,
      setChild,
      updateChildAge,
      addTask,
      toggleTask,
      removeTask,
      setFocus,
      addStars,
      addCourse,
      removeCourse,
      addAgenda,
      removeAgenda,
      loadDemo,
      allTasksDone,
      worldsUnlocked,
    }),
    [
      ready,
      state,
      registerParent,
      loginParent,
      logout,
      setPin,
      checkPin,
      setChild,
      updateChildAge,
      addTask,
      toggleTask,
      removeTask,
      setFocus,
      addStars,
      addCourse,
      removeCourse,
      addAgenda,
      removeAgenda,
      loadDemo,
      allTasksDone,
      worldsUnlocked,
    ]
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useFamily() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useFamily must be used within FamilyProvider');
  return ctx;
}
