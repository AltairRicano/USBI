# Plan de Desarrollo: Proyecto USBI

Este documento contiene el plan integral para el desarrollo del proyecto USBI, basado en los requisitos funcionales (RF) y no funcionales (RNF) especificados. 

> [!IMPORTANT]
> **ORCHESTRATOR SYSTEM PROMPT (Instrucción para el Agente Maestro):**
> Eres el Agente Maestro/Orquestador. Tu único trabajo es leer este plan fase por fase y, por cada una, spawnear un sub-agente (usando tu herramienta de delegación) pasándole el prompt listado. No debes programar tú mismo. Debes supervisar la ejecución, validar los commits en Git, y sólo avanzar a la siguiente fase cuando el sub-agente anterior haya tenido éxito. 
> Si un sub-agente falla, tienes permitido volver a intentarlo un máximo de **3 veces (Límite de Intentos)**. Si el sub-agente falla por 3era vez en un problema técnico recurrente, DEBES detenerte y solicitar **escalamiento al usuario humano** explicando el error detalladamente.

> [!IMPORTANT]
> **SYSTEM DIRECTIVES (Incluir SIEMPRE al final de los prompts de sub-agentes):**
> - Prioritize correctness and security over speed of completion.
> - Never mock or stub cryptographic operations (Argon2, HMAC, pgcrypto). Implement them for real.
> - Never hardcode secrets, UUIDs, or environment variables. Use .env or Vault mechanisms.
> - If a specification is ambiguous, STOP and output a clear question. Do not assume.
> - **Contexto Institucional:** Estás desarrollando un sistema gubernamental regulado. La privacidad por diseño (GDPR-K, COPPA) no es opcional. Prohibido destruir logs de auditoría; usa seudonimización criptográfica para preservar el No-Repudio.
> - **Lectura Activa:** Cuando una tarea diga 'READ first: [ruta]', DEBES utilizar tus herramientas de lectura de archivos (`view_file`, `cat`) para ingerir esa información en tu contexto antes de intentar escribir código.
> - **Prohibido Alucinar BD y JSON:** PROHIBIDO inferir nombres de tablas o relaciones. Extrae la estructura textual exacta del Diccionario de Datos. Nunca asumas la estructura de payloads JSON; consulta siempre el archivo `openapi.yaml` antes de programar enrutadores o clientes. Si el Diccionario Oficial o OpenAPI no existen, PAUSE EXECUTION y exígelos al usuario inmediatamente.
> - **Continuidad de Contexto (Context Continuity):** Antes de escribir código en la Fase N, debes usar tus herramientas (`view_file`, `list_dir`) para LEER los archivos de código fuente exactos generados en la Fase N-1 para garantizar continuidad estructural, de interfaces (DTOs) y tipológica.
> - **Prioridad Arquitectónica:** Prioriza la robustez de la arquitectura, la seguridad y la calidad de las integraciones por encima de escribir pruebas unitarias de simulación (mocks) sin valor real.
> - **Sanitización de Datos de Cliente:** En los algoritmos de sincronización offline, asume siempre que el cliente está comprometido (Zero Trust). Todo Timestamp y Sello HMAC debe validarse estrictamente contra el reloj del servidor para evitar ataques de alteración temporal.
> - **Protocolo de Intervención Humana:** Cuando una fase requiera validación (marcada como PAUSE EXECUTION), detén tu ejecución devolviendo el control al sistema y no continúes simulando respuestas. Espera el comando humano de Code Review 'Aprobado'.
> - **Tolerancia a Fallos:** Si fallas repetidamente, reporta un error estructurado (Problem Details) al Agente Maestro; no entres en bucles infinitos.
> - **Reglas de Código Estricto:** PROHIBIDO usar `any` en TypeScript (usa Zod). Implementa estricta Inyección de Dependencias en Go (cero variables globales). Frontend estrictamente separado: Lógica Pura (TS), Estado (Zustand), UI (Componentes), Motor (Phaser 3).
> - **Regla de IPC Estricta (Tauri):** NUNCA alucines ni inventes comandos IPC de Tauri. Debes declarar primero la función en `main.rs`, exponer su firma de tipos y solo entonces consumirla en React usando esquemas Zod.
> - **Verificación de Compilación Obligatoria:** No asumas que tu código funciona a la primera. Después de escribir lógica en Go o Typescript, TIENES que ejecutar herramientas de terminal (ej. `go build`, `tsc --noEmit`) para validar que no haya errores de sintaxis o de tipado cruzado antes de dar la fase por concluida.
> - **Gestión Segura del Ciclo de Vida (Phaser):** Siempre que implementes un minijuego, DEBES envolver la instancia de Phaser en un patrón Provider/HOC que garantice la ejecución estricta de `game.destroy(true)` al desmontar el componente, evitando fugas de memoria en React.
> - **Calidad de Código (SOLID):** Prioriza el Código Limpio, la separación de responsabilidades (SOLID) y la legibilidad por encima de generar el código rápido o simplemente hacer que los tests pasen con mocks.
> - **Archivos No-Monolíticos:** Escribe el código incrementalmente. Analiza el contexto de los archivos existentes mediante view_file antes de invocar herramientas de escritura. NO escribas archivos monolíticos gigantes.
> - All SQL must reference the Data Dictionary exclusively.
> - **Idempotencia Estricta:** Todo endpoint transaccional de sincronización DEBE requerir y validar un `sync_event_id` (UUID) del cliente. Si el UUID existe, devuelve 200 OK pero NO dupliques la XP (Mitigación de Replay Attacks).
> - **Transaccionalidad Legal:** Toda modificación al progreso de un jugador DEBE ejecutarse dentro de una Transacción SQL que incluya OBLIGATORIAMENTE un `INSERT` en la tabla `experience_history`, capturando la evidencia del logro.
> - **Manejo de Assets Temporales:** Para los minijuegos en Phaser, NO alucines llamadas a imágenes o audios externos. Utiliza exclusivamente geometría nativa (`Phaser.GameObjects.Graphics`) y colores institucionales como placeholders hasta que se integren los assets oficiales.
> - **Anti-Destrucción de Código:** Antes de modificar archivos existentes (especialmente `main.rs` o el enrutador de Go), utiliza herramientas de análisis de archivos (`view_file`, `grep_search`) para comprender el contexto y NO sobrescribas lógica generada en fases anteriores.
> - **Obligación de Herramientas:** Antes de escribir código o generar sentencias SQL, ESTÁS OBLIGADO a usar herramientas de lectura (`view_file`, `cat`) sobre la ruta absoluta del Diccionario de Datos. No asumas ni infieras esquemas.
> - **Chain of Thought Forzado:** Antes de modificar archivos existentes o invocar la herramienta de escritura, debes explicar brevemente tu plan de ataque y cómo se integran los archivos. Piensa antes de actuar.
> - **Anti-Monolitos:** Está estrictamente prohibido generar archivos monolíticos de más de 300 líneas. Divide la lógica en componentes y servicios modulares usando inyección de dependencias.
> - **Antes de escribir código o crear nuevas carpetas, lee el archivo `plan_maestro.md` NO SOLO para respetar la topología del monorepo, sino para extraer y utilizar OBLIGATORIAMENTE el stack tecnológico definido allí (ej. sqlc, Chi, Tailwind, Vite, Phaser 3). No inventes tu propio stack.**
> - **Si una fase requiere interacción visual o validación de UX que no puede realizarse en texto, DETENTE y marca la fase como 'PENDIENTE DE REVISIÓN HUMANA' antes de avanzar.**

