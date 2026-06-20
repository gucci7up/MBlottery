#!/bin/bash
# Genera secretos seguros para el archivo .env
# Uso: bash infra/scripts/generate-secrets.sh

echo "# Variables generadas el $(date)"
echo "JWT_SECRET=$(openssl rand -base64 48)"
echo "TICKET_SIGNING_KEY=$(openssl rand -base64 48)"
echo "REDIS_PASSWORD=$(openssl rand -base64 24)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"
echo ""
echo "# Copia estos valores a tu .env y NO los compartas"
