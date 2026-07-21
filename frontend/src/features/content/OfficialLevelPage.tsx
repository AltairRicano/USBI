import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../lib/apiClient';
import { buildAttemptPayload, enqueueProgress } from '../../lib/localSyncQueue';
import type { CompleteLevelResponse, LevelDTO } from './types';
import {
  normalizeCrosswordContent,
  normalizeFakeNewsContent,
  normalizeMemoryContent,
  normalizePuzzleContent,
  normalizeSnakesContent,
  normalizeTriviaContent,
  normalizeWordSearchContent,
} from './types';

const TriviaGame = lazy(() => import('../games/TriviaGame').then((mod) => ({ default: mod.TriviaGame })));
const MemoryGame = lazy(() => import('../games/components/MemoryGame').then((mod) => ({ default: mod.MemoryGame })));
const FakeNewsGame = lazy(() => import('../games/components/FakeNewsGame').then((mod) => ({ default: mod.FakeNewsGame })));
const WordSearchGame = lazy(() => import('../games/WordSearchGame').then((mod) => ({ default: mod.WordSearchGame })));
const PuzzleGame = lazy(() => import('../games/PuzzleGame').then((mod) => ({ default: mod.PuzzleGame })));
const CrosswordGame = lazy(() => import('../games/CrosswordGame').then((mod) => ({ default: mod.CrosswordGame })));
const SnakeLadderGame = lazy(() => import('../games/components/SnakeLadderGame').then((mod) => ({ default: mod.SnakeLadderGame })));

