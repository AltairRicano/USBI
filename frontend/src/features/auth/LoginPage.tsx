import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore, type User } from '../../stores/useAuthStore';
import { apiClient } from '../../lib/apiClient';
import axios from 'axios';

// ── Contratos del backend (Go dto.go) ────────────────────────────────────────

/**
 * Respuesta del backend en POST /api/v1/auth/login.
 * Coincide exactamente con auth.LoginResponse en Go.
 * Corrección: el backend retorna "access_token", no "token".
 */
interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
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

  // Corrección: el campo se llama "email" en el backend, no "identifier"
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data } = await apiClient.post<LoginResponse>('/auth/login', {
        email,    // ← Corrección: campo renombrado a "email" (contrato del backend)
        password,
      });

      // Corrección: usar data.access_token (no data.token)
      login(data.user, data.access_token);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        const problem = err.response.data as ProblemDetails;
        setError(problem.detail ?? 'Error al iniciar sesión. Intenta de nuevo.');
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
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
            aria-required="true"
            error={error ?? undefined}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
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
