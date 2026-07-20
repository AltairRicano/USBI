# Plan de trabajo para volver funcional el proyecto USBI

Fecha de auditoria: 2026-07-20  
Repositorio auditado: `/home/altair/Proyectos/USBI/frontend-usbi`

## 0. Alcance y evidencia revisada

Este plan parte del estado real del monorepo local, no del estado anterior en los
contenedores. Se revisaron:

- Backend Go en `backend/`.
- Frontend React/Vite/Tauri en `frontend/`.
- Paquetes compartidos en `frontend/packages/engine` y `frontend/packages/schema`.
- Contrato `openapi.yaml`.
- Planes en `plan/`.
- Documentacion depurada en `docs_referencia/`.
- Auditorias previas en `docs_referencia/auditorias_y_artefactos/`.

Verificaciones ejecutadas:

- `go test ./...` en `backend/`: pasa tras permitir descarga de modulos.
- `go build ./...` en `backend/`: pasa.
- `pnpm --dir frontend run build`: pasa, con advertencia de chunk grande.
- `pnpm --dir frontend run lint`: pasa.
- `pnpm --dir frontend exec vitest run`: 9 archivos, 67 pruebas, pasa.
- `cargo check` en `frontend/src-tauri`: falla por dependencia del sistema ausente
  (`webkit2gtk-4.1` y `javascriptcoregtk-4.1`), no por error directo de codigo.

Estado git observado antes de escribir este plan:

- Cambios existentes no tocados:
  - `backend/internal/sync/handler.go`
  - `frontend/package.json`
  - `frontend/pnpm-lock.yaml`
  - `frontend/pnpm-workspace.yaml`
  - `frontend/src/features/dashboard/DashboardPage.tsx`
  - `frontend/src/vite-env.d.ts`
  - `docs_referencia/auditorias_y_artefactos/matriz_contratos_base.md`
  - `frontend/src-tauri/Cargo.lock`

## 1. Diagnostico ejecutivo

El proyecto ya no es un esqueleto. Tiene backend, frontend, Tauri, schemas, motores
de minijuegos, OpenAPI y planes. Sin embargo, todavia no es funcional como producto
porque sus piezas principales no cierran una ruta completa:

```text
admin crea seccion -> admin crea nivel oficial -> jugador ve secciones/niveles
-> jugador juega contenido desde BD -> backend calcula XP/progreso -> perfil refleja avance
```

Hoy hay compilacion, pero no hay hilo conductor de producto.

La brecha principal es de integracion:

- El backend tiene auth, sync y niveles parciales.
- El frontend tiene login/register, dashboard, Maker y minijuegos.
- Los minijuegos del frontend usan datos mock en `App.tsx`, no niveles oficiales de PostgreSQL.
- El backend no expone secciones como recurso HTTP.
- El admin no puede crear secciones desde el front.
- El admin puede llamar `POST /levels`, pero el servicio guarda el nivel como `is_published=false`; despues `GET /levels` solo lista publicados. Resultado: nivel fantasma.
- El contrato de plantillas esta fragmentado: DB original usa `trivia`, `puzzle`, `word_search`, etc.; backend acepta `flashcards`, `multiple_choice`, `drag_and_drop`, `memory`; frontend schema usa uppercase `TRIVIA`, `FAKE_NEWS`, etc.; Maker usa lower snake distinto.
- La sincronizacion offline existe como boceto, pero tiene riesgos fuertes de seguridad y concurrencia.
- Tauri tiene IPC parcial: el frontend invoca `set_game_status`, pero Rust no lo declara.

Por tanto, el siguiente trabajo debe empezar en backend para fijar contratos,
roles, base de datos y endpoints oficiales. Despues se conecta el front al flujo
real. No conviene seguir agregando pantallas o juegos hasta cerrar ese hilo.

## 2. Respuestas a las preguntas de auditoria

### 2.1 Backend

#### ¿Esta parte esta completa?

No. Esta compilable y tiene piezas utiles, pero esta incompleta para MVP funcional.

Existe:

- Registro/login/logout.
- JWT con `token_version`.
- Argon2id.
- Blind index para email.
- `POST /sync`.
- `POST /levels` y `GET /levels`.
- Queries generadas por sqlc.
- Migracion inicial.

Falta o esta incompleto:

