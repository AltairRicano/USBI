# Auditoría de Verificación — USBI (Estado Actual)
**Fecha:** 2026-07-18 — Basada en lectura directa del código fuente, sin suposiciones.

**Evidencia de compilación:**
- ✅ Backend: `go build ./... && go vet ./... && go test ./...` → OK (4 pruebas unitarias en `internal/levels`, resto sin tests)
- ✅ Frontend: `tsc --noEmit` → 0 errores
- ✅ Frontend: `pnpm lint` → 0 errores
- ✅ Frontend: `pnpm vitest run` → 3/3 tests OK en `MakerPage.test.tsx`

---

## 1. ¿El código añadido es congruente con lo agregado en fases anteriores?

**Mayormente sí, con una inconsistencia funcional importante.**

Lo que está bien:
- `levels/service.go` sigue el mismo patrón de inyección de dependencias que `auth/service.go` y `sync/service.go` (constructor con struct, `*repository.Queries` como dependencia).
- `levels/handler.go` usa `writeProblem` con RFC 7807, igual que `router.go`.
- `levels/dto.go` usa `uuid.NullUUID` para `created_by_admin_id`, consistente con cómo `auth/service.go` maneja el campo en `InsertArcoRequest`.
- El router en `SetupRoutes` integra `LevelsHandler` en el grupo autenticado correctamente.

**Inconsistencia detectada:** El router tiene la ruta `GET /levels` como `notImplementedHandler("levels.list")`. Esta ruta no tiene implementación, lo que significa que el frontend no puede listar los niveles disponibles para los jugadores. Esto rompe el flujo completo: el Maker crea niveles en la BD, pero nadie puede acceder a ellos.

---

## 2. ¿Ambas capas son funcionales?

**Parcialmente.**

| Flujo | Estado |
|---|---|
| Login / Logout | ✅ Funcional |
| Registro con consentimiento de menores | ✅ Funcional |
| ARCO Request | ✅ Funcional |
| Sync offline con HMAC-SHA256 | ✅ Funcional |
| Maker: exportar nivel a JSON local | ✅ Funcional (Tauri IPC) |
| Admin: crear nivel oficial (POST /levels) | ✅ Backend implementado, pero **sin UI que lo use** |
| Jugador: listar niveles disponibles (GET /levels) | ❌ `501 Not Implemented` — sin handler ni UI |
| Jugador: jugar un nivel | ❌ No existe ninguna pantalla de juego |

El Maker exporta JSON local correctamente. El backend acepta `POST /levels` autenticado con rol admin. Pero el ciclo completo "nivel en BD → jugador lo ve → jugador lo juega" está incompleto.

---

## 3. ¿Qué partes deberían ser cambiadas?

### Crítico
1. **`GET /levels` no tiene implementación.** Necesita handler + query SQL que devuelva niveles publicados, paginados. Sin esto el juego no puede cargar contenido.
2. **`MakerPage.tsx` no conecta el form de metadata con el select de plantilla.** El estado `template` (línea 9) es un `useState` local que NO actualiza `metadata.template_type` en el formulario de react-hook-form. El JSON exportado siempre tendrá `template_type: 'flashcards'` independiente de lo que el usuario seleccione.
3. **`MakerPage.tsx` exporta `content: []` vacío.** El form recoge título, autor y dificultad, pero no tiene campos para ingresar el contenido del nivel (las flashcards, preguntas, pares de memoria). El archivo JSON resultante es estructuralmente inválido para un nivel real.

### Moderado
4. **`alert()` en `MakerPage.tsx` es inapropiado en producción.** Bloquea el hilo del UI y no es consistente con el sistema de notificaciones del resto de la app.
5. **`service_test.go` hace `NewService(nil)`** confiando en que la validación previa al call de DB siempre se active. Si se añade lógica futura antes de la validación, causará panic en tests.
6. **`writeProblem` está duplicada** — existe en `levels/handler.go` (líneas 45-55) Y en `router.go` (líneas 184-194). Son idénticas. Deberían estar en un paquete compartido `internal/httperr`.

### Menor
7. **`useGameStore.ts`** define estado de juego (`currentGameId`, `currentScore`) pero ninguna pantalla lo usa. La store existe sin consumidor.

---

## 4. ¿Cómo puede mejorar la lógica del código?

