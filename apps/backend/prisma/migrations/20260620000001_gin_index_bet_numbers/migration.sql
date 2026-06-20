-- GIN index para búsqueda eficiente en Bet.numbers (array de strings)
-- Este índice es crítico para el sistema de límites, que consulta
-- todos los bets que contienen un número específico en un sorteo.
-- CONCURRENTLY evita bloquear la tabla durante la creación.

CREATE INDEX IF NOT EXISTS "Bet_numbers_gin_idx"
ON "Bet" USING GIN (numbers);

-- Índices adicionales de rendimiento no soportados nativamente por Prisma

-- Para queries de dashboard: tickets por operador+draw+status del día
CREATE INDEX IF NOT EXISTS "Ticket_operatorId_drawId_status_idx"
ON "Ticket" ("operatorId", "drawId", "status");

-- Para ledger: balance de una banca en tiempo cronológico
CREATE INDEX IF NOT EXISTS "FinancialTransaction_branchId_createdAt_idx"
ON "FinancialTransaction" ("branchId", "createdAt" DESC);

-- Para queries de límites: búsqueda por operador+draw+modality+number
CREATE INDEX IF NOT EXISTS "BetLimit_operatorId_drawId_modality_number_idx"
ON "BetLimit" ("operatorId", "drawId", "modality", "number");

-- Para AuditLog: filtros por operador y fecha descendente
CREATE INDEX IF NOT EXISTS "AuditLog_operatorId_createdAt_idx"
ON "AuditLog" ("operatorId", "createdAt" DESC);