- `POST /auth/tutor-consent` real. El router devuelve 501.
- Refresh token, si se mantiene el contrato original de sesiones largas.
- Registro/login por telefono, si el requisito lo mantiene.
- Cifrado/lookup de telefono en registro. El DTO tiene `phone`, pero `CreateUser`
  no persiste phone.
- Endpoints de secciones: crear, listar, publicar, archivar, soft delete.
- Publicacion de niveles.
- Edicion y soft delete de niveles.
- Endpoint de completar partida oficial online.
- Perfil/progreso del jugador.
- Insignias.
- Racha calculada.
- Auditoria admin real para cambios de contenido.
- Rutinas ARCO de cancelacion/pseudonimizacion.
- Cron/purgas legales.
- Registro y administracion de dispositivos.
- Sync transaccional completo.

#### ¿Coincide con los requisitos?

Parcialmente.

Coincide en:

- Uso de Go.
- Uso de PostgreSQL.
- SQL type-safe con sqlc.
- Argon2id.
- HMAC/blind index.
- JWT con `token_version`.
- RFC 7807 para errores.
- Separacion por capas.

No coincide o no alcanza:

- El plan de integracion recomendaba `pgx/pgxpool`; el backend usa
  `database/sql` + `lib/pq`.
- La base declarada en `backend/sql/schema.sql` no coincide con la migracion
  real ni con `databaseserv.sql`.
- No hay CRUD de secciones.
- No hay flujo completo de menores/tutor.
- No hay endpoint online de finalizacion de nivel.
- No hay calculo correcto de XP de niveles oficiales.
- No hay `React Query` en el frontend, aunque aparece en el plan de integracion.
- Offline/sync no protege suficientemente contra suplantacion de usuario.

#### ¿Coincide con el plan original?

Parcialmente. El plan maestro pide fases 1-9, y el repo tiene implementaciones
de varias fases, pero no estan conectadas como flujo.

Desalineaciones importantes:

- El plan quiere monorepo `apps/frontend`, `apps/admin`, `packages/*`; el repo
  actual usa `frontend/` con `packages/*` adentro.
- El plan exige `pgxpool`; el backend usa `lib/pq`.
- El plan exige comandos IPC como `set_game_status`; el frontend los llama,
  pero Rust no los expone.
- El plan pide que los juegos se alimenten del backend/progreso; hoy los juegos
  reciben mocks desde `App.tsx`.
- El plan exige Maker local que no afecte XP oficial; existe Maker local, pero
  no hay import/play local completo ni separacion clara con admin oficial.

#### ¿Se esta usando el algoritmo correcto?

Parcial.

Correcto o razonable:

- Argon2id para password hashing.
- HMAC SHA-256 para blind index.
- JWT con `token_version`.
- Motores de minijuegos con pruebas unitarias para varias piezas.
- Fisher-Yates en memoria.
- Generacion determinista parcial en puzzle/sopa.
- Weighted Random en serpientes.

Incorrecto o incompleto:

- XP offline actual en backend usa `100/50/0` fijo. El plan funcional anterior
  define XP base dependiente de dificultad: `4 * difficulty`, con reintentos
  50% y luego 0. Falta traer `difficulty` del nivel.
- `GetLevelAttemptsByDate` usa `SELECT COUNT(*) ... FOR UPDATE`. En PostgreSQL
  `FOR UPDATE` no sirve sobre agregados como `COUNT(*)`; esto puede fallar en
  runtime. Debe resolverse con transaccion, lock por fila de progreso/nivel o
  advisory lock.
- Sync no esta envuelto en transaccion unica. Registra evento, intenta procesar,
  actualiza estado en llamadas separadas.
- Sync no inserta `experience_history`, aunque el esquema lo exige para XP.
- Sync no verifica que `req.UserID` coincida con el JWT.
- Sync no valida que `device_id` pertenezca al usuario antes de aceptar el evento;
  depende de FK, pero falta manejo claro y registro de rechazo.
- HMAC en OpenAPI dice una formula distinta a la implementacion Rust/Go. OpenAPI
  dice `concat(user_id, xp_total, timestamp_unix)`, el codigo firma el JSON con
  `hmac_signature=""`.
- `set_game_status` no existe en Rust, asi que el control de partida activa para
  pausar sync no funciona.

#### ¿Esta parte tiene un camino en el front para utilizarse?

Solo auth/logout tienen camino directo.

Hay camino en front para:

- Login.
- Registro adulto.
- Logout.
- Dashboard protegido.
- Maker local.
- Juegos mock.

No hay camino real para:

