# Step 02 — PostgreSQL

## What this step does

Creates the database user and the databases that four services will connect to. PostgreSQL must be installed and running (covered in PREREQUISITES.md).

## Why PostgreSQL and not one database per service

In an ideal microservices design each service owns its own isolated database — no sharing. Here we run all databases on the same PostgreSQL instance (your laptop), but we create **separate databases** for each service so the data is still logically separated. When you move to EC2, you could put each database on its own RDS instance or dedicated Postgres EC2 without changing any service code — just the connection string.

## Which services use PostgreSQL

| Service              | Connects to database          | How tables are created          |
|----------------------|-------------------------------|---------------------------------|
| user-service         | `postgres` (the default DB)   | Spring JPA creates automatically on first boot |
| posts-service        | `postgres` (the default DB)   | Spring JPA creates automatically on first boot |
| spheres-service      | `collabsphere_spheres`        | Node.js migration script (run manually) |
| notification-service | `collabsphere_notifications`  | Python asyncpg creates on first boot |

user-service and posts-service both connect to the default `postgres` database. Spring Boot's `ddl-auto=update` setting makes Hibernate inspect the schema and create or update tables when the service starts. You do not write SQL — the service manages its own schema.

## Create the database user

Connect to PostgreSQL as your Mac user (which has superuser access by default on a fresh brew install):

```bash
psql -U $(whoami) -d postgres
```

You will see the `postgres=#` prompt. Run each block below.

### Create the application user

```sql
CREATE USER collabsphere WITH PASSWORD 'your-dbuserpwd-value-here';
```

Replace `your-dbuserpwd-value-here` with the exact value of `dbuserpwd` in your `.env.local`.

### Grant access to the default database

user-service and posts-service connect to the `postgres` database. Grant the user access to it:

```sql
GRANT ALL PRIVILEGES ON DATABASE postgres TO collabsphere;
```

Then grant schema-level access (PostgreSQL 15+ requires this separately):

```sql
\c postgres
GRANT ALL ON SCHEMA public TO collabsphere;
```

### Create the spheres database

spheres-service needs its own isolated database:

```sql
\c postgres
CREATE DATABASE collabsphere_spheres OWNER collabsphere;
```

### Create the notifications database

notification-service needs its own isolated database:

```sql
CREATE DATABASE collabsphere_notifications OWNER collabsphere;
```

Exit psql:

```sql
\q
```

## Verify each connection

Test each database connection that a service will use:

```bash
# user-service and posts-service connection
psql -U collabsphere -d postgres -c "SELECT current_user, current_database();"
```
Expected: one row showing `collabsphere` and `postgres`.

```bash
# spheres-service connection
psql -U collabsphere -d collabsphere_spheres -c "SELECT current_user, current_database();"
```
Expected: one row showing `collabsphere` and `collabsphere_spheres`.

```bash
# notification-service connection
psql -U collabsphere -d collabsphere_notifications -c "SELECT current_user, current_database();"
```
Expected: one row showing `collabsphere` and `collabsphere_notifications`.

If any of these fail with `role "collabsphere" does not exist` or `permission denied`, re-run the SQL above. If they fail with `connection refused`, PostgreSQL is not running — run `brew services start postgresql@16`.

## What about the `collabsphere_users` and `collabsphere_posts` databases?

The `scripts/db-init/` folder creates those databases. They are not currently used — user-service and posts-service point to the default `postgres` database. You can ignore them for now. When you later move to EC2 and want proper isolation, you would update `spring.datasource.url` in each service's `application.properties` to point to a dedicated database and these databases become relevant.

---

→ Next: `setup/step-03-neo4j.md`
