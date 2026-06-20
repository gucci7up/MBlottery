# Arquitectura del Sistema

## Visión General

Sistema monorepo fullstack para la gestión de bancas de lotería en República Dominicana. Soporta venta de quinielas, palés, tripletas y súper palés con integración a múltiples loterías nacionales e internacionales.

---

## Stack Tecnológico

### Frontend
- **React** + **TypeScript** — interfaz de usuario
- **Tailwind CSS** — estilos
- **Shadcn/UI** — componentes
- Compatibilidad con dispositivos móviles y pantallas táctiles
- Compatibilidad con impresora térmica Sunmi V2S

### Backend
- **NestJS** — framework principal
- **Prisma ORM** — acceso a base de datos
- **PostgreSQL** — base de datos relacional

### Infraestructura
- **Docker** — contenedorización
- **Dokploy** — despliegue y gestión de contenedores
- **Cloudflare** — DNS, proxy y protección

---

## Módulos del Backend

| Módulo | Responsabilidad |
|---|---|
| `Auth` | Autenticación JWT, sesiones, permisos |
| `Users` | Gestión de usuarios y roles |
| `Branches` | Administración de bancas |
| `Lottery Providers` | Loterías disponibles y sorteos |
| `Draws` | Sorteos, horarios y resultados |
| `Bets` | Registro y validación de apuestas |
| `Tickets` | Generación, impresión y anulación de tickets |
| `Results` | Ingreso y publicación de resultados |
| `Payments` | Cálculo y registro de premios pagados |
| `Reports` | Reportes de ventas, premios y cierre |
| `Dashboard` | Resúmenes y estadísticas en tiempo real |
| `Settings` | Configuración de límites, pagos y parámetros |

---

## Flujo Principal de una Apuesta

```
Usuario → Selecciona sorteo y modalidad
       → Ingresa números y monto
       → Validación de límites (servidor)
       → Creación de ticket
       → Impresión térmica (QR + detalle)
       → Registro en base de datos
```

---

## Flujo de Pago de Premio

```
Cajero → Escanea QR del ticket
       → Servidor valida ticket (estado, sorteo, resultado)
       → Calcula monto del premio (siempre en servidor)
       → Registra pago y marca ticket como cobrado
       → Imprime comprobante
```

---

## Reglas de Seguridad Arquitectónicas

- El cálculo de premios ocurre **únicamente en el servidor**; el cliente nunca envía montos de premios.
- Cada operación crítica (pago, anulación, cambio de límite) genera un registro de auditoría.
- Los límites por número y por banca se validan en el backend antes de confirmar cualquier apuesta.
- TypeScript en modo estricto en frontend y backend.

---

## Diagrama de Capas

```
┌──────────────────────────────────┐
│          Frontend (React)        │
│    Venta / Consulta / Reportes   │
└──────────────┬───────────────────┘
               │ HTTP / REST
┌──────────────▼───────────────────┐
│         Backend (NestJS)         │
│  Módulos: Auth, Bets, Tickets…   │
└──────────────┬───────────────────┘
               │ Prisma
┌──────────────▼───────────────────┐
│        PostgreSQL Database       │
└──────────────────────────────────┘
```

---

## Convenciones de Desarrollo

- Arquitectura modular: cada dominio en su propio módulo NestJS.
- Todo cambio de esquema de base de datos requiere migración Prisma.
- No duplicar lógica de negocio entre módulos; usar servicios compartidos.
- Documentar cualquier nueva regla de negocio en `docs/`.
