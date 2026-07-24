import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../lib/apiClient';
import { useNavigate } from 'react-router-dom';
import type { SectionDTO, SectionsResponse } from '../content/types';
import { clearSecureSession } from '../../lib/secureSession';
import { useSyncStore } from '../../stores/useSyncStore';

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const setDeviceId = useSyncStore((s) => s.setDeviceId);
  const navigate = useNavigate();
  const { theme, setTheme } = useSettingsStore();
  const canManageContent = user?.role === 'admin' || user?.role === 'operator' || user?.role === 'director';

  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const sectionsResp = await apiClient.get<SectionsResponse>('/sections');
      return {
        sections: sectionsResp.data.items,
      };
    },
  });
  const sections: SectionDTO[] = dashboardQuery.data?.sections ?? [];
  const error = dashboardQuery.isError ? 'No se pudo cargar el contenido oficial.' : null;

  async function handleLogout() {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      logout();
      setDeviceId(null);
      await clearSecureSession();
    }
  }

  return (
    <main className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
              Bienvenido, {user?.full_name}
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              Rol: {user?.role}
            </p>
          </div>
          <div className="flex items-center gap-4">

            <Button variant="outline" size="sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
              Perfil
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/arco')}>
              ARCO
            </Button>
            {canManageContent && (
              <Button variant="primary" size="sm" onClick={() => navigate('/admin')}>
                Admin
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>
        </header>

        {error && <p className="rounded border border-[--color-error] bg-[--color-card] p-3 text-[--color-error]">{error}</p>}

        <section className="rounded-lg bg-[--color-card] text-[--color-text-card] p-6 shadow-sm" aria-label="Secciones oficiales">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Secciones oficiales</h2>
            {canManageContent && (
              <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
                Crear contenido
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => (
              <article key={section.id} className="rounded-lg border border-[--color-border] bg-[--color-card] text-[--color-text-card] p-5">
                <div className="mb-4 h-2 rounded" style={{ backgroundColor: section.color }} />
                <h3 className="text-lg font-bold">{section.title}</h3>
                {section.description && (
                  <p className="mb-4 text-sm text-[--color-muted]">{section.description}</p>
                )}
                <Button size="sm" onClick={() => navigate(`/sections/${section.id}`)}>
                  Ver niveles
                </Button>
              </article>
            ))}
            {sections.length === 0 && (
              <p className="rounded-lg border border-[--color-border] bg-[--color-card] p-5 text-[--color-muted]">
                No hay secciones publicadas.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

