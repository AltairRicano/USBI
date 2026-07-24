import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../lib/apiClient';
import { useNavigate, NavigateFunction } from 'react-router-dom';
import type { SectionDTO, SectionsResponse, LevelsPageDTO, TemplateType } from '../content/types';
import { clearSecureSession } from '../../lib/secureSession';
import { useSyncStore } from '../../stores/useSyncStore';

function LocalContentSection({ navigate }: { navigate: NavigateFunction }) {
  const [localLevels, setLocalLevels] = useState<any[]>([]);

  useEffect(() => {
    const loadLocal = () => {
      const stored = localStorage.getItem('usbi_local_levels');
      if (stored) {
        setLocalLevels(JSON.parse(stored));
      }
    };
    loadLocal();
    window.addEventListener('storage', loadLocal);
    return () => window.removeEventListener('storage', loadLocal);
  }, []);

  const handleImport = async () => {
    try {
      if (window.__TAURI__) {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const { readTextFile } = await import('@tauri-apps/plugin-fs');
        const selected = await open({
          filters: [{ name: 'USBI Level', extensions: ['json'] }],
        });
        if (selected && typeof selected === 'string') {
          const content = await readTextFile(selected);
          processImportedJSON(content);
        }
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e: any) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (re) => {
            if (typeof re.target?.result === 'string') {
              processImportedJSON(re.target.result);
            }
          };
          reader.readAsText(file);
        };
        input.click();
      }
    } catch (e) {
      console.error('Error importing:', e);
      alert('Hubo un error al importar el archivo.');
    }
  };

  const processImportedJSON = (jsonStr: string) => {
    try {
      // Validar 5MB de tamaño (string length es buena aproximación para bytes en utf-8 ascii)
      if (jsonStr.length > 5 * 1024 * 1024) {
        alert('El archivo supera el límite de 5MB permitido por seguridad.');
        return;
      }
      const data = JSON.parse(jsonStr);
      if (!data?.metadata?.id) {
        alert('Archivo inválido. No se encontraron metadatos válidos de un nivel.');
        return;
      }
      
      const stored = localStorage.getItem('usbi_local_levels');
      const levels = stored ? JSON.parse(stored) : [];
      const existingIdx = levels.findIndex((l: any) => l.metadata.id === data.metadata.id);
      
      if (existingIdx >= 0) {
        levels[existingIdx] = data;
      } else {
        levels.push(data);
      }
      
      localStorage.setItem('usbi_local_levels', JSON.stringify(levels));
      setLocalLevels(levels);
      alert('¡Nivel importado exitosamente!');
    } catch (e) {
      alert('Archivo inválido. No es un JSON correcto.');
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este nivel local?')) return;
    const filtered = localLevels.filter(l => l.metadata.id !== id);
    localStorage.setItem('usbi_local_levels', JSON.stringify(filtered));
    setLocalLevels(filtered);
  };

  return (
    <section className="rounded-lg bg-[--color-card] text-[--color-text-card] p-6 shadow-sm border border-[--color-border] mt-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-[--color-primary]">Tus niveles locales (Maker)</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/maker')}>
            + Crear nuevo
          </Button>
          <Button variant="outline" size="sm" onClick={handleImport}>
            📥 Importar
          </Button>
        </div>
      </div>
      
      {localLevels.length === 0 ? (
        <p className="text-[--color-muted] text-sm bg-black/5 dark:bg-white/5 p-4 rounded-lg">
          No tienes niveles locales. Puedes crear uno o importar un archivo JSON.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {localLevels.map((lvl: any) => (
            <div key={lvl.metadata.id} className="border border-[--color-border] p-4 rounded-lg flex flex-col gap-2 relative bg-black/5 dark:bg-white/5">
              <button 
                onClick={() => handleDelete(lvl.metadata.id)} 
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold"
                title="Eliminar nivel"
              >
                ✕
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: lvl.metadata.color || '#4caf50' }}>
                  <TemplateIcon type={lvl.metadata.template_type} />
                </div>
                <h3 className="font-bold truncate pr-6" title={lvl.metadata.title}>{lvl.metadata.title}</h3>
              </div>
              <p className="text-xs text-[--color-muted]">Tipo: {lvl.metadata.template_type} | Dif: {lvl.metadata.difficulty}</p>
              <Button size="sm" variant="primary" className="mt-2 w-full" onClick={() => navigate(`/local-play/${lvl.metadata.id}`)}>
                Jugar local
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TemplateIcon({ type }: { type: TemplateType }) {
  switch (type) {
    case 'trivia':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <circle cx="12" cy="17" r="1" />
        </svg>
      );
    case 'puzzle':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="M3.27 6.96L12 12.01l8.73-5.05" />
          <path d="M12 22.08V12" />
        </svg>
      );
    case 'word_search':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
          <path d="M7 11h8M7 7h8M7 15h4" />
        </svg>
      );
    case 'fake_news':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      );
    case 'crossword':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
        </svg>
      );
    case 'memory':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
          <rect x="3" y="4" width="7" height="16" rx="1" />
          <rect x="14" y="4" width="7" height="16" rx="1" />
          <path d="M5 8h3M5 12h3M16 8h3M16 12h3" />
        </svg>
      );
    case 'snakes_ladders':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <circle cx="15.5" cy="15.5" r="1.5" />
          <circle cx="15.5" cy="8.5" r="1.5" />
          <circle cx="8.5" cy="15.5" r="1.5" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
  }
}

