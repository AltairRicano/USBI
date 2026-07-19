---
tipo: idea
categorías:
  - proyecto
estado: 💡 propuesta
fecha: 2026-07-09
---
**Conceptos y Tecnologías Base:** [[Proyecto de la USBI]], [[Requisitos - USBI]]

---

# Diccionario de Datos — Plataforma USBI

**Base de datos central institucional PostgreSQL 15, alojada en servidor on-premise de la USBI.**

Este diseño está rigurosamente calculado para no asfixiar nuestro servidor (1 vCPU, 1 GB de RAM, 20 GB de almacenamiento) y para dar cumplimiento estricto a las obligaciones de cifrado (RF5), los derechos ARCO (RF8), el principio de minimización y las bitácoras de auditoría exigidas por la normatividad de protección de datos.

## 1. Tablas de Identidad, Autenticación y Privacidad

### A. `users` (Usuarios)
Tabla central. Cumple con el cifrado en reposo sin saturar el vCPU mediante el uso de blind indexes para permitir el inicio de sesión eficiente sin requerir descifrados masivos.

*   `id` (UUID, Primary Key): Identificador único.
*   `full_name` (VARCHAR): Nombre completo del jugador o administrador. **[Riesgo Aceptado]**: Por necesidades operativas de búsqueda administrativa (ej. `ILIKE`), se almacena en texto estructurado en lugar de estar cifrado por columna. Su protección se compensa mediante cifrado de volumen del servidor, roles estrictos y bitácoras, asumiendo que no blinda ante queries directas maliciosas en el motor de DB.
*   `email` (BYTEA): Correo electrónico. **Cifrado con `pgcrypto`** (`PGP_SYM_ENCRYPT`).
*   `email_lookup_hash` (BYTEA): Blind index criptográfico (HMAC) para búsqueda exacta sin descifrar la tabla entera durante el login.
*   `phone` (BYTEA, Nullable): Teléfono. **Cifrado con `pgcrypto`**.
*   `phone_lookup_hash` (BYTEA, Nullable): Blind index criptográfico.
*   `password_hash` (VARCHAR): Almacena únicamente el hash irreversible generado con Argon2id.
*   `token_version` (INTEGER): Versión lógica de sesión usada para invalidar JWT emitidos previamente sin Redis. Se incrementa al suspender una cuenta, cerrar sesiones de forma forzada o atender un incidente de seguridad. El backend debe incluir esta versión en el token y compararla contra la base de datos en cada petición autenticada.
*   `is_adult` (BOOLEAN): Indicador de minimización de datos (reemplaza la fecha de nacimiento exacta). **NOTA:** Es estático. La transición a la mayoría de edad requerirá un proceso manual o de self-service.
*   `role` (VARCHAR): Control de acceso estricto. `CHECK (role IN ('player', 'admin', 'operator', 'director'))`. La DGTI-UV no requiere usuario operativo.
*   `privacy_notice_version` (VARCHAR): Versión del Aviso de Privacidad aceptada en el registro.
*   `privacy_notice_accepted_at` (TIMESTAMPTZ): Timestamp de aceptación.
*   `privacy_acceptance_hash` (BYTEA): Sello criptográfico que blinda el registro de aceptación.
*   `crypto_key_version` (SMALLINT): Versión del "Keyring" institucional. Gobierna tanto las llaves simétricas (AES-256-GCM) para cifrado como las llaves derivadas por separado para firmas HMAC, permitiendo la rotación simultánea de los algoritmos garantizando la separación de propósitos criptográficos.
*   `status` (VARCHAR): `CHECK (status IN ('active', 'suspended', 'pending_tutor_consent', 'deleted'))`.
*   `created_at` (TIMESTAMPTZ): Fecha de registro.
*   `updated_at` (TIMESTAMPTZ): Última modificación de perfil.
*   `last_login_at` (TIMESTAMPTZ, Nullable): Nulo hasta el primer login real. Fundamental para calcular inactividad.
*   `deleted_at` (TIMESTAMPTZ, Nullable): Timestamp de eliminación lógica temporal. Ante cancelación ARCO o baja definitiva, los campos identificables serán eliminados físicamente o sustituidos por valores anonimizados irreversibles.
*   `deletion_reason` (VARCHAR, Nullable): Motivo de la baja. Sólo podrá conservarse para trazabilidad administrativa, sin mantener datos identificables.

