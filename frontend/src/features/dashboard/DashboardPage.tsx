import { useAuthStore } from '../../stores/useAuthStore';
import { useSettingsStore, type ColorBlindFilter } from '../../stores/useSettingsStore';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../lib/apiClient';
import { MINIGAMES_REGISTRY, GameStatus } from '../games/registry';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { colorBlindFilter, setColorBlindFilter } = useSettingsStore();

  async function handleLogout() {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      logout();
    }
  }

  const getStatusColor = (status: GameStatus) => {
    switch (status) {
      case 'DISPONIBLE': return 'text-green-600 bg-green-100 border-green-200';
      case 'IMPLEMENTADO SIN RUTA': return 'text-amber-600 bg-amber-100 border-amber-200';
      case 'IMPLEMENTADO PARCIALMENTE': return 'text-amber-600 bg-amber-100 border-amber-200';
      case 'NO FUNCIONAL': return 'text-red-600 bg-red-100 border-red-200';
      case 'NO ENCONTRADO': return 'text-slate-600 bg-slate-100 border-slate-200';
    }
  };

  return (
    <main className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
              Bienvenido, {user?.full_name}
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              Rol: {user?.role}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mr-4">
              <label htmlFor="color-filter" className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
                Filtro Visual:
              </label>
              <select
                id="color-filter"
                value={colorBlindFilter}
                onChange={(e) => setColorBlindFilter(e.target.value as ColorBlindFilter)}
                className="text-sm border rounded px-2 py-1 bg-white text-slate-800 focus:outline-none focus-visible:ring-2"
              >
                <option value="none">Normal</option>
                <option value="deuteranopia">Deuteranopía (Verde-Rojo)</option>
                <option value="protanopia">Protanopía (Rojo-Verde)</option>
                <option value="tritanopia">Tritanopía (Azul-Amarillo)</option>
              </select>
            </div>
            {user?.role === 'admin' && (
              <Button variant="primary" size="sm" onClick={() => navigate('/maker')}>
                Ir al Maker
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>
        </header>

        <section
          className="rounded-2xl shadow-md p-6"
          style={{ backgroundColor: 'var(--color-background)' }}
          aria-label="Catálogo de juegos"
        >
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>Catálogo de Minijuegos</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MINIGAMES_REGISTRY.map(game => (
              <div 
                key={game.id} 
                onClick={() => { if (game.status === 'DISPONIBLE' && game.route) navigate(game.route) }}
                className={clsx("border rounded-xl p-5 shadow-sm transition-shadow", game.status === 'DISPONIBLE' ? 'hover:shadow-md cursor-pointer' : 'opacity-80')}
              >
                <h3 className="font-bold text-lg mb-2 text-slate-800">{game.name}</h3>
                <p className="text-sm text-slate-600 mb-4 h-10">{game.description}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className={clsx("text-xs font-semibold px-2 py-1 rounded-full border", getStatusColor(game.status))}>
                    {game.status}
                  </span>
                  {game.status === 'DISPONIBLE' && game.route && (
                    <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); navigate(game.route!); }}>
                      Jugar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