- Tutor consent.
- Age-up.
- ARCO.
- Sync desde cola local real.
- Crear secciones oficiales.
- Publicar niveles.
- Listar niveles oficiales con contenido.
- Completar nivel oficial y guardar progreso.
- Ver perfil/progreso.
- Ver badges/racha.

#### ¿Deberia tenerlo?

Si, pero por roles:

- Jugador comun:
  - login/register;
  - aceptar privacidad;
  - flujo tutor si menor;
  - ver secciones publicadas;
  - ver niveles publicados;
  - jugar niveles oficiales;
  - ver XP, racha, badges y progreso;
  - usar Maker local si se decide que es herramienta educativa, sin XP oficial;
  - enviar ARCO.
- Admin/operator:
  - crear/editar/publicar/archivar secciones;
  - crear/editar/publicar/archivar niveles oficiales;
  - revisar contenido;
  - ver auditoria de cambios de contenido.
- Director:
  - lo anterior mas reportes/auditoria/gestion global.

#### ¿Backend se nutre de la base de datos o maneja niveles fantasma?

Hoy el backend de niveles si escribe a BD, pero el producto final sigue usando
niveles fantasma porque el frontend no consume esos niveles para jugar.

Ademas, el propio flujo backend genera fantasma:

- `POST /levels` crea con `is_published=false`.
- `GET /levels` solo lista `is_published=true`.
- No existe endpoint de publicacion.
- No existe endpoint para crear secciones aunque el nivel requiere `section_id`.

Resultado: un admin no tiene una ruta completa para crear contenido usable.

#### ¿A que parte deberia tener acceso admin y usuario comun?

Propuesta de RBAC:

| Area | Player | Admin | Operator | Director |
|---|---:|---:|---:|---:|
| Registro/login/logout | Si | Si | Si | Si |
| Ver secciones publicadas | Si | Si | Si | Si |
| Ver niveles publicados | Si | Si | Si | Si |
| Jugar nivel oficial | Si | Si | Si | Si |
| Ver progreso propio | Si | Si | Si | Si |
| Maker local sin XP | Si, si se aprueba pedagogicamente | Si | Si | Si |
| Crear secciones oficiales | No | Si | Si | Si |
| Crear niveles oficiales | No | Si | Si | Si |
| Publicar/despublicar contenido | No | Si | Si | Si |
| Eliminar/archivar contenido | No | Si | Si limitado | Si |
| Auditoria admin | No | Parcial | Parcial | Si |
| Gestion ARCO | Solicita | Atiende si autorizado | Atiende si autorizado | Supervisa |

Hoy no esta estructurado asi:

- Backend solo acepta `admin` para crear nivel, no `operator/director`.
- Front solo muestra Maker a `admin`, no a `operator/director`.
- No hay panel admin oficial de secciones/niveles.
- Jugadores ven catalogo mock, no contenido publicado.

#### ¿El admin puede crear nuevos niveles y secciones?

No de forma funcional.

- Niveles: existe `POST /api/v1/levels`, pero requiere `section_id` existente,
  crea el nivel sin publicar y no hay pantalla conectada.
- Secciones: existe query sqlc `CreateSection`, pero no hay handler/ruta/servicio
  ni pantalla.

## 3. Auditoria del frontend

### 3.1 ¿Esta completo?

No. El frontend compila y tiene varias piezas valiosas, pero todavia es una
demo avanzada, no una aplicacion funcional.

Existe:

- React Router.
- Login/register.
- ProtectedRoute.
- Zustand auth/settings/sync/game stores.
- Dashboard.
- Maker local parcial.
- Juegos: trivia, sopa, puzzle, crucigrama, fake news, memoria, serpientes.
- Paquetes `@usbi/engine` y `@usbi/schema`.
- Tauri v2 con plugins declarados.
- Pruebas de engine/Maker.

Falta:

- Config local de API por `.env`.
- Consumo real de secciones/niveles oficiales.
- Pantalla admin oficial de contenido.
- Pantalla de perfil/progreso.
- Flujo de completar nivel y guardar XP.
- Manejo real de menor/tutor.
- ARCO UI.
- Cola SQLite local real.
- Integracion Tauri Store para token/secretos.
- Listener del evento `network-status`.
- `set_game_status` IPC.
- Permisos Tauri para dialog/fs/sql/store.
- Rutas de juegos con datos de backend.
- Error/loading/empty states por endpoint real.

### 3.2 ¿Coincide con requisitos y plan?

