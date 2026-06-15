# Frontend Flow

End-to-end runtime flow of `collabsphere-ui`. Pair with `.docs/brain/frontend-map.md` and the diagram `.docs/architecture/frontend-architecture.drawio`.

## 1. Boot
1. `index.html` runs an inline script that sets `data-theme` on `<html>` from `localStorage` (prevents theme FOUC).
2. `main.jsx` mounts React with providers: `AuthProvider`, `ThemeProvider`, `BrowserRouter`.
3. `App.jsx` renders the route table.

## 2. Authentication gate
- `ProtectedRoute` checks `useAuth().isAuthenticated` (token present). If not → redirect `/login`.
- `GuestRoute` does the inverse (authenticated users skip `/login`).

## 3. Sign-in / sign-up (`AuthPage`)
1. User submits the unified auth form (signup expands extra fields).
2. Signup: client-side password validation → `POST /api/v1/users/signup` → on success switch to login mode.
3. Login: `POST /api/v1/users/login` → response yields a JWT → `AuthContext.signIn(token, email)` stores session (localStorage via `utils/session.js`) and decodes the user from the JWT.
4. Router redirects to `/feed`.

## 4. Authenticated shell
- `AppShell` renders `Sidebar` (left nav + your spheres), `TopBar` (brand + search trigger + theme + notifications), the routed page via `<Outlet/>`, and the `CommandPalette`.
- `TopBar` search dispatches `cs:open-palette`; `CommandPalette` (⌘K) provides jump-to-nav and live people/sphere search (calls connections + spheres APIs).

## 5. Page data flow (example: Feed)
1. `FeedPage` mounts → calls `getFeed(token)` (posts-service) and `getMyConnections(token)` (connections-service) through `api/client.js`.
2. `client.request()` prefixes `/api/v1`, adds `Authorization: Bearer <token>`, aborts after 12s, returns parsed JSON or throws `{status, message}`.
3. Posts render via `parsePostContent` (splits text/media) + `renderPostHtml` (sanitized HTML / legacy BBCode).
4. Compose: `RichTextEditor` emits sanitized HTML → `publishPost` appends any media token → `createPost` → optimistic prepend to the list → `resetComposer`.
5. Like/save/comment update local state; like/comment hit posts-service; **save** is client-only (`utils/saved.js`, localStorage).

## 6. API call flow (every request)
```
component/page → api/<area>.js → api/client.request(path,{token})
   → fetch(`${VITE_API_BASE_URL||"/api/v1"}${path}`, {headers: Bearer, signal: 12s abort})
   → API Gateway (:8007) → AuthenticationFilter (if protected) → target service
   ← JSON (or normalized error {status,message})
```

## 7. Error / loading / empty states
- Loading → `Skeleton*` / `Spinner`.
- Error → inline `notice notice--error`; `err.status === 401` → `signOut()` (back to login).
- Empty → `EmptyState` with one CTA.
- Transient success → `Toast`.

## 8. Theme & persistence
- `ThemeContext.toggle()` flips `data-theme`, persisted (`cs-theme`). All colors resolve from CSS tokens, so both themes work without component changes.

## 9. Data ownership (frontend)
- Server-owned: posts, connections, spheres, messages, notifications, profile/stats.
- Client-owned (localStorage): theme, session token, **saved posts**, onboarding-seen flag.

## 10. Current gaps
- No global data cache (each page refetches); no retry/stale-while-revalidate.
- Response shapes are untyped (silent breakage risk).
- Saved posts are device-local only (no backend).
- Whole feed re-renders on composer keystrokes (rows not memoized).

## 11. Recommended future flow
- Introduce a query/cache layer (e.g. TanStack Query) to standardize loading/error/retry and reduce refetching.
- Add TypeScript + generated/validated response types.
- Move saved posts + media to backend (uploads + URLs).
- Memoize feed rows; consider route-level code-splitting.
