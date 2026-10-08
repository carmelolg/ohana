#!/usr/bin/env bash
# Deploy di Ohana su Cloudflare: frontend (Pages) e Worker.
# Uso: bash scripts/deploy.sh [web|worker|all] [--skip-checks]
#   web      costruisce e pubblica il frontend
#   worker   pubblica il Worker e controlla /health
#   all      entrambi (default)
set -euo pipefail

PAGES_PROJECT="ohana"
PAGES_BRANCH="main"
WEB_ENV="apps/web/.env.production"
REQUIRED_WEB_VARS=(VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY VITE_VAPID_PUBLIC_KEY VITE_WORKER_URL)

cd "$(dirname "$0")/.."

target="all"
skip_checks="no"
for arg in "$@"; do
  case "$arg" in
    web | worker | all) target="$arg" ;;
    --skip-checks) skip_checks="yes" ;;
    *)
      echo "Argomento sconosciuto: $arg" >&2
      echo "Uso: bash scripts/deploy.sh [web|worker|all] [--skip-checks]" >&2
      exit 1
      ;;
  esac
done

step() { printf '\n==> %s\n' "$1"; }

run_checks() {
  step "Verifiche: typecheck, lint, formato, test"
  pnpm typecheck
  pnpm lint
  pnpm format:check
  pnpm test
}

# Le variabili VITE_* sono lette in fase di build: se mancano o sono segnaposto, la app online parte rotta.
check_web_env() {
  if [ ! -f "$WEB_ENV" ]; then
    echo "Manca $WEB_ENV: crealo con ${REQUIRED_WEB_VARS[*]}" >&2
    exit 1
  fi
  for name in "${REQUIRED_WEB_VARS[@]}"; do
    value="$(grep -E "^${name}=" "$WEB_ENV" | head -n1 | cut -d= -f2-)"
    if [ -z "$value" ] || [[ "$value" == INCOLLA_QUI* ]]; then
      echo "$name non è valorizzata in $WEB_ENV" >&2
      exit 1
    fi
  done
}

deploy_web() {
  check_web_env
  step "Build del frontend"
  pnpm build
  step "Pubblicazione su Cloudflare Pages ($PAGES_PROJECT)"
  (cd apps/web && npx wrangler pages deploy dist --project-name "$PAGES_PROJECT" --branch "$PAGES_BRANCH" --commit-dirty=true)
}

deploy_worker() {
  step "Pubblicazione del Worker"
  (cd apps/worker && npx wrangler deploy)
  worker_url="$(grep -E '^WORKER_URL' apps/worker/wrangler.toml | sed -E 's/.*"(.*)".*/\1/')"
  step "Controllo $worker_url/health"
  curl --fail --silent --show-error --max-time 20 "$worker_url/health"
  echo
}

if [ "$skip_checks" = "no" ]; then
  run_checks
fi

case "$target" in
  web) deploy_web ;;
  worker) deploy_worker ;;
  all)
    deploy_worker
    deploy_web
    ;;
esac

step "Fatto"
