# Reglas de Pago de Premios

## Principios Generales

- El monto del premio se calcula **siempre en el servidor**. El cliente nunca envía ni propone montos de premios.
- Solo se pagan premios presentando el **ticket original en buen estado**.
- El pago queda registrado en la entidad `Payment` con auditoría completa.
- Un ticket solo puede pagarse **una vez**; una vez marcado como `PAID` no puede volver a cobrarse.

---

## Fórmula de Cálculo

### Premio por jugada
```
PremioJugada = Monto × Multiplicador
```

### Premio total del ticket
```
PremioTotal = Σ PremioJugada (de todas las jugadas ganadoras del ticket)
```

Los multiplicadores son configurables por modalidad y se almacenan en la tabla de `Settings` o en la configuración de la banca.

---

## Multiplicadores por Modalidad

Los valores a continuación son **referencia base**; cada banca puede configurarlos dentro de los rangos permitidos por la administración.

| Modalidad | Multiplicador base |
|---|---|
| Quiniela | 60× |
| Palé | 350× |
| Tripleta | 1,500× |
| Súper Palé | 2,000× |

> Los multiplicadores exactos deben configurarse en el módulo `Settings` antes de comenzar a operar.

---

## Flujo de Pago

```
1. Cajero escanea QR del ticket (o ingresa número de ticket manualmente).
2. El servidor localiza el ticket y verifica:
   a. Estado: debe ser ACTIVE (no PAID, CANCELLED ni EXPIRED).
   b. Sorteo: debe estar en estado RESULTED.
   c. Resultado: compara los números del ticket con DrawResult.
3. El servidor calcula el premio.
4. Si hay premio ganador:
   a. Se muestra el monto al cajero.
   b. El cajero confirma el pago.
   c. Se crea el registro en Payment.
   d. El ticket cambia a estado PAID.
   e. Se imprime comprobante de pago.
5. Si no hay premio, se informa al cajero que el ticket no es ganador.
```

---

## Validaciones Previas al Pago

| Validación | Comportamiento si falla |
|---|---|
| Ticket existe | Error: ticket no encontrado |
| Estado `ACTIVE` | Error: ticket ya pagado, anulado o expirado |
| Sorteo en `RESULTED` | Error: aún no hay resultado disponible |
| Resultado publicado | Error: resultado no disponible |
| Premio > 0 | Informar: ticket no ganador |

---

## Límites de Pago por Caja

- El sistema puede configurar un monto máximo de pago por caja sin autorización de supervisor.
- Pagos que superen el límite configurado requieren confirmación de un usuario con rol `SUPERVISOR` o `ADMIN`.
- Esta validación se aplica al monto total del ticket, no por jugada.

---

## Expiración de Tickets

- Un ticket ganador que no sea cobrado en el período de vigencia configurado pasa a estado `EXPIRED`.
- El período de vigencia por defecto es de **30 días** desde la fecha del sorteo (configurable).
- Tickets expirados no pueden pagarse sin intervención de un `ADMIN`.

---

## Anulación vs. Pago

| Acción | Cuándo aplica | Quién puede ejecutar |
|---|---|---|
| Anulación | Sorteo en `OPEN` | `SUPERVISOR`, `ADMIN` |
| Pago | Sorteo en `RESULTED` | `CASHIER`, `SUPERVISOR`, `ADMIN` |

---

## Registro de Auditoría

Cada pago genera un registro en `AuditLog` con:
- `userId`: quien procesó el pago
- `action`: `PAYMENT_REGISTER`
- `entity`: `Payment`
- `entityId`: ID del pago
- `metadata`: monto, ticketId, sorteo, números ganadores

---

## Mensaje Legal Obligatorio en Comprobantes

> "Únicamente se pagarán premios presentando el ticket original en buen estado."
