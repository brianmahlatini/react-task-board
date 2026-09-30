import { useState } from 'react';
import { AuthForm } from './components/AuthForm';
import { NewTaskForm } from './components/NewTaskForm';
import { TaskBoard } from './components/TaskBoard';
import { useAuth } from './auth/AuthContext';
import { useTasks } from './tasks/useTasks';

function Board() {
  const { api, user, logout } = useAuth();
  const [query, setQuery] = useState('');
  const { tasks, loading, error, create, move, remove, dismissError } = useTasks(api, query);

  return (
    <main className="app">
      <header>
        <h1>Task board</h1>
        <span className="who">{user?.name}</span>
        <button className="link" onClick={logout}>Sign out</button>
      </header>
      <div className="toolbar">
        <NewTaskForm onCreate={create} />
        <input type="search" aria-label="Search tasks" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {error && (
        <p role="alert" className="error banner">
          {error} <button className="link" onClick={dismissError}>Dismiss</button>
        </p>
      )}
      {loading && tasks.length === 0 ? <p aria-busy="true">Loading…</p> : <TaskBoard tasks={tasks} onMove={move} onDelete={remove} />}
    </main>
  );
}

export default function App() {
  const { user } = useAuth();
  return user ? <Board /> : <AuthForm />;
}
