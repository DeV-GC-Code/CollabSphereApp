# CollabSphere — Start

Run in this exact order. Each section assumes the previous one is up.

---

## 1. PostgreSQL

```bash
brew services start postgresql@15
```

Verify:
```bash
/opt/homebrew/opt/postgresql@15/bin/pg_isready -h localhost
# localhost:5432 - accepting connections
```

---

## 2. MongoDB

```bash
brew services start mongodb-community@8.0
```

Verify:
```bash
mongosh --eval "db.adminCommand('ping').ok" --quiet 2>/dev/null | tail -1
# 1
```

---

## 3. Neo4j

```bash
brew services start neo4j
```

Wait ~15 seconds for startup, then verify:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:7474/
# 200
```

> **First-time setup only** — change the default password after first start. Use values from your gitignored `.env.local`.
> ```bash
> set -a && source /Users/gowthamchava/Movies/CollabSphereApp/.env.local && set +a
> NEO4J_INITIAL_PASSWORD="${NEO4J_INITIAL_PASSWORD:-neo4j}"
> curl -X POST "http://localhost:7474/db/system/tx" \
>   -H "Content-Type: application/json" \
>   -u "neo4j:${NEO4J_INITIAL_PASSWORD}" \
>   -d "{\"statements\":[{\"statement\":\"ALTER CURRENT USER SET PASSWORD FROM \\\"${NEO4J_INITIAL_PASSWORD}\\\" TO \\\"${neoPwd}\\\"\"}]}"
> ```
> Verify the new password works:
> ```bash
> cypher-shell -u neo4j -p "$neoPwd" "RETURN 1;"
> ```

---

## 4. Kafka

> Uses KRaft mode (no ZooKeeper). Format storage only on first install, or after intentionally wiping corrupted Kafka metadata.

```bash
# Confirm the broker advertises only the client listener.
# In KRaft mode, advertised.listeners must NOT include CONTROLLER://localhost:9093.
grep '^advertised.listeners=' /opt/homebrew/etc/kafka/kraft/server.properties

# If it includes CONTROLLER, fix it before starting Kafka:
perl -0pi -e 's#^advertised\.listeners=.*#advertised.listeners=PLAINTEXT://localhost:9092#m' \
  /opt/homebrew/etc/kafka/kraft/server.properties
```

First-time setup only:

```bash
CLUSTER_ID=$(kafka-storage random-uuid)
kafka-storage format -t "$CLUSTER_ID" -c /opt/homebrew/etc/kafka/kraft/server.properties
```

Start the broker:

```bash
kafka-server-start /opt/homebrew/etc/kafka/kraft/server.properties > /tmp/kafka.log 2>&1 &
echo 'Kafka PID: '$!
```

Verify (wait ~5 seconds):

```bash
/opt/homebrew/bin/kafka-topics --bootstrap-server localhost:9092 --list >/dev/null && echo "Kafka: OK"
/opt/homebrew/bin/kafka-topics --bootstrap-server localhost:9092 --list
```

Recovery only if Kafka metadata is actually corrupted:

```bash
# This deletes all local Kafka topics/messages. Do not run as a normal startup step.
rm -rf /opt/homebrew/var/lib/kraft-combined-logs

CLUSTER_ID=$(kafka-storage random-uuid)
kafka-storage format -t "$CLUSTER_ID" -c /opt/homebrew/etc/kafka/kraft/server.properties
```

---

## 5. Schema Registry

> Confluent Community 7.7.1 is at `~/tools/confluent-7.7.1/`

```bash
export CONFLUENT_HOME=~/tools/confluent-7.7.1
export PATH=$CONFLUENT_HOME/bin:$PATH

schema-registry-start $CONFLUENT_HOME/etc/schema-registry/schema-registry.properties \
  > /tmp/schema-registry.log 2>&1 &