---

## Fase 0: Verificación del Entorno y Configuración del Monorepo

### Prompt para el Sub-Agente (`generalist`)
```text
You are tasked with Phase 0: Workspace Initialization for the USBI project.
Location: /mnt/wolf/codigo/usbi

(Inyecta aquí el texto COMPLETO de las SYSTEM DIRECTIVES descritas al inicio de este documento)

Tasks:
- [ ] Ensure you are working within `/mnt/wolf/codigo/usbi`. DO NOT delete or overwrite the existing `plan/` directory.
- [ ] Initialize a Git repository carefully if not already initialized.
- [ ] Verify local versions of Go, Rust, pnpm.
- [ ] Initialize a pnpm monorepo structure EXACTLY matching this topology:
   - `apps/frontend`: React web application + Tauri v2.
   - `apps/admin`: Dashboard administrativo y Maker (Empaquetado con Tauri).
   - `packages/schema`: Esquemas Zod y tipos compartidos.
   - `packages/ui`: Sistema de componentes React compartidos.
   - `packages/engine`: Lógica base de los minijuegos (Phaser / React).
   - `backend`: Go API Server (isolated module).
- [ ] Conclusion: Commit changes with message "feat: phase 0 - monorepo initialization and workspace setup".
```

---

## Fase 0.5: Contratos API y OpenAPI

