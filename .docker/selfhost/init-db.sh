#!/bin/bash
set -e

# Start PostgreSQL in the background
docker-entrypoint.sh postgres &
PG_PID=$!

# Wait for PostgreSQL to be ready
until pg_isready -U postgres; do
  echo "Waiting for PostgreSQL to start..."
  sleep 1
done

# Create the affine user and database if they don't exist
psql -U postgres <<-EOSQL
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${POSTGRES_USER:-affine}') THEN
      CREATE USER ${POSTGRES_USER:-affine} WITH PASSWORD '${POSTGRES_PASSWORD:-affine}' CREATEDB;
    END IF;
  END
  \$\$;

  SELECT 'CREATE DATABASE ${POSTGRES_DB:-affine} OWNER ${POSTGRES_USER:-affine}'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${POSTGRES_DB:-affine}')\\gexec
EOSQL

echo "Database initialization complete"

# Wait for the PostgreSQL process
wait $PG_PID