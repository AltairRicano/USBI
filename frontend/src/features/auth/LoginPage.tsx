import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore, type User } from '../../stores/useAuthStore';
import { useSyncStore } from '../../stores/useSyncStore';
import { apiClient } from '../../lib/apiClient';
import axios from 'axios';
import { persistSecureSession } from '../../lib/secureSession';

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

// ── Contratos del backend (Go dto.go) ────────────────────────────────────────

/**
 * Respuesta del backend en POST /api/v1/auth/login.
 * Coincide exactamente con auth.LoginResponse en Go.
 * Corrección: el backend retorna "access_token", no "token".
 */
interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

interface DeviceResponse {
  id: string;
}

/** RFC 7807 Problem Details */
interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const setDeviceId = useSyncStore((s) => s.setDeviceId);

  // Corrección: el campo se llama "email" en el backend, no "identifier"
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [notice, setNotice]     = useState<string | null>(() => {
    const state = location.state as { message?: string } | null;
    return state?.message ?? null;
  });
  const [loading, setLoading]   = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      const { data } = await apiClient.post<LoginResponse>('/auth/login', {
        email,    // ← Corrección: campo renombrado a "email" (contrato del backend)
        password,
      });

      login(data.user, data.access_token, data.refresh_token);
      const device = await apiClient.post<DeviceResponse>('/devices', {
        device_label: navigator.userAgent.slice(0, 80) || 'USBI Web',
        platform: window.__TAURI__ ? 'tauri' : 'web',
      });
      setDeviceId(device.data.id);
      await persistSecureSession({
        user: data.user,
        token: data.access_token,
        refreshToken: data.refresh_token,
        deviceId: device.data.id,
      });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        const problem = err.response.data as ProblemDetails;
        if (problem.type?.endsWith('/pending-tutor-consent')) {
          setError('La cuenta está pendiente de consentimiento de tutor. Completa el registro del tutor antes de iniciar sesión.');
        } else {
          setError(problem.detail ?? 'Error al iniciar sesión. Intenta de nuevo.');
        }
      } else {
        setError('No se pudo conectar con el servidor.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >


      <div
        className="w-full max-w-md rounded-2xl shadow-xl p-8 space-y-6"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        {/* Encabezado institucional */}
        <header className="text-center space-y-1">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
            USBI
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Universidad Veracruzana
          </p>
        </header>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          aria-label="Formulario de inicio de sesión"
          noValidate
        >
          <Input
            id="login-email"
            label="Correo institucional"
            type="email"
            autoComplete="email"
            placeholder="correo@uv.mx"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
            aria-required="true"
          />

          <Input
            id="login-password"
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
            aria-required="true"
            error={error ?? undefined}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="p-1 hover:text-[--color-foreground] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] rounded"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            }
          />

          {notice && (
            <p className="rounded border border-[--color-border] bg-white p-3 text-sm text-[--color-primary]">
              {notice}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold"
            style={{ backgroundColor: '#22c55e', color: 'white' }}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </Button>
        </form>

        <div className="text-center text-sm">
          <Link to="/register" style={{ color: 'var(--color-primary)' }} className="hover:underline">
            ¿No tienes cuenta? Regístrate
          </Link>
        </div>
      </div>
    </main>
  );
}
