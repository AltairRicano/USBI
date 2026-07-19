# Propuesta GPT para la USBI

## Objetivo

Desarrollar una plataforma educativa compuesta por:

- Aplicación web para jugadores y administradores.
- Aplicación de escritorio con soporte offline.
- Base de datos centralizada.
- Sincronización automática entre servidor y aplicación de escritorio.

La propuesta está optimizada para ejecutarse en un servidor con:

- 1 vCPU
- 1 GB de RAM
- 20 GB de almacenamiento

---

# Arquitectura General

```text
React (Web)
      |
      v
ASP.NET Core API
      |
      v
PostgreSQL
      ^
      |
Tauri Desktop + SQLite
```

---

# Tecnologías Propuestas

| Capa | Tecnología | Uso |
|--------|--------|--------|
| Frontend Web | React + TypeScript | Interfaz para jugadores y administradores |
| Build Frontend | Vite | Compilación rápida del frontend |
| Aplicación Escritorio | Tauri | Cliente de escritorio ligero con soporte offline |
| Backend | ASP.NET Core | API REST central del sistema |
| ORM | Entity Framework Core | Acceso y gestión de la base de datos |
| Base de Datos Principal | PostgreSQL | Almacenamiento centralizado |
| Base de Datos Local | SQLite | Operación offline en escritorio |
| Proxy Inverso | Nginx | Exposición segura de la API |
| Autenticación | ASP.NET Identity + JWT | Gestión de usuarios y sesiones |
| Cifrado de Datos | AES‑256‑GCM | Protección de correo y teléfono |
| Hash de Contraseñas | PBKDF2 (Identity) | Protección de contraseñas |
| Comunicación Segura | TLS 1.2+ | Cifrado durante la sincronización |
| Formato de Niveles Maker | JSON | Exportación e importación local |

---

# Frontend Web

## Tecnologías

- React
- TypeScript
- Vite

## Responsabilidades

### Jugador

- Registro de cuenta.
- Inicio de sesión.
- Consulta de perfil.
- Consulta de experiencia.
- Consulta de insignias.
- Consulta de racha.
- Juego de niveles oficiales.
- Visualización de material educativo.

### Administrador

- Creación de niveles.
- Edición de niveles.
- Eliminación de niveles.
- Gestión de secciones.
- Duplicación de niveles.
- Duplicación de secciones.
- Consulta de métricas.

---

# Aplicación de Escritorio

## Tecnologías

- Tauri
- React
- TypeScript
- SQLite

## Responsabilidades

### Operación Offline

Permite:

- Jugar sin conexión.
- Guardar progreso local.
- Mantener experiencia acumulada.
- Mantener niveles completados.
- Mantener insignias.
- Mantener fechas de actividad para racha.

### Sincronización

Cada cierto tiempo:

1. Detecta conexión.
2. Consulta cambios del servidor.
3. Descarga contenido nuevo.
4. Envía progreso pendiente.
5. Actualiza SQLite local.

---

# Backend

## Tecnologías

- ASP.NET Core
- Entity Framework Core

## Responsabilidades

### API REST

Gestiona:

- Usuarios.
- Perfiles.
- Preferencias.
- Secciones.
- Niveles.
- Experiencia.
- Rachas.
- Insignias.
- Sincronización.

### Lógica de Negocio

Calcula:

- Experiencia.
- Rangos.
- Reintentos.
- Rachas.
- Insignias.
- Validaciones.

---

# Base de Datos Principal

## Tecnología

PostgreSQL

## Razones

- Excelente rendimiento.
- Bajo consumo de recursos.
- Código abierto.
- Compatible con ASP.NET Core.
- Adecuada para servidores pequeños.

## Tablas Principales

### Usuarios

- Users
- Profiles
- Preferences

### Contenido

- Sections
- Levels
- Templates

### Minijuegos

- TriviaQuestions
- PuzzleFragments
- CrosswordWords
- WordSearchWords
- MemoryPairs
- FakeNewsCards
- SnakesAndLaddersQuestions

### Progreso

- ExperienceHistory
- CompletedLevels
- Badges
- StreakActivity

---

# Seguridad

## Contraseñas

Las contraseñas no se almacenan.

Se almacena únicamente:

- Hash PBKDF2

## Datos Sensibles

Se cifran:

- Correo electrónico.
- Número telefónico.

Mediante:

- AES‑256‑GCM

## Comunicación

Toda comunicación utiliza:

- HTTPS
- TLS 1.2 o superior

---

# Maker

## Tecnologías

- React
- JSON Schema

## Funciones

### Crear Nivel

Permite:

- Trivia
- Rompecabezas
- Sopa de Letras
- Fake News
- Crucigrama
- Memorama
- Serpientes y Escaleras

### Exportar

Genera:

```json
{
  "template": "trivia",
  "difficulty": 5
}
```

### Importar

Valida:

- Estructura JSON.
- Tipos de datos.
- Campos permitidos.
- Tamaño máximo de 5 MB.

### Restricción

Los niveles del Maker:

- No se envían al servidor.
- No modifican la experiencia oficial.
- No afectan rachas.
- No afectan insignias.

---

# Sincronización Web ↔ Escritorio

Cuando un administrador:

- Crea un nivel.
- Modifica un nivel.
- Elimina un nivel.
- Crea una sección.

Los cambios se guardan en PostgreSQL.

Posteriormente la aplicación de escritorio:

1. Detecta conexión.
2. Consulta cambios recientes.
3. Descarga únicamente diferencias.
4. Actualiza SQLite local.

De esta forma los usuarios reciben automáticamente nuevo contenido sin reinstalar la aplicación.

---

# Ventajas de la Propuesta

- Compatible con los requisitos funcionales.
- Bajo consumo de RAM.
- Bajo consumo de CPU.
- Escalable.
- Fácil mantenimiento.
- Soporte offline.
- Seguridad adecuada.
- Arquitectura moderna.
- Adecuada para un entorno universitario.
