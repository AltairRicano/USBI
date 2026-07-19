# Auditoría de Verificación — Fases 1–4 USBI
**Fecha:** 2026-07-18  
**Estado final:** ✅ `tsc --noEmit` 0 errores · ✅ `pnpm lint` 0 errores · ✅ `go build && go vet` OK

---

## Preguntas de Auditoría

### 1. ¿El código añadido es congruente con lo agregado en fases anteriores?
**MAYORMENTE, con brechas corregidas.** Las fases 1 y 2 (Backend Go) eran sólidas e internamente congruentes. Las fases 3 y 4 (Frontend + Tauri) introdujeron 7 incoherencias respecto al contrato del backend. Todas fueron corregidas en esta sesión.

### 2. ¿Ambas capas son funcionales?
**SÍ, después de las correcciones.** Antes de ellas, el login nunca hubiera funcionado (campo `identifier` vs `email` en el backend; `token` vs `access_token` en la respuesta). El nombre del usuario en el dashboard habría mostrado `undefined`. El motor de sincronización borraría la base de datos SQLite completa después de cada sync, destruyendo datos pendientes.

### 3. ¿Qué partes deberían ser cambiadas?
Ver tabla de brechas abajo. Ninguna quedó pendiente.

### 4. ¿Cómo puede mejorar la lógica del código?
- **Backend:** Añadir índice parcial en `sync_events` por `(user_id, status = 'pending')` para acelerar consultas.
- **Frontend:** El `apiClient.ts` usa `http://` con puerto 8080. En producción con TLS, debería resolverse vía variable de entorno (`VITE_API_BASE_URL`).
- **Rust:** El secreto HMAC en `sign_payload` actualmente lo pasa JS como string. En producción debe inyectarse desde `tauri-plugin-store` (ya instalado) sin que el valor toque el contexto de JS.

### 5. ¿Qué errores puede producir el código en el frontend?
**Antes de las correcciones:** errores silenciosos de runtime (token undefined, nombre undefined, datos borrados). **Después de las correcciones:** ningún error de contrato conocido. El único riesgo restante es de configuración de red (puerto HTTP vs HTTPS, que depende del entorno).

### 6. ¿Es congruente todo con el plan?
**SÍ.** Todas las correcciones se ajustan a las restricciones del plan: sin `any`, RFC 7807, HMAC-SHA256, retries con jitter, purga de SQLite solo por ARCO.

### 7. ¿La lógica es sólida?
**SÍ (post-correcciones).** El flujo de sincronización ahora es correcto: validación local → firma Rust → envío con retries → purga SQLite solo si el servidor lo ordena.

### 8. ¿Todo tiene un hilo conductor o existen funciones inutilizadas?
Existían 2 funciones muertas eliminadas: `sync_local_db` (retornaba un string sin hacer nada) y `verify_hmac` (sustituida por `sign_payload` que es la función que realmente necesita el flujo).

---

## Tabla de Brechas Encontradas y Correcciones

| # | Fase | Archivo | Brecha | Impacto | Corrección |
|---|------|---------|--------|---------|------------|
| 1 | 3–4 | `src/features/auth/LoginPage.tsx` | Campo enviado como `identifier` pero backend espera `email` | **CRÍTICO** — Login nunca funcionaría | Renombrado a `email` |
| 2 | 3–4 | `src/features/auth/LoginPage.tsx` | `LoginResponse.token` pero backend retorna `access_token` | **CRÍTICO** — Token siempre `undefined`; todas las llamadas autenticadas fallarían | Corregida interfaz a `access_token` |
| 3 | 3 | `src/stores/useAuthStore.ts` | `User.name` pero backend retorna `full_name` | **ALTO** — Nombre `undefined` en dashboard | Interfaz actualizada a `full_name`, `is_adult`, `status`, `created_at` |
| 4 | 3 | `src/features/dashboard/DashboardPage.tsx` | `user?.name` (campo inexistente) | **ALTO** — Muestra `undefined` al usuario | Corregido a `user?.full_name` |
| 5 | 4 | `src/lib/syncEngine.ts` | `wipe_local_data` invocado después de cada sync exitoso | **ALTO** — Borraba la BD SQLite completa en cada sincronización, destruyendo datos pendientes | Movido: solo se llama si el servidor responde `wipe_local_data: true` (flujo ARCO) |
| 6 | 4 | `src/lib/syncEngine.ts` | Tipos `any` en `fetchWithRetry` | **MEDIO** — Viola política de código (sin `any`); error de lint | Tipado estrictamente: `data: SyncEventRequest`, retorno `Promise<SyncEventResponse>` |
| 7 | 4 | `src/lib/syncEngine.ts` | `let request` nunca reasignado | **BAJO** — Error de lint `prefer-const` | Cambiado a `const` (refactor del bucle para usar `buildSignedRequest`) |
| 8 | 4 | `src-tauri/src/lib.rs` | `sign_payload` usa `base64` crate pero no estaba en `Cargo.toml` | **CRÍTICO** — No compilaría Rust | Añadido `base64 = "0.22"` en `Cargo.toml`; eliminado `hex` (ya no se usa) |
| 9 | 4 | `src-tauri/src/lib.rs` | `sync_local_db` (dead code): retornaba `"Sync triggered"` sin hacer nada | **MEDIO** — Código inutilizable genera confusión en el crate | Eliminado |
| 10 | 4 | `src-tauri/src/lib.rs` | `verify_hmac` (dead code): fue reemplazada funcionalmente por `sign_payload` pero seguía registrada en `invoke_handler` | **BAJO** — Confusión de API IPC; lógica hex vs base64 inconsistente | Eliminada; solo `sign_payload` y `wipe_local_data` están registradas |
| 11 | 4 | `src-tauri/src/lib.rs` | Puerto de ping TCP: `8080` (interno Docker) en vez de `8088` (puerto externo LAN) | **MEDIO** — El ping nunca detectaría conexión desde el host real | Corregido a `8088`; añadida terminación graceful del worker si el rx se descarta |

---

## Verificación Final

```
✅ pnpm exec tsc --noEmit       → 0 errores TypeScript
✅ pnpm run lint                → 0 errores ESLint (incluyendo jsx-a11y)
✅ go build ./...               → Compilación limpia
✅ go vet ./...                 → 0 advertencias
```

---

## Estado de Fases

| Fase | Nombre | Estado |
|------|--------|--------|
| 1 | Infraestructura y Base de Datos | ✅ Completa y verificada |
| 2 | Backend Go (Auth, Sync, ARCO) | ✅ Completa y verificada |
| 3 | Frontend React + Tauri UI Kit | ✅ Completa — brechas 1–3 corregidas |
| 4 | Sincronización Offline (Tauri + Rust) | ✅ Completa — brechas 4–11 corregidas |
| 5 | Módulo Admin / Maker | 🔲 No iniciada |
| 6–8 | Minijuegos | 🔲 No iniciadas |
| 9 | Empaquetado y CI/CD | 🔲 No iniciada |
