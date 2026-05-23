# CollabSphereApp — Current Project Status (detailed)

This document describes the current status of the CollabSphereApp codebase as-of the workspace snapshot. It is a factual, in-depth description of the repository layout, modules, build artifacts, runtime configuration, third-party components and integrations, generated artifacts, and other observable details. No suggestions or improvement recommendations are included — this file only documents the current state.

---

## Summary

- Project: CollabSphereApp — a microservices-based application built with Spring Boot.
- Languages / frameworks: Java (target 21), Spring Boot (projects use 3.5.14 parent), Spring Cloud (spring-cloud.version property set to 2025.0.0), Apache Kafka (Confluent tooling), Avro, Neo4j, PostgreSQL, R2DBC (for reactive DB in one service), Spring Cloud Gateway, Eureka (Discovery).
- Repository layout (top-level folders):
  - `api-gateway/`
  - `connections-service/`
  - `discovery-server/`
  - `notification-service/`
  - `posts-service/`
  - `user-service/`
- Build system: Maven (each module has a `pom.xml` and a `./mvnw` wrapper in module root).
- Docker compose: `docker-compose.yml` at repository root provisions Kafka broker, Schema Registry, Kafka Connect, Control Center (Confluent images and versions specified).
- Pre-built artifacts: each module has `target/` and most include a built `*-0.0.1-SNAPSHOT.jar` under their `target/` directory.

---

## Repository files of note

- `README.md` — short project-level README listing modules and that the project uses Docker Compose.
- `AGENTS.md` — project guidelines and conventions (package layout, build / run commands, test and commit conventions). Mentions Java 21 / Spring Boot 3.5, Avro placement, Kafka stack usage and other policies.
- `docker-compose.yml` — local developer Kafka stack (broker, schema-registry, connect, control-center) with explicit Confluent images and configuration.

Per-module `HELP.md` files exist under each service describing package-name normalization and linking to relevant Spring guides.

---

## Build & artifact status (observable)

Each service contains a Maven wrapper (`mvnw`) and a `pom.xml`. The following artifacts are present in `target/` (pre-built jars are included in repository workspace):

- `api-gateway/target/api-gateway-0.0.1-SNAPSHOT.jar`
- `connections-service/target/connections-service-0.0.1-SNAPSHOT.jar`
- `discovery-server/target/discovery-server-0.0.1-SNAPSHOT.jar`
- `notification-service/target/notification-service-0.0.1-SNAPSHOT.jar`
- `posts-service/target/posts-service-0.0.1-SNAPSHOT.jar`
- `user-service/target/user-service-0.0.1-SNAPSHOT.jar`

Additionally, `target/` contains generated-sources and compiled `classes/` directories for each module. Several modules have Avro-generated Java classes committed under `src/main/java` (see "Avro and generated code" below).


---

## Per-module technical snapshot

Below is a per-service factual snapshot including purpose, important dependencies, configuration, ports and any special integrations.

### api-gateway
- Purpose: Spring Cloud Gateway that routes requests to backend services and provides centralized filters.
- Key dependencies (from `pom.xml`):
  - `spring-boot-starter-actuator`
  - `spring-cloud-starter-gateway-server-webflux`
  - `spring-cloud-starter-netflix-eureka-client` (Eureka client)
  - `io.jsonwebtoken:jjwt` artifacts (0.12.6) — JWT handling library
  - `resilience4j` modules (`resilience4j-spring-boot3`, `resilience4j-circuitbreaker`, `resilience4j-ratelimiter`)
  - `lombok` (optional)
- Build: parent spring-boot-starter-parent `3.5.14`, `<java.version>21</java.version>`, `<spring-cloud.version>2025.0.0`.
- Runtime config (from compiled `target/classes/application.yml`):
  - `spring.application.name: api-gateway`
  - Routes defined for `user-service`, `posts-service`, `connections-service` with `lb://<SERVICE-NAME>` URIs and `StripPrefix` filters.
  - JWT secret placeholder: `jwt.secretKey: ${secret}` (value injected via environment variable or properties at runtime)
  - `server.port: 8007`
  - Eureka defaultZone: `http://localhost:8761/eureka`
- Tests: A basic `ApiGatewayApplicationTests` exists under `src/test/java` with a `contextLoads()` test.