Parcialmente.

Coincide:

- React 18 + Vite + TypeScript.
- Tauri v2.
- Zustand.
- Zod.
- Filtros visuales de daltonismo.
- Minijuegos implementados o iniciados.
- Maker exporta localmente.

No coincide:

- API hardcodeada a `http://192.168.1.210:8088/api/v1`.
- No usa `VITE_API_BASE_URL`.
- No usa React Query/TanStack Query.
- Tokens se guardan en `sessionStorage`; OpenAPI pide Tauri Plugin Store.
- El registro bloquea menores en UI, aunque backend/modelo considera
  `pending_tutor_consent`.
- Juegos son mocks en `App.tsx`.
- Maker usa `flashcards/multiple_choice`, mientras `schema.ts` usa
  `TRIVIA/FAKE_NEWS/...` y DB original usa `trivia/puzzle/...`.
- Tauri invoca comandos inexistentes.
- Tauri no compila en esta maquina por dependencias WebKit faltantes.

### 3.3 ¿Hay camino front para backend?

| Backend | Front actual | Estado |
|---|---|---|
| `POST /auth/register` | `RegisterPage` | Parcial, solo adultos |
| `POST /auth/login` | `LoginPage` | Si |
| `POST /auth/logout` | `DashboardPage` | Si |
| `POST /auth/tutor-consent` | Ninguno | No |
| `POST /auth/age-up` | Ninguno | No |
| `POST /arco` | Ninguno | No |
| `POST /sync` | `syncEngine`, no conectado a cola real | Parcial/fantasma |
| `GET /levels` | Ninguno real | No |
| `POST /levels` | Ninguno oficial | No |
| Secciones | No hay endpoint backend ni UI | No |
| Completar partida oficial | No hay endpoint backend ni UI | No |

### 3.4 ¿Los juegos usan algoritmo correcto?

Estado resumido:

| Juego | Estado actual | Brecha |
|---|---|---|
| Trivia | Motor y UI existen | Usa mock, no nivel oficial, no persiste resultado |
| Sopa de letras | Motor determinista y Phaser existen | Usa mock, no contenido BD, revisar responsive/canvas |
| Puzzle | Motor y Phaser existen | `imageUrl` mock vacio en ruta actual |
| Crucigrama | Motor/backtracking basico existe | Usa mock, no persistencia |
| Fake News | React + engine existe | Sin Tauri game status ni persistencia |
| Memoria | React + engine existe | Sin Tauri game status ni persistencia |
| Serpientes | Engine + weighted random + Phaser | `set_game_status` mal llamado/inexistente, dificultad parcial |

## 4. Brechas prioritarias

### Criticas

1. **Contratos de plantillas incompatibles.**  
   DB original, backend, frontend schema y Maker no usan el mismo enum.

2. **Admin no puede crear contenido oficial usable.**  
   No hay secciones HTTP/UI, niveles quedan no publicados y no hay publish.

3. **Juegos no nacen de la base de datos.**  
   El dashboard navega a juegos con mocks; no hay nivel oficial ni progreso.

4. **No existe endpoint online de completar nivel.**  
   Sin esto no hay XP/progreso oficial para partidas online.

5. **Sync no es seguro/atomico todavia.**  
   Falta validar JWT user_id, transaccion, evento de experiencia, dificultad,
   device ownership y formula HMAC consistente.

6. **Tauri IPC desalineado.**  
   `set_game_status` se invoca pero no existe; permisos de plugins incompletos.

7. **Configuracion hardcodeada a servidor.**  
   Front y Tauri apuntan a `192.168.1.210:8088`, no a local configurable.

8. **Migracion y `backend/sql/schema.sql` no coinciden.**  
   sqlc probablemente se genera contra `migrations/0001_initial.up.sql`, pero
   `schema.sql` esta obsoleto y puede confundir futuros cambios.

### Altas

9. Falta tutor consent real.
10. Falta perfil/progreso.
11. Falta ARCO UI y rutina de cancelacion.
12. Falta device registration.
13. Falta `refresh token` o decision explicita de no usarlo.
14. Falta seed local/admin inicial documentado.
15. Falta build Tauri reproducible con dependencias del sistema documentadas.

### Medias

16. Bundle frontend grande por cargar Phaser/juegos en rutas principales.
17. Falta React Query o una capa de cache/fetch consistente.
18. Falta separacion entre Maker local y admin oficial.
19. Falta pruebas de handlers/API e integracion DB.
20. Falta trazabilidad de auditoria admin.

