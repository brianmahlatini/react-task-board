import type { Task, TaskStatus } from '../api/types';

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'todo', label: 'To do' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'done', label: 'Done' },
];

interface Props {
  tasks: Task[];
  onMove: (task: Task, status: TaskStatus) => void;
  onDelete: (task: Task) => void;
}

/** Kanban columns. Moving uses buttons (keyboard and screen-reader friendly) rather than drag-only. */
export function TaskBoard({ tasks, onMove, onDelete }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="board">
      {COLUMNS.map((col, i) => {
        const items = tasks.filter((t) => t.status === col.status).sort((a, b) => a.priority - b.priority);
        return (
          <section key={col.status} className="column" aria-label={col.label}>
            <h2>{col.label} <span className="count">{items.length}</span></h2>
            {items.length === 0 && <p className="empty">Nothing here</p>}
            <ul>
              {items.map((t) => {
                const overdue = t.due_date !== null && t.due_date < today && t.status !== 'done';
                return (
                  <li key={t.id} className={`task p${t.priority}${overdue ? ' overdue' : ''}`}>
                    <span className="title">{t.title}</span>
                    <span className="meta">
                      P{t.priority}
                      {t.due_date && <> · due {t.due_date}{overdue && ' (overdue)'}</>}
                    </span>
                    <span className="actions">
                      {i > 0 && <button onClick={() => onMove(t, COLUMNS[i - 1]!.status)} aria-label={`Move "${t.title}" to ${COLUMNS[i - 1]!.label}`}>←</button>}
                      {i < COLUMNS.length - 1 && <button onClick={() => onMove(t, COLUMNS[i + 1]!.status)} aria-label={`Move "${t.title}" to ${COLUMNS[i + 1]!.label}`}>→</button>}
                      <button className="danger" onClick={() => onDelete(t)} aria-label={`Delete "${t.title}"`}>✕</button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
