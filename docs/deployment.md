# Despliegue

## Infraestructura

| Componente | Tecnología |
|---|---|
| Contenedorización | Docker + Docker Compose |
| Gestión de despliegue | Dokploy |
| Base de datos | PostgreSQL (contenedor o managed) |
| Proxy / CDN | Cloudflare |

---

## Requisitos del Servidor

- **OS**: Linux (Ubuntu 22.04 LTS recomendado)
- **RAM**: mínimo 2 GB (4 GB recomendado)
- **CPU**: 2 vCPUs mínimo
- **Disco**: 20 GB mínimo (más espacio según volumen de datos)
- **Docker**: 24.x o superior
- **Docker Compose**: v2.x o superior

---

## Variables de Entorno

### Backend

```env
# Base de datos
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME

# Autenticación
JWT_SECRET=
JWT_EXPIRES_IN=7d

# Aplicación
NODE_ENV=production
PORT=3000

# Backups (opcional)
BACKUP_CRON=0 2 * * *
BACKUP_DESTINATION=
```

### Frontend

```env
VITE_API_URL=https://api.tusistema.com
```

> Nunca comprometer archivos `.env` en el repositorio. Usar Dokploy o un gestor de secretos para configurarlos en producción.

---

## Estructura de Contenedores (Docker Compose)

```yaml
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL
      - JWT_SECRET
    depends_on:
      - db
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    restart: unless-stopped

  db:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER
      - POSTGRES_PASSWORD
      - POSTGRES_DB
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## Proceso de Despliegue

### Primera vez

```bash
# 1. Clonar el repositorio en el servidor
git clone <repo-url>
cd sistema-banca

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con valores de producción

# 3. Ejecutar migraciones
docker compose run --rm backend npx prisma migrate deploy

# 4. Levantar servicios
docker compose up -d
```

### Actualizaciones

```bash
# 1. Obtener cambios
git pull origin main

# 2. Rebuild de imágenes
docker compose build

# 3. Ejecutar migraciones pendientes
docker compose run --rm backend npx prisma migrate deploy

# 4. Reiniciar servicios
docker compose up -d
```

---

## Backups

- Backups automáticos de PostgreSQL programados diariamente.
- Frecuencia recomendada: **diaria**, a las 2:00 AM.
- Retención mínima recomendada: **30 días**.
- Los backups deben almacenarse en una ubicación externa al servidor (S3, Backblaze, etc.).

### Comando manual de backup

```bash
docker compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup_$(date +%Y%m%d).sql
```

### Restauración

```bash
docker compose exec -T db psql -U $POSTGRES_USER $POSTGRES_DB < backup_YYYYMMDD.sql
```

---

## Monitoreo

- Revisar logs de contenedores regularmente desde el panel de Dokploy.
- Configurar alertas para caídas de servicio.
- Monitorear el espacio en disco, especialmente el volumen de PostgreSQL.

```bash
# Ver logs del backend en tiempo real
docker compose logs -f backend

# Estado de contenedores
docker compose ps
```

---

## Rollback

En caso de falla tras un despliegue:

```bash
# Volver a la imagen anterior (si se etiquetaron)
docker compose down
git checkout <commit-anterior>
docker compose build
docker compose up -d
```

> Si hay migraciones de base de datos nuevas que deben revertirse, aplicar migración inversa manual antes del rollback del código.

---

## Checklist de Despliegue a Producción

- [ ] Variables de entorno configuradas correctamente
- [ ] Migraciones de base de datos ejecutadas sin error
- [ ] Certificados SSL activos en Cloudflare
- [ ] Backup de la base de datos tomado antes del despliegue
- [ ] Prueba de login y venta de ticket en producción
- [ ] Prueba de impresión de ticket
- [ ] Prueba de pago de premio
