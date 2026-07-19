# Propuesta DeepSeek para la USBI

## Tecnologías propuestas (servidor pequeño: 1 CPU, 1 GB RAM, 20 GB disco)

### 1. Backend (API y lógica de negocio)

| Tecnología | Uso | Cómo se usará |
|------------|-----|----------------|
| **Go (Golang)** con framework **Gin** o **Fiber** | Servidor HTTP, endpoints REST, lógica de experiencia, racha, rangos, sincronización offline | Se compila a un único binario estático. Maneja autenticación (JWT), cifrado de datos sensibles, validación de niveles, control de reintentos (RF15) y el endpoint `/sync`. Corre en el mismo puerto (ej. 443) y también sirve los archivos estáticos del frontend. |
| **SQLite** (con `modernc.org/sqlite` o `mattn/go-sqlite3`) | Base de datos principal (compartida entre web y escritorio) | Almacena usuarios (con email/teléfono cifrado), secciones, niveles oficiales, progreso, racha, insignias. Se usan `PRAGMA journal_mode=WAL` y `PRAGMA synchronous=NORMAL` para buen rendimiento con escrituras concurrentes. |
| **Cifrado AES-256-GCM** (biblioteca estándar de Go) | Cifrado en reposo de correo electrónico y número de teléfono (RF5) | Antes de insertar en SQLite, el backend cifra los datos sensibles con una clave maestra (variable de entorno). Los almacena como `BLOB`. Para el login, se usa un HMAC adicional como índice de búsqueda (no reversible). |
| **bcrypt** (coste 10) | Hash de contraseñas (RF4) | Se aplica en el backend antes de guardar en la BD. El coste 10 ahorra CPU en un servidor pequeño sin sacrificar seguridad significativa. |
| **TLS 1.3** (nativo en Go) | Cifrado en tránsito (RF69) | El servidor Go se ejecuta con `ListenAndServeTLS`, usando certificados de Let's Encrypt. Todas las comunicaciones (incluyendo `/sync`) viajan sobre TLS 1.3. |

### 2. Frontend Web

| Tecnología | Uso | Cómo se usará |
|------------|-----|----------------|
| **React 18** + **TypeScript** | Interfaz de usuario web | Se construye con Vite. Maneja registro, login, perfil, preferencias, secciones de aprendizaje, y el módulo Maker. Consume la API del backend Go. |
| **Vite** | Empaquetador y servidor de desarrollo | Produce archivos estáticos optimizados (HTML, JS, CSS) que luego sirve el backend Go. |
| **Phaser 3** | Motor de juegos para todas las plantillas (Trivia, Rompecabezas, Sopa de Letras, Fake News, Crucigrama, Memorama, Serpientes y Escaleras) | Se monta dentro de componentes React. Maneja arrastrar fragmentos (RF43), selección en sopa de letras (RF46), tecleado en crucigrama (RF53), dado D6 (RF61), etc. |
| **Zustand** | Estado global (perfil, preferencias, progreso local temporal) | Almacena la sesión del usuario, las preferencias de contenido (RF9) y el estado de partidas en curso. |
| **localStorage** (web) / **SQLite** (escritorio) | Almacenamiento de niveles del Maker y JSON importados (RF35) | En la web se guardan en `localStorage`. En la app de escritorio se usa SQLite local. Nunca se sincronizan con el servidor. |
| **ajv** (JSON Schema validator) | Validación estricta de JSON importado (RF36) | Antes de cargar un nivel comunitario, el frontend valida el archivo contra un esquema predefinido. Rechaza si tiene campos extraños, código malicioso, tamaño >5 MB o tipos incorrectos. |

### 3. Aplicación de Escritorio (modo offline completo)

| Tecnología | Uso | Cómo se usará |
|------------|-----|----------------|
| **Tauri** (Rust + React) | Framework para app de escritorio liviana | El frontend es el mismo React usado en la web, pero empaquetado en una ventana nativa. El backend en Rust corre en segundo plano y ofrece capacidades de sistema (detección de red, SQLite local, sincronización). |
| **SQLite** (local) | Almacenamiento de progreso offline, niveles comunitarios y JSON importados | La app guarda toda la actividad cuando no hay internet: experiencia obtenida, niveles completados, fechas de actividad. También guarda la racha calculada localmente. |
| **Rust** (parte nativa de Tauri) | Comandos para sincronización, detección de conectividad (RF66), timer cada 60 segundos (RF68) | Cada 60 segundos verifica si hay conexión. Si la hay y no hay partida en curso, envía los datos locales al endpoint `/sync` del servidor. Recibe el perfil unificado y actualiza su SQLite local. |
| **reqwest** (Rust) + rustls | Cliente HTTP con TLS 1.3 para sincronización (RF69) | Se usa desde Tauri para comunicarse con el backend Go de forma segura. |

### 4. Sincronización offline (RF66–RF73)

