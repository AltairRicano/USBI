# Plan de Integración — Plataforma USBI

> Documento de síntesis que consolida lo mejor de las cuatro propuestas tecnológicas evaluadas por DeepSeek y Claude, para el desarrollo de la plataforma de minijuegos educativos de la USBI.

**Restricciones inamovibles del servidor:**
- 1 vCPU · 1 GB RAM · 20 GB de almacenamiento
- **La base de datos estará en el mismo servidor físico (on-premise). Sin excepciones.**

---

## 📎 Propuestas de referencia

- [[Propuesta Claude para la USBI]] — Base principal de esta integración
- [[Propuesta DeepSeek para la USBI]] — Phaser 3, retroceso exponencial, TLS 1.3 explícito, lógica de sincronización detallada
- [[Propuesta de Antigravity para la usbi]] — Detección híbrida de red (`navigator.onLine` + eventos)
- [[Propuesta GPT para la USBI]] — Modelo de tabla `ExperienceHistory` para auditoría

Ver también: [[Requisitos - USBI]]

---

## 🏗️ Stack tecnológico final

### Criterio de selección general

La retroalimentación de DeepSeek identifica a Claude como la mejor base por su presupuesto de RAM riguroso y cobertura detallada de RF66–RF73. Claude identifica a DeepSeek como la más sólida por Phaser 3 y la lógica de sincronización detallada. Esta integración toma ambas perspectivas como punto de partida, pero **adopta Go como lenguaje de backend** por su huella de memoria mínima (~15 MB), crítica en un servidor de 1 GB. El frontend mantiene React + TypeScript; la validación se implementa independientemente en cada capa.

---

## 🖥️ Frontend — Web App

### React 18 + Vite + TypeScript

| Campo | Valor |
|-------|-------|
| **Propósito** | UI de jugador, administrador y Maker |
| **Origen** | [[Propuesta Claude para la USBI]] |
| **¿Por qué?** | Permite compartir tipos y esquemas de validación con el backend (RNF13). Vite genera el build estático que Nginx sirve directamente, sin pasar por Node.js. Cada plantilla de minijuego vive como componente React independiente. |

### Phaser 3 (dentro de componentes React)

| Campo | Valor |
|-------|-------|
| **Propósito** | Motor de juego para las plantillas que requieren input táctil preciso: Sopa de Letras (arrastre), Rompecabezas (drag & drop), Crucigrama (tecleado por celda), Serpientes y Escaleras (dado D6) |
| **Origen** | [[Propuesta DeepSeek para la USBI]] |
| **¿Por qué?** | Diseñado específicamente para juegos casuales 2D ligeros. Corre en el dispositivo del **usuario** (cliente), no en el servidor de 1 GB — Phaser no afecta el presupuesto RAM del servidor. Cumple RNF7 (latencia táctil <100ms) con mayor fiabilidad que React puro. Pesa ~1–1.5 MB minificado y usa ~30–80 MB en el dispositivo cliente (muy por debajo de los 4 GB de RNF3). Se usa **solo** en las plantillas que lo necesitan; Trivia, Fake News y Memorama permanecen como componentes React puros para mantener el bundle más liviano (RNF2: carga <3s en 3G). |

### Tailwind CSS

| Campo | Valor |
|-------|-------|
| **Propósito** | Sistema de estilos responsivo; colores dinámicos configurables por administrador; accesibilidad (áreas de clic, contraste, zoom) |
| **Origen** | [[Propuesta Claude para la USBI]] |
| **¿Por qué?** | Vite purga automáticamente las clases no usadas. Es la única propuesta que aborda explícitamente RNF5 (áreas de clic), RNF6 (zoom) y RNF15 (contraste). |

### React Query (TanStack Query)

| Campo | Valor |
|-------|-------|
| **Propósito** | Caché del servidor, revalidación automática, manejo del estado de sincronización offline |
| **Origen** | [[Propuesta Claude para la USBI]] |
| **¿Por qué?** | Evita recargar el servidor en cada navegación y gestiona el estado de carga/error sin código manual. |

### Detección de red — Web App

| Campo | Valor |
|-------|-------|
| **Propósito** | Detectar conectividad para actualizar el indicador visual (RF66) y disparar sincronización (RF67–RF68) en la versión web |
| **Origen** | [[Propuesta de Antigravity para la usbi]] (eventos `navigator.onLine`) + [[Propuesta Claude para la USBI]] (timer cada 60 segundos) |
| **¿Por qué?** | En el browser no hay acceso al SO — `navigator.onLine` es la única señal disponible. Escuchar los eventos `online`/`offline` reacciona al instante; el timer de 60s actúa como fallback para cambios silenciosos. Ambos pueden dar falsos positivos (WiFi sin internet, captive portals), pero en el browser no hay alternativa más fiable. |

### Detección de red — App de Escritorio (Tauri)