### B. `tutor_consents` (Consentimiento de Tutores)
Evidencia legal auditable requerida para los usuarios donde `is_adult = false`.
*   `id` (UUID, Primary Key)
*   `user_id` (UUID, Foreign Key a `users`)
*   `tutor_name` (BYTEA): **Cifrado con `pgcrypto`**.
*   `tutor_email` (BYTEA): **Cifrado con `pgcrypto`**.
*   `privacy_notice_version` (VARCHAR): Versión de aviso que autoriza el tutor.
*   `accepted_at` (TIMESTAMPTZ): Instante en que el tutor hace clic en el enlace de doble opt-in.
*   `acceptance_ip` (INET): IP de origen (evidencia legal).
*   `acceptance_user_agent` (TEXT): Dispositivo/navegador del tutor.
*   `consent_signature` (BYTEA): Sello HMAC que certifica la integridad del registro.
*   `crypto_key_version` (SMALLINT): Versión de la llave criptográfica usada para el sello y el cifrado.
*   `revoked_at` (TIMESTAMPTZ, Nullable): Nulo, a menos que el tutor revoque el consentimiento.

---

## 2. Tablas de Operación y Arquitectura Offline

### C. `devices` (Dispositivos Autorizados)
Control de sincronización multidisciplina, firmas HMAC y ejecución de Derechos ARCO (Cancelación / Borrado Remoto).
*   `id` (UUID, Primary Key)
*   `user_id` (UUID, Foreign Key a `users`)
*   `device_label` (VARCHAR): Nombre identificable por el usuario (ej. "PC Laboratorio 1").
*   `platform` (VARCHAR): `CHECK (platform IN ('web', 'tauri'))`.
*   `registered_at` (TIMESTAMPTZ)
*   `last_seen_at` (TIMESTAMPTZ)
*   `wipe_local_data` (BOOLEAN): Flag para inyectar orden de borrado forzoso de base de datos SQLite remota.
*   `revoked_at` (TIMESTAMPTZ, Nullable)
*   `UNIQUE (id, user_id)`: Soporta la llave foránea compuesta de `sync_events`, garantizando que un evento de sincronización sólo pueda referenciar un dispositivo perteneciente al mismo usuario.

### D. `sync_events` (Reemplaza a la antigua sync_queue)
Bandeja de entrada auditable para el mecanismo offline.
*   `id` (UUID, Primary Key)
*   `user_id` (UUID, Foreign Key a `users`)
*   `device_id` (UUID, parte de Foreign Key compuesta a `devices(id, user_id)`)
*   `payload` (JSONB): El paquete de progreso offline. **Regla estricta:** No deberá contener nombre, correo, teléfono, datos del tutor ni otros datos personales identificables; sólo registrará eventos técnicos de progreso, puntajes y metadatos de sincronización.
*   `payload_hash` (BYTEA): Hash del contenido recibido.
*   `hmac_signature` (BYTEA): Firma calculada en Tauri.
*   `crypto_key_version` (SMALLINT): Versión de la llave HMAC utilizada para firmar.
*   `hmac_valid` (BOOLEAN): Resultado de la validación criptográfica en Go (medida anti-trampas).
*   `status` (VARCHAR): `CHECK (status IN ('pending', 'processed', 'rejected'))`.
*   `received_at` (TIMESTAMPTZ)
*   `processed_at` (TIMESTAMPTZ, Nullable)
*   `rejection_reason` (TEXT, Nullable)

**Regla de integridad crítica:** `sync_events(device_id, user_id)` referencia `devices(id, user_id)`. Esto evita que un evento recibido para el usuario A pueda usar el `device_id` de un dispositivo registrado por el usuario B.

---

## 3. Tablas de Contenido Educativo (Con Soft-Delete)

