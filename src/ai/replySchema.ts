import { z } from "zod";

export const ReplySchema = z.object({
  category: z.enum(["INFO", "EMOTIONAL", "REQUEST", "REALWORLD", "FINANCIAL", "SOCIAL_COORDINATION", "NOTFALL"]),
  risk: z.enum(["LOW", "MEDIUM", "HIGH"]),
  should_send: z.boolean(),
  mark_unread: z.boolean(),
  escalate: z.boolean(),
  reply: z.string().nullable(),
});

export type ModelReply = z.infer<typeof ReplySchema>;

export type ParsedReply =
  | { ok: true; value: ModelReply }
  | { ok: false; error: string };

export function parseModelReply(raw: string): ParsedReply {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${(e as Error).message}` };
  }

  const base = ReplySchema.safeParse(json);
  if (!base.success) {
    return { ok: false, error: `Schema error: ${base.error.message}` };
  }

  const v = base.data;
  if (!v.should_send && v.reply !== null) {
    return { ok: false, error: "reply must be null when should_send is false" };
  }

  return { ok: true, value: v };
}

