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
  score: z.number().int().min(0),
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

// ── Respuestas del backend (validadas en runtime, no solo tipadas) ───────────
// Coinciden con domain.User / auth.LoginResponse / auth.RegisterResponse /
// domain.SyncEventResponse en Go. Se validan aquí porque controlan estado de
// sesión y, en el caso de sync, un flag que dispara borrado de datos locales.

export const UserRoleSchema = z.enum(["admin", "operator", "director", "player"]);
export const UserStatusSchema = z.enum(["active", "suspended", "pending_tutor_consent", "deleted"]);

export const UserSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  is_adult: z.boolean(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  created_at: z.string(),
});

/** POST /auth/login y POST /auth/refresh devuelven esta misma forma. */
export const AuthResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string(),
  token_type: z.string(),
  user: UserSchema,
});

// ── Contenido / progreso / insignias ─────────────────────────────────────────
// Espejan las interfaces homónimas en features/content/types.ts. Se usan
// exclusivamente para validar en runtime las respuestas de red que afectan
// XP, progreso e insignias (hallazgo de auditoría: el frontend solo tenía
// tipado TS estático para estos datos). `content` de un nivel se deja como
// unknown a propósito: cada plantilla de minijuego ya normaliza su propio
// contenido de forma defensiva (ver normalize*Content en types.ts).

export const TemplateTypeSchema = z.enum([
  "trivia",
  "puzzle",
  "word_search",
  "fake_news",
  "crossword",
  "memory",
  "snakes_ladders",
]);

export const BadgeSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  xp_threshold: z.number(),
  icon_key: z.string(),
  earned_at: z.string(),
});

export const SectionDTOSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  color: z.string(),
  is_published: z.boolean(),
  created_by_admin_id: z.string().uuid().optional(),
  created_at: z.string().optional(),
});

export const SectionsResponseSchema = z.object({
  items: z.array(SectionDTOSchema),
});

export const LevelSummaryDTOSchema = z.object({
  id: z.string().uuid(),
  section_id: z.string().uuid(),
  title: z.string(),
  color: z.string(),
  template_type: TemplateTypeSchema,
  difficulty: z.number(),
  is_published: z.boolean(),
  created_at: z.string(),
});

export const LevelDTOSchema = LevelSummaryDTOSchema.extend({
  content: z.unknown(),
  created_by_admin_id: z.string().uuid().optional(),
  updated_at: z.string().optional(),
});

export const LevelsPageDTOSchema = z.object({
  items: z.array(LevelSummaryDTOSchema),
  next_cursor: z.string().optional(),
});

export const CompleteLevelResponseSchema = z.object({
  level_id: z.string().uuid(),
  completed: z.boolean(),
  attempt_number: z.number(),
  xp_awarded: z.number(),
  total_xp: z.number(),
  current_streak: z.number(),
  badges_awarded: z.array(BadgeSchema),
});

export const ProfileProgressResponseSchema = z.object({
  total_xp: z.number(),
  completed_levels: z.number(),
  total_attempts: z.number(),
  current_streak: z.number(),
  badges: z.array(BadgeSchema),
  levels: z.array(z.object({
    level_id: z.string().uuid(),
    title: z.string(),
    template_type: TemplateTypeSchema,
    difficulty: z.number(),
    best_score: z.number(),
    xp_total_for_level: z.number(),
    attempts_count: z.number(),
    first_completed_at: z.string().optional(),
    last_completed_at: z.string().optional(),
  })),
});

/**
 * Forma de la sesión persistida en el Tauri Store local (usbi-session.json).
 * Se valida al restaurar (secureSession.ts) porque ese archivo vive en el
 * filesystem del usuario, fuera del control del backend — Zero Trust: un
 * atacante local con acceso al filesystem podría editarlo para inyectar
 * campos arbitrarios (p. ej. role: "admin") si no se validara la forma.
 */
export const StoredSessionSchema = z.object({
  user: UserSchema,
  token: z.string().min(1),
  refreshToken: z.string().nullable(),
  deviceId: z.string().nullable(),
});

export const RegisterResponseSchema = z.object({
  user_id: z.string().uuid(),
  status: z.enum(["active", "pending_tutor_consent"]),
  message: z.string(),
  // Solo presente cuando status es "pending_tutor_consent". Debe reenviarse
  // tal cual en el POST a /auth/tutor-consent (ver RegisterPage.tsx).
  registration_token: z.string().optional(),
});

/**
 * POST /sync. wipe_local_data controla un borrado destructivo de SQLite
 * local (ARCO/revocación) — nunca debe leerse desde una respuesta sin
 * validar forma primero.
 */
export const SyncEventResponseSchema = z.object({
  status: z.string(),
  wipe_local_data: z.boolean(),
  server_xp_total: z.number().int(),
  badges_awarded: z.array(z.string().uuid()).optional(),
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
  back_color: z.string().optional(),
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

export const WordSearchSchema = z.object({
  words: z.array(z.string().min(2)).min(2),
  width: z.number().int().min(5).max(24).optional(),
  height: z.number().int().min(5).max(24).optional(),
  seed: z.number().int().optional(),
});

export const PuzzleSchema = z.object({
  phrase: z.string().min(1),
  pieces: z.number().int().min(3).max(20).default(3),
  seed: z.number().int().optional(),
});

export const LevelMetadataSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  author: z.string().min(1),
  creation_date: z.string(),
  color: z.string().min(1),
  difficulty: z.number().int().min(1).max(10),
  template_type: TemplateTypeSchema,
});

export const LevelExportSchema = z.object({
  metadata: LevelMetadataSchema,
  content: z.union([
    z.array(MultipleChoiceSchema),
    DragAndDropSchema,
    MemorySchema,
    FakeNewsSchema,
    CrosswordSchema,
    WordSearchSchema,
    PuzzleSchema,
  ]),
});

export type MultipleChoice = z.infer<typeof MultipleChoiceSchema>;
export type DragAndDropItem = z.infer<typeof DragAndDropItemSchema>;
export type DragAndDrop = z.infer<typeof DragAndDropSchema>;
export type MemoryPair = z.infer<typeof MemoryPairSchema>;
export type Memory = z.infer<typeof MemorySchema>;
export type FakeNewsItem = z.infer<typeof FakeNewsItemSchema>;
export type FakeNews = z.infer<typeof FakeNewsSchema>;
export type CrosswordWord = z.infer<typeof CrosswordWordSchema>;
export type Crossword = z.infer<typeof CrosswordSchema>;
export type WordSearch = z.infer<typeof WordSearchSchema>;
export type Puzzle = z.infer<typeof PuzzleSchema>;
export type TemplateType = z.infer<typeof TemplateTypeSchema>;
export type LevelMetadata = z.infer<typeof LevelMetadataSchema>;
export type LevelExport = z.infer<typeof LevelExportSchema>;