| Campo | Valor |
|-------|-------|
| **Propósito** | Verificar conectividad *real* al servidor antes de intentar la sincronización (RF67–RF68) |
| **Origen** | Corrección D6 del análisis crítico (subagente independiente) |
| **Mecanismo** | **Ping TCP activo desde Rust** al servidor de la USBI cada 60 segundos. `navigator.onLine` se usa únicamente para actualizar el icono visual de conectividad en pantalla (RF66). |
| **¿Por qué?** | `navigator.onLine` detecta si hay red local (WiFi/Ethernet), pero **no verifica acceso real a internet**. Casos de fallo: WiFi universitario con servidor caído, captive portal, gateway sin ruta. El proceso Rust de Tauri puede abrir una conexión TCP directamente al servidor (`usbi.edu.mx:443`) con timeout de 3s — si falla, hay certeza de que la sync también fallará, evitando el intento + los 3 reintentos exponenciales en vano. |

**Implementación Rust:**
```rust
use std::net::TcpStream;
use std::time::Duration;

fn can_reach_server() -> bool {
    TcpStream::connect_timeout(
        &"usbi.edu.mx:443".parse().unwrap(),
        Duration::from_secs(3),
    ).is_ok()
}
```

**Responsabilidades por mecanismo:**

| Mecanismo | Plataforma | Propósito |
|-----------|------------|-----------|
| `navigator.onLine` + eventos `online`/`offline` | Web + Tauri (WebView) | Actualizar icono de conectividad en pantalla (RF66) |
| Ping TCP al servidor (Rust, cada 60s) | Solo Tauri | Decisión de disparar o no la sincronización (RF67–RF68) |
| Timer 60s (Rust) | Solo Tauri | Ciclo principal de verificación y sync |
| Timer 60s (JavaScript) | Solo Web App | Reintento de requests fallidos; complementa eventos `online`/`offline` |

---

## 🖥️ Frontend — App de Escritorio

### Tauri v2 (Rust + WebView del sistema)

| Campo | Valor |
|-------|-------|
| **Propósito** | Empaquetar el mismo frontend React en una app de escritorio nativa con acceso offline completo (RF66–RF73) |
| **Origen** | Unánime en las cuatro propuestas |
| **¿Por qué?** | Binarios de ~5–15 MB frente a los ~150 MB de Electron. Usa el WebView del SO, no un Chromium embebido. Permite acceso nativo al sistema de archivos y detección de red a nivel OS. |

### SQLite (almacenamiento local en Tauri)

| Campo | Valor |
|-------|-------|
| **Propósito** | Almacenamiento local del progreso offline: XP ganada, niveles completados, insignias, fechas de actividad para racha, cola de sincronización, niveles del Maker |
| **Origen** | Unánime en las cuatro propuestas (uso local en cliente) |
| **¿Por qué?** | Base de datos embebida, sin servidor, sin configuración. En el **cliente** de escritorio no hay concurrencia múltiple (es monousuario por dispositivo), por lo que SQLite es perfectamente adecuado. No confundir con usarlo como BD central del servidor, que sería un error (ver §Descartes). |

### Patrón de retroceso exponencial en sincronización

| Campo | Valor |
|-------|-------|
| **Propósito** | Reintentar la sincronización con el servidor si falla, sin saturar la red ni el servidor (RNF11) |
| **Origen** | [[Propuesta DeepSeek para la USBI]] |
| **¿Por qué?** | El patrón específico (1s → 2s → 4s, máximo 3 reintentos) evita tormentas de solicitudes en reconexiones masivas. Claude menciona reintentos pero no especifica el patrón. Este detalle hace la diferencia en RNF11. |

---

## ⚙️ Backend

### Go (net/http + router ligero)

| Campo | Valor |
|-------|-------|
| **Propósito** | API REST — endpoints de autenticación, jugador, niveles y sincronización. Corre en el servidor USBI. |
| **Origen** | [[Propuesta DeepSeek para la USBI]], [[Propuesta de Antigravity para la usbi]] |
| **RAM estimada** | ~10–15 MB |
| **¿Por qué?** | Go compila a un binario estático sin runtime, con huella de memoria mínima (~10–15 MB vs ~50 MB de Fastify/Node.js). En un servidor de 1 GB, cada MB importa — Go es la opción más frugal. Su modelo de concurrencia basado en goroutines es ideal para manejar picos de conexiones simultáneas (RNF12: hasta 10,000 usuarios registrados históricos; la concurrencia operativa máxima dependerá de las pruebas de carga técnica del servidor) sin depender de un event loop single-threaded. El binario arranca en milisegundos y no requiere process manager externo. |

> **Nota sobre TypeScript unificado:** La propuesta original de Claude defendía Fastify/Node.js para compartir tipos Zod entre frontend y backend (RNF13). Al adoptar Go, la validación se implementa independientemente en cada capa: Zod en el frontend (TypeScript) y validación con structs/tags en Go (`go-playground/validator`). Esto añade una responsabilidad de mantener ambas validaciones sincronizadas, pero el ahorro de ~35–85 MB de RAM y la robustez de la concurrencia nativa de Go justifican la decisión en este hardware.

### pgx (acceso directo a PostgreSQL)

| Campo | Valor |
|-------|-------|
| **Propósito** | Driver PostgreSQL nativo para Go. Acceso directo a la BD con queries SQL explícitos, sin ORM. |
| **Origen** | Decisión del equipo |
| **¿Por qué?** | Elimina el overhead de un ORM (~30–50 MB del query engine de Prisma). Las queries SQL explícitas dan control total sobre el rendimiento y son más predecibles en un entorno con 1 vCPU. Go + pgx con pool de conexiones integrado (`pgxpool`) reemplaza la necesidad de Prisma + su binario externo. Las migraciones se gestionan con herramientas ligeras como `golang-migrate` o `goose`. |

