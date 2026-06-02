# Step 13 — api-gateway

**Language:** Java 21 / Spring Cloud Gateway  
**Port:** 8007  
**No database**  
**No Kafka**

## What this service does

The api-gateway is the single entry point into the backend. The React UI only ever talks to port 8007 — it does not know that user-service, posts-service, or any other service exists. The gateway:

1. Receives every API request from the browser
2. Validates the JWT (on protected routes)
3. Routes the request to the correct backend service based on the URL path
4. Returns the backend's response to the browser

Nothing else. It does not store data. It does not produce Kafka events. It is purely a routing and authentication layer.

## Why this starts last

The gateway routes to all the other services. Starting it first would work, but if you try a request before the backend services are running, you will get routing errors that could confuse you. Starting it last means once the gateway is up, every route is backed by a running service.

## How routing works

The gateway uses static URL addresses — no service discovery. Every route is defined in `src/main/resources/application.yml`:

```yaml
routes:
  - id: user-service
    uri: http://localhost:9020
    predicates:
      - Path=/api/v1/users/**
    filters:
      - StripPrefix=2
```

**StripPrefix=2** strips the first 2 path segments. So `/api/v1/users/auth/login` becomes `/users/auth/login` before being sent to `localhost:9020`. user-service has context path `/users`, so the full path it receives is `/users/auth/login` — which matches its `@PostMapping("/auth/login")` endpoint.

This is why each service has a context path (`/users`, `/posts`, `/connections`). The gateway does the URL transformation; the service sees only its own prefix.

## How JWT validation works

Most routes have an `AuthenticationFilter`. The filter:
1. Reads the `Authorization: Bearer <token>` header
2. Validates the token signature using the shared `secret` key
3. If invalid → returns 401 immediately, before the request reaches any service
4. If valid → passes the request through to the backend

The `/api/v1/users/**` route has **no filter**. Login and register are intentionally public — users cannot have a token before logging in.

## Source credentials and build

Open a new terminal:

```bash
set -a && source /path/to/CollabSphereApp/.env.local && set +a

cd /path/to/CollabSphereApp/api-gateway
./mvnw clean package -DskipTests
```

## Run

```bash
java -jar target/api-gateway-0.0.1-SNAPSHOT.jar
```

Watch for:
```
Started ApiGatewayApplication in X.X seconds
```

## Verify the gateway is up

```bash
curl http://localhost:8007/actuator/health
```

Expected:
```json
{"status":"UP"}
```

## Test: route to user-service through the gateway

```bash
curl -s -X POST http://localhost:8007/api/v1/users/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser@example.com", "password": "Test1234"}' | python3 -m json.tool
```

The request travels: browser → gateway (no JWT check on /users/**) → user-service → response back. If you get a token, routing is working.

## Test: JWT validation

Try a protected route without a token:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8007/api/v1/posts/feed
# 401
```

Now try with a valid token:

```bash
TOKEN=$(curl -s -X POST http://localhost:8007/api/v1/users/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser@example.com", "password": "Test1234"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -s -o /dev/null -w "%{http_code}" http://localhost:8007/api/v1/posts/feed \
  -H "Authorization: Bearer $TOKEN"
# 200
```

## Test: the full route chain

```bash
curl -s http://localhost:8007/api/v1/posts/feed \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

This triggers: gateway validates JWT → routes to posts-service → posts-service calls connections-service → builds and returns feed → gateway returns to browser.

If this returns a valid JSON feed (even empty `[]`), the entire backend chain is working.

## Routing table summary

| Incoming URL                  | Transformed to              | Goes to          |
|-------------------------------|-----------------------------|------------------|
| `/api/v1/users/**`            | `/users/**`                 | :9020            |
| `/api/v1/posts/**`            | `/posts/**`                 | :9010            |
| `/api/v1/connections/**`      | `/connections/**`           | :9030            |
| `/api/v1/likes/**`            | `/posts/likes/**`           | :9010            |
| `/api/v1/spheres/**`          | `/core/**`                  | :8009            |
| `/api/v1/messages/**`         | `/messages/**`              | :8010            |
| `/api/v1/notifications/**`    | `/notifications/**`         | :9070            |

---

→ Next: `setup/step-14-react-ui.md`
