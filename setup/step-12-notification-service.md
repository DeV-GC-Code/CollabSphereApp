# Step 12 — notification-service

**Language:** Python 3.11 (FastAPI + asyncpg)  
**Port:** 9070  
**Database:** PostgreSQL (`collabsphere_notifications`)  
**Kafka:** Consumer — `post-created-topic`, `post-liked-topic`, `send-connection-topic`, `accept-connection-topic`

## What this service does

notification-service listens to Kafka topics and creates notifications in PostgreSQL. When user A likes user B's post, posts-service publishes a `post-liked-topic` event. notification-service consumes it and stores a notification for user B. When user B opens the app, notification-service's REST API delivers the notifications.

This service has no outgoing HTTP calls and no Kafka publishing — it only consumes and stores.

## Why Python for this service

Python is the most common language for data processing and event consumption in the industry. FastAPI is an excellent async framework that handles Kafka consumer tasks and HTTP requests concurrently without blocking threads. `asyncpg` is a fully async PostgreSQL driver that pairs naturally with FastAPI's async model.

This service also demonstrates that Kafka consumers do not need to be in the same language as the producers. posts-service (Java) produces `post-created-topic`. notification-service (Python) consumes it. Kafka is the universal bus — language does not matter.

## Why a virtual environment

Python projects use virtual environments to isolate dependencies. Without one, every Python project on your machine shares the same global packages — version conflicts are inevitable. A virtual environment creates an isolated Python installation in `.venv/` inside the service directory, with exactly the packages listed in `requirements.txt`.

## Step 1: Create the service .env file

```bash
set -a && source /path/to/CollabSphereApp/.env.local && set +a

cat > /path/to/CollabSphereApp/notification-service/.env << EOF
PORT=9070
DATABASE_URL=postgresql://${dbuserId}:${dbuserpwd}@localhost:5432/collabsphere_notifications
JWT_SECRET=${secret}
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
SCHEMA_REGISTRY_URL=http://localhost:8081
ADMIN_EMAIL=${ADMIN_EMAIL}
EOF
```

Verify:

```bash
cat /path/to/CollabSphereApp/notification-service/.env
```

## Step 2: Create the virtual environment

```bash
cd /path/to/CollabSphereApp/notification-service
python3.11 -m venv .venv
```

This creates a directory `.venv/` containing an isolated Python 3.11 installation.

## Step 3: Activate the virtual environment

```bash
source .venv/bin/activate
```

Your terminal prompt changes to show `(.venv)`. This means all `python` and `pip` commands now use the isolated environment.

**You must activate the venv every time you open a new terminal for this service.**

## Step 4: Install dependencies

```bash
pip install -r requirements.txt
```

This installs FastAPI, asyncpg, aiokafka, fastavro, and their dependencies into `.venv/`. It only needs to run once (or when `requirements.txt` changes).

## Step 5: Run the service

Open a dedicated terminal:

```bash
cd /path/to/CollabSphereApp/notification-service
source .venv/bin/activate
python main.py
```

Watch the startup logs:
1. FastAPI app initializes
2. PostgreSQL connection established — service creates the notifications table automatically if it does not exist
3. Kafka consumer starts — subscribes to all four topics
4. `Application startup complete`

If you see Kafka connection errors, Schema Registry must be running (Step 05). Kafka and Schema Registry must be up before this service starts.

## Verify

```bash
curl http://localhost:9070/actuator/health
```

Expected:
```json
{"status":"UP"}
```

## Verify the Kafka consumer is running

Create a post using posts-service (Step 09 test), then watch the notification-service terminal. You should see:

```
INFO: Consumed event from post-created-topic: post_id=X actor_id=Y
INFO: Created notification for user Z
```

## Verify the database

```bash
psql -U collabsphere -d collabsphere_notifications -c "SELECT * FROM notifications LIMIT 5;"
```

You should see notification rows if you have created posts or connections since this service started.

## How Avro deserialization works here

When notification-service reads a message from `post-created-topic`:
1. The message bytes include a schema ID in the first 5 bytes (Confluent wire format)
2. `aiokafka` + `fastavro` fetch the schema from Schema Registry using that ID
3. The bytes are deserialized into a Python dict matching the Avro schema
4. The service extracts `actor_id`, `user_id`, `post_id` and stores a notification

This is why Schema Registry must be running — without it, the consumer cannot decode the messages.

---

→ Next: `setup/step-13-api-gateway.md`