### JWT + Argon2id

| Campo | Valor |
|-------|-------|
| **Propósito** | Autenticación stateless (RF6, RF7) y hash seguro de contraseñas (RF4) |
| **Origen** | [[Propuesta Claude para la USBI]] (JWT), corrección D5 del análisis crítico (Argon2id) |
| **¿Por qué?** | JWT elimina la necesidad de Redis para sesiones (~50 MB ahorrados). **Argon2id** (paquete `golang.org/x/crypto/argon2`) es el algoritmo recomendado por OWASP desde 2020, resistente a ataques GPU. En Go, Argon2id se ejecuta nativamente sin depender de un thread pool — a diferencia de Node.js donde bcrypt compite por los 4 threads de libuv. Configuración recomendada: `memory: 65536` (64 MB), `iterations: 3`, `parallelism: 1`. |

> **Tradeoff documentado (JWT stateless):** Los tokens no son revocables hasta su expiración. Para mitigar el riesgo ante cuentas comprometidas: access token de **15 minutos**, refresh token de **7 días**. Si se requiere revocación inmediata (suspensión de cuenta), añadir un campo `token_version INTEGER` en la tabla `users` e incrementarlo al suspender — el backend valida que el `version` del token coincida con el de la BD, sin necesidad de Redis.

### Zod (validación en frontend)

| Campo | Valor |
|-------|-------|
| **Propósito** | Validación estricta del JSON del Maker (RF36) y datos de formularios en el frontend |
| **Origen** | [[Propuesta Claude para la USBI]] |
| **¿Por qué?** | Zod valida los datos antes de enviarlos al servidor, mejorando la UX con errores inmediatos. En el backend (Go), la validación se implementa con struct tags y validadores nativos (`go-playground/validator`), manteniendo la misma rigurosidad pero en el idioma de cada capa. |

### systemd (gestión del proceso Go)

| Campo | Valor |
|-------|-------|
| **Propósito** | Gestión del proceso del backend Go: arranque automático, reinicio ante fallos, gestión de logs con journald |
| **Origen** | Decisión del equipo |
| **¿Por qué?** | Go compila a binario estático — no necesita pm2 ni process managers de terceros. systemd ya viene integrado en Ubuntu Server, maneja reinicio automático (`Restart=on-failure`), y journald gestiona la rotación de logs sin configuración adicional. Cero dependencias extra. |

---

## 🗄️ Base de Datos

### PostgreSQL 15 (on-premise, mismo servidor)

| Campo | Valor |
|-------|-------|
| **Propósito** | Persistencia principal: usuarios, niveles, secciones, progreso, rachas, insignias, cola de sincronización |
| **Origen** | [[Propuesta Claude para la USBI]] (configuración de bajo consumo + pgcrypto) |
| **RAM estimada** | ~128–150 MB (configuración ajustada) |
| **¿Por qué?** | PostgreSQL soporta escritura concurrente de forma robusta (RNF12: hasta 10,000 usuarios registrados históricos; la concurrencia operativa máxima dependerá de las pruebas de carga técnica del servidor), a diferencia de SQLite como BD central. La extensión `pgcrypto` cifra correo y teléfono en reposo (RF5) sin implementar AES-256-GCM manualmente (que es más código propio que mantener y más superficie de error, como señala Claude). La configuración de bajo consumo de Claude (`shared_buffers=128MB`, `work_mem=4MB`, `max_connections=20`) es clave para respetar el límite de 1 GB. |

**Configuración para bajo consumo:**
```
shared_buffers     = 128MB
work_mem           = 4MB
max_connections    = 100
effective_cache_size = 512MB
```

> ⚠️ **Correcciones aplicadas:**
> - `max_connections` corregido de 20 a **100**. El valor anterior (20) era incompatible con RNF12 (10,000 usuarios históricos): `pgxpool` (el pool de conexiones de pgx en Go) usa un pool configurable; con `max_connections=20` el margen era insuficiente para herramientas de mantenimiento. Con 100 conexiones y `work_mem=4MB`, el overhead de RAM es ~500 MB solo si todas ejecutan sorts simultáneamente — escenario que no ocurre en una app educativa con este perfil de uso.
> - **PgBouncer recomendado** en modo *transaction pooling* como capa intermedia entre Go y PostgreSQL para escalar a picos de usuarios activos concurrentes sin subir `max_connections` más allá de lo necesario. PgBouncer consume ~2–5 MB de RAM.
> - `effective_cache_size = 512MB` **no reserva memoria**. Es un hint para el query planner de PostgreSQL (estima el costo de index scan vs seq scan). Puede dejarse en 512 MB como aproximación razonable del OS page cache disponible.

### Modelo de datos enriquecido

Las tablas base de [[Propuesta Claude para la USBI]] se enriquecen con el modelo de auditoría de [[Propuesta GPT para la USBI]]:

| Tabla | Descripción | Origen |
|-------|-------------|--------|
| `users` | Credenciales cifradas con pgcrypto (correo, teléfono), preferencias, fecha de registro | Claude |
| `sections` | Agrupaciones temáticas, color, admin creador | Claude |
| `levels` | Plantilla, contenido JSON, dificultad, sección | Claude |
| `player_progress` | Niveles superados, XP por nivel | Claude |
| `badges` / `user_badges` | Catálogo de insignias y relación con usuarios | Claude |
| `daily_streak` | Fechas de actividad para racha diaria | Claude |
| `sync_queue` | Buffer de progreso offline pendiente de procesar | Claude |
| `experience_history` | Historial completo de XP ganada por evento (para auditoría) | **GPT** (adición) |

> La tabla `experience_history` permite auditar cómo se acumuló la XP de cada jugador evento por evento — crucial para depurar sincronizaciones y detectar inconsistencias (RF70–RF73).

**Índices mínimos requeridos:**

```sql
-- Consultas frecuentes de progreso por usuario
CREATE INDEX ON player_progress(user_id);
CREATE INDEX ON player_progress(user_id, level_id);

-- Racha diaria: filtro por usuario + fecha
CREATE INDEX ON daily_streak(user_id, activity_date);

-- Cola de sincronización: procesamiento por usuario y estado
CREATE INDEX ON sync_queue(user_id, status);

-- Auditoría de XP: historial por usuario
CREATE INDEX ON experience_history(user_id);
```

> ⚠️ Sin estos índices, las queries sobre tablas con 10,000+ registros históricos generan full table scans O(n) que degradan el rendimiento bajo carga real.

### golang-migrate (migraciones SQL)

| Campo | Valor |
|-------|-------|
| **Propósito** | Migraciones versionadas de esquema PostgreSQL |
| **Origen** | Decisión del equipo |
| **¿Por qué?** | Herramienta ligera que ejecuta archivos `.sql` numerados sin ORM. Compatible con Go y con ejecución standalone vía CLI. No añade overhead de RAM al servidor en producción — solo se ejecuta durante el deploy. |

---

## 🔒 Seguridad

### TLS 1.3 (explícito)

| Campo | Valor |
|-------|-------|
| **Propósito** | Cifrado de toda comunicación servidor ↔ cliente, incluyendo el endpoint `/sync` (RF69) |
| **Origen** | [[Propuesta DeepSeek para la USBI]] (especifica TLS 1.3 explícitamente; Claude dice TLS sin versión) |
| **¿Por qué?** | TLS 1.3 elimina los cipher suites débiles de versiones anteriores y es más rápido (1-RTT handshake). Especificarlo previene que Nginx negocie versiones obsoletas. |

### pgcrypto (cifrado en reposo)

| Campo | Valor |
|-------|-------|
| **Propósito** | Cifrado de correo y teléfono a nivel de columna en PostgreSQL (RF5) |
| **Origen** | [[Propuesta Claude para la USBI]] |
| **¿Por qué?** | Más seguro que implementar AES-256-GCM manualmente en el backend (más código propio = más superficie de error). Es una extensión oficial de PostgreSQL, bien auditada. |

---

## 🔄 Sincronización Offline (RF66–RF73)

El mecanismo combina la **lógica detallada de DeepSeek** con la **detección híbrida de Antigravity** y los **reintentos explícitos de Claude**:

1. **Detección de red:** `navigator.onLine` reacciona al instante al cambio de estado. Timer de 60 segundos como fallback para cambios silenciosos.
2. **Estado desconectado (escritorio):** La app Tauri almacena XP ganada, niveles completados, insignias y fechas de actividad en SQLite local. Todo queda encolado en `sync_queue`.
3. **Estado desconectado (web/browser):** Si el navegador pierde conexión durante una partida, el progreso (XP ganada, niveles completados, fechas de actividad) se almacena temporalmente en `localStorage`. Al recuperar la conexión, el frontend envía los datos acumulados al endpoint `/sync` antes de continuar. Esto permite que el usuario no pierda su progreso ante desconexiones breves, aunque sin la robustez de SQLite (no persiste si se cierra el navegador sin reconexión).
4. **Reconexión:** El proceso nativo Rust de Tauri detecta la conexión. Si no hay partida activa (RF68), lanza la sincronización. En la web, el evento `online` de `navigator.onLine` dispara el envío de los datos almacenados temporalmente.
5. **Reintentos exponenciales:** Si el servidor no responde, reintenta con espera 1s → 2s → 4s (máximo 3 intentos). Si agotan, vuelve a intentar en el siguiente ciclo de 60 segundos.
6. **Endpoint `/sync`** en Go: Recibe `{ offlineXP, offlineCompletedLevelIds, offlineActivityDates[] }`.
   - **Validación anti-trampa:** El servidor calcula `XP_esperada = SUMA(xp_por_nivel)` a partir de los `offlineCompletedLevelIds` recibidos. Si `offlineXP > XP_esperada`, rechaza la solicitud y registra la anomalía en `experience_history` para auditoría. Esto previene que un cliente malicioso envíe XP inflada arbitrariamente.
   - Suma XP validada a XP global (RF70).
   - Unión de niveles completados (RF71).
   - Unión de insignias según XP total resultante (RF72).
   - Reconstrucción de racha con la secuencia más larga combinando fechas online y offline (RF73).
   - Registra cada evento en `experience_history` para auditoría.