export function OfficialLevelPage() {
  const { levelId } = useParams();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<CompleteLevelResponse | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const submittedRef = useRef(false);

  const levelQuery = useQuery({
    queryKey: ['level', levelId],
    enabled: Boolean(levelId),
    queryFn: async () => {
      const { data } = await apiClient.get<LevelDTO>(`/levels/${levelId}`);
      return data;
    },
  });
  const level = levelQuery.data ?? null;

  const finishLevel = useCallback(async (score: number) => {
    if (!levelId || submittedRef.current || !level?.is_published) return;
    submittedRef.current = true;
    setSaveError(null);
    try {
      const { data } = await apiClient.post<CompleteLevelResponse>(`/levels/${levelId}/complete`, {
        score,
        completed: true,
        client_finished_at: new Date().toISOString(),
      });
      setResult(data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['profile-progress'] }),
      ]);
    } catch {
      await enqueueProgress(buildAttemptPayload(levelId, true));
      setSaveError('No se pudo guardar en línea. El intento quedó en cola local si estás usando la app de escritorio.');
    }
  }, [level?.is_published, levelId, queryClient]);

  useEffect(() => {
    const isPlaying = Boolean(level && hasPlayableContent(level) && !result);
    void setTauriGameStatus(isPlaying);
    return () => {
      if (isPlaying) void setTauriGameStatus(false);
    };
  }, [level, result]);

  if (levelQuery.isError) {
    return (
      <main className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="mx-auto max-w-3xl rounded-lg bg-[--color-card] p-5">
          <p className="text-[--color-error]">No se pudo cargar el nivel.</p>
          <Button variant="outline" size="sm" className="mt-4">
            <Link to="/dashboard">Volver</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (!level) {
    return <main className="min-h-screen p-6">Cargando nivel...</main>;
  }

  const triviaQuestions = level.template_type === 'trivia' ? normalizeTriviaContent(level.content) : [];
  const memoryPairs = level.template_type === 'memory' ? normalizeMemoryContent(level.content) : [];
  const fakeNews = level.template_type === 'fake_news' ? normalizeFakeNewsContent(level.content) : [];
  const wordSearch = level.template_type === 'word_search' ? normalizeWordSearchContent(level.content) : null;
  const puzzle = level.template_type === 'puzzle' ? normalizePuzzleContent(level.content) : null;
  const crosswordWords = level.template_type === 'crossword' ? normalizeCrosswordContent(level.content) : [];
  const snakes = level.template_type === 'snakes_ladders' ? normalizeSnakesContent(level.content) : null;

  return (
    <main className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{level.title}</h1>
            <p className="text-sm text-[--color-muted]">Dificultad {level.difficulty} · {level.template_type}</p>
          </div>
          <Button variant="outline" size="sm">
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        </header>

        {result && (
          <section className="rounded-lg bg-[--color-card] p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Resultado oficial</h2>
            <p className="text-sm text-[--color-muted]">
              XP otorgada: {result.xp_awarded} · intento {result.attempt_number} · XP total: {result.total_xp} · racha: {result.current_streak}
            </p>
            {(result.badges_awarded ?? []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(result.badges_awarded ?? []).map((badge) => (
                  <span key={badge.id} className="rounded-full border border-[--color-border] px-3 py-1 text-sm">
                    {badge.name}
                  </span>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" className="mt-4">
              <Link to="/profile">Ver progreso</Link>
            </Button>
          </section>
        )}

        {!level.is_published && (
          <section className="rounded-lg bg-[--color-card] p-4 text-sm text-[--color-muted] shadow-sm">
            Vista previa de borrador. Este intento no modifica XP ni progreso oficial.
          </section>
        )}
        {saveError && <p className="rounded border border-[--color-error] bg-[--color-card] p-3 text-[--color-error]">{saveError}</p>}

        <Suspense fallback={<GameFallback />}>
          {level.template_type === 'trivia' && triviaQuestions.length > 0 && (
            <TriviaGame questions={triviaQuestions} onFinish={finishLevel} />
          )}
          {level.template_type === 'memory' && memoryPairs.length >= 2 && (
            <MemoryGame pairs={memoryPairs} onComplete={(score) => void finishLevel(score)} />
          )}
          {level.template_type === 'fake_news' && fakeNews.length > 0 && (
            <FakeNewsGame news={fakeNews} onComplete={(score) => void finishLevel(score)} />
          )}
          {level.template_type === 'word_search' && wordSearch && wordSearch.words.length > 0 && (
            <WordSearchGame
              words={wordSearch.words}
              width={wordSearch.width}
              height={wordSearch.height}
              seed={wordSearch.seed}
              onFinish={finishLevel}
            />
          )}
          {level.template_type === 'puzzle' && puzzle && (
            <PuzzleGame imageUrl={puzzle.imageUrl} gridSize={puzzle.gridSize} seed={puzzle.seed} onFinish={finishLevel} />
          )}
          {level.template_type === 'crossword' && crosswordWords.length >= 2 && (
            <CrosswordGame words={crosswordWords} onFinish={finishLevel} />
          )}
          {level.template_type === 'snakes_ladders' && snakes && (
            <SnakeLadderGame level={snakes} onComplete={(score) => void finishLevel(score)} />
          )}
        </Suspense>
        {!hasPlayableContent(level) && (
          <section className="rounded-lg bg-[--color-card] p-5 shadow-sm">
            <p className="text-[--color-muted]">El contenido de este nivel no cumple el contrato mínimo de su plantilla.</p>
          </section>
        )}
      </div>
    </main>
  );
}

function GameFallback() {
  return (
    <section className="rounded-lg bg-[--color-card] p-5 shadow-sm">
      <p className="text-[--color-muted]">Cargando juego...</p>
    </section>
  );
}

async function setTauriGameStatus(isPlaying: boolean): Promise<void> {
  if (!window.__TAURI__) return;
  try {
    await invoke('set_game_status', { isPlaying });
  } catch {
    // Web fallback and unavailable IPC should not block gameplay.
  }
}

function hasPlayableContent(level: LevelDTO): boolean {
  switch (level.template_type) {
    case 'trivia':
      return normalizeTriviaContent(level.content).length > 0;
    case 'memory':
      return normalizeMemoryContent(level.content).length >= 2;
    case 'fake_news':
      return normalizeFakeNewsContent(level.content).length > 0;
    case 'word_search':
      return normalizeWordSearchContent(level.content).words.length > 0;
    case 'puzzle':
      return normalizePuzzleContent(level.content) !== null;
    case 'crossword':
      return normalizeCrosswordContent(level.content).length >= 2;
    case 'snakes_ladders':
      return normalizeSnakesContent(level.content) !== null;
  }
}
