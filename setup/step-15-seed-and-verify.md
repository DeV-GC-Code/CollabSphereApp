# Step 15 — Seed Data and End-to-End Verification

## What this step does

Loads demo data into the system and runs a series of `curl` commands that trace every communication path — HTTP routes, Kafka events, database reads, and service-to-service calls — to confirm the entire stack is working correctly.

---

## Part 1: Seed demo data

### Auto-seeded accounts

user-service automatically created demo accounts on its first boot because `SEED_DEFAULT_PASSWORD` was set in `.env.local`. These accounts already exist in your PostgreSQL `users` table.

Log in with:
```
Email:    admin@example.com
Password: (your SEED_DEFAULT_PASSWORD)
```

Check the user count:
```bash
psql -U collabsphere -d postgres -c "SELECT count(*), 'users seeded' FROM users;"
```

If the count is 0 or 1 (just admin), user-service did not seed. Check the user-service startup logs for lines starting with `Seeding...`. If `SEED_DEFAULT_PASSWORD` was empty at startup, the seeding is skipped — restart user-service with the variable set.

### Seed Spheres

```bash
cd /path/to/CollabSphereApp/spheres-service
node src/db/seed.js
```

Verify:
```bash
psql -U collabsphere -d collabsphere_spheres -c "SELECT name FROM spheres LIMIT 10;"
```

### Sync users into Neo4j

Every user registered via user-service should have a corresponding Person node in Neo4j (connections-service creates these automatically via Kafka). Verify this is complete:

```bash
cypher-shell -u neo4j -p YOUR_NEO4J_PASSWORD \
  "MATCH (p:Person) RETURN count(p) AS total_persons;"
```

The count should match the number of rows in the PostgreSQL `users` table:
```bash
psql -U collabsphere -d postgres -c "SELECT count(*) FROM users;"
```

If Neo4j has fewer nodes, some Kafka events were missed. You can manually sync by running:

```bash
set -a && source .env.local && set +a

psql -U $dbuserId -d postgres -tAc "SELECT id, name, email FROM users ORDER BY id;" | \
while IFS='|' read -r uid uname uemail; do
  uid=$(echo "$uid" | tr -d ' \n')
  [ -z "$uid" ] && continue
  cypher-shell -u "$neoUserId" -p "$neoPwd" \
    "MERGE (p:Person {userId: ${uid}}) SET p.name='${uname}', p.email='${uemail}'" \
    > /dev/null 2>&1
  echo "Synced user $uid ($uemail)"
done
echo "Sync complete"
```

---

## Part 2: End-to-end verification

Work through these checks in order. Each one tests a specific communication path.

### Get an admin token through the gateway

```bash
set -a && source .env.local && set +a

TOKEN=$(curl -s -X POST http://localhost:8007/api/v1/users/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"$SEED_DEFAULT_PASSWORD\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "Token acquired: ${TOKEN:0:30}..."
```

**Path tested:** browser → api-gateway (no JWT check on /users) → user-service → PostgreSQL → response

If this fails, check that the gateway and user-service are both running.

---

### Test JWT rejection

```bash
curl -s -o /dev/null -w "Status: %{http_code}\n" \
  http://localhost:8007/api/v1/posts/feed \
  -H "Authorization: Bearer badtoken"
```

Expected: `Status: 401`

**Path tested:** gateway intercepts the request, validates JWT, rejects before reaching posts-service.

---

### Create a post

```bash
POST_RESPONSE=$(curl -s -X POST http://localhost:8007/api/v1/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content": "End-to-end test post"}')

echo $POST_RESPONSE | python3 -m json.tool
POST_ID=$(echo $POST_RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Created post ID: $POST_ID"
```

**Path tested:** gateway (JWT validated) → posts-service → PostgreSQL

Now check notification-service received the event:
```bash
# Wait 2 seconds for async processing
sleep 2
psql -U collabsphere -d collabsphere_notifications \
  -c "SELECT type, created_at FROM notifications ORDER BY created_at DESC LIMIT 3;"
```

**Path tested:** posts-service → [post-created-topic Kafka event] → notification-service → PostgreSQL notification stored

---

### Fetch the feed (crosses three services)

