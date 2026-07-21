import { z } from "zod";
import { 
  CrosswordSchema, 
  FakeNewsSchema, 
  MemorySchema, 
  PuzzleSchema, 
  SnakesSchema, 
  WordSearchSchema, 
} from '@usbi/schema';

// Locally define the MultipleChoice schema to avoid bundler/circular initialization issues
const LocalMultipleChoiceSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).min(2).max(4),
  correct_index: z.number().int().min(0).max(3),
  media_url: z.string().optional(),
});

import { TriviaForm } from './forms/TriviaForm';
import { CrosswordForm } from './forms/CrosswordForm';
import { WordSearchForm } from './forms/WordSearchForm';
import { PuzzleForm } from './forms/PuzzleForm';
import { FakeNewsForm } from './forms/FakeNewsForm';
import { MemoryForm } from './forms/MemoryForm';
import { SnakeLadderForm } from './forms/SnakeLadderForm';

import { TriviaPreview } from './previews/TriviaPreview';
import { CrosswordPreview } from './previews/CrosswordPreview';
import { WordSearchPreview } from './previews/WordSearchPreview';
import { PuzzlePreview } from './previews/PuzzlePreview';
import { FakeNewsPreview } from './previews/FakeNewsPreview';
import { MemoryPreview } from './previews/MemoryPreview';
import { SnakeLadderPreview } from './previews/SnakeLadderPreview';

export const levelTemplateRegistry = {
  trivia: {
    schema: z.array(LocalMultipleChoiceSchema).min(1) as any,
    FormComponent: TriviaForm as any,
    PreviewComponent: TriviaPreview,
    getDefaults: () => [{ question: '', options: ['', ''], correct_index: 0 }],
  },
  crossword: {
    schema: CrosswordSchema as any,
    FormComponent: CrosswordForm as any,
    PreviewComponent: CrosswordPreview,
    getDefaults: () => ({ words: [{ word: '', clue: '' }, { word: '', clue: '' }] }),
  },
  word_search: {
    schema: WordSearchSchema as any,
    FormComponent: WordSearchForm as any,
    PreviewComponent: WordSearchPreview,
    getDefaults: () => ({ words: ['', ''], width: 12, height: 12, seed: 1234 }),
  },
  puzzle: {
    schema: PuzzleSchema as any,
    FormComponent: PuzzleForm as any,
    PreviewComponent: PuzzlePreview,
    getDefaults: () => ({ imageUrl: '', gridSize: 3, seed: 1234 }),
  },
  fake_news: {
    schema: FakeNewsSchema as any,
    FormComponent: FakeNewsForm as any,
    PreviewComponent: FakeNewsPreview,
    getDefaults: () => ({ news: [{ title: '', content: '', isFake: false, reference: '' }] }),
  },
  memory: {
    schema: MemorySchema as any,
    FormComponent: MemoryForm as any,
    PreviewComponent: MemoryPreview,
    getDefaults: () => ({ pairs: [
      { id: crypto.randomUUID(), content1: '', content2: '' },
      { id: crypto.randomUUID(), content1: '', content2: '' },
      { id: crypto.randomUUID(), content1: '', content2: '' },
      { id: crypto.randomUUID(), content1: '', content2: '' }
    ] }),
  },
  snakes_ladders: {
    schema: SnakesSchema as any,
    FormComponent: SnakeLadderForm as any,
    PreviewComponent: SnakeLadderPreview,
    getDefaults: () => ({ board_width: 6, board_height: 6, start_position: 1, end_position: 36, snakes: [], ladders: [], ai_config: { difficulty: 'MEDIUM' } }),
  }
} as const;
