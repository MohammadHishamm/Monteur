#!/bin/sh
set -e

# Load env variables
if [ -f /app/.env ]; then
  set -a
  # Use sed to remove carriage returns before sourcing
  . <(sed 's/\r$//' /app/.env)
  set +a
fi

echo "Postgres assumed to be up - continuing"

# Goose config
export GOOSE_DRIVER=postgres
export GOOSE_DBSTRING="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"
export GOOSE_MIGRATION_DIR=./migrations

echo "GOOSE_DBSTRING = $GOOSE_DBSTRING"

# Run migrations
echo "Running migrations..."
goose -dir "$GOOSE_MIGRATION_DIR" up || echo "Migrations are up-to-date"

# Run seeder
echo "Running seeder..."
if /app/bin/seed; then
  echo "Seeder injected data successfully."
else
  echo "Seeder failed or already ran, continuing..."
fi

# Start API
echo "Starting API..."
exec ./bin/api