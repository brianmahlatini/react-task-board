# react-task-board

A React 19 + TypeScript task board (Kanban) for [php-rest-api](https://github.com/brianmahlatini/php-rest-api). It covers sign-in and registration, task creation, moving tasks between columns with **optimistic updates and automatic rollback**, search with debouncing, and overdue highlighting. It's built with Vite, tested with Vitest and Testing Library, and deployed to **AWS S3 + CloudFront** by GitHub Actions through OIDC.

```
$ npm run coverage
Tests  14 passed        # behaviour tests through the real UI, fetch stubbed at the network edge
```

## Structure

| Path | Responsibility |
|---|---|
| `src/api/client.ts` | Typed API client: bearer auth, timeouts via `AbortController`, RFC 7807 errors → `ApiError` with field errors, 401 → sign-out hook |
| `src/auth/AuthContext.tsx` | Session state and the single API client instance |
| `src/tasks/useTasks.ts` | `useReducer` state machine: load, create, optimistic move/delete with snapshot rollback, debounced search |
| `src/components/` | `AuthForm`, `NewTaskForm`, `TaskBoard` |

## Design decisions and trade-offs

- **Optimistic UI, honest failure.** Moves and deletes render instantly. If the API rejects one, the previous snapshot is restored and the server's message is shown, so the UI never silently diverges from the database.
- **Errors carry meaning.** The API returns RFC 7807 problem details. The client keeps `status`, `detail` and per-field `errors`, so forms can highlight the exact invalid field.
- **Expired sessions recover themselves.** Any 401 clears the session and returns to sign-in, instead of leaving a board that silently fails.
- **Accessible by default.** Columns are labelled regions, moves use buttons with descriptive labels rather than drag-only interaction, and errors use `role="alert"`. The tests query by role and label, the same way assistive technology does.
- **Token storage is a stated trade-off.** The token is kept in memory and mirrored to `sessionStorage` (per tab, cleared on close). An httpOnly cookie is safer against XSS, and the README says so rather than pretending otherwise.
- **No state library.** React's `useReducer` + context covers this app. TanStack Query would be the next step if caching and background refetching mattered.
- **Cache-correct deploys.** Hashed assets are cached for a year as immutable. `index.html` is `no-cache` and is the only path invalidated in CloudFront, so deploys are instant and never mix old and new files.

## Run

```sh
npm ci
VITE_API_URL=http://localhost:8080 npm run dev     # with php-rest-api running via docker compose
npm run lint && npm run typecheck && npm run coverage && npm run build
```

## License

MIT