### Prompt para el Sub-Agente (`backend_architect`)
```text
Phase 0.5: API Contracts and OpenAPI.
Location: /mnt/wolf/codigo/usbi

(Inyecta aquí el texto COMPLETO de las SYSTEM DIRECTIVES descritas al inicio de este documento)

Tasks:
- [ ] READ first: `/home/altair/Documentación/Documentos/My graph/raw/proyectos/Diccionario de datos - PostgreSQL On-Premise.md`
- [ ] Generate strict `openapi.yaml` mapping PostgreSQL tables to decoupled Data Transfer Objects (DTOs). Ensure you exclude sensitive internal DB fields (hashes) from payloads. Flatten nested relationships appropriately. Standardize RFC 7807 for errors.
- [ ] Define precise HTTP Status Codes (200, 400, 401, 403, 409, 500) and Problem Details schemas.
- [ ] Generate the `LICENSE` file (Apache 2.0) for the `packages/engine` module and apply legal headers.
- [ ] PAUSE EXECUTION. Request human validation.
- [ ] Conclusion: Commit changes with message "docs: phase 0.5 - openapi specification and strict DTO contracts".
```

---

## Fase 1: Base de Datos y Backend Core

### Prompt para el Sub-Agente (`database_expert`)
```text
Phase 1: Database Setup and Backend Core.
Location: /mnt/wolf/codigo/usbi/backend

(Inyecta aquí el texto COMPLETO de las SYSTEM DIRECTIVES descritas al inicio de este documento)

Tasks:
- [ ] READ first: `/home/altair/Documentación/Documentos/My graph/raw/proyectos/Diccionario de datos - PostgreSQL On-Premise.md`
- [ ] Setup Go backend using Clean Architecture (Domain, UseCase/Service, Repository, Transport).
- [ ] Initialize `sqlc` and `pgxpool`. Write pure SQL migrations (`0001_initial.up.sql`) exactly matching the Data Dictionary. Use `uuid-ossp` or `pgcrypto`.
- [ ] Implement required directory structure:
   - `[ ] backend/cmd/server/main.go`
   - `[ ] backend/internal/transport/` (Must configure TLS 1.2+ for HTTPS endpoints)
   - `[ ] backend/internal/domain/` (Business Models / DTOs)
   - `[ ] backend/internal/repository/` (SQLc)
   - `[ ] backend/migrations/` (Use strict path for SQL migrations, NOT backend/sql)
- [ ] Set up environment variable management and DRP automated backups (`pg_dump` with `zstd` compression).
- [ ] Use `github.com/google/uuid@v1.6+` for UUIDv7 generation.
- [ ] FORBIDDEN ANTI-PATTERNS: 
  1. DO NOT mutate the React DOM directly from Phaser instances. 
  2. DO NOT use global JS variables (`window`) for JWT or token storage; use Tauri Plugin Store. 
  3. DO NOT execute `SELECT *` without explicit pagination limits in PostgreSQL.
- [ ] No pierdas tokens creando pruebas unitarias para CRUDs básicos o controladores (handlers). Reserva tus capacidades de testing ESTRICTAMENTE para someter a estrés las rutinas criptográficas (HMAC, Argon2id) y el algoritmo Additive Merge.
- [ ] PAUSE EXECUTION. Request explicit human validation to audit Security (Architecture, HMAC, Cryptography) and Code Review before committing.
- [ ] Conclusion: Commit changes with message "feat: phase 1 - database schema, migrations and go setup".
```

---

## Fase 2: Autenticación, Seguridad y Sync Endpoint

