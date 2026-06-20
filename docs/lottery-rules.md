# Reglas de Lotería

## Modalidades de Juego

El sistema soporta cuatro modalidades de apuesta. Cada una tiene sus propias reglas de selección de números, validación y cálculo de premios.

---

## Quiniela

### Descripción
Apuesta a un número de **2 dígitos** (00–99) en un sorteo específico.

### Reglas
- El jugador elige un número entre `00` y `99`.
- Se apuesta a que ese número aparezca como **primer premio** del sorteo.
- Monto mínimo de apuesta: configurable por banca.
- Monto máximo: configurable por número y por banca (límites de `BetLimit`).

### Premio
```
Premio = Monto apostado × Multiplicador de quiniela
```

---

## Palé

### Descripción
Apuesta a **2 números** de 2 dígitos que deben coincidir con los primeros dos premios del sorteo (en cualquier orden o en orden exacto, según configuración).

### Reglas
- El jugador elige 2 números distintos entre `00` y `99`.
- Ambos números deben aparecer entre los premios del sorteo.
- El orden puede ser directo o combinado según la configuración de la banca.

### Premio
```
Premio = Monto apostado × Multiplicador de palé
```

---

## Tripleta

### Descripción
Apuesta a **3 números** de 2 dígitos que deben coincidir con los tres primeros premios del sorteo.

### Reglas
- El jugador elige 3 números distintos entre `00` y `99`.
- Los 3 números deben aparecer entre los premios del sorteo.
- El orden puede ser directo o combinado según configuración.

### Premio
```
Premio = Monto apostado × Multiplicador de tripleta
```

---

## Súper Palé

### Descripción
Apuesta combinada entre **dos loterías distintas**. El jugador selecciona un número en cada lotería y ambos deben salir en sus respectivos sorteos.

### Reglas
- El jugador elige 1 número en la Lotería A y 1 número en la Lotería B.
- Ambos sorteos deben tener resultado para que el ticket sea evaluable.
- Se apuesta a que ambos números ganen en sus respectivos sorteos.

### Premio
```
Premio = Monto apostado × Multiplicador de súper palé
```

---

## Loterías Soportadas

### República Dominicana

| Nombre | Código | Horarios típicos |
|---|---|---|
| Nacional | `NAC` | Mediodía y noche |
| Leidsa | `LEIDSA` | Noche |
| Loteka | `LOTEKA` | Noche |
| Real | `REAL` | Noche |
| Gana Más | `GANA_MAS` | Noche |
| New York Tarde | `NY_TARDE` | Tarde |
| New York Noche | `NY_NOCHE` | Noche |
| Florida Día | `FL_DIA` | Tarde |
| Florida Noche | `FL_NOCHE` | Noche |

### Internacionales

| Nombre | Código | País |
|---|---|---|
| King Lottery | `KING` | Internacional |
| Anguilla | `ANGUILLA` | Anguila |

---

## Ciclo de Vida de un Sorteo

```
OPEN → (cierre automático al horario de cierre) → CLOSED → (ingreso de resultado) → RESULTED
```

| Estado | Descripción |
|---|---|
| `OPEN` | Se aceptan apuestas |
| `CLOSED` | No se aceptan nuevas apuestas; pendiente de resultado |
| `RESULTED` | Resultado publicado; se pueden pagar premios |

---

## Validaciones al Registrar una Apuesta

1. El sorteo debe estar en estado `OPEN`.
2. La hora actual debe ser anterior al `closedAt` del sorteo.
3. Los números deben ser válidos para la modalidad elegida.
4. El monto no debe superar los límites definidos en `BetLimit` para ese número/banca/sorteo.
5. El monto mínimo debe cumplirse.

---

## Reglas de Anulación de Tickets

- Un ticket solo puede anularse mientras el sorteo esté en estado `OPEN`.
- La anulación requiere rol `SUPERVISOR` o superior.
- Todo proceso de anulación queda registrado en `AuditLog`.
- Un ticket anulado no puede pagarse ni volver a activarse.