### discovery-server
- Purpose: Eureka discovery server (Spring Cloud Netflix Eureka Server).
- Key dependencies: `spring-cloud-starter-netflix-eureka-server`.
- Build config: parent Spring Boot 3.5.14, `java.version` 21.
- Runtime config (compiled `target/classes/application.properties`):
  - `spring.application.name=discovery-server`
  - `server.port=8761`
  - Eureka configured not to register with itself: `eureka.client.register-with-eureka=false` and `eureka.client.fetch-registry=false`.
- Artifact: jar present in `target/`.


### connections-service
- Purpose: Manage user connections (graph relationships). The service includes Neo4j support.
- Key dependencies:
  - `spring-boot-starter-web`, `spring-boot-starter-webflux`
  - `spring-boot-starter-data-neo4j`
  - `spring-cloud-starter-netflix-eureka-client`
  - Kafka / Avro related: `io.confluent:kafka-avro-serializer` (7.4.0), `kafka-schema-registry-client` (7.4.0), `org.apache.avro:avro` (1.11.0)
  - `spring-kafka`, `kafka-streams`
  - `lombok` (optional)
- Build config: Spring Boot parent 3.5.14, Java 21, Spring Cloud 2025.0.0.
- Avro plugin configured in `pom.xml` (avro-maven-plugin 1.8.2 with `schema` goal executed during `generate-sources`).
- Runtime config (from `target/classes`):
  - `spring.application.name=connections-service`
  - `server.port=9030`, servlet context path `/connections`
  - Neo4j config: `spring.neo4j.uri=bolt://localhost:7687` and credentials via placeholders: `spring.neo4j.authentication.username=${neoUserId}` and `spring.neo4j.authentication.password=${neoPwd}`.
  - Kafka bootstrap servers: `localhost:9092` and Schema Registry `http://localhost:8081` with Avro serializers/deserializers configured and `specific.avro.reader=true`.
  - Kafka topics defined under `kafka.topic.*` keys: e.g. `send-connection-topic`, `accept-connection-topic`, `user-created-topic`, `user-created-dlq`.


### notification-service
- Purpose: Consume post/user events and send notifications; also contains reactive Postgres access via R2DBC and Kafka Streams configuration.
- Key dependencies:
  - `spring-boot-starter-web`, `spring-boot-starter-webflux`
  - `spring-kafka`, `kafka-streams`
  - `spring-boot-starter-data-r2dbc` and `io.r2dbc:r2dbc-postgresql` (reactive Postgres driver)
  - `postgresql` JDBC runtime driver scoped runtime
  - Avro / Confluent clients: `io.confluent:kafka-avro-serializer` 7.4.0, `kafka-schema-registry-client` 7.4.0, `org.apache.avro:avro` 1.11.0
  - `spring-boot-starter-actuator`
- Build config: Spring Boot parent 3.5.14, Java 21.
- Runtime config (from `target/classes/application.yml`):
  - Kafka: bootstrap `localhost:9092`; streams `application-id: notification-service-streams` and default SerDes set (Long key serde, JsonSerde for values by property), consumers configured to use Avro deserializer and schema registry `http://localhost:8081` with `specific.avro.reader=true`.
  - R2DBC: `r2dbc:postgresql://localhost:5432/postgres?useSSL=false` and DB credentials via placeholders: `${dbuserId}`, `${dbuserpwd}`.
  - Management endpoints exposure: `health,info,metrics`.
- Avro: Generated Avro Java class `PostCreatedEvent` is present under `notification-service/src/main/java/com/gc/CollabSphereApp/event/PostCreatedEvent.java` (autogenerated class; committed in repo).


### posts-service
- Purpose: Manage posts (JPA + Postgres + Kafka integration). Also depends on `connections-service` artifact in its `pom.xml` (declared compile-scope dependency on local module `connections-service`).
- Key dependencies:
  - `spring-boot-starter-data-jpa`, `spring-boot-starter-web`, `spring-boot-starter-actuator`
  - `spring-kafka`
  - `org.modelmapper:modelmapper` (3.2.0)
  - `spring-cloud-starter-netflix-eureka-client` and `spring-cloud-starter-openfeign`
  - Avro / Confluent 7.4.0 clients
  - `postgresql` (runtime)