echo 'Schema Registry PID: '$!
```

Verify (wait ~10 seconds):

```bash
curl -s http://localhost:8081/subjects
# Fresh install: []
# Existing local data: ["accept-connection-topic-value", ...]
```

---

## Infrastructure checkpoint

Run this before touching any service:

```bash
echo "=== Infrastructure check ===" && \
/opt/homebrew/opt/postgresql@15/bin/pg_isready -h localhost && echo "PG: OK" || echo "PG: DOWN" && \
mongosh --eval "db.adminCommand('ping').ok" --quiet 2>/dev/null | grep -q 1 && echo "MongoDB: OK" || echo "MongoDB: DOWN" && \
/opt/homebrew/bin/kafka-topics --bootstrap-server localhost:9092 --list >/dev/null 2>&1 && echo "Kafka: OK" || echo "Kafka: DOWN" && \
curl -s http://localhost:8081/subjects >/dev/null && echo "Schema Registry: OK" || echo "Schema Registry: DOWN" && \
curl -s -o /dev/null -w "" http://localhost:7474/ && echo "Neo4j: OK" || echo "Neo4j: DOWN"
```

---

## 6. Backend services

Load credentials first — **run this in every terminal before starting a Java service**:

```bash
set -a && source /Users/gowthamchava/Movies/CollabSphereApp/.env.local && set +a
```

Start services. `user-service` must be first (issues JWTs). `api-gateway` must be last.

```bash
APP=/Users/gowthamchava/Movies/CollabSphereApp
set -a && source $APP/.env.local && set +a

# 1. user-service FIRST
cd $APP/user-service && java -jar target/user-service-0.0.1-SNAPSHOT.jar \
  > /tmp/user-service.log 2>&1 &
echo 'user-service PID: '$!
sleep 20   # wait for DB init and Kafka schema registration

# 2. These can start in any order
cd $APP/connections-service && java -jar target/connections-service-0.0.1-SNAPSHOT.jar \
  > /tmp/connections-service.log 2>&1 &
echo 'connections-service PID: '$!

cd $APP/posts-service && java -jar target/posts-service-0.0.1-SNAPSHOT.jar \
  > /tmp/posts-service.log 2>&1 &
echo 'posts-service PID: '$!

cd $APP/spheres-service && node src/index.js \
  > /tmp/spheres-service.log 2>&1 &
echo 'spheres-service PID: '$!

cd $APP/messages-service && ./messages-service \
  > /tmp/messages-service.log 2>&1 &
echo 'messages-service PID: '$!

cd $APP/notification-service && .venv/bin/uvicorn main:app --port 9070 \
  > /tmp/notification-service.log 2>&1 &
echo 'notification-service PID: '$!

sleep 20

# 3. api-gateway LAST
cd $APP/api-gateway && java -jar target/api-gateway-0.0.1-SNAPSHOT.jar \
  > /tmp/api-gateway.log 2>&1 &
echo 'api-gateway PID: '$!
sleep 15
```

---

## 7. React UI

```bash
cd /Users/gowthamchava/Movies/CollabSphereApp/collabsphere-ui
npm run dev
```

Open: `http://localhost:3000`
Login with the seeded admin only if `SEED_DEFAULT_PASSWORD` was set before first user-service boot:
`admin@example.com` / `$SEED_DEFAULT_PASSWORD`

---

## 8. Verify everything

```bash
echo "=== Services ===" && \
curl -s -o /dev/null -w "user-service        :9020 %{http_code}\n" http://localhost:9020/users/actuator/health && \
curl -s -o /dev/null -w "connections-service :9030 %{http_code}\n" http://localhost:9030/connections/actuator/health && \
curl -s -o /dev/null -w "posts-service       :9010 %{http_code}\n" http://localhost:9010/posts/actuator/health && \
curl -s -o /dev/null -w "spheres-service     :8009 %{http_code}\n" http://localhost:8009/actuator/health && \
curl -s -o /dev/null -w "messages-service    :8010 %{http_code}\n" http://localhost:8010/actuator/health && \
curl -s -o /dev/null -w "notification-svc    :9070 %{http_code}\n" http://localhost:9070/actuator/health && \
curl -s -o /dev/null -w "api-gateway         :8007 %{http_code}\n" http://localhost:8007/actuator/health

echo ""
echo "=== JWT round-trip ==="
TOKEN=$(curl -s -X POST http://localhost:8007/api/v1/users/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"${SEED_DEFAULT_PASSWORD}\"}")
echo "Token: ${TOKEN:0:50}..."
curl -s -o /dev/null -w "Feed (expect 200): %{http_code}\n" \
  http://localhost:8007/api/v1/posts/core/feed \
  -H "Authorization: Bearer $TOKEN"
```

