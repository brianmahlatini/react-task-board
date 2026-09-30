import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import type { NewTask } from '../api/types';

export function NewTaskForm({ onCreate }: { onCreate: (t: NewTask) => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState(3);
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onCreate({ title: title.trim(), priority, due_date: dueDate || null });
      setTitle('');
      setDueDate('');
    } catch (err) {
      setError(err instanceof ApiError ? Object.values(err.fieldErrors).flat()[0] ?? err.message : 'Could not create task.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="new-task" onSubmit={submit} aria-label="New task">
      <input aria-label="Task title" placeholder="What needs doing?" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      <select aria-label="Priority" value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
        {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>P{p}</option>)}
      </select>
      <input aria-label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      <button type="submit" disabled={busy}>Add</button>
      {error && <p role="alert" className="error">{error}</p>}
    </form>
  );
}
