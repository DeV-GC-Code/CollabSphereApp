# CLAUDE.md — entry pointer (not documentation)

This file exists only so AI tools auto-discover the knowledge base. **All real documentation lives under `.docs/`** (hidden folder). Do not write to a top-level `docs/`.

## Start here
1. `.docs/brain/ai-navigation.md` — how to approach this repo safely (read first).
2. `.docs/brain/project-map.md` — repository structure.
3. `.docs/frontend.md` / `.docs/backend.md` — architecture (backend.md is authoritative for stack/DB facts).
4. `.docs/design/UI-ENRICHMENT.md` — current visual direction (DESIGN v3); `.docs/design/DESIGN.md` for tokens.
5. `.docs/flaws.md` + `.docs/security/hardening.md` — flaw register + security/resilience change log.
6. `.docs/guardrails/` — hard rules before changing anything.
7. `.docs/journal.md` — operational memory + the **Standing Practice** (update docs on every change).

## Non-negotiables
- Keep all documentation under `.docs/`. Do not scatter `.md` files at the repo root or in a top-level `docs/`.
- Verify ports/DBs/routes from code or `.docs/backend.md`, never from `DESIGN.md` (its DB table is stale).
- After every meaningful change: add a `.docs/journal.md` entry + update the touched doc(s) (Standing Practice). New service/route/event/datastore → also update `.docs/architecture/*.drawio` + `hld.md`/`lld.md` + add an ADR (`.docs/brain/architecture-decisions.md`).