All services should return `200`.

---

## Port reference

| Service | Port | Language |
|---------|------|----------|
| api-gateway | 8007 | Java |
| user-service | 9020 | Java |
| posts-service | 9010 | Java |
| connections-service | 9030 | Java |
| spheres-service | 8009 | Node.js |
| messages-service | 8010 | Go |
| notification-service | 9070 | Python |
| React UI (Vite) | 3000 | Node.js |
| PostgreSQL | 5432 | — |
| Neo4j (browser) | 7474 | — |
| Neo4j (bolt) | 7687 | — |
| MongoDB | 27017 | — |
| Kafka | 9092 | — |
| Schema Registry | 8081 | — |

---

## Build (first time or after code changes)

```bash
APP=/Users/gowthamchava/Movies/CollabSphereApp
set -a && source $APP/.env.local && set +a

# Java (run in parallel)
(cd $APP/user-service && ./mvnw clean package -DskipTests -q && echo "user-service built") &
(cd $APP/posts-service && ./mvnw clean package -DskipTests -q && echo "posts-service built") &
(cd $APP/connections-service && ./mvnw clean package -DskipTests -q && echo "connections-service built") &
(cd $APP/api-gateway && ./mvnw clean package -DskipTests -q && echo "api-gateway built") &
wait

# Go
cd $APP/messages-service && go build -o messages-service . && echo "messages-service built"

# Python venv
cd $APP/notification-service
python3.11 -m venv .venv
.venv/bin/pip install -r requirements.txt -q
echo "notification-service ready"

# Node (install deps)
cd $APP/spheres-service && npm install --silent && echo "spheres-service ready"
cd $APP/collabsphere-ui && npm install --silent && echo "UI ready"
```

---

## First-time database setup

Run once after infrastructure is up for the first time:

```bash
PSQL=/opt/homebrew/opt/postgresql@15/bin/psql

# Load local credentials. Keep real values only in .env.local.
set -a && source /Users/gowthamchava/Movies/CollabSphereApp/.env.local && set +a

# Create postgres role used by local service URLs if it does not already exist.
$PSQL postgres -c "CREATE ROLE ${dbuserId} WITH SUPERUSER LOGIN PASSWORD '${dbuserpwd}';" 2>/dev/null || true

# Create service databases
$PSQL postgres -c "CREATE DATABASE collabsphere_users OWNER ${dbuserId};" 2>/dev/null || true
$PSQL postgres -c "CREATE DATABASE collabsphere_posts OWNER ${dbuserId};" 2>/dev/null || true
$PSQL postgres -c "CREATE DATABASE collabsphere_spheres OWNER ${dbuserId};" 2>/dev/null || true
$PSQL postgres -c "CREATE DATABASE collabsphere_notifications OWNER ${dbuserId};" 2>/dev/null || true

# MongoDB user
mongosh admin --eval "
  try { db.createUser({user:'${mongoUserId}',pwd:'${mongoUserPwd}',roles:[{role:'root',db:'admin'}]}); }
  catch(e) { print('User exists'); }
" 2>/dev/null

# Optional: if the seeded users were created in order in an empty DB, this enables post seed data.
# Otherwise leave POST_SEED_USER_IDS blank and posts-service will skip its demo seed.
export POST_SEED_USER_IDS="${POST_SEED_USER_IDS:-}"

# Spheres schema + seed
cd /Users/gowthamchava/Movies/CollabSphereApp/spheres-service
node src/db/migrate.js
node src/db/seed.js

# Neo4j users seed (pulls from Postgres)
cd /Users/gowthamchava/Movies/CollabSphereApp
./scripts/seed-neo4j.sh
```
