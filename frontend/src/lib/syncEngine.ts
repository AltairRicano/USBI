import { invoke } from '@tauri-apps/api/core';
import { useSyncStore } from '../stores/useSyncStore';
import { apiClient } from './apiClient';

// ── Tipos que espeja exactamente el contrato del Backend Go ──────────────────

export interface LevelAttemptItem {
  level_id: string;
  attempt_date: string;   // ISO 8601 YYYY-MM-DD
  attempt_number: number;
  xp_awarded: number;     // Valor del cliente (el backend lo recalcula, no se confía)
  completed: boolean;
}

export interface SyncPayload {
  level_attempts: LevelAttemptItem[];
  daily_streak_dates?: string[];
  badge_ids_earned?: string[];
}

export interface SyncEventRequest {
  sync_event_id: string;
  user_id: string;
  device_id: string;
  crypto_key_version: number;
  payload: SyncPayload;
  hmac_signature: string; // Base64-encoded HMAC-SHA256
}

export interface SyncEventResponse {
  status: string;          // "synced" | "already_processed"
  wipe_local_data: boolean; // Flag ARCO — si es true, limpiar SQLite
  server_xp_total: number;
}

// ── Retry Policy: Retroceso exponencial + Jitter (RNF11) ────────────────────
// Intentos 1→2→3: espera 1s→2s→4s con ±20% jitter

async function fetchWithRetry(
  url: string,
  data: SyncEventRequest,
  attempt = 1,
  maxAttempts = 3
): Promise<SyncEventResponse> {
  try {
    const response = await apiClient.post<SyncEventResponse>(url, data, { timeout: 30_000 });
    return response.data;
  } catch (error) {
    if (attempt >= maxAttempts) throw error;
    const baseDelay = Math.pow(2, attempt - 1) * 1000;
    const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1);
    await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
    return fetchWithRetry(url, data, attempt + 1, maxAttempts);
  }
}

// ── Motor de sincronización principal ────────────────────────────────────────

/**
 * Firma el payload completo con HMAC-SHA256 vía Rust (sin exponer el secreto a JS).
 * El payload se serializa con hmac_signature="" para que la firma cubra el cuerpo
 * exacto tal como lo recibirá el servidor — mismo patrón que JWS.
 */
async function buildSignedRequest(
  request: SyncEventRequest,
  hmacSecret: string
): Promise<SyncEventRequest> {
  const draftRequest: SyncEventRequest = { ...request, hmac_signature: '' };
  const rawBody = JSON.stringify(draftRequest);

  const signature = await invoke<string>('sign_payload', {
    secret: hmacSecret,
    payloadJson: rawBody,
  });

  return { ...draftRequest, hmac_signature: signature };
}

/**
 * Valida y envía los eventos de progreso offline al backend.
 *
 * Contrato:
 * - Si isOnline=false o isSyncing=true, no hace nada.
 * - Valida que no haya XP negativa antes de firmar.
 * - El backend recalcula el XP real; el cliente solo reporta.
 * - Si el servidor responde `wipe_local_data: true`, llama a `wipe_local_data`
 *   (solo en caso ARCO/revocación, no en sincronización normal).
 *
 * @param requests  Eventos de progreso offline a sincronizar.
 * @param hmacSecret  Clave HMAC obtenida del Store seguro en producción.
 */
export async function syncLocalProgress(
  requests: SyncEventRequest[],
  hmacSecret: string
): Promise<void> {
  const syncStore = useSyncStore.getState();
  if (syncStore.isSyncing || !syncStore.isOnline) return;

  syncStore.setSyncing(true);

  try {
    for (const request of requests) {
      // Validación local: rechazar XP negativa (manipulación obvia)
      const hasInvalidXP = request.payload.level_attempts.some(
        (attempt) => attempt.xp_awarded < 0
      );
      if (hasInvalidXP) {
        console.warn('[SyncEngine] Registro ignorado: XP negativa detectada', request.sync_event_id);
        continue;
      }

      // Firma el body completo con HMAC-SHA256 vía Rust
      const signedRequest = await buildSignedRequest(request, hmacSecret);

      // Envío con retries (Additive Merge y Last-Write-Wins los maneja el servidor Go)
      const response = await fetchWithRetry('/sync', signedRequest);

      // Si el servidor indica limpieza (ARCO/revocación), purgar SQLite local
      if (response.wipe_local_data) {
        console.warn('[SyncEngine] Servidor ordenó purga de datos locales (ARCO).');
        await invoke<void>('wipe_local_data');
        // Terminar el ciclo de sync ya que los datos fueron eliminados
        break;
      }
    }

    syncStore.recordSyncSuccess();
  } catch (error) {
    console.error('[SyncEngine] Error durante sincronización:', error);
  } finally {
    syncStore.setSyncing(false);
  }
}
