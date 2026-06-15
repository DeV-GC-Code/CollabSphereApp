# Frontend Architecture — CollabSphere UI

> Source of truth for the `collabsphere-ui` React app. Derived from inspection of the actual code (June 2026). Pair with `.docs/design/DESIGN.md` (visual system) and `.docs/architecture/frontend-flow.md` (runtime flow).

## 1. Technology stack

- **React 18** + **Vite** (dev server + build). Entry: `collabsphere-ui/index.html` → `src/main.jsx` → `src/App.jsx`.
- **react-router-dom** for client-side routing (`App.jsx`).
- **State:** React Context only — `src/auth/AuthContext.jsx` (session/JWT) and `src/auth/ThemeContext.jsx` (light/dark). No Redux/Zustand. Local component state via hooks.
- **Data layer:** a thin `fetch` wrapper in `src/api/client.js` + per-domain modules (`auth.js`, `posts.js`, `connections.js`, `spheres.js`, `messages.js`). Base URL = `import.meta.env.VITE_API_BASE_URL || "/api/v1"` (defaults to the gateway via Vite proxy). 12s request timeout, `Authorization: Bearer <token>` injected when a token is passed.
- **Styling:** a single global stylesheet `src/styles/app.css` (~8k lines) driven entirely by CSS custom properties (design tokens). No CSS modules / Tailwind. Fonts: Inter (UI) + JetBrains Mono (data), via Google Fonts `@import`.
- **Testing:** Vitest is wired for focused unit tests (`npm run test:run`), currently covering sanitizer/JWT utilities.
- **No TypeScript** — plain JSX.

## 2. Purpose (frontend perspective)

The UI is the single surface that unifies six independently-built backend services into one product: a professional community with a feed, a connections graph, direct messages, community "Spheres", notifications, and profiles. It is also the project's portfolio showcase — visual craft is a deliberate goal (see `DESIGN.md`).

## 3. Folder structure (`collabsphere-ui/src`)

```
src/
  main.jsx                # React root, providers (Auth, Theme, Router)
  App.jsx                 # Route table + Protected/Guest route guards
  api/
    client.js             # fetch wrapper (base URL, auth header, timeout, error shape)
    auth.js posts.js connections.js spheres.js messages.js  # endpoint modules
  auth/
    AuthContext.jsx       # session (token + decoded user), signIn/signOut
    ThemeContext.jsx      # theme toggle, persisted in localStorage
  components/
    AppShell.jsx          # authenticated layout: Sidebar + TopBar + <Outlet/> + CommandPalette
    Sidebar.jsx           # left rail nav + your spheres + whole-rail collapse
    TopBar.jsx            # brand + search trigger (opens palette) + theme + notifications
    CommandPalette.jsx    # ⌘K jump-to / people+sphere search
    RichTextEditor.jsx    # WYSIWYG composer (B/I/U/color/font → sanitized HTML)
    ContextRail.jsx       # right rail (network pulse, trending, CTA)
    BrandMark.jsx BrandOrb.jsx Icons.jsx ThemeToggle.jsx
    OnboardingModal.jsx CreatePostModal.jsx Toast.jsx Skeleton.jsx Spinner.jsx EmptyState.jsx
    SphereMonogram.jsx
  pages/
    AuthPage.jsx FeedPage.jsx NetworkPage.jsx MessagesPage.jsx
    SpheresPage.jsx SavedPage.jsx ProfilePage.jsx NotificationsPage.jsx
  utils/
    format.js             # initials, timeAgo, parsePostContent, renderPostHtml, sanitizeHtml, plainText
    saved.js              # localStorage-backed saved posts (quota-safe)
    session.js jwt.js useCountUp.js
  styles/app.css          # all styling (token-driven)
```

## 4. Routing flow

`App.jsx` defines:
- `/login` → `AuthPage` (wrapped in `GuestRoute` — redirects to `/feed` if authenticated).
- `/` → `AppShell` (wrapped in `ProtectedRoute` — redirects to `/login` if not). Nested routes: `feed`, `network`, `notifications`, `spheres`, `saved`, `messages`, `profile`. Index redirects to `/feed`.
- `*` → redirect to `/login`.

Guards read `useAuth().isAuthenticated` (presence of a token). The `AppShell` renders the persistent chrome (rail, top bar, command palette) around the routed page via `<Outlet/>`.

## 5. State management

- **Auth:** `AuthContext` holds `{ token, user, isAuthenticated }`. `user` is decoded from the JWT (`utils/jwt.js`) including the signed `role` claim. `signIn(token, email)` persists the session; `signOut()` clears it. Session persistence lives in `utils/session.js` (**`sessionStorage`** — cleared on tab close; note it is still JS-readable, see `.docs/flaws.md` SEC-3). Theme and saved-posts use `localStorage`.
- **Theme:** `ThemeContext` toggles `data-theme` on `<html>`, persisted to `localStorage` (`cs-theme`). FOUC is prevented by an inline script in `index.html`.
- **Per-page state:** local `useState`/`useMemo`. The feed holds posts, likes, saved IDs, comments, and composer content in `FeedPage` state.
- **Saved posts:** client-only feature, persisted in `localStorage` via `utils/saved.js` (not a backend feature). Quota-safe (drops oldest on overflow).

