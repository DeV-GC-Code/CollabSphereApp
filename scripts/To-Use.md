# CollabSphere — Quick Reference

## First-Time Setup

```bash
cp .env.local.example .env.local   # configure credentials
./scripts/local-dev.sh start       # start everything (~10 min first time)
./scripts/local-dev.sh seed        # load demo data
```

Open **http://localhost:3000** — login with `admin@example.com` (password: see `user-service/DataInitializer.java`).

---

## Start / Stop

| Command | What it does |
|---|---|
| `./scripts/local-dev.sh start` | Start infra + all services + UI |
| `./scripts/local-dev.sh start --no-ui` | Start backend only (skip UI) |
| `./scripts/local-dev.sh stop` | Stop app services, keep Docker infra |
| `./scripts/local-dev.sh stop --infra` | Stop everything including Docker |
| `./scripts/local-dev.sh restart` | Full stop then start |
| `./scripts/local-dev.sh seed` | Seed spheres + Neo4j connections |
| `./scripts/local-dev.sh status` | Show status of every service |

## Logs

```bash
./scripts/local-dev.sh logs discovery-server
./scripts/local-dev.sh logs api-gateway
./scripts/local-dev.sh logs user-service
./scripts/local-dev.sh logs posts-service
./scripts/local-dev.sh logs connections-service
./scripts/local-dev.sh logs notification-service   # Python FastAPI
./scripts/local-dev.sh logs messages-service        # Go Gin
./scripts/local-dev.sh logs spheres-service
./scripts/local-dev.sh logs ui
```

Logs live in `.local-dev/logs/`.

## UI Only

```bash
./scripts/local-dev.sh ui start   # start only the React dev server
./scripts/local-dev.sh ui stop    # stop only the React dev server

# Or run directly:
cd collabsphere-ui && npm run dev
```

## Ports

| Service | Port |
|---|---:|
| React UI | 3000 |
| API Gateway | 8007 |
| Eureka | 8761 |
| Schema Registry | 8081 |
| Neo4j Browser | 7474 |
| PostgreSQL | 5432 |
| MongoDB | 27017 |
| Kafka | 9092 |
| user-service | 9020 |
| posts-service | 9010 |
| connections-service | 9030 |
| notification-service (Python) | 9070 |
| messages-service (Go) | 8010 |
| spheres-service | 8009 |

## Clean Wipe

```bash
./scripts/local-dev.sh stop --infra
docker volume rm collabsphere-postgres-data collabsphere-neo4j-data \
                  collabsphere-neo4j-logs collabsphere-mongodb-data
./scripts/local-dev.sh start
./scripts/local-dev.sh seed
```

## Test Accounts

All seeded users share the same default password — see `user-service/src/.../config/DataInitializer.java`.

| Email | Name |
|---|---|
| admin@example.com | Admin (global) |
| alex@example.com | Alex Morgan |
| priya@example.com | Priya Shah |
| jim@example.com | Jim Patel |
| maria@example.com | Maria Garcia |

> Full setup guide: [`../setup.md`](../setup.md)
