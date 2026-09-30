import type { NewTask, Page, Task, TaskStatus, User } from './types';

/** Error carrying the API's RFC 7807 problem details. */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string[]>;

  constructor(status: number, title: string, detail?: string, fieldErrors: Record<string, string[]> = {}) {
    super(detail || title);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export interface ClientOptions {
  baseUrl: string;
  getToken: () => string | null;
  onUnauthorized?: () => void;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export function createApiClient(opts: ClientOptions) {
  const doFetch = opts.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const timeoutMs = opts.timeoutMs ?? 10_000;

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { accept: 'application/json' };
    const token = opts.getToken();
    if (token) headers.authorization = `Bearer ${token}`;
    if (body !== undefined) headers['content-type'] = 'application/json';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await doFetch(`${opts.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e) {
      throw new ApiError(0, 'Network error', e instanceof DOMException && e.name === 'AbortError'
        ? 'The server took too long to respond.'
        : 'Could not reach the server. Check your connection.');
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 204) return undefined as T;
    const payload: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      const p = payload as { title?: string; detail?: string; errors?: Record<string, string[]> };
      if (res.status === 401) opts.onUnauthorized?.();
      throw new ApiError(res.status, p.title ?? res.statusText, p.detail, p.errors ?? {});
    }
    return payload as T;
  }

  return {
    login: (email: string, password: string) =>
      request<{ user: User; token: string }>('POST', '/api/auth/login', { email, password }),
    register: (name: string, email: string, password: string) =>
      request<{ user: User; token: string }>('POST', '/api/auth/register', { name, email, password }),
    listTasks: (params: { status?: TaskStatus; q?: string; page?: number; perPage?: number } = {}) => {
      const qs = new URLSearchParams();
      if (params.status) qs.set('status', params.status);
      if (params.q) qs.set('q', params.q);
      qs.set('page', String(params.page ?? 1));
      qs.set('per_page', String(params.perPage ?? 50));
      return request<Page<Task>>('GET', `/api/tasks?${qs.toString()}`);
    },
    createTask: (task: NewTask) => request<{ data: Task }>('POST', '/api/tasks', task),
    updateTask: (id: number, patch: Partial<NewTask>) => request<{ data: Task }>('PATCH', `/api/tasks/${id}`, patch),
    deleteTask: (id: number) => request<void>('DELETE', `/api/tasks/${id}`),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