- Build config: Spring Boot parent 3.5.14, Java 21.
- Runtime config (from `target/classes/application.properties`):
  - `spring.application.name=posts-service`
  - `server.port=9010`, servlet context path `/posts`
  - JDBC datasource to Postgres: `jdbc:postgresql://localhost:5432/postgres?useSSL=false` with credentials via placeholders `${dbuserId}`, `${dbuserpwd}`.
  - JPA properties: `hibernate.ddl-auto=update`, `show-sql=true`, `format_sql=true`.
  - Eureka defaultZone: `http://localhost:8761/eureka`.


### user-service
- Purpose: User domain (signup, login, authentication). Contains JWT and password hashing libraries.
- Key dependencies:
  - `spring-boot-starter-data-jpa`, `spring-boot-starter-web`, `spring-boot-starter-actuator`
  - `io.jsonwebtoken` (jjwt api/impl/jackson 0.12.6) for JWT generation/validation
  - `org.mindrot:jbcrypt` (0.4) for password hashing
  - `spring-kafka`, Avro / Confluent 7.4.0
  - `modelmapper` (3.2.0)
- Build config: Spring Boot parent 3.5.14, Java 21; note `pom.xml` uses groupId `com.gc.linkedin` (historical naming) while other modules use `com.gc.CollabSphereApp`.
- Runtime config (from `target/classes/application.properties`):
  - `spring.application.name=user-service`
  - `server.port=9020`, servlet context path `/users`
  - `jwt.secretKey = ${secret}` (placeholder)
  - JDBC datasource to Postgres: `jdbc:postgresql://localhost:5432/postgres?useSSL=false` with credentials placeholders `${dbuserId}`, `${dbuserpwd}`.
  - JPA properties set (ddl-auto=update, show-sql=true, etc.)
  - Eureka defaultZone: `http://localhost:8761/eureka`


---

## Cross-service integrations & runtime expectations

- Service discovery: Eureka server (`discovery-server`) at `http://localhost:8761` — client modules point to this as `eureka.client.service-url.defaultZone`.
- API routing: `api-gateway` uses `lb://<SERVICE-NAME>` URIs for `user-service`, `posts-service`, `connections-service`.
- Messaging & schema registry:
  - `docker-compose.yml` provides Confluent Kafka components: `broker` (Confluent cp-kafka 7.7.1), `schema-registry` (cp-schema-registry 7.7.1), `connect` and `control-center` services.
  - Services use `localhost:9092` as bootstrap server (via compiled configs) and `http://localhost:8081` as Schema Registry.
  - Several modules include Confluent Avro serializer and schema registry client dependencies (version 7.4.0 in poms) and configure `specific.avro.reader=true` where applicable.
- Databases:
  - Postgres: used by `posts-service` and `user-service` (JDBC) and `notification-service` (R2DBC). Connection URLs point to `localhost:5432/postgres` with credentials read from placeholders.
  - Neo4j: `connections-service` points to a Bolt endpoint at `bolt://localhost:7687` with credentials placeholders.
- Avro: Avro schema generation is configured (avro-maven-plugin `1.8.2` in several poms) and at least one generated class is committed (`PostCreatedEvent` in `notification-service`). Some generated sources are present in `target/generated-sources` and also committed under `src/main/java`.

---

## Configuration placeholders and environment wiring

Several runtime-sensitive values are expressed as property placeholders in compiled `application.*` files. These are:

- `${secret}` — used by `api-gateway` and `user-service` for `jwt.secretKey`.
- `${dbuserId}` and `${dbuserpwd}` — used by `posts-service`, `user-service`, and `notification-service` for database credentials.
- `${neoUserId}` and `${neoPwd}` — used by `connections-service` Neo4j authentication.

Service configs expect these to be provided at runtime via environment variables or other config mechanism.

---

## Notable code & generated sources (observed)

- Avro generated Java class: `notification-service/src/main/java/com/gc/CollabSphereApp/event/PostCreatedEvent.java` — full Avro-specific class (Autogenerated by Avro, includes BinaryMessageEncoder/Decoder helpers), committed in repository.
- `target/classes` for each module contains compiled resources such as `application.properties` / `application.yml` used in runtime.
- Each module includes a `HELP.md` describing the module and noting adjusted package names due to invalid original package names.

---

## Third-party versions used (high level)

