# CollabSphere — Commands Reference

Handy commands for development, debugging, and monitoring.

---

## Check versions (installed tools)

```bash
java -version          # need 21+ (currently 22)
node --version         # need 18+ (currently 26)
go version             # need 1.21+ (currently 1.26)
python3.11 --version   # need 3.11+
python3 --version      # system default (may differ)
mvn --version          # or: ./mvnw -v inside any Java service

# Databases
/opt/homebrew/opt/postgresql@15/bin/psql --version  # PostgreSQL 15
/opt/homebrew/Cellar/mongodb-community@4.4/4.4.21/bin/mongod --version
neo4j --version
kafka-server-start --version 2>/dev/null || /opt/homebrew/bin/kafka-topics --version

# Confluent
$HOME/tools/confluent-7.7.1/bin/schema-registry-start --version 2>/dev/null || \
  echo "Confluent at ~/tools/confluent-7.7.1"
```

---

## Service health checks

```bash
# All 7 services
curl -s http://localhost:9020/users/actuator/health        # user-service
curl -s http://localhost:9030/connections/actuator/health  # connections-service
curl -s http://localhost:9010/posts/actuator/health        # posts-service
curl -s http://localhost:8009/actuator/health              # spheres-service
curl -s http://localhost:8010/actuator/health              # messages-service
curl -s http://localhost:9070/actuator/health              # notification-service
curl -s http://localhost:8007/actuator/health              # api-gateway
curl -s http://localhost:8081/subjects                     # schema-registry

# One-liner check all
for port_path in \
  "9020/users/actuator/health" \
  "9030/connections/actuator/health" \
  "9010/posts/actuator/health" \
  "8009/actuator/health" \
  "8010/actuator/health" \
  "9070/actuator/health" \
  "8007/actuator/health"; do
  port=${port_path%%/*}; path=${port_path#*/}
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/$path" 2>/dev/null)
  echo "Port $port: $status"
done
```

---

## JWT — get a token and use it

```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost:8007/api/v1/users/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Devops123"}')
echo "Token: $TOKEN"

# Decode JWT payload (no library needed)
echo $TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
# Shows: sub (user ID), email, name, exp (expiry timestamp)

# Use token in a request
curl -s http://localhost:8007/api/v1/posts/core/feed \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -30
```

---

## API endpoints (gateway URLs)

All calls go through `localhost:8007`. The gateway validates the JWT and routes.

```bash
TOKEN="<paste_token_here>"

# Auth (no token needed)
curl -X POST http://localhost:8007/api/v1/users/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Devops123"}'

curl -X POST http://localhost:8007/api/v1/users/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"Test1234","worksAt":"Acme"}'

# Posts
curl http://localhost:8007/api/v1/posts/core/feed               -H "Authorization: Bearer $TOKEN"
curl http://localhost:8007/api/v1/posts/core/users/9/allPosts   -H "Authorization: Bearer $TOKEN"

# Connections
curl "http://localhost:8007/api/v1/connections/core/people?query=alex" -H "Authorization: Bearer $TOKEN"
curl http://localhost:8007/api/v1/connections/core/connections          -H "Authorization: Bearer $TOKEN"
curl http://localhost:8007/api/v1/connections/core/received            -H "Authorization: Bearer $TOKEN"

# Spheres
curl http://localhost:8007/api/v1/spheres/core/                        -H "Authorization: Bearer $TOKEN"
curl http://localhost:8007/api/v1/spheres/core/my                      -H "Authorization: Bearer $TOKEN"

# Messages
curl http://localhost:8007/api/v1/messages/core/conversations          -H "Authorization: Bearer $TOKEN"
curl http://localhost:8007/api/v1/messages/core/unread-count           -H "Authorization: Bearer $TOKEN"

# Notifications
curl http://localhost:8007/api/v1/notifications/core                   -H "Authorization: Bearer $TOKEN"
curl http://localhost:8007/api/v1/notifications/core/unread-count      -H "Authorization: Bearer $TOKEN"
```

---

## Process management

```bash
# Find what's running on a port
lsof -i :8007               # what's using port 8007
lsof -i :9020               # user-service
lsof -i :5432               # postgres

# List all CollabSphere processes
ps aux | grep -E "SNAPSHOT|messages-service|uvicorn|node src/index|vite|kafka|schema-registry|mongod|neo4j"

# Kill a specific port's process
kill -9 $(lsof -ti :9020)   # kill whatever is on port 9020

# Check Java service JAR paths
ps aux | grep SNAPSHOT | grep -v grep
```

---

## Log files

```bash
# Tail a service log live
tail -f /tmp/user-service.log
tail -f /tmp/posts-service.log
tail -f /tmp/connections-service.log
tail -f /tmp/spheres-service.log
tail -f /tmp/messages-service.log
tail -f /tmp/notification-service.log
tail -f /tmp/api-gateway.log
tail -f /tmp/kafka.log
tail -f /tmp/schema-registry.log
tail -f /tmp/mongodb.log

# Filter errors only
grep -i "ERROR\|Exception\|error" /tmp/user-service.log | tail -20
grep -i "ERROR\|error" /tmp/spheres-service.log | tail -10

# Find what went wrong at startup
grep -E "Started|Failed|Error|Exception" /tmp/posts-service.log | tail -15
```

---

## PostgreSQL

