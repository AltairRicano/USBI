# Reporte de Auditoría — Fase 2 Backend USBI
**Fecha:** 2026-07-17 | **Auditor:** Antigravity (Claude Sonnet 4.6 Thinking)
**Build final:** `go build ./...` → ✅ Sin errores | **`any` en código propio:** ✅ Cero ocurrencias

---

## Resumen Ejecutivo

Se encontraron **10 brechas críticas** y **8 deficiencias de calidad** distribuidas entre los archivos de la Fase 1 y la Fase 2. Todas fueron corregidas. El código compila limpio y es congruente con `plan_maestro.md` tras las correcciones.

---

## Brechas Encontradas y Correcciones Aplicadas

### 🔴 CRÍTICO — Seguridad

| # | Archivo | Brecha | Impacto | Corrección |
|---|---------|--------|---------|-----------|
| 1 | `internal/crypto/hash.go` | `BlindIndexHash()` usaba `sha256.New()` sin clave — SHA-256 simple sin HMAC es vulnerable a ataques de diccionario cruzados entre sistemas y a extensión de longitud | Atacante con acceso a hashes puede construir tablas de correspondencia usando emails comunes | Reemplazado por `BlindIndexHMAC()` que usa HMAC-SHA256 con clave `BLIND_INDEX_SECRET` |
| 2 | `internal/auth/service.go` | `sealPayload` construido como `email + privacyVersion` — concatenación sin separador permite colisiones de tipos ("abc"+"def" == "ab"+"cdef") | Firma de aceptación de privacidad inválida; fallo de No-Repudio | Separador `|` explícito: `email + "|" + privacyVersion` |
| 3 | `internal/auth/handler.go` | `ErrUserNotFound` e `ErrInvalidPassword` retornaban mensajes distintos | Permite enumeración de usuarios (user enumeration attack) — atacante puede saber qué emails existen | Ambos retornan exactamente "Invalid email or password" |
| 4 | `internal/sync/service.go` | XP tomado directamente de `attempt.XpAwarded` del cliente sin recalcular | Un cliente malicioso puede enviar `xp_awarded: 999999` y acumular XP ilimitado; viola RF15 del plan | XP recalculado server-side con tabla: intento 1→100, 2-3→50, ≥4→0 |
| 5 | `internal/sync/handler.go` | HMAC se verificaba sobre `json.Marshal(req.Payload)` (re-marshaling) en lugar del cuerpo raw original | El re-marshaling puede reordenar campos JSON → la firma válida del cliente puede fallar o vice-versa | `rawBody` se lee una vez con `io.ReadAll()` y se pasa directamente al servicio |
| 6 | `main.go` | DB nunca se inicializaba — `RouterDependencies{}` vacío con handlers `nil` | En runtime todos los endpoints auth/sync caen al `notImplementedHandler` aunque el servicio esté "completo" | DB connection real con pool, `Ping()`, servicios instanciados y conectados al router |

### 🟠 CRÍTICO — Congruencia con Plan / Reglas del Proyecto

| # | Archivo | Brecha | Corrección |
|---|---------|--------|-----------|
| 7 | `internal/auth/dto.go` | `LoginResponse.User` tipado como `interface{}` — viola la regla explícita "Prohibido usar `any` en TypeScript" (principio equivalente en Go) | Reemplazado por `domain.User` concreto |
| 8 | `internal/sync/service.go` | `status` en `InsertSyncEvent` y `UpdateSyncEventStatus` usaba `"RECEIVED"`, `"PROCESSED"`, `"REJECTED_INVALID_HMAC"` en mayúsculas | La CHECK constraint del schema SQL define `('pending', 'processed', 'rejected')` en minúsculas — causaría errores de BD en producción | Valores corregidos a `"pending"`, `"processed"`, `"rejected"` |
| 9 | `internal/sync/service.go` | Tipos `LevelAttemptItem`, `SyncPayload`, `SyncEventReq` duplicados respecto a `domain/models.go` | Código duplicado diverge silenciosamente. Ahora usa `domain.SyncEventRequest`, `domain.SyncPayload`, `domain.LevelAttemptItem` |

### 🟡 DEFICIENCIAS DE CALIDAD / HILO CONDUCTOR ROTO

