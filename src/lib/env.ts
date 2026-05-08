import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z.string().min(16).default("development-nextauth-secret-change-me"),
  API_KEY_PEPPER: z.string().min(16).default("development-api-key-pepper-change-me"),
  WEBHOOK_SIGNING_SECRET: z.string().min(16).default("development-webhook-secret-change-me"),
  BAILEYS_LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DEFAULT_DAILY_SEND_LIMIT: z.coerce.number().int().positive().default(250),
  DEFAULT_MESSAGE_DELAY_MIN_MS: z.coerce.number().int().positive().default(5000),
  DEFAULT_MESSAGE_DELAY_MAX_MS: z.coerce.number().int().positive().default(15000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | undefined;

export function env() {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }

  return cachedEnv;
}