7. **Respuesta:** El servidor devuelve el perfil unificado. La app de escritorio actualiza su SQLite local con el estado definitivo; la web descarta el almacenamiento temporal de `localStorage`.

---

## 🌐 Infraestructura del Servidor

### Nginx

| Campo | Valor |
|-------|-------|
| **Propósito** | Reverse proxy, terminación TLS 1.3, servicio de archivos estáticos del frontend |
| **Origen** | [[Propuesta Claude para la USBI]] |
| **RAM estimada** | ~5–10 MB |
| **¿Por qué?** | Sirve HTML/JS/CSS directamente desde disco, liberando al backend Go para solo la lógica de negocio. Rate limiting a nivel IP protege los endpoints de autenticación. |

---

## 📊 Presupuesto de recursos del servidor

| Componente | RAM estimada |
|------------|-------------|
| OS (Ubuntu Server) | ~200 MB |
| Nginx | ~10 MB |
| Go (binario API) | ~10–15 MB |
| PostgreSQL 15 (configuración ajustada) | ~150 MB |
| **Total en uso** | **~370–375 MB** |
| **Margen libre** | **~625–630 MB (~63%)** |

> ✅ **Nota:** La adopción de Go y la eliminación de Prisma ORM liberan ~65–85 MB respecto al plan original (Fastify ~50 MB + Prisma Query Engine ~30–50 MB). El margen libre de ~63% proporciona un colchón cómodo para picos de carga y el `work_mem` de PostgreSQL bajo operaciones concurrentes.

**Disco estimado:**

| Uso | Espacio estimado |
|-----|-----------------|
| OS + dependencias | ~3 GB |
| PostgreSQL (datos + índices) | ~2 GB |
| Build estático del frontend (JS/CSS/HTML) | ~50 MB |
| Assets multimedia de niveles (imágenes, audio) | ~1–2 GB |
| Logs (con rotación journald/logrotate) | ~500 MB |
| **Total estimado** | **~6.5–7.5 GB / 20 GB** |

> ⚠️ **Corrección:** El build estático de React+Vite+Phaser genera ~8–50 MB, no 500 MB. Los assets multimedia (imágenes de niveles, audio) se contabilizan por separado y deben estimarse según el catálogo real de contenidos educativos.

---

## ❌ Tecnologías descartadas y razones

| Tecnología | Propuesta | Razón del descarte |
|------------|-----------|-------------------|
| **Neon.tech (PostgreSQL Serverless)** | [[Propuesta de Antigravity para la usbi]] | La universidad requiere control total de los datos (on-premise). Un servicio externo añade latencia, costes recurrentes y riesgo de gobernanza de datos inaceptable para una institución pública. |
| **SQLite como BD central** | [[Propuesta DeepSeek para la USBI]] | Riesgo alto de corrupción y bloqueos (`SQLITE_BUSY`) con múltiples jugadores simultáneos escribiendo concurrentemente. No escala a RNF12 (10k usuarios históricos y sus cargas concurrentes). SQLite es correcto solo como BD *local* en el cliente de escritorio. |
| **ASP.NET Core** | [[Propuesta GPT para la USBI]] | Consumo de RAM injustificado para un servidor de 1 GB. C# añade complejidad innecesaria. La propuesta es la más genérica y sin mapeo real a los RF específicos. |
| **AES-256-GCM manual en backend** | [[Propuesta DeepSeek para la USBI]] | Reemplazado por `pgcrypto` de PostgreSQL. Menos código propio = menos superficie de error y menor carga de mantenimiento. |
| **Dexie.js (IndexedDB)** | [[Propuesta de Antigravity para la usbi]] | Reemplazado por SQLite en Tauri. SQLite es más robusto, portable entre plataformas de escritorio y soporta transacciones complejas necesarias para la sincronización (RF70–RF73). |
| **Fastify / Node.js como backend** | [[Propuesta Claude para la USBI]] | El argumento original de TypeScript unificado (compartir tipos Zod entre frontend y backend) no justifica los ~35–85 MB extra de RAM (Fastify ~50 MB + Prisma ~30–50 MB) frente a Go (~15 MB sin ORM). En un servidor de 1 GB, el ahorro de RAM y la concurrencia nativa de Go superan la conveniencia de un lenguaje compartido. La validación se implementa independientemente en cada capa. |
| **Prisma ORM** | [[Propuesta Claude para la USBI]] | Su query engine binario consume ~30–50 MB adicionales de RAM. Con Go como backend, el acceso directo vía `pgx` elimina ese overhead y proporciona control total sobre las queries SQL. Las migraciones se gestionan con `golang-migrate`. |

---

## 🗺️ Resumen final por capas