| # | Archivo | Deficiencia | Corrección |
|---|---------|-------------|-----------|
| 10 | `internal/auth/service.go` | Sin validación de inputs — email sin verificar, password sin longitud mínima, FullName sin trim ni límite | Funciones `validateRegister()` y `validateLogin()` con errores descriptivos |
| 11 | `auth/service.go` | `NewService()` sin panic-guard → configuración vacía falla silenciosamente en runtime | `panic()` explícito con mensaje descriptivo si secrets están vacíos |
| 12 | `internal/transport/router.go` | Claims del JWT se descartaban (`_ = claims`) — ningun handler downstream puede identificar al usuario autenticado | Claims inyectadas al contexto con `context.WithValue()` y `ClaimsFromContext()` exportada |
| 13 | `internal/transport/router.go` | CORS `Allow-Methods` incluía `PUT, DELETE` sin endpoints que los usen | Reducido a `GET, POST, OPTIONS` |
| 14 | `main.go` | Sin `ReadTimeout`, `WriteTimeout`, `IdleTimeout` en `http.Server` | Timeouts configurados: 15s/30s/120s |
| 15 | `internal/sync/service.go` | Sin idempotencia — el mismo `sync_event_id` podría procesarse dos veces | Detección de `duplicate key` en `InsertSyncEvent` retorna `"already_processed"` |
| 16 | Errores en general | Errores envueltos sin `%w` — `errors.Is()` no funciona en la cadena de llamadas | Todos los errores usan `fmt.Errorf("...: %w", err)` |
| 17 | `go.mod` | Sin driver PostgreSQL para `database/sql` | Añadido `github.com/lib/pq v1.12.3` |

---

## Estado Post-Corrección por Archivo

| Archivo | Estado Anterior | Estado Actual |
|---------|----------------|---------------|
| `crypto/hash.go` | ⚠️ SHA256 sin clave | ✅ HMAC-SHA256 keyed |
| `crypto/jwt.go` | ✅ Correcto | ✅ Sin cambios necesarios |
| `auth/dto.go` | ⚠️ `interface{}` presente | ✅ Tipado fuerte con `domain.User` |
| `auth/service.go` | 🔴 Sin validación, sin guard | ✅ Validación, panic-guard, wrapping |
| `auth/handler.go` | 🔴 Enumeración de usuarios | ✅ Mensajes genéricos, `errors.Is` |
| `sync/service.go` | 🔴 XP untrusted, tipos duplicados, status incorrecto | ✅ XP server-side, domain types, idempotencia |
| `sync/handler.go` | 🔴 Re-marshaling para HMAC | ✅ rawBody directo |
| `transport/router.go` | 🟠 Claims descartadas, CORS hardcoded | ✅ Context propagation, CORS configurable |
| `main.go` | 🔴 Sin DB, sin timeouts, deps vacías | ✅ DB real, pool, timeouts, servicios completos |
| `domain/models.go` | ✅ Correcto | ✅ Sin cambios |
| `migrations/0001_initial.up.sql` | ✅ Correcto | ✅ Sin cambios |

---

## Congruencia con el Plan Maestro

| Requisito del Plan | Implementado | Notas |
|-------------------|-------------|-------|
| Argon2id password hashing | ✅ | `crypto/hash.go` |
| JWT con `token_version` en claims | ✅ | `crypto/jwt.go` |
| Blind index HMAC para emails | ✅ | `BlindIndexHMAC()` post-corrección |
| `pgp_sym_encrypt` para email en BD | ✅ | `query.sql` + sqlc |
| Consentimiento tutor (status `pending_tutor_consent`) | ✅ | `auth/service.go` |
| ARCO endpoint stub | ✅ | Stub en router, lógica Fase posterior |
| Logout (token_version increment) | 🕐 | Router wired, lógica de BD pendiente (query SQL no creada aún) |
| Age-up endpoint | 🕐 | Stub en router, lógica Fase posterior |
| `/sync` con XP server-side + FOR UPDATE | ✅ | `sync/service.go` |
| RFC 7807 en todos los errores | ✅ | Todos los handlers |
| Zod schemas en `packages/schema` | ✅ | `packages/schema/index.ts` |
| Sin `any` en TypeScript/Go | ✅ | Verificado con grep |
| TLS 1.2+ | ✅ | `main.go` |
| Timeouts en HTTP server | ✅ | Post-corrección |

---

## Riesgo Residual (Sin Bloquear Fase 3)

1. **`/auth/logout`**: El query SQL `UPDATE users SET token_version = token_version + 1 WHERE id = $1` aún no existe en `query.sql`. El endpoint está stubbed. Se recomienda añadirlo al inicio de la Fase 3.
2. **`/auth/age-up`**: Igual — requiere query + lógica de reintentos (máx 3 per Ley 251).
3. **`/arco`**: Requiere lógica de pseudonimización (Cancelación ARCO) — prevista en plan para Fase posterior.
4. **token_version check contra BD en middleware**: El JWT se valida criptográficamente pero no se verifica que `token_version` coincida con el DB value. Logout no es efectivo hasta implementar este check.
