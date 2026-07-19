# Propuesta de Arquitectura para el Proyecto USBI

Esta propuesta detalla el stack tecnológico recomendado por Antigravity para el desarrollo de la aplicación de la USBI (Web y Escritorio sincronizados), optimizada para un servidor con restricciones estrictas de almacenamiento (20 GB en producción) y con soporte completo para funcionamiento sin conexión (*Offline-First*).

---

## 🛠️ Stack Tecnológico Propuesto

### 1. Frontend (Común para Web y Escritorio)
* **Tecnologías:** React + TypeScript + Vite + Vanilla CSS
* **Base de Datos Local:** Dexie.js (Wrapper de IndexedDB)
* **Cómo se usará:**
  * Se diseñará la interfaz completa con **React** y **TypeScript** para un tipado seguro de los datos de los usuarios.
  * Los estilos y micro-animaciones (barras de progreso de XP, efectos visuales al subir de nivel) se construirán con **Vanilla CSS** para asegurar compatibilidad total y rendimiento de renderizado en GPU.
  * **Dexie.js** gestionará una base de datos local en el navegador o ventana de Tauri que almacenará **únicamente** los datos del usuario logueado en ese dispositivo.
  * Cuando el usuario gane XP u obtenga una racha sin internet, la aplicación actualizará `Dexie.js` y añadirá la acción a una cola local (*Outbox*).
* **Por qué:**
  * Permite escribir la lógica visual una sola vez y empaquetarla tanto para la web como para el instalable de escritorio.
  * IndexedDB no requiere instalación de software en la máquina cliente y tiene almacenamiento virtualmente ilimitado en el navegador/Tauri.

---

### 2. Backend (Servidor)
* **Tecnologías:** Go (Golang) + Chi Router
* **Cómo se usará:**
  * Go se encargará de levantar una API REST ligera e increíblemente rápida en el puerto de producción.
  * Recibirá las solicitudes de sincronización de la aplicación de React y procesará las colas de acciones offline que los clientes envíen al recuperar conexión.
  * Utilizará **Chi** como enrutador HTTP minimalista para manejar las rutas y middlewares (como autenticación y límites de peticiones).
* **Por qué:**
  * **Ahorro de espacio extremo:** Al compilarse a código máquina nativo, todo el servidor es un único archivo binario de **~15-20 MB**. Evita subir entornos pesados como Node.js y la carpeta `node_modules` (que usualmente superan los 500 MB y llegan a gigabytes tras compilaciones locales).
  * **Rendimiento:** Consume apenas 15 MB de RAM bajo carga de producción.

---

### 3. Base de Datos Centralizada (Nube)
* **Tecnologías:** Neon.tech (PostgreSQL Serverless)
* **Cómo se usará:**
  * Almacenará el estado oficial y global de todos los usuarios (perfiles, rachas históricas, tablas de clasificación, registro de niveles).
  * Go se conectará directamente a ella mediante el driver seguro `pgx`.
* **Por qué:**
  * **0 MB de consumo en el servidor de producción:** Toda la carga de almacenamiento de base de datos se delega a la nube.
  * PostgreSQL es el estándar relacional de la industria, garantizando integridad referencial para el sistema de niveles y usuarios.
  * La plataforma es serverless, lo que significa que escala automáticamente y ofrece un plan gratuito sumamente generoso.

---

### 4. Empaquetador de Escritorio
* **Tecnología:** Tauri (v2)
* **Cómo se usará:**
  * Tauri tomará el directorio estático generado al compilar el proyecto de React (`dist/`) y lo envolverá en una ventana de escritorio nativa del sistema operativo.
* **Por qué:**
  * Genera binarios de solo **~10 MB** (comparado con los 100 MB+ de Electron).
  * Consume una fracción diminuta de memoria RAM al usar el motor web nativo del sistema operativo en lugar de embeber un navegador Chromium completo.

---

## 🔄 Mecanismo de Sincronización Offline-First

1. **Estado Conectado (Online):** React interactúa con la API de Go y actualiza simultáneamente la base de datos local y el servidor en tiempo real.
2. **Estado Desconectado (Offline):** La aplicación detecta la pérdida de internet, pero permite al usuario seguir acumulando XP y rachas. Los datos se guardan temporalmente en `Dexie.js` y se encolan.
3. **Reconexión:** Al detectar red (`navigator.onLine`), la app procesa la cola y la envía en un solo paquete (*batch*) a la API de Go. Go valida la secuencia de eventos, los inserta de manera transaccional en `Neon.tech` y devuelve al cliente el estado definitivo.
