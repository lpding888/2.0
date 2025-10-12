// 全局状态管理（Zustand）
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 用户状态
interface UserState {
  user: any | null;
  token: string | null;
  setUser: (user: any) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'user-storage',
    }
  )
);

// 任务状态
interface Task {
  task_id: string;
  type: string;
  status: string;
  progress: number;
  message: string;
  result?: any;
}

interface TaskState {
  tasks: Map<string, Task>;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  removeTask: (taskId: string) => void;
  getTask: (taskId: string) => Task | undefined;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: new Map(),

  addTask: (task) => set((state) => {
    const newTasks = new Map(state.tasks);
    newTasks.set(task.task_id, task);
    return { tasks: newTasks };
  }),

  updateTask: (taskId, updates) => set((state) => {
    const newTasks = new Map(state.tasks);
    const existingTask = newTasks.get(taskId);
    if (existingTask) {
      newTasks.set(taskId, { ...existingTask, ...updates });
    }
    return { tasks: newTasks };
  }),

  removeTask: (taskId) => set((state) => {
    const newTasks = new Map(state.tasks);
    newTasks.delete(taskId);
    return { tasks: newTasks };
  }),

  getTask: (taskId) => {
    return get().tasks.get(taskId);
  },
}));

// 上传状态
interface UploadFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

interface UploadState {
  files: UploadFile[];
  addFiles: (files: File[]) => void;
  updateFile: (id: string, updates: Partial<UploadFile>) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  files: [],

  addFiles: (files) => set((state) => {
    const newFiles: UploadFile[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: 'pending',
    }));
    return { files: [...state.files, ...newFiles] };
  }),

  updateFile: (id, updates) => set((state) => ({
    files: state.files.map(file =>
      file.id === id ? { ...file, ...updates } : file
    ),
  })),

  removeFile: (id) => set((state) => ({
    files: state.files.filter(file => file.id !== id),
  })),

  clearFiles: () => set({ files: [] }),
}));

// 作品选择状态（用于批量操作）
interface SelectionState {
  selectedWorks: Set<string>;
  toggleSelection: (workId: string) => void;
  selectAll: (workIds: string[]) => void;
  clearSelection: () => void;
  isSelected: (workId: string) => boolean;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedWorks: new Set(),

  toggleSelection: (workId) => set((state) => {
    const newSelection = new Set(state.selectedWorks);
    if (newSelection.has(workId)) {
      newSelection.delete(workId);
    } else {
      newSelection.add(workId);
    }
    return { selectedWorks: newSelection };
  }),

  selectAll: (workIds) => set({
    selectedWorks: new Set(workIds),
  }),

  clearSelection: () => set({
    selectedWorks: new Set(),
  }),

  isSelected: (workId) => {
    return get().selectedWorks.has(workId);
  },
}));
