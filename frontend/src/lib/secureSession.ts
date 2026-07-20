import type { User } from '../stores/useAuthStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useSyncStore } from '../stores/useSyncStore';

interface StoredSession {
  user: User;
  token: string;
  refreshToken: string | null;
  deviceId: string | null;
}

async function loadSessionStore() {
  if (!window.__TAURI__) return null;
  const { Store } = await import('@tauri-apps/plugin-store');
  return Store.load('usbi-session.json', { defaults: {}, autoSave: true });
}

export async function persistSecureSession(session: StoredSession): Promise<void> {
  const store = await loadSessionStore();
  if (!store) return;
  await store.set('session', session);
  await store.save();
}

export async function restoreSecureSession(): Promise<void> {
  const store = await loadSessionStore();
  if (!store) return;
  const session = await store.get<StoredSession>('session');
  if (!session?.user || !session.token) return;
  useAuthStore.getState().login(session.user, session.token, session.refreshToken);
  useSyncStore.getState().setDeviceId(session.deviceId);
}

export async function clearSecureSession(): Promise<void> {
  const store = await loadSessionStore();
  if (!store) return;
  await store.delete('session');
  await store.save();
}
