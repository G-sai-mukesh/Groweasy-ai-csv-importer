import "dotenv/config";
import { z } from "zod";

const isTest = process.env.NODE_ENV === "test";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  // tests mock the AI client, so no real key needed to run npm test
  GEMINI_API_KEY: isTest ? z.string().default("test-key") : z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().default("gemini-flash-latest"),
  MAX_FILE_SIZE_MB: z.coerce.number().default(5),
  // a file under MAX_FILE_SIZE_MB can still pack in huge numbers of short
  // rows; cap row count too so one upload can't fan out into thousands of
  // Gemini calls
  MAX_ROWS: z.coerce.number().default(5000),
  BATCH_SIZE: z.coerce.number().default(25),
  BATCH_CONCURRENCY: z.coerce.number().default(3),
  AI_MAX_RETRIES: z.coerce.number().default(3),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
