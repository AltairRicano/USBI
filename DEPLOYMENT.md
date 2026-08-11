# Despliegue USBI

Guia funcional para desplegar USBI en el servidor final previsto:
1 vCPU, 1 GB RAM y 20 GB de almacenamiento, con PostgreSQL en el mismo equipo.

## Regla principal

El servidor final no debe compilar assets ni dependencias. En produccion solo
deben copiarse artefactos ya construidos:

- binario Go del backend;
- carpeta `frontend/dist`;
- migraciones `backend/migrations`;
- archivos `.env` del entorno.

No ejecutar en el servidor final: `pnpm install`, `pnpm run build`,
`cargo build`, `pnpm tauri` ni builds de Vite/Tauri.

## Variables

Backend:

```sh
SERVER_PORT=8080
CORS_ALLOWED_ORIGIN=https://usbi.edu.mx
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=usbi
DB_PASSWORD=...
DB_NAME=usbi
DB_SSLMODE=disable
DB_MAX_OPEN_CONNS=8
DB_MAX_IDLE_CONNS=4
DB_CONN_MAX_LIFETIME=30m
DB_CONN_MAX_IDLE_TIME=5m
JWT_SECRET=...
HMAC_SECRET=...
BLIND_INDEX_SECRET=...
PGP_ENCRYPTION_KEY=...
LEGAL_MAINTENANCE_ENABLED=true
```

Frontend, al momento de construir:

```sh
VITE_API_BASE_URL=https://usbi.edu.mx/api/v1
VITE_PRIVACY_NOTICE_VERSION=2026-07
```

## Construccion fuera del servidor

Backend:

```sh
cd backend
CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o ../dist/usbi-backend .
```

Frontend:

```sh
cd frontend
pnpm install --frozen-lockfile
pnpm run build
```

Verificacion previa:

```sh
cd backend
GOCACHE=/tmp/go-build go test ./...
cd ../frontend
pnpm run build
```

## Base de datos

Crear usuario/base y aplicar migraciones con la herramienta elegida por el
equipo (`goose`, `golang-migrate` o `psql` ordenado por nombre de archivo).

Perfil PostgreSQL sugerido para 1 GB RAM:

```conf
shared_buffers = 128MB
work_mem = 4MB
maintenance_work_mem = 64MB
max_connections = 20
effective_cache_size = 512MB
```

Si se instala PgBouncer, mantener el pool del backend bajo (`DB_MAX_OPEN_CONNS`
entre 4 y 8) para no saturar memoria.

## Nginx

Ejemplo minimo:

```nginx
server {
    listen 443 ssl http2;
    server_name usbi.edu.mx;

    root /srv/usbi/frontend/dist;
    index index.html;

    # Cabeceras de seguridad (hallazgo de auditoría CN-003). La SPA se sirve como
    # estáticos directamente por Nginx, así que su Content-Security-Policy debe
    # configurarse AQUÍ (el backend Go solo endurece sus propias respuestas JSON).
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    # Punto de partida: AJUSTAR contra el build real de Vite/Phaser antes de
    # producción. Si el index.html generado incluye un <script> inline (polyfill
    # de module-preload de Vite), añade su hash sha256 a script-src o usa un nonce;
    # si Phaser 4 compila WASM en runtime, añade 'wasm-unsafe-eval' a script-src.
    add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'" always;

    location /api/v1/ {
        proxy_pass http://127.0.0.1:8080/api/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /health/ {
        proxy_pass http://127.0.0.1:8080/health/;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Importante (hallazgo de auditoría B3):** este Nginx de ejemplo reenvía
`X-Real-IP`/`X-Forwarded-For`, pero el backend por defecto **no confía** en esos
encabezados (`TRUST_PROXY_HEADERS=false`). Si se despliega así tal cual, TODO el
tráfico del sitio comparte la IP de loopback de Nginx en el rate limiter (diluyendo
la protección de fuerza bruta) y en la IP legal registrada en `tutor_consents`. Con
este Nginx delante, agrega `TRUST_PROXY_HEADERS=true` al `.env` del backend — pero
**sólo** si Nginx es la única forma de llegar al puerto del backend (si el puerto
8088/8080 fuera alcanzable directamente, cualquier cliente podría spoofear su propia
IP inventando esos encabezados). El backend también loguea una advertencia si
detecta que todas las IPs observadas son idénticas (señal de esta misma mala
configuración).

## systemd

```ini
[Unit]
Description=USBI backend
After=network.target postgresql.service

