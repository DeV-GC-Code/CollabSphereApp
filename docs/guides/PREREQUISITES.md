# CollabSphere — Prerequisites

Before running any service, confirm every tool and database is installed and at the right version.

Work through this list top to bottom. Each item has a **check command**, a **YES path** (already installed), and a **NO path** (how to install). Do not skip items — a missing tool will silently break a service much later.

Once everything here is done, move to the `setup/` folder and follow the steps in order.

---

## Checklist overview

| Tool / Database     | Check command                          | Required |
|---------------------|----------------------------------------|----------|
| Java 21             | `java -version`                        | 21.x     |
| Maven wrapper       | `./mvnw -v` (inside any Java service)  | bundled  |
| Node.js             | `node --version`                       | 18+      |
| npm                 | `npm --version`                        | 8+       |
| Go                  | `go version`                           | 1.21+    |
| Python              | `python3.11 --version`                 | 3.11+    |
| PostgreSQL          | `pg_isready -h localhost`              | 16+      |
| Neo4j               | `curl -s http://localhost:7474`        | 5.x      |
| MongoDB             | `mongosh --version`                    | 8.x      |
| Kafka               | `kafka-topics --version`               | 3.7+     |
| Schema Registry     | `curl -s http://localhost:8081`        | 7.7+     |

---

## Java 21

### Check

```bash
java -version
```

**Output if installed:**
```
openjdk version "21.x.x" ...
```

**YES — correct version (21.x):**  
Nothing to do. Move to the next item.

**YES — wrong version (17, 11, or something else):**  
You need version 21 specifically. Install it alongside your current Java and configure `JAVA_HOME` to point to 21.

```bash
brew install openjdk@21
```

Then add to `~/.zshrc`:
```bash
export JAVA_HOME=$(brew --prefix openjdk@21)
export PATH=$JAVA_HOME/bin:$PATH
```

Apply: `source ~/.zshrc`  
Verify: `java -version` should now show 21.

**NO — command not found:**

```bash
brew install openjdk@21
```

Add to `~/.zshrc`:
```bash
export JAVA_HOME=$(brew --prefix openjdk@21)
export PATH=$JAVA_HOME/bin:$PATH
```

Apply: `source ~/.zshrc`  
Verify: `java -version`

---

## Maven wrapper

The Java services bundle their own Maven (`./mvnw`). You do not need to install Maven globally.

### Check

```bash
cd /path/to/CollabSphereApp/user-service
./mvnw -v
```

**YES — prints Maven version and Java 21:**  
Nothing to do.

**NO — permission denied:**

```bash
chmod +x user-service/mvnw
chmod +x posts-service/mvnw
chmod +x connections-service/mvnw
chmod +x api-gateway/mvnw
```

Run `./mvnw -v` again.

---

## Node.js and npm

### Check

```bash
node --version
npm --version
```

**YES — node 18 or higher:**  
Nothing to do.

**YES — node 16 or lower:**  
Upgrade:
```bash
brew upgrade node
```
Or install a specific version with `nvm`:
```bash
brew install nvm
nvm install 20
nvm use 20
```

**NO — command not found:**

```bash
brew install node
```

Verify:
```bash
node --version   # v18 or higher
npm --version    # 8 or higher
```

---

## Go

### Check

```bash
go version
```

**YES — go 1.21 or higher:**  
Nothing to do.

**YES — older version:**

```bash
brew upgrade go
```

**NO — command not found:**

```bash
brew install go
```

Add to `~/.zshrc` if not already present:
```bash
export PATH=$PATH:/usr/local/go/bin
```

Verify: `go version`

---

## Python 3.11

### Check

```bash
python3.11 --version
```

**YES — 3.11.x or higher:**  
Nothing to do.

**NO — command not found:**

```bash
brew install python@3.11
```

After install, `python3.11` will be available. Verify:

```bash
python3.11 --version
```

Note: `python3` on your Mac might still point to 3.9 or 3.12. We call `python3.11` explicitly to be precise.

---

## PostgreSQL 16

### Check if installed

```bash
psql --version
```

**YES — prints `psql (PostgreSQL) 16.x`:**  
Check if it is running:
```bash
pg_isready -h localhost
```

- If it prints `localhost:5432 - accepting connections` → running, nothing to do.
- If it prints `no response` or `connection refused` → installed but not running:
  ```bash
  brew services start postgresql@16
  ```
  Wait 5 seconds, then run `pg_isready` again.

**YES — different version (14, 15):**  
Install 16 alongside it:
```bash
brew install postgresql@16
brew services start postgresql@16
```

Add to `~/.zshrc`:
```bash
export PATH=$(brew --prefix postgresql@16)/bin:$PATH
```

Apply: `source ~/.zshrc`

**NO — command not found:**

```bash
brew install postgresql@16
brew services start postgresql@16
```

Add to `~/.zshrc`:
```bash
export PATH=$(brew --prefix postgresql@16)/bin:$PATH
```

Apply: `source ~/.zshrc`

Verify:
```bash
pg_isready -h localhost
# localhost:5432 - accepting connections
```

