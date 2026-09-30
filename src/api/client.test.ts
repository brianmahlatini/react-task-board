import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from './client';
import { fakeFetch } from '../test/fakeApi';

describe('api client', () => {
  it('sends the bearer token and JSON body', async () => {
    const { impl, calls } = fakeFetch(() => ({ status: 201, body: { data: { id: 5 } } }));
    const api = createApiClient({ baseUrl: 'http://api.test', getToken: () => 'tok', fetchImpl: impl });
    await api.createTask({ title: 'x' });
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/api/tasks', body: { title: 'x' } });
    expect(calls[0]!.headers.authorization).toBe('Bearer tok');
  });

  it('turns problem+json into ApiError with field errors', async () => {
    const { impl } = fakeFetch(() => ({ status: 422, body: { title: 'Validation failed', detail: 'One or more fields are invalid.', errors: { title: ['is required'] } } }));
    const api = createApiClient({ baseUrl: 'http://api.test', getToken: () => null, fetchImpl: impl });
    const err = await api.createTask({ title: '' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(422);
    expect((err as ApiError).fieldErrors).toEqual({ title: ['is required'] });
  });

  it('calls onUnauthorized on 401 so the session can be cleared', async () => {
    const onUnauthorized = vi.fn();
    const { impl } = fakeFetch(() => ({ status: 401, body: { title: 'Unauthorized' } }));
    const api = createApiClient({ baseUrl: 'http://api.test', getToken: () => 'expired', fetchImpl: impl, onUnauthorized });
    await expect(api.listTasks()).rejects.toThrow();
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('reports network failures as a friendly ApiError', async () => {
    const api = createApiClient({ baseUrl: 'http://api.test', getToken: () => null, fetchImpl: (() => Promise.reject(new TypeError('fail'))) as unknown as typeof fetch });
    await expect(api.listTasks()).rejects.toMatchObject({ status: 0, message: expect.stringContaining('Could not reach') });
  });

  it('builds list query strings', async () => {
    const { impl, calls } = fakeFetch(() => ({ status: 200, body: { data: [], meta: {} } }));
    const api = createApiClient({ baseUrl: 'http://api.test', getToken: () => null, fetchImpl: impl });
    await api.listTasks({ status: 'done', q: 'milk & eggs', page: 2 });
    expect(calls[0]!.path).toBe('/api/tasks?status=done&q=milk+%26+eggs&page=2&per_page=50');
  });
});
