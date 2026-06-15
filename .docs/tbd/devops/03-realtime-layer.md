# Idea 03 — Real-time layer (live notifications, messages & presence)

> Candidate direction. For audit, not yet approved.

## Title
Push-based real-time updates (WebSocket/SSE) for notifications, direct messages, and online presence.

## Business / product purpose
The app feels static — notifications and messages only update on refresh/poll. Real-time makes it feel alive (the brand promise in `PRODUCT.md`) and teaches streaming/WebSocket fan-out on top of the existing Kafka backbone.

## Why it fits
Kafka already carries cross-service events (`POST_CREATED`, etc.) consumed by notification-service. Adding a push edge converts those events into live UI updates with minimal new domain logic.

## Frontend UX
- Live notification bell (count + toast on new events, no refresh).
- Messages: new messages appear instantly; typing indicator; read receipts.
- Presence: online dots on the Person atom across feed/network/messages.

## Frontend design / components
- A single `useRealtime()` hook opening one **SSE** (simplest) or **WebSocket** (bi-directional, needed for typing) connection through the gateway; reconnect with backoff; auth via token.
- Wire into existing `NotificationsPage`, `MessagesPage`, and the `Person`/avatar atom (presence dot). Optimistic UI for sends.

## Backend service design
- New **realtime-gateway** service (Go or Node — both handle many concurrent sockets well; Go/Gin already in repo) that:
  - Authenticates the socket (JWT).
  - Subscribes to Kafka topics and fans out events to the right user's connections.
  - Tracks presence (in Redis) with TTL heartbeats.
- messages-service emits a `MESSAGE_SENT` event (new) to Kafka; realtime-gateway pushes to the recipient. notification events reuse existing topics.

## Required APIs
- `GET /api/v1/realtime/stream` (SSE) or `wss://…/api/v1/realtime` (WebSocket) — authenticated.
- `POST /api/v1/messages/.../typing` (optional, for typing indicator) or send over the socket.
- Presence read: `GET /api/v1/presence?userIds=...` (fallback for initial paint).

## DB / persistence changes
- Add **Redis** for presence + socket routing (ephemeral). No business-DB schema change (messages still persist in Mongo; notifications in Postgres).
- New Kafka topic: `messages.message-sent`.

## Service-to-service communication
- messages-service → Kafka (`MESSAGE_SENT`). realtime-gateway consumes Kafka + reads/writes Redis presence. Gateway routes `/realtime/**` to realtime-gateway (sticky/long-lived connection — configure timeouts).

## Security
- Authenticate the socket on connect; authorize per-channel (a user only receives their own notifications/messages). Rate-limit sends. Validate origin. Don't leak other users' presence beyond connections.

## Observability
- Metrics: active connections, fan-out latency, dropped messages, reconnect rate. Trace `MESSAGE_SENT` → push (pairs with Idea 01).

## Failure scenarios
- Socket drop → client backoff reconnect + REST refetch to reconcile missed events.
- realtime-gateway crash → clients reconnect; presence rebuilt from heartbeats; no data loss (source of truth is Mongo/Postgres/Kafka).
- Redis down → presence degrades to "unknown"; messaging still works via REST.
- Thundering herd on reconnect → jittered backoff.

## DevOps impact
Adds Redis + a stateful, long-connection service (gateway timeout/keepalive tuning; horizontal scaling needs sticky routing or a shared pub/sub). Good lesson in scaling stateful edges.

## Testing impact
- Integration tests: publish a Kafka event → assert it reaches a subscribed test socket for the right user only. Load test concurrent connections.

## Suggested phases
1. SSE for notifications (one-way) — bell goes live.
2. Real-time messages (switch to WebSocket) + read receipts.
3. Presence via Redis heartbeats + online dots.
4. Typing indicators + scale-out (shared pub/sub).

## Risks
- Long-lived connections complicate the gateway and scaling.
- Auth on sockets is easy to get wrong.
- Over-engineering presence; keep TTL-based and simple.

## Open questions for audit
- SSE (simpler, one-way) vs WebSocket (typing/bi-directional) — start where?
- New service language: Go (reuse messages stack) vs Node?
- Is presence in-scope for v1 or deferred?
