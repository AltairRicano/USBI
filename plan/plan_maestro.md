# Plan Maestro - Proyecto USBI

## Topología del Monorepo y ### Estructura de Directorios

> [!IMPORTANT]
> **DIRECTIVAS SISTÉMICAS OBLIGATORIAS:**
> - **Privacidad Institucional:** Estás desarrollando un sistema gubernamental regulado. La privacidad por diseño (GDPR-K, COPPA) no es opcional. Prohibido destruir logs de auditoría; usa seudonimización criptográfica para preservar el No-Repudio.
> - **Prohibido Alucinar BD y JSON:** Extrae la estructura textual exacta del Diccionario de Datos. Consulta `openapi.yaml` antes de programar enrutadores.
> - **Protocolo de Intervención Humana (PAUSE EXECUTION):** Detén tu ejecución devolviendo el control al sistema. Espera el comando 'Aprobado' (o 'Code Review' humano) antes de continuar.
> - **Testing:** Prioriza pruebas de estrés para criptografía (HMAC/Argon2id) y Additive Merge. No pierdas tokens en CRUDs básicos.
> - **Reglas de Código Estricto:**
>   - PROHIBIDO usar `any` en TypeScript. Tipado estricto interconectado con Zod.
>   - Implementa estricta Inyección de Dependencias (DI) en Go. Cero variables globales.
>   - Frontend separado en: Lógica de estado (Hooks/Zustand), UI presentacional (Componentes) y Motor de juego (Phaser 3) comunicados por un EventBus.
>   - **Manejo Seguro del Ciclo de Vida (Phaser):** Todo minijuego debe estar envuelto en un HOC/Provider que garantice `game.destroy(true)` al desmontar.
>   - **IPC Estricto (Rust):** Nunca alucines comandos Tauri. Declara primero en `main.rs`, tipa en TS, y luego consume.
>   - **Verificación de Compilación:** Ejecuta SIEMPRE `go build` o `tsc --noEmit` para validar tu código antes de avanzar.

- [ ] Estructura el monorepo según el siguiente árbol de directorios objetivo:

```text
.
├── apps/
│   ├── admin/             # Dashboard administrativo y Maker (Empaquetado con Tauri)
│   └── frontend/          # Cliente Tauri + React (Aplicación principal)
├── backend/               # Backend Go (Aislado)
│   ├── cmd/server/        # Entrypoint
│   ├── internal/          # Lógica, API y Repositorios
│   └── migrations/        # Migraciones y queries SQL
├── packages/
│   ├── engine/            # Lógica base de los minijuegos (Phaser / React)
│   ├── schema/            # Esquemas Zod y tipos compartidos
│   └── ui/                # Sistema de componentes React compartidos
├── pnpm-workspace.yaml    # Configuración del workspace
└── docker-compose.yml     # Orquestación de contenedores locales
```

- [ ] Configura los espacios de trabajo en el archivo `pnpm-workspace.yaml` para incluir los directorios `apps` y `packages`.

## Fase 0.5: Contratos y Setup Inicial

> [!IMPORTANT]
> **OBLIGATORIO ANTES DE EMPEZAR:** El sub-agente asignado a esta fase DEBE leer obligatoriamente todos los archivos de especificación en `/mnt/wolf/codigo/usbi/plan/...` ANTES de intentar generar cualquier documento. Si falta el Diccionario de Datos o los requisitos, PAUSA LA EJECUCIÓN y exígelos al usuario.

- [ ] Genera el archivo `openapi.yaml` basándote ESTRICTAMENTE en las especificaciones del plan.
- [ ] Define los contratos DTO exactos que viajarán entre el Backend (Go) y el Frontend (React).
- [ ] Asegura que el `openapi.yaml` esté completamente alineado con el Diccionario de Datos Oficial.
- [ ] Documenta explícitamente el esquema de datos bancarios de minijuegos (ej. JSON de preguntas de trivia) en el contrato OpenAPI.
- [ ] Genera el archivo `LICENSE` (Apache 2.0) obligatorio para el motor de minijuegos `packages/engine` y aplica las cabeceras legales correspondientes en el código fuente (Cumplimiento Legal).