### E. `sections` y `levels`
El progreso histórico del jugador no debe borrarse si se da de baja un nivel oficial.
*   **`sections`**: `id` (UUID, PK), `title` (VARCHAR), `color` (VARCHAR), `created_by_admin_id` (UUID, Nullable), `is_published` (BOOLEAN), `created_at` (TIMESTAMPTZ), `deleted_at` (TIMESTAMPTZ, Nullable), `archived_at` (TIMESTAMPTZ, Nullable).
*   **`levels`**: `id` (UUID, PK), `section_id` (UUID, FK a `sections`), `title` (VARCHAR), `color` (VARCHAR), `template_type` (VARCHAR), `content` (JSONB - almacena estructura y metadatos; multimedia en rutas locales, NUNCA binarios), `difficulty` (INTEGER 1-10), `is_published` (BOOLEAN), `created_by_admin_id` (UUID, Nullable), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ), `deleted_at` (TIMESTAMPTZ, Nullable), `deleted_by` (UUID, Nullable).

---

## 4. Tablas de Progreso y Rendición de Cuentas

### F. `player_progress`, `level_attempts` y `badges` (Estado Consolidado)
*   **`player_progress`**: `user_id` (UUID), `level_id` (UUID), `best_score` (INTEGER), `xp_total_for_level` (INTEGER), `attempts_count` (INTEGER), `first_completed_at` (TIMESTAMPTZ), `last_completed_at` (TIMESTAMPTZ). `UNIQUE (user_id, level_id)`.
*   **`level_attempts`**: Rastrea intentos diarios para aplicar RF15: experiencia completa en el primer intento elegible, 50% en los primeros dos reintentos diarios y 0% en reintentos posteriores. `id` (UUID), `user_id` (UUID), `level_id` (UUID), `attempt_date` (DATE), `attempt_number` (INTEGER), `xp_awarded` (INTEGER), `completed` (BOOLEAN), `created_at` (TIMESTAMPTZ). `UNIQUE (user_id, level_id, attempt_date, attempt_number)`. **NOTA DE CONCURRENCIA:** La resolución de `attempt_number` debe hacerse con un `SELECT ... FOR UPDATE` o en transacción serializable desde el backend para evitar colisiones en sincronizaciones offline concurrentes.
*   **`daily_streak`**: `user_id` (UUID), `activity_date` (DATE). `UNIQUE (user_id, activity_date)`.
*   **`badges` y `user_badges`**: Catálogo e historial de logros. `badges` (`id`, `name`, `xp_threshold`, `icon_key`). `user_badges` (`user_id`, `badge_id`, `earned_at`). `UNIQUE (user_id, badge_id)`.

### G. Bitácoras de Auditoría y Cumplimiento Normativo (Ley 251)
*   **`arco_requests`**: Control documental exigido. `id` (UUID), `user_id` (UUID, Nullable), `requester_type` (VARCHAR), `request_type` (VARCHAR - acceso, rectificación, cancelación, oposición), `received_at` (TIMESTAMPTZ), `resolved_at` (TIMESTAMPTZ, Nullable), `status` (VARCHAR), `handled_by` (UUID, Nullable), `response_summary` (TEXT, Nullable), `evidence_hash` (BYTEA).
*   **`security_incidents`**: Bitácora de incidentes. `id` (UUID), `detected_at` (TIMESTAMPTZ), `reported_at` (TIMESTAMPTZ, Nullable), `severity` (VARCHAR), `affected_scope` (TEXT), `description` (TEXT), `containment_actions` (TEXT), `resolved_at` (TIMESTAMPTZ, Nullable), `reported_to_cutai` (BOOLEAN), `notified_to_cutai_at` (TIMESTAMPTZ, Nullable), `notified_to_subjects_at` (TIMESTAMPTZ, Nullable), `evidence_hash` (BYTEA).
*   **`experience_history`**: Bitácora de eventos validados. `id` (UUID - **Nota:** Deberá usarse UUIDv7 generado desde la app para evitar fragmentación en escrituras masivas), `user_id` (UUID, Nullable), `level_id` (UUID), `event_type` (VARCHAR), `xp_gained` (INTEGER), `source` (VARCHAR - ej. 'online', 'offline_sync'), `verification_method` (VARCHAR - ej. 'online_direct', 'hmac_offline'). `CHECK ( (source = 'online' AND verification_method = 'online_direct') OR (source = 'offline_sync' AND verification_method = 'hmac_offline') )`. `sync_event_id` (UUID, Nullable), `created_at` (TIMESTAMPTZ). **Regla append-only:** no admite `UPDATE` ni `DELETE`, salvo la actualización automática de `user_id` a `NULL` por pseudonimización documental.
*   **`admin_audit_log`**: Trazabilidad de operaciones sensibles. `id` (UUID, PK), `actor_user_id` (UUID), `action` (VARCHAR), `entity_type` (VARCHAR), `entity_id` (UUID, Nullable), `before_state` (JSONB), `after_state` (JSONB), `ip_address` (INET), `user_agent` (TEXT), `created_at` (TIMESTAMPTZ). **Regla estricta:** `before_state` y `after_state` NO deberán almacenar datos personales identificables en texto plano; registrarán únicamente cambios administrativos, identificadores técnicos o hashes de evidencia. **Regla append-only:** no admite `UPDATE` ni `DELETE`, salvo la actualización automática de `actor_user_id` a `NULL` por pseudonimización documental.

