# Step 08 — connections-service

**Language:** Java 21 / Spring Boot  
**Port:** 9030  
**Context path:** `/connections`  
**Database:** Neo4j  
**Kafka:** Consumer (`user-created-topic`) + Producer (`send-connection-topic`, `accept-connection-topic`)

## What this service does

connections-service manages the social graph — who follows or is connected to whom. It stores this data as a graph in Neo4j, where each user is a `Person` node and each connection is a `CONNECTED_TO` relationship.

It also:
- Listens to `user-created-topic` — when user-service registers a new user, connections-service automatically creates a Person node for them
- Provides an API to send connection requests, accept them, and list connections
- Publishes events to Kafka when connections change (so notification-service can alert users)

## Why this must start before posts-service

posts-service calls connections-service over HTTP to build the feed. When a user requests their feed, posts-service asks connections-service: "who are this user's connections?" — then fetches posts from those people. If connections-service is not running when posts-service needs it, the feed endpoint will fail.

## Source credentials and build

Open a new terminal:

```bash
set -a && source /path/to/CollabSphereApp/.env.local && set +a

cd /path/to/CollabSphereApp/connections-service
./mvnw clean package -DskipTests
```

## Run

```bash
java -jar target/connections-service-0.0.1-SNAPSHOT.jar
```

Watch the logs for:
1. Neo4j driver connected — `Neo4j connection established`
2. Kafka consumer started — subscribing to `user-created-topic`
3. `Started ConnectionsServiceApplication in X.X seconds`

## Verify the service is up

```bash
curl http://localhost:9030/connections/actuator/health
```

Expected:
```json
{"status":"UP"}
```

## Verify the Kafka consumer is working

Go back to the user-service terminal and register a new user (if you have not already from Step 07). Then look at the connections-service terminal logs.

You should see something like:
```
INFO: Received user-created event for userId=1
INFO: Created Person node for userId=1 in Neo4j
```

This confirms the full Kafka flow:
```
user-service → [publishes] → user-created-topic → [consumed by] → connections-service → [creates] → Neo4j Person node
```

## Verify the Person node in Neo4j

```bash
cypher-shell -u neo4j -p YOUR_NEO4J_PASSWORD \
  "MATCH (p:Person) RETURN p.userId, p.name, p.email LIMIT 10;"
```

You should see the users you registered in Step 07 as Person nodes. If the list is empty, the Kafka consumer did not fire — check that Kafka is running and that user-service is publishing to the correct topic.

## Test: list connections for a user

Use the token from Step 07:

```bash
TOKEN="paste-your-token-here"

curl -s http://localhost:9030/connections/core/connections \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

This will return an empty list until two users are connected. That is expected at this point.

## Understanding the service-to-service connection

This service calls no other service over HTTP. It only receives Kafka events from user-service. The connection here is:

```
user-service (Kafka producer)
    │
    ▼ user-created-topic (Kafka topic)
    │
    ▼
connections-service (Kafka consumer)
    │
    ▼
Neo4j (stores Person node)
```

In the next step, posts-service will call connections-service directly over HTTP to get connection data for the feed.

---

→ Next: `setup/step-09-posts-service.md`