### Prompt para el Sub-Agente (`backend_engineer`)
```text
Phase 2: Authentication, Security, and Sync Backend Layer.
Location: /mnt/wolf/codigo/usbi/backend

(Inyecta aquí el texto COMPLETO de las SYSTEM DIRECTIVES descritas al inicio de este documento)

Tasks:
- [ ] READ first: `/home/altair/Documentación/Documentos/My graph/raw/proyectos/Diccionario de datos - PostgreSQL On-Premise.md`
- [ ] Setup strictly typed HTTP routers in `backend/internal/transport/`.
- [ ] Implement Auth Flow strictly: `[ ] Parse Zod/Go-Playground -> [ ] Hash Argon2id -> [ ] Insert SQL (pgcrypto) -> [ ] Return JWT`.
- [ ] Implement Tutor Consent flow for minors. MUST insert legal evidence (IP, User Agent, Hash) into `tutor_consents`.
- [ ] Implement Manual Age-Up Transition Endpoint (Ley 251) as a Self-Service trigger in `/api/v1/auth/age-up`. Limit to 3 attempts (tracked in DB). Do NOT run this as a cron job based on `created_at`.
- [ ] Implement ARCO pseudonymization routines (Ley Número 251 del Estado de Veracruz / LGPDPPSO). Inject `"wipe_local_data": true` flag into sync response when an ARCO cancellation is requested.
- [ ] Create the exact Sync endpoint using `FOR UPDATE` blocking, strict `XP > 0` validations, and enforce Idempotency (`sync_event_id`). Every sync must wrap an `INSERT` into `experience_history`. The calculation of XP decay on retry (100%, 50%, 0%) MUST be executed in this backend endpoint by reading past `level_attempts` (RF15). Do NOT trust the client's XP math.
- [ ] Do NOT waste tokens creating unit tests for basic CRUDs or handlers. Reserve testing strictly for stressing cryptographic routines (HMAC, Argon2id) and the Additive Merge algorithm.
- [ ] PAUSE EXECUTION. Request explicit human validation to audit Security (Argon2id, Blind Indexing) and Code Review before committing.
- [ ] Conclusion: Commit changes with message "feat: phase 2 - auth system, security and sync api".
```

---

## Fase 2.5: Background Jobs y Purgas Legales (Cron)

### Prompt para el Sub-Agente (`backend_engineer`)
```text
Phase 2.5: Background Jobs and Legal Purgation.
Location: /mnt/wolf/codigo/usbi/backend

(Inyecta aquí el texto COMPLETO de las SYSTEM DIRECTIVES descritas al inicio de este documento)

Tasks:
- [ ] Implement a Go background worker (cron job) that runs daily using `github.com/robfig/cron/v3`. Avoid fragile manual ticker loops.
- [ ] Implement 48h Purge: Delete accounts stuck in `pending_tutor_consent` that haven't verified their email token in 48 hours (COPPA/GDPR-K).
- [ ] Implement ARCO Purge: Pseudonymize inactive accounts or those requesting cancellation based strictly on Data Dictionary rules. Use cryptographic hashing for audit logs to maintain No-Repudiation.
- [ ] Conclusion: Commit changes with message "feat: phase 2.5 - legal background jobs and data purge".
```

---

## Fase 3: UI/UX Base, Accesibilidad y Sistema de Progresión

### Prompt para el Sub-Agente (`frontend_architect`)
```text
Phase 3: UI/UX, Accessibility, and Progression.
Location: /mnt/wolf/codigo/usbi/apps/frontend y /mnt/wolf/codigo/usbi/packages/ui
Task: Implement UI and Progression following EXACTLY the specifications detailed in /mnt/wolf/codigo/usbi/plan/03_frontend_ui/especificacion.md.

(Inyecta aquí el texto COMPLETO de las SYSTEM DIRECTIVES descritas al inicio de este documento)

Tasks:
- [ ] READ first: `/mnt/wolf/codigo/usbi/plan/03_frontend_ui/especificacion.md`
- [ ] Define the exact UI Navigation Tree: `/auth/login`, `/app/dashboard`, `/app/games/trivia`, etc.
- [ ] Configure static analysis with `eslint-plugin-jsx-a11y` to enforce accessibility.
- [ ] Create React component library inside `packages/ui` using Tailwind CSS, following Institutional Colors. MUST use explicit HEX codes (Primary #003366, Secondary #FFCC00) and enforce REM/EM relative units for scalable typography.
- [ ] Implement strict Accessibility Checklist: 44x44px minimum click area, 14px minimum font, 200% zoom support, optional timers, and SVG/CSS filters explicitly covering Protanopia, Deuteranopia, and Tritanopia (RNF5, RNF15, RNF16).
- [ ] Establish Anonymous Error Telemetry (RNF14) with local offline fallbacks.
- [ ] Implement UI form checkboxes for explicit acceptance of "Terms, Conditions, and Privacy Policy".
- [ ] Implement UI self-service modal for Age-Up Transition (Ley 251) which hits the backend manual endpoint.
- [ ] Implement Zustand architecture strictly divided in Slices (`AuthSlice`, `SyncSlice`, `GameSlice`) with token handling via Tauri plugin-store.
- [ ] Define UI Error Handling protocols: Zustand must intercept HTTP 403 / 401 (Problem Details) and trigger standardized Error Modals/Toasts.
- [ ] Implement XP calculation logic and rank system (RF11-RF15).
- [ ] PAUSE EXECUTION. Start development server (`npm run dev`) and request the human to visually approve UX, accessibility, and institutional colors on screen before advancing to logic. Wait for explicit 'Approved'.
- [ ] Conclusion: Commit with "feat: phase 3 - UI framework, a11y linter, telemetry and progression logic".
```

