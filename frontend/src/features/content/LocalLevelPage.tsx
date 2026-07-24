import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import type { LevelDTO } from './types';
import {
  normalizeCrosswordContent,
  normalizeFakeNewsContent,
  normalizeMemoryBackColorContent,
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

export function LocalLevelPage() {
  const { levelId } = useParams();
  const [result, setResult] = useState<{ score: number } | null>(null);
  const [level, setLevel] = useState<LevelDTO | null>(null);
  const [isError, setIsError] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('usbi_local_levels');
      if (stored) {
        const levels = JSON.parse(stored);
        const found = levels.find((l: any) => l.metadata.id === levelId);
        if (found) {
          // Normalize to LevelDTO format
          setLevel({
            id: found.metadata.id,
            title: found.metadata.title,
            description: '',
            difficulty: found.metadata.difficulty,
            template_type: found.metadata.template_type,
            content: found.content,
            is_published: false,
            color: found.metadata.color,
          } as unknown as LevelDTO);
          return;
        }
      }
      setIsError(true);
    } catch {
      setIsError(true);
    }
  }, [levelId]);

  const finishLevel = useCallback(async (score: number) => {
    if (submittedRef.current || !level) return;
    submittedRef.current = true;
    setResult({ score });
  }, [level]);

  useEffect(() => {
    const isPlaying = Boolean(level && hasPlayableContent(level) && !result);
    void setTauriGameStatus(isPlaying);
    return () => {
      if (isPlaying) void setTauriGameStatus(false);
    };
  }, [level, result]);

  if (isError) {
    return (
      <main className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="mx-auto max-w-3xl rounded-lg bg-[--color-card] p-5">
          <p className="text-[--color-error]">No se pudo cargar el nivel local.</p>
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
  const memoryBackColor = level.template_type === 'memory' ? normalizeMemoryBackColorContent(level.content) : undefined;
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
          <section className="rounded-lg bg-[--color-card] p-5 shadow-sm border border-[--color-border]">
            <h2 className="text-xl font-semibold">Nivel completado</h2>
            <p className="text-sm text-[--color-muted] mt-2">
              Puntuación final: {result.score}
            </p>
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
              Nota: Los niveles locales (Maker) no otorgan puntos de experiencia ni medallas en tu progreso oficial.
            </p>
            <Button variant="outline" size="sm" className="mt-4">
              <Link to="/dashboard">Volver al Dashboard</Link>
            </Button>
          </section>
        )}

        <Suspense fallback={<GameFallback />}>
          {level.template_type === 'trivia' && triviaQuestions.length > 0 && (
            <TriviaGame questions={triviaQuestions} onFinish={finishLevel} />
          )}
          {level.template_type === 'memory' && memoryPairs.length >= 2 && (
            <MemoryGame pairs={memoryPairs} backColor={memoryBackColor} onComplete={(score) => void finishLevel(score)} />
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
            <PuzzleGame phrase={puzzle.phrase} pieces={puzzle.pieces} seed={puzzle.seed} onFinish={finishLevel} />
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
  if (typeof window === 'undefined' || !window.__TAURI__) return;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
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