---

## 5. Reglas de Integridad y Cumplimiento Normativo

### A. Eliminación de Usuarios (ARCO) y Reglas de Llaves Foráneas (FK)
Para garantizar la integridad y el cumplimiento, el sistema procederá de la siguiente manera ante una Cancelación ARCO o purga:
1. **Borrado Funcional hacia el Usuario (`ON DELETE CASCADE`):** Se aplicará exclusivamente de arriba hacia abajo para el usuario sobre datos operativos (`devices`, `sync_events`, progreso de juego).
2. **Conservación de Historial Académico (`ON DELETE RESTRICT`):** Se aplicará de abajo hacia arriba para prohibir que la eliminación de un catálogo oficial (`levels`, `sections`, `badges`) destruya el historial y las calificaciones de los alumnos que lo jugaron.
3. **Pseudonimización Documental (`ON DELETE SET NULL` / Anonimización):** Para registros legales obligatorios (`arco_requests`, `admin_audit_log`, `experience_history`), los campos identificables serán eliminados físicamente o sustituidos por valores anonimizados irreversibles. El `user_id` foráneo se establecerá en `NULL`, preservando únicamente el registro administrativo de forma consistente y verificable.
4. **Ejecución en dos fases:** `status = 'deleted'` y `deleted_at` sólo representan el bloqueo lógico inmediato. Para cumplir RF8 y el mecanismo ARCO documentado, el backend debe ejecutar una rutina posterior de purga/pseudonimización que dispare las reglas `ON DELETE` y elimine o anonimice los datos identificables conforme al tipo de registro.

### B. Módulo Maker (Niveles Comunitarios)
El esquema **no contiene tablas** para alojar niveles comunitarios del Maker, cumpliendo con la estipulación legal de que el servidor no procesa ni aloja estos JSON.

### C. Índices de Rendimiento
Para soportar una volumetría de **10,000 usuarios registrados históricos, con concurrencia operativa validada mediante pruebas de carga**, el esquema garantiza un acceso de alta velocidad mediante índices B-Tree explícitos, restricciones `UNIQUE` y llaves primarias compuestas. Los índices específicos a construir son:
*   `CREATE INDEX ON sync_events(user_id, status);`
*   `CREATE INDEX ON experience_history(user_id);`
*   `CREATE INDEX ON admin_audit_log(actor_user_id);`
*   `ALTER TABLE devices ADD CONSTRAINT uq_devices_id_user UNIQUE (id, user_id);`
*   `CREATE UNIQUE INDEX users_email_lookup_active_idx ON users(email_lookup_hash) WHERE deleted_at IS NULL;`
*   `CREATE UNIQUE INDEX users_phone_lookup_active_idx ON users(phone_lookup_hash) WHERE phone_lookup_hash IS NOT NULL AND deleted_at IS NULL;`
*   *(Nota: Se generan automáticamente 8 índices adicionales explícitos sobre las llaves foráneas de operaciones masivas como `devices.user_id`, `sync_events.device_id`, etc., para prevenir escaneos secuenciales fatales durante purgas de tipo ON DELETE CASCADE).*
> *(Nota: Los accesos de lectura rápida para las tablas `player_progress`, `daily_streak` y `level_attempts` quedan nativamente cubiertos por los índices B-Tree de sus respectivas llaves primarias y restricciones UNIQUE).*
