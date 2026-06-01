# CollabSphere — Fresh Setup Guide

Everything you need to go from a clean machine to a fully running local stack.

---

## 1. Prerequisites

| Tool | Minimum version | Notes |
|---|---:|---|
| Java JDK | 21 | Required by Spring Boot services (user, posts, connections, gateway, discovery) |
| Go | 1.22 | Required by `messages-service` |
| Python | 3.11+ | Required by `notification-service` |
| Node.js | 20 | Required by `collabsphere-ui` and `spheres-service` |
| npm | 10 | Bundled with recent Node.js releases |
| Docker | Current | Runs PostgreSQL, MongoDB, Neo4j, Kafka, Schema Registry |
| tmux | Optional | Used by `local-dev.sh` for service isolation (falls back to `nohup`) |

**Verify before continuing:**

```bash
java -version        # should print 21.x
go version           # should print go1.22 or higher
python3 --version    # should print 3.11 or higher
node -v              # should print 20.x or higher
npm -v               # should print 10.x or higher
docker info          # should print server info without errors
```

---

## 2. Clone the Repository

```bash
git clone <repo-url> CollabSphereApp
cd CollabSphereApp
```

---

## 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in the blank values for your machine:

```bash
# JWT secret — must be at least 32 characters
# Generate with: openssl rand -hex 32
secret=

# PostgreSQL credentials (Docker Compose reads these)
dbuserId=
dbuserpwd=

# Neo4j credentials
neoUserId=
neoPwd=

# MongoDB credentials
mongoUserId=
mongoUserPwd=
# Optional: leave blank to let local-dev.sh build this from mongoUserId/mongoUserPwd.
MONGODB_URI=

# Admin account (auto-created on first boot)
ADMIN_EMAIL=admin@example.com

# Optional demo seed password. Leave blank to disable demo account seeding.
SEED_DEFAULT_PASSWORD=
```

> Do not commit `.env.local`; it is ignored by git and should contain your machine-specific secrets only.

`scripts/local-dev.sh` uses this one file to generate service-specific `.env` files for `messages-service`, `notification-service`, and `spheres-service`. Do not edit those generated files directly; changes will be overwritten on the next start.

---

## 4. Start the Full Stack

```bash
./scripts/local-dev.sh start
```

This single command:

1. Ensures Docker is running (starts Colima or Docker Desktop automatically on macOS)
2. Starts PostgreSQL, Neo4j, MongoDB, Kafka, and Schema Registry via Docker Compose
3. Waits for each infrastructure service to become healthy
4. Builds each Spring Boot service with Maven (`./mvnw -DskipTests package`)
5. Starts all Spring Boot services (discovery-server, user-service, posts-service, connections-service, api-gateway)
6. Builds and starts `messages-service` (Go binary compiled via `go build`)
7. Starts `notification-service` (Python venv created automatically, uvicorn on :9070)
8. Starts `spheres-service` (Node.js), runs the DB migration, generates its `.env` from root `.env.local`
9. Starts the React UI dev server on port 3000
10. Prints a service status table

The first run takes **8–15 minutes** due to Maven dependency downloads and Docker image pulls.  
Subsequent starts take **2–3 minutes** (jars are cached).

If a required credential is blank, the script stops before starting infrastructure. Fill in `.env.local` and rerun the same command.

---

## 5. Load Demo Data

After all services are healthy, seed the demo content:

```bash
./scripts/local-dev.sh seed
```

This:
- Requires `SEED_DEFAULT_PASSWORD` to have been set before `user-service` started if you want demo users.
- Seeds 6 community spheres with posts and comments
- Creates the admin user's Neo4j graph node
- Connects admin to all other seeded users so their feed is populated

If you left `SEED_DEFAULT_PASSWORD` blank, signup still works, but the demo users listed below will not exist.

---

## 6. Open the App

```bash
open http://localhost:3000
```

**Default admin login:**

| Field | Value |
|---|---|
| Email | `admin@example.com` |
| Password | The value of `SEED_DEFAULT_PASSWORD` in `.env.local` |

All seeded accounts share `SEED_DEFAULT_PASSWORD`. If you left it blank, use the signup screen to create your first account.

---

## 7. Verify Everything is Running

```bash
./scripts/local-dev.sh status
```

All services should show 🟢. The `status` command shows ports, PIDs, and Docker container states.

---

## Key URLs

| Service | URL |
|---|---|
| React UI | http://localhost:3000 |
| API Gateway | http://localhost:8007 |
| Eureka Dashboard | http://localhost:8761 |
| Neo4j Browser | http://localhost:7474 |
| Schema Registry | http://localhost:8081 |

---

## Useful Day-to-Day Commands

```bash
# Start only the UI (backend already running)
./scripts/local-dev.sh ui start

# Tail a service log
./scripts/local-dev.sh logs posts-service
./scripts/local-dev.sh logs spheres-service
./scripts/local-dev.sh logs ui

# Stop app services (leave Docker infra running)
./scripts/local-dev.sh stop

# Stop everything including Docker
./scripts/local-dev.sh stop --infra

# Full restart
./scripts/local-dev.sh restart

# UI dev server only (no backend needed for UI-only work)
cd collabsphere-ui
npm run dev
```

---

## Troubleshooting

### Docker not running
`local-dev.sh` will attempt to auto-start Docker Desktop or Colima on macOS.  
If neither is installed, install [Docker Desktop](https://www.docker.com/products/docker-desktop/).

### Port already in use
Check what's on the port and stop it, or kill the old process:
```bash
lsof -ti tcp:9020 | xargs kill  # example: stop whatever is on user-service port
```

### Spring service fails to start
Check the build log first, then the service log:
```bash
cat .local-dev/logs/user-service-build.log
./scripts/local-dev.sh logs user-service
```

### Go service (`messages-service`) fails to start
```bash
./scripts/local-dev.sh logs messages-service
# Common cause: MongoDB not ready yet — the start script retries Eureka registration automatically
```

### Python service (`notification-service`) fails to start
```bash
./scripts/local-dev.sh logs notification-service
# Common cause: missing venv — delete .venv and restart: rm -rf notification-service/.venv
# The start script recreates it automatically from requirements.txt
```

### Neo4j auth error
Stop the stack with `./scripts/local-dev.sh stop --infra`, remove the old Neo4j volume if you changed credentials, then start again. Neo4j stores the first password in its data volume.

### Spheres service shows "No spheres found"
Run `./scripts/local-dev.sh seed` — the spheres DB needs seeding separately from the Spring Boot DataInitializers.

### Clean wipe and restart from scratch
```bash
./scripts/local-dev.sh stop --infra
docker volume rm collabsphere-postgres-data collabsphere-neo4j-data \
                  collabsphere-neo4j-logs collabsphere-mongodb-data
./scripts/local-dev.sh start
./scripts/local-dev.sh seed
```

If Docker reports a volume is still in use, wait a few seconds after `stop --infra` and retry `docker volume rm`.
