import { describe, expect, it } from 'vitest';
import { buildCanonicalSigningPayload, type SyncEventRequest } from './syncEngine';

describe('buildCanonicalSigningPayload', () => {
  it('is stable when technical event arrays change order', () => {
    const base = {
      sync_event_id: '018fd2b4-3f0d-7c00-8000-000000000001',
      user_id: '018fd2b4-3f0d-7c00-8000-000000000002',
      device_id: '018fd2b4-3f0d-7c00-8000-000000000003',
      crypto_key_version: 1,
      hmac_signature: '',
    };
    const reqA: SyncEventRequest = {
      ...base,
      payload: {
        level_attempts: [
          { level_id: '018fd2b4-3f0d-7c00-8000-000000000005', attempt_date: '2026-07-20', attempt_number: 1, xp_awarded: 0, completed: true },
          { level_id: '018fd2b4-3f0d-7c00-8000-000000000004', attempt_date: '2026-07-19', attempt_number: 1, xp_awarded: 0, completed: false },
        ],
        daily_streak_dates: ['2026-07-20', '2026-07-19'],
        badge_ids_earned: ['018fd2b4-3f0d-7c00-8000-000000000007', '018fd2b4-3f0d-7c00-8000-000000000006'],
      },
    };
    const reqB: SyncEventRequest = {
      ...base,
      payload: {
        level_attempts: [...reqA.payload.level_attempts].reverse(),
        daily_streak_dates: ['2026-07-19', '2026-07-20'],
        badge_ids_earned: ['018fd2b4-3f0d-7c00-8000-000000000006', '018fd2b4-3f0d-7c00-8000-000000000007'],
      },
    };

    expect(buildCanonicalSigningPayload(reqA)).toBe(buildCanonicalSigningPayload(reqB));
  });
});
