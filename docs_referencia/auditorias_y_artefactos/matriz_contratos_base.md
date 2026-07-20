# Matriz de Contratos Base

Alcance: contratos principales entre `openapi.yaml`, backend Go, frontend React/Zod y Tauri para `auth`, `sync`, `levels` y Maker local.

## Resultado de Verificacion

| Area | Comando | Estado |
|---|---|---|
| Backend Go | `GOCACHE=/tmp/usbi-go-build-cache GOMODCACHE=/tmp/usbi-go-mod-cache go test ./...` | OK |
| Backend Go | `GOCACHE=/tmp/usbi-go-build-cache GOMODCACHE=/tmp/usbi-go-mod-cache go build ./...` | OK |
| Backend Go | `GOCACHE=/tmp/usbi-go-build-cache GOMODCACHE=/tmp/usbi-go-mod-cache go vet ./...` | OK |
| Frontend | `pnpm --config.store-dir=.pnpm-store run build` | OK |
| Frontend | `pnpm --config.store-dir=.pnpm-store run lint` | OK |
| Tauri Rust | `cargo check` | Bloqueado por prerrequisito nativo faltante: `javascriptcoregtk-4.1` y `webkit2gtk-4.1` |

## Matriz

| Flujo | OpenAPI | Backend Go | Frontend/Zod | Estado | Nota |
|---|---|---|---|---|---|
| `POST /auth/register` | `RegisterRequestDTO`, `RegisterResponseDTO` | `auth.RegisterRequest`, `auth.RegisterResponse` | `RegisterSchema`, `RegisterPage` | Parcial | Campos base alineados. La UI actual bloquea menores (`isAdult=false`), pero el plan requiere flujo de consentimiento de tutor. |
| `POST /auth/login` | `LoginRequestDTO`, `LoginResponseDTO` | `auth.LoginRequest`, `auth.LoginResponse` | `LoginPage` tipa `access_token`, `token_type`, `user` | Alineado | La respuesta se tipa en TS, pero aun no se valida en runtime con Zod. |
| `POST /auth/logout` | 204 documentado | `AuthHandler.Logout` | `DashboardPage` invoca `/auth/logout` | Alineado funcional | Frontend limpia sesion en `finally`, aun si el backend falla. |
| `POST /auth/age-up` | Documentado | `AuthHandler.AgeUp` | Sin UI dedicada detectada | Pendiente UI | El plan pide modal self-service. |
| `POST /arco` | `ArcoRequestDTO` | `auth.ArcoRequestDTO` | `ArcoSchema` | Parcial | Falta revisar flujo UI y propagacion de `wipe_local_data`. |
| `POST /sync` | `SyncEventRequestDTO`, `SyncEventResponseDTO`, 200 | `domain.SyncEventRequest`, `domain.SyncEventResponse`, `sync.Handler` | `SyncEventSchema`, `syncEngine.ts` | Alineado con brechas de documentacion | Se corrigio backend de 202 a 200. Queda pendiente decidir si HMAC invalido debe documentarse como 401 o 422. |
| `GET /levels` | Offset pagination: `limit`, `offset`, respuesta `data/total/limit/offset` | Cursor pagination: `cursor`, `page_size`, respuesta `items/next_cursor` | Sin cliente dedicado detectado | Divergente | Hay que decidir si migrar backend a OpenAPI o actualizar OpenAPI a cursor pagination. |
| `POST /levels` | `CreateLevelRequestDTO` sin enum cerrado | `CreateLevelRequest`, enum permitido `flashcards`, `multiple_choice`, `drag_and_drop`, `memory` | Maker local usa los mismos cuatro tipos lower snake | Parcial | Plan y algunos schemas compartidos tambien mencionan plantillas uppercase y mas juegos; falta contrato unico. |
| Maker local JSON | No aplica al servidor | No debe enviarse al backend | `MakerPage`, `LevelExportSchema` | Divergente | `MakerPage` usa tipos lower snake; `frontend/src/lib/schema.ts` define `LevelMetadataSchema.template_type` uppercase. |

## Brechas Prioritarias

1. Unificar el contrato de `GET /levels`: cursor pagination actual o offset pagination de OpenAPI.
2. Resolver la semantica de HMAC invalido en `/sync`: el plan operativo indica 401, pero OpenAPI aun conserva 422.
3. Unificar tipos de plantilla Maker/Levels: lower snake (`flashcards`) vs uppercase (`TRIVIA`) y cobertura de minijuegos.
4. Implementar flujo frontend para menores y consentimiento de tutor, o documentar que queda fuera del slice actual.
5. Validar respuestas criticas con Zod en runtime, no solo con interfaces TypeScript.

## Ajustes Aplicados

- `backend/internal/sync/handler.go`: `POST /sync` ahora responde `200 OK`.
- `frontend/package.json`: el build compila primero `@usbi/engine`.
- `frontend/package.json` y `frontend/pnpm-lock.yaml`: `@tauri-apps/plugin-dialog` queda fijado en `2.7.1` para respetar la politica `minimumReleaseAge`.
- `frontend/pnpm-workspace.yaml`: se aprobo solo el build script de `esbuild`, requerido por Vite.
- `frontend/src/features/dashboard/DashboardPage.tsx`: se elimino el click handler de un elemento no interactivo.
- `frontend/src/vite-env.d.ts`: se tipa `window.__TAURI__`.
