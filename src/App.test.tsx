import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { fakeFetch, task } from './test/fakeApi';
import type { Task } from './api/types';

function renderApp(handler: Parameters<typeof fakeFetch>[0]) {
  const fake = fakeFetch(handler);
  render(<AuthProvider baseUrl="http://api.test" fetchImpl={fake.impl}><App /></AuthProvider>);
  return fake;
}

const user = { id: 1, email: 'ada@example.test', name: 'Ada', role: 'member' };

function signedInBackend(tasks: Task[], overrides: Partial<Record<string, { status: number; body?: unknown }>> = {}) {
  return (method: string, path: string, body: unknown) => {
    const key = `${method} ${path.split('?')[0]}`;
    if (overrides[key]) return overrides[key]!;
    if (key === 'POST /api/auth/login') return { status: 200, body: { user, token: 't' } };
    if (key === 'GET /api/tasks') return { status: 200, body: { data: tasks, meta: { page: 1, per_page: 50, total: tasks.length, total_pages: 1 } } };
    if (key === 'POST /api/tasks') return { status: 201, body: { data: task({ id: 99, ...(body as object) }) } };
    const m = /^PATCH \/api\/tasks\/(\d+)$/.exec(key);
    if (m) return { status: 200, body: { data: { ...tasks.find((t) => t.id === Number(m[1])), ...(body as object) } } };
    if (key.startsWith('DELETE')) return { status: 204 };
    return { status: 404, body: { title: 'Not Found' } };
  };
}

async function signIn() {
  await userEvent.type(screen.getByLabelText('Email'), 'ada@example.test');
  await userEvent.type(screen.getByLabelText('Password'), 'correct horse battery');
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('task board', () => {
  it('shows the API error on failed login', async () => {
    renderApp(() => ({ status: 401, body: { title: 'Unauthorized', detail: 'Invalid email or password.' } }));
    await signIn();
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
  });

  it('validates password length before calling register', async () => {
    const { calls } = renderApp(() => ({ status: 500 }));
    await userEvent.click(screen.getByRole('button', { name: /no account/i }));
    await userEvent.type(screen.getByLabelText('Email'), 'new@example.test');
    await userEvent.type(screen.getByLabelText('Password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('must be at least 12 characters')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('signs in and renders tasks in the right columns', async () => {
    renderApp(signedInBackend([task({ id: 1, title: 'Plan', status: 'todo' }), task({ id: 2, title: 'Ship', status: 'done' })]));
    await signIn();
    const todo = await screen.findByRole('region', { name: 'To do' });
    expect(within(todo).getByText('Plan')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Done' })).getByText('Ship')).toBeInTheDocument();
  });

  it('creates a task', async () => {
    const { calls } = renderApp(signedInBackend([]));
    await signIn();
    await userEvent.type(await screen.findByLabelText('Task title'), 'Buy milk');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Buy milk')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST' && c.path === '/api/tasks')?.body).toMatchObject({ title: 'Buy milk', priority: 3 });
  });

  it('moves a task optimistically', async () => {
    renderApp(signedInBackend([task({ id: 1, title: 'Plan', status: 'todo' })]));
    await signIn();
    await userEvent.click(await screen.findByRole('button', { name: 'Move "Plan" to In progress' }));
    expect(within(screen.getByRole('region', { name: 'In progress' })).getByText('Plan')).toBeInTheDocument();
  });

  it('rolls back a failed move and shows why', async () => {
    renderApp(signedInBackend([task({ id: 1, title: 'Plan', status: 'todo' })], {
      'PATCH /api/tasks/1': { status: 500, body: { title: 'Internal Server Error', detail: 'An unexpected error occurred.' } },
    }));
    await signIn();
    await userEvent.click(await screen.findByRole('button', { name: 'Move "Plan" to In progress' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'To do' })).getByText('Plan')).toBeInTheDocument());
  });

  it('flags overdue tasks', async () => {
    renderApp(signedInBackend([task({ id: 3, title: 'Taxes', due_date: '2020-01-01' })]));
    await signIn();
    expect(await screen.findByText(/overdue/)).toBeInTheDocument();
  });

  it('returns to the login form when the session expires', async () => {
    renderApp(signedInBackend([], { 'GET /api/tasks': { status: 401, body: { title: 'Unauthorized' } } }));
    await signIn();
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});

describe('deleting', () => {
  it('removes a task and restores it if the API refuses', async () => {
    renderApp(signedInBackend([task({ id: 1, title: 'Keep me' }), task({ id: 2, title: 'Drop me' })], {
      'DELETE /api/tasks/1': { status: 404, body: { title: 'Not Found', detail: 'Task not found.' } },
    }));
    await signIn();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete "Drop me"' }));
    await waitFor(() => expect(screen.queryByText('Drop me')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Delete "Keep me"' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Task not found.');
    expect(await screen.findByText('Keep me')).toBeInTheDocument();
  });
});
