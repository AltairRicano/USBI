# Propuesta tecnológica — Plataforma de minijuegos educativos USBI

> Stack optimizado para servidor de **1 núcleo · 1 GB RAM · 20 GB de almacenamiento**

---

## Resumen general

La plataforma se divide en tres entornos de ejecución:

- **Web app** — corre en el navegador del usuario (no consume recursos del servidor).
- **App de escritorio** — corre en el dispositivo del usuario con capacidad offline (Tauri).
- **Servidor USBI** — aloja el backend, la base de datos y los archivos estáticos.

El lenguaje principal a lo largo de toda la arquitectura es **TypeScript**, lo que permite compartir tipos, esquemas de validación y lógica entre frontend y backend sin duplicar código.

---

## Frontend — Web app

### React 18 + Vite + TypeScript

**Capa:** Frontend  
**Corre en:** Navegador del usuario

React es la librería de interfaz de usuario. Cada plantilla de minijuego (Trivia, Memorama, Crucigrama, Sopa de Letras, Rompecabezas, Fake News, Serpientes y Escaleras) se implementa como un componente React independiente, lo que permite desarrollar, probar y mantener cada mecánica de forma aislada sin que un bug en una afecte a las demás.

Vite reemplaza a webpack como bundler: los tiempos de compilación pasan de minutos a segundos, y genera los archivos estáticos finales (HTML, JS, CSS) que se sirven directamente desde Nginx en el servidor.

**Uso concreto en el proyecto:**
- Módulo de jugador: pantalla de perfil, progreso, insignias, racha diaria.
- Módulo de administrador: panel de creación y edición de niveles y secciones.
- Módulo Maker: creador de niveles comunitarios que opera completamente en memoria del navegador, sin llamadas al servidor.
- Las mecánicas de juego (drag & drop del Rompecabezas, selección en Sopa de Letras, teclado en Crucigrama) son lógica pura de React, sin necesidad de un motor de juego externo.

---

### Tailwind CSS

**Capa:** Frontend  
**Corre en:** Navegador del usuario (CSS compilado estáticamente)

Framework de utilidades CSS. En lugar de escribir hojas de estilo separadas, los estilos se aplican directamente en los componentes mediante clases predefinidas. Vite purga automáticamente las clases no usadas, produciendo un archivo CSS final muy pequeño.

**Uso concreto en el proyecto:**
- Sistema de colores dinámico para los fondos de niveles y secciones configurables por el administrador.
- Diseño responsivo para que la app funcione tanto en escritorio como en dispositivos móviles (táctil para Sopa de Letras, Rompecabezas, etc.).

---

### React Query (TanStack Query)

**Capa:** Frontend  
**Corre en:** Navegador del usuario

Librería de gestión de estado del servidor. Se encarga de hacer las llamadas a la API, cachear las respuestas, y revalidar automáticamente cuando los datos cambian, sin que el desarrollador tenga que manejar manualmente estados de carga, error o caché.

**Uso concreto en el proyecto:**
- Caché del perfil del jugador, sus niveles superados e insignias — evita recargar el servidor en cada navegación.
- Invalidación automática del caché al completar un nivel (actualiza experiencia y rango en tiempo real).
- Manejo del estado de sincronización offline en la app de escritorio.

---

### Zod

**Capa:** Frontend y Backend (librería compartida)  
**Corre en:** Navegador del usuario y servidor Node.js

Librería de validación y parsing de esquemas TypeScript. Define la "forma" exacta que deben tener los datos y valida en tiempo de ejecución que los datos recibidos cumplan esa forma.

**Uso concreto en el proyecto:**
- Validación estricta del archivo JSON importado en el Maker (RF36): rechaza cualquier archivo con campos no reconocidos, tipos incorrectos, valores fuera de rango o peso mayor a 5 MB antes de intentar cargarlo.
- El mismo esquema Zod se reutiliza en el backend para validar los datos que llegan desde el cliente, garantizando consistencia sin duplicar lógica.

---

## Frontend — App de escritorio

### Tauri (Rust + WebView del sistema)

**Capa:** Frontend / Cliente de escritorio  
**Corre en:** Dispositivo del usuario (Windows, macOS, Linux)

Tauri es un framework para construir aplicaciones de escritorio usando tecnologías web para la interfaz (el mismo React que la web app) pero con un backend nativo en Rust que accede al sistema operativo. A diferencia de Electron, no empaqueta un navegador completo: usa el WebView del sistema operativo, produciendo binarios de ~5–15 MB en lugar de ~150 MB.

