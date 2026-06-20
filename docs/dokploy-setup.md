# Configuración en Dokploy — Opción 2 (Apps separadas)

## Arquitectura en producción

```
Cloudflare DNS
  ├── api.tu-dominio.com    → App Backend  (puerto 3000)
  ├── app.tu-dominio.com    → App Frontend / POS (puerto 80)
  └── admin.tu-dominio.com  → App Admin Panel (puerto 80)
```

---

## 1. App — Backend (NestJS)

| Campo | Valor |
|---|---|
| Tipo | **Application** |
| Proveedor | GitHub |
| Repositorio | `gucci7up/MBlottery` |
| Rama | `main` |
| **Root Directory** | `apps/backend` |
| Build Type | **Dockerfile** |
| Dockerfile Path | `Dockerfile` |
| Puerto | `3000` |

### Variables de entorno del Backend

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://usuario:password@host:5432/sistema_banca
JWT_SECRET=<generar con generate-secrets.sh>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
TICKET_SIGNING_KEY=<generar con generate-secrets.sh>
REDIS_HOST=<host de tu Redis>
REDIS_PORT=6379
REDIS_PASSWORD=<generar con generate-secrets.sh>
FRONTEND_URL=https://app.tu-dominio.com
AUTO_RESULTS_ENABLED=false
```

### Dominio
- Agregar dominio: `api.tu-dominio.com`
- Activar SSL (Let's Encrypt) en Dokploy

---

## 3. App — Admin Panel (React)

| Campo | Valor |
|---|---|
| Tipo | **Application** |
| Proveedor | GitHub |
| Repositorio | `gucci7up/MBlottery` |
| Rama | `main` |
| **Root Directory** | `apps/admin` |
| Build Type | **Dockerfile** |
| Dockerfile Path | `Dockerfile` |
| Puerto | `80` |

### Build Arguments del Admin

```
VITE_API_URL=https://api.tu-dominio.com
VITE_WS_URL=wss://api.tu-dominio.com
```

### Dominio
- Agregar dominio: `admin.tu-dominio.com`
- Activar SSL (Let's Encrypt) en Dokploy

### Roles con acceso al admin
- `SUPER_ADMIN` — acceso total
- `OPERATOR_ADMIN` — gestión de su operador
- `BRANCH_OWNER` — solo lectura de sus bancas
- `BRANCH_MANAGER` — gestión de su banca
- `SUPERVISOR` — operaciones de caja y resultados

> El rol `CASHIER` no puede acceder al panel admin.

---

## 2. App — Frontend (React)

| Campo | Valor |
|---|---|
| Tipo | **Application** |
| Proveedor | GitHub |
| Repositorio | `gucci7up/MBlottery` |
| Rama | `main` |
| **Root Directory** | `apps/frontend` |
| Build Type | **Dockerfile** |
| Dockerfile Path | `Dockerfile` |
| Puerto | `80` |

### Build Arguments del Frontend

En Dokploy → Build Arguments (no son env vars, son args de Docker):

```
VITE_API_URL=https://api.tu-dominio.com
VITE_WS_URL=wss://api.tu-dominio.com
```

> ⚠️ Importante: los valores `VITE_*` se bajan **en el momento del build**, no en runtime. Si cambias el dominio del backend, debes hacer rebuild del frontend.

### Dominio
- Agregar dominio: `app.tu-dominio.com`
- Activar SSL (Let's Encrypt) en Dokploy

---

## 3. Base de datos y Redis

Dokploy tiene templates para PostgreSQL y Redis. Créalos desde el panel:

- **PostgreSQL** → copiar la DATABASE_URL generada al backend
- **Redis** → copiar HOST, PORT y PASSWORD al backend

---

## 4. Orden del primer deploy

```
1. Crear PostgreSQL en Dokploy → copiar DATABASE_URL
2. Crear Redis en Dokploy → copiar credenciales
3. Deploy Backend (con todas las env vars configuradas)
4. Ejecutar migraciones desde la consola de Dokploy:
   npx prisma migrate deploy
5. Ejecutar seed:
   npm run prisma:seed
6. Deploy Frontend (con VITE_API_URL correcto)
7. Verificar: https://api.tu-dominio.com/health
```

---

## 5. Ejecutar comandos en el contenedor del Backend

En Dokploy → App Backend → Terminal (o consola):

```bash
# Migraciones
npx prisma migrate deploy

# Seed inicial
npm run prisma:seed

# Ver logs en tiempo real
# (disponible desde el panel de Dokploy)
```

---

## 6. Actualizaciones (deploy continuo)

Cada push a `main` puede disparar auto-deploy en Dokploy si lo configuras en:
- App → Settings → Auto Deploy → Enable

El frontend y backend se rebuildan de forma **independiente** al actualizar solo uno de ellos.

---

## Credenciales demo del seed

Después del `npm run prisma:seed`:

| Usuario | PIN | Rol |
|---|---|---|
| `superadmin` | `000000` | SUPER_ADMIN |
| `admin` | `1234` | OPERATOR_ADMIN |
| `sup_b001` | `5678` | SUPERVISOR |
| `caj_b001` | `9999` | CASHIER |
