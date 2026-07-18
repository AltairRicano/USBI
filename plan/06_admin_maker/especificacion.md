# Fase 5: Módulo de Administración y Maker (Tauri)

> [!CAUTION]
> **RESTRICCIÓN LEGAL Y ARQUITECTÓNICA:** El servidor (Backend Go / PostgreSQL) **NUNCA** aloja, procesa ni almacena los archivos JSON generados por la comunidad en el modo Maker. El Creador de Niveles exporta los JSON *exclusivamente* al sistema de archivos local del usuario mediante Tauri IPC. Los niveles oficiales de la USBI sí se guardan en la DB mediante endpoints estándar.

## 1. Interfaz de Creación de Niveles (React + Zod)
- [ ] Construye el formulario de creación de niveles en `apps/admin/src/features/maker/` utilizando `react-hook-form`.
- [ ] Implementa validación estricta en tiempo real utilizando los esquemas Zod compartidos en `packages/schema`.
- [ ] El esquema base `LevelDataSchema` debe rechazar cargas útiles con campos no reconocidos (`.strict()`).

## 2. Exportación e Importación Local (Tauri IPC)
- [ ] Implementa la invocación a Tauri IPC `@tauri-apps/plugin-fs` y `@tauri-apps/plugin-dialog` para guardar y cargar archivos JSON.
- [ ] Define comandos IPC estrictos en Rust si es necesario, o usa los plugins oficiales:
  - Validar tamaño de archivo al importar (Límite estricto: **5MB** máximo para prevenir overloads en memoria).
  - Rechazar archivos inmediatamente si superan el tamaño o fallan la validación de esquema Zod tras el parseo.

## 3. Integración con Backend para Niveles Oficiales
- [ ] Implementa la conexión con el endpoint `POST /api/v1/levels` del backend en Go.
- [ ] Envía el payload JSON estructurado, incluyendo `section_id`, `template_type`, `difficulty`, `color`, y `content` (el cual contiene la configuración específica del minijuego).
- [ ] Muestra notificaciones de éxito o error al administrador tras la respuesta HTTP.
