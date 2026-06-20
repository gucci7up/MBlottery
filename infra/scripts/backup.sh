#!/bin/bash
# Backup automático de PostgreSQL
# Ejecutar diariamente vía cron: 0 2 * * * /app/infra/scripts/backup.sh

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
BACKUP_FILE="${BACKUP_DIR}/sistema_banca_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Iniciando backup..."

docker compose -f /app/infra/docker-compose.yml exec -T db \
  pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "$BACKUP_FILE"

echo "[$(date)] Backup completado: $BACKUP_FILE"

# Eliminar backups más viejos que RETENTION_DAYS
find "$BACKUP_DIR" -name "*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date)] Backups anteriores a ${RETENTION_DAYS} días eliminados"