---

## Fase 4: Sincronización Offline y Base de Datos Local

### Prompt para el Sub-Agente (`rust_systems_engineer`)
```text
Phase 4: Offline Synchronization (Tauri + SQLite).
Location: /mnt/wolf/codigo/usbi/apps/frontend
Task: Implement local DB and Sync logic from /mnt/wolf/codigo/usbi/plan/04_sync_offline/especificacion.md.

(Inyecta aquí el texto COMPLETO de las SYSTEM DIRECTIVES descritas al inicio de este documento)

Tasks:
- [ ] READ first: `/mnt/wolf/codigo/usbi/plan/04_sync_offline/especificacion.md`
- [ ] Setup SQLite local DB via Tauri plugin (`tauri-plugin-sql`). Write explicit DDL schemas in Rust. Implement Blind Indexing locally (store email/phone hashes, not plain text).
- [ ] Implement Retry Policy: Exponential backoff (1s -> 2s -> 4s) with random Jitter and 30s Max Timeout. MUST pause heavy SQLite payloads if a game is in progress, BUT maintain lightweight heartbeat TCP ping active via `tokio::mpsc` channels to avoid blocking (RF68).
- [ ] Implement Sync Conflict Resolution (DoD): 1) Validate HMAC exactly via `HMAC(secret, concat(userId, xp, timestamp))`. 2) Validate XP > 0. 3) Additive Merge for XP: `ServerXP = ServerXP + LocalXP`. Ensure Idempotency via `sync_event_id`. 4) Last-Write-Wins for latest date: `UPDATE stats SET last_played = LocalTimestamp WHERE LocalTimestamp > ServerTimestamp AND LocalTimestamp <= CurrentServerClock`. 5) Union for Badges and daily streak calculation via timestamp array fusion.
- [ ] Implement HMAC SHA-256 seal on local SQLite XP records (Anti-cheat). Derive cryptographic key securely using `keyring-rs` (OS Native Keychain). MUST include a fallback logic to encrypted SQLite/File if `dbus` or `libsecret` fails on Linux.
- [ ] Intercept Remote Wipe (ARCO): The frontend MUST intercept the `"wipe_local_data": true` flag from the Sync endpoint response and execute a hard `DROP/DELETE` on the local SQLite DB to comply with Data Retention laws.
- [ ] Implement explicit Tauri IPC commands: `#[tauri::command] async fn sync_local_db()`, `verify_hmac`, `wipe_local_data`, `set_game_status` to fetch strictly typed JSON contracts from Rust.
- [ ] PAUSE EXECUTION. Request explicit human validation to audit Security (HMAC, Blind Indexing, Tauri IPC) and Code Review before committing. Wait for 'Approved'.
- [ ] Conclusion: Commit with "feat: phase 4 - local sqlite DB, blind index, HMAC seal and offline sync loop".
```

---

## Fase 5: Módulo de Administración y Maker

### Prompt para el Sub-Agente (`fullstack_engineer`)
```text
Phase 5: Admin & Maker Module.
Location: /mnt/wolf/codigo/usbi/apps/admin y /mnt/wolf/codigo/usbi/packages/schema

