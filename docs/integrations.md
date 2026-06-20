# Integraciones

## Visión General

El sistema se integra con fuentes externas para la obtención de resultados de sorteos y con hardware local para la impresión de tickets.

---

## Resultados de Loterías

### Modalidad de Ingreso

Actualmente los resultados se ingresan de forma **manual** por un usuario con rol `ADMIN` o `SUPERVISOR` a través del módulo `Results`.

Flujo:
```
1. Usuario con rol autorizado accede al módulo de Resultados.
2. Selecciona el sorteo correspondiente.
3. Ingresa los números ganadores (primer premio, segundo, tercero).
4. Confirma la publicación.
5. El sorteo cambia a estado RESULTED.
6. Los tickets del sorteo quedan disponibles para pago.
```

### Integración Automática (Futura)

Se contempla la integración con APIs o scrapers de las loterías para automatizar el ingreso de resultados. Al implementarse debe:
- Publicar resultados solo cuando la fuente los confirme.
- Requerir validación manual antes de cambiar el sorteo a `RESULTED` (opcional por configuración).
- Registrar la fuente del resultado en `DrawResult.metadata`.

---

## Impresión Térmica — Sunmi V2S

### Descripción

El sistema es compatible con la impresora térmica integrada del dispositivo **Sunmi V2S** (dispositivo Android de punto de venta).

### Contenido del Ticket Impreso

Todo ticket debe incluir obligatoriamente:

| Campo | Descripción |
|---|---|
| Nombre de banca | `Branch.name` |
| Fecha y hora | Fecha/hora de emisión |
| Número de ticket | `Ticket.ticketNumber` (legible, ej: `B001-00123`) |
| Sorteo(s) | Nombre del sorteo apostado |
| Jugadas | Lista de números y montos por jugada |
| Monto total apostado | `Ticket.totalAmount` |
| Premio potencial | `Ticket.potentialPrize` |
| Código QR | Codifica el `Ticket.id` para escaneo rápido |
| Mensaje legal | Ver abajo |

### Mensaje Legal Obligatorio

```
"Únicamente se pagarán premios presentando el ticket original en buen estado."
```

### Integración Técnica

- La impresión se ejecuta desde el frontend llamando al SDK de impresión de Sunmi disponible en el dispositivo.
- El backend genera el contenido estructurado del ticket; el frontend lo formatea para impresión térmica.
- El QR codifica el UUID del ticket (`Ticket.id`) para validación rápida al momento del pago.

---

## Cloudflare

### Uso Actual

- **DNS**: resolución de dominios de la aplicación.
- **Proxy**: protección de la IP del servidor de producción.
- **SSL/TLS**: certificados HTTPS gestionados por Cloudflare.

### Consideraciones

- El backend debe aceptar las IPs de Cloudflare en el header `CF-Connecting-IP` para obtener la IP real del cliente.
- Configurar reglas de firewall en Cloudflare para bloquear acceso directo al servidor de producción.

---

## Dokploy

### Uso Actual

- Gestión del despliegue de contenedores Docker en el servidor.
- Panel de control para ver logs, reiniciar servicios y gestionar variables de entorno.
- Gestión de dominios y certificados SSL.

---

## Futuras Integraciones Consideradas

| Integración | Propósito | Estado |
|---|---|---|
| API de resultados loterías | Automatizar ingreso de resultados | Pendiente |
| Pasarela de pago digital | Cobros y pagos electrónicos | Pendiente |
| WhatsApp / SMS | Notificaciones a clientes y cajeros | Pendiente |
| Contabilidad externa | Exportación de reportes financieros | Pendiente |
