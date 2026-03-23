import { z } from "zod";

const EnvSchema = z.object({
  // Reply window: only reply between start and end hour (in MAMA_TIMEZONE).
  // Set MAMA_REPLY_WINDOW_ENABLED=false to disable (reply anytime).
  MAMA_REPLY_WINDOW_ENABLED: z.string().default("false").transform((v) => v === "true"),
  MAMA_TIMEZONE: z.string().default("Europe/Berlin"),
  MAMA_ALLOWED_START_HOUR: z.coerce.number().int().min(0).max(23).default(9),
  MAMA_ALLOWED_END_HOUR: z.coerce.number().int().min(0).max(23).default(21),

  // AI endpoint (OpenAI-compatible)
  AI_BASE_URL: z.string().url(),
  AI_API_KEY: z.string().min(1),
  AI_MODEL: z.string().min(1).default("gpt-4o-mini"),

  // WhatsApp Web automation (session storage; used by LocalAuth)
  WHATSAPP_USER_DATA_DIR: z.string().min(1).default("./.wa-session"),
  MUM_CHAT_NAME: z.string().min(1),
  SELF_CHAT_NAME: z.string().min(1).default("Me"),

  // Behavior
  // Note: z.coerce.boolean() would treat the string "false" as truthy.
  // We parse explicitly so that DRY_RUN=false in .env works as expected.
  DRY_RUN: z
    .string()
    .default("true")
    .transform((v) => v === "true"),

  DB_PATH: z.string().min(1).default("./.data/mama.sqlite"),
  MAX_REPLIES_PER_HOUR: z.coerce.number().int().min(1).default(2),
  MAX_REPLIES_PER_DAY: z.coerce.number().int().min(1).default(12),
});

export type AppConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${message}`);
  }
  return parsed.data;
}

