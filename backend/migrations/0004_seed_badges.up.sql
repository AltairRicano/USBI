-- Migration: 0004_seed_badges.up.sql
-- Purpose: baseline XP badges used by the MVP progress recalculation.

INSERT INTO badges (id, name, xp_threshold, icon_key) VALUES
    ('018fd2b4-3f0d-7c00-8000-000000000101', 'Primeros pasos', 20, 'first_steps'),
    ('018fd2b4-3f0d-7c00-8000-000000000102', 'Explorador USBI', 60, 'explorer'),
    ('018fd2b4-3f0d-7c00-8000-000000000103', 'Constancia', 120, 'streak_builder'),
    ('018fd2b4-3f0d-7c00-8000-000000000104', 'Experto USBI', 240, 'expert')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    xp_threshold = EXCLUDED.xp_threshold,
    icon_key = EXCLUDED.icon_key;
