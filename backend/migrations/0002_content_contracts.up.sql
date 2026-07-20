-- Migration: 0002_content_contracts.up.sql
-- Purpose: enforce the canonical official USBI template_type vocabulary for new data.

ALTER TABLE levels
    ADD CONSTRAINT levels_template_type_check
    CHECK (
        template_type IN (
            'trivia',
            'puzzle',
            'word_search',
            'fake_news',
            'crossword',
            'memory',
            'snakes_ladders'
        )
    ) NOT VALID;
