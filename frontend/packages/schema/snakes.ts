import { z } from "zod";

export const SnakeLadderItemSchema = z.object({
  start: z.number().int().min(1),
  end: z.number().int().min(1),
});

export const SnakesSchema = z.object({
  board_width: z.number().int().min(1),
  board_height: z.number().int().min(1),
  start_position: z.number().int().min(1),
  end_position: z.number().int().min(1),
  seed: z.number().int().optional(),
  snakes: z.array(SnakeLadderItemSchema).optional(),
  ladders: z.array(SnakeLadderItemSchema).optional(),
  ai_config: z.object({
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
    fail_probability: z.number().min(0).max(1).optional(),
    weights: z.array(z.number().min(0)).optional()
  }).optional(),
  questions: z.array(z.object({
    question: z.string().min(1),
    options: z.array(z.string()).min(2),
    correct_index: z.number().int().min(0)
  })).optional(),
}).superRefine((data, ctx) => {
  const total_cells = data.board_width * data.board_height;
  if (data.end_position > total_cells) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "End position out of range" });
  }
  
  const origins = new Set<number>();

  if (data.snakes) {
    for (const s of data.snakes) {
      if (s.start <= s.end) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Snake must go down" });
      }
      if (origins.has(s.start)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate origin" });
      }
      origins.add(s.start);
    }
  }

  if (data.ladders) {
    for (const l of data.ladders) {
      if (l.start >= l.end) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ladder must go up" });
      }
      if (origins.has(l.start)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate origin" });
      }
      origins.add(l.start);
    }
  }
});
export type Snakes = z.infer<typeof SnakesSchema>;
