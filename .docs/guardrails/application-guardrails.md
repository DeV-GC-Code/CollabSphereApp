# Application Guardrails

Hard rules for working on CollabSphere. Read before any non-trivial change. These are tailored to this repo, not generic advice.

## Purpose & intent
- CollabSphere is a **DevOps + architecture learning platform and portfolio piece**, presented as a professional community app. Optimize for **correctness, clarity, maintainability, and learning value** over raw feature speed.
- Preserve the polyglot microservices story (6 services, 4 languages, 4 datastores, Kafka). It is the point.

## Allowed changes
- Documentation under `.docs/`, additive features within an existing service's boundary, UI improvements, bug fixes, tests, observability, containerization, and resilience improvements.
- New cross-service reactions **via Kafka events** (preferred over new synchronous calls).

## Changes to avoid (without an ADR + owner sign-off)
- Adding new **synchronous** service-to-service calls (prefer events; see ADR-006).
- Changing the **gateway path contract** (StripPrefix counts, RewritePath, internal `/*/core` prefixes) — it's load-bearing and fragile.
- Changing the **JWT secret mechanism** or validation responsibilities without aligning all services.
- Merging service responsibilities or sharing databases across services (breaks boundaries).
- Scattering documentation outside `.docs/`.

## Microservice boundary rules
- Each service owns its data. No service reads another service's database directly. Cross-service data goes through that service's API or via Kafka events.
- A user/post/connection/sphere/message/notification concept is owned by exactly one service. Don't duplicate ownership.

## Before making changes (validate assumptions)
1. Read `.docs/brain/ai-navigation.md` and the relevant map + guardrail.
2. Confirm facts from **code/config**, not from DESIGN.md (its DB table is stale).
3. Run the service's build/compile (`.docs/brain/ai-navigation.md` → Validation commands).
4. For UI, run `npm run test:run`, `npm run build`, and check CSS brace balance + undefined `var(--…)`.

## Architecture-XML-update rule (mandatory)
Whenever you add or change a **service, route, integration, datastore, event, or major capability**, you MUST update:
- `.docs/architecture/backend-architecture.drawio` and/or `frontend-architecture.drawio`
- `.docs/architecture/hld.md` and/or `lld.md`
- `.docs/brain/architecture-decisions.md` (new ADR)
Stale architecture diagrams/docs are treated as a defect.

## Documentation discipline (mandatory)
- After any meaningful change, append a `.docs/journal.md` entry using its template.
- Keep all `.md`/diagrams under `.docs/`. A minimal root `CLAUDE.md` may point to `.docs/brain/ai-navigation.md` but holds no real documentation.

## AI-agent behavior
- Do not "shoot blanks": never guess ports, DBs, routes, or response shapes — look them up here or in code.
- Make the smallest correct change; don't add a 4th overriding CSS layer or a parallel duplicate doc.
- State limitations honestly (e.g., "couldn't run the build in this environment").
- Commit before/after large CSS edits (a formatter has truncated `app.css` before).

## Known landmines (carry forward)
- `styles/app.css` cascade overrides; formatter truncation risk.
- Gateway StripPrefix inconsistency.
- Java user/posts use Flyway + `ddl-auto=validate`; startup failures usually mean schema drift that needs a migration.
- HS256 shared secret remains until RS256/JWKS; keep the secret aligned across services.
- No compose/containers; no tracing/metrics; thin test coverage.
