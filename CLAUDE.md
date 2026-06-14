# CLAUDE.md — entry pointer (not documentation)

This file exists only so AI tools auto-discover the knowledge base. **All real documentation lives under `docs/`.**

## Start here
1. `docs/brain/ai-navigation.md` — how to approach this repo safely (read first).
2. `docs/brain/project-map.md` — repository structure.
3. `docs/frontend.md` / `docs/backend.md` — architecture (backend.md is authoritative for stack/DB facts).
4. `docs/guardrails/` — hard rules before changing anything.
5. `docs/journal.md` — operational memory; **append an entry for every meaningful change.**

## Non-negotiables
- Keep all documentation under `docs/`. Do not scatter `.md` files at the repo root.
- Verify ports/DBs/routes from code or `docs/backend.md`, never from `DESIGN.md` (its DB table is stale).
- Any new service/route/event/datastore/major change → update `docs/architecture/*.drawio` + `hld.md`/`lld.md` + add an ADR (`docs/brain/architecture-decisions.md`) + a journal entry.