## Fase 1: Infraestructura y Base de Datos (Backend Core)

> [!WARNING]
> Remítete explícitamente al **Diccionario de Datos Oficial** para todas las definiciones exactas de entidades, tipos de datos y esquemas de tablas. No uses bloques `CREATE TABLE` aquí.

- [ ] Define la estructura de carpetas del proyecto en Go siguiendo el estándar de arquitectura de capas:
  - `backend/cmd/server/main.go` (Entrypoint)
  - `backend/internal/transport/` (Capa de transporte HTTP, Chi Router)
  - `backend/internal/domain/` (Modelos de negocio y lógica)
  - `backend/internal/repository/` (Capa de persistencia SQLc)
- [ ] Crea la configuración del entorno de desarrollo local implementando Docker y `docker-compose.yml` (incluye PostgreSQL y el servicio backend).
- [ ] Configura la conexión a la base de datos PostgreSQL usando la librería `pgxpool`. **[Cumple RNF1]**
- [ ] Define la gestión de variables de entorno y secretos (`DATABASE_URL`, `HMAC_SECRET`, `JWT_SECRET`) mediante `.env` (desarrollo) o un gestor de secretos (producción). Prohíbe el hardcodeo.
- [ ] Configura los certificados SSL/TLS 1.2 o superior en el servidor Go para asegurar toda la comunicación en tránsito. **[Cumple RF69]**
- [ ] Implementa `sqlc` en Go para la generación de código type-safe a partir de sentencias SQL puras, garantizando el rendimiento. **[Cumple RNF2]**
- [ ] Genera los scripts de migración SQL (`golang-migrate`) siguiendo rigurosamente las estructuras definidas en el **Diccionario de Datos Oficial**.
- [ ] Configura rutinas de respaldo automatizadas (`pg_dump` con `zstd`) para el Plan de Recuperación de Desastres (DRP) en un entorno de almacenamiento On-Premise (max 20GB).

## Fase 2: Core del Backend, Autenticación y Seguridad

- [ ] Implementa el enrutamiento HTTP utilizando Chi Router en `backend/internal/transport/`.
- [ ] Configura los middlewares globales: logging, CORS y recuperación de panics.
- [ ] Implementa el Auth Flow estricto: `1) Parseo Zod/Go-Playground -> 2) Hashing Argon2id -> 3) Inserción SQL (pgcrypto) -> 4) Retorno JWT`. Incluye el flujo de Consentimiento de Tutor para menores de edad.
- [ ] Desarrolla el inicio de sesión (`/api/v1/auth/login`) extrayendo el hash ciego (HMAC/SHA-256) del correo/teléfono y validando contraseñas cifradas en Argon2id. **[Cumple RF4]**
- [ ] Implementa el endpoint de **Logout** (`/api/v1/auth/logout`) que incremente el `token_version` del usuario en PostgreSQL para invalidar sesiones activas.
- [ ] Desarrolla el endpoint de Transición a Mayoría de Edad (Ley 251) como un flujo manual (Self-Service). El cálculo de reintentos (máx 3) se guarda en BD para bloquear temporalmente la cuenta si se excede.
- [ ] Desarrolla la **rutina ARCO posterior (Cancelación/Pseudonimización)** que anonimiza datos en `users` y aplica reemplazo criptográfico (HASH) sobre identificadores en `admin_audit_log` para no destruir el vínculo de identidad y mantener el No-Repudio (Evita ON DELETE SET NULL), cumpliendo estrictamente con la Ley Número 251 del Estado de Veracruz y la LGPDPPSO (México).
- [ ] Estandariza el manejo de errores HTTP bajo la especificación **RFC 7807 (Problem Details for HTTP APIs)**. **[Cumple RNF11 - Trazabilidad]**
- [ ] Construye la arquitectura en `packages/schema` configurando correctamente su `package.json` para exportar esquemas Zod (validación universal).
- [ ] Expón el contrato API exacto para la sincronización de progreso (`POST /api/v1/sync`). Todo cálculo de XP (Retries 50%/0%) DEBE hacerse en Go haciendo un `SELECT ... FOR UPDATE` de la tabla `level_attempts`. NUNCA confíes en la XP calculada por el cliente.