(Inyecta aquí el texto COMPLETO de las SYSTEM DIRECTIVES descritas al inicio de este documento)
- Maker JSONs MUST be local only. Do not send Maker custom levels to the Go backend.

Tasks:
- [ ] READ first: `/mnt/wolf/codigo/usbi/plan/06_admin_maker/especificacion.md`
- [ ] Implement official level/section creation dashboard in `apps/admin` (sends to PostgreSQL via API).
- [ ] Implement local Maker creator and JSON export/import to Local FileSystem via Tauri IPC in `apps/admin`.
- [ ] Strict Zod validation schemas for all templates inside `packages/schema`. Create strict shapes for specific levels (e.g., `z.object({ type: z.literal("trivia"), questions: z.array(...) })`). MUST explicitly reject any JSON larger than 5MB to comply with RF36.
- [ ] PAUSE EXECUTION. Start dev server and request human visual approval of Maker UX. Wait for 'Approved'.
- [ ] Conclusion: Commit with "feat: phase 5 - admin dashboard and local maker module".
```

---

## Fase 6: Minijuegos - Paquete 1 (Trivia, Rompecabezas, Sopa de Letras)

### Prompt para el Sub-Agente (`game_developer`)
```text
Phase 6: Minigames Pack 1.
Location: /mnt/wolf/codigo/usbi/packages/engine
Task: Implement following specifications in /mnt/wolf/codigo/usbi/plan/05_juegos_plantillas/especificacion.md.

(Inyecta aquí el texto COMPLETO de las SYSTEM DIRECTIVES descritas al inicio de este documento)
- Use deterministic algorithms (Spatial Shuffling) for Puzzle.
- Strictly enforce Memory Cleanup (`game.destroy(true)`) for Phaser instances.

Tasks:
- [ ] READ first: `/mnt/wolf/codigo/usbi/plan/05_juegos_plantillas/especificacion.md`
- [ ] Implement Trivia (React):
   - [ ] 1. Create `interfaces/IGameState.ts` (Define strict types).
   - [ ] 2. Configure EventBus to emit `ON_GAME_START`, `GAME_OVER`, `XP_GAINED`. NEVER mutate React DOM directly from engine logic.
   - [ ] 3. Implement UI with Tailwind. Call `invoke('set_game_status', true)` on init.
- [ ] Implement Word Search (Phaser 3):
   - [ ] 1. Grid Generation Algorithm (NxM Matrix).
   - [ ] 2. Word placement logic (Horizontal, Vertical, Diagonal without destructive collisions).
   - [ ] 3. Pointer management (Input Pointer Drag & Release).
   - [ ] 4. Validation against local dictionary of answers.
   - [ ] 5. Instantiate using `@phaserjs/react` explicitly and ensure `game.destroy(true)` on unmount. DO NOT hallucinate assets.
- [ ] Implement Puzzle (Phaser 3).
   - [ ] 1. Spatial Shuffling algorithms.
   - [ ] 2. Drag and drop snap logic to target coordinates.
   - [ ] 3. Instantiate using `@phaserjs/react` explicitly and ensure `game.destroy(true)`.
   - [ ] 4. Interfaz de comunicación EventBus estricta. DO NOT hallucinate external assets, use `Phaser.GameObjects.Graphics` as placeholders.
- [ ] Implement logic to store local progress in SQLite using Tauri `invoke`. Include `HMAC` signatures.
- [ ] PAUSE EXECUTION. Request explicit human validation to audit Gameplay, UX, Memory Leaks, and Code Review before committing.
- [ ] Conclusion: Commit with "feat: phase 6 - minigames pack 1 (trivia, word search, puzzle)".
```

---

## Fase 7: Minijuegos - Paquete 2 (Fake News, Crucigrama, Memorama)

### Prompt para el Sub-Agente (`game_developer`)
```text
Phase 7: Minigames Pack 2.
Location: /mnt/wolf/codigo/usbi/packages/engine
Task: Implement following specifications in /mnt/wolf/codigo/usbi/plan/05_juegos_plantillas/especificacion.md.

(Inyecta aquí el texto COMPLETO de las SYSTEM DIRECTIVES descritas al inicio de este documento)
- Use Backtracking algorithm for Crossword grid generation.
- Strictly enforce Memory Cleanup (`game.destroy(true)`) for Phaser instances.

