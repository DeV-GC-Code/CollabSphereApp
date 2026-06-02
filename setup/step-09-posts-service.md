# Step 09 — posts-service

**Language:** Java 21 / Spring Boot  
**Port:** 9010  
**Context path:** `/posts`  
**Database:** PostgreSQL (`postgres` database)  
**Kafka:** Producer (`post-created-topic`, `post-liked-topic`)  
**HTTP client:** Feign → calls connections-service at `http://localhost:9030`

## What this service does

posts-service handles creating posts, the personalized feed, and likes. It is one of the more complex services because it both produces Kafka events and makes synchronous HTTP calls to another service.

- **Create post** — stores the post in PostgreSQL and publishes a Kafka event so notification-service can notify followers
- **Feed** — fetches the caller's connection list from connections-service, then returns posts from those people
- **Like** — records a like and publishes a Kafka event

## Why posts-service calls connections-service over HTTP

The feed must be built in real time — when you request it, you get the current state of your connections' posts. This cannot be async because the user is waiting for a response. So posts-service makes a synchronous HTTP GET to connections-service.

This is the first time in our system where one service calls another directly. It is called **service-to-service HTTP communication**. On localhost this is simple. On EC2, `localhost:9030` becomes the private IP of the connections-service instance — and that is exactly what you will change when you deploy to EC2.

The HTTP call uses **OpenFeign**, a declarative HTTP client. Instead of writing `HttpClient.get("http://localhost:9030/...")`, you define an interface:

```java
@FeignClient(name = "connections-service", url = "${connections-service.url:http://localhost:9030}", path = "/connections")
public interface ConnectionsClient {
    @GetMapping("/core/connections")
    List<PersonDto> getFirstConnections();
}
```

Feign generates the implementation. The URL comes from `application.properties`:
```
connections-service.url=http://localhost:9030
```

When you deploy to EC2, you change that one property to point to the private IP. The Feign interface code does not change.

## Source credentials and build

Open a new terminal:

```bash
set -a && source /path/to/CollabSphereApp/.env.local && set +a

cd /path/to/CollabSphereApp/posts-service
./mvnw clean package -DskipTests
```

## Run

```bash
java -jar target/posts-service-0.0.1-SNAPSHOT.jar
```

Watch for:
1. Database connection established
2. Kafka producer initialized
3. `Started PostsServiceApplication in X.X seconds`

## Verify the service is up

```bash
curl http://localhost:9010/posts/actuator/health
```

Expected:
```json
{"status":"UP"}
```

## Test: create a post

Use the token from Step 07:

```bash
TOKEN="paste-your-token-here"

curl -s -X POST http://localhost:9010/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content": "Hello from posts-service"}' | python3 -m json.tool
```

You should get back the created post object with an `id`. If you see a 401, your token is expired — log in again via user-service.

## Verify the Kafka event was published

```bash
kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic post-created-topic \
  --from-beginning \
  --max-messages 1
```

You should see a message (binary Avro content). This message will be consumed by notification-service in Step 12.

## Test: fetch the feed (triggers HTTP call to connections-service)

```bash
curl -s http://localhost:9010/posts/feed \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

When this runs, posts-service makes an HTTP GET to `http://localhost:9030/connections/core/connections` to get the current user's connections. Then it returns posts from those users.

- If you get a feed response (even an empty `[]`) — the HTTP call to connections-service succeeded.
- If you get a 500 error or see a `Connection refused` in the posts-service logs — connections-service is not running. Go back to Step 08.

## Verify the database

```bash
psql -U collabsphere -d postgres -c "SELECT id, content FROM posts LIMIT 5;"
```

You should see the posts you created.

## Communication map so far

```
user-service    → [user-created-topic]   → connections-service → Neo4j
posts-service   ←→ [HTTP GET]            ← connections-service (feed building)
posts-service   → [post-created-topic]   → notification-service (next steps)
```

---

→ Next: `setup/step-10-spheres-service.md`