| Tecnología | Capa | Propósito | Origen |
|------------|------|-----------|--------|
| React 18 + Vite | Frontend web | UI de jugador, administrador y Maker | Claude |
| TypeScript | Frontend | Tipado estricto en la UI; validación con Zod | Claude |
| Phaser 3 | Frontend web (plantillas táctiles) | Motor de juego para Sopa de Letras, Rompecabezas, Crucigrama, S&E (RNF7) | DeepSeek |
| Tailwind CSS | Frontend web | Estilos responsivos, colores dinámicos, accesibilidad (RNF5, RNF6, RNF15) | Claude |
| React Query | Frontend web | Caché del servidor, estado de sincronización | Claude |
| Zod | Frontend | Validación de JSON del Maker y formularios (RF36) | Claude |
| Detección híbrida de red | Frontend (web + escritorio) | `navigator.onLine` + eventos + timer 60s / Ping TCP Rust (RF66, RF68) | Antigravity + Claude |
| Tauri v2 | Escritorio | App nativa con WebView, acceso offline completo | Unánime |
| SQLite | Escritorio (cliente) | Progreso offline, Maker, cola de sincronización | Unánime |
| localStorage | Web (browser) | Almacenamiento temporal de progreso ante desconexiones breves | Equipo |
| Retroceso exponencial | Escritorio + Web (sincronización) | Reintentos 1s → 2s → 4s en fallo de sync (RNF11) | DeepSeek |
| Go (net/http) | Backend | API REST, autenticación, lógica de negocio | DeepSeek + Antigravity |
| JWT + Argon2id | Backend | Autenticación stateless, hash de contraseñas (RF4, RF6, RF7) | Claude + D5 |
| systemd | Backend | Gestión del proceso Go en producción | Equipo |
| PostgreSQL 15 | Base de datos (on-premise) | Persistencia principal, concurrencia robusta (RNF12) | Claude |
| pgcrypto | Base de datos | Cifrado correo/teléfono en reposo (RF5) | Claude |
| pgx + golang-migrate | Backend → BD | Acceso directo a PostgreSQL, migraciones SQL versionadas | Equipo |
| TLS 1.3 (explícito) | Infraestructura | Cifrado en tránsito, versión mínima especificada (RF69) | DeepSeek |
| Nginx | Infraestructura | Reverse proxy, TLS, archivos estáticos | Claude |
| `experience_history` (tabla) | Base de datos | Historial de XP para auditoría de sincronizaciones (RF70–RF73) | GPT |

---

*Documento de integración generado con asistencia de Antigravity (Google DeepMind) — Junio 2026*
*Retroalimentación de análisis: DeepSeek y Claude (Anthropic)*
*Última revisión: 12 junio 2026 — Cambio a Go + pgx, validación anti-trampa, soporte offline web*

---

## 🔍 Análisis Crítico del Plan (Subagente Independiente)

> Análisis realizado por subagente arquitecto senior — 12 junio 2026. No parte de las cuatro IAs evaluadoras; perspectiva externa e independiente.

---

### ✅ PUNTOS FUERTES

#### 1. Coherencia entre restricciones de hardware y elecciones tecnológicas
El documento demuestra disciplina real al rechazar tecnologías razonables (NestJS, Redis, Electron, ASP.NET) con argumentos RAM cuantificados. La tabla de presupuesto de recursos es una rareza bienvenida: la mayoría de planes de integración ignoran el footprint operativo. Fastify (~50 MB) sobre NestJS (~200 MB) y Tauri (~5–15 MB) sobre Electron (~150 MB) son decisiones bien razonadas para el hardware objetivo.

#### 2. Elección de Go optimiza el recurso más escaso (RAM) — decisión correcta para el hardware
La adopción de Go (~15 MB) sobre Fastify/Node.js (~50 MB + Prisma ~30–50 MB) libera ~65–85 MB de RAM en un servidor donde cada MB cuenta. La concurrencia nativa con goroutines es superior al event loop de Node.js para manejar picos concurrentes en un universo de 10,000 usuarios históricos (RNF12). La pérdida de tipos compartidos Zod se compensa con validación independiente en cada capa (Zod en frontend, struct tags en Go) — un tradeoff bien documentado.

#### 3. Phaser 3 aplicado selectivamente, no globalmente
El plan usa Phaser 3 solo donde tiene sentido (Sopa de Letras, Rompecabezas, Crucigrama, Serpientes y Escaleras) y deja Trivia, Fake News y Memorama como React puro. Esta decisión optimiza el bundle size para los juegos más simples y cumple RNF2 (carga <3s en 3G). Muchos planes cometen el error de adoptar un motor de juego globalmente; aquí la discriminación es correcta.

#### 4. Flujo de sincronización offline con semántica clara por tipo de dato
El endpoint `/sync` define operaciones distintas por tipo de dato: suma para XP (RF70), unión de conjuntos para niveles completados (RF71), unión para insignias (RF72), y reconstrucción de secuencia máxima para rachas (RF73). Esto es semánticamente correcto — cada tipo tiene su propia lógica de merge idempotente. Combinar todos en un `last-write-wins` sería un error clásico de sincronización distribuida que aquí se evita correctamente.

#### 5. Tabla `experience_history` para auditoría de sincronizaciones
La adición de la tabla de auditoría (origen: GPT) convierte el endpoint `/sync` de una caja negra en un registro trazable. Ante una discrepancia de XP reportada por un usuario, el administrador puede reconstruir exactamente qué eventos offline llegaron, en qué orden, y cómo se fusionaron. Esto es imprescindible en un sistema educativo donde la XP puede tener consecuencias académicas o de gamificación.

