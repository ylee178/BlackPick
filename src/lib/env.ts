import { normalizeAppEnv } from "@/lib/app-env";

const REQUIRED_SERVER_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

/** Call once at startup (e.g. instrumentation.ts) to fail fast on missing env */
export function validateEnv() {
  const missing = REQUIRED_SERVER_ENV.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  const configuredAppEnv = process.env.APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV;
  if (configuredAppEnv && !normalizeAppEnv(configuredAppEnv)) {
    throw new Error(
      `Invalid APP_ENV/NEXT_PUBLIC_APP_ENV value: ${configuredAppEnv}`,
    );
  }
}

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
