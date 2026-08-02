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

## Checklist de release

- `go test ./...` pasa en backend.
- `pnpm run build` pasa en frontend.
- `openapi.yaml` parsea como YAML valido.
- Migraciones aplicadas en orden.
- Usuario administrador inicial creado con `backend/cmd/create_admin`.
- `/health/live` responde `200`.
- `/health/ready` responde `200` con PostgreSQL disponible.
- Nginx sirve `frontend/dist` y proxifica `/api/v1`.
- Si Nginx es la única vía de acceso al backend, `TRUST_PROXY_HEADERS=true` en el
  `.env` del servidor (ver nota B3 en la sección Nginx arriba); si no, permanece
  `false`.
- Backups de PostgreSQL probados fuera del horario de uso.
- Documentacion interna sensible separada antes de publicar el repositorio.

## Limitaciones conocidas

- El Maker local no sube niveles comunitarios al servidor; guarda en
  `localStorage` o exporta JSON.
- Tauri en Linux requiere WebKitGTK en la maquina cliente de desarrollo.
- Phaser se carga como chunk dinamico; el primer juego que lo usa puede tardar
  mas que las pantallas administrativas.