- Spring Boot: parent version `3.5.14` (each module sets it in the parent POM reference).
- Spring Cloud BOM: declared property `2025.0.0` (imported via dependencyManagement in each module pom).
- Java target: `21` (set in `<java.version>` property in each pom).
- Confluent/Kafka tooling in docker-compose: 7.7.1 images for broker and Schema Registry; `io.confluent` Maven artifacts use 7.4.0 in module poms.
- Avro library: `org.apache.avro:avro:1.11.0` declared in poms.
- avro-maven-plugin: `1.8.2` configured in modules using Avro.
- JWT library: `io.jsonwebtoken:jjwt` 0.12.6 used by API gateway and user-service.
- ModelMapper: 3.2.0 in some modules.
- R2DBC Postgres: `io.r2dbc:r2dbc-postgresql` 0.8.13.RELEASE in notification-service.
- bcrypt: `org.mindrot:jbcrypt:0.4` in user-service.

---

## Tests

- Each module contains a `src/test/java` folder with at least a basic `*ApplicationTests` context-load test (example: `api-gateway` has `ApiGatewayApplicationTests` that runs `contextLoads`).
- `spring-boot-starter-test` is present in poms with `scope=test`.
- `spring-kafka-test` is used in `notification-service` test scope.

---

## Observed inconsistencies / naming artifacts (documenting current facts only)

- Some `HELP.md` files state that original package names containing hyphens were invalid and replaced. The repo contains package directories like `com/gc/CollabSphereApp/api_gateway` (note underscore) rather than `api-gateway`.
- `user-service/pom.xml` uses `groupId` `com.gc.linkedin` while other modules declare `com.gc.CollabSphereApp`. This indicates a historical naming variation present in the declared POM metadata.
- Avro-generated classes are present under `src/main/java` in some modules (e.g., `notification-service`). The Avro Maven plugin is configured with version `1.8.2` (configured to run `schema` goal during `generate-sources`) while the `org.apache.avro:avro` runtime dependency is `1.11.0` (different major/minor ranges between plugin and library are observable from POMs).

---

## Runtime ports and endpoints (compiled config)

- `discovery-server` — 8761 (Eureka UI/endpoint)
- `api-gateway` — 8007 (gateway server)
- `posts-service` — 9010, context path `/posts`
- `user-service` — 9020, context path `/users`
- `connections-service` — 9030, context path `/connections`
- Kafka services (docker-compose): broker mapped ports `9092:9092` (and broker internal listener 29092 used in compose), Schema Registry `8081:8081`, Connect `8083:8083`, Control Center `9021:9021`.
- Notification service sets Kafka Streams `application-id: notification-service-streams` but no explicit server port is present in its `target/classes/application.yml` snapshot (it focuses on Kafka and r2dbc settings). If the application uses Spring Web, default port behavior will apply unless configured elsewhere.

---

## Quick developer commands (as documented in repo files)

These commands are documented in project `AGENTS.md` and per-module `HELP.md`:

- Run a single service in development mode (module root):

  ./mvnw spring-boot:run

- Build & test a module:

  ./mvnw clean test

- Start local Kafka stack (examples from `AGENTS.md` / `docker-compose.yml`):

  docker compose up broker schema-registry -d


---

## Files & locations referenced during analysis

(Representative list of files read to build this snapshot — these files exist in the workspace.)

- Project root: `README.md`, `AGENTS.md`, `docker-compose.yml`
- `api-gateway/` — `pom.xml`, `HELP.md`, `target/classes/application.yml`, `src/test/java/.../ApiGatewayApplicationTests.java`
- `connections-service/` — `pom.xml`, `HELP.md`, `target/classes/application.yml`, `target/classes/application.properties`
- `discovery-server/` — `pom.xml`, `HELP.md`, `target/classes/application.properties`
- `notification-service/` — `pom.xml`, `HELP.md`, `target/classes/application.yml`, `src/main/java/com/gc/CollabSphereApp/event/PostCreatedEvent.java`
- `posts-service/` — `pom.xml`, `HELP.md`, `target/classes/application.properties`
- `user-service/` — `pom.xml`, `HELP.md`, `target/classes/application.properties`

---

## Concluding statement

This document strictly describes the present state of the CollabSphereApp repository as observed from the workspace snapshot. It catalogs modules, dependencies, compiled runtime configuration, generated artifacts, docker-compose Kafka stack configuration, and files that evidence current build outputs and runtime expectations.

(End of status snapshot)

