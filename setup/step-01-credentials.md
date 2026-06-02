# Step 01 — Credentials

## What this step does

Creates the single credentials file that every service reads secrets from. One file, one place — all services share the same JWT secret and database credentials.

## Why we do this

Every service in this system needs two categories of secrets:
1. **JWT secret** — the signing key used to create and validate login tokens. Every service must have the exact same value. If even one service has a different value, tokens issued by user-service will be rejected by posts-service or the api-gateway.
2. **Database credentials** — the username and password for connecting to PostgreSQL, Neo4j, and MongoDB.

Rather than hardcoding these in config files (which would get committed to git), we store them in `.env.local` — a file that is listed in `.gitignore` and never committed. When we start a service, we load this file into the shell environment, and Spring Boot / Node / Go / Python each read the values from environment variables.

This is the same pattern you will use on EC2 later — except the file will live at `/etc/collabsphere/env` or in AWS Secrets Manager instead of your laptop. The concept is identical: separate secrets from code.

## Create the file

From the project root:

```bash
cp .env.local.example .env.local
```

Now open `.env.local` in your editor and fill in every value.

### JWT secret

Generate a cryptographically random secret:

```bash
openssl rand -hex 32
```

Copy the 64-character output and paste it as the value for `secret`. It will look like:

```
secret=a3f8c2e1d7b4...
```

This value must be at least 32 characters. It is the master key — every service that validates a JWT uses this to check the signature.

### PostgreSQL credentials

Pick a username and password. These will be the credentials for the `collabsphere` PostgreSQL user we create in the next step.

```
dbuserId=collabsphere
dbuserpwd=SomeStrongPassword1
```

Rules: at least 8 characters, mix of letters and numbers. Write it down — you will need it in Step 02.

### Neo4j credentials

The default Neo4j username is always `neo4j`. You set the password when you first open the Neo4j browser (covered in Step 03). Whatever password you set there, write it here.

```
neoUserId=neo4j
neoPwd=AnotherStrongPassword1
```

### MongoDB credentials

Pick a username and password for the MongoDB user we will create in Step 04.

```
mongoUserId=collabsphere
mongoUserPwd=MongoPassword1
```

### Admin and seed accounts

```
ADMIN_EMAIL=admin@example.com
SEED_DEFAULT_PASSWORD=Devops123
```

`SEED_DEFAULT_PASSWORD` must satisfy the app's password policy: 8+ characters, no spaces, at least one uppercase letter, at least one number.

user-service will automatically create demo user accounts on its first boot using this password. If you leave it blank, no demo accounts are created and you will need to register manually.

## How services read these values

### Java services (user-service, posts-service, connections-service, api-gateway)

Spring Boot reads environment variables directly. When `application.properties` contains:
```
spring.datasource.username=${dbuserId}
```
Spring substitutes the value of the `dbuserId` environment variable at startup.

You make the variables available by sourcing the file before running the service:
```bash
set -a && source .env.local && set +a
```

`set -a` tells the shell to export every variable it sets. `source .env.local` runs the file in the current shell. `set +a` stops the auto-export. After this, all `.env.local` values are in the environment for that terminal session.

**You must do this in every terminal where you start a Java service.**

### Node.js / Go / Python services

These services read from their own `.env` file inside the service directory. We create those files from the root `.env.local` values in the relevant setup steps. The `.env` files are also gitignored.

## Verify

```bash
cat .env.local
```

Confirm every value is filled in — no empty `=` signs. If you see `secret=` with nothing after it, that variable is not set and the service will crash on startup.

---

→ Next: `setup/step-02-postgres.md`