**Backend:**
- `levels/service.go` valida JSON sintácticamente (`json.Valid`) pero no valida semántica. Un array vacío `[]` pasa la validación pero no es un nivel válido. Debería validar que `len(content) > 0` para los tipos de array.
- `GET /levels` debería implementarse con paginación por cursor (`LIMIT + WHERE id > cursor`) en lugar de offset para rendimiento a escala.
- `TemplateType` en `CreateLevelRequest` acepta cualquier string. Debería validarse contra el enum `["flashcards","multiple_choice","drag_and_drop","memory"]`.

**Frontend:**
- El select de plantilla en `MakerPage` debería estar conectado a `react-hook-form` via `Controller` (como el resto de los campos), no como `useState` independiente, y actualizar `metadata.template_type`.
- Los campos de `content` deberían renderizarse dinámicamente según la plantilla seleccionada (subformulario condicional).
- `syncEngine.ts` llama `buildSignedRequest(request, hmacSecret)` pasando el secreto desde JS. El comentario en el código dice que en producción debería venir de `tauri-plugin-store`, pero la implementación actual lo recibe como parámetro de función — cualquier llamador puede pasarle lo que quiera.

---

## 5. ¿Qué errores puede producir el código en el frontend?

| Escenario | Error |
|---|---|
| Usuario selecciona "Opción Múltiple" como plantilla y exporta | El JSON tendrá `template_type: "flashcards"` — **bug silencioso** |
| Se llama a `syncLocalProgress` con `hmacSecret` vacío | La firma HMAC será inválida y el servidor rechazará el evento |
| Tauri `save()` retorna `null` (usuario cancela el diálogo) | La condición `if (filePath)` lo maneja correctamente — no hay error |
| Pantalla en `/maker` siendo accedida por usuario no-admin | `ProtectedRoute` redirige a `/unauthorized` correctamente |
| `apiClient` recibe 401 mientras el usuario juega | Dispara `auth:unauthorized` event y llama `logout()` — correcto, pero ningún componente escucha ese evento CustomEvent |

---

## 6. ¿Es congruente todo con el plan?

**En la arquitectura sí, en la completitud no.**

Lo que el plan requería (Fase 5 / 06_admin_maker):
- ✅ Módulo para que admins creen niveles oficiales (`POST /levels`)
- ✅ Módulo Maker local (exportación a JSON vía Tauri IPC)
- ✅ Esquemas Zod para todas las plantillas
- ✅ Exportación exclusiva al sistema de archivos (sin backend)
- ⚠️ Acceso de usuarios regulares al Maker: La ruta `/maker` solo permite `admin`. Si el plan contempla que usuarios también puedan crear niveles comunitarios, esto está restringido incorrectamente.
- ❌ `GET /levels`: el plan requería que los niveles publicados fueran accesibles para los jugadores.

---

## 7. ¿La lógica es sólida?

**Sólida en las capas implementadas, con huecos en el flujo completo.**

La lógica de autenticación es la más robusta: Argon2id, blind index HMAC para email, token versioning para revocación inmediata, sessionStorage (no localStorage) para evitar XSS. La lógica de sync es igualmente sólida: HMAC verificado server-side, XP recalculado por el servidor, idempotencia por `sync_event_id`, ARCO `wipe_local_data` implementado.

La lógica del Maker tiene el hueco ya descrito: el `template` state y el `form state` están desincronizados, produciendo un JSON structuralmente incorrecto.

---

## 8. ¿Todo tiene un hilo conductor o existen funciones inutilizadas?

**Existen 3 elementos sin consumidor actual:**

| Elemento | Problema |
|---|---|
| `useGameStore.ts` | Definido pero ningún componente lo importa ni usa |
| `GET /levels` en router | Registrada como stub `501`, nunca se llenó |
| `CustomEvent('auth:unauthorized')` en `apiClient.ts` | Disparado en 401/403, pero ningún componente/hook lo escucha |

El hilo conductor sí existe de `Login → Auth Store → apiClient → Sync` y de `Maker Form → Zod → Tauri IPC → Filesystem`. Pero el arco `Maker → BD → listado → juego` está incompleto y la store de juego queda huérfana.

---

## Resumen Ejecutivo

| Área | Estado |
|---|---|
| Auth completa | ✅ |
| Sync offline | ✅ |
| Maker export local | ⚠️ (bug: plantilla no sincronizada, content vacío) |
| Maker admin POST /levels | ⚠️ (backend OK, sin UI funcional) |
| GET /levels (listado) | ❌ |
| Pantalla de juego | ❌ |
| Tests backend | ⚠️ (solo `internal/levels`, 5 paquetes sin tests) |
| Tests frontend | ✅ (MakerPage, 3 tests) |