```bash
PSQL=/opt/homebrew/opt/postgresql@15/bin/psql

# Connect
$PSQL postgres                          # as current user (gowthamchava)
$PSQL -U postgres postgres              # as postgres role

# List databases
$PSQL postgres -c "\l"

# Check tables
$PSQL -U postgres postgres -c "\dt"                           # posts, users tables
$PSQL -U postgres collabsphere_spheres -c "\dt"              # spheres tables
$PSQL -U postgres collabsphere_notifications -c "\dt"        # notifications table

# Query data
$PSQL -U postgres postgres -c "SELECT id, email FROM users LIMIT 10;"
$PSQL -U postgres postgres -c "SELECT count(*) FROM post;"
$PSQL -U postgres collabsphere_spheres -c "SELECT name, created_by FROM spheres;"

# Fix post content column (if VARCHAR(255) error on startup)
$PSQL -U postgres postgres -c "ALTER TABLE post ALTER COLUMN content TYPE TEXT;"

# Check roles
$PSQL postgres -c "\du"
```

---

## MongoDB

```bash
# Connect (no auth — local dev)
mongosh

# Connect with user
mongosh "mongodb://mongouser:mongopass@localhost:27017/admin"

# Check messages database
mongosh collabsphere_messages --eval "db.getCollectionNames()"
mongosh collabsphere_messages --eval "db.messages.countDocuments()"
mongosh collabsphere_messages --eval "db.messages.find().limit(3).pretty()"

# Check/create user
mongosh admin --eval "db.getUser('mongouser')"
```

---

## Neo4j

```bash
# Connect via cypher-shell
cypher-shell -u neo4j -p 'gowtham123#G'

# Useful Cypher queries (run in cypher-shell or http://localhost:7474)
MATCH (p:Person) RETURN p.userId, p.name LIMIT 10;
MATCH (p:Person)-[:CONNECTED]->(q:Person) RETURN p.name, q.name LIMIT 10;
MATCH (p:Person) RETURN count(p) AS total_persons;

# HTTP API (no cypher-shell needed)
curl -s http://localhost:7474/db/neo4j/tx \
  -H "Content-Type: application/json" \
  -u "neo4j:gowtham123#G" \
  -d '{"statements":[{"statement":"MATCH (p:Person) RETURN count(p) AS n"}]}'
```

---

## Kafka

```bash
# List topics
/opt/homebrew/bin/kafka-topics --bootstrap-server localhost:9092 --list

# Describe a topic
/opt/homebrew/bin/kafka-topics --bootstrap-server localhost:9092 \
  --describe --topic user-created-topic

# Consume messages from a topic (Avro — binary, shows raw bytes)
/opt/homebrew/bin/kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic user-created-topic \
  --from-beginning \
  --max-messages 5

# Check consumer groups
/opt/homebrew/bin/kafka-consumer-groups --bootstrap-server localhost:9092 --list
/opt/homebrew/bin/kafka-consumer-groups --bootstrap-server localhost:9092 \
  --describe --group connections-service

# Schema Registry — list schemas
curl http://localhost:8081/subjects
curl http://localhost:8081/subjects/user-created-topic-value/versions/latest
```

---

## Build commands

```bash
# Single Java service
cd user-service && ./mvnw clean package -DskipTests -q

# With tests
cd user-service && ./mvnw clean test

# Go service
cd messages-service && go build -o messages-service . && echo "OK"
cd messages-service && go test ./...

# Python
cd notification-service && .venv/bin/pip install -r requirements.txt
cd notification-service && .venv/bin/python -c "import app.config; print('Config OK')"

# Node
cd spheres-service && npm install
cd collabsphere-ui && npm run build    # production build
cd collabsphere-ui && npm run dev      # dev server
```

---

## Environment variables

```bash
# See what's in .env.local
cat .env.local

# Load .env.local into current shell (needed for Java services)
set -a && source .env.local && set +a

# Verify a specific var is set
echo "JWT secret length: ${#secret}"      # should be 64

# Check what env vars a running process has
# (replace PID with actual process ID)
ps aux | grep user-service
cat /proc/<PID>/environ 2>/dev/null | tr '\0' '\n' | grep -E "secret|dbuser|mongo|neo"
```

---

## Network / connectivity

```bash
# Check if a port is open
nc -zv localhost 9092          # Kafka
nc -zv localhost 5432          # PostgreSQL
nc -zv localhost 7687          # Neo4j bolt
nc -zv localhost 27017         # MongoDB

# Check what's listening
netstat -an | grep LISTEN | grep -E "5432|7687|9092|8007|9020|27017"

# Test a URL end-to-end
curl -v http://localhost:8007/api/v1/users/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Devops123"}' 2>&1 | \
  grep -E "< HTTP|< Content|{" | head -10
```

---

## Common problems and fixes

| Symptom | Command to diagnose | Fix |
|---------|--------------------|----|
| `Connection refused` on port X | `lsof -i :X` | Start the service — nothing is running there |
| Java service won't start | `tail -50 /tmp/<service>.log` | Usually missing env var or DB not ready |
| `value too long for type character varying(255)` | Check post table | `ALTER TABLE post ALTER COLUMN content TYPE TEXT;` |
| JWT 401 from notification/messages | Check algorithm | Already fixed to accept HS256+HS512 |
| MongoDB won't start | `cat /tmp/mongodb.log \| tail -20` | Wipe `/opt/homebrew/var/mongodb/*` and restart |
| Kafka format error | Check `/tmp/kafka.log` | Wipe kraft logs dir and re-run `kafka-storage format` |
| Schema Registry won't start | Check if Kafka is up | Schema Registry needs Kafka running first |
| Neo4j password rejected | Use HTTP API | `curl -X POST .../db/system/tx` with cypher ALTER USER |
| spheres 500 on UUID endpoint | Wrong URL pattern | Use `/api/v1/spheres/core/` not `/core/communities` |
