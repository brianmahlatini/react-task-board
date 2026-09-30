import { useCallback, useEffect, useReducer } from 'react';
import { ApiError, type ApiClient } from '../api/client';
import type { NewTask, Task, TaskStatus } from '../api/types';

interface State {
  tasks: Task[];
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: 'loading' }
  | { type: 'loaded'; tasks: Task[] }
  | { type: 'failed'; error: string }
  | { type: 'upsert'; task: Task }
  | { type: 'remove'; id: number }
  | { type: 'replaceAll'; tasks: Task[] }
  | { type: 'dismiss' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loading':
      return { ...state, loading: true, error: null };
    case 'loaded':
      return { tasks: action.tasks, loading: false, error: null };
    case 'failed':
      return { ...state, loading: false, error: action.error };
    case 'upsert': {
      const exists = state.tasks.some((t) => t.id === action.task.id);
      return {
        ...state,
        tasks: exists ? state.tasks.map((t) => (t.id === action.task.id ? action.task : t)) : [action.task, ...state.tasks],
      };
    }
    case 'remove':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };
    case 'replaceAll':
      return { ...state, tasks: action.tasks };
    case 'dismiss':
      return { ...state, error: null };
  }
}

const message = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong.');

/**
 * Task state with optimistic updates: status changes and deletes render
 * immediately and are rolled back (with an error) if the API rejects them.
 */
export function useTasks(api: ApiClient, query: string) {
  const [state, dispatch] = useReducer(reducer, { tasks: [], loading: true, error: null });

  const reload = useCallback(async () => {
    dispatch({ type: 'loading' });
    try {
      const page = await api.listTasks({ q: query || undefined });
      dispatch({ type: 'loaded', tasks: page.data });
    } catch (e) {
      dispatch({ type: 'failed', error: message(e) });
    }
  }, [api, query]);

  useEffect(() => {
    // Debounce search typing; ignore results from stale queries.
    let cancelled = false;
    const t = setTimeout(() => {
      if (!cancelled) void reload();
    }, query ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [reload, query]);

  const create = useCallback(
    async (task: NewTask) => {
      const { data } = await api.createTask(task); // form shows field errors, so let them propagate
      dispatch({ type: 'upsert', task: data });
    },
    [api],
  );

  const move = useCallback(
    async (task: Task, status: TaskStatus) => {
      if (task.status === status) return;
      const snapshot = state.tasks;
      dispatch({ type: 'upsert', task: { ...task, status } });
      try {
        const { data } = await api.updateTask(task.id, { status });
        dispatch({ type: 'upsert', task: data });
      } catch (e) {
        dispatch({ type: 'replaceAll', tasks: snapshot });
        dispatch({ type: 'failed', error: message(e) });
      }
    },
    [api, state.tasks],
  );

  const remove = useCallback(
    async (task: Task) => {
      const snapshot = state.tasks;
      dispatch({ type: 'remove', id: task.id });
      try {
        await api.deleteTask(task.id);
      } catch (e) {
        dispatch({ type: 'replaceAll', tasks: snapshot });
        dispatch({ type: 'failed', error: message(e) });
      }
    },
    [api, state.tasks],
  );

  return { ...state, reload, create, move, remove, dismissError: () => dispatch({ type: 'dismiss' }) };
}
