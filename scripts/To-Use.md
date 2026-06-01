# CollabSphere — Quick Reference

## First-Time Setup

```bash
cp .env.local.example .env.local   # fill every required blank credential
./scripts/local-dev.sh start       # start everything (~10 min first time)
./scripts/local-dev.sh seed        # load demo data
```

Open **http://localhost:3000**.

- With `SEED_DEFAULT_PASSWORD` set: login as `admin@example.com` using that password.
- With `SEED_DEFAULT_PASSWORD` blank: create a user from the signup screen.

`scripts/local-dev.sh` generates service-specific `.env` files from root `.env.local`; edit `.env.local`, not the generated service files.

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

## Required Environment

`start`, `restart`, `seed`, `status`, and `ui` read `.env.local`.

| Variable | Used by | Notes |
|---|---|---|
| `secret` | Gateway and all authenticated services | Generate with `openssl rand -hex 32` |
| `dbuserId`, `dbuserpwd` | PostgreSQL, Java services, Python service, spheres service | Required |
| `neoUserId`, `neoPwd` | Neo4j and connections seed sync | Required |
| `mongoUserId`, `mongoUserPwd` | MongoDB and messages service | Required |
| `MONGODB_URI` | messages service | Optional; generated when blank |
| `ADMIN_EMAIL` | user seed and admin checks | Defaults to `admin@example.com` |
| `SEED_DEFAULT_PASSWORD` | user-service seeding | Blank disables demo user creation |

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

Build logs for Spring services are written as `.local-dev/logs/<service>-build.log`.

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

Seeded users are created only when `SEED_DEFAULT_PASSWORD` is set before `user-service` starts. All seeded users share that password.

| Email | Name |
|---|---|
| admin@example.com | Admin (global) |
| alex@example.com | Alex Morgan |
| priya@example.com | Priya Shah |
| jim@example.com | Jim Patel |
| maria@example.com | Maria Garcia |

## Security Notes

- Do not commit `.env.local` or generated service `.env` files.
- Authenticated routes validate JWTs in the gateway and in the receiving backend service.
- The gateway strips caller-supplied `X-User-Id`; services derive identity from the signed bearer token.
- Docker Compose requires explicit credentials and no longer falls back to default DB passwords.

> Full setup guide: [`../setup.md`](../setup.md)