| Componente | Dónde corre | Cómo funciona |
|------------|-------------|----------------|
| **Endpoint `/sync`** (Go) | Servidor central | Recibe `{ offlineXP, offlineCompletedLevelIds, offlineActivityDates[] }`. Suma la experiencia local a la global, une los niveles completados (unión), unifica insignias (según experiencia total) y reconstruye la racha diaria más larga combinando las fechas online y offline. Devuelve el perfil unificado. |
| **Lógica de unificación** | Servidor central | Garantiza que no se pierda progreso. Por ejemplo, si un nivel se completó offline pero no online, al sincronizar se marca como completado en el servidor (RF71). La racha se recalcula con la secuencia más larga de días consecutivos (RF73). |
| **Timer en Tauri** | App de escritorio | Cada 60 segundos comprueba la conectividad. Si está online y no hay partida activa (RF68), lanza la sincronización. Muestra un indicador visual (RF66). |

### 5. Base de datos compartida (servidor)

| Tabla principal | Descripción | Tecnología de cifrado |
|----------------|-------------|------------------------|
| `users` | `id`, `email_cifrado` (BLOB), `telefono_cifrado` (BLOB), `password_hash`, `created_at` | AES-256-GCM para email/teléfono; bcrypt para password |
| `sections` | `id`, `titulo`, `color`, `created_by_admin_id` | Sin cifrado (datos no sensibles) |
| `levels` | `id`, `section_id`, `plantilla_tipo`, `config_jsonb` (JSON), `dificultad`, `titulo` | JSON almacenado en texto plano (niveles oficiales) |
| `user_progress` | `user_id`, `level_id`, `completado`, `experiencia_obtenida`, `ultima_fecha_intento`, `reintentos_hoy` | Sin cifrado |
| `user_streak` | `user_id`, `racha_actual`, `ultima_fecha_actividad`, `fechas_actividad_array` (JSON) | Las fechas se guardan en texto plano |
| `badges` / `user_badges` | Catálogo de insignias y relación con usuarios | Sin cifrado |

**Nota**: SQLite no tiene tipo JSON nativo, pero se puede usar `TEXT` con validación de JSON en Go.

### 6. Módulo Maker y niveles de comunidad (RF30–RF36)

| Tecnología | Ámbito | Uso |
|------------|--------|-----|
| **Editor JSON** (React) | Web y escritorio | Permite al jugador seleccionar plantilla, título, color, contenido, dificultad. Genera un objeto JSON que cumple el esquema de la plantilla. |
| **Botón de prueba** (Phaser) | Web y escritorio | Carga el nivel temporalmente en una escena de Phaser para validar mecánicas (RF31). |
| **Exportar a JSON** | Web y escritorio | Descarga el nivel como archivo `.json` (RF32). |
| **Importar JSON** | Web y escritorio | Usa `ajv` para validar estructura, tipos, tamaño (<5 MB) y ausencia de campos maliciosos (RF36). Si es válido, se guarda en `localStorage` (web) o SQLite local (escritorio). |
| **Omitir registro de progreso** | Web y escritorio | Al terminar un nivel importado, el sistema no envía experiencia ni actualiza racha (RF34). Solo se juega por diversión. |

### 7. Mecánicas de juego (por plantilla)

| Plantilla | Implementación en Phaser 3 / React |
|-----------|--------------------------------------|
| Trivia | Componente React con preguntas y opciones. Validación de respuesta correcta al seleccionar. |
| Rompecabezas | Arrastrar fragmentos (drag & drop) con detección de orden correcto (RF43). |
| Sopa de Letras | Canvas + detección de arrastre del mouse/dedo. Validación contra lista de palabras (RF46, RF47). |
| Fake News | Presentación de nota, botones "Real" / "Fake". Cálculo de aciertos (RF48–RF50). |
| Crucigrama | Tablero generado desde conceptos. Entrada de texto por celda, prioridad vertical en intersecciones (RF51–RF54). |
| Memorama | Pares de tarjetas con conceptos y descripciones. Colores asignados manualmente o al azar (RF55–RF57). |
| Serpientes y Escaleras | Tablero con casillas, serpientes/escaleras, dado D6, banco de preguntas que se recicla (RF58–RF65). |

---

## Resumen de requisitos del servidor

- **CPU**: 1 core (suficiente para Go + SQLite, con picos controlados)
- **RAM**: 1 GB (uso esperado ~150–200 MB, holgado)
- **Disco**: 20 GB (sistema operativo Alpine ~2 GB, binario Go ~15 MB, frontend estático ~10 MB, base de datos <500 MB para miles de usuarios)
- **Sistema operativo recomendado**: Alpine Linux (muy liviano)

---

## Seguridad cumplida

- **RF4**: Hash bcrypt de contraseñas.
- **RF5**: AES-256-GCM para email/teléfono en reposo.
- **RF36**: Validación estricta de JSON (ajv) contra esquema, límite 5 MB.
- **RF69**: TLS 1.3 en toda comunicación servidor ↔ cliente (escritorio y web).

---

## Conclusión

Esta propuesta tecnológica respeta las restricciones del servidor pequeño (1 CPU / 1 GB / 20 GB), cumple todos los requisitos funcionales (RF1 a RF73) y es fácil de desplegar (un solo binario Go + archivos estáticos). La app de escritorio (Tauri) maneja el modo offline de forma transparente, y la sincronización se resuelve con un endpoint liviano `/sync` que unifica el progreso sin conflictos.