## Fase 2.5: Trabajos en Segundo Plano y Purgas Legales (Cron)

> [!IMPORTANT]
> Esta fase implementa los requisitos legales más estrictos (COPPA, GDPR-K, Ley 251 y Derechos ARCO) que deben ejecutarse silenciosamente en segundo plano.

- [ ] Implementa un worker asíncrono (Cron job en Go) para rutinas diarias.
- [ ] Desarrolla la purga de cuentas con `pending_tutor_consent` que no hayan sido verificadas en 48 horas (Protección de menores / GDPR-K).
- [ ] Desarrolla la purga ARCO por Inactividad: Tras 1 año (365 días) de inactividad comprobada, los datos deben ser bloqueados y cancelados en un plazo máximo de 30 días, aplicando reemplazo criptográfico (HASH) sobre identificadores en `admin_audit_log` para no destruir el vínculo de identidad y mantener el No-Repudio.

## Fase 3: Core del Frontend y Sistema de Diseño (UI/UX)

- [ ] Inicializa el proyecto en `apps/frontend` usando React 18, Vite y TypeScript.
- [ ] Configura el linter de accesibilidad `eslint-plugin-jsx-a11y`. Configura filtros CSS/SVG específicos para Protanopia, Deuteranopia y Tritanopia. **[Cumple RNF16]**
- [ ] Establece la infraestructura para Telemetría de Errores anónima (RNF14), asegurando un fallback local en caso de estar offline.
- [ ] Construye la arquitectura en `packages/ui` basada en Tailwind CSS, configurando las variables de los **Colores Institucionales** dictados en el documento de requerimientos. **[Cumple RNF8]**
- [ ] Implementa una *Checklist* estricta de Accesibilidad en todos los componentes: Área de clic mínima de 44x44px, tamaño de fuente base de 14px, soporte de zoom 200% y temporizadores de juego opcionales. **[Cumple RNF5 y RNF15]**
- [ ] Configura la arquitectura de estado global con Zustand dividiendo estrictamente en Slices: `AuthSlice`, `SyncSlice` y `GameSlice`.
- [ ] Define los protocolos de manejo de errores UI: Zustand debe interceptar los códigos HTTP 403 / 401 (Problem Details) y desplegar Modales/Toasts de error estandarizados.
- [ ] Implementa la gestión de autenticación, el almacenamiento seguro de tokens (Tauri Plugin Store) y el flujo de protección de rutas (Protected Routes).

## Fase 4: Sincronización Offline y Base de Datos Local (Tauri)

> [!WARNING]
> Este proyecto utiliza exclusivamente **Tauri + SQLite** para el cliente de escritorio y el almacenamiento local. Ignora por completo menciones a Electron o PouchDB.

- [ ] Integra Tauri v2 al frontend en `apps/frontend` para la generación de binarios multiplataforma.
- [ ] Configura el plugin de SQLite local en Tauri para almacenar el progreso offline (usa la estructura exacta de `local_progress` dictada en el **Diccionario de Datos Oficial**). **[Cumple RF18 - Modo Offline]**
- [ ] Implementa el sellado criptográfico HMAC SHA-256 de cada registro de XP en SQLite para prevenir inyecciones fraudulentas (Anti-trampas).
- [ ] Implementa *Blind Indexing* local: Almacena únicamente hashes de los correos/teléfonos en SQLite, nunca datos en texto plano.
- [ ] Configura el estado global en Tauri. El frontend debe obtener las variables de entorno (como `crypto_key_version` o semilla SQLite) **únicamente a través de comandos IPC** sin hardcodearlas en JavaScript.
- [ ] Implementa la detección de red híbrida utilizando un Ping TCP asíncrono en Rust apoyado en el runtime `Tokio`. Utiliza canales `tokio::mpsc` para aislar el ping ligero y evitar bloquear el hilo principal de Tauri. **[Cumple RNF6]**
- [ ] Construye la política de reintentos (Retry Policy): Retroceso exponencial (1s -> 2s -> 4s) con **Jitter** aleatorio y un Timeout máximo de 30s. **[Cumple RNF11 - Retries]**
- [ ] Define los comandos IPC de Tauri explícitos: `invoke('sync_local_db')`, `invoke('verify_hmac')`, `invoke('wipe_local_data')`.

