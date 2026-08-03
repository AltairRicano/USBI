import type { User } from '../stores/useAuthStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useSyncStore } from '../stores/useSyncStore';
import { StoredSessionSchema } from './schema';

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
  const raw = await store.get('session');
  if (!raw) return;

  // Zero Trust: usbi-session.json vive en el filesystem del usuario, fuera
  // del control del backend. Validar la forma real antes de confiar en ella
  // evita que datos corruptos o manipulados (p. ej. un role inyectado)
  // pueblen el estado de autenticación de la app. Ante cualquier forma
  // inesperada, se descarta la sesión completa en vez de usarla a medias.
  const parsed = StoredSessionSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('[secureSession] usbi-session.json con forma inesperada, descartando sesión:', parsed.error.issues);
    await clearSecureSession();
    return;
  }

  const session: StoredSession = parsed.data;
  useAuthStore.getState().login(session.user, session.token, session.refreshToken);
  useSyncStore.getState().setDeviceId(session.deviceId);
}

export async function clearSecureSession(): Promise<void> {
  const store = await loadSessionStore();
  if (!store) return;
  await store.delete('session');
  await store.save();
}
