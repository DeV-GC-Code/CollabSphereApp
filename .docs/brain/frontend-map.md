# Frontend Map

Navigation map for `collabsphere-ui/src`. See `.docs/frontend.md` for the deep narrative.

## Routes → pages (`App.jsx`)

| Path | Page | Guard | Backend it talks to |
|---|---|---|---|
| `/login` | `pages/AuthPage.jsx` | GuestRoute | user-service (login/signup/stats) |
| `/feed` (index) | `pages/FeedPage.jsx` | Protected | posts-service (+ connections for people) |
| `/network` | `pages/NetworkPage.jsx` | Protected | connections-service |
| `/messages` | `pages/MessagesPage.jsx` | Protected | messages-service |
| `/spheres` | `pages/SpheresPage.jsx` | Protected | spheres-service |
| `/saved` | `pages/SavedPage.jsx` | Protected | (client-only, localStorage) |
| `/profile` | `pages/ProfilePage.jsx` | Protected | posts/connections/spheres (client-composed profile stats/activity; skills local for v1) |
| `/notifications` | `pages/NotificationsPage.jsx` | Protected | notification-service |

## Layout chrome

- `components/AppShell.jsx` — wraps all protected pages: `Sidebar` + `TopBar` + `<Outlet/>` + `CommandPalette`.
- `components/Sidebar.jsx` — left rail: nav (Home/Network/Messages/Spheres/Saved), your spheres, whole-rail collapse, profile button/sign-out. Section-level collapse was removed; collapsed mode keeps icons visible and shrinks the app grid.
- `components/TopBar.jsx` — brand + search trigger (dispatches `cs:open-palette`) + theme toggle + notifications bell.
- `components/CommandPalette.jsx` — ⌘K: jump-to-nav + people/sphere search (calls connections + spheres APIs).

## Key components

| Component | Role |
|---|---|
| `RichTextEditor.jsx` | WYSIWYG composer → sanitized HTML (B/I/U/color/font). |
| `ContextRail.jsx` | Right rail on feed (network pulse, trending spheres, CTA). |
| `BrandMark.jsx` / `BrandOrb.jsx` | The orb brand mark (uses `/icon.svg`). |
| `Icons.jsx` | Single SVG icon set; all icons forward props. |
| `OnboardingModal.jsx` | First-run modal (gated by `cs_onboarding_done`). |
| `Toast/Spinner/Skeleton/EmptyState` | Feedback primitives. |
| `SphereMonogram.jsx` | Per-sphere identity tile. |

## State & data

- `auth/AuthContext.jsx` — token + decoded user; `signIn/signOut`; persisted via `utils/session.js`.
- `auth/ThemeContext.jsx` — light/dark on `<html data-theme>`, persisted (`cs-theme`).
- `api/client.js` — `request()` wrapper (base `/api/v1`, Bearer, 12s timeout, error `{status,message}`).
- `api/{auth,posts,connections,spheres,messages}.js` — endpoint bindings.
- `utils/format.js` — `initials`, `timeAgo`, `parsePostContent`, `renderPostHtml`, `sanitizeHtml`, `plainText`.
- `utils/saved.js` — saved posts in localStorage (quota-safe).

## Styling

`styles/app.css` — token-driven. Critical regions (later wins the cascade): the `:root` token block(s), `[data-theme="dark"]`, the **"LATEST OVERRIDES"**, **"AUTH"**, **"AVATAR FIX"** blocks, and the current **"DESIGN v3 — Notion × LinkedIn × Reddit"** + **"DESIGN v3 — SPHERES (Reddit pass)"** + **"DESIGN v3 — PROFILE (LinkedIn identity surface)"** blocks at the very end. The v3 blocks are the authoritative visual layer — edit there (see `.docs/design/UI-ENRICHMENT.md`). Don't stack a new conflicting override; extend the v3 layer.

## Before changing the frontend

Read: `App.jsx` → `AuthContext` → `api/client.js` + relevant `api/*` → `AppShell` → target page → `utils/format.js` (if post content) → the relevant `app.css` block. Then `.docs/guardrails/frontend-guardrails.md`.