#### 6. Retroceso exponencial con límite de reintentos concreto
El patrón `1s → 2s → 4s` (máximo 3 intentos) está correctamente acotado. Sin este límite, un servidor caído provocaría que todos los clientes reintenten indefinidamente en sincronía al reconectarse — una "tormenta de sincronización" que saturaría el único vCPU. El fallback al ciclo de 60 segundos también es correcto como válvula de seguridad.

#### 7. Rechazo explícito de SQLite como BD central con argumentación correcta
El descarte de SQLite como base de datos del servidor (por `SQLITE_BUSY` y falta de concurrencia de escritura) es técnicamente correcto y necesario documentarlo explícitamente, ya que es un error que equipos sin experiencia cometen al ver el hardware limitado. Que el documento lo anticipe y explique demuestra madurez técnica.

---

### ⚠️ PUNTOS DÉBILES E INCONSISTENCIAS

#### D1. `max_connections=20` era **críticamente incompatible con RNF12** — ✅ CORREGIDO
~~**El problema más grave del documento.**~~

La configuración original establecía `max_connections=20` en PostgreSQL. Esto fue corregido a `max_connections=100` en el cuerpo principal. Con Go + `pgxpool`, el pool de conexiones se configura directamente sin intermediario ORM, lo que simplifica el cálculo: `pgxpool` por defecto abre conexiones según demanda hasta el máximo configurado. PgBouncer sigue siendo recomendable como capa intermedia si los picos de carga superan lo esperado.

#### D2. El build estático del frontend estimado en **500 MB es incorrecto en un orden de magnitud**
El presupuesto de disco asigna 500 MB al "Build estático del frontend". Un build de producción de React 18 + Vite + Phaser 3 + Tailwind (con purge) genera entre **8 MB y 50 MB** de archivos estáticos. 500 MB implicaría incluir assets multimedia sin comprimir (videos, audios, imágenes crudas) en el propio bundle — lo cual contradice buenas prácticas y no está documentado en ninguna parte del plan.

**Si el plan prevé almacenar assets educativos (imágenes de niveles, audio) en el servidor**, esos deberían estar contabilizados en la partición de PostgreSQL o en una carpeta de assets dedicada, no dentro del "build estático". Este error infla artificialmente el uso de disco y da una falsa sensación de holgura.

**Corrección:** Corregir la estimación del build estático a ~50 MB (con margen generoso). Si hay assets multimedia, crear una línea separada en el presupuesto de disco: `Assets multimedia (imágenes/audio de niveles): ~X GB`.

#### D3. ~~Prisma ORM tenía un proceso de query engine no contabilizado en RAM~~ — ✅ RESUELTO
Al adoptar Go con `pgx` (acceso directo a PostgreSQL), se eliminó Prisma por completo del stack. Esto libera ~30–50 MB de RAM del query engine binario y simplifica la arquitectura del backend. El presupuesto de RAM actualizado refleja este cambio.

#### D4. JWT sin mecanismo de revocación — **riesgo de seguridad aceptado sin documentación**
El plan elige JWT stateless con el argumento correcto de evitar Redis. Sin embargo, no documenta cómo manejar tokens comprometidos o cierre de sesión forzado (por ejemplo, si un administrador desactiva una cuenta). Un JWT válido seguirá funcionando hasta su expiración aunque la cuenta esté bloqueada en la base de datos.

Esto no es un error de arquitectura insalvable — es una compensación (tradeoff) válida para el contexto — pero debería estar documentada explícitamente como decisión consciente con sus implicaciones.

**Corrección:** Añadir una nota en la sección JWT indicando: duración corta de tokens (recomendado: 15 min access token + refresh token de 7 días), y que la revocación se maneja únicamente por expiración. Si el sistema requiere revocación inmediata (ej: suspensión de cuenta por conducta), añadir una tabla `revoked_tokens` o un campo `token_version` en `users` es el enfoque de menor RAM (sin Redis).

#### D5. ~~bcrypt en Node.js bloqueaba el event loop~~ — ✅ RESUELTO
Al adoptar Go con Argon2id (`golang.org/x/crypto/argon2`), el problema del thread pool de Node.js desaparece por completo. Go ejecuta Argon2id nativamente en goroutines sin las limitaciones de libuv. Configuración adoptada: `memory: 65536` (64 MB), `iterations: 3`, `parallelism: 1`. Se recomienda rate limiting explícito al endpoint `/auth/login` en Nginx (ej. 10 req/min por IP).

#### D6. ~~Inconsistencia entre detección de red en web vs. Tauri~~ ✅ CORREGIDO

**Problema original:** El plan usaba `navigator.onLine` indistintamente para web y Tauri, sin reconciliar que Rust puede verificar conectividad real mientras que el browser no.

**Solución adoptada:** La sección "Detección de red" fue dividida en dos subsecciones explícitas:

