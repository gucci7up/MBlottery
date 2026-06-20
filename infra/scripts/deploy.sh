#!/bin/bash
# Script de deploy a producción
# Uso: ./infra/scripts/deploy.sh [--seed]

set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE="docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml"

echo "🚀 Iniciando deploy — $(date)"
cd "$APP_DIR"

# Cargar variables de entorno
if [ ! -f .env ]; then
  echo "❌ Archivo .env no encontrado. Copia .env.example y configura las variables."
  exit 1
fi
set -a; source .env; set +a

# ─── 1. Pull de código ────────────────────────────────────────────────────────
echo "📦 Actualizando código..."
git pull origin main

# ─── 2. Backup previo al deploy ───────────────────────────────────────────────
echo "💾 Backup de base de datos..."
$COMPOSE exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | \
  gzip > "/backups/pre_deploy_$(date +%Y%m%d_%H%M%S).sql.gz" || \
  echo "⚠️  Backup falló (DB puede estar inactiva)"

# ─── 3. Build de imágenes ────────────────────────────────────────────────────
echo "🏗️  Building imágenes Docker..."
$COMPOSE build --no-cache backend worker

# ─── 4. Migraciones ──────────────────────────────────────────────────────────
echo "🗃️  Aplicando migraciones Prisma..."
$COMPOSE run --rm backend npx prisma migrate deploy

# ─── 5. Seed inicial (solo si se pasa --seed) ────────────────────────────────
if [[ "${1:-}" == "--seed" ]]; then
  echo "🌱 Ejecutando seed..."
  $COMPOSE run --rm backend npm run prisma:seed
fi

# ─── 6. Rolling restart ──────────────────────────────────────────────────────
echo "🔄 Reiniciando servicios..."
$COMPOSE up -d --no-deps --remove-orphans backend worker nginx

# ─── 7. Health check ─────────────────────────────────────────────────────────
echo "🩺 Verificando salud del sistema..."
sleep 10
if curl -sf "http://localhost/api/health" > /dev/null; then
  echo "✅ Backend respondiendo correctamente"
else
  echo "❌ Backend no responde — revisando logs..."
  $COMPOSE logs --tail=50 backend
  exit 1
fi

echo "✅ Deploy completado exitosamente — $(date)"
