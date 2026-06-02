# Step 10 — spheres-service

**Language:** Node.js (Express)  
**Port:** 8009  
**Database:** PostgreSQL (`collabsphere_spheres`)  
**Kafka:** None  
**No calls to other services**

## What this service does

Spheres are community spaces — similar to subreddits. Users can create spheres, post inside them, comment, and vote. This service is self-contained: it does not publish Kafka events and does not call any other service.

## Why Node.js for this service

This project uses a different language for each service intentionally. Node.js is a natural fit for a REST API that does mostly database reads and writes — it is non-blocking and handles concurrent requests efficiently with a small memory footprint. Express is minimal and gets out of the way.

The service also uses its own PostgreSQL database (`collabsphere_spheres`) completely separate from what user-service and posts-service use. The data models for spheres (communities, membership, sphere-level posts) are different enough that isolation makes sense.

## Why it needs a migration script

Unlike the Java services that use Spring JPA to auto-create tables, spheres-service is plain Node.js with no ORM. It uses the `pg` library (raw PostgreSQL driver) and a migration script that creates the schema by running SQL from `src/db/schema.sql`.

You run the migration once. After that, starting the service does not touch the schema.

## Step 1: Create the service .env file

This service does not read from the shell environment — it reads from a `.env` file inside its own directory. Create it from your root credentials:

```bash
set -a && source /path/to/CollabSphereApp/.env.local && set +a

cat > /path/to/CollabSphereApp/spheres-service/.env << EOF
PORT=8009
DATABASE_URL=postgresql://${dbuserId}:${dbuserpwd}@localhost:5432/collabsphere_spheres
JWT_SECRET=${secret}
EOF
```

Verify the file was created with real values (not variable names):

```bash
cat /path/to/CollabSphereApp/spheres-service/.env
```

You should see the actual password and secret, not `${dbuserpwd}`.

## Step 2: Install Node.js dependencies

```bash
cd /path/to/CollabSphereApp/spheres-service
npm install
```

This reads `package.json` and installs all dependencies into `node_modules/`. This only needs to run once (or when `package.json` changes).

## Step 3: Run the database migration

The migration reads `src/db/schema.sql` and creates tables in `collabsphere_spheres`.

```bash
node src/db/migrate.js
```

Expected output ends with success. No errors.

Verify the tables were created:

```bash
psql -U collabsphere -d collabsphere_spheres -c "\dt"
```

You should see a list of tables: `spheres`, `sphere_posts`, `sphere_comments`, `votes`, `members`, etc. If the table list is empty, the migration failed — check that the `DATABASE_URL` in `.env` is correct.

## Step 4: Run the service

Open a new terminal:

```bash
cd /path/to/CollabSphereApp/spheres-service
npm start
```

Expected:
```
[spheres-service] Listening on :8009
```

## Verify

```bash
curl http://localhost:8009/actuator/health
```

Expected:
```json
{"status":"UP"}
```

## How authentication works here

spheres-service validates JWTs on its own — it does not call user-service to check tokens. It uses the `jsonwebtoken` npm package with the same `JWT_SECRET` you put in `.env`. Since every service uses the same secret, a token issued by user-service is valid here too. This is how a shared secret enables trust across services.

---

→ Next: `setup/step-11-messages-service.md`
