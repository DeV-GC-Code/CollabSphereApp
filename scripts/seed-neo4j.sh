#!/bin/bash
# scripts/seed-neo4j.sh
# Seeds all users from PostgreSQL into Neo4j with localdatetime and sets up relationships.

set -e

# Resolve APP root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load environment variables if .env.local exists
if [ -f "$APP_DIR/.env.local" ]; then
  echo "Loading variables from .env.local..."
  set -a
  source "$APP_DIR/.env.local"
  set +a
fi

# Fallback defaults
PG_USER="${dbuserId:-postgres}"
PG_PASSWORD="${dbuserpwd:-postgres}"
NEO4J_USER="${neoUserId:-neo4j}"
NEO4J_PASSWORD="${neoPwd:-neo4j}"
PG_HOST="localhost"
PG_DB="postgres"

export PGPASSWORD="$PG_PASSWORD"

echo "Fetching all users from PostgreSQL..."
USERS=$(/opt/homebrew/opt/postgresql@15/bin/psql -h "$PG_HOST" -U "$PG_USER" -d "$PG_DB" -t -A -F ',' -c "
  SELECT id, name, email, COALESCE(works_at, '') 
  FROM users;
")

if [ -z "$USERS" ]; then
  echo "No users found in PostgreSQL. Please make sure user-service has run at least once to initialize database."
  exit 1
fi

echo "Clearing existing Person and Company nodes in Neo4j..."
cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" "MATCH (n:Person) DETACH DELETE n; MATCH (c:Company) DETACH DELETE c;" >/dev/null

echo "Seeding users into Neo4j..."

CYPHER_SCRIPT=""

# Process each user row
while IFS=',' read -r userid name email worksat || [ -n "$userid" ]; do
  if [ -z "$userid" ]; then
    continue
  fi
  
  echo "Preparing Cypher for: $name ($email) [Works At: $worksat]"
  
  # Escape single quotes in name/worksat if any
  name_escaped=$(echo "$name" | sed "s/'/\\\\'/g")
  worksat_escaped=$(echo "$worksat" | sed "s/'/\\\\'/g")
  
  # Note: Use localdatetime() to match java.time.LocalDateTime mapping in Java
  CYPHER_SCRIPT+="
    MERGE (p:Person {userId: $userid})
    SET p.name = '$name_escaped', p.email = '$email', p.worksAt = '$worksat_escaped', p.updatedAt = localdatetime()
    WITH p
    OPTIONAL MATCH (p)-[w:WORKS_AT]->(:Company)
    DELETE w
    WITH p
    OPTIONAL MATCH (p)-[c:COLLEAGUE_WITH]-(:Person)
    DELETE c;
  "
  
  if [ -n "$worksat_escaped" ]; then
    CYPHER_SCRIPT+="
      MATCH (p:Person {userId: $userid})
      MERGE (comp:Company {name: '$worksat_escaped'})
      MERGE (p)-[:WORKS_AT]->(comp)
      WITH p, comp
      MATCH (colleague:Person)-[:WORKS_AT]->(comp)
      WHERE colleague.userId <> $userid
      MERGE (p)-[:COLLEAGUE_WITH]->(colleague)
      MERGE (colleague)-[:COLLEAGUE_WITH]->(p);
    "
  fi
done <<< "$USERS"

# Add connection relationships:
# 1. Connect admin@example.com to all other users
# 2. Connect logi@example.com and nivi@example.com
# 3. Create some sample connections among seed users
CYPHER_SCRIPT+="
  // Connect admin@example.com to all other users
  MATCH (admin:Person {email: 'admin@example.com'})
  MATCH (other:Person)
  WHERE other.email <> 'admin@example.com'
  MERGE (admin)-[:CONNECTED_TO]->(other)
  MERGE (other)-[:CONNECTED_TO]->(admin);

  // Connect logi@example.com and nivi@example.com
  MATCH (p1:Person {email: 'logi@example.com'}), (p2:Person {email: 'nivi@example.com'})
  MERGE (p1)-[:CONNECTED_TO]->(p2)
  MERGE (p2)-[:CONNECTED_TO]->(p1);

  // Connect alex and jordan
  MATCH (p1:Person {email: 'alex@example.com'}), (p2:Person {email: 'jordan@example.com'})
  MERGE (p1)-[:CONNECTED_TO]->(p2)
  MERGE (p2)-[:CONNECTED_TO]->(p1);

  // Connect priya and maria
  MATCH (p1:Person {email: 'priya@example.com'}), (p2:Person {email: 'maria@example.com'})
  MERGE (p1)-[:CONNECTED_TO]->(p2)
  MERGE (p2)-[:CONNECTED_TO]->(p1);

  // Connect fatima and chen
  MATCH (p1:Person {email: 'fatima@example.com'}), (p2:Person {email: 'chen@example.com'})
  MERGE (p1)-[:CONNECTED_TO]->(p2)
  MERGE (p2)-[:CONNECTED_TO]->(p1);

  // Connect taylor and owen
  MATCH (p1:Person {email: 'taylor@example.com'}), (p2:Person {email: 'owen@example.com'})
  MERGE (p1)-[:CONNECTED_TO]->(p2)
  MERGE (p2)-[:CONNECTED_TO]->(p1);
"

# Execute the Cypher statements
echo "$CYPHER_SCRIPT" | cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" > /dev/null

echo "Seeding completed successfully in Neo4j."
