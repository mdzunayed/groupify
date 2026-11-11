#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

export POSTGRES_PASSWORD
POSTGRES_PASSWORD=$(node -e "process.stdout.write(require('crypto').randomBytes(24).toString('hex'))")
export POSTGRES_PORT
POSTGRES_PORT=$(node -e "const s=require('net').createServer();s.listen(0,'127.0.0.1',()=>{process.stdout.write(String(s.address().port));s.close()})")
export REDIS_PORT
REDIS_PORT=$(node -e "const s=require('net').createServer();s.listen(0,'127.0.0.1',()=>{process.stdout.write(String(s.address().port));s.close()})")
project_name="groupify-test-$(node -e "process.stdout.write(require('crypto').randomBytes(8).toString('hex'))")"
if docker volume inspect "${project_name}_database" >/dev/null 2>&1 ||
  docker network inspect "${project_name}_default" >/dev/null 2>&1 ||
  docker container inspect "${project_name}-database-1" >/dev/null 2>&1 ||
  docker container inspect "${project_name}-redis-1" >/dev/null 2>&1; then
  printf 'Temporary test project name is already in use.\n' >&2
  exit 1
fi
trap 'docker compose -p "$project_name" down --volumes >/dev/null 2>&1 || true' EXIT

export DATABASE_URL="postgresql://groupify:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT}/groupify"
export DATABASE_URL_WITHOUT_POSTGIS="postgresql://groupify:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT}/groupify_without_postgis"
export DATABASE_URL_WITHOUT_MIGRATIONS="postgresql://groupify:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT}/groupify_without_migrations"
export DATABASE_URL_WITH_PENDING_MIGRATIONS="postgresql://groupify:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT}/groupify_pending_migrations"
export REDIS_URL="redis://127.0.0.1:${REDIS_PORT}"

docker compose -p "$project_name" up -d --wait --wait-timeout 60
docker compose -p "$project_name" exec -T database psql -U groupify -d postgres \
  -c 'CREATE DATABASE groupify_without_postgis TEMPLATE template0;'
docker compose -p "$project_name" exec -T database psql -U groupify -d postgres \
  -c 'CREATE DATABASE groupify_without_migrations TEMPLATE template0;'
docker compose -p "$project_name" exec -T database psql -U groupify -d postgres \
  -c 'CREATE DATABASE groupify_pending_migrations TEMPLATE template0;'
docker compose -p "$project_name" exec -T database psql -U groupify -d groupify_without_migrations \
  -c 'CREATE EXTENSION postgis;'
docker compose -p "$project_name" exec -T database psql -U groupify -d groupify_pending_migrations \
  -c 'CREATE EXTENSION postgis;'
DATABASE_URL="$DATABASE_URL_WITH_PENDING_MIGRATIONS" npm run migrate:up
DATABASE_URL="$DATABASE_URL_WITH_PENDING_MIGRATIONS" npm run migrate:down
npm run migrate:up
npm run migrate:up
npm run migrate:down
npm run migrate:up
npm run test:integration
