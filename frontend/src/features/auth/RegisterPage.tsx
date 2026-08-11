import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { UsbiEmblem, Spinner } from '../../components/ui/Brand';
import { apiClient } from '../../lib/apiClient';
import axios from 'axios';
import { ZodError } from 'zod';
import { RegisterResponseSchema } from '../../lib/schema';

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

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
}

// La forma de la respuesta de /auth/register se valida en runtime con
// RegisterResponseSchema (ver ../../lib/schema.ts), no solo se tipa.

const privacyNoticeVersion = import.meta.env.VITE_PRIVACY_NOTICE_VERSION ?? 'v1.0';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isAdult, setIsAdult] = useState(false);
  const [tutorName, setTutorName] = useState('');
  const [tutorEmail, setTutorEmail] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!privacyAccepted) {
      setError('Debes aceptar el Aviso de Privacidad.');
      return;
    }
    if (!isAdult && (!tutorName || !tutorEmail)) {
      setError('Para registrar una cuenta de menor se requieren los datos del tutor.');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/auth/register', {
        full_name: fullName,
        email,
        password,
        is_adult: isAdult,
        privacy_notice_version: privacyNoticeVersion,
      });
      const data = RegisterResponseSchema.parse(response.data);

      if (data.status === 'pending_tutor_consent') {
        await apiClient.post('/auth/tutor-consent', {
          user_id: data.user_id,
          tutor_name: tutorName,
          tutor_email: tutorEmail,
          privacy_notice_version: privacyNoticeVersion,
          registration_token: data.registration_token,
        });
        navigate('/login', {
          state: {
            message:
              'Registro recibido. Enviamos un correo de verificación al tutor. ' +
              'La cuenta se activará cuando el tutor confirme el consentimiento desde ese correo.',
          },
        });
        return;
      }

      navigate('/login', { state: { message: 'Registro exitoso. Ahora puedes iniciar sesión.' } });
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        const problem = err.response.data as ProblemDetails;
        setError(problem.detail ?? 'Error al registrar la cuenta.');
      } else if (err instanceof ZodError) {
        console.error('[RegisterPage] Respuesta de /auth/register con forma inesperada:', err.issues);
        setError('El servidor respondió de forma inesperada. Intenta de nuevo más tarde.');
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
        className="w-full max-w-md overflow-hidden rounded-2xl shadow-xl"
        style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text-card)' }}
      >
        {/* Franja institucional (azul UV → verde UV) */}
        <div
          aria-hidden="true"
          className="h-1.5 w-full"
          style={{ background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))' }}
        />

        <div className="space-y-6 p-8">
        <header className="flex flex-col items-center gap-3 text-center">
          <UsbiEmblem />
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
              Registro USBI
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              Crea tu cuenta institucional
            </p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            id="reg-fullname"
            label="Nombre completo"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.currentTarget.value)}
            required
          />

          <Input
            id="reg-email"
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
          />

          <Input
            id="reg-password"
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
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

          <Input
            id="reg-confirm-password"
            label="Confirmar contraseña"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.currentTarget.value)}
            required
            rightIcon={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="p-1 hover:text-[--color-foreground] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] rounded"
              >
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            }
          />

          <div className="space-y-2 pt-2">
            <label className="flex items-start space-x-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 min-w-touch min-h-touch"
                checked={isAdult}
                onChange={(e) => setIsAdult(e.target.checked)}
              />
              <span style={{ color: 'var(--color-muted)' }}>
                Confirmo que soy mayor de edad (Ley 251)
              </span>
            </label>

            {!isAdult && (
              <div className="space-y-3 rounded-lg border border-[--color-border] p-3">
                <Input
                  id="reg-tutor-name"
                  label="Nombre del tutor"
                  type="text"
                  value={tutorName}
                  onChange={(e) => setTutorName(e.currentTarget.value)}
                  required={!isAdult}
                />
                <Input
                  id="reg-tutor-email"
                  label="Correo del tutor"
                  type="email"
                  value={tutorEmail}
                  onChange={(e) => setTutorEmail(e.currentTarget.value)}
                  required={!isAdult}
                />
              </div>
            )}

            <label className="flex items-start space-x-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 min-w-touch min-h-touch"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
              />
              <span style={{ color: 'var(--color-muted)' }}>
                He leído y acepto el <Link to="/privacidad" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }} className="underline">Aviso de Privacidad</Link>.
              </span>
            </label>
          </div>

          {/* Error a nivel de formulario (validación combinada / servidor). */}
          {error && (
            <p
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-2 rounded-lg border p-3 text-sm"
              style={{
                borderColor: 'var(--color-error)',
                color: 'var(--color-error)',
                backgroundColor: 'color-mix(in srgb, var(--color-error) 8%, transparent)',
              }}
            >
              <span aria-hidden="true">⚠</span>
              <span>{error}</span>
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full font-bold"
            disabled={loading}
            aria-busy={loading}
          >
            {loading && <Spinner />}
            {loading ? 'Registrando…' : 'Registrar'}
          </Button>
        </form>
        
        <div className="text-center text-sm">
          {/* inline-flex + padding lets min-height (WCAG 2.5.5, C6) apply — a
              plain inline <a> ignores min-height entirely. */}
          <Link
            to="/login"
            style={{ color: 'var(--color-primary)' }}
            className="inline-flex items-center justify-center py-2 hover:underline"
          >
            ¿Ya tienes cuenta? Inicia sesión
          </Link>
        </div>
        </div>
      </div>
    </main>
  );
}
