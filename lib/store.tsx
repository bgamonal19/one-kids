import { addChildProfile, selectChildProfile, preserveProfiles } from './child-profiles';
import { isCompanionId, type CompanionId } from './companions';
import { accountEndpoint, deleteCloudAccount, familyForUser, familyPayload, loadCloudFamily, saveCloudFamily, signInAccount, signUpAccount, type RegistrationResult } from './cloud-accounts';
import { getAccessToken, supabase } from './supabase';
import { Platform } from 'react-native';
import type { User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { clampAge } from './ages';
import { completeTopic } from './study-plan';
import { hashPin, verifyPin } from './pin';
import type {
  AgendaEvent,
  CourseItem,
  CourseLink,
  CourseTopic,
  FamilyState,
  TaskItem,
} from './types';
import { COURSE_COLORS, DEFAULT_COURSES } from './types';

const STORAGE_KEY = 'onekids.family.v1';
const DEMO_KEY = 'onekids.demo.v2';
const MODE_KEY = 'onekids.account-mode.v2';
const cloudKey = (id: string) => `onekids.cloud.${id}`;
type AccountMode = 'signed-out' | 'demo' | 'cloud';

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
  accountMode: AccountMode;
  syncStatus: 'idle' | 'saving' | 'saved' | 'error';
  syncError: string;
  retrySync: () => Promise<void>;
  refreshFamily: () => Promise<void>;
  registerParent: (input: { email: string; name: string; password: string }) => Promise<RegistrationResult>;
  loginParent: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  checkPin: (pin: string) => Promise<boolean>;
  switchChild: (id: string) => Promise<void>;
  addChild: (name: string, age: number, school?: { country: string; grade: string }) => Promise<void>;
  setChild: (name: string, age: number, school?: { country: string; grade: string }) => Promise<void>;
  updateChildAge: (age: number) => Promise<void>;
  updateLearningProfile: (input: { grade: string; country: string; interests: string[]; companion: CompanionId }) => Promise<void>;
  addTask: (title: string, extra?: Pick<TaskItem, 'courseId' | 'dueDate' | 'note' | 'addedBy' | 'assessment'>) => Promise<void>;
  updateTask: (id: string, patch: Partial<Pick<TaskItem, 'title' | 'courseId' | 'dueDate' | 'note'>>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  submitAssessment: (id: string, answers: number[]) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  setFocus: (active: boolean) => Promise<void>;
  addStars: (n: number) => Promise<void>;
  addCourse: (input: { title: string; desc: string; link?: CourseLink }) => Promise<string>;
  updateCourse: (id: string, patch: Partial<Omit<CourseItem, 'id'>>) => Promise<void>;
  removeCourse: (id: string) => Promise<void>;
  setCourseTopics: (id: string, topics: CourseTopic[]) => Promise<void>;
  /** Saves a study-mode quiz; a passed quiz finishes the topic and gives stars. */
  finishTopic: (courseId: string, topicId: string, score: { right: number; total: number }, stars: number) => Promise<void>;
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
  return preserveProfiles({
    ...emptyState,
    ...raw,
    parent: raw.parent ? { id: raw.parent.id, email: raw.parent.email, name: raw.parent.name, pinHash: raw.parent.pinHash || '' } : null,
    child: raw.child ? { ...raw.child, companion: isCompanionId(raw.child.companion) ? raw.child.companion : 'bear' } : null,
    courses: Array.isArray(raw.courses) ? raw.courses : DEFAULT_COURSES,
    agenda: raw.agenda ?? [],
    tasks: raw.tasks ?? [],
  });
}

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<FamilyState>(emptyState);

  const [accountMode, setAccountMode] = useState<AccountMode>('signed-out');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [syncError, setSyncError] = useState('');
  const mode = useRef<AccountMode>('signed-out');
  const currentUser = useRef<User | null>(null);
  const loadedCloud = useRef(false);
  const generation = useRef(0);
  const authOperation = useRef(false);
  const pending = useRef<FamilyState | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const chooseMode = useCallback((next: AccountMode) => {
    mode.current = next; setAccountMode(next);
    void AsyncStorage.setItem(MODE_KEY, next);
  }, []);
  const restoreCloud = useCallback(async (user: User) => {
    const request = ++generation.current;
    currentUser.current = user; loadedCloud.current = false; pending.current = null;
    chooseMode('cloud'); setReady(false); setSyncError('');
    try {
      const remote = await loadCloudFamily(supabase!, user);
      const cachedRaw = await AsyncStorage.getItem(cloudKey(user.id));
      let next = remote;
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached.pending && cached.state?.parent?.id === user.id) {
          next = familyForUser(user, familyPayload(cached.state));
        }
      }
      if (request !== generation.current) return;
      loadedCloud.current = true;
      setState(normalizeState(next));
      if (next !== remote) {
        pending.current = next; setSyncStatus('error');
        setSyncError('Hay cambios de este equipo pendientes de guardar en tu cuenta. Pulsa «Reintentar guardado».');
      } else setSyncStatus('saved');
    } catch (error) {
      if (request === generation.current) {
        setState(emptyState); setSyncStatus('error');
        setSyncError(error instanceof Error ? error.message : 'No se pudo cargar tu cuenta.');
      }
      throw error;
    } finally { if (request === generation.current) setReady(true); }
  }, [chooseMode]);

  useEffect(() => {
    let active = true;
    const restoreLocal = async () => {
      const savedMode = await AsyncStorage.getItem(MODE_KEY);
      let raw = savedMode === 'demo' ? await AsyncStorage.getItem(DEMO_KEY) : null;
      if (!savedMode) {
        const legacy = await AsyncStorage.getItem(STORAGE_KEY);
        if (legacy) {
          // Move old prototype data to an explicitly local demo; discard its plaintext password.
          const migrated = normalizeState(JSON.parse(legacy));
          raw = JSON.stringify(migrated);
          await AsyncStorage.setItem(DEMO_KEY, raw);
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      }
      if (!active) return;
      if (raw) { chooseMode('demo'); setState(normalizeState(JSON.parse(raw))); }
      else { chooseMode('signed-out'); setState(emptyState); }
      setReady(true);
    };
    void (async () => {
      if (supabase) {
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        if (error) { setSyncError('No se pudo recuperar la sesión. Vuelve a entrar.'); }
        if (data.session?.user) { await restoreCloud(data.session.user); return; }
      }
      await restoreLocal();
    })().catch(() => { if (active) setReady(true); });
    const subscription = supabase?.auth.onAuthStateChange((event, session) => {
      if (authOperation.current || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
      // Leave the Auth callback before making database requests (avoids Auth lock deadlocks).
      setTimeout(() => {
        if (!active || authOperation.current) return;
        if (session?.user) void restoreCloud(session.user).catch(() => {});
        else if (mode.current === 'cloud') {
          generation.current++; currentUser.current = null; loadedCloud.current = false; pending.current = null;
          chooseMode('signed-out'); setState(emptyState); setSyncStatus('idle'); setReady(true);
        }
      }, 0);
    }).data.subscription;
    return () => { active = false; generation.current++; subscription?.unsubscribe(); };
  }, [chooseMode, restoreCloud]);

  const persist = useCallback(async (next: FamilyState) => {
    const clean = normalizeState(next);
    if (mode.current === 'demo') {
      setState(clean); await AsyncStorage.setItem(DEMO_KEY, JSON.stringify(clean)); return;
    }
    const user = currentUser.current;
    const client = supabase;
    if (!client || mode.current !== 'cloud' || !user || !loadedCloud.current || clean.parent?.id !== user.id) {
      throw new Error('Vuelve a entrar en tu cuenta antes de guardar.');
    }
    setState(clean); setSyncStatus('saving'); setSyncError(''); pending.current = clean;
    const write = queue.current.catch(() => {}).then(async () => {
      await AsyncStorage.setItem(cloudKey(user.id), JSON.stringify({ state: clean, pending: true }));
      try {
        await saveCloudFamily(client, user.id, clean);
        // A newer local write may already be queued. Do not erase its recovery snapshot.
        if (pending.current === clean && currentUser.current?.id === user.id) {
          pending.current = null;
          await AsyncStorage.setItem(cloudKey(user.id), JSON.stringify({ state: clean, pending: false }));
          setSyncStatus('saved'); setSyncError('');
        }
      } catch (error) {
        if (currentUser.current?.id === user.id) {
          setSyncStatus('error'); setSyncError(error instanceof Error ? error.message : 'Guardado pendiente. Revisa tu conexión.');
        }
      }
    });
    queue.current = write;
    await write;
  }, []);

  const retrySync = useCallback(async () => {
    if (!currentUser.current) return;
    if (pending.current && loadedCloud.current) await persist(pending.current);
    else await restoreCloud(currentUser.current).catch(() => {});
  }, [persist, restoreCloud]);
  const refreshFamily = useCallback(async () => {
    if (!currentUser.current) return;
    await queue.current.catch(() => {});
    if (pending.current) { await retrySync(); if (pending.current) return; }
    await restoreCloud(currentUser.current).catch(() => {});
  }, [restoreCloud, retrySync]);

  const registerParent = useCallback(async (input: { email: string; name: string; password: string }) => {
    authOperation.current = true;
    try {
      const result = await signUpAccount(supabase, input);
      if (result.user) await restoreCloud(result.user);
      return result.result;
    } finally { authOperation.current = false; }
  }, [restoreCloud]);
  const loginParent = useCallback(async (email: string, password: string) => {
    authOperation.current = true;
    try {
      const user = await signInAccount(supabase, email, password);
      if (!user) return false;
      await restoreCloud(user); return true;
    } finally { authOperation.current = false; }
  }, [restoreCloud]);
  const logout = useCallback(async () => {
    authOperation.current = true;
    try {
      await queue.current.catch(() => {});
      if (supabase && currentUser.current) {
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error('No se pudo cerrar la sesión. Revisa tu conexión e inténtalo otra vez.');
      }
      generation.current++; currentUser.current = null; loadedCloud.current = false; pending.current = null;
      chooseMode('signed-out'); setState(emptyState); setSyncStatus('idle'); setSyncError(''); setReady(true);
    } finally { authOperation.current = false; }
  }, [chooseMode]);

  const deleteAccount = useCallback(async () => {
    const user = currentUser.current;
    if (!supabase || mode.current !== 'cloud' || !user) throw new Error('Solo se puede eliminar una cuenta real con la sesión iniciada.');
    authOperation.current = true;
    try {
      await queue.current.catch(() => {});
      await deleteCloudAccount(await getAccessToken(), accountEndpoint(Platform.OS === 'web'));
      // The server already removed the user; only this device's session and copy remain.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      await AsyncStorage.removeItem(cloudKey(user.id));
      generation.current++; currentUser.current = null; loadedCloud.current = false; pending.current = null;
      chooseMode('signed-out'); setState(emptyState); setSyncStatus('idle'); setSyncError(''); setReady(true);
    } finally { authOperation.current = false; }
  }, [chooseMode]);

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
    async (name: string, age: number, school?: { country: string; grade: string }) => {
      await persist({
        ...state,
        child: { id: uid('child'), name: name.trim(), age: clampAge(age), stars: 0, companion: 'bear', ...school },
        onboarded: true,
      });
    },
    [persist, state]
  );

  const switchChild = useCallback(async (id: string) => {
    await persist(selectChildProfile(state, id));
  }, [persist, state]);
  const addChild = useCallback(async (name: string, age: number, school?: { country: string; grade: string }) => {
    await persist(addChildProfile(state, { id: uid('child'), name: name.trim().slice(0, 60), age: clampAge(age), stars: 0, companion: 'bear', ...school }));
  }, [persist, state]);

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

  const updateLearningProfile = useCallback(async (input: { grade: string; country: string; interests: string[]; companion: CompanionId }) => {
    if (!state.child) return;
    await persist({ ...state, child: { ...state.child, grade: input.grade.trim().slice(0, 50), country: input.country.trim().slice(0, 50), interests: input.interests.slice(0, 8), companion: isCompanionId(input.companion) ? input.companion : 'bear' } });
  }, [persist, state]);

  const addTask = useCallback(
    async (title: string, extra: Pick<TaskItem, 'courseId' | 'dueDate' | 'note' | 'addedBy' | 'assessment'> = {}) => {
      const task: TaskItem = {
        id: uid('task'),
        title: title.trim().slice(0, 160),
        done: false,
        createdAt: new Date().toISOString(),
        ...(extra.courseId ? { courseId: extra.courseId } : {}),
        ...(extra.dueDate ? { dueDate: extra.dueDate } : {}),
        ...(extra.note?.trim() ? { note: extra.note.trim().slice(0, 300) } : {}),
        ...(extra.assessment ? { assessment: extra.assessment } : {}),
        ...(extra.addedBy ? { addedBy: extra.addedBy } : {}),
      };
      await persist({ ...state, tasks: [task, ...state.tasks] });
    },
    [persist, state]
  );

  const updateTask = useCallback(
    async (id: string, patch: Partial<Pick<TaskItem, 'title' | 'courseId' | 'dueDate' | 'note'>>) => {
      await persist({ ...state, tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
    },
    [persist, state]
  );

  const toggleTask = useCallback(
    async (id: string) => {
      // doneAt lets the parent report say when the work was finished.
      const tasks = state.tasks.map((t) => {
        if (t.id !== id) return t;
        if (t.done) { const { doneAt: _doneAt, ...rest } = t; return { ...rest, done: false }; }
        return { ...t, done: true, doneAt: new Date().toISOString() };
      });
      const allDone = tasks.length > 0 && tasks.every((t) => t.done);
      await persist({
        ...state,
        tasks,
        focusActive: allDone ? false : state.focusActive,
      });
    },
    [persist, state]
  );

  const submitAssessment = useCallback(async (id: string, answers: number[]) => {
    const task = state.tasks.find(t => t.id === id);
    if (!task?.assessment || answers.length !== task.assessment.questions.length || task.assessment.questions.some((q, i) => !Number.isInteger(answers[i]) || answers[i] < 0 || answers[i] >= q.options.length)) throw new Error('Responde todas las preguntas antes de terminar.');
    const submittedAt = new Date().toISOString();
    const result = { answers, right: task.assessment.questions.filter((q, i) => q.answer === answers[i]).length, total: answers.length, submittedAt };
    const tasks = state.tasks.map(t => t.id === id ? { ...t, assessmentResult: result, done: true, doneAt: submittedAt } : t);
    await persist({ ...state, tasks, focusActive: tasks.every(t => t.done) ? false : state.focusActive });
  }, [persist, state]);

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
      return course.id;
    },
    [persist, state]
  );

  const updateCourse = useCallback(
    async (id: string, patch: Partial<Omit<CourseItem, 'id'>>) => {
      await persist({ ...state, courses: state.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
    },
    [persist, state]
  );

  const removeCourse = useCallback(
    async (id: string) => {
      await persist({ ...state, courses: state.courses.filter((c) => c.id !== id) });
    },
    [persist, state]
  );

  const setCourseTopics = useCallback(
    async (id: string, topics: CourseTopic[]) => {
      await persist({ ...state, courses: state.courses.map((c) => (c.id === id ? { ...c, topics } : c)) });
    },
    [persist, state]
  );

  const finishTopic = useCallback(
    async (courseId: string, topicId: string, score: { right: number; total: number }, stars: number) => {
      const courses = state.courses.map((c) => (c.id === courseId ? { ...c, topics: completeTopic(c.topics ?? [], topicId, score) } : c));
      const child = state.child && stars > 0 ? { ...state.child, stars: state.child.stars + stars } : state.child;
      await persist({ ...state, courses, child });
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
    authOperation.current = true;
    try {
      if (supabase && currentUser.current) {
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error('Cierra la sesión antes de abrir la demo.');
      }
      generation.current++; currentUser.current = null; loadedCloud.current = false; pending.current = null;
      chooseMode('demo'); setSyncStatus('idle'); setSyncError('');
    } finally { authOperation.current = false; }
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
        pinHash,
      },
      child: {
        id: uid('child'),
        name: 'Luna',
        age: 8, // demo: cambia la edad en Panel padres (4–16)
        stars: 3,
        companion: 'bear',
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
  }, [persist, chooseMode]);

  const allTasksDone = state.tasks.length > 0 && state.tasks.every((t) => t.done);
  const worldsUnlocked = !state.focusActive || allTasksDone || state.tasks.length === 0;

  const api = useMemo<StoreApi>(
    () => ({
      ready,
      state,
      accountMode, syncStatus, syncError, retrySync, refreshFamily,
      registerParent,
      loginParent,
      logout, deleteAccount,
      setPin,
      checkPin,
      setChild, switchChild, addChild,
      updateChildAge,
      updateLearningProfile,
      addTask, updateTask,
      toggleTask, submitAssessment,
      removeTask,
      setFocus,
      addStars,
      addCourse,
      updateCourse,
      removeCourse, setCourseTopics, finishTopic,
      addAgenda,
      removeAgenda,
      loadDemo,
      allTasksDone,
      worldsUnlocked,
    }),
    [
      ready,
      state,
      accountMode, syncStatus, syncError, retrySync, refreshFamily,
      registerParent,
      loginParent,
      logout, deleteAccount,
      setPin,
      checkPin,
      setChild, switchChild, addChild,
      updateChildAge,
      updateLearningProfile,
      addTask, updateTask,
      toggleTask, submitAssessment,
      removeTask,
      setFocus,
      addStars,
      addCourse,
      updateCourse,
      removeCourse, setCourseTopics, finishTopic,
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
