# Tickets

## Descripción

Un ticket representa un comprobante de apuesta emitido por una banca. Agrupa una o más jugadas (`Bet`) para un sorteo específico y es el instrumento mediante el cual se reclaman los premios.

---

## Ciclo de Vida

```
ACTIVE → (sorteo resulta, ticket gana) → PAID
ACTIVE → (sorteo resulta, ticket no gana) → ACTIVE (no premiado)
ACTIVE → (anulado antes del cierre) → CANCELLED
ACTIVE → (no cobrado dentro del período de vigencia) → EXPIRED
```

| Estado | Descripción |
|---|---|
| `ACTIVE` | Emitido y vigente; puede ser ganador o no premiado |
| `PAID` | Premio cobrado; no puede volver a pagarse |
| `CANCELLED` | Anulado antes del cierre del sorteo |
| `EXPIRED` | No cobrado dentro del período de vigencia |

---

## Generación de un Ticket

### Flujo
```
1. Cajero selecciona sorteo y modalidad.
2. Ingresa los números y el monto de cada jugada.
3. El sistema valida:
   - Sorteo en estado OPEN y dentro del horario de venta.
   - Números válidos para la modalidad.
   - Monto dentro de los límites configurados.
4. El servidor calcula el premio potencial total.
5. Se crea el ticket con estado ACTIVE.
6. Se genera el número de ticket (ej: B001-00123).
7. Se genera el contenido del QR (UUID del ticket).
8. Se imprime el ticket en la Sunmi V2S.
```

### Número de Ticket
Formato legible: `{CódigoBanca}-{Secuencial}` — por ejemplo, `B001-00123`.
El secuencial es incremental por banca y se reinicia opcionalmente por período.

---

## Contenido Impreso

```
┌─────────────────────────────────┐
│        BANCA LOS LAURELES       │
│   Tel: 809-XXX-XXXX             │
├─────────────────────────────────┤
│ Ticket:  B001-00123             │
│ Fecha:   19/06/2026  10:35 AM   │
│ Cajero:  Juan Pérez             │
├─────────────────────────────────┤
│ SORTEO: Nacional Mediodía       │
├─────────────────────────────────┤
│ QUINIELA    23      RD$50.00    │
│ QUINIELA    45      RD$50.00    │
│ PALÉ        12-34   RD$20.00    │
├─────────────────────────────────┤
│ Total apostado:      RD$120.00  │
│ Premio potencial:  RD$8,200.00  │
├─────────────────────────────────┤
│          [  QR CODE  ]          │
├─────────────────────────────────┤
│  Únicamente se pagarán premios  │
│  presentando el ticket original │
│  en buen estado.                │
└─────────────────────────────────┘
```

---

## Código QR

- El QR codifica el UUID interno del ticket (`Ticket.id`).
- El cajero escanea el QR al momento del cobro para localizar el ticket de forma rápida y sin errores.
- El QR no debe incluir información sensible ni el monto del premio.

---

## Anulación de Tickets

### Condiciones
- El sorteo asociado debe estar en estado `OPEN`.
- Solo puede anularse un ticket con estado `ACTIVE`.
- Requiere rol `SUPERVISOR` o `ADMIN`.

### Flujo
```
1. Supervisor ingresa o escanea el número/QR del ticket.
2. El sistema verifica que el sorteo siga abierto.
3. El supervisor confirma la anulación.
4. El ticket cambia a CANCELLED.
5. Se registra en AuditLog: userId, acción, motivo opcional.
```

### Restricciones
- Un ticket `CANCELLED` no puede reactivarse ni pagarse.
- La anulación no genera devolución automática de efectivo; el cajero debe gestionarla manualmente.

---

## Validación al Momento del Pago

Cuando un cajero intenta cobrar un ticket, el servidor verifica en este orden:

1. El ticket existe.
2. Estado `ACTIVE` (no PAID, CANCELLED ni EXPIRED).
3. El sorteo está en `RESULTED`.
4. Los números del ticket coinciden con el `DrawResult` del sorteo.
5. El premio calculado es mayor a `0`.

Si todas las validaciones pasan, se procede al pago (ver [payout-rules.md](./payout-rules.md)).

---

## Seguridad

- El `potentialPrize` se calcula siempre en el servidor; el cliente no puede enviarlo.
- El QR solo contiene el UUID; cualquier manipulación del QR genera un error de "ticket no encontrado".
- Cada intento de cobro fallido queda registrado en `AuditLog`.
- Los tickets expirados requieren autorización de `ADMIN` para ser procesados.

---

## Reportes Relacionados

| Reporte | Descripción |
|---|---|
| Ventas del día | Total de tickets emitidos, monto vendido por banca |
| Tickets ganadores | Tickets con premio en un sorteo |
| Tickets pagados | Premios cobrados en un período |
| Tickets anulados | Anulaciones con motivo y responsable |
| Tickets expirados | Premios no cobrados dentro de la vigencia |
