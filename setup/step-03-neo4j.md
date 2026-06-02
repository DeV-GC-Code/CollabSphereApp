# Step 03 — Neo4j

## What this step does

Starts Neo4j and confirms the password matches your `.env.local`. Neo4j must be installed (covered in PREREQUISITES.md).

## Why a graph database for connections

The connections-service models who follows whom. In a relational database, this is a self-referencing table — to answer "who are my friends of friends?" you need multiple JOINs that get slower the deeper you go.

Neo4j stores data as nodes (a Person) and relationships (CONNECTED_TO). Traversing two hops — "show me people connected to people I follow" — is the same query regardless of how many connections exist. That is the native strength of a graph database.

The `connections-service` is the only service that talks to Neo4j. Every other service uses PostgreSQL or MongoDB. This is intentional — you should use the right database for the job, not one database for everything.

## Start Neo4j

```bash
brew services start neo4j
```

Neo4j takes longer than other databases to start — typically 15–25 seconds.

## Set the password

Open your browser and go to: `http://localhost:7474`

You will see the Neo4j browser interface. Log in with:
- Username: `neo4j`
- Password: `neo4j`

It will immediately prompt you to change the password. Set it to exactly the value you have in `.env.local` for `neoPwd`. If the values do not match, connections-service will fail to start.

## Verify via command line

```bash
cypher-shell -u neo4j -p YOUR_NEO4J_PASSWORD "RETURN 'connected' AS status;"
```

Replace `YOUR_NEO4J_PASSWORD` with your actual password.

Expected output:
```
status
"connected"
```

If you see `authentication failure`, the password does not match. Either change the password in `.env.local` to match what you set, or reset Neo4j and set a new password.

## Verify the bolt port is open

connections-service connects via the bolt protocol (port 7687), not the HTTP browser port (7474):

```bash
nc -zv localhost 7687
# Connection to localhost port 7687 [tcp] succeeded!
```

If this fails, Neo4j is not fully started yet. Wait a few more seconds and retry.

## What happens inside Neo4j when connections-service starts

When user-service publishes a `user-created-topic` event to Kafka, connections-service consumes it and runs this Cypher query:

```cypher
MERGE (p:Person {userId: 123})
SET p.name = 'John', p.email = 'john@example.com'
```

`MERGE` means "create if it does not exist, otherwise do nothing". Every registered user gets a Person node in Neo4j automatically, without you having to do anything manually.

---

→ Next: `setup/step-04-mongodb.md`
