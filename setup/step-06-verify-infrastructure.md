# Step 06 — Verify Infrastructure

## What this step does

Runs a final check against all five infrastructure components before touching any service code. If anything fails here, fix it before proceeding. A service that cannot connect to its database or Kafka will crash at startup with a confusing error — catching failures here saves time.

## Run the full check

```bash
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  CollabSphere Infrastructure Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "1. PostgreSQL (port 5432)"
pg_isready -h localhost -q && echo "   ✓ Running" || echo "   ✗ NOT RUNNING — run: brew services start postgresql@16"

echo ""
echo "2. Checking PostgreSQL user and databases"
psql -U collabsphere -d postgres -c "SELECT 'ok'" -q 2>/dev/null | grep -q ok \
  && echo "   ✓ collabsphere → postgres DB: connected" \
  || echo "   ✗ Cannot connect as collabsphere to postgres — re-run Step 02"

psql -U collabsphere -d collabsphere_spheres -c "SELECT 'ok'" -q 2>/dev/null | grep -q ok \
  && echo "   ✓ collabsphere → collabsphere_spheres: connected" \
  || echo "   ✗ Cannot connect to collabsphere_spheres — re-run Step 02"

psql -U collabsphere -d collabsphere_notifications -c "SELECT 'ok'" -q 2>/dev/null | grep -q ok \
  && echo "   ✓ collabsphere → collabsphere_notifications: connected" \
  || echo "   ✗ Cannot connect to collabsphere_notifications — re-run Step 02"

echo ""
echo "3. Neo4j (port 7474 browser / 7687 bolt)"
http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:7474)
[ "$http_code" = "200" ] && echo "   ✓ Running (HTTP $http_code)" || echo "   ✗ NOT RUNNING — run: brew services start neo4j"
nc -zv localhost 7687 2>&1 | grep -q succeeded \
  && echo "   ✓ Bolt port 7687: open" \
  || echo "   ✗ Bolt port 7687: closed — Neo4j may still be starting"

echo ""
echo "4. MongoDB (port 27017)"
mongosh --eval "db.adminCommand('ping').ok" --quiet 2>/dev/null | grep -q 1 \
  && echo "   ✓ Running" \
  || echo "   ✗ NOT RUNNING — run: brew services start mongodb-community@7.0"

mongosh "mongodb://collabsphere:$(grep mongoUserPwd .env.local | cut -d= -f2)@localhost:27017/collabsphere_messages?authSource=admin" \
  --eval "db.stats().ok" --quiet 2>/dev/null | grep -q 1 \
  && echo "   ✓ collabsphere user authenticated" \
  || echo "   ✗ MongoDB auth failed — re-run Step 04"

echo ""
echo "5. Kafka (port 9092)"
kafka-topics --bootstrap-server localhost:9092 --list > /dev/null 2>&1 \
  && echo "   ✓ Running" \
  || echo "   ✗ NOT RUNNING — start ZooKeeper then Kafka (Step 05)"

echo ""
echo "6. Schema Registry (port 8081)"
curl -s http://localhost:8081/subjects > /dev/null 2>&1 \
  && echo "   ✓ Running" \
  || echo "   ✗ NOT RUNNING — start Schema Registry (Step 05)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  All checks above must show ✓ before continuing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
```

## What a passing run looks like

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CollabSphere Infrastructure Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. PostgreSQL (port 5432)
   ✓ Running

2. Checking PostgreSQL user and databases
   ✓ collabsphere → postgres DB: connected
   ✓ collabsphere → collabsphere_spheres: connected
   ✓ collabsphere → collabsphere_notifications: connected

3. Neo4j (port 7474 browser / 7687 bolt)
   ✓ Running (HTTP 200)
   ✓ Bolt port 7687: open

4. MongoDB (port 27017)
   ✓ Running
   ✓ collabsphere user authenticated

5. Kafka (port 9092)
   ✓ Running

6. Schema Registry (port 8081)
   ✓ Running
```

## If anything fails

Go back to the step that created that component and re-run the setup. The most common failures:

- **PostgreSQL not running** → `brew services start postgresql@16`
- **collabsphere cannot connect** → re-run the `GRANT` statements in Step 02
- **Neo4j bolt port closed** → Neo4j is still starting, wait 20 seconds and run the check again
- **MongoDB auth failed** → the password in `.env.local` does not match what you set in mongosh; re-create the user in Step 04
- **Kafka not running** → start ZooKeeper first, wait for it, then start Kafka (Step 05)
- **Schema Registry not running** → Kafka must be fully up before Schema Registry; check Kafka first

## Why this gate matters

Each service assumes its dependencies are ready when it starts. If user-service starts and PostgreSQL is down, you will see a `Connection refused` exception and the service will exit. The error message points at PostgreSQL, but you might waste time looking at the service code instead of the infrastructure. Verifying here means when a service fails, you know the infrastructure is not the cause.

---

→ Next: `setup/step-07-user-service.md`