**Uso concreto en el proyecto:**
- Ejecuta exactamente el mismo código React de la web app, eliminando la necesidad de mantener dos frontends distintos.
- Acceso nativo al sistema de archivos para leer y escribir la base de datos SQLite local donde se guarda el progreso offline.
- Detección del estado de red (online/offline) a nivel de sistema operativo para mostrar el indicador de conectividad (RF66).
- Verificación de conectividad cada 60 segundos y envío de la cola de sincronización al servidor cuando hay conexión (RF67, RF68), posponiendo la sincronización si hay una partida en curso.

---

### SQLite (almacenamiento local en Tauri)

**Capa:** Base de datos local (cliente de escritorio)  
**Corre en:** Dispositivo del usuario

Base de datos embebida que vive como un archivo en el dispositivo del usuario. No requiere servidor ni configuración.

**Uso concreto en el proyecto:**
- Almacena experiencia ganada offline, niveles superados e insignias obtenidas sin conexión.
- Guarda las fechas de actividad para el cálculo de racha diaria offline.
- Mantiene una tabla `sync_queue` con los registros pendientes de enviar al servidor.
- Los niveles del Maker y archivos JSON importados se mantienen exclusivamente aquí, nunca se sincronizan con el servidor (RF35).

---

## Backend

### Fastify + TypeScript

**Capa:** Backend  
**Corre en:** Servidor USBI  
**Consumo estimado de RAM:** ~40–60 MB

Framework web para Node.js, más liviano y rápido que NestJS (el cual consumiría ~200 MB solo en arranque). Fastify está optimizado para alta velocidad con bajo overhead, crítico en un servidor con 1 GB de RAM total compartido entre OS, base de datos y backend.

**Uso concreto en el proyecto:**
- Expone una API REST con los siguientes grupos de endpoints:
  - `/auth` — registro, login, cambio de contraseña, eliminación de cuenta.
  - `/player` — perfil, progreso, experiencia, racha, insignias.
  - `/levels` — CRUD de niveles y secciones (admin), consulta pública (jugador).
  - `/sync` — recepción del progreso offline desde la app de escritorio.
- Sistema de plugins de Fastify para organizar el código en módulos (autenticación, jugador, administrador, sincronización) con una estructura comparable a NestJS pero sin su overhead.
- Manejo de roles mediante decoradores personalizados: las rutas de administrador rechazan automáticamente tokens de jugador.

---

### JWT + bcrypt

**Capa:** Backend  
**Corre en:** Servidor USBI

**JWT (JSON Web Tokens):** mecanismo de autenticación stateless. Al iniciar sesión, el servidor genera un token firmado que el cliente envía en cada solicitud. No requiere almacenar sesiones en servidor ni en Redis, lo que elimina un componente de infraestructura y ahorra ~50 MB de RAM.

**bcrypt:** algoritmo estándar para hashear contraseñas. Aplica múltiples rondas de hashing, haciendo que ataques de fuerza bruta sean computacionalmente inviables aunque alguien obtenga acceso directo a la base de datos.

**Uso concreto en el proyecto:**
- Al registrarse, la contraseña pasa por bcrypt antes de almacenarse — la base de datos nunca guarda contraseñas en texto plano (RF4).
- El token JWT incluye el rol del usuario (admin/jugador), permitiendo al backend verificar permisos en cada solicitud sin consultar la base de datos (RF6, RF7).
- Los datos sensibles (correo, teléfono) se cifran en reposo con AES-256 vía `pgcrypto` de PostgreSQL (RF5).

---

### pm2

**Capa:** Backend / Infraestructura  
**Corre en:** Servidor USBI

Process manager para Node.js. Mantiene el proceso de Fastify corriendo, lo reinicia automáticamente si falla, y gestiona los logs de la aplicación.

**Uso concreto en el proyecto:**
- Configurado con `instances: 1` (apropiado para el servidor de un solo núcleo).
- Reinicio automático ante errores inesperados sin intervención manual.
- Logs con rotación automática para no agotar los 20 GB de disco.

---

## Base de datos

### PostgreSQL 15

**Capa:** Base de datos principal  
**Corre en:** Servidor USBI  
**Consumo estimado de RAM:** ~128–150 MB (configuración ajustada)

Base de datos relacional robusta, con soporte para cifrado a nivel de columna mediante la extensión `pgcrypto`. Se configura específicamente para operar con recursos limitados.

**Configuración para bajo consumo:**
```
shared_buffers     = 128MB
work_mem           = 4MB
max_connections    = 20
effective_cache_size = 512MB
```

