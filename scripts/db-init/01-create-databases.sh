#!/usr/bin/env bash
# Runs inside the postgres container on first boot.
# Creates all per-service databases if they do not already exist.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  SELECT 'CREATE DATABASE collabsphere_users'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'collabsphere_users')\gexec

  SELECT 'CREATE DATABASE collabsphere_posts'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'collabsphere_posts')\gexec

  SELECT 'CREATE DATABASE collabsphere_notifications'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'collabsphere_notifications')\gexec

  SELECT 'CREATE DATABASE collabsphere_spheres'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'collabsphere_spheres')\gexec

EOSQL

echo "[db-init] All CollabSphere databases are ready."
