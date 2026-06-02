# Step 05 — Kafka + Schema Registry

## What this step does

Starts ZooKeeper, Kafka broker, and Schema Registry. These three processes must run together for any Kafka-using service to work.

## Why Kafka and not direct HTTP calls

When a user registers, three things need to happen:
1. connections-service must create a Person node in Neo4j
2. notification-service must be aware the user exists

If user-service called both services directly over HTTP, it would need to know their addresses, handle failures if they are down, and wait for both to respond before returning to the user. Every caller becomes tightly coupled to every callee.

Kafka decouples this. user-service publishes one event: `user-created-topic`. It does not know or care who consumes it. connections-service and notification-service each subscribe and process the event independently. If notification-service is down when a user registers, the event waits in Kafka until it comes back — nothing is lost.

This pattern is called **event-driven architecture**. The producer only knows about the topic, not the consumers.

## Why Schema Registry

Kafka messages are just bytes. Two services agreeing on what those bytes mean requires a contract. We use **Avro** — a binary serialization format with a schema. Schema Registry is the server that stores these schemas.

When user-service publishes a user-created event, it registers the Avro schema with Schema Registry first. When connections-service consumes that event, it fetches the schema from Registry to deserialize it correctly. Both services always agree on the message format.

## The three processes

We need to start them in this order:
1. **ZooKeeper** — manages Kafka cluster coordination
2. **Kafka broker** — the actual message broker
3. **Schema Registry** — the schema server Confluent provides

Each needs its own terminal window. Do not close them while running services.

## Open terminal 1 — ZooKeeper

```bash
zookeeper-server-start $CONFLUENT_HOME/etc/kafka/zookeeper.properties
```

Wait until you see this line:
```
INFO binding to port 0.0.0.0/0.0.0.0:2181
```

Do not close this terminal.

## Open terminal 2 — Kafka

```bash
kafka-server-start $CONFLUENT_HOME/etc/kafka/server.properties
```

Wait until you see this line:
```
INFO [KafkaServer id=0] started (kafka.server.KafkaServer)
```

Do not close this terminal.

## Open terminal 3 — Schema Registry

```bash
schema-registry-start $CONFLUENT_HOME/etc/schema-registry/schema-registry.properties
```

Wait until you see this line:
```
INFO Server started, listening for requests
```

Do not close this terminal.

## Verify all three are up

Open a fourth terminal and run:

```bash
echo "=== ZooKeeper ==="
nc -zv localhost 2181 2>&1 | grep -E "succeeded|refused"

echo "=== Kafka ==="
kafka-topics --bootstrap-server localhost:9092 --list 2>&1 | head -5

echo "=== Schema Registry ==="
curl -s http://localhost:8081/subjects
```

Expected output:
```
=== ZooKeeper ===
Connection to localhost port 2181 [tcp] succeeded!

=== Kafka ===
(empty or list of topics — no error)

=== Schema Registry ===
[]
```

The Schema Registry returns `[]` because no schemas are registered yet. That is correct — schemas are registered automatically when the first service publishes an Avro message.

## What happens after you start a service

When user-service starts and a user registers for the first time, the Kafka producer:
1. Serializes the user data into Avro binary format
2. Registers the Avro schema with Schema Registry (POST to `/subjects/user-created-topic-value/versions`)
3. Publishes the binary message to the `user-created-topic` Kafka topic

When connections-service consumes that message:
1. Reads the binary bytes from the topic
2. Fetches the schema ID embedded in the bytes from Schema Registry (GET `/schemas/ids/{id}`)
3. Deserializes the bytes into a Java object using the schema

After the first message flows through, check Schema Registry:
```bash
curl http://localhost:8081/subjects
# ["user-created-topic-value"]
```

## How to stop Kafka cleanly

Press `Ctrl+C` in the Schema Registry terminal first, then the Kafka terminal, then the ZooKeeper terminal. Always stop in reverse order.

If you kill them out of order and Kafka gets stuck, you can wipe its log data:

```bash
rm -rf /tmp/kafka-logs /tmp/zookeeper
```

Then start again from ZooKeeper.

---

→ Next: `setup/step-06-verify-infrastructure.md`
