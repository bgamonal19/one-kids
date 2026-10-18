import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { hashPin, verifyPin } from './pin';
import type { ChildProfile, FamilyState, ParentAccount, TaskItem } from './types';

const STORAGE_KEY = 'onekids.family.v1';

const emptyState: FamilyState = {
  parent: null,
  child: null,
  tasks: [],
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
  addTask: (title: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  setFocus: (active: boolean) => Promise<void>;
  addStars: (n: number) => Promise<void>;
  loadDemo: () => Promise<void>;
  allTasksDone: boolean;
  worldsUnlocked: boolean;
};

const StoreContext = createContext<StoreApi | null>(null);

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<FamilyState>(emptyState);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState({ ...emptyState, ...JSON.parse(raw) });
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
      const ok =
        state.parent.email === email.trim().toLowerCase() && state.parent.password === password;
      return ok;
    },
    [state.parent]
  );

  const logout = useCallback(async () => {
    // Keep family data; just mark session as "left child/parent UI" handled by router
    // For MVP we clear session by not changing data — screens use parent presence
    await persist(state);
  }, [persist, state]);

  const setPin = useCallback(
    async (pin: string) => {
      if (!state.parent) return;
      const pinHash = await hashPin(pin);
      await persist({
        ...state,
        parent: { ...state.parent, pinHash },
      });
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
      const child: ChildProfile = {
        id: uid('child'),
        name: name.trim(),
        age,
        stars: 0,
      };
      await persist({
        ...state,
        child,
        onboarded: true,
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

  const loadDemo = useCallback(async () => {
    const pinHash = await hashPin('1234');
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
        age: 8,
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
      addTask,
      toggleTask,
      removeTask,
      setFocus,
      addStars,
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
      addTask,
      toggleTask,
      removeTask,
      setFocus,
      addStars,
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
