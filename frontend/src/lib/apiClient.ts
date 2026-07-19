import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

// ── Configuración base ────────────────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: 'http://192.168.1.210:8088/api/v1',
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
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 401 || status === 403) {
        // Sesión expirada o sin permisos → limpiar estado y redirigir
        useAuthStore.getState().logout();
        // React Router manejará la redirección a /login desde ProtectedRoute
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);
