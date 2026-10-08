#!/usr/bin/env bash
# Esegue migrazioni + test RLS su un Postgres 15 usa-e-getta (serve Docker).
set -euo pipefail
cd "$(dirname "$0")"
NAME=ohana-rls-test
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --rm --name "$NAME" -e POSTGRES_PASSWORD=pw postgres:15-alpine >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT
until docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1; do sleep 0.5; done
sleep 1
run() { docker exec -i "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
run < 00_stub_auth.sql
for f in ../migrations/*.sql; do echo "-> $f"; run < "$f"; done
run -t < isolation.sql
