# Repository Guidelines

## Project Structure & Module Organization
- Microservices (`api-gateway/`, `user-service/`, `posts-service/`, `connections-service/`, `notification-service/`) keep Java sources under `src/main/java/com/gc/CollabSphereApp/...` with DTO/entity/controller/repository folders.
- Tests mirror the production packages in `src/test/java`, while Avro contracts reside in `src/main/resources/avro` and drive the Avro Maven plugin.
- Start `discovery-server/` (Eureka) before the gateway or downstream services so registry lookups succeed.
- Use the root `docker-compose.yml` to spin up Kafka, Schema Registry, Connect, and Control Center whenever you touch event flows.

## Build, Test & Development Commands
- `cd <service> && ./mvnw spring-boot:run`: launches a single Spring Boot service with dev-friendly reloads.
- `cd <service> && ./mvnw clean test` or `package`: compiles, runs JUnit 5 suites, regenerates Avro stubs, and writes jars to `target/`.
- `docker compose up broker schema-registry [-d]`: provides the Kafka stack required by producers and consumers.

## Coding Style & Naming Conventions
- Target Java 21 / Spring Boot 3.5, four-space indentation, and constructor injection; keep methods focused.
- Use `UpperCamelCase` for types and `lowerCamelCase` for members; suffix DTOs, events, and entities explicitly (`UserCreatedEvent`, `PostDto`).
- Place controllers under `controller/`, configs under `config/`, auth helpers under `auth/`, and reuse the shared `GlobalExceptionHandler`; Lombok is welcome, but write explicit builders when validation matters.

## Testing Guidelines
- Name suites `*Tests` so Spring Boot discovers them automatically and keep fixtures beside the code they exercise.
- Slice tests with mocked Kafka clients via `@TestConfiguration`; call out broker or database dependencies when running full integrations.
- Run `./mvnw clean test` before every push—the Avro plugin fails fast whenever schemas or generated sources drift.

## Commit & Pull Request Guidelines
- Existing history uses short imperative summaries (“Initial commit”); continue that voice (“Add post like aggregation”) and wrap lines at 72 chars.
- Prefix commits with a module tag when useful (`posts: enforce like limit`) and list notable changes or breaking contracts in the body.
- PRs need a scope summary, test evidence, linked issues, and screenshots or payload samples whenever APIs change; mention config or migration impacts.

## Configuration & Security Tips
- Keep secrets (JWT keys, DB creds) out of committed `application.yml`; load them via env vars or Spring Cloud Config overlays.
- Update runtime and test `application.yml` files together when Kafka, Schema Registry, or Eureka hosts change.
- Store developer overrides in ignored `application-local.yml` files and avoid committing certificates or `.env` artifacts.
