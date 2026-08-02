-- Migration: 0011_schema_hardening.up.sql
-- Purpose: close the schema-integrity gaps from audit finding A8.

-- 0002 added levels_template_type_check as NOT VALID and it was never validated,
-- so pre-0002 rows were never checked. The application only ever writes the 7
-- canonical template types, so validating now is safe and makes the constraint
-- trustworthy going forward.
ALTER TABLE levels VALIDATE CONSTRAINT levels_template_type_check;

-- arco_requests.status had no CHECK (unlike users.status / sync_events.status).
-- The service only writes these three values.
ALTER TABLE arco_requests
    ADD CONSTRAINT arco_requests_status_check
    CHECK (status IN ('pending', 'resolved', 'rejected'));

-- security_incidents.severity had no CHECK; bound it to the accepted vocabulary
-- (kept in sync with internal/incidents validSeverities).
ALTER TABLE security_incidents
    ADD CONSTRAINT security_incidents_severity_check
    CHECK (severity IN ('low', 'medium', 'high', 'critical'));
