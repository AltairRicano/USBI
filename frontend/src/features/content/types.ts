import type { CrosswordWord, FakeNewsItem, MemoryPair, MultipleChoice, Snakes } from '@usbi/schema';

export type TemplateType =
  | 'trivia'
  | 'puzzle'
  | 'word_search'
  | 'fake_news'
  | 'crossword'
  | 'memory'
  | 'snakes_ladders';

export interface SectionDTO {
  id: string;
  title: string;
  color: string;
  is_published: boolean;
  created_by_admin_id?: string;
  created_at?: string;
}

export interface SectionsResponse {
  items: SectionDTO[];
}

export interface LevelSummaryDTO {
  id: string;
  section_id: string;
  title: string;
  color: string;
  template_type: TemplateType;
  difficulty: number;
  is_published: boolean;
  created_at: string;
}

export interface LevelDTO extends LevelSummaryDTO {
  content: unknown;
  created_by_admin_id?: string;
  updated_at?: string;
}

export interface LevelsPageDTO {
  items: LevelSummaryDTO[];
  next_cursor?: string;
}

export interface CompleteLevelResponse {
  level_id: string;
  completed: boolean;
  attempt_number: number;
  xp_awarded: number;
  total_xp: number;
  current_streak: number;
  badges_awarded: BadgeDTO[];
}

export interface BadgeDTO {
  id: string;
  name: string;
  xp_threshold: number;
  icon_key: string;
  earned_at: string;
}

export interface ProfileProgressResponse {
  total_xp: number;
  completed_levels: number;
  total_attempts: number;
  current_streak: number;
  badges: BadgeDTO[];
  levels: Array<{
    level_id: string;
    title: string;
    template_type: TemplateType;
    difficulty: number;
    best_score: number;
    xp_total_for_level: number;
    attempts_count: number;
    first_completed_at?: string;
    last_completed_at?: string;
  }>;
}

export function normalizeTriviaContent(content: unknown): MultipleChoice[] {
  const rawQuestions = Array.isArray(content)
    ? content
    : typeof content === 'object' && content !== null && Array.isArray((content as { questions?: unknown }).questions)
      ? (content as { questions: unknown[] }).questions
      : [];

  return rawQuestions
    .map((item) => {
      const q = item as {
        question?: unknown;
        options?: unknown;
        correct_index?: unknown;
        media_url?: unknown;
      };
      return {
        question: typeof q.question === 'string' ? q.question : '',
        options: Array.isArray(q.options) ? q.options.filter((option): option is string => typeof option === 'string') : [],
        correct_index: typeof q.correct_index === 'number' ? q.correct_index : 0,
        media_url: typeof q.media_url === 'string' ? q.media_url : undefined,
      };
    })
    .filter((q) => q.question && q.options.length >= 2 && q.correct_index >= 0 && q.correct_index < q.options.length);
}

export function normalizeMemoryContent(content: unknown): MemoryPair[] {
  const rawPairs = readArray(content, 'pairs');
  return rawPairs
    .map((item, index) => {
      const pair = item as { id?: unknown; content1?: unknown; content2?: unknown; color?: unknown };
      return {
        id: typeof pair.id === 'string' ? pair.id : `pair-${index + 1}`,
        content1: typeof pair.content1 === 'string' ? pair.content1 : '',
        content2: typeof pair.content2 === 'string' ? pair.content2 : '',
        color: typeof pair.color === 'string' ? pair.color : undefined,
      };
    })
    .filter((pair) => pair.content1 && pair.content2);
}

export function normalizeFakeNewsContent(content: unknown): FakeNewsItem[] {
  const rawNews = readArray(content, 'news');
  return rawNews
    .map((item) => {
      const news = item as {
        title?: unknown;
        content?: unknown;
        isFake?: unknown;
        explanation?: unknown;
        imageUrl?: unknown;
        reference?: unknown;
      };
      return {
        title: typeof news.title === 'string' ? news.title : '',
        content: typeof news.content === 'string' ? news.content : '',
        isFake: typeof news.isFake === 'boolean' ? news.isFake : false,
        explanation: typeof news.explanation === 'string' ? news.explanation : undefined,
        imageUrl: typeof news.imageUrl === 'string' ? news.imageUrl : undefined,
        reference: typeof news.reference === 'string' ? news.reference : '',
      };
    })
    .filter((item) => item.title && item.content);
}

export function normalizeWordSearchContent(content: unknown): { words: string[]; width?: number; height?: number; seed?: number } {
  const data = content as { words?: unknown; width?: unknown; height?: unknown; seed?: unknown };
  const words = Array.isArray(data?.words)
    ? data.words.filter((word): word is string => typeof word === 'string' && word.trim().length >= 2)
    : [];
  return {
    words,
    width: typeof data?.width === 'number' ? data.width : undefined,
    height: typeof data?.height === 'number' ? data.height : undefined,
    seed: typeof data?.seed === 'number' ? data.seed : undefined,
  };
}

export function normalizePuzzleContent(content: unknown): { imageUrl: string; gridSize?: number; seed?: number } | null {
  const data = content as { imageUrl?: unknown; image_url?: unknown; gridSize?: unknown; grid_size?: unknown; seed?: unknown };
  const imageUrl = typeof data?.imageUrl === 'string'
    ? data.imageUrl
    : typeof data?.image_url === 'string'
      ? data.image_url
      : '';
  if (!imageUrl) return null;
  return {
    imageUrl,
    gridSize: typeof data?.gridSize === 'number' ? data.gridSize : typeof data?.grid_size === 'number' ? data.grid_size : undefined,
    seed: typeof data?.seed === 'number' ? data.seed : undefined,
  };
}

export function normalizeCrosswordContent(content: unknown): CrosswordWord[] {
  const rawWords = readArray(content, 'words');
  return rawWords
    .map((item) => {
      const word = item as { word?: unknown; clue?: unknown };
      return {
        word: typeof word.word === 'string' ? word.word : '',
        clue: typeof word.clue === 'string' ? word.clue : '',
      };
    })
    .filter((word) => word.word.length >= 2 && word.clue);
}

export function normalizeSnakesContent(content: unknown): Snakes | null {
  const data = content as Partial<Snakes> | null;
  if (!data || typeof data.board_width !== 'number' || typeof data.board_height !== 'number') return null;
  if (typeof data.start_position !== 'number' || typeof data.end_position !== 'number') return null;
  return {
    board_width: data.board_width,
    board_height: data.board_height,
    start_position: data.start_position,
    end_position: data.end_position,
    snakes: Array.isArray(data.snakes) ? data.snakes : [],
    ladders: Array.isArray(data.ladders) ? data.ladders : [],
    ai_config: data.ai_config,
  };
}

function readArray(content: unknown, key: string): unknown[] {
  if (Array.isArray(content)) return content;
  if (typeof content === 'object' && content !== null && Array.isArray((content as Record<string, unknown>)[key])) {
    return (content as Record<string, unknown>)[key] as unknown[];
  }
  return [];
}