[Service]
User=usbi
Group=usbi
WorkingDirectory=/srv/usbi/backend
Environment=USBI_BACKEND_ENV_FILE=/srv/usbi/backend/.env.server
ExecStart=/srv/usbi/backend/usbi-backend
Restart=on-failure
RestartSec=5
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

## Backups y recuperacion (DRP)

`backend/scripts/drp_backup.sh` respalda la base con `pg_dump --format=plain`
comprimido con `zstd`, escribe un checksum `.sha256` junto al archivo, y purga
backups (y sus checksums) con mas de `USBI_BACKUP_RETENTION_DAYS` dias
(default 30). Variables requeridas: `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/
`PGDATABASE`. Opcional: `USBI_BACKUP_DIR` (default `/var/backups/usbi_db`).

```sh
PGHOST=... PGPORT=5432 PGUSER=usbi PGPASSWORD=... PGDATABASE=usbi_db \
  bash backend/scripts/drp_backup.sh
```

Para restaurar, usa `backend/scripts/drp_restore.sh` (verifica el checksum
automaticamente si el archivo `.sha256` esta presente, y pide confirmacion
interactiva escribiendo el nombre de la base destino, salvo que se pase
`--yes`):

```sh
PGHOST=... PGPORT=5432 PGUSER=usbi PGPASSWORD=... PGDATABASE=usbi_db \
  bash backend/scripts/drp_restore.sh /ruta/al/usbi_backup_YYYYMMDD_HHMMSS.sql.zst
```

**Importante**: el restore reproduce sentencias `CREATE TABLE`/`INSERT` contra
`PGDATABASE`, que debe existir y estar vacia (o ser aceptable sobrescribirla);
el script no crea ni borra la base de datos por si mismo, a proposito, para
que un typo en `PGDATABASE` no pueda destruir la base equivocada. Para
restaurar sobre el mismo nombre de una base con datos reales: crea una base
nueva vacia, restaura ahi, verifica, y solo entonces decide el corte
(renombrar bases, o apuntar la app a la nueva). Todo el restore corre en una
sola transaccion (`--single-transaction`): si algo falla a medias, revierte
completo en vez de dejar un estado parcial.

Verificado en la practica (2026-08-02): backup real + restore real contra una
base temporal desechable en el mismo Postgres, confirmando que tablas,
indices y conteos de filas coinciden exactamente con el origen.

## Checklist de release

- `go test ./...` pasa en backend.
- `pnpm run build` pasa en frontend.
- `openapi.yaml` parsea como YAML valido.
- Migraciones aplicadas en orden.
- Usuario administrador inicial creado con `backend/cmd/create_admin`.
- `/health/live` responde `200`.
- `/health/ready` responde `200` con PostgreSQL disponible.
- Nginx sirve `frontend/dist` y proxifica `/api/v1`.
- Nginx emite las cabeceras de seguridad (`X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Strict-Transport-Security`, `Content-Security-Policy`) y la CSP
  fue validada contra el build real de Vite/Phaser (ver nota CN-003 en la sección
  Nginx). El backend también las emite en las respuestas del API.
- Si Nginx es la única vía de acceso al backend, `TRUST_PROXY_HEADERS=true` en el
  `.env` del servidor (ver nota B3 en la sección Nginx arriba); si no, permanece
  `false`.
- Backups de PostgreSQL probados fuera del horario de uso (ver "Backups y
  recuperacion (DRP)" arriba: `drp_backup.sh` + `drp_restore.sh` contra una
  base temporal, no solo generar el archivo).
- Documentacion interna sensible separada antes de publicar el repositorio.

## Limitaciones conocidas

- El Maker local no sube niveles comunitarios al servidor; guarda en
  `localStorage` o exporta JSON.
- Tauri en Linux requiere WebKitGTK en la maquina cliente de desarrollo.
- Phaser se carga como chunk dinamico; el primer juego que lo usa puede tardar
  mas que las pantallas administrativas.
