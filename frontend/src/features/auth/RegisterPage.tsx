import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiClient } from '../../lib/apiClient';
import axios from 'axios';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isAdult, setIsAdult] = useState(false);
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
    if (!isAdult) {
      setError('Debes confirmar tu mayoría de edad para continuar o seguir el proceso correspondiente.');
      return;
    }
    if (!privacyAccepted) {
      setError('Debes aceptar el Aviso de Privacidad.');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/auth/register', {
        full_name: fullName,
        email,
        password,
        is_adult: isAdult,
        privacy_notice_version: 'v1.0'
      });

      navigate('/login', { state: { message: 'Registro exitoso. Ahora puedes iniciar sesión.' } });
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        const problem = err.response.data as ProblemDetails;
        setError(problem.detail ?? 'Error al registrar la cuenta.');
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
        <header className="text-center space-y-1">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
            Registro USBI
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Crea tu cuenta institucional
          </p>
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
            type="password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
          />

          <Input
            id="reg-confirm-password"
            label="Confirmar contraseña"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.currentTarget.value)}
            required
            error={error ?? undefined}
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

            <label className="flex items-start space-x-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 min-w-touch min-h-touch"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
              />
              <span style={{ color: 'var(--color-muted)' }}>
                He leído y acepto el <a href="/privacidad" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }} className="underline">Aviso de Privacidad</a>.
              </span>
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Registrando...' : 'Registrar cuenta'}
          </Button>
        </form>
        
        <div className="text-center text-sm">
          <Link to="/login" style={{ color: 'var(--color-primary)' }} className="hover:underline">
            ¿Ya tienes cuenta? Inicia sesión
          </Link>
        </div>
      </div>
    </main>
  );
}
