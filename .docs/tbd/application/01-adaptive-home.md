# App Feature 01 — Adaptive Home (cold-start cockpit)

> Candidate **application** feature. UI-first. For audit, not yet approved.

## Title
A state-aware Home that replaces the empty feed with a guided "get started" cockpit for new accounts, and a warm digest for established ones.

## Business / product purpose
The worst moment in the product today is a brand-new account landing on an **empty feed** (no connections, no spheres → nothing to show). This feature converts dead first sessions into engaged ones and makes the "graph is the product" idea real (see `.docs/design/REDESIGN.md`).

## Why it fits
The connections graph + spheres already exist; Home just needs to *adapt* to account maturity and route the user into the actions that populate their feed.

## How the UI looks (lead)

**State A — New account (0 connections, 0 spheres): "Get Started" cockpit**
```
┌───────────────────────────────────────────────────────────────┐
│  Welcome to CollabSphere, Ada 👋                                │
│  Let's get your space set up — 3 quick steps.                   │
│                                                                 │
│  ┌─ Setup progress ───────────────────────────  1 / 3 ───────┐ │
│  │ ✅  Create your profile                                    │ │
│  │ ⭕  Find people you know            [ Find people → ]      │ │
│  │ ⭕  Join 2 Spheres                  [ Browse Spheres → ]   │ │
│  │ ⭕  Make your first post            [ Write a post → ]     │ │
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Suggested people            Suggested Spheres                  │
│  ┌────────┐ ┌────────┐       ┌──────────┐ ┌──────────┐          │
│  │ ◯ Lee  │ │ ◯ Priya│       │ #golang  │ │ #design  │          │
│  │ Connect│ │ Connect│       │  Join    │ │  Join    │          │
│  └────────┘ └────────┘       └──────────┘ └──────────┘          │
└───────────────────────────────────────────────────────────────┘
```

**State B — Warming up (thin graph/feed):** blended view — a slim progress nudge + suggested people + active Spheres + whatever posts exist. Never a blank column.

**State C — Established:** the real feed (current FeedPage), with the right rail showing *actionable* signals (pending requests, Spheres with new activity) instead of vanity metrics.

### Components (frontend)
- `HomeCockpit` (decides A/B/C from counts), `SetupChecklist` + `ChecklistItem` (with live progress + CTA), `SuggestionRow` (reuses Person/Sphere cards), and the existing `FeedPage` for State C.
- States: loading (skeletons), empty-but-guided (A), partial (B), full (C). Progress persists per user.
- Reduced-motion friendly; one primary CTA per row; keyboard reachable.

## Backend design
- Mostly composition of existing services. Add a lightweight **onboarding progress** read:
  - Derive progress from existing data: profile complete (user-service), `connectionsCount` (connections), `joinedSpheres` (spheres), `postCount` (posts). No new store needed for v1; the UI aggregates.
  - Optional `onboarding-state` persisted per user (user-service) to remember dismissals.

## Required APIs
- Reuse: `GET /users/stats`, `GET /connections/core/...` (count), `GET /spheres/core` (joined), `GET /posts/core` (count).
- Optional new: `GET/PUT /users/onboarding` `{ steps: {...}, dismissed: bool }`.

## DB / persistence changes
- Optional `onboarding` JSON column on the user row (or a small table). None required for a derived-only v1.

## Service-to-service communication
- None new (the UI composes existing reads). Suggestions feed from `application/02`.

## Security
- All reads authenticated (Home is a protected route). No new PII surfaced. Honor SEC-1 fix (don't expose other users' emails in suggestion cards).

## Observability
- Track funnel events (step viewed/completed) for activation analytics (pairs with `devops/01`).

## Failure scenarios
- A count endpoint fails → degrade that row to a neutral state, don't block the page.
- Brand-new user with zero suggestions → show "explore Spheres" fallback.

## DevOps / testing impact
- Minimal infra. Tests: state-machine unit tests (A/B/C selection by counts); empty-state rendering.

## Suggested phases
1. State A/B/C selector + derived progress (no new backend).
2. Wire suggestion rows (people + spheres).
3. Persist dismissals (optional onboarding state).
4. Replace the vanity right-rail with actionable signals.

## Risks
- Over-gamifying onboarding; keep it to 3 steps.
- Suggestion quality depends on `application/02`.

## Open questions for audit
- Persist onboarding state server-side, or derive-only?
- Should State C fully replace today's FeedPage or wrap it?
- How many suggestions before it feels noisy (2–4)?
