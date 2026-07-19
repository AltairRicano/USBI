import { z } from "zod";

export const RegisterSchema = z.object({
  full_name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  is_adult: z.boolean(),
  privacy_notice_version: z.string(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const TutorConsentSchema = z.object({
  user_id: z.string().uuid(),
  tutor_name: z.string(),
  tutor_email: z.string().email(),
  privacy_notice_version: z.string(),
});

export const ArcoSchema = z.object({
  request_type: z.enum(["acceso", "rectificacion", "cancelacion", "oposicion"]),
  details: z.string().max(1000).optional(),
});

export const LevelAttemptItemSchema = z.object({
  level_id: z.string().uuid(),
  attempt_date: z.string(), // YYYY-MM-DD
  attempt_number: z.number().int().min(1),
  xp_awarded: z.number().int().min(0),
  completed: z.boolean(),
});

export const SyncPayloadSchema = z.object({
  level_attempts: z.array(LevelAttemptItemSchema),
  daily_streak_dates: z.array(z.string()).optional(),
  badge_ids_earned: z.array(z.string().uuid()).optional(),
});

export const SyncEventSchema = z.object({
  sync_event_id: z.string().uuid(),
  user_id: z.string().uuid(),
  device_id: z.string().uuid(),
  crypto_key_version: z.number().int(),
  payload: SyncPayloadSchema,
  hmac_signature: z.string(),
});

// Maker Schemas

export const FlashcardSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  color: z.string().optional(),
  media_url: z.string().optional(),
});

export const MultipleChoiceSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).min(2).max(4),
  correct_index: z.number().int().min(0).max(3),
  media_url: z.string().optional(),
});

export const DragAndDropItemSchema = z.object({
  id: z.string(),
  content: z.string(),
  target_id: z.string(),
});

export const DragAndDropSchema = z.object({
  items: z.array(DragAndDropItemSchema).min(1),
  targets: z.array(z.object({
    id: z.string(),
    label: z.string(),
  })).min(1),
});

export const MemoryPairSchema = z.object({
  id: z.string(),
  content1: z.string(),
  content2: z.string(),
  color: z.string().optional(),
});

export const MemorySchema = z.object({
  pairs: z.array(MemoryPairSchema).min(4), // Specification says min 4 pairs
});

export const FakeNewsItemSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  isFake: z.boolean(),
  explanation: z.string().optional(),
  imageUrl: z.string().optional(),
  reference: z.string(),
});

export const FakeNewsSchema = z.object({
  news: z.array(FakeNewsItemSchema).min(1),
});

export const CrosswordWordSchema = z.object({
  word: z.string().min(2),
  clue: z.string().min(1),
});

export const CrosswordSchema = z.object({
  words: z.array(CrosswordWordSchema).min(2),
});

export const LevelMetadataSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  author: z.string().min(1),
  creation_date: z.string(),
  color: z.string().min(1),
  difficulty: z.number().int().min(1).max(10),
  template_type: z.enum([
    "TRIVIA", 
    "FAKE_NEWS", 
    "MEMORY", 
    "WORD_SEARCH", 
    "PUZZLE", 
    "CROSSWORD", 
    "SNAKES"
  ]),
});

export const LevelExportSchema = z.object({
  metadata: LevelMetadataSchema,
  content: z.union([
    z.array(FlashcardSchema),
    z.array(MultipleChoiceSchema),
    DragAndDropSchema,
    MemorySchema,
    FakeNewsSchema,
    CrosswordSchema,
  ]),
});

export type Flashcard = z.infer<typeof FlashcardSchema>;
export type MultipleChoice = z.infer<typeof MultipleChoiceSchema>;
export type DragAndDropItem = z.infer<typeof DragAndDropItemSchema>;
export type DragAndDrop = z.infer<typeof DragAndDropSchema>;
export type MemoryPair = z.infer<typeof MemoryPairSchema>;
export type Memory = z.infer<typeof MemorySchema>;
export type FakeNewsItem = z.infer<typeof FakeNewsItemSchema>;
export type FakeNews = z.infer<typeof FakeNewsSchema>;
export type CrosswordWord = z.infer<typeof CrosswordWordSchema>;
export type Crossword = z.infer<typeof CrosswordSchema>;
export type LevelMetadata = z.infer<typeof LevelMetadataSchema>;
export type LevelExport = z.infer<typeof LevelExportSchema>;
