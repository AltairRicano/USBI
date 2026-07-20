import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';
import { useSyncStore } from '../stores/useSyncStore';
import { persistSecureSession, clearSecureSession } from './secureSession';

// ── Configuración base ────────────────────────────────────────────────────────
const apiBaseURL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export const apiClient = axios.create({
  baseURL: apiBaseURL,
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ── Interceptor de request: inyecta JWT ──────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Interceptor de response: maneja 401/403 (Problem Details RFC 7807) ───────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const originalRequest = error.config;

      if (status === 401 && originalRequest && !(originalRequest as { _retry?: boolean })._retry) {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          try {
            (originalRequest as { _retry?: boolean })._retry = true;
            const { data } = await axios.post<{
              access_token: string;
              refresh_token: string;
              user: import('../stores/useAuthStore').User;
            }>(`${apiBaseURL}/auth/refresh`, { refresh_token: refreshToken });
            useAuthStore.getState().login(data.user, data.access_token, data.refresh_token);
            await persistSecureSession({
              user: data.user,
              token: data.access_token,
              refreshToken: data.refresh_token,
              deviceId: useSyncStore.getState().deviceId,
            });
            originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
            return apiClient(originalRequest);
          } catch {
            useAuthStore.getState().logout();
            await clearSecureSession();
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          }
        }
      }

      if (status === 401 || status === 403) {
        // Sesión expirada o sin permisos → limpiar estado y redirigir
        useAuthStore.getState().logout();
        await clearSecureSession();
        // React Router manejará la redirección a /login desde ProtectedRoute
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);
