# Step 07 — user-service

**Language:** Java 21 / Spring Boot  
**Port:** 9020  
**Context path:** `/users`  
**Database:** PostgreSQL (`postgres` database)  
**Kafka:** Producer on `user-created-topic`

## What this service does

user-service is the identity layer for the entire application. It handles:
- User registration (creates account, hashes password, stores in PostgreSQL)
- Login (validates credentials, issues a signed JWT)
- Profile management (update name, avatar, bio)
- Demo account seeding (on first boot, if `SEED_DEFAULT_PASSWORD` is set)

Every other service validates tokens that user-service issues. This makes user-service the trust anchor of the system — if it is wrong, everything downstream is wrong.

## Why this service starts first

No other backend service can be tested without a valid JWT. user-service issues the JWTs. So it must be running before you can meaningfully test any other service.

## What "context path /users" means

Spring Boot is configured with `server.servlet.context-path=/users`. This means every endpoint the service exposes is prefixed with `/users`.

So the register endpoint defined as `@PostMapping("/auth/register")` is actually reachable at `/users/auth/register`.

The api-gateway routes `/api/v1/users/**` to this service and strips `/api/v1` — so the full path through the gateway is `/api/v1/users/auth/register` → gateway strips → `/users/auth/register` on this service.

## Source your credentials

Open a new terminal dedicated to this service. Every time you start a Java service you must do this first:

```bash
set -a && source /path/to/CollabSphereApp/.env.local && set +a
```

This exports `secret`, `dbuserId`, `dbuserpwd`, and `SEED_DEFAULT_PASSWORD` into the shell environment. Spring Boot reads them when it starts.

## Build

Navigate to the service directory:

```bash
cd /path/to/CollabSphereApp/user-service
```

Build the JAR:

```bash
./mvnw clean package -DskipTests
```

What this does:
- `clean` — deletes the `target/` folder from any previous build
- `package` — compiles the code, runs the Avro code generator (produces Java classes from `.avsc` schema files), and packages everything into a single runnable JAR
- `-DskipTests` — skips unit tests; we want to verify against running infrastructure, not in isolation

The first time you build, Maven downloads all dependencies from the internet. This takes 2–3 minutes. After that, dependencies are cached in `~/.m2/` and the build takes under 30 seconds.

A successful build ends with:
```
BUILD SUCCESS
```

The artifact is at `target/user-service-0.0.1-SNAPSHOT.jar`. This is a self-contained JAR — it includes an embedded Tomcat server and all dependencies. You run it with `java -jar`.

## Run

```bash
java -jar target/user-service-0.0.1-SNAPSHOT.jar
```

Watch the startup logs. You will see:
1. Spring Boot banner
2. Database connection established (Hibernate validates/creates tables)
3. Kafka producer initialized
4. Avro schema registered with Schema Registry
5. `Started UserServiceApplication in X.X seconds`

The `ddl-auto=update` setting causes Hibernate to check the `postgres` database on startup and create any missing tables. On first run you will see SQL CREATE TABLE statements in the logs.

## Verify the service is up

In a different terminal:

```bash
curl http://localhost:9020/users/actuator/health
```

Expected:
```json
{"status":"UP"}
```

## Test: register a user

```bash
curl -s -X POST http://localhost:9020/users/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "testuser@example.com",
    "password": "Test1234",
    "worksAt": "Acme Corp"
  }' | python3 -m json.tool
```

You should get back a user object containing an `id`, `name`, `email`, and a `token`.

## Test: login

```bash
curl -s -X POST http://localhost:9020/users/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test1234"
  }' | python3 -m json.tool
```

You should get back a `token`. Save this token — you will use it to test other services.

## Verify the Kafka event was published

After registering a user, run:

```bash
kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic user-created-topic \
  --from-beginning \
  --max-messages 1
```

You will see binary output (Avro-encoded). The fact that a message appears in the topic confirms user-service successfully published to Kafka. connections-service (Step 08) will consume this message.

## Verify the database

```bash
psql -U collabsphere -d postgres -c "SELECT id, name, email FROM users;"
```

You should see the users you registered. Spring JPA created the `users` table automatically on first boot.

---

→ Next: `setup/step-08-connections-service.md`
