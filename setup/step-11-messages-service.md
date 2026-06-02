# Step 11 — messages-service

**Language:** Go 1.22 (Gin framework)  
**Port:** 8010  
**Database:** MongoDB (`collabsphere_messages`)  
**Kafka:** None  
**No calls to other services**

## What this service does

Direct messaging between users. Stores conversations and individual messages in MongoDB. Provides endpoints to send messages, read a conversation, mark messages as read, and get an unread count.

## Why Go for this service

Go compiles to a single static binary. No runtime to install, no virtual machine, no interpreter. When you deploy to EC2, you copy one file and run it. This makes Go the simplest service to deploy manually — a skill you will use and appreciate in Stage 2 of the learning roadmap.

Go is also very fast and efficient for concurrent I/O — which is the dominant workload for a messaging service (many simultaneous reads and writes).

## Why MongoDB for messages

A conversation is naturally a collection of documents. Each message is a self-contained record with sender, content, timestamp, and read status. There is no join needed — you query by conversation participants and get back all messages. MongoDB's document model fits this better than a normalized relational schema would.

messages-service is the only service in the system that talks to MongoDB.

## Step 1: Create the service .env file

```bash
set -a && source /path/to/CollabSphereApp/.env.local && set +a

cat > /path/to/CollabSphereApp/messages-service/.env << EOF
PORT=8010
MONGODB_URI=mongodb://${mongoUserId}:${mongoUserPwd}@localhost:27017/collabsphere_messages?authSource=admin
JWT_SECRET=${secret}
ADMIN_EMAIL=${ADMIN_EMAIL}
EOF
```

Verify:

```bash
cat /path/to/CollabSphereApp/messages-service/.env
```

Confirm you see real values, not variable names.

## Step 2: Build the binary

```bash
cd /path/to/CollabSphereApp/messages-service
go build -o messages-service .
```

What this does:
- `go build` compiles all `.go` files in the current directory
- `-o messages-service` names the output binary `messages-service`
- `.` means "compile the package in this directory"

Successful build: no output, just a new binary file in the directory.

```bash
ls -lh messages-service
# -rwxr-xr-x 1 ... 15M messages-service
```

The binary is around 15MB and contains everything — the HTTP server, MongoDB driver, JWT validation, and the Go runtime. No external dependencies needed to run it.

## Why we build a binary and not use `go run`

`go run .` compiles and runs in one step. It works, but it recompiles every time. `go build` creates a persistent binary that you deploy. When you move this service to EC2, you either:
1. Build the binary on your Mac (cross-compile for Linux) and copy it over
2. Build it on the EC2 instance directly

Understanding that the artifact is a single binary is important for the deployment stages ahead.

## Step 3: Run the service

Open a new terminal:

```bash
cd /path/to/CollabSphereApp/messages-service
./messages-service
```

Expected startup output:
```
[messages-service] Connected to MongoDB
[messages-service] Listening on :8010
```

If you see `MongoDB connect failed`, the `MONGODB_URI` in `.env` is incorrect or MongoDB is not running. Check Step 04 and Step 04.

## Verify

```bash
curl http://localhost:8010/actuator/health
```

Expected:
```json
{"status":"UP"}
```

## Test: send a message

You need two users' IDs. Get them from the database:

```bash
psql -U collabsphere -d postgres -c "SELECT id, email FROM users LIMIT 3;"
```

Use a token for user 1 and send a message to user 2:

```bash
TOKEN="paste-token-for-user-1"
PARTNER_ID="2"   # user ID of the recipient

curl -s -X POST "http://localhost:8010/messages/core/conversations/${PARTNER_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content": "Hello!"}' | python3 -m json.tool
```

You should get back the created message document with an `_id`.

## Verify in MongoDB

```bash
mongosh "mongodb://collabsphere:YOUR_MONGO_PASSWORD@localhost:27017/collabsphere_messages?authSource=admin" \
  --eval "db.messages.find().pretty()" --quiet
```

You should see the message document stored.

---

→ Next: `setup/step-12-notification-service.md`
