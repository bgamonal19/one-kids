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

export type FamilyState = {
  parent: ParentAccount | null;
  child: ChildProfile | null;
  tasks: TaskItem[];
  focusActive: boolean;
  onboarded: boolean;
};

export type TutorMessage = {
  id: string;
  role: 'tutor' | 'child';
  text: string;
  imageUri?: string;
};