| Contexto | Mecanismo de conectividad | Propósito |
|----------|--------------------------|----------|
| Web App (browser) | `navigator.onLine` + eventos + timer JS 60s | Única opción disponible en browser; actualiza icono + fallback de requests |
| Tauri (escritorio) | **Ping TCP activo a `usbi.edu.mx:443` desde Rust** (timeout 3s, cada 60s) | Verifica conectividad *real* al servidor antes de intentar sync |
| Tauri (icono visual) | `navigator.onLine` (WebView) | Solo para actualizar el indicador de conectividad en pantalla (RF66) |

`navigator.onLine` puede dar falsos positivos (WiFi sin internet, captive portals). El ping TCP en Rust garantiza que si el intento falla, es porque el servidor es realmente inalcanzable — evitando el gasto de los 3 reintentos exponenciales en vano.

#### D7. **Ausencia de índices en el modelo de datos**
El modelo de datos lista 8 tablas pero no menciona ningún índice. Las operaciones más críticas en rendimiento son:
- `player_progress` filtrado por `user_id` y `level_id` (muy frecuente)
- `daily_streak` filtrado por `user_id` y `date` (operación de racha diaria)
- `sync_queue` filtrado por `user_id` y `status` (procesamiento de sincronización)
- `experience_history` filtrado por `user_id` (auditoría)

Sin índices explícitos en estas columnas, las queries escalan a O(n) en full table scans. Con 10,000 registros históricos, esto es inaceptable.

**Corrección:** Añadir en la sección del modelo de datos los índices mínimos necesarios: `CREATE INDEX ON player_progress(user_id)`, `CREATE INDEX ON daily_streak(user_id, activity_date)`, `CREATE INDEX ON sync_queue(user_id, status)`, `CREATE INDEX ON experience_history(user_id)`.

---

### 🐛 ERRORES TÉCNICOS CONCRETOS

#### E1. `effective_cache_size=512MB` — **parámetro mal interpretado en el contexto del presupuesto**
`effective_cache_size` **no reserva memoria**. Es un hint que PostgreSQL usa en su planificador de queries para estimar el costo de un index scan vs. seq scan. No afecta el consumo real de RAM. El documento lo lista en la "Configuración para bajo consumo" junto a parámetros que sí reservan memoria, lo que puede confundir al desarrollador que configure el servidor.

Un valor de 512 MB con solo 1 GB total de RAM es razonable como hint (indica al planificador que hay ~512 MB de OS page cache disponible), pero debe aclararse que no es memoria reservada.

#### E2. ~~Suma directa de XP offline sin validación anti-trampa~~ — ✅ CORREGIDO
El endpoint `/sync` ahora valida que `offlineXP` sea consistente con los `offlineCompletedLevelIds` recibidos: `XP_esperada = SUMA(xp_por_nivel)`. Si la XP declarada supera la XP derivable de los niveles completados, la solicitud se rechaza y se registra la anomalía en `experience_history` para auditoría.

#### E3. **Phaser 3 dentro de componentes React — memory leak por destrucción incorrecta del canvas**
El plan menciona integrar Phaser 3 "dentro de componentes React" pero no documenta el ciclo de vida. Phaser crea un renderer WebGL/Canvas y un game loop al instanciar `new Phaser.Game()`. Si el componente React se desmonta sin llamar a `game.destroy(true)`, el game loop sigue corriendo en memoria, y el canvas queda referenciado por el garbage collector de Phaser. En aplicaciones con navegación entre múltiples minijuegos (el usuario cambia de Sopa de Letras a Trivia y vuelve), esto genera memory leaks acumulativos.

**Corrección:** Añadir en la documentación de integración Phaser/React el patrón obligatorio:
```typescript
useEffect(() => {
  const game = new Phaser.Game(config);
  return () => {
    game.destroy(true); // cleanup al desmontar
  };
}, []);
```

---

### 📏 EVALUACIÓN GLOBAL

**Puntuación: 8.5 / 10**

**Justificación:**

El plan es sólido en su arquitectura de alto nivel y demuestra una comprensión genuina de las restricciones de hardware. La adopción de Go como backend (~15 MB) y el acceso directo a PostgreSQL vía pgx (sin ORM) maximizan el margen de RAM disponible (~63%), lo que proporciona un colchón cómodo para el servidor de 1 GB. El mecanismo de sincronización offline es el punto más maduro del documento: define semántica de merge por tipo de dato con validación anti-trampa server-side, lo cual es correcto a nivel de sistemas distribuidos.

Las correcciones aplicadas (D1: max_connections, D2: estimación de disco, D3: eliminación de Prisma, D5: Argon2id, D6: detección de red, D7: índices, E2: validación anti-trampa) resuelven las debilidades críticas identificadas. El soporte de offline temporal en browser (`localStorage`) complementa la estrategia de Tauri.

Pendientes menores: -0.5 por el patrón de cleanup de Phaser/React (E3) aún no integrado como requisito formal, -0.5 por la ausencia de rate limiting específico en Nginx (valores concretos) y monitoreo operativo (justificadamente pospuesto a fase de implementación), -0.5 por la responsabilidad añadida de mantener validaciones sincronizadas entre TypeScript (frontend) y Go (backend) sin tipos compartidos.

**El plan es apto para comenzar el desarrollo.**

---

*Análisis crítico generado por subagente arquitecto independiente — 12 junio 2026*
