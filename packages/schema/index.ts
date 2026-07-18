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
