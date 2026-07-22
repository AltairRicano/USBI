import type { ChangeEvent } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { SnakeLadderBoardPreview } from '../previews/SnakeLadderPreview';
import {
  clampBoardSize,
  generateSnakeLadderLinks,
  maxFeatureCount,
  type SnakeLadderContent,
} from '../snakesLayout';

export function SnakeLadderForm({
  value,
  onChange,
}: {
  value: SnakeLadderContent;
  onChange: (val: SnakeLadderContent) => void;
}) {
  const boardWidth = clampBoardSize(value.board_width ?? 6);
  const boardHeight = clampBoardSize(value.board_height ?? 6);
  const seed = Number.isFinite(value.seed) ? Number(value.seed) : 2026;
  const maxCount = maxFeatureCount(boardWidth, boardHeight);
  const snakeCount = Math.min(value.snakes?.length ?? 3, maxCount);
  const ladderCount = Math.min(value.ladders?.length ?? 3, maxCount);
  const previewValue = normalizeContent(value, boardWidth, boardHeight, snakeCount, ladderCount, seed);

  function regenerate(updates: Partial<{ boardWidth: number; boardHeight: number; seed: number; snakeCount: number; ladderCount: number }>) {
    const nextWidth = clampBoardSize(updates.boardWidth ?? boardWidth);
    const nextHeight = clampBoardSize(updates.boardHeight ?? boardHeight);
    const nextSeed = Number.isFinite(updates.seed) ? Number(updates.seed) : seed;
    const nextMax = maxFeatureCount(nextWidth, nextHeight);
    const nextSnakeCount = clampCount(updates.snakeCount ?? snakeCount, nextMax);
    const nextLadderCount = clampCount(updates.ladderCount ?? ladderCount, nextMax);
    onChange(normalizeContent(value, nextWidth, nextHeight, nextSnakeCount, nextLadderCount, nextSeed));
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Columnas"
          type="number"
          min={2}
          max={10}
          value={boardWidth}
          onChange={(event: ChangeEvent<HTMLInputElement>) => regenerate({ boardWidth: Number(event.target.value) })}
          required
        />
        <Input
          label="Filas"
          type="number"
          min={2}
          max={10}
          value={boardHeight}
          onChange={(event: ChangeEvent<HTMLInputElement>) => regenerate({ boardHeight: Number(event.target.value) })}
          required
        />
        <Input
          label="Serpientes"
          type="number"
          min={0}
          max={maxCount}
          value={snakeCount}
          onChange={(event: ChangeEvent<HTMLInputElement>) => regenerate({ snakeCount: Number(event.target.value) })}
          required
        />
        <Input
          label="Escaleras"
          type="number"
          min={0}
          max={maxCount}
          value={ladderCount}
          onChange={(event: ChangeEvent<HTMLInputElement>) => regenerate({ ladderCount: Number(event.target.value) })}
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_220px]">
        <Input
          label="Seed"
          type="number"
          value={seed}
          onChange={(event: ChangeEvent<HTMLInputElement>) => regenerate({ seed: Number(event.target.value) })}
          required
        />
        <Button
          type="button"
          variant="outline"
          className="self-end"
          onClick={() => regenerate({ seed: Math.floor(Math.random() * 100_000) })}
        >
          Seed aleatoria
        </Button>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="snakes-ai-difficulty">
        Dificultad de IA
        <select
          id="snakes-ai-difficulty"
          className="min-h-[44px] rounded-lg border border-[--color-border] bg-[--color-background] px-3"
          value={value.ai_config?.difficulty ?? 'MEDIUM'}
          onChange={(event) => onChange({ ...previewValue, ai_config: { difficulty: event.currentTarget.value as 'EASY' | 'MEDIUM' | 'HARD' } })}
        >
          <option value="EASY">Fácil</option>
          <option value="MEDIUM">Media</option>
          <option value="HARD">Difícil</option>
        </select>
      </label>

      <SnakeLadderBoardPreview value={previewValue} />
    </div>
  );
}

function normalizeContent(
  current: SnakeLadderContent,
  boardWidth: number,
  boardHeight: number,
  snakeCount: number,
  ladderCount: number,
  seed: number,
): SnakeLadderContent {
  const totalCells = boardWidth * boardHeight;
  const links = generateSnakeLadderLinks({ boardWidth, boardHeight, snakeCount, ladderCount, seed });
  return {
    ...current,
    board_width: boardWidth,
    board_height: boardHeight,
    start_position: 1,
    end_position: totalCells,
    seed,
    snakes: links.snakes,
    ladders: links.ladders,
    ai_config: current.ai_config ?? { difficulty: 'MEDIUM' },
  };
}

function clampCount(value: number, max: number): number {
  const normalized = Number.isFinite(value) ? Math.trunc(value) : 0;
  return Math.max(0, Math.min(max, normalized));
}
