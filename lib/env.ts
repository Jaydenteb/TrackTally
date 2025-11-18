import { z } from "zod";

/**
 * Environment variable schema
 * Validates all required environment variables at startup
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_DATABASE_URL: z.string().min(1, "DIRECT_DATABASE_URL is required"),
  SHADOW_DATABASE_URL: z.string().optional(),

  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url().optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),

  // Google Sheets
  SHEET_ID: z.string().min(1, "SHEET_ID is required"),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email("Invalid GOOGLE_SERVICE_ACCOUNT_EMAIL"),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().min(1, "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is required"),

  // Access Control
  ALLOWED_GOOGLE_DOMAIN: z.string().optional(),
  ADMIN_EMAILS: z.string().optional(),
  SUPER_ADMIN_EMAILS: z.string().optional(),

  // SMTP (Optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  // Sentry (Optional)
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Node Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

/**
 * Parsed and validated environment variables
 * Safe to use throughout the application
 */
export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * Get validated environment variables
 * Throws error if validation fails
 */
export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  try {
    cachedEnv = envSchema.parse(process.env);
    return cachedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => {
        const path = issue.path.join(".");
        return `  - ${path}: ${issue.message}`;
      });

      console.error("❌ Environment validation failed:\n" + issues.join("\n"));
      throw new Error("Invalid environment variables. Check the logs above.");
    }
    throw error;
  }
}

/**
 * Validate environment variables at module load
 * This ensures the app fails fast if env vars are missing/invalid
 */
if (typeof window === "undefined") {
  // Only validate on server-side
  try {
    getEnv();
    console.log("✅ Environment variables validated successfully");
  } catch (error) {
    // Let the error propagate - app should not start with invalid env
    throw error;
  }
}
