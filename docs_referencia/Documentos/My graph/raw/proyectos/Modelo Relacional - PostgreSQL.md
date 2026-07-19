---
tipo: diagrama
categorías:
  - proyecto
  - arquitectura
estado: 💡 propuesta
fecha: 2026-07-09
---
**Conceptos y Tecnologías Base:** [[Proyecto de la USBI]], [[Requisitos - USBI]], [[Diccionario de datos - PostgreSQL On-Premise]], [[Base de datos cloud - PostgreSQL]]

# Modelo Relacional (Entity-Relationship) - PostgreSQL On-Premise

A continuación, se presenta la arquitectura relacional de las 15 tablas maestras del sistema, reflejando el diseño estricto de privacidad, auditoría y separación funcional.

```mermaid
erDiagram
    %% Identidad y Autenticación
    users {
        UUID id PK
        VARCHAR full_name
        BYTEA email "Cifrado"
        BYTEA email_lookup_hash
        BYTEA phone "Cifrado"
        BYTEA phone_lookup_hash
        VARCHAR password_hash
        INTEGER token_version
        BOOLEAN is_adult
        VARCHAR role
        VARCHAR status
        SMALLINT crypto_key_version
        TIMESTAMPTZ last_login_at
        TIMESTAMPTZ deleted_at
    }

    tutor_consents {
        UUID id PK
        UUID user_id FK
        BYTEA tutor_name "Cifrado"
        BYTEA tutor_email "Cifrado"
        TIMESTAMPTZ accepted_at
        BYTEA consent_signature
        SMALLINT crypto_key_version
    }

    %% Arquitectura Offline
    devices {
        UUID id PK
        UUID user_id FK
        UUID id_user_key UK "UNIQUE(id, user_id)"
        VARCHAR device_label
        VARCHAR platform
        BOOLEAN wipe_local_data
    }

    sync_events {
        UUID id PK
        UUID user_id FK
        UUID device_id FK "compuesta con user_id"
        JSONB payload
        BOOLEAN hmac_valid
        VARCHAR status
        SMALLINT crypto_key_version
    }

    %% Contenido Educativo
    sections {
        UUID id PK
        VARCHAR title
        VARCHAR color
        UUID created_by_admin_id FK
        BOOLEAN is_published
        TIMESTAMPTZ deleted_at
    }

    levels {
        UUID id PK
        UUID section_id FK
        VARCHAR title
        VARCHAR color
        VARCHAR template_type
        JSONB content
        INTEGER difficulty
        BOOLEAN is_published
        UUID created_by_admin_id FK
        UUID deleted_by FK
        TIMESTAMPTZ deleted_at
    }

    %% Progreso
    player_progress {
        UUID user_id PK, FK
        UUID level_id PK, FK
        INTEGER best_score
        INTEGER xp_total_for_level
        INTEGER attempts_count
    }

    level_attempts {
        UUID id PK
        UUID user_id FK
        UUID level_id FK
        DATE attempt_date
        INTEGER attempt_number
        INTEGER xp_awarded
    }

    daily_streak {
        UUID user_id PK, FK
        DATE activity_date PK
    }

    badges {
        UUID id PK
        VARCHAR name
        INTEGER xp_threshold
    }

    user_badges {
        UUID user_id PK, FK
        UUID badge_id PK, FK
        TIMESTAMPTZ earned_at
    }

    %% Auditoría
    arco_requests {
        UUID id PK
        UUID user_id FK
        VARCHAR requester_type
        VARCHAR request_type
        VARCHAR status
        UUID handled_by FK
    }

    security_incidents {
        UUID id PK
        VARCHAR severity
        TIMESTAMPTZ detected_at
        TEXT description
        BOOLEAN reported_to_cutai
    }

    experience_history {
        UUID id PK
        UUID user_id FK "SET NULL; append-only"
        UUID level_id FK
        VARCHAR event_type
        INTEGER xp_gained
        VARCHAR source
        VARCHAR verification_method
        UUID sync_event_id FK
    }

    admin_audit_log {
        UUID id PK
        UUID actor_user_id FK "SET NULL; append-only"
        VARCHAR action
        VARCHAR entity_type
        UUID entity_id
        JSONB before_state
        JSONB after_state
    }

    %% =======================
    %% Relaciones Lógicas
    %% =======================

    %% Identidad
    users ||--o| tutor_consents : "tiene"
    users ||--o{ devices : "registra"
    users ||--o{ sync_events : "genera"
    devices ||--o{ sync_events : "envía (device_id, user_id)"

    %% Contenido
    users |o--o{ sections : "crea (admin)"
    sections ||--o{ levels : "contiene"
    users |o--o{ levels : "crea (admin)"
    users |o--o{ levels : "elimina (admin)"

    %% Progreso (ON DELETE CASCADE funcional, RESTRICT en niveles)
    users ||--o{ player_progress : "logra"
    levels ||--o{ player_progress : "registra en"

    users ||--o{ level_attempts : "intenta"
    levels ||--o{ level_attempts : "intentado en"

    users ||--o{ daily_streak : "mantiene"

    users ||--o{ user_badges : "gana"
    badges ||--o{ user_badges : "otorga"

    %% Auditoría (ON DELETE SET NULL)
    users |o--o{ arco_requests : "solicita"
    users |o--o{ arco_requests : "atiende (admin)"

    users |o--o{ experience_history : "acumula"
    levels ||--o{ experience_history : "fuente de"
    sync_events |o--o{ experience_history : "valida"

    users |o--o{ admin_audit_log : "ejecuta"
```