## 5. Plan de trabajo propuesto

El orden empieza por backend porque el frontend debe consumir contratos estables.

## Fase A - Congelar contratos y vocabulario unico

Objetivo: dejar de tener tres idiomas para los mismos conceptos.

Trabajo:

1. Definir enum canonico de `template_type`.
   - Recomendacion: usar los valores del esquema SQL oficial:
     - `trivia`
     - `puzzle`
     - `word_search`
     - `fake_news`
     - `crossword`
     - `memory`
     - `snakes_ladders`
   - Dejar de usar `flashcards`, `multiple_choice`, `drag_and_drop` para niveles
     oficiales, salvo que se agreguen formalmente al SQL.

2. Actualizar:
   - `openapi.yaml`
   - `backend/internal/levels/dto.go`
   - `frontend/packages/schema`
   - `frontend/src/lib/schema.ts`
   - `MakerPage`
   - `MINIGAMES_REGISTRY`

3. Separar contratos:
   - Nivel oficial del servidor.
   - Nivel local Maker.
   - Resultado de partida.
   - Evento offline.

4. Corregir OpenAPI:
   - `GET /levels` hoy documenta `limit/offset`, backend usa `cursor/page_size`.
   - `LevelListResponseDTO` dice `{data,total,limit,offset}`, backend retorna
     `{items,next_cursor}`.
   - `SyncEventRequestDTO.hmac_signature` debe documentar exactamente la formula
     usada por Rust/Go.
   - Agregar `/sections`.
   - Agregar `/levels/{id}/publish`.
   - Agregar `/levels/{id}/complete`.
   - Agregar `/profile/progress`.

Criterios de aceptacion:

- Un solo enum de plantilla en DB, Go, Zod, OpenAPI y UI.
- `pnpm --dir frontend exec vitest run` pasa.
- `go test ./...` pasa.
- Un diff de `rg "flashcards|multiple_choice|TRIVIA|SNAKES"` demuestra que no
  quedan valores contradictorios salvo migraciones/compatibilidad documentada.

## Fase B - Backend configuracion local y estructura de ejecucion

Objetivo: que cualquiera pueda correr backend local sin editar codigo.

Trabajo:

1. Crear `backend/.env.example` sin secretos reales.
2. Unificar puerto local:
   - Backend local: `SERVER_PORT=8088` o `8080`, pero documentado.
   - Front usa `VITE_API_BASE_URL`.
3. Decidir si se mantiene `database/sql + lib/pq` o se migra a `pgxpool`.
   - Si el plan original manda, migrar a `pgxpool`.
   - Si se conserva `database/sql`, documentar desviacion.
4. Eliminar o actualizar `backend/sql/schema.sql`.
5. Documentar dependencias de PostgreSQL:
   - `pgcrypto`
   - migracion inicial
   - datos seed
6. Agregar `Makefile` o scripts:
   - `make backend-test`
   - `make backend-run`
   - `make frontend-build`
   - `make verify`

Criterios:

- `go build ./...` pasa.
- `go test ./...` pasa sin depender de estado global raro.
- `backend/.env.example` permite levantar local.
- README indica como crear admin inicial.

## Fase C - Backend secciones oficiales

Objetivo: permitir que admin cree secciones reales y que jugadores vean solo lo publicado.

Endpoints:

- `GET /api/v1/sections`
  - Autenticado.
  - Player ve publicadas.
  - Admin puede pedir `include_unpublished=true`.
- `POST /api/v1/sections`
  - Admin/operator/director.
- `PATCH /api/v1/sections/{id}`
  - Admin/operator/director.
- `POST /api/v1/sections/{id}/publish`
  - Admin/operator/director.
- `POST /api/v1/sections/{id}/archive`
  - Admin/director.

Reglas:

- Soft delete/archivado; no destruir progreso historico.
- `created_by_admin_id` desde JWT.
- `admin_audit_log` sin PII.

Criterios:

- Admin puede crear una seccion.
- Player no puede crear seccion.
- Player solo ve secciones publicadas.
- Admin ve borradores.
- Auditoria queda registrada.

## Fase D - Backend niveles oficiales

Objetivo: que un nivel oficial sea creado, validado, publicado y jugable.

Trabajo:

1. Ajustar `CreateLevelRequest` al enum canonico.
2. Validar `difficulty` 1-10 en servicio, no solo DB.
3. Validar `content` por plantilla.
4. Permitir `is_published` solo via endpoint de publicacion.
5. Agregar:
   - `GET /api/v1/levels/{id}` con contenido.
   - `PATCH /api/v1/levels/{id}`.
   - `POST /api/v1/levels/{id}/publish`.
   - `POST /api/v1/levels/{id}/archive`.
6. `GET /levels` debe soportar `section_id`.
7. Respuesta para player no debe incluir borradores.

Criterios:

- Admin crea nivel en seccion existente.
- Admin publica nivel.
- Player lista nivel publicado.
- Player obtiene contenido del nivel.
- Nivel borrador no aparece al player.
- Nivel archivado no destruye progreso.

## Fase E - Backend partida online, XP y progreso

Objetivo: cerrar la ruta principal del jugador.

Endpoint:

- `POST /api/v1/levels/{id}/complete`

Request sugerido:

```json
{
  "score": 100,
  "completed": true,
  "answers": {},
  "client_finished_at": "2026-07-20T00:00:00Z"
}
```

Reglas:

- El backend lee `levels.difficulty`.
- XP base = `4 * difficulty`.
- Primer intento elegible del dia = 100%.
- Dos reintentos siguientes del dia = 50%.
- Intentos posteriores = 0%.
- Si no se completa, XP = 0, pero se registra intento.
- Insertar `level_attempts`.
- Upsert `player_progress`.
- Insertar `daily_streak` si aplica.
- Insertar `experience_history`.
- Recalcular badges.

Correccion tecnica:

- No usar `COUNT(*) FOR UPDATE`.
- Usar transaccion.
- Opcion A: bloquear `player_progress` con `SELECT ... FOR UPDATE`.
- Opcion B: advisory lock por `(user_id, level_id, date)`.
- Opcion C: tabla/contador de intentos por dia.

Criterios:

- Dos requests concurrentes no duplican attempt_number.
- XP no depende del valor enviado por el cliente.
- `experience_history` refleja cada XP otorgada.
- Perfil muestra XP total.

## Fase F - Backend auth, menores, sesion y ARCO

Objetivo: completar la seguridad legal minima.

Trabajo:

1. Tutor consent:
   - Implementar handler/service/query.
   - Cifrar tutor data.
   - Guardar HMAC de consentimiento.
   - Cambiar usuario de `pending_tutor_consent` a `active`.
2. Registro:
   - Persistir phone cifrado y blind index si se mantiene telefono.
   - Permitir menor solo si se deriva a tutor consent.
3. Login:
   - Decidir si login permite `pending_tutor_consent`. Recomendacion: no permitir
     jugar hasta consentimiento.
4. Refresh:
   - Si se requiere sesion de larga duracion, agregar refresh token con storage
     seguro y revocacion.
5. ARCO:
   - UI y backend deben distinguir solicitud de ejecucion.
   - Cancelacion debe seudonimizar, no destruir ledger.
   - Marcar `devices.wipe_local_data=true`.
6. Cron:
   - Purga de menores pendientes >48h.
   - Bloqueo/cancelacion por inactividad segun politica.

Criterios:

- Menor no queda activo sin tutor.
- Tutor data no se almacena en texto plano.
- ARCO cancelacion no borra auditoria append-only.
- Logout invalida token por `token_version`.

## Fase G - Backend sync offline robusto

Objetivo: que offline sea seguro y consistente.

Trabajo:

1. Registrar dispositivos:
   - `POST /api/v1/devices`.
   - `device_id` emitido/validado por backend.
2. Sync:
   - Validar `req.UserID == claims.UserID`.
   - Validar `device_id` del usuario antes de procesar.
   - HMAC canonico documentado.
   - Procesar en transaccion.
   - Recalcular XP usando la misma funcion que online.
   - Insertar `experience_history`.
   - Rechazos con `status=rejected`, `hmac_valid=false`, `rejection_reason`.
   - No aceptar fechas futuras.
3. Merge:
   - XP suma validada.
   - Niveles completados union.
   - Badges recalculo/union.
   - Racha recalculada por fechas validas.
4. Idempotencia:
   - `sync_event_id` unico real.
   - Repetir evento no duplica XP.

Criterios:

- HMAC invalido queda auditado y no suma XP.
- `device_id` de otro usuario falla.
- XP inflada por cliente se ignora.
- Evento duplicado responde OK sin duplicar.

## Fase H - Front configuracion e integracion API