## 6. API integration strategy

- All calls go through `api/client.js#request(path, {method, body, token})`, which prefixes `/api/v1`, sets JSON headers, injects the Bearer token, aborts after 12s, and normalizes errors (`err.status`, `err.message`).
- Endpoint modules map to gateway paths: `users/*`, `posts/*`, `connections/*`, `spheres/*`, `messages/*`, `notifications/*`. A `likes` path is rewritten by the gateway to posts-service.
- 401 handling: pages call `signOut()` on `err.status === 401` (e.g. `FeedPage.publishPost`).

## 7. Authentication handling

Login/signup hit user-service (public, no gateway auth filter). On success the JWT is stored via `AuthContext.signIn`. Every subsequent request passes the token; the gateway and downstream services validate it for protected routes. The UI never stores credentials, only the token. Admin-only UI affordances are based on `user.role === "ADMIN"` but backend authorization remains authoritative.

## 8. Content rendering (posts)

Posts support rich text. The composer (`RichTextEditor`) produces **sanitized HTML**; `utils/format.js#sanitizeHtml` enforces an allow-list (formatting tags + a few inline styles, scripts/handlers stripped). `renderPostHtml` renders new HTML posts and still renders **legacy BBCode/plain** posts, so old data keeps working. Attachments (image/video/file) are stored as a trailing `\n\n[media:{…base64…}]` token; `parsePostContent` splits text from media. This is demo-grade (base64 in the DB/localStorage) — see weaknesses.

## 9. Error / loading / empty states

- Loading: `Skeleton*` and `Spinner` components.
- Empty: `EmptyState` (icon + copy + single CTA).
- Errors: inline `notice notice--error` blocks; `Toast` for transient confirmations.
- Forms: `AuthPage` validates password client-side before submit; inline error messages.

## 10. Strengths

- Clean separation: routing, context, api layer, pages, components, utils.
- One token-driven design system; consistent "Person" atom and panel grammar (per DESIGN.md).
- Thin, predictable API layer with a single error shape and timeout.
- Command palette + keyboard model suit the engineer audience.
- Backward-compatible post renderer (HTML + legacy BBCode).
- Profile now has a visual/client-composed identity surface: hero/headline, editable local skill chips, activity timeline, and shortcut panels without new backend contracts.

## 11. Weaknesses / risks

- **Single ~8k-line `app.css`** with multiple overriding token blocks and `!important` override layers (legacy "Operator Console" remnants). Hard to reason about; specificity conflicts have caused regressions. Candidate for tokenization cleanup / CSS split.
- **An auto-formatter once truncated `app.css`** (recovered from backup). Disable format-on-save for CSS or pin a formatter; commit frequently.
- **Base64 media** in post content → large payloads in DB/state/localStorage. Won't scale; replace with real uploads + URLs.
- **`contentEditable` + `execCommand`** in the composer is pragmatic but deprecated; a future editor (Tiptap/Lexical) would be more robust.
- **Feed re-renders the whole post list** on each composer keystroke (rows not memoized). Fine now; memoize `PostCard` if the feed grows.
- **Tight coupling to backend response shapes** is implicit (no schema/types). A response-shape change silently breaks the UI. Consider TypeScript + generated types or runtime validation.
- **Very thin test coverage.** Vitest covers sanitizer/JWT utilities; no component, integration, or e2e coverage yet.

## 12. Recommended direction

1. Tokenize/clean `app.css`: collapse the duplicate `:root` token blocks, remove the legacy `!important` override layers, optionally split per-surface CSS.
2. Add TypeScript (or JSDoc + runtime guards) for API response shapes.
3. Replace base64 attachments with an upload endpoint + object storage; store URLs.
4. Expand Vitest coverage with React Testing Library for auth guards, API error handling, and high-risk pages; add e2e smoke tests later.
5. Memoize feed rows; consider data-fetching via a cache layer (TanStack Query) to standardize loading/error/retry.

## 13. Files an AI agent must read before changing the frontend

`App.jsx` (routes/guards) · `auth/AuthContext.jsx` · `api/client.js` (+ the relevant `api/*.js`) · `components/AppShell.jsx` · the target `pages/*.jsx` · `utils/format.js` (if touching post content) · `styles/app.css` token blocks (`:root`, `[data-theme="dark"]`, and the trailing "LATEST OVERRIDES"/"AVATAR FIX"/"DESIGN v3" blocks which win the cascade). See `.docs/guardrails/frontend-guardrails.md`.
