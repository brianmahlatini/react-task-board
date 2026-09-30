import { vi } from 'vitest';
import type { Task } from '../api/types';

type Handler = (method: string, path: string, body: unknown, headers: Record<string, string>) => { status: number; body?: unknown };

/** A fetch stand-in routed by a handler function; records every call. */
export function fakeFetch(handler: Handler) {
  const calls: { method: string; path: string; body: unknown; headers: Record<string, string> }[] = [];
  const impl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const path = String(url).replace('http://api.test', '');
    const method = init?.method ?? 'GET';
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, path, body, headers });
    const res = handler(method, path, body, headers);
    return new Response(res.status === 204 ? null : JSON.stringify(res.body ?? {}), {
      status: res.status,
      headers: { 'content-type': res.status >= 400 ? 'application/problem+json' : 'application/json' },
    });
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

export const task = (over: Partial<Task> = {}): Task => ({
  id: 1, owner_id: 1, title: 'Write tests', description: '', status: 'todo', priority: 2,
  due_date: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', ...over,
});
