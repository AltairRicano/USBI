# Fase 1: Infraestructura y Base de Datos (Backend Core)

## 0. Variables de Entorno (Secrets)
- [ ] Asegura que `DATABASE_URL`, `HMAC_SECRET` y `JWT_SECRET` se administren estrictamente mediante variables de entorno o gestor de secretos, sin hardcodear.

## 1. Conexión a Base de Datos
- [ ] Configura la conexión a PostgreSQL usando `pgxpool` en Go.
- [ ] Asegura que no se utilice GORM; este es un requerimiento estricto para optimización de memoria (RAM).
- [ ] Extrae la URL de conexión desde la variable de entorno `DATABASE_URL`.
- [ ] Limita el pool de conexiones a un máximo de 100 concurrentes.
- [ ] Habilita el uso de PgBouncer para soportar el requisito de concurrencia RNF12 (servidor de 1GB de RAM).
- [ ] Implementa la función de inicialización `func InitDB(connString string) (*pgxpool.Pool, error)` en `internal/database/db.go`.

## 2. Docker Compose (Entorno de Desarrollo)
- [ ] Crea el archivo `docker-compose.yml` en la raíz del proyecto backend.
- [ ] Configura un contenedor con la imagen de PostgreSQL 15.
- [ ] Habilita la extensión `pgcrypto` mediante un script en la inicialización de la base de datos (ver Anexo A).
- [ ] Asegura que el entorno de desarrollo emule la arquitectura final (PostgreSQL como backend).

## 3. Migraciones y Esquema
- [ ] Emplea `golang-migrate/migrate` para gestionar el esquema de la base de datos.
- [ ] Crea el directorio `migrations/` en la raíz del backend.
- [ ] Ejecutar migraciones leyendo la estructura directamente de `Diccionario de datos - PostgreSQL On-Premise.md`. Queda prohibido deducir o inferir campos.
- [ ] Crea el archivo `000001_init_schema.up.sql`. No incluyas comandos CREATE TABLE en la documentación, léelos estricamente del diccionario.
- [ ] Omite campos no autorizados (ej. no inventes `total_xp` en la tabla `users`).
- [ ] Crea los índices únicos sobre `email_lookup_hash` y `phone_lookup_hash` en la tabla `users` para garantizar búsquedas deterministas, considerando registros eliminados (`deleted_at`).

## 4. Repositorios (Capa de Acceso a Datos)
- [ ] Define las interfaces de dominio aplicando el patrón `Repository`.
- [ ] Implementa el repositorio de usuarios en `internal/repository/postgres/user_repo.go`.
- [ ] Encripta campos sensibles (`email`, `phone`) al crear y modificar registros.
- [ ] Implementa la función de búsqueda por correo usando el campo `email_lookup_hash` y por teléfono con `phone_lookup_hash`.
- [ ] Aplica bloqueo pesimista (`FOR UPDATE`) en transacciones de sincronización y actualización de estado para prevenir colisiones (ver Anexo B).

## 5. Modelos de Dominio y Contratos (JSON)
- [ ] Define la estructura Go `User` en `internal/models/user.go` con las etiquetas JSON y tipos correspondientes al nuevo esquema (ver Anexo C).
- [ ] Asegura que los roles mapeados sean estrictamente `('player', 'admin', 'operator', 'director')`.
- [ ] Valida las respuestas de la API usando el esquema JSON exacto para el modelo `User` (ver Anexo D).

---

## Anexos Técnicos

### Anexo A: Docker Compose (PostgreSQL 15 + pgcrypto)
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: usbi_user
      POSTGRES_PASSWORD: usbi_password
      POSTGRES_DB: usbi_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql

volumes:
  pgdata:
```
**`init.sql` (Ejecutado al iniciar el contenedor):**
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Anexo B: Boilerplate Crítico (UPDATE con bloqueo pesimista)
```sql
-- Boilerplate Crítico: UPDATE con bloqueo pesimista (Row-Level Lock)
-- Usa FOR UPDATE para evitar colisiones cuando múltiples dispositivos sincronizan simultáneamente
BEGIN;

SELECT id, status, token_version 
FROM users 
WHERE id = $1 
FOR UPDATE;

UPDATE users 
SET 
    token_version = token_version + 1,
    status = $2,
    updated_at = NOW()
WHERE id = $1;

COMMIT;
```

### Anexo C: Estructura Go para User
```go
package models

import (
    "time"
    "github.com/google/uuid"
)

type User struct {
    ID                      uuid.UUID  `json:"id"`
    FullName                string     `json:"fullName"`
    Email                   []byte     `json:"-"`
    EmailLookupHash         []byte     `json:"-"`
    Phone                   []byte     `json:"-"`
    PhoneLookupHash         []byte     `json:"-"`
    PasswordHash            string     `json:"-"`
    TokenVersion            int        `json:"-"`
    IsAdult                 bool       `json:"isAdult"`
    Role                    string     `json:"role"` // 'player', 'admin', 'operator', 'director'
    PrivacyNoticeVersion    string     `json:"privacyNoticeVersion"`
    PrivacyNoticeAcceptedAt time.Time  `json:"privacyNoticeAcceptedAt"`
    PrivacyAcceptanceHash   []byte     `json:"-"`
    CryptoKeyVersion        int16      `json:"-"`
    Status                  string     `json:"status"`
    CreatedAt               time.Time  `json:"createdAt"`
    UpdatedAt               time.Time  `json:"updatedAt"`
    LastLoginAt             *time.Time `json:"lastLoginAt,omitempty"`
    DeletedAt               *time.Time `json:"deletedAt,omitempty"`
    DeletionReason          *string    `json:"deletionReason,omitempty"`
}
```

### Anexo D: Contrato JSON Schema (User)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "User",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "UUID v4 del usuario"
    },
    "fullName": {
      "type": "string",
      "description": "Nombre completo del usuario"
    },
    "isAdult": {
      "type": "boolean"
    },
    "role": {
      "type": "string",
      "enum": ["player", "admin", "operator", "director"]
    },
    "privacyNoticeVersion": {
      "type": "string"
    },
    "privacyNoticeAcceptedAt": {
      "type": "string",
      "format": "date-time"
    },
    "status": {
      "type": "string",
      "enum": ["active", "suspended", "deleted"]
    },
    "createdAt": {
      "type": "string",
      "format": "date-time"
    },
    "updatedAt": {
      "type": "string",
      "format": "date-time"
    },
    "lastLoginAt": {
      "type": "string",
      "format": "date-time"
    },
    "deletedAt": {
      "type": "string",
      "format": "date-time"
    },
    "deletionReason": {
      "type": "string"
    }
  },
  "required": [
    "id",
    "fullName",
    "isAdult",
    "role",
    "privacyNoticeVersion",
    "privacyNoticeAcceptedAt",
    "status",
    "createdAt",
    "updatedAt"
  ],
  "additionalProperties": false
}
```