> [!NOTE]
> Handshake de Sincronización (Mermaid):
> ```mermaid
> sequenceDiagram
>     React Frontend->>Tauri Rust: invoke('sync_local_db')
>     Tauri Rust->>SQLite Local: Validar HMAC(secret, concat(userId, xp, timestamp))
>     SQLite Local-->>Tauri Rust: Datos Válidos
>     Tauri Rust->>Go Backend: POST /api/v1/sync (Payload JSON)
>     Go Backend->>PostgreSQL: Additive Merge / Last-Write-Wins (Validar Reloj Servidor)
>     PostgreSQL-->>Go Backend: Sync OK
>     Go Backend-->>Tauri Rust: HTTP 200 OK
>     Tauri Rust-->>React Frontend: Sincronización Exitosa
> ```

- [ ] Implementa el flujo de Sincronización y Resolución de Conflictos como un checklist estricto:
  1. Validar la firma HMAC SHA-256 local. (Fórmula exacta requerida: `HMAC(secret, concat(userId, xp, timestamp))`).
  2. Verificar estrictamente que `XP > 0` para prevenir inyecciones negativas.
  3. Ejecutar *Additive Merge* sumando la XP total: `ServerXP = ServerXP + LocalXP`.
  4. Ejecutar *Last-Write-Wins* basado en timestamp: `UPDATE stats SET last_played = LocalTimestamp WHERE LocalTimestamp > ServerTimestamp AND LocalTimestamp <= CurrentServerClock`. Rechazar `LocalTimestamp` si es del futuro (Anti Time-Spoofing).
  5. Unificar insignias locales y remotas mediante Union, y recalcular la Racha Diaria fusionando los arreglos (arrays) de fechas de actividad locales y remotas.
- [ ] Obligatorio: La sincronización pesada en segundo plano de SQLite debe pausarse/posponerse si hay una partida en curso (RF68), PERO se debe mantener el *heartbeat* (Ping TCP) ligero activo para no figurar como desconectado.

## Fase 5: Módulo de Administración y Maker

- [ ] Inicializa el proyecto del Dashboard administrativo en `apps/admin`.
- [ ] Desarrolla el creador de niveles (Maker) mediante una interfaz visual que exporte un JSON estructurado **exclusivamente al FileSystem local**. El servidor NO almacena JSONs de Maker.
- [ ] Implementa los comandos IPC en Tauri (`read_maker_json`, `write_maker_json`) para interactuar con los niveles creados.
- [ ] Implementa el endpoint `POST /api/v1/levels` en el backend Go que interactúe ÚNICAMENTE con los niveles oficiales administrados en base de datos.
- [ ] Define esquemas Zod para estructuras complejas de datos (ej. tablero de crucigrama).

## Fase 6: Desarrollo de Minijuegos Core

- [ ] Desarrolla el minijuego de **Trivia** (React Puro):
  - [ ] 1. Crear `interfaces/IGameState.ts` (tipos estrictos compartidos).
  - [ ] 2. Implementar `TriviaEngine.ts` (Máquina de estados: Wait → Question → Answer → Feedback).
  - [ ] 3. Implementar `TriviaBoard.tsx` consumiendo el store de Zustand.
  - [ ] 4. Configurar EventBus para emitir `ON_GAME_START`, `GAME_OVER`, `XP_GAINED`. NUNCA mutar el DOM de React directamente desde el motor.
  - [ ] 5. Llamar a `invoke('set_game_status', true)` al iniciar y `false` al terminar.
