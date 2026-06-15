# Frontend Guardrails

Rules for `collabsphere-ui`. Tailored to this codebase. Read with `.docs/frontend.md` + `.docs/brain/frontend-map.md`.

## Files to check before any UI change
`App.jsx` (routes/guards) · `auth/AuthContext.jsx` · `api/client.js` + the relevant `api/*.js` · `components/AppShell.jsx` · the target `pages/*.jsx` · `utils/format.js` (if post content) · the relevant `styles/app.css` token/override block.

## Coding standards
- Plain JSX, function components + hooks. Default exports for pages/components as the file already does.
- Keep the **API layer in `api/*`** — components/pages call those, never `fetch` directly.
- Use `useAuth()` for token/session; never read the token from storage directly in components.
- Reuse primitives: `Toast`, `Spinner`, `Skeleton*`, `EmptyState`, `Icons`, the `Person`/avatar atom. Don't reinvent them.

## CSS rules (important — this is where regressions happen)
- All styling via **CSS custom properties** in `styles/app.css`. Use tokens (`var(--accent)`, `var(--text)`, `var(--surface)`, `--radius*`, `--outline`), never hard-coded neon hexes.
- The stylesheet has **multiple token blocks + trailing override layers** ("LATEST OVERRIDES", "AUTH", "AVATAR FIX"). **The last matching rule wins.** If a style "isn't applying", find the later override and edit it — do **not** stack yet another `!important` layer.
- No reintroducing: neon lime/persimmon, purple/violet, glassmorphism blur on cards, grid texture, gradient shimmer. The system is calm Notion-style (white/paper + charcoal + one blue).
- After CSS edits: verify `{`/`}` balance and grep for undefined `var(--…)`. **Commit before and after large CSS edits** (formatter truncation has happened).

## Routing
- Add routes in `App.jsx` under the `AppShell` (protected) or as guest routes. Keep guards (`ProtectedRoute`/`GuestRoute`) intact.
- Don't bypass the shell layout for authenticated pages.

## API integration
- Go through `request()` in `api/client.js` (base `/api/v1`, Bearer, 12s timeout, `{status,message}` errors).
- Handle `err.status === 401` by calling `signOut()`.
- Don't assume response shapes silently — guard against missing fields; there are no types yet.

## Post content / security
- Never render user content with raw `dangerouslySetInnerHTML` directly. Always go through `renderPostHtml`/`sanitizeHtml` in `utils/format.js`.
- Don't widen the sanitizer allow-list without review (XSS surface).
- Don't log full post bodies (they may contain base64 media).

## Accessibility
- Icon-only buttons need `aria-label`. Inputs need labels. Maintain visible focus rings and `prefers-reduced-motion` handling already in `app.css`.

## What NOT to do
- Don't add a state library or data-fetching lib without an ADR.
- Don't hard-code colors, ports, or API URLs.
- Don't create new top-level CSS files or inline large style objects when a token/class exists.

## Architecture-XML-update rule
A new page, route, or backend integration point in the UI → update `.docs/architecture/frontend-architecture.drawio`, `.docs/architecture/frontend-flow.md`, and add an ADR. Update `.docs/journal.md` for every meaningful change.
