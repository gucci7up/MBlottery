# Base de Datos

## Motor

**PostgreSQL** gestionado a través de **Prisma ORM**.

Todas las migraciones se generan con `prisma migrate dev` y deben versionarse en el repositorio. Nunca modificar el esquema directamente en producción sin una migración.

---

## Entidades Principales

### `User`
Usuarios del sistema (administradores, cajeros, supervisores).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `email` | String | único |
| `passwordHash` | String | bcrypt |
| `role` | Enum | `ADMIN`, `SUPERVISOR`, `CASHIER` |
| `branchId` | UUID | FK → Branch |
| `active` | Boolean | |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

---

### `Branch`
Bancas de apuestas registradas en el sistema.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `name` | String | |
| `code` | String | único, código corto |
| `address` | String | opcional |
| `phone` | String | opcional |
| `active` | Boolean | |
| `createdAt` | DateTime | |

---

### `LotteryProvider`
Loterías disponibles (Nacional, Leidsa, Loteka, etc.).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `name` | String | nombre oficial |
| `code` | String | único, ej: `NAC`, `LEIDSA` |
| `country` | String | `DO`, `US`, `AI` |
| `active` | Boolean | |

---

### `Draw`
Sorteo específico de una lotería en una fecha/hora dada.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `providerId` | UUID | FK → LotteryProvider |
| `name` | String | ej: "Nacional Mediodía" |
| `scheduledAt` | DateTime | hora programada |
| `closedAt` | DateTime | cierre de venta |
| `status` | Enum | `OPEN`, `CLOSED`, `RESULTED` |
| `createdAt` | DateTime | |

---

### `DrawResult`
Resultados publicados para un sorteo.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `drawId` | UUID | FK → Draw, único |
| `firstPrize` | String | número ganador principal |
| `secondPrize` | String | opcional |
| `thirdPrize` | String | opcional |
| `publishedAt` | DateTime | |
| `publishedBy` | UUID | FK → User |

---

### `Ticket`
Ticket de apuesta emitido por una banca.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `ticketNumber` | String | único, legible (ej: `B001-00123`) |
| `branchId` | UUID | FK → Branch |
| `cashierId` | UUID | FK → User |
| `drawId` | UUID | FK → Draw |
| `totalAmount` | Decimal | monto total apostado |
| `potentialPrize` | Decimal | calculado en servidor |
| `status` | Enum | `ACTIVE`, `PAID`, `CANCELLED`, `EXPIRED` |
| `qrCode` | String | contenido del QR |
| `printedAt` | DateTime | |
| `cancelledAt` | DateTime | nullable |
| `cancelledBy` | UUID | nullable, FK → User |
| `createdAt` | DateTime | |

---

### `Bet`
Jugada individual dentro de un ticket.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `ticketId` | UUID | FK → Ticket |
| `drawId` | UUID | FK → Draw |
| `modality` | Enum | `QUINIELA`, `PALE`, `TRIPLETA`, `SUPER_PALE` |
| `numbers` | String[] | números apostados |
| `amount` | Decimal | monto de esta jugada |
| `multiplier` | Decimal | factor de pago |
| `potentialPrize` | Decimal | calculado en servidor |

---

### `Payment`
Registro del pago de un premio.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `ticketId` | UUID | FK → Ticket, único |
| `amount` | Decimal | monto pagado |
| `paidBy` | UUID | FK → User |
| `paidAt` | DateTime | |
| `notes` | String | opcional |

---

### `AuditLog`
Registro de auditoría para operaciones críticas.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `userId` | UUID | FK → User |
| `action` | String | ej: `TICKET_CANCEL`, `PAYMENT_REGISTER` |
| `entity` | String | entidad afectada |
| `entityId` | UUID | ID del registro afectado |
| `metadata` | JSON | datos antes/después |
| `createdAt` | DateTime | |

---

### `BetLimit`
Límites de apuesta por número y por banca.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `branchId` | UUID | FK → Branch, nullable (global si null) |
| `drawId` | UUID | FK → Draw, nullable |
| `modality` | Enum | modalidad afectada |
| `number` | String | número limitado, nullable (aplica a todos si null) |
| `maxAmount` | Decimal | monto máximo permitido |

---

## Convenciones

- Todas las PKs son UUID v4.
- Todos los montos monetarios usan tipo `Decimal` (nunca `Float`).
- Los campos `createdAt` / `updatedAt` se gestionan automáticamente con `@default(now())` y `@updatedAt`.
- Nunca eliminar migraciones existentes; solo agregar nuevas.
- Los índices sobre campos de búsqueda frecuente (`ticketNumber`, `branchId`, `drawId`) deben declararse explícitamente.