Objetivo: dejar de apuntar al servidor hardcodeado.

Trabajo:

1. Cambiar `apiClient` a:
   - `import.meta.env.VITE_API_BASE_URL ?? '/api/v1'`.
2. Crear:
   - `frontend/.env.example`.
   - `frontend/.env.local` ignorado por git si aplica.
3. Configurar proxy Vite opcional:
   - `/api/v1 -> http://localhost:8088`.
4. Manejar Problem Details de forma centralizada.
5. Escuchar `auth:unauthorized` para redireccion real.

Criterios:

- Login local no requiere editar codigo.
- Build no contiene IP fija.
- `rg "192.168.1.210|8088"` solo encuentra docs/config example.

## Fase I - Front auth y roles

Objetivo: login/register usable y legalmente correcto.

Trabajo:

1. Registro:
   - Adulto: permite crear cuenta.
   - Menor: no bloquear con mensaje generico; abrir flujo tutor.
   - Checkbox privacidad no preseleccionado.
   - Version de aviso desde config/endpoint, no string quemado si se puede.
2. Login:
   - Si status `pending_tutor_consent`, mostrar estado y siguiente paso.
3. Storage:
   - Web: sessionStorage aceptable como temporal.
   - Tauri: migrar token a Plugin Store.
4. Roles:
   - `ProtectedRoute` debe aceptar admin/operator/director segun permiso.

Criterios:

- Usuario comun no ve admin oficial.
- Admin/operator/director si ven panel de contenido.
- Menor tiene camino a tutor consent.

## Fase J - Front dashboard jugador oficial

Objetivo: reemplazar catalogo mock por contenido real.

Pantallas:

- `/dashboard`
  - resumen de progreso;
  - XP;
  - racha;
  - secciones publicadas;
  - niveles publicados.
- `/sections/:id`
  - niveles por seccion.
- `/levels/:id/play`
  - carga contenido oficial y renderiza juego correcto.
- `/profile`
  - XP, badges, historial, progreso.

Trabajo:

1. Consumir `GET /sections`.
2. Consumir `GET /levels?section_id=...`.
3. Consumir `GET /levels/{id}`.
4. Al terminar juego, enviar `POST /levels/{id}/complete`.
5. Mostrar resultado del backend, no calcular XP como verdad local.

Criterios:

- Nivel del dashboard viene de PostgreSQL.
- Juego no usa mocks de `App.tsx`.
- Resultado persiste y se ve en perfil.

## Fase K - Front admin oficial

Objetivo: que admin cree secciones y niveles oficiales.

Rutas:

- `/admin`
- `/admin/sections`
- `/admin/levels`
- `/admin/levels/new`
- `/admin/levels/:id/edit`

Trabajo:

1. CRUD secciones.
2. CRUD niveles.
3. Publicar/despublicar.
4. Preview de nivel antes de publicar.
5. Validacion Zod por plantilla.
6. Separar claramente:
   - Admin oficial: escribe a PostgreSQL.
   - Maker local: exporta JSON y no afecta XP.

Criterios:

- Admin crea seccion.
- Admin crea trivia oficial dentro de seccion.
- Admin publica.
- Player juega ese nivel.
- Player no puede acceder a `/admin`.

## Fase L - Front juegos oficiales

Objetivo: adaptar cada juego para recibir contenido oficial canonico.

Trabajo por juego:

1. Trivia:
   - Primer juego prioritario.
   - Mapear `content` canonico a `TriviaGame`.
   - Enviar resultado al backend.
2. Memory:
   - Validar min pares.
   - Resultado normalizado.
3. Fake news:
   - Accesibilidad sin depender solo de swipe.
4. Word search:
   - Layout responsive y canvas verificado.
5. Puzzle:
   - Definir assets o placeholder oficial.
6. Crossword:
   - Validar palabras/pistas.
7. Snakes:
   - Unificar `snakes_ladders` en backend/schema/UI.
   - IA parametrizada por contenido.

Criterios generales:

- Cada juego llama `set_game_status(true/false)` solo cuando IPC exista.
- Cada juego destruye Phaser al desmontar.
- Cada juego emite resultado normalizado.
- Ningun juego oficial altera XP directamente en cliente.

## Fase M - Tauri offline/local

Objetivo: que desktop funcione sin red de forma controlada.

Trabajo:

1. Arreglar build local:
   - Documentar instalar `webkit2gtk-4.1`, `javascriptcoregtk-4.1`.
