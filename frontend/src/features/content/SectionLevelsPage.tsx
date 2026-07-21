import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../lib/apiClient';
import type { LevelSummaryDTO, LevelsPageDTO, SectionDTO, SectionsResponse } from './types';

export function SectionLevelsPage() {
  const { sectionId } = useParams();
  const levelsQuery = useQuery({
    queryKey: ['section-levels', sectionId],
    enabled: Boolean(sectionId),
    queryFn: async () => {
      const [sectionResp, levelResp] = await Promise.all([
        apiClient.get<SectionsResponse>('/sections'),
        apiClient.get<LevelsPageDTO>(`/levels?section_id=${sectionId}&page_size=50`),
      ]);
      return {
        section: sectionResp.data.items.find((item) => item.id === sectionId) ?? null,
        levels: levelResp.data.items,
      };
    },
  });
  const section: SectionDTO | null = levelsQuery.data?.section ?? null;
  const levels: LevelSummaryDTO[] = levelsQuery.data?.levels ?? [];
  const error = levelsQuery.isError ? 'No se pudieron cargar los niveles.' : null;

  return (
    <main className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{section?.title ?? 'Sección'}</h1>
            <p className="text-sm text-[--color-muted]">Niveles oficiales publicados.</p>
          </div>
          <Button variant="outline" size="sm">
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        </header>

        {error && <p className="rounded border border-[--color-error] bg-[--color-card] p-3 text-[--color-error]">{error}</p>}

        <section className="grid gap-4 md:grid-cols-2">
          {levels.map((level) => (
            <article key={level.id} className="rounded-lg bg-[--color-card] p-5 shadow-sm">
              <div className="mb-4 h-2 rounded" style={{ backgroundColor: level.color }} />
              <h2 className="text-xl font-semibold">{level.title}</h2>
              <p className="mb-4 text-sm text-[--color-muted]">Dificultad {level.difficulty} · {level.template_type}</p>
              <Button size="sm">
                <Link to={`/levels/${level.id}/play`}>Jugar</Link>
              </Button>
            </article>
          ))}
          {levels.length === 0 && <p className="rounded-lg bg-[--color-card] p-5 text-[--color-muted]">No hay niveles publicados en esta sección.</p>}
        </section>
      </div>
    </main>
  );
}
