# CollabSphere — Fresh Setup Guide

Everything you need to go from a clean machine to a fully running local stack.

---

## 1. Prerequisites

| Tool | Minimum version | Notes |
|---|---:|---|
| Java JDK | 21 | Required by Spring Boot services (user, posts, connections, gateway, discovery) |
| Go | 1.22 | Required by `messages-service-go` |
| Python | 3.11+ | Required by `notification-service-py` |
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

Open `.env.local` and set values for your machine:

```bash
# JWT secret — must be at least 32 characters
secret=collabsphere-local-secret-key-32chars-minimum

# PostgreSQL credentials (matches what Docker Compose starts)
dbuserId=postgres
dbuserpwd=postgres

# Neo4j credentials
neoUserId=neo4j
neoPwd=yourpassword          # ← change this to your chosen Neo4j password

# MongoDB credentials
mongoUserId=mongouser
mongoUserPwd=mongopass
MONGODB_URI=mongodb://mongouser:mongopass@localhost:27017/collabsphere_messages?authSource=admin

# Admin account (auto-created on first boot)
ADMIN_EMAIL=admin@example.com
```

> The Neo4j password you set here must match the one you configure in Docker.  
> All other defaults work without changes for a local-only setup.

---

## 4. Configure Neo4j Password in Docker Compose

Open `docker-compose.local.yml` and set the Neo4j password to match `.env.local`:

```yaml
neo4j:
  environment:
    - NEO4J_AUTH=neo4j/<your-neo4j-password>
```

---

## 5. Start the Full Stack

```bash
./scripts/local-dev.sh start
```

This single command:

1. Ensures Docker is running (starts Colima or Docker Desktop automatically on macOS)
2. Starts PostgreSQL, Neo4j, MongoDB, Kafka, and Schema Registry via Docker Compose
3. Waits for each infrastructure service to become healthy
4. Builds each Spring Boot service with Maven (`./mvnw -DskipTests package`)
5. Starts all Spring Boot services (discovery-server, user-service, posts-service, connections-service, api-gateway)
6. Builds and starts `messages-service-go` (Go binary compiled via `go build`)
7. Starts `notification-service-py` (Python venv created automatically, uvicorn on :9070)
8. Starts `spheres-service` (Node.js), runs the DB migration, generates its `.env` from root `.env.local`
9. Starts the React UI dev server on port 3000
10. Prints a service status table

The first run takes **8–15 minutes** due to Maven dependency downloads and Docker image pulls.  
Subsequent starts take **2–3 minutes** (jars are cached).

---

## 6. Load Demo Data

After all services are healthy, seed the demo content:

```bash
./scripts/local-dev.sh seed
```

This:
- Seeds 6 community spheres with posts and comments
- Creates the admin user's Neo4j graph node
- Connects admin to all other seeded users so their feed is populated

---

## 7. Open the App

```bash
open http://localhost:3000
```

**Default admin login:**

| Field | Value |
|---|---|
| Email | `admin@example.com` |
| Password | *(seed default — see `user-service` `DataInitializer.java`)* |

All seeded accounts share the same seed default password defined in `user-service/src/main/java/.../config/DataInitializer.java`.

---

## 8. Verify Everything is Running

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

### Go service (`messages-service-go`) fails to start
```bash
./scripts/local-dev.sh logs messages-service-go
# Common cause: MongoDB not ready yet — the start script retries Eureka registration automatically
```

### Python service (`notification-service-py`) fails to start
```bash
./scripts/local-dev.sh logs notification-service-py
# Common cause: missing venv — delete .venv and restart: rm -rf notification-service-py/.venv
# The start script recreates it automatically from requirements.txt
```

### Neo4j auth error
Verify the password in `.env.local` matches `NEO4J_AUTH` in `docker-compose.local.yml`.

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
