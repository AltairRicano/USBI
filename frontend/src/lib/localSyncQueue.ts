import Database from '@tauri-apps/plugin-sql';
import { useAuthStore } from '../stores/useAuthStore';
import { useSyncStore } from '../stores/useSyncStore';
import { syncLocalProgress, type SyncEventRequest, type SyncPayload } from './syncEngine';

const DB_URL = 'sqlite:usbi_local.db';

let dbPromise: Promise<Database> | null = null;

async function getDB(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}

export async function initLocalSyncQueue(): Promise<void> {
  if (!window.__TAURI__) return;
  const db = await getDB();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  const rows = await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM sync_queue');
  useSyncStore.getState().setPendingCount(rows[0]?.count ?? 0);
}

export async function enqueueProgress(payload: SyncPayload): Promise<void> {
  if (!window.__TAURI__) return;
  const user = useAuthStore.getState().user;
  const deviceId = useSyncStore.getState().deviceId;
  if (!user || !deviceId) return;

  await initLocalSyncQueue();
  const db = await getDB();
  await db.execute(
    'INSERT INTO sync_queue (id, user_id, device_id, payload, created_at) VALUES ($1, $2, $3, $4, $5)',
    [crypto.randomUUID(), user.id, deviceId, JSON.stringify(payload), new Date().toISOString()]
  );
  const rows = await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM sync_queue');
  useSyncStore.getState().setPendingCount(rows[0]?.count ?? 0);
}

export async function syncLocalQueue(): Promise<void> {
  if (!window.__TAURI__) return;
  const user = useAuthStore.getState().user;
  const deviceId = useSyncStore.getState().deviceId;
  if (!user || !deviceId) return;

  await initLocalSyncQueue();
  const db = await getDB();
  const rows = await db.select<Array<{ id: string; payload: string }>>(
    'SELECT id, payload FROM sync_queue ORDER BY created_at ASC LIMIT 50'
  );
  if (rows.length === 0) return;

  const requests: SyncEventRequest[] = rows.map((row) => ({
    sync_event_id: row.id,
    user_id: user.id,
    device_id: deviceId,
    crypto_key_version: 1,
    payload: JSON.parse(row.payload) as SyncPayload,
    hmac_signature: '',
  }));

  const result = await syncLocalProgress(requests);
  const confirmedIDs = new Set(result.confirmedIds);
  if (confirmedIDs.size === 0) {
    const countRows = await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM sync_queue');
    useSyncStore.getState().setPendingCount(countRows[0]?.count ?? 0);
    return;
  }

  for (const row of rows) {
    if (confirmedIDs.has(row.id)) {
      await db.execute('DELETE FROM sync_queue WHERE id = $1', [row.id]);
    }
  }
  const countRows = await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM sync_queue');
  useSyncStore.getState().setPendingCount(countRows[0]?.count ?? 0);
}

export function buildAttemptPayload(levelID: string, completed: boolean): SyncPayload {
  const today = new Date().toISOString().slice(0, 10);
  return {
    level_attempts: [
      {
        level_id: levelID,
        attempt_date: today,
        attempt_number: 1,
        xp_awarded: 0,
        completed,
      },
    ],
    daily_streak_dates: completed ? [today] : [],
  };
}