```bash
curl -s http://localhost:8007/api/v1/posts/feed \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Path tested:**  
gateway → posts-service → connections-service (HTTP GET for connections) → Neo4j → posts-service builds feed → response

If this returns valid JSON (even `[]`), all three services in this chain are communicating correctly.

---

### Check connections

```bash
curl -s http://localhost:8007/api/v1/connections/core/connections \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Path tested:** gateway → connections-service → Neo4j

---

### Check notifications

```bash
curl -s http://localhost:8007/api/v1/notifications/core \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Path tested:** gateway → notification-service → PostgreSQL `collabsphere_notifications`

---

### Send a direct message

Get a second user's ID to send to:
```bash
OTHER_USER_ID=$(psql -U collabsphere -d postgres -tAc \
  "SELECT id FROM users WHERE email != 'admin@example.com' LIMIT 1;" | tr -d ' ')
echo "Sending message to user ID: $OTHER_USER_ID"
```

```bash
curl -s -X POST "http://localhost:8007/api/v1/messages/core/conversations/${OTHER_USER_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content": "Hello from end-to-end test"}' | python3 -m json.tool
```

**Path tested:** gateway → messages-service → MongoDB

Verify it landed in MongoDB:
```bash
mongosh "mongodb://collabsphere:$(grep mongoUserPwd .env.local | cut -d= -f2)@localhost:27017/collabsphere_messages?authSource=admin" \
  --eval "db.messages.countDocuments()" --quiet
```

---

### Check a sphere

```bash
curl -s http://localhost:8007/api/v1/spheres/core/spheres \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Path tested:** gateway (strips /api/v1/spheres) → spheres-service → PostgreSQL `collabsphere_spheres`

---

## Part 3: Full communication map — confirmed

After all checks pass, this is what is running and talking:

```
browser
  │
  ▼
api-gateway :8007
  │ JWT validated on all routes except /api/v1/users/**
  │
  ├──► user-service       :9020 → PostgreSQL (users, tokens)
  │                                     │
  │                                     └──[user-created-topic]──► connections-service :9030
  │                                                                         │
  │                                                                         └──► Neo4j
  │
  ├──► posts-service      :9010 → PostgreSQL (posts, likes)
  │         │                          │
  │         │ HTTP GET /connections    └──[post-created-topic]──► notification-service :9070
  │         ▼                         └──[post-liked-topic]────►         │
  │    connections-service :9030                                         └──► PostgreSQL (notifications)
  │
  ├──► spheres-service    :8009 → PostgreSQL (spheres, sphere posts, votes)
  ├──► messages-service   :8010 → MongoDB   (conversations, messages)
  └──► notification-service:9070→ PostgreSQL (notifications) + Kafka consumer
```

---

## Cleanup — start over

If you need to reset everything and start from scratch:

```bash
# Kill all running services
for port in 9020 9010 9030 8009 8010 9070 8007 3000; do
  pid=$(lsof -ti tcp:$port 2>/dev/null)
  [ -n "$pid" ] && echo "Killing port $port" && kill -9 $pid
done

# Stop Kafka (Ctrl+C in each Kafka terminal)
# Then stop databases:
brew services stop postgresql@16
brew services stop neo4j
brew services stop mongodb-community@7.0
```

To fully wipe data:
```bash
# PostgreSQL
brew services start postgresql@16 && sleep 3
psql -U $(whoami) -d postgres -c "DROP DATABASE IF EXISTS collabsphere_spheres;"
psql -U $(whoami) -d postgres -c "DROP DATABASE IF EXISTS collabsphere_notifications;"
psql -U $(whoami) -d postgres -c "DROP TABLE IF EXISTS users, posts, post_likes;"
psql -U $(whoami) -d postgres -c "DROP ROLE IF EXISTS collabsphere;"

# MongoDB
mongosh --eval "use collabsphere_messages; db.dropDatabase();" --quiet

# Neo4j (set your password)
cypher-shell -u neo4j -p YOUR_NEO4J_PASSWORD "MATCH (n) DETACH DELETE n;"

# Kafka logs
rm -rf /tmp/kafka-logs /tmp/zookeeper

# Built artifacts
rm -f messages-service/messages-service
rm -rf user-service/target posts-service/target connections-service/target api-gateway/target
```

Then start over from `setup/step-01-credentials.md`.