2. Capabilities:
   - Agregar permisos para dialog/fs/sql/store.
3. IPC faltante:
   - `set_game_status`.
   - `get_network_status` o eventos.
   - `init_local_db`.
   - `enqueue_progress`.
   - `sync_local_db`.
4. SQLite:
   - Crear tabla local de cola.
   - No guardar PII.
   - Guardar payload tecnico y hash.
5. Sync:
   - No correr si `isGameActive`.
   - Reintentos 1/2/4s.
   - Limpiar cola solo tras OK servidor.

Criterios:

- Tauri compila en una maquina con dependencias.
- Terminar partida offline deja evento en cola.
- Reconectar sincroniza.
- Durante partida activa no se sincroniza.

## Fase N - Pruebas y calidad

Backend:

- Unitarias:
  - Argon2id.
  - Blind index.
  - JWT token_version.
  - XP por dificultad/intentos.
  - Validacion por plantilla.
  - Sync HMAC.
- Integracion DB:
  - Migracion desde cero.
  - Crear admin.
  - Seccion/nivel/publicacion.
  - Complete level.
  - Sync duplicado.
  - Device spoof.
- API:
  - RBAC player/admin/operator/director.
  - Problem Details.

Frontend:

- Componentes:
  - login/register.
  - secciones/niveles.
  - admin forms.
  - Maker.
  - juegos.
- E2E:
  - admin crea seccion/nivel;
  - jugador juega;
  - perfil muestra XP;
  - Maker exporta local y no suma XP.
- Accesibilidad:
  - teclado;
  - 44x44;
  - contraste;
  - zoom 200%;
  - alternativa a gestos.

Calidad:

- `go test ./...`
- `go build ./...`
- `pnpm --dir frontend run lint`
- `pnpm --dir frontend run build`
- `pnpm --dir frontend exec vitest run`
- `cargo check` documentado con dependencias de sistema.

## 6. Orden recomendado de implementacion

1. Contratos y enum de plantillas.
2. Config local sin IP fija.
3. Endpoints backend de secciones.
4. Endpoints backend de niveles: crear, publicar, obtener contenido.
5. Endpoint backend de completar nivel y XP online.
6. Perfil/progreso.
7. Front dashboard jugador desde BD.
8. Front admin oficial de secciones/niveles.
9. Trivia oficial completa.
10. Tutor consent.
11. Sync robusto y Tauri IPC.
12. Resto de juegos oficiales.
13. Maker local import/play sin XP.
14. ARCO/cron/auditoria avanzada.
15. CI/CD y empaquetado.

## 7. Primer vertical funcional recomendado

Para obtener algo demostrable rapido sin destruir arquitectura:

```text
admin login
-> admin crea seccion
-> admin crea trivia
-> admin publica trivia
-> player login
-> player ve seccion y trivia
-> player juega trivia
-> backend calcula XP
-> player ve XP/progreso
```

Incluye solo `template_type=trivia` en UI inicial, pero el contrato debe quedar
preparado para las siete plantillas oficiales.

## 8. Definicion de terminado para el MVP funcional

El MVP no debe considerarse funcional hasta que se pruebe:

1. No hay IP fija del servidor en frontend/Tauri.
2. Admin puede crear secciones.
3. Admin puede crear niveles oficiales.
4. Admin puede publicar niveles.
5. Player solo ve contenido publicado.
6. Juegos usan contenido de PostgreSQL, no mocks.
7. Completar juego registra:
   - `level_attempts`;
   - `player_progress`;
   - `daily_streak`;
   - `experience_history`.
8. XP se calcula en backend por dificultad e intentos.
9. Player ve XP/progreso.
10. Player no accede a admin.
11. Admin/operator/director tienen permisos claros.
12. Menores no quedan activos sin consentimiento.
13. Maker local no suma XP oficial.
14. `go test`, `go build`, `pnpm build`, `pnpm lint`, `vitest` pasan.

## 9. Conclusion

La prioridad no es escribir mas juegos ni maquillar pantallas. La prioridad es
conectar el producto real:

- contratos unificados;
- contenido oficial en DB;
- roles correctos;
- admin oficial;
- juego oficial;
- XP/progreso calculados en backend;
- front alimentado desde API.

Cuando ese hilo exista, el resto del plan original se vuelve incremental. Mientras
no exista, cada juego nuevo o pantalla nueva aumenta la cantidad de piezas fantasma.