- [ ] Desarrolla el minijuego de **Sopa de Letras** (Phaser 3):
  - [ ] 1. Algoritmo de generación de Grid (Matriz NxM).
  - [ ] 2. Lógica de posicionamiento de palabras (Horizontal, Vertical, Diagonal sin colisiones).
  - [ ] 3. Manejo de punteros (Input Pointer Drag & Release).
  - [ ] 4. Validación de la selección contra el diccionario local de respuestas.
  - [ ] 5. Instanciar usando `@phaserjs/react` explícitamente y garantizar `game.destroy(true)` al desmontar.
- [ ] Desarrolla el minijuego de **Rompecabezas** (Phaser 3):
  - [ ] 1. Algoritmo de Spatial Shuffling determinístico.
  - [ ] 2. Lógica de drag-and-drop con snap a coordenadas objetivo.
  - [ ] 3. Instanciar usando `@phaserjs/react` explícitamente y garantizar `game.destroy(true)`.
- [ ] Para todos los juegos Phaser: NO alucines assets externos; usa `Phaser.GameObjects.Graphics` como placeholders.
- [ ] Conecta los minijuegos al sistema de cálculo de progreso (100%, 50%, 0% XP según intento, calculado en backend).
## Fase 7: Minijuegos - Paquete 2 (Fake News, Crucigrama, Memorama)

- [ ] Desarrolla **Fake News** (React DOM):
  - [ ] 1. Crear `interfaces/IGameState.ts`.
  - [ ] 2. Configurar EventBus para emitir `ON_GAME_START`, `GAME_OVER`.
  - [ ] 3. Llamar a `invoke('set_game_status', true)` al iniciar.
- [ ] Desarrolla **Crucigrama** (Phaser 3):
  - [ ] 1. Generar diagrama Mermaid para la máquina de estados.
  - [ ] 2. Algoritmo de Backtracking para generación del grid.
  - [ ] 3. Configurar EventBus para emitir eventos de progreso de palabras.
  - [ ] 4. Instanciar usando `@phaserjs/react` y garantizar `game.destroy(true)`.
- [ ] Desarrolla **Memorama** (React DOM):
  - [ ] 1. Algoritmo de barajado de cartas (Fisher-Yates).
  - [ ] 2. Lógica de volteo con delay (timeout) y validación de pares.

## Fase 8: Minijuegos - Paquete 3 (Serpientes y Escaleras con IA)

- [ ] Desarrolla **Serpientes y Escaleras** (Phaser 3) con IA por turnos (RF58-RF65):
  - [ ] 1. Crear `interfaces/IGameState.ts`.
  - [ ] 2. Generar diagrama Mermaid para la máquina de estados, incluyendo transiciones probabilísticas de la IA.
  - [ ] 3. Generación del tablero mapeando índices lineales a coordenadas X/Y de cuadrícula serpenteante.
  - [ ] 4. Animaciones de movimiento de fichas (tweens) para jugador e IA.
  - [ ] 5. Modelo probabilístico con pesos variables (Weighted Random) por rango de posición (ej. 60% probabilidad de fallo en casillas clave).
  - [ ] 6. Configurar EventBus. Llamar a `invoke('set_game_status', true)` al iniciar.
  - [ ] 7. Instanciar usando `@phaserjs/react` y garantizar `game.destroy(true)`.

## Fase 9: Empaquetado, Optimización y CI/CD

- [ ] Configura los pipelines de construcción (CI/CD) utilizando Gitea Actions o GitHub Actions, definiendo secrets y rutinas automáticas de build.
- [ ] Ejecuta una auditoría de accesibilidad obligatoria (WCAG 2.1 AA) en toda la interfaz de usuario.
- [ ] Escribe pruebas E2E con Playwright validando específicamente el flujo de desconexión (offline) y reconexión exitosa.
