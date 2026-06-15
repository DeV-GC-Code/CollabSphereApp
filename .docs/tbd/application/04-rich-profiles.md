# App Feature 04 — Rich Profiles (skills, endorsements, activity)

> Candidate **application** feature. UI-first. For audit, not yet approved.

## Status
Visual/client-composed v1 shipped on 2026-06-14:
- `ProfilePage.jsx` now has a LinkedIn-style identity hero, headline, verified metadata, editable local skill chips with endorsement-style counts, a composed activity timeline, and profile shortcut panels.
- No backend contract or database changes were made. Skills remain local to the browser; endorsement counts are presentational; activity is composed from existing posts/spheres/connections reads.
- Remaining roadmap work starts at the backend-backed profile/skills/endorsement APIs below.

## Title
Turn the thin profile into a credible identity: skills/tags, peer endorsements, and an activity timeline.

## Business / product purpose
The profile is the portfolio surface for the audience (recruiters/engineers). Today it shows name/email/stats and little else. Skills + endorsements + a real activity timeline make profiles worth visiting and sharing — and give the connections graph more meaning.

## Why it fits
user-service owns profiles; posts/spheres/connections already produce activity. This composes existing data + a small skills/endorsements store into a far richer page.

## How the UI looks (lead)

**Profile page (redesigned body, under the existing hero):**
```
┌─ Ada Lovelace · Staff Engineer @ Acme ───────────────────────┐
│ [Edit profile]  [Message]            19 conns · 1 post · 6 sph│
├──────────────────────────────────────────────────────────────┤
│ About                                                         │
│  Distributed systems & developer experience. Rust, Go, k8s.   │
│                                                               │
│ Skills                                                        │
│  [ Go · 4 ✓ ] [ Kubernetes · 7 ✓ ] [ Rust · 2 ✓ ] [ + Add ]   │
│   ↑ endorsement count; click to endorse (if connected)        │
│                                                               │
│ Activity                                                      │
│  ● posted "pprof tips" in #golang            · 2d             │
│  ● joined #design-systems                    · 5d             │
│  ● connected with Priya N.                   · 1w             │
│  [ Show more ]                                                │
└──────────────────────────────────────────────────────────────┘
```
- **Skills** = chips with endorsement counts. A connected viewer can endorse (✓). Owner can add/remove skills.
- **Activity timeline** = unified, reverse-chronological feed of the person's public actions (posts, sphere joins, new connections).
- Own profile shows edit affordances; others' profiles show Connect/Message + endorse.

### Components (frontend)
- Current v1 uses the existing `ProfilePage.jsx` plus CSS classes in the final `DESIGN v3 -- PROFILE` block.
- Future backend-backed components may split into `ProfileAbout`, `SkillChips` + `SkillChip` (endorsable), `ActivityTimeline` + `ActivityItem`, `EndorseButton`.
- States: own vs others' view, connected vs not (gates endorsing/messaging), loading skeletons, empty ("no activity yet").
- `api/users.js` (new) for profile/skills/endorse; activity aggregated from posts/connections/spheres.

## Backend design
- **user-service** owns profile + skills + endorsements:
  - Extend profile: `headline`, `about`, `skills[]`.
  - Endorsements: `(endorserId, userId, skill)` — unique per (endorser, user, skill); only connected users may endorse.
- **Activity timeline:** v1 aggregates per-source reads (posts by user, sphere joins, connections) client-side or via a thin aggregator. v2: a dedicated read-model fed by Kafka events (`POST_CREATED`, `SPHERE_JOINED`, `CONNECTION_MADE`) — a proper CQRS projection (great learning surface).

## Required APIs
- `GET /users/{id}/profile` → profile + skills + endorsement counts (no email to non-owners — SEC-1).
- `PUT /users/me/profile` (about/headline/skills).
- `POST /users/{id}/skills/{skill}/endorse` · `DELETE …/endorse` (connected-only).
- `GET /users/{id}/activity?cursor=` → merged timeline (or per-source + client merge in v1).

## DB / persistence changes
- user-service Postgres: add profile columns (`headline`, `about`), `user_skills(user_id, skill)`, `endorsements(endorser_id, user_id, skill, created_at)` (unique). Migration (Flyway/Liquibase — also helps fix ARC-6).
- v2 activity: a `profile_activity` read-model table fed by Kafka.

## Service-to-service communication
- v1: read-only fan-out to posts/connections/spheres for activity (or client merges). v2: consume Kafka events into a projection (async, decoupled — preferred per guardrails).

## Security
- Auth required. Endorse only if the endorser is **connected** to the target (enforce server-side). Owner-only profile edits. **Email visible only to the owner** (directly addresses SEC-1). Validate/limit skill strings (no XSS via skill names — sanitize).

## Observability
- Metrics: profile views, endorse rate, edit rate, activity-feed latency. Trace cross-service activity aggregation.

## Failure scenarios
- One activity source down → show partial timeline, label the gap, don't fail the page.
- Endorsement spam → unique constraint + rate limit + connected-only.
- Large activity history → cursor pagination.

## DevOps / testing impact
- New migrations; potential read-model + consumer (v2). Tests: endorse authorization (connected-only), uniqueness, owner-only edits, no-email-to-others, timeline merge ordering.

## Suggested phases
1. ✅ Visual/client-composed profile v1: identity hero, local skills, presentational counts, activity timeline from existing reads.
2. Profile fields (about/headline/skills) + edit backed by user-service.
3. Endorsements (connected-only) + counts.
4. Activity timeline API or aggregation endpoint.
5. CQRS activity read-model via Kafka (v2).

## Risks
- Activity aggregation cost/consistency (v2 projection is the clean answer but more work).
- Endorsement gaming (limits + connected-only).
- Scope creep toward a full LinkedIn profile — keep it focused.

## Open questions for audit
- Activity: client-merge (v1) or Kafka read-model (v2) first?
- Are skills free-text or from a controlled vocabulary?
- Should endorsements require connection, or be open?
