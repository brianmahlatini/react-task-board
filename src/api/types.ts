export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: number;
  owner_id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'member' | 'admin';
}

export interface PageMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

export interface NewTask {
  title: string;
  description?: string;
  priority?: number;
  due_date?: string | null;
  status?: TaskStatus;
}