**Tablas principales del proyecto:**
- `users` — credenciales cifradas, preferencias, fecha de registro.
- `levels` — plantilla, contenido JSON, dificultad, sección, color.
- `sections` — agrupaciones temáticas de niveles.
- `player_progress` — niveles superados, experiencia por nivel.
- `badges` — insignias desbloqueadas por jugador.
- `daily_streak` — fechas de actividad para el cálculo de racha.
- `sync_queue` — registros de progreso offline pendientes de procesar desde la app de escritorio.

**Uso concreto en el proyecto:**
- `pgcrypto` cifra correo y teléfono en reposo (RF5).
- La tabla `sync_queue` actúa como buffer para las sincronizaciones offline, reemplazando la funcionalidad que normalmente requeriría Redis (RF67–RF73).
- Integridad referencial garantiza que al eliminar un nivel o sección, la experiencia histórica de los jugadores se conserva (RF26).

---

### Prisma ORM

**Capa:** Backend (capa de acceso a datos)  
**Corre en:** Servidor USBI

ORM (Object-Relational Mapper) que genera código TypeScript a partir del esquema de la base de datos. Traduce operaciones en TypeScript a SQL, con autocompletado y verificación de tipos en tiempo de desarrollo.

**Uso concreto en el proyecto:**
- Migraciones versionadas de la base de datos: cualquier cambio en el esquema queda registrado y es reproducible.
- Tipado automático de las consultas: si el esquema cambia, TypeScript señala todos los lugares del código que necesitan actualizarse.
- Simplifica las operaciones de sincronización offline: lectura de `sync_queue`, fusión de experiencia/insignias/niveles (RF70, RF71, RF72).

---

## Infraestructura del servidor

### Nginx

**Capa:** Infraestructura  
**Corre en:** Servidor USBI  
**Consumo estimado de RAM:** ~5–10 MB

Servidor web y reverse proxy. Recibe todas las conexiones entrantes, sirve los archivos estáticos del frontend directamente (sin pasar por Node.js) y redirige las solicitudes de API hacia Fastify.

**Uso concreto en el proyecto:**
- Termina TLS: gestiona el certificado HTTPS para que toda la comunicación vaya cifrada (RF69).
- Sirve el build estático de React (HTML, JS, CSS) directamente desde disco, liberando a Node.js para procesar solo la lógica de negocio.
- Rate limiting a nivel de IP para proteger los endpoints de autenticación contra ataques de fuerza bruta.

---

## Presupuesto estimado de recursos en el servidor

| Componente       | RAM estimada |
|------------------|-------------|
| OS (Ubuntu)      | ~200 MB     |
| Nginx            | ~10 MB      |
| Fastify (Node)   | ~50 MB      |
| PostgreSQL       | ~150 MB     |
| **Total en uso** | **~410 MB** |
| **Margen libre** | **~614 MB** |

El margen libre (~60% de la RAM total) proporciona espacio para picos de tráfico, procesos del sistema operativo y crecimiento futuro de la base de datos.

**Disco estimado:**
| Uso                        | Espacio estimado |
|----------------------------|-----------------|
| OS + dependencias          | ~3 GB           |
| PostgreSQL (datos + índices)| ~2 GB           |
| Build estático del frontend| ~500 MB         |
| Logs (con rotación)        | ~500 MB         |
| **Total estimado**         | **~6 GB / 20 GB** |

---

## Resumen por capas

| Tecnología      | Capa              | Propósito principal                                      |
|-----------------|-------------------|----------------------------------------------------------|
| React 18 + Vite | Frontend web      | UI de jugador, administrador y Maker                     |
| TypeScript      | Frontend + Backend| Lenguaje unificado, tipos compartidos                    |
| Tailwind CSS    | Frontend web      | Estilos responsivos y colores dinámicos de niveles       |
| React Query     | Frontend web      | Caché de datos del servidor, sincronización de estado    |
| Zod             | Frontend + Backend| Validación de JSON importados y datos de la API          |
| Tauri           | Escritorio        | App nativa con WebView, acceso offline                   |
| SQLite          | Escritorio        | Almacenamiento local de progreso offline y Maker         |
| Fastify         | Backend           | API REST, autenticación, lógica de negocio               |
| JWT + bcrypt    | Backend           | Autenticación stateless, hash seguro de contraseñas      |
| pm2             | Backend           | Gestión del proceso Node.js en producción                |
| PostgreSQL 15   | Base de datos     | Persistencia principal con cifrado en reposo             |
| Prisma ORM      | Backend           | Acceso tipado a la base de datos, migraciones            |
| Nginx           | Infraestructura   | Reverse proxy, TLS, servicio de archivos estáticos       |

---

*Propuesta generada con asistencia de Claude (Anthropic) — Junio 2026*
