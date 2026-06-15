# UI Enrichment — "Notion × LinkedIn × Reddit" (DESIGN v3)

> Direction: keep the calm **Notion** base (warm paper, charcoal ink, one blue), add **LinkedIn** structure + card depth, and **Reddit** engagement affordances. Goal: beautiful, legible, fast. Grounded in the repo UI/UX skills (`.claude/skills/ui-ux-pro-max`, `impeccable`) + best practices (≥4.5:1 contrast, ≥44px targets, focus rings, reduced-motion, 65–75ch measure, semantic z-index, cards only where they're the best affordance).

## Status
- ✅ **Foundation + Feed (flagship)** — `DESIGN v3` layer in `collabsphere-ui/src/styles/app.css` (last in cascade; additive).
- ✅ **Spheres (Reddit pass)** — Hot/New/Top sort tabs, Reddit-style vote rail (up/score/down, ember-up / blue-down), compact thread rows with hover lift, refined discover cards. Small JSX added to `pages/SpheresPage.jsx` (client-side sort memo + sort tabs); CSS in the "SPHERES (Reddit pass)" block.
- ✅ **Profile (LinkedIn identity pass)** — identity hero, headline, verified metadata chips, skills with endorsement-style counts, activity timeline, and right-side identity/action panels. Small JSX rewrite in `pages/ProfilePage.jsx`; CSS in the "PROFILE (LinkedIn identity surface)" block.
- ⏳ **Remaining surfaces** — Messages, Network, Notifications, Auth (roadmap below).

## What changed (foundation — affects every surface)
1. **Canvas depth.** Page background is now a soft warm paper (`--canvas`); cards are white with subtle elevation that lifts on hover. This single change gives the whole app LinkedIn/Reddit "card on a page" depth instead of flat panels-on-white.
2. **Card system.** All cards: white surface, 12px radius, soft 2-layer shadow, hover lift (`translateY(-1px)` + stronger shadow + border). Comments are flat wells (nested cards are an anti-pattern).
3. **Typography polish.** Larger, tighter page titles; `text-wrap: balance` on headings, `pretty` on prose; body measure capped ~68ch for readability.
4. **Motion + a11y.** Calm transitions; full `prefers-reduced-motion` opt-out; 44px touch targets; focus rings preserved.

## What changed (Feed — flagship)
- **Post card:** clearer author row, readable measure, rounded bordered media.
- **Engagement bar:** LinkedIn-style full-width action row (Like / Comment / Save) on a hairline divider; ghost pills with hover fill; **Reddit-style state colors** — liked = ember, saved = blue.
- **Composer:** elevated, inviting; attach buttons are soft rounded pills; the WYSIWYG editor gets more breathing room.
- **Right rail:** refined card headers; metric tiles are calm bordered wells (not loud).
- **Sidebar nav:** LinkedIn-style active item — accent-tinted pill + a 3px accent edge marker.

## What changed (Profile — LinkedIn identity pass)
- **Hero:** replaced the previous profile-strength/bento-first page with an identity-first hero: avatar, name, headline, verified member metadata, focus skills, and three compact stats.
- **Skills:** local skill chips now read like endorsements (`skill + count`) and stay editable without a backend schema change.
- **Activity:** the page composes existing posts, joined Spheres, and connection count into a reverse-chronological activity timeline.
- **Rail fixes:** the profile footer control is now a button-driven navigation action (no browser status-address hover for Profile), section-level collapse controls were removed, collapsed rail width now updates the app grid so icons remain visible instead of leaving a blank gutter, and the mobile shell is forced back to one column below the rail breakpoint.

## Per-surface roadmap (next installments)
| Surface | Notion | LinkedIn | Reddit | Planned work |
|---|---|---|---|---|
| **Profile** | **clean sections** | **hero + headline + skills + activity timeline** | — | ✅ shipped visual/client-composed v1; backend profile/endorsement APIs remain future work |
| **Spheres** | room cards | community headers | **vote arrows + score, sort tabs, thread rows** | strongest Reddit pass: upvote/downvote affordance, hot/new/top, compact thread list |
| **Messages** | calm | conversation list + presence | — | 2-pane polish, message bubbles, presence dots, read receipts UI |
| **Network** | — | **connection cards + "People you may know"** | — | suggestion cards w/ reason chips (ties to `tbd/application/02`) |
| **Notifications** | grouped list | actor + action + context | — | grouped, scannable, unread emphasis |
| **Auth** | done (single flow) | — | — | minor depth pass to match v3 |

## Constraints honored
- No backend/contract changes (visual only). Likes stay likes (Reddit *style*, not new voting on the feed — real votes already exist in Spheres).
- Additive layer → low regression risk; the calm Notion base is preserved, just enriched.
- Verified: CSS brace-balanced, 0 undefined variables, 0 neon/banned colors, all 28 pages/components parse.

## Verify locally
`cd collabsphere-ui && npm run build` for compile sanity, then `npm run dev` → hard-refresh. Check: feed cards lift on hover; Profile shows hero/headline/skills/activity; collapsed rail keeps icons visible; mobile has no horizontal overflow; light + dark both legible.
