# Step 04 — MongoDB

## What this step does

Creates the MongoDB user that messages-service uses to authenticate. MongoDB must be installed and running (covered in PREREQUISITES.md).

## Why MongoDB for messages

Messages between users are document-oriented by nature. A conversation is a collection of messages — each message is a self-contained document with sender, timestamp, content, and read status. There is no need to normalize this into relational tables.

MongoDB's document model fits this directly. Each message is a BSON document stored in a collection. There are no migrations, no schema changes when you add a new field to a message — you just store it. This makes it natural for evolving data structures.

messages-service is the only service that talks to MongoDB. It connects using the Go MongoDB driver.

## Start MongoDB

```bash
brew services start mongodb-community@7.0
```

Verify it is running:
```bash
mongosh --eval "db.adminCommand('ping').ok" --quiet
# 1
```

If you see `1`, MongoDB is running. If you see a connection error, wait 5 seconds and try again.

## Create the application user

MongoDB uses its `admin` database to store user credentials. When a client connects, they authenticate against `admin` even if they are accessing a different database — that is what `authSource=admin` in the connection string means.

```bash
mongosh
```

You are now inside the MongoDB shell. Run:

```js
use admin

db.createUser({
  user: "collabsphere",
  pwd: "your-mongoUserPwd-value-here",
  roles: [
    { role: "readWrite", db: "collabsphere_messages" }
  ]
})
```

Replace `your-mongoUserPwd-value-here` with the exact value of `mongoUserPwd` in your `.env.local`.

Expected output:
```
{ ok: 1 }
```

Exit the shell:
```js
exit
```

## Verify the connection

Test the exact connection string that messages-service will use:

```bash
mongosh "mongodb://collabsphere:YOUR_MONGO_PASSWORD@localhost:27017/collabsphere_messages?authSource=admin" \
  --eval "db.stats().ok" --quiet
```

Expected: `1`

If you see `Authentication failed`, the password does not match. Re-create the user:

```bash
mongosh
use admin
db.dropUser("collabsphere")
# Then re-run the createUser command above
```

## What the connection string means

When messages-service starts, it reads the `MONGODB_URI` environment variable:

```
mongodb://collabsphere:PASSWORD@localhost:27017/collabsphere_messages?authSource=admin
```

Breaking it down:
- `mongodb://` — protocol
- `collabsphere:PASSWORD` — username and password
- `localhost:27017` — host and port (on EC2 this becomes the MongoDB instance's private IP)
- `/collabsphere_messages` — the database to use
- `?authSource=admin` — validate credentials against the `admin` database

When you deploy to EC2, you change `localhost` to the private IP of your MongoDB instance. Everything else stays the same.

---

→ Next: `setup/step-05-kafka.md`