function SectionAccordionItem({ section, navigate }: { section: SectionDTO; navigate: NavigateFunction }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const levelsQuery = useQuery({
    queryKey: ['section-levels', section.id],
    queryFn: async () => {
      const resp = await apiClient.get<LevelsPageDTO>(`/levels?section_id=${section.id}&page_size=50`);
      return resp.data.items;
    },
    enabled: isExpanded,
  });

  const levels = levelsQuery.data ?? [];

  return (
    <article className="rounded-xl bg-[--color-card] text-[--color-text-card] overflow-hidden shadow-md transition-all duration-300">
      <div 
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full shadow-inner flex items-center justify-center text-white font-bold text-2xl" style={{ backgroundColor: section.color || '#4caf50' }}>
            {section.title.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-2xl font-bold">{section.title}</h3>
            {section.description && (
              <p className="text-sm text-[--color-muted] mt-1">{section.description}</p>
            )}
          </div>
        </div>
        <div className="text-[--color-muted]">
          <svg className={`w-8 h-8 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="p-8 pb-12 bg-[--color-card]">
          {levelsQuery.isLoading ? (
            <p className="text-center text-[--color-muted]">Cargando niveles...</p>
          ) : levelsQuery.isError ? (
            <p className="text-center text-[--color-error]">Error al cargar los niveles.</p>
          ) : levels.length === 0 ? (
            <p className="text-center text-[--color-muted]">No hay niveles publicados en esta sección.</p>
          ) : (
            <div className="flex flex-col gap-10 items-center w-full">
              {levels.map((level, index) => {
                // Generar un pequeño desplazamiento lateral para crear un camino (zigzag leve)
                const offset = index % 2 === 0 ? '-translate-x-8' : 'translate-x-8';
                
                return (
                  <div key={level.id} className={`flex flex-col items-center gap-3 group relative ${offset} transform transition-transform`}>
                    <button 
                      onClick={() => navigate(`/levels/${level.id}/play`)}
                      className="w-20 h-20 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 z-10"
                      style={{ backgroundColor: level.color || section.color || '#4caf50' }}
                    >
                      <TemplateIcon type={level.template_type} />
                    </button>
                    <span className="text-sm font-semibold text-center w-32 break-words">{level.title}</span>
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-black/80 backdrop-blur text-white text-xs rounded-lg py-1.5 px-3 pointer-events-none whitespace-nowrap z-20 shadow-xl">
                      {level.template_type.replace('_', ' ')} • Dificultad {level.difficulty}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

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
          </div>
          <div className="flex items-center gap-4">

            <Button variant="outline" size="sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
              Perfil
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
          <div className="flex flex-col gap-6">
            {sections.map((section) => (
              <SectionAccordionItem key={section.id} section={section} navigate={navigate} />
            ))}
            {sections.length === 0 && (
              <p className="rounded-lg border border-[--color-border] bg-[--color-card] p-5 text-[--color-muted]">
                No hay secciones publicadas.
              </p>
            )}
          </div>
        </section>

        <LocalContentSection navigate={navigate} />
      </div>
    </main>
  );
}