Tasks:
- [ ] READ first: `/mnt/wolf/codigo/usbi/plan/05_juegos_plantillas/especificacion.md`
- [ ] Implement Fake News (React DOM):
   - [ ] 1. Create `interfaces/IGameState.ts`.
   - [ ] 2. Configure EventBus to emit `ON_GAME_START`, `GAME_OVER`.
   - [ ] 3. Call `invoke('set_game_status', true)` on init.
- [ ] Implement Crucigrama (Phaser 3):
   - [ ] 1. Generate Mermaid diagram for State Machine.
   - [ ] 2. Backtracking algorithm for Grid Generation.
   - [ ] 3. Configure EventBus to emit word progress events.
   - [ ] 4. Instantiate using `@phaserjs/react` and guarantee `game.destroy(true)`.
- [ ] Implement Memorama (React DOM):
   - [ ] 1. Card shuffle algorithm (Fisher-Yates).
   - [ ] 2. Flip delay logic (timeout) and pair matching validation.
- [ ] PAUSE EXECUTION. Request explicit human validation to audit UX, playability, and Code Review before committing. Wait for 'Approved'.
- [ ] Conclusion: Commit with "feat: phase 7 - implementation of fake news, crossword, and memory game".
```

---

## Fase 8: Minijuegos - Paquete 3 (Serpientes y Escaleras con IA)

### Prompt para el Sub-Agente (`game_developer`)
```text
Phase 8: Snakes and Ladders.
Location: /mnt/wolf/codigo/usbi/packages/engine
Task: Implement Snakes and Ladders with turn-based AI following EXACTLY the specifications detailed in /mnt/wolf/codigo/usbi/plan/05_juegos_plantillas/especificacion.md.

(Inyecta aquí el texto COMPLETO de las SYSTEM DIRECTIVES descritas al inicio de este documento)
- Implement AI using a Weighted Random probability model to simulate realistic failure on specific board tiles.
- Strictly enforce Memory Cleanup (`game.destroy(true)`) for Phaser instances.

Tasks:
- [ ] READ first: `/mnt/wolf/codigo/usbi/plan/05_juegos_plantillas/especificacion.md`
- [ ] Implement Snakes and Ladders (Phaser 3) with turn-based AI (RF58-RF65):
   - [ ] 1. Create `interfaces/IGameState.ts`.
   - [ ] 2. Generate Mermaid diagram for State Machine, including probabilistic AI transitions.
   - [ ] 3. Board generation mapping linear indices to serpentine X/Y grid coordinates.
   - [ ] 4. Player and AI token movement animations (tweens).
   - [ ] 5. Configure EventBus. Call `invoke('set_game_status', true)` on init.
   - [ ] 6. Instantiate using `@phaserjs/react` and guarantee `game.destroy(true)`.
- [ ] PAUSE EXECUTION. Request explicit human validation to audit AI logic, UX, playability, and Code Review before committing. Wait for 'Approved'.
- [ ] Conclusion: Commit with "feat: phase 8 - snakes and ladders with AI opponent".
```

---

## Fase 9: Empaquetado, Optimización y CI/CD

### Prompt para el Sub-Agente (`devops_engineer`)
```text
Phase 9: Final Packaging, CI/CD, and Global QA.
Location: /mnt/wolf/codigo/usbi

(Inyecta aquí el texto COMPLETO de las SYSTEM DIRECTIVES descritas al inicio de este documento)
- Configure Gitea Actions or GitHub Actions pipelines explicitly.

Tasks:
- [ ] Implement Automated E2E Testing using Playwright for core flows.
- [ ] Perform strict WCAG 2.1 AA Accessibility audit.
- [ ] Configure CI/CD pipeline using the following explicit steps: Linting -> Unit Tests -> Build Frontend -> Build Tauri (Windows/Linux) -> Build Go Backend -> On-Premise Physical Server Deployment.
- [ ] Automate PostgreSQL DRP backups with `pg_dump` and `zstd` specifically configured for the physical On-Premise infrastructure (avoid cloud hosting references).
- [ ] Performance profiling (<3s load time) and size optimization (<3GB).
- [ ] Conclusion: Commit with "feat: phase 9 - final build, CI/CD pipelines, and optimization".
```