---

## Neo4j

### Check if installed

```bash
brew list | grep neo4j
```

**YES — in the list:**  
Check if running:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:7474
```

- Prints `200` → running, nothing to do.
- Prints nothing or error → not running:
  ```bash
  brew services start neo4j
  ```
  Wait 20 seconds (Neo4j is slow to start), then check again.

**NO — not in the list:**

```bash
brew install neo4j
brew services start neo4j
```

Wait 20 seconds. Verify:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:7474
# 200
```

### First time password setup

If you just installed Neo4j or just started it for the first time, you must set a password before any service can connect.

Open `http://localhost:7474` in your browser.  
Login: username `neo4j`, password `neo4j`.  
It will immediately force you to change the password.  
Set it to the value you will put in `.env.local` for `neoPwd` (see `setup/step-01-credentials.md`).

---

## MongoDB

### Check if installed

```bash
mongosh --version
```

**YES — prints a version:**  
Check if running:
```bash
mongosh --eval "db.adminCommand('ping').ok" --quiet
```

- Prints `1` → running, nothing to do.
- Prints error → not running:
  ```bash
  brew services start mongodb-community@8.0
  ```
  Wait 5 seconds, then check again.

**NO — command not found:**

```bash
brew tap mongodb/brew
brew install mongodb-community@8.0
brew services start mongodb-community@8.0
```

Verify:
```bash
mongosh --eval "db.adminCommand('ping').ok" --quiet
# 1
```

---

## Kafka + Schema Registry (Confluent Community)

Kafka has two parts: the **broker** (handles messages) and **Schema Registry** (validates Avro message formats). The services use Confluent's Avro serializer which requires Schema Registry — Apache Kafka alone is not enough.

We use the Confluent Community distribution, which bundles both.

### Check if already downloaded

```bash
ls ~/tools/confluent-7.7.1/bin/kafka-server-start 2>/dev/null && echo "PRESENT" || echo "NOT FOUND"
```

**PRESENT:**  
Check if `CONFLUENT_HOME` is in your path:
```bash
which kafka-server-start
```

- Prints a path → you are good.
- Command not found → add to `~/.zshrc`:
  ```bash
  export CONFLUENT_HOME=~/tools/confluent-7.7.1
  export PATH=$PATH:$CONFLUENT_HOME/bin
  ```
  Apply: `source ~/.zshrc`

**NOT FOUND — download and install:**

```bash
mkdir -p ~/tools
cd ~/tools
curl -O https://packages.confluent.io/archive/7.7/confluent-community-7.7.1.tar.gz
tar -xzf confluent-community-7.7.1.tar.gz
```

Add to `~/.zshrc`:
```bash
export CONFLUENT_HOME=~/tools/confluent-7.7.1
export PATH=$PATH:$CONFLUENT_HOME/bin
```

Apply: `source ~/.zshrc`

Verify binaries are accessible:
```bash
which kafka-server-start    # should print a path
which schema-registry-start # should print a path
```

### Check if running

Kafka and Schema Registry are started manually in terminals (not as brew services). They are running if these return data:

```bash
# Kafka running?
kafka-topics --bootstrap-server localhost:9092 --list > /dev/null 2>&1 && echo "Kafka: RUNNING" || echo "Kafka: NOT RUNNING"

# Schema Registry running?
curl -s http://localhost:8081/subjects > /dev/null 2>&1 && echo "Schema Registry: RUNNING" || echo "Schema Registry: NOT RUNNING"
```

If either is not running, start them via `setup/step-05-kafka.md`.

---

## Final check — run everything at once

Once you have worked through all items above, run this to confirm the full picture:

```bash
echo "=== Runtime Tools ==="
java -version 2>&1 | head -1
node --version
go version
python3.11 --version

echo ""
echo "=== Databases ==="
pg_isready -h localhost && echo "PostgreSQL: OK" || echo "PostgreSQL: NOT RUNNING"
curl -s -o /dev/null -w "Neo4j: %{http_code}\n" http://localhost:7474
mongosh --eval "db.adminCommand('ping').ok" --quiet 2>/dev/null | grep -q 1 && echo "MongoDB: OK" || echo "MongoDB: NOT RUNNING"

echo ""
echo "=== Kafka ==="
kafka-topics --bootstrap-server localhost:9092 --list > /dev/null 2>&1 && echo "Kafka: OK" || echo "Kafka: NOT RUNNING"
curl -s http://localhost:8081/subjects > /dev/null 2>&1 && echo "Schema Registry: OK" || echo "Schema Registry: NOT RUNNING"
```

Expected output:
```
=== Runtime Tools ===
openjdk version "21.x.x" ...
v20.x.x
go version go1.22.x darwin/arm64
Python 3.11.x

=== Databases ===
localhost:5432 - accepting connections
PostgreSQL: OK
Neo4j: 200
MongoDB: OK

=== Kafka ===
Kafka: OK
Schema Registry: OK
```

Everything must show OK or a valid version before you move on.

---

## Next

Go to `setup/step-01-credentials.md`
