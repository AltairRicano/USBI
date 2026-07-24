import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../lib/apiClient';
import { persistSecureSession } from '../../lib/secureSession';
import { useAuthStore, type User } from '../../stores/useAuthStore';
import { useSyncStore } from '../../stores/useSyncStore';
import { useSettingsStore, type ColorBlindFilter } from '../../stores/useSettingsStore';
import { useNavigate } from 'react-router-dom';
import type { ProfileProgressResponse } from '../content/types';

export function ProfilePage() {
  const { user, token, refreshToken, updateUser } = useAuthStore();
  const deviceId = useSyncStore((state) => state.deviceId);
  const { colorBlindFilter, setColorBlindFilter } = useSettingsStore();
  const navigate = useNavigate();
  const [ageUpMessage, setAgeUpMessage] = useState<string | null>(null);
  const [ageUpError, setAgeUpError] = useState<string | null>(null);
  const [ageUpLoading, setAgeUpLoading] = useState(false);
  const progressQuery = useQuery({
    queryKey: ['profile-progress'],
    queryFn: async () => {
      const { data } = await apiClient.get<ProfileProgressResponse>('/profile/progress');
      return data;
    },
  });
  const progress = progressQuery.data ?? null;
  const error = progressQuery.isError ? 'No se pudo cargar el progreso.' : null;

  async function handleAgeUp() {
    if (!user || !token) return;
    setAgeUpLoading(true);
    setAgeUpError(null);
    setAgeUpMessage(null);
    try {
      await apiClient.post('/auth/age-up');
      const updatedUser: User = { ...user, is_adult: true, status: 'active' };
      updateUser(updatedUser);
      await persistSecureSession({ user: updatedUser, token, refreshToken, deviceId });
      setAgeUpMessage('Estatus actualizado. Los datos del tutor quedaron minimizados.');
    } catch (err) {
      setAgeUpError(errorMessage(err, 'No se pudo actualizar el estatus de mayoría de edad.'));
    } finally {
      setAgeUpLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Perfil y Progreso</h1>
            <p className="text-sm text-[--color-muted]">Avance oficial calculado por el backend.</p>
          </div>
          <Button variant="outline" size="sm">
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        </header>

        {error && <p className="rounded border border-[--color-error] bg-[--color-card] p-3 text-[--color-error]">{error}</p>}
        {ageUpError && <p className="rounded border border-[--color-error] bg-[--color-card] p-3 text-[--color-error]">{ageUpError}</p>}
        {ageUpMessage && <p className="rounded border border-[--color-border] bg-[--color-card] p-3 text-[--color-primary]">{ageUpMessage}</p>}

        {user && !user.is_adult && (
          <section className="rounded-lg bg-[--color-card] p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Confirmación de mayoría de edad</h2>
            <p className="mt-2 text-sm text-[--color-muted]">
              Al confirmar, el backend actualiza tu estatus y minimiza los datos del tutor asociados a la cuenta.
            </p>
            <Button className="mt-4" onClick={() => void handleAgeUp()} disabled={ageUpLoading}>
              {ageUpLoading ? 'Actualizando...' : 'Confirmar mayoría de edad'}
            </Button>
          </section>
        )}

        {progress && (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <Metric label="XP total" value={progress.total_xp} />
              <Metric label="Niveles completados" value={progress.completed_levels} />
              <Metric label="Intentos" value={progress.total_attempts} />
              <Metric label="Racha" value={progress.current_streak} />
            </section>

            <section className="rounded-lg bg-[--color-card] p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold">Insignias</h2>
              <div className="mb-6 flex flex-wrap gap-2">
                {(progress.badges ?? []).map((badge) => (
                  <span key={badge.id} className="rounded-full border border-[--color-border] px-3 py-1 text-sm">
                    {badge.name}
                  </span>
                ))}
                {(progress.badges ?? []).length === 0 && <p className="text-sm text-[--color-muted]">Aún no hay insignias.</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="rounded-lg border border-[--color-border] p-5 shadow-sm bg-[--color-card]">
                  <h3 className="text-lg font-bold mb-2">Filtro Visual</h3>
                  <p className="text-sm text-[--color-muted] mb-4">Ajusta los colores de la aplicación para mejorar tu experiencia visual.</p>
                  <select
                    value={colorBlindFilter}
                    onChange={(e) => setColorBlindFilter(e.target.value as ColorBlindFilter)}
                    className="w-full text-sm border rounded px-3 py-2 bg-white text-black border-gray-300 focus:outline-none focus-visible:ring-2"
                  >
                    <option value="none">Normal</option>
                    <option value="deuteranopia">Deuteranopía (Verde-Rojo)</option>
                    <option value="protanopia">Protanopía (Rojo-Verde)</option>
                    <option value="tritanopia">Tritanopía (Azul-Amarillo)</option>
                  </select>
                </div>

                <div className="rounded-lg border border-[--color-border] p-5 shadow-sm bg-[--color-card] flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold mb-2">Crea tu propio nivel</h3>
                    <p className="text-sm text-[--color-muted] mb-4">Accede al Maker Local para diseñar, probar y descargar tus propios niveles en formato JSON sin necesidad de publicarlos.</p>
                  </div>
                  <Button variant="primary" onClick={() => navigate('/maker')} className="w-full mt-4">
                    Abrir Maker Local
                  </Button>
                </div>

                <div className="rounded-lg border border-[--color-border] p-5 shadow-sm bg-[--color-card] flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold mb-2">Derechos ARCO y Quejas</h3>
                    <p className="text-sm text-[--color-muted] mb-4">Ejerce tus derechos ARCO (Acceso, Rectificación, Cancelación y Oposición) o presenta quejas sobre el servicio.</p>
                  </div>
                  <Button variant="outline" onClick={() => navigate('/arco')} className="w-full mt-4 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors">
                    Ir a Centro de Quejas
                  </Button>
                </div>
              </div>

              <h2 className="mb-4 text-xl font-semibold">Niveles jugados</h2>
              <div className="divide-y">
                {progress.levels.map((level) => (
                  <div key={level.level_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-semibold">{level.title}</p>
                      <p className="text-sm text-[--color-muted]">
                        {level.template_type} · XP {level.xp_total_for_level} · intentos {level.attempts_count}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Link to={`/levels/${level.level_id}/play`}>Jugar de nuevo</Link>
                    </Button>
                  </div>
                ))}
                {progress.levels.length === 0 && <p className="py-4 text-sm text-[--color-muted]">Aún no hay progreso oficial.</p>}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function errorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const detail = (err.response?.data as { detail?: string } | undefined)?.detail;
    return detail ?? fallback;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[--color-card] p-5 shadow-sm">
      <p className="text-sm text-[--color-muted]">{label}</p>
      <p className="text-3xl font-bold text-[--color-primary]">{value}</p>
    </div>
  );
}
