# USBI

Monorepo local de la plataforma USBI.

## Backend local

1. Copia `backend/.env.local.example` a `backend/.env.local` y ajusta secretos.
2. Aplica las migraciones SQL en `backend/migrations/`.
3. Ejecuta:

```sh
make backend-run-local
```

Para otros entornos puedes copiar `backend/.env.server.example` a un archivo
propio y arrancar con:

```sh
cd backend
USBI_BACKEND_ENV_FILE=.env.server go run .
```

El backend toma puerto, CORS y base de datos desde variables:
`SERVER_PORT`, `CORS_ALLOWED_ORIGIN`, `DB_HOST`, `DB_PORT`, `DB_USER`,
`DB_PASSWORD`, `DB_NAME` y `DB_SSLMODE`. Si prefieres una cadena completa,
`DATABASE_URL` también es aceptada y tiene prioridad. No debe editarse código
para pasar de local a servidor.

La fuente de verdad del esquema es `backend/migrations/`; `backend/sqlc.yaml`
genera repositorios a partir de esas migraciones y `backend/sql/query.sql`.

Healthchecks:

- `/health/live`: liveness del proceso.
- `/health/ready`: readiness; responde `503` si PostgreSQL/PgBouncer no responde.

Para crear un administrador inicial:

```sh
cd backend
USBI_BACKEND_ENV_FILE=.env.local go run ./cmd/create_admin
```

### Mantenimiento Legal

El backend puede ejecutar una rutina interna de retención si
`LEGAL_MAINTENANCE_ENABLED=true`.

Valores por defecto:

- `PENDING_TUTOR_TTL=48h`: seudonimiza cuentas de menor que no completaron
  consentimiento de tutor.
- `INACTIVE_SUSPEND_AFTER=8760h`: suspende jugadores sin actividad durante 1 año
  e invalida sus access tokens con `token_version`.
- `SUSPENDED_CANCEL_AFTER=720h`: seudonimiza sólo cuentas suspendidas por la
  rutina de inactividad tras 30 días; no cancela suspensiones manuales por otros
  motivos.
- `LEGAL_MAINTENANCE_INTERVAL=24h`.

La cancelación por mantenimiento no destruye bitácoras ni progreso técnico:
seudonimiza PII, revoca refresh tokens y marca dispositivos para purga local.

## Frontend local

1. Copia `frontend/.env.local.example` a `frontend/.env.local` y ajusta la API si aplica.
2. Ejecuta:

```sh
make frontend-dev
```

Para servidor, usa `frontend/.env.server.example` como base para el archivo de
variables que se usará durante el build.

`VITE_API_BASE_URL` controla la URL del backend. No debe editarse código para
cambiar entre local, servidor de pruebas o producción.
`VITE_PRIVACY_NOTICE_VERSION` controla la versión enviada en registro y
consentimiento de tutor.

El frontend usa TanStack Query para las lecturas principales del jugador
(`/sections`, `/levels`, `/profile/progress`) y refresca el cache tras completar
un nivel oficial.

Las rutas y minijuegos se cargan con `React.lazy`. Phaser queda aislado en un
chunk dinámico de juegos para no penalizar el primer acceso a login/dashboard.

## Tauri local

El wrapper Tauri no es necesario para ejecutar la app web. Si se retoma la app
de escritorio, usa WebKitGTK en Linux. Antes de `cargo check` o
`pnpm tauri dev`, instala los paquetes de sistema equivalentes a:

```sh
webkit2gtk-4.1
javascriptcoregtk-4.1
```

El ping de conectividad de escritorio usa `USBI_BACKEND_ADDR`. La firma HMAC de
sync lee `USBI_HMAC_SECRET` desde el proceso Rust; debe coincidir con
`HMAC_SECRET` del backend y no se pasa desde JavaScript.

La cola offline de Tauri usa SQLite local en `usbi_local.db` y guarda sólo:
`user_id`, `device_id`, payload técnico de progreso y fecha de creación. No
guarda nombre, correo, teléfono ni datos de tutor.

Los tokens y `device_id` se guardan en Tauri Plugin Store cuando la app corre en
escritorio. En navegador se usa `sessionStorage` como fallback temporal.

## Progreso, insignias y ARCO

Los niveles oficiales aceptan las plantillas canónicas `trivia`, `puzzle`,
`word_search`, `fake_news`, `crossword`, `memory` y `snakes_ladders`. El frontend
y el backend validan el JSON por plantilla; Trivia mantiene el formulario guiado
en admin y el resto puede cargarse como JSON validado.

El backend calcula XP e insignias a partir de `experience_history`. Las insignias
base se cargan con `backend/migrations/0004_seed_badges.up.sql`.

Las solicitudes ARCO se crean con `POST /api/v1/arco` y devuelven `request_id`
como folio técnico. La resolución autorizada usa
`POST /api/v1/arco/{request_id}/resolve`; si se aprueba una cancelación, el
backend pseudonimiza PII, revoca refresh tokens y marca dispositivos para purga
local en la siguiente sincronización.

## Verificación

```sh
make verify
```
