# Sistema de Lotería RD

## Descripción General

Sistema de ventas y administración de loterías desarrollado para bancas de apuestas en República Dominicana.

Permite:

* Venta de Quinielas
* Venta de Palés
* Venta de Tripletas
* Venta de Súper Palé
* Consulta de resultados
* Pago de premios
* Administración de bancas
* Administración de usuarios
* Reportes de ventas
* Reportes de premios
* Control de límites de apuestas

---

## Tecnologías

### Frontend

* React
* TypeScript
* Tailwind CSS
* Shadcn/UI

### Backend

* NestJS
* Prisma ORM
* PostgreSQL

### Infraestructura

* Docker
* Dokploy
* Cloudflare

---

## Reglas Generales

* Nunca modificar la lógica de cálculo de premios sin autorización.
* Nunca eliminar migraciones existentes.
* Mantener compatibilidad con dispositivos móviles.
* Mantener compatibilidad con impresoras térmicas Sunmi V2S.
* Todo cambio de base de datos debe generar migración Prisma.
* Mantener TypeScript en modo estricto.

---

## Modalidades de Juego

### Quiniela

* Selección de número de 2 dígitos.
* Pago configurable.

### Palé

* Selección de 2 números.
* Pago configurable.

### Tripleta

* Selección de 3 números.
* Pago configurable.

### Súper Palé

* Combinación entre loterías.
* Pago configurable.

---

## Loterías Soportadas

### República Dominicana

* Nacional
* Leidsa
* Loteka
* Real
* Gana Más
* New York Tarde
* New York Noche
* Florida Día
* Florida Noche

### Internacionales

* King Lottery
* Anguilla

---

## Arquitectura Deseada

### Módulos

* Auth
* Users
* Branches
* Draws
* Lottery Providers
* Bets
* Tickets
* Results
* Payments
* Reports
* Dashboard
* Settings

---

## Impresión de Tickets

Todo ticket debe incluir:

* Nombre de banca
* Fecha y hora
* Número de ticket
* Jugadas
* Monto apostado
* Posible premio
* Código QR
* Mensaje legal

Mensaje obligatorio:

"Únicamente se pagarán premios presentando el ticket original en buen estado."

---

## Reglas de Seguridad

* El premio potencial siempre se calcula en el servidor.
* El cliente nunca puede enviar montos de premios.
* Validar límites por número.
* Validar límites por banca.
* Registrar auditoría de cambios críticos.
* Registrar pagos y anulaciones.

---

## Despliegue

* Docker
* Dokploy
* PostgreSQL
* Backups automáticos diarios

---

## Convenciones

* Utilizar nombres descriptivos.
* Evitar código duplicado.
* Mantener arquitectura modular.
* Documentar nuevas reglas de negocio.
* Actualizar PROJECT_CONTEXT.md cuando cambie la arquitectura.
