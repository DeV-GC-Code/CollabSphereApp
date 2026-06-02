# CollabSphere — Stop

Stop in reverse order: UI → services → infrastructure.

---

## Stop all services

```bash
# Application services
pkill -f "user-service.*SNAPSHOT.jar"      2>/dev/null && echo "user-service stopped"
pkill -f "posts-service.*SNAPSHOT.jar"     2>/dev/null && echo "posts-service stopped"
pkill -f "connections-service.*SNAPSHOT.jar" 2>/dev/null && echo "connections-service stopped"
pkill -f "api-gateway.*SNAPSHOT.jar"       2>/dev/null && echo "api-gateway stopped"
pkill -f "messages-service"                2>/dev/null && echo "messages-service stopped"
pkill -f "uvicorn main:app"                2>/dev/null && echo "notification-service stopped"
pkill -f "node src/index.js"               2>/dev/null && echo "spheres-service stopped"
pkill -f "vite"                            2>/dev/null && echo "UI stopped"
```

---

## Stop infrastructure

```bash
# Schema Registry and Kafka (started as background processes)
pkill -f "schema-registry-start"  2>/dev/null && echo "Schema Registry stopped"
pkill -f "kafka-server-start"     2>/dev/null && echo "Kafka stopped"

# MongoDB (clean shutdown via mongod command)
/opt/homebrew/Cellar/mongodb-community@4.4/4.4.21/bin/mongod \
  --dbpath /opt/homebrew/var/mongodb --shutdown 2>/dev/null && echo "MongoDB stopped"

# Neo4j and PostgreSQL (brew services)
brew services stop neo4j           && echo "Neo4j stopped"
brew services stop postgresql@15   && echo "PostgreSQL stopped"
```

---

## Verify everything stopped

```bash
for port in 3000 8007 8009 8010 8081 9010 9020 9030 9070 5432 7474 7687 9092 27017; do
  pid=$(lsof -ti :$port 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "Port $port still in use by PID $pid — force killing..."
    kill -9 $pid 2>/dev/null
  fi
done
echo "All ports clear"
```

---

## One-liner: stop everything at once

```bash
pkill -f "SNAPSHOT.jar" 2>/dev/null; \
pkill -f "messages-service" 2>/dev/null; \
pkill -f "uvicorn main:app" 2>/dev/null; \
pkill -f "node src/index.js" 2>/dev/null; \
pkill -f "vite" 2>/dev/null; \
pkill -f "schema-registry-start" 2>/dev/null; \
pkill -f "kafka-server-start" 2>/dev/null; \
/opt/homebrew/Cellar/mongodb-community@4.4/4.4.21/bin/mongod \
  --dbpath /opt/homebrew/var/mongodb --shutdown 2>/dev/null; \
brew services stop neo4j 2>/dev/null; \
brew services stop postgresql@15 2>/dev/null; \
echo "All stopped"
```

---

## Check what's still running

```bash
# Check which ports are in use
for port in 3000 8007 8009 8010 8081 9010 9020 9030 9070 5432 7474 7687 9092 27017; do
  pid=$(lsof -ti :$port 2>/dev/null)
  [ -n "$pid" ] && echo "Port $port: PID $pid running" || echo "Port $port: free"
done
```

---

## Notes

- **Kafka data**: Kafka log data persists at `/opt/homebrew/var/lib/kraft-combined-logs/`. To completely wipe and start fresh, delete that directory. You'll need to re-format storage (`kafka-storage format`) before next start.
- **MongoDB data**: Persists at `/opt/homebrew/var/mongodb/`. Safe to leave — it starts clean next time.
- **PostgreSQL data**: Persists at `/opt/homebrew/var/postgresql@15/`. Tables and seed data survive restarts.
- **Neo4j data**: Persists in Neo4j's brew data directory. Person nodes from connections-service survive restarts.
- **Schema Registry schemas**: Stored in Kafka's `_schemas` topic. Cleared when you wipe Kafka data.
